'use strict';
const {games}=require('../../helpers/runtime.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent});
for(const name of ['pinyin','data','language-exercises-data','language-exercises','speech','input','people','game','foodtruck','plants','garden','beehive','paint'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+name+'.js'),'utf8'),ctx);
const SC=ctx.Starlight,result=(text,isFinal=false)=>Object.assign([{transcript:text}],{isFinal}),item=char=>SC.modes.chinese.items.find(i=>i.answer===char);
const matches=(text,char,source='speech')=>SC.matches(text,item(char),'chinese','zh-CN',source);
let checks=0;function test(name,fn){fn();console.log('PASS '+name);checks++;}
for(const language of ['zh-CN','zh-TW'])for(const name of games(['CityGame','FoodTruckGame','GardenGame','BeehiveGame','PaintGame']))test(name+' / '+language+' accepts homophones, revisions and number aliases as exactly two actions',()=>{
 let seed=7;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},events=[];
 const g=new SC[name]({random,onEvent:e=>events.push(e)});g.start({mode:'chinese',lang:language,items:[item('十'),item('水')]});
 if(name==='CityGame'){g.spawn();g.spawn();}
 if(name==='FoodTruckGame'){g.spawn();for(const c of g.customers)c.status='waiting';}
 if(name==='GardenGame'){g.decayInterval=100;for(const p of g.pots.slice(0,2)){p.moisture=.6;g.syncRequests(p);}}
 if(name==='BeehiveGame'){for(const p of g.plants.slice(0,2))g.bloom(p);}
 if(name==='PaintGame'){g.spawn();g.people.forEach((p,i)=>p.x=.25+i*.45);}
 g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,item)=>SC.matches(e.text,item,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});
 const stream=new SC.SpeechStream({getContext:()=>({lesson:g.mode,language:g.lang,candidates:g.getTargets().map(t=>t.item)}),enqueue:text=>g.queue.enqueue(text,'speech'),revise:(e,text)=>g.queue.revise(e,text)});
 stream.update([result('是')]);g.update(.05);assert.equal(g.getActiveEntries().length,1);
 stream.update([result('事睡')]);assert.equal(g.queue.length,1);assert.equal(g.queue.items[0].text,'睡');
 stream.update([result('10 水',true)]);stream.update([result('十水',true)]);assert.equal(g.queue.length,1);
 for(let i=0;i<600&&g.hits<2;i++)g.update(.05);
 assert.equal(g.hits,2);assert.equal(g.queue.length,0);assert(!events.some(e=>['miss','waste','think'].includes(e.type)));
});
console.log(checks+' tone-free Chinese speech checks passed.');
