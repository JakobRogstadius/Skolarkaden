'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let box={width:1000,height:600};
const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...args)=>{for(const arg of args)if(typeof arg==='number')assert(Number.isFinite(arg),'canvas coordinates must be finite');}});
class Element{
  constructor(){this.children=[];this.hidden=false;this.attributes={};}
  append(child){child.parentElement=this;this.children.push(child);}
  remove(){this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
  setAttribute(k,v){this.attributes[k]=v;}
  getBoundingClientRect(){return box;}
  getContext(){return ctx;}
}
const context=vm.createContext({Starlight:{},devicePixelRatio:2,document:{createElement:()=>new Element()}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/klossar-creatures.js'),'utf8'),context);
const SC=context.Starlight,arena=new Element(),fx=new SC.KlossarCreatures(arena);
assert.equal(fx.canvas.width,2000);assert.equal(fx.host.attributes['aria-hidden'],'true');assert(fx.canvas.hidden);

// Sweep the threshold exactly, including 0.5%; follow-up random draws cannot
// turn a failed roll into a spawn or cause a second creature on the same tile.
for(let i=0;i<1000;i++){
  let first=true;fx.random=()=>{if(first){first=false;return i/1000;}return .5;};fx.reveal(200,300,50);
}
assert.equal(fx.creatures.length,5,'exactly five of these 1,000 tile rolls spawn');fx.update(100);fx.draw();assert(fx.canvas.hidden);
for(const [choice,kind] of [[0,'bee'],[.499,'bee'],[.5,'facehugger'],[.999,'facehugger']]){
  const draws=[0,choice,.4,.7,.2];fx.random=()=>draws.shift();fx.reveal(180,260,50);
  assert.equal(fx.creatures.at(-1).kind,kind);
}
fx.draw();fx.update(.4);fx.draw();assert.equal(fx.creatures.length,4,'overlapping escapes stay independent');
box={width:350,height:470};fx.resize();fx.draw();assert(fx.creatures.every(c=>c.age===.4));fx.update(100);fx.draw();assert(fx.canvas.hidden);

for(const [width,height] of [[1200,600],[390,740],[600,600]])for(const [nx,ny] of [[.1,.1],[.9,.1],[.1,.9],[.9,.9],[.5,.5]]){
  const x=nx*width,y=ny*height,p=SC.klossarEscapePath(x,y,width,height,()=>.37);
  const end={x:p.end.x*width,y:p.end.y*height};
  const edge=end.x<0?0:end.x>width?1:end.y<0?2:3,distances=[x,width-x,y,height-y];
  assert.equal(distances[edge],Math.max(...distances),'exit uses the farthest edge in pixels');
  assert(end.x<=-63||end.x>=width+63||end.y<=-63||end.y>=height+63,'the whole creature clears the game area');
  for(const kind of ['bee','facehugger']){
    const creature={...p,kind,phase:1,turns:2.4},start=SC.klossarCreaturePoint(creature,0,width,height),finish=SC.klossarCreaturePoint(creature,1,width,height);
    assert(Math.hypot(start.x-x,start.y-y)<1e-8);assert(Math.hypot(finish.x-end.x,finish.y-end.y)<1e-8);
    const dx=end.x-x,dy=end.y-y,offsets=[];
    for(let i=1;i<20;i++){const at=SC.klossarCreaturePoint(creature,i/20,width,height);offsets.push(((at.x-x)*dy-(at.y-y)*dx)/p.distance);}
    if(kind==='bee')assert(Math.max(...offsets)>5&&Math.min(...offsets)<-5,'bees weave on both sides of the route');
    else assert(offsets.every(d=>Math.abs(d)<1e-8),'facehuggers scurry directly toward their exit');
  }
}
const reduced=new SC.KlossarCreatures(arena,{random:()=>0,reduced:true});reduced.reveal(100,200,50);reduced.update(.3);reduced.draw();reduced.update(.41);reduced.draw();assert(reduced.canvas.hidden);
fx.destroy();reduced.destroy();assert.equal(arena.children.length,0);
console.log('PASS 0.5% per-tile probability, equal species choice, farthest edges on wide/tall/square arenas, winding bee paths, full exits, overlap, resize, reduced motion and cleanup');
