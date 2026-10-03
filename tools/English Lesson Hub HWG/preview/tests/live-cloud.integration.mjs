import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createLiveService } from "../functions/src/live-service.mjs";
import { audioRepository } from "../functions/src/live-audio-repository.mjs";
import {cleanupLiveRetention} from '../functions/src/live-retention.mjs';
import { newBlock } from "../src/live/domain.mjs";
if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error(
    "This integration test requires the local Firestore emulator; refusing cloud access.",
  );
const require = createRequire(
  new URL("../functions/index.cjs", import.meta.url),
);
const { initializeApp } = require("firebase-admin/app"),
  { getFirestore } = require("firebase-admin/firestore");
const app = initializeApp({ projectId: "demo-lesson-hub" }, "live-test"),
  db = getFirestore(app);
const teacher = "teacher-" + Date.now();
const call = createLiveService({
  db,
  requireTeacher: async (r) => {
    if (r.auth.uid !== teacher || r.data.sessionToken !== "test-only")
      throw new Error("teacher denied");
  },
});
const request = (uid, action, code, payload = {}) =>
  call({
    auth: { uid, token: { firebase: { sign_in_provider: "anonymous" } } },
    data: {
      action,
      code,
      payload,
      sessionToken: uid === teacher ? "test-only" : null,
    },
  });
