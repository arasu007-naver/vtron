'use strict';
/** Output validator for the Style Vision evidence packet (order §39). Returns { ok, errors[] }; never repairs. */
const C = require('./contracts');
const E = require('./envelope');
const DM = require('./dm_adapter');
const DMP = require('./dm_projection');
const T2 = require('./dm_transport_v2');                                   // RC4: DM Evidence Transport V2
const SUFFICIENCY_KEY_RE = /(sufficien|eligib|scorable|can_score|score_ready|scoring_ready|insufficient)/i;   // RC2: scoring-sufficiency vocabulary is never a packet key                                            // RC1: re-derivation of DMP-3 from the packet

const I = require('./integrated');
const { checkInstances } = require('./integrated_pocket');
const TOP_KEYS = ['packet_contract', 'packet_version', 'source_mode', 'requested_axes', 'look_frame', 'component_registry', 'ownership_resolution', 'relations', 'colour_composition', 'upper_realization', 'canonical_exposure', 'component_fact_pool', 'common_visibility', 'dm_evidence', 'dm_transport', 'dm_acquisition', 'request_trace'];   // INTEGRATED V1: + common_visibility · dm_block_withheld
const DM_ACQ_REASONS = [...C.DM_NOT_ACQUIRED_REASONS];                     // RC4: no withheld reason (Transport V2 delivers whenever admissible)
const SECURING_KEYS = ['securing_ref', 'affected_ref', 'affected_region', 'visible_constriction', 'device_is_own'];   // V1.3: device_is_own = CDM-03 S1 candidate carrier
const PARTIAL_KEYS = ['carrier_ref', 'color_family', 'role', 'unresolved', 'color_lightness', 'color_effect', 'contrast_with_field', 'carrier_part'];
const REGISTRY_KEYS = ['component_ref', 'object_identity', 'item_record_ref', 'front_state', 'footwear_product_family', 'footwear_product_subtype', 'object_subtype', 'attached_to', 'product_context'];
const PARTICIPATION_KEY_RE = /participat|admitted|eligib|excluded/i;                   // V1.2 D-4: participation is registry routing, never a packet field
const OWNERSHIP_KEYS = ['physical_object_ref', 'host_ref', 'host_item_token', 'resolution'];
const RESOLUTIONS = ['component_owns', 'distinct_physical_objects'];
const isGarmentValue = (v) => C.GARMENT_CATEGORIES.includes(v);
const isKindValue = (v) => C.NON_GARMENT_KINDS.includes(v);

