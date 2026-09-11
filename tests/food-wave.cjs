'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});for(const f of ['data','input','people','game','foodtruck'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+f+'.js'),'utf8'),ctx);
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const [pace,base] of Object.entries({gentle:5,steady:3,brave:1.5}))for(const mode of ['swedish','math-diagrams'])for(const strategy of ['perfect','silent']){
 const ends=[],arrivals=[],g=new SC.FoodTruckGame({random:rng(71),onEvent:e=>{if(e.type==='end')ends.push(e);}});
 const spawn=g.spawn.bind(g);g.spawn=()=>{const ok=spawn();if(ok)arrivals.push(g.elapsed);return ok;};g.start({pace,mode});
 g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});
 let max=0;for(let i=0;i<7000&&['playing','celebrating'].includes(g.state);i++){
  if(strategy==='perfect')for(const t of g.getAvailableTargets())if(!g.getTaskStates().has(t))g.queue.enqueue(t.item.answer);
  g.update(.05);max=Math.max(max,g.customers.length);
 }
 assert.equal(arrivals.length,40);assert.equal(g.spawned,40);assert.equal(g.resolved,40);assert.equal(g.customers.length,0);assert.equal(ends.length,1);
 assert.equal(g.state,strategy==='perfect'?'won':'lost');if(strategy==='perfect')assert.equal(g.hits,40);else{assert.equal(g.hits,0);assert.equal(g.lostCustomers,40);assert.equal(g.lives,0);assert(max>3);}
 for(let i=1;i<40;i++){const gap=arrivals[i]-arrivals[i-1],mean=base*(i>=34?.5:1);assert(gap>=mean*.75-.051&&gap<=mean*1.25+.051,pace+'/'+i+'/'+gap);}
 for(let i=0;i<100;i++)g.update(.05);assert.equal(ends.length,1);assert.equal(g.spawn(),false);
 g.start({pace,mode});assert.equal(g.spawned,1);assert.equal(g.resolved,0);assert.equal(g.lives,5);
}
// Small answer pools must not delay arrivals; reservations map one answer to one bubble.
const g=new SC.FoodTruckGame({random:rng(9)});g.start({items:[{label:'a',answer:'a'}]});while(g.spawn());for(const c of g.customers)c.status='waiting';
const a=g.queue.enqueue('a'),b=g.queue.enqueue('a');assert.equal(g.getTaskStates().size,2);g.work(.05);assert.equal(g.getTaskStates().get(g.activeCook.customer),'active');assert.equal([...g.getTaskStates().values()].filter(s=>s==='queued').length,1);
g.queue.revise(b,'wrong');assert.equal(g.getTaskStates().size,1);g.pause();const before=JSON.stringify({clock:g.clock,spawnIn:g.spawnIn,customers:g.customers});g.update(.05);assert.equal(JSON.stringify({clock:g.clock,spawnIn:g.spawnIn,customers:g.customers}),before);
console.log('PASS food: 12 complete waves, exact 34+6 arrival intervals, served/lost counts, duplicate reservations, pause and replay.');
// Queued labels remain separate even when arrivals outpace the cook.
for(const width of [320,390,1100])for(const count of [3,6,12,18])for(const mode of ['swedishLong','math-diagrams','chineseTrad4']){
 const g=new SC.FoodTruckGame({random:rng(17)});g.start({pace:'brave',mode});while(g.customers.length<count)g.spawn();
 const height=SC.foodSceneHeight(width,count-1);g.resize(width,height);
 g.customers.forEach(p=>{p.status='waiting';p.appearedAt=0;});g.clock=6;g.queue.enqueue(g.customers[0].item.answer);g.work(.05);g.queue.enqueue(g.customers[1].item.answer);
 const boxes=[],badges=[],c=new Proxy({font:'16px system-ui',measureText(s){return {width:[...s].length*9};},fillText(s){if(s==='KÖ')badges.push(s);}},{get:(o,k)=>k in o?o[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
 const r=Object.create(SC.FoodTruckRenderer.prototype);Object.assign(r,{ctx:c,game:g,dpr:1,reduced:true,rememberScoreAnchor(p,box){boxes.push(box);}});r.draw();assert.equal(boxes.length,count);assert.equal(badges.length,1);
 for(const [i,b] of boxes.entries()){assert(b.x>=0&&b.x+b.w<=width&&b.y>=140&&b.y+b.h<=height);for(const a of boxes.slice(i+1))assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'overlapping food labels');}
}
console.log('PASS food label geometry and queued badges across 36 narrow/wide layouts, including delayed Mandarin hints.');

// Crossing the old three-customer threshold and adding rows must not move or shrink anyone.
for(const width of [320,390,1100]){
 const g=new SC.FoodTruckGame({random:rng(23)});g.start({pace:'brave'});while(g.customers.length<3)g.spawn();
 const r=Object.create(SC.FoodTruckRenderer.prototype);r.game=g;
 const original=g.customers.map(p=>r.customerPosition(p.slot,width,SC.foodSceneHeight(width,2)));
 for(const count of [4,6,12,18]){
  while(g.customers.length<count)g.spawn();const height=SC.foodSceneHeight(width,count-1);
  for(let i=0;i<3;i++)assert.deepEqual(r.customerPosition(g.customers[i].slot,width,height),original[i]);
 }
 g.customers=g.customers.slice(0,3);assert.deepEqual(r.customerPosition(0,width,540),original[0]);
 assert.equal(original[0].scale,Math.min(1.13,width/430));
}
console.log('PASS customers retain position and full size when the fourth customer or additional rows arrive and leave.');

// Check rendered head-to-bubble distance, including children and expanding hints/diagrams.
for(const width of [320,1100])for(const mode of ['swedishLong','chineseTrad4','math-diagrams']){
 const g=new SC.FoodTruckGame({random:rng(17)});g.start({pace:'brave',mode});while(g.customers.length<12)g.spawn();g.resize(width,SC.foodSceneHeight(width,11));
 const c=new Proxy({font:'16px system-ui',measureText:s=>({width:[...s].length*9})},{get:(o,k)=>k in o?o[k]:()=>{}}),r=Object.create(SC.FoodTruckRenderer.prototype),bodies=[],boxes=[];
 Object.assign(r,{ctx:c,game:g,reduced:true,rememberScoreAnchor(p,box){boxes.push(box);}});
 const draw=SC.drawPerson;SC.drawPerson=(renderer,body)=>bodies.push(body);
 try{for(const p of g.customers){p.status='waiting';r.person(p,width,g.height,SC.isChinese(mode));}}finally{SC.drawPerson=draw;}
 for(let i=0;i<bodies.length;i++){
  const body=bodies[i],box=boxes[i],head=body.feet-(54*body.look.height+54)*body.scale*SC.personScale(body.look),gap=head-box.y-box.h;
  assert(gap>=7.9&&gap<=30.1,mode+' detached bubble: '+gap);assert.equal(box.x+box.w/2,body.x);
  assert.equal(body.scale,Math.min(1.13,width/430),'crowd size changed sprite scale');
 }
}
console.log('PASS bubbles stay 8–30 pixels above each head, with matching horizontal anchors and full-size sprites.');
