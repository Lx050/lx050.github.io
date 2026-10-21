# Courtyard roads · 2026-10-21

Baseline: `b9975f4128f1de2df4276aab83772a06aef6c74f`.

## What changed

- **通衢大道:** direct main avenues widen from 3.0 to 3.8 metres; both 3.2-metre walking rings remain. The north avenue follows the clear east-side detour around Mosheng, and the east outer avenue gently avoids the Five Versions frontage. Buildings do not move.
- **曲径通幽:** a 2.2-metre sage-stone curve briefly returns to the inner ring before bending toward the existing sheltered literary pocket. The contour avoids the earlier steep approach transition rather than adding stairs or a raised platform. Dense centre/side sampling of its underlying terrain gives a maximum local grade of about 14%; it is not an accessibility certification.
- **旁逸斜出:** four 1.8-metre warm-aggregate branches lead to the existing four pause-pocket aisles. Furniture, content and destinations remain. One short workshop-branch terrain facet reaches about 31% over 16 cm (approximately 23% maximum one-metre average); these are traversable terrain-following paths, not uniformly gentle or accessibility-certified gradients.
- Both map canvases draw the same physical corridor polylines, including detours and curves. Optional tours retain their existing controls and never move the player automatically.

## Root causes repaired

The old paving fitted rigid boxes to the analytic height function, while the visible terrain used a coarser triangular mesh. Independent baseline testing found 151 of 3,040 stone tiles below visible terrain by up to 8.62 cm; exposed joint beds could be deeper. The walker also chose the first overlapping flat terrace rather than the visible surface, creating metre-scale phantom drops and barriers.

The new shared sampler clips each paving polygon against the actual indexed terrain triangles. It builds the rendered courses and the walker's floor lookup from those same faces. Equal-height polygon overlap is subtracted before triangulation rather than hidden with a depth-buffer bias. The original movement, jump and collision solver is unchanged.

Terrace and approach paving follows the visible terrain instead of floating flat discs. Bridge support is bounded to the actual deck rectangle and sampled deck faces. Two inherited mainland bridgehead depressions are locally graded into their unchanged decks. The descending butterfly causeway receives a narrow shoreline earth/cliff opening beneath its unchanged geometry. Outside these named bridge/causeway earthworks, the terrain field and all building/site transforms remain unchanged.

Existing tree trunks and lantern bases obstructed the old rings and avenue ends. Only confirmed obstructions or near-touches are moved to the nearest safe verge; counts, sizes, rotations, materials and model assets remain. The audited repair moves 56 trees and 56 lanterns, 112 of 398 fixtures in total, with a maximum translation of 2.625 metres. Junction carpets are checked as their actual oriented square footprints, not only corridor centrelines. The actual relocation list, original/new coordinates, reasons and footprint checks are written to the local QA report, not inferred from a changed collision radius.

## Materials and performance

New paving materials bind to the existing rain/snow/clear weather registry. Clear/wind/disable restore original material values. Covered masterplan materials retain their dry exposure. There are no added lights, particles or downloaded models/textures.

The creative route layer has 3,106 triangles in three pooled draw batches and three materials, within its separate six-draw / 18,000-triangle ceiling. Exact repair of all legacy paving increases tessellation relative to rigid boxes and flat discs; the full-scene before/after export reports that cost separately rather than presenting only the small creative addition. Hidden internal curb walls are omitted. Full authored-scene triangles are 1,075,999 before and 1,128,612 after (+52,613, +4.89%); source mesh objects are 1,688 before and 1,661 after. These counts are not measured WebGL draw calls. There is no per-frame geometry rebuild.

## Reproduction

```sh
git worktree add ../courtyard-roads-baseline-20261021 b9975f4128f1de2df4276aab83772a06aef6c74f
ROADS_ROOT=../courtyard-roads-baseline-20261021 node docs/roads-check.cjs --baseline
node docs/roads-preservation-check.cjs
node docs/roads-masterplan-check.cjs
node docs/roads-check.cjs
node docs/roads-scenery-check.cjs
node docs/roads-release-check.cjs
```

The baseline road diagnostic intentionally records the inherited failures; it is comparison evidence, not an acceptance pass. The current release runner retains every inherited test file unchanged. Applicable functional checks run on the current source; exact historical source-identity fixtures run on the immutable predecessor. The road acceptance executes the actual production Three.js host and original walker, not an alternate movement model. It checks full-width lanes in both directions, ring/spine junctions, approaches, all seven bridges with landward extensions, the butterfly causeway, new curves, and pocket entries.

Before/after offline views use the actual authored scene meshes and the same locked cameras. CPU Cycles approximates browser lighting, materials, canvas textures, glass and water. These are not browser screenshots or evidence of mobile touch behavior, WebGL correctness, GPU performance, or an accessibility-certified maximum grade. No frame-rate claim is made.
