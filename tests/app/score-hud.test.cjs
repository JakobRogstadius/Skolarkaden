'use strict';
const assert=require('node:assert/strict');
const {boot,settle,dictionary}=require('../helpers/homework-app.cjs');
const {games}=require('../helpers/runtime.cjs');
(async()=>{
  let top=1234,fail=false,pending=null;
  const hud=boot('',undefined,async url=>{
    if(pending)return new Promise(resolve=>pending.push(resolve));
    if(fail)throw Error('offline');
    const board=new URL(url).searchParams.get('leaderboard').split(':').slice(0,2).join(':');
    return Response.json({leaderboard:board,scores:top===null?[]:[{score:board==='v2:chess'?1234:top}]});
  });
  await settle();
  for(const radio of hud.radios.filter(r=>games([r.value]).length&&r.value!=='studio')){
    radio.dispatchEvent(new Event('change'));hud.click('start');await settle();
    assert.equal(hud.fields['setup-error'].textContent,'');
    assert.equal(hud.fields.best.textContent,'BÄSTA '+(radio.value==='chess'?(1234).toLocaleString('sv-SE'):top.toLocaleString('sv-SE')),radio.value+' shows online record');
    assert.equal(hud.fields.score.textContent,hud.game.score.toLocaleString('sv-SE'));
    assert(hud.requests.at(-1).includes(encodeURIComponent(hud.ctx.SkolarkadenHighscorePolicy.versions[radio.value]+':'+radio.value+':')));
    hud.click('pause');assert.equal(hud.fields['glantan-restart'].hidden,radio.value!=='glantan');hud.click('pause-menu');top++;
  }
  hud.radios[0].dispatchEvent(new Event('change'));
  top=null;hud.click('start');await settle();assert.equal(hud.fields.best.textContent,'BÄSTA 0','empty board');
  hud.click('pause');hud.click('pause-menu');fail=true;hud.click('start');await settle();assert.equal(hud.fields.best.textContent,'BÄSTA —','failure is not zero');
  hud.click('pause');hud.click('pause-menu');fail=false;pending=[];hud.click('start');await settle();assert.equal(hud.fields.best.textContent,'BÄSTA …');
  const old=pending[0];pending=null;top=4321;
  hud.click('pause');hud.click('pause-menu');hud.radios[0].dispatchEvent(new Event('change'));hud.click('start');await settle();
  old(Response.json({scores:[{score:9999}]}));await settle();
  assert.equal(hud.fields.best.textContent,'BÄSTA '+top.toLocaleString('sv-SE'),'late response cannot replace another game record');
  console.log('PASS online top score for all scored games, empty/error/loading states and stale response isolation.');

})().catch(error=>{console.error(error);process.exitCode=1;});
