# Cumulative courtyard detail budget

Audit: 2026-10-19. Existing eight buildings measured at commit `685a2a603b94986c48927cfc832d66d57fe39c3e`; restoration building 3 and secondary-detail LOD are retained from that release. Building16 city detail is measured against published commit `8f0019ef17669f3277a8b99c675b7cf4f2cfbf52`. Building14 twelve-portrait detail is measured against published commit `b958c3a6835974daf9dccc24d3110a28f7ae46cc`. Building7 IPShield album-binding detail is measured against published commit `603d27c49075c6139da63d8c114e1120e4bcfc91`. Building 1 Huayun long-scroll canopy is measured against published commit `19102dd19a4c1ab52d485df88f3962c0251ab665`. Building 10 API gateway paired route wings are measured against published commit `02a7f4077e18f35483457b55d303bc409dfcf808`. Building 21 proofreader retained-margin eaves are measured against published commit `ab4aedbbe3380eb9e4bdc82bfaec7a7e1aa89e05`. Building 12 Reme static privacy hoods are measured against the exact published Proof commit `c07a41583f23e0c37f02f04f50b27132b91a7a80`. Building 25 Maniforld workshop branch trusses are measured against the exact published Reme commit `be0e5ad14a8a2c6c7600af9566a33e45ee4f12e4`. Building 13 Session human-spine rafters and nine tool-bay portals are measured against the exact published Workshop commit `84b26b5b79f14eb0f390ac3f9b38fc519ef72141`. Building 19 Handover open relay trusses are measured against the exact published Session commit `62e4317998f330c1adcc4f94a70395a1427e7681`. Building 24 MindCare curved eave brackets are measured against the exact published Handover commit `212c7e4fce41e22c88ce694fff49c53b7c95d2df`. Building 20 MoonSnow stepped entrance reveals and seated eave brackets are measured against the exact published MindCare commit `7be2e7b9fcba939ebc9c70a5e363a6bd84ee59a7`. Building 2 Alternate Huayun entry joinery is measured against the exact published MoonSnow commit `c253173019253961ea94f5b25b1bc7c8f6914266`. Building 8 RSS octagonal eave and lantern joinery is measured against the exact published Alternate commit `fc5775a2f5237ccd0f29450702716bf7ec0fcc2d`. Building 9 Vaultwarden stepped vault mouth and wheel-bearing seat is measured against the exact published RSS commit `3582ae56650a925bd16c6a4b7a4b4288736393a6`. Reproduce current numbers with `node docs/detail-lod-check.cjs`.


## Measurement and limits

The audit instantiates the actual builders using vendored Three.js r128, counts indexed/non-indexed triangles with InstancedMesh multiplicity, and counts material draw batches. Moving prototypes are counted at their actual multiplicity. These are **assembly budgets**, not browser/GPU frame measurements. Figures exclude subsequently attached reading panels, unrelated scenery and postprocessing. Frustum culling, existing fine-joinery LOD and shadows change actual frame costs. Gzip figures below use local Node.js zlib.gzipSync at level 9, not observed HTTP transfers; other compressor versions can produce different byte counts.

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
| Previous fifteen | 26 | 141,472 / 125 | 349,826 / 807 | 7,568 / 60 |
| 12 Reme | 0 | 1,128 / 2 | 19,526 / 36 | 0 / 0 |
| Previous sixteen | 26 | 142,600 / 127 | 369,352 / 843 | 7,568 / 60 |
| 25 Workshop | 0 | 1,472 / 2 | 10,078 / 36 | 0 / 0 |
| Previous seventeen | 26 | 144,072 / 129 | 379,430 / 879 | 7,568 / 60 |
| 13 Session | 0 | 2,384 / 2 | 20,650 / 56 | 0 / 0 |
| Previous eighteen | 26 | 146,456 / 131 | 400,080 / 935 | 7,568 / 60 |
| 19 Handover | 0 | 1,248 / 2 | 10,946 / 27 | 0 / 0 |
| Previous nineteen | 26 | 147,704 / 133 | 411,026 / 962 | 7,568 / 60 |
| 24 MindCare | 0 | 1,620 / 2 | 21,986 / 46 | 0 / 0 |
| Previous twenty | 26 | 149,324 / 135 | 433,012 / 1,008 | 7,568 / 60 |
| 20 MoonSnow | 0 | 2,212 / 2 | 79,104 / 50 | 0 / 0 |
| Previous twenty-one | 26 | 151,536 / 137 | 512,116 / 1,058 | 7,568 / 60 |
| 2 Alternate Huayun entry | 0 | 1,016 / 2 | 8,340 / 42 | 0 / 0 |
| Previous twenty-two | 26 | 152,552 / 139 | 520,456 / 1,100 | 7,568 / 60 |
| 8 RSS | 0 | 1,120 / 2 | 8,170 / 37 | 0 / 0 |
| Previous twenty-three | 26 | 153,672 / 141 | 528,626 / 1,137 | 7,568 / 60 |
| 9 Vaultwarden | 0 | 736 / 2 | 9,726 / 27 | 0 / 0 |
| All twenty-four | 26 | 154,408 / 143 | 538,352 / 1,164 | 7,568 / 60 |

