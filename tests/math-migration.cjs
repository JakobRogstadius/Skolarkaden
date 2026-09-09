'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {DatabaseSync}=require('node:sqlite'),{randomUUID}=require('node:crypto');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),db=new DatabaseSync(':memory:');
db.exec(read('cloudflare/schema.sql'));
const context=vm.createContext({});vm.runInContext(read('resources/data.js'),context);vm.runInContext(read('resources/highscore-policy.js'),context);
const ids=context.Starlight.legacyMathIds,currentIds=context.SkolarkadenHighscorePolicy.mathExercises;
assert.deepEqual(Array.from(currentIds),Object.keys(context.Starlight.modes).filter(context.Starlight.isMath));
const insert=db.prepare('INSERT INTO highscores(submission_id,leaderboard_key,player_name,score,ip,settings_json,created_at) VALUES(?,?,?,?,?,?,?)');
for(const [old,id] of Object.entries(ids))for(const version of ['v1','v2'])for(const pace of ['gentle','steady','brave']){
 const board=`${version}:city:${old}:${pace}`;
 for(const settings of [null,'{invalid','null','[]',JSON.stringify({exercise:old,sound_enabled:false,extra:'retained'})])insert.run(randomUUID(),board,'ÅSA',42,'192.0.2.1',settings,'2026-08-01 12:00:00');
 insert.run(randomUUID(),`${version}:city:${id}:${pace}`,'BO',50,null,JSON.stringify({exercise:old}),'2026-08-01 12:00:00');
}
for(const id of ['swedish','math20','math-diagrams','math-simple-equations'])insert.run(randomUUID(),`v2:city:${id}:gentle`,'ANONYM',20,null,JSON.stringify({exercise:id}),'2026-08-01 12:00:00');
const rows=()=>db.prepare('SELECT * FROM highscores ORDER BY submission_id').all();
const before=rows();db.exec(read('cloudflare/migrate-math-exercise-ids.sql'));const after=rows();
assert.equal(before.length,after.length);
for(let i=0;i<before.length;i++){
 const expected={...before[i]},parts=expected.leaderboard_key.split(':');parts[2]=ids[parts[2]]||parts[2];expected.leaderboard_key=parts.join(':');
 try{const settings=JSON.parse(expected.settings_json);if(settings&&ids[settings.exercise]){settings.exercise=ids[settings.exercise];expected.settings_json=JSON.stringify(settings);}}catch{}
 assert.deepEqual({...after[i]},expected);
}
db.exec(read('cloudflare/migrate-math-exercise-ids.sql'));assert.deepEqual(rows(),after);assert.equal(db.prepare('SELECT changes() AS n').get().n,0);
const DB={prepare(sql){let params=[];return {bind(...p){assert(p.length<=100,'D1 parameter limit');params=p;return this;},async run(){return {meta:{changes:db.prepare(sql).run(...params).changes}};},async all(){return {results:db.prepare(sql).all(...params)};},async first(){return db.prepare(sql).get(...params)||null;}};}};
(async()=>{
 const worker=(await import('../cloudflare/worker.mjs')).default;
 const call=(method,path,body)=>worker.fetch(new Request('https://example.workers.dev'+path,{method,headers:{Origin:'https://jakobrogstadius.github.io','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},...(body?{body:JSON.stringify(body)}:{})}),{DB});
 assert.equal((await (await call('GET','/health')).json()).capabilities.named_math_ids,1);
 for(const id of currentIds){
  const payload={submission_id:randomUUID(),leaderboard_key:`v2:food:${id}:gentle`,player_name:'BO',score:90,settings:{exercise:id}};
  assert.equal((await call('POST','/scores',payload)).status,201);
  const row=db.prepare('SELECT * FROM highscores WHERE submission_id=?').get(payload.submission_id);assert.equal(row.leaderboard_key,`v2:food:${id}:gentle`);assert.equal(JSON.parse(row.settings_json).exercise,id);
  for(const key of ['v2:food',payload.leaderboard_key]){
   const result=await (await call('GET',`/scores?leaderboard=${key}&submission=${payload.submission_id}`)).json();assert(result.saved);assert(result.scores.some(r=>r.exercise===id));
  }
  assert.equal((await call('POST','/scores',payload)).status,200);
  assert.deepEqual(db.prepare('SELECT * FROM highscores WHERE submission_id=?').get(payload.submission_id),row);
  assert.equal((await call('POST','/scores',{...payload,score:91})).status,409);
  assert.equal((await call('POST','/scores',{...payload,settings:{exercise:'math'}})).status,400);
  assert.equal((await call('POST','/scores',{...payload,settings:{exercise:id,uppercase:true}})).status,409);
 }
 for(const old of Object.keys(ids)){
  const key=`v2:food:${old}:gentle`;
  assert.equal((await call('POST','/scores',{submission_id:randomUUID(),leaderboard_key:key,score:10})).status,400);
  assert.equal((await call('GET','/scores?leaderboard='+key)).status,400);
 }
 for(const id of ['math-diagrams','math-simple-equations'])assert.equal((await call('POST','/scores',{submission_id:randomUUID(),leaderboard_key:`v1:home:${id}:brave`,score:10})).status,201);
 console.log('PASS Atomic mathematics migration; all current math IDs, shared rankings and exact retries; obsolete IDs rejected');db.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
