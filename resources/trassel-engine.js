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
  less(a,b){return a.cost<b.cost||a.cost===b.cost&&a.order<b.order;}
  push(v){const a=this.items;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(!this.less(v,a[p]))break;a[i]=a[p];i=p;}a[i]=v;}
  pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&this.less(a[j+1],a[j]))j++;if(!this.less(a[j],last))break;a[i]=a[j];i=j;}a[i]=last;}return first;}
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
  const n=sources.length;
  function routes(forbidden){
    const rows=sources.map((s,i)=>{
      const distance=new Int16Array(adj.length).fill(-1),parent=new Int16Array(adj.length).fill(-1),queue=[s.id];distance[s.id]=0;
      for(let k=0;k<queue.length;k++){
        const a=queue[k];if(a!==s.id&&terminal.has(a))continue;
        for(const b of adj[a])if(distance[b]<0&&!blocked.has(b)&&!forbidden[i].has(b)){
          distance[b]=distance[a]+1;parent[b]=a;queue.push(b);
        }
      }
      return {parent,cost:targets.map(t=>matches(s,t)&&distance[t.id]>=0?distance[t.id]+1:Infinity)};
    });
    // Minimum-cost matching lets identical displayed answers exchange partners.
    const memo=new Map(),choice=new Map();
    function assign(i,mask){
      if(i===n)return 0;if(memo.has(mask))return memo.get(mask);
      let best=Infinity,selected=-1;
      for(let j=0;j<n;j++)if(!(mask&(1<<j))&&Number.isFinite(rows[i].cost[j])){
        const cost=rows[i].cost[j]+assign(i+1,mask|(1<<j));if(cost<best){best=cost;selected=j;}
      }
      memo.set(mask,best);choice.set(mask,selected);return best;
    }
    const cost=assign(0,0);if(!Number.isFinite(cost)||cost>board.cells.length-blocked.size)return null;
    let mask=0;const paths=[];
    for(let i=0;i<n;i++){
      const j=choice.get(mask),path=[];mask|=1<<j;
      for(let v=targets[j].id;v!==-1;v=rows[i].parent[v])path.push(v);
      paths.push(path.reverse());
    }
    return {cost,paths};
  }
  const heap=new Heap(),visited=new Set();let order=0;
  function add(forbidden){
    const key=forbidden.map(s=>[...s].sort((a,b)=>a-b).join(',')).join(';');if(visited.has(key))return;visited.add(key);
    const result=routes(forbidden);if(result)heap.push({...result,forbidden,order:order++});
  }
  add(sources.map(()=>new Set()));
  while(heap.items.length){
    if(--budget.remaining<0)return {status:'unknown'};
    const node=heap.pop(),owners=new Map();let conflict=null;
    for(let i=0;i<n&&!conflict;i++)for(const tile of node.paths[i]){
      if(owners.has(tile)){conflict=[tile,owners.get(tile),i];break;}owners.set(tile,i);
    }
    if(!conflict)return {status:'solved',paths:[...fixed.map(l=>l.path.slice()),...node.paths],cost:blocked.size+node.cost};
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
function construct(radius,count,random=Math.random,shape='hex'){
  const board=makeBoard(radius,shape),adj=graph(board),occupied=new Set(),paths=[];
  const shuffle=a=>a.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(v=>v.v);
  for(let i=0;i<count;i++){
    let path=null;
    for(const start of shuffle(board.cells.map(c=>c.id).filter(id=>!occupied.has(id)))){
      const parent=new Map([[start,-1]]),distance=new Map([[start,0]]),queue=[start];
      for(let k=0;k<queue.length;k++)for(const v of shuffle(adj[queue[k]]))if(!occupied.has(v)&&!parent.has(v)){
        parent.set(v,queue[k]);distance.set(v,distance.get(queue[k])+1);queue.push(v);
      }
      const targets=shuffle(queue.filter(v=>distance.get(v)>=3&&distance.get(v)<=radius+2));
      if(!targets.length)continue;
      path=[];for(let v=targets[0];v!==-1;v=parent.get(v))path.push(v);path.reverse();break;
    }
    if(!path)return null;paths.push(path);path.forEach(v=>occupied.add(v));
  }
  const protectedEdges=new Set(paths.flatMap(p=>p.slice(1).map((b,i)=>edge(p[i],b))));
  const candidates=adj.flatMap((ns,a)=>ns.filter(b=>a<b&&!protectedEdges.has(edge(a,b))).map(b=>edge(a,b)));
  board.walls=shuffle(candidates).slice(0,{3:4,4:10,5:18}[radius]);
  return {board,paths};
}
// Adjacent endpoints certify the absolute lower bound (two tiles per pair),
// even with duplicate answers. Preparation therefore always terminates.
function fallback(radius,count,shape='hex'){
  const board=makeBoard(radius,shape),paths=[];
  for(const r of new Set(board.cells.map(c=>c.r))){
    const row=board.cells.filter(c=>c.r===r);
    for(let i=0;i+1<row.length&&paths.length<count;i+=2)paths.push(row.slice(i,i+2).map(c=>c.id));
  }
  return {board,paths};
}
SC.TrasselEngine={hex,makeBoard,graph,edge,matches,solve,hint,construct,fallback};
})(globalThis);
