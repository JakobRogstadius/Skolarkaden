/* Chess adviser and opponent. Rules are supplied by the pinned chess.js 1.4.0. */
(function(root){
'use strict';
const SC=root.Starlight,{Chess}=SC.ChessRules;
const values={p:100,n:320,b:335,r:500,q:900,k:0},MATE=100000;
const profiles=Object.freeze({
 gentle:{depth:2,nodes:2500,temperature:100,window:300},
 steady:{depth:3,nodes:9000,temperature:35,window:100},
 brave:{depth:4,nodes:28000,temperature:10,window:25}
});
const adviser=Object.freeze({depth:4,nodes:24000});
const key=move=>move.from+move.to+(move.promotion||'');
const square=i=>'abcdefgh'[i%8]+(8-(i>>3));
const pieceNames={p:'Bonde',n:'Springare',b:'Löpare',r:'Torn',q:'Dam',k:'Kung'};
function description(move){
 if(move.flags?.includes('k'))return 'Kort rockad · '+move.from+'–'+move.to;
 if(move.flags?.includes('q'))return 'Lång rockad · '+move.from+'–'+move.to;
 return pieceNames[move.piece]+' '+move.from+(move.captured?' × ':' → ')+move.to+(move.promotion?' · '+pieceNames[move.promotion].toLowerCase():'')+(move.flags?.includes('e')?' · en passant':'');
}
function outcome(position){
 // Checkmate takes precedence over a draw counter on the mating move.
 if(position.isCheckmate())return {winner:position.turn()==='w'?'b':'w',reason:'Schackmatt'};
 if(position.isStalemate())return {winner:null,reason:'Patt'};
 if(position.isInsufficientMaterial())return {winner:null,reason:'Otillräckligt material för matt'};
 // Both sides automatically claim a draw at the first opportunity.
 if(position.isThreefoldRepetition())return {winner:null,reason:'Trefaldig ställningsupprepning'};
 if(position.isDrawByFiftyMoves())return {winner:null,reason:'Femtio drag utan bondedrag eller slag'};
 return null;
}
function evaluate(position){
 const board=position.board();let total=0,material=0;
 for(const row of board)for(const p of row)if(p&&p.type!=='p')material+=values[p.type];
 const endgame=material<2600;
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  const p=board[y][x];if(!p)continue;
  const advance=p.color==='w'?6-y:y-1,center=7-Math.abs(x-3.5)-Math.abs(y-3.5);
  let bonus=0;
  if(p.type==='p')bonus=advance*(endgame?18:9)+center*3;
  if(p.type==='n')bonus=center*12;
  if(p.type==='b')bonus=center*7;
  if(p.type==='r')bonus=advance*2;
  if(p.type==='q')bonus=center*3;
  if(p.type==='k')bonus=endgame?center*12:-center*9+(advance===-1&&(x===6||x===2)?35:0);
  total+=(values[p.type]+bonus)*(p.color==='w'?1:-1);
 }
 return total*(position.turn()==='w'?1:-1);
}
/* The only adapter to chess.js internals. Search skips SAN/FEN generation at
   every node. Gameplay always uses public, validated move(). Keep the vendor
   pinned; perft, public/private parity and repetition tests cover this adapter. */
function searchPosition(position){
 const rules=new Chess(position.fen());
 rules._positionCount=new Map(position._positionCount);
 return {
  rules,
  moves:()=>rules._moves(),
  play(move){rules._makeMove(move);rules._incPositionCount();},
  undo(){const hash=rules._hash;rules._undoMove();rules._decPositionCount(hash);},
  publicMove:move=>({from:'abcdefgh'[move.from&7]+(8-(move.from>>4)),to:'abcdefgh'[move.to&7]+(8-(move.to>>4)),...(move.promotion?{promotion:move.promotion}:{})})
 };
}
const priority=m=>(m.captured?10*values[m.captured]-values[m.piece]:0)+(m.promotion?values[m.promotion]:0);
function* analyse(position,{depth=4,nodes=24000}={}){
 const a=searchPosition(position),p=a.rules,exhausted=Symbol('budget');let visited=0;
 const legal=a.moves(),pretty=new Map(position.moves({verbose:true}).map(m=>[key(m),m]));
 let best=legal.map(move=>{
  a.play(move);const end=outcome(p),value=end?(end.winner?MATE-1:0):-evaluate(p);a.undo();
  return {...pretty.get(key(a.publicMove(move))),internal:move,value};
 });
 function* search(d,alpha,beta,ply,qleft=4){
  if(++visited>nodes)throw exhausted;if(visited%32===0)yield;
  const moves=a.moves(),check=p.isCheck();
  if(!moves.length)return check?-MATE+ply:0;
  if(p.isInsufficientMaterial()||p.isThreefoldRepetition()||p.isDrawByFiftyMoves())return 0;
  let candidates=moves,value=-Infinity;
  if(d<=0){
   if(qleft<=0)return evaluate(p);
   if(!check){value=evaluate(p);if(value>=beta)return value;alpha=Math.max(alpha,value);candidates=moves.filter(m=>m.captured||m.promotion);}
  }
  candidates.sort((x,y)=>priority(y)-priority(x));
  for(const m of candidates){
   a.play(m);let score;
   try{score=-(yield* search(d-1,-beta,-alpha,ply+1,d<=0?qleft-1:qleft));}finally{a.undo();}
   value=Math.max(value,score);alpha=Math.max(alpha,value);if(alpha>=beta)break;
  }
  return value;
 }
 for(let d=1;d<=depth;d++){
  const ranked=[];
  try{
   // Full windows at the root make all scores comparable, including poor moves.
   for(const m of [...best].sort((x,y)=>y.value-x.value)){
    a.play(m.internal);let value;
    try{value=-(yield* search(d-1,-Infinity,Infinity,1));}finally{a.undo();}
    ranked.push({...m,value});yield;
   }
  }catch(error){if(error!==exhausted)throw error;break;}
  best=ranked;
 }
 return best.map(({internal,...move})=>move).sort((x,y)=>y.value-x.value);
}
const shuffled=(items,random=Math.random)=>SC.Reversi.shuffled(items,random);
function recommendations(ranked,random=Math.random){return shuffled(shuffled(ranked,random).sort((a,b)=>b.value-a.value).slice(0,3),random);}
function chooseBot(ranked,pace,random=Math.random){
 if(!ranked.length)return null;
 const profile=profiles[pace]||profiles.gentle,best=Math.max(...ranked.map(m=>m.value)),pool=ranked.filter(m=>m.value>=best-profile.window);
 let draw=random()*pool.reduce((sum,m)=>sum+Math.exp((m.value-best)/profile.temperature),0);
 for(const m of pool){draw-=Math.exp((m.value-best)/profile.temperature);if(draw<0)return m;}return pool.at(-1);
}
function choosePoor(ranked,random=Math.random){
 if(!ranked.length)return null;
 const sorted=[...ranked].sort((a,b)=>a.value-b.value),cutoff=sorted[Math.ceil(sorted.length/3)-1].value,pool=sorted.filter(m=>m.value<=cutoff);
 return pool[Math.floor(random()*pool.length)];
}
SC.ChessEngine={Chess,profiles,adviser,key,square,pieceNames,description,outcome,evaluate,searchPosition,analyse,recommendations,chooseBot,choosePoor};
})(globalThis);
