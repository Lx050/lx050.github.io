/* Exact-runtime building15 audit; no browser or GPU required. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js'),out=root+'/qa-results/causal';fs.mkdirSync(out,{recursive:true});
const baseline='8038643428fc5ab0a51328bb53e3871ad6d1eab9';
function load(old,withoutOldRoofs=false){
  const c={console};c.window=c;vm.createContext(c);
  for(const name of ['architecture','content-core',...(!old?['causal-detail']:[]),'content-narratives']){
    const file='assets/'+name+'.js';let source=old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{encoding:'utf8',maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file,'utf8');
    if(withoutOldRoofs&&name==='content-narratives')for(const line of ["        b.box(roofs[n],cx,hs[n],z,n===3?1.9:2.13,.15,roofLen,[0,Math.atan2(dx,dz),0]);", "          if(Math.min(t,len-t)>.95) b.box('bronze',px,hs[n]+.1,pz,2.14,.03,.035,null,true);", "        b.box('copper',s*5.75,5.45+k*.28,z,6.95,.13,1.36);"]){assert.equal(source.split(line).length,2,'one exact approved roof/trim replacement');source=source.replace(line,'');}
    if(withoutOldRoofs&&name==='content-narratives'){const oldMount="abovePanel(b,shutters,s*5.8,5.72+k*.28,z,2.8,.075,1.24,'glassDark','knot-'+k+'-borrowed-light')",newMount=oldMount.replace('5.72','5.84').replace('k*.28,z,','k*.28,z-.95,').replace('z-.95,2.8,','z-.95,2.2,');assert.equal(source.split(oldMount).length,2,'one exact six-pivot mount-height change');source=source.replace(oldMount,newMount);}
    vm.runInContext(source,c,{filename:file});
  }
  return c;
}
const c=load(false),old=load(true),retained=load(true,true),make=context=>context.CourtyardArchitecture.build({THREE:T,index:15,title:'从因到果',zone:2});
const b=make(c),before=make(old),withoutRoofs=make(retained);b.root.updateMatrixWorld(true);
const detail=b.root.getObjectByName('causal-blender-static'),registers=b.root.getObjectByName('three-causal-court-roof-vents');assert(detail&&registers,'static geometry and original court light mechanism exist');assert.equal(detail.parent,b.root);
const vents=[];registers.traverse(o=>{if(o.name==='causal-blender-vent')vents.push(o);});assert.equal(vents.length,6,'six details attached to the six original vent pivots');
for(const vent of vents)assert(/^knot-[0-2]-borrowed-light$/.test(vent.parent.name),'each vent detail belongs to its original pivot');
const sections=c.CourtyardCausalDetail.data.sections;let triangles=0,calls=0;
for(const group of [detail,...vents])for(const mesh of group.children){
  assert(mesh.isMesh,'material batch is a mesh');calls++;const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;triangles+=p.count/3;
  assert.equal(p.count%3,0);assert.equal(n.count,p.count);for(const value of [...p.array,...n.array])assert(Number.isFinite(value),'finite positions and normals');
  for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),v=new T.Vector3().fromBufferAttribute(p,i+1),w=new T.Vector3().fromBufferAttribute(p,i+2);assert(v.sub(a).cross(w.sub(a)).length()>1e-9,'nondegenerate Blender triangle');}
}
assert.equal(triangles,sections.static.triangles+6*sections.vent.triangles);assert(triangles<20000,'whole-building detail triangle budget');
assert(new T.Box3().setFromObject(detail).min.y>=0,'details stay above the floor');
// Audit connected solids extracted from emitted roof-material meshes. Profiles are
// derived independently from the baseline plan and agreed modulation, not metadata.
const xs=[-8.5,-5.65,-2.9,0,2.9,5.65,8.5],hs=[6.7,7.45,6.3,8.3,6.9,7.65,6.5],plans=[];
const height=(n,z)=>hs[n]+.20+1.65*(.5+.5*Math.cos(Math.PI*z/6+(n%2)*Math.PI));
for(let n=0;n<7;n++){
  const points=[[-9.8,0],[-6,((n%3)-1)*.42],[0,((n+1)%3-1)*.48],[6,((n+2)%3-1)*.35],[9.8,0]];if(n===6)points.pop();
  for(let q=1;q<points.length;q++){const a=points[q-1],c=points[q],dx=c[1]-a[1],dz=c[0]-a[0],length=Math.hypot(dx,dz),ux=dz/length,uz=-dx/length,width=n===3?1.9:2.13,centers=[];
    for(let k=0;k<=12;k++){const f=(.98+(length-1.96)*k/12)/length,x=xs[n]+a[1]+dx*f,z=a[0]+dz*f;centers.push(new T.Vector3(x,height(n,z),z));}
    plans.push({line:n,segment:q,ux,uz,width,centers});}
}
assert.equal(plans.length,27);assert.equal(c.CourtyardCausalDetail.data.roofProfiles.length,27);
const roofMeshes=detail.children.filter(mesh=>['causal-static-tile','causal-static-copper','causal-static-ceramic'].includes(mesh.name));assert.equal(roofMeshes.length,3);
const roofFaces=[],vertexFaces=new Map(),vertexKey=v=>v.toArray().map(x=>x.toFixed(4)).join(',');
for(const mesh of roofMeshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i+=3){const face=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j)),index=roofFaces.length;roofFaces.push(face);for(const v of face){const key=vertexKey(v);if(!vertexFaces.has(key))vertexFaces.set(key,[]);vertexFaces.get(key).push(index);}}}
const visited=new Set(),components=[];
for(let start=0;start<roofFaces.length;start++){if(visited.has(start))continue;const queue=[start],faces=[];visited.add(start);while(queue.length){const index=queue.pop(),face=roofFaces[index];faces.push(face);for(const v of face)for(const neighbor of vertexFaces.get(vertexKey(v)))if(!visited.has(neighbor)){visited.add(neighbor);queue.push(neighbor);}}components.push(faces);}
assert.equal(components.length,27,'27 separately closed roof patches across seven ribbons');
const roofReports=[],matchedPlans=new Set();let minSkyGap=Infinity,roofRays=0,ribContactRays=0;
for(const faces of components){
  const edges=new Map(),vertices=new Map(),bounds=new T.Box3();let volume=0;
  for(const face of faces){for(const v of face){bounds.expandByPoint(v);vertices.set(vertexKey(v),v);}const[a,v,w]=face;volume+=a.dot(v.clone().cross(w))/6;
    for(const [a,b] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){const ka=vertexKey(a),kb=vertexKey(b),key=[ka,kb].sort().join('|'),entry=edges.get(key)||{count:0,direction:0};entry.count++;entry.direction+=ka<kb?1:-1;edges.set(key,entry);}}
  for(const edge of edges.values()){assert.equal(edge.count,2,'closed roof edges');assert.equal(edge.direction,0,'consistent roof winding');}assert(volume>0,'positive roof volume');assert.equal(faces.length,100);assert.equal(vertices.size,52);
  const center=bounds.getCenter(new T.Vector3()),plan=plans.reduce((best,plan)=>center.distanceTo(plan.centers[6])<center.distanceTo(best.centers[6])?plan:best);assert(!matchedPlans.has(plan),'each original roof patch represented exactly once');matchedPlans.add(plan);
  const expected=[];for(const v of plan.centers)for(const side of [-1,1])for(const dy of [0,.16])expected.push(new T.Vector3(v.x+side*plan.width/2*plan.ux,v.y-dy,v.z+side*plan.width/2*plan.uz));
  for(const v of vertices.values())assert(expected.some(w=>v.distanceTo(w)<2e-5),'actual roof vertex matches original plan, independent wave formula and 16 cm skin');
  for(const w of expected)assert([...vertices.values()].some(v=>v.distanceTo(w)<2e-5),'all expected roof vertices present');
  for(const v of vertices.values())for(const knot of [-6,0,6]){const distance=Math.abs(v.z-knot);minSkyGap=Math.min(minSkyGap,distance);assert(distance>.75,'every roof stays out of all three 1.5 m sky slots');}
  roofReports.push({line:plan.line,segment:plan.segment,triangles:faces.length,vertices:vertices.size,edges:edges.size,volume,min:bounds.min.toArray(),max:bounds.max.toArray()});
  for(const index of [1,3,6,9,11])for(const across of [-.75,0,.75]){
    const p=plan.centers[index],x=p.x+across*plan.ux,z=p.z+across*plan.uz;
    const top=new T.Raycaster(new T.Vector3(x,12,z),new T.Vector3(0,-1,0),0,10).intersectObjects(roofMeshes,false)[0],bottom=new T.Raycaster(new T.Vector3(x,5,z),new T.Vector3(0,1,0),0,7).intersectObjects(roofMeshes,false)[0];
    assert(top&&bottom,'actual roof top and underside hit');assert(Math.abs(top.point.y-bottom.point.y-.16)<2e-5,'actual 16 cm roof thickness');assert(Math.abs(top.point.y-p.y)<2e-5,'actual sampled wave height');roofRays+=2;
  }
}
assert.equal(matchedPlans.size,27);assert.equal(roofReports.filter(r=>r.line===6).length,3);assert(roofReports.filter(r=>r.line===6).every(r=>r.max[2]<6),'seventh roof stops before final knot without extending the branch');assert.equal(roofReports.filter(r=>r.segment===4&&r.max[2]>8.6).length,6,'the other six ribbons continue beyond final court');
const cedarMeshes=detail.children.filter(mesh=>mesh.name==='causal-static-cedar');assert.equal(cedarMeshes.length,1);
for(const plan of plans)for(const index of [1,6,11])for(const side of [-1,1]){
  const p=plan.centers[index],x=p.x+side*(plan.width/2-.055)*plan.ux,z=p.z+side*(plan.width/2-.055)*plan.uz;
  const rib=new T.Raycaster(new T.Vector3(x,12,z),new T.Vector3(0,-1,0),0,7).intersectObjects(cedarMeshes,false)[0],bottom=new T.Raycaster(new T.Vector3(x,5,z),new T.Vector3(0,1,0),0,7).intersectObjects(roofMeshes,false)[0];assert(rib&&bottom,'actual edge lamination and roof underside hit');assert(Math.abs(rib.point.y-bottom.point.y)<2e-5,'actual edge lamination contacts underside');ribContactRays+=2;
}
let skyGapRays=0;for(const knot of [-6,0,6])for(let x=-9.5;x<=9.5;x+=.25)for(const dz of [-.7,0,.7]){assert.equal(new T.Raycaster(new T.Vector3(x,12,knot+dz),new T.Vector3(0,-1,0),0,7).intersectObjects(roofMeshes,false).length,0,'actual roof-band court gap remains open');skyGapRays++;}
function additions(o){for(let p=o;p;p=p.parent)if(p.name.startsWith('causal-blender-'))return true;return false;}
// These exact 24 new aperture pieces replace six unperforated fixed canopy boxes.
// Identify individual runtime instances using their complete physical box envelope.
const expectedRims=[];
for(let k=0;k<3;k++)for(const side of [-1,1]){
  const z=-6+6*k-.95,x=side*5.75,vx=side*5.8,y=5.45+k*.28,left=x-3.475,right=x+3.475,holeLeft=vx-1.3,holeRight=vx+1.3;
  for(const [cx,cz,w,d]of[[(left+holeLeft)/2,z,holeLeft-left,1.70],[(right+holeRight)/2,z,right-holeRight,1.70],[vx,z-.77,2.60,.16],[vx,z+.77,2.60,.16]])expectedRims.push(new T.Box3(new T.Vector3(cx-w/2,y-.065,cz-d/2),new T.Vector3(cx+w/2,y+.065,cz+d/2)));
}
const isRim=(box,material)=>material===detail.children.find(m=>m.name==='causal-static-copper').material&&expectedRims.some(rim=>rim.min.distanceTo(box.min)<2e-5&&rim.max.distanceTo(box.max)<2e-5);
const actualRims=[];b.root.traverse(o=>{if(!o.isMesh||additions(o))return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(i,im);matrix.multiply(im);}const box=o.geometry.boundingBox.clone().applyMatrix4(matrix);if(isRim(box,o.material))actualRims.push(box);}});assert.equal(actualRims.length,24,'all 24 actual fixed aperture-rim pieces found');
function originals(building,lowerOnly=false){
  building.root.updateMatrixWorld(true);const rows=[];
  building.root.traverse(o=>{if(!o.isMesh||additions(o))return;const p=o.geometry.attributes.position,idx=o.geometry.index,materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>({color:m.color?.toArray(),opacity:m.opacity,metalness:m.metalness,roughness:m.roughness,side:m.side,transparent:m.transparent}));
    if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
      const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(i,im);matrix.multiply(im);}const box=o.geometry.boundingBox.clone().applyMatrix4(matrix);if(lowerOnly&&box.max.y>5)continue;if(building===b&&isRim(box,o.material))continue;
      rows.push({name:o.name,positions:Array.from(p.array),indices:idx?Array.from(idx.array):null,matrix:matrix.toArray(),materials,box:[box.min.toArray(),box.max.toArray()]});}});return rows;
}
const digest=rows=>crypto.createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(row)).sort())).digest('hex');
const near=(a,b)=>Math.abs(a-b)<1e-5,phases=[0,.25,.5,.75,1,.4,0,1],ventBounds=[];
// Box primitives are exact solids; other primitives use conservative local bounds.
const fixedBoxSolids=[];
b.root.traverse(o=>{if(!o.isMesh||additions(o))return;for(let parent=o;parent;parent=parent.parent)if(parent===registers)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(i,im);matrix.multiply(im);}fixedBoxSolids.push({box:o.geometry.boundingBox.clone(),world:o.geometry.boundingBox.clone().applyMatrix4(matrix),inverse:matrix.clone().invert(),type:o.geometry.type});}});
const addedFixedTriangleBounds=[];for(const mesh of detail.children){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i+=3)addedFixedTriangleBounds.push(new T.Box3().setFromPoints([0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j).applyMatrix4(mesh.matrixWorld))));}
let minVentHeight=Infinity,ventTriangleClearanceChecks=0,retainedBeamTriangleChecks=0,addedFixedClearanceChecks=0;

for(const phase of phases){
  for(const building of [before,withoutRoofs,b])for(const m of building.mechanisms)m.articulate?.(phase);b.root.updateMatrixWorld(true);
  for(const vent of vents){const pivot=vent.parent,k=+pivot.name.match(/^knot-(\d)-borrowed-light$/)[1],s=Math.sign(pivot.position.x);
    assert(near(pivot.position.y,5.84+k*.28),'exact 12 cm mount rise');assert(near(pivot.position.z,-6+6*k-.95),'exact 95 cm mount shift');assert(near(pivot.rotation.z,s*(phase-.5)*(.22+k*.06)),'original court vent rotation law');assert.deepEqual(pivot.scale.toArray(),[1,1,1],'rigid pivot scaling');assert.deepEqual(vent.position.toArray(),[0,0,0],'detail stays local to original pivot');
    for(const value of pivot.matrixWorld.elements)assert(Number.isFinite(value),'finite phase transform');const box=new T.Box3().setFromObject(vent);minVentHeight=Math.min(minVentHeight,box.min.y);assert(box.min.y>=5.4,'vent sweep stays safely overhead');assert(box.max.y<=6.7,'bounded vent sweep');assert(s<0?box.max.x<0:box.min.x>0,'each vent stays on its own side');ventBounds.push({phase,name:pivot.name,side:s,min:box.min.toArray(),max:box.max.toArray()});
    // Exact triangle-vs-axis-aligned-solid overlap, including the original glass leaf.
    pivot.traverse(mesh=>{if(!mesh.isMesh)return;if(mesh.name!=='causal-vent-bronze'){const movingBounds=new T.Box3().setFromObject(mesh);for(const fixed of addedFixedTriangleBounds){assert(!movingBounds.intersectsBox(fixed),'glass and timber frame clear all added fixed geometry by conservative actual-triangle bounds');addedFixedClearanceChecks++;}}const p=mesh.geometry.attributes.position,idx=mesh.geometry.index;for(let i=0;i<(idx?idx.count:p.count);i+=3){const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld)),triangle=new T.Triangle(...points);for(const rim of actualRims){assert(!rim.intersectsTriangle(triangle),'moving leaf/frame clears every fixed canopy piece');ventTriangleClearanceChecks++;}for(const solid of fixedBoxSolids){if(!solid.world.intersectsBox(box.clone().expandByScalar(.15)))continue;const local=new T.Triangle(...points.map(p=>p.clone().applyMatrix4(solid.inverse)));assert(!solid.box.intersectsTriangle(local),'moving leaf/frame clears original stationary beams, caps and aperture rims '+JSON.stringify({phase,k,s,moving:mesh.name,stationaryBox:[solid.world.min.toArray(),solid.world.max.toArray()],triangle:points.map(p=>p.toArray())}));retainedBeamTriangleChecks++;}}});
  }
  assert.equal(digest(originals(b,true)),digest(originals(before,true)),'all original below-5 m exhibits unchanged at phase '+phase);
  assert.equal(digest(originals(b)),digest(originals(withoutRoofs)),'every original mesh, post and path retained; vents match exact approved placement/width change at phase '+phase);
}
assert.equal(JSON.stringify(b.metadata.visitorRoutes),JSON.stringify(before.metadata.visitorRoutes),'unchanged visitor routes');assert.equal(JSON.stringify(b.metadata.observations),JSON.stringify(before.metadata.observations),'unchanged source claims');
const retainedBoxes=before.collisionBoxes.map(box=>JSON.stringify([box.min.toArray(),box.max.toArray(),box.userData]));const currentBoxes=b.collisionBoxes.map(box=>JSON.stringify([box.min.toArray(),box.max.toArray(),box.userData]));assert.equal(JSON.stringify(currentBoxes),JSON.stringify(retainedBoxes),'all original collision footprints remain unchanged');
// Central route and the three transverse public-court approaches retain continuous body clearance.
const paths=[...[-1.1,0,1.1].map(x=>({name:'central-through-route',from:[x,-11],to:[x,11]})),...[-6,0,6].flatMap(k=>[-1.6,-1.4,-1.2].map(offset=>({name:'court-'+k+'-lateral-route',from:[-10.5,k+offset],to:[10.5,k+offset]})))];
let aisleSamples=0,crossCourtSamples=0,headroomRays=0;const pathReports=[];
const sides=new Map();b.root.traverse(o=>{if(o.isMesh)for(const material of Array.isArray(o.material)?o.material:[o.material])if(!sides.has(material)){sides.set(material,material.side);material.side=T.DoubleSide;}});
for(const route of paths){
  const [x0,z0]=route.from,[x1,z1]=route.to,length=Math.hypot(x1-x0,z1-z0),minX=Math.min(x0,x1),maxX=Math.max(x0,x1),minZ=Math.min(z0,z1),maxZ=Math.max(z0,z1);
  for(const box of b.collisionBoxes)if(box.min.y<1.8&&box.max.y>.12)assert(!(maxX>=box.min.x-.38&&minX<=box.max.x+.38&&maxZ>=box.min.z-.38&&minZ<=box.max.z+.38),route.name+' continuous 0.38 m body envelope');
  let samples=0;for(let step=0;step<=Math.ceil(length/.1);step++){const f=Math.min(1,step*.1/length),x=x0+(x1-x0)*f,z=z0+(z1-z0)*f;samples++;for(const box of b.collisionBoxes)if(box.min.y<1.8&&box.max.y>.12)assert(!box.clone().expandByScalar(.38).containsPoint(new T.Vector3(x,.5,z)),route.name+' collision at '+x+','+z);
    headroomRays++;assert.equal(new T.Raycaster(new T.Vector3(x,.15,z),new T.Vector3(0,1,0),0,2.25).intersectObject(b.root,true).length,0,route.name+' actual mesh clearance at '+x+','+z);}
  if(route.name==='central-through-route')aisleSamples+=samples;else crossCourtSamples+=samples;pathReports.push({...route,samples});}
for(const [material,side]of sides)material.side=side;
const second=make(c),secondDetail=second.root.getObjectByName('causal-blender-static');assert.notEqual(detail,secondDetail);for(let i=0;i<detail.children.length;i++)assert.equal(detail.children[i].geometry,secondDetail.children[i].geometry,'cached static geometry');
const secondVent=second.root.getObjectByName('causal-blender-vent');for(const vent of vents){assert.notEqual(vent,secondVent);for(let i=0;i<vent.children.length;i++)assert.equal(vent.children[i].geometry,secondVent.children[i].geometry,'cached vent geometry');}assert.notEqual(vents[0].parent,secondVent.parent,'independent vent pivots');
assert.equal(fs.readFileSync(root+'/index.html','utf8'),fs.readFileSync(root+'/island.html','utf8'));
// Export every actual runtime mesh and instance for CPU render review, phase 1.
const meshes=[];b.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index,material=Array.isArray(o.material)?o.material[0]:o.material;
  for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(i,im);matrix.multiply(im);}const verts=[];for(let j=0;j<p.count;j++){const v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(matrix);verts.push([v.x,-v.z,v.y]);}const faces=[];for(let j=0;j<(idx?idx.count:p.count);j+=3)faces.push(idx?[idx.getX(j),idx.getX(j+1),idx.getX(j+2)]:[j,j+1,j+2]);meshes.push({name:o.name,verts,faces,color:material.color.toArray(),opacity:material.opacity,metalness:material.metalness,roughness:material.roughness});}});
fs.writeFileSync(out+'/runtime-assembly.json',JSON.stringify(meshes));
const result={passed:true,building:15,baseline,staticParts:sections.static.parts,ventPartsEach:sections.vent.parts,ventInstances:6,triangles,calls,roofVerticalThicknessMetres:.16,roofRays,ribContactRays,roofReports,minSkyGap,skyGapRays,originalLowerExhibits:originals(b,true).length,allRetainedOriginalMeshes:originals(b).length,replacedCanopyBoxes:6,newCanopyRimPieces:actualRims.length,ventTriangleClearanceChecks,retainedBeamTriangleChecks,addedFixedClearanceChecks,intentionalBearingJournalContact:true,ventMountRiseMetres:.12,ventMountEntryShiftMetres:.95,ventLeafWidthMetres:2.2,allOriginalPostsPreserved:true,checkedPhases:phases.length,minVentHeight,ventBounds,aisleSamples,crossCourtSamples,continuousBodySegments:paths.length,headroomRays,pathReports,sharedGeometry:true,exportedMeshes:meshes.length};
fs.writeFileSync(out+'/checks.json',JSON.stringify(result,null,2));console.log({...result,roofReports:'27 closed roof solids saved in checks.json',ventBounds:'48 bounded vent phase samples saved in checks.json'});
