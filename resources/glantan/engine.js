/* Serializable simulation state; all gameplay advances on a fixed clock. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  G.notify = function(world, text, kind = 'info') {
    world.notices.push({ text, kind, until: world.time + 6, id: world.nextId++ });
    world.notices = world.notices.slice(-4);
    world.revision++;
  };
  G.effect = function(world, type, x, y, extra = {}) {
    world.effects.push({ type, x, y, age: 0, duration: 0.7, ...extra });
    if (world.effects.length > 100) world.effects.shift();
  };
  G.addBuilding = function(world, type, tx, ty) {
    const spec = G.buildings[type];
    const building = { id: world.nextId++, type, tx, ty, w: spec.w, h: spec.h, x: tx + spec.w / 2, y: ty + spec.h / 2, hp: spec.hp, maxHp: spec.hp, shotAt: 0, born: world.time };
    world.buildings.push(building); world.navRevision++; world.revision++;
    G.reveal(world, building.x, building.y, type === 'castle' ? 7.5 : 4);
    return building;
  };
  G.addLair = function(world, site, wakeAt) {
    const tier = site.tier || 1, hp = 100 + tier * tier * 70;
    const lair = { id: world.nextId++, ...site, w: 2, h: 2, x: site.tx + 1, y: site.ty + 1, hp, maxHp: hp, tier, level: 1, wakeAt, awake: wakeAt <= world.time, seen: false, nextSpawn: wakeAt + 32, nextGrowth: wakeAt + G.lairTypes[site.type].interval * G.profiles[world.pace].growth, warned: false, spread: false, born: world.time };
    world.lairs.push(lair); world.navRevision++; world.revision++;
    return lair;
  };
  G.heroStats = function(world, hero) {
    const role = G.classes[hero.classId], level = hero.level - 1;
    return {
      hp: Math.round(role.hp * (1 + level * 0.17) * (world.research.armor ? 1.2 : 1)),
      damage: role.damage * (1 + level * 0.16) * (hero.classId === 'ranger' && world.research.marksman ? 1.4 : 1),
      speed: role.speed * G.traits[hero.trait].speed * (world.research.boots ? 1.18 : 1) * (hero.classId === 'ranger' && world.research.pathfinder ? 1.18 : 1) * (world.bellUntil > world.time ? 1.22 : 1),
      range: role.range + (hero.classId === 'ranger' && world.research.marksman ? 0.8 : 0),
      cooldown: role.cooldown
    };
  };
  G.addHero = function(world, classId, at) {
    const guild = world.buildings.find(b => G.alive(b) && b.type === G.classes[classId].guild) || G.castle(world);
    const point = G.freeNear(world, at || guild);
    const n = world.heroes.length;
    const hero = { id: world.nextId++, classId, name: G.names[(n + G.seedNumber(world.seed) % G.names.length) % G.names.length] + (n >= G.names.length ? ' ' + (Math.floor(n / G.names.length) + 1) : ''), trait: Math.floor(G.random(world) * G.traits.length), level: 1, xp: 0, totalXp: 0, supportXp: 0, ...point, hp: G.classes[classId].hp, cooldown: 0, healCooldown: 0, attackAt: 0, rethinkAt: 0, task: 'Vaktar', expedition: null, route: [], routeKey: '', kills: 0, healing: 0, scouting: 0, shieldUntil: 0, retreating: false, facing: 1, born: world.time };
    hero.maxHp = G.heroStats(world, hero).hp; hero.hp = hero.maxHp;
    world.heroes.push(hero); world.revision++;
    G.effect(world, 'summon', hero.x, hero.y, { color: G.classes[classId].color });
    return hero;
  };
  G.castle = world => world.buildings.find(b => b.type === 'castle');
  G.population = world => world.heroes.filter(G.alive).length;
  G.capacity = world => Math.min(G.POPULATION_LIMIT, world.buildings.filter(b => b.type === 'house' && G.alive(b)).length * 4);
  G.gainXp = function(world, hero, amount) {
    if (!G.alive(hero) || amount <= 0) return;
    hero.xp += amount; hero.totalXp += amount;
    while (hero.level < 8 && hero.xp >= G.xpFor(hero.level)) {
      hero.xp -= G.xpFor(hero.level); hero.level++;
      const previous = hero.maxHp; hero.maxHp = G.heroStats(world, hero).hp;
      hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp - previous + 12);
      G.effect(world, 'level', hero.x, hero.y, { duration: 1.6, text: 'Nivå ' + hero.level, color: '#ffe7a0' });
      world.revision++;
    }
  };
  G.damage = function(world, target, amount, attacker) {
    if (!target || !G.alive(target)) return;
    if (target.wakeAt !== undefined && !target.defendersRaised) G.alertLair(world, target);
    if (target.classId) {
      if (target.shieldUntil > world.time) amount *= 0.65;
      if (world.research.guardian && world.heroes.some(h => G.alive(h) && h.classId === 'warrior' && G.distance(h, target) < 2.8)) amount *= 0.78;
    }
    target.hp = Math.max(0, target.hp - amount); target.hurtAt = world.time;
    if (target.hp > 0) return;
    if (target.classId) {
      world.fallen++; target.task = 'Vilar'; target.expedition = null; target.route = []; target.diedAt = world.time;
      G.notify(world, target.name + ' föll. Kan återkallas.', 'warn');
    } else if (target.monster) {
      world.kills++;
      // Nearby support shares XP, with diminishing returns against weak enemies.
      // Tower-only kills teach less than taking part in the encounter.
      for (const hero of world.heroes) if (G.alive(hero) && G.distance(hero, target) < 7) {
        const gap = hero.level - (target.rank || 1), learning = gap >= 2 ? 0 : gap > 0 ? 0.35 : 1;
        const involved = attacker?.classId || world.time - (hero.contributedAt ?? -100) < 10;
        G.gainXp(world, hero, G.monsterTypes[target.type].xp * learning * (involved ? 1 : 0.2));
      }
      if (attacker?.classId) attacker.kills++;
    } else if (target.wakeAt !== undefined) {
      world.destroyed++; world.navRevision++;
      G.notify(world, G.lairTypes[target.type].name + ' tystnade. Gläntan växer.', 'good');
      for (const hero of world.heroes) if (G.alive(hero) && G.distance(hero, target) < 9) G.gainXp(world, hero, 25 + target.tier * 10);
      G.reveal(world, target.x, target.y, 5);
      if (!world.lairs.some(G.alive)) { world.explored.fill(1); world.fogRevision++; G.notify(world, 'Bona är borta. Jaga de sista skramlarna!', 'good'); }
    } else {
      world.navRevision++;
      if (target.type !== 'castle') G.notify(world, G.buildings[target.type].name + ' förstördes.', 'warn');
    }
    G.effect(world, 'burst', target.x, target.y, { color: target.classId ? '#e6b8a2' : '#f4dba0', duration: 1.2 });
    world.revision++;
  };
  G.ringBell = function(world) {
    if (!world.bellCharges || world.outcome) return false;
    world.bellCharges = 0; world.bellProgress = 0; world.bellUntil = world.time + 9;
    const castle = G.castle(world);
    for (const monster of world.monsters) if (G.alive(monster) && G.distance(monster, castle) < 8) monster.stunnedUntil = world.time + 2.5;
    for (const hero of world.heroes) if (G.alive(hero)) hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * 0.12);
    G.effect(world, 'bell', castle.x, castle.y, { duration: 2.5, color: '#ffda82' });
    G.notify(world, 'Stormklockan samlar mod.', 'good');
    return true;
  };
  G.answerCharge = function(world) {
    if (world.bellCharges) return;
    world.bellProgress = (world.bellProgress || 0) + 1;
    if (world.bellProgress >= 6) { world.bellProgress = 0; world.bellCharges = 1; world.revision++; }
  };
  G.updateBuildings = function(world, dt) {
    for (const building of world.buildings) {
      if (!G.alive(building)) continue;
      if (building.type === 'garden') {
        for (const hero of world.heroes) if (G.alive(hero) && G.distance(hero, building) < 4) hero.hp = Math.min(hero.maxHp, hero.hp + 2.8 * dt);
      }
      const range = building.type === 'beacon' ? 8.5 : building.type === 'tower' ? 6 : building.type === 'castle' ? 5 : 0;
      if (!range || building.shotAt > world.time) continue;
      const target = world.monsters.filter(G.alive).filter(m => G.distance(building, m) < range).sort((a, b) => G.distance(a, building) - G.distance(b, building))[0];
      if (!target) continue;
      building.shotAt = world.time + (building.type === 'beacon' ? 1.4 : 1.5);
      const damage = building.type === 'beacon' ? 28 : building.type === 'tower' ? 13 : 8;
      G.effect(world, 'bolt', building.x, building.y - 0.6, { toX: target.x, toY: target.y, color: '#ffe0a0', duration: 0.3 });
      G.damage(world, target, damage, building);
      if (building.type === 'beacon') for (const m of world.monsters) if (m !== target && G.alive(m) && G.distance(m, target) < 2) G.damage(world, m, damage * 0.6, building);
    }
  };
  // Finite encounter credit: leaving one nest alive cannot farm an endless score.
  G.score = world => Math.floor(world.destroyed * 500 + Math.min(150, world.kills) * 12 + Math.min(2000, world.heroes.reduce((n, h) => n + h.totalXp, 0)) * 0.3 + (world.outcome === 'won' ? 3000 + Math.max(0, 1500 - world.time) + G.castle(world).hp : 0));
  class Simulation {
    constructor({ seed = 'dagg', pace = 'gentle', saved = null } = {}) {
      this.world = saved || G.createMap(seed, pace); this.accumulator = 0;
      if (saved) return;
      const w = this.world;
      G.addBuilding(w, 'castle', 17, 12);
      G.addBuilding(w, 'house', 19, 16);
      G.addBuilding(w, 'hall', 13, 15);
      G.addBuilding(w, 'lodge', 21, 11);
      w.lairSites.forEach((site, i) => G.addLair(w, site, i === 0 ? 40 : (i + 1) * G.profiles[pace].wake));
      delete w.lairSites;
      G.reveal(w, 18, 13, 8);
      G.addHero(w, 'warrior'); G.addHero(w, 'ranger'); G.addHero(w, 'healer');
      G.notify(w, 'Välj en byggnad, hjälte eller ett bo. Svara för att betala.');
    }
    update(dt) {
      if (!Number.isFinite(dt) || dt <= 0 || this.world.outcome) return;
      this.accumulator += Math.min(dt, 0.5);
      while (this.accumulator >= G.STEP && !this.world.outcome) { this.step(G.STEP); this.accumulator -= G.STEP; }
    }
    step(dt) {
      const w = this.world;
      w.time += dt; w.tick++;
      G.updateLairs(w, dt);
      if (w.tick % 10 === 0) G.planExpeditions(w);
      G.updateHeroes(w, dt); G.updateMonsters(w, dt); G.updateBuildings(w, dt);
      w.effects.forEach(e => { e.age += dt; }); w.effects = w.effects.filter(e => e.age < e.duration);
      w.notices = w.notices.filter(n => n.until > w.time);
      w.monsters = w.monsters.filter(m => m.hp > 0 || w.time - m.hurtAt < 0.4);
      w.bounties = w.bounties.filter(b => {
        if (b.type === 'attack') return [...w.lairs, ...w.monsters].some(t => t.id === b.target && G.alive(t));
        if (b.type === 'explore') return !w.explored[G.index(w, b.x, b.y)];
        return true;
      });
      if (G.castle(w).hp <= 0) w.outcome = 'lost';
      else if (!w.lairs.some(G.alive) && !w.monsters.some(G.alive)) w.outcome = 'won';
      w.score = G.score(w);
    }
    snapshot() { return JSON.parse(JSON.stringify(this.world)); }
  }
  G.Simulation = Simulation;
})(globalThis);
