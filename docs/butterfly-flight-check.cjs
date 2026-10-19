/* Exercise the actual palace geometry and runtime update, without a browser/GPU. */
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js'),html=fs.readFileSync(root+'/index.html','utf8');
const noop=()=>{},canvasContext=new Proxy({createLinearGradient:()=>({addColorStop:noop}),measureText:()=>({width:1})},{get:(o,k)=>o[k]||noop});
const c={renderer:{capabilities:{getMaxAnisotropy:()=>1}},THREE:T,console,document:{createElement:()=>({getContext:()=>canvasContext}),querySelectorAll:()=>[]},$:()=>null,started:false,reduced:false,elapsed:0,skyState:{},worldActive:()=>false,player:{position:new T.Vector3()},scene:new T.Scene(),G:{box:new T.BoxGeometry(1,1,1),cone:new T.ConeGeometry(1,1,8),ring:new T.RingGeometry(.9,1,64)},M:{},WORLD:{WATER_Y:-18},BUTTERFLY:{idlePeriod:12,activePeriod:8},CourtyardButterflyContent:{update:noop},butterflySea:null};
c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(root+'/assets/butterfly-flight.js','utf8'),c);
function range(a,b){return html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)+a.length));}
vm.runInContext(range('function smooth01(', '\nfunction ',),c); // first standalone helper
vm.runInContext(range('function material(', '\nconst M=').split('\nconst ')[0],c);
vm.runInContext(range('function mesh(', '// Shared instance batches'),c);
vm.runInContext(range('function roofSurfaceAt(', 'function finishButterflySea('),c);
vm.runInContext(range('function updateButterflySea(dt', 'function updateButterflySeaReflection('),c);
vm.runInContext(range('function butterflySeaBounds(', '// Normalise from world bounds'),c);
const lm={site:{ux:0,uz:1,groundY:0},entry:{},group:new T.Group()};c.landmarks=[];c.landmarks[23]=lm;c.prepareButterflySea(lm);lm.group.add(lm.butterfly.root);c.installRoofMechanism(lm.butterfly);
const b=lm.butterfly,rig=b.mechanical,f=c.CourtyardButterflyFlight,collisions=JSON.stringify(b.sea.collisions),base=b.root.position.clone();
const snapshot=()=>({height:b.creature.position.y,progress:rig.progress,main:rig.mainAngle,outer:rig.outerAngle});
const initial=snapshot(),samples=[],envelope=c.butterflyFlightBounds(b);let minWing=Infinity;
for(let i=0;i<1440;i++){
 c.updateButterflySea(1/60,lm);
 if(i%60===0){samples.push(snapshot());b.root.updateMatrixWorld(true);for(const skin of rig.skins){skin.geometry.computeBoundingBox();const p=skin.geometry.attributes.position;for(let k=0;k<p.count;k++){const v=new T.Vector3().fromBufferAttribute(p,k).applyMatrix4(skin.matrixWorld);minWing=Math.min(minWing,v.y-lm.group.position.y);assert(envelope.containsPoint(v),"flight within framing envelope");}}}
 assert(b.creature.position.y>=f.minHeight&&b.creature.position.y<=f.maxHeight);
 assert.equal(b.creature.position.x,0);assert.equal(b.creature.position.z,0);
 assert(rig.progress>=0&&rig.progress<=1);assert(rig.mainAngle>=0&&rig.mainAngle<=22);assert(rig.outerAngle>=0&&rig.outerAngle<=18);
 for(const l of rig.links)assert(Number.isFinite(l.length)&&l.rod.scale.y>0&&l.barrel.scale.y>0);
}
assert(Math.max(...samples.map(x=>x.height))-Math.min(...samples.map(x=>x.height))>2);
assert(Math.max(...samples.map(x=>x.main))-Math.min(...samples.map(x=>x.main))>10);
assert(minWing>3,'wing envelope stays above walkers: '+minWing);assert(b.root.position.equals(base));assert.equal(JSON.stringify(b.sea.collisions),collisions);
assert.equal(b.root.getObjectByName('unbroken-altar-deck').position.y,.02);assert.equal(b.root.getObjectByName('four-dark-stone-cloister-walks').parent,b.root);
const saved=JSON.stringify(snapshot());c.reduced=true;for(let i=0;i<120;i++)c.updateButterflySea(1/60,lm);assert.equal(JSON.stringify(snapshot()),saved,'reduced motion freezes pose');c.reduced=false;
c.setRoofState('closed');const height=b.creature.position.y;for(let i=0;i<300;i++)c.updateButterflySea(.1,lm);assert(rig.locked);assert.equal(rig.progress,1);assert.equal(b.creature.position.y,height);
b.flight.enabled=true;for(let i=0;i<240;i++)c.updateButterflySea(1/60,lm);assert.notEqual(rig.progress,1);
const flight=f.create();for(let i=0;i<100000;i++)f.step(flight,.1,false);assert(flight.time>=0&&flight.time<f.period);assert(flight.height>=f.minHeight&&flight.height<=f.maxHeight);
for(const dt of [NaN,Infinity,-1]){const t=flight.time;f.step(flight,dt,false);assert.equal(flight.time,t)}
assert(html.includes('b.reflectionClone.matrix.copy(b.creature.matrixWorld)'),'reflection tracks body');assert(html.includes('p.y+c.h+CourtyardButterflyFlight.maxHeight'),'camera collision vertical envelope');assert.equal(html,fs.readFileSync(root+'/island.html','utf8'));
const out=root+'/qa-results/butterfly';fs.mkdirSync(out,{recursive:true});
const result={passed:true,initial,samples,minWingHeight:minWing,joints:rig.joints.length,links:rig.links.length,collisionsUnchanged:true,reducedMotionFrozen:true,manualControls:true,noDriftSteps:100000,browserTested:false};fs.writeFileSync(out+'/flight-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
// Exact runtime geometry for an honest offline visualization, not browser QA.
if(process.env.EXPORT_BUTTERFLY){for(const [label,time] of [['down',9],['up',3]]){b.flight.time=time;c.updateButterflySea(0,lm);for(let i=0;i<200;i++)c.updateRoofMechanism(b,.1);b.root.updateMatrixWorld(true);const rows=[];b.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index,m=new T.Matrix4();for(let k=0;k<(o.isInstancedMesh?o.count:1);k++){m.copy(o.matrixWorld);if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(k,im);m.multiply(im)}const verts=[];for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m);b.root.worldToLocal(v);verts.push([v.x,-v.z,v.y])}const faces=[];for(let i=0;i<(idx?idx.count:p.count);i+=3)faces.push([0,1,2].map(n=>idx?idx.getX(i+n):i+n));rows.push({name:o.name,verts,faces,color:o.material.color?.toArray()||[.4,.5,.5],opacity:o.material.opacity,roughness:o.material.roughness,metalness:o.material.metalness})}});fs.writeFileSync(out+'/'+label+'.json',JSON.stringify(rows))}}
