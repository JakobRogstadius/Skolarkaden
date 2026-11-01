/* Connected reef sections and a bounded space/time reachability search. */
(function(root){
'use strict';
const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
class BubblefishLayout{
  constructor(game){this.game=game;this.nodes=[];this.reservations=[];this.serial=0;this.sections=[];this.offset=Math.floor(game.random()*6);}
  resize(sx,sy){
    for(const n of this.nodes)n.y*=sy;
    for(const r of this.reservations){r.radius*=sy;for(const p of r.points){p.x*=sx;p.y*=sy;}}
  }
  radius(){return this.game.unit()*18*1.78+9*this.game.unit();}
  world(x){const g=this.game;return g.distance+x/g.pixelsPerMetre();}
  preferred(x){
    const g=this.game,l=g.limits(),r=this.radius()+12*g.unit(),m=this.world(x);
    const low=l.top+r,high=Math.max(low,l.bottom-r),levels=[.30,.68,.42,.74,.26,.57];
    if(!this.nodes.length)this.nodes.push({m:this.world(g.fish.x),y:clamp(g.fish.y,low,high)});
    while(this.nodes.at(-1).m<m+16){
      const last=this.nodes.at(-1),next=last.m+16;
      const t0=g.travelTime(Math.max(0,last.m-this.world(g.fish.x))),t1=g.travelTime(Math.max(0,next-this.world(g.fish.x)));
      const reach=Math.max(1,(t1-t0)*Math.max(210,g.height*.66)*.30);
      const wanted=low+(high-low)*levels[(Math.round(next/16)+this.offset)%levels.length];
      this.nodes.push({m:next,y:clamp(wanted,Math.max(low,last.y-reach),Math.min(high,last.y+reach))});
    }
    while(this.nodes.length>2&&this.nodes[1].m<g.distance-12)this.nodes.shift();
    const index=this.nodes.findIndex(n=>n.m>=m);
    if(index<=0)return this.nodes[0].y;
    const a=this.nodes[index-1],b=this.nodes[index],t=(m-a.m)/(b.m-a.m);
    return a.y+(b.y-a.y)*t;
  }
  prune(){
    const g=this.game,live=new Set([...g.questions,...g.answers,...g.balls,...g.pickups]);
    this.reservations=this.reservations.filter(r=>live.has(r.target)&&!r.target.dead&&r.points.at(-1).time>g.clock);
  }
  wrongAnswers(){const g=this.game;return g.held?g.answers.filter(b=>!g.isCorrect(b.item.label)):[];}
  blocked(x,y,r,poses,bubbles){
    const g=this.game;
    for(const p of poses)if(p.o.kind!=='current'&&g.obstacleAt(p.o,x,y,r,p.x,p.y))return true;
    for(const b of bubbles)if(((x-b.x)/(b.w*.43+r*.75))**2+((y-b.y)/(b.h*.43+r*.75))**2<1)return true;
    return false;
  }
  // At each time layer retain distinct heights and vertical velocities. Each
  // edge integrates acceleration and currents, with collision checks between
  // endpoints. A least-bad blocked route is never returned as a valid route.
  trace(xEnd,{objects=this.game.obstacles,avoid=this.wrongAnswers(),duration=null,desired=null,goals=[]}={}){
    const g=this.game,r=this.radius(),l=g.limits(),low=l.top+r,high=l.bottom-r;
    if(high<low)return [];
    const x=g.fish.x,k=11*g.agility();
    let T=duration??g.travelTime(Math.max(0,(xEnd-x)/g.pixelsPerMetre()));
    if(duration===null)for(let i=0;i<3;i++){
      const drift=g.fish.vx*(1-Math.exp(-k*T))/k;
      T=g.travelTime(Math.max(0,(xEnd-clamp(x+drift,l.left+g.radius(),l.right-g.radius()))/g.pixelsPerMetre()));
    }
    if(!(T>0)||T>35)return [];
    const base=Math.max(210,g.height*.66),spacing=(high-low)/12;
    const layers=clamp(Math.floor(T/Math.max(.20,spacing/(base*.30))),1,28),dt=T/layers;
    const boundLow=l.top+g.radius()-1,boundHigh=l.bottom-g.radius()+1,obstacles=objects.filter(o=>!o.dead);
    const startVy=(g.fish.y<=boundLow+2&&g.fish.vy<0||g.fish.y>=boundHigh-2&&g.fish.vy>0)?0:g.fish.vy;
    let states=[{y:g.fish.y,vy:startVy,parent:null,cost:0,t:0}],coastX=x,coastVx=g.fish.vx;
    const grid=Array.from({length:13},(_,i)=>low+spacing*i);
    for(let layer=1;layer<=layers;layer++){
      const t0=(layer-1)*dt,t1=layer*dt;
      const preferred=this.preferred(x+g.travel(t1)*g.pixelsPerMetre());
      const heights=[...grid,clamp(g.fish.y,low,high),clamp(desired??preferred,low,high),...goals.map(y=>clamp(y,low,high))];
      const frames=[];let D=1,E=0,A=0,B=0,F=0,cap=1;
      const relative=(g.speed()+g.profile.speed/150*t1)*g.pixelsPerMetre()*1.7+base*1.98+400*g.unit();
      const steps=Math.max(1,Math.ceil(dt/Math.min(1/60,r*.38/relative))),h=dt/steps;
      for(let j=1;j<=steps;j++){
        const t=t0+j*h,agility=g.agilityAt(t),speed=base*agility,blend=1-Math.exp(-h*11*agility);
        D*=1-blend;E=E*(1-blend)+speed*blend;A+=D*h;B+=E*h;
        coastVx*=1-blend;coastX=clamp(coastX+coastVx*h,l.left+g.radius(),l.right-g.radius());
        const poses=[];let flow=0;
        for(const o of obstacles){const p=g.projectObstacle(o,t);
          if(o.kind==='current'){if(Math.abs(coastX-p.x)<o.w/2)flow+=o.direction*speed*.34;}
          else if(Math.abs(coastX-p.x)<r*1.3+(o.w||o.r*2)*.7)poses.push({o,...p});
        }
        F+=flow*h;cap=Math.min(cap,.52/agility);
        const scroll=g.travel(t)*g.pixelsPerMetre();
        const bubbles=avoid.filter(b=>Math.abs(coastX-(b.x-scroll))<b.w*.43+r*.75).map(b=>({x:b.x-scroll,y:b.y,w:b.w,h:b.h}));
        frames.push({t,x:coastX,D,E,A,B,F,poses,bubbles});
      }
      const end=frames.at(-1),next=new Map();
      for(const state of states)for(let i=0;i<heights.length;i++){
        const y=heights[i],control=(y-state.y-end.A*state.vy-end.F)/end.B;
        if(Math.abs(control)>cap)continue;
        const vy=end.D*state.vy+end.E*control,cost=state.cost+Math.abs(y-preferred)/(high-low+1)+Math.abs(control)*.04;
        const key=i+':'+(vy>base*.12?1:vy<-base*.12?-1:0),old=next.get(key);
        if(old&&old.cost<=cost)continue;
        let valid=true;
        for(const f of frames){
          const py=state.y+f.A*state.vy+f.B*control+f.F;
          if(py<boundLow||py>boundHigh||((f.poses.length||f.bubbles.length)&&this.blocked(f.x,py,r,f.poses,f.bubbles))){valid=false;break;}
        }
        if(!valid)continue;
        next.set(key,{y,vy,cost,parent:state,frames,control,t:t1});
      }
      states=[...next.values()];if(!states.length)return [];
    }
    const options=new Map();
    for(const state of states){const key=Math.round(state.y*10),old=options.get(key);if(!old||state.cost<old.cost)options.set(key,state);}
    return [...options.values()].sort((a,b)=>Math.abs(a.y-(desired??this.preferred(xEnd)))-Math.abs(b.y-(desired??this.preferred(xEnd)))||a.cost-b.cost)
      .map(end=>({y:end.y,end,x,radius:r,at:g.clock,duration:T}));
  }
  points(route){
    const chain=[];for(let n=route.end;n.parent;n=n.parent)chain.push(n);chain.reverse();
    const first=chain[0]?.parent,points=first?[{time:route.at,x:route.x,y:first.y,vy:first.vy,control:0}]:[];
    for(const n of chain)for(const f of n.frames)points.push({time:route.at+f.t,x:f.x,y:n.parent.y+f.A*n.parent.vy+f.B*n.control+f.F,vy:f.D*n.parent.vy+f.E*n.control,control:n.control});
    return points;
  }
  reserve(target,route){this.reservations.push({target,radius:route.radius,points:this.points(route)});}
  clearItem(item,objects=this.game.obstacles){
    const g=this.game,T=g.travelTime(Math.max(0,(item.x-g.limits().left)/g.pixelsPerMetre()));
    const samples=Math.max(12,Math.ceil(T/.08));
    for(let i=0;i<=samples;i++){
      const t=T*i/samples,bx=item.x-g.travel(t)*g.pixelsPerMetre();
      if(bx>g.width+(item.w||item.r*2)/2)continue;
      for(const o of objects){
        if(o.dead||o.kind==='current')continue;
        const p=g.projectObstacle(o,t),w=(item.w||item.r*2)/2+5*g.unit(),h=(item.h||item.r*2)/2+5*g.unit();
        if(o.kind==='wall'){
          if(Math.abs(bx-p.x)<o.w/2+w&&Math.abs(item.y-o.gapY)>o.gap/2-h)return false;
        }else if(((bx-p.x)/(w+o.r*(o.kind==='predator'?1.3:1)))**2+((item.y-p.y)/(h+o.r))**2<1)return false;
      }
    }
    return true;
  }
  place(item,{preferred=null,avoid=this.wrongAnswers(),reserve=true,accept=()=>true}={}){
    this.prune();const routes=this.trace(item.x,{desired:preferred,avoid});
    for(const route of routes){
      item.y=item.baseY=route.y;
      if(!this.clearItem(item)||!accept(item))continue;
      if(reserve)this.reserve(item,route);
      return route;
    }
    return null;
  }
  allowDistractor(b){
    const g=this.game;this.prune();
    for(const reservation of this.reservations)for(const p of reservation.points){
      if(p.time<g.clock)continue;
      const x=b.x-g.travel(p.time-g.clock)*g.pixelsPerMetre();
      if(this.blocked(p.x,p.y,reservation.radius,[],[{...b,x}]))return false;
    }
    const escape=this.trace(b.x+b.w,{avoid:[...this.wrongAnswers(),b]})[0];
    if(!escape)return false;this.reserve(b,escape);return true;
  }
  questionWave(pairs,first){
    const g=this.game,u=g.unit(),l=g.limits(),placed=[],cache=new Map();
    const sizes=pairs.map(p=>g.bubbleSize(p.problem)),maxWidth=Math.max(...sizes.map(s=>s.w)),maxHeight=Math.max(...sizes.map(s=>s.h));
    const middle=(l.top+l.bottom)/2,spread=Math.min((l.bottom-l.top)/2-Math.max(this.radius(),maxHeight/2),Math.max((l.bottom-l.top)*.3,maxHeight+12*u));
    const preferred=[middle-spread,middle,middle+spread];
    const leadTime=Math.max(...preferred.map(y=>Math.abs(y-g.fish.y)))/(Math.max(210,g.height*.66)*.45)+.18;
    const start=Math.max(first?Math.min(g.width*.82,g.width-maxWidth/2-12*u):g.width+maxWidth/2+18*u,g.fish.x+g.travel(leadTime)*g.pixelsPerMetre()+maxWidth/2);
    // Usually one column; stagger a difficult choice farther ahead if the
    // current speed/position does not leave enough time to reach its height.
    for(let i=0;i<3;i++){
      let chosen=null;
      for(let offset=0;offset<=2&&!chosen;offset++){
        const b=g.bubble(pairs[i],'question',start+offset*(maxWidth+18*u),preferred[i]);
        if(!cache.has(b.x))cache.set(b.x,this.trace(b.x,{goals:preferred}));
        const routes=[...cache.get(b.x)].sort((a,b)=>Math.abs(a.y-preferred[i])-Math.abs(b.y-preferred[i]));
        for(const route of routes){
          b.y=b.baseY=route.y;
          if(placed.some(q=>Math.abs(q.x-b.x)<(q.w+b.w)/2+8*u&&Math.abs(q.y-b.y)<(q.h+b.h)/2+12*u)||!this.clearItem(b))continue;
          if(this.points(route).some(p=>this.blocked(p.x,p.y,route.radius,[],placed.map(q=>({...q,x:q.x-g.travel(p.time-g.clock)*g.pixelsPerMetre()})))))continue;
          chosen=b;this.reserve(b,route);break;
        }
      }
      if(!chosen){this.reservations=this.reservations.filter(r=>!placed.includes(r.target));return [];}
      placed.push(chosen);
    }
    return placed;
  }
  balls(){
    const g=this.game,u=g.unit(),x=g.width+14*u,end=x+24*g.pixelsPerMetre();
    const route=this.trace(end)[0];if(!route)return false;
    const points=this.points(route),balls=[];
    for(let i=0;i<7;i++){
      const wanted=x+i*4*g.pixelsPerMetre();
      const point=points.find(p=>p.x+g.travel(p.time-g.clock)*g.pixelsPerMetre()>=wanted)||points.at(-1);
      const b={x:point.x+g.travel(point.time-g.clock)*g.pixelsPerMetre(),y:point.y,r:5*u};
      if(!this.clearItem(b))return false;balls.push(b);
    }
    g.balls.push(...balls);this.reserve(balls.at(-1),route);g.introduced.add('balls');return true;
  }
  reservationClear(objects){
    const g=this.game;this.prune();
    for(const reservation of this.reservations)for(const p of reservation.points){
      if(p.time<g.clock)continue;
      const poses=objects.map(o=>({o,...g.projectObstacle(o,p.time-g.clock)}));
      if(this.blocked(p.x,p.y,reservation.radius,poses,[]))return false;
      if(poses.some(o=>o.o.kind==='current'&&Math.abs(p.x-o.x)<o.o.w/2+reservation.radius))return false;
    }
    for(const b of [...g.questions,...g.answers,...g.balls,...g.pickups])if(!this.clearItem(b,objects))return false;
    return true;
  }
  pattern(kind,variant){
    const g=this.game,u=g.unit(),l=g.limits(),range=l.bottom-l.top,ppm=g.pixelsPerMetre();
    const x=g.width+80*u,span=10*ppm,gap=Math.max(this.radius()*2+30*u,range*(.46-g.progress()*.12))+variant*16*u;
    const objects=[],id=this.serial,add=(kind,x,y,r,extra={})=>{const o={kind,x,y,baseY:y,r,phase:id*.91,age:0,...extra};objects.push(o);return o;};
    const bank=(bx,edge,side)=>{
      const limit=side<0?l.top:l.bottom,space=Math.abs(edge-limit);
      if(space<24*u)return;
      const count=Math.min(3,Math.max(1,Math.ceil(space/(72*u)))),r=Math.min(48*u,space/count*.63);
      for(let j=0;j<count;j++)add('rock',bx+(j%2?8:-8)*u,edge+side*(r+j*(space-r)/count),r);
    };
    let name;
    if(kind==='rock'){
      name=['ledges','arches','slalom'][id%3];
      for(let i=0;i<(variant===2?1:3);i++){
        const bx=x+i*span*.65,cy=this.preferred(bx),side=(i+id)%2?-1:1;
        bank(bx,cy+side*gap/2,side);
        if(name==='arches')bank(bx,cy-side*gap/2,-side);
      }
    }else if(kind==='urchin'){
      name='urchin-slalom';
      for(let i=0;i<(variant===2?1:3);i++){const bx=x+i*span*.8,side=(i+id)%2?-1:1;add(kind,bx,this.preferred(bx)+side*(gap/2+15*u),23*u);}
    }else if(kind==='wall'){
      name='offset-gates';
      for(let i=0;i<(variant===2?1:2);i++){const bx=x+i*span*1.3;add(kind,bx,g.height/2,20*u,{w:40*u,gap,gapY:clamp(this.preferred(bx),l.top+gap/2,l.bottom-gap/2)});}
    }else if(kind==='predator'){
      name='crossing-patrol';
      for(let i=0;i<(variant===2?1:2);i++){
        const behind=i===1&&id%3===2&&g.distance>=1320;
        const bx=behind?-80*u:x+i*Math.max(span,105*u),r=(28+i*5)*u,speed=behind?-.32:.85+(id%2)*.12,frequency=.65;
        const t=g.travelTime((bx-g.fish.x)/(ppm*speed)),cy=clamp(this.preferred(bx),l.top+range*.28,l.bottom-range*.28);
        const amplitude=Math.min(range*.30,gap/2+r+12*u),side=(id+i)%2?1:-1;
        const phase=side*Math.PI/2-frequency*(g.clock+t);
        add(kind,bx,cy+Math.sin(g.clock*frequency+phase)*amplitude,r,{baseY:cy,amplitude,frequency,speed,phase});
      }
    }else if(kind==='current'){
      name='current-channel';const cy=this.preferred(x),direction=id%2?1:-1;
      add(kind,x,l.top+range/2,30*u,{w:80*u,h:range,direction});bank(x+span,cy-direction*gap/2,-direction);
    }else if(kind==='bird'){
      name='diving-passage';const cy=this.preferred(x),t=g.travelTime((x-g.fish.x)/(ppm*.65));
      add(kind,x,-65*u,26*u,{vy:Math.max(125*u,(cy+65*u)/Math.max(.3,t)),diveY:Math.min(l.bottom-18*u,cy+50*u)});
    }else{
      name='octopus-drift';
      for(let i=0;i<(variant===2?1:2);i++){const bx=x+i*span,side=(i+id)%2?-1:1;const o=add(kind,bx,clamp(this.preferred(bx)+side*(gap/2+30*u),l.top+40*u,l.bottom-40*u),38*u);o.y+=Math.sin(g.clock*.8+o.phase)*12*u;}
    }
    return {name,objects};
  }
  section(kind){
    const g=this.game;this.prune();
    for(let variant=0;variant<3;variant++){
      const {name,objects}=this.pattern(kind,variant);if(!objects.some(o=>o.kind===kind)||!this.reservationClear(objects))continue;
      let duration=0;
      for(const o of objects){const factor=g.motionFactor(o);if(factor)duration=Math.max(duration,g.travelTime(Math.max(0,(o.x-g.fish.x+Math.sign(factor)*(o.w||o.r*2))/g.pixelsPerMetre()/factor)));}
      const route=this.trace(g.width,{objects:[...g.obstacles,...objects],duration})[0];if(!route)continue;
      const section={id:++this.serial,name,kind,at:g.distance,points:this.points(route)};
      for(const o of objects){o.id=++g.sequence;o.section=section.id;g.obstacles.push(o);g.introduced.add(o.kind);}
      this.sections.push(section);this.sections=this.sections.slice(-4);return true;
    }
    return false;
  }
}
SC.BubblefishLayout=BubblefishLayout;
})(globalThis);
