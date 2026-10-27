'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','input','people','game','plants','garden'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let rounds=0;
for(const pace of ['gentle','steady','brave'])for(const mode of ['swedishLong','math-large-numbers']){
 let allBloom=0,flowers=0,maxBacklog=0;const expected={gentle:6,steady:9,brave:12}[pace];
 for(const width of [370,1000])for(let seed=1;seed<=12;seed++){
  const g=new SC.GardenGame({random:rng(seed)}),inputRandom=rng(seed+777);g.start({pace,mode});g.resize(width,680);
  g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});
  const answerDelay=mode==='math-large-numbers'?8:5;let due=answerDelay;
  // Finite full rounds with realistic input time and 10% deliberately wrong
  // answers. Never heal plants, skip travel, or bypass the shared FIFO.
  for(let i=0;i<8000&&['playing','celebrating'].includes(g.state);i++){
   if(g.state==='playing'&&g.elapsed>=due){const states=g.getTaskStates(),target=g.getAvailableTargets().find(t=>!states.has(t));if(target){g.queue.enqueue(inputRandom()<.1?'wrong':target.item.answer);due=g.elapsed+answerDelay;}}
   g.update(.05);maxBacklog=Math.max(maxBacklog,g.getTargets().length);
  }
  assert.equal(g.state,'won',`${pace}/${mode}/${width}/${seed}`);assert.equal(g.pots.length,expected);assert(g.elapsed<300,'round must not stall');
  const alive=g.pots.filter(p=>p.bloom).length;assert(alive>=expected-1,'an attentive player must not lose most of the garden');flowers+=alive;if(alive===expected)allBloom++;rounds++;
 }
 assert(allBloom>=22,`${pace}/${mode}: only ${allBloom}/24 rounds brought every plant to bloom`);
 console.log(`PASS ${pace}/${mode}: ${allBloom}/24 complete gardens, ${flowers}/${24*expected} plants bloomed, maximum ${maxBacklog} requests`);
}
console.log(`${rounds} paced gardening rounds passed.`);
