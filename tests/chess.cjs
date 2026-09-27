'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({Event,EventTarget,CustomEvent,console,performance});
for(const f of ['pinyin','data','language-exercises-data','language-exercises','homework','voice','speech','input','game','reversi-engine','reversi','chess-rules','chess-engine','chess-scoring','chess'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+f+'.js'),'utf8'),context);
const SC=context.Starlight,C=SC.ChessEngine,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const analyse=(p,options={depth:2,nodes:5000})=>{const it=C.analyse(p,options);let r;do{r=it.next();}while(!r.done);return r.value;};
const moves=p=>Array.from(p.moves({verbose:true}),C.key).sort();
function tickUntil(g,predicate){for(let i=0;i<20000;i++){if(predicate())return;g.update(.05);}assert.fail('Unfinished phase: '+g.phase);}
function setup(options={}){const events=[],g=new SC.ChessGame({random:rng(42),onEvent:e=>events.push(e)});g.start(options);return {g,events};}
function test(name,fn){fn();console.log('PASS '+name);}
test('Chess search adapter agrees with public legal moves and standard perft positions',()=>{
 const positions=[
  [new C.Chess(),[20,400,8902]],
  [new C.Chess('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'),[48,2039,97862]],
  [new C.Chess('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'),[14,191,2812]]
 ];
 for(const [p,counts] of positions){
  const a=C.searchPosition(p),fen=p.fen();
  const perft=d=>d===0?1:a.moves().reduce((sum,m)=>{a.play(m);const n=perft(d-1);a.undo();return sum+n;},0);
  for(let d=1;d<=counts.length;d++)assert.equal(perft(d),counts[d-1],fen+' depth '+d);
  for(const m of a.moves()){
   const publicMove=a.publicMove(m);p.move(publicMove);a.play(m);assert.equal(a.rules.fen(),p.fen());assert.deepEqual(moves(a.rules),moves(p));p.undo();a.undo();
  }
  assert.equal(a.rules.fen(),fen);assert.equal(p.fen(),fen);
 }
});
test('Castling, en passant, pinned pawns and every promotion obey standard legality',()=>{
 let p=new C.Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');assert(moves(p).includes('e1g1'));assert(moves(p).includes('e1c1'));p.move('O-O');assert.equal(p.get('g1').type,'k');assert.equal(p.get('f1').type,'r');assert.equal(p.get('h1'),undefined);
 p=new C.Chess('k4r2/8/8/8/8/8/8/4K2R w K - 0 1');assert(!moves(p).includes('e1g1'),'cannot castle through check');
 p=new C.Chess('k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');assert(!moves(p).includes('e5d6'),'en passant cannot uncover check');
 p=new C.Chess('k7/8/8/3pP3/8/8/8/4K3 w - d6 0 1');p.move({from:'e5',to:'d6'});assert.equal(p.get('d5'),undefined);assert.equal(p.get('d6').type,'p');
 p=new C.Chess('7k/P7/8/8/8/8/8/4K3 w - - 0 1');const promotions=moves(p).filter(m=>m.startsWith('a7a8'));assert.deepEqual(promotions,['a7a8b','a7a8n','a7a8q','a7a8r']);
 const knight=p.move({from:'a7',to:'a8',promotion:'n'});assert.equal(p.get('a8').type,'n');assert(C.description(knight).includes('springare'));
});
test('Checkmate, stalemate, insufficient material, repetition and fifty-move draws',()=>{
 const p=new C.Chess();for(const m of ['f3','e5','g4','Qh4#'])p.move(m);assert.equal(C.outcome(p).winner,'b');
 assert.equal(C.outcome(new C.Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).reason,'Patt');
 assert.equal(C.outcome(new C.Chess('7k/8/6K1/8/8/8/8/8 w - - 0 1')).winner,null);
 assert.equal(C.outcome(new C.Chess('7k/8/6K1/8/8/8/8/R7 w - - 100 51')).winner,null);
 // Checkmate wins even when the half-move counter has reached 100.
 assert.equal(C.outcome(new C.Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 100 51')).winner,'w');
 const repeated=new C.Chess();for(const m of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'])repeated.move(m);
 assert.equal(C.outcome(repeated).reason,'Trefaldig ställningsupprepning');
 const a=C.searchPosition(repeated),before=a.rules.fen();assert(a.rules.isThreefoldRepetition());for(const m of a.moves()){a.play(m);a.undo();assert(a.rules.isThreefoldRepetition());}assert.equal(a.rules.fen(),before);
});
test('Search finds mate, avoids hanging the queen and preserves board and repetition history',()=>{
 const mate=new C.Chess('7k/8/5KQ1/8/8/8/8/8 w - - 0 1'),ranked=analyse(mate);mate.move(ranked[0]);assert(mate.isCheckmate());assert(ranked[0].value>90000);
 const p=new C.Chess('4k3/8/8/8/8/8/4q3/3QK3 w - - 0 1'),fen=p.fen(),r=analyse(p);assert.equal(r[0].to,'e2','capture the hanging queen');assert.equal(p.fen(),fen);
 assert.equal(analyse(new C.Chess(),{depth:9,nodes:1}).length,20,'budget exhaustion still offers all legal root moves');
 const repeat=new C.Chess();for(const m of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1'])repeat.move(m);
 const before=repeat.fen(),history=repeat.history().join(' '),r2=analyse(repeat,{depth:1,nodes:3000});assert(r2.find(m=>m.san==='Ng8').value===0);assert.equal(repeat.fen(),before);assert.equal(repeat.history().join(' '),history);assert(!repeat.isThreefoldRepetition());
});
test('Hidden recommendations shuffle ties; difficulty and poor choices use the evaluated scores',()=>{
 const random=rng(19),ranked=[0,0,0,-70,-200,-450].map((value,i)=>({from:'a2',to:'abcdefgh'[i]+'4',value})),seen=new Set();
 for(let i=0;i<50;i++){seen.add(C.recommendations(ranked,random).map(C.key).join(','));assert(C.choosePoor(ranked,random).value<=-200);}
 assert(seen.size>3);assert.equal(C.chooseBot(ranked,'brave',()=>.999).value,0);assert(C.chooseBot(ranked,'gentle',()=>.999).value<0);
 assert(C.profiles.gentle.depth<C.profiles.steady.depth&&C.profiles.steady.depth<C.profiles.brave.depth);
 const bot=new Set();for(let i=0;i<30;i++)bot.add(C.key(C.chooseBot(ranked,'brave',random)));assert.equal(bot.size,3);
});
test('Choices always include a best move plus distinct random moves from the top ten',()=>{
 const random=rng(2026),ranked=new C.Chess().moves({verbose:true}).map((m,i)=>({...m,value:1000-i})),original=ranked.map(C.key),seen=new Set(),bestSlots=new Set();
 for(let i=0;i<200;i++){
  const choices=C.recommendations(ranked,random);assert.equal(choices.length,3);assert.equal(new Set(choices.map(C.key)).size,3);
  assert(choices.some(m=>C.key(m)===C.key(ranked[0])));bestSlots.add(choices.findIndex(m=>C.key(m)===C.key(ranked[0])));
  for(const move of choices){const index=ranked.findIndex(m=>C.key(m)===C.key(move));assert(index<10);seen.add(index);}
 }
 assert.equal(seen.size,10,'every one of the top ten can appear');assert.equal(bestSlots.size,3,'the best move has no fixed letter');assert.deepEqual(ranked.map(C.key),original,'input order is preserved');
 for(const length of [0,1,2,3,7])for(const count of [1,2,3]){
  const choices=C.recommendations(ranked.slice(0,length),random,count);assert.equal(choices.length,Math.min(length,count));
  if(length)assert(choices.some(m=>C.key(m)===C.key(ranked[0])));
 }
 const tied=ranked.map(m=>({...m,value:0})),bestChoices=new Set();
 for(let i=0;i<100;i++)bestChoices.add(C.key(C.recommendations(tied,random,1)[0]));assert(bestChoices.size>10,'ties do not lock the same ten moves into the pool');
});
test('Chess offers distinct exercise answers including aliases, pinyin and diagrams',()=>{
 const opening=new C.Chess().moves({verbose:true}).map((m,i)=>({...m,value:-i}));
 for(const mode of Object.keys(SC.modes).filter(m=>m!=='homework')){
  const {g}=setup({mode,lang:SC.modes[mode].lang});g.search=null;g.offer(opening);assert.equal(g.targets.length,3,mode);
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert(!SC.reversiAnswerOverlap(g.targets[i].item,g.targets[j].item,mode,g.lang),mode);
 }
 for(const count of [1,2]){
  const {g}=setup({items:[{label:'sol',answer:'sol'},{label:'måne',answer:'måne'}].slice(0,count)});g.offer(opening);assert.equal(g.targets.length,count);
  assert(g.targets.some(t=>C.key(t.move)===C.key(opening[0])),'short exercises must retain the best move');
 }
});
test('Correct and incorrect answers play their respective moves and clear stale input',()=>{
 const {g}=setup({mode:'swedish'});tickUntil(g,()=>g.phase==='answer');const target=g.targets[1];g.queue.enqueue(target.item.answer);g.queue.enqueue(g.targets[2].item.answer);g.update(.05);
 assert.equal(C.key(g.lastMove),C.key(target.move));assert.equal(g.turns,1);assert.equal(g.hits,1);assert.equal(g.queue.length,0);assert.equal(g.getTargets().length,0);assert.equal(g.canAnswer(),false);
 g.queue.enqueue('stale');tickUntil(g,()=>g.phase==='answer');assert.equal(g.history.length,2);assert.equal(g.turns,1);assert.equal(g.queue.length,0);
 const cutoff=[...g.ranked].sort((a,b)=>a.value-b.value)[Math.ceil(g.ranked.length/3)-1].value;
 const movePoints=g.movePoints;g.queue.enqueue('incorrect');g.update(.05);assert(g.ranked.find(m=>C.key(m)===C.key(g.lastMove)).value<=cutoff);assert.equal(g.turns,2);assert.equal(g.hits,1);assert.equal(g.scoreParts.result,0);assert.equal(g.scoreParts.efficiency,0);assert.equal(g.movePoints,movePoints-10);assert(g.score>=0);
});
test('No answer deadline, pause/resume, wrong Chinese, forced move and separate match/arcade scores',()=>{
 const {g}=setup({mode:'chinese',lang:'zh-TW'});g.offer(g.position.moves({verbose:true}).map(m=>({...m,value:0})));const fen=g.position.fen();g.update(3600);assert.equal(g.position.fen(),fen);assert.equal(g.turns,0);
 g.queue.enqueue('stale');g.pause();const clock=g.clock;g.update(3600);assert.equal(g.clock,clock);assert.equal(g.queue.length,0);g.resume();assert(g.canAnswer());g.queue.enqueue('錯了','speech');g.update(.05);assert.equal(g.turns,1);assert.equal(g.hits,0);
 const one=setup().g;one.position=new C.Chess('8/8/8/8/8/8/r1k5/K7 w - - 0 1');one.beginTurn();tickUntil(one,()=>one.phase==='answer');assert.equal(one.targets.length,1);one.queue.enqueue('wrong');one.update(.05);assert.equal(one.lastMove.to,'a2');tickUntil(one,()=>one.state!=='playing');assert.equal(one.resultScore,.5);assert.equal(one.score,440,'draw plus captured rook minus wrong-answer penalty');
 for(const [fen,score,state] of [
  ['7k/6Q1/6K1/8/8/8/8/8 b - - 0 1',1,'won'],
  ['8/8/8/8/8/6k1/6q1/7K w - - 0 1',0,'lost'],
  ['7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',.5,'draw']
 ]){const {g,events}=setup();g.turns=25;g.position=new C.Chess(fen);g.beginTurn();assert.equal(g.state,state);assert.equal(g.resultScore,score);assert.equal(g.botScore,1-score);assert.equal(g.score,{won:1133,draw:400,lost:0}[state]);g.update(999);g.finish();assert.equal(events.filter(e=>e.type==='end').length,1);}
});
