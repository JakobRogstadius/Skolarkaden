/* Owned skeletons and corpse consumption. Summons never occupy housing or gain XP. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  G.ownedSkeletons = (w, hero) => w.skeletons.filter(s => s.owner === hero.id && G.alive(s));
  G.raiseSkeleton = function(w, hero) {
    if (hero.classId !== 'necromancer' || !G.alive(hero) || (hero.raiseAt || 0) > w.time || G.ownedSkeletons(w, hero).length >= 2) return null;
    const corpse = w.corpses.filter(b => G.distance(b, hero) < 4 && G.clearLine(w, hero, b)).sort((a, b) => G.distance(a, hero) - G.distance(b, hero) || a.id - b.id)[0];
    if (!corpse) return null;
    const level = corpse.level, hp = 36 + level * 16, point = G.freeNear(w, corpse);
    const skeleton = { id: w.nextId++, skeleton: true, owner: hero.id, sourceType: corpse.monsterType, level, ...point, hp, maxHp: hp, cooldown: 0, route: [], routeKey: '', facing: 1, born: w.time };
    w.corpses.splice(w.corpses.indexOf(corpse), 1); w.skeletons.push(skeleton); hero.raiseAt = w.time + 3;
    G.effect(w, 'raise', corpse.x, corpse.y, { duration: 1.2, color: '#b6ffe2' });
    G.soundEvent(w, 'recruit', skeleton); w.revision++;
    return skeleton;
  };
  G.necromancerStrike = function(w, hero, target, damage) {
    let drained = G.damage(w, target, damage, hero);
    for (const monster of w.monsters) if (monster !== target && G.alive(monster) && G.distance(monster, target) < 1.7 && G.attackLine(w, target, monster)) drained += G.damage(w, monster, damage * .65, hero);
    if (drained <= 0) return;
    const amount = Math.min(16 + hero.level, drained * .45);
    for (const friend of [hero, ...G.ownedSkeletons(w, hero)]) {
      const healed = Math.min(friend.maxHp - friend.hp, amount);
      if (healed <= 0) continue;
      friend.hp += healed; hero.healing += healed; w.stats.healed += healed;
      G.effect(w, 'spell', target.x, target.y, { toX: friend.x, toY: friend.y, school: 'drain', color: '#b6ffe2', radius: .4, duration: .95 });
    }
  };
  G.updateSkeletons = function(w, dt) {
    for (const skeleton of w.skeletons) {
      if (w.outcome) break;
      const owner = w.heroes.find(h => h.id === skeleton.owner && G.alive(h));
      if (!owner) { skeleton.hp = 0; continue; }
      if (!G.alive(skeleton)) continue;
      skeleton.cooldown = Math.max(0, skeleton.cooldown - dt);
      const enemies = w.monsters.filter(m => G.alive(m) && G.canHit(skeleton, m) && G.distance(m, owner) < 6);
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
        else if (skeleton.cooldown <= 0) {
          skeleton.cooldown = 1.3; skeleton.attackAt = w.time; owner.contributedAt = w.time;
          G.effect(w, 'slash', skeleton.x, skeleton.y, { toX: target.x, toY: target.y, color: '#ddf4c7', duration: .3 });
          // Credit belongs to the master, but the melee targeting check belongs to the skeleton.
          G.damage(w, target, (5 + skeleton.level * 2.4) * G.offenseBoost(w, skeleton), owner);
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
