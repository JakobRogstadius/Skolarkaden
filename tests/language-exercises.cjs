'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const data=JSON.parse(read('language-exercises.json'));
const ctx=vm.createContext({URL,AbortController,setTimeout,clearTimeout,document:{currentScript:{src:'https://example.test/Skolarkaden/resources/language-exercises.js?v=test'}}});
for(const file of ['pinyin','data','language-exercises-data','language-exercises','speech'])vm.runInContext(read('resources/'+file+'.js'),ctx);
const SC=ctx.Starlight,plain=value=>JSON.parse(JSON.stringify(value));
(async()=>{
  const bundled=plain(SC.modes),math=SC.modes['math-addition'];
  SC.applyLanguageExercises(data);assert.deepEqual(plain(SC.modes),bundled);
  const lexicon=SC.pairSpeechLexicon({lesson:'english-synonyms',language:'en-US'});
  const edited=structuredClone(data);edited.exercises.swedish.words=['tekopp'];
  edited.exercises['english-synonyms'].pairs[0][3].push('a new alternative');
  edited.mandarinLevels[2][0][3]='en ändrad betydelse';
  let release;const pending=SC.loadLanguageExercises(async(url,options)=>{
    assert.equal(url,'https://example.test/Skolarkaden/language-exercises.json');assert.equal(options.cache,'no-cache');
    await new Promise(resolve=>release=resolve);return {ok:true,json:async()=>edited};
  });
  assert.deepEqual(plain(SC.modes),bundled,'no partial state while loading');release();await pending;
  assert.deepEqual(plain(SC.modes.swedish.items.map(i=>i.answer)),['tekopp']);
  assert.equal(SC.modes.chineseTrad3.items.find(i=>i.answer==='你好').translation,'en ändrad betydelse');
  assert.equal(SC.modes.chineseSimpl3.items.find(i=>i.answer==='你好').translation,'en ändrad betydelse');
  assert(SC.pairSpeechLexicon({lesson:'english-synonyms',language:'en-US'}).forms.has('a new alternative'));
  assert.notEqual(SC.pairSpeechLexicon({lesson:'english-synonyms',language:'en-US'}),lexicon);
  assert.equal(SC.modes['math-addition'],math,'math generators stay in code');
  const active=SC.modes;
  for(const mutate of [d=>d.version=9,d=>d.exercises.swedish.words=[],d=>d.mandarinLevels[0][0].pop(),d=>d.exercises.chinese.level=99,d=>d.exercises.bopomofo.keys.push(d.exercises.bopomofo.keys[0]),d=>delete d.exercises.letters,d=>d.exercises['english-synonyms'].pairs[0][3]=null]){
    const broken=structuredClone(data);mutate(broken);
    assert.throws(()=>SC.applyLanguageExercises(broken),/Ogiltig språkdata/);assert.equal(SC.modes,active);
  }
  for(const fetcher of [async()=>{throw new Error('offline');},async()=>({ok:false,status:404}),async()=>({ok:true,json:async()=>{throw new SyntaxError('invalid JSON');}})]){
    await assert.rejects(SC.loadLanguageExercises(fetcher));assert.equal(SC.modes,active);
  }
  // Expire the network deadline without waiting eight seconds in the test.
  const originalTimer=ctx.setTimeout;ctx.setTimeout=fn=>originalTimer(fn,0);
  await assert.rejects(SC.loadLanguageExercises((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))),/aborted/);
  assert.equal(SC.modes,active);
  // Exercise the actual async app startup, including its bundled-data fallback.
  for(const source of ['json','offline','invalid']){
    const result=spawnSync(process.execPath,[path.join(__dirname,'dinosaur-ui.cjs'),'--exercises='+source],{encoding:'utf8'});
    assert.equal(result.status,0,source+' startup: '+result.stdout+result.stderr);
  }
  console.log('PASS JSON/local equivalence, direct JSON edits, atomic validation, speech cache invalidation, fetch failures, timeout and app startup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
