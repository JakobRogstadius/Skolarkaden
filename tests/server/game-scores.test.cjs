'use strict';
const assert = require('node:assert/strict');
const {DatabaseSync} = require('node:sqlite');
const {randomUUID} = require('node:crypto');
const {read} = require('../helpers/runtime.cjs');
(async () => {
  const worker = (await import('../../cloudflare/worker.mjs')).default;
  const policy = globalThis.SkolarkadenHighscorePolicy;
  for (const {game, version, input, values} of [
    {game:'chess', version:'v2', input:'keyboard', values:[0,490,3240]},
    {game:'klossar', version:'v1', input:'click', values:[5000,5000,5000]},
    {game:'trassel', version:'v1', input:'click', values:[5000,5000,5000]},
    {game:'bubblefish', version:'v1', input:'click', values:[1200,1200,1200]}
  ]) {
    const db = new DatabaseSync(':memory:'); db.exec(read('cloudflare/schema.sql'));
    const DB = {prepare(sql) {
      let args = [];
      return {bind(...values){args=values;return this;},
        async all(){return {results:db.prepare(sql).all(...args)};},
        async first(){return db.prepare(sql).get(...args)||null;},
        async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};
    }};
    const call = (method, query='', body) => worker.fetch(new Request('https://test.workers.dev/scores'+query, {
      method, headers:{Origin:'https://jakobrogstadius.github.io','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.98'},
      ...(body ? {body:JSON.stringify(body)} : {})
    }), {DB});
    const payload = (score, pace='gentle') => ({submission_id:randomUUID(),
      leaderboard_key:`${version}:${game}:swedish:${pace}`,player_name:'TEST',score,
      settings:{game_version:version,game,exercise:'swedish',difficulty:pace,input_mode:input,
        spoken_language:null,exercise_language:'sv-SE',uppercase:null,letter_keys:null,sound_enabled:false,reduced_motion:true}});
    if(game==='chess') db.prepare("INSERT INTO highscores (submission_id,leaderboard_key,player_name,score) VALUES (?, 'v2:chess:swedish:gentle', 'PREVIOUS', 1234)").run(randomUUID());
    for(const [i,pace] of ['gentle','steady','brave'].entries()) {
      const body=payload(values[i],pace);
      assert.equal((await call('POST','',body)).status,201);
      assert.equal((await call('POST','',body)).status,200,'retry does not duplicate a score');
    }
    const board=await (await call('GET',`?leaderboard=${version}:${game}:swedish:gentle`)).json();
    assert.equal(board.leaderboard,`${version}:${game}`);
    assert.deepEqual(board.scores.map(row=>row.score),game==='chess'?[3240,1234,490,0]:values);
    const rows=db.prepare('SELECT game,game_version,settings_json FROM highscores WHERE player_name = ?').all('TEST');
    assert.equal(rows.length,3);
    for(const row of rows) {assert.equal(row.game,game);assert.equal(row.game_version,version);assert.equal(JSON.parse(row.settings_json).input_mode,input);}
    if(game==='chess') {
      assert.equal((await (await call('GET','?leaderboard=v2:chess:swedish:gentle&score=490')).json()).rank,4);
      for(const bad of [-1,.5,policy.scoreCaps.chess+1,Number.MAX_SAFE_INTEGER,'1']) assert.equal((await call('POST','',payload(bad))).status,400);
      assert.equal((await call('POST','',payload(policy.scoreCaps.chess))).status,201);
      for(const version of ['v1','v3']) assert.equal((await call('POST','',{...payload(2),leaderboard_key:version+':chess:swedish:gentle'})).status,400);
      db.prepare("INSERT INTO highscores (submission_id,leaderboard_key,player_name,score) VALUES (?, 'v1:chess:swedish:gentle', 'OLD', 2)").run(randomUUID());
      const current=await (await call('GET','?leaderboard=v2:chess')).json();
      assert.equal(current.scores.length,5);assert(!current.scores.some(row=>row.player_name==='OLD'));
      assert(current.scores.some(row=>row.player_name==='PREVIOUS'&&row.score===1234));
    } else {
      assert.equal((await call('POST','',{...payload(50),leaderboard_key:'v2:city:swedish:gentle',settings:{input_mode:'click'}})).status,400,'click input stays exclusive to click games');
    }
    db.close();
  }
  console.log('PASS game score versions, combined boards, bounds, input modes and retry storage');
})().catch(error => {console.error(error);process.exitCode=1;});
