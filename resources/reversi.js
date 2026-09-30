/* Turn-based practice: an answer selects one move; no answer timer or move cap. */
(function(root){
'use strict';const SC=root.Starlight,R=SC.Reversi;
const answerForms=item=>[item.answer,...item.aliases||[],...item.speechAliases||[],...(item.hint?[item.hint]:[]),...SC.chineseTranslationAnswers(item)].filter(Boolean);
SC.reversiAnswerOverlap=(a,b,mode,lang)=>[a,b].some((item,i)=>answerForms(item).some(text=>['text','speech'].some(source=>SC.matches(text,item,mode,lang,source)&&SC.matches(text,[b,a][i],mode,lang,source))));
SC.reversiDistinctItems=function(items,needed,mode,lang,random=Math.random){
 const pool=R.shuffled(items,random),chosen=[];let best=[];
 // Backtracking avoids losing a possible triple to a first item with many aliases.
 function pick(start){if(chosen.length>best.length)best=[...chosen];if(chosen.length===needed)return true;
  for(let i=start;i<pool.length;i++)if(chosen.every(other=>!SC.reversiAnswerOverlap(pool[i],other,mode,lang))){chosen.push(pool[i]);if(pick(i+1))return true;chosen.pop();}
  return false;
 }pick(0);return best;
};
SC.reversiSpeechAnswer=function(alternatives,context){
 const {lesson,language,candidates=[]}=context,texts=alternatives.map(a=>a.transcript||'').filter(t=>t.trim());
 // A complete recognised answer wins over fragments (including multi-word homework).
 for(const text of texts){const matches=candidates.filter(item=>SC.matches(text,item,lesson,language,'speech'));if(matches.length===1)return {text};if(matches.length>1)return {ambiguous:true};}
 const found=new Map();
 for(const text of texts)for(const word of SC.tokenizeSpeech(text,context))for(const item of candidates)if(SC.matches(word,item,lesson,language,'speech'))found.set(item,word);
 if(found.size>1)return {ambiguous:true};if(found.size===1)return {text:[...found.values()][0]};
 return {text:texts[0]||''}; // A complete incorrect answer must still cost a move.
};
class ReversiGame{
 constructor({onEvent=()=>{},random=Math.random,queue=new SC.AnswerQueue()}={}){Object.assign(this,{onEvent,random,queue,state:'menu',clock:0,width:1000,height:700,targets:[],revision:0});}
 emit(type,detail={}){this.onEvent({type,...detail});}
 resize(width,height){Object.assign(this,{width,height});}
 start({mode='letters',pace='gentle',lang='sv-SE',items=null,uppercase=false}={}){
  Object.assign(this,{mode,pace,lang,uppercase,clock:0,elapsed:0,turns:0,hits:0,shots:0,streak:0,bestStreak:0,targets:[],history:[],lastMove:null,search:null,won:false,draw:false});
  this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Övningen behöver minst ett svar.');
  this.board=R.initialBoard();this.score=2;this.botScore=2;this.state='playing';this.revision++;this.queue.clear();this.emit('start');this.beginTurn(R.BLACK);
 }
 pause(){if(this.state==='playing'){this.state='paused';this.queue.clear();this.revision++;this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.revision++;this.emit('resume');}}
 menu(){this.state='menu';this.search=null;this.targets=[];this.queue.clear();}
 getTargets(){return this.targets;}
 getAvailableTargets(){return this.phase==='answer'?this.targets:[];}
 getActiveEntries(){return [];}
 getTaskStates(){return new Map();}
 canAnswer(){return this.state==='playing'&&this.phase==='answer';}
 wait(phase,message,delay=0){Object.assign(this,{phase,message,delay,targets:[]});this.queue.clear();this.revision++;this.emit('reversi-wait');}
 beginTurn(side){
  this.side=side;this.search=null;
  const moves=R.legalMoves(this.board,side);
  if(!moves.length){if(!R.legalMoves(this.board,-side).length)return this.finish();this.nextSide=-side;this.wait('pass',side===R.BLACK?'Du har inget giltigt drag. Turen går till datorn.':'Datorn har inget giltigt drag. Det är din tur igen.',1.4);return;}
  this.wait('search',side===R.BLACK?'Förbereder dina drag…':'Datorn tänker…');
  this.search=R.analyse(this.board,side,side===R.BLACK?R.adviser:R.profiles[this.pace]);
 }
 offer(ranked){
  this.ranked=ranked;const moves=R.recommendations(ranked,this.random),items=SC.reversiDistinctItems(this.items,moves.length,this.mode,this.lang,this.random);
  this.targets=items.map((base,i)=>{const item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);return {id:this.turns+':'+moves[i].index,move:moves[i],item,appearedAt:this.clock,letter:'ABC'[i]};});
  this.queue.clear();this.phase='answer';this.message=this.targets.length<3?(ranked.length<3?'Bara '+ranked.length+' giltiga drag finns.':'Övningen har färre än tre olika svar.'):'Välj ett drag genom att svara på dess uppgift.';
  this.revision++;this.emit('reversi-ready');
 }
 play(move,side,entry=null,correct=false){
  this.board=R.applyMove(this.board,move,side);const n=R.count(this.board);this.score=n.black;this.botScore=n.white;
  this.lastMove={index:move.index,flips:move.flips,side,at:this.clock};this.history.push(this.lastMove);
  if(side===R.BLACK){this.turns++;this.shots++;if(correct){this.hits++;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);}else this.streak=0;}
  this.nextSide=-side;this.wait('animate',side===R.WHITE?'Datorn spelar '+R.coordinate(move.index)+'.':correct?'Du spelar '+R.coordinate(move.index)+'.':'Fel svar. Ett svagt drag spelas: '+R.coordinate(move.index)+'.',.9);
  if(entry)this.emit(correct?'hit':'miss',{entry,points:0});
 }
 finish(){
  if(this.state!=='playing')return;const n=R.count(this.board);this.score=n.black;this.botScore=n.white;
  this.won=this.score>this.botScore;this.draw=this.score===this.botScore;this.state=this.draw?'draw':this.won?'won':'lost';this.phase='end';this.reason='terminal';this.search=null;this.targets=[];this.queue.clear();this.revision++;
  this.emit('end',{won:this.won,draw:this.draw,score:this.score,botScore:this.botScore,turns:this.turns,hits:this.hits,shots:this.shots,bestStreak:this.bestStreak});
 }
 update(dt){
  if(this.state!=='playing')return;this.clock+=dt;this.elapsed+=dt;
  if(this.phase==='search'){
   const until=performance.now()+5;let result;do{result=this.search.next();}while(!result.done&&performance.now()<until);
   if(result.done){this.search=null;if(this.side===R.BLACK)this.offer(result.value);else this.play(R.chooseBot(result.value,this.pace,this.random),R.WHITE);}return;
  }
  if(this.phase==='answer'){
   if(!this.queue.length)return;const entry=this.queue.take();if(!entry)return;
   const matches=this.targets.filter(t=>SC.matches(entry.text,t.item,this.mode,this.lang,entry.source));
   if(matches.length>1){this.queue.clear();this.message='Svaret passar flera drag. Försök med ett annat svar.';this.revision++;return;}
   this.play(matches.length?matches[0].move:R.choosePoor(this.ranked,this.random),R.BLACK,entry,!!matches.length);return;
  }
  this.queue.clear();this.delay-=dt;if(this.delay<=0)this.beginTurn(this.nextSide);
 }
}
SC.ReversiGame=ReversiGame;
})(globalThis);
