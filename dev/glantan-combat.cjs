/* Reproducible, controlled combat experiments using the actual game simulation.
 *
 * node dev/glantan-combat.cjs --self-test
 * node dev/glantan-combat.cjs --heroes warrior,ranger --levels 1,3,5 --ranks 1,3 --seeds 0,1 --mirrors both --json /tmp/current.json --csv /tmp/current.csv
 * node dev/glantan-combat.cjs --matrix /tmp/cases.json --ref 28ba8b8 --json /tmp/baseline.json
 * node dev/glantan-combat.cjs --benchmark 20
 *
 * API: const h = createHarness({ ref?, configure(G)? }); h.G exposes real rules.
 * h.runArena({ heroes:[{type:'warrior',level:3,branch:'banner'}],
 *   monsters:[{type:'rattler',rank:3}], seed:'0', difficulty:'steady',
 *   layout:'line'|'staggered'|'scatter', distance:5, spacing:1.25, mirror:false,
 *   mode:'field'|'objective', research:['armor'], maxSeconds:180,
 *   reinforcements:[{at:12,monsters:[...]}],
 *   waves:[{monsters:[...],delay:3}], corpses:[{rank:3,age:0,x?,y?}],
 *   skeletons:[{ownerIndex:0,level:3,x?,y?}], initialHpFraction:1,
 *   allowLevelUps:false, trait:'loyal', trace:false, withdrawalSeconds:null });
 * All coordinates are in the unmirrored map's coordinate system. Individual roster
 * entries may also specify x,y and hero hpFraction/trait. Mirroring reflects every
 * point, including buildings/corpses/summons, with unchanged roster order and IDs.
 * Branch research is WORLD-WIDE in the actual game, not per-hero. Incompatible
 * branches in one research group are rejected. Prerequisites/costs are bypassed.
 * Rank alone does not uniquely identify a natural nest: canonical rank r maps to
 * tier=min(3,r), level=r-tier+1 (r=1..6). Explicit tier/level disambiguate. Actual
 * spawnMonster supplies stats. guardian without boss:true uses its content stats;
 * boss:true requests actual difficulty-specific guardian HP/damage/rank, with no
 * nest leash or boss-readiness retreat (this is an arena, not a boss-nest test).
 *
 * Controls: fully explored, flat 64x40 arena; no purchases, answer rewards, bell,
 * recruitment or resurrection; XP gain disabled unless requested. One real living
 * non-boss source nest has all escalation timers frozen, guardsSeeded=true and
 * no initial guards and a zero boss readiness demand. This retains brood spawning,
 * enemy raising and ranger trap routes.
 * Monsters are real raiders: guard=false, cooldown=0, raidAt=0, wave=1. No spawn
 * staggering, guard leashes, forced local targeting, movement/cooldown overrides or
 * alternate damage model. Real wave formations, abilities, roots, kiting, healing,
 * passive regen, body separation and retreat remain active.
 * Heroes receive a standing marching attack order targeting a living enemy; the
 * expedition recruitment/readiness planner alone is bypassed. This avoids the
 * unsolicited home-guard pursuit restriction and delayed party formation. Orders
 * are restored only after genuine retreat recovery, never during retreat.
 * Field mode places a passive 1e12 HP castle 12 tiles behind the hero line. It
 * remains the real retreat/siege destination, with ordinary shelter regeneration;
 * siege results therefore need objective-mode confirmation. Objective mode places
 * a normal 1000 HP castle 4 tiles behind the heroes; its loss ends the fight.
 * Castle shots are disabled by default. For a defended-castle raid assay, use
 * mode:'objective', castleShots:true, endOnPartyDeath:false: combat continues
 * after the last hero falls, and only losing the castle is an enemy victory.
 * The source nest is never an arena objective.
 * Win=all current/future enemies defeated; loss=all heroes dead or castle lost;
 * timeout includes genuine sustained retreats/stalemates. No boss is required.
 * Set withdrawalSeconds (e.g. 3) to classify continuous all-party retreat as a
 * loss with reason='withdrawal'. Its first occurrence is recorded in either mode.
 * Consecutive waves preserve HP, cooldown, corpses, summons and position. Timed
 * reinforcements spawn at their absolute times. Wave delay starts after a clear.
 * Metrics wrap G.damage/G.useAbility and inspect real entities each fixed step.
 * Healing received includes passive regeneration; healing credited is the game's
 * hero.healing counter. Movement is per-step net displacement incl. separation.
 * Action timestamps include spells/heals/raising; cooldownSeconds counts shared
 * cooldown time, not a hypothetical effective attack DPS. JSON is the full record;
 * CSV is a compact comparison table. Heroes totals exclude summons; allies includes
 * them, with summons reported separately. No files are written unless paths are given.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { runtime } = require('../tests/games/glantan/helpers.cjs');
const ROOT = path.resolve(__dirname, '..');
const round = n => Math.round(n * 1e5) / 1e5;
const copy = value => JSON.parse(JSON.stringify(value));
const CONTROL_VERSION = 1;

function createHarness({ ref = null, configure } = {}) {
  // Reuse the existing test runtime, including its sandbox and script load order.
  const loaded = runtime();
  if (ref) for (const file of ['content', 'world', 'engine', 'orders', 'summons', 'traps', 'heroes', 'monsters']) {
    const filename = 'resources/glantan/' + file + '.js';
    vm.runInContext(execFileSync('git', ['show', `${ref}:${filename}`], { cwd: ROOT, encoding: 'utf8' }), loaded.context, { filename });
  }
  const G = loaded.context.Starlight.Glantan;
  configure?.(G);
  let active = null;
  const damage = G.damage, ability = G.useAbility, gainXp = G.gainXp, plan = G.planExpeditions, spawn = G.spawnMonster, raiseEnemy = G.raiseEnemySkeleton;
  const identify = unit => unit.classId || (unit.skeleton ? 'skeleton' : unit.monster ? unit.type : unit.type || 'unknown');
  function track(unit, w) {
    if (!active || !unit || active.units.has(unit.id)) return active?.units.get(unit?.id);
    const record = { id: unit.id, type: identify(unit), side: unit.classId || unit.skeleton ? 'heroes' : unit.monster ? 'monsters' : 'buildings', level: unit.level || unit.rank || null, born: round(w.time), startHp: round(unit.hp), maxHp: round(unit.maxHp), damageDealt: 0, damageTaken: 0, healingReceived: 0, actions: {}, cooldownSpent: 0, cooldownSeconds: 0, movement: 0, retreatSeconds: 0, retreatEvents: 0, firstActionAt: null, lastActionAt: null, deathAt: null, entity: unit };
    if (active.trace) record.actionTimes = [];
    active.units.set(unit.id, record); return record;
  }
  G.damage = function(w, target, amount, attacker, ...extra) {
    const recipient = track(target, w), source = track(attacker, w);
    const dealt = damage(w, target, amount, attacker, ...extra);
    if (active) {
      if (recipient) recipient.damageTaken += dealt;
      if (source) source.damageDealt += dealt;
    }
    return dealt;
  };
  G.useAbility = function(w, unit, target, kind = 'attack', cooldown = null) {
    const used = ability(w, unit, target, kind, cooldown);
    if (used && active) {
      const r = track(unit, w); r.actions[kind] = (r.actions[kind] || 0) + 1;
      r.cooldownSpent += unit.cooldown; r.firstActionAt ??= round(w.time); r.lastActionAt = round(w.time);
      if (active.trace) r.actionTimes.push({ at: round(w.time), kind, target: target.id ?? null, cooldown: unit.cooldown });
    }
    return used;
  };
  G.gainXp = function(w, hero, amount) { if (!active || active.allowLevelUps) return gainXp(w, hero, amount); };
  G.planExpeditions = function(w) { if (!active) return plan(w); };
  G.spawnMonster = function(w, lair, options) { const m = spawn(w, lair, options); if (m) track(m, w); return m; };
  G.raiseEnemySkeleton = function(w, master) {
    const skeleton = raiseEnemy(w, master);
    // Raising overrides the spawned body's stats after spawnMonster returns.
    if (skeleton && active) Object.assign(track(skeleton, w), { level: skeleton.rank, startHp: round(skeleton.hp), maxHp: round(skeleton.maxHp) });
    return skeleton;
  };

  function runArena(input = {}) {
    if (active) throw Error('runArena is synchronous and cannot be nested on one harness.');
    const config = { seed: '0', difficulty: 'steady', layout: 'line', distance: 5, spacing: 1.25, mirror: false, mode: 'field', castleShots: false, endOnPartyDeath: true, maxSeconds: 180, trait: 'loyal', heroes: [], monsters: [], research: [], reinforcements: [], waves: [], corpses: [], skeletons: [], ...copy(input) };
    if (!G.profiles[config.difficulty]) throw Error('Unknown difficulty: ' + config.difficulty);
    if (!['line', 'staggered', 'scatter'].includes(config.layout)) throw Error('Unknown layout: ' + config.layout);
    if (!['field', 'objective'].includes(config.mode)) throw Error('Unknown mode: ' + config.mode);
    if (typeof config.castleShots !== 'boolean' || typeof config.endOnPartyDeath !== 'boolean') throw Error('castleShots and endOnPartyDeath must be booleans.');
    if (!(config.distance >= 0 && config.distance <= 24 && config.spacing > 0 && config.maxSeconds >= 0 && config.maxSeconds <= 3600)) throw Error('distance must be 0..24, spacing >0, maxSeconds 0..3600.');
    const requireInteger = (n, min, max, label) => { if (!Number.isInteger(n) || n < min || n > max) throw Error(`${label} must be integer ${min}..${max}.`); };
    for (const hero of config.heroes) { if (!G.classes[hero.type]) throw Error('Unknown hero: ' + hero.type); requireInteger(hero.level ?? 1, 1, 8, 'Hero level'); if (!((hero.hpFraction ?? config.initialHpFraction ?? 1) > 0 && (hero.hpFraction ?? config.initialHpFraction ?? 1) <= 1)) throw Error('Hero hpFraction must be >0 and <=1.'); }
    const validateMonsters = roster => {
      for (const monster of roster) {
        if (!G.monsterTypes[monster.type]) throw Error('Unknown monster: ' + monster.type);
        if (monster.boss && monster.type !== 'guardian') throw Error('Actual boss guards must have type guardian.');
        requireInteger(monster.rank ?? 1, 1, 6, 'Monster rank');
        if (monster.tier !== undefined) requireInteger(monster.tier, 1, 3, 'Monster tier');
        if (monster.level !== undefined) requireInteger(monster.level, 1, 4, 'Monster nest level');
      }
      if (roster.length > G.MAX_RAIDERS) throw Error('A roster exceeds the real raider cap.');
    };
    validateMonsters(config.monsters);
    for (const event of config.reinforcements) { if (!(event.at >= 0)) throw Error('Reinforcement at must be >=0.'); validateMonsters(event.monsters); }
    for (const wave of config.waves) { if (!((wave.delay ?? 0) >= 0)) throw Error('Wave delay must be >=0.'); validateMonsters(wave.monsters); }
    if (config.withdrawalSeconds != null && !(config.withdrawalSeconds >= 0)) throw Error('withdrawalSeconds must be >=0 or null.');
    const research = Array.isArray(config.research) ? Object.fromEntries(config.research.map(id => [id, true])) : { ...config.research };
    for (const hero of config.heroes) if (hero.branch) research[hero.branch] = true;
    const groups = {};
    for (const [id, enabled] of Object.entries(research)) if (enabled) {
      if (!G.research[id]) throw Error('Unknown research: ' + id);
      const group = G.research[id].group;
      if (group && groups[group] && groups[group] !== id) throw Error(`Research ${id} conflicts with ${groups[group]} in world-wide group ${group}.`);
      if (group) groups[group] = id;
    }
    const begin = performance.now();
    const w = G.createMap(config.seed, config.difficulty);
    Object.assign(w, { width: 64, height: 40, rng: G.seedNumber(config.seed), lairSites: undefined, bellCharges: 0, research, choices: groups });
    w.terrain = Array(w.width * w.height).fill(0); w.paths = Array(w.terrain.length).fill(0); w.explored = Array(w.terrain.length).fill(1);
    const center = { x: 32, y: 20 }, heroX = center.x - config.distance / 2, monsterX = center.x + config.distance / 2;
    const reflect = point => ({ x: config.mirror ? w.width - point.x : point.x, y: point.y });
    const castlePoint = reflect({ x: Math.floor(heroX - (config.mode === 'objective' ? 4 : 12)), y: center.y });
    const castle = G.addBuilding(w, 'castle', castlePoint.x - 1, castlePoint.y - 1);
    castle.shotAt = config.castleShots ? 0 : 1e12;
    if (config.mode === 'field') castle.hp = castle.maxHp = 1e12;
    w.home = { tx: castle.tx, ty: castle.ty, x: castle.x, y: castle.y };
    const sourcePoint = reflect({ x: 58, y: center.y });
    const source = { id: w.nextId++, type: 'rust', tx: sourcePoint.x - 1, ty: sourcePoint.y - 1, x: sourcePoint.x, y: sourcePoint.y, w: 2, h: 2, hp: 170, maxHp: 170, tier: 1, level: 1, guardCount: 1, suggestedLevels: 0, guardsSeeded: true, awake: true, defendersRaised: true, seen: true, wakeAt: 1e12, nextSpawn: 1e12, nextGrowth: 1e12, nextGuardAt: 1e12 };
    w.lairs.push(source); w.navRevision++;
    // Separate seeded layout streams keep enemy formations independent of hero count.
    const layoutStates = { heroes: G.seedNumber(config.seed + ':heroes-layout'), monsters: G.seedNumber(config.seed + ':monsters-layout') };
    const random = side => { layoutStates[side] = (Math.imul(layoutStates[side], 1664525) + 1013904223) >>> 0; return layoutStates[side] / 4294967296; };
    const position = (entry, i, count, side) => {
      const x = side === 'heroes' ? heroX : monsterX;
      const jitterX = config.layout === 'scatter' ? (random(side) - .5) * 2 : config.layout === 'staggered' ? (i % 2 ? .65 : -.65) : 0;
      const jitterY = config.layout === 'scatter' ? (random(side) - .5) * .6 : 0;
      const point = reflect({ x: entry.x ?? x + jitterX, y: entry.y ?? center.y + (i - (count - 1) / 2) * config.spacing + jitterY });
      if (!G.open(w, point.x, point.y)) throw Error('Start position is blocked or outside arena: ' + JSON.stringify(point));
      return point;
    };
    const traitIndex = trait => typeof trait === 'number' ? trait : G.traits.findIndex(t => t.id === trait);
    for (let i = 0; i < config.heroes.length; i++) {
      const entry = config.heroes[i], hero = G.addHero(w, entry.type);
      hero.level = entry.level ?? 1; hero.trait = traitIndex(entry.trait ?? config.trait);
      if (!G.traits[hero.trait]) throw Error('Unknown hero trait.');
      hero.hp = hero.maxHp = G.heroStats(w, hero).hp;
      hero.hp *= entry.hpFraction ?? config.initialHpFraction ?? 1;
      Object.assign(hero, position(entry, i, config.heroes.length, 'heroes'));
    }
    for (const entry of config.corpses) {
      const p = reflect({ x: entry.x ?? center.x, y: entry.y ?? center.y });
      w.corpses.push({ id: w.nextId++, ...p, monsterType: entry.type || 'rattler', level: entry.rank || entry.level || 1, diedAt: -(entry.age || 0) });
    }
    for (const entry of config.skeletons) {
      const owner = w.heroes[entry.ownerIndex ?? 0];
      if (!owner || owner.classId !== 'necromancer') throw Error('Initial skeleton owner must be a necromancer.');
      if (w.skeletons.some(s => s.owner === owner.id)) throw Error('Initial skeletons must respect the real one-per-owner cap.');
      const level = entry.level || 1, hp = 36 + level * 16;
      requireInteger(level, 1, 6, 'Skeleton level');
      const originalOwnerX = config.mirror ? w.width - owner.x : owner.x;
      const p = reflect({ x: entry.x ?? originalOwnerX - .8, y: entry.y ?? owner.y + .8 });
      if (!G.open(w, p.x, p.y)) throw Error('Initial skeleton position is blocked.');
      w.skeletons.push({ id: w.nextId++, skeleton: true, owner: owner.id, sourceType: entry.type || 'rattler', level, ...p, hp, maxHp: hp, cooldown: 0, route: [], routeKey: '', facing: config.mirror ? -1 : 1, born: 0 });
    }
    active = { units: new Map(), allowLevelUps: !!config.allowLevelUps, trace: !!config.trace };
    try {
      track(castle, w); for (const h of [...w.heroes, ...w.skeletons]) track(h, w);
      let waveNumber = 0, requestedMonsters = 0;
      const spawnRoster = roster => {
        waveNumber++;
        roster.forEach((entry, i) => {
          const rank = entry.rank ?? 1, tier = entry.tier ?? Math.min(3, rank), level = entry.level ?? rank - tier + 1;
          requireInteger(level, 1, 4, 'Monster nest level');
          const m = G.spawnMonster(w, { ...source, tier, level, boss: !!entry.boss }, { type: entry.type, guard: !!entry.boss, wave: waveNumber });
          if (!m) throw Error('Reinforcement exceeds the actual live monster capacity; split or delay it.');
          m.guard = false; m.raidAt = 0; Object.assign(m, position(entry, i, roster.length, 'monsters'));
          requestedMonsters++;
          // Spawn instrumentation ran before explicit arena position was assigned.
          const r = track(m, w); r.level = m.rank;
        });
      };
      spawnRoster(config.monsters);
      w.rng = G.seedNumber(config.seed + ':combat');
      const simulation = new G.Simulation({ saved: w });
      const bounty = { id: w.nextId++, type: 'attack', level: 3, created: 0, target: null };
      const expedition = { id: w.nextId++, bounty: bounty.id, state: 'march', created: 0, progressAt: 0, targetHp: 0, members: [], ...reflect(center) };
      w.bounties.push(bounty); w.expeditions.push(expedition);
      const reinforcements = config.reinforcements.map((event, i) => ({ ...event, order: i })).sort((a, b) => a.at - b.at || a.order - b.order);
      const waves = config.waves.slice(); let nextWaveAt = null, completedWaves = 0, previousHadEnemies = w.monsters.some(G.alive), outcome = null, reason = null, allRetreatSince = null, firstAllRetreatAt = null, allRetreatSeconds = 0;
      const starts = { heroes: w.heroes.map(h => ({ id: h.id, type: h.classId, x: h.x, y: h.y, hp: h.hp, cooldown: h.cooldown })), monsters: w.monsters.map(m => ({ id: m.id, type: m.type, rank: m.rank, strength: m.strength, hp: m.hp, attackDamage: m.attackDamage, x: m.x, y: m.y, cooldown: m.cooldown, guard: m.guard, raidAt: m.raidAt })) };
      while (true) {
        while (reinforcements.length && reinforcements[0].at <= w.time + 1e-7) spawnRoster(reinforcements.shift().monsters);
        let enemies = w.monsters.filter(G.alive);
        if (!enemies.length && previousHadEnemies) { completedWaves++; previousHadEnemies = false; }
        if (!enemies.length && waves.length && nextWaveAt === null) nextWaveAt = w.time + (waves[0].delay || 0);
        if (nextWaveAt !== null && w.time + 1e-7 >= nextWaveAt) { spawnRoster(waves.shift().monsters); nextWaveAt = null; enemies = w.monsters.filter(G.alive); }
        if (enemies.length) previousHadEnemies = true;
        const livingHeroes = w.heroes.filter(G.alive);
        if (config.endOnPartyDeath && !livingHeroes.length || castle.hp <= 0 || w.outcome === 'lost') { outcome = 'loss'; reason = castle.hp <= 0 ? 'castle-destroyed' : 'party-dead'; break; }
        const allRetreating = livingHeroes.length > 0 && livingHeroes.every(h => h.retreating);
        if (allRetreating && enemies.length) {
          allRetreatSince ??= w.time; firstAllRetreatAt ??= round(w.time);
          allRetreatSeconds += G.STEP;
          if (config.withdrawalSeconds != null && w.time - allRetreatSince + 1e-7 >= config.withdrawalSeconds) { outcome = 'loss'; reason = 'withdrawal'; break; }
        } else allRetreatSince = null;
        if (!enemies.length && !waves.length && !reinforcements.length) { outcome = 'win'; reason = 'enemies-cleared'; break; }
        if (w.time + 1e-7 >= config.maxSeconds) { outcome = 'timeout'; reason = 'time-limit'; break; }
        if (!w.bounties.includes(bounty)) w.bounties.push(bounty);
        const target = enemies[0];
        bounty.target = target?.id ?? null; bounty.x = target?.x ?? center.x; bounty.y = target?.y ?? center.y;
        expedition.members = w.heroes.filter(h => G.alive(h) && !h.retreating).map(h => h.id);
        for (const h of w.heroes) if (G.alive(h) && !h.retreating) h.expedition = expedition.id;
        const before = new Map();
        for (const unit of [...w.heroes, ...w.monsters, ...w.skeletons]) track(unit, w);
        for (const [id, r] of active.units) before.set(id, { hp: r.entity.hp, x: r.entity.x, y: r.entity.y, damage: r.damageTaken, retreat: !!r.entity.retreating });
        // .step(G.STEP) is the exact game fixed step, avoiding accumulator drift.
        simulation.step(G.STEP);
        for (const unit of [...w.heroes, ...w.monsters, ...w.skeletons]) track(unit, w);
        for (const [id, r] of active.units) {
          const unit = r.entity, old = before.get(id);
          if (old) {
            r.healingReceived += Math.max(0, unit.hp - old.hp + r.damageTaken - old.damage);
            r.movement += Math.hypot(unit.x - old.x, unit.y - old.y);
            if (unit.retreating && !old.retreat) r.retreatEvents++;
          }
          if (unit.cooldown > 0 && G.alive(unit)) r.cooldownSeconds += G.STEP;
          if (unit.retreating && G.alive(unit)) r.retreatSeconds += G.STEP;
          if (!G.alive(unit) && r.deathAt === null) r.deathAt = round(w.time);
        }
      }
      const units = [...active.units.values()].map(r => {
        const { entity, ...metric } = r;
        return { ...metric, alive: G.alive(entity), hp: round(entity.hp), finalLevel: entity.level || entity.rank || null, healingCredited: round(entity.healing || 0), damageDealt: round(r.damageDealt), damageTaken: round(r.damageTaken), healingReceived: round(r.healingReceived), cooldownSpent: round(r.cooldownSpent), cooldownSeconds: round(r.cooldownSeconds), movement: round(r.movement), retreatSeconds: round(r.retreatSeconds), x: round(entity.x), y: round(entity.y) };
      });
      const total = (side, filter = () => true) => {
        const entries = units.filter(u => u.side === side && filter(u)), sum = key => round(entries.reduce((n, u) => n + u[key], 0));
        return { count: entries.length, survivors: entries.filter(u => u.alive).length, deaths: entries.filter(u => !u.alive).length, hp: sum('hp'), maxHp: sum('maxHp'), damage: sum('damageDealt'), healingReceived: sum('healingReceived'), healingCredited: sum('healingCredited'), actions: entries.reduce((n, u) => n + Object.values(u.actions).reduce((a, b) => a + b, 0), 0), movement: sum('movement'), byClass: Object.fromEntries([...new Set(entries.map(u => u.type))].map(type => [type, { count: entries.filter(u => u.type === type).length, survivors: entries.filter(u => u.type === type && u.alive).length }])) };
      };
      return { controlVersion: CONTROL_VERSION, instrumentationVersion: 2, ref: ref || 'working-tree', id: config.id || null, seed: String(config.seed), difficulty: config.difficulty, layout: config.layout, mirror: config.mirror, mode: config.mode, distance: config.distance, outcome, reason, firstAllRetreatAt, allRetreatSeconds: round(allRetreatSeconds), duration: round(w.time), steps: w.tick, completedWaves, requestedMonsters, castleHp: round(castle.hp), castleDamage: round(castle.maxHp - castle.hp), heroes: total('heroes', u => u.type !== 'skeleton'), summons: total('heroes', u => u.type === 'skeleton'), allies: total('heroes'), monsters: total('monsters'), units, starts, config, wallMs: round(performance.now() - begin) };
    } finally { active = null; }
  }
  return { G, context: loaded.context, runArena, runBatch: cases => cases.map(runArena) };
}

function buildMatrix({ heroTypes = ['warrior', 'ranger', 'healer', 'mage', 'necromancer'], monsterTypes = ['rattler', 'sporeling', 'husher', 'nightwing', 'thornling'], levels = [1], ranks = [1], seeds = ['0'], mirrors = [false, true], base = {} } = {}) {
  const cases = [];
  for (const type of heroTypes) for (const monster of monsterTypes) for (const level of levels) for (const rank of ranks) for (const seed of seeds) for (const mirror of mirrors) cases.push({ ...base, id: `${type}-L${level}_${monster}-R${rank}`, heroes: [{ type, level }], monsters: [{ type: monster, rank }], seed: String(seed), mirror });
  return cases;
}
function toCsv(results) {
  const fields = ['id', 'ref', 'seed', 'difficulty', 'layout', 'mirror', 'mode', 'distance', 'outcome', 'reason', 'duration', 'heroRoster', 'monsterRoster', 'heroDeaths', 'heroSurvivors', 'heroHp', 'heroDamage', 'heroHealing', 'monsterDeaths', 'monsterSurvivors', 'monsterHp', 'monsterDamage', 'castleDamage', 'wallMs'];
  const encode = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  return [fields.join(','), ...results.map(r => {
    const row = { ...r, heroRoster: JSON.stringify(r.config.heroes), monsterRoster: JSON.stringify(r.config.monsters), heroDeaths: r.heroes.deaths, heroSurvivors: r.heroes.survivors, heroHp: r.heroes.hp, heroDamage: r.heroes.damage, heroHealing: r.heroes.healingCredited, monsterDeaths: r.monsters.deaths, monsterSurvivors: r.monsters.survivors, monsterHp: r.monsters.hp, monsterDamage: r.monsters.damage };
    return fields.map(key => encode(row[key])).join(',');
  })].join('\n') + '\n';
}
function selfTest(ref) {
  const h = createHarness({ ref });
  const basic = { heroes: [{ type: 'warrior', level: 1 }], monsters: [{ type: 'sporeling', rank: 1 }], trace: true, maxSeconds: 60 };
  const a = h.runArena(basic), b = h.runArena(basic);
  const clean = result => { const r = copy(result); delete r.wallMs; return r; };
  assert.deepEqual(clean(a), clean(b));
  assert.equal(a.outcome, 'win'); assert(a.duration > .1); assert(a.heroes.damage > 0); assert(a.monsters.damage > 0);
  assert(a.units.find(u => u.type === 'warrior').firstActionAt < 10);
  assert(a.starts.monsters.every(m => m.cooldown === 0 && !m.guard && m.raidAt === 0));
  assert.equal(a.units.find(u => u.type === 'warrior').finalLevel, 1);
  const short = h.runArena({ ...basic, maxSeconds: .1 }); assert.equal(short.duration, .1); assert.equal(short.outcome, 'timeout');
  assert.equal(h.runArena({ ...basic, heroes: [] }).outcome, 'loss');
  assert.equal(h.runArena({ ...basic, monsters: [] }).outcome, 'win');
  const mirror = h.runArena({ ...basic, mirror: true });
  assert.equal(mirror.starts.heroes[0].x, 64 - a.starts.heroes[0].x); assert.equal(mirror.starts.monsters[0].x, 64 - a.starts.monsters[0].x);
  const roleSwap = h.runArena({ ...basic, heroes: [{ type: 'ranger', level: 1 }] });
  assert.deepEqual(roleSwap.starts.heroes.map(({ x, y }) => [x, y]), a.starts.heroes.map(({ x, y }) => [x, y]));
  const scatterOne = h.runArena({ ...basic, layout: 'scatter', maxSeconds: .1 });
  const scatterTwo = h.runArena({ ...basic, heroes: [...basic.heroes, ...basic.heroes], layout: 'scatter', maxSeconds: .1 });
  assert.deepEqual(scatterOne.starts.monsters.map(({ x, y }) => [x, y]), scatterTwo.starts.monsters.map(({ x, y }) => [x, y]));
  const waves = h.runArena({ ...basic, waves: [{ delay: 2, monsters: basic.monsters }], reinforcements: [{ at: 20, monsters: basic.monsters }], maxSeconds: 90 });
  assert.equal(waves.requestedMonsters, 3); assert.equal(waves.outcome, 'win'); assert(waves.duration >= 20);
  const raised = h.runArena({ heroes: [{ type: 'necromancer', level: 3 }], monsters: [{ type: 'rattler', rank: 1 }], corpses: [{ rank: 3, x: 30, y: 20 }], maxSeconds: 3 });
  assert(raised.units.some(u => u.type === 'skeleton'));
  const brood = h.runArena({ heroes: [{ type: 'warrior', level: 3 }, { type: 'healer', level: 3 }], monsters: [{ type: 'broodcap', rank: 1 }], maxSeconds: 10 });
  assert(brood.monsters.byClass.sporeling?.count > 0);
  const binder = h.runArena({ heroes: [{ type: 'warrior', level: 3 }], monsters: [{ type: 'binder', rank: 1 }], corpses: [{ rank: 3, x: 33, y: 20 }], maxSeconds: 3 });
  assert(binder.monsters.byClass.boneservant?.count > 0);
  const servant = binder.units.find(u => u.type === 'boneservant');
  assert.equal(servant.startHp, 84); assert.equal(servant.maxHp, 84); assert.equal(servant.level, 3);
  const siege = h.runArena({ heroes: [], monsters: Array(3).fill({ type: 'siegebreaker', rank: 3 }), mode: 'objective', endOnPartyDeath: false, maxSeconds: 180 });
  assert(siege.castleDamage > 0); assert.equal(siege.outcome, 'loss');
  const leveled = h.runArena({ ...basic, allowLevelUps: true, heroes: [{ type: 'warrior', level: 1 }], monsters: Array(4).fill({ type: 'sporeling', rank: 1 }) });
  assert(leveled.units.find(u => u.type === 'warrior').finalLevel > 1);
  const withdrawal = h.runArena({ heroes: [{ type: 'warrior', level: 1, hpFraction: .2 }], monsters: [{ type: 'guardian', rank: 3 }], withdrawalSeconds: .2, maxSeconds: 10 });
  assert.equal(withdrawal.outcome, 'loss'); assert.equal(withdrawal.reason, 'withdrawal');
  const castleAlone = h.runArena({ mode: 'objective', castleShots: true, endOnPartyDeath: false, heroes: [], monsters: [{ type: 'rattler', rank: 1 }], maxSeconds: 40 });
  assert.equal(castleAlone.outcome, 'win'); assert(castleAlone.duration > 0); assert.equal(castleAlone.heroes.survivors, 0);
  const emptyDefence = h.runArena({ mode: 'objective', endOnPartyDeath: false, heroes: [], monsters: [{ type: 'rattler', rank: 1 }], maxSeconds: .1 });
  assert.equal(emptyDefence.outcome, 'timeout'); assert.equal(emptyDefence.allRetreatSeconds, 0);
  return { passed: true, ref: ref || 'working-tree', basicDuration: a.duration, basicDamage: a.heroes.damage, broodSpawns: brood.monsters.byClass.sporeling.count, binderSummons: binder.monsters.byClass.boneservant.count, siegeOutcome: siege.outcome };
}
function main(args) {
  const value = name => { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; };
  const list = (name, fallback) => value(name)?.split(',') || fallback;
  const ref = value('--ref') || null;
  if (args.includes('--help')) { console.log(fs.readFileSync(__filename, 'utf8').split("'use strict';")[0]); return; }
  if (args.includes('--self-test')) { console.log(JSON.stringify(selfTest(ref), null, 2)); return; }
  const h = createHarness({ ref });
  let cases;
  if (value('--matrix')) {
    const spec = JSON.parse(fs.readFileSync(value('--matrix'), 'utf8'));
    cases = Array.isArray(spec) ? spec : spec.cases || buildMatrix(spec);
  } else cases = buildMatrix({ heroTypes: list('--heroes', undefined), monsterTypes: list('--monsters', undefined), levels: list('--levels', ['1']).map(Number), ranks: list('--ranks', ['1']).map(Number), seeds: list('--seeds', ['0']), mirrors: value('--mirrors') === 'false' ? [false] : value('--mirrors') === 'true' ? [true] : [false, true], base: { difficulty: value('--difficulty') || 'steady', layout: value('--layout') || 'line', mode: value('--mode') || 'field', distance: Number(value('--distance') || 5), maxSeconds: Number(value('--max-seconds') || 180) } });
  if (args.includes('--benchmark')) {
    const count = Number(value('--benchmark') || 20), fixture = { heroes: ['warrior', 'warrior', 'healer', 'mage', 'necromancer'].map(type => ({ type, level: 3 })), monsters: ['rattler', 'rattler', 'broodcap', 'mender', 'binder', 'bulwark'].map(type => ({ type, rank: 3 })), maxSeconds: 90 };
    const times = [], begin = performance.now(); let steps = 0;
    for (let i = 0; i < count; i++) { const r = h.runArena({ ...fixture, seed: String(i), mirror: !!(i % 2) }); times.push(r.wallMs); steps += r.steps; }
    times.sort((a, b) => a - b);
    console.log(JSON.stringify({ ref: ref || 'working-tree', arenas: count, steps, wallMs: round(performance.now() - begin), meanArenaMs: round(times.reduce((a, b) => a + b, 0) / count), p95ArenaMs: times[Math.min(count - 1, Math.floor(count * .95))], note: 'Includes map creation and instrumentation; no browser frame-rate claim.' }, null, 2)); return;
  }
  const results = h.runBatch(cases);
  if (value('--json')) fs.writeFileSync(value('--json'), JSON.stringify({ controlVersion: CONTROL_VERSION, ref: ref || 'working-tree', results }, null, 2) + '\n');
  if (value('--csv')) fs.writeFileSync(value('--csv'), toCsv(results));
  console.log(JSON.stringify({ ref: ref || 'working-tree', arenas: results.length, outcomes: results.reduce((n, r) => { n[r.outcome] = (n[r.outcome] || 0) + 1; return n; }, {}), wallMs: round(results.reduce((n, r) => n + r.wallMs, 0)), json: value('--json') || null, csv: value('--csv') || null }, null, 2));
  if (!value('--json') && !value('--csv')) for (const r of results) console.log(JSON.stringify({ id: r.id, seed: r.seed, mirror: r.mirror, outcome: r.outcome, duration: r.duration, heroes: r.heroes, monsters: r.monsters }));
}
module.exports = { createHarness, buildMatrix, toCsv, selfTest, CONTROL_VERSION };
if (require.main === module) main(process.argv.slice(2));
