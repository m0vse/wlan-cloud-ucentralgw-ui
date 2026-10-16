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
const style = { width: '24px', height: '24px', borderRadius: '20px' };
for (const ip of ['192.168.99.119', '10.0.0.1', '172.16.0.1', '::ffff:192.168.1.2']) {
  const html = renderToStaticMarkup(React.createElement(Flag, { address: ip, country: 'GB', style }));
  assert.match(html, /<img/);
  assert.match(html, /alt="RFC1918"/);
  assert.match(html, /src="\/flags\/rfc1918.svg"/);
  const publicFlag = renderToStaticMarkup(React.createElement(Flag, { address: '8.8.8.8', country: 'GB', style }));
  assert.equal(html.match(/style="([^"]+)"/)[1], publicFlag.match(/style="([^"]+)"/)[1]);
  assert.doesNotMatch(html, /<svg/);
}
const asset = fs.readFileSync('public/flags/rfc1918.svg', 'utf8');
assert.match(asset, /viewBox="0 0 24 18"/); // Same 4:3 intrinsic ratio as country SVG assets.
assert.match(asset, /fill="#2563eb"/);
assert.match(asset, /fill="#0d9488"/);
const rounded = renderToStaticMarkup(React.createElement(Flag, {
  address: '192.168.1.1', style: { width: '24px', height: '24px', borderRadius: '20px' },
}));
assert.match(rounded, /border-radius:20px/);
const publicHtml = renderToStaticMarkup(React.createElement(Flag, { address: '8.8.8.8', country: 'US' }));
assert.match(publicHtml, /<img/);
assert.doesNotMatch(publicHtml, /RFC1918/);
assert.equal(renderToStaticMarkup(React.createElement(Flag, { address: '', country: '' })), '');
for (const file of ['src/pages/Device/Summary.tsx', 'src/pages/Devices/ListCard/LocaleCell.tsx']) {
  assert.match(fs.readFileSync(file, 'utf8'), /<AddressFlag/);
}
console.log('PASS rendered private flags, public flag, empty fallback and both UI consumers');
