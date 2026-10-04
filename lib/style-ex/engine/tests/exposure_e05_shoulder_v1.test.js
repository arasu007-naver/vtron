'use strict';
/**
 * STMX — EXPOSURE SEMANTIC / STATE DISCIPLINE CORRECTION V1 · E05 SHOULDER PRECISION (order §12 · E05-01–07)
 *
 * CEO Decision 2026-09-03 (post-live targeted correction): the first live run emitted `Shoulder` for the
 * ordinary spaghetti-strap shoulder visibility of REF_000593. That is a FALSE POSITIVE under the existing
 * Exposure Canonical, whose E05 entry already excludes it:
 *   "Exclude: 일반 sleeveless · 일반 tank top · 일반 camisole의 자연 arm/shoulder visibility ·
 *    단순히 sleeve 없음 · ordinary arm exposure. ⛔ Sleeveless identity ≠ Exposure Evidence."
 *   (04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_ARCHITECTURE/STMX_EI_EXPOSURE_EXPRESSION_OBSERVATION_CANONICAL_V1.md §E05)
 *
 * ⛔ E05 IS NOT REDEFINED HERE. The production prompt is brought into line with the canonical Include/Exclude
 *    that was already binding. No new vocabulary, no new threshold, no new state, no schema change.
 *
 * ⛔ EXTERNAL VISION / API CALLS = 0. Whether a shoulder is "widely bared" is an EXTRACTION-TIME judgement;
 *    the contract layer cannot manufacture it. What is asserted here is (a) the canonical exclusion is present
 *    in production prompt text, naming every excluded construction, (b) the canonical INCLUDE list survives so
 *    genuine E05 remains reachable, and (c) the contract still ACCEPTS both the suppressed and the valid record
 *    shapes — i.e. the correction suppresses nothing the architecture allows.
 * ★ NON-VACUITY: every doctrine assertion is paired against the sealed PRE-correction prompt
 *   (fixtures/prompt_pre_semantic_state_022afe837453ffb6.txt), where the clause must be ABSENT.
 */
const path = require('path'), fs = require('fs');
const PV1 = path.resolve(__dirname, '..');
const R = require(path.join(PV1, 'producer_rules_v1.js'));
const C = require(path.join(PV1, 'producer_controller_v1.js'));
const PROMPT = fs.readFileSync(path.join(PV1, 'producer_prompt_v1.js'), 'utf8');
const PRE = fs.readFileSync(path.join(__dirname, 'fixtures', 'prompt_pre_semantic_state_022afe837453ffb6.txt'), 'utf8');

let pass = 0; const failed = [];
const ok = (n, c) => { if (c) pass++; else { failed.push(n); console.log('  FAIL:', n); } };

const o = (s, v, e) => ({ state: s, value: v === undefined ? null : v, evidence: [e || 'fx'] });
const multi = (...vs) => ({ state: 'OBSERVED', values: vs.map(v => ({ value: v, evidence: ['fx'] })) });
const multiE = pairs => ({ state: 'OBSERVED', values: pairs.map(([v, e]) => ({ value: v, evidence: [e] })) });
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
const expOf = g => ((g.record && g.record.observations && g.record.observations.exposure_opening) || {});
const vals = g => (expOf(g).values || []).map(v => v.value);
const hasShoulder = g => vals(g).includes('Shoulder');

// the governing clause, asserted once and reused
const EXCL = /DOES NOT QUALIFY: the ordinary shoulder and arm visibility of a conventional sleeveless top, tank top, camisole, or spaghetti-strap \/ ordinary narrow-strap garment/;
const SLEEVELESS_IDENTITY = /SLEEVELESS IDENTITY IS NOT EXPOSURE EVIDENCE/;
const INCLUDE = /QUALIFIES: off-shoulder · strapless · bandeau · one-shoulder · a wide or open shoulder neckline · a shoulder cutout · an upper-torso opening/;

console.log('\n══ EXPOSURE E05 SHOULDER PRECISION TESTS (E05-01–07) ══\n');

// ── E05-01–04 · ordinary sleeveless family must NOT auto-create Shoulder ─────
ok('E05-01 ordinary sleeveless T-Shirt → no automatic Shoulder',
  EXCL.test(PROMPT) && /conventional sleeveless top/.test(PROMPT)
  && (() => { const g = gov(mk('T-Shirt', { sleeve: o('OBSERVED', 'Sleeveless'), exposure_opening: absentM('ordinary sleeveless shoulder visibility — not pronounced shoulder exposure') })); return valid(g) && !hasShoulder(g); })());

ok('E05-02 ordinary tank top → no automatic Shoulder',
  /tank top/.test(PROMPT) && EXCL.test(PROMPT)
  && (() => { const g = gov(mk('T-Shirt', { sleeve: o('OBSERVED', 'Sleeveless'), neckline_shape: o('OBSERVED', 'Square'), exposure_opening: absentM('ordinary tank shoulder visibility — the normal appearance of a sleeveless garment') })); return valid(g) && !hasShoulder(g); })());

ok('E05-03 ordinary camisole → no automatic Shoulder',
  /camisole/.test(PROMPT) && EXCL.test(PROMPT)
  && (() => { const g = gov(mk('T-Shirt', { sleeve: o('OBSERVED', 'Sleeveless'), exposure_opening: absentM('ordinary camisole shoulder visibility') })); return valid(g) && !hasShoulder(g); })());

