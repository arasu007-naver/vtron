'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 R1 — INDEPENDENT EVALUATION LABELS (TEST SIDE ONLY — the runtime never requires this file). CANDIDATE.
 * Labels evaluate selections; they never drive them (order §6). Sources, in this order:
 *   L1 EI V2 R5 OVERLAY_V2 (CEO-approved product identity): ITEM approved_primary_target · SUIT suit_component_targets · evidence_source.product_title
 *   L2 reference-corpus INTAKE folder (identity.source_relative_path) mapped to the canonical Vision category: TShirt → T-Shirt · Legging → Trouser (its only
 *      image is governed by L1) · 14_Suit → SUIT · Vest / Shorts / STYLE_FULL_LOOK → no single ITEM label. The label is the unique eligible candidate of that
 *      category; none / several → not evaluable.
 *   ⚠ identity.category is NOT a label: it records the historically scored garment (e.g. T-Shirt for 586 / 593).
 * ⚠ Circularity: when an L2 category is FED as merchandise_metadata.category, the same category cannot also count as accuracy evidence — those rows are
 *   reported as metadata-mechanism checks only.
 */
const fs = require('fs'); const F = require('../../item_v2/tests/_fixtures');
const CORPUS = F.ROOT + '02_DATABASE_AND_CORPUS/CANONICAL_CORPUS/STMX_CEO_CALIBRATION_CORPUS/MASTER/STMX_CEO_CALIBRATION_CORPUS.jsonl';
const OVERLAY = F.ROOT + '01_ENGINES/ITEM_SCORING_ENGINE/STMX_EI_ENGINE_V2_DIRECTION_REASON_CANDIDATE_R5/contracts/EI_V2_HISTORICAL_PRODUCT_IDENTITY_OVERLAY_V2.json';
const FOLDER = Object.freeze({ '01_Jacket': 'Jacket', '02_Coat': 'Coat', '03_Shirt': 'Shirt', '04_TShirt': 'T-Shirt', '05_Sweater': 'Sweater', '06_Sweatshirt': 'Sweatshirt', '07_Vest': null, '08_Trouser': 'Trouser', '09_Shorts': null, '10_Legging': 'Trouser', '11_Skirt': 'Skirt', '12_Dress': 'Dress', '13_Jumpsuit': 'Jumpsuit', '14_Suit': 'SUIT', '15_STYLE_FULL_LOOK': null });
let cache = null;
function sources() {
  if (cache) return cache;
  const folder = new Map(fs.readFileSync(CORPUS, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const id = JSON.parse(l).identity; return [id.ref_id, id.source_relative_path.split('/')[1]]; }));   /* identity path only */
  const ov = new Map(JSON.parse(fs.readFileSync(OVERLAY, 'utf8')).entries.filter((e) => ['ITEM', 'SUIT'].includes(e.corrected_scoring_unit)).map((e) => [e.record_id.split('#')[0], e]));
  cache = { folder, ov }; return cache;
}
/** @returns {{ kind:'ITEM'|'SUIT'|'NO_LABEL'|'NO_MATCHING_CANDIDATE'|'LABEL_AMBIGUOUS', expected, category, source, folder, title, members }} */
function labelOf(ref, envelope) {
  const { folder, ov } = sources(); const fd = folder.get(ref) || null; const e = ov.get(ref); const title = e && e.evidence_source && e.evidence_source.product_title ? e.evidence_source.product_title : null;
  const catById = (id) => F.catOf(envelope.targets.find((t) => t.target_id === id));
  if (e && e.corrected_scoring_unit === 'ITEM') return { kind: 'ITEM', expected: e.approved_primary_target, category: catById(e.approved_primary_target), source: 'L1 OVERLAY_V2', folder: fd, title };
  if (e && e.corrected_scoring_unit === 'SUIT') return { kind: 'SUIT', expected: null, members: e.suit_component_targets.slice(), source: 'L1 OVERLAY_V2', folder: fd, title };
  const cat = fd ? FOLDER[fd] : undefined;
  if (cat === 'SUIT') return { kind: 'SUIT', expected: null, members: null, source: 'L2 folder 14_Suit', folder: fd, title };
  if (!cat) return { kind: 'NO_LABEL', expected: null, source: 'L2 folder ' + fd, folder: fd, title };
  const m = F.eligibleOf(envelope).filter((t) => F.catOf(t) === cat);
  return m.length === 1 ? { kind: 'ITEM', expected: m[0].target_id, category: cat, source: 'L2 folder ' + fd, folder: fd, title } : { kind: m.length ? 'LABEL_AMBIGUOUS' : 'NO_MATCHING_CANDIDATE', expected: null, category: cat, source: 'L2 folder ' + fd, folder: fd, title };
}
module.exports = { labelOf, FOLDER };
