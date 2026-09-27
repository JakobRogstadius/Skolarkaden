/* UI-driven deterministic preview; never loaded by the game or score service. */
(function(){
'use strict';
const SC=globalThis.Starlight,$=id=>document.getElementById(id);let game,renderer;
function start(){
  renderer?.destroy();renderer=null;let seed=7,draw=0;
  game=new SC.KlossarGame({random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),onEvent:e=>renderer?.scoreEvent(e)});
  game.start({mode:'letters',pace:'brave',layout:'turtle'});
  const draws=[0,0,.4,.4,.4,0,.9,.6,.5,.5];
  renderer=new SC.KlossarRenderer($('canvas'),game,{creatureRandom:()=>draws[draw++%draws.length]});$('pause').textContent='Pausa';
}
function removePair(){
  if(game.state==='won')start();game.resume();$('pause').textContent='Pausa';
  const free=game.getAvailableTargets(),a=free.find(a=>free.some(b=>SC.klossarMatches(a,b)));if(!a)return;
  const b=free.find(b=>SC.klossarMatches(a,b));game.select(a.id);game.select(b.id);
}
function position(){
  game.pause();$('pause').textContent='Fortsätt';
  for(const creature of renderer.creatures.creatures)creature.age=Number($('progress').value)/100*creature.duration;
  renderer.draw();
}
$('reveal').onclick=removePair;
$('freeze').onclick=()=>{start();removePair();game.update(.9);position();};
$('progress').oninput=position;
$('pause').onclick=()=>{if(game.state==='paused'){game.resume();$('pause').textContent='Pausa';}else{game.pause();$('pause').textContent='Fortsätt';}};
$('restart').onclick=start;
$('narrow').onchange=()=>{document.querySelector('.shell').classList.toggle('is-narrow',$('narrow').checked);renderer.layout();};
start();
})();
