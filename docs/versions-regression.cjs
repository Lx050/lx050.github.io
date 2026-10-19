/* GPU-free release isolation against the published causal-detail baseline. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js');
const baseline='0b34816b05cfd24f20ead68d33735869f7cc5ecc';
function source(file,old){return old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file);}
function load(old){
  const c={console};c.window=c;vm.createContext(c);
  for(const name of ['architecture','content-core','nuanling-detail','nuanling-app-detail','editor-detail','rubbing-detail',...(!old?['ink-detail']:[]),...(!old?['restoration-detail']:[]),'content-creation-care','content-services','twinstars-detail','causal-detail',...(!old?['versions-detail']:[]),...(!old?['city-detail']:[]),'content-narratives','content-literary','moon-snow-garden','infrastructure'])
    vm.runInContext(source('assets/'+name+'.js',old).toString(),c,{filename:name+'.js'});
  return c;
}
function digest(value){return crypto.createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');}
function inkAddition(b,o){if(b.metadata?.index!==0)return false;for(let p=o;p;p=p.parent)if(p.name==='ink-blender-static'||p.name==='ink-blender-carriage')return true;return false;}
function restorationAddition(b,o){if(b.metadata?.index!==3)return false;for(let p=o;p;p=p.parent)if(p.name==='restoration-blender-static'||p.name==='restoration-blender-light')return true;return false;}
function cityAddition(b,o){if(b.metadata?.index!==16)return false;for(let p=o;p;p=p.parent)if(p.name==='city-blender-static')return true;return false;}
function shape(b){
  b.root.updateMatrixWorld(true);const rows=[];
  b.root.traverse(o=>{if(cityAddition(b,o)||!o.isMesh||inkAddition(b,o)||restorationAddition(b,o))return;const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>[m.color?.toArray(),m.opacity,m.metalness,m.roughness,m.side,m.transparent]);
    rows.push([o.name,Array.from(o.geometry.attributes.position.array),o.geometry.index?Array.from(o.geometry.index.array):null,o.matrixWorld.toArray(),o.isInstancedMesh?Array.from(o.instanceMatrix.array):null,materials]);});
  return digest(rows);
}
function boxes(b){return digest(b.collisionBoxes.filter(box=>!(b.metadata?.index===3&&box.userData?.part==='restoration-protective-arch-foot')).map(box=>[box.min.toArray(),box.max.toArray(),box.userData]));}
const old=load(true),now=load(false),phases=[0,.25,.5,.75,1,.4,0,1];
let unchanged=0,infrastructure=0,mechanisms=0;
for(let i=0;i<29;i++){
  if(i===23)continue;
  const build=c=>i<26?c.CourtyardArchitecture.build({THREE:T,index:i,title:'test',zone:0}):c.CourtyardInfrastructure.buildMath({THREE:T,index:i-26});
  const a=build(old),b=build(now);
  assert.equal(JSON.stringify((a.mechanisms||[]).map(m=>m.name)),JSON.stringify((b.mechanisms||[]).map(m=>m.name)),'mechanism names '+i);mechanisms+=(a.mechanisms||[]).length;
  for(const phase of phases){
    for(const building of [a,b])for(const m of building.mechanisms||[]){if(m.articulate)m.articulate(phase);else m.update?.(phase,1);}
    if(i!==18){assert.equal(shape(a),shape(b),'unchanged geometry/materials at building '+i+', phase '+phase);assert.equal(boxes(a),boxes(b),'unchanged collisions at '+i);}
  }
  if(i!==18){if(i<26)unchanged++;else infrastructure++;}
}
const preservedFiles=['assets/butterfly-crown.js','assets/butterfly-flight.js','assets/content-butterfly.js','assets/models/LM24_Butterfly.glb','assets/readings/18.json','assets/reading-catalog.js','assets/reading-panels.js','assets/building-actions.js','assets/courtyard-runtime.js','garden.html','assets/architecture.js','assets/content-core.js','assets/content-creation-care.js','assets/content-services.js','assets/content-literary.js','assets/infrastructure.js','assets/moon-snow-garden.js','assets/rubbing-detail.js','assets/editor-detail.js','assets/nuanling-detail.js','assets/nuanling-app-detail.js','assets/twinstars-detail.js','assets/causal-detail.js'];
for(const name of fs.readdirSync(root+'/assets/readings').filter(name=>name.endsWith('.json')))if(!preservedFiles.includes('assets/readings/'+name))preservedFiles.push('assets/readings/'+name);
// B0's additive detail is audited in ink-regression.cjs; preserve all original builder source here.
let restoredCreation=source('assets/content-creation-care.js',false).toString();
for(const line of ['    global.CourtyardRestorationDetail.attach(b);\n','    global.CourtyardRestorationDetail.attachLight(b,inspection);\n']){assert.equal(restoredCreation.split(line).length,2,'one exact building3 restoration integration');restoredCreation=restoredCreation.replace(line,'');}
for(const line of ['    global.CourtyardInkDetail.attach(b);\n','    global.CourtyardInkDetail.attachCarriage(b,layers);\n']){assert.equal(restoredCreation.split(line).length,2,'one exact building0 detail integration');restoredCreation=restoredCreation.replace(line,'');}
for(const file of preservedFiles)assert.equal(digest(file==='assets/content-creation-care.js'?restoredCreation:source(file,false)),digest(source(file,true)),'unchanged source '+file);
const html=source('index.html',false).toString(),before=source('index.html',true).toString();
for(const pattern of [/const LINKS = (\[[\s\S]*?\n\]);/,/const TRACKS=(\[[\s\S]*?\n\]);/])assert.equal(html.match(pattern)[1],before.match(pattern)[1],'unchanged entry content');
assert.equal(html,source('island.html',false).toString(),'entry files identical');
const normalizeEntry=text=>text.replace(/<script src="assets\/city-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/detail-lod\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/restoration-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/ink-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/versions-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/\?v=[a-f0-9]{16}/g,'?v=ASSET_VERSION');
assert.equal(normalizeEntry(html),normalizeEntry(before),'all entry source unchanged except exact detail loader and cache tokens');
let restoredNarrative=source('assets/content-narratives.js',false).toString();
const cityHook='    global.CourtyardCityDetail.attach(b);\n';assert.equal(restoredNarrative.split(cityHook).length,2,'one exact building16 city integration');restoredNarrative=restoredNarrative.replace(cityHook,'');
for(const line of ['    global.CourtyardVersionsDetail.attach(b);\n','      global.CourtyardVersionsDetail.attachScreen(b,p);\n']){assert.equal(restoredNarrative.split(line).length,2,'one exact detail integration');restoredNarrative=restoredNarrative.replace(line,'');}
assert.equal(restoredNarrative,source('assets/content-narratives.js',true).toString(),'narrative differs only by two additive detail hooks; no original source removed or modified');
assert(html.indexOf('src="assets/versions-detail.js?')>=0&&html.indexOf('src="assets/versions-detail.js?')<html.indexOf('src="assets/content-narratives.js?'),'detail loads before its builder');
const manifest=JSON.parse(source('docs/deployment-verify.html',false).toString().match(/const expected=(\{.*?\});/)[1]);
const oldManifest=JSON.parse(source('docs/deployment-verify.html',true).toString().match(/const expected=(\{.*?\});/)[1]);
assert.deepEqual(Object.keys(manifest).sort(),[...Object.keys(oldManifest),'assets/city-detail.js','assets/detail-lod.js','assets/restoration-detail.js','assets/ink-detail.js','assets/versions-detail.js'].sort(),'preserve all release entries and add the new detail');
for(const [file,hash]of Object.entries(manifest))assert.equal(digest(source(file,false)),hash,'release hash '+file);
let versionedAssets=0;
for(const match of html.matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]{16})"/g)){
  const file=match[1];if(!fs.existsSync(root+'/'+file))continue;
  assert.equal(digest(source(file,false)).slice(0,16),match[2],'entry cache token '+file);versionedAssets++;
}
assert.equal(unchanged,24);assert.equal(infrastructure,3);assert.equal(Object.keys(oldManifest).length,58);assert.equal(Object.keys(manifest).length,63);
const result={passed:true,baseline,unchangedBuildings:unchanged,unchangedInfrastructure:infrastructure,allMechanismsPreserved:true,mechanisms,checkedPhases:phases.length,preservedFiles,releaseEntries:Object.keys(manifest).length,versionedAssets};
fs.mkdirSync(root+'/qa-results/versions',{recursive:true});fs.writeFileSync(root+'/qa-results/versions/regression.json',JSON.stringify(result,null,2));console.log(result);
