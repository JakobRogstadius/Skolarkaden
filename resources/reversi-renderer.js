/* DOM board: wrapping exercise text and CSS disc-flip animations. */
(function(root){
'use strict';const SC=root.Starlight,R=SC.Reversi;
const element=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
class ReversiRenderer{
 constructor(canvas,game){
  this.canvas=canvas;this.game=game;this.node=element('div','reversi-scene');canvas.hidden=true;canvas.parentElement.append(this.node);
  this.node.innerHTML='<div class="rv-table"><div class="rv-players"><span><i class="rv-token"></i> Du · svart <b class="rv-black-count">2</b></span><span><i class="rv-token white"></i> Datorn <b class="rv-white-count">2</b></span></div><div class="rv-board" role="group" aria-label="Reversibräde, åtta gånger åtta rutor"></div><p class="rv-caption">Flest brickor när ingen kan spela vinner.</p></div><div class="rv-sidebar"><p class="rv-kicker">DITT NÄSTA DRAG</p><h2>Ta god tid på dig.</h2><p class="rv-status" role="status" aria-live="polite"></p><div class="rv-choices"></div><p class="rv-instruction">Svara på uppgiften vid det drag du vill göra. Fel svar ger ett svagt drag.</p></div>';
  this.board=this.node.querySelector('.rv-board');this.status=this.node.querySelector('.rv-status');this.choices=this.node.querySelector('.rv-choices');
  this.cells=Array.from({length:64},(_,i)=>{
   const cell=element('div','rv-cell');cell.dataset.index=i;
   const disc=element('span','rv-disc');disc.innerHTML='<span class="rv-face rv-black"></span><span class="rv-face rv-white"></span>';cell.append(disc,element('span','rv-marker'));
   if(i<8)cell.append(element('span','rv-file','ABCDEFGH'[i]));if(i%8===0)cell.append(element('span','rv-rank',String((i>>3)+1)));
   this.board.append(cell);return cell;
  });
  this.last=0;const frame=now=>{const dt=this.last?Math.min(.05,(now-this.last)/1000):0;this.last=now;game.update(dt);this.draw();this.raf=requestAnimationFrame(frame);};
  this.raf=requestAnimationFrame(frame);this.draw();
 }
 resize(){} // CSS sizes the board without changing questions or game state.
 scoreEvent(){} // Score is the live disc count.
 preview(target){for(let i=0;i<64;i++){this.cells[i].classList.toggle('rv-preview',!!target?.move.flips.includes(i));this.cells[i].classList.toggle('rv-preview-place',target?.move.index===i);}}
 draw(){
  const g=this.game,hints=SC.pinyinHints(g),key=g.revision+':'+g.state+':'+g.targets.map(t=>hints.has(t)?1:0).join('');if(key===this.key)return;this.key=key;
  this.node.querySelector('.rv-black-count').textContent=g.score;this.node.querySelector('.rv-white-count').textContent=g.botScore;
  this.status.textContent=g.state==='paused'?'Paus':g.phase==='end'?(g.draw?'Oavgjort.':g.won?'Du vann!':'Datorn vann.')+' '+g.score+'–'+g.botScore:g.message;
  this.node.querySelector('.rv-kicker').textContent=g.phase==='answer'?'DRAG '+(g.turns+1):g.phase==='end'?'PARTIET ÄR KLART':'REVERSI';
  for(let i=0;i<64;i++){
   const cell=this.cells[i],piece=g.board[i],target=g.targets.find(t=>t.move.index===i);
   cell.classList.toggle('occupied',!!piece);cell.classList.toggle('is-white',piece===R.WHITE);cell.classList.toggle('rv-last',g.lastMove?.index===i);
   cell.classList.toggle('rv-option',!!target);cell.dataset.choice=target?.letter||'';cell.querySelector('.rv-marker').textContent=target?.letter||'';
   cell.setAttribute('aria-label',R.coordinate(i)+': '+(piece===1?'svart':piece===-1?'vit':target?'drag '+target.letter:'tom'));
   const distance=g.lastMove?Math.max(Math.abs((i>>3)-(g.lastMove.index>>3)),Math.abs(i%8-g.lastMove.index%8)):0;
   cell.querySelector('.rv-disc').style.transitionDelay=g.lastMove?.flips.includes(i)?distance*.045+'s':'0s';
   cell.onpointerenter=()=>this.preview(target);cell.onpointerleave=()=>this.preview(null);cell.onpointerdown=()=>this.preview(target);
  }
  this.preview(null);this.choices.replaceChildren();
  for(const t of g.targets){
   const card=element('button','rv-choice');card.type='button';card.dataset.choice=t.letter;card.disabled=g.state!=='playing';
   card.setAttribute('aria-label','Förhandsvisa drag '+t.letter+', '+R.coordinate(t.move.index)+': '+t.item.label);
   card.append(element('span','rv-choice-letter',t.letter));const text=element('span','rv-choice-text');text.append(element('span','rv-coordinate',R.coordinate(t.move.index)));
   if(t.item.diagram){const diagram=element('canvas','rv-diagram');diagram.width=224;diagram.height=160;diagram.setAttribute('aria-label',t.item.label);const c=diagram.getContext('2d');c.scale(2,2);SC.drawMathDiagram(c,t.item.diagram,{x:0,y:0,w:112,h:80});text.append(diagram);}
   else{
    if(t.item.hint&&!t.item.pairId){const hint=element('span','rv-hint',hints.has(t)?t.item.hint:'\u00a0');hint.lang=SC.isChinese(g.mode)?'zh-Latn':'';text.append(hint);}
    text.append(element('span','rv-question',t.item.label));
    if(t.item.pairId&&t.item.hint)text.append(element('span','rv-hint',hints.has(t)?t.item.hint:'\u00a0'));
    if(t.item.translation)text.append(element('span','rv-hint',hints.has(t)?t.item.translation:'\u00a0'));
   }
   card.append(text);card.addEventListener('pointerenter',()=>this.preview(t));card.addEventListener('pointerleave',()=>this.preview(null));card.addEventListener('pointerdown',()=>this.preview(t));card.addEventListener('focus',()=>this.preview(t));card.addEventListener('blur',()=>this.preview(null));this.choices.append(card);
  }
  if(!g.targets.length)this.choices.append(element('p','rv-wait',g.phase==='end'?'Dina brickor: '+g.score+' · Datorns brickor: '+g.botScore:g.phase==='animate'?'Brickorna vänds…':'●  ○  ●'));
 }
 destroy(){cancelAnimationFrame(this.raf);this.node.remove();this.canvas.hidden=false;}
}
SC.ReversiRenderer=ReversiRenderer;
})(globalThis);
