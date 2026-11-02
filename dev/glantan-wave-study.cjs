#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');

const ROOT = path.resolve(__dirname, '..');
const VARIANTS = path.join(__dirname, 'experiments', 'glantan-wave-variants.cjs');
const META_VERSION = 1;
const GAMEPLAY_MODULES = ['content', 'world', 'engine', 'orders', 'summons', 'traps', 'heroes', 'monsters', 'game'];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sourceIdentity(ref) {
  const resolvedRef = ref
    ? execFileSync('git', ['rev-parse', '--verify', ref + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim()
    : null;
  const files = GAMEPLAY_MODULES.map(name => 'resources/glantan/' + name + '.js');
  const digest = crypto.createHash('sha256');
  for (const file of files) {
    digest.update(file + '\0');
    const bytes = resolvedRef
      ? execFileSync('git', ['show', resolvedRef + ':' + file], { cwd: ROOT, encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 })
      : fs.readFileSync(path.join(ROOT, file));
    digest.update(bytes);
    digest.update('\0');
  }
  const harness = fs.readFileSync(path.join(ROOT, 'dev/glantan-campaign.cjs'));
  digest.update('dev/glantan-campaign.cjs\0');
  digest.update(harness);
  digest.update('\0');
  return { resolvedRef: resolvedRef || 'working-tree', sourceSha256: digest.digest('hex'), campaignHarnessSha256: sha256(harness) };
}

function parseArgs(argv) {
  const options = { jobs: 2, ref: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!['--cases', '--out', '--jobs', '--ref'].includes(arg)) throw new Error('Unknown option: ' + arg);
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error('Missing value for ' + arg);
    const value = argv[++i];
    if (arg === '--jobs') options.jobs = Number(value);
    else options[arg.slice(2)] = value;
  }
  if (!options.cases || !options.out) throw new Error('Usage: node dev/glantan-wave-study.cjs --cases path.json --out path.jsonl [--jobs 2] [--ref git-ref]');
  if (!Number.isInteger(options.jobs) || options.jobs < 1 || options.jobs > 64) throw new Error('--jobs must be an integer from 1 to 64');
  options.cases = path.resolve(options.cases);
  options.out = path.resolve(options.out);
  return options;
}

function loadCases(file) {
  const cases = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(cases)) throw new Error('--cases must contain a JSON array');
  const ids = new Set();
  for (let index = 0; index < cases.length; index++) {
    const item = cases[index];
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id.trim() || typeof item.variant !== 'string' || !item.variant.trim() || !item.config || typeof item.config !== 'object' || Array.isArray(item.config)) {
      throw new Error('Invalid case at index ' + index + ': expected {id, variant, config}');
    }
    if (ids.has(item.id)) throw new Error('Duplicate case id: ' + item.id);
    ids.add(item.id);
  }
  return cases;
}

function outputState(outFile, cases, source, variantHash) {
  const metaFile = outFile + '.meta.json';
  const exactCases = canonical(cases);
  const metadata = {
    version: META_VERSION,
    casesSha256: sha256(exactCases),
    cases: JSON.parse(exactCases),
    sourceRef: source.resolvedRef,
    sourceSha256: source.sourceSha256,
    campaignHarnessSha256: source.campaignHarnessSha256,
    variantModuleSha256: variantHash,
  };
  const expected = canonical(metadata);
  if (fs.existsSync(metaFile)) {
    const existing = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    if (canonical(existing) !== expected) throw new Error('Metadata mismatch at ' + metaFile + '; refusing to mix cases, source, or variant module versions.');
  } else {
    if (fs.existsSync(outFile) && fs.statSync(outFile).size) throw new Error('Output exists without matching metadata: ' + outFile);
    const temporary = metaFile + '.tmp-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
    const fd = fs.openSync(temporary, 'wx');
    try {
      fs.writeFileSync(fd, JSON.stringify(metadata, null, 2) + '\n');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temporary, metaFile);
  }

  const known = new Map(cases.map(item => [item.id, item]));
  const completed = new Set();
  if (fs.existsSync(outFile)) {
    const contents = fs.readFileSync(outFile, 'utf8');
    for (const [index, line] of contents.split('\n').entries()) {
      if (!line) continue;
      let row;
      try { row = JSON.parse(line); }
      catch { throw new Error('Invalid JSONL at ' + outFile + ':' + (index + 1) + '; refusing to resume a partial/corrupt output.'); }
      const item = known.get(row.id);
      if (!item || item.variant !== row.variant) throw new Error('Unexpected output row id/variant in ' + outFile + ': ' + row.id);
      if (canonical(row.config) !== canonical(item.config)) throw new Error('Output config mismatch for ' + row.id);
      if (completed.has(row.id)) throw new Error('Duplicate completed id in output: ' + row.id);
      if (row.source !== source.resolvedRef) throw new Error('Output source mismatch for ' + row.id);
      completed.add(row.id);
    }
  }
  return { metadata, completed };
}

