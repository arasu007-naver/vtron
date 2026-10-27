# Rollback — STMX Full-Look SR Direction Engine V1

There was no previous production Full-Look SR Direction engine. Rollback therefore means withdrawing this release; no other engine is reinstated. Steps:

1. Set `01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_ENGINE_PRODUCTION_AUTHORITY_V1.json` → `status: WITHDRAWN` through a governed SR reopen decision.
   - Do this with an append-only record; never edit or delete the frozen release.
2. Consumers fall back to "no Full-Look SR production engine".
   - The candidates (R4 … V1) stay available as historical, non-production artefacts.
   - None of them is a fallback engine.
3. To restore this release from backup:
   - copy the capsule's `01_RELEASE/FLSR_FINAL_V1/` anywhere;
   - run `node verify_release.js --out <dir>`;
   - expect `RELEASE_VERIFIED` and the same `RELEASE_MANIFEST.json` sha256 as the freeze seal.
4. A successor (V2) is a new directory with a new seal. A frozen release is never rebuilt in place.

Rollback rehearsal (done at freeze time, recorded in D6):
- restore the release from the backup capsule into a clean directory;
- verify it;
- confirm that withdrawing the pointer does not touch any frozen file.
