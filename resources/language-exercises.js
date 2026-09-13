/* Compile editable language data to the established game/answer API. */
(function(root){
'use strict';
const SC=root.Starlight;
const word=label=>({id:label,label,answer:label,speak:label,hint:'',aliases:[]});
const mathModes=Object.fromEntries(Object.entries(SC.modes).filter(([,m])=>m.type==='math'));
const dataUrl=root.document?.currentScript?.src?new URL('../language-exercises.json',root.document.currentScript.src).href:'language-exercises.json';
const check=(condition,path)=>{if(!condition)throw new Error('Ogiltig språkdata: '+path);};
const text=value=>typeof value==='string'&&value.trim().length>0;
const texts=value=>Array.isArray(value)&&value.every(text);
const languages=['sv-SE','en-US','zh-TW','zh-CN'];
SC.pairAnswerKey=(value,lang)=>SC.speechNormalize(value).replace(/[‐‑–]/g,'-').replace(lang==='sv-SE'?/^(?:att|en|ett)\s+/:/^(?:to|a|an)\s+/,'');

function pairItems(id,definition){
  const {pairs,translation,language}=definition,langs=translation?definition.languages:[language,language],prompts=new Map();
  check(typeof translation==='boolean',id+'.translation');
  check(Array.isArray(langs)&&langs.length===2&&langs.every(l=>languages.includes(l)),id+'.languages');
  check(Array.isArray(pairs)&&pairs.length>0,id+'.pairs');
  pairs.forEach((row,index)=>{
    check(Array.isArray(row)&&row.length===4&&text(row[0])&&text(row[1])&&texts(row[2])&&texts(row[3]),id+'.pairs['+index+']');
    const [left,right,alternativesLeft,alternativesRight]=row,sides=[[left,...alternativesLeft],[right,...alternativesRight]];
    sides.forEach((words,direction)=>{
      const label=words[0],answerLang=langs[1-direction],key=answerLang+':'+SC.normalize(label),pairId=id+':'+index;
      const answers=sides[1-direction].filter(a=>translation||SC.pairAnswerKey(a,answerLang)!==SC.pairAnswerKey(label,answerLang));
      check(answers.length>0,id+'.pairs['+index+'] answers');
      const item=prompts.get(key)||{id:id+':'+index+':'+direction,pairId,pairIds:[],label,answer:answers[0],aliases:[],speak:answers[0],hint:answers[0],answerLang};
      // Identical prompts accept every direct answer, regardless of pair ID.
      item.pairIds.push(pairId);item.aliases=[...new Set([...item.aliases,...answers])].filter(a=>a!==item.answer);
      item.answerKeys=[item.answer,...item.aliases].map(a=>SC.pairAnswerKey(a,answerLang));prompts.set(key,item);
    });
  });
  return [...prompts.values()];
}

SC.compileLanguageExercises=function(data){
  check(data&&data.version===1,'version');
  check(Array.isArray(data.mandarinLevels)&&data.mandarinLevels.length>0,'mandarinLevels');
  data.mandarinLevels.forEach((rows,level)=>{
    check(Array.isArray(rows)&&rows.length>0,'mandarinLevels['+level+']');
    rows.forEach((row,i)=>check(texts(row)&&row.length===4,'mandarinLevels['+level+']['+i+']'));
  });
  check(data.exercises&&typeof data.exercises==='object'&&!Array.isArray(data.exercises),'exercises');
  const modes={},wordPairs={};let bopomofoKeys,letterKeyboardRows;
  for(const [id,d] of Object.entries(data.exercises)){
    check(/^[a-zA-Z][a-zA-Z0-9-]*$/.test(id)&&!['__proto__','constructor','prototype'].includes(id)&&!id.startsWith('math-'),'exercise ID '+id);
    check(d&&text(d.name)&&languages.includes(d.language)&&text(d.description)&&text(d.icon)&&text(d.placeholder),id+' metadata');
    let items;
    if(d.type==='words'){
      check(texts(d.words)&&d.words.length>0,id+'.words');items=d.words.map(word);
    }else if(d.type==='bopomofo'){
      check(id==='bopomofo'&&Array.isArray(d.keys)&&d.keys.length>0,id+'.keys');
      check(d.keys.every(row=>texts(row)&&row.length===2&&row.every(s=>Array.from(s).length===1)),id+'.keys');
      check(new Set(d.keys.map(row=>row[0])).size===d.keys.length,id+'.keys duplicates');
      bopomofoKeys=Object.fromEntries(d.keys);
      items=Object.entries(bopomofoKeys).map(([key,label])=>({...word(label),key,hint:'Tangent '+key.toUpperCase()}));
    }else if(d.type==='chinese'){
      check(['traditional','simplified'].includes(d.script),id+'.script');
      check(Number.isInteger(d.level)&&d.level>=1&&d.level<=data.mandarinLevels.length,id+'.level');
      items=data.mandarinLevels.slice(0,d.level).flat().map(pair=>{
        const label=pair[d.script==='traditional'?0:1],hint=pair[2],numbered=hint.split(' ').map(SC.tonelessPinyinNumber),plain=numbered.map(s=>s.slice(0,-1));
        return {...word(label),hint,translation:pair[3],aliases:[...new Set([hint,hint.replace(/ /g,''),plain.join(' '),plain.join(''),numbered.join(' '),numbered.join('')])]};
      });
    }else if(d.type==='word-pairs'){
      items=pairItems(id,d);wordPairs[id]=d.pairs;
    }else check(false,id+'.type');
    const mode=modes[id]={name:d.name,lang:d.language,items,description:d.description,icon:d.icon,color:'#c4afff',placeholder:d.placeholder};
    if(d.type==='chinese')mode.type='chinese';
    if(d.type==='word-pairs'){mode.type='word-pairs';mode.translation=d.translation;}
    if(id==='letters'){
      check(d.type==='words'&&d.keyboardRows&&['sv','default'].every(key=>texts(d.keyboardRows[key])&&d.keyboardRows[key].length===3),id+'.keyboardRows');
      letterKeyboardRows=d.keyboardRows;
    }
  }
  check(modes.swedish&&letterKeyboardRows&&bopomofoKeys,'required exercises: swedish, letters, bopomofo');
  // Publish only after every definition is valid; preserve generated mathematics.
  const mandarinCompoundHints=Object.fromEntries(data.mandarinLevels.slice(2).flat().flatMap(([trad,simpl,hint])=>[[trad,hint],[simpl,hint]]));
  return {modes:{...modes,...mathModes},wordPairs,bopomofoKeys,letterKeyboardRows,mandarinCompoundHints};
};
SC.applyLanguageExercises=data=>Object.assign(SC,SC.compileLanguageExercises(data));
SC.loadLanguageExercises=async function(fetcher=root.fetch){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetcher(dataUrl,{cache:'no-cache',signal:controller.signal});
    if(!response.ok)throw new Error('Språkdata kunde inte hämtas (HTTP '+response.status+').');
    SC.applyLanguageExercises(await response.json());
  }finally{clearTimeout(timeout);}
};
// file:// cannot fetch JSON. This generated copy is also the network fallback.
SC.applyLanguageExercises(SC.languageExerciseData);
delete SC.languageExerciseData;
})(globalThis);
