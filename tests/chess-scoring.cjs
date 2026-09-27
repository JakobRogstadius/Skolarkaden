'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({Event,EventTarget,CustomEvent,console,performance});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','homework','voice','speech','input','game','reversi-engine','reversi','chess-rules','chess-engine','chess-scoring','chess','highscore-policy'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),context);
const SC=context.Starlight,C=SC.ChessEngine,S=SC.ChessScoring,plain=value=>JSON.parse(JSON.stringify(value));
function test(name,fn){fn();console.log('PASS '+name);}
function setup(fen){const g=new SC.ChessGame({random:()=>.31});g.start({mode:'swedish'});if(fen)g.position=new C.Chess(fen);g.search=null;return g;}
test('Score components reward the result, material, ranked choices and fewer own moves',()=>{
 const input={won:true,turns:20,capturedMaterial:15,lostMaterial:5,movePoints:75};
 assert.deepEqual(plain(S.calculate(input)),{result:1000,captures:150,losses:-50,quality:75,efficiency:150,total:1325});
 for(const [turns,bonus] of [[10,200],[20,150],[40,100],[80,60],[160,33]])assert.equal(S.calculate({won:true,turns}).efficiency,bonus);
 assert.equal(S.calculate({draw:true,turns:1}).efficiency,0);assert.equal(S.calculate({turns:1}).efficiency,0);
 assert.deepEqual(plain(S.calculate({...input,hits:999,shots:999,streak:999,pace:'brave',elapsed:999999,clock:999999})),plain(S.calculate(input)),'no extra answer-count, streak, difficulty or time points');
 assert.equal(S.calculate().total,0,'there is no initial quality reserve');
});
test('Piece values stay symmetric and wrong-answer debt survives the total-score floor',()=>{
 assert.deepEqual(plain(S.pieceValues),{p:1,n:3,b:3,r:5,q:9,k:0});
 for(const value of Object.values(S.pieceValues)){
  assert.equal(S.calculate({movePoints:100,capturedMaterial:value}).total,100+10*value);
  assert.equal(S.calculate({movePoints:100,lostMaterial:value}).total,100-10*value);
  assert.equal(S.calculate({movePoints:100,capturedMaterial:value,lostMaterial:value}).total,100);
 }
 assert.equal(S.calculate({capturedMaterial:103}).captures,1030);assert.equal(S.calculate({capturedMaterial:999}).captures,1030);
 assert.equal(S.calculate({movePoints:-20}).quality,-20);assert.equal(S.calculate({movePoints:-20}).total,0);
 assert.equal(S.calculate({movePoints:-10}).total,0);assert.equal(S.calculate({movePoints:0}).total,0);assert.equal(S.calculate({movePoints:10}).total,10);
 assert(S.summary(S.calculate({movePoints:-10})).includes('Dragkvalitet −10'));
});
test('Long matches can exceed the previous cap and retain result and efficiency bonuses',()=>{
 for(const outcome of ['win','draw','loss'])for(const capturedMaterial of [0,39,103])for(const lostMaterial of [0,39,103])for(const turns of [2,20,200,10000])for(const movePoints of [-10*turns,0,5*turns,10*turns]){
  const score=S.calculate({won:outcome==='win',draw:outcome==='draw',capturedMaterial,lostMaterial,movePoints,turns}).total;
  assert(Number.isInteger(score)&&score>=0&&score<=S.maxScore);
 }
 const game={turns:20,capturedMaterial:15,lostMaterial:5,movePoints:75};
 assert.equal(S.calculate({...game,won:true}).total-S.calculate(game).total,1150);
 assert.equal(S.calculate({...game,draw:true}).total-S.calculate(game).total,400);
 assert(S.calculate({won:true,turns:500,movePoints:5000}).total>2430);
 assert.equal(S.calculate({movePoints:S.maxScore+10}).total,S.maxScore);
 assert.equal(S.maxScore,context.SkolarkadenHighscorePolicy.scoreCaps.chess);
 assert.equal(context.SkolarkadenHighscorePolicy.versions.chess,'v3');
});
test('Awards use the three offered ranks, share tied ranks and penalise any wrong answer',()=>{
 const offered=[200,180,0].map((value,i)=>({from:'a2',to:'abc'[i]+'3',value}));
 assert.deepEqual(offered.map(move=>S.choicePoints(offered,move,true)),[10,5,0]);
 assert.deepEqual(offered.map(move=>S.choicePoints([...offered].reverse(),move,true)),[10,5,0],'screen order cannot affect the award');
 for(const move of offered)assert.equal(S.choicePoints(offered,move,false),-10);
 assert.equal(S.choicePoints([offered[2]],offered[2],true),10,'a forced correct move is best');
 assert.equal(S.choicePoints([offered[2]],offered[2],false),-10,'a forced move does not waive the wrong-answer penalty');
 for(const [values,awards] of [[[0,0,0],[10,10,10]],[[0,0,-20],[10,10,0]],[[0,-20,-20],[10,5,5]],[[99999,99997,0],[10,5,0]]]){
  const tied=offered.map((m,i)=>({...m,value:values[i]}));assert.deepEqual(tied.map(m=>S.choicePoints(tied,m,true)),awards);
 }
});
test('Actual answer input awards 10/5/0 or -10 once, with no points for the opponent',()=>{
 for(const [rank,points] of [[0,10],[1,5],[2,0],[-1,-10]]){
  const g=setup(),ranked=g.position.moves({verbose:true}).map((m,i)=>({...m,value:-i*100}));g.offer(ranked);
  const offered=[...g.targets].sort((a,b)=>b.move.value-a.move.value),target=offered[Math.max(0,rank)];
  assert(ranked.findIndex(m=>C.key(m)===C.key(offered[1].move))>1,'second offered choice can rank below second globally');
  g.movePoints=30;g.updateScore();const before=g.score;
  g.queue.enqueue(rank<0?'incorrect':target.item.answer);g.queue.enqueue('stale');g.update(.05);
  assert.equal(g.movePoints,30+points);assert.equal(g.score,before+points);assert.equal(g.lastMove.movePoints,points);assert.equal(g.turns,1);assert.equal(g.queue.length,0);
  if(rank>=0)assert.equal(C.key(g.lastMove),C.key(target.move));
  assert(g.message.includes((points<0?'−':points>0?'+':'')+Math.abs(points)+' dragpoäng'));
  const score=g.score;g.pause();g.update(3600);g.resume();assert.equal(g.score,score);
  g.play(g.position.moves({verbose:true}).find(m=>!m.captured));assert.equal(g.movePoints,30+points);assert.equal(g.lastMove.movePoints,0);
 }
});
test('Actual captures, lost pieces, en passant and promotion add to the choice points',()=>{
 const fen='4k3/8/8/1b6/8/8/4q3/3QK3 w - - 0 1',a=setup(fen),b=setup(fen);
 const move={from:'d1',to:'e2'},ranked=[{...move,value:0},{from:'e1',to:'e2',value:100}];
 a.offer(ranked);b.offer(ranked);a.play(move,{text:'correct'},true);b.play(move,{text:'wrong'},false);
 assert.equal(a.hits,1);assert.equal(b.hits,0);assert.equal(a.movePoints,5);assert.equal(b.movePoints,-10);
 assert.equal(a.score,95);assert.equal(b.score,80);assert.equal(a.capturedMaterial,9);assert.equal(a.scoreParts.captures,90);
 a.play({from:'b5',to:'e2'});assert.equal(a.lostMaterial,9);assert.equal(a.scoreParts.losses,-90);assert.equal(a.movePoints,5);assert.equal(a.score,5);
 const ep=setup('k7/8/8/3pP3/8/8/8/4K3 w - d6 0 1'),epMove={from:'e5',to:'d6',value:0};ep.offer([epMove]);ep.play(epMove,{text:'correct'},true);
 assert.equal(ep.capturedMaterial,1);assert.equal(ep.score,20);
 const promotion=setup('6kr/6P1/8/8/8/8/8/4K3 w - - 0 1'),promotionMove={from:'g7',to:'h8',promotion:'q',value:0};promotion.offer([promotionMove]);promotion.play(promotionMove,{text:'correct'},true);
 assert.equal(promotion.capturedMaterial,5);assert.equal(promotion.score,60);promotion.play({from:'g8',to:'h8'});
 assert.equal(promotion.lostMaterial,9,'a promoted queen is worth a queen');assert.equal(promotion.score,0);assert.equal(promotion.movePoints,10);
 a.start();assert.equal(a.score,0);assert.equal(a.capturedMaterial,0);assert.equal(a.lostMaterial,0);assert.equal(a.movePoints,0);
});
