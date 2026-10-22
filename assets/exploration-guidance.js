/* Renderer-independent destination guidance. This never moves a player, changes
 * a transport mode, finds a route, or owns a level objective. The host supplies
 * its actual rendered support as `surface`, and camera yaw (0 looks along -Z).
 * A selection stores identity, not a stale dock endpoint. All returned records
 * are detached. Distances are metres; verticalDistance is target Y minus feet Y.
 * create({geography, places?, docks?}) -> select / clear / selected / resolve /
 * describe({position,yaw,mode,surface}) / nearestDock({position,mode,surface}). */
(function (global) {
  'use strict';
  const MODES = ['WALK', 'CAR', 'BOAT', 'FLY'];
  const COMPASS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const RELATIVE = ['前方', '右前方', '右侧', '右后方', '后方', '左后方', '左侧', '左前方'];
  const ARRIVAL_RADIUS = 12, HEIGHT_TOLERANCE = 3, SUPPORT_TOLERANCE = .6;
  const DISCLAIMER = '直线方向参考，不是自动寻路；请避开建筑、岸线与高差。';
  const finite = Number.isFinite;
  const point = p => !!p && finite(p.x) && finite(p.y) && finite(p.z);
  const copy = p => ({x:p.x, y:p.y, z:p.z});
  const modeFor = value => value == null ? 'WALK' : typeof value === 'string' && MODES.includes(value.toUpperCase()) ? value.toUpperCase() : null;
  const sector = angle => ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  const supportHeight = s => finite(s?.height) ? s.height : finite(s?.y) ? s.y : null;
  function formatDistance(distance) {
    if (!finite(distance) || distance < 0) return '距离待确认';
    if (distance === 0) return '0 m';
    if (distance < 1) return '<1 m';
    return distance >= 1000 ? (distance / 1000).toFixed(1) + ' km' : Math.round(distance) + ' m';
  }
  function create(options = {}) {
    const geography = options.geography || global.CourtyardExplorationGeography;
    if (!geography || !Array.isArray(geography.islands)) throw new TypeError('Authored geography is required.');
    const seaLevel = finite(geography.SEA_Y) ? geography.SEA_Y : 0;
    const islands = new Map(geography.islands.map(i => [i.id, {id:i.id, name:i.name, kind:i.kind}]));
    const places = new Map(), indices = new Map(), docks = new Map();
    for (const p of options.places || geography.places || []) {
      const endpoint = p?.spawn || p;
      if (!p || typeof p.id !== 'string' || !point(endpoint) || !islands.has(p.islandId)) continue;
      const record = {id:p.id, index:p.index, title:p.title, islandId:p.islandId, point:copy(endpoint)};
      places.set(record.id, record);
      if (Number.isInteger(record.index)) indices.set(record.index, record.id);
    }
    for (const d of options.docks || geography.docks || []) {
      if (!d || typeof d.id !== 'string' || !point(d.land) || !point(d.water) || islands.get(d.islandId)?.kind !== 'land') continue;
      docks.set(d.id, {id:d.id, islandId:d.islandId, land:copy(d.land), water:copy(d.water)});
    }
    let selection = null;
    const dockTitle = d => islands.get(d.islandId).name + '码头';
    function selected() { return selection ? {...selection} : null; }
    function select(target) {
      const id = typeof target === 'number' ? indices.get(target) : target;
      const p = places.get(id), d = docks.get(id);
      if (!p && !d) return false; // An invalid click must not discard a valid mark.
      selection = p ? {kind:'place', id:p.id, index:p.index, title:p.title, islandId:p.islandId} :
        {kind:'dock', id:d.id, title:dockTitle(d), islandId:d.islandId};
      return true;
    }
    function clear() { selection = null; }
    function resolve(value = 'WALK') {
      const mode = modeFor(value);
      if (!selection || !mode) return null;
      const island = islands.get(selection.islandId), p = places.get(selection.id);
      // A boat approaches a building's island at its dock, never at the inland
      // building point. Disembarking restores the selected entrance automatically.
      const dock = selection.kind === 'dock' ? docks.get(selection.id) : mode === 'BOAT' ? [...docks.values()].find(d => d.islandId === selection.islandId) : null;
      const endpointKind = dock ? mode === 'BOAT' ? 'water' : 'land' : 'entrance';
      const endpoint = dock ? dock[endpointKind] : p.point;
      return {...selection, ...copy(endpoint), destinationKind:selection.kind, endpointKind,
        regionName:island.name, regionKind:island.kind, waypointTitle:dock ? dockTitle(dock) : p.title + '入口',
        viaDockId:selection.kind === 'place' && dock ? dock.id : null,
        dockId:dock?.id || null, requiresFlight:island.kind === 'sky'};
    }
    function supportedIsland(position, surface) {
      const height = supportHeight(surface), island = islands.get(surface?.islandId);
      return island && surface.kind !== 'water' && surface.kind !== 'sea' && height !== null && height > seaLevel + .08 &&
        Math.abs(position.y - height) <= SUPPORT_TOLERANCE ? island : null;
    }
    function nearestDock(context = {}) {
      const {position, surface} = context, mode = modeFor(context.mode);
      if (!point(position) || !mode) return null;
      const local = mode === 'WALK' || mode === 'CAR' ? supportedIsland(position, surface) : null;
      if ((mode === 'WALK' || mode === 'CAR') && (!local || local.kind !== 'land')) return null;
      const side = mode === 'BOAT' ? 'water' : 'land';
      let best = null, distance = Infinity;
      for (const d of docks.values()) {
        if (local && d.islandId !== local.id) continue;
        const next = Math.hypot(position.x - d[side].x, position.z - d[side].z);
        if (next < distance) { best = d; distance = next; }
      }
      return best ? {id:best.id, islandId:best.islandId, title:dockTitle(best), land:copy(best.land), water:copy(best.water),
        ...copy(best[side]), endpointKind:side, distance} : null;
    }
    function instructionFor(target, mode, state) {
      const {arrived, atWaypoint, sameIsland, groundedIsland, horizontalDistance, verticalDistance} = state;
      if (mode === 'BOAT') {
        if (target.requiresFlight) return '高空目的地不能乘船直达 · 先靠近码头，B 上岸，再从开阔陆地 F 起飞。';
        if (target.viaDockId) return (atWaypoint ? '已到' : '先驶向') + target.waypointTitle +
          (atWaypoint ? '水侧附近 · B 上岸后，再步行或用车前往建筑入口。' : '水侧 · 沿可通行水面绕开岛岸，靠近后 B 上岸，再前往建筑入口。');
        return arrived ? '已到码头水侧附近 · B 上岸；若通道受阻，请沿水面调整位置。' :
          '驶向码头水侧 · 沿可通行水面绕开岛岸，靠近后 B 上岸；船不能驶入陆地。';
      }
      if (mode === 'FLY') {
        if (target.requiresFlight && verticalDistance > HEIGHT_TOLERANCE) return '高空目的地 · 从云屿侧面升至平台上方，勿从底部穿入；在开阔处 F 安全落地。';
        if (verticalDistance > HEIGHT_TOLERANCE) return '目标仍高于当前位置 · 绕开地形与建筑，从开阔侧面升至陆地上方，再 F 安全落地。';
        return (target.requiresFlight ? '高空目的地 · ' : horizontalDistance <= ARRIVAL_RADIUS ? '已到目的地上方附近 · ' : '飞向目的地上方 · ') +
          '避开建筑，在开阔陆地或平台上方 F 安全落地，再步行到' + (target.kind === 'dock' ? '码头 B 登船。' : '入口。');
      }
      if (arrived) {
        if (target.kind === 'dock') return mode === 'CAR' ? '已到码头附近 · 在岸上平地 V 下车，再步行到码头 B 登船。' :
          '已到码头陆侧附近 · B 登船；若通道受阻，请在陆侧调整位置。';
        return mode === 'CAR' ? '已到入口附近 · V 安全下车，再步行进入关卡；也可直接阅读。' :
          '已到入口附近 · E 进入关卡，或直接自由阅读。';
      }
      if (target.requiresFlight && !sameIsland) return '高空目的地 · 从开阔陆地 F 起飞，升至云屿平台上方，再安全落地；陆行车与船不能跨空抵达。';
      if (!groundedIsland) return '先在安全陆地站稳，再继续前往；直线标记不代表脚下存在可走道路。';
      if (!sameIsland) return groundedIsland.kind === 'sky' ? '不同岛屿 · 从开阔处 F 起飞，抵达目标上方后安全落地；云屿没有码头。' :
        '跨海目的地 · 可在开阔陆地 F 起飞，或先到本岛码头 B 登船；步行与陆行车不能跨海。';
      if (target.kind === 'dock') return mode === 'CAR' ? '同岛码头 · 沿开阔道路驶向岸边，在平地 V 下车，再步行到码头 B 登船；不要驾车驶上栈桥。' :
        '同岛码头 · 沿岸上道路走到码头陆侧，再 B 登船；不要走入海面。';
      return mode === 'CAR' ? '同岛目的地 · 沿开阔道路驾驶，入口附近 V 下车后步行；遇建筑请绕行。' :
        '同岛目的地 · 沿大道与支路步行到入口；遇建筑或高差请绕行。';
    }
    function describe(context = {}) {
      const {position, surface} = context, mode = modeFor(context.mode), target = resolve(mode);
      if (!target || !point(position) || !mode || context.yaw != null && !finite(context.yaw)) return null;
      const yaw = context.yaw || 0, dx = target.x - position.x, dz = target.z - position.z;
      const horizontalDistance = Math.hypot(dx, dz), verticalDistance = target.y - position.y;
      const angle = Math.atan2(dx, -dz), relative = Math.atan2(Math.sin(angle + yaw), Math.cos(angle + yaw));
      const height = supportHeight(surface), groundedIsland = supportedIsland(position, surface);
      const sameIsland = surface?.islandId === target.islandId;
      const horizontalNear = horizontalDistance <= ARRIVAL_RADIUS, verticalNear = Math.abs(verticalDistance) <= HEIGHT_TOLERANCE;
      const drySupport = surface?.kind !== 'water' && surface?.kind !== 'sea' && height !== null && height > seaLevel + .08 && height <= position.y + SUPPORT_TOLERANCE;
      const inWater = !drySupport && typeof geography.isWater === 'function' && geography.isWater(position.x, position.z);
      const atWaypoint = horizontalNear && verticalNear && (target.endpointKind === 'water' ? mode === 'BOAT' && inWater :
        (mode === 'WALK' || mode === 'CAR') && groundedIsland?.id === target.islandId);
      // Reaching a transfer dock is not reaching a building. A flyer must land.
      const arrived = atWaypoint && !target.viaDockId;
      const altitudeCue = verticalNear ? '高度接近 · 高差 ' + formatDistance(Math.abs(verticalDistance)) :
        (verticalDistance > 0 ? '目标高出你 ' : '目标低于你 ') + formatDistance(Math.abs(verticalDistance));
      const state = {arrived, atWaypoint, sameIsland, groundedIsland, horizontalDistance, verticalDistance};
      return {...target, mode, distance:horizontalDistance, horizontalDistance, verticalDistance,
        distance3D:Math.hypot(horizontalDistance, verticalDistance), distanceText:formatDistance(horizontalDistance),
        bearing:horizontalDistance < 1e-6 ? '水平重合' : COMPASS[sector(angle)], relative,
        relativeLabel:horizontalDistance < 1e-6 ? '水平已对齐' : RELATIVE[sector(relative)], altitudeCue,
        sameIsland, grounded:!!groundedIsland, currentRegionName:groundedIsland?.name || null,
        arrived, atWaypoint, instruction:instructionFor(target, mode, state), disclaimer:DISCLAIMER,
        horizontalRadius:ARRIVAL_RADIUS, heightTolerance:HEIGHT_TOLERANCE};
    }
    return Object.freeze({select, clear, selected, resolve, describe, nearestDock});
  }
  const api = Object.freeze({create, formatDistance, version:'1.0.0'});
  global.CourtyardExplorationGuidance = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
