/* Offline layout checks. A stored route is a solvability witness, not an
   optimality proof: --verify independently reruns the exact search for ALL
   answer-multiplicity patterns before a catalog is shipped. */
'use strict';
const assert=require('node:assert/strict');
global.Starlight??={};
require('../resources/trassel-engine.js');
require('../resources/trassel-layouts.js');
const E=Starlight.TrasselEngine,catalog=Starlight.trasselLayouts;
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const done=search=>{let r;do{r=search.next();}while(!r.done);return r.value;};
const distance=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
const shuffle=(values,random)=>values.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);
function partitions(n,max=n){
  if(!n)return [[]];const out=[];
  for(let k=Math.min(n,max);k>=1;k--)for(const rest of partitions(n-k,k))out.push([k,...rest]);
  return out;
}
function tilesFor(layout,pattern){
  const keys=[...pattern].flatMap((n,i)=>Array(Number(n)).fill(i));
  return layout.order.flatMap(i=>{
    const [x,y]=layout.ends[i],[a,b]=layout.mask&(1<<i)?[x,y]:[y,x];
    return [{id:a,side:'problem',key:keys[i]},{id:b,side:'answer',key:keys[i]}];
  });
}
function geometry(board,paths){
  const adj=E.graph(board),ends=paths.flatMap(p=>[p[0],p.at(-1)]);
  const pt=id=>{const c=board.cells[id];return [Math.sqrt(3)*(c.q+c.r/2),1.5*c.r];};
  // An open route winds around an unrelated terminal when its cumulative
  // angle about that terminal exceeds 198 degrees. Count routes, not turns.
  let wraps=0;
  for(const p of paths){
    let max=0;
    for(const e of ends.filter(e=>!p.includes(e))){
      const [x,y]=pt(e);let sum=0;
      for(let i=1;i<p.length;i++){
        const [a,b]=pt(p[i-1]),[c,d]=pt(p[i]);let angle=Math.atan2(d-y,c-x)-Math.atan2(b-y,a-x);
        while(angle>Math.PI)angle-=2*Math.PI;while(angle< -Math.PI)angle+=2*Math.PI;sum+=angle;
      }
      max=Math.max(max,Math.abs(sum));
    }
    if(max>Math.PI*1.1)wraps++;
  }
  return {inside:ends.filter(id=>adj[id].length===6).length,wraps,
    distant:paths.filter(p=>distance(board.cells[p[0]],board.cells[p.at(-1)])>=3).length};
}
function placement(board,tiles){
  const adj=E.graph(board);let wrongCloser=0,twice=0,interior=0;
  for(const t of tiles){
    if(t.side==='answer'&&adj[t.id].length===6)interior++;
    const others=tiles.filter(u=>u.side!==t.side),correct=Math.min(...others.filter(u=>u.key===t.key).map(u=>distance(board.cells[t.id],board.cells[u.id])));
    const wrong=others.filter(u=>u.key!==t.key&&distance(board.cells[t.id],board.cells[u.id])<correct).length;
    if(wrong)wrongCloser++;if(wrong>1)twice++;
  }
  return {wrongCloser,twice,interior,score:wrongCloser*100+interior*10+twice};
}
function orient(board,ends,pattern='1'.repeat(ends.length)){
  let best=null;const order=ends.map((_,i)=>i);
  for(let mask=0;mask<(1<<ends.length);mask++){
    const tiles=tilesFor({ends,mask,order},pattern),metrics=placement(board,tiles);
    if(!best||metrics.score>best.score)best={mask,tiles,...metrics};
  }
  return best;
}
function acceptable(board,tiles,result,radius){
  const n=tiles.length/2,g=geometry(board,result.paths),p=placement(board,tiles);
  return g.inside>=Math.ceil(n*2*.8)&&p.interior>=Math.ceil(n*.75)&&p.wrongCloser===n*2&&
    g.distant===n&&g.wraps>=(radius===5?3:2)&&result.cost-result.lowerBound>={3:4,4:7,5:10}[radius];
}
function certify(board,tiles,seed){
  const random=rng(seed),base=Array.from({length:tiles.length/2},(_,i)=>i);
  // Order only changes the tie breaking, never the optimum. Retain a proven
  // search order so verification does not repeatedly hit expensive ties.
  for(let trial=0;trial<6;trial++){
    const order=trial?shuffle(base,random):base;
    const result=done(E.solve(board,order.flatMap(i=>tiles.slice(i*2,i*2+2)),[],{budget:{remaining:trial?3500:6000}}));
    if(result.status==='solved')return {...result,order};
  }
  return null;
}
function verify(data=catalog,log=()=>{}){
  let total=0,primary=0;
  for(const shape of ['hex','tall','wide'])for(const radius of [3,4,5]){
    const key=shape+radius,n=(radius-1)*2,board=E.makeBoard(radius,shape),adj=E.graph(board),patterns=data[key];
    assert(patterns,key);assert.equal(board.walls.length,0);
    assert.deepEqual(Object.keys(patterns).sort(),partitions(n).map(p=>p.join('')).sort(),key+' multiplicities');
    // Every runtime symmetry must preserve the exact graph by tile ID.
    for(const mirror of [false,true])for(let turn=0;turn<(shape==='hex'?6:2);turn++){
      const values=[mirror?0:1,(turn+.1)/(shape==='hex'?6:2)];
      const transformed=E.layoutBoard(radius,shape,()=>values.shift());
      assert.deepEqual(E.graph(transformed).map(ns=>ns.sort((a,b)=>a-b)),adj.map(ns=>ns.slice().sort((a,b)=>a-b)));
    }
    for(const [pattern,records] of Object.entries(patterns)){
      const unique=pattern==='1'.repeat(n),seen=new Set();
      assert(records.length>=(unique?12:2),key+' '+pattern+' variety');
      for(const record of records){
        const label=key+' '+pattern+' #'+seen.size;
        assert.equal(record.ends.length,n);assert(record.ends.every(p=>p.length===2));
        assert.equal(new Set(record.ends.flat()).size,n*2);
        assert.deepEqual(record.order.slice().sort((a,b)=>a-b),Array.from({length:n},(_,i)=>i));
        assert(Number.isInteger(record.mask)&&record.mask>=0&&record.mask<(1<<n));
        const id=JSON.stringify(record.ends.map(p=>p.slice().sort((a,b)=>a-b)).sort((a,b)=>a[0]-b[0]));
        assert(!seen.has(id),label+' duplicate');seen.add(id);
        const tiles=tilesFor(record,pattern),terminal=new Map(tiles.map(t=>[t.id,t])),used=new Set(),covered=new Set();
        assert.equal(record.paths.length,n,label);
        for(const p of record.paths){
          assert(p.length>=2&&E.matches(terminal.get(p[0]),terminal.get(p.at(-1))),label+' endpoints');
          covered.add(p[0]);covered.add(p.at(-1));
          for(let i=0;i<p.length;i++){
            assert(adj[p[i]]&&!used.has(p[i]),label+' disjoint paths');used.add(p[i]);
            if(i)assert(adj[p[i-1]].includes(p[i]),label+' adjacency');
            if(i&&i<p.length-1)assert(!terminal.has(p[i]),label+' interior terminal');
          }
        }
        assert.equal(covered.size,n*2,label);assert.equal(record.cost,used.size,label);assert(record.cost<board.cells.length,label+' unused tiles');
        const g=geometry(board,record.paths),p=placement(board,tiles);
        assert(g.inside>=Math.ceil(n*2*.8)&&p.interior>=Math.ceil(n*.75),label+' interior');
        if(unique){assert(acceptable(board,tiles,record,radius),label+' interleaving');primary++;}
        const result=done(E.solve(board,tiles,[],{budget:{remaining:12000}}));
        assert.equal(result.status,'solved',label+' proof');assert.equal(result.cost,record.cost,label+' exact optimum');
        assert.equal(result.lowerBound,record.lowerBound,label+' independent bound');total++;
      }
    }
    log(key+' verified');
  }
  return {total,primary};
}
module.exports={E,catalog,rng,done,distance,shuffle,partitions,tilesFor,geometry,placement,orient,acceptable,certify,verify};
if(require.main===module){
  assert(process.argv.length===2||process.argv[2]==='--verify','Usage: node dev/trassel-layouts.cjs --verify');
  console.log('PASS',verify(catalog,console.log),'open layouts, interior placement, interleaving and exact optima');
}
