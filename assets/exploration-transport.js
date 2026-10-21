/* Deterministic, renderer-independent sea / land / air locomotion.
 * Positions are feet positions. WALK is deliberately owned by the host walker.
 * All other motion, including dock transfers and take-off / landing, is swept.
 * A failed transition is atomic: neither position nor mode is changed.
 * create({ position, spawn, getSurface, isWater, withinBounds, blocked,
 *          docks: [{ id, land: { x, z }, water: { x, z } }], seaLevel? }).
 * getSurface returns { height, islandId?, kind?, thickness?, bottom? } or null;
 * maxY limits eligible support. blocked uses (x, feetY, z, radius, height).
 * setMode / land / boardBoat / disembark / recover return success booleans.
 * move and stop return detached snapshots; stop keeps pose and mode unchanged.
 * onMode receives (mode, snapshot).
 */
(function (global) {
  'use strict';
  const MODES = Object.freeze(['WALK', 'FLY', 'CAR', 'BOAT']);
  const EPS = 1e-6, MAX_DT = .1, MAX_STEP = .25, TIME_STEP = 1 / 120;
  const BODY = Object.freeze({
    WALK: Object.freeze({ radius: .38, height: 1.7, slope: .85 }),
    FLY: Object.freeze({ radius: 4.6, height: 2.8 }),
    CAR: Object.freeze({ radius: 2.55, height: 2.0, slope: .42 }),
    BOAT: Object.freeze({ radius: 3.35, height: 5.4 })
  });
  const RING = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [.70710678, .70710678], [-.70710678, .70710678], [.70710678, -.70710678], [-.70710678, -.70710678]];
  const finite = Number.isFinite;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const point = p => p && finite(p.x) && finite(p.z) && (p.y === undefined || finite(p.y));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const copy = p => ({ x: p.x, y: p.y, z: p.z });
  const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const approach = (a, b, amount) => a + clamp(b - a, -amount, amount);

  function create(options) {
    if (!options || !point(options.position) || !finite(options.position.y)) throw new TypeError('A finite shared position is required.');
    for (const name of ['getSurface', 'isWater', 'withinBounds', 'blocked']) if (typeof options[name] !== 'function') throw new TypeError(name + ' must be a function.');
    if (!point(options.spawn)) throw new TypeError('A finite dry-land spawn is required.');
    const position = options.position;
    const seaLevel = finite(options.seaLevel) ? options.seaLevel : 0;
    const minAltitude = seaLevel + 2;
    const maxAltitude = finite(options.maxAltitude) ? options.maxAltitude : 420;
    if (maxAltitude < minAltitude + 3) throw new RangeError('The flight ceiling must be above sea level.');
    const boatY = seaLevel + .55;
    const spawn = { x: options.spawn.x, z: options.spawn.z };
    const docks = (Array.isArray(options.docks) ? options.docks : []).filter(d => d && point(d.land) && point(d.water)).map(d => ({ id: d.id, land: { ...d.land }, water: { ...d.water } }));
    const velocity = { x: 0, y: 0, z: 0 };
    let mode = 'WALK', heading = 0, forwardSpeed = 0, dockId = null, reason = null, lastCollision = null;

    function bounds(x, z, radius = 0) {
      return finite(x) && finite(z) && RING.every(([dx, dz]) => options.withinBounds(x + dx * radius, z + dz * radius));
    }
    function surface(x, z, maxY) {
      const s = options.getSurface(x, z, maxY);
      if (!s || !finite(s.height) || s.kind === 'water' || s.kind === 'sea' || s.height < seaLevel - EPS) return null;
      if (finite(maxY) && s.height > maxY + EPS) return null;
      return s;
    }
    function blocked(p, body) {
      return !!options.blocked(p.x, p.y + .025, p.z, body.radius, body.height);
    }
    // Full footprint support, not merely a dry centre, keeps vehicles off cliffs.
    function ground(x, z, body = BODY.WALK, maxY) {
      if (!bounds(x, z, body.radius)) return null;
      const s = surface(x, z, maxY);
      if (!s) return null;
      let high = s.height, low = s.height;
      for (const [dx, dz] of RING.slice(1)) {
        const t = surface(x + dx * body.radius, z + dz * body.radius, maxY);
        if (!t || (s.islandId != null && t.islandId != null && s.islandId !== t.islandId)) return null;
        high = Math.max(high, t.height); low = Math.min(low, t.height);
        if (Math.abs(t.height - s.height) > body.radius * body.slope + .035) return null;
      }
      if (high - low > body.radius * 2 * body.slope + .035) return null;
      const p = { x, y: high, z };
      if (blocked(p, body)) return null;
      return { ...s, height: high };
    }
    function stable(body = BODY.WALK) {
      if (!validPosition()) return null;
      const s = ground(position.x, position.z, body, position.y + .45);
      return s && Math.abs(position.y - s.height) <= .45 ? s : null;
    }
    function validPosition() { return finite(position.x) && finite(position.y) && finite(position.z); }
    function clearFlight(p, takingOff = false, body = BODY.FLY) {
      if (!point(p) || !finite(p.y) || p.y > maxAltitude + EPS || (!takingOff && p.y < minAltitude - EPS) || !bounds(p.x, p.z, body.radius) || blocked(p, body)) return false;
      for (const [dx, dz] of RING) {
        const s = surface(p.x + dx * body.radius, p.z + dz * body.radius);
        if (!s) continue;
        // Floating platforms may be flown beneath; their finite slab, not an
        // imaginary column down to the sea, is solid. Optional bottom overrides
        // the default 26-metre slab used for sky / floating surfaces.
        const floating = s.kind === 'sky' || s.kind === 'floating' || s.floating === true;
        const bottom = finite(s.bottom) ? s.bottom : s.height - (finite(s.thickness) ? Math.max(0, s.thickness) : 26);
        if (floating && p.y + body.height < bottom - .06) continue;
        if (p.y < s.height + (takingOff ? -.025 : .06)) return false;
      }
      return true;
    }
    function clearBoat(p) {
      return bounds(p.x, p.z, BODY.BOAT.radius) && !!options.isWater(p.x, p.z, BODY.BOAT.radius) && !blocked({ x: p.x, y: boatY, z: p.z }, BODY.BOAT);
    }
    function zero() { velocity.x = velocity.y = velocity.z = forwardSpeed = 0; }
    function stop() { zero(); return snapshot(); }
    function snapshot() {
      return { mode, position: copy(position), velocity: { ...velocity }, speed: Math.hypot(velocity.x, velocity.y, velocity.z), heading, dockId, reason, collision: lastCollision, minAltitude, maxAltitude };
    }
    function reject(code, message) {
      reason = code;
      if (typeof options.onNotice === 'function') options.onNotice(message, code);
      return false;
    }
    function commit(next, p, dock = null) {
      if (p) { position.x = p.x; position.y = p.y; position.z = p.z; }
      mode = next; dockId = dock; zero(); reason = null; lastCollision = null;
      if (typeof options.onMode === 'function') options.onMode(mode, snapshot());
      return true;
    }
    // Returns the last safe point without mutating the shared position.
    function sweep(from, to, allowed) {
      const count = Math.max(1, Math.ceil(distance(from, to) / MAX_STEP));
      let last = copy(from);
      for (let i = 1; i <= count; i++) {
        const t = i / count, p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, z: from.z + (to.z - from.z) * t };
        if (!allowed(p, last)) return { complete: false, position: last };
        last = p;
      }
      return { complete: true, position: last };
    }
    function dryRoute(from, target, body) {
      const destination = ground(target.x, target.z, body);
      if (!destination) return false;
      return sweep(from, { x: target.x, y: destination.height, z: target.z }, (p, prior) => {
        const s = ground(p.x, p.z, body, prior.y + .3);
        if (!s || Math.abs(s.height - prior.y) > Math.hypot(p.x - prior.x, p.z - prior.z) * body.slope + .045) return false;
        p.y = s.height;
        return true;
      }).complete;
    }
    function dockPoints(d) {
      const s = ground(d.land.x, d.land.z, BODY.WALK);
      const land = s && { x: d.land.x, y: s.height, z: d.land.z };
      const water = { x: d.water.x, y: boatY, z: d.water.z };
      return land && clearBoat(water) ? { land, water } : null;
    }
    // An authored dock is the only land / water bridge. Its entire raised
    // transfer corridor and descent are checked before changing mode.
    function dockTransfer(land, water) {
      const y = Math.max(land.y, water.y) + .1;
      const a = { ...land, y }, b = { ...water, y };
      const allowed = p => bounds(p.x, p.z, BODY.WALK.radius) && !blocked(p, BODY.WALK) && RING.every(([dx, dz]) => {
        const s = surface(p.x + dx * BODY.WALK.radius, p.z + dz * BODY.WALK.radius);
        return !s || p.y >= s.height - .025;
      });
      return sweep(land, a, allowed).complete && sweep(a, b, allowed).complete && sweep(b, water, allowed).complete;
    }
    function candidates(id, anchor) {
      return docks.filter(d => id === undefined || id === null || d.id === id).slice().sort((a, b) => Math.hypot(position.x - a[anchor].x, position.z - a[anchor].z) - Math.hypot(position.x - b[anchor].x, position.z - b[anchor].z));
    }
    function boardBoat(id) {
      if (mode === 'BOAT') return true;
      if ((mode !== 'WALK' && mode !== 'CAR') || !stable(mode === 'CAR' ? BODY.CAR : BODY.WALK)) return reject('dock-ground-required', '请先在码头附近安全落地，再登船。');
      const support = ground(position.x, position.z, BODY.WALK, position.y + .45);
      const departure = support && { x: position.x, y: support.height, z: position.z };
      if (!departure || !sweep(position, departure, p => clearFlight(p, true, BODY.WALK)).complete) return reject('dock-ground-required', '请先在码头附近安全下车，再登船。');
      for (const d of candidates(id, 'land')) {
        const p = dockPoints(d);
        if (!p || Math.min(distance(position, p.land), distance(position, p.water)) > 18) continue;
        if (!dryRoute(departure, p.land, BODY.WALK) || !dockTransfer(p.land, p.water)) continue;
        return commit('BOAT', p.water, d.id ?? null);
      }
      return reject('dock-unreachable', '请靠近可通行的码头登船（18 米内）。');
    }
    function disembark(id) {
      if (mode !== 'BOAT') return reject('not-aboard', '当前没有乘船。');
      for (const d of candidates(id, 'water')) {
        const p = dockPoints(d);
        if (!p || distance(position, p.water) > 24) continue;
        if (!sweep(position, p.water, clearBoat).complete || !dockTransfer(p.land, p.water)) continue;
        return commit('WALK', p.land);
      }
      return reject('dock-return-required', '请将船驶回码头附近（24 米内），再上岸。');
    }
    function land() {
      if (mode !== 'FLY') return mode === 'BOAT' ? disembark() : setMode('WALK');
      // Only directly beneath the flyer, never the nearest island across water.
      const s = ground(position.x, position.z, { ...BODY.FLY, slope: BODY.WALK.slope }, position.y + .025);
      const walking = ground(position.x, position.z, BODY.WALK, position.y + .025);
      if (!s || !walking) return reject('no-local-landing', '下方没有足够开阔的安全陆地，请飞到岛屿或平台上方再降落。');
      // Approach with the entire wing envelope clear, then fold the glider and
      // descend in the walking body. A broad wing must not leave feet hovering
      // at its uphill support height after switching back to WALK.
      const approach = { x: position.x, y: Math.min(position.y, s.height + .07), z: position.z };
      const target = { x: position.x, y: walking.height, z: position.z };
      if (!sweep(position, approach, p => clearFlight(p, true)).complete || !sweep(approach, target, p => clearFlight(p, true, BODY.WALK)).complete) return reject('landing-obstructed', '降落路径被建筑或地形挡住，请换一个位置。');
      return commit('WALK', target);
    }
    function setMode(next) {
      next = typeof next === 'string' ? next.toUpperCase() : '';
      if (!MODES.includes(next)) return reject('unknown-mode', '无法识别这个移动方式。');
      if (next === mode) {
        // Same-mode requests are not a loophole for creating an ocean walker.
        if (mode === 'WALK' && !stable()) return reject('unsafe-ground', '当前位置不能安全步行，请回到陆地。');
        return true;
      }
      if (next === 'BOAT') return boardBoat();
      if (next === 'WALK') {
        if (mode === 'FLY') return land();
        if (mode === 'BOAT') return disembark();
        const s = stable(BODY.CAR) && ground(position.x, position.z, BODY.WALK, position.y + .45);
        const target = s && { x: position.x, y: s.height, z: position.z };
        return target && sweep(position, target, p => clearFlight(p, true, BODY.WALK)).complete ? commit('WALK', target) : reject('unsafe-ground', '这里不适合下车，请回到平稳陆地。');
      }
      if (next === 'CAR') {
        if (mode !== 'WALK') return reject('car-ground-required', '请先安全落地或上岸，再使用陆地载具。');
        const s = stable() && ground(position.x, position.z, BODY.CAR, position.y + BODY.CAR.radius * BODY.CAR.slope + .45);
        return s ? commit('CAR', { x: position.x, y: s.height, z: position.z }) : reject('car-clearance', '这里太窄、太陡或靠近水面，请移到开阔陆地。');
      }
      if (mode !== 'WALK' && mode !== 'CAR') return reject('takeoff-ground-required', '请先回到陆地，再起飞。');
      if (!stable(mode === 'CAR' ? BODY.CAR : BODY.WALK)) return reject('takeoff-ground-required', '请先站稳在安全陆地上，再起飞。');
      const target = { x: position.x, y: Math.max(minAltitude, position.y + 2.2), z: position.z };
      if (!clearFlight(target) || !sweep(position, target, p => clearFlight(p, true, BODY[mode])).complete) return reject('takeoff-obstructed', '头顶空间不足，无法安全起飞。');
      return commit('FLY', target);
    }
    function recover() {
      const s = ground(spawn.x, spawn.z, BODY.WALK);
      if (!s) return reject('spawn-obstructed', '出生点暂时无法安全进入。');
      heading = 0;
      return commit('WALK', { x: spawn.x, y: s.height, z: spawn.z });
    }
    function inputValues(input) {
      input = input || {};
      let x = finite(input.x) ? clamp(input.x, -1, 1) : 0, z = finite(input.z) ? clamp(input.z, -1, 1) : 0;
      const length = Math.hypot(x, z);
      if (length > 1) { x /= length; z /= length; }
      return { x, z, up: finite(input.up) ? clamp(input.up, -1, 1) : 0, amount: Math.min(1, length), sprint: input.sprint === true };
    }
    function updateVelocity(h, input) {
      if (mode === 'FLY') {
        const speed = input.sprint ? 150 : 90, lift = input.sprint ? 70 : 44, ease = 1 - Math.exp(-5 * h);
        const targets = { x: input.x * speed, z: input.z * speed, y: input.up * lift };
        const length = Math.hypot(targets.x, targets.y, targets.z);
        if (length > speed) for (const axis of ['x', 'y', 'z']) targets[axis] *= speed / length;
        for (const axis of ['x', 'y', 'z']) velocity[axis] += (targets[axis] - velocity[axis]) * ease;
        if (input.amount > .01) heading = Math.atan2(input.x, input.z);
        return;
      }
      const car = mode === 'CAR', maximum = car ? (input.sprint ? 58 : 38) : (input.sprint ? 46 : 30);
      let alignment = 1;
      if (input.amount > .01) {
        const delta = angleDelta(heading, Math.atan2(input.x, input.z));
        const turn = car ? 1.9 / (1 + forwardSpeed / 48) : .8 / (1 + forwardSpeed / 65);
        heading += clamp(delta, -turn * h, turn * h);
        alignment = Math.max(.12, Math.cos(delta));
      }
      const target = maximum * input.amount * alignment;
      forwardSpeed = approach(forwardSpeed, target, h * (target > forwardSpeed ? (car ? 18 : 7) : (car ? 25 : 4.5)));
      const grip = 1 - Math.exp(-(car ? 12 : 1.8) * h);
      velocity.x += (Math.sin(heading) * forwardSpeed - velocity.x) * grip;
      velocity.z += (Math.cos(heading) * forwardSpeed - velocity.z) * grip;
      velocity.y = 0;
    }
    function move(dt, rawInput) {
      if (!validPosition()) { recover(); return snapshot(); }
      if (mode === 'WALK') return snapshot();
      if (!finite(dt) || dt <= 0) return snapshot();
      const input = inputValues(rawInput), duration = Math.min(MAX_DT, dt), count = Math.max(1, Math.ceil(duration / TIME_STEP)), h = duration / count;
      lastCollision = null;
      // Catch invalid external teleports before trying to integrate from them.
      if ((mode === 'CAR' && !stable(BODY.CAR)) || (mode === 'BOAT' && (!clearBoat(position) || Math.abs(position.y - boatY) > .2)) || (mode === 'FLY' && !clearFlight(position))) { recover(); reason = 'invalid-position-recovered'; return snapshot(); }
      for (let step = 0; step < count; step++) {
        updateVelocity(h, input);
        const from = copy(position), target = { x: from.x + velocity.x * h, y: from.y + velocity.y * h, z: from.z + velocity.z * h };
        if (mode === 'FLY') {
          target.y = clamp(target.y, minAltitude, maxAltitude);
          if ((target.y <= minAltitude + EPS && velocity.y < 0) || (target.y >= maxAltitude - EPS && velocity.y > 0)) velocity.y = 0;
        }
        const allowed = mode === 'FLY' ? p => clearFlight(p) : mode === 'BOAT' ? clearBoat : (p, prior) => {
          const s = ground(p.x, p.z, BODY.CAR, prior.y + .3);
          if (!s || Math.abs(s.height - prior.y) > Math.hypot(p.x - prior.x, p.z - prior.z) * BODY.CAR.slope + .025) return false;
          p.y = s.height;
          return true;
        };
        const result = sweep(from, target, allowed);
        position.x = result.position.x; position.y = mode === 'BOAT' ? boatY : result.position.y; position.z = result.position.z;
        if (!result.complete) { lastCollision = mode === 'CAR' ? 'land-obstacle' : mode === 'BOAT' ? 'water-obstacle' : 'air-obstacle'; zero(); break; }
      }
      return snapshot();
    }

    if (!ground(spawn.x, spawn.z, BODY.WALK)) throw new RangeError('Spawn must have dry, supported, unblocked walking clearance.');
    const initial = stable();
    if (initial) position.y = initial.height;
    else { const s = ground(spawn.x, spawn.z, BODY.WALK); position.x = spawn.x; position.y = s.height; position.z = spawn.z; }
    return Object.freeze({ setMode, move, stop, recover, land, boardBoat, disembark, snapshot });
  }
  const api = Object.freeze({ create, MODES, BODY, MAX_DT, MAX_STEP });
  global.CourtyardExplorationTransport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
