/* Pure Reversi rules and cooperative, bounded alpha-beta search. */
(function(root){
'use strict';const SC=root.Starlight,BLACK=1,WHITE=-1;
const directions=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],corners=[0,7,56,63];
function initialBoard(){const b=new Int8Array(64);b[27]=b[36]=WHITE;b[28]=b[35]=BLACK;return b;}
function flips(board,index,side){
 if(index<0||index>=64||board[index])return [];
 const found=[],row=index>>3,col=index%8;
 for(const [dy,dx] of directions){let y=row+dy,x=col+dx;const ray=[];
  while(y>=0&&y<8&&x>=0&&x<8&&board[y*8+x]===-side){ray.push(y*8+x);y+=dy;x+=dx;}
  if(ray.length&&y>=0&&y<8&&x>=0&&x<8&&board[y*8+x]===side)found.push(...ray);
 }return found;
}
function legalMoves(board,side){const moves=[];for(let index=0;index<64;index++)if(!board[index]){const turned=flips(board,index,side);if(turned.length)moves.push({index,flips:turned});}return moves;}
function applyMove(board,move,side){const turned=flips(board,move.index,side);if(!turned.length)throw new Error('Illegal Reversi move');const next=board.slice();next[move.index]=side;for(const i of turned)next[i]=side;return next;}
function count(board){let black=0,white=0;for(const p of board){if(p===BLACK)black++;else if(p===WHITE)white++;}return {black,white,empty:64-black-white};}
function evaluate(board,side){
 const n=count(board);let value=(n.black-n.white)*(n.empty<16?5:1),frontier=0;
 for(const i of corners){value+=board[i]*100;if(!board[i]){const y=i>>3,x=i%8;for(const [dy,dx] of directions){const r=y+dy,c=x+dx;if(r>=0&&r<8&&c>=0&&c<8)value-=board[r*8+c]*(dy&&dx?45:25);}}}
 for(let i=0;i<64;i++)if(board[i]){const y=i>>3,x=i%8;if(directions.some(([dy,dx])=>y+dy>=0&&y+dy<8&&x+dx>=0&&x+dx<8&&!board[(y+dy)*8+x+dx]))frontier+=board[i];}
 value+=7*(legalMoves(board,BLACK).length-legalMoves(board,WHITE).length)-3*frontier;
 return value*side;
}
const profiles=Object.freeze({gentle:{depth:2,nodes:2200,temperature:45,window:150},steady:{depth:3,nodes:7500,temperature:18,window:70},brave:{depth:5,nodes:35000,temperature:5,window:20}});
const adviser=Object.freeze({depth:4,nodes:22000});
function* analyse(board,side,{depth=4,nodes=22000}={}){
 let visited=0;const exhausted=Symbol('budget'),moves=legalMoves(board,side);
 let best=moves.map(m=>({...m,value:evaluate(applyMove(board,m,side),side)}));
 function* search(b,s,d,alpha,beta){
  if(++visited>nodes)throw exhausted;if(visited%64===0)yield;
  const legal=legalMoves(b,s);
  if(!legal.length){if(!legalMoves(b,-s).length){const n=count(b);return (n.black-n.white)*s*1000;}return -(yield* search(b,-s,d,-beta,-alpha));}
  if(d<=0)return evaluate(b,s);
  legal.sort((a,b)=>Number(corners.includes(b.index))-Number(corners.includes(a.index)));
  let value=-Infinity;
  for(const m of legal){value=Math.max(value,-(yield* search(applyMove(b,m,s),-s,d-1,-beta,-alpha)));alpha=Math.max(alpha,value);if(alpha>=beta)break;}
  return value;
 }
 for(let d=1;d<=depth;d++){
  const ranked=[];
  try{for(const m of [...best].sort((a,b)=>b.value-a.value))ranked.push({...m,value:-(yield* search(applyMove(board,m,side),-side,d-1,-Infinity,Infinity))});}
  catch(error){if(error!==exhausted)throw error;break;}
  best=ranked;
 }return best.sort((a,b)=>b.value-a.value);
}
function shuffled(values,random=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function recommendations(ranked,random=Math.random){return shuffled(shuffled(ranked,random).sort((a,b)=>b.value-a.value).slice(0,3),random);}
function chooseBot(ranked,pace,random=Math.random){
 if(!ranked.length)return null;const p=profiles[pace]||profiles.gentle,best=Math.max(...ranked.map(m=>m.value)),pool=ranked.filter(m=>m.value>=best-p.window);
 const weights=pool.map(m=>Math.exp((m.value-best)/p.temperature));let draw=random()*weights.reduce((a,b)=>a+b,0);
 for(let i=0;i<pool.length;i++){draw-=weights[i];if(draw<0)return pool[i];}return pool.at(-1);
}
function choosePoor(ranked,random=Math.random){const sorted=[...ranked].sort((a,b)=>a.value-b.value),cutoff=sorted[Math.ceil(sorted.length/3)-1].value,pool=sorted.filter(m=>m.value<=cutoff);return pool[Math.floor(random()*pool.length)];}
SC.Reversi={BLACK,WHITE,initialBoard,flips,legalMoves,applyMove,count,evaluate,analyse,profiles,adviser,shuffled,recommendations,chooseBot,choosePoor,coordinate:i=>'ABCDEFGH'[i%8]+((i>>3)+1)};
})(globalThis);
