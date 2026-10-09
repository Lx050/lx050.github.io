/* Reviewed live content, 8 October 2026. Creation, conservation, care and publishing.
 * The content's order is the plan: front -Z, back +Z. The 3.6 m aisle is never a room.
 * All interpretive movements are confined to side bays, including intermediate states.
 */
(function (global) {
  'use strict';
  const C = global.CourtyardContent;
  const B = global.CourtyardContentBuilders;
  if (!C || !B) throw new Error('Load content-core before content-creation-care');

  // A framed, complete sheet. The image is a material study, not a fabricated screenshot.
  function sheet(b, x, y, z, w, h, ry, tone, marks) {
    const co = Math.cos(ry || 0), si = Math.sin(ry || 0);
    const at = (u, v, n) => [x + u * co + n * si, y + v, z - u * si + n * co];
    const piece = (mat, u, v, n, ww, hh, dd) => b.box(mat, ...at(u, v, n), ww, hh, dd, [0, ry || 0, 0], true);
    piece('walnut', 0, 0, 0, w + .14, h + .14, .13);
    piece(tone || 'paper', 0, 0, -.077, w, h, .018);
    if (marks === 'type') {
      for (let k = 0; k < 9; k++) piece('ink', -.07 * w, h * .35 - k * h * .075, -.094, w * (.59 + (k % 3) * .07), .023, .009);
    } else if (marks === 'landscape') {
      // Full rectangular field stays legible while its conservation layer moves separately.
      for (let k = 0; k < 8; k++) {
        const xx = -w * .39 + k * w * .11, yy = Math.sin(k * 1.8) * h * .14;
        piece(k % 3 ? 'moss' : 'indigo', xx, yy, -.094, w * .17, h * (.12 + k % 3 * .07), .009);
      }
      piece('clay', w * .39, -h * .32, -.095, .09, .12, .012);
    }
    return { at, piece };
  }
  function label(b, text, x, z, w, y) { b.plaque(text, x, y || 2.95, z, w || 2.5); }
  function rail(b, x, z, length, y, mat) {
    b.box(mat || 'bronze', x, y || 1.0, z, .07, .075, length, null, true);
    for (const zz of [z - length / 2 + .08, z + length / 2 - .08]) b.box('cedar', x, .5, zz, .075, .98, .075, null, false, true, 'reachable-handrail-post');
  }
  function acoustic(b, x, z, length, h, side) {
    b.box('linen', x, h / 2 + .5, z, .11, h, length, null, false, true, 'private-acoustic-wall');
    for (let p = -.5 * length; p <= .5 * length; p += .22) b.box('oak', x + (side || 1) * .075, h / 2 + .5, z + p, .09, h, .035, null, true);
  }
  function headset(b, x, z, y) {
    // A small table docking object makes bone-conduction care physically specific.
    b.box('oak', x, y, z, .62, .07, .44, null, true);
    b.box('steel', x, y + .29, z + .07, .045, .54, .045, null, true);
    b.ring('steel', x, y + .43, z, .24, .027, [0, 0, .24], true, Math.PI * 1.48);
    for (const s of [-1, 1]) b.box('ceramic', x + s * .225, y + .28, z, .12, .085, .07, [0, 0, s * .3], true);
  }
  function movingFrame(b, parent, w, h, material) {
    C.boxMesh(b, parent, material || 'glass', 0, 0, 0, w, h, .035, 'reversible-interpretive-layer');
    for (const s of [-1, 1]) {
      C.boxMesh(b, parent, 'bronze', s * w / 2, 0, -.028, .045, h + .08, .055);
      C.boxMesh(b, parent, 'bronze', 0, s * h / 2, -.028, w + .08, .045, .055);
    }
  }
  function protectWorkBay(b, x, z, w, d, h, name) {
    // Conservative fixed envelope around a visibly occupied worktop / guard plinth.
    // It prevents lateral visitors entering the sweep, without adding axial barriers.
    const bound = new b.T.Box3(new b.T.Vector3(x - w / 2, .08, z - d / 2), new b.T.Vector3(x + w / 2, h || 2.4, z + d / 2));
    bound.userData = { architectural: true, protectedMovement: true, part: name };
    b.collisionBoxes.push(bound);
  }

  B[0] = function ({ b, options, T }) {
    const w = 16.4, d = 18.4;
    b.deck(w, d, 'wood');
    // Three distinct roof volumes mark generation, precise annotation, then dense archive.
    const stages = [{ z: -6, h: 5.2, rise: 2.25 }, { z: 0, h: 5.65, rise: 2.3 }, { z: 6, h: 6.1, rise: 2.35 }];
    stages.forEach((s, j) => {
      for (const x of [-7.25, 7.25]) for (const zz of [-2.65, 2.65]) b.column(x, s.z + zz, s.h, 'walnut', .3);
      for (const zz of [-2.65, 2.65]) b.box('walnut', 0, s.h, s.z + zz, 14.8, .28, .24);
      b.gable(0, s.z, 17.2, 6.1, s.h + .18, s.rise, 'tile', { timber: 'walnut' });
      b.screenSide(-7.25, s.z, 5.15, 4.15, j === 2 ? 'solid' : 'paper');
      b.screenSide(7.25, s.z, 5.15, 4.15, j === 2 ? 'solid' : 'glass');
      for (const x of [-2.5, 2.5]) b.box('bronze', x, .04, s.z, .07, .025, 4.7, null, true);
    });
    // Filtered end walls keep the generation and annotation work visible on arrival.
    // Dark identity is carried by slate sills and joinery, never featureless black slabs.
    for (const z of [-8.85, 8.85]) {
      for (const side of [-1, 1]) {
        const cx = side * 4.72;
        b.box('steel', cx, .5, z, 5.04, 1.0, .17, null, false, true, 'slate-work-bay-sill');
        b.box('glass', cx, 2.64, z, 5.04, 3.24, .035, null, false, true, 'filtered-work-bay-window');
        for (const yy of [1.05, 2.12, 3.18, 4.25]) b.box('oak', cx, yy, z - .035, 5.12, .075, .1, null, true);
        for (let n = 0; n <= 5; n++) {
          const x = side * (2.2 + n * 1.0);
          b.box('oak', x, 2.66, z - .036, .055, 3.27, .1, null, true);
          if (n < 5) {
            b.box('paper', x + side * .45, .53, z - .094, .57, .37, .012, null, true);
            b.box('bronze', x + side * .45, .35, z - .108, .25, .027, .02, null, true);
          }
        }
        b.box('walnut', side * 2.13, 2.14, z, .18, 4.28, .24, null, false, true, 'unlatched-open-entrance-jamb');
      }
      b.box('walnut', 0, 4.36, z, 14.5, .23, .24);
    }
    // Generation: whole source on one side, individual character cells on the other.
    b.table(-4.8, -5.95, 3.6, 2.25, 1.0, 'walnut');
    b.paper(-4.8, 1.085, -5.95, 2.9, 1.62, true);
    b.monitor(-5.7, -5.4, 1.87);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const xx = 3.25 + c * .9, yy = 1.45 + r * .8;
      b.box('paper', xx, yy, -7.7, .69, .64, .085, null, true);
      b.box('ink', xx, yy, -7.752, .32, .045, .013, [0, 0, -.17 + c * .13], true);
      b.box('ink', xx + .04, yy - .07, -7.755, .036, .3, .013, [0, 0, r * .12], true);
    }
    b.box('walnut', 4.6, 2.24, -7.62, 4.15, 3.0, .12, null, false, true, 'generation-character-grid');
    b.bench(4.7, -5.5, 2.85, false, false);
    label(b, '生成 · 整幅与单字', -4.8, -7.9, 3.65, 3.45);
    // Annotation: a gridded measuring bed and two different region boundaries.
    b.table(4.9, .1, 3.7, 3.3, .98, 'walnut'); b.paper(4.9, 1.065, .1, 3.1, 2.75, false);
    for (let k = 0; k <= 8; k++) {
      b.box('bronze', 3.4 + k * .375, 1.08, .1, .013, .012, 2.7, null, true);
      if (k < 8) b.box('bronze', 4.9, 1.08, -1.2 + k * .375, 3.0, .012, .013, null, true);
    }
    b.cabinet(-4.7, .9, 3.3, 1.06, 4); b.paper(-4.7, 1.085, .9, 2.7, .72, true);
    label(b, '标注 · 边界与结构', 4.8, 2.0, 3.55, 3.35);
    const layers = new T.Group(); layers.name = 'annotation-rectangle-polygon-carriage'; layers.position.set(4.9, 1.1, .1); b.root.add(layers);
    for (const s of [-1, 1]) {
      C.boxMesh(b, layers, 'clay', s * .9, .018, 0, .035, .035, 1.95);
      C.boxMesh(b, layers, 'clay', 0, .018, s * .96, 1.84, .035, .035);
    }
    const polygon = new T.Group(); layers.add(polygon); polygon.rotation.y = .18;
    const vertices = [[-.55, -.47], [.26, -.63], [.6, -.18], [.38, .52], [-.5, .44]];
    vertices.forEach((point, j) => {
      const next = vertices[(j + 1) % vertices.length];
      const a = new T.Vector3(point[0], .065, point[1]), c = new T.Vector3(next[0], .065, next[1]);
      const line = c.clone().sub(a), mid = a.add(c).multiplyScalar(.5);
      const mesh = C.boxMesh(b, polygon, 'ink', mid.x, mid.y, mid.z, .028, line.length(), .026, 'polygon-region-edge');
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), line.normalize());
    });
    C.motion(b, '整幅生成—框选标注—索引入库', layers, v => { layers.position.x = 4.5 + v * .75; layers.position.y = 1.1 + Math.sin(Math.PI * v) * .23; polygon.rotation.y = .18 + v * .32; }, 'annotation-registration');
    protectWorkBay(b, 4.9, .1, 3.7, 3.3, 1.6, 'guarded-annotation-worktable');
    // Archive: physical flat files and a side-facing index, rather than another image wall.
    for (const x of [-4.85, 4.85]) { b.cabinet(x, 6.7, 3.7, 1.55, 8); b.cabinet(x, 4.8, 3.7, 1.1, 5); }
    b.books(-6.75, 5.7, 3.1, 3.25, 'side', 2);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) b.box(c % 3 ? 'paper' : 'clay', 3.25 + c * .56, 2.05 + r * .49, 8.55, .4, .31, .075, null, true);
    label(b, '归档 · 可寻可调用', 4.8, 8.35, 3.55, 3.85);
    return C.finish(b, options, w, d, {
      role: '书法生成、图像标注与数据归档工作室', signY: 4.75,
      description: 'Three stepped dark-timber work bays progress from complete inscriptions and character grids through region-bound annotation to searchable flat-file storage.',
      concept: '沿着生成 → 标注 → 归档走一遍；屋脊逐级抬高，工作对象从整幅分解为边界，再进入可寻的格架。',
      evidence: ['https://moxi.maniforld.com/'],
      observations: ['单字生成与风格迁移并列，不只有书法展示', '标注区区分矩形、多边形和结构标签', '数据管理是第三个真实功能区'],
      phaseLabels: ['整幅生成', '边界标注', '索引归档'], mechanism: '标注框沿测量台定位；全程留在侧向工作湾'
    });
  };

  B[1] = function ({ b, options, T }) {
    const w = 19.4, d = 18.8;
    b.deck(w, d); b.frame(17.2, 16.6, 6.1, { bays: 5, material: 'oak', post: .29 });
    // A bright collection nave beside a quieter, opaque conservation range.
    b.barrel(-2.25, 0, 13.2, 19.6, 6.27, 3.05, 'glass');
    b.lean(6.45, 0, 6.1, 19.6, 5.15, 2.05, 'copper');
    b.screenSide(-8.6, 0, 16.3, 4.85, 'paper'); b.screenSide(8.6, 0, 16.3, 4.85, 'solid');
    // Public collection front is transparent; the quieter back retains a solid display wall.
    for (const z of [-8.8, 8.8]) {
      for (const side of [-1, 1]) {
        b.box('limestone', side * 5.4, .28, z, 6.4, .56, .2, null, false, true, 'collection-front-sill');
        b.box(z < 0 ? 'glass' : 'chalk', side * 5.4, 2.6, z, 6.4, 4.1, .07, null, false, true, 'gallery-facing-window-or-wall');
        for (const x of [side * 2.2, side * 5.4, side * 8.6]) b.box('oak', x, 2.37, z, .09, 4.74, .15, null, false, true, 'gallery-window-jamb');
        b.box('oak', side * 5.4, 4.7, z, 6.55, .13, .18);
      }
      b.box('oak', 0, 4.83, z, 17.4, .2, .23);
    }
    b.box('clay', 0, 5.13, -8.86, 17.65, .23, .24);
    // Five media are five different material encounters, on a single long collection route.
    const zs = [-6.6, -3.3, 0, 3.3, 6.6];
    zs.forEach((z, j) => {
      b.box('masonry', -6.25, .14, z, 3.55, .28, 2.75, null, false, true, 'collection-niche-plinth');
      if (j === 0) b.scroll(-6.25, 2.35, z + .9, 1.6, 2.9, true);
      if (j === 1) { sheet(b, -6.2, 2.35, z + .9, 2.9, 2.45, 0, 'clay', 'landscape'); b.box('masonry', -6.2, .7, z + .97, 3.0, 1.1, .2, null, false, true, 'mural-fragment-support'); }
      if (j === 2) sheet(b, -6.2, 2.35, z + .9, 2.9, 2.0, 0, 'paper', 'landscape');
      if (j === 3) { b.display(-6.15, z, 1.7, 1.55, 1.85); b.cyl('bronze', -6.15, 1.52, z, .45, .76, null, true); b.ring('bronze', -6.15, 1.94, z, .43, .055, [Math.PI / 2, 0, 0], true); for (const s of [-1, 1]) b.ring('bronze', -6.15 + s * .45, 1.74, z, .18, .035, [0, Math.PI / 2, 0], true); }
      if (j === 4) { sheet(b, -6.2, 2.25, z + .85, 2.5, 2.45, 0, 'linen'); for (let k = 0; k < 5; k++) for (let q = 0; q < 5; q++) if ((k + q) % 2) b.box('clay', -7.1 + k * .45, 1.4 + q * .43, z + .755, .3, .3, .025, [0, 0, Math.PI / 4], true); }
      b.box('oak', -4.27, 1.6, z, .075, 3.2, 2.45, null, false, true, 'collection-bay-edge');
    });
    // The long-scroll rhythm is continuous, unlike 墨息's character-cell grid.
    sheet(b, 8.2, 3.28, 0, 13.75, 1.7, Math.PI / 2, 'paper', 'landscape');
    b.table(5.1, -.65, 4.25, 5.6, .98, 'limestone'); b.paper(5.1, 1.065, -.8, 3.25, 3.48, false);
    b.cabinet(6.2, 6.8, 3.8, 1.23, 6); b.bench(4.45, -6.15, 3.8, true, false);
    // A reversible original / contour / intervention stack retains one complete common frame.
    sheet(b, 5.25, 2.62, 2.03, 3.8, 2.65, 0, 'paper', 'landscape');
    const comparison = new T.Group(); comparison.position.set(5.25, 2.62, 1.86); comparison.name = 'conservation-original-contour-mask-stack'; b.root.add(comparison);
    const contour = new T.Group(), mask = new T.Group(); comparison.add(contour, mask);
    movingFrame(b, contour, 3.72, 2.57, 'glass'); movingFrame(b, mask, 3.72, 2.57, 'glassDark');
    for (let k = 0; k < 6; k++) C.boxMesh(b, contour, 'bronze', -.98 + k * .37, Math.sin(k * 1.4) * .4, -.04, .72, .018, .02);
    for (const p of [[-.9, -.55], [.52, .55], [.93, -.35]]) C.boxMesh(b, mask, 'paper', p[0], p[1], -.055, .48, .31, .018);
    C.motion(b, '馆藏—轮廓—局部介入的可逆图层', comparison, v => { contour.position.z = -.1 - v * .5; mask.position.z = -.21 - v * 1.05; mask.position.y = v * .22; }, 'same-frame-conservation-layers');
    protectWorkBay(b, 5.1, -.65, 4.25, 5.6, 4.3, 'guarded-comparison-worktable');
    // Quiet activation corner: two seats face the artwork, rather than a speculative exhibit.
    b.bench(4.0, 6.65, 2.25, true, true); b.bench(7.3, 5.15, 2.0, true, true);
    label(b, '典藏 · 修复 · 对话', 5.5, 8.56, 4.5, 4.0);
    return C.finish(b, options, w, d, {
      role: '馆藏、修复与文化对话展廊', signY: 5.3,
      description: 'A glazed five-medium collection nave meets an opaque conservation side-room, a continuous long-scroll wall and reversible same-frame inspection layers.',
      concept: '先走过五种艺术媒介，再在完整画面前分辨轮廓、遮罩与介入；公共馆藏与安静修复各有采光。',
      evidence: ['https://huayun.maniforld.com/', 'https://huayun.maniforld.com/virtual-restoration', 'https://huayun.maniforld.com/ancient-painting-restoration'],
      observations: ['书法、壁画、国画、青铜、剪纸五类馆藏', '修复目录区分轮廓、分割、超分与融合等任务', '古画修复界面含可选遮罩、模型和强度控制'],
      phaseLabels: ['浏览馆藏', '检查轮廓', '局部介入'], mechanism: '同框轮廓与遮罩向修复湾内错开，原画始终完整'
    });
  };

  B[2] = function ({ b, options, T }) {
    const w = 12.8, d = 12.6;
    b.deck(w, d); b.frame(10.8, 10.8, 5.0, { bays: 3, material: 'oak', post: .28 });
    b.gable(0, 0, 13.7, 13.4, 5.16, 2.28, 'copper');
    // An inhabited secondary threshold into the same program, not a fictitious ruin/archive.
    for (const z of [-5.35, 3.45]) C.portal(b, z, 4.85, 3.72, 'oak');
    b.box('clay', 0, 4.05, -5.38, 10.9, .19, .24);
    b.screenSide(-5.4, 0, 10.3, 3.85, 'paper'); b.screenSide(5.4, 0, 10.3, 3.85, 'glass');
    b.endPanels(10.8, 11.5, 3.65, 'chalk');
    sheet(b, -5.05, 2.34, .1, 7.6, 1.8, -Math.PI / 2, 'paper', 'landscape');
    b.bench(-3.45, .35, 5.4, true, false);
    b.table(3.95, -2.4, 2.7, 2.3, .93, 'oak'); b.paper(3.95, 1.015, -2.4, 2.25, 1.7, false);
    // A compact shared-content sample, visibly subordinate to the larger collection hall.
    for (let j = 0; j < 5; j++) b.box(['paper', 'clay', 'moss', 'bronze', 'linen'][j], 3.92, 1.8, -.6 + j * 1.0, .7, .85, .65, null, true);
    b.box('limestone', 3.92, .7, 1.45, 1.5, 1.4, 5.4, null, false, true, 'shared-collection-counter');
    const lightLayer = new T.Group(); lightLayer.position.set(4.65, 2.6, .7); lightLayer.name = 'alternate-entry-shared-gallery-light-filter'; b.root.add(lightLayer);
    for (let k = 0; k < 9; k++) C.boxMesh(b, lightLayer, k % 3 ? 'oak' : 'glass', 0, 0, -2.8 + k * .7, .055, 2.6, .26);
    C.motion(b, '同馆双入口的侧窗滤光', lightLayer, v => { lightLayer.position.x = 4.65 + .32 * v; lightLayer.position.z = .7 + .35 * v; }, 'secondary-entrance-light-filter');
    b.box('masonry', 4.88, .26, .875, .67, .52, 6.4, null, false, true, 'side-window-sill');
    protectWorkBay(b, 4.88, .875, .67, 6.4, 4.0, 'protected-side-window-filter');
    label(b, '画韵新生 · 另一入口', 3.9, 5.52, 3.7, 3.9);
    const result = C.finish(b, options, w, d, {
      role: '画韵新生的另一处在线入口', signY: 4.45,
      description: 'A modest nested-lintel entry with a shared long-scroll wall and a five-medium sample counter acknowledges the alternate live domain without inventing a separate historical collection.',
      concept: '同一画韵新生的第二道门：较小门廊、相同长卷与媒介，侧窗打开后仍是同一内容。',
      evidence: ['https://hyxs.art/', 'https://huayun.maniforld.com/'],
      observations: ['两处已阅首页的标题、馆藏类别和修复模块相同', 'hyxs.art 仍为在线入口，未观察到跳转', '没有独立历史档案馆的内容证据'],
      phaseLabels: ['另一入口', '透见长卷', '同馆相望'], mechanism: '次入口的侧窗滤片平移，让共同长卷获得更连续的光'
    });
    result.metadata.sharedProgramWith = 1; result.metadata.programRelationship = 'alternate-live-entrance';
    return result;
  };

  B[3] = function ({ b, options, T }) {
    const w = 14.8, d = 19.6;
    b.deck(w, d, 'wood'); b.frame(12.9, 17.6, 5.1, { bays: 4, material: 'oak', post: .26 });
    b.barrel(0, 0, 15.6, 20.4, 5.25, 2.45, 'ceramic');
    b.screenSide(-6.45, 0, 17.1, 4.05, 'paper'); b.screenSide(6.45, 0, 17.1, 4.05, 'paper');
    b.endPanels(12.9, 18.5, 4.0, 'chalk');
    // Four shallow light hoods set a slow cadence under one continuous protective vault.
    const stages = ['微吸去尘', '无接触成像', '纸张补缺', '间接润展'];
    const zs = [-6.6, -2.2, 2.2, 6.6];
    zs.forEach((z, j) => {
      b.table(4.55, z, 2.9, 2.7, .95, 'oak'); b.paper(4.55, 1.035, z, 2.35, 2.08, false);
      b.box('linen', 4.55, 3.7, z, 3.45, .11, 3.35, null, true);
      for (const x of [3.05, 6.0]) b.beam('bronze', [x, 3.7, z], [x, 5.12, z], .025, .025, true);
      b.box('lamp', 4.55, 3.62, z, 2.8, .045, .2, null, true);
      if (j === 0) { b.box('linen', 4.6, 1.08, z, 1.95, .024, 1.67, null, true); for (let k = 0; k < 8; k++) b.box('oak', 5.55, 1.18, z - .35 + k * .095, .5, .025, .025, null, true); }
      if (j === 1) { for (const s of [-1, 1]) b.box('steel', 4.55 + s * 1.1, 1.85, z, .045, 1.6, .045, null, true); b.box('glass', 4.55, 2.6, z, 2.4, .055, 1.6, null, true); }
      if (j === 2) { for (let k = 0; k < 6; k++) b.box('paper', 4.1 + k * .16, 1.08 + k * .012, z + .35, .8, .016, .65, null, true); b.box('clay', 5.3, 1.1, z - .55, .4, .02, .32, null, true); }
      if (j === 3) { b.box('glass', 4.55, 1.46, z, 2.45, .8, 2.14, null, true); b.box('linen', 4.55, 1.895, z, 2.47, .035, 2.16, null, true); }
      label(b, stages[j], 4.55, z + 1.5, 2.9, 3.07);
    });
    // Separate complete before/after frames remain available from the pause bench.
    sheet(b, -6.03, 2.6, -3.9, 5.9, 2.85, -Math.PI / 2, 'linen', 'landscape');
    sheet(b, -6.03, 2.6, 3.9, 5.9, 2.85, -Math.PI / 2, 'paper', 'landscape');
    b.bench(-3.3, -3.9, 3.2, true, true); b.bench(-3.3, 3.9, 3.2, true, true);
    b.box('bronze', -5.6, 4.38, 0, .05, .08, 15.25, null, true);
    const inspection = new T.Group(); inspection.name = 'four-stage-full-composition-inspection-light'; inspection.position.set(-5.55, 4.26, -6.5); b.root.add(inspection);
    C.boxMesh(b, inspection, 'bronze', 0, 0, 0, .45, .15, .36);
    C.boxMesh(b, inspection, 'lamp', -.1, -.09, 0, .18, .04, .85);
    C.motion(b, '四次呼吸的整幅观察光', inspection, v => { inspection.position.z = -6.5 + v * 13; }, 'conservation-process-revisit');
    return C.finish(b, options, w, d, {
      role: '可停留、回看的整幅古画修复观察室', signY: 4.45,
      description: 'A quiet ceramic vault contains four shallow conservation bays, separate complete before-and-after works and pause benches; a side-mounted inspection light revisits the process without cropping a painting.',
      concept: '微吸、成像、补缺、润展依次成为四个浅湾；人在全幅画面旁停下，也能原路回看。',
      evidence: ['https://mosheng.maniforld.com/#process', 'https://mosheng.maniforld.com/#app'],
      observations: ['明确展示四步修复过程', '前后图像各自保留完整构图', '过程可观看、暂停和回访；未将未播放视频当作证据'],
      phaseLabels: ['观察全幅', '沿程停留', '回看修复'], mechanism: '观察光沿整幅画作外侧滑轨移动，画面和通路保持完整'
    });
  };

  B[4] = function ({ b, options, T }) {
    const w = 16.4, d = 14.8;
    b.deck(w, d, 'wood'); b.frame(14.4, 12.8, 5.35, { bays: 3, material: 'oak', post: .27 });
    b.hip(0, 0, 17.3, 15.8, 5.52, 2.22, 'tile');
    b.endPanels(14.4, 13.5, 3.65, 'chalk');
    // Domestic acoustic rooms within the taller weather roof: low, sheltered, inward-looking.
    for (const side of [-1, 1]) {
      acoustic(b, side * 7.05, 0, 10.8, 2.95, -side);
      b.box('linen', side * 4.9, 3.75, .4, 4.0, .12, 8.6, null, true);
      for (const z of [-3.7, 4.5]) for (const x of [side * 3.12, side * 6.7]) b.column(x, z, 3.68, 'oak', .14);
      b.bench(side * 5.85, 1.3, 3.2, true, true);
      b.box('linen', side * 6.22, 1.0, 1.3, .13, 1.03, 3.25, null, false, true, 'upholstered-listening-bench-back');
      b.lantern(side * 4.6, 3.1, .4, .47);
    }
    b.table(-4.75, -4.85, 3.45, 1.35, .85, 'oak'); headset(b, -5.72, -4.78, .96);
    b.monitor(-4.4, -4.45, 1.72);
    // A discreet inward status desk: no public identity, medical data or tracking monument.
    b.box('oak', -4.75, 1.55, -5.62, 3.5, 1.35, .1, null, false, true, 'private-dashboard-back');
    b.table(4.8, 4.8, 3.4, 1.35, .85, 'oak'); headset(b, 5.65, 4.75, .96);
    for (let k = 0; k < 5; k++) {
      b.box(k === 2 ? 'clay' : 'ceramic', 3.5 + k * .48, .965, 4.68, .34, .03, .48, null, true);
      if (k < 4) b.box('bronze', 3.74 + k * .48, .971, 4.68, .16, .018, .022, null, true);
    }
    b.table(-4.8, 4.9, 2.85, 1.25, .68, 'oak'); b.box('ceramic', -4.8, .84, 4.9, .35, .23, .28, null, true);
    // Side screens rotate only inside the acoustic alcoves, opening reciprocal conversation.
    const screens = new T.Group(); screens.name = 'family-listening-privacy-screens'; b.root.add(screens);
    const leaves = [];
    for (const side of [-1, 1]) {
      const p = new T.Group(); p.position.set(side * 6.55, 2.0, -2.35); screens.add(p); leaves.push({ p, side });
      C.boxMesh(b, p, 'linen', -side * 1.35, 0, 0, 2.7, 2.7, .065);
      for (let k = 0; k < 10; k++) C.boxMesh(b, p, 'oak', -side * (.08 + k * .28), 0, -.045, .035, 2.82, .045);
      for (const yy of [-1.39, 1.39]) C.boxMesh(b, p, 'oak', -side * 1.35, yy, 0, 2.85, .075, .12);
    }
    C.motion(b, '日常守护—倾听留言—家人回应', screens, v => leaves.forEach(({ p, side }) => { p.rotation.y = side * (.12 + v * .56); }), 'domestic-acoustic-enclosure');
    for (const side of [-1, 1]) {
      b.box('oak', side * 5.2, .26, -1.5, 3.1, .52, 2.2, null, false, true, 'acoustic-screen-dado-base');
      protectWorkBay(b, side * 5.2, -1.5, 3.1, 2.2, 3.5, 'protected-listening-screen-sweep');
    }
    label(b, '家人守护 · 留言往返', 4.85, -5.66, 3.8, 2.78);
    return C.finish(b, options, w, d, {
      role: '骨传导耳机家庭守护与双向留言会客室', signY: 4.25,
      description: 'A domestic hipped roof shelters two inward-facing acoustic alcoves, headset docking desks and a private family status station; timber-fabric screens regulate the listening enclosure.',
      concept: '状态先在入口内侧被看见，留言在相对的软木听室里往返；照护落在家常尺度和可回应的声音中。',
      evidence: ['https://nuanling.maniforld.com/dashboard', 'https://nuanling.maniforld.com/messages', 'https://nuanling.maniforld.com/app/'],
      observations: ['家庭守护台组织设备状态、行为摘要和日常提醒', '留言有收听状态并允许家庭双向交流', '骨传导视觉 AI 耳机演示；界面中的家庭和用药信息不是用户事实'],
      phaseLabels: ['日常守护', '听见留言', '家人回应'], mechanism: '软木与织物屏轻转，调节侧向听室的私密与交流'
    });
  };

  B[5] = function ({ b, options, T }) {
    const w = 14.2, d = 17.6;
    b.deck(w, d, 'wood'); b.frame(12.4, 15.6, 5.25, { bays: 4, material: 'oak', post: .25 });
    b.barrel(0, 0, 15.0, 18.5, 5.48, 1.98, 'tile');
    for (const z of [-7.8, 7.8]) {
      C.portal(b, z, 5.45, 3.65, 'oak'); b.box('linen', 0, 3.95, z, 6.6, .1, 1.3, null, true);
    }
    b.screenSide(-6.2, 0, 15.2, 3.65, 'paper'); acoustic(b, 6.2, 0, 15.2, 2.7, -1);
    // Connection first; four reachable action rooms, with one obvious return route.
    for (const x of [-3.25, 3.25]) {
      b.box('oak', x, 1.12, -7.0, .8, 2.24, .22, null, false, true, 'device-state-entry-post');
      b.box('moss', x, 1.83, -7.14, .27, .16, .034, null, true);
    }
    const actions = [
      { x: -4.65, z: -3.9, mat: 'clay', name: '看 · 拍照识物', type: 0 },
      { x: 4.65, z: -3.9, mat: 'indigo', name: '听 · 家人留言', type: 1 },
      { x: -4.65, z: 3.9, mat: 'moss', name: '说 · 录下留言', type: 2 },
      { x: 4.65, z: 3.9, mat: 'bronze', name: '聊 · 联系家人', type: 3 }
    ];
    const controls = new T.Group(); controls.name = 'four-large-reachable-action-lecterns'; b.root.add(controls);
    const tilts = [];
    actions.forEach(a => {
      b.box(a.mat, a.x, .045, a.z, 3.05, .025, 4.5, null, true);
      b.table(a.x, a.z - .7, 2.8, 1.1, .77, 'oak');
      b.box('linen', a.x, 3.32, a.z, 3.25, .1, 4.65, null, true);
      b.bench(a.x, a.z + 1.0, 2.55, false, true);
      label(b, a.name, a.x, a.z + 2.0, 3.0, 2.55);
      const p = new T.Group(); p.position.set(a.x, 1.04, a.z - .76); controls.add(p); tilts.push(p);
      C.boxMesh(b, p, 'oak', 0, 0, 0, 2.52, .095, .84);
      C.boxMesh(b, p, a.mat, 0, .06, 0, 2.36, .028, .72);
      // Large physical affordances, never tiny inaccessible UI labels.
      C.boxMesh(b, p, 'paper', 0, .085, 0, 1.08, .035, .35);
      protectWorkBay(b, a.x, a.z - .7, 2.85, 1.3, 1.6, 'protected-reachable-control-worktop');
      if (a.type === 0) { b.display(a.x, a.z + .4, 1.0, .85, .5); b.box('ceramic', a.x, 1.08, a.z + .4, .26, .4, .3, null, true); }
      else headset(b, a.x + .95, a.z - .7, .89);
      if (a.type === 2) b.box('linen', a.x - 1.5, 1.62, a.z + .5, .1, 2.2, 2.1, null, false, true, 'voice-message-acoustic-cheek');
      if (a.type === 3) b.box('linen', a.x + 1.5, 1.62, a.z + .5, .1, 2.2, 2.1, null, false, true, 'family-call-acoustic-cheek');
    });
    for (const s of [-1, 1]) for (const z of [-6.9, 0, 6.9]) rail(b, s * 2.57, z, z === 0 ? 2.0 : 1.35, .96, 'oak');
    b.box('clay', 5.78, 1.13, 7.17, .48, .5, .12, null, true); // Distinct supporting SOS, not the room's centrepiece.
    b.box('paper', 5.78, 1.13, 7.095, .24, .045, .014, null, true);
    b.box('paper', 5.78, 1.13, 7.094, .045, .24, .016, null, true);
    C.motion(b, '四项大操作台的可达倾角', controls, v => tilts.forEach(p => { p.rotation.x = .07 + v * .2; }), 'reachable-elder-controls');
    const result = C.finish(b, options, w, d, {
      role: '暖聆双端照护的长者入口', signY: 4.3,
      description: 'A step-free, clearly returnable passage serves four large seeing, listening, speaking and calling bays, with reachable controls, interrupted handrails and a discreet separate emergency point.',
      concept: '先确认连接，再按看、听、说、聊分成四个能坐下的操作湾；短路、扶手和回望入口比设备造型更重要。',
      evidence: ['https://nuanling.maniforld.com/app/', 'https://nuanling.maniforld.com/elder'],
      observations: ['入口明确区分子女端和老人端，标注演示版', '四项大按钮分别是拍照识物、听留言、录留言和打电话', '设备连接在先，天气、用药与 SOS 为辅助信息'],
      phaseLabels: ['连接就绪', '四项可达', '家人相伴'], mechanism: '四个侧湾操作面缓缓调整阅读倾角，不影响通行'
    });
    result.metadata.sharedProgramWith = 4; result.metadata.requestedDestination = 'https://nuanling.maniforld.com/app/';
    return result;
  };

  B[6] = function ({ b, options, T }) {
    const w = 18.4, d = 18.8;
    b.deck(w, d); b.frame(16.4, 16.8, 5.85, { bays: 3, material: 'steel', post: .24 });
    // Three true northlight roof sections follow the input → edit → preview sequence.
    const rise = 2.15, run = 6.2, angle = Math.atan2(rise, run);
    for (const z of [-6.2, 0, 6.2]) {
      b.box('copper', 0, 6.95, z, 19.2, .14, Math.hypot(run, rise), [-angle, 0, 0]);
      b.box('glass', 0, 6.94, z + run / 2, 18.9, 2.12, .055);
      for (let x = -8.2; x <= 8.3; x += 2.05) {
        b.beam('steel', [x, 5.86, z - 3.1], [x, 8.01, z + 3.1], .08, .15, true);
        b.beam('steel', [x, 5.85, z + 3.1], [x, 8.0, z + 3.1], .065, .08, true);
      }
      b.box('steel', 0, 8.07, z + 3.1, 19.2, .13, .12);
    }
    b.screenSide(-8.2, 0, 16.5, 4.2, 'paper'); b.screenSide(8.2, 0, 16.5, 4.2, 'solid');
    // The workshop opens above a low paper-white sill, so the first collection desk is visible.
    for (const z of [-8.8, 8.8]) {
      for (const side of [-1, 1]) {
        b.box('chalk', side * 5.25, .58, z, 6.1, 1.16, .18, null, false, true, 'editorial-window-sill');
        b.box('glass', side * 5.25, 2.72, z, 6.1, 3.08, .045, null, false, true, 'editorial-work-bay-window');
        for (const y of [1.2, 4.28]) b.box('steel', side * 5.25, y, z, 6.2, .08, .16);
        for (let k = 0; k <= 3; k++) b.box('steel', side * (2.2 + k * 2.03), 2.72, z, .065, 3.13, .13, null, true);
        for (let k = 0; k < 3; k++) b.box('oak', side * (3.2 + k * 2.03), .61, z - .11, 1.6, .032, .03, null, true);
        b.box('steel', side * 2.12, 2.15, z, .14, 4.3, .23, null, false, true, 'open-workshop-jamb');
      }
      b.box('steel', 0, 4.42, z, 16.6, .23, .22);
    }
    // The continuous left editorial bench has genuinely different work stations.
    for (const z of [-5.65, 0, 5.65]) {
      b.table(-4.9, z, 4.15, 4.9, .93, 'oak');
      b.box('bronze', -4.9, 1.018, z, 3.7, .018, .025, null, true);
      b.bench(-7.65, z, 2.0, true, false);
    }
    for (let k = 0; k < 6; k++) { b.paper(-5.8 + k * .055, 1.03 + k * .019, -5.55, 1.55, 2.1, true); b.box('oak', -3.75, 1.07 + k * .13, -6.05, 1.3, .07, 1.9, null, true); }
    for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
      b.paper(-5.85 + col * 1.82, 1.035, -.95 + row * 1.12, 1.52, .91, true);
      b.box('steel', -5.85 + col * 1.82, 1.05, -.42 + row * 1.12, 1.6, .018, .018, null, true);
    }
    sheet(b, -4.85, 2.35, 6.4, 3.4, 2.85, 0, 'paper', 'type');
    b.box('steel', -4.85, 1.07, 6.48, 3.6, .08, .18, null, true);
    label(b, '01 输入', -4.9, -7.5, 2.35, 3.0); label(b, '02 编辑', -4.9, 1.95, 2.35, 3.0); label(b, '03 预览', -4.9, 8.35, 2.35, 3.85);
    // Four real publishing modes live in distinct accessible pull-out template cases.
    const modes = ['日常模式', '三下乡', '寒假实践', '转载模式'];
    const drawers = new T.Group(); drawers.name = 'four-publishing-template-drawers'; b.root.add(drawers); const trays = [];
    [-6.35, -2.1, 2.1, 6.35].forEach((z, j) => {
      b.box('walnut', 6.5, 1.0, z, 3.25, 2.0, 3.15, null, false, true, 'publishing-template-case');
      b.box('masonry', 5.78, .12, z, 4.8, .24, 3.15, null, false, true, 'template-drawer-guard-plinth');
      protectWorkBay(b, 5.78, z, 4.8, 3.15, 2.1, 'protected-template-drawer-sweep');
      b.box('paper', 4.86, 1.26, z, .06, .37, 2.7, null, true);
      const tray = new T.Group(); tray.position.set(5.8, 1.38, z); drawers.add(tray); trays.push(tray);
      C.boxMesh(b, tray, 'oak', 0, 0, 0, 2.75, .085, 2.7);
      C.boxMesh(b, tray, 'paper', 0, .066, 0, 2.4, .025, 2.37);
      C.boxMesh(b, tray, 'bronze', -1.4, .03, 0, .085, .1, .75);
      for (let line = 0; line < 7; line++) C.boxMesh(b, tray, line === 0 ? 'clay' : 'ink', -.1, .084, -.85 + line * .26, 1.5 + (line % 2) * .25, .016, .023);
      label(b, modes[j], 6.45, z + 1.5, 3.05, 3.12);
    });
    C.motion(b, '四种刊发模板的编辑抽屉', drawers, v => trays.forEach((p, j) => { p.position.x = 5.8 - .92 * Math.max(0, Math.min(1, v * 1.6 - j * .2)); }), 'publishing-mode-selection');
    // Image preparation remains a small side shelf beside the input workflow.
    b.box('oak', 3.0, 1.15, -6.5, .62, .13, 3.3, null, false, true, 'local-image-preparation-shelf');
    for (let k = 0; k < 3; k++) b.box(['linen', 'ceramic', 'paper'][k], 3.0, 1.3 + k * .055, -7.2 + k * .67, .48, .024, .6, null, true);
    return C.finish(b, options, w, d, {
      role: '公众号三步排版与四种刊发模式工作坊', signY: 4.65,
      description: 'A three-northlight editorial workshop turns input, composition and proofing into successive work stations, opposite four genuine publishing-template cases and a compact local-image preparation shelf.',
      concept: '沿着采集文本、编排版面、校看预览的长桌走；右手四只模板抽屉决定真实刊发场景。',
      evidence: ['https://editor.maniforld.com/', 'https://editor.maniforld.com/step1'],
      observations: ['四模式为日常、三下乡、寒假实践和转载', '实际工作流为输入文本、编辑内容、生成预览', '另有本地图片压缩和格式转换工具'],
      phaseLabels: ['收集文本', '编排内容', '校看预览'], mechanism: '四种刊发模板抽屉向侧向编辑区依次展开'
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
