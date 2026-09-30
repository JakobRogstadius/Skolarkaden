/* A fixed-resolution paper survives resizing/fullscreen; DOM controls stay large. */
(function(root){
'use strict';const SC=root.Starlight,API='https://skolarkaden-api.jakob-rogstadius.workers.dev';
const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function toolArt(tool,color,paint){
 const level=Math.max(0,Math.min(1,paint));
 if(tool==='bucket')return '<svg viewBox="0 0 48 58" aria-hidden="true"><path d="M10 23V15a14 14 0 0 1 28 0v8" fill="none" stroke="#655a48" stroke-width="3"/><path d="M5 20h38l-5 34H10z" fill="#dedbcf" stroke="#443f36" stroke-width="2"/><path d="M'+(10-5*level)+' '+(53-31*level)+'h'+(28+10*level)+'L37 53H11z" fill="'+color+'"/><path d="M5 20h38" stroke="#fff" stroke-width="3"/><path d="M1 53l4-6 4 6-4 4z" fill="'+color+'"/></svg>';
 const wide=tool==='large',left=wide?8:16,right=48-left;
 return '<svg viewBox="0 0 48 58" aria-hidden="true"><path d="M20 30L19 6Q24-2 29 6l-1 24" fill="#c99b62" stroke="#594634" stroke-width="2"/><path d="M'+left+' 35h'+(right-left)+'v17q-12 9-'+(right-left)+' 0z" fill="#e1d3aa" stroke="#65513e" stroke-width="2"/><path d="M'+(left+1)+' '+(54-19*level)+'h'+(right-left-2)+'V52q-'+(right-left)/2+' 8-'+(right-left-2)+' 0z" fill="'+color+'" opacity="'+(level?1:0)+'"/><path d="M'+left+' 27h'+(right-left)+'v11H'+left+'z" fill="#9baeb0" stroke="#526569" stroke-width="2"/><path d="M'+(left+3)+' 30h'+(right-left-6)+'" stroke="#e9f0e8" stroke-width="2"/></svg>';
}
async function request(method,body){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(API+'/artworks',{method,credentials:'omit',signal:controller.signal,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error==='name_not_allowed'?'Välj ett annat namn.':response.status===413?'Bilden är för stor för att sparas. Ångra några penseldrag och försök igen.':response.status===429?'Vänta en minut och försök spara igen.':response.status===404?'Galleriet är inte aktiverat på servern ännu.':'Galleriet kunde inte nås. Försök igen.');error.status=response.status;throw error;}return data;
 }catch(error){if(error.name==='AbortError')throw new Error('Sparandet tog för lång tid. Försök igen.');throw error;}finally{clearTimeout(timer);}
}
class StudioRenderer{
 constructor(canvas,game){
  this.canvas=canvas;this.game=game;this.destroyed=false;this.undoHistory=[];this.dirty=false;this.play=document.getElementById('play');canvas.hidden=true;
  this.node=el('div','studio-scene');canvas.parentElement.append(this.node);
  this.node.innerHTML='<div class="studio-toolbar"><div class="studio-colors" role="group" aria-label="Färger"></div><div class="studio-tools" role="group" aria-label="Verktyg"></div><div class="studio-actions"><button type="button" class="studio-undo">↶ Ångra</button><button type="button" class="studio-fullscreen">Helskärm</button><button type="button" class="studio-finish primary">Färdig</button></div></div><div class="studio-work"><div class="studio-paper-wrap"><canvas class="studio-paper" width="960" height="640" aria-label="Rityta. Rita med musen eller fingret."></canvas><div class="studio-cursor" hidden></div></div><aside class="studio-gallery" aria-label="De sex senaste tavlorna"><h2>Vårt galleri</h2><div class="studio-thumbnails"></div><p class="studio-gallery-status" role="status"></p><button type="button" class="studio-refresh">Uppdatera</button></aside></div><div class="studio-question-panel"><div class="studio-paint-tool" role="img"></div><div class="studio-feedback"><p class="studio-status" role="status"></p><div class="studio-question"></div><p class="studio-hint"></p></div><button type="button" class="studio-cancel" hidden>Fortsätt måla</button></div>';
  const q=s=>this.node.querySelector(s);this.paper=q('.studio-paper');this.ctx=this.paper.getContext('2d',{willReadFrequently:true});this.cursor=q('.studio-cursor');this.clearPaper();
  this.colorButtons=SC.studioColors.map(([name,color],i)=>{const b=el('button','studio-color');b.type='button';b.title=name;b.setAttribute('aria-label',name);b.innerHTML='<span style="background:'+color+'"></span><small>'+name+'</small>';b.onclick=()=>this.choose('color',i);q('.studio-colors').append(b);return b;});
  this.toolButtons=SC.studioTools.map(t=>{const b=el('button','studio-tool');b.type='button';b.innerHTML=toolArt(t.id,'#637567',1);b.append(el('small','',t.name));b.onclick=()=>this.choose('tool',t.id);q('.studio-tools').append(b);return b;});
  q('.studio-cancel').onclick=()=>game.cancelQuestion();q('.studio-undo').onclick=()=>this.undo();q('.studio-finish').onclick=()=>this.finish();q('.studio-refresh').onclick=()=>this.loadGallery();
  this.fullscreenButton=q('.studio-fullscreen');this.fullscreenButton.onclick=()=>this.fullscreen();this.onFullscreen=()=>{this.fullscreenButton.textContent=document.fullscreenElement?'Lämna helskärm':'Helskärm';};document.addEventListener('fullscreenchange',this.onFullscreen);
  if(!this.play.requestFullscreen)this.fullscreenButton.hidden=true;
  this.paper.addEventListener('pointerdown',e=>this.down(e));this.paper.addEventListener('pointermove',e=>this.move(e));
  for(const type of ['pointerup','pointercancel','lostpointercapture'])this.paper.addEventListener(type,()=>this.endStroke());
  this.paper.addEventListener('pointerleave',()=>{this.cursor.hidden=true;this.lastPoint=null;});this.paper.addEventListener('contextmenu',e=>e.preventDefault());
  this.onBeforeUnload=e=>{if(this.dirty){e.preventDefault();e.returnValue='';}};root.addEventListener('beforeunload',this.onBeforeUnload);
  this.last=0;const frame=now=>{const dt=this.last?Math.min(.05,(now-this.last)/1000):0;this.last=now;game.update(dt);this.draw();this.raf=requestAnimationFrame(frame);};this.raf=requestAnimationFrame(frame);this.draw();this.loadGallery();
 }
 resize(){}scoreEvent(){}
 choose(type,value){this.endStroke();this.game.choose(type,value);this.draw();}
 clearPaper(){this.ctx.fillStyle='#ffffff';this.ctx.fillRect(0,0,960,640);this.dirty=false;this.undoHistory=[];this.savePayload=null;}
 snapshot(){return {image:this.ctx.getImageData(0,0,960,640),dirty:this.dirty};}
 remember(snapshot){this.undoHistory.push(snapshot);if(this.undoHistory.length>8)this.undoHistory.shift();this.dirty=true;this.savePayload=null;}
 undo(){if(this.game.state!=='playing'||this.game.pending||!this.undoHistory.length)return;this.endStroke();const previous=this.undoHistory.pop();this.ctx.putImageData(previous.image,0,0);this.dirty=previous.dirty;this.savePayload=null;this.key=null;}
 point(e){const r=this.paper.getBoundingClientRect();return {x:(e.clientX-r.left)*960/r.width,y:(e.clientY-r.top)*640/r.height,cssX:e.clientX-r.left,cssY:e.clientY-r.top};}
 positionCursor(e){const p=this.point(e);this.cursor.style.left=p.cssX+'px';this.cursor.style.top=p.cssY+'px';this.cursor.hidden=e.pointerType==='touch'||this.game.state!=='playing'||!!this.dialog?.open;return p;}
 down(e){
  const g=this.game;if(e.button!==0||!e.isPrimary||g.state!=='playing'||g.pending||this.dialog?.open||this.pointerId!==undefined)return;
  e.preventDefault();const p=this.positionCursor(e);if(g.paint<=0){g.choose('tool',g.tool);return;}
  const snapshot=this.snapshot();if(g.tool==='bucket'){
   const image=this.ctx.getImageData(0,0,960,640);if(SC.studioFill(image,p.x,p.y,SC.studioColors[g.color][1])){this.remember(snapshot);this.ctx.putImageData(image,0,0);g.consume(.2);}return;
  }
  this.remember(snapshot);this.pointerId=e.pointerId;this.paper.setPointerCapture(e.pointerId);this.lastPoint=p;this.strokeLength=0;this.segment(p,p);
 }
 segment(a,b){const g=this.game,c=this.ctx,size=SC.studioTools.find(t=>t.id===g.tool).size;c.fillStyle=c.strokeStyle=SC.studioColors[g.color][1];c.lineWidth=size;c.lineCap=c.lineJoin='round';
  if(a.x===b.x&&a.y===b.y){c.beginPath();c.arc(b.x,b.y,size/2,0,Math.PI*2);c.fill();}else{c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
  const amount=Math.max(2,Math.hypot(a.x-b.x,a.y-b.y));this.strokeLength+=amount;g.consume(amount/9000);
 }
 move(e){const p=this.positionCursor(e);if(e.pointerId!==this.pointerId)return;if(this.game.state!=='playing'||this.game.pending){this.endStroke();return;}
  if(p.x<0||p.y<0||p.x>960||p.y>640){this.lastPoint=null;this.cursor.hidden=true;return;}
  // Finish the current stroke after paint runs out, up to one extra canvas width.
  if(this.game.paint<=0&&this.emptyAt===undefined)this.emptyAt=this.strokeLength;
  if(this.emptyAt!==undefined&&this.strokeLength-this.emptyAt>960){this.endStroke();return;}
  if(this.lastPoint)this.segment(this.lastPoint,p);else this.segment(p,p);this.lastPoint=p;
 }
 endStroke(){if(this.pointerId!==undefined&&this.paper.hasPointerCapture(this.pointerId))this.paper.releasePointerCapture(this.pointerId);this.pointerId=undefined;this.lastPoint=null;this.emptyAt=undefined;}
 draw(){
  const g=this.game;if(g.state!=='playing'){this.endStroke();this.cursor.hidden=true;}
  const hints=SC.pinyinHints(g),key=g.revision+':'+g.state+':'+this.dirty+':'+this.undoHistory.length+':'+hints.size;if(key===this.key)return;this.key=key;
  const q=s=>this.node.querySelector(s),color=SC.studioColors[g.color][1];
  this.colorButtons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(g.color===i));b.classList.toggle('pending',g.pending?.type==='color'&&g.pending.value===i);});
  this.toolButtons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(g.tool===SC.studioTools[i].id));b.classList.toggle('pending',g.pending?.value===SC.studioTools[i].id);});
  this.cursor.style.transform=g.tool==='bucket'?'translate(-5px,-48px)':'translate(-22px,-48px)';this.cursor.innerHTML=toolArt(g.tool,color,g.paint);q('.studio-paint-tool').innerHTML=toolArt(g.tool,color,g.paint);q('.studio-paint-tool').setAttribute('aria-label',Math.round(g.paint*100)+' procent färg kvar');
  q('.studio-status').textContent=g.message;q('.studio-undo').disabled=!this.undoHistory.length||!!g.pending;q('.studio-finish').disabled=!this.dirty;q('.studio-cancel').hidden=!g.pending;
  const target=g.targets[0];this.play.style.setProperty('--studio-question-extra',target?.item.diagram?'78px':'0px');const question=q('.studio-question');question.replaceChildren();q('.studio-hint').textContent='';
  if(target){if(target.item.diagram){const diagram=el('canvas','studio-diagram');diagram.width=280;diagram.height=180;diagram.setAttribute('aria-label',target.item.label);SC.drawMathDiagram(diagram.getContext('2d'),target.item.diagram,{x:0,y:0,w:280,h:180});question.append(diagram);}else question.textContent=target.item.label;
   if(hints.has(target))q('.studio-hint').textContent=[target.item.hint,target.item.translation].filter(Boolean).join(' · ');
  }
 }
 async fullscreen(){try{this.endStroke();if(document.fullscreenElement)await document.exitFullscreen();else await this.play.requestFullscreen();}catch(_){this.game.message='Helskärm kunde inte öppnas i den här webbläsaren.';this.game.revision++;}}
 openDialog(title){
  this.endStroke();this.cursor.hidden=true;this.game.dialogOpen=true;this.game.emit('studio-dialog');
  const dialog=el('dialog','studio-dialog');dialog.setAttribute('aria-labelledby','studio-dialog-title');const heading=el('h2','',title);heading.id='studio-dialog-title';dialog.append(heading);this.play.append(dialog);this.dialog=dialog;
  dialog.addEventListener('close',()=>{this.game.dialogOpen=false;dialog.remove();if(this.dialog===dialog)this.dialog=null;this.game.emit('studio-dialog');});return dialog;
 }
 finish(){
  if(!this.dirty||this.dialog?.open)return;const d=this.openDialog('Vad vill du göra med din bild?');
  const preview=el('img','studio-finish-preview');preview.src=this.paper.toDataURL('image/png');preview.alt='Din målning';d.append(preview);
  const form=el('form','studio-save-form'),label=el('label','','Ditt namn på tavlan'),name=el('input','');name.type='text';name.required=true;name.maxLength=10;name.autocomplete='off';name.setAttribute('aria-label','Ditt namn på tavlan');label.append(name);form.append(label);
  const help=el('p','','Tavlan och namnet visas i det gemensamma galleriet. De sex senaste tavlorna sparas.');form.append(help);
  const error=el('p','error');error.setAttribute('role','alert');form.append(error);
  const actions=el('div','studio-dialog-actions'),save=el('button','primary','Rama in'),trash=el('button','','🗑 Släng bilden'),back=el('button','quiet','Fortsätt måla');save.type='submit';trash.type=back.type='button';actions.append(save,trash,back);form.append(actions);d.append(form);
  let saving=false;d.addEventListener('cancel',e=>{if(saving)e.preventDefault();});back.onclick=()=>d.close();
  trash.onclick=()=>{form.hidden=true;preview.hidden=true;const confirm=el('div','studio-trash-confirm');confirm.append(el('p','','Släng bilden och börja på ett nytt papper?'));
   const yes=el('button','','Ja, släng bilden'),no=el('button','primary','Behåll bilden');yes.type=no.type='button';yes.onclick=()=>{this.clearPaper();d.close();this.game.message='Ett nytt papper att måla på.';this.game.revision++;};no.onclick=()=>{confirm.remove();form.hidden=false;preview.hidden=false;};confirm.append(yes,no);d.append(confirm);no.focus();};
  form.onsubmit=async e=>{e.preventDefault();if(saving)return;const player=name.value.normalize('NFC').trim().toUpperCase();
   if(!/^[\p{L}\p{M} ]{1,10}$/u.test(player)){error.textContent='Skriv ett namn med 1–10 bokstäver.';name.focus();return;}
   if(root.SkolarkadenHighscorePolicy.isBannedName(player)){error.textContent='Välj ett annat namn.';return;}
   // Keep exactly the same payload for retries when the first response was lost.
   if(this.savePayload&&this.savePayload.player_name!==player){error.textContent='Försök igen med samma namn som vid första sparförsöket.';return;}
   this.savePayload ||= {submission_id:root.crypto.randomUUID(),player_name:player,image:preview.src};
   saving=true;for(const button of [save,trash,back,name])button.disabled=true;error.textContent='';save.textContent='Sparar…';
   try{await request('POST',this.savePayload);if(this.destroyed)return;this.clearPaper();d.close();this.game.message='Tavlan är inramad! Nu finns ett nytt papper.';this.game.revision++;this.loadGallery();}
   catch(err){if(err.status>=400&&err.status<500&&err.status!==409)this.savePayload=null;error.textContent=err.message+' Din bild finns kvar.';}
   finally{saving=false;for(const button of [save,trash,back,name])button.disabled=false;save.textContent='Rama in';}
  };
  d.showModal();name.focus();
 }
 async loadGallery(){
  if(this.loadingGallery)return;this.loadingGallery=true;const status=this.node.querySelector('.studio-gallery-status');status.textContent='Hämtar tavlor…';
  try{const data=await request('GET');if(this.destroyed)return;const list=this.node.querySelector('.studio-thumbnails');list.replaceChildren();
   for(const artwork of (data.artworks||[]).slice(0,6)){const b=el('button','studio-thumbnail'),img=el('img','');b.type='button';img.src=artwork.image;img.alt='Målning av '+artwork.player_name;b.append(img,el('span','',artwork.player_name));b.onclick=()=>this.showArtwork(artwork);list.append(b);}
   status.textContent=data.artworks?.length?'':'Här visas de senaste inramade tavlorna.';
  }catch(error){if(!this.destroyed)status.textContent=error.message;}finally{this.loadingGallery=false;}
 }
 confirmLeave(leave){if(this.dialog?.open)return;const d=this.openDialog('Lämna målningen?');d.append(el('p','','Bilden är inte inramad och försvinner om du går till menyn.'));
  const stay=el('button','primary','Behåll bilden'),go=el('button','','Släng och gå till menyn');stay.onclick=()=>d.close();go.onclick=()=>{d.close();leave();};d.append(stay,go);d.showModal();stay.focus();}
 showArtwork(artwork){if(this.dialog?.open)return;const d=this.openDialog('I vårt galleri'),frame=el('figure','studio-frame'),img=el('img','');img.src=artwork.image;img.alt='Målning av '+artwork.player_name;frame.append(img,el('figcaption','studio-plaque',artwork.player_name));d.append(frame);const close=el('button','primary','Tillbaka till målningen');close.onclick=()=>d.close();d.append(close);d.showModal();close.focus();}
 destroy(){this.destroyed=true;cancelAnimationFrame(this.raf);this.endStroke();this.dialog?.remove();document.removeEventListener('fullscreenchange',this.onFullscreen);root.removeEventListener('beforeunload',this.onBeforeUnload);if(document.fullscreenElement===this.play)document.exitFullscreen().catch(()=>{});this.play.style.removeProperty('--studio-question-extra');this.node.remove();this.canvas.hidden=false;}
}
SC.StudioRenderer=StudioRenderer;
})(globalThis);
