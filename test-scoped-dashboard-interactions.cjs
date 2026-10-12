/* Actual dashboard wrapper, scoped component and query hook; synthetic transport only. */
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
const policy = (id) => JSON.stringify({ version: 1, grants: [{ scopeType: 'venue', scopeId: id, includeDescendants: false, capabilities: ['devices.read'] }] });
let actor = { id: 'synthetic-admin', userRole: 'admin', securityPolicy: policy('11111111-1111-4111-8111-111111111111') };
let mode = 'own', release, calls = [];
const transport = { defaults: { baseURL: 'http://gateway.invalid' }, get: async (url, { signal } = {}) => {
  calls.push(url);
  if (actor.userRole === 'root' && url === 'deviceDashboard') return { data: { numberOfDevices: 9, snapshot: 1, healths: [], memoryUsed: [], status: [], upTimes: [], vendors: [], associations: [], deviceType: [], commands: [], certificates: [] } };
  assert.ok(url.startsWith('devices?deviceWithStatus=true&limit=500&offset='), `No global RPC: ${url}`);
  assert.ok(!/completeInfo|health=true|connectionStatistics/.test(url));
  const offset = Number(new URLSearchParams(url.split('?')[1]).get('offset'));
  if (mode === 'pending') await new Promise((resolve, reject) => { release = resolve; signal?.addEventListener('abort', () => reject(new Error('cancelled'))); });
  if (mode === 'error') throw { response: { data: { ErrorDescription: 'foreign-secret-must-not-render' } } };
  if (mode === 'empty' || mode === 'pending') return { data: { devicesWithStatus: [] } };
  if (mode === 'bound' || offset === 0) return { data: { devicesWithStatus: Array.from({ length: 500 }, (_, i) => ({ serialNumber: `owned-${offset + i}`, connected: true })) } };
  return { data: { devicesWithStatus: [{ serialNumber: 'owned-disconnected', connected: false }, { serialNumber: 'owned-unknown' }, { serialNumber: 'owned-0', connected: true }] } };
} };
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'contexts/AuthProvider') return { useAuth: () => ({ user: actor, isUserLoaded: true }) };
  if (name === 'constants/axiosInstances') return { axiosGw: transport };
  if (name === 'react-i18next') return { useTranslation: () => ({ t: (key) => key }) };
  if (name === 'react-masonry-css' || /^\.\/(Associations|Certificates|Commands|Connected|DeviceTypes|Memory|OverallHealth|Uptimes|Vendor)/.test(name))
    return { __esModule: true, default: ({ children }) => React.createElement('div', null, children) };
  if (name === 'components/Buttons/RefreshButton') return { RefreshButton: () => React.createElement('button', null, 'Root refresh') };
  if (name === 'components/Containers/Card') return { Card: ({ children }) => React.createElement('div', null, children) };
  if (name === 'components/Containers/Card/CardHeader') return { CardHeader: ({ children }) => React.createElement('div', null, children) };
  if (name === 'components/Containers/SimpleIconStatDisplay') return { __esModule: true, default: ({ value }) => React.createElement('p', null, `Root devices ${value}`) };
  if (name === 'components/InformationDisplays/FormattedDate') return { __esModule: true, default: () => null };
  if (/^(helpers|hooks|constants|contexts)\//.test(name)) name = path.resolve('src', name);
  return originalLoad.call(this, name, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) Module._extensions[extension] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText, filename);
const Dashboard = require('./src/pages/Devices/Dashboard/index.tsx').default;
const { canAccessGatewayRoute } = require('./src/helpers/scopedGatewayAccess.ts');
const client = new QueryClient({ defaultOptions: { queries: { retry: false } }, logger: { log() {}, warn() {}, error() {} } });
const root = createRoot(document.getElementById('app'));
const settle = async (cb) => act(async () => { if (cb) await cb(); await new Promise((resolve) => setTimeout(resolve, 40)); });
const render = () => root.render(React.createElement(ChakraProvider, null, React.createElement(QueryClientProvider, { client }, React.createElement(Dashboard))));
let checks = 0;
const check = (value, label) => { assert.ok(value, label); ++checks; };
const count = (label) => document.querySelector(`[data-testid="${label}"]`)?.textContent;
(async () => {
  await settle(render); await settle();
  check(canAccessGatewayRoute(actor, { id: 'devices-dashboard' }), 'scoped admin dashboard/nav eligible');
  check(count('Visible devices') === '502', 'filtered pages counted and deduplicated');
  check(count('Connected') === '500' && count('Disconnected') === '1' && count('Status not reported') === '1', 'only reported boolean statuses summarized');
  check(calls.length === 2 && calls[1].includes('offset=500'), 'bounded filtered pagination');
  check(!calls.includes('deviceDashboard') && !document.body.textContent.includes('Root devices'), 'scoped wrapper never mounts root aggregate');
  mode = 'pending'; actor = { ...actor, securityPolicy: policy('22222222-2222-4222-8222-222222222222') };
  await settle(render);
  check(!document.querySelector('[data-testid]') && document.querySelector('[aria-label="Loading scoped device overview"]'), 'changed policy immediately clears old counts');
  check(!!release, 'new policy performs fresh request'); await settle(() => release()); await settle();
  check(count('Visible devices') === '0' && document.body.textContent.includes('No devices are currently visible'), 'empty scope has explicit empty state');
  mode = 'error'; actor = { ...actor, id: 'other-synthetic-admin' }; await settle(render); await settle();
  check(document.body.textContent.includes('could not be loaded') && !document.querySelector('[data-testid]'), 'new identity/error hides prior counts');
  check(!document.body.textContent.includes('foreign-secret'), 'generic error never echoes backend content');
  mode = 'bound'; actor = { ...actor, id: 'bounded-synthetic-admin' }; const beforeBound = calls.length;
  await settle(render); for (let i = 0; i < 5 && count('Visible devices') !== '5000'; ++i) await settle();
  check(calls.length - beforeBound === 10 && count('Visible devices') === '5000', 'hard maximum ten pages');
  check(document.body.textContent.includes('counts may be partial'), 'bounded result explicitly not global total');
  actor = { ...actor, securityPolicy: JSON.stringify({ version: 1, grants: [] }) }; const beforeDeny = calls.length; await settle(render);
  check(!document.querySelector('[data-testid]') && calls.length === beforeDeny && !canAccessGatewayRoute(actor, { id: 'devices-dashboard' }), 'revoked policy clears counts without requests');
  actor = { ...actor, userRole: 'root' }; await settle(render); await settle();
  check(calls.includes('deviceDashboard') && document.body.textContent.includes('Root devices 9'), 'root retains existing global dashboard path');
  await settle(() => root.unmount()); client.clear(); console.log(`PASS ${checks} real scoped dashboard/root/pagination/empty/error/policy-change interactions`);
})().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
