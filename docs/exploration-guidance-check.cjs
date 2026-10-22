/* Pure destination guidance tests. No DOM, renderer, automatic travel or GPU
 * claims. Host integration and real browser behavior need separate checks. */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const G = require('../assets/exploration-geography.js');
const Guidance = require('../assets/exploration-guidance.js');
const copy = p => ({x:p.x, y:p.y, z:p.z});
const support = p => ({height:p.y, islandId:p.islandId, kind:G.islands.find(i => i.id === p.islandId)?.kind});
function fixture(options = {}) { return Guidance.create({geography:G, ...options}); }
function inspect(guide, p, mode = 'WALK', extra = {}) { return guide.describe({position:copy(p), surface:support(p), mode, yaw:0, ...extra}); }

test('CommonJS and browser globals expose the same pure API', () => {
  assert.equal(globalThis.CourtyardExplorationGuidance, Guidance);
  const context = vm.createContext({window:{}});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/exploration-guidance.js'), 'utf8'), context);
  assert.equal(typeof context.window.CourtyardExplorationGuidance.create, 'function');
  assert.throws(() => Guidance.create({geography:{}}), /geography/);
});

test('selection uses authored identity and does not move, mutate or enter a level', () => {
  const guide = fixture(), position = {...G.spawn}, before = JSON.stringify(position);
  assert.equal(guide.describe({position}), null);
  for (const p of G.places) {
    assert.equal(guide.select(p.index), true);
    assert.equal(guide.selected().id, p.id);
    assert.equal(guide.selected().kind, 'place');
    assert.equal(guide.resolve('WALK').title, p.title);
    assert.equal(guide.resolve('WALK').regionName, G.islands.find(i => i.id === p.islandId).name);
    assert.equal(guide.select(p.id), true);
  }
  const selected = guide.selected(); selected.id = 'edited';
  assert.notEqual(guide.selected().id, 'edited');
  assert.equal(guide.select('missing'), false);
  assert.equal(guide.selected().id, G.places[25].id);
  assert.equal(JSON.stringify(position), before);
  assert.equal(guide.enter, undefined); assert.equal(guide.travel, undefined);
  guide.clear(); assert.equal(guide.selected(), null); assert.equal(guide.resolve(), null);
});

test('host entrance coordinates override building centers without mutating host inputs', () => {
  const p = {...G.places[0], spawn:{x:-930, y:8, z:-550}}, before = JSON.stringify(p);
  const guide = fixture({places:[p]}); guide.select(0);
  assert.deepEqual(copy(guide.resolve()), p.spawn);
  const result = guide.resolve(); result.x = 999;
  assert.deepEqual(copy(guide.resolve()), p.spawn); assert.equal(JSON.stringify(p), before);
});

test('eightfold compass and camera-relative bearings agree in all sectors', () => {
  const guide = fixture(); guide.select(0); const p = G.places[0];
  const compass = ['北','东北','东','东南','南','西南','西','西北'];
  const relative = ['前方','右前方','右侧','右后方','后方','左后方','左侧','左前方'];
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, position = {x:p.x - 20 * Math.sin(a), y:p.y, z:p.z + 20 * Math.cos(a)};
    const state = guide.describe({position, yaw:0, mode:'WALK', surface:support(p)});
    assert.equal(state.bearing, compass[i]); assert.equal(state.relativeLabel, relative[i]);
    assert.equal(guide.describe({position, yaw:-a, mode:'WALK', surface:support(p)}).relativeLabel, '前方');
    assert.equal(guide.describe({position, yaw:-a + Math.PI, mode:'WALK', surface:support(p)}).relativeLabel, '后方');
  }
  const east = {x:p.x-20, y:p.y, z:p.z};
  assert.equal(guide.describe({position:east, yaw:-Math.PI/2 + 8*Math.PI, mode:'WALK', surface:support(p)}).relativeLabel, '前方');
  assert.equal(inspect(guide,p).relativeLabel, '水平已对齐');
});

test('horizontal, signed vertical and 3D distances remain distinct', () => {
  const guide = fixture(); guide.select(0); const p = G.places[0];
  const state = inspect(guide, {...p,x:p.x+3,z:p.z+4,y:p.y-12});
  assert.equal(state.distance, 5); assert.equal(state.horizontalDistance, 5);
  assert.equal(state.verticalDistance, 12); assert.equal(state.distance3D, 13);
  assert.match(state.altitudeCue, /高出你 12 m/);
  assert.match(inspect(guide,{...p,y:p.y+170},'FLY').altitudeCue, /低于你 170 m/);
  assert.equal(Guidance.formatDistance(0), '0 m'); assert.equal(Guidance.formatDistance(.3), '<1 m');
  assert.equal(Guidance.formatDistance(1250), '1.3 km'); assert.equal(Guidance.formatDistance(NaN), '距离待确认');
});

