const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
function load(name) {
  const filename = `./src/helpers/${name}.ts`;
  const mod = new Module(filename, module);
  const original = mod.require.bind(mod);
  mod.require = (id) => id === './operatingBand' ? load('operatingBand') : original(id);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return mod.exports;
}
const { wirelessReadings, wirelessTraffic } = load('wirelessTraffic');
const counters = (value) => ({ tx_bytes: value, rx_bytes: value / 2, tx_packets: value / 10, rx_packets: value / 20 });
const bss = (id, value, phy = 'pci-radio') => ({ bssid: id, ssid: 'Phil', iface: 'wlan2', phy, counters: counters(value) });
const state = (ssids) => ({ radios: [{ phy: 'pci-radio', frequency: [6155], band: ['5G', '6G'] }],
  interfaces: [{ name: 'up0v0', counters: counters(99999999), ssids }] });
const first = state([bss('a', 100), bss('b', 200)]);
const second = state([bss('a', 400), bss('b', 600), bss('a', 400)]);
assert.equal(Object.keys(wirelessReadings(second)).length, 2);
let result = wirelessTraffic([{ recorded: 60, data: second }, { recorded: 0, data: first }]);
assert.deepEqual(result.series['ssid:a'].tx, [300]);
assert.deepEqual(result.series['ssid:b'].tx, [400]);
assert.deepEqual(result.series['radio:pci-radio'].tx, [700]);
assert.deepEqual(result.series['radio:pci-radio'].intervals, [60]);
assert.match(result.labels['ssid:a'], /Phil \(6G, wlan2\)/);
assert.match(result.labels['radio:pci-radio'], /6G/);
result = wirelessTraffic([{ recorded: 0, data: first }, { recorded: 90, data: state([bss('a', 20)]) }]);
assert.ok(Number.isNaN(result.series['ssid:a'].tx[0]));
assert.equal(result.series['ssid:b'], undefined);
assert.ok(Number.isNaN(result.series['radio:pci-radio'].tx[0]));
assert.deepEqual(result.series['ssid:a'].intervals, [90]);
const missing = state([{ ...bss('a', 1), counters: undefined }]);
assert.deepEqual(wirelessReadings(missing), {});
for (const name of [null, undefined, '', '   ']) {
  const unnamed = state([{ ...bss('a', 1), ssid: name }]);
  assert.deepEqual(wirelessReadings(unnamed), {});
  assert.deepEqual(wirelessTraffic([{ recorded: 0, data: unnamed }]).labels, {});
}
const startsAfterCac = wirelessTraffic([
  { recorded: 0, data: state([{ ...bss('a', 100), ssid: null }]) },
  { recorded: 60, data: first },
  { recorded: 120, data: second },
]);
assert.match(startsAfterCac.labels['ssid:a'], /Phil/);
assert.ok(Number.isNaN(startsAfterCac.series['ssid:a'].tx[0]));
assert.equal(startsAfterCac.series['ssid:a'].tx[1], 300);
const returnsToCac = wirelessTraffic([
  { recorded: 0, data: first },
  { recorded: 60, data: state([{ ...bss('a', 400), ssid: null }]) },
]);
assert.deepEqual(returnsToCac.labels, {});
assert.deepEqual(returnsToCac.series, {});
const ui = fs.readFileSync('./src/pages/Device/StatisticsCard/index.tsx', 'utf8');
assert.match(ui, /parsedData.labels\[v\] \?\? interfaceNameLabel\(v\)/);
console.log('PASS: separate BSSID/radio series, real 6G labels, deduplication, counter resets, missing reports and variable intervals');
