# Building experience controls

The nearby building card now shows the building name and one characteristic action. A native `details` / `summary` disclosure, “更多体验 · 2”, keeps both other actions available. There are still three distinct phase buttons per building and all 78 source-backed actions are unchanged. Phase descriptions remain on each button; the longer building interaction hint remains on the building-name tooltip.

For ordinary crafted buildings, the main entry button, Enter key, and scene visits invoke the same configured primary action instead of cycling through phases. The butterfly (index 23) has no craft card, so its “翻阅碑文” entry keeps cycling through all three reading/wing phases; its original independent controls are unchanged. The duplicate entry button is hidden while the craft card already offers that building’s primary; section-specific reading requests are unchanged.

The primary is chosen by building content, rather than always selecting phase 2: for example, layout foregrounds 编排, Moon Snow foregrounds 借景, privacy foregrounds 短显, and the quiet timer foregrounds 开始. The exact mapping is in `CRAFT_PRIMARY_PHASES` and the generated `qa-results/craft-disclosure-check.json`.

The disclosure stays open across animation frames and action clicks. Changing buildings closes it and reorders the same three button nodes, preserving their existing click handlers. If keyboard focus was in the old card, it moves to the new primary; leaving the interaction radius moves that focus to the world. Enter/Space on the native summary bypass world shortcuts. Touches on the whole control card bypass the floating joystick. Focus-visible styling and minimum 44 × 44 CSS pixel targets apply to the summary and buttons. No new ARIA expanded state duplicates the native details semantics. On mobile, opening the disclosure keeps one action row: primary, compact native 收起 summary, and both secondary buttons occupy four minimum-44px columns. This avoids pushing the card upward into the minimap; the original native details element stays intact. The bounded mobile check covers both states across widths and inset cases.

## Checks

- `node docs/craft-disclosure-check.cjs`: checks actual extracted production arrangement logic with a minimal DOM model for all 26 buildings, 78 preserved actions, focus transfer, disclosure persistence, native markup, shortcut guards, and index/island parity
- `node docs/building-actions-check.cjs`: exercises all 78 real action implementations, repeated source cycles, timer/pause/replay/privacy and geometry invariants
- `node docs/mobile-hud-flow-check.cjs`: checks mobile measured-flow source contracts and bounded width/height calculations
- `python3 docs/build-mobile-controls-fixture.py`: regenerates the exact CSS/HUD browser fixture. Its Actions selector tests collapsed and expanded states; summary is included in hit tests and minimum-target assertions, while hidden secondary actions are not treated as visible targets

No browser was launched for this change. These GPU-free checks do not establish native keyboard behavior, screen-reader announcements, actual font layout, or touch hit testing. Before visual sign-off, use the fixture at both action states, particularly 320 × 640 and synthetic 44-pixel side insets, then check the real courtyard on desktop and a phone. Verify Tab → summary → Enter/Space, both secondary actions, changing buildings, leaving proximity, and opening the in-world reading view. Roof geometry, original butterfly navigation, garden.html, and the archived 23-file UX are outside this patch.
