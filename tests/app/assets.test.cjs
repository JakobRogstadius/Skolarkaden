'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {root, read} = require('../helpers/runtime.cjs');
const result = spawnSync(process.execPath, ['dev/version-assets.cjs', '--check'], {cwd: root, encoding: 'utf8'});
assert.equal(result.status, 0, result.stdout + result.stderr);
for (const page of ['index.html', 'statistics.html', 'homework.html']) {
  const html = read(page), ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size, page + ': duplicate element IDs');
  for (const match of html.matchAll(/(?:src|href)="(resources\/[^"?#]+)(?:[^\"]*)"/g)) {
    assert(fs.existsSync(path.join(root, match[1])), match[1]);
  }
}
console.log('PASS generated dictionary, asset versions, resource references and unique DOM IDs');
