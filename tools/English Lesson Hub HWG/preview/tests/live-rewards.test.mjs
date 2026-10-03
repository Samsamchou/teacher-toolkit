import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  newBlock,
  createRoom,
  joinRoom,
  controlRoom,
  submitRoom,
  snapshot,
  report,
  validateDeck,
} from "../src/live/domain.mjs";
import {
  rewardView,
  rewardAllowance,
  rewardResult,
  playReward,
  finishReward,
} from "../src/live/rewards.mjs";
import {
  makeBoard,
  createDrop,
  advance,
  boardForTurn,
  CURRENT_PLINKOH_PHYSICS_VERSION,
} from "../src/live/reward-physics.mjs";
const fixture = (type = "choice", game = "basketball") => {
  const r = createRoom(
    {
      id: "reward-test",
      title: "Rewards",
      rewardGame: game,
      blocks: [newBlock(type, "q1"), newBlock("choice", "q2")],
    },
    "123456",
    "teacher",
    1000,
  );
  joinRoom(r, "student", "50101", 1001);
  controlRoom(r, "teacher", "open", { revision: r.revision }, 1002);
  return r;
};
const answer = (r, value, id = "attempt") =>
  submitRoom(
    r,
    "student",
    {
      attemptId: id,
      answer: value,
      revision: r.revision,
      blockId: r.deck.blocks[r.index].id,
    },
    1003,
  );
const play = (r, id = "turn", extra = {}) =>
  playReward(
    r,
    "student",
    {
      turnId: id,
      revision: r.revision,
      blockId: r.deck.blocks[r.index].id,
      walletVersion: rewardView(r, "student").version,
      shot: 1,
      zone: 3,
      ...extra,
    },
    1010,
    1234,
  );
const finish = (r, id = "turn") =>
  finishReward(r, "student", { turnId: id, revision: r.revision }, 1011);
const control = (r, action, p = {}) =>
  controlRoom(r, "teacher", action, { revision: r.revision, ...p }, 1020);

