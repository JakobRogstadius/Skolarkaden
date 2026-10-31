/* Serializable simulation state; all gameplay advances on a fixed clock. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  G.allies = w => [...w.heroes, ...(w.skeletons || [])].filter(G.alive);
  G.flying = unit => !!(unit.monster && G.monsterTypes[unit.type]?.flying);
  G.canHit = (attacker, target) => !(G.flying(target) && (attacker.classId === 'warrior' || attacker.skeleton || G.monsterTypes[attacker.type]?.skeletal));
  G.attackLine = (w, from, to) => G.flying(from) || G.flying(to) ? G.inside(w, from.x, from.y) && G.inside(w, to.x, to.y) : G.clearLine(w, from, to);
  G.offenseBoost = (w, unit) => w.research.banner && w.heroes.some(h => G.alive(h) && h.classId === 'warrior' && G.distance(h, unit) < 4 && G.clearLine(w, h, unit)) ? 1.25 : 1;
  G.resolveOutcome = w => {
    if (w.outcome) return w.outcome;
    if (G.castle(w)?.hp <= 0) w.outcome = 'lost';
    else if (w.lairs.some(l => l.boss && !G.alive(l))) w.outcome = 'won';
    return w.outcome;
  };
  // Presentation events are transient: never replay old sounds after loading a save.
  G.soundEvent = function(world, kind, entity, important = false) {
    if (!world.sounds) Object.defineProperty(world, 'sounds', { value: [], writable: true, configurable: true });
    if (world.sounds.length >= 64) world.sounds.shift();
    world.sounds.push({ kind, x: entity?.x, y: entity?.y, important });
  };
  G.notify = function(world, text, kind = 'info', point = null) {
    world.notices.push({ text, kind, until: world.time + 6, id: world.nextId++, ...(point ? { x: point.x, y: point.y } : {}) });
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
    const tier = site.tier || 1, hp = G.lairHitPoints ? G.lairHitPoints(site, world.pace) : 100 + tier * tier * 70;
    const lair = { id: world.nextId++, ...site, w: 2, h: 2, x: site.tx + 1, y: site.ty + 1, hp, maxHp: hp, tier, level: 1, guardCount: site.boss ? G.profiles[world.pace].bossGuardCount : 2, nextGuardAt: world.time + 30, wakeAt, awake: wakeAt <= world.time, seen: false, nextSpawn: wakeAt + 32, nextGrowth: wakeAt + G.lairTypes[site.type].interval * G.profiles[world.pace].growth, warned: false, spread: false, born: world.time };
    world.lairs.push(lair); world.navRevision++; world.revision++;
    G.seedLairGuards(world, lair);
    return lair;
  };
  G.heroStats = function(world, hero) {
    const role = G.classes[hero.classId], level = hero.level - 1;
    return {
      hp: Math.round(role.hp * (1 + level * 0.17) * (world.research.armor ? 1.2 : 1)),
      damage: role.damage * (1 + level * 0.16) * (hero.classId === 'ranger' && world.research.marksman ? 1.4 : 1) * G.offenseBoost(world, hero),
      speed: role.speed * G.traits[hero.trait].speed * (world.research.boots ? 1.18 : 1) * (world.bellUntil > world.time ? 1.22 : 1),
      range: role.range + (hero.classId === 'ranger' && world.research.marksman ? 0.8 : 0),
      cooldown: role.cooldown
    };
  };
  G.addHero = function(world, classId, at) {
    const guild = world.buildings.find(b => G.alive(b) && b.type === G.classes[classId].guild) || G.castle(world);
    const point = G.freeNear(world, at || guild);
    const n = world.heroes.length;
    const hero = { id: world.nextId++, classId, name: G.names[(n + G.seedNumber(world.seed) % G.names.length) % G.names.length] + (n >= G.names.length ? ' ' + (Math.floor(n / G.names.length) + 1) : ''), trait: Math.floor(G.random(world) * G.traits.length), level: 1, xp: 0, totalXp: 0, supportXp: 0, ...point, hp: G.classes[classId].hp, cooldown: 0, attackAt: 0, rethinkAt: 0, task: 'Vaktar', expedition: null, route: [], routeKey: '', kills: 0, healing: 0, scouting: 0, shieldUntil: 0, retreating: false, facing: 1, born: world.time };
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
      G.soundEvent(world, 'level', hero);
      world.revision++;
    }
  };
  G.damage = function(world, target, amount, attacker) {
    if (world.outcome || !target || !G.alive(target) || attacker && !G.canHit(attacker, target)) return 0;
    if (target.classId || target.skeleton) {
      if (target.shieldUntil > world.time) amount *= 0.65;
      if (world.research.guardian && world.heroes.some(h => G.alive(h) && h.classId === 'warrior' && G.distance(h, target) < 2.8 && G.clearLine(world, h, target))) amount *= 0.78;
    }
    if (target.monster && world.monsters.some(m => m !== target && G.alive(m) && G.monsterTypes[m.type].ward && G.distance(m, target) < 3 && G.attackLine(world, m, target))) amount *= .75;
    const dealt = Math.min(target.hp, Math.max(0, amount));
    target.hp = Math.max(0, target.hp - amount); target.hurtAt = world.time;
    if (target.monster && dealt > 0) target.waveEngaged = true;
    if (target.hp > 0) {
      if (target.wakeAt !== undefined && !target.defendersRaised) G.alertLair(world, target);
      if (target.w && target.wakeAt === undefined && dealt > 0 && world.time - (world.lastBuildingWarningAt ?? -30) >= 20) {
        world.lastBuildingWarningAt = world.time;
        G.notify(world, G.buildings[target.type].name + ' anfalls!', 'warn', target);
      }
      return dealt;
    }
    if (target.classId) {
      world.fallen++; target.task = 'Vilar'; target.expedition = null; target.route = []; target.diedAt = world.time;
      G.notify(world, target.name + ' föll.', 'warn', target);
      G.soundEvent(world, 'hero-down', target, true);
      for (const minion of world.skeletons) if (minion.owner === target.id) minion.hp = 0;
      world.traps = world.traps.filter(trap => trap.owner !== target.id);
    } else if (target.skeleton) {
      G.effect(world, 'bones', target.x, target.y, { duration: .7, color: '#d7e8bd' });
    } else if (target.monster) {
      world.kills++;
      if (!G.monsterTypes[target.type].skeletal) {
        const point = G.nearestOpen(world, target) || target;
        world.corpses.push({ id: world.nextId++, x: point.x, y: point.y, monsterType: target.type, level: target.rank || 1, diedAt: world.time });
        if (world.corpses.length > G.MAX_CORPSES) world.corpses.shift();
      }
      for (const minion of world.monsters) if (minion.raisedBy === target.id && G.alive(minion)) {
        minion.hp = 0; G.effect(world, 'bones', minion.x, minion.y, { duration: .7, color: '#e47770' });
      }
      // Nearby support shares XP, with diminishing returns against weak enemies.
      // Tower-only kills teach less than taking part in the encounter.
      for (const hero of world.heroes) if (G.alive(hero) && G.distance(hero, target) < 7) {
        const gap = hero.level - (target.rank || 1), learning = gap >= 2 ? 0 : gap > 0 ? 0.35 : 1;
        const involved = attacker?.classId || world.time - (hero.contributedAt ?? -100) < 10;
        G.gainXp(world, hero, G.monsterTypes[target.type].xp * (target.broodParent ? .25 : 1) * learning * (involved ? 1 : 0.2));
      }
      if (attacker?.classId) attacker.kills++;
    } else if (target.wakeAt !== undefined) {
      world.destroyed++; world.navRevision++;
      if (!target.boss) G.launchWave(world, target);
      G.soundEvent(world, 'lair-down', target, true);
      for (const hero of world.heroes) if (G.alive(hero) && G.distance(hero, target) < 9) G.gainXp(world, hero, 25 + target.tier * 10);
      G.reveal(world, target.x, target.y, 5);
    } else {
      world.navRevision++;
      if (target.type !== 'castle') G.notify(world, G.buildings[target.type].name + ' förstördes.', 'warn', target);
    }
    G.effect(world, 'burst', target.x, target.y, { color: target.classId ? '#e6b8a2' : '#f4dba0', duration: 1.2 });
    world.revision++;
    G.resolveOutcome(world);
    return dealt;
  };
  G.ringBell = function(world) {
    if (!world.bellCharges || world.outcome) return false;
    world.bellCharges = 0; world.bellProgress = 0; world.bellUntil = world.time + 9;
    const castle = G.castle(world);
    for (const monster of world.monsters) if (G.alive(monster) && G.distance(monster, castle) < 8) monster.stunnedUntil = world.time + 2.5;
    for (const hero of world.heroes) if (G.alive(hero)) hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * 0.12);
    G.effect(world, 'bell', castle.x, castle.y, { duration: 2.5, color: '#ffda82' });
    G.soundEvent(world, 'bell', castle, true);
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
      const target = world.monsters.filter(G.alive).filter(m => G.distance(building, m) < range && G.attackLine(world, building, m)).sort((a, b) => G.distance(a, building) - G.distance(b, building))[0];
      if (!target) continue;
      building.shotAt = world.time + (building.type === 'beacon' ? 1.4 : 1.5);
      const damage = building.type === 'beacon' ? 28 : building.type === 'tower' ? 13 : 8;
      G.effect(world, building.type === 'beacon' ? 'spell' : 'bolt', building.x, building.y - 0.6, { toX: target.x, toY: target.y, color: '#ffe0a0', school: 'sun', radius: 2, duration: building.type === 'beacon' ? .8 : .3 });
      G.soundEvent(world, building.type === 'beacon' ? 'mage' : 'ranger', building);
      G.damage(world, target, damage, building);
      if (building.type === 'beacon') for (const m of world.monsters) if (m !== target && G.alive(m) && G.distance(m, target) < 2) G.damage(world, m, damage * 0.6, building);
    }
  };
  // Finite encounter credit: leaving one nest alive cannot farm an endless score.
  G.score = world => Math.floor(world.destroyed * 500 + Math.min(150, world.kills) * 12 + Math.min(2000, world.heroes.reduce((n, h) => n + h.totalXp, 0)) * 0.3 + (world.outcome === 'won' ? 3000 + Math.max(0, 1500 - world.time) + G.castle(world).hp : 0));
  class Simulation {
    constructor({ seed = 'dagg', pace = 'gentle', saved = null } = {}) {
      this.world = saved || G.createMap(seed, pace); this.accumulator = 0;
      const w = this.world;
      // Additive save migration preserves heroes, purchases and paid answer streaks.
      w.skeletons ||= []; w.corpses ||= []; w.traps ||= [];
      w.corpses = w.corpses.filter(c => G.freshCorpse(w, c));
      for (const hero of w.heroes) if (hero.healCooldown !== undefined) {
        if (hero.classId === 'healer') hero.cooldown = Math.max(hero.cooldown || 0, hero.healCooldown || 0);
        delete hero.healCooldown;
      }
      // Retain the strongest summon when loading a run made under the old cap.
      for (const hero of w.heroes) if (hero.classId === 'necromancer') {
        const excess = new Set(G.ownedSkeletons(w, hero).sort((a,b) => b.level - a.level || a.id - b.id).slice(G.NECROMANCER_LIMIT).map(s => s.id));
        w.skeletons = w.skeletons.filter(s => !excess.has(s.id));
      }
      for (const lair of w.lairs) {
        // Existing runs retain their original two-guard garrisons and map layout.
        lair.guardCount ??= 2;
        lair.nextGuardAt ??= w.time + 30;
      }
      for (const [old, current] of [['breaker', 'banner'], ['pathfinder', 'traps']]) {
        if (w.research[old]) { w.research[current] = true; delete w.research[old]; }
        for (const group of ['warrior', 'ranger']) if (w.choices[group] === old) w.choices[group] = current;
      }
      if (saved) return;
      G.addBuilding(w, 'castle', w.home.tx, w.home.ty);
      G.addBuilding(w, 'house', w.home.tx + 3, w.home.ty + 3);
      w.lairSites.forEach((site, i) => G.addLair(w, site, G.profiles[pace].firstWake + i * G.profiles[pace].wake));
      delete w.lairSites;
      G.reveal(w, w.home.x, w.home.y, 8);
    }
    update(dt) {
      if (!Number.isFinite(dt) || dt <= 0 || this.world.outcome) return;
      this.accumulator += Math.min(dt, 0.5);
      while (this.accumulator >= G.STEP && !this.world.outcome) { this.step(G.STEP); this.accumulator -= G.STEP; }
    }
    step(dt) {
      const w = this.world;
      if (G.resolveOutcome(w)) { w.score = G.score(w); return; }
      this.beforeStep?.(w);
      w.time += dt; w.tick++;
      w.corpses = w.corpses.filter(c => G.freshCorpse(w, c));
      G.updateLairs(w, dt);
      if (w.tick % 10 === 0) G.planExpeditions(w);
      G.updateHeroes(w, dt);
      if (!w.outcome) G.updateSkeletons(w, dt);
      if (!w.outcome) G.updateMonsters(w, dt);
      if (!w.outcome) G.updateTraps(w, dt);
      if (!w.outcome) G.updateBuildings(w, dt);
      G.separateHeroes(w, dt);
      w.effects.forEach(e => { e.age += dt; }); w.effects = w.effects.filter(e => e.age < e.duration);
      w.notices = w.notices.filter(n => n.until > w.time);
      w.monsters = w.monsters.filter(m => m.hp > 0 || w.time - m.hurtAt < 0.4);
      w.bounties = w.bounties.filter(b => {
        if (b.type === 'attack') return [...w.lairs, ...w.monsters].some(t => t.id === b.target && G.alive(t));
        if (b.type === 'explore') return !w.explored[G.index(w, b.x, b.y)];
        return true;
      });
      G.resolveOutcome(w);
      w.score = G.score(w);
    }
    snapshot() { return JSON.parse(JSON.stringify(this.world)); }
  }
  G.Simulation = Simulation;
})(globalThis);
