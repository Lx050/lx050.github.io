/* node docs/exploration-transport-check.cjs
 * No renderer, browser, network, timers, randomness or Three.js are involved.
 */
'use strict';
const assert = require('node:assert/strict');
const { create, BODY, MAX_DT, MAX_STEP } = require('../assets/exploration-transport.js');
let passed = 0;
const EPSILON = 1e-5;
function test(name, fn) { fn(); console.log('PASS ' + name); passed++; }
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) <= tolerance, `${a} should be within ${tolerance} of ${b}`);
function fixture(overrides = {}) {
  const position = { x: 0, y: 3, z: 0 }, notices = [], transitions = [], obstacles = [];
  const surface = (x, z, maxY) => {
    if (Math.abs(x) > 100 || z < -100 || z > 100) return null;
    const s = { height: 3, islandId: 'main', kind: 'land' };
    return Number.isFinite(maxY) && s.height > maxY ? null : s;
  };
  const options = {
    position, spawn: { x: 0, z: 0 }, seaLevel: 0,
    getSurface: surface,
    isWater: (x, z, r = 0) => x - r > 100 || x + r < -100 || z - r > 100 || z + r < -100,
    withinBounds: (x, z) => Math.abs(x) <= 300 && Math.abs(z) <= 300,
    blocked: (x, y, z, r, h) => obstacles.some(b => x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1 && y + h > b.y0 && y < b.y1),
    docks: [{ id: 'east', land: { x: 95, z: 0 }, water: { x: 108, z: 0 } }],
    onNotice: (message, code) => notices.push({ message, code }), onMode: mode => transitions.push(mode),
    ...overrides
  };
  const motor = create(options);
  return { motor, position: options.position, options, obstacles, notices, transitions };
}
function drive(f, seconds, input) { for (let t = 0; t < seconds - 1e-9; t += 1 / 60) f.motor.move(1 / 60, input); }
function place(f, x, y, z) { Object.assign(f.position, { x, y, z }); }
function unchanged(f, before, mode) { assert.deepEqual(f.position, before); assert.equal(f.motor.snapshot().mode, mode); }

test('valid grounded initialization and explicit safe recovery', () => {
  const f = fixture({ position: { x: 200, y: 40, z: 0 } });
  assert.deepEqual(f.position, { x: 0, y: 3, z: 0 });
  f.motor.setMode('FLY'); drive(f, 1, { x: 1, up: 1 });
  assert.equal(f.motor.recover(), true);
  assert.deepEqual(f.position, { x: 0, y: 3, z: 0 });
  assert.equal(f.motor.snapshot().mode, 'WALK'); assert.equal(f.motor.snapshot().speed, 0);
  assert.throws(() => fixture({ spawn: { x: 200, z: 0 } }), /Spawn/);
});

test('WALK stays owned by host and cannot spawn cars in midair', () => {
  const f = fixture(), origin = { ...f.position };
  drive(f, 2, { x: 1, z: 1, up: 1, sprint: true }); unchanged(f, origin, 'WALK');
  place(f, 0, 12, 0); const high = { ...f.position };
  assert.equal(f.motor.setMode('CAR'), false); unchanged(f, high, 'WALK');
  assert.equal(f.motor.setMode('FLY'), false); unchanged(f, high, 'WALK');
  assert.equal(f.motor.setMode('teleport'), false); unchanged(f, high, 'WALK');
});

test('CAR performs high-speed swept shoreline stop with its complete footprint dry', () => {
  const f = fixture(); assert.equal(f.motor.setMode('CAR'), true);
  drive(f, 8, { z: 1, sprint: true });
  assert.equal(f.motor.snapshot().mode, 'CAR');
  assert.ok(f.position.z <= 100 - BODY.CAR.radius + 1e-6, 'car does not cross or hang over coast');
  assert.ok(f.position.z > 95, 'car did move to shore'); near(f.position.y, 3);
  assert.equal(f.motor.setMode('WALK'), true);
});

test('CAR cannot tunnel thin buildings even with maximum sprint and a long frame', () => {
  const f = fixture(); f.obstacles.push({ x0: -10, x1: 10, z0: 70, z1: 70.05, y0: 0, y1: 20 });
  f.motor.setMode('CAR'); drive(f, 2.4, { z: 1, sprint: true });
  f.motor.move(2000, { z: 1, sprint: true }); drive(f, 2, { z: 1, sprint: true });
  assert.ok(f.position.z < 70 - BODY.CAR.radius + 1e-6); assert.ok(f.position.z > 65);
  assert.equal(f.motor.snapshot().speed, 0);
});

