'use strict';
const assert=require('node:assert/strict');
const {boot,settle,dictionary}=require('../../helpers/homework-app.cjs');
const {games}=require('../../helpers/runtime.cjs');
(async()=>{
  const studio=boot();await settle();studio.radios.find(r=>r.value==='studio').dispatchEvent(new Event('change'));studio.click('start');await settle();
  assert.equal(studio.fields['setup-error'].textContent,'');assert.equal(studio.requests.length,0,'studio never reads scores');assert.equal(studio.selection,undefined,'studio never starts score recording');
  assert(studio.fields.answer.disabled);assert(studio.fields['leaderboard-open'].hidden);assert(studio.fields.pace.closest().hidden);
  studio.game.choose('color',2);assert(!studio.fields.answer.disabled);studio.fields.answer.value=studio.game.targets[0].item.answer;studio.fields['answer-form'].dispatchEvent(new Event('submit',{cancelable:true}));studio.game.update(.05);assert(studio.fields.answer.disabled);assert.equal(studio.game.color,2);
  studio.click('pause');studio.click('resume');await settle();assert(studio.fields.answer.disabled);studio.click('pause');studio.click('pause-menu');assert.equal(studio.posts.length,0);

})().catch(error=>{console.error(error);process.exitCode=1;});
