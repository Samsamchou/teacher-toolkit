export const RAFFLE_DURATION_MS = 4000;
export const RAFFLE_MIN = 1;
export const RAFFLE_MAX = 30;

export function createRafflePool() {
  return Array.from(
    { length: RAFFLE_MAX - RAFFLE_MIN + 1 },
    (_, index) => String(index + RAFFLE_MIN).padStart(2, "0")
  );
}

export function pickRaffleNumber(pool, random = Math.random) {
  if (!Array.isArray(pool) || !pool.length) return "";
  const value = Math.min(Math.max(Number(random()) || 0, 0), 0.999999);
  return pool[Math.floor(value * pool.length)] || "";
}

export function removeRaffleNumber(pool, number) {
  return Array.isArray(pool) ? pool.filter((value) => value !== number) : [];
}
