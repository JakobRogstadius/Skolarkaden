'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sources=[],gains=[],buffers=[];
const param=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){assert(v>0);this.value=v;},cancelScheduledValues(){}});
class AudioContext{
 constructor(){Object.assign(this,{state:'running',currentTime:10,destination:{},sampleRate:48000});}
 createBuffer(ch,length,sampleRate){const b={length,sampleRate,copyToChannel(data){this.samples=new Float32Array(data);}};buffers.push(b);return b;}
 createBufferSource(){const n={playbackRate:{value:1},connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(n);return n;}
 createGain(){const n={gain:param(),connect(){},disconnect(){this.disconnected=true;}};gains.push(n);return n;}
 createOscillator(){return {frequency:param(),connect(){},disconnect(){},start(){},stop(){}};}
 async close(){this.state='closed';}
}
const ctx=vm.createContext({Starlight:{},AudioContext,Float32Array,Float64Array,Math});vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/sounds.js'),'utf8'),ctx);
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const rms=(data,a=0,b=data.length)=>Math.sqrt(data.slice(a,b).reduce((sum,v)=>sum+v*v,0)/(b-a));
for(const kind of ['camp-crackle','camp-insects','camp-ignite','daybreak']){
 const data=SC.synthesizeCampSound(kind,24000,rng(3));assert(data.every(Number.isFinite));assert(data.every(x=>Math.abs(x)<=.801));assert.equal(data[0],0);assert.equal(data.at(-1),0);assert(rms(data)>.012&&rms(data)<.35,kind+' level');
 if(kind==='daybreak'){for(const [a,b] of [[.04,.11],[.25,.32],[.50,.59],[.73,.81],[1.1,1.5]])assert(rms(data,a*24000,b*24000)>.06);assert(rms(data,.89*24000,.94*24000)<.001,'separate crow syllables');}
 if(kind==='camp-crackle'){assert.equal(data.length,8*24000);assert(rms(data,24000,7*24000)<.05,'crackling must remain soft');}
 console.log('PASS procedural '+kind+' has finite, bounded audio, soft endpoints and expected phrasing.');
}
const sound=new SC.GameSounds();sound.campfire(0);assert.equal(sound.context,null,'silent games must not open ambient audio');sound.campfire(1);const loop=sound.campLoop,full=loop.gain.gain.value;assert(loop.source.loop&&loop.source.started);const n=buffers.length;sound.campfire(.5,.23);assert.equal(sound.campLoop,loop);assert.equal(buffers.length,n);assert(Math.abs(loop.gain.gain.value/full-.5*.23)<1e-10);
sound.stopCampfire();assert(loop.source.stopped);loop.source.onended();assert(loop.source.disconnected&&loop.gain.disconnected);sound.campfire(1);assert.notEqual(sound.campLoop,loop);assert.equal(buffers.length,n,'resume reuses synthesized fire');
for(const kind of ['camp-insects','camp-ignite','daybreak']){sound.play(kind);const full=gains.at(-1).gain.value,source=sources.at(-1);sound.play(kind,.23);assert.equal(sources.at(-1).buffer,source.buffer);assert(Math.abs(gains.at(-1).gain.value/full-.23)<1e-10);}
const active=[...sound.campVoices];sound.campfire(0);assert.equal(sound.campLoop,null);assert.equal(sound.campVoices.size,0);assert(active.every(v=>v.source.stopped&&v.source.disconnected&&v.gain.disconnected));
for(const kind of ['camp-good','camp-check','camp-toss'])sound.play(kind);
sound.campfire(1);sound.close();assert.equal(sound.campBuffers.size,0);assert.equal(sound.campLoop,null);assert.equal(sound.context,null);
console.log('PASS single cached fire loop, cooling/voice attenuation, pause/mute/menu cleanup, resumption and context teardown.');
