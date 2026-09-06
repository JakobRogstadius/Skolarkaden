/* Shared parametric plants. Shape is independent of growth and the three care values. */
(function(root){'use strict';const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),TAU=Math.PI*2;
const palettes=['#fff0c5','#f69fb8','#b6a0eb','#ffa671','#8ccedf','#f7d15c','#ec8cba'];
SC.makePlantLook=function(random=Math.random,overrides={}){
 return {stalk:Math.floor(random()*4),leaf:Math.floor(random()*5),flower:Math.floor(random()*6),height:.84+random()*.26,spread:.78+random()*.3,leafSize:.8+random()*.3,petalSize:.84+random()*.2,hue:94+random()*54,phase:random()*TAU,flowers:1+Math.floor(random()*3),petal:palettes[Math.floor(random()*palettes.length)],...overrides};
};
SC.plantHealth=function(p){
 const moisture=clamp(p.moisture??1,0,1),nutrition=clamp(p.nutrition??1,0,1),infection=clamp(p.infection??0,0,1),dry=p.dead?1:1-moisture;
 const hue=(p.look.hue??115)-(1-nutrition)*22,sat=12+nutrition*62;
 return {dry,moisture,nutrition,infection,leaf:p.dead?'#93846c':`hsl(${hue} ${sat}% ${67-nutrition*23}%)`,stem:p.dead?'#82715c':`hsl(${hue} ${sat}% ${47-nutrition*15}%)`,bugs:p.dead?0:Math.ceil(infection*10),bugSize:2+infection*3};
};
SC.soilColor=(moisture,dead=false)=>dead?'#82705b':`hsl(28 31% ${41-25*clamp(moisture,0,1)}%)`;
SC.plantBounds=p=>({left:-70,right:70,top:-(22+clamp(p.growth,0,1)*84)*(p.look.height??1)-22,bottom:12});
SC.plantShape=function(p,clock=0){
 const look=p.look,growth=clamp(p.growth,0,1),health=SC.plantHealth(p),H=(22+growth*84)*(look.height??1),spread=look.spread??1,paths=[],leaves=[],tips=[];
 const bend=clamp(Math.sin(look.phase??0)*(H*.05+health.dry*H*.19)+Math.sin(clock*.9+(look.phase??0))*growth*1.2,-20,20);
 const pose=(x,y)=>{const t=clamp(-y/H,0,1);return {x:x+bend*t*t,y:y+health.dry*H*.32*t*t};};
 const at=(path,t)=>{const u=1-t;return {x:u*u*path.from.x+2*u*t*path.control.x+t*t*path.to.x,y:u*u*path.from.y+2*u*t*path.control.y+t*t*path.to.y};};
 function stem(x,y,from={x:0,y:-4},curve=0,weight=1){const to=pose(x,y),path={from,control:pose((x+from.x)*.35+curve,(y+from.y)*.57),to,weight};paths.push(path);return path;}
 function foliage(path,count,size=1){for(let i=0;i<count;i++){
  const mature=clamp(growth*count+1-i,0,1);if(!mature)continue;
  const t=.16+i/count*.69,point=at(path,t);leaves.push({...point,side:i%2?1:-1,angle:-.52+health.dry*1.5,length:(9+growth*11)*(look.leafSize??1)*size*mature});
 }}
 const style=look.stalk??0;
 if(style===0){const path=stem(Math.sin(look.phase??0)*7,-H,undefined,5);foliage(path,7);tips.push(path.to);}
 else if(style===1){
  const trunk=stem(0,-H*.70,undefined,-5);foliage(trunk,4,.95);
  for(let i=0;i<3;i++){const path=stem((i-1)*22*spread,-H*(i===1?1:.85),at(trunk,.55+i*.13),(i-1)*8,.7);foliage(path,3,.72);tips.push(path.to);}
 }else if(style===2){
  for(let i=0;i<3;i++){const path=stem((i-1)*23*spread,-H*(.73+(i===1?.27:.06)),undefined,(i-1)*22,.8);foliage(path,4,.8);tips.push(path.to);}
 }else{
  for(let i=0;i<8;i++){const side=i%2?1:-1;leaves.push({x:side*2,y:-5-i*.6,side,angle:-1.12+(i%4)*.25+health.dry*1.15,length:(13+growth*19)*(look.leafSize??1)});}
  for(let i=0;i<(look.flowers??2);i++){const n=look.flowers??2,path=stem((i-(n-1)/2)*19*spread,-H*(.88+.12*Math.sin(i+1)),undefined,(i-(n-1)/2)*13,.55);tips.push(path.to);}
 }
 // A single stalk can sprout smaller side flowers; every flower has a connected stem.
 if(style===0&&growth>.65)for(let i=1;i<(look.flowers??1);i++){const path=stem((i%2?1:-1)*21*spread,-H*.86,at(paths[0],.67),0,.55);tips.push(path.to);}
 return {health,growth,paths,leaves,tips,at,H};
};
function leaf(c,look,health,l){
 const L=l.length,type=look.leaf??0;c.save();c.translate(l.x,l.y);c.scale(l.side,1);c.rotate(l.angle);c.fillStyle=health.leaf;c.strokeStyle=health.stem;c.lineWidth=.9;
 c.beginPath();
 if(type===0){c.moveTo(0,0);c.quadraticCurveTo(L*.7,-L*.27,L,0);c.quadraticCurveTo(L*.6,L*.27,0,0);}
 else if(type===1){c.moveTo(0,0);c.bezierCurveTo(L*.15,-L*.62,L*.65,-L*.58,L,0);c.bezierCurveTo(L*.65,L*.58,L*.15,L*.62,0,0);}
 else if(type===2){c.ellipse(L*.53,0,L*.50,L*.4,0,0,TAU);}
 else if(type===3){c.moveTo(0,0);for(let side=-1;side<=1;side+=2){if(side===1)c.lineTo(L,0);for(let i=0;i<4;i++){const x=side===-1?(i+1)*L/5:(4-i)*L/5;c.quadraticCurveTo(x,side*L*(.2+(i%2)*.17),x+(side===-1?L*.1:-L*.1),side*L*.16);}}c.closePath();}
 else{c.moveTo(0,0);c.lineTo(L,0);c.stroke();for(let i=1;i<5;i++){const x=L*i/5,r=(1-i/6)*L*.26;for(const side of [-1,1]){c.beginPath();c.ellipse(x,side*r*.7,r,r*.4,side*.7,0,TAU);c.fill();}}}
 if(type!==4){c.fill();c.beginPath();c.moveTo(1,0);c.lineTo(L*.82,0);c.stroke();}c.restore();
}
function flower(r,look,x,y,scale,dry,clock){
 const c=r.ctx,type=look.flower??0,petal=look.petal??'#ffe1a1',s=scale*(look.petalSize??1);c.save();c.translate(x,y);c.rotate(dry*.9+Math.sin(clock*.7+(look.phase??0))*.025);c.scale(s,s);
 c.fillStyle=petal;c.strokeStyle='#504f492b';c.lineWidth=.65;
 if(type===0||type===5){
  const count=type===5?13:9;for(let i=0;i<count;i++){c.save();c.rotate(i*TAU/count);c.beginPath();c.ellipse(0,-10,type===5?3.4:4.5,8,0,0,TAU);c.fill();c.stroke();c.restore();}
  r.circle(0,0,type===5?8:5.5,type===5?'#795635':'#f5bd52');if(type===5)for(let i=0;i<9;i++){const a=i*2.4,rr=Math.sqrt(i)*1.8;r.circle(Math.cos(a)*rr,Math.sin(a)*rr,.9,'#efc47c');}
 }else if(type===1){
  c.beginPath();c.moveTo(-13,-12);c.quadraticCurveTo(-15,13,0,14);c.quadraticCurveTo(15,13,13,-12);c.lineTo(5,-6);c.lineTo(0,-16);c.lineTo(-5,-6);c.closePath();c.fill();c.stroke();c.strokeStyle='#ffffff60';c.beginPath();c.moveTo(-7,-6);c.quadraticCurveTo(-7,6,0,11);c.stroke();
 }else if(type===2){
  for(let i=-1;i<=1;i++){c.save();c.translate(i*9,i===0?2:-5);c.rotate(-i*.3);c.beginPath();c.moveTo(-6,-8);c.quadraticCurveTo(-8,2,-10,8);c.quadraticCurveTo(0,13,10,8);c.quadraticCurveTo(8,2,6,-8);c.closePath();c.fill();c.stroke();r.circle(0,11,2,'#efbf62');c.restore();}
 }else if(type===3){
  c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?7:17;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();c.stroke();r.circle(0,0,4.5,'#fff3b2');
 }else{
  for(let ring=0;ring<2;ring++)for(let i=0;i<8;i++){const a=(i+ring*.5)*TAU/8,rr=ring?5:10;r.circle(Math.cos(a)*rr,Math.sin(a)*rr,ring?5:7,petal);}
  r.circle(0,0,4,'#ffe6a1');
 }
 c.restore();
}
SC.drawPlant=function(r,p,clock=0){
 const c=r.ctx,look=p.look,shape=SC.plantShape(p,r.reduced?0:clock),{health,growth,paths,leaves,tips,at}=shape;
 c.save();c.lineCap='round';c.lineJoin='round';
 for(const path of paths){c.strokeStyle=health.stem;c.lineWidth=(2.3+growth*2.3)*path.weight;c.beginPath();c.moveTo(path.from.x,path.from.y);c.quadraticCurveTo(path.control.x,path.control.y,path.to.x,path.to.y);c.stroke();}
 for(const l of leaves)leaf(c,look,health,l);
 const flowerOpen=p.flowerAge===undefined?1:clamp(p.flowerAge/.7,.12,1);
 for(const tip of tips){
  if(p.bloom&&!p.dead)flower(r,look,tip.x,tip.y,flowerOpen,health.dry,r.reduced?0:clock);
  else if(!p.dead&&growth>.58){c.save();c.translate(tip.x,tip.y);c.rotate(health.dry);c.fillStyle=health.stem;c.beginPath();c.ellipse(0,-2,3+growth*1.8,5+growth*2,0,0,TAU);c.fill();if(growth>.86){c.fillStyle=look.petal??'#ffdf9c';c.beginPath();c.ellipse(0,-4,2,4,0,0,TAU);c.fill();}c.restore();}
 }
 for(let i=0;i<health.bugs;i++){
  const phase=(r.reduced?0:clock)*(.3+i*.03)+(look.phase??0)+i*2.4,t=.16+.7*(.5+.5*Math.sin(phase)),point=at(paths[i%paths.length],t),x=point.x+Math.cos(phase*1.7)*4,y=point.y,size=health.bugSize;
  c.strokeStyle='#42313b';c.lineWidth=1.2;for(const side of [-1,1])for(let j=-1;j<=1;j++){c.beginPath();c.moveTo(x,y+j*size*.5);c.lineTo(x+side*size*1.5,y+j*size+(r.reduced?0:Math.sin(clock*9+j)*1.2));c.stroke();}
  r.circle(x,y,size,i%2?'#d67150':'#413344');r.circle(x-size*.3,y-size*.3,size*.32,'#ffd887');r.circle(x,y-size*.85,size*.45,'#392f34');
 }
 c.restore();
};
})(globalThis);
