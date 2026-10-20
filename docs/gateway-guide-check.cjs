/* CURRENT production regression for building 10's painted east return.
 *
 * Builds the actual modules twice, with the real reading rest attached:
 *   - exact pre-fix main d09bdecd0ccb15ad0877c49c48704cd0f6a257d0
 *   - current working-tree production assets
 *
 * The production pathLine helper and beam generator execute unchanged. A temporary
 * wrapper observes their returned matrices, then finds those exact Float32 matrices
 * in the rendered InstancedMesh. Route clearance uses the actual mesh triangles
 * and, independently, segment/expanded-collider clipping. No metadata route is
 * accepted as proof. Mutations run only in isolated in-memory assemblies.
 *
 * Run: node docs/gateway-guide-check.cjs
 * CPU geometry/text-operation evidence only; not a browser/GPU/navigation test.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');
const crypto = require('crypto');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const T = require(path.join(root, 'vendor/three.min.js'));
const baseline = 'd09bdecd0ccb15ad0877c49c48704cd0f6a257d0';
const output = path.join(root, 'qa-results/gateway-guide');
const expectedEast = [[0, -6.9], [2.1, -6.9], [2.1, -4.7], [3.55, -4.7], [3.55, 6.8], [0, 6.8]];
const expectedOldEast = [[0, -6.7], [3.55, -6.7], [3.55, 6.8], [0, 6.8]];
const expectedWest = [[0, -6.7], [-3.55, -6.7], [-3.55, 6.8], [0, 6.8]];
const modules = ['dossier-detail', 'vault-detail', 'rss-detail', 'architecture', 'content-core',
  'gateway-detail', 'reme-detail', 'mindcare-detail', 'content-services', 'reading-catalog', 'reading-panels'];
const json = value => JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(json(value)).digest('hex');
const same = (a, b, message) => assert.equal(json(a), json(b), message);
const plain = value => JSON.parse(json(value));
const near = (a, b, message, tolerance = 2e-6) =>
  assert(Math.abs(a - b) < tolerance, `${message}: ${a} != ${b}`);

function source(file, old) {
  return old ? cp.execFileSync('git', ['-C', root, 'show', `${baseline}:${file}`],
    {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024}) : fs.readFileSync(path.join(root, file), 'utf8');
}

function canvasDocument() {
  return {createElement(tag) {
    assert.equal(tag, 'canvas');
    const canvas = {width: 0, height: 0, operations: []};
    const record = (name, args) => canvas.operations.push([name, ...args]);
    const context = new Proxy({
      measureText(text) { return {width: String(text).length * 10}; },
      createLinearGradient(...args) {
        record('createLinearGradient', args);
        return {addColorStop(...stops) { record('addColorStop', stops); }};
      }
    }, {
      get(object, key) {
        if (key in object) return object[key];
        return (...args) => record(key, args);
      },
      set(object, key, value) {
        record('set', [key, value]); object[key] = value; return true;
      }
    });
    canvas.getContext = () => context;
    return canvas;
  }};
}

function load(old, mutation) {
  const context = {console, document: canvasDocument()};
  context.window = context;
  vm.createContext(context);
  for (const module of modules) {
    const file = `assets/${module}.js`;
    vm.runInContext(source(file, old), context, {filename: file});
  }
  const paths = [];
  const originalPathLine = context.CourtyardContent.pathLine;
  context.CourtyardContent.pathLine = function (builder, points, material, width) {
    // Mutate only the points of this exact east guide call, then run the real
    // production helper and builder. Never modify the filesystem or its geometry.
    if (mutation && points.some(point => point[0] > 0) && points.every(point => point[0] >= 0))
      points = mutation(plain(points));
    const capture = {points: plain(points), material, width, beams: []};
    paths.push(capture);
    const beam = builder.beam;
    builder.beam = function (...args) {
      const matrix = beam.apply(this, args);
      capture.beams.push({arguments: plain(args), matrix: matrix.toArray()});
      return matrix;
    };
    try { return originalPathLine(builder, points, material, width); }
    finally { builder.beam = beam; }
  };
  const building = context.CourtyardArchitecture.build({THREE: T, index: 10, title: 'API', zone: 0});
  const reading = context.CourtyardReadingPanels.attach({
    THREE: T, building, index: 10, preview: context.CourtyardReadingCatalog[10]
  });
  assert(reading && reading.panels.length, 'actual production reading rest attaches');
  assert.equal(paths.length, 2, 'exactly the two real painted return paths');
  const west = paths.find(p => p.points.some(point => point[0] < 0));
  const east = paths.find(p => p.points.some(point => point[0] > 0));
  assert(west && east);
  return {context, building, reading, west, east};
}

function meshes(building) {
  building.root.updateMatrixWorld(true);
  const result = [];
  function visit(object, address) {
    if (object.isMesh) result.push({object, address});
    object.children.forEach((child, index) => visit(child, `${address}/${index}:${child.name}`));
  }
  visit(building.root, building.root.name);
  return result;
}

function instances(building) {
  const result = [];
  for (const {object, address} of meshes(building)) {
    for (let index = 0; index < (object.isInstancedMesh ? object.count : 1); index++) {
      const local = new T.Matrix4();
      if (object.isInstancedMesh) object.getMatrixAt(index, local);
      result.push({object, address, index, local,
        world: object.matrixWorld.clone().multiply(local)});
    }
  }
  return result;
}

function identifyGuide(model, guide) {
  const actual = instances(model.building);
  guide.instances = guide.beams.map(beam => {
    const expected = beam.matrix.map(Math.fround);
    const matches = actual.filter(instance => instance.object.isInstancedMesh &&
      json(instance.local.toArray()) === json(expected));
    assert.equal(matches.length, 1, 'captured guide matrix occurs exactly once in real rendered geometry');
    return matches[0];
  });
  assert.equal(new Set(guide.instances.map(instance => instance.object)).size, 1,
    'all guide segments are in one existing material/geometry batch');
  assert.equal(new Set(guide.instances.map(instance => instance.index)).size, guide.instances.length);
}

function textureState(texture) {
  if (!texture) return null;
  const image = texture.image;
  return {
    type: texture.type, mapping: texture.mapping, wrapS: texture.wrapS, wrapT: texture.wrapT,
    magFilter: texture.magFilter, minFilter: texture.minFilter, anisotropy: texture.anisotropy,
    format: texture.format, internalFormat: texture.internalFormat, encoding: texture.encoding,
    generateMipmaps: texture.generateMipmaps, premultiplyAlpha: texture.premultiplyAlpha,
    flipY: texture.flipY, unpackAlignment: texture.unpackAlignment, rotation: texture.rotation,
    offset: texture.offset.toArray(), repeat: texture.repeat.toArray(), center: texture.center.toArray(),
    matrix: texture.matrix.toArray(), matrixAutoUpdate: texture.matrixAutoUpdate,
    userData: texture.userData, image: image ? {
      width: image.width, height: image.height,
      data: image.data ? Array.from(image.data) : null, operations: image.operations || null
    } : null
  };
}

function materialState(material) {
  const result = {};
  // Inspect every enumerable material value, except allocation/version bookkeeping.
  for (const key of Object.keys(material).sort()) {
    if (['id', 'uuid', 'version', '_listeners'].includes(key)) continue;
    const value = material[key];
    if (typeof value === 'function') continue;
    if (value?.isTexture) result[key] = textureState(value);
    else if (value && typeof value.toArray === 'function') result[key] = value.toArray();
    else result[key] = value;
  }
  return result;
}

function geometryState(geometry) {
  const attribute = value => ({itemSize: value.itemSize, normalized: value.normalized,
    type: value.array.constructor.name, array: Array.from(value.array)});
  return {
    type: geometry.type, attributes: Object.fromEntries(Object.entries(geometry.attributes)
      .sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => [name, attribute(value)])),
    morphAttributes: Object.fromEntries(Object.entries(geometry.morphAttributes)
      .map(([name, values]) => [name, values.map(attribute)])),
    morphTargetsRelative: geometry.morphTargetsRelative,
    index: geometry.index ? attribute(geometry.index) : null,
    groups: geometry.groups, drawRange: geometry.drawRange, userData: geometry.userData
  };
}

function snapshot(model, excludeEast = true) {
  const excluded = new Map();
  if (excludeEast) for (const instance of model.east.instances) {
    if (!excluded.has(instance.object)) excluded.set(instance.object, new Set());
    excluded.get(instance.object).add(instance.index);
  }
  return meshes(model.building).map(({object, address}) => {
    const transforms = [];
    for (let index = 0; index < (object.isInstancedMesh ? object.count : 1); index++) {
      if (excluded.get(object)?.has(index)) continue;
      const local = new T.Matrix4();
      if (object.isInstancedMesh) object.getMatrixAt(index, local);
      // Re-number retained instances by order, not the indices shifted by the
      // two additional guide segments in the same material batch.
      transforms.push(object.matrixWorld.clone().multiply(local).toArray());
    }
    return {address, name: object.name, type: object.type, geometry: geometryState(object.geometry),
      materials: (Array.isArray(object.material) ? object.material : [object.material]).map(materialState),
      world: object.matrixWorld.toArray(), transforms, visible: object.visible,
      castShadow: object.castShadow, receiveShadow: object.receiveShadow,
      frustumCulled: object.frustumCulled, renderOrder: object.renderOrder,
      layers: object.layers.mask, userData: object.userData};
  });
}

function triangles(building) {
  const result = [];
  for (const instance of instances(building)) {
    const geometry = instance.object.geometry, positions = geometry.attributes.position;
    const index = geometry.index;
    for (let vertex = 0; vertex < (index ? index.count : positions.count); vertex += 3) {
      const points = [0, 1, 2].map(offset => new T.Vector3().fromBufferAttribute(positions,
        index ? index.getX(vertex + offset) : vertex + offset).applyMatrix4(instance.world));
      result.push({...instance, points, triangle: new T.Triangle(...points),
        box: new T.Box3().setFromPoints(points)});
    }
  }
  return result;
}

function segmentPrism(a, b, radius, cap = radius) {
  assert(a[0] === b[0] || a[1] === b[1], 'only exact axis-aligned guide segments');
  return new T.Box3(
    new T.Vector3(Math.min(a[0], b[0]) - (a[0] === b[0] ? radius : cap), .15,
      Math.min(a[1], b[1]) - (a[1] === b[1] ? radius : cap)),
    new T.Vector3(Math.max(a[0], b[0]) + (a[0] === b[0] ? radius : cap), 2.4,
      Math.max(a[1], b[1]) + (a[1] === b[1] ? radius : cap)));
}

// Independent collision calculation: slab-clip the centerline against expanded
// collision boxes instead of reusing Three.Box3 or the production route helper.
function colliderBlocks(a, b, box, radius, noEndCaps = false) {
  if (box.min.y >= 2.4 || box.max.y <= .15) return false;
  let enter = 0, exit = 1;
  for (const [axis, dimension] of [['x', 0], ['z', 1]]) {
    const delta = b[dimension] - a[dimension];
    const margin = noEndCaps && delta !== 0 ? 0 : radius;
    const low = box.min[axis] - margin, high = box.max[axis] + margin;
    if (delta === 0) {
      if (a[dimension] < low || a[dimension] > high) return false;
    } else {
      const first = (low - a[dimension]) / delta, second = (high - a[dimension]) / delta;
      enter = Math.max(enter, Math.min(first, second));
      exit = Math.min(exit, Math.max(first, second));
      if (enter > exit) return false;
    }
  }
  return true;
}

function routeHits(model, points, radius = .38, noEndCaps = false) {
  const all = triangles(model.building), meshHits = [], colliderHits = [];
  // Covers the maximum tolerated Float32 endpoint discrepancy as well as the
  // requested body radius, so tiny matrix rounding cannot create a false pass.
  const testedRadius = radius + 2e-6;
  let triangleChecks = 0, broadPhaseCandidates = 0, collisionChecks = 0;
  for (let segment = 1; segment < points.length; segment++) {
    const a = points[segment - 1], b = points[segment];
    const prism = segmentPrism(a, b, testedRadius, noEndCaps ? 0 : testedRadius);
    for (const triangle of all) {
      triangleChecks++;
      if (!prism.intersectsBox(triangle.box)) continue;
      broadPhaseCandidates++;
      if (prism.intersectsTriangle(triangle.triangle))
        meshHits.push({segment, name: triangle.object.name, address: triangle.address,
          instance: triangle.index, points: triangle.points.map(point => point.toArray())});
    }
    for (const [index, box] of model.building.collisionBoxes.entries()) {
      collisionChecks++;
      if (colliderBlocks(a, b, box, testedRadius, noEndCaps))
        colliderHits.push({segment, index, bounds: [box.min.toArray(), box.max.toArray()], userData: box.userData});
    }
  }
  return {segments: points.length - 1, testedRadius, triangleChecks, broadPhaseCandidates, collisionChecks, meshHits, colliderHits};
}

function assertClearRoute(model, points, label, radius = .38, noEndCaps = false) {
  const proof = routeHits(model, points, radius, noEndCaps);
  assert.equal(proof.meshHits.length, 0, `${label}: rendered triangle body/headroom obstruction ${json(proof.meshHits[0])}`);
  assert.equal(proof.colliderHits.length, 0, `${label}: independent collider obstruction ${json(proof.colliderHits[0])}`);
  return proof;
}

function guideGeometry(model, guide, expected, label) {
  same(guide.points, expected, `${label}: independently specified connected route`);
  assert.equal(guide.material, 'ceramic');
  assert.equal(guide.width, .04);
  assert.equal(guide.beams.length, expected.length - 1);
  const all = triangles(model.building);
  const painted = new Set([...model.east.instances, ...model.west.instances].map(p => `${p.address}:${p.index}`));
  const ground = all.filter(t => !painted.has(`${t.address}:${t.index}`) &&
    t.box.max.y <= .03 && t.box.min.y >= -.1);
  assert(ground.length > 0, 'actual generated deck triangles are present');
  // Continuous support proof, not just the sampled downward rays below: identify
  // the real deck base and prove its two upper triangles tile a complete rectangle.
  const base = instances(model.building).filter(instance => {
    const center = new T.Vector3().setFromMatrixPosition(instance.world);
    return center.distanceTo(new T.Vector3(0, -.045, 0)) < 1e-6;
  });
  assert.equal(base.length, 1, 'one actual uninterrupted deck base');
  const baseTriangles = all.filter(t => t.object === base[0].object && t.index === base[0].index);
  assert.equal(baseTriangles.length, 12, 'real closed box deck base');
  const baseBounds = new T.Box3().setFromPoints(baseTriangles.flatMap(t => t.points));
  near(baseBounds.max.y, 0, 'deck base upper plane');
  const top = baseTriangles.filter(t => t.points.every(p => Math.abs(p.y - baseBounds.max.y) < 1e-8));
  assert.equal(top.length, 2, 'two actual triangles cover the deck upper plane');
  const key = point => json(point.toArray());
  const corners = [...new Map(top.flatMap(t => t.points).map(p => [key(p), p])).values()];
  assert.equal(corners.length, 4, 'four unique corners of the actual base top');
  for (const corner of corners) {
    assert(corner.x === baseBounds.min.x || corner.x === baseBounds.max.x);
    assert(corner.z === baseBounds.min.z || corner.z === baseBounds.max.z);
  }
  const shared = top[0].points.filter(p => top[1].points.some(q => key(p) === key(q)));
  assert.equal(shared.length, 2);
  assert(shared[0].x !== shared[1].x && shared[0].z !== shared[1].z,
    'top triangles meet only along the rectangle diagonal');
  near(top.reduce((area, t) => area + t.triangle.getArea(), 0),
    (baseBounds.max.x - baseBounds.min.x) * (baseBounds.max.z - baseBounds.min.z),
    'entire rectangular deck top is covered without overlap or holes', 1e-5);
  let previousEnd = null, minimumY = Infinity, maximumY = -Infinity;
  let groundingRays = 0, minSurfaceGap = Infinity, maxSurfaceGap = -Infinity;
  const matrixProof = [];
  for (const [index, instance] of guide.instances.entries()) {
    const args = guide.beams[index].arguments;
    same(args, ['ceramic', [expected[index][0], .039, expected[index][1]],
      [expected[index + 1][0], .039, expected[index + 1][1]], .04, .016, true],
    `${label}: unchanged real pathLine beam arguments`);
    const start = new T.Vector3(0, -.5, 0).applyMatrix4(instance.world);
    const end = new T.Vector3(0, .5, 0).applyMatrix4(instance.world);
    for (const [point, authored] of [[start, expected[index]], [end, expected[index + 1]]]) {
      near(point.x, authored[0], `${label} endpoint x`);
      near(point.z, authored[1], `${label} endpoint z`);
      near(point.y, .039, `${label} ground-level center`);
    }
    if (previousEnd) assert(previousEnd.distanceTo(start) < 2e-6, 'adjacent actual beam endpoints meet');
    previousEnd = end;
    const guideTriangles = all.filter(t => t.object === instance.object && t.index === instance.index);
    assert.equal(guideTriangles.length, 12, 'each real guide segment is one twelve-triangle box instance');
    const bounds = new T.Box3().setFromPoints(guideTriangles.flatMap(t => t.points));
    for (const axis of ['x', 'z']) assert(bounds.min[axis] >= baseBounds.min[axis] &&
      bounds.max[axis] <= baseBounds.max[axis], 'entire actual marking footprint has continuous deck support');
    minimumY = Math.min(minimumY, bounds.min.y); maximumY = Math.max(maximumY, bounds.max.y);
    assert(bounds.min.y >= .01899 && bounds.max.y <= .05901,
      'unchanged low-profile paint/beam thickness stays below the 0.15m body envelope');
    const samples = Math.ceil(start.distanceTo(end) / .1);
    for (let sample = 0; sample <= samples; sample++) {
      const point = start.clone().lerp(end, sample / samples);
      const ray = new T.Ray(new T.Vector3(point.x, .1, point.z), new T.Vector3(0, -1, 0));
      const hits = ground.map(t => ray.intersectTriangle(...t.points, false, new T.Vector3())).filter(Boolean);
      assert(hits.length > 0, 'every sampled marking point lies above the actual continuous deck');
      const surface = Math.max(...hits.map(hit => hit.y));
      const gap = bounds.min.y - surface;
      // The original generator uses .039m centers and differently oriented
      // .04/.016m sections. Small overlaps and grout gaps are preserved, not
      // falsely represented as a perfectly coplanar painted decal.
      assert(gap >= -.008 && gap <= .03101, 'grounding bounded by the actual original deck and grout');
      minSurfaceGap = Math.min(minSurfaceGap, gap); maxSurfaceGap = Math.max(maxSurfaceGap, gap);
      groundingRays++;
    }
    matrixProof.push({address: instance.address, instance: instance.index,
      matrix: instance.local.toArray(), endpoints: [start.toArray(), end.toArray()],
      bounds: [bounds.min.toArray(), bounds.max.toArray()]});
  }
  return {segments: guide.instances.length, triangles: guide.instances.length * 12,
    minimumY, maximumY, continuousGroundFootprintProof: true,
    deckBaseBounds: [baseBounds.min.toArray(), baseBounds.max.toArray()],
    groundingRays, minSurfaceGap, maxSurfaceGap, matrixProof};
}

function colliderState(model) {
  return model.building.collisionBoxes.map(box => ({
    min: box.min.toArray(), max: box.max.toArray(), userData: box.userData
  }));
}

function metadataState(model) {
  const state = plain(model.building.metadata);
  delete state.pieces; // The only permitted metadata difference is exactly +2.
  return state;
}

function readingState(model) {
  const reading = model.reading;
  return {content: reading.content, phase: reading.phase, selectedSectionId: reading.selectedSectionId,
    panels: reading.panels.map(panel => ({section: panel.section, sectionNumber: panel.sectionNumber,
      placement: {...panel.placement, host: panel.placement.host ? {
        min: panel.placement.host.min.toArray(), max: panel.placement.host.max.toArray(),
        userData: panel.placement.host.userData
      } : null}, framed: panel.framed, texture: textureState(panel.texture),
      distantTexture: textureState(panel.distantTexture)}))};
}

function assertUnchanged(before, now, label) {
  const oldSnapshot = snapshot(before), currentSnapshot = snapshot(now);
  same(currentSnapshot, oldSnapshot, `${label}: exact every non-east-guide mesh, geometry, material, transform and canvas operation`);
  same(colliderState(now), colliderState(before), `${label}: all physical colliders unchanged`);
  same(metadataState(now), metadataState(before), `${label}: all other metadata unchanged`);
  same(readingState(now), readingState(before), `${label}: all original reading content, selection and textures unchanged`);
  return {label, meshSnapshotSha256: hash(currentSnapshot), collidersSha256: hash(colliderState(now)),
    readingSha256: hash(readingState(now)), metadataSha256: hash(metadataState(now))};
}

function main() {
  fs.mkdirSync(output, {recursive: true});
  const before = load(true), now = load(false);
  for (const model of [before, now]) for (const guide of [model.west, model.east]) identifyGuide(model, guide);
  same(before.east.points, expectedOldEast, 'locked baseline really has the original conflicting east guide');
  same(before.west.points, expectedWest, 'locked baseline west guide');
  const currentEast = guideGeometry(now, now.east, expectedEast, 'current east guide');
  const currentWest = guideGeometry(now, now.west, expectedWest, 'retained west guide');
  same(now.west.beams, before.west.beams, 'west generated guide matrices and arguments exactly preserved');
  assert.equal(now.east.instances[0].address, before.east.instances[0].address, 'same original batch address');
  assert.equal(now.east.instances[0].object, now.west.instances[0].object, 'east and west retain same ceramic batch');
  assert.equal(now.east.instances[0].object.count - before.east.instances[0].object.count, 2, 'exactly +2 existing-batch instances');
  same(geometryState(now.east.instances[0].object.geometry), geometryState(before.east.instances[0].object.geometry), 'unchanged guide batch geometry');
  same(materialState(now.east.instances[0].object.material), materialState(before.east.instances[0].object.material), 'unchanged guide batch material');
  assert.equal(now.building.metadata.pieces - before.building.metadata.pieces, 2);
  assert.equal(now.building.metadata.staticDrawCalls, before.building.metadata.staticDrawCalls, 'no extra static material batch');
  assert.equal(meshes(now.building).length, meshes(before.building).length, 'no extra mesh or batch');
  assert.equal(triangles(now.building).length - triangles(before.building).length, 24, 'exactly +24 rendered triangles');
  for (const dimension of ['width', 'depth', 'height']) near(now.building[dimension], before.building[dimension], `unchanged ${dimension}`, 1e-12);
  same(now.context.CourtyardReadingCatalog[10], before.context.CourtyardReadingCatalog[10], 'entire source-backed API reading catalog unchanged');
  assert.equal(source('assets/readings/10.json', false), source('assets/readings/10.json', true), 'entire dated API source text unchanged');
  same(now.building.mechanisms.map(m => ({name: m.name, kind: m.kind,
    articulate: m.articulate.toString(), update: m.update.toString()})),
  before.building.mechanisms.map(m => ({name: m.name, kind: m.kind,
    articulate: m.articulate.toString(), update: m.update.toString()})), 'same actual mechanism functions');

  const snapshots = [assertUnchanged(before, now, 'initial attached assembly')];
  const phases = [0, .25, .5, .75, 1, .4, 0, 1];
  for (const phase of phases) {
    for (const model of [before, now]) for (const mechanism of model.building.mechanisms) mechanism.articulate(phase);
    snapshots.push(assertUnchanged(before, now, `mechanism phase ${phase}`));
  }
  const readingActions = [];
  for (const distance of ['near', 'far', 'near']) {
    for (const phase of [0, 1, 2]) {
      for (const model of [before, now]) {
        model.reading.setPhase(phase);
        model.reading.update(new T.Vector3(distance === 'far' ? 100 : 0, 1.7, 0));
      }
      const label = `reading ${distance} phase ${phase}`;
      readingActions.push(label); snapshots.push(assertUnchanged(before, now, label));
    }
  }
  for (const section of before.reading.content.sections) {
    for (const model of [before, now]) {
      assert(model.reading.setSection(section.id), 'real source section can be selected');
      model.reading.update(new T.Vector3(0, 1.7, 0));
    }
    const label = `reading source section ${section.id}`;
    readingActions.push(label); snapshots.push(assertUnchanged(before, now, label));
  }

  const baselinePrism = new T.Box3(new T.Vector3(3.55 - .38, .15, -6.7),
    new T.Vector3(3.55 + .38, 2.4, 6.8));
  const baselineConflict = triangles(before.building).filter(t => baselinePrism.intersectsTriangle(t.triangle));
  assert.equal(baselineConflict.length, 28, 'independently reproduce the 28-triangle pre-fix reading-rest conflict');
  assert(baselineConflict.some(t => t.object.name === 'reading-panel-backing'));
  const readingView = now.building.metadata.readingPanels.placement[0].view;
  const routes = [
    {name: 'current painted east return', points: now.east.points, radius: .38},
    {name: 'unchanged painted west return', points: now.west.points, radius: .38},
    {name: 'entire 3.6m central aisle', points: [[0, -10.5], [0, 10.5]], radius: 1.8, noEndCaps: true},
    {name: 'actual reading-rest approach', points: [[0, readingView[1]], readingView], radius: .38}
  ];
  const clearances = [];
  for (const phase of [0, .5, 1]) {
    for (const mechanism of now.building.mechanisms) mechanism.articulate(phase);
    for (const route of routes) {
      const proof = assertClearRoute(now, route.points, route.name, route.radius, route.noEndCaps);
      clearances.push({phase, name: route.name, points: route.points, radius: route.radius,
        bodyY: [.15, 2.4], ...proof});
    }
  }

  const mutations = [];
  for (const [name, mutate] of [
    ['revert original three-segment east guide', () => expectedOldEast],
    ['move bypass toward unchanged reading rest', points => points.map(([x, z], index) => [index === 1 || index === 2 ? 3.1 : x, z])]
  ]) {
    const mutant = load(false, mutate);
    const proof = routeHits(mutant, mutant.east.points);
    assert(proof.meshHits.length > 0, `${name}: mutation must fail actual triangle clearance`);
    assert(proof.colliderHits.length > 0, `${name}: mutation must independently fail collider clearance`);
    assert(proof.meshHits.some(hit => hit.name.startsWith('reading-panel')), `${name}: fails against the real unchanged reading rest`);
    assert.throws(() => assertClearRoute(mutant, mutant.east.points, name), /rendered triangle body\/headroom obstruction/,
      `${name}: same production clearance assertion really rejects mutation`);
    mutations.push({name, rejected: true, points: mutant.east.points,
      intersectingTriangles: proof.meshHits.length, intersectingColliders: proof.colliderHits.length,
      firstTriangleHit: proof.meshHits[0], firstColliderHit: proof.colliderHits[0]});
  }

  // Check that the equality oracle rejects forbidden changes, rather than merely
  // producing matching hashes for the good fixture.
  const invariantMutations = [];
  for (const [name, mutate, error] of [
    ['change displayed text', model => {
      const face = meshes(model.building).find(({object}) =>
        object.material.map?.image?.operations?.some(operation => operation[0] === 'fillText'));
      assert(face, 'actual production canvas text exists');
      const operation = face.object.material.map.image.operations.find(value => value[0] === 'fillText');
      operation[1] += ' forbidden mutation';
    }, /exact every non-east-guide mesh/],
    ['change reading-rest collider', model => {
      const collider = model.building.collisionBoxes.find(box => box.userData.readingPanel);
      assert(collider); collider.min.x -= .01;
    }, /all physical colliders unchanged/],
    ['move west painted guide', model => {
      const instance = model.west.instances[0], matrix = instance.local.clone();
      matrix.elements[12] -= .01;
      instance.object.setMatrixAt(instance.index, matrix);
    }, /exact every non-east-guide mesh/],
    ['move reading-rest geometry', model => {
      const backing = model.building.root.getObjectByName('reading-panel-backing');
      assert(backing); backing.position.y += .01;
    }, /exact every non-east-guide mesh/]
  ]) {
    const reference = load(true), mutant = load(false);
    for (const model of [reference, mutant])
      for (const guide of [model.west, model.east]) identifyGuide(model, guide);
    assertUnchanged(reference, mutant, `${name}: unmutated fixture`);
    mutate(mutant);
    assert.throws(() => assertUnchanged(reference, mutant, name), error,
      `${name}: the actual equality assertion rejects the forbidden mutation`);
    invariantMutations.push({name, rejected: true});
  }

  const result = {
    passed: true, building: 10, baseline, currentSourceSha256: crypto.createHash('sha256')
      .update(source('assets/content-services.js', false)).digest('hex'),
    guideChange: {baselineSegments: before.east.instances.length, currentSegments: now.east.instances.length,
      additionalInstances: 2, additionalTriangles: 24, additionalMaterialBatches: 0,
      batchAddress: now.east.instances[0].address},
    currentEast, currentWest, baselineConflictingTriangles: baselineConflict.length,
    retainedMeshes: meshes(now.building).length, retainedCollisionBoxes: now.building.collisionBoxes.length,
    unchangedSnapshotChecks: snapshots.length, snapshots, mechanismPhases: phases, readingActions,
    clearances, mutations, invariantMutations,
    limits: [
      'CPU assembly, actual triangle SAT, independent collider clipping and recorded canvas operations only.',
      'Does not certify browser navigation, GPU rendering, text rasterization, mobile performance or structural safety.',
      'Ground-level guide preserves the original beam section and deck/grout contact, not a mathematically coplanar decal.',
      'The baseline is exact pre-fix main; old historical detail-audit conclusions are not treated as current evidence.'
    ]
  };
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({passed: true, baseline, guideChange: result.guideChange,
    unchangedSnapshotChecks: snapshots.length, bodyClearanceCases: clearances.length,
    baselineConflictingTriangles: baselineConflict.length, mutations, invariantMutations,
    report: path.relative(root, path.join(output, 'checks.json'))}, null, 2));
}

main();
