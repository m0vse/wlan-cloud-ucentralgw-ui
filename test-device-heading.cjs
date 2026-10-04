const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const filename = './src/helpers/deviceHeading.ts';
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { deviceHeading } = loaded.exports;
assert.deepEqual(deviceHeading('000456994617', ' Test AP ', ' Upstairs '), {
  name: 'Test AP', description: 'Upstairs', mac: '00:04:56:99:46:17',
});
assert.equal(deviceHeading('serial', undefined, undefined, 'AA:BB:CC:DD:EE:FF').mac, 'aa:bb:cc:dd:ee:ff');
assert.deepEqual(deviceHeading('non-mac-serial', ' ', ' '), { name: '', description: '', mac: 'non-mac-serial' });
assert.equal(deviceHeading('000456994617', undefined, undefined, '').mac, '00:04:56:99:46:17');
const title = fs.readFileSync('src/pages/Device/Title.tsx', 'utf8');
assert.match(title, /tag.data\?\.description/);
assert.match(title, /fontSize="sm".*\{title.mac\}/);
assert.match(title, /title.description &&/);
console.log('PASS: device name/description, MAC formatting, blank/missing inventory and non-MAC serial fallback');
