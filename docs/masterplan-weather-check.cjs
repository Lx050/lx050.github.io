// CPU material/lifecycle contract only; browser visual QA remains separate.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const base = path.resolve(__dirname, '..'), THREE = require(path.join(base, 'vendor/three.min.js'));
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(base, 'assets/garden-weather.js'), 'utf8'), context);
const results = [];
function fixture(surfaces) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1.7, .1, 200), player = new THREE.Group();
  camera.position.set(0, 2.7, 6.5); camera.lookAt(0, 1.6, 0); camera.updateMatrixWorld(); scene.add(player);
  // Surface integration must not scan the island, even when material state changes.
  scene.traverse = () => { throw new Error('Weather surfaces may not traverse the scene'); };
  return {scene, weather: context.window.CourtyardWeather.create({THREE, scene, camera, player, surfaces})};
}
function material(color = 0x718379, roughness = .94) {
  const m = new THREE.MeshStandardMaterial({color, roughness, metalness: .02, transparent: true, opacity: .93});
  m.color.convertSRGBToLinear(); return m;
}
function state(m) { return {color: m.color.toArray(), roughness: m.roughness}; }
function close(actual, expected, message) { assert(Math.abs(actual - expected) < 1e-12, message); }
function assertBase(materials, originals, message) {
  materials.forEach((m, i) => assert.deepEqual(state(m), originals[i], message));
}

// One weather state drives exposed paving, ground, roofs/eaves, and planting.
// Sheltered materials remain authored/dry; partial exposure is proportional.
{
  const kinds = ['ground', 'paving', 'roof', 'vegetation', 'wood'];
  const exposed = kinds.map(() => material()), covered = kinds.map(() => material());
  const eave = material(), all = [...exposed, ...covered, eave], original = all.map(state);
  const bindings = [...exposed.map((m, i) => ({material: m, kind: kinds[i], exposure: 1})),
    ...covered.map((m, i) => ({material: m, kind: kinds[i], exposure: 0})), {material: eave, kind: 'roof', exposure: .4}];
  const {weather} = fixture(bindings);
  assert.equal(weather.inspect().surfaceBindings, 11);
  assert.equal(weather.inspect().surfaceState, 'dry');
  assertBase(all, original, 'clear binding preserves original values');
  const unaffected = all.map(m => ({version: m.version, opacity: m.opacity, transparent: m.transparent, metalness: m.metalness, map: m.map}));
  assert(weather.setMode('rain'));
  const wet = all.map(state);
  exposed.forEach((m, i) => {
    assert(m.color.r < original[i].color[0], kinds[i] + ' darkens when wet');
    assert(m.roughness < original[i].roughness, kinds[i] + ' becomes slightly smoother when wet');
    assert(m.roughness >= .45, 'wet surface is not mirror-polished');
  });
  assertBase(covered, original.slice(5, 10), 'shelter interior stays exactly dry');
  close((original[10].color[0] - eave.color.r) / (original[2].color[0] - exposed[2].color.r), .4, 'eave exposure scales rain consistently');
  close((original[10].roughness - eave.roughness) / (original[2].roughness - exposed[2].roughness), .4, 'eave exposure scales roughness consistently');
  const writes = weather.inspect().surfaceWrites;
  weather.setMode('storm');
  assertBase(all, wet, 'rain and storm use the same wet-state baseline');
  assert.equal(weather.inspect().surfaceWrites, writes, 'rain-to-storm does not rewrite identical material uniforms');
  weather.setMode('snow');
  exposed.forEach((m, i) => {
    assert(m.color.r > original[i].color[0], kinds[i] + ' receives restrained snow tint');
    assert(m.roughness >= original[i].roughness && m.roughness <= 1, 'snow stays matte');
    assert(m.color.r < .6, 'snow does not blanket materials white');
  });
  assertBase(covered, original.slice(5, 10), 'shelter interiors do not receive a snow tint');
  close((eave.color.r - original[10].color[0]) / (exposed[2].color.r - original[2].color[0]), .4, 'eave exposure scales snow consistently');
  assert(!weather.setMode('hail'), 'unsupported mode remains rejected');
  for (let i = 0; i < 30; i++) {
    weather.setMode('rain'); assertBase(all, wet, 'wet state never compounds over repeated mode changes');
    weather.setMode('snow'); weather.setMode('clear');
    assertBase(all, original, 'clear always restores exact authored values');
  }
  weather.setMode('rain'); weather.setMode('wind');
  assertBase(all, original, 'wind is dry');
  all.forEach((m, i) => assert.deepEqual({version: m.version, opacity: m.opacity, transparent: m.transparent, metalness: m.metalness, map: m.map}, unaffected[i], 'no shader recompilation, opacity, metalness, or texture changes'));
  results.push({name: 'exposed ground / paving / roof / vegetation / wood, partial eaves, sheltered dry, exact dry restoration', passed: true, bindings: 11});
  weather.dispose();
}

