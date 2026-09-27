'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const spoken=[],played=[],paused=[];let canceled=0,voices=[];
const context=vm.createContext({console,Event,EventTarget,
  CustomEvent:class extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}},
  SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
  speechSynthesis:{getVoices:()=>voices,cancel:()=>canceled++,speak:utterance=>spoken.push(utterance)},
  Audio:class{constructor(src){this.src=src;}play(){played.push(this.src);return Promise.resolve();}pause(){paused.push(this.src);}}
});
for(const name of ['data','language-exercises-data','language-exercises','homework','input','klossar','klossar-speech'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+name+'.js'),'utf8'),context);
const SC=context.Starlight,speaker=new SC.KlossarSpeech();
function game(options){const events=[],g=new SC.KlossarGame({random:()=>.3,onEvent:e=>{events.push(e);if(e.type==='klossar-select')speaker.play(e.tile.item.speech);}});g.start(options);return {g,events};}
function firstPair(g){return g.order[0].map(id=>g.tiles[id]);}

// Selection must speak both the first and the second tile, but never a toggle,
// blocked/removed tile, paused move, or extra click during mismatch feedback.
{
  const {g,events}=game({mode:'letters',lang:'sv-SE',items:[{label:'å'}]}),[a,b]=firstPair(g);
  const blocked=g.tiles.find(t=>!g.free(t)),start=spoken.length;
  assert(!g.select(blocked.id));assert(!g.select(-1));assert.equal(spoken.length,start);
  g.select(a.id);assert.equal(spoken.at(-1).text,'Å');assert.equal(spoken.at(-1).lang,'sv-SE');
  g.select(a.id);assert.equal(spoken.length,start+1,'deselection is silent');
  g.select(a.id);g.select(b.id);assert.equal(spoken.length,start+3,'matching second tile still speaks');assert(a.removed&&b.removed);
  assert(!g.select(b.id));assert.equal(spoken.length,start+3);
  assert.equal(events.filter(e=>e.type==='klossar-select').length,3);
  const c=g.getAvailableTargets()[0];g.pause();assert(!g.select(c.id));assert.equal(spoken.length,start+3);g.resume();
  const wrong=g.getAvailableTargets().find(t=>t!==c&&t.side===c.side);assert(wrong);
  g.select(c.id);g.select(wrong.id);assert.equal(spoken.length,start+5);assert(g.feedback);
  assert(!g.select(c.id));assert.equal(spoken.length,start+5);
}
for(const [mode,lang,label,hint] of [['chinese','zh-TW','女','nǚ'],['chineseSimpl1','zh-CN','是','shì'],['chinese','zh-TW','你好','nǐ hǎo']])for(const display of ['pinyin','translation']){
  const {g}=game({mode,lang,items:[{label,hint,translation:'hej'}]});g.setChineseDisplay(display);
  const pair=firstPair(g),han=pair.find(t=>t.side==='problem'),pinyin=pair.find(t=>t.side==='answer'),start=spoken.length;
  g.select(pinyin.id);assert.equal(spoken.length,start,'pinyin and translation faces remain silent');
  g.select(han.id);assert.equal(spoken.length,start+1);assert.equal(spoken.at(-1).text,label);assert.equal(spoken.at(-1).lang,lang);
  assert(!pinyin.item.hint&&!pinyin.item.translation&&!han.item.hint);
}
SC.modes.homework=SC.parseHomework({test:{input:'voice',language:'zh-TW',words:[['我喜歡喝茶','wǒ xǐhuān hē chá','Jag tycker om att dricka te.']]}},'test');
{
  const {g}=game({mode:'homework',lang:'zh-TW'}),start=spoken.length;for(const tile of firstPair(g))g.select(tile.id);
  assert.equal(spoken.length,start,'longer Chinese phrases and their pinyin are silent');
}
for(const item of SC.modes.bopomofo.items){
  const {g}=game({mode:'bopomofo',lang:'zh-TW',items:[item]}),pair=firstPair(g),symbol=pair.find(t=>t.side==='problem'),pinyin=pair.find(t=>t.side==='answer');
  const start=played.length;g.select(symbol.id);assert.equal(played.length,start+1);
  const expected='resources/audio/bopomofo/'+item.label.codePointAt(0).toString(16)+'.mp3';assert.equal(played.at(-1),expected);
  assert(fs.statSync(path.join(__dirname,'..',expected)).size>1000,'recording is bundled for '+item.label);
  const before=spoken.length;g.select(pinyin.id);
  assert.equal(spoken.length,before,'pinyin stays silent, including one-letter vowels');
  assert.equal(played.length,start+1);assert.equal(g.hits,1);
}
for(const [mode,lang,label] of [['letters','en-US','j'],['letters','sv-SE','ö'],['english','en-US','a']]){
  const {g}=game({mode,lang,items:[{label}]}),[a,b]=firstPair(g);g.select(a.id);g.select(b.id);
  for(const utterance of spoken.slice(-2)){assert.equal(utterance.text,label.toUpperCase());assert.equal(utterance.lang,lang);}
}
{
  const {g}=game({mode:'translation-sv-en-3',lang:'en-US',items:[{label:'ö',answer:'island',answerLang:'en-US'}]}),pair=firstPair(g);
  g.select(pair.find(t=>t.side==='problem').id);assert.equal(spoken.at(-1).lang,'sv-SE','prompt language is independent of answer language');
}
for(const options of [{mode:'swedish',items:[{label:'sol'}]},{mode:'math-addition'}]){
  const {g}=game(options),[a,b]=firstPair(g),before=spoken.length;g.select(a.id);g.select(b.id);assert.equal(spoken.length,before);
}
console.log('PASS selection/toggling, both matched and mismatched tiles, one/two Chinese characters, silent pinyin/translations/long phrases, all 37 bopomofo recordings and Latin languages');

