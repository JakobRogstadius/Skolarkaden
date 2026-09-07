/* A forgiving rooftop game: one child, the shared FIFO, exactly forty pedestrians. */
(function(root){'use strict';const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PAINT=['#ff779e','#69d3ee','#b398ef','#ffd66b','#87d69c','#ffae70'];
class PaintGame{
 constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random,width:1000,height:700});this.menu();}
 emit(type,detail={}){this.onEvent({type,...detail});}
 menu(){this.state='menu';this.clock=0;this.elapsed=0;this.people=[];this.puddles=[];this.effects=[];this.job=null;this.balloon=null;this.score=0;this.hits=0;this.passed=0;this.spawned=0;this.total=40;
  this.buildings=[{x:.03,right:.315,y:.46,color:'#d3a36f',trim:'#ffe1ad',name:'BOKHÖRNAN'},{x:.355,right:.64,y:.40,color:'#83b3af',trim:'#d4eee1',name:'BAGERIET'},{x:.68,right:.97,y:.48,color:'#ca8f87',trim:'#f8d1bd',name:'ATELJÉN'}];
  this.child={x:.49,y:.40,roof:1,jump:null,facing:1,look:null};
 }
 start({mode='swedish',pace='gentle',lang='sv-SE',items=null,uppercase=Math.random()<.5}={}){
  this.menu();Object.assign(this,{mode,pace,lang,uppercase});this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Gatan behöver minst ett svar.');
  this.child.look=SC.makeChild(this.random);this.state='playing';this.shots=0;this.streak=0;this.bestStreak=0;this.nextId=0;this.spawnIn=.3;this.timeScale=mode==='math'?1.3:1;
  this.maxPeople={gentle:4,steady:6,brave:8}[pace];this.walkSpeed={gentle:.061,steady:.082,brave:.105}[pace]/this.timeScale;this.spawnInterval={gentle:4.5,steady:2.8,brave:1.8}[pace]*this.timeScale;
  this.spawn(true);this.emit('start');
 }
 resize(width,height){this.width=width;this.height=height;}
 pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
 spawn(initial=false){
  if(this.spawned>=this.total||this.people.length>=this.maxPeople)return false;
  const answers=this.people.filter(p=>['walking','targeted'].includes(p.status)).map(p=>p.item.answer),pool=SC.practiceItems(this).filter(i=>!answers.includes(i.answer));if(!pool.length)return false;
  const lanes=[0,1,2],dir=this.random()<.5?1:-1;lanes.sort((a,b)=>this.people.filter(p=>p.lane===a).length-this.people.filter(p=>p.lane===b).length);
  const lane=lanes.find(l=>!this.people.some(p=>p.lane===l&&(dir===1?p.x<.17:p.x>.83)));if(lane===undefined)return false;
  const base=pool[Math.floor(this.random()*pool.length)],item=this.mode==='math'?SC.makeMath(base.answer,this.random,this.mathPractice.level):{...base};item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);
  const p={id:++this.nextId,item,lane,x:initial?(dir===1?.13:.87):(dir===1?-.09:1.09),y:[.80,.865,.93][lane],direction:dir,speed:this.walkSpeed*(.9+this.random()*.2),status:'walking',age:0,reactionAge:0,jumps:0,paint:null,look:SC.makePerson(this.random)};
  this.people.push(p);this.spawned++;SC.noteTargetAppearance(this);this.emit('targets');return true;
 }
 getAvailableTargets(){return this.getTargets().filter(p=>p.status==='walking');}
 getActiveEntries(){return this.job?[this.job.entry]:[];}
 getTargets(){return this.people.filter(p=>['walking','targeted'].includes(p.status)&&p.x>=.045&&p.x<=.955).sort((a,b)=>(a.direction===1?1-a.x:a.x)/a.speed-(b.direction===1?1-b.x:b.x)/b.speed||a.id-b.id);}
 getTaskStates(){const targets=this.getTargets(),states=new Map();for(const p of targets)if(p.status==='targeted')states.set(p,'active');for(const entry of this.queue.items){const p=targets.find(p=>!states.has(p)&&SC.matches(entry.text,p.item,this.mode,this.lang,entry.source));if(p)states.set(p,'queued');}return states;}
 workerStatus(){if(['celebrating','won'].includes(this.state))return 'Alla 40 har passerat. Vilket färgkalas!';const j=this.job;if(!j)return this.passed>=40?'Sista färgstänket landar…':'Barnet väntar på nästa svar';return j.entry.text+' · '+(j.stage==='run'?(this.child.jump?'hoppar mellan taken':'springer på taket'):j.stage==='windup'?'kastar en ballong':'ballongen är på väg');}
 beginJob(){
  if(this.job||!this.queue.length||this.passed>=this.total)return;
  const entry=this.queue.take();if(!entry)return;
  const target=this.getTargets().find(p=>p.status==='walking'&&SC.matches(entry.text,p.item,this.mode,this.lang,entry.source)),color=PAINT[Math.floor(this.random()*PAINT.length)];
  this.job={entry,target,color,stage:target?'run':'windup',age:0};if(target)target.status='targeted';this.emit('work',{entry});
 }
 nearestRoof(x){let best=0,d=Infinity;this.buildings.forEach((r,i)=>{const distance=Math.abs(x-clamp(x,r.x+.025,r.right-.025));if(distance<d){d=distance;best=i;}});return best;}
 moveChild(targetX,dt){
  const child=this.child;
  if(child.jump){const j=child.jump;j.age=Math.min(j.duration,j.age+dt);const t=j.age/j.duration;child.x=j.x1+(j.x2-j.x1)*t;child.y=j.y1+(j.y2-j.y1)*t-Math.sin(Math.PI*t)*.075;if(t>=1){child.roof=j.roof;child.y=j.y2;child.jump=null;this.emit('roof-land');}return false;}
  const roof=this.buildings[child.roof],destination=this.nearestRoof(targetX),direction=Math.sign(destination-child.roof),goal=direction?(direction>0?roof.right-.025:roof.x+.025):clamp(targetX,roof.x+.025,roof.right-.025),delta=goal-child.x;
  if(Math.abs(delta)>.002){child.facing=Math.sign(delta);child.x+=clamp(delta,-.52*dt,.52*dt);child.y=roof.y;if(Math.abs(goal-child.x)>.002)return false;}
  if(direction){const next=this.buildings[child.roof+direction];child.facing=direction;child.jump={x1:child.x,y1:roof.y,x2:direction>0?next.x+.025:next.right-.025,y2:next.y,roof:child.roof+direction,age:0,duration:.5+Math.abs(next.y-roof.y)*1.5};this.emit('roof-jump');return false;}
  return true;
 }
 launch(){
  const j=this.job,child=this.child,duration=.76;
  let end;
  if(j.target){const p=j.target,visual=this.personScale(p),bodyY=(54*p.look.height+9)*visual/this.height;end={x:clamp(p.x+p.direction*p.speed*duration,.055,.945),y:p.y-bodyY};}
  else end={x:.055+this.random()*.89,y:.95+this.random()*.035};
  const handX=31+Math.sin(.01+j.age*9)*8,handY=-54*child.look.height-17;
  this.balloon={x1:child.x+handX*this.childScale()/this.width,y1:child.y+handY*this.childScale()/this.height,x2:end.x,y2:end.y,age:0,duration,color:j.color,target:j.target,entry:j.entry};
  j.stage='flight';j.age=0;this.shots++;this.emit('balloon-throw',{entry:j.entry});
 }
 childScale(){return clamp(this.width/1100,.62,.95)*SC.personScale(this.child.look||{});}
 personScale(p){return clamp(this.width/1100,.58,.93)*SC.personScale(p.look);}
 paintMarks(color){return {color,phase:this.random()*6.28,spots:Array.from({length:9},()=>({x:(this.random()-.5)*26,y:(this.random()-.5)*18,r:2+this.random()*3}))};}
 impact(){
  const b=this.balloon,p=b.target;this.balloon=null;this.job=null;
  if(p&&this.people.includes(p)&&p.status==='targeted'){
   p.paint=this.paintMarks(b.color);p.status='angry';p.reactionAge=0;p.jumps=0;this.score++;this.hits++;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);this.effects.push({x:p.x,y:p.y-.07,color:b.color,age:0,text:'+1'});this.emit('hit',{entry:b.entry,target:p,points:1});this.emit('paint-hop');
  }else{
   this.puddles.push({x:b.x2,y:b.y2,...this.paintMarks(b.color)});this.effects.push({x:b.x2,y:b.y2,color:b.color,age:0,text:''});this.emit('miss',{entry:b.entry,reason:'Färgstänk på gatan.'});
  }
 }
 work(dt){
  this.beginJob();const j=this.job;if(!j)return;j.age+=dt;
  if(j.stage==='run'){
   const p=j.target;if(this.moveChild(clamp(p.x+p.direction*p.speed*.9,.055,.945),dt)){j.stage='windup';j.age=0;}
  }else if(j.stage==='windup'&&j.age>=.22)this.launch();
  else if(j.stage==='flight'){
   const b=this.balloon;b.age=Math.min(b.duration,b.age+dt);
   // Track the reserved walker for a forgiving hit, including across a resize.
   if(b.target){const p=b.target;b.x2=p.x;b.y2=p.y-(54*p.look.height+9)*this.personScale(p)/this.height;}
   if(b.age>=b.duration-1e-8)this.impact();
  }
 }
 jumpHeight(p){return p.status==='angry'?Math.sin(Math.PI*((p.reactionAge% .55)/.55))*.04:0;}
 updatePeople(dt){
  for(const p of this.people){p.age+=dt;
   if(p.status==='angry'){
    const before=Math.floor((p.reactionAge+1e-8)/.55);p.reactionAge=Math.min(1.65,p.reactionAge+dt);const count=Math.min(3,Math.floor((p.reactionAge+1e-8)/.55));p.jumps=count;
    if(count>before&&count<3)this.emit('paint-hop');if(count===3)p.status='leaving';
   }else{
    p.x+=p.direction*p.speed*dt*(p.status==='leaving'?2.1:1);
    if(p.status==='targeted')p.x=clamp(p.x,.055,.945);
   }
  }
  const departed=this.people.filter(p=>p.x<-.12||p.x>1.12);if(departed.length){this.people=this.people.filter(p=>!departed.includes(p));this.passed+=departed.length;this.emit('targets');}
  SC.noteTargetAppearance(this);
 }
 finish(){if(this.state!=='playing')return;this.state='celebrating';this.celebrationLeft=2;this.emit('celebrate');}
 update(dt){
  dt=clamp(dt,0,.05);if(this.state==='paused')return;
  if(this.state==='celebrating'){this.clock+=dt;this.celebrationLeft=Math.max(0,this.celebrationLeft-dt);if(this.celebrationLeft<1e-8){this.state='won';this.emit('end',{won:true,score:this.score,hits:this.hits,shots:this.shots,bestStreak:this.bestStreak,passed:this.passed});}return;}
  if(this.state!=='playing'){if(this.state==='menu')this.clock+=dt;return;}
  this.mathPractice?.update(dt);this.clock+=dt;this.elapsed+=dt;this.spawnIn-=dt;if(this.spawnIn<=0&&this.spawned<this.total)this.spawnIn=this.spawn()?this.spawnInterval:.3;
  this.updatePeople(dt);this.work(dt);
  for(const e of this.effects)e.age+=dt;this.effects=this.effects.filter(e=>e.age<.85);
  if(this.passed===this.total&&!this.job)this.finish();
 }
}
class PaintRenderer extends SC.SceneRenderer{
 draw(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height;c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.clearRect(0,0,w,h);c.globalAlpha=1;c.lineWidth=1;
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#80b8c4');sky.addColorStop(.6,'#d2ddd0');sky.addColorStop(1,'#f3d7aa');c.fillStyle=sky;c.fillRect(0,0,w,h);
  this.circle(w*.84,h*.24,25,'#ffe4a0');for(const [x,y,s] of [[.17,.25,1],[.58,.21,.7]]){this.round(x*w-38*s,y*h,83*s,17*s,10,'#f1f1dc99');this.circle(x*w-9*s,y*h-2,18*s,'#f1f1dc99');this.circle(x*w+16*s,y*h+1,13*s,'#f1f1dc99');}
  for(const b of g.buildings)this.building(b);
  c.fillStyle='#d2be9e';c.fillRect(0,h*.745,w,h*.19);c.fillStyle='#a38e76';c.fillRect(0,h*.929,w,7);c.fillStyle='#61747a';c.fillRect(0,h*.938,w,h*.062);
  c.strokeStyle='#b7a185';c.lineWidth=1;for(let x=0;x<w;x+=55){c.beginPath();c.moveTo(x,h*.747);c.lineTo(x,h*.929);c.stroke();}for(const y of [.806,.868]){c.beginPath();c.moveTo(0,h*y);c.lineTo(w,h*y);c.stroke();}
  c.strokeStyle='#d9d4b0';c.lineWidth=3;for(let x=20;x<w;x+=110){c.beginPath();c.moveTo(x,h*.985);c.lineTo(x+49,h*.985);c.stroke();}
  for(const p of g.puddles){c.save();c.translate(p.x*w,p.y*h);c.scale(1,.3);this.splatter(p,17);c.restore();}
  this.child();
  for(const p of [...g.people].sort((a,b)=>a.y-b.y||a.id-b.id))this.person(p);
  this.labels();
  if(g.balloon){const b=g.balloon,t=b.age/b.duration,x=(b.x1+(b.x2-b.x1)*t)*w,y=(b.y1+(b.y2-b.y1)*t-Math.sin(t*Math.PI)*.12)*h;c.save();c.translate(x,y);c.rotate(t*2);c.fillStyle=b.color;c.beginPath();c.ellipse(0,0,8,10,0,0,6.28);c.fill();this.circle(-2,-4,2,'#fffaf6c9');c.fillStyle=b.color;c.beginPath();c.moveTo(-3,9);c.lineTo(3,9);c.lineTo(0,13);c.fill();c.restore();}
  for(const e of g.effects){c.globalAlpha=1-e.age/.85;for(let i=0;i<9;i++){const a=i*2.4;this.circle(e.x*w+Math.cos(a)*e.age*63,e.y*h+Math.sin(a)*e.age*47+e.age*e.age*38,3,e.color);}c.fillStyle='#315b58';c.textAlign='center';c.font='bold 24px system-ui';c.fillText(e.text,e.x*w,e.y*h-24-e.age*26);}c.globalAlpha=1;
  if(g.state==='celebrating'){const bw=Math.min(360,w-20);this.round((w-bw)/2,126,bw,40,12,'#355e61','#ffd68d');c.font='bold 18px system-ui';c.fillStyle='#fff0d1';c.textAlign='center';c.fillText('40 förbipasserande · '+g.hits+' träffar!',w/2,152,bw-12);}
 }
 building(b){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,x=b.x*w,y=b.y*h,bw=(b.right-b.x)*w,bh=(.745-b.y)*h;
  this.round(x,y,bw,bh,4,b.color);c.fillStyle='#00000012';c.fillRect(x+bw-10,y,10,bh);this.round(x-4,y-7,bw+8,10,3,b.trim);this.round(x+9,y-12,bw-18,5,2,'#65767c');
  const cols=w<600?2:3,ww=Math.min(36,bw/(cols*1.8)),wh=Math.min(43,bh*.23);for(let row=0;row<2;row++)for(let col=0;col<cols;col++){const xx=x+(col+.5)*bw/cols-ww/2,yy=y+25+row*(wh+24);this.round(xx-3,yy-3,ww+6,wh+6,3,b.trim);this.round(xx,yy,ww,wh,1,'#516e7b');c.fillStyle='#b7d3cd';c.fillRect(xx+3,yy+3,ww/2-4,wh-6);c.strokeStyle=b.trim;c.lineWidth=2;c.beginPath();c.moveTo(xx+ww/2,yy);c.lineTo(xx+ww/2,yy+wh);c.stroke();}
  this.round(x+bw*.4,h*.745-51,bw*.2,51,3,'#596b69');this.circle(x+bw*.56,h*.745-23,2,'#f4d195');const sw=Math.min(bw-16,147);this.round(x+(bw-sw)/2,h*.745-78,sw,21,4,b.trim);c.fillStyle='#526166';c.font='bold '+(w<600?9:12)+'px system-ui';c.textAlign='center';c.fillText(b.name,x+bw/2,h*.745-63,sw-8);
 }
 child(){
  const g=this.game,ch=g.child;if(!ch.look)return;const s=clamp(g.width/1100,.62,.95),j=g.job,walking=j?.stage==='run'&&!ch.jump,walk=walking&&!this.reduced?Math.sin(g.clock*18)*5:0,celebrate=g.state==='celebrating';
  SC.drawPerson(this,{x:ch.x*g.width,feet:ch.y*g.height,scale:s,look:ch.look,walk,anger:0,wave:celebrate?.01+g.clock*9:j?.stage==='windup'?.01+j.age*9:0,carry:j&&j.stage!=='flight'?(x,y)=>{const bx=j.stage==='windup'?31+Math.sin(.01+j.age*9)*8:-29*ch.look.width,by=j.stage==='windup'?y-33:-24+walk;this.circle(bx,by,9,j.color);this.circle(bx-3,by-3,2,'#fff7e5');}:null});
  if(j&&!j.target&&j.stage==='windup'){const x=clamp(ch.x*g.width,60,g.width-60),y=ch.y*g.height-112*s;this.round(x-55,y,110,24,8,'#fff2d5');this.ctx.fillStyle='#725e51';this.ctx.font='bold 12px system-ui';this.ctx.textAlign='center';this.ctx.fillText(j.entry.text+' ?',x,y+16,102);}
 }
 splatter(p,radius){
  const c=this.ctx;c.fillStyle=p.color;c.beginPath();for(let i=0;i<24;i++){const a=i*Math.PI/12,rad=radius*(i%2?.64:1+.2*Math.sin(i*3.7+p.phase));const x=Math.cos(a)*rad,y=Math.sin(a)*rad;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();for(const d of p.spots)this.circle(d.x*1.35,d.y*1.35,d.r,p.color);
 }
 person(p){
  const g=this.game,c=this.ctx,x=p.x*g.width,feet=(p.y-g.jumpHeight(p))*g.height,s=clamp(g.width/1100,.58,.93),visual=s*SC.personScale(p.look),walk=p.status==='angry'||this.reduced?0:Math.sin(g.clock*13+p.look.phase)*5;
  SC.drawPerson(this,{x,feet,scale:s,look:p.look,walk,anger:p.paint?1:0});
  if(p.paint){c.save();c.translate(x,feet);c.scale(visual,visual);c.translate(0,-54*p.look.height+18);this.splatter(p.paint,11);c.translate(-14,-44);this.circle(0,0,4,p.paint.color);c.restore();}
 }
 labels(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,states=g.getTaskStates(),hints=SC.pinyinHints(g),boxes=[],targets=g.getTargets().sort((a,b)=>a.y-b.y||a.x-b.x),gap=4;
  const overlaps=(a,b)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
  const child=g.child,blocked=[{x:child.x*w-38,y:child.y*h-100*g.childScale(),w:76,h:100*g.childScale()+12}];
  for(const person of g.people){const s=g.personScale(person);blocked.push({x:person.x*w-28*s,y:person.y*h-(54*person.look.height+52)*s,w:56*s,h:(54*person.look.height+54)*s});}
  for(const p of targets){
   const maxWidth=Math.min(w<600?110:154,w-16),font=['chinese','bopomofo'].includes(g.mode)?22:w<600?13:17;
   const hint=hints.has(p),bw=SC.labelWidth(c,p.item.label,{font:'bold '+font+'px system-ui',hint:hint?p.item.hint:'',hintFont:'11px system-ui',max:maxWidth}),bh=hint?47:33,s=g.personScale(p),anchor={x:p.x*w,y:p.y*h-(54*p.look.height+54)*s},candidates=[];
   const top=Math.max(178,h*.50),bottom=h*.92-bh;
   // On narrow streets, aligned slots prevent eight moving labels from trapping
   // one another in the gaps left by greedy free placement.
   const cols=Math.max(1,Math.floor((w-16+8)/(maxWidth+8))),dx=cols>1?(w-16-maxWidth)/(cols-1):0,slots=[];
   for(let yy=top;yy<=bottom;yy+=bh+8)for(let col=0;col<cols;col++)slots.push({x:8+col*dx+(maxWidth-bw)/2,y:yy,w:bw,h:bh});
   slots.sort((a,b)=>Math.hypot(a.x+bw/2-anchor.x,a.y+bh-anchor.y)-Math.hypot(b.x+bw/2-anchor.x,b.y+bh-anchor.y));
   if(w>=900)for(const dy of [0,-bh-6,bh+5,-2*bh-10])for(const offset of [0,-bw*.65,bw*.65])candidates.push({x:clamp(anchor.x-bw/2+offset,8,w-bw-8),y:clamp(anchor.y-bh-6+dy,top,bottom),w:bw,h:bh});
   candidates.push(...slots);
   const box=candidates.find(b=>[...boxes,...blocked].every(a=>!overlaps(a,b)))||candidates.find(b=>boxes.every(a=>!overlaps(a,b)))||candidates[0];boxes.push(box);
   c.strokeStyle='#735f5480';c.lineWidth=1;c.beginPath();c.moveTo(anchor.x,anchor.y+3);c.lineTo(box.x+bw/2,box.y+bh);c.stroke();
   const state=states.get(p);this.round(box.x,box.y,bw,bh,9,state?'#b7ecd7':'#fff4dc',state==='active'?'#408f7d':p.look.exotic?'#bc9047':'#b89a77');c.fillStyle='#405553';c.font='bold '+font+'px system-ui';c.textAlign='center';c.fillText(p.item.label,box.x+bw/2,box.y+22,bw-12);
   if(hint){c.font='11px system-ui';c.fillText(p.item.hint||'',box.x+bw/2,box.y+38,bw-12);}
  }
  this.labelBoxes=boxes;
 }
}
SC.PaintGame=PaintGame;SC.PaintRenderer=PaintRenderer;
})(globalThis);
