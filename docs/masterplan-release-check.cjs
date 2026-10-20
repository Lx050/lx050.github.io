/* Current masterplan CPU acceptance. No source normalization, frozen test edits,
 * browser emulation, or rendered-pixel claims. The previous release is tested in
 * an immutable 01c264f3 fixture and is explicitly historical-only evidence.
 * Run: node docs/masterplan-release-check.cjs [--current-only | --source-only]
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),baseline='01c264f3b7de9d8ad8471ed700d05b940d8eb96f';
const out=path.join(root,'qa-results/masterplan-regression');fs.mkdirSync(out,{recursive:true});
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const git=args=>cp.execFileSync('git',['-C',root,...args],{maxBuffer:128*1024*1024});
const old=file=>git(['show',baseline+':'+file]);
const current=file=>fs.readFileSync(path.join(root,file));
const tracked=git(['ls-tree','-r','--name-only',baseline]).toString().trim().split('\n');
const previousHtml=old('index.html').toString();
function span(html,start,end){const a=html.indexOf(start),b=html.indexOf(end,a+start.length);assert(a>=0&&b>a,'unique source boundaries: '+start);assert.equal(html.indexOf(start,a+start.length),-1,'unique beginning: '+start);return html.slice(a,b);}
function snapshot(html){
 const context={THREE:require(path.join(root,'vendor/three.min.js'))};vm.createContext(context);
 const code=span(html,'const WORLD=Object.freeze(', 'const $ = id => document.getElementById(id);');
 vm.runInContext(code+'\nthis.snapshot=JSON.parse(JSON.stringify({WORLD,LINKS,ZONES,terraceSites}));this.sites=terraceSites;',context,{timeout:2000});
 const sea=span(html,'function prepareButterflySea(lm){','  const stone=material(0x8e958d');
 vm.runInContext('let butterflySea=null;'+sea+'return {sea,site:lm.site,entry:lm.entry,position:lm.group.position.toArray(),rotation:root.rotation.toArray()};}\nthis.sea=prepareButterflySea({site:sites[23],entry:{...snapshot.LINKS[23]},group:new THREE.Group()});',context,{timeout:2000});
 const islands=span(html,'const MATH_ISLES=[','const MAINLAND=');
 vm.runInContext(islands+'this.islands=MATH_ISLES;',context,{timeout:2000});
 return JSON.parse(JSON.stringify({layout:context.snapshot,sea:context.sea,islands:context.islands}));
}
const priorSnapshot=snapshot(previousHtml);
const stableBlocks=[
 ['metre-scale constants, destinations, deterministic sites and terrain','const WORLD=Object.freeze(','const $ = id => document.getElementById(id);'],
 ['authored sea butterfly assembly and articulation','function prepareButterflySea(lm){','function placeMonument(glb,group,'],
 ['mathematical islands and bridges','const MATH_ISLES=[','let bridgeToastTimer='],
 ['avatar inscription sightlines','const avatarMeshes=','// ===== GLB 精建模型'],
 ['modal input cancellation','function clearInput(){','function showDirectory(){'],
 ['mobile movement and camera input','let joyPointer=','window.addEventListener(\'resize\',resize);resize();'],
 ['walker movement, jump and body collisions','function move(dt){','function updateLandmarks(dt){'],
 ['camera collision and floor clearance','function subjectBounds(){','function updateCamera(dt){'],
 ['orbit and first-person clearance','function stepOrbit(','const labelWorld=']
];
// The bridge block is bounded by the exact next declaration, rather than a guessed name.
stableBlocks[2][2]='const avatarMeshes=';
function verifyStableHost(html){
 assert.deepEqual(snapshot(html),priorSnapshot,'computed building transforms, terrace heights, world constants, 26 complete entries, butterfly relocation and math islands remain unchanged');
 for(const [name,start,end]of stableBlocks)assert.equal(span(html,start,end),span(previousHtml,start,end),'unchanged '+name);
 const tracks=html.match(/const TRACKS=(\[[\s\S]*?\n\]);/);assert(tracks);assert.equal(tracks[1],previousHtml.match(/const TRACKS=(\[[\s\S]*?\n\]);/)[1],'unchanged music list');
 assert(!/<script[^>]+src=["']https?:/.test(html),'no external runtime scripts');
 return {computedDestinations:priorSnapshot.layout.LINKS.length,computedSites:priorSnapshot.layout.terraceSites.length,computedMathIslands:priorSnapshot.islands.length,stableBlocks:stableBlocks.map(([name])=>name)};
}
function verifyAssets(){
 const production=tracked.filter(f=>f.startsWith('assets/')||f.startsWith('vendor/'));
 const allowed=new Set(['assets/building-actions.js','assets/garden-weather.js']);
 const actual=git(['ls-files','--cached','--others','--exclude-standard','assets','vendor']).toString().trim().split('\n');
 assert.deepEqual(actual.sort(),[...production,'assets/courtyard-masterplan.js'].sort(),'only the approved masterplan runtime file is added');
 for(const file of production)if(!allowed.has(file))assert.equal(hash(current(file)),hash(old(file)),'unchanged production asset '+file);
 for(const file of ['garden.html','editorial.html','CNAME','README-COURTYARD.md'])assert.equal(hash(current(file)),hash(old(file)),'unchanged independent page / project identity '+file);
 for(const file of tracked.filter(f=>f.startsWith('docs/')&&f.endsWith('.cjs')))assert.equal(hash(current(file)),hash(old(file)),'inherited test preserved without weakening '+file);
 assert.equal(current('index.html').toString(),current('island.html').toString(),'entry aliases are byte-identical');
 const layout=verifyStableHost(current('index.html').toString());
 let mutationsRejected=0;const html=current('index.html').toString();
 for(const mutation of [
  html.replace('INNER_RING:70','INNER_RING:71'),
  html.replace("url:'https://moxi.maniforld.com'","url:'https://example.org'"),
  html.replace("title:'墨息'","title:'Changed'"),
  html.replace('innerCounts=[3,2,4,1]','innerCounts=[4,2,4,1]'),
  html.replace('x:ux*330,z:uz*330','x:ux*331,z:uz*330'),
  html.replace('const steps=0, rise=0;','const steps=1, rise=.15;'),
  html.replace('currentSpeed=6.3','currentSpeed=8.3')
 ]){assert.notEqual(mutation,html,'mutation must change the source');assert.throws(()=>verifyStableHost(mutation),assert.AssertionError);mutationsRejected++;}
 return {passed:true,baselineRuntimeFiles:production.length,pinnedRuntimeFiles:production.length-allowed.size,allowedChangedAssets:[...allowed],addedAsset:'assets/courtyard-masterplan.js',inheritedTestsPreserved:tracked.filter(f=>f.startsWith('docs/')&&f.endsWith('.cjs')).length,layout,mutationsRejected};
}
function verifyPublication(){
 const page=current('docs/deployment-verify.html').toString(),prior=old('docs/deployment-verify.html').toString();
 const manifest=JSON.parse(page.match(/const expected=(\{.*?\});/)[1]);
 const oldManifest=JSON.parse(prior.match(/const expected=(\{.*?\});/)[1]);
 assert.deepEqual(Object.keys(manifest).sort(),[...Object.keys(oldManifest),'assets/courtyard-masterplan.js'].sort(),'publication manifest retains every previous item and includes masterplan');
 for(const[file,digest]of Object.entries(manifest))assert.equal(hash(current(file)),digest,'publication hash '+file);
 assert.equal(page,prior.replace(/const expected=(\{.*?\});/,'const expected='+JSON.stringify(manifest)+';').replace('dossier-detail release','courtyard-masterplan release').replace("baselineCommit:'e531f775926dc5d24e3b2d063e542d872b655481'","baselineCommit:'"+baseline+"'").replace("buildLabel:'dossier-detail-2026-10-20'","buildLabel:'courtyard-masterplan-2026-10-20'"),'manifest template changes only the exact release identity and hashes');
 const pages=git(['ls-files','--cached','--others','--exclude-standard']).toString().trim().split('\n').filter(f=>f.endsWith('.html')&&!f.startsWith('qa-results/'));
 let references=0;
 for(const file of pages)for(const m of current(file).toString().matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]{16})"/g)){
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),m[1]));assert.equal(hash(current(target)).slice(0,16),m[2],'cache version '+file+' → '+target);references++;
 }
 for(const file of ['index.html','island.html'])for(const asset of ['building-actions','garden-weather','courtyard-masterplan'])assert(current(file).toString().includes('src="assets/'+asset+'.js?v='+hash(current('assets/'+asset+'.js')).slice(0,16)+'"'),'main entry loads the exact current '+asset);
 return {passed:true,manifestEntries:Object.keys(manifest).length,cacheReferences:references};
}
function verifySyntax(){let scripts=0;for(const file of tracked.filter(f=>f.endsWith('.js')&&(f.startsWith('assets/')||f.startsWith('vendor/'))).concat('assets/courtyard-masterplan.js')){new vm.Script(current(file).toString(),{filename:file});scripts++;}for(const file of ['index.html','island.html'])for(const m of current(file).toString().matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)){new vm.Script(m[1],{filename:file});scripts++;}return {passed:true,scripts};}
function verifyHostActionDeadlines(){
 const source=current('assets/building-actions.js').toString(),prior=old('assets/building-actions.js').toString();
 const specs=value=>JSON.parse(value.match(/const SPECS = (\[.*?\]);/)[1]);
 assert.deepEqual(specs(source),specs(prior),'all 78 source-backed action labels, kinds and section groups remain unchanged');
 const THREE=require(path.join(root,'vendor/three.min.js')),context={window:{}};let now=1000;
 vm.runInNewContext(source,context,{timeout:2000});
 const api=context.window.CourtyardBuildingActions.create({THREE,records:[{index:24,root:new THREE.Group(),mechanisms:[],metadata:{}}],now:()=>now});
 try{
  // This is the same apply(index, 1) path as the still-present data-craft=.5
  // button. Testing only the new pause() method would miss the real host path.
  api.apply(24,0);now+=35;api.apply(24,1);
  assert.equal(api.inspect(24).remaining,145,'host phase-1 pause settles suspended wall time before pausing');
  assert(api.inspect(24).paused);now+=1000;api.apply(24,1);
  assert.equal(api.inspect(24).remaining,145,'host phase-1 resume excludes explicitly paused time');
  api.apply(24,0);now+=181;api.apply(24,1);
  assert.equal(api.inspect(24).remaining,0,'host phase-1 pause catches an already expired deadline');
  assert(api.inspect(24).completed&&!api.inspect(24).paused&&!api.inspect(24).playing,'expired timer cannot become resumable');
  return {passed:true,sourceActions:78,checks:['legacy host pause settles wall time','legacy host resume excludes paused interval','expired timer cannot become resumable']};
 }finally{api.dispose();}
}
const frozenOnly=new Map([
 ...['detail-lod','gateway-detail','shield-detail','reme-detail','mindcare-detail','alternate-detail','dossier-detail','rss-detail','vault-detail'].map(n=>['docs/'+n+'-check.cjs','Exact historical service source or cumulative complete assembly identity']),
 ['docs/inscription-sightline-check.cjs','Exact historical full UI header snapshot; current avatar/orbit/input source is separately byte-pinned to the accepted baseline'],
 ['docs/current-release-check.cjs','Previous-release exact permitted source delta; intentionally does not accept a new release']
]);
function sourceSnapshot(){
 const files=git(['ls-files','--cached','--others','--exclude-standard']).toString().trim().split('\n')
  .filter(f=>f.startsWith('assets/')||f.startsWith('vendor/')||
   ['index.html','island.html','garden.html','editorial.html','CNAME','docs/deployment-verify.html'].includes(f)||
   f.startsWith('docs/')&&f.endsWith('.cjs')).sort();
 const hashes=Object.fromEntries(files.map(f=>[f,hash(current(f))]));
 return {files:hashes,digest:hash(JSON.stringify(hashes))};
}
const report={generatedAt:new Date().toISOString(),baseline,complete:false,passed:false,scope:'Unmodified current production CPU checks plus immutable prior-release acceptance. No browser/WebGL/device performance claim.',sources:{},current:[],historicalOnly:[],limits:['Historical checks are not current geometry acceptance.','No browser rendered pixels, live screen-reader behavior, touch-device interaction, browser movement or GPU performance is established by this suite.']};
function stage(name,fn){try{report.sources[name]=fn();console.log(JSON.stringify({stage:name,...report.sources[name]}));}catch(e){report.sources[name]={passed:false,error:String(e),stack:e.stack};console.error('FAIL '+name+': '+String(e));}}
function run(file,cwd,label,args=[]){const started=Date.now(),r=cp.spawnSync(process.execPath,[file,...args],{cwd,encoding:'utf8',timeout:600000,maxBuffer:128*1024*1024});const log=label+'-'+file.replaceAll('/','_')+'.log';fs.writeFileSync(path.join(out,log),(r.stdout||'')+(r.stderr||'')+(r.error?String(r.error):''));const row={file,args,scope:label,passed:r.status===0&&!r.error,exitCode:r.status,milliseconds:Date.now()-started,log};console.log(JSON.stringify(row));return row;}
try{
 report.startSnapshot=sourceSnapshot();
 stage('preservation',verifyAssets);stage('publication',verifyPublication);stage('syntax',verifySyntax);stage('hostActionDeadlines',verifyHostActionDeadlines);
 if(!process.argv.includes('--source-only')){
  const inherited=tracked.filter(f=>f.startsWith('docs/')&&f.endsWith('.cjs')&&!f.includes('/navigation-qa/')&&!['docs/wave1-check.cjs','docs/wave1-source-contract.cjs'].includes(f));
  const currentTests=inherited.filter(f=>!f.endsWith('-regression.cjs')&&!frozenOnly.has(f));
  for(const file of inherited)if(!currentTests.includes(file))report.historicalOnly.push({file,reason:frozenOnly.get(file)||'Exact historical release source / assembly identity'});
  currentTests.push('docs/masterplan-check.cjs','docs/masterplan-actions-check.cjs','docs/masterplan-weather-check.cjs','docs/masterplan-layout-source-check.cjs');
  for(const file of currentTests)report.current.push(run(file,root,'current'));
  if(!process.argv.includes('--current-only')){
   const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'masterplan-prior-release-'));cp.execFileSync('git',['clone','--shared','--quiet','--no-checkout',root,fixture]);cp.execFileSync('git',['-C',fixture,'checkout','--quiet','--detach',baseline]);
   assert.equal(cp.execFileSync('git',['-C',fixture,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline);
   report.priorRelease=run('docs/current-release-check.cjs',fixture,'historical-prior-release');report.priorRelease.fixtureCommit=baseline;
   const priorReport=JSON.parse(fs.readFileSync(path.join(fixture,'qa-results/current-release/report.json')));report.priorRelease.acceptance=priorReport;
   assert(priorReport.passed&&priorReport.complete,'Prior acceptance must fully pass on the immutable baseline');
   report.complete=true;
  }
 }
 stage('stableRun',()=>{report.endSnapshot=sourceSnapshot();assert.deepEqual(report.endSnapshot,report.startSnapshot,'production / manifest / test files must remain unchanged throughout acceptance');return {passed:true,files:Object.keys(report.startSnapshot.files).length,digest:report.startSnapshot.digest};});
 report.partial=!report.complete;report.passed=Object.values(report.sources).every(r=>r.passed)&&report.current.every(r=>r.passed)&&(!report.priorRelease||report.priorRelease.passed);
 if(!report.passed)process.exitCode=1;
}catch(e){report.failure=String(e);process.exitCode=1;console.error(e);}
finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,complete:report.complete,currentChecks:report.current.length,report:path.join(out,'report.json')}));}
