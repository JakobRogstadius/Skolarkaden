'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({});
for(const file of ['data','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),context);
const SC=context.Starlight,mode='math-simple-multiplication',level=SC.mathLevel(mode),pool=SC.mathPool(level);
assert.equal(SC.modes[mode].name,'Enkel multiplikation');
assert.equal(SC.modes[mode].menuLabel,'Enkel multiplikation');
const menu=SC.groupExercises('math').map(([id])=>id);
assert.equal(menu.indexOf(mode)+1,menu.indexOf('math-multiplication'));
const answers=[4,6,8,9,10,12,15,16,18,20,24,25,30,36];
assert.deepEqual(Array.from(pool.keys()).sort((a,b)=>a-b),answers);
assert.deepEqual(Array.from(SC.vocabulary(mode),item=>Number(item.answer)).sort((a,b)=>a-b),answers);
const seen=new Set();
for(const [answer,choices] of pool)for(let index=0;index<choices.length;index++){
  const item=SC.makeMath(answer,()=>(index+.5)/choices.length,level),d=item.diagram;
  assert.equal(d.kind,'multiplication-grid');assert.equal(d.rows*d.columns,answer);
  assert.equal(item.answer,String(answer));assert.equal(d.answer,answer);
  assert(Number.isInteger(d.rows)&&d.rows>=2&&d.rows<=6);
  assert(Number.isInteger(d.columns)&&d.columns>=2&&d.columns<=6);
  seen.add(d.rows+'x'+d.columns);
  assert(item.label.endsWith('= ?'));assert.equal(item.hint,'');
  assert(SC.matches(String(answer),item,mode));assert(!SC.matches(String(answer+1),item,mode));
  for(const lang of ['sv-SE','en-US','zh-CN','zh-TW'])assert(SC.matches(SC.numberName(answer,lang),item,mode,lang,'speech'));
  // Inspect what is actually drawn: one separate square per unit, and no visible answer.
  const squares=[],texts=[],c=new Proxy({
    fillRect(x,y,w,h){squares.push({x,y,w,h});},
    fillText(text){texts.push(String(text));}
  },{get:(target,key)=>key in target?target[key]:()=>{}});
  SC.drawMathDiagram(c,d,{x:0,y:0,w:112,h:80});
  assert.equal(squares.length,answer);assert.deepEqual(texts,['= ?']);
  assert.equal(new Set(squares.map(s=>s.x)).size,d.columns);
  assert.equal(new Set(squares.map(s=>s.y)).size,d.rows);
  for(const [i,s] of squares.entries()){
    assert.equal(s.w,s.h);assert(s.w>0&&s.x>=0&&s.y>=0&&s.x+s.w<72&&s.y+s.h<=72);
    assert(squares.slice(i+1).every(t=>s.x+s.w<t.x||t.x+t.w<s.x||s.y+s.h<t.y||t.y+t.h<s.y));
  }
}
assert.equal(seen.size,25);
for(let rows=2;rows<=6;rows++)for(let columns=2;columns<=6;columns++)assert(seen.has(rows+'x'+columns));
for(const answer of [0,1,5,7,35,37,49])assert.throws(()=>SC.makeMath(answer,Math.random,level),{name:'RangeError'});
console.log('PASS All 25 multiplication grids, exact square counts, bounds, menu order, hidden answers and typed/spoken input');
