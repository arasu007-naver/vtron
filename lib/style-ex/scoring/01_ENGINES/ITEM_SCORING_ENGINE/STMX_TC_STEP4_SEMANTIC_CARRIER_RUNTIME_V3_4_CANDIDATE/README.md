# STMX_TC_STEP4_SEMANTIC_CARRIER_RUNTIME_V3_4_CANDIDATE

**Status:** CANDIDATE / SHADOW · NOT FROZEN · NOT PRODUCTION · NOT registered in the Clean Engine registry · Final Freeze NOT executed.
**Order:** STMX TC MAINLINE V2.3.66 (CEO D-65 APPROVED — Option C). **Successor of** the sealed `STMX_TC_STEP4_SEMANTIC_CARRIER_RUNTIME_V3_3_CANDIDATE` (untouched).
**Entry point:** `src/tc_semantic_runtime_v3_4.js` `runCorpus()`.

## Contents
- **Carried byte-identical from V3.3:** `BOUND_INPUTS.json` and every `src/*_v3.js` / `src/*_v3_3.js` file. With the two added fields removed, V3.4 output equals the sealed V3.3 replay fingerprint.
- **Added:** `src/tc_whole_unit_organizational_relation_v3_4.js` (Grammar Transformation process relation, after whole_garment_reading) · `src/tc_semantic_runtime_v3_4.js` (orchestrator) · `BOUND_INPUTS_V3_4.json` (Reference V2 candidate + seal · frozen Step 3 per-unit resolution · Step 3 successor V2 contract + resolver).
- **Output additions (non-canonical, candidate only):** `grammar_transformation_process` (completed whole-unit organizational relation with provenance, Transformative units) · `step3_successor_shadow` (successor Grammar State, every unit). The frozen `grammar_state_output` echo is unchanged.

## Not in scope
TC# · Score Physics · Ordinal Projector · Classic changes · D-61-2 · D-61-3 · production promotion · Clean Engine registration.

## Tests (VERIFICATION_TOOL / NON_FROZEN)
`tests/` — forbidden-read hook · fresh-process firewall · full GT-free replay V3.4 vs V3.3 · anti-fitting suite · independent verifier.
