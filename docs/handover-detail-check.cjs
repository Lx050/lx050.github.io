/* Independent CPU audit of actual building 19: unequal receiving bays, continuous handover spine,
   shared work court and an intentionally empty successor station. Baseline:
   62e4317998f330c1adcc4f94a70395a1427e7681. Verifies actual runtime solids and all retained content.
   This does not run a browser, navigation controls, GPU frames or structural analysis. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js'),out=root+'/qa-results/handover';fs.mkdirSync(out,{recursive:true});
const baseline='62e4317998f330c1adcc4f94a70395a1427e7681';
function load(old){
 const c={console,document:{createElement(){const canvas={width:0,height:0,operations:[]};canvas.getContext=()=>new Proxy({measureText:t=>({width:String(t).length*10}),createLinearGradient:()=>({addColorStop(...args){canvas.operations.push(['addColorStop',...args]);}})},{get:(o,k)=>o[k]||((...args)=>canvas.operations.push([k,...args])),set:(o,k,v)=>{canvas.operations.push(['set',k,v]);o[k]=v;return true;}});return canvas;}}};c.window=c;vm.createContext(c);
 for(const n of [...(!old?['vault-detail','rss-detail']:[]),'architecture','content-core',...(!old&&fs.existsSync(root+'/assets/handover-detail.js')?['handover-detail']:[]),'content-literary','reading-catalog','reading-panels']){const file='assets/'+n+'.js',source=old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{encoding:'utf8',maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file,'utf8');vm.runInContext(source,c,{filename:file});}return c;
}
const now=load(false),old=load(true),build=c=>c.CourtyardArchitecture.build({THREE:T,index:19,title:'置身青媒内',zone:0});
const b=build(now),before=build(old),detail=b.root.getObjectByName('handover-blender-static');
const extra=o=>{for(let p=o;p;p=p.parent)if(p.name==='handover-blender-static')return true;return false;};
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function materialState(m){return{type:m.type,color:m.color?.toArray(),emissive:m.emissive?.toArray(),emissiveIntensity:m.emissiveIntensity,opacity:m.opacity,metalness:m.metalness,roughness:m.roughness,side:m.side,transparent:m.transparent,depthTest:m.depthTest,depthWrite:m.depthWrite,alphaTest:m.alphaTest,blending:m.blending,vertexColors:m.vertexColors,wireframe:m.wireframe,map:m.map?{type:m.map.type,width:m.map.image?.width,height:m.map.image?.height,canvasOperations:m.map.image?.operations,dataSha256:m.map.image?.data?crypto.createHash('sha256').update(Buffer.from(m.map.image.data.buffer,m.map.image.data.byteOffset,m.map.image.data.byteLength)).digest('hex'):null,wrapS:m.map.wrapS,wrapT:m.map.wrapT,minFilter:m.map.minFilter,magFilter:m.map.magFilter,generateMipmaps:m.map.generateMipmaps,flipY:m.map.flipY,repeat:m.map.repeat.toArray(),offset:m.map.offset.toArray(),encoding:m.map.encoding}:null};}
function eachMesh(building,fn){building.root.updateMatrixWorld(true);building.root.traverse(o=>{if(!o.isMesh)return;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const instance=new T.Matrix4();o.getMatrixAt(i,instance);matrix.multiply(instance);}fn(o,matrix,i);}});}
function originalState(building){const rows=[];eachMesh(building,(o,matrix,i)=>{if(extra(o))return;rows.push({name:o.name,instance:i,attrs:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,{itemSize:a.itemSize,normalized:a.normalized,array:Array.from(a.array)}])),index:o.geometry.index?Array.from(o.geometry.index.array):null,groups:o.geometry.groups,matrix:matrix.toArray(),materials:(Array.isArray(o.material)?o.material:[o.material]).map(materialState),visible:o.visible,ancestors:(()=>{const a=[];for(let p=o.parent;p;p=p.parent)a.push({name:p.name,visible:p.visible,matrix:p.matrix.toArray()});return a;})(),castShadow:o.castShadow,receiveShadow:o.receiveShadow});});return rows;}
function trianglesOf(building,predicate=()=>true){const all=[];eachMesh(building,(o,matrix,i)=>{if(!predicate(o))return;const p=o.geometry.attributes.position,index=o.geometry.index;for(let j=0;j<(index?index.count:p.count);j+=3){const points=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index?index.getX(j+k):j+k).applyMatrix4(matrix));all.push({points,triangle:new T.Triangle(...points),box:new T.Box3().setFromPoints(points),name:o.name,instance:i,object:o});}});return all;}
// Export the actual production assembly with its address plaque and actual production reading surfaces.
const reading=now.CourtyardReadingPanels.attach({THREE:T,building:b,index:19,preview:now.CourtyardReadingCatalog[19]});
const oldReading=old.CourtyardReadingPanels.attach({THREE:T,building:before,index:19,preview:old.CourtyardReadingCatalog[19]});assert(reading&&oldReading);
// Unframed production walls allocate their Canvas only when a visitor is near.
// Activate both real reading faces before every capture, not an empty-material proxy.
for(const controller of[reading,oldReading]){controller.update({x:0,y:1.65,z:0});assert(controller.faces.every(f=>f.material.map?.image?.operations?.some(op=>op[0]==='fillText')),'production reading Canvas is populated');}
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
// Every original mesh, instance, material, transform, shadow and active Canvas operation
// is compared against the exact pre-detail commit at eight poses including reversals.
const phases=[0,.25,.5,.75,1,.4,0,1],carrier=b.root.getObjectByName('handover-light-carriage');
assert(carrier&&carrier.children.length===3,'three actual original light carriage pieces');
const collisionState=x=>JSON.stringify(x.collisionBoxes.map(q=>[q.min.toArray(),q.max.toArray(),q.userData]));
assert.equal(collisionState(b),collisionState(before),'all original physical and production-reading colliders');
for(const k of Object.keys(before.metadata).filter(k=>!['bounds','pieces','staticDrawCalls'].includes(k)))
 assert.equal(JSON.stringify(b.metadata[k]),JSON.stringify(before.metadata[k]),'retained original metadata '+k);
assert.equal(JSON.stringify(b.mechanisms.map(m=>({name:m.name,kind:m.kind}))),JSON.stringify(before.mechanisms.map(m=>({name:m.name,kind:m.kind}))),'original mechanism identity');
assert.equal(b.mechanisms.length,1);
const originalPoseProofs=[];
for(const phase of phases){
 for(const x of[b,before])for(const m of x.mechanisms)m.articulate(phase);
 const state=hash(originalState(b));
 assert.equal(state,hash(originalState(before)),'every original mesh/material/transform/Canvas draw at phase '+phase);
 assert.equal(collisionState(b),collisionState(before),'every original collider at phase '+phase);
 assert.deepEqual(carrier.scale.toArray(),[1,1,1]);assert.equal(carrier.rotation.x,0);assert.equal(carrier.rotation.y,0);assert.equal(carrier.rotation.z,0);
 assert.equal(carrier.position.x,-3.04);assert.equal(carrier.position.y,3.48);assert(Math.abs(carrier.position.z-(-7.7+15.4*phase))<1e-12,'exact original linear translation law');
 assert(Math.abs(carrier.getObjectByName('handoff-position').material.emissiveIntensity-(.42+.22*Math.sin(Math.PI*phase)))<1e-12,'original bounded relay emission law');
 originalPoseProofs.push({phase,sha256:state});
}
const readingFile='assets/readings/19.json',readingSource=JSON.parse(fs.readFileSync(root+'/'+readingFile,'utf8'));
for(const file of[readingFile,'assets/architecture.js','assets/content-core.js','assets/reading-catalog.js','assets/reading-panels.js','docs/content-map.json'])
 assert.equal(file==='assets/architecture.js'?require('./rss-source-normalizer.js').restoreSource(fs.readFileSync(root+'/'+file,'utf8')):fs.readFileSync(root+'/'+file,'utf8'),cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{encoding:'utf8',maxBuffer:32*1024*1024}),'original reviewed source byte identity '+file);
const currentLiterary=fs.readFileSync(root+'/assets/content-literary.js','utf8'),oldLiterary=cp.execFileSync('git',['-C',root,'show',baseline+':assets/content-literary.js'],{encoding:'utf8'});
const originalMotion=source=>source.slice(source.indexOf("const carrier = labelledGroup(b, 'handover-light-carriage'"),source.indexOf('    return finish(b, options, w, d, {',source.indexOf("const carrier = labelledGroup(b, 'handover-light-carriage'")));
assert(originalMotion(oldLiterary).length>500);assert.equal(originalMotion(currentLiterary).replace('    global.CourtyardHandoverDetail.attach(b);\n',''),originalMotion(oldLiterary),'complete original motion and moving-mesh construction law preserved, not inferred from sampled poses');
assert.equal(readingSource.reviewedAt,'2026-10-09');assert.equal(readingSource.coverage,'privacy-edited');assert.equal(readingSource.source,null);assert.equal(readingSource.sections.length,19);
assert(readingSource.sections.every(s=>s.source===null),'retained privacy-preserving omitted backlinks');
assert.equal(readingSource.sections.filter(s=>/^s\d\d-/.test(s.id)).length,15,'all fifteen reviewed chapters retained');
assert(readingSource.coverageNotes.join('\n').includes('不把本版本称为逐字复录'));
assert(readingSource.provenance.publicTextAttribution.includes('不提供可反查该身份的原文回链'));
const source19=JSON.parse(fs.readFileSync(root+'/docs/content-map.json','utf8')).items.find(x=>x.index===19);
assert.equal(reading.faces.length,1);assert(initialReadingPlacement.every(p=>p.kind==='book-rest'));
const readingDrawProofs=[];
function verifyReading(label){
 assert.equal(hash(originalState(b)),hash(originalState(before)),label+' retains every original object and Canvas operation');
 const draw=reading.faces.map(face=>face.material.map.image.operations.filter(op=>op[0]==='fillText'));
 assert(draw.every(ops=>ops.length>4),'actual production reading face is populated');
 readingDrawProofs.push({label,faces:draw.map(ops=>({drawCalls:ops.length,sha256:hash(ops)}))});
}
for(const phase of[0,1,2]){reading.setPhase(phase);oldReading.setPhase(phase);verifyReading('reading phase '+phase);}
assert.equal(now.CourtyardReadingCatalog[19].sections.length,19);
for(const section of now.CourtyardReadingCatalog[19].sections){assert(reading.setSection(section.id));assert(oldReading.setSection(section.id));verifyReading('reading section '+section.id);}
// These route prisms cover every point along each complete segment, including
// segment end caps, from foot height through 2.4 m headroom. No point sampling.
const routes=[
 {name:'entire 3.6m public axis',radius:1.8,endMargin:0,points:[[0,-9.8],[0,9.8]]},
 ...JSON.parse(JSON.stringify(b.metadata.visitorRoutes)).map(r=>({...r,radius:r.bodyRadius})),
 ...initialReadingPlacement.map((p,i)=>({name:'actual production reading stop '+(i+1)+' complete approach',radius:.38,points:[[0,p.view[1]],p.view]}))
];
const actual=trianglesOf(b);let bodyTriangleChecks=0,bodyCollisionChecks=0,bodySegments=0;
function verifyBodyBox(label,box,inverse=new T.Matrix4()){
 for(const t of actual){assert(!box.intersectsTriangle(new T.Triangle(...t.points.map(v=>v.clone().applyMatrix4(inverse)))),'complete body/headroom '+label+' '+JSON.stringify({name:t.name,instance:t.instance,points:t.points.map(v=>v.toArray())}));bodyTriangleChecks++;}
 for(const collision of b.collisionBoxes){
  if(collision.min.y>=box.max.y||collision.max.y<=box.min.y)continue;
  const center=collision.getCenter(new T.Vector3()),size=collision.getSize(new T.Vector3()),geom=new T.BoxGeometry(1,1,1),matrix=new T.Matrix4().compose(center,new T.Quaternion(),size).premultiply(inverse),p=geom.attributes.position,index=geom.index;
  assert(!collision.containsPoint(box.getCenter(new T.Vector3()).applyMatrix4(inverse.clone().invert())),'route not wholly enclosed by physical collider '+label);
  for(let j=0;j<index.count;j+=3)assert(!box.intersectsTriangle(new T.Triangle(...[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index.getX(j+k)).applyMatrix4(matrix)))),'complete physical-collider body/headroom '+label+' '+collision.userData?.part);
  geom.dispose();bodyCollisionChecks++;
 }
}
for(const route of routes)for(let i=1;i<route.points.length;i++){
 const a=route.points[i-1],end=route.points[i],dx=end[0]-a[0],dz=end[1]-a[1],length=Math.hypot(dx,dz),inverse=new T.Matrix4().makeRotationY(Math.atan2(dx,dz));
 inverse.setPosition(a[0],0,a[1]);inverse.invert();const endMargin=route.endMargin??route.radius;
 verifyBodyBox(route.name,new T.Box3(new T.Vector3(-route.radius,.15,-endMargin),new T.Vector3(route.radius,2.4,length+endMargin)),inverse);bodySegments++;
}
// Full original clear widths, not merely the .76 m centreline visitor envelope.
// 10 micrometre boundary tolerance excludes intentional tangency to old furniture.
const fullPassages=[
 {name:'entire 1.235m receiving-table/service-spine side aisle',nominalWidth:1.235,min:[-4.725,.15,-8.725],max:[-3.49,2.4,8.625]},
 {name:'entire 1.525m common-court passage beside shared and successor tables',nominalWidth:1.525,min:[1.8,.15,-9.35],max:[3.325,2.4,8.25]}
];
for(const field of fullPassages){const box=new T.Box3(new T.Vector3(...field.min),new T.Vector3(...field.max));box.min.x+=1e-5;box.max.x-=1e-5;verifyBodyBox(field.name,box);bodySegments++;}
if(process.argv.includes('--original-only')){const result={passed:true,building:19,baseline,originalMeshes:originalState(before).length,originalPoseProofs,readingDrawProofs,bodySegments,bodyTriangleChecks,bodyCollisionChecks,routes,fullPassages};fs.writeFileSync(out+'/original-checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));process.exit(0);}
assert(detail&&detail.parent===b.root,'additive handover detail attached by production builder');
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
const cedar=components(detail.children.find(o=>o.name==='handover-static-cedar')),bronze=components(detail.children.find(o=>o.name==='handover-static-bronze')),allSolids=[...cedar,...bronze],totalBounds=new T.Box3();
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
function boundaryDistance(faces,p){return Math.min(...faces.map(f=>new T.Triangle(...f).closestPointToPoint(p,new T.Vector3()).distanceTo(p)));}
function actualOriginalContains(o,p){return containsSolid({bounds:o.box,faces:originalTriangles(o)},p);}
function oldAt(coords,size){const p=new T.Vector3(...coords),o=originals.find(o=>o.center.distanceTo(p)<4e-5&&(!size||o.box.getSize(new T.Vector3()).distanceTo(new T.Vector3(...size))<6e-5));assert(o,'actual original geometry '+coords);return o;}
function join(a,b,coords,label){
 const p=coords.isVector3?coords:new T.Vector3(...coords),original=!!b.original,target=original?b.original:b;
 assert(containsSolid(a,p),'positive-volume source '+label);assert(original?actualOriginalContains(target,p):containsSolid(target,p),'positive-volume actual target '+label);
 const radius=Math.min(boundaryDistance(a.faces,p),boundaryDistance(original?originalTriangles(target):target.faces,p));
 assert(radius>.001,'contact contains a ball of radius greater than 1mm '+label);
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
// Fixed independent construction specification; generator labels and metadata are
// never used to establish geometry, topology, contact or structural rooting.
assert.equal(cedar.length,21);assert.equal(bronze.length,12);assert.equal(allSolids.length,33);assert.equal(fixed.length,1248);
const rows=[{leftZ:-8.82,rightZ:-8.7,h:6.72,apex:9.25,bay:{x:-5.65,z:-7.1,w:6.65,d:4}},{leftZ:-4.37,rightZ:-3.5,h:6.95,apex:9.85,bay:{x:-5.3,z:-2.35,w:7.35,d:4.6}},{leftZ:.53,rightZ:2.1,h:6.85,apex:9.55,bay:{x:-5.65,z:3.35,w:6.65,d:6.2}}];
const sharedRoof=oldAt([3.25,7.255,-.05]),roofSites=[],trusses=[];
function roofY(roof,x){const a=roof.matrix.elements;return roof.center.y+(x-roof.center.x)*a[1]/a[0];}
for(const [i,row]of rows.entries()){
 const {leftZ,rightZ,h,apex,bay}=row,prefix='truss '+(i+1),L=[-8.65,8.22,leftZ],S=[-2.35,8.22,leftZ],A=[-2.35,apex,leftZ],R=[8.6,8.22,rightZ],leftRoof=oldAt([bay.x,h+.42,bay.z]);
 const members=[['receiving lower chord',L,S],['court lower chord',S,R],['receiving rafter',L,A],['court rafter',A,R]].map(([name,a,b])=>exactBeam(prefix+' '+name,a,b,.26,name.includes('lower')?.24:.20,.008));
 const posts=[],collars=[];
 for(const [role,x,z,lo,collarLo,collarHi,oldH]of[['left',-8.65,leftZ,h-.10,h,h+.5,h],['spine',-2.35,leftZ,h-.10,6.76,h+.93,h],['right',8.6,rightZ,6.62,7.30,7.76,6.72]]){
  const post=exactBox(cedar,prefix+' '+role+' extended pier',[x,(lo+8.38)/2,z],[.3,8.38-lo,.3],.008),collar=exactSleeve(prefix+' '+role+' roof collar',[x,(collarLo+collarHi)/2,z],.46,.28,collarHi-collarLo),pier=oldAt([x,oldH/2+.15,z],[.25,oldH,.25]);
  join(post,{original:pier,kind:role+' original load-bearing pier'},[x,oldH+.03,z],prefix+' '+role+' post positively rooted in actual old frame');
  join(collar,post,[x+.145,(collarLo+collarHi)/2,z],prefix+' '+role+' real collar wall overlaps extended pier');
  const site={row:i,role,x,z,post,collar,collarLo,collarHi,roofs:role==='left'?[leftRoof]:role==='spine'?[leftRoof,sharedRoof]:[sharedRoof]};
  for(const roof of site.roofs){const dx=role==='right'?-.185:role==='spine'&&roof===leftRoof?-.185:.185,p=[x+dx,roofY(roof,x+dx),z];join(collar,{original:roof,kind:roof===sharedRoof?'shared court sloped roof':'receiving bay '+(i+1)+' sloped roof'},p,prefix+' '+role+' substantial real collar wall/roof overlap');}
  posts.push(post);collars.push(collar);roofSites.push(site);
 }
 const king=exactBox(bronze,prefix+' kingpost',[-2.35,(8.07+apex+.15)/2,leftZ],[.16,apex+.15-8.07,.16]);
 join(king,posts[1],[-2.35,8.22,leftZ],prefix+' kingpost into spine post');
 for(const [member,node,post,inward]of[[members[0],L,posts[0],1],[members[0],S,posts[1],-1],[members[1],S,posts[1],1],[members[1],R,posts[2],-1],[members[2],L,posts[0],1],[members[3],R,posts[2],-1]])join(member,post,new T.Vector3(...node).addScaledVector(member.axis,.04*inward),prefix+' '+member.label+' into actual post');
 for(const [member,node,inward]of[[members[2],A,-1],[members[3],A,1],[members[0],S,-1],[members[1],S,1]])join(member,king,new T.Vector3(...node).addScaledVector(member.axis,.035*inward),prefix+' '+member.label+' into kingpost');
 trusses.push({row,...row,L,S,A,R,members,posts,collars,king,leftRoof});
}
assert.equal(used.size,33,'every actual connected solid has checked dimensions and topology');
const connected=new Set(sources),pending=[...sources];while(pending.length){const s=pending.pop();for(const neighbor of graph.get(s))if(!connected.has(neighbor)){connected.add(neighbor);pending.push(neighbor);}}
assert.equal(connected.size,33,'all new actual solids have positive-volume paths into the original frame');
// Prove measured stepped joint faces. Rays begin strictly inside each joined pair,
// intersecting the real outward triangle surfaces in both depth-axis directions.
function firstExit(s,p,d){const ray=new T.Ray(p,d),hits=[];for(const face of s.faces){const hit=ray.intersectTriangle(...face,false,new T.Vector3());if(hit&&hit.distanceTo(p)>1e-6)hits.push(hit.distanceTo(p));}assert(hits.length,'actual ray exits closed solid');return Math.min(...hits);}
const jointOffsets=[];
for(const truss of trusses){
 for(const [member,node,post,inward]of[[truss.members[0],truss.L,truss.posts[0],1],[truss.members[0],truss.S,truss.posts[1],-1],[truss.members[1],truss.S,truss.posts[1],1],[truss.members[1],truss.R,truss.posts[2],-1],[truss.members[2],truss.L,truss.posts[0],1],[truss.members[3],truss.R,truss.posts[2],-1]]){
  const p=new T.Vector3(...node).addScaledVector(member.axis,.06*inward),depth=member.depthAxis;
  for(const side of[-1,1]){const direction=depth.clone().multiplyScalar(side),inner=firstExit(member,p,direction),outer=firstExit(post,p,direction),offset=outer-inner;assert(offset>.019,'at least 19mm actual bilateral timber/post surface step');jointOffsets.push({first:member.label,second:post.label,point:p.toArray(),direction:direction.toArray(),offset});}
 }
 // The actual .24m lower chord and .16m kingpost have 40mm bilateral steps.
 const p=new T.Vector3(...truss.S).add(new T.Vector3(-.035,0,0));
 for(const side of[-1,1]){const d=new T.Vector3(0,0,side),offset=firstExit(truss.members[0],p,d)-firstExit(truss.king,p,d);assert(Math.abs(offset-.04)<8e-5,'actual kingpost/lower-chord 40mm depth step '+JSON.stringify({offset,inner:firstExit(truss.king,p,d),outer:firstExit(truss.members[0],p,d),side,point:p.toArray()}));jointOffsets.push({first:truss.king.label,second:truss.members[0].label,point:p.toArray(),direction:d.toArray(),offset});}
 const apexPoint=new T.Vector3(...truss.A).addScaledVector(truss.members[2].axis,-.035);
 for(const side of[-1,1]){const d=new T.Vector3(0,0,side),offset=firstExit(truss.members[2],apexPoint,d)-firstExit(truss.king,apexPoint,d);assert(Math.abs(offset-.02)<8e-5,'actual upper-chord/kingpost 20mm bilateral step');jointOffsets.push({first:truss.king.label,second:truss.members[2].label,point:apexPoint.toArray(),direction:d.toArray(),offset});}
 // Both ends of the lower/upper chord pairs must have actual 20mm stepped
 // side surfaces at their positive-volume joint, including the skew court end.
 for(const [lower,upper,node,inward]of[[truss.members[0],truss.members[2],truss.L,1],[truss.members[1],truss.members[3],truss.R,-1]]){
  assert(Math.abs(lower.depthAxis.dot(upper.depthAxis))>1-1e-8,'paired lower/upper actual side planes parallel');
  const p=new T.Vector3(...node).addScaledVector(lower.axis,.035*inward).addScaledVector(upper.axis,.035*inward);
  assert(containsSolid(lower,p)&&containsSolid(upper,p),'real positive-volume lower/upper overlap');
  for(const side of[-1,1]){const d=lower.depthAxis.clone().multiplyScalar(side),outer=firstExit(lower,p,d),inner=firstExit(upper,p,d),offset=outer-inner;assert(Math.abs(offset-.02)<8e-5,'actual 20mm lower/upper stepped side at L and R');jointOffsets.push({first:upper.label,second:lower.label,point:p.toArray(),direction:d.toArray(),offset});}
 }
}
// Exact analytic envelope of each rigid, linearly translating original child.
// The source law was compared byte-for-byte above; each transformed vertex is
// affine in phase, so its extrema occur at the two endpoints for all t in [0,1].
const sweeps=[];let sweepTriangleChecks=0;
for(const mesh of carrier.children){
 mesh.updateMatrix();const box=new T.Box3(),p=mesh.geometry.attributes.position;
 for(let j=0;j<p.count;j++){const v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(mesh.matrix);box.expandByPoint(v.clone().add(new T.Vector3(-3.04,3.48,-7.7)));box.expandByPoint(v.clone().add(new T.Vector3(-3.04,3.48,7.7)));}
 assert(box.min.y>2.4,'full linear sweep retains pedestrian headroom');
 const clearance=box.clone().expandByScalar(.025);
 for(const t of fixed){assert(!clearance.intersectsTriangle(t.triangle),'25mm clearance to entire analytic task-light sweep');sweepTriangleChecks++;}
 for(const s of allSolids)assert(!containsSolid(s,clearance.getCenter(new T.Vector3())),'task-light sweep not enclosed in new solid');
 sweeps.push({mesh:mesh.name,phase:[0,1],translationZ:[-7.7,7.7],bounds:[box.min.toArray(),box.max.toArray()],clearanceBounds:[clearance.min.toArray(),clearance.max.toArray()]});
}
assert.equal(sweeps.length,3);
// Every intersection against all four retained sloped roof slabs is clipped in
// each slab's real transformed coordinates. The entire seam must fit within its
// actual collar envelope; an AABB intersection alone cannot prove roof contact.
const roofContactProofs=[],roofContactSolids=new Set();let roofContactTriangles=0;
for(const roof of[sharedRoof,...trusses.map(t=>t.leftRoof)]){
 const inverse=roof.matrix.clone().invert();
 for(const s of allSolids){let count=0;const clipped=[];
  for(const face of s.faces){const hit=clipTriangle(face.map(v=>v.clone().applyMatrix4(inverse)),roof.localBox);if(!hit.length)continue;count++;roofContactTriangles++;roofContactSolids.add(s);
   const site=roofSites.find(site=>site.roofs.includes(roof)&&(site.post===s||site.collar===s));assert(site,'only specified pier/collar enters an original sloped roof');
   for(const p of hit){const world=p.clone().applyMatrix4(roof.matrix);assert(Math.abs(world.x-site.x)<=.23+6e-5&&Math.abs(world.z-site.z)<=.23+6e-5&&world.y>=site.collarLo-6e-5&&world.y<=site.collarHi+6e-5,'entire actual roof seam concealed inside real collar extent');clipped.push(world);}
  }
  if(count){const bounds=new T.Box3().setFromPoints(clipped);roofContactProofs.push({solid:s.label,roofCenter:roof.center.toArray(),triangles:count,bounds:[bounds.min.toArray(),bounds.max.toArray()]});}
 }
}
assert.equal(roofContactSolids.size,18,'exactly nine pier extensions and nine collars intersect roofs');assert.equal(roofContactProofs.length,24,'all twelve actual roof locations have both pier and collar seams');
// Whole original plaque and populated inclined reading plane viewing prisms.
const textFaces=[];b.root.traverse(o=>{if(o.isMesh&&o.geometry.type==='PlaneGeometry'&&(o.material.map||reading.faces.includes(o)))textFaces.push(o);});
assert.equal(textFaces.length,2);
let textTriangleChecks=0;const textProofs=[];
function hullPlanes(points){const planes=[];for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)for(let k=j+1;k<points.length;k++){const n=points[j].clone().sub(points[i]).cross(points[k].clone().sub(points[i]));if(n.length()<1e-8)continue;n.normalize();let c=n.dot(points[i]);const ds=points.map(p=>n.dot(p)-c);if(ds.some(d=>d>1e-7)&&ds.some(d=>d< -1e-7))continue;if(ds.some(d=>d>1e-7)){n.negate();c=-c;}if(!planes.some(p=>p.n.distanceTo(n)<1e-6&&Math.abs(p.c-c)<1e-6))planes.push({n,c});}assert(planes.length>=4);return planes;}
function clipHull(face,planes){let poly=face.map(v=>v.clone());for(const {n,c}of planes){const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=c-n.dot(a),db=c-n.dot(b);if(da>=-1e-8)next.push(a);if((da<0)!==(db<0))next.push(a.clone().lerp(b,da/(da-db)));}poly=next;if(!poly.length)break;}return poly;}
for(const face of textFaces){
 face.geometry.computeBoundingBox();const bb=face.geometry.boundingBox,inverse=face.matrixWorld.clone().invert(),scale=new T.Vector3().setFromMatrixScale(face.matrixWorld),volume=new T.Box3(new T.Vector3(bb.min.x,bb.min.y,.001/scale.z),new T.Vector3(bb.max.x,bb.max.y,1.5/scale.z));
 for(const t of fixed){assert(!volume.intersectsTriangle(new T.Triangle(...t.points.map(v=>v.clone().applyMatrix4(inverse)))),'whole original text viewing prism');textTriangleChecks++;}
 const corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,y])=>new T.Vector3(x<0?bb.min.x:bb.max.x,y<0?bb.min.y:bb.max.y,.001).applyMatrix4(face.matrixWorld)),center=new T.Vector3().setFromMatrixPosition(face.matrixWorld),isReading=reading.faces.includes(face),eye=isReading?new T.Vector3(initialReadingPlacement[0].view[0],1.65,initialReadingPlacement[0].view[1]):center.clone().add(new T.Vector3(0,0,1).transformDirection(face.matrixWorld).multiplyScalar(3));
 const planes=hullPlanes([...corners,eye]);
 for(const t of fixed){assert(!clipHull(t.points,planes).length,'all sightlines from actual viewing point to entire original text face');textTriangleChecks++;}
 for(const s of allSolids)assert(!containsSolid(s,eye.clone().add(center).multiplyScalar(.5)),'text view not enclosed inside new solid');
 textProofs.push({name:face.name,center:center.toArray(),eye:eye.toArray(),depth:1.5,localBounds:[volume.min.toArray(),volume.max.toArray()],sightlineHullPlanes:planes.map(p=>({normal:p.n.toArray(),constant:p.c}))});
}
const fields=[
 ...[-7.1,-2.35,3.35].map((z,i)=>({name:'complete receiving worktable, paper and active field '+(i+1),min:[-8.275,.15,z-.825],max:[-4.725,3.5,z+.825]})),
 {name:'continuous usable service worktop and full working field',min:[-3.49,.15,-8.725],max:[-2.59,3.35,8.625]},
 {name:'original continuous overhead service rail',min:[-3.30,3.35,-8.95],max:[-2.78,3.85,8.8]},
 {name:'whole shared output worktable, paper and working court',min:[3.325,.15,-1.5],max:[7.575,6.3,2.7]},
 {name:'shared court bench and seated body field',min:[3.55,.15,-2.96],max:[7.35,2.4,-1.94]},
 {name:'empty successor station retains its entire unobstructed new-construction column',min:[3.35,.15,6.125],max:[7.15,12,7.675]},
 {name:'open rear exit beyond successor station',min:[-1.8,.15,9.35],max:[7.15,12,9.8]},
 {name:'first receiving roof gap sky strip',min:[-9,7.8,-5.1],max:[-2.65,12,-4.65]},
 {name:'second receiving roof gap sky strip',min:[-9,7.8,-.05],max:[-2.65,12,.25]}
];
let fieldTriangleChecks=0;
for(const field of fields){const box=new T.Box3(new T.Vector3(...field.min),new T.Vector3(...field.max));for(const t of fixed){assert(!box.intersectsTriangle(t.triangle),'whole preserved working/open field '+field.name);fieldTriangleChecks++;}for(const s of allSolids)assert(!containsSolid(s,box.getCenter(new T.Vector3())),'field not wholly enclosed by new solid '+field.name);}
const oldOpenFields=fields.filter(f=>f.name.includes('roof gap'));let originalOpeningTriangleChecks=0;
for(const field of oldOpenFields){const box=new T.Box3(new T.Vector3(...field.min),new T.Vector3(...field.max));for(const t of actual){assert(!box.intersectsTriangle(t.triangle),'actual original and new roof-gap sky volume '+field.name);originalOpeningTriangleChecks++;}}
// Check all retained glazing and exposed reading paper sheets with actual triangle
// bounds, not metadata labels. No new material hides their original surfaces.
const protectedOriginals=originals.filter(o=>o.object.material.transparent||((o.box.max.x< -8.4)&&(o.box.min.y>1)&&(o.box.max.y<4))),protectedSurfaceProofs=[];let protectedTriangleChecks=0;
assert(protectedOriginals.length>=4);
for(const o of protectedOriginals){const inverse=o.matrix.clone().invert();for(const t of fixed){assert(!o.localBox.intersectsTriangle(new T.Triangle(...t.points.map(v=>v.clone().applyMatrix4(inverse)))),'original glass/paper surface remains clear');protectedTriangleChecks++;}for(const s of allSolids)assert(!containsSolid(s,o.center),'original surface not hidden inside new solid');protectedSurfaceProofs.push({center:o.center.toArray(),bounds:[o.box.min.toArray(),o.box.max.toArray()]});}
const second=build(now).root.getObjectByName('handover-blender-static');assert.notEqual(detail,second);
for(let i=0;i<2;i++){assert.equal(detail.children[i].geometry,second.children[i].geometry,'shared cached geometry');assert.equal(detail.children[i].material,second.children[i].material,'shared neutral material');}
const result={passed:true,audit:'independent actual runtime geometry and production reading',building:19,baseline,assetSha256:crypto.createHash('sha256').update(fs.readFileSync(root+'/assets/handover-detail.js')).digest('hex'),triangles:fixed.length,calls:detail.children.length,closedSolidComponents:allSolids.length,actualBounds:[totalBounds.min.toArray(),totalBounds.max.toArray()],shapeProofs,sectionRays,jointOffsets,positiveContactCount:contactProofs.length,contactProofs,allSolidsConnectedToOriginal:true,roofContactTriangles,roofContactSolids:roofContactSolids.size,roofContactProofs,allOriginalMeshes:originalState(before).length,originalColliderCount:b.collisionBoxes.length,checkedPhases:phases.length,originalPoseProofs,originalMeshMaterialTransformCanvasIdentity:true,originalPhysicalAndReadingCollisionsPreserved:true,continuousSweeps:sweeps,sweepTriangleChecks,clearanceMargin:.025,bodyHeight:2.4,bodySegments,bodyTriangleChecks,bodyCollisionChecks,routes,fullPassages,textFaces:textFaces.length,textTriangleChecks,textProofs,fieldTriangleChecks,fields,originalOpeningTriangleChecks,oldOpenFields,protectedSurfaceCount:protectedOriginals.length,protectedTriangleChecks,protectedSurfaceProofs,readingPlacement:initialReadingPlacement,readingSectionsChecked:now.CourtyardReadingCatalog[19].sections.length,readingDrawProofs,exportedMeshes:meshes.length,sharedGeometry:true,sharedMaterials:true,sourceReviewDates:{architecture:source19.reviewed_at,reading:readingSource.reviewedAt},limits:['CPU geometry and conservative continuous-volume checks only','No browser navigation, GPU performance, FPS, loading or structural certification','Canvas operations verify active original text identity; assembly export omits raster texture pixels','Additive collar walls and pier extensions overlap retained sloped roof slabs; no old roof, frame, collider, glazing or text is cut or replaced','Only reviewed privacy-edited public reading is retained; no private source recovery or new narrative factual claims']};
fs.writeFileSync(out+'/checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
