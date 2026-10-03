const fs = require('fs');
const ts = require('typescript');
const vm = require('vm');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/helpers/ipCountry.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, context);
const getCountry = context.exports.getDisplayCountry;
const cases = [
 ['192.168.0.0', 'US', 'GB'], ['192.168.255.255', 'US', 'GB'],
 ['192.168.99.114:15002', 'US', 'GB'], ['192.168.99.196', '', 'GB'],
 ['::ffff:192.168.99.164', 'US', 'GB'], ['192.167.255.255','US','US'],
 ['192.169.0.0','DE','DE'], ['10.0.0.1','US','US'], ['193.111.230.156','GB','GB'],
 ['192.168.999.1','US','US'], ['192.168.1','US','US'], ['', '', ''],
 ['2001:db8::1','FR','FR']
];
for (const [ip, fallback, expected] of cases) {
 if (getCountry(ip, fallback) !== expected) throw new Error('Country mapping failed: ' + ip);
}
console.log('PASS: ' + cases.length + ' private-country boundary cases');
