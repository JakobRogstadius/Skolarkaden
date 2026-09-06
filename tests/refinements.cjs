'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
class Element extends EventTarget{constructor(){super();this.value='';this.button={};}querySelector(){return this.button;}focus(){}setAttribute(){}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'}});
for(const file of ['pinyin','data','voice','speech','input','people','game','foodtruck','plants','garden','beehive','paint'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,n)=>{for(let i=0;i<Math.round(n/.05);i++)g.update(.05);};
let checks=0;function test(name,fn){fn();console.log('PASS '+name);checks++;}
function policy(queue,getCandidates,mode='swedish',lang='sv-SE',getActiveEntries=()=>[]){queue.setPolicy({getCandidates,getActiveEntries,matches:(entry,item)=>SC.matches(entry.text,item,mode,lang,entry.source),sameInput:(a,b)=>SC.sameInput(a,b,mode,lang)});}
const texts=q=>Array.from(q.items,e=>e.text);
function makeInput(){const field=new Element(),form=new Element(),queue=new SC.AnswerQueue(),microphone={snapshot:()=>({samples:new Float32Array(0)}),cancel(){}};const input=new SC.AnswerInput({field,form,queue,microphone,voiceButton:new Element()});input.configure({enabled:false,lesson:'letters'});input.setEnabled(true);return {input,field,form,queue};}
test('Latin letters and bopomofo submit immediately; IME commits once, and words/math still need Enter',()=>{
 const {input,field,form,queue}=makeInput();assert(form.button.hidden);field.value='a';field.dispatchEvent(new Event('input'));assert.deepEqual(texts(queue),['a']);assert.equal(field.value,'');form.dispatchEvent(new Event('submit'));assert.equal(queue.length,1);
 field.value='Bc D';field.dispatchEvent(new Event('input'));assert.deepEqual(texts(queue),['a','B','c','D']);
 input.configure({enabled:false,lesson:'bopomofo'});field.dispatchEvent(new Event('compositionstart'));field.value='ㄆ';field.dispatchEvent(new Event('input'));assert.equal(queue.length,4);field.dispatchEvent(new Event('compositionend'));field.dispatchEvent(new Event('input'));assert.deepEqual(texts(queue).slice(-1),['ㄆ']);
 field.value='1qaz';field.dispatchEvent(new Event('input'));assert.deepEqual(texts(queue).slice(-4),['ㄅ','ㄆ','ㄇ','ㄈ']);
 for(const [lesson,value] of [['swedish','hej'],['math','12'],['chinese','ni']]){input.configure({enabled:false,lesson});assert(!form.button.hidden);const before=queue.length;field.value=value;field.dispatchEvent(new Event('input'));assert.equal(queue.length,before);form.dispatchEvent(new Event('submit'));assert.equal(queue.length,before+1);assert.equal(queue.items.at(-1).text,value);}
 input.configure({enabled:false,lesson:'letters'});input.setEnabled(false);const n=queue.length;field.value='x';field.dispatchEvent(new Event('input'));assert.equal(queue.length,n);input.destroy();
});
test('A burst of mistakes leaves only two pending, while new correct answers remain admissible',()=>{
 const q=new SC.AnswerQueue(),items=['sol','katt','hund'].map(answer=>({answer}));policy(q,()=>items);for(let i=0;i<1000;i++)q.enqueue('fel'+i);assert.deepEqual(texts(q),['fel0','fel1']);q.enqueue('SOL!','speech');q.enqueue('katt');q.enqueue('hund');assert.deepEqual(texts(q),['fel0','fel1','SOL!','katt','hund']);for(let i=0;i<100;i++)q.enqueue('sol');assert.equal(q.length,5);assert.equal(q.take().text,'fel0');q.enqueue('nytt fel');assert.equal(q.length,5);
});
test('One queued entry uses one target; excess duplicates are ignored',()=>{
 const q=new SC.AnswerQueue();policy(q,()=>[{answer:'a'},{answer:'a'}],'letters');for(let i=0;i<50;i++)q.enqueue('a');assert.equal(q.length,2);
 const {input,field,queue}=makeInput();policy(queue,()=>[{answer:'b'}],'letters');field.value='bbbbbbbbbbbbbb';field.dispatchEvent(new Event('input'));assert.deepEqual(texts(queue),['b']);input.destroy();
});
test('Expired targets and speech revisions reapply the limit without reordering retained entries',()=>{
 const q=new SC.AnswerQueue();let items=['sol','katt','hund'].map(answer=>({answer}));policy(q,()=>items);q.enqueue('fel1');q.enqueue('fel2');const correct=q.enqueue('sol');q.enqueue('katt');q.enqueue('hund');q.revise(correct,'solen');assert.deepEqual(texts(q),['fel1','fel2','katt','hund']);items=[];q.reconcile();assert.deepEqual(texts(q),['fel1','fel2']);
 items=[{answer:'katt'}];assert(q.revise(q.items[0],'katt'));q.enqueue('fel3');assert.deepEqual(texts(q),['katt','fel2','fel3']);
});
test('Rejected speech tokens remain deduplicated, while later valid words are queued and raw tokens logged',()=>{
 const q=new SC.AnswerQueue(),items=[{answer:'sea'},{answer:'sun'}],log=[];policy(q,()=>items,'english','en-US');const s=new SC.SpeechStream({getContext:()=>({lesson:'english',language:'en-US',candidates:items}),enqueue:text=>q.enqueue(text,'speech'),revise:(entry,text)=>q.revise(entry,text),trace:(type,data)=>log.push({type,...data})});
 const result=text=>[Object.assign([{transcript:text}],{isFinal:true})];s.update(result('wrong nope extra see son'));assert.deepEqual(texts(q),['wrong','nope','see','son']);q.take();q.take();s.update(result('wrong nope extra see son'));assert.deepEqual(texts(q),['see','son']);assert(log.some(e=>e.type==='queue-skipped'&&e.text==='extra'));
});
test('Every game ignores duplicates of active work',()=>{
 for(const [name,setup] of [['CityGame',g=>g.spawn()],['FoodTruckGame',g=>tick(g,.85)],['GardenGame',g=>{g.pots[0].moisture=.6;g.syncRequests(g.pots[0]);}],['BeehiveGame',g=>g.bloom(g.plants[0])],['PaintGame',()=>{}]]){
  const g=new SC[name]({random:rng(6)});g.start();setup(g);policy(g.queue,()=>g.getAvailableTargets().map(t=>t.item),g.mode,g.lang,()=>g.getActiveEntries());const t=g.getAvailableTargets()[0];assert(t,name);g.queue.enqueue(t.item.answer);g.update(.05);assert(!g.getAvailableTargets().includes(t),name);for(let i=0;i<50;i++)g.queue.enqueue(t.item.answer);assert.equal(g.queue.length,0,name);g.pause();tick(g,2);assert.equal(g.queue.length,0);g.resume();g.update(.05);assert(g.queue.length<=2);
 }
});
test('Children never generate the balding hairstyle or a beard; category probabilities are unchanged',()=>{
 const random=rng(6);let children=0;for(let i=0;i<10000;i++){const p=SC.makePerson(random);if(p.child){children++;assert.equal(p.beard,false);if(!p.feminine)assert.notEqual(p.hairStyle,2);}}assert(children>1700&&children<2100);
});
test('Late-summer flowers remain alive until winter; early flowers still wilt and visited flowers retire',()=>{
 for(const mode of ['swedish','math']){const g=new SC.BeehiveGame({random:rng(7)});g.start({mode});g.elapsed=g.duration*.64;g.nextSpawn=10000;g.plants=g.plants.slice(0,1);const p=g.plants[0];g.bloom(p);assert(p.lateSeason);tick(g,g.timeLeft()-1);assert.equal(p.status,'flower');assert(g.getTargets().includes(p));tick(g,1.1);assert(['mourning','celebrating'].includes(g.state));}
 const early=new SC.BeehiveGame();early.start();early.nextSpawn=10000;const p=early.plants[0];early.bloom(p);tick(early,p.bloomFor+.1);assert.equal(p.status,'wilt');
 const visited=new SC.BeehiveGame();visited.start();visited.elapsed=visited.duration*.65;visited.plants=visited.plants.slice(0,1);const flower=visited.plants[0];visited.bloom(flower);const b=visited.bees[0];b.stage='gather';b.age=.79;b.job={entry:{text:flower.item.answer},target:flower};visited.work(.05);assert(flower.harvested);assert(flower.bloomFor-flower.flowerAge<=4);tick(visited,4.1);assert.equal(flower.status,'wilt');
});
test('Normal bee flights are slower than before, bend away from a straight path and still land',()=>{
 const g=new SC.BeehiveGame();g.start();const b=g.bees[0],from={x:.83,y:.32},to={x:.17,y:.82};Object.assign(b,from);let travel=0,path=0,maxDeviation=0,previous={...from};const lineX=(to.x-from.x)*1.35,lineY=to.y-from.y,direct=Math.hypot(lineX,lineY);let landed=false;
 while(travel<30&&!landed){b.age+=.05;landed=g.move(b,to,.05);travel+=.05;path+=Math.hypot((b.x-previous.x)*1.35,b.y-previous.y);maxDeviation=Math.max(maxDeviation,Math.abs(lineX*(b.y-from.y)-lineY*(b.x-from.x)*1.35)/direct);previous={x:b.x,y:b.y};}
 assert(landed);assert(travel>direct/.185*1.2);assert(path>direct*1.035);assert(maxDeviation>.012);assert.equal(b.x,to.x);assert.equal(b.y,to.y);
});
test('Balloon labels fit short text, reserve room for hints and keep existing width limits',()=>{
 const g=new SC.PaintGame();g.start();g.spawnIn=10000;const p=g.people[0];p.x=.5;const context=new Proxy({},{get:(_,key)=>key==='measureText'?text=>({width:[...text].length*10}):()=>{}});const r=Object.create(SC.PaintRenderer.prototype);r.game=g;r.ctx=context;r.round=()=>{};
 p.item={answer:'a',label:'A'};r.labels();const single=r.labelBoxes[0].w;p.item.label='ko';r.labels();const short=r.labelBoxes[0].w;p.item.label='vattenkanna';r.labels();const long=r.labelBoxes[0].w;assert(single<=40);assert(short<=44);assert(long>short*2);assert(long<=154);g.mode='chinese';g.hints=true;p.item.label='一';p.item.hint='yi';r.labels();assert(r.labelBoxes[0].w>=40);
});
console.log(checks+' input and visual-refinement checks passed.');