test('CAR refuses narrow or steep terrain and gradual steep shore', () => {
  const f = fixture({ getSurface: (x, z) => Math.abs(x) <= 100 && Math.abs(z) <= 100 ? { height: 3 + Math.max(0, z - 20) * 1.1, islandId: 'main', kind: 'land' } : null });
  f.motor.setMode('CAR'); drive(f, 4, { z: 1, sprint: true });
  assert.ok(f.position.z < 21, 'car cannot climb steep grade');
  f.motor.recover(); place(f, 0, 36, 50); const origin = { ...f.position };
  assert.equal(f.motor.setMode('CAR'), false); unchanged(f, origin, 'WALK');
  const narrow = fixture({ getSurface: (x, z) => Math.abs(x) < .75 ? { height: 3, kind: 'land' } : null });
  assert.equal(narrow.motor.setMode('CAR'), false);
});

test('car inertia, steering and coast differ from boat movement', () => {
  const car = fixture(); car.motor.setMode('CAR'); drive(car, .5, { z: 1 });
  const carSpeed = car.motor.snapshot().speed; assert.ok(carSpeed > 2 && carSpeed < 20);
  const headingBefore = car.motor.snapshot().heading; car.motor.move(.1, { x: 1 });
  assert.ok(car.motor.snapshot().heading > headingBefore && car.motor.snapshot().heading < Math.PI / 2);
  const boat = fixture(); place(boat, 95, 3, 0); assert.equal(boat.motor.boardBoat('east'), true);
  drive(boat, .5, { z: 1 }); assert.ok(boat.motor.snapshot().speed < carSpeed * .5);
  const speedBefore = boat.motor.snapshot().speed; boat.motor.move(.1, {}); assert.ok(boat.motor.snapshot().speed > 0 && boat.motor.snapshot().speed < speedBefore + 2);
  const oldVelocity = { ...boat.motor.snapshot().velocity }; boat.motor.move(.1, { x: 1 });
  assert.ok(boat.motor.snapshot().velocity.z > 0 && Math.abs(boat.motor.snapshot().velocity.x) < oldVelocity.z);
});

test('boat board is dock-specific and atomic, never from air or an ocean walker', () => {
  const f = fixture(); const origin = { ...f.position };
  assert.equal(f.motor.boardBoat(), false); unchanged(f, origin, 'WALK');
  place(f, 95, 3, 0); const dock = { ...f.position };
  assert.equal(f.motor.boardBoat('missing'), false); unchanged(f, dock, 'WALK');
  f.motor.setMode('FLY'); const high = { ...f.position };
  assert.equal(f.motor.boardBoat('east'), false); unchanged(f, high, 'FLY');
  f.motor.recover(); place(f, 108, .55, 0); const ocean = { ...f.position };
  assert.equal(f.motor.setMode('WALK'), false); unchanged(f, ocean, 'WALK');
  assert.equal(f.motor.boardBoat('east'), false); unchanged(f, ocean, 'WALK');
});

test('paired dock board / exit validate clearance and never exit onto open ocean', () => {
  const f = fixture(); place(f, 95, 3, 0);
  assert.equal(f.motor.boardBoat('east'), true); assert.deepEqual(f.position, { x: 108, y: .55, z: 0 });
  assert.equal(f.motor.snapshot().dockId, 'east');
  const boat = { ...f.position }; assert.equal(f.motor.setMode('CAR'), false); unchanged(f, boat, 'BOAT');
  assert.equal(f.motor.setMode('FLY'), false); unchanged(f, boat, 'BOAT');
  drive(f, 4, { z: 1, sprint: true }); const far = { ...f.position };
  assert.equal(f.motor.disembark(), false); unchanged(f, far, 'BOAT');
  assert.equal(f.motor.setMode('WALK'), false); unchanged(f, far, 'BOAT');
  place(f, 108, .55, 0); f.obstacles.push({ x0: 94, x1: 96, z0: -1, z1: 1, y0: 2, y1: 10 });
  const nearDock = { ...f.position }; assert.equal(f.motor.disembark(), false); unchanged(f, nearDock, 'BOAT');
  f.obstacles.length = 0;
  assert.equal(f.motor.disembark('east'), true); assert.deepEqual(f.position, { x: 95, y: 3, z: 0 });
  assert.equal(f.motor.snapshot().mode, 'WALK'); assert.equal(f.motor.snapshot().speed, 0);
});

