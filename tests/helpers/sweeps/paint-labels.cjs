'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'}});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','voice','speech','input','people','game','paint'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,n)=>{for(let i=0;i<Math.round(n/.05);i++)g.update(.05);};
function isolated(options={},onEvent=()=>{}){const g=new SC.PaintGame({random:rng(3),onEvent});g.start(options);g.spawnIn=10000;const p=g.people[0];p.x=.10;p.direction=-1;return {g,p};}
function until(g,condition,seconds=20){for(let i=0;i<seconds/.05&&!condition();i++)g.update(.05);assert(condition(),'condition not reached');}

exports.run = function({widths=[320,368,390,640,1000],seeds=12,frames=50}={}) {
 const canvasContext=new Proxy({},{get:(_,key)=>key==='measureText'?text=>({width:[...text].length*9}):()=>{}});
 for(const width of widths)for(const mode of ['swedishLong','chinese'])for(let seed=1;seed<=seeds;seed++){
  const g=new SC.PaintGame({random:rng(seed)});g.start({mode,pace:'brave'});g.resize(width,700);g.people=[];g.spawned=0;
  for(let i=0;i<8;i++){assert(g.spawn());g.people.at(-1).x=.15+i*.10;}
  SC.noteTargetAppearance(g);g.clock+=10;const r=Object.create(SC.PaintRenderer.prototype);r.game=g;r.ctx=canvasContext;r.round=()=>{};
  for(let i=0;i<frames;i++){
   r.labels();const boxes=r.labelBoxes;
   for(const [j,a] of boxes.entries()){assert(a.x>=0&&a.x+a.w<=width&&a.y>=0&&a.y+a.h<=700);for(const b of boxes.slice(j+1))assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`${width}/${mode}/${seed}: overlapping labels`);}
   g.update(.05);
  }
 }

};
