/* Independent CPU audit of actual production building 20: the published reading garden. Baseline:
   7be2e7b9fcba939ebc9c70a5e363a6bd84ee59a7. Verifies actual runtime solids and all retained content.
   This does not run a browser, navigation controls, GPU frames or structural analysis. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js'),out=root+'/qa-results/moonsnow';fs.mkdirSync(out,{recursive:true});
const baseline='7be2e7b9fcba939ebc9c70a5e363a6bd84ee59a7';
function load(old){
 const c={console,document:{createElement(){const canvas={width:0,height:0,operations:[]};canvas.getContext=()=>new Proxy({measureText:t=>({width:String(t).length*10}),createLinearGradient:()=>({addColorStop(...args){canvas.operations.push(['addColorStop',...args]);}})},{get:(o,k)=>o[k]||((...args)=>canvas.operations.push([k,...args])),set:(o,k,v)=>{canvas.operations.push(['set',k,v]);o[k]=v;return true;}});return canvas;}}};c.window=c;vm.createContext(c);
 for(const n of [...(!old?['vault-detail','rss-detail']:[]),'architecture','content-core',...(!old&&fs.existsSync(root+'/assets/moonsnow-detail.js')?['moonsnow-detail']:[]),'content-literary','moon-snow-garden','reading-catalog','reading-panels']){const file='assets/'+n+'.js',source=old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{encoding:'utf8',maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file,'utf8');vm.runInContext(source,c,{filename:file});}return c;
}
const now=load(false),old=load(true),build=c=>c.CourtyardArchitecture.build({THREE:T,index:20,title:'月雪',zone:0});
const b=build(now),before=build(old),detail=b.root.getObjectByName('moonsnow-blender-static');
const extra=o=>{for(let p=o;p;p=p.parent)if(p.name==='moonsnow-blender-static')return true;return false;};
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function materialState(m){return{type:m.type,color:m.color?.toArray(),emissive:m.emissive?.toArray(),emissiveIntensity:m.emissiveIntensity,opacity:m.opacity,metalness:m.metalness,roughness:m.roughness,side:m.side,transparent:m.transparent,depthTest:m.depthTest,depthWrite:m.depthWrite,alphaTest:m.alphaTest,blending:m.blending,vertexColors:m.vertexColors,wireframe:m.wireframe,map:m.map?{type:m.map.type,width:m.map.image?.width,height:m.map.image?.height,canvasOperations:m.map.image?.operations,dataSha256:m.map.image?.data?crypto.createHash('sha256').update(Buffer.from(m.map.image.data.buffer,m.map.image.data.byteOffset,m.map.image.data.byteLength)).digest('hex'):null,wrapS:m.map.wrapS,wrapT:m.map.wrapT,minFilter:m.map.minFilter,magFilter:m.map.magFilter,generateMipmaps:m.map.generateMipmaps,flipY:m.map.flipY,repeat:m.map.repeat.toArray(),offset:m.map.offset.toArray(),encoding:m.map.encoding}:null};}
function eachMesh(building,fn){building.root.updateMatrixWorld(true);building.root.traverse(o=>{if(!o.isMesh)return;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const instance=new T.Matrix4();o.getMatrixAt(i,instance);matrix.multiply(instance);}fn(o,matrix,i);}});}
function originalState(building){const rows=[];eachMesh(building,(o,matrix,i)=>{if(extra(o))return;rows.push({name:o.name,instance:i,attrs:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,{itemSize:a.itemSize,normalized:a.normalized,array:Array.from(a.array)}])),index:o.geometry.index?Array.from(o.geometry.index.array):null,groups:o.geometry.groups,matrix:matrix.toArray(),materials:(Array.isArray(o.material)?o.material:[o.material]).map(materialState),visible:o.visible,ancestors:(()=>{const a=[];for(let p=o.parent;p;p=p.parent)a.push({name:p.name,visible:p.visible,matrix:p.matrix.toArray()});return a;})(),castShadow:o.castShadow,receiveShadow:o.receiveShadow});});return rows;}
function trianglesOf(building,predicate=()=>true){const all=[];eachMesh(building,(o,matrix,i)=>{if(!predicate(o))return;const p=o.geometry.attributes.position,index=o.geometry.index;for(let j=0;j<(index?index.count:p.count);j+=3){const points=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index?index.getX(j+k):j+k).applyMatrix4(matrix));all.push({points,triangle:new T.Triangle(...points),box:new T.Box3().setFromPoints(points),name:o.name,instance:i,object:o});}});return all;}
// Export the actual production assembly with its address plaque and actual production reading surfaces.
const reading=now.CourtyardReadingPanels.attach({THREE:T,building:b,index:20,preview:now.CourtyardReadingCatalog[20]});
const oldReading=old.CourtyardReadingPanels.attach({THREE:T,building:before,index:20,preview:old.CourtyardReadingCatalog[20]});assert(reading&&oldReading);
// Unframed production walls allocate their Canvas only when a visitor is near.
// Activate both real reading faces before every capture, not an empty-material proxy.
for(const controller of[reading,oldReading]){controller.update({x:0,y:1.65,z:0});assert(controller.faces.every(f=>f.material.map?.image?.operations?.some(op=>op[0]==='fillText')),'all four original integrated inscription Canvases are populated');}
const initialReadingPlacement=JSON.parse(JSON.stringify(b.metadata.readingPanels.placement));
for(const m of b.mechanisms)m.articulate(.5);const meshes=[];
eachMesh(b,(o,matrix)=>{const p=o.geometry.attributes.position,index=o.geometry.index,m=Array.isArray(o.material)?o.material[0]:o.material,verts=[],faces=[];for(let j=0;j<p.count;j++){const v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(matrix);verts.push([v.x,-v.z,v.y]);}for(let j=0;j<(index?index.count:p.count);j+=3)faces.push(index?[index.getX(j),index.getX(j+1),index.getX(j+2)]:[j,j+1,j+2]);meshes.push({name:o.name,verts,faces,color:m.color.toArray(),opacity:m.opacity,metalness:m.metalness,roughness:m.roughness});});
fs.writeFileSync(out+'/runtime-assembly.json',JSON.stringify(meshes));console.log('CPU runtime assembly exported:',meshes.length,'meshes/instances; canvas texture pixels are not rendered');

if(process.argv.includes('--export-only'))process.exit(0);
const key=v=>v.toArray().map(x=>x.toFixed(5)).join(',');
function components(mesh){const faces=[],lookup=new Map(),p=mesh.geometry.attributes.position,index=mesh.geometry.index;for(let i=0;i<(index?index.count:p.count);i+=3){const face=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld)),id=faces.length;faces.push(face);for(const v of face){const k=key(v);if(!lookup.has(k))lookup.set(k,[]);lookup.get(k).push(id);}}const seen=new Set(),result=[];for(let i=0;i<faces.length;i++){if(seen.has(i))continue;const q=[i],part=[];seen.add(i);while(q.length){const j=q.pop();part.push(faces[j]);for(const v of faces[j])for(const n of lookup.get(key(v)))if(!seen.has(n)){seen.add(n);q.push(n);}}result.push({faces:part,bounds:new T.Box3().setFromPoints(part.flat())});}return result;}
function topology(s,genus=0){const vertices=new Map(),edges=new Map();let volume=0;for(const[a,b,c]of s.faces){volume+=a.dot(b.clone().cross(c))/6;for(const v of[a,b,c])vertices.set(key(v),v);for(const[u,v]of[[a,b],[b,c],[c,a]]){const ku=key(u),kv=key(v),k=[ku,kv].sort().join('|'),e=edges.get(k)||{count:0,direction:0};e.count++;e.direction+=ku<kv?1:-1;edges.set(k,e);}}for(const e of edges.values()){assert.equal(e.count,2,'closed manifold edge');assert.equal(e.direction,0,'consistent face winding');}assert.equal(vertices.size-edges.size+s.faces.length,2-2*genus,'closed solid genus '+genus);assert(volume>1e-8,'outward positive volume');if(genus===0)for(const face of s.faces){const normal=new T.Triangle(...face).getNormal(new T.Vector3());for(const v of vertices.values())assert(normal.dot(v.clone().sub(face[0]))<8e-5,'actual closed convex surface, no folded or crossing faces');}return{vertices:[...vertices.values()],vertexCount:vertices.size,edgeCount:edges.size,triangles:s.faces.length,volume};}
function containsSolid(s,p){if(!s.bounds.containsPoint(p))return false;const ray=new T.Ray(p,new T.Vector3(.127,.319,.939).normalize()),distances=[];for(const f of s.faces){const hit=ray.intersectTriangle(...f,false,new T.Vector3());if(hit){const d=hit.distanceTo(p);if(!distances.some(x=>Math.abs(x-d)<1e-5))distances.push(d);}}return distances.length%2===1;}
const originals=[];eachMesh(before,(object,matrix,instance)=>{object.geometry.computeBoundingBox();originals.push({object,matrix,instance,localBox:object.geometry.boundingBox,box:object.geometry.boundingBox.clone().applyMatrix4(matrix),center:new T.Vector3().setFromMatrixPosition(matrix)});});
const containsOriginal=(o,p)=>o.localBox.containsPoint(p.clone().applyMatrix4(o.matrix.clone().invert()));
function clipTriangle(face,box){let poly=face.map(v=>v.clone());for(const axis of['x','y','z'])for(const[limit,sign]of[[box.min[axis],1],[box.max[axis],-1]]){const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=sign*(a[axis]-limit),db=sign*(b[axis]-limit);if(da>=-1e-8)next.push(a);if((da<0)!==(db<0))next.push(a.clone().lerp(b,da/(da-db)));}poly=next;if(!poly.length)return[];}return poly;}
// Independently bounded, approved 1mm repair of baseline coplanar paving.
const pavingSpecs=[[0,0,3.6,20.8,1],[-3.25,-7.8,1.8,5,1],[-5.45,-6.17,6.2,1.62,0],[-7.7,-2.05,2.35,8.1,1],[-5.48,1.28,6.4,1.65,0],[-3.25,5.45,1.75,7.25,1],[0,3.45,8.25,1.55,0],[3.42,4.28,1.34,10.95,1],[8.22,4.28,1.34,10.95,1],[5.82,-.78,6.1,1.45,0],[5.82,8.68,6.1,1.38,0],[5.82,4.9,6.1,1.3,0],[-5.43,8.64,6.45,1.38,0]],liftedIndices=new Map(),pavingProofs=[];
const baselineState=originalState(before),currentOriginals=[];eachMesh(b,(o,matrix,i)=>{if(extra(o))return;o.geometry.computeBoundingBox();currentOriginals.push({object:o,matrix,instance:i,box:o.geometry.boundingBox.clone().applyMatrix4(matrix)});});
for(const [x,z,w,d,lift]of pavingSpecs){
 const paving=oldAt([x,.027,z],[w,.035,d]),row=originals.indexOf(paving),joints=[];
 if(lift)liftedIndices.set(row,'paving');
 for(let zz=z-d/2+.65;zz<z+d/2;zz+=.73){const joint=oldAt([x,.046,zz],[w-.04,.006,.014]),i=originals.indexOf(joint);if(lift)liftedIndices.set(i,'paving-joint');joints.push(i);assert(Math.abs((currentOriginals[i].matrix.elements[13]-currentOriginals[row].matrix.elements[13])-.019)<1e-8,'all transverse joints retain relative height');}
 pavingProofs.push({center:[x,z],size:[w,d],lift:lift*.001,originalIndex:row,jointIndices:joints,oldTop:paving.box.max.y,newTop:currentOriginals[row].box.max.y});
}
const pavingOverlaps=[];for(let i=0;i<pavingProofs.length;i++)for(let j=i+1;j<pavingProofs.length;j++){
 const a=originals[pavingProofs[i].originalIndex].box,c=originals[pavingProofs[j].originalIndex].box,dx=Math.min(a.max.x,c.max.x)-Math.max(a.min.x,c.min.x),dz=Math.min(a.max.z,c.max.z)-Math.max(a.min.z,c.min.z);
 if(dx>1e-6&&dz>1e-6){assert(Math.abs(a.max.y-c.max.y)<1e-8,'baseline actual overlapping tops are coplanar');const separation=Math.abs(pavingProofs[i].newTop-pavingProofs[j].newTop);assert(Math.abs(separation-.001)<1e-8,'all true original top overlaps separated by 1mm');pavingOverlaps.push({first:i,second:j,overlapArea:dx*dz,separation});}
}
let minimumLiftCount=Infinity;for(let mask=0;mask<(1<<pavingSpecs.length);mask++){const count=mask.toString(2).replace(/0/g,'').length;if(count>=minimumLiftCount)continue;if(pavingOverlaps.every(e=>Boolean(mask&(1<<e.first))!==Boolean(mask&(1<<e.second))))minimumLiftCount=count;}assert.equal(minimumLiftCount,6,'independently minimal two-level overlap coloring');
assert.equal(pavingOverlaps.length,14);assert.equal(pavingProofs.filter(p=>p.lift).length,6);assert.equal(liftedIndices.size,91,'exactly six paving slabs and 85 accompanying joints');
function normalizedOriginalState(building){const rows=originalState(building);if(building!==b)return rows;for(const [i,kind]of liftedIndices){assert(Math.abs(rows[i].matrix[13]-baselineState[i].matrix[13]-.001)<1e-8,'only exact approved 1mm '+kind+' lift');rows[i].matrix[13]=baselineState[i].matrix[13];}return rows;}
// Compare the actual published production garden, not the shadowed literary builder.
const phases=[0,.25,.5,.75,1,.4,0,1],carrier=b.root.getObjectByName('sliding-leak-window-screen');
assert(carrier&&carrier.children.length===9,'nine original rigid lattice meshes');
const collisionState=x=>JSON.stringify(x.collisionBoxes.map(q=>[q.min.toArray(),q.max.toArray(),q.userData]));
assert.equal(collisionState(b),collisionState(before));
for(const k of Object.keys(before.metadata).filter(k=>!['bounds','pieces','staticDrawCalls'].includes(k)))assert.equal(JSON.stringify(b.metadata[k]),JSON.stringify(before.metadata[k]),'original metadata '+k);
assert.equal(JSON.stringify(b.mechanisms.map(m=>({name:m.name,kind:m.kind}))),JSON.stringify(before.mechanisms.map(m=>({name:m.name,kind:m.kind}))));assert.equal(b.mechanisms.length,1);
function originalSceneState(building){const rows=[];building.root.traverse(o=>{if(extra(o))return;rows.push({type:o.type,name:o.name,visible:o.visible,matrix:o.matrix.toArray(),color:o.color?.toArray(),intensity:o.intensity,distance:o.distance,decay:o.decay,castShadow:o.castShadow});});return rows;}
const originalPoseProofs=[];
for(const phase of phases){
 for(const x of[b,before])for(const m of x.mechanisms)m.articulate(phase);
 const sha256=hash(normalizedOriginalState(b));assert.equal(sha256,hash(normalizedOriginalState(before)),'every original geometry/material/transform/Canvas at phase '+phase);assert.equal(collisionState(b),collisionState(before));
 assert.deepEqual(carrier.scale.toArray(),[1,1,1]);assert.deepEqual(carrier.rotation.toArray().slice(0,3),[0,0,0]);assert.equal(carrier.position.x,-9.08);assert.equal(carrier.position.y,1.81);assert(Math.abs(carrier.position.z-(-2.49+1.02*phase))<1e-12,'exact original translation law');
 const sceneSha256=hash(originalSceneState(b));assert.equal(sceneSha256,hash(originalSceneState(before)),'all original scene nodes and lights unchanged');originalPoseProofs.push({phase,normalizedOriginalSha256:sha256,rawOriginalSha256:hash(originalState(b)),sceneSha256});
}
const sourceHashes={};
const baselineSource=file=>cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{maxBuffer:32*1024*1024});
const readingFiles=cp.execFileSync('git',['-C',root,'ls-tree','-r','--name-only',baseline,'assets/readings'],{encoding:'utf8'}).trim().split('\n');
for(const file of[...readingFiles,'assets/architecture.js','assets/content-core.js','assets/content-literary.js','assets/reading-catalog.js','assets/reading-panels.js','docs/content-map.json']){
 const bytes=fs.readFileSync(root+'/'+file);assert((file==='assets/architecture.js'?require('./rss-source-normalizer.js').restoreSource(bytes):bytes).equals(baselineSource(file)),'entire original source byte identity '+file);sourceHashes[file]=crypto.createHash('sha256').update(bytes).digest('hex');
}
const gardenFile='assets/moon-snow-garden.js',gardenSource=fs.readFileSync(root+'/'+gardenFile,'utf8'),oldGarden=baselineSource(gardenFile).toString();
// The explicit additive hook is the only allowed change to the published garden.
const hook='    global.CourtyardMoonsnowDetail.attach(b);\n';
const floorSourcePairs=[
["    function paving(x, z, w, d, material) {","    function paving(x, z, w, d, material, lift = 0) {"],
["x, .027, z, w, .035, d, null, true);","x, .027 + lift, z, w, .035, d, null, true);"],
["x, .046, zz, w - .04, .006, .014, null, true);","x, .046 + lift, zz, w - .04, .006, .014, null, true);"],
["paving(0, 0, 3.6, depth, 'chalk');","paving(0, 0, 3.6, depth, 'chalk', .001);"],
["paving(-3.25, -7.8, 1.8, 5.0);","paving(-3.25, -7.8, 1.8, 5.0, null, .001);"],
["paving(-7.7, -2.05, 2.35, 8.1, 'masonry');","paving(-7.7, -2.05, 2.35, 8.1, 'masonry', .001);"],
["paving(-3.25, 5.45, 1.75, 7.25);","paving(-3.25, 5.45, 1.75, 7.25, null, .001);"],
["paving(3.42, 4.28, 1.34, 10.95);","paving(3.42, 4.28, 1.34, 10.95, null, .001);"],
["paving(8.22, 4.28, 1.34, 10.95);","paving(8.22, 4.28, 1.34, 10.95, null, .001);"]];
let withoutHook=gardenSource.replace(hook,'');for(const [original,changed]of floorSourcePairs){assert.equal(withoutHook.split(changed).length,2,'exactly one approved floor source change');withoutHook=withoutHook.replace(changed,original);}
if(!detail)assert.equal(gardenSource,oldGarden,'unchanged published garden source before attachment');
sourceHashes[gardenFile]={baseline:crypto.createHash('sha256').update(oldGarden).digest('hex'),current:crypto.createHash('sha256').update(gardenSource).digest('hex')};
const readingFile='assets/readings/20.json',readingSource=JSON.parse(fs.readFileSync(root+'/'+readingFile,'utf8'));
assert.equal(sourceHashes[readingFile],'670c911abb8d146aee49ba257fb887d53f94fe3ea1ebb672d9105d5bb1ab0fe2');
assert.equal(readingSource.coverage,'anonymized');assert.equal(readingSource.source,null);assert.equal(readingSource.sections.length,12);assert(readingSource.sections.every(s=>s.source===null));
assert.equal(reading.faces.length,4);assert(reading.integrated);assert(initialReadingPlacement.every(p=>p.kind==='integrated'));
assert.equal(b.metadata.sourceSectionsReviewed.length,12);assert.equal(b.metadata.readingAnchors.length,12);assert.equal(b.metadata.visitorRoutes.length,6);
const readingDrawProofs=[];
function verifyReading(label){assert.equal(hash(normalizedOriginalState(b)),hash(normalizedOriginalState(before)),label+' entire active original state');const draw=reading.faces.map(face=>face.material.map.image.operations.filter(op=>op[0]==='fillText'));assert(draw.every(ops=>ops.length>0));readingDrawProofs.push({label,faces:draw.map(ops=>({drawCalls:ops.length,sha256:hash(ops)}))});}
verifyReading('initial authored integrated inscriptions');
for(const phase of[0,1,2]){reading.setPhase(phase);oldReading.setPhase(phase);verifyReading('reading phase '+phase);}
assert.equal(now.CourtyardReadingCatalog[20].sections.length,12);
for(const section of now.CourtyardReadingCatalog[20].sections){assert(reading.setSection(section.id));assert(oldReading.setSection(section.id));verifyReading('reading section '+section.id);}
const routes=[{name:'entire original 3.6m central through route',radius:1.8,endMargin:0,points:[[0,-10.4],[0,10.4]]},...JSON.parse(JSON.stringify(before.metadata.visitorRoutes)).map(r=>({...r,radius:r.bodyRadius}))];
const actual=trianglesOf(b);let bodyTriangleChecks=0,bodyCollisionChecks=0,bodySegments=0;
function verifyBodyBox(label,box,inverse=new T.Matrix4()){
 for(const t of actual){assert(!box.intersectsTriangle(new T.Triangle(...t.points.map(v=>v.clone().applyMatrix4(inverse)))),'whole body/headroom '+label+' '+JSON.stringify({name:t.name,instance:t.instance,points:t.points.map(v=>v.toArray())}));bodyTriangleChecks++;}
 for(const collision of b.collisionBoxes){
  if(collision.min.y>=box.max.y||collision.max.y<=box.min.y)continue;
  const center=collision.getCenter(new T.Vector3()),size=collision.getSize(new T.Vector3()),geom=new T.BoxGeometry(1,1,1),matrix=new T.Matrix4().compose(center,new T.Quaternion(),size).premultiply(inverse),p=geom.attributes.position,index=geom.index;
  assert(!collision.containsPoint(box.getCenter(new T.Vector3()).applyMatrix4(inverse.clone().invert())),'route not enclosed by original collider');
  for(let j=0;j<index.count;j+=3)assert(!box.intersectsTriangle(new T.Triangle(...[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index.getX(j+k)).applyMatrix4(matrix)))),'entire physical collider/body '+label+' '+collision.userData?.part);
  geom.dispose();bodyCollisionChecks++;
 }
}
for(const route of routes)for(let i=1;i<route.points.length;i++){
 const a=route.points[i-1],end=route.points[i],dx=end[0]-a[0],dz=end[1]-a[1],length=Math.hypot(dx,dz),inverse=new T.Matrix4().makeRotationY(Math.atan2(dx,dz));inverse.setPosition(a[0],0,a[1]);inverse.invert();const endMargin=route.endMargin??route.radius;
 verifyBodyBox(route.name,new T.Box3(new T.Vector3(-route.radius,.15,-endMargin),new T.Vector3(route.radius,2.4,length+endMargin)),inverse);bodySegments++;
}
const fullPassages=[
 {name:'complete original side entry including stone-foot projections',nominalPlasterWidth:1.77,actualBodyWidth:1.74,min:[-4.465,.15,-7.97],max:[-2.725,2.4,-7.47]},
 {name:'complete equal inner study path',nominalWidth:1.34,min:[2.75,.15,-.8],max:[4.09,2.4,8.65]},
 {name:'complete equal outer study path',nominalWidth:1.34,min:[7.55,.15,-.8],max:[8.89,2.4,8.65]},
 {name:'ordinary study return across the central axis',nominalWidth:.76,min:[-.38,.15,8.27],max:[6.225,2.4,9.03]}
];
for(const field of fullPassages){const box=new T.Box3(new T.Vector3(...field.min),new T.Vector3(...field.max));box.min.x+=1e-5;box.max.x-=1e-5;verifyBodyBox(field.name,box);bodySegments++;}
if(process.argv.includes('--original-only')){const result={passed:true,building:20,baseline,productionBuilder:'assets/moon-snow-garden.js',originalMeshes:originalState(before).length,originalPoseProofs,readingDrawProofs,sourceHashes,bodySegments,bodyTriangleChecks,bodyCollisionChecks,routes,fullPassages};fs.writeFileSync(out+'/original-checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,originalMeshes:result.originalMeshes,bodySegments,bodyTriangleChecks,bodyCollisionChecks}));process.exit(0);}
assert(detail&&detail.parent===b.root,'additive moonsnow detail attached by production builder');
assert.equal(b.width,before.width);assert.equal(b.depth,before.depth);assert.equal(detail.children.length,2,'two shared material batches');
const fixed=trianglesOf(b,extra);assert(fixed.length>0&&fixed.length<3000,'strict sub-3000 triangle addition');
for(const t of fixed)assert(t.triangle.getArea()>1e-9,'nondegenerate actual triangle');
for(const mesh of detail.children){
 assert(mesh.isMesh);assert.deepEqual(mesh.matrix.toArray(),new T.Matrix4().toArray(),'no hidden batch transform');
 mesh.geometry.computeBoundingBox();assert(b.metadata.bounds.containsBox(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)),'complete actual culling bounds');
 const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;assert.equal(p.count,n.count);
 for(const x of[...p.array,...n.array])assert(Number.isFinite(x));
 for(let i=0;i<n.count;i++)assert(Math.abs(new T.Vector3().fromBufferAttribute(n,i).length()-1)<1e-5,'unit surface normal');
 assert(mesh.castShadow&&mesh.receiveShadow);assert(!(mesh.material.map?.image?.operations||[]).some(op=>op[0]==='fillText'),'new construction has no invented text');
}
assert(Math.abs(b.height-b.metadata.bounds.max.y)<1e-12);
const cedar=components(detail.children.find(o=>o.name==='moonsnow-static-cedar')),bronze=components(detail.children.find(o=>o.name==='moonsnow-static-bronze')),allSolids=[...cedar,...bronze],totalBounds=new T.Box3();
allSolids.forEach(s=>totalBounds.union(s.bounds));
const used=new Set(),shapeProofs=[],contactProofs=[],graph=new Map(),sources=new Set();
function register(s,label,genus=0){assert(s,'actual '+label);assert(!used.has(s),'unique actual solid '+label);used.add(s);s.label=label;s.proof=topology(s,genus);graph.set(s,new Set());return s;}
const basis=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)];
function exactCorners(s,center,axes,size,bevel){
 const expected=[];
 if(bevel){for(let full=0;full<3;full++)for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])expected.push([x,y,z].map((sign,j)=>sign*(size[j]/2-(j===full?0:bevel))));}
 else for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])expected.push([x,y,z].map((sign,j)=>sign*size[j]/2));
 assert.equal(s.proof.vertexCount,bevel?24:8);assert.equal(s.proof.triangles,bevel?44:12);
 for(const xyz of expected){const p=center.clone();axes.forEach((axis,j)=>p.addScaledVector(axis,xyz[j]));assert(s.proof.vertices.some(v=>v.distanceTo(p)<8e-5),'every exact independently specified corner '+s.label);}
}
function exactBox(batch,label,center,size,bevel=0){
 const C=new T.Vector3(...center),s=register(batch.find(s=>s.bounds.getCenter(new T.Vector3()).distanceTo(C)<4e-5),label);
 assert(s.bounds.getSize(new T.Vector3()).distanceTo(new T.Vector3(...size))<5e-5,'exact actual box dimensions '+label);
 exactCorners(s,C,basis,size,bevel);shapeProofs.push({label,center,size,bevel,triangles:s.proof.triangles,volume:s.proof.volume});return s;
}
function principalAxes(s){const fs=s.faces.map(f=>({normal:new T.Triangle(...f).getNormal(new T.Vector3()),area:new T.Triangle(...f).getArea()})).sort((a,b)=>b.area-a.area),axes=[];for(const f of fs)if(axes.every(n=>Math.abs(n.dot(f.normal))<1e-4))axes.push(f.normal);assert.equal(axes.length,3,'three orthogonal actual primary faces');return axes;}
function exactBeam(label,a,b,width,depth,bevel){
 const A=new T.Vector3(...a),B=new T.Vector3(...b),axis=B.clone().sub(A),center=A.clone().add(B).multiplyScalar(.5),length=axis.length();axis.normalize();
 const s=register(cedar.find(s=>s.bounds.getCenter(new T.Vector3()).distanceTo(center)<5e-5),label),axes=principalAxes(s),dims=axes.map(n=>{const ds=s.proof.vertices.map(v=>v.clone().sub(center).dot(n));return Math.max(...ds)-Math.min(...ds);});
 const widthAxis=axes[dims.findIndex(d=>Math.abs(d-width)<1e-4)],depthAxis=axes[dims.findIndex(d=>Math.abs(d-depth)<1e-4)];
 assert(widthAxis&&depthAxis&&axes.some(n=>Math.abs(n.dot(axis))>1-1e-8),'actual member length and orthogonal cross section');
 const depthDirection=new T.Vector3(-axis.z,0,axis.x).normalize();assert(Math.abs(depthAxis.dot(depthDirection))>1-1e-8,'specified depth axis is actually out of the truss plane '+label);s.depthAxis=depthDirection;s.specDepth=depth;
 exactCorners(s,center,[widthAxis,depthAxis,axis],[width,depth,length],bevel);
 shapeProofs.push({label,endpoints:[a,b],crossSection:[width,depth],length,bevel,triangles:s.proof.triangles,volume:s.proof.volume});s.axis=axis;return s;
}
function originalTriangles(o){if(o.faces)return o.faces;const p=o.object.geometry.attributes.position,index=o.object.geometry.index;return o.faces=Array.from({length:(index?index.count:p.count)/3},(_,i)=>[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i*3+j):i*3+j).applyMatrix4(o.matrix)));}
function boundaryDistance(faces,p){return Math.min(...faces.map(f=>{const t=new T.Triangle(...f);if(t.getArea()>1e-14)return t.closestPointToPoint(p,new T.Vector3()).distanceTo(p);return Math.min(...[[0,1],[1,2],[2,0]].map(([i,j])=>f[i].distanceToSquared(f[j])<1e-20?f[i].distanceTo(p):new T.Line3(f[i],f[j]).closestPointToPoint(p,true,new T.Vector3()).distanceTo(p)));}));}
function actualOriginalContains(o,p){return containsSolid({bounds:o.box,faces:originalTriangles(o)},p);}
function oldAt(coords,size){const p=new T.Vector3(...coords),o=originals.find(o=>o.center.distanceTo(p)<4e-5&&(!size||o.box.getSize(new T.Vector3()).distanceTo(new T.Vector3(...size))<6e-5));assert(o,'actual original geometry '+coords);return o;}
function join(a,b,coords,label){
 const p=coords.isVector3?coords:new T.Vector3(...coords),original=!!b.original,target=original?b.original:b;
 assert(containsSolid(a,p),'positive-volume source '+label);assert(original?actualOriginalContains(target,p):containsSolid(target,p),'positive-volume actual target '+label);
 const radius=Math.min(boundaryDistance(a.faces,p),boundaryDistance(original?originalTriangles(target):target.faces,p));
 assert(radius>.001,'contact contains a ball of radius greater than 1mm '+label+' '+radius);
 if(original)sources.add(a);else{graph.get(a).add(target);graph.get(target).add(a);}
 contactProofs.push({label,source:a.label,target:original?'actual original '+b.kind:target.label,point:p.toArray(),interiorRadius:radius});
}
let sectionRays=0;
function exactSleeve(label,center,outer,inner,height){
 const C=new T.Vector3(...center),s=register(bronze.find(s=>s.bounds.getCenter(new T.Vector3()).distanceTo(C)<5e-5),label,1);
 assert.equal(s.proof.vertexCount,16);assert.equal(s.proof.triangles,32);
 assert(Math.abs(s.proof.volume-(outer*outer-inner*inner)*height)<2e-5,'entire exact through-sleeve volume '+label);
 for(const span of[outer,inner])for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1]){
  const p=C.clone().add(new T.Vector3(x*span/2,y*height/2,z*span/2));assert(s.proof.vertices.some(v=>v.distanceTo(p)<8e-5),'all actual exterior and through-bore corners '+label);
 }
 for(let x=-outer/2-.037;x<outer/2+.04;x+=.033)for(let z=-outer/2-.023;z<outer/2+.03;z+=.037){
  if(Math.min(...[outer/2,inner/2].flatMap(q=>[Math.abs(Math.abs(x)-q),Math.abs(Math.abs(z)-q)]))<.001)continue;
  const start=C.clone().add(new T.Vector3(x,-height/2-1,z)),ray=new T.Ray(start,new T.Vector3(0,1,0)),hits=[];
  for(const f of s.faces){const hit=ray.intersectTriangle(...f,false,new T.Vector3());if(hit&&!hits.some(y=>Math.abs(y-hit.y)<1e-5))hits.push(hit.y);}
  const wall=Math.abs(x)<outer/2&&Math.abs(z)<outer/2&&!(Math.abs(x)<inner/2&&Math.abs(z)<inner/2);
  assert.equal(hits.length,wall?2:0,'whole sleeve section with open through-bore '+label);
  if(wall){hits.sort((a,b)=>a-b);assert(Math.abs(hits[0]-(C.y-height/2))<6e-5&&Math.abs(hits[1]-(C.y+height/2))<6e-5);}
  sectionRays++;
 }
 const areas={outer:0,inner:0,ends:0};
 for(const face of s.faces){const local=face.map(v=>v.clone().sub(C)),triangle=new T.Triangle(...local),area=triangle.getArea();let kind=null;
  if(local.every(v=>Math.abs(v.y-height/2)<8e-5)||local.every(v=>Math.abs(v.y+height/2)<8e-5))kind='ends';
  else for(const [name,span]of[['outer',outer],['inner',inner]])for(const axis of['x','z'])for(const sign of[-1,1])if(local.every(v=>Math.abs(v[axis]-sign*span/2)<8e-5))kind=name;
  assert(kind,'every actual sleeve triangle is on a specified wall or end-cap plane');areas[kind]+=area;
 }
 assert(Math.abs(areas.outer-4*outer*height)<6e-5&&Math.abs(areas.inner-4*inner*height)<6e-5&&Math.abs(areas.ends-2*(outer*outer-inner*inner))<6e-5,'complete exact outer, bore and annular end surface areas');
 shapeProofs.push({label,center,outerSection:[outer,outer],innerSection:[inner,inner],height,surfaceAreas:areas,genus:1,triangles:s.proof.triangles,volume:s.proof.volume});return s;
}
assert.equal(withoutHook,oldGarden,'whole production builder differs only by explicit hook and nine finite floor-repair source replacements');assert.equal(gardenSource.split(hook).length,2,'exactly one additive production hook');
// Independent dimensional specification of every actual exported solid.
assert.equal(cedar.length,43);assert.equal(bronze.length,10);assert.equal(allSolids.length,53);assert.equal(fixed.length,2212);
const bays=[{name:'western covered corridor',xs:[-8.96,-6.43],zs:[-6.8,-3.08,.6],base:3.04,railY:3.43,centerZ:-3.1,length:7.62,postHeight:3.31},{name:'shared rear study',xs:[2.55,9.14],zs:[4.24,9.49],base:3.15,railY:3.62,centerZ:6.87,length:5.5,postHeight:3.42}],stations=[],rails=[];
for(const bay of bays)for(const [sideIndex,px]of bay.xs.entries()){
 const sign=sideIndex===0?-1:1,prefix=bay.name+' '+(sign<0?'left':'right'),rail=exactBox(cedar,prefix+' eave rail',[px+sign*.13,bay.railY,bay.centerZ],[.18,.24,bay.length],.008),lip=exactBox(cedar,prefix+' stepped eave lip',[px+sign*.20,bay.railY-(bay.postHeight>3.4?.06:.08),bay.centerZ],[.10,.13,bay.length-.16],.008);
 join(rail,lip,[px+sign*.19,bay.railY-.055,bay.centerZ],prefix+' positive-volume stepped lip');rails.push({rail,lip,bay,px,sign});
 for(const z of bay.zs){
  const h=bay.base,isStudy=bay.postHeight>3.4,isRear=isStudy&&z>9,middleZ=isRear?9.18:z,upperZ=isRear?9.14:z,capY=h+(isStudy?.29:.27),lowerDepth=isRear?.42:.25,label=prefix+' station z='+z,lower=exactBox(cedar,label+' lower corbel',[px,h,z],[.25,.22,lowerDepth],.008),middle=exactBox(cedar,label+' middle corbel',[px+sign*.055,h+.14,middleZ],[.43,.18,.32],.008),upper=exactBox(cedar,label+' upper corbel',[px+sign*.10,capY,upperZ],[.57,.16,.40],.008),collar=exactSleeve(label+' hollow post collar',[px,h+.005,z],.33,.17,.18),post=oldAt([px,bay.postHeight/2+.12,z],[.19,bay.postHeight,.19]);
  join(lower,{original:post,kind:'retained timber post'},[px,h,z],label+' lower seated into old post');
  join(collar,{original:post,kind:'retained timber post'},[px+sign*.09,h+.005,z],label+' annular wall overlaps original post by 10mm');
  join(collar,lower,[px+sign*.105,h,z],label+' bronze wall to actual lower corbel');
  join(lower,middle,[px,h+.08,isRear?9.31:z],label+' lower-middle seated overlap');
  join(middle,upper,[px+sign*.055,h+(isStudy?.22:.21),middleZ],label+' middle-upper seated overlap');
  join(upper,rail,[px+sign*.13,isStudy?3.51:h+.32,upperZ],label+' upper corbel carries continuous eave');
  const oldRail=oldAt([px,isStudy?3.48:3.36,bay.centerZ],[isStudy?.22:.19,.22,bay.length]);join(rail,{original:oldRail,kind:'retained longitudinal timber beam'},[px+sign*.065,isStudy?3.54:3.40,z],label+' eave independently seated into original continuous beam');
  stations.push({label,px,sign,z,h,lower,middle,upper,collar,post,rail,lip,isStudy,isRear,middleZ,upperZ,capY,lowerDepth});
 }
}
const entryHeaders=[[[ -3.455,3.13,-7.80],[2.17,.18,.42]],[[ -3.455,3.04,-8.10],[1.91,.16,.36]],[[ -3.455,2.96,-8.34],[1.73,.13,.28]]].map(([center,size],i)=>exactBox(cedar,'side entry layered header '+(i+1),center,size,.008));
const entryReturns=[-4.58,-2.46].map((x,i)=>exactBox(cedar,'side entry '+(i?'right':'left')+' return',[x,3,-7.89],[.16,.44,.60],.008));
const lintel=oldAt([-3.455,3.3,-7.72],[2.09,.22,.29]),leftMasonry=oldAt([-6.86,0,-7.85]),rightMasonry=oldAt([-2.53,1.65,-7.72],[.36,3.3,.25]);
join(entryHeaders[0],{original:lintel,kind:'retained ordinary entry lintel'},[-3.455,3.20,-7.80],'entry primary header seated in original lintel');
join(entryHeaders[0],entryHeaders[1],[-3.455,3.08,-7.965],'entry first-second header overlap');
join(entryHeaders[1],entryHeaders[2],[-3.455,3.005,-8.24],'entry second-third header overlap');
join(entryReturns[0],entryHeaders[0],[-4.52,3.13,-7.9],'entry left return supports actual primary header');
join(entryReturns[1],entryHeaders[0],[-2.46,3.13,-7.9],'entry right return supports actual primary header');
join(entryReturns[0],{original:leftMasonry,kind:'retained moon-window masonry'},[-4.59,3,-7.75],'entry left return seated into real masonry');
join(entryReturns[1],{original:rightMasonry,kind:'retained ordinary door masonry cheek'},[-2.46,3,-7.75],'entry right return seated into old cheek');
assert.equal(used.size,allSolids.length,'all actual components identified by independent geometry');
const connected=new Set(sources),pending=[...sources];while(pending.length){const s=pending.pop();for(const n of graph.get(s))if(!connected.has(n)){connected.add(n);pending.push(n);}}assert.equal(connected.size,allSolids.length,'positive-volume original-rooted contact path for every new solid');
function firstExit(s,p,d){const ray=new T.Ray(p,d),hits=[];for(const face of s.faces){const hit=ray.intersectTriangle(...face,false,new T.Vector3());if(hit&&hit.distanceTo(p)>1e-6)hits.push(hit.distanceTo(p));}assert(hits.length);return Math.min(...hits);}
const jointOffsets=[];
function measuredStep(a,c,p,d,expected,label){p=new T.Vector3(...p);d=new T.Vector3(...d);assert(containsSolid(a,p)&&containsSolid(c,p),'step ray starts in both actual joined solids');const offset=firstExit(c,p,d)-firstExit(a,p,d);assert(Math.abs(offset-expected)<8e-5,'actual joint surface step '+label+' '+offset);jointOffsets.push({label,first:a.label,second:c.label,point:p.toArray(),direction:d.toArray(),offset});}
for(const s of stations){
 const lowerPoint=[s.px,s.h+.08,s.isRear?9.31:s.z],upperPoint=[s.px+s.sign*.055,s.h+(s.isStudy?.22:.21),s.middleZ];
 measuredStep(s.lower,s.middle,lowerPoint,[s.sign,0,0],.145,s.label+' outward lower-middle reveal');
 measuredStep(s.middle,s.upper,upperPoint,[s.sign,0,0],.115,s.label+' outward middle-upper reveal');
 for(const side of[-1,1]){measuredStep(s.lower,s.middle,lowerPoint,[0,0,side],s.isRear?(side<0?.26:-.36):.035,s.label+' lower-middle measured depth offset');measuredStep(s.middle,s.upper,upperPoint,[0,0,side],s.isRear?(side<0?.08:0):.04,s.label+' middle-upper measured depth offset');}
}
for(const r of rails)measuredStep(r.rail,r.lip,[r.px+r.sign*.19,r.bay.railY-.055,r.bay.centerZ],[r.sign,0,0],.03,r.bay.name+' eave lip projection');
measuredStep(entryHeaders[0],entryHeaders[1],[-3.455,3.08,-7.965],[0,0,-1],.27,'entry first-second front projection');
measuredStep(entryHeaders[1],entryHeaders[2],[-3.455,3.005,-8.24],[0,0,-1],.20,'entry second-third front projection');
// Continuous analytic translation envelopes for every original lattice component.
const sweeps=[];let sweepTriangleChecks=0;
for(const mesh of carrier.children){
 const box=new T.Box3(),p=mesh.geometry.attributes.position;mesh.updateMatrix();
 for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrix);box.expandByPoint(v.clone().add(new T.Vector3(-9.08,1.81,-2.49)));box.expandByPoint(v.clone().add(new T.Vector3(-9.08,1.81,-1.47)));}
 const clearance=box.clone().expandByScalar(.025);for(const t of fixed){assert(!clearance.intersectsTriangle(t.triangle),'25mm clearance over complete analytic lattice sweep');sweepTriangleChecks++;}for(const s of allSolids)assert(!containsSolid(s,clearance.getCenter(new T.Vector3())));
 sweeps.push({mesh:mesh.name,phase:[0,1],translationZ:[-2.49,-1.47],bounds:[box.min.toArray(),box.max.toArray()],clearanceBounds:[clearance.min.toArray(),clearance.max.toArray()]});
}
assert.equal(sweeps.length,9);
// All 24 original curved-roof slope slabs independently located from the fixed
// six-step mathematical section. Every tile batten, ridge and wall cap sharing
// their actual material is checked too, without relying on generator labels.
const roofSlabs=[];
for(const [cx,cz,w,d,eave,rise]of[[-7.7,-3.1,3.08,8.3,3.61,.72],[5.845,6.84,7.39,6.04,3.73,.94]]){
 const y=u=>eave+rise*Math.pow(1-u,1.14)+.13*Math.pow(u,8);
 for(const side of[-1,1])for(let j=0;j<6;j++){
  const u0=j/6,u1=(j+1)/6,x0=cx+side*w/2*u0,x1=cx+side*w/2*u1,y0=y(u0),y1=y(u1),slab=oldAt([(x0+x1)/2,(y0+y1)/2,cz]);
  const dims=new T.Vector3().setFromMatrixScale(slab.matrix);assert(dims.distanceTo(new T.Vector3(Math.hypot(x1-x0,y1-y0)+.04,.105,d))<1e-4,'actual dimensions of each retained curved roof slope');roofSlabs.push(slab);
 }
}
assert.equal(roofSlabs.length,24);const roofMaterial=roofSlabs[0].object.material;assert(roofSlabs.every(r=>r.object.material===roofMaterial));const roofTrimMaterial=oldAt([5.845,3.43,9.58],[6.97,.055,.16]).object.material,allRoofMembers=originals.filter(o=>o.object.material===roofMaterial||o.object.material===roofTrimMaterial),roofProofs=[];let roofTriangleChecks=0;
assert(allRoofMembers.length>24,'full original tiled roofs include actual battens, ridge and wall caps');
for(const roof of allRoofMembers){
 const inverse=roof.matrix.clone().invert(),scale=new T.Vector3().setFromMatrixScale(roof.matrix),volume=roof.localBox.clone(),margin=.01;
 for(const axis of['x','y','z']){volume.min[axis]-=margin/scale[axis];volume.max[axis]+=margin/scale[axis];}
 for(const t of fixed){assert(!volume.intersectsTriangle(new T.Triangle(...t.points.map(v=>v.clone().applyMatrix4(inverse)))),'10mm real roof clearance '+JSON.stringify(roof.center.toArray()));roofTriangleChecks++;}
 for(const s of allSolids){assert(!containsSolid(s,roof.center),'retained roof cannot be enclosed in new solid');assert(!volume.containsPoint(s.bounds.getCenter(new T.Vector3()).applyMatrix4(inverse)),'new solid cannot be enclosed in retained roof');}
 roofProofs.push({center:roof.center.toArray(),bounds:[roof.box.min.toArray(),roof.box.max.toArray()],isSlopeSlab:roofSlabs.includes(roof),isCeramicTrim:roof.object.material===roofTrimMaterial,clearance:margin});
}
function hullPlanes(points){const planes=[];for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)for(let k=j+1;k<points.length;k++){const n=points[j].clone().sub(points[i]).cross(points[k].clone().sub(points[i]));if(n.length()<1e-8)continue;n.normalize();let c=n.dot(points[i]);const ds=points.map(p=>n.dot(p)-c);if(ds.some(d=>d>1e-7)&&ds.some(d=>d< -1e-7))continue;if(ds.some(d=>d>1e-7)){n.negate();c=-c;}if(!planes.some(p=>p.n.distanceTo(n)<1e-6&&Math.abs(p.c-c)<1e-6))planes.push({n,c});}assert(planes.length>=4);return planes;}
function clipHull(face,planes){let poly=face.map(v=>v.clone());for(const {n,c}of planes){const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=c-n.dot(a),db=c-n.dot(b);if(da>=-1e-8)next.push(a);if((da<0)!==(db<0))next.push(a.clone().lerp(b,da/(da-db)));}poly=next;if(!poly.length)break;}return poly;}
// Whole visible text planes and full pyramids from the actual reading positions,
// rather than a few centre rays. The dynamic controller preserves these faces.
const textFaces=reading.faces;let textTriangleChecks=0;const textProofs=[];
function anchorEye(id){const a=before.metadata.readingAnchors.find(a=>a.sectionId===id);assert(a);return{source:'original reading anchor '+id,point:[a.position[0],1.65,a.position[2]]};}
function compositionEye(name){const v=before.metadata.compositionViews.find(v=>v.name===name);assert(v);return{source:'original composition '+name,point:v.position};}
const readingEyes={
 'poem-in-the-entry-wall':[anchorEye('c4'),compositionEye('moon-snow-entry-framed-glimpse')],
 'self-cultivation-at-the-turn':[anchorEye('c6'),compositionEye('moon-snow-turn-and-pause')],
 'trust-on-the-working-paper':[anchorEye('c7'),anchorEye('c8'),anchorEye('c9'),compositionEye('moon-snow-shared-study')],
 'everyday-ending-beside-the-frame':[anchorEye('source-note'),anchorEye('c10'),compositionEye('moon-snow-painting-ending')]
};
for(const face of textFaces){
 face.geometry.computeBoundingBox();const bb=face.geometry.boundingBox,inverse=face.matrixWorld.clone().invert(),scale=new T.Vector3().setFromMatrixScale(face.matrixWorld),volume=new T.Box3(new T.Vector3(bb.min.x,bb.min.y,.001/scale.z),new T.Vector3(bb.max.x,bb.max.y,1.5/scale.z));
 for(const t of fixed){assert(!volume.intersectsTriangle(new T.Triangle(...t.points.map(v=>v.clone().applyMatrix4(inverse)))),'whole original text-front prism '+face.name);textTriangleChecks++;}
 const corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,y])=>new T.Vector3(x<0?bb.min.x:bb.max.x,y<0?bb.min.y:bb.max.y,.001).applyMatrix4(face.matrixWorld)),center=new T.Vector3().setFromMatrixPosition(face.matrixWorld),views=[];
 for(const view of readingEyes[face.name]){
  const eye=new T.Vector3(...view.point),planes=hullPlanes([...corners,eye]);
  for(const t of fixed){assert(!clipHull(t.points,planes).length,'all sightlines to complete text face '+face.name+' from '+view.source);textTriangleChecks++;}
  for(const s of allSolids)assert(!containsSolid(s,eye.clone().add(center).multiplyScalar(.5)));
  views.push({source:view.source,eye:eye.toArray(),sightlineHullPlanes:planes.map(p=>({normal:p.n.toArray(),constant:p.c}))});
 }
 textProofs.push({name:face.name,center:center.toArray(),depth:1.5,localBounds:[volume.min.toArray(),volume.max.toArray()],views});
}
// Preserve deliberate empty and inhabited garden fields. These are tested only
// against additions; every original component is independently byte/pose-hashed.
const fields=[
 {name:'whole uninscribed resting wall viewing field',min:[-9.305,.15,2.76],max:[-4.475,2.92,3.085]},
 {name:'whole shared desk papers and working field',min:[4.14,.15,6.08],max:[7.50,2.7,7.60]},
 {name:'framed interpretive wash and separate ordinary ending label',min:[4.48,.15,8.95],max:[8.05,3.13,9.47]},
 {name:'original open study side window view',min:[8.92,.87,4.37],max:[9.5,2.895,9.17]},
 {name:'original equal rear convergence and ordinary return',min:[2.75,.15,8.27],max:[8.89,2.4,9.03]},
 {name:'unfilled interval between corridor and study roofs above central axis',min:[-1.8,.15,-10.4],max:[1.8,12,10.4]}
];
let fieldTriangleChecks=0;
for(const field of fields){const box=new T.Box3(new T.Vector3(...field.min),new T.Vector3(...field.max));for(const t of fixed){assert(!box.intersectsTriangle(t.triangle),'entire protected field '+field.name);fieldTriangleChecks++;}for(const s of allSolids)assert(!containsSolid(s,box.getCenter(new T.Vector3())),'field cannot be enclosed in new solid');}
// Entire circular moon aperture is conservatively enclosed by a square prism;
// the full perspective pyramid is also protected from the original entry view.
const aperture={center:[-6.86,2.08,-7.72],radius:.94,depth:[-9.5,-7.59]},apertureBox=new T.Box3(new T.Vector3(-7.8,1.14,aperture.depth[0]),new T.Vector3(-5.92,3.02,aperture.depth[1]));let apertureTriangleChecks=0;
for(const t of fixed){assert(!apertureBox.intersectsTriangle(t.triangle),'entire square enclosing complete moon opening viewing cylinder');apertureTriangleChecks++;}
for(const s of allSolids)assert(!containsSolid(s,new T.Vector3(...aperture.center)));
const apertureEye=new T.Vector3(...compositionEye('moon-snow-entry-framed-glimpse').point),apertureCorners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,y])=>new T.Vector3(aperture.center[0]+x*aperture.radius,aperture.center[1]+y*aperture.radius,-7.851)),aperturePlanes=hullPlanes([...apertureCorners,apertureEye]);
for(const t of fixed){assert(!clipHull(t.points,aperturePlanes).length,'complete moon-opening perspective view');apertureTriangleChecks++;}
const apertureViewProof={eye:apertureEye.toArray(),corners:apertureCorners.map(v=>v.toArray()),planes:aperturePlanes.map(p=>({normal:p.n.toArray(),constant:p.c}))};
const anchorProofs=[];let anchorTriangleChecks=0;
for(const anchor of b.metadata.readingAnchors){const [x,,z]=anchor.position,box=new T.Box3(new T.Vector3(x-.38,.15,z-.38),new T.Vector3(x+.38,2.4,z+.38));for(const t of fixed){assert(!box.intersectsTriangle(t.triangle),'entire original reading anchor body '+anchor.sectionId);anchorTriangleChecks++;}anchorProofs.push({sectionId:anchor.sectionId,bodyBounds:[box.min.toArray(),box.max.toArray()]});}
const second=build(now).root.getObjectByName('moonsnow-blender-static');assert.notEqual(detail,second);for(let i=0;i<2;i++){assert.equal(detail.children[i].geometry,second.children[i].geometry);assert.equal(detail.children[i].material,second.children[i].material);}
const result={passed:true,audit:'independent actual production garden geometry and integrated reading',building:20,baseline,productionBuilder:'assets/moon-snow-garden.js',assetSha256:crypto.createHash('sha256').update(fs.readFileSync(root+'/assets/moonsnow-detail.js')).digest('hex'),triangles:fixed.length,calls:detail.children.length,closedSolidComponents:allSolids.length,actualBounds:[totalBounds.min.toArray(),totalBounds.max.toArray()],shapeProofs,sectionRays,jointOffsets,positiveContactCount:contactProofs.length,contactProofs,allSolidsConnectedToOriginal:true,allOriginalMeshes:originalState(before).length,originalColliderCount:b.collisionBoxes.length,checkedPhases:phases.length,originalPoseProofs,originalMeshMaterialCanvasIdentity:true,originalTransformIdentityExceptExplicitPavingRepair:true,pavingRepair:{minimumLiftCount,liftedPavingCount:6,liftedInstanceCount:liftedIndices.size,pavingProofs,pavingOverlaps},originalPhysicalAndReadingCollisionsPreserved:true,continuousSweeps:sweeps,sweepTriangleChecks,sweepClearanceMargin:.025,bodyHeight:2.4,bodySegments,bodyTriangleChecks,bodyCollisionChecks,routes,fullPassages,originalRoofSlopeSlabs:roofSlabs.length,allOriginalTileAndCeramicRoofMembers:allRoofMembers.length,roofTriangleChecks,roofClearanceMargin:.01,roofProofs,textFaces:textFaces.length,textTriangleChecks,textProofs,fieldTriangleChecks,fields,aperture,apertureViewProof,apertureTriangleChecks,anchorTriangleChecks,anchorProofs,readingPlacement:initialReadingPlacement,readingSectionsChecked:now.CourtyardReadingCatalog[20].sections.length,readingDrawProofs,sourceHashes,exportedMeshes:meshes.length,sharedGeometry:true,sharedMaterials:true,limits:['CPU actual geometry and conservative continuous-volume checks only','No browser navigation, GPU performance, FPS, loading or structural certification','Canvas operations prove original active text identity; assembly export omits raster texture pixels', 'The explicitly audited paving repair lifts only six original slabs and 85 accompanying joints by 1mm; all other original transforms are unchanged','The actual published garden override is audited; the shadowed literary builder is not represented as production geometry','Every original reading file and private-source handling rule remains byte-identical; reports contain hashes and geometry only']};
fs.writeFileSync(out+'/checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,triangles:fixed.length,solidComponents:allSolids.length,contacts:contactProofs.length,bodyTriangleChecks,roofTriangleChecks,textTriangleChecks,anchorTriangleChecks,assetSha256:result.assetSha256},null,2));
