'use strict';
const path=require('node:path'),{spawnSync}=require('node:child_process');
const {root,areas,parseArgs,changedFiles,select,validateManifest}=require('./selection.cjs');
try{
 const options=parseArgs(process.argv.slice(2));
 if(options.help){
  console.log(`Usage: npm test -- [--changed | --area=NAME | --all] [--extended] [--list]
  --changed       Affected tests for branch, staged, unstaged and untracked changes (default).
  --base=REF      Compare against the merge base with REF (default: origin/main).
  --area=NAME     A feature's tests and its compact game integration checks.
  --all           Every ordinary test, regardless of changes.
  --extended      Also include selected full-game, balance and layout sweeps.
  --list          Explain the selection without executing it.
Areas: ${areas.join(', ')}`);
 }else{
  validateManifest();
  const changes=options.selector==='changed'?changedFiles({base:options.base}):undefined;
  if(changes)console.log(`Changed files: ${changes.files.length}${changes.base?' (base '+changes.base.slice(0,8)+')':''}`);
  const selected=select(options,changes);
  for(const suite of selected)console.log(`${options.list?'SELECT':'RUN'} ${suite.file}${suite.selectedGames?' [games: '+suite.selectedGames.join(', ')+']':''}\n  ${suite.reasons.join('; ')}`);
  if(!selected.length)console.log('No affected '+(options.extended?'':'ordinary ')+'tests. Use --all for a full run.');
  if(!options.list&&selected.length){
   let failed=0;const start=performance.now();
   for(const suite of selected){
    const env={...process.env};delete env.SKOLARKADEN_TEST_GAMES;
    if(suite.selectedGames)env.SKOLARKADEN_TEST_GAMES=suite.selectedGames.join(',');
    const before=performance.now();
    const result=spawnSync(process.execPath,[path.join(root,suite.file)],{cwd:root,env,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
    const passed=result.status===0;
    console.log(`${passed?'PASS':'FAIL'} ${suite.file} (${((performance.now()-before)/1000).toFixed(2)} s)`);
    if(!passed){failed++;process.stderr.write((result.stdout||'')+(result.stderr||''));if(result.error)console.error(result.error.message);}
   }
   console.log(`${selected.length-failed}/${selected.length} suites passed in ${((performance.now()-start)/1000).toFixed(2)} s.`);process.exitCode=failed?1:0;
  }
 }
}catch(error){console.error(error.message);process.exitCode=1;}
