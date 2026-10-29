'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math});
for(const file of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../resources/'+file+'.js'),'utf8'),context,{filename:file+'.js'});
const SC=context.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const tick=(g,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);};
const texts=q=>Array.from(q.items,e=>e.text);
function policy(queue,getCandidates,mode='swedish',lang='sv-SE',getActiveEntries=()=>[]){queue.setPolicy({getCandidates,getActiveEntries,matches:(entry,item)=>SC.matches(entry.text,item,mode,lang,entry.source),sameInput:(a,b)=>SC.sameInput(a,b,mode,lang)});}
class Element extends EventTarget{constructor(){super();this.value='';this.button={};}querySelector(){return this.button;}focus(){}setAttribute(){}}
function makeInput(){const field=new Element(),form=new Element(),queue=new SC.AnswerQueue(),microphone={snapshot:()=>({samples:new Float32Array(0)}),cancel(){}};const input=new SC.AnswerInput({field,form,queue,microphone,voiceButton:new Element()});input.configure({enabled:false,lesson:'letters'});input.setEnabled(true);return {input,field,form,queue};}
function connect(g){g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,item)=>SC.matches(e.text,item,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});}
function fixture(mode='math-addition',lang='sv-SE'){
  const g={mode,lang,state:'playing',queue:new SC.AnswerQueue(),targets:[],active:[],random:rng(55),getAvailableTargets(){return this.targets;},getActiveEntries(){return this.active;}};
  g.items=SC.beginPractice(g);connect(g);return g;
}

test('FIFO preserves raw casing, punctuation, repeated words, and returned work',()=>{const q=new SC.AnswerQueue();q.enqueue(' SOL! ');q.enqueue('sol');q.enqueue('sol');assert.equal(q.take().text,' SOL! ');const e=q.take();q.returnFront(e);assert.equal(q.take(),e);assert.equal(q.take().text,'sol');assert.equal(q.length,0);});
test('Only copies backed by remaining targets enter the FIFO, including active work and wrong strings',()=>{
  const g=fixture('swedish'),q=g.queue;g.targets=[{item:{answer:'sol'}},{item:{answer:'sol'}},{item:{answer:'katt'}}];
  const first=q.enqueue('SOL!');assert(q.enqueue('sol'));assert.equal(q.enqueue('sol'),undefined);assert.equal(q.length,2);
  q.take();g.targets.shift();g.active=[first];assert.equal(q.enqueue('sol'),undefined);assert(q.enqueue('katt'));
  q.enqueue('fel');q.enqueue('FEL!');q.enqueue('annat');q.enqueue('tredje');assert.deepEqual(texts(q),['sol','katt','fel','annat']);
  g.targets.push({item:{answer:'sol'}});assert(q.enqueue('sol'));assert.equal(q.enqueue('SOL'),undefined);
  g.active=[];g.targets=[];q.clear();const wrong=q.enqueue('fel');q.take();g.active=[wrong];assert.equal(q.enqueue('fel'),undefined);assert(q.enqueue('annat'));
});
test('Speech aliases, numeral variants and Chinese pinyin cannot duplicate already assigned work',()=>{
  for(const [mode,lang,answer,a,b] of [['english','en-US','sea','see','sea'],['letters','sv-SE','å','Å','å'],['math-addition','sv-SE','2','två','02'],['chinese','zh-CN','一','yi1','一']]){
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
test('A burst of mistakes leaves only two pending, while new correct answers remain admissible',()=>{
 const q=new SC.AnswerQueue(),items=['sol','katt','hund'].map(answer=>({answer}));policy(q,()=>items);for(let i=0;i<1000;i++)q.enqueue('fel'+i);assert.deepEqual(texts(q),['fel0','fel1']);q.enqueue('SOL!','speech');q.enqueue('katt');q.enqueue('hund');assert.deepEqual(texts(q),['fel0','fel1','SOL!','katt','hund']);for(let i=0;i<100;i++)q.enqueue('sol');assert.equal(q.length,5);assert.equal(q.take().text,'fel0');q.enqueue('nytt fel');assert.equal(q.length,5);
});
test('One queued entry uses one target; excess duplicates are ignored',()=>{
 const q=new SC.AnswerQueue();policy(q,()=>[{answer:'a'},{answer:'a'}],'letters');for(let i=0;i<50;i++)q.enqueue('a');assert.equal(q.length,2);
 const {input,field,queue}=makeInput();policy(queue,()=>[{answer:'b'}],'letters');field.value='bbbbbbbbbbbbbb';field.dispatchEvent(new Event('input'));assert.deepEqual(texts(queue),['b']);input.destroy();
});
test('Expired targets and speech revisions reapply the limit without reordering retained entries',()=>{
 const q=new SC.AnswerQueue();let items=['sol','katt','hund'].map(answer=>({answer}));policy(q,()=>items);q.enqueue('fel1');q.enqueue('fel2');const correct=q.enqueue('sol');q.enqueue('katt');q.enqueue('hund');q.revise(correct,'solen');assert.deepEqual(texts(q),['fel1','fel2','katt','hund']);items=[];q.reconcile();assert.deepEqual(texts(q),['fel1','fel2']);
 items=[{answer:'katt'}];assert(q.revise(q.items[0],'katt'));q.enqueue('fel3');assert.deepEqual(texts(q),['katt','fel2','fel3']);
});
