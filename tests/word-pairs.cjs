'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const name of ['pinyin','data','word-pairs','speech','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows','eggs','home','home-renderer'])vm.runInContext(read('resources/'+name+'.js'),ctx);
const SC=ctx.Starlight,modes=Object.keys(SC.wordPairs),rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const item=(mode,label)=>SC.modes[mode].items.find(i=>i.label===label);
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
test('All 350 pairs support both directions, every accepted alternative and harmless formatting',()=>{
  for(const mode of modes){
    assert.equal(SC.wordPairs[mode].length,50,mode);assert(SC.modes[mode].items.length>=95&&SC.modes[mode].items.length<=100,mode);
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
      }
      assert(!SC.matches('xyzzy',task,mode));
      if(!SC.isTranslation(mode))assert(!SC.matches(task.label,task,mode),'copying synonym/opposite prompt '+task.label);
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
    const vocabulary=SC.vocabulary(mode,lang);assert(vocabulary.length>=49&&vocabulary.length<=50);assert(vocabulary.every(i=>i.answerLang===lang));
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
  const task=item('translation-sv-en-3','letter'),drawn=[],c={font:'bold 20px system-ui',fillStyle:'#000',save(){},restore(){},fillText(text){drawn.push(text);}};
  SC.drawLabelText(c,task,{x:0,y:0,w:140,h:34});assert.deepEqual(drawn,[task.label]);
  drawn.length=0;SC.drawLabelText(c,task,{x:0,y:0,w:140,h:66},{hint:true});assert.deepEqual(drawn,[task.label,task.hint]);
});
function setup(name,mode,lang){
  const g=new SC[name+'Game']({random:rng(5)});g.start({mode,lang,pace:'gentle'});g.resize(1000,740);
  if(name==='Home')g.createTask('toys',g.spots.toys[0]);
  if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);}
  if(name==='Egg'){for(const e of g.eggs)e.crackAt=10000;for(let i=0;i<140;i++)g.update(.05);g.crack(g.eggs[0]);}
  for(let i=0;i<100&&!g.getTargets().length;i++)g.update(.05);
  assert(g.getTargets().length,name);return g;
}
function render(name,g){
  const drawn=[],stack=[],c=new Proxy({font:'16px system-ui',save(){stack.push(this.font);},restore(){this.font=stack.pop();},measureText(text){return {width:String(text).length*Number(this.font.match(/[\d.]+/)?.[0]||16)*.6};},fillText(text,x,y){drawn.push({text,x,y,font:this.font});}},{get:(o,k)=>k in o?o[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
  const renderer=Object.create(SC[name+'Renderer'].prototype);Object.assign(renderer,{game:g,ctx:c,dpr:1,stars:[],reduced:true});renderer.draw();return drawn;
}
test('All nine games accept alternate answers and render each new exercise with a five-second hint',()=>{
  for(const name of ['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home'])for(const mode of modes){
    const g=setup(name,mode,SC.modes[mode].lang),target=g.getTargets()[0];
    // Deterministic task with an alternate answer and no extra visual text.
    target.item=SC.vocabulary(mode,g.lang).find(i=>i.aliases.length&&i.answer!==i.label);
    const task=target.item;assert(task,name+'/'+mode);assert(!SC.pinyinHints(g).has(target));
    let drawn=render(name,g);assert.equal(task.promptContext,undefined);assert.equal(SC.labelHeight(task,34),34,name+' an unrevealed task must keep its compact height');
    g.clock=target.appearedAt+4.99;assert(!SC.pinyinHints(g).has(target));
    g.clock=target.appearedAt+5;assert(SC.pinyinHints(g).has(target));drawn=render(name,g);
    const main=drawn.find(t=>t.text===task.label),hint=drawn.find(t=>t.text===task.hint&&t.y>main?.y);
    assert(main&&hint,name+'/'+mode+' missing answer hint');assert(Number(hint.font.match(/[\d.]+/)[0])<Number(main.font.match(/[\d.]+/)[0]),name+' hint must be smaller');
    target.pinyinRevealed=false;
    g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(entry,i)=>SC.matches(entry.text,i,mode,g.lang,entry.source)});
    assert(g.queue.enqueue(task.aliases[0]));assert(!SC.pinyinHints(g).has(target),name+' queued alternate answer');
  }
});
test('Typing translation direction remains selectable and speech uses the answer language',()=>{
  const fields=new Map(),field=id=>{if(!fields.has(id))fields.set(id,{value:'',options:[],hidden:false,disabled:false});return fields.get(id);};
  field('language').options=['sv-SE','en-US','zh-TW','zh-CN'].map(value=>({value}));field('lesson').value='translation-sv-en-2';field('input-kind').value='typing';field('language').value='sv-SE';
  const app=read('resources/app.js'),start=app.indexOf('function options()'),end=app.indexOf("$('lesson').addEventListener",start),menu=vm.createContext({$:field,SC,kind:'city'});
  vm.runInContext(app.slice(start,end),menu);menu.menuUpdate();assert.equal(field('language').disabled,false);assert.equal(field('language-label').textContent,'Översätt till');assert.equal(menu.options().lang,'sv-SE');
  field('language').value='en-US';assert.equal(menu.options().lang,'en-US');field('input-kind').value='browser';assert.equal(menu.speechOptions().language,'en-US');
  field('lesson').value='swedish-synonyms';menu.menuUpdate();assert.equal(field('language').value,'sv-SE');assert.equal(field('language').options.filter(o=>!o.disabled).length,1);
  field('lesson').value='swedish';field('input-kind').value='typing';menu.menuUpdate();assert.equal(field('language').disabled,true);assert(field('language').options.every(o=>!o.disabled));
});
(async()=>{
  const worker=(await import('../cloudflare/worker.mjs')).default;
  const DB={prepare(){return {bind(){return this;},async all(){return {results:[]};},async first(){return null;}};}};
  for(const mode of modes){const response=await worker.fetch(new Request('https://example.workers.dev/scores?leaderboard=v2:city:'+mode+':gentle',{headers:{Origin:'https://jakobrogstadius.github.io'}}),{DB});assert.equal(response.status,200,mode+' highscore rejected');}
  console.log('PASS Worker accepts all seven new exercise IDs');console.log((checks+1)+' word-pair checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
