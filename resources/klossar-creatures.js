/* Rare visual surprises. No gameplay state or gameplay randomness is consumed. */
(function(root){
'use strict';
const SC=root.Starlight,TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function escapePath(x,y,width,height,random){
  // Compare perpendicular distances in pixels, not percentages: on a wide
  // table a horizontal crossing is usually farther than a vertical one.
  const distances=[x,width-x,y,height-y],edge=distances.indexOf(Math.max(...distances));
  const along=.15+random()*.7,margin=64;
  const end=[{x:-margin,y:height*along},{x:width+margin,y:height*along},{x:width*along,y:-margin},{x:width*along,y:height+margin}][edge];
  return {start:{x:x/width,y:y/height},end:{x:end.x/width,y:end.y/height},distance:Math.hypot(end.x-x,end.y-y)};
}
function pathPoint(creature,progress,width,height){
  const u=clamp(progress,0,1),q=u*(.55+.45*u),sx=creature.start.x*width,sy=creature.start.y*height;
  const dx=creature.end.x*width-sx,dy=creature.end.y*height-sy,distance=Math.hypot(dx,dy)||1;
  // Two overlapping waves make a bee weave and change heading. The envelope
  // starts at the exposed tile and settles only after it crosses the edge.
  const wave=creature.kind==='bee'?Math.sin(Math.PI*u)*Math.min(60,distance*.085,width*.13,height*.13)*
    (Math.sin(TAU*creature.turns*u+creature.phase)+.32*Math.sin(TAU*creature.turns*1.83*u)):0;
  return {x:sx+dx*q-dy/distance*wave,y:sy+dy*q+dx/distance*wave};
}
class KlossarCreatures{
  constructor(arena,{random=Math.random,reduced=false}={}){
    this.random=random;this.reduced=reduced;this.creatures=[];
    this.host=document.createElement('div');this.host.className='klossar-creatures';this.host.setAttribute('aria-hidden','true');
    this.canvas=document.createElement('canvas');this.host.append(this.canvas);arena.append(this.host);
    this.ctx=this.canvas.getContext('2d');this.canvas.hidden=true;this.resize();
  }
  resize(){
    const box=this.host.getBoundingClientRect();this.width=box.width;this.height=box.height;
    const ratio=Math.min(root.devicePixelRatio||1,2);
    this.canvas.width=Math.max(1,Math.round(this.width*ratio));this.canvas.height=Math.max(1,Math.round(this.height*ratio));
    this.ctx.setTransform(ratio,0,0,ratio,0,0);this.draw();
  }
  reveal(x,y,tileHeight){
    // One 0.5% draw per removed tile, followed by an equal choice of species.
    if(!this.width||!this.height||this.random()>=.005)return;
    const kind=this.random()<.5?'bee':'facehugger',path=escapePath(x,y,this.width,this.height,this.random);
    const creature={...path,kind,age:0,phase:this.random()*TAU,turns:2+this.random()*1.5,
      scale:kind==='bee'?clamp(tileHeight/38,.6,1.15):clamp(tileHeight/60,.45,.85),
      duration:this.reduced?.7:Math.max(1.4,path.distance/(kind==='bee'?240:300))};
    this.creatures.push(creature);this.canvas.hidden=false;
  }
  update(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    for(const creature of this.creatures)creature.age+=dt;
    this.creatures=this.creatures.filter(creature=>creature.age<creature.duration);
  }
  draw(){
    const c=this.ctx;if(!c)return;
    if(this.canvas.hidden&&!this.creatures.length)return;
    c.clearRect(0,0,this.width,this.height);this.canvas.hidden=!this.creatures.length;
    for(const creature of this.creatures){
      const u=this.reduced?0:clamp(creature.age/creature.duration,0,1),p=pathPoint(creature,u,this.width,this.height);
      const next=pathPoint(creature,Math.min(1,u+.002),this.width,this.height),angle=Math.atan2(next.y-p.y,next.x-p.x);
      c.save();c.translate(p.x,p.y);c.rotate(angle);c.scale(creature.scale,creature.scale);
      if(this.reduced)c.globalAlpha=1-creature.age/creature.duration;
      if(creature.kind==='bee')this.bee(creature);else this.facehugger(creature);
      c.restore();
    }
  }
  ellipse(x,y,rx,ry,color,angle=0){const c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);c.fill();}
  bee(creature){
    const c=this.ctx,t=this.reduced?0:creature.age,wing=.7+Math.sin(t*48+creature.phase)*.3;
    this.ellipse(-3,8,13,6,'#071d282c');
    c.lineCap='round';c.lineWidth=1.3;c.strokeStyle='#4b3b2b';
    for(const side of [-1,1])for(let i=0;i<3;i++){c.beginPath();c.moveTo(-7+i*6,side*4);c.lineTo(-10+i*6,side*10);c.stroke();}
    for(const side of [-1,1]){
      this.ellipse(-3,side*10*wing,10,5*wing+1,'#ecfff3b8',side*.55);
      this.ellipse(3,side*8*wing,8,4*wing+1,'#ffffffc4',-side*.55);
    }
    this.ellipse(0,0,13,8,'#f5c658');
    c.save();c.beginPath();c.ellipse(0,0,13,8,0,0,TAU);c.clip();
    c.fillStyle='#615032';for(const x of [-7,0])c.fillRect(x,-9,3.5,18);c.restore();
    this.ellipse(11,0,5.5,6,'#e5b847');this.ellipse(13,-3,1.5,1.5,'#443c31');this.ellipse(13,3,1.5,1.5,'#443c31');
    c.strokeStyle='#615032';for(const side of [-1,1]){c.beginPath();c.moveTo(14,side*2);c.quadraticCurveTo(19,side*3,18,side*7);c.stroke();}
  }
  facehugger(creature){
    const c=this.ctx,t=this.reduced?0:creature.age,phase=t*24+creature.phase,body='#c3b079',joint='#7b8050';
    this.ellipse(-5,4,25,12,'#0617193d');c.lineCap='round';c.lineJoin='round';
    c.strokeStyle=joint;c.lineWidth=6;c.beginPath();c.moveTo(-13,0);
    c.bezierCurveTo(-32,Math.sin(phase*.45)*8,-35,-23,-49,-17+Math.sin(phase*.7)*5);
    c.bezierCurveTo(-59,-8,-45,2,-39,-6);c.stroke();c.strokeStyle=body;c.lineWidth=2;c.stroke();
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const x=-12+i*7,step=this.reduced?0:Math.sin(phase+i*1.9+side)*5,knee=x-7+step,tip=x+6-step;
      c.strokeStyle=joint;c.lineWidth=4;c.beginPath();c.moveTo(x,side*5);c.lineTo(knee,side*(17+i%2*3));c.lineTo(tip,side*(24+i%2*4));c.stroke();
      this.ellipse(knee,side*(17+i%2*3),2.5,2.5,body);
      c.strokeStyle='#d7c895';c.lineWidth=1;c.stroke();
    }
    this.ellipse(0,0,20,10,body);c.strokeStyle=joint;c.lineWidth=1.5;
    for(let i=-2;i<=2;i++){c.beginPath();c.ellipse(i*6,0,3,8,.2,-1.2,1.2);c.stroke();}
    this.ellipse(15,0,5,6,'#dacba0');
  }
  destroy(){this.creatures=[];this.host.remove();}
}
Object.assign(SC,{KlossarCreatures,klossarEscapePath:escapePath,klossarCreaturePoint:pathPoint});
})(globalThis);
