/* Streaming transcript reconciliation. Only the host supplies current candidates.
   Pending entries can be corrected. Started jobs are irrevocable.
   Revisions of the same span never fire a second job. */
(function(root){'use strict';const SC=root.Starlight;
SC.speechWords=(text,lesson)=>{
  if(SC.isChinese(lesson)||lesson==='bopomofo')return text.match(/˙?[\p{Script=Han}\p{Script=Bopomofo}][\p{P}ˉˊˇˋ˙]*|[^\s\p{Script=Han}\p{Script=Bopomofo}]+/gu)||[];
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
// Split joined romanized dictation into complete pinyin syllables. Never match
// fragments of a syllable (e.g. an inside shan); preserve raw single syllables.
let chineseSyllables;
SC.chineseSpeechAtoms=function(text){
  chineseSyllables??=new Set(Object.values(SC.mandarinPinyin));
  return SC.speechWords(text,'chinese').flatMap(SC.splitChineseDigits).flatMap(raw=>{
    const key=/\p{Script=Han}/u.test(raw)?null:SC.chineseSpeechPinyin(raw);if(!key||chineseSyllables.has(key))return [raw];
    const parts=Array(key.length+1).fill(null);parts[key.length]=[];
    for(let i=key.length-1;i>=0;i--)for(let j=Math.min(key.length,i+6);j>i;j--){
      const syllable=key.slice(i,j);if(chineseSyllables.has(syllable)&&parts[j]){parts[i]=[syllable,...parts[j]];break;}
    }
    return parts[0]||[raw];
  });
};
SC.chineseTargetPinyin=item=>SC.tonelessPinyin(item.hint)||SC.chineseSpeechPinyin(item.answer);
// Search speech spans for visible answers, preferring complete longer words.
// Punctuation and recognition-result boundaries are not word boundaries.
// Sent history retains boundaries after a target disappears from the screen.
SC.groupChineseSpeech=function(atoms,context,history=[],offset=0){
  const out=[],targets=new Set((context.candidates||[]).map(SC.chineseTargetPinyin).filter(Boolean));
  const maxLength=Math.max(0,...[...targets].map(k=>k.length),...history.flatMap(t=>t.keys||[]).filter(k=>k.startsWith('pinyin:')).map(k=>k.length-7));
  for(let i=0;i<atoms.length;i++){
    const previous=history[offset+out.length],remembered=key=>previous?.sent&&previous.keys.includes('pinyin:'+key);
    let best=null,known=null,text='',final=true,allowed=null;
    for(let j=i;j<atoms.length;j++){
      text+=(text&&/[a-züê]/iu.test(text+atoms[j].text)?' ':'')+atoms[j].text;final=final&&atoms[j].final;
      if(atoms[j].allowed)allowed=allowed===null?new Set(atoms[j].allowed):new Set([...allowed].filter(k=>atoms[j].allowed.has(k)));
      const key=SC.chineseSpeechPinyin(text);if(!key||key.length>maxLength)break;
      const matched=targets.has(key)&&(allowed===null||allowed.has(key)),token={text,final,matched,key,end:j};
      if(remembered(key)){known=token;break;}
      if(matched)best=token;
    }
    const selected=known||best;
    if(selected){out.push(selected);i=selected.end;}else out.push({...atoms[i],matched:false});
  }
  return out;
};
// Choose a coherent transcript from the recognizer's alternatives, rather than
// enqueueing every alternative as a separate answer. A small beam allows words
// to span results even when both syllables occur only in secondary alternatives.
SC.chineseSpeechResults=function(results,context,history,cache=[]){
  const allowed=new Set((context.candidates||[]).map(SC.chineseTargetPinyin).filter(Boolean));
  let firstChanged=results.length;
  const records=results.map((result,i)=>{
    const texts=[...new Set(Array.from(result,a=>a.transcript||''))],signature=JSON.stringify([result.isFinal,texts]);
    const old=cache[i];if(old?.signature===signature)return old;
    firstChanged=Math.min(firstChanged,i);return {signature,choices:texts.length?texts:[''],allowed};
  });
  // Revisit only the changed results and enough preceding results to complete
  // a word. Completed dictation must not make each callback progressively slower.
  const lookback=Math.max(1,...(context.candidates||[]).map(item=>Array.from(item.answer).length));
  const mutable=firstChanged===results.length?results.length:Math.max(0,firstChanged-lookback+1);
  let beam=[{atoms:[],texts:[],score:0}];
  for(let i=0;i<records.length;i++){
    if(i<mutable){const text=records[i].text;beam[0].texts.push(text);beam[0].atoms.push(...SC.chineseSpeechAtoms(text).map(text=>({text,final:results[i].isFinal,allowed:records[i].allowed})));continue;}
    const next=[];
    for(const path of beam)for(const text of records[i].choices){
      const atoms=[...path.atoms,...SC.chineseSpeechAtoms(text).map(text=>({text,final:results[i].isFinal,allowed:records[i].allowed}))];
      const grouped=SC.groupChineseSpeech(atoms,context,history);
      const score=grouped.reduce((sum,t,index)=>sum+(history[index]?.sent&&history[index].keys.includes(SC.speechIdentity(t.text,context.lesson,context.language))?1000:0)+(t.matched?10*(SC.chineseSpeechPinyin(t.text)?.length||0):0),0);
      // Keep promising incomplete alternatives until the next result arrives.
      const tail=SC.chineseSpeechPinyin(atoms.at(-1)?.text||'');
      const prefix=tail&&[...allowed].some(k=>k.startsWith(tail))?tail.length:0;
      next.push({atoms,texts:[...path.texts,text],score:score+prefix});
    }
    next.sort((a,b)=>b.score-a.score);beam=next.slice(0,8);
  }
  const best=beam[0];
  return {atoms:best.atoms,cache:records.map((r,i)=>({...r,text:best.texts[i]}))};
};
// Keep phrases and optional articles/infinitive markers together, including
// phrases spanning two recognition results. The lexicon is language-specific.
const pairSpeechLexicons=new Map();
SC.pairSpeechLexicon=function(context){
  const {lesson,language}=context,key=lesson+':'+language;
  if(!pairSpeechLexicons.has(key)){
    const forms=new Set();
    for(const item of SC.vocabulary(lesson,language))for(const answer of [item.answer,...item.aliases]){
      const text=SC.speechNormalize(answer);forms.add(text);
      for(const prefix of language==='sv-SE'?['att ','en ','ett ']:['to ','a ','an '])forms.add(prefix+text);
    }
    pairSpeechLexicons.set(key,{forms,maxWords:Math.max(...[...forms].map(s=>s.split(' ').length))});
  }return pairSpeechLexicons.get(key);
};
SC.groupPairSpeech=function(atoms,context,history=[],offset=0){
  const out=[],{forms,maxWords}=SC.pairSpeechLexicon(context);
  for(let i=0;i<atoms.length;i++){
    let end=i;
    for(let j=i;j<Math.min(atoms.length,i+maxWords);j++){
      if(j>i&&/[,.!?;，。！？]$/.test(atoms[j-1].text))break;
      if(forms.has(SC.speechNormalize(atoms.slice(i,j+1).map(t=>t.text).join(' '))))end=j;
    }
    const text=atoms.slice(i,end+1).map(t=>t.text).join(' '),final=atoms.slice(i,end+1).every(t=>t.final);
    const parts=end===i?SC.splitSwedish(text,context,history,offset+out.length):[text];
    for(const part of parts)out.push({text:part,final});
    i=end;
  }return out;
};
SC.pairSpeechPrefix=(text,context)=>[...SC.pairSpeechLexicon(context).forms].some(form=>form.startsWith(SC.speechNormalize(text)+' '));
SC.tokenizeSpeech=function(text,context,history=[],offset=0){
  const {lesson,language}=context,words=SC.speechWords(text,lesson),out=[];
  if(SC.isChinese(lesson))return SC.groupChineseSpeech(SC.chineseSpeechAtoms(text).map(text=>({text})),context,history,offset).map(t=>t.text);
  if(SC.isWordPair(lesson))return SC.groupPairSpeech(words.map(text=>({text})),context,history,offset).map(t=>t.text);
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
    }else out.push(...SC.splitSwedish(word,context,history,offset+out.length).flatMap(part=>SC.isChinese(lesson)||lesson==='bopomofo'?SC.splitChineseDigits(part):[part]));
  }
  return out;
};
class SpeechStream{
  constructor({getContext,enqueue,revise=()=>false,trace=()=>{}}){Object.assign(this,{getContext,enqueue,revise,trace});this.ledger=[];this.finalCount=0;this.finalResults=0;}
  update(results){
    // A queue rejection is not a consumed action. Forget its old alternatives,
    // but do not retry identical rejected text on every recognition callback.
    for(const t of this.ledger)if(t.entry?.rejected){t.sent=false;t.skipped=true;t.entry=undefined;t.keys=[t.key];}
    const context=this.getContext(),history=this.ledger.filter(t=>!t.ghost),fresh=[];
    if(SC.isWordPair(context.lesson)){
      const atoms=results.flatMap(result=>SC.speechWords(result[0]?.transcript||'',context.lesson).map(text=>({text,final:result.isFinal})));
      for(const token of SC.groupPairSpeech(atoms,context,history))fresh.push({...token,key:SC.speechIdentity(token.text,context.lesson,context.language),sent:false,ghost:false});
    }else if(SC.isChinese(context.lesson)){
      const selected=SC.chineseSpeechResults(results,context,history,this.chineseResults);
      selected.cache.forEach((r,i)=>{if(r.text!==results[i][0]?.transcript&&r.text!==this.chineseResults?.[i]?.text)this.trace('chinese-alternative',{text:r.text,primary:results[i][0]?.transcript||''});});
      this.chineseResults=selected.cache;
      for(const token of SC.groupChineseSpeech(selected.atoms,context,history))fresh.push({...token,key:SC.speechIdentity(token.text,context.lesson,context.language),sent:false,ghost:false});
    }else for(const result of results){
      const raw=result[0]?.transcript||'';
      for(const text of SC.tokenizeSpeech(raw,context,history,fresh.length))fresh.push({text,key:SC.speechIdentity(text,context.lesson,context.language),final:result.isFinal,sent:false,ghost:false});
    }
    const finalResults=results.filter(r=>r.isFinal).length,finalCount=fresh.filter(t=>t.final).length,old=this.ledger,merged=[];
    const same=(a,b)=>a.keys.includes(b.key);
    const carry=(a,b)=>{
      const attemptedRevision=a.sent&&(!SC.isChinese(context.lesson)||b.matched)&&a.text!==b.text;
      const revised=attemptedRevision&&this.revise(a.entry,b.text),rejected=!!a.entry?.rejected,sent=a.sent&&!rejected;
      const skipped=!sent&&((a.skipped&&same(a,b))||rejected);
      if(a.sent&&!same(a,b))this.trace('revision',{text:b.text,previous:a.text,action:rejected?'Svaret avvisades; en ny rättning kan prövas':revised?'Väntande svar uppdaterades':'Påbörjad handling behålls'});
      return {...b,sent,skipped,entry:sent?a.entry:undefined,keys:sent?[...new Set([...a.keys,b.key])]:[b.key]};
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
      const t=merged[k],last=k===merged.length-1,boundary=(!['math-large-numbers','math-multiplication','math-multiplication-division'].includes(context.lesson)||!last);
      const phraseBoundary=!SC.isWordPair(context.lesson)||!last||!SC.pairSpeechPrefix(t.text,context);
      const matches=context.candidates.some(item=>SC.matches(t.text,item,context.lesson,context.language,'speech'));
      // ASR can finalize "ice" before a later result supplies "cream". Keep
      // that incomplete phrase pending instead of charging a wrong answer.
      if(!t.ghost&&(!SC.isChinese(context.lesson)||t.matched)&&(phraseBoundary||matches)&&(t.final||boundary&&phraseBoundary&&matches))frontier=k;
    }
    const added=[];
    for(let k=0;k<=frontier;k++){
      const t=merged[k];if(t.sent||t.skipped||t.ghost||(SC.isChinese(context.lesson)&&!t.matched))continue;t.entry=this.enqueue(t.text);t.sent=!!t.entry;t.skipped=!t.sent;if(t.entry){added.push(t.text);this.trace(t.final?'queued-final':'queued-early',{text:t.text});}
      else this.trace('queue-skipped',{text:t.text,reason:'Svaret är en dubblett eller två felaktiga svar väntar redan.'});
    }
    this.ledger=merged;this.finalCount=finalCount;this.finalResults=finalResults;return added;
  }
}
SC.SpeechStream=SpeechStream;
})(globalThis);
