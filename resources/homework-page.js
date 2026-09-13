(function(root){'use strict';
const SC=root.Starlight,$=id=>document.getElementById(id),counts=new Map();
const element=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
function speakerButton(item,lesson){
  const button=element('button',undefined,'speak-word'),synth=root.speechSynthesis;
  button.type='button';button.lang='sv';button.title='Lyssna';button.setAttribute('aria-label','Lyssna på '+item.label);
  const icon=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');
  icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');
  path.setAttribute('d','M11 5 6 9H3v6h3l5 4V5Z M15 8a6 6 0 0 1 0 8 M18 5a10 10 0 0 1 0 14');icon.append(path);button.append(icon);
  button.disabled=!synth||!root.SpeechSynthesisUtterance;
  if(button.disabled)button.title='Webbläsaren saknar stöd för uppläsning.';
  button.addEventListener('click',()=>{
    const utterance=new root.SpeechSynthesisUtterance(item.label);utterance.lang=lesson.lang;
    const voices=synth.getVoices(),language=lesson.lang.toLowerCase();
    const voice=voices.find(v=>v.lang.replace('_','-').toLowerCase()===language)||
      (language.startsWith('zh-')?voices.find(v=>/^zh[-_](cn|tw)$/i.test(v.lang)):null);
    if(voice)utterance.voice=voice;
    button.title='Lyssna';utterance.onerror=event=>{if(!['canceled','interrupted'].includes(event.error))button.title='Uttalet kunde inte spelas upp.';};
    synth.cancel();synth.speak(utterance);
  });
  return button;
}
root.addEventListener('pagehide',()=>root.speechSynthesis?.cancel());
function renderLesson(lesson){
  const details=element('details'),summary=element('summary'),name=element('span',lesson.homeworkName,'lesson-name'),count=element('span','— genomförda','lesson-count');
  counts.set(lesson.homeworkId,count);summary.append(name,count);
  for(const [input,label] of [['keyboard','skriva'],['voice','tala']]){
    const link=element('a',label);link.href='index.html?'+new URLSearchParams({mode:'homework',id:lesson.homeworkId,input});
    link.setAttribute('aria-label',label+' · '+lesson.homeworkName);summary.append(link);
  }
  const scroll=element('div',undefined,'table-scroll'),table=element('table'),head=element('thead'),labels=element('tr'),body=element('tbody');
  table.setAttribute('aria-label',lesson.homeworkName);
  for(const text of ['Ord eller fras','Uttal','Svenska']){const th=element('th',text);th.scope='col';labels.append(th);}
  head.append(labels);
  for(const item of lesson.items){
    const row=element('tr'),word=element('td'),content=element('span',undefined,'spoken-word');word.lang=lesson.lang;
    content.append(speakerButton(item,lesson),element('span',item.label));word.append(content);
    row.append(word,element('td',item.hint),element('td',item.translation));body.append(row);
  }
  table.append(head,body);scroll.append(table);details.append(summary,scroll);return details;
}
async function refreshCounts(){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await root.fetch('https://skolarkaden-api.jakob-rogstadius.workers.dev/stats?group=homework',{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error();const data=await response.json();
    if(data.group!=='homework'||!Array.isArray(data.entries)||data.entries.some(row=>!row||typeof row.id!=='string'||!Number.isSafeInteger(row.completions)||row.completions<0))throw new Error();
    const totals=new Map(data.entries.map(row=>[row.id,row.completions]));
    for(const [id,count] of counts)count.textContent=(totals.get(id)||0).toLocaleString('sv-SE')+' genomförda';
    $('status').textContent='';
  }catch(_){for(const count of counts.values())count.textContent='— genomförda';$('status').textContent='Antalet genomförda läxor kunde inte hämtas.';}
  finally{clearTimeout(timeout);}
}
async function init(){
  try{
    const dictionary=await SC.readHomework();
    if(!dictionary||typeof dictionary!=='object'||Array.isArray(dictionary))throw new Error('Läxfilen har ett ogiltigt format.');
    const lessons=Object.keys(dictionary).map(id=>SC.parseHomework(dictionary,id));
    $('lessons').replaceChildren(...lessons.map(renderLesson));
    if(!lessons.length){$('status').textContent='Det finns inga läxor ännu.';return;}
    await refreshCounts();
    root.addEventListener('pageshow',event=>{if(event.persisted)refreshCounts();});
  }catch(error){$('status').textContent=error.message;}
}
init();
})(globalThis);