test('boarding checks the path, including obstacles between player and dock or dock and water', () => {
  const f = fixture(); place(f, 85, 3, 0);
  f.obstacles.push({ x0: 90, x1: 90.05, z0: -2, z1: 2, y0: 0, y1: 20 });
  const before = { ...f.position }; assert.equal(f.motor.boardBoat(), false); unchanged(f, before, 'WALK');
  f.obstacles.length = 0; place(f, 95, 3, 0);
  f.obstacles.push({ x0: 103, x1: 103.05, z0: -2, z1: 2, y0: 0, y1: 20 });
  const dock = { ...f.position }; assert.equal(f.motor.boardBoat(), false); unchanged(f, dock, 'WALK');
});

test('BOAT swept movement cannot enter land, a thin obstacle or world boundary', () => {
  const f = fixture(); place(f, 95, 3, 0); f.motor.boardBoat(); drive(f, 5, { x: -1, sprint: true });
  assert.ok(f.position.x > 100 + BODY.BOAT.radius); near(f.position.y, .55);
  f.motor.recover(); place(f, 95, 3, 0); f.motor.boardBoat();
  f.obstacles.push({ x0: 100, x1: 120, z0: 40, z1: 40.05, y0: 0, y1: 20 });
  drive(f, 6, { z: 1, sprint: true }); assert.ok(f.position.z < 40 - BODY.BOAT.radius);
  f.obstacles.length = 0; drive(f, 20, { z: 1, sprint: true });
  assert.ok(f.position.z <= 300 - BODY.BOAT.radius + EPSILON);
});

test('flight validates takeoff ceilings and local landing without ocean teleport', () => {
  const f = fixture(); f.obstacles.push({ x0: -2, x1: 2, z0: -2, z1: 2, y0: 5, y1: 5.1 });
  const original = { ...f.position }; assert.equal(f.motor.setMode('FLY'), false); unchanged(f, original, 'WALK');
  f.obstacles.length = 0; assert.equal(f.motor.setMode('FLY'), true); near(f.position.y, 5.2);
  drive(f, 2, { up: 1 }); assert.ok(f.position.y > 60);
  assert.equal(f.motor.land(), true); near(f.position.y, 3); assert.equal(f.motor.snapshot().mode, 'WALK');
  f.motor.setMode('FLY'); place(f, 150, 80, 0); const ocean = { ...f.position };
  assert.equal(f.motor.land(), false); unchanged(f, ocean, 'FLY');
  assert.equal(f.motor.setMode('CAR'), false); unchanged(f, ocean, 'FLY');
});

test('flight can land safely on a supported moderate slope', () => {
  const f = fixture({ getSurface: (x, z) => ({ height: 3 + .3 * x, kind: 'land', islandId: 'slope' }) });
  assert.equal(f.motor.setMode('FLY'), true); drive(f, 1, { up: 1 });
  assert.equal(f.motor.land(), true); assert.equal(f.motor.snapshot().mode, 'WALK');
  assert.ok(f.position.y >= 3 && f.position.y < 3.3);
  assert.equal(f.motor.setMode('CAR'), true);
  assert.equal(f.motor.setMode('WALK'), true);
  assert.ok(f.position.y >= 3 && f.position.y < 3.3);
});

test('flight sweep blocks high-speed horizontal and vertical building tunnelling', () => {
  const f = fixture(); f.motor.setMode('FLY');
  f.obstacles.push({ x0: -20, x1: 20, z0: 65, z1: 65.01, y0: 0, y1: 200 });
  drive(f, 3, { z: 1, sprint: true }); assert.ok(f.position.z < 65 - BODY.FLY.radius);
  f.motor.recover(); f.obstacles.length = 0; f.motor.setMode('FLY');
  f.obstacles.push({ x0: -20, x1: 20, z0: -20, z1: 20, y0: 60, y1: 60.01 });
  drive(f, 3, { up: 1, sprint: true }); assert.ok(f.position.y + BODY.FLY.height <= 60 + EPSILON);
  const high = { ...f.position }; f.obstacles.push({ x0: -20, x1: 20, z0: -20, z1: 20, y0: 20, y1: 20.01 });
  assert.equal(f.motor.land(), false); unchanged(f, high, 'FLY');
});

