/* Calm painting practice. Questions buy paint; there is no score or end state. */
(function(root){
'use strict';const SC=root.Starlight;
const colors=[['Svart','#263238'],['Vit','#ffffff'],['Röd','#e64b4b'],['Orange','#f39b36'],['Gul','#f4cf45'],['Grön','#409a64'],['Blå','#4088ce'],['Lila','#9662ba']];
const tools=[{id:'small',name:'Liten pensel',size:8},{id:'large',name:'Stor pensel',size:28},{id:'bucket',name:'Färghink',size:0}];
class StudioGame{
 constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random,state:'menu',revision:0});}
 emit(type){this.onEvent({type});}
 start({mode='letters',pace='gentle',lang='sv-SE',items=null,uppercase=false}={}){
  Object.assign(this,{mode,pace,lang,uppercase,clock:0,state:'playing',color:0,tool:'small',paint:0,pending:null,targets:[],message:'Välj en färg eller pensel och svara på uppgiften för att fylla på färg.'});
  this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Övningen behöver minst ett svar.');this.queue.clear();this.revision++;
 }
 getTargets(){return this.targets;}getAvailableTargets(){return this.targets;}getActiveEntries(){return [];}getTaskStates(){return new Map();}
 canAnswer(){return this.state==='playing'&&!!this.pending;}
 choose(type,value){
  if(this.state!=='playing'||!(type==='color'?Number.isInteger(value)&&colors[value]:type==='tool'&&tools.some(t=>t.id===value)))return;
  const base=this.items[Math.floor(this.random()*this.items.length)],item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};
  item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);
  this.pending={type,value};this.targets=[{item,appearedAt:this.clock}];this.queue.clear();
  this.message='Svara för att välja '+(type==='color'?colors[value][0].toLowerCase():tools.find(t=>t.id===value).name.toLowerCase())+' och fylla på färg.';
  this.revision++;this.emit('studio-question');
 }
 cancelQuestion(){this.pending=null;this.targets=[];this.queue.clear();this.message=this.paint?'Fortsätt måla.':'Välj en färg eller pensel för att fylla på.';this.revision++;this.emit('studio-ready');}
 consume(amount){this.paint=Math.max(0,this.paint-amount);if(this.paint<1e-8)this.paint=0;if(!this.paint)this.message='Färgen är slut. Välj färgen eller verktyget igen och svara för att fylla på.';this.revision++;}
 pause(){if(this.state==='playing'){this.state='paused';this.queue.clear();this.revision++;this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.revision++;this.emit('resume');}}
 menu(){this.state='menu';this.queue.clear();}
 update(dt){
  if(this.state!=='playing')return;this.clock+=dt;if(!this.pending||!this.queue.length)return;
  const entry=this.queue.take();if(!entry)return;
  if(!SC.matches(entry.text,this.targets[0].item,this.mode,this.lang,entry.source)){this.message='Försök igen. Ta god tid på dig.';this.revision++;return;}
  this[this.pending.type]=this.pending.value;this.paint=1;this.pending=null;this.targets=[];this.queue.clear();
  this.message='Nu kan du måla!';this.revision++;this.emit('studio-ready');
 }
}
// Iterative four-connected fill: bounded memory, tolerant of antialiasing, no recursion.
function floodFill(image,x,y,hex){
 const {width:w,height:h,data}=image;x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=w||y>=h)return 0;
 const start=(y*w+x)*4,old=Array.from(data.subarray(start,start+3)),color=hex.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16));
 if(old.every((v,i)=>Math.abs(v-color[i])<=24))return 0;
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=1,count=0;queue[0]=y*w+x;seen[queue[0]]=1;
 while(head<tail){const p=queue[head++],i=p*4;if(old.some((v,k)=>Math.abs(v-data[i+k])>40))continue;
  data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;count++;
  const add=n=>{if(!seen[n]){seen[n]=1;queue[tail++]=n;}};
  if(p%w)add(p-1);if(p%w<w-1)add(p+1);if(p>=w)add(p-w);if(p<w*(h-1))add(p+w);
 }return count;
}
SC.StudioGame=StudioGame;SC.studioColors=colors;SC.studioTools=tools;SC.studioFill=floodFill;
})(globalThis);
