// Keep browser caches from combining new dictionaries with old answer handlers.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),file=path.join(root,'index.html'),html=fs.readFileSync(file,'utf8');
const updated=html.replace(/((?:src|href)=")(resources\/[^"?]+)(?:\?[^"]*)?(")/g,(_,prefix,asset,suffix)=>{
  const version=createHash('sha256').update(fs.readFileSync(path.join(root,asset))).digest('hex').slice(0,12);
  return prefix+asset+'?v='+version+suffix;
});
if(process.argv.includes('--check')){
  if(updated!==html){console.error('Asset versions are outdated. Run npm run assets and commit index.html with the changed resources.');process.exitCode=1;}
}else if(updated!==html){fs.writeFileSync(file,updated);console.log('Updated asset versions in index.html.');}
