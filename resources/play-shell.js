/* Same-page game history and the space actually visible above a mobile keyboard. */
(function(root){
'use strict';const SC=root.Starlight;
class GameNavigation{
 constructor({onBack,history=root.history,target=root}){
  Object.assign(this,{onBack,history,target,active:false});
  this.mark('menu','replaceState');
  this.pop=()=>{
   if(this.leaving){const done=this.leaving;this.leaving=null;done();return;}
   if(this.active){
    // Restore our single game entry before asking, so cancelling keeps Back usable.
    this.mark('game','pushState');this.onBack();
   }else if(this.history.state?.skolarkaden==='game')this.mark('menu','replaceState');
  };
  target.addEventListener('popstate',this.pop);
 }
 mark(view,method){this.history[method]({...this.history.state,skolarkaden:view},'');}
 enter(){if(this.active)return;this.active=true;this.mark('game','pushState');}
 leave(done){
  if(this.leaving)return;this.active=false;
  if(this.history.state?.skolarkaden==='game'){this.leaving=done;this.history.back();}
  else done();
 }
 destroy(){this.target.removeEventListener('popstate',this.pop);}
}
class PlayViewport{
 constructor(doc=root.document){
  this.doc=doc;this.viewport=root.visualViewport;this.frame=0;
  this.mobile=()=>root.matchMedia?.('(any-pointer: coarse)').matches||root.navigator?.maxTouchPoints>0;
  this.update=()=>{
   this.frame=0;const vv=this.viewport;
   // Let the browser pan a zoomed page; do not reflow it on every pinch gesture.
   if(vv&&Math.abs(vv.scale-1)>.05)return;
   doc.body.classList.toggle('mobile-play',!!this.mobile());
   doc.documentElement.style.setProperty('--play-height',(vv?.height||root.innerHeight)+'px');
   doc.documentElement.style.setProperty('--play-top',(vv?.offsetTop||0)+'px');
  };
  this.schedule=()=>{if(!this.frame)this.frame=root.requestAnimationFrame(this.update);};
  root.addEventListener('resize',this.schedule);this.viewport?.addEventListener('resize',this.schedule);this.viewport?.addEventListener('scroll',this.schedule);this.update();
 }
 destroy(){root.cancelAnimationFrame(this.frame);root.removeEventListener('resize',this.schedule);this.viewport?.removeEventListener('resize',this.schedule);this.viewport?.removeEventListener('scroll',this.schedule);}
}
SC.fitSceneSize=(width,height,game)=>{
 const kind=game.viewportKind,minimum={city:[0,400],food:[600,540],garden:[0,500],hive:[600,600],paint:[0,440],dinosaur:[0,440],marshmallows:[0,420],eggs:[600,500],home:[0,440]}[kind]||[0,0];
 let scale=Math.min(1,width/(minimum[0]||width),height/(minimum[1]||height));
 if(kind==='food'){
  const last=Math.max(2,...game.customers.map(c=>c.slot));
  // The customer layout uses pixel distances; fit its last row as well as the truck.
  for(let i=0;i<4;i++)scale=Math.min(scale,height/SC.foodSceneHeight(width/scale,last));
 }
 return {width:width/scale,height:height/scale,scale};
};
SC.GameNavigation=GameNavigation;SC.PlayViewport=PlayViewport;
})(globalThis);
