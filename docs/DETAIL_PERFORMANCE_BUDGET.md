# Cumulative courtyard detail budget

Audit: 2026-10-19. Existing eight buildings measured at commit `685a2a603b94986c48927cfc832d66d57fe39c3e`; restoration building 3 and secondary-detail LOD are retained from that release. Building16 city detail is measured against published commit `8f0019ef17669f3277a8b99c675b7cf4f2cfbf52`. Building14 twelve-portrait detail is measured against published commit `b958c3a6835974daf9dccc24d3110a28f7ae46cc`. Building7 IPShield album-binding detail is measured against published commit `603d27c49075c6139da63d8c114e1120e4bcfc91`. Building 1 Huayun long-scroll canopy is measured against published commit `19102dd19a4c1ab52d485df88f3962c0251ab665`. Building 10 API gateway paired route wings are measured against published commit `02a7f4077e18f35483457b55d303bc409dfcf808`. Building 21 proofreader retained-margin eaves are measured against published commit `ab4aedbbe3380eb9e4bdc82bfaec7a7e1aa89e05`. Reproduce current numbers with `node docs/detail-lod-check.cjs`.

## Measurement and limits

The audit instantiates the actual builders using vendored Three.js r128, counts indexed/non-indexed triangles with InstancedMesh multiplicity, and counts material draw batches. Moving prototypes are counted at their actual multiplicity. These are **assembly budgets**, not browser/GPU frame measurements. Figures exclude subsequently attached reading panels, unrelated scenery and postprocessing. Frustum culling, existing fine-joinery LOD and shadows change actual frame costs. Gzip figures below use local gzip level 9, not observed HTTP transfers.

All eight legacy Blender assemblies were outside `b.detail`. Existing `CourtyardRuntime.update` only distance-hides `b.detail` at 30m in light quality and 58m otherwise. Whole crafted buildings remain visible when within 22m or intersecting the camera frustum; they have no far-distance silhouette replacement. The ordinary landmark distance-LOD branch explicitly excludes crafted buildings.

## Actual assembly budgets

| Building | Moving detail copies | Added detail triangles / batches | Entire builder triangles / batches | New far-LOD savings triangles / batches |
|---|---:|---:|---:|---:|
| 0 Ink | 1 carriage | 17,864 / 8 | 30,220 / 49 | 352 / 2 |
| 4 Nuanling | 0 | 20,464 / 5 | 29,816 / 58 | 0 / 0 |
| 5 Nuanling App | 0 | 15,940 / 8 | 25,682 / 52 | 0 / 0 |
| 6 Editor | 4 drawers | 11,572 / 22 | 21,056 / 105 | 1,584 / 16 |
| 15 Causal | 6 vents | 18,092 / 18 | 38,218 / 57 | 1,584 / 12 |
| 17 Twin Stars | 8 screens | 11,888 / 21 | 22,906 / 69 | 2,464 / 16 |
| 18 Versions | 5 screens | 8,360 / 15 | 26,626 / 57 | 1,100 / 10 |
| 22 Rubbing | 1 overlay | 14,668 / 9 | 26,010 / 36 | 308 / 2 |
| Existing eight | 25 | 118,848 / 106 | 220,534 / 483 | 7,392 / 58 |
| 3 Restoration | 1 light | 4,912 / 4 | 12,326 / 37 | 176 / 2 |
| Previous nine | 26 | 123,760 / 110 | 232,860 / 520 | 7,568 / 60 |
| 16 City | 0 | 2,136 / 3 | 16,886 / 50 | 0 / 0 |
| Previous ten | 26 | 125,896 / 113 | 249,746 / 570 | 7,568 / 60 |
| 14 Portraits | 0 | 4,752 / 3 | 27,122 / 62 | 0 / 0 |
| Previous eleven | 26 | 130,648 / 116 | 276,868 / 632 | 7,568 / 60 |
| 7 IPShield | 0 | 2,384 / 2 | 27,730 / 51 | 0 / 0 |
| Previous twelve | 26 | 133,032 / 118 | 304,598 / 683 | 7,568 / 60 |
| 1 Huayun | 0 | 3,304 / 2 | 15,428 / 57 | 0 / 0 |
| Previous thirteen | 26 | 136,336 / 120 | 320,026 / 740 | 7,568 / 60 |
| 10 API Gateway | 0 | 2,048 / 2 | 16,906 / 36 | 0 / 0 |
| Previous fourteen | 26 | 138,384 / 122 | 336,932 / 776 | 7,568 / 60 |
| 21 Proof | 0 | 3,088 / 3 | 12,894 / 31 | 0 / 0 |
| All fifteen | 26 | 141,472 / 125 | 349,826 / 807 | 7,568 / 60 |

