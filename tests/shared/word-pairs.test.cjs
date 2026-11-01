'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const read=file=>fs.readFileSync(path.join(__dirname,'../..',file),'utf8'),ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const name of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input', 'game'])vm.runInContext(read('resources/'+name+'.js'),ctx);
const SC=ctx.Starlight,modes=Object.keys(SC.wordPairs),rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const item=(mode,label)=>SC.modes[mode].items.find(i=>i.label===label);
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
test('Graded dictionaries contain all 17 new levels with useful independent entries',()=>{
  assert.equal(modes.length,24);assert.equal(modes.reduce((sum,id)=>sum+SC.wordPairs[id].length,0),1470);
  for(const family of ['swedish-synonyms','swedish-opposites','english-synonyms','english-opposites'])for(const level of [2,3,4]){
    const id=family+'-'+level;assert.equal(SC.wordPairs[id].length,60);
    for(const [a,b,left,right] of SC.wordPairs[id]){
      assert(!/[\u0400-\u04ff]/u.test([a,b,...left,...right].join(' ')),'no lookalike Cyrillic letters');
      if(family.endsWith('synonyms'))assert(!a.includes(b)&&!b.includes(a),id+' contains a trivial compound pair');
    }
  }
  for(const level of [4,5,6,7,8])assert.equal(SC.wordPairs['translation-sv-en-'+level].length,80);
});
test('All 1,470 pairs support both directions, every accepted alternative and harmless formatting',()=>{
  for(const mode of modes){
    const count=SC.wordPairs[mode].length;assert(count>=50,mode);assert(SC.modes[mode].items.length>=count*1.8&&SC.modes[mode].items.length<=count*2,mode);
    for(const [left,right,alternativesLeft,alternativesRight] of SC.wordPairs[mode])for(const direction of [0,1]){
      const label=[left,right][direction],language=SC.isTranslation(mode)?['en-US','sv-SE'][direction]:SC.modes[mode].lang;
      const task=SC.modes[mode].items.find(i=>i.label===label&&i.answerLang===language);assert(task,mode+' missing main word '+label);
      for(const answer of direction?[left,...alternativesLeft]:[right,...alternativesRight])if(SC.isTranslation(mode)||SC.pairAnswerKey(answer,language)!==SC.pairAnswerKey(label,language))assert(SC.matches(answer,task,mode,language),mode+' loses declared answer '+label+' → '+answer);
    }
    const prompts=new Map();
    for(const task of SC.modes[mode].items){
      assert(task.answer&&task.label&&task.hint);assert.equal(task.hint,task.answer);
      assert.equal(task.promptContext,undefined);const key=[task.label,task.answerLang].join('|');assert(!prompts.has(key),mode+' ambiguous duplicate '+key);prompts.set(key,task);
      for(const answer of [task.answer,...task.aliases])for(const source of ['text','speech']){
        assert(SC.matches(answer,task,mode,task.answerLang,source),mode+' '+task.label+' → '+answer);
        assert(SC.matches('  '+answer.toUpperCase().replace(/ /g,'   ')+'! ',task,mode,task.answerLang,source));
        if(source==='speech')assert.deepEqual(Array.from(SC.tokenizeSpeech(answer,{lesson:mode,language:task.answerLang,candidates:[task]})),[answer],mode+' splits spoken answer '+answer);
      }
      assert(!SC.matches('xyzzy',task,mode));
      if(!SC.isTranslation(mode))assert(!SC.matches(task.label,task,mode),'copying synonym/opposite prompt '+task.label);
    }
  }
});
test('Direct accepted answers are reversible and consistent across levels in each dictionary family',()=>{
  const prompts=new Map(),key=(family,lang,label)=>[family,lang,SC.normalize(label)].join('|');
  for(const mode of modes){
    const family=SC.isTranslation(mode)?'translation':mode.replace(/-\d+$/,'');
    for(const task of SC.modes[mode].items){
      const promptLang=SC.isTranslation(mode)?(task.answerLang==='sv-SE'?'en-US':'sv-SE'):task.answerLang;
      const k=key(family,promptLang,task.label),entry={mode,task,family,promptLang};
      if(!prompts.has(k))prompts.set(k,[]);prompts.get(k).push(entry);
    }
  }
  let reverseChecks=0;
  for(const entries of prompts.values()){
    const answerKeys=({task})=>[...new Set([task.answer,...task.aliases].map(a=>SC.pairAnswerKey(a,task.answerLang)))].sort();
    for(const entry of entries){
      const {mode,task,family}=entry;
      assert.deepEqual(answerKeys(entry),answerKeys(entries[0]),mode+' changes the meanings of '+task.label);
      for(const answer of [task.answer,...task.aliases])for(const reverse of prompts.get(key(family,task.answerLang,answer))||[]){
        for(const source of ['text','speech'])assert(SC.matches(task.label,reverse.task,reverse.mode,reverse.task.answerLang,source),mode+' accepts '+task.label+' → '+answer+' but '+reverse.mode+' rejects the reverse');
        reverseChecks++;
      }
    }
  }
  assert(reverseChecks>3000,'the reverse audit must include alternatives that are prompts at other levels');
  console.log('  '+reverseChecks+' direct reverse relationships checked.');
});
test('Reviewed omissions and distinct word senses work without transitive synonym expansion',()=>{
  const cases=[
    ['swedish-opposites','tjock',['smal','mager'],['fet']],
    ['swedish-opposites-2','stolt',['skamsen','ödmjuk','blygsam'],['högfärdig']],
    ['swedish-opposites-3','tillgång',['skuld','brist'],['resurs']],
    ['swedish-opposites-4','syntetisk',['analytisk','naturlig'],['konstgjord']],
    ['swedish-synonyms','springa',['löpa','spricka','glipa'],['stanna']],
    ['swedish-synonyms','kvick',['snabb','rolig','vitsig'],['trög']],
    ['swedish-synonyms-2','klar',['tydlig','färdig','genomskinlig'],['oklar']],
    ['swedish-synonyms-3','styrka',['bekräfta','kraft','bestyrka'],['svaghet']],
    ['swedish-synonyms-4','reservation',['förbehåll','bokning'],['avbokning']],
    ['english-opposites','hard',['soft','easy','gentle'],['firm']],
    ['english-opposites-2','dense',['sparse','intelligent'],['thick']],
    ['english-opposites-3','fair',['unfair','dark','foul'],['just']],
    ['english-opposites-4','synthetic',['analytic','natural'],['artificial']],
    ['english-synonyms','gift',['present','talent','donation'],['current']],
    ['english-synonyms','present',['gift','current','introduce'],['talent']],
    ['english-synonyms-2','curious',['inquisitive','odd','strange'],['uninterested']],
    ['english-synonyms-3','objective',['unbiased','goal','target'],['biased']],
    ['english-synonyms-4','fortuitous',['accidental','lucky','serendipitous'],['deliberate']],
    ['english-synonyms-4','accidental',['fortuitous','unintentional'],['fortunate']],
    ['translation-sv-en-1','pencil',['penna','blyertspenna'],['kulspetspenna','quill']],
    ['translation-sv-en-1','bed',['säng','bädd','rabatt','flodbädd'],['discount']],
    ['translation-sv-en-2','springa',['run','crack','gap'],['walk']],
    ['translation-sv-en-2','play',['leka','spel','pjäs'],['spelare']],
    ['translation-sv-en-2','ledsen',['sad','sorry','upset'],['happy']],
    ['translation-sv-en-3','berg',['mountain','rock'],['stonehenge']],
    ['translation-sv-en-3','question',['fråga','ifrågasätta','frågeställning'],['svar']],
    ['translation-sv-en-4','apply',['ansöka','tillämpa','gälla','applicera'],['ansökan']],
    ['translation-sv-en-4','ansöka',['apply','apply for'],['use']],
    ['translation-sv-en-4','rest',['vila','resten','återstod'],['rastlös']],
    ['translation-sv-en-4','return',['återvända','lämna tillbaka','avkastning'],['avgång']],
    ['translation-sv-en-4','boende',['accommodation','housing','resident'],['homeless']],
    ['translation-sv-en-4','regular',['regelbunden','regelbundet','regelbundna','ordinarie'],['oregelbunden']],
    ['translation-sv-en-5','application',['ansökan','tillämpning','program','app'],['applicera']],
    ['translation-sv-en-5','right',['rättighet','höger','rätt','korrekt'],['vänster']],
    ['translation-sv-en-5','implement',['genomföra','redskap','verktyg','tillämpa'],['implementation']],
    ['translation-sv-en-5','anställd',['employee','employed','staff member'],['employer']],
    ['translation-sv-en-6','claim',['påstående','krav','anspråk','hävda'],['bevis']],
    ['translation-sv-en-6','förutsättning',['prerequisite','condition','assumption','premise'],['conclusion']],
    ['translation-sv-en-6','likely',['trolig','troligt','troliga','sannolikt'],['osannolik']],
    ['translation-sv-en-6','omständighet',['circumstance','condition'],['consequence']],
    ['translation-sv-en-7','qualify',['nyansera','kvalificera sig','göra behörig'],['diskvalificera']],
    ['translation-sv-en-7','nyansera',['qualify','add nuance to'],['be eligible']],
    ['translation-sv-en-7','prompt',['föranleda','uppmaning','snabb','sufflera'],['långsam']],
    ['translation-sv-en-7','accountability',['ansvarsskyldighet','ansvar'],['ansvarslöshet']],
    ['translation-sv-en-8','treacherous',['förrädisk','försåtlig','svekfull'],['trogen']],
    ['translation-sv-en-8','förbehåll',['caveat','reservation','proviso','qualification'],['certainty']],
    ['translation-sv-en-8','conscientious',['samvetsgrann','samvetsgrant','samvetsgranna','noggrann'],['vårdslös']],
    ['translation-sv-en-8','frikänna',['exonerate','acquit','absolve','clear'],['convict']]
  ];
  for(const [mode,label,accepted,rejected] of cases){
    const task=item(mode,label);assert(task,mode+' missing '+label);
    for(const source of ['text','speech']){
      for(const answer of accepted)assert(SC.matches(answer,task,mode,task.answerLang,source),mode+' '+label+' rejects '+answer);
      for(const answer of rejected)assert(!SC.matches(answer,task,mode,task.answerLang,source),mode+' '+label+' incorrectly accepts '+answer);
    }
  }
});
test('Common meanings and independent alternatives are accepted without context clues',()=>{
  const check=(mode,label,yes,no)=>{const task=item(mode,label);assert(task,label);for(const text of yes)assert(SC.matches(text,task,mode,task.answerLang),label+' rejects '+text);for(const text of no)assert(!SC.matches(text,task,mode,task.answerLang),label+' accepts '+text);};
  check('swedish-opposites','lätt',['tung','svår','krånglig'],['lätt']);
  check('swedish-opposites','gammal',['ung','ny'],['gammal']);
  check('swedish-synonyms','okomplicerad',['enkel','lätt'],['tung']);
  check('english-opposites','light',['heavy','dark','dim'],['light','bright']);
  check('english-opposites','short',['long','tall'],['short']);
  check('english-synonyms','furious',['angry','mad','cross'],['happy']);
  check('english-synonyms','mother',['mum','mom','mummy'],['father']);
  check('translation-sv-en-1','penna',['pen','pencil'],['ink']);
  check('translation-sv-en-1','pencil',['penna','blyertspenna'],['kulspetspenna']);
  check('translation-sv-en-1','får',['sheep','get','may'],['dog']);
  check('translation-sv-en-1','book',['bok','boka'],['penna']);
  check('translation-sv-en-1','table',['bord','tabell'],['stol']);
  check('translation-sv-en-1','öga',['eye'],['ear']);
  check('translation-sv-en-3','låna',['borrow','lend'],['give']);
  check('translation-sv-en-3','låna ut',['lend','loan'],['borrow']);
  check('translation-sv-en-3','lend',['låna ut','låna'],['låna in']);
  check('translation-sv-en-3','ö',['island'],['o']);
  check('translation-sv-en-3','island',['ö'],['o']);
  check('translation-sv-en-3','letter',['bokstav','brev'],['tal']);
  check('translation-sv-en-3','mening',['sentence','meaning','purpose'],['word']);
  check('translation-sv-en-3','share',['dela','andel','aktie'],['allting']);
  check('translation-sv-en-2','open',['öppna','öppen','öppet','att öppna'],['stänga']);
  check('translation-sv-en-2','gå',['walk','go'],['run']);
  check('translation-sv-en-2','small',['liten','litet','små'],['stor']);
  check('translation-sv-en-1','cat',['katt','en katt'],['hund']);
  check('english-synonyms','begin',['start','to start'],['finish']);
});
test('Translation direction selects only the opposite language, merging identical prompts',()=>{
  for(const mode of modes.filter(SC.isTranslation))for(const lang of ['sv-SE','en-US']){
    const vocabulary=SC.vocabulary(mode,lang),count=SC.wordPairs[mode].length;assert(vocabulary.length>=count-1&&vocabulary.length<=count);assert(vocabulary.every(i=>i.answerLang===lang));
    const g=new SC.CityGame({random:rng(1)});g.start({mode,lang});assert(g.items.every(i=>i.answerLang===lang));
  }
  assert.equal(SC.modes.english.name,'English words - short');assert.equal(SC.modes.englishLong.name,'English words - long');
});
test('Multiword speech, prefixes, cross-result phrases and revisions produce one answer',()=>{
  const result=(text,final=false)=>Object.assign([{transcript:text}],{isFinal:final});
  for(const [mode,label,language,parts,phrase] of [
    ['translation-sv-en-1','glass','en-US',['ice','cream'],'ice cream'],
    ['translation-sv-en-2','vakna','en-US',['wake','up'],'wake up'],
    ['translation-sv-en-3','lend','sv-SE',['låna','ut'],'låna ut'],
    ['swedish-synonyms','gilla','sv-SE',['tycka','om'],'tycka om'],
    ['translation-sv-en-3','remember','sv-SE',['komma','ihåg'],'komma ihåg']
  ]){
    const target=item(mode,label),sent=[],context={lesson:mode,language,candidates:[target]},stream=new SC.SpeechStream({getContext:()=>context,enqueue:text=>{sent.push(text);return {text};}});
    assert.deepEqual(Array.from(SC.tokenizeSpeech(phrase,context)),[phrase]);
    stream.update([result(parts[0])]);assert.equal(sent.length,0,'premature phrase prefix: '+parts[0]);
    stream.update([result(parts[0]),result(parts[1])]);assert.deepEqual(sent,[phrase]);
    context.candidates=[];stream.update([result(phrase,true)]);assert.equal(sent.length,1,'repeated phrase after target disappears');
  }
  const context={lesson:'translation-sv-en-3',language:'sv-SE',candidates:[]};
  assert.deepEqual(Array.from(SC.tokenizeSpeech('att låna ut komma ihåg',context)),['att låna ut','komma ihåg']);
  assert.deepEqual(Array.from(SC.tokenizeSpeech('a cat ice cream',{lesson:'translation-sv-en-1',language:'en-US',candidates:[]})),['a cat','ice cream']);
  const target=item('translation-sv-en-1','glass'),sent=[],stream=new SC.SpeechStream({getContext:()=>({lesson:'translation-sv-en-1',language:'en-US',candidates:[target]}),enqueue:text=>{sent.push(text);return {text};}});
  stream.update([result('ice',true)]);assert.equal(sent.length,0,'a finalized prefix must not become a wrong answer');
  stream.update([result('ice',true),result('cream',true)]);assert.deepEqual(sent,['ice cream']);
});
test('Active word pairs and overlapping answers are normally excluded from new tasks',()=>{
  const mode='english-synonyms',active=item(mode,'big'),g={mode,items:SC.vocabulary(mode),getTargets:()=>[{item:active}]};
  const choices=SC.practiceItems(g);assert(choices.length);assert(!choices.some(i=>i.pairId===active.pairId||i.answerKeys.some(a=>active.answerKeys.includes(a))));
});
test('A word-pair bubble adds no context or instruction text before or after its hint',()=>{
  const task=item('translation-sv-en-3','letter'),drawn=[],c={font:'bold 20px system-ui',fillStyle:'#000',save(){},restore(){},measureText(text){return {width:text.length*Number(this.font.match(/[\d.]+/)[0])*.6};},fillText(text){drawn.push(text);}};
  SC.drawLabelText(c,task,{x:0,y:0,w:140,h:34});assert.deepEqual(drawn,[task.label]);
  drawn.length=0;SC.drawLabelText(c,task,{x:0,y:0,w:140,h:66},{hint:true});assert.deepEqual(drawn,[task.label,task.hint]);
});
(async()=>{
  const worker=(await import('../../cloudflare/worker.mjs')).default;
  const DB={prepare(){return {bind(){return this;},async all(){return {results:[]};},async first(){return null;}};}};
  for(const mode of modes){const response=await worker.fetch(new Request('https://example.workers.dev/scores?leaderboard=v2:city:'+mode+':gentle',{headers:{Origin:'https://jakobrogstadius.github.io'}}),{DB});assert.equal(response.status,200,mode+' highscore rejected');}
  console.log('PASS Worker accepts all 24 word-pair exercise IDs');console.log((checks+1)+' word-pair checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
