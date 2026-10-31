/* Persistent lair guardians and distinct, staggered village raids. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  G.monsterDamage = (w, monster) => (monster.attackDamage ?? G.monsterTypes[monster.type].damage * monster.strength) * G.profiles[w.pace].damage;
  G.monsterSpeed = monster => G.monsterTypes[monster.type].speed;
  G.spawnMonster = function(w, lair, { type = G.lairTypes[lair.type].monster, guard = false, wave = 0, at = null, broodParent = null } = {}) {
    const living = w.monsters.filter(G.alive);
    // Raid capacity leaves room for every original or spreading lair's garrison.
    if (living.length >= G.MAX_MONSTERS || !guard && living.filter(m => !m.guard).length >= G.MAX_RAIDERS) return null;
    const spec = G.monsterTypes[type], boss = guard && !!lair.boss;
    const point = G.freeNear(w, at || lair), strength = broodParent ? 1 : G.monsterStrength(lair);
    const bossStats = boss ? G.bossGuards[w.pace] : null;
    const hp = bossStats ? bossStats.hp : spec.hp * strength;
    const monster = { id: w.nextId++, type, monster: true, ...point, hp, maxHp: hp, strength, attackDamage: bossStats ? bossStats.damage : spec.damage * strength, rank: broodParent ? 1 : boss ? 3 + ['gentle', 'steady', 'brave'].indexOf(w.pace) : lair.tier + lair.level - 1, boss, guard, wave, broodParent, lair: lair.id, cooldown: 0, route: [], routeKey: '', raidAt: w.time, patrolAt: w.time, stunnedUntil: 0, slowUntil: 0, born: w.time, facing: 1 };
    w.monsters.push(monster); return monster;
  };
  G.seedLairGuards = function(w, lair) {
    if (lair.guardsSeeded) return;
    lair.guardsSeeded = true;
    G.replenishLairGuards(w, lair);
  };
  G.replenishLairGuards = function(w, lair) {
    if (!G.alive(lair)) return;
    const types = G.lairGuards(lair);
    const living = w.monsters.filter(m => G.alive(m) && m.guard && m.lair === lair.id).length;
    for (let i = living; i < types.length; i++) G.spawnMonster(w, lair, { type: types[i], guard: true });
    if (living < types.length) w.revision++;
  };
  function sendWave(w, lair, formation) {
    let sent = 0;
    while (formation.length && G.spawnMonster(w, lair, { type: formation[0], wave: lair.waveCount })) { formation.shift(); sent++; }
    if (sent && lair.seen) {
      G.effect(w, 'wave', lair.x, lair.y, { color: '#efb284', duration: 1.5 });
      G.soundEvent?.(w, 'wave', lair, true);
    }
    if (sent) w.revision++;
    return sent;
  }
  G.launchWave = function(w, lair) {
    const profile = G.profiles[w.pace];
    lair.waveCount = (lair.waveCount || 0) + 1;
    const family = G.lairTypes[lair.type];
    const sizes = G.lairWave(lair);
    const formation = [...Array(sizes.basic).fill(family.monster), ...Array(sizes.advanced).fill(family.support)];
    const sent = sendWave(w, lair, formation);
    // A final wave must not disappear when the live-monster limit is full.
    if (!G.alive(lair) && formation.length) lair.pendingWave = formation;
    // Preserve the regrouping interval for larger waves after the first upgrade.
    lair.nextSpawn = w.time + Math.max(50, (82 - lair.level * 5 + (lair.level >= 2 ? 22 : 0)) * profile.spawn);
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
    // Finish destruction waves before living nests claim newly available raid slots.
    for (const lair of w.lairs) if (lair.pendingWave?.length) {
      sendWave(w, lair, lair.pendingWave);
      if (!lair.pendingWave.length) delete lair.pendingWave;
    }
    for (const lair of [...w.lairs]) {
      if (!G.alive(lair)) continue;
      if (w.time >= lair.nextGuardAt) {
        G.replenishLairGuards(w, lair);
        lair.nextGuardAt = w.time + 30;
      }
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
        if (lair.level < 4) {
          lair.level++; lair.maxHp += 45; lair.hp += 45;
          if (lair.seen) G.notify(w, G.lairTypes[lair.type].name + ' växte till nivå ' + lair.level + '.' + (lair.level >= 3 ? ' ' + G.monsterTypes[G.lairTypes[lair.type].support].name + ' följer anfallen!' : ''), 'warn');
          G.launchWave(w, lair);
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
    if (monster.patrolGoal) G.moveMonster(w, monster, monster.patrolGoal, G.monsterSpeed(monster) * 0.8, dt);
    // A failed boss assault cannot be finished by repeatedly shooting across its leash.
    if (monster.boss && w.time - (monster.hurtAt ?? -100) > 12) monster.hp = Math.min(monster.maxHp, monster.hp + monster.maxHp * 0.015 * dt);
  }
  G.moveMonster = function(w, monster, destination, speed, dt) {
    if (monster.rootedUntil > w.time) return;
    if (!G.flying(monster)) return G.move(w, monster, destination, speed, dt);
    const dx = destination.x - monster.x, dy = destination.y - monster.y, distance = Math.hypot(dx, dy);
    if (!distance) return;
    const step = Math.min(distance, speed * dt);
    monster.x = G.clamp(monster.x + dx / distance * step, 1.1, w.width - 1.1);
    monster.y = G.clamp(monster.y + dy / distance * step, 1.1, w.height - 1.1);
    monster.facing = dx < 0 ? -1 : 1; monster.movedAt = w.time;
  };
  function support(w, monster, spec, dt) {
    if (!spec.medic) return false;
    const patients = w.monsters.filter(m => m !== monster && G.alive(m) && m.hp < m.maxHp * .9 && G.distance(m, monster) < 4.5 && G.attackLine(w, monster, m)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    if (patients.length && (monster.healAt || 0) <= w.time) {
      monster.healAt = w.time + 3.4; monster.castAt = w.time;
      for (const patient of patients.slice(0, 2)) {
        patient.hp = Math.min(patient.maxHp, patient.hp + 14 * monster.strength);
        G.effect(w, 'spell', monster.x, monster.y, { toX: patient.x, toY: patient.y, school: 'mend', color: '#ffd58a', radius: .65, duration: .8 });
      }
      G.soundEvent(w, 'heal', monster); return true;
    }
    const front = w.monsters.filter(m => m !== monster && G.alive(m) && m.lair === monster.lair && m.wave === monster.wave && !G.monsterTypes[m.type].medic && !m.guard).sort((a, b) => G.distance(a, G.castle(w)) - G.distance(b, G.castle(w)))[0];
    if (front && G.distance(front, monster) > 2.5) { G.moveMonster(w, monster, front, spec.speed, dt); return true; }
    return false;
  }
  G.updateMonsters = function(w, dt) {
    const castle = G.castle(w), heroes = G.allies(w), buildings = w.buildings.filter(G.alive);
    for (const monster of [...w.monsters]) {
      if (w.outcome) break;
      if (!G.alive(monster) || monster.stunnedUntil > w.time) continue;
      const spec = G.monsterTypes[monster.type]; monster.cooldown = Math.max(0, monster.cooldown - dt);
      const home = w.lairs.find(l => l.id === monster.lair && G.alive(l));
      const defending = monster.guard && home;
      const nearby = heroes.filter(h => G.alive(h) && G.distance(h, monster) < (monster.boss ? 5.7 : 5.5) && (!defending || G.distance(h, home) < 7.5)).sort((a, b) => (G.distance(a, monster) - (a.classId === 'warrior' ? 1.6 : 0)) - (G.distance(b, monster) - (b.classId === 'warrior' ? 1.6 : 0)));
      let target = nearby[0];
      if (defending && (!target || G.distance(monster, home) > 7)) { patrol(w, monster, home, dt); continue; }
      if (!target && w.time < monster.raidAt && home) continue;
      if (spec.siege) target = buildings.filter(G.alive).sort((a, b) => G.distance(a, monster) - G.distance(b, monster))[0];
      if (!target) target = buildings.filter(b => G.distance(b, monster) < 3.3).sort((a, b) => G.distance(a, monster) - G.distance(b, monster))[0] || castle;
      if (!target || !G.alive(target)) continue;
      monster.targetId = target.id;
      if (support(w, monster, spec, dt)) continue;
      if (spec.brood && G.distance(monster, target) < 4.5 && (monster.broodAt || 0) <= w.time) {
        monster.broodAt = w.time + 9;
        const count = w.monsters.filter(m => G.alive(m) && m.broodParent === monster.id).length;
        const lair = w.lairs.find(l => l.id === monster.lair);
        if (count < 3 && lair) {
          const child = G.spawnMonster(w, lair, { type: 'sporeling', wave: monster.wave, at: monster, broodParent: monster.id });
          if (child) G.effect(w, 'raise', child.x, child.y, { duration: .9, color: '#efa2d4' });
        }
      }
      const range = spec.range + (target.w ? Math.max(target.w, target.h) * 0.45 : 0);
      const inRange = G.distance(monster, target) <= range;
      const clear = G.attackLine(w, monster, target), distance = G.distance(monster, target);
      if (spec.rush && distance > 2 && distance < 5 && (monster.rushAt || 0) <= w.time) { monster.rushUntil = w.time + .8; monster.rushAt = w.time + 6; }
      const speed = spec.speed * (monster.slowUntil > w.time ? .45 : 1) * (monster.rushUntil > w.time ? 1.7 : 1);
      if (spec.kite && !target.w && distance < 1.8 && (monster.kiteAt || 0) <= w.time) {
        const away = { x: monster.x + (monster.x - target.x) / Math.max(.1, distance) * 2, y: monster.y + (monster.y - target.y) / Math.max(.1, distance) * 2 };
        if (G.open(w, away.x, away.y)) { monster.kiteGoal = away; monster.kiteUntil = w.time + .9; monster.kiteAt = w.time + 3; }
      }
      if (monster.kiteUntil > w.time) G.moveMonster(w, monster, monster.kiteGoal, speed, dt);
      else if (!inRange || !clear) G.moveMonster(w, monster, target, speed, dt);
      if (inRange && clear && monster.cooldown <= 0) {
        monster.cooldown = spec.cooldown; monster.attackAt = w.time;
        G.effect(w, spec.spell ? 'spell' : spec.range > 2 ? 'bolt' : 'slash', monster.x, monster.y, { toX: target.x, toY: target.y, school: 'enemy', color: monster.boss ? '#e7a3d1' : '#ff8c8a', radius: spec.spell ? 1.25 : .4, duration: spec.spell ? .8 : .3 });
        if (spec.bind && !target.w && (monster.bindAt || 0) <= w.time && (target.rootGraceUntil || 0) <= w.time) {
          target.rootedUntil = Math.max(target.rootedUntil || 0, w.time + 2.2); target.rootGraceUntil = w.time + 4.5; monster.bindAt = w.time + 6.5;
          G.effect(w, 'snare', target.x, target.y, { duration: 1, color: '#c7a3e6' });
        }
        G.soundEvent?.(w, monster.boss ? 'guardian' : spec.spell ? 'mage' : 'monster', monster);
        G.damage(w, target, G.monsterDamage(w, monster), monster);
        if (monster.type === 'husher') for (const friend of heroes) if (friend !== target && G.alive(friend) && G.distance(friend, target) < 1.25 && G.attackLine(w, target, friend)) G.damage(w, friend, G.monsterDamage(w, monster) * .35, monster);
      }
    }
  };
})(globalThis);
