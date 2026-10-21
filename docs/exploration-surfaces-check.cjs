/* node docs/exploration-surfaces-check.cjs
 * Deterministic CPU tests of the production Float32 surface index and clipping.
 * Geography fixtures use the same authored samples/rings/facets as the scene;
 * this is not browser, WebGL, GPU, or rendered-scene integration evidence.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const S = require('../assets/exploration-surfaces.js');
const G = require('../assets/exploration-geography.js');
let passed = 0;
function test(name, fn) { fn(); console.log('PASS ' + name); passed++; }
function near(actual, expected, epsilon = 1e-7) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= epsilon,
    `${actual} should be within ${epsilon} of ${expected}`);
}
const point = (x, y, z, bottom) => ({ x, y, z, ...(bottom === undefined ? {} : { bottom }) });
const flat = y => [point(0, y, 0), point(8, y, 0), point(0, y, 8)];
const solidClip = (feet, height) => tri => S.clip(S.clip(tri,
  p => p.y - feet - .05), p => feet + height - p.bottom - .02);

test('barycentric interpolation preserves affine top and bottom planes in both windings', () => {
  const tri = [point(0, 5, 0, -10), point(4, 13, 0, -14), point(0, 17, 4, -8)];
  for (const face of [tri, [...tri].reverse()]) {
    for (const p of [{ x: 1, z: 1 }, { x: 0, z: 0 }, { x: 2, z: 2 }]) {
      assert.equal(S.inside(p, face), true);
      near(S.bary(p, ...face), 2 * p.x + 3 * p.z + 5);
      near(S.bary(p, ...face, 'bottom'), -p.x + .5 * p.z - 10);
    }
    for (const p of [{ x: -1e-4, z: 1 }, { x: 1, z: -1e-4 }, { x: 2.001, z: 2 }]) {
      assert.equal(S.inside(p, face), false);
    }
  }
  assert.ok(Number.isNaN(S.bary({ x: 1, z: 1 }, ...[point(0, 0, 0), point(1, 1, 1), point(2, 2, 2)])));
});

test('facets own the actual Float32 coordinates rather than source doubles', () => {
  const index = S.create();
  const input = [point(.1, .2, .3, -1.1), point(4.1, 4.2, .3, -2.2), point(.1, 8.2, 4.3, -3.3)];
  const saved = JSON.parse(JSON.stringify(input));
  const face = index.add(input, { islandId: 'rounded', kind: 'sky' });
  assert.deepEqual(input, saved, 'adding does not change caller vertices');
  for (let i = 0; i < 3; i++) for (const key of ['x', 'y', 'z', 'bottom']) {
    assert.equal(face.tri[i][key], Math.fround(saved[i][key]));
  }
  assert.notEqual(face.tri[0].x, input[0].x);
  const p = face.tri.reduce((p, v) => ({ x: p.x + v.x / 3, z: p.z + v.z / 3 }), { x: 0, z: 0 });
  const support = index.at(p.x, p.z);
  near(support.height, face.tri.reduce((n, v) => n + v.y / 3, 0));
  near(support.bottom, face.tri.reduce((n, v) => n + v.bottom / 3, 0));
  assert.equal(support.islandId, 'rounded'); assert.equal(support.kind, 'sky');
  input[0].x = input[0].y = input[0].bottom = 999;
  assert.deepEqual(index.at(p.x, p.z), support, 'caller mutation cannot move indexed geometry');
});

test('zero-area and Float32-collapsed facets do not enter faces or bins', () => {
  const index = S.create();
  for (const tri of [
    [point(0, 1, 0), point(1, 2, 1), point(2, 3, 2)],
    [point(0, 1, 0), point(0, 1, 0), point(0, 1, 0)],
    [point(0, 1, 0), point(1, 1, 0), point(0, 1, 1e-7)],
    [point(2 ** 24, 1, 0), point(2 ** 24 + 1, 1, 0), point(2 ** 24, 1, 4)]
  ]) assert.equal(index.add(tri), null);
  assert.equal(index.faces.length, 0); assert.equal(index.bins.size, 0);
  assert.equal(index.at(0, 0), null); assert.equal(index.intersects(0, 0, 100), false);
  const thin = index.add([point(0, 1, 0), point(1, 1, 0), point(0, 1, 2e-6)]);
  assert.ok(thin, 'small but nondegenerate facet is retained');
  assert.equal(index.at(.25, 5e-7).height, 1);
});

test('support chooses the highest eligible facet, with explicit maxY tolerance and filters', () => {
  const index = S.create();
  index.add(flat(3), { kind: 'land', islandId: 'ground' });
  index.add(flat(8), { kind: 'deck', islandId: 'bridge' });
  index.add(flat(12), { kind: 'sky', islandId: 'cloud' });
  assert.equal(index.at(1, 1).islandId, 'cloud');
  assert.equal(index.at(1, 1, 10).islandId, 'bridge');
  assert.equal(index.at(1, 1, 7.979).islandId, 'ground');
  assert.equal(index.at(1, 1, 7.981).islandId, 'bridge');
  assert.equal(index.at(1, 1, 2.97), null);
  assert.equal(index.at(1, 1, Infinity, f => f.kind === 'land').islandId, 'ground');
  assert.equal(index.at(1, 1, Infinity, () => false), null);
  assert.equal(index.at(7, 7), null, 'a shared broadphase bin is not support');
  assert.equal(index.at(1, 1).bottom, -Infinity, 'land without a bottom remains unbounded below');
  const tie = index.add(flat(12), { islandId: 'later-cloud' });
  assert.ok(tie); assert.equal(index.at(1, 1).islandId, 'cloud', 'equal-height tie is stable');
});

test('positive, negative and exact bin boundaries preserve coverage without duplicate candidates', () => {
  const index = S.create(4);
  const spanning = index.add([point(-8, 2, -8), point(8, 2, -8), point(-8, 2, 8)], { id: 'spanning' });
  for (const [x, z] of [[-8, -8], [-4, -4], [0, -4], [4, -4], [8, -8], [-8, 8]]) {
    assert.ok(index.candidates(x, z).includes(spanning));
    assert.equal(index.at(x, z).height, 2, `support at bin edge ${x},${z}`);
  }
  assert.deepEqual(index.candidates(-100, -100, 100, 100), [spanning]);
  const neighbor = index.add([point(12, 5, 12), point(14, 5, 12), point(12, 5, 14)]);
  assert.equal(index.intersects(11.8, 12.1, .25), true, 'radius reaches a facet in the next bin');
  assert.equal(index.intersects(11.7, 12.1, .25), false);
  assert.ok(index.candidates(11.8 - .25, 12.1 - .25, 11.8 + .25, 12.1 + .25).includes(neighbor));
});

test('altitude clipping interpolates every numeric field and never changes the input', () => {
  const tri = [point(0, 0, 0, -8), point(4, 4, 0, -4), point(0, 4, 4, -4)];
  const saved = JSON.parse(JSON.stringify(tri));
  const clipped = S.clip(tri, p => p.y - 2);
  assert.equal(clipped.length, 4);
  assert.deepEqual(clipped.map(p => [p.x, p.y, p.z, p.bottom]), [
    [2, 2, 0, -6], [4, 4, 0, -4], [0, 4, 4, -4], [0, 2, 2, -6]
  ]);
  assert.deepEqual(tri, saved);
  assert.deepEqual(S.clip(tri, () => -1), []);
  assert.deepEqual(S.clip(tri, () => 1), tri);
  assert.deepEqual(S.clip([], () => 1), []);
  assert.equal(S.disc(clipped, .5, .5, .1), false);
  assert.equal(S.disc(clipped, 1, 1, 0), true);
});

test('exact-altitude point clips use point distance, never phantom polygon containment', () => {
  const tri = [point(0, 1, 0), point(4, 0, 0), point(0, 0, 4)];
  const clipped = S.clip(tri, p => p.y - 1);
  assert.ok(clipped.length >= 3, 'clip retains coincident boundary vertices');
  assert.ok(clipped.every(p => p.x === 0 && p.z === 0));
  assert.equal(S.disc(clipped, 0, 0, 0), true);
  assert.equal(S.disc(clipped, .3, .4, .5), true, 'point tangency is a contact');
  assert.equal(S.disc(clipped, .3, .4, .49), false);
  assert.equal(S.disc(clipped, 20, 20, .1), false, 'zero signed area cannot contain a distant point');
  const index = S.create(); index.add(tri);
  assert.equal(index.intersects(3, 3, .1, undefined, t => S.clip(t, p => p.y - 1)), false);
  assert.equal(index.intersects(0, 0, .1, undefined, t => S.clip(t, p => p.y - 1)), true);
});

test('exact-altitude line clips use bounded segment distance in both windings', () => {
  const tri = [point(0, 1, 0), point(4, 1, 0), point(0, 0, 4)];
  for (const face of [tri, [...tri].reverse()]) {
    const clipped = S.clip(face, p => p.y - 1);
    assert.ok(clipped.length >= 3);
    assert.ok(clipped.every(p => p.z === 0));
    assert.equal(S.disc(clipped, 2, 0, 0), true);
    assert.equal(S.disc(clipped, 2, .3, .3), true);
    assert.equal(S.disc(clipped, 2, .31, .3), false);
    assert.equal(S.disc(clipped, 4.3, 0, .3), true);
    assert.equal(S.disc(clipped, 4.31, 0, .3), false);
    assert.equal(S.disc(clipped, 40, 0, 1), false, 'collinear extensions are not inside the segment');
    assert.equal(S.disc(clipped, 2, 40, 1), false);
  }
});

test('successive opposite half-plane clips remain bounded when they collapse to a line', () => {
  const tri = [point(-2, 5, -2), point(2, 5, -2), point(0, 5, 2)];
  const line = S.clip(S.clip(tri, p => p.x), p => -p.x);
  assert.ok(line.length >= 3 && line.every(p => p.x === 0));
  assert.equal(S.disc(line, 0, 0, 0), true);
  assert.equal(S.disc(line, 0, 8, 1), false);
  const vertex = S.clip(line, p => p.z - 2);
  assert.equal(S.disc(vertex, 0, 2, 0), true);
  assert.equal(S.disc(vertex, 0, 8, 1), false);
});

test('full hull detects an oblique shoreline missed by center and cardinal samples', () => {
  const index = S.create();
  const face = index.add([point(0, 1, 1.2), point(1.2, 1, 0), point(10, 1, 10)], { kind: 'land' });
  for (const [x, z] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    assert.equal(index.at(x, z), null, 'five point samples all report water');
  }
  assert.ok(S.inside({ x: Math.SQRT1_2, z: Math.SQRT1_2 }, face.tri));
  assert.equal(index.intersects(0, 0, 1), true, 'diagonal part of the actual disk touches dry land');
  assert.equal(index.intersects(0, 0, .8), false);
  assert.equal(index.intersects(0, 0, 1, () => false), false);
});

test('dry altitude clipping excludes submerged facets and still catches the full shore hull', () => {
  const index = S.create(1);
  // y = x + z - 1; the dry boundary y=.08 is an oblique line.
  index.add([point(0, -1, 0), point(4, 3, 0), point(0, 3, 4)], { kind: 'land' });
  const dry = tri => S.clip(tri, p => p.y - G.SEA_Y - .08);
  assert.equal(index.intersects(.2, .2, .1, undefined, dry), false);
  assert.equal(index.intersects(0, 0, 1, undefined, dry), true);
  assert.equal(index.intersects(0, 0, .7, undefined, dry), false);
  assert.equal(index.intersects(2, 1, 0, undefined, dry), true);
});

test('solid altitude clip tests both top and bottom, not an infinite column or a top-only slab', () => {
  const index = S.create();
  index.add([point(0, 0, 0, -1), point(10, 10, 0, 9), point(0, 0, 10, -1)], { kind: 'sky' });
  const clip = solidClip(5, 1), filter = f => f.kind === 'sky';
  assert.equal(index.intersects(2, 1, .2, filter, clip), false, 'body lies above the top');
  assert.equal(index.intersects(5.5, 1, .2, filter, clip), true, 'body overlaps the sloping solid');
  assert.equal(index.intersects(8, 1, .2, filter, clip), false, 'body lies below the underside');
  assert.equal(index.intersects(7.2, 1, .3, filter, clip), true, 'a side of the full disk reaches the solid');
  assert.equal(index.intersects(7.4, 1, .3, filter, clip), false);
});

test('intersection filters precede clipping and clipper receives the original facet metadata', () => {
  const index = S.create();
  index.add(flat(3), { kind: 'land', id: 1 });
  const sky = index.add(flat(12).map(p => ({ ...p, bottom: 7 })), { kind: 'sky', id: 2 });
  let calls = 0;
  assert.equal(index.intersects(1, 1, .2, f => f.kind === 'sky', (tri, face) => {
    calls++; assert.equal(face, sky); assert.equal(tri, sky.tri); return tri;
  }), true);
  assert.equal(calls, 1);
  assert.equal(index.intersects(1, 1, .2, () => false, () => { throw Error('filtered face was clipped'); }), false);
});

// A small independent ray-crossing + Euclidean segment-distance oracle. It does
// not call inside(), bary(), cross(), or disc(), and treats zero-area clips only
// as bounded edges. Grid samples avoid tolerance-boundary ambiguity.
function referenceDisc(poly, x, z, r) {
  if (!poly.length) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = dx || dz ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))) : 0;
    if (Math.hypot(x - a.x - t * dx, z - a.z - t * dz) <= r) return true;
    if ((a.z > z) !== (b.z > z) && x < a.x + (z - a.z) * dx / dz) inside = !inside;
  }
  return inside;
}

test('convex clipped polygons agree with an independent disk-distance oracle on a dense grid', () => {
  const tri = [point(-2, -1, -1), point(4, 5, -.2), point(.3, 3, 4)];
  const polys = [tri, S.clip(tri, p => p.y - .4), S.clip(S.clip(tri, p => p.y - .4), p => 3.6 - p.y)];
  for (const poly of polys) for (const winding of [poly, [...poly].reverse()]) {
    for (let ix = 0; ix < 29; ix++) for (let iz = 0; iz < 29; iz++) for (const r of [0, .173, .617]) {
      const x = -3.013 + ix * .277, z = -2.019 + iz * .263;
      assert.equal(S.disc(winding, x, z, r), referenceDisc(winding, x, z, r), `oracle at ${x},${z},r=${r}`);
    }
  }
});

function geographyFacets(isle) {
  const minimumRadius = Math.min(isle.rx, isle.rz);
  const radii = [...new Set([0, .1, .2, .3, .4, .5, .6, .7, .75, .8, .85, .9, .95,
    1 - 14 / minimumRadius, 1 - 8 / minimumRadius, 1 - 5 / minimumRadius, 1])].sort((a, b) => a - b);
  const sectors = 96, rings = radii.length - 1, vertices = [], index = S.create();
  const id = (r, a) => r === 0 ? 0 : 1 + (r - 1) * sectors + (a + sectors) % sectors;
  function vertex(r, a) {
    const p = G.sample(isle, r, a);
    return point(Math.fround(p.x), Math.fround(p.y), Math.fround(p.z),
      isle.kind === 'sky' ? Math.fround(G.skyBottom(isle, p.x, p.z)) : undefined);
  }
  vertices.push(vertex(0, 0));
  for (let r = 1; r <= rings; r++) for (let a = 0; a < sectors; a++) vertices.push(vertex(radii[r], a * Math.PI * 2 / sectors));
  function add(...ids) { assert.ok(index.add(ids.map(i => vertices[i]), { islandId: isle.id, kind: isle.kind })); }
  for (let a = 0; a < sectors; a++) {
    add(0, id(1, a + 1), id(1, a));
    for (let r = 1; r < rings; r++) {
      add(id(r, a), id(r, a + 1), id(r + 1, a));
      add(id(r, a + 1), id(r + 1, a + 1), id(r + 1, a));
    }
  }
  assert.equal(index.faces.length, sectors * (2 * rings - 1));
  return index;
}

test('actual authored sky facets block their deep taper and leave clear space below and above', () => {
  for (const isle of G.islands.filter(i => i.kind === 'sky')) {
    const index = geographyFacets(isle), center = index.at(isle.x, isle.z);
    assert.equal(center.height, Math.fround(isle.y));
    near(center.bottom, Math.fround(isle.y - isle.coast.undersideDepth));
    assert.ok(center.height - center.bottom > 50, `${isle.id} is substantially deeper than the old 26m slab`);
    const blocked = (x, feet, z, radius = .4, height = 2.8) =>
      index.intersects(x, z, radius, f => f.kind === 'sky', solidClip(feet, height));
    assert.equal(blocked(isle.x, center.bottom - 4, isle.z), false, 'space below actual underside remains open');
    assert.equal(blocked(isle.x, center.bottom + 1, isle.z), true, 'lower solid below the old slab is blocked');
    assert.ok(center.bottom + 1 + 2.8 < center.height - 26);
    assert.equal(blocked(isle.x, center.height - 5, isle.z), true);
    assert.equal(blocked(isle.x, center.height, isle.z), false, 'standing on top is not inside the solid');
    assert.equal(blocked(isle.x, center.height + 5, isle.z), false);
    assert.equal(index.at(isle.x, isle.z, center.bottom + 10), null, 'underside is not a walkable landing');
    const face = index.faces.find(f => Math.max(...f.tri.map(p => p.bottom)) - Math.min(...f.tri.map(p => p.bottom)) > 4);
    assert.ok(face, 'actual taper has a sloping underside facet');
    const p = face.tri.reduce((p, v) => ({ x: p.x + v.x / 3, z: p.z + v.z / 3 }), { x: 0, z: 0 });
    const support = index.at(p.x, p.z), bottom = face.tri.reduce((n, v) => n + v.bottom / 3, 0);
    near(support.bottom, bottom, 1e-6);
    near(support.height, face.tri.reduce((n, v) => n + v.y / 3, 0), 1e-6);
    assert.equal(blocked(p.x, bottom - 4, p.z, .01), false);
    assert.equal(blocked(p.x, bottom + .1, p.z, .01), true);
  }
});

test('actual land facets keep submerged shoreline below the dry-support threshold', () => {
  const isle = G.islands.find(i => i.id === 'arrival'), index = geographyFacets(isle);
  const dry = tri => S.clip(tri, p => p.y - G.SEA_Y - .08);
  const center = index.at(isle.x, isle.z);
  assert.equal(center.height, isle.y);
  assert.equal(index.intersects(isle.x, isle.z, 1, undefined, dry), true);
  const shore = G.sample(isle, 1, 0), outer = { x: shore.x + 6, z: shore.z };
  assert.equal(index.at(shore.x, shore.z).height, Math.fround(G.SEA_Y - 2));
  assert.equal(index.intersects(shore.x, shore.z, 0, undefined, dry), false);
  assert.equal(index.intersects(outer.x, outer.z, 3.35, undefined, dry), false);
  assert.equal(index.at(outer.x, outer.z), null);
});

test('browser global and Node exports expose identical surface behavior', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/exploration-surfaces.js'), 'utf8'), context);
  const browser = context.window.CourtyardExplorationSurfaces;
  assert.deepEqual(Object.keys(browser).sort(), Object.keys(S).sort());
  for (const api of [S, browser]) {
    const index = api.create(4); index.add(flat(7), { islandId: 'same' });
    assert.equal(index.at(2, 2).height, 7);
    assert.equal(index.at(2, 2, 6), null);
    assert.equal(index.intersects(-.1, .5, .2), true);
    assert.equal(index.intersects(-.3, .5, .2), false);
  }
});

console.log(`\n${passed} deterministic surface checks passed.`);