test("correct gets two; wrong and missing get zero; zero-point scoring still recognizes correctness", () => {
  const r = fixture();
  assert.equal(rewardView(r, "student").earned, 0);
  assert.throws(() => play(r));
  answer(r, [0]);
  assert.equal(rewardView(r, "student").earned, 2);
  const wrong = fixture();
  wrong.deck.blocks[0].points = 0;
  answer(wrong, [1]);
  assert.equal(rewardView(wrong, "student").earned, 0);
  const right = fixture();
  right.deck.blocks[0].points = 0;
  answer(right, [0]);
  assert.equal(rewardView(right, "student").earned, 2);
});
test("every game enforces allowance; duplicates and JSON reload never grant or spend twice", () => {
  for (const game of ["basketball", "plinkoh", "slot"]) {
    let r = fixture("choice", game);
    answer(r, [0]);
    const academic = report(r)[0].score;
    play(r);
    const result = structuredClone(rewardView(r, "student").pending);
    play(r);
    assert.equal(rewardView(r, "student").used, 1);
    assert.throws(() => play(r, "other"));
    r = JSON.parse(JSON.stringify(r));
    assert.deepEqual(rewardView(r, "student").pending, result);
    finish(r);
    finish(r);
    play(r, "second");
    finish(r, "second");
    assert.equal(rewardView(r, "student").remaining, 0);
    assert.throws(() => play(r, "third"));
    assert.equal(report(r)[0].score, academic);
    assert.equal(report(r)[0].gameTurns, 2);
  }
});
test("cloud gets two, open/draw pending zero, fail then pass adds only one and downgrade never removes earned credit", () => {
  const cloud = fixture("cloud");
  answer(cloud, "blue");
  assert.equal(rewardView(cloud, "student").earned, 2);
  for (const type of ["open", "draw"]) {
    const r = fixture(type);
    answer(
      r,
      type === "draw"
        ? [
            [
              [0, 0],
              [1, 1],
            ],
          ]
        : "hello",
    );
    assert.equal(rewardView(r, "student").earned, 0);
    control(r, "grade", { attemptId: "attempt", score: 0, pass: false });
    assert.equal(rewardView(r, "student").earned, 1);
    play(r);
    finish(r);
    control(r, "grade", { attemptId: "attempt", score: 1, pass: true });
    assert.equal(rewardView(r, "student").remaining, 1);
    control(r, "grade", { attemptId: "attempt", score: 1, pass: true });
    assert.equal(rewardView(r, "student").earned, 2);
    control(r, "grade", { attemptId: "attempt", score: 0, pass: false });
    assert.equal(rewardView(r, "student").earned, 2);
  }
});
test("audio pending/failure not wrong, 79 is one, 80 is two, manual pass is two", () => {
  const b = newBlock("audio");
  assert.equal(
    rewardAllowance(b, { grade: { status: "pending" }, best: 0 }),
    0,
  );
  assert.equal(rewardAllowance(b, { grade: { status: "error" }, best: 0 }), 0);
  assert.equal(
    rewardAllowance(b, { grade: { status: "graded" }, best: 79 }),
    1,
  );
  assert.equal(
    rewardAllowance(b, { grade: { status: "graded" }, best: 80 }),
    2,
  );
  assert.equal(
    rewardAllowance(b, {
      grade: { status: "graded" },
      best: 50,
      override: true,
    }),
    2,
  );
  const r = fixture();
  r.deck.blocks[0].type = "audio";
  r.responses = {
    a: {
      uid: "student",
      blockId: "q1",
      openedAt: r.openedAt,
      grade: { status: "graded" },
      best: 79,
    },
  };
  assert.equal(rewardView(r, "student").earned, 1);
  r.responses.b = { ...r.responses.a, best: 80 };
  assert.equal(rewardView(r, "student").earned, 2);
  r.responses.c = { ...r.responses.a, best: 90 };
  assert.equal(rewardView(r, "student").earned, 2);
});
test("pause, content, reveal, locks, removal and completion take priority; pending resumes with same result", () => {
  const r = fixture();
  answer(r, [0]);
  play(r);
  const first = structuredClone(rewardView(r, "student").pending);
  control(r, "pause");
  assert.equal(rewardView(r, "student").eligible, false);
  assert.throws(() => finish(r));
  control(r, "resume");
  assert.deepEqual(rewardView(r, "student").pending, first);
  finish(r);
  control(r, "move", { index: 1 });
  assert.equal(rewardView(r, "student").remaining, 1);
  assert.throws(() => play(r, "next"));
  control(r, "open");
  assert.equal(rewardView(r, "student").eligible, false);
  answer(r, [1], "attempt2");
  assert.equal(rewardView(r, "student").remaining, 1);
  assert.throws(() => play(r, "wrong-answer"));
  answer(r, [0], "retry-correct");
  assert.equal(rewardView(r, "student").remaining, 3);
  play(r, "next");
  finish(r, "next");
  control(r, "reveal");
  assert.throws(() => play(r, "blocked"));
  control(r, "end");
  assert.equal(rewardView(r, "student").remaining, 0);
  assert.equal(rewardView(r, "student").pending, null);
  assert.throws(() => play(r, "end"));
  const other = fixture();
  answer(other, [0]);
  control(other, "remove", { uid: "student" });
  assert.throws(() => play(other));
});
test("reopening same question never exceeds two; stale wallet/request and stranger cannot spend", () => {
  const r = fixture();
  answer(r, [0]);
  play(r);
  finish(r);
  control(r, "open");
  answer(r, [0], "again");
  assert.equal(rewardView(r, "student").earned, 2);
  assert.throws(() => play(r, "stale", { walletVersion: 0 }));
  assert.throws(() => play(r, "stale", { revision: 1 }));
  assert.throws(() => playReward(r, "thief", { turnId: "x" }, 1010, 1));
  assert.throws(() => finishReward(r, "thief", { turnId: "turn" }, 1010));
  assert.equal(snapshot(r, "student", 1030).reward.remaining, 1);
  assert.equal(snapshot(r, "teacher", 1030).reward, undefined);
});
test("game results are deterministic, ignore forged score, and reject unsupported input", () => {
  for (const game of ["basketball", "plinkoh", "slot"]) {
    assert.deepEqual(
      rewardResult(game, { shot: 2, zone: 3 }, 42),
      rewardResult(game, { shot: 2, zone: 3, points: 999999 }, 42),
    );
  }
  assert.throws(() => rewardResult("basketball", { shot: 999 }, 1));
  assert.throws(() => rewardResult("plinkoh", { zone: 0 }, 1));
  assert.throws(() =>
    validateDeck({
      id: "bad",
      title: "Bad",
      rewardGame: "__proto__",
      blocks: [newBlock()],
    }),
  );
  for (let seed = 1; seed <= 60; seed++) {
    const s = rewardResult("slot", {}, seed);
    assert.ok([10, 50, 100].includes(s.points));
    const p = rewardResult("plinkoh", { zone: 1 + (seed % 5) }, seed);
    assert.equal(p.points, p.collision + p.slot);
  }
});
test("new Plink-oh turns use visible fixed +1/-1 pegs while legacy turns keep original board and scores", () => {
  const legacy = makeBoard(1, 1);
  const current = makeBoard(1, 1, CURRENT_PLINKOH_PHYSICS_VERSION);
  assert.ok(boardForTurn(null).pegs.some((peg) => peg.points === -1));
  assert.ok(boardForTurn({ seed: 1, result: { physicsVersion: 2 } }).pegs.some((peg) => peg.points === -1));
  assert.ok(boardForTurn({ seed: 1, result: {} }).pegs.every((peg) => peg.points === 1));
  assert.ok(legacy.pegs.every((peg) => peg.points === 1 && !peg.penalty));
  assert.ok(current.pegs.some((peg) => peg.points === -1 && peg.penalty));
  assert.ok(current.pegs.some((peg) => peg.points === 1 && !peg.penalty));
  assert.deepEqual(
    current.pegs.map(({ x, y, phase }) => ({ x, y, phase })),
    legacy.pegs.map(({ x, y, phase }) => ({ x, y, phase })),
  );
  assert.deepEqual(current.slots, legacy.slots);

  const sim = createDrop(current, 3, 5, 1), events = [];
  for (let i = 0; i < 2500 && !sim.done && !sim.failed; i++)
    events.push(...advance(sim, 0.25));
  assert.equal(sim.done, true);
  const pegEvents = events.filter((event) => event.type === "peg" || event.type === "pink");
  assert.ok(pegEvents.some((event) => event.points === -1));
  assert.deepEqual(pegEvents.map((event) => event.points), sim.hits.map((hit) => hit.points));
  const result = rewardResult("plinkoh", { zone: 3 }, 1);
  assert.equal(result.physicsVersion, CURRENT_PLINKOH_PHYSICS_VERSION);
  assert.equal(result.collision, sim.hits.reduce((sum, hit) => sum + hit.points, 0));
  assert.equal(result.points, result.collision + result.slot);

  const room = fixture("choice", "plinkoh");
  answer(room, [0]);
  room.rewards = {
    student: {
      version: 1,
      turns: [{ id: "historic", game: "plinkoh", seed: 1, result: { zone: 3, collision: 4, slot: 20, slotIndex: 1, points: 24 }, blockId: room.block?.id || room.deck.blocks[0].id, done: true }],
    },
  };
  assert.equal(rewardView(room, "student").score, 24);
  assert.equal(rewardView(room, "student").last.result.physicsVersion, undefined);
});
test("shared reward modules used by cloud exactly match the local source", async () => {
  for (const name of [
    "rewards.mjs",
    "reward-physics.mjs",
    "reward-random.mjs",
  ]) {
    assert.deepEqual(
      await readFile(new URL("../src/live/" + name, import.meta.url)),
      await readFile(
        new URL("../functions/generated/" + name, import.meta.url),
      ),
    );
  }
});
