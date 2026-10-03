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
const dfs = (phy, ...args) => radioInDfs({ phy }, ...args);
const check = (recorded, remaining = 600) => ({ recorded, UUID: 'a', values: {
  dfs_cac: { radio0: { Phil: { phy: 'phy0', remaining } } },
} });
assert.equal(dfs('phy0', 100, [check(100)], 'a'), true);
assert.equal(dfs('phy0', 200, [check(100)], 'a'), true);
assert.equal(dfs('phy2', 100, [check(100)], 'a'), false);
assert.equal(dfs('phy0', 99, [check(100)], 'a'), false);
assert.equal(dfs('phy0', 300, [check(100)], 'a'), false);
assert.equal(dfs('phy0', 120, [check(100, 20)], 'a'), false);
assert.equal(dfs('phy0', 100, [check(100)], 'b'), false);
assert.equal(dfs('phy0', 150, [check(100), { recorded: 140, values: {} }]), false);
assert.equal(dfs('phy0', 100, []), false);
const five = { phy: 'platform/soc@0/c000000.wifi', frequency: [5580] };
const six = { phy: 'pci/path', frequency: [6115] };
assert.equal(radioInDfs(five, 100, [check(100)], 'a', [six, five]), true);
assert.equal(radioInDfs(six, 100, [check(100)], 'a', [six, five]), false);
assert.equal(radioInDfs(five, 100, [check(100)], 'a', [five, { phy: 'other', frequency: [5500] }]), false);
assert.equal(radioInDfs({ ...five, phy_name: 'phy0' }, 100, [check(100)], 'a', [five, { phy: 'other', frequency: [5500] }]), true);
const editor = fs.readFileSync('src/pages/Device/WifiAnalysis/index.tsx', 'utf8');
assert.match(editor, /radioInDfs\(radio, data.recorded, health, data.UUID, data.data.radios\) \? 'DFS' : radio.tx_power/);
console.log('PASS: DFS matched by PHY/time/config; completed, stale, future and unrelated CAC cannot mask actual power');
