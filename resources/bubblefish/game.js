/* Bubbelfisken: distance-based survival and collision rules, independent of rendering. */
(function(root){
'use strict';
const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const profiles=Object.freeze({
  gentle:{speed:7.5,range:330,hazards:38,answers:20},
  steady:{speed:9,range:310,hazards:32,answers:18},
  brave:{speed:10.5,range:290,hazards:27,answers:17}
});
const boosts=Object.freeze({agility:8,growth:8,armor:8,magnet:8,senses:10});
// Minimum forward distance in metres. Effects follow the things they help with;
// a blocked hazard introduction is retried before introducing the next hazard.
const progression=Object.freeze([
  {at:8,kind:'balls',type:'bonus'},
  {at:32,kind:'rock',type:'hazard'},
  {at:100,kind:'refill',type:'pickup'},
  {at:160,kind:'urchin',type:'hazard'},
  {at:240,kind:'armor',type:'pickup',after:'rock'},
  {at:320,kind:'magnet',type:'pickup',after:'balls'},
  {at:420,kind:'predator',type:'hazard'},
  {at:520,kind:'growth',type:'pickup',after:'predator'},
  {at:680,kind:'current',type:'hazard'},
  {at:800,kind:'agility',type:'pickup',after:'current'},
  {at:960,kind:'wall',type:'hazard'},
  {at:1120,kind:'senses',type:'pickup',after:'wall'},
  {at:1320,kind:'bird',type:'hazard'},
  {at:1580,kind:'octopus',type:'hazard'}
].map(Object.freeze));
const stages=progression.filter(s=>s.type==='hazard'),pickupStages=progression.filter(s=>s.type==='pickup');
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
      active:{},sequence:0,pickupSerial:0,introduced:new Set(),stun:0,gulp:0,smash:0,keys:{x:0,y:0},target:null,lowAlarm:0});
  }
  start({mode='letters',pace='gentle',lang='sv-SE',items=null}={}){
    this.menu();this.mode=mode;this.pace=pace;this.lang=lang;this.uppercase=false;this.chineseDisplay='pinyin';
    this.profile=profiles[pace]||profiles.gentle;this.items=SC.beginPractice(this,items);
    if(!this.items?.length)throw new Error('Övningen saknar uppgifter.');
    this.bag=[];this.state='playing';this.fish={x:this.width*.24,y:this.height*.48,vx:0,vy:0};
    this.layout=new SC.BubblefishLayout(this);
    this.nextQuestion=0;this.nextAnswer=Infinity;this.nextHazard=stages[0].at;this.nextBalls=progression[0].at;this.nextPickup=pickupStages[0].at;
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
    this.layout?.resize(sx,sy);
    this.keepInBounds();
  }
  unit(){return clamp(Math.min(this.width/700,this.height/480),.72,1.12);}
  limits(){const u=this.unit();return {top:76*u,bottom:this.height-60*u,left:27*u,right:this.width-Math.max(66*u,this.width*.15)};}
  pixelsPerMetre(){return this.width/64;}
  // Three times starting speed after five minutes, five times after ten; no plateau.
  speed(){return this.profile.speed*(1+this.elapsed/150);}
  travel(seconds){return this.speed()*seconds+this.profile.speed/300*seconds*seconds;}
  travelTime(metres){const speed=this.speed();return 2*Math.max(0,metres)/(speed+Math.sqrt(speed*speed+this.profile.speed/75*Math.max(0,metres)));}
  progress(){return clamp(this.distance/1800,0,1);}
  radius(){return this.unit()*18*(this.has('growth')?1.78:1);}
  has(kind){return (this.active[kind]||0)>0;}
  agility(){return (this.has('agility')?1.65:1)*(this.has('armor')?.64:1);}
  agilityAt(seconds){return ((this.active.agility||0)>seconds?1.65:1)*((this.active.armor||0)>seconds?.64:1);}
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
    const wave=this.layout.questionWave(Array.from({length:3},()=>this.makePair()),first);
    if(!wave.length){this.nextQuestion=this.distance+3;return;}
    this.popAll(this.questions);this.questions=wave;this.waveNumber++;this.nextQuestion=Infinity;
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
  spawnAnswer(){
    if(!this.held||this.stun>0)return;
    const remaining=this.life/100*this.profile.range;
    const travel=(this.width+60*this.unit()-this.fish.x)/this.pixelsPerMetre();
    // A deadline is distance-based, so viewport size and late-run speed cannot
    // silently remove the first correct opportunity. Wrong choices/misses still matter.
    const due=this.answerNumber>=this.correctAt||remaining<travel+this.profile.answers+16;
    const pair=due?this.held.pair:this.distractor(),x=this.width+Math.max(50,this.bubbleSize({label:pair.answer}).w/2);
    const correct=this.isCorrect(pair.answer),b=this.bubble(pair,'answer',x,this.fish.y);b.correct=correct;
    const preferred=this.layout.preferred(x)+(correct?0:(this.answerNumber%2?1:-1)*(this.limits().bottom-this.limits().top)*.25);
    if(!this.layout.place(b,{preferred,reserve:correct,accept:()=>correct||this.layout.allowDistractor(b)})){
      this.nextAnswer=this.distance+3;return;
    }
    this.answers.push(b);
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
  motionFactor(o){return o.kind==='octopus'?.30:o.kind==='predator'?o.speed:o.kind==='bird'?.65:1;}
  velocity(o){return -this.speed()*this.pixelsPerMetre()*this.motionFactor(o);}
  // The layout planner and live simulation use the same movement prediction,
  // including accelerating scrolling and the bird's change of direction.
  projectObstacle(o,seconds,metres=this.travel(seconds),clock=this.clock){
    const p={x:o.x-metres*this.pixelsPerMetre()*this.motionFactor(o),y:o.y,vy:o.vy};
    if(o.kind==='predator')p.y=o.baseY+Math.sin((clock+seconds)*o.frequency+o.phase)*o.amplitude;
    if(o.kind==='octopus')p.y=o.baseY+Math.sin((clock+seconds)*.8+o.phase)*12*this.unit();
    if(o.kind==='bird'){
      const bottom=o.diveY??this.height*.63,turn=o.vy>0?Math.max(0,(bottom-o.y)/o.vy):Infinity;
      if(seconds>=turn){p.vy=-160*this.unit();p.y=bottom+p.vy*(seconds-turn);}else p.y=o.y+o.vy*seconds;
    }
    return p;
  }
  obstacleAt(o,x,y,r,ox=o.x,oy=o.y){
    if(o.kind==='wall')return circleRect(x,y,r,{x:ox-o.w/2,y:0,w:o.w,h:o.gapY-o.gap/2})||circleRect(x,y,r,{x:ox-o.w/2,y:o.gapY+o.gap/2,w:o.w,h:this.height});
    return Math.hypot((x-ox)/(o.kind==='predator'?1.3:1),y-oy)<r+o.r*.83;
  }
  touchesBubble(b){return ((this.fish.x-b.x)/(b.w*.43+this.radius()*.75))**2+((this.fish.y-b.y)/(b.h*.43+this.radius()*.75))**2<1;}
  spawnHazard(kind){return this.layout.section(kind);}
  spawnBalls(){return this.layout.balls();}
  spawnPickup(){
    const available=pickupStages.filter(s=>this.distance>=s.at&&(!s.after||this.introduced.has(s.after)));
    if(!available.length)return;
    // Show newly unlocked effects first, then rotate through the available set.
    const stage=available.find(s=>!this.introduced.has(s.kind))||available[this.pickupSerial++%available.length];
    const kind=stage.kind,r=23*this.unit();
    const p={kind,x:this.width+r,y:0,r,phase:this.random()*6.28};
    if(!this.layout.place(p))return false;
    this.pickups.push(p);this.introduced.add(kind);return true;
  }
  refreshScore(){this.score=Math.floor(this.distance)+this.points;}
  update(dt){
    if(!Number.isFinite(dt)||dt<=0||this.state!=='playing')return;
    // Shorter collision steps at late-run speeds prevent crossing objects in one frame.
    for(let remaining=dt;remaining>1e-8&&this.state==='playing';){
      // Use the maximum possible agility and the normal radius so boosts and
      // steering never change the integration schedule or distance/life consumption.
      const relativeSpeed=this.speed()*this.pixelsPerMetre()*1.7+Math.max(210,this.height*.66)*1.65*1.2;
      const step=Math.min(1/60,this.unit()*18*.6/relativeSpeed,remaining);this.step(step);remaining-=step;
    }
  }
  step(dt){
    const previousSpeed=this.speed();this.elapsed+=dt;this.clock+=dt;
    const metres=(previousSpeed+this.speed())*.5*dt,pixels=metres*this.pixelsPerMetre(),u=this.unit();
    this.distance+=metres;this.life=Math.max(0,this.life-metres/this.profile.range*100);
    if(this.life<=0){this.state='lost';this.clearInput();this.refreshScore();this.sound('end');this.emit('end',{won:false,score:this.score,hits:this.hits,shots:this.shots,elapsed:this.elapsed});return;}
    const wasStunned=this.stun>0;this.stun=Math.max(0,this.stun-dt);this.gulp=Math.max(0,this.gulp-dt);this.smash=Math.max(0,this.smash-dt);
    for(const k of Object.keys(this.active))this.active[k]=Math.max(0,this.active[k]-dt);
    let dx=this.keys.x,dy=this.keys.y;
    if(this.target){dx=this.target.x-this.fish.x;dy=this.target.y-this.fish.y;const d=Math.hypot(dx,dy);if(d<2){dx=dy=0;}else{const speed=Math.min(this.steeringSpeed(),d*7);dx=dx/d*speed/this.steeringSpeed();dy=dy/d*speed/this.steeringSpeed();}}
    const length=Math.max(1,Math.hypot(dx,dy)),speed=this.steeringSpeed(),blend=1-Math.exp(-dt*11*this.agility());
    this.fish.vx+=(dx/length*speed*(dx<0?1.2:1)-this.fish.vx)*blend;this.fish.vy+=(dy/length*speed-this.fish.vy)*blend;
    this.fish.x+=this.fish.vx*dt;this.fish.y+=this.fish.vy*dt;
    for(const o of this.obstacles){
      o.age+=dt;Object.assign(o,this.projectObstacle(o,dt,metres,this.clock-dt));
      if(o.kind==='current'&&!wasStunned&&Math.abs(this.fish.x-o.x)<o.w/2)this.fish.y+=o.direction*speed*.34*dt;
    }
    this.keepInBounds();
    for(const b of [...this.questions,...this.answers])b.x-=pixels;
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
    this.obstacles=this.obstacles.filter(o=>!o.dead&&o.x>-170*u&&(this.motionFactor(o)>=0||o.x<this.width+220*u)&&(o.kind!=='bird'||o.y>-170*u));
    this.balls=this.balls.filter(b=>!b.dead&&b.x>-12);this.pickups=this.pickups.filter(p=>!p.dead&&p.x>-p.r*2);
    if(!this.stun){
      if(!this.held&&!this.questions.length&&this.distance>=this.nextQuestion)this.makeQuestionWave();
      if(!this.held&&!this.questions.length&&this.nextQuestion===Infinity)this.nextQuestion=this.distance+5;
      if(this.held&&this.distance>=this.nextAnswer)this.spawnAnswer();
    }
    if(this.distance>=this.nextHazard){
      const available=stages.filter(s=>this.distance>=s.at);let stage=available[Math.floor(this.random()*available.length)];
      stage=available.find(s=>!this.introduced.has(s.kind))||stage;
      const spawned=this.spawnHazard(stage.kind);
      this.nextHazard=this.distance+(spawned?this.profile.hazards*(1-.34*this.progress())*(.85+this.random()*.3):8);
    }
    if(this.distance>=this.nextBalls){this.spawnBalls();this.nextBalls=this.distance+23+this.random()*17;}
    if(this.distance>=this.nextPickup){this.spawnPickup();this.nextPickup=this.distance+65+this.random()*28;}
    this.warnings=this.has('senses')?this.obstacles.filter(o=>o.kind!=='current'&&(o.x>this.width-35*u||o.x<0||o.y<65*u)).map(o=>({x:clamp(o.x,20,this.width-20),y:clamp(o.y,82*u,this.height-72*u),direction:o.y<65*u?'down':o.x<0?'right':'left'})):[];
    this.lowAlarm-=dt;if(this.life<20&&this.lowAlarm<=0){this.sound('danger');this.lowAlarm=3;}
    this.refreshScore();
  }
}
Object.assign(SC,{BubblefishGame,bubblefishProfiles:profiles,bubblefishBoosts:boosts,bubblefishProgression:progression});
})(globalThis);
