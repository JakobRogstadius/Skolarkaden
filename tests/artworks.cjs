'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite'),{webcrypto}=require('node:crypto'),{deflateSync}=require('node:zlib');
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(__dirname,'../cloudflare/schema.sql'),'utf8'));db.exec(fs.readFileSync(path.join(__dirname,'../cloudflare/add-artworks.sql'),'utf8'));
const DB={prepare(sql){let params=[];return {bind(...values){params=values;return this;},async run(){return this.execute();},execute(){const r=db.prepare(sql).run(...params);return {meta:{changes:Number(r.changes)}};},async all(){return {results:db.prepare(sql).all(...params)};},async first(){return db.prepare(sql).get(...params)||null;}};},async batch(statements){db.exec('BEGIN');try{const r=statements.map(s=>s.execute());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
function chunk(type,data){const bytes=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^(0xedb88320&-(crc&1));}const size=Buffer.alloc(4),checksum=Buffer.alloc(4);size.writeUInt32BE(data.length);checksum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([size,bytes,checksum]);}
const header=Buffer.alloc(13);header.writeUInt32BE(960);header.writeUInt32BE(640,4);header[8]=8;header[9]=2;
const image='data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((960*3+1)*640))),chunk('IEND',Buffer.alloc(0))]).toString('base64');
(async()=>{
 const worker=(await import('../cloudflare/worker.mjs')).default,origin='https://jakobrogstadius.github.io';
 const call=(method,body,headers={})=>worker.fetch(new Request('https://worker.test/artworks',{method,headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.5',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}),{DB});
 assert.equal((await call('OPTIONS')).status,204);assert.deepEqual(await (await call('GET')).json(),{artworks:[]});
 const payload={submission_id:webcrypto.randomUUID(),player_name:'Åsa',image};
 assert.equal((await call('POST',payload)).status,201);assert.equal((await call('POST',payload)).status,200);assert.equal((await call('POST',{...payload,player_name:'ANN'})).status,409);
 assert.equal(db.prepare('SELECT count(*) AS n FROM artworks').get().n,1);
 for(const change of [{player_name:''},{player_name:' '},{player_name:'<img>'},{player_name:'FUCK'},{submission_id:'wrong'},{image:'data:image/svg+xml;base64,PHN2Zz4='},{image:image.slice(0,-24)}])assert.equal((await call('POST',{...payload,...change})).status,400);
 assert.equal((await call('POST',payload,{Origin:'https://other.test'})).status,403);assert.equal((await call('POST',payload,{'Content-Type':'text/plain'})).status,415);
 assert.equal((await call('POST',{...payload,image:'a'.repeat(910000)})).status,413);
 const saves=Array.from({length:8},(_,i)=>({...payload,submission_id:webcrypto.randomUUID(),player_name:'NAMN'+String.fromCharCode(65+i)}));
 for(const p of saves)assert.equal((await call('POST',p)).status,201);
 assert((await Promise.all(Array.from({length:5},()=>call('POST',saves.at(-1))))).every(r=>r.status===200),'concurrent retries stay idempotent');
 const rows=(await (await call('GET')).json()).artworks;assert.equal(rows.length,6);assert.deepEqual(rows.map(r=>r.player_name),saves.slice(-6).reverse().map(r=>r.player_name));
 assert(rows.every(r=>Object.keys(r).sort().join(',')==='created_at,image,player_name'),'public response excludes IDs and IPs');
 assert.equal((await call('POST',payload)).status,200,'retry of retired artwork is acknowledged');assert.deepEqual((await (await call('GET')).json()).artworks,rows,'retired artwork is not resurrected');
 assert.equal(db.prepare('SELECT count(*) AS n FROM artworks').get().n,6);assert.equal(db.prepare('SELECT count(*) AS n FROM highscores').get().n,0,'artworks never create score rows');
 db.prepare("UPDATE artwork_receipts SET created_at = datetime('now', '-40 days') WHERE submission_id = ?").run(saves.at(-1).submission_id);
 assert.equal((await call('POST',saves.at(-1))).status,200,'a visible picture keeps its retry receipt after thirty days');
 const key='Testkey123!?',target=saves.at(-1),admin=(route='/admin/artworks',method='GET',body,options={})=>worker.fetch(new Request('https://worker.test'+route,{method,headers:{Origin:origin,Authorization:'Bearer '+key,'Content-Type':'application/json',...options.headers},...(body===undefined?{}:{body:options.raw??JSON.stringify(body)})}),options.env||{DB,STATS_ADMIN_KEY:key});
 const before=db.prepare('SELECT * FROM artworks ORDER BY sequence').all();
 for(const [route,method,body]of [['/admin/artworks','GET'],['/admin/artworks/delete','POST',{submission_id:target.submission_id}]]){
  for(const [options,status]of [[{headers:{Authorization:''}},401],[{headers:{Authorization:'Bearer wrong'}},401],[{headers:{Origin:'https://other.test'}},403],[{env:{DB}},503],[{env:{DB,STATS_ADMIN_KEY:'short'}},503]])assert.equal((await admin(route,method,body,options)).status,status);
  const preflight=await admin(route,'OPTIONS');assert.equal(preflight.status,204);assert.match(preflight.headers.get('Access-Control-Allow-Headers'),/Authorization/);
 }
 assert.equal((await admin('/admin/artworks','POST',{})).status,405);assert.equal((await admin('/admin/artworks/delete','GET')).status,405);
 for(const [body,options,status]of [[{}, {},400],[{submission_id:"' OR 1=1 --"},{},400],[{submission_id:target.submission_id},{headers:{Origin:''}},403],[{submission_id:target.submission_id},{headers:{'Content-Type':'text/plain'}},415],[{}, {raw:'{'},400],[{}, {raw:'x'.repeat(2049)},413]])assert.equal((await admin('/admin/artworks/delete','POST',body,options)).status,status);
 assert.deepEqual(db.prepare('SELECT * FROM artworks ORDER BY sequence').all(),before,'rejected deletions never change the gallery');
 const listing=await admin();assert.equal(listing.headers.get('Cache-Control'),'no-store');assert.match(listing.headers.get('Vary'),/Authorization/);
 assert.deepEqual((await listing.json()).artworks.map(row=>row.submission_id),saves.slice(-6).reverse().map(row=>row.submission_id),'admin listing identifies exactly the latest six paintings');
 const remove=()=>admin('/admin/artworks/delete','POST',{submission_id:target.submission_id});
 const removed=await remove();assert.equal(removed.status,200);assert.equal(removed.headers.get('Cache-Control'),'no-store');assert.deepEqual(await removed.json(),{ok:true,deleted:1});
 assert.deepEqual(db.prepare('SELECT * FROM artworks ORDER BY sequence').all(),before.filter(row=>row.submission_id!==target.submission_id),'delete is scoped to one immutable ID and preserves other rows');
 assert.deepEqual(await (await remove()).json(),{ok:true,deleted:0},'repeated removal is harmless');
 const receipt=db.prepare('SELECT created_at FROM artwork_receipts WHERE submission_id=?').get(target.submission_id);assert(Date.now()-Date.parse(receipt.created_at.replace(' ','T')+'Z')<5000,'old receipt retention restarts on deletion');
 assert.equal((await call('POST',target)).status,200);assert.equal(db.prepare('SELECT count(*) AS n FROM artworks WHERE submission_id=?').get(target.submission_id).n,0,'a delayed save cannot restore a deleted painting');
 assert.deepEqual((await (await call('GET')).json()).artworks,rows.slice(1),'public gallery reflects deletion immediately');
 for(const row of before.slice(0,-1))await admin('/admin/artworks/delete','POST',{submission_id:row.submission_id});
 assert.deepEqual(await (await admin()).json(),{artworks:[]},'removing the last painting yields an empty gallery');
 for(let i=0;i<125;i++)await call('POST',payload);assert.equal((await call('POST',payload)).status,429);
 console.log('PASS artwork validation, CORS, six-picture retention, private admin listing, authenticated exact-ID deletion, retry receipts and no scores');
})().catch(e=>{console.error(e);process.exitCode=1;});
