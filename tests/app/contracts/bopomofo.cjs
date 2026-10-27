'use strict';
const {games}=require('../../helpers/runtime.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','speech','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows','eggs'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const tick=(g,t)=>{for(let i=0;i<Math.round(t/.05);i++)g.update(.05);};
const result=(text,final=false)=>Object.assign([{transcript:text}],{isFinal:final});
const item=answer=>SC.modes.bopomofo.items.find(i=>i.answer===answer);
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const examples=[['ㄅ','bō','波'],['ㄆ','pō','坡'],['ㄇ','mō','摸'],['ㄈ','fó','佛'],['ㄉ','de','的'],['ㄊ','tè','特'],['ㄋ','ne','呢'],['ㄌ','lè','勒'],['ㄍ','gē','哥'],['ㄎ','kē','科'],['ㄏ','hē','喝'],['ㄐ','jī','基'],['ㄑ','qī','七'],['ㄒ','xī','西'],['ㄓ','zhī','知'],['ㄔ','chī','吃'],['ㄕ','shī','師'],['ㄖ','rì','日'],['ㄗ','zī','資'],['ㄘ','cí','詞'],['ㄙ','sī','思'],['ㄧ','yī','一'],['ㄨ','wǔ','五'],['ㄩ','yú','魚'],['ㄚ','ā','啊'],['ㄛ','ō','喔'],['ㄜ','é','鵝'],['ㄝ','ê','耶'],['ㄞ','ài','愛'],['ㄟ','ei','誒'],['ㄠ','āo','凹'],['ㄡ','ōu','歐'],['ㄢ','ān','安'],['ㄣ','ēn','恩'],['ㄤ','áng','昂'],['ㄥ','eng','鞥'],['ㄦ','ér','兒']];

test('Every game consumes a recognized bopomofo answer through the shared speech queue',()=>{
 for(const name of games(['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg']))for(const language of ['zh-TW','zh-CN']){
  const g=new SC[name+'Game']({random:rng(9)});g.start({mode:'bopomofo',lang:language,items:[item('ㄅ')]});g.resize(1000,740);
  if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);}
  if(name==='Egg'){g.eggs.forEach(e=>e.crackAt=10000);tick(g,7);g.eggs[0].x=g.player.x+.04;g.eggs[0].y=g.player.y;g.crack(g.eggs[0]);}
  for(let i=0;i<100&&!g.getTargets().length;i++)g.update(.05);
  const target=g.getTargets()[0];assert(target,name);g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});
  const stream=new SC.SpeechStream({getContext:()=>({lesson:g.mode,language:g.lang,candidates:g.getTargets().map(t=>t.item)}),enqueue:text=>g.queue.enqueue(text,'speech'),revise:(entry,text)=>g.queue.revise(entry,text)});
  stream.update([result('波')]);assert.equal(g.queue.length,1,name);g.work(.05);assert.equal(g.queue.length,0,name);assert(g.getActiveEntries().length>0,name);assert(!g.getAvailableTargets().includes(target),name);
  stream.update([result('bo',true)]);assert.equal(g.queue.length,0,name+' revision');
 }
});
