/* Read-only prototypes: explicit damage kinds, no targeting/AI overrides. */
'use strict';
function replace(source, from, to) {
  if (!source.includes(from)) throw Error('Prototype source anchor missing: '+from);
  return source.replace(from,to);
}
function transformSource(source, file) {
  if (file === 'heroes') {
    source = replace(source, 'else G.damage(w, target, damage, hero);', "else G.damage(w, target, damage, hero, magic ? 'magic' : 'physical');");
    source = replace(source, 'G.damage(w, monster, damage * (w.research.echo ? 0.8 : 0.5), hero);', "G.damage(w, monster, damage * (w.research.echo ? 0.8 : 0.5), hero, 'area');");
  }
  if (file === 'summons') {
    source = replace(source, 'G.damage(w, target, damage, hero);', "G.damage(w, target, damage, hero, 'magic');");
    source = replace(source, 'G.damage(w, monster, damage * .65, hero);', "G.damage(w, monster, damage * .65, hero, 'area');");
  }
  return source;
}
function configure({ physical=1, magic=1, area=1 }={}) {
  return G => {
    const damage=G.damage;
    G.damage=function(w,target,amount,attacker,kind='physical') {
      const parent=target?.type==='broodcap', descendant=!!target?.broodParent;
      if (kind==='area' && (parent||descendant)) amount*=area;
      else if(parent) amount*=kind==='physical'?physical:magic;
      return damage(w,target,amount,attacker,kind);
    };
  };
}
module.exports={configure,transformSource};
