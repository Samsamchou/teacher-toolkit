// Web Audio 即時合成音效：不需要任何音檔。
let ctx = null;
let muted = false;
const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
export const setMuted = m => { muted = m; };
export const isMuted = () => muted;
export const unlock = () => { try { ac().resume(); } catch { /* ignore */ } };

function tone({ type = "sine", from, to = from, at = 0, dur = 0.15, vol = 0.25 }) {
  if (muted) return;
  const c = ac(), t = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(at = 0, dur = 0.12, vol = 0.2) {
  if (muted) return;
  const c = ac(), t = c.currentTime + at;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(), g = c.createGain();
  s.buffer = buf; g.gain.value = vol;
  s.connect(g).connect(c.destination);
  s.start(t);
}

export const sfx = {
  click: () => tone({ type: "triangle", from: 660, to: 880, dur: 0.06, vol: 0.12 }),
  correct: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ from: f, at: i * 0.07, dur: 0.18, vol: 0.2 })),
  wrong: () => { tone({ type: "sawtooth", from: 220, to: 110, dur: 0.3, vol: 0.15 }); tone({ type: "sawtooth", from: 160, to: 80, at: 0.12, dur: 0.3, vol: 0.12 }); },
  hit: () => { tone({ type: "triangle", from: 220, to: 40, dur: 0.22, vol: 0.35 }); noise(0, 0.1, 0.15); },
  hurt: () => { tone({ type: "square", from: 180, to: 60, dur: 0.25, vol: 0.18 }); noise(0, 0.15, 0.2); },
  ult: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone({ type: "square", from: f, at: i * 0.06, dur: 0.2, vol: 0.12 })); noise(0.32, 0.4, 0.3); tone({ type: "sine", from: 120, to: 30, at: 0.32, dur: 0.6, vol: 0.4 }); },
  defeat: () => [784, 659, 523, 392, 262].forEach((f, i) => tone({ type: "triangle", from: f, at: i * 0.08, dur: 0.2, vol: 0.18 })),
  victory: () => [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.64]].forEach(([f, at]) => tone({ type: "triangle", from: f, at, dur: 0.22, vol: 0.2 })),
  energy: () => tone({ type: "sine", from: 880, to: 1760, dur: 0.25, vol: 0.12 }),
};