test("v2 real Firestore transactions isolate 30 students, resist overwrite, persist room and grade", async () => {
  const deck = {
    id: "deck-" + Date.now(),
    title: "Synthetic QA",
    blocks: [newBlock("choice", "question")],
  };
  await request(teacher, "saveDeck", null, { deck, expectedVersion: 0 });
  await assert.rejects(
    request(teacher, "saveDeck", null, { deck, expectedVersion: 0 }),
    /衝突/,
  );
  let room = await request(teacher, "create", null, { deck });
  for (let i = 0; i < 30; i++)
    await request("student-" + i, "join", room.code, {
      studentId: String(50101 + i),
    });
  room = await request(teacher, "control", room.code, {
    action: "open",
    revision: room.revision,
  });
  for (let i = 0; i < 30; i++) {
    const payload = {
      attemptId: "response-" + i,
      blockId: "question",
      answer: [0],
      revision: room.revision,
    };
    await request("student-" + i, "submit", room.code, payload);
    await request("student-" + i, "submit", room.code, payload);
  }
  await assert.rejects(
    request("student-1", "submit", room.code, {
      attemptId: "response-0",
      blockId: "question",
      answer: [1],
      revision: room.revision,
    }),
    /已被使用/,
  );
  const s = await request("student-1", "snapshot", room.code);
  assert.equal(s.responses.length, 1);
  assert.equal(s.block.answer, undefined);
  await assert.rejects(
    request("student-1", "report", room.code),
    /teacher denied/,
  );
  const report = await request(teacher, "report", room.code);
  assert.equal(report.report.length, 30);
  assert.equal(
    report.report.reduce((n, r) => n + r.score, 0),
    30,
  );
  const stored = await db.collection("liveRoomsV2").doc(room.code).get();
  assert.equal(Object.keys(JSON.parse(stored.data().json).responses).length, 0);
});
test("incomplete three-picture question persists as a draft but cannot start class", async () => {
  const deck = {
    id: `vowel-draft-${Date.now()}`,
    title: "Phonics draft",
    blocks: [newBlock("vowel", "vowel-draft-block")],
  };
  const saved = await request(teacher, "saveDeck", null, {
    deck, expectedVersion: 0,
  });
  assert.equal(saved.deck.version, 1);
  assert.ok((await request(teacher, "decks")).decks.some((item) => item.id === deck.id));
  deck.blocks[0].vowelWords[0].word = "bike";
  const updated = await request(teacher, "saveDeck", null, {
    deck, expectedVersion: 1,
  });
  assert.equal(updated.deck.version, 2);
  await assert.rejects(request(teacher, "create", null, { deck }), /對應圖片/);
});
test("real audio reservation enforces 3/day, best score, ownership and idempotent finalize", async () => {
  const block = { ...newBlock("audio", "audio"), text: "Hello." },
    deck = {
      id: "audio-" + Date.now(),
      title: "Synthetic speech test",
      blocks: [block],
    };
  let room = await request(teacher, "create", null, { deck });
  await request("audio-student", "join", room.code, { studentId: "50201" });
  room = await request(teacher, "control", room.code, {
    action: "open",
    revision: room.revision,
  });
  const repo = audioRepository(db),
    base = {
      uid: "audio-student",
      code: room.code,
      blockId: "audio",
      hash: "synthetic-hash",
      mimeType: "audio/webm",
      day: "2026-09-24",
      expiresAt: Date.now() + 100000,
    };
  for (let i = 0; i < 3; i++) {
    const id = `audio-${Date.now()}-${i}`;
    await repo.reserve({ ...base, attemptId: id });
    assert.equal(await repo.claim(id, base.uid), true);
    assert.equal(await repo.claim(id, base.uid), false);
    const result = {
      transcript: "Hello.",
      accuracy: 60,
      fluency: 60,
      completeness: 60,
      total_score: [60, 40, 70][i],
      feedback: "測試資料，不代表真人評分。",
    };
    await repo.finalize(id, base.uid, result, "test-only");
    await repo.finalize(id, base.uid, result, "test-only");
    assert.equal((await repo.read(id, base.uid)).best, [60, 60, 70][i]);
    assert.equal((await request(base.uid,'snapshot',room.code)).reward.earned,1);
    await assert.rejects(repo.read(id, "intruder"));
  }
  await assert.rejects(
    repo.reserve({ ...base, attemptId: "audio-fourth-" + Date.now() }),
    /三次/,
  );
  const nextDayId='next-day-'+Date.now();
  await repo.reserve({...base,day:'2026-09-25',attemptId:nextDayId});await repo.claim(nextDayId,base.uid);
  await repo.finalize(nextDayId,base.uid,{transcript:'Hello.',accuracy:50,fluency:50,completeness:50,total_score:50,feedback:'測試'},'test-only');
  assert.equal((await repo.read(nextDayId,base.uid)).best,70);
  const report = await request(teacher, "report", room.code);
  assert.equal(report.report[0].score, 0.7);
  const audioSnapshot=await request(teacher,'snapshot',room.code);
  const latest=audioSnapshot.responses.sort((a,b)=>b.submittedAt-a.submittedAt)[0];
  await request(teacher,'control',room.code,{action:'grade',revision:audioSnapshot.revision,attemptId:latest.attemptId,score:0.7,pass:true});
  assert.equal((await request(base.uid,'snapshot',room.code)).reward.earned,2);
  await assert.rejects(repo.reserve({...base,attemptId:'manual-pass-'+Date.now()}),/已過關/);
  await request('audio-pass','join',room.code,{studentId:'50202'});
  const passId='passing-'+Date.now(),passBase={...base,uid:'audio-pass',attemptId:passId};
  await repo.reserve(passBase);await repo.claim(passId,'audio-pass');await repo.finalize(passId,'audio-pass',{transcript:'Hello.',accuracy:80,fluency:80,completeness:80,total_score:80,feedback:'測試'},'test-only');
  assert.equal((await repo.read(passId,'audio-pass')).passed,true);
  assert.equal((await request('audio-pass','snapshot',room.code)).reward.earned,2);
  await assert.rejects(repo.reserve({...passBase,attemptId:'pass-retry-'+Date.now()}),/已過關/);
  await db.collection('practiceResults').doc('retention-sentinel').set({keep:true});
  const deleted=[];const clean=await cleanupLiveRetention({db,bucket:{file:p=>({delete:async()=>deleted.push(p)})},enabled:true,now:Date.now()+200000});
  assert.ok(clean.deleted>=4);assert.ok(deleted.every(p=>p.startsWith('liveAudioV2/')));
  assert.equal((await db.collection('practiceResults').doc('retention-sentinel').get()).data().keep,true);
});
test("vowel clicks use private Firestore progress and exactly one graded response", async () => {
  const names = ["bike", "car", "train"];
  const ids = names.map((_, index) =>
    `cloud-00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  );
  for (const id of ids)
    await db.collection("liveMediaV2").doc(id).set({
      ownerUid: teacher,
      status: "ready",
      kind: "image",
    });
  const block = newBlock("vowel", "vowel-cloud");
  block.media = names.map((name, index) => ({
    id: ids[index], name, kind: "image",
  }));
  block.vowelWords = [
    { word: "bike", imageId: ids[0], targets: [1, 3] },
    { word: "car", imageId: ids[1], targets: [1, 2] },
    { word: "train", imageId: ids[2], targets: [2, 3] },
  ];
  let room = await request(teacher, "create", null, {
    deck: { id: `vowel-${Date.now()}`, title: "Phonics", blocks: [block] },
  });
  const code = room.code;
  await request("vowel-student", "join", code, { studentId: "50301" });
  room = await request(teacher, "control", code, {
    action: "open", revision: room.revision,
  });
  const tap = (wordIndex, letterIndex) => request(
    "vowel-student", "vowelTap", code,
    { blockId: block.id, revision: room.revision, wordIndex, letterIndex },
  );
  const first = await request("vowel-student", "snapshot", code);
  assert.equal(JSON.stringify(first.block).includes("targets"), false);
  await assert.rejects(request("vowel-student", "submit", code, {
    attemptId: "direct-bypass", blockId: block.id,
    revision: room.revision, answer: [[1, 3], [1, 2], [2, 3]],
  }), /不能直接提交/);
  let result = await tap(0, 0);
  assert.equal(result.tap.correct, false);
  assert.equal(result.feedback.outcome, 'wrong');
  assert.equal(result.feedback.mastery, true);
  assert.equal(result.reward.earned, 0);
  result = await tap(0, 1);
  assert.deepEqual(result.vowelProgress.selected[0], [1]);
  assert.deepEqual((await request("vowel-student", "snapshot", code)).vowelProgress.selected[0], [1]);
  room = await request(teacher, "control", code, {
    action: "pause", revision: room.revision,
  });
  await assert.rejects(tap(0, 3), /關閉或切換/);
  room = await request(teacher, "control", code, {
    action: "resume", revision: room.revision,
  });
  for (const [wi, li] of [[2, 3], [1, 2], [0, 3], [1, 1], [2, 2]])
    result = await tap(wi, li);
  assert.equal(result.tap.complete, true);
  assert.equal(result.feedback.outcome, 'full');
  assert.equal(typeof result.feedback.attemptId, 'string');
  assert.equal((await request('vowel-student', 'snapshot', code)).feedback, undefined);
  assert.equal(result.responses.length, 1);
  assert.equal(result.reward.earned, 2);
  assert.deepEqual(result.vowelProgress.completedWords, [true, true, true]);
  await tap(0, 1);
  const rows = await db.collection("liveRoomsV2").doc(code).collection("responses").get();
  assert.equal(rows.size, 1);
  const storedRoom = await db.collection("liveRoomsV2").doc(code).get();
  assert.deepEqual(JSON.parse(storedRoom.data().json).vowelProgress, {});
  const progress = await db.collection("liveRoomsV2").doc(code)
    .collection("vowelProgress").doc("vowel-student").get();
  assert.equal(JSON.parse(progress.data().json).complete, true);
});
