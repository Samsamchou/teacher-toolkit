// Classroom single-player reward games inside assignments. Results come from the same
// trusted generators as Teacher-led rooms; learning scores are never changed here.
import { REWARD_GAMES, rewardResult } from '../live/rewards.mjs';
import { isSport, startSport, advanceSport } from '../live/reward-sports.mjs';
import { currentBlock, recordFor, isRewardAssignment } from './assignment-domain.mjs';

const fail = message => { throw Error(message); };
const ID = /^[\w-]{1,100}$/;

// Practice: full 2, partial 1, wrong 0 once a question is finished (same as classroom rooms).
export function assignmentAllowance(a, b, rec) {
  if (!b || !rec?.closed || rec.pending || b.ungraded || ['slide', 'cloud'].includes(b.type) || !(b.points > 0)) return 0;
  const value = a.mode === 'exam' ? rec.first : rec.best;
  return value >= b.points ? 2 : value > 0 ? 1 : 0;
}

// Practice turns belong to the current question and expire when the student moves on.
// Exam turns open only after every answer is submitted and total all question chances.
export function assignmentRewardView(a, r, now = Date.now()) {
  if (!isRewardAssignment(a) || !r) return null;
  const wallet = r.rewards || { version: 0, turns: [] }, turns = wallet.turns || [];
  const expired = Boolean(a.closed || a.dueAt <= now || a.retentionAt <= now);
  let scope = null, earned = 0;
  if (a.mode === 'exam') {
    scope = 'final';
    if (r.completedAt) earned = r.sequence.reduce((n, id) => n + assignmentAllowance(a, a.deck.blocks.find(b => b.id === id), recordFor(r, id)), 0);
  } else if (!r.completedAt) {
    const b = currentBlock(a, r);
    if (b) { scope = b.id; earned = assignmentAllowance(a, b, recordFor(r, b.id)); }
  }
  const own = turns.filter(t => t.blockId === scope);
  const pending = turns.find(t => !t.done) || null;
  return {
    game: a.game,
    gameName: REWARD_GAMES[a.game],
    blockId: scope,
    earned,
    remaining: expired ? 0 : Math.max(0, earned - own.length),
    used: own.length,
    score: turns.reduce((n, t) => n + (t.result?.points || 0), 0),
    turns: turns.length,
    pending: expired ? null : pending,
    last: own.at(-1) || null,
    eligible: !expired && Boolean(scope) && earned > 0,
    expired,
    version: wallet.version || 0,
  };
}

export function rewardGameResult(a, r) {
  const turns = r?.rewards?.turns || [];
  return { status: 'reward', game: a.game, levelsCompleted: 0, score: turns.reduce((n, t) => n + (t.result?.points || 0), 0), turns: turns.length, finishedAt: r?.completedAt || null };
}

export function playAssignmentReward(a, r, input, now = Date.now(), seed) {
  if (!isRewardAssignment(a)) fail('這份分配沒有課間遊戲。');
  if (!ID.test(input.turnId || '')) fail('遊戲識別碼無效。');
  const view = assignmentRewardView(a, r, now);
  r.rewards ??= { version: 0, turns: [] };
  const wallet = r.rewards, old = wallet.turns.find(t => t.id === input.turnId);
  if (old) {
    // Retried request: return the saved outcome; sports advance one saved step at a time.
    if (!isSport(old.game) || !input.actionId || old.actions?.includes(input.actionId)) return false;
    if (!ID.test(input.actionId)) fail('操作識別碼無效。');
    if (old.done || view.expired) fail('這次遊戲已結束。');
    if (input.walletVersion !== view.version || input.step !== old.result.step) fail('遊戲已更新，請重新讀取。');
    old.result = advanceSport(old.game, old.result, input, seed);
    (old.actions ??= []).push(input.actionId);
    wallet.version++;
    return true;
  }
  if (input.actionId) fail('找不到遊戲回合。');
  if (!view.eligible || input.blockId !== view.blockId || input.revision !== r.revision) fail('目前沒有遊戲機會，請重新讀取進度。');
  if (view.pending) fail('請先完成上一次遊戲。');
  if (view.remaining <= 0) fail('這一題的遊戲機會已用完。');
  if (input.walletVersion !== view.version) fail('遊戲已更新，請重新讀取。');
  const prior = wallet.turns.filter(t => t.game === a.game);
  const result = isSport(a.game)
    ? startSport(a.game, input, seed, prior.reduce((n, t) => n + t.result.points, 0), prior.length, prior.at(-1)?.result.session?.teams[0]?.powerups || 0)
    : rewardResult(a.game, input, seed);
  wallet.turns.push({ id: input.turnId, game: a.game, seed, result, blockId: view.blockId, at: now, done: false });
  wallet.version++;
  return true;
}

export function finishAssignmentReward(a, r, input) {
  const turn = r.rewards?.turns.find(t => t.id === input.turnId);
  if (!turn) fail('找不到遊戲紀錄。');
  if (turn.done) return false;
  if (isSport(turn.game) && !turn.result.resolved) fail('請先完成本回合所有操作。');
  turn.done = true;
  r.rewards.version++;
  return true;
}

// Moving on is allowed with unused chances (they are forfeited), never mid-turn.
export function checkRewardAdvance(a, r) {
  if (isRewardAssignment(a) && r.rewards?.turns.some(t => !t.done)) fail('請先完成這一次遊戲，再前往下一題。');
}

export function withReward(snapshot, a, r, now = Date.now()) {
  if (!isRewardAssignment(a) || !snapshot?.run) return snapshot;
  snapshot.reward = assignmentRewardView(a, r, now);
  snapshot.run.gameResult = r.completedAt ? rewardGameResult(a, r) : null;
  return snapshot;
}
