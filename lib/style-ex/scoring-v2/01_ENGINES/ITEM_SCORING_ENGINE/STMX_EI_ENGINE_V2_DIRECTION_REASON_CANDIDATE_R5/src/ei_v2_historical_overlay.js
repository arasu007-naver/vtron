'use strict';
/* STMX ITEM EI V2 — CANDIDATE R5. HISTORICAL PRODUCT-IDENTITY OVERLAY APPLIER (data adapter for the historical regression corpus — NOT part of the scoring path).
   Uses contracts/EI_V2_HISTORICAL_PRODUCT_IDENTITY_OVERLAY_V2.json (successor of the R4 OVERLAY_V1). Two record kinds:
     MATCHING_PAIR_INPUT — a historical set input file ({members[]}) → ITEM_PRODUCT (SUIT or ITEM);
     GARMENT_INPUT       — a historical single-garment input file ({input}) → ITEM_PRODUCT ITEM (e.g. a restored per-target colour), or the explicit disposition
                           HISTORICAL_UNIT_SUPERSEDED (a styling garment that is not the merchandise item; excluded from the active product set — no direction is produced).
     · the file bytes must hash to the entry's original_record_hash (else refused — the overlay never applies to an unknown record version);
     · each colour correction must hash to its value_sha256 and name an existing target (else refused).
   The entry is selected by its record id because the overlay IS the versioned historical product mapping; no scoring rule reads a record id, and no entry carries a
   direction, force or Neutral value. Records without an entry are not addressed here (callers keep their original GARMENT request). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const OVERLAY = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'contracts', 'EI_V2_HISTORICAL_PRODUCT_IDENTITY_OVERLAY_V2.json'), 'utf8'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex'); const clone = (x) => JSON.parse(JSON.stringify(x));
const entryOf = (recordId) => OVERLAY.entries.find((x) => x.record_id === recordId) || null;
function productRequestFromHistorical(fileBytes, recordId) {
  const e = entryOf(recordId); if (!e) return { ok: false, error: 'NO_OVERLAY_ENTRY' };
  const buf = Buffer.isBuffer(fileBytes) ? fileBytes : Buffer.from(String(fileBytes), 'utf8');
  if (sha(buf) !== e.original_record_hash) return { ok: false, error: 'ORIGINAL_RECORD_HASH_MISMATCH', entry: e.record_id };
  if (e.corrected_scoring_unit === 'HISTORICAL_UNIT_SUPERSEDED') return { ok: false, superseded: true, error: 'HISTORICAL_UNIT_SUPERSEDED', entry: e.record_id, product_unit_of_the_reference: (e.product_unit_of_the_reference || []).slice() };
  const pk = JSON.parse(buf.toString('utf8'));
  let targets;
  if (e.record_kind === 'MATCHING_PAIR_INPUT') targets = (pk.members || []).map((m) => ({ target_id: m.member_id, input: { category: m.category, observations: clone(m.observations), color_observation: clone(m.color_observation) } }));
  else if (e.record_kind === 'GARMENT_INPUT') { if (!pk.input || typeof e.scored_target !== 'string') return { ok: false, error: 'GARMENT_INPUT_SHAPE', entry: e.record_id }; targets = [{ target_id: e.scored_target, input: clone(pk.input) }]; }
  else return { ok: false, error: 'UNKNOWN_RECORD_KIND', entry: e.record_id };
  for (const c of e.colour_corrections || []) { if (sha(JSON.stringify(c.color_observation)) !== c.value_sha256) return { ok: false, error: 'COLOUR_CORRECTION_HASH_MISMATCH', entry: e.record_id }; const t = targets.find((x) => x.target_id === c.target_id); if (!t) return { ok: false, error: 'COLOUR_CORRECTION_TARGET_MISSING', entry: e.record_id }; t.input.color_observation = clone(c.color_observation); }
  const product_identity = e.corrected_scoring_unit === 'SUIT' ? { merchandise_type: 'SUIT', suit_component_target_ids: e.suit_component_targets.slice() } : e.corrected_scoring_unit === 'ITEM' ? { merchandise_type: 'ITEM', primary_target_id: e.approved_primary_target } : null;
  if (!product_identity) return { ok: false, error: 'UNKNOWN_CORRECTED_UNIT', entry: e.record_id };
  return { ok: true, entry: e.record_id, record_kind: e.record_kind, corrected_scoring_unit: e.corrected_scoring_unit, applied_colour_corrections: (e.colour_corrections || []).length, request: { scoring_unit_type: 'ITEM_PRODUCT', product_identity, targets } };
}
module.exports = { productRequestFromHistorical, entryOf, OVERLAY };
