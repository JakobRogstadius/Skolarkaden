/* Autonomous decisions, temporary expeditions and cooperative class behaviour. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  G.heroPower = (w, h) => {
    const s = G.heroStats(w, h);
    return (s.damage * 1.5 + h.hp * 0.12 + (h.classId === 'healer' ? 15 : 0)) * G.traits[h.trait].courage;
  };
  G.threat = (w, target) => (target.wakeAt !== undefined ? 35 + target.hp * 0.13 + target.tier * 12 + (!target.defendersRaised ? G.lairGuards(target).reduce((n, type) => n + G.monsterTypes[type].hp * G.monsterStrength(target) * 0.18 + G.monsterTypes[type].damage, 0) : 0) : 15) + w.monsters.filter(m => G.alive(m) && G.distance(m, target) < 5).reduce((n, m) => n + m.hp * 0.18 + G.monsterTypes[m.type].damage, 0);
  G.bountyTarget = (w, bounty) => bounty.type === 'attack' ? [...w.lairs, ...w.monsters].find(t => t.id === bounty.target && G.alive(t)) : bounty;
  G.expeditionReadiness = function(w, expedition) {
    const bounty = w.bounties.find(b => b.id === expedition.bounty);
    const target = bounty && G.bountyTarget(w, bounty);
    if (!target) return 0;
    const power = expedition.members.map(id => w.heroes.find(h => h.id === id)).filter(h => h && G.alive(h) && !h.retreating).reduce((n, h) => n + G.heroPower(w, h), 0);
    return bounty.type !== 'attack' ? 2 : power / Math.max(1, G.threat(w, target));
  };
  G.planExpeditions = function(w) {
    for (const expedition of w.expeditions) {
      expedition.members = expedition.members.filter(id => {
        const hero = w.heroes.find(h => h.id === id);
        return hero && G.alive(hero) && !hero.retreating && hero.expedition === expedition.id;
      });
      if (!w.bounties.some(b => b.id === expedition.bounty) || !expedition.members.length) {
        for (const hero of w.heroes) if (hero.expedition === expedition.id) { hero.expedition = null; hero.routeKey = ''; }
        expedition.done = true;
      }
    }
    w.expeditions = w.expeditions.filter(e => !e.done);
    for (const bounty of [...w.bounties].sort((a, b) => b.level - a.level || a.created - b.created)) {
      const target = G.bountyTarget(w, bounty);
      if (!target || (bounty.retryAt || 0) > w.time) continue;
      let expedition = w.expeditions.find(e => e.bounty === bounty.id);
      const max = bounty.type === 'explore' ? 1 : bounty.type === 'defend' ? 2 + bounty.level : 2 + bounty.level * 2;
      const candidates = w.heroes.filter(h => G.alive(h) && !h.retreating && !h.expedition && h.hp > h.maxHp * 0.58);
      if (!candidates.length && !expedition) continue;
      if (!expedition) {
        const point = G.freeNear(w, G.castle(w), 3);
        expedition = { id: w.nextId++, bounty: bounty.id, members: [], state: 'gather', created: w.time, progressAt: w.time, targetHp: target.hp, ...point, reason: 'Samlar vänner' };
        w.expeditions.push(expedition);
      }
      while (candidates.length && expedition.members.length < max) {
        const roles = expedition.members.map(id => w.heroes.find(h => h.id === id)?.classId);
        const preference = h => (bounty.type === 'explore' ? (h.classId === 'ranger' ? 100 : 0) : !roles.includes(h.classId) ? 30 : 0) + (h.classId === 'warrior' ? 20 : h.classId === 'healer' ? 15 : 0) + h.level * 2 - G.distance(h, expedition) * 0.4;
        candidates.sort((a, b) => preference(b) - preference(a));
        const hero = candidates.shift(); hero.expedition = expedition.id; hero.routeKey = ''; expedition.members.push(hero.id);
      }
      const readiness = G.expeditionReadiness(w, expedition);
      if (target.hp !== expedition.targetHp) { expedition.targetHp = target.hp; expedition.progressAt = w.time; }
      if (expedition.state === 'march') {
        if (bounty.type !== 'attack' || (readiness >= 0.5 && w.time - expedition.progressAt < 70)) continue;
        Object.assign(expedition, G.freeNear(w, G.castle(w), 3), { state: 'gather', created: w.time, progressAt: w.time, reason: 'Samlar om' });
        for (const id of expedition.members) w.heroes.find(h => h.id === id).routeKey = '';
      }
      const threshold = w.bellUntil > w.time ? 0.8 : 0.94 - bounty.level * 0.035;
      const together = expedition.members.every(id => G.distance(w.heroes.find(h => h.id === id), expedition) < 4);
      if (readiness >= threshold && w.time - expedition.created > (bounty.type === 'explore' ? 0 : 4) && (together || w.time - expedition.created > 18)) {
        expedition.state = 'march'; expedition.reason = 'På väg'; w.revision++;
      } else {
        const roles = expedition.members.map(id => w.heroes.find(h => h.id === id)?.classId);
        expedition.reason = readiness < threshold ? expedition.members.length >= max ? 'Höj belöningen' : !roles.includes('healer') ? 'Söker läkekraft' : 'Behöver fler vänner' : 'Samlar vänner';
        if (readiness < threshold && w.time - expedition.created > 45) {
          bounty.retryAt = w.time + 10; bounty.waitReason = expedition.reason;
          for (const id of expedition.members) w.heroes.find(h => h.id === id).expedition = null;
          expedition.members = [];
        }
      }
    }
  };
  function findScoutGoal(w, hero) {
    let best = null, bestScore = Infinity;
    for (let y = 2; y < w.height - 2; y += 2) for (let x = 2; x < w.width - 2; x += 2) {
      if (w.explored[G.index(w, x, y)] || !G.open(w, x, y)) continue;
      const position = { x: x + 0.5, y: y + 0.5 };
      const danger = w.lairs.some(l => G.alive(l) && l.awake && G.distance(l, position) < 3) ? 20 : 0;
      const score = G.distance(hero, position) + danger + G.random(w) * 2;
      if (score < bestScore) { best = position; bestScore = score; }
    }
    return best;
  }
  function heal(w, hero) {
    if (hero.classId !== 'healer' || hero.healCooldown > 0) return false;
    const patients = w.heroes.filter(h => G.alive(h) && h.hp < h.maxHp * 0.94 && G.distance(h, hero) < 4.2).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    if (!patients.length) return false;
    hero.healCooldown = 2.1;
    for (const patient of patients.slice(0, w.research.bloom ? 4 : 1)) {
      const amount = Math.min(patient.maxHp - patient.hp, 16 + hero.level * 3);
      patient.hp += amount; hero.healing += amount; w.stats.healed += amount;
      hero.contributedAt = w.time;
      if (w.research.ward) patient.shieldUntil = w.time + 4;
      const learning = Math.min(amount * 0.13, Math.max(0, 30 + w.destroyed * 20 - (hero.supportXp || 0)));
      hero.supportXp = (hero.supportXp || 0) + learning; G.gainXp(w, hero, learning);
      G.effect(w, 'heal', patient.x, patient.y, { color: '#b1e6b1', duration: 0.7 });
      G.effect(w, 'bolt', hero.x, hero.y, { toX: patient.x, toY: patient.y, color: '#b1e6b1', duration: 0.3 });
    }
    hero.task = 'Läker vänner'; return true;
  }
  function strike(w, hero, target, stats) {
    if (hero.cooldown > 0) return;
    hero.cooldown = stats.cooldown; hero.attackAt = w.time; hero.contributedAt = w.time;
    let damage = stats.damage;
    const structure = target.wakeAt !== undefined;
    if (structure && hero.classId === 'warrior' && w.research.breaker) damage *= 2;
    const mastery = hero.classId === 'mage' && w.research.mastery && hero.level >= 5 && (hero.masteryAt || 0) < w.time;
    if (mastery) { damage *= 3; hero.masteryAt = w.time + 8; G.effect(w, 'bell', target.x, target.y, { duration: 1.3, color: '#cfbcff' }); }
    G.effect(w, hero.classId === 'warrior' ? 'slash' : 'bolt', hero.x, hero.y, { toX: target.x, toY: target.y, color: G.classes[hero.classId].color, duration: 0.26 });
    G.damage(w, target, damage, hero);
    if (hero.classId === 'mage') {
      for (const monster of w.monsters) if (G.alive(monster) && G.distance(monster, target) < (w.research.echo || mastery ? 2.6 : 1.5)) {
        if (monster !== target) G.damage(w, monster, damage * (w.research.echo ? 0.8 : 0.5), hero);
        if (w.research.frost) monster.slowUntil = w.time + 3.5;
      }
    }
  }
  G.updateHeroes = function(w, dt) {
    const castle = G.castle(w), enemies = w.monsters.filter(G.alive);
    const buildings = new Set(w.buildings.filter(G.alive).map(b => b.id));
    const sanctuary = G.hasBuilding(w, 'conservatory');
    for (const hero of w.heroes) {
      if (!G.alive(hero)) continue;
      hero.cooldown = Math.max(0, hero.cooldown - dt); hero.healCooldown = Math.max(0, hero.healCooldown - dt);
      const stats = G.heroStats(w, hero);
      if (w.tick % 10 === 0) {
        const explored = G.reveal(w, hero.x, hero.y, hero.classId === 'ranger' ? w.research.pathfinder ? 6 : 4.8 : 3.3);
        hero.scouting += explored; w.stats.explored += explored; G.gainXp(w, hero, explored * 0.045);
      }
      const sheltered = G.distance(hero, castle) < 5;
      if (w.time - (hero.hurtAt || -10) > 3) hero.hp = Math.min(hero.maxHp, hero.hp + dt * (sheltered ? 4 : sanctuary ? 2 : 0.5));
      if (hero.hp < hero.maxHp * (G.traits[hero.trait].id === 'careful' ? 0.38 : 0.25)) {
        hero.retreating = true; hero.expedition = null;
      }
      if (hero.retreating) {
        hero.task = 'Återhämtar sig';
        if (hero.hp >= hero.maxHp * 0.86) { hero.retreating = false; hero.routeKey = ''; }
        else {
          const refuges = w.buildings.filter(b => G.alive(b) && ['castle', 'garden'].includes(b.type));
          const refuge = refuges.sort((a, b) => G.distance(hero, a) - G.distance(hero, b))[0] || castle;
          if (G.distance(hero, refuge) > 2.5) G.move(w, hero, refuge, stats.speed * 1.15, dt);
          heal(w, hero); continue;
        }
      }
      const healed = heal(w, hero);
      const guarding = !hero.expedition && hero.classId !== 'ranger';
      const emergency = (!hero.expedition || w.bellUntil > w.time) && G.distance(hero, castle) < 14
        ? enemies.filter(G.alive).filter(m => m.targetId === castle.id || G.distance(m, castle) < 4 || buildings.has(m.targetId) && G.distance(m, castle) < 9).sort((a, b) => (a.targetId === castle.id ? -100 : G.distance(a, castle)) - (b.targetId === castle.id ? -100 : G.distance(b, castle)))[0] : null;
      let target = emergency || enemies.filter(G.alive).filter(m => G.distance(hero, m) < (hero.classId === 'warrior' ? 5 : 5.5) && (!guarding || G.distance(m, castle) < 8)).sort((a, b) => G.distance(hero, a) - G.distance(hero, b))[0];
      if (target) {
        const distance = G.distance(hero, target);
        hero.task = healed ? 'Läker vänner' : 'Försvarar';
        if (hero.classId !== 'warrior' && distance < 1.4) {
          const length = distance || 1;
          const away = { x: G.clamp(hero.x + (hero.x - target.x) / length * 2, 1.5, w.width - 1.5), y: G.clamp(hero.y + (hero.y - target.y) / length * 2, 1.5, w.height - 1.5) };
          if (G.open(w, away.x, away.y)) G.move(w, hero, away, stats.speed, dt);
        } else if (distance > stats.range) G.move(w, hero, target, stats.speed, dt);
        if (distance <= stats.range + 0.2 && !healed) strike(w, hero, target, stats);
        continue;
      }
      const expedition = w.expeditions.find(e => e.id === hero.expedition);
      const bounty = expedition && w.bounties.find(b => b.id === expedition.bounty);
      const destination = bounty && G.bountyTarget(w, bounty);
      if (expedition && destination) {
        if (expedition.state === 'gather') {
          hero.task = expedition.reason;
          if (G.distance(hero, expedition) > 1.3) G.move(w, hero, expedition, stats.speed, dt);
          continue;
        }
        const members = expedition.members.map(id => w.heroes.find(h => h.id === id)).filter(h => h && G.alive(h) && !h.retreating);
        const leader = members.find(h => h.classId === 'warrior') || members.find(h => h.classId !== 'healer') || hero;
        if (hero.classId === 'healer' && leader !== hero && G.distance(hero, leader) > 2) {
          hero.task = 'Följer ' + leader.name; G.move(w, hero, leader, stats.speed, dt); continue;
        }
        hero.task = bounty.type === 'attack' ? 'På expedition' : bounty.type === 'explore' ? 'Utforskar' : 'Vaktar platsen';
        const distance = G.distance(hero, destination);
        const range = stats.range + (destination.w ? 0.9 : 0);
        if (bounty.type === 'attack' && distance <= range) {
          if (hero.classId !== 'healer' || !healed) strike(w, hero, destination, stats);
        } else if (distance > (bounty.type === 'defend' ? 1.5 : bounty.type === 'explore' ? 0.8 : range)) {
          const straggler = hero === leader && members.some(h => h !== hero && G.distance(h, hero) > 4.5);
          if (!straggler) G.move(w, hero, destination, stats.speed, dt);
          else hero.task = 'Väntar in vänner';
        }
        continue;
      }
      hero.expedition = null;
      // After the final lair, everyone helps finish the visible cleanup.
      if (!w.lairs.some(G.alive) && enemies.some(G.alive)) {
        target = enemies.filter(G.alive).sort((a, b) => G.distance(a, hero) - G.distance(b, hero))[0];
        hero.task = 'Söker de sista'; G.move(w, hero, target, stats.speed, dt); continue;
      }
      if (hero.classId === 'healer') {
        const patient = w.heroes.filter(h => G.alive(h) && h.classId !== 'healer' && h.hp < h.maxHp * 0.75).sort((a, b) => G.distance(a, hero) - G.distance(b, hero))[0];
        if (patient && G.distance(patient, castle) < 9) { hero.task = 'Följer ' + patient.name; if (G.distance(hero, patient) > 2) G.move(w, hero, patient, stats.speed, dt); continue; }
      }
      if (hero.classId === 'ranger' && w.time > hero.rethinkAt) {
        hero.scoutGoal = findScoutGoal(w, hero); hero.rethinkAt = w.time + 9;
      }
      if (hero.classId === 'ranger' && hero.scoutGoal) {
        hero.task = 'Utforskar'; G.move(w, hero, hero.scoutGoal, stats.speed, dt);
      } else {
        hero.task = 'Vaktar gläntan';
        if (G.distance(hero, castle) > 3.5) G.move(w, hero, castle, stats.speed, dt);
      }
    }
  };
})(globalThis);
