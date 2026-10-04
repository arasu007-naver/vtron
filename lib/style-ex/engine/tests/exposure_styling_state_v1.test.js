'use strict';
/**
 * STMX — EXPOSURE APPLICABILITY CLOSEOUT V1.1 · STYLING-STATE FIREWALL TESTS (order §3 · S01–S08)
 *
 * CEO Decision 2026-09-03 (closeout): the production prompt must state the garment-intrinsic
 * STYLING-STATE exclusion that the Exposure Canonical (ADR-097 §3) already requires.
 *
 * ⛔ EXTERNAL VISION / API CALLS = 0. The exclusion is an EXTRACTION-TIME judgement, so the contract
 *    layer cannot manufacture it; what is asserted here is (a) the doctrine is present in production
 *    prompt text, by name, for every excluded mechanism, and (b) the contract still ACCEPTS the
 *    legitimate garment-intrinsic cases, i.e. the new firewall suppresses nothing valid.
 * ★ NON-VACUITY: every doctrine assertion is paired with a check against the PRE-closeout prompt text
 *   (the sealed fixture), where the clause must be ABSENT — proving these tests measure the addition.
 */
const path = require('path'), fs = require('fs');
const PV1 = path.resolve(__dirname, '..');
const R = require(path.join(PV1, 'producer_rules_v1.js'));
const C = require(path.join(PV1, 'producer_controller_v1.js'));
const PROMPT = fs.readFileSync(path.join(PV1, 'producer_prompt_v1.js'), 'utf8');
const PRE = fs.readFileSync(path.join(__dirname, 'fixtures', 'prompt_pre_descriptor_17eeedc747a7168f.txt'), 'utf8');

let pass = 0; const failed = [];
const ok = (n, c) => { if (c) pass++; else { failed.push(n); console.log('  FAIL:', n); } };

const o = (s, v, e) => ({ state: s, value: v === undefined ? null : v, evidence: [e || 'fx'] });
const multi = (...vs) => ({ state: 'OBSERVED', values: vs.map(v => ({ value: v, evidence: ['fx'] })) });
const absentM = e => ({ state: 'ABSENT', values: [], evidence: [e || 'none'] });
function mk(cat, over) {
  const legal = (p, pref) => { const d = R.domainFor(p, cat); if (!Array.isArray(d) || !d.length) return null; return d.includes(pref) ? pref : d.find(v => v !== 'None') || d[0]; };
  const base = { category: o('OBSERVED', cat), trouser_distinction: o('OBSERVED', legal('trouser_distinction', 'Casual')), silhouette: o('OBSERVED', legal('silhouette', 'Straight')), fit: o('OBSERVED', legal('fit', 'Regular')), length: o('OBSERVED', legal('length', 'Regular')), fabric_behavior: o('OBSERVED', legal('fabric_behavior', 'Structured')), waist_definition: o('OBSERVED', legal('waist_definition', 'Defined')), sleeve: o('OBSERVED', legal('sleeve', 'Long')), shoulder_drop: o('OBSERVED', legal('shoulder_drop', 'None')), shoulder_structure: o('OBSERVED', legal('shoulder_structure', 'Mild')), neckline_shape: o('OBSERVED', 'Round'), neckline_position: o('OBSERVED', 'Regular'), collar: o('OBSERVED', 'Shirt'), rib_hem: o('OBSERVED', 'None'), hood: o('ABSENT'), front_opening_extent: o('OBSERVED', 'Full'), closure_type: o('OBSERVED', legal('closure_type', 'Button')), grammar: o('OBSERVED', legal('grammar', 'Tailored')), material: multi('Cotton'), surface: absentM(), pattern: o('ABSENT'), graphic: o('ABSENT'), pocket: o('OBSERVED', 'None'), decorative_detail: absentM(), attachment: absentM(), asymmetry: o('OBSERVED', 'None'), slit: o('OBSERVED', 'None'), ruffle: o('OBSERVED', 'None'), exposure_opening: absentM('no qualifying exposure'), cuff_type: o('OBSERVED', 'Standard'), cuff_scale: o('OBSERVED', 'Regular'), collar_scale: o('OBSERVED', 'Regular'), sleeve_volume: o('OBSERVED', 'Regular') };
  const ap = R.applicableSet(cat); const obs = {};
  for (const [k, v] of Object.entries(base)) if (ap.has(k) || k === 'category') obs[k] = v;
  Object.assign(obs, over || {}); for (const k of Object.keys(obs)) if (obs[k] === undefined) delete obs[k];
  return { descriptor: cat, identity: { value: true, evidence: ['g'] }, readability: { value: true, basis: (true) ? 'RECONSTRUCTABLE' : 'NOT_RECONSTRUCTABLE', basis: (true) ? 'RECONSTRUCTABLE' : 'NOT_RECONSTRUCTABLE', basis: 'RECONSTRUCTABLE', evidence: ['c'] }, prominence: 'dominant', category: { state: 'OBSERVED', value: cat }, observations: obs };
}
const gov = t => C.governTarget(t);
const valid = g => g.validation && g.validation.ok === true;
const errs = g => (g.validation && g.validation.errors) || [];
const expOf = g => ((g.record && g.record.observations && g.record.observations.exposure_opening) || {});
const noRegion = g => !((expOf(g).values || []).some(v => R.EXPOSURE_REGION.includes(v.value)));

console.log('\n══ EXPOSURE STYLING-STATE FIREWALL TESTS (S01–S08) ══\n');

