'use strict';
const assert = require('node:assert/strict');
const { runtime, advance } = require('./helpers.cjs');
const { SC, G } = runtime(true);
const game = new SC.GlantanGame({ random: () => 0.2 });
game.start({ mode: 'swedish', items: [{ label: 'sol', answer: 'sol' }], seed: 'adapter' });
const answer = text => { game.queue.enqueue(text); game.update(0.1); };
assert(game.choose({ type: 'research', id: 'castle2' }));
answer('sol'); answer('sol'); assert.equal(game.progress, 2);
const time = game.world.time;
advance(game, 6); assert(game.world.time >= time + 5.9, 'simulation runs while a question is open');
answer('fel'); assert.equal(game.progress, 0); assert.equal(game.pending.id, 'castle2');
answer('sol'); assert.equal(game.progress, 1);
const heldId = game.targets[0].id;
game.choose({ type: 'recruit', id: 'ranger' }); assert.equal(game.progress, 0, 'switching resets the streak');
assert.equal(game.targets[0].id, heldId, 'switching cannot reroll an unanswered exercise');
game.choose(null); game.choose({ type: 'recruit', id: 'ranger' });
assert.equal(game.targets[0].id, heldId, 'cancelling cannot reroll an unanswered exercise');
answer('sol'); const pop = G.population(game.world);
answer('sol'); assert.equal(G.population(game.world), pop + 1); assert.equal(game.pending, null);
game.choose({ type: 'research', id: 'castle2' }); answer('sol');
const question = game.targets[0].item.label, progress = game.progress;
assert(game.ringBell()); assert.equal(game.progress, progress); assert.equal(game.targets[0].item.label, question, 'earned bell never changes the selected purchase');
game.pause(); const frozen = game.world.time; advance(game, 3); assert.equal(game.world.time, frozen);
const resumed = new SC.GlantanGame(); resumed.start({ mode: 'swedish', items: [{ label: 'sol', answer: 'sol' }] });
assert(resumed.resumed); assert.equal(resumed.world.time, frozen); assert.equal(resumed.progress, progress);
assert.equal(resumed.streak, game.streak, 'resuming keeps the overall correct-answer streak');
resumed.answer({ text: 'sol', source: 'typing' });
assert.equal(resumed.bestStreak, game.streak + 1, 'a resumed answer continues the saved record');
resumed.resume();
const changed = new SC.GlantanGame(); changed.start({ mode: 'swedish', items: [{ label: 'moln', answer: 'moln' }] });
assert(!changed.resumed, 'changing the exercise content must not restore a different lesson');
{
  const options = { mode: 'swedish', items: [{ label: 'sol', answer: 'sol' }] };
  const restarted = new SC.GlantanGame(); restarted.start({ ...options, fresh: true, seed: 'fresh-before-first-answer' });
  const reloaded = new SC.GlantanGame(); reloaded.start(options);
  assert(reloaded.resumed, 'a new campaign is saved before its first answer or autosave tick');
  assert.equal(reloaded.world.seed, 'fresh-before-first-answer');
  assert.equal(reloaded.world.time, 0); assert.equal(reloaded.streak, 0); assert.equal(reloaded.progress, 0);
}
{
  const blocked = new SC.GlantanGame(); blocked.start({ mode: 'swedish', items: [{ label: 'sol', answer: 'sol' }], fresh: true, seed: 'obstruction' });
  const w = blocked.world; w.research.castle2 = true;
  let plot;
  for (let y = 8; y < 22 && !plot; y++) for (let x = 10; x < 26 && !plot; x++) {
    const a = { type: 'build', id: 'beacon', x, y };
    if (!G.availability(w, a)) plot = a;
  }
  assert(plot && blocked.choose(plot));
  for (let i = 0; i < 7; i++) blocked.answer({ text: 'sol', source: 'typing' });
  const intruder = G.spawnMonster(w, w.lairs[0]); Object.assign(intruder, { x: plot.x + .5, y: plot.y + .5, stunnedUntil: 9999 });
  blocked.update(.1); assert.equal(blocked.progress, 7); assert.equal(blocked.pending.id, 'beacon');
  blocked.answer({ text: 'sol', source: 'typing' });
  assert.equal(blocked.progress, 8); assert(!blocked.canAnswer()); assert(!G.hasBuilding(w, 'beacon'));
  blocked.save();
  const restored = new SC.GlantanGame(); restored.start({ mode: 'swedish', items: [{ label: 'sol', answer: 'sol' }] });
  assert(restored.resumed && restored.progress === 8, 'blocked paid intent survives reload');
  restored.world.monsters.find(m => m.id === intruder.id).hp = 0; restored.update(.1);
  assert(G.hasBuilding(restored.world, 'beacon')); assert.equal(restored.pending, null);
  assert.equal(restored.world.buildings.filter(b => b.type === 'beacon').length, 1);
}
for (const mode of Object.keys(SC.modes).filter(m => m !== 'homework')) {
  const practice = new SC.GlantanGame(); practice.start({ mode, lang: SC.modes[mode].lang, fresh: true });
  assert(practice.choose({ type: 'research', id: 'castle2' }));
  practice.answer({ text: practice.targets[0].item.answer, source: 'typing' });
  assert.equal(practice.progress, 1, mode + ' accepts its real exercise answer');
}
console.log('adapter: streaks, realtime, bell, pause, exercise-aware saves and all exercise families');
