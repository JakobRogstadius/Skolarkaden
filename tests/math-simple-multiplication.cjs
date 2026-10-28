'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({});
for(const file of ['data','speech','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),context);
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
  assert.equal(item.label,`${d.rows} rader och ${d.columns} kolumner`);assert.equal(item.hint,'');
  assert.equal(SC.labelWidth({},item),112);assert.equal(SC.labelHeight(item,20),80);
  assert(SC.matches(String(answer),item,mode));assert(!SC.matches(String(answer+1),item,mode));
  for(const lang of ['sv-SE','en-US','zh-CN','zh-TW'])assert(SC.matches(SC.numberName(answer,lang),item,mode,lang,'speech'));
  // Inspect what is actually drawn: one separate square per unit, and no visible answer.
  const squares=[],texts=[],c=new Proxy({
    fillRect(x,y,w,h){squares.push({x,y,w,h});},
    fillText(text,x,y){texts.push({text:String(text),x,y});}
  },{get:(target,key)=>key in target?target[key]:()=>{}});
  SC.drawMathDiagram(c,d,{x:0,y:0,w:112,h:80});
  assert.equal(squares.length,answer);assert.deepEqual(texts.map(t=>t.text),[String(d.columns),String(d.rows)]);
  const top=texts[0],left=texts[1],grid={x:Math.min(...squares.map(s=>s.x)),y:Math.min(...squares.map(s=>s.y)),right:Math.max(...squares.map(s=>s.x+s.w)),bottom:Math.max(...squares.map(s=>s.y+s.h))};
  assert.equal(top.x,(grid.x+grid.right)/2);assert.equal(left.y,(grid.y+grid.bottom)/2);
  // Reserve the full 16 px font height and a 12 px digit width inside the diagram.
  for(const t of texts)assert(t.x-6>=0&&t.x+6<=104&&t.y-8>=0&&t.y+8<=72);
  assert(top.y+8<grid.y);assert(left.x+6<grid.x);
  assert.equal(new Set(squares.map(s=>s.x)).size,d.columns);
  assert.equal(new Set(squares.map(s=>s.y)).size,d.rows);
  for(const [i,s] of squares.entries()){
    assert.equal(s.w,s.h);assert(s.w>0&&s.x>=.5&&s.y>=.5&&s.x+s.w+.5<=104&&s.y+s.h+.5<=72);
    assert(squares.slice(i+1).every(t=>s.x+s.w<t.x||t.x+t.w<s.x||s.y+s.h<t.y||t.y+t.h<s.y));
  }
}
assert.equal(seen.size,25);
for(let rows=2;rows<=6;rows++)for(let columns=2;columns<=6;columns++)assert(seen.has(rows+'x'+columns));
for(const answer of [0,1,5,7,35,37,49])assert.throws(()=>SC.makeMath(answer,Math.random,level),{name:'RangeError'});
const item=SC.makeMath(36,()=>0,level),speechContext={lesson:mode,language:'sv-SE',candidates:[item,SC.makeMath(30,()=>0,level)]};
const result=(transcript,isFinal=false)=>Object.assign([{transcript}],{isFinal});
for(const text of ['36','trettiosex','trettio sex','Trettiosex.']){
  assert(SC.matches(text,item,mode,'sv-SE','speech'),text);
  assert.deepEqual(Array.from(SC.tokenizeSpeech(text,speechContext)),[text]);
  const sent=[],stream=new SC.SpeechStream({getContext:()=>speechContext,enqueue:text=>{const entry={text};sent.push(entry);return entry;}});
  stream.update([result('trettio')]);assert.equal(sent.length,0,'do not answer 30 before recognition completes');
  stream.update([result(text,true)]);assert.equal(sent.length,1);assert(SC.matches(sent[0].text,item,mode,'sv-SE','speech'));
  stream.update([result(text,true)]);assert.equal(sent.length,1,'a repeated final result is not a second answer');
}
console.log('PASS All 25 labelled grids fit the simple-diagram area; products, typed/spoken answers and interim Swedish transcripts');
