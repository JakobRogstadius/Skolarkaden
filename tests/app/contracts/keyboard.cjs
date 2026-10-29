'use strict';
const assert=require('node:assert/strict');
const {load,rng,tick,games}=require('../../helpers/runtime.cjs');
const SC=load(['pinyin','data','language-exercises-data','language-exercises','input','people','game','foodtruck','plants','garden','beehive','paint']);
  for(const Game of games([SC.CityGame,SC.FoodTruckGame,SC.GardenGame,SC.BeehiveGame,SC.PaintGame])){
    const g=new Game({random:rng(31)});g.start({mode:'letters',lang:'sv-SE'});const first=g.items,initial=first.map(i=>i.answer).join('');tick(g,4);assert.equal(g.items,first);
    const variants=new Set([initial]);for(let i=0;i<12;i++){g.start({mode:'letters',lang:'sv-SE'});variants.add(g.items.map(i=>i.answer).join(''));}assert(variants.size>1);
    g.start({mode:'bopomofo'});assert.equal(g.items.length,37);
  }
console.log('PASS stable keyboard subsets and fresh rounds in selected games');
