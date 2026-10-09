const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, globals) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, URL, ...globals });
  return exports;
}
function browser(href) {
  const listeners = new Map(), timers = new Map();
  let seq = 0;
  const win = {
    location: new URL(href), history: { replaceState: (_, __, url) => { win.location = new URL(url); } },
    crypto: { randomUUID: () => 'test-nonce' },
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
    setTimeout: (fn) => { timers.set(++seq, fn); return seq; }, clearTimeout: (id) => timers.delete(id),
  };
  return { win, listeners, timers };
}
const store = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
};
(async () => {
  const parent = browser('https://controller.example/');
  const sent = [];
  const child = { postMessage: (data, origin) => sent.push({ data, origin }) };
  parent.win.open = (url, target) => { assert.equal(target, '_blank'); assert.ok(!url.includes('fake-token')); return child; };
  const gateway = load('./src/helpers/provisioningPortal.ts', { window: parent.win });
  gateway.openAuthenticatedProvisioningPortal('fake-token');
  const handler = parent.listeners.get('message');
  handler({ source: {}, origin: 'https://controller.example:8443', data: { type: 'openwifi-portal-ready', nonce: 'n' } });
  handler({ source: child, origin: 'https://evil.example', data: { type: 'openwifi-portal-ready', nonce: 'n' } });
  assert.equal(sent.length, 0);
  handler({ source: child, origin: 'https://controller.example:8443', data: { type: 'openwifi-portal-ready', nonce: 'n' } });
  assert.equal(sent[0].origin, 'https://controller.example:8443');
  assert.equal(sent[0].data.token, 'fake-token');
  assert.equal(parent.listeners.size, 0);
  const path = process.env.PORTAL_SESSION_SOURCE;
  assert.ok(path, 'provide receiver source path');
  for (const token of ['fake-token', '']) {
    const portal = browser('https://controller.example:8443/?controller-login=1#/');
    const localStorage = store(), sessionStorage = store();
    localStorage.setItem('access_token', 'old-account');
    const opener = { postMessage: (data, origin) => { assert.equal(origin, 'https://controller.example'); assert.equal(data.nonce, 'test-nonce'); } };
    portal.win.opener = opener;
    const receiver = load(path, { window: portal.win, localStorage, sessionStorage });
    const pending = receiver.receiveControllerSession();
    assert.equal(receiver.receiveControllerSession(), pending, 'StrictMode reuses handshake');
    const receive = portal.listeners.get('message');
    const event = { source: opener, origin: 'https://controller.example', data: { type: 'openwifi-controller-session', nonce: 'test-nonce', token } };
    receive({ ...event, origin: 'https://evil.example' });
    receive({ ...event, source: {} });
    receive({ ...event, data: { ...event.data, nonce: 'wrong' } });
    assert.equal(localStorage.getItem('access_token'), 'old-account');
    receive(event);
    await pending;
    assert.equal(localStorage.getItem('access_token'), undefined);
    assert.equal(sessionStorage.getItem('access_token'), token || undefined);
    assert.equal(portal.win.opener, null);
    assert.equal(portal.listeners.size, 0);
    assert.ok(!portal.win.location.search.includes('controller-login'));
  }
  const timeout = browser('https://controller.example:8443/?controller-login=1');
  timeout.win.opener = { postMessage() {} };
  const receiver = load(path, { window: timeout.win, localStorage: store(), sessionStorage: store() });
  const pending = receiver.receiveControllerSession();
  for (const timer of timeout.timers.values()) timer();
  await pending;
  assert.equal(timeout.win.opener, null);
  console.log('PASS: exact origin/tab/nonce checks, new tab, no URL token, account replacement, session-only storage, StrictMode, timeout and opener cleanup');
})().catch((error) => { console.error(error); process.exitCode = 1; });
