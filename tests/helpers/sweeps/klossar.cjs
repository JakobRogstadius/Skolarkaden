'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({console,Event,EventTarget,CustomEvent:class extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}});
for(const name of ['data','language-exercises-data','language-exercises','homework','input','klossar'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+name+'.js'),'utf8'),context);
const SC=context.Starlight,rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function setup(options={},seed=9){const events=[],g=new SC.KlossarGame({random:rng(seed),onEvent:e=>events.push(e)});g.start(options);return {g,events};}
function playPair(g){const free=g.getAvailableTargets(),a=free.find(a=>free.some(b=>SC.klossarMatches(a,b)));assert(a,'remaining board has a legal match');const b=free.find(b=>SC.klossarMatches(a,b));g.select(a.id);g.select(b.id);}

exports.deals=function({seeds=30}={}){
let deals=0;
assert.deepEqual(Array.from(SC.klossarLayouts,l=>l.id),['square','igloo','pyramid','snake','bridge','v']);
for(const layout of SC.klossarLayouts)for(const [pace,count] of Object.entries(SC.klossarPairCounts))for(let seed=1;seed<=seeds;seed++){
  const {g}=setup({layout:layout.id,pace,mode:'math-addition'},seed);
  assert.equal(g.tiles.length,count*2);assert.equal(new Set(g.tiles.map(t=>[t.x,t.y,t.z].join(','))).size,count*2);
  const area=(a,b)=>Math.max(0,1-Math.abs(a.x-b.x))*Math.max(0,1-Math.abs(a.y-b.y));
  for(const tile of g.tiles){
    assert(Number.isFinite(tile.x)&&Number.isFinite(tile.y)&&Number.isInteger(tile.z)&&tile.z>=0);
    assert(!g.tiles.some(t=>t!==tile&&t.z===tile.z&&area(tile,t)>1e-8),'tiles on the same layer never overlap');
    if(['square','snake'].includes(layout.id)){
      assert(Number.isInteger(tile.x*2)&&Number.isInteger(tile.y*2),'supported layouts use a half-tile grid');
      if(tile.z)assert.equal(g.tiles.filter(t=>t.z===tile.z-1).reduce((sum,t)=>sum+area(tile,t),0),1,'square and snake tiles have full support');
    }
  }
  const openingLimit=(layout.id==='v'?{gentle:12,steady:16,brave:20}:{gentle:9,steady:13,brave:20})[pace];
  assert(g.getAvailableTargets().length<=openingLimit,'deep stacks limit the opening selection');
  for(const [a,b] of g.order){assert(g.free(g.tiles[a])&&g.free(g.tiles[b]));assert(SC.klossarMatches(g.tiles[a],g.tiles[b]));g.tiles[a].removed=g.tiles[b].removed=true;}
  assert.equal(g.getTargets().length,0);deals++;
}
// The bounded fallback also works with degenerate (constant) random sources.
for(const layout of SC.klossarLayouts)for(const pace of Object.keys(SC.klossarPairCounts))for(const value of [0,.31,.999999]){
  const tiles=SC.klossarLayout(layout.id,pace),order=SC.klossarRemovalOrder(tiles,()=>value);
  assert(order);assert.equal(order.length,tiles.length/2);
  for(const [a,b] of order){assert(a!==b&&SC.klossarIsFree(tiles[a],tiles)&&SC.klossarIsFree(tiles[b],tiles));tiles[a].removed=tiles[b].removed=true;}
  assert(tiles.every(t=>t.removed),'fallback removes every tile exactly once');
}
console.log('PASS '+deals+' solvable deals, '+SC.klossarLayouts.length+' silhouettes, 20/30/40 pairs, support, hollow overhangs and fallback');

};
exports.rounds=function({seeds=4,modes,requireShuffle=true}={}){
let rounds=0,shuffles=0;
for(const mode of modes || Object.keys(SC.modes).filter(id=>id!=='homework'))for(let seed=1;seed<=seeds;seed++){
  const {g,events}=setup({mode,lang:SC.modes[mode].lang,pace:'brave'},seed);
  if(SC.isChinese(mode))for(const tile of g.tiles){assert(!tile.item.hint&&!tile.item.translation);if(tile.side==='problem')assert(/\p{Script=Han}/u.test(tile.item.label));}
  if(SC.isMath(mode))assert(g.tiles.filter(t=>t.side==='answer').every(t=>/^\d+$/.test(t.item.label)));
  if(['letters','swedish','swedishLong','english','englishLong'].includes(mode))for(const tile of g.tiles)assert.equal(tile.item.label,tile.side==='problem'?tile.item.label.toLocaleUpperCase('sv-SE'):tile.item.label.toLocaleLowerCase('sv-SE'));
  for(let n=0;n<40;n++){playPair(g);g.update(.3);}
  assert.equal(g.hits,40);assert.equal(g.getTargets().length,0);g.update(1);assert.equal(g.state,'won');
  assert.equal(events.filter(e=>e.type==='end').length,1);g.update(100);assert.equal(events.filter(e=>e.type==='end').length,1);
  shuffles+=g.reshuffles;rounds++;
}
if(requireShuffle)assert(shuffles>0);console.log('PASS '+rounds+' complete rounds across selected exercises, including '+shuffles+' deadlock recoveries');
};
