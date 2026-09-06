'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const files=fs.readdirSync(__dirname).filter(file=>file.endsWith('.cjs')&&file!=='run.cjs').sort();
let failed=0;
for(const file of files){const result=spawnSync(process.execPath,[path.join(__dirname,file)],{encoding:'utf8'});console.log((result.status===0?'PASS ':'FAIL ')+file);if(result.status!==0){failed++;process.stderr.write(result.stdout+result.stderr);if(result.error)console.error(result.error);}}
console.log(`${files.length-failed}/${files.length} test suites passed.`);process.exitCode=failed?1:0;
