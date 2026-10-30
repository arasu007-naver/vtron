'use strict';
/**
 * V1.2 D-5 — validation-only run record (order §12, §48). Binds a packet to its run identity for a later live validation run.
 *   · live fields (model_id, model_version, prompt_version, prompt_hash, run_id, timestamp, raw_output_sha256) may stay null during
 *     offline preparation; a record with any null REQUIRED identity field is marked formal_comparison_valid = false;
 *   · the record carries parameter outputs keyed "<parameter_id>[@<component_ref>]" (corrected inventory v1.1 ids), the
 *     admission list (routing, not a parameter), context metadata (product_context) and provenance;
 *   · no score / direction / verdict / Style ID key may appear (validated); no network, no model (G53).
 */
const crypto = require('crypto');
const C = require('./contracts');
const R = require('./registry');

const REQUIRED_IDENTITY = ['image_ref', 'image_hash', 'candidate_code_hash', 'inventory_version', 'prompt_version', 'prompt_hash', 'model_id', 'model_version', 'run_id', 'timestamp'];
const STYLE_ID = { look_observability: 'SVP-001', component_identity: 'SVP-002', identity_refinement: 'SVP-003', as_worn_front_state: 'SVP-004', component_colour: 'SVP-005', colour_composition_standing: 'SVP-006', final_upper_relation: 'SVP-007', final_shoulder_realization: 'SVP-008', final_upper_shape_behaviour: 'SVP-009', layer_relation: 'SVP-010', securing_constriction: 'SVP-011', canonical_physical_exposure: 'SVP-012' };
const ITEM_ORDER = ['grammar', 'trouser_distinction', 'silhouette', 'fit', 'shoulder_structure', 'shoulder_drop', 'asymmetry', 'length', 'sleeve_volume', 'shoulder_span', 'closure_type', 'front_opening_extent', 'collar', 'sleeve', 'shoulder_connection', 'pocket', 'pocket_construction', 'pocket_projection', 'waist_definition', 'slit', 'pattern', 'graphic', 'surface', 'material', 'decorative_detail', 'attachment'];
const ITEM_ID = Object.fromEntries(ITEM_ORDER.map((n, i) => [n, 'SVP-' + (101 + i)]));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Project a validated packet onto the 38-parameter output surface (ids of the corrected inventory v1.1). */
function projectParameters(packet) {
  const out = {};
  const put = (id, ref, state, value) => { out[ref ? id + '@' + ref : id] = value === undefined ? { observed_state: state } : { observed_state: state, observed_value: value }; };
  put(STYLE_ID.look_observability, null, packet.look_frame.state, packet.look_frame.limits);
  for (const e of packet.component_registry) {
    const ref = e.component_ref; const id = e.object_identity;
    put(STYLE_ID.component_identity, ref, id.state, id.value);
    if (e.footwear_product_family || e.object_subtype) { const r = e.footwear_product_family || e.object_subtype; put(STYLE_ID.identity_refinement, ref, r.state, r.state === 'OBSERVED' ? { family_or_subtype: r.value, ...(e.footwear_product_subtype ? { subtype: e.footwear_product_subtype.value } : {}) } : undefined); }
    if (e.front_state) put(STYLE_ID.as_worn_front_state, ref, e.front_state.state, e.front_state.value);
  }
  if (packet.colour_composition) {
    const g = packet.colour_composition; const per = {};
    for (const f of g.field) for (const r of f.carrier_refs) (per[r] = per[r] || []).push({ color_family: f.color_family, color_lightness: f.color_lightness, color_effect: f.color_effect, standing: 'field' });
    for (const p of g.points) if (p.carrier_ref.state === 'OBSERVED') (per[p.carrier_ref.value] = per[p.carrier_ref.value] || []).push({ color_family: p.color_family, color_lightness: p.color_lightness, color_effect: p.color_effect, standing: 'point', contrast_with_field: p.contrast_with_field, ...(p.carrier_part ? { carrier_part: p.carrier_part } : {}) });
    for (const u of g.unreadable || []) put(STYLE_ID.component_colour, u.carrier_ref, u.state);
    for (const [ref, list] of Object.entries(per)) { put(STYLE_ID.component_colour, ref, 'OBSERVED', list.map(({ standing, contrast_with_field, ...c }) => c)); put(STYLE_ID.colour_composition_standing, ref, 'OBSERVED', list.map((c) => ({ color_family: c.color_family, standing: c.standing, ...(c.contrast_with_field ? { contrast_with_field: c.contrast_with_field } : {}) }))); }
  }
  if (packet.upper_realization) { const u = packet.upper_realization; put(STYLE_ID.final_upper_relation, null, u.relation.state, u.relation.value); put(STYLE_ID.final_shoulder_realization, null, u.shoulder.state, u.shoulder.value); put(STYLE_ID.final_upper_shape_behaviour, null, u.shape_behaviour.state, u.shape_behaviour.value); }
  if (packet.relations.layer_relations.length) put(STYLE_ID.layer_relation, null, 'OBSERVED', packet.relations.layer_relations.map((l) => ({ over_ref: l.over_ref, under_ref: l.under_ref, revealed: l.revealed })));
  for (const s of packet.relations.securing_relations) put(STYLE_ID.securing_constriction, s.securing_ref, s.visible_constriction.state, { affected_ref: s.affected_ref, affected_region: s.affected_region });
  if (packet.canonical_exposure) put(STYLE_ID.canonical_physical_exposure, null, 'OBSERVED', packet.canonical_exposure.events.map((ev) => ({ region: ev.region, carrier_refs: ev.carrier_refs, attribution: ev.attribution })));
  for (const f of packet.component_fact_pool) {
    if (!ITEM_ID[f.fact]) continue;
    put(ITEM_ID[f.fact], f.component_ref, f.state, f.value);
    // INTEGRATED V1 (CA#29): SVP-117 / 118 keep their historical identity in the record but are projected FROM pocket.pockets[] (one instance →
    // scalar, several → list). The projection is a comparison aid for the sealed evaluator (reference v1_3 stores scalars); it is not an emission.
    if (f.fact === 'pocket' && f.pockets) { const pr = require('./integrated_pocket').projectScalars(f.pockets); out[ITEM_ID.pocket_construction + '@' + f.component_ref] = { ...pr.pocket_construction, projected_from: 'pocket.pockets[]' }; out[ITEM_ID.pocket_projection + '@' + f.component_ref] = { ...pr.pocket_projection, projected_from: 'pocket.pockets[]' }; out[ITEM_ID.pocket + '@' + f.component_ref].pockets = f.pockets; }
  }
  return out;
}

