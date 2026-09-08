'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'}});
for(const file of ['pinyin','data','voice','speech','input','people','game','paint'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,n)=>{for(let i=0;i<Math.round(n/.05);i++)g.update(.05);};
let checks=0;function test(name,fn){fn();console.log('PASS '+name);checks++;}
function isolated(options={},onEvent=()=>{}){const g=new SC.PaintGame({random:rng(3),onEvent});g.start(options);g.spawnIn=10000;const p=g.people[0];p.x=.10;p.direction=-1;return {g,p};}
function until(g,condition,seconds=20){for(let i=0;i<seconds/.05&&!condition();i++)g.update(.05);assert(condition(),'condition not reached');}
test('The rooftop character is always a child, equally often a boy and a girl',()=>{
 const counts={boy:0,girl:0};for(let i=0;i<10000;i++){let first=true;const p=SC.makeChild(()=>{if(first){first=false;return (i+.5)/10000;}return .5;});assert(p.child);assert(!p.exotic);counts[p.kind]++;}assert.deepEqual(counts,{boy:5000,girl:5000});
});
test('A popped answer reserves an exiting pedestrian; the child crosses the roof gap before throwing',()=>{
 const events=[],{g,p}=isolated({},e=>events.push(e));g.queue.enqueue(p.item.answer);g.update(.05);assert.equal(p.status,'targeted');assert.equal(g.job.stage,'run');assert.equal(g.shots,0);
 until(g,()=>!!g.child.jump);assert.equal(g.balloon,null);g.resize(390,700);until(g,()=>!!g.balloon);assert.equal(g.child.jump,null);assert.equal(g.child.roof,0);assert.equal(g.hits,0);
 until(g,()=>g.hits===1);assert.equal(p.status,'angry');assert(p.paint);assert.equal(g.score,10);assert.equal(g.passed,0);assert(p.x>=.055);assert(events.findIndex(e=>e.type==='roof-land')<events.findIndex(e=>e.type==='balloon-throw'));
});
test('A painted person completes exactly three hops, then walks out and counts once',()=>{
 const events=[],{g,p}=isolated({},e=>events.push(e));g.queue.enqueue(p.item.answer);until(g,()=>g.hits===1);tick(g,1.60);assert.equal(p.status,'angry');assert.equal(p.jumps,2);g.update(.05);assert.equal(p.jumps,3);assert.equal(p.status,'leaving');assert.equal(events.filter(e=>e.type==='paint-hop').length,3);assert(p.paint);until(g,()=>g.passed===1);tick(g,5);assert.equal(g.passed,1);assert.equal(g.hits,1);
});
test('The FIFO handles one balloon at a time; wrong answers leave persistent splashes without lost points',()=>{
 const events=[],{g,p}=isolated({},e=>events.push(e));g.queue.enqueue('felord');g.queue.enqueue(p.item.answer);g.queue.enqueue('ett annat fel');g.update(.05);assert.equal(g.job.entry.text,'felord');assert.equal(g.queue.length,2);tick(g,.5);assert.equal(g.hits,0);assert.equal(p.status,'walking');until(g,()=>g.puddles.length===1);assert.equal(g.score,0);
 // Keep the queued pedestrian visible until the worker can pop its next answer.
 p.x=.3;p.direction=1;until(g,()=>g.hits===1);assert.equal(g.puddles.length,1);until(g,()=>g.puddles.length===2);assert.equal(g.score,10);assert.equal(g.streak,0);assert.equal(g.shots,3);assert.deepEqual(events.filter(e=>e.type==='work').map(e=>e.entry.text),['felord',p.item.answer,'ett annat fel']);assert.notEqual(g.puddles[0].x,g.puddles[1].x);tick(g,10);assert.equal(g.puddles.length,2);
});
test('An exotic pedestrian gives an additional fifty points',()=>{
 const {g,p}=isolated();let first=true;p.look=SC.makePerson(()=>{if(first){first=false;return .995;}return .4;});assert(p.look.exotic);g.queue.enqueue(p.item.answer);until(g,()=>g.hits===1);assert.equal(g.score,60);
});
test('Hits build an uncapped streak; only wrong answers and unpainted departures reset it',()=>{
 const events=[],{g}=isolated({},e=>events.push(e));g.people=[];
 function hit(exotic=false){const p={x:.5,y:.8,status:'targeted',look:{exotic}};g.people.push(p);g.balloon={target:p,color:'red',entry:{text:'hit'}};g.impact();return p;}
 for(let i=0;i<12;i++){const before=g.score;hit();assert.equal(g.score-before,10+i);}
 assert.equal(g.streak,12);assert.equal(g.bestStreak,12);
 const before=g.score,painted=hit(true);assert.equal(g.score-before,72);assert.equal(events.filter(e=>e.type==='rare-earned').length,1);
 painted.x=1.2;painted.status='leaving';painted.speed=0;g.updatePeople(0);assert.equal(g.streak,13);
 g.people.push({x:1.2,y:.8,status:'walking',speed:0,direction:1});g.updatePeople(0);assert.equal(g.streak,0);
 const resetScore=g.score;hit();assert.equal(g.score-resetScore,10);
 g.queue.enqueue('incorrect');g.beginJob();assert.equal(g.streak,0);assert.equal(g.bestStreak,13);
 g.queue.clear();g.start();assert.equal(g.score,0);assert.equal(g.streak,0);assert.equal(g.bestStreak,0);
});
test('Queue highlights honor speech aliases and revisions without claiming the same person twice',()=>{
 const {g,p}=isolated({mode:'english',lang:'en-US'});p.item={answer:'sea',label:'sea'};const entry=g.queue.enqueue('see','speech');assert.equal(g.getTaskStates().get(p),'queued');g.queue.revise(entry,'wrong');assert.equal(g.getTaskStates().get(p),undefined);g.queue.revise(entry,'sea');g.queue.enqueue('see','speech');g.update(.05);assert.equal(g.getTaskStates().get(p),'active');until(g,()=>g.hits===1);until(g,()=>g.puddles.length===1);assert.equal(g.hits,1);
});
test('Pause freezes walking, roof jumps, balloon flights and the pending FIFO',()=>{
 for(const stage of ['run','jump','flight']){const {g,p}=isolated();g.queue.enqueue(p.item.answer);g.update(.05);if(stage==='jump')until(g,()=>!!g.child.jump);if(stage==='flight')until(g,()=>!!g.balloon);g.queue.enqueue('pending');g.pause();const snapshot=JSON.stringify({clock:g.clock,people:g.people,child:g.child,balloon:g.balloon,job:g.job});tick(g,5);assert.equal(JSON.stringify({clock:g.clock,people:g.people,child:g.child,balloon:g.balloon,job:g.job}),snapshot);assert.equal(g.queue.length,1);g.resume();until(g,()=>g.hits===1);}
});
test('Every exercise can target a pedestrian, including spoken math in all four language choices',()=>{
 for(const mode of Object.keys(SC.modes)){const opts={mode,lang:SC.modes[mode].lang,uppercase:true},{g,p}=isolated(opts);g.queue.enqueue(p.item.answer);until(g,()=>g.hits===1);assert.equal(g.score,10);if(['swedish','english','swedishLong','englishLong','letters','food'].includes(mode))assert.equal(p.item.label,p.item.label.toUpperCase());}
 for(const lang of ['sv-SE','en-US','zh-CN','zh-TW']){const {g,p}=isolated({mode:'math',lang});g.queue.enqueue(SC.numberName(Number(p.item.answer),lang),'speech');until(g,()=>g.hits===1);}
});
test('Rounds finish after forty departures and cannot lose, with no answers, correct answers or only mistakes',()=>{
 const peak={},durations={};
 for(const pace of ['gentle','steady','brave'])for(const strategy of ['none','correct','wrong'])for(let seed=1;seed<=4;seed++){
  const events=[],g=new SC.PaintGame({random:rng(seed),onEvent:e=>events.push(e)});g.start({pace});let max=0;
  for(let i=0;i<16000&&['playing','celebrating'].includes(g.state);i++){
   if(g.state==='playing'&&!g.job&&!g.queue.length){if(strategy==='wrong')g.queue.enqueue('felord');else if(strategy==='correct'){const t=g.getTargets().find(p=>p.status==='walking');if(t)g.queue.enqueue(t.item.answer);}}
   g.update(.05);max=Math.max(max,g.people.length);assert(g.people.length<=g.maxPeople);assert(g.spawned<=40);assert(g.passed<=40);
  }
  assert.equal(g.state,'won',`${pace}/${strategy}/${seed}`);assert.equal(g.passed,40);assert.equal(g.spawned,40);assert.equal(g.people.length,0);assert.equal(events.filter(e=>e.type==='end').length,1);assert(events.find(e=>e.type==='end').won);assert.equal(g.score,events.filter(e=>e.type==='hit').reduce((sum,e)=>sum+e.points,0));
  if(strategy==='none'||strategy==='wrong')assert.equal(g.hits,0);else assert(g.hits>=30,`${pace} too few hits: ${g.hits}`);
  if(strategy==='none'&&seed===1){peak[pace]=max;durations[pace]=g.elapsed;}
 }
 assert(peak.gentle<peak.steady&&peak.steady<peak.brave);assert(durations.brave<durations.steady&&durations.steady<durations.gentle);
});
test('Final balloon resolves, remaining queued words cannot delay the no-loss result, and replay resets paint',()=>{
 const ends=[],{g,p}=isolated({},e=>{if(e.type==='end')ends.push(e);});g.spawned=40;g.passed=39;p.x=1.119;p.direction=1;p.speed=.1;g.queue.enqueue('wrong');g.beginJob();g.queue.enqueue('later');g.update(.05);assert.equal(g.passed,40);assert.equal(g.state,'playing');until(g,()=>g.state==='celebrating');assert.equal(g.puddles.length,1);assert.equal(g.queue.length,1);assert.equal(ends.length,0);tick(g,1.95);assert.equal(g.state,'celebrating');g.update(.05);assert.equal(g.state,'won');assert.equal(ends.length,1);tick(g,10);assert.equal(ends.length,1);g.queue.clear();g.start();assert.equal(g.puddles.length,0);assert.equal(g.passed,0);assert.equal(g.score,0);assert.equal(g.spawned,1);
});
test('Eight labels stay separate and inside the canvas with long words and Mandarin hints',()=>{
 const canvasContext=new Proxy({},{get:(_,key)=>key==='measureText'?text=>({width:[...text].length*9}):()=>{}});
 for(const width of [320,368,390,640,1000])for(const mode of ['swedishLong','chinese'])for(let seed=1;seed<=12;seed++){
  const g=new SC.PaintGame({random:rng(seed)});g.start({mode,pace:'brave'});g.resize(width,700);g.people=[];g.spawned=0;
  for(let i=0;i<8;i++){assert(g.spawn());g.people.at(-1).x=.15+i*.10;}
  SC.noteTargetAppearance(g);g.clock+=5;const r=Object.create(SC.PaintRenderer.prototype);r.game=g;r.ctx=canvasContext;r.round=()=>{};
  for(let i=0;i<50;i++){
   r.labels();const boxes=r.labelBoxes;
   for(const [j,a] of boxes.entries()){assert(a.x>=0&&a.x+a.w<=width&&a.y>=0&&a.y+a.h<=700);for(const b of boxes.slice(j+1))assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`${width}/${mode}/${seed}: overlapping labels`);}
   g.update(.05);
  }
 }
});
console.log(checks+' paint-balloon checks passed.');
