/* Combat study driver. Large experiments are opt-in, never ordinary regression tests.
 * node dev/glantan-study.cjs --suite pilot --ref 28ba8b8 --out /tmp/pilot.json
 * node dev/glantan-study.cjs --suite core --seeds 6 --out /tmp/core.json
 * node dev/glantan-study.cjs --suite core --seeds 100 --offset 10000 --filter FAMILY --out /tmp/validation.json
 */
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const { execFileSync } = require('node:child_process');
const { createHarness } = require('./glantan-combat.cjs');
const TYPES = ['warrior', 'ranger', 'healer', 'mage', 'necromancer'];
const COST = { warrior: 2, ranger: 2, healer: 3, mage: 3, necromancer: 3 };
// Initial estimates; --budget-file freezes pilot-calibrated weights for all subsequent rounds.
const THREAT = { rattler: .75, sporeling: .5, husher: 1.25, nightwing: .75, thornling: .9, mender: 1.4, binder: 2.2, boneservant: .85, siegebreaker: 2, broodcap: 2.5, bulwark: 2, guardian: 4 };
const FAMILIES = Object.fromEntries(Object.keys(THREAT).map(t => [t, [[t, 1]]]));
Object.assign(FAMILIES, { rust: [['rattler', 3], ['mender', 1]], spore: [['sporeling', 3], ['broodcap', 1]], hush: [['husher', 3], ['binder', 1]], sky: [['nightwing', 3], ['siegebreaker', 1]], thorn: [['thornling', 3], ['bulwark', 1]], undead: [['boneservant', 3], ['binder', 1]], shielded: [['bulwark', 1], ['mender', 1], ['rattler', 2]] });
const heroFactor = level => Math.sqrt((1 + (level - 1) * .17) * (1 + (level - 1) * .16));
const monsterFactor = rank => { const tier = Math.min(3, rank); return 1 + (tier - 1) * .22 + (rank - tier) * .2; };
const heroBudget = roster => roster.reduce((n, h) => n + COST[h.type] * heroFactor(h.level), 0);
const monsterBudget = (roster, weights) => roster.reduce((n, m) => n + weights[m.type] * monsterFactor(m.rank), 0);
const heroes = (type, n, level) => Array.from({ length: n }, () => ({ type, level }));
const monsters = (type, n, rank) => Array.from({ length: n }, () => ({ type, rank }));
function armies(budget = 12, level = 3) {
  if (!Number.isInteger(budget) || budget <= 0 || TYPES.some(type => !Number.isInteger(budget / 2 / COST[type]))) throw Error('Budget must allocate whole units to every half-budget pair (use a positive multiple of 12).');
  const out = TYPES.map(type => ({ name: type, roster: heroes(type, budget / COST[type], level) }));
  for (let a = 0; a < TYPES.length; a++) for (let b = a + 1; b < TYPES.length; b++) {
    const A = TYPES[a], B = TYPES[b];
    out.push({ name: A + '+' + B, roster: [...heroes(A, budget / 2 / COST[A], level), ...heroes(B, budget / 2 / COST[B], level)] });
  }
  return out;
}
function enemyRoster(family, budget, rank, weights) {
  const recipe = FAMILIES[family], roster = [];
  const cycle = recipe.flatMap(([type, n]) => Array(n).fill(type));
  let used = 0, i = 0;
  while (roster.length < 40) {
    const type = cycle[i++ % cycle.length], value = weights[type] * monsterFactor(rank);
    if (used + value > budget && roster.length && Math.abs(used - budget) < Math.abs(used + value - budget)) break;
    roster.push({ type, rank }); used += value;
    if (used >= budget) break;
  }
  return roster;
}
function makeCases(options) {
  const { suite = 'core', seeds = 6, offset = 0, filter = '', weights = THREAT } = options;
  if (!Number.isInteger(seeds) || seeds < 1 || !Number.isInteger(offset) || offset < 0) throw Error('seeds must be a positive integer and offset a nonnegative integer.');
  const cases = [];
  function add(group, config, extra = {}) {
    if (filter && !group.includes(filter)) return;
    for (let s = 0; s < seeds; s++) {
      const seed = offset + s;
      cases.push({ id: group, seed: 'study-' + seed, layout: 'scatter', mirror: seed % 2 === 1,
        distance: [3.4, 5.2, 6.8][seed % 3], spacing: [.65, 1, 1.35][Math.floor(seed / 3) % 3],
        maxSeconds: 100, ...config,
        study: { ...extra, heroBudget: heroBudget(config.heroes), monsterBudget: monsterBudget(config.monsters, weights) } });
    }
  }
  if (suite === 'pilot') {
    const roster = ['warrior', 'ranger', 'healer', 'mage'].map(type => ({ type, level: 3 }));
    for (const type of Object.keys(weights)) for (const n of [2, 4, 6, 8, 12, 16, 24, 32]) add(`pilot/${type}/${n}`, { heroes: roster, monsters: monsters(type, n, 3), mode: type === 'siegebreaker' ? 'objective' : 'field', spacing: .75 }, { family: type, count: n });
  } else if (suite === 'core' || suite === 'levels') {
    for (const level of suite === 'levels' ? [1, 3, 5, 8] : [3]) {
      const rank = Math.min(6, level);
      for (const army of armies(12, level)) for (const family of Object.keys(FAMILIES)) for (const ratio of [.7, 1, 1.3]) {
        const enemy = enemyRoster(family, heroBudget(army.roster) * ratio, rank, weights);
        add(`${family}/L${level}/${ratio}/${army.name}`, { heroes: army.roster, monsters: enemy, mode: family === 'siegebreaker' || family === 'sky' ? 'objective' : 'field' }, { family, level, ratio, army: army.name });
      }
    }
  } else throw Error('Unknown suite: ' + suite);
  return cases;
}
function summarize(results) {
  const groups = new Map();
  for (const r of results) {
    if (!groups.has(r.id)) groups.set(r.id, { id: r.id, ...r.config.study, n: 0, wins: 0, losses: 0, timeouts: 0, duration: 0, heroDeaths: 0, castleDamage: 0 });
    const g = groups.get(r.id); g.n++; g.wins += r.outcome === 'win'; g.losses += r.outcome === 'loss'; g.timeouts += r.outcome === 'timeout'; g.duration += r.duration;
    g.heroDeaths += r.units.filter(u => u.side === 'heroes' && u.type !== 'skeleton' && !u.alive).length; g.castleDamage += r.castleDamage;
  }
  return [...groups.values()].map(g => ({ ...g, winRate: g.wins / g.n, duration: g.duration / g.n, heroDeaths: g.heroDeaths / g.n, castleDamage: g.castleDamage / g.n }));
}
async function runStudy(cases, { ref = null, jobs = 4, configure = null } = {}) {
  if (!Number.isInteger(jobs) || jobs < 1 || jobs > 8) throw Error('jobs must be an integer from 1 to 8.');
  if (configure && jobs !== 1) throw Error('Function overrides require jobs=1; workers must evaluate tracked source.');
  if (jobs === 1) { const h = createHarness({ ref, configure }); return cases.map(c => h.runArena(c)); }
  const chunks = Array.from({ length: jobs }, () => []);
  cases.forEach((config, i) => chunks[i % jobs].push({ index: i, config }));
  const results = await Promise.all(chunks.map(chunk => new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { cases: chunk, ref } });
    worker.once('message', resolve); worker.once('error', reject); worker.once('exit', code => { if (code) reject(Error('Worker exit ' + code)); });
  })));
  return results.flat().sort((a, b) => a.index - b.index).map(x => x.result);
}
if (!isMainThread) {
  const h = createHarness({ ref: workerData.ref });
  parentPort.postMessage(workerData.cases.map(({ index, config }) => ({ index, result: h.runArena(config) })));
} else if (require.main === module) (async () => {
  const args = process.argv.slice(2), arg = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
  const options = { suite: arg('--suite', 'core'), seeds: Number(arg('--seeds', '6')), offset: Number(arg('--offset', '0')), filter: arg('--filter', ''), weights: arg('--budget-file', null) ? JSON.parse(fs.readFileSync(arg('--budget-file'), 'utf8')).weights : THREAT };
  const ref = arg('--ref', null), jobs = Number(arg('--jobs', '4')), out = arg('--out', null);
  if (!out) throw Error('--out is required (results are not silently lost).');
  const cases = arg('--cases', null) ? JSON.parse(fs.readFileSync(arg('--cases'), 'utf8')) : makeCases(options);
  const hash = crypto.createHash('sha256'), sourceFiles = ['content','world','engine','orders','summons','traps','heroes','monsters'];
  for (const name of sourceFiles) {
    const file = 'resources/glantan/' + name + '.js';
    hash.update(file + '\0'); hash.update(ref ? execFileSync('git', ['show', `${ref}:${file}`], { cwd: path.join(__dirname, '..') }) : fs.readFileSync(path.join(__dirname, '..', file)));
  }
  const sourceSha256 = hash.digest('hex');
  const casesSha256 = crypto.createHash('sha256').update(JSON.stringify(cases)).digest('hex');
  console.log(JSON.stringify({ start: true, suite: options.suite, cases: cases.length, ref, jobs, out }));
  const start = Date.now(), results = await runStudy(cases, { ref, jobs });
  const report = { protocol: 1, ref: ref || 'working-tree', sourceSha256, casesSha256, options, wallSeconds: (Date.now() - start) / 1000, summary: summarize(results), results };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report) + '\n');
  console.log(JSON.stringify({ finished: true, cases: results.length, seconds: report.wallSeconds, outcomes: results.reduce((o, r) => { o[r.outcome] = (o[r.outcome] || 0) + 1; return o; }, {}), out }));
})().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { TYPES, COST, THREAT, FAMILIES, armies, enemyRoster, heroBudget, monsterBudget, makeCases, summarize, runStudy };
