import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createLiveService } from "../functions/src/live-service.mjs";
import { newBlock } from "../src/live/domain.mjs";
if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error("Emulator required; refusing production access.");
const require = createRequire(
  new URL("../functions/index.cjs", import.meta.url),
);
const { initializeApp } = require("firebase-admin/app"),
  { getFirestore } = require("firebase-admin/firestore");
const app = initializeApp({ projectId: "demo-lesson-hub" }, "reward-test"),
  db = getFirestore(app);
const teacher = "reward-teacher",
  service = createLiveService({
    db,
    requireTeacher: async (r) => {
      if (r.auth.uid !== teacher || r.data.sessionToken !== "test-only")
        throw new Error("teacher denied");
    },
  });
const call = (uid, action, code, payload = {}) =>
  service({
    auth: { uid, token: { firebase: { sign_in_provider: "anonymous" } } },
    data: {
      action,
      code,
      payload,
      sessionToken: uid === teacher ? "test-only" : null,
    },
  });
after(async () => {
  await db.terminate();
});
test("cloud reward transactions deduplicate concurrent plays, persist across service reads, isolate students and survive controls", async () => {
  const deck = {
    id: "rewards-" + Date.now(),
    title: "Rewards QA",
    rewardGame: "slot",
    blocks: [newBlock("choice", "q1"), newBlock("choice", "q2")],
  };
  let room = await call(teacher, "create", null, { deck });
  const control = async (action, extra = {}) => {
    room = await call(teacher, "control", room.code, {
      action,
      revision: room.revision,
      ...extra,
    });
  };
  for (const [uid, sid] of [
    ["alice", "50101"],
    ["bob", "50102"],
  ])
    await call(uid, "join", room.code, { studentId: sid });
  await control("open");
  for (const [uid, value] of [
    ["alice", 0],
    ["bob", 1],
  ])
    await call(uid, "submit", room.code, {
      attemptId: "answer-" + uid,
      blockId: "q1",
      revision: room.revision,
      answer: [value],
    });
  const payload = {
    turnId: "turn-alice",
    blockId: "q1",
    revision: room.revision,
    walletVersion: 0,
    points: 99999,
  };
  const parallel = await Promise.all([
    call("alice", "rewardPlay", room.code, payload),
    call("alice", "rewardPlay", room.code, payload),
  ]);
  assert.equal(parallel[0].reward.used, 1);
  assert.equal(parallel[1].reward.used, 1);
  assert.deepEqual(parallel[0].reward.pending, parallel[1].reward.pending);
  assert.ok([10, 50, 100].includes(parallel[0].reward.score));
  assert.equal((await call("bob", "snapshot", room.code)).reward.used, 0);
  await assert.rejects(
    call("bob", "rewardFinish", room.code, {
      turnId: "turn-alice",
      revision: room.revision,
    }),
    /找不到/,
  );
  await assert.rejects(call(teacher, "rewardPlay", room.code, payload), /教師/);
  await assert.rejects(
    call("outsider", "rewardPlay", room.code, payload),
    /加入/,
  );
  await control("pause");
  await assert.rejects(
    call("alice", "rewardFinish", room.code, {
      turnId: "turn-alice",
      revision: room.revision,
    }),
    /等待/,
  );
  await control("resume");
  const finished = await call("alice", "rewardFinish", room.code, {
    turnId: "turn-alice",
    revision: room.revision,
  });
  assert.equal(finished.reward.remaining, 1);
  assert.equal(finished.reward.used, 1);
  await control("move", { index: 1 });
  await control("open");
  assert.equal(
    (await call("alice", "snapshot", room.code)).reward.eligible,
    false,
  );
  await call("alice", "submit", room.code, {
    attemptId: "q2-alice",
    blockId: "q2",
    revision: room.revision,
    answer: [1],
  });
  const s = await call("alice", "snapshot", room.code);
  assert.equal(s.reward.remaining, 1);
  assert.equal(s.reward.eligible, false);
  await call('alice','submit',room.code,{attemptId:'q2-alice-retry',blockId:'q2',revision:room.revision,answer:[0]});
  assert.equal((await call('alice','snapshot',room.code)).reward.remaining,3);
  const next = {
    turnId: "second",
    blockId: "q2",
    revision: room.revision,
    walletVersion: s.reward.version,
  };
  await call("alice", "rewardPlay", room.code, next);
  await control("end");
  const end = await call("alice", "snapshot", room.code);
  assert.equal(end.reward.remaining, 0);
  assert.equal(end.reward.pending, null);
  await assert.rejects(
    call("alice", "rewardPlay", room.code, { ...next, turnId: "after-end" }),
  );
  const report = (await call(teacher, "report", room.code)).report.find(
    (r) => r.studentId === "50101",
  );
  assert.equal(report.score, 2);
  assert.equal(report.gameTurns, 2);
  const stored = JSON.parse(
    (await db.collection("liveRoomsV2").doc(room.code).get()).data().json,
  );
  assert.deepEqual(stored.rewards, {});
  assert.deepEqual(stored.responses, {});
});
test("cloud manual grading adds only the delta and teacher changes cannot double-grant", async () => {
  let room = await call(teacher, "create", null, {
    deck: {
      id: "manual-" + Date.now(),
      title: "Manual",
      rewardGame: "basketball",
      blocks: [newBlock("open", "q")],
    },
  });
  await call("manual-student", "join", room.code, { studentId: "50201" });
  room = await call(teacher, "control", room.code, {
    action: "open",
    revision: room.revision,
  });
  let s = await call("manual-student", "submit", room.code, {
    attemptId: "manual-answer",
    blockId: "q",
    revision: room.revision,
    answer: "Hi",
  });
  assert.equal(s.reward.earned, 0);
  for (const pass of [false, true, true, false]) {
    room = await call(teacher, "control", room.code, {
      action: "grade",
      revision: room.revision,
      attemptId: "manual-answer",
      score: pass ? 1 : 0,
      pass,
    });
    s = await call("manual-student", "snapshot", room.code);
    assert.equal(s.reward.earned, pass || s.reward.earned === 2 ? 2 : 1);
  }
  assert.equal(s.reward.earned, 2);
});
