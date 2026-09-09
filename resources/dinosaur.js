/* Hungry Dinosaur: a single FIFO worker in a friendly, geometric forest. */
(function(root){'use strict';const SC=root.Starlight,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
class DinosaurGame{
 constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random,width:1000,height:700});this.menu();}
 emit(type,detail={}){this.onEvent({type,...detail});}
 menu(){Object.assign(this,{state:'menu',clock:0,elapsed:0,people:[],groups:[],effects:[],job:null,score:0,hits:0,passed:0,escaped:0,spawned:0,total:40,shots:0,streak:0,bestStreak:0});this.dino={x:.5,y:.77,facing:1,stride:0,moving:false};}
 start({mode='swedish',pace='gentle',lang='sv-SE',items=null,uppercase=Math.random()<.5}={}){
  this.menu();Object.assign(this,{mode,pace,lang,uppercase});this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Gläntan behöver minst ett svar.');
  this.timeScale=SC.isMath(mode)?1.3:1;this.maxPeople={gentle:4,steady:6,brave:8}[pace];this.runSpeed={gentle:100,steady:122,brave:145}[pace]/this.timeScale;this.walkSpeed=this.runSpeed*.58;this.dinoSpeed=this.runSpeed*2;
  this.spawnInterval={gentle:4.5,steady:2.8,brave:1.8}[pace]*this.timeScale;this.spawnIn=1.6;this.nextId=0;this.nextGroupId=0;this.startleSoundAt=-10;this.footstepIn=0;
  this.decor=Array.from({length:18},(_,i)=>({x:.03+this.random()*.94,y:i<10?.39+this.random()*.055:.93+this.random()*.06,size:.35+this.random()*.22,growth:.5+this.random()*.5,moisture:1,nutrition:1,infection:0,bloom:i%4===0,look:{hue:100+this.random()*40,phase:this.random()*TAU,flowers:1+i%3,petal:['#f9ce78','#e7acc4','#c8b4ef'][i%3]}}));
  this.state='playing';this.spawn(true);this.emit('start');
 }
 resize(width,height){this.width=width;this.height=height;}
 scale(){return clamp(this.width/1100,.52,.95);}
 distance(a,b){return Math.hypot((a.x-b.x)*this.width,(a.y-b.y)*this.height);}
 move(p,goal,speed,dt){const dx=(goal.x-p.x)*this.width,dy=(goal.y-p.y)*this.height,d=Math.hypot(dx,dy),step=speed*this.scale()*dt;if(d<=step){p.x=goal.x;p.y=goal.y;return true;}p.x+=dx/d*step/this.width;p.y+=dy/d*step/this.height;return false;}
 pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
 entryIsSafe(from,to){
  // Check the whole approach, including the first stretch inside the picture.
  // Checking only the offscreen spawn point allowed immediate startled exits.
  const s=this.scale(),point={x:this.dino.x+this.dino.facing*25*s/this.width,y:this.dino.y-45*s/this.height},dx=(to.x-from.x)*this.width,dy=(to.y-from.y)*this.height,length2=dx*dx+dy*dy;
  const t=length2?clamp(((point.x-from.x)*this.width*dx+(point.y-from.y)*this.height*dy)/length2,0,1):0;
  return this.distance(point,{x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t})>=215*s;
 }
 entrances(initial=false){
  const gates=[];
  for(const edge of ['left','right'])for(const y of [.53,.665,.80]){
   const direction=edge==='left'?1:-1,from={x:initial?(direction===1?.13:.87):(direction===1?-.07:1.07),y},to={x:direction===1?.22:.78,y};
   if(this.entryIsSafe(from,to)&&!this.people.some(p=>Math.abs(p.y-y)<.07&&(direction===1?p.x<.18:p.x>.82)))gates.push({edge,from,to,direction});
  }
  if(!initial)for(const x of [.2,.5,.8]){
   const from={x,y:1.18},to={x,y:.80};
   if(this.entryIsSafe(from,to)&&!this.people.some(p=>Math.abs(p.x-x)*this.width<70*this.scale()&&p.y>.82))gates.push({edge:'bottom',from,to,direction:x<.5?1:x>.5?-1:0});
  }
  return gates;
 }
 spawn(initial=false){
  if(this.spawned>=this.total||this.people.length>=this.maxPeople)return false;
  const used=this.people.filter(p=>p.status!=='eaten').map(p=>p.item.answer),pool=SC.practiceItems(this).filter(i=>!used.includes(i.answer));if(!pool.length)return false;
  const gates=this.entrances(initial);if(!gates.length)return false;const gate=gates[Math.floor(this.random()*gates.length)],direction=gate.direction||(this.random()<.5?1:-1);
  const base=pool[Math.floor(this.random()*pool.length)],item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);
  const p={id:++this.nextId,item,...gate.from,entrance:gate.edge,entryGoal:gate.edge==='bottom'?{...gate.to}:null,direction,status:'walking',age:0,stateAge:0,cooldown:0,chatCooldown:1,chats:0,group:null,flee:null,fear:0,look:SC.makePerson(this.random)};
  this.people.push(p);this.spawned++;SC.noteTargetAppearance(this);if(p.look.exotic)this.emit('rare-arrival',{look:p.look});this.emit('targets');return true;
 }
 getTargets(){return this.people.filter(p=>p.status!=='eaten'&&p.x>=.045&&p.x<=.955&&p.y<=.96).sort((a,b)=>(a.direction===1?1-a.x:a.x)-(b.direction===1?1-b.x:b.x)||a.id-b.id);}
 getAvailableTargets(){return this.getTargets().filter(p=>this.job?.target!==p);}
 getActiveEntries(){return this.job?[this.job.entry]:[];}
 getTaskStates(){const targets=this.getTargets(),states=new Map();if(this.job?.target&&targets.includes(this.job.target))states.set(this.job.target,'active');for(const entry of this.queue.items){const p=targets.find(p=>!states.has(p)&&SC.matches(entry.text,p.item,this.mode,this.lang,entry.source));if(p)states.set(p,'queued');}return states;}
 workerStatus(){if(['celebrating','won'].includes(this.state))return 'Alla 40 är klara. Mätt och belåten!';const j=this.job;if(!j)return 'Dinosaurien väntar på nästa svar';return j.entry.text+' · '+({chase:'dinosaurien jagar',eat:'mums, mums!',confused:'vem menar du?'}[j.stage]);}
 beginJob(){
  if(this.job||!this.queue.length||this.passed>=this.total)return;const entry=this.queue.take();if(!entry)return;
  const target=this.getAvailableTargets().find(p=>SC.matches(entry.text,p.item,this.mode,this.lang,entry.source));this.job={entry,target,stage:target?'chase':'confused',age:0};this.shots++;this.emit('work',{entry});this.emit(target?'dino-roar':'dino-puzzle');
 }
 dissolve(group){if(!group)return;for(const p of group.members){p.group=null;p.chatCooldown=8;if(['gathering','talking'].includes(p.status)){p.status='walking';p.stateAge=0;}}this.groups=this.groups.filter(g=>g!==group);}
 conversation(members){
  const s=this.scale(),center={x:members.reduce((sum,p)=>sum+p.x,0)/members.length,y:members.reduce((sum,p)=>sum+p.y,0)/members.length};center.x=clamp(center.x,.18,.82);center.y=clamp(center.y,.53,.79);
  const group={id:++this.nextGroupId,members,center,age:0,talkAge:0,duration:2.4+this.random()*1.2};this.groups.push(group);
  members.forEach((p,i)=>{const angle=i*TAU/members.length;Object.assign(p,{group,status:'gathering',stateAge:0,chatGoal:{x:center.x+Math.cos(angle)*38*s/this.width,y:center.y+Math.sin(angle)*26*s/this.height}});p.chats++;});return group;
 }
 findConversations(){
  const eligible=this.people.filter(p=>p.status==='walking'&&!p.entryGoal&&p.chatCooldown<=0&&p.chats<2&&p.age<28*this.timeScale&&p!==this.job?.target&&p.x>.15&&p.x<.85&&this.distance(p,this.dino)>190*this.scale());
  for(const p of eligible){if(p.group)continue;const near=eligible.filter(q=>q!==p&&!q.group&&this.distance(p,q)<180*this.scale());if(near.length)this.conversation([p,...near.slice(0,3)]);}
 }
 startle(p){
  const points=p.look.exotic?25:5;this.score+=points;this.effects.push({x:p.x,y:p.y,age:0,text:'+'+points});this.emit('scare',{target:p,points});
  this.dissolve(p.group);p.entryGoal=null;p.status='startled';p.stateAge=0;p.fear=1;p.cooldown=4.5;p.chatCooldown=9;
  const dx=(p.x-this.dino.x)*this.width,dy=(p.y-this.dino.y)*this.height;let side=Math.abs(dx)>5?Math.sign(dx):p.direction;
  // Keep fleeing decisive at the top/bottom edges, rather than running in place.
  const distance=Math.max(1,Math.hypot(dx,dy)),vx=side*Math.max(.65,Math.abs(dx)/distance),vy=clamp(dy/distance,-.65,.65),length=Math.hypot(vx,vy);p.flee={x:vx/length,y:vy/length,duration:(1.7+this.random()*.8)*clamp(this.width/800,.6,1)};
  if(this.clock-this.startleSoundAt>.24){this.emit('dino-startle');this.startleSoundAt=this.clock;}
 }
 jumpHeight(p){return p.status==='startled'?Math.sin(Math.PI*clamp(p.stateAge/.34,0,1))*23*this.scale():0;}
 updatePeople(dt){
  const s=this.scale();
  for(const p of this.people){
   if(p.status==='eaten')continue;p.age+=dt;p.stateAge+=dt;p.cooldown=Math.max(0,p.cooldown-dt);p.chatCooldown=Math.max(0,p.chatCooldown-dt);
   const scarePoint={x:this.dino.x+this.dino.facing*25*s/this.width,y:this.dino.y-45*s/this.height};
   if(p.x>=.045&&p.x<=.955&&p.y<=.96&&!['startled','running'].includes(p.status)&&p.cooldown<=0&&this.distance(p,scarePoint)<110*s)this.startle(p);
   if(p.status==='startled'){if(p.stateAge>=.34){p.status='running';p.stateAge=0;}continue;}
   if(p.status==='running'){
    p.direction=Math.sign(p.flee.x);p.x+=p.flee.x*this.runSpeed*s*dt/this.width;p.y=clamp(p.y+p.flee.y*this.runSpeed*s*dt/this.height,.49,.96);
    if(p.stateAge>=p.flee.duration){p.status='resting';p.stateAge=0;}
   }else if(p.status==='resting'){if(p.stateAge>=.6){p.status='walking';p.stateAge=0;}}
   else if(p.status==='gathering'){if(this.move(p,p.chatGoal,this.walkSpeed,dt)){p.status='talking';p.stateAge=0;}}
   else if(p.status==='walking'){if(p.entryGoal){if(this.move(p,p.entryGoal,this.walkSpeed,dt))p.entryGoal=null;}else p.x+=p.direction*this.walkSpeed*s*dt/this.width;}
   if(!['running','startled'].includes(p.status))p.fear=Math.max(0,p.fear-dt*1.8);
   // A correct answer already taken by the dinosaur always gets its chase.
   if(this.job?.target===p){p.x=clamp(p.x,.055,.945);p.y=clamp(p.y,.49,.96);}
  }
  for(const group of [...this.groups]){group.age+=dt;if(group.members.every(p=>p.status==='talking'))group.talkAge+=dt;if(group.talkAge>=group.duration||group.age>8*this.timeScale)this.dissolve(group);}
  for(const p of [...this.people])if(p.status!=='eaten'&&p!==this.job?.target&&(p.x<-.12||p.x>1.12)){this.dissolve(p.group);this.people=this.people.filter(q=>q!==p);this.passed++;this.escaped++;this.emit('departure');}
  this.findConversations();SC.noteTargetAppearance(this);
 }
 chaseGoal(p){
  const s=this.scale(),d=this.dino;let facing=Math.abs(p.x-d.x)*this.width>30*s?Math.sign(p.x-d.x):d.facing;
  if(p.x<.16)facing=-1;else if(p.x>.84)facing=1;d.facing=facing;
  const margin=174*s/this.width;return {x:clamp(p.x-facing*75*s/this.width,margin,1-margin),y:clamp(p.y+22*s/this.height,.50,.94)};
 }
 catch(p){this.dissolve(p.group);p.status='eaten';p.stateAge=0;this.job.stage='eat';this.job.age=0;this.dino.moving=false;this.emit('dino-chomp');}
 work(dt){
  this.beginJob();const j=this.job,d=this.dino;d.moving=false;if(!j)return;j.age+=dt;
  if(j.stage==='chase'){
   const goal=this.chaseGoal(j.target);d.moving=this.distance(d,goal)>2*this.scale();const arrived=this.move(d,goal,this.dinoSpeed,dt);
   if(d.moving){d.stride+=dt*12;this.footstepIn-=dt;if(this.footstepIn<=0){this.emit('dino-step');this.footstepIn=.34;}}
   if(arrived&&j.target.cooldown<=0&&!['startled','running'].includes(j.target.status))this.startle(j.target);
   // Let the hop land and show a short fleeing burst before a close catch.
   if(arrived&&j.target.status!=='startled'&&!(j.target.status==='running'&&j.target.stateAge<.4))this.catch(j.target);
  }else if(j.stage==='eat'&&j.age>=1.15){
   this.people=this.people.filter(p=>p!==j.target);const points=j.target.look.exotic?50:10;this.score+=points;this.hits++;this.passed++;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);
   this.effects.push({x:d.x,y:d.y,age:0,text:'+'+points});this.emit('hit',{entry:j.entry,target:j.target,points});this.job=null;
  }else if(j.stage==='confused'&&j.age>=1.25){this.emit('miss',{entry:j.entry,reason:'Dinosaurien letade och bet i luften.'});this.job=null;}
 }
 finish(){this.state='celebrating';this.celebration=0;this.dino.moving=false;this.emit('celebrate');}
 update(dt){
  dt=Math.max(0,Math.min(.05,dt));if(this.state==='celebrating'){this.clock+=dt;this.celebration+=dt;this.effects.forEach(e=>e.age+=dt);if(this.celebration>=2.5){this.state='won';this.emit('end',{won:true,score:this.score,hits:this.hits,shots:this.shots,bestStreak:this.bestStreak,passed:this.passed,escaped:this.escaped});}return;}
  if(this.state!=='playing')return;this.clock+=dt;this.elapsed+=dt;this.effects.forEach(e=>e.age+=dt);this.effects=this.effects.filter(e=>e.age<1.3);
  this.updatePeople(dt);this.work(dt);if(this.passed>=this.total&&!this.job){this.finish();return;}
  this.spawnIn-=dt;if(this.spawnIn<=0){this.spawnIn=this.spawn()?this.spawnInterval:.45;}
 }
}

