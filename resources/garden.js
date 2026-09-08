/* Garden simulation. One worker, one held tool, and a shared answer queue. */
(function(root){
'use strict';const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PROPS=['moisture','nutrition','infection'],NAMES={moisture:'Vatten',nutrition:'Näring',infection:'Ohyra'},COLORS={moisture:'#72cafa',nutrition:'#f5d278',infection:'#d6a8f6'};
class GardenGame{
  constructor({onEvent=()=>{},random=Math.random,queue=new SC.AnswerQueue()}={}){Object.assign(this,{onEvent,random,queue,width:1000,height:650});this.menu();}
  emit(type,detail={}){this.onEvent({type,...detail});}
  resize(width,height){Object.assign(this,{width,height});this.layoutPots();}
  menu(){this.state='menu';this.clock=0;this.pots=[];this.tools=[];this.effects=[];this.job=null;this.gardener={x:0,y:0,held:null,look:SC.makePerson(this.random)};}
  start({mode='swedish',pace='gentle',lang='sv-SE',items=null,uppercase=Math.random()<.5}={}){
    this.menu();Object.assign(this,{mode,pace,lang,uppercase});this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Övningen behöver minst ett svar.');
    this.state='playing';this.elapsed=0;this.score=0;this.hits=0;this.shots=0;this.streak=0;this.bestStreak=0;this.nextId=0;
    const count={gentle:6,steady:9,brave:12}[pace];this.decayInterval=.1;this.decayElapsed=0;this.failedPot=null;this.layoutSeed=this.random()*10000;
    this.gardener.look.hat=true;
    this.tools=PROPS.map((property,i)=>({property,x:(i-1)*.36,y:.28}));
    this.pots=Array.from({length:count},(_,i)=>{
      const jitterX=this.random()-.5,jitterY=this.random()-.5;
      return {id:i+1,x:0,y:0,jitterX,jitterY,growth:0,moisture:.65+this.random()*.25,nutrition:.65+this.random()*.25,infection:.1+this.random()*.25,decay:0,requests:{},bloom:false,dead:false,look:SC.makePlantLook(this.random,{pot:['#cf8768','#e6b779','#a8b9cc','#ba8ea7'][i%4]})};
    });this.layoutPots();this.emit('start');
  }
  layoutPots(){
    if(!this.pots.length)return;
    const cols=this.width<600||this.pots.length===6?3:4,rows=Math.ceil(this.pots.length/cols);
    const cells=Array.from({length:cols*rows},(_,i)=>({i,rank:Math.sin(this.layoutSeed+i*73.173)*43758.5453%1})).sort((a,b)=>a.rank-b.rank);
    this.pots.forEach((p,i)=>{const cell=cells[i].i;p.x=((cell%cols+.5)/cols)*2-1+p.jitterX*1.1/cols;p.y=((Math.floor(cell/cols)+.5)/rows)*2-1+p.jitterY*.7/rows;});
    if(this.elapsed===0){
      const spots=[{x:0,y:.15},{x:.32,y:.1},{x:-.32,y:.1},{x:0,y:.38},{x:.32,y:.38},{x:-.32,y:.38}];
      spots.sort((a,b)=>Math.min(...this.pots.map(p=>Math.hypot(b.x-p.x,b.y-p.y)))-Math.min(...this.pots.map(p=>Math.hypot(a.x-p.x,a.y-p.y))));
      Object.assign(this.gardener,spots[0]);this.tools.forEach((t,i)=>Object.assign(t,{x:spots[0].x+(i-1)*.2,y:spots[0].y+.16}));
    }
  }
  averageHealth(){return this.pots.length?this.pots.reduce((sum,p)=>sum+(p.bloom?1:p.dead?0:(p.moisture+p.nutrition+1-p.infection)/3),0)/this.pots.length:1;}
  gardenerAnger(){return ['celebrating','won'].includes(this.state)?0:1-this.averageHealth();}
  requestInterval(){
    // One care cycle per minute per living plant. Twelve plants average one
    // request every five seconds, leaving room for reading and tool travel.
    // Difficulty comes from plant count; traffic never accelerates with time.
    const active=this.pots.filter(p=>!p.bloom&&!p.dead).length;
    return active?60*(SC.isMath(this.mode)?2:1)/active:Infinity;
  }
  decayProbability(){
    // Two 0.2 changes create a 0.4 request after care. One global trial, not one per pot.
    return Math.min(1,2*this.decayInterval/this.requestInterval());
  }
  decayPlants(){
    const active=this.pots.filter(p=>!p.bloom&&!p.dead);if(!active.length||this.random()>=this.decayProbability())return;
    const p=active[Math.floor(this.random()*active.length)],key=PROPS[Math.floor(this.random()*3)];
    p[key]=clamp(Math.round((p[key]+(key==='infection'?.2:-.2))*10)/10,0,1);this.syncRequests(p);
    this.emit('care-tick',{pots:[p.id],property:key});
  }
  pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
  resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
  badness(p,key){return key==='infection'?p[key]:1-p[key];}
  getAvailableTargets(){return this.getTargets().filter(t=>t!==this.job?.request);}
  getActiveEntries(){return this.job?[this.job.entry]:[];}
  getTargets(){return this.pots.flatMap(p=>Object.values(p.requests)).sort((a,b)=>this.badness(b.pot,b.property)-this.badness(a.pot,a.property)||a.id-b.id);}
  getTaskStates(){
    const states=new Map(),targets=this.getTargets();
    if(this.job?.request&&targets.includes(this.job.request))states.set(this.job.request,'active');
    for(const entry of this.queue.items){const request=targets.find(t=>!states.has(t)&&SC.matches(entry.text,t.item,this.mode,this.lang,entry.source));if(request)states.set(request,'queued');}
    return states;
  }
  syncRequests(p){
    if(p.bloom||p.dead){p.requests={};return;}
    for(const property of PROPS){
      if(this.badness(p,property)<.4-1e-8){delete p.requests[property];continue;}
      if(p.requests[property])continue;
      const items=SC.practiceItems(this),used=this.getTargets().map(t=>t.item.answer),pool=items.filter(i=>!used.includes(i.answer)),choices=pool.length?pool:items;
      const base=choices[Math.floor(this.random()*choices.length)],item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);
      p.requests[property]={id:++this.nextId,pot:p,property,item,appearedAt:this.clock};this.emit('need',{pot:p,property});
    }
  }
  workerStatus(){if(['celebrating','won'].includes(this.state))return this.pots.filter(p=>p.bloom).length+' plantor blommar!';if(['mourning','lost'].includes(this.state))return 'Alla plantor vissnade';const j=this.job;if(!j)return 'Trädgårdsmästaren väntar på nästa svar';if(j.stage==='think')return j.entry.text+' ?';return `${j.entry.text} · ${j.stage==='fetch'?'hämtar '+NAMES[j.request.property].toLowerCase():j.stage==='run'?'springer till kruka '+j.request.pot.id:'sköter kruka '+j.request.pot.id}`;}
  beginJob(){
    if(this.job||!this.queue.length)return;
    const entry=this.queue.take();if(!entry)return;
    const request=this.getTargets().find(t=>SC.matches(entry.text,t.item,this.mode,this.lang,entry.source));this.shots++;
    if(!request){this.job={entry,stage:'think',age:0};this.emit('think',{entry});return;}
    const tool=this.tools.find(t=>t.property===request.property),g=this.gardener;
    this.job={entry,request,tool,age:0,stage:g.held===tool?'run':'fetch'};
    if(g.held&&g.held!==tool){g.held.x=g.x;g.held.y=g.y;g.held=null;this.emit('drop');}
  }
  moveTo(target,dt){const g=this.gardener,dx=target.x-g.x,dy=target.y-g.y,d=Math.hypot(dx,dy),step=2.8*.2*dt;
    if(d<=step){g.x=target.x;g.y=target.y;return true;}g.x+=dx/d*step;g.y+=dy/d*step;return false;
  }
  work(dt){
    this.beginJob();const j=this.job;if(!j)return;j.age+=dt;
    if(j.stage==='think'){if(j.age>=1.9)this.job=null;return;}
    if(j.request.pot.bloom||j.request.pot.dead||j.request.pot.requests[j.request.property]!==j.request){this.job=null;return;}
    if(j.stage==='fetch'){
      if(this.moveTo(j.tool,dt)){this.gardener.held=j.tool;j.stage='run';j.age=0;this.emit('pickup');}
    }else if(j.stage==='run'){
      const p=j.request.pot;
      if(this.moveTo({x:p.x*.79,y:p.y*.79},dt)){j.stage='tend';j.age=0;this.emit(j.request.property==='moisture'?'water':j.request.property==='nutrition'?'feed':'spray');}
    }else if(j.stage==='tend'&&j.age>=.42){
      const {pot,property}=j.request;pot[property]=property==='infection'?0:1;this.syncRequests(pot);this.score+=100;this.hits++;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);this.effects.push({pot,property,age:0});this.emit('hit',{entry:j.entry,target:j.request,points:100});this.job=null;
    }
  }
  endResult(won){this.emit('end',{won,score:this.score,hits:this.hits,shots:this.shots,bestStreak:this.bestStreak,flowers:this.pots.filter(p=>p.bloom).length,dead:this.pots.filter(p=>p.dead).length});}
  finish(won){
    if(this.state!=='playing')return;this.job=null;
    if(won){if(this.gardener.look.exotic)this.emit('rare-earned',{look:this.gardener.look,bonus:0});this.state='celebrating';this.celebrationLeft=4;this.emit('celebrate');}
    else{this.state='mourning';this.lossPauseLeft=3;this.emit('loss-pause',{pot:this.failedPot});}
  }
  update(dt){
    if(this.state==='paused')return;dt=clamp(dt,0,.05);
    if(this.state==='celebrating'){this.clock+=dt;this.celebrationLeft=Math.max(0,this.celebrationLeft-dt);if(this.celebrationLeft<1e-8){this.celebrationLeft=0;this.state='won';this.endResult(true);}return;}
    if(this.state==='mourning'){this.clock+=dt;this.lossPauseLeft=Math.max(0,this.lossPauseLeft-dt);if(this.lossPauseLeft<1e-8){this.lossPauseLeft=0;this.state='lost';this.endResult(false);}return;}
    if(this.state!=='playing'){if(this.state==='menu')this.clock+=dt;return;}
    this.clock+=dt;this.elapsed+=dt;for(const e of this.effects)e.age+=dt;this.effects=this.effects.filter(e=>e.age<1);
    this.decayElapsed+=dt;if(this.decayElapsed>=this.decayInterval-1e-8){this.decayElapsed-=this.decayInterval;this.decayPlants();}
    for(const p of this.pots){
      if(p.bloom||p.dead)continue;
      if(p.moisture<=0||p.nutrition<=0||p.infection>=1){p.dead=true;p.requests={};this.failedPot=p;this.lossReason=p.moisture<=0?'Vattnet tog slut':p.nutrition<=0?'Näringen tog slut':'För mycket ohyra';this.emit('plant-dead',{pot:p});if(this.job?.request?.pot===p)this.job=null;continue;}
      if(p.moisture>=.4&&p.nutrition>=.4&&p.infection<=.6)p.growth=clamp(p.growth+dt*.021*p.moisture*p.nutrition*(1-p.infection),0,1);
      if(p.growth>=1){p.bloom=true;p.requests={};this.score+=500;this.emit('flower',{pot:p});}
    }
    if(this.pots.every(p=>p.bloom||p.dead)){this.finish(this.pots.some(p=>p.bloom));return;}
    this.work(dt);
  }
}
SC.drawGardenTool=function(r,property,x,y,s=1){
  const c=r.ctx;c.save();c.translate(x,y);c.scale(s,s);c.lineWidth=2;c.strokeStyle=COLORS[property];
  if(property==='moisture'){
    r.round(-9,-9,18,16,3,COLORS[property]);c.beginPath();c.arc(-11,-4,6,Math.PI*.5,Math.PI*1.5);c.stroke();c.beginPath();c.moveTo(8,-1);c.lineTo(17,-10);c.lineTo(21,-8);c.lineTo(10,5);c.fillStyle=COLORS[property];c.fill();
  }else if(property==='nutrition'){
    r.round(-9,-13,18,23,4,COLORS[property]);r.round(-8,-14,16,4,1,'#c69845');c.fillStyle='#50845b';c.beginPath();c.ellipse(0,-2,4,7,.6,0,Math.PI*2);c.fill();
  }else{r.round(-7,-6,14,17,4,COLORS[property]);r.round(-4,-12,8,8,2,'#efdcff');r.round(-5,-16,16,5,2,COLORS[property]);c.beginPath();c.moveTo(4,-10);c.lineTo(8,-5);c.stroke();}
  c.restore();
};
class GardenRenderer extends SC.SceneRenderer{
  projection(){const w=this.game.width,h=this.game.height;this.scale=clamp(w/1000,.52,.95);const top=125+150*this.scale,bottom=h-45*this.scale-10;this.origin={x:w/2,y:(top+bottom)/2};this.unitX=(w-2*(75*this.scale+12))/2;this.unitY=(bottom-top)/2;}
  point(p){return {x:this.origin.x+p.x*this.unitX,y:this.origin.y+p.y*this.unitY};}
  draw(){
    const c=this.ctx,g=this.game,w=g.width,h=g.height;this.projection();c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.clearRect(0,0,w,h);c.globalAlpha=1;c.lineWidth=1;
    const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#193c41');sky.addColorStop(1,'#456c54');c.fillStyle=sky;c.fillRect(0,0,w,h);
    c.fillStyle='#87af6d15';for(let i=0;i<40;i++){const x=(i*149%997)/997*w,y=125+(i*71%419)/419*(h-125);c.beginPath();c.ellipse(x,y,15,4,-.3,0,6.28);c.fill();}
    // Quiet stepping stones suggest paths through the scattered pots.
    for(const p of g.pots){const q=this.point(p);c.fillStyle='#d7d59c18';c.beginPath();c.ellipse(q.x-18*this.scale,q.y+45*this.scale,15*this.scale,5*this.scale,.2,0,6.28);c.fill();}
    for(const tool of g.tools)if(g.gardener.held!==tool){const p=this.point(tool);this.circle(p.x,p.y,17*this.scale,'#213f43');SC.drawGardenTool(this,tool.property,p.x,p.y,this.scale);}
    const actors=[...g.pots.map(p=>({y:p.y,draw:()=>this.plant(p)})),{y:g.gardener.y,draw:()=>this.person()}];actors.sort((a,b)=>a.y-b.y);for(const a of actors)a.draw();
    for(const e of g.effects){const p=this.point(e.pot);c.globalAlpha=1-e.age;c.font='bold 17px system-ui';c.textAlign='center';c.fillStyle=COLORS[e.property];SC.drawGardenTool(this,e.property,p.x,p.y-65*this.scale-e.age*24,.8);}c.globalAlpha=1;
    this.bubbles();
    if(g.state==='mourning'){
      const p=this.point(g.failedPot),bw=Math.min(340,w-24);c.strokeStyle='#ffb793';c.lineWidth=3;c.beginPath();c.ellipse(p.x,p.y-35*this.scale,63*this.scale,100*this.scale,0,0,Math.PI*2);c.stroke();
      this.round((w-bw)/2,h-69,bw,55,12,'#543f38','#ffb793');c.textAlign='center';c.fillStyle='#fff0db';c.font='bold 17px system-ui';c.fillText('Alla plantor vissnade',w/2,h-45);c.font='13px system-ui';c.fillText(g.lossReason,w/2,h-25);
    }
    if(g.job?.stage==='think'){
      const p=this.point(g.gardener),text=g.job.entry.text+' ?',bw=SC.labelWidth(c,text,{font:'bold 16px system-ui',max:Math.min(200,w-30)});this.round(clamp(p.x-bw/2,8,w-bw-8),p.y-145*this.scale,bw,32,10,'#fff0d3','#dbb585');c.fillStyle='#594f44';c.font='bold 16px system-ui';c.textAlign='center';c.fillText(text,clamp(p.x,bw/2+8,w-bw/2-8),p.y-124*this.scale,bw-16);
    }
  }
  plant(p){
    const c=this.ctx,g=this.game,pos=this.point(p),s=this.scale,look=p.look,H=30+p.growth*72,droop=(p.dead?1:1-p.moisture)*(12+18*p.growth),bend=Math.sin(look.phase)*droop;
    c.save();c.translate(pos.x,pos.y);c.scale(s,s);
    this.circle(0,0,33,'#172e3135');
    c.fillStyle=p.dead?'#7a746b':look.pot;c.beginPath();c.moveTo(-28,-4);c.lineTo(-21,27);c.quadraticCurveTo(0,34,21,27);c.lineTo(28,-4);c.fill();
    c.fillStyle=look.pot;c.beginPath();c.ellipse(0,-4,30,10,0,0,6.28);c.fill();c.fillStyle=SC.soilColor(p.moisture,p.dead);c.beginPath();c.ellipse(0,-5,25,6,0,0,6.28);c.fill();
    SC.drawPlant(this,p,g.clock);
    c.font='bold 13px system-ui';c.textAlign='center';c.fillStyle='#fff5db';p.bloom&&c.fillText('✿',0,17);
    this.round(-25,35,50,4,2,'#213f42');if(p.growth)this.round(-25,35,50*p.growth,4,2,p.bloom?'#ffe29e':'#a9e4b1');c.restore();
  }
  person(){
    const g=this.game,p=this.point(g.gardener),moving=['fetch','run'].includes(g.job?.stage),walk=moving&&!this.reduced?Math.sin(g.clock*17)*5:0;
    const jump=g.state==='celebrating'?Math.abs(Math.sin((4-g.celebrationLeft)*Math.PI*2))*22*this.scale:0;
    SC.drawPerson(this,{x:p.x,feet:p.y-jump,scale:this.scale*.79,look:g.gardener.look,walk,anger:g.gardenerAnger(),carry:g.gardener.held?(x,y)=>SC.drawGardenTool(this,g.gardener.held.property,x+22,y+.5,1):null});
    if(g.job?.stage==='tend'){
      const p=this.point(g.job.request.pot);for(let i=0;i<7;i++){const t=(g.clock*2+i/7)%1;this.circle(p.x-10+i*3,p.y-45*this.scale+t*30,1.5,COLORS[g.job.request.property]);}
    }
  }
  bubbles(){
    const c=this.ctx,g=this.game,w=g.width,h=g.height,boxes=[],crowded=g.getTargets().length>12,taskStates=g.getTaskStates(),hints=SC.pinyinHints(g);
    const blocked=g.pots.map(p=>{const q=this.point(p);const bounds=SC.plantBounds(p);return {x:q.x-45*this.scale,y:q.y+bounds.top*this.scale,w:90*this.scale,h:(40-bounds.top)*this.scale};});
    const gardener=this.point(g.gardener);blocked.push({x:gardener.x-42*this.scale,y:gardener.y-116*this.scale,w:84*this.scale,h:138*this.scale});
    const overlaps=(a,b)=>a.x<b.x+b.w+5&&a.x+a.w+5>b.x&&a.y<b.y+b.h+5&&a.y+a.h+5>b.y;
    for(const pot of g.pots){
      const reqs=Object.values(pot.requests);if(!reqs.length)continue;
      const font='bold '+((SC.isChinese(g.mode)||g.mode==='bopomofo')?21:16)+'px system-ui';
      const widths=reqs.map(r=>{const main=SC.labelWidth(c,r.item.label,{font,padding:0,min:0,max:400});if(hints.has(r))return main+SC.labelWidth(c,r.item.hint||'',{font:'10px system-ui',padding:0,min:0,max:400})+43;return main+38;});
      const p=this.point(pot),bw=clamp(Math.max(...widths),48,w<500?144:180),row=28,bh=reqs.length*row+8,candidates=[];
      const bx=pot.x>=0?p.x+30*this.scale:p.x-bw-30*this.scale;
      for(const [x,y] of [[bx,p.y-bh/2],[p.x-bw/2,p.y-(42+pot.growth*75)*this.scale-bh],[p.x-bw/2,p.y+40*this.scale],[w/2-bw/2,135]])candidates.push({x:clamp(x,7,w-bw-7),y:clamp(y,120,h-bh-9),w:bw,h:bh});
      for(let y=120;y<h-bh-8;y+=16)for(let x=7;x<w-bw;x+=22)candidates.push({x,y,w:bw,h:bh});
      const good=candidates.filter(b=>[...boxes,...blocked].every(o=>!overlaps(b,o)));good.sort((a,b)=> (crowded&&Math.abs(a.y-b.y)>1?a.y-b.y:0)||Math.hypot(a.x+bw/2-p.x,a.y+bh/2-p.y)-Math.hypot(b.x+bw/2-p.x,b.y+bh/2-p.y));
      const box=good[0]||candidates.find(b=>boxes.every(o=>!overlaps(b,o))&&!overlaps(b,blocked[blocked.length-1]))||candidates[0];boxes.push(box);
      c.strokeStyle='#c6d6b680';c.lineWidth=1;c.beginPath();c.moveTo(p.x,p.y-20*this.scale);c.lineTo(box.x+bw/2,box.y+bh/2);c.stroke();
      this.round(box.x,box.y,bw,bh,10,'#f5efd8','#b2c79e');
      for(let i=0;i<reqs.length;i++){
        const r=reqs[i],y=box.y+4+i*row,state=taskStates.get(r);
        if(state)this.round(box.x+3,y,bw-6,row,5,'#62df87',state==='active'?'#17683b':null);
        SC.drawGardenTool(this,r.property,box.x+16,y+14,.53);c.fillStyle=g.badness(pot,r.property)>=.8?'#a14b38':'#304a41';c.textAlign='center';c.font='bold '+(SC.isChinese(g.mode)||g.mode==='bopomofo'?21:16)+'px system-ui';if(hints.has(r)){c.fillText(r.item.label,box.x+40,y+21,24);c.font='10px system-ui';c.fillText(r.item.hint||'',box.x+51+(bw-57)/2,y+18,bw-57);}else c.fillText(r.item.label,box.x+30+(bw-36)/2,y+20,bw-36);
      }
    }
    this.bubbleBoxes=boxes;
  }
}
SC.GardenGame=GardenGame;SC.GardenRenderer=GardenRenderer;SC.gardenNames=NAMES;
})(globalThis);
