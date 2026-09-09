'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','speech','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows','eggs'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const tick=(g,t)=>{for(let i=0;i<Math.round(t/.05);i++)g.update(.05);};
const result=(text,final=false)=>Object.assign([{transcript:text}],{isFinal:final});
const item=answer=>SC.modes.bopomofo.items.find(i=>i.answer===answer);
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const examples=[['ㄅ','bō','波'],['ㄆ','pō','坡'],['ㄇ','mō','摸'],['ㄈ','fó','佛'],['ㄉ','de','的'],['ㄊ','tè','特'],['ㄋ','ne','呢'],['ㄌ','lè','勒'],['ㄍ','gē','哥'],['ㄎ','kē','科'],['ㄏ','hē','喝'],['ㄐ','jī','基'],['ㄑ','qī','七'],['ㄒ','xī','西'],['ㄓ','zhī','知'],['ㄔ','chī','吃'],['ㄕ','shī','師'],['ㄖ','rì','日'],['ㄗ','zī','資'],['ㄘ','cí','詞'],['ㄙ','sī','思'],['ㄧ','yī','一'],['ㄨ','wǔ','五'],['ㄩ','yú','魚'],['ㄚ','ā','啊'],['ㄛ','ō','喔'],['ㄜ','é','鵝'],['ㄝ','ê','耶'],['ㄞ','ài','愛'],['ㄟ','ei','誒'],['ㄠ','āo','凹'],['ㄡ','ōu','歐'],['ㄢ','ān','安'],['ㄣ','ēn','恩'],['ㄤ','áng','昂'],['ㄥ','eng','鞥'],['ㄦ','ér','兒']];
test('All 37 symbols accept their spoken names and Hanzi transcriptions in both Mandarin locales',()=>{
 assert.equal(examples.length,37);
 for(const language of ['zh-CN','zh-TW'])for(const [symbol,pinyin,character] of examples){
  for(const heard of [symbol,pinyin,SC.tonelessPinyinNumber(pinyin),character]){
   assert(SC.matches(heard,item(symbol),'bopomofo',language,'speech'),heard+' → '+symbol);
   assert.equal(SC.speechIdentity(heard,'bopomofo',language),symbol);
   assert(SC.sameInput({text:heard,source:'speech'},{text:symbol,source:'text'},'bopomofo',language));
   assert.equal(SC.modes.bopomofo.items.filter(i=>SC.matches(heard,i,'bopomofo',language,'speech')).length,1,heard+' must identify one symbol');
  }
 }
});
test('Homophones and explicit polyphonic readings work without changing Chinese matching or keyboard keys',()=>{
 for(const [symbol,heard] of [['ㄅ','播'],['ㄈ','佛'],['ㄌ','樂'],['ㄌ','乐'],['ㄣ','嗯'],['ㄕ','是'],['ㄕ','事'],['ㄕ','10'],['ㄧ','1'],['ㄩ','鱼'],['ㄩ','雨'],['ㄦ','儿'],['ㄝ','也']])assert(SC.matches(heard,item(symbol),'bopomofo','zh-TW','speech'),heard);
 for(const [symbol,heard] of [['ㄙ','shi'],['ㄕ','si'],['ㄅ','bao'],['ㄓ','zi'],['ㄗ','zhi'],['ㄜ','ê'],['ㄝ','e'],['ㄝ','ei'],['ㄟ','ê'],['ㄥ','en'],['ㄣ','eng'],['ㄩ','wu'],['ㄨ','yu'],['ㄅ','1']])assert(!SC.matches(heard,item(symbol),'bopomofo','zh-TW','speech'),heard+' must not match '+symbol);
 for(const heard of ['bo','波','b'])assert(!SC.matches(heard,item('ㄅ'),'bopomofo','zh-TW','text'));
 assert.equal(SC.toBopomofo('1qaz'),'ㄅㄆㄇㄈ');assert.equal(SC.toBopomofo('5'),'ㄓ');
 assert(!SC.matches('波',{answer:'ㄅ'},'chinese','zh-TW','speech'));
 assert.equal(SC.chineseSpeechPinyin('佛'),'fu','Bopomofo overrides must stay local');
});
function harness(symbols=['ㄅ','ㄆ','ㄇ','ㄈ']){
 const q=new SC.AnswerQueue(),state={lesson:'bopomofo',language:'zh-TW',candidates:symbols.map(item)},active=[],trace=[];
 q.setPolicy({getCandidates:()=>state.candidates,getActiveEntries:()=>active,matches:(e,i)=>SC.matches(e.text,i,state.lesson,state.language,e.source),sameInput:(a,b)=>SC.sameInput(a,b,state.lesson,state.language)});
 const stream=new SC.SpeechStream({getContext:()=>state,enqueue:text=>q.enqueue(text,'speech'),revise:(entry,text)=>q.revise(entry,text),trace:(type,data)=>trace.push({type,...data})});
 return {q,state,active,stream,trace};
}
test('Unspaced Hanzi submit early; pinyin, tone and symbol revisions do not create duplicate jobs',()=>{
 const h=harness();h.stream.update([result('波坡摸佛')]);assert.deepEqual(Array.from(h.q.items,e=>e.text),['波','坡','摸','佛']);
 h.active.push(h.q.take());h.state.candidates.shift();h.stream.update([result('bō pō mō fó')]);assert.equal(h.q.length,3);assert.equal(h.active[0].text,'波');
 h.stream.update([result('ㄅˉㄆˊㄇˇㄈˋ',true)]);assert.equal(h.q.length,3);assert.equal(h.active.length,1);assert(!h.q.enqueue('播','speech'));
 assert(h.trace.some(e=>e.type==='queued-early'&&e.text==='波'),'raw diagnostic tokens remain available');
 const repeat=harness(['ㄅ','ㄅ']);repeat.stream.update([result('波波',true)]);assert.equal(repeat.q.length,2);assert(!repeat.q.enqueue('bo','speech'));
});
test('Spoken digit runs and literal tone marks retain token boundaries, while maths stays intact',()=>{
 const h=harness(['ㄧ','ㄑ','ㄙ','ㄕ']);h.stream.update([result('17410')]);assert.deepEqual(Array.from(h.q.items,e=>e.text),['1','7','4','10']);h.stream.update([result('一七四十',true)]);assert.equal(h.q.length,4);
 assert.deepEqual(Array.from(SC.tokenizeSpeech('˙ㄅ ㄆˊ ㄇˇ ㄈˋ',{lesson:'bopomofo',language:'zh-TW'})),['˙ㄅ','ㄆˊ','ㄇˇ','ㄈˋ']);
 assert.deepEqual(Array.from(SC.tokenizeSpeech('17410',{lesson:'math-large-numbers',language:'zh-TW'})),['17410']);
 const wrong=harness(['ㄅ']);wrong.stream.update([result('山水火波',true)]);assert.equal(wrong.q.length,3);assert(SC.matches(wrong.q.items.at(-1).text,item('ㄅ'),'bopomofo','zh-TW','speech'));
});
test('Every game consumes a recognized bopomofo answer through the shared speech queue',()=>{
 for(const name of ['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg'])for(const language of ['zh-TW','zh-CN']){
  const g=new SC[name+'Game']({random:rng(9)});g.start({mode:'bopomofo',lang:language,items:[item('ㄅ')]});g.resize(1000,740);
  if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);}
  if(name==='Egg'){g.eggs.forEach(e=>e.crackAt=10000);tick(g,7);g.eggs[0].x=g.player.x+.04;g.eggs[0].y=g.player.y;g.crack(g.eggs[0]);}
  for(let i=0;i<100&&!g.getTargets().length;i++)g.update(.05);
  const target=g.getTargets()[0];assert(target,name);g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});
  const stream=new SC.SpeechStream({getContext:()=>({lesson:g.mode,language:g.lang,candidates:g.getTargets().map(t=>t.item)}),enqueue:text=>g.queue.enqueue(text,'speech'),revise:(entry,text)=>g.queue.revise(entry,text)});
  stream.update([result('波')]);assert.equal(g.queue.length,1,name);g.work(.05);assert.equal(g.queue.length,0,name);assert(g.getActiveEntries().length>0,name);assert(!g.getAvailableTargets().includes(target),name);
  stream.update([result('bo',true)]);assert.equal(g.queue.length,0,name+' revision');
 }
});
test('The game picker has an accessible name without the small visible instruction',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert(!html.includes('Välj ett spel'));assert.match(html,/<fieldset class="game-picker" aria-label="Spel">/);
});
console.log(checks+' bopomofo speech checks passed.');
