const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js');
fs.mkdirSync(root+'/qa-results/nuanling',{recursive:true});
const c={console};c.window=c;vm.createContext(c);for(const n of ['architecture','content-core','nuanling-detail','ink-detail','restoration-detail','content-creation-care'])vm.runInContext(fs.readFileSync(root+'/assets/'+n+'.js','utf8'),c);
const b=c.CourtyardArchitecture.build({THREE:T,index:4,title:'暖聆馆',zone:0});b.root.updateMatrixWorld(true);
let detail,roof;b.root.traverse(o=>{if(o.name==='nuanling-blender-joinery')detail=o;if(o.geometry?.name==='enclosed-hip-roof-shell')roof=o});assert(detail);assert.equal(roof.geometry.userData.verticalThickness,.16);
const detailedBox=new T.Box3().setFromObject(detail);assert(detailedBox.min.y>=.009);let triangles=0;
for(const m of detail.children){const p=m.geometry.attributes.position;for(const v of p.array)assert(Number.isFinite(v));triangles+=p.count/3;for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),v=new T.Vector3().fromBufferAttribute(p,i+1),w=new T.Vector3().fromBufferAttribute(p,i+2);assert(v.sub(a).cross(w.sub(a)).length()>1e-9,'nondegenerate detail faces');}}
assert.equal(triangles,c.CourtyardNuanlingDetail.data.triangles);assert(triangles<22000);
// Check both colliders and the actual new geometry along the entire walking corridor.
for(let z=-9;z<=9;z+=.1)for(const x of [-1.1,0,1.1])for(const box of b.collisionBoxes)assert(!box.clone().expandByScalar(.38).containsPoint(new T.Vector3(x,.5,z)));
for(let z=-8;z<8;z+=.3)for(const x of [-1.3,0,1.3]){const hits=new T.Raycaster(new T.Vector3(x,.1,z),new T.Vector3(0,1,0),0,2.3).intersectObject(detail,true);assert.equal(hits.length,0,'new detail must not intrude into walking headroom');}
for(const v of [0,.25,.5,.75,1,0,1])for(const m of b.mechanisms)m.update?.(v,1);
assert.equal(fs.readFileSync(root+'/index.html','utf8'),fs.readFileSync(root+'/island.html','utf8'));
// Export the exact runtime assembly, including instanced original geometry, for Blender review.
const meshes=[];b.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index;const material=Array.isArray(o.material)?o.material[0]:o.material;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const mat=o.matrixWorld.clone();if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(i,im);mat.multiply(im)}const verts=[];for(let j=0;j<p.count;j++){const v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(mat);verts.push([v.x,-v.z,v.y])}const faces=[];for(let j=0;j<(idx?idx.count:p.count);j+=3)faces.push(idx?[idx.getX(j),idx.getX(j+1),idx.getX(j+2)]:[j,j+1,j+2]);meshes.push({name:o.name,verts,faces,color:material.color.toArray(),opacity:material.opacity,metalness:material.metalness,roughness:material.roughness});}});
fs.writeFileSync(root+'/qa-results/nuanling/runtime-assembly.json',JSON.stringify(meshes));const result={passed:true,parts:c.CourtyardNuanlingDetail.data.parts,detailTriangles:triangles,detailDrawCalls:detail.children.length,roofThickness:.16,centralAisle:'clear at 3 lanes, radius .38m',headroom:'actual new mesh ray tested',mechanismStates:7};fs.writeFileSync(root+'/qa-results/nuanling/checks.json',JSON.stringify(result,null,2));console.log(result);
