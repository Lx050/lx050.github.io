/* Courtyard Architecture — hand-built, metre-scale pavilions for Three.js r128.
 * No remote assets. The centre 3.6m of every plan is a continuous public passage.
 * Static construction is instanced per material; fine joinery has its own LOD group.
 * IMPORTANT r128: bounds() below explicitly includes each instance matrix.
 */
(function (global) {
  'use strict';
  const library = new WeakMap();
  const TAU = Math.PI * 2;
  const ROLES = {
    0: 'Calligraphy studio', 1: 'Restoration gallery', 2: 'Historical studio',
    3: 'Ink atelier', 4: 'Listening care house', 5: 'Pocket care pavilion',
    6: 'Typography workshop', 7: 'Patent archive', 8: 'Reading pavilion',
    9: 'Vault archive', 10: 'API exchange', 11: 'Document hall',
    12: 'Memory lighthouse', 13: 'Two-year timeline', 14: 'Biographies archive',
    15: 'Causal gallery', 16: 'Rain courtyard', 17: 'Twin observatory',
    18: 'Five-bay gallery', 19: 'Newsroom', 20: 'Moon and snow pavilion',
    21: 'Proof workshop', 22: 'Stone inscription house', 24: 'MindCare cloister',
    25: 'Maker workshop'
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function resources(T) {
    if (library.has(T)) return library.get(T);
    const geos = new Map();
    const geometry = (key, create) => {
      if (!geos.has(key)) geos.set(key, create());
      return geos.get(key);
    };
    const box = geometry('box', () => new T.BoxGeometry(1, 1, 1));
    const cylinder = geometry('cylinder', () => new T.CylinderGeometry(1, 1, 1, 12));
    const round = geometry('round', () => new T.CylinderGeometry(1, 1, 1, 24));
    const sphere = geometry('sphere', () => new T.SphereGeometry(1, 12, 8));
    const bolt = geometry('bolt', () => new T.CylinderGeometry(1, 1, 1, 6));
    const mat = (color, extra) => {
      const m = new T.MeshStandardMaterial(Object.assign({ color, roughness: .83, metalness: 0 }, extra));
      m.color.convertSRGBToLinear();
      m.emissive.convertSRGBToLinear();
      m.userData.courtyardArchitecture = true;
      return m;
    };
    const M = {
      limestone: mat(0xc7c3b2), chalk: mat(0xddd8c8), masonry: mat(0x92988c),
      joint: mat(0x3c433d), cedar: mat(0x786b55), oak: mat(0x9c8c72),
      walnut: mat(0x453f35), steel: mat(0x303e42, { metalness: .62, roughness: .47 }),
      bronze: mat(0x84785e, { metalness: .48, roughness: .61 }),
      copper: mat(0x728b7d, { metalness: .55, roughness: .57 }),
      tile: mat(0x42574f, { roughness: .77 }), ceramic: mat(0x899b96, { roughness: .46 }),
      clay: mat(0xaa6f55), paper: mat(0xe0d5b4, { roughness: .97 }),
      ink: mat(0x222d2f), indigo: mat(0x425976), moss: mat(0x526454),
      linen: mat(0xb9b4a2), leather: mat(0x79675b), soil: mat(0x353b32),
      glass: mat(0x87aaa4, { metalness: .05, roughness: .17, transparent: true, opacity: .27, depthWrite: false, side: T.DoubleSide }),
      glassDark: mat(0x466769, { metalness: .18, roughness: .21, transparent: true, opacity: .47, depthWrite: false, side: T.DoubleSide }),
      lamp: mat(0xbba473, { emissive: 0xe4b86d, emissiveIntensity: .5, roughness: .75 }),
      screen: mat(0x536e6d, { emissive: 0x789c89, emissiveIntensity: .16, roughness: .57 })
    };
    // Tiny shared grain maps vary surface finish, without adding network or canvas dependencies.
    function grain(wood) {
      const n = 64, data = new Uint8Array(n * n * 4);
      let state = wood ? 114 : 807;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        state = (1664525 * state + 1013904223) >>> 0;
        const stripe = wood ? Math.sin(x * .7 + Math.sin(y * .08) * 1.3) * 8 : 0;
        const v = Math.round(237 + (state / 4294967296 - .5) * (wood ? 10 : 19) + stripe);
        const i = (y * n + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = clamp(v, 0, 255); data[i + 3] = 255;
      }
      const tex = new T.DataTexture(data, n, n, T.RGBAFormat);
      tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.magFilter = T.LinearFilter;
      tex.minFilter = T.LinearMipmapLinearFilter; tex.generateMipmaps = true;
      tex.encoding = T.sRGBEncoding; tex.needsUpdate = true;
      return tex;
    }
    const stoneGrain = grain(false), timberGrain = grain(true);
    ['limestone', 'chalk', 'masonry', 'paper'].forEach(k => { M[k].map = stoneGrain; });
    ['cedar', 'oak', 'walnut'].forEach(k => { M[k].map = timberGrain; });
    const r = { geometry, geos, box, cylinder, round, sphere, bolt, M };
    library.set(T, r); return r;
  }

  function makeBuilder(T, index, title, zone) {
    const R = resources(T), M = R.M;
    const root = new T.Group(), structure = new T.Group(), detail = new T.Group();
    root.name = 'architecture-' + index; structure.name = 'load-bearing-construction';
    detail.name = 'close-range-joinery-and-furnishings'; root.add(structure, detail);
    const batches = new Map(), collisionBoxes = [], mechanisms = [], roofPanels = [], hangingLights = [];
    const dummy = new T.Object3D(), up = new T.Vector3(0, 1, 0);
    let pieces = 0;
    function material(m) { return typeof m === 'string' ? M[m] : m; }
    function emit(geo, m, x, y, z, sx, sy, sz, rotation, fine) {
      m = material(m); const parent = fine ? detail : structure;
      const key = geo.uuid + ':' + m.uuid + ':' + (fine ? 1 : 0);
      let batch = batches.get(key);
      if (!batch) { batch = { geo, mat: m, parent, transforms: [] }; batches.set(key, batch); }
      dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.quaternion.identity();
      if (rotation && rotation.isQuaternion) dummy.quaternion.copy(rotation);
      else if (rotation) dummy.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
      dummy.updateMatrix(); const transform = dummy.matrix.clone(); batch.transforms.push(transform); pieces++;
      return transform;
    }
    function collider(matrix, geo, name) {
      if (!geo.boundingBox) geo.computeBoundingBox();
      const b = geo.boundingBox.clone().applyMatrix4(matrix);
      // Ground collision geometry excludes roof structure and floor finishes.
      if (b.min.y > 2.4 || b.max.y < .12) return;
      b.userData = { architectural: true, part: name || 'physical-obstacle', index };
      collisionBoxes.push(b);
    }
    function box(m, x, y, z, w, h, d, rotation, fine, solid, name) {
      const matrix = emit(R.box, m, x, y, z, w, h, d, rotation, fine);
      if (solid) collider(matrix, R.box, name);
      if (!fine && w > 3 && d > 3 && h < .3 && ['tile', 'copper', 'ceramic', 'glass', 'glassDark'].indexOf(m) !== -1) {
        roofPanels.push({ m, x, y, z, w, h, d, rotation: rotation || [0, 0, 0], matrix });
      }
      return matrix;
    }
    function cyl(m, x, y, z, r, h, rotation, fine, solid) {
      const matrix = emit(R.cylinder, m, x, y, z, r, h, r, rotation, fine);
      if (solid) collider(matrix, R.cylinder, 'column-or-vessel'); return matrix;
    }
    function sphere(m, x, y, z, rx, ry, rz, fine) {
      return emit(R.sphere, m, x, y, z, rx, ry, rz, null, fine);
    }
    function beam(m, a, b, w, d, fine, solid) {
      const start = new T.Vector3(...a), end = new T.Vector3(...b);
      const delta = end.clone().sub(start), center = start.add(end).multiplyScalar(.5);
      const q = new T.Quaternion().setFromUnitVectors(up, delta.clone().normalize());
      const matrix = emit(R.box, m, center.x, center.y, center.z, w, delta.length(), d || w, q, fine);
      if (solid) collider(matrix, R.box, 'brace'); return matrix;
    }
    function ring(m, x, y, z, radius, tube, rotation, fine, arc) {
      const a = arc || TAU, key = 'ring:' + radius.toFixed(3) + ':' + tube.toFixed(3) + ':' + a.toFixed(3);
      const g = R.geometry(key, () => new T.TorusGeometry(radius, tube, 6, Math.max(24, Math.ceil(radius * 10)), a));
      return emit(g, m, x, y, z, 1, 1, 1, rotation, fine);
    }
    function bolts(x, y, z, w, h, face) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        if (face === 'side') emit(R.bolt, M.bronze, x, y + sy * h * .31, z + sx * w * .31, .038, .035, .038, [0, 0, Math.PI / 2], true);
        else emit(R.bolt, M.bronze, x + sx * w * .31, y + sy * h * .31, z, .038, .035, .038, [Math.PI / 2, 0, 0], true);
      }
    }
    function column(x, z, h, m, w) {
      w = w || .34;
      box('masonry', x, .15, z, w + .26, .3, w + .26, null, false, true, 'stone-post-foot');
      box(m || 'cedar', x, h / 2 + .15, z, w, h, w, null, false, true, 'structural-post');
      box('steel', x, .43, z, w + .035, .36, w + .035, null, true);
      box('bronze', x, h - .21, z, w + .09, .21, w + .09, null, true);
      for (const s of [-1, 1]) {
        box('steel', x, h - .43, z + s * (w / 2 + .015), w * .82, .58, .028, null, true);
        bolts(x, h - .43, z + s * (w / 2 + .038), w * .84, .58);
      }
    }
    function deck(w, d, kind) {
      // Flush courses: they do not introduce a hidden stair or a collider across the door.
      box('joint', 0, -.045, 0, w, .09, d);
      const wood = kind === 'wood', nx = wood ? Math.ceil(w / .52) : Math.ceil(w / 1.35), nz = wood ? 1 : Math.ceil(d / 1.5);
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const dx = w / nx, dz = d / nz;
        box(wood ? (i % 4 ? 'cedar' : 'oak') : ((i + j) % 7 ? 'limestone' : 'masonry'), -w / 2 + (i + .5) * dx, .014, -d / 2 + (j + .5) * dz, dx - .022, .025, dz - .026, null, true);
      }
      for (const s of [-1, 1]) box('bronze', s * 1.8, .03, 0, .027, .018, d, null, true);
    }
    function frame(w, d, eave, options) {
      const o = options || {}, bays = o.bays || 3, timber = o.material || 'cedar';
      const xs = [-w / 2, w / 2];
      for (let n = 0; n <= bays; n++) {
        const z = -d / 2 + n * d / bays;
        for (const x of xs) {
          column(x, z, eave, timber, o.post || .34);
          // Braces remain well above the visitor's head.
          beam(timber, [x, eave - 1.25, z], [x - Math.sign(x) * .95, eave - .12, z], .16, .19, true);
          if (n < bays) beam(timber, [x, eave - 1.12, z], [x, eave - .1, z + .95], .16, .19, true);
        }
        box(timber, 0, eave, z, w + .24, .32, .27);
      }
      for (const x of xs) box(timber, x, eave + .1, 0, .28, .36, d + .6);
    }
    function screenSide(x, z, length, height, mode) {
      // Side wall panels sit between the structure and leave the axial doors open.
      const s = Math.sign(x) || 1;
      box('masonry', x, .37, z, .23, .7, length, null, false, true, 'window-sill-wall');
      if (mode === 'solid') box('chalk', x, (height + .7) / 2, z, .18, height - .7, length, null, false, true, 'side-wall');
      else {
        box(mode === 'paper' ? 'paper' : 'glass', x, (height + .8) / 2, z, .045, height - .8, length, null, false, true, 'window-pane');
        for (let p = -length / 2; p <= length / 2 + .001; p += .66) box('cedar', x + s * .04, (height + .8) / 2, z + p, .075, height - .7, .055, null, true);
        for (const y of [.85, height * .55, height]) box('cedar', x + s * .05, y, z, .09, .07, length, null, true);
      }
    }
    function endPanels(w, d, h, m) {
      const open = 4.2, wing = (w - open) / 2;
      for (const z of [-d / 2, d / 2]) for (const s of [-1, 1]) {
        const x = s * (open / 2 + wing / 2);
        box(m || 'chalk', x, h / 2, z, wing, h, .19, null, false, true, 'entrance-cheek-wall');
        box('cedar', s * 2.12, h / 2, z, .18, h, .25, null, false, true, 'door-jamb');
        box('bronze', x, .28, z + Math.sign(z) * .11, wing, .045, .035, null, true);
      }
      for (const z of [-d / 2, d / 2]) box('cedar', 0, h + .1, z, w, .23, .3);
    }
    function gutter(x, y, z, length, alongX) {
      if (alongX) {
        box('copper', x, y, z, length, .12, .22, null, true);
        box('copper', x, y + .1, z + .1, length, .1, .035, null, true);
      } else {
        box('copper', x, y, z, .22, .12, length, null, true);
        box('copper', x + .1, y + .1, z, .035, .1, length, null, true);
        for (let p = -length / 2 + .4; p < length / 2; p += 2.6) box('bronze', x, y - .1, z + p, .3, .08, .065, null, true);
      }
    }
    function gable(cx, cz, w, d, eave, rise, roof, options) {
      const o = options || {}, a = Math.atan2(rise, w / 2), len = Math.hypot(w / 2, rise), timber = o.timber || 'cedar';
      for (const s of [-1, 1]) {
        box(roof || 'tile', cx + s * w / 4, eave + rise / 2, cz, len + .1, .17, d, [0, 0, -s * a]);
        for (let z = -d / 2 + .18; z <= d / 2; z += .7) {
          beam(timber, [cx, eave + rise - .14, cz + z], [cx + s * w / 2, eave - .14, cz + z], .085, .12, true);
          beam(roof === 'copper' ? 'bronze' : 'steel', [cx, eave + rise + .12, cz + z], [cx + s * w / 2, eave + .12, cz + z], .025, .033, true);
        }
        beam(timber, [cx, eave + rise, cz - d / 2], [cx + s * w / 2, eave, cz - d / 2], .18, .24);
        beam(timber, [cx, eave + rise, cz + d / 2], [cx + s * w / 2, eave, cz + d / 2], .18, .24);
        gutter(cx + s * w / 2, eave - .12, cz, d, false);
      }
      box('bronze', cx, eave + rise + .15, cz, .19, .14, d + .12);
      for (const z of [-d / 2 + .45, 0, d / 2 - .45]) {
        box(timber, cx, eave - .05, cz + z, w - .5, .23, .19);
        beam(timber, [cx, eave - .1, cz + z], [cx, eave + rise - .1, cz + z], .15, .15, true);
        for (const s of [-1, 1]) beam(timber, [cx, eave - .12, cz + z], [cx + s * w * .34, eave + rise * .32, cz + z], .13, .13, true);
      }
    }
    function lean(cx, cz, w, d, low, rise, m) {
      const a = Math.atan2(rise, w), len = Math.hypot(w, rise);
      box(m || 'copper', cx, low + rise / 2, cz, len, .17, d, [0, 0, a]);
      for (let z = -d / 2 + .22; z < d / 2; z += .72) {
        beam('cedar', [cx - w / 2, low - .13, cz + z], [cx + w / 2, low + rise - .13, cz + z], .085, .16, true);
        beam('bronze', [cx - w / 2, low + .12, cz + z], [cx + w / 2, low + rise + .12, cz + z], .024, .034, true);
      }
      gutter(cx - w / 2, low - .12, cz, d, false);
    }
    function barrel(cx, cz, w, d, spring, rise, roof) {
      const sections = 16;
      for (let n = 0; n < sections; n++) {
        const t1 = Math.PI * n / sections, t2 = Math.PI * (n + 1) / sections;
        const x1 = cx + Math.cos(t1) * w / 2, x2 = cx + Math.cos(t2) * w / 2;
        const y1 = spring + Math.sin(t1) * rise, y2 = spring + Math.sin(t2) * rise;
        const length = Math.hypot(x2 - x1, y2 - y1), angle = Math.atan2(y2 - y1, x2 - x1);
        box(roof || 'glass', (x1 + x2) / 2, (y1 + y2) / 2, cz, length + .025, .08, d, [0, 0, angle]);
        for (let z = -d / 2; z <= d / 2 + .01; z += d / 4) beam('steel', [x1, y1 - .07, cz + z], [x2, y2 - .07, cz + z], .105, .13, z !== -d / 2 && z !== d / 2);
        box('bronze', x1, y1 + .07, cz, .036, .04, d, null, true);
      }
      for (const s of [-1, 1]) gutter(cx + s * w / 2, spring - .16, cz, d, false);
    }
    function hip(cx, cz, w, d, y, rise, roof) {
      const topW = w * .23, topD = d * .22;
      const verts = [
        -w / 2, 0, -d / 2, w / 2, 0, -d / 2, topW / 2, rise, -topD / 2, -topW / 2, rise, -topD / 2,
        w / 2, 0, -d / 2, w / 2, 0, d / 2, topW / 2, rise, topD / 2, topW / 2, rise, -topD / 2,
        w / 2, 0, d / 2, -w / 2, 0, d / 2, -topW / 2, rise, topD / 2, topW / 2, rise, topD / 2,
        -w / 2, 0, d / 2, -w / 2, 0, -d / 2, -topW / 2, rise, -topD / 2, -topW / 2, rise, topD / 2
      ];
      const key = ['hip', w, d, rise].join(':');
      const geo = R.geometry(key, () => {
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
        g.setIndex([0, 3, 1, 1, 3, 2, 4, 7, 5, 5, 7, 6, 8, 11, 9, 9, 11, 10, 12, 15, 13, 13, 15, 14]);
        g.computeVertexNormals(); return g;
      });
      emit(geo, roof || 'tile', cx, y, cz, 1, 1, 1);
      box(roof || 'tile', cx, y + rise, cz, topW, .15, topD);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam('bronze', [cx + sx * w / 2, y + .08, cz + sz * d / 2], [cx + sx * topW / 2, y + rise + .08, cz + sz * topD / 2], .09, .09, true);
      for (const s of [-1, 1]) {
        box('cedar', cx + s * w / 2, y - .12, cz, .22, .24, d);
        box('cedar', cx, y - .12, cz + s * d / 2, w, .24, .22);
        for (let x = -w / 2 + .4; x < w / 2; x += .65) beam('cedar', [cx + x, y - .2, cz + s * d / 2], [cx + x * .23, y + rise - .16, cz + s * topD / 2], .065, .09, true);
      }
    }
    function lantern(x, y, z, scale) {
      const s = scale || 1; hangingLights.push({ x, y, z, s });
      box('lamp', x, y, z, .3 * s, .54 * s, .3 * s, null, true);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box('bronze', x + sx * .18 * s, y, z + sz * .18 * s, .035 * s, .64 * s, .035 * s, null, true);
      box('steel', x, y + .35 * s, z, .5 * s, .075 * s, .5 * s, null, true);
      box('steel', x, y - .35 * s, z, .44 * s, .07 * s, .44 * s, null, true);
      cyl('bronze', x, y + .6 * s, z, .027 * s, .44 * s, null, true);
    }
    function table(x, z, w, d, y, m) {
      y = y || 1.12;
      box(m || 'oak', x, y, z, w, .15, d, null, false, true, 'worktable');
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box('steel', x + sx * (w / 2 - .16), y / 2, z + sz * (d / 2 - .16), .1, y, .1, null, true, true, 'table-leg');
      box('cedar', x, .25, z, w - .24, .1, .16, null, true);
    }
    function bench(x, z, w, alongZ, upholstered) {
      const d = .72, h = .52;
      box('cedar', x, h, z, alongZ ? d : w, .17, alongZ ? w : d, null, false, true, 'bench');
      if (upholstered) box('linen', x, h + .14, z, alongZ ? d - .06 : w - .06, .18, alongZ ? w - .06 : d - .06, null, true);
      for (const s of [-1, 1]) box('masonry', x + (alongZ ? 0 : s * (w / 2 - .28)), .24, z + (alongZ ? s * (w / 2 - .28) : 0), alongZ ? .57 : .22, .46, alongZ ? .22 : .57, null, true, true, 'bench-foot');
    }
    function books(x, z, w, h, facing, variant) {
      const rot = facing === 'side', count = Math.max(3, Math.round(w / .28));
      box('walnut', x, h / 2, z, rot ? .65 : w, h, rot ? w : .65, null, false, true, 'archive-cabinet');
      const shelves = Math.floor(h / .55);
      for (let j = 1; j < shelves; j++) {
        const y = j * .55;
        box('oak', x, y, z + (rot ? 0 : -.35), rot ? .77 : w + .1, .065, rot ? w + .1 : .77, null, true);
        for (let n = 0; n < count; n++) {
          const p = -w / 2 + .16 + n * ((w - .22) / count), color = ['paper', 'indigo', 'clay', 'moss', 'linen'][(n * 3 + j + (variant || 0)) % 5];
          box(color, x + (rot ? -.36 : p), y + .22, z + (rot ? p : -.35), rot ? .27 : .16 + (n % 3) * .023, .32 + n % 4 * .027, rot ? .17 : .28, null, true);
          box('bronze', x + (rot ? -.505 : p), y + .12, z + (rot ? p : -.498), rot ? .012 : .13, .018, rot ? .12 : .012, null, true);
        }
      }
    }
    function cabinet(x, z, w, h, rows) {
      box('walnut', x, h / 2, z, w, h, 1.02, null, false, true, 'flat-file-cabinet');
      for (let n = 0; n < rows; n++) {
        const y = (n + .5) * h / rows;
        box('oak', x, y, z - .52, w - .09, h / rows - .045, .06, null, true);
        for (const s of [-1, 1]) box('bronze', x + s * w * .25, y, z - .575, .27, .045, .04, null, true);
        box('paper', x, y, z - .558, .24, .09, .014, null, true);
      }
    }
    function paper(x, y, z, w, d, marks) {
      box('paper', x, y, z, w, .012, d, null, true);
      if (marks) for (let n = 0; n < 7; n++) box('ink', x - w * .31 + n * w * .095, y + .009, z, .014, .012, d * (.5 + (n % 3) * .09), null, true);
    }
    function scroll(x, y, z, w, h, ink) {
      box('paper', x, y, z, w, h, .035, null, true);
      for (const s of [-1, 1]) cyl('walnut', x, y + s * h / 2, z - .025, .055, w + .16, [0, 0, Math.PI / 2], true);
      if (ink) for (let n = 0; n < 5; n++) {
        box('ink', x + (n % 2 ? .07 : -.08), y + h * .32 - n * h * .145, z - .025, w * .28, .055 + (n % 2) * .04, .012, [0, 0, -.16 + n * .1], true);
        box('ink', x + .03, y + h * .32 - n * h * .145, z - .026, .038, h * .09, .015, [0, 0, n * .18], true);
      }
      box('clay', x + w * .26, y - h * .34, z - .03, .12, .14, .015, null, true);
    }
    function plant(x, z, size) {
      const s = size || 1;
      cyl('ceramic', x, .3 * s, z, .38 * s, .55 * s, null, false, true);
      cyl('soil', x, .585 * s, z, .33 * s, .018, null, true);
      for (let n = 0; n < 5; n++) {
        const a = n * 2.4, h = (.9 + n % 3 * .26) * s;
        beam('walnut', [x, .58 * s, z], [x + Math.cos(a) * .22 * s, h, z + Math.sin(a) * .22 * s], .025 * s, .025 * s, true);
        sphere('moss', x + Math.cos(a) * .25 * s, h, z + Math.sin(a) * .25 * s, .26 * s, .11 * s, .17 * s, true);
      }
    }
    function display(x, z, w, d, h) {
      box('masonry', x, .35, z, w, .7, d, null, false, true, 'exhibit-plinth');
      box('bronze', x, .74, z, w + .05, .09, d + .05, null, true);
      box('glass', x, .8 + h / 2, z, w, h, d, null, true);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box('bronze', x + sx * w / 2, .8 + h / 2, z + sz * d / 2, .027, h, .027, null, true);
    }
    function artwork(x, z, w, h, theme) {
      box('walnut', x, 2.2, z, w + .18, h + .18, .12, null, false, true, 'exhibit-screen');
      box('paper', x, 2.2, z - .071, w, h, .019, null, true);
      if (theme === 'line') {
        for (let n = 0; n < 6; n++) beam('ink', [x - w * .38, 2.2 - h * .3 + n * .14, z - .087], [x + w * (.11 + (n % 3) * .1), 2.2 - h * .3 + n * .14, z - .087], .016, .016, true);
      } else {
        for (let n = 0; n < 4; n++) sphere(n % 2 ? 'moss' : 'indigo', x + (n - 1.5) * w * .16, 2.1 + Math.sin(n) * h * .15, z - .091, w * .17, h * (.14 + n % 2 * .1), .012, true);
      }
    }
    function monitor(x, z, y) {
      box('steel', x, y, z, 1.15, .75, .09, null, true);
      box('screen', x, y, z - .052, 1.04, .63, .016, null, true);
      box('steel', x, y - .5, z, .07, .4, .09, null, true);
      box('steel', x, y - .68, z, .55, .035, .32, null, true);
      for (let n = 0; n < 6; n++) box(n % 3 ? 'paper' : 'bronze', x - .25 + (n % 2) * .05, y + .2 - n * .075, z - .065, .24 + n % 3 * .1, .018, .012, null, true);
    }
    function plaque(text, x, y, z, w) {
      box('walnut', x, y, z, w, .66, .15);
      box('bronze', x, y - .36, z - .015, w + .12, .035, .2, null, true);
      if (typeof document === 'undefined') return;
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 144;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.clearRect(0, 0, 768, 144); ctx.fillStyle = '#d8c6a5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '500 60px "Noto Serif SC", "Songti SC", "SimSun", serif'; ctx.fillText(text || ROLES[index], 384, 72, 708);
      const texture = new T.CanvasTexture(canvas); texture.encoding = T.sRGBEncoding;
      const material = new T.MeshStandardMaterial({ map: texture, transparent: true, roughness: .85, polygonOffset: true, polygonOffsetFactor: -1 });
      const sign = new T.Mesh(new T.PlaneGeometry(w - .2, .56), material);
      sign.rotation.y = Math.PI; sign.position.set(x, y, z - .081); detail.add(sign);
    }
    function hingeLeaf(name, x, y, z, w, h, mode) {
      // Leaves are overhead vents or lateral window shutters, never axial doors.
      const pivot = new T.Group(); pivot.name = name; pivot.position.set(x, y, z); root.add(pivot);
      const mesh = new T.Mesh(R.box, M[mode === 'skylight' ? 'glassDark' : 'cedar']);
      if (mode === 'skylight') { mesh.scale.set(w, .09, h); mesh.position.z = h / 2; }
      else { mesh.scale.set(w, h, .07); mesh.position.x = w / 2; }
      mesh.castShadow = true; mesh.receiveShadow = true; pivot.add(mesh);
      const trim = new T.Group(); pivot.add(trim);
      const add = (px, py, pz, sx, sy, sz) => {
        const m = new T.Mesh(R.box, M.bronze); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.castShadow = true; trim.add(m);
      };
      if (mode === 'skylight') {
        for (const s of [-1, 1]) add(s * w / 2, .035, h / 2, .045, .07, h);
        for (const zz of [0, h]) add(0, .035, zz, w, .07, .045);
        add(0, .04, h / 2, w, .04, .045);
      } else {
        for (const yy of [-h / 2, h / 2]) add(w / 2, yy, -.05, w, .06, .035);
        for (let p = .15; p < w; p += .16) add(p, 0, -.045, .045, h, .035);
      }
      let value = 0;
      const apply = () => { if (mode === 'skylight') pivot.rotation.x = -value * .64; else pivot.rotation.y = value * Math.PI * .47; };
      const mechanism = {
        name, kind: mode, object: pivot,
        update(openness, dt) { const target = clamp(Number(openness) || 0, 0, 1); value = dt == null ? target : value + (target - value) * (1 - Math.exp(-Math.max(0, dt) * 3)); apply(); },
        articulate(angle) { value = clamp((Number(angle) || 0) / (mode === 'skylight' ? .64 : Math.PI * .47), 0, 1); apply(); },
        get openness() { return value; }
      };
      mechanisms.push(mechanism); return mechanism;
    }
    function skylight(cx, z, y, w, d) {
      // Cut an actual opening through intersected planar roof skins. The upstand
      // is four rails, never an opaque plug beneath a supposedly working rooflight.
      for (const p of roofPanels.slice()) {
        if (p.cut || p.rotation[0] || p.rotation[1]) continue;
        const angle = p.rotation[2] || 0, cosine = Math.cos(angle), sine = Math.sin(angle);
        if (Math.abs(cosine) < .5) continue;
        const u = (cx - p.x) / cosine, v = z - p.z;
        const roofY = p.y + u * sine;
        if (roofY < y - 1.5 || roofY > y + .3) continue;
        const left = Math.max(-p.w / 2, u - w / 2 / Math.abs(cosine));
        const right = Math.min(p.w / 2, u + w / 2 / Math.abs(cosine));
        const front = Math.max(-p.d / 2, v - d / 2), back = Math.min(p.d / 2, v + d / 2);
        if (right <= left || back <= front) continue;
        for (const batch of batches.values()) {
          const n = batch.transforms.indexOf(p.matrix);
          if (n !== -1) { batch.transforms.splice(n, 1); pieces--; break; }
        }
        p.cut = true;
        const patch = (a, c, f, t) => {
          if (c - a < .01 || t - f < .01) return;
          const mid = (a + c) / 2;
          box(p.m, p.x + mid * cosine, p.y + mid * sine, p.z + (f + t) / 2, c - a, p.h, t - f, p.rotation);
        };
        patch(-p.w / 2, left, -p.d / 2, p.d / 2);
        patch(right, p.w / 2, -p.d / 2, p.d / 2);
        patch(left, right, -p.d / 2, front); patch(left, right, back, p.d / 2);
      }
      for (const s of [-1, 1]) {
        box('steel', cx + s * (w / 2 + .04), y, z, .12, .26, d + .2);
        box('steel', cx, y, z + s * (d / 2 + .04), w + .18, .26, .12);
      }
      hingeLeaf('ventilating-rooflight', cx, y + .14, z - d / 2, w, d, 'skylight');
    }
    function finish(w, d, description) {
      let drawCalls = 0;
      function flushNew() {
        for (const batch of batches.values()) {
          const start = batch.flushed || 0, transforms = batch.transforms.slice(start);
          if (!transforms.length) continue;
          const mesh = new T.InstancedMesh(batch.geo, batch.mat, transforms.length);
          transforms.forEach((matrix, n) => mesh.setMatrixAt(n, matrix));
          mesh.instanceMatrix.needsUpdate = true; mesh.name = batch.parent === detail ? 'instanced-craft-details' : 'instanced-structure';
          mesh.castShadow = !batch.mat.transparent && batch.mat !== M.lamp;
          mesh.receiveShadow = !batch.mat.transparent;
          // r128 has no per-instance frustum bounds. Root-level distance LOD is the owner.
          mesh.frustumCulled = false; batch.parent.add(mesh); batch.flushed = batch.transforms.length; drawCalls++;
        }
      }
      flushNew(); root.updateMatrixWorld(true);
      // Suspend each lantern from the actual construction directly above it.
      // Double-sided ray tests also find the underside of thin ceramic/hip skins.
      const sides = Object.values(M).map(m => [m, m.side]); sides.forEach(pair => { pair[0].side = T.DoubleSide; });
      const ray = new T.Raycaster(), upward = new T.Vector3(0, 1, 0);
      hangingLights.forEach(light => {
        const base = light.y + .82 * light.s;
        ray.set(new T.Vector3(light.x, base + .01, light.z), upward); ray.far = 14;
        const hits = ray.intersectObjects(structure.children, false);
        if (hits.length && hits[0].distance > .015) beam('bronze', [light.x, base, light.z], [light.x, hits[0].point.y, light.z], .022 * light.s, .022 * light.s, true);
      });
      sides.forEach(pair => { pair[0].side = pair[1]; }); flushNew();
      root.updateMatrixWorld(true); const box = bounds(T, root);
      const size = box.getSize(new T.Vector3());
      const metadata = { index, title, role: ROLES[index], zone, description, metreScale: true, walkableInterior: true,
        circulationWidth: 3.6, entrances: [{ x: 0, y: 0, z: -d / 2 }, { x: 0, y: 0, z: d / 2 }],
        pieces, staticDrawCalls: drawCalls, collisionPolicy: 'Physical ground obstacles only; central axial passage remains clear', bounds: box.clone() };
      root.userData.architecture = metadata;
      return { root, detail, collisionBoxes, height: box.max.y, width: size.x, depth: size.z, mechanisms, metadata };
    }
    return { T, R, M, root, structure, detail, collisionBoxes, mechanisms, emit, box, cyl, sphere, beam, ring,
      bolts, column, deck, frame, screenSide, endPanels, gutter, gable, lean, barrel, hip, lantern, table,
      bench, books, cabinet, paper, scroll, plant, display, artwork, monitor, plaque, hingeLeaf, skylight, finish };
  }

  function bounds(T, root) {
    root.updateWorldMatrix(true, true); const b = new T.Box3(), matrix = new T.Matrix4();
    root.traverse(o => {
      if (!o.isMesh) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, matrix); matrix.premultiply(o.matrixWorld); b.union(o.geometry.boundingBox.clone().applyMatrix4(matrix));
      } else b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
    }); return b;
  }

  function build(options) {
    const T = options.THREE || global.THREE, i = Number(options.index);
    if (!T) throw new Error('CourtyardArchitecture requires THREE r128');
    if (!Object.prototype.hasOwnProperty.call(ROLES, i)) throw new Error('No architectural pavilion for index ' + i);
    const b = makeBuilder(T, i, options.title || '', options.zone);
    const { box, cyl, sphere, beam, ring, column, deck, frame, screenSide, endPanels, gutter,
      gable, lean, barrel, hip, lantern, table, bench, books, cabinet, paper, scroll,
      plant, display, artwork, monitor, plaque, hingeLeaf, skylight } = b;
    const contentBuild=global.CourtyardContent?.build({index:i,b,options,T});if(contentBuild)return contentBuild;
    let w = 16, d = 14, signY = 4.5, description = '';

    if (i === 0) {
      // Ink-black ceramic gable, exposed king-post joinery, shoji and paper scrolls.
      w = 16; d = 14; deck(w, d, 'wood'); frame(14, 12, 5.4, { bays: 3 });
      gable(0, 0, 17.8, 15.5, 5.65, 3.8, 'tile');
      screenSide(-7, 0, 11.7, 4.6, 'paper'); screenSide(7, 0, 11.7, 4.6, 'paper');
      for (const s of [-1, 1]) {
        table(s * 4.5, -.7, 3.5, 2.1); paper(s * 4.5, 1.205, -.7, 2.4, 1.3, true);
        box('ink', s * 4.5 + 1.1, 1.26, -.2, .32, .11, .22, null, true);
        cyl('ceramic', s * 4.5 - 1.2, 1.35, -.3, .13, .31, null, true);
        for (let n = 0; n < 5; n++) beam('walnut', [s * 4.5 - 1.28 + n * .04, 1.24, -.3], [s * 4.5 - 1.28 + n * .055, 1.8, -.32], .019, .019, true);
        scroll(s * 4.8, 3.4, 5.9, 1.45, 2.7, true); bench(s * 4.5, -2.7, 2.5);
        cabinet(s * 4.5, 4.3, 2.8, .95, 5); lantern(s * 3.1, 4.6, -5.6);
      }
      hingeLeaf('studio-shutter', -6.7, 3.7, -5.8, 1.3, 1.5, 'shutter');
      description = 'Cedar calligraphy hall with inkstone worktables, hanging scrolls and a complete exposed timber roof'; signY = 5.1;
    } else if (i === 1) {
      w = 16; d = 16; deck(w, d); frame(14, 14, 5.2, { bays: 4, material: 'steel', post: .24 });
      barrel(0, 0, 16.6, 17.2, 5.4, 4.2, 'glass');
      for (const s of [-1, 1]) {
        screenSide(s * 7, 0, 13.7, 4.8, 'glass');
        for (const z of [-3.5, 3.7]) {
          table(s * 4.4, z, 3.2, 2, .95, 'limestone'); paper(s * 4.4, 1.04, z, 2.5, 1.4, true);
          beam('steel', [s * 5.6, 1, z], [s * 5.6, 2.5, z], .055, .055, true);
          beam('steel', [s * 5.6, 2.5, z], [s * 4.5, 2.5, z], .06, .06, true);
          box('lamp', s * 4.5, 2.43, z, .65, .07, .18, null, true);
        }
        artwork(s * 4.8, 6.7, 2.3, 2.7); cabinet(s * 5.6, .4, 1.8, 1.1, 6);
      }
      skylight(0, -1, 9.6, 2.3, 2.2); signY = 4.9;
      description = 'Ribbed bronze-and-steel conservation glasshouse with lit restoration tables and flat-file cabinets';
    } else if (i === 2) {
      w = 15.5; d = 15; deck(w, d); frame(13, 13, 5.2, { bays: 3, material: 'walnut', post: .39 });
      gable(0, 1.9, 16.9, 10.2, 5.4, 3.9, 'clay', { timber: 'walnut' });
      // The front roof has deliberately exposed rafters: a legible preserved ruin.
      for (let z = -7.5; z < -3.3; z += .68) for (const s of [-1, 1]) beam('walnut', [0, 9.3, z], [s * 8.45, 5.4, z], .14, .22);
      box('walnut', 0, 9.25, -5.5, .22, .28, 4.3);
      for (const s of [-1, 1]) for (let j = 0; j < 8; j++) for (let k = 0; k < (j % 3 === 0 ? 5 : 4); k++) {
        box((j + k) % 4 ? 'masonry' : 'limestone', s * 6.55, .27 + k * .51, -5.7 + j * 1.64, .49, .46, 1.55, null, false, true, 'retained-masonry');
      }
      table(-4.2, -.2, 3.1, 1.65); paper(-4.2, 1.21, -.2, 2.25, 1, true);
      cabinet(4.6, 3, 2.5, 1.45, 6); artwork(4.5, -2.6, 1.65, 2.1, 'line');
      scroll(-4.4, 3.3, 6.4, 1.4, 2.2, true); plant(5.7, -5.2, 1.3); lantern(-3.2, 4.1, 3.6);
      hingeLeaf('retained-studio-shutter', 3.4, 3.6, 6.3, 1.4, 1.6, 'shutter');
      description = 'Preserved masonry studio with incomplete terracotta roof, visible rafters and reclaimed timber joinery'; signY = 4.8;
    } else if (i === 3) {
      w = 16; d = 14; deck(w, d, 'wood'); frame(14, 12, 5.2, { bays: 3 });
      lean(-3.9, 0, 9.5, 15.2, 5.3, 3.8, 'copper'); lean(4.2, 0, 7.4, 15.2, 6.55, -1.6, 'tile');
      box('glass', .95, 7.75, 0, .06, 2.3, 14.4);
      for (let z = -6.8; z <= 7; z += 1.4) box('steel', .92, 7.7, z, .12, 2.5, .09, null, true);
      screenSide(-7, 0, 11.7, 4.6, 'solid'); screenSide(7, 0, 11.7, 4.6, 'glass');
      for (const z of [-3.3, 2.1]) {
        table(-4.7, z, 3.2, 2.1, 1.05, 'limestone');
        for (let n = 0; n < 4; n++) { cyl('ink', -5.6 + n * .6, 1.2, z, .18, .16, null, true); cyl('ceramic', -5.6 + n * .6, 1.24, z + .55, .12, .22, null, true); }
      }
      for (const z of [-4, 0, 4]) { scroll(4.8, 2.6, z, 1.8, 2.8, true); box('cedar', 4.8, 4.25, z, 3, .1, .14, null, true); }
      box('masonry', -5.7, 6.5, 4.2, 1.1, 4.4, 1.1); box('bronze', -5.7, 8.8, 4.2, 1.35, .15, 1.35);
      skylight(-1.9, 2, 8.35, 1.4, 1.8); description = 'Asymmetric copper clerestory atelier with ink-grinding benches and hanging drying papers'; signY = 4.7;
    } else if (i === 4) {
      w = 17; d = 15; deck(w, d, 'wood'); frame(14.5, 12.5, 4.6, { bays: 3, post: .32 });
      hip(0, 0, 18.7, 16.6, 4.9, 3.1, 'tile');
      for (const s of [-1, 1]) {
        screenSide(s * 7.25, 1, 10.1, 3.9, 'paper');
        bench(s * 5.8, 1, 6.8, true, true); bench(s * 4.5, 5.2, 2.6, false, true);
        table(s * 4.1, -.6, 1.8, 1.5, .6); cyl('ceramic', s * 4.1, .8, -.6, .13, .24, null, true);
        plant(s * 6.1, -4.7, 1.3); lantern(s * 3.2, 3.7, -4.9);
        books(s * 4.7, 5.8, 2.2, 1.3, 'front', i);
      }
      hip(0, -7.2, 6.2, 3.1, 3.7, .8, 'copper');
      for (const s of [-1, 1]) column(s * 2.7, -8, 3.7, 'cedar', .25);
      hingeLeaf('care-house-vent', 3.1, 3.05, -6.2, 1.25, 1.4, 'shutter');
      description = 'Low hipped listening house with a sheltered porch, soft seats, tea tables and warm paper screens'; signY = 4.45;
    } else if (i === 5) {
      w = 13.5; d = 12; deck(w, d, 'wood'); frame(10.5, 10, 4.6, { bays: 2, material: 'oak', post: .24 });
      for (const s of [-1, 1]) { lean(s * 3.25, 0, 6.5, 13.2, s < 0 ? 5.1 : 7.2, s < 0 ? 2.1 : -2.1, 'ceramic'); }
      box('glass', 0, 6.9, 0, .72, .1, 12.5);
      for (const s of [-1, 1]) {
        bench(s * 4.1, .8, 4.8, true, true); table(s * 3.6, -3.5, 1.5, 1, .75);
        monitor(s * 3.6, -3.5, 1.65); plant(s * 4.7, 4.1, .95); lantern(s * 2.65, 3.9, -4.7);
        screenSide(s * 5.3, .6, 7.4, 3.4, 'glass');
        box('bronze', s * 5.5, 4, 0, .12, .15, 10.9);
      }
      skylight(0, -1.8, 7.33, 1.4, 1.6);
      description = 'Small folded-ceramic shelter with a high daylight seam and intimate digital listening alcoves'; signY = 4.3;
    } else if (i === 6) {
      w = 18; d = 15; deck(w, d); frame(16, 13, 5.6, { bays: 4, material: 'steel', post: .28 });
      for (let n = 0; n < 3; n++) {
        const x = -6 + n * 6; lean(x, 0, 6, 16.4, 6, 2.7, 'copper');
        box('glass', x + 3, 7.15, 0, .065, 2.7, 15.8);
        for (let z = -7.6; z < 8; z += 1.6) box('steel', x + 3, 7.2, z, .095, 2.9, .08, null, true);
      }
      screenSide(-8, 0, 12.5, 4.8, 'solid'); screenSide(8, 0, 12.5, 4.8, 'glass');
      cabinet(-5.9, 3.9, 3.2, 1.5, 9); cabinet(5.8, 4.2, 3.3, 1.5, 9);
      for (const s of [-1, 1]) {
        table(s * 5.4, -2.2, 3.3, 2.2, 1.05, 'steel');
        box('steel', s * 5.4, 1.56, -2.2, 2.1, .18, 1.6, null, true);
        for (const x of [-.8, .8]) beam('steel', [s * 5.4 + x, 1.1, -2.2], [s * 5.4 + x, 2.55, -2.2], .13, .14, true);
        cyl('bronze', s * 5.4, 2, -2.2, .05, 1.3, null, true);
        ring('bronze', s * 5.4 + 1.05, 1.72, -2.2, .48, .06, [0, Math.PI / 2, 0], true);
        paper(s * 5.4, 1.67, -2.2, 1.7, 1, true);
      }
      skylight(-4.8, 2.7, 8.2, 1.4, 2); description = 'Three-tooth northlight print shop with working presses and small-drawer type cases'; signY = 5.25;
    } else if (i === 7) {
      w = 20; d = 17; deck(w, d); frame(18, 15, 6.4, { bays: 4, material: 'oak', post: .43 });
      gable(0, 0, 8, 18.4, 8.3, 3.1, 'copper');
      for (const s of [-1, 1]) {
        gable(s * 6.3, 0, 7, 17.4, 6.6, 2.65, 'tile');
        for (const z of [-7.3, 0, 7.3]) column(s * 3.7, z, 8.2, 'oak', .36);
        screenSide(s * 9, 0, 14.7, 5.9, 'solid');
        for (const z of [-4.2, .6, 5.7]) books(s * 6.2, z, 3.3, 4.3, 'front', i);
        table(s * 3.5, -5.3, 1.9, 1.6, 1.05); paper(s * 3.5, 1.14, -5.3, 1.3, 1.1, true);
        lantern(s * 2.6, 5.65, -6.7);
      }
      for (let z = -7; z <= 7; z += 2) box('glass', 0, 8.15, z, 7.2, .12, .95);
      skylight(0, 2, 11.7, 1.8, 2);
      description = 'Triple-roof patent basilica with a tall central nave and dense invention folio stacks'; signY = 6.5;
    } else if (i === 8) {
      w = 17; d = 17; deck(w, d, 'wood');
      for (let n = 0; n < 8; n++) {
        const a = Math.PI / 8 + n * Math.PI / 4, x = Math.cos(a) * 7.1, z = Math.sin(a) * 7.1;
        column(x, z, 5.3, 'oak', .28);
        const a2 = a + Math.PI / 4;
        beam('oak', [x, 5.35, z], [Math.cos(a2) * 7.1, 5.35, Math.sin(a2) * 7.1], .25, .3);
        beam('oak', [x, 5.35, z], [0, 8.7, 0], .17, .2);
      }
      const cone = b.R.geometry('reading-octagon', () => { const g = new T.ConeGeometry(9.2, 3.3, 8, 1, true); g.rotateY(Math.PI / 8); return g; });
      b.emit(cone, 'tile', 0, 7.05, 0, 1, 1, 1);
      cyl('glass', 0, 9.1, 0, 1.35, 1.1); cyl('copper', 0, 9.75, 0, 1.7, .18);
      for (let n = 0; n < 8; n++) { const a = n * TAU / 8; beam('bronze', [Math.cos(a) * 1.35, 8.5, Math.sin(a) * 1.35], [Math.cos(a) * 1.35, 9.65, Math.sin(a) * 1.35], .05, .05, true); }
      for (const s of [-1, 1]) {
        books(s * 5.1, 3.8, 3.4, 1.75, 'front', i); bench(s * 5.5, -.1, 4.8, true, true);
        table(s * 3.8, -3.7, 2.2, 1.5, .9); paper(s * 3.8, 1, -3.7, 1.3, .85, true); plant(s * 5.6, -4.7);
      }
      skylight(0, -.55, 9.9, 1.45, 1.2); description = 'Open octagonal reading room with radial rafters, an illuminated roof lantern and low bookshelves'; signY = 4.6;
    } else if (i === 9) {
      w = 17; d = 16; deck(w, d); frame(14, 14, 5.7, { bays: 4, material: 'steel', post: .42 });
      barrel(0, 0, 16.8, 17.4, 5.8, 4, 'copper');
      for (const s of [-1, 1]) {
        screenSide(s * 7, 0, 13.6, 5.35, 'solid');
        for (const z of [-4.7, -.4, 4.2]) {
          box('steel', s * 5.3, 1.7, z, 2.3, 3.4, 1.65, null, false, true, 'vault-cabinet');
          for (let n = 0; n < 4; n++) {
            box('masonry', s * 5.3, .5 + n * .77, z - .84, 2.08, .68, .08, null, true);
            cyl('bronze', s * 5.3 + .64, .5 + n * .77, z - .91, .08, .05, [Math.PI / 2, 0, 0], true);
          }
        }
      }
      // The great vault wheel is permanently parked beside the open public passage.
      ring('bronze', -4.6, 3.1, -7.6, 2.15, .2, null, false);
      cyl('steel', -4.6, 3.1, -7.48, 1.95, .32, [Math.PI / 2, 0, 0], false, true);
      ring('bronze', -4.6, 3.1, -7.72, .62, .07, null, true);
      for (let n = 0; n < 8; n++) { const a = n * TAU / 8; beam('bronze', [-4.6, 3.1, -7.74], [-4.6 + Math.cos(a) * .62, 3.1 + Math.sin(a) * .62, -7.74], .048, .048, true); }
      skylight(0, 3, 10.04, 1.4, 2); description = 'Copper barrel-vault archive with stone buttresses, secure drawers and a monumental wheel door parked clear of the entrance'; signY = 5.4;
    } else if (i === 10) {
      w = 18; d = 15; deck(w, d);
      for (const s of [-1, 1]) {
        for (const z of [-5.7, 0, 5.7]) column(s * 6.5, z, 9.3, 'steel', .32);
        box('steel', s * 6.5, 9.35, 0, .32, .4, 14.2);
        box('copper', s * 5.9, 9.7, 0, 4.6, .24, 16);
        for (let z = -7.4; z <= 7.5; z += .75) box('bronze', s * 5.9, 9.85, z, 4.5, .04, .028, null, true);
        for (const z of [-3.5, 2.6]) { table(s * 4.7, z, 3.1, 1.7, .98, 'steel'); monitor(s * 4.7, z, 1.86); }
        for (let y = 1; y < 8.7; y += .82) box('copper', s * 7.1, y, 5.7, 1.4, .09, .45, null, true);
        screenSide(s * 7.5, 0, 11, 4.7, 'glass');
      }
      for (const z of [-5.7, 0, 5.7]) {
        box('steel', 0, 7.7, z, 14, .35, .35);
        for (let n = 0; n < 5; n++) box(n % 2 ? 'bronze' : 'glassDark', -4 + n * 2, 8.2, z, 1.5, .55, .46, null, true);
      }
      box('glass', 0, 8, 0, 8.8, .13, 15.2); skylight(0, -.8, 8.2, 2.4, 2.2);
      description = 'Twin service gantries joined by visible exchange bridges above a glass-covered public hall'; signY = 6.7;
    } else if (i === 11) {
      w = 19; d = 16; deck(w, d); frame(16, 14, 5.8, { bays: 4, material: 'masonry', post: .47 });
      for (const s of [-1, 1]) lean(s * 4.7, 0, 9.4, 17.4, s < 0 ? 8.1 : 5.6, s < 0 ? -2.5 : 2.5, 'copper');
      box('bronze', 0, 5.8, 0, .25, .2, 17.5);
      for (const s of [-1, 1]) {
        screenSide(s * 8, 0, 13.8, 5.3, 'glass');
        table(s * 5.3, -.8, 3.1, 7.5, 1, 'oak');
        for (const z of [-3.2, -.8, 1.6]) { paper(s * 5.3, 1.09, z, 1.8, 1.2, true); box('clay', s * 5.3 + .8, 1.18, z, .25, .22, .25, null, true); }
        cabinet(s * 5.6, 5.6, 3.6, 1.65, 7); lantern(s * 2.8, 4.8, -6.1);
      }
      hingeLeaf('document-hall-shutter', -6.8, 4, -6.9, 1.4, 1.6, 'shutter');
      description = 'Butterfly-roof document hall with a bronze rain spine and long bid-review tables'; signY = 5.2;
    } else if (i === 12) {
      w = 18; d = 15; deck(w, d);
      // Lighthouse occupies the west edge, leaving a full ground-floor arcade.
      for (const x of [-7.8, -3.4]) for (const z of [-2.4, 2.4]) column(x, z, 12.8, 'masonry', .58);
      for (const y of [3.9, 7.8, 12.4]) {
        box('masonry', -5.6, y, 0, 5.3, .3, 5.8);
        for (const z of [-2.6, 2.6]) box('bronze', -5.6, y + .35, z, 5.2, .08, .08, null, true);
      }
      box('glass', -5.6, 13.6, 0, 4.4, 2, 4.5);
      for (const x of [-7.9, -3.3]) for (const z of [-2.4, 2.4]) box('bronze', x, 13.6, z, .13, 2.3, .13);
      hip(-5.6, 0, 6.1, 6.4, 14.7, 1.2, 'copper');
      ring('bronze', -5.6, 13.6, 0, .95, .11, [Math.PI / 2, 0, 0], true);
      cyl('lamp', -5.6, 13.6, 0, .58, 1.2, null, true);
      for (const z of [-6, 5.7]) for (const x of [2.7, 7.4]) column(x, z, 5.4, 'oak', .29);
      lean(3.8, 0, 10.3, 14, 6.5, -1.1, 'tile');
      books(5.3, 4.8, 3.8, 2.8, 'front', i); bench(6.1, -.8, 5, true, true); table(3.8, -3, 1.9, 1.6, .9);
      for (const z of [-4.7, 4.7]) { box('masonry', -5.6, .65, z, 3.4, 1.3, 1.2, null, false, true, 'memory-display'); scroll(-5.6, 2.3, z, 2.1, 1.5, true); }
      hingeLeaf('lighthouse-lantern-vent', -7.4, 13.7, -2.44, 1.2, 1.4, 'shutter');
      description = 'Asymmetric memory lighthouse with a four-pier lantern tower and a low sheltered reading arcade'; signY = 4.8;
    } else if (i === 13) {
      w = 16; d = 19; deck(w, d);
      for (let n = 0; n < 6; n++) {
        const z = -7.6 + n * 3.05, h = 5.2 + n * .86;
        for (const s of [-1, 1]) { column(s * 6.5, z, h, n % 2 ? 'bronze' : 'cedar', .27); display(s * 4.4, z + .3, 2.3, 1.3, .65); paper(s * 4.4, .91, z + .3, 1.6, .8, true); }
        box('cedar', 0, h, z, 14.4, .29, .34); box(n % 2 ? 'glassDark' : 'copper', 0, h + .15, z + .72, 14.8, .13, 2.1);
        for (let x = -7; x <= 7; x += .75) box('bronze', x, h + .24, z + .72, .025, .025, 2.1, null, true);
        box('lamp', -6, h - .4, z, .065, .12, 1.7, null, true);
      }
      hingeLeaf('timeline-transom', -6, 5.7, -7.5, 1.3, 1.2, 'shutter');
      description = 'Ascending sequence of six dated structural frames and alternating roof plates, with chronological vitrines'; signY = 4.6;
    } else if (i === 14) {
      w = 17; d = 17; deck(w, d, 'wood'); frame(15, 15, 6.2, { bays: 4, material: 'walnut', post: .36 });
      gable(0, 0, 18.6, 18.4, 6.5, 4.6, 'tile', { timber: 'walnut' });
      for (const s of [-1, 1]) {
        screenSide(s * 7.5, 0, 14.7, 5.7, 'solid');
        for (const z of [-4.6, .2, 5.3]) books(s * 5.6, z, 3.15, 4.6, 'front', i);
        table(s * 3.5, -6.1, 2, 1.35, .98); paper(s * 3.5, 1.07, -6.1, 1.4, .8, true);
        for (const z of [-3.8, 3.8]) { box('glass', s * 3.2, 8.8, z, 2.3, 1.7, 1.7); gable(s * 3.2, z, 3.1, 2.5, 9.4, 1.1, 'copper'); }
        lantern(s * 2.6, 5.3, -6.8);
      }
      skylight(0, 2.8, 11.25, 1.8, 1.7); description = 'Dormered biography library with tall timber stacks, individual reading desks and warm brass lamps'; signY = 5.8;
    } else if (i === 15) {
      w = 17; d = 18; deck(w, d);
      for (let n = 0; n < 5; n++) {
        const z = -7 + n * 3.5, h = 6 + (n % 3) * 1.3;
        for (const s of [-1, 1]) {
          column(s * 6.8, z, h, 'steel', .28);
          display(s * 4.7, z, 2.1, 1.55, .9);
          sphere(n % 2 ? 'bronze' : 'copper', s * 4.7, 1.18, z, .32, .32, .32, true);
          if (n < 4) beam('bronze', [s * 6.8, 3.3, z], [s * 6.8, 3.8, z + 3.5], .05, .05, true);
        }
        box('steel', 0, h, z, 14.5, .25, .35);
        lean(0, z, 16.3, 3.6, h + .3, n % 2 ? -1.5 : 1.5, n % 2 ? 'copper' : 'ceramic');
      }
      hingeLeaf('causal-gallery-vent', 3.2, 4.4, -6.8, 1.4, 1.3, 'shutter');
      description = 'Five linked structural events with alternating folded roofs and connected cause-and-effect exhibits'; signY = 4.7;
    } else if (i === 16) {
      w = 19; d = 18; deck(w, d);
      for (const s of [-1, 1]) {
        for (const x of [s * 4.2, s * 8.3]) for (const z of [-7, 0, 7]) column(x, z, 5.8, 'steel', .24);
        lean(s * 6.1, 0, 6.5, 18, s < 0 ? 7.9 : 6, s < 0 ? -1.9 : 1.9, 'copper');
        screenSide(s * 8.3, 0, 13.8, 4.8, 'glass'); bench(s * 6.3, -.6, 6.8, true);
        for (const z of [-5.7, 5.7]) {
          cyl('masonry', s * 3.8, .25, z, .68, .5, null, false, true);
          cyl('glassDark', s * 3.8, .515, z, .56, .02, null, true);
          for (let y = .8; y < 5.8; y += .3) ring('bronze', s * 3.8, y, z, .095, .018, [0, y % .6 < .3 ? 0 : Math.PI / 2, 0], true);
        }
        gutter(s * 3.5, 5.9, 0, 18, false); plant(s * 7.1, 6.1, 1.2);
      }
      // Rain stays outdoors in the open middle courtyard; covered bridges mark each entrance.
      for (const z of [-7.4, 7.4]) { box('steel', 0, 5.8, z, 9.2, .25, .3); box('glass', 0, 6, z, 8, .1, 2.1); }
      skylight(5.1, -1.2, 7.2, 1.6, 2); description = 'Open rain court with inward-draining copper roofs, rain chains, stone basins and sheltered benches'; signY = 5.25;
    } else if (i === 17) {
      w = 20.5; d = 14; deck(w, d);
      for (const s of [-1, 1]) {
        const cx = s * 5.55;
        for (const dx of [-2.65, 2.65]) for (const z of [-3.3, 3.3]) column(cx + dx, z, 7.6, 'steel', .26);
        cyl('masonry', cx, 7.6, 0, 3.76, .38); cyl('bronze', cx, 8, 0, 3.86, .14);
        const dome = b.R.geometry('observatory-dome', () => new T.SphereGeometry(1, 24, 12, .13, Math.PI - .26, 0, Math.PI / 2));
        b.emit(dome, 'copper', cx, 8.02, 0, 3.83, 3.4, 3.83);
        b.emit(dome, 'copper', cx, 8.02, 0, 3.83, 3.4, 3.83, [0, Math.PI, 0]);
        for (let n = 0; n < 12; n++) {
          const a = n * TAU / 12;
          beam('bronze', [cx + Math.cos(a) * 3.77, 8.05, Math.sin(a) * 3.77], [cx + Math.cos(a) * 2.64, 10.39, Math.sin(a) * 2.64], .035, .035, true);
        }
        table(cx, -3.8, 2.6, 1.4, .95, 'steel'); monitor(cx, -3.8, 1.8);
        beam('bronze', [cx - .5, 4.2, .1], [cx + .6, 5.8, -1.2], .33, .33);
        cyl('steel', cx, 3.55, 0, .11, 1.4, null, true);
        for (let n = 0; n < 3; n++) { const a = n * TAU / 3; beam('steel', [cx, 3.3, 0], [cx + Math.cos(a) * .8, .1, Math.sin(a) * .8], .075, .075, false, true); }
        ring('bronze', cx, 2.9, 4.6, 1.2, .045, null, true); lantern(cx + s * 2.5, 5.8, -4.5);
      }
      box('glass', 0, 6.1, 0, 5.5, .1, 13.5); for (const z of [-5.8, 5.8]) box('steel', 0, 6, z, 7, .2, .25);
      skylight(0, -1.2, 6.27, 1.8, 2.4); description = 'Paired copper observatories with open dome slits, optical instruments and a glass-roof connection'; signY = 5.45;
    } else if (i === 18) {
      w = 21; d = 14; deck(w, d);
      for (let n = 0; n < 5; n++) {
        const x = -8.4 + n * 4.2, h = 5.7 + (2 - Math.abs(2 - n)) * 1.1;
        gable(x, 0, 4.2, 15.4, h, 1.9, ['tile', 'copper', 'ceramic', 'copper', 'tile'][n]);
        for (const z of [-6, 6]) for (const dx of (n === 2 ? [-2.1, 2.1] : [-1.91, 1.91])) column(x + dx, z, h, 'oak', .2);
        if (n !== 2) { artwork(x, 4.9, 2.6, 2.9, n % 2 ? 'line' : 'landscape'); display(x, -2.2, 2.2, 1.7, .7); }
      }
      for (const s of [-1, 1]) screenSide(s * 10.1, 0, 11.7, 4.7, 'glass');
      skylight(0, 2, 9.98, 1.35, 1.5); description = 'Five individually roofed gallery bays with a taller central passage and four intimate exhibition rooms'; signY = 6.2;
    } else if (i === 19) {
      w = 18; d = 16; deck(w, d); frame(16, 14, 5.4, { bays: 4, material: 'steel', post: .27 });
      lean(0, -3.5, 18.8, 9, 5.7, 1.6, 'copper'); lean(0, 4.6, 18.8, 7.2, 7.1, -1.8, 'tile');
      box('glass', 0, 6.1, .95, 17, 1.6, .06);
      for (const s of [-1, 1]) {
        screenSide(s * 8, 0, 13.5, 4.6, 'glass');
        for (const z of [-3, 2.2]) { table(s * 4.7, z, 4, 1.9, .95); monitor(s * 4.7 - .8, z, 1.8); paper(s * 4.7 + .8, 1.04, z, 1, .8, true); }
        artwork(s * 4.8, 6.8, 3.4, 2, 'line'); cabinet(s * 6, -5.4, 2.1, .9, 4);
      }
      beam('steel', [6.2, 6.8, 4.2], [6.2, 10.2, 4.2], .07, .07);
      for (const y of [8.5, 9.3, 10]) beam('bronze', [5.6, y, 4.2], [6.8, y, 4.2], .035, .035, true);
      skylight(-1.5, -2.5, 6.85, 1.5, 1.9); description = 'Split-roof newsroom with a clerestory ribbon, editorial desks, proof boards and a small broadcast mast'; signY = 5;
    } else if (i === 20) {
      w = 17; d = 14; deck(w, d, 'wood'); frame(13.8, 11.8, 4.8, { bays: 3, material: 'walnut', post: .28 });
      // A cut-open moon ring has no lower rail across the public path.
      const radius = 4.2, cy = 4.3, front = -6.8;
      ring('chalk', 0, cy, front, radius, .25, [0, 0, -Math.PI / 3], false, Math.PI * 5 / 3);
      ring('bronze', 0, cy, front - .24, radius + .14, .028, [0, 0, -Math.PI / 3], true, Math.PI * 5 / 3);
      // Only the low curved jambs collide; never the moon opening's enclosing box.
      for (let n = 0; n < 80; n++) {
        const a = -Math.PI / 3 + n * Math.PI * 5 / 3 / 80, c = a + Math.PI * 5 / 3 / 80;
        const p = new T.Vector3(Math.cos(a) * radius, cy + Math.sin(a) * radius, front);
        const q = new T.Vector3(Math.cos(c) * radius, cy + Math.sin(c) * radius, front);
        if (Math.min(p.y, q.y) - .25 > 2.4) continue;
        const obstacle = new T.Box3().setFromPoints([p, q]).expandByScalar(.25);
        obstacle.userData = { architectural: true, part: 'curved-moon-jamb', index: i }; b.collisionBoxes.push(obstacle);
      }
      // Concave eaves are built as actual short roof facets, not a flat symbolic slab.
      for (let n = 0; n < 12; n++) {
        const x1 = -8.8 + n * 17.6 / 12, x2 = -8.8 + (n + 1) * 17.6 / 12;
        const y1 = 6.1 + .022 * x1 * x1, y2 = 6.1 + .022 * x2 * x2;
        box('tile', (x1 + x2) / 2, (y1 + y2) / 2, .8, Math.hypot(x2 - x1, y2 - y1) + .03, .15, 13.9, [0, 0, Math.atan2(y2 - y1, x2 - x1)]);
        for (const z of [-6.2, 7.6]) beam('bronze', [x1, y1, z], [x2, y2, z], .11, .14);
      }
      for (const s of [-1, 1]) {
        bench(s * 5.4, .7, 6.5, true); table(s * 3.7, 2.5, 1.7, 1.4, .63);
        screenSide(s * 6.9, 2.1, 7.4, 3.8, 'paper'); plant(s * 5.2, 5.1, .8); lantern(s * 4.8, 4.2, -3.4);
      }
      hingeLeaf('moon-pavilion-screen', 3.6, 3.1, 5.8, 1.3, 1.5, 'shutter');
      description = 'Open-bottom limestone moon gate under concave ceramic eaves, with quiet tea seats and paper screens'; signY = 5.15;
    } else if (i === 21) {
      w = 17; d = 16; deck(w, d); frame(15, 14, 5.1, { bays: 4, material: 'cedar', post: .31 });
      lean(-4.2, 0, 8.5, 17.5, 5.4, 3, 'tile'); lean(4.3, 0, 8.5, 17.5, 6.25, 1.45, 'copper');
      box('glass', .05, 7.25, 0, .045, 2.1, 17);
      for (const s of [-1, 1]) {
        screenSide(s * 7.5, 0, 13.8, 4.5, 'glass');
        table(s * 4.8, -1.2, 3.4, 5.6, 1.1, 'limestone');
        for (let n = 0; n < 4; n++) { paper(s * 4.8, 1.19, -3.1 + n * 1.25, 2.6, .95, true); box('clay', s * 4.8 + .9, 1.23, -3.1 + n * 1.25, .035, .035, .55, null, true); }
        cabinet(s * 5.5, 5.5, 3.1, 1.3, 7);
        for (let n = 0; n < 3; n++) scroll(s * 5.2, 3.4, -4.6 + n * 3, 1.5, 1.2, true);
        box('steel', s * 5.2, 4.25, 0, .045, .045, 12.3, null, true);
      }
      skylight(-1.2, 2.2, 8.15, 1.4, 1.7); description = 'Unequal northlight proofing sheds with stone review benches, correction pencils and overhead drying proofs'; signY = 4.8;
    } else if (i === 22) {
      w = 18; d = 16; deck(w, d);
      for (const s of [-1, 1]) for (const z of [-6.3, 0, 6.3]) {
        box('masonry', s * 7.1, .25, z, 1.05, .5, 1.05, null, false, true, 'stone-foot');
        box('limestone', s * 7.1, 3.2, z, .7, 6, .7, null, false, true, 'stone-pier');
        box('chalk', s * 7.1, 6.2, z, 1.1, .3, 1.1);
        for (let y = .9; y < 5.8; y += .48) box('joint', s * 7.1, y, z - .356, .18, .037, .013, null, true);
      }
      for (const z of [-6.3, 0, 6.3]) box('limestone', 0, 6.4, z, 15.7, .65, .9);
      gable(0, 0, 18.6, 17.1, 6.8, 2.5, 'tile');
      for (const s of [-1, 1]) {
        for (const z of [-3.8, 3.4]) {
          box('masonry', s * 4.8, .25, z, 2.65, .5, 1.55, null, false, true, 'stele-base');
          box('ink', s * 4.8, 1.9, z, 2.05, 3.1, .37, null, false, true, 'inscribed-stone');
          for (let a = 0; a < 5; a++) for (let n = 0; n < 7; n++) box('masonry', s * 4.8 - .65 + a * .31, 3 - n * .31, z - .196, .085 + (n % 2) * .04, .033, .012, null, true);
        }
        table(s * 4.8, -.2, 2.7, 1.5, .92, 'limestone'); paper(s * 4.8, 1.01, -.2, 2.1, 1.12, true);
        cyl('ink', s * 5.75, 1.13, -.2, .12, .18, null, true);
      }
      hingeLeaf('rubbing-house-vent', 3.2, 4.8, 6.25, 1.45, 1.4, 'shutter');
      description = 'Heavy limestone lintel pavilion protecting inscribed stone stelae and paper-rubbing worktables'; signY = 5.6;
    } else if (i === 24) {
      w = 20; d = 19; deck(w, d, 'wood');
      // Four independent cloister ranges enclose an open sky court, with axial doors.
      for (const s of [-1, 1]) {
        for (const x of [s * 4.7, s * 8.4]) for (const z of [-7.8, -3.9, 0, 3.9, 7.8]) column(x, z, 5.2, 'oak', .27);
        gable(s * 6.55, 0, 6.25, 19.6, 5.4, 1.8, 'tile');
        screenSide(s * 8.4, 0, 15.2, 4.3, 'paper');
        bench(s * 6.4, 0, 9.8, true, true);
        for (const z of [-6, 6]) { plant(s * 6.5, z, 1.1); lantern(s * 4.7, 4.2, z); }
        table(s * 3.1, 3.6, 1.55, 1.3, .65); cyl('ceramic', s * 3.1, .85, 3.6, .13, .2, null, true);
      }
      for (const z of [-7.9, 7.9]) {
        box('oak', 0, 5.2, z, 10.3, .27, .3); gable(0, z, 9.8, 3.6, 5.4, 2.2, 'copper');
        for (const s of [-1, 1]) column(s * 2.5, z, 5.2, 'oak', .27);
      }
      skylight(0, -8.1, 7.81, 1.4, 1.2); description = 'Four-range meditation cloister around an open sky courtyard, with continuous sheltered seats and tea alcoves'; signY = 4.85;
    } else if (i === 25) {
      w = 19; d = 17; deck(w, d); frame(17, 15, 5.7, { bays: 4, material: 'steel', post: .28 });
      gable(-4.5, 0, 9.4, 18.4, 6, 3.2, 'copper', { timber: 'steel' });
      gable(4.6, 0, 9.1, 18.4, 6, 2, 'tile', { timber: 'steel' });
      for (const s of [-1, 1]) {
        screenSide(s * 8.5, 0, 14.7, 4.9, 'solid');
        table(s * 5.3, -1.3, 3.7, 5.7, 1.05, 'oak'); monitor(s * 5.3, -2.5, 1.9);
        box('steel', s * 5.3, 1.65, 1, 1.7, 1.05, 1.5, null, true);
        box('glass', s * 5.3, 1.68, .23, 1.48, .8, .025, null, true);
        for (const dx of [-.65, .65]) box('bronze', s * 5.3 + dx, 1.7, 1, .045, .85, .045, null, true);
        cabinet(s * 5.7, 6.5, 3.2, 1.45, 5);
        box('cedar', s * 7.9, 3, 1, .15, 2.3, 8.2, null, true);
        for (let n = 0; n < 8; n++) { beam('steel', [s * 7.78, 2.6, -2.3 + n * .95], [s * 7.78, 3.5, -2.3 + n * .95], .055, .055, true); ring('bronze', s * 7.76, 3.5, -2.3 + n * .95, .1, .025, [0, Math.PI / 2, 0], true); }
        lantern(s * 3.1, 4.9, -6.8);
      }
      skylight(-4.5, -1.7, 9.41, 2, 2.1); hingeLeaf('maker-workshop-shutter', 4.4, 3.8, -7.35, 1.4, 1.8, 'shutter');
      description = 'Twin industrial maker sheds with steel trusses, fabrication benches, glazed machines and hanging tools'; signY = 5.3;
    }
    // Every threshold has a readable, human-height address and a visible latch-free route.
    const signZ = -Math.min(d / 2 - .15, 7.8);
    plaque(options.title || ROLES[i], 0, signY, signZ, i === 5 ? 3.5 : 4.1);
    for (const s of [-1, 1]) {
      box('bronze', s * 2.15, .08, -d / 2 + .1, .11, .12, .78, null, true);
      lantern(s * 2.6, Math.min(3.8, signY - .7), signZ + .25, .75);
    }
    // Keep a single predictable motion contract, including pavilions with only roof vents.
    const result = b.finish(w, d, description);
    result.metadata.materials = 'limestone, cedar, dark steel, patinated copper, bronze, ceramic, glass';
    return result;
  }
  global.CourtyardArchitecture = Object.freeze({ build, bounds, roles: Object.freeze(ROLES), version: '1.0.0' });
})(typeof window !== 'undefined' ? window : globalThis);
