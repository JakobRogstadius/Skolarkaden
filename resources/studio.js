/* Calm painting practice. Questions buy paint; there is no score or end state. */
(function(root){
'use strict';const SC=root.Starlight;
// Rows are light, standard and dark; each column keeps the same hue.
const colors=[
 ['Vit','#ffffff'],['Ljusröd','#f4a6a6'],['Ljusorange','#ffd29a'],['Ljusgul','#fff1a6'],['Ljusgrön','#a4d8ad'],['Ljusblå','#a9d1f4'],['Ljuslila','#d4b5eb'],
 ['Grå','#8d9497'],['Röd','#e64b4b'],['Orange','#f39b36'],['Gul','#f4cf45'],['Grön','#409a64'],['Blå','#4088ce'],['Lila','#9662ba'],
 ['Svart','#263238'],['Mörkröd','#ab2935'],['Mörkorange','#b96518'],['Mörkgul','#b08b19'],['Mörkgrön','#23623f'],['Mörkblå','#245486'],['Mörklila','#613781']
];
const tools=[{id:'small',name:'Liten pensel',size:8},{id:'large',name:'Stor pensel',size:28},{id:'bucket',name:'Färghink',size:0}];
class StudioGame{
 constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random,state:'menu',revision:0});}
 emit(type){this.onEvent({type});}
 start({mode='letters',pace='gentle',lang='sv-SE',items=null,uppercase=false}={}){
  Object.assign(this,{mode,pace,lang,uppercase,clock:0,brushFreeUntil:0,state:'playing',color:14,tool:'small',paint:0,pending:null,targets:[],message:'Välj en färg och svara på uppgiften för att fylla på färg.'});
  this.items=SC.beginPractice(this,items);if(!this.items.length)throw new Error('Övningen behöver minst ett svar.');this.queue.clear();this.revision++;
 }
 getTargets(){return this.targets;}getAvailableTargets(){return this.targets;}getActiveEntries(){return [];}getTaskStates(){return new Map();}
 canAnswer(){return this.state==='playing'&&!!this.pending;}
 brushIsFree(){return this.tool!=='bucket'&&this.clock<this.brushFreeUntil;}
 canPaint(){return this.paint>0||this.brushIsFree();}
 choose(type,value){
  if(this.state!=='playing'||!(type==='color'?Number.isInteger(value)&&colors[value]:type==='tool'&&tools.some(t=>t.id===value)))return;
  // Tools share the remaining paint. Switching does not refill it or replace
  // a colour question that is already waiting for an answer.
  if(type==='tool'){this.tool=value;this.revision++;return;}
  const base=this.items[Math.floor(this.random()*this.items.length)],item=SC.isMath(this.mode)?SC.makeMath(base.answer,this.random,SC.mathLevel(this.mode)):{...base};
  item.label=SC.lessonLabel(item.label,this.mode,this.uppercase);
  this.pending={type,value};this.targets=[{item,appearedAt:this.clock}];this.queue.clear();
  this.message='Svara för att fylla på färg.';
  this.revision++;this.emit('studio-question');
 }
 cancelQuestion(){if(!this.canPaint())return;this.pending=null;this.targets=[];this.queue.clear();this.message='Fortsätt måla.';this.revision++;this.emit('studio-ready');}
 consume(amount){const previous=this.paint;this.paint=Math.max(0,this.paint-amount);if(this.paint<1e-8)this.paint=0;
  if(previous>0&&!this.paint){this.choose('color',this.color);this.message='Färgen är slut. Svara för att fylla på.';}
  this.revision++;
 }
 pause(){if(this.state==='playing'){this.state='paused';this.queue.clear();this.revision++;this.emit('pause');}}
 resume(){if(this.state==='paused'){this.state='playing';this.revision++;this.emit('resume');}}
 menu(){this.state='menu';this.queue.clear();}
 update(dt){
  if(this.state!=='playing')return;const wasFree=this.brushIsFree();this.clock+=dt;
  // The bucket may have emptied the shared paint during the free-brush period.
  if(wasFree&&!this.brushIsFree()&&!this.paint&&!this.pending){this.choose('color',this.color);this.message='Färgen är slut. Svara för att fylla på.';}
  if(!this.pending||!this.queue.length)return;
  const entry=this.queue.take();if(!entry)return;
  if(!SC.matches(entry.text,this.targets[0].item,this.mode,this.lang,entry.source)){this.message='Försök igen. Ta god tid på dig.';this.revision++;return;}
  this[this.pending.type]=this.pending.value;this.paint=1;this.brushFreeUntil=this.clock+15;this.pending=null;this.targets=[];this.queue.clear();
  this.message='Nu kan du måla!';this.revision++;this.emit('studio-ready');
 }
}
// Select a flat region, then replace its colour inside antialiased edge pixels.
// Unlike widening the colour tolerance, this keeps the solid outline intact.
function floodFill(image,x,y,hex){
 const {width:w,height:h,data}=image;x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=w||y>=h)return 0;
 const start=(y*w+x)*4,old=Array.from(data.subarray(start,start+3)),color=hex.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16));
 if(old.every((v,i)=>Math.abs(v-color[i])<=24))return 0;
 const source=data.slice(),seen=new Uint8Array(w*h),queue=new Int32Array(w*h),edges=[];
 const packed=i=>(source[i]<<16)|(source[i+1]<<8)|source[i+2];
 // Brushes are opaque and use this palette. Nearby paint colours identify the
 // ink mixed into an edge, including pale outlines on a dark background.
 const solid=new Set(colors.map(([,hex])=>parseInt(hex.slice(1),16)));solid.add(packed(start));
 let head=0,tail=1,count=0;queue[0]=y*w+x;seen[queue[0]]=1;
 while(head<tail){const p=queue[head++],i=p*4;
  if(old.some((v,k)=>Math.abs(v-source[i+k])>2)){edges.push(p);continue;}
  seen[p]=2;data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;count++;
  const add=n=>{if(!seen[n]){seen[n]=1;queue[tail++]=n;}};
  if(p%w)add(p-1);if(p%w<w-1)add(p+1);if(p>=w)add(p-w);if(p<w*(h-1))add(p+w);
 }
 // A smooth edge is C = a*ink + (1-a)*old. Find the nearby solid ink and
 // substitute the new background component, preserving the ink's coverage.
 // Read only the original pixels so scan order cannot affect the result.
 for(let pass=0,at=0;pass<2;pass++){
  const end=edges.length;
  for(;at<end;at++){
   const p=edges[at],i=p*4,px=p%w,py=Math.floor(p/w),pixel=packed(i);
   // A blend can coincidentally equal another swatch (notably grey on black
   // outlines). Preserve solid paint blocks, rather than every palette match.
   let solidBlock=false;
   if(solid.has(pixel))for(let yy=Math.max(0,py-1);yy<=Math.min(h-2,py);yy++)for(let xx=Math.max(0,px-1);xx<=Math.min(w-2,px);xx++){
    const j=(yy*w+xx)*4;if(packed(j)===pixel&&packed(j+4)===pixel&&packed(j+w*4)===pixel&&packed(j+w*4+4)===pixel)solidBlock=true;
   }
   if(solidBlock)continue;
   const dr=source[i]-old[0],dg=source[i+1]-old[1],db=source[i+2]-old[2];
   const distance=dr*dr+dg*dg+db*db;let bestError=Infinity,bestContrast=0,coverage=1;
   for(let yy=Math.max(0,py-2);yy<=Math.min(h-1,py+2);yy++)for(let xx=Math.max(0,px-2);xx<=Math.min(w-1,px+2);xx++){
    const q=yy*w+xx,j=q*4;if(seen[q]===2||!solid.has(packed(j)))continue;
    const r=source[j]-old[0],g=source[j+1]-old[1],b=source[j+2]-old[2],contrast=r*r+g*g+b*b;
    if(contrast<=distance)continue;
    const a=(dr*r+dg*g+db*b)/contrast;if(a<=0||a>=1)continue;
    const er=dr-a*r,eg=dg-a*g,eb=db-a*b,error=er*er+eg*eg+eb*eb;
    if(Math.max(Math.abs(er),Math.abs(eg),Math.abs(eb))>3)continue;
    if(error<bestError-1e-6||(Math.abs(error-bestError)<1e-6&&contrast>bestContrast)){bestError=error;bestContrast=contrast;coverage=a;}
   }
   if(!Number.isFinite(bestError))continue;
   for(let k=0;k<3;k++)data[i+k]=Math.round(source[i+k]+(1-coverage)*(color[k]-old[k]));
   count++;
   // Cover the second antialias pixel at diagonals/corners, but never grow
   // through solid ink or back out towards the background on its other side.
   if(pass===0)for(let yy=Math.max(0,py-1);yy<=Math.min(h-1,py+1);yy++)for(let xx=Math.max(0,px-1);xx<=Math.min(w-1,px+1);xx++){
    const q=yy*w+xx,j=q*4;if(seen[q])continue;
    const r=source[j]-old[0],g=source[j+1]-old[1],b=source[j+2]-old[2];
    if(r*r+g*g+b*b<distance)continue;
    seen[q]=1;edges.push(q);
   }
  }
 }
 return count;
}
SC.StudioGame=StudioGame;SC.studioColors=colors;SC.studioTools=tools;SC.studioFill=floodFill;
})(globalThis);
