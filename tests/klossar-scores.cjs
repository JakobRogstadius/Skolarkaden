'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite'),{randomUUID}=require('node:crypto');
(async()=>{
  const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(__dirname,'../cloudflare/schema.sql'),'utf8'));
  const DB={prepare(sql){let bindings=[];return {bind(...args){bindings=args;return this;},async all(){return {results:db.prepare(sql).all(...bindings)};},async first(){return db.prepare(sql).get(...bindings)||null;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...bindings).changes)}};}};}};
  const worker=(await import('../cloudflare/worker.mjs')).default;
  const call=(method,query,body)=>worker.fetch(new Request('https://test.workers.dev/scores'+query,{method,headers:{Origin:'https://jakobrogstadius.github.io','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.99'},...(body?{body:JSON.stringify(body)}:{})}),{DB});
  for(const pace of ['gentle','steady','brave']){
    const key='v1:klossar:math-addition:'+pace,payload={submission_id:randomUUID(),leaderboard_key:key,player_name:'TEST',score:5000,settings:{game_version:'v1',game:'klossar',exercise:'math-addition',difficulty:pace,input_mode:'click',spoken_language:null,exercise_language:'sv-SE',uppercase:null,letter_keys:null,sound_enabled:false,reduced_motion:true}};
    assert.equal((await call('POST','',payload)).status,201);assert.equal((await call('POST','',payload)).status,200);
    const response=await call('GET','?leaderboard='+encodeURIComponent(key));assert.equal(response.status,200);const board=await response.json();assert.equal(board.leaderboard,'v1:klossar');assert.equal(board.scores[0].score,5000);
  }
  const rows=db.prepare("SELECT game,game_version,settings_json FROM highscores").all();assert.equal(rows.length,3);
  for(const row of rows){assert.equal(row.game,'klossar');assert.equal(row.game_version,'v1');assert.equal(JSON.parse(row.settings_json).input_mode,'click');}
  const old={submission_id:randomUUID(),leaderboard_key:'v2:city:swedish:gentle',player_name:'TEST',score:50,settings:{input_mode:'click'}};
  assert.equal((await call('POST','',old)).status,400,'click mode is not silently accepted for the typing/voice games');
  db.close();console.log('PASS Klossar Worker scores at all three difficulties, click settings, combined records, retry deduplication and existing input validation');
})().catch(error=>{console.error(error);process.exitCode=1;});
