/* Deterministic visual/input fixture. No score submission or production hooks. */
(function(){
'use strict';const SC=globalThis.Starlight,$=id=>document.getElementById(id),sounds=new SC.GameSounds();
let game,renderer,muted=false,scene='start',seed=1,lastEvent='';
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function loadScene(name){
  scene=name;renderer?.destroy();seed=91;
  game=new SC.BubblefishGame({random,sounds,onEvent:e=>{if(e.type==='fish-sound'){game.audio?.play(e.sound,{x:e.x});lastEvent=e.sound;}}});
  const mode=$('exercise').value;game.start({mode,lang:SC.modes[mode].lang});
  renderer=new SC.BubblefishRenderer($('canvas'),game);renderer.resize();
  game.nextHazard=game.nextBalls=game.nextPickup=Infinity;game.state='paused';game.clock=25;
  const w=game.width,h=game.height,u=game.unit(),f=game.fish;f.x=w*.25;f.y=h*.44;
  if(name!=='start'){
    game.state='playing';game.collectQuestion(game.questions[1]);game.state='paused';
    if(game.held){game.held.x=f.x-95*u;game.held.y=f.y-18*u;}
    game.answers=[game.bubble({...game.held.pair,answer:game.held.pair.answer},'answer',w*.7,h*.38)];
    game.balls=Array.from({length:9},(_,i)=>({x:w*(.42+i*.045),y:h*.70+Math.sin(i*.75)*17*u,r:5*u}));
    game.pickups=['agility','growth','armor','magnet','refill','senses'].map((kind,i)=>({kind,x:w*(.2+i*.12),y:h*.83,r:23*u}));
  }
  if(name==='reef'||name==='ink'){
    game.obstacles=[{kind:'rock',x:w*.45,y:h*.9,r:48*u,phase:1,age:0},
      {kind:'urchin',x:w*.55,y:h*.22,r:23*u,phase:2,age:0},
      {kind:'predator',x:w*.81,y:h*.55,baseY:h*.55,r:33*u,phase:2,speed:1.3,frequency:.7,amplitude:20*u,age:0},
      {kind:'octopus',x:w*.64,y:h*.65,baseY:h*.65,r:38*u,phase:3,age:0},
      {kind:'wall',x:w*.94,y:h*.5,w:48*u,gapY:h*.48,gap:h*.4,r:20*u,phase:1,age:0},
      {kind:'current',x:w*.38,y:h*.5,w:75*u,h:h*.8,direction:-1,r:20*u,phase:0,age:0},
      {kind:'bird',x:w*.79,y:h*.15,r:26*u,vy:125*u,age:0}];
  }
  if(name==='growth'){game.active.growth=8;game.gulp=.24;game.obstacles=[{kind:'predator',x:w*.56,y:f.y,baseY:f.y,r:30*u,phase:1,speed:1.2,frequency:.7,amplitude:8*u,age:0}];}
  if(name==='armor'){game.active.armor=8;game.obstacles=[{kind:'wall',x:w*.56,y:h*.5,w:56*u,gapY:h*.7,gap:h*.25,r:22*u,phase:1,age:0},{kind:'rock',x:w*.83,y:f.y,r:40*u,phase:0,age:0}];}
  if(name==='ink')game.ink=[{x:w*.48,y:h*.42,r:70*u,age:1.2,duration:5.2,seed:2}];
  if(name==='pairs')for(let i=0;i<35;i++){const pair=game.makePair();game.collected.push({question:pair.problem,answer:{label:pair.answer},age:3,x:f.x,y:f.y,id:i});} 
  game.life=67;game.points=725;game.refreshScore();renderer.draw();$('run').textContent='Spela';paintStatus();
}
function paintStatus(){
  if(!game)return;game.audio?.setMix({enabled:!muted,playing:game.state==='playing'});
  $('score').textContent=game.score;$('progress').value=game.life;
  $('status').textContent=`${Math.round(game.width)} × ${Math.round(game.height)} · ${Math.round(game.life)} % liv · ${game.hits} par · ${game.state} · ${lastEvent}`;
}
for(const button of document.querySelectorAll('[data-scene]'))button.addEventListener('click',()=>{sounds.unlock();loadScene(button.dataset.scene);});
for(const button of document.querySelectorAll('[data-size]'))button.addEventListener('click',()=>{const [w,h]=button.dataset.size.split(',');$('arena').style.width=w+'px';$('arena').style.height=h+'px';renderer.resize();loadScene(scene);});
$('exercise').addEventListener('change',()=>loadScene(scene));
$('run').addEventListener('click',()=>{sounds.unlock();if(game.state==='paused')game.resume();else if(game.state==='playing')game.pause();else loadScene(scene);$('run').textContent=game.state==='playing'?'Pausa':'Spela';paintStatus();});
$('sound').addEventListener('click',()=>{muted=!muted;$('sound').textContent=muted?'Ljud av':'Ljud på';paintStatus();});
globalThis.addEventListener('blur',()=>{if(game?.state==='playing'){game.pause();$('run').textContent='Spela';paintStatus();}});
loadScene('start');setInterval(paintStatus,150);
})();
