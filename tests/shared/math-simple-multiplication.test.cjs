'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({});
for(const file of ['data','speech','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../resources/'+file+'.js'),'utf8'),context);
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
  // All units fill the image, with no outer margins, text or answer.
  for(const box of [{x:0,y:0,w:112,h:80},{x:9,y:13,w:56,h:40},{x:4,y:8,w:280,h:180}]){
    const cells=[],texts=[],borders=[],c=new Proxy({
      fillRect(x,y,w,h){cells.push({x,y,w,h});},
      strokeRect(x,y,w,h){borders.push({x,y,w,h,lineWidth:this.lineWidth});},
      fillText(text){texts.push(text);}
    },{get:(target,key)=>key in target?target[key]:()=>{}});
    SC.drawMathDiagram(c,d,box);
    assert.equal(cells.length,answer);assert.deepEqual(texts,[]);
    const scale=Math.min(box.w/112,box.h/80,1),w=112*scale,h=80*scale,x=box.x+(box.w-w)/2,y=box.y+(box.h-h)/2;
    const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
    near(Math.min(...cells.map(s=>s.x)),x);near(Math.min(...cells.map(s=>s.y)),y);
    near(Math.max(...cells.map(s=>s.x+s.w)),x+w);near(Math.max(...cells.map(s=>s.y+s.h)),y+h);
    assert.equal(new Set(cells.map(s=>s.x)).size,d.columns);assert.equal(new Set(cells.map(s=>s.y)).size,d.rows);
    near(cells.reduce((sum,s)=>sum+s.w*s.h,0),w*h);
    for(const [i,s] of cells.entries()){
      near(s.w,w/d.columns);near(s.h,h/d.rows);
      assert(cells.slice(i+1).every(t=>s.x+s.w<=t.x+1e-8||t.x+t.w<=s.x+1e-8||s.y+s.h<=t.y+1e-8||t.y+t.h<=s.y+1e-8));
    }
    assert.equal(borders.length,1);const border=borders[0];
    near(border.x-border.lineWidth/2,x);near(border.y-border.lineWidth/2,y);
    near(border.x+border.w+border.lineWidth/2,x+w);near(border.y+border.h+border.lineWidth/2,y+h);
  }
}
assert.equal(seen.size,25);
for(let rows=2;rows<=6;rows++)for(let columns=2;columns<=6;columns++)assert(seen.has(rows+'x'+columns));
for(const answer of [0,1,5,7,35,37,49])assert.throws(()=>SC.makeMath(answer,Math.random,level),{name:'RangeError'});
// Hit testing follows canvas transforms, CSS scaling and object-fit letterboxing.
for(const m of [{a:2,b:0,c:0,d:2,e:100,f:120},{a:0,b:2,c:-2,d:0,e:300,f:100}]){
  const canvas={width:1000,height:600,getBoundingClientRect:()=>({left:20,top:40,width:500,height:400})};
  const c=new Proxy({canvas,getTransform:()=>m},{get:(target,key)=>key in target?target[key]:()=>{}});
  const d={kind:'multiplication-grid',rows:3,columns:6,answer:18};
  SC.drawMathDiagram(c,d,{x:0,y:0,w:112,h:80});
  const point=(x,y)=>[20+(m.a*x+m.c*y+m.e)/2,90+(m.b*x+m.d*y+m.f)/2];
  const speech=SC.mathDiagramSpeechAt(canvas,...point(56,40));
  assert.equal(speech.text,'tre gånger sex');assert.equal(speech.lang,'sv-SE');
  assert.equal(SC.mathDiagramSpeechAt(canvas,...point(-1,40)),null);
  SC.clearMathDiagramHits(canvas);assert.equal(SC.mathDiagramSpeechAt(canvas,...point(56,40)),null,'old frame is no longer clickable');
}
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
console.log('PASS All 25 grids fill the unlabelled 112 × 80 diagram area; products, typed/spoken answers and interim Swedish transcripts');
