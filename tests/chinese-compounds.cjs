'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','speech','input'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,result=(text,isFinal=false)=>Object.assign([{transcript:text}],{isFinal});
const item=(text,mode='chineseTrad4')=>{const value=SC.modes[mode].items.find(i=>i.answer===text);assert(value,text);return value;};
function harness(words,mode='chineseTrad4'){
 const queue=new SC.AnswerQueue(),state={candidates:words.map(w=>item(w,mode)),active:[]},submitted=[];
 const context=()=>({lesson:mode,language:SC.modes[mode].lang,candidates:state.candidates});
 queue.setPolicy({getCandidates:()=>state.candidates,getActiveEntries:()=>state.active,matches:(e,i)=>SC.matches(e.text,i,mode,context().language,e.source),sameInput:(a,b)=>SC.sameInput(a,b,mode,context().language)});
 const stream=new SC.SpeechStream({getContext:context,enqueue:text=>{const e=queue.enqueue(text,'speech');if(e)submitted.push(e);return e;},revise:(e,text)=>queue.revise(e,text)});
 return {queue,state,submitted,stream,context};
}
let checks=0;function test(name,fn){fn();console.log('PASS '+name);checks++;}
test('Every compound accepts Hanzi and spaced, joined, accented and numbered pinyin as a whole answer',()=>{
 for(const mode of ['chineseTrad3','chineseTrad4','chineseSimpl3','chineseSimpl4'])for(const i of SC.modes[mode].items.filter(i=>Array.from(i.answer).length===2)){
  const numbered=i.hint.split(' ').map(SC.tonelessPinyinNumber),plain=numbered.map(s=>s.slice(0,-1));
  for(const text of [i.answer,i.hint,i.hint.replace(/ /g,''),...i.aliases])assert(SC.matches(text,i,mode,SC.modes[mode].lang,'text'),i.answer+' / '+text);
  for(const text of [plain.join(' ').toUpperCase(),plain.join(''),numbered.join(' '),numbered.join(''),i.hint.normalize('NFD')])assert(SC.matches(text,i,mode,SC.modes[mode].lang,'speech'),i.answer+' / '+text);
  assert(!SC.matches(Array.from(i.answer)[0],i,mode,SC.modes[mode].lang,'speech'));assert(!SC.matches(plain[0],i,mode,SC.modes[mode].lang,'speech'));
 }
});
test('Compound speech accepts paired scripts and tone-free homophones, with word-specific pronunciations',()=>{
 for(const [target,heard] of [['牛奶','妞乃'],['你好','泥好'],['我們','我们'],['家長','家长'],['女兒','女儿']])assert(SC.matches(heard,item(target),'chineseTrad4','zh-CN','speech'));
 for(const heard of ['jia zhang','jiā zhǎng','jia1zhang3','家长'])assert(SC.matches(heard,item('家長'),'chineseTrad4','zh-CN','speech'));
 for(const heard of ['jia chang','家常','牛來','niú','lu er'])assert(!SC.matches(heard,item(heard==='lu er'?'女兒':heard.startsWith('jia')||heard==='家常'?'家長':'牛奶'),'chineseTrad4','zh-CN','speech'));
 assert.equal(item('肚子').hint,'dù zi');
});
test('Interim single-character prefixes wait for a visible compound, and final single answers still work',()=>{
 for(const prefix of ['你','ni','nǐ','ni3']){const h=harness(['你','好','你好']);h.stream.update([result(prefix)]);assert.equal(h.queue.length,0);h.stream.update([result('你好')]);assert.equal(h.queue.length,1);assert.equal(h.queue.items[0].text,'你好');h.stream.update([result('你好',true)]);assert.equal(h.submitted.length,1);}
 const h=harness(['你','你好']);h.stream.update([result('你',true)]);assert.equal(h.queue.length,1);assert.equal(h.queue.items[0].text,'你');
});
test('Consecutive compounds, punctuation and separately targeted characters keep the right boundaries',()=>{
 const h=harness(['你好','牛奶','下雨']);h.stream.update([result('你好牛奶，下雨。')]);assert.deepEqual(Array.from(h.queue.items,e=>e.text),['你好','牛奶，','下雨。']);
 const singles=harness(['你','好']);singles.stream.update([result('你好')]);assert.deepEqual(Array.from(singles.queue.items,e=>e.text),['你','好']);
 const punct=harness(['你','好','你好']);punct.stream.update([result('你，好。')]);assert.deepEqual(Array.from(punct.queue.items,e=>e.text),['你，','好。']);
});
test('Compound revisions retain one answer after consumption, including result-boundary changes',()=>{
 for(const final of [false,true]){const h=harness(['我們']);h.stream.update([result('我們',final)]);const e=h.queue.take();h.state.active.push(e);h.state.candidates=[];
  for(const transcripts of [[result('我们',final)],[result('wo3 men5',final)],[result('我',final),result('們',final)],[result('wǒ',final),result('men',final)]]){h.stream.update(transcripts);assert.equal(h.submitted.length,1);assert.equal(h.queue.length,0);}
 }
 const h=harness(['牛奶']);h.stream.update([result('牛')]);h.stream.update([result('牛'),result('奶')]);assert.equal(h.submitted.length,1);assert.equal(h.queue.items[0].text,'牛奶');
});
test('Pinyin syllables and corrected homophones are grouped without duplicate actions',()=>{
 const h=harness(['牛奶','你好']);h.stream.update([result('niu')]);assert.equal(h.queue.length,0);h.stream.update([result('niu nai ni hao')]);assert.equal(h.queue.length,2);h.stream.update([result('妞乃你好',true)]);assert.equal(h.submitted.length,2);assert(h.queue.items.every((e,i)=>SC.matches(e.text,item(i?'你好':'牛奶'),'chineseTrad4','zh-CN','speech')));
});
test('The existing queue allows repeated compounds only when another matching target remains',()=>{
 for(const count of [1,2]){const h=harness(Array(count).fill('牛奶'));h.stream.update([result('牛奶牛奶牛奶',true)]);assert.equal(h.queue.length,count);assert.equal(h.submitted.length,count);}
});
test('Mixed digits in compounds work without changing character-number or math splitting',()=>{
 const h=harness(['一天']);h.stream.update([result('1天')]);assert.equal(h.queue.length,1);assert(SC.matches(h.queue.items[0].text,item('一天'),'chineseTrad4','zh-TW','speech'));
 const c={lesson:'chinese',language:'zh-CN',candidates:[item('三'),item('八')]};assert.deepEqual(Array.from(SC.tokenizeSpeech('38',c)),['3','8']);assert.deepEqual(Array.from(SC.tokenizeSpeech('38',{lesson:'math3',language:'zh-CN'})),['38']);
});
console.log(checks+' Mandarin compound checks passed.');
