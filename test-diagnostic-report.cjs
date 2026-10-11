const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const filename = './src/helpers/diagnosticReport.ts';
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { parseDiagnostic, diagnosticText, diagnosticSections, healthSummary } = loaded.exports;
assert.deepEqual(parseDiagnostic('{"ok":true,"zero":0}'), { ok: true, zero: 0 });
assert.equal(parseDiagnostic('plain log\nsecond line'), 'plain log\nsecond line');
assert.equal(parseDiagnostic('{broken'), '{broken');
assert.ok(diagnosticSections({ details: '{"failed_ssids":{"Example":"missing"}}' })[0].rows.some((row) => row.value === 'missing'));
assert.equal(diagnosticText(false), 'No');
assert.equal(diagnosticText(0), '0');
assert.equal(diagnosticText(null), 'Not reported');
assert.equal(diagnosticText([]), 'None reported');
const payload = { unit: { memory: 43 }, faults: { active: [], monitoring: { radio: 'available', storage: 'available' } },
  radios: { radio1: { failed_ssids: { 'Example WiFi': 'missing' } } },
  dfs_cac: { radio2: { 'Example WiFi': { remaining: 60, duration: 600 } } } };
const original = JSON.stringify(payload);
const sections = diagnosticSections(payload);
assert.equal(JSON.stringify(payload), original, 'report must not mutate or delete original fields');
assert.ok(sections.some((section) => section.rows.some((row) => row.value === 'missing')));
assert.ok(!JSON.stringify(sections).includes('[object Object]'));
assert.deepEqual(healthSummary(payload), ['Reported memory usage: 43%', 'No active monitored faults reported.',
  'radio1 · Example WiFi: missing', 'radio2 · Example WiFi: DFS channel check, 60s remaining']);
assert.deepEqual(healthSummary({ unit: { memory: 0 } }), ['Reported memory usage: 0%']);
assert.deepEqual(healthSummary(undefined), []);
const large = diagnosticSections({ events: Array.from({ length: 1000 }, (_, i) => ({ index: i })) });
assert.ok(large.reduce((count, section) => count + section.rows.length, 0) <= 301);
assert.ok(JSON.stringify(large).includes('Raw JSON'));
const component = fs.readFileSync('src/components/InformationDisplays/DiagnosticReport.tsx', 'utf8');
assert.match(component, /<Accordion allowToggle/);
assert.match(component, /rawValue === undefined \? value : rawValue/);
assert.ok(!component.includes('dangerouslySetInnerHTML'));
const health = fs.readFileSync('src/pages/Device/LogsCard/HealthCheckHistory/useHealthCheckTable.tsx', 'utf8');
assert.match(health, /MagnifyingGlass/);
assert.match(health, /Open Health Details/);
for (const file of ['LogHistory/DetailedLogViewModal.tsx', 'CommandHistory/ResultModal/index.tsx', 'HealthCheckHistory/DetailsModal.tsx'])
  assert.match(fs.readFileSync(`src/pages/Device/LogsCard/${file}`, 'utf8'), /<DiagnosticReport/);
const commands = fs.readFileSync('src/pages/Device/LogsCard/CommandHistory/ResultModal/index.tsx', 'utf8');
assert.match(commands, /<WifiScanResultDisplay/);
assert.match(commands, /<DownloadTraceButton/);
console.log('PASS: diagnostic reports, health magnifier/summary, raw originals, bounded view, plain text and all diagnostic modal integrations');

// Render the real shared component, including nested health values and escaped text.
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ChakraProvider } = require('@chakra-ui/react');
const componentFile = './src/components/InformationDisplays/DiagnosticReport.tsx';
const renderedModule = new Module(componentFile, module);
renderedModule.require = (request) => request === 'helpers/diagnosticReport' ? loaded.exports : require(request);
renderedModule._compile(ts.transpileModule(fs.readFileSync(componentFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, componentFile);
const markup = renderToStaticMarkup(React.createElement(ChakraProvider, null,
  React.createElement(renderedModule.exports.default, { value: { ...payload, message: '<script>unsafe</script>' }, rawValue: payload })));
assert.ok(markup.includes('Raw JSON / original data'));
assert.ok(markup.includes('Failed SSIDs'));
assert.ok(markup.includes('&lt;script&gt;unsafe&lt;/script&gt;'));
assert.ok(!markup.includes('<script>unsafe</script>'));
assert.ok(!markup.includes('[object Object]'));
console.log('PASS: real diagnostic component renders structured health, raw disclosure and safely escaped text');
