/* Check the geometry's exposure budget independently of exercise matching. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({Starlight:{}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/klossar.js'),'utf8'),context);
const SC=context.Starlight;
for(const layout of SC.klossarLayouts)for(const [pace,target] of Object.entries({gentle:7,steady:10,brave:14})){
  const tiles=SC.klossarLayout(layout.id,pace);
  const blockers=tiles.map(tile=>tiles.filter(other=>other!==tile&&!SC.klossarIsFree(tile,[tile,other])).map(t=>t.id));
  let seed=132,completed=0,total=0;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  // Sample complete, uniformly random legal pair-removal sequences, including
  // the last pair. This estimates availability, not how a player chooses matches.
  for(let attempt=0;attempt<1000&&completed<100;attempt++){
    const removed=new Set();let exposure=0;
    while(removed.size<tiles.length){
      const free=tiles.filter(t=>!removed.has(t.id)&&blockers[t.id].every(id=>removed.has(id)));
      if(free.length<2)break;
      exposure+=free.length;
      removed.add(free.splice(Math.floor(random()*free.length),1)[0].id);
      removed.add(free[Math.floor(random()*free.length)].id);
    }
    if(removed.size===tiles.length){completed++;total+=exposure/(tiles.length/2);}
  }
  assert.equal(completed,100,'enough complete geometric solves');
  const mean=total/completed;
  assert(Math.abs(mean-target)<1,`${layout.id}/${pace}: ${mean.toFixed(2)} active, target ${target}`);
  if(['igloo','pyramid'].includes(layout.id)){
    for(const t of tiles){
      assert(tiles.some(p=>p.z===t.z&&Math.abs(p.x+t.x)<1e-7&&Math.abs(p.y-t.y)<1e-7),'shell is left/right symmetric');
      assert(tiles.some(p=>p.z===t.z&&Math.abs(p.x-t.x)<1e-7&&Math.abs(p.y+t.y)<1e-7),'shell is front/back symmetric');
    }
    const roof=tiles.filter(t=>t.z===Math.max(...tiles.map(t=>t.z)));
    assert.equal(roof.length,4,'four tiles close the roof');
    assert(roof.every(t=>Math.abs(t.x)<=.55&&Math.abs(t.y)<=.55));
  }
  if(layout.id==='square'&&pace!=='gentle')for(const t of tiles)assert(tiles.some(p=>p.z===t.z&&p.x===-t.x&&p.y===t.y),'medium and hard squares are left/right symmetric');
  console.log(`PASS ${layout.id}/${pace}: ${tiles.length} tiles, average ${mean.toFixed(1)} active`);
}
const hard=SC.klossarLayout('pyramid','brave');
assert(Math.max(...hard.map(t=>t.x))-Math.min(...hard.map(t=>t.x))+1<9.1,'hard pyramid uses the tightened footprint');
