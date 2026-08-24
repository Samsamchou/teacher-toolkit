export const INITIAL_ENERGY = 50;

export function scoreDelta(attemptNumber, correct, affectsEnergy = true) {
  if (!affectsEnergy) return 0;
  if (!correct) return -3;
  if (attemptNumber === 1) return 10;
  if (attemptNumber === 2) return 5;
  return 2;
}

export function applyEnergy(currentEnergy, delta) {
  return Math.max(0, currentEnergy + delta);
}
