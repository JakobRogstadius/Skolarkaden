'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math});
for(const file of ['pinyin','data','input','people','game','foodtruck','plants','garden','beehive','paint'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),context,{filename:file+'.js'});
const SC=context.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const tick=(g,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);};
const texts=q=>Array.from(q.items,e=>e.text);
function connect(g){g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,item)=>SC.matches(e.text,item,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});}
function fixture(mode='math',lang='sv-SE'){
  const g={mode,lang,state:'playing',queue:new SC.AnswerQueue(),targets:[],active:[],random:rng(55),getAvailableTargets(){return this.targets;},getActiveEntries(){return this.active;}};
  g.items=SC.beginPractice(g);connect(g);return g;
}
function question(g,n=2){const item=SC.makeMath(String(n),g.random,g.mathPractice.level);g.targets.push({item});return item;}
function answer(g,seconds=2,source='text'){
  const item=question(g);tick(g.mathPractice,seconds);g.queue.enqueue(source==='speech'?SC.numberName(Number(item.answer),g.lang):item.answer,source);g.queue.clear();g.targets=[];
}
test('Only copies backed by remaining targets enter the FIFO, including active work and wrong strings',()=>{
  const g=fixture('swedish'),q=g.queue;g.targets=[{item:{answer:'sol'}},{item:{answer:'sol'}},{item:{answer:'katt'}}];
  const first=q.enqueue('SOL!');assert(q.enqueue('sol'));assert.equal(q.enqueue('sol'),undefined);assert.equal(q.length,2);
  q.take();g.targets.shift();g.active=[first];assert.equal(q.enqueue('sol'),undefined);assert(q.enqueue('katt'));
  q.enqueue('fel');q.enqueue('FEL!');q.enqueue('annat');q.enqueue('tredje');assert.deepEqual(texts(q),['sol','katt','fel','annat']);
  g.targets.push({item:{answer:'sol'}});assert(q.enqueue('sol'));assert.equal(q.enqueue('SOL'),undefined);
  g.active=[];g.targets=[];q.clear();const wrong=q.enqueue('fel');q.take();g.active=[wrong];assert.equal(q.enqueue('fel'),undefined);assert(q.enqueue('annat'));
});
test('Speech aliases, numeral variants and Chinese pinyin cannot duplicate already assigned work',()=>{
  for(const [mode,lang,answer,a,b] of [['english','en-US','sea','see','sea'],['letters','sv-SE','å','Å','å'],['math','sv-SE','2','två','02'],['chinese','zh-CN','一','yi1','一']]){
    const g=fixture(mode,lang),item=mode==='chinese'?SC.modes.chinese.items[0]:{answer};g.targets=[{item}];
    const e=g.queue.enqueue(a,'speech');assert(e);assert.equal(g.queue.enqueue(b,'speech'),undefined);
    g.queue.take();g.targets=[];g.active=[e];assert.equal(g.queue.enqueue(b,'speech'),undefined);
    g.targets=[{item}];assert(g.queue.enqueue(b,'speech'));
  }
});
test('Revising a pending answer into a duplicate drops it; FIFO and returned work stay valid',()=>{
  const g=fixture('swedish'),q=g.queue;g.targets=[{item:{answer:'sol'}},{item:{answer:'katt'}}];
  const a=q.enqueue('sol'),b=q.enqueue('katt');assert.equal(q.revise(b,'SOL!'),false);assert.deepEqual(texts(q),['sol']);
  assert.equal(q.take(),a);q.returnFront(a);assert.equal(q.take(),a);
  q.enqueue('katt');g.active=[{text:'katt',source:'text'}];g.targets=[];assert.equal(q.take(),undefined);
});
test('Swedish subsets are actual 3x3, 2x5 or full letter rows, cover åäö, and stay fixed for a round',()=>{
  for(const lang of ['sv-SE','en-US']){
    const rows=SC.keyboardRows(lang),valid=new Set(rows),seen=new Set(),sizes=new Set(),random=rng(77);
    for(const [height,width] of [[3,3],[2,5]])for(let y=0;y<=3-height;y++)for(let x=0;x<=Math.min(...rows.slice(y,y+height).map(r=>r.length))-width;x++)valid.add(rows.slice(y,y+height).map(r=>r.slice(x,x+width)).join(''));
    for(let i=0;i<1000;i++){const subset=SC.letterSubset(lang,random),letters=subset.map(x=>x.answer).join('');assert(valid.has(letters));assert.equal(new Set(letters).size,letters.length);sizes.add(letters.length);for(const c of letters)seen.add(c);}
    assert(sizes.has(9)&&sizes.has(10)&&sizes.has(7));assert.equal(seen.size,lang==='sv-SE'?29:26);for(const c of 'åäö')assert.equal(seen.has(c),lang==='sv-SE');
  }
  for(const Game of [SC.CityGame,SC.FoodTruckGame,SC.GardenGame,SC.BeehiveGame,SC.PaintGame]){
    const g=new Game({random:rng(31)});g.start({mode:'letters',lang:'sv-SE'});const first=g.items,initial=first.map(i=>i.answer).join('');tick(g,4);assert.equal(g.items,first);
    const variants=new Set([initial]);for(let i=0;i<12;i++){g.start({mode:'letters',lang:'sv-SE'});variants.add(g.items.map(i=>i.answer).join(''));}assert(variants.size>1);
    g.start({mode:'bopomofo'});assert.equal(g.items.length,37);
  }
});
test('Math expressions remain correct, nonnegative and bounded at every adaptive level',()=>{
  const random=rng(13);let subtraction=false,crossing=false;
  for(let level=0;level<SC.mathLevels.length;level++)for(let n=0;n<=SC.mathLevels[level].max;n++)for(let i=0;i<40;i++){
    const item=SC.makeMath(n,random,level),[,a,op,b]=item.label.match(/^(\d+) ([+−]) (\d+)$/),x=+a,y=+b;
    assert.equal(op==='+'?x+y:x-y,n);assert(x<=SC.mathLevels[level].max&&y<=SC.mathLevels[level].max);assert.equal(item.answer,String(n));
    if(level===0){assert.equal(op,'+');assert(x+y<=5);}else if(op==='−')subtraction=true;
    if(level===3)assert(!(op==='−'?x>10&&x%10<y%10:n>10&&x%10+y%10>=10));
    if(level===4&&(op==='−'?x>10&&x%10<y%10:n>10&&x%10+y%10>=10))crossing=true;
  }
  assert(subtraction&&crossing);
});
test('Fast accurate answers increase complexity; fresh rounds reset and existing labels do not change',()=>{
  const g=fixture(),m=g.mathPractice;assert.equal(m.level,0);
  const old=question(g),label=old.label;g.targets=[];
  for(let i=0;i<25;i++)answer(g,2);assert.equal(m.level,SC.mathLevels.length-1);assert.equal(old.label,label);
  assert(SC.practiceItems(g).some(i=>Number(i.answer)>5));
  SC.beginPractice(g);assert.equal(g.mathPractice.level,0);assert.notEqual(g.mathPractice,m);
  const oldLevel=m.level;answer(g,2);assert.equal(m.level,oldLevel);
});
test('Repeated mistakes step back once, ignore duplicates, and require sustained recovery before promotion',()=>{
  const g=fixture(),m=g.mathPractice;for(let i=0;i<10;i++)answer(g,2);const level=m.level;tick(m,4);
  const item=question(g);g.queue.enqueue(item.answer);const successes=m.successes;
  for(let i=0;i<20;i++)g.queue.enqueue(item.answer);assert.equal(m.successes,successes);assert.equal(m.level,level);
  g.targets=[];g.queue.clear();g.queue.enqueue('wrong');g.queue.enqueue('wrong');assert.equal(m.level,level);
  g.queue.enqueue('nope');assert.equal(m.level,level-1);assert.equal(m.lastAdjustment,'mistakes');g.queue.clear();
  for(let i=0;i<5;i++)answer(g,2);assert.equal(m.level,level-1);for(let i=0;i<5;i++)answer(g,2);assert.equal(m.level,level);
});
test('A marked slowdown and unanswered backlog each lower difficulty',()=>{
  const slow=fixture();for(let i=0;i<10;i++)answer(slow,2);const before=slow.mathPractice.level;
  for(let i=0;i<3;i++)answer(slow,6);assert.equal(slow.mathPractice.level,before-1);assert.equal(slow.mathPractice.lastAdjustment,'slow');
  const behind=fixture();behind.mathPractice.level=3;for(let n=1;n<=3;n++)question(behind,n);tick(behind.mathPractice,5.1);assert.equal(behind.mathPractice.level,2);assert.equal(behind.mathPractice.lastAdjustment,'backlog');
  const waiting=fixture();waiting.mathPractice.level=3;question(waiting);tick(waiting.mathPractice,12.1);assert.equal(waiting.mathPractice.level,2);
});
test('Waiting for targets, queued correct jobs and active workers do not lower the math level',()=>{
  const g=fixture(),m=g.mathPractice;m.level=3;tick(m,30);assert.equal(m.level,3);
  for(let n=0;n<4;n++){question(g,n);g.queue.enqueue(String(n));}tick(m,30);assert.equal(m.level,3);assert.equal(m.thinking,0);
  g.active=[...g.queue.items];g.queue.clear();g.targets=[];tick(m,30);assert.equal(m.level,3);
});
test('Stepping back does not repeatedly punish the same harder questions already on screen',()=>{
  const g=fixture(),m=g.mathPractice;m.level=3;question(g);tick(m,12.1);assert.equal(m.level,2);
  tick(m,30);g.queue.enqueue('wrong');g.queue.enqueue('nope');assert.equal(m.level,2);
  g.queue.clear();g.targets=[];question(g);tick(m,12.1);assert.equal(m.level,1);
});
test('Speech bursts do not fabricate rapid timing samples or double-count transcript revisions',()=>{
  const g=fixture(),m=g.mathPractice;for(let n=0;n<5;n++)question(g,n);tick(m,2);
  for(let n=0;n<3;n++)g.queue.enqueue(SC.numberName(n,g.lang),'speech');assert.equal(m.samples.length,1);assert.equal(m.successes,3);
  const e=g.queue.items[0];g.queue.revise(e,'00');assert.equal(m.successes,3);assert.equal(m.samples.length,1);
});
test('All five math engines start easy, honour changed levels for new tasks, freeze on pause and reset on replay',()=>{
  const setups=[['CityGame',g=>g.spawn()],['FoodTruckGame',g=>tick(g,.9)],['GardenGame',g=>{g.pots[0].moisture=.6;g.syncRequests(g.pots[0]);}],['BeehiveGame',g=>g.bloom(g.plants[0])],['PaintGame',()=>{}]];
  for(const [name,setup] of setups){
    const g=new SC[name]({random:rng(17)});g.start({mode:'math'});connect(g);setup(g);const t=g.getAvailableTargets()[0];assert(t,name);assert.equal(t.item.mathLevel,0);assert(t.item.label.includes('+'));assert(Number(t.item.answer)<=5);
    g.mathPractice.level=2;let fresh;
    if(name==='CityGame'){g.spawn();fresh=g.threats.at(-1);}
    if(name==='FoodTruckGame'){g.spawn();fresh=g.customers.at(-1);}
    if(name==='GardenGame'){g.pots[1].moisture=.6;g.syncRequests(g.pots[1]);fresh=g.pots[1].requests.moisture;}
    if(name==='BeehiveGame'){g.bloom(g.plants[1]);fresh=g.plants[1];}
    if(name==='PaintGame'){g.spawn();fresh=g.people.at(-1);}
    assert.equal(fresh.item.mathLevel,2,name);assert.equal(t.item.mathLevel,0);
    const m=g.mathPractice;g.pause();const time=m.time;tick(g,15);assert.equal(m.time,time);g.resume();
    g.queue.enqueue(t.item.answer);g.update(.05);assert(g.getActiveEntries().length>0,name);for(let i=0;i<10;i++)g.queue.enqueue(t.item.answer);assert.equal(g.queue.length,0,name);
    g.queue.clear();g.start({mode:'math'});assert.equal(g.mathPractice.level,0,name);assert.notEqual(g.mathPractice,m);
  }
});
test('Answer listening UI and speech synthesis are removed; microphone diagnostics remain',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../resources/app.js'),'utf8'),voice=fs.readFileSync(path.join(__dirname,'../resources/voice.js'),'utf8');
  assert(!app.includes("hear.textContent='Lyssna'"));assert(!app.includes('SC.speak('));assert(!voice.includes('speechSynthesis'));assert(app.includes("$('replay').addEventListener"));
});
console.log(checks+' adaptive practice and duplicate-input checks passed.');
