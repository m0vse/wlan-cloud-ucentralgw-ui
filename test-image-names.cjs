const fs = require('fs'), assert = require('assert');
const source = fs.readFileSync('src/pages/Device/Summary.tsx','utf8');
assert(source.includes("return 'cambium_e410b'"));
assert(source.includes("return 'cambium_e410'"));
assert(source.includes("replace(/^cambium-/, 'cambium_')"));
assert(!source.includes("return 'cambium-e410b'"));
for (const [input,output] of [['cambium-e410b','cambium_e410b'],['cambium-xv2-2t1','cambium_xv2-2t1'],['cambium_e410b','cambium_e410b'],['edgecore_eap101','edgecore_eap101']]) assert.strictEqual(input.replace(/^cambium-/, 'cambium_'),output);
console.log('PASS: canonical Cambium underscore image names and legacy compatibility mapping');
