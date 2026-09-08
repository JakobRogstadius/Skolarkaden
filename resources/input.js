/* Reusable FIFO input. Engines consume entries; input never chooses a target. */
(function(root){
'use strict';
const SC=root.Starlight;
class AnswerQueue extends EventTarget{
  constructor(){super();this.items=[];this.serial=0;}
  get length(){return this.items.length;}
  changed(){this.dispatchEvent(new Event('change'));}
  setPolicy(policy){this.policy=policy;this.reconcile();}
  reconcile(notify=true){
    const results=new Map();if(!this.policy)return results;
    const {getCandidates,getActiveEntries=()=>[],matches,sameInput=(a,b)=>SC.normalize(a.text)===SC.normalize(b.text),maxWrong=2}=this.policy;
    const candidates=[...getCandidates()],available=[...candidates],active=getActiveEntries(),kept=[],dropped=[];let wrong=0;
    for(const entry of this.items){
      const index=available.findIndex(item=>matches(entry,item));
      if(index>=0){results.set(entry,{item:available.splice(index,1)[0]});kept.push(entry);continue;}
      // A remaining matching target permits another copy. Otherwise neither a
      // waiting nor an active answer may be repeated, including wrong answers.
      const duplicate=candidates.some(item=>matches(entry,item))||[...kept,...active].some(other=>other!==entry&&sameInput(entry,other));
      const reason=duplicate?'duplicate':wrong>=maxWrong?'limit':null;
      results.set(entry,{reason});
      if(reason)dropped.push(entry);else{wrong++;kept.push(entry);}
    }
    this.items=kept;
    if(dropped.length){if(notify)this.changed();this.dispatchEvent(new CustomEvent('rejected',{detail:{entries:dropped}}));}
    return results;
  }
  enqueue(text,source='text'){if(!text.trim())return;const entry={id:++this.serial,text,source};this.items.push(entry);const result=this.reconcile(false).get(entry);this.changed();this.dispatchEvent(new CustomEvent('attempt',{detail:{entry,...result}}));return this.items.includes(entry)?entry:undefined;}
  revise(entry,text){if(!entry||!this.items.includes(entry))return false;entry.text=text;const result=this.reconcile(false).get(entry);this.changed();this.dispatchEvent(new CustomEvent('attempt',{detail:{entry,revision:true,...result}}));return this.items.includes(entry);}
  take(){this.reconcile(false);const entry=this.items.shift();if(entry)this.changed();return entry;}
  returnFront(entry){if(this.items.includes(entry))return;this.items.unshift(entry);this.reconcile(false);this.changed();}
  clear(){this.items=[];this.changed();}
}
class AnswerInput extends EventTarget{
  constructor({field,form,voiceButton,queue,microphone,getCandidates=()=>[],retainFocus=()=>false}){
    super();Object.assign(this,{field,form,voiceButton,queue,microphone,getCandidates,retainFocus});this.enabled=false;this.voice={enabled:false};this.epoch=0;this.listeners=[];this.composing=false;
    this.listen(field,'compositionstart',()=>this.composing=true);
    this.listen(field,'compositionend',()=>{this.composing=false;this.transform();this.autoSubmit();});
    this.listen(field,'input',()=>{if(!this.composing){this.transform();this.autoSubmit();}});
    this.listen(form,'submit',e=>{e.preventDefault();if(!this.enabled||this.voice.enabled||this.composing)return;this.queue.enqueue(field.value);field.value='';field.focus({preventScroll:true});});
    this.listen(voiceButton,'click',()=>this.wanted?this.stop():this.start());
    // Opt-in game focus: leave menus, dialogs, IME and browser shortcuts alone.
    const doc=field.ownerDocument;
    if(doc){
      this.listen(doc,'keydown',e=>{
        if(!this.guardingFocus()||e.ctrlKey||e.altKey||e.metaKey)return;
        if(e.key==='Tab'){e.preventDefault();this.focus();}
      },{capture:true});
      this.listen(doc,'pointerdown',e=>{
        if(this.guardingFocus()&&e.target!==field&&e.button===0){
          // Cancels focus/selection, not the click: pause and tool buttons still work.
          e.preventDefault();this.focus();
        }
      },{capture:true});
      const recover=()=>Promise.resolve().then(()=>this.focus());
      this.listen(field,'blur',recover);
      this.listen(doc,'focusin',recover);
      this.listen(root,'focus',recover);
    }
  }
  listen(el,type,fn,options){if(!el)return;el.addEventListener(type,fn,options);this.listeners.push(()=>el.removeEventListener(type,fn,options));}
  guardingFocus(){const doc=this.field.ownerDocument;return this.enabled&&this.retainFocus()&&doc&&!doc.hidden&&doc.hasFocus();}
  focus(){if(!this.voice.enabled&&this.guardingFocus()&&this.field.ownerDocument.activeElement!==this.field)this.field.focus({preventScroll:true});}
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  trace(type,data={}){this.emit('diagnostic',{at:new Date().toISOString(),type,...data});}
  status(text){this.emit('status',{text,listening:!!this.listening});if(this.voiceButton){this.voiceButton.textContent=this.wanted?'Stoppa lyssning':'Starta lyssning';this.voiceButton.setAttribute('aria-pressed',String(!!this.wanted));}}
  fault(text){this.status(text);this.emit('fault',{text});}
  transform(){if(this.voice.lesson==='bopomofo')this.field.value=SC.toBopomofo(this.field.value);}
  singleLetter(){return ['letters','bopomofo'].includes(this.voice.lesson);}
  autoSubmit(){if(!this.enabled||this.voice.enabled||this.composing||!this.singleLetter())return;const text=this.field.value.normalize('NFC');this.field.value='';for(const letter of text)if(letter.trim())this.queue.enqueue(letter);}
  configure(voice){this.cancel();this.voice={...voice,kind:voice.enabled?'browser':'typing'};if(this.voiceButton)this.voiceButton.hidden=!voice.enabled;const submit=this.form.querySelector('[type=submit]');if(submit)submit.hidden=this.singleLetter();}
  setEnabled(enabled){this.enabled=enabled;this.field.disabled=!enabled||this.voice.enabled;const submit=this.form.querySelector('[type=submit]');if(submit)submit.disabled=!enabled||this.voice.enabled;if(this.voiceButton)this.voiceButton.disabled=!enabled;if(!enabled)this.cancel();else this.focus();}
  async prepare(){
    if(!this.voice.enabled)return;
    if(!(root.SpeechRecognition||root.webkitSpeechRecognition))throw new Error('Taligenkänning saknas i denna webbläsare.');
    const version=navigator.userAgentData?.brands?.find(b=>b.brand==='Chromium')?.version||navigator.userAgent?.match(/\b(?:Chrome|Chromium)\/(\d+)/)?.[1];
    if(!(Number(version)>=135))throw new Error('Röstläget behöver Chrome 135 eller senare för att återanvända den godkända mikrofonen.');
    await this.microphone.configure({...this.microphone.options,shortInput:SC.shortSpeechLesson(this.voice.lesson)});
  }
  start(){
    if(!this.enabled||!this.voice.enabled||this.wanted||this.recognition)return;
    if(!this.microphone.ready){this.fault('Mikrofonen är av. Aktivera den i mikrofoninställningarna.');return;}
    clearTimeout(this.stopTimer);this.wanted=true;this.failures=0;this.epoch++;this.microphone.begin(true);this.openSession(this.epoch);
  }
  openSession(epoch){
    if(epoch!==this.epoch||!this.enabled||!this.wanted)return;
    const R=root.SpeechRecognition||root.webkitSpeechRecognition,r=new R(),track=this.microphone.stream.getAudioTracks()[0].clone();
    const committed=new Set(),openedAt=Date.now();
    const stream=new SC.SpeechStream({getContext:()=>({...this.voice,candidates:this.getCandidates()}),enqueue:text=>this.queue.enqueue(text,'speech'),revise:(entry,text)=>this.queue.revise(entry,text),trace:(type,data)=>this.trace(type,data)});this.recognition=r;this.track=track;track.enabled=false;
    const valid=()=>epoch===this.epoch&&this.enabled&&this.recognition===r;
    r.lang=this.voice.language;r.continuous=true;r.interimResults=true;r.maxAlternatives=5;
    r.processLocally=false;
    this.status('Ansluter taligenkänning…');this.trace('session',{language:r.lang,engine:this.voice.kind,shortInput:this.microphone.options.shortInput,audioSettings:track.getSettings?.()});
    r.onstart=()=>{if(!valid()){track.stop();return;}track.enabled=true;this.listening=true;this.status('Lyssnar kontinuerligt · säg flera svar i följd');this.trace('start');};
    r.onaudiostart=()=>{if(valid())this.trace('audio-start');};
    r.onspeechstart=()=>{if(valid())this.trace('speech-start');};
    r.onspeechend=()=>{if(valid())this.trace('speech-end');};
    r.onresult=e=>{
      if(!valid())return;
      const added=stream.update(Array.from(e.results));
      let interim=[];
      for(let i=0;i<e.results.length;i++){
        const result=e.results[i],raw=result[0]?.transcript||'';
        if(result.isFinal){
          if(committed.has(i))continue;committed.add(i);this.failures=0;
          const words=added;
          this.trace('final',{text:raw,alternatives:Array.from(result,a=>({text:a.transcript,confidence:a.confidence})),words});

        }else interim.push(raw);
      }
      this.emit('interim',{text:interim.join(' ')});
      if(interim.length)this.trace('interim',{text:interim.join(' ')});
    };
    r.onnomatch=()=>{if(valid())this.trace('no-match');};
    r.onerror=e=>{
      if(!valid())return;this.trace('error',{error:e.error});
      if(e.error==='no-speech'||e.error==='aborted')return;
      this.wanted=false;
      const messages={'not-allowed':'Mikrofonåtkomst nekades.','service-not-allowed':'Taltjänsten är inte tillgänglig.','network':'Taligenkänningens nätverksanslutning bröts.','language-not-supported':'Språket stöds inte av den valda taltjänsten.','audio-capture':'Mikrofonen kunde inte läsas.'};
      this.sessionError=(messages[e.error]||'Taligenkänningen avbröts: '+e.error)+' Starta lyssningen igen när problemet är löst.';
      const message=this.sessionError;this.cancel();this.sessionError='';this.fault(message);
    };
    r.onend=()=>{
      track.stop();if(!valid())return;clearTimeout(this.stopTimer);this.recognition=null;this.track=null;this.listening=false;this.emit('interim',{text:''});this.capture();this.trace('end');
      if(this.wanted&&Date.now()-openedAt<1500){this.failures++;if(this.failures>=4){this.wanted=false;this.sessionError='Taltjänsten avslutar lyssningen direkt. Kontrollera språk och anslutning och starta igen.';}}else this.failures=0;
      if(this.wanted){this.status('Lyssningen återansluter…');this.restartTimer=setTimeout(()=>this.openSession(epoch),Math.min(2500,350*Math.max(1,this.failures)));}
      else{this.microphone.recording=false;const error=this.sessionError;this.sessionError='';if(error)this.fault(error);else this.status('Lyssningen är stoppad. Svaren i kön fortsätter.');}
    };
    try{r.start(track);}catch(error){track.stop();this.recognition=null;this.wanted=false;this.listening=false;this.microphone.recording=false;this.trace('error',{error:error.message});this.fault(error.message);}
  }
  capture(){const pcm=this.microphone.snapshot();if(pcm.samples.length){this.lastAudio=pcm;this.trace('audio',SC.audioStats(pcm));}}
  stop(){
    this.wanted=false;clearTimeout(this.restartTimer);this.status('Avslutar lyssning · väntar på sista transkriptionen…');
    if(this.recognition){this.stopTimer=setTimeout(()=>this.cancel(),7000);try{this.recognition.stop();}catch(_){this.cancel();}}
    else{this.capture();this.microphone.recording=false;this.listening=false;this.status('Lyssningen är stoppad.');}
  }
  cancel(){
    this.capture();this.epoch++;this.wanted=false;this.listening=false;clearTimeout(this.restartTimer);clearTimeout(this.stopTimer);
    const r=this.recognition;this.recognition=null;try{r?.abort();}catch(_){}this.track?.stop();this.track=null;this.microphone.cancel();this.emit('interim',{text:''});this.status('Lyssningen är pausad.');
  }
  destroy(){this.enabled=false;this.cancel();this.listeners.forEach(fn=>fn());this.listeners=[];}
}
SC.AnswerQueue=AnswerQueue;SC.AnswerInput=AnswerInput;
})(globalThis);
