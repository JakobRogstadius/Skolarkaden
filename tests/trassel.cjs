'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({console,performance,Event,EventTarget,CustomEvent:class extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}});
for(const name of ['data','language-exercises-data','language-exercises','homework','input','klossar','trassel-engine','trassel-layouts','trassel'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+name+'.js'),'utf8'),context);
const SC=context.Starlight,E=SC.TrasselEngine,plain=v=>JSON.parse(JSON.stringify(v));
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function done(search){let r;do{r=search.next();}while(!r.done);return r.value;}
function setup(options={},seed=9){const events=[],g=new SC.TrasselGame({random:rng(seed),onEvent:e=>events.push(e)});g.start(options);done(g.search);return {g,events};}
function draw(g,path){assert(g.begin(path[0]));for(const id of path.slice(1))assert(g.move(id));g.release();}

// An independent exhaustive oracle checks both infeasibility and exact minima,
// including interchangeable answers; it does not use the solver's search logic.
function brute(board,tiles){
  const adj=E.graph(board),ends=new Set(tiles.map(t=>t.id)),sources=tiles.filter(t=>t.side==='problem'),targets=tiles.filter(t=>t.side==='answer');let best=Infinity;
  function connect(i,occupied,answers,cost){
    if(cost>=best)return;if(i===sources.length){best=cost;return;}
    const start=sources[i].id;
    function walk(p){const v=p.at(-1);if(cost+p.length>=best)return;
      if(v!==start&&ends.has(v)){
        const answer=targets.find(t=>t.id===v);if(answer&&answer.key===sources[i].key&&!answers.has(v))connect(i+1,new Set([...occupied,...p]),new Set([...answers,v]),cost+p.length);return;
      }
      for(const n of adj[v])if(!occupied.has(n)&&!p.includes(n))walk([...p,n]);
    }
    walk([start]);
  }
  connect(0,new Set(),new Set(),0);return best;
}
for(let seed=1;seed<=150;seed++){
  const random=rng(seed),board=E.hex(1),adj=E.graph(board),ids=board.cells.map(c=>c.id).sort(()=>random()-.5).slice(0,4);
  board.walls=adj.flatMap((ns,a)=>ns.filter(b=>a<b&&random()<.18).map(b=>E.edge(a,b)));
  const tiles=ids.map((id,i)=>({id,side:i%2?'answer':'problem',key:seed%2?0:i>>1})),expected=brute(board,tiles),actual=done(E.solve(board,tiles));
  assert.equal(actual.status,Number.isFinite(expected)?'solved':'impossible');if(Number.isFinite(expected))assert.equal(actual.cost,expected);
}
console.log('PASS exact optimum and impossible boards against exhaustive enumeration');

// The forest shortcut must agree with enumeration for both valid pairings and
// bottlenecks where two otherwise reachable connections cannot coexist.
for(let seed=1;seed<=80;seed++){
  const random=rng(seed),board=E.hex(1),adj=E.graph(board),parent=board.cells.map(c=>c.id),find=a=>parent[a]===a?a:find(parent[a]);
  const edges=adj.flatMap((ns,a)=>ns.filter(b=>a<b).map(b=>[a,b])).map(pair=>({pair,r:random()})).sort((a,b)=>a.r-b.r),open=new Set();
  for(const {pair:[a,b]} of edges)if(find(a)!==find(b)&&random()<.9){parent[find(a)]=find(b);open.add(E.edge(a,b));}
  board.walls=edges.map(({pair:[a,b]})=>E.edge(a,b)).filter(e=>!open.has(e));
  const ids=board.cells.map(c=>({id:c.id,r:random()})).sort((a,b)=>a.r-b.r).slice(0,4).map(c=>c.id),tiles=ids.map((id,i)=>({id,side:i%2?'answer':'problem',key:seed%2?0:i>>1}));
  const expected=brute(board,tiles),result=done(E.solve(board,tiles));
  assert.equal(result.status,Number.isFinite(expected)?'solved':'impossible');
  if(Number.isFinite(expected)){assert.equal(result.cost,expected);assert.equal(done(E.solve(board,tiles,[{path:result.paths[0]}])).cost,expected);}
}
console.log('PASS forest solvability and optimum against exhaustive enumeration');