// Voice selection cannot substitute Cantonese for Mandarin. Empty voice lists
// still let the browser use the requested language and are refreshed next time.
const cantonese={lang:'zh-HK'},swedish={lang:'sv_SE'},taiwan={lang:'zh_TW'},mainland={lang:'zh-CN'};
voices=[cantonese,swedish,taiwan,mainland];speaker.play({text:'你',lang:'zh-CN'});assert.equal(spoken.at(-1).voice,mainland);
voices=[cantonese,{lang:'cmn-Hant-TW'}];speaker.play({text:'你',lang:'zh-TW'});assert.equal(spoken.at(-1).voice,voices[1]);
voices=[cantonese];speaker.play({text:'你',lang:'zh-TW'});assert.equal(spoken.at(-1).voice,undefined);assert.equal(spoken.at(-1).lang,'zh-TW');
voices=[];speaker.play({text:'A',lang:'sv-SE'});assert.equal(spoken.at(-1).voice,undefined);
voices=[swedish];speaker.play({text:'A',lang:'sv-SE'});assert.equal(spoken.at(-1).voice,swedish);
{
  const before=canceled;const older=spoken.at(-1);speaker.play({text:'B',lang:'sv-SE'});assert.equal(canceled,before+1);
  older.onend();assert.equal(speaker.utterance,spoken.at(-1),'late completion cannot clear the new utterance');
  speaker.play({audio:'resources/audio/bopomofo/3105.mp3'});assert.equal(canceled,before+2);
  const count=paused.length;speaker.play({text:'C',lang:'sv-SE'});assert.equal(paused.length,count+1);
  speaker.stop();assert.equal(canceled,before+3);speaker.stop();assert.equal(canceled,before+3);
}
const synth=context.speechSynthesis;delete context.speechSynthesis;assert.doesNotThrow(()=>speaker.play({text:'你',lang:'zh-TW'}));
context.speechSynthesis={...synth,speak(){throw Error('audio unavailable');}};assert.doesNotThrow(()=>speaker.play({text:'你',lang:'zh-TW'}));
context.Audio=class{play(){return Promise.reject(Error('audio blocked'));}pause(){}};assert.doesNotThrow(()=>speaker.play({audio:'missing.mp3'}));
console.log('PASS voice loading/languages, replacing audio without a queue, cancellation races and unavailable playback');
