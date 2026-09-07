(function(root){
  'use strict';
  const SC = root.Starlight = root.Starlight || {};
  SC.normalize = v => String(v ?? '').normalize('NFC').toLowerCase().trim().replace(/[.,!?。，！？]+$/g,'').trim().replace(/\s+/g,' ');
  SC.pinyin = v => SC.normalize(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[1-5]/g,'').replace(/\s/g,'');
  const word = label => ({id:label,label,answer:label,speak:label,hint:'',aliases:[]});
  SC.modes = {
    letters:{name:'Bokstavspatrullen',icon:'Aa',color:'#85f0c4',description:'Hitta bokstäverna på tangentbordet',lang:'sv-SE',placeholder:'Tryck på en bokstav…',items:Array.from('abcdefghijklmnopqrstuvwxyzåäö',word)},
    swedish:{name:'Svenska ord',icon:'Ö',color:'#ffdc88',description:'Läs och skriv korta svenska ord',lang:'sv-SE',placeholder:'Skriv ordet…',items:'sol måne hus bil båt bok katt hund ko häst fisk fågel mus boll mat ost ägg mjölk is snö sjö hav skog träd blomma röd blå grön gul vit svart stor liten glad hej ja nej'.split(' ').map(word)},
    english:{name:'Engelska ord',icon:'Hi',color:'#97c6ff',description:'Läs och skriv korta engelska ord',lang:'en-US',placeholder:'Skriv ordet…',items:'sun moon star sky cat dog bird fish cow horse fox bear bee tree leaf rain snow sea boat car bus bike book ball home bed hat cup egg milk red blue green big small happy'.split(' ').map(word)},
    food:{name:'Mat på menyn',icon:'🍔',color:'#efb77e',description:'Läs och skriv svenska matord',lang:'sv-SE',placeholder:'Skriv beställningen…',items:'soppa taco pizza sushi pasta sallad ris nudlar falafel gryta paj toast korv omelett pannkaka våffla bröd ost ägg gröt mos lax fisk kyckling köttbullar hamburgare lasagne pyttipanna macka smörgås bulle glass kaka yoghurt banan äpple päron melon apelsin vindruva jordgubbe hallon blåbär morot gurka tomat majs ärtor bönor broccoli spenat svamp räka avokado hummus couscous kebab potatis kål kött bacon smör mjölk juice vatten choklad pudding semla kex croissant'.split(' ').map(word)},
    math:{name:'Räkneraketer',icon:'±',color:'#f3a8d2',description:'Plus och minus från 0 till 20 · börjar lätt och anpassas',lang:'sv-SE',placeholder:'Skriv svaret…',items:[]},
    chinese:{name:'你好 · Mandarin',icon:'你好',color:'#c4afff',description:'Uttala enkla kinesiska tecken · toner bedöms inte',lang:'zh-CN',placeholder:'Säg svaret eller skriv pinyin…',items:[]}
  };
  SC.modes.swedishLong={name:'Längre svenska ord',icon:'Äventyr',color:'#ffdc88',description:'Läs och skriv svenska ord med 6–12 bokstäver',lang:'sv-SE',placeholder:'Skriv det längre ordet…',items:'kaninen fjäril nyckel cykeln moroten tomaten gurkan jordgubbe hallonen potatis fönster dörren gardinen kudden strumpa stövlar regnjacka snögubbe sommaren vintern höstlöv skolgård kompis vänskap kalaset födelsedag stjärna solstråle månsken regnbåge blommor trädgård vattenkanna lekplats skogsmark äpplet apelsin bananen fågelbo utflykt skattkista sagoboken brandstation bibliotek äventyr'.split(' ').map(word)};
  SC.modes.englishLong={name:'Längre engelska ord',icon:'Adventure',color:'#97c6ff',description:'Läs och skriv engelska ord med 6–12 bokstäver',lang:'en-US',placeholder:'Skriv det längre ordet…',items:'rabbit butterfly rainbow sunshine moonlight starlight flower garden watering kitchen carrot potato tomato cucumber strawberry raspberry pancake breakfast sandwich window curtain pillow blanket bedroom jacket mitten jumper winter summer autumn snowman playground friendship birthday present family animal forest seaside bicycle journey treasure adventure library picture storybook elephant giraffe penguin dolphin'.split(' ').map(word)};
  SC.modes.chinese.items = [
    ['一','yī','ett','yi1'],['二','èr','två','er4'],['三','sān','tre','san1'],['四','sì','fyra','si4'],
    ['五','wǔ','fem','wu3'],['六','liù','sex','liu4'],['七','qī','sju','qi1'],['八','bā','åtta','ba1'],
    ['九','jiǔ','nio','jiu3'],['十','shí','tio','shi2'],['人','rén','människa','ren2'],['山','shān','berg','shan1'],
    ['水','shuǐ','vatten','shui3'],['火','huǒ','eld','huo3'],['日','rì','sol / dag','ri4'],['月','yuè','måne / månad','yue4'],
    ['大','dà','stor','da4'],['小','xiǎo','liten','xiao3'],['口','kǒu','mun','kou3'],['手','shǒu','hand','shou3']
  ].map(([label,hint,meaning,tone])=>({id:label,label,answer:label,speak:label,hint,meaning,aliases:[hint,tone,SC.pinyin(hint)]}));
  // Standard Zhuyin layout; ASCII conversion also works with a Swedish keyboard.
  SC.bopomofoKeys=Object.fromEntries(Array.from('1qaz2wsxedcrfv5tgbyhnujm8ik,9ol.0p;/-').map((key,i)=>[key,Array.from('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ')[i]]));
  SC.modes.bopomofo={name:'Bopomofo · 注音',icon:'ㄅ',color:'#ffbd96',description:'Skriv 37 kinesiska ljudtecken',lang:'zh-TW',placeholder:'Skriv ett bopomofo-tecken…',items:Object.entries(SC.bopomofoKeys).map(([key,label])=>({...word(label),key,hint:'Tangent '+key.toUpperCase()}))};
  SC.toBopomofo=value=>Array.from(value).map(c=>SC.bopomofoKeys[c.toLowerCase()]||c).join('');
  SC.latinMode=mode=>['letters','swedish','swedishLong','english','englishLong','food'].includes(mode);
  SC.lessonLabel=(label,mode,uppercase)=>SC.latinMode(mode)?(uppercase?label.toLocaleUpperCase('sv-SE'):label.toLocaleLowerCase('sv-SE')):label;
  // Spoken numbers are aliases; text answers remain decimal integers.
  SC.numberWords = {
    'en-US': {eight:8,eighteen:18,eleven:11,fifteen:15,five:5,four:4,fourteen:14,nine:9,nineteen:19,one:1,seven:7,seventeen:17,six:6,sixteen:16,ten:10,thirteen:13,three:3,twelve:12,twenty:20,two:2,zero:0},
    'sv-SE': {'åtta':8,'arton':18,'elva':11,'ett':1,'en':1,'fem':5,'femton':15,'fjorton':14,'fyra':4,'nio':9,'nitton':19,'noll':0,'sex':6,'sexton':16,'sju':7,'sjutton':17,'tio':10,'tjugo':20,'tolv':12,'tre':3,'tretton':13,'två':2},
    'zh-CN': {'八':8,'十八':18,'十一':11,'十五':15,'五':5,'四':4,'十四':14,'九':9,'十九':19,'一':1,'七':7,'十七':17,'六':6,'十六':16,'十':10,'十三':13,'三':3,'十二':12,'二十':20,'二':2,'两':2,'零':0}
  };
  SC.numberWords['zh-CN']['兩']=2;
  SC.numberWords['zh-TW']=SC.numberWords['zh-CN'];
  SC.numberName = (n,lang) => {
    const words=SC.numberWords[lang]||SC.numberWords['sv-SE'];
    return Object.keys(words).find(k=>words[k]===n)||String(n);
  };
  SC.vocabulary = (mode,lang) => mode==='math' ? Array.from({length:21},(_,n)=>({...word(String(n)),speak:SC.numberName(n,lang),hint:SC.numberName(n,lang)})) : SC.modes[mode].items;
  SC.keyboardRows=lang=>lang.startsWith('sv')?['qwertyuiopå','asdfghjklöä','zxcvbnm']:['qwertyuiop','asdfghjkl','zxcvbnm'];
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
    // Remove tones, not vowels: lü stays different from lu. Accept the usual
    // keyboard spellings lv / lu: as well as accented and numbered pinyin.
    const v=SC.speechNormalize(value).replace(/u:/g,'ü').replace(/v/g,'ü').normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g,'').normalize('NFC').replace(/[0-5]$/,'');
    return /^[a-züê]+$/.test(v)?v:null;
  };
  SC.chineseSpeechPinyin=function(value){
    let v=SC.speechNormalize(value);
    if(/^\d+$/.test(v)){const n=Number(v);if(n>10)return null;v=SC.numberName(n,'zh-CN');}
    return SC.mandarinPinyin[v]||SC.tonelessPinyin(v);
  };
  SC.spokenNumber=function(value,lang,source='speech'){
    const v=SC.speechNormalize(value),names=SC.numberWords[lang]||{};
    if(Object.hasOwn(names,v))return names[v];
    if(source==='speech'&&lang==='en-US'){
      const aliases={to:2,too:2,for:4,fore:4,ate:8,won:1,oh:0,o:0};if(Object.hasOwn(aliases,v))return aliases[v];
    }
    // Strict whole-string integer parsing: never parseFloat('2cats') or '-2' as 2.
    if(/^\+?\d+(?:[.,]0+)?$/.test(v)){const n=Number(v.replace(',','.'));return Number.isSafeInteger(n)&&n>=0&&n<=20?n:null;}
    const decimal=v.match(/^(.+) (?:point|komma|punkt) (.+)$/);
    if(decimal&&SC.spokenNumber(decimal[2],lang,source)===0)return SC.spokenNumber(decimal[1],lang,source);
    return null;
  };
  SC.speechIdentity=function(value,mode,lang){
    const v=SC.speechNormalize(value);
    if(mode==='math'){const n=SC.spokenNumber(v,lang);return n===null?v:'#'+n;}
    if(mode==='letters')return SC.letterNames[lang]?.[v]||v;
    if(mode==='chinese'){
      const pinyin=SC.chineseSpeechPinyin(v);return pinyin?'pinyin:'+pinyin:v;
    }
    return SC.speechGroups[lang]?.find(group=>group.includes(v))?.[0]||v;
  };
  SC.matches = function(value,item,mode,lang='sv-SE',source='text'){
    const v=source==='speech'?SC.speechNormalize(value):SC.normalize(value);
    if(!v)return false;
    if(v===SC.normalize(item.answer))return true;
    if(mode==='math'){const n=SC.spokenNumber(v,lang,source);return n!==null&&String(n)===item.answer;}
    if(mode==='chinese'){
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
      if(mode==='math')return SC.spokenNumber(e.text,lang,e.source)??SC.normalize(e.text);
      if(e.source==='speech')return SC.speechIdentity(e.text,mode,lang);
      if(mode==='chinese'){
        const item=SC.modes.chinese.items.find(item=>SC.matches(e.text,item,mode,lang,e.source));
        if(item)return SC.speechIdentity(item.answer,mode,lang);
      }
      return SC.normalize(e.text);
    };
    return identity(a)===identity(b);
  };
  SC.mathLevels=[{max:5,minus:0},{max:5,minus:.5},{max:10,minus:.5},{max:20,minus:.5,noCrossing:true},{max:20,minus:.5}];
  SC.makeMath = function(answer,rng=Math.random,level=null){
    const n=Number(answer);
    if(level!==null){
      const profile=SC.mathLevels[level],minus=rng()<profile.minus,choices=[];
      for(let a=0;a<=profile.max;a++)for(let b=0;b<=profile.max;b++){
        if((minus?a-b:a+b)!==n)continue;
        if(profile.noCrossing&&(minus?a>10&&a%10<b%10:n>10&&a%10+b%10>=10))continue;
        choices.push([a,b]);
      }
      const [a,b]=choices[Math.floor(rng()*choices.length)];
      return {...word(String(n)),label:a+(minus?' − ':' + ')+b,mathLevel:level};
    }
    if(rng()<0.5){const a=Math.floor(rng()*(n+1));return {...word(String(n)),label:a+' + '+(n-a)};}
    const b=Math.floor(rng()*(21-n));return {...word(String(n)),label:(n+b)+' − '+b};
  };
  const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
  // Per-round arithmetic adaptation. Observes input before workers consume it;
  // advances only on game time, and never touches points or existing labels.
  class MathPractice{
    constructor(game){
      this.game=game;this.level=0;this.time=0;this.thinking=0;this.backlogTime=0;
      this.successes=0;this.requiredSuccesses=5;this.holdUntil=0;this.baseline=null;this.samples=[];this.attempts=[];this.ages=new Map();
      this.listener=e=>this.observe(e.detail);game.queue.addEventListener('attempt',this.listener);
    }
    destroy(){this.game.queue.removeEventListener('attempt',this.listener);}
    available(){
      const g=this.game,available=(g.getPracticeTargets?.()||g.getAvailableTargets()).map(t=>t.item);
      for(const entry of g.queue.items){const i=available.findIndex(item=>SC.matches(entry.text,item,g.mode,g.lang,entry.source));if(i>=0)available.splice(i,1);}
      return available;
    }
    update(dt){
      this.time+=dt;const available=this.available(),old=this.ages,recovering=available.some(item=>item.mathLevel>this.level);
      // Let the player clear harder questions already on screen after a step
      // down, rather than repeatedly lowering the level for that same batch.
      this.ages=new Map(available.map(item=>[item,recovering?0:(old.get(item)||0)+dt]));
      this.thinking=available.length?this.thinking+dt:0;
      this.backlogTime=!recovering&&available.length>=3?this.backlogTime+dt:0;
      const limit=Math.max(8,Math.min(18,(this.baseline||6)*2));
      if(this.time>=this.holdUntil&&(this.backlogTime>=5||Math.max(0,...this.ages.values())>=limit))this.stepBack('backlog');
    }
    stepBack(reason){
      if(this.time<this.holdUntil)return;
      this.level=Math.max(0,this.level-1);this.lastAdjustment=reason;this.successes=0;this.samples=[];this.attempts=[];
      this.requiredSuccesses=10;this.holdUntil=this.time+12;this.backlogTime=0;
    }
    observe({entry,item,reason,revision=false}){
      const g=this.game;if(g.state!=='playing'||reason==='duplicate')return;
      if(!g.queue.policy){
        const available=g.getAvailableTargets().map(t=>t.item);
        for(const earlier of g.queue.items){if(earlier===entry)break;const i=available.findIndex(t=>SC.matches(earlier.text,t,g.mode,g.lang,earlier.source));if(i>=0)available.splice(i,1);}
        item=available.find(t=>SC.matches(entry.text,t,g.mode,g.lang,entry.source));
      }
      if(!item&&this.available().some(t=>t.mathLevel>this.level))return;
      const previous=this.attempts.find(a=>a.id===entry.id);
      if(previous)previous.correct=!!item;else this.attempts.push({id:entry.id,correct:!!item});
      this.attempts=this.attempts.slice(-6);
      if(!item){this.successes=0;if(this.attempts.filter(a=>!a.correct).length>=2)this.stepBack('mistakes');return;}
      const seconds=this.thinking;this.thinking=0;
      // Revisions and several words delivered in one ASR callback do not create
      // artificially fast timing samples. Older, already-visible levels do not
      // earn promotion at the new level.
      if(revision||item.mathLevel!==this.level)return;
      if(seconds>=.3){this.samples.push(seconds);this.samples=this.samples.slice(-5);}
      if(this.baseline&&this.samples.length>=3&&median(this.samples.slice(-3))>Math.max(this.baseline*1.8,this.baseline+2)){
        this.stepBack('slow');return;
      }
      this.successes++;
      if(this.successes>=this.requiredSuccesses&&this.time>=this.holdUntil&&this.level<SC.mathLevels.length-1){
        if(this.samples.length)this.baseline=this.baseline===null?median(this.samples):Math.min(this.baseline,median(this.samples));
        this.level++;this.lastAdjustment='advance';this.successes=0;this.samples=[];this.attempts=[];this.holdUntil=this.time+3;
      }
    }
  }
  SC.MathPractice=MathPractice;
  SC.beginPractice=function(game,items){
    game.queue.practice?.destroy();game.mathPractice=game.mode==='math'?new MathPractice(game):null;game.queue.practice=game.mathPractice;
    return items||(game.mode==='letters'?SC.letterSubset(game.lang,game.random):SC.vocabulary(game.mode,game.lang));
  };
  SC.practiceItems=game=>game.mathPractice?game.items.filter(item=>Number(item.answer)<=SC.mathLevels[game.mathPractice.level].max):game.items;
})(globalThis);
