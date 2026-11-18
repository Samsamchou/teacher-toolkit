import test from "node:test";
import assert from "node:assert/strict";
import {
  newBlock, createRoom, joinRoom, controlRoom, snapshot, validateDeck, publicBlock, tapVowel,
  vowelCombos, vowelComboLabel,
} from "../src/live/domain.mjs";
import { editVowelPhrase, pruneVowelLinks } from "../src/live/vowel-phrase.mjs";
import { feedbackFor, vowelResult } from "../src/assignments/assignment-domain.mjs";

test("assignment feedback shows found letter groups only after the question closes", () => {
  const b = { id: "v", type: "vowel", vowelWords: [
    { word: "surf", targets: [1, 2] },
    { word: "make", targets: [1, 3], links: [[1, 3]] },
    { word: "TV", targets: [1] },
  ] };
  // Picked u only in surf, a+e in make, and a wrong T in TV.
  const answer = [[1], [1, 3], [0]];
  assert.deepEqual(vowelResult(b, answer), { correct: [[1], [1, 3], []], combos: [[], [[1, 3]], []] });
  const attempt = { attemptId: "x", blockId: "v", outcome: "partial", grade: { score: 0, max: 1 }, ordinal: 1, answer };
  const a = { mode: "practice", deck: { blocks: [b] } };
  const open = { records: { v: { count: 1, closed: false } }, awards: {} };
  assert.equal("vowel" in feedbackFor(a, open, attempt), false);
  const closed = { records: { v: { count: 4, closed: true, best: 0 } }, awards: {} };
  assert.deepEqual(feedbackFor(a, closed, attempt).vowel.combos, [[], [[1, 3]], []]);
});

const surf = { word: "surf the Internet", targets: [1, 2, 7, 9, 12, 13, 15] };

test("adjacent marked letters form groups; single letters stay single", () => {
  assert.deepEqual(vowelCombos(surf), [[1, 2], [12, 13]]);
  assert.deepEqual(vowelCombos(surf).map((g) => vowelComboLabel(surf.word, g)), ["ur", "er"]);
  assert.deepEqual(vowelCombos({ word: "study English", targets: [2, 4, 6, 10] }), []);
  assert.deepEqual(vowelCombos({ word: "play", targets: [2, 3] }).map((g) => vowelComboLabel("play", g)), ["ay"]);
});

test("teacher links make split groups such as a_e and i_e", () => {
  const make = { word: "make a cake", targets: [1, 3, 5, 8, 10], links: [[1, 3], [8, 10]] };
  assert.deepEqual(vowelCombos(make).map((g) => vowelComboLabel(make.word, g)), ["a_e", "a_e"]);
  assert.deepEqual(vowelCombos({ word: "bike", targets: [1, 3] }), []);
  assert.deepEqual(vowelCombos({ word: "bike", targets: [1, 3], links: [[1, 3]] }).map((g) => vowelComboLabel("bike", g)), ["i_e"]);
});

function room(links) {
  const block = newBlock("vowel", "vq");
  block.vowelWords = [
    { word: "surf", imageId: "a", targets: [1, 2] },
    { word: "make", imageId: "b", targets: [1, 3], ...(links ? { links } : {}) },
    { word: "TV", imageId: "c", targets: [1] },
  ];
  block.media = ["a", "b", "c"].map((id) => ({ id, name: id, kind: "image" }));
  const r = createRoom({ id: "d", title: "Phonics", blocks: [block] }, "123456", "teacher", 1000);
  joinRoom(r, "student", "50101", 1001);
  controlRoom(r, "teacher", "open", { revision: 1 }, 1002);
  return r;
}

test("links are validated and hidden from students until the whole group is found", () => {
  const r = room([[1, 3]]);
  assert.equal(validateDeck(r.deck), r.deck);
  const safe = snapshot(r, "student", 1003).block;
  assert.equal(JSON.stringify(safe.vowelWords).includes("links"), false);
  assert.deepEqual(publicBlock(r.deck.blocks[0], true).vowelWords[1].links, [[1, 3]]);
  const tap = (wordIndex, letterIndex) =>
    tapVowel(r, "student", { blockId: "vq", revision: r.revision, wordIndex, letterIndex }, 1004);
  tap(0, 1);
  assert.deepEqual(snapshot(r, "student", 1005).vowelProgress.combos, [[], [], []]);
  tap(0, 2);
  tap(1, 1);
  assert.deepEqual(snapshot(r, "student", 1006).vowelProgress.combos, [[[1, 2]], [], []]);
  tap(1, 3);
  assert.deepEqual(snapshot(r, "student", 1007).vowelProgress.combos, [[[1, 2]], [[1, 3]], []]);
  for (const bad of [[[1]], [[1, 2]], [[1, 1]], "x"]) {
    r.deck.blocks[0].vowelWords[1].links = bad;
    assert.throws(() => validateDeck(r.deck), /字母組合/);
  }
  r.deck.blocks[0].vowelWords[0] = { word: "a b", imageId: "a", targets: [0, 2], links: [[0, 2]] };
  assert.throws(() => validateDeck(r.deck), /字母組合/);
});

test("capitalising a word keeps marks and links; changing letters clears them", () => {
  assert.deepEqual(editVowelPhrase({ word: "study english", targets: [2, 4, 6, 10] }, "study English"),
    { word: "study English", targets: [2, 4, 6, 10] });
  assert.deepEqual(editVowelPhrase({ word: "make", targets: [1, 3], links: [[1, 3]] }, "Make"),
    { word: "Make", targets: [1, 3], links: [[1, 3]] });
  assert.deepEqual(editVowelPhrase({ word: "makeacake", targets: [1, 3, 6, 8], links: [[6, 8]] }, "make a cake"),
    { word: "make a cake", targets: [1, 3, 8, 10], links: [[8, 10]] });
  assert.deepEqual(editVowelPhrase({ word: "make", targets: [1, 3], links: [[1, 3]] }, "mike"),
    { word: "mike", targets: [], links: [] });
  assert.deepEqual(pruneVowelLinks([[1, 3], [5, 7, 9]], [1, 5, 7]), [[5, 7]]);
});
