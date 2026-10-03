const fs = require('fs');
const ts = require('typescript');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync('src/pages/Devices/ListCard/columnOrder.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(code, context);
const reorder = context.exports.withApNameColumn;
for (const [input, expected] of [
  [['badge', 'serialNumber', 'sanity'], ['badge', 'apName', 'serialNumber', 'sanity']],
  [['sanity', 'badge', 'serialNumber'], ['sanity', 'badge', 'apName', 'serialNumber']],
  [['badge', 'serialNumber', 'apName'], ['badge', 'apName', 'serialNumber']],
  [['badge', 'apName', 'serialNumber'], ['badge', 'apName', 'serialNumber']],
  [[], ['apName']],
]) {
  const original = [...input];
  assert.deepStrictEqual(Array.from(reorder(input)), expected);
  assert.deepStrictEqual(input, original);
}
const cell = fs.readFileSync('src/pages/Devices/ListCard/DeviceNameCell.tsx', 'utf8');
assert(cell.includes('useGetTag({ serialNumber: device.serialNumber })'));
assert(cell.includes('tag.data?.name?.trim()'));
assert(cell.includes(': <span>-</span>'));
assert(cell.includes('Reboot required'));
assert(!cell.includes('dangerouslySetInnerHTML'));
console.log('PASS: AP Name column ordering and inventory-name rendering checks');
const searchSource = fs.readFileSync('src/helpers/apNameSearch.ts', 'utf8');
const searchContext = { exports: {} };
vm.runInNewContext(ts.transpileModule(searchSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, searchContext);
const tags = [{ name: 'Phil Loft', serialNumber: 'abc' }, { name: 'Phil Studio', serialNumber: 'def' }, { serialNumber: 'ghi' }];
assert.strictEqual(searchContext.exports.matchApNames(tags, 'LOFT')[0].value, 'abc');
assert.strictEqual(searchContext.exports.matchApNames(tags, 'phil').length, 2);
assert.strictEqual(searchContext.exports.matchApNames(tags, ' ph ').length, 0);
assert.strictEqual(searchContext.exports.matchApNames(tags, 'missing').length, 0);
assert.strictEqual(searchContext.exports.matchApNames(tags, 'def').length, 0);
console.log('PASS: AP-name partial, case-insensitive search and missing-name controls');
