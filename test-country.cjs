const fs = require('fs');
const ts = require('typescript');
const vm = require('vm');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/helpers/ipCountry.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, context);
const getCountry = context.exports.getDisplayCountry;
const isPrivate = context.exports.isRFC1918;
const cases = [
 ['192.168.0.0', 'US', ''], ['192.168.255.255', 'US', ''],
 ['192.168.99.114:15002', 'US', ''], ['192.168.99.196', '', ''],
 ['::ffff:192.168.99.164', 'US', ''], ['192.167.255.255','US','US'],
 ['192.169.0.0','DE','DE'], ['10.0.0.1','US',''], ['193.111.230.156','GB','GB'],
 ['192.168.999.1','US','US'], ['192.168.1','US','US'], ['', '', ''],
 ['2001:db8::1','FR','FR'], ['10.255.255.255','GB',''], ['9.255.255.255','DE','DE'],
 ['11.0.0.0','FR','FR'], ['172.16.0.0','GB',''], ['172.31.255.255','GB',''],
 ['172.15.255.255','US','US'], ['172.32.0.0','DE','DE'], ['127.0.0.1','GB','GB'],
 ['169.254.1.1','GB','GB'], ['fc00::1','GB','GB'], ['[::ffff:192.168.1.2]:15002','US',''],
 ['::FFFF:10.1.2.3','US',''], [' 192.168.1.2 ','DE',''], ['192.168.1.2.example','US','US']
];
for (const [ip, fallback, expected] of cases) {
 if (getCountry(ip, fallback) !== expected) throw new Error('Country mapping failed: ' + ip);
}
if (!isPrivate('10.0.0.1') || isPrivate('8.8.8.8')) throw new Error('RFC1918 classifier failed');
console.log('PASS: ' + cases.length + ' RFC1918/country boundary cases');
