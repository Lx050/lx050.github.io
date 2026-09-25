/* Run against a local static server. Test tooling is external to the shipped single file.
   PLAYWRIGHT_PATH=/path/to/playwright node docs/wave1-check.cjs http://127.0.0.1:8874
   WAVE1_ARTIFACTS=/tmp/wave2-qa controls screenshots and JSON report. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv[2]||'http://127.0.0.1:8874';
const out=process.env.WAVE1_ARTIFACTS||'/tmp/wave2-qa';fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.equal(html,fs.readFileSync(path.join(__dirname,'../island.html'),'utf8'));
for(const [pattern,hash] of [[/const LINKS = (\[[\s\S]*?\n\]);/,'ace50acab071aea8f309c15e55bc67c2afc8e17f36b5a4544a980c942c1f1d42'],[/const TRACKS=(\[[\s\S]*?\n\]);/,'da871476abe678cee5e02d374c710a1ec98d904195550ca94ab30d34ee8a558b']])assert.equal(crypto.createHash('sha256').update(html.match(pattern)[1]).digest('hex'),hash);
assert(!/<script[^>]+src=["']https?:/.test(html));
// Verify the binary's real transforms/accessors before any browser adaptation.
function measureButterflyGLB(){
 const THREE=require('../vendor/three.min.js'),buffer=fs.readFileSync(path.join(__dirname,'../assets/models/LM24_Butterfly.glb'));
 const length=buffer.readUInt32LE(12),g=JSON.parse(buffer.toString('utf8',20,20+length)),bin=buffer.subarray(28+length),parts={};
 assert.equal(g.nodes.length,16);assert.equal(g.meshes.length,15);assert.equal(g.materials.length,4);assert.equal((g.skins||[]).length,0);assert.equal((g.animations||[]).length,0);
 for(const node of g.nodes){if(node.mesh===undefined)continue;const primitive=g.meshes[node.mesh].primitives[0],a=g.accessors[primitive.attributes.POSITION],view=g.bufferViews[a.bufferView],offset=(view.byteOffset||0)+(a.byteOffset||0);
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...(node.translation||[0,0,0])),new THREE.Quaternion(...(node.rotation||[0,0,0,1])),new THREE.Vector3(...(node.scale||[1,1,1]))),box=new THREE.Box3();
  for(let i=0;i<a.count;i++){const p=offset+i*(view.byteStride||12);box.expandByPoint(new THREE.Vector3(bin.readFloatLE(p),bin.readFloatLE(p+4),bin.readFloatLE(p+8)).applyMatrix4(matrix));}
  parts[node.name]={min:box.min.toArray(),max:box.max.toArray(),rotation:node.rotation||[0,0,0,1],material:g.materials[primitive.material].name};
  if(node.name.startsWith('Wing')){assert.equal(parts[node.name].material,'ivory');assert(primitive.attributes.TEXCOORD_0!==undefined);assert.equal(primitive.attributes.COLOR_0,undefined);assert(!g.materials[primitive.material].pbrMetallicRoughness.baseColorTexture);}
 }
 const pivotY=(parts.WingLL.max[1]+parts.WingUL.min[1])/2;assert(Math.abs(pivotY-1.145)<1e-6);assert(Math.abs(parts.Body.max[0]-.045)<1e-6);
 return {nodes:g.nodes.length,meshes:g.meshes.length,materials:g.materials.length,skins:0,animations:0,parts,pivotY};
}
const butterflySource=measureButterflyGLB();

// Display-space luminance: full composited WebGL frame, before HTML HUD/vignette.
// Night mean .025–.32; solid monument mean .025–.48 and p95 <=.65.
// White components use 4-connectivity at actual drawing-buffer resolution.
async function exposure(p,name,mobile){
 await p.evaluate(()=>__garden.setSky(.55));await p.waitForTimeout(80);
 const stats=await p.evaluate(()=>{
  const g=__garden,r=g.renderer,gl=r.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,n=w*h;
  g.composer.render(0);const pixels=new Uint8Array(n*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const white=new Uint8Array(n),luma=new Float32Array(n);let sum=0,count=0,max=0;
  for(let i=0;i<n;i++){const y=(pixels[i*4]*.2126+pixels[i*4+1]*.7152+pixels[i*4+2]*.0722)/255;luma[i]=y;sum+=y;if(y>.97){white[i]=1;count++;}}
  const queue=new Int32Array(n);
  for(let i=0;i<n;i++)if(white[i]){let head=0,tail=1;queue[0]=i;white[i]=0;while(head<tail){const j=queue[head++],x=j%w;for(const k of [x?j-1:-1,x<w-1?j+1:-1,j-w,j+w])if(k>=0&&k<n&&white[k]){white[k]=0;queue[tail++]=k;}}max=Math.max(max,tail);}
  // Depth-tested solid-body mask: preserve every occluder, paint only non-emissive
  // monument surfaces white. No fog, lighting, sky, bloom, labels or lamps in mask.
  const swaps=[],hidden=[],black=new THREE.MeshBasicMaterial({color:0,fog:false}),solid=new THREE.MeshBasicMaterial({color:0xffffff,fog:false});
  const blackBackdrop=black.clone();blackBackdrop.depthWrite=false;
  g.scene.traverse(o=>{if(o.isMesh){const old=o.material;swaps.push([o,old]);const mats=Array.isArray(old)?old:[old];o.material=mats.map(m=>m.userData.monument&&!(m.emissive&&m.emissive.getHex()>0)?solid:m.depthWrite===false?blackBackdrop:black);if(!Array.isArray(old))o.material=o.material[0];}else if(o.isSprite||o.isPoints){hidden.push([o,o.visible]);o.visible=false;}});
  const bg=g.scene.background;g.scene.background=new THREE.Color(0);const rt=new THREE.WebGLRenderTarget(w,h);r.setRenderTarget(rt);r.render(g.scene,g.camera);const mask=new Uint8Array(n*4);r.readRenderTargetPixels(rt,0,0,w,h,mask);
  r.setRenderTarget(null);rt.dispose();g.scene.background=bg;swaps.forEach(([o,m])=>o.material=m);hidden.forEach(([o,v])=>o.visible=v);black.dispose();blackBackdrop.dispose();solid.dispose();g.composer.render(0);
  const values=[];for(let i=0;i<n;i++)if(mask[i*4]>200)values.push(luma[i]);values.sort((a,b)=>a-b);
  return {width:w,height:h,whiteRatio:count/n,maxWhiteComponent:max/n,mean:sum/n,body:{pixels:values.length,coverage:values.length/n,mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:0,p95:values[Math.floor(values.length*.95)]||0},camera:g.camera.position.toArray(),target:g.cameraLook.toArray(),player:g.player.position.toArray()};
 });
 await p.screenshot({path:path.join(out,`${mobile?'mobile':'desktop'}-${name}.png`)});
 assert(stats.whiteRatio<=(mobile?.04:.02),`${name}: near-white area ${stats.whiteRatio}`);
 assert(stats.maxWhiteComponent<.005,`${name}: contiguous clipping ${stats.maxWhiteComponent}`);
 assert(stats.mean>=.025&&stats.mean<=.32,`${name}: night mean ${stats.mean}`);
 if(name==='distant')assert(stats.body.coverage>.01,`${name}: monument hidden behind backdrop`);
 if(['court','foot'].includes(name)){assert(stats.body.pixels>100,`${name}: body mask empty`);assert(stats.body.mean>=.025&&stats.body.mean<=.48&&stats.body.p95<=.65,`${name}: body luminance ${JSON.stringify(stats.body)}`);}
 return stats;
}
async function cameraAudit(p,mobile){
 return p.evaluate(async mobile=>{
  const g=__garden,rows=[],errors=[],pause=()=>new Promise(requestAnimationFrame);
  // Independent slab intersection (no application collision helper).
  function obstructed(a,b,box){let lo=0,hi=1;for(const k of ['x','y','z']){const d=b[k]-a[k];if(Math.abs(d)<1e-9){if(a[k]<box.min[k]||a[k]>box.max[k])return false;}else{let t0=(box.min[k]-a[k])/d,t1=(box.max[k]-a[k])/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return false;}}return lo<1-1e-5&&hi>1e-5;}
  for(const l of g.landmarks){
   g.teleport(l.entryPoint.x,l.entryPoint.z);g.cameraState.yaw=Math.atan2(-l.site.ux,-l.site.uz);
   const start=performance.now();while(performance.now()-start<3200)await pause();
   const camera=g.camera.position,target=g.cameraLook,boxes=g.subjectBounds();
   const inside=boxes.flatMap((b,i)=>b.containsPoint(camera)?[i]:[]),blocked=boxes.flatMap((b,i)=>obstructed(camera,target,b)?[i]:[]);
   const height=l.bounds.max.y-l.bounds.min.y,k=mobile?.62:.5,distance=Math.hypot(camera.x-l.x,camera.z-l.z);
   const corners=[];for(const x of [l.bounds.min.x,l.bounds.max.x])for(const y of [l.bounds.min.y,l.bounds.max.y])for(const z of [l.bounds.min.z,l.bounds.max.z])corners.push(new THREE.Vector3(x,y,z).project(g.camera));
   const fits=corners.every(c=>Math.abs(c.x)<.99&&Math.abs(c.y)<.99&&c.z<1);
   if(inside.length||blocked.length||distance<k*height||!fits)errors.push({index:l.index,inside,blocked,distance,minimum:k*height,fits});
   rows.push({index:l.index,camera:camera.toArray(),target:target.toArray(),inside,blocked,distance,minimum:k*height,fits});
  }return {errors,rows};
 },mobile);
}
async function dressingAudit(p,fallback=false){
 return p.evaluate(fallback=>{
  const g=__garden,rows=[],errors=[];g.scene.updateMatrixWorld(true);
  const roots=[];g.scene.traverse(o=>{if((fallback?['fallback','math-fallback']:['major','standard','math']).includes(o.userData.tier))roots.push(o);});
  for(const root of roots){
   const layer=root.userData.dressing,trims=[];let instances=0;
   layer.traverse(o=>{if(!o.isInstancedMesh)return;instances+=o.count;for(let i=0;i<o.count;i++){const matrix=new THREE.Matrix4();o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);const points=[];for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])points.push(new THREE.Vector3(x,y,z).applyMatrix4(matrix));trims.push(points);}});
   const measured=new THREE.Box3().setFromObject(root);for(const points of trims)for(const v of points)measured.expandByPoint(v);
   const stored=root.userData.bounds;if(measured.min.distanceTo(stored.min)>.001||measured.max.distanceTo(stored.max)>.001)errors.push({root:root.uuid,boundsMismatch:true});
   let largeFaces=0,maxGap=0;
   // Re-measure real geometry, then project actual instance vertices into each face.
   // Every 1m cross-section of a large face must be cut into spans <=12m.
   for(const f of g.monumentFaces(root)){
    const w=f.maxU-f.minU,h=f.maxV-f.minV;if(w<=12||h<=12)continue;largeFaces++;
    const rails=trims.map(points=>{const n=points.map(p=>p.dot(f.n)-f.d);if(Math.min(...n)<-.12||Math.max(...n)>.3)return null;const u=points.map(p=>p.dot(f.u)),v=points.map(p=>p.dot(f.v));return {u0:Math.min(...u),u1:Math.max(...u),v0:Math.min(...v),v1:Math.max(...v)};}).filter(Boolean);
    for(let y=f.minV+.5;y<f.maxV;y+=1){
     const spans=[];
     for(let i=0;i<f.points.length;i+=3){const hits=[];for(let j=0;j<3;j++){const a=f.points[i+j],b=f.points[i+(j+1)%3],av=a.dot(f.v),bv=b.dot(f.v);if((y-av)*(y-bv)<=0&&Math.abs(bv-av)>1e-7)hits.push(a.dot(f.u)+(b.dot(f.u)-a.dot(f.u))*(y-av)/(bv-av));}if(hits.length>1)spans.push([Math.min(...hits),Math.max(...hits)]);}
     spans.sort((a,b)=>a[0]-b[0]);const merged=[];for(const s of spans){const prev=merged[merged.length-1];if(prev&&s[0]<=prev[1]+.001)prev[1]=Math.max(prev[1],s[1]);else merged.push(s);}
     const cuts=rails.filter(r=>r.v0<=y&&r.v1>=y).sort((a,b)=>a.u0-b.u0);
     for(const [a,b] of merged){let cursor=a;for(const cut of cuts){if(cut.u1<=cursor||cut.u0>=b)continue;maxGap=Math.max(maxGap,Math.max(0,cut.u0-cursor));cursor=Math.max(cursor,cut.u1);}maxGap=Math.max(maxGap,Math.max(0,b-cursor));}
    }
   }
   if(maxGap>12.01||!instances)errors.push({root:root.uuid,maxGap,instances});rows.push({tier:root.userData.tier,largeFaces,maxGap,instances});
  }return {errors,rows};
 },fallback);
}

// Real scene readback, with a separate depth-tested mask of just the four front wings.
// RAF pause is injected by the harness only, so captures share exact camera/pose/time.
async function wingPixels(p){return p.evaluate(()=>{
 const g=__garden,r=g.renderer,gl=r.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,n=w*h;
 g.composer.render(0);const pixels=new Uint8Array(n*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 const swaps=[],hidden=[],black=new THREE.MeshBasicMaterial({color:0,side:THREE.DoubleSide,fog:false}),white=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,fog:false}),back=black.clone();back.depthWrite=false;
 g.scene.traverse(o=>{if(o.isMesh){swaps.push([o,o.material]);const mat=Array.isArray(o.material)?o.material[0]:o.material;o.material=g.butterfly.wings.includes(o)?white:mat.depthWrite===false?back:black;}else if(o.isSprite||o.isPoints){hidden.push([o,o.visible]);o.visible=false;}});
 const rt=new THREE.WebGLRenderTarget(w,h),bg=g.scene.background;g.scene.background=new THREE.Color(0);r.setRenderTarget(rt);r.render(g.scene,g.camera);const mask=new Uint8Array(n*4);r.readRenderTargetPixels(rt,0,0,w,h,mask);r.setRenderTarget(null);rt.dispose();g.scene.background=bg;swaps.forEach(([o,m])=>o.material=m);hidden.forEach(([o,v])=>o.visible=v);black.dispose();white.dispose();back.dispose();g.composer.render(0);
 let count=0,saturation=0,coloured=0,nearWhite=0;for(let i=0;i<n;i++)if(mask[i*4]>200){const rgb=[pixels[4*i],pixels[4*i+1],pixels[4*i+2]],mx=Math.max(...rgb),mn=Math.min(...rgb),sat=mx?(mx-mn)/mx:0;count++;saturation+=sat;if(sat>.3)coloured++;if(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>255*.97)nearWhite++;}
 return {pixels:count,saturation:saturation/Math.max(1,count),colouredRatio:coloured/Math.max(1,count),whiteRatio:nearWhite/Math.max(1,count),reveal:g.butterfly.reveal,uniformReveal:g.butterfly.wings[0].material.userData.revealUniforms.uReveal.value};
});}
async function butterflyAudit(p,mobile){
 const structure=await p.evaluate(()=>{
  const g=__garden,b=g.butterfly,errors=[],wrap=b.root.parent;
  for(const [h,names] of [[b.left,['WingUL','WingLL','BackUL','BackLL']],[b.right,['WingUR','WingLR','BackUR','BackLR']]])if(!h.isGroup||h.children.map(o=>o.name).sort().join()!==names.sort().join())errors.push('hinge children');
  if(wrap.userData.tier!=='butterfly'||wrap.userData.dressing.children.length||wrap.getObjectByName('face-trim'))errors.push('generic dressing');
  const panel=b.root.getObjectByName('Panel');if(panel.material.map||panel.material.emissive.getHex()!==0||panel.material.userData.revealWing)errors.push('blank canvas');
  for(const w of b.wings){const m=w.material,u=m.userData.revealUniforms;if(!m.isMeshStandardMaterial||!m.userData.revealWing||!u.uReveal||!u.uTime||!u.uVisited||!u.uNight||m===g.sharedIvory)errors.push('wing material');}
  const expected=new THREE.Color(0xe8e2d5).convertSRGBToLinear();if(g.sharedIvory.userData.revealUniforms||g.sharedIvory.onBeforeCompile.toString().includes('wing'))errors.push('shared ivory polluted');
  const shared=g.sharedIvory.color.toArray();if(shared.some((x,i)=>Math.abs(x-expected.toArray()[i])>1e-9))errors.push('shared colour');
  const sample=[];g.scene.traverse(o=>{if(o.isMesh&&o.userData.landmark?.index===0)sample.push({name:o.name,color:o.material.color?.toArray(),reveal:!!o.material.userData.revealWing});});if(sample.some(x=>x.reveal))errors.push('other landmark shader');
  const saved=[b.left.quaternion.clone(),b.right.quaternion.clone()],box=g.landmarks[23].bounds,escaped=[],panelBox=new THREE.Box3().setFromObject(panel);let vertices=0,minPanelClearance=Infinity;
  // Independent random-looking poses plus both limits; sample every actual vertex.
  for(let j=0;j<=40;j++){const a=g.BUTTERFLY.maxAngle*(j===40?1:(j*17%40)/40);b.left.rotation.set(0,a,0);b.right.rotation.set(0,-a,0);g.scene.updateMatrixWorld(true);
   for(const hinge of [b.left,b.right])for(const mesh of hinge.children){const pos=mesh.geometry.attributes.position;for(let i=0;i<pos.count;i++){const v=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);vertices++;if(!box.containsPoint(v))escaped.push(mesh.name);const local=b.root.worldToLocal(v.clone());minPanelClearance=Math.min(minPanelClearance,local.z-(-.05));}}
  }
  b.left.quaternion.copy(saved[0]);b.right.quaternion.copy(saved[1]);g.scene.updateMatrixWorld(true);
  const lod=wrap.parent.getObjectByName('butterfly-silhouette');if(!lod||lod.children[0].children.filter(x=>x.name==='silhouette-wing').length!==4)errors.push('silhouette');
  return {errors,pivots:[b.left.position.toArray(),b.right.position.toArray()],vertices,escaped,minPanelClearance,shared,sample,palette:g.BUTTERFLY.palette,margin:b.sweepMargin,panelSize:panelBox.getSize(new THREE.Vector3()).toArray()};
 });
 assert.deepEqual(structure.errors,[]);assert.deepEqual(structure.escaped,[]);assert(structure.minPanelClearance>0);
 async function collect(ms){return p.evaluate(async ms=>{const rows=[],start=performance.now();while(performance.now()-start<ms){await new Promise(requestAnimationFrame);const b=__garden.butterfly;rows.push({a:b.left.userData.angle,r:b.right.userData.angle,reveal:b.reveal});}return {fps:rows.length*1000/(performance.now()-start),min:Math.min(...rows.map(x=>x.a)),max:Math.max(...rows.map(x=>x.a)),mirrorError:Math.max(...rows.map(x=>Math.abs(x.a+x.r))),frames:rows.length};},ms);}
 await p.evaluate(()=>{(()=>{const l=__garden.landmarks[23];__garden.teleport(l.x-l.site.ux*36,l.z-l.site.uz*36)})();__garden.setSky(.55)});await p.waitForTimeout(6000);
 const idle=await collect(3000);assert(idle.max<=.05501&&idle.min>=.01199);assert(idle.max-idle.min>.0001);assert(idle.mirrorError<1e-9);
 const baselineMaterials=await p.evaluate(()=>{const rows=[];__garden.scene.traverse(o=>{if(o.isMesh&&o.userData.landmark?.index!==23&&o.userData.landmark&&o.material.color)rows.push([o.uuid,o.material.color.toArray()]);});return rows;});
 // Establish the real entry-point camera without waiting for activation to colour it.
 await p.evaluate(()=>{const g=__garden,l=g.landmarks[23];g.teleport(l.entryPoint.x,l.entryPoint.z);g.cameraState.yaw=Math.atan2(-l.site.ux,-l.site.uz)});await p.waitForTimeout(3600);
 const fixed=await p.evaluate(()=>({position:__garden.camera.position.toArray(),target:__garden.cameraLook.toArray()}));
 await p.evaluate(()=>(()=>{const l=__garden.landmarks[23];__garden.teleport(l.x-l.site.ux*36,l.z-l.site.uz*36)})());await p.waitForTimeout(7000);
 async function lock(view=fixed,night=true){if(night){await p.evaluate(()=>__garden.setSky(.55));await p.waitForTimeout(80);}await p.evaluate(view=>{window.__pauseFrames=true;const g=__garden;g.butterfly.left.rotation.set(0,.1,0);g.butterfly.right.rotation.set(0,-.1,0);g.butterfly.wings.forEach(w=>w.material.userData.revealUniforms.uTime.value=20);g.scene.updateMatrixWorld(true);g.camera.position.fromArray(view.position);g.cameraLook.fromArray(view.target);g.camera.lookAt(g.cameraLook);g.camera.updateMatrixWorld(true);g.composer.render(0);},view);}
 const photos={};await lock();const rest=await wingPixels(p);photos.rest=await exposure(p,'butterfly-rest',mobile);await p.evaluate(()=>window.__pauseFrames=false);
 assert(rest.uniformReveal<.01);assert(rest.pixels>100);assert(rest.saturation<.24,JSON.stringify(rest));
 // Fixed processional view: player at the foot of the original stairs, eye on axis.
 await p.evaluate(()=>{const g=__garden,l=g.landmarks[23];g.teleport(l.x-l.site.ux*30,l.z-l.site.uz*30);g.cameraState.yaw=Math.atan2(-l.site.ux,-l.site.uz);});await p.waitForTimeout(3500);
 const axial=await p.evaluate(()=>{const g=__garden,l=g.landmarks[23],x=l.x-l.site.ux*38,z=l.z-l.site.uz*38;return {position:[x,g.surfaceHeight(x,z)+2.1,z],target:[l.x,l.groundY+28,l.z]};});
 await lock(axial);photos.approach=await exposure(p,'butterfly-approach',mobile);await p.evaluate(()=>window.__pauseFrames=false);
 await p.evaluate(()=>{const g=__garden,l=g.landmarks[23];g.teleport(l.entryPoint.x,l.entryPoint.z);g.cameraState.yaw=Math.atan2(-l.site.ux,-l.site.uz)});await p.waitForTimeout(5000);
 const active=await collect(5200);assert(active.min>=.0399&&active.max<=.42001);assert(active.max-active.min>.30);assert(active.mirrorError<1e-9);assert(active.fps>=(mobile?30:55));
 await lock();const peak=await wingPixels(p);photos.peak=await exposure(p,'butterfly-peak',mobile);assert(peak.uniformReveal>.6);assert(peak.saturation>rest.saturation+.12&&peak.colouredRatio>.3,JSON.stringify({rest,peak}));assert(peak.whiteRatio<=(mobile?.04:.02));
 await p.evaluate(()=>window.__pauseFrames=false);
 // Day/night is driven by the existing sky, not by a test-only uniform override.
 await p.evaluate(()=>__garden.setSky(.1));await p.waitForTimeout(1500);const day=await p.evaluate(()=>__garden.butterfly.wings[0].material.userData.revealUniforms.uNight.value);assert(day<.1);await lock(fixed,false);const dayPixels=await wingPixels(p);await p.evaluate(()=>window.__pauseFrames=false);assert(dayPixels.saturation<peak.saturation);
 await p.evaluate(()=>__garden.setSky(.55));await p.waitForTimeout(1500);const night=await p.evaluate(()=>__garden.butterfly.wings[0].material.userData.revealUniforms.uNight.value);assert(night>.9);
 await p.evaluate(()=>(()=>{const l=__garden.landmarks[23];__garden.teleport(l.x-l.site.ux*36,l.z-l.site.uz*36)})());await p.waitForTimeout(7500);await lock();const faded=await wingPixels(p);photos.faded=await exposure(p,'butterfly-faded',mobile);await p.evaluate(()=>window.__pauseFrames=false);
 assert(faded.uniformReveal<.01&&faded.saturation<peak.saturation-.12);
 // Genuine distance LOD, camera remains aimed at this monument for the fixed shot.
 await p.evaluate(()=>__garden.teleport(0,145));await p.waitForTimeout(100);const lod=await p.evaluate(()=>{const b=__garden.butterfly,lod=b.root.parent.parent.getObjectByName('butterfly-silhouette');return {visible:lod.visible,model:b.root.parent.visible};});assert(lod.visible&&!lod.model);
 await lock({position:[fixed.position[0],fixed.position[1]+18,fixed.position[2]],target:fixed.target});photos.distant=await exposure(p,'butterfly-silhouette',mobile);await p.evaluate(()=>window.__pauseFrames=false);
 // Click the actual entry, intercepting its external destination in the existing harness.
 await p.evaluate(()=>{const g=__garden,l=g.landmarks[23];g.teleport(l.entryPoint.x,l.entryPoint.z)});await p.waitForTimeout(1200);assert.equal(await p.getAttribute('#enter-link','href'),'https://uncolored-butterfly.maniforld.com');
 const popupPromise=p.waitForEvent('popup');await p.click('#enter-link');const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');assert.equal(popup.url(),'https://uncolored-butterfly.maniforld.com/');await popup.close();await p.bringToFront();
 await p.evaluate(()=>(()=>{const l=__garden.landmarks[23];__garden.teleport(l.x-l.site.ux*36,l.z-l.site.uz*36)})());await p.waitForTimeout(7500);await lock();const memory=await wingPixels(p),visited=await p.evaluate(()=>({uniform:__garden.butterfly.wings[0].material.userData.revealUniforms.uVisited.value,saved:JSON.parse(localStorage.getItem('garden-visited-v1'))}));await p.evaluate(()=>window.__pauseFrames=false);
 assert(visited.uniform>.99&&visited.saved.includes('https://uncolored-butterfly.maniforld.com'));assert(memory.uniformReveal<.01);assert(memory.saturation>faded.saturation&&memory.saturation<peak.saturation);
 const unchanged=await p.evaluate(before=>before.every(([id,color])=>{const m=__garden.scene.getObjectByProperty('uuid',id)?.material;return m&&m.color.toArray().every((v,i)=>v===color[i])&&!m.userData.revealWing;}),baselineMaterials);assert(unchanged);
 return {structure,idle,active,rest,peak,faded,memory,visited,day,dayPixels,night,lod,unchanged,fixed,photos};
}

async function run(){
 const browser=await chromium.launch({channel:'chrome',headless:true});const report={wave:'2A',butterflySource,generatedAt:new Date().toISOString(),sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),complete:false,thresholds:{whiteDesktop:.02,whiteMobile:.04,maxWhiteComponent:.005,nightMean:[.025,.32],bodyMean:[.025,.48],bodyP95:.65,maxUnbrokenPlane:12,viewKDesktop:.5,viewKPortrait:.62}};
 try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(function tick(t){if(window.__pauseFrames)raf(tick);else fn(t);});const AudioNative=window.Audio;window.__testAudio=[];window.Audio=function(...args){const a=new AudioNative(...args);window.__testAudio.push(a);return a;};window.Audio.prototype=AudioNative.prototype;});
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(url).origin)return route.fulfill({status:200,contentType:'text/html',body:'<title>Destination intercepted by regression test</title>'});return route.continue();});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>{errors.push(e.stack);console.error(e.stack)});p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(url);await p.waitForFunction(()=>window.__garden?.modelLoads.loaded.length===34);
  const initial=await p.evaluate(()=>({y:__garden.camera.position.y,loads:__garden.modelLoads,far:__garden.camera.far,radius:__garden.WORLD.ISLAND_RADIUS}));
  assert.equal(initial.loads.failed.length,0);assert(initial.y<6);assert(initial.far>=2200);assert(initial.radius===150);
  const photos={};await p.evaluate(()=>__garden.setSky(.55));await p.waitForTimeout(100);photos.intro=await exposure(p,'intro',mobile);await p.click('#start');
  await p.waitForTimeout(1200);photos.court=await exposure(p,'court',mobile);
  const butterfly=await butterflyAudit(p,mobile);console.log('Butterfly passed',mobile,JSON.stringify({rest:butterfly.rest,peak:butterfly.peak,faded:butterfly.faded}));
  if(process.env.BUTTERFLY_ONLY){report[mobile?'mobile':'desktop']={butterfly,errors};assert.deepEqual(errors,[]);await context.close();continue;}
  const geometry=await p.evaluate(async()=>{
   const g=__garden,errors=[],records=g.landmarks;let minSpacing=Infinity,maxStep=0,maxBridgeStep=0,absoluteMax=0;
   const pause=()=>new Promise(requestAnimationFrame);
   for(const l of records){
    if(l.bboxHeight<24-1e-6||Math.abs(l.groundY-l.platformY)>.001||l.labelY<l.groundY+l.bboxHeight)errors.push('bounds '+l.index);
    if([7,9,10,23,24].includes(l.index)&&l.bboxHeight<48-1e-6)errors.push('major '+l.index);
    for(const b of records)if(l.index<b.index)minSpacing=Math.min(minSpacing,Math.hypot(l.x-b.x,l.z-b.z));
    g.teleport(l.x,l.z);await pause();if(Math.hypot(g.player.position.x-l.x,g.player.position.z-l.z)>.01)errors.push('platform teleport '+l.index);
    const t=l.site;let previous;
    for(let d=-t.radius-g.WORLD.APPROACH_LENGTH-1;d< -t.radius+1.1;d+=.1){
     const x=t.x+t.ux*d,z=t.z+t.uz*d,y=g.surfaceHeight(x,z);if(!g.walkable(x,z))errors.push('approach '+l.index);
     if(previous!==undefined)maxStep=Math.max(maxStep,Math.abs(y-previous));previous=y;
    }
    g.teleport(l.entryPoint.x,l.entryPoint.z);await pause();if(g.nearest!==l.index)errors.push('nearest '+l.index);
    if(g.cameraHeight<1.4-1e-4||g.cameraHeight>4+1e-4)errors.push('camera AGL '+l.index);absoluteMax=Math.max(absoluteMax,g.camera.position.y);
   }
   for(const b of g.BRIDGES.filter(b=>!b.bonus)){
    let previous;for(let i=-10;i<=1010;i++){const t=i/1000,x=b.x1+(b.x2-b.x1)*t,z=b.z1+(b.z2-b.z1)*t,y=g.surfaceHeight(x,z);
     if(!g.walkable(x,z))errors.push('bridge '+b.id);if(previous!==undefined)maxBridgeStep=Math.max(maxBridgeStep,Math.abs(y-previous));previous=y;
    }
    g.teleport((b.x1+b.x2)/2,(b.z1+b.z2)/2);await pause();
   }
   for(const is of g.MATH_ISLES){g.teleport(is.x,is.z);await pause();if(!g.walkable(is.x,is.z))errors.push('isle '+is.key);}
   const boxes=[];g.scene.traverse(o=>{if(['major','standard','butterfly'].includes(o.userData.tier))boxes.push(o.userData.bounds);});
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x)>.05&&Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)>.05)errors.push('model overlap '+i+'/'+j);}
   return {errors,minSpacing,maxStep,maxBridgeStep,absoluteMax,monuments:records.map(({site,...r})=>r),math:g.mathMonuments,bridgesWalked:[...g.bridgesWalked]};
  });
  assert.deepEqual(geometry.errors,[]);assert(geometry.minSpacing>=24);assert(geometry.maxStep<=.151);assert(geometry.maxBridgeStep<=.32);assert(geometry.math[0].bboxHeight>=48);
  assert.equal(await p.locator('#euler-card').isVisible(),true);await p.click('#euler-action');assert(await p.evaluate(()=>__garden.bridge8Open&&__garden.BRIDGES[7].mesh.visible));
  await p.evaluate(()=>{const b=__garden.BRIDGES[7];__garden.teleport((b.x1+b.x2)/2,(b.z1+b.z2)/2)});await p.waitForTimeout(60);
  assert(await p.evaluate(()=>__garden.bridgesWalked.has(8)));
  await p.evaluate(()=>{document.querySelector('#euler-card').hidden=true;document.querySelector('#bridge-toast').classList.remove('show')});
  await p.evaluate(()=>{const g=__garden,l=g.landmarks[0];g.teleport(l.entryPoint.x,l.entryPoint.z);g.cameraState.yaw=Math.atan2(-l.site.ux,-l.site.uz);});
  await p.waitForTimeout(3200);await p.evaluate(()=>__garden.setSky(.55));photos.foot=await exposure(p,'foot',mobile);
  assert(await p.evaluate(()=>__garden.cameraState.framing>.9));
  const v=await p.locator('#viewpad').boundingBox();await p.mouse.move(v.x+v.width/2,v.y+v.height/2);await p.mouse.down();await p.mouse.move(v.x+v.width/2+28,v.y+v.height/2+20);await p.waitForTimeout(40);assert.equal(await p.evaluate(()=>__garden.cameraState.framing),0);await p.mouse.up();
  await p.waitForTimeout(1800);assert.equal(await p.evaluate(()=>__garden.cameraState.framing),0);
  await p.locator('#viewpad').focus();for(let i=0;i<20;i++)await p.keyboard.press('ArrowUp');assert(await p.evaluate(()=>__garden.cameraState.pitch<=.62));for(let i=0;i<30;i++)await p.keyboard.press('ArrowDown');assert(await p.evaluate(()=>__garden.cameraState.pitch>=-.5));
  const card=await p.locator('#enter-link').getAttribute('href');assert.equal(card,'https://moxi.maniforld.com');
  const popupPromise=p.waitForEvent('popup');await p.click('#enter-link');const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');assert.equal(popup.url(),'https://moxi.maniforld.com/');await popup.close();await p.bringToFront();assert(await p.evaluate(()=>JSON.parse(localStorage.getItem('garden-visited-v1')).includes('https://moxi.maniforld.com')));
  await p.click('#list-button');assert.equal(await p.locator('#directory-grid a[target="_blank"]').count(),26);assert.equal(await p.locator('#music-credits small:not(.mc-note)').count(),11);await p.keyboard.press('Escape');assert(await p.locator('#directory').isHidden());
  const sky=[];for(const t of [.1,.3,.55,.86]){await p.evaluate(t=>__garden.setSky(t),t);await p.waitForFunction(t=>Math.abs(__garden.skyInfo().t-t)<.01,t);await p.waitForFunction(()=>!document.hidden);await p.waitForTimeout(100);sky.push(await p.evaluate(()=>({name:__garden.skyInfo().name,fog:__garden.scene.fog.density})));}assert.deepEqual(sky.map(s=>s.name),['白天','黄昏','夜','清晨']);assert(sky.every(s=>s.fog>=.0016&&s.fog<=.0028));
  if(!mobile){const before=await p.evaluate(()=>window.__testAudio[0].src);await p.evaluate(()=>window.__testAudio[0].dispatchEvent(new Event('ended')));await p.waitForTimeout(700);assert.notEqual(await p.evaluate(()=>window.__testAudio[0].src),before);await p.click('#bgm-button');assert.equal(await p.getAttribute('#bgm-button','aria-pressed'),'false');await p.click('#bgm-button');}
  await p.evaluate(()=>{__garden.teleport(0,3);__garden.setSky(.55);});await p.keyboard.press('Tab');await p.locator('#world').focus();
  await p.keyboard.down('KeyW');await p.waitForTimeout(700);await p.keyboard.up('KeyW');assert(await p.evaluate(()=>__garden.player.position.z<1));
  if(mobile){const j=await p.locator('#joystick').boundingBox();const before=await p.evaluate(()=>__garden.player.position.z);await p.mouse.move(j.x+j.width/2,j.y+j.height/2);await p.mouse.down();await p.mouse.move(j.x+j.width/2,j.y+12);await p.waitForTimeout(600);await p.mouse.up();assert(await p.evaluate(before=>__garden.player.position.z<before-.5,before));}
  await p.keyboard.down('KeyD');
  const performanceResult=await p.evaluate(async()=>{const samples=[];let last=performance.now(),start=last;await new Promise(resolve=>{function frame(t){samples.push(t-last);last=t;if(t-start<6000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame)});samples.sort((a,b)=>a-b);return {fps:1000/(samples.reduce((a,b)=>a+b,0)/samples.length),p95:samples[Math.floor(samples.length*.95)],quality:__garden.quality,overflow:document.documentElement.scrollWidth>innerWidth};});
  await p.keyboard.up('KeyD');
  assert(performanceResult.fps>=(mobile?30:55));assert.equal(performanceResult.quality.qualityReduced,false);assert.equal(performanceResult.overflow,false);assert.deepEqual(errors,[]);
  const cameraChecks=await cameraAudit(p,mobile);console.log('Camera audit',mobile,cameraChecks.errors);assert.deepEqual(cameraChecks.errors,[]);
  const dressing=await dressingAudit(p);console.log('Dressing audit',mobile,dressing.errors);assert.deepEqual(dressing.errors,[]);assert.equal(dressing.rows.length,28);
  await p.evaluate(()=>{document.querySelector('#euler-card').hidden=true;document.querySelector('#bridge-toast').classList.remove('show')});
  for(const [name,i,d] of [['approach',0,30],['vault',9,29],['mindcare',24,32]]){
   await p.evaluate(({i,d})=>{const g=__garden,l=g.landmarks[i];g.teleport(l.x-l.site.ux*d,l.z-l.site.uz*d);g.cameraState.yaw=Math.atan2(-l.site.ux,-l.site.uz);g.setSky(.55);},{i,d});await p.waitForTimeout(3200);photos[name]=await exposure(p,name,mobile);
  }
  await p.evaluate(()=>{__garden.teleport(135,-22);__garden.cameraState.yaw=-Math.PI/2;__garden.setSky(.55)});await p.waitForTimeout(3200);photos.distant=await exposure(p,'distant',mobile);
  assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>__garden.quality.qualityReduced),false);
  report[mobile?'mobile':'desktop']={initial,geometry,sky,performance:performanceResult,errors,photos,cameraChecks,dressing,butterfly};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  await p.reload();await p.waitForFunction(()=>window.__garden?.modelLoads.loaded.length===34);assert.equal(await p.locator('#visited').textContent(),'02 / 26');
  if(!mobile){await p.evaluate(()=>__garden.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());await p.waitForTimeout(150);assert(await p.locator('#error').isVisible());await p.click('#fallback-list');assert.equal(await p.locator('#directory-grid a').count(),26);}
  await context.close();console.log((mobile?'Mobile':'Desktop')+' passed');
 }
 if(process.env.BUTTERFLY_ONLY){report.complete=true;return;}
 // Intentionally fail model requests on an isolated page: these network errors are expected.
 const fallback=await browser.newPage();await fallback.route('**/*.glb',r=>r.abort());await fallback.goto(url);await fallback.waitForFunction(()=>window.__garden?.modelLoads.failed.length===34);
 assert(await fallback.evaluate(()=>__garden.landmarks.every(l=>l.bboxHeight>=24&&Math.abs(l.groundY-l.platformY)<.001)&&__garden.mathMonuments[0].bboxHeight>=48));const fallbackDressing=await dressingAudit(fallback,true);assert.deepEqual(fallbackDressing.errors,[]);assert.equal(fallbackDressing.rows.length,29);await fallback.screenshot({path:path.join(out,'fallback.png')});await fallback.close();report.fallback={passed:true,dressing:fallbackDressing};
 report.complete=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({desktop:report.desktop.performance,mobile:report.mobile.performance,fallback:true,artifacts:out},null,2));
 }catch(error){report.failure=String(error);throw error;}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1});
