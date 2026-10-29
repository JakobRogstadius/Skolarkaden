'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {suites,gameSources}=require('./manifest.cjs');
const root=path.resolve(__dirname,'..');
const matches=(file,source)=>source.endsWith('/')?file.startsWith(source):file===source;
const infrastructure=new Set(['tests/run.cjs','tests/selection.cjs','tests/manifest.cjs','tests/helpers/runtime.cjs','package.json']);
const documentation=file=>/(?:^|\/)(?:README|AUDIT|AGENTS)\.md$|\.(?:md|txt)$/.test(file)||['LICENSE','.gitignore'].includes(file);
const areas=[...new Set(suites.flatMap(suite=>suite.areas).concat(Object.keys(gameSources)))].sort();
function parseArgs(args){
 const options={selector:'changed',extended:false,list:false};let selector;
 for(let i=0;i<args.length;i++){
  const [flag,attached]=args[i].split(/=(.*)/s);
  const value=()=>{const result=attached===undefined?args[++i]:attached;if(!result||result.startsWith('--'))throw Error(flag+' needs a value');return result;};
  if(['--changed','--all','--area'].includes(flag)){
   if(selector)throw Error('Choose one of --changed, --area or --all');selector=flag.slice(2);options.selector=selector;
   if(flag==='--area')options.area=value();else if(attached!==undefined)throw Error(flag+' does not take a value');
  }else if(flag==='--base')options.base=value();
  else if(['--extended','--list','--help'].includes(flag)&&attached===undefined)options[flag.slice(2)]=true;
  else throw Error('Unknown option: '+args[i]);
 }
 if(options.area&&!areas.includes(options.area))throw Error('Unknown area '+options.area+'. Choose: '+areas.join(', '));
 if(options.base&&options.selector!=='changed')throw Error('--base applies only to --changed');
 return options;
}
function git(args,cwd=root){return execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:16*1024*1024});}
function hasRef(ref,cwd){try{git(['rev-parse','--verify',ref+'^{commit}'],cwd);return true;}catch{return false;}}
const splitPaths=output=>output.split('\0').filter(Boolean);
const stripVersions=html=>html.replace(/((?:src|href)="resources\/[^"?]+)\?v=[a-f0-9]{12}(")/g,'$1$2');
function changedFiles({cwd=root,base}={}){
 git(['rev-parse','--show-toplevel'],cwd);
 if(base&&!hasRef(base,cwd))throw Error('Cannot resolve base reference '+base);
 base||=['origin/main','main'].find(ref=>hasRef(ref,cwd));
 const mergeBase=base?git(['merge-base','HEAD',base],cwd).trim():null,files=new Set();
 if(mergeBase)for(const file of splitPaths(git(['diff','--name-only','-z','--no-renames',mergeBase,'HEAD'],cwd)))files.add(file);
 for(const args of [['diff','--name-only','-z','--no-renames','--cached'],['diff','--name-only','-z','--no-renames'],['ls-files','--others','--exclude-standard','-z']])for(const file of splitPaths(git(args,cwd)))files.add(file);
 // Ignore only generated version stamps, comparing the branch base, HEAD,
 // index and worktree so a staged structural edit cannot be hidden.
 const assetOnly=new Set();
 for(const file of ['index.html','statistics.html','homework.html'])if(files.has(file)&&mergeBase){
  try{
   const versions=[git(['show',mergeBase+':'+file],cwd),git(['show','HEAD:'+file],cwd),git(['show',':'+file],cwd),fs.readFileSync(path.join(cwd,file),'utf8')].map(stripVersions);
   if(versions.every(content=>content===versions[0]))assetOnly.add(file);
  }catch{/* Added/deleted pages and missing index versions need ordinary tests. */}
 }
 return {files:[...files].sort(),assetOnly,base:mergeBase,fallback:!base};
}
function knownAsset(file){return /\.(?:svg|woff2?|mp3|png|jpe?g|ico)$/.test(file)||file==='dev/version-assets.cjs';}
function select(options,changes={files:[],assetOnly:new Set()}){
 const available=suites.filter(suite=>options.extended||!suite.extended),selected=new Map();
 const add=(suite,reason,games=null)=>{
  let entry=selected.get(suite.file);
  if(!entry){entry={...suite,reasons:[],selectedGames:games&&new Set(games)};selected.set(suite.file,entry);}
  else if(!games)entry.selectedGames=null;else if(entry.selectedGames)for(const game of games)entry.selectedGames.add(game);
  if(!entry.reasons.includes(reason))entry.reasons.push(reason);
 };
 if(options.selector==='all')for(const suite of available)add(suite,'all '+(suite.extended?'extended':'ordinary')+' tests');
 else if(options.selector==='area'){
  for(const suite of available){if(suite.areas.includes(options.area))add(suite,'area '+options.area);else if(suite.games?.includes(options.area))add(suite,'game integration: '+options.area,[options.area]);}
 }else{
  if(changes.fallback)for(const suite of available)add(suite,'no main reference; conservative full run');
  for(const file of changes.files){
   if(documentation(file))continue;
   if(changes.assetOnly?.has(file)){add(available.find(suite=>suite.file==='tests/app/assets.test.cjs'),file+' (asset versions only)');continue;}
   if(infrastructure.has(file)){for(const suite of available)add(suite,file+' (test infrastructure)');continue;}
   // Recognize extended-only changes even while their execution is disabled.
   const relevant=suites.filter(suite=>suite.file===file||suite.sources.some(source=>matches(file,source)));
   if(!relevant.length||(relevant.every(suite=>suite.file==='tests/app/assets.test.cjs')&&!knownAsset(file))){for(const suite of available)add(suite,file+' (unmapped; full run)');continue;}
   for(const suite of relevant.filter(suite=>options.extended||!suite.extended)){
    let games=null;
    if(suite.games&&file!==suite.file&&!file.startsWith('tests/')){
     const affected=suite.games.filter(game=>gameSources[game].some(source=>matches(file,source)));
     if(affected.length)games=affected;
    }
    add(suite,file,games);
   }
  }
 }
 return [...selected.values()].sort((a,b)=>a.file.localeCompare(b.file)).map(entry=>({...entry,selectedGames:entry.selectedGames?[...entry.selectedGames].sort():null}));
}
function validateManifest(cwd=root){
 const discovered=[];
 function visit(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
  const full=path.join(folder,entry.name);if(entry.isDirectory())visit(full);else if(entry.name.endsWith('.test.cjs'))discovered.push(path.relative(cwd,full).split(path.sep).join('/'));
 }}
 visit(path.join(cwd,'tests'));const registered=suites.map(suite=>suite.file);
 if(new Set(registered).size!==registered.length)throw Error('Duplicate test registration');
 const missing=registered.filter(file=>!discovered.includes(file)),extra=discovered.filter(file=>!registered.includes(file));
 if(missing.length||extra.length)throw Error('Test manifest mismatch. Missing: '+missing.join(', ')+'; unregistered: '+extra.join(', '));
}
module.exports={root,areas,parseArgs,changedFiles,select,validateManifest,stripVersions};
