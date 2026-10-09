/* GPU-free geometry/source audit for the index-20 garden only.
 * Run: node docs/moon-snow-garden-check.cjs
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const root = path.resolve(__dirname, '..'), THREE = require(path.join(root, 'vendor/three.min.js'));
const source = JSON.parse(fs.readFileSync(path.join(root, 'assets/readings/20.json'), 'utf8'));
const scripts = ['assets/architecture.js', 'assets/content-core.js', 'assets/content-literary.js', 'assets/moon-snow-garden.js'];
const canvases = [];
const context = {THREE, console, document: {createElement() { const canvas = {width: 0, height: 0, getContext() {return new Proxy({measureText(t) {return {width: t.length * 10};}}, {get(o, k) {return o[k] || (() => {});}});}}; canvases.push(canvas); return canvas; }}};
context.window = context; vm.createContext(context);
const hashes = {};
for (const file of scripts) {const code = fs.readFileSync(path.join(root, file), 'utf8'); hashes[file] = crypto.createHash('sha256').update(code).digest('hex'); new vm.Script(code, {filename: file}).runInContext(context);}
const building = context.CourtyardArchitecture.build({THREE, index: 20, title: '月雪', zone: 1});
const failures = [], checks = [];
function check(passed, name, data) {checks.push({name, passed: !!passed, data}); if (!passed) failures.push({name, data});}
function intersects(a, b, box, radius) {
  let start = 0, end = 1;
  for (const [axis, c] of [['x', 0], ['z', 1]]) {
    const delta = b[c] - a[c], min = box.min[axis] - radius, max = box.max[axis] + radius;
    if (Math.abs(delta) < 1e-12) {if (a[c] < min || a[c] > max) return false;}
    else {let near = (min - a[c]) / delta, far = (max - a[c]) / delta; if (near > far) [near, far] = [far, near]; start = Math.max(start, near); end = Math.min(end, far); if (start > end) return false;}
  }
  return true;
}
const bodyRadius = .38, footY = .045, bodyHeight = 1.7;
const maxJumpHead = footY + 6.1 * 6.1 / 32 + 1.65 + .02;
const boxGeo = new THREE.BoxGeometry(1, 1, 1), navMaterial = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
const floor = new THREE.Box3(new THREE.Vector3(-building.width / 2, -.025, -building.depth / 2), new THREE.Vector3(building.width / 2, footY, building.depth / 2));
const navigation = [...building.collisionBoxes, floor].map(box => {const m = new THREE.Mesh(boxGeo, navMaterial); m.position.copy(box.getCenter(new THREE.Vector3())); m.scale.copy(box.getSize(new THREE.Vector3())); m.updateMatrixWorld(); return m;});
const routeResults = [];
const ray = new THREE.Raycaster();
for (const route of building.metadata.visitorRoutes) {
  const hits = [], floorFailures = [];
  let floorSamples = 0;
  for (let j = 1; j < route.points.length; j++) {
    const a = route.points[j - 1], b = route.points[j];
    for (const box of building.collisionBoxes) if (box.min.y < footY + bodyHeight && box.max.y > footY + .12 && intersects(a, b, box, bodyRadius)) hits.push({segment: j, part: box.userData?.part, min: box.min.toArray(), max: box.max.toArray()});
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .02);
    for (let s = 0; s <= n; s++) {
      const x = a[0] + (b[0] - a[0]) * s / n, z = a[1] + (b[1] - a[1]) * s / n;
      ray.set(new THREE.Vector3(x, footY + .39, z), new THREE.Vector3(0, -1, 0)); ray.near = 0; ray.far = 1;
      const support = ray.intersectObjects(navigation).filter(h => h.face?.normal.y > .55);
      if (!support.length || Math.abs(support[0].point.y - footY) > 1e-6) floorFailures.push([x, z]);
      floorSamples++;
    }
  }
  const result = {name: route.name, passed: !hits.length && !floorFailures.length, segments: route.points.length - 1, floorSamples, collisions: hits, unsupported: floorFailures}; routeResults.push(result); check(result.passed, 'Route ' + route.name, result);
}
// Test the rendered construction too: every non-floor instance is independently bounded.
const phases = [], instanceMatrix = new THREE.Matrix4();
for (const phase of [0, .5, 1, .5, 0, 1]) {
  building.mechanisms.forEach(m => m.update(phase)); building.root.updateMatrixWorld(true);
  const geometryCollisions = [], movingBounds = [];
  let maxRadius = 0, lowestOverhead = Infinity, overheadSamples = 0;
  const materials = new Map();
  building.root.traverse(object => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {if (!materials.has(material)) materials.set(material, material.side); material.side = THREE.DoubleSide;}
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    const inspect = matrix => {
      const box = object.geometry.boundingBox.clone().applyMatrix4(matrix);
      for (const x of [box.min.x, box.max.x]) for (const z of [box.min.z, box.max.z]) maxRadius = Math.max(maxRadius, Math.hypot(x, z));
      if (box.min.y >= footY + bodyHeight || box.max.y <= footY + .12) return;
      // Aperture mesh's AABB includes its hole, but no route enters this non-walkable window.
      for (const route of building.metadata.visitorRoutes) for (let j = 1; j < route.points.length; j++) if (intersects(route.points[j - 1], route.points[j], box, bodyRadius)) geometryCollisions.push({route: route.name, segment: j, mesh: object.name, min: box.min.toArray(), max: box.max.toArray()});
    };
    if (object.isInstancedMesh) for (let n = 0; n < object.count; n++) {object.getMatrixAt(n, instanceMatrix); instanceMatrix.premultiply(object.matrixWorld); inspect(instanceMatrix);}
    else inspect(object.matrixWorld);
  });
  // Exact upward rays test actual open paths, not broad roof boxes or comments.
  for (const route of building.metadata.visitorRoutes) for (let j = 1; j < route.points.length; j++) {
    const a = route.points[j - 1], b = route.points[j], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .16);
    for (let s = 0; s <= n; s++) {
      const x = a[0] + (b[0] - a[0]) * s / n, z = a[1] + (b[1] - a[1]) * s / n;
      ray.set(new THREE.Vector3(x, footY + bodyHeight, z), new THREE.Vector3(0, 1, 0)); ray.near = 0; ray.far = 5;
      const hit = ray.intersectObject(building.root, true)[0];
      if (hit) lowestOverhead = Math.min(lowestOverhead, hit.point.y); overheadSamples++;
    }
  }
  for (const [material, side] of materials) material.side = side;
  building.mechanisms.forEach(m => {const box = new THREE.Box3().setFromObject(m.object); movingBounds.push({name: m.name, min: box.min.toArray(), max: box.max.toArray(), openness: m.openness, scale: m.object.scale.toArray()});});
  const record = {phase, geometryCollisions, maxRadius, lowestOverhead, overheadSamples, movingBounds, passed: !geometryCollisions.length && maxRadius < 15 && lowestOverhead > maxJumpHead && building.mechanisms.every(m => Math.abs(m.openness - phase) < 1e-8 && m.object.scale.equals(new THREE.Vector3(1, 1, 1)))};
  phases.push(record); check(record.passed, 'Actual geometry and mechanism phase ' + phase, record);
}
check(building.metadata.sourceSectionsReviewed.length === source.sections.length && source.sections.every(s => building.metadata.sourceSectionsReviewed.includes(s.id)), 'All source sections represented', building.metadata.sourceSectionsReviewed);
check(building.metadata.readingPanelMode === 'integrated', 'No generic stand requested', building.metadata.readingPanelMode);
const quoteResults = building.metadata.adaptedTextMappings.map(q => ({name: q.name, sectionId: q.sectionId, exact: source.sections.find(s => s.id === q.sectionId)?.paragraphs.some(p => p.includes(q.text))}));
check(quoteResults.every(q => q.exact), 'All inscriptions match the privacy-edited reading', quoteResults);
check(canvases.length === 4 && canvases.every(c => c.width <= 512 && c.height <= 512), 'Only four bounded inscription canvases', canvases.map(c => [c.width, c.height]));
const targets = []; building.root.traverse(o => {if (o.userData.readingPanel) targets.push({name: o.name, ...o.userData.readingPanel});});
check(targets.length === 4 && targets.every(t => source.sections.some(s => s.id === t.sectionId)), 'Four valid reading click targets', targets);
const aisleIntrusions = building.collisionBoxes.filter(box => box.max.y > .15 && box.min.y < 1.8 && box.min.x < 1.8 && box.max.x > -1.8);
check(!aisleIntrusions.length, 'Full 3.6 m axial passage clear', aisleIntrusions.map(box => box.userData));
const report = {passed: !failures.length, scope: 'Only index 20; no browser movement or colour claims', sourceSha256: hashes, bodyRadius, footY, maximumJumpHeadY: maxJumpHead, staticDrawCalls: building.metadata.staticDrawCalls, pieces: building.metadata.pieces, bounds: {min: building.metadata.bounds.min.toArray(), max: building.metadata.bounds.max.toArray()}, routes: routeResults, phases, checks, failures};
fs.writeFileSync(path.join(root, 'qa-results/moon-snow-garden-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, routeCount: routeResults.length, floorSamples: routeResults.reduce((n, r) => n + r.floorSamples, 0), phaseCount: phases.length, staticDrawCalls: report.staticDrawCalls, pieces: report.pieces, lowestOverhead: phases[0].lowestOverhead, maximumJumpHeadY: maxJumpHead, maxRadius: phases[0].maxRadius, failures}, null, 2));
if (!report.passed) process.exitCode = 1;
