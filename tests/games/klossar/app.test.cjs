'use strict';
const assert=require('node:assert/strict');
const {boot,settle,dictionary}=require('../../helpers/homework-app.cjs');
const {games}=require('../../helpers/runtime.cjs');
(async()=>{
  const voice=boot('?mode=homework&id=zh-001');await settle();
  // Even a voice-only homework URL becomes click-only for Klossar; switching
  // games must restore the original input choice, not overwrite the homework.
  voice.radios.find(r=>r.value==='klossar').dispatchEvent(new Event('change'));
  voice.click('start');await settle();assert.equal(voice.fields['setup-error'].textContent,'');
  assert.equal(voice.game.state,'playing');assert.equal(voice.captures.at(-1).enabled,false);
  assert(voice.fields.answer.disabled);assert(voice.fields['input-dock'].hidden);assert(voice.fields['settings-open'].hidden);
  assert.equal(voice.selection.input,'click');assert.equal(voice.selection.spokenLanguage,null);assert.equal(voice.fields.objective.textContent,'0 / 20 par');
  const elapsed=voice.game.elapsed;voice.click('pause');voice.game.update(20);assert.equal(voice.game.elapsed,elapsed);voice.click('resume');await settle();assert(voice.fields.answer.disabled);
  for(let n=0;n<20;n++){
    const free=voice.game.getAvailableTargets(),a=free.find(a=>free.some(b=>voice.ctx.Starlight.klossarMatches(a,b))),b=free.find(b=>voice.ctx.Starlight.klossarMatches(a,b));
    voice.game.select(a.id);voice.game.select(b.id);voice.game.update(.5);
  }
  voice.game.update(1);await settle();assert.equal(voice.fields['result-title'].textContent,'Alla klossar är borta!');
  voice.click('again');await settle();await settle();assert.equal(voice.game.hits,0);assert.equal(voice.posts.length,1);
  assert.equal(voice.posts[0].leaderboard_key,'v1:klossar:homework:gentle');assert.equal(voice.posts[0].settings.input_mode,'click');
  assert.equal(voice.posts[0].settings.spoken_language,null);assert.equal(voice.posts[0].settings.homework_id,'zh-001');
  voice.click('pause');voice.click('pause-menu');voice.radios.find(r=>r.value==='city').dispatchEvent(new Event('change'));
  assert.equal(voice.fields['input-kind'].value,'browser');assert(!voice.fields['settings-open'].hidden);
  console.log('PASS Klossar click-only voice homework, disabled text/microphone, pause/resume, full round, score settings, replay and input restoration');
  const utterances=[],pageEvents={};let cancellations=0;
  const pronunciation=boot('',undefined,null,{
    SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
    speechSynthesis:{getVoices:()=>[],speak:u=>utterances.push(u),cancel:()=>cancellations++},
    addEventListener:(type,listener)=>pageEvents[type]=listener
  });
  await settle();pronunciation.radios.find(r=>r.value==='klossar').dispatchEvent(new Event('change'));
  pronunciation.fields.lesson.value='chinese';pronunciation.click('start');await settle();
  pronunciation.fields.sound.querySelector=()=>({textContent:''});
  const reading=pronunciation.game.order[0].map(id=>pronunciation.game.tiles[id]).find(t=>t.side==='problem');
  pronunciation.game.select(reading.id);assert.equal(utterances.length,1);assert.equal(utterances[0].lang,'zh-TW');
  pronunciation.click('sound');assert.equal(cancellations,1,'mute stops the current pronunciation');
  pronunciation.game.select(reading.id);pronunciation.game.select(reading.id);assert.equal(utterances.length,1,'muted selection stays silent');
  pronunciation.click('sound');assert.equal(utterances.length,1,'unmute does not replay a selected tile');
  pronunciation.game.select(reading.id);pronunciation.game.select(reading.id);assert.equal(utterances.length,2);
  pronunciation.click('pause');assert.equal(cancellations,2);pronunciation.click('resume');await settle();assert.equal(utterances.length,2);
  pronunciation.game.select(reading.id);pronunciation.game.select(reading.id);assert.equal(utterances.length,3);
  pronunciation.click('pause-menu');assert.equal(cancellations,3,'leaving the game stops pronunciation');
  pronunciation.click('start');await settle();
  const nextReading=pronunciation.game.order[0].map(id=>pronunciation.game.tiles[id]).find(t=>t.side==='problem');
  pronunciation.game.select(nextReading.id);assert.equal(utterances.length,4);
  pageEvents.pagehide();assert.equal(cancellations,4,'navigation stops pronunciation');
  assert(pronunciation.fields.answer.disabled);assert.equal(pronunciation.captures.at(-1).enabled,false,'output does not activate voice input');
  console.log('PASS Klossar pronunciation app integration: selection, mute/unmute, pause/resume, menu, navigation and no microphone');

})().catch(error=>{console.error(error);process.exitCode=1;});
