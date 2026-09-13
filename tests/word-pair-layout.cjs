'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows','eggs','home','home-renderer'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx);
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function setup(name,width,mode){
  const g=new SC[name+'Game']({random:rng(5)});g.start({mode,lang:SC.modes[mode].lang,pace:'gentle'});g.resize(width,740);
  if(name==='Home')g.createTask('toys',g.spots.toys[0]);
  if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);}
  if(name==='Egg'){g.eggs.forEach(e=>e.crackAt=10000);for(let i=0;i<140;i++)g.update(.05);g.crack(g.eggs[0]);}
  for(let i=0;i<100&&!g.getTargets().length;i++)g.update(.05);
  const target=g.getTargets()[0];assert(target,name);
  // Keep the actor still and the hint no wider than the prompt to isolate height.
  target.item={...SC.modes[mode].items[0],label:'ordpar',answer:'svar',hint:'svar'};
  return {g,target};
}
function renderer(name,g){
  let matrix=[1,0,0,1,0,0];const stack=[],drawn=[],boxes=[];
  const point=(x,y)=>({x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]});
  const multiply=(a,b,c,d,e,f)=>{const m=matrix;matrix=[m[0]*a+m[2]*b,m[1]*a+m[3]*b,m[0]*c+m[2]*d,m[1]*c+m[3]*d,m[0]*e+m[2]*f+m[4],m[1]*e+m[3]*f+m[5]];};
  const c=new Proxy({font:'16px system-ui',save(){stack.push({font:this.font,matrix:[...matrix]});},restore(){const old=stack.pop();this.font=old.font;matrix=old.matrix;},setTransform(...m){matrix=m;},translate(x,y){multiply(1,0,0,1,x,y);},scale(x,y){multiply(x,0,0,y,0,0);},rotate(a){multiply(Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0);},measureText(text){return {width:Array.from(String(text)).length*Number(this.font.match(/([\d.]+)px/)?.[1]||16)*.6};},fillText(text,x,y){drawn.push({text,...point(x,y),size:Number(this.font.match(/([\d.]+)px/)?.[1])});}},{get:(o,k)=>k in o?o[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
  const r=Object.create(SC[name+'Renderer'].prototype);Object.assign(r,{game:g,ctx:c,dpr:1,stars:[],reduced:true});
  return {r,drawn,boxes,draw(){drawn.length=boxes.length=0;const draw=SC.drawLabelText;SC.drawLabelText=(c,item,box,options)=>{const a=point(box.x,box.y),b=point(box.x+box.w,box.y+box.h);boxes.push({item,x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y});draw(c,item,box,options);};try{r.draw();}finally{SC.drawLabelText=draw;}}};
}
const failures=[];
for(const name of ['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow','Egg','Home'])for(const width of [370,1100])for(const mode of ['swedish-synonyms','english-opposites','translation-sv-en-1']){
  const {g,target}=setup(name,width,mode),view=renderer(name,g);
  view.draw();const before={...view.drawn.find(t=>t.text==='ordpar')},boxBefore={...view.boxes.find(b=>b.item===target.item)};
  g.clock=target.appearedAt+5;view.draw();
  const after=view.drawn.find(t=>t.text==='ordpar'),hint=view.drawn.find(t=>t.text==='svar'),boxAfter=view.boxes.find(b=>b.item===target.item);
  try{
    assert(after&&hint,name+' missing text');assert(hint.y>after.y);assert(boxAfter.h>boxBefore.h);
    assert(Math.abs(after.x-before.x)<.001&&Math.abs(after.y-before.y)<.001,`main moved (${after.x-before.x}, ${after.y-before.y})`);
    assert(Math.abs(boxAfter.y-boxBefore.y)<.001,'box grew upward');
    assert(hint.y+hint.size/2<=boxAfter.y+boxAfter.h,'hint clipped at bottom');
    assert(Math.abs(after.y-boxAfter.y-before.y+boxBefore.y)<.001,'empty space added above word');
  }catch(error){failures.push(name+'/'+width+'/'+mode+': '+error.message);}
}
assert.deepEqual(failures,[]);
// Multiple requests share one garden bubble. Revealing an earlier row must
// not push the following words downward, including staggered hint times.
for(const width of [370,1100]){
  const {g}=setup('Garden',width,'swedish-synonyms'),pot=g.pots[0];
  Object.assign(pot,{moisture:.4,nutrition:.4,infection:.6});g.syncRequests(pot);
  const targets=Object.values(pot.requests);assert.equal(targets.length,3);
  targets.forEach((t,i)=>{t.item={...t.item,label:'ordpar'+i,answer:'svar'+i,hint:'svar'+i};t.appearedAt=i;});
  g.clock=0;const view=renderer('Garden',g);view.draw();const before=targets.map(t=>({...view.drawn.find(d=>d.text===t.item.label)}));
  for(const clock of [5,6,7]){g.clock=clock;view.draw();targets.forEach((t,i)=>{
    const after=view.drawn.find(d=>d.text===t.item.label);assert(Math.abs(after.x-before[i].x)<.001&&Math.abs(after.y-before[i].y)<.001,'stacked garden word moved');
  });}
}
const {g,target}=setup('City',1100,'swedish-synonyms'),{r}=renderer('City',g);
r.keepLabel(target,{x:270,y:270},{x:250,y:250,w:40,h:24});
const moved=r.stableLabel(target,{x:280,y:290},100,40);
assert.equal(moved.x+moved.w/2,280);assert.equal(moved.y,270,'main word follows target movement while the hint grows downward');
console.log('PASS one-sided hint growth and stable screen-space word positions in all nine games.');
