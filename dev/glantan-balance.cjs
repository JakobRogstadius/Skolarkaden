/* Optional balance probe, separate from fast regression tests.
   node dev/glantan-balance.cjs gentle 10 0 1 2
   node dev/glantan-balance.cjs --boss
   Arguments: difficulty, seconds per answer, one or more map seeds.
   GLANTAN_SPECIALISTS=1 exercises the necromancer and trapper composition. */
'use strict';
const { runtime } = require('../tests/games/glantan/helpers.cjs');
if (process.argv[2] === '--boss') {
  const { G } = runtime();
  // Controlled arena isolates replenishing guardians from travel and raid waves.
  // Three hard-mode guards require the ordinary late-game combat upgrades.
  for (const [pace, levels, upgraded = false] of [['gentle', [3, 3, 2, 2]], ['gentle', [2, 1, 1, 1]], ['steady', [5, 5, 5, 5]], ['steady', [3, 3, 2, 2]], ['brave', [5, 5, 5, 5, 5, 5], true], ['brave', [3, 3, 3, 2, 2, 2], true]]) {
    const w = G.createMap('boss-probe', pace);
    w.terrain.fill(0); w.paths.fill(0); w.explored.fill(1); delete w.lairSites;
    G.addBuilding(w, 'castle', 4, 4); G.addBuilding(w, 'house', 7, 7);
    const lair = G.addLair(w, { tx: 20, ty: 14, type: 'hush', tier: 3, boss: true, suggestedLevels: G.profiles[pace].bossLevels }, 1e6);
    lair.awake = lair.defendersRaised = true; lair.nextSpawn = lair.nextGrowth = 1e6;
    if (upgraded) Object.assign(w.research, { armor: true, banner: true, bloom: true });
    const roles = levels.length === 6 ? ['warrior', 'warrior', 'warrior', 'healer', 'healer', 'mage'] : ['warrior', 'warrior', 'healer', 'ranger'];
    const heroes = levels.map((level, i) => {
      const hero = G.addHero(w, roles[i]); hero.level = level; hero.trait = 2;
      hero.maxHp = G.heroStats(w, hero).hp; hero.hp = hero.maxHp;
      hero.x = lair.x - (roles[i] === 'warrior' ? 4 : 5.5); hero.y = lair.y + (i % 3 - 1) * 1.2;
      hero.expedition = 1000; return hero;
    });
    w.bounties = [{ id: 999, type: 'attack', level: 3, target: lair.id, x: lair.x, y: lair.y, created: 0 }];
    w.expeditions = [{ id: 1000, bounty: 999, members: heroes.map(h => h.id), state: 'march', created: 0, progressAt: 0, targetHp: lair.hp, x: lair.x - 4, y: lair.y }];
    w.monsters.forEach((monster, i) => { monster.x = lair.x - 2; monster.y = lair.y + (i - (w.monsters.length - 1) / 2) * 2.8; });
    const simulation = new G.Simulation({ saved: w });
    for (let step = 0; step < 6000 && G.alive(lair); step++) simulation.update(.1);
    const combined = levels.reduce((sum, level) => sum + level, 0), atTarget = combined >= lair.suggestedLevels;
    const passed = atTarget ? !G.alive(lair) && !w.fallen : G.alive(lair) && !w.fallen;
    console.log(JSON.stringify({ pace, combined, upgraded, recommended: lair.suggestedLevels, cleared: !G.alive(lair), seconds: Math.round(w.time), fallen: w.fallen, passed }));
    if (!passed) process.exitCode = 1;
  }
  return;
}
const [pace = 'gentle', intervalText = '10', ...requestedSeeds] = process.argv.slice(2);
const seconds = Number(intervalText), seeds = requestedSeeds.length ? requestedSeeds : ['0', '1', '2'];
if (!['gentle', 'steady', 'brave'].includes(pace) || !(seconds >= 1 && seconds <= 60)) throw Error('Use gentle/steady/brave and 1–60 seconds per answer.');
const { G, SC } = runtime(true);
const plan = [['build', 'hall'], ['recruit', 'warrior'], ['build', 'lodge'], ['recruit', 'ranger'], ['build', 'garden'], ['recruit', 'healer'], ['build', 'tower'], ['build', 'house'], ['build', 'spire'], ['recruit', 'mage'], ['build', 'tower'], ['attack', 'nearest'], ['recruit', 'warrior'], ['recruit', 'warrior'], ['recruit', 'ranger'], ['recruit', 'healer'], ['research', 'armor'], ['research', 'boots'], ['research', 'castle2'], ['research', 'banner'], ['research', 'marksman'], ['research', 'bloom']];
if (process.env.GLANTAN_SPECIALISTS) {
  plan[plan.findIndex(action => action[1] === 'marksman')][1] = 'traps';
  const at = plan.findIndex(action => action[0] === 'recruit' && action[1] === 'mage');
  plan.splice(at + 1, 0, ['build', 'crypt'], ['recruit', 'necromancer']);
  // Keep the same eight-person budget, replacing one duplicate frontline fighter.
  plan.splice(plan.findLastIndex(action => action[0] === 'recruit' && action[1] === 'warrior'), 1);
}
if (pace === 'brave') plan.splice(plan.findIndex(action => action[0] === 'research'), 0,
  ['build', 'house'], ['recruit', 'warrior'], ['recruit', 'healer'], ['recruit', 'mage'], ['recruit', 'ranger'],
  ['build', 'tower'], ['build', 'tower'], ['guard', 'village']);
