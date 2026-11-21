// All sound is synthesized with the Web Audio API — no audio files, no
// network. Short blips and filtered noise make footsteps, a pebble's clatter,
// a gem's chime and the alarm sting. The game calls these; the browser's
// autoplay rules mean audio starts on the first user gesture.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._lastStepAt = 0;
  }

  // Create the audio context lazily, on the first gesture that asks for sound.
  ensure() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  // A short sine blip: frequency slides from `from` to `to` over `seconds`.
  _blip(from, to, seconds, volume, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + seconds);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  // A burst of filtered noise, for footsteps and the pebble's clatter.
  _noise(seconds, volume, filterFreq, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
  }

  // A footstep: quieter and higher when sneaking, louder when running.
  // `loudness` is 0..1; callers throttle how often they call this.
  footstep(loudness) {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this._lastStepAt < 140) return;
    this._lastStepAt = now;
    this._noise(0.07, 0.10 + 0.22 * loudness, 500 + 900 * loudness);
  }

  // A guard's boot, pitched lower and heard only when the guard is near.
  guardStep(distance) {
    if (!this.ctx) return;
    const volume = Math.max(0, 0.22 * (1 - distance / 320));
    if (volume <= 0.01) return;
    this._noise(0.09, volume, 320);
  }

  pebbleThrow() {
    this._blip(700, 900, 0.08, 0.12);
  }

  pebbleLand() {
    this._noise(0.12, 0.3, 1800);
    this._blip(1200, 500, 0.1, 0.1, 0.02);
  }

  gemPickup() {
    this._blip(880, 880, 0.09, 0.18);
    this._blip(1318, 1318, 0.14, 0.18, 0.08);
  }

  // A rising two-note sting when a guard spots the thief.
  alarm() {
    this._blip(320, 520, 0.22, 0.25);
    this._blip(520, 780, 0.25, 0.25, 0.16);
  }

  // A soft questioning note when a guard grows suspicious.
  suspicious() {
    this._blip(440, 620, 0.16, 0.14);
  }

  caught() {
    this._blip(520, 110, 0.5, 0.28);
    this._noise(0.4, 0.2, 400, 0.05);
  }

  levelClear() {
    [523, 659, 784, 1046].forEach((freq, i) => this._blip(freq, freq, 0.16, 0.16, i * 0.1));
  }
}
