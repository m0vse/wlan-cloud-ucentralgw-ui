const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Module = require('node:module');
const ts = require('typescript');
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/pages/Clients/freshness.js', 'utf8').replace(/export /g, '') +
  '\nthis.matchesClientBand=matchesClientBand;this.clientSearchText=clientSearchText;this.latestClients=latestClients;', context);
const mlo = { mldAddress: '02:00:00:00:10:00', countersScope: 'mld', links: [
  { linkId: 0, mac: '02:00:00:00:11:00', bssid: '02:00:00:00:21:00', frequency: 5765, channel: 153, band: '5G' },
  { linkId: 1, mac: '02:00:00:00:12:00', bssid: '02:00:00:00:22:00', frequency: 6135, channel: 37, band: '6G' }] };
const row = { mac: mlo.mldAddress, mlo, band: 'MLO', lastSeen: 100, endTime: null, apSerial: 'new', apConnected: true };
for (const band of ['', 'MLO', '5G', '6G']) assert.equal(context.matchesClientBand(row, band), true);
assert.equal(context.matchesClientBand(row, '2G'), false);
assert.equal(context.matchesClientBand({ band: '5G' }, 'MLO'), false);
assert.equal(context.matchesClientBand({ band: 'Unknown' }, 'Unknown'), true);
assert.ok(context.clientSearchText(row).includes('02:00:00:00:12:00'));
assert.equal(context.latestClients([{ ...row, apSerial: 'old', lastSeen: 90 }, row], false).length, 1);
assert.equal(context.latestClients([{ ...row, apSerial: 'old', lastSeen: 90 }, row], false)[0].apSerial, 'new');
assert.equal(context.latestClients([{ ...row, apSerial: 'old', lastSeen: 90 }, row], true).length, 2);
const filename = './src/pages/Clients/MloLinks.tsx';
const loaded = new Module(filename, module);
loaded.require = (request) => require(request);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ChakraProvider } = require('@chakra-ui/react');
const markup = renderToStaticMarkup(React.createElement(ChakraProvider, null, React.createElement(loaded.exports.MloLinks, { mlo })));
for (const expected of ['<details', '<summary', 'MLO', '5G · CH 153', '6G · CH 37']) assert.ok(markup.includes(expected), expected);
for (const unwanted of ['Negotiated links', 'traffic counters', 'Client:', 'BSSID:', '02:00:00:00:12:00']) assert.ok(!markup.includes(unwanted), unwanted);
assert.ok(!markup.includes('[object Object]'));
const page = fs.readFileSync('src/pages/Clients/index.tsx', 'utf8');
assert.match(page, /row.original.band === 'MLO' && row.original.mlo/);
assert.match(page, /matchesClientBand\(row, band\)/);
const radioFile = './src/helpers/ssidRadio.ts';
const radiosModule = new Module(radioFile, module);
radiosModule._compile(ts.transpileModule(fs.readFileSync(radioFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, radioFile);
const { ssidRadio } = radiosModule.exports;
const radios = [{ phy: 'phy1', band: '5G' }, { phy: 'phy1', band: '6G' }];
assert.equal(ssidRadio({ phy: 'phy1', radio: { $ref: '#/radios/1' } }, radios).band, '6G');
assert.equal(ssidRadio({ phy: 'phy1' }, radios).band, '5G');
assert.equal(ssidRadio({ phy: 'phy1', radio: { $ref: '#/radios/99' } }, radios).band, '5G');
assert.equal(ssidRadio({ radio: { $ref: '#/radios/0' } }, radios).band, '5G');
assert.equal(ssidRadio({ radio: { $ref: '#/invalid/1' } }, radios), undefined);
assert.equal(ssidRadio({ phy: 'missing' }, radios), undefined);
assert.match(fs.readFileSync('src/pages/Device/WifiAnalysis/index.tsx', 'utf8'), /const radio = ssidRadio\(ssid, radios\)/);
const peerFile = './src/helpers/negotiatedMlo.ts';
const peerModule = new Module(peerFile, module);
peerModule._compile(ts.transpileModule(fs.readFileSync(peerFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, peerFile);
const { isNegotiatedMlo } = peerModule.exports;
const native = { station: mlo.mldAddress, mlo: { mld_address: mlo.mldAddress, counters_scope: 'mld',
  links: mlo.links.map((link) => ({ link_id: link.linkId, address: link.mac, bssid: link.bssid, frequency: link.frequency })) } };
assert.equal(isNegotiatedMlo(native), true);
assert.equal(isNegotiatedMlo({ station: mlo.mldAddress }), false);
assert.equal(isNegotiatedMlo({ station: mlo.mldAddress, mlo_links: native.mlo.links }), false);
assert.equal(isNegotiatedMlo({ ...native, station: 5 }), false);
assert.equal(isNegotiatedMlo({ ...native, mlo: { ...native.mlo, links: native.mlo.links.slice(0, 1) } }), false);
assert.equal(isNegotiatedMlo({ ...native, mlo: { ...native.mlo, links: [native.mlo.links[0], native.mlo.links[0]] } }), false);
assert.equal(isNegotiatedMlo({ ...native, mlo: { ...native.mlo, mld_address: '02:00:00:00:00:01' } }), false);
assert.match(fs.readFileSync('src/pages/Device/WifiAnalysis/AssocationsTable.tsx', 'utf8'), /assoc.isMlo \? 'MLO' : assoc.radio\?\.band/);
assert.match(fs.readFileSync('src/pages/Device/WifiAnalysis/index.tsx', 'utf8'), /isMlo: isNegotiatedMlo\(association\)/);
assert.ok(!page.includes(' (avg)'));
console.log('PASS: negotiated MLO disclosure rendering, per-link bands/addresses, filters/search, latest roaming and history; ordinary clients unchanged');
