'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(__dirname,'../cloudflare/schema.sql'),'utf8'));
const DB={prepare(sql){let params=[];return {bind(...values){params=values;return this;},async all(){return {results:db.prepare(sql).all(...params)};}};}};
let serial=0,records=[];
const repeat=(value,n=20)=>Array(n).fill(value);
function add(name,scores,{game='city',exercise='swedish',difficulty='gentle',version=game==='home'?'v1':'v2'}={}){
  for(const score of scores){records.push({name,score,game,exercise,difficulty,version});serial++;db.prepare('INSERT INTO highscores(submission_id,leaderboard_key,player_name,score,created_at,ip) VALUES(?,?,?,?,?,?)')
    .run('00000000-0000-4000-8000-'+String(serial).padStart(12,'0'),[version,game,exercise,difficulty].join(':'),name,score,new Date(Date.UTC(2026,0,1,0,0,serial)).toISOString(),'192.0.2.1');}
}
const clear=()=>{db.exec('DELETE FROM highscores');serial=0;records=[];};
(async()=>{
  const worker=(await import('../cloudflare/worker.mjs')).default;
  const stats=async()=>{const response=await worker.fetch(new Request('https://example.workers.dev/stats?group=exercises'),{DB});assert.equal(response.status,200);return response.json();};
  const leader=async(exercise='swedish')=>(await stats()).entries.find(row=>row.id===exercise);
  const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-5,actual+' != '+expected);
  // Independent, deliberately simple reference implementation of the approved rule.
  const reference=(exercise='swedish')=>{
    const eligible=records.filter(r=>r.version===(r.game==='home'?'v1':'v2')&&['swedish','english','letters'].includes(r.exercise));
    const named=new Map();
    for(const record of eligible){
      if(record.name==='ANONYM'||record.exercise!==exercise)continue;
      const pool=eligible.filter(r=>r.game===record.game);
      const percentile=100*(pool.filter(r=>r.score<record.score).length+pool.filter(r=>r.score===record.score).length/2)/pool.length;
      if(!named.has(record.name))named.set(record.name,[]);named.get(record.name).push(percentile);
    }
    const averages=[...named].filter(([,scores])=>scores.length>=5).map(([name,scores])=>({name,rating:Number((scores.sort((a,b)=>b-a).slice(0,5).reduce((s,n)=>s+n,0)/5).toFixed(8))}));
    const rating=averages.length?Math.max(...averages.map(r=>r.rating)):null;
    return {rating,names:averages.filter(r=>r.rating===rating).map(r=>r.name).sort()};
  };
  const check=async(exercise='swedish')=>{const row=await leader(exercise),expected=reference(exercise);assert.equal(row.rating,expected.rating);if(expected.names.length)assert(expected.names.includes(row.player_name));else assert.equal(row.player_name,null);return row;};
  assert.equal((await stats()).ranking_method,'top-five-game-percentiles-v1');
  assert.equal((await leader()).rating,null);
  add('ALICE',[10,20,30,40]);assert.equal((await check()).rating,null,'four results do not qualify');
  add('ANONYM',[0],{exercise:'english',difficulty:'brave'});
  add('ALICE',[50]);let row=await check();assert.equal(row.player_name,'ALICE');near(row.rating,58.33333333);
  assert.equal(row.sample_count,5,'all five can come from one favourite game');
  add('BILL',[0],{exercise:'letters',difficulty:'steady'});row=await check();near(row.rating,64.28571429);
  add('OLD',repeat(100000),{version:'v1'});add('RETIRED',repeat(100000),{exercise:'math'});
  assert.equal((await check()).rating,row.rating,'old versions and retired IDs are not current game boards');
  add('ANONYM',repeat(100000,40),{game:'food'});assert.equal((await check()).rating,row.rating,'other games cannot change a city percentile');
  add('ANONYM',repeat(100000,40));assert((await check()).rating<row.rating,'anonymous results remain in the same-game denominator');
  // Both exercises and difficulty levels are pooled before any candidate filtering.
  clear();add('ALICE',[10,20],{difficulty:'gentle'});add('ALICE',[30,40],{difficulty:'steady'});add('ALICE',[50],{difficulty:'brave'});
  add('ANONYM',[15,25,35,45,55],{exercise:'english',difficulty:'brave'});
  row=await check();assert.equal(row.rating,45);assert.equal(row.player_name,'ALICE');assert.equal(row.plays,5);
  // Five results may also be spread across games with very different score scales.
  clear();add('ALICE',[10,20,30]);add('ANONYM',repeat(0,7),{exercise:'english'});
  add('ALICE',[10000,20000],{game:'food'});add('ANONYM',repeat(0,8),{game:'food',difficulty:'brave'});
  row=await check();assert.equal(row.rating,87);assert.equal(row.sample_count,5);
  add('ALICE',[50000],{game:'food'});row=await check();assert(row.rating>87);
  add('ALICE',[100000],{game:'hive'});add('ANONYM',repeat(200000,9),{game:'hive'});
  assert.equal((await check()).rating,row.rating,'a huge raw score with a low percentile is not one of the best five');
  // Best five, not latest five, best raw scores, or an average across played games.
  clear();add('ALICE',[200,201,202,203,204]);add('ANONYM',Array.from({length:100},(_,i)=>i));
  add('ALICE',repeat(0,40));row=await check();assert(row.rating>95,'historical best attempts remain eligible');
  assert.equal(row.sample_count,5);
  // Qualification is per name AND exercise, but never requires five different games.
  add('BOB',repeat(1000,4));add('BOB',repeat(1000,5),{exercise:'english'});
  assert.equal((await check()).player_name,'ALICE');assert.equal((await check('english')).player_name,'BOB');
  add('BOB',[1000]);assert.equal((await check()).player_name,'BOB');
  // Tied scores get mid-ranks; equal averages pick whoever completed their best five first.
  clear();add('BOB',repeat(100,5));add('ALICE',repeat(100,5));add('ANONYM',repeat(0,10));
  row=await check();assert.equal(row.rating,75);assert.equal(row.player_name,'BOB');assert.equal(row.player_names,undefined);
  add('CARL',repeat(1000,4));row=await check();assert.equal(row.rating,62.5);assert.equal(row.player_name,'BOB');
  add('CARL',[1000]);row=await check();assert.equal(row.player_name,'CARL');assert.equal(row.rating,90);
  assert.deepEqual(Object.keys(row).sort(),['id','player_name','plays','rating','sample_count','score']);
  assert.equal(row.score,null,'an exercise must never publish a cross-game raw record');
  clear();add('BOB',repeat(10,5));add('ALICE',repeat(10000,5),{game:'food'});
  row=await check();assert.equal(row.rating,50);assert.equal(row.player_name,'BOB','completion order, not nickname order or raw score, breaks equal averages');
  db.exec("UPDATE highscores SET created_at = '2026-01-01 00:00:00'");
  row=await check();assert.equal(row.player_name,'BOB','submission IDs resolve the remaining same-time tie deterministically');
  clear();add('ANONYM',repeat(500,50));row=await check();assert.equal(row.rating,null);assert.equal(row.player_name,null);assert.equal(row.plays,50);
  // Identical solo results are the middle of their own comparison pool, not perfect.
  clear();add('ALICE',repeat(100,5));row=await check();assert.equal(row.rating,50);
  clear();add('ALICE',repeat(100000,5));row=await check();assert.equal(row.rating,50,'score rescaling alone cannot improve a percentile');
  db.close();console.log('PASS exercise rating: five best percentiles, all exercises/difficulties/anonymous in game pools, one-game specialists, mixed games, qualification, ties and privacy.');
})().catch(error=>{console.error(error);process.exitCode=1;});
