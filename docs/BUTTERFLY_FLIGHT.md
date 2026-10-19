# Autonomous mechanical butterfly

The central architectural butterfly now starts flying without a click. Its original six rigid hinges and eight telescoping actuators follow a twelve-second cycle. The wing canopy, body and mechanism hover vertically between 3.8 and 6.2 metres above their previous positions. There is no horizontal drift, camera animation or player displacement.

The terrace, causeway, entry gate, ground colonnades, reading plaque and walking surfaces stay anchored. Existing conservative walking collision footprints remain unchanged; camera collision heights include the complete vertical hover allowance. Reflection transforms follow the flying body. This is an artistic hovering palace, not a structural or aerodynamic simulation.

“自动飞行 · 暂停” freezes the current pose; “继续自动飞行” resumes. Selecting an existing wing pose switches to manual inspection. Reduced-motion preferences freeze autonomous motion without snapping back to the initial pose. The interior biological butterfly and reading content are unchanged.

## Verification

Run `node docs/butterfly-flight-check.cjs` to exercise the actual runtime functions and geometry without input for two flight cycles, then check manual control, reduced motion and 100,000 bounded clock steps. The test asserts rigid joint ranges, positive actuator lengths, fixed walking collisions, no lateral displacement, entry alias equality, reflection integration and wing clearance. Sampled minimum wing vertex height is 11.51 m above terrace origin (not continuous collision certification).

For offline geometry evidence, run `EXPORT_BUTTERFLY=1 node docs/butterfly-flight-check.cjs`, then `blender -b -t 2 --python tools/render-butterfly.py`. This creates two exact mesh-assembly views in `qa-results/butterfly/`. These are Blender geometry renders, not browser screenshots; WebGL shader appearance, browser interaction and device performance have not been revalidated. The earlier Chromium socket denial was not retried or bypassed.

The implementation integrates published hall baseline `16ec697d602c8183bc917aad5c2b89760fda6012`. The 52-file deployment manifest includes both hall geometry and the new flight module. Input handler snapshots remain unchanged; the header snapshot was updated only after reviewing the butterfly runtime changes.

Regression note: the historical browser runner `wave1-check.cjs` stops before browser launch on a stale LINKS snapshot. The same mismatch exists on published `16ec697`; LINKS is byte-identical here. It was not changed or retried. The modern source/geometry suites were run separately.
