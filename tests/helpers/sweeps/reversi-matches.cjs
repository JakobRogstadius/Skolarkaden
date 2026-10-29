'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({Event,EventTarget,CustomEvent,console,performance});
for(const f of ['pinyin','data','language-exercises-data','language-exercises','homework','voice','speech','input','game','reversi-engine','reversi'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+f+'.js'),'utf8'),context);
const SC=context.Starlight,R=SC.Reversi,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const analyse=(b,s,o)=>{const it=R.analyse(b,s,o);let r;do{r=it.next();}while(!r.done);return r.value;};
function tickUntil(g,predicate){for(let i=0;i<10000;i++){if(predicate())return;g.update(.05);}assert.fail('Unfinished phase: '+g.phase);}
function setup(options={}){const events=[],g=new SC.ReversiGame({random:rng(42),onEvent:e=>events.push(e)});g.start(options);return {g,events};}

exports.run = function({short=false}={}) {
 for(const pace of ['gentle','steady','brave']){
  const {g,events}=setup({mode:'math-multiplication',pace});if(short){g.board=new Int8Array(64).fill(1);g.board[1]=-1;g.board[2]=0;g.beginTurn(1);}tickUntil(g,()=>g.phase==='answer');const board=Array.from(g.board);g.update(3600);assert.equal(g.turns,0);assert.deepEqual(Array.from(g.board),board);
  g.pause();const clock=g.clock;g.update(3600);assert.equal(g.clock,clock);g.resume();
  while(g.state==='playing'){tickUntil(g,()=>g.phase==='answer'||g.state!=='playing');if(g.state!=='playing')break;g.queue.enqueue(g.targets[0].item.answer);g.update(.05);}
  assert(short?g.turns===1:g.turns>20,pace);assert.equal(R.legalMoves(g.board,1).length,0);assert.equal(R.legalMoves(g.board,-1).length,0);
  assert.equal(g.history.filter(m=>m.side===1).length,g.turns);assert.equal(g.score,R.count(g.board).black);assert.equal(g.botScore,R.count(g.board).white);
  assert.equal(events.filter(e=>e.type==='end').length,1);g.update(100);assert.equal(events.filter(e=>e.type==='end').length,1);
 }

};
