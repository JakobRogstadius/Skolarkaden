/* Pronunciation output only: no microphone, transcription, or answer input. */
(function(root){
'use strict';
const languageTag=value=>String(value).replace(/_/g,'-').toLowerCase();
const mandarin=lang=>lang==='zh'||/^(?:zh-(?:cn|tw|hans|hant)|cmn)(?:-|$)/.test(lang);
class KlossarSpeech{
  stop(){
    if(this.audio){const audio=this.audio;this.audio=null;try{audio.pause();}catch(_){}}
    if(this.utterance){this.utterance=null;try{root.speechSynthesis?.cancel();}catch(_){}}
    this.finish?.();
  }
  play(speech,{onEnd}={}){
    if(!speech)return;
    this.stop();
    const finish=()=>{if(this.finish===finish){this.finish=null;onEnd?.();}};this.finish=finish;
    try{
      if(speech.audio){
        if(!root.Audio){finish();return;}
        const audio=this.audio=new root.Audio(speech.audio);
        audio.onended=audio.onerror=finish;audio.play()?.catch(finish);
        return;
      }
      if(!root.speechSynthesis||!root.SpeechSynthesisUtterance){finish();return;}
      const synth=root.speechSynthesis,utterance=new root.SpeechSynthesisUtterance(speech.text),lang=languageTag(speech.lang);
      utterance.lang=speech.lang;
      // Re-read voices at every click: browsers often load their voices lazily.
      const voices=synth.getVoices(),voice=voices.find(v=>languageTag(v.lang)===lang)||
        voices.find(v=>mandarin(lang)?mandarin(languageTag(v.lang)):languageTag(v.lang).split('-')[0]===lang.split('-')[0]);
      if(voice)utterance.voice=voice;
      this.utterance=utterance;
      utterance.onend=utterance.onerror=()=>{if(this.utterance===utterance)this.utterance=null;finish();};
      synth.speak(utterance);
    }catch(_){this.stop();} // Missing voices or blocked audio must not stop a match.
  }
}
root.Starlight.KlossarSpeech=KlossarSpeech;
})(globalThis);
