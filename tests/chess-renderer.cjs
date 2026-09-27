/* Regression coverage for prompt-only move cards, including delayed hints. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
class Element extends EventTarget{
 constructor(tag='div'){super();Object.assign(this,{tagName:tag,children:[],dataset:{},style:{},attributes:{},className:'',textContent:''});this.classList={contains:c=>this.className.split(' ').includes(c),toggle:(c,on)=>{const list=new Set(this.className.split(' ').filter(Boolean));if(on)list.add(c);else list.delete(c);this.className=[...list].join(' ');}};}
 append(...items){for(const e of items){e.parentElement=this;this.children.push(e);}}
 replaceChildren(...items){this.children=[];this.append(...items);}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this);}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='class')this.className=String(v);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 querySelectorAll(selector){const out=[];for(const child of this.children){if(selector.startsWith('.')?child.classList.contains(selector.slice(1)):child.tagName===selector)out.push(child);out.push(...child.querySelectorAll(selector));}return out;}
 set innerHTML(html){this.children=[];const stack=[this];for(const token of html.match(/<[^>]+>|[^<]+/g)||[]){if(token.startsWith('</'))stack.pop();else if(token.startsWith('<')){const e=new Element(token.match(/^<(\w+)/)[1]);for(const [,key,value] of token.matchAll(/([\w-]+)="([^"]*)"/g))e.setAttribute(key,value);stack.at(-1).append(e);if(!token.endsWith('/>'))stack.push(e);}else stack.at(-1).textContent+=token;}}
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
const sounds=[],timing=SC.chessCaptureTiming;g.onEvent=e=>{if(e.type.startsWith('dino-'))sounds.push(e.type);};
function capture(color='w',victim='q',from='c3',to='d5'){
 g.start();g.search=null;sounds.length=0;
 g.position=new C.Chess('7k/7p/8/8/8/8/8/K7 '+color+' - - 0 1');
 g.position.put({type:'n',color},from);g.position.put({type:victim,color:color==='w'?'b':'w'},to);
 g.play({from,to});r.draw();
}
for(const color of ['w','b'])for(const victim of ['p','n','b','r','q']){
 capture(color,victim);assert.equal(g.position.get('d5').type,'n');assert.equal(g.position.get('c3'),undefined);assert.equal(g.lastMove.captured,victim);
 assert.equal(r.capturePiece.style.visibility,'hidden');assert.equal(r.captureLayer.style.display,'');assert.deepEqual(sounds,[]);
 assert(r.capturePrey.classList.contains(color==='w'?'ch-black':'ch-white'),'the swallowed piece has the enemy colour');
 const points=g.score,moves=g.history.length,initial=r.captureBody.attributes.transform;
 g.update(.2);r.draw();assert.notEqual(r.captureBody.attributes.transform,initial,'capture advances without a board revision');
 g.pause();r.draw();const frozen=r.captureBody.attributes.transform;g.update(60);r.draw();assert.equal(r.captureBody.attributes.transform,frozen);assert.deepEqual(sounds,[]);
 g.resume();g.update(timing.bite-.2+.001);r.draw();assert.deepEqual(sounds,[]);
 const before=r.capturePrey.attributes.transform;g.update(.3);r.draw();assert.notEqual(r.capturePrey.attributes.transform,before);
 assert.equal(g.score,points,'animation does not award extra points');assert.equal(g.history.length,moves);
 g.update(.7);r.draw();assert.equal(r.capturePrey.attributes.opacity,'0','victim is fully swallowed');
 assert.equal(r.captureLayer.style.opacity,undefined,'no fading capture layer');assert.equal(r.captureBody.attributes.opacity,undefined,'the dinosaur stays opaque');assert.equal(r.captureFace.attributes.opacity,undefined);
 assert.equal(r.capturePiece.style.visibility,'hidden','no second dinosaur fades in');
 g.update(timing.rest-g.clock+.000001);r.draw();
 assert.equal(r.captureBody.attributes.transform,'translate(350 350) scale(0.94 0.94) translate(-50 -50)','dinosaur reaches its square at normal size before the effect ends');
 assert.equal(r.captureJaw.attributes.transform,'rotate(0 62 43)');assert.equal(r.captureHead.attributes.transform,'translate(0 0)');assert.equal(r.captureMouth.attributes.opacity,'0');
 assert(r.capturePiece.querySelector('.ch-dino-jaw'),'the standing piece shares the same articulated dinosaur');
 const piece=r.capturePiece;g.update(.5);r.draw();assert.equal(r.captureLayer.style.display,'none');assert.equal(piece.style.visibility,'');assert.equal(r.captureLayer.children.length,0);
 assert.deepEqual(sounds,[],'captures emit no scream or chewing sounds');
}
capture('w','r','b6','a8');g.update(.42);r.draw();assert(r.captureBody.attributes.transform.includes('scale(-'),'left edge faces inwards');
g.update(timing.rest-g.clock+.000001);r.draw();assert.equal(r.captureBody.attributes.transform,'translate(50 50) scale(-0.94 0.94) translate(-50 -50)');
g.update(.1);r.draw();assert.equal(r.facings.get('a8'),-1);assert.equal(r.cells.find(c=>c.dataset.square==='a8').querySelector('.ch-piece-art').children[0].attributes.transform,'translate(100 0) scale(-1 1)');
g.play({from:'h8',to:'g8'});r.draw();assert.equal(r.facings.get('a8'),-1,'facing survives the opponent turn');
g.play({from:'a8',to:'c7'});r.draw();assert.equal(r.facings.get('c7'),-1,'the same dinosaur keeps its facing on a later quiet move');assert.equal(r.facings.has('a8'),false);
capture('b','r','g3','h1');g.update(.42);r.draw();assert(!r.captureBody.attributes.transform.includes('scale(-'),'right edge faces inwards');
context.matchMedia=()=>({matches:true});capture();const still=r.captureBody.attributes.transform;g.update(.6);r.draw();assert.equal(r.captureBody.attributes.transform,still,'reduced motion keeps the dinosaur stationary');assert.equal(r.captureJaw.attributes.transform,'rotate(0 62 43)');
context.matchMedia=()=>({matches:false});capture();const oldPiece=r.capturePiece;g.start();r.draw();assert.equal(oldPiece.style.visibility,'');assert.equal(r.captureLayer.style.display,'none');g.update(.5);assert.deepEqual(sounds,[],'restart stays silent');
capture();g.menu();g.update(10);r.draw();assert.equal(r.captureLayer.style.display,'none');assert.deepEqual(sounds,[],'menu stays silent');
g.start();sounds.length=0;g.play({from:'b1',to:'c3'});r.draw();assert.equal(r.captureLayer.style.display,'none');assert.deepEqual(sounds,[],'quiet dinosaur moves do not eat');
g.start();g.position=new C.Chess('7k/8/8/3p4/8/8/8/K2R4 w - - 0 1');g.play({from:'d1',to:'d5'});r.draw();assert.equal(r.captureLayer.style.display,'none');assert.deepEqual(sounds,[],'other pieces do not eat');
capture();const finalPiece=r.capturePiece;r.destroy();assert.equal(finalPiece.style.visibility,'');assert.equal(canvas.hidden,false);assert.equal(arena.children.length,1);
console.log('PASS chess renderer: '+options.length+' exercise/language combinations keep prompts and diagrams visible, never reveal hints after waiting or pausing, and accept answers; previews and cleanup work.');
console.log('PASS dinosaur captures: both colours and all victim pieces, silent captures and a solid final pose, pause/resume, unchanged scoring, board edges, reduced motion, restart, menu and renderer cleanup.');
