'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'language-exercises.json'),'utf8'));
const context=vm.createContext({Starlight:{languageExerciseData:data}});
for(const file of ['data','language-exercises'])vm.runInContext(fs.readFileSync(path.join(root,'resources/'+file+'.js'),'utf8'),context,{filename:file+'.js'});
const output='// Generated from language-exercises.json by npm run assets. Do not edit.\n'+
  '(globalThis.Starlight=globalThis.Starlight||{}).languageExerciseData='+JSON.stringify(data)+';\n';
const file=path.join(root,'resources/language-exercises-data.js');
if(process.argv.includes('--check')){
  if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==output){console.error('Language data fallback is outdated. Run npm run assets.');process.exitCode=1;}
}else if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==output){fs.writeFileSync(file,output);console.log('Updated the local language data fallback.');}
