let context = null;
let raffleSpin = null;
let timerAlarm = null;
let quizCelebration = null;

export const TIMER_ALARM_DURATION_MS = 6000;
export const QUIZ_COMPLETION_DURATION_MS = 10000;
export const QUIZ_CORRECT_CHIME_FREQUENCIES = [660, 830, 1046];

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

export function prepareTimerAlarm(enabled) {
  if (!enabled) return;
  const ctx = audioContext();
  if (!ctx) return;
  ctx.resume().catch(() => {});
}

export function prepareQuizAudio(enabled) {
  if (!enabled) return;
  const ctx = audioContext();
  if (!ctx) return;
  ctx.resume().catch(() => {});
}

export function playQuizCorrectChime(enabled) {
  if (!enabled) return;
  prepareQuizAudio(true);
  QUIZ_CORRECT_CHIME_FREQUENCIES.forEach((frequency, index) => tone({
    frequency,
    start: index * 0.11,
    duration: 0.2,
    gain: 0.055,
    type: index === 2 ? "triangle" : "sine"
  }));
}

export function startQuizCelebration(enabled, durationMs = QUIZ_COMPLETION_DURATION_MS) {
  stopQuizCelebration();
  if (!enabled || durationMs <= 0) return;
  const ctx = audioContext();
  if (!ctx) return;
  ctx.resume().catch(() => {});
  const at = ctx.currentTime;
  const duration = durationMs / 1000;
  const master = ctx.createGain();
  const oscillators = [];
  master.gain.setValueAtTime(0.68, at);
  master.connect(ctx.destination);
  const phrase = [523.25, 659.25, 783.99, 1046.5];
  for (let phraseStart = 0; phraseStart < duration; phraseStart += 1.25) {
    phrase.forEach((frequency, index) => {
      const start = at + phraseStart + index * 0.16;
      if (start >= at + duration) return;
      const stop = Math.min(start + 0.24, at + duration);
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();
      oscillator.type = index % 2 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.055, start + 0.018);
      volume.gain.exponentialRampToValueAtTime(0.0001, stop);
      oscillator.connect(volume);
      volume.connect(master);
      oscillator.start(start);
      oscillator.stop(stop + 0.02);
      oscillators.push(oscillator);
    });
  }
  const stopTimer = window.setTimeout(() => stopQuizCelebration(), durationMs + 120);
  quizCelebration = { context: ctx, master, oscillators, stopTimer };
}

export function stopQuizCelebration() {
  const current = quizCelebration;
  quizCelebration = null;
  if (!current) return;
  window.clearTimeout(current.stopTimer);
  const at = current.context.currentTime;
  try {
    current.master.gain.cancelScheduledValues(at);
    current.master.gain.setValueAtTime(Math.max(0.0001, current.master.gain.value), at);
    current.master.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  } catch {
    // The ten-second completion melody may already have ended.
  }
  current.oscillators.forEach((oscillator) => {
    try {
      oscillator.stop(at + 0.07);
    } catch {
      // A scheduled oscillator may already be stopped.
    }
  });
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

export function startRaffleSpin(enabled) {
  if (!enabled) return;
  const ctx = audioContext();
  if (!ctx) return;
  ctx.resume().catch(() => {});
  stopRaffleSpin(false);
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  const at = ctx.currentTime;
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(180, at);
  oscillator.frequency.linearRampToValueAtTime(520, at + 3.7);
  volume.gain.setValueAtTime(0.0001, at);
  volume.gain.exponentialRampToValueAtTime(0.018, at + 0.05);
  volume.gain.linearRampToValueAtTime(0.03, at + 3.2);
  oscillator.connect(volume);
  volume.connect(ctx.destination);
  oscillator.start(at);
  raffleSpin = { oscillator, volume, context: ctx };
}

export function stopRaffleSpin(enabled) {
  const current = raffleSpin;
  raffleSpin = null;
  if (current) {
    const at = current.context.currentTime;
    current.volume.gain.cancelScheduledValues(at);
    current.volume.gain.setValueAtTime(Math.max(0.0001, current.volume.gain.value), at);
    current.volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    current.oscillator.stop(at + 0.09);
  }
  if (enabled) {
    tone({ frequency: 760, duration: 0.12, gain: 0.05, type: "triangle" });
    tone({ frequency: 980, start: 0.12, duration: 0.16, gain: 0.04, type: "sine" });
  }
}

export function startTimerAlarm(enabled) {
  stopTimerAlarm();
  if (!enabled) return;
  const ctx = audioContext();
  if (!ctx) return;
  ctx.resume().catch(() => {});
  const at = ctx.currentTime;
  const duration = TIMER_ALARM_DURATION_MS / 1000;
  const master = ctx.createGain();
  const low = ctx.createOscillator();
  const high = ctx.createOscillator();
  low.type = "square";
  high.type = "sawtooth";
  low.connect(master);
  high.connect(master);
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, at);
  for (let beat = 0; beat < duration; beat += 0.5) {
    const beatAt = at + beat;
    const alternate = Math.round(beat * 2) % 2;
    low.frequency.setValueAtTime(alternate ? 740 : 660, beatAt);
    high.frequency.setValueAtTime(alternate ? 1240 : 1100, beatAt);
    master.gain.setValueAtTime(0.0001, beatAt);
    master.gain.linearRampToValueAtTime(0.16, beatAt + 0.015);
    master.gain.setValueAtTime(0.16, beatAt + 0.19);
    master.gain.exponentialRampToValueAtTime(0.0001, beatAt + 0.24);
  }
  low.start(at);
  high.start(at);
  low.stop(at + duration + 0.03);
  high.stop(at + duration + 0.03);
  const stopTimer = window.setTimeout(() => stopTimerAlarm(), TIMER_ALARM_DURATION_MS + 120);
  timerAlarm = { context: ctx, master, low, high, stopTimer };
}

export function stopTimerAlarm() {
  const current = timerAlarm;
  timerAlarm = null;
  if (!current) return;
  window.clearTimeout(current.stopTimer);
  const at = current.context.currentTime;
  try {
    current.master.gain.cancelScheduledValues(at);
    current.master.gain.setValueAtTime(Math.max(0.0001, current.master.gain.value), at);
    current.master.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    current.low.stop(at + 0.06);
    current.high.stop(at + 0.06);
  } catch {
    // The six-second alarm may already have completed.
  }
}
