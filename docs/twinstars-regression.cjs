/* GPU-free release isolation against the published rubbing-detail baseline. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js');
const baseline='f284106f4c7cba7e4bd7d8fa7befa641865c80ec';
function source(file,old){return old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file);}
function load(old){
  const c={console};c.window=c;vm.createContext(c);
  for(const name of ['architecture','content-core','nuanling-detail','nuanling-app-detail','editor-detail','rubbing-detail','content-creation-care','content-services',...(!old?['twinstars-detail','causal-detail']:[]),...(!old?['versions-detail']:[]),'content-narratives','content-literary','moon-snow-garden','infrastructure'])
    vm.runInContext(source('assets/'+name+'.js',old).toString(),c,{filename:name+'.js'});
  return c;
}
function digest(value){return crypto.createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');}
function shape(b){
  b.root.updateMatrixWorld(true);const rows=[];
  b.root.traverse(o=>{if(!o.isMesh)return;const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>[m.color?.toArray(),m.opacity,m.metalness,m.roughness,m.side,m.transparent]);
    rows.push([o.name,Array.from(o.geometry.attributes.position.array),o.geometry.index?Array.from(o.geometry.index.array):null,o.matrixWorld.toArray(),o.isInstancedMesh?Array.from(o.instanceMatrix.array):null,materials]);});
  return digest(rows);
}
function boxes(b){return digest(b.collisionBoxes.map(box=>[box.min.toArray(),box.max.toArray(),box.userData]));}
const old=load(true),now=load(false),phases=[0,.25,.5,.75,1,.4,0,1];
let unchanged=0,infrastructure=0,mechanisms=0;
for(let i=0;i<29;i++){
  if(i===23)continue;
  const build=c=>i<26?c.CourtyardArchitecture.build({THREE:T,index:i,title:'test',zone:0}):c.CourtyardInfrastructure.buildMath({THREE:T,index:i-26});
  const a=build(old),b=build(now);
  assert.equal(JSON.stringify((a.mechanisms||[]).map(m=>m.name)),JSON.stringify((b.mechanisms||[]).map(m=>m.name)),'mechanism names '+i);mechanisms+=(a.mechanisms||[]).length;
  for(const phase of phases){
    for(const building of [a,b])for(const m of building.mechanisms||[]){if(m.articulate)m.articulate(phase);else m.update?.(phase,1);}
    if(i!==15&&i!==17){if(i!==18)assert.equal(shape(a),shape(b),'unchanged geometry/materials at building '+i+', phase '+phase);assert.equal(boxes(a),boxes(b),'unchanged collisions at '+i);}
  }
  if(i!==15&&i!==17){if(i<26){if(i!==18)unchanged++;}else infrastructure++;}
}
const preservedFiles=['assets/butterfly-crown.js','assets/butterfly-flight.js','assets/content-butterfly.js','assets/models/LM24_Butterfly.glb','assets/readings/17.json','assets/reading-catalog.js','assets/reading-panels.js','assets/building-actions.js','assets/courtyard-runtime.js','garden.html','assets/architecture.js','assets/content-core.js','assets/content-creation-care.js','assets/content-services.js','assets/content-literary.js','assets/infrastructure.js','assets/moon-snow-garden.js','assets/rubbing-detail.js','assets/editor-detail.js','assets/nuanling-detail.js','assets/nuanling-app-detail.js'];
for(const name of fs.readdirSync(root+'/assets/readings').filter(name=>name.endsWith('.json')))if(!preservedFiles.includes('assets/readings/'+name))preservedFiles.push('assets/readings/'+name);
for(const file of preservedFiles)assert.equal(digest(source(file,false)),digest(source(file,true)),'unchanged source '+file);
const html=source('index.html',false).toString(),before=source('index.html',true).toString();
for(const pattern of [/const LINKS = (\[[\s\S]*?\n\]);/,/const TRACKS=(\[[\s\S]*?\n\]);/])assert.equal(html.match(pattern)[1],before.match(pattern)[1],'unchanged entry content');
assert.equal(html,source('island.html',false).toString(),'entry files identical');
const normalizeEntry=text=>text.replace(/<script src="assets\/versions-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/causal-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/twinstars-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/\?v=[a-f0-9]{16}/g,'?v=ASSET_VERSION');
assert.equal(normalizeEntry(html),normalizeEntry(before),'all entry source unchanged except exact detail loader and cache tokens');
let restoredNarrative=source('assets/content-narratives.js',false).toString();
// Preserve the original exact-delta audit while allowing only building18's two integration calls.
for(const line of ['    global.CourtyardVersionsDetail.attach(b);\n','      global.CourtyardVersionsDetail.attachScreen(b,p);\n']){assert.equal(restoredNarrative.split(line).length,2,'one exact building18 detail integration');restoredNarrative=restoredNarrative.replace(line,'');}
// Building15 has its own exact-delta audit in causal-regression.cjs.
const oldNarrative=source('assets/content-narratives.js',true).toString(), causalStart=restoredNarrative.indexOf('  B[15]='), causalEnd=restoredNarrative.indexOf('  B[16]=');
restoredNarrative=restoredNarrative.slice(0,causalStart)+oldNarrative.slice(oldNarrative.indexOf('  B[15]='),oldNarrative.indexOf('  B[16]='))+restoredNarrative.slice(causalEnd);
for(const line of ['    global.CourtyardTwinstarsDetail.attach(b);\n','        global.CourtyardTwinstarsDetail.attachScreen(b,p);\n']){assert.equal(restoredNarrative.split(line).length,2,'one exact detail integration');restoredNarrative=restoredNarrative.replace(line,'');}
restoredNarrative=restoredNarrative.replace('      // The equal closed vault shells and exposed ribs are authored in Blender.',"      b.barrel(x,0,6.55,16.6,6.27,2.72,'copper');\n      b.box('cedar',x,5.97,0,6.55,.18,15.7);");
assert.equal(restoredNarrative,source('assets/content-narratives.js',true).toString(),'narrative source differs only by approved roof replacement and detail hooks');
assert(html.indexOf('src="assets/twinstars-detail.js?')>=0&&html.indexOf('src="assets/twinstars-detail.js?')<html.indexOf('src="assets/content-narratives.js?'),'detail loads before its builder');
const manifest=JSON.parse(source('docs/deployment-verify.html',false).toString().match(/const expected=(\{.*?\});/)[1]);
const oldManifest=JSON.parse(source('docs/deployment-verify.html',true).toString().match(/const expected=(\{.*?\});/)[1]);
assert.deepEqual(Object.keys(manifest).sort(),[...Object.keys(oldManifest),'assets/twinstars-detail.js','assets/causal-detail.js','assets/versions-detail.js'].sort(),'preserve all release entries and add the new detail');
for(const [file,hash]of Object.entries(manifest))assert.equal(digest(source(file,false)),hash,'release hash '+file);
let versionedAssets=0;
for(const match of html.matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]{16})"/g)){
  const file=match[1];if(!fs.existsSync(root+'/'+file))continue;
  assert.equal(digest(source(file,false)).slice(0,16),match[2],'entry cache token '+file);versionedAssets++;
}
const result={passed:true,baseline,unchangedBuildings:unchanged,unchangedInfrastructure:infrastructure,allMechanismsPreserved:true,mechanisms,checkedPhases:phases.length,preservedFiles,releaseEntries:Object.keys(manifest).length,versionedAssets};
fs.mkdirSync(root+'/qa-results/twinstars',{recursive:true});fs.writeFileSync(root+'/qa-results/twinstars/regression.json',JSON.stringify(result,null,2));console.log(result);
