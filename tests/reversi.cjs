'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({Event,EventTarget,CustomEvent,console,performance});
for(const f of ['pinyin','data','language-exercises-data','language-exercises','homework','voice','speech','input','game','reversi-engine','reversi'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+f+'.js'),'utf8'),context);
const SC=context.Starlight,R=SC.Reversi,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const analyse=(b,s,o)=>{const it=R.analyse(b,s,o);let r;do{r=it.next();}while(!r.done);return r.value;};
function tickUntil(g,predicate){for(let i=0;i<10000;i++){if(predicate())return;g.update(.05);}assert.fail('Unfinished phase: '+g.phase);}
function setup(options={}){const events=[],g=new SC.ReversiGame({random:rng(42),onEvent:e=>events.push(e)});g.start(options);return {g,events};}
function test(name,fn){fn();console.log('PASS '+name);}
test('Opening tree counts, eight capture directions and no row wrapping',()=>{
 const b=R.initialBoard();assert.deepEqual(Array.from(R.legalMoves(b,1),m=>m.index),[19,26,37,44]);
 const perft=(b,s,d)=>d===0?1:R.legalMoves(b,s).reduce((n,m)=>n+perft(R.applyMove(b,m,s),-s,d-1),0);
 for(const [d,n] of [[1,4],[2,12],[3,56],[4,244],[5,1396]])assert.equal(perft(b,1,d),n);
 const all=new Int8Array(64);for(const [dy,dx] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){all[(3+dy)*8+3+dx]=-1;all[(3+dy*2)*8+3+dx*2]=1;}
 assert.equal(R.flips(all,27,1).length,8);assert.equal(R.count(R.applyMove(all,{index:27},1)).black,17);assert.equal(all[27],0);
 const edge=new Int8Array(64);edge[8]=-1;edge[9]=1;assert.equal(R.flips(edge,7,1).length,0);assert.throws(()=>R.applyMove(b,{index:0},1),/Illegal/);
});
test('Three distinct accepted answers for every exercise, aliases and pinyin',()=>{
 for(const mode of Object.keys(SC.modes).filter(m=>m!=='homework'))for(const lang of SC.isTranslation(mode)?['sv-SE','en-US']:[SC.modes[mode].lang]){
  const {g}=setup({mode,lang});tickUntil(g,()=>g.phase==='answer');assert.equal(g.targets.length,3,mode);
  for(const target of g.targets)assert.equal(g.targets.filter(t=>SC.matches(target.item.answer,t.item,mode,lang,'text')).length,1,mode);
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert(!SC.reversiAnswerOverlap(g.targets[i].item,g.targets[j].item,mode,lang),mode);
 }
 const a={answer:'liten',aliases:['pytteliten'],answerLang:'sv-SE'},b={answer:'minimal',aliases:['pytteliten'],answerLang:'sv-SE'};assert(SC.reversiAnswerOverlap(a,b,'swedish-synonyms','sv-SE'));
 assert(SC.reversiAnswerOverlap({answer:'時',hint:'shí'},{answer:'十',hint:'shí'},'chinese','zh-TW'));
 const pool=[{answer:'a',aliases:['b','c','d'],answerLang:'sv-SE'},...['b','c','d'].map(answer=>({answer,aliases:[],answerLang:'sv-SE'}))];assert.equal(SC.reversiDistinctItems(pool,3,'swedish-synonyms','sv-SE',()=>.99).length,3);
 const {g}=setup({items:[{label:'sol',answer:'sol'}]});tickUntil(g,()=>g.phase==='answer');assert.equal(g.targets.length,1);
});
test('Correct move choice, weak incorrect move, stale input discarded',()=>{
 const {g}=setup({mode:'swedish'});tickUntil(g,()=>g.phase==='answer');const target=g.targets[1];g.queue.enqueue(target.item.answer);g.queue.enqueue(g.targets[2].item.answer);g.update(.05);
 assert.equal(g.lastMove.index,target.move.index);assert.equal(g.turns,1);assert.equal(g.hits,1);assert.equal(g.queue.length,0);assert.equal(g.getTargets().length,0);
 g.queue.enqueue('stale');tickUntil(g,()=>g.phase==='answer');assert.equal(g.turns,1);assert.equal(g.queue.length,0);
 const cutoff=[...g.ranked].sort((a,b)=>a.value-b.value)[Math.ceil(g.ranked.length/3)-1].value;
 g.queue.enqueue('incorrect');g.update(.05);assert(g.ranked.find(m=>m.index===g.lastMove.index).value<=cutoff);assert.equal(g.turns,2);assert.equal(g.hits,1);assert.equal(g.score,R.count(g.board).black);
});
test('Speech accepts complete alternatives; ambiguous speech retries; wrong Chinese costs a move',()=>{
 const candidates=[{answer:'十',hint:'shí'},{answer:'山',hint:'shān'},{answer:'水',hint:'shuǐ'}],c={lesson:'chinese',language:'zh-TW',candidates};
 assert.equal(SC.reversiSpeechAnswer([{transcript:'是'}],c).text,'是');assert.equal(SC.reversiSpeechAnswer([{transcript:'這是山'}],c).ambiguous,true);
 assert.equal(SC.reversiSpeechAnswer([{transcript:'錯了'}],c).text,'錯了');assert.equal(SC.reversiSpeechAnswer([{transcript:'不是'},{transcript:'水'}],c).text,'水');
 const {g}=setup({mode:'chinese',lang:'zh-TW'});tickUntil(g,()=>g.phase==='answer');g.queue.enqueue('錯了','speech');g.update(.05);assert.equal(g.turns,1);assert.equal(g.hits,0);
});
test('No timer or move cap; pause freezes; standard final disc score on all difficulties',()=>{
 for(const pace of ['gentle','steady','brave']){
  const {g,events}=setup({mode:'math-multiplication',pace});tickUntil(g,()=>g.phase==='answer');const board=Array.from(g.board);g.update(3600);assert.equal(g.turns,0);assert.deepEqual(Array.from(g.board),board);
  g.pause();const clock=g.clock;g.update(3600);assert.equal(g.clock,clock);g.resume();
  while(g.state==='playing'){tickUntil(g,()=>g.phase==='answer'||g.state!=='playing');if(g.state!=='playing')break;g.queue.enqueue(g.targets[0].item.answer);g.update(.05);}
  assert(g.turns>20,pace);assert.equal(R.legalMoves(g.board,1).length,0);assert.equal(R.legalMoves(g.board,-1).length,0);
  assert.equal(g.history.filter(m=>m.side===1).length,g.turns);assert.equal(g.score,R.count(g.board).black);assert.equal(g.botScore,R.count(g.board).white);
  assert.equal(events.filter(e=>e.type==='end').length,1);g.update(100);assert.equal(events.filter(e=>e.type==='end').length,1);
 }
});
test('Forced passes, wipeout, ties and one legal move',()=>{
 const {g}=setup();g.board=new Int8Array(64).fill(-1);g.board[1]=1;g.board[2]=0;g.beginTurn(1);assert.equal(g.phase,'pass');assert.equal(g.turns,0);tickUntil(g,()=>g.state!=='playing');assert.equal(g.turns,0);assert.equal(g.score,0);assert.equal(g.botScore,64);
 const tied=setup().g;tied.board=new Int8Array(64);tied.board[0]=1;tied.board[63]=-1;tied.beginTurn(1);assert.equal(tied.state,'draw');assert.equal(tied.score,1);
 const one=setup({mode:'swedish'}).g;one.board=new Int8Array(64).fill(1);one.board[1]=-1;one.board[2]=0;one.beginTurn(1);tickUntil(one,()=>one.phase==='answer');assert.equal(one.targets.length,1);one.queue.enqueue('wrong');one.update(.05);tickUntil(one,()=>one.state!=='playing');assert.equal(one.score,64);assert.equal(one.turns,1);
});
test('Endgame search agrees with exhaustive disc scoring, including forced passes',()=>{
 let b=R.initialBoard(),side=1;const random=rng(9);
 while(R.count(b).empty>6){const moves=R.legalMoves(b,side);if(!moves.length){assert(R.legalMoves(b,-side).length);side=-side;continue;}b=R.applyMove(b,moves[Math.floor(random()*moves.length)],side);side=-side;}
 if(!R.legalMoves(b,side).length)side=-side;
 const exact=(board,player)=>{const moves=R.legalMoves(board,player);if(!moves.length){if(R.legalMoves(board,-player).length)return -exact(board,-player);const n=R.count(board);return (n.black-n.white)*player*1000;}return Math.max(...moves.map(move=>-exact(R.applyMove(board,move,player),-player)));};
 for(const m of analyse(b,side,{depth:6,nodes:100000}))assert.equal(m.value,-exact(R.applyMove(b,m,side),-side));
 assert.equal(analyse(R.initialBoard(),1,{depth:9,nodes:2}).length,4);
 const pass=new Int8Array(64).fill(-1);pass[1]=1;pass[2]=0;assert.equal(analyse(pass,-1,{depth:3,nodes:100})[0].value,64000);
});
test('Fixed difficulty strength with nondeterministic choices and hidden shuffled recommendations',()=>{
 const ranked=analyse(R.initialBoard(),1,{depth:3,nodes:3000}),random=rng(17),bot=new Set(),choices=new Set();
 for(let i=0;i<60;i++){bot.add(R.chooseBot(ranked,'brave',random).index);choices.add(R.recommendations(ranked,random).map(m=>m.index).join(','));}
 assert.equal(bot.size,4);assert(choices.size>10);
 const values=[0,-40,-100].map((value,index)=>({value,index}));assert.equal(R.chooseBot(values,'brave',()=>.99).index,0);assert.equal(R.chooseBot(values,'gentle',()=>.99).index,2);
 assert(R.profiles.gentle.depth<R.profiles.steady.depth&&R.profiles.steady.depth<R.profiles.brave.depth);
});