// ── S01–S05 · styling-state must NOT create Class A ──────────────────────────
ok('S01 buttons undone only → NO intrinsic Chest / Décolletage',
  /A button-down shirt whose chest is visible only because the buttons are undone is NOT Chest \/ Décolletage/.test(PROMPT)
  && /unbuttoning/.test(PROMPT)
  && (() => { const g = gov(mk('Shirt', { front_opening_extent: o('OBSERVED', 'Full'), closure_type: o('OBSERVED', 'Button'), exposure_opening: absentM('chest visible only because buttons are undone — styling state, not garment-intrinsic') })); return valid(g) && noRegion(g); })());
ok('S02 jacket worn open only → NO intrinsic Class A',
  /an open jacket revealing the torso is NOT an exposure region/.test(PROMPT) && /unzipping/.test(PROMPT) && /wearing a shirt\/jacket\/coat open/.test(PROMPT)
  && (() => { const g = gov(mk('Jacket', { exposure_opening: absentM('torso visible only because the jacket is worn open — styling state') })); return valid(g) && noRegion(g); })());
ok('S03 shirt tied at the waist only → NO intrinsic Midriff / Waist',
  /a shirt knotted at the waist baring the midriff is NOT Midriff \/ Waist/.test(PROMPT) && /tying or knotting/.test(PROMPT)
  && (() => { const g = gov(mk('Shirt', { exposure_opening: absentM('midriff bared only by a knotted hem — styling state') })); return valid(g) && noRegion(g); })());
ok('S04 sleeve / hem rolled only → NO intrinsic Class A',
  /rolling a sleeve or hem/.test(PROMPT)
  && (() => { const g = gov(mk('Sweater', { exposure_opening: absentM('skin visible only where the sleeve is rolled — styling state') })); return valid(g) && noRegion(g); })());
ok('S05 garment displaced by pose / movement → NO intrinsic Class A',
  /the garment displaced or pushed aside, transient movement, or a pose/.test(PROMPT)
  && (() => { const g = gov(mk('T-Shirt', { exposure_opening: absentM('midriff momentarily visible because the garment is pushed aside in this pose') })); return valid(g) && noRegion(g); })());

// ── S06–S08 · the firewall must NOT suppress valid garment-intrinsic exposure ─
ok('S06 cropped T-Shirt with a real designed skin gap → Midriff / Waist still valid',
  (() => { const g = gov(mk('T-Shirt', { length: o('OBSERVED', 'Cropped'), exposure_opening: multi('Midriff / Waist') }));
    return valid(g) && !errs(g).some(e => e.param === 'exposure_opening') && !noRegion(g); })()
  && /if this garment were fastened and worn as constructed, and hung straight, would this body region still be bared/.test(PROMPT));
ok('S07 designed Open Back → Class B valid; Class A Back only on real visible exposure',
  (() => { const b = gov(mk('Shirt', { exposure_opening: multi('Open Back') }));
    const both = gov(mk('Shirt', { exposure_opening: multi('Back', 'Open Back') }));
    return valid(b) && valid(both) && noRegion(b) && !noRegion(both); })()
  && /Class B never auto-derives Class A by name/.test(PROMPT));
ok('S08 transparency + real body visibility → Surface AND Class A still co-observe',
  (() => { const g = gov(mk('Shirt', { surface: multi('Semi Transparent'), exposure_opening: multi('Chest / Décolletage') }));
    return valid(g) && !errs(g).some(e => e.param === 'surface' || e.param === 'exposure_opening') && !noRegion(g); })()
  && /SURFACE AND EXPOSURE ARE INDEPENDENT AND MAY CO-OCCUR/.test(PROMPT));

// ── invariants: the closeout changed nothing structural ─────────────────────
ok('I1 applicability untouched by the closeout — UNIVERSAL on all 10',
  R.CATEGORIES.length === 10 && R.CATEGORIES.every(c => R.operationalClass('exposure_opening', c) === 'U'));
ok('I2 parameter count 37 · 9-value domain · Class A/B partition unchanged',
  R.ALL_PARAMS.length === 37 && R.VALUE_DOMAINS.exposure_opening.length === 9
  && R.EXPOSURE_REGION.length === 5 && R.EXPOSURE_DESIGNED_OPENING.length === 4
  && R.EXPOSURE_REGION.concat(R.EXPOSURE_DESIGNED_OPENING).slice().sort().join('|') === R.VALUE_DOMAINS.exposure_opening.slice().sort().join('|'));
ok('I3 EXPOSURE_EI_MAP unchanged (REGION class only)',
  JSON.stringify(R.EXPOSURE_EI_MAP) === JSON.stringify({ 'Chest / Décolletage': 'E01', 'Midriff / Waist': 'E02', 'Back': 'E03', 'Upper Thigh': 'E04', 'Shoulder': 'E05' }));

// ── ★ NON-VACUITY against the sealed pre-closeout prompt text ────────────────
ok('NV non-vacuity — none of the styling-state clause existed in the sealed pre-closeout prompt',
  !/STYLING STATE IS NEVER EXPOSURE/.test(PRE) && !/buttons are undone is NOT Chest/.test(PRE)
  && !/tying or knotting/.test(PRE) && !/displaced or pushed aside/.test(PRE)
  // and the pre-closeout firewall clauses that WERE already there are still there now (no regression)
  && /Crop ≠ automatic Midriff \/ Waist/.test(PRE) && /Crop ≠ automatic Midriff \/ Waist/.test(PROMPT));

console.log('\n  STYLING-STATE FIREWALL: ' + pass + ' passed, ' + failed.length + ' failed');
if (failed.length) { console.log('  FAILED: ' + failed.join(' | ')); process.exit(1); }
console.log('  ⛔ API 0 · offline only — live model adherence is the separate (unapproved) live revalidation set.\n');
