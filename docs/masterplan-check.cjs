/* Current source + exact host geometry/motor acceptance. No WebGL claims.
 * node docs/masterplan-check.cjs */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadHost}=require('./masterplan-render-export.cjs');
(async()=>{
 const {garden:g,context:c,html,logs}=await loadHost(),T=c.THREE,mp=g.masterplan,qa=g.architectureQA;
 assert(mp,'masterplan integrated');assert.equal(html,fs.readFileSync(path.join(__dirname,'../island.html'),'utf8'));
 assert.equal(g.WORLD.ISLAND_RADIUS,150);assert.equal(g.WORLD.INNER_RING,70);assert.equal(g.WORLD.OUTER_RING,124);
 const metrics=mp.inspect();for(const key of ['draws','triangles','materials','lights','particles'])assert(metrics[key]<=metrics.budget[key],key+' budget');
 let upwardGroundFaces=0;mp.root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.geometry.type!=='BufferGeometry'||o.name.startsWith('physical'))return;const n=o.geometry.attributes.normal;if(!n)return;for(let i=0;i<n.count;i++){assert(n.getY(i)>.05,'upward front-face paving '+o.name);upwardGroundFaces++;}});
 const inlayNames=new Set(['works-grid','service-guides','overlook-fan','arrival-inlay','court-compass','moxi-open-frame','north-spine-bypass-inlay','pilot-wayfinding']);let separatedInlayVertices=0;
 mp.root.traverse(o=>{if(!o.isMesh||!inlayNames.has(o.name))return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const offset=p.getY(i)-g.terrainHeight(p.getX(i),p.getZ(i));assert(Math.abs(offset-.068)<.00001,'bronze inlay remains 16mm above base patch '+o.name);separatedInlayVertices++;}});assert(separatedInlayVertices>100,'actual inlay geometry tested, not source-only');
 assert.equal(metrics.forecourts,26);assert.equal(metrics.pockets,4);assert.equal(metrics.entrances,25);assert.equal(metrics.selectedRoute,null,'routes default off');
 assert.equal(new Set(mp.pockets.map(p=>p.style)).size,4);assert(mp.forecourts.every(p=>p.atGrade));
 for(const id of ['pilot','firstVisit','pilot',null,'missing',null]){mp.selectRoute(id);const expected=id&&mp.routes[id]?id:null;assert.equal(mp.inspect().selectedRoute,expected);assert.equal(Object.values(mp.routes).filter(r=>r.mesh.visible).length,expected?1:0);}
 // Entry labels are close, conventional names are middle distance, only three
 // existing landmarks remain named at distance. Reading text is not modified.
 assert(c.CourtyardMasterplan.labelPolicy(0,100,false).visible);assert(!c.CourtyardMasterplan.labelPolicy(1,100,false).visible);
 assert(c.CourtyardMasterplan.labelPolicy(23,350,false).visible);assert(c.CourtyardMasterplan.labelPolicy(20,125,false).visible);
 assert(!c.CourtyardMasterplan.labelPolicy(20,160,false).visible);assert(c.CourtyardMasterplan.labelPolicy(1,20,true).visible);
 assert(html.includes('b.max.y+5'),'labels retain above-roof placement');assert(html.includes('avatarBlocksInscription()'),'reading sightline protection retained');
 const records=[...qa.buildings,...mp.obstacles],failures=[],rows=[];
 function collision(x,z,y){const p=new T.Vector3(x,y+.06,z);for(const o of records){const q=p.clone().applyMatrix4(o.inverse);for(const b of o.collisionBoxes)if(q.y+1.7>b.min.y+.02&&q.y<b.max.y-.12&&q.x>b.min.x-.38&&q.x<b.max.x+.38&&q.z>b.min.z-.38&&q.z<b.max.z+.38)return o.index;}
   const butterfly=g.butterfly,q=butterfly.root.worldToLocal(p.clone());for(const b of butterfly.sea.collisions)if(Math.hypot(q.x-b.x,q.z-b.z)<b.r+.38)return 23;return null;}
 function checkPath(name,points,sides=[-1,0,1],newObstaclesOnly=false){let samples=0,maxSlope=0,length=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.z-a.z);assert(len>.00001,name+' no degenerate segments');length+=len;const nx=(b.z-a.z)/len,nz=-(b.x-a.x)/len,n=Math.ceil(len/.2);for(let j=0;j<=n;j++)for(const side of sides){const t=j/n,x=a.x+(b.x-a.x)*t+nx*side,z=a.z+(b.z-a.z)*t+nz*side,y=g.surfaceHeight(x,z);samples++;if(!Number.isFinite(y)||!g.walkable(x,z))failures.push({name,segment:i,reason:'outside walking surface',x,z});const hit=collision(x,z,y);if(hit!==null&&(!newObstaclesOnly||hit===99))failures.push({name,segment:i,reason:'capsule collision',building:hit,x,z});if(j){const px=a.x+(b.x-a.x)*(j-1)/n+nx*side,pz=a.z+(b.z-a.z)*(j-1)/n+nz*side;maxSlope=Math.max(maxSlope,Math.abs(y-g.surfaceHeight(px,pz))/(len/n));}}}rows.push({name,samples,length,maxSlope,collisionScope:newObstaclesOnly?'new furniture only; inherited edge-spine building contacts are outside the recommended route':'all authored building and new furniture colliders'});}
 for(const route of Object.values(mp.routes))checkPath(route.id,route.points);for(const repair of mp.repairs)checkPath(repair.id,repair.points,[-1.1,0,1.1]);
 // All inherited radial approaches retain their full three-metre path, not just
 // the pilot. The extra .38m is the actual player collision radius.
 for(const b of qa.buildings.filter(b=>b.index<26)){const a=b.point(0,-36),end=b.point(0,-b.depth/2-1.2);checkPath('entrance-'+b.index,[a,end],[-1.1,0,1.1]);}
 for(const o of mp.obstacles){const a=o.point(0,-3.2),b=o.point(0,3.2);checkPath('pause-'+o.metadata.district,[a,b],[-1.1,0,1.1]);}
 // Preserve physical access through the two road rings and cardinal spines.
 for(const radius of [34,88]){const p=Array.from({length:361},(_,i)=>({x:Math.sin(i*Math.PI/180)*radius,z:Math.cos(i*Math.PI/180)*radius}));checkPath('ring-'+radius,p);}
 for(const axis of ['x','z']){checkPath('spine-core-'+axis,[{x:axis==='x'?-88:0,z:axis==='z'?-88:0},{x:axis==='x'?88:0,z:axis==='z'?88:0}]);checkPath('spine-preserved-'+axis,[{x:axis==='x'?-140:0,z:axis==='z'?-140:0},{x:axis==='x'?140:0,z:axis==='z'?140:0}],[-1,0,1],true);}
 assert.equal(failures.length,0,JSON.stringify(failures.slice(0,10)));
 // Exercise the original motor end-to-end. No warp between waypoints, no
 // collision disabling, no replacement movement code, no jump needed.
 g.start();let motorSteps=0,maxAirborneHeight=0;const motorRows=[];
 for(const route of [...Object.values(mp.routes),...mp.repairs]){
  const start=route.points[0];g.teleport(start.x,start.z);let travelled=0,maxError=0;
  for(let i=1;i<route.points.length;i++){const target=route.points[i];let guard=0;while(Math.hypot(target.x-g.player.position.x,target.z-g.player.position.z)>.42){const d=Math.hypot(target.x-g.player.position.x,target.z-g.player.position.z);g.cameraState.yaw=Math.atan2(g.player.position.x-target.x,g.player.position.z-target.z);const before=g.player.position.clone();qa.step(Math.min(.06,d/10),['KeyW']);travelled+=before.distanceTo(g.player.position);motorSteps++;assert(++guard<2500,'motor stalled '+route.id+' segment '+i);maxAirborneHeight=Math.max(maxAirborneHeight,g.player.position.y-g.surfaceHeight(g.player.position.x,g.player.position.z));assert(g.player.position.y>=g.surfaceHeight(g.player.position.x,g.player.position.z)-.1,'no falling through route');}maxError=Math.max(maxError,Math.hypot(target.x-g.player.position.x,target.z-g.player.position.z));}
  qa.clear();motorRows.push({route:route.id,travelled,waypoints:route.points.length,maxWaypointError:maxError});
 }
 const canopy=mp.obstacles.find(b=>b.metadata.district===2);g.teleport(canopy.origin.x,canopy.origin.z);g.weather.setMode('rain');g.weather.update(0);const under=g.weather.sampleShelter(canopy.origin.x,canopy.origin.z);assert(under>canopy.origin.y+2.9,'actual canopy roof blocks weather');
 const covered=mp.surfaces.filter(s=>s.exposure===0),original=covered.map(s=>({color:s.material.color.toArray(),roughness:s.material.roughness}));g.weather.setMode('snow');covered.forEach((s,i)=>assert.deepEqual({color:s.material.color.toArray(),roughness:s.material.roughness},original[i],'covered floor and soffit stay dry'));
 const mode=g.weather.mode;g.masterplan.selectRoute('firstVisit');g.teleport(0,3);assert.equal(g.weather.mode,mode,'route/map navigation does not reset weather choice');g.weather.setMode('clear');mp.selectRoute(null);
 const report={passed:true,scope:'Exact Three.js host geometry, collision fields and original walker executed on CPU; not browser/WebGL or device performance acceptance',metrics,upwardGroundFaces,separatedInlayVertices,routeAndAccess:rows,totalGeometrySamples:rows.reduce((n,r)=>n+r.samples,0),motorSteps,maxAirborneHeight,motorRoutes:motorRows,canopyRoofY:under,coveredMaterials:covered.length,logs};
 const out=path.join(__dirname,'../qa-results/masterplan');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/geometry-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,metrics,geometrySamples:report.totalGeometrySamples,motorSteps,maxAirborneHeight,motorRoutes:motorRows,canopyRoofY:under},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
