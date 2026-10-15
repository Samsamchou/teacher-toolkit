// CC0 stadium recordings plus original short game cues; see /worldpup/audio/manifest.json.
export const WORLD_PUP_VICTORY_SECONDS = 5;

const clamp = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const midi = (note) => 440 * 2 ** ((note - 69) / 12);

export class WorldPupAudio {
  constructor({ contextFactory, setIntervalFn = (...args) => globalThis.setInterval(...args), clearIntervalFn = (id) => globalThis.clearInterval(id), random = Math.random } = {}) {
    this.contextFactory = contextFactory || (() => {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio is unavailable');
      return new AudioContext();
    });
    this.setIntervalFn = setIntervalFn;
    this.clearIntervalFn = clearIntervalFn;
    this.random = random;
    this.context = null;
    this.bus = {};
    this.master = null;
    this.nodes = new Set();
    this.timer = null;
    this.settings = { music: 0.26, sounds: 0.6, muted: false };
    this._unlockPromise = null;
    this._disposePromise = null;
    this._disposed = false;
    this._wantsMusic = false;
    this._step = 0;
    this._nextBeat = 0;
    this.samples = {};
    this.samplesStatus = "idle";
    this._samplePromise = null;
  }

  async unlock() {
    if (this._disposed) return false;
    if (this._unlockPromise) return this._unlockPromise;
    this._unlockPromise = (async () => {
      try {
        if (!this.context) {
          const context = this.contextFactory();
          this.context = context;
          this.master = context.createGain();
          this.master.connect(context.destination);
          for (const key of ['music', 'sounds']) {
            this.bus[key] = context.createGain();
            this.bus[key].connect(this.master);
          }
          this.configure(this.settings);
        }
        if (this.context.state === 'closed') return false;
        if (this.context.state !== 'running') await this.context.resume();
        if (this._disposed || this.context.state !== 'running') return false;
        await this.preload();
        if (this._disposed || this.context.state !== 'running') return false;
        if (this._wantsMusic) this.start();
        return true;
      } catch {
        // An autoplay rejection is recoverable on the next direct user gesture.
        return false;
      }
    })();
    try { return await this._unlockPromise; }
    finally { this._unlockPromise = null; }
  }

  async preload() {
    if (this._samplePromise && this.samplesStatus !== 'failed') return this._samplePromise;
    if (!this.context?.decodeAudioData || typeof globalThis.fetch !== 'function') return false;
    this.samplesStatus = 'loading';
    this._samplePromise = Promise.all(['ambience','goal','miss'].map(async name => {
      const response = await fetch(`/worldpup/audio/${name}.mp3`, {cache:'force-cache', signal:AbortSignal.timeout(8000)});
      if (!response.ok) throw new Error('Audio asset unavailable');
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      if (!this._disposed) this.samples[name] = buffer;
    })).then(() => {this.samplesStatus='ready';return true;}).catch(() => {this.samplesStatus='failed';return false;});
    return this._samplePromise;
  }

  _sample(name, volume, {bus='sounds',group=name,delay=0,duration}={}) {
    if (!this._ready() || !this.samples[name]) return false;
    const context=this.context, source=context.createBufferSource(), gain=context.createGain();
    source.buffer=this.samples[name];
    const start=context.currentTime+delay, length=Math.min(duration||source.buffer.duration,source.buffer.duration);
    gain.gain.setValueAtTime(0.0001,start);
    gain.gain.linearRampToValueAtTime(volume,start+.06);
    gain.gain.setValueAtTime(volume,start+Math.max(.06,length-.2));
    gain.gain.linearRampToValueAtTime(.0001,start+length);
    source.connect(gain);gain.connect(this.bus[bus]);
    const voice=this._track(source,gain,null,group);
    try {source.start(start);source.stop(start+length);} catch {voice.cleanup();return false;}
    return true;
  }

  _duck(duration) {
    if (!this._ready()) return;
    const gain=this.bus.music.gain,now=this.context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(this.settings.music*.28,now,.035);
    gain.setTargetAtTime(this.settings.music,now+duration,.3);
  }

