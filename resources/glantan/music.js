/* Original, quiet woodland theme: a slow waltz for soft strings and harp.
   Rendered locally once per AudioContext; no downloads or playback timers. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  const RATE = 16000, DURATION = 40, LEVEL = .014, TABLE = 2048, buffers = new WeakMap();
  const harp = Float32Array.from({ length: TABLE }, (_, i) => {
    const phase = i * Math.PI * 2 / TABLE;
    return Math.sin(phase) + .22 * Math.sin(phase * 2) + .07 * Math.sin(phase * 3);
  });
  const strings = Float32Array.from({ length: TABLE }, (_, i) => {
    const phase = i * Math.PI * 2 / TABLE;
    return Math.sin(phase) + .10 * Math.sin(phase * 2) + .035 * Math.sin(phase * 3);
  });
  function synthesizeMusic(sampleRate = RATE) {
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 48000) throw new Error('Invalid music sample rate.');
    const count = Math.round(DURATION * sampleRate), channels = [new Float32Array(count), new Float32Array(count)];
    const lookup = (table, phase) => {
      const index = Math.floor(phase), fraction = phase - index;
      return table[index] + (table[(index + 1) % TABLE] - table[index]) * fraction;
    };
    const note = (at, midi, length, volume, pan, sustained = false) => {
      const start = Math.round(at * sampleRate), samples = Math.round(length * sampleRate);
      const step = 440 * 2 ** ((midi - 69) / 12) * TABLE / sampleRate;
      const left = Math.cos((pan + 1) * Math.PI / 4) * volume, right = Math.sin((pan + 1) * Math.PI / 4) * volume;
      const attack = (sustained ? .8 : .018) * sampleRate, release = (sustained ? 1.1 : .4) * sampleRate;
      const decay = Math.exp(-1 / (sampleRate * (sustained ? 30 : .72))), table = sustained ? strings : harp;
      let phase = 0, shimmer = TABLE * .17, amplitude = 1;
      for (let i = 0; i < samples; i++) {
        const a = Math.min(1, i / attack), r = Math.min(1, (samples - i) / release);
        const envelope = a * a * (3 - 2 * a) * r * r * (3 - 2 * r) * amplitude;
        const value = (lookup(table, phase) + (sustained ? .28 * lookup(table, shimmer) : 0)) * envelope;
        const index = (start + i) % count;
        channels[0][index] += value * left; channels[1][index] += value * right;
        phase = (phase + step) % TABLE; shimmer = (shimmer + step * 1.0015) % TABLE; amplitude *= decay;
      }
    };
    // D(add9), Bm7, Gmaj7, Asus4; the second phrase changes its voicing and
    // leaves more space. No percussion, sharp attacks or insistent ostinato.
    const chords = [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 62, 64],
      [50, 57, 62, 66, 69], [43, 50, 55, 59, 62], [47, 54, 59, 62, 66], [45, 52, 57, 62, 64]];
    const melody = [[0, 74], [2, 71], [5, 69], [7, 76], [8, 78], [11, 76], [13, 71], [15, 69]];
    for (let bar = 0; bar < 16; bar++) {
      const at = bar * 2.5, chord = chords[bar % 8], variation = bar >= 8;
      note(at, chord[0] + 12, 3.8, .15, -.3, true);
      note(at + .18, chord[3], 3.6, .095, .3, true);
      note(at + (bar % 2 ? .42 : .08), chord[variation ? 3 : 2], 2.3, .22, -.23);
      if (bar % 4 !== 3) note(at + 1.45, chord[variation ? 2 : 4], 2.5, .17, .28);
    }
    for (const [bar, midi] of melody) note(bar * 2.5 + .8, midi, 3.7, .095, bar % 2 ? -.12 : .12, true);
    // Wrap note and room tails across the loop boundary instead of fading the
    // whole piece to silence or cutting off its last chord every forty seconds.
    const dry = channels.map(channel => channel.slice());
    for (const [seconds, gain] of [[.185, .16], [.373, .10], [.647, .065]]) {
      const delay = Math.round(seconds * sampleRate);
      for (let i = 0; i < count; i++) {
        const from = (i + count - delay) % count;
        channels[0][i] += dry[1][from] * gain; channels[1][i] += dry[0][from] * gain;
      }
    }
    let peak = 0;
    for (const channel of channels) for (const value of channel) peak = Math.max(peak, Math.abs(value));
    const scale = peak ? .6 / peak : 1;
    for (const channel of channels) for (let i = 0; i < count; i++) channel[i] *= scale;
    return channels;
  }
  function musicBuffer(context) {
    if (!buffers.has(context)) {
      const channels = synthesizeMusic(), buffer = context.createBuffer(2, channels[0].length, RATE);
      channels.forEach((data, channel) => buffer.copyToChannel(data, channel)); buffers.set(context, buffer);
    }
    return buffers.get(context);
  }
  class GladeMusic {
    constructor() { this.context = null; this.active = null; this.tail = null; this.offset = 0; }
    play(context, destination) {
      if (context.state !== 'running') return;
      if (this.context !== context) { this.destroy(); this.context = context; }
      if (this.active) return;
      // A rapid mute/resume cannot leave a stack of fading loops behind it.
      if (this.tail) this.release(this.tail, true);
      let track;
      try {
        const buffer = musicBuffer(context), source = context.createBufferSource(), gain = context.createGain(), now = context.currentTime;
        source.buffer = buffer; source.loop = true; gain.gain.value = 0;
        source.connect(gain); gain.connect(destination);
        track = { source, gain, at: now, offset: this.offset }; this.active = track;
        source.onended = () => this.release(track);
        source.start(now, this.offset); gain.gain.setTargetAtTime(LEVEL, now, .8);
      } catch (_) { if (track) this.release(track, true); }
    }
    stop(immediate = false) {
      if (immediate && this.tail) this.release(this.tail, true);
      const track = this.active;
      if (!track) return;
      const now = this.context.currentTime;
      this.offset = (track.offset + Math.max(0, now - track.at)) % DURATION;
      this.active = null;
      if (immediate) { this.release(track, true); return; }
      this.tail = track;
      track.gain.gain.cancelScheduledValues(now); track.gain.gain.setTargetAtTime(0, now, .02);
      try { track.source.stop(now + .12); } catch (_) { this.release(track); }
    }
    release(track, stop = false) {
      if (this.active === track) this.active = null;
      if (this.tail === track) this.tail = null;
      track.source.onended = null;
      if (stop) { try { track.source.stop(); } catch (_) {} }
      track.source.disconnect(); track.gain.disconnect();
    }
    destroy() { this.stop(true); this.context = null; this.offset = 0; }
  }
  G.synthesizeMusic = synthesizeMusic;
  G.GladeMusic = GladeMusic;
})(globalThis);
