'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'},globalThis:null});context.globalThis=context;
for(const file of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input', 'people', 'game', 'foodtruck'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),context,{filename:file+'.js'});
const SC=context.Starlight;const tick=(g,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);};
const plain=v=>JSON.parse(JSON.stringify(v));
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};

test('Food cook consumes wrong and correct words in FIFO, serves automatically, retains flipped waste',()=>{const g=new SC.FoodTruckGame({random:rng(3)});g.start();tick(g,.85);const c=g.getTargets()[0];g.queue.enqueue('mystery');g.queue.enqueue(c.item.answer);g.update(.05);assert.equal(g.activeCook.entry.text,'mystery');assert.equal(g.queue.length,1);tick(g,2);assert.equal(g.waste.length,1);assert(g.waste[0].angle>Math.PI-.26);assert.equal(g.waste[0].text,'mystery');tick(g,2);assert.equal(g.hits,1);assert.equal(c.happy,true);assert.equal(g.lives,5);const waste=g.waste[0];tick(g,5);assert.equal(g.waste[0],waste);});
test('Departed customer does not cancel cooking; its dish becomes waste with no extra life penalty',()=>{const g=new SC.FoodTruckGame({random:rng(4)});g.start();tick(g,.85);const c=g.getTargets()[0];c.wait=c.patience-.2;g.queue.enqueue(c.item.answer);g.update(.05);tick(g,2.1);assert.equal(g.lives,4);assert.equal(g.waste.length,1);assert.equal(g.hits,0);});
test('Food scoring uses patience, capped streaks and exotic bonuses; failures break streaks',()=>{
 const events=[],g=new SC.FoodTruckGame({onEvent:e=>events.push(e)});g.start();
 const serve=(remaining=1,exotic=null)=>{
  const c={status:'cooking',patience:100,wait:100*(1-remaining),look:{exotic},slot:0};g.customers.push(c);
  g.activeCook={customer:c,entry:{text:'meal'},age:0,duration:1,dish:0};const before=g.score;g.work(1);return g.score-before;
 };
 assert.equal(serve(),20);assert.equal(serve(.5),16);assert.equal(serve(0),12);
 assert.equal(serve(),23);assert.equal(serve(),24);assert.equal(serve(),25);assert.equal(serve(),25);
 assert.equal(serve(1,'dragon'),65);assert.equal(events.find(e=>e.type==='rare-earned').bonus,40);
 g.activeCook={customer:null,entry:{text:'wrong'},age:0,duration:1,dish:0};const before=g.score;g.work(1);
 assert.equal(g.score,before);assert.equal(g.streak,0);assert.equal(serve(),20);
 g.loseCustomer({status:'waiting'});assert.equal(g.streak,0);assert.equal(serve(.5),15);
 const final=g.score;g.finish();assert.equal(g.score,final,'no end bonus');
});
test('Food bot finishes all 40 customers with automatic service',()=>{for(const pace of ['gentle','steady','brave']){const g=new SC.FoodTruckGame({random:rng(5)});g.start({pace});for(let i=0;i<6000&&['playing','celebrating'].includes(g.state);i++){for(const c of g.getTargets())if(c.status==='waiting'&&!g.queue.items.some(e=>e.text===c.item.answer))g.queue.enqueue(c.item.answer);g.update(.05);}assert.equal(g.state,'won');assert.equal(g.lives,5);assert.equal(g.hits,40);}});
test('Food victory waves for four seconds before one result; customers, lives and queue stay frozen',()=>{
 const events=[],g=new SC.FoodTruckGame({random:rng(3),onEvent:e=>events.push(e)});g.start();g.spawned=40;g.hits=40;g.customers=[];g.queue.enqueue('last');g.update(.05);assert.equal(g.state,'celebrating');assert.equal(g.celebrationLeft,4);assert(!events.some(e=>e.type==='end'));assert(events.some(e=>e.type==='celebrate'));assert.equal(g.activeCook,null);
 const before=JSON.stringify(g.customers);tick(g,3.95);assert.equal(g.state,'celebrating');assert.equal(g.queue.length,1);assert.equal(JSON.stringify(g.customers),before);assert.equal(g.lives,5);g.update(.05);assert.equal(g.state,'won');assert.equal(events.filter(e=>e.type==='end').length,1);tick(g,2);assert.equal(events.filter(e=>e.type==='end').length,1);
 const lost=new SC.FoodTruckGame();lost.start();lost.lives=0;lost.finish();assert.equal(lost.state,'lost');
});

function exotic(i){let first=true;return SC.makePerson(()=>{if(first){first=false;return .995;}return (i+.5)/SC.rarePeople.length;});}
test('Rare food customers earn a single 40-point bonus only when served',()=>{
 const events=[],g=new SC.FoodTruckGame({random:rng(5),onEvent:e=>events.push(e)});g.start();tick(g,.85);const c=g.getTargets()[0];c.look=exotic(1);g.queue.enqueue(c.item.answer);tick(g,2.1);assert.equal(g.hits,1);assert(g.score>=50&&g.score<=60);assert.equal(events.filter(e=>e.type==='rare-earned').length,1);tick(g,2);assert.equal(events.filter(e=>e.type==='rare-earned').length,1);
 const lost=new SC.FoodTruckGame({onEvent:e=>events.push(e)});lost.start();lost.customers[0].look=exotic(2);lost.loseCustomer(lost.customers[0]);assert.equal(events.filter(e=>e.type==='rare-earned').length,1);
});
