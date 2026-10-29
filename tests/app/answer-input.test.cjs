'use strict';
const assert=require('node:assert/strict');
const {boot}=require('../helpers/app.cjs');
(async()=>{
 const app=boot();await app.appReady;
 const {elements,radios,document,context,scripts,html,storage,recognitions,frame,click,settle,start}=app,SC=context.Starlight;
 for(const source of ['typing','browser'])for(const [lesson,label,answer] of [
 ['swedish-synonyms','börja','sätta igång'],['english-synonyms','furious','mad'],
 ['translation-sv-en-1','penna','pen'],['translation-sv-en-3','låna ut','loan'],
 ['chineseSimpl4','牛奶','mjölk'],['chinese','水','SHUI3']
 ]){
  elements['input-kind'].value=source;await start('dinosaur',lesson);app.currentGame.spawnIn=10000;app.currentGame.walkSpeed=0;app.currentGame.runSpeed=0;
  const target=app.currentGame.getTargets()[0];target.item={...SC.modes[lesson].items.find(i=>i.label===label)};target.item.label=target.item.label.toUpperCase();assert.notEqual(answer,target.item.answer);
  const submit=text=>{if(source==='typing'){elements.answer.value=text;elements['answer-form'].dispatchEvent(new Event('submit',{cancelable:true}));}else recognitions.at(-1).onresult({results:[Object.assign([{transcript:text,confidence:.9}],{isFinal:true})],resultIndex:0});};
  submit(answer);assert.equal(app.currentGame.queue.length,1,source+' '+label+' → '+answer);frame();assert.equal(app.currentGame.job?.target,target);
  for(let i=0;i<500&&!app.currentGame.hits;i++)frame();assert.equal(app.currentGame.hits,1);assert(app.currentGame.score>0);click('pause-menu');
 }
 elements['input-kind'].value='typing';console.log('PASS alternative answers through the actual typing/speech input, queue, game action and scoring.');
 elements['exercise-group'].value='translation';elements['exercise-group'].dispatchEvent(new Event('change'));
 elements.lesson.value='translation-sv-en-2';elements.lesson.dispatchEvent(new Event('change'));
 assert(!elements.language.disabled);await start('city','translation-sv-en-2',{language:'sv-SE'});
 assert.equal(app.getGame('city').lang,'sv-SE');click('pause-menu');
 elements['input-kind'].value='browser';await start('city','translation-sv-en-2',{language:'en-US'});
 assert.equal(recognitions.at(-1).lang,'en-US');click('pause-menu');

 console.log('PASS app/answer-input.test.cjs');
})().catch(error=>{console.error(error);process.exitCode=1;});
