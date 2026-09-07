'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const f of ['pinyin','data','speech','input','people','game','plants','garden','eggs'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+f+'.js'),'utf8'),ctx,{filename:f+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,t)=>{for(let i=0;i<Math.round(t/.05);i++)g.update(.05);};
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function policy(g){g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});}
function setup(options={}){const events=[],g=new SC.EggGame({random:rng(8),onEvent:e=>events.push(e)});g.start(options);policy(g);g.eggs.forEach(e=>e.crackAt=10000);tick(g,6);g.eggs.slice(0,2).forEach(e=>{e.x=g.player.x+.07;e.y=g.player.y;e.home={x:e.x,y:e.y};});return {g,e:g.eggs[0],events};}
function hatch(g,e){g.crack(e);g.hatch(e);}
function finish(g){for(let i=0;i<80&&['playing','celebrating','mourning'].includes(g.state);i++)g.update(.05);}
test('Range is 130 scaled pixels: distant targets stay reserved until approached, including across hatching',()=>{
 const {g,e}=setup({mode:'chinese'});Object.assign(g.player,{x:.1,y:.9,facing:1});Object.assign(e,{x:.85,y:.5,home:{x:.85,y:.5}});g.crack(e);const entry=g.queue.enqueue(e.item.answer),x=g.player.x;g.work(.05);assert.equal(g.flameRange,130);assert(g.player.x>x);assert.equal(g.job.firing,false);assert.equal(e.stage,'cracking');assert(!g.getAvailableTargets().includes(e));assert.equal(g.getTaskStates().get(e),'active');assert.equal(g.queue.enqueue(e.item.answer),undefined);g.clock+=6;assert(!SC.pinyinHints(g).has(e));g.hatch(e);assert.equal(g.job.target,e);assert.equal(g.job.entry,entry);
 for(let i=0;i<300&&!g.job.firing;i++)g.work(.05);assert(g.job.firing);assert(g.inFlameRange(e));assert.equal(e.stage,'burning');
 const a=g.flamePose(e),limit=g.flameRange*g.scale();e.x=(a.x+limit+.01)/g.width;e.y=(a.y+12*g.scale())/g.height;assert(!g.inFlameRange(e));e.x-=.02/g.width;assert(g.inFlameRange(e));
});
test('Random egg placement is stable on resize and avoids grid rows and close overlaps',()=>{
 for(let seed=1;seed<=12;seed++){const g=new SC.EggGame({random:rng(seed)});g.start({pace:'brave'});for(const [i,e] of g.eggs.entries()){assert(e.x>=.12&&e.x<=.88&&e.y>=.48&&e.y<=.92);for(const other of g.eggs.slice(i+1))assert(Math.hypot((e.x-other.x)/.14,(e.y-other.y)/.10)>.65);}assert(new Set(g.eggs.map(e=>e.y.toFixed(3))).size>12);const before=JSON.stringify(g.eggs.map(e=>[e.x,e.y]));g.resize(320,540);g.resize(1100,740);assert.equal(JSON.stringify(g.eggs.map(e=>[e.x,e.y])),before);}
});
test('Six human crew enter, investigate and keep speed rules; difficulty changes egg counts',()=>{
 for(const [pace,n] of [['gentle',8],['steady',12],['brave',16]]){const g=new SC.EggGame({random:rng(3)});g.start({pace});assert.equal(g.total,n);assert.equal(g.eggs.length,n);assert.equal(g.people.length,6);assert.equal(g.people.filter(p=>p.player).length,1);assert(g.people.every(p=>p.y>1&&p.status==='entering'&&!p.look.exotic));assert.equal(g.alienSpeed/g.runSpeed,2);assert.equal(g.getTargets().length,0);tick(g,7);assert(g.people.every(p=>p.status!=='entering'));assert(g.people.filter(p=>!p.player).some(p=>p.status==='walking'));}
});
test('First cracks create labels; hatching preserves identity, answers, reservations and hint age',()=>{
 const {g,e}=setup({mode:'chinese',lang:'zh-TW'});assert(!g.getTargets().includes(e));g.crack(e);const item=e.item,at=e.appearedAt;assert.equal(e.stage,'cracking');assert(g.getTargets().includes(e));assert(!SC.pinyinHints(g).has(e));
 const entry=g.queue.enqueue(item.answer);assert.equal(g.getTaskStates().get(e),'queued');e.age=e.hatchTime*.64;g.updateEggs(.05);assert.equal(e.stage,'hatching');e.age=e.hatchTime*.36;g.updateEggs(.05);assert.equal(e.form,'alien');assert.equal(e.item,item);assert.equal(e.appearedAt,at);assert.equal(g.queue.items[0],entry);assert.equal(g.getTaskStates().get(e),'queued');
 g.work(.05);assert.equal(e.stage,'burning');assert(g.getActiveEntries().includes(entry));assert.equal(g.queue.enqueue(item.answer),undefined);tick(g,1.7);assert.equal(e.stage,'dead');assert.equal(g.hits,1);assert.equal(g.score,100);
});
test('Cracks and opening lobes naturally lead to hatching at each egg’s own time',()=>{
 const {g,e}=setup();g.crack(e);tick(g,e.hatchTime*.64-.1);assert.equal(e.stage,'cracking');tick(g,.2);assert.equal(e.stage,'hatching');tick(g,e.hatchTime*.36+.1);assert.equal(e.form,'alien');assert.equal(g.shells.length,1);assert(g.getTargets().includes(e));
});
test('Immediate fire stops attackers before a catch and can rescue an attached human',()=>{
 for(const victimIndex of [0,1]){const {g,e}=setup();hatch(g,e);const p=g.people[victimIndex];Object.assign(p,{x:.5,y:.7,status:p.player?'ready':'walking'});Object.assign(e,{x:p.x,y:p.y,stage:'chasing'});g.player.x=p.x;g.player.y=p.y;
  g.queue.enqueue(e.item.answer);g.update(.05);assert.equal(e.stage,'burning');assert.notEqual(p.status,'chewing');assert.notEqual(p.status,'dead');tick(g,1);assert.equal(e.stage,'dying');tick(g,.75);assert.equal(e.stage,'dead');assert.equal(g.hits,1);
 }
 for(const victimIndex of [0,1]){const {g,e}=setup();hatch(g,e);const p=g.people[victimIndex];g.player.x=p.x;g.player.y=p.y;g.catch(e,p);assert.equal(p.status,'chewing');e.age=2.49;g.queue.enqueue(e.item.answer);g.update(.05);assert.equal(e.stage,'burning');assert.equal(p.attacker,null);assert.equal(e.victim,null);assert.notEqual(p.status,'dead');assert.notEqual(p.status,'chewing');}
});
test('Bystanders jump then flee; a catch chews, kills one human and releases the alien to wander',()=>{
 const {g,e,events}=setup();hatch(g,e);const p=g.people[1];Object.assign(p,{x:.5,y:.65,status:'walking'});Object.assign(e,{x:.53,y:.65});g.updatePeople(.05);assert.equal(p.status,'startled');tick(g,.1);assert(g.jumpHeight(p)>0);g.updatePeople(.3);assert.equal(p.status,'running');assert.equal(p.fear,1);
 g.catch(e,p);e.age=0;tick(g,2.4);assert.equal(p.status,'chewing');tick(g,.2);assert.equal(p.status,'dead');assert.equal(p.attacker,null);assert.equal(e.victim,null);assert.notEqual(e.stage,'chewing');assert.equal(g.state,'playing');assert.equal(events.filter(e=>e.type==='crew-down').length,1);
});
test('Player death leaves the round running until the rest of the crew are gone',()=>{
 const {g,e,events}=setup();hatch(g,e);g.catch(e,g.player);e.age=3;g.updateEggs(.05);assert.equal(g.player.status,'dead');assert.equal(g.state,'playing');assert.equal(events.filter(e=>e.type==='player-down').length,1);
 const before=g.hits;g.queue.enqueue(e.item.answer);g.work(1);assert.equal(e.form,'alien');assert.equal(g.hits,before);g.people.forEach(p=>p.status='dead');g.update(.05);assert.equal(g.state,'mourning');assert.equal(events.filter(e=>e.type==='end').length,0);finish(g);assert.equal(g.state,'lost');assert.equal(events.filter(e=>e.type==='end').length,1);assert.equal(events.find(e=>e.type==='end').survivors,0);
});
test('Victory waits for every egg and alien, then jumps for three seconds before ending once',()=>{
 const {g,e,events}=setup();g.eggs.slice(1).forEach(e=>e.stage='dead');g.update(.05);assert.equal(g.state,'playing','dormant eggs count as threats');g.crack(e);g.queue.enqueue(e.item.answer);tick(g,.85);assert.equal(e.stage,'burning');assert.equal(g.state,'playing');tick(g,.1);assert.equal(g.state,'celebrating');assert.equal(events.filter(e=>e.type==='end').length,0);tick(g,2.8);assert.equal(g.state,'celebrating');tick(g,.3);assert.equal(g.state,'won');assert.equal(events.filter(e=>e.type==='end').length,1);tick(g,10);assert.equal(events.filter(e=>e.type==='end').length,1);
});
test('Death animation already burning finishes even during a lost round',()=>{
 const {g,e}=setup();hatch(g,e);g.queue.enqueue(e.item.answer);g.work(.05);g.people.forEach(p=>p.status='dead');g.update(.05);assert.equal(g.state,'mourning');tick(g,1.75);assert.equal(e.stage,'dead');assert.equal(g.hits,1);finish(g);assert.equal(g.state,'lost');
});
test('Wrong answers obey queue limits; distinct matching targets allow duplicate answers',()=>{
 const {g,e}=setup();g.crack(e);g.crack(g.eggs[1]);g.eggs[1].item={...e.item};for(let i=0;i<15;i++)g.queue.enqueue('wrong '+i);assert.equal(g.queue.length,2);g.queue.enqueue(e.item.answer);g.queue.enqueue(e.item.answer);assert.equal(g.queue.length,4);assert.equal(g.queue.enqueue(e.item.answer),undefined);tick(g,4);assert.equal(g.hits,2);assert.equal(g.shots,4);assert.equal(g.score,200);
});
test('All exercises and Mandarin speech matching work; pinyin appears after five seconds and survives hatching',()=>{
 for(const mode of Object.keys(SC.modes)){const {g,e}=setup({mode});g.crack(e);g.queue.enqueue(e.item.answer);tick(g,1);assert.equal(g.hits,1,mode);}
 const {g,e}=setup({mode:'chinese',lang:'zh-TW'});g.crack(e);e.item={label:'十',answer:'十',hint:'shí'};g.clock=e.appearedAt+4.95;assert(!SC.pinyinHints(g).has(e));g.pause();tick(g,8);assert(!SC.pinyinHints(g).has(e));g.resume();g.clock+=.05;assert(SC.pinyinHints(g).has(e));g.hatch(e);assert(SC.pinyinHints(g).has(e));g.queue.enqueue('是','speech');g.work(.05);assert.equal(e.stage,'burning');
 const numbers=setup({mode:'chinese',lang:'zh-CN'});numbers.g.crack(numbers.e);numbers.g.crack(numbers.g.eggs[1]);numbers.e.item={answer:'三',label:'三',hint:'sān'};numbers.g.eggs[1].item={answer:'八',label:'八',hint:'bā'};
 const stream=new SC.SpeechStream({getContext:()=>({lesson:'chinese',language:'zh-CN',candidates:numbers.g.getTargets().map(t=>t.item)}),enqueue:text=>numbers.g.queue.enqueue(text,'speech'),revise:(e,text)=>numbers.g.queue.revise(e,text)});stream.update([Object.assign([{transcript:'38'}],{isFinal:false})]);tick(numbers.g,2);assert.equal(numbers.g.hits,2);
});
test('Pause freezes simulation, flame and queue; replay clears bodies, eggs, scores and learned maths',()=>{
 const {g,e}=setup({mode:'math'});g.crack(e);g.queue.enqueue(e.item.answer);g.work(.05);g.mathPractice.level=3;g.pause();const snapshot=JSON.stringify([g.clock,g.eggs,g.people,g.job,g.score]);tick(g,4);assert.equal(JSON.stringify([g.clock,g.eggs,g.people,g.job,g.score]),snapshot);g.resume();tick(g,1);assert.equal(g.hits,1);g.start({mode:'math'});assert.equal(g.score,0);assert.equal(g.mathPractice.level,0);assert.equal(g.shells.length,0);assert(g.people.every(p=>p.status==='entering'));assert(g.eggs.every(e=>e.stage==='dormant'));
});
test('48 full rounds terminate across sizes, difficulties and lessons with both attentive and silent players',()=>{
 for(const width of [320,1100])for(const pace of ['gentle','steady','brave'])for(const mode of ['letters','math'])for(const bot of [false,true])for(let seed=1;seed<=2;seed++){
  const events=[],g=new SC.EggGame({random:rng(seed),onEvent:e=>events.push(e)});g.start({pace,mode});g.resize(width,650);policy(g);let due=0;
  for(let i=0;i<8000&&['playing','celebrating','mourning'].includes(g.state);i++){
   if(bot&&g.state==='playing'&&g.clock>=due){const e=g.getTargets().find(e=>!g.getTaskStates().has(e));if(e){g.queue.enqueue(e.item.answer);due=g.clock+.7;}}
   g.update(.05);
  }
  assert.equal(g.state,bot?'won':'lost',[width,pace,mode,bot,seed].join('/'));assert.equal(events.filter(e=>e.type==='end').length,1);assert.equal(g.score,g.hits*100);
  if(bot){assert.equal(g.hits,g.total);assert(g.living().length>0);}else{assert.equal(g.hits,0);assert.equal(g.living().length,0);}
 }
});
function drawing(g){const stack=[],texts=[],c=new Proxy({font:'16px system-ui',save(){stack.push(this.font);},restore(){assert(stack.length);this.font=stack.pop();},measureText(s){return {width:Array.from(s).length*Number(this.font.match(/([\d.]+)px/)?.[1]||16)*.6};},fillText(s,x,y,max){assert(Number.isFinite(x)&&Number.isFinite(y)&&max>0);texts.push(s);}},{get:(o,k)=>k in o?o[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):(...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a),k+' non-finite coordinate');}});
 const r=Object.create(SC.EggRenderer.prototype);Object.assign(r,{ctx:c,game:g,dpr:1,reduced:false});return {r,stack,texts};}
