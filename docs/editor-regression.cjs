/* Published baseline 386c2b123a5a30e785714aec22a354f998af03d9 is the exact parent of
 * ef87ae85ed90cfe2752d7c47727fb5bb12709dc7 and is documented in EDITOR_DETAIL.md.
 * The prior unpublished SHA was not fetchable from origin. Equality checks are unchanged. */
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),assert=require('assert/strict');const root=require('path').resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js');const moonsnowPaving=require('./moonsnow-paving-normalizer.js');
const rssHook='      global.CourtyardRSSDetail.attach(b);\n',rssArchitecture=require('./rss-source-normalizer.js').restoreVaultSource(fs.readFileSync(root+'/assets/architecture.js','utf8'));
assert.equal(rssArchitecture.split(rssHook).length,2,'one exact building8 RSS integration');
const restoredRSSArchitecture=rssArchitecture.replace(rssHook,'');
assert.equal(restoredRSSArchitecture,cp.execFileSync('git',['-C',root,'show','fc5775a2f5237ccd0f29450702716bf7ec0fcc2d:assets/architecture.js'],{encoding:'utf8'}),'architecture differs only by the exact RSS hook from preceding release');
function dossierAddition(b,o){if(b.metadata?.index!==11)return false;for(let p=o;p;p=p.parent)if(p.name==='dossier-blender-static')return true;return false;}
function vaultAddition(b,o){if(b.metadata?.index!==9)return false;for(let p=o;p;p=p.parent)if(p.name==='vault-blender-static')return true;return false;}
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
function load(old){const c={console};c.window=c;vm.createContext(c);for(const n of [...(!old?['dossier-detail','vault-detail','rss-detail']:[]),'architecture','content-core','nuanling-detail','nuanling-app-detail',...(!old?['editor-detail']:[]),...(!old?['ink-detail']:[]),...(!old?['restoration-detail']:[]),...(!old?['huayun-detail']:[]),...(!old?['alternate-detail']:[]),'content-creation-care',...(!old?['shield-detail']:[]),...(!old?['gateway-detail']:[]),...(!old?['reme-detail']:[]),...(!old?['mindcare-detail']:[]),'content-services',...(!old?['twinstars-detail','causal-detail']:[]),...(!old?['versions-detail']:[]),...(!old?['city-detail','portraits-detail']:[]),...(!old?['session-detail']:[]),'content-narratives',...(!old?['rubbing-detail']:[]),...(!old?['proof-detail']:[]),...(!old?['workshop-detail']:[]),...(!old?['handover-detail']:[]),'content-literary',...(!old?['moonsnow-detail']:[]),'moon-snow-garden'])vm.runInContext(old?cp.execFileSync('git',['-C',root,'show','386c2b123a5a30e785714aec22a354f998af03d9:assets/'+n+'.js'],{encoding:'utf8',maxBuffer:16*1024*1024}):fs.readFileSync(root+'/assets/'+n+'.js','utf8'),c);return c}const shieldHook='    global.CourtyardShieldDetail.attach(b);\n',services=restoredGatewayServices;assert.equal(services.split(shieldHook).length,2,'one exact building7 shield integration');assert.equal(services.replace(shieldHook,''),cp.execFileSync('git',['-C',root,'show','386c2b123a5a30e785714aec22a354f998af03d9:assets/content-services.js'],{encoding:'utf8'}),'services differs only by the exact shield hook');const huayunHook='    global.CourtyardHuayunDetail.attach(b);\n',huayunCare=restoredAlternateCare;
assert.equal(huayunCare.split(huayunHook).length,2,'one exact building1 huayun integration');
const restoredHuayunCare=huayunCare.replace(huayunHook,'');assert.equal(restoredHuayunCare,cp.execFileSync('git',['-C',root,'show','19102dd19a4c1ab52d485df88f3962c0251ab665:assets/content-creation-care.js'],{encoding:'utf8'}),'creation-care differs only by the exact huayun hook from preceding release');
const old=load(true),now=load(false);let unchanged=0;function inkAddition(b,o){if(b.metadata?.index!==0)return false;for(let p=o;p;p=p.parent)if(p.name==='ink-blender-static'||p.name==='ink-blender-carriage')return true;return false;}
function restorationAddition(b,o){if(b.metadata?.index!==3)return false;for(let p=o;p;p=p.parent)if(p.name==='restoration-blender-static'||p.name==='restoration-blender-light')return true;return false;}
function shieldAddition(b,o){if(b.metadata?.index!==7)return false;for(let p=o;p;p=p.parent)if(p.name==='shield-blender-static')return true;return false;}
function portraitsAddition(b,o){if(b.metadata?.index!==14)return false;for(let p=o;p;p=p.parent)if(p.name==='portraits-blender-static')return true;return false;}
function cityAddition(b,o){if(b.metadata?.index!==16)return false;for(let p=o;p;p=p.parent)if(p.name==='city-blender-static')return true;return false;}
function huayunAddition(b,o){if(b.metadata?.index!==1)return false;for(let p=o;p;p=p.parent)if(p.name==='huayun-blender-static')return true;return false;}
function shape(b){const rows=[];b.root.updateMatrixWorld(true);b.root.traverse(o=>{if(o.isMesh&&!dossierAddition(b,o)&&!vaultAddition(b,o)&&!rssAddition(b,o)&&!alternateAddition(b,o)&&!moonsnowAddition(b,o)&&!mindcareAddition(b,o)&&!handoverAddition(b,o)&&!sessionAddition(b,o)&&!workshopAddition(b,o)&&!remeAddition(b,o)&&!proofAddition(b,o)&&!gatewayAddition(b,o)&&!huayunAddition(b,o)&&!shieldAddition(b,o)&&!portraitsAddition(b,o)&&!cityAddition(b,o)&&!inkAddition(b,o)&&!restorationAddition(b,o))rows.push([o.name,Array.from(o.geometry.attributes.position.array),o.matrixWorld.toArray(),o.isInstancedMesh?moonsnowPaving.instances(b,o):null])});return JSON.stringify(rows)}for(let i=0;i<26;i++){if(i===23)continue;const a=old.CourtyardArchitecture.build({THREE:T,index:i,title:'test',zone:0}),b=now.CourtyardArchitecture.build({THREE:T,index:i,title:'test',zone:0});assert.equal(JSON.stringify(a.mechanisms.map(x=>x.name)),JSON.stringify(b.mechanisms.map(x=>x.name)));if(i!==18&&i!==15&&i!==6&&i!==17&&i!==22){assert.equal(shape(a),shape(b),'only documented building6/15/17/18/22 refinements change');unchanged++}}console.log({passed:true,unchangedBuildings:unchanged,allMechanismsPreserved:true,baseline:'386c2b1'});
