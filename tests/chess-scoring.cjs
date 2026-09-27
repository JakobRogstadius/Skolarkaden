'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({Event,EventTarget,CustomEvent,console,performance});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','homework','voice','speech','input','game','reversi-engine','reversi','chess-rules','chess-engine','chess-scoring','chess','highscore-policy'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),context);
const SC=context.Starlight,S=SC.ChessScoring,plain=value=>JSON.parse(JSON.stringify(value));
function test(name,fn){fn();console.log('PASS '+name);}
function setup(fen){const g=new SC.ChessGame();g.start();g.position=new SC.ChessEngine.Chess(fen);g.search=null;return g;}
test('Score components reward the result, material, move quality and fewer own moves',()=>{
 const input={won:true,turns:20,capturedMaterial:15,lostMaterial:5,qualityLoss:1000*Math.log(2)};
 assert.deepEqual(plain(S.calculate(input)),{result:1000,captures:150,losses:-50,quality:50,efficiency:150,total:1300});
 for(const [turns,bonus] of [[10,200],[20,150],[40,100],[80,60],[160,33]])assert.equal(S.calculate({won:true,turns}).efficiency,bonus);
 assert.equal(S.calculate({draw:true,turns:1}).efficiency,0);assert.equal(S.calculate({turns:1}).efficiency,0);
 assert.deepEqual(plain(S.calculate({...input,hits:999,shots:999,streak:999,pace:'brave',elapsed:999999,clock:999999})),plain(S.calculate(input)),'answers, difficulty and wall-clock time do not award points');
});
test('Piece values are symmetric, promoted material is bounded and totals cannot be negative',()=>{
 assert.deepEqual(plain(S.pieceValues),{p:1,n:3,b:3,r:5,q:9,k:0});
 for(const value of Object.values(S.pieceValues)){
  assert.equal(S.calculate({capturedMaterial:value}).total,100+10*value);
  assert.equal(S.calculate({lostMaterial:value}).total,100-10*value);
  assert.equal(S.calculate({capturedMaterial:value,lostMaterial:value}).total,100);
 }
 assert.equal(S.calculate({capturedMaterial:103}).captures,1030);
 assert.equal(S.calculate({capturedMaterial:999}).captures,1030);
 assert.equal(S.calculate({lostMaterial:103,qualityLoss:1000000}).total,0);
});
test('Result bonuses reward winning while stronger material weighting stays within the score cap',()=>{
 for(const outcome of ['win','draw','loss'])for(const capturedMaterial of [0,39,103])for(const lostMaterial of [0,39,103])for(const qualityLoss of [0,100,1000000])for(const turns of [2,20,200,10000]){
  const score=S.calculate({won:outcome==='win',draw:outcome==='draw',capturedMaterial,lostMaterial,qualityLoss,turns}).total;
  assert(Number.isInteger(score)&&score>=0&&score<=S.maxScore);
 }
 const game={turns:20,capturedMaterial:15,lostMaterial:5,qualityLoss:1000*Math.log(2)};
 assert.equal(S.calculate({...game,won:true}).total-S.calculate(game).total,1150);
 assert.equal(S.calculate({...game,draw:true}).total-S.calculate(game).total,400);
 assert(S.calculate({draw:true,capturedMaterial:39}).total>S.calculate({won:true,turns:80,lostMaterial:30}).total,'material differences can outweigh result bonuses across different games');
 assert.equal(S.calculate({won:true,capturedMaterial:103}).total,2430);
 assert.equal(S.maxScore,context.SkolarkadenHighscorePolicy.scoreCaps.chess);
});
test('Quality measures cumulative regret, preserves mate ordering and cannot be farmed with quiet moves',()=>{
 const ranked=[200,180,0].map((value,i)=>({from:'a2',to:'abc'[i]+'3',value}));
 assert.deepEqual(ranked.map(move=>S.moveLoss(ranked,move)),[0,20,200]);
 assert(S.calculate({qualityLoss:20}).quality>S.calculate({qualityLoss:200}).quality);
 assert.equal(S.moveLoss([ranked[2]],ranked[2]),0,'forced moves have no choice penalty');
 assert.equal(S.moveLoss(ranked.map(m=>({...m,value:-500})),ranked[1]),0,'equal evaluations are equal choices');
 let qualityLoss=200;const before=S.calculate({qualityLoss}).quality;
 for(let i=0;i<1000;i++)qualityLoss+=S.moveLoss(ranked,ranked[0]);
 assert.equal(S.calculate({qualityLoss}).quality,before);
 const mates=[{...ranked[0],value:99999},{...ranked[1],value:99997}];
 assert.equal(S.moveLoss(mates,mates[1]),20);assert(S.qualityValue(99999)>S.qualityValue(4000));
 assert(S.qualityValue(-99997)>S.qualityValue(-99999),'delaying forced mate is the better choice');
});
test('Actual captures, lost pieces, en passant and promotion use the played board position',()=>{
 const fen='4k3/8/8/1b6/8/8/4q3/3QK3 w - - 0 1',a=setup(fen),b=setup(fen);
 const move={from:'d1',to:'e2'},ranked=[{...move,value:0},{from:'e1',to:'e2',value:100}];
 a.ranked=b.ranked=ranked;a.play(move,{text:'correct'},true);b.play(move,{text:'wrong'},false);
 assert.equal(a.hits,1);assert.equal(b.hits,0);assert.equal(a.score,b.score,'the same move scores the same regardless of answer correctness');
 assert.equal(a.qualityLoss,100);assert.equal(a.capturedMaterial,9);assert.equal(a.scoreParts.captures,90);
 a.play({from:'b5',to:'e2'});assert.equal(a.lostMaterial,9);assert.equal(a.scoreParts.losses,-90);assert.equal(a.qualityLoss,100,'opponent moves do not change player move quality');
 const ep=setup('k7/8/8/3pP3/8/8/8/4K3 w - d6 0 1');ep.play({from:'e5',to:'d6'});
 assert.equal(ep.capturedMaterial,1);assert.equal(ep.score,110);
 const promotion=setup('6kr/6P1/8/8/8/8/8/4K3 w - - 0 1');promotion.play({from:'g7',to:'h8',promotion:'q'});
 assert.equal(promotion.capturedMaterial,5);promotion.play({from:'g8',to:'h8'});
 assert.equal(promotion.lostMaterial,9,'a promoted queen is worth a queen');assert.equal(promotion.score,60);
 const before=a.score;a.pause();a.update(3600);a.resume();assert.equal(a.score,before);
 a.start();assert.equal(a.score,100);assert.equal(a.capturedMaterial,0);assert.equal(a.lostMaterial,0);assert.equal(a.qualityLoss,0);
});
