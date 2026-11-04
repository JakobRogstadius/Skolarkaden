/* Owned skeletons and corpse consumption. Summons never occupy housing or gain XP. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  G.freshCorpse = (w, corpse) => w.time - corpse.diedAt < G.CORPSE_LIFETIME;
  G.ownedSkeletons = (w, hero) => w.skeletons.filter(s => s.owner === hero.id && G.alive(s));
  G.enemySkeletons = (w, master) => w.monsters.filter(m => m.raisedBy === master.id && G.alive(m));
  G.raiseEnemySkeleton = function(w, master) {
    const limit = G.monsterTypes[master.type]?.raises;
    if (!limit || !G.abilityReady(w, master) || (master.raiseAt || 0) > w.time || G.enemySkeletons(w, master).length >= limit) return null;
    const corpse = w.corpses.filter(b => G.freshCorpse(w, b) && G.distance(b, master) < 4.5 && G.clearLine(w, master, b)).sort((a, b) => G.distance(a, master) - G.distance(b, master) || a.id - b.id)[0];
    const lair = w.lairs.find(l => l.id === master.lair);
    if (!corpse || !lair) return null;
    const skeleton = G.spawnMonster(w, lair, { type: 'boneservant', wave: master.wave, at: corpse });
    if (!skeleton) return null; // Capacity must not consume the corpse or its cooldown.
    Object.assign(skeleton, { raisedBy: master.id, rank: corpse.level, strength: 1 + (corpse.level - 1) * .2, hp: 36 + corpse.level * 16, maxHp: 36 + corpse.level * 16, attackDamage: 5 + corpse.level * 2.4, waveEngaged: true });
    w.corpses.splice(w.corpses.indexOf(corpse), 1); master.raiseAt = w.time + 4; master.castAt = w.time;
    G.useAbility(w, master, corpse, 'raise');
    G.effect(w, 'raise', corpse.x, corpse.y, { duration: 1.2, color: '#f48b86' });
    G.effect(w, 'spell', master.x, master.y, { toX: skeleton.x, toY: skeleton.y, school: 'enemy', color: '#ed777e', radius: .6, duration: .8 }, master);
    G.soundEvent(w, 'mage', master); w.revision++;
    return skeleton;
  };
  function createSkeleton(w, hero, source, level, hp, starter = false) {
    const skeleton = { id: w.nextId++, skeleton: true, owner: hero.id, sourceType: source.monsterType || source.type, level, ...G.freeNear(w, source), hp, maxHp: hp, cooldown: 0, route: [], routeKey: '', facing: 1, born: w.time };
    if (starter) skeleton.starter = true;
    w.skeletons.push(skeleton); w.revision++;
    G.soundEvent(w, 'recruit', skeleton);
    return skeleton;
  }
  const starterHp = level => 32 + 10 * (level - 1);
  G.growStarterSkeleton = function(owner, skeleton) {
    if (!skeleton.starter || skeleton.level === owner.level) return;
    const hp = starterHp(owner.level);
    skeleton.hp += hp - skeleton.maxHp; skeleton.maxHp = hp; skeleton.level = owner.level;
  };
  G.grantStarterSkeleton = function(w, hero) {
    if (hero.classId !== 'necromancer' || hero.starterSkeletonGranted || G.ownedSkeletons(w, hero).length || !G.useAbility(w, hero, hero, 'raise')) return null;
    hero.starterSkeletonGranted = true; hero.raiseAt = w.time + 3;
    const skeleton = createSkeleton(w, hero, hero, hero.level, starterHp(hero.level), true);
    G.effect(w, 'raise', skeleton.x, skeleton.y, { duration: 1.2, color: '#b6ffe2' });
    return skeleton;
  };
  G.raiseSkeleton = function(w, hero) {
    if (hero.classId !== 'necromancer' || !G.abilityReady(w, hero) || (hero.raiseAt || 0) > w.time || G.ownedSkeletons(w, hero).length >= G.NECROMANCER_LIMIT) return null;
    const corpse = w.corpses.filter(b => G.freshCorpse(w, b) && G.distance(b, hero) < 4 && G.clearLine(w, hero, b)).sort((a, b) => G.distance(a, hero) - G.distance(b, hero) || a.id - b.id)[0];
    if (!corpse) return null;
    const level = corpse.level;
    const skeleton = createSkeleton(w, hero, corpse, level, 36 + level * 16);
    w.corpses.splice(w.corpses.indexOf(corpse), 1); hero.raiseAt = w.time + 3;
    G.useAbility(w, hero, corpse, 'raise');
    G.effect(w, 'raise', corpse.x, corpse.y, { duration: 1.2, color: '#b6ffe2' });
    return skeleton;
  };
  G.necromancerStrike = function(w, hero, target, damage) {
    if (!G.alive(target) || w.outcome) return 0;
    if (target.echoHp > 0 && target.echoUntil > w.time) {
      target.echoHp = 0; target.echoUntil = 0;
      G.effect(w, 'unbind', target.x, target.y, { duration: .85, color: '#b6ffe2' });
    }
    const servant = target.type === 'boneservant';
    if (servant && G.ownedSkeletons(w, hero).length < G.NECROMANCER_LIMIT) {
      const level = target.rank || 1;
      target.hp = 0; target.hurtAt = w.time; target.unbound = true;
      const skeleton = createSkeleton(w, hero, target, level, 36 + level * 16);
      G.effect(w, 'unbind', skeleton.x, skeleton.y, { duration: 1.2, color: '#b6ffe2' });
      return 0;
    }
    const drained = G.damage(w, target, servant ? 3 * damage : damage, hero);
    if (drained <= 0) return 0;
    const amount = Math.min(16 + hero.level, drained * .45);
    for (const friend of [hero, ...G.ownedSkeletons(w, hero)]) {
      const healed = G.healHealth(w, friend, amount);
      if (healed <= 0) continue;
      hero.healing += healed; w.stats.healed += healed;
      G.effect(w, 'spell', target.x, target.y, { toX: friend.x, toY: friend.y, school: 'drain', color: '#b6ffe2', focused: true, duration: .95 });
    }
    return drained;
  };
  G.updateSkeletons = function(w, dt) {
    for (const skeleton of w.skeletons) {
      if (w.outcome) break;
      const owner = w.heroes.find(h => h.id === skeleton.owner && G.alive(h));
      if (!owner) { skeleton.hp = 0; continue; }
      if (!G.alive(skeleton)) continue;
      G.growStarterSkeleton(owner, skeleton);
      skeleton.cooldown = Math.max(0, skeleton.cooldown - dt);
      if (G.acting(w, skeleton) || skeleton.stunnedUntil > w.time) continue;
      const enemies = w.monsters.filter(m => G.alive(m) && G.canHit(skeleton, m, w) && G.distance(m, owner) < 6 && G.visibleTarget(w, skeleton, m));
      enemies.sort((a, b) => (a.id === owner.targetId ? -10 : G.distance(a, skeleton)) - (b.id === owner.targetId ? -10 : G.distance(b, skeleton)));
      const buildingTarget = w.lairs.find(l => l.id === owner.targetId && G.alive(l));
      const target = enemies[0] || buildingTarget;
      const speed = 1.85 * (w.research.boots ? 1.18 : 1);
      if (G.distance(skeleton, owner) > 7 || owner.retreating) {
        G.move(w, skeleton, owner, speed * 1.15, dt); skeleton.targetId = null; continue;
      }
      if (target) {
        skeleton.targetId = target.id;
        const range = 1.05 + (target.w ? .8 : 0);
        if (G.distance(skeleton, target) > range || !G.attackLine(w, skeleton, target)) G.move(w, skeleton, target, speed, dt);
        else if (G.useAbility(w, skeleton, target)) {
          skeleton.attackAt = w.time; owner.contributedAt = w.time;
          G.effect(w, 'slash', skeleton.x, skeleton.y, { toX: target.x, toY: target.y, color: '#ddf4c7', duration: .48 });
          // Credit belongs to the master, but the melee targeting check belongs to the skeleton.
          const damage = skeleton.starter ? 4.5 + .9 * (skeleton.level - 1) : 5 + skeleton.level * 2.4;
          G.damage(w, target, damage * G.offenseBoost(w, skeleton), owner, 'skeleton');
          G.soundEvent(w, 'warrior', skeleton);
        }
      } else {
        skeleton.targetId = null;
        const angle = skeleton.id * 2.4 + Math.floor(w.time / 5) * .7;
        const spot = { x: owner.x + Math.cos(angle) * 1.3, y: owner.y + Math.sin(angle) * 1.3 };
        if (G.distance(skeleton, owner) > 2.4 || G.distance(skeleton, spot) > .3) G.move(w, skeleton, G.open(w, spot.x, spot.y) ? spot : owner, speed, dt);
      }
    }
    w.skeletons = w.skeletons.filter(G.alive);
  };
})(globalThis);
