/* Reproducible, GPU-free route audit. Run: node docs/content-route-check.cjs */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const THREE = require(path.join(root, 'vendor/three.min.js'));
const sources = [
  'assets/architecture.js', 'assets/content-core.js',
  'assets/content-services.js', 'assets/content-literary.js'
];
const context = {
  THREE, console,
  document: {
    createElement() {
      return {width: 0, height: 0, getContext() {
        return new Proxy({
          measureText(text) { return {width: text.length * 10}; },
          createLinearGradient() { return {addColorStop() {}}; }
        }, {get(object, key) { return object[key] || (() => {}); }});
      }};
    }
  }
};
context.window = context;
vm.createContext(context);
const hashes = {};
for (const file of sources) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  hashes[file] = crypto.createHash('sha256').update(source).digest('hex');
  new vm.Script(source, {filename: file}).runInContext(context);
}

const bodyRadius = .38, bodyHeight = 1.7, footY = .045, sampleSpacing = .02;
const failures = [], results = [];
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const collisionMaterial = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});

// Exact clipping against a conservatively radius-expanded horizontal rectangle.
// Testing whole segments avoids gaps between sampled collision checks.
function segmentIntersectsBox(a, b, box, radius) {
  let start = 0, end = 1;
  for (const [axis, component] of [['x', 0], ['z', 1]]) {
    const delta = b[component] - a[component];
    const min = box.min[axis] - radius, max = box.max[axis] + radius;
    if (Math.abs(delta) < 1e-12) {
      if (a[component] < min || a[component] > max) return false;
    } else {
      let near = (min - a[component]) / delta, far = (max - a[component]) / delta;
      if (near > far) [near, far] = [far, near];
      start = Math.max(start, near); end = Math.min(end, far);
      if (start > end) return false;
    }
  }
  return true;
}

function navigationMeshes(building) {
  // Match craftedNavigation's collision proxies and continuous floor proxy.
  const floor = new THREE.Box3(
    new THREE.Vector3(-building.width / 2, -.025, -building.depth / 2),
    new THREE.Vector3(building.width / 2, footY, building.depth / 2)
  );
  return [...building.collisionBoxes, floor].map(box => {
    const mesh = new THREE.Mesh(boxGeometry, collisionMaterial);
    mesh.position.copy(box.getCenter(new THREE.Vector3()));
    mesh.scale.copy(box.getSize(new THREE.Vector3()));
    mesh.updateMatrixWorld();
    return mesh;
  });
}

let clinicianBuilding;
for (const index of [19, 20, 21, 22, 25, 24]) {
  const building = context.CourtyardArchitecture.build({THREE, index, title: 'Route audit', zone: 0});
  if (index === 24) clinicianBuilding = building;
  const routes = index === 24 ? [{
    name: 'clinician-side-passage', points: [[8.75, -9.5], [8.75, 9.5]], bodyRadius
  }] : building.metadata.visitorRoutes;
  if (!Array.isArray(routes) || !routes.length) {
    failures.push({index, reason: 'Missing visitor routes'}); continue;
  }
  const meshes = navigationMeshes(building), ray = new THREE.Raycaster();
  for (const route of routes) {
    const collisions = [];
    let samples = 0, unsupported = 0, floorMin = Infinity, floorMax = -Infinity;
    for (let segment = 1; segment < route.points.length; segment++) {
      const a = route.points[segment - 1], b = route.points[segment];
      for (const box of building.collisionBoxes) {
        if (box.min.y < footY + bodyHeight && box.max.y > footY + .12 &&
            segmentIntersectsBox(a, b, box, bodyRadius)) {
          collisions.push({segment, part: box.userData?.part || 'obstacle',
            min: box.min.toArray(), max: box.max.toArray()});
        }
      }
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const count = Math.max(1, Math.ceil(length / sampleSpacing));
      for (let n = 0; n <= count; n++) {
        samples++;
        const x = a[0] + (b[0] - a[0]) * n / count;
        const z = a[1] + (b[1] - a[1]) * n / count;
        ray.set(new THREE.Vector3(x, footY + .39, z), new THREE.Vector3(0, -1, 0));
        ray.near = 0; ray.far = 1;
        const hits = ray.intersectObjects(meshes, false)
          .filter(hit => hit.face && hit.face.normal.y > .55 && hit.point.y >= -.02);
        if (!hits.length) unsupported++;
        else {
          const y = Math.max(...hits.map(hit => hit.point.y));
          floorMin = Math.min(floorMin, y); floorMax = Math.max(floorMax, y);
        }
      }
    }
    const passed = collisions.length === 0 && unsupported === 0 &&
      Math.abs(floorMin - footY) < 1e-6 && Math.abs(floorMax - footY) < 1e-6;
    results.push({index, name: route.name, points: route.points, passed,
      segments: route.points.length - 1, floorSamples: samples, collisions,
      unsupportedSamples: unsupported,
      minimumSupportY: Number.isFinite(floorMin) ? floorMin : null,
      maximumSupportY: Number.isFinite(floorMax) ? floorMax : null});
    if (!passed) failures.push({index, route: route.name, reason: 'Route clearance or floor support failed'});
  }
}

// Measure the actual overhead geometry, not just the doorway's comment.
// Use DoubleSide only inside this isolated audit to read every underside.
clinicianBuilding.root.updateMatrixWorld(true);
const originalSides = new Map();
clinicianBuilding.root.traverse(object => {
  if (!object.isMesh) return;
  for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
    if (!originalSides.has(material)) originalSides.set(material, material.side);
    material.side = THREE.DoubleSide;
  }
});
const upwardRay = new THREE.Raycaster(new THREE.Vector3(8.75, 1.8, -7.42), new THREE.Vector3(0, 1, 0), 0, 10);
const overhead = upwardRay.intersectObject(clinicianBuilding.root, true)[0];
for (const [material, side] of originalSides) material.side = side;
const jumpSpeed = 6.1, gravity = 16, headHeight = 1.65, headPadding = .02;
const maximumJumpHeadY = footY + jumpSpeed * jumpSpeed / (2 * gravity) + headHeight + headPadding;
const overheadY = overhead ? overhead.point.y : null;
const doorway = {passed: overheadY !== null && overheadY >= 3.04 && overheadY > maximumJumpHeadY,
  position: [8.75, -7.42], clearWidth: 1.0, overheadY,
  maximumJumpHeadY, overheadMargin: overheadY === null ? null : overheadY - maximumJumpHeadY};
if (!doorway.passed) failures.push({index: 24, reason: 'Clinician doorway overhead clearance failed'});
if (results.length !== 9) failures.push({reason: 'Expected eight literary routes and one clinician route', actual: results.length});

const report = {
  passed: failures.length === 0,
  method: 'Exact horizontal segment/AABB clearance and 2 cm navigation-floor ray samples; actual doorway geometry raycast',
  scope: 'Eight declared literary visitor routes and the MindCare clinician passage; local building coordinates',
  limits: 'GPU-free geometry audit; does not replace browser movement, rendering, or performance testing',
  bodyRadius, bodyHeight, floorSampleSpacing: sampleSpacing,
  routeCount: results.length, floorSamples: results.reduce((sum, row) => sum + row.floorSamples, 0),
  sourceSha256: hashes, routes: results, clinicianDoorway: doorway, failures
};
const output = path.join(root, 'qa-results/content-route-report.json');
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, routeCount: report.routeCount,
  floorSamples: report.floorSamples, clinicianDoorway: doorway, failures}, null, 2));
if (!report.passed) process.exitCode = 1;
