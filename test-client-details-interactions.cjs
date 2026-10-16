/* Real Clients page, DataGrid row, React Query, tabs and modal. Synthetic HTTP only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<html><body><div id="app"></div></body></html>',{url:'http://localhost'});
for(const k of ['window','document','navigator','HTMLElement','SVGElement','Element','HTMLButtonElement','HTMLInputElement','HTMLSelectElement','Node','Event','MutationObserver','localStorage'])global[k]=dom.window[k];
global.getComputedStyle=window.getComputedStyle;global.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),10);global.cancelAnimationFrame=clearTimeout;
window.requestAnimationFrame=global.requestAnimationFrame;window.cancelAnimationFrame=clearTimeout;
global.IS_REACT_ACT_ENVIRONMENT=true;window.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
const React=require('react'),{createRoot}=require('react-dom/client'),{act}=require('react-dom/test-utils'),{ChakraProvider}=require('@chakra-ui/react');
const {QueryClient,QueryClientProvider}=require('@tanstack/react-query'),{MemoryRouter}=require('react-router-dom');
const noop=()=>{};const auth={user:{userRole:'root'},token:'synthetic',getPref:()=>undefined,setPref:noop,setPrefs:noop,deletePref:noop};
const original=Module._load;
Module._load=function(name,parent,isMain){
 if(name==='contexts/AuthProvider')return {useAuth:()=>auth};
 if(name==='react-i18next')return {useTranslation:()=>({t:k=>k})};
 if(name==='constants/axiosInstances')return {axiosGw:{get:async()=>({data:{tagList:[]}})}};
 if(/^(helpers|hooks|constants|models|utils|contexts|components)\//.test(name))name=path.resolve('src',name);
 return original.call(this,name,parent,isMain);
};
const compile=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=compile;
const js=Module._extensions['.js'];Module._extensions['.js']=(m,f)=>f.startsWith(path.resolve('src')+path.sep)?compile(m,f):js(m,f);
const now=Math.floor(Date.now()/1000),mac='02:00:00:00:10:00',other='02:00:00:00:20:00';
const links=[{linkId:0,mac:'02:00:00:00:11:00',bssid:'02:00:00:00:21:00',band:'5G',channel:153,frequency:5765},{linkId:1,mac:'02:00:00:00:12:00',bssid:'02:00:00:00:22:00',band:'6G',channel:65,frequency:6275}];
const row={id:'session-a',mac,ssid:'Synthetic SSID',band:'MLO',mlo:{mldAddress:mac,countersScope:'mld',links},apSerial:'ap-a',apName:'Synthetic AP',venueName:'Synthetic venue',entityName:'Synthetic entity',lastSeen:now,apConnected:true,signal:-48,startTime:now-100,endTime:null};
const second={...row,id:'session-b',mac:other,mlo:undefined,band:'5G',apSerial:'ap-b',apName:'Second AP'};
let denied=false,calls=[];
global.fetch=async(url,options)=>{
 calls.push(url);assert.equal(options.headers.Authorization,'Bearer synthetic');
 if(url.startsWith('/clients-api/associations'))return {ok:true,json:async()=>({rows:[row,second],aps:[row,second],errors:[],generatedAt:now})};
 const selected=new URL(url,'http://localhost').searchParams.get('mac');assert.ok([mac,other].includes(selected));
 if(denied)return {ok:false,status:403};
 const r=selected===mac?row:second;
 return {ok:true,json:async()=>({mac:selected,addresses:[selected,...(r.mlo?links.map(l=>l.mac):[])],sessions:[{...r,observations:[{...r,recorded:now-10,rx_bytes:100,tx_bytes:200},{...r,recorded:now,rx_bytes:150,tx_bytes:300}]}],observations:[],transitions:[{recorded:now-20,fromAP:'Previous AP',fromSerial:'ap-old',toAP:r.apName,toSerial:'ap-a'}],errors:[],historySamples:200,generatedAt:now,coverage:{from:now-10,to:now},limits:'Synthetic retained history'})};
};
const Page=require('./src/pages/Clients/index.tsx').default,root=createRoot(document.getElementById('app'));
const client=new QueryClient({defaultOptions:{queries:{retry:false}},logger:{log:noop,warn:noop,error:noop}});
const settle=async cb=>act(async()=>{cb?.();await new Promise(r=>setTimeout(r,180));});
const click=e=>{assert.ok(e,'control found');e.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));};
const button=(label,scope=document)=>[...scope.querySelectorAll('button')].find(e=>e.textContent===label);
(async()=>{
 await settle(()=>root.render(React.createElement(ChakraProvider,null,React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(Page))))));
 await settle();
 assert.equal(document.querySelector('[role="dialog"]'),null);
 const mloSummary=[...document.querySelectorAll('summary')].find(e=>e.textContent==='MLO');
 await settle(()=>click(mloSummary));
 assert.equal(document.querySelector('[role="dialog"]'),null,'existing MLO disclosure does not open popup');
 await settle(()=>click(button(mac)));await settle();
 let dialog=document.querySelector('[role="dialog"]');assert.ok(dialog,'real client MAC click opens real dialog');
 assert.ok(dialog.textContent.includes('Synthetic AP')&&dialog.textContent.includes('02:00:00:00:12:00'),'selected MLO client and links');
 assert.ok(!dialog.textContent.includes('Second AP'),'unselected client not exposed');
 for(const name of ['Associations','Roaming','Traffic']){await settle(()=>click(button(name,dialog)));assert.ok(dialog.textContent.includes(name));}
 assert.ok(dialog.textContent.includes('50 B')&&dialog.textContent.includes('100 B'),'traffic deltas rendered');
 await settle(()=>click(button('Roaming',dialog)));assert.ok(dialog.textContent.includes('Previous AP'),'observed AP history rendered');
 const raw=[...dialog.querySelectorAll('summary')].find(e=>e.textContent==='Raw JSON');await settle(()=>click(raw));assert.ok(raw.parentElement.open,'raw JSON dropdown opens');
 // Refresh denial must hide previously fetched private client information.
 denied=true;await settle(()=>click(button('Refresh',dialog)));await settle();
 assert.ok(dialog.textContent.includes('Access unavailable'));
 assert.ok(!dialog.textContent.includes('Synthetic SSID')&&!dialog.textContent.includes('Previous AP'),'denied refresh discards details');
 const close=dialog.querySelector('button[aria-label*="lose"]');await settle(()=>click(close));await settle();await settle();
 assert.equal(document.querySelector('[role="dialog"]'),null,'close works');
 denied=false;await settle(()=>click(button(other).closest('tr').querySelectorAll('td')[1]));await settle();dialog=document.querySelector('[role="dialog"]');
 assert.ok(dialog.textContent.includes('Second AP')&&!dialog.textContent.includes('02:00:00:00:12:00'),'new selection not previous client');
 assert.ok(calls.some(u=>u.includes(encodeURIComponent(mac))));
 await settle(()=>root.unmount());client.clear();console.log('PASS real client row/MAC popup, MLO and ordinary selection, tabs/history/traffic/raw JSON/close and403 clearing');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>setTimeout(()=>process.exit(process.exitCode||0),100));
