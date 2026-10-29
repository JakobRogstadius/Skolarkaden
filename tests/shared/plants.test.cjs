'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input', 'people', 'game', 'plants', 'garden', 'beehive'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,t)=>{for(let i=0;i<Math.round(t/.05);i++)g.update(.05);};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
function renderer(Game,Renderer,width=1000,height=740,mode='swedish'){
 const game=new Game({random:rng(31)});game.start({mode,pace:'brave',uppercase:false});game.resize(width,height);
 const fonts=[],stack=[],c=new Proxy({font:'16px system-ui',save(){stack.push(this.font);},restore(){this.font=stack.pop()||this.font;},measureText(text){return {width:Array.from(text).length*(parseFloat(this.font.match(/([\d.]+)px/)?.[1]||16))*.6};},fillText(text,x,y,max){assert(Number.isFinite(x)&&Number.isFinite(y));if(max!==undefined)assert(max>0);fonts.push({text,x,y,max});}},{get:(obj,key)=>key in obj?obj[key]:key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
 const r=Object.create(Renderer.prototype);r.game=game;r.ctx=c;r.dpr=1;r.reduced=false;return {game,r,c,fonts};
}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

test('Both games use all stalk, leaf and flower families; health stays separate from appearance',()=>{
 const random=rng(50),sets=[new Set(),new Set(),new Set()];for(let i=0;i<600;i++){const look=SC.makePlantLook(random);[look.stalk,look.leaf,look.flower].forEach((v,j)=>sets[j].add(v));}
 assert.deepEqual(sets.map(s=>s.size),[4,5,6]);
 for(const Game of [SC.BeehiveGame,SC.GardenGame]){const g=new Game({random:rng(4)});g.start();for(const p of g.plants||g.pots){assert(Number.isInteger(p.look.stalk));assert(Number.isInteger(p.look.leaf));assert(Number.isInteger(p.look.flower));if(Game===SC.BeehiveGame){assert.equal(p.moisture,1);assert.equal(p.nutrition,1);assert.equal(p.infection,0);}else{assert(p.moisture>.6&&p.moisture<1);assert(p.nutrition>.6&&p.nutrition<1);assert(p.infection>0&&p.infection<.4);}}}
 for(let stalk=0;stalk<4;stalk++){
  const look=SC.makePlantLook(random,{stalk}),p={look,growth:.9,moisture:1,nutrition:1,infection:0};const healthy=SC.plantShape(p),dry=SC.plantShape({...p,moisture:.05}),pale=SC.plantShape({...p,nutrition:.05}),bugs=SC.plantShape({...p,infection:.8});
  assert(Math.min(...dry.tips.map(t=>t.y))>Math.min(...healthy.tips.map(t=>t.y))+15);assert(dry.leaves.every((l,i)=>l.angle>healthy.leaves[i].angle));assert.equal(dry.health.leaf,healthy.health.leaf);
  assert.notEqual(pale.health.leaf,healthy.health.leaf);assert.deepEqual(pale.paths,healthy.paths);assert.equal(healthy.health.bugs,0);assert.equal(bugs.health.bugs,8);assert(bugs.health.bugSize>SC.plantHealth({...p,infection:.2}).bugSize);
  assert(SC.plantBounds({...p,growth:.2}).top>SC.plantBounds({...p,growth:1}).top);assert.notEqual(SC.soilColor(.1),SC.soilColor(1));
 }
});
