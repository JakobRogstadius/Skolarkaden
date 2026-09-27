/* A white-at-bottom board; cards and coloured arrows preview, answers commit. */
(function(root){
'use strict';const SC=root.Starlight,C=SC.ChessEngine;
const element=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
const shapes={
 p:'<circle cx="50" cy="28" r="12"/><path d="M40 43h20l-4 17 10 12H34l10-12z"/>',
 r:'<path d="M28 19h11v10h7V19h9v10h7V19h11v24H63l-3 22 9 8H31l9-8-3-22h-9z"/><path d="M37 43h26"/>',
 b:'<path d="M50 12c0 0-20 19-20 31 0 10 10 14 13 15l-10 15h34L57 58c3-1 13-5 13-15 0-12-20-31-20-31z"/><path d="M52 26L41 43M38 58h24"/>',
 q:'<path d="M24 30l14 12 12-22 12 22 14-12-10 32H34zM36 63h28l7 11H29z"/><circle cx="22" cy="26" r="5"/><circle cx="50" cy="16" r="5"/><circle cx="78" cy="26" r="5"/>',
 k:'<path d="M50 9v22M42 17h16"/><path d="M33 37c-9 0-10 11-6 18l12 10-9 9h40l-9-9 12-10c4-7 3-18-6-18-8 0-9 6-17 6s-9-6-17-6zM37 65h26"/>'
};
function pieceArt(type){return type==='n'?dinosaurBody+dinosaurFace:shapes[type]+'<path d="M29 76h42l5 10H24z"/>';}
function pieceSvg(piece,direction=1){return '<svg viewBox="0 0 100 100" aria-hidden="true" class="ch-piece-art '+(piece.color==='w'?'ch-white':'ch-black')+'"><g transform="'+(direction<0?'translate(100 0) scale(-1 1)':'')+'" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">'+pieceArt(piece.type)+'</g></svg>';}
const point=s=>({x:('abcdefgh'.indexOf(s[0])+.5)*100,y:(8-Number(s[1])+.5)*100});
const clamp=n=>Math.max(0,Math.min(1,n)),mix=(a,b,p)=>a+(b-a)*p;
// Board pieces and the capture share these parts, so the final pose needs no fade.
const dinosaurBody='<path d="M28 74Q18 62 12 48Q27 59 38 54L39 40H62V54L61 67 70 74Z"/><path d="M62 58l8 6 5-3M48 60q-9 1-8 9l-3 5h15" fill="none" stroke-width="3"/><path d="M29 76h42l5 10H24z"/><ellipse class="ch-dino-mouth" cx="74" cy="43" rx="16" ry="14" fill="#412b32" stroke="none" opacity="0"/>',
 dinosaurFace='<g class="ch-dino-head"><path d="M39 41Q36 34 38 23Q40 12 53 12H78Q88 12 88 24V33H62V41Z"/><path d="M67 34l4 6 4-6M78 34l4 6 4-6" fill="#fff5da" stroke="#534a3a" stroke-width="1.5"/><circle cx="52" cy="25" r="7" fill="#fff5da" stroke-width="2.5"/><circle cx="54" cy="25" r="2.8" fill="#29343c" stroke="none"/><circle cx="82" cy="25" r="1.7" fill="currentColor" stroke="none"/></g><g class="ch-dino-jaw"><path d="M62 41L86 47Q83 56 64 54L61 51Z"/><path d="M69 45l4-5 3 7M79 48l4-5 2 5" fill="#fff5da" stroke="#534a3a" stroke-width="1.5"/></g>';
const captureDirection=move=>{const from=point(move.from),to=point(move.to);return root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:to.x<100?-1:to.x>700?1:to.x>=from.x?1:-1;};
class ChessRenderer{
 constructor(canvas,game){
  this.canvas=canvas;this.game=game;this.node=element('div','chess-scene');canvas.hidden=true;canvas.parentElement.append(this.node);
  this.node.innerHTML='<div class="ch-table"><div class="ch-players"><span><i class="ch-token white"></i> Du · vit</span><span>Datorn · svart <i class="ch-token"></i></span></div><div class="ch-board-wrap"><div class="ch-board" role="group" aria-label="Schackbräde med vit nederst"></div></div><p class="ch-caption">Schackmatt vinner. Ingen tidspress.</p></div><div class="ch-sidebar"><p class="ch-kicker">DITT NÄSTA DRAG</p><h2>Ta god tid på dig.</h2><p class="ch-status" role="status" aria-live="polite"></p><div class="ch-choices"></div></div>';
  this.board=this.node.querySelector('.ch-board');this.status=this.node.querySelector('.ch-status');this.choices=this.node.querySelector('.ch-choices');
  this.arrows=document.createElementNS('http://www.w3.org/2000/svg','svg');this.arrows.setAttribute('viewBox','0 0 800 800');this.arrows.setAttribute('class','ch-arrows');this.arrows.setAttribute('aria-hidden','true');this.node.querySelector('.ch-board-wrap').append(this.arrows);
  this.captureLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');this.captureLayer.setAttribute('viewBox','0 0 800 800');this.captureLayer.setAttribute('class','ch-capture');this.captureLayer.setAttribute('aria-hidden','true');this.captureLayer.style.display='none';this.node.querySelector('.ch-board-wrap').append(this.captureLayer);
  this.cells=Array.from({length:64},(_,i)=>{
   const cell=element('div','ch-cell'+(((i>>3)+i%8)%2?' dark':''));cell.dataset.square=C.square(i);
   cell.append(element('span','ch-piece'),element('span','ch-marker'));
   if(i>=56)cell.append(element('span','ch-file','abcdefgh'[i%8]));if(i%8===0)cell.append(element('span','ch-rank',String(8-(i>>3))));
   this.board.append(cell);return cell;
  });
  this.last=0;const frame=now=>{const dt=this.last?Math.min(.05,(now-this.last)/1000):0;this.last=now;game.update(dt);this.draw();this.raf=requestAnimationFrame(frame);};
  this.raf=requestAnimationFrame(frame);this.draw();
 }
 resize(){}
 scoreEvent(){}
 trackFacings(){
  const g=this.game,m=g.lastMove;
  if(this.facingHistory!==g.history){this.facingHistory=g.history;this.facings=new Map();this.facingMove=null;}
  if(!m||this.facingMove===m)return;
  const previous=this.facings.get(m.from)||1;this.capturedFacing=this.facings.get(m.to)||1;
  this.facings.delete(m.from);this.facings.delete(m.to);
  if(m.piece==='n'||m.promotion==='n')this.facings.set(m.to,m.piece==='n'&&m.captured?captureDirection(m):previous);
  this.facingMove=m;
 }
 clearCapture(){
  if(this.capturePiece)this.capturePiece.style.visibility='';
  this.capturePiece=null;this.captureMove=null;this.captureLayer.style.display='none';this.captureLayer.replaceChildren();
 }
 drawCapture(){
  const g=this.game,m=g.lastMove,T=SC.chessCaptureTiming,age=m?g.clock-m.at:0;
  if(!m||m.piece!=='n'||!m.captured||g.phase!=='animate'||!['playing','paused'].includes(g.state)||age>=T.end){if(this.captureMove)this.clearCapture();return;}
  if(this.captureMove!==m){
   this.clearCapture();this.captureMove=m;this.capturePiece=this.cells.find(c=>c.dataset.square===m.to).querySelector('.ch-piece');
   const color=m.color==='w'?'ch-white':'ch-black',prey=m.color==='w'?'ch-black':'ch-white';
   this.captureLayer.innerHTML='<g stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><g class="ch-capture-body '+color+'">'+dinosaurBody+'</g><g class="ch-capture-prey '+prey+'"><g transform="'+(m.captured==='n'&&this.capturedFacing<0?'translate(100 0) scale(-1 1)':'')+'">'+pieceArt(m.captured)+'</g></g><g class="ch-capture-face '+color+'">'+dinosaurFace+'</g></g>';
   for(const name of ['body','prey','face'])this['capture'+name[0].toUpperCase()+name.slice(1)]=this.captureLayer.querySelector('.ch-capture-'+name);
   this.captureHead=this.captureFace.querySelector('.ch-dino-head');this.captureJaw=this.captureFace.querySelector('.ch-dino-jaw');this.captureMouth=this.captureBody.querySelector('.ch-dino-mouth');
   this.captureReduced=!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   this.captureLayer.style.display='';
  }
  const from=point(m.from),to=point(m.to),approach=clamp(age/T.bite),chew=clamp((age-T.bite)/(T.swallow-T.bite)),progress=clamp((age-T.swallow)/(T.rest-T.swallow)),settle=progress*progress*(3-2*progress),reduced=this.captureReduced;
  // Face inwards at either edge, keeping the tail and victim inside the board.
  const direction=this.facings.get(m.to)||1,ease=1-(1-approach)**3,
   size=reduced?.94:mix(mix(.94,1.15,ease),.94,settle),
   x=reduced?to.x:mix(mix(from.x,to.x-direction*32,ease),to.x,settle),
   y=reduced?to.y:mix(mix(from.y,Math.min(752,to.y+13),ease)-Math.sin(approach*Math.PI)*20,to.y,settle),
   transform='translate('+x+' '+y+') scale('+(direction*size)+' '+size+') translate(-50 -50)',
   chewing=age>=T.bite&&age<T.swallow,jaw=reduced?0:chewing?12+Math.sin((age-T.bite)*Math.PI*2/.30)*10:(age<T.bite?18*approach:12*(1-settle));
  for(const node of [this.captureBody,this.captureFace])node.setAttribute('transform',transform);
  this.captureHead.setAttribute('transform','translate(0 '+(-jaw*.12)+')');this.captureJaw.setAttribute('transform','rotate('+jaw+' 62 43)');
  this.captureMouth.setAttribute('opacity',reduced?0:approach*(1-settle));
  let px=to.x,py=to.y,preyScale=.94,rotation=0,opacity=1;
  if(reduced)opacity=1-clamp(chew*2);
  else if(age<T.bite){px+=Math.sin(approach*Math.PI*6)*4;py=Math.max(47,py-Math.sin(approach*Math.PI)*20);rotation=Math.sin(approach*Math.PI*4)*9;}
  else{
   const swallow=clamp(chew/.8),wiggle=Math.sin((age-T.bite)*42)*(1-swallow);
   px=x+direction*(mix(78,51,swallow)-50)*size;py=y+(mix(39,47,swallow)-50)*size+wiggle*2;
   preyScale=mix(.94,.12,swallow);rotation=direction*(swallow*75+wiggle*8);opacity=1-clamp((swallow-.65)/.35);
  }
  this.capturePrey.setAttribute('transform','translate('+px+' '+py+') rotate('+rotation+') scale('+preyScale+') translate(-50 -50)');this.capturePrey.setAttribute('opacity',opacity);
  this.capturePiece.style.visibility='hidden';
 }
 preview(target){
  const moves=target?[target]:this.game.targets;
  for(const cell of this.cells){cell.classList.toggle('ch-preview-from',target?.move.from===cell.dataset.square);cell.classList.toggle('ch-preview-to',target?.move.to===cell.dataset.square);}
  const colors={A:'#eab968',B:'#56d8c7',C:'#b0a0ff'};
  this.arrows.innerHTML=moves.map(t=>{
   const from=point(t.move.from),to=point(t.move.to),dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
   const end={x:to.x-ux*20,y:to.y-uy*20},base={x:end.x-ux*30,y:end.y-uy*30};
   return '<g opacity="'+(target?.9:.65)+'" stroke="'+colors[t.letter]+'" fill="'+colors[t.letter]+'"><path d="M'+(from.x+ux*23)+' '+(from.y+uy*23)+' L'+base.x+' '+base.y+'" stroke-width="13" stroke-linecap="round"/><path d="M'+end.x+' '+end.y+' L'+(base.x-uy*15)+' '+(base.y+ux*15)+' L'+(base.x+uy*15)+' '+(base.y-ux*15)+' Z" stroke-width="3"/></g>';
  }).join('');
 }
 draw(){
  const g=this.game,key=g.revision+':'+g.state;if(key===this.key){this.drawCapture();return;}this.key=key;
  this.trackFacings();
  const format=SC.ChessScoring.resultText,ended=g.phase==='end';
  this.status.textContent=g.state==='paused'?'Paus':ended?(g.draw?'Remi.':g.won?'Du vann!':'Datorn vann.')+' '+format(g.resultScore)+'–'+format(g.botScore)+' · '+g.reason:g.message;
  this.node.querySelector('.ch-kicker').textContent=g.phase==='answer'?'DRAG '+(g.turns+1):ended?'PARTIET ÄR KLART':'SCHACK';
  const pieces=g.position.board().flat(),check=g.position.isCheck();
  for(let i=0;i<64;i++){
   const cell=this.cells[i],piece=pieces[i],square=cell.dataset.square,targets=g.targets.filter(t=>t.move.to===square);
   cell.querySelector('.ch-piece').innerHTML=piece?pieceSvg(piece,this.facings.get(square)||1):'';
   cell.classList.toggle('ch-last',g.lastMove?.from===square||g.lastMove?.to===square);
   cell.classList.toggle('ch-check',!!piece&&piece.type==='k'&&piece.color===g.position.turn()&&check);
   cell.classList.toggle('ch-option',!!targets.length);cell.dataset.choice=targets[0]?.letter||'';cell.querySelector('.ch-marker').textContent=targets.map(t=>t.letter).join(' ');
   cell.setAttribute('aria-label',square+': '+(piece?(piece.color==='w'?'vit ':'svart ')+C.pieceNames[piece.type].toLowerCase():'tom')+(targets.length?', drag '+targets.map(t=>t.letter).join(', '):''));
  }
  if(g.lastMove&&this.animatedMove!==g.lastMove){
   this.animatedMove=g.lastMove;
   if(!(g.lastMove.piece==='n'&&g.lastMove.captured)&&!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
    const animate=(from,to)=>{const node=this.cells.find(c=>c.dataset.square===to)?.querySelector('.ch-piece');if(!node?.animate)return;const a=point(from),b=point(to),size=this.board.getBoundingClientRect().width/800;node.animate([{transform:'translate('+(a.x-b.x)*size+'px,'+(a.y-b.y)*size+'px)'},{transform:'none'}],{duration:340,easing:'ease-out'});};
    animate(g.lastMove.from,g.lastMove.to);
    if(g.lastMove.flags.includes('k'))animate('h'+g.lastMove.from[1],'f'+g.lastMove.from[1]);
    if(g.lastMove.flags.includes('q'))animate('a'+g.lastMove.from[1],'d'+g.lastMove.from[1]);
   }
  }
  this.preview(null);this.choices.replaceChildren();
  for(const t of g.targets){
   const card=element('button','ch-choice');card.type='button';card.dataset.choice=t.letter;card.disabled=g.state!=='playing';
   card.setAttribute('aria-label','Förhandsvisa drag '+t.letter+', '+C.description(t.move)+': '+t.item.label);
   card.append(element('span','ch-choice-letter',t.letter));const text=element('span','ch-choice-text');text.append(element('span','ch-coordinate',C.description(t.move)));
   if(t.item.diagram){const diagram=element('canvas','ch-diagram');diagram.width=224;diagram.height=160;diagram.setAttribute('aria-label',t.item.label);const c=diagram.getContext('2d');c.scale(2,2);SC.drawMathDiagram(c,t.item.diagram,{x:0,y:0,w:112,h:80});text.append(diagram);}
   // Exercise prompts stay unanswered, regardless of how long the turn lasts.
   else text.append(element('span','ch-question',t.item.label));
   card.append(text);for(const event of ['pointerenter','pointerdown','focus'])card.addEventListener(event,()=>this.preview(t));
   for(const event of ['pointerleave','blur'])card.addEventListener(event,()=>this.preview(null));this.choices.append(card);
  }
  if(!g.targets.length)this.choices.append(element('p','ch-wait',ended?g.reason:g.phase==='animate'?'Pjäsen flyttas…':'Förbereder nästa drag…'));
  this.drawCapture();
 }
 destroy(){cancelAnimationFrame(this.raf);this.clearCapture();this.node.remove();this.canvas.hidden=false;}
}
SC.ChessRenderer=ChessRenderer;
})(globalThis);