test('flight does not tunnel terrain and respects sea floor, ceiling and world edge', () => {
  const f = fixture({ getSurface: (x, z) => Math.abs(x) < 100 && Math.abs(z) < 100 ? { height: z > 25 ? 80 : 3, islandId: 'main', kind: 'land' } : null });
  f.motor.setMode('FLY'); drive(f, 3, { z: 1, sprint: true }); assert.ok(f.position.z <= 25 - BODY.FLY.radius + EPSILON);
  place(f, 150, 5, 0); drive(f, 2, { up: -1, sprint: true }); near(f.position.y, 2);
  drive(f, 8, { up: 1, sprint: true }); near(f.position.y, 420);
  drive(f, 8, { x: 1, sprint: true }); assert.ok(f.position.x <= 300 - BODY.FLY.radius + EPSILON);
});

test('sky slabs permit flight below, block ascent through and allow landing on top', () => {
  const f = fixture({ getSurface: (x, z, maxY) => {
    let s = Math.abs(x) < 100 && Math.abs(z) < 100 ? { height: 3, islandId: 'main', kind: 'land' } : null;
    if (x > 130 && x < 190 && Math.abs(z) < 30) s = { height: 150, thickness: 26, islandId: 'sky', kind: 'sky' };
    return s && (!Number.isFinite(maxY) || s.height <= maxY) ? s : null;
  } });
  f.motor.setMode('FLY'); place(f, 150, 90, 0); f.motor.move(.01, {}); assert.equal(f.motor.snapshot().mode, 'FLY');
  drive(f, 2, { up: 1, sprint: true }); assert.ok(f.position.y + BODY.FLY.height <= 124 + EPSILON);
  place(f, 150, 200, 0); assert.equal(f.motor.land(), true); near(f.position.y, 150); assert.equal(f.motor.snapshot().mode, 'WALK');
});

test('long dt clamps, invalid input stays finite, and repeated transitions reset velocity', () => {
  const a = fixture(), b = fixture(); a.motor.setMode('FLY'); b.motor.setMode('FLY');
  a.motor.move(999999, { x: 1, z: 1, up: 1, sprint: true }); b.motor.move(MAX_DT, { x: 1, z: 1, up: 1, sprint: true });
  assert.deepEqual(a.motor.snapshot(), b.motor.snapshot());
  const before = { ...a.position };
  for (const dt of [NaN, Infinity, -1, 0, undefined]) a.motor.move(dt, { x: 1 }); assert.deepEqual(a.position, before);
  drive(a, .5, { x: NaN, z: Infinity, up: -Infinity }); assert.ok(Object.values(a.position).every(Number.isFinite));
  for (let i = 0; i < 20; i++) {
    a.motor.recover(); assert.equal(a.motor.setMode('CAR'), true); drive(a, .1, { z: 1 });
    assert.equal(a.motor.setMode('FLY'), true); assert.equal(a.motor.snapshot().speed, 0);
    assert.equal(a.motor.land(), true); assert.equal(a.motor.snapshot().speed, 0);
    assert.equal(a.motor.setMode('CAR'), true); assert.equal(a.motor.snapshot().speed, 0);
  }
  a.position.x = NaN; a.motor.move(.1, { x: 1 }); assert.deepEqual(a.position, { x: 0, y: 3, z: 0 }); assert.equal(a.motor.snapshot().mode, 'WALK');
  assert.ok(MAX_STEP <= .25);
});

