'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
function runtime(exercises = false) {
  const values = new Map();
  const context = vm.createContext({ console, Math, Date, Event, EventTarget, CustomEvent, performance, setTimeout, clearTimeout, localStorage: { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }, Starlight: {} });
  const load = name => vm.runInContext(fs.readFileSync(path.join(root, 'resources', name + '.js'), 'utf8'), context, { filename: name });
  if (exercises) { load('pinyin'); load('data'); load('language-exercises-data'); load('language-exercises'); load('input'); }
  for (const name of ['content', 'world', 'engine', 'orders', 'heroes', 'monsters']) load('glantan/' + name);
  if (exercises) load('glantan/game');
  return { G: context.Starlight.Glantan, SC: context.Starlight, context };
}
const advance = (simulation, seconds) => { for (let n = 0; n < seconds * 10; n++) simulation.update(0.1); };
module.exports = { runtime, advance };