When every listed building is beyond its applicable cutoff, the new module reduces the detail subtotal from 141,472 triangles / 125 batches to 133,904 / 65. The complete-builder arithmetic becomes 342,258 / 747 before accounting for existing fine-detail and frustum culling. This is an aggregate potential saving; do not present it as a measured view or frame-rate increase. Near the buildings, all additions return and the original totals apply. All targeted detail meshes cast shadows, so hiding them also avoids their eligible shadow draws; no permanent shadow property is changed.

For cumulative history, the same original eight builders at pre-detail-series commit `ed2cab4` total 107,806 triangles / 373 batches. Their current net change is +112,728 triangles / +110 batches, rather than the gross Blender additions above. Other edits and replaced roof geometry produce a net -6,120 triangles / +4 batches in the non-Blender remainder. Restoration adds 4,912 triangles / 4 batches to its own prior 7,414 / 33 builder. City adds 2,136 triangles / 3 batches to its own prior 14,750 / 47 builder. Portraits adds 4,752 triangles / 3 batches to its own previous 22,370 / 59 builder; all twelve original threshold shades remain unchanged. Portraits introduces no moving secondary detail or LOD target; all twelve equal open crowns remain visible. IPShield adds 2,384 triangles / 2 batches to its previous 25,346 / 49 builder. Four continuous oak ribs, their bronze collars and clips, and archive edge protection remain static; all eight original album leaves and their mechanism are exact. IPShield adds no moving detail or LOD target. City introduces no moving secondary detail and no new LOD target; its essential stone entrance and sunny open fan remain visible.

The fourteen previously reported builder rows are independently rebuilt from the exact published Gateway baseline inside the current audit; their detail, whole-building and far-LOD counts remain identical. Building 1 adds 3,304 triangles / 2 batches to its own prior 12,124 / 55 production builder. Its one continuous oak canopy, two bronze rims, twelve supports, six cross bearers, twelve brackets, six roof collars, thirteen medium-specific niche pieces and four table clips stay static. The original nineteen moving layer meshes remain exact; Huayun adds no moving detail or LOD target. Ground-layout width and depth are preserved for unchanged reading-rest placement, while actual high-level culling bounds and height include the new canopy. This added a thirteenth row, without changing the prior twelve.

Building 10 API Gateway now adds 2,048 triangles / 2 batches to its own prior 14,858 / 34 production builder. Four closed U-shaped raised route girders, eight supporting stems, eight bridges, eight roof sleeves, eight neutral joint badges, eight observation-bench corner shoes and four archive stiles form 48 static solids. The paired model-bay silhouette is symmetric, with exactly two neutral route girders per side. Both original routing louvres and all other original elements remain exact; no additional moving prototype or LOD target is introduced. The original width/depth and actual reading-rest placement are retained, while culling bounds/height include the new raised structure. This adds a fourteenth row without changing the prior thirteen.

Building 21 Proof now adds 3,088 triangles / 3 batches (oak, bronze and clay) to its own prior 9,806 / 28 production builder. Eight paired retained-margin eaves, their posts, brackets and edge bindings, eight proof-table edge clamps and four shared-bench end caps form 76 static solids. The original annotation-lintel mechanism, proof fields, text surfaces and collision footprints remain unchanged. The added assembly has no moving detail or LOD target. The original width/depth are retained for reading-rest placement, while culling bounds/height include the high-level additions. This adds a fifteenth row without changing the prior fourteen. As with every row, the runtime-registered builder includes its original plaque (2 triangles / 1 batch), before later reading-panel attachment.

## Transfer budget

