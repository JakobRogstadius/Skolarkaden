/* Targeted, frozen discovery for the remaining brood role. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createHarness}=require('./glantan-combat.cjs');
const {config,TRAIN,COUNTERS,isotonic,crossing}=require('./glantan-calibration.cjs');
const prototype=require('./experiments/glantan-brood-role.cjs');
const ROOT=path.resolve(__dirname,'..'),DIR=path.resolve(process.env.GLANTAN_COMPLETION_DIR||path.join(ROOT,'experiments/completion'));fs.mkdirSync(DIR,{recursive:true});
const REF='626eaa0c3040e12778c55b694bf13800482146b5';
const variants={shell:{physical:.4},splash:{area:2},shell_splash:{physical:.5,area:2}};
const roster=(type,n)=>Array.from({length:n},()=>({type,rank:3}));
const write=(name,value)=>fs.writeFileSync(path.join(DIR,name+'.json'),JSON.stringify(value,null,2)+'\n');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function run(name,cases,variant){
 const input=JSON.stringify(cases),file=path.join(DIR,name+'.jsonl'),meta={ref:REF,variant,inputSha256:hash(input),prototypeSha256:hash(fs.readFileSync(path.join(__dirname,'experiments/glantan-brood-role.cjs')))};
 const protocolFile=path.join(DIR,name+'-protocol.json');
 if(fs.existsSync(protocolFile)&&JSON.stringify(JSON.parse(fs.readFileSync(protocolFile)))!==JSON.stringify(meta))throw Error('Checkpoint recipe differs');
 write(name+'-protocol',meta);fs.writeFileSync(path.join(DIR,name+'-cases.json'),input);
 const results=fs.existsSync(file)?fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 for(let i=0;i<results.length;i++)if(results[i].id!==cases[i].id||results[i].seed!==cases[i].seed)throw Error('Checkpoint order differs');
 const h=createHarness({ref:REF,transformSource:prototype.transformSource,configure:prototype.configure(variant)});
 for(let i=results.length;i<cases.length;i++){const r=h.runArena(cases[i]);results.push(r);fs.appendFileSync(file,JSON.stringify(r)+'\n');if((i+1)%54===0)console.log(JSON.stringify({name,completed:i+1,total:cases.length}));}
 fs.writeFileSync(path.join(DIR,name+'-raw.json'),JSON.stringify({...meta,results}));return results;
}
function summarize(rows){const n=rows.length,monsterWins=rows.filter(r=>r.outcome==='loss').length,heroWins=rows.filter(r=>r.outcome==='win').length;return{n,monsterWins,heroWins,timeouts:n-monsterWins-heroWins};}
function fit(rows,counts){const points=isotonic(counts.map(count=>{const r=rows.filter(r=>r.config.calibration.count===count),s=summarize(r);return{count,n:s.n,monsterWinRate:s.monsterWins/s.n,...s};}));const threshold=crossing(points,'count');return{points,threshold,cost:threshold.status==='identified'?12/threshold.value:null};}
function train(){
 const counts=[4,6,8,10,12,14,18],output=[];
 for(const [name,variant]of Object.entries(variants)){
  const cases=[];for(const count of counts)for(const[army,party]of Object.entries(TRAIN))for(let s=0;s<18;s++)cases.push(config({id:name+'/train/'+count+'/'+army,party,monsters:roster('broodcap',count),seed:'brood-role-train-'+(1200000+s),stage:'train',type:'broodcap',meta:{army,count}}));
  const fitted=fit(run('brood-role-'+name+'-train',cases,variant),counts);write('brood-role-'+name+'-fit',{ref:REF,variant,...fitted});if(!fitted.cost){output.push({name,...fitted});continue;}
  const count=Math.round(12/fitted.cost),held=[];for(const[army,party]of Object.entries({...TRAIN,...COUNTERS}))for(let s=0;s<18;s++)held.push(config({id:name+'/screen/'+army,party,monsters:roster('broodcap',count),seed:'brood-role-screen-'+(1210000+s),stage:'counter-screen',type:'broodcap',meta:{army,count,actualBudget:count*fitted.cost}}));
  const results=run('brood-role-'+name+'-screen',held,variant),panels=Object.keys({...TRAIN,...COUNTERS}).map(army=>({army,...summarize(results.filter(r=>r.config.calibration.army===army))}));output.push({name,variant,...fitted,count,panels});write('brood-role-screen-summary',output);console.log(JSON.stringify(output.at(-1)));
 }
 return output;
}
if(require.main===module){if(process.argv[2]==='train')train();else throw Error('Use train');}
module.exports={ROOT,DIR,REF,variants,roster,write,run,summarize,fit};