test('rendered vehicle extents are contained in the default collision envelopes', () => {
  assert.ok(BODY.CAR.radius >= Math.hypot(2.8 / 2, 4.2 / 2)); assert.ok(BODY.CAR.height >= 1.8);
  assert.ok(BODY.BOAT.radius >= Math.hypot(3 / 2, 5.1 / 2)); assert.ok(BODY.BOAT.height >= 5.2);
  assert.ok(BODY.FLY.radius >= Math.hypot(8.6 / 2, 2.4 / 2)); assert.ok(BODY.FLY.height >= 2.7);
  const car = fixture(); car.obstacles.push({ x0: 2.4, x1: 2.5, z0: 20, z1: 20.1, y0: 0, y1: 10 });
  car.motor.setMode('CAR'); drive(car, 3, { z: 1, sprint: true }); assert.ok(car.position.z < 20 - BODY.CAR.radius);
  const lowRoof = fixture(); lowRoof.obstacles.push({ x0: -4, x1: 4, z0: -4, z1: 4, y0: 4.95, y1: 5.05 });
  assert.equal(lowRoof.motor.setMode('CAR'), false, 'car roof needs more clearance than a walker');
  const boat = fixture(); place(boat, 95, 3, 0); assert.equal(boat.motor.boardBoat(), true);
  boat.obstacles.push({ x0: 103, x1: 113, z0: 25, z1: 25.1, y0: 4.6, y1: 4.7 });
  drive(boat, 5, { z: 1, sprint: true }); assert.ok(boat.position.z < 25 - BODY.BOAT.radius, 'mast cannot cross low bridge');
  const fly = fixture(); fly.motor.setMode('FLY'); fly.obstacles.push({ x0: 4.2, x1: 4.3, z0: 20, z1: 20.1, y0: 4, y1: 20 });
  drive(fly, 3, { z: 1, sprint: true }); assert.ok(fly.position.z < 20 - BODY.FLY.radius, 'wing tip cannot cut a wall');
  const flyRoof = fixture(); flyRoof.obstacles.push({ x0: -5, x1: 5, z0: -5, z1: 5, y0: 7.5, y1: 7.6 });
  assert.equal(flyRoof.motor.setMode('FLY'), false, 'full glider height is checked before unfolding');
});

test('dock water endpoints accommodate the full boat footprint or reject boarding atomically', () => {
  const f = fixture({ docks: [{ id: 'too-shallow', land: { x: 95, z: 0 }, water: { x: 102.8, z: 0 } }] });
  place(f, 95, 3, 0); const before = { ...f.position };
  assert.equal(f.motor.boardBoat('too-shallow'), false); unchanged(f, before, 'WALK');
  const broad = fixture(); place(broad, 95, 3, 0);
  assert.equal(broad.motor.boardBoat('east'), true); assert.equal(broad.motor.disembark('east'), true);
});

test('wide car can dismount and board from a gently sloped dock without hovering', () => {
  const f = fixture({ getSurface: (x, z) => Math.abs(x) <= 100 && Math.abs(z) <= 100 ? { height: 20 - .1 * x, islandId: 'main', kind: 'land' } : null });
  place(f, 95, 10.5, 0); assert.equal(f.motor.setMode('CAR'), true);
  assert.equal(f.motor.boardBoat('east'), true); assert.equal(f.motor.snapshot().mode, 'BOAT');
  assert.equal(f.motor.disembark('east'), true); assert.equal(f.motor.snapshot().mode, 'WALK');
  assert.ok(f.position.y >= 10.5 && f.position.y < 10.55);
});

test('stop clears all inertia without moving, changing modes, heading, dock or firing transitions', () => {
  for (const mode of ['WALK', 'CAR', 'FLY', 'BOAT']) {
    const f = fixture();
    if (mode === 'BOAT') { place(f, 95, 3, 0); assert.equal(f.motor.boardBoat(), true); }
    else assert.equal(f.motor.setMode(mode), true);
    drive(f, .6, { z: 1, up: mode === 'FLY' ? .5 : 0 });
    const before = f.motor.snapshot(), notifications = f.transitions.length;
    const stopped = f.motor.stop();
    assert.deepEqual(stopped.position, before.position); assert.equal(stopped.mode, before.mode);
    assert.equal(stopped.heading, before.heading); assert.equal(stopped.dockId, before.dockId);
    assert.deepEqual(stopped.velocity, { x: 0, y: 0, z: 0 }); assert.equal(stopped.speed, 0);
    assert.equal(f.transitions.length, notifications);
    f.motor.move(.1, {}); assert.deepEqual(f.motor.snapshot().position, before.position, 'no residual coast after resume');
    assert.deepEqual(f.motor.stop(), f.motor.stop(), 'stop is idempotent');
  }
});

test('identical input sequence is exactly deterministic and snapshots cannot mutate motor', () => {
  const a = fixture(), b = fixture();
  for (const f of [a, b]) { f.motor.setMode('FLY'); for (let i = 0; i < 200; i++) f.motor.move(.016, { x: Math.sin(i * .03), z: Math.cos(i * .03), up: i < 50 ? .5 : 0 }); }
  assert.deepEqual(a.motor.snapshot(), b.motor.snapshot());
  const snapshot = a.motor.snapshot(); snapshot.position.x = 999; snapshot.velocity.y = 999;
  assert.deepEqual(a.motor.snapshot(), b.motor.snapshot());
});
console.log(`\n${passed} deterministic transport checks passed.`);
