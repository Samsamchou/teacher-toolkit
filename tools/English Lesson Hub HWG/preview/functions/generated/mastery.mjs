// Every objective question must be completely correct before a reward game.
const EXEMPT_TYPES = new Set(['slide', 'draw', 'cloud', 'open', 'audio']);
export const requiresMastery = block => Boolean(block && !EXEMPT_TYPES.has(block.type));
export const masteryPassed = (block, response) => {
  if (!response) return false;
  if (typeof response.rewardPass === 'boolean') return response.rewardPass;
  const grade = response.grade;
  return grade?.status === 'graded' && grade.max > 0 && grade.score === grade.max;
};
export const canRetryResponse = (block, response) =>
  requiresMastery(block) && !masteryPassed(block, response);
export const responseStorageId = response => response.storageId || response.attemptId;
