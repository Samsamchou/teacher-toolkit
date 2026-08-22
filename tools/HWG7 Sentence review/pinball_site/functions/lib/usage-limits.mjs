export const AI_USAGE_LIMITS = Object.freeze({
  perStudentPerDay: 60,
  perGamePerMinute: 12,
  projectPerDay: 2000,
  claimLeaseMs: 2 * 60 * 1000,
});

export function minuteBucket(now = new Date()) {
  const date = new Date(now);
  if (Number.isNaN(date.getTime())) throw new TypeError("Invalid usage-limit time");
  return date.toISOString().slice(0, 16).replace(/[-:T]/gu, "");
}

function count(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : 0;
}

export function decideUsageReservation({ counts = {}, claimLeaseUntil = null, now = new Date() } = {}) {
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) throw new TypeError("Invalid usage-limit time");
  const leaseMs = claimLeaseUntil ? new Date(claimLeaseUntil).getTime() : 0;
  if (Number.isFinite(leaseMs) && leaseMs > nowMs) {
    return {
      allowed: false,
      status: 409,
      code: "attempt_in_progress",
      message: "這次作答正在評分中，請稍候。",
      retryAfterSeconds: Math.max(1, Math.ceil((leaseMs - nowMs) / 1000)),
    };
  }

  const studentDaily = count(counts.studentDaily);
  const gameMinute = count(counts.gameMinute);
  const projectDaily = count(counts.projectDaily);
  const exceeded = [
    [studentDaily >= AI_USAGE_LIMITS.perStudentPerDay, "student_daily_limit", "今天的口說練習次數已達上限，請明天再試。", 3600],
    [gameMinute >= AI_USAGE_LIMITS.perGamePerMinute, "game_minute_limit", "送出速度太快，請稍候一分鐘再試。", 60],
    [projectDaily >= AI_USAGE_LIMITS.projectPerDay, "project_daily_limit", "今日評測服務已達安全上限，請稍後再試。", 3600],
  ].find(([hit]) => hit);
  if (exceeded) {
    return { allowed: false, status: 429, code: exceeded[1], message: exceeded[2], retryAfterSeconds: exceeded[3] };
  }
  return {
    allowed: true,
    nextCounts: { studentDaily: studentDaily + 1, gameMinute: gameMinute + 1, projectDaily: projectDaily + 1 },
  };
}
