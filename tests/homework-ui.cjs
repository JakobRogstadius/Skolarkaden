/* Execute the real HTML script order and app against a DOM stand-in. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{webcrypto}=require('node:crypto');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),html=read('index.html'),dictionary=JSON.parse(read('homework.json'));
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function boot(search='',fetchHomework=async()=>Response.json(dictionary)){
  let document,currentGame,selection;const posts=[],requests=[],captures=[];
  class Element extends EventTarget{
    constructor(){super();Object.assign(this,{value:'',textContent:'',text:'',hidden:false,disabled:false,children:[],options:[],dataset:{},open:false});this.classList={add(){},remove(){},toggle(){}};this.style={setProperty(){}};}
    append(...items){this.children.push(...items);}replaceChildren(...items){this.children=[...items];this.options=[...items];this.value=items[0]?.value||'';}add(option){this.options.push(option);if(this.options.length===1)this.value=option.value;}
    closest(){return this.parent||(this.parent=new Element());}querySelector(){return null;}setAttribute(){}focus(){document.activeElement=this;}showModal(){this.open=true;}close(){this.open=false;this.dispatchEvent(new Event('close'));}
  }
  const fields={};for(const tag of html.match(/<[^>]+\bid="[^"]+"[^>]*>/g)||[]){const el=new Element();el.hidden=/\bhidden\b/.test(tag);fields[tag.match(/\bid="([^"]+)"/)[1]]=el;}
  for(const [,id,body] of html.matchAll(/<select[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g))for(const [,value,text] of body.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g))fields[id].add(Object.assign(new Element(),{value,text,textContent:text}));
  const radios=[...html.matchAll(/<input[^>]*name="game"[^>]*value="([^"]+)"[^>]*>/g)].map(([,value])=>Object.assign(new Element(),{value}));
  document=Object.assign(new EventTarget(),{body:new Element(),getElementById:id=>{assert(fields[id],id);return fields[id];},createElement:()=>new Element(),querySelector:()=>null,querySelectorAll:selector=>selector==='[name=game]'?radios:[]});
  const ctx=vm.createContext({document,console,Event,EventTarget,CustomEvent,URLSearchParams,AbortController,setTimeout,clearTimeout,crypto:webcrypto,location:{search},performance:{now:()=>0},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},matchMedia:()=>({matches:false}),navigator:{},localStorage:{getItem(){},setItem(){},removeItem(){}},Option:class extends Element{constructor(text,value){super();this.textContent=this.text=text;this.value=value;}},fetch:async(url,options={})=>{
    requests.push(url);if(url==='homework.json')return fetchHomework(url,options);
    if(options.method==='POST'){posts.push(JSON.parse(options.body));return Response.json({ok:true});}
    return Response.json({leaderboard:'v2:city',scores:[{player_name:'TEST',score:30,exercise:'homework',difficulty:'gentle'}],rank:2});
  }});
  for(const [,url] of html.matchAll(/<script defer src="([^"]+)"/g)){
    const file=url.split('?')[0];
    if(file==='resources/app.js'){
      const SC=ctx.Starlight;
      SC.GameSounds=class{unlock(){}play(){}stopCampfire(){}campfire(){}close(){}};
      for(const name of ['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home']){
        const Game=SC[name+'Game'];SC[name+'Game']=class extends Game{constructor(options){super(options);currentGame=this;}};
        SC[name+'Renderer']=class{constructor(canvas,game){this.game=game;}resize(){this.game.resize(1000,700);}destroy(){}scoreEvent(){}};
      }
      const Scores=SC.Highscores;SC.Highscores=class extends Scores{begin(value){selection=value;super.begin(value);}};
      const Input=SC.AnswerInput;SC.AnswerInput=class extends Input{configure(value){captures.push(value);super.configure(value);}};
    }
    vm.runInContext(read(file),ctx,{filename:file});
  }
  return {ctx,fields,radios,posts,requests,captures,get game(){return currentGame;},get selection(){return selection;},click:id=>fields[id].dispatchEvent(new Event('click'))};
}
(async()=>{
  const normal=boot();await settle();assert(!normal.requests.includes('homework.json'));assert(!normal.fields.lesson.options.some(o=>o.value==='homework'));assert(!normal.fields.lesson.disabled);assert(!normal.fields['input-kind'].disabled);
  let resolve;const app=boot('?mode=homework&id=sv-001&input=keyboard&language=zh-CN&words=wrong',()=>new Promise(done=>resolve=done));
  assert(app.fields.start.disabled);app.click('start');await settle();assert.equal(app.game,undefined,'loading cannot launch a default exercise');
  resolve(Response.json({...dictionary,'sv-001':{...dictionary['sv-001'],input:'voice'}}));await settle();assert(!app.fields.start.disabled);
  for(const id of ['lesson','input-kind','language'])assert(app.fields[id].disabled,id+' must be locked');
  assert.equal(app.fields['input-kind'].value,'typing');assert.equal(app.fields.language.value,'sv-SE');assert.equal(app.fields.lesson.value,'homework');
  assert.deepEqual(app.fields.lesson.options.map(o=>o.value),['homework']);assert.equal(app.fields['homework-info'].textContent,'Läxa · sv-001');
  for(const radio of app.radios){
    radio.dispatchEvent(new Event('change'));app.fields.pace.value='brave';app.click('start');await settle();
    assert.equal(app.fields['setup-error'].textContent,'');assert.equal(app.game.mode,'homework');assert.equal(app.game.lang,'sv-SE');assert.equal(app.game.pace,'brave');
    assert.deepEqual(Array.from(app.game.items,i=>i.answer),['hej','hopp','tekopp']);assert.equal(app.captures.at(-1).enabled,false);
    assert.equal(app.selection.homeworkId,'sv-001');assert.equal(app.selection.mode,'homework');
    app.click('pause');app.click('pause-menu');assert(app.fields.lesson.disabled);assert(app.fields['input-kind'].disabled);assert(app.fields.language.disabled);
  }
  app.radios.find(r=>r.value==='city').dispatchEvent(new Event('change'));app.click('start');await settle();app.game.finish(true);await settle();
  assert.equal(app.fields['result-context'].textContent,'Läxa · Svår');assert(app.fields['end-scores-list'].children.some(row=>row.children.some(c=>c.textContent==='Läxa')));
  app.click('again');await settle();await settle();assert.equal(app.game.state,'playing');assert.equal(app.game.mode,'homework');
  assert.equal(app.posts.length,1);assert.equal(app.posts[0].leaderboard_key,'v2:city:homework:brave');assert.equal(app.posts[0].settings.homework_id,'sv-001');assert.equal(app.posts[0].settings.input_mode,'keyboard');
  const voice=boot('?mode=homework&id=zh-001');await settle();assert.equal(voice.fields.language.value,'zh-TW');assert.equal(voice.fields['input-kind'].value,'browser');assert(voice.fields.language.disabled);assert.equal(voice.ctx.Starlight.modes.homework.items[2].hint,'wǒ xǐhuān hē chá');
  const voiceOverride=boot('?mode=homework&id=sv-001&input=voice');await settle();assert.equal(voiceOverride.fields['input-kind'].value,'browser');assert(voiceOverride.fields['input-kind'].disabled);assert.equal(voiceOverride.ctx.Starlight.modes.homework.input,'voice');
  const keyboardDefault=boot('?mode=homework&id=sv-001');await settle();assert.equal(keyboardDefault.fields['input-kind'].value,'typing');
  for(const search of ['?mode=homework','?mode=homework&id=missing','?mode=homework&id=sv-001&input=invalid','?mode=homework&id=sv-001&input=']){const broken=boot(search);await settle();assert(broken.fields.start.disabled);assert(broken.fields['setup-error'].textContent);broken.click('start');await settle();assert.equal(broken.game,undefined);}
  for(const response of [()=>new Response('{'),()=>{throw Error('offline');},()=>Response.json({'sv-001':{input:'keyboard',language:'sv-SE',words:[]}})]){
    const broken=boot('?mode=homework&id=sv-001',async()=>response());await settle();assert(broken.fields.start.disabled);assert(broken.fields['setup-error'].textContent);assert.equal(broken.game,undefined);
  }
  console.log('PASS homework UI: URL loading, normal menu, errors, locked selections, all game choices, pause/menu/replay and highscore submission.');
})().catch(error=>{console.error(error);process.exitCode=1;});
