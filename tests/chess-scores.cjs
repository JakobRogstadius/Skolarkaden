'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite'),{randomUUID}=require('node:crypto');
(async()=>{
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(__dirname,'../cloudflare/schema.sql'),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async all(){return {results:db.prepare(sql).all(...args)};},async first(){return db.prepare(sql).get(...args)||null;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}};
 const worker=(await import('../cloudflare/worker.mjs')).default,policy=globalThis.SkolarkadenHighscorePolicy;
 const call=(method,query,body)=>worker.fetch(new Request('https://test.workers.dev/scores'+query,{method,headers:{Origin:'https://jakobrogstadius.github.io','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.98'},...(body?{body:JSON.stringify(body)}:{})}),{DB});
 const payload=(score,pace='gentle')=>({submission_id:randomUUID(),leaderboard_key:'v2:chess:swedish:'+pace,player_name:'TEST',score,settings:{input_mode:'keyboard'}});
 for(const [pace,score] of [['gentle',0],['steady',490],['brave',1240]]){
  const body=payload(score,pace);
  assert.equal((await call('POST','',body)).status,201);assert.equal((await call('POST','',body)).status,200);
 }
 const data=await (await call('GET','?leaderboard=v2:chess:swedish:gentle')).json();assert.equal(data.leaderboard,'v2:chess');assert.deepEqual(data.scores.map(r=>r.score),[1240,490,0]);
 assert.equal((await (await call('GET','?leaderboard=v2:chess:swedish:gentle&score=490')).json()).rank,3);
 for(const bad of [-1,.5,2431,1000000,'1'])assert.equal((await call('POST','',payload(bad))).status,400);
 assert.equal((await call('POST','',payload(policy.scoreCaps.chess))).status,201);
 assert.equal((await call('POST','',{...payload(2),leaderboard_key:'v1:chess:swedish:gentle'})).status,400,'old scoring cannot enter the new board');
 db.prepare("INSERT INTO highscores (submission_id,leaderboard_key,player_name,score) VALUES (?, 'v1:chess:swedish:gentle', 'OLD', 2)").run(randomUUID());
 const current=await (await call('GET','?leaderboard=v2:chess')).json();assert.equal(current.scores.length,4);assert(!current.scores.some(row=>row.player_name==='OLD'));
 assert.equal(db.prepare("SELECT count(*) AS n FROM highscores WHERE game = 'chess' AND game_version = 'v2'").get().n,4);
 db.close();console.log('PASS Chess scores: integer storage, ranking, idempotent submissions, bounds and separation from historical match scores');
})().catch(error=>{console.error(error);process.exitCode=1;});