// A and B are individually viable but mutually incompatible. C is newer than
// both, is innocent, and must be restored after the older conflict is found.
const board=E.hex(3);board.walls=['31:35','26:31','13:19','13:20'];
const tiles=[25,15,26,6,21,29,3,18].map((id,i)=>({id,key:i>>1,side:i%2?'answer':'problem',item:{label:String(i>>1)}}));
const paths=[[25,31,30,24,17,10,4,9,15],[26,20,19,12,11,5,6],[21,27,32,36,35,34,29]];
const lines=paths.map((path,i)=>({id:i,order:i,path,color:SC.trasselColors[i]}));
for(const l of lines)assert.equal(done(E.solve(board,tiles,[l])).status,'solved');
assert.equal(done(E.solve(board,tiles,lines)).status,'impossible');
assert.deepEqual(plain(done(E.hint(board,tiles,lines)).bad),[1]);
assert.deepEqual(plain(done(E.hint(board,tiles,[{...lines[0],order:1},{...lines[1],order:0},lines[2]])).bad),[0]);
assert.equal(done(E.hint(board,tiles,lines,{budget:{remaining:0}})).status,'unknown','a search limit must never claim impossibility');
{
  const {g}=setup();g.board=board;g.tiles=tiles;g.tileById=new Map(tiles.map(t=>[t.id,t]));g.adj=E.graph(board);g.lines=lines.map(l=>({...l,path:l.path.slice()}));g.total=4;g.changed();
  assert(g.requestHint());done(g.search);assert.equal(g.hints,1);assert.equal(g.lines[1].gray,true);assert(!g.lines[0].gray&&!g.lines[2].gray);assert(!g.requestHint());
  const old=JSON.stringify(g.lines);g.update(20);assert.equal(JSON.stringify(g.lines),old,'gray persists');
  assert(g.begin(6));assert(g.move(5));assert.equal(g.active.color,lines[1].color);assert(g.move(6));assert.equal(g.lineAt(6).gray,false);
}
console.log('PASS hint priority, innocent later routes, persistent gray, rerouting and single charges');

