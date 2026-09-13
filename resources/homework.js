/* URL-selected homework. Edit the single homework.json dictionary, without a build step. */
(function(root){'use strict';const SC=root.Starlight;
const languages=['sv-SE','en-US','zh-TW','zh-CN'];
const base={name:'Läxa',hidden:true,items:[],lang:'sv-SE',description:'Träna uppgifterna i din läxa.',icon:'Aa',color:'#c4afff',placeholder:'Skriv svaret…'};
SC.modes.homework={...base};
SC.parseHomework=function(dictionary,id){
  if(typeof id!=='string'||!id.trim()||id.length>128)throw new Error('Länken saknar ett giltigt läx-id.');
  if(!dictionary||typeof dictionary!=='object'||Array.isArray(dictionary))throw new Error('Läxfilen har ett ogiltigt format.');
  if(!Object.hasOwn(dictionary,id))throw new Error('Läxan ”'+id+'” finns inte. Kontrollera länken.');
  const homework=dictionary[id],invalid=detail=>{throw new Error('Läxan ”'+id+'”: '+detail);};
  if(!homework||typeof homework!=='object'||Array.isArray(homework))invalid('förväntade ett objekt.');
  if(!['keyboard','voice'].includes(homework.input))invalid('input måste vara keyboard eller voice.');
  if(!languages.includes(homework.language))invalid('language måste vara sv-SE, en-US, zh-TW eller zh-CN.');
  if(!Array.isArray(homework.words)||!homework.words.length)invalid('words måste innehålla minst en uppgift.');
  const chinese=homework.language.startsWith('zh-');
  const items=homework.words.map((row,index)=>{
    const fail=message=>invalid('uppgift '+(index+1)+' '+message);
    if(!Array.isArray(row)||row.length<1||row.length>3||typeof row[0]!=='string'||!row[0].trim())fail('ska vara [text, uttal, översättning] med en text.');
    for(const hint of row.slice(1))if(hint!==null&&(typeof hint!=='string'||!hint.trim()))fail('har en tom eller ogiltig ledtråd. Använd null om den saknas.');
    const label=row[0].normalize('NFC').trim(),hint=row[1]?.normalize('NFC').trim()||'',translation=row[2]?.normalize('NFC').trim()||'';
    if(chinese&&!SC.tonelessPinyin(hint))fail('behöver ett giltigt uttal i pinyin.');
    return {id:label,label,answer:label,speak:label,hint,translation,aliases:[]};
  });
  return {...base,homeworkId:id,input:homework.input,lang:homework.language,type:chinese?'chinese':'words',items};
};
SC.loadHomework=async function(id){
  if(typeof id!=='string'||!id.trim()||id.length>128)throw new Error('Länken saknar ett giltigt läx-id.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
    let dictionary;
    try{
      const response=await root.fetch('homework.json',{cache:'no-cache',signal:controller.signal});
      if(!response.ok)throw new Error('HTTP '+response.status);
      dictionary=await response.json();
    }catch(_){throw new Error('Läxfilen kunde inte läsas. Kontrollera anslutningen och att homework.json innehåller giltig JSON, och ladda sedan om sidan.');}
    const lesson=SC.parseHomework(dictionary,id);
    SC.modes.homework=lesson;
    // Use the supplied phrase readings for recognized Hanzi as well as pinyin.
    SC.homeworkReadings=Object.fromEntries(lesson.items.filter(()=>lesson.type==='chinese').map(item=>[SC.speechNormalize(item.answer).replace(/[\s\p{P}]/gu,''),item.hint]));
    return lesson;
  }finally{clearTimeout(timeout);}
};
})(globalThis);
