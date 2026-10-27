'use strict';
const assert=require('node:assert/strict');
const {boot,settle,dictionary}=require('../../helpers/homework-app.cjs');
const {games}=require('../../helpers/runtime.cjs');
(async()=>{
  const chess=boot('',undefined,async url=>Response.json({leaderboard:'v2:chess',scores:[{player_name:'DRAW',score:500,exercise:'swedish',difficulty:'gentle'}],rank:2}));await settle();
  chess.radios.find(r=>r.value==='chess').dispatchEvent(new Event('change'));chess.click('start');await settle();
  assert.equal(chess.fields.answer.disabled,true);assert.equal(chess.captures.at(-1).turnBased,true);assert.equal(chess.fields.best.textContent,'BÄSTA '+(500).toLocaleString('sv-SE'));
  const chessReady=()=>{for(let i=0;i<20000&&chess.game.phase!=='answer'&&chess.game.state==='playing';i++)chess.game.update(.05);};
  chessReady();assert.equal(chess.fields.answer.disabled,false);const proposed=chess.game.targets[1];
  chess.fields.answer.value=proposed.item.answer;chess.fields['answer-form'].dispatchEvent(new Event('submit',{cancelable:true}));chess.game.update(.05);
  assert.equal(chess.game.lastMove.from,proposed.move.from);assert.equal(chess.game.lastMove.to,proposed.move.to);assert(chess.fields.answer.disabled);assert.equal(chess.fields.answer.value,'');
  chessReady();chess.click('pause');assert(chess.fields.answer.disabled);chess.click('resume');await settle();assert.equal(chess.fields.answer.disabled,false);
  chess.game.position=new chess.ctx.Starlight.ChessEngine.Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');chess.game.beginTurn();await settle();
  assert.equal(chess.fields['result-title'].textContent,'Remi! ½–½ · Patt');assert.equal(chess.fields['end-overlay'].hidden,false);
  const chessScore=chess.game.score;assert(chessScore>=0&&chessScore<=1530);
  assert(chess.fields['end-scores-list'].children.some(row=>row.children.some(cell=>cell.className==='board-points'&&cell.textContent===String(chessScore))));assert.equal(chess.fields['chess-result-breakdown'].hidden,false);assert.match(chess.fields['chess-result-breakdown'].textContent,/Dragkvalitet/);
  chess.click('again');await settle();await settle();assert.equal(chess.posts[0].leaderboard_key,'v2:chess:math-addition:gentle');assert.equal(chess.posts[0].score,chessScore,'arcade score is stored without rescaling');
  assert.equal(chess.game.turns,0);assert.equal(chess.game.position.history().length,0);
  chess.fields.lesson.value='chinese';chess.click('pause');chess.click('pause-menu');chess.click('start');await settle();chessReady();
  chess.game.queue.enqueue('錯了','speech');chess.game.update(.05);assert.equal(chess.game.turns,1,'incorrect Chinese speech must reach the poor-move rule');assert.equal(chess.game.hits,0);
  console.log('PASS Chess app: turn input, chosen move, pause/resume, draw display, arcade-point submission, replay and wrong Chinese speech');

})().catch(error=>{console.error(error);process.exitCode=1;});
