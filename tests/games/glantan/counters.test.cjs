'use strict';
const assert=require('node:assert/strict');
const {runtime}=require('./helpers.cjs');
const {G}=runtime();
function arena(type='rust'){
 const w=G.createMap('counter-rules','brave');w.terrain.fill(0);w.paths.fill(0);w.explored.fill(1);delete w.lairSites;
 G.addBuilding(w,'castle',4,4);G.addBuilding(w,'house',7,4);
 const lair=G.addLair(w,{tx:28,ty:15,type,tier:1},1e6);w.monsters=[];w.time=10;w.tick=100;
 return {w,lair};
}
const hero=(w,type,x=16,y=15)=>Object.assign(G.addHero(w,type),{x,y,trait:2});
const enemy=(w,lair,type,x=18,y=15)=>Object.assign(G.spawnMonster(w,lair,{type}),{x,y,waveEngaged:true});
{
 const {w,lair}=arena(),knight=hero(w,'warrior'),mage=hero(w,'mage'),target=enemy(w,lair,'bulwark');
 for(let i=0;i<4;i++){G.corrode(w,knight);G.corrode(w,mage);}
 assert.equal(knight.corrosionStacks,3);
 assert(!mage.corrosionStacks,'spellcasters do not gain weapon rust or misleading retreat penalties');
 const reduced=G.damage(w,target,10,knight);assert(Math.abs(reduced-2.2)<1e-9);
 assert.equal(G.damage(w,target,10,mage),10,'rust does not undermine the intended magic counter');
 G.cleanse(w,knight);G.corrode(w,knight);assert.equal(knight.corrosionStacks,0,'washing gives time to attack before rust returns');
 const loaded=new G.Simulation({saved:JSON.parse(JSON.stringify(w))}).world;
 G.corrode(loaded,loaded.heroes[0]);assert.equal(loaded.heroes[0].corrosionStacks,0,'protection survives saving');
 loaded.time+=3;G.corrode(loaded,loaded.heroes[0]);assert.equal(loaded.heroes[0].corrosionStacks,1,'protection expires');
}
{
 const {w,lair}=arena(),doctor=hero(w,'healer',15,15),a=hero(w,'warrior',16,15),b=hero(w,'warrior',16,16);
 G.corrode(w,a);G.corrode(w,b);G.updateHeroes(w,.1);
 assert.equal(doctor.actionCue.kind,'heal');assert.equal(a.corrosionStacks,0);assert.equal(b.corrosionStacks,0,'one wash supports the nearby front line');
 assert(doctor.cooldown>0);assert(!G.useAbility(w,doctor,a),'washing consumes the shared action');
}
{
 const {w,lair}=arena('spore'),ranger=hero(w,'ranger',14,15),m=enemy(w,lair,'broodcap',18,15);
 assert(!G.visibleTarget(w,ranger,m));const hp=ranger.hp;
 ranger.x=17;G.updateCounters(w,.1);assert(ranger.hp<hp,'mist causes real damage');
 G.clearMist(w,18,15);G.cleanse(w,ranger);assert(G.visibleTarget(w,ranger,m));const washed=ranger.hp;G.updateCounters(w,.1);assert.equal(ranger.hp,washed);
 w.time+=6;assert(G.inMist(w,m),'cleared mist returns');
}
{
 const {w,lair}=arena('hush'),mage=hero(w,'mage'),ranger=hero(w,'ranger'),necro=hero(w,'necromancer'),ghost=enemy(w,lair,'husher');
 assert.equal(G.damage(w,ghost,10,mage),5.5);assert.equal(ghost.echoHp,4.5);
 assert.equal(G.damage(w,ghost,10,mage,'area'),3.5);
 assert.equal(G.damage(w,ghost,2,ranger),0,'stored shield absorbs the next arrow');
 G.necromancerStrike(w,necro,ghost,5);assert.equal(ghost.echoHp,0,'soul magic breaks accumulated shields');
 assert(w.effects.some(e=>e.type==='unbind'));
}
{
 const {w,lair}=arena('hush'),necro=hero(w,'necromancer'),servant=enemy(w,lair,'boneservant');
 G.necromancerStrike(w,necro,servant,5);assert.equal(servant.hp,0);assert.equal(G.ownedSkeletons(w,necro).length,1);
 assert.equal(w.corpses.length,0,'conversion cannot recycle remains');
}
{
 const {w}=arena(),necro=hero(w,'necromancer');G.updateHeroes(w,.1);
 assert.equal(necro.actionCue.kind,'raise');assert.equal(G.ownedSkeletons(w,necro).length,1,'a new summoner has a usable friend without a corpse');
 const s=G.ownedSkeletons(w,necro)[0];s.hp=0;w.time+=4;necro.cooldown=0;G.updateHeroes(w,.1);
 assert.equal(G.ownedSkeletons(w,necro).length,0,'starter cannot be granted repeatedly');
}
{
 const {w,lair}=arena('thorn'),doctor=hero(w,'healer'),archer=enemy(w,lair,'thornling');
 G.damage(w,doctor,20,archer);const cap=G.healthCap(w,doctor);assert(cap<doctor.maxHp);G.healHealth(w,doctor,1e3);assert.equal(doctor.hp,cap);
 w.time+=6;G.updateCounters(w,1);assert(G.healthCap(w,doctor)>cap,'wounds recover after arrows stop');
 const knight=hero(w,'warrior',16.5,15),before=doctor.hp;G.damage(w,doctor,10,archer);assert.equal(doctor.hp,before);assert(knight.hp<knight.maxHp);assert(!knight.thornWound,'shield interception prevents the wound');
}
{
 const {w,lair}=arena('sky'),bird=enemy(w,lair,'nightwing',6.6,5);
 for(let dive=1;dive<=3;dive++){
  bird.cooldown=0;G.updateMonsters(w,.1);
  assert.equal(G.flying(bird,w),dive!==3,'only every third dive opens a melee window');
  w.time+=2;w.tick+=20;
 }
 assert(G.flying(bird,w),'landing window ends');
}
assert.equal(G.waveInterval({pace:'brave'},{}),210);
assert.equal(G.profiles.brave.firstWake,150);
console.log('Five-family counters, action costs and save persistence passed');
