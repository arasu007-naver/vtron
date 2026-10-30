'use strict';
/**
 * STMX FULL-LOOK TC DIRECTION ENGINE V1 — release path helper. The release is self-contained: the runtime lives in RT/ (a mini-root that reproduces the
 * master-relative layout of the runtime and of every dependency it loads or hashes, so the unchanged V3 source resolves ROOT = RT/). Nothing outside this
 * directory is read.
 */
const path = require('path');
const REL = path.resolve(__dirname, '..') + path.sep;
const RT = REL + 'RT' + path.sep;
const RUNTIME_SRC = RT + '01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V3_FINAL_CANDIDATE/src/';
const resolver = () => require(RUNTIME_SRC + 'fl_tc_direction_resolver_v3.js');
const evidence = () => require(RUNTIME_SRC + 'fl_tc_available_evidence_v3.js');
const authority = () => require(RUNTIME_SRC + 'fl_tc_authority_v3.js');
/** production scoring entry: one look → one Full-Look TC Direction record */
const score = (packet, runRecord) => resolver().resolveTC({ packet, run_record: runRecord });
module.exports = { REL, RT, RUNTIME_SRC, resolver, evidence, authority, score, RELEASE_ID: 'STMX_FULL_LOOK_TC_DIRECTION_ENGINE_V1' };