ok('E05-04 ordinary spaghetti straps → no automatic Shoulder',
  /spaghetti-strap \/ ordinary narrow-strap garment/.test(PROMPT)
  && /Straps resting on the shoulders with the surrounding shoulder line bared in the ordinary way emits NOTHING here, no matter how thin the straps are/.test(PROMPT)
  && (() => { const g = gov(mk('T-Shirt', { sleeve: o('OBSERVED', 'Sleeveless'), exposure_opening: absentM('thin straps only — ordinary narrow-strap shoulder line, not pronounced baring') })); return valid(g) && !hasShoulder(g); })());

// ── E05-05 · the REF_000593 shape: Midriff valid, Shoulder suppressed ────────
ok('E05-05 cropped spaghetti-strap top with real midriff → Midriff / Waist valid, Shoulder absent',
  (() => {
    const g = gov(mk('T-Shirt', { sleeve: o('OBSERVED', 'Sleeveless'), length: o('OBSERVED', 'Cropped'), exposure_opening: multiE([['Midriff / Waist', 'bare abdomen between the cropped hem and the legging waistband']]) }));
    return valid(g) && vals(g).includes('Midriff / Waist') && !hasShoulder(g) && vals(g).length === 1;
  })());

// ── E05-06 · genuine pronounced E05 must remain reachable ───────────────────
ok('E05-06 canonical pronounced shoulder-baring case → Shoulder still possible',
  INCLUDE.test(PROMPT)
  && (() => { const g = gov(mk('Dress', { exposure_opening: multiE([['Shoulder', 'off-shoulder construction leaves the whole shoulder line and upper torso widely bared in the frame']]) })); return valid(g) && hasShoulder(g); })());

ok('E05-06b Shoulder + Chest / Décolletage co-emission still accepted',
  (() => { const g = gov(mk('Dress', { exposure_opening: multiE([['Shoulder', 'strapless bodice leaves the shoulders fully bared'], ['Chest / Décolletage', 'upper chest visibly bared above the bodice edge']]) })); return valid(g) && hasShoulder(g) && vals(g).includes('Chest / Décolletage'); })());

// ── E05-07 · construction label alone never creates the region ──────────────
ok('E05-07 strapless / off-shoulder label alone → no automatic region without visible exposure',
  /Off-shoulder ≠ Shoulder unless meaningful exposure is actually visible/.test(PROMPT)
  && /Strapless ≠ blindly derived Shoulder or Chest \/ Décolletage without visual confirmation/.test(PROMPT)
  && /and only when that baring is actually visible in the frame/.test(PROMPT)
  && (() => { const g = gov(mk('Dress', { exposure_opening: absentM('off-shoulder construction named, but the shoulder line is not visible in this crop — no region asserted') })); return valid(g); })());

// ── structural invariants — nothing was redefined ───────────────────────────
ok('I1 Class A region set unchanged (5)', JSON.stringify(R.EXPOSURE_REGION) === JSON.stringify(['Shoulder', 'Chest / Décolletage', 'Midriff / Waist', 'Back', 'Upper Thigh']));
ok('I2 exposure_opening domain unchanged (9)', R.domainFor('exposure_opening', 'T-Shirt').length === 9);
ok('I3 exposure_opening still UNIVERSAL on all 10 categories', ['T-Shirt', 'Shirt', 'Sweater', 'Sweatshirt', 'Jacket', 'Coat', 'Dress', 'Skirt', 'Trouser', 'Jumpsuit'].every(c => R.operationalClass('exposure_opening', c) === 'U'));
ok('I4 state vocabulary unchanged (4)', JSON.stringify(R.STATES) === JSON.stringify(['OBSERVED', 'ABSENT', 'NOT_VISIBLE', 'UNKNOWN']));
ok('I5 ALL_PARAMS still 37', R.ALL_PARAMS.length === 37);
ok('I6 the canonical exclusion wording is anchored to E05, not to a new threshold',
  /PRONOUNCED shoulder \/ upper-torso exposure/.test(PROMPT) && !/E05-|new threshold|meaningfulness score/i.test(PROMPT.split('Shoulder = PRONOUNCED')[1].slice(0, 900)));

// ── non-vacuity: the pre-correction prompt must NOT contain these clauses ───
ok('NV1 exclusion clause absent from the sealed pre-correction prompt', !EXCL.test(PRE));
ok('NV2 "SLEEVELESS IDENTITY IS NOT EXPOSURE EVIDENCE" absent pre-correction', !SLEEVELESS_IDENTITY.test(PRE) && SLEEVELESS_IDENTITY.test(PROMPT));
ok('NV3 canonical INCLUDE list absent pre-correction', !INCLUDE.test(PRE));
ok('NV4 pre-correction prompt carried only the short Shoulder gloss',
  /Shoulder = meaningful visible exposure of the shoulder region\./.test(PRE) && !/Shoulder = meaningful visible exposure of the shoulder region\./.test(PROMPT));

console.log(`\n══ E05 SHOULDER: ${pass} passed / ${failed.length} failed ══`);
if (failed.length) { console.log('FAILED:', failed.join(' | ')); process.exitCode = 1; }
module.exports = { pass, failed };
