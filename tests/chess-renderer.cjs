/* Regression coverage for prompt-only move cards, including delayed hints. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
class Element extends EventTarget{
 constructor(tag='div'){super();Object.assign(this,{tagName:tag,children:[],dataset:{},attributes:{},className:'',textContent:''});this.classList={contains:c=>this.className.split(' ').includes(c),toggle:(c,on)=>{const list=new Set(this.className.split(' ').filter(Boolean));if(on)list.add(c);else list.delete(c);this.className=[...list].join(' ');}};}
 append(...items){for(const e of items){e.parentElement=this;this.children.push(e);}}
 replaceChildren(...items){this.children=[];this.append(...items);}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 querySelectorAll(selector){const out=[];for(const child of this.children){if(selector.startsWith('.')?child.classList.contains(selector.slice(1)):child.tagName===selector)out.push(child);out.push(...child.querySelectorAll(selector));}return out;}
 set innerHTML(html){this.children=[];const stack=[this];for(const token of html.match(/<[^>]+>|[^<]+/g)||[]){if(token.startsWith('</'))stack.pop();else if(token.startsWith('<')){const e=new Element(token.match(/^<(\w+)/)[1]);e.className=token.match(/class="([^"]*)"/)?.[1]||'';stack.at(-1).append(e);if(!token.endsWith('/>'))stack.push(e);}else stack.at(-1).textContent+=token;}}
 getContext(){return new Proxy({measureText:t=>({width:t.length*8})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});}
}
const context=vm.createContext({Event,EventTarget,CustomEvent,console,performance,document:{createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
for(const f of ['pinyin','data','language-exercises-data','language-exercises','homework','voice','speech','input','game','reversi-engine','reversi','chess-rules','chess-engine','chess-scoring','chess','chess-renderer'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+f+'.js'),'utf8'),context);
const SC=context.Starlight,C=SC.ChessEngine,g=new SC.ChessGame({random:()=>.31}),canvas=new Element('canvas'),arena=new Element();arena.append(canvas);
g.start();const r=new SC.ChessRenderer(canvas,g),opening=g.position.moves({verbose:true}).map((m,i)=>({...m,value:-i}));
assert(canvas.hidden);assert.equal(r.cells.length,64);assert.equal(r.node.querySelectorAll('.ch-piece-art').length,32);
assert.equal(r.node.querySelector('.ch-instruction'),null);assert.equal(r.node.querySelector('.ch-scoring'),null);
const options=Object.entries(SC.modes).filter(([mode])=>mode!=='homework').flatMap(([mode,d])=>(d.translation?['sv-SE','en-US']:[d.lang]).map(lang=>({mode,lang})));
SC.modes.homework=SC.parseHomework({test:{input:'keyboard',language:'zh-TW',words:[['銀行','yín háng','bank'],['你好','nǐ hǎo','hej'],['朋友','péng yǒu','vän']]}},'test');
options.push({mode:'homework',lang:'zh-TW'});
const content=node=>node.textContent+node.children.map(content).join('');
function assertPromptsOnly(){
 assert.equal(r.choices.children.length,g.targets.length,g.mode);
 for(const t of g.targets){
  const card=r.choices.children.find(c=>c.dataset.choice===t.letter),description=C.description(t.move);
  assert.equal(content(card),t.letter+description+(t.item.diagram?'':t.item.label),g.mode+' must show only the move and prompt');
  assert.equal(card.attributes['aria-label'],'Förhandsvisa drag '+t.letter+', '+description+': '+t.item.label);
  const inspect=node=>{assert.equal(node.attributes.title,undefined,'no tooltip answers');for(const child of node.children)inspect(child);};inspect(card);
  if(t.item.diagram)assert.equal(card.querySelector('.ch-diagram').attributes['aria-label'],t.item.label);
  else assert.equal(card.querySelector('.ch-question').textContent,t.item.label);
 }
 assert.equal(r.node.querySelectorAll('.ch-hint').length,0);
}
for(const option of options){
 g.start(option);g.search=null;g.offer(opening);r.draw();assert.equal(g.targets.length,3);assertPromptsOnly();
 const fen=g.position.fen();
 for(const seconds of [4.99,.02,60,3600]){g.update(seconds);r.draw();assertPromptsOnly();assert.equal(g.position.fen(),fen);}
 g.pause();r.draw();assert.equal(r.status.textContent,'Paus');assertPromptsOnly();g.update(3600);g.resume();r.draw();assertPromptsOnly();
 // A newly rendered set of choices must also stay unanswered after its delay.
 g.offer(opening);g.update(6);r.draw();assertPromptsOnly();
 const target=g.targets[1];r.choices.children[1].dispatchEvent(new Event('pointerenter'));assert.equal(g.turns,0);assert.equal(r.cells.filter(c=>c.classList.contains('ch-preview-to')).length,1);
 const answer=SC.isChinese(g.mode)?target.item.hint:target.item.answer;
 assert(g.queue.enqueue(answer));g.update(.05);r.draw();assert.equal(C.key(g.lastMove),C.key(target.move),option.mode);assert.equal(g.hits,1,option.mode+' still accepts the answer');
}
r.destroy();assert.equal(canvas.hidden,false);assert.equal(arena.children.length,1);
console.log('PASS chess renderer: '+options.length+' exercise/language combinations keep prompts and diagrams visible, never reveal hints after waiting or pausing, and accept answers; previews and cleanup work.');
