/* Actual shared-mesh regression: outward FrontSide curb walls, closed original
 * perimeter, no hidden walls on internal terrain cuts. No metadata-only proof. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),T=require(path.join(root,'vendor/three.min.js'));
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'assets/road-surface.js'),'utf8'),ctx);
const geo=new T.PlaneGeometry(30,30,12,12);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,.1*p.getX(i)+.03*p.getZ(i));
const surface=ctx.CourtyardRoadSurface.create({THREE:T,geometry:geo}),material=new T.MeshStandardMaterial({side:T.FrontSide}),rows=[];
for(const [i,c] of [{x:-6,z:0,w:1,l:5,yaw:0},{x:0,z:0,w:3,l:6,yaw:.37},{x:7,z:1,w:2,l:4,yaw:1.12}].entries()){
 const layer='curb-fixture-'+i,depth=.14;surface.addSlab(c.x,c.z,c.w,c.l,c.yaw,{layer,offset:.145,depth,walkable:false});const mesh=surface.buildMesh(material,layer),g=mesh.geometry,a=g.attributes.position,index=g.index;mesh.updateMatrixWorld(true);
 let sideTriangles=0,area=0,minimumOutward=Infinity,rayChecks=0;
 for(let k=0;k<index.count;k+=3){const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,index.getX(k+j))),normal=new T.Vector3().crossVectors(vs[1].clone().sub(vs[0]),vs[2].clone().sub(vs[0]));if(Math.abs(normal.y)>1e-8)continue;
  sideTriangles++;area+=normal.length()/2;normal.normalize();const center=vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1/3),outward=normal.dot(new T.Vector3(center.x-c.x,0,center.z-c.z));minimumOutward=Math.min(minimumOutward,outward);assert(outward>0,'curb side must face outwards, not into its stone');
  const ray=new T.Raycaster(center.clone().addScaledVector(normal,.1),normal.clone().negate(),0,.2),hits=ray.intersectObject(mesh,false);assert(hits.length&&Math.abs(hits[0].distance-.1)<1e-5,'FrontSide ray must see the near curb wall');rayChecks++;
 }
 assert(sideTriangles>0);const expectedArea=2*(c.w+c.l)*depth;assert(Math.abs(area-expectedArea)<.00002,'all perimeter walls close, no internal terrain-cut walls');rows.push({layer,sideTriangles,sideArea:area,expectedArea,minimumOutward,rayChecks});
}
async function main(){
 const {garden:g}=await require('./masterplan-render-export.cjs').loadHost();let curb=null;g.scene.traverse(o=>{if(o.name==='island-road-low-curbs')curb=o;});assert(curb&&curb.material.side===T.FrontSide,'production uses FrontSide curbs');
 const pos=curb.geometry.attributes.position,idx=curb.geometry.index,edges=new Map(),vertices=i=>new T.Vector3().fromBufferAttribute(pos,idx.getX(i)),pointKey=p=>p.toArray().join(','),edgeKey=(a,b)=>[pointKey(a),pointKey(b)].sort().join('|');
 for(let k=0;k<idx.count;k+=3){const v=[0,1,2].map(j=>vertices(k+j)),n=new T.Vector3().crossVectors(v[1].clone().sub(v[0]),v[2].clone().sub(v[0]));if(n.y<=1e-10)continue;for(let i=0;i<3;i++)edges.set(edgeKey(v[i],v[(i+1)%3]),v[(i+2)%3]);}
 let verticalTriangles=0,exteriorWalls=0,frontSideRays=0;
 for(let k=0;k<idx.count;k+=3){const v=[0,1,2].map(j=>vertices(k+j)),n=new T.Vector3().crossVectors(v[1].clone().sub(v[0]),v[2].clone().sub(v[0]));if(Math.abs(n.y)>1e-10)continue;verticalTriangles++;n.normalize();
  for(let i=0;i<3;i++){const inside=edges.get(edgeKey(v[i],v[(i+1)%3]));if(!inside)continue;const middle=v[i].clone().add(v[(i+1)%3]).multiplyScalar(.5);assert(n.dot(inside.clone().sub(middle))<-1e-8,'production wall normal points away from adjacent actual top face');exteriorWalls++;
   const center=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),ray=new T.Ray(center.clone().addScaledVector(n,.025),n.clone().negate());assert(ray.intersectTriangle(...v,true,new T.Vector3()),'production near wall survives FrontSide culling');frontSideRays++;break;
  }
 }
 assert.equal(exteriorWalls*2,verticalTriangles,'each actual perimeter quad has one verified top-connected exterior face');assert(exteriorWalls>10000);
 const out=path.join(root,'qa-results/roads');fs.mkdirSync(out,{recursive:true});const report={passed:true,method:'Real indexed geometry, every vertical face winding and outside FrontSide ray; total side area pins the closed original perimeter. Production checks actual wall normals against their adjacent actual upward faces, not source-index spelling.',fixtures:rows,production:{verticalTriangles,exteriorWalls,frontSideRays}};fs.writeFileSync(path.join(out,'surface-regression.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
