/* Retained microphone capture, native local-language checks and installed-voice TTS. */
(function(root){
  'use strict';
  const SC=root.Starlight;
  class Microphone {
    constructor(){this.stream=null;this.context=null;this.chunks=[];this.recording=false;this.generation=0;this.options={deviceId:'',processing:true};this.level=0;}
    async configure(options){
      if(this.opening)throw new Error('Vänta tills mikrofonaktiveringen är klar.');
      const next={deviceId:options.deviceId||'',processing:options.processing!==false};
      if(next.deviceId!==this.options.deviceId){this.close();this.options=next;await this.open();return;}
      const track=this.stream?.getAudioTracks()[0];
      if(track&&next.processing!==this.options.processing){
        await track.applyConstraints({echoCancellation:next.processing,noiseSuppression:next.processing,autoGainControl:next.processing});
      }
      this.options=next;await this.open();
    }
    async open(){
      if(this.ready && this.stream?.active){await this.context?.resume();return;}
      if(this.stream&&!this.stream.active)this.close();
      if(this.opening)return this.opening;
      const generation=this.generation;
      let stream,context,source,processor,silent,committed=false;
      const stale=()=>generation!==this.generation;
      this.opening=(async()=>{
        if(!navigator.mediaDevices?.getUserMedia)throw new Error('Mikrofonen är inte tillgänglig. Öppna index.html i Chrome på datorn.');
        const processing=this.options.processing;
        stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:processing,noiseSuppression:processing,autoGainControl:processing,...(this.options.deviceId?{deviceId:{exact:this.options.deviceId}}:{})}});
        if(stale())return;
        const AC=root.AudioContext||root.webkitAudioContext;context=new AC();await context.resume();
        if(stale())return;
        source=context.createMediaStreamSource(stream);silent=context.createGain();silent.gain.value=0;silent.connect(context.destination);
        const receive=data=>{
          if(!stale() && this.recording && (this.rolling || this.sampleCount<context.sampleRate*4.5)){
            this.chunks.push(new Float32Array(data));this.sampleCount+=data.length;
            if(this.rolling)while(this.sampleCount>context.sampleRate*5+data.length){this.sampleCount-=this.chunks.shift().length;}
            let sum=0;for(const v of data)sum+=v*v;this.level=Math.sqrt(sum/data.length);
          }
        };
        if(context.audioWorklet && root.AudioWorkletNode){
          const code="class Capture extends AudioWorkletProcessor{constructor(){super();this.buf=new Float32Array(512);this.pos=0;}process(inputs){const input=inputs[0]&&inputs[0][0];if(input)for(let i=0;i<input.length;i++){this.buf[this.pos++]=input[i];if(this.pos===512){this.port.postMessage(this.buf);this.pos=0;}}return true;}}registerProcessor('starlight-capture',Capture);";
          const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
          try{await context.audioWorklet.addModule(url);if(stale())return;processor=new AudioWorkletNode(context,'starlight-capture');processor.port.onmessage=e=>receive(e.data);}
          catch(error){if(stale())return;processor=null;}finally{URL.revokeObjectURL(url);}
        }
        if(!processor){
          processor=context.createScriptProcessor(1024,1,1);
          processor.onaudioprocess=e=>receive(e.inputBuffer.getChannelData(0));
        }
        if(stale())return;
        source.connect(processor);processor.connect(silent);
        Object.assign(this,{stream,context,source,processor,silent,ready:true});committed=true;
        stream.getTracks().forEach(track=>track.addEventListener?.('ended',()=>{if(!stale())this.close();}));
        this.onStateChange?.();
      })().finally(()=>{
        if(!committed){
          stream?.getTracks().forEach(t=>t.stop());
          try{processor?.disconnect();source?.disconnect();silent?.disconnect();}catch(_){}
          context?.close().catch(()=>{});
        }
        this.opening=null;
      });
      return this.opening;
    }
    begin(rolling=false){this.rolling=rolling;if(!this.ready||!this.stream?.active)throw new Error('Mikrofonen är inte klar. Aktivera den först.');this.chunks=[];this.sampleCount=0;this.recording=true;}
    snapshot(){
      const all=new Float32Array(this.sampleCount);let offset=0;
      for(const chunk of this.chunks){all.set(chunk,offset);offset+=chunk.length;}
      return {samples:all,sampleRate:this.context?.sampleRate||16000};
    }
    end(){this.recording=false;return this.snapshot();}
    cancel(){this.recording=false;this.chunks=[];this.sampleCount=0;this.level=0;}
    close(){
      this.generation++;this.ready=false;this.cancel();this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
      try{this.processor?.disconnect();this.source?.disconnect();this.silent?.disconnect();}catch(_){}
      this.processor=null;this.context?.close().catch(()=>{});this.context=null;
      this.onStateChange?.();
    }
  }
  async function localSpeechStatus(lang,install=false){
    const R=root.SpeechRecognition||root.webkitSpeechRecognition;
    if(!R?.available||!('processLocally' in R.prototype))throw new Error('Lokal taligenkänning stöds inte här. Välj webbläsarens taligenkänning eller skriv svaren.');
    let status=await R.available({langs:[lang],processLocally:true});
    if(status==='available')return true;
    if(install && (status==='downloadable'||status==='downloading')){
      if(!R.install)throw new Error('Webbläsaren kan inte installera språkpaket.');
      const ok=await R.install({langs:[lang],processLocally:true});
      if(ok)return true;
      throw new Error('Språkpaketet kunde inte installeras.');
    }
    throw new Error(status==='unavailable'?'Inget lokalt språkpaket finns för detta språk. Välj webbläsarens taligenkänning eller skriv svaren.':'Språket behöver ett talpaket. Välj ”Kontrollera språkpaket” för att installera det.');
  }
  SC.audioStats=pcm=>{
    let sum=0,peak=0,clipped=0;for(const v of pcm.samples){sum+=v*v;peak=Math.max(peak,Math.abs(v));if(Math.abs(v)>=.99)clipped++;}
    const n=pcm.samples.length;return {durationMs:Math.round(n/pcm.sampleRate*1000),sampleRate:pcm.sampleRate,rms:n?Math.sqrt(sum/n):0,peak,clippedPercent:n?100*clipped/n:0};
  };
  SC.Microphone=Microphone;SC.localSpeechStatus=localSpeechStatus;
})(globalThis);
