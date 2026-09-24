/* Run against a local static server. Test tooling is external to the shipped single file.
   PLAYWRIGHT_PATH=/path/to/playwright node docs/wave1-check.cjs http://127.0.0.1:8874
   WAVE1_ARTIFACTS=/tmp/wave1.5-qa controls screenshots and JSON report. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv[2]||'http://127.0.0.1:8874';
const out=process.env.WAVE1_ARTIFACTS||'/tmp/wave1.5-qa';fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.equal(html,fs.readFileSync(path.join(__dirname,'../island.html'),'utf8'));
for(const [pattern,hash] of [[/const LINKS = (\[[\s\S]*?\n\]);/,'ace50acab071aea8f309c15e55bc67c2afc8e17f36b5a4544a980c942c1f1d42'],[/const TRACKS=(\[[\s\S]*?\n\]);/,'da871476abe678cee5e02d374c710a1ec98d904195550ca94ab30d34ee8a558b']])assert.equal(crypto.createHash('sha256').update(html.match(pattern)[1]).digest('hex'),hash);
assert(!/<script[^>]+src=["']https?:/.test(html));
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

async function run(){
 const browser=await chromium.launch({channel:'chrome',headless:true});const report={wave:'1.5',generatedAt:new Date().toISOString(),sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),complete:false,thresholds:{whiteDesktop:.02,whiteMobile:.04,maxWhiteComponent:.005,nightMean:[.025,.32],bodyMean:[.025,.48],bodyP95:.65,maxUnbrokenPlane:12,viewKDesktop:.5,viewKPortrait:.62}};
 try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>{const AudioNative=window.Audio;window.__testAudio=[];window.Audio=function(...args){const a=new AudioNative(...args);window.__testAudio.push(a);return a;};window.Audio.prototype=AudioNative.prototype;});
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(url).origin)return route.fulfill({status:200,contentType:'text/html',body:'<title>Destination intercepted by regression test</title>'});return route.continue();});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>{errors.push(e.stack);console.error(e.stack)});p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(url);await p.waitForFunction(()=>window.__garden?.modelLoads.loaded.length===34);
  const initial=await p.evaluate(()=>({y:__garden.camera.position.y,loads:__garden.modelLoads,far:__garden.camera.far,radius:__garden.WORLD.ISLAND_RADIUS}));
  assert.equal(initial.loads.failed.length,0);assert(initial.y<6);assert(initial.far>=2200);assert(initial.radius===150);
  const photos={};await p.evaluate(()=>__garden.setSky(.55));await p.waitForTimeout(100);photos.intro=await exposure(p,'intro',mobile);await p.click('#start');
  await p.waitForTimeout(1200);photos.court=await exposure(p,'court',mobile);
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
   const boxes=[];g.scene.traverse(o=>{if(['major','standard'].includes(o.userData.tier))boxes.push(new THREE.Box3().setFromObject(o));});
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
  const dressing=await dressingAudit(p);console.log('Dressing audit',mobile,dressing.errors);assert.deepEqual(dressing.errors,[]);assert.equal(dressing.rows.length,29);
  await p.evaluate(()=>{document.querySelector('#euler-card').hidden=true;document.querySelector('#bridge-toast').classList.remove('show')});
  for(const [name,i,d] of [['approach',0,30],['vault',9,29],['mindcare',24,32]]){
   await p.evaluate(({i,d})=>{const g=__garden,l=g.landmarks[i];g.teleport(l.x-l.site.ux*d,l.z-l.site.uz*d);g.cameraState.yaw=Math.atan2(-l.site.ux,-l.site.uz);g.setSky(.55);},{i,d});await p.waitForTimeout(3200);photos[name]=await exposure(p,name,mobile);
  }
  await p.evaluate(()=>{__garden.teleport(135,-22);__garden.cameraState.yaw=-Math.PI/2;__garden.setSky(.55)});await p.waitForTimeout(3200);photos.distant=await exposure(p,'distant',mobile);
  assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>__garden.quality.qualityReduced),false);
  report[mobile?'mobile':'desktop']={initial,geometry,sky,performance:performanceResult,errors,photos,cameraChecks,dressing};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  await p.reload();await p.waitForFunction(()=>window.__garden?.modelLoads.loaded.length===34);assert.equal(await p.locator('#visited').textContent(),'01 / 26');
  if(!mobile){await p.evaluate(()=>__garden.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());await p.waitForTimeout(150);assert(await p.locator('#error').isVisible());await p.click('#fallback-list');assert.equal(await p.locator('#directory-grid a').count(),26);}
  await context.close();console.log((mobile?'Mobile':'Desktop')+' passed');
 }
 // Intentionally fail model requests on an isolated page: these network errors are expected.
 const fallback=await browser.newPage();await fallback.route('**/*.glb',r=>r.abort());await fallback.goto(url);await fallback.waitForFunction(()=>window.__garden?.modelLoads.failed.length===34);
 assert(await fallback.evaluate(()=>__garden.landmarks.every(l=>l.bboxHeight>=24&&Math.abs(l.groundY-l.platformY)<.001)&&__garden.mathMonuments[0].bboxHeight>=48));const fallbackDressing=await dressingAudit(fallback,true);assert.deepEqual(fallbackDressing.errors,[]);assert.equal(fallbackDressing.rows.length,29);await fallback.screenshot({path:path.join(out,'fallback.png')});await fallback.close();report.fallback={passed:true,dressing:fallbackDressing};
 report.complete=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({desktop:report.desktop.performance,mobile:report.mobile.performance,fallback:true,artifacts:out},null,2));
 }catch(error){report.failure=String(error);throw error;}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1});