test('building arrival requires correct island, support, horizontal distance and height', () => {
  const guide = fixture(); guide.select(0); const p = G.places[0];
  assert.equal(inspect(guide,p).arrived, true);
  assert.equal(inspect(guide,p,'CAR').arrived, true);
  assert.equal(inspect(guide,{...p,x:p.x+12}).arrived, true);
  assert.equal(inspect(guide,{...p,x:p.x+12.01}).arrived, false);
  assert.equal(inspect(guide,{...p,y:p.y+3.01},'WALK',{surface:{...support(p),height:p.y+3.01}}).arrived, false);
  assert.equal(inspect(guide,p,'WALK',{surface:null}).arrived, false);
  assert.equal(inspect(guide,p,'WALK',{surface:{...support(p),islandId:'arrival'}}).arrived, false);
  assert.equal(inspect(guide,p,'WALK',{surface:{...support(p),height:p.y-2}}).arrived, false);
  assert.equal(inspect(guide,p,'WALK',{surface:{...support(p),kind:'water'}}).arrived, false);
  assert.equal(inspect(guide,{...p,y:p.y+170},'FLY',{surface:support(p)}).arrived, false);
  assert.equal(inspect(guide,p,'FLY').arrived, false);
  assert.match(inspect(guide,p,'FLY').instruction, /F 安全落地/);
  assert.equal(inspect(guide,{...p,y:p.y+170},'WALK',{surface:support(p)}).arrived, false);
});

test('sky-island arrival never accepts horizontal alignment below the platform', () => {
  const guide = fixture(); guide.select(18); const p = G.places[18];
  for (const mode of ['WALK','CAR','BOAT','FLY']) {
    const state = inspect(guide,{...p,y:p.y-170},mode,{surface:null});
    assert.equal(state.arrived,false); assert.equal(state.verticalDistance,170);
    assert.match(state.altitudeCue,/高出你 170 m/);
    assert.match(state.instruction,/高空/);
  }
  assert.equal(inspect(guide,p,'WALK').arrived,true);
  assert.equal(inspect(guide,p,'FLY').arrived,false);
  assert.match(inspect(guide,{...p,y:p.y-170},'FLY',{surface:null}).instruction,/侧面.*勿从底部/);
});

test('every dock resolves the live mode endpoint without changing selected identity', () => {
  const guide = fixture();
  for (const d of G.docks) {
    assert.equal(guide.select(d.id),true); const selection = guide.selected();
    for (const mode of ['WALK','BOAT','CAR','FLY','BOAT','WALK']) {
      const endpoint = mode === 'BOAT' ? d.water : d.land, result = guide.resolve(mode);
      assert.deepEqual(copy(result),copy(endpoint));
      assert.equal(result.endpointKind, mode === 'BOAT' ? 'water' : 'land');
      assert.deepEqual(guide.selected(),selection);
    }
  }
});

test('boat building guidance targets only that destination island dock and never claims building arrival', () => {
  const guide = fixture();
  for (const p of G.places.filter(p => G.islands.find(i => i.id === p.islandId).kind === 'land')) {
    guide.select(p.index); const d = G.docks.find(d => d.islandId === p.islandId), result = guide.resolve('BOAT');
    assert.equal(result.id,p.id); assert.equal(result.title,p.title); assert.equal(result.viaDockId,d.id);
    assert.equal(result.endpointKind,'water'); assert.deepEqual(copy(result),copy(d.water));
    const state = guide.describe({position:{...d.water,y:.55}, mode:'BOAT', surface:null});
    assert.equal(state.atWaypoint,true); assert.equal(state.arrived,false); assert.match(state.instruction,/B 上岸后/);
    assert.deepEqual(copy(guide.resolve('WALK')),copy(p));
    assert.equal(guide.resolve('WALK').viaDockId,null);
  }
});

test('boat dock proximity is not land arrival and rejects wrong surface or height', () => {
  const guide = fixture(), d = G.docks[0]; guide.select(d.id);
  const state = guide.describe({position:{...d.water,y:.55}, mode:'BOAT', surface:null});
  assert.equal(state.arrived,true); assert.equal(state.sameIsland,false); assert.match(state.instruction,/水侧.*B 上岸/);
  assert.equal(guide.describe({position:{...d.water,y:170},mode:'BOAT',surface:null}).arrived,false);
  assert.equal(guide.describe({position:{...d.water,y:.55},mode:'BOAT',surface:{height:.55,islandId:'arrival',kind:'land'}}).arrived,false);
  assert.equal(guide.describe({position:{...d.land,y:.55},mode:'BOAT',surface:null}).arrived,false);
});

test('nearest dock for WALK and CAR stays on actual current land island, never a closer foreign dock', () => {
  const guide = fixture();
  for (const i of G.islands.filter(i => i.kind === 'land')) {
    const own = G.docks.find(d => d.islandId === i.id), foreign = G.docks.find(d => d.islandId !== i.id);
    const position = {...foreign.land,y:i.y};
    for (const mode of ['WALK','CAR']) {
      const nearest = guide.nearestDock({position, mode, surface:{height:i.y,islandId:i.id,kind:'land'}});
      assert.equal(nearest.id,own.id); assert.equal(nearest.endpointKind,'land');
      assert.equal(nearest.islandId,i.id);
    }
  }
});