When every listed building is beyond its applicable cutoff, the new module reduces the detail subtotal from 154,408 triangles / 143 batches to 146,840 / 83. The complete-builder arithmetic becomes 530,784 / 1,104 before accounting for existing fine-detail and frustum culling. This is an aggregate potential saving; do not present it as a measured view or frame-rate increase. Near the buildings, all additions return and the original totals apply. All targeted detail meshes cast shadows, so hiding them also avoids their eligible shadow draws; no permanent shadow property is changed.

For cumulative history, the same original eight builders at pre-detail-series commit `ed2cab4` total 107,806 triangles / 373 batches. Their current net change is +112,728 triangles / +110 batches, rather than the gross Blender additions above. Other edits and replaced roof geometry produce a net -6,120 triangles / +4 batches in the non-Blender remainder. Restoration adds 4,912 triangles / 4 batches to its own prior 7,414 / 33 builder. City adds 2,136 triangles / 3 batches to its own prior 14,750 / 47 builder. Portraits adds 4,752 triangles / 3 batches to its own previous 22,370 / 59 builder; all twelve original threshold shades remain unchanged. Portraits introduces no moving secondary detail or LOD target; all twelve equal open crowns remain visible. IPShield adds 2,384 triangles / 2 batches to its previous 25,346 / 49 builder. Four continuous oak ribs, their bronze collars and clips, and archive edge protection remain static; all eight original album leaves and their mechanism are exact. IPShield adds no moving detail or LOD target. City introduces no moving secondary detail and no new LOD target; its essential stone entrance and sunny open fan remain visible.

The twenty-three previously reported builder rows are independently rebuilt from the exact published RSS baseline `3582ae56650a925bd16c6a4b7a4b4288736393a6` inside the current audit; their detail, whole-building and far-LOD counts remain identical. Building 1 adds 3,304 triangles / 2 batches to its own prior 12,124 / 55 production builder. Its one continuous oak canopy, two bronze rims, twelve supports, six cross bearers, twelve brackets, six roof collars, thirteen medium-specific niche pieces and four table clips stay static. The original nineteen moving layer meshes remain exact; Huayun adds no moving detail or LOD target. Ground-layout width and depth are preserved for unchanged reading-rest placement, while actual high-level culling bounds and height include the new canopy. This added a thirteenth row, without changing the prior twelve.

Building 10 API Gateway now adds 2,048 triangles / 2 batches to its own prior 14,858 / 34 production builder. Four closed U-shaped raised route girders, eight supporting stems, eight bridges, eight roof sleeves, eight neutral joint badges, eight observation-bench corner shoes and four archive stiles form 48 static solids. The paired model-bay silhouette is symmetric, with exactly two neutral route girders per side. Both original routing louvres and all other original elements remain exact; no additional moving prototype or LOD target is introduced. The original width/depth and actual reading-rest placement are retained, while culling bounds/height include the new raised structure. This adds a fourteenth row without changing the prior thirteen.

Building 21 Proof now adds 3,088 triangles / 3 batches (oak, bronze and clay) to its own prior 9,806 / 28 production builder. Eight paired retained-margin eaves, their posts, brackets and edge bindings, eight proof-table edge clamps and four shared-bench end caps form 76 static solids. The original annotation-lintel mechanism, proof fields, text surfaces and collision footprints remain unchanged. The added assembly has no moving detail or LOD target. The original width/depth are retained for reading-rest placement, while culling bounds/height include the high-level additions. This adds a fifteenth row without changing the prior fourteen. As with every row, the runtime-registered builder includes its original plaque (2 triangles / 1 batch), before later reading-panel attachment.

