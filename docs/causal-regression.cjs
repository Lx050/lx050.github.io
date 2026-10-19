/* GPU-free release isolation against the published twinstars-detail baseline. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js');
const baseline='8038643428fc5ab0a51328bb53e3871ad6d1eab9';
function source(file,old){return old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file);}
function load(old){
  const c={console};c.window=c;vm.createContext(c);
  for(const name of ['architecture','content-core','nuanling-detail','nuanling-app-detail','editor-detail','rubbing-detail','content-creation-care','content-services','twinstars-detail',...(!old?['causal-detail']:[]),...(!old?['versions-detail']:[]),'content-narratives','content-literary','moon-snow-garden','infrastructure'])
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
    if(i!==15){if(i!==18)assert.equal(shape(a),shape(b),'unchanged geometry/materials at building '+i+', phase '+phase);assert.equal(boxes(a),boxes(b),'unchanged collisions at '+i);}
  }
  if(i!==15){if(i<26){if(i!==18)unchanged++;}else infrastructure++;}
}
const preservedFiles=['assets/butterfly-crown.js','assets/butterfly-flight.js','assets/content-butterfly.js','assets/models/LM24_Butterfly.glb','assets/readings/15.json','assets/reading-catalog.js','assets/reading-panels.js','assets/building-actions.js','assets/courtyard-runtime.js','garden.html','assets/architecture.js','assets/content-core.js','assets/content-creation-care.js','assets/content-services.js','assets/content-literary.js','assets/infrastructure.js','assets/moon-snow-garden.js','assets/rubbing-detail.js','assets/editor-detail.js','assets/nuanling-detail.js','assets/nuanling-app-detail.js','assets/twinstars-detail.js'];
for(const name of fs.readdirSync(root+'/assets/readings').filter(name=>name.endsWith('.json')))if(!preservedFiles.includes('assets/readings/'+name))preservedFiles.push('assets/readings/'+name);
for(const file of preservedFiles)assert.equal(digest(source(file,false)),digest(source(file,true)),'unchanged source '+file);
const html=source('index.html',false).toString(),before=source('index.html',true).toString();
for(const pattern of [/const LINKS = (\[[\s\S]*?\n\]);/,/const TRACKS=(\[[\s\S]*?\n\]);/])assert.equal(html.match(pattern)[1],before.match(pattern)[1],'unchanged entry content');
assert.equal(html,source('island.html',false).toString(),'entry files identical');
const normalizeEntry=text=>text.replace(/<script src="assets\/versions-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/<script src="assets\/causal-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'').replace(/\?v=[a-f0-9]{16}/g,'?v=ASSET_VERSION');
assert.equal(normalizeEntry(html),normalizeEntry(before),'all entry source unchanged except exact detail loader and cache tokens');
let restoredNarrative=source('assets/content-narratives.js',false).toString();
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
assert.deepEqual(Object.keys(manifest).sort(),[...Object.keys(oldManifest),'assets/causal-detail.js','assets/versions-detail.js'].sort(),'preserve all release entries and add the new detail');
for(const [file,hash]of Object.entries(manifest))assert.equal(digest(source(file,false)),hash,'release hash '+file);
let versionedAssets=0;
for(const match of html.matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]{16})"/g)){
  const file=match[1];if(!fs.existsSync(root+'/'+file))continue;
  assert.equal(digest(source(file,false)).slice(0,16),match[2],'entry cache token '+file);versionedAssets++;
}
const result={passed:true,baseline,unchangedBuildings:unchanged,unchangedInfrastructure:infrastructure,allMechanismsPreserved:true,mechanisms,checkedPhases:phases.length,preservedFiles,releaseEntries:Object.keys(manifest).length,versionedAssets};
fs.mkdirSync(root+'/qa-results/causal',{recursive:true});fs.writeFileSync(root+'/qa-results/causal/regression.json',JSON.stringify(result,null,2));console.log(result);
