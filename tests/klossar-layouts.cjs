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
  if(layout.id==='bridge'){
    const deckZ=pace==='brave'?3:2;
    for(let z=0;z<deckZ;z++){
      const xs=[...new Set(tiles.filter(t=>t.z===z).map(t=>t.x))].sort((a,b)=>a-b);
      assert.equal(xs.length,2,'the bridge has two separate supports');
      assert(xs[0]<-1&&xs[1]>1,'there is an open gap below the deck');
    }
    const span=[...new Set(tiles.filter(t=>t.z===deckZ).map(t=>t.x))].sort((a,b)=>a-b);
    for(let i=1;i<span.length;i++)assert.equal(span[i]-span[i-1],1,'the deck continuously connects the supports');
    for(const t of tiles)assert(tiles.some(p=>p.z===t.z&&p.x===-t.x&&p.y===t.y),'the bridge is left/right symmetric');
  }
  if(layout.id==='v'){
    assert.equal(new Set(tiles.map(t=>t.z)).size,5,'the V has five horizontal tiers');
    let previous;
    for(let z=0;z<5;z++){
      const tier=tiles.filter(t=>t.z===z),left=tier.filter(t=>t.x<0).sort((a,b)=>b.y-a.y);
      assert.equal(tier.length,left.length*2,'the V has two equal arms');
      for(const t of left)assert(tier.some(p=>p.x===-t.x&&p.y===t.y),'each V tier is symmetric');
      assert.equal(left[0].x,-.5,'the two tiles at the point touch');
      for(let i=1;i<left.length;i++){
        assert.equal(left[i].x,left[i-1].x-.5,'each arm grows outward');
        assert.equal(left[i].y,left[i-1].y-1,'each arm is an edge-connected staircase');
      }
      const width=-2*left.at(-1).x+1,depth=left[0].y-left.at(-1).y+1,point=left[0].y;
      if(previous){
        assert(width>previous.width&&depth>previous.depth,'every higher V is wider and deeper');
        assert(point>previous.point,'the point advances so the arms flare outward instead of merely extending their ends');
      }
      previous={width,depth,point};
    }
  }
  console.log(`PASS ${layout.id}/${pace}: ${tiles.length} tiles, average ${mean.toFixed(1)} active`);
}
const hard=SC.klossarLayout('pyramid','brave');
assert(Math.max(...hard.map(t=>t.x))-Math.min(...hard.map(t=>t.x))+1<9.1,'hard pyramid uses the tightened footprint');
