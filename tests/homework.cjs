'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),dictionary={'sv-001':{input:'keyboard',language:'sv-SE',words:[['hej'],['hopp'],['tekopp']]},'zh-001':{input:'voice',language:'zh-TW',words:[['你','nǐ','du'],['好','hǎo','bra'],['我喜歡喝茶','wǒ xǐhuān hē chá','Jag tycker om att dricka te.']]}};
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console,AbortController,setTimeout,clearTimeout});
for(const name of ['pinyin','data','language-exercises-data','language-exercises','homework','voice','speech','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows','eggs','home','home-renderer'])vm.runInContext(read('resources/'+name+'.js'),ctx);
const SC=ctx.Starlight,plain=value=>JSON.parse(JSON.stringify(value));
const result=(transcript,isFinal=true)=>Object.assign([{transcript}],{isFinal}),rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
async function load(entry){ctx.fetch=async()=>Response.json({test:entry});return SC.loadHomework('test');}
function game(name,pace){
  const g=new SC[name+'Game']({random:rng(5)});g.start({mode:'homework',lang:SC.modes.homework.lang,pace});g.resize(1000,740);
  if(name==='Home')g.createTask('toys',g.spots.toys[0]);
  if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);}
  if(name==='Egg'){for(const e of g.eggs)e.crackAt=10000;for(let i=0;i<140;i++)g.update(.05);g.crack(g.eggs[0]);}
  for(let i=0;i<500&&!g.getTargets().length;i++)g.update(.05);
  assert(g.getTargets().length,name+' has no homework tasks');return g;
}
function draw(name,g){
  const drawn=[],stack=[],c=new Proxy({font:'16px system-ui',save(){stack.push(this.font);},restore(){this.font=stack.pop();},measureText(text){return {width:String(text).length*Number(this.font.match(/[\d.]+/)?.[0]||16)*.6};},fillText(text,x,y){drawn.push({text,x,y});}},{get:(o,k)=>k in o?o[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
  const renderer=Object.create(SC[name+'Renderer'].prototype);Object.assign(renderer,{game:g,ctx:c,dpr:1,stars:[],reduced:true});renderer.draw();return drawn;
}
(async()=>{
  assert.equal(SC.modes.homework.name,'Läxa');assert.equal(SC.modes.homework.hidden,true);
  const lessons=JSON.parse(read('homework.json'));
  assert.deepEqual(Object.keys(lessons),Array.from({length:7},(_,i)=>'lesson-'+(i+1)));
  assert.deepEqual(Object.values(lessons).map(l=>l.name),['1. 手拉手','2. 好朋友','3. 下課了','4. 校園','5. 遊戲','6. 積木','7. 搭火車']);
  for(const [id,lesson] of Object.entries(lessons)){
    await load(lesson);const items=SC.modes.homework.items;
    assert.equal(new Set(items.map(i=>i.answer)).size,items.length,id+' duplicate words');
    for(const item of items){
      assert(item.hint&&item.translation,id+'/'+item.answer+' needs both hints');
      assert(SC.matches(item.hint,item,'homework','zh-TW','text'));
      const context={lesson:'homework',language:'zh-TW',candidates:[item]};
      for(const text of [item.answer,item.hint])assert.equal(SC.tokenizeSpeech(text,context).length,1,id+'/'+text+' must remain one answer');
      const sent=[],stream=new SC.SpeechStream({getContext:()=>context,enqueue:text=>{sent.push(text);return {text};}}),chars=Array.from(item.answer);
      stream.update([result(chars.slice(0,1).join(''))]);
      if(chars.length>1)stream.update([result(chars[0]),result(chars.slice(1).join(''))]);
      assert.equal(sent.length,1,id+'/'+item.answer+' split recognition must yield one answer');
      assert(SC.matches(sent[0],item,'homework','zh-TW','speech'),id+'/'+item.answer);
    }
  }
  for(const id of Object.keys(dictionary))assert(SC.parseHomework(dictionary,id).items.length);
  for(const id of [null,'','missing','toString','x'.repeat(129)])assert.throws(()=>SC.parseHomework(dictionary,id));
  const good={input:'keyboard',language:'zh-TW',words:[['銀行','yín háng','bank']]};
  for(const change of [{input:'speech'},{language:'zh'},{words:[]},{words:['hello']},{words:[['']]},{words:[['你']]},{words:[['你',null]]},{words:[['你','?']]},{words:[['你','nǐ',5]]},{words:[['你','nǐ','du','extra']]}])assert.throws(()=>SC.parseHomework({test:{...good,...change}},'test'));
  let requests=0;ctx.fetch=async(url,options)=>{requests++;assert.equal(url,'homework.json');assert.equal(options.cache,'no-cache');return Response.json(dictionary);};
  await assert.rejects(SC.loadHomework(null));assert.equal(requests,0);
  await SC.loadHomework('sv-001');assert.equal(requests,1);assert.deepEqual(plain(SC.modes.homework.items.map(i=>i.answer)),['hej','hopp','tekopp']);assert(SC.shortSpeechLesson('homework'));
  await assert.rejects(SC.loadHomework('missing'),/finns inte/);assert.equal(SC.modes.homework.homeworkId,'sv-001');
  assert.equal((await SC.loadHomework('zh-001','keyboard')).input,'keyboard');
  assert.equal((await SC.loadHomework('sv-001','voice')).input,'voice');
  assert.equal((await SC.loadHomework('sv-001')).input,'keyboard','an omitted override uses the JSON default');
  for(const input of ['','typing','browser','invalid'])await assert.rejects(SC.loadHomework('sv-001',input),/input måste vara keyboard eller voice/);
  for(const response of [()=>Response.json({}, {status:404}),()=>new Response('{'),()=>{throw Error('offline');}]){ctx.fetch=async()=>response();await assert.rejects(SC.loadHomework('test'),/kunde inte läsas/);}
  await load(good);const bank=SC.modes.homework.items[0];
  for(const text of ['銀行','yín háng','yin hang','yinhang','yin2 hang2','YIN2HANG2'])for(const source of ['text','speech'])assert(SC.matches(text,bank,'homework','zh-TW',source),text);
  for(const text of ['bank','你','yinxing','yin'])assert(!SC.matches(text,bank,'homework','zh-TW'),text+' must not match');
  assert.equal(SC.chineseSpeechPinyin('銀行'),'yinhang','explicit homework reading overrides the default character reading');
  let speechContext={lesson:'homework',language:'zh-TW',candidates:[bank]},sent=[];
  let stream=new SC.SpeechStream({getContext:()=>speechContext,enqueue:text=>{sent.push(text);return {text};}});
  stream.update([result('銀')]);assert.equal(sent.length,0);stream.update([result('銀'),result('行')]);assert.deepEqual(sent,['銀行']);
  await load({input:'voice',language:'zh-TW',words:[['我喜歡喝茶','wǒ xǐhuān hē chá','Jag tycker om att dricka te.']]});
  assert(!SC.shortSpeechLesson('homework'));
  speechContext.candidates=SC.modes.homework.items;sent=[];stream=new SC.SpeechStream({getContext:()=>speechContext,enqueue:text=>{sent.push(text);return {text};}});
  stream.update([result('我喜歡'),result('喝茶')]);assert.deepEqual(sent,['我喜歡喝茶']);
  await load({input:'voice',language:'sv-SE',words:[['hej på dig'],['tack så mycket']]});
  speechContext={lesson:'homework',language:'sv-SE',candidates:SC.modes.homework.items};sent=[];stream=new SC.SpeechStream({getContext:()=>speechContext,enqueue:text=>{sent.push(text);return {text};}});
  stream.update([result('hej på')]);assert.equal(sent.length,0);stream.update([result('hej på'),result('dig tack så mycket')]);assert.deepEqual(sent,['hej på dig','tack så mycket']);
  await load({input:'voice',language:'sv-SE',words:[['nya ord tillsammans']]});speechContext.candidates=SC.modes.homework.items;
  assert.deepEqual(plain(SC.tokenizeSpeech('nya ord tillsammans',speechContext)),['nya ord tillsammans'],'cached phrase vocabulary must follow the loaded homework');
  for(const entry of [good,{input:'keyboard',language:'en-US',words:[['hello there',null,'hej där']]}]){
    await load(entry);
    for(const name of ['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home'])for(const pace of ['gentle','steady','brave']){
      const g=game(name,pace),target=g.getTargets()[0],item=target.item;
      assert.equal(item.answer,entry.words[0][0]);assert.equal(item.label,item.answer);
      g.clock=target.appearedAt+4.99;assert(!SC.pinyinHints(g).has(target),name+' early hint');
      g.clock=target.appearedAt+5;assert(SC.pinyinHints(g).has(target),name+' missing hint');
      const drawn=draw(name,g),main=drawn.find(t=>t.text===item.label),translation=drawn.find(t=>t.text===item.translation);
      assert(main&&translation&&translation.y>main.y,name+' missing translation');
      if(item.hint)assert(drawn.some(t=>t.text===item.hint&&t.y<main.y),name+' missing pronunciation');
      target.pinyinRevealed=false;g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source)});
      assert(g.queue.enqueue(item.hint||item.answer));assert(!SC.pinyinHints(g).has(target),name+' queued answer should suppress a new hint');
    }
  }
  await load({input:'keyboard',language:'sv-SE',words:[['hej']]});const g=game('City','gentle');g.clock+=10;assert.equal(SC.pinyinHints(g).size,0);
  console.log('PASS homework: dictionary validation, fetch errors, pinyin, phrases, all nine games at three difficulties and optional delayed hints.');
})().catch(error=>{console.error(error);process.exitCode=1;});