Building 12 Reme adds 1,128 triangles / 2 batches (oak and cedar) to its own prior 18,398 / 34 runtime-registered production builder. Two continuous folded privacy hoods, four folded end ribs, two offset static baffles, four post extensions, four head bearings, four knee braces, four pitched roof saddles and four baffle hangers form two material batches of 28 new static solids. The original double slats are retained. The original limited-event shutter mechanism, collision footprints, text surfaces, rear-wall reading inscription placement and domestic room contents remain unchanged. The added hoods have no moving detail or LOD target. Original width/depth are retained, while culling bounds/height include the new assembly. This adds a sixteenth row without changing any of the prior fifteen; those rows are independently compared to the exact published baseline in the check. This is an artistic privacy metaphor, not evidence of access control or real-world privacy protection.

Building 25 Workshop adds 1,472 triangles / 2 batches (cedar and bronze) to its own prior 8,606 / 34 runtime-registered production builder. Twelve exposed timber branch struts, twenty-four genuinely hollow connection sleeves and four fork nodes form forty static solids. The original roofs, workstations, moving coupling plate, content surfaces, collision footprints and complete original coupling law remain unchanged. The added assembly has no moving detail or LOD target. Original width/depth and reading-rest placement are retained, while culling bounds/height include the exposed branch trusses. This adds a seventeenth row without changing any of the prior sixteen, independently compared to the exact published baseline in the check. The exposed connections are an architectural metaphor, not proof of engineering performance, software build success or reuse rights.

Building 13 Session adds 2,384 triangles / 2 batches (cedar and bronze) to its own prior 18,266 / 54 runtime-registered production builder. One continuous cedar ridge, twelve cedar post extensions, twelve cedar rafters, nine bronze portal heads, eighteen bronze stems and thirty genuinely hollow bronze through-sleeves form eighty-two static solids. The human ridge stays continuous while the tool side retains its failed-copy gap. All ten original moving translucent panels, the original continuous human wall and ethical rail, roofs, content surfaces, physical collision footprints and reading placements remain unchanged. The new assembly has no moving detail or LOD target. Original width/depth are retained, while culling bounds/height include the raised assembly. This adds an eighteenth row without changing any prior seventeen, independently compared to the exact published Workshop baseline. This is an architectural metaphor, not a structural certification or a claim about software capabilities.

Building 19 Handover adds 1,248 triangles / 2 batches (cedar and bronze) to its own prior 9,698 / 25 runtime-registered production builder. Nine cedar post extensions, twelve cedar chords, nine genuinely hollow bronze roof-seam collars and three bronze kingposts form thirty-three static solids across three unequal open relay trusses. The original task-light carriage and its complete motion/emission law, low longitudinal service rail, receiving roofs, shared work court, vacant successor station, original content surfaces, collision footprints and reading placements remain unchanged. The new assembly has no moving detail or LOD target. Original width/depth are retained, while culling bounds/height include the raised assembly. This adds a nineteenth row without changing any of the prior eighteen, independently compared to the exact published Session baseline. The trusses interpret coordination and handover in the existing privacy-edited public reading; they are not evidence of structural certification or a claim about private conversations.

Building 24 MindCare adds 1,620 triangles / 2 batches (oak and bronze) to its own prior 20,366 / 44 runtime-registered production builder. Five long outer-left and four short inner-right curved eave brackets, their stepped bronze root saddles and tip ferrules, and nine short oak stools with slope-aligned bearing caps form forty-five closed solids. These remain static and connect each rib from its original post to an actual retained rafter. The original three overhead baffles and their full motion law, unequal contemplative loops, diary niches, central open sky, separately bounded clinician-role passage, original content surfaces, collision footprints and reading placements remain unchanged. The new assembly has no moving detail or LOD target. Original width/depth are retained, while actual culling bounds/height include the assembly. This adds a twentieth row without changing any prior nineteen, independently compared to the exact published Handover baseline. This is an architectural reading of the public practice and role-boundary interface, not medical guidance, a claim of therapeutic efficacy, privacy certification or structural safety.

