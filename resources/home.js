/* Städa hemmet: a finite family afternoon, with physical routes and household jobs. */
(function(root){
'use strict';
const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),TAU=Math.PI*2,CELL=.25;
const TYPES={clothes:{name:'Plocka kläder',icon:'shirt'},toys:{name:'Plocka leksaker',icon:'toy'},dishes:{name:'Diska',icon:'plate'},laundry:{name:'Tvätta',icon:'basket'},trash:{name:'Töm soporna',icon:'bin'},cabinet:{name:'Stäng skåpet',icon:'door'},hungry:{name:'Laga mat',icon:'food'}};
function apartment(children){
 const rooms=[{id:'kitchen',x:0,y:0,w:5.4,d:4.5,color:'#e8d6af'},{id:'living',x:6.6,y:0,w:5.4,d:4.5,color:'#d8ddd0'},{id:'parents',x:0,y:4.5,w:5.4,d:4.8,color:'#e4c9bf'},{id:'children',x:6.6,y:4.5,w:5.4,d:4.8,color:'#e7dcb5'},{id:'bath',x:6.6,y:9.3,w:5.4,d:3.7,color:'#bfd4d3'}];
 const walls=[{x:0,y:0,w:12,d:.12,tall:true},{x:0,y:0,w:.12,d:13,tall:true},{x:11.88,y:0,w:.12,d:13},{x:0,y:12.88,w:4.7,d:.12},{x:6.4,y:12.88,w:5.6,d:.12}];
 const wall=(x,y,w,d)=>walls.push({x,y,w,d});
 for(const x of [5.3,6.5]){wall(x,0,.2,2.65);wall(x,3.85,.2,2.6);wall(x,7.65,.2,1.65);}
 wall(6.5,9.3,.2,1.5);wall(6.5,12,.2,1);
 for(const y of [4.4,9.2]){wall(0,y,5.3,.2);wall(6.7,y,5.3,.2);}
 const furniture=[
  {id:'counter',type:'counter',x:.35,y:.3,w:4.65,d:.9,h:1.05,color:'#92aa95'},
  {id:'fridge',type:'fridge',x:.35,y:1.55,w:.85,d:1.2,h:1.95,color:'#dfddd1'},
  {id:'dining',type:'table',x:2.4,y:2.3,w:1.75,d:1.05,h:.76,color:'#ca9f70'},
  {id:'bin',type:'bin',x:4.55,y:1.3,w:.42,d:.5,h:.7,color:'#8eaaa3'},
  {id:'sofa',type:'sofa',x:7.05,y:.42,w:3.3,d:1.15,h:.95,color:'#c98973'},
  {id:'coffee',type:'coffee',x:8.1,y:2.05,w:1.65,d:.95,h:.4,color:'#c7a17e'},
  {id:'tv',type:'tv',x:10.85,y:1.75,w:.7,d:1.7,h:.56,color:'#c8aa83'},
  {id:'shelf',type:'shelf',x:10.85,y:.35,w:.7,d:1.05,h:1.75,color:'#b79575'},
  {id:'toybox',type:'toybox',x:7.05,y:3.55,w:.8,d:.55,h:.5,color:'#93b3a3'},
  {id:'double',type:'bed',x:.5,y:4.8,w:2.65,d:3.05,h:.58,color:'#92ae98',double:true},
  {id:'bedside',type:'nightstand',x:3.35,y:4.85,w:.55,d:.55,h:.57,color:'#c8a47d'},
  {id:'wardrobe',type:'wardrobe',x:4.1,y:4.85,w:.88,d:1.25,h:1.8,color:'#c4ad90'},
  {id:'desk',type:'desk',x:9.95,y:8.25,w:1.6,d:.65,h:.68,color:'#bcaa87'},
  {id:'shower',type:'shower',x:7.0,y:9.6,w:1.35,d:1.25,h:.18,color:'#eceddf'},
  {id:'basin',type:'basin',x:8.85,y:9.6,w:1.35,d:.65,h:.82,color:'#a5b9ae'},
  {id:'toilet',type:'toilet',x:10.95,y:9.6,w:.65,d:1.3,h:.6,color:'#f1efe1'},
  {id:'washer',type:'washer',x:10.75,y:11.65,w:.9,d:.9,h:.98,color:'#e9e8dd'},
  {id:'basket',type:'basket',x:7.15,y:12.0,w:.8,d:.62,h:.72,color:'#c5a471'},
  {id:'shoes',type:'shoeRack',x:.5,y:11.95,w:2.3,d:.5,h:.4,color:'#bd9b73'},
  {id:'coats',type:'coats',x:.4,y:10,w:.6,d:1.25,h:1.55,color:'#baa084'}
 ];
 for(let i=0;i<children;i++)furniture.push({id:'child-bed-'+i,type:'bed',x:7.0+(4.5-(children*1.15+(children-1)*.35))/2+i*1.5,y:4.8,w:1.15,d:2.15,h:.5,color:['#e3bc64','#aaa0cc','#85b4b4'][i],child:true});
 return {rooms,walls,furniture,width:12,depth:13};
}
class HomeGame{
 constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random,width:1000,height:760});this.menu();}
 emit(type,detail={}){this.onEvent({type,...detail});}
 detachQueue(){if(this.queueListener)this.queue.removeEventListener('change',this.queueListener);this.queueListener=null;}
 menu(){this.detachQueue();Object.assign(this,{state:'menu',clock:0,elapsed:0,score:0,hits:0,shots:0,streak:0,bestStreak:0,cleaned:0,familyCleaned:0,nextId:0,messes:[],people:[],job:null,closing:false,helping:false,angerLeft:0,angerCount:0,celebration:0,answerLocks:new Map(),effects:[]});}
 resize(width,height){Object.assign(this,{width,height});}
 start({mode='swedish',pace='gentle',lang='sv-SE',items=null,uppercase=Math.random()<.5}={}){
  this.menu();Object.assign(this,{mode,pace,lang,uppercase});this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Välj en övning med minst ett svar.');
  this.children={gentle:1,steady:2,brave:3}[pace];this.total=40;this.layout=apartment(this.children);this.buildNavigation();this.timeScale=SC.isMath(mode)?1.5:1;
  this.playerSpeed=3.15;this.walkSpeed=1.3;this.helpSpeed=3.8;
  this.stations={dishes:{x:1.8,y:1.7,anchor:{x:2.29,y:.86,z:1.35},fill:0,threshold:1,task:null},laundry:{x:8.45,y:12.25,anchor:{x:7.55,y:12.3,z:.9},fill:0,threshold:3,task:null},trash:{x:4.55,y:2.08,anchor:{x:4.77,y:1.56,z:.85},fill:0,threshold:3,task:null},cabinet:{x:3.65,y:6.2,anchor:{x:4.5,y:6.1,z:1.1},fill:0,threshold:1,task:null}};
  this.seats=[{x:2.05,y:2.85},{x:3.25,y:3.85},{x:4.65,y:2.9},{x:2.5,y:3.85}];
  this.spots={clothes:[{x:3.6,y:7.9},{x:4.45,y:8.45},{x:8.1,y:7.6},{x:10.85,y:7.6},{x:3.2,y:10.35}],toys:[{x:7.7,y:2.8},{x:9.3,y:3.6},{x:8.3,y:8.3},{x:9.2,y:7.5},{x:10.6,y:7.65}]};
  this.people=Array.from({length:this.children+2},(_,i)=>{
   let first=true;const look=i<2?SC.makePerson(()=>{if(first){first=false;return this.random()*.8;}return this.random();}):SC.makeChild(this.random);look.hat=false;
   const p={id:i,player:i===0,look,x:i===0?6:i===1?7.7:7.6+(i-2)*1.35,y:i===0?10.45:i===1?3.5:7.55,path:[],goalKey:'',activity:null,job:null,meal:null,hungry:null,wait:i*.9,phase:this.random()*TAU,moving:false,age:0,fear:0,carry:null};
   Object.assign(p,this.nearest(p));return p;
  });this.player=this.people[0];this.player.look.shirt='#729da5';this.player.look.pants='#385059';
  // Someone is finishing breakfast: the first job appears within three seconds.
  Object.assign(this.people[1],this.nearest(this.seats[0]));this.people[1].activity={type:'dishes',goal:this.seats[0],stage:'use',age:0,duration:1.8};
  this.changingQueue=false;this.queueListener=()=>{if(!this.changingQueue&&this.state==='playing')this.syncReservations();};this.queue.addEventListener('change',this.queueListener);this.state='playing';this.emit('start');
 }
 pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
 // One shared physical floor plan. Door openings and furniture affect every actor.
 walkable(p){
  const r=.17;if(p.x<r+.12||p.y<r+.12||p.x>12-r-.12||p.y>13-r-.12)return false;
  return ![...this.layout.walls,...this.layout.furniture].some(b=>p.x>b.x-r&&p.x<b.x+b.w+r&&p.y>b.y-r&&p.y<b.y+b.d+r);
 }
 buildNavigation(){this.cols=48;this.rows=52;this.cells=[];this.cellMap=new Map();for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){const p={x:(x+.5)*CELL,y:(y+.5)*CELL,key:y*this.cols+x};if(this.walkable(p)){this.cellMap.set(p.key,this.cells.length);this.cells.push(p);}}this.neighbours=this.cells.map(p=>[-1,1,-this.cols,this.cols].map(d=>this.cellMap.get(p.key+d)).filter(i=>i!==undefined));}
 nearest(p){let best=this.cells[0],d=Infinity;for(const q of this.cells){const n=(p.x-q.x)**2+(p.y-q.y)**2;if(n<d){best=q;d=n;}}return {x:best.x,y:best.y};}
 route(from,to){
  const a=this.nearest(from),b=this.nearest(to),key=p=>Math.floor(p.y/CELL)*this.cols+Math.floor(p.x/CELL),start=this.cellMap.get(key(a)),end=this.cellMap.get(key(b));
  const prev=new Int32Array(this.cells.length).fill(-1),open=[start];prev[start]=start;
  for(let i=0;i<open.length&&prev[end]===-1;i++)for(const next of this.neighbours[open[i]])if(prev[next]===-1){prev[next]=open[i];open.push(next);}
  if(prev[end]===-1)throw new Error('Ingen väg till hushållsuppgiften.');
  const points=[];for(let n=end;;n=prev[n]){points.unshift({x:this.cells[n].x,y:this.cells[n].y});if(n===start)break;}
  return points.filter((p,i)=>!i||i===points.length-1||(p.x-points[i-1].x)!==(points[i+1].x-p.x)||(p.y-points[i-1].y)!==(points[i+1].y-p.y));
 }
 go(p,goal,speed,dt){
  const key=goal.x.toFixed(3)+','+goal.y.toFixed(3);if(p.goalKey!==key){p.path=this.route(p,goal);p.goalKey=key;}
  let step=speed*dt;p.moving=!!p.path.length;
  while(p.path.length&&step>0){const q=p.path[0],d=Math.hypot(q.x-p.x,q.y-p.y);if(d<=step){p.x=q.x;p.y=q.y;p.path.shift();step-=d;}else{p.x+=(q.x-p.x)*step/d;p.y+=(q.y-p.y)*step/d;step=0;}}
  return !p.path.length;
 }
 clearRoute(p){p.path=[];p.goalKey='';p.moving=false;}
 getTargets(){return this.messes.filter(t=>!t.done&&(t.owner===null||t.owner===0)).sort((a,b)=>a.id-b.id);}
 getAvailableTargets(){return this.getTargets().filter(t=>t.owner===null);}
 getActiveEntries(){return this.player?.job?.entry?[this.player.job.entry]:[];}
 reservations(){const free=[...this.getAvailableTargets()],map=new Map();for(const entry of this.queue.items){const i=free.findIndex(t=>SC.matches(entry.text,t.item,this.mode,this.lang,entry.source));if(i>=0)map.set(free.splice(i,1)[0],entry);}return map;}
 syncReservations(){for(const [target,entry] of this.reservations()){const lock=this.answerLocks.get(entry);if(!lock||lock.target!==target)this.answerLocks.set(entry,{target,at:this.clock});}}
 getTaskStates(){const states=new Map();if(this.player?.job?.target&&!this.player.job.target.done)states.set(this.player.job.target,'active');for(const t of this.reservations().keys())states.set(t,'queued');return states;}
 workerStatus(){return this.angerLeft?'Alla hjälps åt':this.player?.job?'Städar hemma':'Redo att hjälpa till';}
 createTask(type,position,extra={}){
  const choices=SC.practiceItems(this),used=this.messes.filter(t=>!t.done).map(t=>t.item.answer),unused=choices.filter(i=>!used.includes(i.answer)),pool=unused.length?unused:choices,base=pool[Math.floor(this.random()*pool.length)];
  const item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);
  const t={id:++this.nextId,type,...this.nearest(position),item,appearedAt:this.clock,owner:null,done:false,phase:this.random()*TAU,...extra};this.messes.push(t);this.emit('need',{target:t});return t;
 }
 addToStation(type,amount=1){const s=this.stations[type];s.fill+=amount;if(!s.task&&(s.fill>=s.threshold||this.closing&&s.fill>0))s.task=this.createTask(type,s,{station:s});return s.task;}
 requestFood(p){if(p.hungry||p.meal)return null;p.hungry=this.createTask('hungry',p,{person:p});return p.hungry;}
 taskPosition(t){return t.type==='hungry'?{x:t.person.x,y:t.person.y}:t.station?.anchor||t;}
 takeFamilyTask(p,t){
  // Resolve reservations before hiding the target. Remove just its one entry,
  // preserving any other target (including a homophone) using the same answer.
  const entry=this.reservations().get(t);t.owner=p.id;
  if(entry){this.queue.items=this.queue.items.filter(e=>e!==entry);this.answerLocks.delete(entry);this.queue.changed();}
  p.activity=null;p.carry=null;this.clearRoute(p);p.job={target:t,stage:'walk',age:0,entry:null,points:0};this.syncReservations();
 }
 assignHelp(p){const choices=this.messes.filter(t=>!t.done&&t.owner===null);if(!choices.length)return false;
  choices.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)||a.id-b.id);this.takeFamilyTask(p,choices[0]);return true;
 }
 becomeAngry(){
  this.angerLeft=1.2;this.angerCount++;this.helping=true;this.emit('home-anger');
  for(const p of this.people.slice(1)){p.fear=1;p.activity=null;this.clearRoute(p);if(!p.job)this.assignHelp(p);}
 }
 taskGoal(t,stage){if(stage==='deliver')return this.stations.laundry;if(t.type==='hungry')return {x:3.65,y:1.75};if(t.type==='laundry'&&stage==='machine')return {x:10.2,y:12};return t;}
 work(p,dt){
  if(p.player&&this.angerLeft>0)return;
  if(p.player&&!p.job&&this.queue.length){
   this.changingQueue=true;const entry=this.queue.take();this.changingQueue=false;
   if(entry){const target=this.getAvailableTargets().find(t=>SC.matches(entry.text,t.item,this.mode,this.lang,entry.source)),lock=this.answerLocks.get(entry);this.shots++;
    if(target)target.owner=0;p.job={entry,target,stage:target?'walk':'think',age:0,points:0};
    // Bonus is answer age, independent of travel and the FIFO wait.
    if(target){const answeredAt=lock?.target===target?lock.at:this.clock;p.job.points=10+Math.round(10*clamp(1-(answeredAt-target.appearedAt)/10,0,1));}else this.emit('think',{entry});this.clearRoute(p);this.syncReservations();
   }
  }
  const j=p.job;if(!j)return;if(p.player)this.job=j;
  if(!j.target){j.age+=dt;if(j.age>=.75){this.emit('miss',{entry:j.entry});p.job=null;this.job=null;}return;}
  const t=j.target;if(t.done){p.job=null;if(p.player)this.job=null;return;}
  const speed=p.player?this.playerSpeed:this.helpSpeed;
  if(['walk','deliver','machine'].includes(j.stage)){
   if(this.go(p,this.taskGoal(t,j.stage),speed,dt)){j.stage=j.stage==='walk'?'clean':'finish';j.age=0;p.moving=false;}
   return;
  }
  j.age+=dt;const duration=t.type==='hungry'?1.65:t.type==='laundry'?1.2:t.type==='dishes'?1:.55;
  if(j.age<duration)return;
  if(j.stage==='clean'&&t.type==='clothes'){j.stage='deliver';p.carry='clothes';this.clearRoute(p);return;}
  if(j.stage==='clean'&&t.type==='laundry'){t.station.fill=0;t.station.task=null;j.stage='machine';p.carry='laundry';this.clearRoute(p);return;}
  this.completeTask(p,t,j);
 }
 completeTask(p,t,j){
  if(t.done)return;t.done=true;p.job=null;p.carry=null;this.clearRoute(p);if(p.player)this.job=null;
  this.cleaned++;if(p.player){this.hits++;this.score+=j.points;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);this.emit('hit',{entry:j.entry,target:t,points:j.points});}else{this.familyCleaned++;this.emit('home-help',{target:t});}
  if(t.station?.task===t){t.station.fill=0;t.station.task=null;}
  if(t.type==='clothes')this.addToStation('laundry');
  if(t.type==='hungry'){const person=t.person;person.hungry=null;person.meal={stage:'walk',age:0,seat:this.seats[(person.id-1+this.seats.length)%this.seats.length]};this.clearRoute(person);}
  this.messes=this.messes.filter(t=>!t.done);
  if(this.cleaned>=this.total&&!this.closing)this.beginClosing();
 }
 chooseActivity(p){
  const routine=p.look.child?['toys','toys','clothes','laundry','dishes','trash','hungry','cabinet']:['clothes','laundry','cabinet','trash','dishes','hungry'],kinds=p.hungry?routine.filter(k=>!['hungry','dishes'].includes(k)):routine,type=kinds[Math.floor(this.random()*kinds.length)];
  let goal;if(type==='clothes'||type==='toys')goal=this.spots[type][Math.floor(this.random()*this.spots[type].length)];else if(type==='dishes'||type==='hungry')goal=this.seats[(p.id-1)%this.seats.length];else goal=this.stations[type];
  p.activity={type,goal,stage:'walk',age:0,duration:1.1+this.random()*1.5};this.clearRoute(p);
 }
 updateFamily(p,dt){
  p.fear=Math.max(0,p.fear-dt*(this.angerLeft?0:.22));
  if(p.job){this.work(p,dt);return;}
  if(this.closing){if(this.assignHelp(p)){this.work(p,dt);return;}}
  if(p.meal){const meal=p.meal;if(meal.stage==='walk'){if(this.go(p,meal.seat,this.walkSpeed,dt)){meal.stage='eat';meal.age=0;}}else{meal.age+=dt;if(meal.age>=3.2){p.meal=null;this.addToStation('dishes');p.wait=2;this.clearRoute(p);}}return;}
  if(this.closing||this.helping)return;
  if(p.wait>0){p.wait-=dt;return;}if(!p.activity)this.chooseActivity(p);
  const a=p.activity;if(a.stage==='walk'){if(this.go(p,a.goal,this.walkSpeed,dt)){a.stage='use';a.age=0;p.moving=false;}return;}
  a.age+=dt;if(a.age<a.duration)return;
  if(a.type==='clothes'||a.type==='toys'){const at=this.nearest({x:p.x+(this.random()-.5)*.6,y:p.y+(this.random()-.5)*.6});if(!this.messes.some(t=>t.type===a.type&&Math.hypot(t.x-at.x,t.y-at.y)<.35))this.createTask(a.type,at);}
  else if(a.type==='hungry')this.requestFood(p);else this.addToStation(a.type);
  p.activity=null;p.wait=(7+this.random()*6)*this.timeScale;this.clearRoute(p);
 }
 beginClosing(){
  this.closing=true;this.helping=false;this.angerLeft=0;
  for(const p of this.people.slice(1)){p.activity=null;if(!p.job)this.clearRoute(p);}
  this.flushStations();this.emit('home-together');
 }
 flushStations(){for(const [type,s] of Object.entries(this.stations))if(s.fill>0&&!s.task)s.task=this.createTask(type,s,{station:s});}
 finish(){this.state='celebrating';this.celebration=0;this.player.restAge=0;this.clearRoute(this.player);this.queue.clear();this.detachQueue();this.emit('celebrate');}
 update(dt){
  dt=clamp(dt,0,.05);
  if(this.state==='celebrating'){
   this.clock+=dt;this.celebration+=dt;this.people.forEach(p=>{p.moving=false;p.fear=0;});
   if(this.go(this.player,{x:3.9,y:10.75},this.playerSpeed,dt)){this.player.moving=false;this.player.restAge+=dt;}
   if(this.celebration>=4&&this.player.restAge>=2.5){this.state='won';this.emit('end',{won:true,score:this.score,hits:this.hits,shots:this.shots,cleaned:this.cleaned,familyCleaned:this.familyCleaned,bestStreak:this.bestStreak});}return;
  }
  if(this.state!=='playing')return;this.clock+=dt;this.elapsed+=dt;this.people.forEach(p=>{p.moving=false;p.age+=dt;});this.angerLeft=Math.max(0,this.angerLeft-dt);
  this.syncReservations();
  if(!this.closing&&!this.helping&&this.messes.length>=7)this.becomeAngry();
  this.work(this.player,dt);for(const p of this.people.slice(1))this.updateFamily(p,dt);
  if(this.helping&&this.angerLeft===0&&this.people.slice(1).every(p=>!p.job)){this.helping=false;this.people.slice(1).forEach(p=>p.wait=Math.max(p.wait,1));}
  if(!this.closing&&!this.helping&&this.messes.length>=7)this.becomeAngry();
  if(this.closing){this.flushStations();if(!this.messes.length&&!this.people.some(p=>p.meal||p.job))this.finish();}
 }
}
SC.HomeGame=HomeGame;SC.homeTaskTypes=TYPES;
})(globalThis);
