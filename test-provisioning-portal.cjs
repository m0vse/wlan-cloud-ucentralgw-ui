const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const filename = './src/helpers/provisioningPortal.ts';
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { provisioningPortalUrl } = loaded.exports;
assert.equal(provisioningPortalUrl('https://controller.example'), 'https://controller.example:8443/');
assert.equal(provisioningPortalUrl('https://controller.example:443'), 'https://controller.example:8443/');
assert.equal(provisioningPortalUrl('https://controller.example/device/test?q=1#details'), 'https://controller.example:8443/');
assert.equal(provisioningPortalUrl('http://localhost:3000'), 'http://localhost:8443/');
const navbar = fs.readFileSync('src/layout/Navbar/index.tsx', 'utf8');
assert.match(navbar, /as="a"[\s\S]*target="_blank"[\s\S]*rel="noopener noreferrer"/);
assert.match(navbar, /aria-label="Open Provisioning Portal in a new tab"[\s\S]*variant="ghost"/);
assert.ok(navbar.indexOf('<Buildings size={20}') < navbar.indexOf("label={t('common.theme')}"));
console.log('PASS: matching portal icon beside theme, safe new tab, same deployment host on provisioning port');
