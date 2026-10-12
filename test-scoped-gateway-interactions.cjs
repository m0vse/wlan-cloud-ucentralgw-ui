/* Real auth/socket/query/search components with synthetic transport responses. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'SVGElement', 'Element', 'HTMLInputElement', 'HTMLSelectElement', 'Node', 'Event', 'MutationObserver', 'localStorage', 'sessionStorage']) global[key] = dom.window[key];
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout;
global.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = require('react-dom/test-utils');
const { ChakraProvider } = require('@chakra-ui/react');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const { MemoryRouter } = require('react-router-dom');
let pollingCallback, searchProps;
const originalInterval = global.setInterval;
global.setInterval = (callback, delay, ...args) => {
  if (delay === 30000) pollingCallback = callback;
  return originalInterval(callback, delay, ...args);
};
const sockets = [];
global.WebSocket = class {
  constructor(url) { this.url = url; this.messages = []; this.closed = false; sockets.push(this); }
  send(value) { this.messages.push(value); }
  close() { this.closed = true; this.onclose?.(); }
  addEventListener() {} removeEventListener() {}
};
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'react-i18next') return { useTranslation: () => ({ t: (key) => key }) };
  if (name === './hooks/NotificationContent/useWebSocketNotification') return { __esModule: true, default: () => ({ pushNotification() {}, modal: null }) };
  if (name === 'chakra-react-select') return { AsyncSelect: (props) => { searchProps = props; return React.createElement('input', { 'aria-label': 'search', onChange: (event) => props.loadOptions(event.target.value, () => {}) }); }, chakraComponents: {} };
  if (/^(helpers|hooks|constants|models|utils|contexts|components)\//.test(name)) name = path.resolve('src', name);
  return originalLoad.call(this, name, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) Module._extensions[extension] = (mod, filename) => {
  const source = fs.readFileSync(filename, 'utf8').replace(/import\.meta\.env\.VITE_UCENTRALSEC_URL/g, '"http://localhost"');
  mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText, filename);
};
const transports = require('./src/constants/axiosInstances.ts');
const calls = [];
let role = 'admin';
const siteId = '11111111-1111-4111-8111-111111111111';
const policy = JSON.stringify({ version: 1, grants: [{ scopeType: 'venue', scopeId: siteId, includeDescendants: true,
  capabilities: ['devices.read', 'clients.read', 'configuration.read', 'firmware.read', 'diagnostics.read'] }] });
const device = { serialNumber: 'abcdef000001', deviceType: 'ap', firmware: 'test', connected: true };
let searchPages = false;
const adapter = async (config) => {
  calls.push(config.url);
  if (role !== 'root' && /connectionStatistics|deviceDashboard|health=true|completeInfo|firmwareAge|system\?command=info|withExtendedInfo/.test(config.url))
    throw new Error(`Scoped forbidden request ${config.url}`);
  let data;
  if (config.url === 'oauth2?me=true') data = { id: siteId, userRole: role, avatar: '', name: 'Test user', securityPolicy: policy };
  else if (config.url === 'preferences') data = { data: [] };
  else if (config.url === 'systemEndpoints') data = { endpoints: ['owgw', 'owprov', 'owfms'].map((type) => ({ type, uri: `http://${type}.invalid` })) };
  else if (config.url.includes('ucentral.schema.pretty.json')) data = { $defs: {} };
  else if (config.url.startsWith('inventory/')) data = { name: 'Scoped AP', venue: siteId, entity: '', serialNumber: device.serialNumber };
  else if (config.url.startsWith('inventory?')) data = { taglist: [] };
  else if (config.url.includes('connectionStatistics')) data = { connectedDevices: 1 };
  else if (config.url === 'deviceDashboard') data = { numberOfDevices: 1 };
  else if (config.url.startsWith('system?command=info')) data = { UI: 'http://ui.invalid' };
  else if (config.url.startsWith('firmwareAge')) data = { ages: [] };
  else if (config.url.startsWith('devices?countOnly')) data = { count: 1 };
  else if (config.url.startsWith('devices?')) {
    const params = new URLSearchParams(config.url.split('?')[1]);
    const offset = Number(params.get('offset') || 0);
    data = { devicesWithStatus: searchPages && offset === 0 ? Array.from({ length: 100 }, (_, i) => ({ serialNumber: i === 0 ? device.serialNumber : `00000000${i}` })) : [device] };
  } else throw new Error(`Unexpected network request ${config.url}`);
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};
require('axios').defaults.adapter = adapter;
for (const transport of Object.values(transports)) if (transport?.defaults) transport.defaults.adapter = adapter;
const { AuthProvider, useAuth } = require('./src/contexts/AuthProvider/index.tsx');
const providers = ['Controller', 'Security', 'Firmware', 'Provisioning'].map((name) => require(`./src/contexts/${name}SocketProvider/index.tsx`)[`${name}SocketProvider`]);
const stores = ['Controller', 'Security', 'Firmware', 'Provisioning'].map((name) => require(`./src/contexts/${name}SocketProvider/useStore.ts`)[`use${name}Store`]);
const devices = require('./src/hooks/Network/Devices.ts');
const { useGetControllerDashboard } = require('./src/hooks/Network/Controller.ts');
const { useGetFirmwareAges } = require('./src/hooks/Network/Firmware.ts');
const { useGetProvUi, useGetGatewayUi } = require('./src/hooks/Network/Endpoints.ts');
const StatusCell = require('./src/pages/Devices/ListCard/ProvisioningStatusCell.tsx').default;
const Search = require('./src/components/GlobalSearchBar/index.tsx').default;
const { searchScopedDevices } = require('./src/helpers/scopedDeviceSearch.ts');
const { canAccessGatewayRoute } = require('./src/helpers/scopedGatewayAccess.ts');
let auth, deviceQuery;
const Probe = () => {
  auth = useAuth();
  const count = devices.useGetDeviceCount({ enabled: auth.isUserLoaded });
  deviceQuery = devices.useGetDevices({ enabled: auth.isUserLoaded, pageInfo: { limit: 10, index: 0 } });
  devices.useGetDevicesStats({}); useGetControllerDashboard();
  useGetFirmwareAges({ serialNumbers: auth.isUserLoaded ? [device.serialNumber] : undefined }); useGetProvUi(); useGetGatewayUi();
  return React.createElement('div', null, React.createElement('p', null, `${auth.isUserLoaded ? 'Loaded' : 'Loading'} ${count.data?.count ?? ''}`),
    deviceQuery.data && React.createElement(StatusCell, { device }), React.createElement(Search));
};
const client = new QueryClient({ defaultOptions: { queries: { retry: false } }, logger: { log() {}, warn() {}, error() {} } });
const root = createRoot(document.getElementById('app'));
const settle = async (cb) => act(async () => { if (cb) await cb(); await new Promise((resolve) => setTimeout(resolve, 40)); });
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); ++checks; };
(async () => {
  const nested = providers.reduceRight((child, Provider) => React.createElement(Provider, null, child), React.createElement(Probe));
  await settle(() => root.render(React.createElement(ChakraProvider, null, React.createElement(QueryClientProvider, { client },
    React.createElement(MemoryRouter, null, React.createElement(AuthProvider, { token: 'isolated-gw-token' }, nested))))));
  for (let i = 0; i < 6 && !deviceQuery.data; ++i) await settle();
  for (let i = 0; i < 6 && !document.body.textContent.includes(`Venue ${siteId}`); ++i) await settle();
  check(auth.isUserLoaded && auth.token === 'isolated-gw-token', 'scoped gateway bootstrap loaded');
  check(deviceQuery.data.devicesWithStatus[0].serialNumber === device.serialNumber, 'scoped default status list loaded');
  check(document.body.textContent.includes(`Venue ${siteId}`), 'plain scoped provisioning status displayed');
  check(calls.includes(`inventory/${device.serialNumber}`), 'plain inventory query');
  check(!calls.some((url) => /connectionStatistics|deviceDashboard|firmwareAge|system\?command=info|withExtendedInfo/.test(url)), 'no scoped global statistics/service/firmwareAge/expanded queries');
  check(sockets.length === 0 && stores.every((store) => !store.getState().notificationsEnabled), 'all four global sockets disabled');
  const countBefore = calls.filter((url) => url.includes('deviceWithStatus')).length; await settle(() => pollingCallback());
  check(calls.filter((url) => url.includes('deviceWithStatus')).length > countBefore, 'scoped list updates through polling');
  let results;
  searchPages = true;
  await settle(() => searchProps.loadOptions('abc', (value) => { results = value; }));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
  check(results?.some((item) => item.value === device.serialNumber), 'actual search component returns authorized serial');
  check(calls.some((url) => url.includes('limit=100&offset=100')) && sockets.length === 0, 'serial search paginates filtered HTTP only');
  const pageCalls = calls.length; await searchScopedDevices('ab'); check(calls.length === pageCalls, 'short searches do not fetch');
  searchPages = false;
  for (const userRole of ['admin', 'noc', 'installer', 'accounting', 'csr']) {
    check(canAccessGatewayRoute({ userRole, securityPolicy: policy }, { id: 'devices-table' }), `${userRole} valid grant reaches list`);
    check(!canAccessGatewayRoute({ userRole, securityPolicy: policy }, { id: 'devices-dashboard' }), `${userRole} global dashboard hidden`);
  }
  check(!canAccessGatewayRoute({ userRole: 'noc', securityPolicy: '{broken}' }, { id: 'devices-table' }), 'malformed policy denies navigation');
  role = 'root'; await settle(() => auth.refetchUser()); await settle();
  check(sockets.length === 4 && stores.every((store) => store.getState().notificationsEnabled), 'root retains all four global sockets');
  await settle(() => sockets.forEach((socket) => socket.onopen()));
  check(sockets.every((socket) => socket.messages.includes('token:isolated-gw-token')), 'root token handshake retained');
  check(calls.some((url) => url.includes('connectionStatistics')) && calls.includes('deviceDashboard') && calls.some((url) => url.startsWith('firmwareAge')), 'root global data/firmwareAge retained');
  check(canAccessGatewayRoute(auth.user, { id: 'system-services' }), 'root services navigation retained');
  await settle(() => stores[0].getState().webSocket.onclose()); check(!!stores[0].getState().retryTimer, 'root retry scheduled');
  role = 'noc'; await settle(() => auth.refetchUser()); await settle();
  check(sockets.every((socket) => socket.closed) && stores.every((store) => !store.getState().retryTimer && !store.getState().allMessages.length), 'scoped transition closes root sockets/cancels retry/clears notifications');
  await settle(() => document.dispatchEvent(new Event('visibilitychange'))); check(sockets.length === 4, 'visibility cannot reopen denied socket');
  localStorage.setItem('access_token', 'isolated-gw-token');
  await transports.axiosGw.interceptors.response.handlers[0].rejected({ response: { status: 403, data: { ErrorCode: 7 } } }).catch(() => {});
  check(localStorage.getItem('access_token') === 'isolated-gw-token' && window.location.pathname === '/', 'permission denial does not logout');
  await settle(() => root.unmount()); client.clear();
  console.log(`PASS ${checks} real gateway auth/list/status/search/socket/polling interactions`);
})().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
