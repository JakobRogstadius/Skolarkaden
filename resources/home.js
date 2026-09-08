/* Städa hemmet: a finite family afternoon, with physical routes and household jobs. */
(function(root){
'use strict';
const SC=root.Starlight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),TAU=Math.PI*2,CELL=.25;
const TYPES={clothes:{name:'Plocka kläder',icon:'shirt'},toys:{name:'Plocka leksaker',icon:'toy'},dishes:{name:'Diska',icon:'plate'},laundry:{name:'Tvätta',icon:'basket'},trash:{name:'Töm soporna',icon:'bin'},cabinet:{name:'Stäng skåpet',icon:'door'},drawer:{name:'Stäng lådan',icon:'drawer'},fridge:{name:'Stäng kylskåpet',icon:'fridge'},hungry:{name:'Laga mat',icon:'food'}};
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
  {id:'sideboard',type:'sideboard',x:.38,y:3.43,w:1.35,d:.62,h:.85,color:'#a9b599'},
  {id:'sofa',type:'sofa',x:7.05,y:.42,w:3.3,d:1.15,h:.95,color:'#c98973'},
  {id:'coffee',type:'coffee',x:8.1,y:2.05,w:1.65,d:.95,h:.4,color:'#c7a17e'},
  {id:'tv',type:'tv',x:10.85,y:1.75,w:.7,d:1.7,h:.56,color:'#c8aa83'},
  {id:'shelf',type:'shelf',x:10.85,y:.35,w:.7,d:1.05,h:1.75,color:'#b79575'},
  {id:'toybox',type:'toybox',x:7.05,y:3.55,w:.8,d:.55,h:.5,color:'#93b3a3'},
  {id:'double',type:'bed',x:.5,y:4.8,w:2.65,d:3.05,h:.58,color:'#92ae98',double:true},
  {id:'bedside',type:'nightstand',x:3.5,y:7.55,w:.55,d:.55,h:.57,color:'#c8a47d'},
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
 menu(){this.detachQueue();Object.assign(this,{state:'menu',clock:0,elapsed:0,score:0,hits:0,shots:0,streak:0,bestStreak:0,cleaned:0,familyCleaned:0,nextId:0,messes:[],people:[],job:null,closing:false,helping:false,angerLeft:0,angerAge:0,angerCount:0,celebration:0,answerLocks:new Map(),effects:[],roomCounts:{}});}
 resize(width,height){Object.assign(this,{width,height});}
 start({mode='swedish',pace='gentle',lang='sv-SE',items=null,uppercase=Math.random()<.5}={}){
  this.menu();Object.assign(this,{mode,pace,lang,uppercase});this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Välj en övning med minst ett svar.');
  this.children={gentle:1,steady:2,brave:3}[pace];this.total=40;this.layout=apartment(this.children);this.buildNavigation();this.timeScale=SC.isMath(mode)?1.5:1;
  this.roomCounts=Object.fromEntries([...this.layout.rooms.map(r=>r.id),'hall'].map(id=>[id,0]));
  this.playerSpeed=3.15;this.walkSpeed=1.3;this.helpSpeed=3.8;
  this.stations={
   dishes:{type:'dishes',furniture:'counter',x:2.15,y:1.75,anchor:{x:2.4,y:.86,z:1.24}},
   dishesRight:{type:'dishes',furniture:'counter',x:4.15,y:1.75,anchor:{x:4.67,y:.86,z:1.24}},
   dishesSide:{type:'dishes',furniture:'sideboard',x:2.05,y:3.75,anchor:{x:1.03,y:3.73,z:.98}},
   laundry:{type:'laundry',x:8.45,y:12.25,anchor:{x:7.55,y:12.3,z:.9},threshold:3},
   trash:{type:'trash',x:4.55,y:2.08,anchor:{x:4.77,y:1.56,z:.85},threshold:3},
   cabinet:{type:'cabinet',furniture:'wardrobe',x:3.65,y:6.2,anchor:{x:4.5,y:6.1,z:1.1}},
   kitchenCabinet:{type:'cabinet',furniture:'counter',x:2.75,y:1.75,anchor:{x:2.6,y:1.22,z:.5}},
   bedsideDrawer:{type:'drawer',furniture:'bedside',x:3.8,y:8.6,anchor:{x:3.775,y:8.2,z:.4}},
   deskDrawer:{type:'drawer',furniture:'desk',x:9.65,y:8.0,anchor:{x:10.3,y:8.9,z:.45}},
   fridge:{type:'fridge',furniture:'fridge',x:1.65,y:2.85,anchor:{x:.8,y:2.8,z:1.25}}
  };
  for(const [id,s] of Object.entries(this.stations))Object.assign(s,{id,fill:0,task:null,items:[],threshold:s.threshold||1});
  this.seats=[{x:2.05,y:2.85},{x:3.25,y:3.85},{x:4.65,y:2.9},{x:2.5,y:3.85}];
  this.placeSettings=[{x:2.65,y:2.7,z:.8},{x:3.05,y:3.12,z:.8},{x:3.9,y:2.7,z:.8},{x:3.75,y:3.12,z:.8}];
  this.spots={clothes:[{x:3.65,y:6.65},{x:4.45,y:8.45},{x:7.55,y:7.55},{x:11.1,y:7.6},{x:3.2,y:10.35},{x:1.6,y:10.45},{x:8.4,y:11.0},{x:10,y:11.4}],toys:[{x:7.65,y:2.5},{x:9.5,y:3.6},{x:8.3,y:8.5},{x:9.35,y:7.55},{x:10.3,y:7.3},{x:10.1,y:1.7},{x:4.4,y:10.8},{x:2.4,y:11.25}]};
  for(const spots of Object.values(this.spots))for(const spot of spots)Object.assign(spot,this.nearest(spot));
  const parents=this.makeParents();
  this.people=Array.from({length:this.children+2},(_,i)=>{
   const look=i<2?parents[i]:SC.makeChild(this.random);look.hat=false;
   const p={id:i,player:i===0,look,x:i===0?6:i===1?7.7:7.6+(i-2)*1.35,y:i===0?10.45:i===1?3.5:7.55,path:[],goalKey:'',activity:null,job:null,meal:null,hungry:null,wait:i*.9,phase:this.random()*TAU,moving:false,age:0,fear:0,carry:null};
   Object.assign(p,this.nearest(p));return p;
  });this.player=this.people[0];this.player.look.shirt='#729da5';this.player.look.pants='#385059';
  // The first snack opens a real fridge door; dishes only follow food and a trip back.
  Object.assign(this.people[1],this.nearest(this.stations.fridge));this.people[1].activity={type:'snack',stationId:'fridge',goal:this.stations.fridge,stage:'use',age:0,duration:1.4};
  this.changingQueue=false;this.queueListener=()=>{if(!this.changingQueue&&this.state==='playing')this.syncReservations();};this.queue.addEventListener('change',this.queueListener);this.state='playing';this.emit('start');
 }
 makeParents(){
  const firstFemale=this.random()<.5,sameGender=this.random()<.1;
  return [firstFemale,sameGender?firstFemale:!firstFemale].map(female=>{let first=true;return SC.makePerson(()=>{if(first){first=false;return female?.6:.2;}return this.random();});});
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
 familySpeed(p){return this.walkSpeed*(p.look.child?1.5:1);}
 roomFor(position){return this.layout.rooms.find(r=>position.x>=r.x&&position.x<r.x+r.w&&position.y>=r.y&&position.y<r.y+r.d)?.id||'hall';}
 roomLoads(){
  const loads={...this.roomCounts};let laundry=this.stations.laundry.fill,trash=this.stations.trash.fill;
  // Already promised follow-up chores count before choosing another room.
  for(const t of this.messes)if(t.type==='clothes')laundry++;
  for(const p of this.people){
   if(p.meal||p.hungry)loads.kitchen++;
   const a=p.activity;if(!a)continue;
   if(a.type==='laundry')laundry++;else if(a.type==='trash')trash++;
   else{loads[this.roomFor(a.goal)]++;if(a.type==='clothes')laundry++;if(a.type==='hungry'||a.type==='snack')loads.kitchen++;}
  }
  // Clothes delivered during the same wash form one pile, even above three items.
  loads.bath+=Number(laundry>0&&!this.stations.laundry.task);
  loads.kitchen+=Number(trash>0&&!this.stations.trash.task);return loads;
 }
 getTargets(){return this.messes.filter(t=>!t.done&&(t.owner===null||t.owner===0)).sort((a,b)=>a.id-b.id);}
 getAvailableTargets(){return this.getTargets().filter(t=>t.owner===null);}
 getActiveEntries(){return this.player?.job?.entry?[this.player.job.entry]:[];}
 reservations(){const free=[...this.getAvailableTargets()],map=new Map();for(const entry of this.queue.items){const i=free.findIndex(t=>SC.matches(entry.text,t.item,this.mode,this.lang,entry.source));if(i>=0)map.set(free.splice(i,1)[0],entry);}return map;}
 syncReservations(){for(const [target,entry] of this.reservations()){const lock=this.answerLocks.get(entry);if(!lock||lock.target!==target)this.answerLocks.set(entry,{target,at:this.clock});}}
 getTaskStates(){const states=new Map();if(this.player?.job?.target&&!this.player.job.target.done)states.set(this.player.job.target,'active');for(const t of this.reservations().keys())states.set(t,'queued');return states;}
 workerStatus(){return this.helping?'Alla hjälps åt':this.player?.job?'Städar hemma':'Redo att hjälpa till';}
 createTask(type,position,extra={}){
  const choices=SC.practiceItems(this),used=this.messes.filter(t=>!t.done).map(t=>t.item.answer),unused=choices.filter(i=>!used.includes(i.answer)),pool=unused.length?unused:choices,base=pool[Math.floor(this.random()*pool.length)];
  const item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);
  const t={id:++this.nextId,type,...this.nearest(position),item,appearedAt:this.clock,owner:null,done:false,phase:this.random()*TAU,...extra};t.room=this.roomFor(t.anchor||t.station?.anchor||t);this.roomCounts[t.room]++;this.messes.push(t);this.emit('need',{target:t});return t;
 }
 addToStation(id,amount=1,kind='plate'){const s=this.stations[id];s.fill+=amount;if(s.type==='dishes')for(let i=0;i<amount;i++)s.items.push(kind);if(!s.task&&(s.fill>=s.threshold||this.closing&&s.fill>0))s.task=this.createTask(s.type,s,{station:s});return s.task;}
 requestFood(p){if(p.hungry||p.meal)return null;const index=(p.id-1+this.seats.length)%this.seats.length;p.hungry=this.createTask('hungry',this.seats[index],{person:p,anchor:{...this.placeSettings[index]}});this.emit('home-hungry');return p.hungry;}
 taskPosition(t){return t.anchor||t.station?.anchor||t;}
 takeFamilyTask(p,t){
  // Resolve reservations before hiding the target. Remove just its one entry,
  // preserving any other target (including a homophone) using the same answer.
  const entry=this.reservations().get(t);t.owner=p.id;
  if(entry){this.queue.items=this.queue.items.filter(e=>e!==entry);this.answerLocks.delete(entry);this.queue.changed();}
  p.activity=null;p.carry=null;this.suspendMeal(p);this.clearRoute(p);p.job={target:t,stage:'walk',age:0,entry:null,points:0};this.syncReservations();
 }
 assignHelp(p){const choices=this.messes.filter(t=>!t.done&&t.owner===null);if(!choices.length)return false;
  choices.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)||a.id-b.id);this.takeFamilyTask(p,choices[0]);return true;
 }
 becomeAngry(){
  this.angerLeft=1.2;this.angerAge=0;this.angerCount++;this.helping=true;this.emit('home-anger');
  for(const p of this.people.slice(1)){p.fear=1;p.activity=null;this.clearRoute(p);if(!p.job)this.assignHelp(p);}
 }
 taskGoal(t,stage){if(stage==='deliver')return this.stations.laundry;if(t.type==='hungry')return {x:3.65,y:1.75};if(t.type==='laundry'&&stage==='machine')return {x:10.2,y:12};return t;}
 work(p,dt){
  if(p.player&&this.helping)return;
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
   if(this.go(p,this.taskGoal(t,j.stage),speed,dt)){j.stage=j.stage==='walk'?'clean':'finish';j.age=0;p.moving=false;if(j.stage==='clean')this.emit(t.type==='hungry'?'home-cook':t.type==='dishes'?'home-wash':t.type==='clothes'||t.type==='toys'?'home-rustle':'home-handle');}
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
  if(t.station?.task===t){t.station.fill=0;t.station.task=null;t.station.items=[];}
  if(['cabinet','drawer','fridge'].includes(t.type))this.emit('home-shut');
  if(t.type==='clothes')this.addToStation('laundry');
  if(t.type==='hungry'){t.person.hungry=null;this.startMeal(t.person,'cooked');}
  this.messes=this.messes.filter(t=>!t.done);
  if(this.cleaned>=this.total&&!this.closing)this.beginClosing();
 }
 stationFree(id,p){const s=this.stations[id];return !s.task&&s.fill<s.threshold&&!this.people.some(other=>other!==p&&other.activity?.stationId===id);}
 spotFree(goal,p){return !this.messes.some(t=>['clothes','toys'].includes(t.type)&&Math.hypot(t.x-goal.x,t.y-goal.y)<.65)&&!this.people.some(other=>other!==p&&['clothes','toys'].includes(other.activity?.type)&&Math.hypot(other.activity.goal.x-goal.x,other.activity.goal.y-goal.y)<.65);}
 activityChoices(p){
  const choices=[];
  for(const type of ['clothes','toys'])for(const goal of this.spots[type])if(this.spotFree(goal,p))choices.push({type,goal});
  for(const [stationId,s] of Object.entries(this.stations))if(s.type!=='dishes'&&this.stationFree(stationId,p)){
   if(s.type==='fridge'){if(!p.hungry&&!p.meal)choices.push({type:'snack',stationId,goal:s});}
   else choices.push({type:s.type,stationId,goal:s});
  }
  if(!p.hungry&&!p.meal)choices.push({type:'hungry',goal:this.seats[(p.id-1)%this.seats.length]});
  return choices;
 }
 chooseActivity(p){
  // Balance all five rooms and the hallway, including jobs already on the way.
  const available=this.activityChoices(p),loads=this.roomLoads(),minimum=Math.min(...available.map(a=>loads[this.roomFor(a.goal)]));
  const groups=new Map();for(const choice of available.filter(a=>loads[this.roomFor(a.goal)]<=minimum+.01)){if(!groups.has(choice.type))groups.set(choice.type,[]);groups.get(choice.type).push(choice);}
  const kinds=[...groups.keys()];if(p.look.child&&groups.has('toys'))kinds.push('toys');if(!kinds.length)return false;
  const choices=groups.get(kinds[Math.floor(this.random()*kinds.length)]),a=choices[Math.floor(this.random()*choices.length)];
  p.activity={...a,stage:'walk',age:0,duration:(1.1+this.random()*1.5)*this.timeScale};this.clearRoute(p);return true;
 }
 startMeal(p,kind){p.activity=null;p.meal={kind,stage:kind==='cooked'?'collect':'walk',age:0,seat:this.seats[(p.id-1+this.seats.length)%this.seats.length],bench:null};this.clearRoute(p);}
 suspendMeal(p){if(p.meal){p.meal.stage=p.meal.stage==='collect'?'collect':['walk','eat'].includes(p.meal.stage)?'walk':'return';p.meal.age=0;p.meal.bench=null;}}
 dishBench(p){
  const choices=Object.values(this.stations).filter(s=>s.type==='dishes'&&(s.task?.owner??null)===null&&!this.people.some(other=>other!==p&&other.meal?.bench===s));
  choices.sort((a,b)=>Number(!!a.task)-Number(!!b.task)||Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));return choices[0]||null;
 }
 updateMeal(p,dt){
  const meal=p.meal;
  if(meal.stage==='collect'){if(this.go(p,{x:3.65,y:1.75},this.familySpeed(p),dt)){meal.age+=dt;if(meal.age>=.45){meal.stage='walk';meal.age=0;this.clearRoute(p);}}return;}
  if(meal.stage==='walk'){if(this.go(p,meal.seat,this.familySpeed(p),dt)){meal.stage='eat';meal.age=0;this.clearRoute(p);}return;}
  if(meal.stage==='eat'){meal.age+=dt;if(meal.age>=3.2){meal.stage='return';meal.age=0;this.clearRoute(p);}return;}
  // A bench being washed cannot swallow a newly delivered container or plate.
  if(!meal.bench||(meal.bench.task?.owner??null)!==null){meal.bench=this.dishBench(p);meal.stage='return';meal.age=0;this.clearRoute(p);}if(!meal.bench)return;
  if(meal.stage==='return'){if(this.go(p,meal.bench,this.familySpeed(p),dt)){meal.stage='drop';meal.age=0;this.clearRoute(p);}return;}
  meal.age+=dt;if(meal.age>=.6){this.addToStation(meal.bench.id,1,meal.kind==='snack'?'container':'plate');this.emit(meal.kind==='snack'?'home-container':'home-plate');p.meal=null;p.wait=2*this.timeScale;this.clearRoute(p);}
 }
 updateFamily(p,dt){
  p.fear=Math.max(0,p.fear-dt*(this.angerLeft?0:.22));
  if(p.job){this.work(p,dt);return;}
  if(this.helping)return;
  if(this.closing){if(this.assignHelp(p)){this.work(p,dt);return;}}
  if(p.meal){this.updateMeal(p,dt);return;}
  if(this.closing)return;
  if(p.wait>0&&this.messes.length>4){p.wait=Math.max(0,p.wait-dt);return;}p.wait=0;if(!p.activity&&!this.chooseActivity(p))return;
  const a=p.activity;if(a.stationId&&!this.stationFree(a.stationId,p)){p.activity=null;this.clearRoute(p);return;}
  if(a.stage==='walk'){if(this.go(p,a.goal,this.familySpeed(p),dt)){a.stage='use';a.age=0;p.moving=false;}return;}
  a.age+=dt;if(a.age<a.duration)return;
  if(a.type==='clothes'||a.type==='toys'){if(this.spotFree(a.goal,p)){this.createTask(a.type,a.goal);this.emit(a.type==='toys'?'home-toy':'home-rustle');}}
  else if(a.type==='hungry')this.requestFood(p);
  else if(a.type==='snack'){this.addToStation('fridge');this.emit('home-open');this.startMeal(p,'snack');}
  else{this.addToStation(a.stationId);this.emit(['cabinet','drawer'].includes(a.type)?'home-open':'home-rustle');}
  p.activity=null;p.wait=(7+this.random()*6)*this.timeScale;this.clearRoute(p);
 }
 beginClosing(){
  this.closing=true;
  for(const p of this.people.slice(1)){p.activity=null;if(!p.job)this.clearRoute(p);}
  this.flushStations();this.emit('home-together');
 }
 flushStations(){for(const s of Object.values(this.stations))if(s.fill>0&&!s.task)s.task=this.createTask(s.type,s,{station:s});}
 finish(){this.state='celebrating';this.celebration=0;this.player.restAge=0;this.clearRoute(this.player);this.queue.clear();this.detachQueue();this.emit('celebrate');}
 update(dt){
  dt=clamp(dt,0,.05);
  if(this.state==='celebrating'){
   this.clock+=dt;this.celebration+=dt;this.people.forEach(p=>{p.moving=false;p.fear=0;});
   if(this.go(this.player,{x:3.9,y:10.75},this.playerSpeed,dt)){this.player.moving=false;this.player.restAge+=dt;}
   if(this.celebration>=4&&this.player.restAge>=2.5){this.state='won';this.emit('end',{won:true,score:this.score,hits:this.hits,shots:this.shots,cleaned:this.cleaned,familyCleaned:this.familyCleaned,bestStreak:this.bestStreak});}return;
  }
  if(this.state!=='playing')return;this.clock+=dt;this.elapsed+=dt;this.people.forEach(p=>{p.moving=false;p.age+=dt;});this.angerLeft=Math.max(0,this.angerLeft-dt);
  if(this.helping){const previous=Math.floor(this.angerAge/.4);this.angerAge+=dt;if(Math.floor(this.angerAge/.4)>previous)this.emit('home-stomp');}
  this.syncReservations();
  if(!this.closing&&!this.helping&&this.messes.length>=7)this.becomeAngry();
  this.work(this.player,dt);for(const p of this.people.slice(1))this.updateFamily(p,dt);
  if(this.helping&&this.people.slice(1).every(p=>!p.job)){this.helping=false;this.angerLeft=0;this.people.slice(1).forEach(p=>p.wait=Math.max(p.wait,1));}
  if(!this.closing&&!this.helping&&this.messes.length>=7)this.becomeAngry();
  if(this.closing){this.flushStations();if(!this.messes.length&&!this.people.some(p=>p.meal||p.job))this.finish();}
 }
}
SC.HomeGame=HomeGame;SC.homeTaskTypes=TYPES;
})(globalThis);
