(function(root){
'use strict';
const SC=root.Starlight,$=id=>document.getElementById(id),api='https://skolarkaden-api.jakob-rogstadius.workers.dev/admin/stats';
const games={city:'Meteorregn',food:'Laga mat',garden:'Odla blommor',hive:'Bikupan',paint:'Färgballonger',dinosaur:'Hungrig dinosaurie',marshmallows:'Marshmallows',eggs:'Äggröra',home:'Städa hemmet'};
const difficulties={gentle:'Lätt',steady:'Medel',brave:'Svår'},number=new Intl.NumberFormat('sv-SE');
const palette=['#287d68','#647ac0','#d39536','#a76fba','#c5685c','#42a6a0','#a48b4d','#738855','#c67f9c','#557f98','#8a6855','#777777'];
const color=index=>palette[index]||'hsl('+Math.round(index*137.508%360)+' 48% '+(38+index%3*10)+'%)';
let key='',controller=null,generation=0,renameController=null;
const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const svg=(tag,attributes={},text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,value);if(text!==undefined)node.textContent=text;return node;};
const label=(dimension,id)=>dimension==='ip'?(id||'IP saknas'):dimension==='game'?(games[id]||id||'Spel saknas'):(SC.modes[SC.canonicalLesson(id)]?.name||id||'Övning saknas');
const timestamp=value=>{if(!value)return '—';const date=new Date(value.includes('T')?value:value.replace(' ','T')+'Z');return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(date);};
const dayLabel=day=>new Intl.DateTimeFormat('sv-SE',{timeZone:'UTC',weekday:'short',day:'numeric',month:'numeric'}).format(new Date(day+'T12:00:00Z'));
function emptyRow(target,columns,text){const row=element('tr'),cell=element('td',text,'empty');cell.colSpan=columns;row.append(cell);target.append(row);}
function latestRows(rows){
  const target=$('latest');target.replaceChildren();
  for(const row of rows){
    const tr=element('tr');
    for(const [value,className]of [[timestamp(row.created_at),'time'],[row.player_name,'nowrap'],[row.ip||'IP saknas','mono'],[label('game',row.game)],[label('exercise',row.exercise)],[difficulties[row.difficulty]||row.difficulty],[number.format(row.score),'number']])tr.append(element('td',value,className));
    target.append(tr);
  }
  if(!rows.length)emptyRow(target,7,'Inga resultat har skickats in ännu.');
}
function ipRows(rows){
  const target=$('top-ips');target.replaceChildren();
  rows.forEach((row,index)=>{
    const tr=element('tr'),names=element('td'),list=element('div',undefined,'names');
    for(const user of row.usernames){const name=element('span',user.player_name||'ANONYM','name');name.append(element('small','('+number.format(user.plays)+')'));list.append(name);}
    names.append(list);tr.append(element('td',index+1,'number'),element('td',row.ip,'mono'),names,element('td',number.format(row.plays),'number'),element('td',timestamp(row.last_played),'time'));target.append(tr);
  });
  if(!rows.length)emptyRow(target,5,'Inga resultat med registrerad IP-adress senaste veckan.');
}
function drawChart(target,dimension,data){
  target.replaceChildren();const categories=new Map(),days=data.days;
  for(const row of data.daily.filter(row=>row.dimension===dimension)){
    if(!categories.has(row.category))categories.set(row.category,{id:row.category,total:0,counts:days.map(()=>0)});
    const category=categories.get(row.category),index=days.indexOf(row.day);
    if(index>=0){category.total+=row.plays;category.counts[index]+=row.plays;}
  }
  const all=[...categories.values()].sort((a,b)=>b.total-a.total||String(a.id).localeCompare(String(b.id),'sv'));
  let series=all;
  if(dimension==='ip'&&all.length>10){
    const others={id:'other',name:'Övriga IP-adresser',total:0,counts:days.map(()=>0)};
    for(const category of all.slice(10)){others.total+=category.total;category.counts.forEach((count,i)=>others.counts[i]+=count);}
    series=[...all.slice(0,10),others];
  }
  const totals=days.map((_,i)=>all.reduce((sum,category)=>sum+category.counts[i],0)),maximum=Math.max(1,...totals);
  const magnitude=10**Math.floor(Math.log10(maximum/4)),step=Math.max(1,[1,2,5,10].map(n=>n*magnitude).find(n=>n>=maximum/4)),ceiling=Math.ceil(maximum/step)*step;
  const chart=svg('svg',{viewBox:'0 0 420 245',class:'chart',role:'img','aria-label':'Inskickade resultat per dag, fördelat på '+({ip:'IP-adress',game:'spel',exercise:'övning'}[dimension])});
  chart.append(svg('title',{},days.map((day,i)=>day+': '+totals[i]+' resultat').join('; ')));
  const left=38,top=25,height=178,width=370,slot=width/7;
  for(let tick=0;tick<=ceiling;tick+=step){const y=top+height-height*tick/ceiling;chart.append(svg('line',{x1:left,y1:y,x2:410,y2:y,class:'grid'}),svg('text',{x:left-7,y:y+4,'text-anchor':'end'},number.format(tick)));}
  days.forEach((day,index)=>{
    let used=0;const x=left+slot*(index+.2),barWidth=slot*.6;
    series.forEach((category,i)=>{
      const count=category.counts[index];if(!count)return;const size=height*count/ceiling,y=top+height-height*(used+count)/ceiling;
      const text=dayLabel(day)+' · '+(category.name||label(dimension,category.id))+': '+number.format(count);
      const rect=svg('rect',{x,y,width:barWidth,height:size,fill:color(i),tabindex:'0',role:'img','aria-label':text});rect.append(svg('title',{},text));chart.append(rect);used+=count;
    });
    chart.append(svg('text',{x:x+barWidth/2,y:top+height-height*used/ceiling-7,'text-anchor':'middle',class:'total'},number.format(totals[index])));
    chart.append(svg('text',{x:x+barWidth/2,y:top+height+22,'text-anchor':'middle'},day.slice(8)+'/'+Number(day.slice(5,7))));
  });
  target.append(chart);
  const legend=element('ul',undefined,'legend');
  series.forEach((category,i)=>{const li=element('li'),swatch=svg('svg',{class:'swatch',viewBox:'0 0 10 10','aria-hidden':'true'});swatch.append(svg('rect',{width:10,height:10,rx:2,fill:color(i)}));li.append(swatch,element('span',category.name||label(dimension,category.id),'legend-label'),element('span',number.format(category.total),'legend-count'));legend.append(li);});
  target.append(legend);
  if(!all.length)target.append(element('p','Inga inskickade resultat senaste veckan.','chart-note'));
  if(dimension==='ip'&&all.length>10)target.append(element('p','De tio största grupperna visas separat. Alla IP-adresser finns i tabellen.','chart-note'));
  const details=element('details',undefined,'chart-details'),scroll=element('div',undefined,'table-scroll'),table=element('table'),head=element('thead'),headRow=element('tr'),body=element('tbody');
  details.append(element('summary','Visa värden som tabell'));
  for(const value of ['Kategori',...days.map(day=>day.slice(8)+'/'+Number(day.slice(5,7))),'Totalt']){const th=element('th',value);th.scope='col';headRow.append(th);}head.append(headRow);
  for(const category of all){const tr=element('tr'),th=element('th',label(dimension,category.id));th.scope='row';tr.append(th);for(const count of [...category.counts,category.total])tr.append(element('td',number.format(count),'number'));body.append(tr);}
  const totalRow=element('tr'),totalLabel=element('th','Totalt');totalLabel.scope='row';totalRow.append(totalLabel);for(const count of [...totals,data.scores_week])totalRow.append(element('td',number.format(count),'number'));body.append(totalRow);
  table.append(head,body);scroll.append(table);details.append(scroll);target.append(details);
}
function render(data){
  $('ips-ever').textContent=number.format(data.unique_ips_ever);$('ips-week').textContent=number.format(data.unique_ips_week);$('scores-week').textContent=number.format(data.scores_week);
  $('missing-ips').textContent=data.scores_without_ip_week?number.format(data.scores_without_ip_week)+' resultat saknar IP-adress':'Inklusive anonyma resultat';
  $('period').textContent=dayLabel(data.days[0])+' – '+dayLabel(data.days[6])+' '+data.days[6].slice(0,4);
  $('updated').textContent='Uppdaterad '+timestamp(data.generated_at);
  latestRows(data.latest);ipRows(data.top_ips);for(const dimension of ['ip','game','exercise'])drawChart($('chart-'+dimension),dimension,data);
}
function clear(){
  key='';generation++;controller?.abort();controller=null;$('admin-key').value='';$('dashboard').hidden=true;$('actions').hidden=true;$('login').hidden=false;
  renameController?.abort();renameController=null;$('rename-fields').disabled=false;
  for(const id of ['rename-ip','rename-old-name','rename-new-name'])$(id).value='';
  $('rename-status').textContent='';$('rename-status').className='';
  for(const id of ['latest','top-ips','chart-ip','chart-game','chart-exercise','ips-ever','ips-week','scores-week','period','updated','missing-ips'])$(id).replaceChildren();
  $('status').textContent='';$('status').className='';$('login-button').disabled=false;$('refresh').disabled=false;
}
async function load(){
  controller?.abort();controller=new AbortController();const current=++generation,signal=controller.signal,timeout=setTimeout(()=>controller?.signal===signal&&controller.abort(),20000);
  let failure='Statistiken kunde inte hämtas. Försök igen.';
  $('login-button').disabled=true;$('refresh').disabled=true;$('status').className='';$('status').textContent='Hämtar statistik…';
  try{
    const response=await fetch(api,{headers:{Authorization:'Bearer '+key},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal});
    const data=await response.json();if(current!==generation)return;
    if(!response.ok){
      if(response.status===401){clear();$('status').className='error';$('status').textContent='Fel administratörsnyckel. Försök igen.';$('admin-key').focus();return;}
      failure=data.error==='statistics_not_configured'?'Statistiken är inte aktiverad på servern.':data.error==='statistics_key_too_short'?'Administratörsnyckeln på servern måste vara minst 12 tecken.':response.status===404?'Servern behöver uppdateras för att visa statistiken.':failure;
      throw new Error('statistics_unavailable');
    }
    render(data);$('login').hidden=true;$('dashboard').hidden=false;$('actions').hidden=false;$('status').textContent='';
  }catch(error){
    if(current!==generation)return;
    $('status').className='error';$('status').textContent=error.name==='AbortError'?'Hämtningen tog för lång tid. Försök igen.':failure;
    if(!key)$('admin-key').focus();
  }finally{clearTimeout(timeout);if(current===generation){controller=null;$('login-button').disabled=false;$('refresh').disabled=false;}}
}
async function rename(){
  if(!key||renameController||$('dashboard').hidden)return;
  const ip=$('rename-ip').value.trim(),oldName=$('rename-old-name').value,newName=$('rename-new-name').value.normalize('NFC').trim().toUpperCase(),status=$('rename-status');
  status.className='';
  if(!ip||!oldName.trim()||!newName){status.className='error';status.textContent='Fyll i IP-adress, nuvarande namn och nytt namn.';return;}
  if(!/^[\p{L}\p{M} ]{1,10}$/u.test(newName)){status.className='error';status.textContent='Det nya namnet får innehålla högst 10 bokstäver och mellanslag.';return;}
  // Invalidate an older statistics read so it cannot overwrite the renamed rows.
  controller?.abort();controller=null;generation++;
  $('status').textContent='';$('status').className='';
  const request=renameController=new AbortController(),submittedKey=key,timeout=setTimeout(()=>request.abort(),20000);
  const active=()=>renameController===request&&key===submittedKey;
  $('rename-fields').disabled=true;$('refresh').disabled=true;status.textContent='Byter namn…';
  const unconfirmed='Bytet kunde inte bekräftas. Uppdatera statistiken för att kontrollera namnet innan du försöker igen.';
  try{
    const response=await fetch(api.replace('/admin/stats','/admin/rename'),{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({ip,old_name:oldName,new_name:newName}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:request.signal});
    const data=await response.json();if(!active())return;
    if(response.status===401){clear();$('status').className='error';$('status').textContent='Fel administratörsnyckel. Logga in igen.';$('admin-key').focus();return;}
    if(!response.ok){
      const messages={invalid_ip:'Ange IP-adressen som den visas i tabellen.',invalid_old_name:'Ange det nuvarande namnet exakt som det visas i tabellen.',invalid_new_name:'Det nya namnet får innehålla högst 10 bokstäver och mellanslag.',name_not_allowed:'Det nya namnet är inte tillåtet. Välj ett annat namn.',name_unchanged:'Det nya namnet är samma som det nuvarande.',statistics_not_configured:'Statistiken är inte aktiverad på servern.',statistics_key_too_short:'Administratörsnyckeln på servern måste vara minst 12 tecken.'};
      status.className='error';status.textContent=response.status===404?'Servern behöver uppdateras för att kunna byta namn.':messages[data.error]||unconfirmed;return;
    }
    if(data.ok!==true||!Number.isSafeInteger(data.updated)||data.updated<0||data.new_name!==newName)throw new Error('invalid_rename_response');
    status.textContent=data.updated?number.format(data.updated)+' resultat bytte namn från '+oldName+' till '+data.new_name+'.':'Inga resultat matchade IP-adressen och det nuvarande namnet.';
    if(data.updated)await load();
  }catch(error){if(active()){status.className='error';status.textContent=unconfirmed;}}
  finally{clearTimeout(timeout);if(active()){renameController=null;$('rename-fields').disabled=false;$('refresh').disabled=false;}}
}
$('login').addEventListener('submit',event=>{event.preventDefault();key=$('admin-key').value.trim();$('admin-key').value='';if(key)load();});
$('rename-form').addEventListener('submit',event=>{event.preventDefault();rename();});
$('refresh').addEventListener('click',()=>load());$('logout').addEventListener('click',()=>{clear();$('admin-key').focus();});
// Clear secrets and rendered IPs before a page can enter the back/forward cache.
root.addEventListener('pagehide',clear);
})(globalThis);
