/* GPU-free content/placement regression: node docs/reading-panels-check.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), THREE = require(path.join(root, 'vendor/three.min.js'));
const canvases = [];
const context = {THREE, console, document: {createElement() {
  const canvas = {width: 0, height: 0, text: []};
  const c = new Proxy({font: '20px sans-serif', fillText(text) {canvas.text.push(text);}, clearRect() {canvas.text.length = 0;},
    measureText(text) {return {width: Array.from(text).length * (parseFloat(this.font.match(/\d+px/)?.[0]) || 20) * .9};},
    createLinearGradient() {return {addColorStop() {}};}
  }, {get(object, key) {return key in object ? object[key] : (() => {});}});
  canvas.getContext = () => c; canvases.push(canvas); return canvas;
}}};
context.window = context; vm.createContext(context);
for (const file of ['dossier-detail','vault-detail','rss-detail','architecture', 'content-core', 'ink-detail','restoration-detail','huayun-detail','alternate-detail','content-creation-care', 'shield-detail','gateway-detail','reme-detail','mindcare-detail','content-services',
  'twinstars-detail','causal-detail','versions-detail','city-detail','portraits-detail','session-detail','content-narratives', 'rubbing-detail','proof-detail','workshop-detail','handover-detail','content-literary', 'courtyard-runtime', 'reading-panels'])
  new vm.Script(fs.readFileSync(path.join(root, 'assets', file + '.js'), 'utf8'), {filename: file}).runInContext(context);

const api = context.CourtyardReadingPanels, rows = [], records = [];
const preview = {title: '同一条河旁，仍可继续修订的工作室', summary: '万物流变中，同一个我凭何成立。旧稿仍在，修订持续。', coverage: '完整正文',
  sections: [{id: 'opening', title: '母题：一条河', excerpt: '所有版本都回到同一个问题。'},
    {id: 'middle', title: '他是自己的审稿人', excerpt: '保留论点，在旧稿上继续深化。'},
    {id: 'ending', title: '作者：暂略', excerpt: '身份与发表可以暂不落实，修订却持续。'}]};
function segmentHits(a, b, box, radius = .38) {
  let start = 0, end = 1;
  for (const [axis, n] of [['x', 0], ['z', 1]]) {
    const delta = b[n] - a[n], lo = box.min[axis] - radius, hi = box.max[axis] + radius;
    if (Math.abs(delta) < 1e-10) {if (a[n] < lo || a[n] > hi) return false;}
    else {let near = (lo - a[n]) / delta, far = (hi - a[n]) / delta;
      if (near > far) [near, far] = [far, near]; start = Math.max(start, near); end = Math.min(end, far);
      if (start > end) return false;
    }
  }
  return true;
}
function exactBounds(mesh, parent) {
  parent.updateWorldMatrix(true, true); mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox.clone().applyMatrix4(parent.matrixWorld.clone().invert().multiply(mesh.matrixWorld));
}
for (let index = 0; index < 26; index++) {
  if (index === 23) continue;
  const b = context.CourtyardArchitecture.build({THREE, index, title: '读馆 ' + index, zone: 0});
  const before = b.collisionBoxes.slice(), phases = b.mechanisms.map(m => m.openness);
  // Registration happens after attachment; rotated and translated roots must work too.
  b.root.position.set(index * 80, 2, index * 13); b.root.rotation.y = index * .23;
  const c = api.attach({THREE, building: b, index, entry: {title: '读馆'}, preview});
  if (index === 20 || b.metadata.readingPanelMode === 'integrated') {
    assert.equal(c, null, 'Integrated garden gets no generic panels');
    assert.equal(b.collisionBoxes.length, before.length, 'Integrated garden is untouched');
    rows.push({index, count: 0, placement: [], mode: 'integrated'}); continue;
  }
  assert(c.panels.length > 0 && c.panels.length <= 2, 'One or two useful surfaces: ' + index);
  assert(c.panels[0].section, 'First surface carries a source section');
  const rests = c.panels.filter(p => p.placement.kind === 'book-rest');
  const walls = c.panels.filter(p => p.placement.kind === 'wall');
  assert(!rests.length || (rests.length === 1 && c.panels.length === 1), 'A book rest never accompanies wall panels');
  assert(walls.length || rests.length === 1, 'No freestanding vertical sign');
  assert.equal(new Set(c.panels.filter(p => p.section).map(p => p.section.id)).size, c.panels.filter(p => p.section).length);
  assert.equal(c.panels.filter(p => p.texture).length, 0, 'Textures are lazy');
  assert.deepEqual(b.mechanisms.map(m => m.openness), phases, 'Mechanisms restore: ' + index);
  const added = b.collisionBoxes.filter(box => !before.includes(box));
  const routes = (b.metadata.visitorRoutes || []).slice();
  if (index === 24) routes.push({points: [[8.75, -9.5], [8.75, 9.5]]});
  routes.push({points: [[-1.8, -16], [-1.8, 16]]}, {points: [[0, -16], [0, 16]]}, {points: [[1.8, -16], [1.8, 16]]});
  for (const box of added) {
    assert(box.max.y <= (box.userData?.part?.startsWith('inscription-window-') ? 2.72 : 2.23), 'Text stays below 2.23 m; window lintels below 2.72 m');
    for (const route of routes) for (let n = 1; n < route.points.length; n++)
      assert(!segmentHits(route.points[n - 1], route.points[n], box), 'Clear route: ' + index + ' ' + (route.name || 'axial'));
  }
  for (const panel of c.panels) {
    assert.equal(panel.face.userData.readingPanel.index, index);
    assert.equal(panel.face.userData.readingPanel.sectionId, panel.section?.id || null);
    assert(panel.face.scale.x < 1.13 && panel.face.scale.y < 1.41, 'Readable inscription dimensions');
    const solidMeshes = panel.group.children.filter(child => child !== panel.face);
    assert.equal(solidMeshes.length, panel.colliders.length);
    for (let n = 0; n < solidMeshes.length; n++) {
      const actual = exactBounds(solidMeshes[n], b.root), collider = panel.colliders[n];
      assert(actual.min.distanceTo(collider.min) < 1e-5 && actual.max.distanceTo(collider.max) < 1e-5,
        'Visible geometry matches collider: ' + index);
    }
    if (panel.placement.kind === 'wall') {
      assert(before.includes(panel.placement.host), 'Preview reuses an existing wall');
      assert(!before.some(box => box.min.y < 1.745 && box.max.y > .165 &&
        segmentHits(panel.placement.view, panel.placement.view, box)), 'Usable standing position');
    } else {
      const board = solidMeshes.find(mesh => mesh.name === 'reading-panel-backing');
      assert(board.rotation.x < -.9 && board.rotation.x > -1.2, 'Book is inclined toward standing reader');
      const boardBox = exactBounds(board, b.root);
      assert(boardBox.max.y <= (panel.placement.mountedOn ? 1.72 : 1.33) && boardBox.min.y > .62, 'Low readable stone height');
      assert(Math.max(boardBox.max.z - boardBox.min.z, boardBox.max.x - boardBox.min.x) > .95, 'Tilted footprint is genuinely deep');
      assert.equal(solidMeshes.filter(m => m.name === 'reading-rest-support').length, 2, 'Two stable supports');
      const foot = solidMeshes.find(mesh => mesh.name === 'reading-rest-foot');
      const footBounds = exactBounds(foot, b.root);
      assert(Math.abs(footBounds.min.y - (panel.placement.baseY ?? .045)) < 1e-6, 'Foot meets the navigation floor');
      for (const support of solidMeshes.filter(mesh => mesh.name === 'reading-rest-support')) {
        const supportBounds = exactBounds(support, b.root);
        assert(Math.abs(supportBounds.min.y - footBounds.max.y) < 1e-6, 'Supports meet the foot');
        assert(supportBounds.intersectsBox(boardBox), 'Supports meet the sloping book');
        const vertices = support.geometry.attributes.position;
        for (let n = 0; n < vertices.count; n++) {
          if (vertices.getY(n) < (panel.placement.mountedOn ? -.3 : -.7)) continue;
          const top = new THREE.Vector3().fromBufferAttribute(vertices, n).applyMatrix4(support.matrixWorld);
          const ray = new THREE.Raycaster(top.clone().add(new THREE.Vector3(0, -.005, 0)), new THREE.Vector3(0, 1, 0), 0, .03);
          const hit = ray.intersectObject(board)[0];
          assert(hit && Math.abs(hit.distance - .005) < 1e-5, 'Fitted support touches actual board underside');
        }
      }
      for (const box of panel.colliders) for (const x of [box.min.x - .38, box.max.x + .38])
        for (const z of [box.min.z - .38, box.max.z + .38]) assert(Math.hypot(x, z) <= 14.75, 'On terrace');
    }
  }
  context.CourtyardRuntime.register(THREE, b, b.root, index, 'Read'); records.push(b);
  rows.push({index, count: c.panels.length, placement: b.metadata.readingPanels.placement, mode: b.metadata.readingPanels.mode});
}

// Only the nearby scene receives textures, and the rendered words are source-backed.
const first = records[0], standing = first.root.localToWorld(new THREE.Vector3(...[first.readingPanels.panels[0].placement.view[0], 1.7,
  first.readingPanels.panels[0].placement.view[1]]));
api.update(records, standing);
assert(first.readingPanels.panels[0].texture, 'Nearby entrance is readable');
let active = records.flatMap(b => b.readingPanels.panels).filter(p => p.texture);
assert(active.length <= 18, 'Global texture budget');
assert(active.some(p => p.texture.image.text.join('').includes('所有版本')), 'Actual supplied excerpt renders');
assert(active.every(p => p.texture.image.width === 640 && p.texture.image.height === 800));
assert(active.every(p => !p.texture.image.text.join('').includes('点选')), 'No interface instruction');
assert(active.every(p => !p.texture.image.text.join('').includes('个章节')), 'No directory paragraph on a garden leaf');
api.update(records, new THREE.Vector3(-1000, 0, -1000));
assert.equal(records.flatMap(b => b.readingPanels.panels).filter(p => p.texture).length, 0, 'Far textures released');
// Stress the cap independently of the normal generous building separation.
for (const b of records) {b.root.position.set(0, 0, 0); b.root.rotation.y = 0; b.root.updateWorldMatrix(true, true);}
api.update(records, new THREE.Vector3(0, 0, -9));
assert.equal(records.flatMap(b => b.readingPanels.panels).filter(p => p.texture).length, 18, 'Crowded-scene texture cap');
api.update(records, new THREE.Vector3(-1000, 0, -1000));
const one = context.CourtyardArchitecture.build({THREE, index: 14, title: 'One', zone: 0});
const oneController = api.attach({THREE, building: one, index: 14, preview: {...preview, sections: preview.sections.slice(0, 1)}});
assert(oneController.panels.filter(p => p.section).length <= 1, 'No repeated chapter when only one exists');
const unknown = context.CourtyardArchitecture.build({THREE, index: 8, title: 'Unknown', zone: 0});
const unknownController = api.attach({THREE, building: unknown, index: 8,
  preview: {...preview, coverage: 'entrance-only', summary: ''}});
assert.equal(unknownController.panels.length, 1, 'Unknown content stays entrance-only');
assert(unknownController.content.unavailable);
api.update([unknown], new THREE.Vector3(unknownController.panels[0].placement.x, 0, unknownController.panels[0].placement.z));
assert(unknownController.panels[0].texture.image.text.some(s => s.includes('仅入口')), 'Unknown status is explicit');
assert.equal(api.attach({THREE, building: unknown, index: 23, preview}), null, 'Butterfly geometry is untouched');
const integrated = context.CourtyardArchitecture.build({THREE, index: 0, title: 'Integrated', zone: 0});
integrated.metadata.readingPanelMode = 'integrated';
const integratedChildren = integrated.root.children.length, integratedBoxes = integrated.collisionBoxes.length;
assert.equal(api.attach({THREE, building: integrated, index: 0, preview}), null, 'Any integrated plan opts out');
assert.equal(integrated.root.children.length, integratedChildren); assert.equal(integrated.collisionBoxes.length, integratedBoxes);
// The separately authored butterfly mounting retains its existing location and size.
const butterfly = {root: new THREE.Group(), sea: {collisions: []}};
const butterflyController = api.attachButterfly({THREE, butterfly, index: 23, entry: {}, preview});
assert.equal(butterflyController.panels[0].placement.z, 37.654, 'Preserve corrected butterfly mounting');
assert.equal(butterflyController.panels[0].placement.x, -10.884);
assert.equal(butterflyController.panels[0].face.rotation.x, 0, 'Butterfly plaque remains vertical');
assert(Math.abs(butterflyController.panels[0].face.scale.x - .95) < 1e-8);
const countBeforeDispose = unknown.collisionBoxes.length - unknownController.panels.flatMap(p => p.colliders).length;
unknownController.dispose(); assert.equal(unknown.collisionBoxes.length, countBeforeDispose, 'Disposal restores collider set');
new vm.Script(fs.readFileSync(path.join(root, 'assets/reading-catalog.js'), 'utf8')).runInContext(context);
const actual = {panels: 0, wallLeaves: 0, lowBookRests: 0, integrated: 0, interiorBuildings: 0, phases: 0};
for (let index = 0; index < 26; index++) {
  if (index === 23) continue;
  const b = context.CourtyardArchitecture.build({THREE, index, title: 'Catalog', zone: 0});
  const c = api.attach({THREE, building: b, index, preview: context.CourtyardReadingCatalog[index]});
  if (!c) {actual.integrated++; continue;}
  assert(c.panels.every(p => p.placement.kind === 'wall' || p.placement.interior), 'Every generic inscription is inside: ' + index);
  actual.interiorBuildings++;
  const phaseSections = [];
  const transforms = c.panels.map(p => ({position: p.group.position.toArray(), rotation: p.group.rotation.toArray()}));
  const player = new THREE.Vector3(c.panels[0].placement.view[0], 1.7, c.panels[0].placement.view[1]);
  api.update([b], player);
  for (const phase of [0, 1, 2]) {
    assert.equal(c.setPhase(phase), c, 'Phase setter remains chainable');
    assert.equal(c.phase, phase);
    phaseSections.push(c.panels[0].section?.id || null);
    for (const p of c.panels) {
      assert(p.texture, 'Current inscription stays visible through a phase change');
      assert.equal(p.face.material.depthTest, true, 'Buildings occlude inscriptions');
      assert.equal(p.face.material.depthWrite, true, 'Inscriptions have physical scene depth');
      assert.equal(p.face.material.side, THREE.FrontSide, 'No floating reverse-side writing');
      assert(p.face.material.isMeshStandardMaterial, 'Stone receives ordinary scene lighting');
      assert(!p.face.onBeforeRender.toString().includes('lookAt'), 'No camera billboard');
      const text = p.texture.image.text.join('');
      assert(!/点选|续读|进入阅读/.test(text), 'No clickable reader cue');
      assert(p.section && c.content.sections.includes(p.section), 'Source section is reviewed local content');
      assert(!/^(source-note|sources|external-sources|photo-notes)$/.test(p.section.id), 'Private source notes never become decorative prose');
      assert.equal(p.face.userData.readingPanel.sectionId, p.section.id, 'Surface source ID follows the phase');
      if (c.content.unavailable) {
        assert(['entry', 'identity', 'unknown', 'boundary'].includes(p.section.id), 'Login-only section allowlist');
        assert(text.includes('仅入口'), 'Login-only coverage stays explicit');
      }
    }
    const textures = c.panels.map(p => p.texture);
    c.setPhase(phase);
    assert(c.panels.every((p, n) => p.texture === textures[n]), 'Repeated phase does not allocate textures');
    assert.deepEqual(c.panels.map(p => ({position: p.group.position.toArray(), rotation: p.group.rotation.toArray()})),
      transforms, 'Text changes never move the architecture');
    actual.phases++;
  }
  assert.equal(new Set(phaseSections).size, 3, 'All three architectural options select distinct source sections: ' + index);
  const selected = c.content.sections.find(s => s.excerpt && !/^(source-note|sources|external-sources|photo-notes)$/.test(s.id));
  assert.equal(c.setSection(selected.id), c);
  assert.equal(c.panels[0].section.id, selected.id, 'A chosen chapter appears on the physical stone');
  const beforeMissing = c.panels[0].texture;
  assert.equal(c.setSection('never-collected-private-data'), false, 'Unknown section reports failure');
  assert.equal(c.panels[0].texture, beforeMissing, 'Unknown section never substitutes invented content');
  c.setPhase(0);
  api.update([b], new THREE.Vector3(-1000, 0, -1000));
  assert(c.panels.every(p => !p.texture), 'Phase-switched textures release when leaving');
  actual.panels += c.panels.length;
  actual.wallLeaves += c.panels.filter(p => p.placement.kind === 'wall').length;
  actual.lowBookRests += c.panels.filter(p => p.placement.kind === 'book-rest').length;
}
// Explicit action-selected source notes must repaint the body rather than
// quietly succeeding with an unchanged ordinary phase section.
for (const index of [13, 14, 15]) {
  const b = context.CourtyardArchitecture.build({THREE, index, title: 'Source notes', zone: 2});
  const c = api.attach({THREE, building: b, index, preview: context.CourtyardReadingCatalog[index]});
  api.update([b], new THREE.Vector3(c.panels[0].placement.x, 1.7, c.panels[0].placement.z));
  const before = c.panels[0].texture.image.text.join('');
  assert.equal(c.setSection('source-note'), c, 'Known source-note action succeeds: ' + index);
  assert.equal(c.selectedSectionId, 'source-note');
  assert.equal(c.panels[0].face.userData.readingPanel.sectionId, 'source-note');
  assert.notEqual(c.panels[0].texture.image.text.join(''), before, 'Source-note body actually changes: ' + index);
  assert(c.panels[0].texture.image.text.join('').includes('原页出处说明'));
  assert.equal(c.setSection('not-a-known-source'), false);
  api.update([b], new THREE.Vector3(-1000, 0, -1000));
}

// The authored Moon Snow garden is adapted in place. It keeps its initial four
// quotations and texture objects until an explicit interaction changes one.
new vm.Script(fs.readFileSync(path.join(root, 'assets/moonsnow-detail.js'), 'utf8')).runInContext(context);
new vm.Script(fs.readFileSync(path.join(root, 'assets/moon-snow-garden.js'), 'utf8')).runInContext(context);
const moon = context.CourtyardArchitecture.build({THREE, index: 20, title: 'Moon Snow', zone: 2});
const moonMeshes = [];
moon.root.traverse(o => { if (o.userData.readingPanel?.index === 20) moonMeshes.push(o); });
const initialMoon = moonMeshes.map(face => ({face, texture: face.material.map, words: face.material.map.image.text.join(''),
  position: face.position.toArray(), rotation: face.rotation.toArray(), material: face.material, geometry: face.geometry}));
const originalChildren = moon.root.children.length, originalBoxes = moon.collisionBoxes.slice(), originalCanvases = canvases.length;
const moonController = api.attach({THREE, building: moon, index: 20, preview: context.CourtyardReadingCatalog[20]});
assert(moonController?.integrated, 'Moon Snow exposes an integrated controller');
assert.equal(moonController.panels.length, 4, 'Exactly four existing physical inscriptions reused');
assert.equal(moonController.selectedSectionId, null, 'Attaching does not select or repaint a chapter');
assert.equal(canvases.length, originalCanvases, 'No extra integrated canvases allocated');
for (const before of initialMoon) {
  assert.equal(before.face.material.map, before.texture, 'Original texture identity preserved');
  assert.equal(before.face.material.map.image.text.join(''), before.words, 'Original first render preserved');
}
const moonDraw = () => moonMeshes.map(face => face.material.map.image.text.join('')).join('\n');
const selectedMoon = [];
for (const section of context.CourtyardReadingCatalog[20].sections) {
  const before = moonDraw();
  assert.equal(moonController.setSection(section.id), moonController, 'Known anonymized chapter succeeds: ' + section.id);
  assert.equal(moonController.selectedSectionId, section.id);
  assert.equal(moonController.activePanel.face.userData.readingPanel.sectionId, section.id);
  assert.notEqual(moonDraw(), before, 'Actual integrated body changes: ' + section.id);
  assert.equal(moonController.activePanel.face.userData.inscriptionState.excerpt, section.excerpt.replace(/\s+/g, ' ').trim(), 'Only anonymized catalog text used');
  const same = moonDraw(); moonController.setSection(section.id);
  assert.equal(moonDraw(), same, 'Repeated chapter is idempotent');
  selectedMoon.push(section.id);
}
assert.equal(new Set(selectedMoon).size, 12, 'All twelve known anonymized sections supported');
// Mirror the warmed state left by the 78-action visual harness. Re-selecting
// preface/c5/c7 is correctly idempotent, then a same-surface alternate must repaint.
for (const id of ['preface', 'c5', 'c7']) {
  moonController.setSection(id); const stable = moonDraw();
  moonController.setSection(id); assert.equal(moonDraw(), stable, 'Warm repeated selection stays stable '+id);
  const other = {preface:'c1',c5:'c6',c7:'c8'}[id];moonController.setSection(other);
  const alternate = moonDraw();moonController.setSection(id);
  assert.notEqual(moonDraw(), alternate, 'Same-surface alternate proves real content change '+id);
}
const finalMoonWords = moonDraw();
assert.equal(moonController.setSection('unknown-private-person'), false, 'Unknown integrated section reports failure');
assert.equal(moonDraw(), finalMoonWords, 'Unknown section cannot alter visible text');
api.update([moon], new THREE.Vector3(-1000, 0, -1000));
assert.equal(moonDraw(), finalMoonWords, 'Distance updates do not erase authored garden text');
for (const phase of [0, 1, 2]) assert.equal(moonController.setPhase(phase), moonController);
for (const before of initialMoon) {
  assert.equal(before.face.material.map, before.texture, 'Changes reuse the original bounded texture');
  assert.equal(before.face.material, before.material, 'Lighting and depth material unchanged');
  assert.equal(before.face.geometry, before.geometry, 'No new inscription geometry');
  assert.deepEqual(before.face.position.toArray(), before.position, 'Fixed-world inscription position');
  assert.deepEqual(before.face.rotation.toArray(), before.rotation, 'No camera billboard');
}
assert.equal(moon.root.children.length, originalChildren);
assert.deepEqual(moon.collisionBoxes, originalBoxes, 'Integrated controller never changes routes or colliders');
assert.equal(canvases.length, originalCanvases, 'All chapter changes remain at four existing canvases');
moonController.dispose(); assert.equal(moon.readingPanels, null);
assert(moonMeshes.every(face => face.parent && face.material.map), 'Disposal leaves authored scene intact');

console.log(JSON.stringify({passed: true, explicitSourceNotes: 3, integratedSections: selectedMoon.length, buildings: rows.length, panels: rows.reduce((s, r) => s + r.count, 0),
  chapterStops: rows.reduce((s, r) => s + r.placement.filter(p => p.sectionId).length, 0),
  wallLeaves: rows.reduce((s, r) => s + r.placement.filter(p => p.kind === 'wall').length, 0),
  lowBookRests: rows.reduce((s, r) => s + r.placement.filter(p => p.kind === 'book-rest').length, 0), actualCatalog: actual, rows}, null, 2));
