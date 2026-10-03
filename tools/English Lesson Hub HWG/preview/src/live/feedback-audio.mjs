// Original, short classroom cues. These notes do not sample the reference videos.
export const OUTCOME_LABELS = Object.freeze({
  full: '全對',
  partial: '部分答對',
  wrong: '答錯',
});

export const OUTCOME_TONES = Object.freeze({
  full: Object.freeze([[523.25, 0, 0.12], [659.25, 0.13, 0.12], [783.99, 0.26, 0.2]]),
  partial: Object.freeze([[493.88, 0, 0.13], [587.33, 0.16, 0.18]]),
  wrong: Object.freeze([[392, 0, 0.15], [329.63, 0.18, 0.2]]),
});

export function validFeedbackReceipt(receipt) {
  return Boolean(receipt && /^[a-z0-9-]{8,100}$/i.test(receipt.attemptId || '') && OUTCOME_LABELS[receipt.outcome]);
}

export function consumeFeedbackReceipt(receipt, played) {
  if (!validFeedbackReceipt(receipt) || played.has(receipt.attemptId)) return false;
  played.add(receipt.attemptId);
  return true;
}

export function playOutcomeTones(context, outcome) {
  const notes = OUTCOME_TONES[outcome];
  if (!notes || context.state !== 'running') return false;
  const start = context.currentTime + 0.015;
  for (const [frequency, offset, duration] of notes) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = outcome === 'wrong' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start + offset);
    envelope.gain.setValueAtTime(0.0001, start + offset);
    envelope.gain.exponentialRampToValueAtTime(outcome === 'wrong' ? 0.055 : 0.075, start + offset + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
    oscillator.connect(envelope);
    envelope.connect(context.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + duration + 0.015);
  }
  return true;
}
