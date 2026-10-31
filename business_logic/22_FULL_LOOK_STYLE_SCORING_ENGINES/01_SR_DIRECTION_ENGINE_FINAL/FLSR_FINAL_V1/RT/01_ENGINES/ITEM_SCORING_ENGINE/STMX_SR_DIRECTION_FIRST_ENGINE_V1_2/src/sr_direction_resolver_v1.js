'use strict';
/**
 * STMX SR DIRECTION-FIRST ENGINE V1.2 — DIRECTION RESOLVER (PRIMARY RUNTIME AUTHORITY)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-13 — SR Direction-First execution hierarchy (V1)
 *                   2026-09-14 — material + structure-relevant surface = BOUNDED SR Direction support; CEO Direction
 *                                semantic authority (form-retaining outerwear = a Structured pathway; volume is not
 *                                Relaxed evidence; form-retaining material alone cannot convert a clearly Relaxed
 *                                body relationship)
 *                   2026-09-15 — order: V1.2 cross-side closure — implement the bounded support inside Direction only
 *   Reason:         V1.1 read a moderately released coat whose form-retaining cloth still holds the garment's own
 *                   shape on the body as RELAXED (release + no full structure). The CEO reads it as STRUCTURED /
 *                   WEAK (form-retaining outerwear). The missing evidence is an already-governed observation.
 *   Affected Scope: this module (rule R3d added) · sr_evidence_admission_v1 (class form_retention_support) ·
 *                   sr_input_adapter_v1 · sr_producer_binding_v1. ⛔ Strength · refinement · projector · composition ·
 *                   admission gate unchanged.
 *
 * Inputs are admitted evidence CLASSES only. ⛔ This module imports no projector, no refinement, no GT, no REF.
 * ⛔ No counting, no weights, no coefficients, no thresholds — every rule is a categorical reading of
 *    current authority, cited inline.
 *
 * Rule matrix (deliverable 03 restates the V1.2 delta verbatim):
 *   R0  contradiction (Extreme + Dropped)                              → UNKNOWN   SCORE_PHYSICS_FROZEN §6
 *   R1  fit not OBSERVED                                               → UNKNOWN   fit is the whole-garment ease reading; nothing decides without it
 *   R2  governance present                                             → STRUCTURED   CG-1-A: a governing factor "materially controls the visible silhouette"
 *       (with a released fit the governance still holds, but cannot be dominant — Strength decides that, not Direction)
 *   R3  no governance · released fit
 *   R3a   full structure preserved (Structured fabric · Mild shoulder/waist) → NEUTRAL   Constitution §0: Oversized + Structured → SR5
 *   R3d   MODERATE release (fit Relaxed — not Oversized / Voluminous) and form-retention support present
 *                                                                      → STRUCTURED   CEO 2026-09-14 §4.2: form-retaining outerwear — "whole-garment form may remain
 *                                                                                     visibly governed on the body … a leather coat holding its coat form"; volume is not
 *                                                                                     Relaxed evidence.  ★ V1.2
 *         ⛔ never under a STRONG release: §3 anchor — "structured leather + oversized + dropped shoulder + relaxed
 *            whole fit → release dominates"; the whole-garment body relationship outranks bounded support (SR-DIR-27).
 *   R3b   fabric observed OR release support present                    → RELAXED   §0: structure not preserved and volume dominates → SR4 or below
 *   R3c   fabric not observed and no release support                   → UNKNOWN   ⛔ never Neutral by default (order §5.4)
 *   R4  no governance · fit not released (Regular)
 *   R4a   structure support and no release support                     → STRUCTURED   order §7.1: Semi-Structured + retained form + non-relaxed realization
 *   R4b   a governance-LOSS signal (dropped shoulder · expanding lower geometry) and nothing holds against it
 *                                                                      → RELAXED      order §5.2: body disengagement / expansion; Semi-Structured retains form only when unpulled
 *   R4c   a governance-loss signal against FULL structure (Structured fabric · Mild shoulder / waist)
 *                                                                      → NEUTRAL      §0 gradient, as in R3a — neither dominant
 *   R4b′  fabric-only release support (drape) on a Regular fit, no structure support
 *                                                                      → NEUTRAL      Constitution §2 금지4: 무신호 + 실루엣 유지 = SR5 — drape alone is not a governance-loss signal
 *   R4c′  drape alongside structure support, no governance-loss signal → NEUTRAL      neither dominant
 *   R4d   neither (fabric not observed)                                → UNKNOWN
 *
 * Where bounded support is NOT consulted (by design, SR-DIR-24 · SR-DIR-27):
 *   · R2 — governance already decides; support cannot raise Strength (Strength never reads it)
 *   · R4 — a Regular fit is not a released body relationship; the existing structure / signal reading stands
 *   · any Oversized / Voluminous fit — a strong release is the dominant whole-garment fact
 *   · R1 / R3c / R4d — support can never resolve an UNKNOWN (MAT-05: it fabricates nothing)
 */
