'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({console,performance,Event,EventTarget,CustomEvent:class extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}});
for(const name of ['data','language-exercises-data','language-exercises','homework','input','klossar','trassel-engine','trassel-layouts','trassel'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+name+'.js'),'utf8'),context);
const SC=context.Starlight,E=SC.TrasselEngine;
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const done=search=>{let r;do{r=search.next();}while(!r.done);return r.value;};
const key=text=>String(text).normalize('NFC').toLocaleLowerCase('sv-SE').trim().replace(/\s+/g,' ');
function setup(options={},seed=9){const g=new SC.TrasselGame({random:rng(seed)});g.start({mode:'chinese',lang:'zh-TW',...options});done(g.search);return g;}
function draw(g,p){assert(g.begin(p[0]));for(const id of p.slice(1))assert(g.move(id));g.release();}
function verifyView(g){
  for(const t of g.tiles){
    assert.equal(t.side==='answer'?t.item.label:t.item.tooltip,t.chinese[t.side==='answer'?g.chineseDisplay:g.chineseDisplay==='pinyin'?'translation':'pinyin']);
    for(const u of g.tiles)if(t.side!==u.side)assert.equal(E.matches(t,u),key(t.chinese[g.chineseDisplay])===key(u.chinese[g.chineseDisplay]),'all visibly equivalent answers are interchangeable');
  }
  for(const line of g.lines)assert(E.matches(g.tileById.get(line.path[0]),g.tileById.get(line.path.at(-1))),'completed connections remain correct');
  const result=done(E.solve(g.board,g.tiles,g.solution.map(path=>({path}))));
  assert.equal(result.status,'solved');assert.equal(g.maxUnused,g.board.cells.length-result.cost);
}
const snapshot=g=>JSON.stringify({board:g.board,lines:g.lines,solution:g.solution,score:g.score,scoreParts:g.scoreParts,maxUnused:g.maxUnused,elapsed:g.elapsed,hits:g.hits,mistakes:g.mistakes,hints:g.hints,boardRevision:g.boardRevision,lastHintRevision:g.lastHintRevision});
let rounds=0;
for(const mode of Object.keys(SC.modes).filter(SC.isChinese))for(const pace of ['gentle','steady','brave'])for(const seed of [3,19]){
  const g=setup({mode,pace},seed);assert(g.canTranslate());assert.equal(g.chineseDisplay,'pinyin');verifyView(g);
  g.update(5);draw(g,g.solution[0]);g.lines[0].gray=true;
  const before=snapshot(g);assert(g.setChineseDisplay('translation'));verifyView(g);assert.equal(snapshot(g),before,'switching preserves geometry, progress, hints, timing and scoring');
  assert(g.setChineseDisplay('pinyin'));verifyView(g);assert.equal(snapshot(g),before);
  assert(!g.setChineseDisplay('pinyin'));assert(!g.setChineseDisplay('invalid'));
  g.pause();assert(!g.setChineseDisplay('translation'));g.resume();
  assert(g.begin(g.solution[1][0]));assert(!g.setChineseDisplay('translation'),'finish a stroke before switching');g.release();
  g.phase='checking';assert(!g.setChineseDisplay('translation'));g.phase='ready';
  for(let i=1;i<g.solution.length;i++){g.setChineseDisplay(i%2?'translation':'pinyin');verifyView(g);draw(g,g.solution[i]);}
  assert.equal(g.state,'celebrating');assert(!g.setChineseDisplay(g.chineseDisplay==='pinyin'?'translation':'pinyin'));g.update(1);assert.equal(g.state,'won');rounds++;
}
// Homophones and shared meanings form overlapping groups. Keep a maximum
// compatible subset, not a greedy subset that unnecessarily repeats answers.
const ambiguous=[{label:'時',hint:'shí',translation:'tid'},{label:'時間',hint:'shí jiān',translation:'tid'},{label:'十',hint:'shí',translation:'tio'},{label:'是',hint:'shì',translation:'är'}];
for(let seed=1;seed<=30;seed++){
  const g=setup({items:ambiguous},seed);assert.equal(new Set(g.pairs.map(p=>p.key)).size,3);verifyView(g);
  g.setChineseDisplay('translation');verifyView(g);g.setChineseDisplay('pinyin');verifyView(g);
}
{
  const g=setup({items:[{label:'你',hint:'nǐ'}]});assert(!g.canTranslate());assert(!g.setChineseDisplay('translation'));assert.equal(g.chineseDisplay,'pinyin');
  assert(!setup({mode:'letters'}).setChineseDisplay('translation'));
  SC.modes.homework=SC.parseHomework({test:{input:'voice',language:'zh-TW',words:[['你好','nǐ hǎo','hej'],['您好','nín hǎo','hej'],['謝謝','xiè xie','tack']]}},'test');
  const homework=setup({mode:'homework'});assert(homework.canTranslate());assert(homework.setChineseDisplay('translation'));verifyView(homework);
  for(const p of homework.solution)draw(homework,p);assert.equal(homework.state,'celebrating');
}
console.log('PASS Chinese display, visible matching equivalence, maximum vocabulary subset, homework, missing translations, preserved routes/scores and '+rounds+' complete alternating rounds');
