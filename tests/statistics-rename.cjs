'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(__dirname,'../cloudflare/schema.sql'),'utf8'));
const origin='https://jakobrogstadius.github.io',key='Testkey123!?',plans=[];let writes=0;
const DB={prepare(sql){let values=[];return {
  bind(...params){values=params;return this;},
  async run(){writes++;plans.push(db.prepare('EXPLAIN QUERY PLAN '+sql).all(...values));return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};},
  async all(){return {results:db.prepare(sql).all(...values)};},async first(){return db.prepare(sql).get(...values)||null;}
};}};
const fixtures=[
  ['192.0.2.1','ADA','2020-01-01 00:00:00','v1:city:retired:gentle'],
  ['192.0.2.1','ADA','2026-09-15 08:00:00','v2:food:swedish:brave'],
  ['192.0.2.1','ADA','2026-09-15 08:01:00','v1:home:homework:steady'],
  ['192.0.2.2','ADA'],['192.0.2.1','ADAM'],['192.0.2.1','ada'],[null,'ADA'],
  ['2001:db8::1','ADA'],['192.0.2.1',"' OR 1=1 --"],['192.0.2.1','ANONYM'],['192.0.2.1','OLD.NAME'],['192.0.2.1','ÅSA']
];
fixtures.forEach(([ip,name,date='2026-09-15 08:00:00',board='v2:city:swedish:gentle'],i)=>db.prepare('INSERT INTO highscores(submission_id,leaderboard_key,player_name,score,ip,settings_json,created_at) VALUES(?,?,?,?,?,?,?)').run('row-'+i,board,name,100+i,ip,'{"unchanged":true}',date));
const snapshot=()=>db.prepare('SELECT * FROM highscores ORDER BY submission_id').all().map(row=>({...row}));
(async()=>{
  const worker=(await import('../cloudflare/worker.mjs')).default;
  const payload={ip:'192.0.2.1',old_name:'ADA',new_name:' åsa '};
  const call=(body=payload,options={})=>worker.fetch(new Request('https://example.workers.dev'+(options.route||'/admin/rename'),{
    method:options.method||'POST',headers:{Origin:origin,Authorization:'Bearer '+key,'Content-Type':'application/json',...options.headers},
    ...(['GET','OPTIONS'].includes(options.method)?{}:{body:options.raw===undefined?JSON.stringify(body):options.raw})
  }),options.env||{DB,STATS_ADMIN_KEY:key});
  const denied=[
    [{headers:{Authorization:''}},401],[{headers:{Authorization:'Bearer wrong'}},401],
    [{headers:{Origin:'https://unrelated.example'}},403],[{headers:{Origin:''}},403],
    [{env:{DB}},503],[{env:{DB,STATS_ADMIN_KEY:'short'}},503],[{method:'GET'},405],
    [{route:'/admin/stats'},405],[{headers:{'Content-Type':'text/plain'}},415],
    [{raw:'{'},400],[{raw:'x'.repeat(2049)},413]
  ];
  for(const [options,status]of denied)assert.equal((await call(payload,options)).status,status);
  const preflight=await call(undefined,{method:'OPTIONS',headers:{Authorization:'','Access-Control-Request-Headers':'authorization,content-type'}});
  assert.equal(preflight.status,204);assert.match(preflight.headers.get('Access-Control-Allow-Headers'),/Authorization/);assert.match(preflight.headers.get('Access-Control-Allow-Methods'),/POST/);
  for(const body of [null,[],{}, {...payload,ip:''},{...payload,ip:'%'},{...payload,ip:"' OR 1=1 --"},{...payload,old_name:''},{...payload,old_name:12},{...payload,old_name:'x'.repeat(25)},
    {...payload,new_name:''},{...payload,new_name:'123'},{...payload,new_name:'Å.SA'},{...payload,new_name:'ABCDEFGHIJK'},{...payload,new_name:'fuck'},{...payload,new_name:'ada'}])assert.equal((await call(body)).status,400);
  assert.equal(writes,0,'invalid or unauthorized requests never mutate scores');
  const before=snapshot(),response=await call();assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.match(response.headers.get('Vary'),/Authorization/);
  assert.deepEqual(await response.json(),{ok:true,updated:3,new_name:'ÅSA'});
  const expected=before.map(row=>({...row,player_name:row.ip==='192.0.2.1'&&row.player_name==='ADA'?'ÅSA':row.player_name}));
  assert.deepEqual(snapshot(),expected,'only names matching both IP and exact name change, across historical versions; all other fields survive');
  assert.equal((await (await call()).json()).updated,0,'repeating an applied replacement cannot change more rows');
  assert.equal((await (await call({...payload,old_name:'AD'})).json()).updated,0,'substrings do not match');
  assert.equal((await (await call({...payload,old_name:'ADA%'})).json()).updated,0,'wildcards are literal');
  assert.equal((await (await call({...payload,old_name:"' OR 1=1 --",new_name:'safe'})).json()).updated,1,'SQL-like historical names can be corrected literally');
  assert.equal((await (await call({...payload,old_name:'ada',new_name:'Bo'})).json()).updated,1,'lowercase historical names match only their exact case');
  assert.equal((await (await call({...payload,old_name:'OLD.NAME',new_name:'Lina'})).json()).updated,1,'historical punctuation is accepted in the source name');
  assert.equal((await (await call({...payload,old_name:'ANONYM',new_name:'Elsa'})).json()).updated,1,'anonymous scores can be renamed for just the selected IP');
  assert.equal((await (await call({...payload,ip:'2001:db8::1',new_name:'Ada Två'})).json()).updated,1,'IPv6 targets are supported');
  assert.equal(db.prepare('SELECT player_name FROM highscores WHERE submission_id=?').get('row-3').player_name,'ADA','same name on another IP is preserved');
  assert.equal(db.prepare('SELECT player_name FROM highscores WHERE submission_id=?').get('row-4').player_name,'ADAM','another name on the same IP is preserved');
  const board=await worker.fetch(new Request('https://example.workers.dev/scores?leaderboard=v2:food'),{DB});
  assert.equal((await board.json()).scores[0].player_name,'ÅSA','public leaderboard reads reflect the renamed record');
  for(const plan of plans)assert(plan.some(row=>row.detail.includes('idx_highscores_ip_created')),'renaming uses the existing IP index');
  db.close();console.log('PASS administrator renaming: authenticated POST, exact IP/name scope, all dates/versions, validation, SQL safety, affected counts, public reads and unchanged score metadata.');
})().catch(error=>{console.error(error);process.exitCode=1;});