| Asset | Raw bytes | Gzip-9 bytes |
|---|---:|---:|
| ink-detail.js | 1,215,082 | 136,045 |
| nuanling-detail.js | 1,214,115 | 121,722 |
| nuanling-app-detail.js | 1,012,504 | 105,474 |
| editor-detail.js | 646,212 | 62,631 |
| causal-detail.js | 1,180,602 | 143,316 |
| twinstars-detail.js | 595,228 | 56,957 |
| versions-detail.js | 434,759 | 45,167 |
| rubbing-detail.js | 910,204 | 90,344 |
| Existing eight | 7,208,706 | 761,656 |
| restoration-detail.js | 292,967 | 29,299 |
| Previous nine | 7,501,673 | 790,955 |
| city-detail.js | 126,128 | 14,425 |
| Previous ten | 7,627,801 | 805,380 |
| portraits-detail.js | 272,853 | 29,991 |
| Previous eleven | 7,900,654 | 835,371 |
| shield-detail.js | 134,079 | 14,647 |
| Previous twelve | 8,034,733 | 850,018 |
| huayun-detail.js | 189,965 | 22,217 |
| Previous thirteen | 8,224,698 | 872,235 |
| gateway-detail.js | 119,681 | 13,252 |
| Previous fourteen | 8,344,379 | 885,487 |
| proof-detail.js | 178,200 | 18,940 |
| All fifteen | 8,522,579 | 904,427 |

All detail scripts remain eagerly loaded. Visibility LOD saves rendering work, not downloaded bytes, JavaScript parse cost or resident geometry memory.

## Retained bounded mitigation

`assets/detail-lod.js` loads after `courtyard-runtime.js`, wraps `register` and `update` once, and caches explicit known secondary moving groups in a WeakMap per building. It uses the identical strict distance comparison and quality cutoffs as existing fine-detail LOD. It also supports records registered before module loading through lazy collection.

Only these exact groups are affected: `editor-blender-drawer`, `twinstars-blender-screen`, `causal-blender-vent`, `versions-blender-screen`, `rubbing-blender-overlay`, `ink-blender-carriage`, and `restoration-blender-light`. Original moving pivots, original mechanism meshes, transforms, articulation and all static Blender geometry are untouched. In particular, replacement roof shells stay visible. No broad suffix matching is used.

The current check exercises all fifteen actual builders with and without a camera, both quality tiers, exact cutoff boundaries, near/far/near transitions and repeated mechanism target states. Full original node transforms, non-target visibility and shadow flags are compared against a separate unwrapped-runtime control. It also checks duplicate loading, lazy collection, untouched unrelated groups and exact expected savings. Cumulative assertions cap this version at its measured 141,472 added-detail triangles / 125 batches and 349,826 complete-builder triangles / 807 batches; an additional increase requires an explicit budget update.

## Mechanical butterfly, separate budget

The actual palace root after `prepareButterflySea` and `installRoofMechanism` has 34,199 triangles / 99 mesh batches; the creature subtree has 28,739 / 86, including the 2,064 / 3 crown. These counts precede later butterfly reading/content attachments and include nodes whose visibility can vary. Seven palace batches cast shadows; crown batches do not. The creature is separately cloned into the planar reflection scene, refreshed up to 15 Hz on both quality tiers, adding eligible creature draws and celestial reflection geometry on those updates. This LOD module does not modify the butterfly.

## Remaining budget risk and next candidates

The cumulative increase is meaningful, especially mobile CPU draw submission, shadow passes and eager JavaScript geometry. Triangle counts alone do not prove an FPS failure. Avoid adopting a repeated allowance of roughly 20 extra batches per building without a cumulative budget.

The largest future batching opportunity is actual moving prototypes: editor drawer detail could theoretically use 4 shared material instance batches instead of 16; Twin Stars screens 2 instead of 16; causal vents 2 instead of 12; versions screens 2 instead of 10. This would save another 44 near-view batches with unchanged triangle counts, but requires careful instance-matrix synchronization and is deliberately outside this minimal change. Essential silhouettes should remain separate from future distance-culled ornament. Binary/indexed geometry or measured deferred loading could address startup cost separately.
