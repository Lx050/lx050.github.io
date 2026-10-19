/* Actual builders, no browser/GPU; verifies bounded secondary-detail LOD and motion equivalence. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),zlib=require('zlib'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),T=require(root+'/vendor/three.min.js');
const baseline='7be2e7b9fcba939ebc9c70a5e363a6bd84ee59a7';
const MOONSNOW_TRIANGLES=2212,MOONSNOW_BATCHES=2; // Pinned to the final production mesh, not generated part metadata.
const details=['nuanling','nuanling-app','editor','ink','twinstars','causal','versions','rubbing','restoration','city','portraits','shield','huayun','gateway','proof','reme','workshop','session','handover','mindcare','moonsnow'];
const names=new Set(['editor-blender-drawer','twinstars-blender-screen','causal-blender-vent','versions-blender-screen','rubbing-blender-overlay','ink-blender-carriage','restoration-blender-light']);
function load(old=false){const c={console,THREE:T,document:{createElement(){return{width:0,height:0,getContext(){return new Proxy({measureText(text){return{width:String(text).length*10}},createLinearGradient(){return{addColorStop(){}}}},{get:(o,k)=>o[k]||(()=>{})})}}}}};c.window=c;vm.createContext(c);
 const read=file=>old?cp.execFileSync('git',['-C',root,'show',baseline+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024}):fs.readFileSync(root+'/'+file,'utf8');
 const allowed=new Set(['architecture','content-core',...details.filter(n=>!old||n!=='moonsnow').map(n=>n+'-detail'),'content-creation-care','content-services','content-narratives','content-literary','moon-snow-garden','courtyard-runtime']);
 const order=[...read('index.html').matchAll(/<script src="assets\/([^"?]+)\.js(?:\?v=[a-f0-9]{16})?"><\/script>/g)].map(m=>m[1]).filter(n=>allowed.has(n));
 assert.deepEqual([...order].sort(),[...allowed].sort(),'one copy of every production construction module');assert(order.indexOf('moon-snow-garden')>order.indexOf('content-literary'),'actual B20 override after literary');if(!old)assert(order.indexOf('moonsnow-detail')<order.indexOf('moon-snow-garden'),'B20 detail module loaded before final builder');
 for(const n of order)vm.runInContext(read('assets/'+n+'.js'),c,{filename:n+'.js'});c.auditProductionOrder=order;return c;}

const c=load(),control=load(),published=load(true),source=fs.readFileSync(root+'/assets/detail-lod.js','utf8');
function build(context,index){const b=context.CourtyardArchitecture.build({THREE:T,index,title:'Audit',zone:0});return context.CourtyardRuntime.register(T,b,b.root,index,'Audit');}
// One record intentionally predates module loading, exercising lazy collection.
const preexisting=build(c,0);
vm.runInContext(source,c);const once=c.CourtyardRuntime.update,registered=c.CourtyardRuntime.register;vm.runInContext(source,c);assert.equal(c.CourtyardRuntime.update,once);assert.equal(c.CourtyardRuntime.register,registered);
function count(objects){let triangles=0,batches=0;for(const root of objects)root.traverse(o=>{if(!o.isMesh)return;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);batches+=Array.isArray(o.material)?o.geometry.groups.length:1;});return{triangles,batches};}
function snapshot(b){const rows=[];b.root.traverse(o=>rows.push({name:o.name,position:o.position.toArray(),rotation:o.quaternion.toArray(),scale:o.scale.toArray(),visible:names.has(o.name)?null:o.visible,castShadow:o.castShadow}));return rows;}
const rows=[],productionGroupPresence=[];
const expectedStaticGroups={0:'ink-blender-static',4:'nuanling-blender-joinery',5:'nuanling-app-blender-detail',6:'editor-blender-static',15:'causal-blender-static',17:'twinstars-blender-static',18:'versions-blender-static',22:'rubbing-blender-static',3:'restoration-blender-static',16:'city-blender-static',14:'portraits-blender-static',7:'shield-blender-static',1:'huayun-blender-static',10:'gateway-blender-static',21:'proof-blender-static',12:'reme-blender-static',25:'workshop-blender-static',13:'session-blender-static',19:'handover-blender-static',24:'mindcare-blender-static',20:'moonsnow-blender-static'};
for(const index of [0,4,5,6,15,17,18,22,3,16,14,7,1,10,21,12,25,13,19,24,20]){
 const b=index===0?preexisting:build(c,index),original=build(control,index),moving=[],staticGroups=[];
 b.root.traverse(o=>{if(o.isGroup&&names.has(o.name))moving.push(o);else if(o.isGroup&&o.name.includes('blender'))staticGroups.push(o);});
 const expectedGroup=expectedStaticGroups[index],found=[];b.root.traverse(o=>{if(o.isGroup&&o.name===expectedGroup)found.push(o)});assert.equal(found.length,1,'final production builder has exactly one expected detail group '+index);productionGroupPresence.push({index,group:expectedGroup,count:found.length});
 // An unrelated similarly suffixed group must never be selected.
 const unrelated=new T.Group();unrelated.name='unrelated-blender-screen';unrelated.visible=false;b.root.add(unrelated);const other=unrelated.clone();original.root.add(other);
 for(const lightQuality of [false,true])for(const cameraEnabled of [false,true])for(const phase of [0,.5,1,0]){
  const camera=cameraEnabled?new T.PerspectiveCamera(60,1,.1,1000):undefined;if(camera){camera.position.set(0,15,40);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);}
  for(const distance of [0,(lightQuality?30:58)-.001,lightQuality?30:58,1000,0]){
   b.targetOpen=original.targetOpen=phase;const position=new T.Vector3(distance,0,0);
   c.CourtyardRuntime.update([b],position,.1,lightQuality,camera);control.CourtyardRuntime.update([original],position,.1,lightQuality,camera);
   assert.deepEqual(snapshot(b),snapshot(original),'original geometry visibility, transforms, shadows and mechanism motion unchanged');
   for(const g of moving){assert.equal(g.visible,distance<(lightQuality?30:58));assert.equal(g.parent.visible,true,'original moving pivot remains visible');}
   for(const g of staticGroups)assert.equal(g.visible,true,'essential static silhouette remains visible');
   assert.equal(unrelated.visible,false);
  }
 }
 rows.push({index,movingGroups:moving.length,farSavings:count(moving),allDetail:count([...moving,...staticGroups]),wholeBuilding:count([b.root])});
}
const expected={0:[1,352,2],4:[0,0,0],5:[0,0,0],6:[4,1584,16],15:[6,1584,12],17:[8,2464,16],18:[5,1100,10],22:[1,308,2],3:[1,176,2],16:[0,0,0],14:[0,0,0],7:[0,0,0],1:[0,0,0],10:[0,0,0],21:[0,0,0],12:[0,0,0],25:[0,0,0],13:[0,0,0],19:[0,0,0],24:[0,0,0],20:[0,0,0]};
for(const r of rows)assert.deepEqual([r.movingGroups,r.farSavings.triangles,r.farSavings.batches],expected[r.index]);
const transfer=details.map(name=>{const data=fs.readFileSync(root+'/assets/'+name+'-detail.js');return{name,rawBytes:data.length,gzip9Bytes:zlib.gzipSync(data,{level:9}).length}});
const sum=key=>rows.reduce((a,r)=>({triangles:a.triangles+r[key].triangles,batches:a.batches+r[key].batches}),{triangles:0,batches:0});
const priorRows=rows.filter(r=>r.index!==20);for(const row of priorRows){const original=build(published,row.index),moving=[],staticGroups=[];original.root.traverse(o=>{if(o.isGroup&&names.has(o.name))moving.push(o);else if(o.isGroup&&o.name.includes('blender'))staticGroups.push(o);});assert.deepEqual(row.farSavings,count(moving),'unchanged prior moving budget '+row.index);assert.deepEqual(row.allDetail,count([...moving,...staticGroups]),'unchanged prior complete detail '+row.index);assert.deepEqual(row.wholeBuilding,count([original.root]),'unchanged prior whole building '+row.index);}
const priorTotal=key=>priorRows.reduce((a,r)=>({triangles:a.triangles+r[key].triangles,batches:a.batches+r[key].batches}),{triangles:0,batches:0});assert.deepEqual(priorTotal('allDetail'),{triangles:149324,batches:135});assert.deepEqual(priorTotal('wholeBuilding'),{triangles:433012,batches:1008});
const targetBefore=build(published,20),target=rows.find(r=>r.index===20);assert.deepEqual(target.allDetail,{triangles:MOONSNOW_TRIANGLES,batches:MOONSNOW_BATCHES});assert.deepEqual(target.wholeBuilding,{triangles:count([targetBefore.root]).triangles+MOONSNOW_TRIANGLES,batches:count([targetBefore.root]).batches+MOONSNOW_BATCHES});assert(target.allDetail.triangles<2400&&target.allDetail.batches===MOONSNOW_BATCHES);
const sourceHashes=Object.fromEntries([...details.map(n=>'assets/'+n+'-detail.js'),'assets/moon-snow-garden.js','assets/content-narratives.js','assets/content-literary.js','assets/content-services.js','assets/detail-lod.js','assets/courtyard-runtime.js','index.html','docs/detail-lod-check.cjs'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(root+'/'+file)).digest('hex')]));
const report={passed:true,baseline,sourceHashes,unchangedPriorBuildings:priorRows.length,productionModuleOrder:c.auditProductionOrder,productionGroupPresence,moonsnowBefore:count([targetBefore.root]),rows,totalFarSavings:sum('farSavings'),totalDetail:sum('allDetail'),totalWholeBuildings:sum('wholeBuilding'),transfer,totalTransfer:transfer.reduce((a,r)=>({rawBytes:a.rawBytes+r.rawBytes,gzip9Bytes:a.gzip9Bytes+r.gzip9Bytes}),{rawBytes:0,gzip9Bytes:0})};
assert.deepEqual(report.totalDetail,{triangles:149324+MOONSNOW_TRIANGLES,batches:135+MOONSNOW_BATCHES},'cumulative twenty-one-building secondary detail budget');
assert.deepEqual(report.moonsnowBefore,{triangles:76892,batches:48},'original moonsnow production builder');
assert.deepEqual(report.totalWholeBuildings,{triangles:433012+report.moonsnowBefore.triangles+MOONSNOW_TRIANGLES,batches:1008+report.moonsnowBefore.batches+MOONSNOW_BATCHES},'cumulative twenty-one complete production builders');
assert.deepEqual(report.totalFarSavings,{triangles:7568,batches:60},'static moonsnow does not add an LOD target');
fs.mkdirSync(root+'/qa-results/moonsnow',{recursive:true});fs.writeFileSync(root+'/qa-results/moonsnow/budget.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