  configure({ music, sounds, muted } = {}) {
    this.settings = {
      music: clamp(music, this.settings.music),
      sounds: clamp(sounds, this.settings.sounds),
      muted: typeof muted === 'boolean' ? muted : this.settings.muted,
    };
    if (!this.context || this._disposed || this.context.state === 'closed') return;
    const now = this.context.currentTime;
    for (const key of ['music', 'sounds']) {
      const gain = this.bus[key]?.gain;
      if (!gain) continue;
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(this.settings[key], now, 0.012);
    }
    this.master?.gain.cancelScheduledValues(now);
    this.master?.gain.setTargetAtTime(this.settings.muted ? 0 : 0.72, now, 0.008);
  }

  _ready() { return !this._disposed && this.context?.state === 'running'; }

  _track(source, gain, filter, group) {
    const voice = { source, gain, filter, group, cleaned: false };
    voice.cleanup = () => {
      if (voice.cleaned) return;
      voice.cleaned = true;
      this.nodes.delete(voice);
      source.onended = null;
      for (const node of [source, gain, filter]) {
        try { node?.disconnect(); } catch { /* Already disconnected during context shutdown. */ }
      }
    };
    source.onended = voice.cleanup;
    this.nodes.add(voice);
    return voice;
  }

  _stop(group) {
    for (const voice of [...this.nodes]) {
      if (group && voice.group !== group) continue;
      try { voice.source.stop(); } catch { /* A source can already have ended. */ }
      voice.cleanup();
    }
  }

