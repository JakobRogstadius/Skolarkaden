/* Answer-driven turns; points depend only on the chess moves and outcome. */
(function(root){
'use strict';const SC=root.Starlight,C=SC.ChessEngine,S=SC.ChessScoring;
class ChessGame{
 constructor({onEvent=()=>{},random=Math.random,queue=new SC.AnswerQueue()}={}){Object.assign(this,{onEvent,random,queue,state:'menu',clock:0,width:1000,height:700,targets:[],revision:0});}
 emit(type,detail={}){this.onEvent({type,...detail});}
 resize(width,height){Object.assign(this,{width,height});}
 start({mode='letters',pace='gentle',lang='sv-SE',items=null,uppercase=false}={}){
  Object.assign(this,{mode,pace,lang,uppercase,clock:0,elapsed:0,turns:0,hits:0,shots:0,streak:0,bestStreak:0,score:0,botScore:0,resultScore:null,capturedMaterial:0,lostMaterial:0,qualityLoss:0,targets:[],history:[],lastMove:null,search:null,ranked:null,won:false,draw:false,reason:null});
  this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Övningen behöver minst ett svar.');
  this.position=new C.Chess();this.updateScore();this.state='playing';this.revision++;this.queue.clear();this.emit('start');this.beginTurn();
 }
 pause(){if(this.state==='playing'){this.state='paused';this.queue.clear();this.revision++;this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.revision++;this.emit('resume');}}
 menu(){this.state='menu';this.search=null;this.targets=[];this.queue.clear();}
 getTargets(){return this.targets;}
 getAvailableTargets(){return this.phase==='answer'?this.targets:[];}
 getActiveEntries(){return [];}
 getTaskStates(){return new Map();}
 canAnswer(){return this.state==='playing'&&this.phase==='answer';}
 updateScore(){this.scoreParts=S.calculate(this);this.score=this.scoreParts.total;}
 wait(phase,message,delay=0){Object.assign(this,{phase,message,delay,targets:[]});this.queue.clear();this.revision++;this.emit('chess-wait');}
 beginTurn(){
  this.side=this.position.turn();this.search=null;
  const result=C.outcome(this.position);if(result)return this.finish(result);
  this.wait('search',this.side==='w'?'Förbereder dina drag…':'Datorn tänker…');
  this.search=C.analyse(this.position,this.side==='w'?C.adviser:C.profiles[this.pace]);
 }
 offer(ranked){
  this.ranked=ranked;const moves=C.recommendations(ranked,this.random),items=SC.reversiDistinctItems(this.items,moves.length,this.mode,this.lang,this.random);
  this.targets=items.map((base,i)=>{
   const item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);
   return {id:this.turns+':'+C.key(moves[i]),move:moves[i],item,appearedAt:this.clock,letter:'ABC'[i]};
  });
  this.queue.clear();this.phase='answer';
  this.message=(this.position.isCheck()?'Schack! ':'')+(this.targets.length<3?(ranked.length<3?'Bara '+ranked.length+' giltiga drag finns.':'Övningen har färre än tre olika svar.'):'Välj ett drag genom att svara på dess uppgift.');
  this.revision++;this.emit('chess-ready');
 }
 play(move,entry=null,correct=false){
  const side=this.position.turn(),previousScore=this.score,regret=side==='w'?S.moveLoss(this.ranked,move):0,played=this.position.move(move);
  this.lastMove={...played,at:this.clock,qualityLoss:regret};this.history.push(this.lastMove);
  if(played.captured){const value=S.pieceValues[played.captured];if(side==='w')this.capturedMaterial+=value;else this.lostMaterial+=value;}
  if(side==='w')this.qualityLoss+=regret;
  if(side==='w'){this.turns++;this.shots++;if(correct){this.hits++;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);}else this.streak=0;}
  this.updateScore();
  this.wait('animate',(side==='b'?'Datorn: ':correct?'Du: ':'Fel svar. Ett svagt drag spelas: ')+C.description(played)+'.',.85);
  if(entry)this.emit(correct?'hit':'miss',{entry,points:this.score-previousScore});
 }
 finish(result=C.outcome(this.position)){
  if(this.state!=='playing'||!result)return;
  this.won=result.winner==='w';this.draw=result.winner===null;this.resultScore=this.draw?.5:this.won?1:0;this.botScore=1-this.resultScore;this.updateScore();
  this.state=this.draw?'draw':this.won?'won':'lost';this.phase='end';this.reason=result.reason;this.search=null;this.targets=[];this.queue.clear();this.revision++;
  this.emit('end',{won:this.won,draw:this.draw,score:this.score,resultScore:this.resultScore,botScore:this.botScore,scoreParts:this.scoreParts,reason:this.reason,turns:this.turns,hits:this.hits,shots:this.shots,bestStreak:this.bestStreak});
 }
 update(dt){
  if(this.state!=='playing')return;this.clock+=dt;this.elapsed+=dt;
  if(this.phase==='search'){
   const until=performance.now()+5;let result;do{result=this.search.next();}while(!result.done&&performance.now()<until);
   if(result.done){this.search=null;if(this.side==='w')this.offer(result.value);else this.play(C.chooseBot(result.value,this.pace,this.random));}return;
  }
  if(this.phase==='answer'){
   if(!this.queue.length)return;const entry=this.queue.take();if(!entry)return;
   const matches=this.targets.filter(t=>SC.matches(entry.text,t.item,this.mode,this.lang,entry.source));
   if(matches.length>1){this.queue.clear();this.message='Svaret passar flera drag. Försök med ett annat svar.';this.revision++;return;}
   this.play(matches.length?matches[0].move:C.choosePoor(this.ranked,this.random),entry,!!matches.length);return;
  }
  this.queue.clear();this.delay-=dt;if(this.delay<=0)this.beginTurn();
 }
}
SC.ChessGame=ChessGame;
})(globalThis);
