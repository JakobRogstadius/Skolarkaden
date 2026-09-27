'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({console,Event,EventTarget,CustomEvent:class extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}});
for(const name of ['data','language-exercises-data','language-exercises','homework','input','klossar'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+name+'.js'),'utf8'),context);
const SC=context.Starlight,rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function setup(options={},seed=9){const g=new SC.KlossarGame({random:rng(seed)});g.start({mode:'chinese',lang:'zh-TW',...options});return g;}
function balanced(g){
  const counts=new Map();
  for(const tile of g.getTargets())counts.set(tile.chinese,(counts.get(tile.chinese)||0)+(tile.side==='problem'?1:-1));
  assert([...counts.values()].every(n=>n===0),'remaining Hanzi and answers have the same readings and translations');
}
const items=[{label:'時',hint:'shí',translation:'tid'},{label:'時間',hint:'shí jiān',translation:'tid'},{label:'十',hint:'shí',translation:'tio'},{label:'是',hint:'shì',translation:'är'}];
{
  const g=setup({items});g.tiles.forEach((t,i)=>Object.assign(t,{x:i*2,y:0,z:0}));
  const time=g.tiles.find(t=>t.side==='problem'&&t.item.label==='時'),ten=g.tiles.find(t=>t.side==='answer'&&t.chinese.translation==='tio');
  assert(SC.klossarMatches(time,ten));assert(g.setChineseDisplay('translation'));assert(!SC.klossarMatches(time,ten));
  assert(g.setChineseDisplay('pinyin'));g.select(time.id);g.select(ten.id);assert.equal(g.hits,1);balanced(g);
  assert(g.setChineseDisplay('translation'));
  const a=g.getTargets().find(t=>t.side==='problem'&&t.item.label==='時'),b=g.getTargets().find(t=>t.side==='answer'&&t.chinese.pinyin==='shí jiān');
  assert(SC.klossarMatches(a,b));g.select(a.id);g.select(b.id);assert.equal(g.hits,2);balanced(g);
  const geometry=g.getTargets().map(t=>[t.id,t.x,t.y,t.z].join(','));g.update(1.5);
  const before={score:g.score,elapsed:g.elapsed,hits:g.hits,removed:g.tiles.filter(t=>t.removed).map(t=>t.id).join(',')};
  g.select(g.getAvailableTargets()[0].id);assert(g.selected.length);g.setChineseDisplay('pinyin');assert.equal(g.selected.length,0);
  assert.deepEqual(g.getTargets().map(t=>[t.id,t.x,t.y,t.z].join(',')),geometry);
  assert.deepEqual({score:g.score,elapsed:g.elapsed,hits:g.hits,removed:g.tiles.filter(t=>t.removed).map(t=>t.id).join(',')},before);
  for(const tile of g.getTargets())assert.equal(tile.side==='answer'?tile.item.label:tile.item.tooltip,tile.chinese[tile.side==='answer'?'pinyin':'translation']);
  g.pause();assert(!g.setChineseDisplay('translation'));g.resume();assert(!g.setChineseDisplay('invalid'));balanced(g);
}
// Alternate matching modes throughout full rounds, choosing interchangeable
// answers where available. Both remaining representations must stay solvable.
let rounds=0;
for(const mode of Object.keys(SC.modes).filter(SC.isChinese))for(const pace of ['gentle','steady','brave'])for(let seed=1;seed<=3;seed++){
  const g=setup({mode,pace,lang:SC.modes[mode].lang},seed);
  for(let pair=0;pair<g.total;pair++){
    g.setChineseDisplay(pair%2?'pinyin':'translation');balanced(g);
    const free=g.getAvailableTargets(),a=free.find(a=>free.some(b=>SC.klossarMatches(a,b))),partners=free.filter(b=>SC.klossarMatches(a,b));
    assert(a&&partners.length,'at least one free match in either mode');
    const b=partners.find(b=>b.chinese!==a.chinese)||partners[0];g.select(a.id);g.select(b.id);g.update(.1);balanced(g);
  }
  g.update(1);assert.equal(g.state,'won');assert.equal(g.getTargets().length,0);rounds++;
}
{
  const g=setup({items:[{label:'你',hint:'nǐ'}]});assert(!g.canTranslate());assert(!g.setChineseDisplay('translation'));assert.equal(g.chineseDisplay,'pinyin');
  const other=setup({mode:'swedish',lang:'sv-SE'});assert(!other.setChineseDisplay('translation'));
  SC.modes.homework=SC.parseHomework({test:{input:'voice',language:'zh-TW',words:[['你好','nǐ hǎo','hej']]}},'test');
  const homework=setup({mode:'homework'});assert(homework.setChineseDisplay('translation'));assert(homework.tiles.every(t=>t.side==='problem'?t.item.tooltip==='nǐ hǎo':t.item.label==='hej'));
}
console.log('PASS homophones and shared translations across display switches, preserved progress, opposite tooltips, Chinese homework and '+rounds+' complete rounds alternating modes');
