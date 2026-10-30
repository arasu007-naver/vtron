'use strict';
/**
 * Axis request routers (demand pass). The extractor never judges; a GATE AUTHORITY (deterministic fixture in this candidate,
 * a future scorer later) signals whether a gate resolved. Routers only decide WHAT TO REQUEST NEXT.
 *   EI  colour first → (exposure → appearance) only while unresolved                 (spec 09)
 *   TC  product first, batch by batch per visible garment, stop when the authority resolves; styling only when the authority
 *       says the product gate is settled negatively with sufficient evidence AND no garment was unresolvable  (spec 12 / 13 / 14)
 *   SR  no early exit: own-waist fact of the governing upper                            (spec 15)
 * Routing states are request-flow states, never verdicts: no NO_DEPARTURE, no E / I / T / C anywhere.
 */
const R = require('./registry');
const C = require('./contracts');

/** Gate authority interface (all deterministic; the fixture implementation lives in tests / fixtures). */
class GateAuthority {
  eiColour(/* colour_composition */) { return false; }       // true = colour gate resolved; no secondary EI evidence needed
  eiExposure(/* canonical_exposure */) { return false; }
  tcProduct(/* ref, batch, facts */) { return false; }       // true = valid product departure supported on this product
  tcProductSettledWithSufficientEvidence() { return false; } // true = every relevant product examined, nothing found, evidence sufficient
}

function routeEI({ pool, registry, colour, requestExposure, gate }) {
  const trace = { phase_reached: 'colour', exposure_requested: false, appearance_requested: false, stop: null };
  if (!colour) { trace.stop = 'colour composition unavailable'; return trace; }
  if (gate.eiColour(colour) === true) { trace.stop = 'EI_COLOUR_GATE_RESOLVED → no secondary EI request'; return trace; }
  trace.phase_reached = 'exposure'; trace.exposure_requested = true;
  const exposure = requestExposure('EI-2');
  if (gate.eiExposure(exposure) === true) { trace.stop = 'EI_EXPOSURE_GATE_RESOLVED → no appearance request'; return trace; }
  trace.phase_reached = 'appearance'; trace.appearance_requested = true;
  for (const e of registry) pool.request('EI-2', e.component_ref, 'ei_appearance');
  trace.stop = 'full secondary path requested';
  return trace;
}

function routeTC({ pool, registry, gate }) {
  const trace = { garments_reached: [], unresolvable: [], product_gate: 'UNRESOLVED_EVIDENCE', resolved_on: null, styling_requested: false };
  const candidates = registry.filter((e) => R.isGarment(e) || R.isUnknownIdentity(e));   // non-garments: product departure HOLD (TC-D-4b)
  outer: for (const e of candidates) {
    const ref = e.component_ref; trace.garments_reached.push(ref);
    if (R.isUnknownIdentity(e)) { trace.unresolvable.push(ref); continue; }        // no archetype key → archetype-relative facts are not requested
    pool.request('TC-1', ref, 'tc_archetype_key');
    for (const batch of C.TC_BATCHES) {
      pool.request('TC-1', ref, batch);
      const facts = Object.fromEntries(C.FACT_FAMILIES[batch].map((f) => [f, pool.get(ref, f)]).filter(([, v]) => v));
      if (gate.tcProduct(ref, batch, facts) === true) { trace.product_gate = 'STOPPED_AT_PRODUCT_GATE'; trace.resolved_on = { component_ref: ref, after_batch: batch }; break outer; }
    }
  }
  if (trace.product_gate === 'STOPPED_AT_PRODUCT_GATE') return trace;              // styling evidence never requested after a product stop
  const tcUnknown = pool.entries().filter((x) => x.state === 'UNKNOWN' && pool.ledger.some((l) => l.requester === 'TC-1' && l.component_ref === x.component_ref && l.stored.includes(x.fact)));
  trace.unknown_tc_facts = tcUnknown.map((x) => x.component_ref + '.' + x.fact);
  if (trace.unresolvable.length === 0 && gate.tcProductSettledWithSufficientEvidence() === true) {
    trace.product_gate = 'PROCEEDED_TO_STYLING'; trace.styling_requested = true;    // TC-2 uses pass-1 R-1 · K-1 · K-3 · K-4; grammar already in the pool
  }
  return trace;                                                                     // otherwise UNRESOLVED_EVIDENCE: downstream stays unresolved, never C
}

function routeSR({ pool, registry, upper, provider }) {
  const raw = provider.upperRealization();
  const ref = (upper && upper.source_refs && upper.source_refs[0]) || (raw && raw.governing_ref) || null;
  const trace = { governing_upper: ref, own_waist_requested: false, upper_shoulder_requested: false };
  if (ref && R.has(registry, ref)) {
    pool.request('SR', ref, 'sr_own_waist'); trace.own_waist_requested = true;
    pool.request('SR', ref, 'sr_upper_shoulder'); trace.upper_shoulder_requested = true;   // V1.2 D-2: shoulder_structure + shoulder_drop as independent upstream raw facts (no mapping onto upper_realization.shoulder)
  }
  return trace;
}

module.exports = { GateAuthority, routeEI, routeTC, routeSR };
