/* GPU-free release isolation against the published twinstars-detail baseline. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js');
const baseline='8038643428fc5ab0a51328bb53e3871ad6d1eab9';
function source(file,old){return old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file);}
const sessionHook='    global.CourtyardSessionDetail.attach(b);\n',sessionNarrative=fs.readFileSync(root+'/assets/content-narratives.js','utf8');
assert.equal(sessionNarrative.split(sessionHook).length,2,'one exact building13 session integration');
const restoredSessionNarrative=sessionNarrative.replace(sessionHook,'');
assert.equal(restoredSessionNarrative,cp.execFileSync('git',['-C',root,'show','84b26b5b79f14eb0f390ac3f9b38fc519ef72141:assets/content-narratives.js'],{encoding:'utf8'}),'narratives differs only by the exact session hook from preceding release');
function sessionAddition(b,o){if(b.metadata?.index!==13)return false;for(let p=o;p;p=p.parent)if(p.name==='session-blender-static')return true;return false;}
const workshopHook='    global.CourtyardWorkshopDetail.attach(b);\n',workshopLiterary=fs.readFileSync(root+'/assets/content-literary.js','utf8');
assert.equal(workshopLiterary.split(workshopHook).length,2,'one exact building25 workshop integration');
const restoredWorkshopLiterary=workshopLiterary.replace(workshopHook,'');
assert.equal(restoredWorkshopLiterary,cp.execFileSync('git',['-C',root,'show','be0e5ad14a8a2c6c7600af9566a33e45ee4f12e4:assets/content-literary.js'],{encoding:'utf8'}),'literary differs only by the exact workshop hook from preceding release');
function workshopAddition(b,o){if(b.metadata?.index!==25)return false;for(let p=o;p;p=p.parent)if(p.name==='workshop-blender-static')return true;return false;}
const remeHook='    global.CourtyardRemeDetail.attach(b);\n',remeServices=fs.readFileSync(root+'/assets/content-services.js','utf8');
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
  for(const name of ['architecture','content-core','nuanling-detail','nuanling-app-detail','editor-detail','rubbing-detail',...(!old?['ink-detail']:[]),...(!old?['restoration-detail']:[]),...(!old?['huayun-detail']:[]),'content-creation-care',...(!old?['shield-detail']:[]),...(!old?['gateway-detail']:[]),...(!old?['reme-detail']:[]),'content-services','twinstars-detail',...(!old?['causal-detail']:[]),...(!old?['versions-detail']:[]),...(!old?['city-detail','portraits-detail']:[]),...(!old?['session-detail']:[]),'content-narratives',...(!old?['proof-detail']:[]),...(!old?['workshop-detail']:[]),'content-literary','moon-snow-garden','infrastructure'])
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
  b.root.traverse(o=>{if(sessionAddition(b,o)||workshopAddition(b,o)||remeAddition(b,o)||proofAddition(b,o)||gatewayAddition(b,o)||huayunAddition(b,o)||shieldAddition(b,o)||portraitsAddition(b,o)||cityAddition(b,o)||!o.isMesh||inkAddition(b,o)||restorationAddition(b,o))return;const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>[m.color?.toArray(),m.opacity,m.metalness,m.roughness,m.side,m.transparent]);
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
    if(i!==15){if(i!==18)assert.equal(shape(a),shape(b),'unchanged geometry/materials at building '+i+', phase '+phase);assert.equal(boxes(a),boxes(b),'unchanged collisions at '+i);}
  }
  if(i!==15){if(i<26){if(i!==18)unchanged++;}else infrastructure++;}
}
const shieldHook='    global.CourtyardShieldDetail.attach(b);\n',services=restoredGatewayServices;
assert.equal(services.split(shieldHook).length,2,'one exact building7 shield integration');
const restoredServices=services.replace(shieldHook,'');
assert.equal(restoredServices,source('assets/content-services.js',true).toString(),'services differs only by the exact shield hook');
const preservedFiles=['assets/butterfly-crown.js','assets/butterfly-flight.js','assets/content-butterfly.js','assets/models/LM24_Butterfly.glb','assets/readings/15.json','assets/reading-catalog.js','assets/reading-panels.js','assets/building-actions.js','assets/courtyard-runtime.js','garden.html','assets/architecture.js','assets/content-core.js','assets/content-creation-care.js','assets/content-services.js','assets/content-literary.js','assets/infrastructure.js','assets/moon-snow-garden.js','assets/rubbing-detail.js','assets/editor-detail.js','assets/nuanling-detail.js','assets/nuanling-app-detail.js','assets/twinstars-detail.js'];
for(const name of fs.readdirSync(root+'/assets/readings').filter(name=>name.endsWith('.json')))if(!preservedFiles.includes('assets/readings/'+name))preservedFiles.push('assets/readings/'+name);
// B0's additive detail is audited in ink-regression.cjs; preserve all original builder source here.
let restoredCreation=restoredHuayunCare;
for(const line of ['    global.CourtyardRestorationDetail.attach(b);\n','    global.CourtyardRestorationDetail.attachLight(b,inspection);\n']){assert.equal(restoredCreation.split(line).length,2,'one exact building3 restoration integration');restoredCreation=restoredCreation.replace(line,'');}
for(const line of ['    global.CourtyardInkDetail.attach(b);\n','    global.CourtyardInkDetail.attachCarriage(b,layers);\n']){assert.equal(restoredCreation.split(line).length,2,'one exact building0 detail integration');restoredCreation=restoredCreation.replace(line,'');}
for(const file of preservedFiles)assert.equal(digest(file==='assets/content-literary.js'?restoredProofLiterary:file==='assets/content-creation-care.js'?restoredCreation:(file==='assets/content-services.js'?restoredServices:(file==='assets/content-narratives.js'?restoredSessionNarrative:source(file,false)))),digest(source(file,true)),'unchanged source '+file);
const html=source('index.html',false).toString(),before=source('index.html',true).toString();
for(const pattern of [/const LINKS = (\[[\s\S]*?\n\]);/,/const TRACKS=(\[[\s\S]*?\n\]);/])assert.equal(html.match(pattern)[1],before.match(pattern)[1],'unchanged entry content');
assert.equal(html,source('island.html',false).toString(),'entry files identical');
assert(html.indexOf('src="assets/shield-detail.js?')>=0&&html.indexOf('src="assets/shield-detail.js?')<html.indexOf('src="assets/content-services.js?'),'shield detail loads before its builder');
const normalizeEntry=text=>text.replace(/<script src="assets\/session-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/workshop-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/reme-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/proof-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/gateway-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/huayun-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/shield-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/portraits-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/city-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/detail-lod\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/restoration-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/ink-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/versions-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/causal-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/\?v=[a-f0-9]{16}/g,'?v=ASSET_VERSION');
assert.equal(normalizeEntry(html),normalizeEntry(before),'all entry source unchanged except exact detail loader and cache tokens');
let restoredNarrative=restoredSessionNarrative;
const portraitsHook='    global.CourtyardPortraitsDetail.attach(b);\n';assert.equal(restoredNarrative.split(portraitsHook).length,2,'one exact building14 portraits integration');restoredNarrative=restoredNarrative.replace(portraitsHook,'');
const cityHook='    global.CourtyardCityDetail.attach(b);\n';assert.equal(restoredNarrative.split(cityHook).length,2,'one exact building16 city integration');restoredNarrative=restoredNarrative.replace(cityHook,'');
// Preserve the original exact-delta audit while allowing only building18's two integration calls.
for(const line of ['    global.CourtyardVersionsDetail.attach(b);\n','      global.CourtyardVersionsDetail.attachScreen(b,p);\n']){assert.equal(restoredNarrative.split(line).length,2,'one exact building18 detail integration');restoredNarrative=restoredNarrative.replace(line,'');}
for(const line of ['    global.CourtyardCausalDetail.attach(b);\n','        global.CourtyardCausalDetail.attachVent(b,p);\n']){assert.equal(restoredNarrative.split(line).length,2,'one exact detail integration');restoredNarrative=restoredNarrative.replace(line,'');}
for(const [replacement,original] of [
  ["abovePanel(b,shutters,s*5.8,5.84+k*.28,z-.95,2.2,.075,1.24,'glassDark','knot-'+k+'-borrowed-light')","abovePanel(b,shutters,s*5.8,5.72+k*.28,z,2.8,.075,1.24,'glassDark','knot-'+k+'-borrowed-light')"],
  ["        // Closed waved roof bands are authored in Blender on this unchanged plan.","        b.box(roofs[n],cx,hs[n],z,n===3?1.9:2.13,.15,roofLen,[0,Math.atan2(dx,dz),0]);"],
  ["          // Surface seams now follow the Blender roof height.","          if(Math.min(t,len-t)>.95) b.box('bronze',px,hs[n]+.1,pz,2.14,.03,.035,null,true);"],
  [`        // A true skylight aperture lets the original light catcher tilt without clipping a solid roof.
        const canopyX=s*5.75, ventX=s*5.8, canopyY=5.45+k*.28, canopyZ=z-.95;
        const left=canopyX-3.475, right=canopyX+3.475, holeLeft=ventX-1.3, holeRight=ventX+1.3;
        b.box('copper',(left+holeLeft)/2,canopyY,canopyZ,holeLeft-left,.13,1.70);
        b.box('copper',(right+holeRight)/2,canopyY,canopyZ,right-holeRight,.13,1.70);
        for(const edge of [-1,1]) b.box('copper',ventX,canopyY,canopyZ+edge*.77,2.60,.13,.16);`,"        b.box('copper',s*5.75,5.45+k*.28,z,6.95,.13,1.36);"]
]){assert.equal(restoredNarrative.split(replacement).length,2,'one exact approved roof or aperture replacement');restoredNarrative=restoredNarrative.replace(replacement,original);}
assert.equal(restoredNarrative,source('assets/content-narratives.js',true).toString(),'narrative differs only by exact 27 roof/trim replacements, six fixed canopy apertures, exact 12 cm rise/95 cm entryward pivot shift/2.2 m leaf width, and two detail hooks');
assert(html.indexOf('src="assets/causal-detail.js?')>=0&&html.indexOf('src="assets/causal-detail.js?')<html.indexOf('src="assets/content-narratives.js?'),'detail loads before its builder');
const manifest=JSON.parse(source('docs/deployment-verify.html',false).toString().match(/const expected=(\{.*?\});/)[1]);
const oldManifest=JSON.parse(source('docs/deployment-verify.html',true).toString().match(/const expected=(\{.*?\});/)[1]);
assert.deepEqual(Object.keys(manifest).sort(),[...Object.keys(oldManifest),'assets/session-detail.js','assets/workshop-detail.js','assets/reme-detail.js','assets/proof-detail.js','assets/gateway-detail.js','assets/huayun-detail.js','assets/shield-detail.js','assets/portraits-detail.js','assets/city-detail.js','assets/detail-lod.js','assets/restoration-detail.js','assets/ink-detail.js','assets/causal-detail.js','assets/versions-detail.js'].sort(),'preserve all release entries and add the new detail');
for(const [file,hash]of Object.entries(manifest))assert.equal(digest(source(file,false)),hash,'release hash '+file);
let versionedAssets=0;
for(const match of html.matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]{16})"/g)){
  const file=match[1];if(!fs.existsSync(root+'/'+file))continue;
  assert.equal(digest(source(file,false)).slice(0,16),match[2],'entry cache token '+file);versionedAssets++;
}
const result={passed:true,baseline,unchangedBuildings:unchanged,unchangedInfrastructure:infrastructure,allMechanismsPreserved:true,mechanisms,checkedPhases:phases.length,preservedFiles,releaseEntries:Object.keys(manifest).length,versionedAssets};
fs.mkdirSync(root+'/qa-results/causal',{recursive:true});fs.writeFileSync(root+'/qa-results/causal/regression.json',JSON.stringify(result,null,2));console.log(result);
