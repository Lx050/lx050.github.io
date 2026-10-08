# Courtyard construction rebuild

Cloud-local reconstruction of the complete courtyard building collection. This work does not publish or deploy the site.

## Design scope

The 25 non-butterfly destinations become individually planned, ground-level buildings with a common craft vocabulary: limestone plinth courses at grade, timber or metal load-bearing frames, explicit roof build-ups, bronze connection plates, and warm lighting. Furnishings express each destination's role and stay clear of the central entrance-to-exit route. Three mathematical islands receive distinct occupiable pavilions; the entrance torii and bridge structures receive corresponding construction detail. The external mechanical butterfly and the separate internal biological butterfly retain their respective roles.

These are artistic constructions for an interactive environment, not engineering drawings or a certification of structural safety.

## Running

From the project directory, run `python3 -m http.server 8874` and open `http://localhost:8874/`. `index.html` and `island.html` are identical entry points. All runtime dependencies and assets are bundled; there is no CDN dependency.

For repeatable local checks and screenshots, run `python3 docs/preview-server.py`, then open `http://localhost:8874/docs/architecture-qa.html`. Click the test button once the scene is ready. This localhost-only server saves captures under `qa-results/`. Test both desktop and narrow viewport buttons. The QA page deliberately exercises finite simulation steps and controlled camera positions; those camera poses are not part of the normal user experience.

## Preservation

- All destination links, descriptions, music recordings and credits remain intact
- Original GLB models remain available in the source tree, with licenses retained
- Ground access, walking, wall sliding, auto-step, run/jump and free camera controls are retained from the newer navigation baseline
- The exterior butterfly remains a fixed-body, articulated architectural mechanism; the inner Papilio remains biological
- No repository push, production deploy, account changes or third-party data transmission are included

## Validation

Final measured checks and known limits are recorded in the delivered QA report. Software-rendered cloud browser timings are not equivalent to a hardware-GPU desktop or a physical phone test.
