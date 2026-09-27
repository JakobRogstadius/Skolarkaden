'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({console,Event,EventTarget,CustomEvent:class extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}});
for(const name of ['data','language-exercises-data','language-exercises','homework','input','klossar'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+name+'.js'),'utf8'),context);
const SC=context.Starlight,rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function setup(options={},seed=9){const events=[],g=new SC.KlossarGame({random:rng(seed),onEvent:e=>events.push(e)});g.start(options);return {g,events};}
function playPair(g){const free=g.getAvailableTargets(),a=free.find(a=>free.some(b=>SC.klossarMatches(a,b)));assert(a,'remaining board has a legal match');const b=free.find(b=>SC.klossarMatches(a,b));g.select(a.id);g.select(b.id);}

// Covering and both horizontal sides matter; above/below neighbours do not.
const center={x:1,y:1,z:0},left={x:0,y:1,z:0},right={x:2,y:1,z:0},top={x:1,y:0,z:0},cover={x:1,y:1,z:1};
assert(SC.klossarIsFree(center,[center,left,top]));assert(!SC.klossarIsFree(center,[center,left,right]));
assert(!SC.klossarIsFree(center,[center,cover]));cover.removed=true;assert(SC.klossarIsFree(center,[center,cover]));
assert(!SC.klossarIsFree(center,[center,{x:1.5,y:1.5,z:1}]));

let deals=0;
for(const layout of SC.klossarLayouts)for(const [pace,count] of Object.entries(SC.klossarPairCounts))for(let seed=1;seed<=30;seed++){
  const {g}=setup({layout:layout.id,pace,mode:'math-addition'},seed);
  assert.equal(g.tiles.length,count*2);assert.equal(new Set(g.tiles.map(t=>[t.x,t.y,t.z].join(','))).size,count*2);
  for(const tile of g.tiles)if(tile.z)assert(g.tiles.some(t=>t.x===tile.x&&t.y===tile.y&&t.z===tile.z-1),'upper tiles have support');
  for(const [a,b] of g.order){assert(g.free(g.tiles[a])&&g.free(g.tiles[b]));assert(SC.klossarMatches(g.tiles[a],g.tiles[b]));g.tiles[a].removed=g.tiles[b].removed=true;}
  assert.equal(g.getTargets().length,0);deals++;
}
// The bounded fallback also works with degenerate (constant) random sources.
for(const layout of SC.klossarLayouts)for(const pace of Object.keys(SC.klossarPairCounts))assert(SC.klossarRemovalOrder(SC.klossarLayout(layout.id,pace),()=>0));
console.log('PASS '+deals+' solvable deals, five supported silhouettes, 20/30/40 pairs, geometry and fallback');

let rounds=0,shuffles=0;
for(const mode of Object.keys(SC.modes).filter(id=>id!=='homework'))for(let seed=1;seed<=4;seed++){
  const {g,events}=setup({mode,lang:SC.modes[mode].lang,pace:'brave'},seed);
  if(SC.isChinese(mode))for(const tile of g.tiles){assert(!tile.item.hint&&!tile.item.translation);if(tile.side==='problem')assert(/\p{Script=Han}/u.test(tile.item.label));}
  if(SC.isMath(mode))assert(g.tiles.filter(t=>t.side==='answer').every(t=>/^\d+$/.test(t.item.label)));
  if(['letters','swedish','swedishLong','english','englishLong'].includes(mode))for(const tile of g.tiles)assert.equal(tile.item.label,tile.side==='problem'?tile.item.label.toLocaleUpperCase('sv-SE'):tile.item.label.toLocaleLowerCase('sv-SE'));
  for(let n=0;n<40;n++){playPair(g);g.update(.3);}
  assert.equal(g.hits,40);assert.equal(g.getTargets().length,0);g.update(1);assert.equal(g.state,'won');
  assert.equal(events.filter(e=>e.type==='end').length,1);g.update(100);assert.equal(events.filter(e=>e.type==='end').length,1);
  shuffles+=g.reshuffles;rounds++;
}
assert(shuffles>0);console.log('PASS '+rounds+' complete rounds across all 29 exercises, including '+shuffles+' deadlock recoveries');