class DinosaurRenderer extends SC.SceneRenderer{
 draw(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height;c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.clearRect(0,0,w,h);this.landscape();
  const actors=g.people.filter(p=>p.status!=='eaten').map(p=>({y:p.y,draw:()=>this.person(p)}));
  // Sort the large dinosaur at its body's ground position, so its forward
  // neck cannot conceal the startled faces beside the mouth during a chase.
  actors.push({y:g.dino.y-70*g.scale()/h,draw:()=>this.dinosaur()});actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
  this.plants(true);this.labels();
  if(g.job?.stage==='confused'){const d=g.dino,text=g.job.entry.text+' ?',max=w<600?142:220;c.font='bold 16px system-ui';const bw=clamp(c.measureText(text).width+24,52,max),x=clamp(d.x*w-bw/2,8,w-bw-8),y=Math.max(142,d.y*h-215*g.scale());this.round(x,y,bw,34,12,'#fff0ce','#bfa46d');c.fillStyle='#6c6048';c.textAlign='center';c.fillText(text,x+bw/2,y+23,bw-14);}
  if(['celebrating','won'].includes(g.state)){const text='Mätt och belåten!',bw=Math.min(276,w-24);this.round((w-bw)/2,h*.28,bw,46,16,'#fff3cf','#c4a66b');c.fillStyle='#3b6150';c.textAlign='center';c.font='bold 21px system-ui';c.fillText(text,w/2,h*.28+30,bw-16);}
 }
 landscape(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,sky=c.createLinearGradient(0,0,0,h*.6);sky.addColorStop(0,'#648e8c');sky.addColorStop(1,'#d8e6bb');c.fillStyle=sky;c.fillRect(0,0,w,h);
  this.circle(w*.82,h*.22,34,'#f5d994');c.fillStyle='#94b495';c.beginPath();c.moveTo(0,h*.42);c.bezierCurveTo(w*.22,h*.21,w*.34,h*.45,w*.6,h*.34);c.bezierCurveTo(w*.8,h*.22,w*.95,h*.36,w,h*.32);c.lineTo(w,h);c.lineTo(0,h);c.fill();
  c.fillStyle='#a9bd86';c.beginPath();c.ellipse(w*.49,h*.73,w*.76,h*.40,0,0,TAU);c.fill();
  c.strokeStyle='#d2c694';c.lineWidth=h*.115;c.lineCap='round';c.beginPath();c.moveTo(-30,h*.77);c.bezierCurveTo(w*.29,h*.62,w*.56,h*.83,w+30,h*.62);c.stroke();
  for(const [x,y,size] of [[.055,.46,1.1],[.205,.37,.83],[.48,.36,.61],[.72,.37,.78],[.965,.46,1.15]])this.tree(x*w,y*h,size*g.scale());
  this.plants(false);
  for(let i=0;i<34;i++){const x=((i*173+61)%997)/997*w,y=(.46+((i*71)%449)/900)*h;c.strokeStyle='#76986160';c.lineWidth=1.3;c.beginPath();c.moveTo(x-4,y-4);c.lineTo(x,y);c.lineTo(x+3,y-6);c.stroke();}
 }
 tree(x,y,s){
  const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle='#826853';c.lineWidth=18;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(1,-125);c.moveTo(1,-60);c.lineTo(-39,-107);c.moveTo(1,-83);c.lineTo(36,-127);c.stroke();
  for(const [xx,yy,rr,color] of [[-37,-123,44,'#4f816a'],[30,-139,48,'#598c70'],[-8,-164,46,'#679578'],[-24,-141,26,'#729f79']])this.circle(xx,yy,rr,color);this.round(-12,-4,25,7,3,'#796a50');c.restore();
 }
 plants(front){const c=this.ctx,g=this.game;for(const p of g.decor||[]){if((p.y>.9)!==front)continue;c.save();c.translate(p.x*g.width,p.y*g.height);c.scale(p.size*g.scale(),p.size*g.scale());SC.drawPlant(this,p,g.clock);c.restore();}}
 person(p){
  const g=this.game,c=this.ctx,s=g.scale(),jump=this.reduced?0:g.jumpHeight(p),moving=['walking','running','gathering'].includes(p.status),walk=this.reduced||!moving?0:Math.sin(g.clock*(p.status==='running'?22:10)+p.look.phase)*(p.status==='running'?9:4);
  if(jump){c.fillStyle='#254c422d';c.beginPath();c.ellipse(p.x*g.width,p.y*g.height,22*s,5*s,0,0,TAU);c.fill();}
  SC.drawPerson(this,{x:p.x*g.width,feet:p.y*g.height-jump,scale:s,look:p.look,walk,fear:p.fear,shadow:!jump});
  if(['talking','startled'].includes(p.status)){const x=p.x*g.width+24*s,y=p.y*g.height-(54*p.look.height+69)*s*SC.personScale(p.look)-jump;this.round(x-10,y-13,28,22,8,p.status==='startled'?'#ffebae':'#f8f0d8');c.fillStyle='#5c6450';c.font='bold 15px system-ui';c.textAlign='center';c.fillText(p.status==='startled'?'!':'···',x+4,y+3);}
 }
 dinosaur(){
  const c=this.ctx,g=this.game,d=g.dino,s=g.scale(),j=g.job,eating=j?.stage==='eat',confused=j?.stage==='confused',happy=['celebrating','won'].includes(g.state),stride=this.reduced?0:Math.sin(d.stride),bob=this.reduced?0:d.moving?Math.abs(stride)*3:happy?Math.sin(g.clock*6)*3:Math.sin(g.clock*2)*1.5;
  c.save();c.translate(d.x*g.width,d.y*g.height);c.scale(s,s);c.fillStyle='#1c4f3c35';c.beginPath();c.ellipse(-7,3,108,15,0,0,TAU);c.fill();c.scale(d.facing,1);c.translate(0,-bob);
  const poly=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  // Tail, far leg, pear-shaped body, then near leg and tiny arms.
  c.fillStyle='#51876d';c.beginPath();c.moveTo(-31,-100);c.bezierCurveTo(-78,-67,-120,-40,-160,-73);c.bezierCurveTo(-117,-3,-49,-33,-8,-57);c.fill();
  this.round(-25-stride*10,-58,30,61,12,'#416e5d');this.round(-28-stride*10,-12,47,17,7,'#416e5d');
  c.fillStyle='#71a56f';c.beginPath();c.ellipse(0,-86,60,72,-.18,0,TAU);c.fill();c.fillStyle='#c5d38a';c.beginPath();c.ellipse(28,-75,28+(happy?2:0),48,-.12,0,TAU);c.fill();
  for(const [x,y,r] of [[-29,-115,7],[-41,-91,6],[-22,-72,5],[-59,-62,4],[-81,-51,3]])this.circle(x,y,r,'#538967');
  this.round(9+stride*11,-53,32,55,13,'#67995f');this.round(9+stride*11,-11,48,17,7,'#67995f');for(let i=0;i<3;i++)this.round(39+stride*11+i*7,-5,4,8,2,'#f1e4b6');
  c.strokeStyle='#528663';c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(35,-109);c.lineTo(51,-93);c.lineTo(happy?34:63,happy?-73:-96);c.stroke();
  let dip=eating?Math.max(0,1-j.age/.28)*42:j?.stage==='chase'?clamp(1-g.distance(d,j.target)/(190*s),0,1)*65:0;
  const headY=-164+dip,chew=eating&&!this.reduced?Math.sin(j.age*27)*3:0,open=eating?13+chew:confused?Math.max(0,Math.sin(j.age*9))*13:4;
  c.fillStyle='#71a56f';c.beginPath();c.moveTo(8,-114);c.quadraticCurveTo(14,headY-23,49,headY-23);c.lineTo(68,headY+41);c.lineTo(47,-91);c.closePath();c.fill();
  c.fillStyle='#47795f';c.beginPath();c.ellipse(78,headY+22,47,13+open,0,0,TAU);c.fill();
  c.fillStyle='#4e4545';c.beginPath();c.ellipse(89,headY+21,34,open+4,0,0,TAU);c.fill();
  // Move the actual person sprite into the mouth, rotated head first. The
  // clipping plane hides the upper half; the same trousers/legs wiggle outside.
  if(eating){
   const p=j.target,visual=SC.personScale(p.look),progress=clamp((j.age-.72)/.35,0,1),wiggle=this.reduced?0:Math.sin(j.age*42)*4;
   c.save();c.translate(112,headY+23);c.beginPath();c.rect(-2,-42,75,84);c.clip();c.rotate(-Math.PI/2+(this.reduced?0:Math.sin(j.age*29)*.055));c.translate(wiggle,48*visual-progress*75);SC.drawPerson(this,{x:0,feet:0,scale:1,look:p.look,walk:this.reduced?0:Math.sin(j.age*39)*8,fear:1,shadow:false});c.restore();
  }
  this.round(25,headY-28,103,49,18,'#80b278');this.round(59,headY+29+open*.6,64,12,7,'#77a76c');
  for(let i=0;i<4;i++)poly([[78+i*11,headY+18],[86+i*11,headY+18],[81+i*11,headY+25]],'#fff2c9');
  this.circle(111,headY-4,3,'#497152');this.circle(50,headY-14,13,'#f9f1cf');this.circle(54,headY-12,5,'#354d44');this.circle(55,headY-14,1.8,'white');
  c.strokeStyle='#496c4b';c.lineWidth=3;c.beginPath();c.moveTo(38,headY-30);c.quadraticCurveTo(49,headY-37,60,headY-29);c.stroke();
  if(happy){c.beginPath();c.arc(53,headY-10,6,Math.PI,TAU);c.stroke();this.circle(67,headY+4,6,'#bcbd7b');}
  c.restore();
 }
 labels(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,s=g.scale(),states=g.getTaskStates(),hints=SC.pinyinHints(g),boxes=[],blocked=[],targets=g.getTargets().sort((a,b)=>a.y-b.y||a.x-b.x),gap=5;
  const overlaps=(a,b)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
  for(const p of g.people)if(p.status!=='eaten'){const ps=s*SC.personScale(p.look);blocked.push({x:p.x*w-29*ps,y:p.y*h-(54*p.look.height+56)*ps,w:58*ps,h:(54*p.look.height+60)*ps});}
  blocked.push({x:g.dino.x*w-70*s,y:g.dino.y*h-196*s,w:190*s,h:202*s});
  for(const p of targets){
   const font=(SC.isChinese(g.mode)||g.mode==='bopomofo')?22:w<600?14:18,maxWidth=w<600?120:170,hint=hints.has(p);const bw=SC.labelWidth(c,p.item,{font:'bold '+font+'px system-ui',hint:hint?p.item.hint:'',translation:hint?p.item.translation:'',max:maxWidth}),bh=SC.labelHeight(p.item,hint?63:34),ps=s*SC.personScale(p.look),anchor={x:p.x*w,y:p.y*h-(54*p.look.height+59)*ps-g.jumpHeight(p)},candidates=[];
   const top=154,bottom=h-38-bh,cols=Math.max(1,Math.floor((w-16+8)/(maxWidth+8))),dx=cols>1?(w-16-maxWidth)/(cols-1):0;
   // Fallback slots guarantee room for eight labels even on a narrow screen.
   for(let yy=top;yy<=bottom;yy+=bh+9)for(let col=0;col<cols;col++)candidates.push({x:8+col*dx+(maxWidth-bw)/2,y:yy,w:bw,h:bh});
   candidates.sort((a,b)=>Math.hypot(a.x+bw/2-anchor.x,a.y+bh-anchor.y)-Math.hypot(b.x+bw/2-anchor.x,b.y+bh-anchor.y));
   if(w>=700)for(const offset of [bw+6,-bw-6,0])candidates.unshift({x:clamp(anchor.x-bw/2+offset,8,w-bw-8),y:clamp(anchor.y-bh-5,top,bottom),w:bw,h:bh});
   const stable=this.stableLabel(p,anchor,bw,bh,{top:top,bottom:h-38});if(stable)candidates.unshift(stable);
   const box=candidates.find(b=>[...boxes,...blocked].every(a=>!overlaps(a,b)))||candidates.find(b=>boxes.every(a=>!overlaps(a,b)))||candidates[0];boxes.push({...box,id:p.id});
   this.keepLabel(p,anchor,box);this.rememberScoreAnchor(p,box,'#466748','#f2efd8');
   c.strokeStyle='#54725da0';c.lineWidth=1.5;c.beginPath();c.moveTo(anchor.x,anchor.y+4);c.lineTo(box.x+bw/2,box.y+bh);c.stroke();
   const state=states.get(p);c.lineWidth=state==='active'?3:1;this.round(box.x,box.y,bw,bh,10,state?'#a8ed9d':'#fff3d5',state==='active'?'#2f7953':p.look.exotic?'#c5953c':'#a5a473');c.lineWidth=1;
   c.fillStyle='#365749';c.font='bold '+font+'px system-ui';c.textAlign='center';SC.drawLabelText(c,p.item,box,{hint,hintFont:'12px system-ui'});
  }
  this.labelBoxes=boxes;
 }
}
SC.DinosaurGame=DinosaurGame;SC.DinosaurRenderer=DinosaurRenderer;
})(globalThis);
