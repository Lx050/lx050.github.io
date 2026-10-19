/* GPU-free release isolation against the published restoration/LOD baseline. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js');
const baseline='8f0019ef17669f3277a8b99c675b7cf4f2cfbf52';
function source(file,old){return old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file);}
const moonsnowPaving=require('./moonsnow-paving-normalizer.js');
const rssHook='      global.CourtyardRSSDetail.attach(b);\n',rssArchitecture=fs.readFileSync(root+'/assets/architecture.js','utf8');
assert.equal(rssArchitecture.split(rssHook).length,2,'one exact building8 RSS integration');
const restoredRSSArchitecture=rssArchitecture.replace(rssHook,'');
assert.equal(restoredRSSArchitecture,cp.execFileSync('git',['-C',root,'show','fc5775a2f5237ccd0f29450702716bf7ec0fcc2d:assets/architecture.js'],{encoding:'utf8'}),'architecture differs only by the exact RSS hook from preceding release');
function rssAddition(b,o){if(b.metadata?.index!==8)return false;for(let p=o;p;p=p.parent)if(p.name==='rss-blender-static')return true;return false;}
const alternateHook='    global.CourtyardAlternateDetail.attach(b);\n',alternateCare=fs.readFileSync(root+'/assets/content-creation-care.js','utf8');
assert.equal(alternateCare.split(alternateHook).length,2,'one exact building2 alternate integration');
const restoredAlternateCare=alternateCare.replace(alternateHook,'');
assert.equal(restoredAlternateCare,cp.execFileSync('git',['-C',root,'show','c253173019253961ea94f5b25b1bc7c8f6914266:assets/content-creation-care.js'],{encoding:'utf8'}),'creation-care differs only by the exact alternate hook from preceding release');
function alternateAddition(b,o){if(b.metadata?.index!==2)return false;for(let p=o;p;p=p.parent)if(p.name==='alternate-blender-static')return true;return false;}
const moonsnowHook='    global.CourtyardMoonsnowDetail.attach(b);\n',moonsnowGarden=fs.readFileSync(root+'/assets/moon-snow-garden.js','utf8');
assert.equal(moonsnowGarden.split(moonsnowHook).length,2,'one exact building20 moonsnow integration');
const restoredMoonsnowGarden=moonsnowPaving.restoreSource(moonsnowGarden.replace(moonsnowHook,''));
assert.equal(restoredMoonsnowGarden,cp.execFileSync('git',['-C',root,'show','7be2e7b9fcba939ebc9c70a5e363a6bd84ee59a7:assets/moon-snow-garden.js'],{encoding:'utf8'}),'garden differs only by the exact moonsnow hook from preceding release');
function moonsnowAddition(b,o){if(b.metadata?.index!==20)return false;for(let p=o;p;p=p.parent)if(p.name==='moonsnow-blender-static')return true;return false;}
const mindcareHook='    global.CourtyardMindcareDetail.attach(b);\n',mindcareServices=fs.readFileSync(root+'/assets/content-services.js','utf8');
assert.equal(mindcareServices.split(mindcareHook).length,2,'one exact building24 mindcare integration');
const restoredMindcareServices=mindcareServices.replace(mindcareHook,'');
assert.equal(restoredMindcareServices,cp.execFileSync('git',['-C',root,'show','212c7e4fce41e22c88ce694fff49c53b7c95d2df:assets/content-services.js'],{encoding:'utf8'}),'services differs only by the exact mindcare hook from preceding release');
function mindcareAddition(b,o){if(b.metadata?.index!==24)return false;for(let p=o;p;p=p.parent)if(p.name==='mindcare-blender-static')return true;return false;}
const handoverHook='    global.CourtyardHandoverDetail.attach(b);\n',handoverLiterary=fs.readFileSync(root+'/assets/content-literary.js','utf8');
assert.equal(handoverLiterary.split(handoverHook).length,2,'one exact building19 handover integration');
const restoredHandoverLiterary=handoverLiterary.replace(handoverHook,'');
assert.equal(restoredHandoverLiterary,cp.execFileSync('git',['-C',root,'show','62e4317998f330c1adcc4f94a70395a1427e7681:assets/content-literary.js'],{encoding:'utf8'}),'literary differs only by the exact handover hook from preceding release');
function handoverAddition(b,o){if(b.metadata?.index!==19)return false;for(let p=o;p;p=p.parent)if(p.name==='handover-blender-static')return true;return false;}
const sessionHook='    global.CourtyardSessionDetail.attach(b);\n',sessionNarrative=fs.readFileSync(root+'/assets/content-narratives.js','utf8');
assert.equal(sessionNarrative.split(sessionHook).length,2,'one exact building13 session integration');
const restoredSessionNarrative=sessionNarrative.replace(sessionHook,'');
assert.equal(restoredSessionNarrative,cp.execFileSync('git',['-C',root,'show','84b26b5b79f14eb0f390ac3f9b38fc519ef72141:assets/content-narratives.js'],{encoding:'utf8'}),'narratives differs only by the exact session hook from preceding release');
function sessionAddition(b,o){if(b.metadata?.index!==13)return false;for(let p=o;p;p=p.parent)if(p.name==='session-blender-static')return true;return false;}
const workshopHook='    global.CourtyardWorkshopDetail.attach(b);\n',workshopLiterary=restoredHandoverLiterary;
assert.equal(workshopLiterary.split(workshopHook).length,2,'one exact building25 workshop integration');
const restoredWorkshopLiterary=workshopLiterary.replace(workshopHook,'');
assert.equal(restoredWorkshopLiterary,cp.execFileSync('git',['-C',root,'show','be0e5ad14a8a2c6c7600af9566a33e45ee4f12e4:assets/content-literary.js'],{encoding:'utf8'}),'literary differs only by the exact workshop hook from preceding release');
function workshopAddition(b,o){if(b.metadata?.index!==25)return false;for(let p=o;p;p=p.parent)if(p.name==='workshop-blender-static')return true;return false;}
const remeHook='    global.CourtyardRemeDetail.attach(b);\n',remeServices=restoredMindcareServices;
assert.equal(remeServices.split(remeHook).length,2,'one exact building12 reme integration');
const restoredRemeServices=remeServices.replace(remeHook,'');
assert.equal(restoredRemeServices,cp.execFileSync('git',['-C',root,'show','c07a41583f23e0c37f02f04f50b27132b91a7a80:assets/content-services.js'],{encoding:'utf8'}),'services differs only by the exact reme hook from preceding release');
function remeAddition(b,o){if(b.metadata?.index!==12)return false;for(let p=o;p;p=p.parent)if(p.name==='reme-blender-static')return true;return false;}
const gatewayHook='    global.CourtyardGatewayDetail.attach(b);\n',gatewayServices=restoredRemeServices;
assert.equal(gatewayServices.split(gatewayHook).length,2,'one exact building10 gateway integration');
const restoredGatewayServices=gatewayServices.replace(gatewayHook,'');
assert.equal(restoredGatewayServices,cp.execFileSync('git',['-C',root,'show','02a7f4077e18f35483457b55d303bc409dfcf808:assets/content-services.js'],{encoding:'utf8'}),'services differs only by the exact gateway hook from preceding release');
function gatewayAddition(b,o){if(b.metadata?.index!==10)return false;for(let p=o;p;p=p.parent)if(p.name==='gateway-blender-static')return true;return false;}
const proofHook='    global.CourtyardProofDetail.attach(b);\n',proofLiterary=restoredWorkshopLiterary;
assert.equal(proofLiterary.split(proofHook).length,2,'one exact building21 proof integration');
const restoredProofLiterary=proofLiterary.replace(proofHook,'');
assert.equal(restoredProofLiterary,cp.execFileSync('git',['-C',root,'show','ab4aedbbe3380eb9e4bdc82bfaec7a7e1aa89e05:assets/content-literary.js'],{encoding:'utf8'}),'literary differs only by the exact proof hook from preceding release');
function proofAddition(b,o){if(b.metadata?.index!==21)return false;for(let p=o;p;p=p.parent)if(p.name==='proof-blender-static')return true;return false;}
function load(old){
  const c={console};c.window=c;vm.createContext(c);
  for(const name of [...(!old?['rss-detail']:[]),'architecture','content-core','nuanling-detail','nuanling-app-detail','editor-detail','rubbing-detail','ink-detail','restoration-detail',...(!old?['huayun-detail']:[]),...(!old?['alternate-detail']:[]),'content-creation-care',...(!old?['shield-detail']:[]),...(!old?['gateway-detail']:[]),...(!old?['reme-detail']:[]),...(!old?['mindcare-detail']:[]),'content-services','twinstars-detail','causal-detail','versions-detail',...(!old?['city-detail','portraits-detail']:[]),...(!old?['session-detail']:[]),'content-narratives',...(!old?['proof-detail']:[]),...(!old?['workshop-detail']:[]),...(!old?['handover-detail']:[]),'content-literary',...(!old?['moonsnow-detail']:[]),'moon-snow-garden','infrastructure'])
    vm.runInContext(source('assets/'+name+'.js',old).toString(),c,{filename:name+'.js'});
  return c;
}
function digest(value){return crypto.createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');}
function shieldAddition(b,o){if(b.metadata?.index!==7)return false;for(let p=o;p;p=p.parent)if(p.name==='shield-blender-static')return true;return false;}
function portraitsAddition(b,o){if(b.metadata?.index!==14)return false;for(let p=o;p;p=p.parent)if(p.name==='portraits-blender-static')return true;return false;}
function cityAddition(b,o){if(b.metadata?.index!==16)return false;for(let p=o;p;p=p.parent)if(p.name==='city-blender-static')return true;return false;}
function huayunAddition(b,o){if(b.metadata?.index!==1)return false;for(let p=o;p;p=p.parent)if(p.name==='huayun-blender-static')return true;return false;}
function shape(b){
  b.root.updateMatrixWorld(true);const rows=[];
  b.root.traverse(o=>{if(rssAddition(b,o)||alternateAddition(b,o)||moonsnowAddition(b,o)||mindcareAddition(b,o)||handoverAddition(b,o)||sessionAddition(b,o)||workshopAddition(b,o)||remeAddition(b,o)||proofAddition(b,o)||gatewayAddition(b,o)||huayunAddition(b,o)||shieldAddition(b,o)||portraitsAddition(b,o)||cityAddition(b,o)||!o.isMesh)return;const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>[m.color?.toArray(),m.opacity,m.metalness,m.roughness,m.side,m.transparent]);
    rows.push([o.name,Array.from(o.geometry.attributes.position.array),o.geometry.index?Array.from(o.geometry.index.array):null,o.matrixWorld.toArray(),o.isInstancedMesh?moonsnowPaving.instances(b,o):null,materials]);});
  return digest(rows);
}
function boxes(b){return digest(b.collisionBoxes.map(box=>[box.min.toArray(),box.max.toArray(),box.userData]));}
const huayunHook='    global.CourtyardHuayunDetail.attach(b);\n',huayunCare=restoredAlternateCare;
assert.equal(huayunCare.split(huayunHook).length,2,'one exact building1 huayun integration');
const restoredHuayunCare=huayunCare.replace(huayunHook,'');assert.equal(restoredHuayunCare,cp.execFileSync('git',['-C',root,'show','19102dd19a4c1ab52d485df88f3962c0251ab665:assets/content-creation-care.js'],{encoding:'utf8'}),'creation-care differs only by the exact huayun hook from preceding release');
const old=load(true),now=load(false),phases=[0,.25,.5,.75,1,.4,0,1];
let unchanged=0,infrastructure=0,mechanisms=0;
for(let i=0;i<29;i++){
  if(i===23)continue;
  const build=c=>i<26?c.CourtyardArchitecture.build({THREE:T,index:i,title:'test',zone:0}):c.CourtyardInfrastructure.buildMath({THREE:T,index:i-26});
  const a=build(old),b=build(now);
  assert.equal(JSON.stringify((a.mechanisms||[]).map(m=>m.name)),JSON.stringify((b.mechanisms||[]).map(m=>m.name)),'mechanism names '+i);mechanisms+=(a.mechanisms||[]).length;
  for(const phase of phases){
    for(const building of [a,b])for(const m of building.mechanisms||[]){if(m.articulate)m.articulate(phase);else m.update?.(phase,1);}
    if(i!==16){assert.equal(shape(a),shape(b),'unchanged geometry/materials at building '+i+', phase '+phase);assert.equal(boxes(a),boxes(b),'unchanged collisions at '+i);}
  }
  if(i!==16){if(i<26)unchanged++;else infrastructure++;}
}
const shieldHook='    global.CourtyardShieldDetail.attach(b);\n',services=restoredGatewayServices;
assert.equal(services.split(shieldHook).length,2,'one exact building7 shield integration');
const restoredServices=services.replace(shieldHook,'');
assert.equal(restoredServices,source('assets/content-services.js',true).toString(),'services differs only by the exact shield hook');
const preservedFiles=['assets/butterfly-crown.js','assets/butterfly-flight.js','assets/content-butterfly.js','assets/models/LM24_Butterfly.glb','assets/readings/18.json','assets/reading-catalog.js','assets/reading-panels.js','assets/building-actions.js','assets/courtyard-runtime.js','garden.html','assets/architecture.js','assets/content-core.js','assets/content-services.js','assets/content-literary.js','assets/infrastructure.js','assets/moon-snow-garden.js','assets/rubbing-detail.js','assets/editor-detail.js','assets/nuanling-detail.js','assets/nuanling-app-detail.js','assets/twinstars-detail.js','assets/causal-detail.js','assets/versions-detail.js','assets/ink-detail.js','assets/restoration-detail.js','assets/detail-lod.js','assets/content-creation-care.js'];
for(const name of fs.readdirSync(root+'/assets/readings').filter(name=>name.endsWith('.json')))if(!preservedFiles.includes('assets/readings/'+name))preservedFiles.push('assets/readings/'+name);
const cityHook='    global.CourtyardCityDetail.attach(b);\n', narrative=restoredSessionNarrative;
assert.equal(narrative.split(cityHook).length,2,'one exact building16 city integration');
for(const file of preservedFiles)assert.equal(digest(file==='assets/architecture.js'?restoredRSSArchitecture:file==='assets/moon-snow-garden.js'?restoredMoonsnowGarden:file==='assets/content-literary.js'?restoredProofLiterary:file==='assets/content-narratives.js'?narrative.replace(cityHook,'').replace('    global.CourtyardPortraitsDetail.attach(b);\n',''):(file==='assets/content-creation-care.js'?restoredHuayunCare:(file==='assets/content-services.js'?restoredServices:(file==='assets/content-narratives.js'?restoredSessionNarrative:source(file,false))))),digest(source(file,true)),'unchanged source '+file);
const html=source('index.html',false).toString(),before=source('index.html',true).toString();
for(const pattern of [/const LINKS = (\[[\s\S]*?\n\]);/,/const TRACKS=(\[[\s\S]*?\n\]);/])assert.equal(html.match(pattern)[1],before.match(pattern)[1],'unchanged entry content');
assert.equal(html,source('island.html',false).toString(),'entry files identical');
assert(html.indexOf('src="assets/shield-detail.js?')>=0&&html.indexOf('src="assets/shield-detail.js?')<html.indexOf('src="assets/content-services.js?'),'shield detail loads before its builder');
const normalizeEntry=text=>text.replace(/<script src="assets\/rss-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/alternate-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/moonsnow-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/mindcare-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/handover-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/session-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/workshop-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/reme-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/proof-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/gateway-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/huayun-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/shield-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/portraits-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/city-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/\?v=[a-f0-9]{16}/g,'?v=ASSET_VERSION');
assert.equal(normalizeEntry(html),normalizeEntry(before),'entry unchanged except city loader and cache tokens');
let narratives=restoredSessionNarrative;const hook='    global.CourtyardCityDetail.attach(b);\n';assert.equal(narratives.split(hook).length,2,'one exact static integration hook');narratives=narratives.replace(hook,'');const portraitsHook='    global.CourtyardPortraitsDetail.attach(b);\n';assert.equal(narratives.split(portraitsHook).length,2,'one exact building14 portraits integration');narratives=narratives.replace(portraitsHook,'');assert.equal(narratives,source('assets/content-narratives.js',true).toString(),'no original narrative source removed or modified');
assert(html.indexOf('src="assets/city-detail.js?')>=0&&html.indexOf('src="assets/city-detail.js?')<html.indexOf('src="assets/content-narratives.js?'),'detail loads before builder');
const manifest=JSON.parse(source('docs/deployment-verify.html',false).toString().match(/const expected=(\{.*?\});/)[1]);
const oldManifest=JSON.parse(source('docs/deployment-verify.html',true).toString().match(/const expected=(\{.*?\});/)[1]);
assert.deepEqual(Object.keys(manifest).sort(),[...Object.keys(oldManifest),'assets/rss-detail.js','assets/alternate-detail.js','assets/moonsnow-detail.js','assets/mindcare-detail.js','assets/handover-detail.js','assets/session-detail.js','assets/workshop-detail.js','assets/reme-detail.js','assets/proof-detail.js','assets/gateway-detail.js','assets/huayun-detail.js','assets/shield-detail.js','assets/portraits-detail.js','assets/city-detail.js'].sort(),'preserve all release entries and add the new detail');
for(const [file,hash]of Object.entries(manifest))assert.equal(digest(source(file,false)),hash,'release hash '+file);
let versionedAssets=0;
for(const match of html.matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]{16})"/g)){
  const file=match[1];if(!fs.existsSync(root+'/'+file))continue;
  assert.equal(digest(source(file,false)).slice(0,16),match[2],'entry cache token '+file);versionedAssets++;
}
assert.equal(versionedAssets,55);assert.equal(unchanged,24);assert.equal(infrastructure,3);assert.equal(Object.keys(oldManifest).length,62);assert.equal(Object.keys(manifest).length,76);
const result={passed:true,baseline,unchangedBuildings:unchanged,unchangedInfrastructure:infrastructure,allMechanismsPreserved:true,mechanisms,checkedPhases:phases.length,preservedFiles,releaseEntries:Object.keys(manifest).length,versionedAssets};
fs.mkdirSync(root+'/qa-results/city',{recursive:true});fs.writeFileSync(root+'/qa-results/city/regression.json',JSON.stringify(result,null,2));console.log(result);
