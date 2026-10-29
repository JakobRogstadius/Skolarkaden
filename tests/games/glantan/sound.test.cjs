'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const context = vm.createContext({ console, Float32Array, Math, Starlight: { Glantan: { clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) } } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../../resources/glantan/sound.js'), 'utf8'), context);
const G = context.Starlight.Glantan;
const rms = data => Math.sqrt(data.reduce((n, v) => n + v * v, 0) / data.length);
const waves = new Map();
for (const [kind, spec] of Object.entries(G.soundSpecs)) {
  const data = G.synthesizeSound(kind);
  assert.equal(data.length, Math.ceil(24000 * spec.duration));
  assert(data.every(Number.isFinite), kind + ' contains finite samples');
  assert.equal(data[0], 0); assert.equal(data.at(-1), 0);
  const peak = data.reduce((n, v) => Math.max(n, Math.abs(v)), 0), power = rms(data);
  assert(peak > .80 && peak <= .821, kind + ' retains safe headroom');
  assert(power > .025 && power < .37, kind + ' has audible content without sustained clipping');
  assert(Math.abs(data.reduce((n, v) => n + v, 0) / data.length) < .003, kind + ' has no DC bias');
  assert(rms(data.slice(-240)) < .008, kind + ' fades its final 10ms');
  assert.deepEqual(data, G.synthesizeSound(kind), kind + ' synthesis is deterministic');
  waves.set(kind, data);
}
assert.throws(() => G.synthesizeSound('bogus'));
assert.throws(() => G.synthesizeSound('bell', NaN));
for (const kind of ['warrior', 'ranger', 'mage', 'heal', 'monster', 'guardian']) {
  assert.notDeepEqual(G.synthesizeSound(kind, 24000, 0), G.synthesizeSound(kind, 24000, 1), kind + ' has nonidentical variations');
}
assert(rms(waves.get('bell').slice(24000, 48000)) > .02, 'storm bell retains a resonant decay');
console.log('PASS all 21 authored effects: deterministic waveform, headroom, DC, fade, variation and bell decay.');

function param(value = 0) {
  return { value, cancelScheduledValues() {}, setTargetAtTime(value) { this.value = value; } };
}
class AudioContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; this.nodes = []; this.sources = []; this.buffers = []; }
  node(extra = {}) { const node = { ...extra, disconnected: false, connect(target) { this.target = target; }, disconnect() { this.disconnected = true; } }; this.nodes.push(node); return node; }
  createGain() { return this.node({ gain: param(1) }); }
  createDynamicsCompressor() { return this.node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }); }
  createStereoPanner() { return this.node({ pan: param() }); }
  createBufferSource() {
    const node = this.node({ playbackRate: param(1), start() { this.started = true; }, stop() { this.stopped = true; } }); this.sources.push(node); return node;
  }
  createBuffer(channels, count, sampleRate) {
    const buffer = { channels, sampleRate, data: new Float32Array(count), copyToChannel(data) { this.data.set(data); } }; this.buffers.push(buffer); return buffer;
  }
}
const shared = { context: null }, mixer = new G.Soundscape(shared);
assert.equal(mixer.play('bell'), false); assert.equal(shared.context, null, 'never create another AudioContext');
const c = shared.context = new AudioContext(); c.state = 'suspended';
assert.equal(mixer.play('bell'), false, 'never queue suspended playback'); assert.equal(c.sources.length, 0);
c.state = 'running';
mixer.setMix({ listener: { x: 20, y: 20 }, radius: 10 });
assert.equal(mixer.play('warrior', { x: 16, y: 20 }), true);
const left = [...mixer.voices][0]; assert(left.panner.pan.value < 0);
c.currentTime += .3; assert(mixer.play('ranger', { x: 24, y: 20 }));
const right = [...mixer.voices].find(v => v.kind === 'ranger'); assert(right.panner.pan.value > 0);
assert.equal(mixer.play('mage', { x: 50, y: 20 }), false, 'offscreen combat is culled');
assert(mixer.play('awaken', { x: 50, y: 20, important: true }), 'strategic warning remains audible offscreen');
assert.equal(mixer.play('awaken'), false, 'a warning is not repeated every tick');
mixer.setMix({ duck: .23 }); assert.equal(mixer.bus.gain.value, .23, 'speech ducks the full bus, including existing tails');
mixer.setMix({ enabled: false }); assert.equal(mixer.voices.size, 0); assert(c.sources.every(s => s.stopped && s.disconnected));
assert.equal(mixer.play('bell'), false); assert.equal(mixer.play('correct'), false);
mixer.setMix({ enabled: true, playing: true, duck: 1 });
assert(mixer.play('bell')); const firstBuffer = c.sources.at(-1).buffer;
mixer.stop(); assert(mixer.play('bell')); assert.equal(c.sources.at(-1).buffer, firstBuffer, 'stopping and replaying uses cached waveforms');
const ringing = c.sources.at(-1); ringing.onended(); assert(ringing.disconnected); assert.equal(mixer.voices.size, 0);
assert(mixer.play('correct')); mixer.setMix({ playing: false }); assert.equal(mixer.voices.size, 0);
c.currentTime += 10; assert.equal(mixer.play('monster'), false, 'pause never schedules new sound');
mixer.setMix({ playing: true }); assert(mixer.play('correct')); mixer.stop();
assert.equal(mixer.voices.size, 0);
console.log('PASS shared context, unlock, spatial culling and panning, speech ducking, mute, pause and cached replay.');

