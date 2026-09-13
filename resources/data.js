(function(root){
  'use strict';
  const SC = root.Starlight = root.Starlight || {};
  SC.normalize = v => String(v ?? '').normalize('NFC').toLowerCase().trim().replace(/[.,!?。，！？]+$/g,'').trim().replace(/\s+/g,' ');
  SC.pinyin = v => SC.normalize(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[1-5]/g,'').replace(/\s/g,'');
  const word = label => ({id:label,label,answer:label,speak:label,hint:'',aliases:[]});
  SC.tonelessPinyinNumber=value=>{
    const marks={'\u0304':1,'\u0301':2,'\u030c':3,'\u0300':4},tone=Array.from(value.normalize('NFD')).find(c=>marks[c]);
    const base=value.normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g,'').normalize('NFC');return base+(tone?marks[tone]:5);
  };
  SC.modes={};
  const lesson=(name,lang,items,description,icon='Aa')=>({name,lang,items,description,icon,color:'#c4afff',placeholder:'Skriv svaret…'});
  // Generator levels are stable; menu numbers can change without moving scores.
  const mathLessons=[
    ['addition',0,'+','Addition med talen 0–10','math'],
    ['addition-subtraction',1,'+ och −','Addition och subtraktion inom 0–20','math2'],
    ['diagrams',6,'enkla diagram','Räkna prickar och läs diagram och tallinjer · svar 1–10'],
    ['simple-equations',7,'enkla ekvationer','Vilket tal gör båda sidor lika? Till exempel 7 + 5 = 10 + ?'],
    ['large-numbers',2,'10–100','Addition och subtraktion med talen 10–100','math3'],
    ['multiplication',3,'×','Multiplikationstabellerna 1–10','math4'],
    ['multiplication-division',4,'× och ÷','Multiplikation och division i tabellerna 1–10','math5'],
    ['equations',5,'ekvationer','Skriv det positiva heltal som x står för','math6']
  ];
  SC.legacyMathIds=Object.freeze(Object.fromEntries(mathLessons.filter(m=>m[4]).map(m=>[m[4],'math-'+m[0]])));
  SC.canonicalLesson=mode=>Object.hasOwn(SC.legacyMathIds,mode)?SC.legacyMathIds[mode]:mode;
  SC.legacyLesson=mode=>Object.keys(SC.legacyMathIds).find(key=>SC.legacyMathIds[key]===mode)||mode;
  mathLessons.forEach(([id,mathLevel,label,description],i)=>{SC.modes['math-'+id]={...lesson(`Matematik ${i+1} (${label})`,'sv-SE',[],description,'±'),type:'math',mathLevel};});
  SC.isMath=mode=>SC.modes[mode]?.type==='math';
  SC.isChinese=mode=>SC.modes[mode]?.type==='chinese';
  SC.isWordPair=mode=>SC.modes[mode]?.type==='word-pairs';
  SC.isTranslation=mode=>!!SC.modes[mode]?.translation;
  SC.mathLevel=mode=>SC.modes[mode].mathLevel;
  SC.toBopomofo=value=>Array.from(value).map(c=>SC.bopomofoKeys[c.toLowerCase()]||c).join('');
  SC.latinMode=mode=>['letters','swedish','swedishLong','english','englishLong'].includes(mode)||SC.isWordPair(mode);
  SC.lessonLabel=(label,mode,uppercase)=>SC.latinMode(mode)?(uppercase?label.toLocaleUpperCase('sv-SE'):label.toLocaleLowerCase('sv-SE')):label;
  // Spoken numbers are aliases; text answers remain decimal integers.
  SC.numberWords = {
    'en-US': {eight:8,eighteen:18,eleven:11,fifteen:15,five:5,four:4,fourteen:14,nine:9,nineteen:19,one:1,seven:7,seventeen:17,six:6,sixteen:16,ten:10,thirteen:13,three:3,twelve:12,twenty:20,two:2,zero:0},
    'sv-SE': {'åtta':8,'arton':18,'elva':11,'ett':1,'en':1,'fem':5,'femton':15,'fjorton':14,'fyra':4,'nio':9,'nitton':19,'noll':0,'sex':6,'sexton':16,'sju':7,'sjutton':17,'tio':10,'tjugo':20,'tolv':12,'tre':3,'tretton':13,'två':2},
    'zh-CN': {'八':8,'十八':18,'十一':11,'十五':15,'五':5,'四':4,'十四':14,'九':9,'十九':19,'一':1,'七':7,'十七':17,'六':6,'十六':16,'十':10,'十三':13,'三':3,'十二':12,'二十':20,'二':2,'两':2,'零':0}
  };
  const englishTens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  const swedishTens=['','','tjugo','trettio','fyrtio','femtio','sextio','sjuttio','åttio','nittio'];
  const originalName=(n,lang)=>Object.keys(SC.numberWords[lang]).find(k=>SC.numberWords[lang][k]===n);
  const englishNumber=n=>n<20?originalName(n,'en-US'):n<100?englishTens[Math.floor(n/10)]+(n%10?' '+englishNumber(n%10):''):englishNumber(Math.floor(n/100))+' hundred'+(n%100?' '+englishNumber(n%100):'');
  const swedishNumber=n=>n<20?originalName(n,'sv-SE'):n<100?swedishTens[Math.floor(n/10)]+(n%10?swedishNumber(n%10):''):(n<200?'':swedishNumber(Math.floor(n/100)))+'hundra'+(n%100?swedishNumber(n%100):'');
  const chineseNumber=n=>n<10?'零一二三四五六七八九'[n]:n<100?(n<20?'':chineseNumber(Math.floor(n/10)))+'十'+(n%10?chineseNumber(n%10):''):chineseNumber(Math.floor(n/100))+'百'+(n%100?(n%100<10?'零':'')+(n%100>=10&&n%100<20?'一':'')+chineseNumber(n%100):'');
  for(let n=21;n<=200;n++){
    const en=englishNumber(n),sv=swedishNumber(n),zh=chineseNumber(n);
    SC.numberWords['en-US'][en]=n;SC.numberWords['en-US'][en.replace(/ /g,'-')]=n;
    if(n>100&&n%100)SC.numberWords['en-US'][en.replace('hundred ','hundred and ')]=n;
    SC.numberWords['sv-SE'][sv]=n;
    SC.numberWords['sv-SE'][sv.replace(/(hundra|tjugo|trettio|fyrtio|femtio|sextio|sjuttio|åttio|nittio)/g,'$1 ').trim()]=n;
    if(n>=100&&n<200){SC.numberWords['sv-SE']['ett'+sv]=n;SC.numberWords['sv-SE']['ett '+sv]=n;SC.numberWords['sv-SE']['ett '+sv.replace(/(hundra|tjugo|trettio|fyrtio|femtio|sextio|sjuttio|åttio|nittio)/g,'$1 ').trim()]=n;}
    SC.numberWords['zh-CN'][zh]=n;
  }
  SC.numberWords['zh-CN']['兩']=2;
  SC.numberWords['zh-TW']=SC.numberWords['zh-CN'];
  SC.numberName = (n,lang) => {
    const words=SC.numberWords[lang]||SC.numberWords['sv-SE'];
    return Object.keys(words).find(k=>words[k]===n)||String(n);
  };
  SC.vocabulary=(mode,lang=SC.modes[mode].lang)=>SC.isMath(mode)?Array.from(SC.mathPool(SC.mathLevel(mode)).keys(),n=>({...word(String(n)),speak:SC.numberName(n,lang),hint:SC.numberName(n,lang)})):SC.isTranslation(mode)?SC.modes[mode].items.filter(item=>item.answerLang===lang):SC.modes[mode].items;
  SC.keyboardRows=lang=>SC.letterKeyboardRows[lang.startsWith('sv')?'sv':'default'];
  SC.letterSubset=function(lang,rng=Math.random){
    const rows=SC.keyboardRows(lang),shape=Math.floor(rng()*3),choices=[];
    if(shape===2)choices.push(...rows);
    else{
      const height=shape===0?3:2,width=shape===0?3:5;
      for(let y=0;y<=rows.length-height;y++)for(let x=0;x<=Math.min(...rows.slice(y,y+height).map(row=>row.length))-width;x++)
        choices.push(rows.slice(y,y+height).map(row=>row.slice(x,x+width)).join(''));
    }
    return Array.from(choices[Math.floor(rng()*choices.length)],word);
  };
  // Speech aliases are explicit homophones, never fuzzy spelling guesses.
  SC.speechGroups={'en-US':[['sea','see','c'],['bee','be','b'],['sun','son'],['blue','blew'],['red','read'],['rain','reign','rein'],['flower','flour'],['eye','i'],['right','write','rite'],['night','knight'],['pair','pear'],['new','knew']]};
  SC.letterNames={
    'sv-SE':{a:'a',be:'b',ce:'c',se:'c',de:'d',e:'e',eff:'f',ge:'g',hå:'h',i:'i',ji:'j',kå:'k',ell:'l',emm:'m',enn:'n',o:'o',pe:'p',ku:'q',ärr:'r',ess:'s',te:'t',u:'u',ve:'v','dubbel ve':'w',dubbelve:'w',ex:'x',y:'y',säta:'z','å':'å','ä':'ä','ö':'ö'},
    'en-US':{ay:'a',bee:'b',be:'b',see:'c',sea:'c',dee:'d',ee:'e',eff:'f',gee:'g',aitch:'h',eye:'i',jay:'j',kay:'k',el:'l',em:'m',en:'n',oh:'o',pea:'p',pee:'p',cue:'q',queue:'q',are:'r',ess:'s',tea:'t',tee:'t',you:'u',vee:'v','double you':'w',doubleyou:'w',ex:'x',why:'y',zed:'z',zee:'z'}
  };
  SC.speechNormalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('sv-SE').trim().replace(/^["“”'‘’«»(\[]+|["“”'‘’«»)\],.!?;:。！？、，]+$/gu,'').trim().replace(/\s+/g,' ');
  SC.tonelessPinyin=function(value){
    // Preserve vowels, but accept spaced/joined syllables and per-syllable tones.
    const v=SC.speechNormalize(value).replace(/u:/g,'ü').replace(/v/g,'ü').normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g,'').normalize('NFC');
    if(!/^[a-züê0-5]+(?:[ '’]+[a-züê0-5]+)*$/.test(v))return null;
    const key=v.replace(/[0-5 '’]/g,'');return /^[a-züê]+$/.test(key)?key:null;
  };
  SC.chineseSpeechPinyin=function(value){
    let v=SC.speechNormalize(value);
    if(/^\d+$/.test(v)){const n=Number(v);if(n>10)return null;v=SC.numberName(n,'zh-CN');}
    // Recognition can mix Hanzi, pinyin and punctuation within one word.
    // Resolve known phrases first (e.g. 家長), then concatenate sound segments.
    v=v.replace(/u:/g,'ü').replace(/v/g,'ü').normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g,'').normalize('NFC');
    const compact=v.replace(/[\s\p{P}]/gu,'');
    const phrase=SC.homeworkReadings?.[compact]||SC.mandarinCompoundHints?.[compact];if(phrase)return SC.tonelessPinyin(phrase);
    if(/[\p{Script=Han}]/u.test(v)){
      const parts=v.match(/\p{Script=Han}|[0-9]+|[a-züê\p{M}]+[0-5]?/gu)||[];
      if(v.replace(/\p{Script=Han}|[0-9]+|[a-züê\p{M}]+[0-5]?|[\s\p{P}]/gu,''))return null;
      const readings=parts.map(part=>SC.mandarinPinyin[part]||(/^\d+$/.test(part)?SC.chineseSpeechPinyin(part):SC.tonelessPinyin(part)));
      return readings.length&&readings.every(Boolean)?readings.join(''):null;
    }
    return SC.tonelessPinyin(v.replace(/[,;.!?，。！？、]+/g,' '));
  };
  // Standalone Zhuyin names, not keyboard keys or arbitrary syllable initials.
  // Mandarin ASR normally returns Hanzi, e.g. 波坡摸佛, rather than ㄅㄆㄇㄈ.
  const bopomofoSounds='bo po mo fo de te ne le ge ke he ji qi xi zhi chi shi ri zi ci si yi wu yu a o e ê ai ei ao ou an en ang eng er'.split(' ');
  const bopomofoSymbols=Array.from('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ');
  const bopomofoNames=Object.fromEntries(bopomofoSounds.map((sound,i)=>[sound,bopomofoSymbols[i]]));
  for(const [i,initial] of 'b p m f d t n l g k h j q x zh ch sh r z c s i u ü'.split(' ').entries())bopomofoNames[initial]=bopomofoSymbols[i];
  // ㄝ has no ordinary standalone word. Also accept the familiar ye sound
  // (也 / 耶) as an explicit speech-service fallback; keep e, ê and ei distinct.
  bopomofoNames.ye='ㄝ';
  const bopomofoReadings={'佛':'fo','勒':'le','樂':'le','乐':'le','嗯':'en'};
  SC.bopomofoSpeechSymbol=function(value){
    const v=SC.speechNormalize(value).replace(/[ˉˊˇˋ˙]/g,'');
    if(bopomofoSymbols.includes(v))return v;
    return bopomofoNames[bopomofoReadings[v]||SC.chineseSpeechPinyin(v)]||null;
  };
  SC.spokenNumber=function(value,lang,source='speech'){
    const v=SC.speechNormalize(value),names=SC.numberWords[lang]||{};
    if(Object.hasOwn(names,v))return names[v];
    if(source==='speech'&&lang==='en-US'){
      const aliases={to:2,too:2,for:4,fore:4,ate:8,won:1,oh:0,o:0};if(Object.hasOwn(aliases,v))return aliases[v];
    }
    // Strict whole-string integer parsing: never parseFloat('2cats') or '-2' as 2.
    if(/^\+?\d+(?:[.,]0+)?$/.test(v)){const n=Number(v.replace(',','.'));return Number.isSafeInteger(n)&&n>=0&&n<=200?n:null;}
    const decimal=v.match(/^(.+) (?:point|komma|punkt) (.+)$/);
    if(decimal&&SC.spokenNumber(decimal[2],lang,source)===0)return SC.spokenNumber(decimal[1],lang,source);
    return null;
  };
  SC.speechIdentity=function(value,mode,lang){
    const v=SC.speechNormalize(value);
    if(SC.isMath(mode)){const n=SC.spokenNumber(v,lang);return n===null?v:'#'+n;}
    if(mode==='letters')return SC.letterNames[lang]?.[v]||v;
    if(mode==='bopomofo')return SC.bopomofoSpeechSymbol(v)||v;
    if(SC.isChinese(mode)){
      const item=SC.modes[mode].items.find(item=>item.answer===v),pinyin=item?SC.tonelessPinyin(item.hint):SC.chineseSpeechPinyin(v);return pinyin?'pinyin:'+pinyin:v;
    }
    return SC.speechGroups[lang]?.find(group=>group.includes(v))?.[0]||v;
  };
  SC.matches = function(value,item,mode,lang='sv-SE',source='text'){
    const v=source==='speech'?SC.speechNormalize(value):SC.normalize(value);
    if(!v)return false;
    if(SC.isWordPair(mode)){
      const key=SC.pairAnswerKey(v,item.answerLang),answers=[item.answer,...item.aliases||[]];
      return answers.some(a=>SC.pairAnswerKey(a,item.answerLang)===key)||(source==='speech'&&answers.some(a=>SC.speechIdentity(key,mode,item.answerLang)===SC.speechIdentity(SC.pairAnswerKey(a,item.answerLang),mode,item.answerLang)));
    }
    if(v===SC.normalize(item.answer))return true;
    if(SC.isMath(mode)){const n=SC.spokenNumber(v,lang,source);return n!==null&&String(n)===item.answer;}
    if(SC.isChinese(mode)){
      if(mode==='homework'&&SC.tonelessPinyin(v)&&SC.tonelessPinyin(v)===SC.tonelessPinyin(item.hint))return true;
      if(item.aliases?.some(a=>SC.normalize(a)===v))return true;
      if(source==='speech'){
        const heard=SC.chineseSpeechPinyin(v),expected=SC.tonelessPinyin(item.hint)||SC.chineseSpeechPinyin(item.answer);
        return heard!==null&&heard===expected;
      }
      return false;
    }
    if(source==='speech'){
      if(item.speechAliases?.some(a=>SC.speechNormalize(a)===v))return true;
      return SC.speechIdentity(v,mode,lang)===SC.speechIdentity(item.answer,mode,lang);
    }
    return false;
  };
  SC.sameInput=(a,b,mode,lang)=>{
    const identity=e=>{
      if(SC.isMath(mode))return SC.spokenNumber(e.text,lang,e.source)??SC.normalize(e.text);
      if(e.source==='speech')return SC.speechIdentity(e.text,mode,lang);
      if(SC.isChinese(mode)){
        const item=SC.modes[mode].items.find(item=>SC.matches(e.text,item,mode,lang,e.source));
        if(item)return SC.speechIdentity(item.answer,mode,lang);
      }
      return SC.normalize(e.text);
    };
    return identity(a)===identity(b);
  };
  // Fixed lesson pools: selecting an answer first keeps simultaneous targets
  // distinguishable. Arithmetic difficulty never observes answers or game time.
  const mathPools=new Map();
  SC.mathPool=function(level=0){
    if(mathPools.has(level))return mathPools.get(level);
    const pool=new Map(),add=(answer,label)=>{if(!Number.isInteger(answer)||answer<0||answer>200)return;if(!pool.has(answer))pool.set(answer,[]);pool.get(answer).push(label);};
    const op=(a,o,b)=>o==='+'?a+b:o==='−'?a-b:o==='×'?a*b:a/b;
    if(level<=2){
      const low=level===2?10:0,high=level===2?100:level===1?20:10;
      for(let a=low;a<=high;a++)for(let b=low;b<=high;b++){
        if(level!==1||a+b<=20)add(a+b,a+' + '+b);
        if(level>0)add(a-b,a+' − '+b);
      }
    }else if(level<=4){
      for(let a=1;a<=10;a++)for(let b=1;b<=10;b++){
        add(a*b,a+' × '+b);if(level===4)add(a,a*b+' ÷ '+b);
      }
    }else if(level===5){
      const operators=['+','−','×','÷'];
      // One occurrence of x and positive constants make every generated
      // expression strictly monotone in positive x, hence the solution is unique.
      for(let n=1;n<=20;n++)for(let a=1;a<=10;a++)for(const first of operators){
        for(const left of [true,false]){const value=left?op(n,first,a):op(a,first,n);if(value>0&&Number.isInteger(value))add(n,(left?'x':a)+' '+first+' '+(left?a:'x')+' = '+value);}
        for(let b=1;b<=10;b++)for(const second of operators)for(let position=0;position<3;position++){
          const terms=[a,b];terms.splice(position,0,n);
          const [u,v,w]=terms,high=o=>o==='×'||o==='÷';
          const value=!high(first)&&high(second)?op(u,first,op(v,second,w)):op(op(u,first,v),second,w);
          if(!(value>0&&value<=200&&Number.isInteger(value)))continue;
          const labels=[a,b];labels.splice(position,0,'x');add(n,labels[0]+' '+first+' '+labels[1]+' '+second+' '+labels[2]+' = '+value);
        }
      }
    }else if(level===6){
      for(let n=1;n<=10;n++)add(n,'?');
    }else if(level===7){
      for(let a=0;a<=9;a++)for(let b=0;b<=9;b++)add(Math.abs(a+b-10),`${a} + ${b} = 10 ${a+b<10?'−':'+'} ?`);
    }else throw new RangeError('Unknown mathematics lesson');
    // Keep one-operator equations as common as two-operator equations.
    if(level===5)for(const [n,labels] of pool){const simple=labels.filter(label=>label.split(' = ')[0].split(' ').length===3),complex=labels.filter(label=>label.split(' = ')[0].split(' ').length===5);pool.set(n,[simple,complex]);}
    mathPools.set(level,pool);return pool;
  };
  SC.makeMath=function(answer,rng=Math.random,level=0){
    let choices=SC.mathPool(level).get(Number(answer));
    if(!choices)throw new RangeError('Answer outside selected mathematics lesson');
    if(level===5)choices=choices[rng()<.5?0:1];
    if(level===6)return {...word(String(answer)),label:'?',diagram:SC.makeDiagram(Number(answer),rng),mathLevel:level};
    return {...word(String(answer)),label:choices[Math.floor(rng()*choices.length)],mathLevel:level};
  };
  SC.makeDiagram=function(answer,rng=Math.random){
    const pick=values=>values[Math.floor(rng()*values.length)],values=Array.from({length:10},(_,i)=>i+1);
    const pieValues=values.filter(n=>n===answer?n+answer<=10:n+answer===4);
    const barValues=values.filter(n=>[1,1.5,2,3,4].includes(Math.max(n,answer)/Math.min(n,answer)));
    const lines=[];
    for(let notches=3;notches<=4;notches++)for(let unknown=1;unknown<=notches;unknown++){
      const start=answer-unknown,end=start+notches+1;
      if(start>=0&&end<=10)lines.push({notches,step:1,unknown,start,end});
    }
    // Some answers cannot occur in a valid pie or at an interior number-line notch.
    // Select only feasible chart types, preserving the answer chosen by the game.
    const kind=pick(['pie','bars','dots','number-line'].filter(kind=>kind==='pie'?pieValues.length:kind==='bars'?barValues.length:kind==='number-line'?lines.length:true));
    const palette=['#c6d6bd','#e0c3ad','#bfcddd','#d5c0d5','#dfd5ac','#b6d2cd'];
    const first=pick(palette),colors=[first,pick(palette.filter(color=>color!==first))];
    if(kind==='pie'||kind==='bars'){
      const known=pick(kind==='pie'?pieValues:barValues);
      return {kind,answer,known,colors,unknownFirst:rng()<.5,horizontal:rng()<.5};
    }
    if(kind==='dots'){
      const dots=[];
      for(let attempts=0;dots.length<answer&&attempts<300;attempts++){
        const angle=rng()*Math.PI*2,radius=Math.sqrt(rng()),point={x:52+39*radius*Math.cos(angle),y:36+25*radius*Math.sin(angle)};
        if(dots.every(p=>Math.hypot(p.x-point.x,p.y-point.y)>=14))dots.push(point);
      }
      // A bounded fallback also works with constant random sources, and never overlaps.
      if(dots.length<answer){
        const scatter=[[-25,-14],[-8,-20],[12,-18],[29,-10],[-32,4],[-15,-2],[3,0],[20,6],[-14,20],[5,20]],angle=(rng()-.5)*.4,flip=rng()<.5?-1:1;
        dots.length=0;for(const [x,y] of scatter.slice(0,answer))dots.push({x:52+flip*(x*Math.cos(angle)-y*Math.sin(angle)),y:36+x*Math.sin(angle)+y*Math.cos(angle)});
      }
      return {kind,answer,colors,dots};
    }
    return {kind,answer,colors,...pick(lines)};
  };
  SC.beginPractice=(game,items)=>items||(game.mode==='letters'?SC.letterSubset(game.lang,game.random):SC.vocabulary(game.mode,game.lang));
  SC.practiceItems=game=>{
    if(!SC.isWordPair(game.mode))return game.items;
    const used=game.getTargets().map(t=>t.item),available=game.items.filter(item=>!used.some(other=>item.pairIds?.some(id=>other.pairIds?.includes(id))||item.answerKeys?.some(key=>other.answerKeys?.includes(key))));
    return available.length?available:game.items;
  };
})(globalThis);
