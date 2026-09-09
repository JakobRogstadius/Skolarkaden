'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['data','input','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx);
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const [pace,base] of Object.entries({gentle:5,steady:3,brave:1.5})){
 for(const spawned of [1,33,34,39]){
  const mean=base*(spawned>=34?.5:1);assert.equal(SC.citySpawnInterval(pace,spawned,()=>.5),mean);
  const random=rng(123);let sum=0,min=Infinity,max=0;
  for(let i=0;i<10000;i++){const interval=SC.citySpawnInterval(pace,spawned,random);sum+=interval;min=Math.min(min,interval);max=Math.max(max,interval);assert(interval>=mean*.75&&interval<=mean*1.25);}
  assert(Math.abs(sum/10000-mean)<mean*.005);assert(max-min>mean*.45);
 }
 for(const width of [320,1100])for(const mode of ['letters','math-diagrams'])for(const strategy of ['perfect','one-impact','silent']){
  let g;const drops=[],ends=[];
  g=new SC.CityGame({random:rng(15),onEvent:e=>{
   if(e.type==='end')ends.push(e);
   if(e.type==='targets'){
    drops.push(g.elapsed);
    if(strategy==='one-impact'&&g.spawned===1){const t=g.threats.at(-1);t.destination=g.buildings[0];t.progress=1;}
   }
  }});
  g.start({pace,mode});g.resize(width,740);
  for(let i=0;i<10000&&g.state==='playing';i++){
   if(strategy!=='silent')for(const t of g.getAvailableTargets())if(!g.queue.items.some(e=>e.text===t.item.answer))g.queue.enqueue(t.item.answer);
   g.update(.05);
  }
  assert.equal(drops.length,40,`${pace}/${width}/${mode}/${strategy}`);assert.equal(g.spawned,40);assert.equal(g.resolved,40);assert.equal(g.threats.length,0);assert.equal(ends.length,1);
  assert(Math.abs(drops[0]-.65)<.051);
  for(let i=1;i<drops.length;i++){const mean=base*(i>=34?.5:1),gap=drops[i]-drops[i-1];assert(gap>=mean*.75-.051&&gap<=mean*1.25+.051,`gap before meteor ${i+1}: ${gap}`);}
  if(strategy==='perfect'){assert.equal(g.state,'won');assert.equal(g.hits,40);}
  if(strategy==='one-impact'){assert.equal(g.state,'won');assert.equal(g.hits,39);}
  if(strategy==='silent'){assert.equal(g.state,'lost');assert.equal(g.hits,0);}
  for(let i=0;i<100;i++)g.update(.05);assert.equal(g.spawned,40);assert.equal(ends.length,1);
 }
}
// Neither a small answer pool nor a crowded phone screen delays the fixed wave.
const g=new SC.CityGame({random:rng(8)});g.start({pace:'brave',items:[{label:'a',answer:'a'}]});g.resize(320,540);
while(g.spawned<34){g.update(.05);for(const t of g.threats)t.duration=10000;}
g.pause();const snapshot=JSON.stringify([g.elapsed,g.spawnIn,g.spawned,g.resolved,g.threats]);
for(let i=0;i<100;i++)g.update(.05);assert.equal(JSON.stringify([g.elapsed,g.spawnIn,g.spawned,g.resolved,g.threats]),snapshot);g.resume();
while(g.spawned<40)g.update(.05);assert.equal(g.threats.length,40);assert.equal(g.state,'playing');assert.equal(g.spawn(),false);
for(const t of g.threats)t.progress=1;g.update(.05);assert.equal(g.resolved,40);assert.notEqual(g.state,'playing');
g.start({pace:'gentle'});assert.equal(g.spawned,0);assert.equal(g.resolved,0);assert.equal(g.threats.length,0);assert.equal(g.spawnIn,.65);
console.log('PASS Meteorregn: random interval means, exact 34+6 pacing, 36 complete rounds, impacts, victory/defeat, capacity, pause and replay');
