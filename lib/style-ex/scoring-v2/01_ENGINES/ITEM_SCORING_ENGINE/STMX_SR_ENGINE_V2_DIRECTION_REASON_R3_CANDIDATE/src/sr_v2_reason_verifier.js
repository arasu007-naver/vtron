'use strict';
/**
 * STMX SR V2 — REASON PROVENANCE VERIFIER (independent of the composer: re-reads the received record)
 * Returns a list of findings; an empty list = the Reason is grounded and consistent with the Direction.
 */
const L = require('./sr_v2_reason_lexicon');
const B = require('./sr_v2_binding');   // only for the frozen contract domain / category read — the verifier re-reads the record itself
const STRUCT_SIDE = { fit: ['Slim', 'Regular'], shoulder_structure: ['Strong', 'Extreme', 'Mild'], shoulder_drop: ['None'], waist_definition: ['Cinched', 'Defined'], fabric_behavior: ['Structured', 'Semi-Structured'], silhouette: ['Straight', 'Tapered', 'Narrowing'], material: ['Padding', 'Leather'], surface: ['Quilted'] };
const REL_SIDE = { fit: ['Relaxed', 'Oversized', 'Voluminous'], shoulder_drop: ['Dropped'], fabric_behavior: ['Semi-Fluid', 'Fluid'], silhouette: ['Widening', 'Flared'], sleeve_volume: ['Voluminous'], surface: ['Lace', 'Mesh'] };   // R3: + soft volume · openwork
/** R3: a soft-volume / openwork claim is entailed only when the record itself carries a drape cloth (Semi-Fluid / Fluid) */
const drapeObserved = (record) => { const n = ((record && record.observations) || {}).fabric_behavior; if (!n) return false; const vs = [].concat(n.state === 'OBSERVED' && n.value ? [n.value] : [], n.byRegion ? Object.values(n.byRegion).filter((y) => y && y.state === 'OBSERVED').map((y) => y.value) : []); return vs.some((v) => ['Semi-Fluid', 'Fluid'].includes(v)); };
const getPath = (rec, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), rec);
/** directional SR observations present in the record (any region), read directly from the record — used to police the Z0 policy */
const DIRECTIONAL = { fit: null, shoulder_structure: ['Strong', 'Extreme', 'Mild'], shoulder_drop: ['None', 'Dropped'], waist_definition: ['Defined', 'Cinched'], silhouette: ['Straight', 'Tapered', 'Narrowing', 'Widening', 'Flared'], fabric_behavior: ['Structured', 'Semi-Structured'] };
function directionalObservations(record) { const o = (record && record.observations) || {}; const found = [];
  const vals = (n) => (!n ? [] : [].concat(n.state === 'OBSERVED' && n.value !== null && n.value !== undefined ? [n.value] : [], n.byRegion ? Object.values(n.byRegion).filter((y) => y && y.state === 'OBSERVED').map((y) => y.value) : []));
  for (const [k, allowed] of Object.entries(DIRECTIONAL)) vals(o[k]).forEach((v) => { if (allowed === null || allowed.includes(v)) found.push(k + '=' + v); });
  const multi = (k, set) => (o[k] && o[k].state === 'OBSERVED' ? (o[k].values || []).map((x) => x.value).filter((v) => set.includes(v)) : []);
  multi('material', ['Padding', 'Leather']).forEach((v) => found.push('material=' + v)); multi('surface', ['Quilted']).forEach((v) => found.push('surface=' + v));
  return found; }
/**
 * @param record     the received record
 * @param direction  'STRUCTURED' | 'RELAXED'
 * @param reason     composer output
 * @param worn       eligibility = ADJUDICABLE_WORN
 * @param d          resolver output (optional; enables the opposing-evidence-omitted check)
 */
