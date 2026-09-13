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
const events=new EventTarget(),requests=[];let result,status=200,pending=null;
const context=vm.createContext({console,Intl,Date,URL,Event,EventTarget,AbortController,setTimeout,clearTimeout,
  document:{getElementById:get,createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)},
  addEventListener:(...args)=>events.addEventListener(...args),
  fetch:async(url,options)=>{requests.push({url,options});return pending?await pending:Response.json(result,{status});},
  localStorage:{getItem(){throw Error('statistics must not use storage');},setItem(){throw Error('statistics must not persist keys or IPs');}},
  sessionStorage:{getItem(){throw Error('statistics must not use storage');},setItem(){throw Error('statistics must not persist keys or IPs');}}
});
for(const file of ['resources/data.js','resources/language-exercises-data.js','resources/language-exercises.js','resources/statistics.js'])vm.runInContext(read(file),context);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const click=async id=>{get(id).dispatchEvent(new Event('click'));await settle();};
const login=async()=>{get('admin-key').value='test-key-not-a-real-credential';get('login').dispatchEvent(new Event('submit',{cancelable:true}));await settle();};
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
  status=503;result={error:'statistics_not_configured'};await click('refresh');assert.match(get('status').textContent,/inte aktiverad/);assert.equal(get('dashboard').hidden,false,'refresh failure retains the timestamped previous data');
  status=401;result={error:'unauthorized'};await click('refresh');assert.equal(get('dashboard').hidden,true);assert.equal(get('login').hidden,false);assert.equal(get('latest').children.length,0);assert.match(get('status').textContent,/Fel administratörsnyckel/);assert.equal(get('login-button').disabled,false);
  status=200;result={days,generated_at:'2026-09-13T10:00:00Z',unique_ips_ever:0,unique_ips_week:0,scores_week:0,scores_without_ip_week:0,latest:[],daily:[],top_ips:[]};
  await login();assert.equal(get('scores-week').textContent,'0');assert.match(get('latest').textContent,/Inga resultat/);assert.match(get('chart-ip').textContent,/Inga inskickade/);
  await click('logout');assert.equal(get('dashboard').hidden,true);assert.equal(get('chart-ip').children.length,0);assert.equal(get('ips-ever').textContent,'');
  let resolve;pending=new Promise(done=>{resolve=done;});await login();await click('logout');resolve(Response.json(result));await settle();assert.equal(get('dashboard').hidden,true,'late requests cannot restore data after logout');pending=null;
  await login();events.dispatchEvent(new Event('pagehide'));assert.equal(get('dashboard').hidden,true);assert.equal(get('chart-game').children.length,0,'back/forward cache never retains rendered IP data');
  console.log('PASS statistics page: counts/charts/labels, overflow grouping with exact tables, zero days, safe names, authentication errors, logout and stale-request handling.');
})().catch(error=>{console.error(error);process.exitCode=1;});