Building 20 MoonSnow adds 2,212 triangles / 2 batches (cedar and bronze) to its own prior 76,892 / 48 runtime-registered production builder. Five stepped entrance-reveal pieces, four continuous two-tier eave lines, ten three-tier corbels and ten through-bored bronze post saddles form fifty-three closed solids. The original moon aperture, turning corridor, blank resting wall, paired study approaches, shared desk, interpretive painting, four integrated text surfaces, twelve anonymized reading sections, sliding lattice mechanism and collision footprints remain unchanged. Separately, six original paving regions and their eighty-five fine joints are raised by exactly 1 mm to separate fourteen originally coplanar overlap pairs. Only those ninety-one pinned instance-matrix y values change; dimensions, materials, x/z placement, original collisions, reading assets and every other original instance remain tested. This repair adds no triangles or batches. The new assembly has no moving detail or LOD target. Original width/depth and reading placements are retained, while the actual bounds/height include the additions. The audit reads the builder-module order from the production entry and loads `moon-snow-garden.js` after `content-literary.js`, and now verifies exactly one expected static detail group in each of the twenty-four final production builders. The original MoonSnow budget therefore measures the active garden rather than the earlier literary builder it replaces. This adds a twenty-first row without changing any prior twenty. The reading files, source suppression and identity-hiding policies remain byte-identical. This is an architectural interpretation of existing anonymized material, not identity research, a claim about private feelings or structural certification.


Building 2 Alternate Huayun entry adds 1,016 triangles / 2 shared material batches (oak and bronze) to its prior 7,324 / 40 runtime-registered production builder, producing 8,340 / 42. Twenty-two static solids form two layered portal lintels, continuous curved corbels, true hollow bronze post saddles, seated shoulders and two lightly returned side-eave edges. The actual program remains the smaller live entrance to building 1, with its shared long scroll and five-medium counter. The original nine translating side-window filter meshes, original roof, text and collisions remain exact. No moving detail or LOD target is added. The original finish executes before attachment; width, depth, signage and reading placement are preserved while culling bounds include the new geometry. Counts include the two original Canvas text surfaces: a no-document probe would incorrectly omit 4 triangles / 2 batches.

The audit follows the actual production index script order, including the later butterfly, infrastructure, weather, action and runtime modules. It records the B2 function after each module and proves that no later module overrides its creation-care builder. Infrastructure index 2 is a separate math-monument namespace. All twenty-four final production builders contain exactly one expected static detail group. MoonSnow's already-audited 91-instance, 1 mm paving repair and every prior detail asset remain byte-identical to this release baseline.

Building 8 RSS adds 1,120 triangles / 2 shared oak-and-bronze batches to its prior 7,050 / 35 runtime-registered ordinary architecture builder, producing 8,170 / 37. Twenty-one static closed solids comprise three stepped octagonal eave rings, eight curved timber corbels, eight genuinely hollow post saddles and two open lantern-seat rings. The original roof, radial rafters, bookshelves, furniture, light, reading surfaces, complete sky-lantern motion and collision footprints remain unchanged. The addition does not introduce a moving detail or LOD target. Original finish executes before attachment, preserving width, depth, signage and reading placement while actual culling bounds include the new geometry. The retained lantern's pre-existing separate relationship is not represented as a new certified structural connection.

The new RSS module precedes architecture.js in the exact production script order. The audit proves that no later content module overrides building 8 and that the ordinary architecture function remains unchanged through every later module. It separately retains the B2 creation-care ownership proof, the active MoonSnow garden override and the distinct infrastructure namespace. All twenty-two prior building rows and detail assets are exact against the published baseline. These are assembly counts, not WebGL, FPS or physical structural measurements.

Building 9 Vaultwarden adds 736 triangles / 2 shared limestone-and-bronze batches to its prior 8,990 / 25 runtime-registered ordinary architecture builder, producing 9,726 / 27. Nine static closed solids form three deep stepped arch rings, two seated arch-foot corbels, three genuinely through-bored bronze post collars and one compact static support for the retained side-parked great wheel. The copper barrel roof, original posts, wheel, archive cabinets, lighting, text surfaces, whole rooflight motion and collision footprints remain unchanged. The addition introduces no moving detail, roof skin, runtime light or LOD target. Original finish executes before attachment, preserving width, depth, signage and reading placement while actual culling bounds include the new geometry.

