const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const filename = './src/helpers/operatingBand.ts';
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { operatingBand } = loaded.exports;
for (const [frequency, expected] of [[6415, '6G'], [6275, '6G'], [5955, '6G'],
  [5935, '6G'], [7115, '6G'], [5580, '5G'], [5180, '5G'], [4910, '5G'],
  [2412, '2G'], [2484, '2G'], [60480, '60G']]) {
  assert.equal(operatingBand({ frequency: [frequency], band: ['5G', '6G'] }), expected);
}
assert.equal(operatingBand({ frequency: [6415, 6385], band: ['5G', '6G'] }), '6G');
assert.equal(operatingBand({ band: ['5G', '6G'] }), '-');
assert.equal(operatingBand({ frequency: [], band: ['5G', '6G'] }), '-');
assert.equal(operatingBand({ frequency: [NaN], band: ['5G', '6G'] }), '-');
assert.equal(operatingBand({ band: ['2G'] }), '2G');
assert.equal(operatingBand({ band: ['5G', '5G'] }), '5G');
assert.equal(operatingBand({ band: ['HaLow'] }), 'HaLow');
assert.equal(operatingBand({}), '-');
for (const route of ['WifiAnalysis', 'RadiusClients']) {
  const source = fs.readFileSync(`src/pages/Device/${route}/index.tsx`, 'utf8');
  assert.match(source, /band: operatingBand\(radio\)/);
  assert.doesNotMatch(source, /band: radio.band\?\.\[0\]|radio.channel > 16/);
}
console.log('PASS: active-frequency radio labels, switchable PHYs, unknown-band fallback and both client views');
