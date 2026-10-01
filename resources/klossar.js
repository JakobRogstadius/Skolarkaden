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
  return !tile.removed&&!tiles.some(other=>!other.removed&&other.z>tile.z&&overlap(tile,other));
}
function layoutSlots(id,pace){
  const layout=layouts.find(l=>l.id===id);
  if(!layout||!pairCounts[pace])throw new Error('Okänd klossbana eller svårighet.');
  const floor=layout.rows.flatMap((row,y)=>Array.from(row).flatMap((cell,x)=>cell==='#'?[{x,y,z:0}]:[]));
  // Keep the silhouette, with staggered upper layers bridging two to four
  // tiles below. Each layer uses one grid, so its own tiles never overlap.
  const cx=floor.reduce((n,p)=>n+p.x,0)/floor.length,cy=floor.reduce((n,p)=>n+p.y,0)/floor.length;
  const layers={gentle:[8],steady:[20,8],brave:[28,16,4]}[pace];
  const slots=[...floor];let below=floor;
  for(const [i,count] of layers.entries()){
    const [dx,dy]=[[.5,.5],[.5,0],[0,.5]][i],candidates=new Map();
    for(const tile of below)for(const x of [tile.x-dx,tile.x+dx])for(const y of [tile.y-dy,tile.y+dy]){
      const support=below.reduce((area,t)=>area+Math.max(0,1-Math.abs(t.x-x))*Math.max(0,1-Math.abs(t.y-y)),0);
      // At least half the tile rests on the preceding layer. Prefer full
      // support and central positions before allowing edge overhangs.
      if(support>=.5)candidates.set(x+','+y,{x,y,z:i+1,support});
    }
    const ranked=[...candidates.values()].sort((a,b)=>b.support-a.support||((a.x-cx)**2+(a.y-cy)**2)-((b.x-cx)**2+(b.y-cy)**2)||a.y-b.y||a.x-b.x);
    if(ranked.length<count)throw new Error('Klossbanan saknar stöd för nästa lager.');
    below=ranked.slice(0,count).map(({x,y,z})=>({x,y,z}));slots.push(...below);
  }
  return slots.map((p,id)=>({...p,id}));
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
const letterSpeech=(text,lang)=>/^\p{Script=Latin}$/u.test(text.normalize('NFC'))?{text:text.toLocaleUpperCase(lang),lang}:null;
function pairFor(item,mode,random,lang){
  if(SC.isMath(mode)){
    const problem=SC.makeMath(item.answer,random,SC.mathLevel(mode));
    return {problem,answer:String(problem.answer),key:'math:'+problem.answer};
  }
  if(SC.isChinese(mode)){
    if(!item.hint)throw new Error('Uppgiften saknar pinyin.');
    const chinese={pinyin:item.hint,translation:item.translation?.trim()||''};
    const speech=/^\p{Script=Han}{1,2}$/u.test(item.label)?{text:item.label,lang:SC.modes[mode].lang}:null;
    return {problem:{label:item.label,speech,tooltip:chinese.translation},answer:item.hint,chinese,key:'pinyin:'+readingKey(item.hint)};
  }
  if(mode==='bopomofo'){
    const pinyin=SC.bopomofoPinyin[item.label];
    if(!pinyin)throw new Error('Bopomofotecknet saknar pinyin.');
    return {problem:{label:item.label,speech:{audio:'resources/audio/bopomofo/'+item.label.codePointAt(0).toString(16)+'.mp3'}},answer:pinyin,key:'bopomofo:'+item.label};
  }
  if(SC.isWordPair(mode)){
    const promptLang=SC.isTranslation(mode)?(item.answerLang==='en-US'?'sv-SE':'en-US'):item.answerLang;
    return {problem:{label:item.label.toLocaleUpperCase('sv-SE'),speech:letterSpeech(item.label,promptLang)},answer:item.answer.toLocaleLowerCase('sv-SE'),answerSpeech:letterSpeech(item.answer,item.answerLang),key:'word:'+SC.pairAnswerKey(item.answer,item.answerLang)};
  }
  const speech=letterSpeech(item.label,lang);
  return {problem:{label:item.label.toLocaleUpperCase('sv-SE'),speech},answer:item.label.toLocaleLowerCase('sv-SE'),answerSpeech:speech,key:'case:'+readingKey(item.label)};
}
function makePairs(items,mode,count,random,lang){
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
  while(pairs.length<count){if(!bag.length)bag=shuffle(pool,random);pairs.push(pairFor(bag.pop(),mode,random,lang));}
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
  menu(){Object.assign(this,{state:'menu',clock:0,elapsed:0,score:0,hits:0,shots:0,mistakes:0,reshuffles:0,selected:[],tiles:[],effects:[],feedback:null,hint:null,hintPenalty:0,revision:0});}
  start({mode='swedish',pace='gentle',lang='sv-SE',items=null,layout=null}={}){
    this.menu();this.queue.clear();Object.assign(this,{mode,pace,lang,uppercase:false,chineseDisplay:'pinyin'});
    this.total=pairCounts[pace];if(!this.total)throw new Error('Okänd svårighet.');
    this.items=SC.beginPractice(this,items);
    this.layout=layouts.find(l=>l.id===layout)||layouts[Math.floor(this.random()*layouts.length)];
    this.slots=layoutSlots(this.layout.id,pace);this.order=removalOrder(this.slots,this.random);
    if(!this.order)throw new Error('Kunde inte lägga ut klossarna.');
    const pairs=makePairs(this.items,mode,this.total,this.random,lang);
    this.tiles=this.slots.map(p=>({...p,removed:false}));
    this.order.forEach(([first,second],i)=>{
      const [a,b]=this.random()<.5?[first,second]:[second,first],p=pairs[i];
      Object.assign(this.tiles[a],{side:'problem',key:p.key,item:p.problem,chinese:p.chinese});
      Object.assign(this.tiles[b],{side:'answer',key:p.key,item:{label:p.answer,speech:p.answerSpeech},chinese:p.chinese});
    });
    this.state='playing';this.revision++;this.emit('start');
  }
  resize(width,height){this.width=width;this.height=height;}
  getTargets(){return this.tiles.filter(t=>!t.removed);}
  getAvailableTargets(){return this.getTargets().filter(t=>isFree(t,this.tiles));}
  getActiveEntries(){return [];}
  free(tile){return this.tiles.includes(tile)&&isFree(tile,this.tiles);}
  hasMove(){const free=this.getAvailableTargets();return free.some((a,i)=>free.slice(i+1).some(b=>matches(a,b)));}
  requestHint(){
    if(this.state!=='playing'||this.feedback||this.hint)return false;
    const free=this.getAvailableTargets();
    // Prefer a match for the selected tile, if one is currently available.
    const preferred=this.selected[0];
    const a=preferred&&free.some(b=>matches(preferred,b))?preferred:free.find(a=>free.some(b=>matches(a,b)));
    if(!a)return false;
    const b=free.find(b=>matches(a,b));
    this.selected=[];this.hint=[a.id,b.id];this.hintPenalty+=100;this.score-=100;this.revision++;
    this.emit('klossar-hint');return true;
  }
  canTranslate(){return SC.isChinese(this.mode)&&this.tiles.every(t=>!t.chinese||!!t.chinese.translation);}
  updateChineseTile(tile){
    if(!tile.chinese)return;
    const display=this.chineseDisplay;
    tile.key=display+':'+readingKey(tile.chinese[display]);
    if(tile.side==='answer')tile.item.label=tile.chinese[display];
    else tile.item.tooltip=tile.chinese[display==='pinyin'?'translation':'pinyin'];
  }
  setChineseDisplay(display){
    if(!SC.isChinese(this.mode)||this.state!=='playing'||!['pinyin','translation'].includes(display)||display===this.chineseDisplay||display==='translation'&&!this.canTranslate())return false;
    this.chineseDisplay=display;this.selected=[];this.feedback=null;this.hint=null;
    this.tiles.forEach(tile=>this.updateChineseTile(tile));this.revision++;
    if(!this.hasMove())this.reshuffle();
    this.emit('klossar-display');return true;
  }
  select(id){
    if(this.state!=='playing'||this.feedback)return false;
    const tile=this.tiles.find(t=>t.id===id);
    if(!tile||!this.free(tile))return false;
    this.hint=null;
    const selected=this.selected.indexOf(tile);
    if(selected>=0){this.selected.splice(selected,1);this.revision++;return true;}
    this.selected.push(tile);this.revision++;
    if(this.selected.length<2){this.emit('klossar-select',{tile});this.emit('lock');return true;}
    const [a,b]=this.selected;this.shots++;
    if(matches(a,b)){
      if(a.chinese&&a.chinese!==b.chinese){
        const [problem,answer]=a.side==='problem'?[a,b]:[b,a];
        // Equal pinyin can have different meanings (他/她/它). Rebind the
        // surviving answer so both display modes retain complete pairs.
        const companion=this.tiles.find(t=>!t.removed&&t.side==='answer'&&t.chinese===problem.chinese);
        companion.chinese=answer.chinese;this.updateChineseTile(companion);
      }
      a.removed=b.removed=true;this.selected=[];this.hits++;this.score=this.hits*100-this.hintPenalty;
      this.effects.push({id:a.id,x:a.x,y:a.y,z:a.z,age:0},{id:b.id,x:b.x,y:b.y,z:b.z,age:0});
      this.emit('hit',{target:a,points:100});
      if(this.hits===this.total){this.score=Math.max(0,score(this.total,this.elapsed)-this.hintPenalty);this.state='celebrating';this.endingLeft=.85;this.emit('celebrate');}
      else if(!this.hasMove())this.reshuffle();
    }else{this.mistakes++;this.feedback={ids:[a.id,b.id],left:.42};this.emit('miss');}
    this.emit('klossar-select',{tile});
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
    this.selected=[];this.hint=null;this.reshuffles++;this.revision++;this.emit('klossar-shuffle');
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
