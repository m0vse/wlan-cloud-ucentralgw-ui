/* Actual components/React Query with synthetic HTTP; no controller/AP mutations. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<html><body><div id="app"></div></body></html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'SVGElement', 'Element', 'HTMLButtonElement', 'Node', 'Event', 'MutationObserver']) global[key] = dom.window[key];
global.getComputedStyle = dom.window.getComputedStyle; global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout;
global.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
const React = require('react'), { createRoot } = require('react-dom/client'), { act } = require('react-dom/test-utils');
const { ChakraProvider } = require('@chakra-ui/react'), { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const policy = (diagnostics, venue='11111111-1111-4111-8111-111111111111') => JSON.stringify({ version: 1,
  grants: [{ scopeType: 'venue', scopeId: venue, includeDescendants: false,
    capabilities: ['devices.read', ...(diagnostics ? ['diagnostics.read'] : [])] }] });
let actor = { id: 'synthetic-root', userRole: 'root', securityPolicy: '' }, ready = true, mode = 'critical', release;
let device = { serialNumber: 'fixture-ap', connected: true, sanity: 100 }, calls = [];
// Sanitized actual recorded shape: a score of 100 together with critical NAND faults.
const faulted = { UUID: '123', recorded: 100, sanity: 100, values: { unit: { memory: 45 }, faults: {
  updated: 100, active: [{ code: 'storage_uncorrectable_ecc', resource: 'mtd2', severity: 'critical', last_seen: 100 },
    { code: 'storage_canary', resource: 'mtd2/PEB0', severity: 'critical', reason: 'invalid_ec_header', errno: 0 }],
  monitoring: { storage: 'available', radio: 'available' } } } };
const clean = { ...faulted, values: { unit: { memory: 45 }, faults: { active: [] } } };
const original = JSON.stringify(faulted);
const transport = { defaults: { baseURL: 'http://synthetic-gateway' }, get: async (url) => {
  calls.push(url);
  assert.match(url, /^device\/fixture-ap\/healthchecks\?newest=true&limit=(1|5)$/);
  if (mode === 'pending') await new Promise((resolve) => { release = resolve; });
  if (mode === 'error') throw { response: { status: 403, data: { ErrorDescription: 'private-error-must-not-render' } } };
  return { data: { values: [mode === 'critical' ? faulted : clean] } };
} };
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'contexts/AuthProvider') return { useAuth: () => ({ user: actor, isUserLoaded: true,
    token: ready ? 'synthetic-token' : null, endpoints: ready ? { owgw: 'http://synthetic-gateway' } : null }) };
  if (name === 'constants/axiosInstances') return { axiosGw: transport };
  if (name === 'react-i18next') return { useTranslation: () => ({ t: (key) => key }) };
  if (/^(helpers|hooks|constants|contexts|components)\//.test(name)) name = path.resolve('src', name);
  return originalLoad.call(this, name, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) Module._extensions[extension] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const { healthPresentation } = require('./src/helpers/healthStatus.ts');
const Cell = require('./src/pages/Devices/ListCard/HealthCell.tsx').default;
const Detail = require('./src/pages/Device/LogsCard/HealthCheckHistory/DetailsModal.tsx').default;
const useHistory = require('./src/pages/Device/LogsCard/HealthCheckHistory/useHealthCheckTable.tsx').default;
let checks = 0; const check = (value, label) => { assert.ok(value, label); checks++; };
const present = (sanity, values, unavailable) => healthPresentation(sanity, values, unavailable);
check(present(100, faulted.values).color === 'red', 'actual critical fault beats100');
check(present(100, JSON.stringify(faulted.values)).critical, 'serialized report');
check(present(100, faulted.values, true).critical, 'known critical is not hidden by fetch failure');
check(present(100, { faults: { active: [{ severity: 'CRITICAL' }] } }).critical, 'case normalization');
for (const values of [undefined, {}, { unit: { memory: 43 } }, clean.values])
  check(present(100, values).color === 'green', 'older/ordinary report compatibility');
for (const values of ['invalid', [], { faults: null }, { faults: false }, { faults: 0 },
  { faults: { active: 'invalid' } }, { faults: { stale: true, active: [] } }])
  check(present(100, values).color !== 'green', 'malformed/stale cannot implyhealthy');
check(present(100, { faults: { active: [{ severity: 'warning' }] } }).color === 'orange', 'warning not green');
for (const sanity of [undefined, null, '100', NaN, 101, -1]) check(present(sanity, {}).color === 'gray', 'invalid score');
check(present(0, {}).label === '0%' && present(0, {}).color === 'red', 'zero notunknown');
check(present(80, {}).color === 'yellow' && present(79, {}).color === 'red', 'legacy thresholds');
check(JSON.stringify(faulted) === original, 'raw report immutable');
const client = new QueryClient({ defaultOptions: { queries: { retry: false } }, logger: { log() {}, warn() {}, error() {} } });
const root = createRoot(document.getElementById('app'));
const settle = async (cb) => act(async () => { if (cb) await cb(); await new Promise((resolve) => setTimeout(resolve, 60)); });
const render = (element=React.createElement(Cell, { device })) => root.render(React.createElement(ChakraProvider, null,
  React.createElement(QueryClientProvider, { client }, element)));
const state = () => document.querySelector('[data-health-status]')?.getAttribute('data-health-status');
function HistoryFixture() {
  const { columns } = useHistory({ serialNumber: 'fixture-ap', limit: 5 });
  const column = columns.find((entry) => entry.id === 'sanity');
  return column.Cell({ cell: { row: { original: faulted } } });
}
(async () => {
  await settle(() => render()); await settle();
  check(state() === 'critical' && document.body.textContent.includes('Critical fault'), 'actual list cell displayscritical');
  check(calls.length === 1 && calls[0].endsWith('limit=1'), 'one bounded latest read');
  mode = 'clean'; await settle(() => client.invalidateQueries(['device-health-badge'])); await settle();
  check(state() === 'green' && document.body.textContent.includes('100%'), 'current clean reportclears');
  mode = 'error'; await settle(() => client.invalidateQueries(['device-health-badge'])); await settle();
  check(state() === 'gray' && !document.body.textContent.includes('private-error'), 'failed query no stalegreen/privateerror');
  mode = 'critical'; await settle(() => client.invalidateQueries(['device-health-badge'])); await settle();
  check(state() === 'critical', 'fault returns');
  const before = calls.length;
  actor = { id: 'synthetic-viewer', userRole: 'admin', securityPolicy: policy(false) };
  await settle(() => render());
  check(state() === 'gray' && calls.length === before, 'no diagnosticpermission: no request/data');
  check(!document.body.textContent.includes('Critical fault'), 'prior rootdata not leaked');
  actor.securityPolicy = policy(true); mode = 'clean'; await settle(() => render()); await settle();
  check(state() === 'green' && calls.length === before + 1, 'scoped diagnostic read uses existingAPI');
  actor.securityPolicy = policy(true, '22222222-2222-4222-8222-222222222222'); mode = 'pending';
  await settle(() => render());
  check(state() === 'gray', 'changed scope hides previous result while pending');
  mode = 'critical'; await settle(() => release()); await settle();
  check(state() === 'critical', 'new scope completed report');
  device = { ...device, connected: false }; const connectedCalls = calls.length; await settle(() => render());
  check(!document.querySelector('[data-health-status]') && calls.length === connectedCalls, 'offline rowdoes notfetch/showhealthy');
  await settle(() => render(React.createElement(HistoryFixture))); await settle();
  check(state() === 'critical', 'actual history score cell criticalnotgreen');
  await settle(() => render(React.createElement(Detail, { health: faulted, isOpen: true, onClose() {} }))); await settle();
  check(state() === 'critical' && document.body.textContent.includes('Critical fault'), 'actual detailmodal criticalnotgreen');
  check(document.body.textContent.includes('Active monitored faults: 2'), 'existing parsedsummaryretained');
  check(JSON.stringify(faulted) === original, 'all realcomponentrenders preserveoriginal');
  await settle(() => root.unmount()); client.clear(); dom.window.close(); Module._load = originalLoad;
  console.log(`PASS ${checks} critical-health controls: actual list/history/detail components, React Query updates/errors/permissions/scopechanges, legacy reports and clearing`);
})().catch(async (error) => { console.error(error); await settle(() => root.unmount()); client.clear(); dom.window.close(); process.exitCode = 1; });
