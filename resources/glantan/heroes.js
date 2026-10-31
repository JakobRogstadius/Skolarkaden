/* Autonomous decisions, temporary expeditions and cooperative class behaviour. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  G.heroSight = (w, hero) => hero.classId === 'ranger' ? 6 : 3.3;
  G.heroPower = (w, h) => {
    const s = G.heroStats(w, h);
    return (s.damage * 1.5 + h.hp * 0.12 + (h.classId === 'healer' ? 15 : h.classId === 'necromancer' ? G.ownedSkeletons(w, h).reduce((n, s) => n + 10 + s.hp * .1, 0) : 0)) * G.traits[h.trait].courage;
  };
  G.threat = (w, target) => (target.wakeAt !== undefined ? 35 + target.hp * 0.13 + target.tier * 12 : 15) + w.monsters.filter(m => G.alive(m) && (G.distance(m, target) < 6 || m.guard && m.lair === target.id)).reduce((n, m) => n + m.hp * 0.18 + G.monsterDamage(w, m), 0);
  G.bountyTarget = (w, bounty) => bounty.type === 'attack' ? [...w.lairs, ...w.monsters].find(t => t.id === bounty.target && G.alive(t)) : bounty;
  G.bossDemand = (w, lair) => lair.suggestedLevels * (0.25 + 0.75 * Math.min(1,
    w.monsters.filter(m => G.alive(m) && m.guard && m.lair === lair.id).reduce((n, m) => n + m.hp, 0) / (lair.guardCount * G.bossGuards[w.pace].hp)));
  G.expeditionReadiness = function(w, expedition) {
    const bounty = w.bounties.find(b => b.id === expedition.bounty);
    const target = bounty && G.bountyTarget(w, bounty);
    if (!target) return 0;
    const members = expedition.members.map(id => w.heroes.find(h => h.id === id)).filter(h => h && G.alive(h) && !h.retreating);
    if (target.boss && target.wakeAt !== undefined) {
      const levels = members.reduce((n, h) => n + h.level * h.hp / h.maxHp, 0);
      const balanced = members.some(h => h.classId === 'warrior') && members.some(h => h.classId === 'healer');
      return levels * (balanced ? 1.05 : 0.85) / Math.max(1, G.bossDemand(w, target));
    }
    const power = members.reduce((n, h) => n + G.heroPower(w, h), 0);
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
      const max = bounty.type === 'explore' ? 1 : bounty.type === 'defend' ? 2 + bounty.level : 2 + bounty.level * (target.boss ? 3 : 2);
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
      const encounterHp = (target.hp || 0) + w.monsters.filter(m => G.alive(m) && m.guard && m.lair === target.id).reduce((sum, m) => sum + m.hp, 0);
      if (encounterHp < expedition.targetHp - .1) expedition.progressAt = w.time;
      expedition.targetHp = encounterHp;
      if (expedition.state === 'march') {
        const distance = Math.min(...expedition.members.map(id => G.distance(w.heroes.find(h => h.id === id), target)));
        if (distance < (expedition.distanceLeft ?? Infinity) - 1) { expedition.distanceLeft = distance; expedition.progressAt = w.time; }
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
  const scoutVisibility = new WeakMap(), sightCircles = new Map();
  function findScoutGoal(w, hero) {
    let best = null, bestScore = Infinity;
    const radius = G.heroSight(w, hero), stride = w.width + 1;
    let visibility = scoutVisibility.get(w);
    if (!visibility || visibility.revision !== w.fogRevision) {
      const rows = new Uint16Array(stride * w.height);
      for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) rows[y * stride + x + 1] = rows[y * stride + x] + (w.explored[y * w.width + x] ? 0 : 1);
      visibility = { revision: w.fogRevision, rows }; scoutVisibility.set(w, visibility);
    }
    if (!sightCircles.has(radius)) {
      const circle = [];
      for (let dy = -Math.floor(radius); dy <= radius; dy++) circle.push([dy, Math.floor(Math.sqrt(radius * radius - dy * dy))]);
      sightCircles.set(radius, circle);
    }
    const scan = (left, right, top, bottom) => {
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const position = { x: x + .5, y: y + .5 }, distance = G.distance(hero, position);
        // Discovery benefit is capped at 2.4, so more distant points cannot win.
        if (distance - 2.4 > bestScore || !G.open(w, x, y)) continue;
        if (w.lairs.some(l => G.alive(l) && G.distance(l, position) < 5)) continue;
        // Known ground can still be a useful viewpoint for a fogged lair.
        let unseen = 0;
        for (const [dy, dx] of sightCircles.get(radius)) {
          const row = y + dy;
          if (row >= 0 && row < w.height) unseen += visibility.rows[row * stride + Math.min(w.width, x + dx + 1)] - visibility.rows[row * stride + Math.max(0, x - dx)];
        }
        if (!unseen) continue;
        const danger = w.monsters.some(m => G.alive(m) && G.distance(m, position) < 5) ? 20 : 0;
        const score = distance + danger - Math.min(30, unseen) * .08;
        if (score < bestScore || score === bestScore && (!best || y < best.y - .5 || y === best.y - .5 && x < best.x - .5)) { best = position; bestScore = score; }
      }
    };
    const reach = Math.ceil(radius * 2), x = Math.floor(hero.x), y = Math.floor(hero.y);
    scan(Math.max(1,x-reach), Math.min(w.width-2,x+reach), Math.max(1,y-reach), Math.min(w.height-2,y+reach));
    if (!best || bestScore >= reach - 3) scan(1,w.width-2,1,w.height-2);
    return best;
  }
  function heal(w, hero) {
    if (hero.classId !== 'healer' || hero.cooldown > 0) return false;
    const patients = w.heroes.filter(h => G.alive(h) && h.hp < h.maxHp * 0.94 && G.distance(h, hero) < 4.2 && G.clearLine(w, hero, h)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    if (!patients.length) return false;
    hero.cooldown = 2.1; hero.castAt = w.time;
    G.soundEvent(w, 'heal', hero);
    for (const patient of patients.slice(0, w.research.bloom ? 4 : 1)) {
      const amount = Math.min(patient.maxHp - patient.hp, 16 + hero.level * 3);
      patient.hp += amount; hero.healing += amount; w.stats.healed += amount;
      hero.contributedAt = w.time;
      if (w.research.ward) patient.shieldUntil = w.time + 4;
      const learning = Math.min(amount * 0.13, Math.max(0, 30 + w.destroyed * 20 - (hero.supportXp || 0)));
      hero.supportXp = (hero.supportXp || 0) + learning; G.gainXp(w, hero, learning);
      G.effect(w, 'heal', patient.x, patient.y, { color: '#b1e6b1', duration: 0.7 });
      G.effect(w, 'spell', hero.x, hero.y, { toX: patient.x, toY: patient.y, school: 'life', color: '#c3ff9c', radius: .65, duration: .7 });
    }
    hero.task = 'Läker vänner'; return true;
  }
  function strike(w, hero, target, stats) {
    if (hero.cooldown > 0 || !G.canHit(hero, target) || !G.attackLine(w, hero, target)) return;
    hero.cooldown = stats.cooldown; hero.attackAt = w.time; hero.contributedAt = w.time;
    let damage = stats.damage;
    const mastery = hero.classId === 'mage' && w.research.mastery && hero.level >= 5 && (hero.masteryAt || 0) < w.time;
    if (mastery) { damage *= 3; hero.masteryAt = w.time + 8; G.effect(w, 'bell', target.x, target.y, { duration: 1.3, color: '#cfbcff' }); }
    const magic = ['mage', 'healer', 'necromancer'].includes(hero.classId);
    G.effect(w, magic ? 'spell' : hero.classId === 'warrior' ? 'slash' : 'bolt', hero.x, hero.y, { toX: target.x, toY: target.y, school: hero.classId === 'necromancer' ? 'soul' : 'arcane', color: G.classes[hero.classId].color, radius: hero.classId === 'necromancer' ? 1.7 : mastery ? 2.6 : 1.5, duration: magic ? .8 : .3, heavy: hero.classId === 'ranger' && w.research.marksman });
    G.soundEvent(w, magic ? 'mage' : hero.classId, hero);
    if (hero.classId === 'necromancer') G.necromancerStrike(w, hero, target, damage);
    else G.damage(w, target, damage, hero);
    if (hero.classId === 'mage') {
      for (const monster of w.monsters) if (G.alive(monster) && G.distance(monster, target) < (w.research.echo || mastery ? 2.6 : 1.5) && G.attackLine(w, target, monster)) {
        if (monster !== target) G.damage(w, monster, damage * (w.research.echo ? 0.8 : 0.5), hero);
        if (w.research.frost) monster.slowUntil = w.time + 3.5;
      }
    }
  }
  function nearbySpot(w, hero, anchor, radius, phase = 0) {
    const angle = hero.id * 2.399963 + phase;
    for (let n = 0; n < 16; n++) {
      const a = angle + n * Math.PI / 8;
      const point = { x: anchor.x + Math.cos(a) * radius, y: anchor.y + Math.sin(a) * radius };
      if (G.open(w, point.x, point.y) && G.clearLine(w, anchor, point) && !w.monsters.some(m => G.alive(m) && G.distance(m, point) < 3)) return point;
    }
    return G.freeNear(w, anchor);
  }
  function patrol(w, hero, anchor, radius, speed, dt) {
    const key = Math.floor(anchor.x) + ':' + Math.floor(anchor.y) + ':' + radius;
    if (hero.patrolKey !== key || !hero.patrolGoal || w.time >= hero.patrolAt || !G.open(w, hero.patrolGoal.x, hero.patrolGoal.y)) {
      hero.patrolKey = key; hero.patrolPhase = (hero.patrolPhase || 0) + 1.2;
      hero.patrolGoal = nearbySpot(w, hero, anchor, radius, hero.patrolPhase);
      hero.patrolAt = w.time + 3 + hero.id % 4;
    }
    if (G.distance(hero, hero.patrolGoal) > 0.15) G.move(w, hero, hero.patrolGoal, speed, dt);
  }
  // Soft body separation lets allies pass while keeping their silhouettes and
  // click targets distinct. Static terrain still has absolute priority.
  G.separateHeroes = function(w, dt) {
    const heroes = G.allies(w), spacing = 0.68;
    const shift = (h, dx, dy) => {
      if (h.rootedUntil > w.time) return false;
      const p = { x: h.x + dx, y: h.y + dy };
      if (!G.open(w, p.x, p.y) || !G.clearLine(w, h, p)) return false;
      for (const [x, y] of [[-0.17, 0], [0.17, 0], [0, -0.17], [0, 0.17]]) if (!G.open(w, p.x + x, p.y + y)) return false;
      h.x = p.x; h.y = p.y; return true;
    };
    for (let pass = 0; pass < 3; pass++) for (let i = 0; i < heroes.length; i++) for (let j = i + 1; j < heroes.length; j++) {
      const a = heroes[i], b = heroes[j], distance = G.distance(a, b);
      if (distance >= spacing) continue;
      const angle = distance < 0.0001 ? (a.id * 31 + b.id * 17) * 2.399963 : Math.atan2(b.y - a.y, b.x - a.x);
      const amount = Math.min((spacing - distance) * 0.52, dt * 2), dx = Math.cos(angle) * amount, dy = Math.sin(angle) * amount;
      const movedA = shift(a, -dx, -dy), movedB = shift(b, dx, dy);
      if (!movedA) shift(b, dx, dy);
      if (!movedB) shift(a, -dx, -dy);
    }
  };
  G.updateHeroes = function(w, dt) {
    const castle = G.castle(w), enemies = w.monsters.filter(G.alive);
    const buildings = new Set(w.buildings.filter(G.alive).map(b => b.id));
    const sanctuary = G.hasBuilding(w, 'conservatory');
    for (const hero of w.heroes) {
      if (w.outcome) break;
      if (!G.alive(hero)) continue;
      hero.targetId = null;
      hero.cooldown = Math.max(0, hero.cooldown - dt);
      const stats = G.heroStats(w, hero);
      if (w.tick % 10 === 0) {
        const explored = G.reveal(w, hero.x, hero.y, G.heroSight(w, hero));
        hero.scouting += explored; w.stats.explored += explored; G.gainXp(w, hero, explored * 0.045);
      }
      const sheltered = G.distance(hero, castle) < 5;
      if (w.time - (hero.hurtAt || -10) > 3) hero.hp = Math.min(hero.maxHp, hero.hp + dt * (sheltered ? 4 : sanctuary ? 2 : 0.5));
      if (hero.hp < hero.maxHp * (G.traits[hero.trait].id === 'careful' ? 0.38 : 0.25)) {
        hero.retreating = true; hero.expedition = null;
      }
      if (hero.retreating) {
        hero.task = 'Återhämtar sig';
        if (hero.hp >= hero.maxHp * 0.86 && w.time >= (hero.retreatUntil || 0)) { hero.retreating = false; hero.routeKey = ''; }
        else {
          const refuges = w.buildings.filter(b => G.alive(b) && ['castle', 'garden'].includes(b.type));
          const refuge = refuges.sort((a, b) => G.distance(hero, a) - G.distance(hero, b))[0] || castle;
          if (G.distance(hero, refuge) > 3) G.move(w, hero, refuge, stats.speed * 1.15, dt);
          else patrol(w, hero, refuge, 2.7, stats.speed * 0.55, dt);
          heal(w, hero); continue;
        }
      }
      const healed = heal(w, hero);
      G.raiseSkeleton(w, hero);
      const expedition = w.expeditions.find(e => e.id === hero.expedition);
      const bounty = expedition && w.bounties.find(b => b.id === expedition.bounty);
      const guarding = !expedition && hero.classId !== 'ranger';
      // A paid village guard or an assembling party still hears the castle alarm.
      const canIntercept = !expedition || expedition.state === 'gather' || bounty?.type === 'defend' || w.bellUntil > w.time;
      const emergency = canIntercept && G.distance(hero, castle) < 14
        ? enemies.filter(m => G.alive(m) && G.canHit(hero, m)).filter(m => m.targetId === castle.id && G.distance(m, castle) < 8 || G.distance(m, castle) < 4 || buildings.has(m.targetId) && G.distance(m, castle) < 9).sort((a, b) => (a.targetId === castle.id ? -100 : G.distance(a, castle)) - (b.targetId === castle.id ? -100 : G.distance(b, castle)))[0] : null;
      const nearbyAllies = new Set(G.allies(w).filter(h => G.distance(hero, h) < 5.5).map(h => h.id));
      // The home radius limits unsolicited pursuit, never local self-defence or
      // helping a friend after an expedition's objective has disappeared.
      let target = emergency || enemies.filter(m => G.alive(m) && G.canHit(hero, m)).filter(m => G.distance(hero, m) < (hero.classId === 'warrior' ? 5 : 5.5) && (!guarding || G.distance(m, castle) < 8 || nearbyAllies.has(m.targetId))).sort((a, b) => G.distance(hero, a) - G.distance(hero, b))[0];
      if (target) {
        hero.targetId = target.id;
        const distance = G.distance(hero, target);
        // Reacting to a visible enemy must reveal it now, not wait for the
        // next once-per-second scouting update after the hero has escaped.
        if (distance <= G.heroSight(w, hero)) G.reveal(w, target.x, target.y, .75);
        const bossHome = target.boss && w.lairs.find(l => l.id === target.lair && G.alive(l));
        if (bossHome && w.heroes.filter(h => G.alive(h) && G.distance(h, hero) < 7).reduce((n, h) => n + h.level * h.hp / h.maxHp, 0) < G.bossDemand(w, bossHome) * 0.6) {
          hero.retreating = true; hero.retreatUntil = w.time + 8; hero.expedition = null; hero.task = 'Undviker väktaren';
          G.move(w, hero, castle, stats.speed * 1.15, dt); continue;
        }
        hero.task = healed ? 'Läker vänner' : 'Försvarar';
        if (hero.classId !== 'warrior' && distance < 1.4) {
          const length = distance || 1;
          const away = { x: G.clamp(hero.x + (hero.x - target.x) / length * 2, 1.5, w.width - 1.5), y: G.clamp(hero.y + (hero.y - target.y) / length * 2, 1.5, w.height - 1.5) };
          if (G.open(w, away.x, away.y)) G.move(w, hero, away, stats.speed, dt);
        } else if (distance > stats.range || !G.attackLine(w, hero, target)) G.move(w, hero, target, stats.speed, dt);
        if (distance <= stats.range + 0.2 && !healed) strike(w, hero, target, stats);
        continue;
      }
      const destination = bounty && G.bountyTarget(w, bounty);
      if (G.rangerTrapWork(w, hero, stats.speed, dt, !!expedition)) continue;
      if (expedition && destination) {
        if (bounty.type === 'attack' && !G.canHit(hero, destination)) {
          const archer = expedition.members.map(id => w.heroes.find(h => h.id === id)).find(h => h && G.alive(h) && G.canHit(h, destination));
          hero.task = 'Skyddar avståndskämpar'; patrol(w, hero, archer || expedition, 1.5, stats.speed, dt); continue;
        }
        if (expedition.state === 'gather') {
          hero.task = expedition.reason;
          patrol(w, hero, expedition, 1.5, stats.speed, dt);
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
        if (bounty.type === 'defend' && distance < 3) {
          patrol(w, hero, destination, 1.5, stats.speed * 0.65, dt);
        } else if (bounty.type === 'attack' && distance <= range && G.attackLine(w, hero, destination)) {
          hero.targetId = destination.id;
          if (hero.classId !== 'healer' || !healed) strike(w, hero, destination, stats);
        } else if (distance > (bounty.type === 'defend' ? 1.5 : bounty.type === 'explore' ? 0.8 : range) || !G.attackLine(w, hero, destination)) {
          const leaderDistance = G.travelDistance(w, leader, destination);
          const straggler = hero === leader && members.some(h => h !== hero && G.distance(h, hero) > 4.5 && G.travelDistance(w, h, destination) > leaderDistance + 4);
          const ahead = hero !== leader && G.distance(hero, leader) > 4.5 && G.travelDistance(w, hero, destination) < leaderDistance - 4;
          if (!straggler && !ahead) G.move(w, hero, destination, stats.speed, dt);
          else hero.task = 'Väntar in vänner';
        }
        continue;
      }
      hero.expedition = null;
      if (hero.classId === 'necromancer' && G.ownedSkeletons(w, hero).length < G.NECROMANCER_LIMIT) {
        const corpse = w.corpses.filter(b => w.explored[G.index(w, b.x, b.y)] && G.distance(hero, b) < 8 && !enemies.some(m => G.alive(m) && G.distance(m, b) < 2)).sort((a, b) => G.distance(a, hero) - G.distance(b, hero))[0];
        if (corpse) { hero.task = 'Söker benrester'; G.move(w, hero, corpse, stats.speed, dt); continue; }
      }
      if (hero.classId === 'healer') {
        const patient = w.heroes.filter(h => G.alive(h) && h.classId !== 'healer' && h.hp < h.maxHp * 0.75).sort((a, b) => G.distance(a, hero) - G.distance(b, hero))[0];
        if (patient && G.distance(patient, castle) < 9) { hero.task = 'Följer ' + patient.name; if (G.distance(hero, patient) > 2) G.move(w, hero, patient, stats.speed, dt); continue; }
      }
      if (hero.classId === 'ranger' && (w.time > hero.rethinkAt || w.tick % 10 === 0 && hero.scoutGoal && G.distance(hero, hero.scoutGoal) < .5)) {
        hero.scoutGoal = findScoutGoal(w, hero); hero.rethinkAt = w.time + 9;
      }
      if (hero.classId === 'ranger' && hero.scoutGoal) {
        hero.task = 'Utforskar'; G.move(w, hero, hero.scoutGoal, stats.speed, dt);
      } else {
        hero.task = 'Vaktar gläntan';
        patrol(w, hero, castle, 3.8, stats.speed * 0.7, dt);
      }
    }
  };
})(globalThis);
