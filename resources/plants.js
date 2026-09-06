/* Shared healthy / stressed plant geometry, relative to the soil surface. */
(function(root){'use strict';const SC=root.Starlight;
SC.drawPlant=function(r,p,clock=0){
 const c=r.ctx,g={clock},look=p.look,H=30+p.growth*72,droop=(p.dead?1:1-p.moisture)*(12+18*p.growth),bend=Math.sin(look.phase)*droop;
    const hue=look.hue,sat=18+65*p.nutrition,leaf=p.dead?'#827056':`hsl(${hue} ${sat}% 48%)`,stem=p.dead?'#78674f':`hsl(${hue} ${sat}% 36%)`;
    c.strokeStyle=stem;c.lineWidth=3+p.growth*3;c.lineCap='round';c.beginPath();c.moveTo(0,-6);c.bezierCurveTo(0,-H*.4,bend*.5,-H,bend,-H+droop);c.stroke();
    const count=3+Math.floor(p.growth*9);
    for(let i=0;i<count;i++){const t=(i+1)/(count+1),side=i%2?1:-1,x=bend*t*t,y=-6-H*t+droop*t*t,l=9+p.growth*11;c.save();c.translate(x,y);c.rotate(side*(.55+(1-p.moisture)*.8));c.fillStyle=leaf;c.beginPath();c.ellipse(side*l*.6,0,l,l*.36,0,0,6.28);c.fill();c.restore();}
    const bugs=Math.ceil(p.infection*10);
    for(let i=0;i<bugs;i++){
      const phase=g.clock*(.3+i*.03)+look.phase+i*2.4,t=.18+.75*(.5+.5*Math.sin(phase)),x=bend*t*t+Math.cos(phase*1.7)*11,y=-H*t+droop*t*t,size=2+p.infection*3;
      c.strokeStyle='#342a2b';c.lineWidth=1;for(const side of [-1,1])for(let j=-1;j<=1;j++){c.beginPath();c.moveTo(x,y+j*size*.5);c.lineTo(x+side*size*1.5,y+j*size+Math.sin(g.clock*9+j)*1.5);c.stroke();}
      r.circle(x,y,size,i%2?'#d98465':'#393346');r.circle(x-size*.2,y-size*.2,1,'#ffcf8c');
    }
    if(p.bloom)for(let i=0;i<look.flowers;i++){
      const x=bend+(i-(look.flowers-1)/2)*24,y=-H+droop-Math.sin(i+1)*9;
      for(let k=0;k<6;k++){const a=k*Math.PI/3;r.circle(x+Math.cos(a)*10,y+Math.sin(a)*10,7,look.petal);}r.circle(x,y,7,'#ffdc74');
    }

};
})(globalThis);
