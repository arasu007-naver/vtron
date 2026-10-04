'use strict';
/*
 * STMX — Runtime Skeleton Demo Runner (test tool, not engine logic).
 * Runs the Clean runtime skeleton once on an empty observation and prints the result.
 * Exit 0 = OK (8 layers executed, deterministic non-decision). Exit 1 = problem.
 * Called by RUN_SKELETON_TEST.bat. Does NOT modify runtime/skeleton.
 */
try {
  var mod = require('../04_CLEAN_ENGINE_CODE/src/runtime/runtime_skeleton');
  var r = mod.run({}, { run_id: 'DEMO' });
  console.log(JSON.stringify(r, null, 2));

  var ok = r &&
    Array.isArray(r.layer_statuses) && r.layer_statuses.length === 8 &&
    r.decision_status === 'NOT_IMPLEMENTED' &&
    r.architecture_version === 'CLEAN_ARCHITECTURE_FREEZE_V1_0';

  if (ok) {
    console.log('RUNTIME_DEMO_OK');
    process.exitCode = 0;
  } else {
    console.log('RUNTIME_DEMO_FAIL: unexpected skeleton output shape');
    process.exitCode = 1;
  }
} catch (e) {
  // Human-readable, no raw stack dump.
  console.log('RUNTIME_DEMO_ERROR: ' + (e && e.message ? e.message : 'unknown error'));
  process.exitCode = 1;
}