function workerMain() {
  const { root, variantFile, ref } = workerData;
  let createCampaign;
  try {
    ({ createCampaign } = require(path.join(root, 'dev', 'glantan-campaign.cjs')));
  } catch (error) {
    parentPort.postMessage({ type: 'fatal', error: error.stack || String(error) });
    return;
  }
  let configureVariant = null;
  try {
    if (variantFile) {
      const variants = require(variantFile);
      if (!variants || typeof variants.configure !== 'function') throw new Error('Variant module must export configure(name)');
      configureVariant = variants.configure;
    }
  } catch (error) {
    parentPort.postMessage({ type: 'fatal', error: error.stack || String(error) });
    return;
  }

  parentPort.on('message', message => {
    if (message.type === 'stop') {
      parentPort.close();
      return;
    }
    if (message.type !== 'run') return;
    const item = message.item;
    try {
      const isBaseline = item.variant === 'baseline';
      if (!isBaseline && !configureVariant) throw new Error('Variant module is required for non-baseline variant ' + item.variant);
      const configure = isBaseline ? undefined : G => configureVariant(item.variant)(G);
      const run = createCampaign({ ref, configure });
      const result = run(item.config);
      parentPort.postMessage({ type: 'result', row: { id: item.id, variant: item.variant, ...result } });
    } catch (error) {
      parentPort.postMessage({ type: 'fatal', id: item.id, error: error.stack || String(error) });
    }
  });
}

async function runMain(argv) {
  const options = parseArgs(argv);
  const cases = loadCases(options.cases);
  const usesVariants = cases.some(item => item.variant !== 'baseline');
  if (usesVariants && !fs.existsSync(VARIANTS)) throw new Error('Variant module not found: ' + VARIANTS);
  const variantHash = usesVariants ? sha256(fs.readFileSync(VARIANTS)) : null;
  const source = sourceIdentity(options.ref);
  const { completed } = outputState(options.out, cases, source, variantHash);
  const pending = cases.filter(item => !completed.has(item.id));
  if (!pending.length) {
    process.stderr.write('All ' + cases.length + ' cases already completed.\n');
    return;
  }

  let cursor = 0;
  let finished = 0;
  const total = pending.length;
  const output = fs.openSync(options.out, 'a');
  const workers = [];
  let settled = false;
  let checkDone = null;

  await new Promise((resolve, reject) => {
    const cleanup = async error => {
      if (settled) return;
      settled = true;
      if (checkDone) clearInterval(checkDone);
      await Promise.all(workers.map(worker => worker.terminate().catch(() => {})));
      try { fs.closeSync(output); } catch {}
      if (error) reject(error); else resolve();
    };

    const dispatch = worker => {
      if (settled) return;
      if (cursor >= pending.length) {
        worker.postMessage({ type: 'stop' });
        return;
      }
      const item = pending[cursor++];
      worker.currentId = item.id;
      worker.postMessage({ type: 'run', item });
    };

    for (let i = 0; i < Math.min(options.jobs, pending.length); i++) {
      const worker = new Worker(__filename, { workerData: { root: ROOT, variantFile: usesVariants ? VARIANTS : null, ref: source.resolvedRef === 'working-tree' ? null : source.resolvedRef } });
      workers.push(worker);
      worker.on('message', message => {
        if (message.type === 'fatal') {
          cleanup(new Error('Worker failed' + (message.id ? ' on ' + message.id : '') + ':\n' + message.error));
          return;
        }
        if (message.type !== 'result') {
          cleanup(new Error('Worker sent an unknown message: ' + JSON.stringify(message)));
          return;
        }
        if (message.row.id !== worker.currentId) {
          cleanup(new Error('Worker result id mismatch: expected ' + worker.currentId + ', got ' + message.row.id));
          return;
        }
        try {
          fs.writeSync(output, JSON.stringify(message.row) + '\n');
          fs.fsyncSync(output);
        } catch (error) {
          cleanup(new Error('Could not checkpoint ' + message.row.id + ': ' + (error.stack || error)));
          return;
        }
        finished++;
        if (finished % 5 === 0 || finished === total) process.stderr.write('Completed ' + finished + '/' + total + ' pending cases (' + message.row.id + ').\n');
        worker.currentId = null;
        dispatch(worker);
      });
      worker.on('error', error => cleanup(new Error('Worker thread error' + (worker.currentId ? ' on ' + worker.currentId : '') + ': ' + (error.stack || error))));
      worker.on('exit', code => {
        if (settled) return;
        if (code !== 0) cleanup(new Error('Worker exited with code ' + code + (worker.currentId ? ' during ' + worker.currentId : '')));
        else if (cursor >= pending.length && workers.every(w => w.threadId === -1)) cleanup();
      });
    }

    for (const worker of workers) dispatch(worker);
    checkDone = setInterval(() => {
      if (!settled && cursor >= pending.length && workers.every(worker => worker.threadId === -1)) {
        clearInterval(checkDone);
        cleanup();
      }
    }, 25);
  });
  const finalSource = sourceIdentity(options.ref);
  const finalVariantHash = usesVariants ? sha256(fs.readFileSync(VARIANTS)) : null;
  if (canonical(finalSource) !== canonical(source) || finalVariantHash !== variantHash) {
    throw new Error('Source changed during the batch; discard this output and rerun from a frozen snapshot.');
  }
  process.stderr.write('Finished ' + finished + ' cases; output: ' + options.out + '\n');
}

if (!isMainThread) workerMain();
else runMain(process.argv.slice(2)).catch(error => {
  process.stderr.write((error.stack || String(error)) + '\n');
  process.exitCode = 1;
});
