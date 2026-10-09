/* Source/geometry checks without a GPU. Run: node docs/architecture-static.cjs */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),THREE=require(path.join(root,'vendor/three.min.js'));
const context={THREE,window:{},console,document:{createElement(){return{width:0,height:0,getContext(){return {fillStyle:'',strokeStyle:'',lineWidth:1,fillRect(){},strokeRect(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},arc(){},fill(){},createLinearGradient(){return{addColorStop(){}}},measureText(t){return{width:t.length*10}}}}}}}};
context.window=context;vm.createContext(context);
for(const file of ['assets/architecture.js','assets/content-core.js','assets/content-creation-care.js','assets/content-services.js','assets/content-narratives.js','assets/content-literary.js','assets/infrastructure.js','assets/courtyard-runtime.js']){const src=fs.readFileSync(path.join(root,file),'utf8');new vm.Script(src,{filename:file}).runInContext(context);}
const rows=[];
for(let i=0;i<29;i++){
 if(i===23)continue;
 const b=i<26?context.window.CourtyardArchitecture.build({THREE,index:i,title:'Test '+i,zone:i<8?0:i<13?1:i<24?2:3}):context.window.CourtyardInfrastructure.buildMath({THREE,index:i-26});
 assert(b.root?.isGroup,'root '+i);assert(b.width>0&&b.depth>0,'dimensions '+i);assert(b.collisionBoxes?.length,'collisions '+i);
 b.root.updateMatrixWorld(true);let instances=0,meshes=0,triangles=0;
 b.root.traverse(o=>{if(!o.isMesh)return;meshes++;const count=o.isInstancedMesh?o.count:1;instances+=count;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*count;});
 const bounds=context.window.CourtyardRuntime.bounds(THREE,b.root);assert(Number.isFinite(bounds.max.y),'finite '+i);
 for(let z=-b.depth/2-2;z<=b.depth/2+2;z+=.1)for(const x of [-1.1,0,1.1])for(const box of b.collisionBoxes){const p=new THREE.Vector3(x,.5,z);assert(!box.clone().expandByScalar(.38).containsPoint(p),'clear aisle '+i+' at '+x+','+z);}
 for(const target of [0,1,.5,1,0,1])for(const m of b.mechanisms||[])if(m.update)m.update(target,1);else if(m.articulate)m.articulate(target);
 rows.push({index:i,meshes,instances,triangles,boxes:b.collisionBoxes.length,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},metadata:b.metadata});
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal(html,fs.readFileSync(path.join(root,'island.html'),'utf8'),'entry files identical');
const scripts=[...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(m=>m[1]);scripts.forEach((src,i)=>new vm.Script(src,{filename:'inline-'+i}));
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});fs.writeFileSync(path.join(root,'qa-results/static-report.json'),JSON.stringify({passed:true,rows},null,2));console.log(JSON.stringify({passed:true,buildings:rows.length,meshes:rows.reduce((s,r)=>s+r.meshes,0),triangles:rows.reduce((s,r)=>s+r.triangles,0)},null,2));
