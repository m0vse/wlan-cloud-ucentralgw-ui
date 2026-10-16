const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, requireFn) {
  const context = { exports: {}, require: requireFn };
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  vm.runInNewContext(output.outputText, context);
  return context.exports;
}
const helper = load('src/helpers/ipCountry.ts', require);
const Flag = load('src/components/InformationDisplays/AddressFlag.tsx', name =>
  name === 'helpers/ipCountry' ? helper : require(name)).default;
for (const ip of ['192.168.99.119', '10.0.0.1', '172.16.0.1', '::ffff:192.168.1.2']) {
  const html = renderToStaticMarkup(React.createElement(Flag, { address: ip, country: 'GB' }));
  assert.match(html, /aria-label="RFC1918"/);
  assert.match(html, /width="24" height="24"/);
  assert.doesNotMatch(html, /<img|flagcdn|countryCode/);
}
const publicHtml = renderToStaticMarkup(React.createElement(Flag, { address: '8.8.8.8', country: 'US' }));
assert.match(publicHtml, /<img/);
assert.doesNotMatch(publicHtml, /RFC1918/);
assert.equal(renderToStaticMarkup(React.createElement(Flag, { address: '', country: '' })), '');
for (const file of ['src/pages/Device/Summary.tsx', 'src/pages/Devices/ListCard/LocaleCell.tsx']) {
  assert.match(fs.readFileSync(file, 'utf8'), /<AddressFlag/);
}
console.log('PASS rendered private flags, public flag, empty fallback and both UI consumers');