// Material response remains consistent at every quality/motion setting and is
// changed only at state boundaries. Disabling weather restores authored materials.
{
  const m = material(), initial = state(m), {weather} = fixture([{material: m, kind: 'paving'}]);
  weather.setMode('snow'); const snowy = state(m), writes = weather.inspect().surfaceWrites;
  const expectedCounts = [480, 180, 64, 36];
  let i = 0;
  for (const reduced of [false, true]) for (const lightQuality of [false, true]) {
    for (let frame = 0; frame < 45; frame++) weather.update(1 / 60, {reduced, lightQuality});
    assert.deepEqual(state(m), snowy, 'quality/reduced motion retains the same static surface state');
    assert.equal(weather.inspect().particles, expectedCounts[i++], 'existing particle quality caps remain unchanged');
  }
  assert.equal(weather.inspect().surfaceWrites, writes, '180 ordinary frames do not rewrite material state');
  weather.update(0, {enabled: false}); assert.deepEqual(state(m), initial);
  assert.equal(weather.inspect().surfaceState, 'dry'); assert.equal(weather.inspect().particles, 0);
  weather.setMode('rain'); assert.deepEqual(state(m), initial, 'mode change cannot wet disabled weather');
  assert.equal(weather.root.visible, false, 'mode change cannot show disabled particles');
  weather.update(0); assert(m.color.r < initial.color[0], 'reenabling restores the selected wet state');
  weather.update(0, {enabled: false}); weather.setMode('snow'); weather.update(0);
  assert.deepEqual(state(m), snowy, 'reenabling restores the selected snow state');
  results.push({name: 'quality / reduced motion consistency, event-only surface writes, disable / reenable', passed: true, maxParticles: 480, unchangedSurfaceFrames: 180});
  weather.dispose(); assert.deepEqual(state(m), initial);
}

// Additive registration is first-owner-wins. Unbinding only releases that
// registration, never restores another owner's later registration.
{
  const {weather} = fixture(), m = material(), other = material(0x506858), initial = state(m), otherInitial = state(other);
  weather.setMode('rain');
  const unbind = weather.bindSurfaces([{material: m, kind: 'roof'}, {material: m, kind: 'wood'}]);
  assert.equal(weather.inspect().surfaceBindings, 1); assert(m.color.r < initial.color[0]);
  const duplicate = weather.bindSurfaces([{material: m, exposure: 0}, {material: other, kind: 'vegetation'}]);
  assert.equal(weather.inspect().surfaceBindings, 2);
  duplicate(); assert.deepEqual(state(other), otherInitial); assert(m.color.r < initial.color[0]);
  unbind(); assert.deepEqual(state(m), initial); assert.equal(weather.inspect().surfaceBindings, 0);
  const rebind = weather.bindSurfaces([{material: m, kind: 'paving'}]);
  const current = state(m); unbind(); duplicate();
  assert.deepEqual(state(m), current, 'old repeated unbind does not restore newer registration');
  rebind(); assert.deepEqual(state(m), initial);
  const colorOnly = new THREE.MeshBasicMaterial({color: 0x62786b}), colorBefore = colorOnly.color.clone();
  const basicRelease = weather.bindSurfaces([{material: colorOnly}]);
  assert(colorOnly.color.r < colorBefore.r); assert.equal(colorOnly.roughness, undefined);
  basicRelease(); assert(colorOnly.color.equals(colorBefore));
  results.push({name: 'additive binding / deduplication / first ownership / idempotent scoped restoration / color-only material', passed: true});
  weather.dispose();
}

// Registry stays finite and does not own or dispose host material resources.
{
  const {weather, scene} = fixture(), cap = weather.inspect().maxSurfaceBindings;
  const many = Array.from({length: cap + 12}, () => material()), initial = many.map(state);
  let disposedMaterials = 0;
  many.forEach(m => m.addEventListener('dispose', () => disposedMaterials++));
  const unbind = weather.bindSurfaces([null, {}, {material: {}}, ...many.map(m => ({material: m, kind: '__proto__'}))]);
  assert.equal(weather.inspect().surfaceBindings, cap);
  weather.setMode('rain');
  assert(many[cap - 1].color.r < initial[cap - 1].color[0]);
  assert.deepEqual(state(many[cap]), initial[cap], 'overflow is never mutated');
  weather.dispose(); weather.dispose(); unbind();
  assertBase(many, initial, 'dispose restores every bound host material exactly');
  assert.equal(disposedMaterials, 0, 'weather never disposes host-owned materials');
  assert.equal(weather.inspect().surfaceBindings, 0);
  assert.equal(weather.inspect().surfaceState, 'dry');
  assert(!scene.children.includes(weather.root), 'weather root removed');
  assert.equal(weather.sampleShelter(0, 0), null);
  assert.equal(weather.setMode('snow'), false, 'disposed weather cannot change state');
  weather.bindSurfaces([{material: many[0]}])(); weather.update(1 / 60);
  assert.equal(weather.inspect().surfaceBindings, 0); assertBase(many, initial, 'disposed engine remains inert');
  results.push({name: 'bounded registry / invalid entries / no host disposal / exact disposal restoration / inert lifecycle', passed: true, maximumSurfaceBindings: cap});
}

// Exposure values are bounded and unknown kinds fall back to the ground profile.
{
  const a = material(), b = material(), c = material(), d = material(), original = [a, b, c, d].map(state);
  const {weather} = fixture([{material: a, exposure: -2}, {material: b, exposure: 4},
    {material: c, kind: 'unknown', exposure: NaN}, {material: d, kind: 'ground', exposure: 1}]);
  weather.setMode('rain'); assert.deepEqual(state(a), original[0]);
  assert.deepEqual(state(b), state(d)); assert.deepEqual(state(c), state(d));
  weather.dispose(); assertBase([a, b, c, d], original);
  results.push({name: 'exposure clamping / safe defaults', passed: true});
}

console.log(JSON.stringify({passed: true, kind: 'CPU material/lifecycle checks; no pixels rendered', checks: results}, null, 2));
