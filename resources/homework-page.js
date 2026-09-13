(function(root){'use strict';
const SC=root.Starlight,$=id=>document.getElementById(id),counts=new Map();
const element=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
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
  for(const item of lesson.items){const row=element('tr');for(const text of [item.label,item.hint,item.translation])row.append(element('td',text));row.children[0].lang=lesson.lang;body.append(row);}
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
