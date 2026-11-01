'use strict';
const assert=require('node:assert/strict');
const {boot,settle}=require('../../helpers/homework-app.cjs');
(async()=>{
  const app=boot('?game=bubblefish');await settle();app.click('start');await settle();
  assert.equal(app.fields['setup-error'].textContent,'');
  assert.equal(app.selection.kind,'bubblefish');assert.equal(app.selection.input,'click');assert.equal(app.captures.at(-1).enabled,false);
  assert(app.fields.answer.disabled&&app.fields['input-dock'].hidden);
  const g=app.game;assert.equal(g.questions.length,3);g.update(3);
  app.click('pause');const life=g.life;g.update(4);assert.equal(g.life,life);app.click('resume');await settle();assert.equal(g.state,'playing');
  g.life=.001;g.update(.1);await settle();assert.equal(app.fields['end-overlay'].hidden,false);assert.equal(app.fields['result-title'].textContent,'Dags att vila fenorna.');
  app.click('again');await settle();await settle();assert.equal(app.posts[0].leaderboard_key,'v1:bubblefish:math-addition:gentle');assert.equal(app.posts[0].settings.input_mode,'click');assert.equal(app.game.life,100);
  const homework=boot('?game=bubblefish&mode=homework&id=zh-001');await settle();homework.click('start');await settle();assert.equal(homework.fields['setup-error'].textContent,'');assert.equal(homework.game.items.length,3);assert.equal(homework.selection.input,'click');
  console.log('PASS Bubbelfisken app: direct control, homework, pause, end, score submission and restart.');
})().catch(e=>{console.error(e);process.exitCode=1;});
