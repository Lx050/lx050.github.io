# Near-inscription avatar occlusion: local candidate

Status: local candidate only. No upload, push, or deployment was attempted. The production candidate and all original assets remain in the separate `courtyard-next` folder; this change lives only in `courtyard-next-ux`.

## Finding and minimal change

The original avatar fade is controlled by camera-boom distance: it hides below 2.4 m and restores above 2.8 m. A visitor can still cover the text at the default 6.5 m orbit, so merely walking toward an inscription does not reliably clear it. The previous fixed inspection-camera harness placed the visitor behind the camera and therefore could not establish normal-play reading usability.

This candidate adds one reason to use the existing visitor fade:

- Only a textured, visible, front-facing inscription within 3.2 horizontal metres of the visitor qualifies
- Nine inset points on the actual fixed text mesh are projected through the actual current camera; offscreen points are ignored
- The rays test the shipped avatar geometry, including the procedural fallback. Replaced placeholders stay excluded
- Registered local building meshes are checked before accepting an avatar obstruction. Text behind a wall or furnishing does not trigger the new fade
- A 0.18-second release hold prevents immediate edge flicker; the existing 0.15-second fade clears the visitor. Reduced motion snaps directly, including release
- Camera orientation, boom input, safety collision, text meshes, material depth behavior, and navigation remain unchanged
- Mesh/surface lists and scratch vectors are reused. There is no per-frame scene traversal, new UI, new navigation, popup, camera billboard, or whole-scene raycast

The scope covers the 25 registered ordinary buildings, including Moon Snow’s four integrated surfaces. The separate sea plaque does not have a registered local blocker set, so it retains its original close-camera behavior. The inner butterfly world does not consult hub inscriptions. The hub fade state is preserved during the existing world transition save/restore.

## Actually completed here

`node docs/inscription-sightline-check.cjs` passes 42 checks against the production fade/sightline functions, the shipped `Visitor.glb`, and real THREE geometry.

- 34 actual surface poses across 25 buildings, with 28 avatar-blocked cases detected at the ordinary 6.5 m orbit
- Rotated and translated buildings, wall text, sloping book rests, integrated surfaces, and portrait camera projection
- Full visitor clearance and stable detection while its materials are hidden
- Restore after orbiting away; existing close-camera hysteresis remains independent
- Hidden, blank, reverse-side, distant, offscreen, and wall-occluded text does not trigger a reading fade
- Procedural fallback, reduced-motion snap, shared scenery materials, inactive placeholders, fixed text transforms, and collider identity
- Production `stepOrbit` integration with an unobstructed test boom preserves requested yaw/pitch/distance; the separate inner-world orbit does not retain the hub reading fade
- The three entry HTML files match exactly; existing mobile input handlers match pinned baseline hashes, and HTML/CSS matches after normalizing the explicit mobile layout rules and the existing controls’ new shared wrapper

The following existing GPU-free regressions were rerun successfully:

1. `node docs/reading-panels-check.cjs`
2. `node docs/building-actions-check.cjs`
3. `node docs/moon-snow-garden-check.cjs`
4. `node docs/architecture-static.cjs`
5. `node docs/content-route-check.cjs`
6. `node docs/weather-check.cjs`

Results are under `qa-results/`. The isolated geometry microbenchmark is diagnostic only; it is not an FPS measurement.

## Evidence boundary

This task produced no fresh rendered screenshot, browser page-load pass, Safari pass, or real mobile touch pass. Local Chromium failed before loading a page because its required Unix socket returned `Operation not permitted`, including one escalation attempt. The route was not retried further. The earlier Mac observation, supplied by the parent, established that generic close text was legible but the default nearby visitor could occlude it; it does not verify this candidate.

The geometry tests use controlled poses, including a fixed 6.5 m boom for sampled surfaces. They do not certify that all those camera positions are reachable through the production collision system, that every pixel of a face is uncovered, or that the fade looks natural while moving. The surface sampler is intentionally finite. Fresh rendered testing is still required before treating this visual fix as verified.

## Rendered reproduction for the next available browser

1. Start the copied app: `python3 docs/preview-server.py --port 8877`
2. Open `http://127.0.0.1:8877/docs/inscription-sightline-qa.html` in the authorized QA browser
3. Select the wall, sloping worktable rest, and integrated Moon Snow cases. Press **Approach at normal orbit**. Confirm the reported effective boom distance; some real walls will legitimately retract it
4. Inspect the actual image: text must stay attached to its physical surface, the obstructing visitor should clear smoothly, and no new text layer or dialog should appear
5. Press **Orbit sideways** and **Move away**. The visitor should return if the physical camera is no longer close and it no longer covers the text
6. Switch to **390 × 844** and repeat. This is narrow-viewport evidence only, not real-device touch evidence
7. Set reduced motion in browser/device accessibility settings and repeat. The change should be immediate, without opacity tweening
8. Press **Resume actual controls** and walk, stop, orbit, sprint, jump, cross a doorway, and turn away repeatedly. Test keyboard/trackpad on desktop and actual dual-touch movement/view control on a mobile device
9. Enter and return from the butterfly world. Confirm no hub reading fade leaks into it and existing material state is restored
10. Capture the actual page, poses, camera distance, and failures. Do not use `architectureQA.renderView` for acceptance: it deliberately moves the visitor behind its inspection camera

