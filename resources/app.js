/* Composition root: DOM, shared FIFO, speech lifecycle, and interchangeable games. */
(function(root){
'use strict';const SC=root.Starlight,$=id=>document.getElementById(id);
const queue=new SC.AnswerQueue(),microphone=new SC.Microphone(),sounds=new SC.GameSounds();
const input=new SC.AnswerInput({field:$('answer'),form:$('answer-form'),queue,microphone,retainFocus:()=>game?.state==='playing'&&!document.querySelector('dialog[open]'),getCandidates:()=>game?.state==='playing'?game.getTargets().map(t=>t.item):[]});
let game,renderer,kind='city',busy=false,soundOn=true,lastOptions=null,log=[],lastTargetKey=null,lastUi=0,uiFrame,replaying=null,lifecycle=0;
const names={city:'Stjärnförsvaret',food:'Stjärnköket',garden:'Ordträdgården',hive:'Bikupan',paint:'Färgballonger',dinosaur:'Hungrig dinosaurie',marshmallows:'Marshmallows'},classes={city:[SC.CityGame,SC.CityRenderer],food:[SC.FoodTruckGame,SC.FoodTruckRenderer],garden:[SC.GardenGame,SC.GardenRenderer],hive:[SC.BeehiveGame,SC.BeehiveRenderer],paint:[SC.PaintGame,SC.PaintRenderer],dinosaur:[SC.DinosaurGame,SC.DinosaurRenderer],marshmallows:[SC.MarshmallowGame,SC.MarshmallowRenderer]};
const safeRead=key=>{try{return Number(localStorage.getItem(key))||0;}catch(_){return 0;}},safeWrite=(key,v)=>{try{localStorage.setItem(key,String(v));}catch(_){}};
let best=0,noticeUntil=0;
try{localStorage.removeItem('starlight-friends-v1');}catch(_){}
function notice(text){$('discovery-notice').textContent=text;$('discovery-notice').hidden=false;noticeUntil=performance.now()+6000;}
for(const [value,m] of Object.entries(SC.modes))$('lesson').add(new Option(m.name,value));$('lesson').value='swedish';
for(const [key,glyph] of Object.entries(SC.bopomofoKeys)){const el=document.createElement('span');el.textContent=glyph+' ';const small=document.createElement('small');small.textContent=key.toUpperCase();el.append(small);$('keyboard-grid').append(el);}
function options(){return {mode:$('lesson').value,pace:$('pace').value,lang:$('language').value,uppercase:Math.random()<.5};}
function speechOptions(){return {enabled:$('input-kind').value!=='typing',kind:$('input-kind').value,language:$('language').value,lesson:$('lesson').value};}
function typingHint(){return ['letters','bopomofo'].includes($('lesson').value)?'Tryck på en bokstav.':'Skriv ett svar och tryck Enter.';}
function menuUpdate(){
  const voice=$('input-kind').value!=='typing';$('setup-note').textContent=kind==='marshmallows'?(voice?'Säg svaret när marshmallowen är gyllene.':['letters','bopomofo'].includes($('lesson').value)?'Tryck på bokstaven när marshmallowen är gyllene.':'Skriv svaret. Tryck Enter när marshmallowen är gyllene.'):voice?'Säg svaren efter varandra.':typingHint();
  $('mode-description').textContent=SC.modes[$('lesson').value].description;$('keyboard').hidden=$('lesson').value!=='bopomofo';
  [...$('pace').options].forEach((o,i)=>o.textContent=['Lugn','Lagom','Utmaning'][i]);
}
$('lesson').addEventListener('change',()=>{$('language').value=SC.modes[$('lesson').value].lang;menuUpdate();});$('input-kind').addEventListener('change',menuUpdate);
for(const radio of document.querySelectorAll('[name=game]'))radio.addEventListener('change',()=>{kind=radio.value;menuUpdate();});
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
function bestKey(){return 'starlight-queue-v'+(kind==='food'?'1':'2')+':'+kind+':'+game.mode+':'+game.pace;}
function onGameEvent(e){
  const mapped={early:'camp-check',think:kind==='marshmallows'?'camp-check':'think',fire:'laser',impact:'crash',hit:kind==='city'?'explosion':kind==='food'?'serve':kind==='hive'?'honey':kind==='paint'?'paint-splash':kind==='dinosaur'?'dino-gulp':kind==='marshmallows'?'camp-good':null,miss:kind==='paint'?'paint-splash':kind==='dinosaur'?'dino-air':'miss','customer-left':'miss','plant-dead':'crash',need:null,impatient:'tick'};
  const sound=Object.hasOwn(mapped,e.type)?mapped[e.type]:e.type;
  if(soundOn&&sound&&!(e.type==='end'))sounds.play(sound,input.listening?.23:1);
  if(e.type==='rare-arrival')notice('✦ '+SC.rarePeople.find(r=>r.id===e.look.exotic).name);
  if(e.type==='rare-earned')notice('✦ '+SC.rarePeople.find(r=>r.id===e.look.exotic).name+(e.bonus?' · +'+e.bonus+' poäng':' ✦'));
  if(e.type==='hive-full')notice('🍯 Fullt!');
  if(e.entry&&['hit','miss','waste','think','early'].includes(e.type))record({at:new Date().toISOString(),type:'action',text:e.entry.text,result:e.type});
  if(['celebrate','loss-pause'].includes(e.type)){input.setEnabled(false);$('pause').disabled=true;if(soundOn&&e.type==='celebrate'&&kind!=='marshmallows')sounds.play('win');}
  if(e.type==='pause'||e.type==='end')sounds.stopCampfire();
  if(e.type==='end'){
    input.setEnabled(false);$('pause').disabled=true;$('end-overlay').hidden=false;$('pause-overlay').hidden=true;
    if(e.score>best){best=e.score;safeWrite(bestKey(),best);}
    $('result-kicker').textContent=['paint','dinosaur','marshmallows'].includes(kind)?'OMGÅNGEN ÄR KLAR':e.won?'DU KLARADE DET!':'EN NY CHANS VÄNTAR';
    $('result-title').textContent=e.won?({city:'Staden är räddad.',food:'Vilken god kväll!',garden:'Allt står i blom.',hive:'Bina klarar vintern!',paint:'Vilket färgkalas!',dinosaur:'Mätt och belåten!',marshmallows:'God morgon!'}[kind]):({city:'Staden behöver vila.',food:'Köket stänger för idag.',garden:'En planta vissnade.',hive:'Honungen räckte inte.'}[kind]);
    $('result-score').textContent=e.score.toLocaleString('sv-SE')+' poäng';
    $('result-detail').textContent=kind==='marshmallows'?e.hits+' gyllene marshmallows · '+e.burnt+' brända.':kind==='city'?e.hits+' av '+SC.cityGoal+' kometer stoppade.':kind==='food'?e.hits+(e.hits===1?' glad gäst · ':' glada gäster · ')+e.lostCustomers+' gäster gick hem.':kind==='hive'?e.honey+' av '+e.honeyGoal+' lass nektar hann hem före vintern.':kind==='paint'?e.hits+' träffar · '+e.passed+' förbipasserande.':kind==='dinosaur'?e.hits+' uppätna · '+e.escaped+' gick vidare · '+e.passed+' totalt.':e.flowers+' av '+game.pots.length+' plantor blommade.';
    if(soundOn&&!(kind!=='city'&&e.won))sounds.play(e.won?'win':'miss');$('again').focus({preventScroll:true});
  }
  lastTargetKey=null;
}
async function start(){
  if(busy)return;const token=++lifecycle;busy=true;$('start').disabled=true;$('again').disabled=true;$('setup-error').textContent='';
  try{
    input.setEnabled(false);input.configure(speechOptions());await input.prepare();if(token!==lifecycle)return;
    sounds.stopCampfire();sounds.unlock();renderer?.destroy();queue.clear();$('answer').value='';$('menu').hidden=true;$('play').hidden=false;$('end-overlay').hidden=true;$('pause-overlay').hidden=true;$('pause').disabled=false;$('discovery-notice').hidden=true;noticeUntil=0;
    const [Game,Renderer]=classes[kind];game=new Game({queue,onEvent:onGameEvent});lastOptions=options();$('arena').className='arena '+kind;$('play').dataset.game=kind;game.start(lastOptions);queue.setPolicy({getCandidates:()=>game.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>game.getActiveEntries(),matches:(entry,item)=>SC.matches(entry.text,item,game.mode,game.lang,entry.source),sameInput:(a,b)=>SC.sameInput(a,b,game.mode,game.lang)});renderer=new Renderer($('canvas'),game);renderer.resize();
    best=safeRead(bestKey());$('game-title').textContent=names[kind];$('answer').placeholder=input.singleLetter()?'…':SC.modes[game.mode].placeholder.replace('…',' ↵');$('answer-hint').textContent=typingHint();$('keyboard').hidden=game.mode!=='bopomofo';$('input-dock').hidden=input.voice.enabled;document.body.classList.add('playing');document.body.classList.toggle('voice-play',input.voice.enabled);
    input.setEnabled(true);if(input.voice.enabled)input.start();
    input.focus();lastTargetKey=null;renderUi();
  }catch(error){$('setup-error').textContent=error.message; $('resume-error').textContent=error.message;if($('menu').hidden){$('end-overlay').hidden=false;$('result-detail').textContent=error.message;}}
  finally{busy=false;$('start').disabled=false;$('again').disabled=false;}
}
function pause(){if(game?.state!=='playing')return;game.pause();input.setEnabled(false);$('pause-overlay').hidden=false;$('resume-error').textContent='';$('resume').focus({preventScroll:true});renderUi();}
async function resume(){
  if(busy||game?.state!=='paused')return;const token=++lifecycle;busy=true;$('resume').disabled=true;
  try{await input.prepare();if(token!==lifecycle)return;$('pause-overlay').hidden=true;game.resume();input.setEnabled(true);if(input.voice.enabled)input.start();input.focus();}
  catch(error){$('resume-error').textContent=error.message;}finally{busy=false;$('resume').disabled=false;}
}
function menu(){sounds.stopCampfire();lifecycle++;input.setEnabled(false);game?.menu();renderer?.destroy();renderer=null;queue.clear();$('play').hidden=true;$('menu').hidden=false;document.body.classList.remove('playing','voice-play');menuUpdate();$('start').focus({preventScroll:true});}
$('start').addEventListener('click',start);$('again').addEventListener('click',start);$('pause').addEventListener('click',pause);$('resume').addEventListener('click',resume);$('pause-menu').addEventListener('click',menu);$('end-menu').addEventListener('click',menu);
root.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))pause();});
function renderTargets(){
  // Canvas labels are primary. Keep a compact alternative for assistive technology.
  const hints=SC.pinyinHints(game),text=game.getTargets().map(t=>t.item.label+(hints.has(t)?' · '+t.item.hint:'')).join(', ');
  if(text!==lastTargetKey){lastTargetKey=text;$('targets').textContent=text;}
}
function renderUi(){
  if(!game||$('play').hidden)return;
  sounds.campfire(soundOn&&kind==='marshmallows'&&['playing','celebrating'].includes(game.state)?game.fireStrength():0,input.listening?.23:1);
  if(game.state==='playing')queue.reconcile();
  $('score').textContent=game.score.toLocaleString('sv-SE');$('best').textContent='BÄSTA '+best.toLocaleString('sv-SE');$('score').setAttribute('aria-label',game.score+' poäng');
  let objective,secondary,value;
  if(kind==='city'){objective=game.hits+' / '+SC.cityGoal;secondary='';value=game.hits/SC.cityGoal*100;}
  else if(kind==='food'){objective='◷ '+Math.ceil(game.timeLeft);secondary='♥ '.repeat(game.lives)+'♡ '.repeat(Math.max(0,5-game.lives));value=game.elapsed/90*100;}
  else if(kind==='hive'){objective=Math.min(100,Math.floor(game.honey/game.honeyGoal*100))+'% 🍯';secondary=game.season()+' · '+Math.ceil(game.timeLeft())+' s ❄';value=game.honey/game.honeyGoal*100;}
  else if(kind==='marshmallows'){objective=game.state==='playing'?'☾':'☀';secondary='';value=game.progress()*100;}
  else if(kind==='paint'||kind==='dinosaur'){objective=game.passed+' / '+game.total;secondary='';value=game.passed/game.total*100;}
  else{const flowers=game.pots.filter(p=>p.bloom).length;objective=flowers+' / '+game.pots.length+' ✿';secondary='';value=game.pots.reduce((sum,p)=>sum+p.growth,0)/game.pots.length*100;}
  $('objective').textContent=objective;$('secondary').textContent=secondary;$('progress').value=value;renderTargets();
}
function frame(now){if(noticeUntil&&now>=noticeUntil){$('discovery-notice').hidden=true;noticeUntil=0;}if(now-lastUi>100){lastUi=now;renderUi();if($('settings').open)$('mic-level').value=Math.min(1,microphone.level*6);}uiFrame=requestAnimationFrame(frame);}uiFrame=requestAnimationFrame(frame);
$('sound').addEventListener('click',()=>{soundOn=!soundOn;if(!soundOn)sounds.stopCampfire();$('sound').querySelector('span').textContent=soundOn?'♫':'♪̸';$('sound').title=soundOn?'Ljud på':'Ljud av';$('sound').setAttribute('aria-pressed',String(soundOn));if(soundOn){sounds.unlock();sounds.play('lock');}});
for(const el of document.querySelectorAll('[data-close]'))el.addEventListener('click',()=>$(el.dataset.close).close());
$('help-open').addEventListener('click',()=>{pause();$('help').showModal();});
$('settings-open').addEventListener('click',()=>{pause();$('settings').showModal();if(microphone.ready){microphone.begin(true);$('mic-status').textContent='Mikrofonen är aktiv. Prata för att se ljudnivån.';}refreshDevices();});
$('settings').addEventListener('close',()=>{input.capture();microphone.cancel();if(replaying){try{replaying.stop();}catch(_){}replaying=null;}});
async function refreshDevices(){try{const devices=await navigator.mediaDevices?.enumerateDevices();const current=$('device').value;$('device').replaceChildren(new Option('Systemets standardmikrofon',''));for(const d of devices||[])if(d.kind==='audioinput')$('device').add(new Option(d.label||'Mikrofon '+($('device').options.length),d.deviceId));if([...$('device').options].some(o=>o.value===current))$('device').value=current;}catch(_){} }
$('mic-activate').addEventListener('click',async()=>{const b=$('mic-activate');b.disabled=true;try{await microphone.configure({deviceId:$('device').value,processing:$('processing').checked});microphone.begin(true);await refreshDevices();$('mic-status').textContent='Mikrofonen är aktiv. Säg några ord och kontrollera nivån.';}catch(e){$('mic-status').textContent=e.message;}finally{b.disabled=false;}});
$('mic-off').addEventListener('click',()=>{input.cancel();microphone.close();$('mic-status').textContent='Mikrofonen är avstängd. Nästa aktivering kan kräva ett nytt tillstånd.';});
microphone.onStateChange=()=>{if(!microphone.ready){pause();$('mic-status').textContent='Mikrofonen är avstängd.';}};
$('install-language').addEventListener('click',async()=>{const b=$('install-language');b.disabled=true;try{await SC.localSpeechStatus($('language').value,true);$('mic-status').textContent='Det lokala språkpaketet är klart.';}catch(e){$('mic-status').textContent=e.message;}finally{b.disabled=false;}});
$('replay').addEventListener('click',async()=>{
  if(microphone.recording)input.capture();const pcm=input.lastAudio;if(!pcm?.samples.length){$('mic-status').textContent='Aktivera mikrofonen och säg något först.';return;}
  try{if(replaying)replaying.stop();const ac=microphone.context;if(!ac)throw new Error('Aktivera mikrofonen för att spela upp ljudet.');await ac.resume();const b=ac.createBuffer(1,pcm.samples.length,pcm.sampleRate);b.copyToChannel(pcm.samples,0);replaying=ac.createBufferSource();replaying.buffer=b;replaying.connect(ac.destination);replaying.start();$('mic-status').textContent='Spelar upp mikrofonens senaste '+(pcm.samples.length/pcm.sampleRate).toFixed(1)+' sekunder.';}catch(e){$('mic-status').textContent=e.message;}
});
async function copy(text,status){try{await navigator.clipboard.writeText(text);$(status).textContent='Kopierat.';}catch(_){const area=document.createElement('textarea');area.value=text;($('settings').open?$('settings'):document.body).append(area);area.select();const copied=document.execCommand('copy');area.remove();$(status).textContent=copied?'Kopierat.':'Kopieringen misslyckades. Markera texten och tryck Ctrl+C.';}}
$('copy-log').addEventListener('click',()=>copy($('speech-log').value,'debug-status'));$('clear-log').addEventListener('click',()=>{log=[];$('speech-log').value='';});
$('copy-report').addEventListener('click',()=>copy(JSON.stringify({app:'Skolarkaden',browser:navigator.userAgent,voice:input.voice,microphone:microphone.stream?.getAudioTracks()[0]?.getSettings(),audio:input.lastAudio?SC.audioStats(input.lastAudio):null,queue:queue.items,events:log},null,2),'mic-status'));
root.addEventListener('pagehide',()=>{lifecycle++;cancelAnimationFrame(uiFrame);input.destroy();microphone.close();sounds.close();renderer?.destroy();});
menuUpdate();input.setEnabled(false);
})(globalThis);
