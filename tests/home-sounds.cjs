'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let nodes=[];
const parameter=()=>({value:0,events:[],setValueAtTime(value,at){this.events.push({value,at});},exponentialRampToValueAtTime(value,at){assert(value>0&&Number.isFinite(value));this.events.push({value,at});}});
function node(kind){const n={kind,connect(){},disconnect(){this.disconnected=true;},start(at){this.started=at;},stop(at){this.stopped=at;}};nodes.push(n);return n;}
class AudioContext{
 constructor(){this.state='running';this.currentTime=10;this.sampleRate=24000;this.destination={};}
 createOscillator(){return Object.assign(node('oscillator'),{frequency:parameter()});}
 createGain(){return Object.assign(node('gain'),{gain:parameter()});}
 createBiquadFilter(){return Object.assign(node('filter'),{frequency:parameter()});}
 createBufferSource(){return node('noise');}
 createBuffer(channels,length,rate){assert.equal(channels,1);assert.equal(rate,24000);const data=new Float32Array(length);return {data,getChannelData:()=>data};}
 async close(){this.state='closed';}
}
const ctx=vm.createContext({Starlight:{},AudioContext,Float32Array,Float64Array,Math});vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/sounds.js'),'utf8'),ctx);
const sounds=new ctx.Starlight.GameSounds();
for(const kind of ['home-open','home-shut','home-handle','home-plate','home-container','home-rustle','home-toy','home-wash','home-cook','home-hungry','home-anger','home-stomp']){
 const peaks=[];
 for(const scale of [1,.23]){
  nodes=[];sounds.play(kind,scale);const voices=nodes.filter(n=>['oscillator','noise'].includes(n.kind));assert(voices.length>0,kind+' must make sound');
  for(const n of voices){assert(n.started>=10&&n.stopped>n.started&&n.stopped<=11.5);if(n.buffer){assert(n.buffer.data.every(Number.isFinite));assert(n.buffer.data.some(x=>x!==0));assert(n.buffer.data.every(x=>Math.abs(x)<=1));}n.onended();}
  peaks.push(nodes.filter(n=>n.kind==='gain').map(n=>Math.max(...n.gain.events.map(e=>e.value))));assert(nodes.every(n=>n.disconnected),kind+' releases every audio node');
 }
 assert.equal(peaks[0].length,peaks[1].length);peaks[0].forEach((p,i)=>assert(Math.abs(peaks[1][i]/p-.23)<1e-9));console.log('PASS '+kind+': audible bounded synthesis, speech-mode volume and node cleanup');
}
sounds.close();assert.equal(sounds.context,null);
