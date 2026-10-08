/* Physical queries shared by the crafted buildings, independent of visual LOD. */
(function(global){'use strict';
function bounds(THREE,root){
 root.updateWorldMatrix(true,true);const box=new THREE.Box3(),m=new THREE.Matrix4();
 root.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);box.union(o.geometry.boundingBox.clone().applyMatrix4(m));}}else box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});return box;
}
function register(THREE,b,root,index,title){
 root.updateWorldMatrix(true,true);b.root=root;b.index=index;b.title=title;b.inverse=root.matrixWorld.clone().invert();b.origin=root.getWorldPosition(new THREE.Vector3());b.yaw=Math.atan2(root.matrixWorld.elements[8],root.matrixWorld.elements[10]);
 b.point=(x,z)=>new THREE.Vector3(x,0,z).applyMatrix4(root.matrixWorld);b.local=p=>p.clone().applyMatrix4(b.inverse);b.collisionBoxes=b.collisionBoxes||[];b.mechanisms=b.mechanisms||[];b.open=1;b.targetOpen=1;
 b.cameraMeshes=[];root.traverse(o=>{if(!o.isMesh)return;let fine=false;for(let p=o;p&&p!==root;p=p.parent)if(p===b.detail)fine=true;if(!fine)b.cameraMeshes.push(o);});
 b.cameraBoxes=[];
 // Subdivide long rotated walls before their broad AABB is used by camera sweeps.
 // This preserves door and clerestory voids without a solid whole-building proxy.
 for(const q of b.collisionBoxes){const size=q.getSize(new THREE.Vector3()),nx=Math.max(1,Math.ceil(size.x/1.5)),nz=Math.max(1,Math.ceil(size.z/1.5));for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++)b.cameraBoxes.push(new THREE.Box3(new THREE.Vector3(q.min.x+size.x*ix/nx,q.min.y,q.min.z+size.z*iz/nz),new THREE.Vector3(q.min.x+size.x*(ix+1)/nx,q.max.y,q.min.z+size.z*(iz+1)/nz)).applyMatrix4(root.matrixWorld));}
 b.bounds=bounds(THREE,root);b.cullBounds=b.bounds.clone().expandByScalar(3);return b;
}
function blocked(THREE,records,x,z,y,r=.38,h=1.7){
 const p=new THREE.Vector3(x,y,z);
 for(const b of records){if(Math.hypot(x-b.origin.x,z-b.origin.z)>Math.max(b.width,b.depth)+3)continue;const q=p.clone().applyMatrix4(b.inverse);
  for(const box of b.collisionBoxes)if(q.y+h>box.min.y+.02&&q.y<box.max.y-.12&&q.x>box.min.x-r&&q.x<box.max.x+r&&q.z>box.min.z-r&&q.z<box.max.z+r)return true;
 }return false;
}
let viewFrustum=null,viewMatrix=null;
function update(records,position,dt,lightQuality,camera){if(camera){if(!viewFrustum){viewFrustum=new global.THREE.Frustum();viewMatrix=new global.THREE.Matrix4();}viewMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);viewFrustum.setFromProjectionMatrix(viewMatrix);}
 for(const b of records){const d=Math.hypot(position.x-b.origin.x,position.z-b.origin.z);if(camera)b.root.visible=d<22||viewFrustum.intersectsBox(b.cullBounds);if(b.detail)b.detail.visible=d<(lightQuality?30:58);b.open+=(b.targetOpen-b.open)*(1-Math.exp(-5*dt));for(const m of b.mechanisms){if(typeof m.update==='function')m.update(b.open,dt);else if(typeof m.articulate==='function')m.articulate(b.open);}}}
global.CourtyardRuntime={bounds,register,blocked,update};
})(window);
