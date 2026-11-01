/* Flashlight matching. Rules and scoring are independent of rendering. */
(function(root){
'use strict';
const SC=root.Starlight;
const counts=Object.freeze({gentle:8,steady:12,brave:16});
const shuffle=(values,random)=>{const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
let sceneBag=[],previousScene=null;
function nextScene(random){
  if(!sceneBag.length){
    sceneBag=shuffle(SC.ficklampanScenes,random);
    if(sceneBag.length>1&&sceneBag[0].id===previousScene)[sceneBag[0],sceneBag[1]]=[sceneBag[1],sceneBag[0]];
  }
  const scene=sceneBag.shift();previousScene=scene.id;return scene;
}
function measureSurface(s,id){
  const xs=s.q.map(p=>p[0]),ys=s.q.map(p=>p[1]);
  return {...s,id,x:xs.reduce((a,b)=>a+b,0)/4,y:ys.reduce((a,b)=>a+b,0)/4,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys),width:(Math.hypot(xs[1]-xs[0],ys[1]-ys[0])+Math.hypot(xs[2]-xs[3],ys[2]-ys[3]))/2,height:(Math.hypot(xs[3]-xs[0],ys[3]-ys[0])+Math.hypot(xs[2]-xs[1],ys[2]-ys[1]))/2};
}
function score(pairs,seconds){
  const bonus=25*pairs,reference=60+13*pairs+.35*pairs*pairs;
  // Each difficulty earns 10,000 at its reference time. Calibrate these times
  // with play data; they are estimates, not measured equal average scores.
  return Math.round(bonus+(10000-bonus)*2/(1+Math.max(0,seconds)/reference));
}
class FicklampanGame{
  constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random});this.menu();}
  emit(type,detail={}){this.onEvent({type,...detail});}
  menu(){Object.assign(this,{state:'menu',loaded:false,clock:0,elapsed:0,score:0,hits:0,shots:0,mistakes:0,held:null,tiles:[],collected:[],revision:0,feedback:null});}
  start({mode='swedish',pace='gentle',lang='sv-SE',items=null,scene=null}={}){
    this.menu();this.queue.clear();Object.assign(this,{mode,pace,lang,uppercase:false});
    this.total=counts[pace];if(!this.total)throw new Error('Okänd svårighet.');
    this.items=SC.beginPractice(this,items);this.scene=scene||nextScene(this.random);
    this.surfaces=this.scene.surfaces.map(measureSurface);
    const opening=this.surfaces[this.scene.opening||0];
    const slots=[opening,...shuffle(this.surfaces.filter(s=>s!==opening),this.random)].slice(0,this.total*2);
    const pairs=SC.makeMatchingPairs(this.items,mode,this.total,this.random,lang,true);
    let assignments=pairs.flatMap((p,pair)=>[{pair,side:'problem',key:p.key,item:p.problem},{pair,side:'answer',key:p.key,item:{label:p.answer,speech:p.answerSpeech}}]);
    // Spread counterparts apart while varying the location of every round.
    for(let attempt=0;attempt<300;attempt++){
      assignments=shuffle(assignments,this.random);const seen=new Map();let distant=true;
      assignments.forEach((a,i)=>{const other=seen.get(a.pair);if(other&&Math.hypot(other.x-slots[i].x,other.y-slots[i].y)<235)distant=false;seen.set(a.pair,slots[i]);});
      if(distant)break;
    }
    this.tiles=slots.map((surface,id)=>({...assignments[id],id,surface,found:false}));
    this.state='playing';this.revision++;this.emit('start');
  }
  sceneReady(){this.loaded=true;this.revision++;}
  resize(width,height){Object.assign(this,{width,height});}
  getTargets(){return this.tiles.filter(t=>!t.found);}
  getAvailableTargets(){return this.getTargets();}
  getActiveEntries(){return [];}
  select(id){
    if(this.state!=='playing'||!this.loaded)return false;
    const tile=this.tiles[id];if(!tile||tile.found)return false;
    if(this.held===id){this.held=null;this.revision++;return true;}
    const first=this.held===null?null:this.tiles[this.held];
    this.held=id;this.revision++;
    this.emit('klossar-select',{tile});
    if(!first)return true;
    this.shots++;
    if(!SC.klossarMatches(first,tile)){
      this.mistakes++;this.feedback={id:first.id,until:this.clock+.45};this.emit('miss');return true;
    }
    first.found=tile.found=true;this.held=null;this.hits++;this.score=this.hits*25;
    this.collected.push(first.side==='problem'?[first,tile]:[tile,first]);
    this.feedback={id:tile.id,until:this.clock+.65,matched:true};this.emit('hit',{target:tile,points:25});
    if(this.hits===this.total){this.score=score(this.total,this.elapsed);this.state='celebrating';this.endingLeft=.9;this.emit('celebrate');}
    return true;
  }
  pause(){if(this.state==='playing'){this.state='paused';this.revision++;this.emit('pause');}}
  resume(){if(this.state==='paused'){this.state='playing';this.revision++;this.emit('resume');}}
  update(dt){
    if(!Number.isFinite(dt)||dt<=0||!this.loaded||!['playing','celebrating'].includes(this.state))return;
    this.clock+=dt;
    if(this.feedback&&this.clock>=this.feedback.until){this.feedback=null;this.revision++;}
    if(this.state==='playing')this.elapsed+=dt;
    else if((this.endingLeft-=dt)<=0){this.state='won';this.revision++;this.emit('end',{won:true,score:this.score,hits:this.hits,shots:this.shots,elapsed:this.elapsed});}
  }
}
Object.assign(SC,{FicklampanGame,ficklampanScore:score,ficklampanCounts:counts,ficklampanMeasureSurface:measureSurface});
})(globalThis);
