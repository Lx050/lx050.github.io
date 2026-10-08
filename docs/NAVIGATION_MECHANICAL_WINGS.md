# Ground access and two-stage architectural wings

Local change based on deployed commit `61f73927ce6c1d28dca3ca97bb554217d6ff6f77`. `index.html` and `island.html` remain byte-identical. No biological GLB, texture, attribution, source model, or interior scroll geometry is changed.

## Ground access and movement

The 26 landmark terraces and three mathematical-island courts no longer add raised plinths or mandatory stairs. Standalone `Base`/`Step` meshes are omitted from cloned landmark instances; source assets remain intact. Decorative footings are 4 cm rather than 38 cm high.

The two authored solid `House`/`Room` meshes become hollow walls with 2.8 m × 2.6 m front openings and 3 cm floors. Facade trim is generated after these openings, so mullions do not cross the door. This opens the two existing box rooms; it does not invent finished interiors for the other sculptural landmarks. Website visit links remain accessible from ground-level thresholds.

The character motor retains the island/bridge/water boundary and existing circular pillar collisions, and adds nearby actual-mesh wall/floor queries. Small movement substeps, projection along up to three contact planes, and axis fallback allow sliding along walls and stopping at corners. Controls are WASD/arrows, Shift to run, Space to jump, Enter to visit, and the existing E scroll entry/return. Touch retains analog joystick/look and sprint; a jump button is added.

Walking/running targets are 6.3/10.6 m/s. Automatic steps are limited to 0.35 m; jump initial velocity is 6.1 m/s with 16 m/s² game gravity, approximately 1.14 m peak. Buffered jumps and a short coyote window aid responsiveness. An upward head sweep stops jumps at lintels/ceilings. The frame clamp permits ordinary 15–60 Hz movement rather than slowing time below 29 Hz; long stalls/resumes remain capped. This is a kinematic character motor, not a general rigid-body physics engine.

## Architectural mechanism

The fixed sutra body, entry, island, causeway, and interior remain fixed. The former continuous roof breathing is replaced by user commands: 展开 / 半收 / 收拢 and 显示骨架. Controls appear near the sea building and are hidden inside the scroll. Each control has at least a 44 px touch target.

The two shared left/right main pivots carry the four original architectural lobes. Each lobe is split at two-thirds of its actual horizontal extent, producing four outer hinges and eight rigid skin sections. Gold vein beams and fascia are clipped into corresponding rigid sections with a hinge gap. Panels rotate as geometry; their scale remains `[1,1,1]`.

Fixed towers, bearings, rigid crank arms and eight pin-ended hydraulic links are visible. Each frame computes both anchor positions, rod orientation and exposed rod length from the joint pose. Cylinder barrels have constant length; sampled exposed rod travel remains within the barrel allowance. Reflection clones follow the joint, actuator and skin visibility states.

The outer stage folds first, then the main stage. Opening reverses that sequence. Main travel is 22°, outer travel 18°; the half command uses mechanism progress 0.65. A critically damped progress controller preserves pose/velocity on repeated or reversed commands and settles into a displayed lock state. The displayed lock is a visualization state, not an engineered load-bearing latch.

Wing support heights use actual triangulated roof surfaces, correcting old analytic-height intersections. Old fixed wing-root relief stays close to the body, outside the moving skin. Hinge towers sit outside the central entry aisle and join the existing pillar collision field.

This is a digital mechanical concept. Hydraulic pressure, structural loads, bearing strength, wind loading, actuator torque and real construction have not been verified. The model is not a flight simulation.

## Validation and reproduction

Use the installed Node and Chrome; no npm dependencies or new software are needed on the tested Mac. From this checkout, start `python3 -m http.server 8882 --bind 127.0.0.1`. Then run `node docs/navigation-qa/navigation-mechanical-check.cjs`. Evidence defaults to `/tmp/garden-navigation-qa`; set `GARDEN_EVIDENCE_DIR` to use another directory. Run `GARDEN_URL=http://127.0.0.1:8882/island.html node docs/navigation-qa/garden-integration-check.cjs` for the synchronized-page scroll regression.

Actual Chrome WebGL/SwiftShader captures use finite stepping through the existing test handle. Desktop 1440 × 1000 and emulated touch 390 × 844 are tested. They are not real-phone performance measurements. Inspection screenshots use deliberately chosen camera positions; the production orbit/camera framing is not replaced.

Checks cover loaded navigation records (28), two open rooms, zero mandatory terrace steps, frame-independent walking, normalized diagonal input, sprinting, jump/landing, step traversal, corner blocking, wall sliding, overhead blocking, and touch jump. Mechanical checks cover real button/touch events, all three commands, motion reversal, skeleton visibility, scale invariance, fixed body, anchor alignment, cylinder travel, and entry/reentry while the mechanism is moving.

The sweep test samples 41 poses, intersects roof-skin triangle edges against fixed building and nearby scene triangles/instances, and against other roof skins. It is a sampled check, not continuous collision detection. Designed hinge/actuator contacts and the original painted sky/backdrops (`renderOrder <= -900`) are excluded. The conservative core envelope has approximately 0.95 m minimum horizontal skin clearance; the lowest skin vertex is approximately 7.71 m above sea-building datum. The central entry prism is outside the skin sweep.

Scroll regression covers 4K desktop / 2K narrow biological loading, look/movement, E entry/return, repeated entry, delayed loading after departure, single cached request, and zero owned resources after exit. No runtime/network errors or horizontal overflow are accepted. The final JSON records are alongside the QA scripts. Mobile hardware FPS, Safari, continuous swept collision, and structural engineering remain unverified.

No push or deployment is part of this local change.
