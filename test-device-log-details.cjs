const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const filename = './src/helpers/deviceLogDetails.ts';
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { deviceLogDetails } = loaded.exports;
const reboot = (data) => deviceLogDetails({ logType: 2, data });
const structured = { info: [{ reason: 'unexpected-shutdown', boot: { slot: 1 } }], uptime: 120 };
assert.deepEqual(JSON.parse(reboot(structured)), structured);
assert.ok(!reboot(structured).includes('[object Object]'));
assert.equal(reboot({ info: ['controller', 'reboot requested'] }), 'controller\nreboot requested');
const mixed = { info: ['old event', { reason: 'user-requested' }, null, 0] };
assert.deepEqual(JSON.parse(reboot(mixed)), mixed);
assert.equal(reboot({ info: [] }), '{\n  "info": []\n}');
assert.equal(reboot(undefined), '{}');
assert.equal(deviceLogDetails(), '');
assert.equal(deviceLogDetails({ logType: 0, log: 'ordinary log\nsecond line' }), 'ordinary log\nsecond line');
const modal = fs.readFileSync('src/pages/Device/LogsCard/LogHistory/DetailedLogViewModal.tsx', 'utf8');
assert.match(modal, /useClipboard\(content\)/);
assert.match(modal, /setValue\(content\)/);
assert.match(modal, /\{content\}/);
console.log('PASS: structured reboot details, legacy strings, mixed/missing data and matching display/copy');
