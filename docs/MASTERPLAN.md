# Courtyard masterplan · 2026-10-20

Baseline: `01c264f3b7de9d8ad8471ed700d05b940d8eb96f`.

This is an additive site-planning layer, not a replacement of the 26 buildings. Island radius 150 m, building rings 70/124 m, the four sectors, exact building transforms, all destination links, reading text, anonymity edits, source-section order, teleports, resume and the original movement/camera code are preserved. The walking rings remain at their existing 34/88 m radii.

## Scope delivered

- **Hierarchy:** existing butterfly remains the distant dynamic anchor; Moxi gets an open creative forecourt; MoonSnow gets a quieter landscape frame. Distance-tiered existing labels favor those three anchors without adding a second label layer. Nearby labels and existing reading/inscription sightline protection remain.
- **Four districts:** 26 thin, terrain-following forecourts use an open work-grid, clear paired service guides, staggered literary planting, or an open overlook fan. There are 25 small entrance cues; the sea butterfly retains its existing causeway/landing.
- **Arrival and choice:** permanent side inlays lead from the existing south gate to the central court and toward the butterfly. Two optional routes live inside the existing map dialog: entrance → central court → butterfly, and Moxi → butterfly → MoonSnow. They are off by default, cancellable, and never move the player automatically.
- **Between buildings:** four off-route pause pockets provide a workshop table/rest edge, direct service rest, a quiet rain canopy, and an open overlook. Low pooled planting softens district seams. Seats/posts/roof have real registered collision geometry. The canopy participates in the real shelter mask; the central aisle is clear. No new stairs, raised platforms or lights.
- **Action feedback:** the existing action card now reports the actual state and exposes appropriate pause/resume and exhibit reset controls. Actions that already have a pause phase do not get a duplicate pause. Reset does not erase reading progress or source-section order. Privacy expiration remains time-bound; it cannot be paused indefinitely. The legacy timer pause path also settles elapsed wall time correctly after suspended frames.
- **Weather:** the existing weather choice now consistently adjusts global ground/path materials, fallback vegetation, and the new landscape/roof surfaces. Covered paving, soffit and sheltered bench surfaces remain dry. Clear/wind/disable/dispose restore original material values. This is not a rewrite of every old GLB roof, tree or bridge material, and it adds no particle system.
- **Mobile containment:** controls remain in the existing nearby card/map dialog. Expanded actions and long feedback scroll in a bounded dock; short landscape has a separate narrow strip and stacked summary. A compact map remains reachable in short portrait. Empty docks and reading/world states cannot leave an invisible input-blocking panel. The whole mobile atlas scrolls with a sticky close header.

## Geometry and rendering budget

Maximum authored addition: 48 draw batches, 20,000 triangles, 18 materials, zero lights and zero particles. Current constructed module: **34 batches, 8,822 triangles, 13 materials, 206 mesh/instance elements** (including both optional route meshes, even when hidden). Repeated foliage, cues and furniture are instanced; numbers are not interchangeable with object count. Far pocket groups are culled at 80 m in light quality / 145 m otherwise. There is no per-frame geometry rebuild or material allocation.

Ground patches use upward-facing, single-sided triangles. Bronze decorative inlays are 16 mm above their base field to avoid coplanar z-fighting. Optional route marks are separately offset from the actual walking surface, including the existing sloped sea causeway. These visual patches do not replace the walker's floor surface.

## Access and known inherited limitations

The current exact-geometry check samples routes, approaches and clear corridors every 0.2 m with avatar radius and lateral offsets. It also drives the original walker without jumps or warps between waypoints. Recorded results: 53,895 geometric samples, 2,789 motor steps, zero airborne floor gap; pilot 375.67 m, first-visit 636.28 m, local north bypass 39.11 m.

The two core walking rings and cardinal spines within radius 88 remain clear. The original north outer spine crosses the unchanged Mosheng facade: its centerline contacts occur around z −117.1 to −122.4 m; lateral corridor samples extend the affected span. A new visible 3 m-wide at-grade east-side bypass reconnects that spine from (0, −104) via (3.3, −112) and (3.3, −134) to (0, −142). It passes the same geometric and real-walker checks. The original painted straight branch remains, rather than moving buildings or rebuilding major roads. The original east outer spine has an edge contact near x 120.6–121.7 m at the +1 m lateral sample; its center is clear. Outer-spine preservation tests explicitly claim no *new* obstruction, not that all inherited outer branches are flawless.

An initial recommended path along the east inner spine encountered an inherited surface-height/terrace transition under the real walker despite clear collision boxes. Both recommended routes now use the verified north inner spine. That unused east terrain transition was not globally rewritten.

Offline before/after review reproduced dark triangular road cutouts in the exact baseline. The final audit reports 151 of 3,040 inherited road tiles with sampled road-top points below the rendered terrain triangulation, with the exact count/depth in `qa-results/masterplan/baseline-road-height-audit.json`. All 49,120 inherited exported instances retain their original triangle coordinates, topology, transforms and scalar material state. This release does not claim to repair those inherited visual seams.

## Reproducible verification

```sh
# Current production guards plus current CPU tests, explicitly partial history scope:
node docs/masterplan-release-check.cjs --current-only

# Full CPU acceptance also runs the previous release's complete acceptance
# inside an independent checkout pinned to the baseline:
node docs/masterplan-release-check.cjs

# Focused new checks:
node docs/masterplan-check.cjs
node docs/masterplan-actions-check.cjs
node docs/masterplan-weather-check.cjs
node docs/masterplan-layout-source-check.cjs

# Actual-browser DOM fixture, when a supported local Chromium can launch:
node docs/masterplan-layout-check.cjs

# Exact authored geometry capture and neutral CPU Cycles views:
node docs/masterplan-render-export.cjs
blender -b -t 6 --python tools/render-masterplan.py
```

The release suite preserves all 72 inherited test files without weakening or normalizing them. It pins 130 original unchanged runtime files, all 26 complete destination/site records, all 78 source action labels/kinds/groups, and the original movement/camera/sightline source blocks. Seven deliberate source mutations must fail. Publication hashes, cache tokens and unchanged-before/after acceptance fingerprints are required. The previous release's exact-delta aggregate and full-header snapshots are historical fixtures, not falsely reported as direct acceptance of this new scope.

## Evidence limits

- Current geometry, original walker, action semantics, material restoration and bounded CSS/source tests are CPU evidence.
- The cloud Chrome currently cannot create a WebGL context. Local headless Chromium startup is blocked by the available sandbox; the real DOM fixture is retained, but **not passed**. The mobile source check counts the feedback/recovery rows and checks 16 bounded viewport/safe-area cases; it is not a font-layout engine or native touch test.
- Cycles renders use actual exported authored geometry, including local GLB scenery. They honor front/back material side and include three 1.7 m eye-height views plus four overview views. They approximate lighting, shaders, textures, fog, glass and water; Canvas labels, live input and browser FPS cannot be certified from them.
- Same-camera baseline views and exact inherited-instance comparison separate the new landscape layer from inherited defects. No promise of universal road visual perfection or device/GPU performance is made.
- QA images, scene JSON, executable local fixture and generated logs are local review artifacts, not required runtime assets. `docs/deployment-verify.html` performs read-only byte checks only.
