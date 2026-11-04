/* Actual-engine counter assays. node dev/glantan-cycle.cjs probe|confirm|branches|campaign LABEL
 * Every run freezes source bytes and exact cases before workers start. Results
 * retain wins/losses/timeouts separately, HP, deaths, XP and action telemetry.
 */
'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const {runStudy}=require('./glantan-study.cjs'),{createHarness}=require('./glantan-combat.cjs');
const ROOT=path.resolve(__dirname,'..'),T=['warrior','ranger','healer','mage','necromancer'],C={warrior:2,ranger:2,healer:3,mage:3,necromancer:3};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const files=[...['content','world','engine','orders','summons','traps','heroes','monsters','game'].map(n=>'resources/glantan/'+n+'.js'),...['cycle','study','combat','campaign','wave-study'].map(n=>'dev/glantan-'+n+'.cjs'),'dev/experiments/glantan-wave-variants.cjs','tests/games/glantan/helpers.cjs'];
function snapshot(){const sources=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(ROOT,f),'utf8')]));return {sha256:hash(JSON.stringify(sources)),sources};}
function roster(types,budget,level){
 if(types.length===1)return Array.from({length:Math.floor(budget/C[types[0]])},()=>({type:types[0],level}));
 let best;for(let a=1;a<=budget/C[types[0]];a++)for(let b=1;b<=budget/C[types[1]];b++){
  const spent=a*C[types[0]]+b*C[types[1]];if(spent>budget)continue;
  const score=(budget-spent)*100+Math.abs(a*C[types[0]]-b*C[types[1]]);
  if(!best||score<best.score)best={a,b,score};
 }if(!best)throw Error('Budget cannot buy pair');
 return [...Array.from({length:best.a},()=>({type:types[0],level})),...Array.from({length:best.b},()=>({type:types[1],level}))];
}
function makeCases(suite='probe'){
 const {G}=createHarness(),families=Object.keys(G.lairCounters),cases=[];
 const arms=T.map(t=>[t]);for(let i=0;i<T.length;i++)for(let j=i+1;j<T.length;j++)arms.push([T[i],T[j]]);
 const starts=suite==='confirm'?60:0,seeds=suite==='confirm'?6:suite==='branches'?3:3;
 const states=[[],['castle2','armor','boots','guardian','marksman','bloom','frost']];
 const branches=[];for(let bits=0;bits<16;bits++)branches.push(['castle2','armor','boots',bits&1?'banner':'guardian',bits&2?'traps':'marksman',bits&4?'ward':'bloom',bits&8?'echo':'frost']);
 for(const family of families)for(const [rank,level,budget] of suite==='branches'?[[5,4,18]]:[[3,3,12],[5,4,18]]){
  const tier=Math.min(3,rank),nestLevel=rank-tier+1,wave=Array.from(G.waveRoster({pace:'brave'},{type:family,tier,level:nestLevel}),type=>({type,rank,tier,level:nestLevel}));
  const counter=G.lairCounters[family],wrong=T.filter(t=>![counter.primary,counter.secondary,counter.punishes].includes(t));
  for(const research of suite==='branches'?branches:states)for(const towerCount of suite==='branches'?[0,1]:[0])for(const types of suite==='branches'?[[counter.primary,counter.secondary],wrong]:arms)for(let i=0;i<seeds;i++){
   const n=starts+i,heroes=roster(types,budget-3*towerCount,level),arm=types.join('+'),state=research.length?research.slice(3).join('+'):'base';
   cases.push({id:[family,rank,level,state,towerCount,arm].join('/'),seed:'cycle-'+n,difficulty:'brave',heroes,monsters:wave,lairType:family,research,mode:'objective',castleShots:false,endOnPartyDeath:false,maxSeconds:100,allowLevelUps:false,layout:['line','staggered','scatter'][i%3],distance:[3.4,5.2,6.8][i%3],spacing:[.8,1,1.2][Math.floor(i/3)%3],mirror:i%2===1,towers:Array.from({length:towerCount},()=>({type:'tower'})),cycle:{family,rank,level,budget,recruitment:heroes.reduce((s,h)=>s+C[h.type],0),guilds:[...new Set(heroes.map(h=>G.classes[h.type].guild))].reduce((s,t)=>s+G.buildings[t].cost,0),housing:Math.max(0,Math.ceil(heroes.length/4)-1)*2,upgrades:research.reduce((s,r)=>s+G.research[r].cost,0),towerCost:3*towerCount,arm,state,counter}});
  }
 }return cases;
}
function summarize(results){const map=new Map();for(const r of results){let g=map.get(r.id);if(!g)map.set(r.id,g={id:r.id,...r.config.cycle,n:0,wins:0,losses:0,timeouts:0,hp:0,deaths:0,seconds:0,xp:0});g.n++;g.wins+=r.outcome==='win';g.losses+=r.outcome==='loss';g.timeouts+=r.outcome==='timeout';g.hp+=r.heroes.hp/r.heroes.maxHp;g.deaths+=r.heroes.deaths;g.seconds+=r.duration;g.xp+=r.heroes.xpEarned||0;}return [...map.values()].map(g=>({...g,hp:g.hp/g.n,deaths:g.deaths/g.n,seconds:g.seconds/g.n,xp:g.xp/g.n}));}
async function main(){const suite=process.argv[2]||'probe',label=process.argv[3]||suite,dir=path.join(ROOT,'docs/glantan-cycle'),prefix=path.join(dir,label);fs.mkdirSync(dir,{recursive:true});if(fs.existsSync(prefix+'.results.json.gz'))throw Error('Refusing to overwrite evidence');
 const cases=makeCases(suite),before=snapshot();fs.writeFileSync(prefix+'.sources.json.gz',zlib.gzipSync(JSON.stringify({...before,cases}),{level:9}));
 console.log(JSON.stringify({start:label,cases:cases.length,source:before.sha256}));const results=await runStudy(cases,{jobs:6});const after=snapshot();if(after.sha256!==before.sha256)throw Error('Source changed during run');
 fs.writeFileSync(prefix+'.results.json.gz',zlib.gzipSync(JSON.stringify({sourceSha256:before.sha256,casesSha256:hash(JSON.stringify(cases)),results}),{level:9}));fs.writeFileSync(prefix+'.summary.json',JSON.stringify(summarize(results),null,2)+'\n');console.log(JSON.stringify({complete:label,cases:results.length,sourceUnchanged:true}));}
module.exports={snapshot,roster,makeCases,summarize};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