The QA page is a test-only harness. It does not override avatar visibility, text placement, or collision safety. It arranges the visitor and camera inputs, lets the production orbit compute the rendered camera pose, and reports actual state. This new HTML harness has only been syntax-checked here; it has not been loaded in a browser.

## UX v1: narrow mobile correction (superseded by full-HUD v2 below)

A reported Mac DOM check of the exact pre-fix fixture confirmed the 320 × 640 overlap: joystick right edge 166 px, jump left edge 140 px, intersection 26 × 64 px. The 390 px case had no intersection. These are baseline DOM measurements; they do not verify the corrected CSS.

The candidate now adds one CSS rule at viewport widths ≤384 px:

    #jump { bottom: calc(var(--joy-bottom) + var(--joy-size) + 24px); }

The existing 64 × 64 px jump target moves above the joystick footprint. Joystick size, sprint size, all horizontal positions, safe-area variables, floating-joystick behavior, pointer capture, and gesture handlers stay unchanged. At 390 px the layout remains identical to baseline. The chosen vertical band also leaves the existing world-return button below it; source tests conservatively reserve 54 px for that return button.

`node docs/mobile-controls-layout-check.cjs` passes 284 source/formula cases: every integer width from 320 through 390, each with zero insets, bottom 34 px, sides 44 px with bottom 34 px, and sides 44 px with bottom 80 px. It checks no intersections, targets ≥44 px, safe-area bounds, and the separate world-return vertical band. This calculation is not a DOM measurement.

Regenerate the exact standalone browser fixture with:

    python3 docs/build-mobile-controls-fixture.py

`docs/mobile-controls-layout-fixture.html` now defaults to nine actual iframe combinations: widths 320/360/390 × native, synthetic bottom-34, and synthetic side-44/bottom-34 inset modes. It embeds the exact current CSS and control markup and asserts no overlaps, minimum target sizes, and viewport bounds. The safe-area substitutions are explicitly labeled synthetic. Full and compressed standalone data URLs are in `qa-results/mobile-controls-layout-data-url.txt` and `qa-results/mobile-controls-layout-compact-url.txt`.

Post-fix Mac DOM retest and actual device-touch retest are pending. Avatar rendering verification remains separate. No additional fade code was changed for this CSS correction.


## UX v2: confirmed card overlap and full-HUD correction

The subsequent Mac check of UX v1 reported that its avatar behavior passed and its joystick/jump correction passed. It also found a different real layout problem at 320 × 640 near building 6 and Moon Snow: craft-card bottom 381.1875 px overlapped jump top 374 px by 7.1875 px. Point (172, 379), inside the jump circle, hit the craft card; the read-inscription button’s center was covered too. The earlier three-control fixture could not catch those card collisions.

This iteration changes existing HUD layout only:

- The unchanged craft and interaction sections share `#nearby-controls`. Desktop uses `display: contents`, preserving their original positioning
- On mobile the two cards use one bottom-anchored flex flow. Their actual text heights determine placement, so they cannot cover one another
- The craft card has three equal grid columns, each at least 44 px, and keeps the full status text with wrapping. No labels or essential actions are clipped, hidden, or removed
- At ≤384 px in the hub, the existing 64 px jump target moves into a right-hand slot above sprint. The separate inner-world jump placement is unchanged, avoiding the world-return button
- The shared cards end 28 px above the resting joystick footprint and at least 6 px above the narrow hub jump target
- All pointer capture, movement, click/action handlers, avatar/fade code, scene assets, and world geometry remain unchanged

New evidence in this environment:

- `node docs/mobile-hud-flow-check.cjs`: 20 source/flow cases, including both zero and 44 px side-inset cases. The two-line text-height calculation is explicitly a bound to retest in a browser
- `node docs/mobile-controls-layout-check.cjs`: 568 source/formula cases, covering every width 320–390, four inset configurations, and hub versus inner-world placement
- `node docs/inscription-sightline-check.cjs`: all 42 checks still pass. The baseline hash check reconstructs only the known CSS/wrapper changes and still requires identical mobile gesture handlers

The regenerated `docs/mobile-controls-layout-fixture.html` now embeds the entire production HUD, not just the three thumb controls. It derives exact building 6 and Moon Snow titles, status text, and action labels from the current source. Its default 18 iframe cases cover both buildings × 320/360/390 px × native/bottom-34/side-44 inset modes at 640 px height. An 844 px height option is available.

The fixture measures craft, interaction/read, joystick, jump, and sprint rectangles together; checks all seven essential action targets; and uses `elementFromPoint` at centers plus eight interior cardinal/diagonal points. It also checks other visible HUD targets (navigation, weather, view control, and the interactive map canvas) so another HUD element cannot silently cover a working button. Results distinguish a completed DOM run from pending frames and identify which assertion fails.

The corrected full-HUD fixture and UX v2 have not been run in a browser by this cloud task. Post-fix Mac DOM/hit-test validation is pending. Actual device gesture testing remains separate. No push, upload, or deployment is part of this iteration.
