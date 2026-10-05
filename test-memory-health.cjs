const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const filename = './src/helpers/memoryHealth.ts';
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { memoryHealthColor } = loaded.exports;
for (const used of [0, 59, 60, 74.99]) assert.equal(memoryHealthColor(used), 'green');
for (const used of [75, 85, 89.99]) assert.equal(memoryHealthColor(used), 'yellow');
for (const used of [90, 100]) assert.equal(memoryHealthColor(used), 'red');
for (const file of ['src/pages/Device/Summary.tsx', 'src/pages/Devices/ListCard/index.tsx']) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /memoryHealthColor\(/);
  assert.doesNotMatch(source, /SAGE_COMPATIBLES|isSage \? 75/);
}
console.log('PASS: shared RAM colours; warning at 75%, critical at 90%');
