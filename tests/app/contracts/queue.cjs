'use strict';
const {games}=require('../../helpers/runtime.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
class Element extends EventTarget{constructor(){super();this.value='';this.button={};}querySelector(){return this.button;}focus(){}setAttribute(){}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'}});
for(const file of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input', 'people', 'game', 'foodtruck', 'plants', 'garden', 'beehive', 'paint'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,n)=>{for(let i=0;i<Math.round(n/.05);i++)g.update(.05);};
let checks=0;function test(name,fn){fn();console.log('PASS '+name);checks++;}
function policy(queue,getCandidates,mode='swedish',lang='sv-SE',getActiveEntries=()=>[]){queue.setPolicy({getCandidates,getActiveEntries,matches:(entry,item)=>SC.matches(entry.text,item,mode,lang,entry.source),sameInput:(a,b)=>SC.sameInput(a,b,mode,lang)});}
const texts=q=>Array.from(q.items,e=>e.text);
function makeInput(){const field=new Element(),form=new Element(),queue=new SC.AnswerQueue(),microphone={snapshot:()=>({samples:new Float32Array(0)}),cancel(){}};const input=new SC.AnswerInput({field,form,queue,microphone,voiceButton:new Element()});input.configure({enabled:false,lesson:'letters'});input.setEnabled(true);return {input,field,form,queue};}

test('Rejected speech tokens remain deduplicated, while later valid words are queued and raw tokens logged',()=>{
 const q=new SC.AnswerQueue(),items=[{answer:'sea'},{answer:'sun'}],log=[];policy(q,()=>items,'english','en-US');const s=new SC.SpeechStream({getContext:()=>({lesson:'english',language:'en-US',candidates:items}),enqueue:text=>q.enqueue(text,'speech'),revise:(entry,text)=>q.revise(entry,text),trace:(type,data)=>log.push({type,...data})});
 const result=text=>[Object.assign([{transcript:text}],{isFinal:true})];s.update(result('wrong nope extra see son'));assert.deepEqual(texts(q),['wrong','nope','see','son']);q.take();q.take();s.update(result('wrong nope extra see son'));assert.deepEqual(texts(q),['see','son']);assert(log.some(e=>e.type==='queue-skipped'&&e.text==='extra'));
});
test('Every game ignores duplicates of active work',()=>{
 for(const [name,setup] of games([['CityGame',g=>g.spawn()],['FoodTruckGame',g=>tick(g,.85)],['GardenGame',g=>{g.pots[0].moisture=.6;g.syncRequests(g.pots[0]);}],['BeehiveGame',g=>g.bloom(g.plants[0])],['PaintGame',()=>{}]])){
  const g=new SC[name]({random:rng(6)});g.start();setup(g);policy(g.queue,()=>g.getAvailableTargets().map(t=>t.item),g.mode,g.lang,()=>g.getActiveEntries());const t=g.getAvailableTargets()[0];assert(t,name);g.queue.enqueue(t.item.answer);g.update(.05);assert(!g.getAvailableTargets().includes(t),name);for(let i=0;i<50;i++)g.queue.enqueue(t.item.answer);assert.equal(g.queue.length,0,name);g.pause();tick(g,2);assert.equal(g.queue.length,0);g.resume();g.update(.05);assert(g.queue.length<=2);
 }
});
