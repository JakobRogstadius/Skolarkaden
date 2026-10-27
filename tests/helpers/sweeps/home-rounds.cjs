'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','speech','input','people','game','home','home-renderer'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);};
function setup(options={},active=false){const events=[],g=new SC.HomeGame({random:rng(8),onEvent:e=>events.push(e)});g.start({uppercase:false,...options});g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});if(!active){g.chooseActivity=()=>false;g.people.slice(1).forEach(p=>{p.wait=0;p.activity=null;});}return {g,events};}
function until(g,condition,seconds=60){for(let i=0;i<seconds*20&&!condition();i++)g.update(.05);assert(condition(),'condition must resolve in '+seconds+' seconds');}

exports.run = function({styles=['letters','swedishLong','math-large-numbers','chinese','silent','wrong'],seeds=4,calibration=true}={}) {
 let rounds=0;const roomTotals={gentle:{},steady:{},brave:{}};
 for(const pace of ['gentle','steady','brave'])for(const style of styles)for(let seed=1;seed<=seeds;seed++){
  const g=new SC.HomeGame({random:rng(seed)}),inputRng=rng(seed+411);g.start({pace,mode:['silent','wrong'].includes(style)?'letters':style,lang:style==='chinese'?'zh-TW':'sv-SE'});g.resize(seed%2?370:1100,740);g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});let due=0;
  for(let i=0;i<26000&&['playing','celebrating'].includes(g.state);i++){
   if(g.state==='playing'&&g.clock>=due&&style!=='silent'){const reserved=g.reservations(),t=g.getAvailableTargets().find(t=>!reserved.has(t));if(t){g.queue.enqueue(style==='wrong'||inputRng()<.1?'wrong':t.item.answer);due=g.clock+(style==='math-large-numbers'?8:5);}}
   g.update(.05);if(i%20===0)assert(g.people.every(p=>g.walkable(p)),`${pace}/${style}/${seed}: nobody crosses a wall`);
  }
  // Fast-input capacity is checked above. These deliberately slow/imperfect
  // runs verify completion and earned points despite faster unpaid family help.
  assert.equal(g.state,'won',`${pace}/${style}/${seed} at ${g.elapsed}`);assert(g.cleaned>=40);assert.equal(g.messes.length,0);assert.equal(g.cleaned,g.hits+g.familyCleaned);assert(g.score>=10*g.hits&&g.score<=20*g.hits);assert(g.player.restAge>=2.5);if(['silent','wrong'].includes(style)){assert.equal(g.score,0);assert(g.angerCount>0);}else assert(g.hits>0,`${pace}/${style}/${seed}: ${g.hits} player jobs`);for(const [room,n]of Object.entries(g.roomCounts))roomTotals[pace][room]=(roomTotals[pace][room]||0)+n;rounds++;
 }
 assert.equal(rounds,3*styles.length*seeds);if(calibration)for(const [pace,counts]of Object.entries(roomTotals)){const total=Object.values(counts).reduce((a,b)=>a+b,0);assert.equal(Object.keys(counts).length,6);for(const [room,n]of Object.entries(counts))assert(n/total>=.15,`${pace}/${room}: ${(100*n/total).toFixed(1)}% of generated tasks`);}console.log('  '+rounds+' complete home rounds passed.');

};
