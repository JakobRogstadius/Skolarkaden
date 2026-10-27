'use strict';
const assert=require('node:assert/strict');
const {boot,settle,dictionary}=require('../helpers/homework-app.cjs');
const {games}=require('../helpers/runtime.cjs');
(async()=>{
  const normal=boot();await settle();assert.equal(normal.fields.lesson.value,'math-addition');normal.radios[0].dispatchEvent(new Event('change'));assert(!normal.requests.includes('homework.json'));assert(!normal.fields.lesson.options.some(o=>o.value==='homework'));assert(!normal.fields.lesson.disabled);assert(!normal.fields['input-kind'].disabled);
  let resolve;const app=boot('?mode=homework&id=sv-001&input=keyboard&language=zh-CN&words=wrong',()=>new Promise(done=>resolve=done));
  assert(app.fields.start.disabled);app.click('start');await settle();assert.equal(app.game,undefined,'loading cannot launch a default exercise');
  resolve(Response.json({...dictionary,'sv-001':{...dictionary['sv-001'],input:'voice'}}));await settle();assert(!app.fields.start.disabled);
  for(const id of ['exercise-group','lesson','input-kind','language'])assert(app.fields[id].disabled,id+' must be locked');
  assert.equal(app.fields['input-kind'].value,'typing');assert.equal(app.fields.language.value,'sv-SE');assert.equal(app.fields.lesson.value,'homework');
  assert.deepEqual(app.fields.lesson.options.map(o=>o.value),['homework']);assert.equal(app.fields['homework-info'].textContent,'Läxa · sv-001');
  for(const radio of app.radios.filter(r=>games([r.value]).length&&r.value!=='studio')){
    radio.dispatchEvent(new Event('change'));app.fields.pace.value='brave';app.click('start');await settle();
    assert.equal(app.fields['setup-error'].textContent,'');assert.equal(app.game.mode,'homework');assert.equal(app.game.lang,'sv-SE');assert.equal(app.game.pace,'brave');
    assert.deepEqual(Array.from(app.game.items,i=>i.answer),['hej','hopp','tekopp']);assert.equal(app.captures.at(-1).enabled,false);
    assert.equal(app.selection.homeworkId,'sv-001');assert.equal(app.selection.mode,'homework');
    app.click('pause');app.click('pause-menu');assert(app.fields.lesson.disabled);assert(app.fields['input-kind'].disabled);assert(app.fields.language.disabled);
  }
  app.radios.find(r=>r.value==='city').dispatchEvent(new Event('change'));app.click('start');await settle();app.game.finish(true);await settle();
  assert.equal(app.fields['result-context'].textContent,'Läxa · Svår');assert(app.fields['end-scores-list'].children.some(row=>row.children.some(c=>c.textContent==='Läxa')));
  app.click('again');await settle();await settle();assert.equal(app.game.state,'playing');assert.equal(app.game.mode,'homework');
  assert.equal(app.posts.length,1);assert.equal(app.posts[0].leaderboard_key,'v2:city:homework:brave');assert.equal(app.posts[0].settings.homework_id,'sv-001');assert.equal(app.posts[0].settings.input_mode,'keyboard');
  const voice=boot('?mode=homework&id=zh-001');await settle();assert.equal(voice.fields.language.value,'zh-TW');assert.equal(voice.fields['input-kind'].value,'browser');assert(voice.fields.language.disabled);assert.equal(voice.ctx.Starlight.modes.homework.items[2].hint,'wǒ xǐhuān hē chá');
  const voiceOverride=boot('?mode=homework&id=sv-001&input=voice');await settle();assert.equal(voiceOverride.fields['input-kind'].value,'browser');assert(voiceOverride.fields['input-kind'].disabled);assert.equal(voiceOverride.ctx.Starlight.modes.homework.input,'voice');
  const keyboardDefault=boot('?mode=homework&id=sv-001');await settle();assert.equal(keyboardDefault.fields['input-kind'].value,'typing');
  for(const search of ['?mode=homework','?mode=homework&id=missing','?mode=homework&id=sv-001&input=invalid','?mode=homework&id=sv-001&input=']){const broken=boot(search);await settle();assert(broken.fields.start.disabled);assert(broken.fields['setup-error'].textContent);broken.click('start');await settle();assert.equal(broken.game,undefined);}
  for(const response of [()=>new Response('{'),()=>{throw Error('offline');},()=>Response.json({'sv-001':{input:'keyboard',language:'sv-SE',words:[]}})]){
    const broken=boot('?mode=homework&id=sv-001',async()=>response());await settle();assert(broken.fields.start.disabled);assert(broken.fields['setup-error'].textContent);assert.equal(broken.game,undefined);
  }
  console.log('PASS homework UI: URL loading, normal menu, errors, locked selections, all game choices, pause/menu/replay and highscore submission.');

})().catch(error=>{console.error(error);process.exitCode=1;});
