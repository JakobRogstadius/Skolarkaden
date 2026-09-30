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
 for(let i=0;i<125;i++)await call('POST',payload);assert.equal((await call('POST',payload)).status,429);
 console.log('PASS artwork validation, CORS, atomic six-picture retention, retry receipts and no scores');
})().catch(e=>{console.error(e);process.exitCode=1;});
