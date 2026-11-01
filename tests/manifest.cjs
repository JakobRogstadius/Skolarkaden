'use strict';
// Functional dependencies, not every script loaded by a VM fixture. New,
// unmapped source files deliberately select the whole ordinary test set.
const resource=(...names)=>names.map(name=>'resources/'+name);
const data=[...resource('data.js','pinyin.js','language-exercises.js','language-exercises-data.js'),'language-exercises.json','dev/build-language-exercises.cjs'];
const input=[...data,...resource('input.js','speech.js')];
const canvas=[...input,'resources/game.js'];
const board=[...input,'resources/homework.js','resources/game.js'];
const glantanCore=resource(...['content','world','engine','orders','summons','traps','heroes','monsters'].map(name=>'glantan/'+name+'.js'));
const gameSources={
 city:[...canvas,...resource('people.js')],
 food:[...canvas,...resource('people.js','foodtruck.js')],
 garden:[...canvas,...resource('people.js','plants.js','garden.js')],
 hive:[...canvas,...resource('people.js','plants.js','beehive.js')],
 paint:[...canvas,...resource('people.js','paint.js')],
 dinosaur:[...canvas,...resource('people.js','plants.js','dinosaur.js')],
 marshmallows:[...canvas,...resource('people.js','plants.js','marshmallows.js')],
 eggs:[...canvas,...resource('people.js','plants.js','eggs.js')],
 home:[...canvas,...resource('people.js','home.js','home-renderer.js')],
 reversi:[...board,...resource('reversi-engine.js','reversi.js')],
 chess:[...board,...resource('reversi.js','chess-rules.js','chess-engine.js','chess-scoring.js','chess.js')],
 klossar:[...board,...resource('klossar.js')],
 trassel:[...board,...resource('klossar.js','trassel-engine.js','trassel-layouts.js','trassel.js')],
 ficklampan:[...board,...resource('klossar.js'),'resources/ficklampan/'],
 bubblefish:[...board,...resource('klossar.js'),'resources/bubblefish/'],
 glantan:[...input,'resources/glantan/'],
 studio:[...board,...resource('voice.js','studio.js','studio-renderer.js')]
};
const arcadeGames=['city','food','garden','hive','paint','dinosaur','marshmallows','eggs','home'];
const shell=[...input,'index.html',...resource('app.js','play-shell.js','voice.js','highscores.js','highscore-policy.js','highscore-fireworks.js','homework.js')];
const app=[...shell,'tests/helpers/app.cjs'];
const homeworkApp=[...shell,'tests/helpers/homework-app.cjs'];
const server=['cloudflare/worker-source.mjs','cloudflare/worker.mjs','cloudflare/build.cjs','cloudflare/schema.sql','resources/highscore-policy.js'];
const suites=[];
function add(file,areas,sources,extra={}){suites.push({file:'tests/'+file,areas,sources:[...new Set(sources)],...extra});}
function game(area,file,sources=gameSources[area],extra={}){add(`games/${area}/${file}.test.cjs`,[area],sources,extra);}
for(const area of ['city','food','garden','hive','paint','dinosaur','marshmallows','eggs','home','reversi','chess','klossar','trassel']){
 const sweep={paint:'paint-labels',dinosaur:'dinosaur-labels',home:'home-rounds',hive:'beehive-rounds',reversi:'reversi-matches',klossar:'klossar'}[area];
 game(area,'logic',[...gameSources[area],...(sweep?['tests/helpers/sweeps/'+sweep+'.cjs']:[])]);
}
game('ficklampan','game',[...homeworkApp,...gameSources.ficklampan]);
game('bubblefish','logic');
game('bubblefish','app',[...homeworkApp,...gameSources.bubblefish]);
game('city','waves');game('food','waves');game('garden','balance');game('hive','rendering');game('studio','drawing');
for(const area of ['chess','reversi','klossar'])game(area,'renderer',[...gameSources[area],...resource(area+'-renderer.js',area+'.css'),...(area==='klossar'?resource('klossar-creatures.js','fonts/'):[])]);
game('chess','scoring',[...gameSources.chess,'resources/highscore-policy.js']);game('klossar','layouts',['resources/klossar.js']);game('klossar','chinese');
game('klossar','creatures',['resources/klossar-creatures.js']);
game('klossar','pronunciation',[...gameSources.klossar,...resource('klossar-speech.js','audio/bopomofo/')]);
game('trassel','chinese');
game('trassel','layouts',resource('trassel-engine.js','trassel-layouts.js').concat('dev/trassel-layouts.cjs','dev/trassel-generate.cjs'));
for(const domain of ['world','orders','simulation','adapter','encounters','tactics','movement'])game('glantan',domain,[...glantanCore,'tests/games/glantan/helpers.cjs','tests/games/glantan/run.cjs',...(domain==='adapter'?[...input,'resources/glantan/game.js']:[])]);
game('glantan','renderer',[...glantanCore,...resource('glantan/art.js','glantan/combat-art.js','glantan/sprites.js','glantan/renderer.js'),'tests/games/glantan/helpers.cjs']);
add('games/glantan/sound.test.cjs',['glantan','sounds'],[...glantanCore,...input,'resources/glantan/game.js','resources/glantan/sound.js','resources/glantan/music.js','tests/games/glantan/helpers.cjs','tests/games/glantan/run.cjs']);
for(const area of ['dinosaur','home','eggs','marshmallows'])game(area,'app',[...app,...gameSources[area]]);
for(const area of ['reversi','chess','klossar','trassel','glantan','studio'])game(area,'app',[...homeworkApp,...gameSources[area],...(['klossar','trassel'].includes(area)?resource('klossar-speech.js'):[]),...(area==='trassel'?resource('trassel-renderer.js','trassel.css'):[])]);
for(const [name,area,helper]of[
 ['paint-labels','paint','paint-labels'],['dinosaur-labels','dinosaur','dinosaur-labels'],['home-rounds','home','home-rounds'],
 ['beehive-rounds','hive','beehive-rounds'],['reversi-matches','reversi','reversi-matches'],['klossar','klossar','klossar'],['garden-balance','garden',null]
])add(`extended/${name}.test.cjs`,[area],[...gameSources[area],...(helper?['tests/helpers/sweeps/'+helper+'.cjs']:[])],{extended:true});
for(const [file,areas,sources]of[
 ['people',['people'],resource('people.js')],
 ['plants',['plants'],[...canvas,...resource('people.js','plants.js','garden.js','beehive.js')]],
 ['queue',['input'],input],['text-input',['input'],[...input,'resources/voice.js']],
 ['keyboard-practice',['input'],input],
 ['input-focus',['input'],input],['microphone',['speech'],resource('voice.js')],
 ['browser-speech',['speech'],[...input,'resources/voice.js','resources/reversi.js']],['mobile-speech',['speech'],[...input,'resources/voice.js']],
 ['speech-stream',['speech'],[...data,'resources/speech.js']],['chinese-pinyin',['speech','exercises'],input],
 ['chinese-compounds',['speech','exercises'],input],['chinese-translations',['speech','exercises'],[...input,'resources/reversi.js','resources/homework.js','homework.json']],
 ['bopomofo',['speech','exercises'],input],['exercises',['exercises'],input],['math-diagrams',['exercises'],[...data,'resources/game.js']],
 ['math-simple-multiplication',['exercises','speech'],[...data,'resources/speech.js','resources/game.js']],
 ['language-data',['exercises'],[...data,'resources/speech.js']],['word-pairs',['exercises'],[...input,'resources/game.js',...server]],
 ['homework',['homework'],[...input,'resources/homework.js','homework.json']],
 ['camp-sounds',['sounds'],resource('sounds.js')],['dinosaur-sounds',['sounds'],resource('sounds.js')],['home-sounds',['sounds'],resource('sounds.js')]
])add(`shared/${file}.test.cjs`,areas,sources);
add('app/assets.test.cjs',['assets'],['resources/','index.html','statistics.html','homework.html','language-exercises.json','dev/version-assets.cjs','dev/build-language-exercises.cjs']);
add('app/startup.test.cjs',['app','exercises'],app);
add('app/menu.test.cjs',['app'],[...app,'resources/styles.css']);
add('app/answer-input.test.cjs',['app','input','speech'],[...app,...gameSources.dinosaur,...gameSources.city]);
add('app/math-speech.test.cjs',['app','exercises','speech'],[...app,...gameSources.dinosaur,'resources/klossar-speech.js']);
add('app/game-launch.test.cjs',['app'],[...app,...arcadeGames.flatMap(game=>gameSources[game])],{games:arcadeGames});
add('app/game-contracts.test.cjs',['input','exercises','labels','homework'],[...arcadeGames.flatMap(game=>gameSources[game]),'resources/homework.js','tests/app/contracts/'],{games:arcadeGames});
add('app/navigation.test.cjs',['app'],resource('play-shell.js'));
const scoredGames=Object.keys(gameSources).filter(game=>game!=='studio');
add('app/homework.test.cjs',['homework'],[...homeworkApp,'homework.json',...scoredGames.flatMap(game=>gameSources[game])],{games:scoredGames});
add('app/score-hud.test.cjs',['app','highscores'],[...homeworkApp,...scoredGames.flatMap(game=>gameSources[game])],{games:scoredGames});
add('app/homework-page.test.cjs',['homework'],[...data,'homework.html','homework.json',...resource('homework.js','homework-page.js','homework.css')]);
add('app/leaderboard.test.cjs',['highscores'],[...data,'index.html',...resource('highscores.js','highscore-policy.js')]);
add('app/highscore-fireworks.test.cjs',['highscores','fireworks'],[...data,...resource('highscores.js','highscore-policy.js','highscore-fireworks.js','fireworks-engine.js','fireworks-compositions.js')]);
add('app/statistics.test.cjs',['statistics','artworks'],[...data,'statistics.html',...resource('statistics.js','statistics.css','homework.js'),'homework.json']);
// Actual CSS layout also needs a focused browser check.
for(const suite of suites)if(suite.file.startsWith('tests/app/')||suite.file.includes('/renderer.test.cjs'))suite.sources.push('resources/styles.css','resources/mobile-play.css');
for(const suite of suites)if(suite.areas.includes('studio'))suite.sources.push('resources/studio.css');
for(const suite of suites)if(suite.file.startsWith('tests/app/')||suite.file.endsWith('/app.test.cjs'))suite.sources.push('resources/led-font.css');
for(const [file,areas,extra]of[
 ['artworks',['artworks'],['cloudflare/add-artworks.sql']],['game-scores',['highscores'],[]],
 ['highscores',['highscores'],[...data,'resources/highscores.js','resources/homework.js','index.html','cloudflare/add-score-settings.sql']],
 ['score-dimensions',['highscores'],['cloudflare/add-score-dimensions.sql','cloudflare/add-score-settings.sql']],
 ['math-migration',['highscores'],[...data,'cloudflare/migrate-math-exercise-ids.sql']],['exercise-ranking',['highscores'],data],
 ['homework-counts',['homework'],['cloudflare/add-homework-index.sql']],['statistics',['statistics'],['cloudflare/add-statistics-indexes.sql']],['statistics-rename',['statistics'],[]]
])add(`server/${file}.test.cjs`,['server',...areas],[...server,...extra]);
add('runner/selection.test.cjs',['runner'],['tests/run.cjs','tests/selection.cjs','tests/manifest.cjs','package.json']);
module.exports={suites,gameSources,arcadeGames};
