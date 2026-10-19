/* GPU-free release isolation against the published grand-butterfly baseline. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js');
const baseline='7910ab80772cbe494be7d2b5dd3e055aa91056ee';
function source(file,old){return old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file);}
const gatewayHook='    global.CourtyardGatewayDetail.attach(b);\n',gatewayServices=fs.readFileSync(root+'/assets/content-services.js','utf8');
assert.equal(gatewayServices.split(gatewayHook).length,2,'one exact building10 gateway integration');
const restoredGatewayServices=gatewayServices.replace(gatewayHook,'');
assert.equal(restoredGatewayServices,cp.execFileSync('git',['-C',root,'show','02a7f4077e18f35483457b55d303bc409dfcf808:assets/content-services.js'],{encoding:'utf8'}),'services differs only by the exact gateway hook from preceding release');
function gatewayAddition(b,o){if(b.metadata?.index!==10)return false;for(let p=o;p;p=p.parent)if(p.name==='gateway-blender-static')return true;return false;}
const proofHook='    global.CourtyardProofDetail.attach(b);\n',proofLiterary=fs.readFileSync(root+'/assets/content-literary.js','utf8');
assert.equal(proofLiterary.split(proofHook).length,2,'one exact building21 proof integration');
const restoredProofLiterary=proofLiterary.replace(proofHook,'');
assert.equal(restoredProofLiterary,cp.execFileSync('git',['-C',root,'show','ab4aedbbe3380eb9e4bdc82bfaec7a7e1aa89e05:assets/content-literary.js'],{encoding:'utf8'}),'literary differs only by the exact proof hook from preceding release');
function proofAddition(b,o){if(b.metadata?.index!==21)return false;for(let p=o;p;p=p.parent)if(p.name==='proof-blender-static')return true;return false;}
function load(old){
  const c={console};c.window=c;vm.createContext(c);
  for(const name of ['architecture','content-core','nuanling-detail','nuanling-app-detail','editor-detail',...(!old?['rubbing-detail']:[]),...(!old?['ink-detail']:[]),...(!old?['restoration-detail']:[]),...(!old?['huayun-detail']:[]),'content-creation-care',...(!old?['shield-detail']:[]),...(!old?['gateway-detail']:[]),'content-services',...(!old?['twinstars-detail','causal-detail']:[]),...(!old?['versions-detail']:[]),...(!old?['city-detail','portraits-detail']:[]),'content-narratives',...(!old?['proof-detail']:[]),'content-literary','moon-snow-garden','infrastructure'])
    vm.runInContext(source('assets/'+name+'.js',old).toString(),c,{filename:name+'.js'});
  return c;
}
function digest(value){return crypto.createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');}
function inkAddition(b,o){if(b.metadata?.index!==0)return false;for(let p=o;p;p=p.parent)if(p.name==='ink-blender-static'||p.name==='ink-blender-carriage')return true;return false;}
function restorationAddition(b,o){if(b.metadata?.index!==3)return false;for(let p=o;p;p=p.parent)if(p.name==='restoration-blender-static'||p.name==='restoration-blender-light')return true;return false;}
function shieldAddition(b,o){if(b.metadata?.index!==7)return false;for(let p=o;p;p=p.parent)if(p.name==='shield-blender-static')return true;return false;}
function portraitsAddition(b,o){if(b.metadata?.index!==14)return false;for(let p=o;p;p=p.parent)if(p.name==='portraits-blender-static')return true;return false;}
function cityAddition(b,o){if(b.metadata?.index!==16)return false;for(let p=o;p;p=p.parent)if(p.name==='city-blender-static')return true;return false;}
function huayunAddition(b,o){if(b.metadata?.index!==1)return false;for(let p=o;p;p=p.parent)if(p.name==='huayun-blender-static')return true;return false;}
function shape(b){
  b.root.updateMatrixWorld(true);const rows=[];
  b.root.traverse(o=>{if(proofAddition(b,o)||gatewayAddition(b,o)||huayunAddition(b,o)||shieldAddition(b,o)||portraitsAddition(b,o)||cityAddition(b,o)||!o.isMesh||inkAddition(b,o)||restorationAddition(b,o))return;const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>[m.color?.toArray(),m.opacity,m.metalness,m.roughness,m.side,m.transparent]);
    rows.push([o.name,Array.from(o.geometry.attributes.position.array),o.geometry.index?Array.from(o.geometry.index.array):null,o.matrixWorld.toArray(),o.isInstancedMesh?Array.from(o.instanceMatrix.array):null,materials]);});
  return digest(rows);
}
function boxes(b){return digest(b.collisionBoxes.filter(box=>!(b.metadata?.index===3&&box.userData?.part==='restoration-protective-arch-foot')).map(box=>[box.min.toArray(),box.max.toArray(),box.userData]));}
const huayunHook='    global.CourtyardHuayunDetail.attach(b);\n',huayunCare=fs.readFileSync(root+'/assets/content-creation-care.js','utf8');
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
    if(i!==15&&i!==17&&i!==22){if(i!==18)assert.equal(shape(a),shape(b),'unchanged geometry/materials at building '+i+', phase '+phase);assert.equal(boxes(a),boxes(b),'unchanged collisions at '+i);}
  }
  if(i!==15&&i!==17&&i!==22){if(i<26){if(i!==18)unchanged++;}else infrastructure++;}
}
const shieldHook='    global.CourtyardShieldDetail.attach(b);\n',services=restoredGatewayServices;
assert.equal(services.split(shieldHook).length,2,'one exact building7 shield integration');
const restoredServices=services.replace(shieldHook,'');
assert.equal(restoredServices,source('assets/content-services.js',true).toString(),'services differs only by the exact shield hook');
const preservedFiles=['assets/butterfly-crown.js','assets/butterfly-flight.js','assets/content-butterfly.js','assets/models/LM24_Butterfly.glb','assets/readings/22.json','assets/reading-catalog.js','assets/reading-panels.js','assets/building-actions.js','assets/courtyard-runtime.js','garden.html'];
for(const file of preservedFiles)assert.equal(digest(file==='assets/content-literary.js'?restoredProofLiterary:(file==='assets/content-services.js'?restoredServices:source(file,false))),digest(source(file,true)),'unchanged source '+file);
const html=source('index.html',false).toString(),before=source('index.html',true).toString();
for(const pattern of [/const LINKS = (\[[\s\S]*?\n\]);/,/const TRACKS=(\[[\s\S]*?\n\]);/])assert.equal(html.match(pattern)[1],before.match(pattern)[1],'unchanged entry content');
assert.equal(html,source('island.html',false).toString(),'entry files identical');
assert(html.indexOf('src="assets/shield-detail.js?')>=0&&html.indexOf('src="assets/shield-detail.js?')<html.indexOf('src="assets/content-services.js?'),'shield detail loads before its builder');
assert(html.indexOf('src="assets/rubbing-detail.js?')<html.indexOf('src="assets/content-literary.js?'),'detail loads before its builder');
const manifest=JSON.parse(source('docs/deployment-verify.html',false).toString().match(/const expected=(\{.*?\});/)[1]);
const oldManifest=JSON.parse(source('docs/deployment-verify.html',true).toString().match(/const expected=(\{.*?\});/)[1]);
assert.deepEqual(Object.keys(manifest).sort(),[...Object.keys(oldManifest),'assets/proof-detail.js','assets/gateway-detail.js','assets/huayun-detail.js','assets/shield-detail.js','assets/portraits-detail.js','assets/city-detail.js','assets/detail-lod.js','assets/restoration-detail.js','assets/ink-detail.js','assets/rubbing-detail.js','assets/twinstars-detail.js','assets/causal-detail.js','assets/versions-detail.js'].sort(),'preserve all release entries and add the new detail');
for(const [file,hash]of Object.entries(manifest))assert.equal(digest(source(file,false)),hash,'release hash '+file);
let versionedAssets=0;
for(const match of html.matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]{16})"/g)){
  const file=match[1];if(!fs.existsSync(root+'/'+file))continue;
  assert.equal(digest(source(file,false)).slice(0,16),match[2],'entry cache token '+file);versionedAssets++;
}
const result={passed:true,baseline,unchangedBuildings:unchanged,unchangedInfrastructure:infrastructure,allMechanismsPreserved:true,mechanisms,checkedPhases:phases.length,preservedFiles,releaseEntries:Object.keys(manifest).length,versionedAssets};
fs.mkdirSync(root+'/qa-results/rubbing',{recursive:true});fs.writeFileSync(root+'/qa-results/rubbing/regression.json',JSON.stringify(result,null,2));console.log(result);
