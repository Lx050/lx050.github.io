/* Production exploration host for deterministic CPU geometry/motor checks.
 * DOM and WebGL renderer are inert. Real bundled Three, builders and GLBs run.
 * EXPLORATION_QUERY=?architectureQA=1&courtyard=1 selects legacy fallback. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=process.env.MASTERPLAN_ROOT?path.resolve(process.env.MASTERPLAN_ROOT):path.resolve(__dirname,'..'),out=process.env.MASTERPLAN_OUT?path.resolve(process.env.MASTERPLAN_OUT):path.join(root,'qa-results/masterplan');
async function loadHost(options={}){
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
const ctx={THREE,console:{log:(...a)=>logs.push(a.join(' ')),warn:(...a)=>logs.push(a.join(' ')),error:(...a)=>logs.push(a.join(' '))},document,innerWidth:1600,innerHeight:1000,devicePixelRatio:1,location:{search:process.env.EXPLORATION_QUERY||'?architectureQA=1',href:'https://offline.invalid/?architectureQA=1',origin:'https://offline.invalid',pathname:'/'},navigator:{maxTouchPoints:0,userAgent:'offline exact-geometry capture'},localStorage:{getItem:()=>null,setItem:noop},sessionStorage:{getItem:()=>null,setItem:noop},matchMedia:query=>({matches:!!options.reducedMotion&&String(query).includes('prefers-reduced-motion'),addEventListener:noop,removeEventListener:noop}),addEventListener:noop,removeEventListener:noop,requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,setInterval:()=>1,clearInterval:noop,performance:{now:()=>0},URL,URLSearchParams,TextDecoder,TextEncoder,AbortController,Promise,Blob,Buffer,atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),Audio:class{addEventListener(){}pause(){}play(){return Promise.resolve()}},ResizeObserver:class{observe(){}disconnect(){}},fetch:async u=>{const file=path.join(root,String(u).split('?')[0]);return{ok:fs.existsSync(file),status:fs.existsSync(file)?200:404,json:async()=>JSON.parse(fs.readFileSync(file,'utf8')),text:async()=>fs.readFileSync(file,'utf8')}}};
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
 return {context:ctx,garden:g,html,logs,nodes};
}
module.exports={loadHost};
