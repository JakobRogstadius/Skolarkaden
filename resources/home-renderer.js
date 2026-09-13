/* Cutaway apartment. All furniture and all 1/2/3 child beds share the navigation plan. */
(function(root){
'use strict';const SC=root.Starlight,TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const tint=(hex,n)=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16));return '#'+rgb.map(v=>Math.round(n>0?v+(255-v)*n:v*(1+n)).toString(16).padStart(2,'0')).join('');};
class HomeRenderer extends SC.SceneRenderer{
 destroy(){super.destroy();this.game.detachQueue();}
 projection(){const g=this.game,top=110,s=Math.min((g.width-30)/25,(g.height-top-20)/16.3);return {s,ox:(g.width+s)/2,oy:top+2.15*s+Math.max(0,(g.height-top-20-16.3*s)/2)};}
 point(x,y,z=0){const {s,ox,oy}=this.view;return {x:ox+(x-y)*s,y:oy+(x+y)*s*.55-z*s};}
 poly(points,fill,stroke){const c=this.ctx;c.beginPath();points.forEach((p,i)=>{const q=this.point(...p);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=.8;c.stroke();}}
 line(points,color,width=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>{const q=this.point(...p);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
 plane(x,y,w,d,z,color,stroke){this.poly([[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],color,stroke);}
 box(x,y,w,d,h,color,z=0){
  this.poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],tint(color,-.18));
  this.poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],tint(color,-.07));
  this.plane(x,y,w,d,z+h,tint(color,.15));
  this.line([[x,y+d,z+h],[x+w,y+d,z+h],[x+w,y,z+h]],tint(color,.28),.6);
 }
 oval(x,y,z,rx,ry,color){const q=this.point(x,y,z),c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(q.x,q.y,rx*this.view.s,ry*this.view.s,0,0,TAU);c.fill();}
 draw(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height;this.view=this.projection();c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.clearRect(0,0,w,h);c.globalAlpha=1;c.lineWidth=1;this.liveScoreBoxes=[];this.scoreNotices??=[];
  const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#e9e6d9');bg.addColorStop(1,'#d3dcd1');c.fillStyle=bg;c.fillRect(0,0,w,h);
  if(!g.layout)return;this.floor();this.rearWalls();
  const objects=[];
  for(const b of g.layout.walls.filter(b=>!b.tall)){
   const along=b.w>b.d,length=along?b.w:b.d,n=Math.ceil(length/.7);for(let i=0;i<n;i++){const part={x:b.x+(along?i*length/n:0),y:b.y+(along?0:i*length/n),w:along?length/n:b.w,d:along?b.d:length/n};objects.push({depth:part.x+part.y+(part.w+part.d)/2,draw:()=>this.box(part.x,part.y,part.w,part.d,b.x>11||b.y>12?.25:.55,'#e4dfce')});}
  }
  const counter=g.layout.furniture.find(b=>b.type==='counter'),counterDepth=counter.x+counter.y+(counter.w+counter.d)/2;
  for(const b of g.layout.furniture){
   objects.push({depth:b.type==='fridge'?counterDepth+.04:b.x+b.y+(b.w+b.d)/2,draw:()=>this.furniture(b)});
   if(b.type==='counter')objects.push({depth:counterDepth+.02,draw:()=>this.upperCabinets(b)});
   if(b.type==='table')for(const [x,y] of [[b.x-.3,b.y+.36],[b.x+.6,b.y+b.d+.22],[b.x+b.w+.2,b.y+.3]])objects.push({depth:x+y+.365,draw:()=>this.chair(x,y)});
  }
  for(const t of g.messes)if(['clothes','toys'].includes(t.type))objects.push({depth:t.x+t.y,draw:()=>this.mess(t)});
  for(const p of g.people)objects.push({depth:p.x+p.y+.04,draw:()=>this.person(p)});
  objects.sort((a,b)=>a.depth-b.depth).forEach(o=>o.draw());this.messHighlights();this.cleanSparkles();this.angerBox=null;if(g.helping)this.angerCloud();this.labels();this.drawScores();
 }
 floor(){
  const c=this.ctx,g=this.game,s=this.view.s,q=this.point(6,6.5);c.save();c.shadowColor='#526e6140';c.shadowBlur=s*.6;c.shadowOffsetY=s*.4;this.plane(0,0,12,13,-.15,'#768b79');c.restore();this.box(0,0,12,13,.25,'#bbb9a5',-.25);this.plane(.12,.12,11.76,12.76,.01,'#ddc29b');
  for(const r of g.layout.rooms)this.plane(r.x+.14,r.y+.14,r.w-.28,r.d-.28,.015,r.color);
  // Fine, bounded wood joints are quiet enough to leave task silhouettes clear.
  for(const r of [...g.layout.rooms.filter(r=>r.id!=='bath'),{x:5.5,y:.15,w:1,d:12.65},{x:.15,y:9.4,w:5.3,d:3.4}]){
   for(let y=r.y+.2,k=0;y<r.y+r.d-.1;y+=.34,k++){this.line([[r.x+.15,y,.02],[r.x+r.w-.15,y,.02]],'#94795d24',.65);for(let x=r.x+.8+(k%3)*.7;x<r.x+r.w-.2;x+=2.1)this.line([[x,y,.02],[x,Math.min(y+.34,r.y+r.d-.12),.02]],'#94795d20',.6);}
  }
  for(let x=6.9;x<11.8;x+=.52)this.line([[x,9.5,.025],[x,12.8,.025]],'#f3f6e099',.8);
  for(let y=9.55;y<12.85;y+=.52)this.line([[6.8,y,.025],[11.8,y,.025]],'#f3f6e099',.8);
  this.plane(7.45,1.82,3.05,2.3,.025,'#f2e7cf');this.plane(7.57,1.94,2.81,2.06,.027,'#dfc9aa');
  this.plane(7.35,7.22,2.25,1.62,.025,'#b2c8b1');this.plane(7.51,7.36,1.92,1.34,.027,'#bfcead');
  this.plane(.28,5.0,3.3,3.9,.025,'#c8a6a0');this.plane(3.1,10.22,2.05,1.65,.025,'#aebeb0');
  this.plane(8.65,11.65,1.35,.67,.027,'#93b7ad');
  for(const [x,y] of [[5.9,3.25],[5.9,7.1],[6,11.4]])this.plane(x-.21,y-.35,.5,.7,.024,'#d9ba90');
 }
 rearWalls(){
  this.box(0,0,12,.13,2,'#dce1d2');this.box(0,0,.13,13,1.8,'#e9e0d1');
  this.line([[.15,.16,.1],[11.8,.16,.1]],'#c5c3b1',2);this.line([[.16,.15,.1],[.16,12.8,.1]],'#c5c3b1',2);
  // A broad window behind the sofa and upper cupboards above the kitchen.
  this.poly([[7.3,.145,.83],[9.85,.145,.83],[9.85,.145,1.78],[7.3,.145,1.78]],'#fbf3dd');
  this.poly([[7.45,.15,.94],[9.7,.15,.94],[9.7,.15,1.67],[7.45,.15,1.67]],'#b2d5dc');
  this.line([[8.55,.16,.94],[8.55,.16,1.67]],'#fcf2dc',2);this.line([[7.45,.16,1.29],[9.7,.16,1.29]],'#fcf2dc',2);
  for(const x of [7.17,9.81])this.poly([[x,.19,.72],[x+.24,.19,.72],[x+.31,.19,1.85],[x-.02,.19,1.85]],'#d7bc95');
  this.picture(.16,6.5,1.22,'#e4b973');this.picture(.16,10.9,1.12,'#8ca895');
 }
 upperCabinets(b){for(let i=0;i<4;i++){const x=b.x+.07+i*1.14,y=b.y-.13;this.box(x,y,1.08,.48,.6,'#9eb29b',1.36);this.line([[x+.13,y+.49,1.48],[x+.13,y+.49,1.61]],'#576e60',1.3);}}
 chair(x,y){this.box(x,y,.35,.38,.4,'#c4a47f');this.box(x,y+.28,.35,.09,.3,'#c4a47f',.4);}
 planeOval(x,y,z,rx,ry,color){this.poly(Array.from({length:36},(_,i)=>[x+Math.cos(i*TAU/36)*rx,y+Math.sin(i*TAU/36)*ry,z]),color);}
 toilet(b){
  const {x,y,w,d}=b,cx=x+w/2,cy=y+d*.64;
  this.box(x+.055,y+.035,w-.11,.31,.82,'#e6e9df');this.box(x+.025,y+.015,w-.05,.35,.055,'#f6f3e8',.82);
  this.planeOval(x+w*.73,y+.16,.88,.055,.035,'#9baca2');
  this.box(cx-.13,cy-.2,.26,.46,.32,'#d1dbd0');
  const top=[],bottom=[];for(let i=0;i<=24;i++){const a=-Math.PI/4+i*Math.PI/24;top.push([cx+Math.cos(a)*.315,cy+Math.sin(a)*.43,.53]);bottom.unshift([cx+Math.cos(a)*.18,cy+Math.sin(a)*.27,.24]);}
  this.poly([...top,...bottom],'#e8ecdf','#c5d1c5');
  this.planeOval(cx,cy,.54,.325,.44,'#faf7eb');this.planeOval(cx,cy,.549,.225,.32,'#829e93');
  this.planeOval(cx,cy+.06,.554,.145,.18,'#b7d2c5');
  this.line([[cx-.16,y+.41,.56],[cx+.16,y+.41,.56]],'#d4dfd1',2);
 }
 picture(x,y,z,color){this.poly([[x,y,z-.45],[x,y+.85,z-.45],[x,y+.85,z+.25],[x,y,z+.25]],'#b99170');this.poly([[x+.01,y+.09,z-.37],[x+.01,y+.76,z-.37],[x+.01,y+.76,z+.17],[x+.01,y+.09,z+.17]],'#f4ead4');this.poly([[x+.02,y+.18,z-.25],[x+.02,y+.37,z+.05],[x+.02,y+.62,z-.25]],color);}
 plant(x,y,z=0,size=1){
  const s=size;this.box(x-.16*s,y-.15*s,.32*s,.3*s,.32*s,'#bd9670',z);
  for(let i=0;i<5;i++){const dx=Math.sin(i*2.2)*.32*s,dy=Math.cos(i*2.2)*.22*s;this.line([[x,y,z+.24*s],[x+dx*.65,y+dy,z+(.65+(i%2)*.15)*s]],'#66896b',1.6);const q=this.point(x+dx,y+dy,z+(.63+(i%2)*.12)*s),c=this.ctx;c.fillStyle=i%2?'#769b72':'#91ad80';c.beginPath();c.ellipse(q.x,q.y,.095*this.view.s*s,.23*this.view.s*s,dx*3,0,TAU);c.fill();}
 }
 furniture(b){
  const g=this.game,{x,y,w,d,h,color}=b,s=this.view.s,c=this.ctx,t=this.reduced?0:g.clock;
  if(b.type==='bed'){
   this.box(x,y,w,d,h,color);this.box(x+.04,y-.03,w-.08,.16,.91,tint(color,-.08));this.box(x+.07,y+.18,w-.14,d-.24,.14,'#f1eddf',h);this.plane(x+.08,y+.94,w-.16,d-1.03,h+.15,color);
   const n=b.double?2:1;for(let i=0;i<n;i++)this.box(x+.16+i*w/n,y+.3,w/n-.26,.51,.08,'#faf2dd',h+.14);
   for(let yy=y+1.04;yy<y+d-.15;yy+=.33)this.line([[x+.13,yy,h+.16],[x+w-.13,yy,h+.16]],tint(color,.28),.8);
   if(b.child)for(let k=0;k<6;k++)this.oval(x+.25+(k%2)*.55,y+1.12+Math.floor(k/2)*.3,h+.17,.04,.025,'#fff2c5');return;
  }
  if(b.type==='table'||b.type==='coffee'||b.type==='desk'){
   for(const dx of [.12,w-.22])for(const dy of [.1,d-.2])this.box(x+dx,y+dy,.1,.1,h-.12,tint(color,-.12));this.box(x,y,w,d,.12,color,h-.12);
   if(b.type==='table'){
    this.plant(x+w*.5,y+d*.48,h,.5);for(const p of g.people)if(p.hungry){const a=p.hungry.anchor;this.planeOval(a.x,a.y,h+.025,.32,.26,'#fff8e1');this.planeOval(a.x,a.y,h+.03,.23,.17,'#d39359');this.planeOval(a.x,a.y,h+.035,.19,.14,'#fff2ca');}
   }else if(b.type==='coffee'){this.plant(x+.5,y+.4,h,.42);this.oval(x+1.15,y+.5,h+.03,.12,.065,'#edf1db');}
   else{this.plane(x+.3,y+.12,.5,.36,h+.012,'#eee6d0');this.line([[x+.44,y+.2,h+.02],[x+.66,y+.4,h+.02]],'#96aa8c',1.4);this.drawer(x+.08,y+d-.32,.6,.32,h-.28,color,g.stations.deskDrawer.fill>0);}return;
  }
  if(b.type==='sofa'){
   this.box(x,y,w,.25,.83,color);this.box(x,y,.27,d,.71,color);this.box(x,y,w,d,.4,color);
   for(let i=0;i<3;i++)this.box(x+.3+i*.9,y+.31,.86,.73,.2,tint(color,.07),.4);this.box(x+.48,y+.24,.64,.23,.36,'#a6b099',.62);this.box(x+w-1,y+.24,.53,.23,.36,'#e5c486',.62);this.box(x+w-.27,y,.27,d,.71,color);return;
  }
  if(b.type==='shower'){this.box(x,y,w,d,h,color);this.oval(x+w/2,y+d/2,h+.015,.08,.04,'#85938e');this.poly([[x,y,0],[x+w,y,0],[x+w,y,1.75],[x,y,1.75]],'#b4cfd047');this.line([[x,y,1.75],[x+w,y,1.75],[x+w,y,.25]],'#a3b7ae',1.4);this.line([[x+.65,y+.06,.5],[x+.65,y+.06,1.45],[x+.82,y+.06,1.45]],'#809c97',2);return;}
  if(b.type==='toilet'){this.toilet(b);return;}
  this.box(x,y,w,d,h,color);
  if(b.type==='counter'){
   this.box(x-.025,y-.025,w+.05,d+.05,.08,'#e9dfc8',h);for(let i=1;i<5;i++)this.line([[x+i*.9,y+d,.1],[x+i*.9,y+d,h-.08]],'#687f6b',.8);
   this.plane(x+.45,y+.15,1.1,.54,h+.09,'#9ea9a0');this.plane(x+.57,y+.22,.85,.35,h+.095,'#c2d7cf');this.line([[x+.99,y+.14,h+.09],[x+.99,y+.14,h+.46],[x+1.11,y+.32,h+.46]],'#6d847c',2);
   this.plane(x+2.8,y+.14,1.22,.59,h+.09,'#516563');for(const dx of [.27,.88])for(const dy of [.16,.43])this.oval(x+2.8+dx,y+.14+dy,h+.1,.16,.075,'#263f3d');
   const cook=g.people.find(p=>p.job?.target?.type==='hungry'&&p.job.stage==='clean');if(cook){this.oval(x+3.1,y+.48,h+.15,.28,.13,'#687d6e');this.oval(x+3.1,y+.48,h+.2,.23,.1,'#dba768');this.steam(x+3.1,y+.48,h+.4,t);}
   else if(g.people.some(p=>p.meal?.stage==='collect')){this.dish(x+3.1,y+.48,h+.13,false,true);this.steam(x+3.1,y+.48,h+.35,t);}
   this.cupboard(x+1.88,y+d,.7,.76,color,g.stations.kitchenCabinet.fill>0,.1);this.dishPiles(b.id);
  }else if(b.type==='sideboard'){
   this.box(x-.025,y-.025,w+.05,d+.05,.06,'#e8d9bc',h);this.line([[x+w/2,y+d,.12],[x+w/2,y+d,h-.08]],'#7e9076',1);this.dishPiles(b.id);
  }else if(b.type==='fridge'){
   if(g.stations.fridge.fill){
    this.poly([[x+.04,y+d,.12],[x+w-.04,y+d,.12],[x+w-.04,y+d,h-.08],[x+.04,y+d,h-.08]],'#e1dca4');
    for(let i=0;i<3;i++){const z=.3+i*.48;this.box(x+.1,y+d-.27,w-.2,.28,.04,'#e5e9d5',z);this.box(x+.16,y+d-.21,.2,.22,.26,['#e5c185','#c6d5a4','#e6dfa8'][i],z+.05);this.box(x+.43,y+d-.18,.23,.2,.17,['#adbcb3','#d9a17b','#d3bca8'][i],z+.05);}
    this.poly([[x,y+d,.06],[x-.14,y+d+.73,.06],[x-.14,y+d+.73,h-.02],[x,y+d,h-.02]],'#e9e8d9','#b0bba8');this.line([[x-.12,y+d+.62,h*.58],[x-.12,y+d+.62,h*.84]],'#819a8c',2);
   }else{this.line([[x,y+d,h*.4],[x+w,y+d,h*.4]],'#b8baae',1);this.line([[x+w-.16,y+d,h*.58],[x+w-.16,y+d,h*.85]],'#829990',2);}this.plane(x+.15,y+.18,.24,.32,h+.02,'#d4b685');
  }else if(b.type==='wardrobe'){
   const open=g.stations.cabinet.fill>0;this.line([[x+w/2,y+d,.12],[x+w/2,y+d,h-.08]],'#a28a6e',1);
   if(open){this.poly([[x+.03,y+d,.1],[x+w-.03,y+d,.1],[x+w-.03,y+d,h-.1],[x+.03,y+d,h-.1]],'#6a7264');for(let i=0;i<3;i++)this.box(x+.13,y+.6+i*.05,w-.26,.5,.13,['#9ab9b6','#e6bb8a','#b5a5c6'][i],.35+i*.35);this.box(x,y+d,.12,.66,h-.1,'#c4ad90');}
   else for(const xx of [x+w*.4,x+w*.6])this.line([[xx,y+d,.8],[xx,y+d,1]],'#766e55',1.5);
  }else if(b.type==='washer'){
   const q=this.point(x+w/2,y+d,.5);c.fillStyle='#a8bfb6';c.beginPath();c.ellipse(q.x,q.y,s*.28,s*.29,0,0,TAU);c.fill();c.fillStyle='#577975';c.beginPath();c.ellipse(q.x,q.y,s*.21,s*.22,0,0,TAU);c.fill();
   const washing=g.people.some(p=>p.job?.target?.type==='laundry'&&p.job.stage==='finish');if(washing){c.save();c.translate(q.x,q.y);c.rotate(t*5);this.round(-s*.13,-s*.12,s*.24,s*.11,2,'#c0bdca');this.round(-s*.09,s*.01,s*.2,s*.1,2,'#d9c08f');c.restore();}this.oval(x+w*.25,y+d,.87,.045,.045,'#647b70');
  }else if(b.type==='basket'){
   this.plane(x+.06,y+.05,w-.12,d-.1,h+.01,'#8a7854');for(let i=0;i<5;i++)this.line([[x+.08+i*.15,y+d,.12],[x+.08+i*.15,y+d,h]],'#e1c792',.7);
   for(let i=0;i<Math.min(6,g.stations.laundry.fill);i++)this.clothes(x+w*.5+(i%2-.5)*.32,y+d*.6,h+i*.11,['#429ecc','#de6755','#a47ad0'][i%3],.55);
  }else if(b.type==='bin'){
   this.plane(x-.03,y-.03,w+.06,d+.06,h+.02,'#75958d');if(g.stations.trash.fill)for(let i=0;i<Math.min(5,g.stations.trash.fill);i++)this.oval(x+.1+i*.08,y+.2,h+.12+(i%2)*.15,.21,.09,['#e6ac4a','#f2e5c9','#97b554'][i%3]);
  }else if(b.type==='basin'){this.box(x-.03,y-.03,w+.06,d+.06,.08,'#f2eede',h);this.oval(x+w/2,y+d*.5,h+.09,.35,.14,'#b0c7c1');this.line([[x+w*.5,y+.1,h+.09],[x+w*.5,y+.1,h+.38],[x+w*.5,y+.28,h+.38]],'#7c9b90',1.7);
  }else if(b.type==='tv'){
   this.poly([[x+.25,y+.09,h+.2],[x+.25,y+d-.09,h+.2],[x+.25,y+d-.09,h+1.13],[x+.25,y+.09,h+1.13]],'#3d5954');this.poly([[x+.26,y+.17,h+.3],[x+.26,y+d-.17,h+.3],[x+.26,y+d-.17,h+1.04],[x+.26,y+.17,h+1.04]],'#8eaaa3');
  }else if(b.type==='shelf'){
   for(let j=0;j<3;j++){this.plane(x+.05,y+.08,w-.1,d-.16,.4+j*.45,'#8f785b');for(let i=0;i<3;i++)this.box(x+.25,y+.13+i*.28,.4,.19,.3,['#a6bba2','#d5ad7f','#acb3c7'][i],.4+j*.45);}this.plant(x+.3,y+.5,h,.6);
  }else if(b.type==='nightstand'){this.drawer(x+.04,y+.12,w-.08,d-.12,.22,color,g.stations.bedsideDrawer.fill>0);this.box(x+.16,y+.14,.12,.13,.2,'#877857',h);const q=this.point(x+.22,y+.21,h+.38);c.fillStyle='#f4e0af';c.beginPath();c.ellipse(q.x,q.y,s*.2,s*.15,0,0,TAU);c.fill();
  }else if(b.type==='toybox'){this.plane(x+.05,y+.05,w-.1,d-.1,h+.01,'#617d68');this.toy(x+.35,y+.22,h+.09,.35);
  }else if(b.type==='shoeRack'){for(let i=0;i<4;i++)this.oval(x+.32+i*.5,y+.35,h+.04,.21,.07,['#789b91','#a48882','#b7a06c','#96a6b5'][i]);
  }else if(b.type==='coats'){for(let i=0;i<3;i++)this.clothes(x+.42,y+.22+i*.33,.98,['#9db4b9','#c98d7e','#aaa889'][i],.4);}
 }
 cupboard(x,y,w,h,color,open,z=0){
  if(open){this.poly([[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]],'#647b66');this.box(x+.1,y-.1,w-.2,.16,.08,'#d4dcc7',z+.18);this.box(x+.15,y-.1,w-.3,.16,.06,'#e6cc9e',z+.26);this.box(x,y,.075,w*.7,h,color,z);}
  else{this.poly([[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]],color,'#74866d');this.line([[x+w-.12,y,z+h*.42],[x+w-.12,y,z+h*.67]],'#586f5c',1.3);}
 }
 drawer(x,y,w,d,z,color,open){
  const extension=open?.42:0;if(open){this.box(x,y+d-.04,w,.45,.12,tint(color,-.15),z);this.plane(x+.04,y+d,w-.08,.36,z+.13,'#6b634e');this.plane(x+.09,y+d+.025,w-.2,.24,z+.14,'#d8a95f');}
  this.box(x,y+d+extension-.04,w,.06,.17,color,z);this.line([[x+w*.35,y+d+extension+.025,z+.09],[x+w*.65,y+d+extension+.025,z+.09]],'#746e55',1.2);
 }
 dishPiles(furniture){for(const station of Object.values(this.game.stations))if(station.type==='dishes'&&station.furniture===furniture){let z=station.anchor.z-.06;if(station.fill){this.planeOval(station.anchor.x,station.anchor.y,z-.02,.45,.3,'#9e6b3c66');}for(let i=0;i<Math.min(station.fill,7);i++){const container=station.items[i]==='container';this.dish(station.anchor.x+(i%2)*.055,station.anchor.y,z,container,false);z+=container?.19:.1;}}}
 dish(x,y,z,container,food){
  if(container){this.box(x-.25,y-.2,.5,.4,.17,'#9ab98c',z);this.plane(x-.22,y-.17,.44,.34,z+.175,food?'#e9bd72':'#e6d89c');this.plane(x-.12,y-.08,.23,.18,z+.18,food?'#c67d55':'#956338');}
  else{this.oval(x,y,z,.39,.18,'#fff5d9');this.oval(x,y,z+.015,.3,.125,food?'#dca468':'#d0b374');this.oval(x+.08,y,z+.025,food?.095:.13,food?.055:.065,food?'#719260':'#9b6237');}
 }
 clothes(x,y,z,color='#91adbe',size=.55){const q=this.point(x,y,z),c=this.ctx,s=this.view.s*size;c.save();c.translate(q.x,q.y);c.rotate(-.22);c.fillStyle=color;c.strokeStyle=tint(color,-.18);c.lineWidth=.7;c.beginPath();for(const [i,[xx,yy]] of [[-.25,-.45],[-.65,-.2],[-.43,.04],[-.28,-.03],[-.28,.5],[.33,.5],[.32,-.03],[.49,.06],[.66,-.2],[.28,-.45],[.13,-.27],[-.13,-.27]].entries()){if(i)c.lineTo(xx*s,yy*s);else c.moveTo(xx*s,yy*s);}c.closePath();c.fill();c.stroke();c.restore();}
 toy(x,y,z=0,size=.5){const s=size;this.box(x-.25*s,y-.15*s,.5*s,.3*s,.28*s,'#d75c49',z);this.box(x-.1*s,y-.12*s,.26*s,.25*s,.15*s,'#479bc5',z+.28*s);for(const side of [-1,1])this.oval(x+side*.17*s,y+.17*s,z+.06*s,.1*s,.08*s,'#3e535c');this.box(x+.4*s,y+.13*s,.24*s,.24*s,.23*s,'#f1bb43',z);}
 steam(x,y,z,t){const c=this.ctx;for(let i=0;i<3;i++){const a=this.point(x+(i-1)*.15,y,z),n=((t*.5+i*.3)%1);c.strokeStyle='#fcf1d699';c.lineWidth=1.2;c.beginPath();c.moveTo(a.x,a.y-n*this.view.s*.15);c.quadraticCurveTo(a.x+Math.sin(t*2+i)*5,a.y-this.view.s*.25-n*this.view.s*.15,a.x,a.y-this.view.s*.42);c.stroke();}}
 messOnSite(t){const j=t.owner===null?null:this.game.people[t.owner]?.job;return !t.handoff&&!(j?.target===t&&['deliver','machine','finish'].includes(j.stage));}
 mess(t){if(!this.messOnSite(t))return;if(t.type==='clothes')this.clothes(t.x,t.y,.07,['#429ecc','#de6755','#a47ad0'][t.id%3],.85);else this.toy(t.x,t.y,.06,1.12);}
 messHighlights(){
  const g=this.game,c=this.ctx,s=this.view.s,states=g.getTaskStates();
  for(const t of g.messes){if(!this.messOnSite(t))continue;const pos=g.taskPosition(t),q=this.point(pos.x,pos.y,pos.z??.08),age=g.clock-t.appearedAt,handled=t.owner!==null||states.has(t),pulse=this.reduced?0:Math.sin(g.clock*3+t.phase)*.04,r=Math.max(10,s*.47)*(1+pulse);
   c.save();c.translate(q.x,q.y);c.beginPath();c.ellipse(0,2,r,r*.57,0,0,TAU);c.fillStyle=handled?'#76ba7218':'#ffc65a18';c.fill();c.strokeStyle='#fff7de';c.lineWidth=4.5;c.stroke();c.strokeStyle=handled?'#318354':'#c57320';c.lineWidth=2;c.stroke();
   if(!handled&&age<1.4)for(const a of [-2.7,-1.6,-.5])this.lineLocal([[Math.cos(a)*r*.95,Math.sin(a)*r*.8],[Math.cos(a)*r*1.35,Math.sin(a)*r*1.15]],'#d07d20',2.5);
   if(['trash','dishes','laundry'].includes(t.type)){for(const side of [-1,1]){c.beginPath();c.moveTo(side*r*.6,-r*.45);c.quadraticCurveTo(side*r*.6+4,-r*.85,side*r*.6,-r*1.25);c.strokeStyle='#718b4199';c.lineWidth=2;c.stroke();}}c.restore();
  }
 }
 cleanSparkles(){const c=this.ctx,g=this.game;for(const e of g.effects){const age=(g.clock-e.at)/.7;if(age<0||age>=1)continue;const p=e.position,q=this.point(p.x,p.y,p.z??.15),r=Math.max(12,this.view.s*.5);c.save();c.globalAlpha=1-age;for(let i=0;i<4;i++){const a=i*TAU/4,x=q.x+Math.cos(a)*r*(this.reduced?.7:.35+age),y=q.y+Math.sin(a)*r*.65*(this.reduced?.7:.35+age);this.lineLocal([[x-3,y],[x+3,y]],'#fffdf0',2.5);this.lineLocal([[x,y-4],[x,y+4]],'#fffdf0',2.5);}c.restore();}}
 angerCloud(){
  const g=this.game,c=this.ctx,s=this.view.s,q=this.point(g.player.x,g.player.y),jump=this.reduced?0:Math.abs(Math.sin(g.angerAge*Math.PI*2.5))*s*.42,scale=Math.max(.55,s/35),sway=this.reduced?0:Math.sin(g.angerAge*5)*2;
  const cy=q.y-s*2.05-jump-42*scale;this.angerBox={x:q.x+sway-42*scale,y:cy-31*scale,w:87*scale,h:70*scale};
  c.save();c.translate(q.x+sway,cy);c.scale(scale,scale);c.fillStyle='#858b91';c.strokeStyle='#505b65';c.lineWidth=2;c.beginPath();c.moveTo(-25,8);c.bezierCurveTo(-42,8,-41,-12,-26,-13);c.bezierCurveTo(-26,-30,-4,-33,4,-22);c.bezierCurveTo(18,-30,35,-20,32,-8);c.bezierCurveTo(48,-1,39,16,25,14);c.lineTo(-25,14);c.closePath();c.fill();c.stroke();
  for(const x of [-19,15]){c.beginPath();for(const [i,[dx,dy]]of [[0,12],[-7,25],[0,25],[-4,38],[12,21],[4,21],[10,12]].entries())i?c.lineTo(x+dx,dy):c.moveTo(x+dx,dy);c.closePath();c.fillStyle='#ffd553';c.fill();c.strokeStyle='#aa7b31';c.lineWidth=1.3;c.stroke();}c.restore();
 }
 person(p){
  const g=this.game,c=this.ctx,s=this.view.s,q=this.point(p.x,p.y),size=s*.0205,clock=this.reduced?0:g.clock,rest=p.player?clamp((p.restAge||0)/.55,0,1):0;
  const jump=this.reduced?0:p.player&&g.helping?Math.abs(Math.sin(g.angerAge*Math.PI*2.5))*s*.42:!p.player&&g.state==='celebrating'&&g.celebration<3?Math.abs(Math.sin(g.celebration*Math.PI))*s*.44:p.fear>.95&&g.angerLeft>1?Math.sin((1.2-g.angerLeft)*Math.PI*5)*s*.25:0;
  c.save();c.translate(q.x,q.y);if(rest){c.fillStyle='#445b4c25';c.beginPath();c.ellipse(-s*.8,1,s*1.05,s*.17,0,0,TAU);c.fill();c.rotate(-Math.PI/2*rest);}
  const meal=p.job||p.meal?.stage==='collect'?null:p.meal;
  SC.drawPerson(this,{x:0,feet:-jump,scale:size,look:p.look,walk:p.moving?Math.sin(clock*13*(p.player?Math.sqrt(g.playerRunSpeed()/g.playerSpeed):p.look.child?1.5:1)+p.phase)*6:p.activity?.stage==='use'?Math.sin(clock*6+p.phase)*2:0,anger:p.player?g.angerLevel():0,fear:p.player?0:p.fear,shadow:!rest,carry:p.carry?()=>{this.round(-23,-10,46,23,5,p.carry==='laundry'?'#c4ad7e':'#99b8c2');this.lineLocal([[-17,-4],[17,-4]],'#e8d6b0',2);}:meal?()=>{const food=['walk','eat'].includes(meal.stage),container=meal.kind==='snack';this.round(-18,-34,36,container?16:7,container?3:5,container?'#b8c5b2':'#e7e8d5');this.round(-12,-34,24,4,2,food?'#dda967':'#b6ae88');if(food)this.circle(5,-36,3,'#88a074');}:null});c.restore();
  if(p.job?.stage==='clean'||p.job?.stage==='finish'){const t=p.job.target,k=clock*8;this.line([[p.x-.18,p.y,.65],[p.x+.05+Math.sin(k)*.12,p.y-.3,.5]],'#9aaea3',Math.max(1,s*.07));if(['dishes','laundry'].includes(t.type))for(let i=0;i<3;i++){const a=this.point(p.x+.15+Math.sin(i*4)*.2,p.y-.2,.5+(i%2)*.13);this.circle(a.x,a.y,Math.max(1.2,s*.035),'#e6f0d79c');}}
  if(p.player&&p.job&&!p.job.target){c.fillStyle='#746452';c.font='bold '+Math.max(15,s*.44)+'px system-ui';c.textAlign='center';c.fillText('?',q.x,q.y-s*2.2);}
 }
 lineLocal(points,color,width){const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 icon(type,x,y,size=14){const c=this.ctx;c.save();c.translate(x,y);c.scale(size/16,size/16);c.strokeStyle='#54745e';c.fillStyle='#54745e';c.lineWidth=1.5;c.lineCap='round';c.lineJoin='round';
  if(type==='clothes'){c.beginPath();for(const [i,p] of [[-3,-6],[-7,-3],[-5,0],[-3,-1],[-3,6],[4,6],[4,-1],[6,0],[8,-3],[3,-6],[1,-4],[-1,-4]].entries())i?c.lineTo(...p):c.moveTo(...p);c.closePath();c.stroke();}
  else if(type==='toys'){this.round(-6,-3,12,6,2,'#749788');this.circle(-3,4,2,'#48645a');this.circle(4,4,2,'#48645a');this.round(-3,-6,6,4,1,'#d8b86d');}
  else if(type==='dishes'||type==='hungry'){c.beginPath();c.ellipse(0,1,6,3,0,0,TAU);c.stroke();if(type==='dishes'){this.lineLocal([[-6,4],[6,4]],'#54745e',1.5);this.lineLocal([[-5,7],[5,7]],'#54745e',1.5);}else{c.beginPath();c.arc(0,0,5,Math.PI,0);c.stroke();this.lineLocal([[0,-7],[0,-6]],'#54745e',1.5);}}
  else if(type==='cabinet'){this.round(-6,-7,12,14,1,null,'#54745e');this.lineLocal([[0,-7],[0,7]],'#54745e',1);this.circle(-2,0,.8,'#54745e');this.circle(2,0,.8,'#54745e');}
  else if(type==='fridge'){this.round(-5,-7,10,14,1,null,'#54745e');this.lineLocal([[-5,-2],[5,-2]],'#54745e',1);this.lineLocal([[2,1],[2,4]],'#54745e',1.5);}
  else if(type==='drawer'){this.round(-6,-4,12,10,1,null,'#54745e');this.lineLocal([[-7,-6],[7,-6]],'#54745e',1);this.lineLocal([[-2,1],[2,1]],'#54745e',1.5);}
  else{this.round(-5,-4,10,11,2,null,'#54745e');this.lineLocal([[-7,-5],[7,-5]],'#54745e',1.5);if(type==='laundry')for(const x of [-2,2])this.lineLocal([[x,-1],[x,4]],'#54745e',1);else this.lineLocal([[-2,-7],[2,-7]],'#54745e',1.5);}
  c.restore();
 }
 labels(){
  const c=this.ctx,g=this.game,w=g.width,h=g.height,states=g.getTaskStates(),hints=SC.pinyinHints(g),boxes=[],paintLinks=[],paintLabels=[],narrow=w<600,targets=g.getTargets(),font=SC.isChinese(g.mode)||g.mode==='bopomofo'?21:narrow?14:17;
  const intersects=(a,b)=>a.x<b.x+b.w+2&&a.x+a.w+2>b.x&&a.y<b.y+b.h+2&&a.y+a.h+2>b.y;
  if(this.labelWidth!==w){this.previousBoxes=new Map();this.labelWidth=w;}this.previousBoxes??=new Map();
  const faces=g.people.map(p=>{const q=this.point(p.x,p.y),s=this.view.s;return {x:q.x-s*.47,y:q.y-s*1.95,w:s*.94,h:s*.8};});if(this.angerBox)faces.push(this.angerBox);
  const messBounds=g.messes.filter(t=>this.messOnSite(t)).map(t=>{const p=g.taskPosition(t),q=this.point(p.x,p.y,p.z??.08),s=Math.max(16,this.view.s);return {x:q.x-s*.7,y:q.y-s*.8,w:s*1.4,h:s*1.05};});faces.push(...messBounds);
  for(const target of targets){
   const hint=hints.has(target),pos=g.taskPosition(target),z=pos.z??(target.type==='hungry'?2.15:.18),anchor=this.point(pos.x,pos.y,z),textWidth=SC.labelWidth(c,target.item,{font:'bold '+font+'px system-ui',hint:hint?target.item.hint:'',translation:hint?target.item.translation:'',hintFont:'11px system-ui',max:w-35}),bw=textWidth+21,bh=SC.labelHeight(target.item,hint?font+34:font+6);
   const make=(x,y)=>({x:clamp(x,7,w-bw-7),y:clamp(y,116,h-bh-7),w:bw,h:bh}),direct=make(anchor.x-bw/2,anchor.y-bh-3),candidates=this.nearLabelCandidates(anchor,bw,bh,boxes,{top:116,bottom:h-7,left:7,right:w-7}),previous=this.previousBoxes.get(target.id);
   if(previous&&Math.hypot(previous.x+bw/2-anchor.x,previous.y+bh-anchor.y)<115)candidates.unshift(make(previous.x,previous.y));
   for(const dy of [-51,51,-102,102,-153])for(const dx of [0,-bw-5,bw+5])candidates.push(make(direct.x+dx,direct.y+dy));
   for(let y=120;y<h-bh-7;y+=51)for(let x=7;x<w-bw-5;x+=(w-14)/Math.max(2,Math.floor(w/190)))candidates.push(make(x,y));
   const stable=this.stableLabel(target,anchor,bw,bh,{top:116,bottom:h-7,left:7,right:w-7});if(stable)candidates.unshift(stable);
   if(target.item.diagram){
    // Full-height diagram lanes leave room for every task on narrow screens.
    const columns=Math.max(1,Math.floor((w-14)/(bw+2))),cell=(w-14)/columns;candidates.length=0;
    for(let y=116;y<=h-bh-7;y+=bh+2)for(let col=0;col<columns;col++)candidates.push(make(7+col*cell+(cell-bw)/2,y));
    candidates.sort((a,b)=>Math.hypot(a.x+bw/2-anchor.x,a.y+bh-anchor.y)-Math.hypot(b.x+bw/2-anchor.x,b.y+bh-anchor.y));
    const retained=previous&&candidates.find(b=>b.x===previous.x&&b.y===previous.y);if(retained)candidates.unshift(retained);
   }
   const nearby=candidates.slice(0,2),rest=candidates.slice(2).sort((a,b)=>Math.hypot(a.x+bw/2-anchor.x,a.y+bh-anchor.y)-Math.hypot(b.x+bw/2-anchor.x,b.y+bh-anchor.y));
   const held=previous&&Math.hypot(previous.x+bw/2-anchor.x,previous.y+bh-anchor.y)<115&&boxes.every(o=>!intersects(candidates[0],o))&&messBounds.every(o=>!intersects(candidates[0],o))&&(!this.angerBox||!intersects(candidates[0],this.angerBox))?candidates[0]:null;
   const box=held||[...nearby,...rest].find(b=>boxes.every(o=>!intersects(b,o))&&faces.every(f=>!intersects(b,f)))||(target.item.diagram?candidates:rest).find(b=>boxes.every(o=>!intersects(b,o)))||direct;
   this.keepLabel(target,anchor,box);
   paintLinks.push(()=>{c.beginPath();c.moveTo(anchor.x,anchor.y);c.lineTo(box.x+bw/2,box.y+bh);c.lineCap='round';c.strokeStyle='#fff5dc';c.lineWidth=5;c.stroke();c.strokeStyle=states.has(target)?'#367546':'#526e45';c.lineWidth=2.4;c.stroke();this.circle(anchor.x,anchor.y,4.8,'#fff5dc');this.circle(anchor.x,anchor.y,3.1,states.has(target)?'#367546':'#526e45');});
   paintLabels.push(()=>{
   c.lineWidth=states.has(target)?2:1;this.round(box.x,box.y,bw,bh,7,states.has(target)?'#daedcb':'#faf0d8',states.has(target)?'#6b9974':'#aab594');this.icon(target.type,box.x+12,box.y+bh/2,13);
   c.textAlign='center';c.font='bold '+font+'px system-ui';c.fillStyle='#34554a';SC.drawLabelText(c,target.item,{x:box.x+21,y:box.y,w:textWidth,h:bh},{hint,hintFont:'11px system-ui'});
   this.rememberScoreAnchor(target,box,'#426950','#f3eedc');});boxes.push({...box,id:target.id});this.previousBoxes.set(target.id,box);
  }
  paintLinks.forEach(draw=>draw());paintLabels.forEach(draw=>draw());
  const ids=new Set(targets.map(t=>t.id));for(const id of this.previousBoxes.keys())if(!ids.has(id))this.previousBoxes.delete(id);this.labelBoxes=boxes;c.lineWidth=1;
 }
}
SC.HomeRenderer=HomeRenderer;
})(globalThis);
