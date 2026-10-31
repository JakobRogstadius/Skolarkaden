/* Repeatable simulation benchmark. Optional: --ref <commit>, --json <path>.
   node --cpu-prof --cpu-prof-dir=/tmp dev/glantan-performance.cjs
   Timings describe this machine, not a browser/device frame-rate guarantee. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const ref = args.includes('--ref') ? args[args.indexOf('--ref') + 1] : null;
const context = vm.createContext({ console, Math, performance, Starlight: {} });
for (const file of ['content', 'world', 'engine', 'orders', 'summons', 'traps', 'heroes', 'monsters']) {
  const name = 'resources/glantan/' + file + '.js';
  const source = ref ? execFileSync('git', ['show', ref + ':' + name], { cwd: root, encoding: 'utf8' }) : fs.readFileSync(path.join(root, name), 'utf8');
  vm.runInContext(source, context, { filename: name });
}
const G = context.Starlight.Glantan;
const results = [];
for (const scene of ['march', 'battle']) {
  const initial = new G.Simulation({ seed: 'performance', pace: 'brave' }), w = initial.world, home = G.castle(w);
  w.explored.fill(1);
  for (const lair of w.lairs) { lair.wakeAt = lair.nextGrowth = lair.nextSpawn = lair.nextGuardAt = 1e6; lair.seen = true; lair.level = 4; }
  for (let i = 0; i < 24; i++) {
    const h = G.addHero(w, ['warrior', 'ranger', 'healer', 'mage', 'necromancer'][i % 5]);
    h.level = 3; h.hp = h.maxHp = 10000; h.trait = 2; h.rethinkAt = 1e6;
    h.x = home.x - 4 + i % 6; h.y = home.y - 6 + Math.floor(i / 6);
  }
  for (const lair of w.lairs) G.launchWave(w, lair);
  if (scene === 'battle') w.monsters.forEach((m, i) => {
    m.guard = false; m.x = home.x - 6 + i % 12; m.y = home.y - 8 + Math.floor(i / 12) * .4;
    m.hp = m.maxHp = 10000;
  });
  w.effects = []; w.notices = []; w.time = 1;
  const snapshot = JSON.stringify(w), samples = [];
  for (let run = 0; run < 13; run++) {
    const sim = new G.Simulation({ saved: JSON.parse(snapshot) });
    for (let step = 0; step < 50; step++) {
      const start = performance.now(); sim.step(.1); const ms = performance.now() - start;
      if (run >= 3) samples.push(ms);
    }
  }
  samples.sort((a, b) => a - b);
  results.push({ scene, heroes: w.heroes.length, monsters: w.monsters.length, meanMs: +(samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(3), p95Ms: +samples[Math.floor(samples.length*.95)].toFixed(3), maxMs: +samples.at(-1).toFixed(3) });
}
console.log(JSON.stringify({ ref: ref || 'working-tree', results }, null, 2));
if (args.includes('--json')) fs.writeFileSync(args[args.indexOf('--json')+1], JSON.stringify(results));
