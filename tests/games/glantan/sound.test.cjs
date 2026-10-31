'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const context = vm.createContext({ console, Float32Array, Math, Starlight: { Glantan: { clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) } } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../../resources/glantan/music.js'), 'utf8'), context);
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
    const node = this.node({ playbackRate: param(1), start(at = 0, offset = 0) { this.started = true; this.offset = offset; }, stop(at = 0) { this.stopped = true; this.stopAt = at; } }); this.sources.push(node); return node;
  }
  createBuffer(channels, count, sampleRate) {
    const channelData = Array.from({ length: channels }, () => new Float32Array(count));
    const buffer = { channels, sampleRate, data: channelData[0], channelData, copyToChannel(data, channel = 0) { this.channelData[channel].set(data); } }; this.buffers.push(buffer); return buffer;
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

// One quiet loop follows the real audio lifecycle, independent of effect voices.
{
  const owner = { context: new AudioContext() }, score = new G.Soundscape(owner), c = owner.context;
  score.setMix({ music: true, enabled: false }); assert.equal(c.sources.length, 0, 'muted games do not start music');
  c.state = 'suspended'; score.setMix({ enabled: true }); assert.equal(c.sources.length, 0, 'music waits for the user to unlock audio');
  c.state = 'running'; score.setMix({ music: true });
  const track = score.music.active, buffer = track.source.buffer;
  assert(track.source.loop); assert.equal(buffer.channels, 2); assert.equal(buffer.data.length / buffer.sampleRate, 40);
  assert.notDeepEqual(buffer.channelData[0], buffer.channelData[1], 'the theme has a stereo room');
  for (const data of buffer.channelData) {
    assert(data.every(Number.isFinite));
    assert(data.reduce((n, v) => Math.max(n, Math.abs(v)), 0) <= .601);
    assert(Math.abs(data.reduce((n, v) => n + v, 0) / data.length) < .0001);
    const steps = data.slice(1, 400).map((v, i) => Math.abs(v - data[i]));
    assert(Math.abs(data[0] - data.at(-1)) < Math.max(...steps), 'the loop seam has no abnormal sample jump');
    const level = rms(data) * track.gain.gain.value, feedback = rms(waves.get('correct')) * G.soundSpecs.correct.gain;
    assert(level > .001 && level < feedback / 3, 'music stays well below answer feedback');
  }
  for (let i = 0; i < 20; i++) { c.currentTime += .1; score.setMix({ music: true }); }
  assert.equal(c.sources.length, 1, 'UI refreshes never stack music loops'); assert.equal(score.voices.size, 0);
  score.setMix({ duck: .23 }); assert.equal(score.bus.gain.value, .23); assert.equal(track.gain.target, score.bus);
  c.currentTime = 9.5; score.setMix({ playing: false });
  assert.equal(score.music.active, null); assert.equal(track.gain.gain.value, 0); assert(track.source.stopAt <= c.currentTime + .2);
  track.source.onended(); assert(track.source.disconnected && track.gain.disconnected, 'fade completion releases the audio graph');
  c.currentTime += 50; score.setMix({ playing: true });
  assert.equal(score.music.active.source.offset, 9.5, 'resuming continues the phrase instead of restarting it');
  assert.equal(score.music.active.source.buffer, buffer, 'pause/resume reuses the rendered theme');
  assert(score.play('victory'));
  score.setMix({ music: false }); assert.equal(score.music.active, null); assert.equal(score.voices.size, 1, 'ending fanfare survives music stopping');
  score.setMix({ music: true }); const resumed = score.music.active;
  score.setMix({ enabled: false }); assert.equal(score.music.active, null); assert.equal(score.voices.size, 0);
  score.setMix({ enabled: true }); assert(resumed.source.disconnected, 'quick mute/unmute cleans the old fading loop');
  score.destroy(); assert.equal(score.music.active, null); assert.equal(score.music.tail, null);
  const replay = new G.Soundscape(owner); replay.setMix({ music: true });
  assert.equal(replay.music.active.source.buffer, buffer, 'another game reuses the same-context music buffer');
  const oldSource = replay.music.active.source;
  owner.context = new AudioContext(); replay.setMix({ music: true });
  assert(oldSource.disconnected); assert.notEqual(replay.music.active.source.buffer, buffer, 'context replacement rebuilds the track');
  const last = replay.music.active.source; replay.destroy(); assert(last.stopped && last.disconnected);
  replay.setMix({ music: true }); assert.equal(replay.music.active, null, 'disposed games cannot restart music');
  console.log('PASS quiet stereo music, seamless loop, shared context, single playback, ducking, pause position, mute, endings and teardown.');
}

// Exercise and simulation events cross a transient queue, not the saved game.
// Verify actual game methods, rather than a parallel event-mapping fixture.
{
  const { runtime } = require('./helpers.cjs');
  const { G: rules, SC, context: integrated } = runtime(true);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../../resources/glantan/music.js'), 'utf8'), integrated);
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
