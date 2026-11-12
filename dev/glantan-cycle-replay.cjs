/* Verify and replay counter-cycle records from their frozen source bundles. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'docs/glantan-cycle');
const baseRef='000e26162009eaab5534a729fe9b86561b6b1705';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const unpack=f=>zlib.gunzipSync(fs.readFileSync(path.join(dir,f))).toString();
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
function load(label){
 const bundle=JSON.parse(unpack(label+'.sources.json.gz'));
 assert.equal(hash(JSON.stringify(bundle.sources)),bundle.sha256,'source bundle checksum');
 const campaign=fs.existsSync(path.join(dir,label+'.results.jsonl.gz'));
 const data=campaign?unpack(label+'.results.jsonl.gz').trim().split('\n').map(JSON.parse):JSON.parse(unpack(label+'.results.json.gz'));
 const rows=campaign?data:data.results;
 assert.equal(rows.length,bundle.cases.length,'record count');
 if(!campaign){assert.equal(data.sourceSha256,bundle.sha256);assert.equal(data.casesSha256,hash(JSON.stringify(bundle.cases)));}
 const cases=new Map(bundle.cases.map(c=>[campaign?c.id:c.id+'/'+c.seed,c]));
 assert.equal(cases.size,rows.length,'unique cases');
 for(const r of rows){const key=campaign?r.id:r.id+'/'+r.seed,c=cases.get(key);assert(c,'unexpected or duplicate result');cases.delete(key);
  if(campaign)assert.equal(canonical(r.config),canonical(c.config));
  else for(const [k,v] of Object.entries(c))assert.equal(canonical(r.config[k]),canonical(v),'case configuration '+k);
 }
 assert.equal(cases.size,0);return {bundle,rows,campaign};
}
const [command='verify',label,countText='6']=process.argv.slice(2);
const manifestPath=path.join(dir,'manifest.json');
if(command==='seal'){
 const datasets=fs.readdirSync(dir).filter(f=>f.endsWith('.sources.json.gz')).map(f=>f.replace('.sources.json.gz','')).sort();
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('.gz')).sort();
 const records=datasets.map(label=>({label,records:load(label).rows.length}));
 fs.writeFileSync(manifestPath,JSON.stringify({baseRef,datasets:records,sha256:Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(dir,f)))]))},null,2)+'\n');console.log(records);
}else if(command==='verify'){
 const manifest=JSON.parse(fs.readFileSync(manifestPath));
 for(const [f,sha] of Object.entries(manifest.sha256))assert.equal(hash(fs.readFileSync(path.join(dir,f))),sha,f);
 let records=0;for(const d of manifest.datasets){assert.equal(load(d.label).rows.length,d.records);records+=d.records;}
 console.log(JSON.stringify({datasets:manifest.datasets.length,records,verified:true}));
}else if(command==='replay'){
 assert(/^[a-zA-Z0-9_-]+$/.test(label||''),'provide a dataset label');
 const {bundle,rows,campaign}=load(label),count=Math.min(Number(countText),rows.length);assert(Number.isInteger(count)&&count>0);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'glantan-replay-'));
 try{
  // Unchanged exercise dependencies are read from the published checkpoint,
  // never from potentially newer working-tree files.
  for(const name of ['pinyin','data','language-exercises-data','language-exercises','input']){
   const file='resources/'+name+'.js';fs.mkdirSync(path.join(temp,'resources'),{recursive:true});
   fs.writeFileSync(path.join(temp,file),execFileSync('git',['show',baseRef+':'+file],{cwd:root,maxBuffer:32*1024*1024}));
  }
  for(const [file,text] of Object.entries(bundle.sources)){assert(!path.isAbsolute(file)&&!file.split('/').includes('..'));const out=path.join(temp,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,text);}
  const runner=campaign?require(path.join(temp,'dev/glantan-campaign.cjs')).createCampaign():require(path.join(temp,'dev/glantan-combat.cjs')).createHarness();
  const normalize=r=>{r=JSON.parse(JSON.stringify(r));delete r.wallMs;delete r.ref;delete r.source;delete r.id;delete r.variant;return canonical(r);};
  for(let i=0;i<count;i++){const row=rows[Math.floor(i*rows.length/count)],actual=campaign?runner(row.config):runner.runArena(row.config);assert.equal(normalize(actual),normalize(row),'replay '+row.id);}
  console.log(JSON.stringify({label,replayed:count,exactMatch:true,excluded:['wallMs','ref','source','id','variant']}));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}else throw Error('Use seal | verify | replay LABEL [COUNT]');
