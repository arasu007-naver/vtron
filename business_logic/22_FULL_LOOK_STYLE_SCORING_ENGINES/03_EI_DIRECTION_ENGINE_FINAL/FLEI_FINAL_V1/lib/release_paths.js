'use strict';
/**
 * STMX FULL-LOOK EI DIRECTION ENGINE FINAL V1 — release path helper. The release is self-contained: the runtime lives in RT/ (a mini-root that reproduces the
 * master-relative layout of the runtime and of every dependency it loads or hashes, so the unchanged V1_R3 source resolves ROOT = RT/). Nothing outside this
 * directory is read.
 */
const path = require('path');
const REL = path.resolve(__dirname, '..') + path.sep;
const RT = REL + 'RT' + path.sep;
const RUNTIME_SRC = RT + '01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_EI_BINARY_DIRECTION_RESOLVER_V1_R3_CANDIDATE/src/';
const resolver = () => require(RUNTIME_SRC + 'fl_ei_direction_resolver_v1.js');
const evidence = () => require(RUNTIME_SRC + 'fl_ei_evidence_v1.js');
const authority = () => require(RUNTIME_SRC + 'fl_ei_authority_v1.js');
/** production scoring entry: one look → one Full-Look EI Direction record */
const score = (packet, runRecord) => resolver().resolveEI({ packet, run_record: runRecord });
module.exports = { REL, RT, RUNTIME_SRC, resolver, evidence, authority, score, RELEASE_ID: 'STMX_FULL_LOOK_EI_DIRECTION_ENGINE_FINAL_V1' };
