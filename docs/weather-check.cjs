// CPU simulation only: renderer pixels and WebGL performance require separate visual QA.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.resolve(__dirname,'..'),T=require(path.join(base,'vendor/three.min.js'));

const box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(base,'assets/garden-weather.js'),'utf8'),box);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1.7,.1,200),player=new T.Group();camera.position.set(0,2.7,6.5);camera.lookAt(0,1.6,0);camera.updateMatrixWorld();scene.add(player);
const house=new T.Group(),roof=new T.Mesh(new T.BoxGeometry(8,.25,8),new T.MeshBasicMaterial());roof.position.y=4;house.add(roof);scene.add(house);scene.updateMatrixWorld(true);
const b={root:house,bounds:new T.Box3().setFromObject(house)};const w=box.window.CourtyardWeather.create({THREE:T,scene,camera,player,buildings:()=>[b],surfaceHeight:()=>0});
assert(w.setMode('snow'));for(let i=0;i<150;i++)w.update(1/60,{});
let snow=w.root.children[0],a=snow.geometry.attributes.position.array,n=snow.geometry.drawRange.count,under=0;for(let i=0;i<n;i++)if(Math.abs(a[i*3])<3.8&&Math.abs(a[i*3+2])<3.8&&a[i*3+1]<4.1)under++;
assert(n>50,'visible snow');assert(!under,'no snow below roof');assert(w.inspect().depthTest);
let result=[{name:'snow / real-roof shelter',passed:true,...w.inspect()}];
// Moving roofs invalidate their own indexed shelters, even after an action has begun.
roof.position.y=7;
for(let i=0;i<90;i++)w.update(1/60,{});
a=snow.geometry.attributes.position.array;n=snow.geometry.drawRange.count;under=0;
for(let i=0;i<n;i++)if(Math.abs(a[i*3])<3.8&&Math.abs(a[i*3+2])<3.8&&a[i*3+1]<7.1)under++;
assert.equal(under,0,'moving roof pose refreshes shelter');
result.push({name:'moving roof shelter refresh',passed:true,particlesBelowRoof:under});
w.setMode('rain');for(let i=0;i<50;i++)w.update(1/60,{lightQuality:true});assert(w.inspect().particles===180);assert(w.root.children[1].geometry.drawRange.count>20);result.push({name:'low-quality rain',passed:true,...w.inspect()});
w.setMode('snow');w.update(1/60,{reduced:true,lightQuality:false});for(let i=0;i<100;i++)w.update(1/60,{reduced:true});const frozen=Array.from(snow.geometry.attributes.position.array.slice(0,snow.geometry.drawRange.count*3));w.update(1/60,{reduced:true});assert.deepStrictEqual(Array.from(snow.geometry.attributes.position.array.slice(0,snow.geometry.drawRange.count*3)),frozen);assert(w.inspect().particles===64);result.push({name:'reduced-motion static flakes',passed:true,...w.inspect()});
w.setMode('storm');for(let i=0;i<1000;i++)w.update(1/60,{reduced:true});assert(!w.inspect().lightningVisible);let flashes=0,prior=false,max=0;for(let i=0;i<7000;i++){w.update(1/60,{reduced:false});let s=w.inspect();if(s.lightningVisible&&!prior)flashes++;prior=s.lightningVisible;max=Math.max(max,s.lightningOpacity);}assert(flashes<4);assert(max<=.22);result.push({name:'slow distant lightning only',passed:true,flashes,maxOpacity:max});
w.setMode('clear');w.update(0);assert(!w.root.visible);w.dispose();assert(!scene.children.includes(w.root));

