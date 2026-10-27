'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const tick = (game, seconds) => { for (let i = 0; i < Math.round(seconds / .05); i++) game.update(.05); };
function load(files, globals = {}) {
  class CustomEvent extends Event {
    constructor(type, {detail} = {}) { super(type); this.detail = detail; }
  }
  const context = vm.createContext({console, Event, EventTarget, CustomEvent, Starlight: {}, ...globals});
  for (const file of files) vm.runInContext(read('resources/' + file + '.js'), context, {filename: file + '.js'});
  return context.Starlight;
}
const aliases = {foodtruck: 'food', beehive: 'hive', egg: 'eggs', marshmallow: 'marshmallows'};
function gameId(value) {
  if (Array.isArray(value)) value = value[0];
  const name = (typeof value === 'function' ? value.name : value).replace(/Game$|Renderer$/, '').toLowerCase();
  return aliases[name] || name;
}
function games(values) {
  const selected = process.env.SKOLARKADEN_TEST_GAMES?.split(',');
  return selected ? values.filter(value => selected.includes(gameId(value))) : values;
}
module.exports = {root, read, load, rng, tick, games};
