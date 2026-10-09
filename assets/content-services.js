/* Verified service content becomes circulation, rooms and working construction.
 * The straight public aisle is always 3.6 m wide. All moving leaves are above
 * head height and lateral to the aisle; no mechanism is a blocking axial door.
 * Evidence was read on 2026-10-08. Login-only services 8, 9 and 11 are untouched.
 */
(function (global) {
  'use strict';
  const C = global.CourtyardContent;
  const builders = global.CourtyardContentBuilders = global.CourtyardContentBuilders || {};

  function solid(b, m, x, y, z, w, h, d, name, rotation, fine) {
    return b.box(m, x, y, z, w, h, d, rotation || null, !!fine, true, name);
  }
  function beamJoint(b, x, y, z, w, h) {
    b.box('steel', x, y, z, w, h, .035, null, true);
    b.bolts(x, y, z - .026, w, h);
  }
  function sideWall(b, x, z, length, height, material) {
    solid(b, 'masonry', x, .3, z, .25, .6, length, 'wall-stone-base');
    solid(b, material || 'paper', x, (height + .6) / 2, z, .15, height - .6, length, 'enclosing-wall');
    for (const y of [.65, height]) b.box('cedar', x, y, z, .2, .1, length + .08, null, true);
    for (let zz = z - length / 2; zz <= z + length / 2 + .01; zz += 1.35) {
      solid(b, 'cedar', x, height / 2, zz, .2, height, .075, 'wall-mullion', null, true);
    }
  }
  function slatWall(b, x, z, length, height, spacing, material) {
    solid(b, 'masonry', x, .18, z, .24, .36, length, 'privacy-screen-plinth');
    for (let zz = z - length / 2 + .08; zz < z + length / 2; zz += spacing || .23) {
      solid(b, material || 'cedar', x, height / 2 + .18, zz, .14, height, .09, 'privacy-screen-slat', null, true);
    }
    b.box('cedar', x, height + .23, z, .24, .12, length + .12, null, true);
  }
  function bed(b, x, z, w, d, plants) {
    solid(b, 'limestone', x, .2, z, w, .4, d, 'garden-bed');
    b.box('soil', x, .414, z, w - .2, .025, d - .2, null, true);
    (plants || [[0, 0]]).forEach((p, i) => {
      const px = x + p[0], pz = z + p[1];
      b.beam('walnut', [px, .4, pz], [px, 1.15 + i % 2 * .28, pz], .065, .065, true, true);
      b.sphere('moss', px, 1.18 + i % 2 * .28, pz, .47, .39, .45, true);
    });
  }
  function sideColumns(b, xs, zs, eave, material) {
    for (const x of xs) {
      zs.forEach(z => b.column(x, z, eave, material || 'cedar', .25));
      b.box(material || 'cedar', x, eave + .1, (zs[0] + zs[zs.length - 1]) / 2,
        .23, .3, zs[zs.length - 1] - zs[0] + .5);
      for (const z of zs) beamJoint(b, x, eave - .24, z - .145, .26, .45);
    }
  }
  function entryFrame(b, front, signY, head, back, material) {
    // A supported address and hung lights, including courts without a central roof.
    for (const s of [-1, 1]) {
      b.column(s * 3.15, front, head, material || 'oak', .22);
      b.beam(material || 'oak', [s * 3.15, head, front], [s * 3.15, head, back], .18, .21);
      b.beam(material || 'oak', [s * 3.15, head - .85, front], [s * 2.45, head, front], .12, .14, true);
      b.beam('bronze', [s * 1.65, signY + .31, front], [s * 1.65, head, front], .035, .035, true);
    }
    b.box(material || 'oak', 0, head + .06, front, 6.65, .23, .5);
  }
  function returnedPath(b, side, outer, front, rear, material) {
    C.pathLine(b, [[0, front], [side * outer, front], [side * outer, rear], [0, rear]], material || 'bronze', .04);
  }
  function smallRoofLeaves(b, name, positions, material, apply) {
    const group = new b.T.Group(); group.name = name; b.root.add(group);
    const leaves = positions.map((p, i) => {
      const pivot = new b.T.Group(); pivot.position.set(p.x, p.y, p.z); group.add(pivot);
      C.boxMesh(b, pivot, material || 'copper', 0, 0, p.d / 2, p.w, .065, p.d, name + '-leaf-' + i);
      for (const x of [-p.w / 2, p.w / 2]) C.boxMesh(b, pivot, 'bronze', x, .01, p.d / 2, .045, .09, p.d);
      C.boxMesh(b, pivot, 'steel', 0, -.055, 0, p.w + .08, .1, .11, 'exposed-hinge-rail');
      return pivot;
    });
    C.motion(b, name, group, v => leaves.forEach((leaf, i) => apply(leaf, v, i)), 'content-articulation');
    return group;
  }

  builders[7] = function ({ b, options }) {
    const w = 20, d = 20;
    b.deck(w, d, 'wood');
    // Two album leaves flank the binding-like public passage. Four structural
    // frames give the four observed workbench phases a spatial rhythm.
    sideColumns(b, [-8.8, -2.8, 2.8, 8.8], [-8.1, -2.7, 2.7, 8.1], 6.05, 'walnut');
    for (const z of [-8.1, -2.7, 2.7, 8.1]) {
      b.box('walnut', 0, 6.12, z, 18.2, .28, .26);
      for (const s of [-1, 1]) {
        b.beam('walnut', [s * 2.8, 5.15, z], [s * 3.65, 6.05, z], .14, .16, true);
        b.beam('walnut', [s * 8.8, 5.1, z], [s * 7.95, 6.05, z], .14, .16, true);
      }
    }
    b.gable(-5.85, 0, 8.05, 20.65, 6.32, 1.75, 'tile', { timber: 'walnut' });
    b.gable(5.85, 0, 8.05, 20.65, 6.32, 1.75, 'tile', { timber: 'walnut' });
    b.barrel(0, 0, 4.0, 20.15, 6.4, 1.15, 'glassDark');
    // A continuous bronze ridge works like an album's sewn binding.
    b.box('bronze', 0, 7.65, 0, .12, .1, 20.2, null, true);
    for (const s of [-1, 1]) {
      sideWall(b, s * 9, 0, 17.3, 4.9, 'paper');
      // Three stepped leaves have real bindings, visible page edges and
      // recessed brocade fields. This is the album's constructed front cover.
      for (let leaf = 0; leaf < 3; leaf++) {
        const x = s * (4.05 + leaf * 1.92), z = -8.93 + leaf * .16, h = 3.3 + leaf * .24;
        solid(b, 'walnut', x, .18, z, 1.83, .36, .46, 'album-cover-foot');
        solid(b, 'paper', x, h / 2 + .18, z, 1.76, h, .18, 'layered-album-cover-leaf');
        for (const side of [-1, 1]) {
          solid(b, 'walnut', x + side * .89, h / 2 + .18, z - .025, .08, h + .14, .25, 'album-binding-stile', null, true);
          b.box('bronze', x + side * .845, h / 2 + .18, z - .164, .025, h, .045, null, true);
        }
        for (const y of [.25, h + .18]) b.box('walnut', x, y, z - .03, 1.85, .075, .24, null, true);
        solid(b, 'walnut', x, 1.98, z - .135, 1.26, 1.94, .1, 'recessed-brocade-frame', null, true);
        b.box('paper', x, 1.98, z - .19, 1.1, 1.78, .025, null, true);
        for (let row = -2; row <= 2; row++) for (let col = -1; col <= 1; col++) {
          const xx = x + col * .31, yy = 1.98 + row * .3, zz = z - .21, r = .13;
          const q = [[xx, yy + r, zz], [xx + r, yy, zz], [xx, yy - r, zz], [xx - r, yy, zz], [xx, yy + r, zz]];
          for (let edge = 1; edge < q.length; edge++) b.beam('bronze', q[edge - 1], q[edge], .013, .013, true);
        }
        for (const y of [.56, .69]) b.box('bronze', x, y, z - .113, 1.6, .023, .035, null, true);
      }
      solid(b, 'chalk', s * 6, 1.9, 8.8, 5.8, 3.8, .22, 'archive-rear-wall');
      for (const z of [-5.6, -1.9, 1.9, 5.6]) {
        b.table(s * 5.35, z, 3.6, 1.24, 1.0, 'oak');
        b.paper(s * 5.35, 1.092, z, 2.55, .84, true);
        // Genuine folded paper surfaces and a binding, not a task-name billboard.
        b.box('paper', s * 5.35 - .53, 1.15, z, 1.05, .025, .9, [0, 0, -.07], true);
        b.box('paper', s * 5.35 + .53, 1.15, z, 1.05, .025, .9, [0, 0, .07], true);
        b.box('bronze', s * 5.35, 1.19, z, .025, .018, .92, null, true);
        b.lantern(s * 5.35, 4.65, z, .72);
      }
      // Both assessment galleries return to the same rear archive range.
      b.cabinet(s * 5.8, 8.03, 4.5, 1.75, 7);
      b.bench(s * 7.1, -.1, 3.2, true);
      returnedPath(b, s, 7.95, -7.3, 7.0, 'bronze');
      // Recessed brocade fields, modelled as shallow diamond joinery.
      for (const cz of [-5.5, 0, 5.5]) {
        b.box('walnut', s * 8.86, 3.0, cz, .055, 2.3, 2.45, null, true);
        b.box('paper', s * 8.81, 3.0, cz, .038, 2.1, 2.25, null, true);
        for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
          const x = s * 8.78, y = 3 + j * .55, z = cz + k * .55, r = .24;
          const points = [[x, y + r, z], [x, y, z + r], [x, y - r, z], [x, y, z - r], [x, y + r, z]];
          for (let q = 1; q < points.length; q++) b.beam('bronze', points[q - 1], points[q], .014, .014, true);
        }
      }
    }
    // A restrained page-turn sequence stays high in the appraisal galleries.
    const pages = new b.T.Group(); pages.name = 'four-phase-appraisal-pages'; b.root.add(pages);
    const phaseLeaves = [];
    [-5.6, -1.9, 1.9, 5.6].forEach((z, phase) => {
      for (const s of [-1, 1]) {
        const hinge = new b.T.Group(); hinge.position.set(s < 0 ? -6.6 : 3.9, 3.65, z + .78); pages.add(hinge);
        C.boxMesh(b, hinge, 'paper', 1.25, .43, 0, 2.5, .86, .065, 'elevated-album-page');
        C.boxMesh(b, hinge, 'walnut', 0, .43, 0, .065, 1.0, .095, 'album-page-spine');
        C.boxMesh(b, hinge, 'bronze', 1.25, .0, -.04, 2.5, .035, .035);
        phaseLeaves.push({ hinge, phase, s });
      }
    });
    C.motion(b, 'four-phase-page-comparison', pages, v => {
      phaseLeaves.forEach(({ hinge, phase, s }) => {
        const response = Math.sin(Math.PI * Math.max(0, Math.min(1, v * 1.6 - phase * .18)));
        hinge.rotation.y = s * (.045 + response * .28);
      });
    }, 'album-page-comparison');
    entryFrame(b, -9.8, 5.05, 5.92, -8.1, 'walnut');
    return C.finish(b, options, w, d, {
      signY: 5.05, role: 'Paired patent and trademark appraisal archive',
      description: 'Four-frame album hall with paired patent and trademark appraisal galleries, folded worktables and a shared returning archive range',
      concept: 'The four observed patent phases become four successive frames. Patent and trademark galleries share one rear archive range; a narrow binding roof and recessed diamond relief translate the real album and brocade interface.',
      evidence: ['https://patent.maniforld.com/', 'https://patent.maniforld.com/patents', 'https://patent.maniforld.com/trademarks', 'https://patent.maniforld.com/projects'],
      observations: ['The actual patent workbench has four visible phases: keyword input, classification, search and assessment report.', 'Patent, trademark and combined assessments return to continuous project files.', 'Album frames, ivory paper, dark lacquer-like timber and fine brocade diamonds follow the observed interface.', 'Trademark search scope is limited; the architecture makes no claim of legal reliability or verified image-AI capability.'],
      phaseLabels: ['入册', '比照', '归档'],
      mechanism: 'Eight small overhead album leaves compare the four phases in sequence. The open axial binding passage and both return paths stay unchanged.'
    });
  };

  builders[10] = function ({ b, options }) {
    const w = 20, d = 18.8;
    b.deck(w, d);
    // A continuous entrance/monitoring spine, with exactly two equal model bays.
    sideColumns(b, [-8.8, -2.65, 2.65, 8.8], [-7.6, 0, 7.6], 5.55, 'steel');
    for (const z of [-7.6, 0, 7.6]) {
      b.box('steel', 0, 5.62, z, 18.1, .24, .26);
      for (const s of [-1, 1]) b.beam('steel', [s * 8.8, 4.4, z], [s * 7.65, 5.56, z], .115, .12, true);
    }
    b.barrel(0, 0, 5.4, 19.8, 5.83, 2.45, 'glass');
    for (const s of [-1, 1]) {
      // Equal outward-draining sheds reveal the technical modules; the
      // taller glazed protocol vault remains one continuous central spine.
      b.lean(s * 6.05, .1, 7.1, 19.15, s < 0 ? 5.78 : 7.23, s < 0 ? 1.45 : -1.45, 'copper');
      for (const z of [-7.6, 0, 7.6]) b.box('steel', s * 2.65, 6.4, z, .18, 1.68, .2);
      b.box('steel', s * 2.65, 7.18, .1, .21, .2, 18.6);
      sideWall(b, s * 9.05, .1, 15.6, 4.55, 'glass');
      for (const z of [-8.0, 8.0]) {
        solid(b, 'limestone', s * 6.05, .27, z, 5.55, .54, .25, 'model-bay-low-sill');
        solid(b, 'glass', s * 6.05, 2.22, z, 5.55, 3.3, .055, 'transparent-model-bay-front');
        for (const dx of [-2.77, -1.38, 0, 1.38, 2.77]) solid(b, 'steel', s * 6.05 + dx, 2.2, z, .065, 3.45, .13, 'model-bay-front-mullion', null, true);
        for (const y of [.57, 3.88]) b.box('steel', s * 6.05, y, z, 5.68, .07, .13, null, true);
        b.box('ceramic', s * 6.05, .62, z - .084, 5.45, .035, .035, null, true);
      }
      b.table(s * 6.0, -3.2, 3.8, 1.45, 1.05, 'limestone');
      b.monitor(s * 6.0, -3.0, 1.9);
      b.cabinet(s * 7.6, 3.6, 1.7, 1.25, 4);
      b.bench(s * 6.0, 5.9, 3.45, false, true);
      // Two physically traceable endpoint conduits connect each module to the
      // shared protocol rail. Neutral oxidised copper never asserts live health.
      for (const dz of [-.23, .23]) {
        const points = [[s * 2.7, 5.07, -5.6 + dz], [s * 5.95, 5.07, -5.6 + dz], [s * 5.95, 5.07, 4.45 + dz], [s * 2.7, 5.07, 4.45 + dz]];
        for (let k = 1; k < points.length; k++) b.beam('ceramic', points[k - 1], points[k], .075, .075, true);
        for (const z of [-5.6 + dz, 4.45 + dz]) {
          b.box('bronze', s * 5.95, 5.06, z, .26, .18, .2, null, true);
          beamJoint(b, s * 5.95, 5.08, z - .13, .22, .22);
        }
      }
      for (const z of [-5.6, 0, 4.45]) b.beam('steel', [s * 5.95, 5.08, z], [s * 5.95, 7.05, z], .045, .045, true);
      returnedPath(b, s, 3.55, -6.7, 6.8, 'ceramic');
      // A comparison bench, with blank metrics strips: no invented throughput.
      b.table(s * 5.9, .55, 3.5, 1.45, .99, 'oak');
      for (const off of [-.6, .6]) {
        b.box('steel', s * 5.9 + off, 1.09, .55, .75, .045, .7, null, true);
        b.box('linen', s * 5.9 + off, 1.12, .55, .62, .018, .55, null, true);
        b.box('joint', s * 5.9 + off, 1.133, .55, .2, .013, .035, null, true);
      }
      b.lantern(s * 5.9, 4.35, 6.4, .7);
    }
    for (const x of [-2.45, 2.45]) b.box('steel', x, 5.33, 0, .1, .17, 18.4);
    // Shared rails branch into both observed bays; adjustable louvres expose
    // their routing relationship without suggesting successful real requests.
    smallRoofLeaves(b, 'two-model-route-louvres', [
      { x: -6.0, y: 6.7, z: -.9, w: 2.8, d: 1.8 },
      { x: 6.0, y: 6.7, z: -.9, w: 2.8, d: 1.8 }
    ], 'glassDark', (leaf, v, i) => { leaf.rotation.x = -.08 - .3 * v; leaf.rotation.z = (i ? 1 : -1) * .035 * v; });
    entryFrame(b, -9.2, 4.8, 5.55, -7.6, 'steel');
    return C.finish(b, options, w, d, {
      signY: 4.8, role: 'Unified API gateway with two observed model bays',
      description: 'Glazed shared protocol spine with two equal copper-roofed model bays, paired endpoint conduits and a recombining monitoring end',
      concept: 'One clear spine branches into exactly two modular rooms and rejoins at the rear. Paired overhead conduits express compatible endpoint routes; comparison surfaces remain neutral because public metrics were missing.',
      evidence: ['https://api.maniforld.com/', 'https://api.maniforld.com/pricing'],
      observations: ['The live public catalog showed exactly glm_for_coding and stealth/ox-alpha.', 'Both observed model cards exposed anthropic and openai endpoints.', 'Configure, connect and monitor are the observed operating sequence.', 'Public performance metrics were dashes; no real request, console data or healthy throughput was verified.'],
      phaseLabels: ['配置', '连接', '观察'],
      mechanism: 'Two overhead routing louvres articulate the paired bays together. They are neutral comparison devices, not live operational indicators.'
    });
  };

  builders[12] = function ({ b, options }) {
    const w = 20, d = 18.6;
    b.deck(w, d);
    // Home and family are deliberately low domestic rooms, each with its own
    // roof, floor, entrance and furniture, separated by an open screened court.
    for (const s of [-1, 1]) {
      sideColumns(b, [s * 3.1, s * 8.9], [-7.25, -2.4, 2.4, 7.25], 4.65, 'oak');
      for (const z of [-7.25, -2.4, 2.4, 7.25]) b.box('oak', s * 6, 4.74, z, 6.18, .23, .23);
      b.gable(s * 6, 0, 7.3, 17.8, 4.97, 2.25, 'tile', { timber: 'oak' });
      sideWall(b, s * 9.0, 0, 14.8, 3.8, 'chalk');
      // An offset domestic vestibule protects the room without presenting
      // a blank institutional wall. Outer slats and a setback inner screen
      // prevent a straight view from the porch into the seating area.
      solid(b, 'limestone', s * 7.05, .29, -7.48, 3.74, .58, .31, 'domestic-front-screen-sill');
      for (let q = 0; q <= 20; q++) {
        solid(b, 'oak', s * (5.22 + q * .18), 1.93, -7.48, .075, 2.62, .22, 'domestic-front-privacy-slat', [0, s * .16, 0], true);
      }
      for (const y of [.64, 3.28]) b.box('oak', s * 7.05, y, -7.48, 3.84, .11, .29, null, true);
      solid(b, 'paper', s * 4.12, 1.55, -6.6, 1.86, 3.1, .16, 'setback-domestic-entry-screen');
      for (const xx of [3.15, 5.09]) solid(b, 'cedar', s * xx, 1.55, -6.6, .085, 3.22, .2, 'entry-screen-binding', null, true);
      b.box('clay', s * 4.12, .7, -6.704, 1.65, .055, .035, null, true);
      solid(b, 'chalk', s * 6.0, 1.6, 7.48, 5.7, 3.2, .24, 'domestic-rear-wall');
      // The domestic route reaches each room through a generous side opening
      // at the ends, never by looking directly through an exposed video wall.
      slatWall(b, s * 3.05, 0, 5.7, 2.62, .25, 'oak');
      slatWall(b, s * 3.65, .12, 5.7, 2.85, .25, 'cedar');
      // Offset solid backing preserves visual privacy behind the event slot.
      solid(b, 'paper', s * 4.13, 2.05, .1, .13, 3.42, 2.15, 'offset-privacy-backing');
      b.bench(s * 6.6, -.9, 3.7, true, true);
      b.table(s * 6.2, 3.65, 2.7, 1.4, .74, 'oak');
      b.plant(s * 7.7, -6.6, 1.05);
      b.lantern(s * 5.5, 3.82, 3.65, .8);
      b.lantern(s * 5.5, 3.82, -4.9, .7);
      C.pathLine(b, [[0, -5.55], [s * 8.1, -5.55], [s * 8.1, 5.55], [0, 5.55]], 'clay', .035);
    }
    // Modest connective pergolas shade the short, level route. Their supports
    // stay at the edges of the public aisle, leaving a full 4.7 m opening.
    for (const z of [-5.55, 5.55]) {
      b.box('oak', 0, 4.82, z, 7.0, .23, .25);
      for (const dz of [-.72, -.36, 0, .36, .72]) b.box('cedar', 0, 4.99, z + dz, 6.6, .13, .12, null, true);
      b.box('copper', 0, 5.14, z, 6.65, .1, 1.68);
      for (const s of [-1, 1]) b.beam('oak', [s * 3.1, 3.95, z], [s * 2.35, 4.8, z], .12, .14, true);
    }
    // A physical anonymous-pose abstraction: discrete rods behind a screen,
    // not a live image, person, medical record or continuously open camera.
    for (const s of [-1, 1]) {
      b.box('walnut', s * 3.1, 3.42, 0, .18, .93, 1.95, null, true);
      b.box('paper', s * 2.98, 3.42, 0, .055, .74, 1.7, null, true);
      for (const z of [-.55, 0, .55]) {
        b.box('bronze', s * 2.94, 3.41, z, .025, .48, .035, null, true);
        b.box('bronze', s * 2.94, 3.44, z, .025, .032, .2, null, true);
      }
    }
    // A small shuttered clerestory opens only around the middle state, then
    // closes again. The offset backing and double screen are never removed.
    const shutters = new b.T.Group(); shutters.name = 'time-limited-event-windows'; b.root.add(shutters);
    const panels = [];
    for (const s of [-1, 1]) {
      const panel = new b.T.Group(); panel.position.set(s * 2.85, 3.43, 0); shutters.add(panel);
      C.boxMesh(b, panel, 'oak', 0, 0, 0, .08, .85, 1.84, 'high-event-window-shutter');
      C.boxMesh(b, panel, 'clay', -s * .053, -.24, 0, .018, .075, .55, 'discrete-event-accent');
      panels.push({ panel, s });
    }
    C.motion(b, 'limited-event-window', shutters, v => {
      panels.forEach(({ panel, s }) => { panel.position.z = Math.sin(v * Math.PI) * .7; panel.rotation.y = s * Math.sin(v * Math.PI) * .07; });
    }, 'time-limited-privacy-shutter');
    entryFrame(b, -9.1, 4.03, 4.77, -7.25, 'oak');
    return C.finish(b, options, w, d, {
      signY: 4.03, role: 'Reme home-to-family privacy-aware care court',
      description: 'Two domestic timber-and-stone rooms across a short level care court, with layered slatted privacy screens and small time-limited event windows',
      concept: 'Home collection and family attention occupy separate low houses. Anonymous pose and selected events pass through layered screens; a small event shutter returns closed instead of creating a continuous transparent connection.',
      evidence: ['https://reme.maniforld.com/', 'https://reme.maniforld.com/home', 'https://reme.maniforld.com/family'],
      observations: ['The home interface describes local video converted into poses and events, with anonymous skeleton presentation by default.', 'Reliable events can trigger inquiry and family synchronization; event-selected media is distinct from continuous upload.', 'Original imagery is time-limited. The public demo warns that authorized imagery can reach all online viewers without account authentication.', 'Camera and microphone were not enabled; no individual media, care event or health information informed this design.'],
      phaseLabels: ['匿名状态', '限时事件', '回到匿名'],
      mechanism: 'Two small high shutters briefly displace in the middle state and return closed at the final state. Double slats and solid offset backing persist in every state; the design does not claim private authenticated family access.'
    });
  };

  builders[24] = function ({ b, options }) {
    const w = 21, d = 20.4;
    b.deck(w, d);
    // Unequal contemplative walks grow from the public timed-practice cards:
    // a longer shaded garden loop on the left and a shorter pause on the right.
    sideColumns(b, [-9.25, -2.9], [-8.3, -4.15, 0, 4.15, 8.3], 5.2, 'oak');
    for (const z of [-8.3, -4.15, 0, 4.15, 8.3]) b.box('oak', -6.075, 5.29, z, 6.65, .23, .24);
    b.gable(-6.075, 0, 7.9, 20.65, 5.55, 2.05, 'tile', { timber: 'oak' });
    sideColumns(b, [2.9, 6.9, 9.55], [-8.3, -2.8, 2.8, 8.3], 5.2, 'oak');
    for (const z of [-8.3, -2.8, 2.8, 8.3]) b.box('oak', 6.2, 5.29, z, 6.95, .23, .24);
    b.gable(5.0, 0, 5.05, 20.45, 5.55, 1.7, 'copper', { timber: 'oak' });
    b.lean(8.68, 0, 2.35, 20.45, 5.9, 1.12, 'tile');
    // Open sky remains along the central route. Front and rear bridges support
    // the entrance lanterns and physically join the court ranges.
    for (const z of [-8.5, 8.5]) {
      b.box('oak', 0, 5.4, z, 7.4, .26, .24);
      for (const dz of [-.63, 0, .63]) b.box('cedar', 0, 5.59, z + dz, 7.2, .12, .14, null, true);
      b.box('glassDark', 0, 5.75, z, 7.35, .09, 1.75);
    }
    sideWall(b, -9.43, 0, 16.55, 3.95, 'paper');
    sideWall(b, 9.74, 0, 16.55, 3.7, 'chalk');
    bed(b, -5.95, -.1, 2.8, 8.3, [[0, -3.0], [-.25, -1.2], [.2, .7], [0, 2.9]]);
    bed(b, 4.8, .6, 1.0, 3.7, [[0, -.9], [0, .9]]);
    b.bench(-6.0, -5.1, 3.0, false, true);
    b.bench(5.0, 4.2, 2.6, false, true);
    C.pathLine(b, [[-3.65, -6.45], [-8.2, -6.45], [-8.2, 5.55], [-3.65, 5.55], [-3.65, -6.45]], 'ceramic', .04);
    C.pathLine(b, [[3.7, -2.65], [5.9, -2.65], [5.9, 3.25], [3.7, 3.25], [3.7, -2.65]], 'ceramic', .04);
    // Screened diary/conversation niches have their own real furniture and
    // acoustic cheek walls, rather than clinical content printed on panels.
    for (const [x, z] of [[-5.7, 7.8], [4.8, -6.0]]) {
      b.table(x, z, 2.1, 1.14, .75, 'oak');
      b.bench(x, z - 1.25, 2.15, false, true);
      solid(b, 'linen', x + 1.3, 1.4, z, .16, 2.8, 2.65, 'quiet-niche-side-screen');
      solid(b, 'paper', x, 1.4, z + .85, 2.6, 2.8, .15, 'quiet-niche-back-screen');
      b.paper(x, .84, z, .72, .46, false);
      b.lantern(x, 4.12, z, .7);
    }
    // The observed user/doctor role boundary becomes a separate outer passage.
    // No monitoring desk looks through the quiet rooms or across the public route.
    sideWall(b, 7.28, .1, 14.45, 3.75, 'chalk');
    C.pathLine(b, [[8.75, -9.5], [8.75, 9.5]], 'bronze', .035);
    // The role threshold is an open doorway, not a gate across the route.
    // Inner jamb faces at x=8.25 and x=9.25 give exactly 1.00 m clearance,
    // aligned with the continuous x=8.75 side passage. The lintel underside is 3.05 m, above the avatar jump-head envelope.
    solid(b, 'cedar', 7.925, 1.4, -7.42, .5, 2.8, .16, 'clinician-role-side-screen');
    solid(b, 'cedar', 9.455, 1.4, -7.42, .21, 2.8, .16, 'clinician-role-side-screen');
    for (const x of [8.2, 9.3]) solid(b, 'oak', x, 1.675, -7.42, .1, 3.35, .22, 'clinician-role-door-jamb');
    b.box('oak', 8.75, 3.2, -7.42, 1.2, .3, .25);
    b.box('bronze', 8.18, 1.45, -7.55, .06, .42, .035, null, true);
    b.box('glassDark', 8.6, 3.7, -7.42, 1.95, .7, .07, null, true);
    b.bench(7.85, 5.0, 2.2, true);
    for (const z of [-5.0, 1.2, 6.4]) b.lantern(8.55, 4.2, z, .48);
    for (const z of [-5.8, 0, 5.8]) b.lantern(-3.15, 4.18, z, .57);
    // Shading changes at the pace selected by the visitor. These are physical
    // reflective leaves over the quiet walk, with no diagnostic or cure signal.
    smallRoofLeaves(b, 'contemplative-light-baffles', [
      { x: -5.95, y: 5.3, z: -4.6, w: 2.9, d: 1.45 },
      { x: -5.95, y: 5.3, z: -.75, w: 2.9, d: 1.45 },
      { x: -5.95, y: 5.3, z: 3.15, w: 2.9, d: 1.45 }
    ], 'linen', (leaf, v, i) => { leaf.rotation.x = -.08 - Math.sin(Math.PI * v) * (.12 + i * .025); });
    entryFrame(b, -10.0, 4.55, 5.4, -8.5, 'oak');
    return C.finish(b, options, w, d, {
      signY: 4.55, role: 'MindCare daily reflection garden with separate role boundary',
      description: 'Unequal shaded contemplative loops, screened diary niches and diffuse-light roofs, with a discreet separately bounded clinician-side path',
      concept: 'The public timed breathing and relaxation cards become different-length quiet walks. Diary and conversation occupy protected niches; the observed user/doctor choice becomes a separate screened side threshold.',
      evidence: ['https://k.playe.top/', 'https://k.playe.top/#/', 'https://k.playe.top/#/login'],
      observations: ['Public app home offers assessment, mood recording, relaxation, games and timed 3-, 8-, 10- and 15-minute practices.', 'User and doctor roles are distinct at login.', 'Deeper practice and clinician functions were not inspected beyond the authentication boundary.', 'Marketing screening, medical accuracy and therapeutic efficacy claims are not verified or endorsed by this architecture.'],
      phaseLabels: ['驻足', '调息', '静观'],
      mechanism: 'Three overhead light baffles make a small reversible breathing-like movement above the contemplative walk. Role boundaries and all ground routes remain fixed; no clinical outcome is implied.'
    });
  };
})(window);