{
const context={window:{THREE:T},console};
for(const file of ['architecture.js','content-core.js','rubbing-detail.js','proof-detail.js','workshop-detail.js','content-literary.js','moon-snow-garden.js','courtyard-runtime.js','garden-weather.js'])vm.runInNewContext(fs.readFileSync(path.join(base,'assets',file),'utf8'),context);
const b=context.window.CourtyardArchitecture.build({THREE:T,index:20,title:'月雪',zone:2});const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1.7,.1,200),player=new T.Group();scene.add(b.root,player);context.window.CourtyardRuntime.register(T,b,b.root,20,'月雪');scene.updateMatrixWorld(true);player.position.set(-7.7,0,-3.1);camera.position.set(-7.7,2.2,2);camera.lookAt(-7.7,1.5,-3.1);camera.updateMatrixWorld();const w=context.window.CourtyardWeather.create({THREE:T,scene,camera,player,surfaceHeight:()=>0,buildings:()=>[b]});w.setMode('snow');const before=performance.now();for(let i=0;i<240;i++)w.update(1/60,{});let ms=performance.now()-before;const points=w.root.children[0].geometry.attributes.position.array,n=w.root.children[0].geometry.drawRange.count;let leaks=0,court=0;for(let i=0;i<n;i++){const x=points[i*3],y=points[i*3+1],z=points[i*3+2];if(x>-8.95&&x<-6.45&&z>-6.6&&z<.3&&y<3.5)leaks++;if(x>-2&&x<2&&y<3) court++;}assert(!leaks);assert(court>0);result.push({passed:true,building:'Moon Snow actual instanced tiled corridor',roofLeaks:leaks,openCourtParticles:court,simulatedFrames:240,totalMilliseconds:ms,meanUpdateMilliseconds:ms/240,...w.inspect()});w.dispose();

}
// Articulated weather-only roofs use an independent Three.Raycaster oracle.
{
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1.7, .1, 300);
  const player = new T.Group(), roofRoot = new T.Group(), hinges = [], skins = [];
  roofRoot.position.set(3, 1, -4); roofRoot.rotation.y = .43;
  scene.add(roofRoot, player); player.position.set(3, 0, -4);
  camera.position.set(3, 2.7, 2.5); camera.lookAt(3, 1.6, -4); camera.updateMatrixWorld();
  for (const side of [-1, 1]) {
    const hinge = new T.Group(); hinge.position.set(side * 1.05, 3, 0); roofRoot.add(hinge);
    const skin = new T.Mesh(new T.PlaneGeometry(6, 10, 3, 5), new T.MeshBasicMaterial({side: T.DoubleSide}));
    skin.geometry.rotateX(-Math.PI / 2); skin.position.x = side * 3;
    hinge.add(skin); hinges.push(hinge); skins.push(skin);
  }
  const record = {root: roofRoot, dynamic: true, meshes: () => skins};
  const weather = box.window.CourtyardWeather.create({THREE: T, scene, camera, player, surfaceHeight: () => 0, buildings: () => [record]});
  const ray = new T.Raycaster(), probe = new T.Mesh(undefined, new T.MeshBasicMaterial({side: T.DoubleSide}));
  function oracle(x, z) {
    roofRoot.updateWorldMatrix(true, true); let top = 0;
    ray.set(new T.Vector3(x, 200, z), new T.Vector3(0, -1, 0));
    for (const mesh of skins) {
      probe.geometry = mesh.geometry; probe.matrixWorld.copy(mesh.matrixWorld);
      const hit = ray.intersectObject(probe, false)[0]; if (hit) top = Math.max(top, hit.point.y + .08);
    }
    return top;
  }
  function verifySamples(label) {
    let sheltered = 0, open = 0, maxError = 0;
    for (let x = -5.93; x < 11; x += .71) for (let z = -11.83; z < 4; z += .83) {
      const expected = oracle(x, z), actual = weather.sampleShelter(x, z);
      maxError = Math.max(maxError, Math.abs(actual - expected));
      assert(Math.abs(actual - expected) < 1e-7, label + ': exact current triangle height');
      if (expected > .1) sheltered++; else open++;
    }
    assert(sheltered > 0 && open > 0, label + ': both real roof and open sky');
    return {label, sheltered, open, maxError};
  }
  weather.setMode('snow'); weather.update(0);
  const phases = [];
  for (const [label, angle] of [['open', 0], ['half', .33], ['closed', .7], ['instant-open', 0]]) {
    hinges[0].rotation.z = -angle; hinges[1].rotation.z = angle;
    weather.update(0); phases.push(verifySamples(label));
    const gap = roofRoot.localToWorld(new T.Vector3(0, 0, 0));
    assert.equal(weather.sampleShelter(gap.x, gap.z), 0, 'open wing gap is never a box proxy');
  }
  // Positions in one old 20 cm cell must get distinct heights on a sloping skin.
  hinges[1].rotation.z = .5; weather.update(0);
  let closePair = false;
  for (let x = 5; x < 9 && !closePair; x += .2) {
    const x1 = Math.floor(x * 5) / 5 + .03, x2 = x1 + .11, z = -4;
    const y1 = oracle(x1, z), y2 = oracle(x2, z);
    if (y1 > .1 && y2 > .1 && Math.abs(y1 - y2) > .01) {
      assert(Math.abs(weather.sampleShelter(x1, z) - y1) < 1e-7);
      assert(Math.abs(weather.sampleShelter(x2, z) - y2) < 1e-7); closePair = true;
    }
  }
  assert(closePair, 'sloped roof test exercised two different positions within one cache cell');
  roofRoot.updateWorldMatrix(true, true);
  const beforeCutaway = skins[1].localToWorld(new T.Vector3(0, 0, 0));
  const physicalHeight = weather.sampleShelter(beforeCutaway.x, beforeCutaway.z);
  skins.forEach(mesh => mesh.visible = false); roofRoot.visible = false; weather.update(0);
  assert.equal(weather.sampleShelter(beforeCutaway.x, beforeCutaway.z), physicalHeight, 'skeleton cutaway does not demolish roof');
  record.respectVisibility = true; weather.update(0);
  assert.equal(weather.sampleShelter(beforeCutaway.x, beforeCutaway.z), 0, 'explicit visibility policy is respected');
  record.respectVisibility = false; roofRoot.visible = true; skins.forEach(mesh => mesh.visible = true);
  // Root translation/yaw and an instant hinge jump must update without elapsed time.
  roofRoot.position.x += 1.7; roofRoot.rotation.y += .22; hinges[0].rotation.z = -.77;
  weather.update(0); phases.push(verifySamples('instant-root-and-hinge-pose'));
  let checkedParticles = 0, maxTriangleTests = 0;
  for (let frame = 0; frame < 120; frame++) {
    hinges[0].rotation.z = -.6 * Math.sin(frame / 75); hinges[1].rotation.z = .6 * Math.sin(frame / 75);
    weather.update(1 / 60);
    const geometry = weather.root.children[0].geometry, positions = geometry.attributes.position;
    for (let i = 0; i < geometry.drawRange.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      assert(y + 1e-4 > oracle(x, z), 'no rendered particle may be below the current articulated skin'); checkedParticles++;
    }
    maxTriangleTests = Math.max(maxTriangleTests, weather.inspect().dynamicTriangleTests);
    assert(weather.inspect().particles <= 480);
  }
  result.push({name: 'exact articulated weather-only roofs / instant poses / wing gaps / physical skeleton cutaway', passed: true,
    phases, withinCellSlopeChecked: closePair, checkedParticles, maxTriangleTests, ...weather.inspect()});
  // An exact QA probe can query a far roof while weather is clear; it must not
  // depend on an old camera center or mutate the active scene/particle positions.
  const particleBefore = Array.from(weather.root.children[0].geometry.attributes.position.array);
  weather.setMode('clear'); roofRoot.position.x += 400; roofRoot.updateWorldMatrix(true, true);
  const farPoint = skins[1].localToWorld(new T.Vector3(0, 0, 0));
  assert(Math.abs(weather.sampleShelter(farPoint.x, farPoint.z) - oracle(farPoint.x, farPoint.z)) < 1e-7);
  assert.deepEqual(Array.from(weather.root.children[0].geometry.attributes.position.array), particleBefore);
  assert.equal(weather.mode, 'clear');
  result.push({name:'far exact shelter probe while weather is clear',passed:true,sceneAndParticlePositionsUnchanged:true});
  weather.dispose();
}

