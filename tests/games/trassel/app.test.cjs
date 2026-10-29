'use strict';
const assert=require('node:assert/strict');
const {boot,settle}=require('../../helpers/homework-app.cjs');
(async()=>{
  const trassel=boot();await settle();trassel.radios.find(r=>r.value==='trassel').dispatchEvent(new Event('change'));trassel.click('start');await settle();
  while(trassel.game.phase!=='ready')trassel.game.update(.01);
  assert(trassel.fields.answer.disabled&&trassel.fields['input-dock'].hidden);assert.equal(trassel.selection.input,'click');assert.equal(trassel.captures.at(-1).enabled,false);
  trassel.game.update(15);
  for(const path of trassel.game.solution){trassel.game.begin(path[0]);for(const id of path.slice(1))trassel.game.move(id);trassel.game.release();}
  trassel.game.update(1);await settle();assert.equal(trassel.fields['result-title'].textContent,'Trasslet är löst!');assert.equal(trassel.fields['trassel-result-breakdown'].hidden,false);
  assert.match(trassel.fields['trassel-result-breakdown'].textContent,/Tid .*Utrymme .*Rätt svar .*Ledtrådar/);
  const trasselScore=trassel.game.score;trassel.click('again');await settle();await settle();assert.equal(trassel.posts[0].leaderboard_key,'v1:trassel:math-addition:gentle');assert.equal(trassel.posts[0].score,trasselScore);assert.equal(trassel.posts[0].settings.input_mode,'click');
  console.log('PASS Trassel app: click-only input, complete board, score breakdown, submission and replay');
})().catch(error=>{console.error(error);process.exitCode=1;});
