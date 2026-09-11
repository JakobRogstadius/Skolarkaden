/* Food-truck simulation: one cook consumes the shared FIFO, no input DOM access. */
(function(root){
  'use strict';
  const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const WAITING=new Set(['waiting','cooking']);
  // Geometry depends on the viewport, never on how many customers are waiting.
  SC.foodLayout=function(width){
    const cols=width<600?3:5,scale=Math.min(1.13,width/430),truckWidth=Math.min(570,width*.84),truckY=150;
    return {cols,scale,truckWidth,truckY,cell:width/cols,firstFeet:truckY+truckWidth/570*180+140*scale+112,pitch:Math.ceil(140*scale+112)};
  };
  SC.foodSceneHeight=function(width,lastSlot){const l=SC.foodLayout(width);return Math.max(540,Math.ceil(l.firstFeet+Math.floor(Math.max(0,lastSlot)/l.cols)*l.pitch+38));};
  class FoodTruckGame{
    constructor({onEvent=()=>{},random=Math.random,queue=new SC.AnswerQueue()}={}){
      this.onEvent=onEvent;this.random=random;this.queue=queue;this.width=1000;this.height=600;this.menu();
    }
    emit(type,detail={}){this.onEvent({type,...detail});}
    resize(width,height){this.width=width;this.height=height;}
    menu(){this.state='menu';this.clock=0;this.customers=[];this.effects=[];this.waste=[];this.activeCook=null;this.lock=null;this.previewValue='';this.score=0;this.hits=0;}
    start({mode='swedish',pace='gentle',lang='sv-SE',items=null,uppercase=Math.random()<.5}={}){
      this.menu();Object.assign(this,{mode,pace,lang,uppercase});
      this.items=SC.beginPractice(this,items);
      if(!this.items.length)throw new Error('Menyn behöver minst ett svar.');
      this.state='playing';this.lives=5;this.elapsed=0;this.total=40;this.spawned=0;this.shots=0;this.streak=0;this.bestStreak=0;this.tips=0;this.lostCustomers=0;this.nextId=0;this.spawnIn=SC.citySpawnInterval(pace,1,this.random);
      this.spawn();this.emit('start');
    }
    getAvailableTargets(){return this.getTargets().filter(c=>c.status==='waiting');}
    getActiveEntries(){return this.activeCook?[this.activeCook.entry]:[];}
    getTargets(){return this.customers.filter(c=>WAITING.has(c.status));}
    get resolved(){return this.hits+this.lostCustomers;}
    getTaskStates(){
      const states=new Map(),targets=this.getTargets();
      if(this.activeCook?.customer&&targets.includes(this.activeCook.customer))states.set(this.activeCook.customer,'active');
      for(const entry of this.queue.items){const target=targets.find(c=>!states.has(c)&&SC.matches(entry.text,c.item,this.mode,this.lang,entry.source));if(target)states.set(target,'queued');}
      return states;
    }
    appearance(){return SC.makePerson(this.random);}
    spawn(){
      if(this.state!=='playing'||this.spawned>=this.total)return false;
      const slots=Array.from({length:this.total},(_,i)=>i).filter(slot=>!this.customers.some(c=>c.slot===slot));
      const items=SC.practiceItems(this),unused=items.filter(item=>!this.customers.some(c=>c.item.answer===item.answer)),pool=unused.length?unused:items;
      const base=pool[Math.floor(this.random()*pool.length)],item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};
      item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);
      const patience={gentle:27,steady:21,brave:16}[this.pace]*(.88+this.random()*.24);
      const c={id:++this.nextId,slot:slots[0],item,status:'arriving',motion:0,wait:0,patience,cooked:0,cookTime:1.2+this.random()*.8,look:this.appearance(),dish:({soppa:1,gryta:1,sallad:2,ris:2,nudlar:2,pasta:2,falafel:2,sushi:2,våffla:3,pannkaka:3,toast:3,omelett:3,pizza:4,paj:4,taco:5,korv:6})[base.answer]??Math.floor(this.random()*3),warned:false};
      this.customers.push(c);this.spawned++;return true;
    }
    patienceLeft(c){return clamp(1-c.wait/c.patience,0,1);}
    expression(c){return c.status==='leaving'?(c.happy?0:1):clamp(c.wait/c.patience,0,1);}
    kitchenStatus(){const j=this.activeCook;return {text:['celebrating','won'].includes(this.state)?'Vilken god kväll! Kocken tackar för idag.':j?'Lagar '+j.entry.text:'Kocken väntar på nästa svar',progress:j?j.age/j.duration:0};}
    workerStatus(){return this.kitchenStatus().text;}
    work(dt){
      if(!this.activeCook&&this.queue.length){
        const entry=this.queue.take();if(!entry)return;
        const customer=this.getTargets().find(c=>c.status==='waiting'&&SC.matches(entry.text,c.item,this.mode,this.lang,entry.source));
        if(customer)customer.status='cooking';
        this.activeCook={entry,customer,age:0,duration:1.3+this.random()*.7,dish:customer?.dish??Math.floor(this.random()*7)};this.shots++;this.emit('cook',{entry});
      }
      const j=this.activeCook;if(!j)return;j.age+=dt;if(j.age<j.duration)return;
      this.activeCook=null;
      const c=j.customer;
      if(c&&c.status==='cooking'&&this.customers.includes(c)){
        const tip=Math.round(this.patienceLeft(c)*10),points=10+tip+Math.min(this.streak,5);this.score+=points;this.tips+=tip;this.hits++;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);
        if(c.look.exotic){this.score+=40;this.emit('rare-earned',{look:c.look,bonus:40});}
        c.status='leaving';c.happy=true;c.motion=0;this.effects.push({slot:c.slot,dish:j.dish,age:0,tip});this.emit('hit',{target:c,points:points+(c.look.exotic?40:0),entry:j.entry});
      }else{
        this.streak=0;
        this.waste.push({text:j.entry.text,dish:j.dish,x:.08+this.random()*.84,y:.934+this.random()*.048,angle:Math.PI+(this.random()-.5)*.5,age:0});
        this.emit('waste',{entry:j.entry});
      }
      this.emit('targets');
    }
    loseCustomer(c){
      c.status='leaving';c.happy=false;c.motion=0;this.lives=Math.max(0,this.lives-1);this.lostCustomers++;this.streak=0;
      if(this.lock===c)this.lock=null;
      this.emit('customer-left',{customer:c});this.emit('targets');

    }
    pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
    resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
    finish(){
      if(this.state!=='playing')return;
      const won=this.lives>0;this.lock=null;this.activeCook=null;
      if(won){this.state='celebrating';this.celebrationLeft=4;this.emit('celebrate');}
      else{this.state='lost';this.endResult(false);}
    }
    endResult(won){this.emit('end',{won,score:this.score,hits:this.hits,shots:this.shots,bestStreak:this.bestStreak,lives:this.lives,tips:this.tips,lostCustomers:this.lostCustomers});}
    update(dt){
      dt=clamp(dt,0,.05);if(this.state==='paused')return;
      if(this.state==='celebrating'){this.clock+=dt;this.celebrationLeft=Math.max(0,this.celebrationLeft-dt);if(this.celebrationLeft<1e-8){this.celebrationLeft=0;this.state='won';this.endResult(true);}return;}
      if(this.state==='menu'){this.clock+=dt;return;}
      if(this.state!=='playing')return;
      this.clock+=dt;this.elapsed+=dt;
      for(const e of this.effects)e.age+=dt;this.effects=this.effects.filter(e=>e.age<1.3);
      for(const c of [...this.customers]){
        if(c.status==='arriving'){
          c.motion+=dt;if(c.motion>=.8){c.status='waiting';c.appearedAt=this.clock;this.emit('arrival',{customer:c});if(c.look.exotic)this.emit('rare-arrival',{look:c.look});this.emit('targets');}
        }else if(c.status==='leaving'){
          c.motion+=dt;if(c.motion>=1.2)this.customers=this.customers.filter(x=>x!==c);
        }else{
          c.wait+=dt;
          if(c.wait>=c.patience){this.loseCustomer(c);if(this.state!=='playing')return;continue;}
          if(!c.warned&&this.patienceLeft(c)<.25){c.warned=true;this.emit('impatient',{customer:c});}

        }
      }
      if(this.spawned<this.total){
        this.spawnIn-=dt;
        if(this.spawnIn<=0){this.spawn();if(this.spawned<this.total)this.spawnIn+=SC.citySpawnInterval(this.pace,this.spawned,this.random);}
      }
      if(this.spawned===this.total&&!this.customers.length&&!this.activeCook){this.finish();return;}
      this.work(dt);
      for(const dish of this.waste)dish.age+=dt;
      if(this.spawned===this.total&&!this.customers.length&&!this.activeCook)this.finish();
    }
  }

  class FoodTruckRenderer extends SC.SceneRenderer{
    draw(){
      const c=this.ctx,g=this.game,w=g.width,h=g.height;
      c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.clearRect(0,0,w,h);c.globalAlpha=1;c.lineWidth=1;
      const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#182c3e');bg.addColorStop(.7,'#365a60');bg.addColorStop(1,'#213c42');c.fillStyle=bg;c.fillRect(0,0,w,h);
      // A small evening market; all scenery and characters are geometric canvas shapes.
      c.strokeStyle='#ffffff30';c.beginPath();c.moveTo(0,105);c.quadraticCurveTo(w*.5,151,w,105);c.stroke();
      for(let i=0;i<11;i++){const x=(i+.5)/11*w,y=105+22*Math.sin(x/w*Math.PI);this.circle(x,y,4,i%2?'#ffe0a4':'#a2e6d1');}
      c.fillStyle='#1d383a';c.fillRect(0,h*.90,w,h*.1);
      for(let i=0;i<7;i++){c.fillStyle='#abc7b510';c.fillRect(i*w/6,h*.9,2,h*.1);}
      this.truck(w,h,g.state==='menu');
      if(g.state==='menu'){
        const preview=[{slot:0,look:{skin:'#c79479',shirt:'#f2a5a3',pants:'#284961',hair:'#463333',height:1,width:1,headRound:true,glasses:false,hat:false,phase:0},status:'waiting',wait:0,patience:1},{slot:2,look:{skin:'#efc49e',shirt:'#f7c86c',pants:'#403752',hair:'#be884e',height:.9,width:1,headRound:false,glasses:true,hat:true,phase:1},status:'waiting',wait:0,patience:1}];
        for(const p of preview)this.person(p,w,h);return;
      }
      const hints=SC.pinyinHints(g);for(const p of g.customers)this.person(p,w,h,hints.has(p));
      const counter=this.cookingPosition(w,h);
      for(const p of g.waste){
        const t=clamp(p.age/.5,0,1),x=counter.x+(p.x*w-counter.x)*t,y=counter.y+(p.y*h-counter.y)*t-Math.sin(t*Math.PI)*50;
        c.save();c.translate(x,y);c.rotate(p.angle*t);this.dish(0,0,p.dish,.65);c.restore();
      }
      for(const e of g.effects){
        const t=clamp(e.age/.35,0,1),x=counter.x+(this.customerPosition(e.slot,w,h).x-counter.x)*t,y=counter.y+(this.customerPosition(e.slot,w,h).feet-25-counter.y)*t-Math.sin(t*Math.PI)*35;
        if(e.age<.35)this.dish(x,y,e.dish,.7);
      }
      if(g.state==='celebrating'){const bw=Math.min(300,w-24);this.round((w-bw)/2,h-55,bw,39,12,'#3e6654','#9fe8b9');c.font='bold 19px system-ui';c.fillStyle='#fff3d9';c.textAlign='center';c.fillText('Tack för idag!',w/2,h-29);}
    }
    circle(x,y,r,fill){const c=this.ctx;c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
    truck(w,h,menu){
      const c=this.ctx,g=this.game,tw=Math.min(570,w*.84),th=tw*193/570,x=(w-tw)/2,y=menu?h-th-35:SC.foodLayout(w).truckY,scale=tw/570;
      c.save();c.translate(x,y);c.scale(scale,th/193);
      this.round(0,8,570,164,20,'#ecb16e');this.round(10,19,400,137,12,'#d87957');
      this.round(426,21,129,86,13,'#345467');this.round(440,30,89,56,9,'#789ba6');
      c.strokeStyle='#d6e5dd';c.lineWidth=5;c.beginPath();c.moveTo(485,35);c.lineTo(473,82);c.stroke();
      this.round(418,114,115,31,8,'#f5c986');this.circle(448,128,4,'#936656');
      for(const wx of [100,462]){this.circle(wx,172,26,'#182a37');this.circle(wx,172,12,'#91a5a6');this.circle(wx,172,5,'#394e5c');}
      this.round(31,28,347,90,7,'#223b45');
      c.fillStyle='#152b34';c.fillRect(37,94,335,24);
      // Stir during cooking; raise a hand and wave during the victory pause.
      const celebrating=g.state==='celebrating',cooking=!!g.activeCook,stir=cooking&&!this.reduced?Math.sin(g.clock*11):0;
      this.round(150,76,58,42,12,'#eef0dd');this.circle(178,62,21,'#e4b68e');
      this.circle(169,60,2.5,'#283641');this.circle(187,60,2.5,'#283641');
      c.strokeStyle='#794a3e';c.lineWidth=2;c.beginPath();c.moveTo(171,71);c.quadraticCurveTo(178,77,185,71);c.stroke();
      this.round(154,28,48,24,5,'#fff6e3');for(const xx of [155,176,198])this.circle(xx,29,15,'#fff6e3');
      c.strokeStyle='#eef0dd';c.lineWidth=12;c.lineCap='round';c.beginPath();c.moveTo(200,88);
      if(celebrating){
        const wave=this.reduced?0:Math.sin((4-g.celebrationLeft)*8),handX=241+wave*13,handY=49+wave*3;c.lineTo(224,79);c.lineTo(handX,handY);c.stroke();this.circle(handX,handY,7,'#e4b68e');
        c.strokeStyle='#e4b68e';c.lineWidth=3;for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(handX+i*4,handY-3);c.lineTo(handX+i*6,handY-12);c.stroke();}
      }else{c.lineTo(235+stir*9,99+stir*3);c.stroke();c.strokeStyle='#d6ac78';c.lineWidth=4;c.beginPath();c.moveTo(236+stir*9,87+stir*4);c.lineTo(251+stir*6,116);c.stroke();}
      this.round(222,102,68,20,8,'#354956');c.fillStyle=cooking?'#fbc367':'#6a8690';c.fillRect(227,121,60,5);
      if(cooking){for(let i=0;i<3;i++){const drift=this.reduced?i*7:((g.clock*18+i*10)%30);c.globalAlpha=(1-drift/36)*.7;this.circle(239+i*17+Math.sin(g.clock+i)*2,97-drift,4,'#fff6df');}c.globalAlpha=1;}
      this.round(17,150,384,7,3,'#ffe7bb');
      for(let i=0;i<7;i++){c.fillStyle=i%2?'#ffe6b7':'#db7159';c.fillRect(22+i*53,0,53,22);}
      this.round(155,158,148,14,4,'#7e443e');c.textAlign='center';c.fillStyle='#fff0d1';c.font='bold 13px system-ui';c.fillText('STJÄRNKÖKET',229,170);
      const plates=this.plateLayout();
      this.dish(plates.activeX,plates.y,g.activeCook?.dish??null,plates.scale);
      c.textAlign='center';c.font='bold 11px system-ui';c.fillStyle='#fff3dc';
      if(g.activeCook)c.fillText(g.activeCook.entry.text,plates.activeX,plates.y-19,66);
      g.queue.items.slice(0,plates.visible).forEach((entry,i)=>this.emptyPlate(plates.activeX+(i+1)*plates.step,plates.y,entry.text,plates.scale));
      if(g.queue.length>plates.visible){c.font='bold 11px system-ui';c.fillStyle='#fff0d1';c.textAlign='left';c.fillText('+'+(g.queue.length-plates.visible),378,143);}
      c.restore();
    }
    cookingPosition(w,h){const tw=Math.min(570,w*.84),scale=tw/570,plates=this.plateLayout();return {x:(w-tw)/2+plates.activeX*scale,y:SC.foodLayout(w).truckY+plates.y*scale};}
    plateLayout(){return {activeX:55,y:145,step:70,scale:.8,visible:4};}
    emptyPlate(x,y,text,scale=.8){
      this.dish(x,y,null,scale);const c=this.ctx;c.textAlign='center';c.font='bold 11px system-ui';c.fillStyle='#fff3dc';c.fillText(text,x,y-19,66);
    }
    dish(x,y,kind,scale=1){
      const c=this.ctx;c.save();c.translate(x,y);c.scale(scale,scale);
      c.fillStyle='#fff3d5';c.beginPath();c.ellipse(0,5,24,7,0,0,Math.PI*2);c.fill();
      if(kind==null){c.restore();return;}
      if(kind===0){this.round(-18,-6,36,12,4,'#dd8952');this.round(-17,-10,34,5,2,'#8ed29b');c.fillStyle='#f3c779';c.beginPath();c.ellipse(0,-11,18,9,0,Math.PI,0);c.fill();}
      else if(kind===1){c.fillStyle='#e99969';c.beginPath();c.arc(0,-8,20,0,Math.PI);c.fill();this.circle(-8,-5,3,'#f0d48a');this.circle(6,-7,3,'#90c792');}
      else if(kind===3){this.round(-18,-14,36,19,6,'#ebbf7e');c.strokeStyle='#bc864c';c.lineWidth=1.5;for(let i=-10;i<=10;i+=10){c.beginPath();c.moveTo(i,-12);c.lineTo(i,3);c.moveTo(-16,i*.5-5);c.lineTo(16,i*.5-5);c.stroke();}this.circle(2,-9,4,'#fff1c5');}
      else if(kind===4){c.fillStyle='#f2c77d';c.beginPath();c.moveTo(-20,-12);c.lineTo(20,-12);c.lineTo(0,8);c.closePath();c.fill();this.circle(-7,-6,3,'#d56b53');this.circle(7,-6,3,'#d56b53');}
      else if(kind===5){c.fillStyle='#eec476';c.beginPath();c.arc(0,3,20,Math.PI,0);c.fill();this.round(-16,-3,32,5,2,'#92bb69');this.circle(-6,-4,3,'#d87855');}
      else if(kind===6){this.round(-22,-12,44,16,8,'#f3ce92');this.round(-19,-9,38,10,5,'#b8654a');c.strokeStyle='#eed377';c.lineWidth=2;c.beginPath();c.moveTo(-12,-5);c.lineTo(-5,-7);c.lineTo(2,-3);c.lineTo(9,-7);c.lineTo(14,-5);c.stroke();}
      else{this.round(-18,-9,36,15,4,'#c8dbd2');for(let i=0;i<3;i++)this.circle(-10+i*10,-10,6,['#b2d68f','#edb267','#db7767'][i]);}
      c.restore();
    }
    customerPosition(slot,w,h){
      const l=SC.foodLayout(w),row=Math.floor(slot/l.cols),order=l.cols===3?[1,0,2]:[2,1,3,0,4],col=order[slot%l.cols];
      // Small, repeatable offsets make a waiting crowd without moving existing people.
      const dx=(((slot*37+11)%17)/16-.5)*l.cell*.08,dy=[-8,14,-16,6,0][slot%5];
      return {x:(col+.5)*l.cell+dx,feet:l.firstFeet+row*l.pitch+dy,cell:l.cell,scale:l.scale};
    }
    person(p,w,h,hint=false){
      const c=this.ctx,g=this.game,a=p.look,pos=this.customerPosition(p.slot,w,h),slotX=pos.x;
      const entering=p.status==='arriving',leaving=p.status==='leaving',phase=entering?clamp(p.motion/.8,0,1):leaving?clamp(p.motion/1.2,0,1):1;
      const edge=p.slot%2?w+60:-60,x=entering?edge+(slotX-edge)*phase:leaving?slotX+(edge-slotX)*phase:slotX;
      const feet=pos.feet,scale=pos.scale,visualScale=scale*SC.personScale(a),bodyHeight=54*a.height,headY=-bodyHeight-26;
      const walk=(entering||leaving)&&!this.reduced?Math.sin(g.clock*13+a.phase)*5:0,anger=g.expression(p);
      SC.drawPerson(this,{x,feet,scale,look:a,walk,anger,carry:leaving&&p.happy?(xx,yy)=>this.dish(xx,yy,p.dish,.7):null});
      if(entering||g.state==='menu')return;
      if(leaving)return;
      const font=(SC.isChinese(g.mode)||g.mode==='bopomofo')?25:w<500?17:20;
      const bw=SC.labelWidth(c,p.item,{font:'bold '+font+'px system-ui',hint:hint?p.item.hint:'',translation:hint?p.item.translation:'',max:Math.min(176,pos.cell-14),min:32}),bh=SC.labelHeight(p.item,hint?78:44,8),bx=slotX-bw/2,by=feet+(headY-28)*visualScale-76-14-(bh-76)/2,remaining=g.patienceLeft(p);
      this.rememberScoreAnchor(p,{x:bx,y:by,w:bw,h:bh},'#f0d8ad','#304b4e');
      const state=g.getTaskStates().get(p),fill=state==='queued'?'#bdeedc':state==='active'?'#ffe1a2':'#fff1d9';
      c.lineWidth=state?3:1;
      this.round(bx,by,bw,bh,12,fill,state==='queued'?'#167358':state==='active'?'#b77919':p.look.exotic?'#ffc55e':'#cfb596');
      c.fillStyle=fill;c.beginPath();c.moveTo(slotX-7,by+bh-1);c.lineTo(slotX,by+bh+8);c.lineTo(slotX+7,by+bh-1);c.fill();
      if(state){this.round(bx+bw-27,by-9,26,16,5,state==='queued'?'#167358':'#805711');c.font='bold 10px system-ui';c.textAlign='center';c.fillStyle='#ffffff';c.fillText(state==='queued'?'KÖ':'…',bx+bw-14,by+3);}
      c.lineWidth=1;c.font='bold '+font+'px system-ui';
      c.textAlign='center';c.fillStyle='#30434a';SC.drawLabelText(c,p.item,{x:bx,y:by,w:bw,h:bh-8},{hint,hintColor:'#63544f'});
      this.round(bx+10,by+bh-9,bw-20,4,2,'#d9cbb6');this.round(bx+10,by+bh-9,Math.max(.1,(bw-20)*remaining),4,2,remaining<.25?'#d56a51':remaining<.55?'#d6a951':'#62ae90');
    }
  }
  SC.FoodTruckGame=FoodTruckGame;SC.FoodTruckRenderer=FoodTruckRenderer;
})(globalThis);
