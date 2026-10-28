/* One hex board per game. Input-independent rules, editing, hints and scoring. */
(function(root){
'use strict';
const SC=root.Starlight,E=SC.TrasselEngine;
const profiles=Object.freeze({gentle:{radius:3,pairs:4,max:10000,tau:60},steady:{radius:4,pairs:6,max:15000,tau:40},brave:{radius:5,pairs:8,max:20000,tau:30}});
// Målarateljén's saturated colours; gray is reserved for rejected hint routes.
const colors=['#e64b4b','#4088ce','#409a64','#9662ba','#b96518','#36a89c','#94603b','#ab2935','#245486','#23623f','#613781','#1e6963'];
function score({pace,elapsed,total,mistakes,unused,maxUnused,hints=0,timeScale=1,completed=total}){
  const p=profiles[pace],t=p.tau*timeScale;
  const time=t/(t+Math.max(0,elapsed)),optimality=Math.min(1,Math.max(0,unused/maxUnused)),accuracy=total/(total+mistakes);
  const fraction=completed/total,penalty=hints*p.max*.05;
  const parts={time:p.max*.7*time*fraction,optimality:p.max*(.3*4/7)*optimality*fraction,accuracy:p.max*(.3*3/7)*accuracy*fraction,penalty};
  return {...parts,total:Math.max(0,Math.round(parts.time+parts.optimality+parts.accuracy-penalty)),unused,maxUnused};
}
class TrasselGame{
  constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random});this.menu();}
  emit(type,detail={}){this.onEvent({type,...detail});}
  menu(){Object.assign(this,{state:'menu',phase:'ready',revision:0,clock:0,elapsed:0,score:0,lines:[],tiles:[],effects:[],active:null,search:null,cut:null});}
  start({mode='letters',pace='gentle',lang='sv-SE',items=null,shape='hex'}={}){
    this.menu();this.queue.clear();Object.assign(this,{mode,pace,lang,uppercase:false,hits:0,shots:0,mistakes:0,hints:0,sequence:0,boardRevision:0,lastHintRevision:-1,message:'Förbereder spelplanen…'});
    this.profile=profiles[pace];if(!this.profile)throw new Error('Okänd svårighet.');
    this.total=this.profile.pairs;this.shape=shape;this.board=E.makeBoard(this.profile.radius,shape);this.items=SC.beginPractice(this,items);
    this.pairs=SC.makeMatchingPairs(this.items,mode,this.total,this.random,lang);
    this.timeScale=SC.isMath(mode)?1.3:this.pairs.some(p=>p.answer.length>8||p.problem.label?.length>10)?1.3:1;
    this.state='playing';this.phase='preparing';this.search=this.prepare();this.emit('start');
  }
  tilesFor(paths){
    return paths.flatMap((path,i)=>{
      const pair=this.pairs[i],[a,b]=this.random()<.5?[path[0],path.at(-1)]:[path.at(-1),path[0]];
      return [{id:a,side:'problem',key:pair.key,item:pair.problem},{id:b,side:'answer',key:pair.key,item:{label:pair.answer,speech:pair.answerSpeech}}];
    });
  }
  *prepare(){
    let chosen,reserve,remaining=2000;
    search:for(let attempt=0;attempt<12&&remaining>0;attempt++){
      const candidate=E.construct(this.profile.radius,this.total,this.random,this.shape);
      if(!candidate){yield;continue;}
      const witness=E.pathStats(candidate.board,candidate.paths);
      if(witness.bendy===this.total&&witness.fill>=.85&&witness.detour>=this.total*2.5)reserve=candidate;
      const tiles=this.tilesFor(candidate.paths);
      for(let round=0;round<this.total*4+8&&remaining>0;round++){
        const limit=Math.min(300,remaining),budget={remaining:limit},result=yield* E.solve(candidate.board,tiles,[],{budget});
        remaining-=limit-budget.remaining;
        if(result.status!=='solved')break;
        if(E.quality(candidate.board,tiles,result,this.profile.radius).acceptable){chosen={candidate,tiles,result};break search;}
        if(!E.blockShortcut(candidate,result.paths,this.random))break;
        yield;
      }
      yield;
    }
    if(!chosen){
      const candidate=E.fallback(this.profile.radius,this.total,this.shape,this.random,reserve),tiles=this.tilesFor(candidate.paths);
      const result=yield* E.solve(candidate.board,tiles);
      chosen={candidate,tiles,result};
    }
    const {candidate,tiles,result}=chosen;
    this.board=candidate.board;this.tiles=tiles;this.solution=result.paths;this.maxUnused=this.board.cells.length-result.cost;
    this.adj=E.graph(this.board);this.tileById=new Map(tiles.map(t=>[t.id,t]));this.phase='ready';this.search=null;
    this.message='Dra mellan uppgifter och svar som hör ihop.';this.revision++;this.refreshScore();this.emit('trassel-ready');
  }
  resize(width,height){Object.assign(this,{width,height});}
  getTargets(){return this.tiles;}
  getAvailableTargets(){return this.tiles.filter(t=>!this.lineAt(t.id));}
  getActiveEntries(){return [];}
  lineAt(id){return this.lines.find(l=>l.path.includes(id));}
  ready(){return this.state==='playing'&&this.phase==='ready';}
  changed(){this.boardRevision++;this.revision++;this.hits=this.lines.length;this.refreshScore();}
  refreshScore(){
    if(!this.maxUnused)return;
    this.scoreParts=score({...this,unused:this.board.cells.length-this.lines.reduce((n,l)=>n+l.path.length,0),completed:this.lines.length});this.score=this.scoreParts.total;
  }
  begin(id){
    if(!this.ready()||this.active)return false;
    this.cut=null;const tile=this.tileById.get(id);if(!tile)return false;
    const line=this.lineAt(id);
    if(line){
      if(id!==line.path[0]&&id!==line.path.at(-1))return false;
      // A press alone is still a tap. Only an actual backward step edits it.
      const path=id===line.path.at(-1)?line.path.slice():line.path.slice().reverse();
      this.active={path,color:line.color,order:line.order,id:line.id,editing:line,started:false};
    }else this.active={path:[id],color:colors[this.sequence%colors.length],started:true};
    this.revision++;return true;
  }
  move(id){
    if(!this.ready()||!this.active)return false;const a=this.active,last=a.path.at(-1);
    if(id===last||!this.adj[last].includes(id))return false;
    const index=a.path.indexOf(id);
    if(a.editing&&!a.started){if(index!==a.path.length-2)return false;this.lines=this.lines.filter(l=>l!==a.editing);a.started=true;this.changed();}
    if(index>=0){a.path.length=index+1;this.revision++;return true;}
    if(this.lineAt(id))return false;
    a.path.push(id);this.revision++;
    const target=this.tileById.get(id);if(!target)return true;
    this.shots++;
    if(E.matches(this.tileById.get(a.path[0]),target)){
      const order=a.order??this.sequence++,line={id:a.id??order,order,color:a.color,path:a.path.slice(),gray:false};
      this.lines.push(line);this.active=null;this.changed();this.message='Rätt!';this.emit('hit',{points:0});
      if(this.lines.length===this.total){this.state='celebrating';this.endingLeft=.8;this.cut=null;this.emit('celebrate');}
    }else{
      this.mistakes++;this.message='De hör inte ihop. Försök igen.';this.retract(a.path,a.color);this.active=null;this.refreshScore();this.emit('miss');
    }
    return true;
  }
  release(){
    const a=this.active;if(!a)return;
    if(a.editing&&!a.started)this.showCut(a.editing.id,a.path.at(-1));
    else this.retract(a.path,a.color);
    this.active=null;this.revision++;
  }
  cancel(){const a=this.active;if(a?.started)this.retract(a.path,a.color);this.active=null;this.cut=null;this.revision++;}
  retract(path,color){if(path.length>1)this.effects.push({path:path.slice(),color,age:0,duration:.38});}
  showCut(id,tile){if(!this.ready()||!this.lines.some(l=>l.id===id))return false;this.cut={id,tile};this.revision++;return true;}
  cutLine(){
    if(!this.ready()||!this.cut)return false;const line=this.lines.find(l=>l.id===this.cut.id);if(!line)return false;
    const i=line.path.indexOf(this.cut.tile),color=line.gray?'#8d9497':line.color;
    this.retract(line.path.slice(0,i+1),color);this.retract(line.path.slice(i).reverse(),color);
    this.lines=this.lines.filter(l=>l!==line);this.cut=null;this.changed();return true;
  }
  requestHint(){
    if(!this.ready()||this.active||!this.lines.length||this.lastHintRevision===this.boardRevision)return false;
    this.cut=null;this.phase='checking';this.message='Kontrollerar linjerna…';this.search=this.checkHint();this.revision++;return true;
  }
  *checkHint(){
    const result=yield* E.hint(this.board,this.tiles,this.lines);
    if(result.status==='solved'){
      for(const line of this.lines)if(result.bad.includes(line.id))line.gray=true;
      this.hints++;this.lastHintRevision=this.boardRevision;this.refreshScore();
      this.message=result.bad.length?'Ledtråd: '+result.bad.length+' linje(r) behöver ändras. Äldre linjer har företräde.':
        this.lines.some(l=>l.gray)?'Alla linjer ryms nu. Tidigare grå markeringar ligger kvar tills linjerna ändras.':'Linjerna går att behålla i en färdig lösning.';
      this.emit('trassel-hint');
    }else this.message='Kontrollen kunde inte slutföras. Inga poäng drogs av. Prova att dra om en linje.';
    this.phase='ready';this.search=null;this.revision++;
  }
  pause(){if(this.state==='playing'){this.cancel();this.state='paused';this.emit('pause');}}
  resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
  update(dt){
    if(!Number.isFinite(dt)||dt<=0||!['playing','celebrating'].includes(this.state))return;
    this.clock+=dt;for(const e of this.effects)e.age+=dt;this.effects=this.effects.filter(e=>e.age<e.duration);
    if(this.state==='celebrating'){
      this.endingLeft-=dt;if(this.endingLeft<=0){this.state='won';this.emit('end',{won:true,score:this.score,scoreParts:this.scoreParts,hits:this.hits,shots:this.shots,elapsed:this.elapsed});}return;
    }
    if(this.search){const until=performance.now()+4;let result;do{result=this.search.next();}while(!result.done&&performance.now()<until);if(result.done)this.search=null;return;}
    this.elapsed+=dt;this.refreshScore();
  }
}
Object.assign(SC,{TrasselGame,trasselProfiles:profiles,trasselColors:colors,trasselScore:score});
})(globalThis);
