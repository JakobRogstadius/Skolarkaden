/* A finite celebration behind the shared result card. No score/network logic. */
(function(root){
  'use strict';
  const validRank=rank=>Number.isInteger(rank)&&rank>=1&&rank<=10;
  function programme(rank){
    if(!validRank(rank))return null;
    const merit=(10-rank)/9;
    return {count:3+Math.round(13*merit),size:.60+.70*merit,duration:2.4+6*merit};
  }
  class HighscoreFireworks{
    constructor(overlay,{reducedMotion=false}={}){
      this.overlay=overlay;this.card=overlay.querySelector('.end-scoreboard');
      this.reducedMotion=reducedMotion;this.motion=root.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.onMotion=()=>{if(this.motion.matches)this.finish();};
      this.motion?.addEventListener?.('change',this.onMotion);
      this.rank=null;this.launched=0;this.next=0;this.finished=false;
    }
    setRank(rank){
      if(!validRank(rank)){this.dispose();return;}
      if(this.rank===rank)return; // Saving or refreshing must not replay the show.
      this.rank=rank;this.plan=programme(rank);
      if(this.finished||this.reducedMotion||this.motion?.matches||!root.FireworksVisuals)return;
      if(!this.engine){
        this.canvas=document.createElement('canvas');this.canvas.className='highscore-fireworks';
        this.canvas.setAttribute('aria-hidden','true');this.overlay.append(this.canvas);
        this.overlay.classList.add('has-fireworks');
        try{this.engine=new root.FireworksVisuals.Fireworks(this.canvas,{transparent:true,detail:.6,onError:()=>this.finish()});}
        catch(_){this.finish();this.overlay.classList.remove('has-fireworks');return;}
        this.engine.onStep=time=>this.step(time);
      }
    }
    step(time){
      if(this.overlay.hidden||!this.overlay.isConnected||this.motion?.matches){this.finish();return;}
      // At most one launch per frame; returning to a hidden tab cannot dump a backlog.
      if(this.launched<this.plan.count&&time>=this.next){
        this.launch(this.launched++);
        this.next=time+this.plan.duration/(this.plan.count-1);
      }
      if(this.launched>=this.plan.count&&!this.engine.queue.length&&!this.engine.batches.length)this.finish();
    }
    launch(index){
      const e=this.engine,w=e.width,h=e.height,rect=this.card.getBoundingClientRect();
      const scale=900/h,gap=Math.min(rect.left,w-rect.right),random=Math.random;
      let x,y;
      if(gap>=120){
        // Alternate the open spaces beside the opaque score card.
        x=index%2?w-gap*(.38+random()*.22):gap*(.38+random()*.22);
        y=h*(.22+random()*.28);
      }else{
        // On phones the useful spaces are above/below the card, near its corners.
        x=w*(index%2?.78:.22);
        y=index%4<2?Math.max(28,rect.top*.6):Math.min(h-28,rect.bottom+(h-rect.bottom)*.45);
      }
      const types=this.rank<=3?['bloom','chrysanthemum','saturn','corona','seeds','willow']:['chrysanthemum','saturn','crossette','bloom','peony'];
      const palettes=['gold','rose','ice','jewel','aurora'];
      e.launch({type:types[index%types.length],palette:palettes[index%palettes.length],x:(x-w/2)*scale,y:(h-y)*scale,
        size:this.plan.size*(.93+random()*.14)*Math.min(1,Math.max(.55,w/850)),seed:Math.floor(random()*4294967296)});
    }
    finish(){
      this.finished=true;
      if(this.engine){this.engine.dispose();this.engine=null;}
      this.canvas?.remove();this.canvas=null;
      // Keep the card's mobile gutters until dismissal, avoiding a layout jump.
    }
    dispose(){this.finish();this.motion?.removeEventListener?.('change',this.onMotion);this.overlay.classList.remove('has-fireworks');}
  }
  HighscoreFireworks.programme=programme;
  (root.Starlight ||= {}).HighscoreFireworks=HighscoreFireworks;
})(globalThis);
