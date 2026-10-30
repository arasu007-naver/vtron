# Rollback — STMX Full-Look EI Direction Engine Final V1

There was no previous production Full-Look EI Direction engine. Rollback therefore means withdrawing this release; no other engine is reinstated.

1. Set `01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_EI_DIRECTION_ENGINE_PRODUCTION_AUTHORITY_V1.json` → `status: WITHDRAWN` through a governed Full-Look EI reopen decision.
   - Do this with an append-only record; never edit or delete the frozen release.
2. Consumers fall back to "no Full-Look EI production engine".
   - The candidates (V1_R3, V1_R2, V1_R1, V1) stay available as historical, non-production artefacts. None of them is a fallback engine.
   - Item EI (`STMX_EI_ENGINE_PRODUCTION_AUTHORITY_V1.json`) is a different (Item) engine and is not a Full-Look fallback.
3. To restore this release from backup:
   - copy the backup folder's `FLEI_FINAL_V1/` to a short base directory;
   - run `node verify_release.js --out <dir>`;
   - expect `RELEASE_VERIFIED` and the same `RELEASE_MANIFEST.json` sha256 as the freeze seal.
4. A successor (for example a V2 that revisits FL-EI-LIM-F228-001) is a new directory with a new seal. A frozen release is never rebuilt in place.

Rollback rehearsal (done at freeze time, recorded in D10):
- restore the release from the backup folder into a clean directory;
- verify it;
- confirm that withdrawing a copy of the pointer does not touch any frozen file.
