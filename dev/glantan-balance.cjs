/* Optional balance probe, separate from fast regression tests.
   node dev/glantan-balance.cjs gentle 10 0 1 2
   Arguments: difficulty, seconds per answer, one or more map seeds. */
'use strict';
const { runtime } = require('../tests/glantan/helpers.cjs');
const [pace = 'gentle', intervalText = '10', ...requestedSeeds] = process.argv.slice(2);
const seconds = Number(intervalText), seeds = requestedSeeds.length ? requestedSeeds : ['0', '1', '2'];
if (!['gentle', 'steady', 'brave'].includes(pace) || !(seconds >= 1 && seconds <= 60)) throw Error('Use gentle/steady/brave and 1–60 seconds per answer.');
const { G, SC } = runtime(true);
const plan = [['build', 'house'], ['build', 'garden'], ['build', 'spire'], ['recruit', 'warrior'], ['recruit', 'warrior'], ['recruit', 'ranger'], ['recruit', 'healer'], ['recruit', 'mage'], ['research', 'armor'], ['research', 'boots']];
function plot(w, id) {
  const plots = [];
  for (let y = 1; y < w.height - 1; y++) for (let x = 1; x < w.width - 1; x++) if (!G.placementReason(w, id, x, y)) plots.push({ type: 'build', id, x, y });
  return plots.sort((a, b) => G.distance(a, G.castle(w)) - G.distance(b, G.castle(w)))[0];
}
for (const seed of seeds) {
  const game = new SC.GlantanGame({ random: () => .37 });
  game.start({ seed, pace, mode: 'swedish', items: [{ label: 'sol', answer: 'sol' }], fresh: true });
  const w = game.world; let next = 0, planIndex = 0, maxCost = 0;
  while (game.state === 'playing' && w.time < 1800) {
    if (!game.pending) {
      let action;
      const fallen = w.heroes.find(h => !G.alive(h));
      if (G.castle(w).hp < G.castle(w).maxHp * .5) action = { type: 'repair', target: G.castle(w).id };
      else if (fallen && G.population(w) < G.capacity(w)) action = { type: 'resurrect', target: fallen.id };
      else if (planIndex < plan.length) {
        const [type, id] = plan[planIndex]; action = type === 'build' ? plot(w, id) : { type, id };
        if (action && !G.availability(w, action)) planIndex++;
      } else {
        const current = w.bounties.find(b => b.type === 'attack');
        if (current) {
          const group = w.expeditions.find(e => e.bounty === current.id);
          if (current.level < 3 && (group?.reason === 'Höj belöningen' || current.waitReason === 'Höj belöningen')) action = { type: 'bounty', id: 'attack', target: current.target, level: current.level + 1 };
        } else {
          const target = w.lairs.filter(l => G.alive(l) && l.seen).sort((a, b) => G.threat(w, a) - G.threat(w, b))[0];
          if (target) action = { type: 'bounty', id: 'attack', target: target.id, level: 1 };
        }
      }
      if (action && game.choose(action)) { next = w.time + seconds; maxCost = Math.max(maxCost, G.actionCost(w, action)); }
    }
    if (w.bellCharges && (G.castle(w).hp < G.castle(w).maxHp * .45 || w.heroes.filter(h => G.alive(h) && h.hp < h.maxHp * .3).length >= 2)) game.ringBell();
    if (game.canAnswer() && w.time + .001 >= next) { game.answer({ text: game.targets[0].item.answer, source: 'typing' }); next = w.time + seconds; }
    game.update(.1);
  }
  console.log(JSON.stringify({ seed, pace, secondsPerAnswer: seconds, outcome: w.outcome || 'timeout', time: G.clockText(w.time), answers: game.hits, maxStreakCost: maxCost, lairsDestroyed: w.destroyed, fallen: w.fallen, castle: Math.ceil(G.castle(w).hp), heroes: G.population(w) }));
  if (w.outcome !== 'won') process.exitCode = 1;
}
