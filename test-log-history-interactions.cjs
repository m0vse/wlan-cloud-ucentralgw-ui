/* Real history pages, table hook, disclosure and dialog; synthetic records, no live API. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<html><body><div id="app"></div></body></html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'SVGElement', 'Element', 'HTMLButtonElement', 'Node', 'Event', 'MutationObserver']) global[key] = dom.window[key];
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16); global.cancelAnimationFrame = clearTimeout;
window.requestAnimationFrame = global.requestAnimationFrame; window.cancelAnimationFrame = clearTimeout;
global.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
const React = require('react'), { createRoot } = require('react-dom/client'), { act } = require('react-dom/test-utils');
const { ChakraProvider } = require('@chakra-ui/react');
let rows = [], dated = false;
const queries = {
  useGetDeviceLogs: () => ({ data: { values: rows }, isFetching: false, refetch() {} }),
  useGetDeviceLogsWithTimestamps: () => ({ data: dated ? { values: rows } : undefined, isFetching: false }),
};
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'hooks/Network/DeviceLogs') return queries;
  if (name === 'react-i18next') return { useTranslation: () => ({ t: (key) => key }) };
  // Isolate unrelated history controls and table layout, retaining actual action cells.
  if (name === '../DatePickers' || name === './DeleteModal') return { default: () => null, __esModule: true };
  if (name === 'components/Buttons/RefreshButton') return { RefreshButton: () => null };
  if (name === 'components/DataTables/ColumnPicker') return { ColumnPicker: () => null };
  if (name === 'components/InformationDisplays/FormattedDate') return { default: ({ date }) => React.createElement('span', null, String(date)), __esModule: true };
  if (name === 'components/DataTables/DataTable') return { DataTable: ({ columns, data }) => React.createElement('div', null,
    data.map((row, index) => React.createElement('div', { key: index }, columns.map((column) => React.createElement('div', { key: column.id },
      column.Cell ? column.Cell({ cell: { row: { original: row } } }) : String(row[column.accessor] ?? '')))))) };
  if (/^(helpers|hooks|constants|contexts|components)\//.test(name)) name = path.resolve('src', name);
  return originalLoad.call(this, name, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) Module._extensions[extension] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const pages = ['index', 'CrashLogs', 'RebootLogs'].map((name) => require(`./src/pages/Device/LogsCard/LogHistory/${name}.tsx`).default);
const root = createRoot(document.getElementById('app'));
const settle = async (cb) => act(async () => { if (cb) cb(); await new Promise((resolve) => setTimeout(resolve, 100)); });
const click = (element) => { assert.ok(element, 'control exists'); element.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); };
let checks = 0;
(async () => {
  for (const [type, Page] of pages.entries()) {
    for (const filtered of [false, true]) {
      dated = filtered;
      const marker = `selected-detail-${type}-${filtered}`;
      rows = [{ UUID: 'fixture-config', recorded: 123, severity: 3, logType: type, log: `message-${marker}`, data: { info: [{ reason: marker }] } },
        { UUID: 'other-config', recorded: 122, severity: 4, logType: type, log: 'other-row', data: { info: [{ reason: 'other-detail' }] } }];
      await settle(() => root.render(React.createElement(ChakraProvider, null, React.createElement(Page, { key: `${type}-${filtered}`, serialNumber: 'fixture-ap' }))));
      assert.equal(document.querySelector('[role="dialog"]'), null);
      await settle(() => click(document.querySelector('[aria-label="Open Log Details"]')));
      const dialog = document.querySelector('[role="dialog"]');
      assert.ok(dialog, 'magnifier opens actual details dialog');
      assert.ok(dialog.textContent.includes(marker), 'selected record rendered');
      assert.ok(!dialog.textContent.includes('other-detail'), 'other record not rendered');
      assert.ok(dialog.textContent.includes('Raw JSON / original data'), 'raw data remains available');
      // Exercise the real shared dialog close button, not just its initial open state.
      const close = [...dialog.querySelectorAll('button')].find((button) => button.getAttribute('aria-label')?.toLowerCase().includes('close'));
      await settle(() => click(close));
      // Chakra keeps the portal mounted for its exit animation.
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
      assert.equal(document.querySelector('[role="dialog"]'), null, 'dialog closes');
      checks++;
    }
  }
  await settle(() => root.unmount()); dom.window.close(); Module._load = originalLoad;
  console.log(`PASS ${checks} actual Logs/Crashes/Reboots magnifier interactions: newest/date-filtered records, selection, parsed/raw report and close`);
})().catch(async (error) => { console.error(error); await settle(() => root.unmount()); dom.window.close(); process.exitCode = 1; });
