const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let ready = false;
let calls = [];
let options;
let actor = { id: 'synthetic-root', userRole: 'root', capabilities: [] };
let loaded = true;
const toast = () => { throw new Error('Unexpected error toast'); };
toast.isActive = () => false;
const exportsObject = {};
const dependencies = {
  '@chakra-ui/react': { useToast: () => toast },
  '@tanstack/react-query': {
    useQuery: (_key, fn, opts) => {
      options = opts;
      return { data: undefined, refetch: (...args) => fn().then((data) => ({ data, args })) };
    },
  },
  'react-i18next': { useTranslation: () => ({ t: (value) => value }) },
  'constants/axiosInstances': {
    axiosGw: { defaults: { baseURL: 'http://synthetic-gateway' }, get: async (url) => { calls.push(url); return { data: { serialNumber: 'test' } }; } },
  },
  'contexts/AuthProvider': { useAuth: () => ({ user: actor, isUserLoaded: loaded }) },
  'helpers/scopedGatewayAccess': { scopedGatewayCapabilities: (user) => new Set(user?.capabilities || []) },
  'hooks/useEndpointStatus': { useEndpointStatus: (name) => {
    assert.equal(name, 'owgw');
    return { isReady: ready };
  } },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/Network/Devices.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  exports: exportsObject,
  require: (name) => dependencies[name] || {},
  Promise,
});

(async () => {
  for (const [name, path] of [
    ['useGetDevice', 'device/test'],
    ['useGetDeviceStatus', 'device/test/status'],
    ['useGetDeviceHealthChecks', 'device/test/healthchecks?newest=true&limit=1'],
  ]) {
    const hook = exportsObject[name];
    for (const serialNumber of [undefined, '', 'test']) {
      ready = false;
      calls = [];
      const pending = hook({ serialNumber, limit: 1 });
      assert.equal(options.enabled, false);
      await pending.refetch({ cancelRefetch: false });
      assert.equal(calls.length, 0, `${name}: no manual request before discovery`);
    }
    ready = true;
    for (const serialNumber of [undefined, '']) {
      calls = [];
      const invalid = hook({ serialNumber, limit: 1 });
      assert.equal(options.enabled, false);
      await invalid.refetch();
      assert.equal(calls.length, 0, `${name}: no request for missing serial`);
    }
    calls = [];
    const loaded = hook({ serialNumber: 'test', limit: 1 });
    assert.equal(options.enabled, true, `${name}: starts when endpoint becomes ready`);
    const result = await loaded.refetch({ cancelRefetch: false });
    assert.deepEqual(calls, [path]);
    assert.equal(result.args[0].cancelRefetch, false);
    assert.equal(result.data.serialNumber, 'test');
    ready = false;
    await hook({ serialNumber: 'test', limit: 1 }).refetch();
    assert.deepEqual(calls, [path], `${name}: stops if endpoint becomes unavailable`);
  }
  ready = true;
  actor = { id: 'synthetic-viewer', userRole: 'admin', capabilities: ['devices.read'] };
  calls = [];
  await exportsObject.useGetDeviceHealthChecks({ serialNumber: 'test', limit: 1 }).refetch();
  assert.equal(options.enabled, false);
  assert.equal(calls.length, 0, 'health diagnostic permission is not bypassed');
  actor.capabilities.push('diagnostics.read');
  await exportsObject.useGetDeviceHealthChecks({ serialNumber: 'test', limit: 1 }).refetch();
  assert.equal(options.enabled, true);
  assert.equal(options.keepPreviousData, false, 'old scope health is not retained');
  assert.equal(options.refetchInterval, 30000);
  loaded = false; calls = [];
  await exportsObject.useGetDeviceHealthChecks({ serialNumber: 'test', limit: 1 }).refetch();
  assert.equal(options.enabled, false); assert.equal(calls.length, 0);
  console.log('PASS: device, status and health wait for gateway discovery, including manual refresh and readiness transitions');
})().catch((error) => { console.error(error); process.exitCode = 1; });
