/* Visible, finite escalation: dormant lairs, growth and bounded spore spreading. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  G.spawnMonster = function(w, lair, { type = G.lairTypes[lair.type].monster, guard = false } = {}) {
    if (w.monsters.filter(G.alive).length >= G.MAX_MONSTERS) return null;
    const spec = G.monsterTypes[type];
    const point = G.freeNear(w, lair), strength = G.monsterStrength(lair);
    const monster = { id: w.nextId++, type, monster: true, ...point, hp: spec.hp * strength, maxHp: spec.hp * strength, strength, rank: lair.tier + lair.level - 1, guard, lair: lair.id, cooldown: 0, route: [], routeKey: '', raidAt: w.time + 14 + G.random(w) * 13, stunnedUntil: 0, slowUntil: 0, born: w.time, facing: 1 };
    w.monsters.push(monster); return monster;
  };
  G.alertLair = function(w, lair) {
    if (lair.defendersRaised) return;
    lair.defendersRaised = true;
    if (!lair.awake) { lair.awake = true; lair.nextSpawn = w.time + 32; lair.nextGrowth = w.time + G.lairTypes[lair.type].interval * G.profiles[w.pace].growth; }
    for (const type of G.lairGuards(lair)) G.spawnMonster(w, lair, { type, guard: true });
    G.notify(w, G.lairTypes[lair.type].name + ' försvarar sig!', 'warn');
  };
  function spread(w, lair) {
    // At most two additional nests in an entire run; cleared territory stays valuable.
    if (lair.spread) return false;
    if (w.lairs.length >= G.profiles[w.pace].lairs + 2) { lair.spread = true; return false; }
    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = G.random(w) * Math.PI * 2;
      const tx = Math.round(lair.x + Math.cos(angle) * 5), ty = Math.round(lair.y + Math.sin(angle) * 5);
      if (Math.hypot(tx - G.castle(w).x, ty - G.castle(w).y) < 9) continue;
      let valid = true;
      for (let y = ty - 1; y <= ty + 2; y++) for (let x = tx - 1; x <= tx + 2; x++) if (!G.walkable(w, x, y) || G.occupant(w, x, y)) valid = false;
      if (!valid) continue;
      const child = G.addLair(w, { type: 'spore', tx, ty, tier: 1, spread: true }, w.time + 65);
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
        lair.awake = true; w.revision++;
        if (lair.seen) G.notify(w, G.lairTypes[lair.type].name + ' vaknade.', 'warn');
        G.spawnMonster(w, lair);
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
      if (w.time >= lair.nextSpawn) {
        G.spawnMonster(w, lair);
        if (lair.level >= 3) G.spawnMonster(w, lair);
        lair.nextSpawn = w.time + Math.max(20, (46 - lair.tier * 3 - lair.level * 3) * profile.spawn);
      }
    }
  };
  G.updateMonsters = function(w, dt) {
    const castle = G.castle(w), heroes = w.heroes.filter(G.alive), buildings = w.buildings.filter(G.alive);
    for (const monster of w.monsters) {
      if (!G.alive(monster) || monster.stunnedUntil > w.time) continue;
      const spec = G.monsterTypes[monster.type]; monster.cooldown = Math.max(0, monster.cooldown - dt);
      // Front-line warriors draw attention without overriding distant positioning.
      const home = w.lairs.find(l => l.id === monster.lair && G.alive(l));
      const nearby = heroes.filter(h => G.distance(h, monster) < 4.2 && (!monster.guard || !home || G.distance(h, home) < 7)).sort((a, b) => (G.distance(a, monster) - (a.classId === 'warrior' ? 1.6 : 0)) - (G.distance(b, monster) - (b.classId === 'warrior' ? 1.6 : 0)));
      let target = nearby[0];
      if (!target && monster.guard && home) { if (G.distance(monster, home) > 2.5) G.move(w, monster, home, spec.speed, dt); continue; }
      if (!target && w.time < monster.raidAt && w.lairs.some(l => l.id === monster.lair && G.alive(l))) continue;
      if (!target) target = buildings.filter(b => G.distance(b, monster) < 3.3).sort((a, b) => G.distance(a, monster) - G.distance(b, monster))[0] || castle;
      if (!target || !G.alive(target)) continue;
      monster.targetId = target.id;
      const range = spec.range + (target.w ? Math.max(target.w, target.h) * 0.45 : 0);
      if (G.distance(monster, target) > range) G.move(w, monster, target, spec.speed * (monster.slowUntil > w.time ? 0.45 : 1), dt);
      else if (monster.cooldown <= 0) {
        monster.cooldown = spec.cooldown; monster.attackAt = w.time;
        G.effect(w, 'slash', monster.x, monster.y, { toX: target.x, toY: target.y, color: '#e69483', duration: 0.2 });
        G.damage(w, target, spec.damage * monster.strength * G.profiles[w.pace].damage, monster);
      }
    }
  };
})(globalThis);
