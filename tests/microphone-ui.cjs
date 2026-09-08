/* Microphone ownership and rolling-capture regression test, without hardware. */
'use strict';const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let permissions=0,stopCount=0,processor,applied,captured;
const makeTrack=()=>({readyState:'live',getSettings:()=>({sampleRate:16000}),addEventListener(){},async applyConstraints(c){applied=c;},stop(){stopCount++;}});
const node=()=>({connect(){},disconnect(){}});
class AC{constructor(){this.sampleRate=16000;this.state='running';}async resume(){}createMediaStreamSource(){return node();}createGain(){return {...node(),gain:{value:1}};}createScriptProcessor(){processor=node();return processor;}async close(){}}
const context=vm.createContext({Float32Array,AudioContext:AC,navigator:{mediaDevices:{async getUserMedia(options){captured=options.audio;permissions++;const track=makeTrack();return {active:true,getAudioTracks:()=>[track],getTracks:()=>[track]};}}},console});
vm.runInContext('globalThis.Starlight={};',context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/voice.js'),'utf8'),context);
(async()=>{const mic=new context.Starlight.Microphone();await Promise.all([mic.open(),mic.open()]);assert.equal(permissions,1);mic.begin(true);for(let i=0;i<200;i++)processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(1024).fill(.2)}});assert(mic.sampleCount<=16000*5+1024);assert(mic.sampleCount>=16000*5);assert(Math.abs(mic.level-.2)<.001);mic.cancel();await mic.open();assert.equal(permissions,1);await mic.configure({processing:false});assert.equal(permissions,1);assert.equal(applied.echoCancellation,false);await mic.configure({deviceId:'second',processing:true});assert.equal(permissions,2);assert.equal(stopCount,1);mic.close();assert.equal(stopCount,2);
// First capture, retained-track changes, user overrides and reopening.
const shortMic=new context.Starlight.Microphone();
await shortMic.configure({deviceId:'chosen',processing:true,shortInput:true});
assert.equal(captured.noiseSuppression,false);assert.equal(captured.echoCancellation,true);assert.equal(captured.autoGainControl,true);assert.equal(captured.deviceId.exact,'chosen');
const opened=permissions;
await shortMic.configure({...shortMic.options,shortInput:false});
assert.equal(permissions,opened);assert.equal(applied.noiseSuppression,true);assert.equal(applied.deviceId.exact,'chosen');
await shortMic.configure({...shortMic.options,shortInput:true});assert.equal(applied.noiseSuppression,false);
await shortMic.configure({deviceId:'chosen',processing:false});
assert.equal(shortMic.options.shortInput,true);assert.equal(applied.echoCancellation,false);assert.equal(applied.autoGainControl,false);assert.equal(applied.noiseSuppression,false);
await shortMic.configure({...shortMic.options,shortInput:false});assert.equal(applied.noiseSuppression,false);
shortMic.close();await shortMic.open();assert.equal(captured.noiseSuppression,false);assert.equal(captured.deviceId.exact,'chosen');shortMic.close();
console.log('PASS retained microphone permission, concurrent activation, rolling PCM capture, processing changes, device changes, and explicit release.');})().catch(e=>{console.error(e);process.exitCode=1;});
