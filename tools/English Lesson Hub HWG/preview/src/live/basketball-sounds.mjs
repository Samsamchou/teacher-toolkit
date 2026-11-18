// Synthesized basketball cues (no audio files): net swish, small crowd cheer, rim clank.
function noise(c, seconds) {
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = c.createBufferSource();
  source.buffer = buffer;
  return source;
}
function envelope(c, at, peak, attack, release) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
  return g;
}

// Ball dropping through the net: a short band-passed noise sweep plus a soft high "zip".
function swish(c, at, volume) {
  const n = noise(c, 0.5), band = c.createBiquadFilter(), g = envelope(c, at, 0.5 * volume, 0.02, 0.4);
  band.type = 'bandpass'; band.Q.value = 1.2;
  band.frequency.setValueAtTime(5200, at); band.frequency.exponentialRampToValueAtTime(1400, at + 0.4);
  n.connect(band).connect(g).connect(c.destination); n.start(at); n.stop(at + 0.5);
  const o = c.createOscillator(), og = envelope(c, at, 0.06 * volume, 0.01, 0.18);
  o.type = 'sine'; o.frequency.setValueAtTime(1800, at); o.frequency.exponentialRampToValueAtTime(900, at + 0.18);
  o.connect(og).connect(c.destination); o.start(at); o.stop(at + 0.22);
}

// A short crowd cheer: mid-band noise that swells and fades with a little flutter.
function cheer(c, at, volume) {
  const n = noise(c, 1.6), band = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), depth = c.createGain();
  band.type = 'bandpass'; band.frequency.value = 1500; band.Q.value = 0.7;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.32 * volume, at + 0.18);
  g.gain.setValueAtTime(0.32 * volume, at + 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 1.5);
  lfo.frequency.value = 9; depth.gain.value = 0.08 * volume;
  lfo.connect(depth).connect(g.gain);
  n.connect(band).connect(g).connect(c.destination);
  n.start(at); n.stop(at + 1.6); lfo.start(at); lfo.stop(at + 1.6);
  // Two quick rising "woo" tones on top of the crowd.
  for (const [delay, from] of [[0.05, 520], [0.22, 660]]) {
    const o = c.createOscillator(), og = envelope(c, at + delay, 0.05 * volume, 0.04, 0.35);
    o.type = 'triangle'; o.frequency.setValueAtTime(from, at + delay); o.frequency.exponentialRampToValueAtTime(from * 1.6, at + delay + 0.3);
    o.connect(og).connect(c.destination); o.start(at + delay); o.stop(at + delay + 0.42);
  }
}

// Missed shot: low thud of the rim plus a short metallic ring.
function rim(c, at, volume) {
  const thud = c.createOscillator(), tg = envelope(c, at, 0.35 * volume, 0.005, 0.22);
  thud.type = 'triangle'; thud.frequency.setValueAtTime(170, at); thud.frequency.exponentialRampToValueAtTime(85, at + 0.2);
  thud.connect(tg).connect(c.destination); thud.start(at); thud.stop(at + 0.26);
  for (const f of [880, 1310]) {
    const o = c.createOscillator(), og = envelope(c, at, 0.05 * volume, 0.003, 0.5);
    o.type = 'sine'; o.frequency.value = f;
    o.connect(og).connect(c.destination); o.start(at); o.stop(at + 0.55);
  }
}

export function playBasketballCue(context, kind, volume = 1) {
  if (!context) return;
  const at = context.currentTime + 0.01;
  if (kind === 'swish') swish(context, at, volume);
  else if (kind === 'cheer') cheer(context, at, volume);
  else if (kind === 'rim') rim(context, at, volume);
}
