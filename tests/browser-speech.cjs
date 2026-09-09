'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
class Element extends EventTarget{constructor(){super();this.value='';this.button={};}querySelector(){return this.button;}focus(){}setAttribute(){}}
const timers=new Map();let timerId=0,opens=0,stops=0,prepared=0;
const track={enabled:true,clone(){return {enabled:true,stop(){stops++;}};}};
const mic={ready:false,recording:false,stream:{getAudioTracks:()=>[track]},async open(){prepared++;if(!this.ready){opens++;this.ready=true;}},begin(){this.recording=true;},snapshot(){return {samples:new Float32Array(20),sampleRate:16000};},cancel(){this.recording=false;}};
mic.options={processing:true,deviceId:''};mic.configure=async function(options){this.options=options;await this.open();};
const sessions=[];class Recognition{start(t){this.track=t;sessions.push(this);this.onstart?.();}stop(){this.stopped=true;}abort(){this.aborted=true;}}
const context=vm.createContext({Event,EventTarget,CustomEvent,Float32Array,console,navigator:{userAgent:'Chrome/145'},SpeechRecognition:Recognition,setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)});
for(const f of ['pinyin','data','voice','speech','input'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+f+'.js'),'utf8'),context);
const SC=context.Starlight,queue=new SC.AnswerQueue(),field=new Element(),form=new Element(),button=new Element();
const input=new SC.AnswerInput({field,form,voiceButton:button,queue,microphone:mic});let diagnostic=[];input.addEventListener('diagnostic',e=>diagnostic.push(e.detail));
const result=(text,final=false)=>Object.assign([{transcript:text,confidence:.4}],{isFinal:final});
const fire=(r,results,index=0)=>r.onresult({results,resultIndex:index});
for(const lesson of ['letters','swedish','english','bopomofo','math-addition','math-diagrams','math-addition-subtraction','math-simple-equations','math-equations','chinese','chineseTrad2','chineseTrad3','chineseSimpl1','chineseSimpl2','chineseSimpl3'])assert.equal(SC.shortSpeechLesson(lesson),true,lesson);
for(const lesson of ['swedishLong','englishLong','math-large-numbers','math-multiplication','math-multiplication-division','chineseTrad4','chineseSimpl4'])assert.equal(SC.shortSpeechLesson(lesson),false,lesson);
SC.modes.compoundTest={type:'chinese',items:[{answer:'人'},{answer:'人口'},{answer:'大人'}]};
assert.equal(SC.shortSpeechLesson('compoundTest'),false);delete SC.modes.compoundTest;
(async()=>{
 input.configure({enabled:true,kind:'browser',language:'sv-SE',lesson:'swedish'});await input.prepare();input.setEnabled(true);input.start();let r=sessions.at(-1);
 assert.equal(r.continuous,true);assert.equal(r.interimResults,true);assert.equal(r.track.enabled,true);
 assert.equal(mic.options.shortInput,true);
 fire(r,[result('sol ka')]);fire(r,[result('sol katt')]);assert.equal(queue.length,0);
 fire(r,[result('SOL! katt katt OVÄNTAT?',true)]);assert.deepEqual(Array.from(queue.items,x=>x.text),['SOL!','katt','katt','OVÄNTAT?']);
 fire(r,[result('SOL! katt katt OVÄNTAT?',true),result('hund')],1);assert.equal(queue.length,4);
 fire(r,[result('SOL! katt katt OVÄNTAT?',true),result('hund',true),result('hund',true)],1);assert.deepEqual(Array.from(queue.items.slice(-2),x=>x.text),['hund','hund']);
 assert.equal(diagnostic.find(x=>x.type==='final').text,'SOL! katt katt OVÄNTAT?');
 r.onend();assert.equal(r.track.enabled,true);assert.equal(opens,1);assert.equal(timers.size,1);const restart=[...timers.values()][0];timers.clear();restart();r=sessions.at(-1);fire(r,[result('hund',true)]);assert.equal(queue.items.at(-1).text,'hund');assert.equal(queue.length,7);
 input.stop();assert(r.stopped);fire(r,[result('hund',true),result('sista ordet',true)],1);assert.equal(queue.items.at(-1).text,'ordet');r.onend();assert.equal(input.wanted,false);assert.equal(input.recognition,null);assert.equal(timers.size,0);
 input.start();r=sessions.at(-1);const len=queue.length;input.setEnabled(false);fire(r,[result('sent efter paus',true)]);r.onend();assert.equal(queue.length,len);assert.equal(input.recognition,null);assert(r.aborted);
 await input.prepare();input.setEnabled(true);input.start();assert.equal(opens,1);assert.equal(prepared,2);r=sessions.at(-1);
 r.onerror({error:'network'});assert.equal(input.recognition,null);r.onend();assert.equal(input.wanted,false);assert.equal(timers.size,0);
 input.start();r=sessions.at(-1);r.stop=function(){this.onend();};input.stop();assert.equal(timers.size,0);input.start();assert(input.wanted);input.cancel();
 Recognition.available=async()=> 'available';Recognition.prototype.processLocally=false;
 input.configure({enabled:true,kind:'local',language:'en-US',lesson:'english'});await input.prepare();input.start();assert.equal(sessions.at(-1).processLocally,false);assert.equal(opens,1);
 for(let i=0;i<4;i++){sessions.at(-1).onend();if(i<3){const fn=[...timers.values()][0];timers.clear();fn();}}assert.equal(input.wanted,false);assert.equal(timers.size,0);
 input.configure({enabled:true,language:'sv-SE',lesson:'swedishLong'});await input.prepare();assert.equal(mic.options.shortInput,false);assert.equal(opens,1);
 input.configure({enabled:false,kind:'typing',lesson:'swedish'});input.setEnabled(true);field.value='hela svaret';form.dispatchEvent(new Event('submit',{cancelable:true}));assert.equal(queue.items.at(-1).text,'hela svaret');assert.equal(field.value,'');
 field.dispatchEvent(new Event('compositionstart'));field.value='pågående';const before=queue.length;form.dispatchEvent(new Event('submit',{cancelable:true}));assert.equal(queue.length,before);field.dispatchEvent(new Event('compositionend'));form.dispatchEvent(new Event('submit',{cancelable:true}));assert.equal(queue.length,before+1);
 input.configure({enabled:false,lesson:'bopomofo'});field.value='1qaz';field.dispatchEvent(new Event('input'));assert.equal(field.value,'');assert.deepEqual(Array.from(queue.items.slice(-4),x=>x.text),['ㄅ','ㄆ','ㄇ','ㄈ']);
 input.destroy();assert(stops>=4);console.log('PASS continuous speech, final-index deduplication, repeated words, raw diagnostics, stop flush, pause cancellation, stream reuse, network failure, typing and IME.');
})().catch(e=>{console.error(e);process.exitCode=1;});
