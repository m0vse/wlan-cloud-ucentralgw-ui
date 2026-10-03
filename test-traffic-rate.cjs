const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const filename = './src/helpers/trafficRate.ts';
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { trafficRate, rateScale, interfaceCounters } = loaded.exports;
assert.equal(trafficRate(3e9, 30), 800e6);
assert.equal(trafficRate(3e9, 60), 400e6);
assert.equal(trafficRate(0, 120), 0);
for (const seconds of [0, -1, NaN, Infinity, undefined]) assert.equal(trafficRate(1, seconds), null);
for (const bytes of [-1, NaN, Infinity]) assert.equal(trafficRate(bytes, 10), null);
assert.deepEqual(rateScale(800e6), { factor: 1e6, unit: 'Mbit/s' });
assert.deepEqual(rateScale(1e9), { factor: 1e9, unit: 'Gbit/s' });
const chart = fs.readFileSync('./src/pages/Device/StatisticsCard/InterfaceChart.tsx', 'utf8');
assert.match(chart, /label: 'Tx',\s+data: format === 'rate' \? txRates/);
assert.match(chart, /label: 'Rx',\s+data: format === 'rate' \? rxRates/);
assert.match(chart, /Average over/);
assert.match(fs.readFileSync('./src/pages/Device/StatisticsCard/index.tsx', 'utf8'), /'packets'>\('rate'\)/);
console.log('PASS: interval-based bit rates, invalid intervals, rate scaling, default mode and Tx/Rx direction');
const counters = { tx_bytes: 3.75e9, rx_bytes: 1e8, tx_packets: 100, rx_packets: 10 };
const state = { name: 'up0v0', counters, ssids: [{ counters }, { counters }] };
assert.deepEqual(interfaceCounters(state), counters);
assert.equal(trafficRate(interfaceCounters(state).tx_bytes, 60), 500e6);
assert.deepEqual(interfaceCounters({ ...state, 'counters-aggregate': { tx_bytes: 200 } }),
  { tx_bytes: 200, rx_bytes: 0, tx_packets: 0, rx_packets: 0 });
assert.deepEqual(interfaceCounters({ ssids: [{ counters }] }),
  { tx_bytes: 0, rx_bytes: 0, tx_packets: 0, rx_packets: 0 });
const hook = fs.readFileSync('./src/pages/Device/StatisticsCard/useStatisticsCard.ts', 'utf8');
assert.doesNotMatch(hook, /for \(const ssid of inter.ssids/);
assert.equal((hook.match(/interfaceCounters\(inter\)/g) || []).length, 2);
console.log('PASS: 500 Mbit/s remains 500 Mbit/s with multiple SSIDs, aggregate precedence and consistent baseline');
