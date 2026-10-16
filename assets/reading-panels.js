/* Source-backed architectural inscriptions. Attach before Runtime.register/navigation.
 * Text belongs to a fixed wall or stone reading rest, with normal scene occlusion.
 * API: attach({THREE, building, index, entry, preview}) -> controller
 *      controller.setPhase(0|1|2), controller.setSection(sectionId)
 *      update(records, playerOrPosition). Records may be buildings or controllers.
 * preview: {title, summary, coverage, sections:[{id,title,excerpt}]}; no source fetches.
 * Only already-reviewed, privacy-edited local text is used. Never a camera billboard.
 */
(function (global) {
  'use strict';
  const shared = new WeakMap();
  const BODY_RADIUS = .38, BODY_HEIGHT = 1.7, FOOT_Y = .045;
  const WIDTH = 1.04, HEIGHT = 1.30, CENTER_Y = 1.57, THICKNESS = .065;
  const TEXTURE_WIDTH = 640, TEXTURE_HEIGHT = 800;
  const MAX_PANELS = 2, MAX_TEXTURES = 18, TEXT_DISTANCE = 18;
  const WALL = Object.freeze({width: 1.12, height: 1.40, y: 1.52, thickness: .065, tilt: 0, border: .035});
  const BOOK = Object.freeze({width: .98, height: 1.225, y: .99, thickness: .075, tilt: -Math.PI * .34, border: .035});
  // The existing butterfly plaque keeps its original dimensions and mounting.
  const ORIGINAL = Object.freeze({width: WIDTH, height: HEIGHT, y: CENTER_Y, thickness: THICKNESS, tilt: 0, border: .09});
  const dimensions = placement => placement.kind === 'book-rest' ?
    (Number.isFinite(placement.centerY) ? {...BOOK, y: placement.centerY} : BOOK) : placement.kind === 'mounted' ? ORIGINAL : WALL;
  const clean = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

  function resources(T) {
    if (shared.has(T)) return shared.get(T);
    const material = color => {
      const m = new T.MeshStandardMaterial({color, roughness: .9});
      m.color.convertSRGBToLinear(); return m;
    };
    // Two slim tapered cheeks carry the sloping book all the way down to its foot.
    // Their upper edges meet the underside of the real tilted board.
    const restSupport = new T.BoxGeometry(.085, 1, .64), position = restSupport.attributes.position;
    for (let n = 0; n < position.count; n++) position.setY(n, position.getY(n) > 0 ?
      position.getZ(n) * Math.cos(BOOK.tilt) / Math.sin(BOOK.tilt) - BOOK.thickness / (2 * -Math.sin(BOOK.tilt)) :
      FOOT_Y + .065 - BOOK.y);
    position.needsUpdate = true; restSupport.computeVertexNormals(); restSupport.computeBoundingBox();
    const r = {box: new T.BoxGeometry(1, 1, 1), plane: new T.PlaneGeometry(1, 1), restSupport,
      wood: material(0x9e9b87), foot: material(0x898c7c)};
    shared.set(T, r); return r;
  }

  function normalize(preview, entry, index) {
    preview = preview || {}; entry = entry || {};
    const coverage = clean(preview.coverage?.label || preview.coverage?.status || preview.coverage);
    const unavailable = preview.available === false || preview.entranceOnly === true ||
      /^(unknown|unavailable|entrance[- ]only|login[- ]required|unreadable|blocked|failed)$/i.test(coverage) ||
      /仅入口|入口页|未读取|未核实|不可读|无法读取|登录后/.test(coverage);
    const seen = new Set();
    const publicEntranceSections = {8: ['entry', 'unknown', 'boundary'], 9: ['entry', 'identity', 'boundary'], 11: ['identity', 'unknown', 'boundary']}[index] || [];
    const sections = (preview.sections || preview.headings || []).map(section => {
      if (!section || typeof section !== 'object') return null;
      const id = clean(section.id || section.sectionId);
      const title = clean(section.title || section.heading || section.label);
      if (!id || !title || seen.has(id) || (unavailable && !publicEntranceSections.includes(id))) return null;
      seen.add(id); return {id, title, excerpt: clean(section.excerpt || section.summary || section.text || (section.paragraphs || []).join(' '))};
    }).filter(Boolean);
    const summary = clean(preview.summary || preview.excerpt);
    return {title: clean(preview.title || entry.title) || '阅读入口', summary,
      coverage, sections, unavailable: unavailable || (!summary && !sections.length)};
  }

  // Exact segment/expanded-AABB clipping, also used for the declared side routes.
  function segmentBlocked(a, b, box, radius, height) {
    if (box.min.y >= FOOT_Y + (height || BODY_HEIGHT) || box.max.y <= FOOT_Y + .12) return false;
    let near = 0, far = 1;
    for (const [axis, n] of [['x', 0], ['z', 1]]) {
      const delta = b[n] - a[n], lo = box.min[axis] - radius, hi = box.max[axis] + radius;
      if (Math.abs(delta) < 1e-9) { if (a[n] < lo || a[n] > hi) return false; }
      else {
        let p = (lo - a[n]) / delta, q = (hi - a[n]) / delta;
        if (p > q) [p, q] = [q, p];
        near = Math.max(near, p); far = Math.min(far, q);
        if (near > far) return false;
      }
    }
    return true;
  }

  function objectBounds(T, object, root) {
    root.updateWorldMatrix(true, true);
    const box = new T.Box3(), inverse = root.matrixWorld.clone().invert(), matrix = new T.Matrix4();
    object.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      if (o.isInstancedMesh) for (let n = 0; n < o.count; n++) {
        o.getMatrixAt(n, matrix); matrix.premultiply(o.matrixWorld).premultiply(inverse);
        box.union(o.geometry.boundingBox.clone().applyMatrix4(matrix));
      } else box.union(o.geometry.boundingBox.clone().applyMatrix4(matrix.multiplyMatrices(inverse, o.matrixWorld)));
    });
    return box;
  }

  function mechanismBounds(T, building) {
    const boxes = [];
    for (const mechanism of building.mechanisms || []) {
      if (!mechanism.object) continue;
      const box = new T.Box3(), restore = Number.isFinite(mechanism.openness) ? mechanism.openness : 0;
      // The builders' update(v) contract snaps to v when dt is omitted.
      if (typeof mechanism.update === 'function') {
        for (const phase of [0, .25, .5, .75, 1]) {
          mechanism.update(phase); box.union(objectBounds(T, mechanism.object, building.root));
        }
        mechanism.update(restore);
      } else box.copy(objectBounds(T, mechanism.object, building.root));
      if (!box.isEmpty()) boxes.push(box.expandByScalar(.25));
    }
    return boxes;
  }

  function panelBounds(T, placement, stand) {
    const d = dimensions(placement), matrix = new T.Matrix4().makeRotationY(placement.yaw);
    matrix.setPosition(placement.x, d.y, placement.z);
    const boardMatrix = matrix.clone().multiply(new T.Matrix4().makeRotationX(d.tilt));
    const box = new T.Box3(new T.Vector3(-d.width / 2, -d.height / 2, -d.thickness / 2),
      new T.Vector3(d.width / 2, d.height / 2, d.thickness / 2)).applyMatrix4(boardMatrix);
    if (stand) {
      const baseY = placement.baseY ?? FOOT_Y;
      box.union(new T.Box3(new T.Vector3(-.41, baseY - d.y, -.43),
        new T.Vector3(.41, baseY + .065 - d.y, .43)).applyMatrix4(matrix));
    }
    return box;
  }

  function routesFor(building, index) {
    const routes = (building.metadata?.visitorRoutes || []).slice();
    if (index === 24) routes.push({name: 'clinician-side-passage', points: [[8.75, -9.5], [8.75, 9.5]], bodyRadius: BODY_RADIUS});
    return routes;
  }

  function validPlacement(T, building, placement, stand, mechanisms, routes, host) {
    const box = panelBounds(T, placement, stand);
    // Preserve the complete 3.6 m passage, including body clearance at its edges.
    if (box.min.x < 1.8 + BODY_RADIUS && box.max.x > -1.8 - BODY_RADIUS) return false;
    for (const route of routes) for (let n = 1; n < route.points.length; n++)
      if (segmentBlocked(route.points[n - 1], route.points[n], box, route.bodyRadius || BODY_RADIUS)) return false;
    if (mechanisms.some(m => m.intersectsBox(box))) return false;
    if (building.collisionBoxes.some(b => b !== host && b.intersectsBox(box))) return false;
    const normal = [Math.sin(placement.yaw), Math.cos(placement.yaw)];
    const distance = stand ? 1.35 : 1.45;
    const view = [placement.x + normal[0] * distance, placement.z + normal[1] * distance];
    const obstacles = building.collisionBoxes.concat(mechanisms, box);
    if (obstacles.some(b => segmentBlocked(view, view, b, BODY_RADIUS, 2.9))) return false;
    if (stand) {
      // Low book rest and its comfortable viewing position stay on the r=15 terrace.
      for (const x of [box.min.x - BODY_RADIUS, box.max.x + BODY_RADIUS])
        for (const z of [box.min.z - BODY_RADIUS, box.max.z + BODY_RADIUS])
          if (Math.hypot(x, z) > 14.75) return false;
      if (Math.hypot(view[0], view[1]) + BODY_RADIUS > 14.75) return false;
    }
    // A verified unobstructed approach must connect the stop to the main passage
    // or a declared side route. No attractive, unreachable boards behind tables.
    const starts = [[0, view[1]], [0, -building.depth / 2 - .8]];
    for (const route of routes) for (const point of route.points) starts.push(point);
    if (!starts.some(start => !obstacles.some(b => segmentBlocked(start, view, b, BODY_RADIUS)))) return false;
    placement.view = view; placement.host = host || null; return true;
  }

  function chooseEntrance(T, building, mechanisms, routes) {
    // Open pavilions without a suitable solid wall receive a low stone rest
    // in a verified side bay. It is never planted in the central walking route.
    const halfDepth = building.depth / 2, halfWidth = building.width / 2;
    for (const z of [-halfDepth + 2.2, 0, halfDepth - 2.2, -halfDepth + 4.1, halfDepth - 4.1])
      for (const side of [1, -1]) for (const x of [3.15, 4.6, 6.1]) {
        if (x + BOOK.width / 2 + BODY_RADIUS > halfWidth) continue;
        const p = {x: side * x, z, yaw: -side * Math.PI / 2, kind: 'book-rest', interior: true};
        if (validPlacement(T, building, p, true, mechanisms, routes)) return p;
      }
    // Narrower furnished rooms need a finer search between existing columns.
    // All candidates still go through the same route, standing and sweep tests.
    for (let z = -halfDepth + 1.2; z <= halfDepth - 1.2; z += .7)
      for (let x = 2.95; x <= Math.min(8, halfWidth - .95); x += .6)
        for (const side of [1, -1]) for (const yaw of [-side * Math.PI / 2, Math.PI, 0]) {
          const p = {x: side * x, z, yaw, kind: 'book-rest', interior: true};
          if (validPlacement(T, building, p, true, mechanisms, routes)) return p;
        }
    // A densely furnished workshop can carry the same reading stone on a
    // fixed worktable, at the aisle-facing edge. This adds no floor obstruction
    // and never borrows a moving drawer, private screen or glass pane.
    const tables = building.collisionBoxes.filter(host => host.userData?.part === 'worktable')
      .sort((a, b) => Math.abs(a.min.z + a.max.z) - Math.abs(b.min.z + b.max.z));
    for (const host of tables) {
      if (host.max.y > 1.12 || host.max.y < .72) continue;
      const size = host.getSize(new T.Vector3()), center = host.getCenter(new T.Vector3());
      if (size.x < 1.3 || size.z < BOOK.width + .2 || Math.abs(center.x) < 3) continue;
      const side = center.x < 0 ? -1 : 1, baseY = host.max.y + .002;
      const p = {x: side < 0 ? host.max.x - .57 : host.min.x + .57, z: center.z,
        yaw: -side * Math.PI / 2, kind: 'book-rest', interior: true,
        mountedOn: 'worktable', baseY, centerY: baseY + .38};
      if (validPlacement(T, building, p, true, mechanisms, routes, host)) return p;
    }
    const front = Math.min(-halfDepth, ...building.collisionBoxes.map(b => b.min.z));
    for (const offset of [1.0, 1.5, 2.0]) for (const side of [1, -1]) for (const x of [3.2, 4.25, 5.25]) {
      const p = {x: side * x, z: front - offset, yaw: Math.PI, kind: 'book-rest'};
      if (validPlacement(T, building, p, true, mechanisms, routes)) return p;
    }
    return null;
  }

  function chooseWalls(T, building, mechanisms, routes) {
    const candidates = [], y0 = WALL.y - WALL.height / 2, y1 = WALL.y + WALL.height / 2;
    for (const host of building.collisionBoxes) {
      const name = host.userData?.part || '';
      // Solid walls only. Glass, machinery, furniture, curved jambs, art and the
      // angled source-reading plane are deliberately excluded from mounting.
      if (!/wall|source-reading-plane|content-screen/.test(name) || /window|glass|sill|mullion/.test(name)) continue;
      if (host.min.y > y0 - .02 || host.max.y < y1 + .02) continue;
      const size = host.getSize(new T.Vector3()), center = host.getCenter(new T.Vector3());
      let axis, length, yaw, normal;
      if (size.x <= .32 && size.z >= WALL.width + .2) {
        axis = 'z'; length = size.z; normal = center.x < 0 ? 1 : -1; yaw = normal * Math.PI / 2;
      } else if (size.z <= .32 && size.x >= WALL.width + .2) {
        axis = 'x'; length = size.x; normal = center.z < 0 ? 1 : -1; yaw = normal > 0 ? 0 : Math.PI;
      } else continue;
      const span = Math.min((length - WALL.width) / 2 - .08, 2.1);
      for (const along of [0, -span, span]) {
        const p = {x: center.x, z: center.z, yaw, kind: 'wall', wallPart: name};
        p[axis] += along;
        const perpendicular = axis === 'z' ? 'x' : 'z';
        p[perpendicular] = (normal > 0 ? host.max[perpendicular] : host.min[perpendicular]) + normal * (WALL.thickness / 2 + .006);
        if (validPlacement(T, building, p, false, mechanisms, routes, host)) candidates.push(p);
      }
    }
    // Prefer different walls deeper in the room over repeated boards on one wall.
    candidates.sort((a, b) => a.z - b.z || Math.abs(a.x) - Math.abs(b.x));
    const selected = [];
    for (const p of candidates) {
      if (selected.some(q => q.host === p.host || Math.hypot(q.x - p.x, q.z - p.z) < 4)) continue;
      selected.push(p); if (selected.length === MAX_PANELS) break;
    }
    return selected;
  }

  function lines(context, value, maxWidth, maxLines) {
    const chars = Array.from(clean(value)), result = []; let line = '';
    for (let n = 0; n < chars.length; n++) {
      const next = line + chars[n];
      if (line && context.measureText(next).width > maxWidth) {
        result.push(line); line = chars[n];
        if (result.length === maxLines) {
          let last = result[maxLines - 1];
          while (last && context.measureText(last + '…').width > maxWidth) last = Array.from(last).slice(0, -1).join('');
          result[maxLines - 1] = last + '…'; return result;
        }
      } else line = next;
    }
    if (line) result.push(line);
    return result;
  }

  // Match the three architectural positions to the text that actually informs
  // them. Values are existing section IDs, never invented replacement prose.
  const PHASE_SECTIONS = Object.freeze({
    0: ['generation', 'annotation', 'archive'],
    1: ['collection', 'mask', 'parameters'],
    2: ['same-platform', 'shared-content', 'boundary'],
    3: ['whole-picture', 'four-stages', 'boundary'],
    4: ['family-desk', 'messages', 'two-sides'],
    5: ['connected', 'four-actions', 'roles'],
    6: ['input', 'editing', 'boundary'],
    7: ['patent', 'classification', 'archive'],
    10: ['gateway', 'three-steps', 'metrics'],
    12: ['privacy', 'events', 'local-demo'],
    13: ['s1', 's6', 's10'],
    14: ['biography-01', 'biography-06', 'biography-12'],
    15: ['chapter-01', 'causal-diagram', 'chapter-03'],
    16: ['c4', 'c5', 'c11'],
    17: ['o1', 'o2', 'o8'],
    18: ['c1', 'version-tree', 'c8'],
    19: ['s03-', 's05-', 's12-'],
    21: ['draft', 'revision', 'outside-page'],
    22: ['case-upload', 'case-discovery', 'report-limits'],
    23: ['chapter-1', 'chapter-4', 'chapter-6'],
    24: ['daily', 'time', 'local'],
    25: ['catalog', 'research', 'rights']
  });

  function readableSections(content) {
    return content.sections.filter(s => s.excerpt && !/^(source-note|sources|external-sources|photo-notes)$/.test(s.id));
  }

  function phaseSections(controller, phase) {
    const sections = readableSections(controller.content);
    if (!sections.length) return [];
    const id = PHASE_SECTIONS[controller.index]?.[phase];
    const chosen = (id && sections.find(s => s.id === id || (id.endsWith('-') && s.id.startsWith(id)))) ||
      sections[Math.min(sections.length - 1, Math.floor(phase * sections.length / 3))];
    const next = sections[(sections.indexOf(chosen) + 1) % sections.length];
    return chosen === next ? [chosen] : [chosen, next];
  }

  function textureFor(T, panel, content) {
    const canvas = global.document.createElement('canvas');
    canvas.width = TEXTURE_WIDTH; canvas.height = TEXTURE_HEIGHT;
    const c = canvas.getContext('2d'); if (!c) return null;
    const margin = 47, width = TEXTURE_WIDTH - margin * 2;
    c.fillStyle = '#dedbcc'; c.fillRect(0, 0, canvas.width, canvas.height);
    // A quiet mineral surface instead of an interface card or a sheet of paper.
    // Deterministic, bounded grain neither flickers nor allocates another texture.
    for (let n = 0; n < 280; n++) {
      c.fillStyle = n % 2 ? 'rgba(79,78,61,.045)' : 'rgba(255,255,246,.17)';
      c.fillRect((n * 137 + 19) % TEXTURE_WIDTH, (n * 211 + 43) % TEXTURE_HEIGHT, 1 + n % 3, 1);
    }
    c.textBaseline = 'top'; c.textAlign = 'left';
    const font = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","Noto Serif CJK SC","Noto Serif CJK JP",serif';
    const inscription = (text, x, y) => {
      c.fillStyle = '#f4f1e7'; c.fillText(text, x + 1, y + 1);
      c.fillStyle = '#26362f'; c.fillText(text, x, y);
    };
    c.font = '600 45px ' + font;
    const heading = lines(c, panel.section?.title || content.title, width, 3);
    heading.forEach((line, i) => inscription(line, margin, 45 + i * 58));
    const bodyY = 77 + heading.length * 58, footerY = 734;
    c.font = '38px ' + font;
    const body = panel.section ? panel.section.excerpt : content.summary;
    const fallback = content.unavailable ? '仅入口。原站须登录，庭内未收录账户内容。' : '此处保留作品题名。';
    // Excerpts come only from the reviewed local catalog. They may be abridged
    // to this physical stone, but are never rewritten as fictional quotations.
    const availableLines = Math.max(3, Math.floor((footerY - bodyY - 38) / 54));
    lines(c, content.unavailable && !panel.section ? fallback : (body || fallback), width, availableLines)
      .forEach((line, i) => inscription(line, margin, bodyY + i * 54));
    c.font = '24px ' + font; c.fillStyle = '#4d554a';
    const provenance = content.unavailable ? '仅入口 · 未收录私有内容' :
      /anonymized/.test(content.coverage) ? '匿名化改编 · 节录' :
      /privacy-edited/.test(content.coverage) ? '局部隐私处理 · 节录' :
      /summary/.test(content.coverage) ? '公开材料 · 摘述' : '作品原文 · 节录';
    c.fillText(provenance, margin, footerY);
    const texture = new T.CanvasTexture(canvas);
    texture.encoding = T.sRGBEncoding; texture.minFilter = T.LinearFilter;
    texture.magFilter = T.LinearFilter; texture.generateMipmaps = false;
    return texture;
  }

  function createPanel(T, building, resources, placement, section, ordinal, content, index) {
    const d = dimensions(placement);
    const group = new T.Group(); group.name = 'readable-' + placement.kind + '-' + index + '-' + ordinal;
    group.position.set(placement.x, d.y, placement.z); group.rotation.y = placement.yaw; building.root.add(group);
    const colliders = [], meshPart = (name, material, x, y, z, w, h, depth, tilt, geometry) => {
      geometry = geometry || resources.box;
      const mesh = new T.Mesh(geometry, material); mesh.name = name;
      mesh.position.set(x, y, z); mesh.scale.set(w, h, depth); mesh.rotation.x = tilt || 0;
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh); mesh.updateMatrix(); group.updateMatrix();
      const matrix = group.matrix.clone().multiply(mesh.matrix);
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const box = geometry.boundingBox.clone().applyMatrix4(matrix);
      box.userData = {architectural: true, readingPanel: true, index, part: name};
      building.collisionBoxes.push(box); colliders.push(box); return mesh;
    };
    // A shallow stone tablet is carried by the wall or a fitted low stone rest.
    meshPart('reading-panel-backing', resources.wood, 0, 0, 0, d.width, d.height, d.thickness, d.tilt);
    if (placement.kind === 'book-rest') {
      let support = resources.restSupport;
      const baseY = placement.baseY ?? FOOT_Y;
      if (placement.mountedOn === 'worktable') {
        support = resources.restSupport.clone();
        const vertices = support.attributes.position;
        for (let n = 0; n < vertices.count; n++)
          if (vertices.getY(n) < -.7) vertices.setY(n, baseY + .065 - d.y);
        vertices.needsUpdate = true; support.computeVertexNormals(); support.computeBoundingBox();
        group.userData.ownedGeometry = support;
      }
      for (const x of [-.30, .30])
        meshPart('reading-rest-support', resources.wood, x, 0, 0, 1, 1, 1, 0, support);
      meshPart('reading-rest-foot', resources.foot, 0, baseY + .0325 - d.y, 0, .82, .065, .86);
    }
    const material = new T.MeshStandardMaterial({color: 0xdedbcc, roughness: 1, metalness: 0,
      depthTest: true, depthWrite: true, side: T.FrontSide});
    material.color.convertSRGBToLinear();
    const face = new T.Mesh(resources.plane, material); face.name = 'architectural-inscription-face';
    face.scale.set(d.width - d.border, d.height - d.border, 1); face.rotation.x = d.tilt;
    const offset = d.thickness / 2 + .001;
    face.position.set(0, -Math.sin(d.tilt) * offset, Math.cos(d.tilt) * offset);
    face.userData.readingPanel = {index, sectionId: section ? section.id : null};
    face.userData.architecturalInscription = true;
    group.add(face);
    return {group, face, placement, colliders, section, ordinal,
      sectionNumber: section ? content.sections.indexOf(section) + 1 : 0, texture: null};
  }

  function setText(controller, panel, active) {
    if (active && !panel.texture) {
      panel.texture = textureFor(controller.THREE, panel, controller.content);
      if (!panel.texture) return;
      panel.face.material.color.set(0xffffff); panel.face.material.map = panel.texture; panel.face.material.needsUpdate = true;
    } else if (!active && panel.texture) {
      panel.face.material.map = null; panel.face.material.color.set(0xdedbcc).convertSRGBToLinear();
      panel.face.material.needsUpdate = true; panel.texture.dispose(); panel.texture = null;
    }
  }

  function selectSections(controller, selected) {
    for (let n = 0; n < controller.panels.length; n++) {
      const panel = controller.panels[n], section = selected[n] || null;
      if (panel.section === section) continue;
      const active = !!panel.texture;
      setText(controller, panel, false);
      panel.section = section;
      panel.sectionNumber = section ? controller.content.sections.indexOf(section) + 1 : 0;
      panel.face.userData.readingPanel.sectionId = section?.id || null;
      if (active) setText(controller, panel, true);
    }
    controller.selectedSectionId = controller.panels[0]?.section?.id || null;
    const metadata = controller.building.metadata?.readingPanels;
    if (metadata) {
      metadata.phase = controller.phase;
      metadata.placement.forEach((p, i) => { p.sectionId = controller.panels[i].section?.id || null; });
    }
    return controller;
  }

  function addControls(controller, index) {
    controller.index = index; controller.phase = 0;
    controller.setPhase = function (phase) {
      const value = Number(phase);
      if (!Number.isFinite(value)) return this;
      this.phase = Math.max(0, Math.min(2, Math.round(value)));
      return selectSections(this, phaseSections(this, this.phase));
    };
    controller.setSection = function (id) {
      // Explicit selections may include reviewed source notes. Only automatic
      // phases omit those sections; a known action must not silently do nothing.
      const sections = this.content.sections.filter(s => s.excerpt), first = sections.find(s => s.id === id);
      if (!first) return false;
      const automatic = readableSections(this.content), n = automatic.indexOf(first);
      const next = automatic[(n + 1) % automatic.length];
      return selectSections(this, !next || next === first ? [first] : [first, next]);
    };
    return controller;
  }

  // The authored Moon Snow garden already has four transparent ink surfaces.
  // Reuse those exact canvases and textures: no generic boards, new geometry,
  // material changes, or camera-facing text are introduced by this adapter.
  function paintIntegrated(panel, section) {
    const canvas = panel.texture.image, c = canvas.getContext('2d');
    if (!c) return false;
    const cw = canvas.width, ch = canvas.height;
    const font = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","Noto Serif CJK SC","Noto Serif CJK JP",serif';
    c.clearRect(0, 0, cw, ch);
    c.fillStyle = '#222d2f'; c.textBaseline = 'top'; c.textAlign = 'left';
    const margin = Math.max(10, Math.round(cw * .065)), textWidth = cw - margin * 2;
    // Short, legible extracts keep each physical surface's established scale.
    // Vertical wall strips retain their vertical composition; desk paper stays
    // horizontal. Every displayed body character comes from the anonymized catalog.
    const vertical = ch > cw * 1.3;
    const titleSize = Math.max(13, Math.min(25, cw * .075));
    c.font = '600 ' + titleSize + 'px ' + font;
    const title = lines(c, section.title, textWidth, vertical ? 3 : 2);
    const titleStep = titleSize * 1.35;
    title.forEach((line, i) => c.fillText(line, margin, ch * .04 + i * titleStep));
    const bodyTop = ch * .055 + title.length * titleStep + 12, bodyBottom = ch * .86;
    if (vertical) {
      const size = Math.max(22, Math.min(32, cw * .15)), rowStep = size * 1.2;
      const rows = Math.max(1, Math.floor((bodyBottom - bodyTop) / rowStep));
      const columns = Math.max(1, Math.floor(textWidth / (size * 1.4)));
      const characters = Array.from(section.excerpt), capacity = rows * columns;
      const excerpt = characters.length > capacity ? characters.slice(0, capacity - 1).concat('…') : characters;
      c.font = '500 ' + size + 'px ' + font; c.textAlign = 'center';
      for (let n = 0; n < excerpt.length; n++) {
        const column = Math.floor(n / rows), row = n % rows;
        const x = cw / 2 + ((columns - 1) / 2 - column) * size * 1.4;
        c.fillText(excerpt[n], x, bodyTop + row * rowStep);
      }
    } else {
      const size = Math.max(22, Math.min(29, cw * .058)), step = size * 1.5;
      c.font = '500 ' + size + 'px ' + font;
      lines(c, section.excerpt, textWidth, Math.max(1, Math.floor((bodyBottom - bodyTop) / step)))
        .forEach((line, i) => c.fillText(line, margin, bodyTop + i * step));
    }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#685d4b';
    c.font = Math.max(11, Math.min(16, cw * .065)) + 'px ' + font;
    c.fillText('匿名化改编 · 节录', cw / 2, ch * .955);
    panel.texture.needsUpdate = true;
    panel.texture.userData.readingSource = '/?read=20#' + section.id;
    panel.section = section; panel.face.userData.readingPanel.sectionId = section.id;
    panel.face.userData.inscriptionState = {sectionId: section.id, excerpt: section.excerpt, coverage: 'anonymized'};
    return true;
  }

  function attachIntegrated({THREE: T, building, index, entry, preview}) {
    // The local anonymized catalog is the only content source for this garden.
    const content = normalize(preview, entry, index);
    if (index !== 20 || content.coverage !== 'anonymized') return null;
    const names = ['poem-in-the-entry-wall', 'self-cultivation-at-the-turn',
      'trust-on-the-working-paper', 'everyday-ending-beside-the-frame'];
    const faces = names.map(name => building.root.getObjectByName(name));
    if (faces.some(face => !face?.material?.map?.image?.getContext || face.userData.readingPanel?.index !== 20)) return null;
    const panels = faces.map((face, ordinal) => ({face, group: face, ordinal, texture: face.material.map, colliders: [],
      section: content.sections.find(s => s.id === face.userData.readingPanel.sectionId) || null,
      placement: {kind: 'integrated', x: face.position.x, z: face.position.z, yaw: face.rotation.y,
        view: [face.position.x, face.position.z], interior: true}, selectedSectionId: null}));
    const controller = {THREE: T, building, index, content, panels, faces, integrated: true, phase: null,
      activePanel: null, activeSectionId: null, selectedSectionId: null,
      setSection(id) {
        const section = this.content.sections.find(s => s.id === id && s.excerpt);
        if (!section) return false;
        const chapter = /^c(\d+)$/.exec(id), n = chapter ? Number(chapter[1]) : 0;
        const ordinal = id === 'source-note' || n === 10 ? 3 : n >= 7 ? 2 : n >= 5 ? 1 : 0;
        const panel = this.panels[ordinal];
        if (panel.selectedSectionId !== id && !paintIntegrated(panel, section)) return false;
        panel.selectedSectionId = id; this.activePanel = panel; this.activeSectionId = this.selectedSectionId = id;
        const metadata = building.metadata.readingPanels;
        metadata.activeSectionId = id; metadata.placement[ordinal].sectionId = id;
        return this;
      },
      setPhase(phase) {
        const value = Number(phase); if (!Number.isFinite(value)) return false;
        const next = Math.max(0, Math.min(2, Math.round(value)));
        const result = this.setSection(['c3', 'c6', 'c8'][next]);
        if (result) {this.phase = next; building.metadata.readingPanels.phase = next;}
        return result;
      },
      // Their four bounded textures belong to the authored garden and remain
      // mounted when far away or when this non-owning controller is detached.
      update() {},
      dispose() { if (building.readingPanels === this) building.readingPanels = null; }
    };
    building.readingPanels = controller;
    building.metadata.readingPanels = {count: panels.length, mode: 'integrated-inscriptions', initialPreserved: true,
      phase: null, entranceOnly: false, maxLiveTextures: 4, reusesAuthoredTextures: true,
      placement: panels.map(p => ({kind: 'integrated', x: p.placement.x, z: p.placement.z,
        yaw: p.placement.yaw, interior: true, sectionId: p.section?.id || null}))};
    return controller;
  }

  function attach({THREE: T, building, index, entry, preview}) {
    if (!building?.root || index === 23) return null;
    if (building.readingPanels) return building.readingPanels;
    if (index === 20 || building.metadata?.readingPanelMode === 'integrated')
      return attachIntegrated({THREE: T, building, index, entry, preview});
    const content = normalize(preview, entry, index), R = resources(T), mechanisms = mechanismBounds(T, building);
    const routes = routesFor(building, index), walls = chooseWalls(T, building, mechanisms, routes);
    // Existing walls carry the text where available. Open pavilions receive a
    // low, physically supported stone reading rest in a safe side bay.
    const placements = walls.length ? walls.slice(0, content.unavailable || !content.sections.length ? 1 : MAX_PANELS) : [];
    if (!placements.length) { const rest = chooseEntrance(T, building, mechanisms, routes); if (rest) placements.push(rest); }
    const controller = {THREE: T, building, content, panels: [], faces: [],
      update(player) { update([controller], player); },
      dispose() { for (const p of this.panels) { setText(this, p, false); p.face.material.dispose(); p.group.userData.ownedGeometry?.dispose(); p.group.parent?.remove(p.group); }
        const added = new Set(this.panels.flatMap(p => p.colliders));
        building.collisionBoxes = building.collisionBoxes.filter(b => !added.has(b));
        building.readingPanels = null; this.panels.length = this.faces.length = 0; }
    };
    for (const p of placements.slice(0, MAX_PANELS)) {
      const section = controller.panels.length > 0 ?
        (content.sections.find(s => !/^(opening|intro|introduction|overview)$/i.test(s.id)) || content.sections[0]) : null;
      const panel = createPanel(T, building, R, p, section, controller.panels.length, content, index);
      controller.panels.push(panel); controller.faces.push(panel.face);
    }
    building.readingPanels = controller;
    building.metadata = building.metadata || {};
    building.metadata.readingPanels = {count: controller.panels.length, entranceOnly: content.unavailable,
      mode: walls.length ? 'wall-inscriptions' : 'stone-reading-rest', phase: 0,
      textureSize: [TEXTURE_WIDTH, TEXTURE_HEIGHT], maxLiveTextures: MAX_TEXTURES,
      placement: controller.panels.map(p => ({kind: p.placement.kind, x: p.placement.x, z: p.placement.z,
        yaw: p.placement.yaw, view: p.placement.view, interior: p.placement.interior || walls.length > 0,
        mountedOn: p.placement.mountedOn || null, wallPart: p.placement.wallPart || null, sectionId: p.section?.id || null}))};
    addControls(controller, index).setPhase(0);
    building.root.updateWorldMatrix(true, true); return controller;
  }

  // A single plaque is carried by the existing outer viewing-frame post.
  // It is outside the causeway and never attached to the moving butterfly body.
  function attachButterfly({THREE: T, butterfly, index, entry, preview}) {
    if(!butterfly?.root)return null;
    const building={root:butterfly.root,collisionBoxes:[]},content=normalize(preview,entry,index);
    const placement={kind:'mounted',x:-10.884,z:37.654,yaw:Math.PI,view:[-10.884,36.5]};
    const panel=createPanel(T,building,resources(T),placement,null,0,content,index);
    const controller={THREE:T,building,content,panels:[panel],faces:[panel.face]};
    butterfly.sea.collisions.push({x:placement.x,z:placement.z,r:.56,h:CENTER_Y+HEIGHT/2});
    addControls(controller,index).setPhase(0);butterfly.readingPanels=controller;return controller;
  }

  function update(records, player) {
    if (!player) return;
    const position = player.position || player, candidates = [];
    for (const record of records || []) {
      const controller = record.readingPanels || (record.panels && record.building ? record : null);
      if (!controller || controller.integrated) continue;
      const local = controller.building.root.worldToLocal(new controller.THREE.Vector3(position.x, position.y || 0, position.z));
      for (const panel of controller.panels) candidates.push({controller, panel,
        distance: Math.hypot(local.x - panel.placement.x, local.z - panel.placement.z)});
    }
    candidates.sort((a, b) => a.distance - b.distance);
    let active = 0;
    for (let n = 0; n < candidates.length; n++) {
      const {controller, panel, distance} = candidates[n];
      const nearby = active < MAX_TEXTURES && distance < (panel.texture ? TEXT_DISTANCE + 5 : TEXT_DISTANCE);
      setText(controller, panel, nearby); if (nearby) active++;
    }
  }

  global.CourtyardReadingPanels = Object.freeze({attach, attachButterfly, update, version: '2.1.0',
    limits: Object.freeze({maxPanelsPerBuilding: MAX_PANELS, maxLiveTextures: MAX_TEXTURES,
      textureWidth: TEXTURE_WIDTH, textureHeight: TEXTURE_HEIGHT, bodyRadius: BODY_RADIUS})});
})(typeof window !== 'undefined' ? window : globalThis);
