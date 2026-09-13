'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','word-pairs','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows','eggs','home','home-renderer'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,names=['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg'];
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,t)=>{for(let i=0;i<Math.round(t/.05);i++)g.update(.05);};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
function game(name,width=1000){
 const g=new SC[name+'Game']({random:rng(5)});g.start({mode:'chinese',lang:'zh-CN',pace:'gentle'});g.resize(width,name==='Beehive'&&width<600?1200:740);
 if(name==='Egg'){g.eggs.forEach(e=>e.crackAt=10000);tick(g,7);g.eggs[0].x=g.player.x+.07;g.eggs[0].y=g.player.y;g.crack(g.eggs[0]);g.eggs[0].hatchTime=10000;}
 if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);g.decayPlants=()=>{};}
 for(let i=0;i<100&&!g.getTargets().length;i++)g.update(.05);
 const p=g.getTargets()[0];assert(p,name+' first target missing');assert(Number.isFinite(p.appearedAt),name+' missing appearance time');
 g.spawnIn=10000;g.nextSpawn=10000;
 if(name==='City'){g.threats=[p];p.duration=10000;}
 if(name==='Beehive'){g.plants=[p];p.bloomFor=10000;}
 if(name==='FoodTruck'){g.customers=[p];p.patience=10000;}
 if(name==='Paint'){g.people=[p];p.speed=0;}
 if(name==='Dinosaur'){g.people=[p];g.walkSpeed=0;g.runSpeed=0;}
 return {g,p};
}
function renderer(name,g){
 const text=[],drawn=[],stack=[],c=new Proxy({font:'16px system-ui',save(){stack.push(this.font);},restore(){this.font=stack.pop();},measureText(s){return {width:Array.from(s).length*Number(this.font?.match(/([\d.]+)px/)?.[1]||16)*.6};},fillText(s,x,y,max){assert(Number.isFinite(x)&&Number.isFinite(y));if(max!==undefined)assert(max>0);text.push(s);drawn.push({text:s,x,y,max,font:this.font});}},{get:(o,k)=>k in o?o[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
 const r=Object.create(SC[name+'Renderer'].prototype);Object.assign(r,{game:g,ctx:c,dpr:1,stars:[],reduced:true});return {r,text,drawn};
}
test('Every game reveals each unhandled character after five playable seconds, excluding pauses',()=>{
 for(const name of names){const {g,p}=game(name);assert(!SC.pinyinHints(g).has(p),name);tick(g,4.95);assert(!SC.pinyinHints(g).has(p),name+' early hint');
  g.pause();const clock=g.clock;tick(g,8);assert.equal(g.clock,clock);assert(!SC.pinyinHints(g).has(p));g.resume();tick(g,.05);assert(SC.pinyinHints(g).has(p),name+' late hint');
 }
});
test('Queued speech aliases and active jobs suppress new hints; wrong answers and revisions do not',()=>{
 for(const name of names){
  let {g,p}=game(name);p.item={answer:'十',label:'十',hint:'shí'};
  const e=g.queue.enqueue('是','speech');g.clock+=6;assert(!SC.pinyinHints(g).has(p),name+' queued homophone');g.queue.revise(e,'wrong');assert(SC.pinyinHints(g).has(p),name+' revised answer');
  ({g,p}=game(name));g.queue.enqueue(p.item.answer);g.work(.05);assert(!g.getAvailableTargets().includes(p),name+' not reserved');g.clock+=6;assert(!SC.pinyinHints(g).has(p),name+' active job');
  ({g,p}=game(name));g.queue.enqueue('wrong');g.clock+=6;assert(SC.pinyinHints(g).has(p),name+' wrong input must not hide hint');
 }
});
test('Reservations handle duplicate characters one at a time; revealed hints remain stable',()=>{
 const {g}=game('Garden'),pot=g.pots[0];pot.nutrition=.4;pot.infection=.4;g.syncRequests(pot);
 for(const p of g.getTargets())p.item={answer:'十',label:'十',hint:'shí'};
 const [a,b,c]=g.getTargets();g.queue.enqueue('十');g.work(.05);assert.equal(g.job.request,a);g.queue.enqueue('是','speech');g.clock+=6;
 const hints=SC.pinyinHints(g);assert(!hints.has(a));assert(!hints.has(b));assert(hints.has(c));g.queue.enqueue('十');assert(SC.pinyinHints(g).has(c),'visible hint must not collapse when queued');
});
test('Offscreen entrances, unbloomed plants and newly recurring garden requests get their own delay',()=>{
 for(const name of ['Paint','Dinosaur']){
  const {g}=game(name);g.people=[];g.spawned=0;g.clock=20;
  if(name==='Dinosaur'){g.dino.x=.88;g.dino.y=.49;const gates=g.entrances.bind(g);g.entrances=()=>gates(false).filter(p=>p.edge==='bottom');}
  assert(g.spawn());const p=g.people[0];if(name==='Paint')p.speed=0;assert(!g.getTargets().includes(p));tick(g,8);assert.equal(p.appearedAt,undefined,name+' clock started offscreen');
  if(name==='Paint')p.speed=.06;else g.walkSpeed=80;
  for(let i=0;i<500&&!g.getTargets().includes(p);i++)g.update(.05);assert(g.getTargets().includes(p));assert(p.appearedAt>=28);assert(!SC.pinyinHints(g).has(p));
  if(name==='Paint')p.speed=0;else g.walkSpeed=0;tick(g,4.95);assert(!SC.pinyinHints(g).has(p));tick(g,.05);assert(SC.pinyinHints(g).has(p));
 }
 const hive=new SC.BeehiveGame();hive.start({mode:'chinese'});const p=hive.plants[0];hive.clock=50;assert.equal(p.appearedAt,undefined);hive.bloom(p);assert(!SC.pinyinHints(hive).has(p));hive.clock+=5;assert(SC.pinyinHints(hive).has(p));
 const {g,p:old}=game('Garden');g.clock+=6;assert(SC.pinyinHints(g).has(old));const pot=old.pot;pot.moisture=1;g.syncRequests(pot);pot.moisture=.4;g.syncRequests(pot);const fresh=pot.requests.moisture;assert.notEqual(fresh,old);assert(!SC.pinyinHints(g).has(fresh));
});
test('All renderers draw the delayed hint, use compact early boxes, and preserve already revealed hints',()=>{
 for(const width of [370,1100])for(const name of names){const {g,p}=game(name,width),{r,text}=renderer(name,g);p.item={answer:'十',label:'十',hint:'shí'};
  r.draw();assert(!text.includes('shí'),name+' renders hint immediately');g.clock+=5;text.length=0;r.draw();assert(text.includes('shí'),name+' missing drawn hint');
  const boxes=name==='City'?[p.labelBox]:name==='Garden'?r.bubbleBoxes:r.labelBoxes;
  if(boxes)for(const b of boxes)assert(b.x>=0&&b.y>=0&&b.x+b.w<=width&&b.y+b.h<=g.height,name+' hint outside screen');
  g.queue.enqueue(p.item.answer);text.length=0;r.draw();assert(text.includes('shí'),name+' visible hint disappeared');
 }
 const {g,p}=game('Beehive'),{r}=renderer('Beehive',g);r.labels();const before=r.labelBoxes[0].h;g.clock+=5;r.labels();assert(r.labelBoxes[0].h>before,'cached meadow layout did not grow for pinyin');
});
test('All nine renderers reveal pinyin above the answer and Swedish below with the same delay and reserve enough vertical space',()=>{
 for(const width of [370,1100])for(const name of [...names,'Home'])for(const mode of ['chineseTrad4','chineseSimpl4']){
  let g,p;
  if(name==='Home'){g=new SC.HomeGame({random:rng(5)});g.start({mode});g.resize(width,740);p=g.createTask('toys',g.spots.toys[0]);}
  else ({g,p}=game(name,width));
  g.mode=mode;p.item=SC.modes[mode].items.find(i=>i.answer==='牛奶');
  const {r,text,drawn}=renderer(name,g);r.draw();assert(!text.includes('mjölk'),name+' immediate translation');
  g.clock=p.appearedAt+4.95;text.length=0;r.draw();assert(!text.includes('mjölk'),name+' early translation');
  g.clock=p.appearedAt+5;text.length=0;drawn.length=0;r.draw();
  const hanzi=drawn.find(t=>t.text==='牛奶'),pinyin=drawn.find(t=>t.text==='niú nǎi'),swedish=drawn.find(t=>t.text==='mjölk');
  assert(hanzi&&pinyin&&swedish,name+' missing hint lines');assert(pinyin.y<hanzi.y&&hanzi.y<swedish.y,name+' incorrect line order');
  assert.equal(pinyin.x,swedish.x,name+' misaligned hint lines');assert.equal(pinyin.x,hanzi.x,name+' answer is not centered with hints');assert(Math.abs((pinyin.y+swedish.y)/2-hanzi.y)<.001,name+' answer is not vertically centered');assert.equal(pinyin.font,swedish.font,name+' mismatched hint fonts');
  const boxes=name==='City'?[p.labelBox]:name==='Garden'?r.bubbleBoxes:r.labelBoxes;
  if(boxes)for(const b of boxes){assert(b.x>=0&&b.y>=0&&b.x+b.w<=width&&b.y+b.h<=g.height,name+' expanded hint outside screen');assert(b.h>=55,name+' translation does not fit');}
  g.queue.enqueue(p.item.answer);text.length=0;r.draw();assert(text.includes('mjölk'),name+' revealed translation disappeared');
 }
 const {g}=game('City'),{r}=renderer('City',g),c=r.ctx;
 const width=SC.labelWidth(c,'木',{hint:'mù',translation:'trä och trävirke'});
 c.font='12px system-ui';assert(width>=c.measureText('trä och trävirke').width,'translation is omitted from width measurement');
});
test('Expanding a label preserves its center and follows target movement, within screen bounds',()=>{
 const {g,p}=game('City'),{r}=renderer('City',g),box={x:250,y:250,w:40,h:40},anchor={x:270,y:270};
 r.keepLabel(p,anchor,box);
 const expanded=r.stableLabel(p,anchor,120,78);assert.equal(expanded.x+expanded.w/2,270);assert.equal(expanded.y+expanded.h/2,270);
 r.keepLabel(p,anchor,expanded);const moved=r.stableLabel(p,{x:280,y:290},120,78);assert.equal(moved.x+moved.w/2,280);assert.equal(moved.y+moved.h/2,290);
 const clipped=r.stableLabel(p,{x:-100,y:0},120,78);assert(clipped.x>=8&&clipped.y>=116);
 g.resize(370,740);assert.equal(r.stableLabel(p,anchor,120,78),null,'resize must invalidate old positions');
});
test('Restart clears revealed hints, and other exercises never show pinyin',()=>{
 for(const name of names){const {g,p}=game(name);g.clock+=6;SC.pinyinHints(g);assert(p.pinyinRevealed);g.queue.clear();g.start({mode:'chinese'});assert.equal(SC.pinyinHints(g).size,0,name+' restart');
  for(const mode of ['letters','bopomofo','math-addition','swedish']){g.start({mode});g.clock+=30;assert.equal(SC.pinyinHints(g).size,0,name+'/'+mode);}
 }
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),app=fs.readFileSync(path.join(__dirname,'../resources/app.js'),'utf8');assert.doesNotMatch(html,/id="hints"|Visa pinyin/);assert.doesNotMatch(app,/\$\('hints'\)/);
});

test('All nine games draw long task text with natural proportions, including the garden icon padding',()=>{
 for(const width of [370,1100])for(const name of [...names,'Home']){
  let g,p;
  if(name==='Home'){g=new SC.HomeGame({random:rng(5)});g.start({mode:'swedishLong'});g.resize(width,740);p=g.createTask('toys',g.spots.toys[0]);}
  else ({g,p}=game(name,width));
  g.mode='swedishLong';p.item={label:'blomsterträdgård',answer:'blomsterträdgård'};
  const {r,drawn}=renderer(name,g);r.draw();const label=drawn.find(t=>t.text===p.item.label);
  assert(label,name+' missing long label');assert.equal(label.max,undefined,name+' uses canvas horizontal text compression');
  if(name==='Garden')assert.equal(label.font,'bold 16px system-ui','garden icon and padding must leave room for natural-size text');
 }
 const {g}=game('City'),{r,drawn}=renderer('City',g),c=r.ctx;c.font='bold 22px system-ui';
 SC.drawLabelText(c,{label:'blomsterträdgård',hint:'huā yuán',translation:'en blomstrande trädgård'},{x:0,y:0,w:55,h:70},{hint:true});
 assert.equal(c.font,'bold 22px system-ui','fitting must restore the caller font');assert.equal(drawn.length,3);
 for(const label of drawn){assert.equal(label.max,undefined);c.font=label.font;assert(c.measureText(label.text).width<=49.001,'fitted glyphs overflow their bubble');}
 assert(Number(drawn[0].font.match(/([\d.]+)px/)[1])<22,'a width limit must reduce both font dimensions');
 assert.equal(drawn[1].font,drawn[2].font,'both Mandarin hint lines retain the same font size');
});

test('All 36 garden requests stay separate at narrow and desktop sizes, before and after hints',()=>{
 const overlap=(a,b)=>a.x<b.x+b.w-.001&&a.x+a.w>b.x+.001&&a.y<b.y+b.h-.001&&a.y+a.h>b.y+.001;
 for(const width of [320,370,620,1100])for(const mode of ['swedishLong','chineseTrad4','math-diagrams']){
  const g=new SC.GardenGame({random:rng(31)});g.start({mode,pace:'brave'});g.resize(width,width<600?680:740);
  g.pots.forEach(p=>{Object.assign(p,{growth:.5,moisture:.4,nutrition:.4,infection:.6,requests:{}});g.syncRequests(p);});
  const {r}=renderer('Garden',g);assert.equal(g.getTargets().length,36);
  for(const clock of [0,6]){g.clock=clock;r.draw();assert.equal(r.bubbleBoxes.length,12);
   for(const [i,b] of r.bubbleBoxes.entries()){
    assert(b.x>=6.999&&b.y>=119.999&&b.x+b.w<=width-6.999&&b.y+b.h<=g.height-8.999,mode+' clipped garden bubble');
    assert(r.bubbleBoxes.slice(i+1).every(a=>!overlap(a,b)),width+'/'+mode+' overlapping garden requests');
   }
  }
 }
});

test('Every renderer fits a diagram in its task bubble without changing the task between frames',()=>{
 for(const width of [320,1100])for(const name of [...names,'Home']){
  let g,p;
  if(name==='Home'){g=new SC.HomeGame({random:rng(5)});g.start({mode:'math-diagrams'});g.resize(width,740);p=g.createTask('toys',g.spots.toys[0]);}
  else ({g,p}=game(name,width));
  g.mode='math-diagrams';p.item=SC.makeMath(10,rng(21),SC.mathLevel(g.mode));
  const before=JSON.stringify(p.item),{r}=renderer(name,g),draw=SC.drawMathDiagram,boxes=[];
  SC.drawMathDiagram=(c,d,box)=>{boxes.push(box);draw(c,d,box);};
  try{r.draw();r.draw();}finally{SC.drawMathDiagram=draw;}
  assert(boxes.length>=2,name+' diagram was not drawn');
  for(const box of boxes){assert(box.h>=72,name+' diagram height');assert(box.w>=90,name+' diagram width');}
  assert.equal(JSON.stringify(p.item),before,name+' drawing changed the task');
 }
});

console.log(checks+' delayed-hint checks passed, including all nine renderers.');
