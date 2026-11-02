#!/usr/bin/env node
'use strict';
// Verify archived evidence, or materialize its exact sources in a new worktree.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const ARCHIVE = path.join(ROOT, 'docs/glantan-waves');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}' : JSON.stringify(value);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const lines = file => (file.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(file)) : fs.readFileSync(file)).toString().trim().split('\n').filter(Boolean).map(JSON.parse);
const manifest = read(path.join(ARCHIVE, 'manifest.json'));
const bundleBytes = fs.readFileSync(path.join(ARCHIVE, manifest.sourceBundle.file));
assert.equal(sha(bundleBytes), manifest.sourceBundle.sha256);
const bundle = JSON.parse(zlib.gunzipSync(bundleBytes));

function verify(dataset) {
  const meta = read(path.join(ARCHIVE, dataset.metadata));
  assert.equal(dataset.sourceSha256, meta.sourceSha256);
  const cases = read(path.join(ARCHIVE, dataset.cases));
  assert.equal(sha(canonical(cases)), meta.casesSha256);
  assert.equal(canonical(cases), canonical(meta.cases));
  const packed = fs.readFileSync(path.join(ARCHIVE, dataset.data));
  assert.equal(sha(packed), dataset.compressedSha256);
  const raw = zlib.gunzipSync(packed);
  assert.equal(sha(raw), dataset.rawSha256);
  const rows = raw.toString().trim().split('\n').map(JSON.parse);
  assert.equal(rows.length, dataset.records);
  const byId = new Map(cases.map(c => [c.id, c]));
  assert.equal(byId.size, rows.length);
  for (const row of rows) {
    const item = byId.get(row.id);
    assert(item, 'Unexpected or duplicate result ' + row.id);
    assert.equal(row.source, meta.sourceRef);
    assert.equal(row.variant, item.variant);
    assert.equal(canonical(row.config), canonical(item.config));
    byId.delete(row.id);
  }
  const snapshot = bundle.snapshots[dataset.snapshot];
  for (const [file, hash] of Object.entries(snapshot.files)) {
    assert(!path.isAbsolute(file) && !file.split('/').includes('..'));
    assert.equal(sha(bundle.blobs[hash]), hash, file);
  }
  const files = ['content', 'world', 'engine', 'orders', 'summons', 'traps', 'heroes', 'monsters', 'game'].map(n => 'resources/glantan/' + n + '.js').concat('dev/glantan-campaign.cjs');
  const digest = crypto.createHash('sha256');
  for (const file of files) digest.update(file + '\0' + bundle.blobs[snapshot.files[file]] + '\0');
  assert.equal(digest.digest('hex'), meta.sourceSha256);
  assert.equal(snapshot.files['dev/glantan-campaign.cjs'], meta.campaignHarnessSha256);
  if (meta.variantModuleSha256) assert.equal(snapshot.files['dev/experiments/glantan-wave-variants.cjs'], meta.variantModuleSha256);
  return { snapshot, cases, rows };
}

const [command, id, destination] = process.argv.slice(2);
if (command === 'verify') {
  for (const dataset of manifest.datasets) verify(dataset);
  assert.equal(manifest.datasets.reduce((n, d) => n + d.records, 0), manifest.campaignExecutions);
  console.log(JSON.stringify({ datasets: manifest.datasets.length, campaignExecutions: manifest.campaignExecutions, verified: true }));
} else if (command === 'prepare') {
  const dataset = manifest.datasets.find(d => d.id === id);
  assert(dataset && destination, 'Usage: prepare DATASET NEW_WORKTREE_DIRECTORY');
  const { snapshot, cases } = verify(dataset);
  const target = path.resolve(destination);
  assert(!fs.existsSync(target), 'Destination must not exist');
  execFileSync('git', ['worktree', 'add', '--detach', target, 'HEAD'], { cwd: ROOT, stdio: 'inherit' });
  for (const [file, hash] of Object.entries(snapshot.files)) {
    const output = path.join(target, file);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, bundle.blobs[hash]);
  }
  fs.writeFileSync(path.join(target, 'replay-cases.json'), JSON.stringify(cases, null, 2) + '\n');
  console.log('In ' + target + ', run:');
  console.log('node dev/glantan-wave-study.cjs --cases replay-cases.json --out replay-output.jsonl --jobs 4');
  console.log('Then compare from the original checkout: node dev/glantan-wave-replay.cjs compare ' + id + ' ' + JSON.stringify(path.join(target, 'replay-output.jsonl')));
} else if (command === 'compare') {
  const dataset = manifest.datasets.find(d => d.id === id);
  assert(dataset && destination, 'Usage: compare DATASET REPLAY_JSONL');
  const { rows } = verify(dataset);
  const actual = lines(destination), byId = new Map(actual.map(r => [r.id, r]));
  assert.equal(actual.length, rows.length);
  assert.equal(byId.size, rows.length);
  const normalized = ({ source, ...record }) => canonical(record);
  for (const row of rows) assert.equal(normalized(byId.get(row.id)), normalized(row), row.id);
  console.log(JSON.stringify({ dataset: id, exactMatches: rows.length, excludedMetadata: ['source'] }));
} else throw Error('Usage: verify | prepare DATASET NEW_WORKTREE_DIRECTORY | compare DATASET REPLAY_JSONL');
