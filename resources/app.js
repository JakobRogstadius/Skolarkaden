/* Composition root: DOM, shared FIFO, speech lifecycle, and interchangeable games. */
(async function(root){
'use strict';const SC=root.Starlight,$=id=>document.getElementById(id);
if(/^https?:$/.test(root.location?.protocol)){
  $('start').disabled=true;
  try{await SC.loadLanguageExercises();}
  catch(error){console.warn('Using the bundled language exercises.',error);}
  $('start').disabled=false;
}
SC.modes.homework={...SC.homeworkMode};
const homeworkQuery=new URLSearchParams(root.location?.search||''),homeworkRequested=homeworkQuery.get('mode')==='homework';
let homeworkReady=!homeworkRequested;
const queue=new SC.AnswerQueue(),microphone=new SC.Microphone(),sounds=new SC.GameSounds(),tileSpeech=new SC.KlossarSpeech();
const input=new SC.AnswerInput({field:$('answer'),form:$('answer-form'),queue,microphone,retainFocus:()=>kind!=='klossar'&&game?.state==='playing'&&!document.querySelector('dialog[open]'),getCandidates:()=>game?.state==='playing'?game.getTargets().map(t=>t.item):[]});
let game,renderer,kind='city',busy=false,soundOn=true,lastOptions=null,log=[],lastTargetKey=null,lastUi=0,uiFrame,replaying=null,lifecycle=0;
const playViewport=new SC.PlayViewport(),navigation=new SC.GameNavigation({onBack:confirmGameBack});
let resumeAfterBack=false;
const names={city:'Meteorregn',food:'Laga mat',garden:'Odla blommor',hive:'Bikupan',paint:'Färgballonger',dinosaur:'Hungrig dinosaurie',marshmallows:'Marshmallows',eggs:'Äggröra',home:'Städa hemmet',reversi:'Reversi',chess:'Schack',klossar:'Klossar',studio:'Målarateljén'},classes={city:[SC.CityGame,SC.CityRenderer],food:[SC.FoodTruckGame,SC.FoodTruckRenderer],garden:[SC.GardenGame,SC.GardenRenderer],hive:[SC.BeehiveGame,SC.BeehiveRenderer],paint:[SC.PaintGame,SC.PaintRenderer],dinosaur:[SC.DinosaurGame,SC.DinosaurRenderer],marshmallows:[SC.MarshmallowGame,SC.MarshmallowRenderer],eggs:[SC.EggGame,SC.EggRenderer],home:[SC.HomeGame,SC.HomeRenderer],reversi:[SC.ReversiGame,SC.ReversiRenderer],chess:[SC.ChessGame,SC.ChessRenderer],klossar:[SC.KlossarGame,SC.KlossarRenderer],studio:[SC.StudioGame,SC.StudioRenderer]};
const isBoardGame=()=>['reversi','chess'].includes(kind);
const highscores=new SC.Highscores({getSelection:()=>scoreSelection(),games:Object.fromEntries(Object.entries(names).filter(([id])=>id!=='studio'))});
const isQuestionGame=()=>isBoardGame()||kind==='studio';
function scoreSelection(selected=options()){
  return {kind,mode:selected.mode,pace:selected.pace,input:kind==='klossar'?'click':$('input-kind').value,lang:selected.lang,spokenLanguage:kind==='klossar'?null:$('language').value,uppercase:kind==='klossar'?null:selected.uppercase,homeworkId:selected.homeworkId,soundEnabled:soundOn,reducedMotion:root.matchMedia('(prefers-reduced-motion: reduce)').matches,
    label:[names[kind],SC.modes[selected.mode].name,
      {gentle:'Lätt',steady:'Medel',brave:'Svår'}[selected.pace]].join(' · ')};
}
let best=null,bestLoading=false,noticeUntil=0;
try{localStorage.removeItem('starlight-friends-v1');}catch(_){}
function notice(text){$('discovery-notice').textContent=text;$('discovery-notice').hidden=false;noticeUntil=performance.now()+6000;}
const rememberedLessons=new Map();
function populateLessons(group,preferred){
  const entries=SC.groupExercises(group);
  $('lesson').replaceChildren(...entries.map(([id,m])=>new Option(m.menuLabel||m.name,id)));
  $('lesson').value=entries.some(([id])=>id===preferred)?preferred:entries[0][0];
  rememberedLessons.set(group,$('lesson').value);
}
for(const group of SC.exerciseGroups)$('exercise-group').add(new Option(group.name,group.id));
$('exercise-group').value='math';populateLessons('math','math-addition');
if(homeworkRequested){$('exercise-group').replaceChildren(new Option('Läxa','homework'));$('exercise-group').disabled=true;$('lesson').replaceChildren(new Option('Läxa','homework'));$('lesson').value='homework';$('homework-info').hidden=false;$('homework-info').textContent='Läser in läxan…';}
for(const [key,glyph] of Object.entries(SC.bopomofoKeys)){const el=document.createElement('span');el.textContent=glyph+' ';const small=document.createElement('small');small.textContent=key.toUpperCase();el.append(small);$('keyboard-grid').append(el);}
function options(){return homeworkRequested?{mode:'homework',pace:$('pace').value,lang:SC.modes.homework.lang,uppercase:false,homeworkId:SC.modes.homework.homeworkId}:{mode:$('lesson').value,pace:$('pace').value,lang:kind==='klossar'||$('input-kind').value==='typing'&&!SC.isTranslation($('lesson').value)?SC.modes[$('lesson').value].lang:$('language').value,uppercase:Math.random()<.5};}
function speechOptions(){if(kind==='klossar')return {enabled:false,kind:'typing',language:options().lang,lesson:$('lesson').value};return homeworkRequested?{enabled:SC.modes.homework.input==='voice',kind:'browser',language:SC.modes.homework.lang,lesson:'homework'}:{enabled:$('input-kind').value!=='typing',kind:'browser',language:$('language').value,lesson:$('lesson').value};}
function typingHint(){return ['letters','bopomofo'].includes($('lesson').value)?'Tryck på en bokstav.':'Skriv ett svar och tryck Enter.';}
function menuUpdate(){
  if(homeworkRequested){$('lesson').value='homework';$('input-kind').value=SC.modes.homework.input==='voice'?'browser':'typing';$('language').value=SC.modes.homework.lang;}
  $('lesson').disabled=homeworkRequested;$('input-kind').disabled=homeworkRequested||kind==='klossar';$('start').disabled=busy||!homeworkReady;
  const clickOnly=kind==='klossar',voice=!clickOnly&&$('input-kind').value!=='typing',mode=$('lesson').value,translation=SC.isTranslation(mode),pair=SC.isWordPair(mode);
  $('language-label').textContent=homeworkRequested?'Språk':translation?'Översätt till':'Talspråk';$('language').disabled=homeworkRequested||clickOnly||!voice&&!translation;
  for(const option of $('language').options)option.hidden=option.disabled=pair&&!(translation?['sv-SE','en-US']:[SC.modes[mode].lang]).includes(option.value);
  if(pair&&![...$('language').options].some(o=>!o.disabled&&o.value===$('language').value))$('language').value=SC.modes[mode].lang;
  $('input-kind').closest('.setup-field').hidden=clickOnly;$('language').closest('.setup-field').hidden=$('language').disabled;$('settings-open').hidden=clickOnly;
  $('setup-note').textContent={
    city:'Svara på uppgifterna för att skjuta ner meteorer och skydda staden.',
    food:'Laga och servera mat genom att svara på gästernas uppgifter innan de tröttnar.',
    garden:'Svara på uppgifterna för att vattna, gödsla och skydda blommorna mot ohyra.',
    hive:'Skicka bina till blommorna genom att svara på uppgifterna. Samla honung inför vintern.',
    paint:'Svara på uppgifterna för att kasta färgballonger på förbipasserande.',
    dinosaur:'Svara på uppgifterna för att låta dinosaurien fånga och äta de små figurerna.',
    marshmallows:'Svara när marshmallowen är gyllene för att ta in den innan den bränns.',
    eggs:'Svara på uppgifterna för att bränna spruckna rymdägg och rymdkryp och skydda besättningen.',
    home:'Svara på uppgifterna för att städa och hjälpa familjen innan stöket tar över.',
    reversi:'Välj ett drag genom att svara på dess uppgift. Få flest brickor för att vinna mot datorn.',
    chess:'Välj ett drag genom att svara på dess uppgift. Sätt datorns kung schackmatt.',
    klossar:'Klicka på en fri kloss och dess matchande svar. Para ihop alla klossar för att tömma brädet.',
    studio:'Svara på uppgifter för att fylla på färg. Byt verktyg fritt och måla i din egen takt, utan poäng.'
  }[kind];
  $('pace').closest('.setup-field').hidden=kind==='studio';$('leaderboard-open').hidden=kind==='studio';
  $('keyboard').hidden=clickOnly||mode!=='bopomofo';
  [...$('pace').options].forEach((o,i)=>o.textContent=['Lätt','Medel','Svår'][i]+(clickOnly?' · '+[20,30,40][i]+' par':''));
}
$('lesson').addEventListener('change',()=>{rememberedLessons.set($('exercise-group').value,$('lesson').value);$('language').value=SC.modes[$('lesson').value].lang;menuUpdate();});$('input-kind').addEventListener('change',menuUpdate);
$('exercise-group').addEventListener('change',()=>{
  if(homeworkRequested)return;
  const group=$('exercise-group').value;populateLessons(group,rememberedLessons.get(group));
  $('language').value=SC.modes[$('lesson').value].lang;menuUpdate();
});
const gameRadios=[...document.querySelectorAll('[name=game]')];
const initialGame=gameRadios[Math.floor(Math.random()*gameRadios.length)];kind=initialGame.value;
for(const radio of gameRadios){radio.checked=radio===initialGame;radio.addEventListener('change',()=>{kind=radio.value;menuUpdate();});}
function record(detail){
  // A bounded diagnostic history, independent from the gameplay FIFO.
  log.push(detail);if(log.length>180)log.shift();
  const stamp=detail.at?.slice(11,19)||'';
  const label={final:'SLUTLIG',interim:'PRELIMINÄR','queued-early':'TIDIGT → KÖ','queued-final':'SLUTLIGT → KÖ','queue-skipped':'ÖVERHOPPAT',revision:'RÄTTNING',error:'FEL',action:'SPEL',audio:'LJUD'}[detail.type]||detail.type;
  const text=detail.text!==undefined?detail.text:JSON.stringify(Object.fromEntries(Object.entries(detail).filter(([k])=>!['at','type'].includes(k))));
  const line='['+stamp+'] '+label+': '+text+(detail.result?' → '+detail.result:'')+'\n';
  const lines=($('speech-log').value+line).split('\n');$('speech-log').value=lines.slice(-240).join('\n');$('speech-log').scrollTop=$('speech-log').scrollHeight;
}
input.addEventListener('diagnostic',e=>record(e.detail));
input.addEventListener('status',e=>$('input-status').textContent=e.detail.text);
// Hidden diagnostics must not hide a broken microphone. Pause with a recoverable error.
input.addEventListener('fault',e=>{if(game?.state==='playing'){pause();$('resume-error').textContent=e.detail.text;}});
queue.addEventListener('rejected',e=>{for(const entry of e.detail.entries)record({at:new Date().toISOString(),type:'queue-skipped',text:entry.text});});
async function loadBest(){
  const currentGame=game;
  best=null;bestLoading=true;
  try{
    const score=await highscores.topScore(scoreSelection(lastOptions));
    if(game===currentGame)best=score;
  }catch(_){/* An unavailable leaderboard is not a zero record. */}
  finally{if(game===currentGame){bestLoading=false;renderUi();}}
}
function onGameEvent(e){
  if(kind==='studio'&&['studio-question','studio-ready','studio-dialog','resume'].includes(e.type)){
    const enabled=game.canAnswer()&&!game.dialogOpen;input.setEnabled(enabled);$('answer').value='';if(enabled&&input.voice.enabled)input.start();lastTargetKey=null;return;
  }
  if(e.type==='klossar-select'){if(soundOn)tileSpeech.play(e.tile.item.speech);return;}
  if(e.type==='pause')tileSpeech.stop();
  if(renderer?.game===game)renderer.scoreEvent(e);
  if(isBoardGame()&&['reversi-ready','reversi-wait','chess-ready','chess-wait'].includes(e.type)){
    const enabled=game.canAnswer();input.setEnabled(enabled);$('answer').value='';if(enabled&&input.voice.enabled)input.start();
  }
  const mapped={early:'camp-check',think:kind==='marshmallows'?'camp-check':'think',fire:'laser',impact:'crash',hit:kind==='city'?'explosion':kind==='food'?'serve':kind==='hive'?'honey':kind==='paint'?'paint-splash':kind==='dinosaur'?'dino-gulp':kind==='marshmallows'?'camp-good':kind==='home'?'home-clean':kind==='klossar'?'honey':null,miss:kind==='paint'?'paint-splash':kind==='dinosaur'?'dino-air':'miss','customer-left':'miss','plant-dead':'crash',need:null,impatient:'tick','klossar-display':null};
  const sound=Object.hasOwn(mapped,e.type)?mapped[e.type]:e.type;
  if(soundOn&&sound&&!(e.type==='end'))sounds.play(sound,input.listening?.23:1);
  if(e.type==='rare-arrival')notice('✦ '+SC.rarePeople.find(r=>r.id===e.look.exotic).name);
  if(e.type==='rare-earned')notice('✦ '+SC.rarePeople.find(r=>r.id===e.look.exotic).name+(e.bonus?' · +'+e.bonus+' poäng':' ✦'));
  if(e.type==='hive-full')notice('🍯 Fullt!');
  if(e.type==='klossar-shuffle')notice('Inga fria par – klossarna har blandats.');
  if(e.entry&&['hit','miss','waste','think','early'].includes(e.type))record({at:new Date().toISOString(),type:'action',text:e.entry.text,result:e.type});
  if(['celebrate','loss-pause'].includes(e.type)){input.setEnabled(false);$('pause').disabled=true;if(soundOn&&e.type==='celebrate'&&kind!=='marshmallows')sounds.play('win');}
  if(e.type==='player-down')input.setEnabled(false);
  if(e.type==='pause'||e.type==='end'){sounds.stopCampfire();sounds.stopDinosaurVoices?.();}
  if(e.type==='end'){
    highscores.finish(e.score);
    input.setEnabled(false);$('pause').disabled=true;$('end-overlay').hidden=false;$('pause-overlay').hidden=true;
    $('result-title').textContent=e.won?({city:'Staden är räddad.',food:'Vilken god kväll!',garden:'Trädgården är klar.',hive:'Bina klarar vintern!',paint:'Vilket färgkalas!',dinosaur:'Mätt och belåten!',marshmallows:'God morgon!',eggs:'Skeppet är säkrat!',home:'Skönt att vara klar!',klossar:'Alla klossar är borta!'}[kind]):({city:'Staden behöver vila.',food:'Köket stänger för idag.',garden:'Alla plantor vissnade.',hive:'Honungen räckte inte.',eggs:'Rymdkrypen tog över.'}[kind]);
    if(isBoardGame())$('result-title').textContent=(e.draw?(kind==='chess'?'Remi!':'Oavgjort!'):e.won?'Du vann!':'Datorn vann.')+' '+(kind==='chess'?SC.ChessScoring.resultText(e.resultScore):SC.formatGameScore(kind,e.score))+'–'+(kind==='chess'?SC.ChessScoring.resultText(e.botScore):SC.formatGameScore(kind,e.botScore))+(kind==='chess'?' · '+e.reason:'');
    $('result-game').textContent=names[kind];$('result-context').textContent=SC.modes[game.mode].name+' · '+{gentle:'Lätt',steady:'Medel',brave:'Svår'}[game.pace];
    $('chess-result-breakdown').hidden=kind!=='chess';$('chess-result-breakdown').textContent=kind==='chess'?SC.ChessScoring.summary(e.scoreParts):'';
    highscores.showEnd();
    if(soundOn&&!(kind!=='city'&&e.won))sounds.play(e.won?'win':'miss');
  }
  lastTargetKey=null;
}
async function start(){
  if(busy||!homeworkReady)return;const token=++lifecycle;busy=true;$('start').disabled=true;$('again').disabled=true;$('setup-error').textContent='';
  tileSpeech.stop();
  try{
    input.setEnabled(false);input.configure({...speechOptions(),...(isQuestionGame()?{turnBased:true}:{})});const preparation=kind!=='klossar'&&input.prepare();if(preparation)await preparation;if(token!==lifecycle)return;
    sounds.stopCampfire();sounds.stopDinosaurVoices?.();sounds.unlock();renderer?.destroy();queue.clear();$('answer').value='';$('menu').hidden=true;$('play').hidden=false;$('end-overlay').hidden=true;$('pause-overlay').hidden=true;$('pause').disabled=false;$('discovery-notice').hidden=true;noticeUntil=0;
    const [Game,Renderer]=classes[kind];game=new Game({queue,onEvent:onGameEvent});game.viewportKind=kind;lastOptions=options();$('arena').className='arena '+kind;$('arena').dataset.exercise=lastOptions.mode;$('play').dataset.game=kind;game.start(lastOptions);if(kind!=='studio')highscores.begin({...scoreSelection(lastOptions),letterKeys:game.mode==='letters'?game.items.map(i=>i.answer):null});queue.setPolicy({getCandidates:()=>game.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>game.getActiveEntries(),discardUnmatched:entry=>!isQuestionGame()&&entry.source==='speech'&&SC.isChinese(game.mode),matches:(entry,item)=>SC.matches(entry.text,item,game.mode,game.lang,entry.source),sameInput:(a,b)=>SC.sameInput(a,b,game.mode,game.lang)});renderer=new Renderer($('canvas'),game);renderer.resize();
    if(kind!=='studio')loadBest();$('game-title').textContent=names[kind];$('objective').closest('.hud-objective').hidden=['marshmallows','eggs','studio'].includes(kind);$('answer').placeholder=input.singleLetter()?'…':SC.modes[game.mode].placeholder.replace('…',' ↵');$('answer-hint').textContent=typingHint();$('keyboard').hidden=kind==='klossar'||game.mode!=='bopomofo';$('input-dock').hidden=kind==='klossar'||input.voice.enabled;document.body.classList.add('playing');document.body.classList.toggle('voice-play',input.voice.enabled);
    input.setEnabled(kind!=='klossar'&&(!isQuestionGame()||game.canAnswer()));if(input.enabled&&input.voice.enabled)input.start();
    playViewport.update();renderer.resize();navigation.enter();if(kind!=='klossar')input.focus();lastTargetKey=null;renderUi();
  }catch(error){$('setup-error').textContent=error.message; $('resume-error').textContent=error.message;if($('menu').hidden){$('end-overlay').hidden=false;$('result-title').textContent=error.message;}}
  finally{busy=false;$('start').disabled=false;$('again').disabled=false;}
}
function pause(){if(game?.state!=='playing')return;game.pause();input.setEnabled(false);$('pause-overlay').hidden=false;$('resume-error').textContent='';$('resume').focus({preventScroll:true});renderUi();}
async function resume(){
  if(busy||game?.state!=='paused')return;const token=++lifecycle;busy=true;$('resume').disabled=true;
  try{const preparation=kind!=='klossar'&&input.prepare();if(preparation)await preparation;if(token!==lifecycle)return;$('pause-overlay').hidden=true;game.resume();const canAnswer=isQuestionGame()?game.canAnswer():kind!=='klossar'&&(kind!=='eggs'||game.player.status!=='dead');input.setEnabled(canAnswer);if(canAnswer&&input.voice.enabled)input.start();if(canAnswer)input.focus();}
  catch(error){$('resume-error').textContent=error.message;}finally{busy=false;$('resume').disabled=false;}
}
function menu(){navigation.leave(showMenu);}
function showMenu(){highscores.dismiss();sounds.stopCampfire();sounds.stopDinosaurVoices?.();tileSpeech.stop();lifecycle++;input.setEnabled(false);game?.menu();renderer?.destroy();renderer=null;queue.clear();$('play').hidden=true;$('menu').hidden=false;document.body.classList.remove('playing','voice-play');menuUpdate();$('start').focus({preventScroll:true});}
function confirmGameBack(){
  if($('leave-game').open)return;
  resumeAfterBack=game?.state==='playing';pause();
  $('leave-game-message').textContent=kind==='studio'&&renderer?.dirty?'Bilden är inte inramad och försvinner om du går till menyn.':'Omgången avslutas om du lämnar spelet.';
  (document.fullscreenElement||document.body).append($('leave-game'));
  $('leave-game').showModal();$('leave-game-stay').focus();
}
function stayInGame(){ $('leave-game').close();if(resumeAfterBack)resume(); }
$('leave-game-stay').addEventListener('click',stayInGame);
$('leave-game').addEventListener('cancel',e=>{e.preventDefault();stayInGame();});
$('leave-game-confirm').addEventListener('click',()=>{$('leave-game').close();for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();menu();});
$('start').addEventListener('click',start);$('again').addEventListener('click',()=>highscores.leave(start));$('pause').addEventListener('click',pause);$('resume').addEventListener('click',resume);$('pause-menu').addEventListener('click',()=>kind==='studio'&&renderer?.dirty?renderer.confirmLeave(menu):menu());$('end-menu').addEventListener('click',()=>highscores.leave(menu));
root.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))pause();});
function renderTargets(){
  // Canvas labels are primary. Keep a compact alternative for assistive technology.
  const hints=['klossar','chess'].includes(kind)?new Set():SC.pinyinHints(game),text=game.getTargets().map(t=>(kind==='home'?SC.homeTaskTypes[t.type].name+': ':'')+(hints.has(t)?[t.item.hint,t.item.label,t.item.translation].filter(Boolean).join(' · '):t.item.label)).join(', ');
  if(text!==lastTargetKey){lastTargetKey=text;$('targets').textContent=text;}
}
function renderUi(){
  if(!game||$('play').hidden)return;
  sounds.campfire(soundOn&&kind==='marshmallows'&&['playing','celebrating'].includes(game.state)?game.fireStrength():0,input.listening?.23:1);
  if(game.state==='playing')queue.reconcile();
  if(kind==='studio'){renderTargets();return;}
  $('score').textContent=SC.formatGameScore(kind,game.score);$('best').textContent='BÄSTA '+(bestLoading?'…':best===null?'—':SC.formatGameScore(kind,best));$('score').setAttribute('aria-label',game.score+' poäng');
  let objective,secondary,value;
  if(kind==='city'){objective=game.resolved+' / '+SC.cityGoal;secondary='';value=game.resolved/SC.cityGoal*100;}
  else if(kind==='food'){
    objective=game.resolved+' / '+game.total;secondary='♥ '.repeat(game.lives)+'♡ '.repeat(Math.max(0,5-game.lives));value=game.resolved/game.total*100;
    const last=Math.max(2,...game.customers.map(c=>c.slot));
    if(document.body.classList.contains('mobile-play')&&renderer.fittedFoodSlot!==last){renderer.fittedFoodSlot=last;renderer.resize();}
    // Desktop can grow for extra rows; touch screens fit them into the viewport.
    $('arena').style.setProperty('--food-min-height',SC.foodSceneHeight(game.width,last)+'px');
  }
  else if(kind==='hive'){objective=Math.min(100,Math.floor(game.honey/game.honeyGoal*100))+'% 🍯';secondary=game.season()+' · '+Math.ceil(game.timeLeft())+' s ❄';value=game.honey/game.honeyGoal*100;}
  else if(kind==='marshmallows'||kind==='eggs'){objective='';secondary='';value=0;}
  else if(isBoardGame()){objective=game.turns+' drag';secondary=kind==='chess'?(game.phase==='end'?game.reason:'Du spelar vit'):'Datorn: '+SC.formatGameScore(kind,game.botScore);value=0;}
  else if(kind==='klossar'){objective=game.hits+' / '+game.total+' par';secondary=SC.klossarClock(game.elapsed);value=game.hits/game.total*100;}
  else if(kind==='home'){objective=Math.min(game.cleaned,game.total)+' / '+game.total;secondary='';value=Math.min(100,game.cleaned/game.total*100);}
  else if(kind==='paint'||kind==='dinosaur'){objective=game.passed+' / '+game.total;secondary='';value=game.passed/game.total*100;}
  else{const flowers=game.pots.filter(p=>p.bloom).length;objective=flowers+' / '+game.pots.length+' ✿';secondary='';value=game.pots.reduce((sum,p)=>sum+(p.dead?1:p.growth),0)/game.pots.length*100;}
  $('objective').textContent=objective;$('secondary').textContent=secondary;$('progress').value=value;renderTargets();
}
function frame(now){if(noticeUntil&&now>=noticeUntil){$('discovery-notice').hidden=true;noticeUntil=0;}if(now-lastUi>100){lastUi=now;renderUi();if($('settings').open)$('mic-level').value=Math.min(1,microphone.level*6);}uiFrame=requestAnimationFrame(frame);}uiFrame=requestAnimationFrame(frame);
$('sound').addEventListener('click',()=>{soundOn=!soundOn;if(!soundOn){sounds.stopCampfire();sounds.stopDinosaurVoices?.();tileSpeech.stop();}$('sound').querySelector('span').textContent=soundOn?'♫':'♪̸';$('sound').title=soundOn?'Ljud på':'Ljud av';$('sound').setAttribute('aria-pressed',String(soundOn));if(soundOn){sounds.unlock();sounds.play('lock');}});
for(const el of document.querySelectorAll('[data-close]'))el.addEventListener('click',()=>$(el.dataset.close).close());
$('help-open').addEventListener('click',()=>{pause();$('help').showModal();});
$('settings-open').addEventListener('click',()=>{pause();$('settings').showModal();if(microphone.ready){microphone.begin(true);$('mic-status').textContent='Mikrofonen är aktiv. Prata för att se ljudnivån.';}refreshDevices();});
$('settings').addEventListener('close',()=>{input.capture();microphone.cancel();if(replaying){try{replaying.stop();}catch(_){}replaying=null;}});
async function refreshDevices(){try{const devices=await navigator.mediaDevices?.enumerateDevices();const current=$('device').value;$('device').replaceChildren(new Option('Systemets standardmikrofon',''));for(const d of devices||[])if(d.kind==='audioinput')$('device').add(new Option(d.label||'Mikrofon '+($('device').options.length),d.deviceId));if([...$('device').options].some(o=>o.value===current))$('device').value=current;}catch(_){} }
$('mic-activate').addEventListener('click',async()=>{const b=$('mic-activate');b.disabled=true;try{await microphone.configure({deviceId:$('device').value,processing:$('processing').checked});microphone.begin(true);await refreshDevices();$('mic-status').textContent='Mikrofonen är aktiv. Säg några ord och kontrollera nivån.';}catch(e){$('mic-status').textContent=e.message;}finally{b.disabled=false;}});
$('mic-off').addEventListener('click',()=>{input.cancel();microphone.close();$('mic-status').textContent='Mikrofonen är avstängd. Nästa aktivering kan kräva ett nytt tillstånd.';});
microphone.onStateChange=()=>{if(!microphone.ready){if(input.usesAudioTrack)pause();$('mic-status').textContent='Mikrofonen är avstängd.';}};
$('replay').addEventListener('click',async()=>{
  if(microphone.recording)input.capture();const pcm=input.lastAudio;if(!pcm?.samples.length){$('mic-status').textContent='Aktivera mikrofonen och säg något först.';return;}
  try{if(replaying)replaying.stop();const ac=microphone.context;if(!ac)throw new Error('Aktivera mikrofonen för att spela upp ljudet.');await ac.resume();const b=ac.createBuffer(1,pcm.samples.length,pcm.sampleRate);b.copyToChannel(pcm.samples,0);replaying=ac.createBufferSource();replaying.buffer=b;replaying.connect(ac.destination);replaying.start();$('mic-status').textContent='Spelar upp mikrofonens senaste '+(pcm.samples.length/pcm.sampleRate).toFixed(1)+' sekunder.';}catch(e){$('mic-status').textContent=e.message;}
});
async function copy(text,status){try{await navigator.clipboard.writeText(text);$(status).textContent='Kopierat.';}catch(_){const area=document.createElement('textarea');area.value=text;($('settings').open?$('settings'):document.body).append(area);area.select();const copied=document.execCommand('copy');area.remove();$(status).textContent=copied?'Kopierat.':'Kopieringen misslyckades. Markera texten och tryck Ctrl+C.';}}
$('copy-log').addEventListener('click',()=>copy($('speech-log').value,'debug-status'));$('clear-log').addEventListener('click',()=>{log=[];$('speech-log').value='';});
$('copy-report').addEventListener('click',()=>copy(JSON.stringify({app:'Skolarkaden',browser:navigator.userAgent,voice:input.voice,microphone:microphone.stream?.getAudioTracks()[0]?.getSettings(),audio:input.lastAudio?SC.audioStats(input.lastAudio):null,queue:queue.items,events:log},null,2),'mic-status'));
root.addEventListener('pagehide',e=>{if(e?.persisted){pause();microphone.close();sounds.close();tileSpeech.stop();return;}navigation.destroy();playViewport.destroy();lifecycle++;cancelAnimationFrame(uiFrame);input.destroy();microphone.close();sounds.close();tileSpeech.stop();renderer?.destroy();});
menuUpdate();input.setEnabled(false);
if(homeworkRequested)SC.loadHomework(homeworkQuery.get('id'),homeworkQuery.get('input')).then(lesson=>{
  homeworkReady=true;$('homework-info').textContent='Läxa · '+lesson.homeworkName;menuUpdate();
}).catch(error=>{$('homework-info').textContent='Läxan kunde inte öppnas.';$('setup-error').textContent=error.message;});
})(globalThis);
