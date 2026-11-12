/* Frozen paid-economy campaigns for the five-family counter cycle. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {snapshot}=require('./glantan-cycle.cjs');
const root=path.resolve(__dirname,'..'),suite=process.argv[2]||'probe',label=process.argv[3]||('campaign-'+suite);
assert(['probe','confirm'].includes(suite));assert(/^[a-zA-Z0-9_-]+$/.test(label));
const prefix=path.join(root,'docs/glantan-cycle',label);fs.mkdirSync(path.dirname(prefix),{recursive:true});
assert(!fs.existsSync(prefix+'.sources.json.gz'),'Evidence already exists');
const cases=[];
function add(pace,seconds,n,offset){for(let i=0;i<n;i++)for(const policy of ['counter','counterAlt','rangers']) cases.push({id:[pace,seconds,i,policy].join('/'),variant:'baseline',config:{seed:'cycle-campaign-'+(offset+i),pace,policy,seconds,accuracy:.95,jitter:.25,limit:1800,trace:true}});}
if(suite==='probe')add('brave',6,4,0);
else{add('brave',6,8,100);add('brave',4,3,100);add('brave',8,3,100);add('gentle',6,2,100);add('steady',6,2,100);}
const before=snapshot();
fs.writeFileSync(prefix+'.sources.json.gz',zlib.gzipSync(JSON.stringify({...before,cases}),{level:9}));
fs.writeFileSync(prefix+'.cases.json',JSON.stringify(cases,null,2)+'\n');
const child=spawnSync(process.execPath,['dev/glantan-wave-study.cjs','--cases',prefix+'.cases.json','--out',prefix+'.results.jsonl','--jobs','6'],{cwd:root,stdio:'inherit'});
assert.equal(child.status,0,'Campaign worker failed; partial results retained');assert.equal(snapshot().sha256,before.sha256,'Source changed');
const rows=fs.readFileSync(prefix+'.results.jsonl');fs.writeFileSync(prefix+'.results.jsonl.gz',zlib.gzipSync(rows,{level:9}));fs.unlinkSync(prefix+'.results.jsonl');
const groups=new Map();for(const r of rows.toString().trim().split('\n').map(JSON.parse)){const key=[r.config.pace,r.config.seconds,r.config.policy].join('/');if(!groups.has(key))groups.set(key,{key,n:0,won:0,lost:0,timeout:0,fallen:0});const g=groups.get(key);g.n++;g[r.outcome]++;g.fallen+=r.fallen;}
fs.writeFileSync(prefix+'.summary.json',JSON.stringify([...groups.values()],null,2)+'\n');console.log([...groups.values()]);
