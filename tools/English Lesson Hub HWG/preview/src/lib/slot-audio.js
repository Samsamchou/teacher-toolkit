let context = null;

function audioContext() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  if (!context || context.state === "closed") context = new Context();
  return context;
}

function tone({ frequency, start = 0, duration = 0.06, gain = 0.035, type = "square" }) {
  const ctx = audioContext();
  if (!ctx) return;
  const at = ctx.currentTime + Math.max(0, start);
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  volume.gain.setValueAtTime(0.0001, at);
  volume.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  volume.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(volume);
  volume.connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
}

export function prepareSlotAudio(enabled) {
  if (!enabled) return;
  const ctx = audioContext();
  if (!ctx) return;
  ctx.resume().catch(() => {});
  tone({ frequency: 190, duration: 0.07, gain: 0.04, type: "sine" });
  tone({ frequency: 280, start: 0.08, duration: 0.06, gain: 0.035, type: "sine" });
}

export function playSlotTick(enabled, progress) {
  if (!enabled) return;
  tone({
    frequency: Math.round(380 + Math.min(1, progress) * 220),
    duration: 0.024,
    gain: 0.022,
    type: "square"
  });
}

export function playReelStop(enabled, reelIndex) {
  if (!enabled) return;
  tone({ frequency: 540 + reelIndex * 90, duration: 0.11, gain: 0.045, type: "triangle" });
}

export function playRewardChime(enabled, jackpot) {
  if (!enabled) return;
  const notes = jackpot ? [660, 830, 990, 1320] : [580, 730, 880];
  notes.forEach((frequency, index) => tone({
    frequency,
    start: index * 0.1,
    duration: 0.12,
    gain: 0.05,
    type: "sine"
  }));
}
