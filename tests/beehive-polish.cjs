'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,t)=>{for(let i=0;i<Math.round(t/.05);i++)g.update(.05);};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
function renderer(Game,Renderer,width=1000,height=740,mode='swedish'){
 const game=new Game({random:rng(31)});game.start({mode,pace:'brave',uppercase:false});game.resize(width,height);
 const fonts=[],stack=[],c=new Proxy({font:'16px system-ui',save(){stack.push(this.font);},restore(){this.font=stack.pop()||this.font;},measureText(text){return {width:Array.from(text).length*(parseFloat(this.font.match(/([\d.]+)px/)?.[1]||16))*.6};},fillText(text,x,y,max){assert(Number.isFinite(x)&&Number.isFinite(y));if(max!==undefined)assert(max>0);fonts.push({text,x,y,max});}},{get:(obj,key)=>key in obj?obj[key]:key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
 const r=Object.create(Renderer.prototype);r.game=game;r.ctx=c;r.dpr=1;r.reduced=false;return {game,r,c,fonts};
}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
test('Scatter stays inside the meadow at full growth, has no rows, and resizes deterministically',()=>{
 for(const [w,h] of [[355,1200],[600,620],[1100,740]])for(let seed=1;seed<=8;seed++){
  const g=new SC.BeehiveGame({random:rng(seed)});g.start();g.resize(w,h);while(g.plants.length<24)assert(g.spawn());
  const s=w<600?.43:.62;for(const p of g.plants){const b=SC.plantBounds({...p,growth:1});assert(p.x*w+b.left*s>=4);assert(p.x*w+b.right*s<=w-4);assert(p.y*h+b.top*s>112);assert(p.y*h+b.bottom*s<h);}
  assert(new Set(g.plants.map(p=>p.x.toFixed(4))).size>21);assert(new Set(g.plants.map(p=>p.y.toFixed(4))).size>21);
  const positions=JSON.stringify(g.plants.map(p=>[p.x,p.y]));g.resize(800,700);g.resize(w,h);assert.equal(JSON.stringify(g.plants.map(p=>[p.x,p.y])),positions);
 }
});
test('Both games use all stalk, leaf and flower families; health stays separate from appearance',()=>{
 const random=rng(50),sets=[new Set(),new Set(),new Set()];for(let i=0;i<600;i++){const look=SC.makePlantLook(random);[look.stalk,look.leaf,look.flower].forEach((v,j)=>sets[j].add(v));}
 assert.deepEqual(sets.map(s=>s.size),[4,5,6]);
 for(const Game of [SC.BeehiveGame,SC.GardenGame]){const g=new Game({random:rng(4)});g.start();for(const p of g.plants||g.pots){assert(Number.isInteger(p.look.stalk));assert(Number.isInteger(p.look.leaf));assert(Number.isInteger(p.look.flower));if(Game===SC.BeehiveGame){assert.equal(p.moisture,1);assert.equal(p.nutrition,1);assert.equal(p.infection,0);}else{assert(p.moisture>.6&&p.moisture<1);assert(p.nutrition>.6&&p.nutrition<1);assert(p.infection>0&&p.infection<.4);}}}
 for(let stalk=0;stalk<4;stalk++){
  const look=SC.makePlantLook(random,{stalk}),p={look,growth:.9,moisture:1,nutrition:1,infection:0};const healthy=SC.plantShape(p),dry=SC.plantShape({...p,moisture:.05}),pale=SC.plantShape({...p,nutrition:.05}),bugs=SC.plantShape({...p,infection:.8});
  assert(Math.min(...dry.tips.map(t=>t.y))>Math.min(...healthy.tips.map(t=>t.y))+15);assert(dry.leaves.every((l,i)=>l.angle>healthy.leaves[i].angle));assert.equal(dry.health.leaf,healthy.health.leaf);
  assert.notEqual(pale.health.leaf,healthy.health.leaf);assert.deepEqual(pale.paths,healthy.paths);assert.equal(healthy.health.bugs,0);assert.equal(bugs.health.bugs,8);assert(bugs.health.bugSize>SC.plantHealth({...p,infection:.2}).bugSize);
  assert(SC.plantBounds({...p,growth:.2}).top>SC.plantBounds({...p,growth:1}).top);assert.notEqual(SC.soilColor(.1),SC.soilColor(1));
 }
});
test('First task appears promptly; empty time speeds up but visible tasks, flights and queues never do',()=>{
 for(const mode of ['swedish','math']){const g=new SC.BeehiveGame({random:rng(3)});g.start({mode});tick(g,1.5);assert(g.getTargets().length>0);}
 const empty=new SC.BeehiveGame();empty.start();empty.plants=[];empty.nextSpawn=10000;empty.clock=2;empty.elapsed=10;empty.update(.05);assert.equal(empty.timeRate,4);assert(Math.abs(empty.elapsed-10.2)<1e-8);
 const active=new SC.BeehiveGame();active.start();active.bloom(active.plants[0]);active.clock=2;const target=active.getTargets()[0],age=target.flowerAge;active.update(.05);assert.equal(active.timeRate,1);assert.equal(target.flowerAge,age+.05);
 for(const state of ['outbound','gather','return','confused']){const g=new SC.BeehiveGame();g.start();g.clock=2;g.plants=[];g.nextSpawn=10000;g.bees[0].stage=state;g.update(.05);assert.equal(g.timeRate,1,state);}
 empty.queue.enqueue('wrong');empty.update(.05);assert.equal(empty.timeRate,1);empty.pause();const before=empty.elapsed;tick(empty,1);assert.equal(empty.elapsed,before);
});
test('Summer includes late buds; autumn adds no new plants and late flowers survive until winter',()=>{
 const g=new SC.BeehiveGame({random:rng(9)});g.start();g.elapsed=g.duration*.45;while(g.plants.length<24)g.spawn();const late=g.plants.filter(p=>p.bloomAt);assert(late.length>=4);assert(late.every(p=>p.bloomAt>g.duration*.63&&p.bloomAt<g.duration*.86));
 const p=late[0];p.age=p.youngFor+1;g.elapsed=g.duration*.64;g.nextSpawn=10000;const n=g.spawned;g.bloom(p);tick(g,5);assert.equal(g.spawned,n);assert(p.lateSeason);assert.equal(p.status,'flower');
});
test('Bee landing follows each plant model, including viewport resizing',()=>{
 for(const width of [355,1100])for(let stalk=0;stalk<4;stalk++){
  const g=new SC.BeehiveGame({random:rng(5)});g.start();g.resize(width,width<600?1200:740);const p=g.plants[0];p.look.stalk=stalk;g.bloom(p);p.bloomFor=1000;g.nextSpawn=10000;g.queue.enqueue(p.item.answer);
  for(let i=0;i<500&&g.bees[0].stage!=='gather';i++)g.update(.05);assert.equal(g.bees[0].stage,'gather');const tip=g.nectarPoint(p);assert(Math.hypot(g.bees[0].x-tip.x,g.bees[0].y-tip.y)<1e-8);
 }
});
test('Every surplus delivery makes exactly one jar; in-flight nectar does not count; restart clears jars',()=>{
 const g=new SC.BeehiveGame();g.start();g.honey=g.honeyGoal-1;
 function delivered(){const b=g.bees[0];Object.assign(b,{...g.hive,stage:'return',nectar:1,job:{entry:{text:'nectar'}}});g.work(.05);}
 delivered();assert.equal(g.jarCount,0);delivered();assert.equal(g.jarCount,1);const score=g.score;delivered();assert.equal(g.jarCount,2);assert.equal(g.score-score,100);
 Object.assign(g.bees[0],{stage:'return',nectar:1,x:.1,y:.9,job:{entry:{text:'still outside'}}});assert.equal(g.jarCount,2);g.elapsed=g.duration-.05;g.update(.05);assert.equal(g.jarCount,2);assert.equal(g.state,'celebrating');g.start();assert.equal(g.jarCount,0);
 for(const width of [355,1100]){const {game,r}=renderer(SC.BeehiveGame,SC.BeehiveRenderer,width,width<600?1200:740);game.honey=game.honeyGoal+30;let jars=0;r.circle=()=>{};r.round=(x,y,w,h)=>{if(h===5)jars++;};r.jars();assert.equal(jars,30);const layout=r.jarLayout();assert(layout.x>=0&&layout.x+layout.columns*layout.pitch<width);}
});
test('All target boxes fit short words and pinyin, with no overlaps in a crowded meadow',()=>{
 for(const [width,height] of [[355,1200],[620,620],[1100,740]])for(const mode of ['letters','swedishLong','chinese']){
  const {game:g,r}=renderer(SC.BeehiveGame,SC.BeehiveRenderer,width,height,mode);while(g.plants.length<24)g.spawn();for(const p of g.plants){g.bloom(p);p.flowerAge=2;}g.clock+=5;r.labels();assert.equal(r.labelBoxes.length,g.getTargets().length);
  for(const [i,b] of r.labelBoxes.entries()){assert(b.x>=0&&b.y>=112&&b.x+b.w<=width&&b.y+b.h<=height);assert(r.labelBoxes.slice(i+1).every(o=>!overlap(b,o)),width+'/'+mode+' overlapping labels');if(mode==='letters')assert(b.w<=32);}
  const positions=JSON.stringify(r.labelBoxes);g.queue.enqueue(g.getTargets()[0].item.answer);r.labels();assert.equal(JSON.stringify(r.labelBoxes),positions,'queue highlighting must not move labels');
 }
 for(const [Game,Renderer] of [[SC.PaintGame,SC.PaintRenderer],[SC.DinosaurGame,SC.DinosaurRenderer]]){const {game:g,r}=renderer(Game,Renderer);g.people[0].item={label:'A',answer:'a'};r.labels();assert(r.labelBoxes[0].w<=30);}
 const {c}=renderer(SC.BeehiveGame,SC.BeehiveRenderer);const a=SC.labelWidth(c,'A',{font:'20px system-ui'}),word=SC.labelWidth(c,'vattenkanna',{font:'20px system-ui'}),hint=SC.labelWidth(c,'一',{font:'22px system-ui',hint:'yī',hintFont:'12px system-ui'});assert(a<=30&&word>a*3&&hint>=28);
});
console.log(checks+' plant, layout, pacing and surplus-honey checks passed.');
