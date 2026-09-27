'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite'),{randomUUID}=require('node:crypto');
(async()=>{
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(__dirname,'../cloudflare/schema.sql'),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async all(){return {results:db.prepare(sql).all(...args)};},async first(){return db.prepare(sql).get(...args)||null;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}};
 const worker=(await import('../cloudflare/worker.mjs')).default,policy=globalThis.SkolarkadenHighscorePolicy;
 const call=(method,query,body)=>worker.fetch(new Request('https://test.workers.dev/scores'+query,{method,headers:{Origin:'https://jakobrogstadius.github.io','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.98'},...(body?{body:JSON.stringify(body)}:{})}),{DB});
 const payload=(score,pace='gentle')=>({submission_id:randomUUID(),leaderboard_key:'v2:chess:swedish:'+pace,player_name:'TEST',score,settings:{input_mode:'keyboard'}});
 db.prepare("INSERT INTO highscores (submission_id,leaderboard_key,player_name,score) VALUES (?, 'v2:chess:swedish:gentle', 'PREVIOUS', 1234)").run(randomUUID());
 for(const [pace,score] of [['gentle',0],['steady',490],['brave',3240]]){
  const body=payload(score,pace);
  assert.equal((await call('POST','',body)).status,201);assert.equal((await call('POST','',body)).status,200);
 }
 const data=await (await call('GET','?leaderboard=v2:chess:swedish:gentle')).json();assert.equal(data.leaderboard,'v2:chess');assert.deepEqual(data.scores.map(r=>r.score),[3240,1234,490,0]);
 assert.equal((await (await call('GET','?leaderboard=v2:chess:swedish:gentle&score=490')).json()).rank,4);
 for(const bad of [-1,.5,policy.scoreCaps.chess+1,Number.MAX_SAFE_INTEGER,'1'])assert.equal((await call('POST','',payload(bad))).status,400);
 assert.equal((await call('POST','',payload(policy.scoreCaps.chess))).status,201);
 for(const version of ['v1','v3'])assert.equal((await call('POST','',{...payload(2),leaderboard_key:version+':chess:swedish:gentle'})).status,400,'only the retained v2 scoring version is accepted');
 db.prepare("INSERT INTO highscores (submission_id,leaderboard_key,player_name,score) VALUES (?, 'v1:chess:swedish:gentle', 'OLD', 2)").run(randomUUID());
 const current=await (await call('GET','?leaderboard=v2:chess')).json();assert.equal(current.scores.length,5);assert(!current.scores.some(row=>row.player_name==='OLD'));assert(current.scores.some(row=>row.player_name==='PREVIOUS'&&row.score===1234),'existing arcade scores stay on the leaderboard');
 assert.equal(db.prepare("SELECT count(*) AS n FROM highscores WHERE game = 'chess' AND game_version = 'v2'").get().n,5);
 db.close();console.log('PASS Chess scores: existing v2 scores retained, integer storage, ranking, idempotent submissions and raised score bound');
})().catch(error=>{console.error(error);process.exitCode=1;});
