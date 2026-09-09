/* Äggröra. Each egg keeps its target identity through hatching and combat. */
(function(root){
'use strict';
const SC=root.Starlight,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
const harmless=e=>['burning','dying','dead'].includes(e.stage);
class EggGame{
 constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random,width:1000,height:700});this.menu();}
 emit(type,detail={}){this.onEvent({type,...detail});}
 menu(){Object.assign(this,{state:'menu',clock:0,elapsed:0,eggs:[],people:[],shells:[],effects:[],job:null,score:0,survivorBonus:0,hits:0,shots:0,streak:0,bestStreak:0,nextId:0,celebration:0,scareSoundAt:-10});this.player=null;}
 resize(width,height){Object.assign(this,{width,height});}
 scale(){return clamp(this.width/1100,.5,.95);}
 distance(a,b){return Math.hypot((a.x-b.x)*this.width,(a.y-b.y)*this.height);}
 move(p,to,speed,dt){const d=this.distance(p,to),step=speed*this.scale()*dt;if(d<=step){p.x=to.x;p.y=to.y;return true;}p.x+=(to.x-p.x)*step/d;p.y+=(to.y-p.y)*step/d;return false;}
 point(){return {x:.1+this.random()*.8,y:.47+this.random()*.45};}
 start({mode='swedish',pace='gentle',lang='sv-SE',items=null,uppercase=Math.random()<.5}={}){
  this.menu();Object.assign(this,{mode,pace,lang,uppercase});this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Välj en övning med minst ett svar.');
  this.timeScale=SC.isMath(mode)?1.4:1;this.total={gentle:10,steady:16,brave:21}[pace];this.walkSpeed=34/this.timeScale;this.runSpeed=88/this.timeScale;this.alienSpeed=this.runSpeed*2;this.playerSpeed=this.runSpeed*2;
  // A human crew, drawn by the shared parameterised cast (adult men and women).
  this.people=Array.from({length:6},(_,i)=>{let first=true;const look=SC.makePerson(()=>{if(first){first=false;return this.random()*.8;}return this.random();});look.hat=false;const goal=i===0?{x:.5,y:.86}:{x:.19+i*.12,y:.55+(i%3)*.12};return {id:i,x:.5+(i%2?.04:-.04),y:1.08+i*.10,status:'entering',age:0,goal,look,fear:0,facing:1,player:i===0,attacker:null,wait:0};});
  this.player=this.people[0];this.player.look.shirt='#e6ac5e';this.player.look.pants='#36444c';
  this.flameRange=130;const positions=[];
  for(let i=0;i<this.total;i++){let best=null,clearance=-1;for(let j=0;j<32;j++){const q={x:.12+this.random()*.76,y:.48+this.random()*.44},d=positions.length?Math.min(...positions.map(p=>Math.hypot((q.x-p.x)/.14,(q.y-p.y)/.10))):1;if(d>clearance){best=q;clearance=d;}}positions.push(best);}
  this.eggs=Array.from({length:this.total},(_,i)=>({id:++this.nextId,form:'egg',stage:'dormant',...positions[i],home:null,age:0,phase:this.random()*TAU,crackAt:(7+i*(40/this.total)+this.random()*7)*this.timeScale,hatchTime:(9+this.random()*6)*this.timeScale/1.15,item:null,appearedAt:null,entry:null,victim:null,facing:1,goal:null,stride:0,searchAge:0}));
  this.eggs.forEach(e=>e.home={x:e.x,y:e.y});
  // Persistent geometry; resizing and drawing never consume gameplay randomness.
  this.resin=Array.from({length:34},()=>({x:this.random(),y:.38+this.random()*.6,size:.45+this.random(),phase:this.random()*TAU}));
  this.state='playing';this.emit('start');
 }
 pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
 living(){return this.people.filter(p=>p.status!=='dead');}
 getTargets(){return this.eggs.filter(e=>e.item&&!harmless(e)).sort((a,b)=>(b.form==='alien')-(a.form==='alien')||a.crackAt-b.crackAt);}
 getAvailableTargets(){return this.getTargets().filter(e=>e!==this.job?.target);}
 getActiveEntries(){return [...new Set([this.job?.entry,...this.eggs.filter(e=>e.stage!=='dead').map(e=>e.entry)].filter(Boolean))];}
 getTaskStates(){const states=new Map();if(this.job?.target&&!harmless(this.job.target))states.set(this.job.target,'active');for(const entry of this.queue.items){const e=this.getTargets().find(e=>!states.has(e)&&SC.matches(entry.text,e.item,this.mode,this.lang,entry.source));if(e)states.set(e,'queued');}return states;}
 workerStatus(){return this.player?.status==='dead'?'Besättningen försöker komma undan':this.job?'Eldkastaren arbetar':'Väntar på sprickor';}
 crack(e){
  if(e.stage!=='dormant')return;const items=SC.practiceItems(this),used=this.getTargets().map(t=>t.item.answer),pool=items.filter(i=>!used.includes(i.answer)),choices=pool.length?pool:items,base=choices[Math.floor(this.random()*choices.length)];
  e.item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};e.item.label=SC.lessonLabel(e.item.label,this.mode,this.uppercase);e.stage='cracking';e.age=0;e.appearedAt=this.clock;SC.noteTargetAppearance(this);this.emit('egg-crack');
 }
 hatch(e){
  this.shells.push({x:e.home.x,y:e.home.y,phase:e.phase});e.form='alien';e.stage='wandering';e.age=0;e.goal=this.point();e.searchAge=0;this.emit('egg-hatch');
 }
 release(e){if(e.victim){const p=e.victim;if(p.status!=='dead'&&p.attacker===e){p.attacker=null;p.status=p.player?'ready':'running';p.age=0;p.goal=this.escapeGoal(p,e);}e.victim=null;}}
 ignite(e,entry){
  if(harmless(e))return;
  // Capture rescue points before release clears the victim and chewing state.
  const rescuing=e.stage==='chewing'&&e.victim?.status==='chewing'&&e.victim.attacker===e;
  e.burnPoints=e.form==='egg'?10:rescuing?(e.victim.player?30:20):15;
  this.release(e);e.entry=entry;e.stage='burning';e.age=0;e.goal=null;this.emit('egg-flame');
 }
 flamePose(e){const p=this.player,s=this.scale();return {x:p.x*this.width+p.facing*60*s,y:p.y*this.height-39*s,tx:e.x*this.width,ty:e.y*this.height-(e.stage==='chewing'&&e.victim?(54*e.victim.look.height+26)*SC.personScale(e.victim.look):e.form==='egg'?32:12)*s};}
 inFlameRange(e){const a=this.flamePose(e);return Math.hypot(a.tx-a.x,a.ty-a.y)<=this.flameRange*this.scale();}
 work(dt){
  const p=this.player;p.moving=false;if(p.status==='dead'||p.status==='entering')return;
  if(!this.job&&this.queue.length){const entry=this.queue.take();if(entry){const target=this.getAvailableTargets().find(e=>SC.matches(entry.text,e.item,this.mode,this.lang,entry.source));this.shots++;this.job={entry,target,age:0,firing:false};if(!target)this.emit('think',{entry});}}
  const j=this.job;if(!j)return;
  if(j.target&&!j.firing){
   const e=j.target;if(harmless(e)){this.job=null;return;}p.facing=e.x<p.x?-1:1;
   if(!this.inFlameRange(e)&&p.status!=='chewing'){p.moving=true;this.move(p,e,this.playerSpeed,dt);}
   if(!this.inFlameRange(e))return;
   this.ignite(e,j.entry);j.firing=true;j.age=0;
  }
  j.age+=dt;
  if(j.age>=(j.target?.6:.9)){if(!j.target)this.emit('miss',{entry:j.entry});this.job=null;}
 }
 escapeGoal(p,e){
  // Sample escape directions inside the room, avoiding wall-trapped running.
  const dx=(p.x-e.x)*this.width,dy=(p.y-e.y)*this.height,angle=Math.atan2(dy,dx),candidates=[];
  for(const turn of [0,-.65,.65,-1.3,1.3,Math.PI]){const a=angle+turn,q={x:clamp(p.x+Math.cos(a)*190*this.scale()/this.width,.07,.93),y:clamp(p.y+Math.sin(a)*190*this.scale()/this.height,.46,.95)};candidates.push(q);}
  return candidates.sort((a,b)=>(this.distance(b,e)+this.distance(b,p)*.25)-(this.distance(a,e)+this.distance(a,p)*.25))[0];
 }
 startle(p,e){p.status='startled';p.age=0;p.fear=1;p.goal=this.escapeGoal(p,e);if(this.clock-this.scareSoundAt>.4){this.emit('dino-startle');this.scareSoundAt=this.clock;}}
 jumpHeight(p){if(p.status==='startled')return Math.sin(Math.PI*clamp(p.age/.3,0,1))*19*this.scale();return 0;}
 updatePeople(dt){
  const aliens=this.eggs.filter(e=>e.form==='alien'&&!harmless(e));
  for(const p of this.people){
   p.age+=dt;if(p.status==='dead'||p.status==='chewing')continue;
   if(p.status==='entering'){if(this.move(p,p.goal,(p.player?this.playerSpeed:this.runSpeed)*1.15,dt)){p.status=p.player?'ready':'walking';p.age=0;p.wait=.6+this.random();p.goal=this.point();}continue;}
   if(p.player)continue;
   const near=aliens.filter(e=>e.stage!=='chewing').sort((a,b)=>this.distance(p,a)-this.distance(p,b))[0];
   if(near&&this.distance(p,near)<125*this.scale()&&!['startled','running'].includes(p.status))this.startle(p,near);
   if(p.status==='startled'){if(p.age>=.3){p.status='running';p.age=0;}continue;}
   if(p.status==='running'){p.fear=1;if(near&&this.distance(p,p.goal)<8*this.scale())p.goal=this.escapeGoal(p,near);this.move(p,p.goal,this.runSpeed,dt);if(p.age>2.2){p.status='walking';p.age=0;p.goal=this.point();p.wait=.4;}continue;}
   p.fear=Math.max(0,p.fear-dt);if(p.wait>0){p.wait-=dt;continue;}p.facing=p.goal.x<p.x?-1:1;
   if(this.move(p,p.goal,this.walkSpeed,dt)){p.wait=1.1+this.random()*2;p.goal=this.point();}
  }
 }
 catch(e,p){e.x=p.x;e.y=p.y;e.stage='chewing';e.age=0;e.victim=p;p.status='chewing';p.age=0;p.attacker=e;p.fear=1;this.emit('egg-bite');}
 killHuman(e){const p=e.victim;if(!p||p.status==='dead'){e.victim=null;e.stage='wandering';return;}p.status='dead';p.age=0;p.attacker=null;p.fallSide=e.facing;e.victim=null;e.stage='wandering';e.age=0;e.searchAge=0;e.goal=this.point();if(p.player){this.job=null;this.emit('player-down');}this.emit('crew-down');}
 updateEggs(dt){
  for(const e of this.eggs){
   e.age+=dt;
   if(e.stage==='dead')continue;
   if(this.advanceBurn(e))continue;
   if(e.form==='egg'){
    if(e.stage==='dormant'&&this.elapsed>=e.crackAt)this.crack(e);
    else if(e.stage==='cracking'&&e.age>=e.hatchTime*.64){e.stage='hatching';e.age=0;}
    else if(e.stage==='hatching'&&e.age>=e.hatchTime*.36)this.hatch(e);
    continue;
   }
   if(e.stage==='chewing'){
    const p=e.victim;if(!p||p.status==='dead'||p.attacker!==e){this.release(e);e.stage='wandering';e.goal=this.point();continue;}
    e.x=p.x;e.y=p.y;if(e.age>=2.5*this.timeScale)this.killHuman(e);continue;
   }
   const humans=this.living().filter(p=>!p.attacker&&p.y<=.98).sort((a,b)=>this.distance(e,a)-this.distance(e,b)),near=humans[0];e.searchAge+=dt;
   // As with the dinosaur: wander, pursue a nearby person at twice running
   // speed, attach to the face, then resume wandering. Eventually search out
   // remaining crew, so an unattended round cannot stall in separate corners.
   const pursue=near&&(this.distance(e,near)<175*this.scale()||e.stage==='chasing');
   if(pursue){e.stage='chasing';e.goal=near;}else{e.stage='wandering';if(near&&e.searchAge>5)e.goal={x:near.x,y:near.y};if(!e.goal)e.goal=this.point();}
   const target=e.goal,dx=target.x-e.x;e.facing=Math.abs(dx)>.001?Math.sign(dx):e.facing;e.stride+=dt*(pursue?22:9);
   const arrived=this.move(e,target,pursue?this.alienSpeed:this.walkSpeed*.95,dt);
   if(pursue&&near&&!near.attacker&&near.status!=='startled'&&this.distance(e,near)<14*this.scale())this.catch(e,near);
   else if(arrived&&!pursue){e.goal=this.point();e.searchAge=0;}
  }
 }
 advanceBurn(e){
  if(e.stage==='burning'){if(e.age>=.9){e.stage=e.form==='alien'?'dying':'dead';e.age=0;if(e.stage==='dead')this.destroyed(e);}return true;}
  if(e.stage==='dying'){if(e.age>=.7){e.stage='dead';e.age=0;this.destroyed(e);}return true;}return false;
 }
 destroyed(e){this.hits++;this.score+=e.burnPoints;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);this.emit('hit',{entry:e.entry,target:e,points:e.burnPoints});}
 finish(won){if(this.state!=='playing')return;this.won=won;this.survivorBonus=this.living().length*20;this.score+=this.survivorBonus;this.state=won?'celebrating':'mourning';this.celebration=0;this.job=null;this.emit(won?'celebrate':'loss-pause');}
 update(dt){
  dt=clamp(dt,0,.05);
  if(['celebrating','mourning'].includes(this.state)){this.clock+=dt;this.celebration+=dt;for(const e of this.eggs)if(['burning','dying'].includes(e.stage)){e.age+=dt;this.advanceBurn(e);}for(const p of this.people)if(p.status==='dead')p.age+=dt;
   if(this.celebration>=3){this.state=this.won?'won':'lost';this.emit('end',{won:this.won,score:this.score,hits:this.hits,shots:this.shots,bestStreak:this.bestStreak,survivors:this.living().length,survivorBonus:this.survivorBonus,totalHumans:this.people.length,total:this.total});}return;
  }
  if(this.state!=='playing')return;this.clock+=dt;this.elapsed+=dt;
  // Answers affect attackers before their movement/catch step this frame.
  this.work(dt);this.updatePeople(dt);this.updateEggs(dt);
  if(!this.living().length){this.finish(false);return;}
  if(this.eggs.every(e=>e.stage==='dead'))this.finish(true);
 }
}

