/* Descriptive campaign summaries. JSONL or gzip JSONL inputs; stdout is JSON.
 * These are scripted-policy results, not estimates of human victory rates. */
'use strict';
const fs=require('node:fs'),zlib=require('node:zlib');
const {wilson}=require('./glantan-evidence.cjs');
const quantile=(values,p=.5)=>{if(!values.length)return null;const a=[...values].sort((a,b)=>a-b),at=(a.length-1)*p,lo=Math.floor(at);return +(a[lo]+(a[Math.ceil(at)]-a[lo])*(at-lo)).toFixed(3);};
const read=file=>(file.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync(file)):fs.readFileSync(file)).toString().trim().split('\n').filter(Boolean).map(JSON.parse);
// Historical telemetry included binder summons in sent. Their distinct type
// recovers cohort size without rewriting archived records.
const cohortBodies=w=>Object.entries(w.roster).filter(([type])=>type!=='boneservant').reduce((n,[,count])=>n+count,0);
function summarize(rows){const groups=new Map();for(const r of rows){const c=r.config,key=[r.variant,r.source,c.pace,c.seconds,c.accuracy,c.jitter,c.limit,c.policy].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  return [...groups].map(([key,rs])=>{const wins=rs.filter(r=>r.outcome==='won'),losses=rs.filter(r=>r.outcome==='lost'),timeouts=rs.filter(r=>r.outcome==='timeout');
    const waves=rs.flatMap(r=>r.waves||[]),contacts=waves.filter(w=>w.contact);
    const phases=[0,180,360,540,720,900].map(from=>{const ws=contacts.filter(w=>w.contact.time>=from&&w.contact.time<from+180);return{from,to:from+180,contacts:ws.length,medianWaveBodies:quantile(ws.map(w=>Object.values(w.contact.survivingRoster).reduce((a,b)=>a+b,0))),medianHeroCount:quantile(ws.map(w=>w.contact.heroes.length)),medianNearbyHeroes:quantile(ws.map(w=>w.contact.nearbyHeroes.length)),medianHeroLevel:quantile(ws.flatMap(w=>w.contact.heroes.map(h=>h.level))),medianPurchasedUpgrades:quantile(ws.map(w=>w.contact.upgrades.length)),medianNearbyMonsters:quantile(ws.map(w=>w.contact.nearbyMonsters))};});
    return{key,config:{...rs[0].config,seed:undefined},source:rs[0].source,variant:rs[0].variant,n:rs.length,wins:wins.length,losses:losses.length,timeouts:timeouts.length,winRate:wins.length/rs.length,nominalWilson95:wilson(wins.length,rs.length),medianWinSeconds:quantile(wins.map(r=>r.seconds)),medianFallen:quantile(rs.map(r=>r.fallen)),medianCastleDamage:quantile(rs.map(r=>r.castleDamage)),castleDamagedGames:rs.filter(r=>r.castleDamage>0).length,gamesWithCasualties:rs.filter(r=>r.fallen>0).length,medianSampledPeakRaiders:quantile(rs.map(r=>r.maxRaiders)),medianPaidPurchaseCost:quantile(rs.map(r=>r.paid)),medianCorrectAnswers:quantile(rs.map(r=>r.hits)),medianErrors:quantile(rs.map(r=>r.errors)),waveLaunches:waves.length,medianLaunchedBodies:quantile(waves.map(cohortBodies)),maxLaunchedBodies:Math.max(0,...waves.map(cohortBodies)),contactPhases:phases};
  });
}
module.exports={summarize,read,quantile};
if(require.main===module){const files=process.argv.slice(2);if(!files.length)throw Error('Pass campaign JSONL or JSONL.gz paths');console.log(JSON.stringify({definition:'Victories, castle losses and unresolved deadline timeouts are separate. Nominal intervals describe these seeded policies. Contact distributions pool observed encounters and are not independent campaign samples. Extrema are sampled at one-second intervals.',groups:summarize(files.flatMap(read))},null,2));}
