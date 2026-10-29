/* Offline authoring: grow disjoint routes, move their ends into the interior,
   then reject candidates unless their TRUE optimum requires interleaving.
   node dev/trassel-generate.cjs tall4 1 73 [--write]
   Arguments: board shape+radius, number of new layouts, random seed.
   Without --write this is a dry run. No browser generation/search is needed. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {E,catalog,rng,shuffle,geometry,orient,acceptable,certify,verify}=require('./trassel-layouts.cjs');
const {makeBoard,graph}=E;
const distance=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
function construct(radius,count,random=Math.random,shape='hex'){
 const board=makeBoard(radius,shape),adj=graph(board),occupied=new Set(),paths=[];
 // Start small, then grow and exchange path ends while preserving disjointness.
 for(let i=0;i<count;i++){
  const edges=shuffle(board.cells.map(c=>c.id).filter(id=>!occupied.has(id)),random);
  const a=edges.find(id=>adj[id].some(v=>!occupied.has(v)));if(a===undefined)return null;
  const b=shuffle(adj[a].filter(v=>!occupied.has(v)),random)[0];paths.push([a,b]);occupied.add(a);occupied.add(b);
 }
 const target=Math.round(board.cells.length*.88),minLength=5,maxLength=Math.ceil(board.cells.length/count*1.7);
 for(let step=0;step<1500;step++){
  const i=Math.floor(random()*count),p=paths[i];if(random()<.5)p.reverse();
  const ns=shuffle(adj[p.at(-1)],random);
  for(const v of ns){
   const own=p.indexOf(v);
   if(own>=0){if(own<p.length-2&&random()<.25){paths[i]=p.slice(0,own+1).concat(p.slice(own+1).reverse());break;}continue;}
   if(p.length>=maxLength)continue;
   if(!occupied.has(v)){
    if(occupied.size<target){p.push(v);occupied.add(v);break;}
    if(p.length>minLength&&random()<.2){occupied.delete(p.shift());p.push(v);occupied.add(v);break;}
    continue;
   }
   const j=paths.findIndex((q,k)=>k!==i&&(q[0]===v||q.at(-1)===v));
   if(j>=0&&paths[j].length>minLength&&(p.length<minLength||random()<.25)){
    const q=paths[j];if(q[0]===v)q.shift();else q.pop();p.push(v);break;
   }
  }
 }
 if(paths.some(p=>p.length<minLength))return null;
 return {board,paths};
}
function create(radius,count,shape,random){
 const c=construct(radius,count,random,shape);if(!c)return null;c.board.walls=[];const {board}=c,g=E.graph(board),N=board.cells.length;
 let paths=c.paths;
 const dist=board.cells.map(a=>board.cells.map(b=>distance(a,b)));
 function energy(ps){
  const ends=ps.flatMap(p=>[p[0],p.at(-1)]);let cost=0;
  for(const p of ps){
   const d=dist[p[0]][p.at(-1)];cost+=Math.max(0,3-d)*15;
   for(const a of [p[0],p.at(-1)]){cost+=g[a].length===6?0:12;const close=ends.filter(b=>b!==a&&!p.includes(b)&&dist[a][b]<d).length;cost+=Math.max(0,2-close)*5;}
   // No cosmetic loops in a route; keep room for paths to wind round one another.
   const set=new Set(p);let chords=0;for(const a of p)for(const b of g[a])if(a<b&&set.has(b))chords++;
   cost+=(chords-p.length+1)*2;
   cost+=Math.max(0,4-p.length)*10;
  }
  return cost;
 }
 let score=energy(paths),best=paths.map(p=>p.slice()),bestScore=score;
 for(let step=0;step<10000;step++){
  const ps=paths.map(p=>p.slice()),i=Math.floor(random()*count),p=ps[i];if(random()<.5)p.reverse();const v=g[p.at(-1)][Math.floor(random()*g[p.at(-1)].length)];
  const own=p.indexOf(v);
  if(own>=0){if(own>=p.length-2)continue;ps[i]=p.slice(0,own+1).concat(p.slice(own+1).reverse());}
  else{
   const j=ps.findIndex(q=>q.includes(v));
   if(j<0){p.push(v);if(p.length>4&&random()<.85)p.shift();}
   else{
    let q=ps[j],at=q.indexOf(v);if(random()<.5){q.reverse();at=q.indexOf(v);}
    if(at+1>q.length-4||p.length+at+1>N*.55)continue;
    p.push(...q.slice(0,at+1).reverse());ps[j]=q.slice(at+1);
   }
  }
  const total=ps.reduce((n,p)=>n+p.length,0);if(total>N*.94)continue;
  const next=energy(ps),temp=3*(1-step/10000)+.1;
  if(next<=score||random()<Math.exp((score-next)/temp)){paths=ps;score=next;if(score<bestScore){best=paths.map(p=>p.slice());bestScore=score;}}
 }
 return {board,paths:best,energy:bestScore};
}

function mutate(board,record,random){
  const paths=record.ends.map(([a,b])=>{
    const p=record.paths.find(p=>p.includes(a)&&p.includes(b));
    return p[0]===a?p.slice():p.slice().reverse();
  }),occupied=new Set(paths.flat()),adj=graph(board);
  for(let move=0;move<2;move++){
    const p=paths[Math.floor(random()*paths.length)];if(random()<.5)p.reverse();
    const free=adj[p.at(-1)].filter(v=>!occupied.has(v));
    if(free.length&&random()<.5){const v=free[Math.floor(random()*free.length)];p.push(v);occupied.add(v);}
    else if(p.length>4)occupied.delete(p.pop());
  }
  return {board,paths};
}
function generate(key,count,seed){
  assert(/^(hex|tall|wide)[345]$/.test(key),'Unknown board');
  assert(Number.isInteger(count)&&count>0&&Number.isInteger(seed),'Positive count and integer seed required');
  const shape=key.slice(0,-1),radius=Number(key.at(-1)),n=2*(radius-1),board=makeBoard(radius,shape);
  const records=catalog[key]['1'.repeat(n)],random=rng(seed),start=records.length;
  const signature=ends=>JSON.stringify(ends.map(p=>p.slice().sort((a,b)=>a-b)).sort((a,b)=>a[0]-b[0]));
  const seen=new Set(records.map(r=>signature(r.ends)));
  for(let attempt=0;attempt<500&&records.length<start+count;attempt++){
    const c=attempt%3?mutate(board,records[Math.floor(random()*records.length)],random):create(radius,n,shape,random);
    if(!c)continue;
    const ends=c.paths.map(p=>[p[0],p.at(-1)]),id=signature(ends),g=geometry(board,c.paths);
    if(seen.has(id)||g.inside<Math.ceil(n*2*.8)||g.distant<n)continue;seen.add(id);
    const o=orient(board,ends);if(o.wrongCloser<n*2||o.interior<Math.ceil(n*.75))continue;
    const result=certify(board,o.tiles,seed+attempt);
    if(!result||!acceptable(board,o.tiles,result,radius))continue;
    const {paths,cost,lowerBound,order}=result;
    records.push({ends,mask:o.mask,order,paths,cost,lowerBound});
    console.log(key,records.length-start,'accepted',JSON.stringify({interior:g.inside,extraCells:cost-lowerBound,wraps:geometry(board,paths).wraps}));
  }
  assert.equal(records.length,start+count,'Search exhausted; try another seed. The catalog has not been written.');
  return catalog;
}
function write(data){
  const sections=Object.entries(data).map(([key,patterns])=>JSON.stringify(key)+':{\n'+Object.entries(patterns).map(([pattern,records])=>JSON.stringify(pattern)+':[\n'+records.map(r=>JSON.stringify(r)).join(',\n')+'\n]').join(',\n')+'\n}');
  const header='/* Generated open-board layouts and exact solutions.\n   Authoring: node dev/trassel-generate.cjs tall4 1 73 --write\n   Verification: node dev/trassel-layouts.cjs --verify\n   Keys encode answer multiplicities, e.g. 2111 = one repeated answer. */\n';
  fs.writeFileSync(path.join(__dirname,'../resources/trassel-layouts.js'),header+"(function(root){\n'use strict';\nroot.Starlight.trasselLayouts={\n"+sections.join(',\n')+'\n};\n})(globalThis);\n');
}
module.exports={create,generate,write};
if(require.main===module){
  const [key,count,seed]=process.argv.slice(2),data=generate(key,Number(count),Number(seed));
  console.log('Verified',verify(data));
  if(process.argv.includes('--write')){write(data);console.log('Written resources/trassel-layouts.js; run npm run assets.');}
  else console.log('Dry run; catalog unchanged.');
}
