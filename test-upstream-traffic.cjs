const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
function load(path, mocks = {}) {
  const mod = new Module(path, module);
  mod.require = (name) => name in mocks ? mocks[name] : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, path);
  return mod.exports;
}
const { upstreamTraffic } = load('./src/helpers/upstreamTraffic.ts');
const { interfaceCounters, trafficRate } = load('./src/helpers/trafficRate.ts');
const { wirelessTraffic } = load('./src/helpers/wirelessTraffic.ts', {
  './operatingBand': { operatingBand: () => '5G' },
});
const counters = (rx, tx) => ({ rx_bytes: rx, tx_bytes: tx, rx_packets: rx / 100, tx_packets: tx / 100 });
const sample = (recorded, ports, network = counters(9e9, 9e9)) => ({ recorded, data: {
  interfaces: [{ name: 'up0v0', counters: network, ssids: [{
    bssid: '00:11:22:33:44:55', iface: 'wlan0', phy: 'phy0', ssid: 'Fixture', counters: network,
  }] }],
  radios: [{ phy: 'phy0' }],
  'link-state': { upstream: Object.fromEntries(Object.entries(ports).map(([k, v]) => [k, { counters: v }])) },
} });
const samples = [sample(100, { WAN: counters(0, 0) }),
  sample(160, { WAN: counters(7.5e9, 15e6) }, counters(7.5e9, 7.5e9))];
const result = upstreamTraffic(samples);
assert.equal(trafficRate(result.series['upstream:WAN'].rx[0], 60), 1e9);
assert.equal(trafficRate(result.series['upstream:WAN'].tx[0], 60), 2e6);
assert.equal(result.labels['upstream:WAN'], 'Upstream (WAN)');
assert.deepEqual(upstreamTraffic([...samples].reverse()), result);
assert.equal(result.series['upstream:WAN'].packetsRx[0], 75e6);
assert.equal(result.series['upstream:WAN'].maxRx, 7.5e9);
const upload = upstreamTraffic([sample(100, { eth0: counters(0, 0) }), sample(160, { eth0: counters(15e6, 7.5e9) })]);
assert.equal(trafficRate(upload.series['upstream:eth0'].tx[0], 60), 1e9);
// Multiport devices are kept independent, never summed or selected by hardcoded name.
const multi = upstreamTraffic([sample(1, { LAN1: counters(0, 0), WAN: counters(0, 0) }),
  sample(61, { LAN1: counters(100, 200), WAN: counters(300, 400) })]);
assert.equal(multi.series['upstream:LAN1'].rx[0], 100);
assert.equal(multi.series['upstream:WAN'].rx[0], 300);
assert.deepEqual(upstreamTraffic([sample(1, {}), sample(61, {})]).series, {});
assert.deepEqual(upstreamTraffic([{ recorded: 1, data: {} }]).series, {});
for (const value of [undefined, -1, NaN, Infinity]) {
  const gap = upstreamTraffic([sample(1, { WAN: counters(100, 100) }), sample(61, { WAN: counters(value, 200) })]);
  assert.ok(Number.isNaN(gap.series['upstream:WAN'].rx[0]));
  assert.equal(gap.series['upstream:WAN'].tx[0], 100);
}
for (const end of [1, 602]) {
  const gap = upstreamTraffic([sample(1, { WAN: counters(0, 0) }), sample(end, { WAN: counters(100, 200) })]);
  assert.ok(Number.isNaN(gap.series['upstream:WAN'].rx[0]));
}
const missing = upstreamTraffic([sample(1, { WAN: counters(100, 100) }), sample(61, {}),
  sample(121, { WAN: counters(200, 200) }), sample(181, { WAN: counters(300, 300) })]);
assert.ok(Number.isNaN(missing.series['upstream:WAN'].rx[0]));
assert.ok(Number.isNaN(missing.series['upstream:WAN'].rx[1]));
assert.equal(missing.series['upstream:WAN'].rx[2], 100);
const reset = upstreamTraffic([sample(1, { WAN: counters(1000, 1000) }), sample(61, { WAN: counters(50, 50) }),
  sample(121, { WAN: counters(100, 100) })]);
assert.ok(Number.isNaN(reset.series['upstream:WAN'].rx[0]));
assert.equal(reset.series['upstream:WAN'].rx[1], 50);

// Execute the actual statistics hook for both newest-first and historical API order.
function hook(data, historical = false) {
  const selected = [];
  const react = { useState: (v) => [v, (x) => selected.push(x)], useMemo: (fn) => fn(), useCallback: (fn) => fn };
  const { useStatisticsCard } = load('./src/pages/Device/StatisticsCard/useStatisticsCard.ts', {
    react: { default: react },
    'helpers/trafficRate': { interfaceCounters }, 'helpers/wirelessTraffic': { wirelessTraffic },
    'helpers/upstreamTraffic': { upstreamTraffic },
    'hooks/Network/Statistics': {
      useGetDeviceNewestStats: () => ({ data: { data: historical ? [] : [...data].reverse() } }),
      useGetDeviceStatsWithTimestamps: () => ({ data: historical ? data : undefined }),
    },
  });
  return { ...useStatisticsCard({ serialNumber: 'fixture' }), selected };
}
for (const historical of [false, true]) {
  const actual = hook(samples, historical);
  assert.deepEqual(actual.parsedData.interfaces['upstream:WAN'], result.series['upstream:WAN']);
  assert.equal(actual.selected[0], 'upstream:WAN');
  assert.ok(actual.parsedData.interfaces.up0v0, 'logical network retained');
  assert.ok(actual.parsedData.interfaces['radio:phy0'], 'ordinary radio retained');
}
const legacy = hook([sample(1, {}), sample(61, {})]);
assert.equal(legacy.selected[0], 'up0v0');
assert.ok(legacy.parsedData.interfaces.up0v0);
assert.equal(Object.keys(legacy.parsedData.interfaces).filter((key) => key.startsWith('upstream:')).length, 0);
assert.match(fs.readFileSync('./src/pages/Device/StatisticsCard/index.tsx', 'utf8'), /Network \(\$\{v\}\)/);
console.log('PASS: WAN download/upload direction, multiport/legacy, missing/reset/invalid/duplicate/gap counters, actual hook latest/history, logical networks and ordinary radios');
