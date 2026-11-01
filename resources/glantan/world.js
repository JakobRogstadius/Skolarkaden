/* Seeded terrain, connected regions and shared cardinal-grid navigation. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  const navigation = new WeakMap(); // Derived grids never enter a saved game.
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
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
  function nav(world) {
    let cached = navigation.get(world);
    if (cached && cached.revision === world.navRevision && cached.terrain === world.terrain) return cached;
    const blocked = Uint8Array.from(world.terrain, tile => tile >= 2 ? 1 : 0);
    for (const b of [...world.buildings, ...world.lairs]) if (G.alive(b)) {
      for (let y = b.ty; y < b.ty + b.h; y++) for (let x = b.tx; x < b.tx + b.w; x++) blocked[y * world.width + x] = 1;
    }
    cached = { revision: world.navRevision, terrain: world.terrain, blocked, fields: new Map(), queue: new Int32Array(blocked.length) };
    navigation.set(world, cached); return cached;
  }
  G.open = (world, x, y) => G.inside(world, x, y) && !nav(world).blocked[G.index(world, x, y)];
  G.reveal = function(world, x, y, radius) {
    let count = 0;
    for (let yy = Math.max(0, Math.floor(y - radius)); yy <= Math.min(world.height - 1, Math.ceil(y + radius)); yy++) {
      for (let xx = Math.max(0, Math.floor(x - radius)); xx <= Math.min(world.width - 1, Math.ceil(x + radius)); xx++) {
        const i = yy * world.width + xx;
        if (world.explored[i] || Math.hypot(xx + 0.5 - x, yy + 0.5 - y) > radius) continue;
        world.explored[i] = 1; count++;
      }
    }
    for (const lair of world.lairs) if (!lair.seen) {
      // A home guardian's tracks identify its lair. Scouts can locate a boss
      // from safety rather than having to enter its lethal patrol perimeter.
      if (world.monsters.some(m => G.alive(m) && m.guard && m.lair === lair.id && world.explored[G.index(world, m.x, m.y)])) {
        lair.seen = true;
        for (let yy = lair.ty; yy < lair.ty + lair.h; yy++) for (let xx = lair.tx; xx < lair.tx + lair.w; xx++) {
          const i = yy * world.width + xx;
          if (!world.explored[i]) { world.explored[i] = 1; count++; }
        }
      }
      for (let yy = lair.ty; yy < lair.ty + lair.h && !lair.seen; yy++) for (let xx = lair.tx; xx < lair.tx + lair.w; xx++) {
        if (world.explored[G.index(world, xx, yy)]) { lair.seen = true; break; }
      }
    }
    if (count) world.fogRevision++;
    return count;
  };
  function blob(w, cx, cy, rx, ry, type, angle, phase) {
    const extent = Math.ceil(Math.max(rx, ry) * 1.2), cos = Math.cos(angle), sin = Math.sin(angle);
    for (let y = Math.max(1, Math.floor(cy - extent)); y < Math.min(w.height - 1, cy + extent); y++) {
      for (let x = Math.max(1, Math.floor(cx - extent)); x < Math.min(w.width - 1, cx + extent); x++) {
        const xx = ((x - cx) * cos + (y - cy) * sin) / rx, yy = ((y - cy) * cos - (x - cx) * sin) / ry;
        const edge = 1 + Math.sin(Math.atan2(yy, xx) * 5 + phase) * 0.12;
        if (xx * xx + yy * yy < edge) w.terrain[y * w.width + x] = type;
      }
    }
  }
  function clear(w, cx, cy, radius, trail = false) {
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if (!G.inside(w, x, y) || Math.hypot(x - cx, y - cy) > radius) continue;
      const i = y * w.width + x; w.terrain[i] = 0;
      if (trail) w.paths[i] = 1;
    }
  }
  function reachableTerrain(w) {
    const found = new Uint8Array(w.terrain.length), queue = new Int32Array(found.length);
    const start = G.index(w, w.home.x, w.home.y); found[start] = 1; queue[0] = start;
    for (let head = 0, tail = 1; head < tail; head++) {
      const at = queue[head], x = at % w.width, y = Math.floor(at / w.width);
      for (const [dx, dy] of directions) {
        const xx = x + dx, yy = y + dy, next = yy * w.width + xx;
        if (!G.inside(w, xx, yy) || found[next] || w.terrain[next] >= 2) continue;
        found[next] = 1; queue[tail++] = next;
      }
    }
    return found;
  }
  function connectClearing(w, site, reached) {
    const start = G.index(w, site.tx + 1, site.ty + 1);
    if (reached[start]) return reached;
    // Repair an isolated clearing with a short pass, rather than flattening
    // terrain along a road between every lair and the castle.
    const previous = new Int32Array(w.terrain.length).fill(-1), queue = [start]; previous[start] = start;
    let end = start;
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head], x = at % w.width, y = Math.floor(at / w.width);
      if (reached[at]) { end = at; break; }
      for (const [dx, dy] of directions) {
        const xx = x + dx, yy = y + dy, next = yy * w.width + xx;
        if (!G.inside(w, xx, yy) || previous[next] !== -1) continue;
        previous[next] = at; queue.push(next);
      }
    }
    for (let at = end; at !== start; at = previous[at]) clear(w, at % w.width, Math.floor(at / w.width), 1.1, true);
    return reachableTerrain(w);
  }
  G.createMap = function(seed, pace) {
    const profile = G.profiles[pace], scale = profile.mapScale || { gentle: 2, steady: 2.5, brave: 3 }[pace];
    const w = {
      version: G.VERSION, seed: String(seed), pace, rng: G.seedNumber(seed), width: Math.round(36 * scale), height: Math.round(28 * scale),
      time: 0, nextId: 1, tick: 0, navRevision: 0, fogRevision: 0, revision: 0,
      buildings: [], heroes: [], skeletons: [], corpses: [], traps: [], monsters: [], lairs: [], bounties: [], expeditions: [], effects: [], notices: [],
      research: {}, choices: {}, kills: 0, destroyed: 0, fallen: 0, bellCharges: 1, bellUntil: 0,
      outcome: null, score: 0, mood: 0, purchases: 0, stats: { healed: 0, explored: 0 }
    };
    const cx = Math.floor(w.width / 2), cy = Math.floor(w.height / 2);
    w.home = { tx: cx - 1, ty: cy - 1, x: cx, y: cy };
    w.mood = Math.floor(G.random(w) * 3);
    w.terrain = Array(w.width * w.height).fill(0); w.explored = Array(w.terrain.length).fill(0); w.paths = Array(w.terrain.length).fill(0);
    for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) {
      const i = y * w.width + x;
      if (!G.inside(w, x, y)) w.terrain[i] = 3;
      else if (G.random(w) < 0.23) w.terrain[i] = 1;
    }
    const phase = G.random(w) * Math.PI * 2, mirror = G.random(w) < 0.5 ? -1 : 1;
    const riverX = y => cx + mirror * (-w.width * 0.21 + Math.sin(y / w.height * 7 + phase) * w.width * 0.045);
    // Offset bridges give the winding river two useful crossing points.
    for (let y = 1; y < w.height - 1; y++) {
      const width = 1.5 + 0.55 * Math.sin(y * 0.23 + phase) + scale * 0.3;
      for (let x = Math.floor(riverX(y) - width); x <= riverX(y) + width; x++) if (G.inside(w, x, y)) w.terrain[y * w.width + x] = 2;
    }
    for (const at of [0.24, 0.72]) {
      const y = Math.round(w.height * at + Math.sin(phase) * 2);
      for (let yy = y - 1; yy <= y + 1; yy++) for (let x = Math.floor(riverX(yy) - 4); x <= riverX(yy) + 4; x++) if (G.inside(w, x, yy)) {
        w.terrain[yy * w.width + x] = 0; w.paths[yy * w.width + x] = 1;
      }
    }
    // The opposite ridge has a northern pass and a wide southern valley.
    for (let y = 2; y < w.height - 2; y++) {
      if (Math.abs(y - w.height * 0.28) < 2 || Math.abs(y - w.height * 0.64) < 2.5) continue;
      const x = cx + mirror * (w.width * 0.22 + Math.sin(y * 0.15 + phase) * 2.8);
      blob(w, x, y, 2.2, 1.3, 4, 0, phase);
    }
    const patches = 9 + Math.round(scale * 2);
    for (let i = 0; i < patches; i++) {
      const x = 5 + G.random(w) * (w.width - 10), y = 5 + G.random(w) * (w.height - 10);
      if (Math.hypot((x - cx) / 1.15, y - cy) < 10) continue;
      const type = i % 4 === 0 ? 2 : 5;
      blob(w, x, y, (type === 2 ? 3.5 : 4.5) + G.random(w) * scale * 1.5, 2.5 + G.random(w) * scale, type, G.random(w) * Math.PI, G.random(w) * 6);
    }
    // The village has room for housing and guilds without an empty continent.
    for (let y = cy - 7; y <= cy + 7; y++) for (let x = cx - 8; x <= cx + 8; x++) w.terrain[y * w.width + x] = 0;
    w.lairSites = [];
    // Three families per map: a readable melee opening plus two different threats.
    const families = ['spore', 'hush', 'sky', 'thorn'];
    for (let i = families.length - 1; i > 0; i--) { const j = Math.floor(G.random(w) * (i + 1)); [families[i], families[j]] = [families[j], families[i]]; }
    w.families = ['rust', ...families.slice(0, 2)];
    const angle = G.random(w) * Math.PI * 2;
    for (let i = 0; i < profile.lairs; i++) {
      const progress = i / (profile.lairs - 1), boss = i === profile.lairs - 1, a = angle + i * 2.39996323;
      const rx = 12 + progress * (w.width * 0.43 - 12), ry = 11 + progress * (w.height * 0.42 - 11);
      const target = { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
      let best = null, bestScore = Infinity;
      for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) {
        const tx = G.clamp(Math.round(target.x + xx), boss ? 6 : 3, w.width - (boss ? 8 : 5));
        const ty = G.clamp(Math.round(target.y + yy), boss ? 6 : 3, w.height - (boss ? 8 : 5));
        if (Math.hypot(tx + 1 - cx, ty + 1 - cy) < 11 || w.lairSites.some(s => Math.hypot(s.tx - tx, s.ty - ty) < 8)) continue;
        let obstruction = 0;
        for (let y = ty - 1; y <= ty + 2; y++) for (let x = tx - 1; x <= tx + 2; x++) if (w.terrain[y * w.width + x] >= 2) obstruction++;
        const score = Math.hypot(xx, yy) + obstruction * 0.8;
        if (score < bestScore) { bestScore = score; best = { tx, ty }; }
      }
      const site = { ...best, type: w.families[i % w.families.length], tier: boss || i >= 5 ? 3 : i < 2 ? 1 : 2, boss, suggestedLevels: boss ? profile.bossLevels || { gentle: 10, steady: 20, brave: 30 }[pace] : undefined };
      w.lairSites.push(site); clear(w, site.tx + 0.5, site.ty + 0.5, boss ? 5.2 : 3.1);
    }
    let reached = reachableTerrain(w);
    for (const site of w.lairSites) reached = connectClearing(w, site, reached);
    // Scouts must never choose an unreachable pocket inside a lake/forest ring.
    for (let i = 0; i < w.terrain.length; i++) {
      if (w.terrain[i] < 2 && !reached[i]) w.terrain[i] = 5;
      if (w.terrain[i] >= 2) w.paths[i] = 0;
    }
    return w;
  };
  G.freeNear = function(world, point, radius = 4) {
    const units = [...world.heroes, ...world.skeletons, ...world.monsters].filter(G.alive);
    let fallback = null;
    for (let r = 1; r <= radius; r++) for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const x = Math.floor(point.x + Math.cos(a) * r) + 0.5, y = Math.floor(point.y + Math.sin(a) * r) + 0.5;
      if (!G.open(world, x, y)) continue;
      if (!fallback) fallback = { x, y };
      if (!units.some(unit => Math.hypot(unit.x - x, unit.y - y) < 0.65)) return { x, y };
    }
    return fallback || { x: point.x, y: point.y };
  };
  G.nearestOpen = function(world, point) {
    if (!G.inside(world, point.x, point.y)) return null;
    if (G.open(world, point.x, point.y)) return { x: point.x, y: point.y };
    const blocked = nav(world).blocked;
    let best = null, distance = Infinity;
    for (let y = 1; y < world.height - 1; y++) for (let x = 1; x < world.width - 1; x++) {
      if (blocked[y * world.width + x]) continue;
      const d = (x + 0.5 - point.x) ** 2 + (y + 0.5 - point.y) ** 2;
      if (d < distance) { distance = d; best = { x: x + 0.5, y: y + 0.5 }; }
    }
    return best;
  };
  function field(world, target, cached) {
    const width = world.width, tx = Math.floor(G.clamp(target.x, 1, width - 2)), ty = Math.floor(G.clamp(target.y, 1, world.height - 2));
    const goal = ty * width + tx;
    if (cached.fields.has(goal)) {
      const found = cached.fields.get(goal);
      cached.fields.delete(goal); cached.fields.set(goal, found); return found;
    }
    const distance = new Int32Array(cached.blocked.length).fill(-1), queue = cached.queue;
    let tail = 0;
    if (!cached.blocked[goal]) { distance[goal] = 0; queue[tail++] = goal; }
    else {
      const structure = G.occupant(world, tx, ty), radius = structure ? Math.max(structure.w, structure.h) : 3;
      let nearest = Infinity;
      for (let y = ty - radius; y <= ty + radius; y++) for (let x = tx - radius; x <= tx + radius; x++) {
        if (!G.inside(world, x, y) || cached.blocked[y * width + x]) continue;
        nearest = Math.min(nearest, Math.hypot(x + 0.5 - target.x, y + 0.5 - target.y));
      }
      for (let y = ty - radius; y <= ty + radius; y++) for (let x = tx - radius; x <= tx + radius; x++) {
        if (!G.inside(world, x, y) || cached.blocked[y * width + x] || Math.hypot(x + 0.5 - target.x, y + 0.5 - target.y) > nearest + 0.05) continue;
        const next = y * width + x; distance[next] = 0; queue[tail++] = next;
      }
    }
    // Keep the same right/down/left/up tie order, without allocating coordinate
    // pairs or calling grid helpers for every edge of a whole-map search.
    const blocked = cached.blocked, lastRow = (world.height - 2) * width;
    for (let head = 0; head < tail; head++) {
      const at = queue[head], x = at % width, step = distance[at] + 1;
      let next = at + 1;
      if (x < width - 2 && !blocked[next] && distance[next] < 0) { distance[next] = step; queue[tail++] = next; }
      next = at + width;
      if (at < lastRow && !blocked[next] && distance[next] < 0) { distance[next] = step; queue[tail++] = next; }
      next = at - 1;
      if (x > 1 && !blocked[next] && distance[next] < 0) { distance[next] = step; queue[tail++] = next; }
      next = at - width;
      if (at >= width * 2 && !blocked[next] && distance[next] < 0) { distance[next] = step; queue[tail++] = next; }
    }
    // Frequently used village/expedition routes survive local combat movement.
    // 64 fields cost at most 2.3 MB on the largest map; invalidated with terrain.
    if (cached.fields.size >= 64) cached.fields.delete(cached.fields.keys().next().value);
    cached.fields.set(goal, distance); return distance;
  }
  G.path = function(world, from, to) {
    if (!G.inside(world, from.x, from.y) || !Number.isFinite(to.x) || !Number.isFinite(to.y)) return [];
    const cached = nav(world), distance = field(world, to, cached), width = world.width;
    let at = G.index(world, from.x, from.y);
    if (distance[at] < 0) return [];
    const points = [];
    while (distance[at] > 0) {
      const x = at % width, y = Math.floor(at / width);
      let next = at;
      for (const [dx, dy] of directions) {
        const xx = x + dx, yy = y + dy, candidate = yy * width + xx;
        if (G.inside(world, xx, yy) && distance[candidate] >= 0 && distance[candidate] < distance[next]) next = candidate;
      }
      if (next === at) break;
      at = next; points.push({ x: at % width + 0.5, y: Math.floor(at / width) + 0.5 });
    }
    if (G.open(world, to.x, to.y) && G.index(world, to.x, to.y) === at && (!points.length || G.distance(points.at(-1), to) > 0.05)) points.push({ x: to.x, y: to.y });
    return points;
  };
  G.reachable = (world, from, to) => G.inside(world, from.x, from.y) && field(world, to, nav(world))[G.index(world, from.x, from.y)] >= 0;
  G.travelDistance = (world, from, to) => {
    const steps = G.inside(world, from.x, from.y) ? field(world, to, nav(world))[G.index(world, from.x, from.y)] : -1;
    return steps < 0 ? Infinity : steps;
  };
  G.clearLine = function(world, from, to) {
    if (!G.inside(world, from.x, from.y) || !G.inside(world, to.x, to.y)) return false;
    let x = Math.floor(from.x), y = Math.floor(from.y);
    const endX = Math.floor(to.x), endY = Math.floor(to.y), dx = to.x - from.x, dy = to.y - from.y;
    const startStructure = G.occupant(world, x, y), endStructure = G.occupant(world, endX, endY), cached = nav(world);
    const pass = (xx, yy) => G.inside(world, xx, yy) && (!cached.blocked[yy * world.width + xx] ||
      G.tile(world, xx, yy) < 2 && (startStructure && G.footprint(startStructure, xx, yy) || endStructure && G.footprint(endStructure, xx, yy)));
    const sx = Math.sign(dx), sy = Math.sign(dy), deltaX = dx ? Math.abs(1 / dx) : Infinity, deltaY = dy ? Math.abs(1 / dy) : Infinity;
    let crossX = dx ? (sx > 0 ? x + 1 - from.x : from.x - x) / Math.abs(dx) : Infinity;
    let crossY = dy ? (sy > 0 ? y + 1 - from.y : from.y - y) / Math.abs(dy) : Infinity;
    if (!pass(x, y)) return false;
    while (x !== endX || y !== endY) {
      // An integer target can lie exactly on a grid edge. Do not step past
      // its column/row while the other axis is still reaching that endpoint.
      if (x === endX) crossX = Infinity;
      if (y === endY) crossY = Infinity;
      if (Math.abs(crossX - crossY) < 1e-9) {
        if (!pass(x + sx, y) || !pass(x, y + sy)) return false;
        x += sx; y += sy; crossX += deltaX; crossY += deltaY;
      } else if (crossX < crossY) { x += sx; crossX += deltaX; }
      else { y += sy; crossY += deltaY; }
      if (!pass(x, y)) return false;
    }
    return true;
  };
  G.move = function(world, unit, destination, speed, dt) {
    if (unit.rootedUntil > world.time) return;
    const key = Math.floor(destination.x) + ':' + Math.floor(destination.y) + ':' + world.navRevision;
    if (unit.routeKey !== key || !unit.route?.length && G.distance(unit, destination) > 0.2 && (unit.repathAt || 0) < world.time) {
      unit.route = G.path(world, unit, destination); unit.routeKey = key; unit.repathAt = world.time + 2;
    }
    let remaining = speed * dt;
    while (remaining > 0 && unit.route?.length) {
      // Companions keep personal space within a tile. Requiring every one to
      // touch its exact center can lock an entire group around a waypoint.
      // Consume intermediate waypoints on entry when the onward segment is
      // unobstructed; the final point and blocked corners remain precise.
      if (unit.route.length > 1 && G.index(world, unit.x, unit.y) === G.index(world, unit.route[0].x, unit.route[0].y) &&
        G.clearLine(world, unit, unit.route[1])) { unit.route.shift(); continue; }
      const target = unit.route[0], dx = target.x - unit.x, dy = target.y - unit.y, distance = Math.hypot(dx, dy);
      if (!G.open(world, target.x, target.y) || !G.clearLine(world, unit, target)) { unit.routeKey = ''; unit.route = []; break; }
      if (distance <= remaining) { unit.x = target.x; unit.y = target.y; unit.route.shift(); remaining -= distance; }
      else { unit.x += dx / distance * remaining; unit.y += dy / distance * remaining; remaining = 0; }
      if (distance > 0) { unit.facing = dx < 0 ? -1 : 1; unit.movedAt = world.time; }
    }
  };
})(globalThis);
