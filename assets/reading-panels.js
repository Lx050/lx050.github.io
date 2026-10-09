/* Small, source-backed reading surfaces. Attach before Runtime.register/navigation.
 * Text is a nearby preview; the accessible DOM reader remains the full document.
 * API: attach({THREE, building, index, entry, preview}) -> controller
 *      update(records, playerOrPosition). Records may be buildings or controllers.
 * preview: {title, summary, coverage, sections:[{id,title,excerpt}]}; no source fetches.
 */
(function (global) {
  'use strict';
  const shared = new WeakMap();
  const BODY_RADIUS = .38, BODY_HEIGHT = 1.7, FOOT_Y = .045;
  const WIDTH = 1.04, HEIGHT = 1.30, CENTER_Y = 1.57, THICKNESS = .065;
  const TEXTURE_WIDTH = 512, TEXTURE_HEIGHT = 640;
  const MAX_PANELS = 2, MAX_TEXTURES = 18, TEXT_DISTANCE = 18;
  const WALL = Object.freeze({width: .72, height: .90, y: 1.52, thickness: .042, tilt: 0, border: .055});
  const BOOK = Object.freeze({width: .68, height: .85, y: .98, thickness: .042, tilt: -Math.PI * .34, border: .045});
  // The existing butterfly plaque keeps its original dimensions and mounting.
  const ORIGINAL = Object.freeze({width: WIDTH, height: HEIGHT, y: CENTER_Y, thickness: THICKNESS, tilt: 0, border: .09});
  const dimensions = placement => placement.kind === 'book-rest' ? BOOK : placement.kind === 'mounted' ? ORIGINAL : WALL;
  const clean = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

  function resources(T) {
    if (shared.has(T)) return shared.get(T);
    const material = color => {
      const m = new T.MeshStandardMaterial({color, roughness: .9});
      m.color.convertSRGBToLinear(); return m;
    };
    // Two slim tapered cheeks carry the sloping book all the way down to its foot.
    // Their upper edges meet the underside of the real tilted board.
    const restSupport = new T.BoxGeometry(.055, 1, .50), position = restSupport.attributes.position;
    for (let n = 0; n < position.count; n++) position.setY(n, position.getY(n) > 0 ?
      position.getZ(n) * Math.cos(BOOK.tilt) / Math.sin(BOOK.tilt) - BOOK.thickness / (2 * -Math.sin(BOOK.tilt)) :
      FOOT_Y + .065 - BOOK.y);
    position.needsUpdate = true; restSupport.computeVertexNormals(); restSupport.computeBoundingBox();
    const r = {box: new T.BoxGeometry(1, 1, 1), plane: new T.PlaneGeometry(1, 1), restSupport,
      wood: material(0x75674f), foot: material(0x929184)};
    shared.set(T, r); return r;
  }

  function normalize(preview, entry) {
    preview = preview || {}; entry = entry || {};
    const coverage = clean(preview.coverage?.label || preview.coverage?.status || preview.coverage);
    const unavailable = preview.available === false || preview.entranceOnly === true ||
      /^(unknown|unavailable|entrance[- ]only|login[- ]required|unreadable|blocked|failed)$/i.test(coverage) ||
      /仅入口|入口页|未读取|未核实|不可读|无法读取|登录后/.test(coverage);
    const seen = new Set();
    const sections = unavailable ? [] : (preview.sections || preview.headings || []).map(section => {
      if (!section || typeof section !== 'object') return null;
      const id = clean(section.id || section.sectionId);
      const title = clean(section.title || section.heading || section.label);
      if (!id || !title || seen.has(id)) return null;
      seen.add(id); return {id, title, excerpt: clean(section.excerpt || section.summary || section.text)};
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
    if (stand) box.union(new T.Box3(new T.Vector3(-.31, FOOT_Y - d.y, -.33),
      new T.Vector3(.31, .85 - d.y, .33)).applyMatrix4(matrix));
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
    const distance = stand ? .96 : 1.05;
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
    const front = Math.min(-building.depth / 2, ...building.collisionBoxes.map(b => b.min.z));
    for (const offset of [.62, 1.15, 1.7]) for (const side of [1, -1]) for (const x of [3.2, 4.25, 5.25]) {
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

  function textureFor(T, panel, content) {
    const canvas = global.document.createElement('canvas');
    canvas.width = TEXTURE_WIDTH; canvas.height = TEXTURE_HEIGHT;
    const c = canvas.getContext('2d'); if (!c) return null;
    const margin = 39, width = TEXTURE_WIDTH - margin * 2;
    c.fillStyle = '#ece4d1'; c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = '#bcb19a'; c.lineWidth = 1; c.strokeRect(19, 19, canvas.width - 38, canvas.height - 38);
    c.textBaseline = 'top'; c.textAlign = 'left';
    const font = '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
    c.font = '20px ' + font; c.fillStyle = '#726854';
    c.fillText(panel.section ? '节选' : '初读', margin, 40);
    c.fillStyle = '#283731'; c.font = '600 44px ' + font;
    const heading = lines(c, panel.section?.title || content.title, width, 3);
    heading.forEach((line, i) => c.fillText(line, margin, 91 + i * 57));
    const ruleY = 107 + heading.length * 57;
    c.fillStyle = '#9b8869'; c.fillRect(margin, ruleY, 52, 3);
    c.fillStyle = '#40483d'; c.font = '33px ' + font;
    const body = panel.section ? panel.section.excerpt : content.summary;
    const fallback = content.unavailable ? '此处保留原站入口。完整内容请进入原站查看。' : '进入阅读，继续查看这一章节。';
    lines(c, body || fallback, width, 3).forEach((line, i) => c.fillText(line, margin, ruleY + 33 + i * 49));
    // Detailed provenance, coverage and the chapter list live in the full reader.
    // The garden surface carries just a large heading, three lines and a quiet cue.
    c.fillStyle = '#726854'; c.font = '22px ' + font;
    c.fillText(content.unavailable ? '仅入口 · 点选查看' : '点选续读', margin, 583);
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
    // A narrow timber edge carries a small paper leaf, with no sign-like rails.
    meshPart('reading-panel-backing', resources.wood, 0, 0, 0, d.width, d.height, d.thickness, d.tilt);
    if (placement.kind === 'book-rest') {
      for (const x of [-.235, .235])
        meshPart('reading-rest-support', resources.wood, x, 0, 0, 1, 1, 1, 0, resources.restSupport);
      meshPart('reading-rest-foot', resources.foot, 0, FOOT_Y + .0325 - d.y, 0, .62, .065, .66);
    }
    const material = new T.MeshBasicMaterial({color: 0xece4d1, toneMapped: false});
    material.color.convertSRGBToLinear();
    const face = new T.Mesh(resources.plane, material); face.name = 'clickable-reading-face';
    face.scale.set(d.width - d.border, d.height - d.border, 1); face.rotation.x = d.tilt;
    const offset = d.thickness / 2 + .001;
    face.position.set(0, -Math.sin(d.tilt) * offset, Math.cos(d.tilt) * offset);
    face.userData.readingPanel = {index, sectionId: section ? section.id : null};
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
      panel.face.material.map = null; panel.face.material.color.set(0xece4d1).convertSRGBToLinear();
      panel.face.material.needsUpdate = true; panel.texture.dispose(); panel.texture = null;
    }
  }

  function attach({THREE: T, building, index, entry, preview}) {
    if (!building?.root || index === 23 || index === 20 || building.metadata?.readingPanelMode === 'integrated') return null;
    if (building.readingPanels) return building.readingPanels;
    const content = normalize(preview, entry), R = resources(T), mechanisms = mechanismBounds(T, building);
    const routes = routesFor(building, index), walls = chooseWalls(T, building, mechanisms, routes);
    // An existing wall carries the opening preview. Only a second useful source
    // section earns a second small leaf; no separate sign is planted in front.
    const placements = walls.length ? walls.slice(0, content.unavailable || !content.sections.length ? 1 : MAX_PANELS) : [];
    if (!placements.length) { const rest = chooseEntrance(T, building, mechanisms, routes); if (rest) placements.push(rest); }
    const controller = {THREE: T, building, content, panels: [], faces: [],
      update(player) { update([controller], player); },
      dispose() { for (const p of this.panels) { setText(this, p, false); p.face.material.dispose(); p.group.parent?.remove(p.group); }
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
      mode: walls.length ? 'existing-wall-leaves' : 'low-book-rest',
      textureSize: [TEXTURE_WIDTH, TEXTURE_HEIGHT], maxLiveTextures: MAX_TEXTURES,
      placement: controller.panels.map(p => ({kind: p.placement.kind, x: p.placement.x, z: p.placement.z,
        yaw: p.placement.yaw, view: p.placement.view, wallPart: p.placement.wallPart || null, sectionId: p.section?.id || null}))};
    building.root.updateWorldMatrix(true, true); return controller;
  }

  // A single plaque is carried by the existing outer viewing-frame post.
  // It is outside the causeway and never attached to the moving butterfly body.
  function attachButterfly({THREE: T, butterfly, index, entry, preview}) {
    if(!butterfly?.root)return null;
    const building={root:butterfly.root,collisionBoxes:[]},content=normalize(preview,entry);
    const placement={kind:'mounted',x:-10.884,z:37.654,yaw:Math.PI,view:[-10.884,36.5]};
    const panel=createPanel(T,building,resources(T),placement,null,0,content,index);
    const controller={THREE:T,building,content,panels:[panel],faces:[panel.face]};
    butterfly.sea.collisions.push({x:placement.x,z:placement.z,r:.56,h:CENTER_Y+HEIGHT/2});
    butterfly.readingPanels=controller;return controller;
  }

  function update(records, player) {
    if (!player) return;
    const position = player.position || player, candidates = [];
    for (const record of records || []) {
      const controller = record.readingPanels || (record.panels && record.building ? record : null);
      if (!controller) continue;
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

  global.CourtyardReadingPanels = Object.freeze({attach, attachButterfly, update, version: '1.1.0',
    limits: Object.freeze({maxPanelsPerBuilding: MAX_PANELS, maxLiveTextures: MAX_TEXTURES,
      textureWidth: TEXTURE_WIDTH, textureHeight: TEXTURE_HEIGHT, bodyRadius: BODY_RADIUS})});
})(typeof window !== 'undefined' ? window : globalThis);
