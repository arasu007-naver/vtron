'use strict';
/*
 * STMX Clean Engine — Runtime Skeleton (Sprint 1)
 * Executes L1..L8 in the FROZEN single direction, validating I/O contracts at each hop.
 * Guarantees (§3.2): fixed order; contract-checked I/O; no bypass; identified failing layer;
 *   NO scoring; deterministic on empty knowledge; same input -> same output/error.
 * Deterministic: run_id is caller-supplied (default 'STMX_RUN'); no Date.now/Math.random here.
 */

const { LAYER_ORDER, validateInputContract, validateOutputContract } = require('./layer_interfaces');
const { ERROR_CODE, makeError } = require('./errors');

const l1 = require('../layers/l1_observation');
const l2 = require('../layers/l2_canonical');
const l3 = require('../layers/l3_derived');
const l4 = require('../layers/l4_projection');
const l5 = require('../layers/l5_knowledge');
const l6 = require('../layers/l6_interaction');
const l7 = require('../layers/l7_governance_scoring');
const l8 = require('../layers/l8_output');

const LAYER_FN = Object.freeze({ L1: l1, L2: l2, L3: l3, L4: l4, L5: l5, L6: l6, L7: l7, L8: l8 });

const ARCHITECTURE_VERSION = 'CLEAN_ARCHITECTURE_FREEZE_V1_0';
const MIGRATION_VERSION = 'SPRINT_1_SKELETON';

/**
 * Run the pipeline. `image` is the L1 input (raw). `opts.run_id` for deterministic identity.
 * Returns the L8-shaped output object (§9). Never throws for expected stub/contract states;
 * unexpected layer exceptions are captured as LAYER_EXECUTION_FAILURE (§6: no silent swallow —
 * the error is recorded and execution stops with an explicit status).
 */
function run(image, opts) {
  opts = opts || {};
  const result = {
    run_id: opts.run_id || 'STMX_RUN',
    architecture_version: ARCHITECTURE_VERSION,
    migration_version: MIGRATION_VERSION,
    execution_status: 'OK',
    layer_statuses: [],
    decision_status: 'NOT_IMPLEMENTED',
    decision_payload: {},
    errors: [],
    diagnostics: {},
  };

  let current = image; // input to the next layer
  for (let i = 0; i < LAYER_ORDER.length; i++) {
    const layer = LAYER_ORDER[i];
    try {
      validateInputContract(layer, current);            // Hard Stop on contract violation
    } catch (e) {
      result.execution_status = 'HALTED';
      result.errors.push(makeError(ERROR_CODE.CONTRACT_VALIDATION, layer, 'input', String(e.message)));
      return Object.freeze(result);
    }

    let outPkg;
    try {
      outPkg = LAYER_FN[layer](current);                // execute layer stub
    } catch (e) {
      result.execution_status = 'HALTED';
      result.errors.push(makeError(ERROR_CODE.LAYER_EXECUTION_FAILURE, layer, 'execute', String(e.message)));
      return Object.freeze(result);
    }

    try {
      validateOutputContract(layer, outPkg);            // output type must match contract
    } catch (e) {
      result.execution_status = 'HALTED';
      result.errors.push(makeError(ERROR_CODE.CONTRACT_VALIDATION, layer, 'output', String(e.message)));
      return Object.freeze(result);
    }

    result.layer_statuses.push({ layer: layer, type: outPkg.type, status: outPkg.status });
    current = outPkg; // single-direction hand-off (no bypass)
  }

  // Final package is the L8 Output Package.
  const outputPkg = current;
  result.decision_status = (outputPkg.data && outputPkg.data.decision_status) || 'NOT_IMPLEMENTED';
  result.decision_payload = (outputPkg.data && outputPkg.data.decision_payload) || {};
  result.diagnostics = { final_type: outputPkg.type, note: 'Sprint 1 skeleton — all layers NOT_IMPLEMENTED' };
  return Object.freeze(result);
}

module.exports = { run, ARCHITECTURE_VERSION, MIGRATION_VERSION };
