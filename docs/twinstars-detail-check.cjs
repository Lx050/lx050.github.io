/* Exact-runtime building17 audit; no browser or GPU required. */
'use strict';
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js'),out=root+'/qa-results/twinstars';fs.mkdirSync(out,{recursive:true});
const baseline='f284106f4c7cba7e4bd7d8fa7befa641865c80ec';
function load(old,withoutOldRoofs=false){
  const c={console};c.window=c;vm.createContext(c);
  for(const name of [...(!old?['rss-detail']:[]),'architecture','content-core',...(!old?['twinstars-detail','causal-detail']:[]),...(!old?['versions-detail']:[]),...(!old?['city-detail','portraits-detail']:[]),...(!old?['session-detail']:[]),'content-narratives']){
    const file='assets/'+name+'.js';let source=old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{encoding:'utf8',maxBuffer:32*1024*1024}):fs.readFileSync(root+'/'+file,'utf8');
    if(withoutOldRoofs&&name==='content-narratives')for(const line of ["      b.barrel(x,0,6.55,16.6,6.27,2.72,'copper');", "      b.box('cedar',x,5.97,0,6.55,.18,15.7);"]){assert.equal(source.split(line).length,2,'one exact approved roof replacement');source=source.replace(line,'');}
    vm.runInContext(source,c,{filename:file});
  }
  return c;
}
const c=load(false),old=load(true),retained=load(true,true),make=context=>context.CourtyardArchitecture.build({THREE:T,index:17,title:'双星记',zone:2});
const b=make(c),before=make(old),withoutRoofs=make(retained);b.root.updateMatrixWorld(true);
const detail=b.root.getObjectByName('twinstars-blender-static'),registers=b.root.getObjectByName('four-reciprocal-registers');assert(detail&&registers,'static geometry and original reciprocal mechanism exist');assert.equal(detail.parent,b.root);
const screens=[];registers.traverse(o=>{if(o.name==='twinstars-blender-screen')screens.push(o);});assert.equal(screens.length,8,'eight details attached to the eight original screens');
for(const screen of screens)assert(/^register-[0-3]-(-1|1)$/.test(screen.parent.name),'each screen detail belongs to its original pivot');
const sections=c.CourtyardTwinstarsDetail.data.sections;let triangles=0,calls=0;
for(const group of [detail,...screens])for(const mesh of group.children){
  assert(mesh.isMesh,'material batch is a mesh');calls++;const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;triangles+=p.count/3;
  assert.equal(p.count%3,0);assert.equal(n.count,p.count);for(const value of [...p.array,...n.array])assert(Number.isFinite(value),'finite positions and normals');
  for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),v=new T.Vector3().fromBufferAttribute(p,i+1),w=new T.Vector3().fromBufferAttribute(p,i+2);assert(v.sub(a).cross(w.sub(a)).length()>1e-9,'nondegenerate Blender triangle');}
}
assert.equal(triangles,sections.static.triangles+8*sections.screen.triangles);assert(triangles<20000,'whole-building detail triangle budget');
assert(new T.Box3().setFromObject(detail).min.y>=0,'details stay above the floor');
// Audit the emitted copper shells, not just generator metadata.
const roofMeshes=detail.children.filter(mesh=>mesh.name==='twinstars-static-copper');assert.equal(roofMeshes.length,1,'one roof material batch');
const roofPositions=roofMeshes[0].geometry.attributes.position,copperFaces=[],vertexFaces=new Map();
const vertexKey=v=>v.toArray().map(x=>x.toFixed(4)).join(',');
for(let i=0;i<roofPositions.count;i+=3){const face=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(roofPositions,i+j)),index=copperFaces.length;copperFaces.push(face);for(const v of face){const key=vertexKey(v);if(!vertexFaces.has(key))vertexFaces.set(key,[]);vertexFaces.get(key).push(index);}}
// Separate actual connected solids: copper also contains the lower gutter channels.
const visited=new Set(),components=[];
for(let start=0;start<copperFaces.length;start++){if(visited.has(start))continue;const queue=[start],faces=[];visited.add(start);while(queue.length){const index=queue.pop(),face=copperFaces[index];faces.push(face);for(const v of face)for(const neighbor of vertexFaces.get(vertexKey(v)))if(!visited.has(neighbor)){visited.add(neighbor);queue.push(neighbor);}}components.push(faces);}
const roofs=components.filter(faces=>faces.some(face=>face.some(v=>v.y>9))).sort((a,b)=>a[0][0].x-b[0][0].x);assert.equal(roofs.length,2,'exactly two tall copper shell solids');
const roofReports=roofs.map((faces,index)=>{
  const center=index===0?-6.3:6.3,edges=new Map(),vertices=new Map(),bounds=new T.Box3();let volume=0;
  for(const face of faces){for(const v of face){bounds.expandByPoint(v);vertices.set(vertexKey(v),v);}const [a,v,w]=face;volume+=a.dot(v.clone().cross(w))/6;
    for(const [a,b]of[[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){const ka=vertexKey(a),kb=vertexKey(b),key=[ka,kb].sort().join('|'),entry=edges.get(key)||{count:0,direction:0};entry.count++;entry.direction+=ka<kb?1:-1;edges.set(key,entry);}}
  for(const edge of edges.values()){assert.equal(edge.count,2,'closed actual roof edges');assert.equal(edge.direction,0,'consistent actual roof winding');}assert(volume>0,'positive actual roof volume');assert.equal(faces.length,260,'32-section closed vault topology');
  for(const [actual,expected]of[[bounds.min.x,center-3.275],[bounds.max.x,center+3.275],[bounds.min.y,6.11],[bounds.max.y,10.17],[bounds.min.z,-8.3],[bounds.max.z,8.3]])assert(Math.abs(actual-expected)<2e-5,'equal authored barrel envelope');
  for(const v of vertices.values())assert(Array.from({length:33},(_,k)=>k*Math.PI/32).some(t=>Math.abs(v.x-(center+3.275*Math.cos(t)))<2e-5&&Math.min(Math.abs(v.y-(6.27+3.9*Math.sin(t))),Math.abs(v.y-(6.11+3.9*Math.sin(t))))<2e-5),'actual 32-section elliptical barrel profile');
  for(const v of vertices.values())assert([...vertices.values()].some(w=>Math.abs(v.x-w.x)<2e-5&&Math.abs(v.z-w.z)<2e-5&&Math.abs(Math.abs(v.y-w.y)-.16)<2e-5),'every shell vertex has a 16 cm vertical skin partner');
  return{center,triangles:faces.length,vertices:vertices.size,edges:edges.size,volume,min:bounds.min.toArray(),max:bounds.max.toArray()};
});
function localRoof(faces,center){return faces.flat().map(v=>[v.x-center,v.y,v.z].map(value=>Math.round(value*10000)/10000).join(',')).sort();}
assert.deepEqual([...new Set(localRoof(roofs[0],-6.3))],[...new Set(localRoof(roofs[1],6.3))],'identical actual roof vertices after translation');
let roofRays=0;const roofSamples=[];
for(const center of [-6.3,6.3])for(const xOffset of [-3,-2.2,-1.1,0,1.1,2.2,3])for(const z of [-7.7,-3.35,.31,4.35,7.7]){
  const top=new T.Raycaster(new T.Vector3(center+xOffset,12,z),new T.Vector3(0,-1,0),0,7).intersectObjects(roofMeshes,false)[0];
  const bottom=new T.Raycaster(new T.Vector3(center+xOffset,5,z),new T.Vector3(0,1,0),0,7).intersectObjects(roofMeshes,false)[0];
  assert(top&&bottom,'actual roof top and underside hit');assert(Math.abs(top.point.y-bottom.point.y-.16)<2e-5,'actual 16 cm roof thickness');roofRays+=2;roofSamples.push({center,xOffset,z,top:top.point.y,bottom:bottom.point.y});
}
// Real oak ribs meet the underside at the original three post-frame stations.
const oakMeshes=detail.children.filter(mesh=>mesh.name==='twinstars-static-oak');assert.equal(oakMeshes.length,1);let ribContactRays=0;
for(const center of [-6.3,6.3])for(const z of [-7.45,0,7.45])for(const xOffset of [-3,-2.2,-1.1,0,1.1,2.2,3]){
  const rib=new T.Raycaster(new T.Vector3(center+xOffset,12,z),new T.Vector3(0,-1,0),0,7).intersectObjects(oakMeshes,false)[0];
  const underside=new T.Raycaster(new T.Vector3(center+xOffset,5,z),new T.Vector3(0,1,0),0,7).intersectObjects(roofMeshes,false)[0];
  assert(rib&&underside,'actual rib and roof underside hit');assert(Math.abs(rib.point.y-underside.point.y)<2e-5,'actual rib meets roof underside');ribContactRays+=2;
}
function additions(o){for(let p=o;p;p=p.parent)if(p.name.startsWith('twinstars-blender-'))return true;return false;}
function originals(building,lowerOnly=false){
  building.root.updateMatrixWorld(true);const rows=[];
  building.root.traverse(o=>{if(!o.isMesh||additions(o))return;const p=o.geometry.attributes.position,idx=o.geometry.index,materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>({color:m.color?.toArray(),opacity:m.opacity,metalness:m.metalness,roughness:m.roughness,side:m.side,transparent:m.transparent}));
    if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
      const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(i,im);matrix.multiply(im);}const box=o.geometry.boundingBox.clone().applyMatrix4(matrix);if(lowerOnly&&box.max.y>5)continue;
      rows.push({name:o.name,positions:Array.from(p.array),indices:idx?Array.from(idx.array):null,matrix:matrix.toArray(),materials,box:[box.min.toArray(),box.max.toArray()]});}});return rows;
}
const digest=rows=>crypto.createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(row)).sort())).digest('hex');
const near=(a,b)=>Math.abs(a-b)<1e-5,phases=[0,.25,.5,.75,1,.4,0,1],screenBounds=[];
let minScreenHeight=Infinity;
for(const phase of phases){
  for(const building of [before,withoutRoofs,b])for(const m of building.mechanisms)m.articulate?.(phase);b.root.updateMatrixWorld(true);
  for(const screen of screens){const pivot=screen.parent,match=pivot.name.match(/^register-(\d)-(-?1)$/),k=+match[1],s=+match[2],wave=Math.sin(phase*Math.PI*1.5+k*Math.PI/2);
    assert(near(pivot.rotation.y,s*wave*.27),'original reciprocal rotation law');assert(near(pivot.position.z,-5.55+k*3.7+s*wave*.19),'original reciprocal travel law');assert.deepEqual(pivot.scale.toArray(),[1,1,1],'rigid pivot scaling');assert.deepEqual(screen.position.toArray(),[0,0,0],'detail remains local to original pivot');
    for(const value of pivot.matrixWorld.elements)assert(Number.isFinite(value),'finite phase transform');const box=new T.Box3().setFromObject(screen);minScreenHeight=Math.min(minScreenHeight,box.min.y);assert(box.min.y>=3.6,'screen sweep remains safely overhead');assert(box.max.y<=5.4,'screen has a bounded overhead envelope');assert(s<0?box.max.x<0:box.min.x>0,'entire screen remains on its own side');screenBounds.push({phase,name:pivot.name,min:box.min.toArray(),max:box.max.toArray()});
  }
  assert.equal(digest(originals(b,true)),digest(originals(before,true)),'all original below-5 m exhibits unchanged at phase '+phase);
  assert.equal(digest(originals(b)),digest(originals(withoutRoofs)),'every non-roof original mesh, post and screen unchanged at phase '+phase);
}
assert.equal(JSON.stringify(b.metadata.visitorRoutes),JSON.stringify(before.metadata.visitorRoutes),'unchanged visitor routes');assert.equal(JSON.stringify(b.metadata.observations),JSON.stringify(before.metadata.observations),'unchanged source claims');
const retainedBoxes=before.collisionBoxes.map(box=>JSON.stringify([box.min.toArray(),box.max.toArray(),box.userData]));const currentBoxes=b.collisionBoxes.map(box=>JSON.stringify([box.min.toArray(),box.max.toArray(),box.userData]));assert.equal(JSON.stringify(currentBoxes),JSON.stringify(retainedBoxes),'all original collision footprints remain unchanged');
// The central through-route and each independent front/rear entrance retain body clearance.
const paths=[{name:'central-through-route',xs:[-1.1,0,1.1],from:-11,to:11},...[-1,1].flatMap(s=>[{name:'room-'+s+'-front-entry',xs:[s*6.3-.65,s*6.3,s*6.3+.65],from:-10.5,to:-2.1},{name:'room-'+s+'-rear-entry',xs:[s*6.3-.65,s*6.3,s*6.3+.65],from:7.1,to:10.5}])];
let aisleSamples=0,entrySamples=0,headroomRays=0;const pathReports=[];
const sides=new Map();b.root.traverse(o=>{if(o.isMesh)for(const material of Array.isArray(o.material)?o.material:[o.material])if(!sides.has(material)){sides.set(material,material.side);material.side=T.DoubleSide;}});
for(const route of paths){for(const x of route.xs)for(const box of b.collisionBoxes)if(box.min.y<1.8&&box.max.y>.12)assert(!(x>=box.min.x-.38&&x<=box.max.x+.38&&route.to>=box.min.z-.38&&route.from<=box.max.z+.38),route.name+' exact continuous body envelope');let samples=0;for(let step=0;step<=Math.ceil((route.to-route.from)/.1);step++){const z=Math.min(route.to,route.from+step*.1);for(const x of route.xs){samples++;for(const box of b.collisionBoxes)if(box.min.y<1.8&&box.max.y>.12)assert(!box.clone().expandByScalar(.38).containsPoint(new T.Vector3(x,.5,z)),route.name+' collision at '+x+','+z);
    headroomRays++;assert.equal(new T.Raycaster(new T.Vector3(x,.15,z),new T.Vector3(0,1,0),0,2.25).intersectObject(b.root,true).length,0,route.name+' actual mesh clearance at '+x+','+z);}}
  if(route.name==='central-through-route')aisleSamples+=samples;else entrySamples+=samples;pathReports.push({...route,samples});}
