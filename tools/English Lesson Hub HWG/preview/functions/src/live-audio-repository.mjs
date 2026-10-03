import { createHash } from "node:crypto";
export function audioRepository(db) {
  const attempts = db.collection("liveAudioAttemptsV2"),
    quotas = db.collection("liveAudioQuotaV2");
  const own = (doc, uid) => {
    if (!doc.exists || doc.data().uid !== uid)
      throw new Error("沒有這份錄音的存取權。");
    return doc.data();
  };
  return {
    async reserve(input) {
      return db.runTransaction(async (tx) => {
        const ref = attempts.doc(input.attemptId),
          old = await tx.get(ref);
        if (old.exists) {
          const value = own(old, input.uid);
          if (
            value.hash !== input.hash ||
            value.code !== input.code ||
            value.blockId !== input.blockId
          )
            throw new Error("錄音重送內容不一致。");
          return value;
        }
        const roomDoc = await tx.get(
          db.collection("liveRoomsV2").doc(input.code),
        );
        if (!roomDoc.exists) throw new Error("找不到課堂。");
        const room = JSON.parse(roomDoc.data().json),
          block = room.deck.blocks[room.index];
        if (
          room.phase !== "question" ||
          room.expiresAt < Date.now() ||
          block.id !== input.blockId ||
          block.type !== "audio" ||
          !room.participants[input.uid]
        )
          throw new Error("老師尚未開放這個錄音題。");
        if (
          block.seconds &&
          Date.now() >
            room.openedAt + (room.pausedDuration || 0) + block.seconds * 1000
        )
          throw new Error("本題時間已到。");
        // Across rooms: same stable deck/block/student/day shares the limit.
        const qid = createHash("sha256")
          .update(
            [
              room.deck.id,
              block.id,
              room.participants[input.uid].studentId,
              input.day,
            ].join("|"),
          )
          .digest("hex");
        const qr = quotas.doc(qid),
          q = (await tx.get(qr)).data() || { success: 0, best: 0, pending: [] };
        const progressId='progress-'+createHash('sha256').update([room.deck.id,block.id,block.text,room.participants[input.uid].studentId].join('|')).digest('hex');
        const progress=(await tx.get(quotas.doc(progressId))).data()||{best:0};
        if (Math.max(q.best,progress.best) >= 80 || q.manualPassed || progress.manualPassed) throw new Error("本題已過關。");
        if (q.success + q.pending.length >= 3)
          throw new Error("本題今日已用完三次或有待確認評分。");
        const attempt = {
          ...input,
          retentionAt: new Date(input.expiresAt),
          status: "reserved",
          qid,
          progressId,
          targetText: block.text,
          focusRule: block.focusRule,
          studentId: room.participants[input.uid].studentId,
          points: block.points,
          openedAt: room.openedAt,
          createdAt: Date.now(),
        };
        tx.create(ref, attempt);
        tx.set(qr, {
          ...q,
          pending: [...q.pending, input.attemptId],
          expiresAt: new Date(input.expiresAt),
        });
        return attempt;
      });
    },
    async claim(id, uid) {
      return db.runTransaction(async (tx) => {
        const ref = attempts.doc(id),
          a = own(await tx.get(ref), uid);
        if (a.status !== "reserved") return false;
        tx.update(ref, { status: "ai-started" });
        return true;
      });
    },
    async markUncertain(id, uid) {
      own(await attempts.doc(id).get(), uid);
      await attempts.doc(id).update({ status: "uncertain" });
    },
    async finalize(id, uid, result, path) {
      return db.runTransaction(async (tx) => {
        const ref = attempts.doc(id),
          a = own(await tx.get(ref), uid);
        if (a.status === "complete") return;
        const qr = quotas.doc(a.qid),
          q = (await tx.get(qr)).data();
        const pr=quotas.doc(a.progressId),progress=(await tx.get(pr)).data()||{best:0};
        const best = Math.max(q.best,progress.best, result.total_score),
          next = {
            ...a,
            status: "complete",
            result,
            best,
            passed: best >= 80,
            storagePath: path,
            completedAt: Date.now(),
          };
        tx.update(ref, next);
        tx.set(pr,{...progress,best,expiresAt:new Date(a.expiresAt)});
        tx.update(qr, {
          success: q.success + 1,
          best,
          pending: q.pending.filter((v) => v !== id),
        });
        const response = {
          attemptId: id,
          uid,
          qid: a.qid,
          progressId:a.progressId,
          studentId: a.studentId,
          blockId: a.blockId,
          answer: result.transcript,
          ai: result,
          best,
          passed: best >= 80,
          openedAt: a.openedAt,
          submittedAt: next.completedAt,
          grade: {
            status: "graded",
            score: Math.round((best / 100) * a.points * 100) / 100,
            max: a.points,
          },
        };
        tx.set(
          db
            .collection("liveRoomsV2")
            .doc(a.code)
            .collection("responses")
            .doc(id),
          {
            uid,
            json: JSON.stringify(response),
            expiresAt: new Date(a.expiresAt),
          },
        );
      });
    },
    async read(id, uid) {
      return own(await attempts.doc(id).get(), uid);
    },
  };
}
export function audioStorage(bucket) {
  return {
    async putOnce(path, buffer, metadata) {
      const f = bucket.file(path);
      try {
        await f.save(buffer, {
          resumable: false,
          preconditionOpts: { ifGenerationMatch: 0 },
          metadata: { contentType: metadata.mimeType, metadata },
        });
      } catch (e) {
        if (e.code !== 412) throw e;
      }
    },
    async getJSON(path) {
      try {
        return JSON.parse((await bucket.file(path).download())[0].toString());
      } catch (e) {
        if (e.code === 404) return null;
        throw e;
      }
    },
    async exists(path) {
      return (await bucket.file(path).exists())[0];
    },
  };
}
