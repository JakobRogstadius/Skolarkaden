'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','speech','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows','eggs'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const tick=(g,t)=>{for(let i=0;i<Math.round(t/.05);i++)g.update(.05);};
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const modes=Object.keys(SC.modes),math=modes.filter(SC.isMath),chinese=modes.filter(SC.isChinese);
test('Twenty exercises have the requested order and complete, distinct dictionaries',()=>{
 assert.deepEqual(modes,['letters','swedish','swedishLong','english','englishLong','bopomofo','chinese','chineseTrad2','chineseTrad3','chineseTrad4','chineseSimpl1','chineseSimpl2','chineseSimpl3','chineseSimpl4','math','math2','math3','math4','math5','math6']);
 for(const mode of ['swedish','swedishLong','english','englishLong',...chinese]){
  const items=SC.modes[mode].items;assert.equal(items.length,100,mode);assert.equal(new Set(items.map(i=>i.answer)).size,100,mode);
  for(const i of items){assert.equal(i.answer,i.label);assert(SC.matches(i.answer,i,mode));}
 }
 for(const mode of ['swedish','english'])assert(SC.modes[mode].items.every(i=>i.answer.length<=5),mode);
 for(const mode of ['swedishLong','englishLong'])assert(SC.modes[mode].items.every(i=>i.answer.length>=6&&i.answer.length<=12),mode);
 for(const group of [chinese.slice(0,4),chinese.slice(4)])assert.equal(new Set(group.flatMap(mode=>Array.from(SC.modes[mode].items,i=>i.answer))).size,400);
 for(let level=0;level<4;level++)for(let i=0;i<100;i++){
  const trad=SC.modes[chinese[level]].items[i],simpl=SC.modes[chinese[level+4]].items[i];assert.equal(trad.hint,simpl.hint);assert.equal(Array.from(trad.answer).length,1);
  for(const [mode,item] of [[chinese[level],trad],[chinese[level+4],simpl]])assert(SC.matches(item.hint,item,mode,'zh-TW','speech'),mode+' '+item.answer);
 }
 for(const [a,b] of [['貓','猫'],['聽','听'],['體','体'],['幾','几'],['麼','么'],['湯','汤'],['從','从']]){
  const t=chinese.slice(0,4).flatMap(m=>Array.from(SC.modes[m].items,i=>i.answer)),s=chinese.slice(4).flatMap(m=>Array.from(SC.modes[m].items,i=>i.answer));assert.equal(t.indexOf(a),s.indexOf(b));assert(t.includes(a));
 }
});
const evaluate=label=>Function('return '+label.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-'))();
test('Every arithmetic prompt satisfies its fixed lesson and answer range',()=>{
 for(let level=0;level<5;level++){
  const operations=new Set();
  for(const [n,labels] of SC.mathPool(level))for(const label of labels){
   const m=label.match(/^(\d+) ([+−×÷]) (\d+)$/);assert(m,label);const [,a,o,b]=m;operations.add(o);assert.equal(evaluate(label),n,label);assert(n>=0&&n<=200);
   if(level===0)assert(+a<=10&&+b<=10&&n<=20);
   if(level===1)assert(+a<=20&&+b<=20&&n<=20);
   if(level===2)assert(+a>=10&&+a<=100&&+b>=10&&+b<=100);
   if(o==='×')assert(+a>=1&&+a<=10&&+b>=1&&+b<=10);
   if(o==='÷')assert(+b>=1&&+b<=10&&n>=1&&n<=10&&+a<=100);
  }
  assert.deepEqual([...operations].sort(),[['+'],['+','−'],['+','−'],['×'],['×','÷']][level].sort());
 }
 assert(SC.mathPool(2).has(0)&&SC.mathPool(2).has(200));assert(!SC.mathPool(2).has(1e3));
});
test('Equations use normal precedence, one or two operators, and a unique positive integer solution',()=>{
 const random=rng(444),operators=new Set(),lengths=new Set(),positions=new Set();
 for(const [answer,groups] of SC.mathPool(5)){
  assert(answer>0&&Number.isInteger(answer));assert(groups.every(group=>group.length>0));
  for(const labels of groups)for(const label of labels){
   assert(!/[()]/.test(label));assert.equal((label.match(/x/g)||[]).length,1);const [left,right]=label.split(' = '),ops=left.match(/[+−×÷]/g);assert(ops.length===1||ops.length===2);
   assert.equal(evaluate(left.replace('x',answer)),Number(right),label);for(const o of ops)operators.add(o);lengths.add(ops.length);positions.add(left.split(' ').indexOf('x'));
  }
  for(let i=0;i<80;i++){
   const item=SC.makeMath(answer,random,5),[left,right]=item.label.split(' = ');let solutions=0;
   for(let x=1;x<=200;x++)if(Math.abs(evaluate(left.replace('x',x))-Number(right))<1e-9){assert.equal(x,answer,item.label);solutions++;}
   assert.equal(solutions,1,item.label);
  }
 }
 assert.equal(operators.size,4);assert.equal(lengths.size,2);assert.equal(positions.size,3);
});
test('Spoken integers 0–200 round-trip and multiword numbers stay intact',()=>{
 for(const lang of ['sv-SE','en-US','zh-CN','zh-TW'])for(let n=0;n<=200;n++){
  const item={answer:String(n)},spoken=SC.numberName(n,lang);assert(SC.matches(spoken,item,'math3',lang,'speech'),lang+' '+spoken);
  assert.deepEqual(Array.from(SC.tokenizeSpeech(spoken,{lesson:'math3',language:lang})),[spoken]);
 }
 const samples=[['en-US','one hundred and twenty three',123],['sv-SE','ett hundra tjugo tre',123],['zh-CN','一百零八',108],['zh-TW','兩',2]];
 for(const [language,phrase,n] of samples){assert.equal(SC.spokenNumber(phrase,language),n);assert.deepEqual(Array.from(SC.tokenizeSpeech(phrase,{lesson:'math3',language})),[phrase]);}
 const context={lesson:'math3',language:'en-US'};
 assert.deepEqual(Array.from(SC.tokenizeSpeech('twenty three, four one hundred five',context)),['twenty three,','four','one hundred five']);
 assert.deepEqual(Array.from(SC.tokenizeSpeech('one two',context)),['one','two']);
 assert.deepEqual(Array.from(SC.tokenizeSpeech('minus one hundred twenty three point five',context)),['minus one hundred twenty three point five']);
 for(const text of ['-123','123.5','123cats','minus one hundred','201'])assert.equal(SC.spokenNumber(text,'en-US'),null);
 const out=[],stream=new SC.SpeechStream({getContext:()=>({...context,candidates:[{answer:'1'},{answer:'100'},{answer:'123'}]}),enqueue:text=>{out.push(text);return {text};}}),result=(text,final=false)=>Object.assign([{transcript:text}],{isFinal:final});
 stream.update([result('one')]);stream.update([result('one hundred')]);stream.update([result('one hundred twenty three')]);assert.equal(out.length,0);stream.update([result('123',true)]);assert.deepEqual(out,['123']);
 for(const lesson of ['math4','math5']){const sent=[],s=new SC.SpeechStream({getContext:()=>({lesson,language:'en-US',candidates:[{answer:'1'},{answer:'100'}]}),enqueue:text=>{sent.push(text);return {text};}});s.update([result('one')]);s.update([result('one hundred')]);assert.equal(sent.length,0);s.update([result('100',true)]);assert.deepEqual(sent,['100']);}
});
function firstTarget(name,mode){
 const g=new SC[name+'Game']({random:rng(9)});g.start({mode,lang:SC.modes[mode].lang});g.resize(1000,740);
 if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);}
 if(name==='Egg'){g.eggs.forEach(e=>e.crackAt=10000);tick(g,7);g.crack(g.eggs[0]);}
 for(let i=0;i<100&&!g.getTargets().length;i++)g.update(.05);
 const target=g.getTargets()[0];assert(target,name+'/'+mode);return {g,target};
}
test('Every game supports every math lesson, fixed across correct answers, mistakes, waiting, pause and replay',()=>{
 for(const name of ['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg'])for(const mode of math){
  const {g,target}=firstTarget(name,mode),level=SC.mathLevel(mode),oldItem=target.item,old=oldItem.label;
  assert.equal(target.item.mathLevel,level,name+'/'+mode);assert.equal(g.mathPractice,undefined);
  g.queue.enqueue(target.item.answer);tick(g,.05);for(let i=0;i<5;i++)g.queue.enqueue('wrong '+i);tick(g,15);assert.equal(oldItem.label,old);
  assert(g.getTargets().every(t=>t.item.mathLevel===level));g.pause();const elapsed=g.elapsed;tick(g,5);assert.equal(g.elapsed,elapsed);g.resume();
  g.start({mode});assert.equal(g.mode,mode);assert.equal(g.mathPractice,undefined);assert(g.getTargets().every(t=>t.item.mathLevel===level));
 }
});
test('All Chinese lessons retain delayed pinyin, queued-answer suppression and tone-free matching in every game',()=>{
 for(const name of ['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg'])for(const mode of chinese){
  const {g,target}=firstTarget(name,mode);assert(!SC.pinyinHints(g).has(target));g.clock=target.appearedAt+5.1;assert(SC.pinyinHints(g).has(target));target.pinyinRevealed=false;
  g.queue.enqueue(target.item.hint,'speech');assert(!SC.pinyinHints(g).has(target),name+'/'+mode+' queued');
 }
 for(const mode of ['chinese','chineseSimpl1'])for(const language of ['zh-CN','zh-TW']){
  const item=SC.modes[mode].items.find(i=>i.answer==='山');for(const text of ['山','shan','shān','shan1','杉','衫','善'])assert(SC.matches(text,item,mode,language,'speech'),text);
  for(const text of ['三','san','si','shi'])assert(!SC.matches(text,item,mode,language,'speech'),text);
 }
});
console.log(checks+' exercise-catalogue and fixed-maths checks passed.');
