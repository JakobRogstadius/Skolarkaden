'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console,performance});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','homework','speech','input','game','reversi-engine','reversi'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx);
const SC=ctx.Starlight,result=(text,isFinal=false)=>Object.assign([{transcript:text}],{isFinal});
const mode='chineseTrad4',item=answer=>SC.modes[mode].items.find(i=>i.answer===answer);
function harness(items,lesson=mode,language='sv-SE'){
 const queue=new SC.AnswerQueue(),state={candidates:items,active:[]},submitted=[];
 queue.setPolicy({getCandidates:()=>state.candidates,getActiveEntries:()=>state.active,discardUnmatched:e=>e.source==='speech',matches:(e,i)=>SC.matches(e.text,i,lesson,language,e.source),sameInput:(a,b)=>SC.sameInput(a,b,lesson,language)});
 const stream=new SC.SpeechStream({getContext:()=>({lesson,language,candidates:state.candidates}),enqueue:text=>{const e=queue.enqueue(text,'speech');if(e)submitted.push(e);return e;},revise:(e,text)=>queue.revise(e,text)});
 return {queue,state,stream,submitted};
}
for(const lesson of Object.keys(SC.modes).filter(SC.isChinese))for(const i of SC.modes[lesson].items){
 for(const text of [i.translation,...SC.chineseTranslationAnswers(i),i.hint,i.hint.toUpperCase().normalize('NFD')])for(const source of ['text','speech'])assert(SC.matches(text,i,lesson,'sv-SE',source),i.answer+' / '+text+' / '+source);
 // Exercise the streaming recognizer as well as the final answer matcher.
 for(const text of SC.chineseTranslationAnswers(i)){const h=harness([i],lesson);h.stream.update([result(text,true)]);assert.equal(h.queue.length,1,i.answer+' / '+text);assert(SC.matches(h.queue.items[0].text,i,lesson,'sv-SE','speech'));}
}
for(const [hanzi,answers,rejected] of [
 ['日',['sol','dag','SOL!'],['so','dagen','sól']],
 ['羊',['får','get'],['far']],
 ['她們',['de','de (kvinnor)'],['kvinnor']],
 ['嗎',['fråga','fråga (ja/nej)'],['ja','nej']],
 ['回家',['gå hem'],['gå','hem']]
])for(const source of ['text','speech']){
 for(const text of answers)assert(SC.matches(text,item(hanzi),mode,'sv-SE',source),text);
 for(const text of rejected)assert(!SC.matches(text,item(hanzi),mode,'sv-SE',source),text);
}
{
 const h=harness([item('回家'),item('牛奶'),item('學')]);h.stream.update([result('gå')]);assert.equal(h.queue.length,0);
 h.stream.update([result('gå'),result('hem mjölk lära sig',true)]);assert.deepEqual(Array.from(h.queue.items,e=>e.text),['gå hem','mjölk','lära sig']);
 h.stream.update([result('回家牛奶學',true)]);assert.equal(h.submitted.length,3,'recognition revisions must not repeat actions');
}
{
 const h=harness([item('水'),item('牛奶')]);h.stream.update([result('vatten 牛奶',true)]);assert.deepEqual(Array.from(h.queue.items,e=>e.text),['vatten','牛奶']);
 const old=harness([item('水')]);old.stream.update([result('mjölk',true)]);old.state.candidates=[item('牛奶')];old.stream.update([result('mjölk',true)]);assert.equal(old.queue.length,0);
 old.stream.update([result('mjölk',true),result('mjölk',true)]);assert.equal(old.queue.length,1);
 const alternative=harness([item('牛奶')]);alternative.stream.update([Object.assign([{transcript:'fel'},{transcript:'mjölk'}],{isFinal:true})]);assert.equal(alternative.queue.length,1);
}
for(const source of ['text','speech']){
 const h=harness([item('水')]);const entry=h.queue.enqueue('vatten','speech');assert(entry);h.queue.take();h.state.active.push(entry);h.state.candidates=[];
 assert.equal(h.queue.enqueue('shuǐ',source),undefined,'active translation and pinyin are the same answer');
 const copies=harness([item('水'),item('水')]);assert(copies.queue.enqueue('vatten','speech'));assert(copies.queue.enqueue('shuǐ',source));assert.equal(copies.queue.length,2);
}
{
 SC.modes.homework=SC.parseHomework({test:{input:'voice',language:'zh-TW',words:[['大家','dà jiā','alla; allihop'],['朋友','péng yǒu','mina vänner'],['來來來','lái lái lái','Kom, kom, kom!']]}},'test');
 for(const i of SC.modes.homework.items)for(const text of SC.chineseTranslationAnswers(i)){
  assert(SC.matches(text,i,'homework','zh-TW','text'));const h=harness([i],'homework','zh-TW');h.stream.update([result(text,true)]);assert.equal(h.queue.length,1,text);
 }
}
for(const [id,lesson] of Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname,'../homework.json'),'utf8')))){
 SC.modes.homework=SC.parseHomework({[id]:lesson},id);
 for(const i of SC.modes.homework.items)for(const text of SC.chineseTranslationAnswers(i)){
  const h=harness([i],'homework');h.stream.update([result(text,true)]);assert.equal(h.queue.length,1,id+' / '+i.answer+' / '+text);
 }
}
// Both board games use this selector: shared translations must not choose two moves.
for(const [a,b] of [['日','天'],['你','你們'],['羊','山羊']])assert(SC.reversiAnswerOverlap(item(a),item(b),mode,'zh-TW'));
assert.equal(SC.reversiDistinctItems([item('日'),item('天'),item('水')],3,mode,'sv-SE').length,2);
assert(!SC.matches('vatten',{answer:'水',translation:'vatten'},'swedish','sv-SE'));
console.log('PASS Chinese translations, pinyin, Swedish spelling, streamed phrases, alternatives, revisions, stale speech, homework and distinct board choices');
