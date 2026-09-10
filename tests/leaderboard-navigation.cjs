'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),html=read('index.html');
let focused=null;
class Element extends EventTarget{
  constructor(){super();Object.assign(this,{children:[],textContent:'',value:'',hidden:false,open:false});}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(name,value){this[name]=value;}
  focus(){focused=this;}
  showModal(){this.open=true;}
  close(){this.open=false;this.dispatchEvent(new Event('close'));}
}
const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([,id])=>[id,new Element()]));
const get=id=>{assert(elements.has(id),'missing HTML element '+id);return elements.get(id);};
get('pace').options=Array.from(html.match(/<select id="pace">([\s\S]*?)<\/select>/)[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g),m=>({value:m[1],textContent:m[2]}));
const games=Object.fromEntries([...html.matchAll(/<label class="game-card[^\"]*">[\s\S]*?name="game" value="([^"]+)"[\s\S]*?class="card-title">([^<]+)<\/span><\/label>/g)].map(([,id,name])=>[id,name]));
assert.equal(Object.keys(games).length,9);
let delayed=false,failStats=false,unavailableStats=false,oldStats=false;const pending=[],requests=[],requestOptions=[],posts=[];
const context=vm.createContext({console,Event,EventTarget,crypto:webcrypto,AbortController,setTimeout,clearTimeout,
  document:{getElementById:get,createElement:()=>new Element(),get activeElement(){return focused;}},localStorage:{removeItem(){}},
  fetch:async(url,options={})=>{
    const parsed=new URL(url);requests.push(parsed);requestOptions.push(options);
    assert.notEqual(options.method,'POST','browsing never submits a score');
    if(options.method==='POST')posts.push(options);
    if(delayed)return new Promise(resolve=>pending.push({url:parsed,resolve}));
    if(parsed.pathname==='/stats'){
      if(unavailableStats)return Response.json({error:'not_found'},{status:404});
      if(failStats)throw Error('network');
      const group=parsed.searchParams.get('group'),ids=group==='games'?Object.keys(games):Object.keys(context.Starlight.modes);
      return Response.json({group,...(!oldStats?{ranking_method:'top-five-game-percentiles-v1'}:{}),entries:ids.map((id,i)=>({id,plays:i===0?42:0,player_name:i===0?'Åsa':null,score:i===0?500:null,...(!oldStats?{rating:i===0?68.125:null,sample_count:5}:{})}))});
    }
    return Response.json({leaderboard:parsed.searchParams.get('leaderboard').split(':').slice(0,2).join(':'),scores:[],rank:1});
  }});
for(const file of ['resources/data.js','resources/highscore-policy.js','resources/highscores.js'])vm.runInContext(read(file),context);
const selection={kind:'dinosaur',mode:'swedish',pace:'brave',label:games.dinosaur+' · Svenska ord - korta · Svår'};
const ui=new context.Starlight.Highscores({getSelection:()=>selection,games});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const click=async id=>{get(id).dispatchEvent(new Event('click'));await settle();};
const key=async (value,extra={})=>{const event=new Event('keydown',{cancelable:true});Object.assign(event,{key:value,...extra});get('leaderboard').dispatchEvent(event);await settle();return event;};
(async()=>{
  await click('leaderboard-open');assert.equal(ui.page,'dinosaur');assert.equal(get('leaderboard-title').textContent,'Topplista: '+games.dinosaur);
  assert.equal(get('scores-page').textContent,'6 / 11');
  const pages=[...Object.keys(games),'games','exercises'];
  for(let i=1;i<=pages.length;i++){
    await click('scores-next');assert.equal(ui.page,pages[(5+i)%pages.length]);
    if(Object.hasOwn(games,ui.page)){
      assert.equal(requests.at(-1).searchParams.get('leaderboard').split(':')[1],ui.page);
      assert.equal(get('leaderboard-title').textContent,'Topplista: '+games[ui.page]);
      assert.equal(get('scores-list').children.length,10);
    }else{
      assert.equal(requests.at(-1).pathname,'/stats');assert.equal(requests.at(-1).searchParams.get('group'),ui.page);
      assert.equal(get('scores-heading').children[2].textContent,'OMGÅNGAR');
      const list=get('scores-list'),count=ui.page==='games'?9:22;
      assert.equal(list.children.length,count,'popularity is not limited to ten rows');
      assert.equal(list.children[0].children[2].textContent,'42');assert.equal(list.children[0].children[3].textContent,'ÅSA');
      assert.equal(list.children[1].children[2].textContent,'0');assert.equal(list.children[1].children[3].textContent,'—');
      if(ui.page==='games'){
        assert.equal(get('scores-heading').children[4].textContent,'REKORD');assert.equal(list.children[0].children[4].textContent,'500');
      }else{
        assert.deepEqual(get('scores-heading').children.map(cell=>cell.textContent),['NR','ÖVNING','OMGÅNGAR','BÄSTA SPELARE']);
        assert(list.children.every(row=>row.children.length===4));assert.equal(list.children[0].children[3].title,undefined);
      }
    }
  }
  assert.equal(selection.kind,'dinosaur','browsing must not change the menu game');
  await ui.open({...selection,kind:'city'});
  assert((await key('ArrowLeft')).defaultPrevented);assert.equal(ui.page,'exercises');
  await key('ArrowLeft');assert.equal(ui.page,'games');await click('scores-previous');assert.equal(ui.page,'home');
  await key('ArrowRight');assert.equal(ui.page,'games');await key('ArrowRight');assert.equal(ui.page,'exercises');
  await key('ArrowRight');assert.equal(ui.page,'city');
  assert.equal((await key('ArrowLeft',{ctrlKey:true})).defaultPrevented,false);assert.equal(ui.page,'city');
  get('leaderboard').close();await click('scores-next');assert.equal(ui.page,'city');
  await click('leaderboard-open');assert.equal(ui.page,'dinosaur','reopening always starts with the menu game');
  await ui.open({...selection,kind:'city'});await ui.navigate(-1);
  unavailableStats=true;await ui.load(ui.view);assert.match(get('scores-status').textContent,/uppdatering/);
  unavailableStats=false;failStats=true;await ui.load(ui.view);assert.match(get('scores-status').textContent,/kunde inte hämtas/);
  failStats=false;await click('scores-refresh');assert.equal(get('scores-status').textContent,'');assert.equal(requestOptions.at(-1).cache,'reload');
  oldStats=true;await ui.load(ui.view);assert.match(get('scores-status').textContent,/uppdatering/);assert.equal(get('scores-list').children[0].children[3].textContent,'—');assert.equal(get('scores-list').children[0].children.length,4);assert.equal(get('scores-list').children[0].children[2].textContent,'42');oldStats=false;
  // Resolve older requests after newer pages: neither data nor errors may leak.
  delayed=true;const older=ui.open({...selection,kind:'city'}),newer=ui.navigate(-1);
  pending[1].resolve(Response.json({group:'exercises',ranking_method:'top-five-game-percentiles-v1',entries:[{id:'swedish',plays:5,player_name:'NY',score:null,rating:58,sample_count:5}]}));await newer;
  pending[0].resolve(Response.json({leaderboard:'v2:city',scores:[{player_name:'OLD',score:999}]}));await older;
  assert.equal(ui.page,'exercises');assert.equal(get('scores-list').children[0].children[3].textContent,'NY');
  const olderStats=ui.navigate(-1),newerGame=ui.navigate(2);
  pending[3].resolve(Response.json({leaderboard:'v2:city',scores:[]}));await newerGame;
  pending[2].resolve(Response.json({error:'not_found'},{status:404}));await olderStats;
  assert.equal(ui.page,'city');assert.equal(get('scores-list').children.length,10);assert.equal(get('scores-status').textContent,'Bli först på topplistan!');
  const closed=ui.navigate(1);get('leaderboard').close();const heading=get('leaderboard-title').textContent;
  pending[4].resolve(Response.json({scores:[{player_name:'CLOSED',score:123}]}));await closed;
  assert.equal(get('leaderboard-title').textContent,heading);assert.equal(get('scores-list').children[0].children[1].textContent,'—');
  delayed=false;ui.begin(selection);ui.finish(50);await ui.open(selection,ui.result);
  const count=requests.length;await click('scores-next');await key('ArrowLeft');
  assert.equal(ui.page,'dinosaur');assert.equal(requests.length,count,'end-game scoreboard cannot navigate');assert.equal(posts.length,0);
  assert.equal(get('end-scores-list').children[0].children[4].textContent,'50');
  console.log('PASS leaderboard navigation: menu order, arrows, wrapping, aggregates, reopen, races, errors and end-game isolation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
