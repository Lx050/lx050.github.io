/* Exact-runtime geometry audit and Blender review export for building22. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js'),out=root+'/qa-results/rubbing';fs.mkdirSync(out,{recursive:true});
const baseline='7910ab80772cbe494be7d2b5dd3e055aa91056ee';
function load(old){
  const c={console};c.window=c;vm.createContext(c);
  for(const name of ['architecture','content-core',...(!old?['rubbing-detail']:[]),'content-literary']){
    const file='assets/'+name+'.js',source=old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{encoding:'utf8',maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file,'utf8');
    vm.runInContext(source,c,{filename:file});
  }
  return c;
}
const c=load(false),old=load(true),make=context=>context.CourtyardArchitecture.build({THREE:T,index:22,title:'碑拓研究馆',zone:2});
const b=make(c),before=make(old);b.root.updateMatrixWorld(true);
const detail=b.root.getObjectByName('rubbing-blender-static'),overlay=b.root.getObjectByName('reversible-readability-overlay'),moving=b.root.getObjectByName('rubbing-blender-overlay');
assert(detail&&overlay&&moving,'both Blender sections and the original overlay exist');
assert.equal(detail.parent,b.root,'static detail remains static');assert.equal(moving.parent,overlay,'moving detail remains on the original pivot');
let triangles=0,calls=0;
for(const group of [detail,moving])for(const mesh of group.children){
  calls++;const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;triangles+=p.count/3;
  assert.equal(p.count%3,0);assert.equal(n.count,p.count);
  for(const value of [...p.array,...n.array])assert(Number.isFinite(value),'finite positions and normals');
  for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),v=new T.Vector3().fromBufferAttribute(p,i+1),w=new T.Vector3().fromBufferAttribute(p,i+2);assert(v.sub(a).cross(w.sub(a)).length()>1e-9,'nondegenerate Blender triangle');}
}
assert.equal(triangles,c.CourtyardRubbingDetail.data.sections.static.triangles+c.CourtyardRubbingDetail.data.sections.overlay.triangles);assert(triangles<20000,'detail triangle budget');
assert(new T.Box3().setFromObject(detail).min.y>=0,'details stay above the floor');
// Each folded segment has a real upper and lower skin, exactly 16 cm apart.
let roofRays=0;
const roofMeshes=detail.children.filter(mesh=>/rubbing-static-(tile|copper)$/.test(mesh.name));
for(const [z,h]of [[-7.3,7.05],[-2.6,8.30],[2.15,7.40],[6.85,8.70]])for(const side of [-1,1]){
  const profile=[[side*.85,h+1.35],[side*7,h+.60],[side*9.5,h+2]];
  for(let segment=0;segment<2;segment++)for(const t of [.17,.53,.83]){
    const a=profile[segment],v=profile[segment+1],x=a[0]+(v[0]-a[0])*t,y=a[1]+(v[1]-a[1])*t;
    const top=new T.Raycaster(new T.Vector3(x,y+1,z+.23),new T.Vector3(0,-1,0),0,1.5).intersectObjects(roofMeshes,false)[0];
    const bottom=new T.Raycaster(new T.Vector3(x,y-1,z+.23),new T.Vector3(0,1,0),0,1.5).intersectObjects(roofMeshes,false)[0];
    assert(top&&bottom,'closed roof has top and underside');assert(Math.abs(top.point.y-y)<2e-5,'roof follows authored folded profile');assert(Math.abs(top.point.y-bottom.point.y-.16)<2e-5,'roof thickness is 16 cm');roofRays+=2;
  }
}
function additions(o){for(let p=o;p;p=p.parent)if(p.name.startsWith('rubbing-blender-'))return true;return false;}
function originals(building){
  building.root.updateMatrixWorld(true);const rows=[];
  building.root.traverse(o=>{if(!o.isMesh||additions(o))return;const p=o.geometry.attributes.position,idx=o.geometry.index,material=Array.isArray(o.material)?o.material[0]:o.material;
    if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
    for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
      const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(i,im);matrix.multiply(im);}
      const box=o.geometry.boundingBox.clone().applyMatrix4(matrix);
      if(box.max.y>5)continue;
      rows.push({name:o.name,positions:Array.from(p.array),indices:idx?Array.from(idx.array):null,matrix:matrix.toArray(),color:material.color.toArray(),opacity:material.opacity,box:[box.min.toArray(),box.max.toArray()]});
    }
  });return rows;
}
const digest=rows=>crypto.createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(row)).sort())).digest('hex');
const originalRows=originals(b);
const near=(a,b)=>Math.abs(a-b)<1e-5;
const carriers=originalRows.filter(row=>{const [min,max]=row.box;return near(max[0]-min[0],.62)&&near(max[1]-min[1],1.13)&&near(max[2]-min[2],.055)&&near((min[1]+max[1])/2,1.7)&&near((min[2]+max[2])/2,-2.36);});
assert.equal(carriers.length,11,'eleven equal-height original comparison carriers');
assert.equal(carriers.filter(row=>(row.box[0][0]+row.box[1][0])/2<0).length,6,'six left and five right carriers');
const datum=originalRows.filter(row=>{const [min,max]=row.box;return near(max[0]-min[0],3.45)&&near(max[1]-min[1],3.52)&&near(max[2]-min[2],.45)&&near((min[0]+max[0])/2,-5.45)&&near((min[2]+max[2])/2,-7.15);});
assert.equal(datum.length,1,'exactly one original blank datum');
const datumFingerprint=digest(datum),phases=[0,.25,.5,.75,1,.4,0,1];
const sweep=b.collisionBoxes.find(box=>box.userData?.part==='moving-overlay-carrier-envelope');assert(sweep);
const overlayBounds=[];
for(const phase of phases){
  for(const building of [before,b])for(const m of building.mechanisms)m.articulate?.(phase);
  b.root.updateMatrixWorld(true);before.root.updateMatrixWorld(true);
  assert(near(overlay.position.x,-5.7+.96*phase),'original 0.96 m overlay law');
  assert.deepEqual(overlay.scale.toArray(),[1,1,1],'rigid movement without scaling');
  const box=new T.Box3().setFromObject(moving);assert(sweep.clone().expandByScalar(1e-5).containsBox(box),'new moving detail remains inside the existing sweep guard');overlayBounds.push({phase,min:box.min.toArray(),max:box.max.toArray()});
  assert.equal(digest(originals(b)),digest(originals(before)),'all original below-5 m exhibits unchanged at phase '+phase);
}
assert.equal(digest(datum),datumFingerprint,'immutable datum');
assert.equal(JSON.stringify(b.metadata.visitorRoutes),JSON.stringify(before.metadata.visitorRoutes),'unchanged visitor route');
assert.equal(JSON.stringify(b.metadata.observations),JSON.stringify(before.metadata.observations),'unchanged interpretive claims');
assert.equal(b.collisionBoxes.filter(box=>box.userData?.part==='rubbing-post-shoe').length,16,'all shoes have physical footprints');
// Whole central passage and actual detail headroom, not only metadata claims.
let aisleSamples=0,headroomRays=0;
for(let z=-11;z<=11;z+=.1)for(const x of [-1.1,0,1.1]){aisleSamples++;for(const box of b.collisionBoxes)assert(!box.clone().expandByScalar(.38).containsPoint(new T.Vector3(x,.5,z)),'central route at '+x+','+z);}
const sides=new Map();for(const group of [detail,moving])group.traverse(o=>{if(o.isMesh&&!sides.has(o.material)){sides.set(o.material,o.material.side);o.material.side=T.DoubleSide;}});
for(let z=-10;z<=10;z+=.2)for(const x of [-1.3,0,1.3]){headroomRays++;assert.equal(new T.Raycaster(new T.Vector3(x,.1,z),new T.Vector3(0,1,0),0,2.3).intersectObjects([detail,moving],true).length,0,'actual detail headroom');}
for(const [material,side]of sides)material.side=side;
// Two instances reuse geometry; the original overlay pivot remains per-building.
const second=make(c);for(const name of ['rubbing-blender-static','rubbing-blender-overlay']){const a=b.root.getObjectByName(name),other=second.root.getObjectByName(name);assert.notEqual(a,other);for(let i=0;i<a.children.length;i++)assert.equal(a.children[i].geometry,other.children[i].geometry,'cached Blender geometry');}
assert.equal(fs.readFileSync(root+'/index.html','utf8'),fs.readFileSync(root+'/island.html','utf8'));
// Export exact runtime positions including original instanced meshes, at phase 1.
const meshes=[];b.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index,material=Array.isArray(o.material)?o.material[0]:o.material;
  for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(i,im);matrix.multiply(im);}const verts=[];
    for(let j=0;j<p.count;j++){const v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(matrix);verts.push([v.x,-v.z,v.y]);}
    const faces=[];for(let j=0;j<(idx?idx.count:p.count);j+=3)faces.push(idx?[idx.getX(j),idx.getX(j+1),idx.getX(j+2)]:[j,j+1,j+2]);
    meshes.push({name:o.name,verts,faces,color:material.color.toArray(),opacity:material.opacity,metalness:material.metalness,roughness:material.roughness});
  }
});
fs.writeFileSync(out+'/runtime-assembly.json',JSON.stringify(meshes));
const result={passed:true,building:22,baseline,staticParts:c.CourtyardRubbingDetail.data.sections.static.parts,overlayParts:c.CourtyardRubbingDetail.data.sections.overlay.parts,triangles,calls,roofLeaves:16,roofVerticalThicknessMetres:.16,roofRays,referenceCarriers:carriers.length,immutableDatum:true,originalLowerExhibits:originalRows.length,proposalGapsPreserved:true,overlayTravelMetres:.96,checkedPhases:phases.length,overlayBounds,aisleSamples,headroomRays,sharedGeometry:true,exportedMeshes:meshes.length};
fs.writeFileSync(out+'/checks.json',JSON.stringify(result,null,2));console.log(result);
