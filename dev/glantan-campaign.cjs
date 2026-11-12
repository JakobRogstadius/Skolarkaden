/* Paid-action campaign assay. Timing/errors use a separate seeded stream;
 * no combat, visibility, expedition or progression rules are bypassed. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {runtime}=require('../tests/games/glantan/helpers.cjs');
const ROOT=path.resolve(__dirname,'..');
function random(seed){let a=2166136261;for(const c of String(seed))a=Math.imul(a^c.charCodeAt(0),16777619);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const POLICIES={
  mixed:{roles:['warrior','ranger','healer','mage','warrior','warrior','ranger','healer'],research:['armor','boots','castle2','banner','marksman','bloom','echo']},
  rangers:{roles:Array(8).fill('ranger'),research:['armor','boots','castle2','marksman']},
  specialists:{roles:['warrior','ranger','healer','mage','warrior','necromancer','ranger','healer'],research:['armor','boots','castle2','guardian','traps','bloom','frost']},
  defense:{roles:['warrior','ranger','healer','mage','warrior','warrior','ranger','healer'],research:['armor','boots','castle2','guardian','marksman','bloom','frost'],towers:2},
  camp:{roles:['warrior','ranger','healer','mage','warrior','warrior','ranger','healer'],research:['armor','boots','castle2','banner','marksman','bloom','echo'],camp:true},
  reserves:{roles:['warrior','ranger','healer','mage','warrior','warrior','ranger','healer','warrior','ranger','healer','mage'],research:['armor','boots','castle2','banner','marksman','bloom','echo']},
  guarded:{roles:['warrior','ranger','healer','mage','warrior','warrior','ranger','healer','warrior','ranger','healer','mage'],research:['armor','boots','castle2','banner','marksman','bloom','echo'],towers:1,guard:true},
  arcane:{roles:['warrior','ranger','healer','mage','warrior','necromancer','ranger','healer'],research:['armor','boots','castle2','banner','marksman','bloom','echo']},
  assault:{roles:['warrior','mage','warrior','healer','warrior','mage','mage','healer'],research:['armor','castle2','banner','bloom','frost']}
};
POLICIES.counter={roles:['warrior','healer','ranger','mage','necromancer','warrior','ranger','healer','mage','necromancer'],research:['armor','boots','castle2','banner','marksman','bloom','echo'],towers:1,coordinated:true};
POLICIES.counterAlt={...POLICIES.counter,research:['armor','boots','castle2','guardian','traps','ward','frost']};
POLICIES.focused={...POLICIES.mixed,coordinated:true};
POLICIES.coordinated={...POLICIES.guarded,coordinated:true};
POLICIES.phalanx={...POLICIES.assault,coordinated:true};
function planFor(name){const p=POLICIES[name];if(!p)throw Error('Unknown policy '+name);const plan=[];
  for(let i=0;i<p.roles.length;i++){if(i>0&&i%4===0)plan.push(['build','house']);plan.push(['recruit',p.roles[i]]);if(i===7&&p.guard)plan.push(['guard','village']);if(i===3){for(let j=0;j<(p.towers||0);j++)plan.push(['build','tower']);if(!p.camp)plan.push(['attack','nearest']);}}
  if(!p.camp)plan.push(['attack','nearest']);plan.push(...p.research.map(id=>['research',id]),['attack','nearest']);return plan;
}
function createCampaign({ref,configure}={}){
  const loaded=runtime(true);
  if(ref)for(const name of ['content','world','engine','orders','summons','traps','heroes','monsters','game']){const file='resources/glantan/'+name+'.js';vm.runInContext(execFileSync('git',['show',ref+':'+file],{cwd:ROOT,encoding:'utf8'}),loaded.context,{filename:file});}
  const SC=loaded.context.Starlight,G=SC.Glantan;if(configure)configure(G);
  const count=items=>items.reduce((r,x)=>(r[x]=(r[x]||0)+1,r),{});
  let telemetry=null,trapPhase=false;
  const trapWork=G.rangerTrapWork;G.rangerTrapWork=function(w,...args){const before=w.nextId,result=trapWork(w,...args);if(telemetry)telemetry.trapsPlaced+=w.traps.filter(t=>t.id>=before).length;return result;};
  const updateTraps=G.updateTraps;G.updateTraps=function(w){trapPhase=true;try{return updateTraps(w);}finally{trapPhase=false;}};
  const effect=G.effect;G.effect=function(w,type,...args){if(telemetry&&trapPhase&&type==='snare')telemetry.trapsTriggered++;return effect(w,type,...args);};
  const snapshot=w=>({time:+w.time.toFixed(1),heroes:w.heroes.filter(G.alive).map(h=>({id:h.id,type:h.classId,level:h.level,hp:+(h.hp/h.maxHp).toFixed(3),x:+h.x.toFixed(1),y:+h.y.toFixed(1)})),upgrades:Object.keys(w.research).filter(k=>w.research[k]),buildings:count(w.buildings.filter(G.alive).map(b=>b.type)),castleHp:+G.castle(w).hp.toFixed(1),lairs:w.lairs.filter(G.alive).length,awake:w.lairs.filter(l=>G.alive(l)&&l.awake).length,raiders:w.monsters.filter(m=>G.alive(m)&&!m.guard).length,fallen:w.fallen,cleared:w.destroyed});
  const capture=(w,unit)=>{const entry=telemetry?.byWave.get(unit?.lair+':'+unit?.wave);if(!entry||entry.contact)return;const members=w.monsters.filter(m=>G.alive(m)&&m.lair+':'+m.wave===entry.key);entry.contact={...snapshot(w),distanceToCastle:+G.distance(unit,G.castle(w)).toFixed(1),survivingRoster:count(members.map(m=>m.type)),nearbyHeroes:w.heroes.filter(h=>G.alive(h)&&G.distance(h,unit)<10).map(h=>h.id),nearbyMonsters:w.monsters.filter(m=>G.alive(m)&&G.distance(m,unit)<10).length};};
  // Binder summons inherit the wave key, but are not deferred cohort members.
  // Their raisedBy marker is assigned after spawn returns, so check the type.
  const spawn=G.spawnMonster;G.spawnMonster=function(w,l,options){const m=spawn(w,l,options),entry=telemetry?.byWave.get(m?.lair+':'+m?.wave);if(m&&entry&&!m.guard&&!m.broodParent&&!m.raisedBy&&!options?.raisedBy){entry.roster[m.type]=(entry.roster[m.type]||0)+1;entry.ranks[m.rank]=(entry.ranks[m.rank]||0)+1;entry.sent++;entry.deferredSpawns=(entry.deferredSpawns||0)+1;}return m;};
  const updateMonsters=G.updateMonsters;G.updateMonsters=function(w,dt){updateMonsters(w,dt);if(telemetry)for(const m of w.monsters)if(m.waveEngaged)capture(w,m);};
  const launch=G.launchWave;G.launchWave=function(w,l){const before=w.nextId,previousWave=l.waveCount,alive=G.alive(l),result=launch(w,l);if(telemetry&&l.waveCount!==previousWave){const members=w.monsters.filter(m=>m.id>=before&&!m.guard);const entry={key:l.id+':'+l.waveCount,lair:l.id,family:l.type,tier:l.tier,level:l.level,time:+w.time.toFixed(1),final:!alive,roster:count(members.map(m=>m.type)),ranks:count(members.map(m=>m.rank)),sent:members.length,atLaunch:snapshot(w),damageToHeroes:0,damageToBuildings:0};telemetry.waves.push(entry);telemetry.byWave.set(entry.key,entry);}return result;};
  const damage=G.damage;G.damage=function(w,target,amount,attacker,...extra){const before=target?.hp||0,returned=damage(w,target,amount,attacker,...extra),dealt=Math.max(0,before-(target?.hp||0));if(telemetry&&dealt>0){if(target?.monster)capture(w,target);if(attacker?.monster)capture(w,attacker);}if(telemetry&&dealt>0&&attacker?.monster){const key=attacker.lair+':'+attacker.wave,entry=telemetry.byWave.get(key);const category=target.classId||target.skeleton?'damageToHeroes':G.buildings[target.type]?'damageToBuildings':null;if(category){telemetry[category]+=dealt;if(entry)entry[category]+=dealt;}if(target.type==='castle')telemetry.castleDamage+=dealt;}return returned;};
  function plot(w,id){let best=null,score=Infinity;for(let y=1;y<w.height-1;y++)for(let x=1;x<w.width-1;x++)if(!G.placementReason(w,id,x,y)){const d=G.distance({x,y},G.castle(w));if(d<score){score=d;best={type:'build',id,x,y};}}return best;}
  function frontier(w){let best=null,score=-1;for(let y=2;y<w.height-2;y+=3)for(let x=2;x<w.width-2;x+=3){if(w.explored[G.index(w,x,y)])continue;if(![[3,0],[-3,0],[0,3],[0,-3]].some(([dx,dy])=>G.inside(w,x+dx,y+dy)&&w.explored[G.index(w,x+dx,y+dy)]))continue;const d=G.distance({x,y},G.castle(w));if(d>score){score=d;best={x:x+.5,y:y+.5};}}return best;}
  // Only revealed lairs are considered; rank, tier and distance are visible.
  function objective(w){return w.lairs.filter(l=>G.alive(l)&&l.seen).sort((a,b)=>(a.boss?100:0)+a.tier*8+a.level*3+G.distance(a,G.castle(w))*.1-((b.boss?100:0)+b.tier*8+b.level*3+G.distance(b,G.castle(w))*.1))[0];}
  const attackLevel=(w,policy)=>POLICIES[policy].coordinated?Math.min(3,Math.max(1,Math.floor((G.population(w)-2)/2))):1;
  function attack(w,policy){const target=objective(w);return target?{type:'bounty',id:'attack',target:target.id,level:attackLevel(w,policy)}:null;}
  return function run(config={}){
    const {seed='0',pace='brave',policy='mixed',seconds=6,accuracy=.95,jitter=.25,limit=1800,trace=true}=config;
    const rng=random('answers:'+seed),latency=()=>seconds*(1+jitter*(2*rng()-1));
    const plan=planFor(policy),waves=[],purchases=[],samples=[],attemptTimes=[];
    telemetry={trapsPlaced:0,trapsTriggered:0,waves,byWave:new Map(),damageToHeroes:0,damageToBuildings:0,castleDamage:0};
    let paid=0,chosenCost=0,planIndex=0,nextAnswer=Infinity,nextDecision=0,nextSample=0,nextContact=0,bells=0,lastBell=-100,invalidChoices=0,stalledSeconds=0;
    const game=new SC.GlantanGame({random:()=>.37,onEvent:event=>{if(event.type==='glantan-purchase'){paid+=chosenCost;purchases.push({time:+game.world.time.toFixed(1),action:event.action,cost:chosenCost});}}});
    game.start({seed,pace,mode:'swedish',items:[{label:'sol',answer:'sol'}],fresh:true});const w=game.world;
    let maxRaiders=0,maxNearCastle=0,minCastleFraction=1,firstLoss=null;
    while(game.state==='playing'&&w.time<limit){
      if(!game.pending&&w.time>=nextDecision){nextDecision=w.time+1;let action=null,advance=false;
        const fallen=w.heroes.find(h=>!G.alive(h)),ruined=w.buildings.find(b=>!G.alive(b)&&!['house','castle'].includes(b.type)&&G.buildings[b.type].cost<8&&!G.hasBuilding(w,b.type));
        if(G.castle(w).hp<G.castle(w).maxHp*.5)action={type:'repair',target:G.castle(w).id};
        else if(fallen&&G.population(w)<G.capacity(w))action={type:'resurrect',target:fallen.id};
        else if(fallen&&G.population(w)>=G.capacity(w))action=plot(w,'house');
        else if(ruined)action=plot(w,ruined.type);
        else if(POLICIES[policy].coordinated&&w.bounties.some(b=>b.type==='attack'&&b.level<attackLevel(w,policy))){const b=w.bounties.find(b=>b.type==='attack'&&b.level<attackLevel(w,policy));action={type:'bounty',id:'attack',target:b.target,level:attackLevel(w,policy)};}
        else if(planIndex<plan.length){const[type,id]=plan[planIndex];
          if(type==='attack'){if(w.bounties.some(b=>b.type==='attack'))planIndex++;else{action=attack(w,policy);advance=!!action;if(!action)planIndex++;}}
          else if(type==='guard'){const c=G.castle(w);action={type:'bounty',id:'defend',x:c.x,y:c.y,level:1};advance=true;}
          else{const needs=type==='research'?G.research[id].building:type==='recruit'?G.classes[id].guild:null;action=needs&&!G.hasBuilding(w,needs)?plot(w,needs):type==='build'?plot(w,id):{type,id};advance=action?.type===type&&action?.id===id;}
        }else{const current=w.bounties.find(b=>b.type==='attack');if(current){const group=w.expeditions.find(e=>e.bounty===current.id);if(current.level<3&&(group?.reason==='Höj belöningen'||current.waitReason==='Höj belöningen'))action={type:'bounty',id:'attack',target:current.target,level:current.level+1};}
          else{action=attack(w,policy);if(!action&&!w.bounties.some(b=>b.type==='explore')){const point=frontier(w);if(point)action={type:'bounty',id:'explore',...point,level:1};}}
        }
        action=G.normalizeAction(w,action);
        if(action&&!G.availability(w,action)&&game.choose(action)){chosenCost=G.actionCost(w,action);if(advance)planIndex++;nextAnswer=w.time+latency();}
        else if(action)invalidChoices++;
      }
      if(w.bellCharges&&w.time-lastBell>=8&&(G.castle(w).hp<G.castle(w).maxHp*.45||w.heroes.filter(h=>G.alive(h)&&h.hp<h.maxHp*.3).length>=2)){if(game.ringBell()){bells++;lastBell=w.time;}}
      if(game.canAnswer()&&w.time+.001>=nextAnswer){attemptTimes.push(w.time);game.answer({text:rng()<accuracy?game.targets[0].item.answer:'definitely incorrect',source:'typing'});nextAnswer=w.time+latency();}
      game.update(.1);
      if(!game.pending&&planIndex<plan.length)stalledSeconds+=.1;
      if(w.time>=nextContact){nextContact=w.time+1;const living=w.monsters.filter(G.alive),raiders=living.filter(m=>!m.guard);maxRaiders=Math.max(maxRaiders,raiders.length);maxNearCastle=Math.max(maxNearCastle,raiders.filter(m=>G.distance(m,G.castle(w))<12).length);minCastleFraction=Math.min(minCastleFraction,G.castle(w).hp/G.castle(w).maxHp);if(w.fallen&&!firstLoss)firstLoss=+w.time.toFixed(1);
      }
      if(w.time>=nextSample){nextSample=w.time+60;samples.push(snapshot(w));}
    }
    const result={config,source:ref||'working-tree',outcome:w.outcome||'timeout',seconds:+w.time.toFixed(1),shots:game.shots,hits:game.hits,errors:game.shots-game.hits,paid,planIndex,planLength:plan.length,invalidChoices,idleBeforePlanCompleteSeconds:+stalledSeconds.toFixed(1),extremaSamplingSeconds:1,bells,fallen:w.fallen,firstLoss,cleared:w.destroyed,castleHp:+G.castle(w).hp.toFixed(1),minCastleFraction,maxRaiders,maxNearCastle,heroes:snapshot(w).heroes,upgrades:Object.keys(w.research).filter(k=>w.research[k]),damageToHeroes:+telemetry.damageToHeroes.toFixed(1),damageToBuildings:+telemetry.damageToBuildings.toFixed(1),castleDamage:+telemetry.castleDamage.toFixed(1),trapsPlaced:telemetry.trapsPlaced,trapsTriggered:telemetry.trapsTriggered,purchases,waves,samples};
    if(!trace){delete result.samples;delete result.waves;delete result.purchases;}telemetry=null;return result;
  };
}
module.exports={createCampaign,POLICIES,planFor,random};
if(require.main===module){const config=JSON.parse(process.argv[2]||'{}');console.log(JSON.stringify(createCampaign({ref:process.env.GLANTAN_REF})(config)));}
