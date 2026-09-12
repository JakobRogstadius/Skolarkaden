'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),db=new DatabaseSync(':memory:');
// Freeze the pre-migration table: testing only the latest schema would miss upgrade failures.
db.exec(`CREATE TABLE highscores (
 submission_id TEXT PRIMARY KEY NOT NULL, leaderboard_key TEXT NOT NULL,
 player_name TEXT NOT NULL CHECK(length(player_name) BETWEEN 1 AND 24),
 score INTEGER NOT NULL CHECK(typeof(score)='integer' AND score>=0), ip TEXT, settings_json TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_highscores_leaderboard ON highscores(leaderboard_key,score DESC,created_at ASC);`);
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const fixtures=[
 ['v2:city:swedish:gentle','EARLY',200],
 ['v2:city:english:brave','TIED',200],
 ['v2:city:letters:steady','LATER',200,'2026-02-01 00:00:00'],
 ['v2:city:math-addition:gentle','ANONYM',300],
 ['v1:city:swedish:gentle','OLD',9000],
 ['v2:food:swedish:gentle','FOOD',9000],
 ['v2:city:retired:brave','RETIRED',9000],
 ['v2:city:swedish:brave:extra','EXTRA',9000],
 ['invalid:city:swedish:gentle','BAD VERSION',9000],
 ['v2:city:swedish','SHORT',9000],
 ['v2:city:swedish:sv-SE:typing:gentle','LEGACY',9000]
];
fixtures.forEach(([key,name,score,date='2026-01-01 00:00:00'],i)=>{
 const settings=[null,'{invalid',JSON.stringify({game:'incorrect',exercise:'incorrect',input_mode:'voice'})][i%3];
 db.prepare('INSERT INTO highscores(submission_id,leaderboard_key,player_name,score,ip,settings_json,created_at) VALUES(?,?,?,?,?,?,?)')
  .run(id(i+1),key,name,score,'192.0.2.1',settings,date);
});
const raw=()=>db.prepare('SELECT rowid,submission_id,leaderboard_key,player_name,score,ip,settings_json,created_at FROM highscores ORDER BY submission_id').all();
const before=raw();db.exec(read('cloudflare/add-score-dimensions.sql'));
assert.deepEqual(raw(),before,'migration preserves every original field and row, including unknown settings and malformed keys');
const dimensions=key=>db.prepare('SELECT game_version,game,exercise,difficulty FROM highscores WHERE submission_id=?').get(key);
fixtures.forEach(([key],i)=>{if(key.split(':').length===4)assert.deepEqual(Object.values(dimensions(id(i+1))),key.split(':'),'dimensions come from keys, never settings JSON');});
const fresh=new DatabaseSync(':memory:');fresh.exec(read('cloudflare/schema.sql'));
assert.deepEqual(db.prepare('PRAGMA table_xinfo(highscores)').all(),fresh.prepare('PRAGMA table_xinfo(highscores)').all(),'new and migrated score schemas agree');
assert.deepEqual(db.prepare('PRAGMA index_info(idx_highscores_game)').all(),fresh.prepare('PRAGMA index_info(idx_highscores_game)').all());fresh.close();
assert(db.prepare('PRAGMA index_list(highscores)').all().some(row=>row.name==='idx_highscores_leaderboard'),'old Worker keeps its index');
const plans=[];
const DB={prepare(sql){let params=[];return {
 bind(...values){assert(values.length<=100,'D1 binding limit');params=values;return this;},
 async all(){if(/LIMIT 10/.test(sql))plans.push(db.prepare('EXPLAIN QUERY PLAN '+sql).all(...params));return {results:db.prepare(sql).all(...params)};},
 async first(){return db.prepare(sql).get(...params)||null;}
};}};
(async()=>{
 const worker=(await import('../cloudflare/worker.mjs')).default;
 const get=async route=>{const response=await worker.fetch(new Request('https://example.workers.dev'+route),{DB});assert.equal(response.status,200);return response.json();};
 const board=extra=>get('/scores?leaderboard=v2:city'+(extra||''));
 let result=await board('&submission='+id(2));
 assert.deepEqual(result.scores.map(row=>row.player_name),['ANONYM','EARLY','TIED','LATER']);
 assert.equal(result.rank,3);assert(result.saved);assert.equal(result.scores[2].is_player,1);
 assert.equal(result.capabilities.score_dimensions,1);
 assert.equal((await board('&score=200')).rank,5,'unsaved equal scores follow all existing ties');
 assert.equal((await board('&submission='+id(5))).saved,false,'old-version result is not the current player');
 assert.equal((await board('&submission='+id(7))).saved,false,'retired exercise is not the current player');
 let games=await get('/stats?group=games');assert.equal(games.entries.find(row=>row.id==='city').plays,6);
 const exercises=await get('/stats?group=exercises');assert.equal(exercises.entries.find(row=>row.id==='swedish').plays,3);
 // Writes from a still-deployed old Worker need no new columns; retries do not add a play.
 const insert=()=>db.prepare(`INSERT INTO highscores(submission_id,leaderboard_key,player_name,score)
  VALUES(?,?,?,?) ON CONFLICT(submission_id) DO NOTHING`).run(id(12),'v2:city:swedish:steady','NEW',250);
 assert.equal(insert().changes,1);assert.equal(insert().changes,0);
 assert.deepEqual(Object.values(dimensions(id(12))),['v2','city','swedish','steady']);
 assert.equal((await board('&submission='+id(2))).rank,4);
 games=await get('/stats?group=games');assert.equal(games.entries.find(row=>row.id==='city').plays,7);
 // Maintenance edits immediately move the indexed row, with no summary/trigger repair.
 db.prepare('UPDATE highscores SET leaderboard_key=?,score=? WHERE submission_id=?').run('v2:food:math-large-numbers:brave',1000,id(12));
 assert.deepEqual(Object.values(dimensions(id(12))),['v2','food','math-large-numbers','brave']);
 assert.equal((await board('&submission='+id(2))).rank,3);
 games=await get('/stats?group=games');assert.equal(games.entries.find(row=>row.id==='city').plays,6);assert.equal(games.entries.find(row=>row.id==='food').plays,2);
 db.prepare('DELETE FROM highscores WHERE submission_id=?').run(id(4));
 assert.equal((await board('&submission='+id(2))).rank,2);
 for(const plan of plans){
  assert(plan.some(row=>row.detail.includes('idx_highscores_game')),JSON.stringify(plan));
  assert(!plan.some(row=>/TEMP B-TREE|SCAN highscores/.test(row.detail)),JSON.stringify(plan));
 }
 db.close();console.log('PASS score dimensions: non-destructive migration, old Worker writes/retries, metadata corrections/deletions, exact ranks and actual indexed top-ten SQL.');
})().catch(error=>{console.error(error);process.exitCode=1;});
