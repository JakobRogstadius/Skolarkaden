/* Persistent lair guardians and distinct, staggered village raids. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  G.monsterDamage = (w, monster) => (monster.attackDamage ?? G.monsterTypes[monster.type].damage * monster.strength) * G.profiles[w.pace].damage;
  G.monsterSpeed = monster => G.monsterTypes[monster.type].speed;
  G.spawnMonster = function(w, lair, { type = G.lairTypes[lair.type].monster, guard = false, wave = 0 } = {}) {
    const living = w.monsters.filter(G.alive);
    // Reserve enough room for two guardians at every original or spreading lair.
    if (living.length >= G.MAX_MONSTERS || !guard && living.filter(m => !m.guard).length >= G.MAX_RAIDERS) return null;
    const spec = G.monsterTypes[type], boss = guard && !!lair.boss;
    const point = G.freeNear(w, lair), strength = G.monsterStrength(lair);
    const bossStats = boss ? G.bossGuards[w.pace] : null;
    const hp = bossStats ? bossStats.hp : spec.hp * strength;
    const monster = { id: w.nextId++, type, monster: true, ...point, hp, maxHp: hp, strength, attackDamage: bossStats ? bossStats.damage : spec.damage * strength, rank: boss ? 3 + ['gentle', 'steady', 'brave'].indexOf(w.pace) : lair.tier + lair.level - 1, boss, guard, wave, lair: lair.id, cooldown: 0, route: [], routeKey: '', raidAt: w.time, patrolAt: w.time, stunnedUntil: 0, slowUntil: 0, born: w.time, facing: 1 };
    w.monsters.push(monster); return monster;
  };
  G.seedLairGuards = function(w, lair) {
    if (lair.guardsSeeded) return;
    lair.guardsSeeded = true;
    for (const type of G.lairGuards(lair)) G.spawnMonster(w, lair, { type, guard: true });
  };
  G.launchWave = function(w, lair) {
    const profile = G.profiles[w.pace];
    lair.waveCount = (lair.waveCount || 0) + 1;
    const count = Math.min(4, 2 + (lair.tier >= 3 ? 1 : 0) + (lair.level >= 3 ? 1 : 0));
    let sent = 0;
    for (let n = 0; n < count; n++) if (G.spawnMonster(w, lair, { wave: lair.waveCount })) sent++;
    lair.nextSpawn = w.time + Math.max(45, (82 - lair.level * 5) * profile.spawn);
    if (sent && lair.seen) {
      G.effect(w, 'wave', lair.x, lair.y, { color: '#efb284', duration: 1.5 });
      G.soundEvent?.(w, 'wave', lair, true);
    }
    w.revision++;
    return sent;
  };
  G.awakenLair = function(w, lair) {
    if (lair.awake || !G.alive(lair)) return false;
    lair.awake = true;
    lair.wakeAt = Math.min(lair.wakeAt, w.time);
    lair.nextGrowth = w.time + G.lairTypes[lair.type].interval * G.profiles[w.pace].growth;
    if (lair.seen) {
      G.notify(w, (lair.boss ? 'Tystnadens hjärta' : G.lairTypes[lair.type].name) + ' vaknade.', 'warn');
      G.soundEvent?.(w, 'awaken', lair, true);
    }
    G.launchWave(w, lair);
    return true;
  };
  G.alertLair = function(w, lair) {
    if (lair.defendersRaised) return;
    lair.defendersRaised = true;
    G.seedLairGuards(w, lair);
    G.awakenLair(w, lair);
  };
  function spread(w, lair) {
    // At most two additional nests in an entire run; cleared territory stays useful.
    if (lair.spread) return false;
    if (w.lairs.length >= G.profiles[w.pace].lairs + 2) { lair.spread = true; return false; }
    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = G.random(w) * Math.PI * 2;
      const tx = Math.round(lair.x + Math.cos(angle) * 6), ty = Math.round(lair.y + Math.sin(angle) * 6);
      if (Math.hypot(tx - G.castle(w).x, ty - G.castle(w).y) < 11) continue;
      let valid = true;
      for (let y = ty - 1; y <= ty + 2; y++) for (let x = tx - 1; x <= tx + 2; x++) if (!G.walkable(w, x, y) || G.occupant(w, x, y)) valid = false;
      if (!valid) continue;
      const entrance = { x: tx - .5, y: ty + .5 };
      const route = G.path(w, G.freeNear(w, G.castle(w)), entrance);
      if (!route.length || G.distance(route.at(-1), entrance) > .75) continue;
      const child = G.addLair(w, { type: 'spore', tx, ty, tier: 1, spread: true }, w.time + 75);
      child.spread = true; lair.spread = true;
      child.seen = !!w.explored[G.index(w, child.x, child.y)];
      if (child.seen || lair.seen) G.notify(w, 'En sporkupa slog rot.', 'warn');
      return true;
    }
    return false;
  }
  G.updateLairs = function(w) {
    const profile = G.profiles[w.pace];
    for (const lair of [...w.lairs]) {
      if (!G.alive(lair)) continue;
      if (lair.defendersRaised && w.time - (lair.hurtAt || 0) > 15) lair.hp = Math.min(lair.maxHp, lair.hp + lair.maxHp * 0.004 * G.STEP);
      if (!lair.awake) {
        if (!lair.warned && lair.wakeAt - w.time < 30) {
          lair.warned = true;
          if (lair.seen) G.notify(w, G.lairTypes[lair.type].name + ' börjar röra på sig.', 'warn');
        }
        if (w.time < lair.wakeAt) continue;
        G.awakenLair(w, lair);
      }
      if (w.time >= lair.nextGrowth) {
        if (lair.type === 'spore' && !lair.spread) spread(w, lair);
        else if (lair.level < 4) {
          lair.level++; lair.maxHp += 45; lair.hp += 45;
          if (lair.seen) G.notify(w, G.lairTypes[lair.type].name + ' växte.', 'warn');
        }
        lair.nextGrowth = w.time + G.lairTypes[lair.type].interval * profile.growth;
        w.revision++;
      }
      if (w.time >= lair.nextSpawn) G.launchWave(w, lair);
    }
  };
  function patrol(w, monster, home, dt) {
    monster.targetId = null;
    if (!monster.patrolGoal || G.distance(monster, monster.patrolGoal) < 0.5 || w.time >= monster.patrolAt) {
      const phase = monster.id * 2.39996 + w.time * 0.23;
      monster.patrolAt = w.time + 4 + G.random(w) * 3;
      for (let i = 0; i < 12; i++) {
        const angle = phase + i * Math.PI / 6, radius = 2.5 + (monster.id % 3) * 0.55;
        const point = { x: Math.floor(home.x + Math.cos(angle) * radius) + 0.5, y: Math.floor(home.y + Math.sin(angle) * radius) + 0.5 };
        if (G.open(w, point.x, point.y)) { monster.patrolGoal = point; monster.routeKey = ''; break; }
      }
    }
    if (monster.patrolGoal) G.move(w, monster, monster.patrolGoal, G.monsterSpeed(monster) * 0.65, dt);
    // A failed boss assault cannot be finished by repeatedly shooting across its leash.
    if (monster.boss && w.time - (monster.hurtAt ?? -100) > 12) monster.hp = Math.min(monster.maxHp, monster.hp + monster.maxHp * 0.015 * dt);
  }
  G.updateMonsters = function(w, dt) {
    const castle = G.castle(w), heroes = w.heroes.filter(G.alive), buildings = w.buildings.filter(G.alive);
    for (const monster of w.monsters) {
      if (!G.alive(monster) || monster.stunnedUntil > w.time) continue;
      const spec = G.monsterTypes[monster.type]; monster.cooldown = Math.max(0, monster.cooldown - dt);
      const home = w.lairs.find(l => l.id === monster.lair && G.alive(l));
      const defending = monster.guard && home;
      const nearby = heroes.filter(h => G.distance(h, monster) < (monster.boss ? 5.7 : 4.2) && (!defending || G.distance(h, home) < 7.5)).sort((a, b) => (G.distance(a, monster) - (a.classId === 'warrior' ? 1.6 : 0)) - (G.distance(b, monster) - (b.classId === 'warrior' ? 1.6 : 0)));
      let target = nearby[0];
      if (defending && (!target || G.distance(monster, home) > 7)) { patrol(w, monster, home, dt); continue; }
      if (!target && w.time < monster.raidAt && home) continue;
      if (!target) target = buildings.filter(b => G.distance(b, monster) < 3.3).sort((a, b) => G.distance(a, monster) - G.distance(b, monster))[0] || castle;
      if (!target || !G.alive(target)) continue;
      monster.targetId = target.id;
      const range = spec.range + (target.w ? Math.max(target.w, target.h) * 0.45 : 0);
      const inRange = G.distance(monster, target) <= range;
      const clear = !G.clearLine || G.clearLine(w, monster, target);
      if (!inRange || !clear) G.move(w, monster, target, spec.speed * (monster.slowUntil > w.time ? 0.45 : 1), dt);
      else if (monster.cooldown <= 0) {
        monster.cooldown = spec.cooldown; monster.attackAt = w.time;
        G.effect(w, 'slash', monster.x, monster.y, { toX: target.x, toY: target.y, color: monster.boss ? '#e7a3d1' : '#e69483', duration: 0.2 });
        G.soundEvent?.(w, monster.boss ? 'guardian' : 'monster', monster);
        G.damage(w, target, G.monsterDamage(w, monster), monster);
      }
    }
  };
})(globalThis);
