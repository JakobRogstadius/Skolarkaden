'use strict';
const assert = require('node:assert/strict');
const { runtime } = require('./helpers.cjs');
const { G } = runtime();
const sizes = { gentle: [72, 56, 10], steady: [90, 70, 20], brave: [108, 84, 30] };
let detours = 0;
for (const pace of ['gentle', 'steady', 'brave']) for (let seed = 0; seed < 30; seed++) {
  const a = new G.Simulation({ seed, pace }).world, b = new G.Simulation({ seed, pace }).world;
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'same seed produces the same starting world');
  assert.deepEqual([a.width, a.height], sizes[pace].slice(0, 2), 'both dimensions grow by the requested percentage');
  assert.equal(a.lairs.filter(l => l.boss).length, 1, 'exactly one boss lair');
  assert.equal(a.lairs.find(l => l.boss).suggestedLevels, sizes[pace][2]);
  for (const type of [2, 4, 5]) assert(a.terrain.filter(tile => tile === type).length > 30, 'coherent water, mountain and forest obstacles');
  const entrance = G.freeNear(a, G.castle(a));
  if (seed === 0) {
    const queue = [G.index(a, entrance.x, entrance.y)], connected = new Set(queue);
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head], x = at % a.width, y = Math.floor(at / a.width);
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const next = (y + dy) * a.width + x + dx;
        if (!connected.has(next) && G.open(a, x + dx, y + dy)) { connected.add(next); queue.push(next); }
      }
    }
    const openTiles = a.terrain.reduce((n, _, i) => n + Number(G.open(a, i % a.width, Math.floor(i / a.width))), 0);
    assert.equal(connected.size, openTiles, 'all walkable terrain belongs to the castle-connected region');
  }
  for (const lair of a.lairs) {
    const route = G.path(a, entrance, lair);
    assert(route.length && G.distance(route.at(-1), lair) < 2, 'every lair has a reachable approach: ' + seed);
    assert(route.every(p => G.open(a, p.x, p.y)), 'navigation never crosses water or occupied tiles');
    const direct = Math.abs(entrance.x - lair.x) + Math.abs(entrance.y - lair.y);
    if (route.length > direct + 8) detours++;
  }
  const explored = a.explored.filter(Boolean).length;
  G.reveal(a, 3, 3, 4);
  assert(a.explored.filter(Boolean).length >= explored, 'exploration is permanent');
}
assert(detours >= 40, 'terrain changes routes materially rather than only decorating their edges');

// A handcrafted barrier isolates navigation, cache invalidation and line-of-fire
// semantics from the map generator. A live map can gain blockers when building.
const w = G.createMap('navigation', 'gentle');
w.terrain = w.terrain.map((_, i) => G.inside(w, i % w.width, Math.floor(i / w.width)) ? 0 : 3);
w.lairSites = [];
const from = { x: 10.5, y: 10.5 }, to = { x: 15.5, y: 10.5 };
const direct = G.path(w, from, to);
assert.equal(direct.length, 5);
for (let y = 1; y < 20; y++) w.terrain[y * w.width + 13] = 4;
w.navRevision++;
const around = G.path(w, from, to);
assert(around.length > 20, 'a new ridge invalidates the cached direct route');
assert(around.every(p => G.open(w, p.x, p.y)));
assert(!G.clearLine(w, from, to), 'nearby targets across terrain are not attackable through it');
const unit = { ...from, route: [], routeKey: '', hp: 10 };
for (let i = 0; i < 500 && G.distance(unit, to) > 0.01; i++) {
  w.time += 0.1; G.move(w, unit, to, 2, 0.1);
  assert(G.open(w, unit.x, unit.y), 'movement follows the detour without clipping blockers');
}
assert(G.distance(unit, to) < 0.01, 'the route reaches its target');
w.terrain[8 * w.width + 9] = 5; w.navRevision++;
assert(!G.clearLine(w, { x: 8.5, y: 8.5 }, { x: 9.5, y: 9.5 }), 'diagonal fire cannot slip between touching blocking corners');
const castle = G.addBuilding(w, 'castle', 25, 25);
assert(G.clearLine(w, { x: 24.5, y: 26 }, castle), 'a target structure can be struck at its own footprint');
assert(G.clearLine(w, castle, { x: 24.5, y: 26 }), 'a tower/castle can shoot out of its own footprint');
G.addBuilding(w, 'house', 22, 25);
assert(!G.clearLine(w, { x: 20.5, y: 25.5 }, castle), 'another structure blocks the ray');
const first = G.freeNear(w, castle); w.heroes.push({ ...first, hp: 10 });
const second = G.freeNear(w, castle);
assert(G.distance(first, second) >= 0.65, 'consecutive recruits use separate free spawn locations');
const plain = JSON.stringify(w);
G.path(w, from, to);
assert.equal(JSON.stringify(w), plain, 'derived navigation caches are not serialized');
// Four companions entered a waypoint tile together. Soft separation should not
// make them orbit its exact center forever before taking the next path segment.
const crowdGoal = { x: 30.5, y: 35.5 };
w.heroes = [[0.84, 0.80], [0.75, 0.03], [0.08, 0.19], [0.16, 0.87]].map(([x, y], i) => ({
  id: i + 100, hp: 10, x: 30 + x, y: 42 + y,
  route: Array.from({ length: 8 }, (_, n) => ({ x: 30.5, y: 42.5 - n })),
  routeKey: '30:35:' + w.navRevision
}));
for (let tick = 0; tick < 50; tick++) {
  w.time += 0.1;
  for (const hero of w.heroes) G.move(w, hero, crowdGoal, 1.5, 0.1);
  G.separateHeroes(w, 0.1);
}
assert(w.heroes.every(hero => hero.y < 39), 'all separated companions continue beyond their shared intermediate waypoint');
const exact = { x: 35.1, y: 35.2, route: [], routeKey: '' }, exactGoal = { x: 35.8, y: 35.7 };
G.move(w, exact, exactGoal, 2, 1);
assert.equal(exact.x, exactGoal.x); assert.equal(exact.y, exactGoal.y, 'final destination retains exact positioning');
console.log('world: 90 seeded maps; size, bosses, terrain, detours, routing, occlusion and separated spawns');
