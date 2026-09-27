/* Execute the real HTML script order and app against a DOM stand-in. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{webcrypto}=require('node:crypto');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),html=read('index.html'),dictionary={'sv-001':{input:'keyboard',language:'sv-SE',words:[['hej'],['hopp'],['tekopp']]},'zh-001':{input:'voice',language:'zh-TW',words:[['你','nǐ','du'],['好','hǎo','bra'],['我喜歡喝茶','wǒ xǐhuān hē chá','Jag tycker om att dricka te.']]}};
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function boot(search='',fetchHomework=async()=>Response.json(dictionary),fetchScores=null){
  let document,currentGame,selection;const posts=[],requests=[],captures=[];
  class Element extends EventTarget{
    constructor(){super();Object.assign(this,{value:'',textContent:'',text:'',hidden:false,disabled:false,children:[],options:[],dataset:{},open:false});this.classList={add(){},remove(){},toggle(){}};this.style={setProperty(){}};}
    append(...items){this.children.push(...items);}replaceChildren(...items){this.children=[...items];this.options=[...items];this.value=items[0]?.value||'';}add(option){this.options.push(option);if(this.options.length===1)this.value=option.value;}
    closest(){return this.parent||(this.parent=new Element());}querySelector(){return null;}setAttribute(){}focus(){document.activeElement=this;}showModal(){this.open=true;}close(){this.open=false;this.dispatchEvent(new Event('close'));}
  }
  const fields={};for(const tag of html.match(/<[^>]+\bid="[^"]+"[^>]*>/g)||[]){const el=new Element();el.hidden=/\bhidden\b/.test(tag);fields[tag.match(/\bid="([^"]+)"/)[1]]=el;}
  for(const [,id,body] of html.matchAll(/<select[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g))for(const [,value,text] of body.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g))fields[id].add(Object.assign(new Element(),{value,text,textContent:text}));
  const radios=[...html.matchAll(/<input[^>]*name="game"[^>]*value="([^"]+)"[^>]*>/g)].map(([,value])=>Object.assign(new Element(),{value}));
  document=Object.assign(new EventTarget(),{body:new Element(),getElementById:id=>{assert(fields[id],id);return fields[id];},createElement:()=>new Element(),querySelector:()=>null,querySelectorAll:selector=>selector==='[name=game]'?radios:[]});
  const ctx=vm.createContext({document,console,Event,EventTarget,CustomEvent,URLSearchParams,AbortController,setTimeout,clearTimeout,crypto:webcrypto,location:{search},performance:{now:()=>0},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},matchMedia:()=>({matches:false}),navigator:{},localStorage:{getItem(){},setItem(){},removeItem(){}},Option:class extends Element{constructor(text,value){super();this.textContent=this.text=text;this.value=value;}},fetch:async(url,options={})=>{
    requests.push(url);if(url==='homework.json')return fetchHomework(url,options);
    if(options.method==='POST'){posts.push(JSON.parse(options.body));return Response.json({ok:true});}
    if(fetchScores)return fetchScores(url,options);
    return Response.json({leaderboard:'v2:city',scores:[{player_name:'TEST',score:30,exercise:'homework',difficulty:'gentle'}],rank:2});
  }});
  for(const [,url] of html.matchAll(/<script defer src="([^"]+)"/g)){
    const file=url.split('?')[0];
    if(file==='resources/app.js'){
      const SC=ctx.Starlight;
      SC.GameSounds=class{unlock(){}play(){}stopCampfire(){}campfire(){}close(){}};
      for(const name of ['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home','Reversi','Chess','Klossar']){
        const Game=SC[name+'Game'];SC[name+'Game']=class extends Game{constructor(options){super(options);currentGame=this;}};
        SC[name+'Renderer']=class{constructor(canvas,game){this.game=game;}resize(){this.game.resize(1000,700);}destroy(){}scoreEvent(){}};
      }
      const Scores=SC.Highscores;SC.Highscores=class extends Scores{begin(value){selection=value;super.begin(value);}};
      const Input=SC.AnswerInput;SC.AnswerInput=class extends Input{configure(value){captures.push(value);super.configure(value);}};
    }
    vm.runInContext(read(file),ctx,{filename:file});
  }
  return {ctx,fields,radios,posts,requests,captures,get game(){return currentGame;},get selection(){return selection;},click:id=>fields[id].dispatchEvent(new Event('click'))};
}
(async()=>{
  const normal=boot();await settle();assert(!normal.requests.includes('homework.json'));assert(!normal.fields.lesson.options.some(o=>o.value==='homework'));assert(!normal.fields.lesson.disabled);assert(!normal.fields['input-kind'].disabled);
  let top=1234,fail=false,pending=null;
  const hud=boot('',undefined,async url=>{
    if(pending)return new Promise(resolve=>pending.push(resolve));
    if(fail)throw Error('offline');
    const board=new URL(url).searchParams.get('leaderboard').split(':').slice(0,2).join(':');
    return Response.json({leaderboard:board,scores:top===null?[]:[{score:board==='v2:chess'?1234:top}]});
  });
  await settle();
  for(const radio of hud.radios){
    radio.dispatchEvent(new Event('change'));hud.click('start');await settle();
    assert.equal(hud.fields['setup-error'].textContent,'');
    assert.equal(hud.fields.best.textContent,'BÄSTA '+(radio.value==='chess'?(1234).toLocaleString('sv-SE'):top.toLocaleString('sv-SE')),radio.value+' shows online record');
    assert.equal(hud.fields.score.textContent,hud.game.score.toLocaleString('sv-SE'));
    assert(hud.requests.at(-1).includes(encodeURIComponent(hud.ctx.SkolarkadenHighscorePolicy.versions[radio.value]+':'+radio.value+':')));
    hud.click('pause');hud.click('pause-menu');top++;
  }
  top=null;hud.click('start');await settle();assert.equal(hud.fields.best.textContent,'BÄSTA 0','empty board');
  hud.click('pause');hud.click('pause-menu');fail=true;hud.click('start');await settle();assert.equal(hud.fields.best.textContent,'BÄSTA —','failure is not zero');
  hud.click('pause');hud.click('pause-menu');fail=false;pending=[];hud.click('start');await settle();assert.equal(hud.fields.best.textContent,'BÄSTA …');
  const old=pending[0];pending=null;top=4321;
  hud.click('pause');hud.click('pause-menu');hud.radios[0].dispatchEvent(new Event('change'));hud.click('start');await settle();
  old(Response.json({scores:[{score:9999}]}));await settle();
  assert.equal(hud.fields.best.textContent,'BÄSTA '+top.toLocaleString('sv-SE'),'late response cannot replace another game record');
  console.log('PASS online top score for all twelve games, empty/error/loading states and stale response isolation.');
  const reversi=boot();await settle();reversi.radios.find(r=>r.value==='reversi').dispatchEvent(new Event('change'));reversi.click('start');await settle();
  assert.equal(reversi.fields.answer.disabled,true,'thinking disables input');
  const ready=()=>{for(let i=0;i<10000&&reversi.game.phase!=='answer'&&reversi.game.state==='playing';i++)reversi.game.update(.05);};
  ready();assert.equal(reversi.fields.answer.disabled,false);assert.equal(reversi.captures.at(-1).turnBased,true);
  const move=reversi.game.targets[1];reversi.fields.answer.value=move.item.answer;reversi.fields['answer-form'].dispatchEvent(new Event('submit',{cancelable:true}));reversi.game.update(.05);
  assert.equal(reversi.game.lastMove.index,move.move.index);assert.equal(reversi.fields.answer.disabled,true);assert.equal(reversi.fields.answer.value,'');
  ready();reversi.click('pause');assert(reversi.fields.answer.disabled);reversi.click('resume');await settle();assert.equal(reversi.fields.answer.disabled,false);
  reversi.game.board=new Int8Array(64).fill(1);reversi.game.beginTurn(1);await settle();
  assert.equal(reversi.fields['result-title'].textContent,'Du vann! 64–0');assert.equal(reversi.fields['end-overlay'].hidden,false);
  reversi.click('again');await settle();await settle();assert.equal(reversi.posts[0].leaderboard_key,'v1:reversi:swedish:gentle');assert.equal(reversi.posts[0].score,64);
  assert.equal(reversi.game.score,2);assert.equal(reversi.game.turns,0);
  console.log('PASS Reversi app: menu, turn input, pause/resume, final score submission and restart.');
  const chess=boot('',undefined,async url=>Response.json({leaderboard:'v2:chess',scores:[{player_name:'DRAW',score:500,exercise:'swedish',difficulty:'gentle'}],rank:2}));await settle();
  chess.radios.find(r=>r.value==='chess').dispatchEvent(new Event('change'));chess.click('start');await settle();
  assert.equal(chess.fields.answer.disabled,true);assert.equal(chess.captures.at(-1).turnBased,true);assert.equal(chess.fields.best.textContent,'BÄSTA '+(500).toLocaleString('sv-SE'));
  const chessReady=()=>{for(let i=0;i<20000&&chess.game.phase!=='answer'&&chess.game.state==='playing';i++)chess.game.update(.05);};
  chessReady();assert.equal(chess.fields.answer.disabled,false);const proposed=chess.game.targets[1];
  chess.fields.answer.value=proposed.item.answer;chess.fields['answer-form'].dispatchEvent(new Event('submit',{cancelable:true}));chess.game.update(.05);
  assert.equal(chess.game.lastMove.from,proposed.move.from);assert.equal(chess.game.lastMove.to,proposed.move.to);assert(chess.fields.answer.disabled);assert.equal(chess.fields.answer.value,'');
  chessReady();chess.click('pause');assert(chess.fields.answer.disabled);chess.click('resume');await settle();assert.equal(chess.fields.answer.disabled,false);
  chess.game.position=new chess.ctx.Starlight.ChessEngine.Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');chess.game.beginTurn();await settle();
  assert.equal(chess.fields['result-title'].textContent,'Remi! ½–½ · Patt');assert.equal(chess.fields['end-overlay'].hidden,false);
  const chessScore=chess.game.score;assert(chessScore>=0&&chessScore<=1530);
  assert(chess.fields['end-scores-list'].children.some(row=>row.children.some(cell=>cell.className==='board-points'&&cell.textContent===String(chessScore))));assert.equal(chess.fields['chess-result-breakdown'].hidden,false);assert.match(chess.fields['chess-result-breakdown'].textContent,/Dragkvalitet/);
  chess.click('again');await settle();await settle();assert.equal(chess.posts[0].leaderboard_key,'v2:chess:swedish:gentle');assert.equal(chess.posts[0].score,chessScore,'arcade score is stored without rescaling');
  assert.equal(chess.game.turns,0);assert.equal(chess.game.position.history().length,0);
  chess.fields.lesson.value='chinese';chess.click('pause');chess.click('pause-menu');chess.click('start');await settle();chessReady();
  chess.game.queue.enqueue('錯了','speech');chess.game.update(.05);assert.equal(chess.game.turns,1,'incorrect Chinese speech must reach the poor-move rule');assert.equal(chess.game.hits,0);
  console.log('PASS Chess app: turn input, chosen move, pause/resume, draw display, arcade-point submission, replay and wrong Chinese speech');
  let resolve;const app=boot('?mode=homework&id=sv-001&input=keyboard&language=zh-CN&words=wrong',()=>new Promise(done=>resolve=done));
  assert(app.fields.start.disabled);app.click('start');await settle();assert.equal(app.game,undefined,'loading cannot launch a default exercise');
  resolve(Response.json({...dictionary,'sv-001':{...dictionary['sv-001'],input:'voice'}}));await settle();assert(!app.fields.start.disabled);
  for(const id of ['lesson','input-kind','language'])assert(app.fields[id].disabled,id+' must be locked');
  assert.equal(app.fields['input-kind'].value,'typing');assert.equal(app.fields.language.value,'sv-SE');assert.equal(app.fields.lesson.value,'homework');
  assert.deepEqual(app.fields.lesson.options.map(o=>o.value),['homework']);assert.equal(app.fields['homework-info'].textContent,'Läxa · sv-001');
  for(const radio of app.radios){
    radio.dispatchEvent(new Event('change'));app.fields.pace.value='brave';app.click('start');await settle();
    assert.equal(app.fields['setup-error'].textContent,'');assert.equal(app.game.mode,'homework');assert.equal(app.game.lang,'sv-SE');assert.equal(app.game.pace,'brave');
    assert.deepEqual(Array.from(app.game.items,i=>i.answer),['hej','hopp','tekopp']);assert.equal(app.captures.at(-1).enabled,false);
    assert.equal(app.selection.homeworkId,'sv-001');assert.equal(app.selection.mode,'homework');
    app.click('pause');app.click('pause-menu');assert(app.fields.lesson.disabled);assert(app.fields['input-kind'].disabled);assert(app.fields.language.disabled);
  }
  app.radios.find(r=>r.value==='city').dispatchEvent(new Event('change'));app.click('start');await settle();app.game.finish(true);await settle();
  assert.equal(app.fields['result-context'].textContent,'Läxa · Svår');assert(app.fields['end-scores-list'].children.some(row=>row.children.some(c=>c.textContent==='Läxa')));
  app.click('again');await settle();await settle();assert.equal(app.game.state,'playing');assert.equal(app.game.mode,'homework');
  assert.equal(app.posts.length,1);assert.equal(app.posts[0].leaderboard_key,'v2:city:homework:brave');assert.equal(app.posts[0].settings.homework_id,'sv-001');assert.equal(app.posts[0].settings.input_mode,'keyboard');
  const voice=boot('?mode=homework&id=zh-001');await settle();assert.equal(voice.fields.language.value,'zh-TW');assert.equal(voice.fields['input-kind'].value,'browser');assert(voice.fields.language.disabled);assert.equal(voice.ctx.Starlight.modes.homework.items[2].hint,'wǒ xǐhuān hē chá');
  const voiceOverride=boot('?mode=homework&id=sv-001&input=voice');await settle();assert.equal(voiceOverride.fields['input-kind'].value,'browser');assert(voiceOverride.fields['input-kind'].disabled);assert.equal(voiceOverride.ctx.Starlight.modes.homework.input,'voice');
  const keyboardDefault=boot('?mode=homework&id=sv-001');await settle();assert.equal(keyboardDefault.fields['input-kind'].value,'typing');
  // Even a voice-only homework URL becomes click-only for Klossar; switching
  // games must restore the original input choice, not overwrite the homework.
  voice.radios.find(r=>r.value==='klossar').dispatchEvent(new Event('change'));
  voice.click('start');await settle();assert.equal(voice.fields['setup-error'].textContent,'');
  assert.equal(voice.game.state,'playing');assert.equal(voice.captures.at(-1).enabled,false);
  assert(voice.fields.answer.disabled);assert(voice.fields['input-dock'].hidden);assert(voice.fields['settings-open'].hidden);
  assert.equal(voice.selection.input,'click');assert.equal(voice.selection.spokenLanguage,null);assert.equal(voice.fields.objective.textContent,'0 / 20 par');
  const elapsed=voice.game.elapsed;voice.click('pause');voice.game.update(20);assert.equal(voice.game.elapsed,elapsed);voice.click('resume');await settle();assert(voice.fields.answer.disabled);
  for(let n=0;n<20;n++){
    const free=voice.game.getAvailableTargets(),a=free.find(a=>free.some(b=>voice.ctx.Starlight.klossarMatches(a,b))),b=free.find(b=>voice.ctx.Starlight.klossarMatches(a,b));
    voice.game.select(a.id);voice.game.select(b.id);voice.game.update(.5);
  }
  voice.game.update(1);await settle();assert.equal(voice.fields['result-title'].textContent,'Alla klossar är borta!');
  voice.click('again');await settle();await settle();assert.equal(voice.game.hits,0);assert.equal(voice.posts.length,1);
  assert.equal(voice.posts[0].leaderboard_key,'v1:klossar:homework:gentle');assert.equal(voice.posts[0].settings.input_mode,'click');
  assert.equal(voice.posts[0].settings.spoken_language,null);assert.equal(voice.posts[0].settings.homework_id,'zh-001');
  voice.click('pause');voice.click('pause-menu');voice.radios.find(r=>r.value==='city').dispatchEvent(new Event('change'));
  assert.equal(voice.fields['input-kind'].value,'browser');assert(!voice.fields['settings-open'].hidden);
  console.log('PASS Klossar click-only voice homework, disabled text/microphone, pause/resume, full round, score settings, replay and input restoration');
  for(const search of ['?mode=homework','?mode=homework&id=missing','?mode=homework&id=sv-001&input=invalid','?mode=homework&id=sv-001&input=']){const broken=boot(search);await settle();assert(broken.fields.start.disabled);assert(broken.fields['setup-error'].textContent);broken.click('start');await settle();assert.equal(broken.game,undefined);}
  for(const response of [()=>new Response('{'),()=>{throw Error('offline');},()=>Response.json({'sv-001':{input:'keyboard',language:'sv-SE',words:[]}})]){
    const broken=boot('?mode=homework&id=sv-001',async()=>response());await settle();assert(broken.fields.start.disabled);assert(broken.fields['setup-error'].textContent);assert.equal(broken.game,undefined);
  }
  console.log('PASS homework UI: URL loading, normal menu, errors, locked selections, all game choices, pause/menu/replay and highscore submission.');
})().catch(error=>{console.error(error);process.exitCode=1;});
