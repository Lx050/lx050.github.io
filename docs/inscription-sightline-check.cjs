/* GPU-free: production sightline/fade code + real THREE meshes + shipped Visitor.glb.
 * This proves geometry/state behavior, not rendered legibility or mobile touch UX. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),THREE=require(path.join(root,'vendor/three.min.js'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=html.slice(html.indexOf('const avatarMeshes='),html.indexOf('// ===== GLB 精建模型'));
assert(code.includes('function avatarBlocksInscription()'));
let count=0;const checks=[],check=(name,fn)=>{fn();checks.push(name);count++;};
const ctx={console,THREE,TextDecoder,TextEncoder,URL,Blob,performance,document:{createElement(){
 const canvas={width:0,height:0},c=new Proxy({measureText:s=>({width:[...s].length*18}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(()=>{})});canvas.getContext=()=>c;return canvas;
}}};ctx.window=ctx;ctx.self=ctx;vm.createContext(ctx);
for(const file of ['vendor/three/GLTFLoader.js','assets/architecture.js','assets/content-core.js','assets/nuanling-detail.js','assets/nuanling-app-detail.js','assets/editor-detail.js','assets/ink-detail.js','assets/restoration-detail.js','assets/huayun-detail.js','assets/content-creation-care.js','assets/shield-detail.js','assets/gateway-detail.js','assets/reme-detail.js','assets/content-services.js','assets/twinstars-detail.js','assets/causal-detail.js','assets/versions-detail.js','assets/city-detail.js','assets/portraits-detail.js','assets/content-narratives.js','assets/rubbing-detail.js','assets/proof-detail.js','assets/workshop-detail.js','assets/content-literary.js','assets/moon-snow-garden.js','assets/reading-catalog.js','assets/reading-panels.js','assets/courtyard-runtime.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(ctx);
const bytes=fs.readFileSync(path.join(root,'assets/models/Visitor.glb'));
new Promise((resolve,reject)=>new THREE.GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject)).then(gltf=>{
 const scene=new THREE.Scene(),player=new THREE.Group(),body=new THREE.Group(),camera=new THREE.PerspectiveCamera(40,1280/900,.1,2400);scene.add(player);player.add(body);body.add(gltf.scene);
 // Replaced procedural placeholders must stay absent from rays, while their shared scenery material stays untouched.
 const shared=new THREE.MeshStandardMaterial({color:0xdcdacb}),placeholder=new THREE.Mesh(new THREE.BoxGeometry(4,4,4),shared);placeholder.visible=false;body.add(placeholder);
 Object.assign(ctx,{scene,player,body,camera,reduced:false});new vm.Script(code+'\nglobalThis.test={blocked:avatarBlocksInscription,fade:updateAvatarFade,prepare:prepareAvatarFade,panels:avatarReadingPanels,state:()=>({fade:avatarFade,near:avatarHidden,hold:avatarReadingHold}),materials:avatarMaterials};').runInContext(ctx);
 const api=ctx.test;
 function settle(blocked,distance=6.5,n=30){for(let i=0;i<n;i++)api.fade(1/60,distance,blocked);return api.state();}
 function pose(center=new THREE.Vector3(0,1.52,-1.35),normal=new THREE.Vector3(0,0,1),distance=6.5,pitch=.2){
  const pos=center.clone().addScaledVector(normal,1.35);player.position.set(pos.x,0,pos.z);player.rotation.y=0;
  const target=player.position.clone().add(new THREE.Vector3(0,1.55,0));camera.position.copy(target).addScaledVector(normal,distance*Math.cos(pitch));camera.position.y+=distance*Math.sin(pitch);camera.lookAt(target);camera.updateProjectionMatrix();scene.updateMatrixWorld(true);
 }
 function panel(width=1.085,height=1.365,position=[0,1.52,-1.35],rotation=0){const face=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:new THREE.Texture()}));face.position.fromArray(position);face.rotation.x=rotation;scene.add(face);face.geometry.computeBoundingBox();api.panels.length=0;api.panels.push({face,obstacles:[]});scene.updateMatrixWorld(true);return face;}
 let face=panel();pose();
 check('Normal 6.5 m orbit actually intersects shipped avatar and nearby wall text',()=>assert(api.blocked()));
 check('Old distance-only fade leaves the occluding avatar fully opaque',()=>assert.equal(settle(false).fade,1));
 const cameraBefore=JSON.stringify({position:camera.position.toArray(),rotation:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray()}),faceBefore=face.matrixWorld.toArray();
 check('Sightline fade fully clears avatar at normal orbit',()=>assert.equal(settle(api.blocked()).fade,0));
 check('Detection persists while all avatar materials are hidden; no oscillation',()=>{assert(api.materials.every(e=>!e.material.visible));for(let i=0;i<120;i++)api.fade(1/60,6.5,api.blocked());assert.equal(api.state().fade,0);});
 check('No camera, panel, shared scenery material, or placeholder mutation',()=>{assert.equal(cameraBefore,JSON.stringify({position:camera.position.toArray(),rotation:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray()}));assert.deepEqual(face.matrixWorld.toArray(),faceBefore);assert.equal(shared.opacity,1);assert.equal(shared.transparent,false);assert.equal(placeholder.visible,false);});
 check('Orbit sideways restores visitor after bounded hold',()=>{camera.position.set(player.position.x+6.5,2.8,player.position.z);camera.lookAt(player.position.clone().add(new THREE.Vector3(0,1.55,0)));camera.updateMatrixWorld(true);assert(!api.blocked());api.fade(.05,6.5,false);assert.equal(api.state().fade,0);assert.equal(settle(false).fade,1);});
 pose();
 check('Ordinary close-camera hysteresis remains effective independently',()=>{assert.equal(settle(false,2).fade,0);assert.equal(settle(false,2.6).fade,0);assert.equal(settle(false,3).fade,1);});
 check('Reduced motion snaps on and off without delayed opacity tween',()=>{ctx.reduced=true;api.fade(0,6.5,true);assert.equal(api.state().fade,0);api.fade(0,6.5,false);assert.equal(api.state().fade,1);ctx.reduced=false;});
 check('Text behind a real intervening wall does not fade visitor',()=>{const wall=new THREE.Mesh(new THREE.BoxGeometry(5,4,.2),new THREE.MeshStandardMaterial());wall.position.set(0,1.8,-.6);scene.add(wall);scene.updateMatrixWorld(true);api.panels[0].obstacles.push(wall);assert(!api.blocked());wall.visible=false;assert(api.blocked());scene.remove(wall);api.panels[0].obstacles.length=0;});
 check('Blank, hidden, reverse-side, far, offscreen panels do not fade visitor',()=>{face.material.map=null;assert(!api.blocked());face.material.map=new THREE.Texture();face.visible=false;assert(!api.blocked());face.visible=true;face.rotation.y=Math.PI;assert(!api.blocked());face.rotation.y=0;face.position.z=-5;assert(!api.blocked());face.position.z=-1.35;camera.lookAt(new THREE.Vector3(30,3,0));camera.updateMatrixWorld(true);assert(!api.blocked());pose();assert(api.blocked());});
 check('Portrait projection has the same physical occlusion behavior',()=>{camera.aspect=390/844;camera.updateProjectionMatrix();assert(api.blocked());camera.aspect=1280/900;camera.updateProjectionMatrix();});
 check('Procedural fallback remains supported when GLB is unavailable',()=>{gltf.scene.visible=false;const fallback=new THREE.Mesh(new THREE.BoxGeometry(.6,1.7,.5),shared);fallback.position.y=.85;body.add(fallback);api.prepare();assert(api.blocked());fallback.visible=false;gltf.scene.visible=true;});
 scene.remove(face);
 const rows=[];
 for(let index=0;index<26;index++){
  if(index===23)continue;
  const b=ctx.CourtyardArchitecture.build({THREE,index,title:'Geometry QA',zone:0});b.root.position.set(index*80,0,index*13);b.root.rotation.y=index*.23;scene.add(b.root);
  const c=ctx.CourtyardReadingPanels.attach({THREE,building:b,index,preview:ctx.CourtyardReadingCatalog[index]});ctx.CourtyardRuntime.register(THREE,b,b.root,index,'Geometry QA');
  if(!c)continue;
  const originalBoxes=b.collisionBoxes.slice(),transforms=c.panels.map(p=>p.face.matrix.toArray());
  for(let ordinal=0;ordinal<c.panels.length;ordinal++){
   const p=c.panels[ordinal];p.face.updateWorldMatrix(true,false);const center=p.face.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).transformDirection(p.face.matrixWorld);normal.y=0;normal.normalize();pose(center,normal);ctx.CourtyardReadingPanels.update([b],player.position);
   api.panels.length=0;for(const q of c.panels){if(!q.face.geometry.boundingBox)q.face.geometry.computeBoundingBox();api.panels.push({face:q.face,obstacles:b.cameraMeshes});}
   let blocked=api.blocked();settle(blocked);rows.push({index,ordinal,kind:p.placement.kind,blocked,fade:api.state().fade});
   assert.equal(api.state().fade,blocked?0:1);
  }
  check('Fixed text and identical collider identities for building '+index,()=>{assert.deepEqual(b.collisionBoxes,originalBoxes);assert.deepEqual(c.panels.map(p=>p.face.matrix.toArray()),transforms);});
  scene.remove(b.root);
 }
 check('Real rotated/translated wall and sloped book-rest surfaces are supported',()=>{assert(rows.some(r=>r.kind==='wall'&&r.blocked));assert(rows.some(r=>r.kind==='book-rest'&&r.blocked));});
 // A bounded stress check is timing evidence for geometry only, not rendered FPS.
 api.panels.length=0;face=panel();pose();const started=performance.now();for(let n=0;n<500;n++)api.blocked();const milliseconds=performance.now()-started;
 // Exercise the unchanged orbit math with the production fade call, not just the helper.
 Object.assign(ctx,{started:true,butterflySea:null,sprinting:false,modalOpen:()=>false,
  WORLD:{CAMERA_FOV:40,CAMERA_CLEARANCE:.6,CAMERA_MAX_PITCH:1.2},
  cameraState:{yaw:.13,pitch:.2,renderYaw:.13,renderPitch:.2,distance:6.5,effectiveDistance:6.5,initialized:false},
  camTarget:new THREE.Vector3(),camPosition:new THREE.Vector3(),cameraLook:new THREE.Vector3(),
  clearCamera:()=>6.5,cameraGroundDistance:()=>6.5});
 const orbitCode=html.slice(html.indexOf('function stepOrbit('),html.indexOf('const labelWorld='));
 new vm.Script(orbitCode).runInContext(ctx);
 check('Production orbit keeps requested yaw/pitch/distance and fades after final pose',()=>{
  settle(false);ctx.stepOrbit(1/60);assert(api.blocked());for(let n=0;n<30;n++)ctx.stepOrbit(1/60);
  assert.equal(ctx.cameraState.yaw,.13);assert.equal(ctx.cameraState.pitch,.2);assert.equal(ctx.cameraState.distance,6.5);assert.equal(ctx.cameraState.effectiveDistance,6.5);assert.equal(api.state().fade,0);
 });
 check('Independent inner-world orbit never consults hub inscription sightlines',()=>{
  for(let n=0;n<40;n++)ctx.stepOrbit(1/60,{minPitch:-.2});assert.equal(api.state().fade,1);
 });
 const entryFiles=['island.html'];check('The two 3D entry aliases are identical',()=>entryFiles.forEach(f=>assert.equal(fs.readFileSync(path.join(root,f),'utf8'),html)));
 const digest=s=>require('crypto').createHash('sha256').update(s).digest('hex');
 check('Approved disclosure header snapshot; all other mobile input handlers remain byte-identical',()=>{
  const narrowJumpRule='/* Narrow touch layout: keep the full jump target above the joystick and clear of the world return button. */\n@media(max-width:384px){#jump{bottom:calc(var(--joy-bottom) + var(--joy-size) + 24px)}}\n';
  assert(html.includes(narrowJumpRule));
  const uiStyle=html.match(/<style id="mobile-nearby-layout">[\s\S]*?<\/style>\n/)[0];
  const group=html.match(/  <div id="nearby-controls">\n([\s\S]*?)\n  <\/div>/)[0];
  const craft=group.match(/^  <section id="craft-controls".*<\/section>$/m)[0];
  const interaction=group.match(/^  <section id="interaction"[\s\S]*?^  <\/section>/m)[0];
  let originalHeader=html.slice(0,html.indexOf('const avatarMeshes=')).replace(narrowJumpRule,'').replace(uiStyle,'').replace(group,craft);
  originalHeader=originalHeader.replace('  <section id="world-hud"',interaction+'\n  <section id="world-hud"');
  // Approved progressive-disclosure header snapshot; normalize only asset version tokens.
  // Input snapshot below permits only the explicit card/summary joystick exclusion.
  assert(html.includes('#viewpad,#interaction,#craft-controls,.mapbox,#sprint,button,a,input,summary,#directory,#atlas,#intro'));
  // The new geometry-only asset is permitted; keep the existing UI snapshot unchanged.
  originalHeader=originalHeader.replace(/<script src="assets\/workshop-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/reme-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/proof-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/gateway-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/huayun-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/nuanling-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  // Explicit flight control/module allowance; every other header/input remains pinned.
  originalHeader=originalHeader.replace(/<script src="assets\/butterfly-flight\.js\?v=[^"]+"><\/script>\n/,'').replace('<p id="mechanical-status">自动飞行</p><button id="roof-flight" aria-pressed="true">自动飞行 · 暂停</button>','<p id="mechanical-status">展开 · 已锁止</p>');
  originalHeader=originalHeader.replace(/<script src="assets\/nuanling-app-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/editor-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/rubbing-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/twinstars-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/causal-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/versions-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/shield-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/portraits-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/city-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/ink-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/restoration-detail\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  originalHeader=originalHeader.replace(/<script src="assets\/detail-lod\.js\?v=[a-f0-9]{16}"><\/script>\n/,'');
  assert.equal(digest(originalHeader.replace(/\?v=[a-f0-9]{16}/g,'?v=ASSET_VERSION')),'1f77d2451257bdb0fe8e9ea24402090f577510b8b8b90eab2b79c41706d9fa1f');
  assert.equal(digest(html.slice(html.indexOf('let joyPointer='),html.indexOf("window.addEventListener('resize',resize);resize();")).replace('#viewpad,#interaction,#craft-controls,.mapbox,#sprint,button,a,input,summary,#directory,#atlas,#intro','#viewpad,#interaction,.mapbox,#sprint,button,a,input,#directory,#atlas,#intro')),'7cc1e549a4b03cd62290ec78e84bc5d1c633fcf4d5e9f063e9474f2018f96f0b');
 });
 const report={passed:true,checks:count,checkNames:checks,actualBuildingSamples:rows.length,occlusionDetected:rows.filter(r=>r.blocked).length,rows,geometry500CallsMs:milliseconds,visualEvidence:'NOT RUN: GPU-free geometry/state check only. No browser, WebGL pixels, screenshots or user-device touch tests executed.'};
 fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});fs.writeFileSync(path.join(root,'qa-results/inscription-sightline-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:count,actualBuildingSamples:rows.length,occlusionDetected:report.occlusionDetected,geometry500CallsMs:milliseconds},null,2));
}).catch(e=>{console.error(e);process.exitCode=1;});

// garden.html is the separately authored 2D garden, never a 3D alias.
assert.equal(require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'garden.html'))).digest('hex'),'938aa89e3c9cff3f83d3e13eb029f319de862e76bcb32194e716496f0f524cd4','Preserve independent baseline garden');
