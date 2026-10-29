'use strict';
// One selectable integration suite; each module filters its games through the
// shared helper. Detailed matching cases live in shared/, independent of games.
(async()=>{
  for (const file of ['queue', 'keyboard', 'exercises', 'chinese-numbers', 'chinese-pinyin', 'bopomofo',
    'word-pairs', 'hints', 'word-pair-layout', 'score-indicators', 'homework']) await require('./contracts/' + file + '.cjs');
})().catch(error=>{console.error(error);process.exitCode=1;});
