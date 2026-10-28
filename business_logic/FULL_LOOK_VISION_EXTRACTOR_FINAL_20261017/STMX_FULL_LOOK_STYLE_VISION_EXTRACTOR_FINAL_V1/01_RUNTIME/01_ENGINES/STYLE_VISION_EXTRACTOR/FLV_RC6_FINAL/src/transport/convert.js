'use strict';
/**
 * V1.3 transport — stage 2: parsed model output (any of the shapes Prompt V1.2 produced) → the canonical fixture-shaped case the
 * FixtureProvider reads (STMX_FULL_LOOK_STYLE_VISION_PHASE1_OUTPUT_SCHEMA_V1 mirror + optional dm_subsystem).
 *
 * Contract (CEO order 2026-10-11 §4): deterministic · fully traceable · non-lossy where authorized · no invented visual fact ·
 * no implicit ABSENT from a missing field · UNKNOWN never becomes a value · no unsupported vocabulary substitution · no confidence
 * → truth · no correction toward a reference. Concretely:
 *   STRUCTURE ONLY   key renames (over_ref → over …), envelope unwrapping ({state,value} → contract value), list / map reshaping,
 *                    a non-MULTI fact given as a one-element array becomes the scalar (representation, not value); a MULTI fact keeps the
 *                    representation the model emitted (the evaluator / reference representation contract, CDM-18, is pending).
 *   NOTHING INVENTED a missing fact is NOT_EMITTED (listed; the pool later reads it as UNKNOWN — never ABSENT); an OBSERVED state
 *                    without a value is UNCONVERTIBLE; a value outside its governed domain is UNCONVERTIBLE (raw kept in the log, the
 *                    fact is not emitted); a free-text colour `part` is kept in the log and NOT mapped unless it IS a Colour V1 token.
 *   PARTICIPATION    an object listed under `components` / `objects` without `participates` is a participant BECAUSE the model listed
 *                    it there (the prompt's own rule); the default is logged. Objects under `excluded` become x-refs (participates false).
 *   DM               a `dm_subsystem` key is passed through verbatim for the frozen adapter; when absent the case carries
 *                    dm_acquisition_reason = PROMPT_V1_2_HAS_NO_DM_SECTION (Prompt V1.2 never asked for DM evidence).
 * Every transformation is a log entry { kind, where, detail, raw? }. `unconvertible[]` and `not_emitted[]` are first-class outputs.
 * CDM-15 is pending: this converter is an ISOLATED CANDIDATE (contracts.CANDIDATE_CARRIERS.transport_conversion); it changes only the
 * transport representation, never evidence semantics (see TRANSPORT_SCHEMA_V1_3_CANDIDATE.json for the exact contract differences).
 */
