/* Independent CPU audit of actual building 13: continuous human ridge and discontinuous tool frames, uninterrupted
   original content/motion, continuous ten-panel yaw sweeps and complete reading fields.
   This does not run a browser, navigation controls, GPU frames or structural analysis. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js'),out=root+'/qa-results/session';fs.mkdirSync(out,{recursive:true});
const baseline='84b26b5b79f14eb0f390ac3f9b38fc519ef72141';
function load(old){
 const c={console,document:{createElement(){const canvas={width:0,height:0,operations:[]};canvas.getContext=()=>new Proxy({measureText:t=>({width:String(t).length*10}),createLinearGradient:()=>({addColorStop(...args){canvas.operations.push(['addColorStop',...args]);}})},{get:(o,k)=>o[k]||((...args)=>canvas.operations.push([k,...args])),set:(o,k,v)=>{canvas.operations.push(['set',k,v]);o[k]=v;return true;}});return canvas;}}};c.window=c;vm.createContext(c);
 for(const n of [...(!old?['rss-detail']:[]),'architecture','content-core',...(!old&&fs.existsSync(root+'/assets/session-detail.js')?['session-detail']:[]),'content-narratives','reading-catalog','reading-panels']){const file='assets/'+n+'.js',source=old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{encoding:'utf8',maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file,'utf8');vm.runInContext(source,c,{filename:file});}return c;
}
const now=load(false),old=load(true),build=c=>c.CourtyardArchitecture.build({THREE:T,index:13,title:'与 AI 同行的两年',zone:0});
const b=build(now),before=build(old),detail=b.root.getObjectByName('session-blender-static');
const extra=o=>{for(let p=o;p;p=p.parent)if(p.name==='session-blender-static')return true;return false;};
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function materialState(m){return{type:m.type,color:m.color?.toArray(),emissive:m.emissive?.toArray(),emissiveIntensity:m.emissiveIntensity,opacity:m.opacity,metalness:m.metalness,roughness:m.roughness,side:m.side,transparent:m.transparent,depthTest:m.depthTest,depthWrite:m.depthWrite,alphaTest:m.alphaTest,blending:m.blending,vertexColors:m.vertexColors,wireframe:m.wireframe,map:m.map?{type:m.map.type,width:m.map.image?.width,height:m.map.image?.height,canvasOperations:m.map.image?.operations,dataSha256:m.map.image?.data?crypto.createHash('sha256').update(Buffer.from(m.map.image.data.buffer,m.map.image.data.byteOffset,m.map.image.data.byteLength)).digest('hex'):null,wrapS:m.map.wrapS,wrapT:m.map.wrapT,minFilter:m.map.minFilter,magFilter:m.map.magFilter,generateMipmaps:m.map.generateMipmaps,flipY:m.map.flipY,repeat:m.map.repeat.toArray(),offset:m.map.offset.toArray(),encoding:m.map.encoding}:null};}
function eachMesh(building,fn){building.root.updateMatrixWorld(true);building.root.traverse(o=>{if(!o.isMesh)return;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const instance=new T.Matrix4();o.getMatrixAt(i,instance);matrix.multiply(instance);}fn(o,matrix,i);}});}
function originalState(building){const rows=[];eachMesh(building,(o,matrix,i)=>{if(extra(o))return;rows.push({name:o.name,instance:i,attrs:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,{itemSize:a.itemSize,normalized:a.normalized,array:Array.from(a.array)}])),index:o.geometry.index?Array.from(o.geometry.index.array):null,groups:o.geometry.groups,matrix:matrix.toArray(),materials:(Array.isArray(o.material)?o.material:[o.material]).map(materialState),visible:o.visible,ancestors:(()=>{const a=[];for(let p=o.parent;p;p=p.parent)a.push({name:p.name,visible:p.visible,matrix:p.matrix.toArray()});return a;})(),castShadow:o.castShadow,receiveShadow:o.receiveShadow});});return rows;}
function trianglesOf(building,predicate=()=>true){const all=[];eachMesh(building,(o,matrix,i)=>{if(!predicate(o))return;const p=o.geometry.attributes.position,index=o.geometry.index;for(let j=0;j<(index?index.count:p.count);j+=3){const points=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index?index.getX(j+k):j+k).applyMatrix4(matrix));all.push({points,triangle:new T.Triangle(...points),box:new T.Box3().setFromPoints(points),name:o.name,instance:i,object:o});}});return all;}
// Export the actual production assembly with its address plaque and actual production reading surfaces.
const reading=now.CourtyardReadingPanels.attach({THREE:T,building:b,index:13,preview:now.CourtyardReadingCatalog[13]});
const oldReading=old.CourtyardReadingPanels.attach({THREE:T,building:before,index:13,preview:old.CourtyardReadingCatalog[13]});assert(reading&&oldReading);
// Unframed production walls allocate their Canvas only when a visitor is near.
// Activate both real reading faces before every capture, not an empty-material proxy.
for(const controller of[reading,oldReading]){controller.update({x:0,y:1.65,z:5.8});assert(controller.faces.every(f=>f.material.map?.image?.operations?.some(op=>op[0]==='fillText')),'production reading Canvas is populated');}
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
// Exact complete original assembly identity across the actual phase law and reversals.
const phases=[0,.25,.5,.75,1,.4,0,1],panels=b.root.getObjectByName('ten-session-tool-layers');
assert(panels&&panels.children.length===10,'ten original independently turning tool panels');
const collisionState=x=>JSON.stringify(x.collisionBoxes.map(q=>[q.min.toArray(),q.max.toArray(),q.userData]));
assert.equal(collisionState(b),collisionState(before),'every original physical and production-reading collider');
for(const k of ['visitorRoutes','visitorRouteBodyRadius','observations','evidence','contentConcept','phaseLabels','shortPhaseLabels','mechanism','readingPanels','entrances','circulationWidth','interactionHint','evidenceURLs','sourceTitle','sourceReadScope','interpretation','phaseValues','axialBodyClearance','spatialIdentity'])
 assert.equal(JSON.stringify(b.metadata[k]),JSON.stringify(before.metadata[k]),'retained '+k);
assert.equal(JSON.stringify(b.mechanisms.map(m=>({name:m.name,kind:m.kind}))),JSON.stringify(before.mechanisms.map(m=>({name:m.name,kind:m.kind}))),'original mechanism identity');
assert.equal(b.mechanisms.length,1);
const originalPoseProofs=[];
for(const phase of phases){
 for(const x of[b,before])for(const m of x.mechanisms)m.articulate(phase);
 const state=hash(originalState(b));
 assert.equal(state,hash(originalState(before)),'every original mesh/material/transform/Canvas draw at phase '+phase);
 assert.equal(collisionState(b),collisionState(before),'every original collider at phase '+phase);
 for(const[n,panel]of panels.children.entries()){
  assert.equal(panel.children.length,3,'one translucent skin and both original edging bars');
  assert.deepEqual(panel.position.toArray(),[8.27,3.6,-9+2*n]);
  assert.deepEqual(panel.scale.toArray(),[1,1,1]);
  assert.equal(panel.rotation.x,0);assert.equal(panel.rotation.z,0);
  assert(Math.abs(panel.rotation.y-(n%2?1:-1)*phase*.26)<1e-12,'exact alternating original yaw law');
  assert(panel.children[0].material.transparent,'original translucent material remains transparent');
  assert(Math.abs(panel.children[0].material.opacity-(.14+n*.03+phase*.18))<1e-12,'exact original independent opacity law');
 }
 originalPoseProofs.push({phase,sha256:state});
}
const readingFile='assets/readings/13.json',readingSource=JSON.parse(fs.readFileSync(root+'/'+readingFile,'utf8'));
for(const file of[readingFile,'assets/reading-catalog.js','assets/reading-panels.js','docs/content-map.json'])
 assert.equal(fs.readFileSync(root+'/'+file,'utf8'),cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{encoding:'utf8',maxBuffer:32*1024*1024}),'original reviewed content byte identity '+file);
assert.equal(readingSource.reviewedAt,'2026-10-09');assert.equal(readingSource.coverage,'privacy-edited');assert.equal(readingSource.source,null);
assert.deepEqual(readingSource.sections.map(s=>s.id),['opening','s1','s2','s3','s4','s5','s6','s7','s8','s9','s10','source-note']);
assert(readingSource.sections.every(s=>s.source===null),'original privacy-preserving omitted reverse links');
assert(readingSource.coverageNotes.join('\n').includes('不把本版本称为逐字复录'),'accurate edited-text disclosure retained');
assert(readingSource.provenance.publicTextAttribution.includes('不提供可反查该身份的原文回链'),'no restored private identity backlink');
const paragraphs=readingSource.sections.flatMap(s=>s.paragraphs).join('\n');
for(const term of['提前宣告失败','whoami','解读为叙述者基于档案的推断'])assert(paragraphs.includes(term),'retained uncertainty '+term);
const source13=JSON.parse(fs.readFileSync(root+'/docs/content-map.json','utf8')).items.find(x=>x.index===13);
assert.deepEqual(source13.evidence,JSON.parse(JSON.stringify(b.metadata.evidence.map(q=>q.url))));
assert.equal(reading.faces.length,1);assert(initialReadingPlacement.every(p=>p.kind==='book-rest'));
const readingDrawProofs=[];
function verifyReading(label){
 assert.equal(hash(originalState(b)),hash(originalState(before)),label+' preserves all original objects and active Canvas operations');
 const draw=reading.faces.map(face=>face.material.map.image.operations.filter(op=>op[0]==='fillText'));
 assert(draw.every(ops=>ops.length>4),'actual production reading face has populated text');
 readingDrawProofs.push({label,faces:draw.map(ops=>({drawCalls:ops.length,sha256:hash(ops)}))});
}
for(const phase of[0,1,2]){reading.setPhase(phase);oldReading.setPhase(phase);verifyReading('reading phase '+phase);}
assert.equal(now.CourtyardReadingCatalog[13].sections.length,12);
for(const section of now.CourtyardReadingCatalog[13].sections){assert(reading.setSection(section.id));assert(oldReading.setSection(section.id));verifyReading('reading section '+section.id);}
// Inspect the complete continuous volume of each route, not sparsely sampled points.
// The human track is entered around the uninterrupted ethical rail at its open rear.
const routes=[
 {name:'entire 3.6m public axis',radius:1.8,endMargin:0,points:[[0,-10.5],[0,10.5]]},
 {name:'all ten tool bays including bypass of failed-copy gap',radius:.38,points:[[0,-9.7],[7.8,-9.7],[7.8,9.8],[0,9.8]]},
 {name:'full human track entered around intact ethical rail',radius:.38,points:[[0,10.15],[-3.3,10.15],[-3.3,3.1],[-7.8,3.1],[-7.8,.3],[-5.5,.3],[-5.5,-9.9]]},
 {name:'low fatigue alcove approach',radius:.38,points:[[-3.3,3.1],[-6.3,3.1],[-6.3,3.65]]},
 {name:'human joint-authorship worktable approach',radius:.38,points:[[-5.5,.3],[-5.4,.3]]},
 {name:'tool joint-authorship worktable approach',radius:.38,points:[[7.8,.3],[5.4,.3]]},
 {name:'human final-court bench approach',radius:.38,points:[[-3.3,7.2],[-5.3,7.2]]},
 {name:'tool final-court bench approach',radius:.38,points:[[7.8,7.2],[5.3,7.2]]},
 ...JSON.parse(JSON.stringify(b.metadata.visitorRoutes||[])).map(r=>({...r,radius:r.bodyRadius})),
 ...initialReadingPlacement.map((p,i)=>({name:'production reading stop '+(i+1)+' full approach',radius:.38,points:[[0,p.view[1]],p.view]}))
];
const actual=trianglesOf(b);let bodyTriangleChecks=0,bodyCollisionChecks=0,bodySegments=0,equivalentTenCentimetreSamples=0;
for(const route of routes){route.samples=0;for(let i=1;i<route.points.length;i++){
 const a=route.points[i-1],end=route.points[i],dx=end[0]-a[0],dz=end[1]-a[1],length=Math.hypot(dx,dz),inverse=new T.Matrix4().makeRotationY(Math.atan2(dx,dz));
 inverse.setPosition(a[0],0,a[1]);inverse.invert();const endMargin=route.endMargin??route.radius,box=new T.Box3(new T.Vector3(-route.radius,.15,-endMargin),new T.Vector3(route.radius,2.4,length+endMargin));
 for(const t of actual){assert(!box.intersectsTriangle(new T.Triangle(...t.points.map(v=>v.clone().applyMatrix4(inverse)))),'continuous actual body/headroom '+route.name+' '+JSON.stringify({name:t.name,instance:t.instance,points:t.points.map(v=>v.toArray())}));bodyTriangleChecks++;}
 for(const collision of b.collisionBoxes){
  if(collision.min.y>=2.4||collision.max.y<=.15)continue;
  assert(!collision.containsPoint(new T.Vector3((a[0]+end[0])/2,1,(a[1]+end[1])/2)),'route is not enclosed inside physical collider '+route.name);
  const geom=new T.BoxGeometry(1,1,1),center=collision.getCenter(new T.Vector3()),size=collision.getSize(new T.Vector3()),matrix=new T.Matrix4().compose(center,new T.Quaternion(),size).premultiply(inverse),p=geom.attributes.position,index=geom.index;
  for(let j=0;j<index.count;j+=3)assert(!box.intersectsTriangle(new T.Triangle(...[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index.getX(j+k)).applyMatrix4(matrix)))),'actual physical collider body/headroom '+route.name+' '+collision.userData?.part);
  geom.dispose();bodyCollisionChecks++;
 }
 bodySegments++;const count=Math.ceil(length/.1)+1;equivalentTenCentimetreSamples+=count;route.samples+=count;
}}
if(process.argv.includes('--original-only')){const result={passed:true,originalMeshes:originalState(before).length,originalPoseProofs,readingDrawProofs,bodySegments,bodyTriangleChecks,bodyCollisionChecks,routes};fs.writeFileSync(out+'/original-checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));process.exit(0);}
assert(detail&&detail.parent===b.root,'additive Session detail is attached');
assert.equal(b.width,before.width,'original floor-layout width');assert.equal(b.depth,before.depth,'original floor-layout depth');
assert.equal(detail.children.length,2,'two added shared material batches');
const fixed=trianglesOf(b,extra);assert(fixed.length>0&&fixed.length<3500,'strict sub-3500 triangle addition');
for(const t of fixed)assert(t.triangle.getArea()>1e-9,'nondegenerate detail triangle');
for(const mesh of detail.children){
 assert(mesh.isMesh);assert.deepEqual(mesh.matrix.toArray(),new T.Matrix4().toArray(),'no hidden batch transform');
 mesh.geometry.computeBoundingBox();assert(b.metadata.bounds.containsBox(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)),'complete actual culling bounds');
 const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;assert.equal(p.count,n.count);
 for(const x of[...p.array,...n.array])assert(Number.isFinite(x));
 for(let i=0;i<n.count;i++)assert(Math.abs(new T.Vector3().fromBufferAttribute(n,i).length()-1)<1e-5,'unit surface normal');
 assert(mesh.castShadow&&mesh.receiveShadow);assert(!(mesh.material.map?.image?.operations||[]).some(op=>op[0]==='fillText'),'new surfaces carry no invented text');
}
assert(Math.abs(b.height-b.metadata.bounds.max.y)<1e-12,'public height reaches every added component');
// Reconstruct connected solids from runtime triangles only. Generator component
// ranges, IDs, dimensions, contact labels and topology metadata are not proof.
const cedar=components(detail.children.find(o=>o.name==='session-static-cedar')),
 bronze=components(detail.children.find(o=>o.name==='session-static-bronze')),
 allSolids=[...cedar,...bronze],totalBounds=new T.Box3();
allSolids.forEach(s=>totalBounds.union(s.bounds));
assert.equal(cedar.length,25);assert.equal(bronze.length,57);assert.equal(allSolids.length,82);assert.equal(fixed.length,2384);
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
// The independent specification is fixed in this audit, never read from model metadata.
const stations=[-9.55,-5.8,-2.05,1.7,5.45,9.2],toolHeights=[5.1,5.45,5.8,6.05,5.55,6.8,5.7,7.1,6.8,7.25];
const ridge=exactBox(cedar,'continuous human timber ridge',[-5.5,9.65,0],[.34,.36,20.1],.008),leftSites=[],rightSites=[],toolFrames=[];
const mainRoof=oldAt([-5.5,6.5,0],[6.44,.12,20.22]);
for(const z of stations)for(const x of[-8.45,-2.65]){
 const prefix='human '+x+' '+z,post=exactBox(cedar,prefix+' pier extension',[x,6.62,z],[.28,1,.28],.008),rafter=exactBeam(prefix+' rising rafter',[x,7,z],[-5.5,9.65,z],.26,.24,.008),sleeve=exactSleeve(prefix+' roof sleeve',[x,6.46,z],.44,.26,.6),pier=oldAt([x,3.225,z],[.22,6.15,.22]);
 join(post,{original:pier,kind:'continuous human-side pier'},[x,6.2,z],prefix+' extension into old pier');
 join(sleeve,post,[x+.135,6.6,z],prefix+' sleeve wall into timber');
 join(rafter,post,new T.Vector3(x,7,z).addScaledVector(rafter.axis,.035),prefix+' rafter into extended pier');
 join(rafter,ridge,new T.Vector3(-5.5,9.65,z).addScaledVector(rafter.axis,-.035),prefix+' rafter into ridge');
 join(sleeve,{original:mainRoof,kind:'human track main roof'},[x+(x<-5?.17:-.17),6.5,z],prefix+' sleeve wall into actual roof');
 leftSites.push({x,z,post,rafter,sleeve});
}
for(let n=0;n<10;n++){
 if(n===4)continue;const z=-9+2*n,h=toolHeights[n],prefix='tool session '+(n+1),beam=exactBox(bronze,prefix+' independent crossbeam',[5.75,h+.88,z],[5.8,.18,.22]),roof=oldAt([5.75,h+.29,z],[5.69,.12,1.9]);
 const frame={session:n+1,z,h,beam,posts:[],sleeves:[],roof};
 for(const x of[3.05,8.45]){
  const post=exactBox(bronze,prefix+' '+x+' extension',[x,h+.42,z],[.18,1.04,.18]),sleeve=exactSleeve(prefix+' '+x+' roof sleeve',[x,h+.22,z],.32,.16,.48),pier=oldAt([x,h/2+.15,z],[x<5?.18:.19,h,x<5?.18:.19]);
  join(post,{original:pier,kind:'original tool-track pier'},[x,h+.04,z],prefix+' '+x+' frame post into old pier');
  join(sleeve,post,[x+.085,h+.22,z],prefix+' '+x+' sleeve wall into frame post');
  join(post,beam,[x,h+.88,z],prefix+' '+x+' post into independent crossbeam');
  join(sleeve,{original:roof,kind:'individual tool-bay roof'},[x+(x<5?.13:-.13),h+.29,z],prefix+' '+x+' sleeve wall into actual roof');
  rightSites.push({n,x,z,h,post,sleeve,roof});frame.posts.push(post);frame.sleeves.push(sleeve);
 }
 toolFrames.push(frame);
}
// Measure the actual exposed joint surfaces, not just the new nominal widths.
// Matching triangle faces must exist at the same in-plane joint coordinate, with
// 10mm timber and 20mm metal offsets on BOTH sides, avoiding coplanar exteriors.
const exposedJointOffsets=[];
function measuredSide(s,side){
 const normal=new T.Vector3(0,0,side),faces=s.faces.filter(f=>new T.Triangle(...f).getNormal(new T.Vector3()).dot(normal)>1-1e-8);
 assert(faces.length>=2,'actual exposed parallel side faces '+s.label);
 const coordinate=faces[0][0].z;
 for(const face of faces)for(const v of face)assert(Math.abs(v.z-coordinate)<8e-5,'one actual side plane '+s.label);
 return{coordinate,faces};
}
function pairedJointOffset(a,b,joint,expected,label){
 for(const side of[-1,1]){
  const A=measuredSide(a,side),B=measuredSide(b,side),pA=new T.Vector3(joint.x,joint.y,A.coordinate),pB=new T.Vector3(joint.x,joint.y,B.coordinate);
  assert(boundaryDistance(A.faces,pA)<8e-5,'actual first exterior side covers this joint '+label);
  assert(boundaryDistance(B.faces,pB)<8e-5,'actual second exterior side covers this joint '+label);
  const offset=side*(B.coordinate-A.coordinate);
  assert(offset>=expected-8e-5&&Math.abs(offset-expected)<8e-5,'measured positive side-plane offset '+label);
  exposedJointOffsets.push({label,side,first:a.label,second:b.label,firstSurfacePoint:pA.toArray(),secondSurfacePoint:pB.toArray(),offset});
 }
}
for(const site of leftSites)pairedJointOffset(site.rafter,site.post,new T.Vector3(site.x,7,site.z).addScaledVector(site.rafter.axis,.06),.01,'rafter inset inside extended human pier');
for(const frame of toolFrames)for(const post of frame.posts){const center=post.bounds.getCenter(new T.Vector3());pairedJointOffset(post,frame.beam,new T.Vector3(center.x,frame.h+.88,frame.z),.02,'portal head projects beyond tool leg');}
assert.equal(exposedJointOffsets.length,60,'both actual exterior sides at twelve timber and eighteen metal joints');
assert.equal(used.size,82,'every actual connected solid has independently checked topology and dimensions');
const connected=new Set(sources),pending=[...sources];while(pending.length){const s=pending.pop();for(const neighbor of graph.get(s))if(!connected.has(neighbor)){connected.add(neighbor);pending.push(neighbor);}}
assert.equal(connected.size,82,'every actual new solid has a positive-volume path into original construction');
// All thirty actual moving members are bounded analytically over their entire
// continuous yaw intervals. This is not a finite-pose collision approximation.
function waveRange(a,b,lo,hi){const f=t=>a*Math.cos(t)+b*Math.sin(t),values=[f(lo),f(hi)],base=Math.atan2(b,a);for(let k=-3;k<=3;k++){const theta=base+k*Math.PI;if(theta>lo&&theta<hi)values.push(f(theta));}return[Math.min(...values),Math.max(...values)];}
const sweeps=[];let sweepTriangleChecks=0;
for(const[n,panel]of panels.children.entries())for(const mesh of panel.children){
 const theta=n%2?[0,.26]:[-.26,0],origin=new T.Vector3(8.27,3.6,-9+2*n),box=new T.Box3(),p=mesh.geometry.attributes.position;mesh.updateMatrix();
 for(let j=0;j<p.count;j++){
  const v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(mesh.matrix),x=waveRange(v.x,v.z,...theta),z=waveRange(v.z,-v.x,...theta);
  box.expandByPoint(new T.Vector3(x[0],v.y,z[0]).add(origin));box.expandByPoint(new T.Vector3(x[1],v.y,z[1]).add(origin));
 }
 assert(box.min.y>2.4,'entire moving panel and edging sweep clears body headroom');
 const clearance=box.clone().expandByScalar(.025);
 for(const t of fixed){assert(!clearance.intersectsTriangle(t.triangle),'25mm clearance from entire continuous tool-panel yaw sweep');sweepTriangleChecks++;}
 for(const s of allSolids)assert(!containsSolid(s,box.getCenter(new T.Vector3())),'panel sweep is not enclosed within a new solid');
 sweeps.push({session:n+1,mesh:mesh.name,phase:[0,1],rotationY:theta,opacity:mesh===panel.children[0]?[.14+n*.03,.32+n*.03]:null,bounds:[box.min.toArray(),box.max.toArray()],clearanceBounds:[clearance.min.toArray(),clearance.max.toArray()]});
}
assert.equal(sweeps.length,30);
// Actual old top plates are checked in their transformed triangle coordinates.
// The full new/old seam must be covered by the real hollow foot's outer envelope.
const roofContactProofs=[];let roofContactTriangles=0;const roofContactSolids=new Set();
for(const roof of[mainRoof,...toolFrames.map(f=>f.roof)]){
 const inverse=roof.matrix.clone().invert();
 for(const s of allSolids){let count=0;const clipped=[];
  for(const face of s.faces){const hit=clipTriangle(face.map(v=>v.clone().applyMatrix4(inverse)),roof.localBox);if(!hit.length)continue;count++;roofContactTriangles++;roofContactSolids.add(s);
   const site=roof===mainRoof?leftSites.find(p=>p.post===s||p.sleeve===s):rightSites.find(p=>p.roof===roof&&(p.post===s||p.sleeve===s));
   assert(site,'only specified pier extensions and their real sleeve walls enter retained roofs');
   const half=roof===mainRoof?.22:.16,lo=roof===mainRoof?6.16:site.h-.02,hi=roof===mainRoof?6.76:site.h+.46;
   for(const p of hit){const world=p.clone().applyMatrix4(roof.matrix);assert(Math.abs(world.x-site.x)<=half+6e-5&&Math.abs(world.z-site.z)<=half+6e-5&&world.y>=lo-6e-5&&world.y<=hi+6e-5,'whole actual roof seam stays inside actual sleeve envelope');clipped.push(world);}
  }
  if(count){const bounds=new T.Box3().setFromPoints(clipped);roofContactProofs.push({solid:s.label,roofCenter:roof.center.toArray(),triangles:count,bounds:[bounds.min.toArray(),bounds.max.toArray()]});}
 }
}
assert.equal(roofContactSolids.size,60,'only thirty actual extensions and thirty foot sleeves enter old roof plates');
// Verify actual old glass and ALL upper lantern roof pieces are untouched by new
// triangles and cannot be wholly enclosed inside a new component.
const glass=[oldAt([-6.9,7.2,0],[.06,1.08,19.2]),oldAt([-4.1,7.2,0],[.06,1.08,19.2])];
const upperLantern=originals.filter(o=>o.center.x<0&&o.box.min.y>7.49&&o.box.max.y<8.1);
assert(upperLantern.length>=30,'complete raised cap includes battens, perimeter rails and full roof sheets');
const protectedOriginals=[...glass,...upperLantern],lanternExclusionProofs=[];let lanternTriangleChecks=0;
for(const o of protectedOriginals){
 const inverse=o.matrix.clone().invert(); // Actual local vertex bounds conservatively include box sheets and cylindrical fasteners.
 for(const t of fixed){assert(!o.localBox.intersectsTriangle(new T.Triangle(...t.points.map(v=>v.clone().applyMatrix4(inverse)))),'new member avoids actual original lantern glass/upper roof');lanternTriangleChecks++;}
 for(const s of allSolids)assert(!containsSolid(s,o.center),'old lantern component is not enclosed in any new solid');
 lanternExclusionProofs.push({center:o.center.toArray(),bounds:[o.box.min.toArray(),o.box.max.toArray()]});
}
// Whole original plaque and actual populated tilted reading face viewing fields.
const textFaces=[];b.root.traverse(o=>{if(o.isMesh&&o.geometry.type==='PlaneGeometry'&&(o.material.map||reading.faces.includes(o)))textFaces.push(o);});
assert.equal(textFaces.length,2,'one original plaque and one actual populated production reading inscription');
let textTriangleChecks=0;const textProofs=[];
for(const face of textFaces){
 face.geometry.computeBoundingBox();const bb=face.geometry.boundingBox,inverse=face.matrixWorld.clone().invert(),scale=new T.Vector3().setFromMatrixScale(face.matrixWorld),volume=new T.Box3(new T.Vector3(bb.min.x,bb.min.y,.001/scale.z),new T.Vector3(bb.max.x,bb.max.y,1.5/scale.z));
 for(const t of fixed){assert(!volume.intersectsTriangle(new T.Triangle(...t.points.map(v=>v.clone().applyMatrix4(inverse)))),'full original text viewing volume');textTriangleChecks++;}
 textProofs.push({name:face.name,center:new T.Vector3().setFromMatrixPosition(face.matrixWorld).toArray(),depth:1.5,localBounds:[volume.min.toArray(),volume.max.toArray()]});
}
const fields=[
 {name:'complete human authorship worktop, paper and working field',min:[-7.4,.945,.825],max:[-3.4,3.5,2.475]},
 {name:'complete tool authorship worktop, paper and working field',min:[3.4,.945,.825],max:[7.4,3.5,2.475]},
 {name:'whole retained low fatigue alcove including its original canopy',min:[-8.17,.15,3.44],max:[-4.43,3.56,5.76]},
 {name:'whole human final-court seating field',min:[-6.95,.15,7.84],max:[-3.65,2.4,8.86]},
 {name:'whole tool final-court seating field',min:[3.65,.15,7.84],max:[6.95,2.4,8.86]},
 {name:'entire fifth tool-bay failed-copy opening, no new crossing',min:[2.8,4.6,-1.99],max:[8.7,12,-.01]},
 {name:'entire unresolved end court remains without new enclosure',min:[-2.3,.15,9.3],max:[2.3,12,10.5]}
];
let fieldTriangleChecks=0;
for(const field of fields){const box=new T.Box3(new T.Vector3(...field.min),new T.Vector3(...field.max));for(const t of fixed){assert(!box.intersectsTriangle(t.triangle),'full preserved activity/opening field '+field.name);fieldTriangleChecks++;}for(const s of allSolids)assert(!containsSolid(s,box.getCenter(new T.Vector3())),'preserved field is not enclosed inside a new solid '+field.name);}
const oldOpenFields=[
 {name:'entire actual missing fifth roof above retained lintel',min:[2.9,5.9,-1.95],max:[8.6,12,-.05]},
 {name:'actual unobstructed final-court sky exit beyond final lintel',min:[-1.8,2.4,9.8],max:[1.8,12,10.5]}
];let originalOpeningTriangleChecks=0;
for(const field of oldOpenFields){const box=new T.Box3(new T.Vector3(...field.min),new T.Vector3(...field.max));for(const t of actual){assert(!box.intersectsTriangle(t.triangle),'actual original and added open volume '+field.name);originalOpeningTriangleChecks++;}}
// Direct geometric proof of the continuous, opaque human-scale boundary and the
// retained low roof, rather than relying only on labels or unchanged metadata.
const humanWall=oldAt([-8.55,1.08,0],[.28,2.16,19.5]),ethicalRail=oldAt([-2.55,.53,0],[.12,1.06,19.3]),fatigueRoof=oldAt([-6.3,3.35,4.6],[3.74,.12,2.32]);
let boundarySectionRays=0;
for(const o of[humanWall,ethicalRail]){
 assert.equal(o.object.material.opacity,1);assert(!o.object.material.transparent,'human wall and ethical rail remain opaque');
 for(let y=o.box.min.y+.071;y<o.box.max.y;y+=.137)for(let z=o.box.min.z+.083;z<o.box.max.z;z+=.173){
  const ray=new T.Ray(new T.Vector3(o.box.min.x-1,y,z),new T.Vector3(1,0,0)),hits=[];
  for(const f of originalTriangles(o)){const p=ray.intersectTriangle(...f,false,new T.Vector3());if(p&&!hits.some(x=>Math.abs(x-p.x)<1e-5))hits.push(p.x);}
  assert.equal(hits.length,2,'continuous full-section actual human wall/ethical rail');boundarySectionRays++;
 }
}
// Recover the discontinuous tool frame footprints from all real positive-x solids.
const toolFootprints=[];
for(const f of toolFrames){const solids=allSolids.filter(s=>s.bounds.min.x>0&&Math.abs(s.bounds.getCenter(new T.Vector3()).z-f.z)<5e-5),bounds=new T.Box3();assert.equal(solids.length,5,'exactly five actual solids per independent tool frame');solids.forEach(s=>bounds.union(s.bounds));assert(Math.abs(bounds.min.z-(f.z-.16))<6e-5&&Math.abs(bounds.max.z-(f.z+.16))<6e-5,'full actual frame footprint');toolFootprints.push({session:f.session,bounds:[bounds.min.toArray(),bounds.max.toArray()]});}
assert.equal(allSolids.filter(s=>s.bounds.min.x>0).length,45,'no unaccounted new tool member, longitudinal tie or fifth frame');
for(let i=1;i<toolFootprints.length;i++)assert(toolFootprints[i].bounds[0][2]-toolFootprints[i-1].bounds[1][2]>=1.6799,'tool frames remain physically separated along their entire length');
const second=build(now).root.getObjectByName('session-blender-static');assert.notEqual(detail,second);
for(let i=0;i<2;i++){assert.equal(detail.children[i].geometry,second.children[i].geometry,'cached geometry in independent scene groups');assert.equal(detail.children[i].material,second.children[i].material,'cached neutral material');}
const result={passed:true,audit:'independent actual runtime geometry and production reading',building:13,baseline,assetSha256:crypto.createHash('sha256').update(fs.readFileSync(root+'/assets/session-detail.js')).digest('hex'),triangles:fixed.length,calls:detail.children.length,closedSolidComponents:allSolids.length,actualBounds:[totalBounds.min.toArray(),totalBounds.max.toArray()],shapeProofs,sectionRays,exposedJointOffsets,positiveContactCount:contactProofs.length,contactProofs,allSolidsConnectedToOriginal:true,roofContactTriangles,roofContactSolids:roofContactSolids.size,roofContactProofs,protectedLanternParts:protectedOriginals.length,lanternTriangleChecks,lanternExclusionProofs,allOriginalMeshes:originalState(before).length,checkedPhases:phases.length,originalPoseProofs,originalMeshMaterialTransformCanvasIdentity:true,originalPhysicalAndReadingCollisionsPreserved:true,continuousSweeps:sweeps,sweepTriangleChecks,clearanceMargin:.025,bodyHeight:2.4,bodySegments,bodyTriangleChecks,bodyCollisionChecks,equivalentTenCentimetreSamples,routes,textFaces:textFaces.length,textTriangleChecks,textProofs,fieldTriangleChecks,fields,originalOpeningTriangleChecks,oldOpenFields,boundarySectionRays,humanBoundaryBounds:[humanWall,ethicalRail].map(o=>[o.box.min.toArray(),o.box.max.toArray()]),fatigueRoofBounds:[fatigueRoof.box.min.toArray(),fatigueRoof.box.max.toArray()],toolFootprints,readingPlacement:initialReadingPlacement,readingSectionsChecked:now.CourtyardReadingCatalog[13].sections.length,readingDrawProofs,exportedMeshes:meshes.length,sharedGeometry:true,sharedMaterials:true,sourceReviewDates:{architecture:source13.reviewed_at,reading:readingSource.reviewedAt},limits:['CPU assembly and conservative continuous geometry checks only','No browser navigation, mobile GPU, FPS, loading or structural certification','Canvas operations verify active production text identity; runtime export omits raster texture pixels','Bronze sleeve seating additively overlaps retained roof slabs; no original roof, glass, structure, collider or text is cut or replaced','Only existing reviewed privacy-edited public reading is retained; no private source, identity recovery, new factual claim or claim of successful self-copying']};
fs.writeFileSync(out+'/checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