class EggRenderer extends SC.SceneRenderer{
 draw(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height;c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.clearRect(0,0,w,h);c.globalAlpha=1;c.lineWidth=1;this.room();
  for(const shell of g.shells)this.shell(shell);
  for(const p of g.people)if(p.status==='dead')this.person(p);
  const actors=[...g.eggs.map(e=>({y:e.y+(e.stage==='chewing'?.001:0),draw:()=>this.enemy(e)})),...g.people.filter(p=>p.status!=='dead').map(p=>({y:p.y,draw:()=>this.person(p)}))];actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
  if(g.job?.firing)this.flame();this.labels();
  if(g.job&&!g.job.target&&g.player.status!=='dead'){const p=g.player,text=g.job.entry.text+' ?',bw=SC.labelWidth(c,text,{font:'bold 16px system-ui',max:160});this.round(clamp(p.x*w-bw/2,8,w-bw-8),p.y*h-125*g.scale(),bw,32,8,'#253334','#c4a774');c.fillStyle='#f0dfb3';c.textAlign='center';c.font='bold 16px system-ui';c.fillText(text,clamp(p.x*w,bw/2+8,w-bw/2-8),p.y*h-125*g.scale()+22,bw-12);}
 }
 room(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,t=this.reduced?0:g.clock;
  const wall=c.createLinearGradient(0,0,0,h);wall.addColorStop(0,'#080f17');wall.addColorStop(.42,'#162c32');wall.addColorStop(1,'#0b131a');c.fillStyle=wall;c.fillRect(0,0,w,h);
  // Bulkhead ribs, recessed hatch, cables, misted viewport and warning lights.
  for(let i=0;i<7;i++){const x=(i/6)*w;c.strokeStyle='#253c42';c.lineWidth=11;c.beginPath();c.moveTo(x,-15);c.lineTo(w*.5+(x-w*.5)*.84,h*.34);c.stroke();c.strokeStyle='#0a171e';c.lineWidth=5;c.stroke();}
  this.round(w*.37,h*.105,w*.26,h*.3,12,'#08151c','#3d5658');this.round(w*.393,h*.13,w*.214,h*.27,5,'#10242c','#1b373e');
  c.strokeStyle='#52706c';c.lineWidth=2;c.beginPath();c.moveTo(w*.5,h*.15);c.lineTo(w*.5,h*.4);c.stroke();
  for(let i=0;i<3;i++)this.round(w*.43+i*w*.06,h*.12,w*.035,3,1,i===1?'#d0965c':'#6e9c85');
  for(const side of [.08,.78]){this.round(w*side,h*.2,w*.14,h*.14,9,'#0b1e27','#385358');for(let i=0;i<4;i++){c.strokeStyle='#233d42';c.lineWidth=2;c.beginPath();c.moveTo(w*(side+.02),h*(.225+i*.027));c.lineTo(w*(side+.12),h*(.225+i*.027));c.stroke();}}
  const floor=c.createLinearGradient(0,h*.4,0,h);floor.addColorStop(0,'#203338');floor.addColorStop(1,'#111b20');c.fillStyle=floor;c.beginPath();c.moveTo(0,h*.41);c.lineTo(w,h*.41);c.lineTo(w,h);c.lineTo(0,h);c.fill();
  c.strokeStyle='#40515250';c.lineWidth=1;
  for(let i=-5;i<=5;i++){c.beginPath();c.moveTo(w*.5+i*w*.028,h*.41);c.lineTo(w*.5+i*w*.2,h);c.stroke();}
  for(const y of [.45,.52,.62,.76,.96]){c.beginPath();c.moveTo(0,h*y);c.lineTo(w,h*y);c.stroke();}
  for(const side of [0,1]){c.strokeStyle='#060e15';c.lineWidth=14;c.beginPath();c.moveTo(side*w,h*.08);c.bezierCurveTo((side?.75:.25)*w,h*.24,(side?.9:.1)*w,h*.32,side*w,h*.54);c.stroke();c.strokeStyle='#49605d';c.lineWidth=2;c.stroke();
   const x=side?w-20:20;this.round(x-6,h*.37,12,27,3,'#6e493d');this.round(x-3,h*.373,6,17,2,'#e1a569');
  }
  // Slick translucent sheets span ribs like wet cobwebs, with hanging threads.
  for(let i=0;i<8;i++){const x=i*w/7,y=h*(.19+.035*Math.sin(i*4));c.fillStyle='#93ad7730';c.beginPath();c.moveTo(x-w*.095,0);c.quadraticCurveTo(x,y*.5,x+w*.07,0);c.quadraticCurveTo(x+w*.035,y*.75,x+w*.09,y);c.quadraticCurveTo(x,y*.73,x-w*.095,y*.83);c.closePath();c.fill();
   for(let k=0;k<5;k++){c.strokeStyle=k%2?'#92ae7750':'#58776855';c.lineWidth=k%2?.8:2;c.beginPath();c.moveTo(x+(k-2)*w*.022,0);c.quadraticCurveTo(x+(k-2)*w*.013,y*.76,x+(k-2)*w*.032,y*(.9+k*.055));c.stroke();}
   const drip=(t*.12+i*.13)%1;this.circle(x+w*.03,y+drip*24,1.4,'#adc58d65');
  }
  for(const d of g.resin||[]){const x=d.x*w,y=d.y*h,s=d.size*g.scale();c.fillStyle='#56664735';c.beginPath();c.ellipse(x,y,46*s,13*s,d.phase*.07,0,TAU);c.fill();c.strokeStyle='#8e9e7050';c.lineWidth=1.1;c.beginPath();c.ellipse(x-7*s,y-2*s,28*s,6*s,0,.3,3.1);c.stroke();for(let i=0;i<3;i++){c.strokeStyle='#6a815d55';c.beginPath();c.moveTo(x+(i-1)*22*s,y);c.quadraticCurveTo(x+(i-1)*15*s,y-25*s,x+Math.sin(d.phase+i)*40*s,y-34*s);c.stroke();}}
  const glow=c.createRadialGradient(w*.5,h*.7,20,w*.5,h*.7,w*.65);glow.addColorStop(0,'#6485790c');glow.addColorStop(1,'#01081190');c.fillStyle=glow;c.fillRect(0,0,w,h);
 }
 shell(e){const c=this.ctx,g=this.game,s=g.scale();c.save();c.translate(e.x*g.width,e.y*g.height);c.scale(s,s);c.fillStyle='#354338';c.beginPath();c.ellipse(0,0,30,10,0,0,TAU);c.fill();for(const side of [-1,1]){c.fillStyle='#586043';c.beginPath();c.moveTo(side*3,-5);c.quadraticCurveTo(side*8,-28,side*30,-13);c.lineTo(side*39,0);c.lineTo(side*8,5);c.fill();}c.restore();}
 enemy(e){
  const c=this.ctx,g=this.game,s=g.scale(),t=this.reduced?0:g.clock,dead=harmless(e),gray=e.stage==='dead'||e.stage==='dying';c.save();c.translate(e.x*g.width,e.y*g.height);c.scale(s,s);
  if(e.form==='egg'){
   const open=e.stage==='hatching'?clamp(e.age/(e.hatchTime*.36),0,1):0,shake=e.stage==='cracking'||e.stage==='hatching'?(this.reduced?0:Math.sin(t*17+e.phase)*(.4+open*1.7)):0;c.translate(shake,0);
   c.fillStyle='#050c1380';c.beginPath();c.ellipse(0,3,35,12,0,0,TAU);c.fill();
   const skin=c.createLinearGradient(-27,-62,28,0);skin.addColorStop(0,gray?'#858982':'#869263');skin.addColorStop(.48,gray?'#626966':'#566746');skin.addColorStop(1,gray?'#333e40':'#2b3d35');c.fillStyle=skin;c.beginPath();c.moveTo(-26,0);c.bezierCurveTo(-40,-30,-20,-65,0,-64);c.bezierCurveTo(24,-65,39,-27,27,0);c.quadraticCurveTo(0,15,-26,0);c.fill();
   for(let k=-2;k<=2;k++){c.strokeStyle=gray?'#a3aaa330':'#b5c29035';c.lineWidth=2;c.beginPath();c.moveTo(k*8,-54+Math.abs(k)*7);c.quadraticCurveTo(k*16,-25,k*11,1);c.stroke();}
   if(e.item){c.strokeStyle='#101c1a';c.lineWidth=2.5;for(const side of [-1,1]){c.beginPath();c.moveTo(0,-62);c.lineTo(side*8,-51);c.lineTo(side*4,-42);c.lineTo(side*14,-31);c.lineTo(side*10,-17);c.stroke();}c.strokeStyle=gray?'#a2a89b':'#c0c398';c.lineWidth=.8;c.stroke();}
   if(open){this.circle(0,-48,12+open*6,'#101617');for(const side of [-1,1]){c.fillStyle='#7b7953';c.beginPath();c.moveTo(side*2,-45);c.quadraticCurveTo(side*(15+open*23),-70+open*20,side*(14+open*21),-49+open*13);c.quadraticCurveTo(side*17,-31,side*4,-35);c.fill();c.strokeStyle='#aeb78380';c.lineWidth=1;c.beginPath();c.moveTo(side*(10+open*15),-50);c.quadraticCurveTo(0,-31,side*6,-32);c.stroke();}}
   for(let i=0;i<5;i++)this.circle(Math.sin(e.phase+i*2)*19,-15-i*6,1.8,gray?'#a5aaa44a':'#c3cea25c');
  }else{
   const jump=e.stage==='dying'&&!this.reduced?Math.sin(Math.PI*clamp(e.age/.7,0,1))*43:0,celebrate=['mourning','lost'].includes(g.state)&&!dead&&!this.reduced?Math.abs(Math.sin(Math.PI*Math.min(3,g.celebration)))*25:0;
   c.fillStyle='#050b1380';c.beginPath();c.ellipse(0,1,35,8,0,0,TAU);c.fill();c.translate(0,-jump-celebrate);
   if(e.stage==='dying')c.rotate(Math.PI*clamp(e.age/.7,0,1));else if(e.stage==='dead')c.rotate(Math.PI);
   if(e.stage==='chewing'&&e.victim){const p=e.victim;c.translate(0,-(54*p.look.height+26)*SC.personScale(p.look));c.rotate(Math.PI/2);c.scale(.78,.78);}
   this.alienBody(e,gray,t);
  }
  if(e.stage==='burning')this.burning(e.form==='egg'?0:0,e.form==='egg'?-23:-10,e.age,t);
  c.restore();
 }
 alienBody(e,gray,t){
  const c=this.ctx,body=gray?'#858c87':'#c3b079',joint=gray?'#515e60':'#7b8050',wiggle=this.reduced?0:Math.sin(e.stride||t*12),chew=e.stage==='chewing';c.save();c.scale(e.facing,1);c.lineCap='round';
  c.strokeStyle=joint;c.lineWidth=6;c.beginPath();c.moveTo(-10,-7);c.bezierCurveTo(-30,-5,-34,-26,-49,-20+wiggle*5);c.bezierCurveTo(-58,-13,-44,-1,-39,-8);c.stroke();c.strokeStyle=body;c.lineWidth=2;c.stroke();
  for(const side of [-1,1])for(let i=0;i<4;i++){const x=-12+i*7,step=gray?0:Math.sin((e.stride||t*12)+i*1.9+side)*(chew?3:6),tip=x+side*9;c.strokeStyle=joint;c.lineWidth=4;c.beginPath();c.moveTo(x,-8);c.lineTo(x+side*6,-22-i%2*5+step);c.lineTo(tip+side*5,side*(gray?-1:1)*(13+i%2*5)+step);c.stroke();this.circle(x+side*6,-22-i%2*5+step,2.5,body);}
  c.fillStyle=body;c.beginPath();c.ellipse(0,-10,20,10,0,0,TAU);c.fill();c.strokeStyle=joint;c.lineWidth=1.5;for(let i=-2;i<=2;i++){c.beginPath();c.ellipse(i*6,-10,3,8,.2,-1.2,1.2);c.stroke();}this.circle(15,-11,5,gray?'#a3aaa0':'#dacba0');c.restore();
 }
 person(p){
  const c=this.ctx,g=this.game,s=g.scale(),dead=p.status==='dead',chewing=p.status==='chewing',win=['celebrating','won'].includes(g.state),jump=this.reduced?0:!dead&&win?Math.abs(Math.sin(Math.PI*Math.min(3,g.celebration)))*27*s:g.jumpHeight(p),moving=p.moving||['entering','walking','running'].includes(p.status)&&p.wait<=0,walk=this.reduced?0:chewing?Math.sin(p.age*37)*6:moving?Math.sin(g.clock*(p.status==='running'?22:9)+p.look.phase)*6:0;
  const x=p.x*g.width,y=p.y*g.height;
  if(dead){const spread=clamp(p.age/1.3,0,1);c.fillStyle='#781f2de0';c.beginPath();c.ellipse(x+(p.fallSide||1)*24*s,y+3*s,(19+spread*30)*s,(6+spread*6)*s,.08,0,TAU);c.fill();
   c.save();c.translate(x,y);c.rotate((p.fallSide||1)*Math.PI/2*clamp(p.age/.5,0,1));SC.drawPerson(this,{x:0,feet:0,scale:s,look:p.look,shadow:false,headless:true});c.restore();return;
  }
  SC.drawPerson(this,{x,feet:y-jump,scale:s,look:p.look,walk,fear:p.fear,shadow:!jump});
  if(p.player){const dir=p.facing;c.save();c.translate(x,y-jump);c.scale(s,s);this.round(-dir*25-6,-64,14,37,5,'#899783','#364746');this.round(-dir*25-3,-59,8,25,3,'#b5bba1');c.strokeStyle='#171f27';c.lineWidth=4;c.beginPath();c.moveTo(-dir*21,-32);c.quadraticCurveTo(dir*8,-13,dir*30,-35);c.stroke();c.save();c.scale(dir,1);this.round(20,-43,39,10,3,'#5b6c71','#a3b0a6');this.round(47,-47,14,17,3,'#8b9284','#c1c4ad');this.circle(63,-35,2,'#ecbf72');c.restore();c.restore();}
 }
 burning(x,y,age,t){
  const c=this.ctx;for(let i=0;i<5;i++){const flicker=this.reduced?0:Math.sin(t*19+i*2)*5,xx=x+(i-2)*9,hh=25+(i%2)*13+flicker;c.fillStyle=i%2?'#ffd991dd':'#ed8a41df';c.beginPath();c.moveTo(xx-8,y+8);c.quadraticCurveTo(xx-13,y-12,xx+flicker,y-hh);c.quadraticCurveTo(xx+12,y-13,xx+8,y+8);c.fill();}c.globalAlpha=.2;for(let i=0;i<3;i++)this.circle(x+Math.sin(i*2+t)*10,y-43-age*32-i*11,8+i*4,'#bbc0a8');c.globalAlpha=1;
 }
 flame(){
  const c=this.ctx,g=this.game,p=g.player,e=g.job.target,s=g.scale(),{x,y,tx,ty}=g.flamePose(e),dx=tx-x,dy=ty-y,d=Math.min(g.flameRange*s,Math.hypot(dx,dy)),angle=Math.atan2(dy,dx),t=this.reduced?0:g.clock;
  c.save();c.translate(x,y);c.rotate(angle);const glow=c.createLinearGradient(0,0,d,0);glow.addColorStop(0,'#effcde');glow.addColorStop(.15,'#ffe4a0d9');glow.addColorStop(.75,'#f78a46ba');glow.addColorStop(1,'#d95b3240');c.fillStyle=glow;c.beginPath();c.moveTo(0,-3*s);
  for(let i=1;i<=12;i++)c.lineTo(d*i/12,-(3+i*1.1+Math.sin(t*35+i)*3)*s);
  for(let i=12;i>=1;i--)c.lineTo(d*i/12,(3+i*1.1+Math.cos(t*29+i)*4)*s);c.lineTo(0,3*s);c.closePath();c.fill();c.strokeStyle='#fff1bd';c.lineWidth=3*s;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(d*.4,Math.sin(t*28)*6*s,d*.82,0);c.stroke();c.restore();
 }
 labels(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,states=g.getTaskStates(),hints=SC.pinyinHints(g),boxes=[],targets=g.getTargets(),narrow=w<700,top=122,slotH=g.mode==='math-diagrams'?86:SC.isChinese(g.mode)?65:50,rows=Math.max(1,Math.floor((h-top-8)/slotH)),cols=Math.max(narrow?2:Math.max(3,Math.floor((w-16)/188)),Math.ceil(targets.length/rows)),maxWidth=Math.min(narrow?134:180,(w-16)/cols-8);
  const overlaps=(a,b)=>a.x<b.x+b.w+4&&a.x+a.w+4>b.x&&a.y<b.y+b.h+4&&a.y+a.h+4>b.y;
  for(const e of targets){const hint=hints.has(e),font=(SC.isChinese(g.mode)||g.mode==='bopomofo')?22:narrow?14:18,bw=SC.labelWidth(c,e.item,{font:'bold '+font+'px system-ui',hint:hint?e.item.hint:'',translation:hint?e.item.translation:'',hintFont:'12px system-ui',max:maxWidth}),bh=SC.labelHeight(e.item,hint?59:31),anchor={x:e.x*w,y:e.y*h-(e.form==='egg'?66:35)*g.scale()},candidates=[];
   // Use fixed-height lanes so delayed hints cannot close off the last slots.
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const cell=(w-16)/cols;candidates.push({x:8+col*cell+(cell-bw)/2,y:top+row*slotH,w:bw,h:bh});}
   candidates.sort((a,b)=>Math.hypot(a.x+bw/2-anchor.x,a.y+bh-anchor.y)-Math.hypot(b.x+bw/2-anchor.x,b.y+bh-anchor.y));
   if(!narrow&&targets.length<=rows*(cols-1))candidates.unshift({x:clamp(anchor.x-bw/2,8,w-bw-8),y:clamp(anchor.y-bh-6,top,h-bh-8),w:bw,h:bh});
   const stable=this.stableLabel(e,anchor,bw,bh,{top:top,bottom:h-8});if(stable)candidates.unshift(stable);
   const box=candidates.find(b=>boxes.every(a=>!overlaps(a,b)))||candidates[0];if(!box)continue;boxes.push({...box,id:e.id});
   this.keepLabel(e,anchor,box);this.rememberScoreAnchor(e,box,'#c3d8b1','#203632');
   c.strokeStyle='#a9b98a85';c.lineWidth=1;c.beginPath();c.moveTo(anchor.x,anchor.y);c.lineTo(box.x+bw/2,box.y+bh);c.stroke();c.lineWidth=states.has(e)?2:1;this.round(box.x,box.y,bw,bh,7,states.has(e)?'#314e44':'#15282b',states.has(e)?'#97e9b7':e.form==='alien'?'#c7a178':'#819178');
   c.fillStyle='#ecedce';c.font='bold '+font+'px system-ui';c.textAlign='center';SC.drawLabelText(c,e.item,box,{hint,hintFont:'12px system-ui'});c.lineWidth=1;
  }
  this.labelBoxes=boxes;
 }
}
SC.EggGame=EggGame;SC.EggRenderer=EggRenderer;
})(globalThis);