const C = require('../contracts');
const ITEM = C.ITEM;
const ITEM_FACTS = new Set(['category', 'trouser_distinction', 'silhouette', 'fit', 'length', 'fabric_behavior', 'waist_definition', 'sleeve', 'shoulder_connection', 'shoulder_span', 'shoulder_drop', 'shoulder_structure', 'neckline_shape', 'neckline_position', 'collar', 'cuff_type', 'rib_hem', 'hood', 'front_opening_extent', 'closure_type', 'pocket', 'pocket_construction', 'pocket_projection', 'cuff_scale', 'material', 'surface', 'pattern', 'graphic', 'asymmetry', 'slit', 'ruffle', 'decorative_detail', 'attachment', 'exposure_opening', 'grammar', 'sleeve_volume', 'collar_scale']);
const MULTI = new Set(ITEM.MULTI);
const TOP_ALLOWED = ['frame', 'objects', 'front_state', 'layer_relations', 'securing_relations', 'colour_areas', 'colour_unreadable', 'upper', 'exposure_supplement', 'facts', 'dm_subsystem', 'prompt_version', 'schema'];
const FORBIDDEN_RE = /"[^"]*(score|direction|verdict|strength|tier|ordinal|style_id|styleid|product_context)[^"]*"\s*:/i;
const COLOUR_PART_TOKENS = new Map([...C.ITEM.VALUE_DOMAINS.attachment.map((t) => [t.toLowerCase(), { carrier_kind: 'attachment', carrier_ref: t }]), ...['Piping', 'Collar', 'Cuff', 'Waistband', 'Panel', 'Strap'].map((t) => [t.toLowerCase(), { carrier_kind: 'generic_descriptor', carrier_ref: t }])]);

function domainOf(category, fact) {
  if (fact === 'fit') return ITEM.fitDomain(category); if (fact === 'length') return ITEM.lengthDomain(category); if (fact === 'silhouette') return ITEM.silhouetteDomain(category);
  const d = ITEM.VALUE_DOMAINS[fact]; return d ? d.slice() : null;
}
const isState = (s) => C.STATES.includes(s);
const STITCH_PART_RE = /stitch|thread/i;   // RC6: the two Colour V1 L89 terms that map onto the existing suppression token 'stitching' (no new token)

/**
 * RC5 D-EX04-2 — footwear subtype key (one governed path). Prompt V2 (SVP-003, output template line 95) and the native checker (8a OBJ_KEYS) carry a
 * footwear subtype under `subtype`; the registry (D-2, registry.js footwearFields) reads it only as `product_subtype` and rejects `subtype` on footwear.
 * The value is NOT judged here — the registry keeps validating it against contracts.FOOTWEAR_PRODUCT_SUBTYPES under the product family (an illegal value
 * is then a local fact error, isolated by src/isolation.js, the family standing). Equivalent keys → one record; conflicting keys → neither is chosen:
 * the subtype is withheld (Prompt V2: "unsettled subtype → omitted, family stands") and the conflict is UNCONVERTIBLE with both raw values.
 */
function normalizeFootwearSubtype(r, x, refinement, L, U) {
  const fromRef = refinement && typeof refinement === 'object' && refinement.state === 'OBSERVED' ? refinement.product_subtype : undefined;
  const ps = x.product_subtype !== undefined ? x.product_subtype : fromRef; const s = r.subtype;
  if (s === undefined && ps === undefined) return;
  delete r.subtype;
  if (s !== undefined && ps === undefined) { r.product_subtype = s; L('FOOTWEAR_SUBTYPE_NORMALIZED', x.ref, 'footwear `subtype` (prompt V2 SVP-003 · native 8a key) → registry key `product_subtype`; value unchanged, validated by the registry (D-2)', s); }
  else if (s === undefined) { r.product_subtype = ps; L('FOOTWEAR_PRODUCT_SUBTYPE_CARRIED', x.ref, '`product_subtype` emitted directly — carried unchanged', ps); }
  else if (s === ps) { r.product_subtype = s; L('FOOTWEAR_SUBTYPE_DEDUPLICATED', x.ref, '`subtype` and `product_subtype` emitted with the same value → one record', s); }
  else U(x.ref + '.product_subtype', 'FOOTWEAR_SUBTYPE_CONFLICT (subtype ≠ product_subtype — neither chosen; subtype withheld, family stands)', { subtype: s, product_subtype: ps });
}

function convertModelOutput(o) {
  const log = []; const unconvertible = []; const not_emitted = [];
  const L = (kind, where, detail, raw) => log.push(raw === undefined ? { kind, where, detail } : { kind, where, detail, raw });
  const U = (where, reason, raw) => { unconvertible.push({ where, reason, raw }); L('UNCONVERTIBLE', where, reason, raw); };
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('CONVERT_NOT_AN_OBJECT');
  if (FORBIDDEN_RE.test(JSON.stringify(o))) throw new Error('CONVERT_FORBIDDEN_KEY (score / direction / verdict / product_context must not be transported)');
  const out = {}; const variant = {};
  for (const k of Object.keys(o)) if (!TOP_ALLOWED.includes(k)) U('top.' + k, 'TOP_LEVEL_KEY_NOT_IN_CONTRACT', o[k]);
  for (const k of ['prompt_version', 'schema']) if (k in o) L('DROP_TOP_LEVEL_META', k, 'transport metadata, not evidence', o[k]);
  // ---- frame
  const f = o.frame || {}; let fr = f.look_observability ? (L('UNWRAP', 'frame', 'frame.look_observability → frame'), f.look_observability) : f;
  variant.frame = f.look_observability ? 'wrapped' : 'flat';
  if (!isState(fr.state)) { U('frame.state', 'STATE_OUTSIDE_DOMAIN', fr.state); out.frame = { state: 'UNKNOWN', limits: [] }; L('FAIL_CLOSED', 'frame', 'frame state unreadable → UNKNOWN (no value invented)'); }
  else { const limits = []; for (const t of fr.limits || []) { if (C.FRAME_TOKENS.includes(t)) limits.push(t); else U('frame.limits', 'FRAME_TOKEN_OUTSIDE_DOMAIN', t); } out.frame = { state: fr.state, limits }; }
  // ---- objects
  let objs = o.objects; let excluded = Array.isArray(f.excluded) ? f.excluded.slice() : [];
  if (objs && !Array.isArray(objs)) { L('UNWRAP', 'objects', 'objects.components → objects'); excluded = excluded.concat(objs.excluded || []); objs = objs.components || []; variant.objects = 'object'; } else variant.objects = 'array';
  if (!Array.isArray(objs)) throw new Error('CONVERT_OBJECTS_MISSING');
  out.objects = [];
  for (const x of objs) {
    if (!x || typeof x.ref !== 'string') { U('objects[]', 'OBJECT_WITHOUT_REF', x); continue; }
    const id = x.identity; let identity;
    if (typeof id === 'string') identity = id;
    else if (id && typeof id === 'object') { if (id.state === 'UNKNOWN' || id.state === 'NOT_VISIBLE') identity = 'UNKNOWN'; else identity = id.value || id.family || id.category; L('UNWRAP', x.ref + '.identity', JSON.stringify(id) + ' → ' + JSON.stringify(identity)); }
    if (identity === undefined || identity === null) { U(x.ref + '.identity', 'IDENTITY_MISSING', id); identity = 'UNKNOWN'; L('FAIL_CLOSED', x.ref + '.identity', 'no identity → UNKNOWN state'); }
    else if (identity !== 'UNKNOWN' && !C.GARMENT_CATEGORIES.includes(identity) && !C.NON_GARMENT_KINDS.includes(identity)) { L('IDENTITY_OUTSIDE_VOCABULARY_KEPT_AS_UNKNOWN_STATE', x.ref + '.identity', 'Prompt V1.2 §3: an object outside the Item categories / accessory families is identity UNKNOWN (state), kept as a participant', identity); identity = 'UNKNOWN'; }
    const r = { ref: x.ref, identity, participates: x.participates === undefined ? true : x.participates === true };
    // V1.4 P1 provenance (no mutation, no inference): an UNKNOWN identity emitted WITH a reason is recorded for review, because the EX-02 F298
    // case showed the model withholding a supportable category ("sweater vs jersey top not settleable") — K-2 then lawfully requests only the
    // appearance facts, so every category-dependent fact of that garment is lost upstream. The identity is never promoted here.
    if (identity === 'UNKNOWN' && r.participates && typeof x.why === 'string' && x.why.trim()) L('IDENTITY_UNKNOWN_WITH_REASON', x.ref, 'UNKNOWN identity emitted with a stated reason; category-dependent facts will not be requested (K-2 applicability) — review against 8d (identity vs attribute visibility)', x.why);
    if (x.participates === undefined) L('DEFAULT_PARTICIPATES_FROM_LISTING', x.ref, 'listed among the participating components by the model (Prompt V1.2 §2b); no participates field emitted');
    const ref = x.refinement || x.identity_refinement;
    if (ref && typeof ref === 'object') { if (ref.state === 'OBSERVED') { if (ref.subtype) r.subtype = ref.subtype; if (ref.product_family) r.product_family = ref.product_family; L('UNWRAP', x.ref + '.refinement', JSON.stringify({ subtype: ref.subtype, product_family: ref.product_family })); } else L('REFINEMENT_UNSETTLED', x.ref, 'refinement state ' + ref.state + ' — family stands (Prompt V1.2 SVP-003)', ref); }
    else { if (x.subtype) r.subtype = x.subtype; if (x.product_family) r.product_family = x.product_family; }
    if (identity === 'footwear') normalizeFootwearSubtype(r, x, ref, L, U);                          // RC5 D-EX04-2: one governed path from the prompt key `subtype` to the registry key `product_subtype`
    if (x.attached_to) r.attached_to = x.attached_to; if (typeof x.why === 'string') r.why = x.why;
    for (const k of Object.keys(x)) if (!['ref', 'identity', 'participates', 'refinement', 'identity_refinement', 'subtype', 'product_family', 'attached_to', 'why'].concat(identity === 'footwear' ? ['product_subtype'] : []).includes(k)) L('DROP_ANNOTATION', x.ref + '.' + k, 'annotation the contract cannot carry (kept here verbatim)', x[k]);
    out.objects.push(r);
  }
  excluded.forEach((e, i) => { const ref = 'x' + (i + 1); out.objects.push({ ref, identity: 'UNKNOWN', participates: false, why: [e.reason, e.what || e.object].filter(Boolean).join(': ') }); L('MOVE', 'excluded[' + i + ']', 'non-participant → ' + ref + ' (participates false; identity not asked for excluded objects)', e); });
  // ---- front_state
  out.front_state = {}; const fs0 = o.front_state;
  const putFront = (ref, e, where) => { if (!isState(e.state)) { U(where, 'STATE_OUTSIDE_DOMAIN', e); return; } if (e.state === 'OBSERVED' && !C.FRONT_STATES.includes(e.value)) { U(where, 'FRONT_STATE_VALUE_OUTSIDE_DOMAIN', e); return; } out.front_state[ref] = e.state === 'OBSERVED' ? { value: e.value, state: 'OBSERVED' } : { state: e.state }; for (const k of Object.keys(e)) if (!['ref', 'state', 'value'].includes(k)) L('DROP_ANNOTATION', where + '.' + k, 'annotation', e[k]); };
  if (Array.isArray(fs0)) { variant.front_state = 'array'; for (const e of fs0) if (e && e.ref) putFront(e.ref, e, 'front_state[' + e.ref + ']'); if (fs0.length) L('RESHAPE', 'front_state', 'array → map'); }
  else if (fs0 && typeof fs0 === 'object') { variant.front_state = 'map'; for (const [ref, e] of Object.entries(fs0)) putFront(ref, e, 'front_state[' + ref + ']'); }
  // ---- layer relations (CDM-05 B is applied by relations.js; here only shape)
  out.layer_relations = [];
  for (const l of o.layer_relations || []) { const over = l.over || l.over_ref, under = l.under || l.under_ref; if (!over || !under) { U('layer_relations[]', 'PAIR_INCOMPLETE', l); continue; } const r = { over, under, revealed: Array.isArray(l.revealed) ? l.revealed.slice() : [], state: l.state === undefined ? 'OBSERVED' : l.state }; if (l.state === undefined) L('DEFAULT_STATE_FROM_LISTING', 'layer ' + over + '>' + under, 'relation listed with revealed parts and no state → OBSERVED'); if (!isState(r.state)) { U('layer ' + over + '>' + under, 'STATE_OUTSIDE_DOMAIN', l); continue; } out.layer_relations.push(r); }
  if ((o.layer_relations || []).some((l) => l.over_ref)) L('RENAME', 'layer_relations', 'over_ref / under_ref → over / under');
  // ---- securing relations (CDM-03 S1 / CDM-04 B applied by relations.js; here only shape — region verbatim)
  out.securing_relations = [];
  for (const s of o.securing_relations || []) {
    const vc = s.visible_constriction && typeof s.visible_constriction === 'object' ? s.visible_constriction.state : s.visible_constriction;
    const r = { securing: s.securing || s.securing_ref, affected: s.affected || s.affected_ref, region: s.region !== undefined ? s.region : s.affected_region, visible_constriction: vc };
    if (s.device_is_own !== undefined) r.device_is_own = s.device_is_own === true;
    if (!isState(vc)) { U('securing ' + r.securing + '→' + r.affected, 'CONSTRICTION_STATE_OUTSIDE_DOMAIN', s); continue; }
    if (r.region !== undefined && !C.SECURING_REGION_REFERENCE_DOMAIN.includes(r.region)) L('SECURING_REGION_RAW_TOKEN', 'securing ' + r.securing + '→' + r.affected, 'region token outside the 5-region reference convention — carried verbatim (CDM-04 B: no enum forced)', r.region);
    for (const k of ['limitation', 'note']) if (k in s) L('DROP_ANNOTATION', 'securing[' + r.securing + '→' + r.affected + '].' + k, 'annotation', s[k]);
    out.securing_relations.push(r);
  }
  if ((o.securing_relations || []).some((s) => s.securing_ref)) L('RENAME', 'securing_relations', 'securing_ref / affected_ref / affected_region → securing / affected / region');
  // ---- colour areas
  out.colour_areas = []; const colourCarriers = new Set();
  const pushArea = (carrier, a, where) => {
    const fam = a.family || a.color_family; const light = a.lightness !== undefined ? a.lightness : a.color_lightness; const eff = a.effect !== undefined ? a.effect : a.color_effect; const role = a.role || a.standing; const contrast = a.contrast || a.contrast_with_field;
    if (a.unreadable === true || a.state === 'UNKNOWN' || a.state === 'NOT_VISIBLE') { L('PART_UNREADABLE', where, 'a sub-area the model could not read (no family) — the component keeps its other colour entries; nothing invented', a); return; }
    if (!C.COLOUR_FAMILIES.includes(fam)) { U(where, 'COLOUR_FAMILY_OUTSIDE_DOMAIN', a); return; }
    if (!['field', 'point'].includes(role)) { U(where, 'COLOUR_ROLE_MISSING_OR_OUTSIDE_DOMAIN', a); return; }
    // RC6 (scoring-impact order 2026-10-17, A-1): frozen Colour V1 (run/color_recovery/color_contract_v1.js L89) — "thread, stitching, buttonholes, seams … are
    // NEVER additional colors". An area the model itself labels as stitching / thread is routed to the EXISTING G-1 suppression carrier
    // (suppressed_by 'stitching' → packet colour_composition.suppressed, rule COLOUR_V1_SUPPRESSION:stitching) instead of becoming a colour point.
    // The observation is kept (suppressed entry with its carrier; family / role / contrast in this log); a designed contrast stitch stays DM evidence (family D).
    // Not a colour opportunity: a carrier whose only area was stitching still receives the converter's NOT_EMITTED → UNKNOWN colour entry.
    const partText = a.part && typeof a.part === 'object' ? String(a.part.carrier_ref || '') : typeof a.part === 'string' ? a.part : '';
    if (partText && STITCH_PART_RE.test(partText)) { out.colour_areas.push({ carrier, family: fam, role, suppressed_by: 'stitching' }); L('COLOUR_V1_STITCHING_SUPPRESSED', where, 'part names thread / stitching → Colour V1 L89 suppression (not a colour point); kept in colour_composition.suppressed', { family: fam, role, contrast, part: a.part }); return; }
    const r = { carrier, family: fam, role };
    if (light === undefined || light === null || light === 'UNKNOWN') L('PARTIAL_COLOUR', where, 'lightness not settled by the model → partial carrier (no value invented)', light); else if (!C.COLOUR_LIGHTNESS.includes(light)) { U(where + '.lightness', 'LIGHTNESS_OUTSIDE_DOMAIN', light); } else r.lightness = light;
    if (eff === undefined || eff === null || eff === 'UNKNOWN') L('PARTIAL_COLOUR', where, 'effect not settled by the model → partial carrier', eff); else if (!C.COLOUR_EFFECT.includes(eff)) { U(where + '.effect', 'EFFECT_OUTSIDE_DOMAIN', eff); } else r.effect = eff;
    if (role === 'point') { if (contrast === undefined || contrast === null || contrast === 'UNKNOWN') L('PARTIAL_COLOUR', where, 'contrast not settled → partial carrier', contrast); else if (!C.CONTRAST.includes(contrast)) { U(where + '.contrast', 'CONTRAST_OUTSIDE_DOMAIN', contrast); } else r.contrast = contrast; }
    if (a.part !== undefined && a.part !== null) {
      if (typeof a.part === 'object' && a.part.carrier_kind && a.part.carrier_ref) r.part = { carrier_kind: a.part.carrier_kind, carrier_ref: a.part.carrier_ref };
      else if (typeof a.part === 'string') { const tok = COLOUR_PART_TOKENS.get(a.part.trim().toLowerCase()); if (tok) { r.part = tok; L('PART_TOKEN_MAPPED_EXACT', where, 'free-text part equals a Colour V1 token verbatim → carrier_part', a.part); } else L('PART_TEXT_NOT_MAPPED', where, 'free-text part kept in this log only; the contract carrier_part needs a Colour V1 token (no vocabulary substitution)', a.part); }
      // RC5 D-EX04-1: a colour area that names a sub-part IS a part colour. Prompt V2 line 23 and the G-1 contract (g1_colour.js header) both say a part
      // colour is a POINT on the same component with a part descriptor, so `field` + part is the alternate representation of that observation, not a
      // second meaning. Normalised deterministically to point + part. Nothing is dropped: family / lightness / effect / part are carried as emitted;
      // a field carries no contrast, so contrast_with_field stays UNRESOLVED (G-1 partial carrier) — never guessed. The emitted standing is kept in the log.
      if (r.part && role === 'field') { r.role = 'point'; if (contrast !== undefined && contrast !== null && contrast !== 'UNKNOWN' && C.CONTRAST.includes(contrast)) r.contrast = contrast; L('COLOUR_PART_ON_FIELD_NORMALIZED_TO_POINT', where, 'area names a sub-part (' + r.part.carrier_kind + ' / ' + r.part.carrier_ref + ') → part colour = point + carrier_part (prompt V2 l.23 · G-1 contract); emitted standing `field` kept here; ' + (r.contrast ? 'contrast as emitted' : 'contrast_with_field not emitted → UNRESOLVED (partial carrier, no value invented)'), { role, part: a.part, family: fam, lightness: light, effect: eff }); }
    }
    out.colour_areas.push(r); colourCarriers.add(carrier);
  };
  for (const a of o.colour_areas || []) {
    const carrier = a.carrier || a.carrier_ref || a.ref;
    if (!carrier) { U('colour_areas[]', 'CARRIER_MISSING', a); continue; }
    if (Array.isArray(a.areas)) { variant.colour = 'nested'; if (a.state && a.state !== 'OBSERVED') { if (['NOT_VISIBLE', 'UNKNOWN'].includes(a.state)) { out.colour_areas.push({ carrier, state: a.state }); colourCarriers.add(carrier); } else U('colour_areas[' + carrier + ']', 'UNREADABLE_STATE_OUTSIDE_DOMAIN', a); continue; } a.areas.forEach((x, i) => pushArea(carrier, x, 'colour_areas[' + carrier + '].areas[' + i + ']')); L('FLATTEN', 'colour_areas[' + carrier + ']', a.areas.length + ' nested areas → flat'); continue; }
    variant.colour = variant.colour || 'flat';
    if (a.state && a.state !== 'OBSERVED') { if (['NOT_VISIBLE', 'UNKNOWN'].includes(a.state)) { out.colour_areas.push({ carrier, state: a.state }); colourCarriers.add(carrier); L('MOVE', 'colour_areas[' + carrier + ']', 'unreadable colour → {carrier, state}'); } else U('colour_areas[' + carrier + ']', 'UNREADABLE_STATE_OUTSIDE_DOMAIN', a); continue; }
    pushArea(carrier, a, 'colour_areas[' + carrier + ']');
  }
  for (const u of o.colour_unreadable || []) { const carrier = u.carrier || u.carrier_ref; if (carrier && ['NOT_VISIBLE', 'UNKNOWN'].includes(u.state)) { out.colour_areas.push({ carrier, state: u.state }); colourCarriers.add(carrier); } else U('colour_unreadable[]', 'SHAPE', u); }
  for (const x of out.objects) if (x.participates && !colourCarriers.has(x.ref)) { out.colour_areas.push({ carrier: x.ref, state: 'UNKNOWN' }); not_emitted.push({ ref: x.ref, fact: 'colour', note: 'no colour entry emitted → colour UNKNOWN (never ABSENT; the omission is explicit)' }); L('NOT_EMITTED', x.ref + '.colour', 'participant without any colour entry → unreadable UNKNOWN recorded (G-1 completeness; nothing invented)'); }
  if ((o.colour_areas || []).some((a) => a.carrier_ref || a.color_family || a.standing)) L('RENAME', 'colour_areas', 'carrier_ref / color_family / color_lightness / color_effect / standing / contrast_with_field → carrier / family / lightness / effect / role / contrast');
  // ---- upper
  const u = o.upper;
  if (u && typeof u === 'object') { const pick = (k1, k2) => (u[k1] !== undefined ? u[k1] : u[k2]); out.upper = { governing_ref: u.governing_ref }; if (u.final_upper_relation) L('RENAME', 'upper', 'final_* → relation / shoulder / shape');
    for (const [k, k2] of [['relation', 'final_upper_relation'], ['shoulder', 'final_shoulder_realization'], ['shape', 'final_upper_shape_behaviour']]) { const v = pick(k, k2); if (v === undefined || v === null) { out.upper[k] = { state: 'UNKNOWN' }; not_emitted.push({ ref: 'upper', fact: k, note: 'not emitted → UNKNOWN' }); L('NOT_EMITTED', 'upper.' + k, 'not emitted → UNKNOWN (never a value)'); } else if (typeof v === 'object') { if (!isState(v.state)) { U('upper.' + k, 'STATE_OUTSIDE_DOMAIN', v); out.upper[k] = { state: 'UNKNOWN' }; } else out.upper[k] = v.state === 'OBSERVED' ? { value: v.value, state: 'OBSERVED', ...(v.alternative ? { alternative: v.alternative } : {}) } : { state: v.state, ...(v.limitation ? { limitation: [].concat(v.limitation) } : {}) }; } else out.upper[k] = { value: v, state: 'OBSERVED' }; } }
  // ---- exposure supplement: the contract carries ONE record per REALIZED exposure; non-realized rows have no slot and are kept in the log
  out.exposure_supplement = [];
  for (const e of o.exposure_supplement || []) {
    if (!C.EXPOSURE_REGIONS.includes(e.region)) { U('exposure_supplement[]', 'REGION_OUTSIDE_DOMAIN', e); continue; }
    if (!e.state || e.state === 'OBSERVED') { const attr = e.attribution === null || e.attribution === undefined || e.attribution === 'UNKNOWN' ? 'UNKNOWN' : e.attribution; if (!['item_intrinsic', 'realized_state', 'UNKNOWN'].includes(attr)) { U('exposure ' + e.region, 'ATTRIBUTION_OUTSIDE_DOMAIN', e); continue; } out.exposure_supplement.push({ region: e.region, carriers: Array.isArray(e.carrier_refs) ? e.carrier_refs.slice() : Array.isArray(e.carriers) ? e.carriers.slice() : [], attribution: attr }); if (e.attribution === null || e.attribution === undefined) L('ATTRIBUTION_UNKNOWN_FROM_NULL', 'exposure ' + e.region, 'attribution null → UNKNOWN (Prompt V1.2 SVP-012: undetermined cause = UNKNOWN)'); }
    else L('EXPOSURE_NON_REALIZED_ROW', 'exposure ' + e.region, 'state ' + e.state + ' — one record per realized exposure; a non-exposed region has no slot (kept here)', e);
  }
  // ---- facts
  out.facts = {}; const factsIn = o.facts; variant.facts = Array.isArray(factsIn) ? 'array' : 'map';
  const catOf = Object.fromEntries(out.objects.map((x) => [x.ref, x.identity]));
  const conv = (ref, fact, v, where) => {
    if (!ITEM_FACTS.has(fact)) { U(where, 'NOT_AN_ITEM_FACT', v); return; }
    const cat = catOf[ref]; let val;
    // INTEGRATED V1 — CA#29: pocket morphology travels ONLY inside pocket.pockets[]; the retired scalar emissions are dropped (never stored,
    // never converted to an instance: a location would have to be invented). A Present pocket without instances is UNCONVERTIBLE (fail-closed →
    // the pool reads UNKNOWN; the raw stays in the log). The FORM C legacy shape (scalar "Present" + scalars) lands here by design.
    if (fact === 'pocket_construction' || fact === 'pocket_projection') { L('RETIRED_SCALAR_DROPPED', where, 'CA#29: scalar pocket morphology is not an emission; morphology belongs in pocket.pockets[] (not converted into an instance — no location invented)', v); return; }
    if (fact === 'pocket' && v && typeof v === 'object' && !Array.isArray(v) && (v.pockets !== undefined || v.value !== undefined)) {
      const st = v.state === undefined ? 'OBSERVED' : v.state;
      if (st !== 'OBSERVED') { if (!isState(st)) { U(where, 'STATE_OUTSIDE_DOMAIN', v); return; } if (v.pockets !== undefined) { U(where, 'POCKET_INSTANCES_ON_NON_OBSERVED', v); return; } (out.facts[ref] = out.facts[ref] || {})[fact] = st === 'NOT_VISIBLE' ? { state: 'NOT_VISIBLE', limitation: [].concat(v.limitation || []).filter((l) => C.LIMITATIONS.includes(l)) } : st; return; }
      if (!['None', 'Present'].includes(v.value)) { U(where, 'VALUE_OUTSIDE_GOVERNED_DOMAIN (fact not emitted; raw kept)', v); return; }
      if (v.value === 'None') { if (v.pockets !== undefined) { U(where, 'POCKET_INSTANCES_WITH_NONE', v); return; } (out.facts[ref] = out.facts[ref] || {})[fact] = 'None'; return; }
      if (v.pockets === undefined) { U(where, 'POCKET_PRESENT_WITHOUT_INSTANCES (CA#29: pockets[] is the sole morphology carrier; nothing invented)', v); return; }
      try { const inst = require('../integrated_pocket').checkInstances(v.pockets, where + '.pockets'); (out.facts[ref] = out.facts[ref] || {})[fact] = { state: 'OBSERVED', value: 'Present', pockets: inst }; L('POCKET_INSTANCES_CARRIED', where, inst.length + ' instance(s) carried verbatim (CA#29)'); } catch (e) { U(where, e.message, v); }
      return;
    }
    if (fact === 'pocket' && v === 'Present') { U(where, 'POCKET_PRESENT_WITHOUT_INSTANCES (CA#29: legacy scalar form; pockets[] required; nothing invented)', v); return; }
    const domainCheck = (x) => { const d = C.GARMENT_CATEGORIES.includes(cat) ? domainOf(cat, fact) : ITEM.VALUE_DOMAINS[fact] ? ITEM.VALUE_DOMAINS[fact].slice() : null; if (!d) return true; const ok = [].concat(x).every((y) => d.includes(y)); if (!ok) U(where, 'VALUE_OUTSIDE_GOVERNED_DOMAIN (fact not emitted; raw kept)', x); return ok; };
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const k of Object.keys(v)) if (!['state', 'value', 'limitation'].includes(k)) L('DROP_ANNOTATION', where + '.' + k, 'annotation', v[k]);
      if (!isState(v.state)) { U(where, 'STATE_OUTSIDE_DOMAIN', v); return; }
      if (v.state === 'OBSERVED') { if (v.value === undefined || v.value === null) { U(where, 'OBSERVED_WITHOUT_VALUE (no value invented)', v); return; } val = v.value; }
      else if (v.state === 'NOT_VISIBLE') { const lim = [].concat(v.limitation || []).filter((l) => C.LIMITATIONS.includes(l)); for (const l of [].concat(v.limitation || [])) if (!C.LIMITATIONS.includes(l)) L('LIMITATION_TOKEN_OUTSIDE_DOMAIN', where, 'kept in log only', l); val = { state: 'NOT_VISIBLE', limitation: lim }; }
      else val = v.state;                                                            // ABSENT · UNKNOWN as explicit tokens
    } else if (v === 'ABSENT' || v === 'UNKNOWN') val = v; else if (v === null || v === undefined) { U(where, 'NULL_VALUE (no value invented)', v); return; } else val = v;
    if (val !== 'ABSENT' && val !== 'UNKNOWN' && !(val && typeof val === 'object' && !Array.isArray(val))) {
      // MULTI facts (material · surface · decorative_detail · attachment) keep the representation the model emitted (scalar or array): the sealed
      // evaluator / reference representation contract is PENDING (CDM-18), so the converter must not pick a side. The pool accepts both forms.
      if (MULTI.has(fact)) { if (Array.isArray(val) && val.length === 1) L('REPRESENTATION_KEPT_AS_EMITTED', where, 'one-element array on a MULTI fact kept as emitted (CDM-18 representation contract pending)'); }
      else if (Array.isArray(val)) { if (val.length === 1) { val = val[0]; L('REPRESENTATION_SINGLETON_TO_SCALAR', where, 'non-MULTI fact given as one-element array → scalar (representation only)'); } else { U(where, 'MULTIPLE_VALUES_ON_SINGLE_VALUE_FACT', val); return; } }
      if (!domainCheck(val)) return;
    }
    (out.facts[ref] = out.facts[ref] || {})[fact] = val;
  };
  if (Array.isArray(factsIn)) { for (const e of factsIn) { if (!e || !e.ref || !e.fact) { U('facts[]', 'ENTRY_WITHOUT_REF_OR_FACT', e); continue; } conv(e.ref, e.fact, { state: e.state, value: e.value, limitation: e.limitation }, 'facts[' + e.ref + '].' + e.fact); } L('RESHAPE', 'facts', 'array → map'); }
  else for (const [ref, fm] of Object.entries(factsIn || {})) { if (!fm || typeof fm !== 'object') { U('facts[' + ref + ']', 'SHAPE', fm); continue; } for (const [fact, v] of Object.entries(fm)) conv(ref, fact, v, 'facts[' + ref + '].' + fact); }
  if (Object.values(factsIn || {}).some((fm) => fm && !Array.isArray(fm) && Object.values(fm).some((v) => v && typeof v === 'object' && 'state' in v))) L('UNWRAP', 'facts', '{state,value|limitation} envelopes → contract values (OBSERVED → value · ABSENT / UNKNOWN → token · NOT_VISIBLE → {state, limitation[]})');
  // not-emitted applicable facts (provenance only; the pool reads them as UNKNOWN — never ABSENT)
  for (const x of out.objects) { if (!x.participates) continue; const have = out.facts[x.ref] || {};
    const expected = C.GARMENT_CATEGORIES.includes(x.identity) ? [...ITEM.applicableSet(x.identity)].filter((fct) => C.REQUESTABLE_FACTS.includes(fct) && !(fct === 'trouser_distinction' && x.identity !== 'Trouser')) : C.ACCESSORY_APPEARANCE_FACTS.slice();
    for (const fct of expected) { if (have[fct] !== undefined) continue; if (fct === 'pocket_construction' || fct === 'pocket_projection') continue; not_emitted.push({ ref: x.ref, fact: fct, note: 'applicable fact not emitted by the model → pool reads UNKNOWN (never ABSENT)' }); } }   // INTEGRATED V1: the two nested facts are never expected as emissions (CA#29)
  // ---- DM (frozen block passthrough; never synthesized)
  if (o.dm_subsystem !== undefined) { out.dm = o.dm_subsystem; L('PASSTHROUGH', 'dm_subsystem', 'DM systems carried verbatim to the A1 assembly (dm_projection.js: DMP-1 assembled, DMP-3 mapped from common visibility; a model-emitted look_components / dm_evidence_visibility is dropped there and only compared)'); if (o.dm_subsystem && o.dm_subsystem.look_components !== undefined) L('DM_LEGACY_FIELD_EMITTED', 'dm_subsystem.look_components', 'not requested by the integrated prompt; dropped at assembly'); if (o.dm_subsystem && o.dm_subsystem.dm_evidence_visibility !== undefined) L('DM_LEGACY_FIELD_EMITTED', 'dm_subsystem.dm_evidence_visibility', 'DM-only visibility judgement not requested (INT-02); dropped at assembly'); }
  else { out.dm_acquisition_reason = 'PROMPT_V1_2_HAS_NO_DM_SECTION'; L('DM_NOT_ACQUIRED', 'dm_subsystem', 'no DM block in the model output; status NOT_ACQUIRED (nothing backfilled)'); }
  const counts = log.reduce((m, e) => { m[e.kind] = (m[e.kind] || 0) + 1; return m; }, {});
  return { case: out, log, unconvertible, not_emitted, shape_variant: variant, counts };
}

module.exports = { convertModelOutput, domainOf, TOP_ALLOWED };
