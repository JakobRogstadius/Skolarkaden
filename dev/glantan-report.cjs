/* Rebuild compact statistics from the committed experiment evidence.
 * node dev/glantan-report.cjs
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {observations,synergy}=require('./glantan-evidence.cjs');
const dir=path.resolve(__dirname,'../docs/glantan-combat');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
function load(name) {
  const item=manifest.datasets.find(d=>d.name===name);if(!item)throw Error('Missing dataset: '+name);
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir,item.file))));
}
const rows=name=>observations(load(name));
const heroSpecs=[['bulwark',1.3,'warrior','mage'],['hush',1,'ranger','healer'],['thorn',.7,'healer','mage'],['shielded',1,'mage','necromancer'],['bulwark',1.3,'warrior','healer']];
const heroRows=rows('baseline-hero-validation');
const heroes=heroSpecs.map(([family,ratio,a,b])=>{
  const get=army=>heroRows.filter(r=>r.config.study.family===family&&r.config.study.ratio===ratio&&r.config.study.army===army);
  const mixed=get(a+'+'+b),A=get(a),B=get(b);
  return {family,ratio,pair:[a,b],timeouts:[mixed,A,B].map(rs=>rs.filter(r=>r.outcome==='timeout').length),...synergy(mixed,A,B)};
});
const enemyDatasets=manifest.datasets.filter(d=>d.name.startsWith('enemy-')&&(/validation|confirmation/.test(d.name)));
const enemies=[];
for(const dataset of enemyDatasets){
  const data=rows(dataset.name), keys=[...new Set(data.map(r=>r.config.enemyStudy?.key).filter(Boolean))];
  for(const key of keys){
    const get=arm=>data.filter(r=>r.config.enemyStudy.key===key&&r.config.enemyStudy.arm===arm);
    const mixed=get('mixed'),A=get('pureA'),B=get('pureB');if(!mixed.length||!A.length||!B.length)continue;
    const context=mixed[0].config.enemyStudy;
    const result=synergy(mixed,A,B,'loss');
    const reportFamilyAlpha=.05/(2*keys.length);
    enemies.push({dataset:dataset.name,key,pair:context.pair,army:context.army,scale:context.scale,ratio:context.ratio,mode:mixed[0].config.mode,eligible:context.match.eligible,budgets:context.match.budgets,counts:context.match.counts,preexistingCorpses:context.preexistingCorpses||0,actualSupportShare:context.actualSupportShare,timeouts:[mixed,A,B].map(rs=>rs.filter(r=>r.outcome==='timeout').length),...result,reportFamilyAlpha,reportFamilyPass:result.passes&&result.comparisons.every(c=>c.oneSidedExactP<reportFamilyAlpha)});
  }
}
const progression=load('progression-baseline').metadata.summary;
const levels=[1,3,5,8].map(level=>({level,cells:[1,3,5,6].map(rank=>{
  const groups=progression.filter(s=>s.level===level&&s.rank===rank);
  return{rank,n:groups.reduce((s,g)=>s+g.n,0),wins:groups.reduce((s,g)=>s+g.wins,0),losses:groups.reduce((s,g)=>s+g.losses,0),timeouts:groups.reduce((s,g)=>s+g.timeouts,0)};
})}));
const hushBefore=load('hush-validation-before').metadata.summary,hushAfter=load('hush-validation-after').metadata.summary;
const rejectedHush=hushBefore.map(before=>({family:before.family,army:before.army,n:before.n,before:{wins:before.wins,losses:before.losses,timeouts:before.timeouts,duration:before.duration},after:(()=>{const a=hushAfter.find(r=>r.id===before.id);return{wins:a.wins,losses:a.losses,timeouts:a.timeouts,duration:a.duration};})()}));
const siegeSources=['enemy-siege-final-original','enemy-siege-final-interception','siege-production-validation'];
const acceptedSiege=siegeSources.map(dataset=>{
  const data=rows(dataset),get=arm=>data.filter(r=>r.config.enemyStudy.arm===arm);
  const mixed=get('mixed'),A=get('pureA'),B=get('pureB'),context=mixed[0].config.enemyStudy;
  return {dataset,source:load(dataset).metadata.sourceSha256||load(dataset).metadata.runtimeSha256Before,controls:{castleShots:true,endOnPartyDeath:false,deadline:75},budgets:context.match.budgets,counts:context.match.counts,timeouts:[mixed,A,B].map(rs=>rs.filter(r=>r.outcome==='timeout').length),...synergy(mixed,A,B,'loss')};
});
const output={baseline:manifest.baseline,totalArchivedArenas:manifest.totalArenas,heroSynergies:heroes,enemySynergies:enemies,acceptedSiege,progression:levels,rejectedHush,counterValidation:load('hero-counter-validation').metadata.summary};
fs.writeFileSync(path.join(dir,'analysis.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({heroContrasts:heroes.length,enemyContrasts:enemies.length,totalArchivedArenas:manifest.totalArenas,out:path.join(dir,'analysis.json')}));
