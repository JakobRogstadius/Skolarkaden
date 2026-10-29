/* Local moss-and-brass sound design. Cached foley and resonant instruments,
   mixed through Skolarkaden's existing AudioContext; never a second context. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  const RATE = 24000, TAU = Math.PI * 2;
  const sounds = {
    correct:     { duration: .27, gain: .043, priority: 3, gap: .10, group: 'answer' },
    wrong:       { duration: .43, gain: .048, priority: 3, gap: .25, group: 'answer' },
    build:       { duration: 1.12, gain: .12, priority: 4, gap: .18, group: 'purchase' },
    recruit:     { duration: 1.02, gain: .105, priority: 4, gap: .18, group: 'purchase' },
    research:    { duration: 1.65, gain: .10, priority: 4, gap: .18, group: 'purchase' },
    bounty:      { duration: .52, gain: .085, priority: 3, gap: .18, group: 'purchase' },
    resurrect:   { duration: 1.75, gain: .115, priority: 5, gap: .18, group: 'purchase' },
    warrior:     { duration: .34, gain: .073, priority: 1, gap: .15, group: 'combat', variants: 3 },
    ranger:      { duration: .44, gain: .068, priority: 1, gap: .19, group: 'combat', variants: 3 },
    mage:        { duration: .80, gain: .062, priority: 2, gap: .25, group: 'combat', variants: 3 },
    heal:        { duration: .94, gain: .055, priority: 2, gap: .45, group: 'heal', variants: 3 },
    monster:     { duration: .38, gain: .061, priority: 1, gap: .23, group: 'combat', variants: 3 },
    guardian:    { duration: .92, gain: .095, priority: 2, gap: .65, group: 'guardian', variants: 3 },
    awaken:      { duration: 1.85, gain: .12, priority: 5, gap: 2, group: 'warning' },
    wave:        { duration: 1.10, gain: .095, priority: 4, gap: 2.6, group: 'warning' },
    'lair-down': { duration: 1.85, gain: .13, priority: 5, gap: .5, group: 'landmark' },
    'hero-down': { duration: 1.00, gain: .095, priority: 4, gap: .8, group: 'loss' },
    level:       { duration: 1.12, gain: .085, priority: 3, gap: .6, group: 'level' },
    bell:        { duration: 3.60, gain: .15, priority: 6, gap: 1.8, group: 'bell' },
    victory:     { duration: 2.70, gain: .125, priority: 7, gap: 1, group: 'ending' },
    defeat:      { duration: 2.30, gain: .105, priority: 7, gap: 1, group: 'ending' }
  };
  function seededRandom(seed) {
    let n = 2166136261;
    for (const c of seed) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return () => { n = Math.imul(n ^ n >>> 15, 2246822519); n = Math.imul(n ^ n >>> 13, 3266489917); return (n >>> 0) / 4294967296; };
  }
  function synthesize(kind, sampleRate = RATE, variant = 0) {
    const spec = sounds[kind];
    if (!spec) throw new Error('Unknown Klockgläntan sound: ' + kind);
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 96000) throw new Error('Invalid sound sample rate.');
    const data = new Float32Array(Math.ceil(sampleRate * spec.duration));
    const random = seededRandom(kind + ':' + variant), pitch = 1 + (random() - .5) * .055;
    const add = (at, length, signal) => {
      const start = Math.max(0, Math.round(at * sampleRate)), end = Math.min(data.length, Math.ceil((at + length) * sampleRate));
      for (let i = start; i < end; i++) data[i] += signal((i - start) / sampleRate, (i - start) / (end - start));
    };
    const envelope = (t, length, attack = .008, release = .05) => {
      const a = Math.min(1, t / attack), r = Math.max(0, Math.min(1, (length - t) / release));
      return Math.sin(a * Math.PI / 2) ** 2 * Math.sin(r * Math.PI / 2) ** 2;
    };
    const modal = (at, length, hz, amp, material = 'brass', damping = 1) => {
      const ratios = material === 'wood' ? [1, 2.41, 3.93, 5.43] : material === 'glass' ? [1, 2.76, 5.40, 8.93] : [1, 2.008, 2.756, 3.95, 5.12, 6.37];
      const weights = material === 'wood' ? [1, .30, .11, .035] : [.73, .28, .14, .064, .027, .012];
      const fundamental = hz * pitch;
      add(at, length, t => {
        let value = 0;
        for (let k = 0; k < ratios.length; k++) {
          const f = fundamental * ratios[k];
          if (f > sampleRate * .44) continue;
          const decay = Math.exp(-t * (3.7 + k * (material === 'wood' ? 3 : 1.6)) / (length * damping));
          const beat = material === 'brass' ? .86 + .14 * Math.cos(TAU * (1.2 + k * .43) * t) : 1;
          value += Math.sin(TAU * f * t) * weights[k] * decay * beat;
        }
        return value * amp * envelope(t, length, material === 'wood' ? .002 : .004, .07);
      });
    };
    const air = (at, length, amp, cutoff = 1400, attack = .015, decay = 2.2, high = false) => {
      const alpha = 1 - Math.exp(-TAU * Math.min(cutoff, sampleRate * .4) / sampleRate);
      let low = 0, dc = 0;
      add(at, length, t => {
        const n = (random() + random() + random()) * (2 / 3) - 1;
        low += alpha * (n - low); dc += .002 * (low - dc);
        return (high ? n - low : low - dc) * amp * Math.exp(-decay * t / length) * envelope(t, length, attack, Math.min(.12, length * .3));
      });
    };
    const tone = (at, length, start, end, amp, breath = false) => {
      let phase = 0;
      add(at, length, t => {
        const u = t / length, f = (start + (end - start) * u) * pitch;
        phase += TAU * f / sampleRate;
        const texture = breath ? .11 * Math.sin(phase * .5) + .08 * Math.sin(phase * 3) : .16 * Math.sin(phase * 2);
        return (Math.sin(phase) + texture) * amp * envelope(t, length, Math.min(.12, length * .2), Math.min(.24, length * .4));
      });
    };
    switch (kind) {
      case 'correct':
        modal(.005, .23, 740, .40, 'wood'); modal(.025, .21, 1110, .13, 'glass'); break;
      case 'wrong':
        modal(.005, .28, 246.94, .40, 'wood'); modal(.105, .29, 220, .24, 'wood'); break;
      case 'build':
        [.025, .18, .36].forEach((t, i) => { modal(t, .19, 165 + i * 42, .72 - i * .10, 'wood'); air(t, .055, .52, 1700); });
        air(.25, .52, .20, 700, .07); modal(.53, .53, 587, .29); break;
      case 'recruit':
        air(.02, .27, .25, 1100, .035); modal(.055, .16, 260, .34, 'wood');
        modal(.15, .65, 392, .50); modal(.29, .63, 588, .21); break;
      case 'research':
        air(0, .55, .13, 1600, .12);
        [293.66, 440, 587.33].forEach((f, i) => modal(.07 + i * .17, 1.06, f, .42 - i * .055, 'glass', 1.3)); break;
      case 'bounty':
        modal(.01, .13, 240, .54, 'wood'); air(.03, .08, .30, 1600);
        modal(.10, .35, 880, .29, 'brass'); break;
      case 'resurrect':
        air(0, .85, .24, 1500, .2, .7); tone(.02, .75, 164, 220, .16);
        [293.66, 440, 587.33].forEach((f, i) => modal(.35 + i * .18, .96, f, .34 - i * .035, 'glass', 1.5)); break;
      case 'warrior':
        air(0, .10, .27, 2500, .009); air(.07, .12, .60, 2600, .003);
        modal(.07, .12, 180, .47, 'wood'); modal(.073, .25, 930, .19, 'brass'); break;
      case 'ranger':
        tone(.003, .14, 360, 145, .35); modal(.005, .18, 740, .22, 'wood');
        air(.055, .26, .31, 2600, .03, 2.1, true); break;
      case 'mage':
        air(0, .23, .25, 1800, .055); modal(.10, .66, 392, .46, 'glass');
        modal(.16, .48, 590, .16, 'glass'); tone(.015, .17, 165, 330, .08); break;
      case 'heal':
        air(.015, .45, .19, 900, .08, 1.5); modal(.05, .62, 587, .34, 'glass', 1.3);
        modal(.23, .66, 880, .19, 'glass', 1.4); break;
      case 'monster':
        air(.005, .16, .69, 1100, .004); modal(.015, .20, 106, .54, 'wood');
        modal(.035, .27, 610, .12); break;
      case 'guardian':
        tone(.015, .59, 98, 63, .34, true); air(0, .62, .42, 480, .035, 1.4);
        modal(.12, .64, 160, .33, 'brass'); modal(.18, .24, 85, .31, 'wood'); break;
      case 'awaken':
        tone(.035, 1.15, 110, 103, .27, true); tone(.14, 1.12, 155.56, 146.83, .12, true);
        air(.035, .85, .24, 800, .14, 1.1); modal(.82, .95, 196, .29, 'brass', 1.5); break;
      case 'wave':
        [.025, .24].forEach((t, i) => { modal(t, .30, 108 - i * 12, .60, 'wood'); air(t, .14, .35, 500, .005); });
        tone(.12, .70, 146.83, 138.59, .21, true); break;
      case 'lair-down':
        air(0, .88, .52, 650, .008, 1.4); air(.08, .40, .31, 2200, .035);
        [0, .12, .26, .43].forEach((t, i) => modal(t, .20, 115 + i * 47, .36 / (1 + i * .2), 'wood'));
        [293.66, 440, 587.33].forEach((f, i) => modal(.31 + i * .16, 1.12, f, .26 - i * .035, 'brass', 1.4)); break;
      case 'hero-down':
        air(.005, .30, .34, 700, .018); modal(.015, .21, 110, .31, 'wood');
        modal(.13, .72, 293.66, .37, 'brass'); modal(.31, .64, 220, .22, 'brass'); break;
      case 'level':
        [392, 493.88, 587.33].forEach((f, i) => modal(.025 + i * .11, .77, f, .38 - i * .045, 'brass', 1.3)); break;
      case 'bell':
        modal(.015, 3.45, 146.83, .66, 'brass', 1.7); modal(.025, 2.80, 392, .15, 'brass', 1.4);
        modal(.035, .19, 180, .24, 'wood'); air(.018, .09, .14, 2700, .003); break;
      case 'victory':
        [293.66, 369.99, 440, 587.33].forEach((f, i) => modal(.03 + i * .21, 1.83, f, .35 - i * .028, 'brass', 1.5));
        modal(.67, 1.85, 146.83, .17, 'brass', 1.4); break;
      case 'defeat':
        modal(.015, 1.90, 196, .46, 'brass', 1.4); modal(.42, 1.76, 146.83, .24, 'brass', 1.5);
        air(.10, .55, .17, 500, .08); break;
    }
    // A little room response is baked into important resonant sounds. No
    // convolver runs forever, and stopping an effect also stops its tail.
    if (spec.priority >= 3) {
      const dry = data.slice();
      for (const [seconds, gain] of [[.043, .075], [.079, .050], [.127, .032]]) {
        const delay = Math.round(seconds * sampleRate);
        for (let i = delay; i < data.length; i++) data[i] += dry[i - delay] * gain;
      }
    }
    // DC removal, soft limiting and a smooth final edge prevent clicks. The
    // mix gains above retain the hierarchy between foley and strategic cues.
    let dc = 0, peak = 0;
    for (let i = 0; i < data.length; i++) {
      dc += .0008 * (data[i] - dc);
      const t = i / sampleRate, edge = envelope(t, spec.duration, .002, .055);
      const value = Math.tanh((data[i] - dc) * 1.25) * edge;
      data[i] = value; peak = Math.max(peak, Math.abs(value));
    }
    const scale = peak ? .82 / peak : 1;
    for (let i = 0; i < data.length; i++) data[i] *= scale;
    data[0] = data[data.length - 1] = 0;
    return data;
  }
  class Soundscape {
    constructor(sharedSounds) {
      this.shared = sharedSounds; this.context = null; this.bus = null; this.compressor = null;
      this.buffers = new Map(); this.voices = new Set(); this.last = new Map(); this.serial = 0;
      this.mix = { enabled: true, playing: true, duck: 1, listener: null, radius: 12 };
      this.disposed = false;
    }
    setMix(options = {}) {
      if (this.disposed) return;
      const wasAudible = this.mix.enabled && this.mix.playing;
      this.mix = { ...this.mix, ...options };
      this.mix.duck = G.clamp(Number.isFinite(this.mix.duck) ? this.mix.duck : 1, 0, 1);
      this.mix.radius = Math.max(1, Number.isFinite(this.mix.radius) ? this.mix.radius : 12);
      if (!(this.mix.enabled && this.mix.playing)) { if (wasAudible || this.voices.size) this.stop(); return; }
      if (this.bus && this.context?.state !== 'closed') {
        const gain = this.bus.gain, now = this.context.currentTime;
        gain.cancelScheduledValues(now); gain.setTargetAtTime(this.mix.duck, now, .025);
      }
    }
    ensureContext() {
      const context = this.shared?.context;
      // Unlock belongs to the app's user gesture. Suspended contexts never
      // accumulate delayed combat sounds to burst out on the next tap.
      if (!context || context.state !== 'running') return false;
      if (context === this.context && this.bus) return true;
      this.releaseGraph(); this.context = context;
      const bus = this.bus = context.createGain(); bus.gain.value = this.mix.duck;
      if (context.createDynamicsCompressor) {
        const compressor = this.compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -20; compressor.knee.value = 16; compressor.ratio.value = 3;
        compressor.attack.value = .006; compressor.release.value = .16;
        bus.connect(compressor); compressor.connect(context.destination);
      } else bus.connect(context.destination);
      return true;
    }
    buffer(kind, variant) {
      const key = kind + ':' + variant;
      if (!this.buffers.has(key)) {
        const samples = synthesize(kind, RATE, variant), buffer = this.context.createBuffer(1, samples.length, RATE);
        buffer.copyToChannel(samples, 0); this.buffers.set(key, buffer);
      }
      return this.buffers.get(key);
    }
    play(kind, point = {}) {
      const spec = sounds[kind];
      if (!spec || this.disposed || !this.mix.enabled || !this.mix.playing || this.mix.duck <= 0 || !this.ensureContext()) return false;
      const context = this.context, now = context.currentTime;
      // Clean up ended sounds even if a browser has delayed the onended task.
      for (const voice of this.voices) if (voice.until <= now) this.releaseVoice(voice);
      const elapsed = now - (this.last.get(kind) ?? -Infinity);
      if (elapsed < spec.gap) return false;
      if (spec.group === 'combat' && now - (this.last.get('@combat') ?? -Infinity) < .115) return false;
      if (spec.group === 'warning' && now - (this.last.get('@warning') ?? -Infinity) < 1.8) return false;
      const important = !!point.important || spec.priority >= 4;
      let attenuation = 1, pan = 0;
      if (this.mix.listener && Number.isFinite(point.x) && Number.isFinite(point.y)) {
        const dx = point.x - this.mix.listener.x, dy = point.y - this.mix.listener.y, distance = Math.hypot(dx, dy), radius = this.mix.radius;
        if (!important && distance >= radius * 1.3) return false;
        const localGain = 1 / (1 + (distance / (radius * .58)) ** 2);
        attenuation = important ? Math.max(.58, localGain) : localGain;
        pan = G.clamp(dx / radius, -.85, .85) * (important ? .5 : 1);
      }
      // Eight sources are the hard ceiling; at most four routine combat/leaf
      // sounds overlap. A bell or warning displaces a quiet strike, never vice versa.
      const routine = [...this.voices].filter(v => v.priority < 3);
      if (spec.priority < 3 && routine.length >= 4) return false;
      if (this.voices.size >= 8) {
        const victim = [...this.voices].sort((a, b) => a.priority - b.priority || a.gain - b.gain || a.at - b.at)[0];
        if (victim.priority >= spec.priority) return false;
        this.releaseVoice(victim, true);
      }
      let voice;
      try {
        const variant = (this.serial++) % (spec.variants || 1), buffer = this.buffer(kind, variant);
        const source = context.createBufferSource(), gain = context.createGain();
        source.buffer = buffer;
        source.playbackRate.value = spec.priority < 3 ? .98 + variant * .02 : 1;
        gain.gain.value = spec.gain * attenuation;
        source.connect(gain);
        const panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
        if (panner) { panner.pan.value = pan; gain.connect(panner); panner.connect(this.bus); }
        else gain.connect(this.bus);
        voice = { source, node: gain, panner, kind, at: now, until: now + spec.duration / source.playbackRate.value + .05, priority: spec.priority, gain: gain.gain.value };
        this.voices.add(voice); source.onended = () => this.releaseVoice(voice);
        source.start(now); this.last.set(kind, now); this.last.set('@' + spec.group, now);
        return true;
      } catch (_) {
        if (voice) this.releaseVoice(voice, true);
        return false;
      }
    }
    releaseVoice(voice, stop = false) {
      if (!this.voices.delete(voice)) return;
      voice.source.onended = null;
      if (stop) { try { voice.source.stop(); } catch (_) {} }
      voice.source.disconnect(); voice.node.disconnect(); voice.panner?.disconnect();
    }
    stop() {
      for (const voice of [...this.voices]) this.releaseVoice(voice, true);
      this.last.clear();
    }
    releaseGraph() {
      this.stop(); this.bus?.disconnect(); this.compressor?.disconnect();
      this.bus = this.compressor = null; this.context = null; this.buffers.clear();
    }
    destroy() {
      this.releaseGraph(); this.shared = null; this.disposed = true;
    }
  }
  G.synthesizeSound = synthesize;
  G.soundSpecs = sounds;
  G.Soundscape = Soundscape;
})(globalThis);
