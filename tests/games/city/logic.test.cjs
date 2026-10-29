'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'},globalThis:null});context.globalThis=context;
for(const file of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input', 'people', 'game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),context,{filename:file+'.js'});
const SC=context.Starlight;const tick=(g,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);};
const plain=v=>JSON.parse(JSON.stringify(v));
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};

test('Three city workers start concurrently; automatic aim and no manual timing',()=>{const g=new SC.CityGame({random:rng(1)});g.start();for(let i=0;i<3;i++)g.spawn();for(const t of g.getTargets())g.queue.enqueue(t.item.answer);g.update(.05);assert.equal(g.turrets.filter(t=>t.job).length,3);assert.equal(new Set(g.turrets.map(t=>t.job.target)).size,3);tick(g,2);assert.equal(g.hits,3);});
test('Incorrect city words reset streak without deducting points; pause freezes work',()=>{const g=new SC.CityGame();g.start();g.spawnIn=100;g.score=123;g.streak=7;g.queue.enqueue('incorrect');g.update(.05);assert.equal(g.turrets.filter(t=>t.job).length,1);tick(g,.8);assert.equal(g.shots,0);g.queue.enqueue('later');g.pause();tick(g,4);assert.equal(g.queue.length,1);g.resume();tick(g,2);assert.equal(g.score,123);assert.equal(g.streak,0);assert.equal(g.shots,2);});
test('Projectiles keep destination after destruction, including destroyed turret jobs',()=>{const g=new SC.CityGame({random:rng(2)});g.start();g.spawnIn=100;g.spawn();const t=g.threats[0],d=t.destination;t.destination.alive=false;tick(g,.2);assert.equal(t.destination,d);g.queue.enqueue('wrong');g.update(.05);const gun=g.turrets.find(t=>t.job),entry=gun.job.entry;gun.alive=false;for(const x of g.turrets)if(x!==gun)x.cooldown=10;g.update(.05);assert.equal(g.queue.items[0],entry);});
test('City caps streak bonuses at five, resets on misses and destruction, and awards 30 per survivor',()=>{
 const g=new SC.CityGame();g.start();g.spawnIn=100;const gun=g.turrets[0],entry={text:'test'};
 const hit=()=>{const target={x:100,y:150,color:'#ffffff',appearedAt:g.clock};g.threats.push(target);gun.job={entry,target};g.fireJob(gun);};
 for(let i=0;i<15;i++)hit();assert.equal(g.score,510);assert.equal(g.streak,15);
 gun.job={entry,target:null};g.fireJob(gun);assert.equal(g.streak,0);hit();assert.equal(g.score,540);
 for(const destination of [g.buildings[0],g.turrets[1]]){
  g.streak=7;g.threats.push({startX:0,progress:.99,duration:.01,destination});g.update(.05);assert.equal(g.streak,0);
 }
 const before=g.score;g.finish(true);assert.equal(g.score,before+9*30);g.finish(true);assert.equal(g.score,before+9*30);
 const lost=new SC.CityGame();lost.start();lost.buildings.forEach(b=>b.alive=false);lost.finish(false);assert.equal(lost.score,90);
});
test('Meteor value loses one point per full second since appearance, including work time but excluding pauses',()=>{
 for(const [age,expected] of [[0,30],[.999,30],[1,29],[1.999,29],[2,28],[9.2,21],[30,0],[40,0]]){
  let event;const g=new SC.CityGame({onEvent:e=>{if(e.type==='hit')event=e;}});g.start();g.spawn();const target=g.threats[0],gun=g.turrets[0];
  g.clock=target.appearedAt+age;gun.job={entry:{text:target.item.answer},target};g.fireJob(gun);assert.equal(g.score,expected,String(age));assert.equal(event.points,expected);
 }
 const g=new SC.CityGame({random:rng(5)});g.start();g.spawnIn=100;g.spawn();const target=g.threats[0];target.duration=100;tick(g,1.95);g.pause();tick(g,10);assert(Math.abs(g.clock-target.appearedAt-1.95)<1e-8);g.resume();
 g.queue.enqueue(target.item.answer);tick(g,2);assert.equal(g.hits,1);assert(g.score<29,'aiming time must count towards meteor age');
 // A capped streak is added after the age penalty, without reducing points already earned.
 g.spawn();const next=g.threats[0];next.appearedAt=g.clock-4;g.streak=20;const before=g.score;g.turrets[0].job={entry:{text:next.item.answer},target:next};g.fireJob(g.turrets[0]);assert.equal(g.score-before,31);
});
test('City bot reaches exactly 40 kills and wins all three difficulties',()=>{for(const pace of ['gentle','steady','brave']){const g=new SC.CityGame({random:rng(15)});g.start({pace});for(let i=0;i<18000&&g.state==='playing';i++){for(const t of g.getTargets())if(!g.turrets.some(x=>x.job?.target===t)&&!g.queue.items.some(e=>e.text===t.item.answer))g.queue.enqueue(t.item.answer);g.update(.05);}assert.equal(g.state,'won',pace);assert.equal(g.hits,40);}});
test('City reaches its old intensity over the shorter 40-target round',()=>{
 const g=new SC.CityGame();g.start();assert.equal(SC.cityGoal,40);g.hits=20;g.elapsed=43.2;assert(Math.abs(g.pressure()-.7)<1e-10);g.hits=40;assert.equal(g.pressure(),1);
});
test('City has distinct aim, lock and fire stages, and the barrel stays still while its beam fades',()=>{
 const g=new SC.CityGame({random:rng(2)});g.start();g.spawnIn=100;g.spawn();const target=g.threats[0];g.queue.enqueue(target.item.answer);g.update(.05);const gun=g.turrets.find(t=>t.job);assert.equal(gun.job.stage,'aim');assert.equal(g.shots,0);let sawLock=false,sawFire=false;
 for(let i=0;i<80&&gun.job;i++){if(gun.job.stage==='locked'){sawLock=true;assert.equal(g.shots,0);}if(gun.job.stage==='fire'){sawFire=true;assert.equal(g.shots,0);}g.update(.05);}assert(sawLock&&sawFire);assert.equal(g.shots,1);const angle=gun.angle;g.queue.enqueue('wrong');tick(g,.25);assert.equal(gun.angle,angle);
});
