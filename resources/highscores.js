/* Shared scoreboard. Save only on Enter or an explicit replay/menu action. */
(function(root){
'use strict';
const SC=root.Starlight, API='https://skolarkaden-api.jakob-rogstadius.workers.dev';
const $=id=>document.getElementById(id);
const policy=root.SkolarkadenHighscorePolicy;
const boardKey=selection=>[policy.versions[selection.kind],selection.kind].join(':');
const storedKey=selection=>boardKey(selection)+':'+selection.mode+':'+selection.pace;
const scoreSettings=s=>({game_version:policy.versions[s.kind],game:s.kind,exercise:s.mode,difficulty:s.pace,
  input_mode:s.input==='typing'?'keyboard':s.input==='browser'?'voice':null,
  spoken_language:s.spokenLanguage||s.lang||null,exercise_language:s.lang||null,
  uppercase:typeof s.uppercase==='boolean'?s.uppercase:null,letter_keys:s.letterKeys||null,
  sound_enabled:typeof s.soundEnabled==='boolean'?s.soundEnabled:null,reduced_motion:typeof s.reducedMotion==='boolean'?s.reducedMotion:null});
const difficultyName=pace=>Array.from($('pace').options).find(option=>option.value===pace)?.textContent||'—';
const displayName=name=>Array.from(String(name).normalize('NFC').toUpperCase()).slice(0,10).join('');
const validName=name=>/^[\p{L}\p{M} ]{1,10}$/u.test(name);
async function request(path,options={}){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(API+path,{...options,signal:controller.signal,credentials:'omit'});
    if(!response.ok){
      const body=await response.json().catch(()=>({}));
      const error=new Error(body.error==='invalid_leaderboard'?'Topplistan är inte redo för det här spelet ännu.':response.status===429?'Många resultat skickas just nu. Vänta en minut och försök igen.':
        response.status===409?'Det här resultatet har redan skickats med andra uppgifter.':
        'Topplistan kunde inte nås. Försök igen om en stund.');
      error.status=response.status;error.code=body.error;throw error;
    }
    return await response.json();
  }finally{clearTimeout(timeout);}
}
async function readBoard(selection,result){
  const group=boardKey(selection),key=storedKey(selection),suffix=result?'&score='+result.score+(result.id?'&submission='+encodeURIComponent(result.id):''):'';
  const read=board=>request('/scores?leaderboard='+encodeURIComponent(board)+suffix);
  const first=await read(key);
  if(first.leaderboard===group||!first.leaderboard)return first;
  // Preserve compatibility during deployment: combine older exercise boards too.
  const exercises=Object.keys(SC.modes),paces=['gentle','steady','brave'],parts=[];
  for(let offset=0;offset<exercises.length;offset+=4){
    const batch=await Promise.all(exercises.slice(offset,offset+4).map(async exercise=>{
      const exerciseKey=group+':'+exercise,probe=exercise===selection.mode?first:await read(exerciseKey+':'+selection.pace);
      const boards=probe.leaderboard===exerciseKey?[probe]:await Promise.all(paces.map(p=>p===selection.pace?probe:read(exerciseKey+':'+p)));
      return boards.map((board,i)=>({...board,scores:board.scores.map(row=>({...row,exercise:row.exercise||exercise,difficulty:row.difficulty||paces[i]}))}));
    }));parts.push(...batch.flat());
  }
  const rows=parts.flatMap(b=>b.scores);rows.sort((a,b)=>b.score-a.score||String(a.created_at).localeCompare(String(b.created_at)));
  const complete=result&&parts.every(b=>b.scores.length<10||b.scores.at(-1).score<result.score);
  const rank=result&&!result.saved?(parts.every(b=>Number.isInteger(b.rank))?1+parts.reduce((n,b)=>n+b.rank-1,0):complete?1+rows.filter(r=>r.score>=result.score).length:null):null;
  return {leaderboard:group,scores:rows.slice(0,10),rank,saved:parts.some(b=>b.saved)};
}

class Highscores{
  constructor({getSelection,games={}}){
    this.getSelection=getSelection;this.run=null;this.result=null;this.view=0;this.readGeneration=0;
    this.games=games;this.pages=[...Object.keys(games),'games','exercises'];
    $('score-name').value='';
    try{localStorage.removeItem('skolarkaden-nickname-v1');}catch(_){}
    $('score-name').addEventListener('input',()=>{if(!$('score-name').readOnly)$('score-name').value=displayName($('score-name').value);});
    $('leaderboard-open').addEventListener('click',()=>this.open(this.getSelection()));
    $('scores-refresh').addEventListener('click',()=>this.load(this.view,true));
    $('scores-previous').addEventListener('click',()=>this.navigate(-1));
    $('scores-next').addEventListener('click',()=>this.navigate(1));
    $('leaderboard').addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.altKey||e.ctrlKey||e.metaKey||e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
      if(!this.endView&&$('leaderboard').open){e.preventDefault();this.navigate(e.key==='ArrowLeft'?-1:1);}
    });
    $('score-form').addEventListener('submit',e=>{e.preventDefault();this.pendingSave=this.submit().finally(()=>{this.pendingSave=null;});});
    $('leaderboard').addEventListener('close',()=>this.dismiss());
    $('end-overlay').addEventListener('keydown',e=>{
      if(e.key!=='Tab')return;const controls=[$('score-name'),$('again'),$('end-menu')].filter(el=>!el.disabled&&el.offsetParent!==null);
      const index=controls.indexOf(document.activeElement);if(controls.length&&(e.shiftKey?index<=0:index===controls.length-1)){e.preventDefault();controls[e.shiftKey?controls.length-1:0].focus();}
    });
  }
  dismiss(){this.view++;this.shownResult=null;}
  begin(selection){this.dismiss();$('score-name').value='';$('score-name').readOnly=false;this.result=null;this.run={selection:JSON.parse(JSON.stringify(selection)),id:root.crypto?.randomUUID?.()||null};}
  finish(score){this.result=this.run?{...this.run,score,saved:false,payload:null,pending:false}:null;}
  showEnd(){this.open(this.result?.selection||this.getSelection(),this.result);}
  isPopularity(){return !this.endView&&['games','exercises'].includes(this.page);}
  configureMenu(){
    const popularity=this.isPopularity(),games=this.page==='games';
    const title=popularity?'Mest spelade '+(games?'spel':'övningar'):'Topplista: '+(this.games[this.page]||this.selection.label.split(' · ')[0]);
    $('leaderboard-title').textContent=title;
    $('scores-page').textContent=(this.pages.indexOf(this.page)+1)+' / '+this.pages.length;
    $('scores-page').setAttribute('aria-label',title+', '+$('scores-page').textContent);
    $('scores-table').className='score-table'+(popularity?' popularity-table'+(games?'':' exercise-popularity-table'):'');
    $('scores-table').scrollLeft=0;
    const headings=popularity?(games?['NR','SPEL','OMGÅNGAR','LEDARE','REKORD']:['NR','ÖVNING','OMGÅNGAR','LEDARE']):['NR','NAMN','ÖVNING','NIVÅ','POÄNG'];
    $('scores-heading').replaceChildren(...headings.map(text=>{const span=document.createElement('span');span.textContent=text;return span;}));
    $('scores-list').setAttribute('aria-label',popularity?title+' med antal sparade omgångar och '+(games?'rekordhållare':'bästa spelare'):'De 10 högsta resultaten');
  }
  navigate(direction){
    if(this.endView||!$('leaderboard').open)return;
    const index=this.pages.indexOf(this.page);
    this.page=this.pages[(index+direction+this.pages.length)%this.pages.length];
    if(!this.isPopularity())this.selection={...this.selection,kind:this.page};
    this.data=null;const token=++this.view;this.configureMenu();this.render();return this.load(token);
  }
  open(selection,result=null){
    this.selection={...selection};this.shownResult=result;this.endView=Boolean(result);this.data=null;
    this.page=selection.kind;
    const token=++this.view;
    if(!result){this.configureMenu();$('leaderboard').showModal();}
    else{
      $('score-name').readOnly=Boolean(result.payload);
      if(result.payload)$('score-name').value=result.payload.player_name;
      $('score-submit').disabled=Boolean(result.saved||result.pending||!result.id);
      $('score-status').textContent=result.saved?'Resultatet är sparat.':result.pending?'Sparar…':!result.id?'Resultatet kan inte skickas från den här webbläsaren.':'';
    }
    this.render();if(result){$(result.saved||!result.id?'again':'score-name').focus({preventScroll:true});}return this.load(token);
  }
  render(){
    if(this.isPopularity()){this.renderPopularity();return;}
    const result=this.shownResult,list=$(this.endView?'end-scores-list':'scores-list'),rows=(this.data?.scores||[]).slice(0,10);
    // Park the same input node before rebuilding rows, preserving its value and payload.
    const focused=document.activeElement===$('score-name'),selection=$('score-name').selectionStart;
    if(this.endView){$('score-form').append($('score-entry'));$('score-entry').hidden=true;}
    list.replaceChildren();
    const savedIndex=rows.findIndex(row=>row.is_player),rank=this.data?.rank??null;
    const own={player_name:result?.payload?.player_name||'',score:result?.score,exercise:result?.selection.mode,difficulty:result?.selection.pace,is_player:true};
    if(result&&savedIndex<0&&rank!==null&&rank<=10){rows.splice(rank-1,0,own);rows.length=Math.min(rows.length,10);}
    for(let i=0;i<10;i++)this.row(list,rows[i],i+1);
    if(result&&!rows.some(row=>row.is_player))this.row(list,own,rank);
    if(focused&&!result?.saved){$('score-name').focus({preventScroll:true});if(Number.isInteger(selection))$('score-name').setSelectionRange(selection,selection);}
  }
  row(list,row,rank){
    const item=document.createElement('li'),number=document.createElement('span'),name=document.createElement('span'),score=document.createElement('span'),difficulty=document.createElement('span'),exercise=document.createElement('span');
    item.className='board-row'+(row?.is_player?' player-row':'');
    number.className='board-rank';number.textContent=rank===null?'—':String(rank);name.className='board-name';score.className='board-points';
    name.textContent=row?displayName(row.player_name):'—';score.textContent=row?String(Number(row.score)):'—';
    if(row?.is_player&&this.shownResult&&!this.shownResult.saved){name.textContent='';$('score-entry').hidden=false;name.append($('score-entry'));}
    difficulty.className='board-difficulty';difficulty.textContent=difficultyName(row?.difficulty);
    exercise.className='board-exercise';exercise.textContent=SC.modes[row?.exercise]?.name||'—';exercise.title=exercise.textContent;
    item.append(number,name,exercise,difficulty,score);list.append(item);
  }
  renderPopularity(){
    const list=$('scores-list');list.replaceChildren();
    for(const [index,row] of (this.data?.entries||[]).entries()){
      const item=document.createElement('li');item.className='board-row';
      const label=this.page==='games'?this.games[row.id]:SC.modes[row.id]?.name;
      const relative=this.page==='exercises',hasRating=relative&&Number.isFinite(row.rating);
      const name=relative&&!hasRating?'—':row.player_name?displayName(row.player_name):'—';
      const cells=[['board-rank',String(index+1)],['board-exercise',label||row.id],['board-plays',String(row.plays)],['board-name',name]];
      if(!relative)cells.push(['board-points',row.score===null?'—':String(row.score)]);
      for(const [className,text] of cells){const span=document.createElement('span');span.className=className;span.textContent=text;item.append(span);}
      list.append(item);
    }
  }
  async load(token,refresh=false){
    const result=this.shownResult,popularity=this.isPopularity(),page=this.page,generation=++this.readGeneration,status=$(this.endView?'end-scores-status':'scores-status');
    const current=()=>token===this.view&&generation===this.readGeneration;
    status.textContent='Hämtar topplistan…';$('scores-refresh').disabled=true;
    try{
      let data=await (popularity?request('/stats?group='+page,refresh?{cache:'reload'}:{}):readBoard(this.selection,result));if(!current())return;
      if(popularity?data.group!==page||!Array.isArray(data.entries):!Array.isArray(data.scores))throw new Error('Invalid response');
      const oldRatings=popularity&&page==='exercises'&&data.ranking_method!=='top-five-game-percentiles-v1';
      if(oldRatings)data={...data,entries:data.entries.map(row=>({...row,rating:null,player_name:null,score:null}))};
      this.data=data;this.render();
      status.textContent=oldRatings?'Percentilrankningen kräver en uppdatering av topplistans server.':popularity?(data.entries.some(row=>row.plays>0)?'':'Inga sparade omgångar ännu.'):result&&data.rank==null?'Din placering kan inte hämtas just nu.':data.scores.length?'':'Bli först på topplistan!';
    }catch(error){if(current())status.textContent=popularity&&error.status===404?'Statistiken kräver en uppdatering av topplistans server.':error.code==='invalid_leaderboard'?error.message:'Topplistan kunde inte hämtas. Försök igen om en stund.';}
    finally{if(current())$('scores-refresh').disabled=false;}
  }
  async leave(action){
    if(!this.shownResult){action();return;}
    if(this.leaving)return;this.leaving=true;$('again').disabled=true;$('end-menu').disabled=true;
    try{if(!this.shownResult?.saved)await (this.pendingSave||this.submit());if(this.shownResult?.saved)action();}
    finally{this.leaving=false;$('again').disabled=false;$('end-menu').disabled=false;}
  }
  async submit(){
    const result=this.shownResult,token=this.view;
    if(!result||result.saved||result.pending||!result.id)return;
    const raw=$('score-name').value.normalize('NFC').trim(),name=raw.toUpperCase()||'ANONYM';
    if(!result.payload&&!policy.isBannedName(raw)&&!validName(name)){$('score-status').textContent='Skriv 1–10 bokstäver. Mellanslag går också bra.';return;}
    result.payload ||= {submission_id:result.id,leaderboard_key:storedKey(result.selection),player_name:name,score:result.score,settings:scoreSettings(result.selection)};
    result.pending=true;$('score-submit').disabled=true;$('score-name').readOnly=true;$('score-status').textContent='Sparar…';
    try{
      const data=policy.isBannedName(result.payload.player_name)?{ok:true}:await request('/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result.payload)});
      if(data.ok!==true)throw new Error('Invalid response');result.saved=true;
      if(this.shownResult===result&&token===this.view){$('score-status').textContent='Resultatet är sparat.';this.render();if(!this.leaving){$('again').focus();await this.load(token);}}
    }catch(error){
      if(token===this.view)$('score-status').textContent=error.status?error.message:'Det gick inte att bekräfta sparandet. Försök igen med samma smeknamn.';
    }finally{result.pending=false;if(this.shownResult===result&&token===this.view)$('score-submit').disabled=result.saved;}
  }
}
SC.Highscores=Highscores;SC.highscoreBoardKey=boardKey;
})(globalThis);
