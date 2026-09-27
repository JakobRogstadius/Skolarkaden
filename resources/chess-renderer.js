/* A white-at-bottom board; cards and coloured arrows preview, answers commit. */
(function(root){
'use strict';const SC=root.Starlight,C=SC.ChessEngine;
const element=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
const shapes={
 p:'<circle cx="50" cy="28" r="12"/><path d="M40 43h20l-4 17 10 12H34l10-12z"/>',
 r:'<path d="M28 19h11v10h7V19h9v10h7V19h11v24H63l-3 22 9 8H31l9-8-3-22h-9z"/><path d="M37 43h26"/>',
 n:'<path d="M31 73l4-21 22-13-13-4-11 11-12-9 13-16 8-11 6 8 15 4c18 15 13 34 10 51z"/><path d="M57 47L43 61"/><circle cx="44" cy="28" r="2" fill="currentColor"/>',
 b:'<path d="M50 12c0 0-20 19-20 31 0 10 10 14 13 15l-10 15h34L57 58c3-1 13-5 13-15 0-12-20-31-20-31z"/><path d="M52 26L41 43M38 58h24"/>',
 q:'<path d="M24 30l14 12 12-22 12 22 14-12-10 32H34zM36 63h28l7 11H29z"/><circle cx="22" cy="26" r="5"/><circle cx="50" cy="16" r="5"/><circle cx="78" cy="26" r="5"/>',
 k:'<path d="M50 9v22M42 17h16"/><path d="M33 37c-9 0-10 11-6 18l12 10-9 9h40l-9-9 12-10c4-7 3-18-6-18-8 0-9 6-17 6s-9-6-17-6zM37 65h26"/>'
};
function pieceSvg(piece){return '<svg viewBox="0 0 100 100" aria-hidden="true" class="ch-piece-art '+(piece.color==='w'?'ch-white':'ch-black')+'"><g stroke-linecap="round" stroke-linejoin="round" stroke-width="4">'+shapes[piece.type]+'<path d="M29 76h42l5 10H24z"/></g></svg>';}
const point=s=>({x:('abcdefgh'.indexOf(s[0])+.5)*100,y:(8-Number(s[1])+.5)*100});
class ChessRenderer{
 constructor(canvas,game){
  this.canvas=canvas;this.game=game;this.node=element('div','chess-scene');canvas.hidden=true;canvas.parentElement.append(this.node);
  this.node.innerHTML='<div class="ch-table"><div class="ch-players"><span><i class="ch-token white"></i> Du · vit</span><span>Datorn · svart <i class="ch-token"></i></span></div><div class="ch-board-wrap"><div class="ch-board" role="group" aria-label="Schackbräde med vit nederst"></div></div><p class="ch-caption">Schackmatt vinner. Ingen tidspress.</p></div><div class="ch-sidebar"><p class="ch-kicker">DITT NÄSTA DRAG</p><h2>Ta god tid på dig.</h2><p class="ch-status" role="status" aria-live="polite"></p><div class="ch-choices"></div><p class="ch-instruction">Svara på uppgiften vid det drag du vill göra. Fel svar ger ett svagt drag. Peka på ett alternativ för att se draget.</p><dl class="ch-scoring" aria-label="Poängfördelning"></dl></div>';
  this.board=this.node.querySelector('.ch-board');this.status=this.node.querySelector('.ch-status');this.choices=this.node.querySelector('.ch-choices');
  this.arrows=document.createElementNS('http://www.w3.org/2000/svg','svg');this.arrows.setAttribute('viewBox','0 0 800 800');this.arrows.setAttribute('class','ch-arrows');this.arrows.setAttribute('aria-hidden','true');this.node.querySelector('.ch-board-wrap').append(this.arrows);
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
  const g=this.game,hints=SC.pinyinHints(g),key=g.revision+':'+g.state+':'+g.targets.map(t=>hints.has(t)?1:0).join('');if(key===this.key)return;this.key=key;
  const format=SC.ChessScoring.resultText,ended=g.phase==='end';
  const scoring=this.node.querySelector('.ch-scoring');scoring.replaceChildren();
  for(const [label,value] of SC.ChessScoring.rows(g.scoreParts)){const part=element('div','ch-score-part');part.append(element('dt','',label),element('dd','',(value<0?'−':'+')+Math.abs(value).toLocaleString('sv-SE')));scoring.append(part);}
  this.status.textContent=g.state==='paused'?'Paus':ended?(g.draw?'Remi.':g.won?'Du vann!':'Datorn vann.')+' '+format(g.resultScore)+'–'+format(g.botScore)+' · '+g.reason:g.message;
  this.node.querySelector('.ch-kicker').textContent=g.phase==='answer'?'DRAG '+(g.turns+1):ended?'PARTIET ÄR KLART':'SCHACK';
  const pieces=g.position.board().flat(),check=g.position.isCheck();
  for(let i=0;i<64;i++){
   const cell=this.cells[i],piece=pieces[i],square=cell.dataset.square,targets=g.targets.filter(t=>t.move.to===square);
   cell.querySelector('.ch-piece').innerHTML=piece?pieceSvg(piece):'';
   cell.classList.toggle('ch-last',g.lastMove?.from===square||g.lastMove?.to===square);
   cell.classList.toggle('ch-check',!!piece&&piece.type==='k'&&piece.color===g.position.turn()&&check);
   cell.classList.toggle('ch-option',!!targets.length);cell.dataset.choice=targets[0]?.letter||'';cell.querySelector('.ch-marker').textContent=targets.map(t=>t.letter).join(' ');
   cell.setAttribute('aria-label',square+': '+(piece?(piece.color==='w'?'vit ':'svart ')+C.pieceNames[piece.type].toLowerCase():'tom')+(targets.length?', drag '+targets.map(t=>t.letter).join(', '):''));
  }
  if(g.lastMove&&this.animatedMove!==g.lastMove){
   this.animatedMove=g.lastMove;
   if(!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
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
   else{
    if(t.item.hint&&!t.item.pairId)text.append(element('span','ch-hint',hints.has(t)?t.item.hint:'\u00a0'));
    text.append(element('span','ch-question',t.item.label));
    if(t.item.pairId&&t.item.hint)text.append(element('span','ch-hint',hints.has(t)?t.item.hint:'\u00a0'));
    if(t.item.translation)text.append(element('span','ch-hint',hints.has(t)?t.item.translation:'\u00a0'));
   }
   card.append(text);for(const event of ['pointerenter','pointerdown','focus'])card.addEventListener(event,()=>this.preview(t));
   for(const event of ['pointerleave','blur'])card.addEventListener(event,()=>this.preview(null));this.choices.append(card);
  }
  if(!g.targets.length)this.choices.append(element('p','ch-wait',ended?g.reason:g.phase==='animate'?'Pjäsen flyttas…':'Förbereder nästa drag…'));
 }
 destroy(){cancelAnimationFrame(this.raf);this.node.remove();this.canvas.hidden=false;}
}
SC.ChessRenderer=ChessRenderer;
})(globalThis);
