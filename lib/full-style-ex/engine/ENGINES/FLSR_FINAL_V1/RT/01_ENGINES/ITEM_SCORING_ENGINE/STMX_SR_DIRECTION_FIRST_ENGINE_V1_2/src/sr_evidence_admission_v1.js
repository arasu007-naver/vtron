'use strict';
/**
 * STMX SR DIRECTION-FIRST ENGINE V1.2 — EVIDENCE ADMISSION
 *
 * Turns the adapted carrier tuple into SR-owned governed evidence classes. This is the ONLY place a raw
 * observation value is interpreted; the resolvers downstream consume classes, never tokens.
 *
 *   GOVERNANCE (structured, governing)   shoulder Strong/Extreme · waist Strong · fit Slim          (CG-1-A · ADR-123 · ADR-125)
 *   STRUCTURE SUPPORT (non-governing)    shoulder Mild · waist Mild · structure-side fabric · maintained lower geometry
 *                                                                                                     (Constitution §0 Structure Preservation · order §7.1)
 *   RELEASE                              fit Relaxed / Oversized / Voluminous                          (Constitution §1 SR4–SR1 meaning)
 *   RELEASE SUPPORT                      shoulder Dropped · fluid-side fabric · expanding lower geometry (order §5.2 · §7.1)
 *   FORM-RETENTION SUPPORT (V1.2)        form-retaining material · structure-relevant surface           (CEO 2026-09-14 · bounded support)
 *
 * ⛔ Fabric is admitted as SUPPORT only — never as governance, never as a tier (Guard SR-DIR-6 · SR-DIR-7).
 * ⛔ Material / surface are admitted as BOUNDED SUPPORT only — never governance, never release, never a Direction
 *    (Guards SR-DIR-23 … SR-DIR-27). A token here is a form-retention FACT ("the garment keeps its own shape");
 *    what that fact means for Direction is decided by the resolver in the context of the whole-garment fit.
 * ⛔ No EI / DM / TC score is admitted (Guard SR-DIR-8 · DR-11).
 * ⛔ No REF / GT / case identity is admitted.
 *
 * Two frozen facts shape the classes:
 *   · under a released fit, only FULL structure — Structured fabric, or actual construction hold (Mild shoulder /
 *     Mild waist) — preserves structure (Constitution §0: "Fit = Oversized + Structured → SR5"). Semi-Structured
 *     "shape survives but is not stiffly self-supporting" and does not preserve structure against release; a
 *     maintained lower geometry says nothing about release. That is the order's "non-relaxed realization" clause.
 *   · Extreme shoulder + Dropped shoulder is not consumed as a normal valid combination (SCORE_PHYSICS_FROZEN §6).
 *
 * Bounded-support vocabulary (V1.2) — drawn from the bound Producer V1_3 domains, nothing new:
 *   FORM_RETAINING_MATERIAL     Leather · Padding      the CEO's own §4.2 anchors: "a leather coat holding its coat form,
 *                                                       a padded coat holding a clear external silhouette"
 *   STRUCTURE_RELEVANT_SURFACE  Quilted                the quilting / padding class — the only Producer surface value whose
 *                                                       role is form retention (frozen decision 2026-09-14)
 *   ⛔ NOT admitted: every other material (Cotton · Wool · Denim · Knit · Silk · Synthetic · …) and every decorative /
 *      optical surface (Glossy · Reflective · Distressed · Graphic · Lace · Mesh · Semi Transparent · Pleated · …).
 *      They produce NO SR evidence of any kind — not support, not release. (SURF-02 … SURF-05 · order §20 Lace clause)
 */
const STRUCTURE_SIDE_FABRIC = ['Structured', 'Semi-Structured'];
const FLUID_SIDE_FABRIC = ['Semi-Fluid', 'Fluid'];
const RELEASED_FITS = ['Relaxed', 'Oversized', 'Voluminous'];
const STRONG_RELEASE_FITS = ['Oversized', 'Voluminous'];
const MAINTAINED_GEOMETRY = ['Straight', 'Tapered', 'Narrowing'];
const EXPANDING_GEOMETRY = ['Flared', 'Widening'];
const FORM_RETAINING_MATERIAL = ['Leather', 'Padding'];
const STRUCTURE_RELEVANT_SURFACE = ['Quilted'];

const obs = c => c && c.state === 'OBSERVED' ? c.value : null;
const vals = s => s && s.state === 'OBSERVED' && Array.isArray(s.values) ? s.values : [];
const token = v => v.toUpperCase().replace(/[^A-Z0-9]+/g, '_');

