/* Exact authored geometry capture, without WebGL. Run: node docs/masterplan-render-export.cjs
 * Renderer/DOM are inert. Geometry, transforms, deterministic layout, and module builders are real.
 * Output: qa-results/masterplan/scene.json and export-report.json. See report for omissions.
 * Set MASTERPLAN_ROOT / MASTERPLAN_OUT to capture an exact baseline checkout.
 * Compare: node docs/masterplan-render-export.cjs --compare before/scene.json after/scene.json */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=process.env.MASTERPLAN_ROOT?path.resolve(process.env.MASTERPLAN_ROOT):path.resolve(__dirname,'..'),out=process.env.MASTERPLAN_OUT?path.resolve(process.env.MASTERPLAN_OUT):path.join(root,'qa-results/masterplan');
async function loadHost(){
const THREE={...require(path.join(root,'vendor/three.min.js'))},noop=()=>{};
const context2d=new Proxy({measureText:t=>({width:String(t).length*13}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})},{get:(o,k)=>k in o?o[k]:noop});
function element(tag='div'){
 const e={tagName:tag.toUpperCase(),children:[],style:{setProperty:noop,removeProperty:noop},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},width:1600,height:1000,clientWidth:1600,clientHeight:1000,hidden:true,value:'',textContent:'',innerHTML:'',parentNode:null,
 addEventListener:noop,removeEventListener:noop,setAttribute:noop,getAttribute:()=>null,removeAttribute:noop,focus:noop,blur:noop,before:noop,after:noop,insertAdjacentHTML:noop,click:noop,remove:noop,contains:()=>false,getContext:()=>context2d,getBoundingClientRect:()=>({left:0,top:0,right:1600,bottom:1000,width:1600,height:1000}),getClientRects:()=>[],querySelectorAll:()=>[],querySelector:()=>element(),closest:()=>null,setPointerCapture:noop,releasePointerCapture:noop,hasPointerCapture:()=>false,toDataURL:()=>'',append(...children){for(const c of children){if(c&&typeof c==='object')c.parentNode=this;this.children.push(c);}},appendChild(c){this.append(c);return c},replaceChildren(...c){this.children=[];this.append(...c)}};
 return e;
}
const nodes=new Map(),document={baseURI:'https://offline.invalid/',body:element('body'),documentElement:element('html'),hidden:false,activeElement:element(),createElement:element,createElementNS:(ns,t)=>element(t),createTextNode:t=>({textContent:t}),getElementById:id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},querySelectorAll:()=>[],querySelector:()=>element(),addEventListener:noop,removeEventListener:noop};
class Renderer{constructor(){this.domElement=element('canvas');this.capabilities={isWebGL2:true,getMaxAnisotropy:()=>4};this.extensions={has:()=>true};this.info={autoReset:false,render:{calls:0,triangles:0,frame:0},reset:noop};this.shadowMap={};this.xr={enabled:false};this.ratio=1;this.autoClear=true;}setPixelRatio(r){this.ratio=r;}getPixelRatio(){return this.ratio}setSize(){}getSize(v){return v.set(1600,1000)}getDrawingBufferSize(v){return v.set(1600,1000)}getRenderTarget(){return null}setRenderTarget(){}render(){}clear(){}clearDepth(){}getClearAlpha(){return 1}getClearColor(c){return c.set(0)}setClearColor(){}setViewport(){}setScissor(){}setScissorTest(){}}
THREE.WebGLRenderer=Renderer;
THREE.EffectComposer=class{constructor(){this.passes=[];}setPixelRatio(){}setSize(){}addPass(p){this.passes.push(p)}render(){}};
THREE.RenderPass=class{constructor(scene,camera){this.scene=scene;this.camera=camera;}};
THREE.ShaderPass=class{constructor(shader){this.uniforms=shader.uniforms;this.material=new THREE.ShaderMaterial(shader)}};
THREE.UnrealBloomPass=class{constructor(){this.renderTargetBright={texture:{}};this.renderTargetsHorizontal=[];this.renderTargetsVertical=[];}};
const logs=[],pending=[];
const ctx={THREE,console:{log:(...a)=>logs.push(a.join(' ')),warn:(...a)=>logs.push(a.join(' ')),error:(...a)=>logs.push(a.join(' '))},document,innerWidth:1600,innerHeight:1000,devicePixelRatio:1,location:{search:'?architectureQA=1',href:'https://offline.invalid/?architectureQA=1',origin:'https://offline.invalid',pathname:'/'},navigator:{maxTouchPoints:0,userAgent:'offline exact-geometry capture'},localStorage:{getItem:()=>null,setItem:noop},sessionStorage:{getItem:()=>null,setItem:noop},matchMedia:()=>({matches:false,addEventListener:noop,removeEventListener:noop}),addEventListener:noop,removeEventListener:noop,requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,setInterval:()=>1,clearInterval:noop,performance:{now:()=>0},URL,URLSearchParams,TextDecoder,TextEncoder,AbortController,Promise,Blob,Buffer,atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),Audio:class{addEventListener(){}pause(){}play(){return Promise.resolve()}},ResizeObserver:class{observe(){}disconnect(){}},fetch:async u=>{const file=path.join(root,String(u).split('?')[0]);return{ok:fs.existsSync(file),status:fs.existsSync(file)?200:404,json:async()=>JSON.parse(fs.readFileSync(file,'utf8')),text:async()=>fs.readFileSync(file,'utf8')}}};
ctx.window=ctx;ctx.self=ctx;vm.createContext(ctx);
// The real local GLTF parser loads authored binary scenery; no network or alternate geometry.
vm.runInContext(fs.readFileSync(root+'/vendor/three/GLTFLoader.js','utf8'),ctx,{filename:'vendor/three/GLTFLoader.js'});
const parse=THREE.GLTFLoader.prototype.parse;
THREE.GLTFLoader.prototype.load=function(url,onLoad,onProgress,onError){
 const p=new Promise(resolve=>{try{const b=fs.readFileSync(path.join(root,url.split('?')[0]));parse.call(this,b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',g=>{onLoad(g);resolve()},e=>{onError?.(e);resolve()})}catch(e){onError?.(e);resolve()}});pending.push(p);
};
const html=fs.readFileSync(root+'/index.html','utf8');
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
 const src=match[1].match(/src=["']([^"']+)/)?.[1]?.split('?')[0];
 if(src?.startsWith('vendor/'))continue;
 vm.runInContext(src?fs.readFileSync(path.join(root,src),'utf8'):match[2],ctx,{filename:src||'index.html:inline',timeout:120000});
}
 await Promise.all(pending);await Promise.resolve();
 const g=ctx.__garden;if(!g?.scene)throw Error('Host did not finish: '+(nodes.get('error-message')?.textContent||logs.join('\n')));
 return {context:ctx,garden:g,html,logs};
}
async function exportScene(){
 const {context:ctx,garden:g,html,logs}=await loadHost(),THREE=ctx.THREE;
 // Force detailed architectural geometry for offline inspection, not a claim about runtime LOD.
 for(const b of g.architectureQA?.buildings||[]){b.root.visible=true;if(b.detail)b.detail.visible=true;}
 if(g.architectureQA?.renderView)g.architectureQA.renderView({position:[0,200,250],target:[0,0,50],sky:.15});
 for(const b of g.architectureQA?.buildings||[]){b.root.visible=true;if(b.detail)b.detail.visible=true;}
 if(g.masterplan){g.masterplan.selectRoute(process.env.MASTERPLAN_ROUTE||'pilot');for(const b of g.masterplan.obstacles||[])b.root.visible=true;}
 g.mechanicalStep(0);g.scene.updateMatrixWorld(true);
 const geometries={},materials={},objects=[],skipped={invisible:0,sprite:0,points:0,line:0,background:0,empty:0};let meshCount=0,instances=0,triangles=0;
 const v=new THREE.Vector3(),im=new THREE.Matrix4(),world=new THREE.Matrix4();
 function matData(m){if(materials[m.uuid])return m.uuid;const shader=m.isShaderMaterial;let col=m.color?.toArray()||m.uniforms?.uDeep?.value?.toArray()||[.11,.15,.16];materials[m.uuid]={name:m.name||m.type,color:col,emissive:m.emissive?.toArray()||[0,0,0],emissiveIntensity:m.emissiveIntensity||0,roughness:m.roughness??.9,metalness:m.metalness??0,opacity:m.opacity??1,transparent:!!m.transparent,side:m.side,hasMap:!!m.map,shader:!!shader,flatShading:!!m.flatShading,vertexColors:!!m.vertexColors};return m.uuid;}
 function traverse(o,visible=true){visible=visible&&o.visible;if(!visible){skipped.invisible++;return}if(o.isSprite){skipped.sprite++;return}if(o.isPoints){skipped.points++;return}if(o.isLine){skipped.line++;return}
  if(o.isMesh){
   // Painted distant peaks and sky orbs/dome are browser backdrop, not masterplan geometry.
   if(o.renderOrder<=-900||o.material?.fog===false&&!o.material?.depthWrite){skipped.background++;return}
   o.getWorldPosition(v);if(Math.abs(v.x)>600||Math.abs(v.z)>600||v.y>450){skipped.background++;return}
   const geo=o.geometry,p=geo.attributes.position;if(!p){skipped.empty++;return}
   if(!geometries[geo.uuid]){const verts=[];for(let i=0;i<p.count;i++)verts.push([p.getX(i),p.getY(i),p.getZ(i)]);const idx=geo.index,indices=idx?Array.from(idx.array):Array.from({length:p.count},(_,i)=>i);geometries[geo.uuid]={name:geo.name||geo.type,verts,indices,groups:geo.groups,color:geo.attributes.color?Array.from(geo.attributes.color.array):null};}
   const ms=(Array.isArray(o.material)?o.material:[o.material]).map(matData);meshCount++;
   for(let k=0;k<(o.isInstancedMesh?o.count:1);k++){world.copy(o.matrixWorld);if(o.isInstancedMesh){o.getMatrixAt(k,im);world.multiply(im)}objects.push({name:o.name||o.parent?.name||o.type,geometry:geo.uuid,materials:ms,matrix:Array.from(world.elements),instanceColor:o.instanceColor?[o.instanceColor.getX(k),o.instanceColor.getY(k),o.instanceColor.getZ(k)]:null});instances++;triangles+=geometries[geo.uuid].indices.length/3;}
  }
  for(const c of o.children)traverse(c,visible);
 }
 traverse(g.scene);
 const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const geoHashes=Object.fromEntries(Object.entries(geometries).map(([id,value])=>[id,digest(value)]));
 const materialHashes=Object.fromEntries(Object.entries(materials).map(([id,value])=>[id,digest(value)]));
 const sceneFingerprint=digest(objects.map(o=>JSON.stringify({...o,geometry:geoHashes[o.geometry],materials:o.materials.map(id=>materialHashes[id])})).sort());
 const b23=g.landmarks.find(l=>l.index===23),eye=(x,z)=>[x,-z,g.surfaceHeight(x,z)+1.7];
 const quiet=g.masterplan?.pockets?.find(p=>p.zone===2)||{x:43.14211422236,z:-21.04181504588},qa=Math.atan2(quiet.x,quiet.z),qp={x:quiet.x+Math.sin(qa)*6,z:quiet.z+Math.cos(qa)*6};
 const eyeHeightViews=[{name:'eye-entry',title:'05  EYE HEIGHT / GARDEN ENTRY',position:eye(0,60),target:[0,0,4],lens:22,note:'1.7m above actual walking surface | entry toward central court'},
 {name:'eye-central',title:'06  EYE HEIGHT / CENTRAL COURT',position:eye(5,6),target:[b23.x,-b23.z,12],lens:25,note:'1.7m above actual walking surface | distant butterfly sightline'},
 {name:'eye-quiet-pocket',title:'07  EYE HEIGHT / QUIET POCKET',position:eye(qp.x,qp.z),target:[quiet.x,-quiet.z,g.surfaceHeight(quiet.x,quiet.z)+1.55],lens:23,note:'1.7m above actual walking surface | quiet shelter and seating'}];
 const sources=['index.html','vendor/three.min.js','vendor/three/GLTFLoader.js',...g.modelLoads.loaded,...Array.from(html.matchAll(/src="(assets\/[^"?]+)(?:\?[^"]*)?"/g)).map(m=>m[1])];
 const report={type:'exact-authored-geometry offline capture',createdAt:new Date().toISOString(),host:'index.html',masterplanIntegrated:!!ctx.CourtyardMasterplan,sceneFingerprint,eyeHeightViews,sourceHashes:Object.fromEntries(sources.filter(f=>fs.existsSync(path.join(root,f))).map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),meshCount,instances,triangles,uniqueGeometries:Object.keys(geometries).length,materials:Object.keys(materials).length,loadedModels:g.modelLoads,skipped,landmarks:g.landmarks.map(l=>({index:l.index,title:l.title,x:l.x,z:l.z,groundY:l.groundY,entryPoint:l.entryPoint,gatePoint:l.gatePoint})),masterplan:g.masterplan?{...g.masterplan.inspect(),routes:Object.fromEntries(Object.entries(g.masterplan.routes).map(([id,r])=>[id,{id:r.id,name:r.name,points:r.points}])),pocketDetails:g.masterplan.pockets,localBypasses:g.masterplan.repairs||[]}:null,coverage:['Actual production host executes with its bundled Three.js geometry constructors and actual module build calls.','Actual bundled GLTFLoader parses locally stored GLB scenery.','All architecture detail groups are enabled for offline review; deterministic building and terrain transforms are preserved.','Objects retain source linear base color, roughness, metalness and emission.'],limitations:['Not a browser screenshot or WebGL test. No browser shaders, lighting equivalence, FPS or interaction evidence.','CPU Cycles translates basic material colors and opacity only; canvas texture text/grain, custom shader patterns, alpha maps, bloom, reflection render targets and fog are omitted.','Sprites, particle points, lines, painted distant mountains and sky dome are omitted. Sky lighting is an offline neutral review rig.','Offline view labels, if enabled, are explanatory annotations, not production geometry.','Three.js material.side is exported; Blender enforces front/back face visibility with a Backfacing/Transparent shader and preserves mirrored-transform front-face orientation.'],logs};
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/scene.json',JSON.stringify({report,geometries,materials,objects}));fs.writeFileSync(out+'/export-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,masterplanIntegrated:report.masterplanIntegrated,meshCount,instances,triangles,loadedModels:g.modelLoads,skipped,output:out},null,2));
 return report;
}
function compareScenes(beforePath,afterPath){
 const before=JSON.parse(fs.readFileSync(beforePath)),after=JSON.parse(fs.readFileSync(afterPath));
 const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
 function counts(data,appearance){const geometry=Object.fromEntries(Object.entries(data.geometries).map(([id,g])=>[id,digest({verts:g.verts,indices:g.indices,groups:g.groups})]));const material=Object.fromEntries(Object.entries(data.materials).map(([id,m])=>[id,digest(m)]));const result=new Map();for(const o of data.objects){const id=digest([geometry[o.geometry],o.matrix,...(appearance?[o.materials.map(id=>material[id]),o.instanceColor]:[])]);result.set(id,(result.get(id)||0)+1);}return result;}
 const comparisons=[false,true].map(appearance=>{const b=counts(before,appearance),a=counts(after,appearance);let inherited=0,missing=0;for(const [id,count]of b){const retained=Math.min(count,a.get(id)||0);inherited+=retained;missing+=count-retained;}return{appearance,inheritedInstances:inherited,missingOrChanged:missing,addedInstances:after.report.instances-inherited};});
 return{passed:comparisons.every(c=>c.missingOrChanged===0),before:beforePath,after:afterPath,beforeFingerprint:before.report.sceneFingerprint,afterFingerprint:after.report.sceneFingerprint,baselineInstances:before.report.instances,currentInstances:after.report.instances,comparisons,meaning:'The check compares exact inherited triangle coordinates, topology, world transforms and scalar material state. It does not compare WebGL shaders, CanvasTexture pixels or the offline lighting rig.'};
}
function auditRoadTerrain(scenePath){
 const d=JSON.parse(fs.readFileSync(scenePath)),terrain=Object.values(d.geometries).find(g=>g.name==='PlaneGeometry'&&g.verts.length===181*181);if(!terrain)throw Error('Expected authored 180x180 terrain grid');
 const v=terrain.verts,stepX=(v[180][0]-v[0][0])/180,stepZ=(v[180*181][2]-v[0][2])/180;
 function height(x,z){const fx=(x-v[0][0])/stepX,fz=(z-v[0][2])/stepZ,ix=Math.floor(fx),iz=Math.floor(fz),n=iz*181+ix,u=(x-v[n][0])/(v[n+1][0]-v[n][0]),w=(z-v[n][2])/(v[n+181][2]-v[n][2]);const a=v[iz*181+ix][1],b=v[(iz+1)*181+ix][1],c=v[(iz+1)*181+ix+1][1],dd=v[iz*181+ix+1][1];return u+w<=1?a+(dd-a)*u+(b-a)*w:c+(b-c)*(1-u)+(dd-c)*(1-w);}
 let affected=0,total=0,minimum=0,samples=0,below=0;const worst=[];
 for(const o of d.objects.filter(o=>o.name==='island-road-stone-courses')){const m=o.matrix;let low=0,point=null;for(const x of [-.5,-.25,0,.25,.5])for(const z of [-.5,-.25,0,.25,.5]){const xx=m[0]*x+m[4]*.5+m[8]*z+m[12],yy=m[1]*x+m[5]*.5+m[9]*z+m[13],zz=m[2]*x+m[6]*.5+m[10]*z+m[14];if(Math.hypot(xx,zz)>148)continue;const gap=yy-height(xx,zz);samples++;if(gap<-.001)below++;if(gap<low){low=gap;point=[xx,yy,zz];}}total++;if(low<-.001){affected++;worst.push({gap:low,point});}minimum=Math.min(minimum,low);}
 worst.sort((a,b)=>a.gap-b.gap);return{scene:scenePath,sceneFingerprint:d.report.sceneFingerprint,sourceIndexSha256:d.report.sourceHashes['index.html'],roadTileInstances:total,roadTilesWithSamplesBelowRenderedTerrain:affected,totalSamples:samples,belowTerrainSamples:below,maximumBelowTerrainMetres:-minimum,worst:worst.slice(0,8),method:'5x5 samples per source road tile top. Only main-island samples with radius <=148m. Height is barycentric interpolation of the authored PlaneGeometry terrain triangles, not the analytic terrainHeight function.',interpretation:'Inherited road top surfaces occur below rendered terrain, which can expose terrain-coloured triangular wedges. This is CPU geometry evidence, not a browser rendering result; lighting can also contribute to appearance.'};
}
module.exports={loadHost,exportScene,compareScenes,auditRoadTerrain};
if(require.main===module){if(process.argv[2]==='--audit-road'){const report=auditRoadTerrain(process.argv[3]);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/baseline-road-height-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}else if(process.argv[2]==='--compare'){const report=compareScenes(process.argv[3],process.argv[4]);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/baseline-comparison.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}else exportScene().catch(e=>{console.error(e);process.exitCode=1});}