{
  const {g}=setup(),tile=g.getAvailableTargets()[0],blocked=g.getTargets().find(t=>!g.free(t));
  assert(!g.select(blocked.id));g.select(tile.id);assert.equal(g.selected.length,1);g.select(tile.id);assert.equal(g.selected.length,0);
  const wrong=g.getAvailableTargets().find(t=>t!==tile&&!SC.klossarMatches(tile,t));assert(wrong);
  g.select(tile.id);g.select(wrong.id);assert(g.feedback);assert.equal(g.getTargets().length,40);assert.equal(g.mistakes,1);assert.equal(g.score,0);
  const before=g.shots;assert(!g.select(tile.id));assert.equal(g.shots,before);g.update(.2);g.pause();const elapsed=g.elapsed,feedback=g.feedback.left;
  g.update(30);assert.equal(g.elapsed,elapsed);assert.equal(g.feedback.left,feedback);assert(!g.select(tile.id));g.resume();g.update(.23);assert.equal(g.selected.length,0);assert(!g.feedback);
  g.queue.enqueue('sol');g.update(2);assert.equal(g.hits,0,'text queue cannot remove tiles');
  playPair(g);assert.equal(g.hits,1);assert.equal(g.effects.length,2);assert.equal(g.score,100);
  const time=g.elapsed;g.update(2.4);assert.equal(g.elapsed,time+2.4,'slow foreground frames count in full');assert.equal(g.effects.length,0);
  g.menu();assert.equal(g.effects.length,0);assert.equal(g.elapsed,0);g.start();assert.equal(g.tiles.length,40);assert.equal(g.queue.length,0);
}
{
  const a={side:'problem',key:'math:6'},b={side:'answer',key:'math:6'},c={side:'answer',key:'math:6'};
  assert(SC.klossarMatches(a,b));assert(SC.klossarMatches(a,c));assert(!SC.klossarMatches(b,c));assert(!SC.klossarMatches(a,a));
  assert(SC.klossarScore(20,30)>SC.klossarScore(20,120));assert(SC.klossarScore(20,120)>SC.klossarScore(20,1200));assert(SC.klossarScore(20,1e6)>=2000);
}
// Repair an otherwise impossible remaining stack, retaining exactly its labels.
{
  const {g}=setup({mode:'letters'}),[a,b]=g.order[0].map(id=>g.tiles[id]);g.tiles.forEach(t=>t.removed=true);a.removed=b.removed=false;
  Object.assign(a,{x:0,y:0,z:0});Object.assign(b,{x:0,y:0,z:1});assert(!g.hasMove());
  const labels=[a.item.label,b.item.label].sort().join('|');g.reshuffle();assert(g.hasMove());assert.equal(g.getTargets().map(t=>t.item.label).sort().join('|'),labels);
}
// Tone marks are part of a Chinese answer; homophones with the same tones work.
{
  const {g}=setup({mode:'chinese',items:[{label:'十',hint:'shí'},{label:'是',hint:'shì'},{label:'時',hint:'shí'}]});
  const ten=g.tiles.find(t=>t.item.label==='十'),time=g.tiles.find(t=>t.item.label==='時'),shi2=g.tiles.find(t=>t.item.label==='shí'),shi4=g.tiles.find(t=>t.item.label==='shì');
  assert(SC.klossarMatches(ten,shi2));assert(SC.klossarMatches(time,shi2));assert(!SC.klossarMatches(ten,shi4));
  SC.modes.homework=SC.parseHomework({test:{input:'voice',language:'zh-TW',words:[['你好','nǐ hǎo','hej']]}},'test');
  const homework=setup({mode:'homework',lang:'zh-TW'}).g;assert(homework.tiles.every(t=>['你好','nǐ hǎo'].includes(t.item.label)));
}
console.log('PASS toggling, blocked tiles, wrong-pair feedback, smoke lifecycle, pause, real elapsed time, scoring, duplicates, tone distinctions and Chinese homework');