for(const [material,side]of sides)material.side=side;
const second=make(c),secondDetail=second.root.getObjectByName('twinstars-blender-static');assert.notEqual(detail,secondDetail);for(let i=0;i<detail.children.length;i++)assert.equal(detail.children[i].geometry,secondDetail.children[i].geometry,'cached static geometry');
const secondScreen=second.root.getObjectByName('twinstars-blender-screen');for(const screen of screens){assert.notEqual(screen,secondScreen);for(let i=0;i<screen.children.length;i++)assert.equal(screen.children[i].geometry,secondScreen.children[i].geometry,'cached screen geometry');}assert.notEqual(screens[0].parent,secondScreen.parent,'independent screen pivots');
assert.equal(fs.readFileSync(root+'/index.html','utf8'),fs.readFileSync(root+'/island.html','utf8'));
// Export every actual runtime mesh and instance for CPU render review, phase 1.
const meshes=[];b.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index,material=Array.isArray(o.material)?o.material[0]:o.material;
  for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(i,im);matrix.multiply(im);}const verts=[];for(let j=0;j<p.count;j++){const v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(matrix);verts.push([v.x,-v.z,v.y]);}const faces=[];for(let j=0;j<(idx?idx.count:p.count);j+=3)faces.push(idx?[idx.getX(j),idx.getX(j+1),idx.getX(j+2)]:[j,j+1,j+2]);meshes.push({name:o.name,verts,faces,color:material.color.toArray(),opacity:material.opacity,metalness:material.metalness,roughness:material.roughness});}});
fs.writeFileSync(out+'/runtime-assembly.json',JSON.stringify(meshes));
const result={passed:true,building:17,baseline,staticParts:sections.static.parts,screenPartsEach:sections.screen.parts,screenInstances:8,triangles,calls,roofVerticalThicknessMetres:.16,roofRays,ribContactRays,roofReports,equalRoofEnvelopes:true,originalLowerExhibits:originals(b,true).length,allRetainedOriginalMeshes:originals(b).length,allOriginalPostsPreserved:true,checkedPhases:phases.length,minScreenHeight,screenBounds,aisleSamples,entrySamples,continuousBodySegments:paths.reduce((sum,path)=>sum+path.xs.length,0),headroomRays,pathReports,sharedGeometry:true,exportedMeshes:meshes.length};
fs.writeFileSync(out+'/checks.json',JSON.stringify(result,null,2));console.log({...result,screenBounds:'64 bounded screen phase samples saved in checks.json'});