// Dense fixture reconstructed from the production wing curves and clipping function.
// This is geometry/CPU QA, not a browser rendering or GPU frame-rate measurement.
{
  const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
  function productionFunction(name) {
    const start = html.indexOf('function ' + name + '('); assert(start >= 0, name + ' exists');
    let depth = 0, began = false;
    for (let i = html.indexOf('{', start); i < html.length; i++) {
      if (html[i] === '{') { depth++; began = true; }
      if (html[i] === '}') { depth--; if (depth === 0 && began) return html.slice(start, i + 1); }
    }
    throw new Error('Unclosed function ' + name);
  }
  const sourceContext = {THREE: T};
  vm.runInNewContext(productionFunction('butterflyWingShape') + '\n' + productionFunction('clipRoofGeometry'), sourceContext);
  const scene = new T.Scene(), root = new T.Group(), skins = [], joints = [];
  scene.add(root); root.position.set(-180, -14.4, 220); root.rotation.y = .81;
  for (const side of [-1, 1]) {
    const main = new T.Group(), mainOrigin = new T.Vector3(side * 3.5, 24, 1);
    main.position.copy(mainOrigin); root.add(main); joints.push({object: main, side, kind: 'main', axis: new T.Vector3(0, -.12, 1).normalize()});
    for (const upper of [true, false]) {
      const shape = sourceContext.butterflyWingShape(upper), sx = upper ? 69 : 58, sz = upper ? 70 : 65;
      const flat = new T.ShapeGeometry(shape, 14).toNonIndexed(), vertices = [];
      const roofY = (x, z) => upper ? 9 + x * .42 - z * .23 + 2.4 * Math.sin(x / 48 * Math.PI) : 7 + x * .10 - z * .045 + 1.2 * Math.sin(x / 32 * Math.PI);
      function tri(a, b, c, depth) {
        if (depth) { const ab = a.clone().lerp(b, .5), bc = b.clone().lerp(c, .5), ca = c.clone().lerp(a, .5);
          tri(a, ab, ca, depth - 1); tri(ab, b, bc, depth - 1); tri(ca, bc, c, depth - 1); tri(ab, bc, ca, depth - 1);
        } else for (const p of side < 0 ? [a, c, b] : [a, b, c]) {
          const x = 3.5 + p.x * sx, z = 1 - p.y * sz; vertices.push(x * side, roofY(x, z), z);
        }
      }
      const p = flat.attributes.position;
      for (let i = 0; i < p.count; i += 3) tri(...[0, 1, 2].map(j => new T.Vector2(p.getX(i + j), p.getY(i + j))), 1);
      const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geometry.computeBoundingBox();
      const extent = side < 0 ? -geometry.boundingBox.min.x : geometry.boundingBox.max.x, cut = 3.5 + (extent - 3.5) * 2 / 3;
      const origin = new T.Vector3(side * cut, roofY(cut, 1), 1), outer = new T.Group();
      outer.position.copy(origin).sub(mainOrigin); main.add(outer);
      joints.push({object: outer, side, kind: 'outer', axis: new T.Vector3(0, upper ? -.23 : -.045, 1).normalize()});
      for (const outside of [false, true]) {
        const g = sourceContext.clipRoofGeometry(geometry, new T.Matrix4(), side, cut, outside);
        g.translate(...(outside ? origin : mainOrigin).clone().negate().toArray());
        const mesh = new T.Mesh(g, new T.MeshBasicMaterial({side: T.DoubleSide})); (outside ? outer : main).add(mesh); skins.push(mesh);
      }
      geometry.dispose(); flat.dispose();
    }
  }
  root.updateWorldMatrix(true, true);
  const localPlayer = new T.Vector3(20, .2, -15), player = new T.Group(); scene.add(player);
  player.position.copy(root.localToWorld(localPlayer));
  const camera = new T.PerspectiveCamera(40, 1.7, .1, 300); camera.position.copy(player.position).add(new T.Vector3(0, 2.7, 6.5)); camera.lookAt(player.position.clone().add(new T.Vector3(0, 1.6, 0))); camera.updateMatrixWorld();
  const record = {root, dynamic: true, meshes: () => skins};
  const weather = box.window.CourtyardWeather.create({THREE:T, scene, camera, player, surfaceHeight:() => -14.2, buildings:() => [record]});
  weather.setMode('snow');
  const timings = [], triangleTests = [], indices = [], ray = new T.Raycaster();
  let testedParticles = 0, oracleLeaks = 0;
  for (let frame = 0; frame < 181; frame++) {
    const progress = frame / 180;
    for (const joint of joints) joint.object.quaternion.setFromAxisAngle(joint.axis, joint.side * T.MathUtils.degToRad((joint.kind === 'main' ? 22 : 18) * progress));
    const start = performance.now(); weather.update(1 / 60); timings.push(performance.now() - start);
    triangleTests.push(weather.inspect().dynamicTriangleTests); indices.push(weather.inspect().dynamicTriangles);
    if (frame % 30 === 0) {
      root.updateWorldMatrix(true, true);
      const geometry = weather.root.children[0].geometry, positions = geometry.attributes.position;
      for (let i = 0; i < geometry.drawRange.count; i++) {
        ray.set(new T.Vector3(positions.getX(i), 200, positions.getZ(i)), new T.Vector3(0, -1, 0));
        const hit = ray.intersectObjects(skins, false)[0];
        if (hit && positions.getY(i) + 1e-4 <= hit.point.y) oracleLeaks++;
        testedParticles++;
      }
    }
    assert.equal(weather.inspect().dynamicShelters, 1);
    assert.equal(weather.inspect().particles, 480);
    assert.equal(weather.inspect().shelterQueries, 0, 'dynamic queries do not consume or evade the static query budget');
  }
  assert.equal(oracleLeaks, 0, 'production-derived animated wing fixture has no snow below any current skin');
  weather.update(0); assert.equal(weather.inspect().dynamicRebuilds, 0, 'settled roofs reuse their exact triangle index');
  const settledTimings = [];
  for (let i = 0; i < 120; i++) { const t = performance.now(); weather.update(1/60); settledTimings.push(performance.now()-t); }
  const centralGap = root.localToWorld(new T.Vector3(0, 0, 0));
  assert.equal(weather.sampleShelter(centralGap.x, centralGap.z), -14.2, 'actual four-wing central opening stays outdoors');
  const sorted = [...timings].sort((a, b) => a - b);
  result.push({name:'production-derived eight-skin articulated butterfly geometry', passed:true,
    meshes:skins.length, inputTriangles:skins.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0),
    maxIndexedTriangles:Math.max(...indices), frames:timings.length, testedParticles, oracleLeaks,
    maxTriangleTestsPerUpdate:Math.max(...triangleTests), maximumParticles:480,
    meanCpuUpdateMs:timings.reduce((a,b)=>a+b,0)/timings.length,
    medianCpuUpdateMs:sorted[Math.floor(sorted.length/2)], p95CpuUpdateMs:sorted[Math.floor(sorted.length*.95)], maxCpuUpdateMs:sorted[sorted.length-1],
    settledRebuilds:weather.inspect().dynamicRebuilds, settledMeanCpuUpdateMs:settledTimings.reduce((a,b)=>a+b,0)/settledTimings.length,
    centralOpeningUncovered:true, noGpuRendering:true});
  weather.dispose();
}

// A correct engine still needs the weather-only root in both entry pages.
for (const page of ['index.html', 'island.html']) {
  const html = fs.readFileSync(path.join(base,page),'utf8');
  assert(/const butterflyWeatherShelter=\{root:landmarks\[23\]\.butterfly\.creature,dynamic:true,meshes:/.test(html),page+': explicit dynamic skin record');
  assert(/buildings:\(\)=>\[\.\.\.navigationBuildings,butterflyWeatherShelter\]/.test(html),page+': weather integration includes the sea roof');
  assert(!/navigationBuildings\.(push|unshift|splice)\([^;\n]*butterflyWeatherShelter/.test(html),page+': weather record never added to navigation');
}
result.push({name:'both entry pages register weather-only butterfly skins without changing navigation',passed:true});

console.log(JSON.stringify({passed:true,kind:"CPU simulation; no pixels rendered",checks:result},null,2));
