# Window-framed reading and one core experience

## Implemented scope

- The portrait alcoves in **凝结核列传 (14)** and the retained reading wall in **清样之前 (21)** now carry three deep, physically supported window reveals. Their masonry jambs and lintels crop the same fixed inscription during an oblique walk past; a normal, broad near approach reveals its entire face. These are scene geometry, with matching colliders and normal depth testing, not camera-facing UI, popups or a new page.
- Each new reveal is checked against the main passage, declared visitor routes, the standing position, existing solids and the mechanism sweep before it is attached. The narrow arrival corridor is deliberately left unobstructed.
- The same reviewed local catalog supplies both texture levels. Nearby text uses the existing 640×800 budget; only the three framed surfaces retain a 128×160 glyph texture when farther away. No new text, network fetch, identity, private source or storage is introduced. Text remains architectural decoration at a distance instead of turning into a blank slab.
- Catalog extracts fit on the same face with bounded font sizing. The provenance still explicitly says excerpt: these surfaces do not claim to reproduce the full source essays.
- The four authored Moon Snow surfaces, source, anonymization and geometry are unchanged. The standalone garden page and old 23fileUX are unchanged.
- Nearby craft controls keep a single core action visible. Other actions remain in a native, keyboard-operable disclosure; see the action-disclosure test and fixture for lifecycle coverage. No existing action is removed.

## GPU-free verification

Run from the project root:

    node docs/framed-reading-check.cjs
    node docs/reading-panels-check.cjs
    node docs/architecture-static.cjs
    node docs/building-actions-check.cjs
    node docs/craft-disclosure-check.cjs
    node docs/mobile-hud-flow-check.cjs
    node docs/inscription-sightline-check.cjs
    node docs/moon-snow-garden-check.cjs
    node docs/content-route-check.cjs
    node docs/roof-shell-check.cjs

The framed-reading regression uses actual THREE meshes, transformed roots, ray intersections, source text and disposal events. It checks 81 near-face rays for each of three surfaces, oblique occlusion, return visibility, near/far texture replacement, full catalog extracts in both representative rooms, fixed transforms, resource release and Moon Snow preservation. The existing placement suite still checks exact visible-mesh/collider agreement and clear routes across the garden. The only height change in that suite is a separate 2.72m cap for the new window lintels; text retains its original 2.23m cap.

## Verification boundary

Chromium execution is unavailable in this cloud environment (socket permission error). No permission workaround was attempted. These checks do not certify WebGL appearance, real CJK font rasterization, rendered readability, hardware performance or touch hit-testing. The expanded narrow-screen controls retain a single row and pass bounded clearance calculations, but actual HUD hit-testing at 320×640 remains a browser QA item. Use the updated browser fixture and architectural QA pages in a supported browser before treating this as complete visual acceptance. Offline or GPU-free geometry checks are not a substitute for that acceptance.
