# Warm Listening Hall: solid roof refinement

2026-10-16, unpublished cloud working branch. Building index 4 (暖聆).

The existing 17.3 × 15.8 m four-slope roof had only eight surface triangles and no underside or closed eaves. Its exterior outline is retained, but the four roof planes are now four individually closed trapezoidal solids with 0.16 m **vertical** thickness. This dimension is a visual architectural modelling choice, not a specification for construction or structural certification. The existing cap and hip trim remain. The new surfaces extend downward, never above the original weather interception plane.

Implementation is opt-in through `hip(..., { shellThickness: .16 })`; only this hall opts in. Crisp separate normals at the lower surfaces and rims preserve the slab profile. The exterior mechanical butterfly and interior biological butterfly are unchanged. Existing content, 78 actions, weather implementation, floor entrances and navigation collision volumes are unchanged.

## Verification

Run from project root:

    node docs/roof-shell-check.cjs

Optional comparison to a retained exact UX candidate:

    COURTYARD_BASELINE=/path/to/untouched-ux-v2 node docs/roof-shell-check.cjs

- Four panels: each 8 unique corners, 18 edges, 12 triangles; every edge has two oppositely wound incident faces and positive signed enclosed volume
- Paired upper/lower vertices measure 0.16 m vertical thickness
- 24 downward/upward ray checks hit the actual outward-facing upper/underside geometry and measure the same thickness
- Total roof triangles 8 → 48, +40 for the entire scene; instanced draw-call grouping unchanged
- Against the retained original candidate, all 25 ordinary-building collision arrays and mechanism names match; only building 4 has a geometry count change
- Nine existing source/geometry/action/weather/reading/layout suites pass, alongside the new roof suite
- index.html/island.html stay identical; asset version queries and 50-file byte-check manifest refreshed
- garden.html is the separately authored 2D experience, retained from the pinned baseline; two obsolete tests now protect that separate identity rather than incorrectly demanding a 3D alias

The local Blender diagnostic imports the actual generated roof vertices; it is an isolated geometry view, not a rendered screenshot of the website. Current full-scene WebGL visual QA is blocked by this cloud execution environment, so text legibility, scene aesthetics, roof occlusion pixels and real-device performance are **not accepted** by these checks. Previous Apple M5 acceptance belongs to the earlier UX candidate, not this geometry revision. Do not deploy this branch to production on the strength of CPU tests alone.