test('sky, missing, stale and airborne support cannot fabricate a WALK or CAR dock', () => {
  const guide = fixture(), sky = G.places[18], p = G.places[0];
  for (const mode of ['WALK','CAR']) {
    assert.equal(guide.nearestDock({position:sky,mode,surface:support(sky)}),null);
    assert.equal(guide.nearestDock({position:p,mode,surface:null}),null);
    assert.equal(guide.nearestDock({position:p,mode,surface:{height:p.y,islandId:'missing'}}),null);
    assert.equal(guide.nearestDock({position:{...p,y:p.y+170},mode,surface:support(p)}),null);
    assert.equal(guide.nearestDock({position:{...p,y:0},mode,surface:{height:0,islandId:p.islandId}}),null);
  }
});

test('BOAT and FLY nearest dock use mode-suitable endpoints and return detached data', () => {
  const guide = fixture();
  for (const d of G.docks) {
    const boat = guide.nearestDock({position:d.water,mode:'BOAT',surface:null});
    assert.equal(boat.id,d.id); assert.equal(boat.endpointKind,'water'); assert.equal(boat.distance,0);
    const fly = guide.nearestDock({position:{...d.land,y:170},mode:'FLY',surface:null});
    assert.equal(fly.id,d.id); assert.equal(fly.endpointKind,'land');
    boat.land.x = 999; boat.water.z = 999;
    assert.equal(guide.nearestDock({position:d.water,mode:'BOAT'}).water.z,d.water.z);
  }
});

test('mode-suitable guidance never promises automatic routing or boat flight', () => {
  const guide = fixture(); guide.select(0);
  assert.match(inspect(guide,G.spawn,'WALK').instruction,/跨海.*本岛码头/);
  assert.match(inspect(guide,G.spawn,'CAR').instruction,/陆行车不能跨海/);
  assert.match(inspect(guide,G.places[18],'WALK').instruction,/云屿没有码头/);
  assert.match(inspect(guide,{...G.places[0],x:G.places[0].x+40},'CAR').instruction,/V 下车/);
  assert.match(inspect(guide,{...G.places[0],y:2},'FLY',{surface:null}).instruction,/目标仍高于.*从开阔侧面升至/);
  guide.select('dock-western-mainland');
  assert.match(inspect(guide,G.places[0],'CAR').instruction,/不要驾车驶上栈桥/);
  guide.select(18);
  assert.match(inspect(guide,{...G.spawn,y:.55},'BOAT',{surface:null}).instruction,/先.*B 上岸.*F 起飞/);
  for (const mode of ['WALK','CAR','BOAT','FLY']) assert.match(inspect(guide,G.spawn,mode).disclaimer,/不是自动寻路/);
});

test('selection survives unrelated level state and repeated observations', () => {
  const guide = fixture(); guide.select(25); const before = guide.selected();
  for (const level of [{index:0,stage:0},{index:23,stage:4},null]) {
    guide.describe({position:G.spawn,mode:'WALK',surface:support(G.spawn),activeLevel:level});
    assert.deepEqual(guide.selected(),before);
  }
});

test('bad inputs fail closed and malformed endpoints are not selectable', () => {
  const guide = fixture(); guide.select(0);
  for (const position of [null,{}, {x:0,y:NaN,z:0},{x:Infinity,y:0,z:0}]) {
    assert.equal(guide.describe({position}),null); assert.equal(guide.nearestDock({position}),null);
  }
  assert.equal(guide.resolve('teleport'),null);
  assert.equal(guide.describe({position:G.spawn,mode:'teleport'}),null);
  assert.equal(guide.describe({position:G.spawn,yaw:Infinity}),null);
  assert.equal(guide.nearestDock({position:G.spawn,mode:'teleport'}),null);
  const broken = fixture({places:[null,{}, {...G.places[0],spawn:{x:0,y:NaN,z:0}}],docks:[null, {}, {...G.docks[0],water:{x:NaN,y:0,z:0}}]});
  assert.equal(broken.select(0),false); assert.equal(broken.select(G.docks[0].id),false);
});

test('nearest-dock discovery does not silently change a selected destination', () => {
  const guide = fixture(); guide.select(25); const before = guide.selected();
  for (const mode of ['WALK','CAR','BOAT','FLY']) {
    guide.nearestDock({position:G.spawn,mode,surface:support(G.spawn)});
    assert.deepEqual(guide.selected(),before);
  }
});

test('all 26 authored destinations remain finite and cannot arrive while 170 metres above', () => {
  const guide = fixture();
  for (const p of G.places) {
    guide.select(p.index);
    for (const mode of ['WALK','CAR','BOAT','FLY']) {
      const before = guide.selected(), target = guide.resolve(mode);
      const state = guide.describe({position:{x:target.x,y:target.y+170,z:target.z}, mode, yaw:Math.PI*9.7, surface:support(p)});
      assert.equal(state.arrived,false); assert.equal(state.atWaypoint,false);
      for (const key of ['x','y','z','distance','horizontalDistance','verticalDistance','distance3D','relative']) assert(Number.isFinite(state[key]),key);
      assert.deepEqual(guide.selected(),before);
    }
  }
});
