'use strict';
/**
 * STMX FULL-LOOK SR DIRECTION ENGINE V1 — release path helper. The release is self-contained: the runtime lives in RT/ (a mini-root that reproduces the
 * master-relative layout of the runtime and of its pinned dependencies, so the unchanged R4 source resolves ROOT = RT/). Nothing outside this directory is read.
 */
const path = require('path');
const REL = path.resolve(__dirname, '..') + path.sep;
const RT = REL + 'RT' + path.sep;
const RUNTIME_SRC = RT + '01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R4_FINAL_CANDIDATE/src/';
const resolver = () => require(RUNTIME_SRC + 'fl_sr_direction_resolver_v3_r4.js');
const constitution = () => require(RUNTIME_SRC + 'fl_sr_binary_constitution_v3_r4.js');
const authority = () => require(RUNTIME_SRC + 'fl_sr_authority_v3_r4.js');
/** production scoring entry: lane B only (Lane A / ECC overlays are not part of the production release) */
const score = (packet, runRecord) => resolver().resolveSR({ packet, run_record: runRecord }, { lane: 'B' });
module.exports = { REL, RT, RUNTIME_SRC, resolver, constitution, authority, score, RELEASE_ID: 'STMX_FULL_LOOK_SR_DIRECTION_ENGINE_V1' };
