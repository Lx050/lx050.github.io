/* Minimal road repair: move an obstructing inherited trunk or lantern base to
 * the nearest safe verge. This changes placement coordinates only, before the
 * existing GLB promises instantiate them. It creates no objects or materials.
 * Footprints come from the actual bundled GLBs, never the tree crowns:
 * Tree.glb Trunk radius .1599999964 / complete model height 4.1249998808;
 * StoneLantern.glb Base radius .3199999928 / model height 1.8500000238.
 * docs/roads-scenery-check.cjs independently checks the loaded mesh vertices. */
(function(global){
 'use strict';
 const FOOTPRINTS=Object.freeze({tree:.1599999964237213/4.1249998807907104,lantern:.3199999928474426/1.8500000238418581});
 const LIMITS=Object.freeze({vergeGap:.22,fixtureGap:.20,maximumMove:8,searchStep:.125,searchDirections:64,obstructionMargin:.15});
 function apply(options){
  const {THREE:T,trees,lanterns,corridors=[],nodes=[],sites=[],buildings=[],pockets=[],forecourts=[],height,obstacles=[],masterplanRoot,scene}=options;
  if(!trees||!lanterns||!height)throw Error('Road scenery requires the original placements and rendered terrain height');
  const routes=[...corridors],approachLength=options.approachLength||21,islandRadius=options.islandRadius||150;
  for(let i=0;i<sites.length;i++){const s=sites[i];if(i===23)continue;routes.push({id:'approach-'+i,width:3,points:[-s.radius-approachLength,-s.radius].map(d=>({x:s.x+s.ux*d,z:s.z+s.uz*d}))});}
  const fixtures=[...trees.map((p,index)=>({kind:'tree',index,p,radius:p.h*FOOTPRINTS.tree})),...lanterns.map((p,index)=>({kind:'lantern',index,p,radius:(options.lanternHeight||2.4)*FOOTPRINTS.lantern}))];
  const maxRadius=Math.max(...fixtures.map(f=>f.radius)),cell=8,cells=new Map();
  function key(x,z){return Math.floor(x/cell)+','+Math.floor(z/cell);}
  for(const route of routes)for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z,ll=dx*dx+dz*dz;
   if(!ll)continue;const segment={id:route.id,a,b,dx,dz,ll,half:route.width/2},pad=segment.half+maxRadius+LIMITS.vergeGap;
   for(let ix=Math.floor((Math.min(a.x,b.x)-pad)/cell);ix<=Math.floor((Math.max(a.x,b.x)+pad)/cell);ix++)for(let iz=Math.floor((Math.min(a.z,b.z)-pad)/cell);iz<=Math.floor((Math.max(a.z,b.z)+pad)/cell);iz++){const k=ix+','+iz;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(segment);}
  }
  // Junction carpets can be wider than either adjoining centerline corridor.
  // Index their exact authored oriented rectangles, including corner clearance.
  for(let i=0;i<nodes.length;i++){const n=nodes[i],c=Math.cos(n.yaw||0),s=Math.sin(n.yaw||0),node={node:true,id:'node-'+i,x:n.x,z:n.z,c,s,hx:n.width/2,hz:n.depth/2},pad=maxRadius+LIMITS.vergeGap,ex=Math.abs(c)*node.hx+Math.abs(s)*node.hz+pad,ez=Math.abs(s)*node.hx+Math.abs(c)*node.hz+pad;
   for(let ix=Math.floor((n.x-ex)/cell);ix<=Math.floor((n.x+ex)/cell);ix++)for(let iz=Math.floor((n.z-ez)/cell);iz<=Math.floor((n.z+ez)/cell);iz++){const k=ix+','+iz;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(node);}
  }
  function roadHits(x,z,r,gap){const hits=[];for(const s of cells.get(key(x,z))||[]){
   let px,pz,clearance;
   if(s.node){const dx=x-s.x,dz=z-s.z,lx=s.c*dx-s.s*dz,lz=s.s*dx+s.c*dz,ex=Math.abs(lx)-s.hx,ez=Math.abs(lz)-s.hz;clearance=Math.hypot(Math.max(ex,0),Math.max(ez,0))+Math.min(Math.max(ex,ez),0)-r;
    let qx=Math.max(-s.hx,Math.min(s.hx,lx)),qz=Math.max(-s.hz,Math.min(s.hz,lz));if(ex<=0&&ez<=0){if(ex>ez)qx=(lx<0?-1:1)*s.hx;else qz=(lz<0?-1:1)*s.hz;}
    px=s.x+s.c*qx+s.s*qz;pz=s.z-s.s*qx+s.c*qz;
   }else{const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.ll));px=s.a.x+s.dx*t;pz=s.a.z+s.dz*t;clearance=Math.hypot(x-px,z-pz)-s.half-r;}
   if(clearance<gap)hits.push({id:s.id,clearance,x:px,z:pz});
  }return hits;}
  const reserved=[];
  function rectangle(x,z,width,depth,yaw=0,margin=0){reserved.push({x,z,halfX:width/2+margin,halfZ:depth/2+margin,c:Math.cos(yaw),s:Math.sin(yaw)});}
  for(const b of [...buildings,...obstacles]){if(!b.root||!b.width||!b.depth)continue;b.root.updateWorldMatrix(true,false);const p=b.root.getWorldPosition(new T.Vector3()),q=b.root.getWorldQuaternion(new T.Quaternion()),yaw=new T.Euler().setFromQuaternion(q,'YXZ').y;rectangle(p.x,p.z,b.width,b.depth,yaw,.55);}
  for(const p of pockets)rectangle(p.x,p.z,8.5,7.2,Math.atan2(p.x,p.z),.25);
  for(const f of forecourts)rectangle(f.center.x,f.center.z,f.width,f.depth,f.yaw,.30);
  // Keep original shrubs and small shore stones intact. Only read existing
  // transforms; don't add collision meshes or modify the foliage/stone batches.
  const smallScenery=[],world=new T.Matrix4(),instance=new T.Matrix4();
  function collect(mesh,shoreOnly){if(!mesh.isMesh)return;const geo=mesh.geometry;if(!geo.boundingBox)geo.computeBoundingBox();if(!geo.boundingBox)return;mesh.updateWorldMatrix(true,false);
   for(let i=0;i<(mesh.isInstancedMesh?mesh.count:1);i++){world.copy(mesh.matrixWorld);if(mesh.isInstancedMesh){mesh.getMatrixAt(i,instance);world.multiply(instance);}const box=geo.boundingBox.clone().applyMatrix4(world),size=box.getSize(new T.Vector3()),p=box.getCenter(new T.Vector3());
    if(shoreOnly&&(Math.hypot(p.x,p.z)<144||size.y>.9||size.x>2||size.z>2||size.x<.15))continue;
    smallScenery.push({x:p.x,z:p.z,r:Math.hypot(size.x,size.z)/2});
   }
  }
  masterplanRoot?.traverse(o=>{if(o.name==='landscape-foliage')collect(o,false);});
  scene?.traverse(o=>{if(o.isInstancedMesh&&o.geometry?.type==='SphereGeometry')collect(o,true);});
  function safe(x,z,fixture){const r=fixture.radius;
   if(Math.hypot(x,z)>islandRadius-1-r||Math.hypot(x,z)<8+r)return false;
   if(roadHits(x,z,r,LIMITS.vergeGap).length)return false;
   for(const s of sites)if(Math.hypot(x-s.x,z-s.z)<s.radius+r+.25)return false;
   for(const b of reserved){const dx=x-b.x,dz=z-b.z,lx=b.c*dx-b.s*dz,lz=b.s*dx+b.c*dz;if(Math.abs(lx)<b.halfX+r&&Math.abs(lz)<b.halfZ+r)return false;}
   for(const f of fixtures)if(f!==fixture&&Math.hypot(x-f.p.x,z-f.p.z)<r+f.radius+LIMITS.fixtureGap)return false;
   for(const p of smallScenery)if(Math.hypot(x-p.x,z-p.z)<r+p.r+LIMITS.fixtureGap)return false;
   return Number.isFinite(height(x,z));
  }
  // Freeze the obstruction set before any move. Clear placements are untouched,
  // even if a tree crown happens to overhang a lane. A verified base/trunk
  // within 15cm is a near-touch, and is also moved into a 22cm clear verge.
  const obstructing=fixtures.map(f=>({f,hits:roadHits(f.p.x,f.p.z,f.radius,LIMITS.obstructionMargin)})).filter(row=>row.hits.length);
  const relocations=[],unresolved=[];let candidates=0;
  for(const {f,hits}of obstructing){
   hits.sort((a,b)=>a.clearance-b.clearance);const p=f.p,before={...p},nearest=hits[0],angle=Math.atan2(p.z-nearest.z,p.x-nearest.x);let chosen=null;
   // Radial shells bound movement and choose the closest sampled safe verge.
   // Direction starts away from the obstructed centerline, with stable +/- ties.
   search:for(let d=LIMITS.searchStep;d<=LIMITS.maximumMove;d+=LIMITS.searchStep)for(let j=0;j<LIMITS.searchDirections;j++){
    const offset=j===0?0:Math.ceil(j/2)*(j%2?1:-1)*Math.PI*2/LIMITS.searchDirections,a=angle+offset,x=before.x+Math.cos(a)*d,z=before.z+Math.sin(a)*d;candidates++;
    if(safe(x,z,f)){chosen={x,z,y:height(x,z)};break search;}
   }
   const reason=[...new Set(hits.map(h=>h.id))],minimumBeforeClearance=hits[0].clearance;
   if(!chosen){unresolved.push({kind:f.kind,index:f.index,before,reason,minimumBeforeClearance});continue;}
   p.x=chosen.x;p.z=chosen.z;p.y=chosen.y;
   relocations.push({kind:f.kind,index:f.index,before,after:{...p},reason,minimumBeforeClearance,footprintRadius:f.radius,distance:Math.hypot(p.x-before.x,p.z-before.z)});
  }
  return{relocations,unresolved,counts:{trees:trees.length,lanterns:lanterns.length,obstructing:obstructing.length,relocated:relocations.length},limits:LIMITS,footprints:FOOTPRINTS,inspect:()=>({relocated:relocations.length,unresolved:unresolved.length,candidates,maximumMove:Math.max(0,...relocations.map(r=>r.distance)),roads:routes.length,nodes:nodes.length,smallScenery:smallScenery.length,draws:0,triangles:0,materials:0,lights:0,particles:0})};
 }
 global.CourtyardRoadScenery=Object.freeze({apply,footprints:FOOTPRINTS,limits:LIMITS});
})(window);
