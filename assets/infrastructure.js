/* Courtyard infrastructure: built at human scale, with a clear public route.
 * No network requests, animation loops, application state, or GLB dependencies.
 * Front is local -Z; supplied collision boxes are local-space THREE.Box3 objects.
 */
(function (global) {
  'use strict';

  const caches = new WeakMap();
  const PI = Math.PI;
  function cacheFor(T) {
    if (!caches.has(T)) caches.set(T, { geometry: new Map(), materials: new Map(), labels: new Map() });
    return caches.get(T);
  }
  function geometry(T, key, make) {
    const store = cacheFor(T).geometry;
    if (!store.has(key)) store.set(key, make());
    return store.get(key);
  }
  function palette(T) {
    const store = cacheFor(T).materials;
    const specs = {
      limestone: [0xc7bca2, .89, 0], limestoneLight: [0xd3c8af, .88, 0],
      sandstone: [0xa49a83, .93, 0], mortar: [0x5b5b51, .97, 0],
      brick: [0x985a46, .92, 0], brickLight: [0xb47759, .9, 0],
      brickDark: [0x714e43, .96, 0], oak: [0x695038, .88, 0],
      oakEnd: [0x977453, .92, 0], walnut: [0x493c32, .9, 0],
      iron: [0x383f3d, .63, .66], bronze: [0xa58a52, .46, .68],
      patina: [0x477c72, .69, .46], copper: [0x6e8980, .65, .45],
      slate: [0x404c51, .81, .1], slateLight: [0x526069, .84, .08],
      vermilion: [0xad4632, .81, .04], vermilionLight: [0xc15a3f, .79, .03],
      paper: [0xddd0ab, .96, 0], ink: [0x443a2a, .91, 0],
      river: [0x346f75, .36, .32], glass: [0x8bb9ae, .22, .12],
      lamp: [0xd0aa65, .65, .12]
    };
    const out = {};
    Object.keys(specs).forEach(key => {
      if (!store.has(key)) {
        const s = specs[key], mat = new T.MeshStandardMaterial({ color: s[0], roughness: s[1], metalness: s[2] });
        mat.name = 'courtyard-infrastructure-' + key;
        mat.color.convertSRGBToLinear();
        if (key === 'glass') { mat.transparent = true; mat.opacity = .28; mat.depthWrite = false; mat.side = T.DoubleSide; }
        if (key === 'lamp') { mat.emissive.set(0xc7944b).convertSRGBToLinear(); mat.emissiveIntensity = .32; }
        mat.userData.monument = true;
        store.set(key, mat);
      }
      out[key] = store.get(key);
    });
    return out;
  }

  // Every repeated piece is packed by geometry, material, and detail tier.
  // Set frustumCulled=false for compatibility with THREE r128 instance bounds.
  function Builder(T, name) {
    this.T = T; this.m = palette(T); this.root = new T.Group(); this.root.name = name;
    this.detail = new T.Group(); this.detail.name = name + '-near-joinery'; this.root.add(this.detail);
    this.batches = new Map(); this.collisionBoxes = []; this.bounds = new T.Box3();
    this.unit = geometry(T, 'unit-box', () => new T.BoxGeometry(1, 1, 1));
    this.cyl = geometry(T, 'unit-cylinder-16', () => new T.CylinderGeometry(1, 1, 1, 16));
    this.hex = geometry(T, 'unit-hex-bolt', () => new T.CylinderGeometry(1, 1, 1, 6));
    this.ball = geometry(T, 'unit-sphere-20', () => new T.SphereGeometry(1, 20, 12));
  }
  Builder.prototype.part = function (geo, material, p, s, euler, fine, name) {
    const T = this.T, parent = fine ? this.detail : this.root;
    const mat = typeof material === 'string' ? this.m[material] : material;
    const q = euler && euler.isQuaternion ? euler : new T.Quaternion().setFromEuler(new T.Euler(...(euler || [0, 0, 0])));
    const matrix = new T.Matrix4().compose(new T.Vector3(...p), q, new T.Vector3(...s));
    const key = parent.id + ':' + geo.id + ':' + mat.id;
    if (!this.batches.has(key)) this.batches.set(key, { geo, mat, parent, rows: [], names: new Set() });
    const batch = this.batches.get(key); batch.rows.push(matrix); if (name) batch.names.add(name);
    if (!geo.boundingBox) geo.computeBoundingBox();
    this.bounds.union(geo.boundingBox.clone().applyMatrix4(matrix));
    return matrix;
  };
  Builder.prototype.box = function (mat, x, y, z, w, h, d, fine, ry, rz, name) {
    return this.part(this.unit, mat, [x, y, z], [w, h, d], [0, ry || 0, rz || 0], fine, name);
  };
  Builder.prototype.cylinder = function (mat, x, y, z, r, h, fine, rotation, name) {
    return this.part(this.cyl, mat, [x, y, z], [r, h, r], rotation, fine, name);
  };
  Builder.prototype.sphere = function (mat, x, y, z, r, fine) {
    return this.part(this.ball, mat, [x, y, z], [r, r, r], null, fine, 'mathematical-sphere');
  };
  Builder.prototype.beam = function (mat, from, to, width, depth, fine, round) {
    const T = this.T, a = new T.Vector3(...from), b = new T.Vector3(...to), v = b.clone().sub(a);
    if (v.length() < .0001) return;
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v.clone().normalize());
    this.part(round ? this.cyl : this.unit, mat, a.add(b).multiplyScalar(.5).toArray(), [width, v.length(), depth || width], q, fine, round ? 'round-rod' : 'structural-member');
  };
  Builder.prototype.bolt = function (x, y, z, r, axis, fine, mat) {
    const rotation = axis === 'x' ? [0, 0, PI / 2] : axis === 'y' ? [0, 0, 0] : [PI / 2, 0, 0];
    this.part(this.hex, mat || 'iron', [x, y, z], [r || .055, .048, r || .055], rotation, fine !== false, 'exposed-hex-fastener');
  };
  Builder.prototype.ring = function (mat, p, radius, tube, rotation, fine, arc) {
    const T = this.T, a = arc || PI * 2;
    const key = 'torus:' + tube / radius + ':' + a;
    const g = geometry(T, key, () => new T.TorusGeometry(1, tube / radius, 6, 40, a));
    this.part(g, mat, p, [radius, radius, radius], rotation, fine, 'turned-ring');
  };
  Builder.prototype.collider = function (x, y, z, w, h, d) {
    const T = this.T;
    this.collisionBoxes.push(new T.Box3(new T.Vector3(x - w / 2, y - h / 2, z - d / 2), new T.Vector3(x + w / 2, y + h / 2, z + d / 2)));
  };
  Builder.prototype.finish = function (metadata) {
    this.batches.forEach(batch => {
      const mesh = new this.T.InstancedMesh(batch.geo, batch.mat, batch.rows.length);
      batch.rows.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false;
      mesh.castShadow = batch.mat !== this.m.glass; mesh.receiveShadow = true;
      mesh.name = Array.from(batch.names).slice(0, 5).join(' / ') || batch.mat.name;
      mesh.userData.infrastructure = true; mesh.userData.instanceCount = batch.rows.length;
      batch.parent.add(mesh);
    });
    const size = this.bounds.getSize(new this.T.Vector3());
    this.root.userData.bounds = this.bounds.clone(); this.root.userData.collisionBoxes = this.collisionBoxes;
    this.root.userData.infrastructure = true; this.root.userData.metadata = metadata;
    this.detail.userData.hideBeyond = 95;
    return { root: this.root, detail: this.detail, collisionBoxes: this.collisionBoxes,
      height: size.y, width: size.x, depth: size.z, bounds: this.bounds.clone(), metadata };
  };

  function label(b, text, x, y, z, w, h, options) {
    const T = b.T, o = options || {};
    b.box(o.frame || 'bronze', x, y, z + .025, w + .14, h + .14, .085, false, o.rotation || 0, 0, 'cast-inscription-frame');
    if (typeof document === 'undefined' || !document.createElement) return;
    const key = text + ':' + (o.paper ? 'paper' : 'dark');
    const cache = cacheFor(T).labels;
    if (!cache.has(key)) {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 384;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.fillStyle = o.paper ? '#d6c7a4' : '#283b38'; ctx.fillRect(0, 0, 1024, 384);
      ctx.strokeStyle = o.paper ? '#897448' : '#a99565'; ctx.lineWidth = 4; if (ctx.strokeRect) ctx.strokeRect(17, 17, 990, 350);
      ctx.fillStyle = o.paper ? '#514331' : '#d7ca9a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lines = text.split('\n'); ctx.font = '52px Georgia, "Times New Roman", serif';
      lines.forEach((line, i) => ctx.fillText(line, 512, 192 + (i - (lines.length - 1) / 2) * 82, 940));
      const texture = new T.CanvasTexture(canvas); texture.encoding = T.sRGBEncoding;
      const material = new T.MeshStandardMaterial({ map: texture, roughness: .88, side: T.DoubleSide });
      material.userData.monument = true; cache.set(key, material);
    }
    const g = geometry(T, 'label-plane', () => new T.PlaneGeometry(1, 1));
    b.part(g, cache.get(key), [x, y, z - .023], [w, h, 1], [0, PI + (o.rotation || 0), 0], false, 'readable-mathematical-inscription');
  }

  function courses(b, x, z, w, d, h, material, options) {
    const o = options || {}, course = o.course || .28, block = o.block || .8, y0 = o.y || 0;
    const rows = Math.ceil(h / course), alongX = w >= d, length = alongX ? w : d;
    for (let row = 0; row < rows; row++) {
      const rowH = Math.min(course, h - row * course);
      let start = -length / 2;
      if (row % 2) {
        const len = Math.min(block / 2, length);
        b.box(material, x + (alongX ? start + len / 2 : 0), y0 + row * course + rowH / 2, z + (alongX ? 0 : start + len / 2), alongX ? len - .018 : w, rowH - .018, alongX ? d : len - .018, !!o.fine);
        start += len;
      }
      while (start < length / 2 - .001) {
        const len = Math.min(block, length / 2 - start), mat = o.alternate && ((row * 3 + Math.round(start * 5)) % 5 === 0) ? o.alternate : material;
        b.box(mat, x + (alongX ? start + len / 2 : 0), y0 + row * course + rowH / 2, z + (alongX ? 0 : start + len / 2), alongX ? len - .018 : w, rowH - .018, alongX ? d : len - .018, !!o.fine, 0, 0, 'staggered-masonry-courses');
        start += len;
      }
    }
  }
  function stonePier(b, x, z, height, width) {
    const w = width || .8;
    courses(b, x, z, w, w, height, 'limestone', { course: .34, block: w, alternate: 'sandstone' });
    b.box('sandstone', x, .12, z, w + .24, .24, w + .24);
    b.box('limestoneLight', x, height - .04, z, w + .28, .24, w + .28);
    b.collider(x, height / 2, z, w + .22, height, w + .22);
  }
  function arch(b, cx, z, spring, r, thickness, depth, mat) {
    const T = b.T, n = 13, da = PI / n;
    // True wedge voussoirs, with open joints instead of an opaque half-disc.
    for (let i = 0; i < n; i++) {
      const a = .012, end = da - .012;
      const key = 'voussoir:' + r + ':' + thickness + ':' + depth;
      const g = geometry(T, key, () => {
        const shape = new T.Shape();
        shape.moveTo(r * Math.cos(a), r * Math.sin(a));
        shape.lineTo((r + thickness) * Math.cos(a), (r + thickness) * Math.sin(a));
        shape.absarc(0, 0, r + thickness, a, end, false);
        shape.lineTo(r * Math.cos(end), r * Math.sin(end));
        shape.absarc(0, 0, r, end, a, true); shape.closePath();
        const out = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 2, steps: 1 });
        out.translate(0, 0, -depth / 2); return out;
      });
      b.part(g, mat || 'limestone', [cx, spring, z], [1, 1, 1], [0, 0, i * da], false, 'load-bearing-voussoir');
    }
    b.box('limestoneLight', cx, spring + r + thickness / 2, z - .025, thickness * .82, thickness * 1.23, depth + .08, true, 0, 0, 'proud-keystone');
  }
  function ringBand(b, mat, radius, width, height, y, steps, start, end) {
    const n = steps || 32, a0 = start === undefined ? 0 : start, a1 = end === undefined ? 2 * PI : end;
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i + .5) / n;
      const len = (a1 - a0) * radius / n;
      b.box(mat, Math.sin(a) * radius, y, Math.cos(a) * radius, len + .018, height, width, false, a, 0, 'radial-stone-entablature');
    }
  }
  function column(b, x, z, height, radius) {
    const r = radius || .43;
    b.box('sandstone', x, .14, z, r * 2.8, .28, r * 2.8);
    b.cylinder('limestone', x, .39, z, r * 1.2, .22);
    const shaft = height - .98, drum = shaft / 8;
    for (let i = 0; i < 8; i++) b.cylinder(i % 3 === 0 ? 'limestoneLight' : 'limestone', x, .52 + drum * (i + .5), z, r * (1 - .09 * i / 8), drum - .014);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * PI * 2;
      b.beam('sandstone', [x + Math.sin(a) * r * .983, .6, z + Math.cos(a) * r * .983], [x + Math.sin(a) * r * .916, height - .51, z + Math.cos(a) * r * .916], .012, .012, true, true);
    }
    b.cylinder('limestoneLight', x, height - .38, z, r * 1.17, .19);
    b.box('limestoneLight', x, height - .17, z, r * 2.75, .22, r * 2.75);
    b.collider(x, height / 2, z, r * 2.8, height, r * 2.8);
  }
  function roofSlope(b, mat, xa, ya, xb, yb, z, depth, fine) {
    const dx = xb - xa, dy = yb - ya;
    b.box(mat, (xa + xb) / 2, (ya + yb) / 2, z, Math.hypot(dx, dy), .14, depth, fine, 0, Math.atan2(dy, dx), 'folded-roof-panel');
  }
  function timberTruss(b, z, half, eave, ridge, mat) {
    const wood = mat || 'oak';
    b.beam(wood, [-half, eave, z], [0, ridge, z], .29, .30);
    b.beam(wood, [0, ridge, z], [half, eave, z], .29, .30);
    b.box(wood, 0, eave, z, half * 2, .3, .3);
    b.beam(wood, [0, eave, z], [0, ridge - .13, z], .22, .22);
    for (const sign of [-1, 1]) {
      b.beam(wood, [sign * half * .66, eave, z], [sign * half * .24, ridge - (ridge - eave) * .24, z], .18, .18);
      b.box('iron', sign * half * .69, eave, z - .165, .45, .43, .052, true);
      for (const yy of [-.12, .12]) b.bolt(sign * half * .69, eave + yy, z - .207, .045);
    }
    b.box('iron', 0, eave, z - .172, .39, .55, .06, true);
    b.bolt(0, eave - .13, z - .218, .055); b.bolt(0, eave + .13, z - .218, .055);
  }

  function konigsberg(T) {
    const b = new Builder(T, 'Konigsberg-seven-bridge-pavilion');
    // Twin stone stylobates leave the central crossing entirely at ground level.
    for (const s of [-1, 1]) {
      courses(b, s * 5.65, 0, 6.7, 13.3, .34, 'sandstone', { course: .17, block: 1.1 });
      courses(b, s * 8.5, 0, .62, 12.7, 1.16, 'limestone', { alternate: 'sandstone', course: .29 });
      b.box('limestoneLight', s * 8.5, 1.2, 0, .82, .17, 12.95);
      b.collider(s * 8.5, .66, 0, .84, 1.32, 13);
      for (const z of [-6.05, -2.05, 2.05, 6.05]) {
        stonePier(b, s * 8.25, z, 2.0, .74);
        b.box('oak', s * 8.25, 4.6, z, .42, 5.2, .42);
        b.box('iron', s * 8.25, 2.06, z, .52, .3, .52, true);
        b.collider(s * 8.25, 4.6, z, .5, 5.2, .5);
        for (const zz of [-1, 1]) b.beam('oak', [s * 8.25, 5.7, z], [s * 8.25, 7.0, z + zz * .95], .18, .19);
        b.bolt(s * 8.25, 2.09, z - .275, .06);
      }
      b.box('oak', s * 8.25, 7.08, 0, .32, .40, 13.6);
    }
    for (const z of [-6.1, 6.1]) {
      for (const s of [-1, 1]) stonePier(b, s * 2.82, z, 4.08, .78);
      arch(b, 0, z, 4.02, 2.4, .42, .8);
      for (const s of [-1, 1]) {
        stonePier(b, s * 7.9, z, 3.45, .66);
        arch(b, s * 5.4, z, 3.39, 1.87, .35, .65, 'sandstone');
        b.box('bronze', s * 5.4, 5.82, z - .1, 4.1, .07, .09, true);
      }
    }
    for (const z of [-6.35, -2.2, 2.2, 6.35]) timberTruss(b, z, 8.85, 7.25, 11.7);
    for (const s of [-1, 1]) {
      roofSlope(b, 'patina', 0, 11.86, s * 9.4, 7.12, 0, 14.6);
      b.box('oak', s * 9.15, 6.99, 0, .28, .28, 14.6);
      for (let z = -7.15; z <= 7.2; z += .61) b.beam('copper', [0, 11.98, z], [s * 9.43, 7.25, z], .065, .065, true);
      for (let x = 2.0; x < 9; x += 1.7) b.box('oak', s * x, 11.57 - x * .504, 0, .18, .21, 14.1, true);
      // Glazed side gallery lights have a visible oak frame and metal clips.
      for (const z of [-4.15, 0, 4.15]) {
        b.box('glass', s * 8.34, 3.78, z, .042, 4.65, 3.52);
        b.collider(s * 8.34, 3.78, z, .16, 4.7, 3.6);
        for (const zz of [-1.72, 0, 1.72]) b.box('oak', s * 8.37, 3.78, z + zz, .13, 4.7, .09, true);
        for (const y of [1.44, 3.6, 6.1]) b.box('oak', s * 8.37, y, z, .13, .08, 3.54, true);
        for (const yy of [1.62, 5.91]) for (const zz of [-1.6, 1.6]) b.bolt(s * 8.46, yy, z + zz, .048, 'x');
      }
    }
    b.box('bronze', 0, 11.96, 0, .19, .21, 14.75);
    // Four vertices, seven actual edges: the degrees are 5, 3, 3, 3.
    b.cylinder('sandstone', -5.1, .53, -.65, 1.92, .48);
    b.cylinder('river', -5.1, .789, -.65, 1.76, .048);
    b.collider(-5.1, 1.63, -.65, 4.0, 3.26, 3.85);
    const nodes = [[-5.5, 1.82, -.8], [-6.15, 2.85, .4], [-4.0, 2.53, -.1], [-4.82, 1.53, -1.91]];
    nodes.forEach((p, i) => { b.beam('bronze', [p[0], .8, p[2]], p, .055, .055, true, true); b.sphere(i ? 'bronze' : 'patina', ...p, .235); });
    const edges = [[0, 1, -.35], [0, 1, .35], [0, 2, -.3], [0, 2, .3], [0, 3, 0], [1, 3, 0], [2, 3, 0]];
    edges.forEach(([ai, bi, bulge]) => {
      const a = nodes[ai], c = nodes[bi], mid = [(a[0] + c[0]) / 2 + bulge, (a[1] + c[1]) / 2 + .3, (a[2] + c[2]) / 2 + bulge];
      b.beam('bronze', a, mid, .037, .037, true, true); b.beam('bronze', mid, c, .037, .037, true, true);
    });
    label(b, 'KONIGSBERG · 1736\nV = 4    E = 7\ndeg(v) = 5, 3, 3, 3', -5.1, 1.46, -2.85, 3.3, 1.18);
    b.collider(-5.1, .76, -2.8, 3.5, 1.53, .5);
    for (const x of [4.1, 6.8]) for (const z of [-1.25, 1.25]) b.box('oak', x, .73, z, .16, 1.46, .16);
    b.box('oak', 5.45, 1.49, 0, 3.95, .23, 3.4);
    b.box('river', 5.45, 1.627, 0, 3.72, .045, 3.17);
    for (const [x, z, w, d] of [[4.2, 0, .7, 2.7], [6.7, 0, .64, 2.7], [5.4, -.86, .75, .7], [5.4, .85, .75, .74]]) b.box('sandstone', x, 1.697, z, w, .10, d);
    for (const [x, z, w, d] of [[4.78, -.92, .66, .19], [4.78, .95, .66, .19], [6.03, -.85, .71, .19], [6.03, .88, .71, .19], [5.43, 0, .18, 1.0], [5.2, -1.33, 1.6, .17], [5.2, 1.33, 1.6, .17]]) {
      b.box('oakEnd', x, 1.79, z, w, .13, d, true);
      b.box('bronze', x, 1.91, z - d / 2, w, .035, .025, true);
      b.box('bronze', x, 1.91, z + d / 2, w, .035, .025, true);
    }
    b.collider(5.45, .92, 0, 4.04, 1.84, 3.5);
    label(b, 'SEVEN BRIDGES\nA walk, a question, a new geometry', 5.35, 2.6, 3.72, 4.15, .82);
    for (const s of [-1, 1]) {
      b.box('oak', s * 5.2, .7, 4.85, 3.9, .16, .67);
      for (const x of [s * 5.2 - 1.4, s * 5.2 + 1.4]) b.box('iron', x, .34, 4.85, .12, .68, .53);
      b.collider(s * 5.2, .45, 4.85, 3.9, .9, .75);
    }
    label(b, 'EULER · THE BRIDGE PAVILION', 0, 7.98, -6.56, 4.55, .62);
    return b.finish({ title: 'Königsberg · Euler bridge pavilion', kind: 'graph-theory-timber-hall', clearCorridorWidth: 3,
      graph: { vertices: 4, edges: 7, degrees: [5, 3, 3, 3] }, features: ['coursed stone arcades', 'exposed king-post trusses', 'standing-seam copper roof', 'clipped gallery glazing', 'seven-edge bronze graph', 'river-table model'] });
  }

  function syracuse(T) {
    const b = new Builder(T, 'Syracuse-Archimedes-oculus-portico');
    // An open circular peristyle: no column is placed on either entrance axis.
    const colR = 5.37;
    for (const degrees of [30, 60, 90, 120, 150, 210, 240, 270, 300, 330]) {
      const a = degrees / 180 * PI, x = Math.sin(a) * colR, z = Math.cos(a) * colR;
      column(b, x, z, 5.4, .4);
      b.box('bronze', x, 5.38, z, .35, .12, .35, true);
    }
    ringBand(b, 'limestone', 5.38, .77, .5, 5.66, 40);
    ringBand(b, 'limestoneLight', 5.4, .94, .16, 5.98, 40);
    for (let i = 0; i < 40; i++) {
      const a = (i + .5) / 40 * 2 * PI;
      b.box('sandstone', Math.sin(a) * 5.82, 5.7, Math.cos(a) * 5.82, .12, .34, .085, true, a);
    }
    const roofGeo = geometry(T, 'syracuse-oculus-roof', () => {
      const g = new T.CylinderGeometry(2.05, 6.64, 2.23, 48, 1, true); return g;
    });
    const roofMat = b.m.patina.clone(); roofMat.side = T.DoubleSide;
    // Cached separately because the roof must read from below through the oculus.
    const mats = cacheFor(T).materials;
    if (!mats.has('oculusRoof')) mats.set('oculusRoof', roofMat); else roofMat.dispose();
    b.part(roofGeo, mats.get('oculusRoof'), [0, 7.19, 0], [1, 1, 1], null, false, 'open-oculus-conical-copper-roof');
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * 2 * PI, sa = Math.sin(a), ca = Math.cos(a);
      b.beam('bronze', [sa * 2.05, 8.33, ca * 2.05], [sa * 6.66, 6.1, ca * 6.66], .045, .06, true);
      b.beam('oak', [sa * 2.08, 8.16, ca * 2.08], [sa * 6.56, 5.98, ca * 6.56], .135, .19);
      b.bolt(sa * 5.41, 5.93, ca * 5.41, .047, 'y');
    }
    ringBand(b, 'bronze', 2.06, .14, .16, 8.35, 40);
    ringBand(b, 'oak', 2.08, .22, .23, 8.1, 40);
    // Glazing occupies the side arcs only, keeping front/back doors open.
    for (const degrees of [45, 75, 105, 135, 225, 255, 285, 315]) {
      const a = degrees / 180 * PI, x = Math.sin(a) * colR, z = Math.cos(a) * colR, chord = 2.33;
      b.box('glass', x, 2.88, z, chord, 3.6, .036, false, a);
      // Segmented physical glazing follows the arc without sealing the axial entries.
      for(let j=0;j<6;j++){const len=chord/6,offset=-chord/2+(j+.5)*len; b.collider(x+Math.cos(a)*offset,2.88,z-Math.sin(a)*offset,Math.abs(Math.cos(a))*len+Math.abs(Math.sin(a))*.036,3.6,Math.abs(Math.sin(a))*len+Math.abs(Math.cos(a))*.036);}
      for (const y of [1.07, 4.7]) b.box('bronze', x, y, z, chord + .1, .06, .08, true, a);
      for (const sign of [-1, 1]) {
        const xx = x + Math.cos(a) * sign * chord / 2, zz = z - Math.sin(a) * sign * chord / 2;
        b.box('bronze', xx, 2.88, zz, .055, 3.65, .065, true, a);
        b.bolt(xx, 1.2, zz, .05, 'y');
      }
    }
    // The sphere and cylinder physically share the same radius and height.
    const sx = -3.2, sz = 0, radius = 1.02, cy = 2.01;
    b.cylinder('sandstone', sx, .33, sz, 1.35, .66);
    b.cylinder('limestoneLight', sx, .69, sz, 1.44, .15);
    b.sphere('patina', sx, cy, sz, radius);
    for (const y of [cy - radius, cy + radius]) b.ring('bronze', [sx, y, sz], radius + .055, .042, [PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * PI * 2, x = sx + Math.sin(a) * (radius + .055), z = sz + Math.cos(a) * (radius + .055);
      b.beam('bronze', [x, cy - radius, z], [x, cy + radius, z], .033, .033, false, true);
    }
    b.ring('bronze', [sx, cy, sz], radius + .025, .019, [0, 0, 0], true);
    b.ring('bronze', [sx, cy, sz], radius + .025, .019, [PI / 2, 0, 0], true);
    b.collider(sx, 1.6, sz, 2.9, 3.2, 2.9);
    label(b, 'SPHERE : CYLINDER\nV = 2 : 3', sx, 1.3, -1.61, 2.6, .78);
    // A sectional geometry bench on the opposite side, with measurement ticks.
    b.box('limestone', 3.35, .51, .1, 2.62, 1.02, 2.28);
    b.box('limestoneLight', 3.35, 1.08, .1, 2.88, .16, 2.53);
    const cone = geometry(T, 'unit-cone-24', () => new T.ConeGeometry(1, 1, 24));
    b.part(cone, 'bronze', [3.25, 1.94, .1], [.73, 1.56, .73], null, false, 'cone-of-equal-radius');
    b.ring('patina', [3.25, 1.16, .1], .85, .046, [PI / 2, 0, 0]);
    for (let i = 0; i <= 12; i++) b.box('bronze', 4.34, 1.19 + i * .12, -.05, .17, .018, .025, true);
    b.box('bronze', 4.45, 1.9, -.05, .025, 1.47, .025, true);
    b.collider(3.35, 1.36, .1, 3.0, 2.72, 2.58);
    label(b, 'ARCHIMEDES\nV = 4/3 πr³', 3.35, 1.55, -1.54, 2.72, .75);
    // A small armillary crown floats above the ring, not in the visitor's path.
    b.beam('bronze', [-2.06, 8.36, 0], [0, 9.28, 0], .08, .08);
    b.beam('bronze', [2.06, 8.36, 0], [0, 9.28, 0], .08, .08);
    b.ring('bronze', [0, 9.3, 0], 1.03, .048, [0, 0, 0]);
    b.ring('bronze', [0, 9.3, 0], 1.03, .048, [0, PI / 2, 0]);
    b.ring('patina', [0, 9.3, 0], 1.03, .054, [PI / 2, 0, .28]);
    b.sphere('limestoneLight', 0, 9.3, 0, .47);
    label(b, 'SYRACUSE · THE MEASURE OF A SPHERE', 0, 5.71, -5.91, 4.14, .46);
    return b.finish({ title: 'Syracuse · Archimedes sphere portico', kind: 'circular-oculus-peristyle', clearCorridorWidth: 3,
      features: ['fluted drum columns', 'radial copper roof ribs', 'open oculus', 'clipped bronze glazing', 'equal-radius sphere and cylinder', 'cone measurement bench'], sphereCylinderVolumeRatio: '2:3' });
  }

  function toulouse(T) {
    const b = new Builder(T, 'Toulouse-Fermat-manuscript-cloister');
    for (const sign of [-1, 1]) {
      const cx = sign * 5.32;
      courses(b, cx, 0, 6.55, 13.35, .35, 'sandstone', { course: .175, block: .9 });
      courses(b, sign * 8.15, 0, .7, 12.65, 1.3, 'brick', { course: .2, block: .49, alternate: 'brickLight' });
      b.box('limestoneLight', sign * 8.15, 1.34, 0, .85, .16, 12.85);
      b.collider(sign * 8.15, .74, 0, .86, 1.48, 12.9);
      for (const z of [-6.04, -2.05, 2.05, 6.04]) {
        courses(b, sign * 8.14, z, .82, .92, 6.53, 'brick', { course: .215, block: .4, alternate: 'brickLight' });
        b.box('limestone', sign * 8.14, 6.54, z, 1.0, .22, 1.04);
        b.collider(sign * 8.14, 3.33, z, 1.0, 6.66, 1.04);
        // Short stepped exterior buttresses, with dressed sloping shoulders.
        for (let j = 0; j < 3; j++) {
          const x = sign * (8.54 + j * .19), hh = 3.2 - j * .8;
          courses(b, x, z, .32, 1.05, hh, j % 2 ? 'brickDark' : 'brick', { course: .21, block: .49 });
          b.box('limestone', x, hh + .05, z, .4, .14, 1.12, true, 0, -sign * .16);
        }
        b.collider(sign * 8.85, 1.68, z, 1.07, 3.36, 1.15);
        b.box('oak', sign * 2.46, 3.54, z, .34, 7.08, .34);
        b.box('iron', sign * 2.46, .24, z, .41, .46, .41, true);
        b.collider(sign * 2.46, 3.5, z, .46, 7, .46);
        b.beam('oak', [sign * 2.46, 5.65, z], [sign * 3.65, 6.87, z], .19, .2);
      }
      for (const z of [-4.08, 0, 4.08]) {
        b.box('glass', sign * 8.16, 3.81, z, .04, 4.36, 3.08);
        b.collider(sign * 8.16, 3.81, z, .16, 4.43, 3.14);
        for (const zz of [-1.52, -.5, .5, 1.52]) b.box('bronze', sign * 8.2, 3.81, z + zz, .10, 4.43, .055, true);
        for (const yy of [1.57, 3.0, 4.4, 6.04]) b.box('bronze', sign * 8.2, yy, z, .1, .055, 3.12, true);
        // Diamond leadwork makes these windows read as manuscript-hall glazing.
        for (const zz of [-1.0, 0, 1.0]) for (const yy of [2.33, 3.76, 5.17]) {
          b.beam('bronze', [sign * 8.24, yy - .65, z + zz], [sign * 8.24, yy, z + zz + .45], .019, .019, true);
          b.beam('bronze', [sign * 8.24, yy, z + zz + .45], [sign * 8.24, yy + .65, z + zz], .019, .019, true);
          b.beam('bronze', [sign * 8.24, yy + .65, z + zz], [sign * 8.24, yy, z + zz - .45], .019, .019, true);
          b.beam('bronze', [sign * 8.24, yy, z + zz - .45], [sign * 8.24, yy - .65, z + zz], .019, .019, true);
        }
      }
      // Two tall, narrow, book-like gables flank a lower glazed central nave.
      const left = cx - 3.6, right = cx + 3.6;
      roofSlope(b, 'slate', left, 6.87, cx, 10.78, 0, 14.28);
      roofSlope(b, 'slate', cx, 10.78, right, 6.87, 0, 14.28);
      b.box('bronze', cx, 10.88, 0, .18, .18, 14.5);
      for (const side of [-1, 1]) {
        for (let row = 0; row < 8; row++) {
          const t = (row + .5) / 8, x = cx + side * 3.55 * t, y = 10.87 - 3.87 * t;
          // Slate courses and their staggered seams are individually legible.
          for (let z = -6.94; z < 7; z += .64) b.box((row + Math.round(z * 10)) % 3 ? 'slate' : 'slateLight', x, y, z + (row % 2) * .11, .69, .036, .604, true, 0, side * -Math.atan2(3.87, 3.55), 'overlapping-slate-shingles');
        }
        for (const z of [-6.8, -2.1, 2.1, 6.8]) {
          b.beam('oak', [cx, 10.54, z], [cx + side * 3.53, 6.75, z], .20, .25);
          b.beam('oak', [cx, 9.55, z], [cx + side * 2.7, 7.37, z], .13, .16);
        }
      }
      for (const z of [-6.85, 6.85]) {
        b.box('oak', cx, 7.1, z, 6.9, .24, .25);
        b.box('oak', cx, 8.94, z, .24, 3.7, .25);
        for (const xx of [cx - 1.6, cx + 1.6]) b.box('oak', xx, 8.1, z, .15, 1.8, .18, true);
        b.ring('bronze', [cx, 8.63, z - .13], .6, .054, null);
        b.box('bronze', cx, 11.09, z, .09, .53, .09);
        b.sphere('bronze', cx, 11.43, z, .12);
      }
    }
    for (const z of [-6.03, 6.03]) {
      for (const s of [-1, 1]) stonePier(b, s * 2.46, z, 4.27, .71);
      arch(b, 0, z, 4.23, 2.08, .37, .63);
      for (const s of [-1, 1]) {
        stonePier(b, s * 7.85, z, 3.3, .63);
        arch(b, s * 5.15, z, 3.26, 2.13, .30, .56, 'limestone');
      }
    }
    for (const sign of [-1, 1]) {
      roofSlope(b, 'glass', 0, 8.84, sign * 2.43, 7.6, 0, 13.6);
      b.box('oak', sign * 2.42, 7.34, 0, .24, .3, 13.4);
      for (let z = -6.65; z <= 6.7; z += .83) b.beam('bronze', [0, 8.88, z], [sign * 2.47, 7.62, z], .065, .075, true);
    }
    b.box('bronze', 0, 8.91, 0, .13, .14, 13.7);
    // A large open manuscript rests on a reading desk in the right-hand bay.
    b.box('walnut', 5.13, .78, -.4, .6, 1.56, .68);
    b.box('walnut', 5.13, .15, -.4, 2.85, .3, 2.03);
    b.box('walnut', 5.13, 1.52, -.4, 3.75, .18, 2.22, false, 0, -.025);
    for (const s of [-1, 1]) {
      b.box('walnut', 5.13 + s * .83, 1.68, -.4, 1.75, .15, 2.17, false, 0, s * .12);
      for (let i = 0; i < 5; i++) b.box('paper', 5.13 + s * .83, 1.79 + i * .028, -.42, 1.64 - i * .018, .023, 2.03 - i * .024, true, 0, s * .12, 'layered-manuscript-pages');
      for (let line = 0; line < 9; line++) b.box('ink', 5.13 + s * .86, 1.938 + s * .03, -1.12 + line * .15, 1.10 - (line % 4) * .07, .007, .013, true, 0, s * .12);
    }
    b.box('bronze', 5.13, 1.87, -.42, .06, .08, 2.18, true);
    b.collider(5.13, 1.05, -.4, 3.9, 2.1, 2.42);
    label(b, 'FERMAT · 1637\nxⁿ + yⁿ ≠ zⁿ    (n > 2)\nA note in the margin', 5.13, 2.94, 1.84, 4.13, 1.3, { paper: true, frame: 'walnut' });
    for (const x of [3.61, 6.67]) b.box('oak', x, 1.48, 1.93, .12, 2.96, .12);
    b.collider(5.13, 1.67, 1.89, 4.31, 3.34, .24);
    // The opposite side is a real book alcove, with exposed pegs and shelf brackets.
    for (const z of [-2.45, 2.45]) b.box('oak', -6.61, 2.13, z, .21, 3.86, .24);
    for (const y of [.61, 1.37, 2.13, 2.89, 3.65]) {
      b.box('oak', -6.64, y, 0, 1.11, .14, 5.13);
      for (const z of [-2.25, 2.25]) b.beam('iron', [-7.08, y - .36, z], [-6.2, y - .08, z], .055, .055, true);
      for (let j = 0; j < 14; j++) {
        const z = -2.17 + j * .325, h = .44 + (j * 7 % 5) * .032;
        b.box(j % 3 ? 'paper' : 'brickDark', -6.66, y + .07 + h / 2, z, .78, h, .22 + (j % 3) * .024, true, 0, 0, 'individual-bound-folio');
        b.box('bronze', -6.25, y + .19, z, .025, .044, .21, true);
        b.box('bronze', -6.25, y + .37, z, .025, .032, .21, true);
      }
    }
    b.collider(-6.62, 2.0, 0, 1.25, 4, 5.22);
    b.box('oak', -4.9, .61, 3.6, 3.28, .17, .65);
    for (const x of [-6.1, -3.7]) b.box('iron', x, .30, 3.6, .16, .6, .59);
    b.collider(-4.9, .4, 3.6, 3.35, .8, .73);
    for (const sign of [-1, 1]) for (const z of [-3.65, 3.65]) {
      b.beam('iron', [sign * 4.4, 6.5, z], [sign * 4.4, 5.12, z], .025, .025, true, true);
      b.cylinder('lamp', sign * 4.4, 4.96, z, .18, .34, true);
      b.cylinder('bronze', sign * 4.4, 5.16, z, .26, .06, true);
      b.cylinder('bronze', sign * 4.4, 4.76, z, .23, .065, true);
    }
    label(b, 'TOULOUSE · THE MANUSCRIPT HALL', 0, 7.12, -6.44, 4.65, .61);
    return b.finish({ title: 'Toulouse · Fermat manuscript hall', kind: 'twin-gable-brick-cloister', clearCorridorWidth: 3,
      features: ['staggered Toulouse brickwork', 'stepped stone-capped buttresses', 'exposed timber roof frames', 'individual slate courses', 'diamond-leaded glazing', 'open manuscript and bound folio alcove'] });
  }

  function torii(T) {
    const b = new Builder(T, 'crafted-vermilion-entry-torii');
    for (const sign of [-1, 1]) {
      const x = sign * 5.02;
      b.box('mortar', x, .09, 0, 1.89, .18, 1.89);
      courses(b, x, 0, 1.9, 1.9, .43, 'sandstone', { course: .215, block: .92 });
      b.cylinder('limestone', x, .55, 0, .94, .24);
      const shaft = geometry(T, 'torii-tapered-column', () => new T.CylinderGeometry(.83, 1, 1, 20));
      const start = new T.Vector3(x, .65, 0), end = new T.Vector3(sign * 4.76, 11.75, 0), v = end.clone().sub(start);
      b.part(shaft, 'vermilion', start.clone().add(end).multiplyScalar(.5).toArray(), [.68, v.length(), .68], new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()), false, 'tapered-inclined-vermilion-post');
      b.collider(sign * 4.99, 4.85, 0, 1.82, 9.7, 1.92);
      for (const y of [.89, 1.25, 9.18, 9.69, 11.19]) {
        const px = x - sign * .26 * (y - .65) / 11.1, rr = .68 * (1 - .17 * (y - .65) / 11.1);
        b.cylinder('iron', px, y, 0, rr + .027, .115, true);
        for (const z of [-rr - .027, rr + .027]) b.bolt(px, y, z, .055, 'z');
      }
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * PI * 2;
        b.beam('vermilionLight', [x + Math.cos(a) * .682, 1.42, Math.sin(a) * .682], [sign * 4.78 + Math.cos(a) * .569, 10.99, Math.sin(a) * .569], .013, .013, true, true);
      }
      b.box('oakEnd', sign * 5.18, 9.4, -.03, 1.65, .54, .79);
      b.box('iron', sign * 5.18, 9.41, -.445, 1.25, .70, .055, true);
      for (const dx of [-.44, .44]) for (const dy of [-.19, .19]) b.bolt(sign * 5.18 + dx, 9.41 + dy, -.49, .07);
      // Wedges remain visibly proud of the through-tenon.
      b.box('oakEnd', sign * 5.99, 9.74, 0, .16, .52, .66, true, 0, sign * .16);
      b.box('oakEnd', sign * 5.99, 9.1, 0, .16, .29, .66, true, 0, -sign * .12);
    }
    b.box('vermilion', 0, 9.42, 0, 12.95, .55, .77);
    b.box('vermilionLight', 0, 9.72, -.015, 12.75, .095, .86, true);
    b.box('vermilion', 0, 10.49, 0, .53, 1.78, .47);
    for (const y of [9.87, 11.1]) b.box('iron', 0, y, -.28, .70, .16, .064, true);
    for (const y of [9.89, 11.07]) b.bolt(0, y, -.329, .065);
    function curvedLintel(key, width, centerY, rise, thickness, depth, mat) {
      const g = geometry(T, key, () => {
        const shape = new T.Shape(), n = 32;
        for (let i = 0; i <= n; i++) {
          const x = -width / 2 + width * i / n, y = centerY + rise * Math.pow(x / (width / 2), 2);
          if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
        }
        for (let i = n; i >= 0; i--) {
          const x = -width / 2 + width * i / n;
          shape.lineTo(x, centerY + rise * Math.pow(x / (width / 2), 2) - thickness);
        }
        shape.closePath(); const geo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
        geo.translate(0, 0, -depth / 2); return geo;
      });
      b.part(g, mat, [0, 0, 0], [1, 1, 1], null, false, 'swept-laminated-kasagi');
    }
    curvedLintel('torii-lower-kasagi', 15.45, 11.66, .43, .44, 1.11, 'vermilion');
    curvedLintel('torii-upper-kasagi', 16.8, 12.06, .84, .57, 1.43, 'walnut');
    curvedLintel('torii-copper-weather-cap', 16.86, 12.16, .84, .12, 1.52, 'patina');
    // Exposed end grain and separate straps describe how the beam was made.
    for (const sign of [-1, 1]) {
      const x = sign * 8.415;
      b.box('oakEnd', x, 12.56, 0, .048, .55, 1.42);
      for (const f of [.35, .67, 1]) {
        const grain = geometry(T, 'elliptical-end-grain', () => new T.TorusGeometry(1, .014, 5, 32));
        b.part(grain, 'walnut', [x + sign * .029, 12.56, 0], [.62 * f, .24 * f, 1], [0, PI / 2, 0], true, 'elliptical-sawn-end-grain');
      }
      b.box('iron', sign * 7.7, 12.48, -.75, .27, .58, .04, true, 0, sign * .175);
      b.box('iron', sign * 7.7, 12.48, .75, .27, .58, .04, true, 0, sign * .175);
      for (const z of [-.789, .789]) for (const y of [12.31, 12.62]) b.bolt(sign * 7.7, y, z, .063);
    }
    label(b, '庭\nTHE COURTYARD', 0, 10.52, -.58, 1.27, 1.41, { frame: 'bronze' });
    const result = b.finish({ title: 'Crafted timber entry torii', kind: 'joined-vermilion-torii', clearPortalWidth: 8,
      features: ['inclined tapered posts', 'stone socket courses', 'through-tenon crossbeam', 'visible oak wedges', 'iron straps and hex bolts', 'curved laminated kasagi', 'copper weather cap', 'exposed end grain'] });
    result.height = 13;
    return result;
  }

  function embellishBridge(options) {
    const T = options.THREE, bridge = options.bridge;
    const b = new Builder(T, 'bridge-' + bridge.id + '-structural-joinery');
    // Deliberately leave the unlockable eighth bridge byte-for-byte unchanged.
    if (bridge.bonus || bridge.id === 8) return b.root;
    const L = Number(bridge.length), rise = Number(bridge.rise) || 0;
    if (!(L > 0)) return b.root;
    const deckY = x => .04 + rise * Math.cos(Math.max(-1, Math.min(1, x / (L / 2))) * PI / 2);
    const timber = bridge.id === 7 || bridge.id === 1, primary = timber ? 'oak' : 'iron', secondary = timber ? 'iron' : 'patina';
    const bays = Math.max(3, Math.ceil(L / 3.15)), step = L / bays, zRail = 2.48;
    const lowerY = x => deckY(x) - 1.12 - .23 * Math.cos(x / (L / 2) * PI / 2);
    for (const sign of [-1, 1]) {
      const z = sign * zRail;
      for (let i = 0; i < bays; i++) {
        const x0 = -L / 2 + i * step, x1 = x0 + step;
        b.beam(primary, [x0, deckY(x0) - .18, z], [x1, deckY(x1) - .18, z], .21, .23);
        b.beam(primary, [x0, lowerY(x0), z], [x1, lowerY(x1), z], .20, .22);
        // Warren diagonals transfer load between distinct upper and lower chords.
        b.beam(primary, [x0, i % 2 ? deckY(x0) - .26 : lowerY(x0), z], [x1, i % 2 ? lowerY(x1) : deckY(x1) - .26, z], timber ? .19 : .13, .15);
        if (i % 3 === 1) b.beam(secondary, [x0, deckY(x0) - .24, z], [x1, lowerY(x1), z], .055, .07, true);
      }
      for (let i = 0; i <= bays; i++) {
        const x = -L / 2 + i * step, y = deckY(x);
        b.beam(primary, [x, y - .21, z], [x, lowerY(x), z], .13, .18);
        for (const yy of [y - .23, lowerY(x)]) {
          b.box('iron', x, yy, z + sign * .137, .44, .36, .05, true);
          for (const xx of [-.12, .12]) for (const dy of [-.09, .09]) b.bolt(x + xx, yy + dy, z + sign * .181, .043, 'z');
        }
        b.box('iron', x, y - .04, sign * 2.36, .36, .24, .23, true);
        b.bolt(x, y + .095, sign * 2.37, .065, 'y');
      }
      // The expansion hardware stays strictly beyond the 2.1 m walking half-width.
      for (const x of [-L / 2 + .43, L / 2 - .43]) {
        const y = deckY(x);
        for (const dx of [-.11, .11]) b.box('iron', x + dx, y + .018, sign * 2.40, .10, .033, .47, true);
        for (const zz of [2.24, 2.57]) b.bolt(x, y + .044, sign * zz, .039, 'y');
      }
    }
    for (let i = 0; i <= bays; i++) {
      const x = -L / 2 + i * step;
      b.box(timber ? 'oakEnd' : 'iron', x, deckY(x) - .42, 0, .23, .24, 5.12);
      // Underdeck cross bracing is below the unchanged original deck surface.
      if (i < bays && i % 2 === 0) {
        const xx = x + step;
        b.beam('iron', [x, deckY(x) - .61, -2.43], [xx, deckY(xx) - .61, 2.43], .06, .075, true);
        b.beam('iron', [x, deckY(x) - .61, 2.43], [xx, deckY(xx) - .61, -2.43], .06, .075, true);
      }
    }
    const result = b.finish({ kind: timber ? 'timber-and-iron-warren-support' : 'riveted-iron-warren-support', bridgeId: bridge.id,
      unchangedDeck: true, minimumWalkwayClearHalfWidth: 2.1, features: ['paired underdeck trusses', 'transverse floor beams', 'gusset plates and bolts', 'edge expansion joints'] });
    result.root.userData.deckHeightUnchanged = true;
    return result.root;
  }

  global.CourtyardInfrastructure = Object.freeze({
    buildMath(options) {
      if (!options || !options.THREE) throw new Error('CourtyardInfrastructure.buildMath requires THREE');
      if (options.index === 0) return konigsberg(options.THREE);
      if (options.index === 1) return syracuse(options.THREE);
      if (options.index === 2) return toulouse(options.THREE);
      throw new RangeError('Math monument index must be 0, 1, or 2');
    },
    buildTorii(options) {
      if (!options || !options.THREE) throw new Error('CourtyardInfrastructure.buildTorii requires THREE');
      return torii(options.THREE);
    },
    embellishBridge
  });
})(typeof window !== 'undefined' ? window : globalThis);
