'use strict';
/**
 * STMX TC Step 4 SEMANTIC CARRIER RUNTIME V3.3 — CANDIDATE / SHADOW · CANONICAL ENTRY POINT (the only one) · R1-FREE · GT-FREE.
 * Order: STMX TC MAINLINE V2.3.61 (CEO D-60 APPROVED 2026-09-26). Versioned successor of the sealed V3.2 (V2.3.59 · 24107491…); V3.2 stays byte-identical.
 * Changes: P-1 constitutive coverage (Reference successor) · P-2 evidence ownership · P-3 whole-unit composition (tc_transformative_evaluator_v3_3.js) ·
 *          OSF-7 length-token compatibility overlay + Reference successor binding (tc_semantic_binding_adapter_v3_3.js) · P-3 validation (tc_output_assembler_v3_3.js) ·
 *          projection V4 input (V2.3.61 trouser fit observation successor).
 * Byte-identical to V3.2: tc_classic_evaluator_v3.js · tc_prominence_derivation_v3.js · tc_salience_admission_v3.js · tc_semantic_vocabulary_v3.js.
 * D-60.6 (J2) is NOT implemented: exact authority not recoverable (V2.3.61 29_). Grammar State stays the frozen Step 3 output attached downstream (G60).
 * Reads no CEO GT, no R1, no historical TC, no Descriptor prose, no Vector, no image; emits no tier, score or number. Not frozen, not production,
 * NOT registered in the Clean Engine registry.
 */
const adapter = require('./tc_semantic_binding_adapter_v3_3');
const salience = require('./tc_salience_admission_v3');
const PR = require('./tc_prominence_derivation_v3');
const { evaluateTransformative } = require('./tc_transformative_evaluator_v3_3');
const { evaluateClassic } = require('./tc_classic_evaluator_v3');
const { assemble } = require('./tc_output_assembler_v3_3');

const RUNTIME_ID = 'STMX_TC_STEP4_SEMANTIC_CARRIER_RUNTIME_V3_3_CANDIDATE';
const STATUS = 'CANDIDATE / SHADOW';

function runUnit(unit, authority) {
  const sal = salience.admit(unit.members);
  salience.verifyMaterialization(sal, unit.upstream.statement_set, unit.upstream.anchor_id);
  const transformative = unit.upstream.direction === 'TRANSFORMATIVE' ? evaluateTransformative(unit.upstream, unit.members, authority) : null;
  const classic = unit.upstream.direction === 'CLASSIC' ? evaluateClassic(unit.upstream, unit.members, authority) : null;
  return assemble(unit, sal, transformative, classic);
}

function runCorpus(options = {}) {
  const authority = options.authority || adapter.loadBound(options);
  PR.assertSpecTranscription(authority.laneSpec);
  const units = adapter.buildUnits(authority);
  return { runtime: RUNTIME_ID, status: STATUS, units: units.map((u) => runUnit(u, authority)) };
}

module.exports = { runUnit, runCorpus, RUNTIME_ID, STATUS };
