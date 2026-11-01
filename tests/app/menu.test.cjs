'use strict';
const assert=require('node:assert/strict');
const {boot}=require('../helpers/app.cjs');
(async()=>{
 const app=boot();await app.appReady;
 const {elements,radios,document,context,scripts,html,storage,recognitions,frame,click,settle,start}=app,SC=context.Starlight;
 assert.equal(radios.length,16);assert.match(html,/<title>Skolarkaden<\/title>/);assert.match(html,/<details id="debug-panel"[^>]*>/);assert.doesNotMatch(html,/<details id="debug-panel"[^>]*\bopen\b/);
 assert.equal(elements.lesson.value,'math-addition');assert.equal(elements['exercise-group'].value,'math');assert.equal(elements.lesson.options.length,9);
 assert.deepEqual(elements['exercise-group'].options.map(o=>o.text),['Matematik','Bokstäver','Svenska','English','Svenska–engelska','Kinesiska']);
 assert.equal(radios.filter(r=>r.checked).length,1,'exactly one random game is selected');
 const selectable=[];
 for(const group of SC.exerciseGroups){elements['exercise-group'].value=group.id;elements['exercise-group'].dispatchEvent(new Event('change'));for(const option of elements.lesson.options){assert.equal(SC.exerciseGroup(option.value),group.id);selectable.push(option.value);}}
 assert.deepEqual(selectable.sort(),Object.keys(SC.modes).filter(id=>!SC.modes[id].hidden).sort());
 elements['exercise-group'].value='translation';elements['exercise-group'].dispatchEvent(new Event('change'));elements.lesson.value='translation-sv-en-8';elements.lesson.dispatchEvent(new Event('change'));
 elements['exercise-group'].value='math';elements['exercise-group'].dispatchEvent(new Event('change'));assert.equal(elements.lesson.value,'math-addition');
 elements['exercise-group'].value='translation';elements['exercise-group'].dispatchEvent(new Event('change'));assert.equal(elements.lesson.value,'translation-sv-en-8','returning to a group retains the chosen level');
 elements['exercise-group'].value='math';elements['exercise-group'].dispatchEvent(new Event('change'));radios.find(r=>r.value==='city').dispatchEvent(new Event('change'));
 assert(html.indexOf('<div class="setup-grid">')<html.indexOf('<fieldset class="game-picker"'));
 assert.deepEqual([...html.match(/<div class="setup-grid">[\s\S]*?<fieldset class="game-picker"/)[0].matchAll(/<select id="([^"]+)"/g)].map(m=>m[1]),['exercise-group','lesson','input-kind','pace','language']);
 assert.deepEqual(elements['input-kind'].options.map(o=>o.value),['typing','browser']);assert.deepEqual(elements.pace.options.map(o=>o.textContent),['Lätt','Medel','Svår']);assert(elements.language.disabled);
 elements['input-kind'].value='browser';elements['input-kind'].dispatchEvent(new Event('change'));assert.equal(elements.language.disabled,false);
 elements['input-kind'].value='typing';elements['input-kind'].dispatchEvent(new Event('change'));assert(elements.language.disabled);
 elements.lesson.value='englishLong';elements.language.value='en-US';radios.find(r=>r.value==='food').dispatchEvent(new Event('change'));assert.equal(elements.lesson.value,'englishLong');assert.equal(elements.language.value,'en-US');elements.lesson.value='math-large-numbers';radios.find(r=>r.value==='city').dispatchEvent(new Event('change'));assert.equal(elements.lesson.value,'math-large-numbers');
assert(scripts.indexOf('resources/dinosaur.js')<scripts.indexOf('resources/app.js'));
 console.log('PASS app/menu.test.cjs');
})().catch(error=>{console.error(error);process.exitCode=1;});
