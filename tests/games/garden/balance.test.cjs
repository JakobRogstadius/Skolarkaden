'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','input','people','game','plants','garden'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const [pace,count,interval] of [['gentle',6,10],['steady',9,60/9],['brave',12,5]]){
 const g=new SC.GardenGame({random:rng(9)});g.start({pace});assert.equal(g.pots.length,count);assert.equal(g.requestInterval(),interval);
 for(const time of [0,60,120,300]){g.elapsed=time;assert.equal(g.requestInterval(),interval,'no late-round acceleration');}
 g.gardener.x=0;g.gardener.y=0;g.moveTo({x:1,y:0},.25);assert(Math.abs(g.gardener.x-.14)<1e-9,'walking speed unchanged');
 g.pots[0].bloom=true;g.pots[1].dead=true;assert.equal(g.requestInterval(),60/(count-2));g.pots.forEach(p=>p.bloom=true);assert.equal(g.requestInterval(),Infinity);assert.equal(g.decayProbability(),0);
 for(const mode of ['math-addition','math-addition-subtraction','math-large-numbers','math-multiplication','math-multiplication-division','math-equations']){g.start({pace,mode});assert.equal(g.requestInterval(),interval*2);}
}
console.log('PASS fixed plant counts and walking speed; constant per-plant rate; finished plants retire their traffic; all maths levels keep extra time');
