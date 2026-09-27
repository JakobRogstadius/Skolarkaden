/* Mahjong solitaire: geometry and exercise matching, independent of DOM/input. */
(function(root){
'use strict';
const SC=root.Starlight;
const shuffle=(values,random)=>{const copy=[...values];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
const layouts=Object.freeze([
  {id:'turtle',name:'Sköldpaddan',rows:['..####..','.######.','########','########','.######.']},
  {id:'pyramid',name:'Pyramiden',rows:['...##...','..####..','.######.','########','.######.','..####..','...##...']},
  {id:'fortress',name:'Borgen',rows:['########','#......#','###..###','###..###','#......#','########']},
  {id:'dinosaur',name:'Dinosaurien',rows:['......###.','......####','......##..','.....####.','#..#####..','#######...','..##.##...','..#...#...']},
  {id:'facehugger',name:'Facehuggern',rows:['#.#...#.#','.##...##.','...###...','.#######.','..#####..','.#..#..#.','....#....','....#....','..##.....','..##.....']}
]);
const pairCounts=Object.freeze({gentle:20,steady:30,brave:40});
const overlap=(a,b)=>Math.abs(a.x-b.x)<.99&&Math.abs(a.y-b.y)<.99;
function isFree(tile,tiles){
  if(tile.removed)return false;
  let left=false,right=false;
  for(const other of tiles){
    if(other===tile||other.removed)continue;
    if(other.z>tile.z&&overlap(tile,other))return false;
    if(other.z===tile.z&&Math.abs(other.y-tile.y)<.99){
      const dx=other.x-tile.x;
      if(dx<0&&dx>=-1.01)left=true;
      if(dx>0&&dx<=1.01)right=true;
    }
  }
  return !left||!right;
}
function layoutSlots(id,pace){
  const layout=layouts.find(l=>l.id===id);
  if(!layout||!pairCounts[pace])throw new Error('Okänd klossbana eller svårighet.');
  const floor=layout.rows.flatMap((row,y)=>Array.from(row).flatMap((cell,x)=>cell==='#'?[{x,y,z:0}]:[]));
  // Keep the whole silhouette at every difficulty. Higher levels add supported,
  // progressively smaller layers, rather than squeezing more tiles into gaps.
  const cx=floor.reduce((n,p)=>n+p.x,0)/floor.length,cy=floor.reduce((n,p)=>n+p.y,0)/floor.length;
  const inner=[...floor].sort((a,b)=>((a.x-cx)**2+(a.y-cy)**2)-((b.x-cx)**2+(b.y-cy)**2)||a.y-b.y||a.x-b.x);
  const layers={gentle:[8],steady:[20,8],brave:[28,16,4]}[pace];
  return [...floor,...layers.flatMap((count,i)=>inner.slice(0,count).map(p=>({...p,z:i+1})))].map((p,id)=>({...p,id}));
}
function removalOrder(slots,random=Math.random){
  // Try varied paths through the stack. The final attempt peels one even-sized
  // layer at a time; every built-in layout therefore has a bounded fallback.
  for(let attempt=0;attempt<17;attempt++){
    const tiles=slots.map(p=>({...p,removed:false})),order=[];
    while(order.length*2<tiles.length){
      let free=tiles.filter(t=>isFree(t,tiles));
      if(attempt===16){const top=Math.max(...tiles.filter(t=>!t.removed).map(t=>t.z));free=free.filter(t=>t.z===top);}
      if(free.length<2)break;
      const [a,b]=shuffle(free,random);a.removed=b.removed=true;order.push([a.id,b.id]);
    }
    if(order.length*2===tiles.length)return order;
  }
  return null;
}
const readingKey=text=>String(text).normalize('NFC').toLocaleLowerCase('sv-SE').trim().replace(/\s+/g,' ');
function pairFor(item,mode,random){
  if(SC.isMath(mode)){
    const problem=SC.makeMath(item.answer,random,SC.mathLevel(mode));
    return {problem,answer:String(problem.answer),key:'math:'+problem.answer};
  }
  if(SC.isChinese(mode)){
    if(!item.hint)throw new Error('Uppgiften saknar pinyin.');
    return {problem:{label:item.label},answer:item.hint,key:'pinyin:'+readingKey(item.hint)};
  }
  if(mode==='bopomofo')return {problem:{label:item.label},answer:item.key.toUpperCase(),key:'key:'+item.key};
  if(SC.isWordPair(mode))return {problem:{label:item.label.toLocaleUpperCase('sv-SE')},answer:item.answer.toLocaleLowerCase('sv-SE'),key:'word:'+SC.pairAnswerKey(item.answer,item.answerLang)};
  return {problem:{label:item.label.toLocaleUpperCase('sv-SE')},answer:item.label.toLocaleLowerCase('sv-SE'),key:'case:'+readingKey(item.label)};
}
function makePairs(items,mode,count,random){
  let pool=items;
  if(SC.isWordPair(mode)){
    // Avoid overlapping synonym/translation answer sets across different keys.
    // Every displayed valid answer stays interchangeable; no invisible pair IDs.
    pool=[];const used=new Set();
    for(const item of shuffle(items,random)){
      const keys=item.answerKeys||[SC.pairAnswerKey(item.answer,item.answerLang)];
      if(keys.some(k=>used.has(k)))continue;
      pool.push(item);keys.forEach(k=>used.add(k));
    }
  }
  if(!pool.length)throw new Error('Övningen behöver minst ett par.');
  const pairs=[];let bag=[];
  while(pairs.length<count){if(!bag.length)bag=shuffle(pool,random);pairs.push(pairFor(bag.pop(),mode,random));}
  return pairs;
}
function matches(a,b){return a!==b&&a.side!==b.side&&a.key===b.key;}
function score(pairs,seconds){
  // No deadline. The completion bonus declines with average seconds per pair.
  return pairs*100+Math.round(pairs*400/(1+Math.max(0,seconds)/(pairs*6)));
}
class KlossarGame{
  constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random,width:1000,height:700});this.menu();}
  emit(type,detail={}){this.onEvent({type,...detail});}
  menu(){Object.assign(this,{state:'menu',clock:0,elapsed:0,score:0,hits:0,shots:0,mistakes:0,reshuffles:0,selected:[],tiles:[],effects:[],feedback:null,revision:0});}
  start({mode='swedish',pace='gentle',lang='sv-SE',items=null,layout=null}={}){
    this.menu();this.queue.clear();Object.assign(this,{mode,pace,lang,uppercase:false});
    this.total=pairCounts[pace];if(!this.total)throw new Error('Okänd svårighet.');
    this.items=SC.beginPractice(this,items);
    this.layout=layouts.find(l=>l.id===layout)||layouts[Math.floor(this.random()*layouts.length)];
    this.slots=layoutSlots(this.layout.id,pace);this.order=removalOrder(this.slots,this.random);
    if(!this.order)throw new Error('Kunde inte lägga ut klossarna.');
    const pairs=makePairs(this.items,mode,this.total,this.random);
    this.tiles=this.slots.map(p=>({...p,removed:false}));
    this.order.forEach(([first,second],i)=>{
      const [a,b]=this.random()<.5?[first,second]:[second,first],p=pairs[i];
      Object.assign(this.tiles[a],{side:'problem',key:p.key,item:p.problem});
      Object.assign(this.tiles[b],{side:'answer',key:p.key,item:{label:p.answer}});
    });
    this.state='playing';this.revision++;this.emit('start');
  }
  resize(width,height){this.width=width;this.height=height;}
  getTargets(){return this.tiles.filter(t=>!t.removed);}
  getAvailableTargets(){return this.getTargets().filter(t=>isFree(t,this.tiles));}
  getActiveEntries(){return [];}
  free(tile){return this.tiles.includes(tile)&&isFree(tile,this.tiles);}
  hasMove(){const free=this.getAvailableTargets();return free.some((a,i)=>free.slice(i+1).some(b=>matches(a,b)));}
  select(id){
    if(this.state!=='playing'||this.feedback)return false;
    const tile=this.tiles.find(t=>t.id===id);
    if(!tile||!this.free(tile))return false;
    const selected=this.selected.indexOf(tile);
    if(selected>=0){this.selected.splice(selected,1);this.revision++;return true;}
    this.selected.push(tile);this.revision++;
    if(this.selected.length<2){this.emit('lock');return true;}
    const [a,b]=this.selected;this.shots++;
    if(matches(a,b)){
      a.removed=b.removed=true;this.selected=[];this.hits++;this.score=this.hits*100;
      this.effects.push({id:a.id,x:a.x,y:a.y,z:a.z,age:0},{id:b.id,x:b.x,y:b.y,z:b.z,age:0});
      this.emit('hit',{target:a,points:100});
      if(this.hits===this.total){this.score=score(this.total,this.elapsed);this.state='celebrating';this.endingLeft=.85;this.emit('celebrate');}
      else if(!this.hasMove())this.reshuffle();
    }else{this.mistakes++;this.feedback={ids:[a.id,b.id],left:.42};this.emit('miss');}
    return true;
  }
  reshuffle(){
    const remaining=this.getTargets(),groups=new Map();
    for(const tile of remaining){if(!groups.has(tile.key))groups.set(tile.key,{problem:[],answer:[]});groups.get(tile.key)[tile.side].push(tile);}
    const pairs=[];for(const group of groups.values())while(group.problem.length)pairs.push([group.problem.pop(),group.answer.pop()]);
    // A valid cross-match can leave a single stack with no free pair. Moving the
    // remaining tiles to the suffix of the original solution also repairs that
    // geometry, preserving every remaining problem/answer and the pair count.
    const order=this.order.slice(-pairs.length),mixed=shuffle(pairs,this.random);
    order.forEach(([a,b],i)=>{const pair=this.random()<.5?mixed[i]:[...mixed[i]].reverse();pair.forEach((tile,j)=>{const slot=this.slots[j?b:a];Object.assign(tile,{x:slot.x,y:slot.y,z:slot.z});});});
    this.selected=[];this.reshuffles++;this.revision++;this.emit('klossar-shuffle');
  }
  pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
  resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
  update(dt){
    if(!Number.isFinite(dt)||dt<=0||!['playing','celebrating'].includes(this.state))return;
    this.clock+=dt;
    for(const effect of this.effects)effect.age+=dt;
    this.effects=this.effects.filter(e=>e.age<.85);
    if(this.state==='celebrating'){
      this.endingLeft-=dt;
      if(this.endingLeft<=0){this.state='won';this.emit('end',{won:true,score:this.score,hits:this.hits,shots:this.shots,elapsed:this.elapsed});}
      return;
    }
    this.elapsed+=dt;
    if(this.feedback){this.feedback.left-=dt;if(this.feedback.left<=0){this.feedback=null;this.selected=[];this.revision++;}}
  }
}
Object.assign(SC,{KlossarGame,klossarLayouts:layouts,klossarPairCounts:pairCounts,klossarLayout:layoutSlots,klossarRemovalOrder:removalOrder,klossarIsFree:isFree,klossarMatches:matches,klossarScore:score});
})(globalThis);
