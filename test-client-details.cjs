const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const scope = {};
vm.createContext(scope);
vm.runInContext(fs.readFileSync('src/pages/Clients/details.js', 'utf8').replace(/export /g, '') + '\nthis.trafficSamples=trafficSamples;', scope);
const rows = scope.trafficSamples([{ id:'a', apName:'A', observations:[
  {recorded:100,rx_bytes:100,tx_bytes:200}, {recorded:110,rx_bytes:130,tx_bytes:250},
  {recorded:120,rx_bytes:5,tx_bytes:300}, {recorded:130,tx_bytes:320}] },
{ id:'b', apName:'B', observations:[{recorded:140,rx_bytes:999,tx_bytes:999}]}]);
assert.equal(rows[0].rxDelta,null); // never bridge association/AP boundaries
assert.equal(rows.find(p=>p.recorded===110).rxDelta,30);
assert.equal(rows.find(p=>p.recorded===120).rxDelta,null); // reset
assert.equal(rows.find(p=>p.recorded===130).rxDelta,null); // missing
assert.equal(rows.find(p=>p.recorded===130).txDelta,20);
const gap=scope.trafficSamples([{id:'gap',observations:[{recorded:1,rx_bytes:1},{recorded:700,rx_bytes:900}]}]);
assert.equal(gap[0].rxDelta,null);
const page=fs.readFileSync('src/pages/Clients/index.tsx','utf8');
assert.match(page,/onRowClick: \(row\) => \(\) => setSelectedClient\(row\)/);
assert.match(page,/<ClientDetails key=\{selectedClient.mac\}/);
const modal=fs.readFileSync('src/pages/Clients/ClientDetails.tsx','utf8');
for(const text of ['Overview','Associations','Roaming','Traffic','Raw JSON'])assert.ok(modal.includes(text));
assert.match(modal,/encodeURIComponent\(mac\)/);
assert.match(modal,/cacheTime: 0/);
assert.match(modal,/query.isError \? undefined : query.data/);
console.log('PASS client details wiring, tabs, error clearing, traffic resets and session isolation');
