'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let buffers=0,sources=[],gains=[],disconnected=0;
class AudioContext{
 constructor(){this.state='running';this.destination={};}
 createBuffer(channels,length,sampleRate){buffers++;assert.equal(channels,1);return {length,sampleRate,copyToChannel(data){this.samples=new Float32Array(data);}};}
 createBufferSource(){const node={playbackRate:{value:1},connect(){},disconnect(){disconnected++;},start(){this.started=true;}};sources.push(node);return node;}
 createGain(){const node={gain:{value:1},connect(){},disconnect(){disconnected++;}};gains.push(node);return node;}
 async close(){this.state='closed';}
}
const ctx=vm.createContext({Starlight:{},AudioContext,Float32Array,Float64Array,Math});vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/sounds.js'),'utf8'),ctx);
const SC=ctx.Starlight,random=()=>{let seed=3;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};
const rms=(data,start=0,end=data.length)=>Math.sqrt(data.slice(start,end).reduce((sum,x)=>sum+x*x,0)/(end-start));
for(const kind of ['dino-roar','dino-startle','dino-chomp']){
 const begin=performance.now(),data=SC.synthesizeDinosaurSound(kind,24000,random());
 assert(data.every(Number.isFinite));assert.equal(data[0],0);assert.equal(data.at(-1),0);assert(data.every(x=>Math.abs(x)<=.801));assert(rms(data)>.10);assert(rms(data)<.5);assert(data.length/24000<1.15);
 assert(rms(data,0,240)<rms(data,2400,2640),'soft onset');assert(rms(data,data.length-240)<.04,'soft ending');
 if(kind==='dino-chomp')for(let i=0;i<3;i++){assert(rms(data,Math.round((i*.30+.03)*24000),Math.round((i*.30+.19)*24000))>.12);assert.equal(rms(data,Math.round((i*.30+.255)*24000),Math.min(data.length,Math.round((i*.30+.295)*24000))),0);}
 console.log('PASS '+kind+': finite, bounded voice samples with smooth endpoints'+(kind==='dino-chomp'?' and three distinct syllables':'')+'; generated in '+Math.round(performance.now()-begin)+' ms.');
}
const sounds=new SC.GameSounds();
for(const kind of ['dino-roar','dino-startle','dino-chomp']){
 const before=buffers;sounds.play(kind,1);const full=gains.at(-1).gain.value,buffer=sources.at(-1).buffer;sounds.play(kind,.23);assert.equal(buffers,before+1,'cache generated audio');assert.equal(sources.at(-1).buffer,buffer);assert(Math.abs(gains.at(-1).gain.value/full-.23)<1e-9);assert(sources.at(-1).started);
 assert(sources.at(-1).playbackRate.value>=.97&&sources.at(-1).playbackRate.value<=1.03);
}
for(const source of sources)source.onended();assert.equal(disconnected,sources.length*2);sounds.close();assert.equal(sounds.dinosaurBuffers.size,0);
console.log('PASS cached synthesis, speech-mode volume, small pitch variation, playback and node cleanup.');
