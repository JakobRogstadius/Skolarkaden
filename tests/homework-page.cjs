'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),dictionary=JSON.parse(read('homework.json')),html=read('homework.html');
class Element extends EventTarget{
  constructor(tag='div'){super();this.tagName=tag;this.children=[];this.attributes={};this.ownText='';}
  set textContent(text){this.ownText=String(text);this.children=[];}get textContent(){return this.ownText+this.children.map(c=>c.textContent).join('');}
  append(...children){this.children.push(...children);}replaceChildren(...children){this.ownText='';this.children=children;}setAttribute(key,value){this.attributes[key]=value;}
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function boot(lessons=dictionary){
  const fields={status:new Element(),lessons:new Element()},events=new EventTarget(),requests=[];
  let counts={group:'homework',entries:[{id:'lesson-1',completions:12},{id:'deleted',completions:99}]},countStatus=200;
  const ctx=vm.createContext({console,URLSearchParams,AbortController,setTimeout,clearTimeout,document:{getElementById:id=>fields[id],createElement:tag=>new Element(tag)},addEventListener:(...args)=>events.addEventListener(...args),fetch:async(url,options)=>{requests.push({url,options});return url==='homework.json'?Response.json(lessons):Response.json(counts,{status:countStatus});}});
  for(const [,url]of html.matchAll(/<script defer src="([^"]+)"/g))vm.runInContext(read(url.split('?')[0]),ctx);
  return {fields,requests,events,set counts(value){counts=value;},set countStatus(value){countStatus=value;}};
}
(async()=>{
  assert(!/homework\.html/.test(read('index.html')),'lesson navigation remains hidden from the ordinary menu');
  const app=boot();await settle();const rows=app.fields.lessons.children;
  assert.equal(rows.length,7);assert.equal(app.fields.status.textContent,'');
  for(const [i,[id,lesson]]of Object.entries(dictionary).entries()){
    const details=rows[i],summary=details.children[0];assert.equal(details.tagName,'details');assert.equal(summary.children[0].textContent,lesson.name);
    assert.equal(summary.children[1].textContent,(i===0?'12':'0')+' genomförda');
    for(const [j,input]of ['keyboard','voice'].entries()){const link=summary.children[j+2];assert.equal(link.textContent,j===0?'skriva':'tala');assert.equal(link.href,'index.html?mode=homework&id='+id+'&input='+input);}
    const body=details.children[1].children[0].children[1];assert.deepEqual(body.children.map(row=>row.children.map(cell=>cell.textContent)),lesson.words);
  }
  app.counts={group:'homework',entries:[{id:'lesson-1',completions:13}]};const shown=new Event('pageshow');shown.persisted=true;app.events.dispatchEvent(shown);await settle();assert.equal(rows[0].children[0].children[1].textContent,'13 genomförda','returning from a game refreshes totals');
  app.countStatus=400;app.events.dispatchEvent(shown);await settle();assert.match(app.fields.status.textContent,/kunde inte hämtas/);assert.equal(rows[0].children[0].children[1].textContent,'— genomförda','an unavailable API must not invent a zero');assert.equal(app.fields.lessons.children.length,7);
  const unsafe=boot({'z&input=voice':{name:'<img onerror=alert(1)>',input:'keyboard',language:'sv-SE',words:[['<script>']]},'a':{input:'keyboard',language:'sv-SE',words:[['hej']]}});await settle();const summary=unsafe.fields.lessons.children[0].children[0];assert.equal(summary.children[0].textContent,'<img onerror=alert(1)>');assert.equal(summary.children[0].children.length,0);assert.equal(summary.children[2].href,'index.html?mode=homework&id=z%26input%3Dvoice&input=keyboard');assert.equal(unsafe.fields.lessons.children[1].children[0].children[0].textContent,'a','dictionary order is retained');
  for(const bad of [[],null,{broken:{input:'voice',language:'zh-TW',words:[['你']]}}]){const broken=boot(bad);await settle();assert.equal(broken.fields.lessons.children.length,0);assert(broken.fields.status.textContent);}
  console.log('PASS homework page: file order, expandable contents, safe links/text, completion totals, refresh on return and recoverable API errors.');
})().catch(error=>{console.error(error);process.exitCode=1;});