The Vault module precedes architecture.js in the actual production script order. The audit proves that no later content module overrides building 9 and retains the B2 creation-care ownership proof, B8 ordinary-builder proof, active MoonSnow garden override and distinct infrastructure namespace. All twenty-three prior building rows and detail assets are exact against the published RSS baseline. These are assembly counts, not WebGL, FPS, security or physical structural certification.

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
| Previous fifteen | 8,522,579 | 904,427 |
| reme-detail.js | 79,585 | 10,363 |
| Previous sixteen | 8,602,164 | 914,790 |
| workshop-detail.js | 136,093 | 17,523 |
| Previous seventeen | 8,738,257 | 932,313 |
| session-detail.js | 192,544 | 20,811 |
| Previous eighteen | 8,930,801 | 953,124 |
| handover-detail.js | 99,327 | 13,555 |
| Previous nineteen | 9,030,128 | 966,679 |
| mindcare-detail.js | 154,815 | 16,398 |
| Previous twenty | 9,184,943 | 983,077 |
| moonsnow-detail.js | 165,872 | 19,269 |
| Previous twenty-one | 9,350,815 | 1,002,346 |
| alternate-detail.js | 79,422 | 9,946 |
| Previous twenty-two | 9,430,237 | 1,012,292 |
| rss-detail.js | 105,421 | 12,255 |
| Previous twenty-three | 9,535,658 | 1,024,547 |
| vault-detail.js | 55,393 | 7,730 |
| All twenty-four | 9,591,051 | 1,032,277 |

All detail scripts remain eagerly loaded. Visibility LOD saves rendering work, not downloaded bytes, JavaScript parse cost or resident geometry memory.

## Retained bounded mitigation

`assets/detail-lod.js` loads after `courtyard-runtime.js`, wraps `register` and `update` once, and caches explicit known secondary moving groups in a WeakMap per building. It uses the identical strict distance comparison and quality cutoffs as existing fine-detail LOD. It also supports records registered before module loading through lazy collection.

Only these exact groups are affected: `editor-blender-drawer`, `twinstars-blender-screen`, `causal-blender-vent`, `versions-blender-screen`, `rubbing-blender-overlay`, `ink-blender-carriage`, and `restoration-blender-light`. Original moving pivots, original mechanism meshes, transforms, articulation and all static Blender geometry are untouched. In particular, replacement roof shells stay visible. No broad suffix matching is used.

The current check exercises all twenty-four actual builders with and without a camera, both quality tiers, exact cutoff boundaries, near/far/near transitions and repeated mechanism target states. Full original node transforms, non-target visibility and shadow flags are compared against a separate unwrapped-runtime control. It also checks duplicate loading, lazy collection, untouched unrelated groups and exact expected savings. Cumulative assertions cap this version at its measured 154,408 added-detail triangles / 143 batches and 538,352 complete-builder triangles / 1,164 batches; an additional increase requires an explicit budget update.

## Mechanical butterfly, separate budget

The actual palace root after `prepareButterflySea` and `installRoofMechanism` has 34,199 triangles / 99 mesh batches; the creature subtree has 28,739 / 86, including the 2,064 / 3 crown. These counts precede later butterfly reading/content attachments and include nodes whose visibility can vary. Seven palace batches cast shadows; crown batches do not. The creature is separately cloned into the planar reflection scene, refreshed up to 15 Hz on both quality tiers, adding eligible creature draws and celestial reflection geometry on those updates. This LOD module does not modify the butterfly.

## Remaining budget risk and next candidates

The cumulative increase is meaningful, especially mobile CPU draw submission, shadow passes and eager JavaScript geometry. Triangle counts alone do not prove an FPS failure. Avoid adopting a repeated allowance of roughly 20 extra batches per building without a cumulative budget.

The largest future batching opportunity is actual moving prototypes: editor drawer detail could theoretically use 4 shared material instance batches instead of 16; Twin Stars screens 2 instead of 16; causal vents 2 instead of 12; versions screens 2 instead of 10. This would save another 44 near-view batches with unchanged triangle counts, but requires careful instance-matrix synchronization and is deliberately outside this minimal change. Essential silhouettes should remain separate from future distance-culled ornament. Binary/indexed geometry or measured deferred loading could address startup cost separately.
