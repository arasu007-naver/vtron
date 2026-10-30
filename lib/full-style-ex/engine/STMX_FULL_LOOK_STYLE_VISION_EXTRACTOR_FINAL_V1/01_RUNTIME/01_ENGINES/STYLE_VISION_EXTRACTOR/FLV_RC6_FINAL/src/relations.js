'use strict';
/**
 * R-1 layer / relative order and R-2 cross-component securing / cinching. Physical relations only — no C / T meaning.
 *   R-1 { over_ref, under_ref, revealed[], state }                         skirt over trousers · tunic over trousers · inner revealed
 *   R-2 { securing_ref, affected_ref, affected_region, visible_constriction: { state } [, device_is_own: true] }
 *       visible_constriction OBSERVED = actual contour draw-in · ABSENT = device present, no draw-in · UNKNOWN
 *       No magnitude field (no slight / strong).
 *
 * V1.3 (CEO 2026-10-11 order, Stage C-3 / C-4):
 *   · CDM-05 B (approved): layer relations hold DIRECTLY VISIBLE garment-to-garment OVER / UNDER pairs only. Accessories never enter a
 *     garment layering pair; a pair naming an accessory is NOT admitted — it is returned as `excluded_layer_pairs` provenance (the
 *     observation is kept, not silently lost). UNKNOWN-identity participants may be garments and are admitted. No transitive pair is
 *     ever derived; a duplicated or contradictory pair (A over B and B over A) is a contract failure, not a repair.
 *   · CDM-03 S1 (approved semantics; serialization pending): a garment closed by its OWN belt / tie is NOT a separate component and NOT
 *     a cross-component relation; its actual securing constriction is nevertheless a separately observed fact. V1.2 dropped such an
 *     observation (`device_is_own` → skipped). V1.3 carries it as an isolated candidate entry with securing_ref = affected_ref and
 *     `device_is_own: true` (contracts.CANDIDATE_CARRIERS.own_device_securing). The same physical cause is never counted twice:
 *     an own-device entry on garment X and a separate securing component acting on X in the same region is a contract failure.
 *   · CDM-04 B (approved): `affected_region` is the region where the securing occurs, carried as the observed token verbatim; no
 *     region enum is enforced or invented (contracts.CANDIDATE_CARRIERS.securing_region_raw). Affected component ≠ affected region.
 */
const C = require('./contracts');
const R = require('./registry');

function buildRelations(provider, registry) {
  const layer = []; const securing = []; const excluded = [];
  const pairKey = (a, b) => a + '>' + b;
  const seenPairs = new Set();
  for (const l of provider.layerRelations() || []) {
    if (!R.has(registry, l.over) || !R.has(registry, l.under)) throw new Error('R1_REF_NOT_IN_REGISTRY');
    if (l.over === l.under) throw new Error('R1_SELF_RELATION');
    if (!C.STATES.includes(l.state)) throw new Error('R1_STATE_ILLEGAL');
    for (const k of Object.keys(l)) if (C.JUDGMENT_VALUE_RE.test(k) || C.VERDICT_KEY_RE.test(k)) throw new Error('R1_SEMANTIC_KEY: ' + k);
    const over = R.byRef(registry, l.over), under = R.byRef(registry, l.under);
    const nonGarment = [over, under].filter((e) => R.isNonGarment(e)).map((e) => e.component_ref);
    if (nonGarment.length) { excluded.push({ over_ref: l.over, under_ref: l.under, revealed: (l.revealed || []).slice(), state: l.state, reason: 'ACCESSORY_IN_GARMENT_LAYER_PAIR', accessory_refs: nonGarment, authority: 'CDM-05 B (CEO 2026-10-10): accessories must not enter Garment Layer Relation' }); continue; }
    const k = pairKey(l.over, l.under);
    if (seenPairs.has(k)) throw new Error('R1_DUPLICATE_PAIR: ' + k);
    if (seenPairs.has(pairKey(l.under, l.over))) throw new Error('R1_CONTRADICTORY_PAIR (A over B and B over A): ' + k);
    seenPairs.add(k);
    layer.push({ over_ref: l.over, under_ref: l.under, revealed: (l.revealed || []).slice(), state: l.state });
  }
  const ownByRegion = new Map();                                                       // garment|region → own-device entry (double-count guard)
  for (const s of provider.securingRelations() || []) {
    for (const k of Object.keys(s)) if (/magnitude|degree|strength|slight|strong/i.test(k)) throw new Error('R2_MAGNITUDE_FIELD_PROHIBITED: ' + k);
    if (!C.STATES.includes(s.visible_constriction)) throw new Error('R2_CONSTRICTION_STATE_ILLEGAL: ' + s.visible_constriction);
    if (s.device_is_own === true) {                                                    // CDM-03 S1 — own integrated device, separately observed constriction (isolated candidate carrier)
      const g = s.affected || s.securing;
      if (!R.has(registry, g)) throw new Error('R2_REF_NOT_IN_REGISTRY');
      if (s.securing && s.affected && s.securing !== s.affected) throw new Error('R2_OWN_DEVICE_WITH_SEPARATE_SECURING_REF (an own belt is not a separate component): ' + s.securing + '→' + s.affected);
      if (!R.isGarment(R.byRef(registry, g)) && !R.isUnknownIdentity(R.byRef(registry, g))) throw new Error('R2_OWN_DEVICE_ON_NON_GARMENT: ' + g);
      const rk = g + '|' + String(s.region);
      if (ownByRegion.has(rk)) throw new Error('R2_OWN_DEVICE_DUPLICATED: ' + rk);
      const entry = { securing_ref: g, affected_ref: g, affected_region: s.region, visible_constriction: { state: s.visible_constriction }, device_is_own: true };
      ownByRegion.set(rk, entry); securing.push(entry); continue;
    }
    if (!R.has(registry, s.securing) || !R.has(registry, s.affected)) throw new Error('R2_REF_NOT_IN_REGISTRY');
    if (s.securing === s.affected) throw new Error('R2_SELF_RELATION (use device_is_own for a garment\'s own device)');
    securing.push({ securing_ref: s.securing, affected_ref: s.affected, affected_region: s.region, visible_constriction: { state: s.visible_constriction } });
  }
  for (const s of securing) if (!s.device_is_own && ownByRegion.has(s.affected_ref + '|' + String(s.affected_region))) throw new Error('R2_SAME_CAUSE_COUNTED_TWICE (own device and a separate securing component on the same garment region): ' + s.affected_ref);
  return { layer_relations: layer, securing_relations: securing, excluded_layer_pairs: excluded };
}

module.exports = { buildRelations };
