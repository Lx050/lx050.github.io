/* No GPU, DOM, browser, network, or account required. Tests the real spatial tracker. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/exploration-levels.js'), 'utf8');
const catalogContext = {}; catalogContext.window = catalogContext; vm.createContext(catalogContext);
new vm.Script(fs.readFileSync(path.join(root, 'assets/reading-catalog.js'), 'utf8')).runInContext(catalogContext);
const catalog = catalogContext.CourtyardReadingCatalog;
const map = JSON.parse(fs.readFileSync(path.join(root, 'docs/content-map.json'), 'utf8'));
const actionsText = fs.readFileSync(path.join(root, 'assets/building-actions.js'), 'utf8');
const actions = JSON.parse(actionsText.match(/const SPECS = (\[.*?\]);/s)[1]);
const plain = value => JSON.parse(JSON.stringify(value));
function load(storage) {
  const context = {console}; context.window = context;
  if (storage) Object.defineProperty(context, 'localStorage', storage);
  vm.createContext(context); new vm.Script(source, {filename:'exploration-levels.js'}).runInContext(context);
  return context.CourtyardExplorationLevels;
}
const API = load();
function memory(initial) {
  let value = initial ?? null;
  const writes = [];
  return {writes,get value(){return value;},getItem(key){assert.equal(key,API.STORAGE_KEY);return value;},
    setItem(key,next){assert.equal(key,API.STORAGE_KEY);value=next;writes.push(next);}};
}
function atExpected(tracker) { const p = tracker.progress(); assert(p.expected); return tracker.observe(p.expected.position); }
function finish(tracker,index,config) {
  tracker.enter(index,config);
  for (const phase of [0,1,2]) {
    const p = atExpected(tracker); assert.equal(p.canInteract,true);
    const r = tracker.interact(phase); assert.equal(r.ok,true,`valid phase ${index}/${phase}`);
  }
  assert.equal(tracker.progress().stage,3); assert.equal(tracker.progress().runCompleted,false);
  assert.equal(atExpected(tracker).runCompleted,true);
}
assert.equal(API.count,26); assert.equal(API.SPECS.length,26);
assert(Object.isFrozen(API.SPECS)); assert(Object.isFrozen(API.SPECS[0].stages));
assert.equal(new Set(API.SPECS.map(s=>s.id)).size,26,'Original identity stays one-to-one');
const routes = new Set();
for (const spec of API.SPECS) {
  const original = map.items[spec.index], action = actions[spec.index];
  assert.equal(spec.index,API.SPECS.indexOf(spec));
  assert.equal(spec.id,original.destination); assert.equal(spec.sourceUrl,original.destination);
  assert.equal(spec.name,original.name); assert.deepEqual(plain(spec.labels),action.labels);
  assert.deepEqual(plain(spec.sectionGroups),action.sectionGroups);
  assert.equal(spec.stages.length,4); assert.equal(spec.stages[3].station,'entry'); assert.equal(spec.stages[3].phase,null);
  assert.equal(spec.readingUnlocked,true);
  assert.equal(spec.publicEntryOnly,[8,9,11].includes(spec.index));
  assert.equal(new Set(spec.stages.slice(0,3).map(s=>s.station)).size,3,'Visit three distinct places');
  assert.notEqual(spec.stages[2].station,'entry','Completion requires a genuine return journey');
  routes.add(spec.route.join('/'));
  for (let phase=0;phase<3;phase++) {
    assert.equal(spec.stages[phase].phase,phase);
    assert.equal(spec.stages[phase].label,action.labels[phase]);
    assert.deepEqual(plain(spec.stages[phase].sectionIds),action.sectionGroups[phase]);
    for (const id of spec.stages[phase].sectionIds) assert(catalog[spec.index].sections.some(s=>s.id===id),`real source ${spec.index}/${id}`);
  }
  for (const [width,depth] of [[1,1],[12,15],[22,28],[80,100]]) {
    const stations = API.makeStations({width,depth,index:spec.index});
    for (const p of Object.values(stations)) assert(p.z+p.radius < -depth/2,'Every station disk outside front envelope');
    assert(stations.left.x+stations.left.radius < -width/2);
    assert(stations.right.x-stations.right.radius > width/2);
    // Convex interpolation of the three exterior front points remains outside.
    for (const a of Object.values(stations)) for (const b of Object.values(stations))
      for (let t=0;t<=1;t+=.1) assert(a.z+(b.z-a.z)*t+Math.max(a.radius,b.radius)<-depth/2);
  }
}
assert.equal(routes.size,4,'Four route orders, not just relabelled checkboxes');
for (const index of [8,9,11]) {
  const spec=API.SPECS[index]; assert.equal(spec.kind,'public-entry');
  assert.equal(catalog[index].coverage,'entrance-only');
  assert(spec.stages[2].instruction.includes('确认'),'Boundary confirmation is explicit source-backed text, not protected functionality');
}
const storage = memory(), events = [], tracker = API.create({storage,onChange:(p,event)=>events.push({index:p.index,event,stage:p.stage})});
assert.equal(tracker.interact(0).reason,'not-entered'); assert.equal(tracker.observe({x:0,z:0}),null);
for (const bad of [-1,26,1.1,null,NaN,Infinity,'unknown-source']) assert.equal(tracker.enter(bad),null);
for (const index of Array.from({length:26},(_,i)=>i)) {
  const spec=API.SPECS[index]; let p=tracker.enter(index,{width:20,depth:24});
  assert.equal(p.stage,0); assert.equal(p.readingUnlocked,true); assert.equal(p.completed,false);
  assert.equal(tracker.interact(0).reason,'not-at-station','Entering alone never counts');
  tracker.observe({x:100000,y:0,z:100000});
  for (const phase of [0,1,2]) assert.equal(tracker.interact(phase).ok,false,'Remote clicks cannot count');
  assert.equal(tracker.progress().stage,0);
  for (const phase of [0,1,2]) {
    p=tracker.progress(); const point={...p.expected.position};
    tracker.observe({...point,y:point.y+100});
    assert.equal(tracker.interact(phase).reason,'not-at-station','Flying over a station is not arrival');
    const ready=tracker.observe(point); assert.equal(ready.near,true); assert.equal(ready.canInteract,true);
    assert.equal(ready.completed,false); assert.equal(ready.readingUnlocked,true);
    assert.equal(tracker.interact((phase+1)%3).reason,'wrong-phase');
    assert.equal(tracker.interact(''+phase).reason,'wrong-phase','Do not coerce an action');
    assert.equal(tracker.interact(NaN).reason,'wrong-phase');
    assert.equal(tracker.progress().stage,phase,'Wrong order never advances');
    tracker.observe({...point,x:point.x+ready.expected.radius+.001});
    assert.equal(tracker.interact(phase).reason,'not-at-station','Leaving the range cancels readiness');
    tracker.observe(point); tracker.observe({x:NaN,z:0});
    assert.equal(tracker.interact(phase).reason,'not-at-station','Invalid position clears stale arrival');
    tracker.observe(point);
    const result=tracker.interact(phase); assert(result.ok); assert.equal(result.phase,phase);
    assert.deepEqual(plain(result.sectionIds),actions[index].sectionGroups[phase]);
    assert.equal(result.progress.stage,phase+1); assert.equal(result.progress.near,false,'Fresh observation required next');
    assert.equal(tracker.interact(phase).ok,false,'Repeated button cannot advance');
    assert.equal(storage.writes.length,index,'Only completion is persisted, never movement or phase actions');
  }
  p=tracker.progress(); assert.equal(p.status,'returning'); assert.equal(p.completed,false);
  assert.equal(tracker.interact(2).reason,'return-to-entry');
  tracker.observe({x:999,z:999}); assert.equal(tracker.progress().runCompleted,false);
  p=atExpected(tracker); assert.equal(p.status,'complete'); assert.equal(p.stage,4); assert.equal(p.runCompleted,true); assert.equal(p.completed,true);
  tracker.observe({x:999,z:999}); assert.equal(storage.writes.length,index+1,'One write per successful run');
  assert.equal(tracker.interact(0).reason,'already-complete');
  assert.equal(tracker.completedCount(),index+1);
}
assert.equal(tracker.all().length,26); assert(tracker.all().every(p=>p.completed&&p.readingUnlocked));
const saved=JSON.parse(storage.value);
assert.deepEqual(Object.keys(saved).sort(),['completed','version']);
assert.equal(Object.keys(saved.completed).length,26);
assert.deepEqual(Object.keys(saved.completed).sort(),map.items.map(item=>item.destination).sort());
assert(Object.values(saved.completed).every(value=>value===true),'No stage, location, text, credentials, or private content persists');
assert(events.some(e=>e.event==='arrive')); assert(events.some(e=>e.event==='depart')); assert.equal(events.filter(e=>e.event==='complete').length,26);
// Exit, resume, switching levels, and replay are distinct from completion/reset.
const session=API.create({storage:null}); session.enter(0); atExpected(session); session.interact(0);
assert.equal(session.exit().active,false); assert.equal(session.progress(),null); assert.equal(session.progress(0).stage,1);
assert.equal(session.interact(1).reason,'not-entered');
assert.equal(session.enter(API.SPECS[0].id).stage,1); assert.equal(session.interact(1).reason,'not-at-station');
atExpected(session); session.interact(1); session.enter(1); assert.equal(session.progress(0).active,false); assert.equal(session.progress(0).stage,2);
session.enter(0); assert.equal(session.progress().stage,2); atExpected(session); session.interact(2); atExpected(session);
const replay=session.enter(0); assert.equal(replay.stage,0); assert.equal(replay.completed,true); assert.equal(replay.runCompleted,false); assert.equal(replay.replay,true);
assert.equal(session.reset().stage,0); assert.equal(session.progress().completed,false); assert.equal(session.progress().readingUnlocked,true);
// Reload restores completion only; an unfinished route restarts at zero.
const partialStore=memory(), partial=API.create({storage:partialStore}); partial.enter(2);atExpected(partial);partial.interact(0);
assert.equal(partialStore.value,null); assert.equal(API.create({storage:partialStore}).enter(2).stage,0);
const reloaded=API.create({storage}); assert.equal(reloaded.completedCount(),26); assert.equal(reloaded.enter(25).stage,0); assert.equal(reloaded.progress().completed,true);
reloaded.reset(25); assert.equal(reloaded.completedCount(),25); assert.equal(API.create({storage}).progress(25).completed,false);
assert.equal(API.create({storage}).progress(24).completed,true,'Reset leaves other original identities untouched');
// Corrupt, version-mismatched, untrusted, disabled, and quota-exhausted storage.
for (const raw of ['{', 'null', '[]', 'true', '{"version":9,"completed":{}}', '{"version":1,"completed":[]}',
  JSON.stringify({version:1,completed:{'https://not-an-original.example':true,[API.SPECS[0].id]:'yes',[API.SPECS[1].id]:1}})]) {
  const s=memory(raw), t=API.create({storage:s}); assert.equal(t.completedCount(),0); finish(t,0); assert.equal(t.completedCount(),1);
}
const hostile=JSON.stringify({version:1,completed:{[API.SPECS[0].id]:true,0:true,evil:true}});
assert.equal(API.create({storage:memory(hostile)}).completedCount(),1,'Only exact source identities and boolean true are read');
const blocked={getItem(){throw Error('SecurityError');},setItem(){throw Error('QuotaExceededError');}};
const resilient=API.create({storage:blocked}); finish(resilient,0); assert.equal(resilient.completedCount(),1); resilient.reset(); assert.equal(resilient.completedCount(),0);
const getterDenied=load({get(){throw Error('SecurityError');}}).create(); finish(getterDenied,0);
// Host station overrides are copied, checked for overlap, and use 3D proximity.
const custom={entry:{x:0,y:3,z:-50,radius:1},left:{x:-20,y:3,z:-50,radius:1},right:{x:20,y:3,z:-50,radius:1}};
const adjusted=API.create({storage:null}); adjusted.enter(0,{stations:custom}); custom.entry.x=999;
assert.equal(adjusted.progress().stations.entry.x,0,'Host mutation cannot silently move a checkpoint');
adjusted.observe({x:0,y:0,z:-50}); assert.equal(adjusted.interact(0).ok,false);
adjusted.observe({x:0,y:3,z:-50}); assert.equal(adjusted.interact(0).ok,true);
const overlapping={entry:{x:0,z:0},left:{x:0,z:0},right:{x:0,z:0}};
adjusted.enter(1,{width:20,depth:24,stations:overlapping});
assert.deepEqual(plain(adjusted.progress().stations),plain(API.makeStations({width:20,depth:24,index:1})),'Overlapping overrides revert to safe separated stations');
const detached=adjusted.progress();detached.stations.entry.x=777;assert.notEqual(adjusted.progress().stations.entry.x,777,'Snapshots do not mutate state');
// Semantic events do not flood the host at animation frame frequency.
let count=0;const quiet=API.create({storage:null,onChange(){count++;}});quiet.enter(0);const origin=quiet.progress().expected.position;
quiet.observe(origin);const before=count;for(let n=0;n<1000;n++)quiet.observe(origin);assert.equal(count,before);
quiet.dispose();assert.equal(quiet.observe(origin),null);assert.equal(quiet.enter(0),null);assert.equal(quiet.interact(0).reason,'disposed');
console.log(JSON.stringify({ok:true,levels:26,sourceIdentities:26,phaseActions:78,spatialCheckpoints:104,routeOrders:routes.size,
  checks:['source sections and original URLs','outside-footprint stations','remote and aerial rejection','ordered in-range actions','physical return','exit and revisit','reset and replay','completion-only storage','corrupt and blocked storage','public-entry-only boundaries','independent reading','station overrides','quiet frame updates']},null,2));
