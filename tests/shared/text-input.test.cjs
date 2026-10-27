'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
class Element extends EventTarget{constructor(){super();this.value='';this.button={};}querySelector(){return this.button;}focus(){}setAttribute(){}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'}});
for(const file of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input', 'voice'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,n)=>{for(let i=0;i<Math.round(n/.05);i++)g.update(.05);};
let checks=0;function test(name,fn){fn();console.log('PASS '+name);checks++;}
function policy(queue,getCandidates,mode='swedish',lang='sv-SE',getActiveEntries=()=>[]){queue.setPolicy({getCandidates,getActiveEntries,matches:(entry,item)=>SC.matches(entry.text,item,mode,lang,entry.source),sameInput:(a,b)=>SC.sameInput(a,b,mode,lang)});}
const texts=q=>Array.from(q.items,e=>e.text);
function makeInput(){const field=new Element(),form=new Element(),queue=new SC.AnswerQueue(),microphone={snapshot:()=>({samples:new Float32Array(0)}),cancel(){}};const input=new SC.AnswerInput({field,form,queue,microphone,voiceButton:new Element()});input.configure({enabled:false,lesson:'letters'});input.setEnabled(true);return {input,field,form,queue};}

test('Latin letters and bopomofo submit immediately; IME commits once, and words/math still need Enter',()=>{
 const {input,field,form,queue}=makeInput();assert(form.button.hidden);field.value='a';field.dispatchEvent(new Event('input'));assert.deepEqual(texts(queue),['a']);assert.equal(field.value,'');form.dispatchEvent(new Event('submit'));assert.equal(queue.length,1);
 field.value='Bc D';field.dispatchEvent(new Event('input'));assert.deepEqual(texts(queue),['a','B','c','D']);
 input.configure({enabled:false,lesson:'bopomofo'});field.dispatchEvent(new Event('compositionstart'));field.value='ㄆ';field.dispatchEvent(new Event('input'));assert.equal(queue.length,4);field.dispatchEvent(new Event('compositionend'));field.dispatchEvent(new Event('input'));assert.deepEqual(texts(queue).slice(-1),['ㄆ']);
 field.value='1qaz';field.dispatchEvent(new Event('input'));assert.deepEqual(texts(queue).slice(-4),['ㄅ','ㄆ','ㄇ','ㄈ']);
 for(const [lesson,value] of [['swedish','hej'],['math-addition','12'],['chinese','ni']]){input.configure({enabled:false,lesson});assert(!form.button.hidden);const before=queue.length;field.value=value;field.dispatchEvent(new Event('input'));assert.equal(queue.length,before);form.dispatchEvent(new Event('submit'));assert.equal(queue.length,before+1);assert.equal(queue.items.at(-1).text,value);}
 input.configure({enabled:false,lesson:'letters'});input.setEnabled(false);const n=queue.length;field.value='x';field.dispatchEvent(new Event('input'));assert.equal(queue.length,n);input.destroy();
});