function verify(record, direction, reason, worn, d) { const f = []; if (!['STRUCTURED', 'RELAXED'].includes(direction)) f.push('DIRECTION_MISSING_OR_PROHIBITED'); if (!reason || !reason.text) return f.concat(['NO_REASON']);
  const LX = worn ? L.WORN : L.FLAT;
  /* a Reason without a physical claim is lawful ONLY as the zero-evidence policy statement, and only when the resolver actually took SR-V2-Z0 */
  if (reason.zero_evidence) { if (!d || d.rule !== 'SR-V2-Z0') f.push('ZERO_EVIDENCE_FLAG_WITHOUT_Z0_RULE');
    if (reason.clauses.some((c) => c.role === 'decisive') || reason.clauses.some((c) => c.role === 'opposing' && c.param !== 'fabric_behavior')) f.push('PHYSICAL_CLAIM_UNDER_ZERO_EVIDENCE');
    /* independent re-check on the record: Z0 is lawful only if NO directional SR carrier is observed in any region */
    const dirFound = directionalObservations(record); if (dirFound.length) f.push('Z0_WITH_DIRECTIONAL_EVIDENCE ' + dirFound.join(','));
    const names = [...new Set(reason.clauses.filter((c) => c.role === 'limitation').map((c) => L.LIMITATION_NAMES[c.param]))]; const fab = reason.clauses.find((c) => c.role === 'opposing');
    if (!names.length || reason.text !== L.zeroEvidenceText(names, fab ? fab.text : null)) f.push('ZERO_EVIDENCE_TEXT_ALTERED'); }
  else if (!reason.clauses.some((c) => c.role === 'decisive')) f.push('GENERIC_NO_PHYSICAL_CLAIM');
  for (const c of reason.clauses) { if (!L.SR_FIELDS.includes(c.param)) { f.push('CROSS_AXIS_FIELD ' + c.param); continue; }
    const base = c.provenance.path.replace(/\.values$/, ''); const node = getPath(record, base);
    if (c.role === 'limitation') { const regional = /\.byRegion\.(upper|lower)$/.test(c.provenance.path); const n2 = regional ? node : node;
      if (n2 && n2.state === 'OBSERVED') { /* an OBSERVED node may only be a limitation when its value lies outside the bound contract domain (re-checked here against the frozen contract) */
        const dom = B.producerBinding.domainFor(c.param, B.adapter.categoryOf(record)); const inDomain = Array.isArray(dom) && dom.length ? dom.includes(n2.value) : true;
        if (inDomain || c.provenance.governed_state !== 'OUT_OF_DOMAIN' || c.provenance.raw_value !== n2.value) f.push('LIMITATION_CLAIM_FALSE ' + c.provenance.path); }
      if (!reason.text.includes(L.LIMITATION_NAMES[c.param])) f.push('CLAIM_NOT_IN_TEXT ' + c.param); continue; }
    if (!node) { f.push('UNOBSERVED_FIELD ' + c.provenance.path); continue; }
    if (node.state !== 'OBSERVED') f.push('NOT_OBSERVED ' + c.provenance.path + '=' + node.state);
    const actual = /\.values$/.test(c.provenance.path) ? (node.values || []).map((v) => v.value) : node.value; if (Array.isArray(actual) ? !actual.includes(c.value) : actual !== c.value) f.push('VALUE_MISMATCH ' + c.provenance.path);
    if (!LX[c.param] || !LX[c.param][c.value] || !reason.text.includes(LX[c.param][c.value][c.form === 'r' ? 1 : c.form === 'k' ? 2 : 0])) f.push('CLAIM_NOT_IN_TEXT ' + c.param);
    if (c.role === 'decisive') { const side = direction === 'STRUCTURED' ? STRUCT_SIDE : REL_SIDE; if (!(side[c.param] || []).includes(c.value)) f.push('DECISIVE_CONTRADICTS_DIRECTION ' + c.param + '=' + c.value); } }
  if (!worn && L.BODY_WORDS.test(reason.text)) f.push('BODY_RELATION_CLAIMED_ON_FLAT_PHOTO');
  if (/붙는|밀착/.test(reason.text) && !reason.clauses.some((c) => c.param === 'fit' && c.value === 'Slim')) f.push('REGULAR_OVERSTATED_AS_BODY_HUGGING');
  /* R2: constriction / control may be claimed only from a carrier that observes it (waist Cinched · built shoulder) — never from Slim alone */
  /* R3: (?<!구)조이 — the R2 pattern also matched "구조이고" (structure), a false positive surfaced by the R3 openwork wording */
  if (/조여|(?<!구)조이|몸을 잡아|몸선을 잡아/.test(reason.text) && !reason.clauses.some((c) => c.role !== 'limitation' && ((c.param === 'waist_definition' && c.value === 'Cinched')))) f.push('CONSTRICTION_CLAIMED_WITHOUT_OBSERVATION');
  if (reason.clauses.some((c) => c.role !== 'limitation' && (c.param === 'sleeve_volume' || (c.param === 'surface' && ['Lace', 'Mesh'].includes(c.value)))) && !drapeObserved(record)) f.push('SOFT_RELEASE_CLAIM_WITHOUT_DRAPE_CLOTH');
  if (d && !reason.zero_evidence && reason.opposing_groundable > 0 && !reason.clauses.some((c) => c.role === 'opposing')) f.push('OPPOSING_EVIDENCE_OMITTED');
  if (direction === 'STRUCTURED' && !/Structured 방향/.test(reason.text)) f.push('LABEL_MISMATCH'); if (direction === 'RELAXED' && !/Relaxed 방향/.test(reason.text)) f.push('LABEL_MISMATCH');
  if (L.INTERNAL_TERMS.test(reason.text)) f.push('INTERNAL_OR_GT_TERM_IN_TEXT'); return f; }
module.exports = { verify, STRUCT_SIDE, REL_SIDE, getPath, directionalObservations, drapeObserved };
