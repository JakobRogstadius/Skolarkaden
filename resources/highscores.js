/* Shared, opt-in highscores. Gameplay and local records never wait for the API. */
(function(root){
'use strict';
const SC=root.Starlight, API='https://skolarkaden-api.jakob-rogstadius.workers.dev';
const $=id=>document.getElementById(id);
const policy=root.SkolarkadenHighscorePolicy;
const boardKey=selection=>[policy.versions[selection.kind],selection.kind,selection.mode,selection.pace].join(':');
const validName=name=>/^[\p{L}\p{M}\p{N} _.'’\-]{1,24}$/u.test(name);
async function request(path,options={}){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(API+path,{...options,signal:controller.signal,credentials:'omit'});
    if(!response.ok){
      const error=new Error(response.status===429?'Många resultat skickas just nu. Vänta en minut och försök igen.':
        response.status===409?'Det här resultatet har redan skickats med andra uppgifter.':
        'Topplistan kunde inte nås. Försök igen om en stund.');
      error.status=response.status;throw error;
    }
    return await response.json();
  }finally{clearTimeout(timeout);}
}
class Highscores{
  constructor({getSelection}){
    this.getSelection=getSelection;this.run=null;this.result=null;this.view=0;this.readGeneration=0;
    try{$('score-name').value=localStorage.getItem('skolarkaden-nickname-v1')||'';}catch(_){}
    $('leaderboard-open').addEventListener('click',()=>this.open(this.getSelection()));
    $('result-leaderboard').addEventListener('click',()=>{if(this.result)this.open(this.result.selection,this.result);});
    $('scores-refresh').addEventListener('click',()=>this.load(this.view));
    $('score-form').addEventListener('submit',e=>{e.preventDefault();this.submit();});
    $('leaderboard').addEventListener('close',()=>{this.view++;});
  }
  begin(selection){
    this.view++;this.result=null;
    this.run={selection:{...selection},id:root.crypto?.randomUUID?.()||null};
  }
  finish(score){
    this.result=this.run?{...this.run,score,saved:false,payload:null,pending:false}:null;
  }
  open(selection,result=null){
    this.selection={...selection};this.shownResult=result;
    const token=++this.view;
    $('leaderboard-context').textContent=selection.label;
    $('score-form').hidden=!result;
    $('score-to-share').textContent=result?result.score.toLocaleString('sv-SE')+' poäng':'';
    $('score-name').readOnly=Boolean(result?.payload);
    if(result?.payload)$('score-name').value=result.payload.player_name;
    $('score-submit').disabled=Boolean(result?.saved||result?.pending||!result?.id);
    $('score-status').textContent=result?.saved?'Resultatet är sparat.':result?.pending?'Sparar…':result&&!result.id?'Resultatet kan inte skickas från den här webbläsaren.':'';
    $('leaderboard').showModal();this.load(token);
  }
  async load(token){
    const board=boardKey(this.selection),generation=++this.readGeneration;
    const current=()=>token===this.view&&generation===this.readGeneration;
    $('scores-list').replaceChildren();$('scores-status').textContent='Hämtar topplistan…';$('scores-refresh').disabled=true;
    try{
      const data=await request('/scores?leaderboard='+encodeURIComponent(board));
      if(!current())return;
      if(!Array.isArray(data.scores))throw new Error('Invalid response');
      for(const row of data.scores){
        const item=document.createElement('li'),name=document.createElement('span'),score=document.createElement('strong');
        name.textContent=String(row.player_name);score.textContent=Number(row.score).toLocaleString('sv-SE');
        item.append(name,score);$('scores-list').append(item);
      }
      $('scores-status').textContent=data.scores.length?'':'Ingen har sparat ett resultat här ännu.';
    }catch(_){if(current())$('scores-status').textContent='Topplistan är inte tillgänglig just nu. Du kan fortsätta spela.';}
    finally{if(current())$('scores-refresh').disabled=false;}
  }
  async submit(){
    const result=this.shownResult,token=this.view;
    if(!result||result.saved||result.pending||!result.id)return;
    const name=$('score-name').value.normalize('NFC').trim();
    if(!policy.isBannedName(name)&&!validName(name)){$('score-status').textContent='Skriv ett smeknamn med 1–24 tecken. Använd bokstäver, siffror, mellanslag, punkt, bindestreck eller apostrof.';return;}
    // Freeze one payload per game: a timed-out response can safely be retried.
    result.payload ||= {submission_id:result.id,leaderboard_key:boardKey(result.selection),player_name:name,score:result.score};
    result.pending=true;$('score-submit').disabled=true;$('score-name').readOnly=true;$('score-status').textContent='Sparar…';
    try{
      const data=policy.isBannedName(result.payload.player_name)?{ok:true}:await request('/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result.payload)});
      if(data.ok!==true)throw new Error('Invalid response');
      result.saved=true;
      try{localStorage.setItem('skolarkaden-nickname-v1',result.payload.player_name);}catch(_){}
      if(this.shownResult===result&&$('leaderboard').open){$('score-status').textContent='Resultatet är sparat.';await this.load(this.view);}
    }catch(error){
      if(token===this.view)$('score-status').textContent=error.status?error.message:'Det gick inte att bekräfta sparandet. Försök igen med samma smeknamn.';
    }finally{
      result.pending=false;
      if(this.shownResult===result&&$('leaderboard').open)$('score-submit').disabled=result.saved;
    }
  }
}
SC.Highscores=Highscores;SC.highscoreBoardKey=boardKey;
})(globalThis);
