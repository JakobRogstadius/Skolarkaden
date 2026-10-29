'use strict';
const assert=require('node:assert/strict');
const {boot,settle,dictionary}=require('../../helpers/homework-app.cjs');
const {games}=require('../../helpers/runtime.cjs');
(async()=>{
  const reversi=boot();await settle();reversi.radios.find(r=>r.value==='reversi').dispatchEvent(new Event('change'));reversi.click('start');await settle();
  assert.equal(reversi.fields.answer.disabled,true,'thinking disables input');
  const ready=()=>{for(let i=0;i<10000&&reversi.game.phase!=='answer'&&reversi.game.state==='playing';i++)reversi.game.update(.05);};
  ready();assert.equal(reversi.fields.answer.disabled,false);assert.equal(reversi.captures.at(-1).turnBased,true);
  const move=reversi.game.targets[1];reversi.fields.answer.value=move.item.answer;reversi.fields['answer-form'].dispatchEvent(new Event('submit',{cancelable:true}));reversi.game.update(.05);
  assert.equal(reversi.game.lastMove.index,move.move.index);assert.equal(reversi.fields.answer.disabled,true);assert.equal(reversi.fields.answer.value,'');
  ready();reversi.click('pause');assert(reversi.fields.answer.disabled);reversi.click('resume');await settle();assert.equal(reversi.fields.answer.disabled,false);
  reversi.game.board=new Int8Array(64).fill(1);reversi.game.beginTurn(1);await settle();
  assert.equal(reversi.fields['result-title'].textContent,'Du vann! 64–0');assert.equal(reversi.fields['end-overlay'].hidden,false);
  reversi.click('again');await settle();await settle();assert.equal(reversi.posts[0].leaderboard_key,'v1:reversi:math-addition:gentle');assert.equal(reversi.posts[0].score,64);
  assert.equal(reversi.game.score,2);assert.equal(reversi.game.turns,0);
  console.log('PASS Reversi app: menu, turn input, pause/resume, final score submission and restart.');

})().catch(error=>{console.error(error);process.exitCode=1;});
