'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{mock}=require('node:test');
const {DatabaseSync}=require('node:sqlite'),read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const db=new DatabaseSync(':memory:');db.exec(read('cloudflare/schema.sql'));
const key='statistics-test-secret-with-at-least-32-characters',origin='https://jakobrogstadius.github.io',plans=[];
let queries=0;
const DB={prepare(sql){queries++;let values=[];return {
  bind(...params){assert(params.length<=100,'D1 bind limit');values=params;return this;},
  async first(){plans.push({sql,plan:db.prepare('EXPLAIN QUERY PLAN '+sql).all(...values)});return db.prepare(sql).get(...values)||null;},
  async all(){plans.push({sql,plan:db.prepare('EXPLAIN QUERY PLAN '+sql).all(...values)});return {results:db.prepare(sql).all(...values)};}
};}};
const insert=(id,date,ip,name='ADA',game='city',exercise='swedish',version='v2')=>db.prepare('INSERT INTO highscores(submission_id,created_at,ip,player_name,leaderboard_key,score) VALUES(?,?,?,?,?,?)').run(String(id).padStart(3,'0'),date,ip,name,[version,game,exercise,'gentle'].join(':'),Number(id));
(async()=>{
  const worker=(await import('../cloudflare/worker.mjs')).default;
  const call=(headers={},env={DB,STATS_ADMIN_KEY:key},route='/admin/stats',method='GET')=>worker.fetch(new Request('https://example.workers.dev'+route,{method,headers:{Origin:origin,...headers}}),env);
  const get=async()=>{const response=await call({Authorization:'Bearer '+key});assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.match(response.headers.get('Vary'),/Authorization/);return response.json();};
  for(const authorization of ['',key,'Bearer wrong','Bearer '+key+'x','Bearer '+key.slice(1)])assert.equal((await call({Authorization:authorization})).status,401);
  assert.equal((await call({}, {DB})).status,503);
  assert.equal((await call({}, {DB,STATS_ADMIN_KEY:'short'})).status,503);
  assert.equal((await call({Authorization:'Bearer '+key,Origin:'https://unrelated.example'})).status,403);
  assert.equal((await call({},undefined,'/admin/stats?key='+key)).status,401,'keys in URLs do not authenticate');
  assert.equal((await call({Authorization:'Bearer '+key},undefined,'/admin/stats','POST')).status,405);
  const preflight=await call({'Access-Control-Request-Headers':'authorization'},undefined,'/admin/stats','OPTIONS');
  assert.equal(preflight.status,204);assert.match(preflight.headers.get('Access-Control-Allow-Headers'),/Authorization/);
  assert.equal(queries,0,'unauthenticated requests never query the database');
  mock.timers.enable({apis:['Date'],now:Date.parse('2026-09-13T10:00:00.500Z')});
  const empty=await get();assert.equal(empty.unique_ips_ever,0);assert.equal(empty.unique_ips_week,0);assert.equal(empty.scores_week,0);assert.deepEqual(empty.latest,[]);assert.deepEqual(empty.top_ips,[]);
  assert.deepEqual(empty.days,['2026-09-07','2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13']);
  insert(1,'2026-01-01 00:00:00','192.0.2.3','OLD');
  insert(2,'2026-09-06 21:59:59','192.0.2.3','BEFORE');
  insert(3,'2026-09-06 22:00:00','192.0.2.1','ADA');
  insert(4,'2026-09-07 21:59:59','192.0.2.1','ANONYM');
  insert(5,'2026-09-07 22:00:00','192.0.2.2','ADA','food','english');
  insert(6,'2026-09-10 12:00:00','192.0.2.2','BO','food','english','v1');
  insert(7,'2026-09-09 23:00:00',null,'ANONYM','home','letters','v1');
  insert(8,'2026-09-12 21:59:59','','ANONYM','city','retired');
  insert(9,'2026-09-12 22:00:00','192.0.2.1','ADA');
  insert(10,'2026-02-01 00:00:00','192.0.2.3','OLDER');
  insert(11,'2026-01-15 00:00:00','192.0.2.3','OLDER');
  let data=await get();assert.equal(data.unique_ips_ever,3);assert.equal(data.unique_ips_week,2);assert.equal(data.scores_week,7);assert.equal(data.scores_without_ip_week,2);
  assert.deepEqual(data.latest.map(row=>row.score),[9,8,6,7,5,4,3,2,10,11]);
  assert(data.latest.every(row=>!('submission_id'in row)&&!('settings_json'in row)));
  assert.deepEqual(data.top_ips,[{ip:'192.0.2.1',plays:3,last_played:'2026-09-12 22:00:00',usernames:[{player_name:'ADA',plays:2},{player_name:'ANONYM',plays:1}]},{ip:'192.0.2.2',plays:2,last_played:'2026-09-10 12:00:00',usernames:[{player_name:'ADA',plays:1},{player_name:'BO',plays:1}]}]);
  for(const dimension of ['ip','game','exercise']){
    assert.deepEqual(data.days.map(day=>data.daily.filter(row=>row.day===day&&row.dimension===dimension).reduce((sum,row)=>sum+row.plays,0)),[2,1,0,2,0,1,1]);
  }
  assert.equal(data.daily.find(row=>row.dimension==='exercise'&&row.category==='retired').plays,1,'retired exercises count');
  // Repeated index migration preserves rows and can run before the new Worker.
  const before=db.prepare('SELECT * FROM highscores ORDER BY submission_id').all();db.exec(read('cloudflare/add-statistics-indexes.sql'));db.exec(read('cloudflare/add-statistics-indexes.sql'));
  assert.deepEqual(db.prepare('SELECT * FROM highscores ORDER BY submission_id').all(),before);
  for(const {sql,plan}of plans){
    if(sql.includes('LIMIT 10')){assert(plan.some(row=>row.detail.includes('idx_highscores_created')));assert(!plan.some(row=>/TEMP B-TREE/.test(row.detail)));}
    if(sql.includes('WITH days'))assert.equal(plan.filter(row=>/SEARCH highscores USING INDEX idx_highscores_created/.test(row.detail)).length,3,'each dimension uses indexed time ranges');
    if(sql.includes('count(DISTINCT ip)'))assert(plan.some(row=>row.detail.includes('idx_highscores_ip_created')));
  }
  // Known-IP activity ranking is capped, with deterministic same-time ties.
  for(let i=100;i<125;i++)insert(i,'2026-09-13 09:00:00','2001:db8::'+i,'SAME NAME');
  data=await get();assert.equal(data.top_ips.length,20);assert.equal(data.unique_ips_week,27);assert.equal(data.scores_week,32);assert.deepEqual(data.top_ips.slice(2).map(row=>row.ip),Array.from({length:18},(_,i)=>'2001:db8::'+(100+i)));
  // DST boundaries: 29 March has 23 hours, 25 October has 25 hours.
  for(const [now,rows,expected]of [
    ['2026-03-30T12:00:00Z',[['2026-03-28 22:59:59','28'],['2026-03-28 23:00:00','29'],['2026-03-29 21:59:59','29'],['2026-03-29 22:00:00','30']],[1,2,1]],
    ['2026-10-26T12:00:00Z',[['2026-10-24 21:59:59','24'],['2026-10-24 22:00:00','25'],['2026-10-25 22:59:59','25'],['2026-10-25 23:00:00','26']],[1,2,1]]
  ]){
    db.exec('DELETE FROM highscores');mock.timers.setTime(Date.parse(now));rows.forEach(([date],i)=>insert(i,date,'192.0.2.1'));
    const result=await get();assert.deepEqual(result.days.slice(-3).map(day=>result.daily.filter(row=>row.dimension==='ip'&&row.day===day).reduce((sum,row)=>sum+row.plays,0)),expected);
  }
  db.close();mock.timers.reset();console.log('PASS statistics: fail-closed authentication, private responses, actual indexed SQL, date/DST boundaries, unique IP counts, missing IPs, historical scores, latest ten and username ranking.');
})().catch(error=>{console.error(error);mock.timers.reset();process.exitCode=1;});
