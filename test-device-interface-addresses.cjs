const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const filename = './src/helpers/deviceInterfaceAddresses.ts';
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { usableInterfaceAddress: valid, deviceInterfaceAddresses: collect } = loaded.exports;
for (const input of [null, {}, '', '0.0.0.0', '127.0.0.1', '224.0.0.1', '999.1.1.1', '192.168.1.1/33', '::', '::1', 'ff02::1', '2001:db8::1/129', 'invalid'])
  assert.equal(valid(input), null, String(input));
assert.equal(valid('192.168.99.128/24'), '192.168.99.128');
assert.equal(valid('2001:db8:0:0::123/64'), '2001:db8::123');
assert.equal(valid('fe80::123%up0v0/64'), 'fe80::123%up0v0');
const rows = collect([
  { name: 'up1v101', ipv4: { addresses: ['10.101.0.2/24'] } },
  { name: 'up0v0', ipv4: { addresses: ['192.168.99.128/24', '192.168.99.128/24', '0.0.0.0'] }, ipv6: { addresses: ['2001:db8::123/64'] } },
  { name: 'empty' },
], '192.168.99.128');
assert.deepEqual(rows, [
  { name: 'up0v0', ipv4: ['192.168.99.128'], ipv6: ['2001:db8::123'], management: true },
  { name: 'up1v101', ipv4: ['10.101.0.2'], ipv6: [], management: false },
]);
assert.deepEqual(collect(undefined), []);
assert.deepEqual(collect([null, { name: 'bad', ipv4: { addresses: '192.168.99.128' } }]), []);
assert.equal(collect([{ name: 'up0v0', ipv4: { addresses: ['192.168.99.128'] } }], '203.0.113.1')[0].management, false);
const details = fs.readFileSync('src/pages/Device/Details.tsx', 'utf8');
assert.match(details, /Interface IP addresses/);
assert.match(details, /gatewayReady \? serialNumber : undefined/);
assert.match(details, /\.\.\.iface\.ipv4, \.\.\.iface\.ipv6/);
console.log('PASS: interface IPv4/IPv6, management matching, deduplication, invalid-address filtering and missing data');
