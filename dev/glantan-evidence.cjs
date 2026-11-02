/* Compact, replayable evidence without checking hundreds of MB of per-tick
 * experiment output into Git. All outcomes, seeds and exact input templates stay.
 * node dev/glantan-evidence.cjs pack /tmp/raw.json docs/glantan-combat/data/run.json.gz
 * node dev/glantan-evidence.cjs cases docs/glantan-combat/data/run.json.gz /tmp/cases.json
 */
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const zlib = require('node:zlib');
const varying = ['seed', 'layout', 'distance', 'spacing', 'mirror'];
const columns = [...varying, 'outcome', 'reason', 'duration', 'heroDeaths', 'heroHp', 'heroDamage', 'heroHealing', 'monsterSurvivors', 'monsterHp', 'monsterDamage', 'monsterHealing', 'castleDamage', 'firstAllRetreatAt', 'allRetreatSeconds'];
function pack(raw, rawSha256) {
  if (!Array.isArray(raw.results)) throw Error('Expected a report with results[].');
  const groups = new Map();
  for (const r of raw.results) {
    const fixed = { ...r.config }; for (const key of varying) delete fixed[key];
    const key = JSON.stringify(fixed);
    if (!groups.has(key)) groups.set(key, { config: fixed, observations: [], units: {} });
    const g = groups.get(key);
    g.observations.push([...varying.map(k => r.config[k]), r.outcome, r.reason, r.duration, r.heroes.deaths, r.heroes.hp, r.heroes.damage, r.heroes.healingCredited, r.monsters.survivors, r.monsters.hp, r.monsters.damage, r.monsters.healingReceived, r.castleDamage, r.firstAllRetreatAt, r.allRetreatSeconds]);
    for (const unit of r.units) {
      const type = unit.side + '/' + unit.type;
      const u = g.units[type] ||= { units: 0, deaths: 0, damage: 0, healingReceived: 0, healingCredited: 0, movement: 0, retreatSeconds: 0, actions: {} };
      u.units++; u.deaths += !unit.alive;
      for (const [to, from] of [['damage','damageDealt'],['healingReceived','healingReceived'],['healingCredited','healingCredited'],['movement','movement'],['retreatSeconds','retreatSeconds']]) u[to] += unit[from] || 0;
      for (const [action, n] of Object.entries(unit.actions)) u.actions[action] = (u.actions[action] || 0) + n;
    }
  }
  for (const g of groups.values()) for (const unit of Object.values(g.units)) for (const [k, v] of Object.entries(unit)) if (typeof v === 'number') unit[k] = Math.round(v * 1e4) / 1e4;
  const { results, ...metadata } = raw;
  return { format: 'glantan-evidence-1', rawSha256, metadata, columns, cases: results.length, groups: [...groups.values()] };
}
function unpack(evidence) {
  if (evidence.format !== 'glantan-evidence-1') throw Error('Unknown evidence format.');
  return evidence.groups.flatMap(g => g.observations.map(row => ({ ...g.config, ...Object.fromEntries(varying.map(k => [k, row[evidence.columns.indexOf(k)]])) })));
}
function observations(evidence) {
  return evidence.groups.flatMap(g => g.observations.map(row => ({ ...Object.fromEntries(evidence.columns.map((key, i) => [key, row[i]])), config: g.config, id: g.config.id })));
}
function wilson(wins, n, z = 1.959963984540054) {
  if (!n) return [0, 1];
  const p = wins / n, d = 1 + z*z/n, c = (p + z*z/(2*n)) / d, r = z * Math.sqrt(p*(1-p)/n + z*z/(4*n*n)) / d;
  return [Math.max(0,c-r), Math.min(1,c+r)];
}
// Paired bootstrap resamples the same seed triple in all arms. Taking the better
// pure arm inside each resample avoids treating that selected comparator as fixed.
function synergy(mixed, a, b, outcome = 'win', iterations = 10000) {
  if (!mixed.length || mixed.length !== a.length || mixed.length !== b.length) throw Error('Synergy requires three nonempty, equally sized paired samples.');
  const lookup = rows => { const map = new Map(rows.map(r => [r.seed, r])); if (map.size !== rows.length) throw Error('Duplicate seeds within a synergy arm.'); return map; };
  lookup(mixed);
  const A = lookup(a), B = lookup(b);
  const triples = mixed.map(m => { if (!A.has(m.seed) || !B.has(m.seed)) throw Error('Unpaired seeds.'); return [m.outcome === outcome ? 1 : 0, A.get(m.seed).outcome === outcome ? 1 : 0, B.get(m.seed).outcome === outcome ? 1 : 0]; });
  const n = triples.length, totals = triples.reduce((sum,t) => sum.map((v,i)=>v+t[i]), [0,0,0]);
  let rng = 0x126fa9b3;
  const random = () => { rng = (Math.imul(rng,1664525)+1013904223)>>>0; return rng/4294967296; };
  const samples = [];
  for (let k=0;k<iterations;k++) { const sum=[0,0,0]; for(let i=0;i<n;i++) {const t=triples[Math.floor(random()*n)]; for(let j=0;j<3;j++)sum[j]+=t[j];} samples.push((sum[0]-Math.max(sum[1],sum[2]))/n); }
  samples.sort((x,y)=>x-y);
  const comparisons = [1,2].map(j=> {
    const better=triples.filter(t=>t[0]>t[j]).length, worse=triples.filter(t=>t[0]<t[j]).length;
    const discordant=better+worse;
    let logMass=-discordant*Math.log(2), p=0;
    for(let k=0;k<=discordant;k++) {if(k>=better)p+=Math.exp(logMass);if(k<discordant)logMass+=Math.log(discordant-k)-Math.log(k+1);}
    return { better, worse, oneSidedExactP: Math.min(1,p) };
  });
  return { n, wins: totals, rates: totals.map(v=>v/n), intervals: totals.map(v=>wilson(v,n)), delta: (totals[0]-Math.max(totals[1],totals[2]))/n, pairedBootstrap95: [samples[Math.floor(iterations*.025)],samples[Math.floor(iterations*.975)]], comparisons, passes: totals[0]-Math.max(totals[1],totals[2])>=.15*n && comparisons.every(c=>c.oneSidedExactP<.025) };
}
if(require.main===module) {
  const [command,input,output]=process.argv.slice(2); if(!input||!output)throw Error('Use pack|cases INPUT OUTPUT.');
  const stored=fs.readFileSync(input), bytes=input.endsWith('.gz')?zlib.gunzipSync(stored):stored, data=JSON.parse(bytes);
  const result=command==='pack'?pack(data,crypto.createHash('sha256').update(bytes).digest('hex')):command==='cases'?unpack(data):null;
  if(!result)throw Error('Unknown command.');
  const serialized=JSON.stringify(result)+'\n';
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true}); fs.writeFileSync(output,output.endsWith('.gz')?zlib.gzipSync(serialized,{level:9}):serialized);
  console.log(JSON.stringify({output,cases:command==='cases'?result.length:result.cases,bytes:fs.statSync(output).size}));
}
module.exports={pack,unpack,observations,wilson,synergy};