test('Sixteen dark labels fit at minimum height, including delayed hints and long words',()=>{
 const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 for(const [w,h] of [[320,540],[370,740],[620,540],[700,540],[800,540],[1100,540]])for(const mode of ['letters','swedishLong','chinese']){
  const g=new SC.EggGame({random:rng(8)});g.start({pace:'brave',mode});g.resize(w,h);for(const e of g.eggs){g.crack(e);if(e.id%2)g.hatch(e);}g.clock+=6;const {r,stack}=drawing(g);r.draw();assert.equal(stack.length,0);assert.equal(r.labelBoxes.length,16);
  for(const [i,b] of r.labelBoxes.entries()){assert(b.x>=0&&b.y>=120&&b.x+b.w<=w&&b.y+b.h<=h);assert(r.labelBoxes.slice(i+1).every(a=>!overlap(a,b)),[w,h,mode,i].join('/'));if(mode==='letters')assert(b.w<=34);}
  const e=g.eggs[0];g.catch(e,g.people[1]);r.draw();g.killHuman(e);r.draw();g.queue.enqueue(e.item.answer);g.work(.05);r.draw();tick(g,1);r.draw();g.finish(false);tick(g,.5);r.draw();assert.equal(stack.length,0);
 }
});
test('Gardens start penalised but request-free, walk at one fifth speed and finish mixed outcomes',()=>{
 const g=new SC.GardenGame({random:rng(7)});g.start();assert.equal(g.getTargets().length,0);for(const p of g.pots)for(const key of ['moisture','nutrition','infection'])assert(g.badness(p,key)>0&&g.badness(p,key)<.4);
 g.gardener.x=0;g.gardener.y=0;g.moveTo({x:1,y:0},.25);assert(Math.abs(g.gardener.x-.14)<1e-9);
 const a=g.pots[0];a.moisture=.6;g.syncRequests(a);g.queue.enqueue(a.requests.moisture.item.answer);g.beginJob();a.moisture=0;g.update(.05);assert(a.dead);assert.equal(g.job,null);assert.equal(g.state,'playing');assert.equal(g.getTargets().filter(t=>t.pot===a).length,0);
 g.pots.slice(1).forEach(p=>p.bloom=true);g.update(.05);assert.equal(g.state,'celebrating');tick(g,4);assert.equal(g.state,'won');assert.equal(g.score,0,'dead plant care must never award points');
});
console.log(checks+' Äggröra and garden checks passed.');
