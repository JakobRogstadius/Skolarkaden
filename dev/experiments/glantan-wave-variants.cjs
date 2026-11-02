'use strict';
// Frozen exploratory candidates. These change only raid composition/schedule.
const variants={
  baseline:null,
  cohesive:{interval:105,wake:78,growth:.9,scale:1},
  pressure:{interval:92,wake:60,growth:.75,scale:1},
  severe:{interval:82,wake:60,growth:.65,scale:1.25},
  measured:{interval:100,wake:78,growth:.9,scale:1,roster:'measured'},
  breathing:{interval:120,wake:78,growth:.9,scale:1,roster:'measured'},
  earlier:{interval:110,wake:70,growth:.8,scale:1,roster:'measured'},
  escorted:{interval:110,wake:78,growth:.9,scale:1,roster:'escorted'},
  companies:{interval:125,wake:78,growth:.9,scale:1,roster:'companies'},
  regroup:{interval:150,wake:78,growth:.9,scale:1,roster:'companies'},
  scheduled:{interval:125,wake:78,growth:.9,scale:1,roster:'companies',scheduled:true},
  recovery:{interval:150,wake:78,growth:.9,scale:1,roster:'companies',scheduled:true}
};
const measured={
  rust:{rattler:[2,3,4,5,6,8],mender:[0,0,1,1,1,2]},
  spore:{sporeling:[3,4,4,5,6,7],broodcap:[0,0,1,1,1,1],husher:[0,0,1,1,1,2]},
  hush:{husher:[2,2,3,3,4,4],bulwark:[0,0,1,1,1,1],binder:[0,0,0,0,1,1]},
  sky:{nightwing:[2,3,4,4,5,6],mender:[0,0,1,1,1,1],siegebreaker:[0,0,0,1,1,1]},
  thorn:{thornling:[2,3,3,4,4,5],bulwark:[0,0,1,1,1,1]}
};
const escorted={
  rust:{...measured.rust,mender:[0,1,1,1,1,2]},
  spore:{...measured.spore,husher:[0,1,1,1,1,2]},
  hush:{...measured.hush,bulwark:[0,1,1,1,1,1]},
  sky:{...measured.sky,mender:[0,1,1,1,1,1]},
  thorn:{...measured.thorn,bulwark:[0,1,1,1,1,1]}
};
const companies={
  rust:{rattler:[4,6,8,10,11,11],mender:[0,1,1,2,2,2]},
  spore:{sporeling:[4,6,6,7,8,8],broodcap:[0,0,1,2,2,2],husher:[0,1,2,2,2,3]},
  hush:{husher:[2,4,5,6,7,8],bulwark:[0,1,1,1,1,1],binder:[0,0,0,0,1,1]},
  sky:{nightwing:[3,5,7,9,9,10],mender:[0,1,1,1,2,2],siegebreaker:[0,0,0,1,1,1]},
  thorn:{thornling:[2,4,6,8,9,10],bulwark:[0,1,1,1,1,2]}
};
const rosters={
  rust:{rattler:[3,5,6,7,8,10],mender:[0,1,1,1,2,2]},
  spore:{sporeling:[4,5,5,6,7,8],broodcap:[0,0,1,1,2,2],husher:[0,1,1,2,2,2]},
  hush:{husher:[2,3,3,4,4,5],bulwark:[0,0,1,1,1,1],binder:[0,0,0,1,1,1]},
  sky:{nightwing:[3,4,5,6,7,8],mender:[0,1,1,1,1,1],siegebreaker:[0,0,1,1,2,2]},
  thorn:{thornling:[2,3,4,4,5,6],bulwark:[0,1,1,1,2,2]}
};
function configure(name){if(!(name in variants))throw Error('Unknown wave variant '+name);const p=variants[name];if(!p)return undefined;
  return G=>{Object.assign(G.profiles.brave,{wake:p.wake,growth:p.growth});
    const legacyRoster=G.waveRoster||((w,l)=>{const f=G.lairTypes[l.type],s=G.lairWave(l);return[...Array(s.basic).fill(f.monster),...Array(s.advanced).fill(f.support)];});
    const legacyInterval=G.waveInterval||((w,l)=>Math.max(50,(82-l.level*5+(l.level>=2?22:0))*G.profiles[w.pace].spawn));
    G.waveRoster=(w,l)=>w.pace!=='brave'?legacyRoster(w,l):Object.entries((p.roster==='companies'?companies:p.roster==='escorted'?escorted:p.roster==='measured'?measured:rosters)[l.type]).flatMap(([type,counts])=>Array(Math.round(counts[Math.min(5,l.tier+l.level-2)]*p.scale)).fill(type));
    G.waveInterval=(w,l)=>w.pace!=='brave'?legacyInterval(w,l):p.interval;
    if(p.scheduled){const launch=G.launchWave;G.launchWave=(w,l)=>w.pace==='brave'&&G.alive(l)&&l.level>1&&w.time>=l.nextGrowth?0:launch(w,l);}
  };
}
module.exports={configure,variants,rosters,measured,escorted,companies};
