const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const filename = './src/helpers/radioDfs.ts';
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { radioInDfs } = loaded.exports;
const check = (recorded, remaining = 600) => ({ recorded, UUID: 'a', values: {
  dfs_cac: { radio0: { Phil: { phy: 'phy0', remaining } } },
} });
assert.equal(radioInDfs('phy0', 100, [check(100)], 'a'), true);
assert.equal(radioInDfs('phy0', 200, [check(100)], 'a'), true);
assert.equal(radioInDfs('phy2', 100, [check(100)], 'a'), false);
assert.equal(radioInDfs('phy0', 99, [check(100)], 'a'), false);
assert.equal(radioInDfs('phy0', 300, [check(100)], 'a'), false);
assert.equal(radioInDfs('phy0', 120, [check(100, 20)], 'a'), false);
assert.equal(radioInDfs('phy0', 100, [check(100)], 'b'), false);
assert.equal(radioInDfs('phy0', 150, [check(100), { recorded: 140, values: {} }]), false);
assert.equal(radioInDfs('phy0', 100, []), false);
const editor = fs.readFileSync('src/pages/Device/WifiAnalysis/index.tsx', 'utf8');
assert.match(editor, /radioInDfs\(radio.phy, data.recorded, health, data.UUID\) \? 'DFS' : radio.tx_power/);
console.log('PASS: DFS matched by PHY/time/config; completed, stale, future and unrelated CAC cannot mask actual power');
