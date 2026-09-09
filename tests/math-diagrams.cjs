'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({console,Event,EventTarget});
for(const file of ['data','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),context);
const SC=context.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const diagrams=SC.mathLevel('math-diagrams'),equations=SC.mathLevel('math-simple-equations');
const math=Object.entries(SC.modes).filter(([id])=>SC.isMath(id));
assert.deepEqual(math.map(([,m])=>m.name),['Matematik 1 (+)','Matematik 2 (enkla diagram)','Matematik 3 (+ och −)','Matematik 4 (enkla ekvationer)','Matematik 5 (10–100)','Matematik 6 (×)','Matematik 7 (× och ÷)','Matematik 8 (ekvationer)']);
assert.deepEqual(Array.from(SC.mathPool(diagrams).keys()),[1,2,3,4,5,6,7,8,9,10]);
const kinds=new Set(),orientations=new Set(),colors=new Set(),notchCounts=new Set(),barRatios=new Set(),pieFractions=new Set(),answerKinds=new Map();
for(let n=1;n<=10;n++)for(let seed=1;seed<=300;seed++){
 const item=SC.makeMath(n,rng(seed*103+n),diagrams),d=item.diagram;
 assert.equal(item.answer,String(n));assert.equal(item.label,'?');assert.equal(d.answer,n);kinds.add(d.kind);d.colors.forEach(c=>colors.add(c));
 if(!answerKinds.has(n))answerKinds.set(n,new Set());answerKinds.get(n).add(d.kind);
 if(d.kind==='pie'||d.kind==='bars'){
  assert(Number.isInteger(d.known)&&d.known>=1&&d.known<=10);
  if(d.kind==='bars'){
   const ratio=Math.max(n,d.known)/Math.min(n,d.known);assert([1,1.5,2,3,4].includes(ratio),JSON.stringify(d));barRatios.add(ratio);orientations.add(d.horizontal);
  }else{
   const total=n+d.known,denominator=total/Math.min(n,d.known);assert(total<=10);assert([2,3,4,5].includes(denominator),JSON.stringify(d));pieFractions.add(denominator);
  }
 }else if(d.kind==='dots'){
  assert.equal(d.dots.length,n);
  for(const [i,p] of d.dots.entries()){
   assert(p.x>=6&&p.x<=98&&p.y>=6&&p.y<=66);
   for(const q of d.dots.slice(i+1))assert(Math.hypot(p.x-q.x,p.y-q.y)>=14-1e-8,'dots overlap');
  }
 }else{
  notchCounts.add(d.notches);assert(d.notches>=3&&d.notches<=4);assert(d.unknown>=1&&d.unknown<=d.notches);
  assert.equal(d.step,1);assert.equal(d.end-d.start,d.notches+1);assert(d.end<=10);
  assert.equal(d.start+(d.end-d.start)*d.unknown/(d.notches+1),n);assert(d.start>=0&&d.end>n);
 }
 for(const lang of ['sv-SE','en-US','zh-CN','zh-TW'])assert(SC.matches(SC.numberName(n,lang),item,'math-diagrams',lang,'speech'));
}
assert.equal(kinds.size,4);assert.equal(orientations.size,2);assert.equal(colors.size,6);assert.equal(notchCounts.size,2);
assert.deepEqual([...barRatios].sort((a,b)=>a-b),[1,1.5,2,3,4]);assert.deepEqual([...pieFractions].sort(),[2,3,4,5]);
for(let n=1;n<=10;n++){
 assert.equal(answerKinds.get(n).has('pie'),![7,9,10].includes(n));
 assert.equal(answerKinds.get(n).has('number-line'),n<10);
 assert(answerKinds.get(n).has('bars')&&answerKinds.get(n).has('dots'));
}
// Degenerate RNGs must terminate, including rejection sampling for ten dots.
for(const random of [()=>0,()=>.51,()=>.999999])assert.equal(SC.makeMath(10,random,diagrams).answer,'10');
let equationCount=0,plus=0,minus=0;
for(const [n,labels] of SC.mathPool(equations))for(const label of labels){
 const match=label.match(/^(\d) \+ (\d) = 10 ([+−]) \?$/);assert(match,label);
 const [,a,b,op]=match;assert.equal(Number(a)+Number(b),op==='+'?10+n:10-n);assert(n>=0&&n<=10);
 equationCount++;if(op==='+')plus++;else minus++;
}
assert.equal(equationCount,100);assert(plus&&minus);
assert.deepEqual(Array.from(SC.mathPool(equations).keys()).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7,8,9,10]);
for(let n=0;n<=10;n++)for(const lang of ['sv-SE','en-US','zh-CN','zh-TW']){
 const item=SC.makeMath(n,rng(5+n),equations);assert(SC.matches(String(n),item,'math-simple-equations'));assert(SC.matches(SC.numberName(n,lang),item,'math-simple-equations',lang,'speech'));
}
console.log('PASS Diagram answers, proportions, non-overlapping dots, number lines, all 100 simple equations and spoken answers');
