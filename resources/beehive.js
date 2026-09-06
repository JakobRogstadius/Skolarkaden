/* Five independent bee workers share the same FIFO as the other games. */
(function(root){'use strict';const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
class BeehiveGame{
 constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random,width:1000,height:720});this.menu();}
 emit(type,detail={}){this.onEvent({type,...detail});}
 menu(){this.state='menu';this.clock=0;this.elapsed=0;this.plants=[];this.bees=[];this.effects=[];this.hive={x:.83,y:.32};this.honey=0;this.score=0;this.hits=0;}
 start({mode='swedish',pace='gentle',lang='sv-SE',items=null,hints=true,uppercase=Math.random()<.5}={}){
  this.menu();Object.assign(this,{mode,pace,lang,hints,uppercase});this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Ängen behöver minst ett svar.');
  this.timeScale=mode==='math'?1.4:1;this.duration={gentle:150,steady:130,brave:115}[pace]*this.timeScale;this.honeyGoal={gentle:24,steady:30,brave:36}[pace];this.plantBudget={gentle:44,steady:56,brave:66}[pace];
  this.state='playing';this.shots=0;this.streak=0;this.bestStreak=0;this.nextId=0;this.spawned=0;this.nextSpawn=1.4;this.lastSeason='Vår';this.fullAnnounced=false;this.keeperLook=SC.makePerson(this.random);
  this.bees=Array.from({length:5},(_,i)=>({id:i+1,x:this.hive.x,y:this.hive.y,stage:'idle',job:null,nectar:0,age:0,phase:i*1.8}));
  for(let i=0;i<4;i++)this.spawn(i*1.6);this.emit('start');
 }
 resize(width,height){this.width=width;this.height=height;for(const p of this.plants)this.positionPlant(p);}
 progress(){return this.duration?clamp(this.elapsed/this.duration,0,1):0;}
 season(){const p=this.progress();return p>=1?'Vinter':p>=.64?'Höst':p>=.29?'Sommar':'Vår';}
 timeLeft(){return Math.max(0,this.duration-this.elapsed);}
 positionPlant(p){const cols=this.width<600?3:6,rows=24/cols;p.x=.06+((p.slot%cols+.5+p.jitterX*.10)/cols)*.88;p.y=.49+((Math.floor(p.slot/cols)+.5+p.jitterY*.06)/rows)*.45;}
 spawn(age=0){
  const slots=Array.from({length:24},(_,i)=>i).filter(i=>!this.plants.some(p=>p.slot===i));if(!slots.length||this.spawned>=this.plantBudget)return false;
  const slot=slots[Math.floor(this.random()*slots.length)],p={id:++this.nextId,slot,jitterX:this.random()-.5,jitterY:this.random()-.5,age,youngFor:9+this.random()*4,bloomFor:({gentle:24,steady:21,brave:19}[this.pace])+this.random()*5,status:'young',item:null,claimedBy:null,harvested:false,wiltAge:0,growth:0,moisture:1,nutrition:1,infection:0,look:{hue:95+this.random()*55,phase:this.random()*6.28,flowers:1+Math.floor(this.random()*3),petal:['#ffce84','#f1a4c9','#baa6ed','#fff0af','#9bcee2'][this.nextId%5]}};
  this.positionPlant(p);this.plants.push(p);this.spawned++;return true;
 }
 bloom(p){
  const used=this.getTargets().map(t=>t.item.answer),available=SC.practiceItems(this).filter(i=>!used.includes(i.answer));if(!available.length)return false;
  const base=available[Math.floor(this.random()*available.length)],item=this.mode==='math'?SC.makeMath(base.answer,this.random,this.mathPractice.level):{...base};item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);Object.assign(p,{status:'flower',item,flowerAge:0,growth:1});
  // Late-summer flowers remain available through autumn, until winter or a visit.
  if(this.progress()>=.50){p.lateSeason=true;p.bloomFor=Math.max(p.bloomFor,this.timeLeft()/this.timeScale+.1);}this.emit('bloom',{target:p});return true;
 }
 getAvailableTargets(){return this.getTargets().filter(p=>!p.claimedBy);}
 getActiveEntries(){return this.bees.flatMap(b=>b.job?[b.job.entry]:[]);}
 getTargets(){return this.plants.filter(p=>p.status==='flower'&&!p.harvested).sort((a,b)=>(a.bloomFor-a.flowerAge)-(b.bloomFor-b.flowerAge)||a.id-b.id);}
 getTaskStates(){const states=new Map(),targets=this.getTargets();for(const p of targets)if(p.claimedBy)states.set(p,'active');for(const entry of this.queue.items){const p=targets.find(p=>!states.has(p)&&SC.matches(entry.text,p.item,this.mode,this.lang,entry.source));if(p)states.set(p,'queued');}return states;}
 workerStatus(){if(this.state==='mourning'||this.state==='lost')return 'Honungen räckte inte över vintern. Försök igen!';if(this.state==='celebrating'||this.state==='won')return 'Alla fem bin har mat för hela vintern!';const idle=this.bees.filter(b=>b.stage==='idle').length;return idle+' lediga bin · '+(5-idle)+' ute på uppdrag'+(this.honey>=this.honeyGoal?' · Förrådet är fullt! Samla bonus.':'');}
 pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
 dispatch(){
  for(const b of this.bees){if(b.stage!=='idle'||!this.queue.length)continue;const entry=this.queue.take();if(!entry)break;
   const target=this.getTargets().find(p=>!p.claimedBy&&SC.matches(entry.text,p.item,this.mode,this.lang,entry.source));
   b.job={entry,target};b.age=0;b.nectar=0;this.shots++;
   if(target){target.claimedBy=b.id;b.stage='outbound';this.emit('bee-flight',{entry});}
   else{b.stage='confused';b.wander={x:.2+this.random()*.57,y:.38+this.random()*.32};this.emit('think',{entry});}
  }
 }
 move(b,target,dt,speed=.15){
  const dx=(target.x-b.x)*1.35,dy=target.y-b.y,d=Math.hypot(dx,dy);
  if(d<=speed*dt){b.x=target.x;b.y=target.y;b.tilt=0;return true;}
  const ux=dx/d,uy=dy/d,near=clamp(d/.085,0,1),wiggle=near*(.50*Math.sin(b.age*2.7+b.phase)+.24*Math.sin(b.age*6.1+b.phase*1.7));
  const norm=Math.hypot(1,wiggle),step=speed*dt*(.92+.08*Math.sin(b.age*1.8+b.phase)),vx=(ux-uy*wiggle)/norm,vy=(uy+ux*wiggle)/norm;
  b.x=clamp(b.x+vx*step/1.35,.02,.98);b.y=clamp(b.y+vy*step,.14,.97);b.tilt=clamp(vy*.32,-.3,.3);return false;
 }
 work(dt){
  this.dispatch();for(const b of this.bees){b.age+=dt;const j=b.job;if(!j)continue;
   if(b.stage==='outbound'){
    if(j.target.status!=='flower'){j.target.claimedBy=null;b.stage='return';b.age=0;this.emit('miss',{entry:j.entry,reason:'Blomman hann vissna.'});}
    else if(this.move(b,{x:j.target.x,y:j.target.y-.045},dt)){b.stage='gather';b.age=0;this.emit('nectar');}
   }else if(b.stage==='gather'){
    if(j.target.status!=='flower'){j.target.claimedBy=null;b.stage='return';b.age=0;this.emit('miss',{entry:j.entry,reason:'Blomman hann vissna.'});}
    else if(b.age>=.8){j.target.harvested=true;j.target.claimedBy=null;if(j.target.lateSeason)j.target.bloomFor=Math.min(j.target.bloomFor,j.target.flowerAge+4);b.nectar=1;b.stage='return';b.age=0;this.emit('targets');}
   }else if(b.stage==='confused'){
    this.move(b,{x:b.wander.x+Math.sin(b.age*3)*.07,y:b.wander.y+Math.cos(b.age*3)*.045},dt,.115);
    if(b.age>=3.6){b.stage='return';b.age=0;}
   }else if(b.stage==='return'&&this.move(b,this.hive,dt)){
    if(b.nectar){this.honey++;this.hits++;this.score+=100;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);this.effects.push({x:b.x,y:b.y,age:0});this.emit('hit',{entry:j.entry,points:100});
     if(this.honey>=this.honeyGoal&&!this.fullAnnounced){this.fullAnnounced=true;this.emit('hive-full');}
    }b.stage='idle';b.job=null;b.nectar=0;b.age=0;
   }
  }
 }
 endResult(won){this.emit('end',{won,score:this.score,hits:this.hits,shots:this.shots,bestStreak:this.bestStreak,honey:this.honey,honeyGoal:this.honeyGoal});}
 winter(){
  const won=this.honey>=this.honeyGoal;if(won&&this.keeperLook.exotic)this.emit('rare-earned',{look:this.keeperLook,bonus:0});this.state=won?'celebrating':'mourning';this.endingLeft=won?4:3;this.emit(won?'celebrate':'loss-pause');
  for(const b of this.bees){b.job=null;b.nectar=0;b.stage=won?'sheltered':'hungry';}for(const p of this.plants)p.claimedBy=null;
 }
 update(dt){
  dt=clamp(dt,0,.05);if(this.state==='paused')return;
  if(['celebrating','mourning'].includes(this.state)){this.clock+=dt;this.endingLeft=Math.max(0,this.endingLeft-dt);if(this.endingLeft<1e-8){const won=this.state==='celebrating';this.state=won?'won':'lost';this.endResult(won);}return;}
  if(this.state!=='playing'){if(this.state==='menu')this.clock+=dt;return;}
  dt=Math.min(dt,this.timeLeft());this.mathPractice?.update(dt);this.clock+=dt;this.elapsed=Math.min(this.duration,this.elapsed+dt);
  const season=this.season();if(season!==this.lastSeason){this.lastSeason=season;this.emit('season');}
  // Winter is the deadline: nectar still outside the hive cannot count.
  if(this.timeLeft()<1e-8){this.elapsed=this.duration;this.winter();return;}
  const seasonDt=dt/this.timeScale,progress=this.progress();
  this.nextSpawn-=seasonDt;
  if(progress<.64&&this.nextSpawn<=0){const crest=Math.sin(Math.min(1,progress/.64)*Math.PI),base={gentle:2.8,steady:1.95,brave:1.48}[this.pace];this.nextSpawn=this.spawn()?base*(1.2-.43*crest):.3;}
  for(const p of this.plants){p.age+=seasonDt;if(p.status==='young'){p.growth=clamp(p.age/p.youngFor,0,1);if(p.growth>=1)this.bloom(p);}
   else if(p.status==='flower'){p.flowerAge+=seasonDt;if(p.flowerAge>=p.bloomFor){p.status='wilt';p.wiltAge=0;this.emit('targets');}}
   else p.wiltAge+=seasonDt;
  }
  this.plants=this.plants.filter(p=>p.status!=='wilt'||p.wiltAge<7);this.work(dt);
  for(const e of this.effects)e.age+=dt;this.effects=this.effects.filter(e=>e.age<1);
 }
}
class BeehiveRenderer extends SC.SceneRenderer{
 point(p){return {x:p.x*this.game.width,y:p.y*this.game.height};}
 draw(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,t=g.progress(),winter=t>=1,autumn=clamp((t-.64)/.36,0,1);c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.clearRect(0,0,w,h);
  const sky=c.createLinearGradient(0,0,0,h*.65);sky.addColorStop(0,winter?'#9badc0':autumn?'#dab993':'#afd7d3');sky.addColorStop(1,winter?'#e0e7ea':autumn?'#ecd4a6':'#e6e8bd');c.fillStyle=sky;c.fillRect(0,0,w,h);
  this.circle(w*.5,160,25,winter?'#f3f1dc':'#ffe8a4');c.fillStyle=winter?'#c1d1d8':autumn>.4?'#b0ad75':'#91b88a';c.beginPath();c.moveTo(0,h*.46);c.quadraticCurveTo(w*.28,h*.34,w*.6,h*.46);c.quadraticCurveTo(w*.8,h*.39,w,h*.44);c.lineTo(w,h);c.lineTo(0,h);c.fill();
  const field=c.createLinearGradient(0,h*.48,0,h);field.addColorStop(0,winter?'#e1e9e9':autumn>.5?'#bbaa70':'#a9c68e');field.addColorStop(1,winter?'#f4f4e9':autumn>.5?'#c8b079':'#c8d79c');c.fillStyle=field;c.fillRect(0,h*.48,w,h*.52);
  this.tree();this.hive();if(g.keeperLook)SC.drawPerson(this,{x:w*.65,feet:h*.447,scale:w<600?.4:.57,look:g.keeperLook,anger:g.state==='mourning'||g.state==='lost'?.9:0,wave:g.state==='celebrating'?.01+g.clock*7:0});
  const states=g.getTaskStates();for(const p of [...g.plants].sort((a,b)=>a.y-b.y))this.plant(p,states.get(p));
  for(const b of g.bees)this.bee(b);
  for(const e of g.effects){const p=this.point(e);c.globalAlpha=1-e.age;c.fillStyle='#815021';c.font='bold 16px system-ui';c.textAlign='center';c.fillText('✦',p.x,p.y-40-e.age*25);}c.globalAlpha=1;
  if(winter){c.fillStyle='#ffffffbb';for(let i=0;i<65;i++){const x=(i*143.7+Math.sin(g.clock+i)*12)%w,y=(i*67+g.clock*17)%h;this.circle(x,y,1.4+i%3*.6,'#ffffffc9');}const bw=Math.min(370,w-24);this.round((w-bw)/2,h-62,bw,43,12,g.honey>=g.honeyGoal?'#3e6654':'#566674','#f7e6b4');c.fillStyle='#fff7db';c.font='bold '+(w<500?14:18)+'px system-ui';c.textAlign='center';c.fillText(g.honey>=g.honeyGoal?'Vintermys! Honungen räcker.':'Honungen tog slut. Bina svälter.',w/2,h-35,bw-12);}
 }
 tree(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,t=g.progress(),s=Math.min(w/850,.95),x=w*.17,y=h*.435,leafGrow=clamp((t-.035)/.2,0,1),fall=clamp((t-.79)/.19,0,1),autumn=clamp((t-.64)/.27,0,1);
  c.save();c.translate(x,y);c.scale(s,s);c.lineCap='round';
  const branches=[[0,0,-2,-110,11],[-2,-48,-55,-110,6],[-1,-66,54,-132,6],[-2,-101,-29,-155,5],[1,-105,20,-168,4],[-40,-93,-62,-148,3],[31,-104,73,-109,3]];
  for(const [a,b,xx,yy,l] of branches){c.strokeStyle='#73543c';c.lineWidth=l;c.beginPath();c.moveTo(a,b);c.lineTo(xx,yy);c.stroke();}
  for(let i=0;i<48;i++){
   const angle=i*2.399,r=Math.sqrt((i+.5)/48)*73,xx=Math.cos(angle)*r,yy=-118+Math.sin(angle)*r*.67,phase=(i*17%47)/47,drop=clamp((fall-phase)*6,0,1),fallen=drop>0;
   if(t>=1)continue;
   const hue=autumn<.33?100-autumn*130:autumn<.7?57-(autumn-.33)*125:10,light=autumn>.7?48-(autumn-.7)*60:51;
   c.save();c.translate(xx+Math.sin(i+drop*4)*30*drop,yy+(6+(i%5)*3-yy)*drop);c.rotate(angle+(fallen?drop*4:Math.sin(g.clock+i)*.06));c.fillStyle=`hsl(${hue} ${autumn>.8?36:55}% ${light}%)`;c.beginPath();c.ellipse(0,0,(fallen?9:10*leafGrow),(fallen?4:5*leafGrow),0,0,6.28);c.fill();c.restore();
  }
  if(t>=1){c.strokeStyle='#f4f5eb';c.lineWidth=4;for(const [a,b,xx,yy] of branches.slice(1)){c.beginPath();c.moveTo(a,b-4);c.lineTo(xx,yy-4);c.stroke();}this.round(-78,1,154,14,7,'#f3f5ec');}
  c.restore();
 }
 hive(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,p=this.point(g.hive),s=Math.min(w/700,.86),fill=clamp(g.honey/g.honeyGoal,0,1);c.save();c.translate(p.x,p.y);c.scale(s,s);
  for(const x of [-40,40])this.round(x-4,63,8,35,2,'#846247');this.round(-63,-68,126,139,16,'#bf864b','#8c653f');
  c.lineWidth=2;for(let y=-43;y<70;y+=27){c.strokeStyle='#9f6f3e';c.beginPath();c.moveTo(-60,y);c.lineTo(60,y);c.stroke();}
  // Cutaway: clip liquid and hexagonal comb to the same interior window.
  this.round(-49,-52,98,112,12,'#573e30');c.save();c.beginPath();c.roundRect(-45,-48,90,104,9);c.clip();c.fillStyle='#eebf4e';c.fillRect(-45,56-104*fill,90,104*fill);
  if(fill){c.fillStyle='#ffe67b';c.beginPath();c.moveTo(-45,56-104*fill);for(let x=-45;x<=45;x+=3)c.lineTo(x,56-104*fill+Math.sin(x*.15+g.clock*2)*2);c.lineTo(45,60);c.lineTo(-45,60);c.fill();}
  c.strokeStyle='#e3b36c66';c.lineWidth=1;for(let row=0;row<7;row++)for(let col=0;col<5;col++){const xx=-44+col*23+(row%2)*11.5,yy=-46+row*18;c.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;c.lineTo(xx+Math.cos(a)*12,yy+Math.sin(a)*12);}c.closePath();c.stroke();}c.restore();
  this.round(-70,-79,140,20,7,'#775540');if(g.progress()>=1)this.round(-72,-86,144,12,6,'#f9f8ee');
  c.restore();
 }
 plant(p,state){
  const c=this.ctx,g=this.game,q=this.point(p),s=g.width<600?(g.mode==='chinese'&&g.hints?.16:.26):(g.mode==='chinese'&&g.hints?.28:.38),winter=g.progress()>=1,dead=p.status==='wilt'||winter,fade=winter?.22:dead?clamp(1-p.wiltAge/7,0,1):1;c.save();c.translate(q.x,q.y);c.scale(s,s);c.globalAlpha=fade;
  SC.drawPlant(this,{...p,bloom:p.status==='flower'&&!winter,dead},g.clock);c.restore();c.globalAlpha=1;
  if(p.status!=='flower'||p.harvested||winter)return;
  const bw=Math.min(g.width<600?100:144,g.width/(g.width<600?3:6)-7),bh=g.mode==='chinese'&&g.hints?41:28,x=clamp(q.x-bw/2,4,g.width-bw-4),y=q.y-133*s-bh;
  this.round(x,y,bw,bh,8,state?'#ffe176':'#fff9e1',state==='active'?'#b77a2c':'#b5a577');c.fillStyle='#50432d';c.font='bold '+(['chinese','bopomofo'].includes(g.mode)?20:g.width<600?12:15)+'px system-ui';c.textAlign='center';c.fillText(p.item.label,x+bw/2,y+19,bw-10);
  if(g.mode==='chinese'&&g.hints){c.font='10px system-ui';c.fillText(p.item.hint||'',x+bw/2,y+32,bw-8);}
  const left=clamp(1-p.flowerAge/p.bloomFor,0,1);this.round(x+7,y+bh-3,Math.max(1,(bw-14)*left),2,1,left<.23?'#d17649':'#8cb773');
 }
 bee(b){
  const c=this.ctx,g=this.game,p=this.point(b),s=g.width<600?.68:.9,idle=b.stage==='idle',winter=g.progress()>=1;
  if(winter){p.x=g.hive.x*g.width+(b.id<=3?b.id-2:b.id-4.5)*22;p.y=g.hive.y*g.height+(b.id<=3?25:44);}
  else if(idle){p.x+=(b.id-3)*19+Math.cos(b.phase+g.clock)*3;p.y+=Math.min(g.width/700,.86)*112+Math.sin(b.phase+g.clock)*3;}
  const tilt=!winter&&!idle?(b.tilt||0):0;c.save();c.translate(p.x,p.y);c.scale(s,s);c.rotate(tilt);
  const wing=this.reduced||winter?.6:.6+Math.sin(g.clock*34+b.phase)*.32;
  c.fillStyle='#f9fff5ba';for(const x of [-5,5]){c.beginPath();c.ellipse(x,-9,9,5*wing+.5,x/10,0,6.28);c.fill();}
  c.fillStyle=b.stage==='hungry'?'#a7a28e':'#f5c658';c.beginPath();c.ellipse(0,0,13,8,0,0,6.28);c.fill();c.strokeStyle='#615032';c.lineWidth=3;for(const x of [-4,3]){c.beginPath();c.moveTo(x,-6);c.lineTo(x,6);c.stroke();}this.circle(10,-2,1.6,'#443c31');
  if(b.nectar)this.circle(-8,9,5,'#ffda66');c.textAlign='center';
  if(b.stage==='confused'){const text=b.job.entry.text+' ?';this.round(-55,-40,110,22,7,'#fff2cf','#c4ad76');c.fillStyle='#66553a';c.font='bold 12px system-ui';c.fillText(text,0,-25,101);}
  c.restore();
 }
}
SC.BeehiveGame=BeehiveGame;SC.BeehiveRenderer=BeehiveRenderer;
})(globalThis);
