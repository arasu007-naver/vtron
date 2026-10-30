'use strict';
/**
 * Deterministic offline regression runner (order §50). Non-mutating: fixtures in, machine-readable results out.
 *   node tests/run_all.js [--out <file>]        exit 1 on any failure or contract violation; no endpoints, no credentials.
 */
const fs = require('fs'); const path = require('path');
const SUITES = { ei: './test_ei', tc: './test_tc', sr: './test_sr', dm_exposure: './test_dm_exposure', modes_validator_g53: './test_modes_validator_g53',
  acc_footwear_bag: './test_acc_footwear_bag', acc_jewellery_belt: './test_acc_jewellery_belt', acc_other_families: './test_acc_other_families', acc_unknown_applicability_carrier: './test_acc_unknown_applicability_carrier',
  v12_phase1_prep: './test_v12_phase1_prep', validation_evaluator: './test_validation_evaluator',
  v13_transport: './test_v13_transport', v13_states_relations: './test_v13_states_relations', v13_dm_tc: './test_v13_dm_tc', v13_determinism_g53: './test_v13_determinism_g53',
  v14_identity: './test_v14_identity', v14_own_belt: './test_v14_own_belt', v14_representation: './test_v14_representation', v14_transport: './test_v14_transport', v14_dm_tc_preservation: './test_v14_dm_tc_preservation',
  int_groups_counts: './test_int_groups_counts', int_shoulder_slit: './test_int_shoulder_slit', int_pocket: './test_int_pocket', int_dm_serialization: './test_int_dm_serialization', rc_closure: './test_rc_closure', rc2_evidence_first: './test_rc2_evidence_first', rc3_delivery: './test_rc3_delivery', rc4_transport: './test_rc4_transport', rc5_correction: './test_rc5_correction', rc6_scoring_material: './test_rc6_scoring_material' };
const results = { runner: 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC6/tests/run_all.js', predecessor: 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC5 (preserved, sealed)', status: 'PROTOTYPE_CANDIDATE_OFFLINE', live_inference: 'NONE (G53)', suites: {}, total: 0, passed: 0, failed: 0, failures: [] };
for (const [name, mod] of Object.entries(SUITES)) {
  const tests = require(mod); const out = [];
  for (const t of tests) { results.total++; try { t.fn(); out.push({ name: t.name, pass: true }); results.passed++; } catch (e) { out.push({ name: t.name, pass: false, error: e.message }); results.failed++; results.failures.push(name + ' :: ' + t.name + ' :: ' + e.message); } }
  results.suites[name] = out;
}
const outArg = process.argv.indexOf('--out'); const outFile = outArg > 0 ? process.argv[outArg + 1] : path.join(__dirname, '_last_results.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log(`${results.passed}/${results.total} passed · ${results.failed} failed · ${outFile}`);
for (const f of results.failures) console.log('FAIL ' + f);
process.exitCode = results.failed === 0 ? 0 : 1;
