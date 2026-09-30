/* Exercise the real renderer against a small DOM stand-in, without a browser. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
class Element extends EventTarget{
 constructor(tag='div'){super();Object.assign(this,{tagName:tag,children:[],dataset:{},style:{},attributes:{},className:'',textContent:''});this.classList={contains:c=>this.className.split(' ').includes(c),toggle:(c,on)=>{const list=new Set(this.className.split(' ').filter(Boolean));if(on)list.add(c);else list.delete(c);this.className=[...list].join(' ');}};}
 append(...items){for(const e of items){e.parentElement=this;this.children.push(e);}}replaceChildren(...items){this.children=[];this.append(...items);}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this);}
 setAttribute(k,v){this.attributes[k]=v;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 querySelectorAll(selector){const out=[];for(const child of this.children){if(selector.startsWith('.')?child.classList.contains(selector.slice(1)):child.tagName===selector)out.push(child);out.push(...child.querySelectorAll(selector));}return out;}
 set innerHTML(html){this.children=[];const stack=[this];for(const token of html.match(/<[^>]+>|[^<]+/g)||[]){if(token.startsWith('</'))stack.pop();else if(token.startsWith('<')){const e=new Element(token.match(/^<(\w+)/)[1]);e.className=token.match(/class="([^"]*)"/)?.[1]||'';stack.at(-1).append(e);stack.push(e);}else stack.at(-1).textContent+=token;}}
 getContext(){const noop=()=>{};return new Proxy({measureText:t=>({width:t.length*8})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});}
}
const context=vm.createContext({Event,EventTarget,CustomEvent,console,performance,document:{createElement:tag=>new Element(tag)},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
for(const f of ['pinyin','data','language-exercises-data','language-exercises','homework','voice','speech','input','game','reversi-engine','reversi','reversi-renderer'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+f+'.js'),'utf8'),context);
const SC=context.Starlight,g=new SC.ReversiGame(),canvas=new Element('canvas'),arena=new Element();arena.append(canvas);g.start({mode:'math-multiplication'});
const r=new SC.ReversiRenderer(canvas,g);assert(canvas.hidden);assert.equal(r.cells.length,64);assert.equal(r.cells.filter(c=>c.classList.contains('occupied')).length,4);
while(g.phase!=='answer')g.update(.05);r.draw();assert.equal(r.choices.children.length,3);
for(const t of g.targets){const card=r.choices.children.find(c=>c.dataset.choice===t.letter);assert.equal(card.querySelector('.rv-question').textContent,t.item.label);assert.equal(card.querySelector('.rv-coordinate').textContent,SC.Reversi.coordinate(t.move.index));assert.equal(r.cells[t.move.index].querySelector('.rv-marker').textContent,t.letter);assert(!JSON.stringify(card.attributes).includes(String(t.move.value)+' rank'));}
const target=g.targets[0];r.choices.children[0].dispatchEvent(new Event('pointerenter'));assert.equal(g.turns,0,'preview does not play');assert.equal(r.cells.filter(c=>c.classList.contains('rv-preview')).length,target.move.flips.length);
g.queue.enqueue(target.item.answer);g.update(.05);r.draw();assert.equal(r.cells.filter(c=>c.classList.contains('occupied')).length,5);assert.equal(r.node.querySelector('.rv-black-count').textContent,g.score);assert.equal(r.node.querySelector('.rv-white-count').textContent,g.botScore);
g.pause();r.draw();assert.equal(r.status.textContent,'Paus');g.resume();
g.start({mode:'math-diagrams'});while(g.phase!=='answer')g.update(.05);r.draw();assert.equal(r.node.querySelectorAll('.rv-diagram').length,3);
g.start({mode:'chinese',lang:'zh-TW'});while(g.phase!=='answer')g.update(.05);r.draw();assert(r.node.querySelectorAll('.rv-hint').every(e=>e.textContent==='\u00a0'));
g.update(10);r.draw();assert(r.node.querySelectorAll('.rv-hint').some(e=>e.textContent!=='\u00a0'));
g.board=new Int8Array(64).fill(1);g.beginTurn(1);r.draw();assert.equal(r.status.textContent,'Du vann! 64–0');assert.equal(r.choices.children.length,1);
r.destroy();assert.equal(canvas.hidden,false);assert.equal(arena.children.length,1);
console.log('PASS Reversi renderer: board, question markers, preview, flips, counts, pause, diagrams, hints, result and cleanup.');
