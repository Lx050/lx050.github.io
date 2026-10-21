/* Audit source-linked offline CPU images. Never browser/WebGL/interaction/FPS evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-results/exploration/renders'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const result={type:'OFFLINE CPU GEOMETRY REVIEW; NOT PRODUCTION BROWSER / WEBGL / FPS',createdAt:new Date().toISOString(),passed:false,captures:{},failures:[]};
const check=(ok,message)=>{if(!ok)result.failures.push(message)};
const rebindPath=path.join(out,'source-rebinding.json'),rebind=fs.existsSync(rebindPath)?JSON.parse(fs.readFileSync(rebindPath)):null;
const freezePath=path.join(root,'qa-results/exploration/refinement-freeze.json'),freeze=fs.existsSync(freezePath)?JSON.parse(fs.readFileSync(freezePath)):null;
if(freeze){result.freeze=freeze;for(const [file,expected]of Object.entries(freeze))check(sha(fs.readFileSync(path.join(root,file)))===expected,'frozen source changed: '+file);}
for(const capture of ['world','boat']){
 const e=JSON.parse(fs.readFileSync(path.join(out,capture+'-export-report.json'))),r=JSON.parse(fs.readFileSync(path.join(out,capture+'-render-report.json'))),d=JSON.parse(fs.readFileSync(path.join(out,capture+'-scene.json')));
 const changed=Object.entries(e.sourceHashes).filter(([p,h])=>sha(fs.readFileSync(path.join(root,p)))!==h).map(([p])=>p);
 check(changed.length===0,capture+': source changed since export: '+changed.join(', '));
 if(freeze)for(const [file,expected]of Object.entries(freeze))if(e.sourceHashes[file])check(e.sourceHashes[file]===expected,capture+': rendered source does not match final freeze: '+file);
 check(e.sceneFingerprint===sha(JSON.stringify({geometries:d.geometries,materials:d.materials,objects:d.objects})),capture+': exported geometry fingerprint mismatch');
 let validatedRebinding=null;
 if(e.sceneFingerprint!==r.sceneFingerprint||JSON.stringify(e.sourceHashes)!==JSON.stringify(r.sourceHashes)){
  try{const verified=require('./exploration-render-rebind.cjs').audit(capture);check(!!rebind?.captures[capture],capture+': explicit provenance addendum missing');check(JSON.stringify(verified)===JSON.stringify(rebind?.captures[capture]),capture+': provenance addendum no longer matches original/latest scenes, reports or PNG hashes');validatedRebinding=verified;}catch(error){check(false,capture+': invalid source rebinding: '+error.message);}
 }
 const visible=e.architectureVisibility.filter(p=>p.groupVisible&&p.rootVisible&&!p.proxyVisible).length;
 check(visible===26,capture+': all 26 architecture roots must be visible');
 const colorIslands={};let colorChunks=0;
 for(const o of d.objects){const g=d.geometries[o.geometry],m=d.materials[o.materials[0]];if(!o.name.startsWith('island-')||!m.vertexColors)continue;
  check(g.color&&g.color.length===g.verts.length*3,capture+': color attribute size '+o.name);check(g.color.every(Number.isFinite),capture+': invalid terrain color '+o.name);
  const nonWhite=g.color.some(v=>Math.abs(v-1)>1e-6);check(nonWhite,capture+': missing regional terrain color ramp '+o.name);colorChunks++;colorIslands[o.name]=(colorIslands[o.name]||0)+1;
 }
 check(colorChunks===96&&Object.keys(colorIslands).length===12,capture+': expected color ramps on all 96 chunks / 12 islands');
 const roadMeshes=d.objects.filter(o=>o.name==='terrain-clipped-world-road');
 check(roadMeshes.length===33&&new Set(roadMeshes.map(o=>o.routeId)).size===33,capture+': all 33 actual road meshes must be captured');
 check(d.objects.filter(o=>o.name==='tapered-sky-island-solid').length===3,capture+': all three actual sky undersides must be captured');
 check(e.journeys.routes.length===33&&e.journeys.scenicPoints.length===10&&e.journeys.diagnostics.omitted.length===0,capture+': integrated journey diagnostics must be complete');
 const views=r.views.map(v=>{const bytes=fs.readFileSync(path.join(root,v.file)),size=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];check(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),capture+': invalid PNG '+v.file);check(JSON.stringify(size)===JSON.stringify(v.resolution),capture+': PNG dimensions disagree '+v.file);return{file:v.file,resolution:size,sha256:sha(bytes)};});
 check(views.length===(capture==='world'?5:2),capture+': not all seven requested/focused views rendered');
 result.captures[capture]={sceneFingerprint:e.sceneFingerprint,triangles:e.triangles,architectureRootsVisible:visible,vertexColorAudit:e.vertexColorAudit,colorIslands,routes:e.journeys.routes.length,scenicPoints:e.journeys.scenicPoints.length,omitted:e.journeys.diagnostics.omitted,changedSinceCapture:changed,sourceHashes:e.sourceHashes,originalRenderSourceHashes:r.sourceHashes,validatedRebinding,views};
}
result.passed=result.failures.length===0;fs.writeFileSync(path.join(out,'visual-review-manifest.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.passed,failures:result.failures,views:Object.values(result.captures).flatMap(c=>c.views.map(v=>v.file))},null,2));if(!result.passed)process.exitCode=1;
