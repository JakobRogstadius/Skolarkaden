/* Atomic purchases: validate before selecting AND before completing an action. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  const placementCache = new WeakMap();
  function preservesPassage(world, tx, ty, width, height) {
    let cached = placementCache.get(world);
    if (!cached || cached.revision !== world.navRevision) {
      cached = { revision: world.navRevision, plots: new Map() }; placementCache.set(world, cached);
    }
    const key = [tx, ty, width, height].join(':');
    if (cached.plots.has(key)) return cached.plots.get(key);
    // Removing a rectangle can split the walkable region only when its free
    // perimeter cells cease to connect. Usually this flood ends within a few
    // dozen cells; a sealed terrain neck is the uncommon full-region case.
    const border = new Set();
    for (let x = tx; x < tx + width; x++) for (const y of [ty - 1, ty + height]) if (G.open(world, x, y)) border.add(y * world.width + x);
    for (let y = ty; y < ty + height; y++) for (const x of [tx - 1, tx + width]) if (G.open(world, x, y)) border.add(y * world.width + x);
    const queue = [...border].slice(0, 1), seen = new Uint8Array(world.terrain.length);
    if (queue.length) seen[queue[0]] = 1;
    let remaining = border.size;
    for (let head = 0; head < queue.length && remaining; head++) {
      const at = queue[head], x = at % world.width, y = Math.floor(at / world.width);
      if (border.has(at)) remaining--;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const xx = x + dx, yy = y + dy, next = yy * world.width + xx;
        if (xx >= tx && xx < tx + width && yy >= ty && yy < ty + height || !G.open(world, xx, yy) || seen[next]) continue;
        seen[next] = 1; queue.push(next);
      }
    }
    const valid = border.size > 0 && remaining === 0;
    if (cached.plots.size >= 128) cached.plots.delete(cached.plots.keys().next().value);
    cached.plots.set(key, valid); return valid;
  }
  // Hidden terrain can be clicked without knowing whether it is passable.
  // Put the paid flag at its nearest reachable shore/clearing before payment.
  G.normalizeAction = function(world, action) {
    if (action?.type !== 'bounty' || !['explore', 'defend'].includes(action.id)) return action;
    const point = G.nearestOpen(world, action);
    return point ? { ...action, ...point } : action;
  };
  G.hasBuilding = (w, type) => w.buildings.some(b => b.type === type && G.alive(b));
  G.actionKey = action => action ? [action.type, action.id, action.x, action.y, action.target, action.level].join(':') : '';
  G.temporaryObstruction = (action, reason) => action?.type === 'build' && reason === 'Monster står i vägen.';
  G.actionCost = function(world, action) {
    if (!action) return 0;
    if (action.type === 'build') return G.buildings[action.id]?.cost || 0;
    if (action.type === 'recruit') return G.classes[action.id]?.cost || 0;
    if (action.type === 'research') return G.research[action.id]?.cost || 0;
    if (action.type === 'resurrect') return Math.min(4, 2 + Math.ceil((world.heroes.find(h => h.id === action.target)?.level || 1) / 3));
    if (action.type === 'repair') return 2;
    if (action.type === 'bounty') {
      const existing = world.bounties.find(b => b.type === action.id && (action.id === 'attack' ? b.target === action.target : Math.hypot(b.x - action.x, b.y - action.y) < 1));
      return Math.max(1, G.clamp(action.level || 1, 1, 3) - (existing?.level || 0));
    }
    return 0;
  };
  G.actionName = function(world, action) {
    if (!action) return '';
    if (action.type === 'build') return G.buildings[action.id]?.name || '';
    if (action.type === 'recruit') return G.classes[action.id]?.name || '';
    if (action.type === 'research') return G.research[action.id]?.name || '';
    if (action.type === 'resurrect') return 'Återkalla ' + (world.heroes.find(h => h.id === action.target)?.name || 'hjälte');
    if (action.type === 'repair') return 'Laga ' + (G.buildings[world.buildings.find(b => b.id === action.target)?.type]?.name || 'byggnad');
    return { attack: 'Anfallsbelöning', explore: 'Utforskarbelöning', defend: 'Vaktbelöning' }[action.id] || '';
  };
  G.placementReason = function(world, type, tx, ty) {
    const b = G.buildings[type];
    if (!b || !Number.isInteger(tx) || !Number.isInteger(ty)) return 'Välj en tomt på kartan.';
    for (let y = ty; y < ty + b.h; y++) for (let x = tx; x < tx + b.w; x++) {
      if (!G.inside(world, x, y) || G.tile(world, x, y) !== 0) return 'Bygg på öppen mark.';
      if (!world.explored[G.index(world, x, y)]) return 'Utforska platsen först.';
      if (G.occupant(world, x, y)) return 'Tomten är upptagen.';
    }
    if (world.monsters.some(m => G.alive(m) && m.x >= tx - 0.5 && m.x <= tx + b.w + 0.5 && m.y >= ty - 0.5 && m.y <= ty + b.h + 0.5)) return 'Monster står i vägen.';
    // Every structure retains an accessible ring. This prevents enclosure traps.
    for (const other of [...world.buildings, ...world.lairs]) {
      if (!G.alive(other)) continue;
      if (tx < other.tx + other.w + 1 && tx + b.w > other.tx - 1 && ty < other.ty + other.h + 1 && ty + b.h > other.ty - 1) return 'Lämna en ruta fri mellan byggnader.';
    }
    if (!preservesPassage(world, tx, ty, b.w, b.h)) return 'Lämna en passage förbi byggnaden.';
    return '';
  };
  G.availability = function(world, action, { placement = true } = {}) {
    if (!action || world.outcome) return 'Omgången är avslutad.';
    if (action.type === 'build') {
      const b = G.buildings[action.id];
      if (!b || !b.cost) return 'Okänd byggnad.';
      if (b.requires && !world.research[b.requires]) return 'Stäm klockborgen först.';
      if (b.group && world.choices[b.group] && world.choices[b.group] !== action.id) return 'Ett annat vägval är valt.';
      if (world.buildings.filter(item => item.type === action.id && G.alive(item)).length >= b.limit) return 'Max ' + b.limit + '.';
      if (b.group && world.choices[b.group] === action.id && world.landmarkBuilt) return 'Unik: redan byggd denna omgång.';
      return placement ? G.placementReason(world, action.id, action.x, action.y) : '';
    }
    if (action.type === 'recruit') {
      const c = G.classes[action.id];
      if (!c) return 'Okänd hjälte.';
      if (!G.hasBuilding(world, c.guild)) return 'Bygg ' + G.buildings[c.guild].name.toLowerCase() + ' först.';
      if (G.population(world) >= G.capacity(world)) return G.capacity(world) >= G.POPULATION_LIMIT ? 'Gläntan är full.' : 'Bygg fler bostäder.';
      return '';
    }
    if (action.type === 'research') {
      const r = G.research[action.id];
      if (!r) return 'Okänd forskning.';
      if (world.research[action.id]) return 'Redan klart.';
      if (!G.hasBuilding(world, r.building)) return 'Bygg ' + G.buildings[r.building].name.toLowerCase() + ' först.';
      if (r.requires && !world.research[r.requires]) return 'Stäm klockborgen först.';
      if (r.group && world.choices[r.group]) return 'Ett annat vägval är valt.';
      return '';
    }
    if (action.type === 'resurrect') {
      const hero = world.heroes.find(h => h.id === action.target);
      if (!hero || G.alive(hero)) return 'Hjälten behöver inte återkallas.';
      return G.population(world) >= G.capacity(world) ? 'En ledig bostadsplats behövs.' : '';
    }
    if (action.type === 'repair') {
      const b = world.buildings.find(item => item.id === action.target);
      return !b || !G.alive(b) ? 'Byggnaden finns inte kvar.' : b.hp >= b.maxHp ? 'Redan helt.' : '';
    }
    if (action.type === 'bounty') {
      if (!['attack', 'defend', 'explore'].includes(action.id)) return 'Okänt uppdrag.';
      if (action.id === 'attack') {
        const target = [...world.lairs, ...world.monsters].find(t => t.id === action.target && G.alive(t));
        if (!target || !target.seen && !world.explored[G.index(world, target.x, target.y)]) return 'Målet är borta.';
      } else if (!G.inside(world, action.x, action.y)) return 'Välj en plats på kartan.';
      else if (!G.open(world, action.x, action.y)) return 'Välj en fri plats.';
      if (action.id === 'explore' && world.explored[G.index(world, action.x, action.y)]) return 'Redan utforskat.';
      const existing = world.bounties.find(b => b.type === action.id && (action.id === 'attack' ? b.target === action.target : Math.hypot(b.x - action.x, b.y - action.y) < 1));
      if (existing && existing.level >= (action.level || 1)) return 'Belöningen finns redan.';
      return '';
    }
    return 'Okänd handling.';
  };
  G.purchase = function(world, action) {
    const reason = G.availability(world, action);
    if (reason) return { ok: false, reason };
    let entity = null;
    if (action.type === 'build') {
      entity = G.addBuilding(world, action.id, action.x, action.y);
      const spec = G.buildings[action.id];
      if (spec.group) { world.choices[spec.group] = action.id; world.landmarkBuilt = true; }
      // Units on a newly built footprint move to its entrance, never get trapped.
      for (const hero of world.heroes) if (G.alive(hero) && G.footprint(entity, hero.x, hero.y)) Object.assign(hero, G.freeNear(world, entity), { routeKey: '', route: [] });
      G.effect(world, 'build', entity.x, entity.y, { duration: 1.3, color: spec.color });
    } else if (action.type === 'recruit') entity = G.addHero(world, action.id);
    else if (action.type === 'research') {
      const spec = G.research[action.id];
      world.research[action.id] = true;
      if (spec.group) world.choices[spec.group] = action.id;
      if (action.id === 'castle2') { const castle = G.castle(world); castle.maxHp += 400; castle.hp += 400; }
      if (action.id === 'armor') for (const hero of world.heroes) {
        const hp = G.heroStats(world, hero).hp;
        if (G.alive(hero)) hero.hp += hp - hero.maxHp;
        hero.maxHp = hp;
      }
      G.notify(world, spec.name + ' klart.', 'good');
    } else if (action.type === 'resurrect') {
      entity = world.heroes.find(h => h.id === action.target);
      Object.assign(entity, G.freeNear(world, G.castle(world)), { hp: entity.maxHp, retreating: false, expedition: null, task: 'Tillbaka', routeKey: '', route: [], shieldUntil: world.time + 4 });
      G.effect(world, 'summon', entity.x, entity.y, { duration: 1.6, color: G.classes[entity.classId].color });
    } else if (action.type === 'repair') {
      entity = world.buildings.find(b => b.id === action.target);
      entity.hp = Math.min(entity.maxHp, entity.hp + entity.maxHp * 0.55);
      G.effect(world, 'heal', entity.x, entity.y, { duration: 1, color: '#b1e6af' });
    } else if (action.type === 'bounty') {
      const target = action.id === 'attack' ? [...world.lairs, ...world.monsters].find(t => t.id === action.target) : action;
      entity = world.bounties.find(b => b.type === action.id && (action.id === 'attack' ? b.target === action.target : Math.hypot(b.x - action.x, b.y - action.y) < 1));
      if (entity) { entity.level = action.level; entity.retryAt = 0; }
      else {
        entity = { id: world.nextId++, type: action.id, target: action.target, x: target.x, y: target.y, level: action.level || 1, created: world.time };
        world.bounties.push(entity);
      }
    }
    G.soundEvent(world, action.type === 'repair' ? 'build' : action.type, entity || G.castle(world), true);
    world.purchases++; world.revision++;
    return { ok: true, entity };
  };
})(globalThis);
