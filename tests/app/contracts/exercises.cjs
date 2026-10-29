'use strict';
const {games}=require('../../helpers/runtime.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input', 'people', 'game', 'foodtruck', 'plants', 'garden', 'beehive', 'paint', 'dinosaur', 'marshmallows', 'eggs', 'home'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const tick=(g,t)=>{for(let i=0;i<Math.round(t/.05);i++)g.update(.05);};
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const modes=Object.keys(SC.modes),math=modes.filter(SC.isMath),chinese=modes.filter(SC.isChinese);
function firstTarget(name,mode){
 const g=new SC[name+'Game']({random:rng(9)});g.start({mode,lang:SC.modes[mode].lang});g.resize(1000,740);
 if(name==='Home')g.createTask('toys',g.spots.toys[0]);
 if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);}
 if(name==='Egg'){g.eggs.forEach(e=>e.crackAt=10000);tick(g,7);g.crack(g.eggs[0]);}
 for(let i=0;i<100&&!g.getTargets().length;i++)g.update(.05);
 const target=g.getTargets()[0];assert(target,name+'/'+mode);return {g,target};
}

test('Every game supports every math lesson, fixed across correct answers, mistakes, waiting, pause and replay',()=>{
 for(const name of games(['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg']))for(const mode of math){
  const {g,target}=firstTarget(name,mode),level=SC.mathLevel(mode),oldItem=target.item,old=oldItem.label;
  assert.equal(target.item.mathLevel,level,name+'/'+mode);assert.equal(g.mathPractice,undefined);
  g.queue.enqueue(target.item.answer);tick(g,.05);for(let i=0;i<5;i++)g.queue.enqueue('wrong '+i);tick(g,15);assert.equal(oldItem.label,old);
  assert(g.getTargets().every(t=>t.item.mathLevel===level));g.pause();const elapsed=g.elapsed;tick(g,5);assert.equal(g.elapsed,elapsed);g.resume();
  g.start({mode});assert.equal(g.mode,mode);assert.equal(g.mathPractice,undefined);assert(g.getTargets().every(t=>t.item.mathLevel===level));
 }
});
test('All Chinese lessons retain delayed pinyin, queued-answer suppression and tone-free matching in every game',()=>{
 for(const name of games(['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home']))for(const mode of chinese){
  const {g,target}=firstTarget(name,mode);assert(!SC.pinyinHints(g).has(target));g.clock=target.appearedAt+10.1;assert(SC.pinyinHints(g).has(target));target.pinyinRevealed=false;
  g.queue.enqueue(target.item.hint,'speech');assert(!SC.pinyinHints(g).has(target),name+'/'+mode+' queued');
 }
 for(const mode of ['chinese','chineseSimpl1'])for(const language of ['zh-CN','zh-TW']){
  const item=SC.modes[mode].items.find(i=>i.answer==='山');for(const text of ['山','shan','shān','shan1','杉','衫','善'])assert(SC.matches(text,item,mode,language,'speech'),text);
  for(const text of ['三','san','si','shi'])assert(!SC.matches(text,item,mode,language,'speech'),text);
 }
});
test('All nine games consume a compound as one answer and keep transcript revisions deduplicated',()=>{
 for(const name of games(['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home']))for(const mode of ['chineseTrad3','chineseTrad4','chineseSimpl3','chineseSimpl4']){
  const {g,target}=firstTarget(name,mode),compound=SC.modes[mode].items.find(i=>i.answer==='牛奶');target.item=compound;
  g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,mode,g.lang)});
  const result=(text,isFinal=false)=>Object.assign([{transcript:text}],{isFinal}),stream=new SC.SpeechStream({getContext:()=>({lesson:mode,language:g.lang,candidates:g.getAvailableTargets().map(t=>t.item)}),enqueue:text=>g.queue.enqueue(text,'speech'),revise:(e,text)=>g.queue.revise(e,text)});
  stream.update([result('牛奶')]);assert.equal(g.queue.length+(g.shots||0),1,name+'/'+mode);assert(!SC.pinyinHints(g).has(target));
  for(let i=0;i<100&&!g.shots;i++)g.update(.05);assert.equal(g.shots,1,name+'/'+mode);
  stream.update([result('niu2 nai3',true)]);g.update(.05);assert.equal(g.shots,1,name+'/'+mode+' revised');assert.equal(g.queue.length,0);
 }
});
