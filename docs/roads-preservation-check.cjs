/* Pin every unrelated production file and stable behavior to the approved
 * pre-road main b9975f4. Old source/geometry fixtures remain untouched. */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert/strict'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),base='b9975f4128f1de2df4276aab83772a06aef6c74f';
const git=(...args)=>cp.execFileSync('git',['-C',root,...args],{maxBuffer:128*1024*1024});
const old=f=>git('show',base+':'+f),now=f=>fs.readFileSync(path.join(root,f));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const tracked=git('ls-tree','-r','--name-only',base).toString().trim().split('\n');
const allowed=new Set(['index.html','island.html','assets/courtyard-masterplan.js','docs/deployment-verify.html']);
let pinned=0;
for(const f of tracked){if(allowed.has(f))continue;assert.equal(hash(now(f)),hash(old(f)),'unchanged inherited file '+f);pinned++;}
const html=now('index.html').toString(),prior=old('index.html').toString();assert.equal(html,now('island.html').toString());
function span(s,a,b){let i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,a+' source boundaries');return s.slice(i,j);}
const blocks=[
 ['world constants, complete links and building site positions','const WORLD=Object.freeze(','const $ = id => document.getElementById(id);'],
 ['original walker, jump and collision solver','function move(dt){','function updateLandmarks(dt){'],
 ['avatar inscription sightlines','const avatarMeshes=','// ===== GLB 精建模型'],
 ['modal input cancellation','function clearInput(){','function showDirectory(){'],
 ['mobile input and controls','let joyPointer=','window.addEventListener(\'resize\',resize);resize();'],
 ['camera collision','function subjectBounds(){','function updateCamera(dt){'],
 ['first-person camera','function stepOrbit(','const labelWorld='],
 ['reading contents, world ownership and transition','// ===== Wave2B: scene ownership','const gardenWeather=']
];
for(const[name,a,b]of blocks)assert.equal(span(html,a,b),span(prior,a,b),'preserved '+name);
// Only shared-layout extraction and actual support metadata/floor are allowed.
// Runtime acceptance additionally pins the complete butterfly mesh fingerprint.
const oldSeaLine='const sea=butterflySea={x:ux*330,z:uz*330,ux,uz,radius:56,y:-14.4,start:139,end:276,startY:old.groundY,cameraBoxes:[],collisions:[]};';
const metadata="  // Read the top planes of the EXISTING Float32 box instances. Their tilted\n  // ends are not the old 30cm analytical cap, and do not create invisible floor.\n  sea.deckSamples=deck.map(matrix=>{\n    const actual=new THREE.Matrix4().fromArray(new Float32Array(matrix.elements));\n    const a=new THREE.Vector3(0,.5,-.5).applyMatrix4(actual),b=new THREE.Vector3(0,.5,.5).applyMatrix4(actual);\n    return {lo:a.x*ux+a.z*uz,hi:b.x*ux+b.z*uz,yLo:a.y,yHi:b.y};\n  });\n";
assert(html.includes(metadata),'exact Float32 slab support metadata');
const support=span(html,'function butterflySeaSurface(x,z){','function butterflyFlightBounds(b){');
assert(support.includes('if(before&&after&&after.lo-before.hi<.05)'),'internal joints only');
assert(!support.includes('s.start-.3'),'no invisible exterior cap');
const normalizedButterfly=span(html,'function prepareButterflySea(lm){','function placeMonument(glb,group,').replace(metadata,'').replace(support,span(prior,'function butterflySeaSurface(x,z){','function butterflyFlightBounds(b){'));
const expectedButterfly=span(prior,'function prepareButterflySea(lm){','function placeMonument(glb,group,')
 .replace(oldSeaLine,'const sea=butterflySea=butterflySeaLayout(old);')
 .replace('function butterflySeaDeck(r){const s=butterflySea,t=', 'function butterflySeaDeck(r,s=butterflySea){const t=');
assert.equal(normalizedButterfly,expectedButterfly,'all butterfly assembly, geometry and controls preserved outside tested floor support');
assert.equal(span(html,'const MATH_ISLES=[','let bridge8Open=false;'),span(prior,'const MATH_ISLES=[','let bridge8Open=false;'),'bridge/island definitions only move earlier');
const layoutSource=html.match(/^function butterflySeaLayout\(old\)\{.*$/m)[0];
const seaContext={};vm.createContext(seaContext);vm.runInContext(layoutSource+'this.value=butterflySeaLayout({ux:.2,uz:-.9,groundY:1.2});',seaContext);
assert.deepEqual(JSON.parse(JSON.stringify(seaContext.value)),{x:66,z:-297,ux:.2,uz:-.9,radius:56,y:-14.4,start:139,end:276,startY:1.2,cameraBoxes:[],collisions:[]});
// No UI, text or CSS changes; additions are source modules and the existing map canvas.
assert.equal(html.slice(0,html.indexOf('<script src="vendor/three.min.js')),prior.slice(0,prior.indexOf('<script src="vendor/three.min.js')));
const world={THREE:require(path.join(root,'vendor/three.min.js'))};vm.createContext(world);vm.runInContext(span(html,'const WORLD=Object.freeze(','const $ = id => document.getElementById(id);')+';this.data={WORLD,LINKS,terraceSites};',world);assert.equal(world.data.LINKS.length,26);
for(const m of html.matchAll(/src="([^"?]+)\?v=([a-f0-9]{16})"/g))assert.equal(hash(now(m[1])).slice(0,16),m[2],'cache '+m[1]);
for(const file of [...tracked.filter(f=>f.startsWith('assets/')&&f.endsWith('.js')),'assets/road-surface.js','assets/courtyard-roads.js','assets/road-scenery.js'].filter(f=>fs.existsSync(path.join(root,f))))new vm.Script(now(file).toString(),{filename:file});
for(const m of html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const manifest=JSON.parse(now('docs/deployment-verify.html').toString().match(/const expected=(\{.*?\});/)[1]);
for(const[f,h]of Object.entries(manifest))assert.equal(hash(now(f)),h,'publication '+f);
for(const f of ['assets/road-surface.js','assets/courtyard-roads.js','assets/road-scenery.js','assets/courtyard-masterplan.js','index.html','island.html'])assert(manifest[f],'manifest includes '+f);
const report={passed:true,baseline:base,pinnedInheritedFiles:pinned,unchangedTests:tracked.filter(f=>f.startsWith('docs/')&&f.endsWith('.cjs')).length,stableBlocks:blocks.map(b=>b[0]),completeDestinationRecords:world.data.LINKS.length,manifestEntries:Object.keys(manifest).length};
fs.mkdirSync(path.join(root,'qa-results/roads'),{recursive:true});fs.writeFileSync(path.join(root,'qa-results/roads/preservation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
