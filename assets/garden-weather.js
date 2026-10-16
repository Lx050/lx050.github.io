/* Local, bounded, world-space weather for Three.js r128. No external assets.
 * Render after the ordinary opaque scene: depth testing keeps walls/people in front.
 * A downward physical query uses the real roof geometry, including instanced tiles.
 * No screen flash, lighting pulse, audio, network access, or independent frame loop.
 */
(function (global) {
  'use strict';
  const MODES = ['clear', 'snow', 'rain', 'wind', 'storm'];
  function create(options) {
    const T = options.THREE, scene = options.scene, camera = options.camera, player = options.player;
    const groundAt = options.surfaceHeight || (() => 0);
    const getBuildings = typeof options.buildings === 'function' ? options.buildings : () => options.buildings || [];
    const root = new T.Group(); root.name = 'courtyard-weather'; scene.add(root);
    const MAX = 480, RADIUS = 14, HEIGHT = 10;
    const positions = new Float32Array(MAX * 3), lines = new Float32Array(MAX * 6);
    const states = Array.from({length: MAX}, () => ({x: 0, y: 0, z: 0, phase: 0, speed: 1, born: false}));
    let seed = 204050, mode = 'clear', wind = .65, elapsed = 0, disposed = false;
    let reduced = false, lightQuality = !!options.lightQuality, visibleCount = 0, count = 0, lastGround = 0;
    let shelterRays = 0, rayBudget = 0, shelterVersion = 0, lastShelterCheck = -100;
    let lastBuildingCount = -1, nearby = [], shelterCache = new Map(), modelCache = new WeakMap();
    let dynamicShelters = [], dynamicCache = new WeakMap(), dynamicRebuilds = 0, dynamicTriangleTests = 0;
    const center = new T.Vector3(), previousCenter = new T.Vector3(Infinity, Infinity, Infinity);
    const down = new T.Vector3(0, -1, 0), origin = new T.Vector3(), forward = new T.Vector3();
    const ray = new T.Raycaster(), instanceMatrix = new T.Matrix4(), worldMatrix = new T.Matrix4();
    const probeGeometry = new T.BufferGeometry();
    const probe = new T.Mesh(probeGeometry, new T.MeshBasicMaterial({side: T.DoubleSide}));
    const hits = [];
    function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
    function texture() {
      const size = 32, data = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const d = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
        const i = (y * size + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, (1 - d) * 3)));
      }
      const map = new T.DataTexture(data, size, size, T.RGBAFormat);
      map.magFilter = T.LinearFilter; map.minFilter = T.LinearFilter; map.needsUpdate = true;
      return map;
    }
    const map = texture(), snowGeometry = new T.BufferGeometry(), rainGeometry = new T.BufferGeometry();
    snowGeometry.setAttribute('position', new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage));
    rainGeometry.setAttribute('position', new T.BufferAttribute(lines, 3).setUsage(T.DynamicDrawUsage));
    const snowMaterial = new T.PointsMaterial({map, color: 0xedf3f3, size: .11, sizeAttenuation: true,
      transparent: true, opacity: .86, alphaTest: .08, depthTest: true, depthWrite: false, toneMapped: false, fog: true});
    const rainMaterial = new T.LineBasicMaterial({color: 0xb6d0d5, transparent: true, opacity: .49,
      depthTest: true, depthWrite: false, toneMapped: false, fog: true});
    const snow = new T.Points(snowGeometry, snowMaterial), rain = new T.LineSegments(rainGeometry, rainMaterial);
    snow.name = 'weather-snowflakes'; rain.name = 'weather-rain-streaks';
    snow.frustumCulled = rain.frustumCulled = false; root.add(snow, rain);
    const boltGeometry = new T.BufferGeometry(); boltGeometry.setAttribute('position', new T.BufferAttribute(new Float32Array(27), 3));
    const boltMaterial = new T.LineBasicMaterial({color: 0xa8bcc4, transparent: true, opacity: 0,
      depthTest: true, depthWrite: false, toneMapped: false, fog: true});
    const bolt = new T.Line(boltGeometry, boltMaterial); bolt.name = 'weather-distant-lightning';
    bolt.visible = false; bolt.frustumCulled = false; root.add(bolt);
    let boltAge = -1, nextBolt = 12;

    // Building navigation colliders intentionally omit roofs. Query the real render
    // geometry instead, and skip the hidden physical-query-only group altogether.
    // Each nearby building is indexed once into metre-space cells. Per-query work
    // tests only roof/wall pieces over that cell, never every triangle on the island.
    function poseKey(root) {
      let key = '';
      root.traverse(node => {
        if (node.name === 'physical-query-only' || node.name === 'physical-collider') return;
        const p = node.position, q = node.quaternion, s = node.scale;
        key += [p.x, p.y, p.z, q.x, q.y, q.z, q.w, s.x, s.y, s.z].map(v => Math.round(v * 1000)).join(',') + ';';
      });
      return key;
    }
    function buildShelter(building, pose) {
      const bins = new Map(), cellSize = 2;
      building.root.updateWorldMatrix(true, true);
      function visit(node) {
        if (node.name === 'physical-query-only' || node.name === 'physical-collider') return;
        if (node.isMesh && node.geometry && !node.userData.weatherIgnore) {
          const geometry = node.geometry;
          if (!geometry.boundingBox) geometry.computeBoundingBox();
          if (geometry.boundingBox) {
            const n = node.isInstancedMesh ? node.count : 1;
            for (let i = 0; i < n; i++) {
              if (node.isInstancedMesh) { node.getMatrixAt(i, instanceMatrix); worldMatrix.multiplyMatrices(node.matrixWorld, instanceMatrix); }
              else worldMatrix.copy(node.matrixWorld);
              const bounds = geometry.boundingBox.clone().applyMatrix4(worldMatrix);
              if (!Number.isFinite(bounds.max.y)) continue;
              const piece = {geometry, matrix: worldMatrix.clone(), bounds};
              const x0 = Math.floor(bounds.min.x / cellSize), x1 = Math.floor(bounds.max.x / cellSize);
              const z0 = Math.floor(bounds.min.z / cellSize), z1 = Math.floor(bounds.max.z / cellSize);
              // Defensive cap for accidental scenery attached to a building root.
              if ((x1 - x0 + 1) * (z1 - z0 + 1) > 4096) continue;
              for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
                const key = x + ':' + z; if (!bins.has(key)) bins.set(key, []); bins.get(key).push(piece);
              }
            }
          }
        }
        for (const child of node.children || []) visit(child);
      }
      visit(building.root);
      const record = {bins, cellSize, version: shelterVersion, pose: pose || poseKey(building.root)}; modelCache.set(building, record); return record;
    }
    // Weather-only articulated roofs opt in with:
    // {root, dynamic:true, meshes:()=>[physicalSkinMeshes], respectVisibility:false}.
    // Bounds and triangle heights come from CURRENT world transforms each update.
    // Hidden skins still shelter by default: skeleton view is a visual cutaway,
    // not physical demolition. Set respectVisibility:true to request the latter.
    function refreshDynamicShelters(buildings) {
      dynamicShelters = []; dynamicRebuilds = 0;
      for (const building of buildings) {
        if (!building.dynamic || !building.root) continue;
        building.root.updateWorldMatrix(true, true);
        let meshes = typeof building.meshes === 'function' ? building.meshes() : building.meshes;
        if (!meshes) { meshes = []; building.root.traverse(m => { if (m.isMesh) meshes.push(m); }); }
        const bounds = new T.Box3(), pieces = [];
        let pose = String(shelterVersion) + ':' + !!building.respectVisibility;
        for (const mesh of meshes) {
          if (!mesh?.isMesh || !mesh.geometry || mesh.userData.weatherIgnore) continue;
          if (building.respectVisibility) {
            let visible = true;
            for (let node = mesh; node; node = node.parent) if (!node.visible) { visible = false; break; }
            if (!visible) continue;
          }
          // Explicit meshes may be descendants with their own nested hinge pivots.
          mesh.updateWorldMatrix(true, false);
          const geometry = mesh.geometry, position = geometry.attributes.position;
          if (!position) continue;
          const index = geometry.index, count = mesh.isInstancedMesh ? mesh.count : 1;
          const geometryPose = geometry.uuid + ':' + position.version + ':' + (index?.version || 0) + ':' + geometry.drawRange.start + ':' + geometry.drawRange.count;
          // Recompute if authored vertices changed, not merely a hinge pose.
          if (!geometry.boundingBox || geometry.userData.weatherPositionVersion !== position.version) {
            geometry.computeBoundingBox(); geometry.userData.weatherPositionVersion = position.version;
          }
          for (let i = 0; i < count; i++) {
            if (mesh.isInstancedMesh) { mesh.getMatrixAt(i, instanceMatrix); worldMatrix.multiplyMatrices(mesh.matrixWorld, instanceMatrix); }
            else worldMatrix.copy(mesh.matrixWorld);
            const box = geometry.boundingBox.clone().applyMatrix4(worldMatrix);
            bounds.union(box); pieces.push({geometry, matrix: worldMatrix.clone()});
            // No rounding: instant and sub-millimetre hinge changes invalidate too.
            pose += '|' + mesh.uuid + ':' + i + ':' + geometryPose + ':' + worldMatrix.elements.join(',');
          }
        }
        if (bounds.isEmpty() || center.x < bounds.min.x - RADIUS - 2 || center.x > bounds.max.x + RADIUS + 2 || center.z < bounds.min.z - RADIUS - 2 || center.z > bounds.max.z + RADIUS + 2) continue;
        let cached = dynamicCache.get(building);
        if (!cached || cached.pose !== pose) {
          const bins = new Map(), vertices = [new T.Vector3(), new T.Vector3(), new T.Vector3()];
          let triangleCount = 0;
          for (const piece of pieces) {
            const g = piece.geometry, attr = g.attributes.position, index = g.index;
            const start = g.drawRange.start || 0, end = Math.min(index ? index.count : attr.count, start + g.drawRange.count);
            for (let i = start; i + 2 < end; i += 3) {
              for (let j = 0; j < 3; j++) vertices[j].fromBufferAttribute(attr, index ? index.getX(i + j) : i + j).applyMatrix4(piece.matrix);
              const [a, b, c] = vertices;
              const denominator = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
              // A vertical triangle has no finite area that can intercept snowfall.
              if (Math.abs(denominator) < 1e-12) continue;
              const triangle = {ax:a.x, ay:a.y, az:a.z, bx:b.x, by:b.y, bz:b.z,
                cx:c.x, cy:c.y, cz:c.z, inverse:1 / denominator,
                minX:Math.min(a.x,b.x,c.x), maxX:Math.max(a.x,b.x,c.x),
                minZ:Math.min(a.z,b.z,c.z), maxZ:Math.max(a.z,b.z,c.z)};
              triangleCount++;
              for (let x = Math.floor(triangle.minX / 2); x <= Math.floor(triangle.maxX / 2); x++) {
                for (let z = Math.floor(triangle.minZ / 2); z <= Math.floor(triangle.maxZ / 2); z++) {
                  const key = x + ':' + z; if (!bins.has(key)) bins.set(key, []); bins.get(key).push(triangle);
                }
              }
            }
          }
          cached = {pose, bounds, bins, triangleCount}; dynamicCache.set(building, cached); dynamicRebuilds++;
        }
        dynamicShelters.push(cached);
      }
    }
    function dynamicShelterAt(x, z, floor) {
      let top = floor;
      for (const roof of dynamicShelters) {
        const b = roof.bounds;
        if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z || b.max.y < top) continue;
        const triangles = roof.bins.get(Math.floor(x / 2) + ':' + Math.floor(z / 2));
        if (!triangles) continue;
        for (const t of triangles) {
          if (x < t.minX || x > t.maxX || z < t.minZ || z > t.maxZ) continue;
          dynamicTriangleTests++;
          const u = ((t.bz - t.cz) * (x - t.cx) + (t.cx - t.bx) * (z - t.cz)) * t.inverse;
          const v = ((t.cz - t.az) * (x - t.cx) + (t.ax - t.cx) * (z - t.cz)) * t.inverse;
          if (u >= -1e-9 && v >= -1e-9 && u + v <= 1 + 1e-9) top = Math.max(top, u * t.ay + v * t.by + (1 - u - v) * t.cy + .08);
        }
      }
      return top;
    }
    function selectNearby(force, buildings) {
      if (!force && elapsed - lastShelterCheck < .65 && buildings.length === lastBuildingCount) return;
      lastShelterCheck = elapsed; lastBuildingCount = buildings.length;
      nearby = buildings.filter(b => !b.dynamic && b.root && b.bounds && center.x > b.bounds.min.x - RADIUS - 2 && center.x < b.bounds.max.x + RADIUS + 2 && center.z > b.bounds.min.z - RADIUS - 2 && center.z < b.bounds.max.z + RADIUS + 2);
      for (const b of nearby) {
        const pose = poseKey(b.root), previous = modelCache.get(b);
        if (!previous || previous.version !== shelterVersion || previous.pose !== pose) {
          buildShelter(b, pose); shelterCache.clear();
        }
      }
      if (shelterCache.size > 2200) shelterCache.clear();
    }
    function staticShelterAt(x, z, exact) {
      const floor = groundAt(x, z);
      if (!nearby.length) return floor;
      // A bounded 20 cm cache avoids repeating expensive triangle intersections.
      // The real mesh query preserves open courts and gaps between roof wings.
      const gx = Math.floor(x * 5), gz = Math.floor(z * 5), key = gx + ':' + gz;
      const cached = shelterCache.get(key);
      if (!exact && cached !== undefined) return Math.max(floor, cached);
      let candidates = [];
      for (const b of nearby) {
        if (x < b.bounds.min.x - .12 || x > b.bounds.max.x + .12 || z < b.bounds.min.z - .12 || z > b.bounds.max.z + .12) continue;
        const indexed = modelCache.get(b), cell = indexed?.bins.get(Math.floor(x / 2) + ':' + Math.floor(z / 2));
        if (cell) candidates = candidates.concat(cell);
      }
      if (!candidates.length) return floor;
      if (rayBudget <= 0) return Infinity; // Unknown shelter is never treated as outdoors.
      rayBudget--; shelterRays++;
      let top = floor;
      origin.set(x, Math.max(160, floor + 120), z); ray.set(origin, down); ray.far = origin.y - floor + .1;
      for (const piece of candidates) {
        const b = piece.bounds;
        if (b.max.y <= top || x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
        probe.geometry = piece.geometry; probe.matrixWorld.copy(piece.matrix); hits.length = 0;
        ray.intersectObject(probe, false, hits);
        if (hits.length) top = Math.max(top, hits[0].point.y + .08);
      }
      shelterCache.set(key, top); return top;
    }
    function shelterAt(x, z) {
      return dynamicShelterAt(x, z, staticShelterAt(x, z));
    }
    // Deterministic, read-only geometry probe for QA. Refreshes dynamic poses even
    // when dt is zero; it cannot move a particle, a roof, or the player.
    function sampleShelter(x, z) {
      if (disposed || !Number.isFinite(x) || !Number.isFinite(z)) return null;
      // Selection follows the probe, not a stale player/camera position. Preserve
      // active selection and frame metrics; only derived geometry caches may warm.
      const previous = {x:center.x, z:center.z, nearby, dynamicShelters,
        lastShelterCheck, lastBuildingCount, rayBudget, shelterRays, dynamicRebuilds, dynamicTriangleTests};
      try {
        center.x = x; center.z = z;
        const buildings = getBuildings(); selectNearby(true, buildings); refreshDynamicShelters(buildings);
        rayBudget = Math.max(1, rayBudget);
        return dynamicShelterAt(x, z, staticShelterAt(x, z, true));
      } finally {
        center.x = previous.x; center.z = previous.z;
        nearby = previous.nearby; dynamicShelters = previous.dynamicShelters;
        lastShelterCheck = previous.lastShelterCheck; lastBuildingCount = previous.lastBuildingCount;
        rayBudget = previous.rayBudget; shelterRays = previous.shelterRays;
        dynamicRebuilds = previous.dynamicRebuilds; dynamicTriangleTests = previous.dynamicTriangleTests;
      }
    }
    function seedParticle(p, initial) {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * RADIUS;
      p.x = center.x + Math.cos(angle) * radius; p.z = center.z + Math.sin(angle) * radius;
      p.y = center.y + (initial ? random() * HEIGHT - 1.6 : HEIGHT - 1.7 + random());
      p.phase = random() * Math.PI * 2; p.speed = .65 + random() * .7; p.born = true;
    }
    function setMode(value) {
      if (!MODES.includes(value)) return false;
      if (mode === value) return true;
      mode = value; bolt.visible = false; boltAge = -1; nextBolt = elapsed + 12;
      for (const p of states) p.born = false;
      root.visible = mode !== 'clear'; snow.visible = mode === 'snow' || mode === 'wind'; rain.visible = mode === 'rain' || mode === 'storm';
      snow.name = mode === 'wind' ? 'weather-wind-seeds' : 'weather-snowflakes';
      snowMaterial.color.setHex(mode === 'wind' ? 0xc7c4a7 : 0xedf3f3);
      snowMaterial.size = mode === 'wind' ? .085 : .11;
      snowMaterial.opacity = mode === 'wind' ? .62 : .86;
      return true;
    }
    function invalidateShelter() { shelterVersion++; shelterCache.clear(); lastShelterCheck = -100; }
    function update(dt, state) {
      if (disposed) return;
      state = state || {}; dt = Number.isFinite(dt) ? Math.min(.06, Math.max(0, dt)) : 0;
      reduced = state.reduced === undefined ? reduced : !!state.reduced;
      lightQuality = state.lightQuality === undefined ? lightQuality : !!state.lightQuality;
      root.visible = mode !== 'clear' && state.enabled !== false;
      if (!root.visible) { visibleCount = count = 0; bolt.visible = false; return; }
      elapsed += dt; shelterRays = 0; dynamicTriangleTests = 0; rayBudget = lightQuality ? 12 : 24;
      // Center in the viewed space, between the visitor and the camera's look
      // direction. This makes the first selected snow immediately visible, even
      // when looking away from the visitor or standing high on a terrace.
      camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
      center.copy(player.position); center.x += forward.x * 3; center.z += forward.z * 3;
      center.y = Math.max(player.position.y + 1.6, Math.min(camera.position.y, player.position.y + 8));
      const jumped = previousCenter.distanceToSquared(center) > RADIUS * RADIUS;
      if (jumped) { shelterCache.clear(); for (const p of states) p.born = false; }
      const buildings = getBuildings();
      selectNearby(jumped, buildings); refreshDynamicShelters(buildings); previousCenter.copy(center);
      count = reduced ? (lightQuality ? 36 : 64) : mode === 'wind' ? (lightQuality ? 80 : 140) : (lightQuality ? 180 : MAX);
      visibleCount = 0; const wet = mode === 'rain' || mode === 'storm', windOnly = mode === 'wind';
      const motion = reduced ? 0 : dt, gust = reduced ? 0 : wind * (1 + .38 * Math.sin(elapsed * .7) + .2 * Math.sin(elapsed * 1.9));
      const dx = (wet ? .9 : windOnly ? 3.2 : .9) * gust, dz = .35 * gust;
      for (let i = 0; i < count; i++) {
        const p = states[i];
        if (!p.born) seedParticle(p, true);
        p.x += (dx + (wet ? 0 : Math.sin(elapsed + p.phase) * .18)) * motion;
        p.z += (dz + (wet ? 0 : Math.cos(elapsed * .7 + p.phase) * .14)) * motion;
        p.y -= (wet ? 11 : windOnly ? .12 : .82) * p.speed * motion;
        if ((p.x - center.x) ** 2 + (p.z - center.z) ** 2 > RADIUS ** 2 || p.y < center.y - 5 || p.y > center.y + HEIGHT + 2) seedParticle(p, false);
        const floor = shelterAt(p.x, p.z);
        if (p.y <= floor + .06) { if (Number.isFinite(floor)) seedParticle(p, false); continue; }
        if (!Number.isFinite(floor)) continue;
        const n = visibleCount++;
        positions[n * 3] = p.x; positions[n * 3 + 1] = p.y; positions[n * 3 + 2] = p.z;
        // Tail always points upwind/upwards and never crosses the hit surface.
        lines[n * 6] = p.x; lines[n * 6 + 1] = p.y; lines[n * 6 + 2] = p.z;
        const length = reduced ? .12 : .52 + p.speed * .17;
        lines[n * 6 + 3] = p.x - dx * length / 11; lines[n * 6 + 4] = p.y + length; lines[n * 6 + 5] = p.z - dz * length / 11;
      }
      snowGeometry.setDrawRange(0, visibleCount); rainGeometry.setDrawRange(0, visibleCount * 2);
      if (snow.visible) snowGeometry.attributes.position.needsUpdate = true;
      if (rain.visible) rainGeometry.attributes.position.needsUpdate = true;
      lastGround = groundAt(player.position.x, player.position.z);
      // A small distant line slowly fades in/out. Never alter scene exposure,
      // ambient lights, or the screen. At least 35 s between single events.
      if (mode === 'storm' && !reduced) {
        if (boltAge < 0 && elapsed >= nextBolt) {
          boltAge = 0; const a = boltGeometry.attributes.position;
          const x = center.x + forward.x * 70 + 15, z = center.z + forward.z * 70;
          for (let n = 0; n < 9; n++) a.setXYZ(n, x + Math.sin(n * 2.2) * 1.6, center.y + 33 - n * 1.8, z + Math.cos(n) * .6);
          a.needsUpdate = true; nextBolt = elapsed + 35 + random() * 20;
        }
        if (boltAge >= 0) { boltAge += dt; bolt.visible = boltAge < 1.8; boltMaterial.opacity = .22 * Math.sin(Math.min(1, boltAge / 1.8) * Math.PI); if (!bolt.visible) boltAge = -1; }
      } else { bolt.visible = false; boltAge = -1; nextBolt = Math.max(nextBolt, elapsed + 12); }
    }
    function inspect() { return {mode, wind, reducedMotion: reduced, lightQuality, particles: count, visibleParticles: visibleCount,
      maxParticles: MAX, nearbyShelters: nearby.length + dynamicShelters.length,
      dynamicShelters: dynamicShelters.length, dynamicTriangles: dynamicShelters.reduce((n,r)=>n+r.triangleCount,0),
      dynamicRebuilds, dynamicTriangleTests, shelterQueries: shelterRays, shelterCacheCells: shelterCache.size,
      groundY: lastGround, depthTest: snowMaterial.depthTest && rainMaterial.depthTest, lightningVisible: bolt.visible,
      lightningOpacity: boltMaterial.opacity, lightningMinInterval: 35, screenFlash: false}; }
    function dispose() {
      if (disposed) return; disposed = true; scene.remove(root);
      for (const resource of [snowGeometry, rainGeometry, boltGeometry, snowMaterial, rainMaterial, boltMaterial, map, probe.material, probeGeometry]) resource.dispose();
      shelterCache.clear(); nearby = []; modelCache = new WeakMap(); dynamicShelters = []; dynamicCache = new WeakMap();
    }
    root.visible = false; snow.visible = rain.visible = false;
    return Object.freeze({setMode, setWind(value) { wind = Math.max(0, Math.min(2, Number(value) || 0)); return wind; },
      update, inspect, sampleShelter, invalidateShelter, dispose, get root() { return root; }, get mode() { return mode; }});
  }
  global.CourtyardWeather = Object.freeze({create, modes: MODES.slice()});
})(window);