/**
 * @param {object} adapted   output of sr_input_adapter.adapt()
 * @param {'UPPER'|'LOWER'}  half — which half of the garment is being read; one-pieces are read twice
 */
function admit(adapted, half) {
  const c = adapted.carriers;
  const s = adapted.support || {};
  const fit = obs(c.fit), fabric = obs(c.fabric_behavior), shoulder = obs(c.shoulder_structure), drop = obs(c.shoulder_drop), sil = obs(c.silhouette);
  const waistSR = adapted.waist_sr;
  const lower = half === 'LOWER';

  const governance = [];
  if (!lower && (shoulder === 'Strong' || shoulder === 'Extreme')) governance.push('SHOULDER_' + shoulder.toUpperCase());
  if (!lower && waistSR === 'Strong') governance.push('WAIST_STRONG');
  if (fit === 'Slim') governance.push('FIT_SLIM');

  const structureSupport = [];
  if (!lower && shoulder === 'Mild') structureSupport.push('SHOULDER_MILD');
  if (!lower && waistSR === 'Mild') structureSupport.push('WAIST_MILD');
  if (STRUCTURE_SIDE_FABRIC.includes(fabric)) structureSupport.push('FABRIC_' + fabric.toUpperCase().replace('-', '_'));
  if (lower && MAINTAINED_GEOMETRY.includes(sil)) structureSupport.push('GEOMETRY_' + sil.toUpperCase());

  const release = RELEASED_FITS.includes(fit) ? ['FIT_' + fit.toUpperCase()] : [];

  const releaseSupport = [];
  if (!lower && drop === 'Dropped') releaseSupport.push('SHOULDER_DROPPED');
  if (FLUID_SIDE_FABRIC.includes(fabric)) releaseSupport.push('FABRIC_' + fabric.toUpperCase().replace('-', '_'));
  if (lower && EXPANDING_GEOMETRY.includes(sil)) releaseSupport.push('GEOMETRY_' + sil.toUpperCase());

  /* structure that survives a released fit — full structure only */
  const preservesUnderRelease = [];
  if (!lower && shoulder === 'Mild') preservesUnderRelease.push('SHOULDER_MILD');
  if (!lower && waistSR === 'Mild') preservesUnderRelease.push('WAIST_MILD');
  if (fabric === 'Structured') preservesUnderRelease.push('FABRIC_STRUCTURED');

  /* V1.2 — bounded form-retention support. A whole-garment (region-less) fact, so it is admitted for both halves
   * of a one-piece; missing / UNKNOWN / ABSENT / out-of-class values yield an empty list (MAT-05 · SURF-06). */
  const formRetentionSupport = [];
  vals(s.material).filter(v => FORM_RETAINING_MATERIAL.includes(v)).forEach(v => formRetentionSupport.push('MATERIAL_' + token(v)));
  vals(s.surface).filter(v => STRUCTURE_RELEVANT_SURFACE.includes(v)).forEach(v => formRetentionSupport.push('SURFACE_' + token(v)));

  const contradictions = [];
  if (!lower && shoulder === 'Extreme' && drop === 'Dropped') contradictions.push('SR_CONTRADICTORY_PAIR: shoulder_structure Extreme + shoulder_drop Dropped (SCORE_PHYSICS_FROZEN §6)');

  return {
    half, category: adapted.category, region: adapted.region,
    fit_observed: c.fit.state === 'OBSERVED', fabric_observed: c.fabric_behavior.state === 'OBSERVED',
    fit, fabric, shoulder, shoulder_drop: drop, waist_sr: waistSR, silhouette: sil,
    strong_release_fit: STRONG_RELEASE_FITS.includes(fit),
    governance, structure_support: structureSupport, release, release_support: releaseSupport, preserves_under_release: preservesUnderRelease,
    form_retention_support: formRetentionSupport,
    contradictions,
    provenance: {
      carriers: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.state === 'OBSERVED' ? v.value : v.state])),
      support: Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.state === 'OBSERVED' ? v.values.slice() : v.state])),
      notes: adapted.notes, contract_warnings: adapted.contract_warnings },
  };
}

module.exports = { admit, STRUCTURE_SIDE_FABRIC, FLUID_SIDE_FABRIC, RELEASED_FITS, STRONG_RELEASE_FITS, MAINTAINED_GEOMETRY, EXPANDING_GEOMETRY, FORM_RETAINING_MATERIAL, STRUCTURE_RELEVANT_SURFACE };
