/* Run against a local static server. Test tooling is external to the shipped single file.
   PLAYWRIGHT_PATH=/path/to/playwright node docs/wave1-check.cjs http://127.0.0.1:8874
   WAVE1_ARTIFACTS=/tmp/wave1-qa controls screenshots and JSON report. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv[2]||'http://127.0.0.1:8874';
const out=process.env.WAVE1_ARTIFACTS||'/tmp/wave1-qa';fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.equal(html,fs.readFileSync(path.join(__dirname,'../island.html'),'utf8'));
for(const [pattern,hash] of [[/const LINKS = (\[[\s\S]*?\n\]);/,'ace50acab071aea8f309c15e55bc67c2afc8e17f36b5a4544a980c942c1f1d42'],[/const TRACKS=(\[[\s\S]*?\n\]);/,'da871476abe678cee5e02d374c710a1ec98d904195550ca94ab30d34ee8a558b']])assert.equal(crypto.createHash('sha256').update(html.match(pattern)[1]).digest('hex'),hash);
assert(!/<script[^>]+src=["']https?:/.test(html));
async function run(){
 const browser=await chromium.launch({channel:'chrome',headless:true});const report={};
 try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>{const AudioNative=window.Audio;window.__testAudio=[];window.Audio=function(...args){const a=new AudioNative(...args);window.__testAudio.push(a);return a;};window.Audio.prototype=AudioNative.prototype;});
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(url).origin)return route.fulfill({status:200,contentType:'text/html',body:'<title>Destination intercepted by regression test</title>'});return route.continue();});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(url);await p.waitForFunction(()=>window.__garden?.modelLoads.loaded.length===34);
  const initial=await p.evaluate(()=>({y:__garden.camera.position.y,loads:__garden.modelLoads,far:__garden.camera.far,radius:__garden.WORLD.ISLAND_RADIUS}));
  assert.equal(initial.loads.failed.length,0);assert(initial.y<6);assert(initial.far>=2200);assert(initial.radius===150);
  await p.screenshot({path:path.join(out,(mobile?'mobile':'desktop')+'-intro.png')});await p.click('#start');
  await p.waitForTimeout(1200);await p.screenshot({path:path.join(out,(mobile?'mobile':'desktop')+'-court.png')});
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
  await p.evaluate(()=>{const g=__garden,l=g.landmarks[0];g.teleport(l.entryPoint.x,l.entryPoint.z);g.cameraState.yaw=Math.atan2(-l.site.ux,-l.site.uz);});
  await p.waitForTimeout(1500);await p.screenshot({path:path.join(out,(mobile?'mobile':'desktop')+'-foot.png')});
  assert(await p.evaluate(()=>__garden.cameraState.framing>.9));
  const v=await p.locator('#viewpad').boundingBox();await p.mouse.move(v.x+v.width/2,v.y+v.height/2);await p.mouse.down();await p.mouse.move(v.x+v.width/2+28,v.y+v.height/2+20);await p.waitForTimeout(40);assert.equal(await p.evaluate(()=>__garden.cameraState.framing),0);await p.mouse.up();
  await p.locator('#viewpad').focus();for(let i=0;i<20;i++)await p.keyboard.press('ArrowUp');assert(await p.evaluate(()=>__garden.cameraState.pitch<=.62));for(let i=0;i<30;i++)await p.keyboard.press('ArrowDown');assert(await p.evaluate(()=>__garden.cameraState.pitch>=-.5));
  const card=await p.locator('#enter-link').getAttribute('href');assert.equal(card,'https://moxi.maniforld.com');
  const popupPromise=p.waitForEvent('popup');await p.click('#enter-link');const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');assert.equal(popup.url(),'https://moxi.maniforld.com/');await popup.close();assert(await p.evaluate(()=>JSON.parse(localStorage.getItem('garden-visited-v1')).includes('https://moxi.maniforld.com')));
  await p.click('#list-button');assert.equal(await p.locator('#directory-grid a[target="_blank"]').count(),26);assert.equal(await p.locator('#music-credits small:not(.mc-note)').count(),11);await p.keyboard.press('Escape');assert(await p.locator('#directory').isHidden());
  const sky=[];for(const t of [.1,.3,.55,.86]){await p.evaluate(t=>__garden.setSky(t),t);await p.waitForTimeout(60);sky.push(await p.evaluate(()=>({name:__garden.skyInfo().name,fog:__garden.scene.fog.density})));}assert.deepEqual(sky.map(s=>s.name),['白天','黄昏','夜','清晨']);assert(sky.every(s=>s.fog>=.0016&&s.fog<=.0028));
  if(!mobile){const before=await p.evaluate(()=>window.__testAudio[0].src);await p.evaluate(()=>window.__testAudio[0].dispatchEvent(new Event('ended')));await p.waitForTimeout(700);assert.notEqual(await p.evaluate(()=>window.__testAudio[0].src),before);await p.click('#bgm-button');assert.equal(await p.getAttribute('#bgm-button','aria-pressed'),'false');await p.click('#bgm-button');}
  await p.evaluate(()=>{__garden.teleport(0,3);__garden.setSky(.55);});await p.keyboard.press('Tab');await p.locator('#world').focus();
  await p.keyboard.down('KeyW');await p.waitForTimeout(700);await p.keyboard.up('KeyW');assert(await p.evaluate(()=>__garden.player.position.z<1));
  if(mobile){const j=await p.locator('#joystick').boundingBox();const before=await p.evaluate(()=>__garden.player.position.z);await p.mouse.move(j.x+j.width/2,j.y+j.height/2);await p.mouse.down();await p.mouse.move(j.x+j.width/2,j.y+12);await p.waitForTimeout(600);await p.mouse.up();assert(await p.evaluate(before=>__garden.player.position.z<before-.5,before));}
  await p.keyboard.down('KeyD');
  const performanceResult=await p.evaluate(async()=>{const samples=[];let last=performance.now(),start=last;await new Promise(resolve=>{function frame(t){samples.push(t-last);last=t;if(t-start<6000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame)});samples.sort((a,b)=>a-b);return {fps:1000/(samples.reduce((a,b)=>a+b,0)/samples.length),p95:samples[Math.floor(samples.length*.95)],quality:__garden.quality,overflow:document.documentElement.scrollWidth>innerWidth};});
  await p.keyboard.up('KeyD');
  assert(performanceResult.fps>=(mobile?30:55));assert.equal(performanceResult.quality.qualityReduced,false);assert.equal(performanceResult.overflow,false);assert.deepEqual(errors,[]);
  report[mobile?'mobile':'desktop']={initial,geometry,sky,performance:performanceResult,errors};
  await p.reload();await p.waitForFunction(()=>window.__garden?.modelLoads.loaded.length===34);assert.equal(await p.locator('#visited').textContent(),'01 / 26');
  if(!mobile){await p.evaluate(()=>__garden.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());await p.waitForTimeout(150);assert(await p.locator('#error').isVisible());await p.click('#fallback-list');assert.equal(await p.locator('#directory-grid a').count(),26);}
  await context.close();console.log((mobile?'Mobile':'Desktop')+' passed');
 }
 // Intentionally fail model requests on an isolated page: these network errors are expected.
 const fallback=await browser.newPage();await fallback.route('**/*.glb',r=>r.abort());await fallback.goto(url);await fallback.waitForFunction(()=>window.__garden?.modelLoads.failed.length===34);
 assert(await fallback.evaluate(()=>__garden.landmarks.every(l=>l.bboxHeight>=24&&Math.abs(l.groundY-l.platformY)<.001)&&__garden.mathMonuments[0].bboxHeight>=48));await fallback.screenshot({path:path.join(out,'fallback.png')});await fallback.close();report.fallback=true;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({desktop:report.desktop.performance,mobile:report.mobile.performance,fallback:true,artifacts:out},null,2));
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1});
