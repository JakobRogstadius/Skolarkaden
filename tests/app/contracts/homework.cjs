'use strict';
const {games}=require('../../helpers/runtime.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'../../..',file),'utf8'),dictionary={'sv-001':{input:'keyboard',language:'sv-SE',words:[['hej'],['hopp'],['tekopp']]},'zh-001':{input:'voice',language:'zh-TW',words:[['你','nǐ','du'],['好','hǎo','bra'],['我喜歡喝茶','wǒ xǐhuān hē chá','Jag tycker om att dricka te.']]}};
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console,AbortController,setTimeout,clearTimeout});
for(const name of ['pinyin','data','language-exercises-data','language-exercises','homework','voice','speech','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows','eggs','home','home-renderer'])vm.runInContext(read('resources/'+name+'.js'),ctx);
const SC=ctx.Starlight,plain=value=>JSON.parse(JSON.stringify(value));
const result=(transcript,isFinal=true)=>Object.assign([{transcript}],{isFinal}),rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
async function load(entry){ctx.fetch=async()=>Response.json({test:entry});return SC.loadHomework('test');}
function game(name,pace){
  const g=new SC[name+'Game']({random:rng(5)});g.start({mode:'homework',lang:SC.modes.homework.lang,pace});g.resize(1000,740);
  if(name==='Home')g.createTask('toys',g.spots.toys[0]);
  if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);}
  if(name==='Egg'){for(const e of g.eggs)e.crackAt=10000;for(let i=0;i<140;i++)g.update(.05);g.crack(g.eggs[0]);}
  for(let i=0;i<500&&!g.getTargets().length;i++)g.update(.05);
  assert(g.getTargets().length,name+' has no homework tasks');return g;
}
function draw(name,g){
  const drawn=[],stack=[],c=new Proxy({font:'16px system-ui',save(){stack.push(this.font);},restore(){this.font=stack.pop();},measureText(text){return {width:String(text).length*Number(this.font.match(/[\d.]+/)?.[0]||16)*.6};},fillText(text,x,y){drawn.push({text,x,y});}},{get:(o,k)=>k in o?o[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
  const renderer=Object.create(SC[name+'Renderer'].prototype);Object.assign(renderer,{game:g,ctx:c,dpr:1,stars:[],reduced:true});renderer.draw();return drawn;
}
module.exports=(async()=>{
  const good={input:'keyboard',language:'zh-TW',words:[['銀行','yín háng','bank']]};
  for(const entry of [good,{input:'keyboard',language:'en-US',words:[['hello there',null,'hej där']]}]){
    await load(entry);
    for(const name of games(['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home']))for(const pace of ['gentle','steady','brave']){
      const g=game(name,pace),target=g.getTargets()[0],item=target.item;
      assert.equal(item.answer,entry.words[0][0]);assert.equal(item.label,item.answer);
      g.clock=target.appearedAt+9.99;assert(!SC.pinyinHints(g).has(target),name+' early hint');
      g.clock=target.appearedAt+10;assert(SC.pinyinHints(g).has(target),name+' missing hint');
      const drawn=draw(name,g),main=drawn.find(t=>t.text===item.label),translation=drawn.find(t=>t.text===item.translation);
      assert(main&&translation&&translation.y>main.y,name+' missing translation');
      if(item.hint)assert(drawn.some(t=>t.text===item.hint&&t.y<main.y),name+' missing pronunciation');
      target.pinyinRevealed=false;g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source)});
      assert(g.queue.enqueue(item.hint||item.answer));assert(!SC.pinyinHints(g).has(target),name+' queued answer should suppress a new hint');
    }
  }
  if(games(['City']).length){await load({input:'keyboard',language:'sv-SE',words:[['hej']]});const g=game('City','gentle');g.clock+=10;assert.equal(SC.pinyinHints(g).size,0);}
  console.log('PASS homework labels, delay and queue integration in selected games');
})();
