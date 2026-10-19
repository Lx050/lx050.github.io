/* GPU-free release isolation against the published grand-butterfly baseline. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js');
const baseline='7910ab80772cbe494be7d2b5dd3e055aa91056ee';
function source(file,old){return old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file);}
function load(old){
  const c={console};c.window=c;vm.createContext(c);
  for(const name of ['architecture','content-core','nuanling-detail','nuanling-app-detail','editor-detail',...(!old?['rubbing-detail']:[]),'content-creation-care','content-services',...(!old?['twinstars-detail','causal-detail']:[]),'content-narratives','content-literary','moon-snow-garden','infrastructure'])
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
    if(i!==15&&i!==17&&i!==22){assert.equal(shape(a),shape(b),'unchanged geometry/materials at building '+i+', phase '+phase);assert.equal(boxes(a),boxes(b),'unchanged collisions at '+i);}
  }
  if(i!==15&&i!==17&&i!==22){if(i<26)unchanged++;else infrastructure++;}
}
const preservedFiles=['assets/butterfly-crown.js','assets/butterfly-flight.js','assets/content-butterfly.js','assets/models/LM24_Butterfly.glb','assets/readings/22.json','assets/reading-catalog.js','assets/reading-panels.js','assets/building-actions.js','assets/courtyard-runtime.js','garden.html'];
for(const file of preservedFiles)assert.equal(digest(source(file,false)),digest(source(file,true)),'unchanged source '+file);
const html=source('index.html',false).toString(),before=source('index.html',true).toString();
for(const pattern of [/const LINKS = (\[[\s\S]*?\n\]);/,/const TRACKS=(\[[\s\S]*?\n\]);/])assert.equal(html.match(pattern)[1],before.match(pattern)[1],'unchanged entry content');
assert.equal(html,source('island.html',false).toString(),'entry files identical');
assert(html.indexOf('src="assets/rubbing-detail.js?')<html.indexOf('src="assets/content-literary.js?'),'detail loads before its builder');
const manifest=JSON.parse(source('docs/deployment-verify.html',false).toString().match(/const expected=(\{.*?\});/)[1]);
const oldManifest=JSON.parse(source('docs/deployment-verify.html',true).toString().match(/const expected=(\{.*?\});/)[1]);
assert.deepEqual(Object.keys(manifest).sort(),[...Object.keys(oldManifest),'assets/rubbing-detail.js','assets/twinstars-detail.js','assets/causal-detail.js'].sort(),'preserve all release entries and add the new detail');
for(const [file,hash]of Object.entries(manifest))assert.equal(digest(source(file,false)),hash,'release hash '+file);
let versionedAssets=0;
for(const match of html.matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]{16})"/g)){
  const file=match[1];if(!fs.existsSync(root+'/'+file))continue;
  assert.equal(digest(source(file,false)).slice(0,16),match[2],'entry cache token '+file);versionedAssets++;
}
const result={passed:true,baseline,unchangedBuildings:unchanged,unchangedInfrastructure:infrastructure,allMechanismsPreserved:true,mechanisms,checkedPhases:phases.length,preservedFiles,releaseEntries:Object.keys(manifest).length,versionedAssets};
fs.mkdirSync(root+'/qa-results/rubbing',{recursive:true});fs.writeFileSync(root+'/qa-results/rubbing/regression.json',JSON.stringify(result,null,2));console.log(result);
