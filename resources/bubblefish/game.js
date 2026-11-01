/* Bubbelfisken: distance-based survival and collision rules, independent of rendering. */
(function(root){
'use strict';
const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const profiles=Object.freeze({
  gentle:{speed:7.5,ceiling:15,range:330,hazards:38,answers:20},
  steady:{speed:9,ceiling:18,range:310,hazards:32,answers:18},
  brave:{speed:10.5,ceiling:20,range:290,hazards:27,answers:17}
});
const boosts=Object.freeze({agility:8,growth:8,armor:8,magnet:8,senses:10});
const stages=Object.freeze([{at:0,kind:'rock'},{at:90,kind:'urchin'},{at:230,kind:'predator'},
  {at:390,kind:'current'},{at:560,kind:'wall'},{at:740,kind:'bird'},{at:940,kind:'octopus'}]);
const normal=text=>String(text??'').normalize('NFC').trim().toLocaleLowerCase('sv-SE');
function circleRect(x,y,r,rect){return Math.hypot(x-clamp(x,rect.x,rect.x+rect.w),y-clamp(y,rect.y,rect.y+rect.h))<r;}
class BubblefishGame{
  constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random,sounds=null}={}){
    Object.assign(this,{queue,onEvent,random,width:1000,height:620});
    this.audio=sounds&&SC.BubblefishAudio?new SC.BubblefishAudio(sounds):null;this.menu();
  }
  emit(type,detail={}){this.onEvent({type,...detail});}
  sound(sound,x=this.fish?.x||this.width/2){this.emit('fish-sound',{sound,x:x/this.width});}
  menu(){
    this.state='menu';this.audio?.stop();this.queue.clear();
    Object.assign(this,{clock:0,elapsed:0,distance:0,score:0,points:0,hits:0,shots:0,mistakes:0,streak:0,life:100,
      held:null,questions:[],answers:[],obstacles:[],balls:[],pickups:[],effects:[],ink:[],collected:[],warnings:[],
      active:{},sequence:0,pickupSerial:0,lastStage:0,stun:0,gulp:0,smash:0,keys:{x:0,y:0},target:null,lowAlarm:0});
  }
  start({mode='letters',pace='gentle',lang='sv-SE',items=null}={}){
    this.menu();this.mode=mode;this.pace=pace;this.lang=lang;this.uppercase=false;this.chineseDisplay='pinyin';
    this.profile=profiles[pace]||profiles.gentle;this.items=SC.beginPractice(this,items);
    if(!this.items?.length)throw new Error('Övningen saknar uppgifter.');
    this.bag=[];this.state='playing';this.fish={x:this.width*.24,y:this.height*.48,vx:0,vy:0};
    this.nextQuestion=0;this.nextAnswer=Infinity;this.nextHazard=32;this.nextBalls=8;this.nextPickup=75;
    this.waveNumber=0;this.answerNumber=0;this.makeQuestionWave(true);this.emit('start');
  }
  resize(width,height){
    if(!(width>0&&height>0))return;
    const sx=width/this.width,sy=height/this.height,oldUnit=this.unit();this.width=width;this.height=height;
    const scale=this.unit()/oldUnit;
    if(!this.fish)return;
    this.fish.x*=sx;this.fish.y*=sy;this.target=null;
    for(const list of [this.questions,this.answers,this.obstacles,this.balls,this.pickups,this.effects,this.ink])for(const o of list){
      o.x*=sx;o.y*=sy;if(o.baseY!==undefined)o.baseY*=sy;if(o.gapY!==undefined)o.gapY*=sy;
      if(o.w)o.w*=scale;if(o.h)o.h*=o.kind==='current'?sy:scale;if(o.gap)o.gap*=sy;if(o.amplitude)o.amplitude*=sy;
      if(o.r)o.r*=scale;
    }
    for(const b of [...this.questions,...this.answers])Object.assign(b,this.bubbleSize(b.item));
    for(const p of this.pickups)p.r=this.unit()*23;
    if(this.held){this.held.x*=sx;this.held.y*=sy;Object.assign(this.held,this.bubbleSize(this.held.item));}
    for(const p of this.collected){p.x*=sx;p.y*=sy;}
    this.keepInBounds();
  }
  unit(){return clamp(Math.min(this.width/700,this.height/480),.72,1.12);}
  limits(){const u=this.unit();return {top:76*u,bottom:this.height-60*u,left:27*u,right:this.width-Math.max(66*u,this.width*.15)};}
  pixelsPerMetre(){return this.width/64;}
  speed(){return this.profile.speed+(this.profile.ceiling-this.profile.speed)*(1-Math.exp(-this.elapsed/155));}
  progress(){return clamp(this.distance/1800,0,1);}
  radius(){return this.unit()*18*(this.has('growth')?1.78:1);}
  has(kind){return (this.active[kind]||0)>0;}
  agility(){return (this.has('agility')?1.65:1)*(this.has('armor')?.64:1);}
  steeringSpeed(){return Math.max(210,this.height*.66)*this.agility();}
  moveTo(x,y){if(this.state==='playing'){this.target={x,y};this.keys={x:0,y:0};}}
  release(){this.target=null;}
  steer(x,y){this.keys={x,y};if(x||y)this.target=null;}
  clearInput(){this.keys={x:0,y:0};this.target=null;if(this.fish)this.fish.vx=this.fish.vy=0;}
  keepInBounds(){
    if(!this.fish)return;const l=this.limits(),r=this.radius();
    this.fish.x=clamp(this.fish.x,l.left+r,l.right-r);
    this.fish.y=clamp(this.fish.y,l.top+r,Math.max(l.top+r,l.bottom-r));
  }
  getTargets(){return [...this.questions,...this.answers];}
  getAvailableTargets(){return [];}
  getActiveEntries(){return [];}
  pause(){if(this.state==='playing'){this.state='paused';this.clearInput();this.emit('pause');}}
  resume(){if(this.state==='paused'){this.clearInput();this.state='playing';this.emit('resume');}}
  takeItem(){
    if(!this.bag.length){this.bag=[...this.items];for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}}
    return this.bag.pop();
  }
  makePair(source=this.takeItem()){
    const p=SC.makeMatchingPairs([source],this.mode,1,this.random,this.lang)[0];
    p.source=SC.isMath(this.mode)?p.problem:source;
    if(p.chinese&&this.chineseDisplay==='translation'&&p.chinese.translation)p.answer=p.chinese.translation;
    return p;
  }
  isCorrect(label,pair=this.held?.pair){
    if(!pair)return false;
    // In addition to the selected display, accept all dictionary alternatives.
    return normal(label)===normal(pair.answer)||SC.matches(label,pair.source,this.mode,this.lang,'text');
  }
  canTranslate(){return SC.isChinese(this.mode)&&this.items.every(i=>!!i.translation?.trim());}
  setChineseDisplay(display){
    if(!['pinyin','translation'].includes(display)||display==='translation'&&!this.canTranslate()||display===this.chineseDisplay)return false;
    this.chineseDisplay=display;
    for(const q of this.questions)q.pair.answer=q.pair.chinese?.[display]||q.pair.answer;
    if(this.held){this.held.pair.answer=this.held.pair.chinese?.[display]||this.held.pair.answer;this.popAll(this.answers);this.answers=[];this.answerNumber=0;this.correctAt=0;this.nextAnswer=this.distance+2;}
    return true;
  }
  bubbleSize(item){
    const u=this.unit(),len=[...String(item.label||'')].length,diagram=!!item.diagram;
    const w=diagram?126*u:clamp(43*u+len*Math.max(10,12*u),64*u,Math.min(222*u,this.width*.54));
    const h=diagram?94*u:Math.max(57*u,Math.min(90*u,Math.ceil(len/(w/(9*u)))*21*u+30*u));
    return {w,h,r:Math.min(w,h)*.39};
  }
  bubble(pair,side,x,y){
    const item=side==='question'?pair.problem:{label:pair.answer};
    return {id:++this.sequence,kind:side,pair,item,x,y,baseY:y,phase:this.random()*6.28,...this.bubbleSize(item)};
  }
  makeQuestionWave(first=false){
    if(this.held||this.stun>0||this.state!=='playing')return;
    this.popAll(this.questions);this.questions=[];this.waveNumber++;
    const l=this.limits(),range=l.bottom-l.top;
    for(let i=0;i<3;i++){
      const pair=this.makePair(),q=this.bubble(pair,'question',this.width+(first?-this.width*.18:70*this.unit()),l.top+range*(.19+i*.31));
      this.questions.push(q);
    }
    if(first){const x=Math.min(this.width*.82,this.width-Math.max(...this.questions.map(q=>q.w))/2-12*this.unit());for(const q of this.questions)q.x=x;}
    this.nextQuestion=Infinity;
  }
  clearMatch(){
    if(this.held)this.pop(this.held);
    this.popAll(this.questions);this.popAll(this.answers);this.questions=[];this.answers=[];this.held=null;
    this.nextAnswer=Infinity;this.nextQuestion=this.distance+5;
  }
  collectQuestion(q){
    if(this.state!=='playing'||this.stun>0||this.held)return false;
    this.popAll(this.questions.filter(other=>other!==q));this.questions=[];
    this.held={...q,kind:'held',x:this.fish.x-57*this.unit(),y:this.fish.y-14*this.unit()};
    this.answerNumber=0;this.correctAt=Math.floor(this.random()*3);this.nextAnswer=this.distance+4;
    this.sound('pick');return true;
  }
  distractor(){
    // Bounded even for a single-word homework list or equivalent synonyms.
    for(let i=0;i<24;i++){const p=this.makePair(this.items[Math.floor(this.random()*this.items.length)]);if(!this.isCorrect(p.answer))return p;}
    return this.held.pair; // A small vocabulary never creates a falsely wrong answer.
  }
  answerY(x,r){
    const l=this.limits(),margin=r+8*this.unit(),low=l.top+margin,high=l.bottom-margin;
    const candidates=Array.from({length:9},(_,i)=>low+(high-low)*(i+.5)/9);
    // Project all known hazards along a route from the fish to the answer.
    // The chosen corridor is also reserved against newly generated obstacles.
    const duration=(x-this.fish.x)/(this.speed()*this.pixelsPerMetre());
    const feasible=candidates.filter(y=>Math.abs(y-this.fish.y)<this.steeringSpeed()*Math.max(.3,duration-.5));
    const score=y=>{
      let risk=0;
      for(let n=0;n<=12;n++){
        const t=n/12,px=this.fish.x,py=this.fish.y+(y-this.fish.y)*Math.min(1,t*2),travel=duration*t;
        for(const o of this.obstacles){
          if(o.kind==='current')continue;
          const ox=o.x+this.velocity(o)*travel;
          const oy=o.kind==='predator'?o.baseY+Math.sin((this.clock+travel)*o.frequency+o.phase)*o.amplitude:o.y+(o.vy||0)*travel;
          if(this.obstacleAt(o,px,py,this.radius()+r*.5,ox,oy))risk++;
        }
      }
      return risk;
    };
    const choices=(feasible.length?feasible:candidates).map(y=>({y,risk:score(y),tie:this.random()})).sort((a,b)=>a.risk-b.risk||a.tie-b.tie);
    return choices[0].y;
  }
  spawnAnswer(){
    if(!this.held||this.stun>0)return;
    const remaining=this.life/100*this.profile.range;
    const travel=(this.width+60*this.unit()-this.fish.x)/this.pixelsPerMetre();
    // A deadline is distance-based, so viewport size and late-run speed cannot
    // silently remove the first correct opportunity. Wrong choices/misses still matter.
    const due=this.answerNumber>=this.correctAt||remaining<travel+this.profile.answers+16;
    const pair=due?this.held.pair:this.distractor(),x=this.width+Math.max(50,this.bubbleSize({label:pair.answer}).w/2);
    const correct=this.isCorrect(pair.answer),r=this.bubbleSize({label:pair.answer}).r;
    let y=this.answerY(x,r);
    if(!correct){const l=this.limits();y=l.top+r+this.random()*Math.max(1,l.bottom-l.top-r*2);}
    const b=this.bubble(pair,'answer',x,y);b.correct=correct;this.answers.push(b);
    this.answerNumber++;
    if(correct)this.correctAt=this.answerNumber+1+Math.floor(this.random()*2);
    this.nextAnswer=this.distance+this.profile.answers;
  }
  collectAnswer(b){
    if(this.state!=='playing'||this.stun>0||!this.held)return false;
    this.shots++;
    if(this.isCorrect(b.item.label)){
      const held=this.held,points=150+Math.min(100,this.streak*25);this.streak++;this.hits++;this.points+=points;
      this.life=Math.min(100,this.life+50);this.lowAlarm=0;
      this.collected.push({question:held.item,answer:b.item,age:0,x:this.fish.x,y:this.fish.y,id:this.hits});
      // Keep the achievement pile bounded; total pair count is retained in hits.
      if(this.collected.length>80)this.collected.shift();
      this.popAll(this.answers.filter(a=>a!==b));this.answers=[];this.held=null;this.nextAnswer=Infinity;this.nextQuestion=this.distance+5;
      this.effects.push({kind:'reward',x:this.fish.x,y:this.fish.y,age:0,duration:.8,points});
      this.sound('correct');this.emit('hit',{points,target:b});
    }else{
      this.mistakes++;this.streak=0;this.clearMatch();this.sound('wrong');this.emit('miss');
    }
    this.refreshScore();return true;
  }
  pop(b){this.effects.push({kind:'pop',x:b.x,y:b.y,w:b.w,h:b.h,item:b.item,age:0,duration:.6,phase:b.phase||0});}
  popAll(bubbles){for(const b of bubbles)this.pop(b);}
  burst(kind,x,y,count=10){
    for(let i=0;i<count;i++){const a=this.random()*Math.PI*2;this.effects.push({kind,x,y,vx:Math.cos(a)*(30+this.random()*100),vy:Math.sin(a)*(30+this.random()*100),r:(2+this.random()*4)*this.unit(),age:0,duration:.35+this.random()*.5});}
  }
  growInk(o){
    this.ink.push({x:o.x,y:o.y,age:0,duration:5.2,r:70*this.unit(),seed:this.random()*10});
    this.sound('ink',o.x);
  }
  collide(o){
    if(this.stun>0||this.state!=='playing')return;
    if(o.kind==='predator'&&this.has('growth')&&o.r<this.radius()*1.5){
      o.dead=true;this.points+=35;this.gulp=.55;
      this.effects.push({...o,kind:'eaten',age:0,duration:.3,fromX:o.x,fromY:o.y});
      this.burst('crumb',o.x,o.y,6);this.sound('gulp');return;
    }
    if(['rock','wall'].includes(o.kind)&&this.has('armor')){
      o.dead=true;this.smash=.4;this.burst('rubble',o.x,this.fish.y,o.kind==='wall'?24:14);this.sound('smash');return;
    }
    if(o.kind==='octopus')this.growInk(o);
    this.clearMatch();this.stun=2;this.sound('hit');this.burst('dizzy',this.fish.x,this.fish.y,8);
  }
  collectBoost(p){
    if(this.stun>0)return;
    if(p.kind==='refill'){this.life=Math.min(100,this.life+25);this.lowAlarm=0;}
    else this.active[p.kind]=boosts[p.kind];
    p.dead=true;this.sound(p.kind);this.burst('spark',p.x,p.y,12);
  }
  velocity(o){
    const scroll=this.speed()*this.pixelsPerMetre();
    // Octopuses and their ink drift slowly left while the reef passes through.
    return o.kind==='octopus'?-scroll*.30:o.kind==='predator'?-scroll*o.speed:o.kind==='bird'?-scroll*.65:-scroll;
  }
  obstacleAt(o,x,y,r,ox=o.x,oy=o.y){
    if(o.kind==='wall')return circleRect(x,y,r,{x:ox-o.w/2,y:0,w:o.w,h:o.gapY-o.gap/2})||circleRect(x,y,r,{x:ox-o.w/2,y:o.gapY+o.gap/2,w:o.w,h:this.height});
    return Math.hypot((x-ox)/(o.kind==='predator'?1.3:1),y-oy)<r+o.r*.83;
  }
  touchesBubble(b){return ((this.fish.x-b.x)/(b.w*.43+this.radius()*.75))**2+((this.fish.y-b.y)/(b.h*.43+this.radius()*.75))**2<1;}
  spawnHazard(kind){
    const u=this.unit(),l=this.limits(),x=this.width+95*u,range=l.bottom-l.top;
    const o={id:++this.sequence,kind,x,y:l.top+range*(.13+this.random()*.74),r:(22+this.random()*14)*u,phase:this.random()*6.28,age:0};
    if(kind==='rock'){o.r=(27+this.random()*28)*u;o.y=this.random()<.5?l.bottom-o.r*.5:l.top+o.r*.5;}
    if(kind==='urchin')o.r=23*u;
    if(kind==='predator'){
      o.r=(27+this.random()*13)*u;o.speed=this.random()<.17?-.32:.65+this.random()*1.05;
      if(o.speed<0)o.x=-90*u;
      o.amplitude=range*(.04+this.random()*.1);o.frequency=.65+this.random()*.5;
    }
    if(kind==='wall'){
      o.w=55*u;o.gap=Math.max(115*u,range*(.43-this.progress()*.14),this.radius()*2+42*u);
      o.gapY=l.top+o.gap/2+this.random()*Math.max(0,range-o.gap);o.y=this.height/2;
    }
    if(kind==='current'){o.w=100*u;o.h=range;o.y=l.top+range/2;o.direction=this.random()<.5?-1:1;o.r=35*u;}
    if(kind==='bird'){o.x=this.width*(.48+this.random()*.3);o.y=-80*u;o.vy=125*u;o.r=26*u;}
    if(kind==='octopus')o.r=38*u;
    o.baseY=o.y;
    // Reserve the route to currently visible correct answers and the space
    // around a question wave. Obstacles must not physically cover their labels.
    const protectedBubbles=[...this.questions,...this.answers.filter(b=>this.isCorrect(b.item.label))];
    const blocked=protectedBubbles.some(b=>{
      if(o.kind==='current')return false;
      if(o.kind==='wall')return Math.abs(b.y-o.gapY)>o.gap/2-b.h/2-this.radius()-10*u;
      const travel=Math.max(0,(b.x-this.fish.x)/(this.speed()*this.pixelsPerMetre()));
      const low=Math.min(this.fish.y,b.y)-b.h/2-this.radius(),high=Math.max(this.fish.y,b.y)+b.h/2+this.radius();
      const lowO=o.y-(o.amplitude||0)-o.r,highO=o.y+(o.amplitude||0)+o.r+(o.vy||0)*travel;
      return lowO<high&&highO>low;
    });
    if(blocked)return;
    this.obstacles.push(o);
  }
  spawnBalls(){
    const l=this.limits(),u=this.unit(),y=l.top+24*u+this.random()*(l.bottom-l.top-48*u);
    for(let i=0;i<5;i++)this.balls.push({x:this.width+(15+i*19)*u,y:y+Math.sin(i*.75)*14*u,r:5*u});
  }
  spawnPickup(){
    const available=['agility','refill','magnet','senses',...(this.distance>190?['growth']:[]),...(this.distance>360?['armor']:[])];
    // Rotate through the unlocked effects so an unlucky run does not hide a boost.
    const kind=available[this.pickupSerial++%available.length],l=this.limits(),r=23*this.unit();
    this.pickups.push({kind,x:this.width+r,y:l.top+40+this.random()*Math.max(1,l.bottom-l.top-80),r,phase:this.random()*6.28});
  }
  refreshScore(){this.score=Math.floor(this.distance)+this.points;}
  update(dt){
    if(!Number.isFinite(dt)||dt<=0||this.state!=='playing')return;
    // Fixed maximum substep prevents tunnelling, also under a delayed frame.
    for(let remaining=dt;remaining>1e-8&&this.state==='playing';){const step=Math.min(1/60,remaining);this.step(step);remaining-=step;}
  }
  step(dt){
    this.elapsed+=dt;this.clock+=dt;const metres=this.speed()*dt,pixels=metres*this.pixelsPerMetre(),u=this.unit();
    this.distance+=metres;this.life=Math.max(0,this.life-metres/this.profile.range*100);
    if(this.life<=0){this.state='lost';this.clearInput();this.refreshScore();this.sound('end');this.emit('end',{won:false,score:this.score,hits:this.hits,shots:this.shots,elapsed:this.elapsed});return;}
    const wasStunned=this.stun>0;this.stun=Math.max(0,this.stun-dt);this.gulp=Math.max(0,this.gulp-dt);this.smash=Math.max(0,this.smash-dt);
    for(const k of Object.keys(this.active))this.active[k]=Math.max(0,this.active[k]-dt);
    let dx=this.keys.x,dy=this.keys.y;
    if(this.target){dx=this.target.x-this.fish.x;dy=this.target.y-this.fish.y;const d=Math.hypot(dx,dy);if(d<2){dx=dy=0;}else{const speed=Math.min(this.steeringSpeed(),d*7);dx=dx/d*speed/this.steeringSpeed();dy=dy/d*speed/this.steeringSpeed();}}
    const length=Math.max(1,Math.hypot(dx,dy)),speed=this.steeringSpeed(),blend=1-Math.exp(-dt*11*this.agility());
    this.fish.vx+=(dx/length*speed-this.fish.vx)*blend;this.fish.vy+=(dy/length*speed-this.fish.vy)*blend;
    this.fish.x+=this.fish.vx*dt;this.fish.y+=this.fish.vy*dt;
    for(const o of this.obstacles){
      o.age+=dt;o.x+=this.velocity(o)*dt;
      if(o.kind==='predator')o.y=o.baseY+Math.sin(this.clock*o.frequency+o.phase)*o.amplitude;
      if(o.kind==='octopus')o.y=o.baseY+Math.sin(this.clock*.8+o.phase)*12*u;
      if(o.kind==='bird'){o.y+=o.vy*dt;if(o.y>this.height*.63)o.vy=-160*u;}
      if(o.kind==='current'&&!wasStunned&&Math.abs(this.fish.x-o.x)<o.w/2)this.fish.y+=o.direction*speed*.34*dt;
    }
    this.keepInBounds();
    for(const b of [...this.questions,...this.answers]){b.x-=pixels;b.y=b.baseY+Math.sin(this.clock*1.2+b.phase)*3*u;}
    for(const b of this.balls){
      b.x-=pixels;
      if(this.has('magnet')&&!wasStunned){const dx=this.fish.x-b.x,dy=this.fish.y-b.y,d=Math.hypot(dx,dy);if(d<155*u&&d>1){b.x+=dx/d*260*u*dt;b.y+=dy/d*260*u*dt;}}
    }
    for(const p of this.pickups)p.x-=pixels;
    if(this.held){const b=this.held,targetX=this.fish.x-this.radius()-b.w/2-10*u;b.x+=(clamp(targetX,b.w/2+8,this.width-b.w/2-8)-b.x)*(1-Math.exp(-dt*9));b.y+=(clamp(this.fish.y-(targetX<b.w/2+8?this.radius()+b.h/2+10*u:18*u),this.limits().top+b.h/2,this.limits().bottom-b.h/2)-b.y)*(1-Math.exp(-dt*9));}
    for(const e of this.effects){e.age+=dt;if(e.vx!==undefined){e.x+=e.vx*dt-pixels*.35;e.y+=e.vy*dt;if(e.kind==='rubble')e.vy+=180*dt;}}
    for(const ink of this.ink){ink.x-=pixels*.3;ink.age+=dt;}
    for(const p of this.collected)p.age+=dt;
    this.effects=this.effects.filter(e=>e.age<e.duration).slice(-180);this.ink=this.ink.filter(i=>i.age<i.duration);
    this.questions=this.questions.filter(b=>b.x>-b.w);this.answers=this.answers.filter(b=>b.x>-b.w);
    if(!wasStunned){
      // Resolve at most one encounter per step. No cascade into a second bubble.
      const hit=this.obstacles.find(o=>!o.dead&&o.kind!=='current'&&this.obstacleAt(o,this.fish.x,this.fish.y,this.radius()));
      if(hit)this.collide(hit);
      if(!this.stun){
        const q=!this.held&&this.questions.find(b=>this.touchesBubble(b));if(q)this.collectQuestion(q);
        else if(this.held){const a=this.answers.find(b=>this.touchesBubble(b));if(a)this.collectAnswer(a);}
        for(const b of this.balls)if(!b.dead&&Math.hypot(b.x-this.fish.x,b.y-this.fish.y)<this.radius()+b.r){b.dead=true;this.points+=5;this.sound('ball',b.x);this.burst('gold',b.x,b.y,3);}
        const p=this.pickups.find(b=>!b.dead&&Math.hypot(b.x-this.fish.x,b.y-this.fish.y)<this.radius()+b.r);if(p)this.collectBoost(p);
      }
    }
    this.obstacles=this.obstacles.filter(o=>!o.dead&&o.x>-170*u&&o.x<this.width+220*u&&(o.kind!=='bird'||o.y>-170*u));
    this.balls=this.balls.filter(b=>!b.dead&&b.x>-12);this.pickups=this.pickups.filter(p=>!p.dead&&p.x>-p.r*2);
    if(!this.stun){
      if(!this.held&&!this.questions.length&&this.distance>=this.nextQuestion)this.makeQuestionWave();
      if(!this.held&&!this.questions.length&&this.nextQuestion===Infinity)this.nextQuestion=this.distance+5;
      if(this.held&&this.distance>=this.nextAnswer)this.spawnAnswer();
    }
    if(this.distance>=this.nextHazard){
      const available=stages.filter(s=>this.distance>=s.at);let stage=available[Math.floor(this.random()*available.length)];
      if((this.lastStage||0)<available.length){this.lastStage=available.length;stage=available.at(-1);}
      this.spawnHazard(stage.kind);this.nextHazard=this.distance+this.profile.hazards*(1-.34*this.progress())*(.85+this.random()*.3);
    }
    if(this.distance>=this.nextBalls){this.spawnBalls();this.nextBalls=this.distance+23+this.random()*17;}
    if(this.distance>=this.nextPickup){this.pickupSerial??=0;this.spawnPickup();this.nextPickup=this.distance+65+this.random()*28;}
    this.warnings=this.has('senses')?this.obstacles.filter(o=>o.kind!=='current'&&(o.x>this.width-35*u||o.x<0||o.y<65*u)).map(o=>({x:clamp(o.x,20,this.width-20),y:clamp(o.y,82*u,this.height-72*u),direction:o.y<65*u?'down':o.x<0?'right':'left'})):[];
    this.lowAlarm-=dt;if(this.life<20&&this.lowAlarm<=0){this.sound('danger');this.lowAlarm=3;}
    this.refreshScore();
  }
}
Object.assign(SC,{BubblefishGame,bubblefishProfiles:profiles,bubblefishBoosts:boosts,bubblefishStages:stages});
})(globalThis);