for(const pace of ['gentle','steady','brave'])for(const mode of ['letters','math-addition','math-diagrams','math-equations','chineseTrad4','bopomofo','swedish-synonyms','translation-sv-en-1','swedishLong','homework']){
  const options={pace,mode,...(mode==='homework'?{items:[{label:'A',answer:'a'}]}:{})}, {g,events}=setup(options);
  assert.equal(g.board.cells.length,{gentle:37,steady:61,brave:91}[pace]);assert(g.maxUnused>0);assert.equal(g.tiles.length,g.total*2);
  if(mode!=='homework')assert.equal(new Set(g.pairs.map(p=>p.key)).size,g.total,mode+' distinct answers');
  assert.equal(done(E.solve(g.board,g.tiles,g.solution.map(path=>({path})))).status,'solved');
  assert.equal(g.maxUnused,g.board.cells.length-g.solution.reduce((n,p)=>n+p.length,0));
  g.update(20);const elapsed=g.elapsed;g.pause();g.update(300);assert.equal(g.elapsed,elapsed);g.resume();
  const p=g.solution[0];assert(g.begin(p[0]));if(p.length>2)g.move(p[1]);g.release();assert.equal(g.lines.length,0);assert.equal(g.mistakes,0);
  draw(g,p);const original=g.lines[0];
  for(const reverse of [false,true]){
    const path=reverse?[...p].reverse():p;assert(g.begin(path[0]));g.release();assert.equal(g.lines.length,1,'a tap does not erase');
    assert(g.begin(path[0]));assert(g.move(path[1]));assert.equal(g.lines.length,0);assert(g.move(path[0]));assert.equal(g.lines.length,1);assert.equal(g.lines[0].order,original.order);assert.equal(g.lines[0].color,original.color);
  }
  g.showCut(g.lines[0].id,p[1]);assert(g.cutLine());assert.equal(g.lines.length,0);
  for(const path of g.solution)draw(g,path);
  assert.equal(g.state,'celebrating');assert.equal(g.hits,g.total);assert(g.score>0&&g.score<g.profile.max);g.update(1);assert.equal(events.at(-1).type,'end');assert.equal(events.at(-1).score,g.score);
}
{
  const {g}=setup(),p=g.solution[0];g.board.walls.push(E.edge(p[0],p[1]));g.adj=E.graph(g.board);
  assert(g.begin(p[0]));assert.equal(g.move(p[1]),false);assert.equal(g.active.path.length,1);g.release();assert.equal(g.mistakes,0);
  const a=g.tiles[0],adj=g.adj[a.id].find(id=>!g.tileById.has(id));assert.notEqual(adj,undefined);
  const wrong={id:adj,key:'wrong',side:a.side==='problem'?'answer':'problem',item:{label:'wrong'}};g.tileById.set(adj,wrong);
  g.begin(a.id);g.move(adj);assert.equal(g.mistakes,1);assert.equal(g.lines.length,0);assert.equal(g.active,null);assert.equal(g.effects.at(-1).path[0],a.id);
}
for(const pace of ['gentle','steady','brave']){
  const p=SC.trasselProfiles[pace],base={pace,elapsed:0,total:p.pairs,mistakes:0,unused:10,maxUnused:10};
  assert.equal(SC.trasselScore(base).total,p.max);
  const early=SC.trasselScore({...base,elapsed:1}),later=SC.trasselScore({...base,elapsed:100000});assert(early.time<p.max*.7&&later.time>0);assert(early.time>later.time);
  assert.equal(SC.trasselScore({...base,elapsed:p.tau}).time,p.max*.35);
  assert.equal(SC.trasselScore({...base,unused:5}).optimality,SC.trasselScore(base).optimality/2);
  assert.equal(SC.trasselScore({...base,mistakes:p.pairs}).accuracy,SC.trasselScore(base).accuracy/2);
  assert.equal(SC.trasselScore({...base,hints:1}).total,p.max*.95);
}
// Interior placement and matching separation are checked on actual tiles,
// including all rotations and reflections used at runtime.
const distance=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
for(const shape of ['hex','tall','wide'])for(const pace of ['gentle','steady','brave'])for(const seed of [2,17,39]){
  const {g}=setup({shape,pace,mode:'letters'},seed),adj=E.graph(g.board),interior=g.tiles.filter(t=>adj[t.id].length===6);
  assert.equal(g.board.walls.length,0,'difficulty comes from routes, not wall corridors');
  assert(interior.length>=Math.ceil(g.total*2*.8));
  assert(interior.filter(t=>t.side==='answer').length>=Math.ceil(g.total*.75));
  assert.equal(new Set(g.pairs.map(p=>p.key)).size,g.total);
  for(const tile of g.tiles){
    const other=g.tiles.find(t=>E.matches(tile,t)),d=distance(g.board.cells[tile.id],g.board.cells[other.id]);
    assert(d>=3);
    assert(g.tiles.some(t=>t.side!==tile.side&&t.key!==tile.key&&distance(g.board.cells[tile.id],g.board.cells[t.id])<d),'a correct partner cannot be the nearest opposite-colour item');
  }
  assert.equal(done(E.solve(g.board,g.tiles,g.solution.map(path=>({path})))).status,'solved');
}
// Exercises with very few distinct answers retain valid interchangeable matches
// and an exact optimum; no hidden pair IDs or fabricated wrong answers are used.
for(const distinct of [1,2,3,4])for(const pace of ['gentle','steady','brave']){
  const items=Array.from({length:distinct},(_,i)=>({label:String(i),answer:String(i)})),{g}=setup({pace,mode:'homework',items});
  assert.equal(g.total,SC.trasselProfiles[pace].pairs);assert.equal(new Set(g.pairs.map(p=>p.key)).size,Math.min(distinct,g.total));
  assert.equal(done(E.solve(g.board,g.tiles,g.solution.map(path=>({path})))).status,'solved');
  assert.equal(g.maxUnused,g.board.cells.length-g.solution.reduce((n,p)=>n+p.length,0));
}
console.log('PASS open boards, interior endpoints, non-nearest matches, symmetry and repeated-answer exercises');
console.log('PASS all exercise families, three sizes, release/cut/reroute, walls, wrong answers, pause, completion and scoring');
