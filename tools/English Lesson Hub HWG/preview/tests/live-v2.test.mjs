import test from "node:test";
import assert from "node:assert/strict";
import {
  newBlock,
  createRoom,
  joinRoom,
  controlRoom,
  submitRoom,
  snapshot,
  report,
  grade,
  embedUrl,
  validateDeck,
  publicBlock,
  tapVowel,
} from "../src/live/domain.mjs";
const deck = () => ({
  id: "deck",
  title: "English",
  blocks: [{ ...newBlock("choice", "q1"), answer: [1], notes: "PRIVATE" }],
});
test("discussion pause freezes deadline without changing submission identity", () => {
  const r = fixture();
  r.deck.blocks[0].seconds = 1;
  const openedAt = r.openedAt;
  controlRoom(r, "teacher", "pause", { revision: r.revision }, 1200);
  controlRoom(r, "teacher", "resume", { revision: r.revision }, 6200);
  assert.equal(r.openedAt, openedAt);
  submitRoom(
    r,
    "student",
    {
      attemptId: "paused-answer",
      blockId: "q1",
      revision: r.revision,
      answer: [1],
    },
    6500,
  );
  assert.throws(
    () =>
      submitRoom(
        r,
        "student",
        {
          attemptId: "duplicate-answer",
          blockId: "q1",
          revision: r.revision,
          answer: [1],
        },
        6501,
      ),
    /已交卷/,
  );
});
function fixture() {
  const room = createRoom(deck(), "123456", "teacher", 1000);
  joinRoom(room, "student", "50101", 1001);
  controlRoom(room, "teacher", "open", { revision: 1 }, 1002);
  return room;
}
test("30 students submit independently; retries are idempotent and report totals agree", () => {
  const r = createRoom(deck(), "123456", "teacher", 1000);
  controlRoom(r, "teacher", "open", { revision: 1 }, 1001);
  for (let i = 0; i < 30; i++) {
    const uid = `s${i}`;
    joinRoom(r, uid, String(50101 + i), 1002);
    const input = {
      attemptId: `attempt-${i}`,
      blockId: "q1",
      revision: 2,
      answer: [i % 2],
    };
    submitRoom(r, uid, input, 1003);
    submitRoom(r, uid, input, 1004);
  }
  assert.equal(Object.keys(r.responses).length, 30);
  assert.equal(
    report(r).reduce((n, s) => n + s.score, 0),
    15,
  );
  assert.equal(report(r).length, 30);
});
test("student snapshot never includes keys, teacher notes or other student responses", () => {
  const r = fixture();
  joinRoom(r, "other", "50102", 1003);
  submitRoom(
    r,
    "other",
    { attemptId: "other1", blockId: "q1", revision: 2, answer: [1] },
    1004,
  );
  const s = snapshot(r, "student", 1005);
  assert.equal(s.block.answer, undefined);
  assert.equal(s.block.notes, undefined);
  assert.equal(s.block.mapping, undefined);
  assert.deepEqual(s.responses, []);
  assert.equal(s.participants, undefined);
});
test("only owner teacher controls; stale revision and locked submissions are rejected", () => {
  const r = fixture();
  assert.throws(() => controlRoom(r, "student", "end", { revision: 2 }, 1005));
  assert.throws(() => controlRoom(r, "teacher", "end", { revision: 1 }, 1005));
  controlRoom(r, "teacher", "pause", { revision: 2 }, 1005);
  assert.throws(() =>
    submitRoom(
      r,
      "student",
      { attemptId: "x", blockId: "q1", revision: 3, answer: [1] },
      1006,
    ),
  );
});
test("rejoin preserves one participant and one response, conflicts fail", () => {
  const r = fixture();
  const input = { attemptId: "a", blockId: "q1", revision: 2, answer: [1] };
  submitRoom(r, "student", input, 1003);
  joinRoom(r, "student", "50101", 1004);
  assert.equal(Object.keys(r.participants).length, 1);
  assert.throws(() =>
    submitRoom(r, "student", { ...input, answer: [0] }, 1005),
  );
  assert.equal(snapshot(r, "student", 1006).responses.length, 1);
});
test("another uid cannot hijack a student number or read session", () => {
  const r = fixture();
  assert.throws(() => joinRoom(r, "thief", "50101", 1004));
  assert.throws(() => snapshot(r, "thief", 1004));
});
test("objective countdown permits retry; stale and post-completion submissions fail", () => {
  const r = fixture();
  r.deck.blocks[0].seconds = 1;
  assert.equal(
    submitRoom(
      r,
      "student",
      { attemptId: "late", blockId: "q1", revision: 2, answer: [1] },
      3000,
    ).rewardPass,
    true,
  );
  controlRoom(r, "teacher", "end", { revision: 2 }, 3001);
  assert.throws(() =>
    submitRoom(
      r,
      "student",
      { attemptId: "end", blockId: "q1", revision: 3, answer: [1] },
      3002,
    ),
  );
  assert.throws(() => joinRoom(r, "new", "50102", 3002));
});
test("manual responses are pending, not zero; cloud is ungraded", () => {
  assert.equal(grade(newBlock("open"), "hello").score, null);
  assert.equal(grade(newBlock("draw"), []).status, "pending");
  assert.equal(grade(newBlock("cloud"), "blue").max, 0);
});
test("partial selection penalizes incorrect choices and rejects duplicated options", () => {
  const b = { ...newBlock("choice"), answer: [0, 1], points: 10 };
  assert.equal(grade(b, [0]).score, 5);
  assert.equal(grade(b, [0, 2]).score, 0);
  assert.throws(() => grade(b, [0, 0]));
});
test("fill and position scoring", () => {
  assert.equal(grade(newBlock("blank"), " TAIWAN ").score, 1);
  assert.equal(grade(newBlock("hotspot"), { x: 0.3, y: 0.55 }).score, 1);
  assert.equal(grade(newBlock("hotspot"), { x: 0.9, y: 0.1 }).score, 0);
});
test("embed whitelist rejects credentialed and spoofed hosts", () => {
  assert.match(
    embedUrl("https://docs.google.com/presentation/d/abc/edit"),
    /\/embed$/,
  );
  assert.throws(() =>
    embedUrl("https://docs.google.com.attacker.com/presentation/d/abc/edit"),
  );
  assert.throws(() => embedUrl("javascript:alert(1)"));
  assert.throws(() => embedUrl("https://user@www.canva.com/design/abc/view"));
});
test("deck validation rejects duplicate block identities and invalid keys", () => {
  const d = deck();
  d.blocks.push({ ...d.blocks[0] });
  assert.throws(() => validateDeck(d));
  assert.throws(() =>
    validateDeck({ id: "x", title: "", blocks: [newBlock()] }),
  );
});
test("only teaching slides expose external presentation links", () => {
  const url = "https://docs.google.com/presentation/d/abc123/edit";
  const question = { ...newBlock("choice"), embed: url, notes: "PRIVATE" };
  const safe = publicBlock(question);
  assert.equal("embed" in safe, false);
  assert.equal("notes" in safe, false);
  const slide = { ...newBlock("slide"), embed: url };
  assert.equal(publicBlock(slide).embed, url);
});
function vowelFixture() {
  const block = newBlock("vowel", "vowel-question");
  block.vowelWords = [
    { word: "bike", imageId: "bike-image", targets: [1, 3] },
    { word: "car", imageId: "car-image", targets: [1, 2] },
    { word: "train", imageId: "train-image", targets: [2, 3] },
  ];
  block.media = ["bike", "car", "train"].map((name) => ({
    id: `${name}-image`,
    name,
    kind: "image",
  }));
  const room = createRoom(
    { id: "vowel-deck", title: "Phonics", blocks: [block] },
    "123456",
    "teacher",
    1000,
  );
  joinRoom(room, "student", "50101", 1001);
  controlRoom(room, "teacher", "open", { revision: 1 }, 1002);
  return room;
}
test("three-word vowel setup requires three images and valid marked positions", () => {
  const room = vowelFixture();
  const deck = room.deck;
  assert.equal(validateDeck(deck), deck);
  deck.blocks[0].vowelWords[0].targets = [1, 99];
  assert.throws(() => validateDeck(deck), /答案字母位置/);
  deck.blocks[0].vowelWords[0].targets = [1, 3];
  deck.blocks[0].vowelWords[1].imageId = "bike-image";
  assert.throws(() => validateDeck(deck), /三張不同/);
  deck.blocks[0].vowelWords[1].imageId = "";
  assert.throws(() => validateDeck(deck), /對應圖片/);
});
test("incomplete vowel drafts save, while teaching still requires three ready cards", () => {
  const block = newBlock("vowel", "draft-vowel");
  const incomplete = { id: "draft-deck", title: "Draft", blocks: [block] };
  assert.equal(validateDeck(incomplete, { draft: true }), incomplete);
  assert.throws(() => validateDeck(incomplete), /至少 2/);
  block.vowelWords[0].word = "bike";
  block.vowelWords[0].targets = [1, 3];
  block.vowelWords[0].imageId = "bike-image";
  block.media.push({ id: "bike-image", name: "bike", kind: "image" });
  assert.equal(validateDeck(incomplete, { draft: true }), incomplete);
  block.vowelWords[0].targets = [99];
  assert.throws(
    () => validateDeck(incomplete, { draft: true }),
    /答案字母位置/,
  );
});
test("vowel taps stay private; mistakes retry; all three auto-submit once and grant two turns", () => {
  let room = vowelFixture();
  const input = (wordIndex, letterIndex) => ({
    blockId: "vowel-question",
    revision: room.revision,
    wordIndex,
    letterIndex,
  });
  const studentBlock = snapshot(room, "student", 1003).block;
  assert.equal(studentBlock.vowelWords[0].targets, undefined);
  assert.equal(JSON.stringify(studentBlock).includes("targets"), false);
  assert.throws(
    () => submitRoom(room, "student", {
      attemptId: "bypass",
      blockId: "vowel-question",
      revision: room.revision,
      answer: [[1, 3], [1, 2], [2, 3]],
    }, 1003),
    /不能直接提交/,
  );
  assert.equal(tapVowel(room, "student", input(0, 0), 1004).correct, false);
  assert.equal(snapshot(room, "student", 1005).reward.earned, 0);
  assert.equal(tapVowel(room, "student", input(0, 1), 1006).correct, true);
  assert.deepEqual(snapshot(room, "student", 1007).vowelProgress.selected[0], [1]);
  room = JSON.parse(JSON.stringify(room));
  for (const [wi, li] of [[2, 3], [1, 2], [0, 3], [1, 1], [2, 2]])
    tapVowel(room, "student", input(wi, li), 1008);
  const result = snapshot(room, "student", 1010);
  assert.equal(result.vowelProgress.complete, true);
  assert.deepEqual(result.vowelProgress.completedWords, [true, true, true]);
  assert.equal(result.responses.length, 1);
  assert.equal(result.responses[0].grade.status, "graded");
  assert.equal(result.reward.earned, 2);
  assert.equal(report(room)[0].score, 1);
  tapVowel(room, "student", input(0, 1), 1011);
  assert.equal(Object.keys(room.responses).length, 1);
  assert.equal(snapshot(room, "student", 1012).reward.earned, 2);
});
test("teacher pause and page changes stop vowel taps without losing prior progress", () => {
  const room = vowelFixture();
  tapVowel(room, "student", {
    blockId: "vowel-question", revision: room.revision,
    wordIndex: 0, letterIndex: 1,
  }, 1003);
  controlRoom(room, "teacher", "pause", { revision: room.revision }, 1004);
  assert.throws(() => tapVowel(room, "student", {
    blockId: "vowel-question", revision: room.revision,
    wordIndex: 0, letterIndex: 3,
  }, 1005), /關閉或切換/);
  controlRoom(room, "teacher", "resume", { revision: room.revision }, 1006);
  assert.deepEqual(snapshot(room, "student", 1007).vowelProgress.selected[0], [1]);
});
