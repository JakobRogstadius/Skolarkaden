'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'}});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','voice','speech','input','people','game','foodtruck','plants','garden','beehive'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,n)=>{for(let i=0;i<Math.round(n/.05);i++)g.update(.05);};
function flowers(g,n=5){while(g.plants.length<n)g.spawn();g.nextSpawn=10000;for(const p of g.plants.slice(0,n)){g.bloom(p);p.bloomFor=1000;}return g.getTargets();}
function exotic(i){let first=true;return SC.makePerson(()=>{if(first){first=false;return .995;}return (i+.5)/SC.rarePeople.length;});}

exports.run = function({widths=[1000,390],seeds=6}={}) {
 for(const width of widths)for(const pace of ['gentle','steady','brave'])for(const mode of ['swedish','math-addition'])for(let seed=1;seed<=seeds;seed++){
  const g=new SC.BeehiveGame({random:rng(seed)});g.start({pace,mode});g.resize(width,width<600?1200:740);let due=0,n=0;const interval={gentle:3,steady:2,brave:1.5}[pace]*(mode==='math-addition'?1.3:1);
  for(let i=0;i<6000&&['playing','celebrating','mourning'].includes(g.state);i++){if(g.state==='playing'&&g.elapsed>=due&&!g.queue.length){const t=g.getTargets().find(t=>!t.claimedBy);if(t){g.queue.enqueue(++n%10===0?'wrong':mode==='math-addition'?SC.numberName(Number(t.item.answer),'sv-SE'):t.item.answer,mode==='math-addition'?'speech':'text');due=g.elapsed+interval;}}g.update(.05);}
  assert.equal(g.state,'won',`${width}/${pace}/${mode}/${seed}: ${g.honey}/${g.honeyGoal}`);assert(g.honey>=g.honeyGoal);
 }

};
