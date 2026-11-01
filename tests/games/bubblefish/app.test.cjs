'use strict';
const assert=require('node:assert/strict');
const {boot,settle}=require('../../helpers/homework-app.cjs');
const {load}=require('../../helpers/runtime.cjs');
function checkPointerControls(game){
  const rootEvents=new EventTarget(),canvas=new EventTarget();let ready=false,captured=null;
  Object.assign(canvas,{getContext:()=>({}),setAttribute(){},parentElement:{append(){}},
    getBoundingClientRect:()=>({left:20,top:30,width:ready?game.width:0,height:ready?game.height:0}),
    setPointerCapture:id=>{captured=id;}});
  const SC=load(['bubblefish/renderer'],{Starlight:{isChinese:()=>false},
    document:{createElement:()=>({getContext:()=>({}),setAttribute(){},remove(){}})},
    ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    addEventListener:rootEvents.addEventListener.bind(rootEvents),removeEventListener:rootEvents.removeEventListener.bind(rootEvents)});
  const renderer=new SC.BubblefishRenderer(canvas,game);ready=true;
  const pointer=(type,pointerType='mouse',pointerId=1,x=500,y=200)=>{
    const e=new Event(type,{cancelable:true});Object.assign(e,{pointerType,pointerId,clientX:x+20,clientY:y+30,button:0,buttons:0});canvas.dispatchEvent(e);
  };
  pointer('pointermove');assert.equal(game.target.x,500);assert.equal(game.target.y,200);assert.equal(captured,null,'hover needs no press or capture');
  pointer('pointerdown');pointer('pointerup');assert.equal(game.target.x,500,'mouse release retains cursor following');
  pointer('pointerleave');assert.equal(game.target,null);
  pointer('pointermove','touch',2);assert.equal(game.target,null,'touch requires contact');
  pointer('pointerdown','touch',2);assert.equal(captured,2);assert.equal(game.target.x,500);
  pointer('pointermove','touch',3,650);assert.equal(game.target.x,500,'ignore a second finger');
  pointer('pointermove','mouse',1,650);assert.equal(game.target.x,500,'touch keeps control on a hybrid device');
  pointer('pointermove','touch',2,600);assert.equal(game.target.x,600);
  pointer('pointerleave','touch',2);assert.equal(game.target.x,600,'captured touch can leave the canvas');
  pointer('pointerup','touch',2);assert.equal(game.target,null);
  pointer('pointerdown','touch',2);pointer('pointercancel','touch',2);assert.equal(game.target,null);
  pointer('pointerdown','touch',2);pointer('lostpointercapture','touch',2);assert.equal(game.target,null);
  game.pause();pointer('pointermove');assert.equal(game.target,null);game.resume();
  pointer('pointermove');rootEvents.dispatchEvent(new Event('blur'));assert.equal(game.target,null);
  renderer.destroy();pointer('pointermove');assert.equal(game.target,null,'destroy removes hover controls');
}
(async()=>{
  const app=boot('?game=bubblefish');await settle();app.click('start');await settle();
  assert.equal(app.fields['setup-error'].textContent,'');
  assert.equal(app.selection.kind,'bubblefish');assert.equal(app.selection.input,'click');assert.equal(app.captures.at(-1).enabled,false);
  assert(app.fields.answer.disabled&&app.fields['input-dock'].hidden);
  checkPointerControls(app.game);
  const g=app.game;assert.equal(g.questions.length,3);g.update(3);
  app.click('pause');const life=g.life;g.update(4);assert.equal(g.life,life);app.click('resume');await settle();assert.equal(g.state,'playing');
  g.life=.001;g.update(.1);await settle();assert.equal(app.fields['end-overlay'].hidden,false);assert.equal(app.fields['result-title'].textContent,'Dags att vila fenorna.');
  app.click('again');await settle();await settle();assert.equal(app.posts[0].leaderboard_key,'v1:bubblefish:math-addition:gentle');assert.equal(app.posts[0].settings.input_mode,'click');assert.equal(app.game.life,100);
  const homework=boot('?game=bubblefish&mode=homework&id=zh-001');await settle();homework.click('start');await settle();assert.equal(homework.fields['setup-error'].textContent,'');assert.equal(homework.game.items.length,3);assert.equal(homework.selection.input,'click');
  console.log('PASS Bubbelfisken app: cursor hover, touch capture/release, pause, homework, end, score submission and restart.');
})().catch(e=>{console.error(e);process.exitCode=1;});