  _tone(frequency, duration, volume, { type = 'triangle', bus = 'sounds', delay = 0, endFrequency, group = 'effect' } = {}) {
    if (!this._ready()) return false;
    const context = this.context;
    const source = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + Math.max(0, delay);
    source.type = type;
    source.frequency.setValueAtTime(frequency, start);
    if (endFrequency) source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.012, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain);
    gain.connect(this.bus[bus]);
    const voice = this._track(source, gain, null, group);
    try { source.start(start); source.stop(start + duration + 0.004); }
    catch { voice.cleanup(); return false; }
    return true;
  }

  _noise(duration, volume, { bus = 'sounds', delay = 0, frequency = 1400, filterType = 'lowpass', group = 'effect', attack = 0.008 } = {}) {
    if (!this._ready()) return false;
    const context = this.context;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const start = context.currentTime + Math.max(0, delay);
    const buffer = context.createBuffer(1, Math.max(1, Math.ceil(context.sampleRate * duration)), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = this.random() * 2 - 1;
    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.setValueAtTime(0.7, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(attack, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.bus[bus]);
    const voice = this._track(source, gain, filter, group);
    try { source.start(start); source.stop(start + duration); }
    catch { voice.cleanup(); return false; }
    return true;
  }

  click() {
    this._stop('click');
    return this._tone(650, 0.075, 0.12, { type: 'sine', endFrequency: 900, group: 'click' });
  }

  dice() {
    this._stop('dice');
    if (!this._ready()) return false;
    for (let i = 0; i < 11; i++) {
      const delay = i * 0.057;
      this._noise(0.045, 0.13 * (1 - i / 20), { delay, frequency: 1350 + i % 3 * 350, group: 'dice' });
      this._tone(240 + i % 4 * 45, 0.043, 0.075, { delay, type: 'sine', endFrequency: 150, group: 'dice' });
    }
    return true;
  }

  card(id) {
    this._stop('card');
    if (!this._ready()) return false;
    const key = String(id ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const options = { group: 'card' };
    this._duck(.8);
    this._noise(0.19, 0.13, { ...options, frequency: 1800 });
    if (key.startsWith('lose10') || key === 'red') {
      [220, 174.6, 130.8].forEach((frequency, i) => this._tone(frequency, 0.3, 0.14, { ...options, delay: 0.12 + i * 0.18 }));
    } else if (key.startsWith('lose5') || key === 'yellow') {
      [293.7, 220].forEach((frequency, i) => this._tone(frequency, 0.23, 0.12, { ...options, delay: 0.12 + i * 0.17 }));
    } else if (key.startsWith('miss')) {
      this._tone(340, 0.45, 0.1, { ...options, delay: 0.12, type: 'sine', endFrequency: 180 });
    } else {
      const notes = key.startsWith('win10') ? [67, 71, 74, 79] : key.startsWith('win5') ? [67, 71, 74] : [67, 74];
      notes.forEach((note, i) => this._tone(midi(note), 0.23, 0.12, { ...options, delay: 0.1 + i * 0.1 }));
    }
    return true;
  }

  kick() {
    this._stop('kick');
    if (!this._ready()) return false;
    this._tone(145, 0.14, 0.3, { type: 'sine', endFrequency: 48, group: 'kick' });
    this._noise(0.08, 0.2, { frequency: 800, group: 'kick' });
    this._noise(0.32, 0.08, { delay: 0.045, frequency: 2000, filterType: 'bandpass', group: 'kick', attack: 0.07 });
    return true;
  }

  _crowd(duration, volume, delay = 0, group = 'goal') {
    this._noise(duration, volume, { delay, frequency: 850, filterType: 'bandpass', group, attack: 0.16 });
    this._noise(duration * 0.82, volume * 0.5, { delay: delay + 0.08, frequency: 1900, filterType: 'bandpass', group, attack: 0.1 });
    for (let i = 0; i < Math.floor(duration / 0.17); i++) {
      this._noise(0.065, volume * 0.8, { delay: delay + i * 0.17, frequency: 2400, group });
    }
  }

  goal() {
    this._stop('goal');this._stop('miss');
    if (!this._ready()) return false;
    this._duck(2.8);
    this._noise(.16,.10,{frequency:1900,group:'goal'});
    if (!this._sample('goal',.85)) this._crowd(2.8,.12,.05,'goal');
    return true;
  }

  miss() {
    this._stop('miss');this._stop('goal');
    if (!this._ready()) return false;
    this._duck(1.6);
    this._noise(.1,.12,{frequency:700,group:'miss'});
    if (!this._sample('miss',.8)) this._noise(1.4,.11,{frequency:600,filterType:'bandpass',group:'miss',attack:.15});
    return true;
  }

  whistle() {
    this._stop('whistle');
    if (!this._ready()) return false;
    // A softened, short referee cue; deliberately avoids a piercing sustained whistle.
    this._tone(1568, 0.14, 0.065, { type: 'sine', endFrequency: 1700, group: 'whistle' });
    this._tone(1568, 0.25, 0.065, { delay: 0.21, type: 'sine', endFrequency: 1480, group: 'whistle' });
    return true;
  }

  win() {
    this._stop('win');this._stop('goal');this._stop('miss');
    if (!this._ready()) return false;
    this._duck(4.9);
    if (!this._sample('goal',.9,{group:'win',duration:4.95})) this._crowd(4.92,.14,0,'win');
    this.whistle();
    return true;
  }

  _musicBeat(step, delay) {
    // A field recording replaces the former 112 BPM melody entirely.
    if (!this._sample('ambience',.65,{bus:'music',group:'music',delay}))
      this._noise(1.2,.055,{bus:'music',group:'music',delay,frequency:750,filterType:'bandpass',attack:.2});
  }

  _musicTick() {
    if (!this._ready() || !this._wantsMusic) return;
    const now = this.context.currentTime;
    // Background tabs can delay timers; skip old beats rather than playing a burst on return.
    if (this._nextBeat < now - 0.3) this._nextBeat = now + 0.02;
    while (this._nextBeat < now + 0.14) {
      this._musicBeat(this._step++, Math.max(0, this._nextBeat - now));
      this._nextBeat += this.samples.ambience ? Math.max(.5,this.samples.ambience.duration-.25) : 1;
    }
  }

  start() {
    if (this._disposed) return false;
    this._wantsMusic = true;
    if (!this._ready()) return false;
    if (this.timer !== null) return true;
    this._nextBeat = this.context.currentTime + 0.02;
    this._musicTick();
    this.timer = this.setIntervalFn(() => this._musicTick(), 50);
    return true;
  }

  pause() {
    this._wantsMusic = false;
    if (this.timer !== null) this.clearIntervalFn(this.timer);
    this.timer = null;
    this._stop();
  }

  preview(bus) {
    this._stop('preview');
    if (!this._ready() || !['music', 'sounds'].includes(bus)) return false;
    if (!this._sample(bus==='music'?'ambience':'goal',.65,{bus,group:'preview',duration:2.5})) this._noise(1,.08,{bus,group:'preview',frequency:800,filterType:'bandpass'});
    return true;
  }

  dispose() {
    if (this._disposePromise) return this._disposePromise;
    this._disposed = true;
    this.pause();
    for (const node of [...Object.values(this.bus), this.master]) {
      try { node?.disconnect(); } catch { /* Context may already be closed. */ }
    }
    this._disposePromise = (async () => {
      try { if (this.context && this.context.state !== 'closed') await this.context.close(); }
      catch { /* Closing an interrupted browser context must not create an unhandled rejection. */ }
    })();
    return this._disposePromise;
  }
}
