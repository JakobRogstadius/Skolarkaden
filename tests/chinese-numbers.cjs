'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent});
for(const name of ['pinyin','data','speech','input','people','game','foodtruck','plants','garden','beehive','paint'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+name+'.js'),'utf8'),ctx);
const SC=ctx.Starlight,items=SC.modes.chinese.items.filter(item=>['三','八'].includes(item.answer));
const result=(text,isFinal=false)=>Object.assign([{transcript:text}],{isFinal});
let checks=0;
for(const language of ['zh-CN','zh-TW'])for(const name of ['CityGame','FoodTruckGame','GardenGame','BeehiveGame','PaintGame']){
 let seed=7;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},events=[];
 const g=new SC[name]({random,onEvent:e=>events.push(e)});g.start({mode:'chinese',lang:language,items});
 if(name==='CityGame'){g.spawn();g.spawn();}
 if(name==='FoodTruckGame'){g.spawn();for(const c of g.customers)c.status='waiting';}
 if(name==='GardenGame'){g.decayInterval=100;for(const p of g.pots.slice(0,2)){p.moisture=.6;g.syncRequests(p);}}
 if(name==='BeehiveGame'){for(const p of g.plants.slice(0,2))g.bloom(p);}
 if(name==='PaintGame'){g.spawn();g.people.forEach((p,i)=>p.x=.25+i*.45);}
 assert.equal(g.getAvailableTargets().length,2,name);
 g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,item)=>SC.matches(e.text,item,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});
 const stream=new SC.SpeechStream({getContext:()=>({lesson:g.mode,language:g.lang,candidates:g.getTargets().map(t=>t.item)}),enqueue:text=>g.queue.enqueue(text,'speech'),revise:(e,text)=>g.queue.revise(e,text)});
 stream.update([result('三')]);g.update(.05);assert.equal(g.getActiveEntries().length,1,name);
 stream.update([result('38')]);assert.equal(g.queue.length,1,name);assert.equal(g.queue.items[0].text,'8');
 stream.update([result('三八',true)]);stream.update([result('38',true)]);assert.equal(g.queue.length,1,name);
 for(let i=0;i<600&&g.hits<2;i++)g.update(.05);
 assert.equal(g.hits,2,name);assert.equal(g.queue.length,0,name);
 assert(!events.some(e=>['miss','waste','think'].includes(e.type)),name);
 console.log('PASS '+name+' / '+language+': merged 38 and transcript revisions produce exactly two successful actions');checks++;
}
console.log(checks+' Chinese number-speech game integrations passed.');
