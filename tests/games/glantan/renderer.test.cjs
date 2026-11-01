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
console.log('renderer: sprite reuse, upgrade invalidation, continuous direction, interpolation ownership and bounded bitmap lifetime');
