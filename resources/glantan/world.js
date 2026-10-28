/* Seeded, finite terrain and grid navigation. No DOM or exercise dependencies. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  G.seedNumber = function(seed) {
    let value = 2166136261;
    for (const ch of String(seed)) value = Math.imul(value ^ ch.charCodeAt(0), 16777619);
    return value >>> 0 || 1;
  };
  G.random = function(world) {
    let t = world.rng = (world.rng + 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  G.index = (world, x, y) => Math.floor(y) * world.width + Math.floor(x);
  G.inside = (world, x, y) => x >= 1 && y >= 1 && x < world.width - 1 && y < world.height - 1;
  G.tile = (world, x, y) => G.inside(world, x, y) ? world.terrain[G.index(world, x, y)] : 3;
  G.walkable = (world, x, y) => G.inside(world, x, y) && G.tile(world, x, y) < 2;
  G.footprint = (building, x, y) => x >= building.tx && y >= building.ty && x < building.tx + building.w && y < building.ty + building.h;
  G.occupant = (world, x, y) => world.buildings.find(b => G.alive(b) && G.footprint(b, x, y)) || world.lairs.find(b => G.alive(b) && G.footprint(b, x, y));
  G.open = (world, x, y) => G.walkable(world, x, y) && !G.occupant(world, Math.floor(x), Math.floor(y));
  G.reveal = function(world, x, y, radius) {
    let count = 0;
    for (let yy = Math.max(0, Math.floor(y - radius)); yy <= Math.min(world.height - 1, Math.ceil(y + radius)); yy++) {
      for (let xx = Math.max(0, Math.floor(x - radius)); xx <= Math.min(world.width - 1, Math.ceil(x + radius)); xx++) {
        if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) > radius) continue;
        const i = yy * world.width + xx;
        if (!world.explored[i]) { world.explored[i] = 1; count++; }
      }
    }
    if (count) world.fogRevision++;
    for (const lair of world.lairs) if (world.explored[G.index(world, lair.x, lair.y)]) lair.seen = true;
    return count;
  };
  G.createMap = function(seed, pace) {
    const world = {
      version: G.VERSION, seed: String(seed), pace, rng: G.seedNumber(seed), width: 36, height: 28,
      time: 0, nextId: 1, tick: 0, navRevision: 0, fogRevision: 0, revision: 0,
      buildings: [], heroes: [], monsters: [], lairs: [], bounties: [], expeditions: [], effects: [], notices: [],
      research: {}, choices: {}, kills: 0, destroyed: 0, fallen: 0, bellCharges: 1, bellUntil: 0,
      outcome: null, score: 0, mood: 0, purchases: 0, stats: { healed: 0, explored: 0 }
    };
    world.mood = Math.floor(G.random(world) * 3);
    world.terrain = Array(world.width * world.height).fill(0);
    world.explored = Array(world.terrain.length).fill(0);
    world.paths = Array(world.terrain.length).fill(0);
    for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
      const i = y * world.width + x;
      if (!G.inside(world, x, y)) world.terrain[i] = 3;
      else if (G.random(world) < 0.26) world.terrain[i] = 1;
    }
    // Small ponds add shape without partitioning the world into unreachable islands.
    for (let p = 0; p < 5; p++) {
      const px = 3 + G.random(world) * 29, py = 3 + G.random(world) * 21;
      if (Math.hypot(px - 18, py - 14) < 8) continue;
      const rx = 1.4 + G.random(world) * 1.6, ry = 1 + G.random(world) * 1.2;
      for (let y = 1; y < world.height - 1; y++) for (let x = 1; x < world.width - 1; x++) {
        if (((x - px) / rx) ** 2 + ((y - py) / ry) ** 2 < 1) world.terrain[y * world.width + x] = 2;
      }
    }
    for (let y = 9; y <= 20; y++) for (let x = 11; x <= 24; x++) world.terrain[y * world.width + x] = 0;
    world.lairSites = [];
    const count = G.profiles[pace].lairs, angle = G.random(world) * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = angle + i / count * Math.PI * 2;
      const radius = i ? 11.5 + G.random(world) * 1.5 : 9.4;
      const tx = G.clamp(Math.round(17 + Math.cos(a) * radius), 2, 31);
      const ty = G.clamp(Math.round(13 + Math.sin(a) * radius * 0.8), 2, 23);
      world.lairSites.push({ tx, ty, type: i === 0 ? 'rust' : ['rust', 'spore', 'hush'][Math.floor(G.random(world) * 3)], tier: i < 2 ? 1 : i < 5 ? 2 : 3 });
      // Carve a narrow walkable approach, including a free ring around each lair.
      let x = 18, y = 14;
      while (x !== tx + 1 || y !== ty + 1) {
        world.terrain[y * world.width + x] = 0;
        world.paths[y * world.width + x] = 1;
        if (x !== tx + 1 && (y === ty + 1 || G.random(world) < 0.6)) x += Math.sign(tx + 1 - x);
        else y += Math.sign(ty + 1 - y);
      }
      for (let yy = ty - 1; yy <= ty + 2; yy++) for (let xx = tx - 1; xx <= tx + 2; xx++) if (G.inside(world, xx, yy)) world.terrain[yy * world.width + xx] = 0;
    }
    return world;
  };
  G.freeNear = function(world, point, radius = 4) {
    for (let r = 1; r <= radius; r++) for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const x = Math.floor(point.x + Math.cos(a) * r) + 0.5, y = Math.floor(point.y + Math.sin(a) * r) + 0.5;
      if (G.open(world, x, y)) return { x, y };
    }
    return { x: point.x, y: point.y };
  };
  G.path = function(world, from, to) {
    const width = world.width, start = G.index(world, from.x, from.y);
    const goal = G.index(world, G.clamp(to.x, 1, width - 2), G.clamp(to.y, 1, world.height - 2));
    const blocked = new Uint8Array(world.terrain.length);
    world.terrain.forEach((v, i) => { if (v >= 2) blocked[i] = 1; });
    for (const b of [...world.buildings, ...world.lairs]) if (G.alive(b)) {
      for (let y = b.ty; y < b.ty + b.h; y++) for (let x = b.tx; x < b.tx + b.w; x++) blocked[y * width + x] = 1;
    }
    // Targets inside structures are reached at their nearest free neighbour.
    const queue = [start], previous = new Int32Array(blocked.length).fill(-1);
    previous[start] = start;
    let best = start, bestDistance = Infinity;
    for (let head = 0; head < queue.length; head++) {
      const n = queue[head], x = n % width, y = Math.floor(n / width);
      const d = Math.hypot(x + 0.5 - to.x, y + 0.5 - to.y);
      if (d < bestDistance) { bestDistance = d; best = n; }
      if (n === goal || (blocked[goal] && d < 1.6)) { best = n; break; }
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const xx = x + dx, yy = y + dy, p = yy * width + xx;
        if (!G.inside(world, xx, yy) || blocked[p] || previous[p] !== -1) continue;
        previous[p] = n; queue.push(p);
      }
    }
    const points = [];
    for (let at = best; at !== start && at >= 0; at = previous[at]) points.push({ x: at % width + 0.5, y: Math.floor(at / width) + 0.5 });
    return points.reverse();
  };
  G.move = function(world, unit, destination, speed, dt) {
    const key = Math.floor(destination.x) + ':' + Math.floor(destination.y) + ':' + world.navRevision;
    if (unit.routeKey !== key || !unit.route?.length && G.distance(unit, destination) > 1.7 && (unit.repathAt || 0) < world.time) {
      unit.route = G.path(world, unit, destination); unit.routeKey = key; unit.repathAt = world.time + 2;
    }
    let remaining = speed * dt;
    while (remaining > 0 && unit.route?.length) {
      const target = unit.route[0], dx = target.x - unit.x, dy = target.y - unit.y, distance = Math.hypot(dx, dy);
      if (!G.open(world, target.x, target.y)) { unit.routeKey = ''; unit.route = []; break; }
      if (distance <= remaining) { unit.x = target.x; unit.y = target.y; unit.route.shift(); remaining -= distance; }
      else { unit.x += dx / distance * remaining; unit.y += dy / distance * remaining; remaining = 0; }
      unit.facing = dx < 0 ? -1 : 1;
    }
  };
})(globalThis);
