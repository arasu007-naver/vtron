'use strict';
/**
 * LANE B — FL-SR binary constitution V3_R4. Copy of V3_R3 with ONE change [R4]: the SRB-2g cell (Oversized + built shoulder + Structured shape)
 * is split by observed body governance — waist Defined AND shoulder not Dropped → S (SRB-2os); otherwise → R (SRB-2or). Every other row and MS-1 unchanged.
 * (R3 header follows) LANE B — FL-SR binary constitution V3_R3 (CANDIDATE_PENDING_CEO). Differs from V3_R2 in two places only:
 *   · the CG-1 split is retired (SRB-2xs · SRB-2xr · SRB-2x GAP): the cell Oversized + built shoulder + Structured shape → S by SRB-2g
 *     (Frozen Item SR R2 governance precedence; DR-15 — the only other lawful reading would make every Oversized input RELAXED);
 *   · missingness never blocks (CEO 2026-10-24 AVAILABLE_EVIDENCE_MANDATORY_SCORING): an unobserved fact contributes nothing (MS-1, authority MS1 map),
 *     and the V3_R2 exhaustive invariance survives only as a non-blocking SENSITIVITY diagnostic (NONE = every completion agrees · POSSIBLE = it does not).
 *     Slim                                                              → S  SRB-1
 *     Relaxed  + built shoulder + Structured                             → S  SRB-2m
 *     Oversized + built shoulder + Structured                            → S  SRB-2g   ★ R3
 *     Relaxed  + form retention (not 2m)                                 → S  SRB-2f
 *     Relaxed / Oversized, any other                                     → R  SRB-2r
 *     Regular rows unchanged (3h · 3s · 3k · 3d · 3g · 3r)
 */
const A = require('./fl_sr_authority_v3_r4.js');
const BUILT = new Set(['Strong', 'Extreme']), SOFT = new Set(['Semi-Fluid', 'Fluid']);
function binaryRule(x) {
  const cinch = x.constriction === true || x.waist === 'Cinched', defined = x.waist === 'Defined';
  if (typeof x.form_retention !== 'boolean') throw new Error('FORM_RETENTION_NOT_BOOLEAN');
  switch (x.relation) {
    case 'Slim': return { outcome: 'STRUCTURED', rule: 'SRB-1' };
    case 'Relaxed': case 'Oversized':
      if (BUILT.has(x.shoulder) && x.shape === 'Structured') {
        if (x.relation === 'Relaxed') return { outcome: 'STRUCTURED', rule: 'SRB-2m' };
        // [R4] Oversized cell: structure governs only when the garment body itself is governed — a garment-shaped waist (Defined, not a cinch) and a seated shoulder
        return x.waist === 'Defined' && x.drop !== 'Dropped' ? { outcome: 'STRUCTURED', rule: 'SRB-2os' } : { outcome: 'RELAXED', rule: 'SRB-2or' };
      }
      if (x.relation === 'Relaxed' && x.form_retention === true) return { outcome: 'STRUCTURED', rule: 'SRB-2f' };
      return { outcome: 'RELAXED', rule: 'SRB-2r' };
    case 'Regular':
      if (x.shape === 'Structured') return { outcome: 'STRUCTURED', rule: 'SRB-3h' };
      if (x.shape === 'Semi-Structured') {
        if (x.drop !== 'Dropped') return { outcome: 'STRUCTURED', rule: 'SRB-3s' };
        return x.shoulder !== 'None' || defined || cinch ? { outcome: 'STRUCTURED', rule: 'SRB-3k' } : { outcome: 'RELAXED', rule: 'SRB-3d' };
      }
      if (SOFT.has(x.shape)) return BUILT.has(x.shoulder) || cinch ? { outcome: 'STRUCTURED', rule: 'SRB-3g' } : { outcome: 'RELAXED', rule: 'SRB-3r' };
  }
  throw new Error('INCOMPLETE_OR_OUT_OF_DOMAIN_INPUT ' + JSON.stringify(x));
}
const FIELDS = Object.keys(A.DOMAINS);   // relation · shoulder · shape · drop · waist · constriction · form_retention
function completions(e) {
  let acc = [{}];
  for (const f of FIELDS) { const vals = e[f] === null || e[f] === undefined ? A.DOMAINS[f] : [e[f]]; const next = []; for (const a of acc) for (const v of vals) next.push(Object.assign({}, a, { [f]: v })); acc = next; }
  return acc.filter((c) => !(c.shoulder === 'Extreme' && c.drop === 'Dropped'));
}
/** MS-1 reading of the inputs: every unobserved field takes its "no contribution" reading (authority MS1); returns the reading + the list of fields read that way */
function ms1(e) { const r = {}, missing = []; for (const f of FIELDS) { if (e[f] === null || e[f] === undefined) { r[f] = A.MS1[f].reads_as; missing.push(f); } else r[f] = e[f]; } return { reading: r, missing }; }
function resolveInputs(e) {
  for (const f of FIELDS) if (e[f] !== null && e[f] !== undefined && !A.DOMAINS[f].includes(e[f])) return { status: 'INPUT_FAILURE', code: 'INPUT_CONTRACT', detail: 'EVIDENCE_OUT_OF_DOMAIN ' + f + '=' + JSON.stringify(e[f]) };
  const { reading, missing } = ms1(e); const r = binaryRule(reading);
  // sensitivity diagnostic (former invariance proof) — never changes the result
  const cs = missing.length ? completions(e) : []; const alt = [...new Set(cs.map((c) => binaryRule(c).outcome))];
  const decisive = missing.filter((f) => { const groups = {}; for (const c of cs) { const k = FIELDS.filter((g) => g !== f).map((g) => String(c[g])).join('|'); (groups[k] = groups[k] || new Set()).add(binaryRule(c).outcome); } return Object.values(groups).some((s) => s.size > 1); });
  const sensitivity = !missing.length ? 'NONE' : alt.length === 1 ? 'NONE' : 'POSSIBLE';
  return { status: 'RESOLVED', direction: r.outcome, rule: r.rule, resolved_by: missing.length ? 'AVAILABLE_EVIDENCE (MS-1)' : 'DIRECT', missing_observations: missing, ms1_readings: Object.fromEntries(missing.map((f) => [f, A.MS1[f].meaning])), sensitivity, sensitive_to: decisive, possible_outcomes_if_observed: missing.length ? alt : [r.outcome], completions: cs.length };
}
module.exports = { binaryRule, resolveInputs, completions, ms1, FIELDS };
