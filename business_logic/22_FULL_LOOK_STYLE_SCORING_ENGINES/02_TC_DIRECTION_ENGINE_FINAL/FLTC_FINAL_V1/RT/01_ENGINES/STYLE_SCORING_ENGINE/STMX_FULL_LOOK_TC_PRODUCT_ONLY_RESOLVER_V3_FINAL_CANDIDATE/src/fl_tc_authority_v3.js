'use strict';
/**
 * STMX FULL-LOOK TC PRODUCT-ONLY RESOLVER V3 — FINAL CANDIDATE · authority list.
 * The frozen bindings (pins by name + hash, fail-closed) are UNCHANGED: re-exported from fl_tc_authority_v1.js (byte-identical to V1 and V2).
 * V3 adds the cross-axis CEO decision STMX-2026-10-AEMS (AVAILABLE_EVIDENCE_MANDATORY_SCORING, 2026-10-24) to the applied authorities and names the
 * constitution its outputs carry. Earlier decisions stay listed with their status; nothing earlier is re-written.
 */
const V1 = require('./fl_tc_authority_v1.js');
const PRODUCT_ONLY_ANCHOR = 'CEO_APPROVED_FULL_LOOK_TC_PRODUCT_ONLY_2026_10_23';
const AEMS_ANCHOR = 'STMX-2026-10-AEMS';
const CONSTITUTION_ID = 'STMX_FULL_LOOK_TC_DIRECTION_CONSTITUTION_FINAL_V1';
const AUTHORITIES = Object.freeze([
  { id: 'TC_FREEZE_V1 · STMX_TC_ENGINE_V1', kind: 'FROZEN', use: 'product departure = frozen Step 2 predicates (silhouette · proportion · construction · asymmetry) per garment, through the bound Step 2 successor V4 (unchanged); a departure is valid only when a frozen predicate returns it' },
  { id: AEMS_ANCHOR + ' (CEO 2026-10-24)', kind: 'CEO_APPROVED', use: 'AVAILABLE_EVIDENCE_MANDATORY_SCORING: a scorable look always receives CLASSIC or TRANSFORMATIVE from the evidence the Vision packet already carries; missing facts contribute nothing and are never filled; UNKNOWN / UNRESOLVED are internal diagnostics only; input failures (no valid packet · unparsable · no evaluable Full-Look evidence) are separate from the direction' },
  { id: PRODUCT_ONLY_ANCHOR + ' (CEO 2026-10-23)', kind: 'CEO_APPROVED', use: 'Full-Look TC = valid Product-Level Departure only: valid product departure → T; products that keep their grammar → C. Styling-created departure has no direction authority. Its 2026-10-23 clause "material product evidence insufficient → UNRESOLVED" is applied after 2026-10-24 under ' + AEMS_ANCHOR + ' (missing evidence is a diagnostic, not an outcome)' },
  { id: 'CEO 2026-10-17 TC clarification', kind: 'CEO_APPROVED', use: 'one valid product departure on any participating garment → T; Classic garments never cancel; no second gate; missing ≠ Classic (applied: a missing fact is never Classic evidence)' },
  { id: 'TC-D-1 (CEO 2026-10-05)', kind: 'CEO_APPROVED', use: 'Product Departure interpretation (unchanged)' },
  { id: 'CQ-TC-2 Option A (CEO 2026-10-18, ADJ-TC-07)', kind: 'CEO_APPROVED_AMENDED', use: 'Classic = no qualifying Product Departure on the observed product evidence (amended 2026-10-23: no styling condition; applied 2026-10-24 on the available evidence)' },
  { id: 'IX-1 (b) (CEO 2026-10-06)', kind: 'CEO_APPROVED', use: 'a fact hidden by another participating component is excluded (not positive, not negative); crop / framing / unreadability reduce the available evidence and are reported, never a direction' },
  { id: 'TC-D-4b (CEO 2026-10-05)', kind: 'CEO_APPROVED', use: 'accessories are outside the product gate (HELD) — unchanged' },
  { id: 'TC-D-3 (CEO 2026-10-05)', kind: 'SUPERSEDED_FOR_FULL_LOOK_TC_2026_10_23', use: 'historical: styling-only T through governed grammar departure. Superseded for Full-Look TC by ' + PRODUCT_ONLY_ANCHOR + '; not applied' },
  { id: 'ADJ-TC-01 … 06 (CEO 2026-10-18)', kind: 'CEO_CASES_ILLUSTRATIVE', use: 'look-level judgments on conversation images preserved as history; not runtime rules' },
  { id: 'TC-S1 (layer-relation clause) · TC-S2 · TC-S3 (V1 candidate gates)', kind: 'REMOVED_FROM_DIRECTION', use: 'no direction authority; observations stay in the evidence trace as non-decisive wearing context' },
  { id: 'TC-P2 · TC-PV · TC-P0 (V2 candidate outcomes)', kind: 'SUPERSEDED_BY_V3_2026_10_25', use: 'V2 returned DIRECTION_UNRESOLVED on them; V3 reports the same conditions as diagnostics (TC-P2 · TC-PV) or as an input failure (TC-P0 · no evaluable TC product evidence)' }]);
module.exports = Object.assign({}, V1, { AUTHORITIES, PRODUCT_ONLY_ANCHOR, AEMS_ANCHOR, CONSTITUTION_ID });
