'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — TEST FIXTURES (TEST SIDE ONLY — the runtime never requires this file). CANDIDATE.
 * Populations (order §13), kept separate:
 *   P1  stored Item Vision V1.3 outputs — the 15 VLV records (expired G53 exception; no new call), 8 images · DM block present · no colour
 *   P1C P1 + the stored Colour V1 of the SAME image (byte-identical source image hash) for a garment whose category is unique on both sides — cross-call
 *       association, test provenance only (the runtime itself only accepts colour keyed to its own envelope's target ids)
 *   P2  CEO calibration corpus RAW evidence only: identity.ref_id · identity.source_image_hash · raw_vision (latest extraction envelope) · raw_colour (Colour V1 keyed
 *       by garment_ref = target_id; an un-keyed single object only when the envelope has exactly one eligible garment). ⛔ ceo_ground_truth / ceo_adjudication /
 *       canonical_observation / score_rationale / scoring_units are NEVER read here. Pre-V1.3 extractions carry no DM block.
 *   P3  governed product identity for test provenance: EI V2 R5 OVERLAY_V2 (approved_primary_target · suit_component_targets) — never a runtime input
 *   P4  synthetic structural / negative controls derived in the tests (labelled; never counted as real-image validation)
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', '..') + '/';
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8')); const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const LIVE = ROOT + '04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_VISION_V1_3_G53_LIMITED_LIVE_VALIDATION_AND_SR_V2_R3_INTEGRATION_V1/_raw/processed/';
const IMAGES = 'C:/STMX_UPLOAD/STMX_VISION_SCORING_TEST_IMAGES_COMPLETE_20260928/01_IMAGES/';
const CORPUS = ROOT + '02_DATABASE_AND_CORPUS/CANONICAL_CORPUS/STMX_CEO_CALIBRATION_CORPUS/MASTER/STMX_CEO_CALIBRATION_CORPUS.jsonl';
const OVERLAY = ROOT + '01_ENGINES/ITEM_SCORING_ENGINE/STMX_EI_ENGINE_V2_DIRECTION_REASON_CANDIDATE_R5/contracts/EI_V2_HISTORICAL_PRODUCT_IDENTITY_OVERLAY_V2.json';
const catOf = (t) => (t && t.record && t.record.category && t.record.category.state === 'OBSERVED' ? t.record.category.value : null);
const eligibleOf = (env) => env.targets.filter((t) => t.eligible === true && t.record && t.record.observations && catOf(t));

let P1 = null, P2 = null;
function live() {
  if (P1) return clone(P1);
  P1 = fs.readdirSync(LIVE).filter((f) => /_producer_output\.json$/.test(f)).sort().map((f) => { const j = J(LIVE + f); return { id: 'P1|' + f.slice(0, 6), ref: j.ref, file: f, envelope: j.runProducer_returned.envelope }; });
  return clone(P1);
}
function corpusRaw() {
  if (P2) return clone(P2);
  const lines = fs.readFileSync(CORPUS, 'utf8').split(/\r?\n/).filter(Boolean);
  P2 = lines.map((l) => { const r = JSON.parse(l); const raw = { ref: r.identity.ref_id, image_sha256: r.identity.source_image_hash, raw_vision: r.raw_vision, raw_colour: r.raw_colour };   /* only raw evidence is kept */
    const ex = (raw.raw_vision.extractions || []).slice().reverse().find((e) => (e.envelope && e.envelope.targets) || (e.raw_envelope && e.raw_envelope.targets)); if (!ex) return null;
    const envelope = clone(ex.envelope || ex.raw_envelope); envelope.image_id = envelope.image_id || raw.ref;
    const c = raw.raw_colour && raw.raw_colour.colour_v1; const colours = {}; let colour_shape = 'none';
    if (Array.isArray(c)) { colour_shape = 'keyed'; for (const x of c) if (x && x.garment_ref && x.colour_observation && envelope.targets.some((t) => t.target_id === x.garment_ref)) colours[x.garment_ref] = clone(x.colour_observation); }
    else if (c && typeof c === 'object') { colour_shape = 'single_unkeyed'; const el = eligibleOf(envelope); if (el.length === 1) colours[el[0].target_id] = clone(c); }
    return { id: 'P2|' + raw.ref, ref: raw.ref, image_sha256: raw.image_sha256, envelope, colours, colour_shape, extraction_generation: ex.generation || null }; }).filter(Boolean);
  return clone(P2);
}
/** P1C — stored V1.3 envelope + stored Colour V1 of the same image (hash-equal) for a garment whose category is unique in both envelopes */
function liveWithSameImageColour() {
  const C2 = new Map(corpusRaw().map((r) => [r.ref, r]));
  return live().map((x) => { const img = fs.readdirSync(IMAGES).find((f) => f.startsWith(x.ref + '__')); const c = C2.get(x.ref); const colours = {}; const assoc = [];
    if (img && c && sha(IMAGES + img) === c.image_sha256) {
      for (const t of eligibleOf(x.envelope)) { const cat = catOf(t); const same = eligibleOf(x.envelope).filter((u) => catOf(u) === cat); const other = eligibleOf(c.envelope).filter((u) => catOf(u) === cat);
        if (same.length === 1 && other.length === 1 && c.colours[other[0].target_id]) { colours[t.target_id] = clone(c.colours[other[0].target_id]); assoc.push({ v13_target: t.target_id, corpus_target: other[0].target_id, category: cat }); } } }
    return Object.assign(x, { id: x.id.replace('P1|', 'P1C|'), colours, colour_association: assoc.length ? { basis: 'SAME_IMAGE_SHA256 + UNIQUE_CATEGORY (cross-call, test provenance)', pairs: assoc } : null }); });
}
function overlayIdentities() {
  const OV = J(OVERLAY); return OV.entries.filter((e) => ['ITEM', 'SUIT'].includes(e.corrected_scoring_unit)).map((e) => ({ unit: e.record_id, ref: e.record_id.split('#')[0], type: e.corrected_scoring_unit, primary_target: e.approved_primary_target || null, suit_members: e.suit_component_targets && e.suit_component_targets.length ? e.suit_component_targets.slice() : null }));
}
module.exports = { live, corpusRaw, liveWithSameImageColour, overlayIdentities, catOf, eligibleOf, clone, ROOT };
