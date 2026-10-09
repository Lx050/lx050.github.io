/* 月雪: an inhabited reading garden, interpreted from every section of readings/20.json.
 * Loaded after content-literary.js; replaces only CourtyardContentBuilders[20].
 * White walls hold actual apertures. Turning, a blank resting court, and paired
 * approaches to a shared desk carry the account; the full prose stays in the DOM.
 */
(function (global) {
  'use strict';
  const C = global.CourtyardContent;
  const B = global.CourtyardContentBuilders = global.CourtyardContentBuilders || {};
  const SOURCE = '/?read=20';
  const SECTION_IDS = ['preface', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'source-note'];

  B[20] = function ({b, options}) {
    const T = b.T, width = 19.8, depth = 20.8;
    const inscriptions = [], readingAnchors = [], routes = [];
    // These are surface finishes of the common palette, never a separate colour scheme.
    const plaster = b.M.chalk.clone(); plaster.roughness = .98;
    const gravel = b.M.linen.clone(); gravel.roughness = 1;
    const roofTile = b.M.tile.clone(); roofTile.roughness = .96;
    const inkWash = b.M.ink.clone(); inkWash.roughness = 1;
    const front = -10.4, rear = 10.4;

    function solid(x, y, z, w, h, d, name) {
      const box = new T.Box3(new T.Vector3(x - w / 2, y - h / 2, z - d / 2), new T.Vector3(x + w / 2, y + h / 2, z + d / 2));
      box.userData = {architectural: true, part: name, index: 20}; b.collisionBoxes.push(box);
    }
    function wall(x, z, length, height, yaw, name) {
      b.box(plaster, x, height / 2, z, length, height, .25, [0, yaw || 0, 0], false, true, name || 'white-garden-wall');
      b.box('masonry', x, .12, z, length + .03, .24, .29, [0, yaw || 0, 0], false, true, 'wall-stone-foot');
      b.box(roofTile, x, height + .055, z, length + .12, .11, .4, [0, yaw || 0, 0]);
      b.box('ceramic', x, height + .13, z, length + .15, .055, .16, [0, yaw || 0, 0], true);
    }
    function paving(x, z, w, d, material) {
      b.box(material || 'limestone', x, .027, z, w, .035, d, null, true);
      // Fine transverse joints make these walking surfaces, rather than route logos.
      for (let zz = z - d / 2 + .65; zz < z + d / 2; zz += .73) b.box('masonry', x, .046, zz, w - .04, .006, .014, null, true);
    }
    function path(name, points, sectionIds) {
      routes.push({name, points, bodyRadius: .38, sectionIds});
    }
    function anchor(sectionId, x, z, view, name) {
      readingAnchors.push({sectionId, position: [x, .045, z], view: view || [x, 1.6, z + 2], name, source: SOURCE + (sectionId === 'preface' || sectionId === 'source-note' ? '' : '#' + sectionId)});
    }
    function grove(x, z, scale, autumn) {
      // A compact, rooted tree; all collision volumes sit inside planting beds.
      b.cyl('walnut', x, 1.02 * scale, z, .08 * scale, 2.04 * scale, null, false, true);
      for (let n = 0; n < 6; n++) {
        const a = n * 2.37, ex = x + Math.cos(a) * (.55 + n % 2 * .16) * scale;
        const ez = z + Math.sin(a) * (.55 + n % 2 * .14) * scale;
        const ey = (1.64 + n % 3 * .37) * scale;
        b.beam('walnut', [x, 1.03 * scale, z], [ex, ey, ez], .037 * scale, .045 * scale, true);
        b.sphere(autumn && n % 3 === 0 ? 'clay' : 'moss', ex, ey + .07 * scale, ez, .48 * scale, .16 * scale, .42 * scale, true);
        for (let k = 0; k < 3; k++) b.sphere(autumn && k === 0 ? 'oak' : 'moss', ex + Math.cos(k * 2.1) * .27 * scale, ey + .12 * scale, ez + Math.sin(k * 2.1) * .3 * scale, .25 * scale, .07 * scale, .2 * scale, true);
      }
    }
    function gravelBed(x, z, w, d, seed) {
      b.box(gravel, x, .033, z, w, .038, d, null, true);
      // Deterministic aggregate is shared instanced geometry, not a noisy texture image.
      for (let n = 0; n < 72; n++) {
        const u = (Math.sin((n + seed) * 127.13) * 43758.5453) % 1;
        const v = (Math.sin((n + seed + 17) * 73.91) * 19643.139) % 1;
        b.sphere(n % 4 ? 'chalk' : 'masonry', x + u * w * .47, .059, z + v * d * .47, .055 + n % 3 * .008, .019, .041, true);
      }
      for (const sx of [-1, 1]) b.box('masonry', x + sx * (w / 2 + .03), .045, z, .075, .055, d + .1, null, true);
      for (const sz of [-1, 1]) b.box('masonry', x, .045, z + sz * (d / 2 + .03), w + .12, .055, .075, null, true);
    }
    function roof(cx, cz, w, d, eave, rise) {
      // Small segmented concave tile slopes and a modest lifted eave, not a giant emblem.
      const steps = 6, half = w / 2;
      const yAt = u => eave + rise * Math.pow(1 - u, 1.14) + .13 * Math.pow(u, 8);
      for (const side of [-1, 1]) for (let j = 0; j < steps; j++) {
        const u0 = j / steps, u1 = (j + 1) / steps;
        const x0 = cx + side * half * u0, x1 = cx + side * half * u1;
        const y0 = yAt(u0), y1 = yAt(u1);
        const angle = Math.atan2(y1 - y0, x1 - x0);
        b.box(roofTile, (x0 + x1) / 2, (y0 + y1) / 2, cz, Math.hypot(x1 - x0, y1 - y0) + .04, .105, d, [0, 0, angle]);
        for (let zz = -d / 2 + .13; zz < d / 2; zz += .39) {
          b.beam(roofTile, [x0, y0 + .067, cz + zz], [x1, y1 + .067, cz + zz], .045, .056, true);
        }
        for (const end of [-1, 1]) b.beam('walnut', [x0, y0 - .11, cz + end * (d / 2 - .07)], [x1, y1 - .11, cz + end * (d / 2 - .07)], .12, .12);
      }
      b.box(roofTile, cx, eave + rise + .09, cz, .17, .17, d + .14);
      for (const side of [-1, 1]) b.box('walnut', cx + side * (half - .08), eave -.035, cz, .15, .14, d -.08);
    }
    function post(x, z, height) {
      b.box('masonry', x, .115, z, .37, .23, .37, null, false, true, 'garden-column-foot');
      b.box('walnut', x, height / 2 + .12, z, .19, height, .19, null, false, true, 'garden-timber-column');
      b.box('cedar', x, height - .11, z, .3, .15, .3, null, true);
    }
    function inscription({name, sectionId, text, lines, attribution, x, y, z, w, h, yaw, pitch, roll, vertical}) {
      const record = {name, sectionId, text, attribution, source: SOURCE + '#' + sectionId,
        position: [x, y, z], size: [w, h], rotation: [pitch || 0, yaw || 0, roll || 0], originalSpellingPreserved: false};
      inscriptions.push(record);
      if (typeof document === 'undefined') return;
      const canvas = document.createElement('canvas');
      const scale = 512 / Math.max(w, h);
      canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
      const cw = canvas.width, ch = canvas.height;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch); ctx.fillStyle = '#222d2f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (vertical) {
        const cols = lines || [text], longest = Math.max(...cols.map(line => [...line].length));
        const fontSize = Math.min(cw / (cols.length * 1.8), ch * .72 / longest);
        ctx.font = '500 ' + fontSize + 'px "Noto Serif SC", "Songti SC", "SimSun", serif';
        cols.forEach((line, column) => {
          [...line].forEach((letter, n) => ctx.fillText(letter, cw / 2 + ((cols.length - 1) / 2 - column) * fontSize * 1.6, ch * .13 + n * (ch * .68 / Math.max(1, line.length - 1))));
        });
      } else {
        const rows = lines || [text], longest = Math.max(...rows.map(row => [...row].length));
        const fontSize = Math.min(cw * .86 / longest, ch * .5 / rows.length);
        ctx.font = '500 ' + fontSize + 'px "Noto Serif SC", "Songti SC", "SimSun", serif';
        rows.forEach((line, n) => ctx.fillText(line, cw / 2, ch * .4 + (n - (rows.length - 1) / 2) * fontSize * 1.5));
      }
      const noteSize = Math.min(16, cw * .9 / Math.max(1, [...(attribution || '')].length));
      ctx.font = noteSize + 'px "Noto Serif SC", "Songti SC", "SimSun", serif'; ctx.fillStyle = '#685d4b';
      if (attribution) ctx.fillText(attribution, cw / 2, ch * .94);
      const tex = new T.CanvasTexture(canvas); tex.encoding = T.sRGBEncoding;
      tex.anisotropy = 2; tex.userData = {readingSource: SOURCE + '#' + sectionId, maximumDimension: 512};
      const mat = new T.MeshStandardMaterial({map: tex, transparent: true, roughness: .98, metalness: 0, side: T.DoubleSide,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1});
      const mesh = new T.Mesh(new T.PlaneGeometry(w, h), mat);
      mesh.position.set(x, y, z); mesh.rotation.set(pitch || 0, yaw || 0, roll || 0); mesh.name = name;
      mesh.userData.readingPanel = {index: 20, sectionId}; mesh.userData.adaptedText = record;
      b.detail.add(mesh);
    }

    // A flush stone field, with darker covered paving and matte dry gardens.
    b.box('masonry', 0, -.04, 0, width, .08, depth);
    b.box('limestone', 0, .006, 0, width -.04, .02, depth -.04, null, true);
    paving(0, 0, 3.6, depth, 'chalk');
    for (const side of [-1, 1]) b.box('masonry', side * 1.81, .032, 0, .025, .025, depth, null, true);
    paving(-3.25, -7.8, 1.8, 5.0);
    paving(-5.45, -6.17, 6.2, 1.62);
    paving(-7.7, -2.05, 2.35, 8.1, 'masonry');
    paving(-5.48, 1.28, 6.4, 1.65);
    paving(-3.25, 5.45, 1.75, 7.25);
    paving(0, 3.45, 8.25, 1.55);
    paving(3.42, 4.28, 1.34, 10.95);
    paving(8.22, 4.28, 1.34, 10.95);
    paving(5.82, -.78, 6.1, 1.45);
    paving(5.82, 8.68, 6.1, 1.38);
    paving(5.82, 4.9, 6.1, 1.3);

    // First threshold: a genuine circular opening cut out of thick white masonry.
    // It frames the small autumn tree; the walk turns through the adjacent open door.
    const moonX = -6.86, moonZ = -7.72, moonY = 2.08, moonRadius = .94;
    const shape = new T.Shape(); shape.moveTo(-2.38, 0); shape.lineTo(2.38, 0); shape.lineTo(2.38, 3.75); shape.lineTo(-2.38, 3.75); shape.closePath();
    const aperture = new T.Path(); aperture.absarc(0, moonY, moonRadius, 0, Math.PI * 2, true); shape.holes.push(aperture);
    const moonGeometry = new T.ExtrudeGeometry(shape, {depth: .26, bevelEnabled: false, curveSegments: 32});
    b.emit(moonGeometry, plaster, moonX, 0, moonZ -.13, 1, 1, 1);
    solid(moonX, .57, moonZ, 4.76, 1.14, .26, 'moon-window-low-sill-wall');
    for (const side of [-1, 1]) solid(moonX + side * 1.68, 2.4, moonZ, 1.39, 2.7, .26, 'moon-window-masonry-cheek');
    solid(moonX, 3.415, moonZ, 2.0, .67, .26, 'moon-window-top-spandrel');
    // A plain stone reveal within the wall, no freestanding torus or moon sculpture.
    for (let n = 0; n < 40; n++) {
      const a = n / 40 * Math.PI * 2, c = (n + 1) / 40 * Math.PI * 2;
      b.beam('limestone', [moonX + Math.cos(a) * .983, moonY + Math.sin(a) * .983, moonZ], [moonX + Math.cos(c) * .983, moonY + Math.sin(c) * .983, moonZ], .077, .31, true);
    }
    b.box('masonry', moonX, .115, moonZ, 4.79, .23, .3);
    b.box(roofTile, moonX, 3.805, moonZ, 4.94, .11, .48);
    b.box('ceramic', moonX, 3.89, moonZ, 5.02, .06, .18, null, true);
    wall(-2.53, -7.72, .36, 3.3, 0, 'entry-door-short-cheek');
    // Clear door width 1.77 m; lintel underside 3.18 m, above the jump envelope.
    b.box('walnut', -3.455, 3.3, -7.72, 2.09, .22, .29);
    inscription({name: 'poem-in-the-entry-wall', sectionId: 'c4', text: '月色与雪色之外\n你是唯一的绝色', lines: ['月色与雪色之外', '你是唯一的绝色'],
      attribution: '余光中《绝色》· 原作转引', x: -4.96, y: 1.89, z: -7.868, w: .93, h: 1.72, yaw: Math.PI, vertical: true});
    anchor('preface', 0, -9.7, [-6.86, 2.08, -7.72], 'Framed first glimpse');
    anchor('c1', -3.25, -8.65, [-3.25, 1.6, -6.1], 'The modest open side door');
    anchor('c2', -3.25, -6.2, [-7.7, 1.6, -6.2], 'A turn into the shared institution');
    anchor('c3', -6.1, -6.2, [-5.4, 1.8, -3.8], 'Autumn branches and close care');
    anchor('c4', -5.0, -9.1, [-4.96, 1.89, -7.868], 'Poem at the garden threshold');

    // Western garden: the corridor provides an actual indirect sequence and enclosure.
    gravelBed(-4.89, -3.25, 3.42, 4.62, 9);
    grove(-5.25, -4.15, .93, true);
    b.sphere('masonry', -4.1, .28, -2.65, .56, .3, .39);
    solid(-4.1, .22, -2.65, 1.08, .43, .74, 'dry-garden-rock');
    b.sphere('limestone', -4.53, .15, -2.18, .39, .15, .25);
    for (const x of [-8.96, -6.43]) for (const z of [-6.8, -3.08, .6]) post(x, z, 3.31);
    for (const x of [-8.96, -6.43]) b.box('walnut', x, 3.36, -3.1, .19, .22, 7.62);
    for (const z of [-6.8, -3.08, .6]) b.box('cedar', -7.7, 3.36, z, 2.73, .22, .2);
    roof(-7.7, -3.1, 3.08, 8.3, 3.61, .72);
    wall(-9.25, -5.01, 3.6, 2.76, Math.PI / 2, 'western-corridor-solid-end');
    wall(-9.25, 1.04, 3.15, 2.76, Math.PI / 2, 'western-corridor-resting-end');
    // Rectangular leaking window in between; a rigid lattice screen slides beside it.
    b.box(plaster, -9.25, .61, -1.83, .25, 1.22, 2.75, null, false, true, 'leak-window-sill');
    b.box(plaster, -9.25, 2.585, -1.83, .25, .35, 2.75);
    b.box('walnut', -9.085, 1.24, -1.83, .065, .07, 2.8, null, true);
    b.box('walnut', -9.085, 2.38, -1.83, .065, .07, 2.8, null, true);
    for (const z of [-3.17, -.49]) b.box('walnut', -9.085, 1.81, z, .07, 1.23, .07, null, true);
    const screen = new T.Group(); screen.name = 'sliding-leak-window-screen'; screen.position.set(-9.08, 1.81, -2.49); b.root.add(screen);
    C.boxMesh(b, screen, 'linen', 0, 0, 0, .035, 1.04, 1.23, 'window-screen-paper');
    for (const zz of [-.66, -.22, .22, .66]) C.boxMesh(b, screen, 'walnut', .035, 0, zz, .06, 1.18, .04, 'lattice-upright');
    for (const yy of [-.57, -.19, .19, .57]) C.boxMesh(b, screen, 'walnut', .04, yy, 0, .065, .035, 1.36, 'lattice-rail');
    // Entire sweep is in the wall zone, clear of the corridor at every phase.
    solid(-9.08, 1.81, -1.99, .15, 1.23, 2.38, 'window-screen-swept-envelope');
    C.motion(b, 'open-the-leaking-window', screen, value => { screen.position.z = -2.49 + 1.02 * value; }, 'sliding-garden-lattice');
    b.box('cedar', -9.065, 2.47, -1.84, .14, .055, 2.77, null, true);
    // Narrow bamboo silhouettes beyond the window still remain within the terrace.
    for (let n = 0; n < 7; n++) {
      const z = -3.04 + n * .32, h = 1.9 + n % 3 * .25;
      b.cyl('moss', -9.57, h / 2, z, .022, h, null, true);
      for (let j = 0; j < 3; j++) b.sphere('moss', -9.55 + (j % 2 ? .08 : -.05), 1.1 + j * .3, z + .1, .08, .025, .24, true);
    }

    // A quiet blank wall is deliberately the largest unlettered surface in the route.
    wall(-6.89, 3.21, 4.83, 2.92, 0, 'uninscribed-resting-court-wall');
    b.bench(-6.84, 2.55, 2.65, false, false);
    gravelBed(-7.94, 5.97, 2.05, 4.65, 23);
    grove(-8.01, 6.51, .78, false);
    wall(-9.24, 6.11, 5.67, 2.65, Math.PI / 2, 'quiet-rear-garden-edge');
    b.box('limestone', -4.99, 1.68, 3.069, .59, 1.65, .032, null, true);
    inscription({name: 'self-cultivation-at-the-turn', sectionId: 'c6', text: '静以修身', lines: ['静以修身'], attribution: '陆 · 匿名化文字',
      x: -4.99, y: 1.68, z: 3.044, w: .5, h: 1.52, yaw: Math.PI, vertical: true});
    anchor('c5', -7.7, .9, [-6.84, 1.6, 3.21], 'An intentionally uninscribed resting court');
    anchor('c6', -5.07, 1.29, [-4.99, 1.68, 3.04], 'Self-cultivation at the next turn');
    // No fence or mechanism across this connecting court: rest remains optional.
    paving(-5.43, 8.64, 6.45, 1.38);

    // East garden: low side walls offer borrowed views while paired paths lead to work.
    wall(9.24, -3.0, 10.65, 2.52, Math.PI / 2, 'eastern-garden-boundary');
    wall(6.67, -8.42, 5.4, 2.7, 0, 'eastern-entrance-return');
    gravelBed(6.12, -4.52, 3.68, 4.46, 41);
    grove(7.03, -4.79, 1.1, false);
    b.sphere('masonry', 5.31, .4, -4.8, .49, .43, .36);
    solid(5.31, .32, -4.8, .92, .62, .67, 'east-dry-garden-rock');
    // A waist-height wall holds the view without turning the routes into a maze.
    wall(5.81, 1.2, 2.88, 1.02, 0, 'paired-route-low-garden-divider');
    gravelBed(5.81, 2.67, 2.74, 1.48, 63);
    for (let n = 0; n < 5; n++) b.sphere('moss', 4.78 + n * .49, .25, 2.73 + Math.sin(n) * .19, .29, .21, .3, true);
    // The two paving paths have equal width and stay physically separated until the desk.
    for (const x of [3.42, 8.22]) for (let z = -.8; z < 8.3; z += 1.47) b.box('chalk', x, .052, z, 1.16, .018, .65, null, true);

    // Shared rear study. It is open to both paths, with a framed view into the garden.
    for (const x of [2.55, 9.14]) for (const z of [4.24, 9.49]) post(x, z, 3.42);
    for (const x of [2.55, 9.14]) b.box('walnut', x, 3.48, 6.87, .22, .22, 5.5);
    for (const z of [4.24, 9.49]) b.box('cedar', 5.845, 3.48, z, 6.82, .22, .22);
    roof(5.845, 6.84, 7.39, 6.04, 3.73, .94);
    wall(5.845, 9.58, 6.82, 3.3, 0, 'shared-study-rear-wall');
    // Side window has a low sill and open upper frame, preserving the pair's common view.
    b.box(plaster, 9.23, .43, 6.77, .24, .86, 4.8, null, false, true, 'study-window-sill');
    for (const z of [5.0, 6.75, 8.49]) b.box('walnut', 9.12, 1.98, z, .065, 2.13, .065, null, true);
    b.box('walnut', 9.12, 2.94, 6.75, .085, .09, 4.9, null, true);
    b.table(5.82, 6.84, 3.36, 1.52, .92, 'oak');
    b.paper(5.03, 1.008, 6.75, 1.21, .95, false);
    b.paper(6.6, 1.013, 6.75, 1.2, .95, false);
    b.box('ink', 5.85, 1.035, 7.13, .23, .055, .16, null, true);
    b.beam('walnut', [5.71, 1.053, 6.98], [6.06, 1.053, 6.38], .016, .022, true);
    b.box('linen', 6.49, 1.022, 6.89, .46, .023, .45, null, true);
    // A single stool at either end leaves both approach paths and rear convergence clear.
    for (const x of [4.91, 6.74]) {
      b.box('cedar', x, .43, 5.65, .52, .12, .48, null, false, true, 'shared-study-stool');
      for (const side of [-1, 1]) b.box('walnut', x + side * .16, .23, 5.65, .08, .4, .37, null, true, true, 'stool-leg');
    }
    inscription({name: 'trust-on-the-working-paper', sectionId: 'c7', text: '这个我把握不住，友人18能把住', lines: ['这个我把握不住，', '友人18能把住'], attribution: '柒 · 2026 年 3 月',
      x: 5.03, y: 1.024, z: 6.74, w: 1.15, h: .84, pitch: -Math.PI / 2, roll: Math.PI});
    // The abstract wash is an architectural interpretation, not a replica of the absent gift.
    b.box('walnut', 5.845, 2.19, 9.405, 2.62, 1.85, .115, null, false, true, 'framed-painting');
    b.box('paper', 5.845, 2.19, 9.337, 2.42, 1.65, .02, null, true);
    for (let n = 0; n < 6; n++) b.beam(inkWash, [4.77 + n * .17, 1.74 + n % 2 * .05, 9.315], [5.62 + n * .12, 2.25 + Math.sin(n) * .09, 9.315], .025 + n % 2 * .011, .012, true);
    for (let n = 0; n < 4; n++) b.beam('moss', [5.68 + n * .16, 1.85, 9.307], [6.24 + n * .14, 2.16 + n % 2 * .07, 9.307], .016, .009, true);
    b.box('clay', 6.71, 1.56, 9.308, .065, .1, .011, null, true);
    // No invented signature: the exact final phrase sits on a separate paper label.
    b.box('paper', 7.74, 1.87, 9.42, .53, 1.34, .026, null, true);
    inscription({name: 'everyday-ending-beside-the-frame', sectionId: 'c10', text: '我也带着', lines: ['我也带着'], attribution: '拾 · 匿名化对话',
      x: 7.74, y: 1.87, z: 9.393, w: .46, h: 1.23, yaw: Math.PI, vertical: true});
    anchor('c7', 3.42, 5.95, [5.03, 1.024, 6.74], 'Changed names and reliable judgement');
    anchor('c8', 8.22, 5.15, [5.82, 1.0, 6.84], 'Two equal approaches to one task');
    anchor('c9', 8.22, 7.34, [6.6, 1.013, 6.75], 'Making room at the shared desk');
    anchor('c10', 5.845, 8.63, [5.845, 2.19, 9.33], 'The received picture and an everyday ending');
    anchor('source-note', 3.42, 8.63, [7.74, 1.87, 9.39], 'Source and interpretation remain available');
    // Three warm, small lamps support the rooms. There is no monumental light feature.
    b.lantern(-7.7, 3.3, -5.0, .4);
    b.lantern(-7.7, 3.3, -.4, .4);
    b.lantern(5.845, 3.35, 8.3, .4);

    path('clear-central-through-route', [[0, -10.3], [0, 10.3]], []);
    path('poem-turn-and-quiet-rest', [[0, -9.4], [-3.25, -9.4], [-3.25, -6.18], [-7.7, -6.18], [-7.7, 1.27], [-5.1, 1.27], [-3.25, 1.27], [-3.25, 3.45], [0, 3.45]], ['preface', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
    path('parallel-inner-approach', [[0, 3.45], [3.42, 3.45], [3.42, 8.65], [5.845, 8.65]], ['c7', 'c10']);
    path('parallel-outer-approach', [[0, -.8], [3.42, -.8], [8.22, -.8], [8.22, 8.65], [5.845, 8.65]], ['c8', 'c9', 'c10']);
    path('quiet-rear-return', [[0, 3.45], [-3.25, 3.45], [-3.25, 8.64], [0, 8.64]], ['c6', 'source-note']);
    path('study-return-to-through-route', [[5.845, 8.65], [3.42, 8.65], [0, 8.65]], ['c10']);
    b.root.userData.contentVisitorRoutes = routes;
    const result = b.finish(width, depth, 'Classical Chinese reading garden: an offset moon-window threshold, a turning covered corridor and blank resting wall, then equal paths to one shared study and framed painting');
    Object.assign(result.metadata, {
      role: '月色与雪色之外 · 山水阅读庭院', contentGrounded: true, readingPanelMode: 'integrated',
      contentConcept: '诗意的靠近，经停顿与自持，转为可靠的并肩；文字在转身、驻足与共同工作的位置被遇见。',
      spatialSequence: ['偏置月窗与秋枝：先见局部，再从旁门转入', '曲廊与无字静庭：晚安收回之后，留出安静', '两条等宽小径与同一书案：称呼改变，协作成熟', '画入共同的书斋，以「我也带着」回到日常'],
      conceptualSequence: [
        {sections: ['preface', 'c1', 'c2', 'c3', 'c4'], device: 'Offset moon-window wall and side entry: a partial view, autumn branches, one borrowed poem'},
        {sections: ['c5', 'c6'], device: 'Covered turn and an uninscribed resting wall, with self-cultivation encountered only at the exit'},
        {sections: ['c7', 'c8', 'c9'], device: 'Two equally traversable approaches to the same practical desk'},
        {sections: ['c10', 'source-note'], device: 'A framed interpretive wash in the shared study and the exact everyday last phrase'}
      ],
      sourceURLs: [SOURCE], evidenceURLs: SECTION_IDS.filter(id => /^c\d/.test(id)).map(id => SOURCE + '#' + id), evidence: [SOURCE],
      sourceReading: 'assets/readings/20.json', sourceSectionsReviewed: SECTION_IDS.slice(), fullProsePresentation: 'Lazy DOM reader; all adapted sections retained',
      readingAnchors, adaptedTextMappings: inscriptions, compositionViews: [
        {name: 'moon-snow-entry-framed-glimpse', position: [-5.4, 1.75, -10.6], target: [-6.15, 1.94, -7.7]},
        {name: 'moon-snow-turn-and-pause', position: [-7.7, 1.72, -1.8], target: [-6.25, 1.65, 3.15]},
        {name: 'moon-snow-shared-study', position: [4.0, 1.75, 3.15], target: [6.08, 1.65, 8.0]},
        {name: 'moon-snow-painting-ending', position: [5.84, 1.73, 8.12], target: [6.54, 1.98, 9.42]},
        {name: 'moon-snow-exterior', position: [15.5, 11.5, -18.5], target: [-.25, 1.2, .6]}
      ], visitorRoutes: routes, visitorRouteBodyRadius: .38,
      narrativeBoundary: 'The source narrator interprets the relationship. The garden does not establish another person’s private feelings or turn the account into a mutual-romance claim.',
      interpretationBoundary: 'Architectural interpretation of the complete public essay, not a reconstruction of a real garden, office, or the gifted painting. The abstract wash and small unlettered red mark are constructed scenery; no original image or signature was available.',
      phaseStates: [0, .5, 1], phaseLabels: ['漏窗收合', '借景半启', '静庭通明'], shortPhaseLabels: ['收窗', '借景', '通明'],
      phaseMeaning: {0: 'Lattice rests at the first window bay', .5: 'Lattice partly reveals the bamboo view', 1: 'Lattice rests beside the revealed view'},
      interactionHint: '推开漏窗，沿曲廊走向共同书案', mechanism: 'A small rigid lattice translates 1.02 m within the western wall; no essential route is sealed in any phase.',
      movingGeometryPolicy: 'Rigid translation only. The screen swept envelope remains inside the wall zone and outside every declared walking route.', initialPhase: .5,
      materials: 'Shared chalk plaster, matte linen gravel, limestone paths, dark tile, walnut framing, warm cedar and paper',
      minimumPublicAisleWidth: 3.6, minimumSideDoorWidth: 1.77, lowestTraversedBeamUnderside: 3.19,
      observations: [
        'The opening poem is attributed to Yu Guangzhong in the source and appears on a wall beside a real moon window, never as a giant autonomous sign.',
        'The November withdrawal and December letter lead to an intentionally unlettered resting surface, rather than an invented mutual declaration.',
        'The final worktable, paired access and framed interpretive painting respond to reliable judgement, shared work and the accepted gift in chapters seven through ten.'
      ]
    });
    return result;
  };
})(window);
