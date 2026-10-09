/* Content-grounded literary and making spaces: source readings, not reconstructions.
 * All five plans retain a straight 3.6 m axial passage. Repetition is instanced;
 * each interpretation has one restrained, reversible mechanism and no scaling.
 */
(function (global) {
  'use strict';
  const C = global.CourtyardContent;
  const B = global.CourtyardContentBuilders = global.CourtyardContentBuilders || {};
  const sources = {
    19: ['/?read=19'],
    20: ['/?read=20', '/?read=20', '/?read=20'],
    21: ['https://qingyang-before-proof.maniforld.com/#draft', 'https://qingyang-before-proof.maniforld.com/#red-pencil', 'https://qingyang-before-proof.maniforld.com/#final-proof'],
    22: ['https://rubbing.maniforld.com/cases/shichen-multiwitness/#workflow', 'https://rubbing.maniforld.com/cases/shichen-multiwitness/', 'https://rubbing.maniforld.com/cases/shichen-multiwitness/report/#knowledge-network', 'https://rubbing.maniforld.com/#report'],
    25: ['https://github.com/Lx050?tab=repositories', 'https://github.com/Lx050/mo-hun', 'https://github.com/Lx050/mosheng-ios-public#readme-ov-file', 'https://github.com/Lx050?page=2&tab=repositories']
  };
  function finish(b, options, w, d, meta) {
    meta.evidence = sources[options.index];
    const result = C.finish(b, options, w, d, meta);
    Object.assign(result.metadata, {
      evidenceURLs: sources[options.index],
      interpretationBoundary: meta.boundary || 'Architectural interpretation of reviewed public text; not a reconstruction of an actual room or private conversations.',
      spatialSequence: meta.sequence,
      visitorRoutes: b.root.userData.contentVisitorRoutes || [],
      visitorRouteBodyRadius: .38,
      phaseStates: [0, .5, 1],
      phaseMeaning: {0: meta.phaseLabels[0], .5: meta.phaseLabels[1], 1: meta.phaseLabels[2]},
      movingGeometryPolicy: 'Rigid translation or rotation only; no scale animation; all phases retain the axial body clearance.'
    });
    return result;
  }
  function visitorPath(b, name, points, material, width) {
    // These are walkable routes, checked against every body-height obstacle at radius .38 m.
    const routes = b.root.userData.contentVisitorRoutes = b.root.userData.contentVisitorRoutes || [];
    routes.push({name, points: points.map(point => point.slice()), bodyRadius: .38});
    C.pathLine(b, points, material, width);
  }
  function slopedCanopy(b, x, z, w, d, low, rise, mat) {
    b.lean(x, z, w, d, low, rise, mat || 'copper');
    for (const zz of [-d / 2 + .15, d / 2 - .15]) {
      b.beam('cedar', [x - w / 2, low - .21, z + zz], [x + w / 2, low + rise - .21, z + zz], .16, .21);
    }
  }
  function frame(b, z, left, right, h, mat, post) {
    b.column(left, z, h, mat || 'cedar', post || .23);
    b.column(right, z, h, mat || 'cedar', post || .23);
    b.box(mat || 'cedar', (left + right) / 2, h, z, right - left + .28, .25, .23);
    for (const x of [left, right]) {
      const inward = x === left ? .67 : -.67;
      b.beam('bronze', [x, h - .73, z], [x + inward, h - .09, z], .07, .09, true);
    }
  }
  function panel(b, x, z, w, h, material, yaw) {
    // A solid framed surface; leaf-like details do not replace its body collider.
    b.box(material || 'paper', x, h / 2 + .2, z, w, h, .11, [0, yaw || 0, 0], false, true, 'source-reading-plane');
    const cs = Math.cos(yaw || 0), sn = Math.sin(yaw || 0);
    for (const side of [-1, 1]) b.box('cedar', x + side * cs * w / 2, h / 2 + .2, z - side * sn * w / 2, .07, h + .1, .08, [0, yaw || 0, 0], true, true, 'panel-edge');
    for (const y of [.17, h + .23]) b.box('bronze', x, y, z, w + .1, .055, .15, [0, yaw || 0, 0], true);
  }
  function workLight(b, x, z, length, y) {
    y = y || 3.3;
    b.box('steel', x, y + .065, z, .13, .13, length, null, true);
    b.box('lamp', x, y - .017, z, .075, .025, length - .12, null, true);
  }
  function labelledGroup(b, name, x, y, z) {
    const group = new b.T.Group(); group.name = name; group.position.set(x, y, z); b.root.add(group); return group;
  }
  function roofJoist(b, x, z, d, h) {
    b.box('cedar', x, h, z, .18, .3, d);
    for (const zz of [-d / 2, d / 2]) b.box('bronze', x, h - .02, z + zz, .24, .36, .065, null, true);
  }

  B[19] = function ({b, options}) {
    const w = 20, d = 19.6;
    b.deck(w, d, 'wood');
    // The service spine, rather than an imposing central room, carries the building.
    const bays = [
      {z: -7.1, d: 4.0, x: -5.65, w: 6.65, h: 6.72},
      {z: -2.35, d: 4.6, x: -5.3, w: 7.35, h: 6.95},
      {z: 3.35, d: 6.2, x: -5.65, w: 6.65, h: 6.85}
    ];
    for (const bay of bays) {
      for (const z of [bay.z - bay.d / 2 + .28, bay.z + bay.d / 2 - .28]) {
        frame(b, z, -8.65, -2.35, bay.h, 'cedar', .25);
        // Load transfer visibly crosses between receiving rooms and the public route.
        b.box('cedar', -.05, bay.h - .2, z, 5.0, .21, .22);
      }
      slopedCanopy(b, bay.x, bay.z, bay.w, bay.d, bay.h + .12, .6, 'tile');
      b.screenSide(-8.67, bay.z, bay.d - .7, 3.15, 'paper');
    }
    for (const z of [-8.7, -3.5, 2.1, 8.65]) frame(b, z, -2.35, 8.6, 6.72, 'cedar', .25);
    slopedCanopy(b, 3.25, -.05, 12.4, 19.1, 6.94, .63, 'copper');
    roofJoist(b, -2.35, -.05, 19.15, 6.81);
    roofJoist(b, 3.15, -.05, 19.15, 7.09);
    // A continuous bench / information-service spine is outside the walking aisle.
    b.box('cedar', -3.04, 1.03, -.05, .9, .14, 17.35, null, false, true, 'continuous-handover-worktop');
    for (const z of [-8.1, -5.5, -2.6, .4, 3.4, 6.6, 8.1]) b.box('steel', -3.04, .49, z, .14, .98, .14, null, true, true, 'service-spine-leg');
    b.box('copper', -3.04, 3.7, -.1, .28, .19, 17.6);
    b.box('bronze', -3.04, 3.6, -.1, .095, .08, 17.7, null, true);
    for (const z of [-7.1, -2.35, 3.35]) {
      b.table(-6.5, z, 3.55, 1.65, 1.02, 'oak');
      b.paper(-6.5, 1.11, z, 2.65, 1.05, false);
      b.beam('copper', [-3.04, 3.72, z], [-6.25, 3.72, z], .11, .16);
      workLight(b, -6.4, z, 1.8, 3.62);
      b.box('paper', -8.53, 2.32, z, .065, 1.35, 1.55, null, true);
    }
    // Shared output bay and a deliberately empty successor's place.
    b.table(5.45, .6, 4.25, 4.2, 1.03, 'oak');
    b.paper(5.25, 1.12, .25, 2.9, 2.4, false);
    b.bench(5.45, -2.45, 3.8, false, false);
    b.screenSide(8.6, .55, 8.7, 2.65, 'glass');
    b.table(5.25, 6.9, 3.8, 1.55, 1.03, 'oak');
    workLight(b, 5.25, 6.9, 1.45, 3.62);
    b.box('copper', 4.2, 6.54, 6.8, 7.8, .13, .18);
    b.beam('cedar', [-2.35, 6.6, 6.8], [8.6, 6.6, 6.8], .19, .24);
    // The 1.235 m strip between receiving tables and service spine is genuinely traversable.
    visitorPath(b, 'receiving-bays-to-handover-spine', [[-6.3, -9.35], [-4.1, -8.6], [-4.1, 8.9]], 'bronze', .034);
    visitorPath(b, 'shared-court-to-successor-place', [[2.65, -9.35], [2.65, 8.25], [4.0, 9.2]], 'ceramic', .045);
    // One small carrier transfers task light along a permanently visible dependency rail.
    const carrier = labelledGroup(b, 'handover-light-carriage', -3.04, 3.48, -7.7);
    C.boxMesh(b, carrier, 'copper', 0, .08, 0, .4, .16, .58, 'service-rail-carriage');
    C.boxMesh(b, carrier, 'lamp', 0, -.035, 0, .28, .045, .43, 'task-light-handoff');
    const glow = b.M.lamp.clone(); glow.emissiveIntensity = .5;
    const relay = C.boxMesh(b, carrier, glow, 0, -.065, 0, .17, .02, .31, 'handoff-position');
    C.motion(b, 'handover-along-the-common-service-spine', carrier, v => {
      carrier.position.z = -7.7 + 15.4 * v;
      relay.material.emissiveIntensity = .42 + .22 * Math.sin(Math.PI * v);
    }, 'service-light-transfer');
    return finish(b, options, w, d, {
      role: 'Handover workshop',
      description: 'Unequal receiving bays stitched by an exposed continuous service spine, shared work court and empty successor station',
      concept: 'Supporting work becomes the connecting architecture, and departure leaves a usable route for the next person',
      sequence: ['Offset receiving bays', 'Continuous coordination spine', 'Shared working court', 'Empty successor station and open exit'],
      observations: [
        'The source describes translating brief requests into assignments, materials, approvals and release, making coordination central rather than a byline.',
        'Failures become reusable procedures, including backward scheduling, material naming, preview review and small real tasks for newcomers.',
        'Affection and exhaustion coexist; organizational memory should remain usable after people leave, with tools freeing time for judgment.'
      ],
      phaseLabels: ['接住来件', '共同推进', '把路留给后来者'],
      mechanism: 'A small rigid task-light carriage travels on the continuous overhead service rail; the receiving bays, common court and successor station remain visible in every phase.',
      signY: 4.5
    });
  };

  B[20] = function ({b, options}) {
    const w = 19.6, d = 19.2;
    b.deck(w, d);
    const zs = [-8.35, -6.2, -3.35, -.8, 1.55, 4.0, 7.45];
    const shifts = [-.72, .5, -.4, .36, -.18, 0, 0];
    const heights = [6.7, 7.25, 7.8, 8.2, 7.65, 7.1, 7.1];
    // Seven unequal frames are actual roof-bearing language strata, not name plaques.
    zs.forEach((z, n) => {
      const x = shifts[n], h = heights[n];
      frame(b, z, x - 7.55, x + 7.55, h, n < 4 ? 'steel' : 'cedar', .2);
      b.box('chalk', x, h + .19, z, 16.05, .16, n < 4 ? .83 : 1.25);
      b.box('copper', x, h + .3, z, 16.3, .095, n < 4 ? 1.0 : 1.45);
      // Fine inner and outer reveals give each frame depth and parallax.
      b.box('bronze', x, h - .16, z - .18, 14.95, .045, .045, null, true);
      for (const side of [-1, 1]) {
        b.box('linen', x + side * 7.55, 3.12, z, .3, 5.7, .11, null, false, true, 'temporal-frame-cheek');
        b.box('bronze', x + side * 7.38, 3.25, z - .11, .035, 5.2, .04, null, true);
      }
    });
    // The two service / walking traces turn into parallel routes, never a union axis.
    const left = [[-5.6, -9.05], [-4.25, -5.0], [-3.2, -.9], [-3.2, 8.8]];
    const right = [[5.8, -9.05], [4.3, -4.55], [3.2, -.9], [3.2, 8.8]];
    visitorPath(b, 'first-register-to-parallel-work', left, 'ceramic', .11);
    visitorPath(b, 'second-register-to-parallel-work', right, 'bronze', .065);
    for (const points of [left, right]) for (let n = 1; n < points.length; n++) {
      b.beam('cedar', [points[n - 1][0], 6.53, points[n - 1][1]], [points[n][0], 6.53, points[n][1]], .18, .22);
    }
    // Open interstices in front resolve into dependable shared office shelter.
    slopedCanopy(b, -4.65, 4.1, 8.3, 10.1, 7.18, .52, 'tile');
    slopedCanopy(b, 4.65, 4.1, 8.3, 10.1, 7.18, .52, 'copper');
    b.box('glass', 0, 7.48, 4.1, 1.2, .12, 10.1);
    for (const side of [-1, 1]) {
      b.table(side * 5.4, 4.15, 3.25, 3.25, 1.04, 'oak');
      b.paper(side * 5.4, 1.13, 4.1, 2.4, 1.95, false);
      b.bench(side * 5.4, 1.75, 2.7, false, false);
      workLight(b, side * 5.4, 4.1, 3.1, 3.8);
      b.screenSide(side * 7.6, 4.7, 7.3, 3.75, 'paper');
    }
    // A small accepted plane shares the rear wall with an ordinary open doorway.
    panel(b, 6.05, 8.45, 2.6, 3.25, 'chalk');
    b.box('walnut', 6.05, 2.23, 8.36, 1.84, 1.23, .08, null, true);
    b.box('paper', 6.05, 2.23, 8.304, 1.62, 1.0, .025, null, true);
    b.box('bronze', 6.58, 1.85, 8.284, .14, .04, .015, null, true);
    // The early held object stays a small suspended empty frame, not a promised ending.
    for (const xx of [-6.12, -5.32]) b.box('bronze', xx, 3.18, -6.6, .045, .8, .07, null, true);
    for (const y of [2.78, 3.58]) b.box('bronze', -5.72, y, -6.6, .84, .045, .07, null, true);
    b.beam('steel', [-5.72, 3.59, -6.6], [-5.72, 6.55, -6.6], .022, .022, true);
    const registers = labelledGroup(b, 'paired-changing-register-veils', 0, 0, 0);
    const leaves = [];
    for (const side of [-1, 1]) {
      const leaf = new b.T.Group(); leaf.position.set(side * 5.8, 4.53, -1.2); registers.add(leaf);
      C.boxMesh(b, leaf, 'glass', 0, 0, 0, 2.5, 2.25, .04, 'translucent-register');
      for (const x of [-1.28, 1.28]) C.boxMesh(b, leaf, 'bronze', x, 0, 0, .035, 2.32, .06, 'retained-separate-edge');
      leaves.push({leaf, side});
    }
    C.motion(b, 'language-registers-become-parallel', registers, v => {
      leaves.forEach(({leaf, side}) => { leaf.rotation.y = side * (.32 * (1 - v) + .02); });
    }, 'paired-parallax-reveal');
    return finish(b, options, w, d, {
      role: 'Parallel work passage',
      description: 'Seven staggered roof-bearing frames turn two separate routes into parallel shared-work bays under a calm rear shelter',
      concept: 'Changes of address become spatial strata; dependable collaboration is expressed by adjacent, still-distinct routes',
      sequence: ['Seven uneven, offset language frames', 'Two oblique routes', 'Parallel work shelter', 'A modest accepted plane beside the everyday exit'],
      observations: [
        'Forms of address change through practical help, intimacy, withdrawal, apology and professional collaboration.',
        'The source explicitly describes a later change into productive collaboration; trust in editorial judgment matters more than a simple estrangement story.',
        'An early keepsake is suspended, a late painting enters the shared office, and the ending is a practical reply rather than romantic resolution.'
      ],
      phaseLabels: ['不同的称呼', '改变说话方式', '并肩做事'],
      mechanism: 'Two elevated translucent veils rotate gently from oblique to nearly parallel registers; both paired work surfaces remain visible and the routes never fuse.',
      signY: 4.65
    });
  };

  B[21] = function ({b, options}) {
    const w = 20, d = 19.4;
    b.deck(w, d);
    // Eight structural ribs retain the whole editorial sequence, including its first offset.
    const ribs = [-8.35, -6.42, -4.48, -2.54, -.6, 1.34, 3.28, 5.22];
    ribs.forEach((z, n) => {
      const offset = n === 0 ? -.38 : 0;
      frame(b, z, -7.6 + offset, 7.6 + offset, 7.15, 'steel', .18);
      b.box('chalk', offset, 7.4, z, 16.2, .17, 1.46);
      b.box(n % 2 ? 'copper' : 'tile', offset, 7.52, z, 16.35, .08, 1.5);
      for (const side of [-1, 1]) b.box('cedar', side * 3.65, 6.87, z, .14, .2, 1.97);
    });
    // Paired clear-span work bays are identical in level and light, complementary in use.
    for (const side of [-1, 1]) {
      roofJoist(b, side * 4.8, -1.6, 14.5, 7.09);
      b.table(side * 5.1, -1.45, 3.65, 6.25, 1.04, 'oak');
      for (let n = 0; n < 4; n++) {
        const z = -3.72 + n * 1.45;
        b.paper(side * 5.1, 1.13, z, 2.75, 1.05, false);
        // Alternating thin task slips expose turn-taking, without inventing messages.
        b.box(n % 2 === (side === 1 ? 0 : 1) ? 'clay' : 'bronze', side * 6.48, 1.15, z, .045, .025, .7, null, true);
      }
      b.screenSide(side * 7.63, -1.7, 10.9, 3.9, 'paper');
      workLight(b, side * 5.1, -1.5, 6.1, 3.75);
      b.bench(side * 5.1, -5.65, 2.95, false, false);
    }
    // Cooperative cross-piece is overhead, leaving the straight body route untouched.
    b.box('cedar', 0, 4.63, -.65, 12.8, .18, .29);
    b.box('bronze', 0, 4.51, -.65, 12.45, .035, .22, null, true);
    panel(b, -5.2, -7.65, 3.8, 3.75, 'paper', .105);
    // Keep the misregistered first sheet and its correction joint simultaneously visible.
    b.box('clay', -7.15, 2.14, -7.7, .105, 3.95, .13, [0, .105, 0], false, true, 'retained-correction-seam');
    b.beam('clay', [-7.15, .5, -7.71], [-6.56, 1.1, -7.65], .095, .11, true, true);
    b.box('paper', -5.04, 4.37, -7.47, 2.72, .63, .055, null, true);
    // A protected unprogrammed margin is a real part of the plan, not more work space.
    slopedCanopy(b, 5.4, 7.3, 7.65, 4.3, 7.04, .42, 'tile');
    for (const z of [5.6, 8.8]) b.column(8.45, z, 7.1, 'cedar', .22);
    b.screenSide(8.47, 7.17, 3.55, 3.15, 'paper');
    panel(b, 6.15, 8.89, 4.5, 3.12, 'linen');
    b.bench(6.9, 7.62, 2.3, true, false);
    b.box('limestone', -5.35, .035, 7.3, 7.2, .035, 4.2, null, true);
    // Empty left rear apron and direct back door stay open; there is no heroic finale.
    visitorPath(b, 'proof-bays-to-personal-margin', [[3.0, 3.7], [3.0, 5.6], [4.4, 6.8], [6.1, 6.8]], 'ceramic', .045);
    const flap = labelledGroup(b, 'proof-annotation-lintel', -6.4, 4.39, -7.62);
    C.boxMesh(b, flap, 'paper', 1.28, 0, 0, 2.56, .68, .055, 'reversible-annotation');
    C.boxMesh(b, flap, 'clay', .04, 0, -.043, .07, .72, .035, 'correction-hinge');
    C.boxMesh(b, flap, 'bronze', 1.28, -.37, 0, 2.6, .04, .08, 'retained-proof-edge');
    C.motion(b, 'annotation-reveals-the-earlier-proof', flap, v => { flap.rotation.y = -.52 * v; }, 'retained-layer-reveal');
    return finish(b, options, w, d, {
      role: 'Proof and personal-margin workshop',
      description: 'Eight proof ribs shelter paired work bays, a retained misregistered sheet and a sparse correction joint, releasing into a quiet side margin',
      concept: 'Revision makes mutual effort legible without erasing skepticism, fatigue or the right to leave for personal study',
      sequence: ['Retained offset first proof', 'Eight shallow editorial ribs', 'Equal paired working bays', 'Quiet unclaimed side margin and clear exit'],
      observations: [
        'Eight editorial stages retain early skepticism alongside later attachment; the source does not erase the workload.',
        'Alternating task lists made invisible work public, while a criticized layout became training material rather than personal blame.',
        'Complementary editorial and aesthetic work is followed by a usable handover and an explicit boundary for personal exam study.'
      ],
      phaseLabels: ['保留毛稿', '看见共同修订', '把页边留给自己'],
      mechanism: 'A small rigid annotation lintel pivots to reveal the earlier proof plane; the original and vermilion correction seam are retained in all phases.',
      signY: 4.95
    });
  };

  B[22] = function ({b, options}) {
    const w = 20, d = 20;
    b.deck(w, d);
    const stages = [{z: -7.3, h: 7.05}, {z: -2.6, h: 7.4}, {z: 2.15, h: 7.7}, {z: 6.85, h: 7.25}];
    stages.forEach(({z, h}, n) => {
      frame(b, z - 1.62, -8.5, 8.5, h, 'cedar', .25);
      frame(b, z + 1.62, -8.5, 8.5, h, 'cedar', .25);
      slopedCanopy(b, -4.75, z, 8.65, 3.6, h + .13, .45, n % 2 ? 'copper' : 'tile');
      slopedCanopy(b, 4.75, z, 8.65, 3.6, h + .13, .45, n % 2 ? 'tile' : 'copper');
      b.box('glass', 0, h + .35, z, 1.45, .09, 3.6);
    });
    // Stage 1: one blank, immutable datum. No invented inscription is applied.
    b.box('masonry', -5.45, .25, -7.15, 4.55, .5, 1.6, null, false, true, 'immutable-datum-base');
    b.box('ink', -5.45, 2.24, -7.15, 3.45, 3.52, .45, null, false, true, 'immutable-original-datum');
    b.box('bronze', -5.45, .53, -7.41, 3.58, .05, .07, null, true);
    b.box('glass', -5.45, 2.3, -7.75, 3.78, 3.5, .035, null, false, true, 'original-protection-screen');
    workLight(b, -6.6, -7.16, 1.5, 4.5);
    // The source register sits separately from the datum and does not change it.
    b.table(5.4, -7.15, 3.7, 1.7, 1.02, 'oak');
    b.paper(5.4, 1.11, -7.15, 2.95, 1.22, false);
    // Stage 2: eleven small reference carriers, compared at the same height and light.
    for (const side of [-1, 1]) {
      b.table(side * 5.3, -2.6, 5.25, 1.8, 1.04, 'limestone');
      const count = side < 0 ? 6 : 5;
      for (let n = 0; n < count; n++) {
        const x = side * 5.3 + (n - (count - 1) / 2) * .77;
        b.box('paper', x, 1.7, -2.36, .62, 1.13, .055, null, true);
        b.box('steel', x, 1.22, -2.4, .035, .26, .2, null, true);
        b.box('bronze', x, 1.14, -2.39, .64, .045, .4, null, true);
      }
      workLight(b, side * 5.3, -2.6, 2.0, 3.45);
    }
    // Stage 3: a reversible, non-generative layer is mechanically distinct from its record.
    b.box('masonry', -5.45, .27, 2.15, 5.5, .54, 1.75, null, false, true, 'overlay-swept-footprint-plinth');
    b.box('ink', -5.7, 1.9, 2.35, 3.1, 2.7, .16, null, false, true, 'unaltered-record-plane');
    b.box('steel', -5.45, 3.55, 1.81, 4.8, .11, .15);
    b.box('bronze', -5.45, .61, 1.81, 4.8, .09, .18, null, true);
    const overlay = labelledGroup(b, 'reversible-readability-overlay', -5.7, 2.05, 1.82);
    C.boxMesh(b, overlay, 'glass', 0, 0, 0, 3.2, 2.7, .055, 'derived-non-generative-glass-layer');
    for (const x of [-1.63, 1.63]) C.boxMesh(b, overlay, 'bronze', x, 0, 0, .055, 2.82, .07, 'overlay-carrier-edge');
    for (const y of [-1.39, 1.39]) C.boxMesh(b, overlay, 'steel', 0, y, 0, 3.32, .06, .09, 'reversible-overlay-runner');
    // A conservative physical carrier envelope is entirely above its solid plinth.
    const sweep = new b.T.Box3(new b.T.Vector3(-7.37, .56, 1.71), new b.T.Vector3(-3.05, 3.49, 1.93));
    sweep.userData = {architectural: true, part: 'moving-overlay-carrier-envelope', index: 22}; b.collisionBoxes.push(sweep);
    C.motion(b, 'separate-derived-overlay-from-original', overlay, v => { overlay.position.x = -5.7 + .96 * v; }, 'reversible-overlay-translation');
    b.table(5.3, 2.15, 3.8, 1.8, 1.03, 'oak'); b.paper(5.3, 1.12, 2.15, 2.8, 1.24, false);
    // Stage 4: branching source proposals remain physically thin and discontinuous.
    for (const side of [-1, 1]) {
      const originZ = side < 0 ? 6.05 : 5.0;
      const targets = side < 0 ? [[-1.35, 7.7, 4.0], [1.45, 7.55, 4.45], [.25, 8.72, 3.7]]
        : [[-1.35, 5.65, 4.0], [1.45, 6.35, 4.45], [.25, 6.55, 3.7]];
      b.column(side * 5.3, originZ, 4.7, 'steel', .12);
      for (const [dx, z, y] of targets) {
        const x = side * 5.3 + dx;
        b.column(x, z, y, 'cedar', .13);
        const a = new b.T.Vector3(side * 5.3, 4.7, originZ), end = new b.T.Vector3(x, y, z);
        const delta = end.clone().sub(a);
        // Attributed relation candidates stop before the target; no false formal edge.
        for (const interval of [[0, .25], [.34, .61], [.7, .85]]) {
          const p = a.clone().addScaledVector(delta, interval[0]), q = a.clone().addScaledVector(delta, interval[1]);
          b.beam('bronze', p.toArray(), q.toArray(), .057, .067, true);
        }
        b.box('clay', x, y + .05, z, .11, .09, .11, null, true);
      }
    }
    // An empty framed recess is a valid stopping point. Its gap never closes.
    b.box('limestone', 6.25, .035, 8.25, 4.0, .028, 2.25, null, true);
    b.column(4.38, 9.05, 3.25, 'cedar', .14); b.column(8.15, 9.05, 3.25, 'cedar', .14);
    b.box('cedar', 4.96, 3.3, 9.05, 1.32, .14, .16);
    b.box('cedar', 7.52, 3.3, 9.05, 1.41, .14, .16);
    b.box('linen', 8.2, 1.56, 8.1, .08, 2.65, 1.45, null, false, true, 'unresolved-recess-side');
    visitorPath(b, 'proposal-lattice-to-unresolved-recess', [[3.0, 4.5], [3.0, 7.2], [5.8, 8.0]], 'ceramic', .04);
    return finish(b, options, w, d, {
      role: 'Evidence and uncertainty cloister',
      description: 'Four separated thresholds protect an immutable datum, equal comparison carriers, a reversible transparent overlay and deliberately discontinuous proposal lattice',
      concept: 'Evidence is preserved, derived layers stay distinct, and the route can stop at a real unresolved gap',
      sequence: ['Immutable blank datum', 'Eleven equal-height reference carriers', 'Reversible non-generative overlay', 'Provisional source lattice and unresolved recess'],
      observations: [
        'The workflow freezes the original before outside-source comparison, approved non-generative readability enhancement and source-linked exploration.',
        'The successful case is a known CC0 input replay through a fixed index; eleven images are comparison inputs, not repaired objects or evidence of live recognition.',
        'The rendered report showed 57 nodes and 89 relations but zero formal historical edges; the architecture therefore leaves proposal joints visibly disconnected.',
        'The boundary case preserves unresolved textual differences, failed inputs and an appended correction rather than making an unsupported historical assertion.'
      ],
      phaseLabels: ['原件不动', '分离比照层', '保留未决之处'],
      mechanism: 'A rigid transparent comparison overlay slides 0.96 m beside its unchanged record; the original datum and disconnected proposal gaps never change or fill in.',
      boundary: 'A spatial interpretation of public workflow documentation, not an authentic inscription or historical reconstruction. External historical sources were not all independently checked. Zero formal historical edges remains zero in all phases.',
      signY: 4.55
    });
  };

  B[25] = function ({b, options}) {
    const w = 21, d = 19.5;
    b.deck(w, d, 'wood');
    // A repeatable kit makes paper craft, tools and testing peers in one workshop.
    for (const z of [-8.35, -3.15, 2.05, 8.35]) frame(b, z, -8.8, 8.8, 6.8, 'cedar', .27);
    for (const side of [-1, 1]) {
      for (const z of [-8.35, 2.05, 8.35]) b.column(side * 3.3, z, 6.8, 'steel', .18);
      roofJoist(b, side * 3.3, 0, 17.05, 6.97);
      roofJoist(b, side * 8.8, 0, 17.05, 6.97);
    }
    // Interchangeable roof cassettes expose paper/metal layers and inspection gaps.
    const roofModules = [
      {x: -5.65, z: -5.75, w: 8.7, d: 6.2, h: 7.06, m: 'tile'},
      {x: 5.65, z: -5.75, w: 8.7, d: 6.2, h: 7.06, m: 'copper'},
      {x: -5.65, z: 2.45, w: 8.7, d: 8.8, h: 7.18, m: 'copper'},
      {x: 5.65, z: 3.15, w: 8.7, d: 10.1, h: 7.18, m: 'tile'}
    ];
    for (const r of roofModules) slopedCanopy(b, r.x, r.z, r.w, r.d, r.h, .66, r.m);
    b.box('glass', 0, 7.47, -.1, 2.7, .1, 18.2);
    // Traceable branches are load paths, not a logo or contribution heatmap.
    for (const side of [-1, 1]) {
      b.beam('cedar', [side * 3.3, 6.7, -8.3], [side * 5.4, 6.7, -3.15], .24, .26);
      b.beam('cedar', [side * 5.4, 6.7, -3.15], [side * 3.3, 6.7, 2.05], .24, .26);
      b.beam('cedar', [side * 3.3, 6.7, 2.05], [side * 5.5, 6.7, 8.3], .24, .26);
      for (const z of [-3.15, 2.05]) {
        b.box('steel', side * 3.3, 6.75, z, .54, .38, .46);
        b.box('bronze', side * 3.3, 6.75, z - .26, .65, .44, .04, null, true);
        b.bolts(side * 3.3, 6.75, z - .29, .65, .44);
      }
    }
    // Paper / brush bench: blank work sheets and real inspectable hand-tool components.
    b.table(-5.7, -5.55, 4.8, 2.45, 1.04, 'oak');
    b.paper(-5.7, 1.13, -5.55, 3.7, 1.6, false);
    b.box('ink', -7.45, 1.19, -5.55, .34, .11, .27, null, true);
    for (let n = 0; n < 3; n++) b.beam('walnut', [-7.05 + n * .13, 1.18, -6.02], [-6.9 + n * .13, 1.18, -5.1], .024, .024, true);
    b.screenSide(-8.8, -5.45, 4.9, 3.95, 'paper'); workLight(b, -5.7, -5.6, 2.5, 3.75);
    // Layout / extraction instrument bench: modules stay discrete and inspectable.
    b.table(5.7, -5.55, 4.8, 2.45, 1.04, 'oak');
    for (let n = 0; n < 4; n++) {
      b.box('paper', 4.3 + n * .9, 1.2, -5.55, .63, .08, 1.3, null, true);
      b.box('steel', 4.3 + n * .9, 1.26, -5.55, .66, .035, .045, null, true);
    }
    b.screenSide(8.8, -5.45, 4.9, 3.95, 'glass'); workLight(b, 5.7, -5.6, 2.5, 3.75);
    // The common assembly table is deliberately off-axis, reachable from both side routes.
    b.table(5.35, .85, 4.4, 3.85, 1.04, 'oak');
    b.paper(5.35, 1.13, .85, 3.5, 2.8, false);
    b.bench(5.35, 3.5, 3.6, false, false);
    // Transparent test / contract bay gives construction a checkable rear face.
    b.table(-5.6, 2.25, 4.55, 3.6, 1.04, 'limestone');
    b.box('glass', -5.6, 1.91, 2.45, 3.6, 1.56, 2.0, null, true);
    for (const x of [-7.4, -3.8]) for (const z of [1.45, 3.45]) b.box('steel', x, 1.92, z, .07, 1.58, .07, null, true);
    for (const x of [-6.55, -5.6, -4.65]) {
      b.box('cedar', x, 1.48, 2.45, .61, .53, 1.1, null, true);
      b.box('bronze', x, 1.77, 2.45, .61, .055, 1.1, null, true);
    }
    b.screenSide(-8.8, 2.7, 7.4, 4.0, 'glass'); workLight(b, -5.6, 2.3, 3.5, 3.75);
    // A separate collected-study annex is sleeve-connected, not presented as original work.
    b.table(6.1, 6.6, 3.75, 1.75, 1.04, 'cedar');
    panel(b, 6.1, 8.35, 3.85, 3.3, 'paper');
    b.box('steel', 6.1, 5.5, 6.6, 3.8, .17, .2);
    b.box('bronze', 4.1, 5.5, 6.6, .38, .29, .32);
    b.box('bronze', 8.1, 5.5, 6.6, .38, .29, .32);
    b.beam('steel', [4.1, 5.5, 6.6], [3.3, 6.69, 6.6], .1, .14, true);
    b.box('linen', 6.1, 1.14, 6.6, 2.7, .025, 1.1, null, true);
    // Side circulation passes inward of post feet, then branches only after the worktops.
    visitorPath(b, 'paper-bench-to-inspection-bay', [[-2.55, -9.05], [-2.55, 4.85], [-4.05, 5.6], [-4.05, 8.95]], 'bronze', .04);
    visitorPath(b, 'tool-bench-to-collected-study', [[2.55, -9.05], [2.55, 4.75], [3.65, 5.2], [3.65, 7.5], [2.55, 7.7], [2.55, 9.05]], 'ceramic', .045);
    // One shallow exploded joint makes modular assembly legible; old positions remain.
    b.box('cedar', -5.65, 5.2, 6.55, 3.3, .27, .3);
    b.box('steel', -5.65, 5.2, 6.32, .72, .42, .075, null, true);
    for (const x of [-5.89, -5.41]) for (const y of [5.08, 5.32]) b.cyl('ink', x, y, 6.268, .043, .032, [Math.PI / 2, 0, 0], true);
    const joint = labelledGroup(b, 'inspectable-modular-coupling', -5.65, 5.2, 6.25);
    C.boxMesh(b, joint, 'bronze', 0, 0, 0, .82, .5, .075, 'shallow-exploded-joint-plate');
    for (const x of [-.24, .24]) for (const y of [-.12, .12]) C.boxMesh(b, joint, 'steel', x, y, -.052, .065, .065, .055, 'visible-fastener');
    C.motion(b, 'inspect-the-workshop-coupling', joint, v => { joint.position.z = 6.25 - .46 * v; }, 'shallow-exploded-joint');
    return finish(b, options, w, d, {
      role: 'Cultural and engineering maker workshop',
      description: 'A low modular timber-and-metal workshop connects paper craft, layout tools, a transparent test bay and a separately sleeve-connected study annex',
      concept: 'Actual public project families become mutually accessible work bays, with additive engineering joints and distinct collected-study connections',
      sequence: ['Branching entry to paper and tool benches', 'Common off-axis assembly table', 'Transparent inspection and testing bay', 'Separately connected collected-study annex'],
      observations: [
        'The reviewed public catalog mixes narrative archives, editorial utilities, digital brushes, cultural-heritage research and native-app source.',
        'Verified examples include mo-hun and moxi brush work, wx-layout assembly and DocAssetKit extraction, classification and deduplication; no unreviewed project function is claimed.',
        'The Mosheng README joins staged digital restoration and ink creation to native-client engineering, tests and contracts; review source is not a distributed app or physical conservation advice.',
        'Many catalog entries are forks. Separate sleeve-connected study modules acknowledge participation without attributing all repositories as original authorship or implying permission to reuse public code.'
      ],
      phaseLabels: ['看见不同手艺', '检查连接方式', '保留可接续的构造'],
      mechanism: 'One small coupling plate translates 0.46 m to expose the unchanged old joint and fastener seats; this is inspectability, not a claim that code was tested.',
      boundary: 'Based on the rendered public profile, both catalog pages, mo-hun overview and the Mosheng README; no implementation audit, authorship claim for forks, copied logo or assumed reuse license.',
      signY: 4.5
    });
  };
})(window);