function buildRunRecord({ packet, validation, image_ref, image_hash, candidate_code_hash, prompt_version, prompt_hash, model_id, model_version, run_id, timestamp, route, raw_output_sha256 }) {
  if (!packet || !validation) throw new Error('RUN_RECORD_PACKET_REQUIRED');
  if (!validation.ok) throw new Error('RUN_RECORD_PACKET_INVALID: ' + validation.errors.join('; '));
  const rec = {
    record: 'STMX_FULL_LOOK_STYLE_VISION_VALIDATION_RUN_RECORD', record_version: 'V1',
    image_ref: image_ref || null, image_hash: image_hash || null, candidate_code_hash: candidate_code_hash || null,
    inventory_version: C.INVENTORY_VERSION, packet_version: C.PACKET_VERSION, prompt_version: prompt_version || null, prompt_hash: prompt_hash || null,
    model_id: model_id || null, model_version: model_version || null, run_id: run_id || null, timestamp: timestamp || null,
    route: route || packet.source_mode === 'A' ? 'C_ITEM_RAW_REUSE' : 'A_FULL_IMAGE', raw_output_sha256: raw_output_sha256 || null,
    source_mode: packet.source_mode, requested_axes: packet.requested_axes,
    admission: packet.component_registry.map((e) => e.component_ref),                 // routing record — not a parameter
    context_metadata: Object.fromEntries(packet.component_registry.filter((e) => e.product_context).map((e) => [e.component_ref, { product_context: e.product_context.value }])),
    parameters: projectParameters(packet),
    provenance: { pool_routes: Object.fromEntries(packet.component_fact_pool.map((f) => [f.component_ref + '.' + f.fact, f.route])), ownership_resolution: packet.ownership_resolution || [], packet_sha256: sha(JSON.stringify(packet)) },
  };
  rec.missing_identity = REQUIRED_IDENTITY.filter((k) => rec[k] === null || rec[k] === undefined);
  rec.formal_comparison_valid = rec.missing_identity.length === 0;
  const s = JSON.stringify(rec);
  if (/"[^"]*(score|direction|verdict|strength|tier|ordinal|style_id|styleid)[^"]*"\s*:/i.test(s)) throw new Error('RUN_RECORD_FORBIDDEN_KEY');
  if (/"(E|I|T|C|S|R|M|D)"/.test(s.replace(/"requested_axes":\[[^\]]*\]/, ''))) throw new Error('RUN_RECORD_AXIS_LETTER');
  return rec;
}

module.exports = { buildRunRecord, projectParameters, REQUIRED_IDENTITY, STYLE_ID, ITEM_ID, ITEM_ORDER };
