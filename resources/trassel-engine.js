/* Hex paths. Best-first conflict splitting proves the minimum occupied tiles.
   Searches yield between nodes, including on file://, to keep touch input live. */
(function(root){
'use strict';
const SC=root.Starlight,dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const edge=(a,b)=>a<b?a+':'+b:b+':'+a;
function hex(radius){
  const cells=[];
  for(let r=-radius;r<=radius;r++)for(let q=-radius;q<=radius;q++)if(Math.abs(q+r)<=radius)cells.push({id:cells.length,q,r});
  return {cells,walls:[]};
}
function makeBoard(radius,shape='hex'){
  if(shape==='hex')return hex(radius);
  const total=3*radius*(radius+1)+1,columns=(shape==='tall'?{3:5,4:6,5:7}:{3:9,4:11,5:13})[radius],rows=Math.ceil(total/columns),cells=[];
  for(let r=0;r<rows;r++){
    const count=Math.floor((r+1)*total/rows)-Math.floor(r*total/rows);
    for(let c=0;c<count;c++)cells.push({id:cells.length,q:c-Math.floor(r/2),r});
  }
  return {cells,walls:[]};
}
function graph(board){
  const ids=new Map(board.cells.map(c=>[c.q+','+c.r,c.id])),walls=new Set(board.walls);
  return board.cells.map(c=>dirs.map(([q,r])=>ids.get((c.q+q)+','+(c.r+r))).filter(n=>n!==undefined&&!walls.has(edge(c.id,n))));
}
const matches=(a,b)=>a&&b&&a.id!==b.id&&a.side!==b.side&&a.key===b.key;
class Heap{
  constructor(){this.items=[];}
  less(a,b){return a.cost<b.cost||a.cost===b.cost&&(a.conflicts<b.conflicts||a.conflicts===b.conflicts&&a.order<b.order);}
  push(v){const a=this.items;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(!this.less(v,a[p]))break;a[i]=a[p];i=p;}a[i]=v;}
  pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&this.less(a[j+1],a[j]))j++;if(!this.less(a[j],last))break;a[i]=a[j];i=j;}a[i]=last;}return first;}
}
// In a forest an edge is used iff it separates an odd number of endpoints.
// This determines every route, including when several answers are identical.
function solveForest(adj,terminal,blocked){
  const parent=new Int16Array(adj.length).fill(-2),order=[],roots=[];
  for(let start=0;start<adj.length;start++)if(!blocked.has(start)&&parent[start]===-2){
    roots.push(start);parent[start]=-1;const queue=[start];
    for(let i=0;i<queue.length;i++){
      const a=queue[i];order.push(a);
      for(const b of adj[a])if(!blocked.has(b)&&b!==parent[a]){
        if(parent[b]!==-2)return null;
        parent[b]=a;queue.push(b);
      }
    }
  }
  const odd=adj.map((_,id)=>+terminal.has(id)),required=adj.map(()=>[]);
  for(const a of order.slice().reverse())if(parent[a]>=0){
    const b=parent[a];if(odd[a]){required[a].push(b);required[b].push(a);odd[b]^=1;}
  }
  if(roots.some(a=>odd[a])||order.some(a=>terminal.has(a)?required[a].length!==1:![0,2].includes(required[a].length)))return {status:'impossible'};
  const paths=[];
  for(const source of terminal.values())if(source.side==='problem'&&!blocked.has(source.id)){
    const path=[source.id];let prev=-1,a=source.id;
    do{const b=required[a].find(v=>v!==prev);prev=a;a=b;path.push(a);}while(!terminal.has(a));
    if(!matches(source,terminal.get(a)))return {status:'impossible'};
    paths.push(path);
  }
  return {status:'solved',paths,cost:paths.reduce((sum,p)=>sum+p.length,0)};
}
function* solve(board,tiles,fixed=[],{budget={remaining:12000}}={}){
  const adj=graph(board),terminal=new Map(tiles.map(t=>[t.id,t])),blocked=new Set(),used=new Set();
  for(const line of fixed){
    const p=line.path;
    if(!p?.length||!matches(terminal.get(p[0]),terminal.get(p.at(-1))))return {status:'impossible'};
    for(let i=0;i<p.length;i++){
      if(blocked.has(p[i])||!adj[p[i]]||i&&!adj[p[i-1]].includes(p[i])||i&&i<p.length-1&&terminal.has(p[i]))return {status:'impossible'};
      blocked.add(p[i]);
    }
    used.add(p[0]);used.add(p.at(-1));
  }
  const sources=tiles.filter(t=>t.side==='problem'&&!used.has(t.id)),targets=tiles.filter(t=>t.side==='answer'&&!used.has(t.id));
  if(sources.length!==targets.length)return {status:'impossible'};
  if(!sources.length)return {status:'solved',paths:fixed.map(l=>l.path.slice()),cost:blocked.size};
  const forest=solveForest(adj,terminal,blocked);
  if(forest)return forest.status==='solved'?{...forest,paths:[...fixed.map(l=>l.path.slice()),...forest.paths],cost:blocked.size+forest.cost,lowerBound:blocked.size+forest.cost}:forest;
  const n=sources.length,routeCache=sources.map(()=>new Map()),size=1<<n,bits=new Uint8Array(size);
  for(let mask=1;mask<size;mask++)bits[mask]=bits[mask>>1]+(mask&1);
  function routes(forbidden){
    const rows=sources.map((s,i)=>{
      const key=[...forbidden[i]].sort((a,b)=>a-b).join(','),cached=routeCache[i].get(key);if(cached)return cached;
      const distance=new Int16Array(adj.length).fill(-1),parent=new Int16Array(adj.length).fill(-1),queue=[s.id];distance[s.id]=0;
      for(let k=0;k<queue.length;k++){
        const a=queue[k];if(a!==s.id&&terminal.has(a))continue;
        for(const b of adj[a])if(distance[b]<0&&!blocked.has(b)&&!forbidden[i].has(b)){
          distance[b]=distance[a]+1;parent[b]=a;queue.push(b);
        }
      }
      const row={parent,cost:targets.map(t=>matches(s,t)&&distance[t.id]>=0?distance[t.id]+1:Infinity)};routeCache[i].set(key,row);return row;
    });
    // Minimum-cost matching lets identical displayed answers exchange partners.
    const costs=new Float64Array(size).fill(Infinity),choice=new Int8Array(size).fill(-1);costs[0]=0;
    for(let mask=0;mask<size-1;mask++)if(Number.isFinite(costs[mask])){
      const i=bits[mask];
      for(let j=0;j<n;j++)if(!(mask&(1<<j))){
        const next=mask|(1<<j),cost=costs[mask]+rows[i].cost[j];
        if(cost<costs[next]){costs[next]=cost;choice[next]=j;}
      }
    }
    const cost=costs[size-1];if(!Number.isFinite(cost)||cost>board.cells.length-blocked.size)return null;
    let mask=size-1;const paths=[];
    for(let i=n-1;i>=0;i--){
      const j=choice[mask],path=[];mask^=1<<j;
      for(let v=targets[j].id;v!==-1;v=rows[i].parent[v])path.push(v);
      paths[i]=path.reverse();
    }
    return {cost,paths};
  }
  const heap=new Heap(),visited=new Set();let order=0;
  function add(forbidden){
    const key=forbidden.map(s=>[...s].sort((a,b)=>a-b).join(',')).join(';');if(visited.has(key))return;visited.add(key);
    const result=routes(forbidden);if(!result)return;
    const owners=new Map();let conflict=null,conflicts=0;
    for(let i=0;i<n;i++)for(const tile of result.paths[i]){
      if(owners.has(tile)){conflicts++;conflict??=[tile,owners.get(tile),i];}owners.set(tile,i);
    }
    heap.push({...result,conflict,conflicts,forbidden,order:order++});
  }
  add(sources.map(()=>new Set()));
  const lowerBound=blocked.size+(heap.items[0]?.cost??Infinity);
  while(heap.items.length){
    if(--budget.remaining<0)return {status:'unknown'};
    const node=heap.pop(),{conflict}=node;
    if(!conflict)return {status:'solved',paths:[...fixed.map(l=>l.path.slice()),...node.paths],cost:blocked.size+node.cost,lowerBound};
    const [tile,a,b]=conflict;
    for(const i of [a,b]){const forbid=node.forbidden.slice();forbid[i]=new Set(forbid[i]);forbid[i].add(tile);add(forbid);}
    yield;
  }
  return {status:'impossible'};
}
function* hint(board,tiles,lines,{budget={remaining:25000}}={}){
  const ordered=[...lines].sort((a,b)=>a.order-b.order),n=ordered.length;
  // Try removing newer lines first. Descending masks give older routes absolute
  // priority, but restore innocent newer routes if an older conflict remains.
  // Thus an impossible old route never causes every later route to be blamed.
  for(let mask=(1<<n)-1;mask>=0;mask--){
    const kept=ordered.filter((_,i)=>mask&(1<<(n-1-i)));
    const result=yield* solve(board,tiles,kept,{budget});
    if(result.status==='unknown')return result;
    if(result.status==='solved')return {status:'solved',bad:ordered.filter(l=>!kept.includes(l)).map(l=>l.id)};
    yield;
  }
  return {status:'impossible'};
}
const shuffle=(values,random)=>values.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);
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
 const protectedEdges=new Set(paths.flatMap(p=>p.slice(1).map((b,i)=>edge(p[i],b))));
 const owner=new Map(paths.flatMap((p,i)=>p.map(v=>[v,i])));
 board.walls=adj.flatMap((ns,a)=>ns.filter(b=>a<b&&owner.has(a)&&owner.get(a)===owner.get(b)&&!protectedEdges.has(edge(a,b))).map(b=>edge(a,b)));
 return {board,paths};
}
function pathStats(board,paths){
  const turns=paths.map(p=>p.slice(2).filter((id,i)=>{
    const a=board.cells[p[i]],b=board.cells[p[i+1]],c=board.cells[id];return b.q-a.q!==c.q-b.q||b.r-a.r!==c.r-b.r;
  }).length);
  const cost=paths.reduce((n,p)=>n+p.length,0),detour=paths.reduce((n,p)=>{
    const a=board.cells[p[0]],b=board.cells[p.at(-1)];return n+p.length-1-Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
  },0);
  return {fill:cost/board.cells.length,bendy:turns.filter(n=>n>=2).length,turns:turns.reduce((a,b)=>a+b,0),detour,minLength:Math.min(...paths.map(p=>p.length))};
}
function quality(board,tiles,result,radius){
  const adj=graph(board),ends=new Set(tiles.map(t=>t.id)),sources=tiles.filter(t=>t.side==='problem');
  const directed=adj.map((ns,a)=>ns.map(b=>({id:b,dir:dirs.findIndex(([q,r])=>board.cells[b].q-board.cells[a].q===q&&board.cells[b].r-board.cells[a].r===r)})));
  // 0–1 shortest paths count the fewest turns to ANY matching answer, even
  // without competing routes. Optional zigzags cannot pass this lower bound.
  let forcedBendy=0;
  for(const source of sources){
    const distance=new Int16Array(adj.length*6).fill(999),queue=[];let head=0,tail=0;
    for(let d=0;d<6;d++){const state=source.id*6+d;distance[state]=0;queue[tail++]=state;}
    while(head<tail){
      const state=queue[head++],a=Math.floor(state/6);if(a!==source.id&&ends.has(a))continue;
      for(const {id,dir} of directed[a]){
        const next=id*6+dir,turn=+(state%6!==dir),cost=distance[state]+turn;
        if(cost>=distance[next])continue;distance[next]=cost;
        if(turn)queue[tail++]=next;else queue[--head]=next;
      }
    }
    const minimum=Math.min(...tiles.filter(t=>matches(source,t)).flatMap(t=>Array.from(distance.slice(t.id*6,t.id*6+6))));
    if(minimum>=2)forcedBendy++;
  }
  const stats={...pathStats(board,result.paths),forcedBendy,interaction:result.cost-result.lowerBound},n=sources.length;
  return {...stats,acceptable:stats.fill>={3:.65,4:.7,5:.75}[radius]&&stats.bendy>=Math.ceil(n*.75)&&stats.detour>=n*(radius/2)&&stats.minLength>=4&&forcedBendy>=Math.ceil(n*.5)&&stats.interaction>=radius-2};
}
function blockShortcut(candidate,paths,random){
  const protectedEdges=new Set(candidate.paths.flatMap(p=>p.slice(1).map((b,i)=>edge(p[i],b))));
  const choices=shuffle(paths,random).sort((a,b)=>a.length-b.length).map(p=>p.slice(1).map((b,i)=>edge(p[i],b)).filter(e=>!protectedEdges.has(e))).filter(es=>es.length);
  if(!choices.length)return false;
  const edges=choices[0];candidate.board.walls.push(edges[Math.floor(random()*edges.length)]);return true;
}
// A connected tree preserves winding witness routes and has a unique complete
// routing (the parity rule above). It is a nontrivial, bounded fallback even
// for a homework set where every answer is identical.
function fallback(radius,count,shape='hex',random=Math.random,reserve=null){
  const seeds={hex:{3:[1,2,3,4],4:[1,2,3,4],5:[1,2,3,4]},tall:{3:[1,2,3,4],4:[1,2,3,4],5:[1,2,6,7]},wide:{3:[1,2,3,4],4:[1,2,3,4],5:[1,3,5,6]}};
  const choices=seeds[shape][radius];let seed=choices[Math.floor(random()*choices.length)];
  const seeded=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const candidate=reserve||construct(radius,count,seeded,shape),{board,paths}=candidate;
  const parent=board.cells.map(c=>c.id),find=a=>{while(parent[a]!==a)a=parent[a];return a;},open=new Set();
  const join=(a,b)=>{const x=find(a),y=find(b);if(x===y)return;parent[x]=y;open.add(edge(a,b));};
  for(const p of paths)for(let i=1;i<p.length;i++)join(p[i-1],p[i]);
  board.walls=[];const edges=graph(board).flatMap((ns,a)=>ns.filter(b=>a<b).map(b=>[a,b]));
  for(const [a,b] of shuffle(edges,random))join(a,b);
  board.walls=edges.filter(([a,b])=>!open.has(edge(a,b))).map(([a,b])=>edge(a,b));
  return candidate;
}
SC.TrasselEngine={hex,makeBoard,graph,edge,matches,solve,hint,construct,fallback,pathStats,quality,blockShortcut};
})(globalThis);
