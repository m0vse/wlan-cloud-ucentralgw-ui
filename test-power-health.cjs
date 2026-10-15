const fs = require('fs'), Module = require('module'), assert = require('assert'), ts = require('typescript');
for (const extension of ['.ts', '.tsx']) Module._extensions[extension] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const {healthPresentation: present} = require('./src/helpers/healthStatus.ts');
const fixture = {faults:{active:[{code:'radio_operating_mismatch',resource:'s',radio:'radio0',severity:'critical'}]},radio_operating:{s:{status:'failed',radio:'radio0',channel:{status:'confirmed'},width:{status:'confirmed',requested:'HE160',actual:'160',requested_match:true},power:{status:'mismatch',requested_dbm:0,reported_dbm:17}}}};
const copy = () => JSON.parse(JSON.stringify(fixture));
let checks=0; const check = (v, text) => { assert(v,text); checks++; };
check(present(88,fixture).label === 'Power warning','actual-shaped old firmware power-only warning');
check(present(88,JSON.stringify(fixture)).color === 'orange','serialized health warning');
for (const field of ['channel','width']) { let f=copy();f.radio_operating.s[field].status='mismatch';check(present(88,f).critical,field+' failure stays critical'); }
for (const field of ['channel','width','power','radio']) { let f=copy();delete f.radio_operating.s[field];check(present(88,f).critical,'missing '+field+' proof stays critical'); }
for (const field of ['requested_dbm','reported_dbm']) { let f=copy();delete f.radio_operating.s.power[field];check(present(88,f).critical,'missing '+field+' stays critical'); }
let failed=copy();failed.radio_operating.s.reason='not_enabled';check(present(88,failed).critical,'explicit startup failure stays critical even with inconsistent proof');
let f=copy();f.radio_operating.s.radio='other';check(present(88,f).critical,'wrong radio proof stays critical');
f=copy();f.faults.stale=true;check(present(88,f).critical,'stale evidence cannot downgrade');
f=copy();f.faults.active.push({code:'storage_canary',severity:'critical'});check(present(88,f).critical,'NAND stays critical alongside power warning');
f=copy();f.radio_operating.s.status='failed';f.radio_operating.s.reason='not_enabled';f.radio_operating.s.channel.status='unconfirmed';check(present(88,f).critical,'startup failure remains critical');
f=copy();f.faults.active[0].code='radio_power_mismatch';f.faults.active[0].severity='warning';check(present(88,f).label==='Power warning','new firmware warning');
check(present(100,{faults:{active:[]}}).color==='green','clear recovery');
check(present(100,{faults:{active:[{severity:'critical'}]}}).critical,'legacy critical preserved');
check(present(100,{}).color==='green','legacy nonfault health preserved');
check(present(75,{}).color==='red','legacy low score unchanged');
console.log(`PASS ${checks} power warning, resource identity, NAND/radio critical and legacy controls`);
