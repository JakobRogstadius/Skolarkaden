/* Streaming transcript reconciliation. Only the host supplies current candidates.
   Pending entries can be corrected. Started jobs are irrevocable.
   Revisions of the same span never fire a second job. */
(function(root){'use strict';const SC=root.Starlight;
SC.speechWords=(text,lesson)=>{
  if(SC.isChinese(lesson)||lesson==='bopomofo')return text.match(/[\p{Script=Han}\p{Script=Bopomofo}][\p{P}]*|[^\s\p{Script=Han}\p{Script=Bopomofo}]+/gu)||[];
  return text.match(/\S+/gu)||[];
};
SC.splitChineseDigits=function(text){
  // ASR may format spoken character names 三 八 as "38". Character practice
  // consumes each digit; keep 10 together because it is the single symbol 十.
  // Keep the raw spelling/punctuation, and leave pinyin, decimals and signs alone.
  if(!/^\d{2,}$/.test(SC.speechNormalize(text)))return [text];
  const match=text.match(/[0-9０-９]+/u);if(!match)return [text];
  const parts=match[0].match(/[1１][0０]|[0-9０-９]/gu);
  parts[0]=text.slice(0,match.index)+parts[0];parts[parts.length-1]+=text.slice(match.index+match[0].length);
  return parts;
};
SC.splitSwedish=function(text,{lesson,language,candidates=[]},history=[],offset=0){
  if(language!=='sv-SE'||SC.isMath(lesson))return [text];
  const matches=t=>candidates.some(item=>SC.matches(t,item,lesson,language,'speech'));
  if(matches(text))return [text]; // A displayed longer compound has priority.
  const m=text.match(/^([^\p{L}\p{M}]*)([\p{L}\p{M}]+)([^\p{L}\p{M}]*)$/u);if(!m)return [text];
  const raw=m[2],key=t=>SC.speechIdentity(t,lesson,language);
  const valid=parts=>parts.every((part,i)=>matches(part)||(history[offset+i]?.sent&&history[offset+i].keys.includes(key(part))));
  let parts=null;
  for(let a=1;a<raw.length&&!parts;a++){const two=[raw.slice(0,a),raw.slice(a)];if(valid(two))parts=two;}
  for(let a=1;a<raw.length&&!parts;a++)for(let b=a+1;b<raw.length&&!parts;b++){const three=[raw.slice(0,a),raw.slice(a,b),raw.slice(b)];if(valid(three))parts=three;}
  if(!parts)return [text];parts[0]=m[1]+parts[0];parts[parts.length-1]+=m[3];return parts;
};
SC.tokenizeSpeech=function(text,context,history=[],offset=0){
  const {lesson,language}=context,words=SC.speechWords(text,lesson),out=[];
  for(let i=0;i<words.length;i++){
    let word=words[i],v=SC.speechNormalize(word);
    if(lesson==='letters'&&i+1<words.length){const phrase=word+' '+words[i+1];if(SC.letterNames[language]?.[SC.speechNormalize(phrase)]){word=phrase;i++;}}
    if(SC.isMath(lesson)){
      const numberEnd=start=>{
        let end=start;
        for(let j=start;j<Math.min(words.length,start+7);j++){
          if(j>start&&/[,.!?;，。！？]$/.test(words[j-1]))break;
          if(SC.spokenNumber(words.slice(start,j+1).join(' '),language)!==null)end=j;
        }
        return end;
      };
      const start=i,negative=['minus','negative','negativ','negativt'].includes(v);
      if(negative&&i+1<words.length)i++;
      i=numberEnd(i);
      if(i+2<words.length&&['point','komma','punkt'].includes(SC.speechNormalize(words[i+1])))i=numberEnd(i+2);
      word=words.slice(start,i+1).join(' ');
      out.push(word); // No compound-word splitting in number exercises.
    }else out.push(...SC.splitSwedish(word,context,history,offset+out.length).flatMap(part=>SC.isChinese(lesson)?SC.splitChineseDigits(part):[part]));
  }
  return out;
};
class SpeechStream{
  constructor({getContext,enqueue,revise=()=>false,trace=()=>{}}){Object.assign(this,{getContext,enqueue,revise,trace});this.ledger=[];this.finalCount=0;this.finalResults=0;}
  update(results){
    const context=this.getContext(),history=this.ledger.filter(t=>!t.ghost),fresh=[];
    for(const result of results){
      const raw=result[0]?.transcript||'';
      for(const text of SC.tokenizeSpeech(raw,context,history,fresh.length))fresh.push({text,key:SC.speechIdentity(text,context.lesson,context.language),final:result.isFinal,sent:false,ghost:false});
    }
    const finalResults=results.filter(r=>r.isFinal).length,finalCount=fresh.filter(t=>t.final).length,old=this.ledger,merged=[];
    const same=(a,b)=>a.keys.includes(b.key);
    const carry=(a,b)=>{
      const revised=a.sent&&a.text!==b.text&&this.revise(a.entry,b.text);
      if(a.sent&&!same(a,b))this.trace('revision',{text:b.text,previous:a.text,action:revised?'Väntande svar uppdaterades':'Påbörjad handling behålls'});
      return {...b,sent:a.sent,entry:a.entry,keys:[...new Set([...a.keys,b.key])]};
    };
    let prefix=0;while(prefix<old.length&&prefix<fresh.length&&same(old[prefix],fresh[prefix])){merged.push(carry(old[prefix],fresh[prefix]));prefix++;}
    const n=old.length-prefix,m=fresh.length-prefix;
    // Edit alignment of the changing tail; the stable final prefix takes O(n).
    const d=Array.from({length:n+1},()=>new Uint32Array(m+1));
    for(let i=n;i>=0;i--)for(let j=m;j>=0;j--){
      if(i===n)d[i][j]=m-j;else if(j===m)d[i][j]=n-i;
      else d[i][j]=Math.min(d[i+1][j+1]+(same(old[prefix+i],fresh[prefix+j])?0:1),d[i+1][j]+1,d[i][j+1]+1);
    }
    let i=0,j=0;
    while(i<n||j<m){
      const a=old[prefix+i],b=fresh[prefix+j];
      if(i<n&&j<m&&d[i][j]===d[i+1][j+1]+(same(a,b)?0:1)){merged.push(carry(a,b));i++;j++;}
      else if(j<m&&d[i][j]===d[i][j+1]+1){merged.push({...b,keys:[b.key]});j++;}
      else{
        // Remember temporarily withdrawn early words. A stable final boundary
        // retires these tombstones, so a new utterance can repeat the same word.
        if(a.sent&&!(finalResults>this.finalResults&&prefix+j<=finalCount))merged.push({...a,ghost:true});i++;
      }
    }
    let frontier=-1;
    for(let k=0;k<merged.length;k++){
      // In lessons reaching 100 or more, the trailing interim "one" may still become "one
      // hundred". Wait for its boundary; earlier complete answers still flow.
      const t=merged[k],boundary=!['math3','math4','math5'].includes(context.lesson)||k<merged.length-1;
      if(!t.ghost&&(t.final||boundary&&context.candidates.some(item=>SC.matches(t.text,item,context.lesson,context.language,'speech'))))frontier=k;
    }
    const added=[];
    for(let k=0;k<=frontier;k++){
      const t=merged[k];if(t.sent||t.ghost)continue;t.sent=true;t.entry=this.enqueue(t.text);if(t.entry){added.push(t.text);this.trace(t.final?'queued-final':'queued-early',{text:t.text});}
      else this.trace('queue-skipped',{text:t.text,reason:'Svaret är en dubblett eller två felaktiga svar väntar redan.'});
    }
    this.ledger=merged;this.finalCount=finalCount;this.finalResults=finalResults;return added;
  }
}
SC.SpeechStream=SpeechStream;
})(globalThis);
