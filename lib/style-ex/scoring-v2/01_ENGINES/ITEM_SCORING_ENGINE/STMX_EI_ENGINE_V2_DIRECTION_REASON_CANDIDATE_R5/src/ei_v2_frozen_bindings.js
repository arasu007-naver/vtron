'use strict';
/* STMX ITEM EI V2 — CANDIDATE (not production · not frozen). Frozen dependencies, bound by path + sha256 (contracts/EI_V2_BOUND_INPUTS.json) and verified at load.
   Read-only: the candidate never writes to, patches or re-exports a frozen file. Only exported frozen functions are called. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BOUND = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'contracts', 'EI_V2_BOUND_INPUTS.json'), 'utf8'));
const ROOT = path.resolve(__dirname, '..', '..', '..', '..') + '/';
const mismatch = BOUND.files.filter((f) => crypto.createHash('sha256').update(fs.readFileSync(ROOT + f.path)).digest('hex') !== f.sha256);
if (mismatch.length) throw new Error('EI V2 candidate: frozen dependency hash mismatch — ' + mismatch.map((f) => f.path).join(', '));
const at = (role) => ROOT + BOUND.files.find((f) => f.role === role).path;
module.exports = {
  RT: require(at('FROZEN_EI_DIRECTION_RUNTIME')),          // run · runPair · validateInput · collectEvidence · deduplicate · resolveForces · resolveIndependence · evidenceCondition · resolveColorBase · resolveContextualNeutral · resolveMaterialColorContext · startingState · closureContext
  COLOUR: require(at('FROZEN_COLOUR_V1_CONTRACT')),         // FAMILIES · validateColorObservation
  RULES: require(at('FROZEN_VISION_V1_3_RULES')),           // CATEGORIES · ALL_PARAMS
  BOUND,
};