const DIRECTIONS = ['RELAXED', 'NEUTRAL', 'STRUCTURED', 'UNKNOWN'];

function resolveDirection(ev) {
  const frs = Array.isArray(ev.form_retention_support) ? ev.form_retention_support : [];
  const basis = { rule: null, governance: ev.governance, structure_support: ev.structure_support, release: ev.release, release_support: ev.release_support, preserves_under_release: ev.preserves_under_release, form_retention_support: frs };
  const unresolved = [];
  const out = (direction, rule, why) => ({ direction, basis: Object.assign({}, basis, { rule, why }), unresolved_reasons: unresolved });

  if (ev.contradictions.length) { unresolved.push(...ev.contradictions); return out('UNKNOWN', 'R0', 'contradictory governed pair — not consumed as a normal valid combination'); }
  if (!ev.fit_observed) { unresolved.push('FIT_NOT_OBSERVED: whole-garment ease is required to resolve Direction'); return out('UNKNOWN', 'R1', 'fit unavailable'); }

  const gov = ev.governance.length > 0, rel = ev.release.length > 0;
  const ssup = ev.structure_support.length > 0, rsup = ev.release_support.length > 0;

  if (gov) return out('STRUCTURED', 'R2', 'a governing factor materially controls the visible silhouette (' + ev.governance.join(' + ') + ')');

  if (rel) {
    if (ev.preserves_under_release.length) return out('NEUTRAL', 'R3a', 'fit released but full structure preserved (' + ev.preserves_under_release.join(' + ') + ') — structure evidence maintained ⇒ at least Neutral');
    /* V1.2 · R3d — bounded form-retention support under a MODERATE release only. The cloth keeps the garment's own
     * shape on the body (CEO §4.2 form-retaining outerwear); under Oversized / Voluminous the release is the dominant
     * whole-garment fact and the support is not consulted (CEO §3 · SR-DIR-27). */
    if (!ev.strong_release_fit && frs.length) return out('STRUCTURED', 'R3d', 'moderately released fit (' + ev.release.join('') + ') but the garment keeps its own form on the body (' + frs.join(' + ') + ') — form-retaining outerwear pathway; bounded support, whole-garment fit not strongly released');
    if (ev.fabric_observed || rsup) return out('RELAXED', 'R3b', 'fit released and structure not preserved' + (rsup ? ' — release support ' + ev.release_support.join(' + ') : ' — fabric ' + ev.fabric + ' does not hold the released cut') + (frs.length ? ' — ' + frs.join(' + ') + ' cannot convert a strongly released whole-garment relationship (CEO §3)' : ''));
    unresolved.push('FABRIC_NOT_OBSERVED: a released fit cannot be read without knowing whether the cloth preserves structure');
    return out('UNKNOWN', 'R3c', 'released fit, structure preservation unknown');
  }

  if (ssup && !rsup) return out('STRUCTURED', 'R4a', 'non-relaxed realization with retained form (' + ev.structure_support.join(' + ') + ') and no release signal');
  /* Constitution §2 금지4 (V3.14 AP-2, current in V3.16): a Release tier needs a loss-of-governance SIGNAL —
   * "무신호 + 실루엣 유지 = SR5". Drape alone is fabric context, not a signal; a dropped shoulder or an expanding
   * lower geometry is. Against a signal, only FULL structure holds (Structured fabric · Mild shoulder / waist) —
   * the same §0 gradient as R3a; Semi-Structured retains form only when nothing pulls on it. */
  const signal = ev.release_support.filter(r => !r.startsWith('FABRIC_'));
  const holds = ev.preserves_under_release.length > 0;
  if (signal.length) {
    if (holds) return out('NEUTRAL', 'R4c', 'governance-loss signal (' + signal.join(' + ') + ') against full structure (' + ev.preserves_under_release.join(' + ') + ') — neither dominant');
    return out('RELAXED', 'R4b', 'body outline readable but a governance-loss signal is present (' + signal.join(' + ') + ') and nothing holds against it' + (ssup ? ' — ' + ev.structure_support.join(' + ') + ' retains form only when unpulled' : ''));
  }
  if (rsup && !ssup) return out('NEUTRAL', 'R4b′', 'Regular fit that drapes (' + ev.release_support.join(' + ') + ') but shows no governance-loss signal — 무신호 + 실루엣 유지 = Neutral (Constitution §2 금지4)');
  if (rsup && ssup) return out('NEUTRAL', 'R4c′', 'drape (' + ev.release_support.join(' + ') + ') alongside structure support (' + ev.structure_support.join(' + ') + ') — no governance-loss signal, neither dominant');
  unresolved.push('FABRIC_NOT_OBSERVED: with a Regular fit and no shoulder / waist / geometry signal, Direction rests on fabric, which is unavailable');
  return out('UNKNOWN', 'R4d', 'no direction evidence beyond a Regular fit');
}

module.exports = { resolveDirection, DIRECTIONS };