if (pace === 'brave') plan.splice(plan.findIndex(action => action[1] === 'castle2') + 1, 0, ['build', 'beacon']);
function plot(w, id) {
  const plots = [];
  for (let y = 1; y < w.height - 1; y++) for (let x = 1; x < w.width - 1; x++) if (!G.placementReason(w, id, x, y)) plots.push({ type: 'build', id, x, y });
  return plots.sort((a, b) => G.distance(a, G.castle(w)) - G.distance(b, G.castle(w)))[0];
}
function frontier(w) {
  const candidates = [];
  for (let y = 2; y < w.height - 2; y += 3) for (let x = 2; x < w.width - 2; x += 3) {
    if (w.explored[G.index(w, x, y)] || !G.open(w, x, y)) continue;
    if (![[3, 0], [-3, 0], [0, 3], [0, -3]].some(([dx, dy]) => G.inside(w, x + dx, y + dy) && w.explored[G.index(w, x + dx, y + dy)])) continue;
    candidates.push({ x: x + .5, y: y + .5 });
  }
  return candidates.sort((a, b) => G.distance(b, G.castle(w)) - G.distance(a, G.castle(w)))[0];
}
for (const seed of seeds) {
  const game = new SC.GlantanGame({ random: () => .37 });
  game.start({ seed, pace, mode: 'swedish', items: [{ label: 'sol', answer: 'sol' }], fresh: true });
  const w = game.world; let next = 0, planIndex = 0, maxCost = 0;
  while (game.state === 'playing' && w.time < 2400) {
    if (!game.pending) {
      let action;
      const fallen = w.heroes.find(h => !G.alive(h));
      const ruined = w.buildings.find(b => !G.alive(b) && b.type !== 'house' && b.type !== 'castle' && G.buildings[b.type].cost < 8 && !G.hasBuilding(w, b.type));
      if (G.castle(w).hp < G.castle(w).maxHp * .5) action = { type: 'repair', target: G.castle(w).id };
      else if (fallen && G.population(w) >= G.capacity(w)) action = plot(w, 'house');
      else if (fallen && G.population(w) < G.capacity(w)) action = { type: 'resurrect', target: fallen.id };
      else if (ruined) action = plot(w, ruined.type);
      else if (planIndex < plan.length) {
        const [type, id] = plan[planIndex];
        if (type === 'attack') {
          const target = w.lairs.filter(l => G.alive(l) && l.seen).sort((a, b) => G.threat(w, a) - G.threat(w, b))[0];
          if (target) action = { type: 'bounty', id: 'attack', target: target.id, level: 1 };
          else planIndex++; // Scouting may not have found an objective yet.
        } else if (type === 'guard') {
          const castle = G.castle(w); action = { type: 'bounty', id: 'defend', x: castle.x, y: castle.y, level: 1 };
        } else {
          const needs = type === 'research' ? G.research[id].building : type === 'recruit' ? G.classes[id].guild : null;
          action = needs && !G.hasBuilding(w, needs) ? plot(w, needs) : type === 'build' ? plot(w, id) : { type, id };
        }
        action = G.normalizeAction(w, action);
        if (action && !G.availability(w, action) && (type === 'attack' || type === 'guard' || action.type === type && action.id === id)) planIndex++;
      } else {
        const current = w.bounties.find(b => b.type === 'attack');
        if (current) {
          const group = w.expeditions.find(e => e.bounty === current.id);
          if (current.level < 3 && (group?.reason === 'Höj belöningen' || current.waitReason === 'Höj belöningen')) action = { type: 'bounty', id: 'attack', target: current.target, level: current.level + 1 };
        } else {
          const target = w.lairs.filter(l => G.alive(l) && l.seen).sort((a, b) => G.threat(w, a) - G.threat(w, b))[0];
          if (target) action = { type: 'bounty', id: 'attack', target: target.id, level: 1 };
          else if (!w.bounties.some(b => b.type === 'explore')) {
            const point = frontier(w); if (point) action = { type: 'bounty', id: 'explore', ...point, level: 1 };
          }
        }
      }
      if (action && game.choose(action)) { next = w.time + seconds; maxCost = Math.max(maxCost, G.actionCost(w, action)); }
    }
    if (w.bellCharges && (G.castle(w).hp < G.castle(w).maxHp * .45 || w.heroes.filter(h => G.alive(h) && h.hp < h.maxHp * .3).length >= 2)) game.ringBell();
    if (game.canAnswer() && w.time + .001 >= next) { game.answer({ text: game.targets[0].item.answer, source: 'typing' }); next = w.time + seconds; }
    game.update(.1);
  }
  console.log(JSON.stringify({ seed, pace, secondsPerAnswer: seconds, outcome: w.outcome || 'timeout', time: G.clockText(w.time), answers: game.hits, maxStreakCost: maxCost, lairsDestroyed: w.destroyed, combinedHeroLevels: w.heroes.filter(G.alive).reduce((n,h)=>n+h.level,0), bossRemaining: w.lairs.some(l=>l.boss&&G.alive(l)), fallen: w.fallen, castle: Math.ceil(G.castle(w).hp), heroes: G.population(w) }));
  if (w.outcome !== 'won') {
    if (process.env.GLANTAN_BALANCE_SNAPSHOT) require('node:fs').writeFileSync(process.env.GLANTAN_BALANCE_SNAPSHOT, JSON.stringify(w));
    console.log(JSON.stringify({ planIndex, planned:plan[planIndex], pending:game.pending, progress:game.progress, remaining: w.lairs.filter(G.alive).map(l => ({ id:l.id, boss:l.boss, seen:l.seen, hp:Math.round(l.hp), x:l.x,y:l.y })), monsters:w.monsters.filter(G.alive).length, heroes:w.heroes.filter(G.alive).map(h=>({id:h.id,role:h.classId,level:h.level,hp:Math.round(h.hp),task:h.task,x:+h.x.toFixed(1),y:+h.y.toFixed(1),exp:h.expedition,route:h.route?.length})), expeditions:w.expeditions.map(e=>({id:e.id,bounty:e.bounty,state:e.state,reason:e.reason,members:e.members,readiness:+G.expeditionReadiness(w,e).toFixed(2)})), bounties:w.bounties }));
    process.exitCode = 1;
  }
}