// Simulate a large fight and simultaneous building/level/warning activity.
const battle = new G.Soundscape(shared); battle.setMix({ listener: { x: 0, y: 0 }, radius: 10 });
const combat = ['warrior', 'mage', 'monster', 'ranger', 'heal', 'guardian'];
let accepted = 0, maxVoices = 0;
for (let tick = 0; tick < 300; tick++) {
  c.currentTime = 20 + tick * .02;
  for (let n = 0; n < 30; n++) accepted += battle.play(combat[(tick + n) % combat.length], { x: n % 9, y: 1 }) ? 1 : 0;
  maxVoices = Math.max(maxVoices, battle.voices.size);
  assert([...battle.voices].filter(v => v.priority < 3).length <= 4);
  assert(battle.voices.size <= 8);
}
assert(accepted < 70, '9000 combat events produce a restrained mix');
assert(battle.play('correct', { important: true }), 'combat cannot swallow correct-answer feedback');
for (const kind of ['build', 'level', 'hero-down', 'research', 'bell']) {
  c.currentTime += .01; battle.play(kind, { important: true }); assert(battle.voices.size <= 8);
}
assert([...battle.voices].some(v => v.kind === 'bell'), 'storm bell wins priority over routine activity');
battle.stop(); assert.equal(battle.voices.size, 0);
const oldBus = battle.bus, oldBuffers = battle.buffers;
shared.context = new AudioContext(); assert(battle.play('recruit'));
assert(oldBus.disconnected, 'resuming after context recreation disconnects the old graph');
assert.equal(battle.context, shared.context);
assert.equal(battle.buffers.size, 1, 'context recreation drops old buffers');
battle.destroy(); assert.equal(battle.voices.size, 0); assert.equal(battle.buffers.size, 0);
assert.equal(battle.play('bell'), false, 'destroyed game can never restart audio');
assert(shared.context.state === 'running', 'destroying a game does not close shared audio for other games');
battle.destroy(); mixer.destroy();
console.log('PASS busy fight (' + accepted + ' cues/9000 events, peak ' + maxVoices + ' routine voices), priority, reset and disposal.');


// Exercise and simulation events cross a transient queue, not the saved game.
// Verify actual game methods, rather than a parallel event-mapping fixture.
{
  const { runtime } = require('./helpers.cjs');
  const { G: rules, SC, context: integrated } = runtime(true);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../../resources/glantan/sound.js'), 'utf8'), integrated);
  const owner = { context: new AudioContext() }, events = [];
  const options = { mode: 'swedish', items: [{ label: 'sol', answer: 'sol' }], seed: 'audio-contract', fresh: true };
  const game = new SC.GlantanGame({ sounds: owner, onEvent: e => events.push(e.type) });
  game.start(options);
  assert(game.soundscape instanceof rules.Soundscape);
  assert(game.choose({ type: 'research', id: 'castle2' }));
  game.answer({ text: 'fel', source: 'typing' });
  assert.deepEqual(Array.from(game.world.sounds, e => e.kind), ['wrong']);
  game.world.sounds.length = 0;
  game.answer({ text: 'sol', source: 'typing' });
  assert.deepEqual(Array.from(game.world.sounds, e => e.kind), ['correct']);
  game.world.sounds.length = 0;
  for (let n = 0; n < 3; n++) game.answer({ text: 'sol', source: 'typing' });
  assert.deepEqual(Array.from(game.world.sounds, e => e.kind), ['correct', 'correct', 'research'], 'completed payment has one purchase cue, not an additional answer beep');
  assert(game.ringBell()); assert.equal(game.world.sounds.at(-1).kind, 'bell');
  assert(game.world.sounds.every(e => Object.hasOwn(rules.soundSpecs, e.kind)), 'real emitted IDs have authored sounds');
  game.soundscape.play('bell'); assert(game.soundscape.voices.size > 0);
  const saved = game.simulation.snapshot(); assert.equal(saved.sounds, undefined, 'snapshot cannot replay already heard cues');
  game.pause(); assert.equal(game.world.sounds.length, 0); assert.equal(game.soundscape.voices.size, 0);
  game.save();
  const reloaded = new SC.GlantanGame({ sounds: owner });
  reloaded.start({ mode: options.mode, items: options.items });
  assert(reloaded.resumed); assert.equal(reloaded.world.sounds, undefined, 'autosave reload starts acoustically clean');
  reloaded.soundscape.setMix({ playing: false }); assert(!reloaded.soundscape.play('bell'));
  reloaded.soundscape.setMix({ playing: true }); assert(reloaded.soundscape.play('bell'));
  reloaded.menu(); assert.equal(reloaded.soundscape.voices.size, 0);
  game.resume(); rules.soundEvent(game.world, 'warrior', { x: 0, y: 0 });
  rules.castle(game.world).hp = 0; game.update(.1);
  assert.equal(game.state, 'lost');
  assert.deepEqual(Array.from(game.world.sounds, e => e.kind), ['defeat'], 'outcome discards queued battle sounds and emits exactly one ending');
  game.update(1); assert.equal(game.world.sounds.length, 1, 'ended simulation never emits repeat endings');
  game.soundscape.destroy(); reloaded.soundscape.destroy();
}
console.log('PASS real exercise/purchase/bell IDs, transient save queue, game pause/menu, reload and single outcome cue.');
