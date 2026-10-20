/* GPU-free regression of the real action API. Does not claim browser/device QA. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),THREE=require(path.join(root,'vendor/three.min.js'));
const rendered=[];
const context={console,THREE,document:{createElement(tag){
  assert.equal(tag,'canvas','Actions create only local drawing surfaces, not DOM controls');
  const canvas={width:0,height:0},ctx=new Proxy({
    fillText(text){rendered.push(text);},
    measureText(text){return {width:[...String(text)].length*18};},
    createLinearGradient(){return {addColorStop(){}};}
  },{get(object,key){return key in object?object[key]:(()=>{});}});
  canvas.getContext=()=>ctx;return canvas;
}}};context.window=context;vm.createContext(context);
for(const name of ['dossier-detail','vault-detail','rss-detail','architecture','content-core',
  'ink-detail','restoration-detail','huayun-detail','alternate-detail','content-creation-care',
  'shield-detail','gateway-detail','reme-detail','mindcare-detail','content-services',
  'twinstars-detail','causal-detail','versions-detail','city-detail','portraits-detail','session-detail',
  'content-narratives','rubbing-detail','proof-detail','workshop-detail','handover-detail',
  'content-literary','moonsnow-detail','moon-snow-garden','reading-catalog','reading-panels','building-actions']){
  new vm.Script(fs.readFileSync(path.join(root,'assets',name+'.js'),'utf8'),{filename:name}).runInContext(context);
}
const records=[],baseline=[],sections=[],events=[],butterfly=[],catalog=context.CourtyardReadingCatalog;
let time=1000,reduced=false;
for(let index=0;index<26;index++){
  const b=index===23?{root:new THREE.Group(),index,mechanisms:[],collisionBoxes:[],metadata:{}}:
    context.CourtyardArchitecture.build({THREE,index,title:catalog[index].title,zone:0});
  b.index=index;b.targetOpen=.37;
  b.readingPanels=context.CourtyardReadingPanels.attach({THREE,building:b,index,preview:catalog[index]});
  if(index===0)b.userActionState={original:true};
  const authoredAppearance=new Map();for(const m of b.mechanisms)m.object?.traverse(o=>authoredAppearance.set(o,{material:o.material,visible:o.visible}));
  baseline.push({children:b.root.children.length,boxes:b.collisionBoxes.slice(),
    actionState:b.userActionState,authoredAppearance,mechanisms:b.mechanisms.map(m=>({m,update:m.update,value:m.openness}))});
  records.push(b);
}
const api=context.CourtyardBuildingActions.create({THREE,records,catalog,now:()=>time,reducedMotion:()=>reduced,
  onSection(index,id,phase){assert(catalog[index].sections.some(s=>s.id===id));sections.push({index,id,phase});return records[index].readingPanels?.setSection(id)!==false;},
  onFeedback(index,value){assert.equal(value.index,index);assert(value.localOnly);events.push(value);},
  onButterflyPhase(phase,state){butterfly.push({phase,state});}
});
const step=dt=>{time+=dt;api.update(dt);};
const readState=index=>JSON.stringify({counts:api.inspect(index).counts,sectionId:api.inspect(index).sectionId});
const selectedSection=index=>sections.filter(s=>s.index===index).at(-1)?.id;
let repetitions=0;
for(let index=0;index<26;index++){
  assert.equal(api.feedback(index).status,'idle');
  assert.equal(api.inspect(index),null,'Feedback lookup does not allocate action state');
  for(let phase=0;phase<3;phase++)for(let repeat=0;repeat<3;repeat++){
    const before=events.length,result=api.apply(index,phase),f=api.feedback(index);
    assert(result.ok&&result.effectAvailable);assert.equal(f.phase,phase);
    assert.equal(events.length,before+1,'Every activation has immediate feedback');
    assert.equal(result.feedback.sectionId,result.sectionId);assert.equal(f.sectionTitle,catalog[index].sections.find(s=>s.id===f.sectionId).title);
    assert(f.text.length>0&&f.actionCount===repeat+1);assert.equal(records[index].userActionState.feedback.text,f.text);
    step(.1);repetitions++;
  }
}
// A repeated static action is visible in feedback, not only a silent scalar change.
api.apply(0,0);const firstText=api.feedback(0).text;api.apply(0,0);assert.notEqual(api.feedback(0).text,firstText);
// All existing public sections remain reachable; reset must preserve the next leaf.
for(const [index,phase,length]of [[13,1,10],[14,1,12],[18,1,5],[19,2,5]]){
  const ids=Array.from(api.describe(index).sectionGroups[phase]),seen=new Set();
  for(let n=0;n<length;n++){
    const result=api.apply(index,phase);seen.add(result.sectionId);
    const oldRead=readState(index),section=result.sectionId,eventCount=sections.length;
    assert(api.reset(index).ok);assert.equal(readState(index),oldRead);assert.equal(selectedSection(index),section);
    assert.equal(sections.length,eventCount,'Reset never changes reading');
    assert.equal(api.feedback(index).status,'reset');assert(!api.feedback(index).canReset);
  }
  assert.equal(seen.size,length);const next=api.apply(index,phase).sectionId;
  assert.equal(next,ids[(api.inspect(index).counts[phase]-1)%length]);
}
// Pausing every moving local exhibit freezes its actual output and resumes in place.
const pausable=[[3,2],[4,1],[5,2],[10,1],[19,1],[24,0]];
for(const [index,phase]of pausable){
  api.reset(index);api.apply(index,phase);step(.4);
  const before=api.inspect(index),readBefore=readState(index),readEvents=sections.length;
  const object=index===19?records[index].root.getObjectByName('handover-light-carriage'):
    records[index].root.getObjectByName('anonymous-local-signal-'+index)?.children.at(-1);
  const position=object?.position.clone(),value=api.inspect(index).mechanismValue;
  assert(api.feedback(index).canPause);assert(api.pause(records[index]).ok);assert(api.pause(index).ok,'Repeated pause is idempotent');
  assert(api.feedback(index).canResume);assert(!api.feedback(index).canPause);
  for(let n=0;n<6;n++){step(1);for(const m of records[index].mechanisms)m.update(.91,1);}
  const stopped=api.inspect(index);
  assert.equal(stopped.elapsed,before.elapsed);assert.equal(stopped.progress,before.progress);assert.equal(stopped.remaining,before.remaining);
  assert.equal(stopped.mechanismValue,value);if(object)assert(object.position.equals(position),'Physical output stays frozen '+index);
  assert.equal(readState(index),readBefore);assert.equal(sections.length,readEvents,'Pause never cycles the inscription');
  assert(api.resume(records[index]).ok);assert(api.resume(index).ok,'Repeated resume is idempotent');
  assert.equal(api.inspect(index).elapsed,before.elapsed,'Resume does not restart');
  step(.2);assert(api.inspect(index).elapsed>before.elapsed);
  assert.equal(readState(index),readBefore);assert.equal(sections.length,readEvents);
}
// The privacy window is not a pausable camera and cannot be kept open by the new API.
api.apply(12,1);assert(!api.feedback(12).canPause&&!api.feedback(12).canResume);
assert(!api.pause(12).ok);assert(!api.resume(12).ok);
time+=9;api.update(.016);assert.equal(api.inspect(12).remaining,0);assert.equal(api.inspect(12).mechanismValue,0);
assert.equal(api.feedback(12).status,'complete');assert(api.feedback(12).text.includes('已归隐'));
api.apply(12,1);assert(api.reset(12).ok);assert.equal(api.inspect(12).mechanismValue,0);
for(const m of records[12].mechanisms)m.update(.5,1);assert.equal(api.inspect(12).mechanismValue,0,'Global roof frame cannot reopen reset privacy action');
// No reset or invented controls for login-only descriptions or external butterfly rig.
for(const index of [8,9,11,23]){
  api.apply(index,1);const before=readState(index);
  assert(!api.feedback(index).canPause&&!api.feedback(index).canResume&&!api.feedback(index).canReset);
  assert(!api.reset(index).ok);assert(!api.pause(index).ok);assert(!api.resume(index).ok);
  assert.equal(readState(index),before);
}
assert(butterfly.length>0);
// Timer deadlines catch up before a pause, but explicitly paused time is excluded.
api.apply(24,0);time+=35;assert(api.pause(24).ok);assert.equal(api.inspect(24).remaining,145);
time+=1000;api.update(.1);assert.equal(api.inspect(24).remaining,145);
api.resume(24);step(1);assert.equal(api.inspect(24).remaining,144);
time+=145;assert(!api.pause(24).ok);assert.equal(api.feedback(24).status,'complete');
assert(!api.feedback(24).canResume);assert(!api.resume(24).ok);
api.apply(24,1);assert(!api.inspect(24).playing,'Completed timer cannot resume below zero');assert(!api.inspect(24).paused);
// The host keeps the authored phase-1 timer button, not a duplicate direct pause
// button. It must settle wall time even when its click precedes the next frame.
api.apply(24,0);time+=35;let timerEvents=events.length,readingEvents=sections.length;
const legacyPause=api.apply(24,1);
assert.equal(api.inspect(24).remaining,145,'Authored pause accounts for a no-frame background interval');
assert(!api.inspect(24).playing&&api.inspect(24).paused);assert.equal(legacyPause.feedback.status,'paused');
assert.equal(events.length,timerEvents+1,'Legacy pause emits one settled snapshot');
assert.equal(sections.length,readingEvents+1,'Authored source-selection behavior is preserved');
time+=1000;api.apply(24,1);assert.equal(api.inspect(24).remaining,145,'No-frame resume excludes explicitly paused time');
assert(api.inspect(24).playing&&!api.inspect(24).paused);
time+=5;api.apply(24,1);assert.equal(api.inspect(24).remaining,140,'Second no-frame pause uses the resumed deadline');
api.resume(24);step(1);assert.equal(api.inspect(24).remaining,139,'Legacy toggle and direct resume interoperate');
api.apply(24,0);time+=181;timerEvents=events.length;
const expiredPause=api.apply(24,1);
assert.equal(api.inspect(24).remaining,0);assert(!api.inspect(24).playing&&!api.inspect(24).paused);
assert.equal(expiredPause.feedback.status,'complete');assert(!expiredPause.feedback.canResume);
assert.equal(events.length,timerEvents+1,'Expiry on a legacy click emits the final state only');
assert(!api.resume(24).ok);api.apply(24,1);assert.equal(api.inspect(24).remaining,0);assert(!api.inspect(24).playing);
api.apply(24,0);time+=179.75;api.apply(24,1);assert.equal(api.inspect(24).remaining,.25);
time+=20;api.apply(24,1);time+=.25;api.apply(24,1);
assert.equal(api.inspect(24).remaining,0);assert.equal(api.feedback(24).status,'complete','Subsecond resumed deadline expires on its boundary');
api.apply(3,2);for(let n=0;n<17;n++)step(1);assert.equal(api.feedback(3).status,'complete');
api.apply(3,1);assert(!api.inspect(3).playing,'Completed process needs replay, not empty resume');
// Static reduced-motion handover remains static across pause/resume/reset lifecycle.
reduced=true;api.reset(19);api.apply(19,1);assert(!api.feedback(19).canPause);
const carriage=records[19].root.getObjectByName('handover-light-carriage'),reducedZ=carriage.position.z;
for(let n=0;n<30;n++)step(1/60);assert.equal(carriage.position.z,reducedZ);reduced=false;
// Small animation updates do not flood onFeedback. Whole-second timer transitions do.
for(const b of records)if(api.feedback(b.index).canReset)api.reset(b.index);
api.apply(24,0);const eventStart=events.length;for(let n=0;n<120;n++)step(1/120);
assert(events.length-eventStart<=2,'Feedback is stage/whole-second based, not every animation frame');
// Repeated reset/reapply releases owned geometry and materials instead of stacking them.
const disposal={geometry:0,material:0,texture:0},watched=new WeakSet();
function watchEffects(index){
  for(const name of api.inspect(index).ownedObjects){
    const object=records[index].root.getObjectByName(name);assert(object);
    object.traverse(o=>{
      for(const [type,resource]of [['geometry',o.geometry],['material',o.material],['texture',o.material?.map]]){
        if(!resource||watched.has(resource))continue;watched.add(resource);resource.addEventListener('dispose',()=>disposal[type]++);
      }
    });
  }
}
for(let pass=0;pass<3;pass++)for(let index=0;index<26;index++){
  if([8,9,11,23].includes(index))continue;
  api.apply(index,1);watchEffects(index);const before=readState(index),eventCount=sections.length;
  assert(api.reset(records[index]).ok);assert(api.reset(index).ok);
  assert.equal(readState(index),before);assert.equal(sections.length,eventCount);
  assert.equal(api.inspect(index).ownedObjects.length,0);assert.equal(records[index].root.children.length,baseline[index].children);
  assert.equal(records[index].userActionState.physicalSheet,false);assert.equal(records[index].userActionState.label,'');
  for(const [object,appearance]of baseline[index].authoredAppearance){
    assert.equal(object.material,appearance.material,'Reset restores authored material, not a leaked highlight clone '+index);
    assert.equal(object.visible,appearance.visible,'Reset restores authored visibility '+index);
  }
  assert.equal(records[index].targetOpen,.37);assert.deepEqual(records[index].collisionBoxes,baseline[index].boxes);
}
assert(disposal.geometry>0&&disposal.material>0&&disposal.texture>0,'Reset disposes owned GPU resources');
// Dispose restores the host state, is idempotent, and cannot publish more updates.
api.apply(0,0);api.apply(24,0);const beforeDispose=events.length;
api.dispose();api.dispose();step(1);
assert.equal(events.length,beforeDispose);assert.equal(api.feedback(0),null);assert.equal(api.inspect(0),null);
for(const fn of ['apply','pause','resume','reset'])assert(!api[fn](0,0).ok);
for(const b of records){
  assert.equal(b.root.children.length,baseline[b.index].children);
  assert.equal(b.userActionState,baseline[b.index].actionState,'Original host action state restored');
  for(const {m,update,value}of baseline[b.index].mechanisms){assert.equal(m.update,update);assert.equal(m.openness,value);}
}
// Privacy reset closes the shutter even when a previously running global roof
// controller left it at a nonzero phase; disposal still restores that host phase.
const shutter=records[12].mechanisms.find(m=>m.kind==='time-limited-privacy-shutter');
shutter.update(.37);
const privacy=context.CourtyardBuildingActions.create({THREE,records:[records[12]],catalog,now:()=>time,onSection(){return true;}});
privacy.apply(12,1);assert(privacy.reset(12).ok);assert.equal(shutter.openness,0);
for(let n=0;n<12;n++){shutter.update(.5,1);privacy.update(1);}assert.equal(shutter.openness,0);
privacy.dispose();assert.equal(shutter.openness,.37);shutter.update(0);
assert(rendered.some(text=>text.includes('不提供医疗评估')));assert(rendered.some(text=>text.includes('未发送请求')));
assert(!rendered.some(text=>/\d:60/.test(text)));
const report={passed:true,buildings:26,repeatedActions:repetitions,pauseResumeKinds:pausable.map(([index])=>catalog[index].title),
  feedbackEvents:events.length,resourceDisposals:disposal,checks:[
    'Immediate observable feedback for 26 × 3 repeated actions','Preserved source cycles and reading position after reset',
    'Pause/resume idempotence and actual physical continuity','Privacy expiry cannot be paused or resumed',
    'Public/login boundaries and external butterfly controls unchanged','Direct and authored timer pause catch-up, no-frame resume and terminal states',
    'Reduced-motion handover stays static','Throttled stage/whole-second feedback','Repeated reset and complete disposal',
    'Original collision boxes, targetOpen, mechanism handlers and host action state restored'],
  evidenceBoundary:'Real production THREE objects and source-backed actions in a GPU-free VM. Host HTML controls, browser live-region behavior and visual layout require separate browser QA.'};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});
fs.writeFileSync(path.join(root,'qa-results/masterplan-actions-check.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS: masterplan action feedback, 234 repeated actions, pause/resume/reset, privacy boundaries, source cycles and disposal.');
