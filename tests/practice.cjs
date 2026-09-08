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
test('Answer listening UI and speech synthesis are removed; microphone diagnostics remain',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../resources/app.js'),'utf8'),voice=fs.readFileSync(path.join(__dirname,'../resources/voice.js'),'utf8');
  assert(!app.includes("hear.textContent='Lyssna'"));assert(!app.includes('SC.speak('));assert(!voice.includes('speechSynthesis'));assert(app.includes("$('replay').addEventListener"));
});
console.log(checks+' keyboard practice and duplicate-input checks passed.');
