/* Shared geometric cast. Probabilities apply independently to every new character. */
(function(root){'use strict';const SC=root.Starlight;
SC.rarePeople=[
 {id:'alien',name:'Nova från månen',story:'Reser mellan stjärnorna för att hitta god soppa.'},
 {id:'robot',name:'Pip 3000',story:'Drivs av solsken och vänliga ord.'},
 {id:'pelican',name:'Kapten Pelikan',story:'Har en stor näbb och ännu större aptit.'},
 {id:'viking',name:'Viking Vide',story:'Seglar långt för en varm måltid.'},
 {id:'dragon',name:'Draken Glöd',story:'Värmer tekoppen med en liten nysning.'},
 {id:'mushroom',name:'Svampen Spora',story:'Dansar helst när det regnar.'},
 {id:'axolotl',name:'Axel Axolotl',story:'En rosa vattenvän som älskar äventyr.'},
 {id:'wizard',name:'Trollkarlen Tistel',story:'Kan förvandla ett frö till en blomma.'}
];
SC.makePerson=function(random=Math.random){
 const pick=a=>a[Math.floor(random()*a.length)],roll=random(),kind=roll<.4?'man':roll<.8?'woman':roll<.895?'boy':roll<.99?'girl':'exotic',child=kind==='boy'||kind==='girl',feminine=kind==='woman'||kind==='girl';
 const a={kind,child,feminine,skin:pick(['#efc49e','#bc8868','#855848','#f7d9bc','#c79479']),shirt:pick(['#9cded1','#f7c86c','#c3b2ed','#f2a5a3','#8bc1ec']),pants:pick(['#284961','#403752','#405657']),hair:pick(['#463333','#be884e','#2c303c','#d4ced1']),height:.84+random()*.25,width:.86+random()*.26,headRound:child||random()>.35,hairStyle:Math.floor(random()*(child&&!feminine?2:3)),glasses:random()<.25,hat:random()<.16,phase:random()*Math.PI*2,beard:kind==='man'&&random()<.28};
 if(kind==='exotic'){
  a.exotic=pick(SC.rarePeople).id;a.hat=false;a.glasses=false;a.beard=false;a.child=false;
  const colors={alien:['#a4e3a0','#ac91e9'],robot:['#a6c6d0','#789ba9'],pelican:['#fff2d0','#d0e2e4'],viking:['#e2b18c','#b98163'],dragon:['#99d7a4','#74b69b'],mushroom:['#fff0ce','#bad3a1'],axolotl:['#f6b5cf','#b3d7e7'],wizard:['#cfa381','#9c91d2']}[a.exotic];a.skin=colors[0];a.shirt=colors[1];
 }
 return a;
};
SC.makeChild=function(random=Math.random){let first=true;return SC.makePerson(()=>{if(first){first=false;return .8+random()*.19;}return random();});};
SC.personScale=a=>a.child?.77:1;
SC.drawPerson=function(r,{x,feet,scale=1,look:a,walk=0,anger=0,fear=0,shadow=true,carry=null,wave=0,chef=false}){
 const c=r.ctx,B=54*a.height,Y=-B-26,e=a.exotic,skin=a.skin;
 c.save();c.translate(x,feet);c.scale(scale*SC.personScale(a),scale*SC.personScale(a));c.lineCap='round';
 const line=(points,color,width=3)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.stroke();};
 const poly=(points,fill)=>{c.fillStyle=fill;c.beginPath();points.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.closePath();c.fill();};
 if(shadow){c.fillStyle='#101e263b';c.beginPath();c.ellipse(0,2,29*a.width,6,0,0,Math.PI*2);c.fill();}
 if(e==='dragon'){poly([[-15,-B+10],[-47,-B-16],[-42,-B+24],[-19,-25]],'#73a88d');poly([[15,-B+10],[47,-B-16],[42,-B+24],[19,-25]],'#73a88d');line([[13,-20],[37,-7],[44,-21]],skin,9);}
 if(e==='wizard'){poly([[-20,-B],[-33,-7],[32,-7],[19,-B]],'#6f69a5');}
 if(e==='axolotl')line([[8,-19],[32,-12],[40,-27]],'#e59ebf',10);
 if(a.feminine){r.round(-25,Y-24,50,51,12,a.hair);if(a.hairStyle===1){r.circle(-29,Y+5,10,a.hair);r.circle(29,Y+5,10,a.hair);}}
 line([[-9,-26],[-11+walk,0]],a.pants,10);line([[9,-26],[11-walk,0]],a.pants,10);
 r.round(-22*a.width,-B,44*a.width,B-19,9,a.shirt);
 if(a.child){r.circle(0,-B+17,6,'#fff2ba');line([[-9,-B+6],[9,-B+6]],'#ffffff80',2);}
 if(e==='robot'){r.round(-15,-B+8,30,23,3,'#314d5b');for(let i=0;i<3;i++)r.circle(-8+i*8,-B+16,2,['#98efd0','#ffdc88','#f19f9a'][i]);}
 if(e==='pelican'){r.round(-17,-B+7,34,B-24,14,'#fff8e4');}
 line([[-20*a.width,-B+9],[-29*a.width,-28+walk]],a.shirt,9);r.circle(-29*a.width,-24+walk,5,skin);
 const hand=wave?{x:31+Math.sin(wave)*8,y:-B-17}:{x:29*a.width,y:-24-walk};line([[20*a.width,-B+9],wave?[30,-B+4]:[hand.x,hand.y-4],[hand.x,hand.y]],a.shirt,9);r.circle(hand.x,hand.y,5,skin);
 if(wave)for(let i=-1;i<=1;i++)line([[hand.x+i*3,hand.y],[hand.x+i*4,hand.y-8]],skin,2);
 r.round(-5,-B-10,10,15,3,skin);
 if(e==='axolotl')for(const side of [-1,1])for(let i=-1;i<=1;i++){line([[side*18,Y],[side*34,Y+i*15]],'#df729f',4);r.circle(side*34,Y+i*15,4,'#f2a0c6');}
 if(e==='robot')r.round(-22,Y-21,44,42,7,skin);else if(a.headRound||e)r.circle(0,Y,21,skin);else r.round(-21,Y-20,42,41,8,skin);
 if(!e){
  if(a.feminine){r.round(-22,Y-25,44,12,7,a.hair);r.circle(a.hairStyle===2?0:-17,Y-20,a.hairStyle===2?14:11,a.hair);if(a.hairStyle===2)r.circle(14,Y-30,11,a.hair);}
  else if(a.hairStyle===0)r.round(-22,Y-24,44,12,6,a.hair);
  else if(a.hairStyle===1||a.child)for(let i=0;i<5;i++)r.circle(-17+i*8,Y-19-(i%2)*3,7,a.hair);
  else{r.round(-22,Y-19,7,24,3,a.hair);r.round(15,Y-19,7,24,3,a.hair);}
  if(a.beard&&!a.child){poly([[-18,Y+5],[-12,Y+24],[0,Y+29],[13,Y+23],[18,Y+5],[0,Y+14]],a.hair);}
 }
 if(e==='alien'){for(const side of [-1,1]){line([[side*11,Y-16],[side*19,Y-36]],skin,3);r.circle(side*19,Y-36,5,'#ffe395');}}
 if(e==='robot'){line([[0,Y-21],[0,Y-33]],'#9baab7',3);r.circle(0,Y-36,4,'#f4b67b');for(const side of [-1,1])r.round(side*22-4,Y-7,8,17,3,'#7495a1');}
 if(e==='viking'){r.round(-24,Y-27,48,20,8,'#8296a1');for(const side of [-1,1]){line([[side*19,Y-20],[side*31,Y-31],[side*28,Y-42]],'#fff1cc',7);}poly([[-17,Y+6],[-12,Y+25],[0,Y+34],[13,Y+25],[17,Y+6]],'#b97c45');r.circle(-31,-30,15,'#7b6472');r.circle(-31,-30,10,'#c7a473');}
 if(e==='dragon'){for(const side of [-1,1])poly([[side*8,Y-16],[side*16,Y-35],[side*22,Y-12]],'#ffe0a1');}
 if(e==='mushroom'){c.fillStyle='#d87879';c.beginPath();c.ellipse(0,Y-19,35,25,0,Math.PI,Math.PI*2);c.fill();r.round(-35,Y-21,70,9,5,'#f0b1a4');for(const [xx,yy,rad] of [[-17,-31,5],[6,-38,6],[23,-27,4]])r.circle(xx,Y+yy,rad,'#fff0ce');}
 if(e==='wizard'){poly([[-25,Y-18],[7,Y-60],[23,Y-18]],'#7568b2');r.round(-30,Y-22,60,7,4,'#b9a5e4');r.circle(5,Y-37,4,'#ffe29b');poly([[-12,Y+9],[0,Y+38],[14,Y+9]],'#e3ded6');}
 if(a.hat&&!e&&!chef){r.round(-24,Y-28,48,11,5,a.shirt);r.round(-15,Y-39,30,17,5,a.shirt);}
 const brow=anger*6;line([[-14,Y-10-brow*.4-fear*2],[-4,Y-10+brow*.6-fear*8]],'#3b3435',2.2);line([[4,Y-10+brow*.6-fear*8],[14,Y-10-brow*.4-fear*2]],'#3b3435',2.2);
 if(e==='alien'){for(const xx of [-9,9]){c.fillStyle='#304a46';c.beginPath();c.ellipse(xx,Y-2,5,7,xx/25,0,6.28);c.fill();r.circle(xx+1,Y-4,1.5,'#fffbd9');}}
 else if(e==='robot'){r.round(-16,Y-7,12,8,2,'#355563');r.round(4,Y-7,12,8,2,'#355563');r.circle(-10,Y-3,2,'#9bffdc');r.circle(10,Y-3,2,'#9bffdc');}
 else{if(fear)for(const xx of [-9,9]){c.fillStyle='#fffbed';c.beginPath();c.ellipse(xx,Y-3,2.3+fear*3.7,2.3+fear*5,0,0,6.28);c.fill();}r.circle(-9,Y-3,2.3,'#303740');r.circle(9,Y-3,2.3,'#303740');}
 c.strokeStyle='#3b3435';c.lineWidth=2.2;c.beginPath();if(fear>.1){c.fillStyle='#514441';c.ellipse(0,Y+12,4+fear,3+fear*4,0,0,6.28);c.fill();}else{c.moveTo(-9,Y+10);c.quadraticCurveTo(0,Y+20-anger*21,9,Y+10);c.stroke();}
 if(e==='pelican'){poly([[-5,Y+3],[34,Y+6],[5,Y+22]],'#f1bc73');poly([[-5,Y+3],[37,Y+7],[3,Y+11]],'#ffdc89');}
 if(a.glasses){c.lineWidth=1.5;for(const xx of [-9,9]){c.beginPath();c.arc(xx,Y-3,7,0,6.28);c.stroke();}line([[-2,Y-3],[2,Y-3]],'#3b3435',1.5);}
 c.globalAlpha=anger*.55;r.circle(-15,Y+6,4,'#e66960');r.circle(15,Y+6,4,'#e66960');c.globalAlpha=1;
 if(chef){r.round(-22,Y-34,44,18,5,'#fff6e3');for(const xx of [-17,0,17])r.circle(xx,Y-36,12,'#fff6e3');}
 if(carry)carry(0,-B+16);c.restore();
};
})(globalThis);
