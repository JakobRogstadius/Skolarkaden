/* A quiet campfire game. Every stick reacts independently to the shared FIFO. */
(function(root){
'use strict';const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),TAU=Math.PI*2;
const READY=.62,BURNT=1.28,IGNITE=1.60,ROAST_RATE=.092;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function scene(seed){
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 return {stars:Array.from({length:95},()=>({x:random(),y:.015+random()*.43,r:.6+random()*1.3,phase:random()*TAU})),
  clouds:Array.from({length:4},()=>({x:random(),y:.10+random()*.22,width:.10+random()*.12,speed:.0005+random()*.0006})),
  trees:Array.from({length:47},(_,i)=>({x:i<32?i/31:(i%2?.02:.98)+(random()-.5)*.25,y:i<32?.51+random()*.09:.62+random()*.13,height:i<32?.13+random()*.21:.35+random()*.23,width:.025+random()*.025,kind:Math.floor(random()*3),phase:random()*TAU})),
  plants:Array.from({length:20},(_,i)=>({x:i<12?(i%2?.10:.90)+(random()-.5)*.18:.2+random()*.6,y:i<12?.72+random()*.27:.59+random()*.07,size:.27+random()*.25,growth:.6+random()*.4,moisture:1,nutrition:1,infection:0,look:SC.makePlantLook(random)})),
  flies:Array.from({length:8},()=>({x:.08+random()*.84,y:.42+random()*.25,phase:random()*TAU}))};
}
class MarshmallowGame{
 constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random,width:1000,height:740});this.menu();}
 emit(type,detail={}){this.onEvent({type,...detail});}
 menu(){Object.assign(this,{state:'menu',clock:0,elapsed:0,dawnAge:0,sticks:[],waste:[],effects:[],thought:null,score:0,hits:0,shots:0,early:0,burnt:0,wrong:0,spawned:0,resolved:0,total:40,streak:0,bestStreak:0});}
 start({mode='swedish',pace='gentle',lang='sv-SE',items=null,uppercase=Math.random()<.5}={}){
  this.menu();Object.assign(this,{mode,pace,lang,uppercase});this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Lägerelden behöver minst ett svar.');
  this.timeScale=SC.isMath(mode)?1.3:1;this.dawnDuration=6;this.maxSticks={gentle:2,steady:4,brave:6}[pace];
  this.slots=[2,3,0,1,4,5].slice(0,this.maxSticks);this.nextId=0;this.spawnIn=3.4;this.insectsIn=2.5;this.lastWrongAt=-10;this.scene=scene(Math.floor(this.random()*4294967296));
  this.state='playing';this.spawn();this.emit('start');
 }
 resize(width,height){Object.assign(this,{width,height});}
 progress(){return clamp(this.resolved/this.total,0,1);}
 fireStrength(){return this.state==='won'?0:(1-.48*this.progress())*(1-ease(this.dawnAge/4.7));}
 cookingRate(){return ROAST_RATE*this.fireStrength()/this.timeScale;}
 timingPoints(p){
  // Each stick keeps its entry cooking rate; the golden window has a stable midpoint.
  const position=clamp((p.roast-READY)/(BURNT-READY),0,1);
  return Math.round(25+25*(1-Math.abs(2*position-1)));
 }
 readiness(p){return p.roast<BURNT&&p.roast>=READY;}
 getTargets(){return this.sticks.filter(p=>p.stage==='roasting'||p.stage==='flaming').sort((a,b)=>b.roast-a.roast||a.id-b.id);}
 getAvailableTargets(){return this.getTargets();}
 getActiveEntries(){return [...this.sticks.flatMap(p=>p.entry?[p.entry]:[]),...(this.thought?[this.thought.entry]:[])];}
 getTaskStates(){const states=new Map(),targets=this.getTargets();for(const entry of this.queue.items){const p=targets.find(p=>!states.has(p)&&SC.matches(entry.text,p.item,this.mode,this.lang,entry.source));if(p)states.set(p,'queued');}return states;}
 workerStatus(){return this.state==='playing'?'Ta in pinnen när marshmallowen är gyllene.':'God morgon!';}
 chooseItem(previous){
  const source=SC.practiceItems(this),different=source.filter(i=>i.answer!==previous),pool=different.length?different:source,used=this.getTargets().map(p=>p.item.answer),unique=pool.filter(i=>!used.includes(i.answer));
  const choices=unique.length?unique:pool,base=choices[Math.floor(this.random()*choices.length)],item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};
  item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);return item;
 }
 spawn(){
  const slot=this.slots.find(slot=>!this.sticks.some(p=>p.slot===slot));
  if(slot===undefined||this.state!=='playing'||this.spawned>=this.total)return false;
  this.sticks.push({id:++this.nextId,slot,stage:'entering',age:0,roast:0,rate:this.cookingRate(),item:this.chooseItem(),entry:null,look:SC.makePerson(this.random),phase:this.random()*TAU});this.spawned++;return true;
 }
 showTask(p){p.stage='roasting';p.age=0;p.appearedAt=this.clock;p.pinyinRevealed=false;p.entry=null;this.emit('targets');}
 withdraw(p,outcome){
  p.exitLift=p.stage==='inspecting'?Math.sin(Math.PI*clamp(p.age/1.7,0,1)):0;
  p.stage='withdrawing';p.age=0;p.outcome=outcome;
  if(outcome==='burnt'&&!p.countedBurn){p.countedBurn=true;this.burnt++;this.streak=0;}
  this.emit('targets');
 }
 work(){
  if(this.state!=='playing')return;
  while(this.queue.length){const entry=this.queue.take();if(!entry)break;this.shots++;
   const p=this.getTargets().find(p=>SC.matches(entry.text,p.item,this.mode,this.lang,entry.source));
   if(!p){this.wrong++;this.thought={entry,age:0};if(this.clock-this.lastWrongAt>.4){this.lastWrongAt=this.clock;this.emit('think',{entry});}continue;}
   p.entry=entry;
   if(p.roast<READY){p.stage='inspecting';p.age=0;this.early++;this.emit('early',{entry});}
   else if(p.roast<BURNT){const points=this.timingPoints(p);this.hits++;this.score+=points;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);this.effects.push({slot:p.slot,age:0});this.withdraw(p,'good');this.emit('hit',{entry,points,target:p});}
   else this.withdraw(p,'burnt');
  }
 }
 animate(dt){
  for(const p of this.sticks){p.age+=dt;
   if(p.stage==='entering'&&p.age>=.85)this.showTask(p);
   else if(p.stage==='inspecting'&&p.age>=1.7){p.item=this.chooseItem(p.item.answer);this.showTask(p);}
   else if(p.stage==='flaming'&&p.age>=1.05)this.withdraw(p,'burnt');
   else if(p.stage==='withdrawing'&&p.age>=.8){
    if(p.outcome==='burnt'){this.waste.push({side:p.slot%2?1:-1,x:.28+this.random()*.44,y:.87+this.random()*.10,rotation:this.random()*TAU,age:0});this.emit('camp-toss');}
    p.stage='gone';this.resolved++;
   }
  }this.sticks=this.sticks.filter(p=>p.stage!=='gone');
  for(const p of this.waste)p.age+=dt;for(const e of this.effects)e.age+=dt;this.effects=this.effects.filter(e=>e.age<1.1);
  if(this.thought){this.thought.age+=dt;if(this.thought.age>=1.2)this.thought=null;}
 }
 dawn(){
  if(this.state!=='playing')return;this.state='celebrating';this.dawnAge=0;this.thought=null;
  for(const p of this.sticks)if(p.stage!=='withdrawing')this.withdraw(p,p.roast>=BURNT?'burnt':'morning');
  this.emit('celebrate');this.emit('daybreak');
 }
 pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
 update(dt){
  dt=clamp(dt,0,.05);if(this.state==='paused')return;
  if(this.state==='celebrating'){this.clock+=dt;this.dawnAge=Math.min(this.dawnDuration,this.dawnAge+dt);this.animate(dt);if(this.dawnAge>=this.dawnDuration-1e-8){this.state='won';this.emit('end',{won:true,score:this.score,hits:this.hits,shots:this.shots,bestStreak:this.bestStreak,burnt:this.burnt,early:this.early,spawned:this.spawned});}return;}
  if(this.state!=='playing')return;
  // Apply the FIFO before advancing cooking: there is no worker or animation wait.
  this.work();this.clock+=dt;this.elapsed+=dt;
  for(const p of this.sticks)if(p.stage==='roasting'){
   p.roast+=p.rate*dt;
   if(p.roast>=IGNITE){p.stage='flaming';p.age=0;this.emit('camp-ignite');}
  }
  this.animate(dt);if(this.resolved===this.total&&!this.sticks.length){this.dawn();return;}this.spawnIn-=dt;if(this.spawnIn<=0)this.spawnIn=this.spawn()?2.8+this.random()*1.8:.6;
  this.insectsIn-=dt;if(this.insectsIn<=0){this.insectsIn=5+this.random()*6;this.emit('camp-insects');}
 }
}
const mix=(a,b,t)=>{const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));return '#'+rgb(a).map((v,i)=>Math.round(v+(rgb(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');};
class MarshmallowRenderer extends SC.SceneRenderer{
 geometry(){const g=this.game,s=clamp(g.width/950,.60,1.15);return {s,x:g.width*.5,y:g.height*.75,r:Math.min(g.width*.19,123*s),gap:Math.max(62,72*s),flame:Math.max(126,151*s)};}
 plantScale(p){const depth=clamp((p.y-.56)/.43,0,1);return (.16+depth*1.08)*(.85+p.size*.45)*clamp(this.game.height/740,.8,1.2);}
 pose(p){
  const g=this.game,{s,x,y,r,gap}=this.geometry(),side=p.slot%2?1:-1,row=Math.floor(p.slot/2),tip={x:x+side*r*[.55,1.08,.62][row],y:y-(2-row)*gap-18*s},hand={x:side<0?g.width*.11:g.width*.89,y:y+[-1.9,-.58,.52][row]*gap};
  const elbow={x:side<0?g.width*.015:g.width*.985,y:hand.y+34*s},shoulder={x:side<0?-55*s:g.width+55*s,y:elbow.y+25*s};
  let slide=0,lift=0;if(p.stage==='entering')slide=1-ease(p.age/.85);
  if(p.stage==='inspecting')lift=Math.sin(Math.PI*clamp(p.age/1.7,0,1));
  if(p.stage==='withdrawing'){slide=ease(p.age/.8);lift=(p.exitLift||0)*(1-slide)+slide*.55;}
  // The forearm, grip and stick form one rigid assembly around a stationary elbow.
  const reach=Math.hypot(tip.x-elbow.x,tip.y-elbow.y),restAngle=Math.atan2(tip.y-elbow.y,Math.abs(tip.x-elbow.x));
  const maxLift=clamp(Math.asin(clamp((elbow.y-150)/reach,0,1))+restAngle,0,.48); // Stay below the HUD in short windows.
  const a=side*maxLift*lift,cos=Math.cos(a),sin=Math.sin(a);
  for(const q of [tip,hand]){const dx=q.x-elbow.x,dy=q.y-elbow.y;q.x=elbow.x+dx*cos-dy*sin;q.y=elbow.y+dx*sin+dy*cos;}
  for(const q of [tip,hand,elbow,shoulder])q.x+=side*(g.width*.7+80)*slide;
  return {tip,hand,elbow,shoulder,side,row,s};
 }
 draw(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,day=ease(g.dawnAge/4.6);c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.clearRect(0,0,w,h);c.globalAlpha=1;
  this.landscape(day);this.camping(day);this.fire();
  for(const p of g.waste)this.charred(p);
  for(const p of [...g.sticks].sort((a,b)=>a.slot-b.slot))this.stick(p);this.labels();
  for(const e of g.effects){const q=this.pose({slot:e.slot}),t=e.age/1.1;c.globalAlpha=1-t;for(let i=0;i<3;i++){c.fillStyle='#ffe49f';c.font='bold '+(16-i*2)+'px system-ui';c.textAlign='center';c.fillText('✦',q.tip.x+(i-1)*21*t,q.tip.y-20-60*t-i*8);}}c.globalAlpha=1;
  if(g.thought){const text=g.thought.entry.text+' ?',bw=SC.labelWidth(c,text,{font:'bold 16px system-ui',max:Math.min(170,w-24)});this.round((w-bw)/2,h-58,bw,30,9,'#293330','#947f5c');c.fillStyle='#e9ddbf';c.font='bold 16px system-ui';c.textAlign='center';SC.drawFittedText(c,text,w/2,h-37,bw-SC.labelPadding*2);}
 }
 landscape(day){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,t=this.reduced?0:g.clock,decor=g.scene;if(!decor)return;
  const sky=c.createLinearGradient(0,0,0,h*.65);sky.addColorStop(0,mix('#080f24','#89c8e4',day));sky.addColorStop(.68,mix('#20273f','#d0e8ed',day));sky.addColorStop(1,mix('#3c3841','#ffe3ac',day));c.fillStyle=sky;c.fillRect(0,0,w,h);
  for(const star of decor.stars){const twinkle=.55+.4*Math.sin(t*.7+star.phase)**2;c.globalAlpha=(1-day)*twinkle;this.circle(star.x*w,star.y*h,star.r,'#f7ebd2');if(star.r>1.65){c.fillStyle='#f8ebd360';c.fillRect(star.x*w-4,star.y*h-.45,8,.9);c.fillRect(star.x*w-.45,star.y*h-4,.9,8);}}c.globalAlpha=1;
  c.globalAlpha=1-day;this.circle(w*.80,h*.18,22,'#eee7c9');this.circle(w*.80+9,h*.18-5,21,'#182038');c.globalAlpha=1;
  if(g.dawnAge){const rise=ease(g.dawnAge/4.5),x=w*.59,y=h*(.63-.43*rise),r=Math.max(52,Math.min(w*.09,105));c.save();c.translate(x,y);c.globalAlpha=rise;for(let i=0;i<14;i++){c.save();c.rotate(i*TAU/14+.06*rise);c.fillStyle='#ffe8a455';c.beginPath();c.moveTo(-r*.14,-r*.8);c.lineTo(0,-r*1.5);c.lineTo(r*.14,-r*.8);c.fill();c.restore();}this.circle(0,0,r,'#ffde83');this.circle(-r*.15,-r*.18,r*.66,'#ffe5a0');c.restore();}
  for(const q of decor.clouds){const x=((q.x+t*q.speed)%1.35-.15)*w,y=q.y*h,s=q.width*w;c.globalAlpha=.45+day*.20;c.fillStyle=mix('#3d4255','#ffffff',day);c.beginPath();c.ellipse(x,y,s*.46,s*.105,0,0,TAU);c.ellipse(x-s*.14,y-s*.05,s*.20,s*.12,0,0,TAU);c.ellipse(x+s*.11,y-s*.06,s*.25,s*.14,0,0,TAU);c.fill();}c.globalAlpha=1;
  c.fillStyle=mix('#17272b','#79996c',day);c.beginPath();c.moveTo(0,h*.56);c.quadraticCurveTo(w*.24,h*.48,w*.5,h*.56);c.quadraticCurveTo(w*.8,h*.49,w,h*.54);c.lineTo(w,h);c.lineTo(0,h);c.fill();
  for(const [i,tree] of decor.trees.entries())this.tree(tree,day,i<32);
  const soil=c.createLinearGradient(0,h*.59,0,h);soil.addColorStop(0,mix('#3a3733','#c1b788',day));soil.addColorStop(1,mix('#202426','#a2a277',day));c.fillStyle=soil;c.beginPath();c.moveTo(0,h);c.bezierCurveTo(w*.13,h*.49,w*.75,h*.48,w,h);c.closePath();c.fill();
  const {x,y,r}=this.geometry(),glow=c.createRadialGradient(x,y,10,x,y,r*2.7);glow.addColorStop(0,'#ed934b40');glow.addColorStop(.55,'#c4763620');glow.addColorStop(1,'#c4763600');c.fillStyle=glow;c.globalAlpha=g.fireStrength();c.fillRect(0,h*.4,w,h*.6);c.globalAlpha=1;
  for(const p of [...decor.plants].sort((a,b)=>a.y-b.y)){const size=this.plantScale(p);c.save();c.translate(p.x*w,p.y*h);c.scale(size,size);c.globalAlpha=.26+day*.56;SC.drawPlant(this,p,t);c.restore();}
  for(const fly of decor.flies){const light=Math.max(0,Math.sin(t*.75+fly.phase))**5*(1-day),xx=fly.x*w+Math.sin(t*.3+fly.phase)*19,yy=fly.y*h+Math.sin(t*.6+fly.phase)*11;if(light<.02)continue;c.globalAlpha=light;this.circle(xx,yy,8,'#c1dc6220');this.circle(xx,yy,3.5,'#dae68855');this.circle(xx,yy,1.6,'#f1ed9a');}c.globalAlpha=1;
 }
 tree(p,day,far){
  const c=this.ctx,g=this.game,x=p.x*g.width,y=p.y*g.height,H=p.height*g.height,W=p.width*g.width*(far?1:1.35),leaf=mix(far?'#182c35':'#101f24',far?'#729685':'#426858',day),wood=mix('#1b2429','#6b6450',day);
  c.save();c.translate(x,y);c.strokeStyle=wood;c.lineWidth=Math.max(3,W*.19)*(far?1:2);c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(Math.sin(p.phase)*W*.15,-H);c.stroke();
  if(p.kind===0){for(let j=0;j<5;j++){const top=-H+j*H*.16,span=W*(.45+j*.18);c.fillStyle=leaf;c.beginPath();c.moveTo(0,top);c.quadraticCurveTo(-span*.35,top+H*.13,-span,top+H*.29);c.quadraticCurveTo(0,top+H*.23,span,top+H*.29);c.quadraticCurveTo(span*.35,top+H*.13,0,top);c.fill();}}
  else{for(let j=0;j<5;j++){const side=j%2?1:-1,yy=-H*(.45+j*.10),xx=side*W*(.45+j*.1);c.lineWidth=Math.max(2,W*.09);c.beginPath();c.moveTo(0,yy+H*.14);c.lineTo(xx,yy);c.stroke();c.fillStyle=leaf;c.beginPath();c.ellipse(xx,yy,W*(p.kind===1?.85:.56),H*.15,side*.3,0,TAU);c.fill();}c.beginPath();c.ellipse(0,-H*.92,W*.78,H*.14,0,0,TAU);c.fill();}
  c.restore();
 }
 camping(day){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,{s}=this.geometry(),t=this.reduced?0:g.clock;
  c.save();c.translate(w*.13,h*.91);c.scale(s,s);this.round(-45,3,104,16,8,mix('#2a3438','#8a968b',day));
  // Enamel mug with coffee, a rim catching the firelight, and rising steam.
  c.lineWidth=6;c.strokeStyle='#678a91';c.beginPath();c.arc(25,-16,13,-Math.PI*.65,Math.PI*.65);c.stroke();this.round(-25,-42,51,46,8,'#477582','#bbad89');c.fillStyle='#d5c6a2';c.beginPath();c.ellipse(0,-41,24,7,0,0,TAU);c.fill();c.fillStyle='#3f3029';c.beginPath();c.ellipse(0,-41,19,4.5,0,0,TAU);c.fill();c.fillStyle='#d9c9aa';c.font='20px system-ui';c.textAlign='center';c.fillText('✦',0,-11);
  for(let i=0;i<3;i++){c.strokeStyle='#e6dccc55';c.lineWidth=1.6;c.beginPath();c.moveTo((i-1)*10,-52);c.bezierCurveTo((i-1)*10+Math.sin(t+i)*8,-69,(i-1)*10-Math.cos(t+i)*8,-84,(i-1)*10+Math.sin(t*.8+i)*7,-103);c.stroke();}c.restore();
  c.save();c.translate(w*.88,h*.91);c.scale(s,s);this.round(-44,-67,75,70,18,mix('#70494a','#b27665',day),'#987761');c.lineWidth=5;c.strokeStyle='#63564b';c.beginPath();c.arc(-6,-67,17,Math.PI,TAU);c.stroke();this.round(-42,-59,71,22,12,'#94715b');this.round(-31,-28,50,27,7,'#886550','#ba9970');for(const xx of [-26,14])this.round(xx,-60,6,32,2,'#c3ad83');c.restore();
  c.save();c.translate(w*.91,h*.66);c.scale(s*.7,s*.7);c.strokeStyle='#80918a';c.lineWidth=4;c.beginPath();c.arc(0,-54,15,Math.PI,TAU);c.stroke();this.round(-18,-45,36,47,6,'#d7af6455','#7b8b83');this.round(-22,-53,44,9,3,'#677d77');this.round(-22,-2,44,10,4,'#61766e');this.round(-4,-35,8,24,4,'#ffe8a1');c.restore();
 }
 fire(){
  const c=this.ctx,g=this.game,{s,x,y,r,flame}=this.geometry(),heat=g.fireStrength(),t=this.reduced?0:g.clock;
  c.save();c.translate(x,y);c.fillStyle='#090f1688';c.beginPath();c.ellipse(0,8,r*1.13,r*.40,0,0,TAU);c.fill();
  for(let i=0;i<13;i++){const a=i*TAU/13,xx=Math.cos(a)*r,yy=Math.sin(a)*r*.34;c.fillStyle=i%2?'#686760':'#535956';c.beginPath();c.ellipse(xx,yy,17*s,11*s,a*.12,0,TAU);c.fill();c.strokeStyle='#9a8c7144';c.lineWidth=2;c.stroke();}
  for(const a of [-.3,.34]){c.save();c.rotate(a);this.round(-r*.80,-8,r*1.6,19*s,8,'#49372c','#80604a');this.round(-r*.66,-7,r*1.32,4*s,2,heat?'#e5864655':'#635950');c.restore();}
  if(heat>.005){
   const halo=c.createRadialGradient(0,-flame*.45,5,0,-flame*.45,flame*1.3);halo.addColorStop(0,'#ffb45b28');halo.addColorStop(1,'#ff964000');c.globalAlpha=heat;c.fillStyle=halo;c.fillRect(-flame*1.3,-flame*1.7,flame*2.6,flame*2.4);c.globalAlpha=1;
   for(let layer=0;layer<3;layer++)for(let i=0;i<5;i++){
    const xx=(i-2)*r*.24,fh=flame*(.30+.70*heat)*(1-layer*.23)*(1-.12*Math.abs(i-2))*(this.reduced?1:.92+.08*Math.sin(t*4.4+i*1.7+layer)),sway=Math.sin(t*3+i*2+layer)*8*s,fw=r*(.26-layer*.035);
    c.fillStyle=['#d6683dcc','#f5a441e6','#ffdf88'][layer];c.beginPath();c.moveTo(xx-fw,-3);c.bezierCurveTo(xx-fw*1.4,-fh*.4,xx+fw*.7+sway,-fh*.58,xx+sway,-fh);c.bezierCurveTo(xx+fw*.1+sway,-fh*.65,xx+fw*1.3,-fh*.27,xx+fw,0);c.quadraticCurveTo(xx,12*s,xx-fw,-3);c.fill();
   }
   for(let i=0;i<12;i++){const f=(t*(.19+i*.008)+i*.17)%1;c.globalAlpha=(1-f)*heat;this.circle(Math.sin(i*2.4+t*.7)*r*.65*(1+f),-f*flame*1.9,1.1+i%3*.4,'#ffd888');}c.globalAlpha=1;
  }
  for(let i=0;i<5;i++){const f=(t*.12+i*.21)%1;c.globalAlpha=(1-f)*.05*heat;c.strokeStyle='#d9c7aa';c.lineWidth=(4+f*7)*s;c.beginPath();c.moveTo(Math.sin(i)*r*.25,-flame*.8-f*flame);c.quadraticCurveTo(Math.sin(i+t*.2)*r,-flame-f*flame,Math.cos(i+t*.3)*r,-flame*1.3-f*flame);c.stroke();}c.globalAlpha=1;c.restore();
 }
 marshmallow(x,y,roast,angle,s,flaming=false){
  const c=this.ctx,g=this.game,burnt=roast>=BURNT,toast=clamp((roast-READY)/(BURNT-READY),0,1),char=clamp((roast-BURNT)/(IGNITE-BURNT),0,1),puff=clamp(roast/READY,0,1);
  const color=burnt?mix('#493124','#201c20',char):roast<READY?mix('#fff5df','#efd8ab',puff):mix('#e6ad50','#975023',toast),W=burnt?20-char*3:19+puff*2,H=burnt?16-char*3:15+puff*2.3;
  c.save();c.translate(x,y);c.rotate(angle);c.scale(s,s);c.lineWidth=1.3;
  const crust=c.createLinearGradient(-W,-H,W,H);crust.addColorStop(0,mix(color,'#fff5d8',burnt?.08:.25));crust.addColorStop(.5,color);crust.addColorStop(1,mix(color,'#241b1a',burnt?.28:.18));
  this.round(-W,-H,W*2,H*2,burnt?7:11,crust,burnt?'#776455':roast<READY?'#d5ba8b':'#a96528');
  c.fillStyle=mix(color,burnt?'#a2917a':'#fff7df',burnt?.12:.28);c.beginPath();c.ellipse(-W+6,0,4.5,H*.72,0,0,TAU);c.fill();
  // Toast blisters become broad caramel patches; a burnt crust shrinks and cracks.
  if(roast>=READY){for(let i=0;i<8;i++){const xx=Math.sin(i*2.4)*W*.63,yy=Math.cos(i*1.7)*H*.56;c.fillStyle=burnt?'#120f15':mix('#bc722d','#552d1e',toast);c.globalAlpha=burnt?.55+char*.3:.28+toast*.32;c.beginPath();c.ellipse(xx,yy,(2.4+i%3*.8)*(burnt?1.35:1+toast*.25),1.7+i%3*.65,i*.7,0,TAU);c.fill();}c.globalAlpha=1;}
  if(burnt){c.strokeStyle='#b2a08870';c.lineWidth=.9;for(let i=0;i<4;i++){const xx=-W*.5+i*W*.32;c.beginPath();c.moveTo(xx,-H*.66);c.lineTo(xx+3,-H*.12);c.lineTo(xx-1,H*.17);c.lineTo(xx+2,H*.6);c.stroke();}}
  else{c.strokeStyle=roast<READY?'#fffbed99':'#ffdd9480';c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(-W+10,-H+4);c.quadraticCurveTo(0,-H+2,W-7,-H+5);c.stroke();}
  c.restore();
  if(flaming){c.save();c.translate(x,y-10*s);c.fillStyle='#f39642';c.beginPath();c.moveTo(-14*s,0);c.quadraticCurveTo(-20*s,-17*s,Math.sin((this.reduced?0:g.clock)*13)*5*s,-46*s);c.quadraticCurveTo(24*s,-19*s,13*s,0);c.fill();this.circle(0,-9*s,8*s,'#ffe79f');c.restore();}
 }
 stick(p){
  const c=this.ctx,{tip,hand,elbow,shoulder,side,s}=this.pose(p),inward=-side,angle=Math.atan2(tip.y-hand.y,tip.x-hand.x),tilt=Math.atan2(hand.y-elbow.y,inward*(hand.x-elbow.x)),L=Math.hypot(hand.x-elbow.x,hand.y-elbow.y)/s;
  const skin=p.look.skin,shade=mix(skin,'#684333',.35);c.save();c.lineCap='round';c.lineJoin='round';
  c.lineWidth=32*s;c.strokeStyle=p.look.shirt;c.beginPath();c.moveTo(shoulder.x,shoulder.y);c.lineTo(elbow.x,elbow.y);c.stroke();
  c.save();c.translate(elbow.x,elbow.y);c.scale(inward,1);c.rotate(tilt);c.scale(s,s);c.lineWidth=1;
  // Tapered sleeve, cuff, wrist and palm share the forearm's orientation.
  this.round(L-30,-8,30,17,7,skin);this.round(L-14,-12,29,25,10,skin,shade);
  c.fillStyle=p.look.shirt;c.beginPath();c.moveTo(-9,-16);c.quadraticCurveTo(L*.4,-16,L-25,-11);c.lineTo(L-25,11);c.quadraticCurveTo(L*.4,16,-9,16);c.quadraticCurveTo(-20,0,-9,-16);c.fill();
  this.round(L-31,-12,8,24,3,mix(p.look.shirt,'#33443b',.20));c.restore();
  c.lineWidth=4*s;c.strokeStyle='#6c4933';c.beginPath();c.moveTo(hand.x-Math.cos(angle)*29*s,hand.y-Math.sin(angle)*29*s);c.quadraticCurveTo((hand.x+tip.x)/2,(hand.y+tip.y)/2+5*s,tip.x+Math.cos(angle)*16*s,tip.y+Math.sin(angle)*16*s);c.stroke();c.lineWidth=1.1*s;c.strokeStyle='#c59861';c.stroke();
  c.save();c.translate(hand.x,hand.y);c.scale(inward,1);c.rotate(tilt);c.scale(s,s);c.lineWidth=1;
  // Curled fingers wrap over the stick, with one thumb crossing the top of the fist.
  this.round(3,-8,13,20,6,skin,shade);c.strokeStyle=shade;c.lineWidth=.8;for(const yy of [-1,5]){c.beginPath();c.moveTo(9,yy);c.quadraticCurveTo(12,yy+1,15,yy);c.stroke();}
  c.beginPath();c.moveTo(-7,-7);c.quadraticCurveTo(1,-11,7,-3);c.strokeStyle=shade;c.lineWidth=10;c.stroke();c.strokeStyle=skin;c.lineWidth=8;c.stroke();c.restore();
  this.marshmallow(tip.x,tip.y,p.roast,angle+(side>0?Math.PI:0),s,p.stage==='flaming');
  if(p.stage==='inspecting'){c.fillStyle='#fff0cb';c.font='bold 24px system-ui';c.textAlign='center';c.fillText('?',tip.x,tip.y-31*s);}
  c.restore();
 }
 labels(){
  const c=this.ctx,g=this.game,w=g.width,states=g.getTaskStates(),hints=SC.pinyinHints(g),boxes=[];
  const overlaps=(a,b)=>a.x<b.x+b.w+2&&a.x+a.w+2>b.x&&a.y<b.y+b.h+2&&a.y+a.h+2>b.y;
  for(const p of g.getTargets()){
   const {tip,side,s}=this.pose(p),hint=hints.has(p),font=(SC.isChinese(g.mode)||g.mode==='bopomofo')?24:w<600?17:20,bh=SC.labelHeight(p.item,hint?font+36:font+6),bw=SC.labelWidth(c,p.item,{font:'bold '+font+'px system-ui',hint:hint?p.item.hint:'',translation:hint?p.item.translation:'',hintFont:'12px system-ui',max:Math.min(w-16,w*.5-4)}),preferredX=clamp(tip.x-bw/2,8,w-bw-8),preferredY=Math.max(126,tip.y-bh-25*s-3),ready=g.readiness(p),burnt=p.roast>=BURNT;
   const candidates=this.nearLabelCandidates({x:tip.x,y:tip.y-25*s},bw,bh,boxes,{top:126,bottom:g.height-8}),stable=this.stableLabel(p,tip,bw,bh,{top:126,bottom:g.height-8});if(stable)candidates.unshift(stable);
   for(const dy of [0,-bh-8,bh+8,-2*(bh+8),2*(bh+8)])candidates.push({x:preferredX,y:clamp(preferredY+dy,126,g.height-bh-8),w:bw,h:bh});
   const box={...(candidates.find(b=>boxes.every(o=>!overlaps(b,o)))||candidates[0]),id:p.id},{x,y}=box;this.keepLabel(p,tip,box);boxes.push(box);this.rememberScoreAnchor(p,box,'#e4cca0','#29332e');c.strokeStyle='#b5956b75';c.lineWidth=1;c.beginPath();c.moveTo(x+bw/2,y+bh);c.lineTo(tip.x,tip.y-18*s);c.stroke();
   c.lineWidth=ready||states.has(p)?2.5:1.2;this.round(x,y,bw,bh,9,burnt?'#302723':ready?'#30392a':'#293330',states.has(p)?'#78ebbb':ready?'#bae685':'#75684c');c.lineWidth=1;c.font='bold '+font+'px system-ui';c.fillStyle=burnt?'#cda888':ready?'#ffe1a2':'#e9ddbf';c.textAlign='center';SC.drawLabelText(c,p.item,box,{hint});
  }this.labelBoxes=boxes;
 }
 charred(p){
  const g=this.game,{s}=this.geometry(),t=clamp(p.age/.65,0,1),x=(p.side<0?-.04:1.04)*(1-t)*g.width+p.x*g.width*t,y=g.height*(.66*(1-t)+p.y*t)-Math.sin(t*Math.PI)*90*s;
  if(t>=1){const c=this.ctx;c.fillStyle='#0a111a44';c.beginPath();c.ellipse(x,y+8*s,20*s,5*s,0,0,TAU);c.fill();}this.marshmallow(x,y,IGNITE,p.rotation+(1-t)*4,s*.65);
 }
}
SC.MarshmallowGame=MarshmallowGame;SC.MarshmallowRenderer=MarshmallowRenderer;
})(globalThis);
