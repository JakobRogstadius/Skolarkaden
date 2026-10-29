'use strict';
const {games}=require('../../helpers/runtime.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const read=file=>fs.readFileSync(path.join(__dirname,'../../..',file),'utf8'),ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const name of ['pinyin','data','language-exercises-data','language-exercises','speech','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows','eggs','home','home-renderer'])vm.runInContext(read('resources/'+name+'.js'),ctx);
const SC=ctx.Starlight,modes=['swedish-synonyms','english-opposites','translation-sv-en-1'],rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const item=(mode,label)=>SC.modes[mode].items.find(i=>i.label===label);
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
function setup(name,mode,lang){
  const g=new SC[name+'Game']({random:rng(5)});g.start({mode,lang,pace:'gentle'});g.resize(1000,740);
  if(name==='Home')g.createTask('toys',g.spots.toys[0]);
  if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);}
  if(name==='Egg'){for(const e of g.eggs)e.crackAt=10000;for(let i=0;i<140;i++)g.update(.05);g.crack(g.eggs[0]);}
  for(let i=0;i<100&&!g.getTargets().length;i++)g.update(.05);
  assert(g.getTargets().length,name);return g;
}
function render(name,g){
  const drawn=[],stack=[],c=new Proxy({font:'16px system-ui',save(){stack.push(this.font);},restore(){this.font=stack.pop();},measureText(text){return {width:String(text).length*Number(this.font.match(/[\d.]+/)?.[0]||16)*.6};},fillText(text,x,y){drawn.push({text,x,y,font:this.font});}},{get:(o,k)=>k in o?o[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
  const renderer=Object.create(SC[name+'Renderer'].prototype);Object.assign(renderer,{game:g,ctx:c,dpr:1,stars:[],reduced:true});renderer.draw();return drawn;
}

test('All nine games accept alternate answers and render each new exercise with a ten-second hint',()=>{
  for(const name of games(['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home']))for(const mode of modes){
    const g=setup(name,mode,SC.modes[mode].lang),target=g.getTargets()[0];
    // Deterministic task with an alternate answer and no extra visual text.
    target.item=SC.vocabulary(mode,g.lang).find(i=>i.aliases.length&&i.answer!==i.label);
    const task=target.item;assert(task,name+'/'+mode);assert(!SC.pinyinHints(g).has(target));
    let drawn=render(name,g);assert.equal(task.promptContext,undefined);assert.equal(SC.labelHeight(task,34),34,name+' an unrevealed task must keep its compact height');
    g.clock=target.appearedAt+9.99;assert(!SC.pinyinHints(g).has(target));
    g.clock=target.appearedAt+10;assert(SC.pinyinHints(g).has(target));drawn=render(name,g);
    const main=drawn.find(t=>t.text===task.label),hint=drawn.find(t=>t.text===task.hint&&t.y>main?.y);
    assert(main&&hint,name+'/'+mode+' missing answer hint');assert(Number(hint.font.match(/[\d.]+/)[0])<Number(main.font.match(/[\d.]+/)[0]),name+' hint must be smaller');
    target.pinyinRevealed=false;
    g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(entry,i)=>SC.matches(entry.text,i,mode,g.lang,entry.source)});
    assert(g.queue.enqueue(task.aliases[0]));assert(!SC.pinyinHints(g).has(target),name+' queued alternate answer');
  }
});