function validatePacket(p) {
  const errors = []; const err = (m) => errors.push(m);
  try {
    if (p.packet_contract !== C.PACKET_CONTRACT || p.packet_version !== C.PACKET_VERSION) err('PACKET_IDENTITY');
    if (!['A', 'B', 'MIXED'].includes(p.source_mode)) err('SOURCE_MODE');
    for (const k of Object.keys(p)) if (!TOP_KEYS.includes(k)) err('UNEXPECTED_TOP_KEY: ' + k);
    // forbidden keys / values anywhere outside the frozen DM block
    const style = { ...p }; delete style.dm_evidence;   // RC4: the V2 DM record carries DM vocabulary (accent …) — checked by the DM rules, not the Style walk
    walk(style, (k, v, pathStr) => {
      if (C.VERDICT_KEY_RE.test(k)) err('FORBIDDEN_KEY ' + pathStr);
      if (SUFFICIENCY_KEY_RE.test(k)) err('SCORING_SUFFICIENCY_KEY ' + pathStr);   // RC2 (CEO 2026-10-15): the extractor never states whether scoring may proceed
      if (typeof v === 'string' && C.JUDGMENT_VALUE_RE.test(v)) err('JUDGMENT_VALUE ' + pathStr + '=' + v);
      if (typeof v === 'string' && /^(E|I|T|C|S|N|R|D|M)$/.test(v) && !/requested_axes/.test(pathStr)) err('AXIS_LETTER_VALUE ' + pathStr);
      if (typeof v === 'number') err('NUMERIC_FIELD ' + pathStr);                 // no number anywhere in Style evidence: no score, no count
    });
    // registry (V1.1: approved family domain · OTHER ≠ UNKNOWN · footwear D-2 fields · optional subtype legality · attached_to · no fake Item record)
    const refs = new Set(); const kindOf = {};
    for (const e of p.component_registry) {
      if (refs.has(e.component_ref)) err('DUPLICATE_COMPONENT_REF ' + e.component_ref); refs.add(e.component_ref);
      const id = e.object_identity;
      if (!C.STATES.includes(id.state)) err('IDENTITY_STATE ' + e.component_ref);
      if (id.state === 'OBSERVED' && !isGarmentValue(id.value) && !isKindValue(id.value)) err('IDENTITY_VALUE ' + id.value);
      if (id.state !== 'OBSERVED' && id.value !== undefined) err('IDENTITY_UNKNOWN_WITH_VALUE ' + e.component_ref);          // UNKNOWN is a state, never a value
      if (id.state === 'OBSERVED' && /^unknown$/i.test(String(id.value))) err('IDENTITY_UNKNOWN_AS_VALUE ' + e.component_ref);
      const garment = id.state === 'OBSERVED' && isGarmentValue(id.value); const kind = id.state === 'OBSERVED' && isKindValue(id.value) ? id.value : null;
      kindOf[e.component_ref] = garment ? 'GARMENT' : kind || 'UNKNOWN';
      if (e.item_record_ref !== undefined && !garment) err('ITEM_RECORD_ON_NON_GARMENT ' + e.component_ref);
      if (kind === 'footwear') {
        if (!e.footwear_product_family || !C.STATES.includes(e.footwear_product_family.state)) err('FOOTWEAR_PRODUCT_FAMILY_MISSING ' + e.component_ref);
        else if (e.footwear_product_family.state === 'OBSERVED' && !C.FOOTWEAR_PRODUCT_FAMILIES.includes(e.footwear_product_family.value)) err('FOOTWEAR_PRODUCT_FAMILY_VALUE ' + e.footwear_product_family.value);
        if (e.footwear_product_subtype) { const fam = e.footwear_product_family && e.footwear_product_family.state === 'OBSERVED' ? e.footwear_product_family.value : null; if (!fam || !(C.FOOTWEAR_PRODUCT_SUBTYPES[fam] || []).includes(e.footwear_product_subtype.value)) err('FOOTWEAR_PRODUCT_SUBTYPE_VALUE ' + e.component_ref); }
      } else if (e.footwear_product_family !== undefined || e.footwear_product_subtype !== undefined) err('FOOTWEAR_FIELD_ON_NON_FOOTWEAR ' + e.component_ref);
      if (e.object_subtype !== undefined) {
        if (!kind || kind === 'other' || kind === 'footwear') err('SUBTYPE_ON_UNIDENTIFIED ' + e.component_ref);
        else if (e.object_subtype.state !== 'OBSERVED' || !(C.OBJECT_SUBTYPES[kind] || []).includes(e.object_subtype.value)) err('OBJECT_SUBTYPE_VALUE ' + e.component_ref);
      }
      for (const f of ['footwear_product_family', 'footwear_product_subtype', 'object_subtype']) if (e[f] && e[f].value !== undefined && C.SUBTYPE_FORBIDDEN_RE.test(e[f].value)) err('SUBTYPE_SEMANTIC_TOKEN ' + e[f].value);
      if (e.attached_to !== undefined && garment) err('ATTACHED_GARMENT ' + e.component_ref);
      if (e.product_context !== undefined) { if (!garment) err('PRODUCT_CONTEXT_ON_NON_GARMENT ' + e.component_ref); else if (e.product_context.state !== 'OBSERVED' || !C.PRODUCT_CONTEXT_DOMAIN.includes(e.product_context.value)) err('PRODUCT_CONTEXT_VALUE ' + e.component_ref); }
      for (const k of Object.keys(e)) if (PARTICIPATION_KEY_RE.test(k)) err('PARTICIPATION_FIELD_IN_PACKET ' + k);
      if (e.front_state && e.front_state.state === 'OBSERVED' && !C.FRONT_STATES.includes(e.front_state.value)) err('FRONT_STATE_VALUE');
      for (const k of Object.keys(e)) if (!REGISTRY_KEYS.includes(k)) err('REGISTRY_KEY ' + k);
    }
    const known = (r) => refs.has(r);
    for (const e of p.component_registry) if (e.attached_to !== undefined) { if (!known(e.attached_to)) err('ATTACHED_TO_UNKNOWN_REF ' + e.component_ref); else if (kindOf[e.attached_to] !== 'GARMENT' && kindOf[e.attached_to] !== 'UNKNOWN') err('ATTACHED_TO_ACCESSORY ' + e.component_ref); }
    // ownership resolution (one physical object = one record)
    const attachedRefs = new Set(p.component_registry.filter((e) => e.attached_to !== undefined).map((e) => e.component_ref));
    const resolved = new Set();
    for (const o of p.ownership_resolution || []) {
      for (const k of Object.keys(o)) if (!OWNERSHIP_KEYS.includes(k)) err('OWNERSHIP_KEY ' + k);
      if (!known(o.physical_object_ref) || !known(o.host_ref)) err('OWNERSHIP_UNKNOWN_REF');
      if (!attachedRefs.has(o.physical_object_ref)) err('OWNERSHIP_WITHOUT_ATTACHED_OBJECT ' + o.physical_object_ref);
      if (!RESOLUTIONS.includes(o.resolution)) err('OWNERSHIP_RESOLUTION ' + o.resolution);
      if (o.host_item_token !== null && !C.ATTACHMENT_DOMAIN.includes(o.host_item_token)) err('OWNERSHIP_TOKEN ' + o.host_item_token);
      if (resolved.has(o.physical_object_ref)) err('OWNERSHIP_DUPLICATE ' + o.physical_object_ref); resolved.add(o.physical_object_ref);
      if (o.resolution === 'component_owns' && o.host_item_token) {
        const host = p.component_fact_pool.find((f) => f.component_ref === o.host_ref && f.fact === 'attachment');
        if (host && host.state === 'OBSERVED' && [].concat(host.value).includes(o.host_item_token)) err('PHYSICAL_OBJECT_DUPLICATED ' + o.physical_object_ref + ' / ' + o.host_ref);
      }
    }
    for (const r of attachedRefs) if (!resolved.has(r)) err('ATTACHED_OBJECT_UNRESOLVED ' + r);
    // frame
    if (!C.STATES.includes(p.look_frame.state)) err('FRAME_STATE');
    for (const t of p.look_frame.limits || []) if (!C.FRAME_TOKENS.includes(t)) err('FRAME_TOKEN ' + t);
    // relations
    for (const l of p.relations.layer_relations) { if (!known(l.over_ref) || !known(l.under_ref)) err('R1_UNKNOWN_REF'); if (!C.STATES.includes(l.state)) err('R1_STATE'); }
    const seenLayer = new Set();
    for (const l of p.relations.layer_relations) { const k = l.over_ref + '>' + l.under_ref; if (seenLayer.has(k)) err('R1_DUPLICATE_PAIR ' + k); if (seenLayer.has(l.under_ref + '>' + l.over_ref)) err('R1_CONTRADICTORY_PAIR ' + k); seenLayer.add(k); if (kindOf[l.over_ref] && kindOf[l.over_ref] !== 'GARMENT' && kindOf[l.over_ref] !== 'UNKNOWN') err('R1_ACCESSORY_IN_GARMENT_PAIR ' + l.over_ref); if (kindOf[l.under_ref] && kindOf[l.under_ref] !== 'GARMENT' && kindOf[l.under_ref] !== 'UNKNOWN') err('R1_ACCESSORY_IN_GARMENT_PAIR ' + l.under_ref); }   // CDM-05 B
    const ownRegions = new Set();
    for (const s of p.relations.securing_relations) {
      if (!known(s.securing_ref) || !known(s.affected_ref)) err('R2_UNKNOWN_REF'); if (!C.STATES.includes(s.visible_constriction.state)) err('R2_STATE');
      for (const k of Object.keys(s)) { if (/magnitude|degree/i.test(k)) err('R2_MAGNITUDE'); if (!SECURING_KEYS.includes(k)) err('R2_KEY ' + k); }
      if (s.device_is_own === true) { if (s.securing_ref !== s.affected_ref) err('R2_OWN_DEVICE_REFS_DIFFER ' + s.securing_ref); ownRegions.add(s.affected_ref + '|' + s.affected_region); }   // CDM-03 S1 candidate: own device = same ref
      else if (s.device_is_own !== undefined) err('R2_DEVICE_IS_OWN_NOT_BOOLEAN_TRUE'); else if (s.securing_ref === s.affected_ref) err('R2_SELF_RELATION_WITHOUT_OWN_DEVICE ' + s.securing_ref);
    }
    for (const s of p.relations.securing_relations) if (!s.device_is_own && ownRegions.has(s.affected_ref + '|' + s.affected_region)) err('R2_SAME_CAUSE_TWICE ' + s.affected_ref);
    for (const k of Object.keys(p.relations)) if (!['layer_relations', 'securing_relations'].includes(k)) err('RELATIONS_KEY ' + k);
    // colour (V1.1: any participant may carry; carrier_part = Colour V1 provenance sub-fields, never a component ref; completeness)
    if (p.colour_composition) {
      const g = p.colour_composition; const covered = new Set();
      for (const f of g.field) { if (!C.COLOUR_FAMILIES.includes(f.color_family)) err('G1_FAMILY'); if (f.carrier_part !== undefined) err('G1_PART_ON_FIELD'); for (const r of f.carrier_refs) { if (!known(r)) err('G1_FIELD_CARRIER ' + r); covered.add(r); } }
      const seen = new Set();
      for (const pt of g.points) {
        if (!C.COLOUR_FAMILIES.includes(pt.color_family) || !C.CONTRAST.includes(pt.contrast_with_field)) err('G1_POINT_DOMAIN');
        if (typeof pt.carrier_ref !== 'object' || !C.STATES.includes(pt.carrier_ref.state)) err('G1_POINT_CARRIER_SHAPE');
        else if (pt.carrier_ref.state === 'OBSERVED') { if (!known(pt.carrier_ref.value)) err('G1_POINT_CARRIER ' + pt.carrier_ref.value); else covered.add(pt.carrier_ref.value); }
        if (pt.carrier_part !== undefined) {
          const cp = pt.carrier_part;
          if (!cp || typeof cp !== 'object' || Object.keys(cp).sort().join(',') !== 'carrier_kind,carrier_ref') err('G1_CARRIER_PART_SHAPE');
          else { if (!C.CARRIER_KINDS.includes(cp.carrier_kind)) err('G1_CARRIER_PART_KIND ' + cp.carrier_kind); if (typeof cp.carrier_ref !== 'string' || known(cp.carrier_ref)) err('G1_CARRIER_PART_REF_IS_COMPONENT'); }
        }
        for (const k of Object.keys(pt)) if (!['color_family', 'color_lightness', 'color_effect', 'carrier_ref', 'contrast_with_field', 'carrier_part'].includes(k)) err('G1_POINT_KEY ' + k);
        const k = [pt.carrier_ref.value, pt.color_family, pt.color_effect].join('|'); if (seen.has(k)) err('G1_DUPLICATE_PHENOMENON ' + k); seen.add(k);
      }
      for (const u of g.unreadable || []) { if (!known(u.carrier_ref)) err('G1_UNREADABLE_CARRIER ' + u.carrier_ref); if (!['NOT_VISIBLE', 'UNKNOWN'].includes(u.state)) err('G1_UNREADABLE_STATE'); covered.add(u.carrier_ref); }
      for (const q of g.partial || []) {                                                  // V1.3 partial-colour candidate carrier
        if (!known(q.carrier_ref)) err('G1_PARTIAL_CARRIER ' + q.carrier_ref); else covered.add(q.carrier_ref);
        if (!C.COLOUR_FAMILIES.includes(q.color_family)) err('G1_PARTIAL_FAMILY'); if (!['field', 'point'].includes(q.role)) err('G1_PARTIAL_ROLE');
        if (!Array.isArray(q.unresolved) || !q.unresolved.length || q.unresolved.some((x) => !C.PARTIAL_COLOUR_UNRESOLVED.includes(x))) err('G1_PARTIAL_UNRESOLVED_LIST');
        else { if (q.unresolved.includes('color_lightness') && q.color_lightness !== undefined) err('G1_PARTIAL_LIGHTNESS_BOTH'); if (q.unresolved.includes('color_effect') && q.color_effect !== undefined) err('G1_PARTIAL_EFFECT_BOTH'); if (q.unresolved.includes('contrast_with_field') && q.contrast_with_field !== undefined) err('G1_PARTIAL_CONTRAST_BOTH'); }
        if (q.color_lightness !== undefined && !C.COLOUR_LIGHTNESS.includes(q.color_lightness)) err('G1_PARTIAL_LIGHTNESS'); if (q.color_effect !== undefined && !C.COLOUR_EFFECT.includes(q.color_effect)) err('G1_PARTIAL_EFFECT');
        for (const k of Object.keys(q)) if (!PARTIAL_KEYS.includes(k)) err('G1_PARTIAL_KEY ' + k);
      }
      for (const k of Object.keys(g)) if (!['state', 'limitation_frame', 'field', 'points', 'suppressed', 'unreadable', 'partial'].includes(k)) err('G1_KEY ' + k);
      if (g.state === 'OBSERVED') for (const r of refs) if (!covered.has(r)) err('G1_NO_COLOUR_OPPORTUNITY ' + r);
    }
    // DM acquisition status (candidate; outside the DM record). RC4: present ONLY when DM was requested and no V2 record was delivered
    if (p.dm_acquisition !== undefined) {
      const a = p.dm_acquisition;
      if (!a || a.status !== 'NOT_ACQUIRED') err('DM_ACQUISITION_STATUS');
      else if (!DM_ACQ_REASONS.includes(a.reason)) err('DM_ACQUISITION_REASON ' + a.reason);
      if (p.dm_evidence) err('DM_ACQUISITION_CONTRADICTS_BLOCK');
      for (const k of Object.keys(a || {})) if (!['status', 'reason'].includes(k)) err('DM_ACQUISITION_KEY ' + k);
    } else if (p.requested_axes.includes('DM') && !p.dm_evidence) err('DM_ACQUISITION_MISSING');
    // upper realization
    if (p.upper_realization) {
      const u = p.upper_realization;
      for (const k of Object.keys(u)) if (!['source_refs', 'relation', 'shoulder', 'shape_behaviour'].includes(k)) err('SR_UPPER_KEY ' + k);
      try { E.check(u.relation, C.UPPER_FIT_DOMAIN, 'G-4'); E.check(u.shoulder, C.SHOULDER_DOMAIN, 'G-5'); E.check(u.shape_behaviour, C.G6_DOMAIN, 'G-6'); } catch (e) { err(e.message); }
      if (u.shape_behaviour.ambiguity && u.shape_behaviour.state === 'OBSERVED' && u.shape_behaviour.ambiguity.slice().sort().join('|') === C.G6_AMBIGUOUS_PAIR.slice().sort().join('|')) err('G6_MIDDLE_AMBIGUITY_NOT_FAILED_CLOSED');
      for (const r of u.source_refs || []) if (!known(r)) err('SR_SOURCE_REF ' + r);
    }
    // canonical exposure
    if (p.canonical_exposure) {
      const keys = new Set();
      for (const ev of p.canonical_exposure.events) {
        if (!C.EXPOSURE_REGIONS.includes(ev.region)) err('EXPOSURE_REGION');
        for (const r of ev.carrier_refs) { if (!known(r)) err('EXPOSURE_CARRIER ' + r); else if (kindOf[r] !== 'GARMENT' && kindOf[r] !== 'UNKNOWN') err('EXPOSURE_CARRIER_NON_GARMENT ' + r); }   // sheer hosiery ≠ exposure
        const k = ev.region + '|' + ev.carrier_refs.slice().sort().join('+'); if (keys.has(k)) err('DUPLICATE_EXPOSURE_EVENT ' + k); keys.add(k);
        if (!ev.sources || !ev.sources.length) err('EXPOSURE_NO_SOURCE');
      }
    }
    // pool
    const poolKeys = new Set();
    const poolOf = (ref, fact) => p.component_fact_pool.find((x) => x.component_ref === ref && x.fact === fact);
    for (const f of p.component_fact_pool) {
      if (!known(f.component_ref)) err('POOL_UNKNOWN_REF ' + f.component_ref);
      if (!C.REQUESTABLE_FACTS.includes(f.fact)) err('POOL_NON_REQUESTABLE_FACT ' + f.fact);
      // INTEGRATED V1 — CA#29 nested carrier · conditional triggers · observation-group provenance
      if (I.NESTED_FACTS[f.fact]) err('RETIRED_SCALAR_IN_POOL ' + f.component_ref + '.' + f.fact + ' (CA#29: morphology lives in pocket.pockets[])');
      if (f.fact === 'pocket') {
        if (f.state === 'OBSERVED' && f.value === 'Present') { if (!f.pockets) err('POCKET_PRESENT_WITHOUT_INSTANCES ' + f.component_ref + ' (CA#29)'); else { try { checkInstances(f.pockets, f.component_ref + '.pocket.pockets'); } catch (e) { err(e.message); } } }
        else if (f.pockets !== undefined) err('POCKET_INSTANCES_WITHOUT_PRESENT ' + f.component_ref);
      }
      if (f.pockets !== undefined && f.fact !== 'pocket') err('POCKETS_ON_NON_POCKET_FACT ' + f.component_ref + '.' + f.fact);
      const gate = I.CONDITIONAL_GATES[f.fact];
      if (gate && f.state !== C.NOT_APPLICABLE) { const cat = (p.component_registry.find((e) => e.component_ref === f.component_ref) || {}).object_identity; const catV = cat && cat.state === 'OBSERVED' ? cat.value : null; if (catV && (!gate.categories || gate.categories.includes(catV))) { const parent = poolOf(f.component_ref, gate.parent); if (parent && gate.na_when(parent)) err('CONDITIONAL_TRIGGER_VIOLATED ' + f.component_ref + '.' + f.fact + ' (' + gate.parent + '=' + parent.value + ')'); } }
      if (f.fact === 'slit') { const cat = (p.component_registry.find((e) => e.component_ref === f.component_ref) || {}).object_identity; if (!cat || cat.state !== 'OBSERVED' || !I.SLIT_CATEGORIES.includes(cat.value)) err('SLIT_OUTSIDE_SKIRT_DRESS ' + f.component_ref); }
      if (!I.GROUPS.includes(f.observation_group)) err('POOL_OBSERVATION_GROUP_MISSING ' + f.component_ref + '.' + f.fact);
      if (f.observation_group !== I.GROUP_OF_FACT[f.fact]) err('POOL_OBSERVATION_GROUP_WRONG ' + f.component_ref + '.' + f.fact);
      if (f.fact === 'product_context') err('PRODUCT_CONTEXT_STORED_AS_FACT ' + k);
      const k = f.component_ref + '.' + f.fact; if (poolKeys.has(k)) err('POOL_DUPLICATE ' + k); poolKeys.add(k);
      if (f.state === C.NOT_APPLICABLE) err('POOL_STORED_NOT_APPLICABLE ' + k);
      if (kindOf[f.component_ref] && kindOf[f.component_ref] !== 'GARMENT') {         // garment applicability firewall (B): accessory / UNKNOWN components carry appearance facts only, observed, no Item lineage
        if (!C.ACCESSORY_APPEARANCE_FACTS.includes(f.fact)) err('POOL_GARMENT_FACT_ON_NON_GARMENT ' + k);
        if (f.route !== 'observed' || f.lineage !== undefined || f.source === 'item_record') err('POOL_FAKE_ITEM_LINEAGE ' + k);
      }
      try { E.check({ state: f.state, value: f.value, limitation: f.limitation, route: f.route, source: f.source, lineage: f.lineage }); } catch (e) { err('POOL_ENVELOPE ' + k + ': ' + e.message); }
      if (f.lineage && Object.keys(f.lineage).some((x) => x !== 'item_record_ref')) err('POOL_LINEAGE_ILLEGAL ' + k);
    }
    for (const ref of refs) { const n = p.component_fact_pool.filter((f) => f.component_ref === ref).length; if (n > C.REQUESTABLE_FACTS.length) err('POOL_EXCEEDS_REQUESTABLE ' + ref); }
    // RC4 — DM Evidence Transport V2 (CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2.md)
    if (p.dm_evidence) {
      const e = p.dm_evidence;
      for (const k of Object.keys(e)) if (!T2.EVIDENCE_KEYS.includes(k)) err('DM_EVIDENCE_KEY ' + k);
      if (e.transport_contract !== T2.TRANSPORT_CONTRACT) err('DM_TRANSPORT_CONTRACT ' + e.transport_contract);
      if (!p.dm_transport || !p.dm_transport.authority || p.dm_transport.authority.v1_freeze.sha256 !== DM.AUTHORITY.sha256 || p.dm_transport.authority.v2_transport.sha256 !== T2.AUTHORITY_V2.sha256) err('DM_AUTHORITY_PIN');
      else if (T2.fingerprint(e) !== p.dm_transport.output_fingerprint) err('DM_OUTPUT_MUTATED');
      if (!Array.isArray(e.look_components) || !Array.isArray(e.look_detail_systems)) err('DM_EVIDENCE_SHAPE');
      else {
        let carriers = null; try { carriers = DMP.checkSystems(e.look_detail_systems, p.component_registry); } catch (x) { err('DM_SYSTEM_INADMISSIBLE ' + x.message); }
        for (const c of e.look_components) if (!known(c.component_ref)) err('DM_CARRIER_UNKNOWN ' + c.component_ref);
        if (carriers && e.look_components.map((c) => c.component_ref).join() !== carriers.join()) err('DM_COMPONENTS_NOT_ASSEMBLED_FROM_SYSTEMS');   // DMP-1 = ∪ carrier_refs, first-appearance order
      }
      // DMP-3: metadata re-derived from the packet's own look-level record — never invented, never a gate
      const v = e.dm_evidence_visibility; const der = DMP.mapVisibility(p.look_frame).value;
      if (!v || !T2.VISIBILITY_STATES.includes(v.state) || Object.keys(v).some((k) => !['state', 'value'].includes(k))) err('DM_VISIBILITY_ENVELOPE');
      else if (v.state === 'OBSERVED') { if (der !== v.value) err(v.value === 'adjudicable' ? 'DM_ADJUDICABLE_FROM_ABSENCE (adjudicable not derivable from the common record: ' + der + ')' : 'DM_VISIBILITY_NOT_DERIVED_FROM_COMMON_RECORD ' + der); }
      else { if (v.value !== undefined) err('DM_VISIBILITY_UNKNOWN_WITH_VALUE'); if (der !== null) err('DM_VISIBILITY_DERIVABLE_BUT_UNKNOWN ' + der); }
    } else if (p.dm_transport) err('DM_TRANSPORT_WITHOUT_EVIDENCE');
    if (JSON.stringify(style).includes('look_detail_systems')) err('DM_SEMANTIC_DUPLICATED_OUTSIDE_DM_BLOCK');
    // common visibility = provenance of the G1 reading (no new observation)
    if (p.common_visibility) { const v = p.common_visibility; if (v.look_frame_state !== p.look_frame.state || JSON.stringify(v.look_frame_limits) !== JSON.stringify(p.look_frame.limits)) err('COMMON_VISIBILITY_FRAME_MISMATCH'); const nv = p.component_fact_pool.filter((f) => f.state === 'NOT_VISIBLE').length, un = p.component_fact_pool.filter((f) => f.state === 'UNKNOWN').length; if ((v.facts_not_visible || []).length !== nv || (v.facts_unknown || []).length !== un) err('COMMON_VISIBILITY_POOL_MISMATCH'); }
    else if (p.component_fact_pool) err('COMMON_VISIBILITY_MISSING');
  } catch (e) { err('VALIDATOR_EXCEPTION: ' + e.message); }
  return { ok: errors.length === 0, errors };
}
function walk(o, fn, p) { const base = p || ''; if (Array.isArray(o)) { o.forEach((v, i) => walk(v, fn, base + '[' + i + ']')); return; } if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) { fn(k, v, base + '.' + k); walk(v, fn, base + '.' + k); } } }

module.exports = { validatePacket };
