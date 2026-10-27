# Rollback — STMX Full-Look TC Direction Engine V1

There was no previous production Full-Look TC Direction engine. Rollback therefore means withdrawing this release; no other engine is reinstated. Steps:

1. Set `01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_DIRECTION_ENGINE_PRODUCTION_AUTHORITY_V1.json` → `status: WITHDRAWN` through a governed Full-Look TC reopen decision.
   - Do this with an append-only record; never edit or delete the frozen release.
2. Consumers fall back to "no Full-Look TC production engine".
   - The candidates (V3 final candidate, V2, V1) stay available as historical, non-production artefacts.
   - None of them is a fallback engine. Frozen Item TC (`STMX_TC_ENGINE_V1`) is a different (Item) engine and is not a Full-Look fallback.
3. To restore this release from backup:
   - copy the capsule's `FLTC_FINAL_V1/` to a short base directory;
   - run `node verify_release.js --out <dir>`;
   - expect `RELEASE_VERIFIED` and the same `RELEASE_MANIFEST.json` sha256 as the freeze seal.
4. A successor is a new directory with a new seal. A frozen release is never rebuilt in place.

Rollback rehearsal (done at freeze time, recorded in D7):
- restore the release from the backup capsule into a clean directory;
- verify it;
- confirm that withdrawing a copy of the pointer does not touch any frozen file.
