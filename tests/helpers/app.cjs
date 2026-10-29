'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
exports.boot = function({exerciseSource, exerciseData} = {}) {
const base=path.join(__dirname,'../..'),html=fs.readFileSync(path.join(base,'index.html'),'utf8');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context2d=new Proxy({},{get:(_,key)=>key==='measureText'?s=>({width:[...s].length*9}):key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
class Element extends EventTarget{
 constructor(){super();Object.assign(this,{value:'',textContent:'',text:'',hidden:false,disabled:false,checked:false,children:[],options:[],dataset:{},className:'',open:false});this.classList={add(){},remove(){},toggle(){},contains(){return false;}};this.style={setProperty(){}};}
 append(...items){this.children.push(...items);}replaceChildren(...items){this.children=[...items];this.options=[...items];this.value=items[0]?.value||'';}add(option){this.options.push(option);if(this.options.length===1)this.value=option.value;}
 closest(){return this.parent||(this.parent=new Element());}querySelector(selector){return this.noSubmit&&selector==='[type=submit]'?null:this.button||(this.button=new Element());}setAttribute(){}focus(){document.activeElement=this;}select(){}remove(){}showModal(){this.open=true;}close(){this.open=false;this.dispatchEvent(new Event('close'));}
 getBoundingClientRect(){return {width:1000,height:700};}getContext(){return context2d;}
}
const elements={};for(const tag of html.match(/<[^>]+\bid="[^"]+"[^>]*>/g)||[]){const id=tag.match(/\bid="([^"]+)"/)[1],el=new Element();el.hidden=/\bhidden\b/.test(tag);el.checked=/\bchecked\b/.test(tag);elements[id]=el;}
for(const [,id,body] of html.matchAll(/<select[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g))for(const [,value,text] of body.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)){const option=new Element();option.value=value;option.text=text;elements[id].add(option);}
elements['answer-form'].noSubmit=true;
const radios=[...html.matchAll(/<input[^>]*name="game"[^>]*value="([^"]+)"[^>]*>/g)].map(([,value])=>Object.assign(new Element(),{value}));
const document=Object.assign(new EventTarget(),{hidden:false,body:new Element(),documentElement:new Element(),getElementById:id=>{assert(elements[id],'unknown DOM id '+id);return elements[id];},createElement:()=>new Element(),createDocumentFragment:()=>new Element(),querySelector:()=>null,querySelectorAll:selector=>selector==='[name=game]'?radios:[]});
const raf=new Map(),storage=new Map();let rafId=0,now=0;const recognitions=[];
let appReady,exerciseRequests=0;
const windowListeners=new Map(),history={state:null,replaceState(s){this.state=s;},pushState(s){this.previous=this.state;this.state=s;},back(){this.state=this.previous;windowListeners.get('popstate')?.();}};
const context=vm.createContext({URLSearchParams,location:{protocol:exerciseSource?'https:':'file:'},crypto:require('node:crypto').webcrypto,AbortController,fetch:async(url,options={})=>{if(String(url).endsWith('language-exercises.json')){exerciseRequests++;if(exerciseSource==='offline')throw new Error('offline');return {ok:true,json:async()=>exerciseSource==='invalid'?{}:exerciseData || JSON.parse(fs.readFileSync(path.join(base,'language-exercises.json'),'utf8'))};}return {ok:true,json:async()=>options.method==='POST'?{ok:true}:{scores:[],rank:1}};},console,Event,EventTarget,CustomEvent,Float32Array,document,navigator:{userAgent:'Chrome/145'},setTimeout,clearTimeout,performance:{now:()=>now},requestAnimationFrame:fn=>{raf.set(++rafId,fn);return rafId;},cancelAnimationFrame:id=>raf.delete(id),ResizeObserver:class{observe(){}disconnect(){}},devicePixelRatio:1,matchMedia:()=>({matches:false}),history,addEventListener(type,fn){windowListeners.set(type,fn);},removeEventListener(type){windowListeners.delete(type);},Option:class extends Element{constructor(text,value){super();this.text=text;this.value=value;}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
context.SpeechRecognition=class{start(){recognitions.push(this);this.onstart?.();}abort(){this.aborted=true;}};
const scripts=[...html.matchAll(/<script defer src="([^"]+)"/g)].map(m=>m[1].split(/[?#]/)[0]);
const instances = {};
const constructors = {city:'City', food:'FoodTruck', garden:'Garden', hive:'Beehive', paint:'Paint',
  dinosaur:'Dinosaur', marshmallows:'Marshmallow', eggs:'Egg', home:'Home', reversi:'Reversi', chess:'Chess', klossar:'Klossar', trassel:'Trassel', glantan:'Glantan', studio:'Studio'};
for (const script of scripts) {
  assert(fs.existsSync(path.join(base, script)), script + ' missing');
  if (script === 'resources/app.js') {
    context.Starlight.Microphone = class {
      constructor(){this.ready=false;this.recording=false;this.stream={getAudioTracks:()=>[{clone:()=>({enabled:true,stop(){}})}]};}
      async configure(options){this.options=options;await this.open();}
      async open(){this.ready=true;} begin(){this.recording=true;} cancel(){this.recording=false;}
      snapshot(){return {samples:new Float32Array(0),sampleRate:16000};}
    };
    for (const [kind, name] of Object.entries(constructors)) {
      const Original = context.Starlight[name + 'Game'];
      context.Starlight[name + 'Game'] = class extends Original {
        constructor(args) { super(args); instances[kind] = this; }
      };
    }
  }
  const result = vm.runInContext(fs.readFileSync(path.join(base,script),'utf8'),context,{filename:script});
  if(script==='resources/app.js') appReady=result;
}
const frame=()=>{now+=50;const callbacks=[...raf.values()];raf.clear();for(const fn of callbacks)fn(now);},click=id=>elements[id].dispatchEvent(new Event('click')),settle=()=>new Promise(resolve=>setImmediate(resolve));
async function start(kind,lesson='swedish',{language}={}){const radio=radios.find(r=>r.value===kind);assert(radio,kind+' missing from menu');radio.dispatchEvent(new Event('change'));elements['exercise-group'].value=context.Starlight.exerciseGroup(lesson);elements['exercise-group'].dispatchEvent(new Event('change'));elements.lesson.value=lesson;elements.lesson.dispatchEvent(new Event('change'));if(language)elements.language.value=language;click('start');await settle();assert.equal(elements['setup-error'].textContent,'');assert.equal(elements.play.hidden,false);frame();}
return {elements, radios, document, context, scripts, html, storage, recognitions, frame, click, settle, start, appReady,
  get exerciseRequests(){return exerciseRequests;}, get currentGame(){return instances.dinosaur;},
  get currentHome(){return instances.home;}, get currentEgg(){return instances.eggs;},
  get currentMarshmallow(){return instances.marshmallows;}, getGame:kind=>instances[kind]};
};
