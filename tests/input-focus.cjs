/* Focus lifecycle using DOM stand-ins. Actual browser default actions need a browser check. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const document=Object.assign(new EventTarget(),{hidden:false,activeElement:null,hasFocus:()=>windowFocused});
const windowEvents=new EventTarget();let windowFocused=true,playing=false,dialog=false,focusCalls=0;
class Element extends EventTarget{
 constructor(){super();this.value='';this.disabled=false;this.ownerDocument=document;}
 querySelector(){return null;}
 focus(){if(this.disabled)return;focusCalls++;const old=document.activeElement;document.activeElement=this;if(old!==this){old?.dispatchEvent(new Event('blur'));document.dispatchEvent(new Event('focusin'));}}
 setAttribute(){}
}
const context=vm.createContext({console,Event,EventTarget,CustomEvent,Float32Array,setTimeout,clearTimeout,navigator:{userAgent:'Chrome/145'},addEventListener:windowEvents.addEventListener.bind(windowEvents),removeEventListener:windowEvents.removeEventListener.bind(windowEvents)});
for(const f of ['pinyin','data','input'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+f+'.js'),'utf8'),context);
const SC=context.Starlight,queue=new SC.AnswerQueue(),field=new Element(),form=new Element(),other=new Element();
const microphone={snapshot:()=>({samples:new Float32Array(0)}),cancel(){}};
const input=new SC.AnswerInput({field,form,queue,microphone,retainFocus:()=>playing&&!dialog});
const dispatch=(type,props={})=>{const e=new Event(type,{cancelable:true});for(const [key,value] of Object.entries(props))Object.defineProperty(e,key,{value});document.dispatchEvent(e);return e;};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 input.configure({enabled:false,lesson:'swedish'});input.setEnabled(true);assert.equal(focusCalls,0,'menu must not acquire focus');
 playing=true;input.setEnabled(true);assert.equal(document.activeElement,field);
 for(const shiftKey of [false,true])assert(dispatch('keydown',{key:'Tab',shiftKey}).defaultPrevented);
 for(const modifier of ['ctrlKey','altKey','metaKey'])assert(!dispatch('keydown',{key:'Tab',[modifier]:true}).defaultPrevented);
 for(const key of ['a','Enter','Backspace','ArrowLeft','Escape'])assert(!dispatch('keydown',{key}).defaultPrevented);
 assert(dispatch('pointerdown',{target:other,button:0}).defaultPrevented,'blank/canvas/control presses must not take focus');
 assert(!dispatch('pointerdown',{target:field,button:0}).defaultPrevented,'caret positioning is native');
 let clicks=0;other.addEventListener('click',()=>clicks++);other.dispatchEvent(new Event('click'));assert.equal(clicks,1,'intentional controls still receive clicks');
 other.focus();await settle();assert.equal(document.activeElement,field,'recover stray element focus');
 document.activeElement=null;field.dispatchEvent(new Event('blur'));await settle();assert.equal(document.activeElement,field,'recover focus lost to the body');
 field.value='räka';form.dispatchEvent(new Event('submit',{cancelable:true}));assert.equal(queue.items.at(-1).text,'räka');assert.equal(field.value,'');
 input.configure({enabled:false,lesson:'bopomofo'});field.dispatchEvent(new Event('compositionstart'));field.value='ㄆ';field.dispatchEvent(new Event('input'));assert.equal(queue.length,1);field.dispatchEvent(new Event('compositionend'));field.dispatchEvent(new Event('input'));assert.equal(queue.length,2);assert.equal(queue.items.at(-1).text,'ㄆ');
 for(const state of ['pause','dialog','hidden','other-window']){
  playing=state!=='pause';dialog=state==='dialog';document.hidden=state==='hidden';windowFocused=state!=='other-window';
  other.focus();await settle();assert.equal(document.activeElement,other,state+' keeps focus');assert(!dispatch('keydown',{key:'Tab'}).defaultPrevented,state+' permits Tab');
 }
 playing=true;dialog=false;document.hidden=false;windowFocused=true;windowEvents.dispatchEvent(new Event('focus'));await settle();assert.equal(document.activeElement,field);
 input.setEnabled(false);other.focus();await settle();assert.equal(document.activeElement,other,'disabled input leaves results and menus accessible');
 input.configure({enabled:true,lesson:'swedish'});input.setEnabled(true);const before=focusCalls;assert(field.disabled);assert(dispatch('keydown',{key:'Tab'}).defaultPrevented);other.focus();await settle();assert.equal(focusCalls,before+1,'voice mode never focuses its hidden text field');
 const n=queue.length;field.value='mat';form.dispatchEvent(new Event('submit'));assert.equal(queue.length,n,'hidden typing cannot submit in voice mode');
 input.destroy();assert(!dispatch('keydown',{key:'Tab'}).defaultPrevented,'destroy removes document listeners');
 console.log('PASS focus retention, native editing, shortcuts, IME, pause/dialog/window escape, optional controls, voice mode, cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
