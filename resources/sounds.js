/* Small, local Web Audio effects. No samples or downloads. */
(function(root){
  'use strict';
  // Procedural voices: harmonics shaped by moving vowel resonances, with a
  // little breath and throat texture. No recordings or speech service.
  function synthesizeDinosaurSound(kind,sampleRate=24000,random=Math.random){
    const roar=kind==='dino-roar',scream=kind==='dino-startle',chew=kind==='dino-chomp';
    if(!roar&&!scream&&!chew)throw new Error('Okänt dinosaurieljud.');
    const duration=roar?.74:scream?.46:.86,data=new Float32Array(Math.ceil(duration*sampleRate)),weights=new Float64Array(33),tau=Math.PI*2;
    const curve=(t,points)=>{for(let j=1;j<points.length;j++)if(t<=points[j][0]){const [a,x]=points[j-1],[b,y]=points[j],v=Math.max(0,(t-a)/(b-a)),smooth=v*v*(3-2*v);return x+(y-x)*smooth;}return points.at(-1)[1];};
    const pitch=roar?[[0,88],[.22,144],[.55,102],[1,58]]:scream?[[0,430],[.20,760],[.56,650],[1,420]]:[[0,155],[.28,182],[.68,146],[1,118]];
    const first=roar?[[0,430],[.28,660],[1,280]]:scream?[[0,880],[.35,1080],[1,850]]:[[0,230],[.2,470],[.58,440],[1,210]];
    const second=roar?[[0,1050],[.3,1200],[1,690]]:scream?[[0,1600],[.4,1750],[1,1500]]:[[0,1200],[.23,910],[.6,870],[1,1050]];
    let phase=0,breath=0,peak=0,harmonics=32,normalizer=1;
    for(let i=0;i<data.length;i++){
      const time=i/sampleRate,syllable=chew?Math.floor(time/.30):0,local=chew?time-syllable*.30:time,length=chew?.25:duration,t=Math.min(1,local/length);
      const f0=curve(t,pitch)*(chew?1-syllable*.035:1)*(1+(roar?.032:scream?.025:.007)*Math.sin(tau*time*(roar?31:9)));
      phase+=tau*f0/sampleRate;
      if(i%24===0){
        const f1=curve(t,first),f2=curve(t,second),f3=roar?2100:scream?2900:2300;
        const resonance=(hz,center,width)=>1/(1+((hz-center)/width)**2);let power=0;
        harmonics=Math.min(32,Math.floor(sampleRate*.45/f0));
        for(let k=1;k<=harmonics;k++){
          const hz=f0*k;
          weights[k]=(.04+.9*resonance(hz,f1,roar?120:90)+.5*resonance(hz,f2,160)+.16*resonance(hz,f3,240))/Math.sqrt(k);
          power+=weights[k]*weights[k];
        }
        normalizer=1/Math.sqrt(Math.max(.001,power));
      }
      // Recurrence adds the overtones without a sine call for every harmonic.
      const sin=Math.sin(phase),cos=Math.cos(phase);let sk=sin,ck=cos,voice=0;
      for(let k=1;k<=harmonics;k++){voice+=weights[k]*sk;const next=sk*cos+ck*sin;ck=ck*cos-sk*sin;sk=next;}
      const air=random()*2-1;breath+=.16*(air-breath);
      const texture=roar?.20*breath+.23*Math.sin(phase*.5):scream?.065*(air-breath):.025*breath;
      const throat=roar?.82+.12*Math.sin(tau*time*27)+.06*Math.sin(tau*time*43):1;
      const attack=Math.min(1,local/(roar?.065:.022)),release=Math.max(0,Math.min(1,(length-local)/(chew?.06:.09)));
      const envelope=Math.sin(attack*Math.PI/2)**2*Math.sin(release*Math.PI/2)**2;
      // A small, filtered lip closure rounds off each voiced "nom".
      const mouth=chew?.11*breath*Math.exp(-(((local-.20)/.014)**2)):0;
      const signal=(voice*normalizer*.7*throat+texture+mouth)*envelope;
      data[i]=local>=length?0:signal/Math.sqrt(1+signal*signal);peak=Math.max(peak,Math.abs(data[i]));
    }
    const gain=peak?.8/peak:1;for(let i=0;i<data.length;i++)data[i]*=gain;
    data[0]=0;data[data.length-1]=0;return data;
  }
  function synthesizeCampSound(kind,sampleRate=24000,random=Math.random){
    const length={'camp-crackle':8,'camp-insects':.78,'camp-ignite':.62,'daybreak':1.95}[kind];if(!length)throw new Error('Okänt lägerljud.');
    const data=new Float32Array(Math.ceil(length*sampleRate)),tau=Math.PI*2;
    const crow=[[0,.17,640,850],[.23,.15,890,790],[.45,.18,940,1120],[.70,.17,1060,920],[.96,.85,970,700]];
    let low=0,air=0,pop=0,phase=0;
    for(let i=0;i<data.length;i++){
      const t=i/sampleRate,u=t/length,n=random()*2-1;low+=.04*(n-low);air+=.28*(n-air);let value=0;
      if(kind==='camp-crackle'){
        if(random()<7/sampleRate)pop=.18+random()*.62;
        pop*=Math.exp(-1/(sampleRate*.006));value=low*.30+(n*.8+air*.2)*pop;
      }else if(kind==='camp-insects'){
        const local=t<.26?t:t-.40,window=local>=0&&local<.26?Math.sin(Math.PI*local/.26)**2:0,pips=(.5+.5*Math.sin(tau*t*31))**3;
        value=(Math.sin(tau*t*3450)+.3*Math.sin(tau*t*4970))*.46*window*pips;
      }else if(kind==='camp-ignite'){
        const envelope=Math.sin(Math.PI*u)**1.2;value=(air*.80+low*.9+Math.sin(tau*t*110)*.06)*envelope;
      }else{
        const part=crow.find(([at,duration])=>t>=at&&t<at+duration);
        if(part){const [at,duration,start,end]=part,v=(t-at)/duration,f0=(start+(end-start)*v)*(1+.014*Math.sin(tau*t*23));phase+=tau*f0/sampleRate;let voice=0;
          for(let k=1;k<=9;k++){const resonance=.12+1/(1+((f0*k-1900)/560)**2);voice+=Math.sin(phase*k)*resonance/Math.sqrt(k);}
          const attack=Math.min(1,(t-at)/.025),release=Math.min(1,(at+duration-t)/.06);value=(voice*.55+air*.08)*Math.sin(attack*Math.PI/2)**2*Math.sin(release*Math.PI/2)**2;
        }
      }
      const edge=Math.min(1,t/.025,(length-t)/.04);data[i]=.8*Math.tanh(value)*Math.max(0,edge);
    }data[0]=0;data[data.length-1]=0;return data;
  }
  class GameSounds{
    constructor(){this.context=null;this.dinosaurBuffers=new Map();this.campBuffers=new Map();this.campVoices=new Set();this.campLoop=null;}
    unlock(){
      try{const AC=root.AudioContext||root.webkitAudioContext;if(!this.context)this.context=new AC();
        if(this.context.state==='suspended')this.context.resume().catch(()=>{});
      }catch(_){}
    }
    dinosaurVoice(kind,scale){
      const c=this.context;let buffer=this.dinosaurBuffers.get(kind);
      if(!buffer){const samples=synthesizeDinosaurSound(kind);buffer=c.createBuffer(1,samples.length,24000);buffer.copyToChannel(samples,0);this.dinosaurBuffers.set(kind,buffer);}
      const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;
      source.playbackRate.value=kind==='dino-chomp'?1:.97+Math.random()*.06;
      gain.gain.value=(kind==='dino-startle'?.047:.063)*Math.max(0,scale);
      source.connect(gain);gain.connect(c.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
    }
    campBuffer(kind){
      let buffer=this.campBuffers.get(kind);if(!buffer){const data=synthesizeCampSound(kind);buffer=this.context.createBuffer(1,data.length,24000);buffer.copyToChannel(data,0);this.campBuffers.set(kind,buffer);}return buffer;
    }
    campVoice(kind,scale){
      const c=this.context,source=c.createBufferSource(),gain=c.createGain(),voice={source,gain};source.buffer=this.campBuffer(kind);source.playbackRate.value=kind==='daybreak'?1:.96+Math.random()*.08;
      gain.gain.value=(kind==='camp-insects'?.038:kind==='daybreak'?.085:.085)*Math.max(0,scale);source.connect(gain);gain.connect(c.destination);this.campVoices.add(voice);
      source.onended=()=>{source.disconnect();gain.disconnect();this.campVoices.delete(voice);};source.start();
    }
    campfire(strength,scale=1){
      if(strength<=0||scale<=0){this.stopCampfire();return;}this.unlock();const c=this.context;if(!c||c.state==='closed')return;
      try{
        if(!this.campLoop){const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.campBuffer('camp-crackle');source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(c.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();this.campLoop={source,gain};}
        this.campLoop.gain.gain.setTargetAtTime(.22*Math.min(1,strength)*scale,c.currentTime,.18);
      }catch(_){this.stopCampfire();}
    }
    stopCampfire(){
      const c=this.context,loop=this.campLoop;this.campLoop=null;
      if(loop){try{loop.gain.gain.cancelScheduledValues(c.currentTime);loop.gain.gain.setTargetAtTime(.0001,c.currentTime,.012);loop.source.stop(c.currentTime+.06);}catch(_){loop.source.disconnect();loop.gain.disconnect();}}
      for(const voice of this.campVoices){try{voice.source.stop();}catch(_){}voice.source.disconnect();voice.gain.disconnect();}this.campVoices.clear();
    }
    play(kind,scale=1){
      this.unlock();const c=this.context;if(!c||c.state==='closed')return;
      const tone=(hz,end,duration,delay=0,volume=.035,type='square')=>{
        const o=c.createOscillator(),v=c.createGain(),at=c.currentTime+delay;
        o.type=type;o.frequency.setValueAtTime(hz,at);o.frequency.exponentialRampToValueAtTime(end,at+duration);
        v.gain.setValueAtTime(.0001,at);v.gain.exponentialRampToValueAtTime(volume*scale,at+.006);v.gain.exponentialRampToValueAtTime(.0001,at+duration);
        o.connect(v);v.connect(c.destination);o.start(at);o.stop(at+duration+.01);
        o.onended=()=>{o.disconnect();v.disconnect();};
      };
      const noise=(duration,cutoff,delay=0)=>{
        const n=c.createBufferSource(),b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=b.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=(Math.random()<.5?-1:1)*(1-i/data.length);
        n.buffer=b;const filter=c.createBiquadFilter(),v=c.createGain(),at=c.currentTime+delay;
        filter.type='lowpass';filter.frequency.value=cutoff;v.gain.setValueAtTime(.055*scale,at);v.gain.exponentialRampToValueAtTime(.0001,at+duration);
        n.connect(filter);filter.connect(v);v.connect(c.destination);n.start(at);n.stop(at+duration);
        n.onended=()=>{n.disconnect();filter.disconnect();v.disconnect();};
      };
      try{
        if(['camp-insects','camp-ignite','daybreak'].includes(kind))this.campVoice(kind,scale);
        else if(kind==='camp-good'){tone(660,660,.13,0,.013,'sine');tone(990,990,.20,.10,.010,'sine');}
        else if(kind==='camp-check'){tone(320,360,.08,0,.009,'triangle');tone(360,300,.1,.12,.007,'triangle');}
        else if(kind==='camp-toss')tone(115,65,.10,0,.010,'sine');
        else if(kind==='home-clean'){tone(740,880,.1,0,.011,'sine');tone(1100,1100,.15,.075,.009,'sine');}
        else if(kind==='home-help')tone(530,650,.09,0,.006,'sine');
        else if(kind==='home-anger'){for(let i=0;i<3;i++){tone(105,62,.1,i*.32,.018,'sine');tone(210,150,.14,i*.32,.009,'triangle');}}
        else if(kind==='home-together'){tone(440,590,.12,0,.01,'sine');tone(660,790,.15,.13,.01,'sine');}
        else if(kind==='egg-crack'){noise(.09,1300);tone(150,65,.12,.04,.018,'sine');}
        else if(kind==='egg-hatch'){noise(.32,1800);tone(220,80,.28,0,.019,'triangle');tone(920,470,.16,.12,.008,'sine');}
        else if(kind==='egg-flame'){noise(.58,3200);tone(72,46,.48,0,.023,'sine');}
        else if(kind==='egg-bite'){noise(.1,1600);tone(350,160,.13,0,.018,'triangle');tone(270,115,.12,.16,.012,'sine');}
        else if(kind==='crew-down'){tone(120,42,.28,0,.028,'sine');noise(.17,650,.08);}
        else if(kind==='dino-step')tone(85,44,.09,0,.018,'sine');
        else if(['dino-roar','dino-startle','dino-chomp'].includes(kind))this.dinosaurVoice(kind,scale);
        else if(kind==='dino-gulp'){tone(220,105,.15,0,.027,'sine');tone(320,520,.13,.12,.017,'sine');}
        else if(kind==='dino-puzzle'){tone(270,320,.12,0,.015,'triangle');tone(250,220,.13,.19,.012,'triangle');}
        else if(kind==='dino-air')tone(150,70,.13,0,.015,'triangle');
        else if(kind==='roof-jump')tone(260,580,.2,0,.018,'triangle');
        else if(kind==='roof-land')tone(160,100,.07,0,.014,'triangle');
        else if(kind==='balloon-throw')tone(390,740,.15,0,.016,'sine');
        else if(kind==='paint-splash'){noise(.16,1900);tone(280,95,.16,0,.029,'sine');}
        else if(kind==='paint-hop')tone(190,350,.11,0,.016,'triangle');
        else if(kind==='bee-flight'){tone(180,240,.14,0,.009,'triangle');}
        else if(kind==='nectar'){tone(940,1100,.07,0,.012,'sine');}
        else if(kind==='honey'){[660,880].forEach((n,i)=>tone(n,n,.11,i*.08,.019,'sine'));}
        else if(kind==='hive-full'||kind==='rare-earned'){[523,784,1047,1319].forEach((n,i)=>tone(n,n,.17,i*.12,.024,'triangle'));}
        else if(kind==='rare-arrival'){[880,1109,1320].forEach((n,i)=>tone(n,n,.14,i*.13,.019,'sine'));}
        else if(kind==='season'){tone(440,660,.2,0,.018,'sine');tone(660,880,.2,.21,.018,'sine');}
        else if(kind==='arrival')tone(520,660,.09,0,.014,'triangle');
        else if(kind==='cook'){tone(160,210,.08,0,.018,'triangle');tone(210,160,.08,.1,.012,'triangle');}
        else if(kind==='dish-ready'){tone(1200,1200,.23,0,.024,'sine');tone(1800,1800,.15,0,.009,'sine');}
        else if(kind==='serve'){tone(880,880,.07,0,.022);tone(1320,1320,.17,.075,.024);}
        else if(kind==='lock'){tone(1100,1100,.045);tone(1500,1500,.055,.065);}
        else if(kind==='laser')tone(1700,130,.16,0,.045);
        else if(kind==='explosion'){noise(.25,2200,.035);tone(130,45,.23,.035,.035);}
        else if(kind==='crash'){noise(.48,550);tone(160,35,.48,0,.055,'sawtooth');}
        else if(kind==='water'){noise(.35,1700);[620,850,720].forEach((n,i)=>tone(n,n*.7,.09,i*.09,.015,'sine'));}
        else if(kind==='feed'){tone(180,100,.12,0,.025,'triangle');noise(.12,700);}
        else if(kind==='spray')noise(.3,3800);
        else if(kind==='pickup')tone(390,520,.065,0,.012,'triangle');
        else if(kind==='drop'||kind==='waste')tone(180,65,.12,0,.021,'triangle');
        else if(kind==='think'){tone(330,310,.1,0,.012,'triangle');tone(290,270,.13,.2,.012,'triangle');}
        else if(kind==='flower')[659,880,1109].forEach((n,i)=>tone(n,n,.16,i*.12,.022,'sine'));
        else if(kind==='miss'){tone(280,160,.13);tone(160,65,.2,.13);}
        else if(kind==='tick')tone(800,700,.045,0,.018);
        else if(kind==='win') [523,659,784,1047].forEach((n,i)=>tone(n,n,.13,i*.09));
      }catch(_){}
    }
    close(){this.stopCampfire();this.context?.close().catch(()=>{});this.context=null;this.dinosaurBuffers.clear();this.campBuffers.clear();}
  }
  root.Starlight.synthesizeDinosaurSound=synthesizeDinosaurSound;
  root.Starlight.synthesizeCampSound=synthesizeCampSound;
  root.Starlight.GameSounds=GameSounds;
})(globalThis);
