'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const { runtime } = require('./helpers.cjs');
const { G, SC, context } = runtime();
const canvases = [];
function drawing() {
  return new Proxy({ drawImage() {}, createRadialGradient: () => ({ addColorStop() {} }) }, {
    get(target,key) { return key in target ? target[key] : () => {}; }
  });
}
context.document = { createElement() { const canvas = { width:0, height:0, getContext:()=>drawing() }; canvases.push(canvas); return canvas; } };
for (const name of ['art','combat-art','sprites','renderer']) vm.runInContext(fs.readFileSync('resources/glantan/'+name+'.js','utf8'),context);
const w = new G.Simulation({seed:'sprite-regression'}).world, hero = G.addHero(w,'warrior'), c = drawing(), cache = new G.SpriteCache();
hero.route = []; hero.facing = 1;
G.Art.hero(c,hero,w,1,false,cache); const initial = canvases.length;
hero.x += .2; G.Art.hero(c,hero,w,1.01,false,cache);
assert.equal(canvases.length,initial,'translation reuses the same artwork');
w.choices.warrior = 'banner'; G.Art.hero(c,hero,w,1.01,false,cache);
assert(canvases.length > initial,'an upgrade selects different artwork');
hero.actionCue = {at:1,kind:'attack',dx:1,dy:0};
cache.beginFrame();
G.Art.hero(c,hero,w,1.2,false,cache); const attack = canvases.length;
hero.actionCue.dx = -1; hero.actionCue.dy = .7;
G.Art.hero(c,hero,w,1.2,false,cache);
assert.equal(canvases.length,attack,'direction is applied continuously outside the frame cache');
const r = Object.create(SC.GlantanRenderer.prototype);
r.previousPositions = new WeakMap([[hero,{x:hero.x-1,y:hero.y}]]); r.renderUnits = new WeakMap(); r.renderAlpha = .5;
const view = r.renderUnit(hero); assert.equal(view.x,hero.x-.5); assert.equal(view.classId,'warrior');
assert.equal(r.renderUnit(hero),view,'interpolation reuses the visual object');
G.Art.hero(c,view,w,1.4,false,cache); assert.equal(hero.x,view.x+.5,'drawing never changes simulation coordinates');
const bounded = new G.SpriteCache(4*1024*1024); bounded.scale = 2;
for (const type of Object.keys(G.monsterTypes)) for (let i=0;i<32;i++) {
  bounded.beginFrame();
  const m = {id:1,type,monster:true,x:0,y:0,hp:100,rank:3,strength:2,facing:1,route:[],actionCue:{at:0,kind:'attack',dx:1,dy:0}};
  G.Art.monster(c,m,w,i/40,false,bounded);
  assert(bounded.bytes <= bounded.limit,'animation storage stays within its byte budget');
}
assert(canvases.some(canvas=>canvas.width===0),'eviction releases the bitmap backing store');
bounded.clear(); assert.equal(bounded.bytes,0); assert.equal(bounded.entries.size,0);

class PreviewElement {
  constructor(tag) { this.tagName=tag; this.children=[]; this.attributes={}; this.dataset={}; this.className=''; this.textContent=''; }
  append(...children) { this.children.push(...children); }
  setAttribute(name,value) { this.attributes[name]=String(value); }
  replaceChildren(...children) { this.children=[...children]; }
}
context.document={createElement:tag=>new PreviewElement(tag)};
for (const name of ['ui-art','interface']) vm.runInContext(fs.readFileSync('resources/glantan/'+name+'.js','utf8'),context);
G.UI.portrait=(_world,_kind,type)=>{const portrait=new PreviewElement('span');portrait.monsterType=type;return portrait;};
const previewWorld=G.createMap('preview-three-type','brave'), site=previewWorld.lairSites.find(l=>!l.boss), lair=G.addLair(previewWorld,{...site,type:'hush',tier:3},0);
lair.level=4; lair.tier=3;
const originalRoster=G.waveRoster;
G.waveRoster=()=>['rattler','rattler','mender','nightwing','nightwing'];
const previewPanel=new PreviewElement('div'), preview={game:{world:previewWorld},panel:previewPanel,live:[]};
G.Interface.prototype.lairStatus.call(preview,lair,G.lairTypes[lair.type]);
const wavePreview=previewPanel.children.find(node=>node.className==='g-wave');
assert(wavePreview,'lair inspection renders a wave preview');
const shown=[...wavePreview.children].map(group=>[group.children[0].monsterType,group.children[1].textContent]);
G.launchWave(previewWorld,lair);
const spawned=previewWorld.monsters.filter(m=>!m.guard&&m.lair===lair.id&&m.wave===lair.waveCount).reduce((counts,m)=>(counts[m.type]=(counts[m.type]||0)+1,counts),{});
assert.deepEqual(shown.map(([type,count])=>[type,Number(count.replace('× ',''))]),Object.entries(spawned),'preview counts match a spawned three-species wave');
assert.equal(wavePreview.attributes['aria-label'],'Anfall: 2 Skramlare, 1 Skrotläkare, 2 Nattvinge');
G.waveRoster=originalRoster;
console.log('renderer: sprite reuse, upgrade invalidation, continuous direction, interpolation ownership and bounded bitmap lifetime');
