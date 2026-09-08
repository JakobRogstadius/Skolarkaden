'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({console,Event,EventTarget,CustomEvent,ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
for(const file of ['pinyin','data','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows','eggs','home','home-renderer'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),context);
const SC=context.Starlight;
function canvas(){const texts=[],stack=[];const c=new Proxy({globalAlpha:1,measureText:t=>({width:t.length*8}),save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},fillText(text,x,y){if(text.endsWith(' poäng'))texts.push({text,x,y,alpha:this.globalAlpha,color:this.fillStyle});}},{get:(o,k)=>k in o?o[k]:k.includes('Gradient')?()=>({addColorStop(){}}):()=>{}});return {texts,getContext:()=>c,getBoundingClientRect:()=>({width:1000,height:740})};}
for(const prefix of ['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home']){
 let seed=31;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 let r;const g=new SC[prefix+'Game']({onEvent:e=>r?.scoreEvent(e),random});g.start();g.resize(1000,740);const c=canvas();r=new SC[prefix+'Renderer'](c,g);
 let target;
 for(let i=0;i<1200;i++){g.update(.05);r.draw();target=g.getTargets().find(t=>r.scoreAnchors.has(t));if(target)break;}
 assert(target,prefix+' has a rendered task anchor');const anchor=r.scoreAnchors.get(target);
 // A delayed completion must retain its original label position after removal.
 r.liveScoreBoxes=[];r.scoreEvent({type:'hit',target,points:37});r.drawScores();let text=c.texts.at(-1);assert.equal(text.text,'37 poäng');assert.equal(text.x,anchor.x*g.width);assert.equal(text.y,anchor.y*g.height);assert.equal(text.color,anchor.color);
 r.advanceScores(.7);r.drawScores();assert(c.texts.at(-1).alpha<text.alpha);
 g.state='paused';const age=r.scoreNotices[0].age;r.advanceScores(1);assert.equal(r.scoreNotices[0].age,age);g.state='playing';r.advanceScores(.7);assert.equal(r.scoreNotices.length,0);
 r.scoreEvent({type:'scare',target,points:25});r.liveScoreBoxes=[{x:anchor.x*g.width-50,y:anchor.y*g.height-15,w:100,h:30}];r.drawScores();assert(c.texts.at(-1).y>anchor.y*g.height+15);
 g.resize(355,700);r.liveScoreBoxes=[];r.drawScores();text=c.texts.at(-1);assert(text.x>8&&text.x<347&&text.y>=120&&text.y<692);
 r.scoreEvent({type:'start'});assert.equal(r.scoreNotices.length,0);assert(!r.scoreAnchors.has(target));r.destroy();console.log('PASS '+prefix+' score anchor, value, palette, fade, pause, scare placement, resize and replay');
}
// Check that the two games with delivery-specific events report the full award and source task.
const food=new SC.FoodTruckGame({random:()=>.4});food.start();for(let i=0;i<30;i++)food.update(.05);const customer=food.getTargets()[0];customer.look.exotic='test';let served;food.onEvent=e=>{if(e.type==='hit')served=e;};food.queue.enqueue(customer.item.answer);for(let i=0;i<100&&!served;i++)food.update(.05);assert(served);assert.equal(served.points,food.score);assert.equal(served.target,customer);
const hive=new SC.BeehiveGame({random:()=>.4});hive.start();const plant=hive.plants[0],bee=hive.bees[0];let delivery;hive.onEvent=e=>{if(e.type==='hit')delivery=e;};Object.assign(bee,{...hive.hive,stage:'return',nectar:1,job:{target:plant,entry:{text:'nectar'}}});hive.work(0);assert.equal(delivery.target,plant);assert.equal(delivery.points,10);
console.log('PASS full exotic meal award and original nectar task in delivery events');
