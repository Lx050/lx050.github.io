/* Two readings of one blank: added ground-level viewpoints, not a new butterfly. */
(function(global){'use strict';
 global.CourtyardButterflyContent={build(THREE,b,material){
  const root=new THREE.Group();root.name='two-readings-shared-blank';b.root.add(root);
  const pale=material(0xc3c5b6,{roughness:.94}),ink=material(0x465552,{roughness:.85}),wood=material(0x8a806b,{roughness:.92});
  const box=new THREE.BoxGeometry(1,1,1),floorRows=[],frameRows=[],woodRows=[],dummy=new THREE.Object3D();
  function row(rows,x,y,z,w,h,d,angle=0){dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,angle,0);dummy.updateMatrix();rows.push(dummy.matrix.clone());}
  b.contentLights=[];
  for(const side of [-1,1]){
   const cx=side*9,cz=38+(side>0?2:0),yaw=side*.13;
   row(floorRows,side*5,.13,cz,10,.14,2.6);row(floorRows,cx,.13,cz,5,.14,5);
   // Incomplete perimeter frames leave distinct sightlines and a visibly unfilled middle.
   for(const dx of [-1.9,1.9]){const x=cx+dx*Math.cos(yaw),z=cz-dx*Math.sin(yaw);row(frameRows,x,1.95,z,.13,3.5,.13,yaw);b.sea.collisions.push({x,z,r:.14,h:3.8});}
   row(frameRows,cx,3.75,cz,4,.14,.16,yaw);
   row(woodRows,cx+side*.45,.49,cz+1.4,2.9,.18,.65,yaw);
   for(const dx of [-1,0,1]){const x=cx+side*.45+dx,z=cz+1.4;row(frameRows,x,.27,z,.15,.4,.45);b.sea.collisions.push({x,z,r:.28,h:.62});}
   // A tiny shared-time marker; neither viewport claims to complete the blank.
   const light=material(0xb8aa86,{emissive:0xe4c9a4,emissiveIntensity:.18,roughness:.75});
   const marker=new THREE.Mesh(new THREE.BoxGeometry(.035,.028,2.3),light);marker.position.set(cx-side*1.55,.226,cz);root.add(marker);b.contentLights.push({material:light,side,x:cx,z:cz});
  }
  for(const [rows,mat,name] of [[floorRows,pale,'flush-paired-viewing-aprons'],[frameRows,ink,'incomplete-viewpoint-frames'],[woodRows,wood,'paired-listening-ledges']]){const m=new THREE.InstancedMesh(box,mat,rows.length);rows.forEach((r,i)=>m.setMatrixAt(i,r));m.frustumCulled=false;m.castShadow=false;m.receiveShadow=true;m.name=name;root.add(m);}
  root.userData.contentEvidence={url:'https://uncolored-butterfly.maniforld.com/',sections:['四 天涯共此时','六 未上色的蝴蝶'],concept:'Two separate viewpoints and a shared unfilled interval; possibility and limitation remain equally legible.'};
  b.contentFraming=root;return root;
 },update(b,dt,position,reduced,time){if(!b.contentLights)return;const p=b.root.worldToLocal(position.clone());for(const v of b.contentLights){const near=Math.max(0,1-Math.hypot(p.x-v.x,p.z-v.z)/16),breath=reduced?0:(.5+.5*Math.sin(time*.32+v.side*.22));v.material.emissiveIntensity=.11+near*(.12+breath*.08);}}};
})(window);
