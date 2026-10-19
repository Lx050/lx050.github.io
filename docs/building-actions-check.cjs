/* No GPU needed: real THREE geometry, every source-backed option and animation. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),THREE=require(path.join(root,'vendor/three.min.js'));
const texts=[],canvases=[];
const context={console,THREE,document:{createElement(tag){
 assert.equal(tag,'canvas','No HTML UI created');
 const canvas={width:0,height:0,text:[],draw:[]};
 const c=new Proxy({
  clearRect(...args){canvas.draw=[];canvas.draw.push({type:'clearRect',args});},
  fillRect(...args){canvas.draw.push({type:'fillRect',args,fillStyle:this.fillStyle});},
  strokeRect(...args){canvas.draw.push({type:'strokeRect',args,strokeStyle:this.strokeStyle});},
  fillText(t,...args){canvas.text.push(t);texts.push(t);canvas.draw.push({type:'fillText',text:t,args,font:this.font,fillStyle:this.fillStyle});},
  measureText(t){return{width:[...String(t)].length*18};},
  createLinearGradient(){return{addColorStop(){}};}
 },{get(o,k){return k in o?o[k]:(()=>{});}});
 canvas.getContext=()=>c;canvases.push(canvas);return canvas;
}}};context.window=context;vm.createContext(context);
for(const name of ['rss-detail','architecture','content-core','ink-detail','restoration-detail','huayun-detail','alternate-detail','content-creation-care','shield-detail','gateway-detail','reme-detail','mindcare-detail','content-services','twinstars-detail','causal-detail','versions-detail','city-detail','portraits-detail','session-detail','content-narratives','rubbing-detail','proof-detail','workshop-detail','handover-detail','content-literary','moonsnow-detail','moon-snow-garden','reading-catalog','reading-panels','building-actions','courtyard-runtime'])new vm.Script(fs.readFileSync(path.join(root,'assets',name+'.js'),'utf8'),{filename:name}).runInContext(context);
const read=[],butterfly=[],records=[],originals=new Map();
for(let index=0;index<26;index++){
 const b=index===23?{root:new THREE.Group(),index,mechanisms:[],collisionBoxes:[],metadata:{}}:context.CourtyardArchitecture.build({THREE,index,title:context.CourtyardReadingCatalog[index].title,zone:0});
 b.index=index;b.targetOpen=.37;b.open=.37;
 const controller=context.CourtyardReadingPanels.attach({THREE,building:b,index,preview:context.CourtyardReadingCatalog[index]});if(controller)b.readingPanels=controller;
 originals.set(index,{boxes:b.collisionBoxes.slice(),children:b.root.children.length,mechanisms:b.mechanisms.map(m=>({m,update:m.update,value:m.openness})),target:b.targetOpen});records.push(b);
}
const api=context.CourtyardBuildingActions.create({THREE,records,catalog:context.CourtyardReadingCatalog,onSection(index,id){assert(context.CourtyardReadingCatalog[index].sections.some(x=>x.id===id));read.push({index,id});const b=records[index];return b.readingPanels?.setSection?.(id)!==false;},onButterflyPhase(phase,state){butterfly.push({phase,state});}});
assert.equal(context.CourtyardBuildingActions.count,26);
const outcomes=[];
for(let index=0;index<26;index++){
 const b=records[index],before=originals.get(index);assert.equal(api.describe(index).actions.length,3);
 for(let phase=0;phase<3;phase++){
  const result=api.apply(b,phase);assert(result.ok&&result.effectAvailable,`real world action ${index}/${phase}`);assert(result.sectionId,`source section ${index}/${phase}`);
  assert.equal(api.inspect(index).phase,phase);assert.equal(b.targetOpen,before.target,'No relabelled targetOpen assignment');
  for(let n=0;n<20;n++)api.update(.05);
  assert.equal(b.collisionBoxes.length,before.boxes.length,'No collision or architecture replacements');assert(b.collisionBoxes.every((q,n)=>q===before.boxes[n]));
  for(const m of b.mechanisms){m.update(.91,.1);assert(Number.isFinite(m.openness));}
  outcomes.push({index,phase,sectionId:result.sectionId,mechanism:result.mechanism,physicalSheet:result.physicalSheet});
 }
 if(index===20)assert.equal(b.root.children.length,before.children,'Integrated moon-snow garden has zero added objects');
}
// Entrance-only views remain public descriptions, not invented accounts.
for(const index of [8,9,11])assert.deepEqual(Array.from(api.describe(index).sectionGroups.flat()),Array.from(context.CourtyardReadingCatalog[index].sections,s=>s.id));
// Twelve biographies and ten sessions can actually be reached through repeated options.
for(const [index,phase,length]of[[13,1,10],[14,1,12],[18,1,5]]){const seen=new Set();for(let n=0;n<length;n++)seen.add(api.apply(index,phase).sectionId);assert.equal(seen.size,length,'Complete source cycle '+index);}
// Source manuscript/uncertainty layer is reversible and the original never disappears.
api.apply(1,0);const layers=records[1].root.getObjectByName('conservation-original-contour-mask-stack');assert(!layers.children[0].visible&&!layers.children[1].visible);
api.apply(1,1);assert(layers.children[0].visible&&!layers.children[1].visible);api.apply(1,2);assert(layers.children[1].visible);const chosenMask=()=>layers.children[1].children.slice(5).findIndex(m=>m.visible);const firstMask=chosenMask();api.apply(1,2);assert.notEqual(chosenMask(),firstMask);assert.equal(layers.children[1].children.slice(5).filter(m=>m.visible).length,1);
api.apply(22,0);assert(!records[22].root.getObjectByName('reversible-readability-overlay').visible);api.apply(22,1);assert(records[22].root.getObjectByName('reversible-readability-overlay').visible);
// Ink changes actual canvas pixels/instructions, independent of a common scalar.
api.apply(0,0);const seed=api.inspect(0).seed;api.apply(0,0);assert.equal(api.inspect(0).seed,seed+1);api.apply(0,2);assert(api.inspect(0).archived.includes(seed+1));
// Compare real drawing operations below the mode label, not template IDs or headings.
const modes=new Set(),layoutGeometry=new Set(),layoutImages=new Set(),layoutResults=[];
const sampleText=['庭院手记','树影落在纸上。','翻到下一页，继续观察。','图注：庭中树影','来源：本地固定示例'];
for(let n=0;n<4;n++){
 api.apply(6,1);const mode=api.inspect(6).template;modes.add(mode);
 const canvas=records[6].root.getObjectByName('local-exhibit-paper-6').material.map.image;
 const drawing=canvas.draw.filter(op=>op.type==='fillRect'&&op.args[1]>62&&op.args[1]<455);
 const image=drawing.find(op=>op.fillStyle==='#bdc2b0');assert(image,'Real image/caption block in each layout');
 const bodyText=canvas.draw.filter(op=>op.type==='fillText'&&sampleText.includes(op.text));
 assert.equal(bodyText.length,5,'Each layout retains every sample material');
 layoutGeometry.add(JSON.stringify({rectangles:drawing.map(op=>op.args),text:bodyText.map(op=>({args:op.args,font:op.font}))}));
 layoutImages.add(JSON.stringify(image.args));
 const arranged=JSON.stringify(bodyText);
 api.apply(6,2);assert.equal(JSON.stringify(canvas.draw.filter(op=>op.type==='fillText'&&sampleText.includes(op.text))),arranged,'Proof preserves the selected actual layout');
 assert(canvas.draw.some(op=>op.type==='strokeRect'),'Proof visibly checks text regions');
 layoutResults.push({mode,image:image.args,textPositions:bodyText.map(op=>op.args)});
}
assert.equal(modes.size,4);assert.equal(layoutGeometry.size,4,'Four distinct compositions excluding titles/labels');assert.equal(layoutImages.size,4,'Four distinct image block arrangements');assert(api.inspect(6).sheetRevision>=7);
// Handover begins exactly where its real carriage is, then advances without a jump.
const carriage=records[19].root.getObjectByName('handover-light-carriage');
api.apply(19,0);let priorZ=carriage.position.z;api.apply(19,1);assert.equal(carriage.position.z,priorZ,'Selection preserves initial handover position');
api.update(1/60);const firstStep=carriage.position.z-priorZ;
assert(firstStep>0&&firstStep<.011,'First frame is a continuous ~1 cm forward step, not a 3.8 m jump');
for(let n=0;n<4;n++)api.update(1);priorZ=carriage.position.z;api.apply(19,1);assert.equal(carriage.position.z,priorZ,'Re-selecting shared work keeps current position');
for(let n=0;n<24;n++)api.update(1);assert(!api.inspect(19).playing);assert(Math.abs(api.inspect(19).progress-.75)<1e-9);
api.apply(19,2);priorZ=carriage.position.z;api.apply(19,1);assert.equal(carriage.position.z,priorZ,'Reverse route also starts at current position');api.update(1/60);assert(carriage.position.z<priorZ&&priorZ-carriage.position.z<.011,'Reverse first frame remains continuous');
// Process pause freezes its actual inspection light, resumes, then replay restarts.
api.apply(3,2);api.update(1);const started=api.inspect(3).progress;assert(started>0);api.apply(3,1);api.update(1);assert.equal(api.inspect(3).progress,started);assert(!api.inspect(3).playing);api.apply(3,1);api.update(1);assert(api.inspect(3).progress>started);api.apply(3,2);assert.equal(api.inspect(3).progress,0);
for(let n=0;n<20;n++)api.update(1);assert(!api.inspect(3).playing);assert.equal(api.inspect(3).progress,1);
// Privacy window really expires; hidden tab-sized deltas cannot expose it permanently.
api.apply(12,1);for(let n=0;n<9;n++)api.update(1);assert.equal(api.inspect(12).remaining,0);assert(!api.inspect(12).playing);assert.equal(api.inspect(12).mechanismValue,0);
api.apply(12,1);api.apply(12,2);assert(!api.inspect(12).playing);assert.equal(api.inspect(12).mechanismValue,0);
// Local three-minute timer survives pause/resume and has a real terminal state.
api.apply(24,0);api.update(1);assert.equal(api.inspect(24).remaining,179);api.apply(24,1);api.update(1);assert.equal(api.inspect(24).remaining,179);api.apply(24,1);api.update(1);assert.equal(api.inspect(24).remaining,178);for(let n=0;n<180;n++)api.update(1);assert.equal(api.inspect(24).remaining,0);assert(!api.inspect(24).playing);api.apply(24,2);assert.equal(api.inspect(24).remaining,180);
assert.deepEqual(butterfly.slice(0,3),[{phase:0,state:'open'},{phase:1,state:'half'},{phase:2,state:'closed'}]);
assert(!api.apply(99,0).ok);assert(!api.apply(0,.5).ok);assert(!api.apply(0,3).ok);
// Added geometry stays strictly off the public 3.6 m center aisle (plus body radius).
for(const b of records){b.root.updateMatrixWorld(true);for(const name of api.inspect(b.index)?.ownedObjects||[]){const object=b.root.getObjectByName(name);const box=new THREE.Box3().setFromObject(object);assert(box.max.x<-2.18||box.min.x>2.18,'Action object outside axial clearance '+b.index+' '+name);}}
const map=JSON.parse(fs.readFileSync(path.join(root,'docs/building-actions-map.json')));assert.equal(map.buildings.length,26);assert(map.buildings.every(r=>r.labels.length===3&&r.effects.length===3));
const controlled=new Set(records.flatMap(b=>originals.get(b.index).mechanisms.filter(r=>r.m.update!==r.update).map(r=>r.m)));
api.dispose();assert(!api.apply(0,0).ok);
for(const b of records){const before=originals.get(b.index);assert.equal(b.root.children.length,before.children,'Owned additions removed '+b.index);for(const {m,update,value}of before.mechanisms){assert.equal(m.update,update,'Original motion restored');if(controlled.has(m))assert.equal(m.openness,value,'Original phase restored '+b.index);}}
// Reduced motion presents each selected state instantly and stays static thereafter.
let reduce=true;
const reduced=context.CourtyardBuildingActions.create({THREE,records,reducedMotion:()=>reduce,onSection(){return true;}});
for(const phase of [0,1,2]){
 reduced.apply(19,phase);const z=carriage.position.z;assert(!reduced.inspect(19).playing,'Reduced handover never starts playback');
 for(let n=0;n<120;n++){reduced.update(1/60);for(const m of records[19].mechanisms)m.update(.1,1/60);}
 assert.equal(carriage.position.z,z,'Reduced handover is stable across runtime frames '+phase);
 assert.equal(reduced.inspect(19).progress,phase===1?.75:phase/2);
}
reduce=false;reduced.apply(19,0);reduced.apply(19,1);reduced.update(1);assert(reduced.inspect(19).playing);
reduce=true;reduced.update(1/60);assert(!reduced.inspect(19).playing,'Live preference change stops playback');
const reducedZ=carriage.position.z;for(let n=0;n<30;n++)reduced.update(1/60);assert.equal(carriage.position.z,reducedZ);reduced.dispose();
// Wall-clock catch-up expires time-limited events even after a suspended frame loop.
let time=1000;const timed=context.CourtyardBuildingActions.create({THREE,records,now:()=>time,onSection(){return true;}});
timed.apply(12,1);time+=9;timed.update(.016);assert.equal(timed.inspect(12).remaining,0);
timed.apply(24,0);time+=59.2;timed.update(.016);assert(Math.abs(timed.inspect(24).remaining-120.8)<1e-6);
assert(!texts.some(t=>/\d:60/.test(t)),'No impossible timer seconds');timed.dispose();
assert(texts.some(t=>t.includes('未发送请求')));assert(texts.some(t=>t.includes('没有鉴定结论')));assert(texts.some(t=>t.includes('不提供医疗评估')));
fs.writeFileSync(path.join(root,'qa-results/building-actions-check.json'),JSON.stringify({pass:true,actions:outcomes.length,readEvents:read.length,canvasCount:canvases.length,checks:['26 buildings × 3 options','real public section cycles','conservation layer visibility','local ink and four distinct layout draw geometries','handover actual first-frame continuity and reselection','handover static reduced-motion and live preference change','process pause/replay/end','8-second privacy expiry','3-minute timer pause/resume/end','existing butterfly callback','moon-snow no added geometry','original collisions and targetOpen unchanged','off-axis additions','full disposal and mechanism restoration'],layoutResults,handoverFirstStepMetres:firstStep,outcomes},null,2)+'\n');
console.log('PASS: four distinct drawn layouts; continuous handover and static reduced motion; 78 source-backed actions; local rendering, independent mechanisms, pause/replay, expiry, timer, source cycles, geometry/privacy invariants, disposal.');
