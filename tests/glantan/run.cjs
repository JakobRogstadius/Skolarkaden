/* Run a domain: node tests/glantan/run.cjs world orders adapter simulation */
'use strict';
const path = require('node:path'), { spawnSync } = require('node:child_process');
const domains = ['world', 'orders', 'adapter', 'simulation'];
const requested = process.argv.slice(2);
const selected = requested.length ? requested : domains;
let failed = 0;
for (const domain of selected) {
  if (!domains.includes(domain)) throw new Error('Unknown Gläntan test domain: ' + domain);
  const result = spawnSync(process.execPath, [path.join(__dirname, domain + '.cjs')], { stdio: 'inherit' });
  if (result.status !== 0) failed++;
}
process.exitCode = failed ? 1 : 0;
