# Autonomous mechanical butterfly

The central architectural butterfly now starts flying without a click. Its original six rigid hinges and eight telescoping actuators follow a fourteen-second cycle. The wing canopy, body and mechanism hover vertically between 6 and 10 metres above their previous positions. There is no horizontal drift, camera animation or player displacement.

The terrace, causeway, entry gate, ground colonnades, reading plaque and walking surfaces stay anchored. Existing conservative walking collision footprints remain unchanged; camera collision heights include the complete vertical hover allowance. Reflection transforms follow the flying body. This is an artistic hovering palace, not a structural or aerodynamic simulation.

“自动飞行 · 暂停” freezes the current pose; “继续自动飞行” resumes. Selecting an existing wing pose switches to manual inspection. Reduced-motion preferences freeze autonomous motion without snapping back to the initial pose. The interior biological butterfly and reading content are unchanged.

## Grand silhouette revision

Forewing horizontal span increases by 10%, hindwing by 14%, with slightly longer sweep. The full wing cycle now uses 94% of the existing rigid hinge range; hover travels four metres vertically. No lateral motion or neighbouring hall geometry is introduced.

One suspended architectural crown floats above the body. Four open arcs, a thin inner register and twelve small finials use 2,064 triangles and three draw calls in the main scene (also three in the existing reflection pass). There are no new particles, point lights, shadow maps, image textures or postprocessing effects. Its rotation and warm emission vary smoothly with the same bounded flight clock and freeze with pause/reduced motion.

Warm gold light now travels along the existing procedural wing veins even before proximity reveal. The ivory/pigment reveal and original contents remain intact. The shader uses a slow continuous sine with a nonzero brightness floor, not flashes.

## Verification

Run `node docs/butterfly-flight-check.cjs` to exercise the actual runtime functions and geometry without input for two flight cycles, then check manual control, reduced motion and 100,000 bounded clock steps. The test asserts rigid joint ranges, positive actuator lengths, fixed walking collisions, no lateral displacement, entry alias equality, reflection integration and wing clearance. Sampled minimum wing vertex height is 13.71 m above terrace origin (not continuous collision certification).

For offline geometry evidence, run `EXPORT_BUTTERFLY=1 node docs/butterfly-flight-check.cjs`, then `blender -b -t 2 --python tools/render-butterfly.py`. This creates two exact mesh-assembly views in `qa-results/butterfly/`. These are Blender geometry renders, not browser screenshots; WebGL shader appearance, browser interaction and device performance have not been revalidated. The earlier Chromium socket denial was not retried or bypassed.

The candidate builds on `7c3bfdba2b61d463af7334f639dc31a255b1f500` (the accumulated hall, app, and editor candidate). The 55-file deployment manifest includes the accumulated hall, app and editor geometry as well as the flight and crown modules. Input handler snapshots remain unchanged; the header snapshot was updated only after reviewing the butterfly runtime changes.

Regression note: the historical browser runner `wave1-check.cjs` stops before browser launch on a stale LINKS snapshot. The same mismatch exists on published `16ec697`; LINKS is byte-identical here. It was not changed or retried. The modern source/geometry suites were run separately.

For Blender CPU reference with the exported standard material colours, metalness, roughness and emissive values, run `BFLY_MATERIALS=1 blender -b -t 2 --python tools/render-butterfly.py`. The custom WebGL vein shader and planar reflection are not reproduced by this offline reference, and the reference lights differ from the browser. The views are not browser QA.

The sampled horizontal wing reach is 67.96 m from the offshore pavilion centre, safely separated from the main island halls; the existing temple deck radius remains 55.8 m, with wing tips over water. Test limits allow a maximum radius of 72 m.
