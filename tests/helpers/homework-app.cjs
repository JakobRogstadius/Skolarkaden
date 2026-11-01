/* Execute the real HTML script order and app against a DOM stand-in. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{webcrypto}=require('node:crypto');
const read=file=>fs.readFileSync(path.join(__dirname,'../..',file),'utf8'),html=read('index.html'),dictionary={'sv-001':{input:'keyboard',language:'sv-SE',words:[['hej'],['hopp'],['tekopp']]},'zh-001':{input:'voice',language:'zh-TW',words:[['你','nǐ','du'],['好','hǎo','bra'],['我喜歡喝茶','wǒ xǐhuān hē chá','Jag tycker om att dricka te.']]}};
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function boot(search='',fetchHomework=async()=>Response.json(dictionary),fetchScores=null,runtime={}){
  let document,currentGame,selection;const posts=[],requests=[],captures=[];
  class Element extends EventTarget{
    constructor(){super();Object.assign(this,{value:'',textContent:'',text:'',hidden:false,disabled:false,children:[],options:[],dataset:{},open:false});this.classList={add(){},remove(){},toggle(){},contains(){return false;}};this.style={setProperty(){}};}
    append(...items){this.children.push(...items);items.forEach(item=>{item.parent=this;});}remove(){if(this.parent)this.parent.children=this.parent.children.filter(item=>item!==this);}replaceChildren(...items){this.children=[...items];this.options=[...items];this.value=items[0]?.value||'';}add(option){this.options.push(option);if(this.options.length===1)this.value=option.value;}
    closest(){return this.parent||(this.parent=new Element());}querySelector(){return null;}setAttribute(){}focus(){document.activeElement=this;}showModal(){this.open=true;}close(){this.open=false;this.dispatchEvent(new Event('close'));}
  }
  const fields={};for(const tag of html.match(/<[^>]+\bid="[^"]+"[^>]*>/g)||[]){const el=new Element();el.hidden=/\bhidden\b/.test(tag);fields[tag.match(/\bid="([^"]+)"/)[1]]=el;}
  for(const [,id,body] of html.matchAll(/<select[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g))for(const [,value,text] of body.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g))fields[id].add(Object.assign(new Element(),{value,text,textContent:text}));
  const radios=[...html.matchAll(/<input[^>]*name="game"[^>]*value="([^"]+)"[^>]*>/g)].map(([,value])=>Object.assign(new Element(),{value}));
  document=Object.assign(new EventTarget(),{body:new Element(),documentElement:new Element(),getElementById:id=>{assert(fields[id],id);return fields[id];},createElement:()=>new Element(),querySelector:()=>null,querySelectorAll:selector=>selector==='[name=game]'?radios:[]});
const windowListeners=new Map(),history={state:null,replaceState(s){this.state=s;},pushState(s){this.previous=this.state;this.state=s;},back(){this.state=this.previous;windowListeners.get('popstate')?.();}};
  const ctx=vm.createContext({document,console,Event,EventTarget,CustomEvent,URLSearchParams,AbortController,setTimeout,clearTimeout,crypto:webcrypto,location:{search},performance:{now:()=>0},requestAnimationFrame:()=>0,cancelAnimationFrame(){},history,addEventListener(type,fn){windowListeners.set(type,fn);},removeEventListener(type){windowListeners.delete(type);},matchMedia:()=>({matches:false}),navigator:{},localStorage:{getItem(){},setItem(){},removeItem(){}},Option:class extends Element{constructor(text,value){super();this.textContent=this.text=text;this.value=value;}},fetch:async(url,options={})=>{
    requests.push(url);if(url==='homework.json')return fetchHomework(url,options);
    if(options.method==='POST'){posts.push(JSON.parse(options.body));return Response.json({ok:true});}
    if(fetchScores)return fetchScores(url,options);
    return Response.json({leaderboard:'v2:city',scores:[{player_name:'TEST',score:30,exercise:'homework',difficulty:'gentle'}],rank:2});
  },...runtime,addEventListener(type,fn){windowListeners.set(type,fn);runtime.addEventListener?.(type,fn);},removeEventListener(type){windowListeners.delete(type);runtime.removeEventListener?.(type);}});
  for(const [,url] of html.matchAll(/<script defer src="([^"]+)"/g)){
    const file=url.split('?')[0];
    if(file==='resources/app.js'){
      const SC=ctx.Starlight;
      SC.GameSounds=class{unlock(){}play(){}stopCampfire(){}campfire(){}close(){}};
      for(const name of ['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home','Reversi','Chess','Klossar','Trassel','Bubblefish','Glantan','Studio']){
        const Game=SC[name+'Game'];SC[name+'Game']=class extends Game{constructor(options){super(options);currentGame=this;}};
        SC[name+'Renderer']=class{constructor(canvas,game){this.game=game;}resize(){this.game.resize?.(1000,700);}destroy(){}scoreEvent(){}};
      }
      const Scores=SC.Highscores;SC.Highscores=class extends Scores{begin(value){selection=value;super.begin(value);}};
      const Input=SC.AnswerInput;SC.AnswerInput=class extends Input{configure(value){captures.push(value);super.configure(value);}};
    }
    vm.runInContext(read(file),ctx,{filename:file});
  }
  return {ctx,fields,radios,posts,requests,captures,get game(){return currentGame;},get selection(){return selection;},click:id=>fields[id].dispatchEvent(new Event('click'))};
}
module.exports={boot,settle,dictionary};
