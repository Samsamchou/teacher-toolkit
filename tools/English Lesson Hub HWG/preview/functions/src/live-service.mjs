import { randomInt, createHash } from "node:crypto";
import { expiryMonth } from "./live-audio.mjs";
import { reportAccess, reportSummary, responseFeedback } from '../generated/review.mjs';
import { playReward, finishReward } from "../generated/rewards.mjs";
import {
  createRoom,
  joinRoom,
  controlRoom,
  submitRoom,
  tapVowel,
  snapshot,
  report,
  validateDeck,
  identifier,
} from "../generated/live-domain.mjs";

// Admin-only storage. All browser reads pass through a sanitized callable snapshot.
export function createLiveService({ db, requireTeacher, now = Date.now }) {
  const rooms = db.collection("liveRoomsV2"),
    decks = db.collection("liveDecksV2");
  return async function handle(request) {
    const uid = request.auth?.uid;
    if (!uid || request.auth.token?.firebase?.sign_in_provider !== "anonymous")
      throw new Error("請先登入匿名工作階段。");
    const { action, code, payload = {} } = request.data || {};
    const teacherActions = [
      "decks",
      "saveDeck",
      "previousDeck",
      "create",
      "control",
      "report",
      "reports",
    ];
    if (teacherActions.includes(action)) await requireTeacher(request);
    if(action==='reports') {
      const docs=await rooms.where('ownerUid','==',uid).limit(100).get();
      return {reports:docs.docs.map(d=>JSON.parse(d.data().json)).filter(r=>(r.retentionAt||r.expiresAt)>=now()).sort((a,b)=>b.createdAt-a.createdAt).map(reportSummary)};
    }
    if (["create", "saveDeck"].includes(action)) {
      validateDeck(payload.deck, { draft: action === "saveDeck" });
      const ids = [
        ...new Set(
          payload.deck.blocks.flatMap((b) => b.media.map((m) => m.id)),
        ),
      ];
      for (const id of ids) {
        if (!/^cloud-[a-f0-9-]{36}$/.test(id || ""))
          throw new Error("雲端課程只能使用已授權的雲端素材。");
        const media = await db.collection("liveMediaV2").doc(id).get();
        if (
          !media.exists ||
          (media.data().workspaceOwnerUid || media.data().ownerUid) !== uid ||
          media.data().status === "uploading"
        )
          throw new Error("素材未驗證或不屬於本教師。");
      }
    }
    if (action === "decks") {
      const list = await decks.where("ownerUid", "==", uid).limit(100).get();
      return { decks: list.docs.map((d) => JSON.parse(d.data().json)) };
    }
    if (["saveDeck", "previousDeck"].includes(action)) {
      const id = action === "saveDeck" ? payload.deck?.id : payload.id;
      if (!identifier(id)) throw new Error("教材 ID 無效。");
      const ref = decks.doc(`${uid}_${id}`);
      return db.runTransaction(async (tx) => {
        const doc = await tx.get(ref),
          old = doc.exists ? JSON.parse(doc.data().json) : null;
        if (action === "previousDeck") {
          if (!old || old.version < 2) throw new Error("尚無可復原版本。");
          const previous = await tx.get(
            ref.collection("versions").doc(String(old.version - 1)),
          );
          if (!previous.exists) throw new Error("找不到版本。");
          return { deck: JSON.parse(previous.data().json) };
        }
        validateDeck(payload.deck, { draft: true });
        if (payload.expectedVersion !== (old?.version || 0))
          throw new Error("教材版本衝突，請重新載入。");
        const deck = { ...payload.deck, version: (old?.version || 0) + 1 };
        tx.set(ref, {
          ownerUid: uid,
          json: JSON.stringify(deck),
          updatedAt: now(),
        });
        if (old)
          tx.set(ref.collection("versions").doc(String(old.version)), {
            json: JSON.stringify(old),
          });
        return { deck };
      });
    }
    if (action === "create") {
      for (let i = 0; i < 8; i++) {
        const value = String(randomInt(100000, 1000000)),
          ref = rooms.doc(value);
        const result = await db.runTransaction(async (tx) => {
          const old = await tx.get(ref);
          // Never recycle a code over existing response subcollections.
          if (old.exists) return null;
          const room = createRoom(payload.deck, value, uid, now());
          room.retentionAt = expiryMonth(now()).getTime();
          tx.create(ref, {
            ownerUid: uid,
            json: JSON.stringify(room),
            expiresAt: new Date(room.retentionAt),
          });
          return snapshot(room, uid, now());
        });
        if (result) return result;
      }
      throw new Error("暫時無法配置加入碼。");
    }
    if (
      !/^\d{6}$/.test(code || "") ||
      ![
        "join",
        "submit",
        "vowelTap",
        "control",
        "snapshot",
        "report",
        "rewardPlay",
        "rewardFinish",
      ].includes(action)
    )
      throw new Error("操作或加入碼無效。");
    const ref = rooms.doc(code);
    return db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw new Error("找不到課堂。");
      const room = JSON.parse(doc.data().json),
        isTeacher = room.teacher === uid;
      if (isTeacher && !teacherActions.includes(action))
        await requireTeacher(request);
      if (teacherActions.includes(action) && !isTeacher)
        throw new Error("需要本堂課教師權限。");
      if(action==='report') {
        reportAccess(room,uid,now());
        const saved=await tx.get(ref.collection('responses').limit(5000));
        const wallets=await tx.get(ref.collection('rewards').limit(40));
        room.responses=Object.fromEntries(saved.docs.map(d=>[d.id,JSON.parse(d.data().json)]));
        room.rewards=Object.fromEntries(wallets.docs.map(d=>[d.id,JSON.parse(d.data().json)]));
        return {report:report(room),reportBlocks:room.deck.blocks,meta:reportSummary(room)};
      }
      if (action === "join") joinRoom(room, uid, payload.studentId, now());
      // Check membership before reading private responses.
      snapshot(room, uid, now());
      const query = isTeacher || (room.reveal && room.deck.blocks[room.index].type === 'cloud')
        ? ref.collection("responses")
        : ref.collection("responses").where("uid", "==", uid);
      const rows = await tx.get(query.limit(5000));
      room.responses = Object.fromEntries(
        rows.docs.map((d) => { const r=JSON.parse(d.data().json); return [r.attemptId || d.id, r]; }),
      );
      const progressRef = ref.collection("vowelProgress").doc(uid);
      const savedProgress = isTeacher ? null : await tx.get(progressRef);
      room.vowelProgress = isTeacher
        ? {}
        : {
            [uid]: savedProgress?.exists
              ? JSON.parse(savedProgress.data().json)
              : null,
          };
      // Student-owned wallets stay out of the shared room JSON; transactions prevent double spending.
      const walletRef = ref.collection("rewards").doc(uid);
      if (isTeacher) {
        const wallets = await tx.get(ref.collection("rewards").limit(40));
        room.rewards = Object.fromEntries(
          wallets.docs.map((d) => [d.id, JSON.parse(d.data().json)]),
        );
      } else {
        const wallet = await tx.get(walletRef);
        room.rewards = {
          [uid]: wallet.exists
            ? JSON.parse(wallet.data().json)
            : { version: 0, turns: [] },
        };
      }
      let feedback = null;
      if (action === "submit") {
        if (!identifier(payload.attemptId)) throw new Error("作答 ID 無效。");
        const existing = await tx.get(
          ref.collection("responses").doc(payload.attemptId),
        );
        if (existing.exists && existing.data().uid !== uid)
          throw new Error("作答 ID 已被使用。");
        const claimRef=ref.collection('responseClaims').doc(payload.attemptId);
        const claim=await tx.get(claimRef);
        const answerHash=createHash('sha256').update(JSON.stringify(payload.answer ?? null)).digest('hex');
        if(claim.exists && claim.data().uid !== uid) throw new Error('作答 ID 已被使用。');
        if(claim.exists && (claim.data().answerHash !== answerHash || claim.data().blockId !== payload.blockId)) throw new Error('重送內容衝突。');
        // An old retry's delayed duplicate must not replace newer progress.
        if(!claim.exists || room.responses[payload.attemptId]) {
        const response = submitRoom(room, uid, payload, now());
        feedback = responseFeedback(room.deck.blocks.find(b => b.id === response.blockId), response);
        tx.set(ref.collection("responses").doc(response.storageId || response.attemptId), {
          uid,
          json: JSON.stringify(response),
          expiresAt: new Date(room.retentionAt || room.expiresAt),
        });
        if(!claim.exists) tx.create(claimRef,{uid,answerHash,blockId:payload.blockId,expiresAt:new Date(room.retentionAt || room.expiresAt)});
        }
      }
      let tap = null;
      if (action === "vowelTap") {
        if (isTeacher) throw new Error("教師不能代替學生點選字母。");
        tap = tapVowel(room, uid, payload, now());
        feedback = tap.feedback || null;
        const progress = room.vowelProgress[uid];
        if (tap.complete) {
          const response = room.responses[progress.attemptId];
          feedback = responseFeedback(room.deck.blocks.find(b => b.id === response?.blockId), response);
        }
        tx.set(progressRef, {
          uid,
          json: JSON.stringify(progress),
          expiresAt: new Date(room.retentionAt || room.expiresAt),
        });
        if (tap.complete && !rows.docs.some((d) => d.id === progress.attemptId)) {
          const response = room.responses[progress.attemptId];
          tx.create(ref.collection("responses").doc(progress.attemptId), {
            uid,
            json: JSON.stringify(response),
            expiresAt: new Date(room.retentionAt || room.expiresAt),
          });
        }
      }
      if (action === "control") {
        controlRoom(room, uid, payload.action, payload, now());
        if (payload.action === "grade") {
          const r = room.responses[payload.attemptId];
          tx.update(ref.collection("responses").doc(r.storageId || payload.attemptId), {
            json: JSON.stringify(r),
          });
          if (r.ai && r.qid && payload.pass === true)
            tx.update(db.collection("liveAudioQuotaV2").doc(r.qid), {
              manualPassed: true,
            });
          if (r.ai && r.progressId && payload.pass === true)
            tx.update(db.collection("liveAudioQuotaV2").doc(r.progressId), {
              manualPassed: true,
            });
        }
      }
      if (action === "rewardPlay" || action === "rewardFinish") {
        if (isTeacher) throw new Error("教師不能領取學生遊戲機會。");
        if (action === "rewardPlay")
          playReward(room, uid, payload, now(), randomInt(0, 4294967296));
        else finishReward(room, uid, payload, now());
        tx.set(walletRef, {
          uid,
          json: JSON.stringify(room.rewards[uid]),
          expiresAt: new Date(room.retentionAt || room.expiresAt),
        });
      }
      const result = snapshot(room, uid, now());
      if (tap) result.tap = tap;
      if (feedback) result.feedback = feedback;
      if (action === "report") result.report = report(room);
      // Polling is read-only; no class-wide write for every student heartbeat.
      if (["join", "control", "submit"].includes(action)) {
        const json = JSON.stringify({
          ...room,
          responses: {},
          rewards: {},
          vowelProgress: {},
        });
        if (Buffer.byteLength(json) > 800000) throw new Error("課堂資料過大。");
        tx.update(ref, { json });
      }
      return result;
    });
  };
}
