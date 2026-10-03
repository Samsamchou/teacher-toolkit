import { rng } from "./reward-random.mjs";
import { requiresMastery, masteryPassed } from './mastery.mjs';
import { makeBoard, createDrop, tick, CURRENT_PLINKOH_PHYSICS_VERSION } from "./reward-physics.mjs";
export const REWARD_GAMES = Object.freeze({
  basketball: "單人籃球",
  plinkoh: "Plink-oh!",
  slot: "Slot Machine",
});
export const SLOT_ITEMS = ["🍎", "🌟", "💎", "🔔", "🍒", "7️⃣"];
const reject = (message) => {
  throw new Error(message);
};
export function rewardAllowance(block, r) {
  if (!r || !block || block.type === "slide") return 0;
  if (requiresMastery(block)) return masteryPassed(block, r) ? 2 : 0;
  if (block.type === "cloud") return 2;
  if (r.grade?.status === "pending" || !r.grade || r.grade.status === "error")
    return 0;
  if (block.type === "audio")
    return r.override || r.passed || r.best >= 80
      ? 2
      : r.grade.status === "graded"
        ? 1
        : 0;
  if (r.grade.manual) return r.override ? 2 : 1;
  if (r.rewardPass !== undefined) return r.rewardPass ? 2 : 1;
  return r.grade.status === "graded"
    ? r.grade.max > 0 && r.grade.score >= r.grade.max
      ? 2
      : 1
    : 0;
}
export function rewardView(room, uid) {
  const wallet = room.rewards?.[uid] || { turns: [] },
    grants = new Map();
  const own = Object.values(room.responses || {}).filter((r) => r.uid === uid);
  for (const r of own) {
    const b = room.deck.blocks.find((b) => b.id === r.blockId);
    grants.set(
      r.blockId,
      Math.max(
        grants.get(r.blockId) || 0,
        r.rewardGranted || 0,
        rewardAllowance(b, r),
      ),
    );
  }
  const earned = [...grants.values()].reduce((a, b) => a + b, 0),
    expired = room.phase === "complete";
  const block = room.deck.blocks[room.index];
  const eligible =
    room.phase === "question" &&
    !room.reveal &&
    own.some(
      (r) =>
        r.blockId === block.id &&
        r.openedAt === room.openedAt &&
        (!requiresMastery(block) || masteryPassed(block, r)) &&
        rewardAllowance(block, r) > 0,
    );
  const turns = wallet.turns || [],
    pending = turns.find((t) => !t.done) || null;
  return {
    game: room.deck.rewardGame || "basketball",
    earned,
    remaining: expired ? 0 : Math.max(0, earned - turns.length),
    used: turns.length,
    score: turns.reduce((n, t) => n + t.result.points, 0),
    pending: expired ? null : pending,
    last: turns.at(-1) || null,
    eligible,
    expired,
    version: wallet.version || 0,
  };
}
// Results are decided on the trusted service, never accepted as client points.
export function rewardResult(game, input, seed) {
  const random = rng(seed);
  if (game === "basketball") {
    const shot = Number(input.shot);
    if (![1, 2, 3].includes(shot)) reject("請選擇 1、2 或 3 分投籃。");
    // Source BASE_ODDS, without multi-team comeback adjustments or power-ups.
    const odds = { 1: 84, 2: 56, 3: 25 }[shot],
      hit = random() * 100 < odds;
    return { shot, odds, hit, points: hit ? shot : 0 };
  }
  if (game === "slot") {
    const reels = [0, 0, 0].map(() => Math.floor(random() * SLOT_ITEMS.length));
    const points =
      reels[0] === reels[1] && reels[1] === reels[2]
        ? 100
        : new Set(reels).size === 2
          ? 50
          : 10;
    return { reels, points };
  }
  if (game === "plinkoh") {
    const zone = Number(input.zone);
    if (!Number.isInteger(zone) || zone < 1 || zone > 5)
      reject("請選擇落球區 1–5。");
    const board = makeBoard(1, seed, CURRENT_PLINKOH_PHYSICS_VERSION),
      sim = createDrop(board, zone, 5, seed);
    for (let i = 0; i < 2500 && !sim.done && !sim.failed; i++) tick(sim);
    if (!sim.done) reject("球未落定，尚未扣除機會，請重試。");
    const collision = sim.hits.reduce((n, h) => n + h.points, 0),
      slot = board.slots[sim.slotIndex];
    return {
      physicsVersion: CURRENT_PLINKOH_PHYSICS_VERSION,
      zone,
      collision,
      slot,
      slotIndex: sim.slotIndex,
      points: collision + slot,
    };
  }
  reject("不支援此遊戲。");
}
export function playReward(
  room,
  uid,
  input,
  now = Date.now(),
  seed = globalThis.crypto.getRandomValues(new Uint32Array(1))[0],
) {
  if (
    !room ||
    room.expiresAt < now ||
    !room.participants[uid] ||
    room.teacher === uid
  )
    reject("請以學生身分加入有效課堂。");
  if (!/^[\w-]{1,100}$/.test(input.turnId || "")) reject("遊戲識別碼無效。");
  const view = rewardView(room, uid),
    wallet = room.rewards?.[uid] || { version: 0, turns: [] };
  const old = wallet.turns.find((t) => t.id === input.turnId);
  if (old) return view;
  if (
    !view.eligible ||
    input.revision !== room.revision ||
    input.blockId !== room.deck.blocks[room.index].id
  )
    reject("老師已切換或暫停，請等待下一個遊戲時段。");
  if (view.pending) reject("請先完成上一次遊戲。");
  if (view.remaining <= 0) reject("機會已用完，請等待老師下一題。");
  if (input.walletVersion !== view.version) reject("遊戲已更新，請重新讀取。");
  const result = rewardResult(view.game, input, seed);
  wallet.turns.push({
    id: input.turnId,
    game: view.game,
    seed,
    result,
    blockId: input.blockId,
    at: now,
    done: false,
  });
  wallet.version++;
  room.rewards ??= {};
  room.rewards[uid] = wallet;
  return rewardView(room, uid);
}
export function finishReward(room, uid, input, now = Date.now()) {
  if (!room || room.expiresAt < now || !room.participants[uid])
    reject("課堂無效。");
  const view = rewardView(room, uid),
    turn = room.rewards?.[uid]?.turns.find((t) => t.id === input.turnId);
  if (!turn) reject("找不到遊戲紀錄。");
  if (turn.done) return view;
  if (!view.eligible || input.revision !== room.revision)
    reject("請等待教師恢復遊戲時段。");
  turn.done = true;
  room.rewards[uid].version++;
  return rewardView(room, uid);
}
