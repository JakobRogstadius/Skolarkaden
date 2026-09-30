'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
class Element extends EventTarget{constructor(){super();this.value='';}querySelector(){return null;}focus(){}setAttribute(){}}
function fixture(nav={userAgent:'iPhone Safari/605.1.15'}){
  const timers=new Map(),sessions=[];let serial=0;
  class Recognition{
    start(...args){this.args=args;sessions.push(this);if(!this.silent)this.onstart?.();}
    abort(){this.aborted=true;this.onend?.();}
    stop(){this.stopped=true;}
  }
  const context=vm.createContext({Event,EventTarget,CustomEvent,Float32Array,console,navigator:nav,isSecureContext:true,webkitSpeechRecognition:Recognition,
    setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id)});
  for(const f of ['pinyin','data','language-exercises-data','language-exercises','voice','speech','input'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+f+'.js'),'utf8'),context);
  const SC=context.Starlight,queue=new SC.AnswerQueue(),mic={ready:false,options:{},cancel(){},snapshot:()=>({samples:new Float32Array(0)}),
    close(){this.closed=true;this.ready=false;},configure(){throw Error('must not acquire a separate microphone');},begin(){throw Error('must not record separately');}};
  const input=new SC.AnswerInput({field:new Element(),form:new Element(),queue,microphone:mic});
  const faults=[];input.addEventListener('fault',e=>faults.push(e.detail.text));input.configure({enabled:true,language:'sv-SE',lesson:'swedish'});
  const tick=ms=>{const [id,t]=[...timers].find(([,t])=>t.ms===ms)||[];assert(t,'expected timer '+ms);timers.delete(id);t.fn();};
  return {SC,context,input,queue,mic,faults,timers,sessions,Recognition,tick};
}
for(const nav of [
  {userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'},
  {userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',maxTouchPoints:5},
  {userAgent:'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/145.0 Mobile/15E148 Safari/604.1'},
  {userAgent:'Mozilla/5.0 (Linux; Android 15) Chrome/145.0 Mobile Safari/537.36'},
  {userAgent:'Mozilla/5.0 (Linux; Android 15) Chrome/145.0 Safari/537.36'},
  {userAgent:'Chrome/145',userAgentData:{mobile:true,brands:[{brand:'Chromium',version:'145'}]}},
  {userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) Version/18.0 Safari/605.1.15'},
  {userAgent:'Chrome/134'}
]){
  const {input,queue,mic,sessions,timers,tick,faults}=fixture(nav);
  assert.equal(input.usesAudioTrack,false,nav.userAgent);mic.ready=true;
  assert.equal(input.prepare(),undefined,'preparation must stay synchronous to preserve the tap');assert(mic.closed);
  input.setEnabled(true);input.start();let r=sessions.at(-1);assert.deepEqual(r.args,[]);assert(input.listening);assert.equal(timers.size,0);
  const result=Object.assign([{transcript:'sol katt',confidence:.9}],{isFinal:true});r.onresult({results:[result],resultIndex:0});
  assert.deepEqual(Array.from(queue.items,x=>x.text),['sol','katt']);r.onresult({results:[result],resultIndex:0});assert.equal(queue.length,2);
  r.onend();tick(350);r=sessions.at(-1);assert.deepEqual(r.args,[]);assert(input.listening);
  input.setEnabled(false);assert(r.aborted);r.onresult({results:[Object.assign([{transcript:'hund'}],{isFinal:true})]});assert.equal(queue.length,2);assert.equal(timers.size,0);
  input.prepare();input.setEnabled(true);input.start();r=sessions.at(-1);r.onerror({error:'not-allowed'});
  assert.equal(faults.length,1);assert(faults[0].includes('inställningar'));assert.equal(input.wanted,false);assert.equal(timers.size,0);
  input.start();r=sessions.at(-1);input.stop();assert(r.stopped);r.onend();assert.equal(timers.size,0);input.destroy();
}
{
  const {input,Recognition,tick,faults,timers,sessions}=fixture();Recognition.prototype.silent=true;
  input.prepare();input.setEnabled(true);input.start();assert(!input.listening);tick(20000);
  assert.equal(input.wanted,false);assert(sessions[0].aborted);assert.equal(faults.length,1);assert(faults[0].includes('Siri'));assert.equal(timers.size,0);
}
{
  const {input,context}=fixture();context.isSecureContext=false;assert.throws(()=>input.prepare(),/HTTPS/);
  context.isSecureContext=true;delete context.webkitSpeechRecognition;assert.throws(()=>input.prepare(),/Tangentbord/);
}
{
  const {input,Recognition,faults,timers}=fixture();Recognition.prototype.start=()=>{throw new Error('service-not-allowed');};
  input.prepare();input.setEnabled(true);input.start();assert.equal(input.recognition,null);assert.equal(input.wanted,false);assert.equal(timers.size,0);assert.equal(faults.length,1);
}
assert.equal(fixture({userAgent:'Chrome/145'}).input.usesAudioTrack,true);
console.log('PASS mobile/Safari direct microphone, synchronous preparation, transcript delivery, reconnect, pause, retry, permission errors, startup timeout and desktop routing.');
