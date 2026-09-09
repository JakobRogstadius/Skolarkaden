/* Game module. No knowledge of DOM input controls or speech engines. */
(function(root){
  'use strict';
  const SC=root.Starlight;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const difference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const PALETTE=['#85f0c4','#ffdc88','#97c6ff','#f3a8d2','#c4afff'];
  // Fit the actual glyphs (and optional pinyin/Swedish meaning), with seven pixels on each side.
  SC.labelWidth=function(c,text,{font=c.font,hint='',translation='',hintFont='12px system-ui',padding=7,min=28,max=220}={}){
    if(text?.diagram)return clamp(112,min,max);
    if(typeof text==='object')text=text.label;
    c.save();c.font=font;let width=c.measureText(text).width;
    if(hint||translation){c.font=hintFont;width=Math.max(width,c.measureText(hint).width,c.measureText(translation).width);}c.restore();
    return clamp(Math.ceil(width)+padding*2,min,max);
  };
  SC.labelHeight=(item,height,footer=0)=>item.diagram?80+footer:height;
  SC.drawMathDiagram=function(c,diagram,box){
    c.save();
    // A pale panel keeps black chart ink legible in every game's task bubble.
    c.fillStyle='#faf9f5';c.beginPath();c.roundRect(box.x+2,box.y+2,box.w-4,box.h-4,5);c.fill();
    const scale=Math.min((box.w-8)/104,(box.h-8)/72,1);
    c.translate(box.x+box.w/2,box.y+box.h/2);c.scale(scale,scale);c.translate(-52,-36);
    c.strokeStyle='#000';c.fillStyle='#000';c.lineWidth=1.5;c.setLineDash([]);
    c.font='bold 16px sans-serif';c.textAlign='center';c.textBaseline='middle';
    const line=(x1,y1,x2,y2)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
    const label=(text,x,y)=>{c.fillStyle='#000';c.fillText(String(text),x,y);};
    const values=diagram.unknownFirst?[diagram.answer,diagram.known]:[diagram.known,diagram.answer];
    const labels=diagram.unknownFirst?['?',diagram.known]:[diagram.known,'?'];
    if(diagram.kind==='pie'){
      const total=values[0]+values[1],radius=29;
      // Anchor the first slice boundary at twelve o'clock.
      let angle=-Math.PI/2;
      for(let i=0;i<2;i++){
        const sweep=values[i]/total*Math.PI*2,mid=angle+sweep/2;
        c.fillStyle=diagram.colors[i];c.beginPath();c.moveTo(48,36);c.arc(48,36,radius,angle,angle+sweep);c.closePath();c.fill();c.stroke();
        const outside=values[i]/total<.2,offset=outside?44:17;
        if(outside)line(48+Math.cos(mid)*radius,36+Math.sin(mid)*radius,48+Math.cos(mid)*36,36+Math.sin(mid)*36);
        label(labels[i],48+Math.cos(mid)*offset,36+Math.sin(mid)*offset);angle+=sweep;
      }
    }else if(diagram.kind==='bars'){
      const max=Math.max(...values),border=c.lineWidth,inset=border/2;
      // Dimensions describe the outside of the border, including the baseline.
      const bar=(x,y,width,height,color)=>{
        c.fillStyle=color;c.fillRect(x+inset,y+inset,width-border,height-border);
        c.strokeRect(x+inset,y+inset,width-border,height-border);
      };
      if(diagram.horizontal){
        values.forEach((n,i)=>{const width=n/max*70,y=12+i*28;bar(10,y,width,20,diagram.colors[i]);label(labels[i],width>=27?10+width/2:10+width+12,y+10);});
        line(10+inset,7,10+inset,65);
      }else{
        values.forEach((n,i)=>{const height=n/max*48,x=21+i*40;bar(x,62-height,24,height,diagram.colors[i]);label(labels[i],x+12,height>=24?62-height/2:62-height-10);});
        line(10,62-inset,96,62-inset);
      }
    }else if(diagram.kind==='dots'){
      c.fillStyle=diagram.colors[0];for(const p of diagram.dots){c.beginPath();c.arc(p.x,p.y,5.5,0,Math.PI*2);c.fill();c.stroke();}
    }else{
      line(9,34,95,34);
      for(let i=0;i<=diagram.notches+1;i++){const x=9+i*86/(diagram.notches+1);line(x,29,x,39);if(i===diagram.unknown)label('?',x,16);}
      label(diagram.start,9,53);label(diagram.end,95,53);
    }
    c.restore();
  };
  // Keep the answer at the center; reveal guidance symmetrically around it.
  SC.drawLabelText=function(c,item,box,{hint=false,hintFont='12px system-ui',hintColor=c.fillStyle}={}){
    if(item.diagram){SC.drawMathDiagram(c,item.diagram,box);return;}
    c.save();c.textAlign='center';c.textBaseline='middle';
    const x=box.x+box.w/2,y=box.y+box.h/2,max=Math.max(1,box.w-14),mainSize=Number(String(c.font).match(/([\d.]+)px/)?.[1]||22);
    c.fillText(item.label,x,y,max);
    if(hint){c.font=hintFont;c.fillStyle=hintColor;const gap=mainSize/2+Number(hintFont.match(/([\d.]+)px/)?.[1]||12)/2+3;
      c.fillText(item.hint||'',x,y-gap,max);c.fillText(item.translation||'',x,y+gap,max);
    }c.restore();
  };
  // The label's first appearance starts the clock, including walkers entering onscreen.
  SC.noteTargetAppearance=function(game){for(const target of game.getTargets())target.appearedAt??=game.clock;};
  SC.pinyinHints=function(game){
    const hints=new Set();if(!SC.isChinese(game.mode))return hints;
    const targets=game.getTargets(),available=new Set(game.getAvailableTargets()),handled=new Set(targets.filter(t=>!available.has(t)));
    // Reserve exactly one remaining target per queued answer, using the speech aliases too.
    for(const entry of game.queue.items){const target=targets.find(t=>!handled.has(t)&&SC.matches(entry.text,t.item,game.mode,game.lang,entry.source));if(target)handled.add(target);}
    for(const target of targets){
      if(!target.item.hint)continue;
      if(game.state==='playing'&&target.appearedAt!==undefined&&game.clock-target.appearedAt>=5-1e-8&&!handled.has(target))target.pinyinRevealed=true;
      // Keep a revealed hint until the task disappears; queue changes must not resize it.
      if(target.pinyinRevealed)hints.add(target);
    }return hints;
  };
  SC.cityGoal=40;
  SC.cityPressure=(progress,elapsed)=>clamp(progress+elapsed/216,0,1);
  SC.citySpawnInterval=(pace,spawned,rng=Math.random)=>({gentle:5,steady:3,brave:1.5}[pace])*(spawned>=34?.5:1)*(.75+.5*rng());
  class CityGame {
    constructor({onEvent=()=>{},random=Math.random,queue=new SC.AnswerQueue()}={}){
      this.onEvent=onEvent;this.random=random;this.queue=queue;this.width=1000;this.height=600;
      this.state='menu';this.clock=0;this.threats=[];this.effects=[];this.lasers=[];
      this.resetCity();
    }
    resetCity(){
      this.buildings=[.065,.15,.33,.415,.585,.67,.85,.935].map((x,i)=>({id:'b'+i,type:'building',fraction:x,alive:true,height:[54,75,48,85,63,49,78,54][i],color:PALETTE[i%5]}));
      this.turrets=[.235,.5,.765].map((x,i)=>({id:'t'+i,type:'turret',fraction:x,alive:true,angle:-Math.PI/2,index:i}));
      this.placeCity();
    }
    placeCity(){
      this.ground=this.height-56;
      for(const b of this.buildings){b.x=b.fraction*this.width;b.y=this.ground-b.height;}
      for(const t of this.turrets){t.x=t.fraction*this.width;t.y=this.ground-23;}
    }
    resize(width,height){
      const ratio=width/this.width;
      this.width=width;this.height=height;this.placeCity();
      for(const t of this.threats){
        t.startX*=ratio;
        this.position(t);
      }
    }
    start({mode='letters',pace='gentle',lang='sv-SE',items=null,uppercase=Math.random()<.5}={}){
      this.uppercase=uppercase;this.mode=mode;this.pace=pace;this.lang=lang;
      this.items=SC.beginPractice(this,items);
      if(!this.items.length)throw new Error('En övning behöver minst ett svar.');
      this.resetCity();this.threats=[];this.effects=[];this.lasers=[];
      this.hits=0;this.shots=0;this.score=0;this.streak=0;this.bestStreak=0;this.spawned=0;this.resolved=0;
      this.elapsed=0;this.spawnIn=.65;this.nextId=0;this.previewValue='';this.previewSource='text';
      this.lock=null;this.lastMissTurret=0;this.state='playing';this.emit('start');
    }
    emit(type,detail={}){this.onEvent({type,...detail});}
    pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
    resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
    menu(){this.state='menu';this.threats=[];this.lasers=[];this.effects=[];this.resetCity();this.lock=null;}
    livingCity(){return [...this.buildings,...this.turrets].filter(b=>b.alive);}
    getAvailableTargets(){return this.getTargets().filter(t=>!this.turrets.some(g=>g.job?.target===t));}
    getActiveEntries(){return this.turrets.flatMap(g=>g.job?[g.job.entry]:[]);}
    getTargets(){return [...this.threats].sort((a,b)=>(1-a.progress)*a.duration-(1-b.progress)*b.duration);}
    pressure(){return SC.cityPressure(this.hits/SC.cityGoal,this.elapsed);}
    workerStatus(){return this.turrets.filter(t=>t.alive).map(t=>t.job?`${t.index+1}: ${t.job.entry.text} · ${t.job.stage==='aim'?'siktar':t.job.stage==='locked'?'låst':t.job.stage==='fire'?'skjuter':'letar'}`:`${t.index+1}: ledig`).join('  /  ');}
    work(dt){
      for(const gun of this.turrets){
        if(!gun.alive){if(gun.job){const entry=gun.job.entry;gun.job=null;this.queue.returnFront(entry);}continue;}
        gun.cooldown=Math.max(0,(gun.cooldown||0)-dt);
      }
      while(this.queue.length){
        const idle=this.turrets.filter(t=>t.alive&&!t.job&&!t.cooldown);if(!idle.length)break;
        const entry=this.queue.take();if(!entry)break;
        const target=this.getTargets().find(t=>!this.turrets.some(g=>g.job?.target===t)&&SC.matches(entry.text,t.item,this.mode,this.lang,entry.source));
        if(target)idle.sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y));
        const gun=idle[0];gun.job={entry,target,age:0,stage:target?'aim':'search',alignedFor:0};this.emit('work',{entry});
      }
      for(const gun of this.turrets){
        if(this.state!=='playing')break;
        const job=gun.job;if(!gun.alive||!job)continue;job.age+=dt;
        if(job.target&&!this.threats.includes(job.target)){job.target=null;job.age=0;job.stage='search';}
        if(job.stage==='fire'){
          if(job.target){const desired=Math.atan2(job.target.y-gun.y,job.target.x-gun.x);if(Math.abs(difference(desired,gun.angle))>.025){job.stage='aim';job.alignedFor=0;continue;}gun.angle=desired;}
          this.fireJob(gun);continue;
        }
        if(job.target){
          const desired=Math.atan2(job.target.y-gun.y,job.target.x-gun.x),delta=difference(desired,gun.angle);
          gun.angle+=clamp(delta,-1.9*dt,1.9*dt);
          const aligned=Math.abs(difference(desired,gun.angle))<.02;
          if(job.stage==='aim'&&job.age>=.4&&aligned){job.stage='locked';job.alignedFor=0;this.emit('lock',{entry:job.entry});}
          else if(job.stage==='locked'){
            job.alignedFor=aligned?job.alignedFor+dt:0;
            if(job.alignedFor>=.28)job.stage='fire';
          }
        }else if(job.stage==='search'){
          gun.angle=-Math.PI/2+Math.sin(job.age*7)*.6;
          if(job.age>=1.45){job.stage='air-ready';job.age=0;}
        }else if(job.stage==='air-ready'&&job.age>=.2)job.stage='fire';

      }
    }
    fireJob(gun){
      const {entry,target}=gun.job;gun.job=null;gun.cooldown=.38;this.shots++;
      this.lasers.push({x1:gun.x,y1:gun.y,x2:target?target.x:gun.x+Math.cos(gun.angle)*this.height*1.8,y2:target?target.y:gun.y+Math.sin(gun.angle)*this.height*1.8,life:.25,max:.25,hit:!!target});
      this.emit('fire',{entry});
      if(target){
        this.threats=this.threats.filter(t=>t!==target);this.hits++;this.resolved++;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);
        const points=30+this.streak-1;this.score+=points;this.burst(target.x,target.y,target.color,22);this.emit('hit',{target,points,entry});
        this.checkWaveComplete();
      }else{this.streak=0;this.emit('miss',{entry,reason:'Lasern letade en stund och sköt i luften.'});}
    }
    checkWaveComplete(){
      if(this.spawned===SC.cityGoal&&!this.threats.length)this.finish(this.buildings.some(b=>b.alive));
    }
    finish(won){
      if(this.state!=='playing')return;
      this.state=won?'won':'lost';this.lock=null;
      this.score+=this.livingCity().length*50;
      if(won){for(let i=0;i<7;i++)this.burst(this.width*(.1+.8*this.random()),this.height*(.25+.3*this.random()),PALETTE[i%5],30);}
      this.emit('end',{won,score:this.score,hits:this.hits,shots:this.shots,bestStreak:this.bestStreak,buildings:this.buildings.filter(b=>b.alive).length});
    }
    spawn(){
      if(this.state!=='playing'||this.spawned>=SC.cityGoal)return false;
      const live=this.livingCity(),destinations=live.length?live:[...this.buildings,...this.turrets];
      const items=SC.practiceItems(this),available=items.filter(i=>!this.threats.some(t=>t.item.answer===i.answer)),choices=available.length?available:items;
      const base=choices[Math.floor(this.random()*choices.length)];
      const item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};
      item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);
      const destination=destinations[Math.floor(this.random()*destinations.length)];
      const margin=Math.min(76,this.width*.22);
      const slots=Array.from({length:7},(_,i)=>margin+i*(this.width-2*margin)/6);
      slots.sort((a,b)=>{
        const spacing=x=>Math.min(...this.threats.filter(t=>t.y<230).map(t=>Math.abs(t.x-x)),this.width);
        return spacing(b)-spacing(a);
      });
      const best=slots.filter(x=>Math.abs(x-slots[0])<1 || this.threats.every(t=>t.y>=230 || Math.abs(t.x-x)>85));
      const startX=best[Math.floor(this.random()*best.length)];
      const baseDuration={gentle:25,steady:18,brave:13}[this.pace];
      const duration=baseDuration*(1-.38*this.pressure())*(.95+.1*this.random());
      const t={id:++this.nextId,item,appearedAt:this.clock,destination,startX,progress:0,duration,color:PALETTE[this.nextId%5],x:startX,y:145};
      this.spawned++;this.threats.push(t);this.position(t);this.emit('targets');return true;
    }
    position(t){
      t.x=t.startX+(t.destination.x-t.startX)*t.progress;
      const startY=145;
      t.y=startY+(t.destination.y-startY)*t.progress;
    }
    burst(x,y,color,count){
      for(let i=0;i<count;i++){const a=this.random()*Math.PI*2,s=25+this.random()*90,life=.4+this.random()*.7;this.effects.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color,life,max:life});}
    }
    update(dt){
      dt=clamp(dt,0,.05);
      if(this.state==='paused')return;
      this.clock+=dt;
      for(const p of this.effects){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=30*dt;p.life-=dt;}
      this.effects=this.effects.filter(p=>p.life>0);
      for(const b of this.lasers)b.life-=dt;
      this.lasers=this.lasers.filter(b=>b.life>0);
      if(this.state!=='playing')return;
      this.elapsed+=dt;
      if(this.spawned<SC.cityGoal){
        this.spawnIn-=dt;
        if(this.spawnIn<=0){this.spawn();if(this.spawned<SC.cityGoal)this.spawnIn+=SC.citySpawnInterval(this.pace,this.spawned,this.random);}
      }
      for(const t of [...this.threats]){
        t.progress+=dt/t.duration;
        this.position(t);
        if(t.progress>=1){
          this.threats=this.threats.filter(v=>v!==t);this.resolved++;
          if(t.destination.alive){
            t.destination.alive=false;this.streak=0;
            this.burst(t.x,t.y,'#ffb89e',20);this.emit('impact',{destination:t.destination});
          }else this.burst(t.x,t.y,'#7e849e',5);
        }
      }
      this.checkWaveComplete();
      if(this.state==='playing')this.work(dt);
    }
  }
  class SceneRenderer{
    constructor(canvas,game){
      this.canvas=canvas;this.game=game;this.ctx=canvas.getContext('2d');
      this.scoreNotices=[];this.scoreAnchors=new WeakMap();this.liveScoreBoxes=[];
      const draw=this.draw.bind(this);this.draw=()=>{this.liveScoreBoxes=[];draw();this.drawScores();};
      this.reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this.stars=Array.from({length:95},(_,i)=>({x:((i*137.5)%997)/997,y:((i*73.7)%613)/613,r:i%7===0?1.6:.8,phase:i*.7}));
      this.resize=()=>{
        const {width,height}=canvas.getBoundingClientRect(),dpr=Math.min(root.devicePixelRatio||1,2);
        if(width<=0||height<=0)return;
        this.dpr=dpr;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
        game.resize(width,height);this.draw();
      };
      this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);
      this.last=0;
      const frame=now=>{
        let dt=this.last?Math.min(.25,(now-this.last)/1000):0;this.last=now;
        while(dt>0){const step=Math.min(.05,dt);this.advanceScores(step);game.update(step);dt-=step;}
        this.draw();this.raf=requestAnimationFrame(frame);
      };
      this.raf=requestAnimationFrame(frame);
    }
    stableLabel(target,anchor,bw,bh,{top=116,bottom=this.game.height-8,left=8,right=this.game.width-8}={}){
      if(!SC.isChinese(this.game.mode))return null;
      const old=this.labelPositions?.get(target),g=this.game;
      if(!old||old.width!==g.width||old.height!==g.height||old.item!==target.item)return null;
      return {x:clamp(old.box.x+(old.box.w-bw)/2+(anchor.x-old.anchor.x),left,right-bw),y:clamp(old.box.y+(old.box.h-bh)/2+(anchor.y-old.anchor.y),top,bottom-bh),w:bw,h:bh};
    }
    keepLabel(target,anchor,box){
      this.labelPositions??=new WeakMap();this.labelPositions.set(target,{anchor:{...anchor},box:{...box},width:this.game.width,height:this.game.height,item:target.item});
    }
    rememberScoreAnchor(target,box,color='#e3e8cb',outline='#243d38'){
      this.scoreAnchors??=new WeakMap();this.liveScoreBoxes??=[];
      const g=this.game,anchor={x:(box.x+box.w/2)/g.width,y:(box.y+box.h/2)/g.height,color,outline};
      this.scoreAnchors.set(target,anchor);this.liveScoreBoxes.push(box);
    }
    scoreEvent(e){
      if(e.type==='start'){this.scoreNotices=[];this.scoreAnchors=new WeakMap();return;}
      if(!['hit','scare'].includes(e.type)||!Number.isFinite(e.points)||e.points<=0)return;
      const anchor=this.scoreAnchors?.get(e.target);if(!anchor)return;
      this.scoreNotices.push({...anchor,points:e.points,age:0,scare:e.type==='scare'});
    }
    advanceScores(dt){
      if(this.game.state==='paused')return;
      for(const n of this.scoreNotices)n.age+=dt;
      this.scoreNotices=this.scoreNotices.filter(n=>n.age<1.35);
    }
    drawScores(){
      const c=this.ctx,g=this.game,occupied=[...this.liveScoreBoxes];
      for(const n of this.scoreNotices){
        const text=n.points+' poäng',size=g.width<600?13:15;
        c.save();c.font='500 '+size+'px system-ui';c.textAlign='center';c.textBaseline='middle';
        const bw=c.measureText(text).width+12,bh=22,x=clamp(n.x*g.width,bw/2+8,g.width-bw/2-8),y=n.y*g.height+(n.scare?28:0);
        // Prefer the old bubble position, moving only to keep live tasks readable.
        const candidates=[0,26,-26,52,-52,78,-78].map(d=>({x:x-bw/2,y:clamp(y+d-bh/2,120,g.height-bh-8),w:bw,h:bh}));
        const box=candidates.find(b=>occupied.every(o=>b.x+b.w+3<o.x||o.x+o.w+3<b.x||b.y+b.h+3<o.y||o.y+o.h+3<b.y));
        if(box){occupied.push(box);c.globalAlpha=.88*clamp((1.35-n.age)/.85,0,1);c.lineWidth=3;c.lineJoin='round';c.strokeStyle=n.outline;c.strokeText(text,box.x+bw/2,box.y+bh/2);c.fillStyle=n.color;c.fillText(text,box.x+bw/2,box.y+bh/2);}
        c.restore();
      }
    }
    round(x,y,w,h,r,fill,stroke){
      const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}
    }
    circle(x,y,r,fill){const c=this.ctx;c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
    destroy(){cancelAnimationFrame(this.raf);this.observer.disconnect();}
  }
  class CityRenderer extends SceneRenderer{
    draw(){
      const c=this.ctx,g=this.game,w=g.width,h=g.height;
      c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.clearRect(0,0,w,h);
      const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#111831');sky.addColorStop(.62,'#242b50');sky.addColorStop(1,'#344468');
      c.fillStyle=sky;c.fillRect(0,0,w,h);
      const glow=c.createRadialGradient(w*.5,h*.75,0,w*.5,h*.75,w*.7);glow.addColorStop(0,'#46537730');glow.addColorStop(1,'#22204400');c.fillStyle=glow;c.fillRect(0,0,w,h);
      for(const s of this.stars){
        c.globalAlpha=this.reduced?.65:.4+.35*Math.sin(g.clock*.6+s.phase)**2;c.fillStyle='#d0dfff';
        c.beginPath();c.arc(s.x*w,s.y*h*.82,s.r,0,Math.PI*2);c.fill();
        if(s.r>1){c.fillRect(s.x*w-3,s.y*h*.82-.35,6,.7);c.fillRect(s.x*w-.35,s.y*h*.82-3,.7,6);}
      }
      c.globalAlpha=1;
      // Distant buildings form a calm backdrop to the eight defended buildings.
      for(let i=0;i<29;i++){
        const bw=w/25,bh=25+((i*47)%62),x=i*w/27-10;
        c.fillStyle=i%2?'#263858':'#2a3c5e';c.fillRect(x,g.ground-bh,bw,bh);
      }
      c.fillStyle='#172a42';c.beginPath();c.moveTo(0,g.ground-6);
      for(let i=0;i<=24;i++)c.lineTo(i*w/24,g.ground-5-7*Math.sin(i*.75)**2);
      c.lineTo(w,h);c.lineTo(0,h);c.fill();
      c.fillStyle='#213a4e';c.fillRect(0,g.ground,w,5);
      for(const b of g.buildings)this.building(b);
      for(const t of g.turrets)this.turret(t);
      const labels=[],hints=SC.pinyinHints(g);
      for(const t of g.getTargets()){
        const size=SC.isChinese(g.mode)?26:g.width<600?20:23;
        c.font='700 '+size+'px "Trebuchet MS", system-ui, sans-serif';
        const hint=hints.has(t),bw=SC.labelWidth(c,t.item,{hint:hint?t.item.hint:'',translation:hint?t.item.translation:'',hintFont:'13px system-ui',max:w-16}),bh=SC.labelHeight(t.item,hint?78:40);
        let box;
        const candidates=[];
        for(const dy of [0,-50,50,-100,100])for(const dx of [0,-bw-8,bw+8,-2*bw,2*bw])candidates.push({x:clamp(t.x+dx-bw/2,8,w-bw-8),y:clamp(t.y+dy-20,122,g.ground-bh-7),w:bw,h:bh});
        const anchor={x:t.x,y:t.y},stable=this.stableLabel(t,anchor,bw,bh,{top:122,bottom:g.ground-7});if(stable)candidates.unshift(stable);
        box=candidates.find(b=>labels.every(o=>b.x+b.w+5<o.x||o.x+o.w+5<b.x||b.y+b.h+5<o.y||o.y+o.h+5<b.y))||candidates[0];
        this.keepLabel(t,anchor,box);t.labelBox=box;this.rememberScoreAnchor(t,box,'#c4dedb','#202c48');labels.push(box);this.comet(t,hint);
      }
      if(g.state==='playing')for(const gun of g.turrets)if(gun.alive&&gun.job?.target)this.crosshair({gun,target:gun.job.target});
      for(const beam of g.lasers){
        c.save();c.globalAlpha=beam.life/beam.max;c.strokeStyle=beam.hit?'#b3ffe5':'#ffb6d3';c.shadowColor=c.strokeStyle;c.shadowBlur=14;c.lineWidth=beam.hit?4:2;
        c.beginPath();c.moveTo(beam.x1,beam.y1);c.lineTo(beam.x2,beam.y2);c.stroke();c.lineWidth=1;c.strokeStyle='#fff';c.stroke();c.restore();
      }
      if(!this.reduced)for(const p of g.effects){c.globalAlpha=p.life/p.max;c.fillStyle=p.color;c.fillRect(p.x-2,p.y-2,4,4);}
      c.globalAlpha=1;
      if(g.state==='menu'){
        c.fillStyle='#8bf2c430';c.beginPath();c.ellipse(w*.5,g.ground+10,w*.34,10,0,0,Math.PI*2);c.fill();
      }
    }
    building(b){
      const c=this.ctx,g=this.game,bw=Math.min(49,g.width*.052),x=b.x-bw/2;
      if(!b.alive){
        c.fillStyle='#45506a';for(let j=0;j<4;j++)c.fillRect(x+j*bw/4,g.ground-5-(j%2)*5,bw/4-2,8+(j%2)*5);
        return;
      }
      this.round(x,b.y,bw,b.height,3,'#394765','#8396af');
      c.fillStyle=b.color;c.fillRect(x-2,b.y-4,bw+4,6);
      if(Number(b.id.slice(1))%3===0){c.beginPath();c.moveTo(x-3,b.y-4);c.lineTo(b.x,b.y-19);c.lineTo(x+bw+3,b.y-4);c.fill();}
      for(let row=0;row<Math.floor((b.height-10)/15);row++)for(let col=0;col<2;col++){
        c.fillStyle=(row+col+Number(b.id.slice(1)))%4===0?'#667691':b.color;
        c.globalAlpha=.8;this.round(x+7+col*(bw-14)/2,b.y+11+row*15,Math.max(4,(bw-22)/2),7,1,c.fillStyle);
      }
      c.globalAlpha=1;c.fillStyle='#1c3046';c.fillRect(b.x-5,g.ground-12,10,12);
    }
    turret(t){
      const c=this.ctx,g=this.game;
      if(!t.alive){this.round(t.x-16,g.ground-9,32,11,4,'#4b5369');c.strokeStyle='#a6818c';c.lineWidth=2;c.beginPath();c.moveTo(t.x-5,g.ground-19);c.lineTo(t.x+5,g.ground-9);c.moveTo(t.x+5,g.ground-19);c.lineTo(t.x-5,g.ground-9);c.stroke();return;}
      const active=!!t.job,color=active?(t.job.target?(t.job.stage==='aim'?'#ffdc88':'#85f0c4'):'#ffb6d3'):'#93bfd5';
      c.fillStyle='#497284';c.beginPath();c.moveTo(t.x-25,g.ground+1);c.lineTo(t.x-16,g.ground-19);c.lineTo(t.x+16,g.ground-19);c.lineTo(t.x+25,g.ground+1);c.fill();
      c.save();c.translate(t.x,t.y);c.rotate(t.angle);
      this.round(-4,-6,33,12,4,'#273e54',color);this.round(22,-7,8,14,2,color);c.restore();
      c.fillStyle=color;c.beginPath();c.arc(t.x,t.y,10,0,Math.PI*2);c.fill();c.fillStyle='#27435a';c.beginPath();c.arc(t.x,t.y,5,0,Math.PI*2);c.fill();
      c.font='700 10px system-ui';c.textAlign='center';c.fillStyle='#adcedb';if(t.job)c.fillText(t.job.entry.text,t.x,g.ground+22,Math.min(150,g.width*.24));
    }
    comet(t,hint=false){
      const c=this.ctx,g=this.game;
      const angle=Math.atan2(t.destination.y-145,t.destination.x-t.startX);
      c.save();c.translate(t.x,t.y);
      const trail=c.createLinearGradient(0,0,-Math.cos(angle)*55,-Math.sin(angle)*55);trail.addColorStop(0,t.color+'99');trail.addColorStop(1,t.color+'00');
      c.strokeStyle=trail;c.lineCap='round';c.lineWidth=5;c.beginPath();c.moveTo(0,0);c.lineTo(-Math.cos(angle)*55,-Math.sin(angle)*55);c.stroke();c.lineCap='butt';
      const size=SC.isChinese(g.mode)?26:g.width<600?20:23;c.font='700 '+size+'px "Trebuchet MS", system-ui, sans-serif';
      const label=t.item.label,bw=t.labelBox.w,bh=t.labelBox.h;
      const labelX=t.labelBox.x+bw/2-t.x,labelY=t.labelBox.y+20-t.y;
      c.lineWidth=1.5;
      if(Math.hypot(labelX,labelY)>8){
        c.strokeStyle=t.color;c.beginPath();c.moveTo(0,0);c.lineTo(labelX,labelY);c.stroke();
        c.fillStyle=t.color;c.beginPath();c.arc(0,0,4,0,Math.PI*2);c.fill();
      }
      c.translate(labelX,labelY);
      c.shadowColor=t.color+'33';c.shadowBlur=14;
      this.round(-bw/2,-20,bw,bh,12,'#192841',t.color);c.shadowBlur=0;
      c.fillStyle='#f8f9ff';SC.drawLabelText(c,t.item,{x:-bw/2,y:-20,w:bw,h:bh},{hint,hintFont:'13px system-ui',hintColor:t.color});
      c.restore();
    }
    crosshair({target,gun}){
      const c=this.ctx,ready=gun.job?.stage!=='aim';
      c.save();c.strokeStyle=ready?'#85f0c4':'#ffdc88';c.lineWidth=1.5;c.setLineDash([3,7]);c.globalAlpha=.3;c.beginPath();c.moveTo(gun.x,gun.y);c.lineTo(gun.x+Math.cos(gun.angle)*Math.hypot(target.x-gun.x,target.y-gun.y),gun.y+Math.sin(gun.angle)*Math.hypot(target.x-gun.x,target.y-gun.y));c.stroke();
      c.globalAlpha=1;c.setLineDash([]);const box=target.labelBox||{x:target.x-22,y:target.y-20,w:44,h:40};
      const x=box.x+box.w/2,y=box.y+box.h/2,rx=box.w/2+6,ry=box.h/2+6;
      for(const [sx,sy] of [[-1,-1],[-1,1],[1,-1],[1,1]]){c.beginPath();c.moveTo(x+sx*rx,y+sy*(ry-7));c.lineTo(x+sx*rx,y+sy*ry);c.lineTo(x+sx*(rx-7),y+sy*ry);c.stroke();}
      c.restore();
    }
  }
  SC.CityRenderer=CityRenderer;
  SC.SceneRenderer=SceneRenderer;
  SC.CityGame=CityGame;
})(globalThis);
