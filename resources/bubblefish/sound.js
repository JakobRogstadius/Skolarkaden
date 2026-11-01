/* Local underwater foley. One cached buffer per cue, played through the
   app's already-unlocked AudioContext; no music, downloads or extra context. */
(function(root) {
  'use strict';
  const SC = root.Starlight = root.Starlight || {};
  const RATE = 24000, TAU = Math.PI * 2, MAX_VOICES = 6, MAX_FOLEY = 3;
  const EMPTY = Object.freeze({});
  const sounds = {
    pick:    { duration: .17, gain: .052, priority: 1, gap: .075, group: 'foley' },
    pop:     { duration: .11, gain: .035, priority: 1, gap: .08, group: 'foley' },
    correct: { duration: .64, gain: .078, priority: 4, gap: .22, group: 'answer' },
    wrong:   { duration: .40, gain: .060, priority: 3, gap: .30, group: 'answer' },
    hit:     { duration: .72, gain: .074, priority: 3, gap: .45, group: 'impact' },
    ball:    { duration: .14, gain: .027, priority: 0, gap: .11, group: 'foley' },
    growth:  { duration: .79, gain: .078, priority: 4, gap: .40, group: 'upgrade' },
    armor:   { duration: .65, gain: .065, priority: 3, gap: .30, group: 'upgrade' },
    smash:   { duration: .57, gain: .080, priority: 2, gap: .20, group: 'impact' },
    gulp:    { duration: .35, gain: .055, priority: 1, gap: .16, group: 'foley' },
    ink:     { duration: .38, gain: .052, priority: 2, gap: .30, group: 'ability' },
    refill:  { duration: .94, gain: .065, priority: 3, gap: .55, group: 'upgrade' },
    agility: { duration: .46, gain: .050, priority: 2, gap: .35, group: 'ability' },
    magnet:  { duration: .94, gain: .058, priority: 3, gap: .60, group: 'upgrade' },
    senses:  { duration: .85, gain: .043, priority: 2, gap: 1.0, group: 'sonar' },
    danger:  { duration: .76, gain: .029, priority: 4, gap: 1.8, group: 'sonar' },
    end:     { duration: 1.02, gain: .057, priority: 5, gap: 1.0, group: 'ending' }
  };
  const groupGaps = Object.freeze({ foley: .04, answer: .10, impact: .10, upgrade: .12, ability: .10, sonar: .65, ending: 1 });
  for (const spec of Object.values(sounds)) Object.freeze(spec);
  Object.freeze(sounds);

  function soundSpec(kind) {
    return typeof kind === 'string' && Object.prototype.hasOwnProperty.call(sounds, kind) ? sounds[kind] : null;
  }
  function seededRandom(kind) {
    let seed = 2166136261;
    for (let i = 0; i < kind.length; i++) seed = Math.imul(seed ^ kind.charCodeAt(i), 16777619);
    return () => {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };
  }
  function envelope(t, length, attack = .004, release = .035) {
    const a = Math.max(0, Math.min(1, t / attack));
    const r = Math.max(0, Math.min(1, (length - t) / release));
    return a * a * (3 - 2 * a) * r * r * (3 - 2 * r);
  }
  function synthesize(kind, sampleRate = RATE) {
    const spec = soundSpec(kind);
    if (!spec) throw new Error('Unknown Bubblefish sound: ' + String(kind));
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 96000) throw new RangeError('Invalid sound sample rate.');
    const data = new Float32Array(Math.ceil(spec.duration * sampleRate));
    const random = seededRandom(kind);
    const add = (at, length, signal) => {
      const start = Math.round(at * sampleRate), end = Math.min(data.length, Math.ceil((at + length) * sampleRate));
      for (let i = start; i < end; i++) data[i] += signal((i - start) / sampleRate);
    };
    // Rounded glides suggest bubbles and elastic fish mouths without voiced
    // speech. A quiet overtone adds body; no square/sawtooth buzz is used.
    const bubble = (at, length, from, to, amp, wobble = 0, decay = 3) => {
      let phase = 0;
      const overtone = Math.max(from, to) * (1 + wobble) * 2 < sampleRate * .44 ? .10 : 0;
      add(at, length, t => {
        const u = Math.min(1, t / length), curve = u * (2 - u);
        const hz = (from + (to - from) * curve) * (1 + wobble * Math.sin(TAU * 9 * t));
        phase += TAU * hz / sampleRate;
        return (Math.sin(phase) + overtone * Math.sin(phase * 2)) * amp * Math.exp(-decay * u) * envelope(t, length);
      });
    };
    const ring = (at, length, hz, amp, shimmer = 0) => {
      add(at, length, t => {
        const u = t / length;
        let value = Math.sin(TAU * hz * t) * Math.exp(-4 * u);
        if (hz * 2.01 < sampleRate * .44) value += .16 * Math.sin(TAU * hz * 2.01 * t) * Math.exp(-8 * u);
        if (hz * 2.76 < sampleRate * .44) value += .055 * Math.sin(TAU * hz * 2.76 * t) * Math.exp(-12 * u);
        return value * amp * (1 - shimmer + shimmer * Math.cos(TAU * 5 * t)) * envelope(t, length, .005, .07);
      });
    };
    // Two gentle low-pass stages bake the water into the sample, so no
    // filters, reverbs or oscillators need to run between game events.
    const wash = (at, length, amp, from = 900, to = from, attack = .008, decay = 3) => {
      const a = 1 - Math.exp(-TAU * Math.min(from, sampleRate * .4) / sampleRate);
      const b = 1 - Math.exp(-TAU * Math.min(to, sampleRate * .4) / sampleRate);
      let low = 0, smooth = 0;
      add(at, length, t => {
        const u = Math.min(1, t / length), alpha = a + (b - a) * u;
        low += alpha * (random() * 2 - 1 - low); smooth += alpha * (low - smooth);
        return (.4 * low + .6 * smooth) * amp * Math.exp(-decay * u) * envelope(t, length, attack, Math.min(.09, length * .4));
      });
    };

    switch (kind) {
      case 'pick': // Ascending plip.
        bubble(.004, .145, 430, 970, .62); break;
      case 'pop':
        bubble(.002, .075, 720, 175, .43, 0, 4.5); wash(.003, .035, .25, 1500); break;
      case 'correct':
        [523.25, 659.25, 783.99, 1046.5].forEach((hz, i) => bubble(.012 + i * .105, .23, hz * .78, hz, .43 - i * .035));
        ring(.34, .27, 1568, .065); break;
      case 'wrong':
        bubble(.008, .33, 305, 105, .61, .025, 1.8); wash(.03, .17, .10, 440); break;
      case 'hit':
        wash(.005, .20, .35, 1050, 450); bubble(.004, .15, 175, 90, .36);
        [610, 460, 330, 225].forEach((hz, i) => bubble(.045 + i * .145, .20, hz, hz * .55, .40 - i * .055, .13)); break;
      case 'ball':
        bubble(.003, .105, 790, 1090, .42, 0, 4); ring(.004, .11, 1510, .055); break;
      case 'growth': // Each gulp grows longer and deeper as the fish expands.
        wash(.01, .55, .16, 650, 270, .06, 1.3);
        bubble(.008, .15, 300, 145, .27, .05);
        bubble(.17, .20, 230, 100, .39, .07);
        bubble(.39, .33, 165, 62, .55, .11, 1.7); break;
      case 'armor':
        [830, 1030, 1320, 1660].forEach((hz, i) => {
          ring(.012 + i * .075, .33, hz, .32 - i * .035);
          wash(.012 + i * .075, .032, .13, 1800);
        }); break;
      case 'smash':
        wash(.003, .14, .82, 1600, 650, .003, 4); bubble(.004, .22, 155, 58, .40, 0, 4);
        for (let i = 0; i < 5; i++) {
          const at = .055 + i * .075;
          wash(at, .15, .43 / (1 + i * .45), 1100 - i * 130, 400, .003, 4);
          ring(at, .11, 210 + i * 47, .10 / (1 + i));
        }
        break;
      case 'gulp':
        bubble(.004, .12, 235, 105, .48, .04); bubble(.14, .17, 185, 80, .40, .06);
        wash(.018, .05, .18, 750); wash(.16, .055, .17, 600); break;
      case 'ink':
        wash(.008, .29, .62, 1700, 420, .025, 2);
        bubble(.005, .15, 180, 380, .17, .04); bubble(.19, .14, 440, 150, .25); break;
      case 'refill':
        wash(.005, .82, .20, 380, 1300, .08, .8);
        for (let i = 0; i < 8; i++) {
          const hz = 230 + i * 86;
          bubble(.025 + i * .098, .18, hz * .72, hz, .28 - i * .012, .025);
        }
        break;
      case 'agility':
        wash(.006, .39, .70, 320, 2200, .075, 1);
        bubble(.025, .28, 135, 360, .13, 0, 1); bubble(.30, .11, 650, 870, .12); break;
      case 'magnet':
        [392, 588, 784].forEach((hz, i) => ring(.012 + i * .065, .71, hz, .26 - i * .035, .18));
        bubble(.26, .17, 950, 1160, .10); bubble(.43, .18, 1180, 1390, .07); break;
      case 'senses':
        bubble(.012, .34, 660, 645, .40, 0, 2); bubble(.39, .33, 660, 645, .17, 0, 2.5); break;
      case 'danger':
        bubble(.012, .24, 370, 325, .39, 0, 2); bubble(.34, .29, 340, 300, .29, 0, 2.3); break;
      case 'end':
        [370, 285, 210, 145].forEach((hz, i) => bubble(.015 + i * .19, .23 + i * .04, hz, hz * .56, .43 - i * .065, .035));
        wash(.06, .84, .13, 600, 240, .1, 2); break;
    }
    // DC removal, a soft ceiling and quiet edges are baked once into each
    // buffer. Separate playback gains keep warning/ball cues unobtrusive.
    const dcAlpha = 1 - Math.exp(-TAU * 18 / sampleRate);
    let dc = 0, peak = 0;
    for (let i = 0; i < data.length; i++) {
      dc += dcAlpha * (data[i] - dc);
      const value = Math.tanh(data[i] - dc) * envelope(i / sampleRate, spec.duration, .003, .045);
      data[i] = value; peak = Math.max(peak, Math.abs(value));
    }
    const scale = peak ? .78 / peak : 1;
    for (let i = 0; i < data.length; i++) data[i] *= scale;
    data[0] = data[data.length - 1] = 0;
    return data;
  }

  class BubblefishAudio {
    constructor(sharedSounds) {
      this.shared = sharedSounds; this.context = null; this.bus = null;
      this.buffers = new Map(); this.voices = new Set();
      this.last = new Map(); this.groupLast = new Map();
      this.mix = { enabled: true, playing: true }; this.disposed = false;
      this.onStateChange = () => { if (this.context?.state !== 'running') this.stop(); };
    }
    setMix(options = EMPTY) {
      if (this.disposed) return;
      if (options.enabled !== undefined) this.mix.enabled = !!options.enabled;
      if (options.playing !== undefined) this.mix.playing = !!options.playing;
      // This can be called each frame: mutate the two flags in place, with
      // no new objects, synthesis, graph creation or automation scheduling.
      if (!(this.mix.enabled && this.mix.playing) && (this.voices.size || this.last.size)) this.stop();
    }
    ensureContext() {
      const context = this.shared?.context;
      if (context !== this.context) this.releaseGraph();
      // The app owns unlock/resume/close. Never queue cues while suspended.
      if (!context || context.state !== 'running') { this.stop(); return false; }
      if (this.bus) return true;
      try {
        this.context = context; this.bus = context.createGain();
        this.bus.gain.value = 1; this.bus.connect(context.destination);
        context.addEventListener?.('statechange', this.onStateChange);
        return true;
      } catch (_) { this.releaseGraph(); return false; }
    }
    buffer(kind) {
      let buffer = this.buffers.get(kind);
      if (!buffer) {
        const samples = synthesize(kind), context = this.context;
        buffer = context.createBuffer(1, samples.length, RATE);
        buffer.copyToChannel(samples, 0); this.buffers.set(kind, buffer);
      }
      return buffer;
    }
    play(kind, { x = .5 } = EMPTY) {
      const spec = soundSpec(kind);
      if (!spec || this.disposed || !this.mix.enabled || !this.mix.playing || !this.ensureContext()) return false;
      const context = this.context, now = context.currentTime;
      // Reclaim expired sources even if an onended event has been delayed.
      let routine = 0, victim = null;
      for (const voice of this.voices) {
        if (voice.until <= now) { this.releaseVoice(voice, true); continue; }
        if (voice.priority <= 1) routine++;
        if (!victim || voice.priority < victim.priority || (voice.priority === victim.priority && voice.at < victim.at)) victim = voice;
      }
      if (now - (this.last.get(kind) ?? -Infinity) < spec.gap) return false;
      const previous = this.groupLast.get(spec.group);
      // A warning/reward may interrupt a lower-priority cue in its group.
      if (previous && now - previous.at < groupGaps[spec.group] && previous.priority >= spec.priority) return false;
      if (spec.priority <= 1 && routine >= MAX_FOLEY) return false;
      if (this.voices.size >= MAX_VOICES && (!victim || victim.priority >= spec.priority)) return false;
      let source = null, gain = null, panner = null, voice = null;
      try {
        const buffer = this.buffer(kind);
        source = context.createBufferSource(); gain = context.createGain();
        source.buffer = buffer; gain.gain.value = spec.gain;
        source.connect(gain);
        if (typeof context.createStereoPanner === 'function') {
          panner = context.createStereoPanner();
          panner.pan.value = (Math.max(0, Math.min(1, Number.isFinite(x) ? x : .5)) * 2 - 1) * .75;
          gain.connect(panner); panner.connect(this.bus);
        } else gain.connect(this.bus);
        if (this.voices.size >= MAX_VOICES) this.releaseVoice(victim, true);
        // First-use synthesis takes time: measure the actual start after it,
        // so expired-voice cleanup cannot clip the end of a fresh buffer.
        const at = context.currentTime;
        voice = { source, gain, panner, priority: spec.priority, at, until: at + buffer.duration };
        this.voices.add(voice); source.onended = () => this.releaseVoice(voice);
        source.start(at); this.last.set(kind, at);
        if (previous) { previous.at = at; previous.priority = spec.priority; }
        else this.groupLast.set(spec.group, { at, priority: spec.priority });
        return true;
      } catch (_) {
        if (voice) this.releaseVoice(voice, true);
        else {
          // Also clean up a partially constructed graph (e.g. panner failure).
          if (source) { source.onended = null; try { source.stop(); } catch (_) {} source.disconnect(); }
          gain?.disconnect(); panner?.disconnect();
        }
        return false;
      }
    }
    releaseVoice(voice, stop = false) {
      if (!this.voices.delete(voice)) return;
      voice.source.onended = null;
      if (stop) { try { voice.source.stop(); } catch (_) {} }
      voice.source.disconnect(); voice.gain.disconnect(); voice.panner?.disconnect();
    }
    stop() {
      // Disconnect immediately: no tails or deferred callbacks can survive a
      // pause/mute, and no timer or animation loop is required for cleanup.
      for (const voice of this.voices) this.releaseVoice(voice, true);
      this.last.clear(); this.groupLast.clear();
    }
    releaseGraph() {
      this.stop();
      this.context?.removeEventListener?.('statechange', this.onStateChange);
      this.bus?.disconnect(); this.bus = null; this.context = null; this.buffers.clear();
    }
    destroy() {
      if (this.disposed) return;
      this.releaseGraph(); this.shared = null; this.disposed = true;
    }
  }
  SC.synthesizeBubblefishSound = synthesize;
  SC.bubblefishSoundSpecs = sounds;
  SC.BubblefishAudio = BubblefishAudio;
})(globalThis);
