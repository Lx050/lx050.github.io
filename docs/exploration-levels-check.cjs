/* No GPU, DOM, browser, network, or account required. Real tracker with an
 * explicit synthetic action host. Production action/motor tests are separate. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'assets/exploration-levels.js'),'utf8');
const catalogContext={};catalogContext.window=catalogContext;vm.createContext(catalogContext);
new vm.Script(fs.readFileSync(path.join(root,'assets/reading-catalog.js'),'utf8')).runInContext(catalogContext);
const catalog=catalogContext.CourtyardReadingCatalog,map=JSON.parse(fs.readFileSync(path.join(root,'docs/content-map.json'),'utf8'));
const actions=JSON.parse(fs.readFileSync(path.join(root,'assets/building-actions.js'),'utf8').match(/const SPECS = (\[.*?\]);/s)[1]);
const plain=value=>JSON.parse(JSON.stringify(value));
function load(storage,code=source){const c={console};c.window=c;if(storage)Object.defineProperty(c,'localStorage',storage);vm.createContext(c);new vm.Script(code,{filename:'exploration-levels.js'}).runInContext(c);return c.CourtyardExplorationLevels;}
const API=load();
// Baseline authored source-spec digest. This protects every source instruction,
// title, URL and section without requiring Git in a release ZIP.
const authored=API.SPECS.map(spec=>Object.fromEntries(Object.entries(spec).filter(([key])=>!['objectiveFamily','objectiveLabel','exemplar'].includes(key))));
assert.equal(crypto.createHash('sha256').update(JSON.stringify(authored)).digest('hex'),'84bba5166d448093adb004b71d9f5f8d1783f0db6c3c08277322012ecd5c6956','all baseline source spec fields remain unchanged');
function memory(initial){let value=initial??null;const writes=[];return{writes,get value(){return value;},getItem(key){assert.equal(key,API.STORAGE_KEY);return value;},setItem(key,next){assert.equal(key,API.STORAGE_KEY);value=next;writes.push(next);}};}
const hostStates=new WeakMap();
function hostState(t){if(!hostStates.has(t))hostStates.set(t,new Map());const all=hostStates.get(t);return all.get(t.progress().index)||null;}
function observe(t,position,extra={}){return t.observe(position,{dt:1/60,facing:position?{x:-position.x,z:-position.z}:null,actionState:hostState(t),...extra});}
function apply(t,phase){const r=t.interact(phase);if(!r.ok)return r;const p=t.progress();assert.equal(r.phase,phase);assert.deepEqual(plain(r.sectionIds),actions[p.index].sectionGroups[phase]);const s=hostState(t)||{index:p.index,kind:API.SPECS[p.index].kind,phase:-1,counts:[0,0,0],playing:false,paused:false};const wasPlaying=s.playing;s.phase=phase;s.counts[phase]++;
 if(s.kind==='process'){s.playing=phase===1?!wasPlaying:phase===2;s.paused=phase===1&&wasPlaying;}
 else if(s.kind==='quiet-timer'){s.playing=phase===0||phase===1&&!wasPlaying;s.paused=phase===1&&wasPlaying;}
 else{s.playing=false;s.paused=false;}
 hostStates.get(t).set(p.index,s);observe(t,p.expected.position,{dt:0});return r;}
function atExpected(t,extra={}){const p=t.progress();assert(p.expected);return observe(t,p.expected.position,extra);}
function finishPhase(t){const stage=t.progress().stage;let loops=0;while(t.progress().stage===stage&&loops++<180){const p=atExpected(t);if(p.canInteract)assert(apply(t,p.phase).ok);}assert(loops<180,'bounded goal completes');}
function finish(t,index,config){t.enter(index,config);for(let phase=0;phase<3;phase++){assert.equal(t.progress().stage,phase);finishPhase(t);}assert.equal(t.progress().stage,3);assert.equal(t.progress().runCompleted,false);assert.equal(atExpected(t).runCompleted,true);}
assert.equal(API.count,26);assert.equal(API.SPECS.length,26);assert(Object.isFrozen(API.SPECS));assert(Object.isFrozen(API.SPECS[0].stages));assert(Object.isFrozen(API.OBJECTIVES));
assert.equal(new Set(API.SPECS.map(s=>s.id)).size,26);assert.equal(API.SPECS.filter(s=>s.exemplar).length,8);
const routes=new Set(),families=new Set();
for(const spec of API.SPECS){const item=map.items[spec.index],action=actions[spec.index];
 assert.equal(spec.index,API.SPECS.indexOf(spec));assert.equal(spec.id,item.destination);assert.equal(spec.sourceUrl,item.destination);assert.equal(spec.name,item.name);assert.deepEqual(plain(spec.labels),action.labels);assert.deepEqual(plain(spec.sectionGroups),action.sectionGroups);
 assert.equal(spec.stages.length,4);assert.equal(spec.stages[3].station,'entry');assert.equal(spec.stages[3].phase,null);assert.equal(spec.readingUnlocked,true);assert.equal(spec.publicEntryOnly,[8,9,11].includes(spec.index));
 assert.equal(new Set(spec.stages.slice(0,3).map(s=>s.station)).size,3);assert.notEqual(spec.stages[2].station,'entry');routes.add(spec.route.join('/'));families.add(spec.objectiveFamily);
 for(let phase=0;phase<3;phase++){assert.equal(spec.stages[phase].phase,phase);assert.equal(spec.stages[phase].label,action.labels[phase]);assert.deepEqual(plain(spec.stages[phase].sectionIds),action.sectionGroups[phase]);for(const id of spec.stages[phase].sectionIds)assert(catalog[spec.index].sections.some(s=>s.id===id));}
 for(const[width,depth]of[[1,1],[12,15],[22,28],[80,100]]){const stations=API.makeStations({width,depth,index:spec.index});assert.equal(stations.entry.z,-depth/2-5.5);assert.equal(stations.left.z,-depth/2-6.5-(spec.index%3)*1.15);assert.equal(stations.right.z,-depth/2-6.5-((spec.index+1)%3)*1.15);for(const p of Object.values(stations))assert(p.z+p.radius<-depth/2);assert(stations.left.x+stations.left.radius<-width/2);assert(stations.right.x-stations.right.radius>width/2);for(const a of Object.values(stations))for(const b of Object.values(stations))for(let t=0;t<=1;t+=.1)assert(a.z+(b.z-a.z)*t+Math.max(a.radius,b.radius)<-depth/2);}
}
assert.equal(routes.size,4);assert(families.size>=6);
for(const index of[8,9,11]){const s=API.SPECS[index];assert.equal(s.kind,'public-entry');assert.equal(catalog[index].coverage,'entrance-only');assert(s.stages[2].instruction.includes('确认'));assert(!s.exemplar);}
const storage=memory(),events=[],tracker=API.create({storage,onChange:(p,event)=>events.push({index:p.index,event,stage:p.stage})});
assert.equal(tracker.interact(0).reason,'not-entered');assert.equal(tracker.observe({x:0,z:0}),null);
for(const bad of[-1,26,1.1,null,NaN,Infinity,'unknown-source'])assert.equal(tracker.enter(bad),null);
for(let index=0;index<26;index++){let p=tracker.enter(index,{width:20,depth:24});assert.equal(p.stage,0);assert.equal(p.readingUnlocked,true);assert.equal(p.completed,false);assert.equal(tracker.interact(0).reason,'not-at-station');
 observe(tracker,{x:1e5,y:0,z:1e5});for(const phase of[0,1,2])assert.equal(tracker.interact(phase).ok,false);assert.equal(tracker.progress().stage,0);
 for(const phase of[0,1,2]){p=tracker.progress();const point={...p.expected.position};observe(tracker,{...point,y:point.y+100});assert.equal(tracker.interact(phase).reason,'not-at-station');
  const ready=observe(tracker,point);assert.equal(ready.near,true);assert.equal(ready.canInteract,true);assert.equal(ready.completed,false);assert.equal(ready.readingUnlocked,true);assert.equal(ready.expected.sourceInstruction,API.SPECS[index].stages[phase].instruction);assert(ready.expected.instruction.includes('任务指引：'));
  assert.equal(tracker.interact((phase+1)%3).reason,'wrong-phase');assert.equal(tracker.interact(''+phase).reason,'wrong-phase');assert.equal(tracker.interact(NaN).reason,'wrong-phase');assert.equal(tracker.progress().stage,phase);
  observe(tracker,{...point,x:point.x+ready.expected.radius+.001});assert.equal(tracker.interact(phase).reason,'not-at-station');observe(tracker,point);observe(tracker,{x:NaN,z:0});assert.equal(tracker.interact(phase).reason,'not-at-station');
  finishPhase(tracker);assert.equal(tracker.progress().stage,phase+1);assert.equal(tracker.progress().near,false);assert.equal(tracker.interact(phase).ok,false);assert.equal(storage.writes.length,index);
 }
 p=tracker.progress();assert.equal(p.status,'returning');assert.equal(p.completed,false);assert.equal(tracker.interact(2).reason,'return-to-entry');observe(tracker,{x:999,z:999});assert.equal(tracker.progress().runCompleted,false);
 p=atExpected(tracker);assert.equal(p.status,'complete');assert.equal(p.stage,4);assert.equal(p.runCompleted,true);assert.equal(p.completed,true);observe(tracker,{x:999,z:999});assert.equal(storage.writes.length,index+1);assert.equal(tracker.interact(0).reason,'already-complete');assert.equal(tracker.completedCount(),index+1);
}
assert.equal(tracker.all().length,26);assert(tracker.all().every(p=>p.completed&&p.readingUnlocked));const saved=JSON.parse(storage.value);assert.deepEqual(Object.keys(saved).sort(),['completed','version']);assert.equal(Object.keys(saved.completed).length,26);assert.deepEqual(Object.keys(saved.completed).sort(),map.items.map(i=>i.destination).sort());assert(Object.values(saved.completed).every(v=>v===true));assert(events.some(e=>e.event==='arrive'));assert(events.some(e=>e.event==='depart'));assert.equal(events.filter(e=>e.event==='complete').length,26);
// Exit/resume, level switches, replay, reset, and original URL identity persistence.
const session=API.create({storage:null});session.enter(0);finishPhase(session);assert.equal(session.exit().active,false);assert.equal(session.progress(),null);assert.equal(session.progress(0).stage,1);assert.equal(session.interact(1).reason,'not-entered');assert.equal(session.enter(API.SPECS[0].id).stage,1);assert.equal(session.interact(1).reason,'not-at-station');finishPhase(session);session.enter(1);assert.equal(session.progress(0).active,false);assert.equal(session.progress(0).stage,2);session.enter(0);finishPhase(session);atExpected(session);
const replay=session.enter(0);assert.equal(replay.stage,0);assert.equal(replay.completed,true);assert.equal(replay.runCompleted,false);assert.equal(replay.replay,true);assert.equal(replay.objective.presses,0);assert.equal(session.reset().stage,0);assert.equal(session.progress().completed,false);assert.equal(session.progress().readingUnlocked,true);
const partialStore=memory(),partial=API.create({storage:partialStore});partial.enter(2);finishPhase(partial);assert.equal(partialStore.value,null);assert.equal(API.create({storage:partialStore}).enter(2).stage,0);
const reloaded=API.create({storage});assert.equal(reloaded.completedCount(),26);assert.equal(reloaded.enter(25).stage,0);assert.equal(reloaded.progress().completed,true);reloaded.reset(25);assert.equal(reloaded.completedCount(),25);assert.equal(API.create({storage}).progress(25).completed,false);assert.equal(API.create({storage}).progress(24).completed,true);
for(const raw of['{','null','[]','true','{"version":9,"completed":{}}','{"version":1,"completed":[]}',JSON.stringify({version:1,completed:{'https://not-an-original.example':true,[API.SPECS[0].id]:'yes',[API.SPECS[1].id]:1}})]){const s=memory(raw),t=API.create({storage:s});assert.equal(t.completedCount(),0);finish(t,0);assert.equal(t.completedCount(),1);}
assert.equal(API.create({storage:memory(JSON.stringify({version:1,completed:{[API.SPECS[0].id]:true,0:true,evil:true}}))}).completedCount(),1);
const blocked={getItem(){throw Error('SecurityError');},setItem(){throw Error('QuotaExceededError');}};const resilient=API.create({storage:blocked});finish(resilient,0);assert.equal(resilient.completedCount(),1);resilient.reset();assert.equal(resilient.completedCount(),0);finish(load({get(){throw Error('SecurityError');}}).create(),0);
// Host overrides retain copied 3D proximity and non-overlap defenses.
const custom={entry:{x:0,y:3,z:-50,radius:1},left:{x:-20,y:3,z:-50,radius:1},right:{x:20,y:3,z:-50,radius:1}},adjusted=API.create({storage:null});adjusted.enter(0,{stations:custom});custom.entry.x=999;assert.equal(adjusted.progress().stations.entry.x,0);observe(adjusted,{x:0,y:0,z:-50});assert.equal(adjusted.interact(0).ok,false);observe(adjusted,{x:0,y:3,z:-50});assert.equal(apply(adjusted,0).ok,true);
adjusted.enter(1,{width:20,depth:24,stations:{entry:{x:0,z:0},left:{x:0,z:0},right:{x:0,z:0}}});assert.deepEqual(plain(adjusted.progress().stations),plain(API.makeStations({width:20,depth:24,index:1})));const detached=adjusted.progress();detached.stations.entry.x=777;assert.notEqual(adjusted.progress().stations.entry.x,777);
// No context or merely clicking cannot fabricate a source effect.
const missing=API.create({storage:null});missing.enter(0);let pt=missing.progress().expected.position;for(const context of[undefined,null,false,3,'invalid']){missing.observe(pt,context);assert.equal(missing.interact(0).reason,'action-state-unavailable');}atExpected(missing);assert(missing.interact(0).ok);assert.equal(missing.interact(0).reason,'action-not-observed');for(let i=0;i<120;i++)atExpected(missing);assert.equal(missing.progress().stage,0);observe(missing,pt,{actionState:{index:25,kind:'maker',phase:0,counts:[1,0,0]}});assert.equal(missing.progress().stage,0);observe(missing,pt,{actionState:{index:0,kind:'ink',phase:0,counts:[1,0,0]}});assert.equal(missing.progress().stage,1);
// Two presses really are required, with a confirmed existing state between them.
for(const[index,phase]of[[0,1],[1,2],[6,1],[10,0]]){const t=API.create({storage:null});t.enter(index);while(t.progress().stage<phase)finishPhase(t);atExpected(t);assert(apply(t,phase).ok);assert.equal(t.progress().stage,phase);assert.equal(t.progress().objective.presses,1);assert(apply(t,phase).ok);assert.equal(t.progress().stage,phase+1);}
// Facing is current, tolerant, local, and not inferred from arrival or reduced motion.
for(const reducedMotion of[false,true]){const t=API.create({storage:null});t.enter(23);pt=t.progress().expected.position;observe(t,pt,{facing:{x:pt.x,z:pt.z},reducedMotion});assert.equal(t.interact(0).reason,'not-facing-building');observe(t,pt,{facing:{x:0,z:0},reducedMotion});assert.equal(t.interact(0).reason,'not-facing-building');atExpected(t,{reducedMotion});assert(apply(t,0).ok);assert.equal(t.progress().stage,1);}
// One-second foreground sample; no movement/exit/reload or omitted dt shortcut.
const still=API.create({storage:null});still.enter(24);atExpected(still);assert(apply(still,0).ok);assert.equal(still.progress().objective.waiting,true);pt=still.progress().expected.position;for(let i=0;i<100;i++)observe(still,pt,{dt:undefined});assert.equal(still.progress().objective.seconds,0);for(let i=0;i<5;i++)observe(still,pt,{dt:.1});assert(still.progress().objective.seconds>.4);observe(still,{...pt,x:pt.x+.4},{dt:.1});assert.equal(still.progress().objective.seconds,0);observe(still,pt,{dt:1000});assert.equal(still.progress().stage,0);assert(still.progress().objective.seconds<=.1);still.exit();still.enter(24);assert.equal(still.progress().objective.seconds,0);atExpected(still);assert(apply(still,0).ok);for(let i=0;i<15;i++)atExpected(still,{dt:.1,reducedMotion:true});assert.equal(still.progress().stage,1);
// Existing start/pause/resume controls, not three unverified clicks or long playback.
const playback=API.create({storage:null});playback.enter(3);finishPhase(playback);atExpected(playback);assert(apply(playback,1).ok);assert.equal(playback.interact(1).reason,'observation-incomplete');for(let i=0;i<65;i++)atExpected(playback);assert.equal(playback.progress().objective.waiting,false);assert(apply(playback,1).ok);assert.equal(hostState(playback).paused,true);assert.equal(playback.progress().stage,1);assert(apply(playback,1).ok);assert.equal(hostState(playback).playing,true);assert.equal(playback.progress().stage,2);
// Overlay comparison keeps the same layer active while visiting two safe viewpoints.
const views=API.create({storage:null});views.enter(22);finishPhase(views);atExpected(views);assert(apply(views,1).ok);assert.equal(views.progress().expected.station,'left');assert.equal(views.progress().objective.viewIndex,0);pt=views.progress().expected.position;observe(views,pt,{facing:{x:pt.x,z:pt.z}});assert.equal(views.progress().stage,1);assert.equal(views.progress().objective.viewIndex,0);atExpected(views);assert.equal(views.progress().expected.station,'right');assert.equal(views.progress().objective.viewIndex,1);assert.equal(views.interact(1).ok,false);atExpected(views);assert.equal(views.progress().stage,2);assert.equal(hostState(views).counts[1],1,'moving between viewpoints never re-runs the effect');
// Interrupted observation resumes at the same source phase, not a stale timer/view.
for(const index of[3,22,24]){
 const t=API.create({storage:null}),phase=index===24?0:1;t.enter(index);while(t.progress().stage<phase)finishPhase(t);
 atExpected(t);assert(apply(t,phase).ok);assert(t.progress().objective.waiting||t.progress().objective.viewIndex===0);
 t.exit();const a=hostStateForIndex(t,index);a.phase=2;a.counts[2]++;a.playing=index===3;a.paused=false;
 t.enter(index);assert.equal(t.progress().stage,phase);assert.equal(t.progress().objective.presses,0);assert.equal(t.progress().objective.waiting,false);assert.equal(t.progress().objective.viewIndex,-1);
 finishPhase(t);assert.equal(t.progress().stage,phase+1,'interrupted real source phase remains completable');
}
function hostStateForIndex(t,index){return hostStates.get(t).get(index);}
const changed=API.create({storage:null});changed.enter(24);atExpected(changed);assert(apply(changed,0).ok);hostState(changed).playing=false;atExpected(changed);assert.equal(changed.progress().objective.waiting,false);assert.equal(changed.progress().canInteract,true,'stopped active sample can be restarted');finishPhase(changed);assert.equal(changed.progress().stage,1);
// Actionable feedback distinguishes navigation, facing, hold, viewpoints and phase mistakes.
const feedback=API.create({storage:null});feedback.enter(23);
assert.equal(feedback.progress().feedback.code,'not-at-station');assert.match(feedback.progress().feedback.text,/观察站/);
pt=feedback.progress().expected.position;observe(feedback,{...pt,x:pt.x+10});assert(feedback.progress().distanceRemaining>0);assert.match(feedback.progress().feedback.text,/米/);
observe(feedback,pt,{facing:{x:pt.x,z:pt.z}});assert.equal(feedback.progress().feedback.code,'not-facing-building');assert.match(feedback.interact(0).feedback.text,/转向/);
assert.equal(feedback.interact(1).feedback.code,'wrong-phase');assert.match(feedback.interact(1).feedback.text,/展翼/);
atExpected(feedback);assert.equal(feedback.progress().feedback.code,'ready');
for(const reducedMotion of[false,true]){
 // Retry clears only an unfinished objective, not an authored source operation,
 // completed stage, completion record, player position, or active run identity.
 for(const index of[0,1,3,6,10,22,23,24]){
  const store=memory(),t=API.create({storage:store}),phase=index===1?2:[0,3,6,22].includes(index)?1:0;
  t.enter(index);while(t.progress().stage<phase)finishPhase(t);atExpected(t,{reducedMotion});
  if(index!==23)assert(apply(t,phase).ok);
  if(index===3||index===24){
   for(let n=0;n<4;n++)atExpected(t,{dt:.1,reducedMotion});
   const p=t.progress();assert.equal(p.feedback.code,'hold-observation');assert(p.objective.remainingSeconds>0&&p.objective.remainingSeconds<1);
   assert.equal(t.interact(phase).feedback.code,'hold-observation');
  }
  if(index===22){
   assert.equal(t.progress().objective.requiredViews,2);assert.equal(t.progress().objective.completedViews,0);
   atExpected(t,{reducedMotion});assert.equal(t.progress().objective.completedViews,1);
   pt=t.progress().expected.position;observe(t,pt,{facing:{x:0,z:0},reducedMotion});assert.match(t.progress().feedback.text,/双视点 2 \/ 2/);
  }
  const before=t.progress(),sourceBefore=plain(hostState(t)),writes=store.writes.length;
  const positionBefore=before.expected.position;
  const retried=t.retry(index);
  for(const key of['stage','completedSteps','completedActions','ratio','completed','runCompleted','replay','active'])assert.equal(retried[key],before[key],key+' retained by retry');
  assert.equal(retried.canRetry,true);assert.equal(retried.readingUnlocked,true);assert.equal(retried.feedback.code,'retry');assert.match(retried.retryHint,/仅重新开始/);
  assert.equal(retried.objective.presses,0);assert.equal(retried.objective.waiting,false);assert.equal(retried.objective.viewIndex,-1);assert.equal(retried.objective.seconds,0);
  assert.equal(retried.objective.pendingAction,false);assert.deepEqual(plain(hostState(t)),sourceBefore,'retry never touches authored state');assert.equal(store.writes.length,writes);
  // The position stays at the second viewpoint even though the target resets.
  const expectedDistance=index===22?Math.hypot(positionBefore.x-retried.expected.position.x,positionBefore.y-retried.expected.position.y,positionBefore.z-retried.expected.position.z):before.distance;
  assert.equal(retried.distance,expectedDistance,'retry does not teleport or erase observed position');
  finishPhase(t);assert.equal(t.progress().stage,phase+1);while(t.progress().stage<3)finishPhase(t);
  const returning=plain(t.progress());assert.equal(returning.canRetry,false);assert.equal(returning.feedback.code,'return-to-entry');assert.deepEqual(plain(t.retry(index)),returning,'return checkpoint is not restarted');
  atExpected(t);const completedSnapshot=plain(t.progress());assert.equal(completedSnapshot.canRetry,false);assert.deepEqual(plain(t.retry()),completedSnapshot,'completed run and persistent completion remain intact');
  const completeWrites=store.writes.length;t.enter(index);assert.equal(t.retry().completed,true,'prior completion retained during a replay');assert.equal(store.writes.length,completeWrites);t.exit();
  const inactive=plain(t.progress(index));assert.equal(inactive.canRetry,false);assert.deepEqual(plain(t.retry(index)),inactive,'retry never enters an inactive level');assert.equal(t.retry(99),null);
 }
 // A changed source while active restarts only the unfinished observation.
 for(const index of[3,22,24]){
  const t=API.create({storage:null}),phase=index===24?0:1;t.enter(index);while(t.progress().stage<phase)finishPhase(t);atExpected(t);assert(apply(t,phase).ok);
  const a=hostState(t);a.phase=2;a.counts[2]++;a.playing=index===3;a.paused=false;
  const changed=atExpected(t,{reducedMotion});assert.equal(changed.stage,phase);assert.equal(changed.feedback.code,'phase-changed');assert.match(changed.feedback.text,/已完成阶段保留/);
  assert.equal(changed.objective.waiting,false);assert.equal(changed.objective.viewIndex,-1);assert.equal(changed.objective.presses,0);finishPhase(t);assert.equal(t.progress().stage,phase+1);
 }
 // External pause/resume on the same phase cannot strand the next toggle.
 for(const presses of[1,2]){
  const t=API.create({storage:null});t.enter(3);finishPhase(t);atExpected(t);apply(t,1);for(let n=0;n<12;n++)atExpected(t,{dt:.1,reducedMotion});
  if(presses===2)assert(apply(t,1).ok);
  const a=hostState(t);a.playing=presses===2;a.paused=presses===1;
  const changed=atExpected(t,{reducedMotion});assert.equal(changed.stage,1);assert.equal(changed.feedback.code,'action-state-changed');assert.equal(changed.objective.pendingAction,false);assert.equal(changed.objective.waiting,false);
  finishPhase(t);assert.equal(t.progress().stage,2);
 }
 // Exit, actual phase-2 action and re-entry, with both accessibility settings.
 for(const index of[3,22,24]){
  const t=API.create({storage:null}),phase=index===24?0:1;t.enter(index);while(t.progress().stage<phase)finishPhase(t);atExpected(t);apply(t,phase);t.exit();
  const a=hostStateForIndex(t,index);a.phase=2;a.counts[2]++;a.playing=index===3;a.paused=false;
  t.enter(index);atExpected(t,{reducedMotion});assert.equal(t.progress().stage,phase);assert.equal(t.progress().objective.waiting,false);finishPhase(t);assert.equal(t.progress().stage,phase+1);
 }
}
// A missing acknowledgement is retryable, but a late source count never counts
// as a new objective. A conflicting actual action clears pending safely.
const pending=API.create({storage:null});pending.enter(0);atExpected(pending);assert(pending.interact(0).ok);assert.equal(pending.progress().feedback.code,'action-not-observed');
assert.equal(pending.retry().objective.pendingAction,false);observe(pending,pending.progress().expected.position,{actionState:{index:0,kind:'ink',phase:0,counts:[1,0,0]}});assert.equal(pending.progress().stage,0);
assert(pending.interact(0).ok);observe(pending,pending.progress().expected.position,{actionState:{index:0,kind:'ink',phase:2,counts:[1,0,1]}});assert.equal(pending.progress().stage,0);assert.equal(pending.progress().objective.pendingAction,false);assert.equal(pending.progress().feedback.code,'phase-changed');
// Completed playback needs its authored Replay control, not an invented reset.
const ended=API.create({storage:null});ended.enter(3);finishPhase(ended);atExpected(ended);apply(ended,1);const endedAction=hostState(ended);endedAction.playing=false;endedAction.completed=true;
atExpected(ended);assert.equal(ended.progress().feedback.code,'playback-ended');assert.match(ended.progress().feedback.text,/重放/);assert.equal(ended.progress().objective.waiting,false);assert.equal(ended.progress().stage,1);
endedAction.completed=false;endedAction.playing=false;endedAction.paused=false;assert(ended.interact(1).ok);endedAction.counts[1]++;endedAction.completed=true;atExpected(ended);assert.equal(ended.progress().objective.pendingAction,false);assert.equal(ended.progress().feedback.code,'playback-ended');
// Semantic events stay quiet during stable foreground frames and after dispose.
let count=0;const quiet=API.create({storage:null,onChange(){count++;}});quiet.enter(0);const origin=quiet.progress().expected.position;observe(quiet,origin);const before=count;for(let n=0;n<1000;n++)observe(quiet,origin);assert.equal(count,before);quiet.dispose();assert.equal(quiet.observe(origin),null);assert.equal(quiet.enter(0),null);assert.equal(quiet.retry(0),null);assert.equal(quiet.interact(0).reason,'disposed');assert.equal(quiet.interact(0).feedback.code,'disposed');
console.log(JSON.stringify({ok:true,levels:26,sourceIdentities:26,sourceSpecsUnchanged:true,exemplars:8,families:families.size,routeOrders:routes.size,
 checks:['all authored spec fields unchanged','safe station geometry unchanged','remote and aerial rejection','actual action acknowledgement','repeat control comparisons','start/pause/resume','foreground stationary sample','two safe comparison viewpoints','current local facing','reduced motion parity','physical return','exit and revisit','interrupted effect reconciliation','actionable refusal feedback','retry preserves checkpoints and source state','active phase and playback recovery','normal/reduced retry parity','reset and replay','completion-only storage','corrupt and blocked storage','public-entry boundaries','independent reading','quiet frame updates']},null,2));
