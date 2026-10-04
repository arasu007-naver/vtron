'use strict';
/**
 * STMX EI DIRECTION RUNTIME V1.2.7 — PRODUCER CONTRACT BINDING V1
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-06 · Order: STMX ITEM SCORING ENGINE — TREATED SURFACE
 *                   SEALED PRODUCER GOVERNANCE FIX + DUAL-VERSION REVALIDATION V1
 *   Reason:         RESUME-1C implemented the Treated Surface observation directly in the SHARED
 *                   Vision Producer, which is also 1 of the 21 files sealed by the parking closure.
 *                   The sealed Producer has been restored byte-for-byte; the Treated Surface
 *                   Producer contract now lives in its own version, and THIS FILE is the explicit
 *                   binding that says which Producer contract V1.2.7 executes against.
 *   Affected Scope: STMX_EI_DIRECTION_RUNTIME_V1_2_7 · STMX_EI_114_DIRECTION_REGRESSION_V2_7
 *
 * ⛔ NAMED, never "latest". There is no directory scan, no glob, no mtime comparison and no
 *    fallback: the contract id below is the only Producer this version will ever load, and a
 *    missing directory FAILS CLOSED rather than silently resolving to the sealed Producer.
 * ⛔ V1.2.6 has no binding file and needs none — its own sources name the sealed Producer path
 *    directly, and that path is sealed under guard G52. ⛔ Do NOT add this file to V1.2.6.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const IVE = path.join(REPO, '01_ENGINES', 'ITEM_VISION_EXTRACTOR');

/** the Producer contract this runtime version executes against — ⛔ a NAME, not a search */
const PRODUCER_CONTRACT_ID = 'STMX_VISION_PRODUCER_V1_1';
const PRODUCER_DIR = path.join(IVE, PRODUCER_CONTRACT_ID);
/** the sealed Producer V1 — the contract of the SEALED V1.2.6 baseline. ⛔ V1.2.7 must never load it. */
const SEALED_PRODUCER_FILE = path.join(IVE, 'producer_rules_v1.js');

if (!fs.existsSync(path.join(PRODUCER_DIR, 'producer_rules_v1.js')))
  throw new Error('PRODUCER_CONTRACT_UNRESOLVED: ' + PRODUCER_CONTRACT_ID +
    ' is missing. ⛔ FAIL CLOSED — this version must NOT fall back to the sealed Producer.');

const file = n => path.join(PRODUCER_DIR, n);
const shaOf = n => crypto.createHash('sha256').update(fs.readFileSync(file(n))).digest('hex');

module.exports = {
  PRODUCER_CONTRACT_ID, PRODUCER_DIR, SEALED_PRODUCER_FILE, IVE, file, shaOf,
  /** every module of the Producer closure, loaded from the bound version only */
  rules: require(file('producer_rules_v1.js')),
  validator: require(file('producer_validator_v1.js')),
  controller: require(file('producer_controller_v1.js')),
  promptSource: () => fs.readFileSync(file('producer_prompt_v1.js'), 'utf8'),
  /** ⛔ the Colour contract is NOT part of the Producer contract. It is a separately sealed shared
   *  file, byte-identical for both version lines, and is loaded from its sealed path by both. */
  COLOUR_FILE: path.join(IVE, 'run', 'color_recovery', 'color_contract_v1.js'),
};
