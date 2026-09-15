'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
class Element extends EventTarget{
  constructor(tag='div'){super();this.tagName=tag;this.children=[];this.attributes={};this.hidden=false;this.disabled=false;this.value='';this.ownText='';}
  set textContent(text){this.ownText=String(text);this.children=[];}get textContent(){return this.ownText+this.children.map(child=>child.textContent).join('');}
  append(...children){this.children.push(...children);}replaceChildren(...children){this.ownText='';this.children=children;}
  setAttribute(name,value){this.attributes[name]=String(value);}focus(){this.focused=true;}
}
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
get('dashboard').hidden=true;get('actions').hidden=true;
const events=new EventTarget(),requests=[];let result,status=200,pending=null,renameResult,renameStatus=200,renamePending=null,renameFailure=false;
const context=vm.createContext({console,Intl,Date,URL,Event,EventTarget,AbortController,setTimeout,clearTimeout,
  document:{getElementById:get,createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)},
  addEventListener:(...args)=>events.addEventListener(...args),
  fetch:async(url,options)=>{requests.push({url,options});if(options.method==='POST'){if(renameFailure)throw Error('network');return renamePending?await renamePending:Response.json(renameResult,{status:renameStatus});}return pending?await pending:Response.json(result,{status});},
  localStorage:{getItem(){throw Error('statistics must not use storage');},setItem(){throw Error('statistics must not persist keys or IPs');}},
  sessionStorage:{getItem(){throw Error('statistics must not use storage');},setItem(){throw Error('statistics must not persist keys or IPs');}}
});
for(const file of ['resources/data.js','resources/language-exercises-data.js','resources/language-exercises.js','resources/homework.js','resources/statistics.js'])vm.runInContext(read(file),context);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const click=async id=>{get(id).dispatchEvent(new Event('click'));await settle();};
const login=async()=>{get('admin-key').value='test-key-not-a-real-credential';get('login').dispatchEvent(new Event('submit',{cancelable:true}));await settle();};
const rename=async()=>{get('rename-form').dispatchEvent(new Event('submit',{cancelable:true}));await settle();};
const descendants=node=>[node,...node.children.flatMap(descendants)];
(async()=>{
  assert.equal(requests.length,0,'opening the page does not request statistics');
  const days=Array.from({length:7},(_,i)=>'2026-09-'+String(i+7).padStart(2,'0'));
  result={days,generated_at:'2026-09-13T10:00:00Z',unique_ips_ever:32,unique_ips_week:12,scores_week:12,scores_without_ip_week:0,
    latest:[{created_at:'2026-09-12 22:00:00',player_name:'<svg onload=alert(1)>',ip:'2001:db8::1',game:'city',exercise:'math',difficulty:'gentle',score:200}],
    daily:[...Array.from({length:12},(_,i)=>({day:days[0],dimension:'ip',category:'192.0.2.'+i,plays:1})),{day:days[0],dimension:'game',category:'city',plays:12},{day:days[0],dimension:'exercise',category:'swedish',plays:12}],
    top_ips:[{ip:'2001:db8::1',plays:12,last_played:'2026-09-12 22:00:00',usernames:[{player_name:'<svg onload=alert(1)>',plays:12}]}]};
  await login();assert.equal(get('login').hidden,true);assert.equal(get('dashboard').hidden,false);assert.equal(get('admin-key').value,'');
  const sent=requests.at(-1);assert.equal(sent.options.headers.Authorization,'Bearer test-key-not-a-real-credential');assert.equal(sent.options.cache,'no-store');assert.equal(sent.options.credentials,'omit');assert(!sent.url.includes('test-key'));
  assert.equal(get('ips-ever').textContent,'32');assert.equal(get('ips-week').textContent,'12');assert.equal(get('scores-week').textContent,'12');
  const cells=get('latest').children[0].children;assert.equal(cells[0].textContent,'2026-09-13 00:00:00');assert.equal(cells[3].textContent,'Meteorregn');assert.equal(cells[4].textContent,'Matematik 1 (+)');assert.equal(cells[5].textContent,'Lätt');
  assert.equal(cells[1].textContent,'<svg onload=alert(1)>');assert.equal(cells[1].children.length,0,'names are text, never executable markup');
  assert(!descendants(get('top-ips')).some(node=>node.tagName==='svg'),'username grouping also renders text safely');
  for(const dimension of ['ip','game','exercise']){
    const chart=get('chart-'+dimension),totals=descendants(chart).filter(node=>node.tagName==='text'&&node.attributes.class==='total');
    assert.deepEqual(totals.map(node=>node.textContent),['12','0','0','0','0','0','0']);
    const barCounts=descendants(chart).filter(node=>node.tagName==='rect'&&node.attributes.role==='img').map(node=>Number(node.attributes['aria-label'].split(': ').at(-1)));
    assert.equal(barCounts.reduce((a,b)=>a+b,0),12,'stacked bars preserve every score');
  }
  const chart=get('chart-ip'),legend=chart.children.find(node=>node.className==='legend');assert.equal(legend.children.length,11);assert.match(legend.textContent,/Övriga IP-adresser2/);
  assert.equal(descendants(chart).find(node=>node.tagName==='tbody').children.length,13,'expandable table retains all twelve IPs and the total');
  let requestCount=requests.length;await rename();assert.equal(requests.length,requestCount,'blank fields cannot send a rename');
  get('rename-ip').value='2001:db8::1';get('rename-old-name').value='<svg onload=alert(1)>';get('rename-new-name').value='Å.SA';
  await rename();assert.equal(requests.length,requestCount,'invalid replacement characters are rejected before sending');
  get('rename-new-name').value=' åsa ';renameResult={ok:true,updated:2,new_name:'ÅSA'};result.latest[0].player_name='ÅSA';result.top_ips[0].usernames[0].player_name='ÅSA';
  await rename();assert.equal(requests.length,requestCount+2,'successful changes refresh the statistics exactly once');
  const post=requests.at(-2);assert.equal(post.options.method,'POST');assert(post.url.endsWith('/admin/rename'));assert.equal(post.options.headers.Authorization,sent.options.headers.Authorization);assert.equal(post.options.headers['Content-Type'],'application/json');
  assert.deepEqual(JSON.parse(post.options.body),{ip:'2001:db8::1',old_name:'<svg onload=alert(1)>',new_name:'ÅSA'});
  assert.equal(get('latest').children[0].children[1].textContent,'ÅSA');assert.equal(get('rename-status').children.length,0,'status inserts old names as text');assert.match(get('rename-status').textContent,/2 resultat bytte namn/);assert.equal(get('rename-fields').disabled,false);
  requestCount=requests.length;renameResult={ok:true,updated:0,new_name:'ÅSA'};await rename();assert.equal(requests.length,requestCount+1);assert.match(get('rename-status').textContent,/Inga resultat matchade/);
  renameStatus=400;renameResult={error:'name_not_allowed'};await rename();assert.match(get('rename-status').textContent,/inte tillåtet/);assert.equal(get('rename-fields').disabled,false);renameStatus=200;
  renameFailure=true;requestCount=requests.length;await rename();assert.equal(requests.length,requestCount+1,'a write is never retried automatically');assert.match(get('rename-status').textContent,/kunde inte bekräftas/);assert.equal(get('refresh').disabled,false);renameFailure=false;
  // A read started before renaming cannot restore stale names after the update.
  let resolveRead;pending=new Promise(resolve=>{resolveRead=resolve;});await click('refresh');pending=null;
  renameResult={ok:true,updated:1,new_name:'ÅSA'};await rename();resolveRead(Response.json({...result,latest:[{...result.latest[0],player_name:'STALE'}]}));await settle();assert.equal(get('latest').children[0].children[1].textContent,'ÅSA');
  // Duplicate submits and responses arriving after logout cannot apply another UI change.
  let resolveRename;renamePending=new Promise(resolve=>{resolveRename=resolve;});requestCount=requests.length;await rename();assert.equal(get('rename-fields').disabled,true);await rename();assert.equal(requests.length,requestCount+1);
  await click('logout');assert.equal(get('rename-ip').value,'');assert.equal(get('rename-old-name').value,'');assert.equal(get('rename-new-name').value,'');assert.equal(get('rename-status').textContent,'');assert.equal(get('rename-fields').disabled,false);
  resolveRename(Response.json(renameResult));await settle();assert.equal(get('dashboard').hidden,true);assert.equal(requests.length,requestCount+1,'late write responses do not trigger a refresh after logout');renamePending=null;
  await login();get('rename-ip').value='192.0.2.1';get('rename-old-name').value='ADA';get('rename-new-name').value='BO';renameStatus=401;renameResult={error:'unauthorized'};await rename();assert.equal(get('dashboard').hidden,true);assert.equal(get('rename-ip').value,'');assert.match(get('status').textContent,/Logga in igen/);renameStatus=200;
  await login();
  status=503;result={error:'statistics_not_configured'};await click('refresh');assert.match(get('status').textContent,/inte aktiverad/);assert.equal(get('dashboard').hidden,false,'refresh failure retains the timestamped previous data');
  result={error:'statistics_key_too_short'};await click('refresh');assert.equal(get('status').textContent,'Administratörsnyckeln på servern måste vara minst 12 tecken.');
  status=401;result={error:'unauthorized'};await click('refresh');assert.equal(get('dashboard').hidden,true);assert.equal(get('login').hidden,false);assert.equal(get('latest').children.length,0);assert.match(get('status').textContent,/Fel administratörsnyckel/);assert.equal(get('login-button').disabled,false);
  status=200;result={days,generated_at:'2026-09-13T10:00:00Z',unique_ips_ever:0,unique_ips_week:0,scores_week:0,scores_without_ip_week:0,latest:[],daily:[],top_ips:[]};
  await login();assert.equal(get('scores-week').textContent,'0');assert.match(get('latest').textContent,/Inga resultat/);assert.match(get('chart-ip').textContent,/Inga inskickade/);
  await click('logout');assert.equal(get('dashboard').hidden,true);assert.equal(get('chart-ip').children.length,0);assert.equal(get('ips-ever').textContent,'');
  let resolve;pending=new Promise(done=>{resolve=done;});await login();await click('logout');resolve(Response.json(result));await settle();assert.equal(get('dashboard').hidden,true,'late requests cannot restore data after logout');pending=null;
  await login();events.dispatchEvent(new Event('pagehide'));assert.equal(get('dashboard').hidden,true);assert.equal(get('chart-game').children.length,0,'back/forward cache never retains rendered IP data');
  console.log('PASS statistics page: counts/charts/labels, overflow grouping with exact tables, zero days, safe names, authentication errors, logout and stale-request handling.');
})().catch(error=>{console.error(error);process.exitCode=1;});
