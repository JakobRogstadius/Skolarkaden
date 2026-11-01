'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {load,rng,root}=require('../../helpers/runtime.cjs');
const {boot,settle}=require('../../helpers/homework-app.cjs');
const SC=load(['pinyin','data','language-exercises-data','language-exercises','input','game','klossar','ficklampan/scenes','ficklampan/game']);
function intersects(a,b){
  for(const q of [a,b])for(let i=0;i<4;i++){
    const next=q[(i+1)%4],axis=[q[i][1]-next[1],next[0]-q[i][0]],project=poly=>poly.map(p=>p[0]*axis[0]+p[1]*axis[1]);
    const x=project(a),y=project(b);if(Math.max(...x)<=Math.min(...y)||Math.max(...y)<=Math.min(...x))return false;
  }return true;
}
function finish(g){while(g.getTargets().length){const a=g.getTargets()[0],b=g.getTargets().find(t=>SC.klossarMatches(a,t));assert(b,'every remaining tile has a counterpart');g.select(a.id);g.select(b.id);}g.update(1);}
(async()=>{
  assert.equal(SC.ficklampanScenes.length,5);
  for(const scene of SC.ficklampanScenes){
    assert(fs.existsSync(path.join(root,scene.src)),scene.id+' asset');assert.equal(scene.surfaces.length,32);
    const qs=scene.surfaces.map(s=>s.q);
    for(const [i,q] of qs.entries()){
      assert(q.every(([x,y])=>x>=0&&x<1536&&y>=0&&y<1024),scene.id+' '+i+' bounds');
      const turns=q.map((p,j)=>{const b=q[(j+1)%4],c=q[(j+2)%4];return (b[0]-p[0])*(c[1]-b[1])-(b[1]-p[1])*(c[0]-b[0]);});
      assert(turns.every(n=>n>0),scene.id+' '+i+' convex perspective surface');
      for(let j=0;j<i;j++)assert(!intersects(q,qs[j]),scene.id+' overlapping surfaces '+i+'/'+j);
    }
  }
  const sequence=[];
  for(let i=0;i<10;i++){const g=new SC.FicklampanGame({random:rng(i+7)});g.start();sequence.push(g.scene.id);}
  for(let i=0;i<10;i+=5)assert.equal(new Set(sequence.slice(i,i+5)).size,5);
  assert.notEqual(sequence[4],sequence[5]);
  for(const [pace,n] of Object.entries(SC.ficklampanCounts)){
    const events=[],g=new SC.FicklampanGame({random:rng(31),onEvent:e=>events.push(e)});g.start({pace,mode:'math-addition'});
    assert.equal(g.tiles.length,n*2);g.update(50);assert.equal(g.elapsed,0,'loading is not timed');g.sceneReady();g.update(20);
    g.pause();g.update(50);assert.equal(g.elapsed,20);g.resume();
    const a=g.tiles[0],wrong=g.tiles.find(t=>t.key!==a.key);g.select(a.id);assert.equal(g.held,a.id);g.select(wrong.id);assert.equal(g.held,wrong.id);assert.equal(g.hits,0);g.select(wrong.id);assert.equal(g.held,null);
    finish(g);assert.equal(g.state,'won');assert.equal(g.hits,n);assert.equal(g.score,SC.ficklampanScore(n,20));assert.equal(events.filter(e=>e.type==='end').length,1);
    g.update(10);assert.equal(g.elapsed,20);assert.equal(events.filter(e=>e.type==='end').length,1);
    const reference=60+13*n+.35*n*n;assert.equal(SC.ficklampanScore(n,reference),10000);assert(SC.ficklampanScore(n,reference/2)>10000);assert(SC.ficklampanScore(n,reference*2)<10000);
  }
  for(const mode of Object.keys(SC.modes).filter(m=>!SC.modes[m].hidden)){
    const g=new SC.FicklampanGame({random:rng(47)});g.start({mode,pace:'brave',lang:SC.modes[mode].lang});g.sceneReady();finish(g);assert.equal(g.hits,16,mode);
  }
  const app=boot('?game=ficklampan');await settle();app.click('start');await settle();
  assert.equal(app.fields['setup-error'].textContent,'');assert.equal(app.selection.input,'click');assert(app.fields['input-dock'].hidden&&app.fields.answer.disabled);assert.equal(app.game.total,8);
  app.game.sceneReady();app.click('pause');assert.equal(app.game.state,'paused');app.click('resume');await settle();finish(app.game);await settle();
  assert.equal(app.fields['end-overlay'].hidden,false);assert.equal(app.fields['result-title'].textContent,'Alla par är hittade!');
  app.click('again');await settle();await settle();assert.equal(app.posts[0].leaderboard_key,'v1:ficklampan:math-addition:gentle');assert.equal(app.posts[0].settings.input_mode,'click');
  const homework=boot('?game=ficklampan&mode=homework&id=zh-001');await settle();homework.click('start');await settle();assert.equal(homework.fields['setup-error'].textContent,'');homework.game.sceneReady();finish(homework.game);assert.equal(homework.game.hits,8);
  console.log('PASS Ficklampan: five non-overlapping scenes, rotation, every exercise, matching, time/score balance, pause, homework and app score submission.');
})().catch(error=>{console.error(error);process.exitCode=1;});
