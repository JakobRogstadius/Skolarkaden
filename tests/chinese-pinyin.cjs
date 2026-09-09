'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent});
for(const name of ['pinyin','data','speech','input','people','game','foodtruck','plants','garden','beehive','paint'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+name+'.js'),'utf8'),ctx);
const SC=ctx.Starlight,result=(text,isFinal=false)=>Object.assign([{transcript:text}],{isFinal}),item=char=>SC.modes.chinese.items.find(i=>i.answer===char);
const matches=(text,char,source='speech')=>SC.matches(text,item(char),'chinese','zh-CN',source);
let checks=0;function test(name,fn){fn();console.log('PASS '+name);checks++;}
test('Bundled dictionary covers unseen simplified and traditional homophones of every target',()=>{
 assert.equal(Object.keys(SC.mandarinPinyin).length,SC.pinyinDataInfo.characters);assert(SC.pinyinDataInfo.characters>40000);
 for(const [target,variants] of [['一','衣医醫椅'],['二','儿兒耳'],['三','散伞傘'],['四','寺死'],['五','无無舞'],['六','流留柳'],['七','起气氣'],['八','把爸罢罷'],['九','酒久旧舊'],['十','是事时時师師'],['人','仁认認忍'],['山','衫闪閃'],['水','睡谁誰'],['火','伙货貨活'],['日','日'],['月','越跃躍'],['大','打答'],['小','笑校'],['口','扣'],['手','收寿壽']]){
  for(const heard of variants){assert(matches(heard,target),heard+' → '+target);assert.equal(SC.speechIdentity(heard,'chinese','zh-CN'),SC.speechIdentity(target,'chinese','zh-CN'));}
 }
});
test('Tone-free pinyin accepts tone marks, numbered tones, case and decomposed accents',()=>{
 for(const target of SC.modes.chinese.items){
  const pinyin=SC.tonelessPinyin(target.hint);
  assert(matches(target.hint.normalize('NFD'),target.answer));
  for(let tone=0;tone<=5;tone++)assert(matches(pinyin.toUpperCase()+tone,target.answer));
 }
 for(const text of ['SHÌ!','shǐ','shī','shí','“shi4”'])assert(matches(text,'十'));
});
test('Only tone differences are relaxed; syllables, syllable count and distinct vowels stay different',()=>{
 for(const [heard,target] of [['死','十'],['是','四'],['上','山'],['舒','水'],['六','月'],['shi shui','十'],['shishui','十'],['未知','十'],['-10','十'],['10.5','十']])assert(!matches(heard,target),heard+' / '+target);
 for(const text of ['lǚ','lǜ','lü3','lv4','lu:4','吕','呂','绿','綠'])assert.equal(SC.chineseSpeechPinyin(text),'lü');
 assert.equal(SC.chineseSpeechPinyin('路'),'lu');assert.notEqual(SC.chineseSpeechPinyin('路'),SC.chineseSpeechPinyin('绿'));
 assert(!SC.matches('路',{answer:'吕',hint:'lǚ',aliases:[]},'chinese','zh-CN','speech'));
});
test('Typing and arithmetic retain their original matching rules',()=>{
 assert(!matches('是','十','text'));assert(!matches('SHI4','十','text'));assert(matches('shi','十','text'));assert(matches('shi2','十','text'));
 for(const text of ['把','爸','ba4'])assert(!SC.matches(text,{answer:'8'},'math-addition','zh-CN','speech'));
 assert(SC.matches('8',{answer:'8'},'math-addition','zh-CN','speech'));assert.equal(SC.speechIdentity('see','english','en-US'),'sea');
});
test('Equivalent speech spans keep raw text, deduplicate revisions and consume one target per answer',()=>{
 const q=new SC.AnswerQueue(),active=[],log=[];let candidates=[item('十'),item('水')];
 q.setPolicy({getCandidates:()=>candidates,getActiveEntries:()=>active,matches:(e,i)=>SC.matches(e.text,i,'chinese','zh-CN',e.source),sameInput:(a,b)=>SC.sameInput(a,b,'chinese','zh-CN')});
 const stream=new SC.SpeechStream({getContext:()=>({lesson:'chinese',language:'zh-CN',candidates}),enqueue:text=>q.enqueue(text,'speech'),revise:(e,text)=>q.revise(e,text),trace:(type,data)=>log.push({type,...data})});
 stream.update([result('是睡')]);assert.deepEqual(Array.from(q.items,e=>e.text),['是','睡']);assert(log.some(e=>e.type==='queued-early'&&e.text==='是'));
 const first=q.take();active.push(first);candidates=[item('水')];stream.update([result('10 水')]);stream.update([result('十水',true)]);assert.equal(q.length,1);assert.equal(first.text,'是');
 assert.equal(q.enqueue('事','speech'),undefined);assert.equal(q.enqueue('誰','speech'),undefined);
 candidates.push({...item('十'),answer:'事',hint:'shì'});assert(q.enqueue('市','speech'));assert.equal(q.enqueue('師','speech'),undefined);
 const second=q.take();assert(SC.matches(second.text,item('水'),'chinese','zh-CN','speech'));assert.equal(q.take().text,'市');
});
for(const language of ['zh-CN','zh-TW'])for(const name of ['CityGame','FoodTruckGame','GardenGame','BeehiveGame','PaintGame'])test(name+' / '+language+' accepts homophones, revisions and number aliases as exactly two actions',()=>{
 let seed=7;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},events=[];
 const g=new SC[name]({random,onEvent:e=>events.push(e)});g.start({mode:'chinese',lang:language,items:[item('十'),item('水')]});
 if(name==='CityGame'){g.spawn();g.spawn();}
 if(name==='FoodTruckGame'){g.spawn();for(const c of g.customers)c.status='waiting';}
 if(name==='GardenGame'){g.decayInterval=100;for(const p of g.pots.slice(0,2)){p.moisture=.6;g.syncRequests(p);}}
 if(name==='BeehiveGame'){for(const p of g.plants.slice(0,2))g.bloom(p);}
 if(name==='PaintGame'){g.spawn();g.people.forEach((p,i)=>p.x=.25+i*.45);}
 g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,item)=>SC.matches(e.text,item,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});
 const stream=new SC.SpeechStream({getContext:()=>({lesson:g.mode,language:g.lang,candidates:g.getTargets().map(t=>t.item)}),enqueue:text=>g.queue.enqueue(text,'speech'),revise:(e,text)=>g.queue.revise(e,text)});
 stream.update([result('是')]);g.update(.05);assert.equal(g.getActiveEntries().length,1);
 stream.update([result('事睡')]);assert.equal(g.queue.length,1);assert.equal(g.queue.items[0].text,'睡');
 stream.update([result('10 水',true)]);stream.update([result('十水',true)]);assert.equal(g.queue.length,1);
 for(let i=0;i<600&&g.hits<2;i++)g.update(.05);
 assert.equal(g.hits,2);assert.equal(g.queue.length,0);assert(!events.some(e=>['miss','waste','think'].includes(e.type)));
});
console.log(checks+' tone-free Chinese speech checks passed.');
