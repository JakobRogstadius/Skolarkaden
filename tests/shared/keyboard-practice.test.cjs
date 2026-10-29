'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math});
for(const file of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../resources/'+file+'.js'),'utf8'),context,{filename:file+'.js'});
const SC=context.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
test('Swedish subsets are actual 3x3, 2x5 or full letter rows, cover åäö, and include every keyboard letter',()=>{
  for(const lang of ['sv-SE','en-US']){
    const rows=SC.keyboardRows(lang),valid=new Set(rows),seen=new Set(),sizes=new Set(),random=rng(77);
    for(const [height,width] of [[3,3],[2,5]])for(let y=0;y<=3-height;y++)for(let x=0;x<=Math.min(...rows.slice(y,y+height).map(r=>r.length))-width;x++)valid.add(rows.slice(y,y+height).map(r=>r.slice(x,x+width)).join(''));
    for(let i=0;i<1000;i++){const subset=SC.letterSubset(lang,random),letters=subset.map(x=>x.answer).join('');assert(valid.has(letters));assert.equal(new Set(letters).size,letters.length);sizes.add(letters.length);for(const c of letters)seen.add(c);}
    assert(sizes.has(9)&&sizes.has(10)&&sizes.has(7));assert.equal(seen.size,lang==='sv-SE'?29:26);for(const c of 'åäö')assert.equal(seen.has(c),lang==='sv-SE');
  }

});
