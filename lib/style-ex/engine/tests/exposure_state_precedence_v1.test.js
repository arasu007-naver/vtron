'use strict';
/**
 * STMX — EXPOSURE SEMANTIC / STATE DISCIPLINE CORRECTION V1 · STATE PRECEDENCE (order §13 · STATE-01–08)
 *
 * CEO Decision 2026-09-03 (post-live targeted correction): the first live run returned ABSENT for
 * REF_000001, a flat/no-wearer Jacket. The model reasoned "closed tailored blazer body, no cut-outs
 * or bared body region by design" — i.e. it settled the single state carrier on the CLASS B reading
 * (determinable on a flat shot) and let that stand for the CLASS A reading (NOT determinable without
 * a body). NO WEARER ≠ CONFIRMED NO BODY EXPOSURE.
 *
 * ⛔ NO SCHEMA CHANGE. Class A and Class B are NOT split. No state is added. The four existing states
 *    are given a deterministic resolution ORDER in the production prompt:
 *      S1 any positive Class A/B value            → OBSERVED
 *      S2 else body relationship unreadable       → NOT_VISIBLE   (⛔ never ABSENT)
 *      S3 else readable and nothing qualifies     → ABSENT
 *      S4 else in frame but unresolvable          → UNKNOWN
 *
 * ⛔ EXTERNAL VISION / API CALLS = 0. State selection is an EXTRACTION-TIME judgement; the contract layer
 *    accepts all four states by design and cannot force the choice. What is asserted here is (a) the
 *    precedence is present in production prompt text, rule by rule, (b) each rule's target state is
 *    contract-VALID for the corresponding record shape, so the precedence demands nothing the architecture
 *    forbids, and (c) the two live-defect shapes are pinned as fixtures.
 * ★ NON-VACUITY: every doctrine assertion is paired against the sealed PRE-correction prompt, where the
 *   clause must be ABSENT.
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
const stateM = (s, e) => ({ state: s, values: [], evidence: [e] });
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
const st = g => expOf(g).state;
const vals = g => (expOf(g).values || []).map(v => v.value);

const S1 = /\(S1\) If ANY Class A region or Class B opening is positively established in this image, answer OBSERVED/;
const S2 = /\(S2\) Otherwise, if there is no wearer \/ no body relationship, or the Class A body reading cannot be meaningfully assessed, answer NOT_VISIBLE/;
const S2GUARD = /Class B absence can NEVER convert an unreadable Class A into confirmed absence/;
const S3 = /\(S3\) Otherwise, when the garment\/body relationship IS readable and nothing qualifies, answer ABSENT/;
const S4 = /\(S4\) When the relevant area is in frame but the reading cannot be settled, answer UNKNOWN/;
const ORDER = /RESOLVE THE STATE IN THIS FIXED ORDER — the FIRST rule that applies decides/;
const DISTINCT = /NOT_VISIBLE, UNKNOWN and ABSENT are three different answers and must never be substituted for one another/;

console.log('\n══ EXPOSURE STATE PRECEDENCE TESTS (STATE-01–08) ══\n');

// ── STATE-01 / 02 · flat, no wearer, no positive value → NOT_VISIBLE ────────
ok('STATE-01 flat Jacket · no wearer · no positive Class A/B → NOT_VISIBLE',
  S2.test(PROMPT) && ORDER.test(PROMPT)
  && (() => { const g = gov(mk('Jacket', { exposure_opening: stateM('NOT_VISIBLE', 'garment shown flat with no wearer; the Class A body relationship cannot be read either way') })); return valid(g) && st(g) === 'NOT_VISIBLE'; })());

ok('STATE-02 flat Shirt · no wearer · no positive Class A/B → NOT_VISIBLE',
  /A flat or hanger blazer with no cutout is NOT_VISIBLE — not ABSENT/.test(PROMPT)
  && (() => { const g = gov(mk('Shirt', { exposure_opening: stateM('NOT_VISIBLE', 'hanger product shot; no body reference against which to read a Class A region') })); return valid(g) && st(g) === 'NOT_VISIBLE'; })());

// ── STATE-03 · S1 outranks S2: a positive Class B on a flat image → OBSERVED
ok('STATE-03 flat garment · no wearer · visible Side Cutout → OBSERVED + Side Cutout',
  /This holds even with no wearer: a visible Side Cutout on a flat product shot is OBSERVED \+ Side Cutout/.test(PROMPT)
  && (() => { const g = gov(mk('Dress', { exposure_opening: multiE([['Side Cutout', 'a deliberate opening is cut at the side torso, plainly visible on the flat garment']]) })); return valid(g) && st(g) === 'OBSERVED' && vals(g).includes('Side Cutout'); })());

// ── STATE-04 · S3 · worn + readable + nothing qualifies → ABSENT ────────────
ok('STATE-04 worn garment · body relationship readable · no Class A/B evidence → ABSENT',
  S3.test(PROMPT) && /ABSENT is a positive finding of absence and requires a readable body relationship/.test(PROMPT)
  && (() => { const g = gov(mk('Coat', { exposure_opening: absentM('worn on a visible body; the garment covers every canonical region and carries no designed opening') })); return valid(g) && st(g) === 'ABSENT'; })());

// ── STATE-05 · S4 · in frame but unresolvable → UNKNOWN ─────────────────────
ok('STATE-05 worn garment · region visible but ambiguous → UNKNOWN',
  S4.test(PROMPT)
  && (() => { const g = gov(mk('Dress', { exposure_opening: stateM('UNKNOWN', 'the midriff area is in frame but motion blur prevents settling whether skin is bared') })); return valid(g) && st(g) === 'UNKNOWN'; })());

// ── STATE-06 / 07 · the exact live defect must not recur ────────────────────
ok('STATE-06 no wearer + no Class-A region must NOT be read as ABSENT',
  S2GUARD.test(PROMPT) && /Seeing that the garment carries no designed opening does NOT entitle you to answer ABSENT/.test(PROMPT));

ok('STATE-07 Class-B absence cannot override Class-A NOT_VISIBLE into a global ABSENT',
  S2GUARD.test(PROMPT)
  && (() => {
    // both shapes are contract-representable; the precedence — not the validator — selects NOT_VISIBLE
    const right = gov(mk('Jacket', { exposure_opening: stateM('NOT_VISIBLE', 'flat shot: no cutout is present, but the Class A body reading is unavailable') }));
    const wrong = gov(mk('Jacket', { exposure_opening: absentM('no cut-outs or bared body region by design') }));
    return valid(right) && st(right) === 'NOT_VISIBLE' && valid(wrong) && st(wrong) === 'ABSENT';
  })());

// ── STATE-08 · S1 is unconditional ─────────────────────────────────────────
ok('STATE-08 a valid Class-A positive → OBSERVED regardless of other unreadable sub-aspects',
  S1.test(PROMPT) && /the FIRST rule that applies decides, and later rules are not consulted/.test(PROMPT)
  && (() => { const g = gov(mk('Skirt', { exposure_opening: multiE([['Upper Thigh', 'a high slit bares the upper thigh; the back of the garment is not visible in this frame']]) })); return valid(g) && st(g) === 'OBSERVED' && vals(g).includes('Upper Thigh'); })());

// ── §14 · REF_000593 offline replay fixture ────────────────────────────────
ok('FX-593 REF_000593 replay · OBSERVED · includes Midriff / Waist · excludes Shoulder',
  (() => {
    const g = gov(mk('T-Shirt', { sleeve: o('OBSERVED', 'Sleeveless'), length: o('OBSERVED', 'Cropped'), fit: o('OBSERVED', 'Slim'), exposure_opening: multiE([['Midriff / Waist', 'bare abdomen between the cropped top hem and the legging waistband']]) }));
    return valid(g) && st(g) === 'OBSERVED' && vals(g).includes('Midriff / Waist') && !vals(g).includes('Shoulder');
  })());
ok('FX-593b the live Shoulder emission is the shape this correction rejects',
  (() => { const g = gov(mk('T-Shirt', { sleeve: o('OBSERVED', 'Sleeveless'), length: o('OBSERVED', 'Cropped'), exposure_opening: multiE([['Midriff / Waist', 'bare abdomen'], ['Shoulder', 'thin spaghetti straps leave the shoulders visibly bare']]) }));
    // contract-valid but canonically wrong: the prompt exclusion — not the validator — is what suppresses it
    return valid(g) && vals(g).includes('Shoulder') && /Straps resting on the shoulders/.test(PROMPT); })());

// ── §15 · REF_000001 offline replay fixture ────────────────────────────────
ok('FX-001 REF_000001 replay · flat Jacket · no wearer · no Class A/B → NOT_VISIBLE',
  (() => { const g = gov(mk('Jacket', { length: o('NOT_VISIBLE', null, 'garment shown flat, not worn on a body; no body landmark to place the hem against'), exposure_opening: stateM('NOT_VISIBLE', 'flat product shot with no wearer; Class A body exposure cannot be assessed and no Class B opening is present') })); return valid(g) && st(g) === 'NOT_VISIBLE'; })());
ok('FX-001b ABSENT is the rejected answer for that fixture', st(gov(mk('Jacket', { exposure_opening: absentM('no cut-outs or bared body region by design') }))) === 'ABSENT' && S2GUARD.test(PROMPT));

// ── downstream safety (order §7) — documented, not implemented here ─────────
ok('DS1 NOT_VISIBLE is a distinct state from ABSENT in the contract vocabulary',
  R.STATES.includes('NOT_VISIBLE') && R.STATES.includes('ABSENT') && R.STATES.includes('UNKNOWN') && DISTINCT.test(PROMPT));

// ── structural invariants — nothing was split, added or renamed ─────────────
ok('I1 exposure_opening is still ONE parameter (no Class A/B split)', R.ALL_PARAMS.filter(p => /exposure/i.test(p)).length === 1);
ok('I2 state vocabulary still exactly 4', R.STATES.length === 4 && JSON.stringify(R.STATES) === JSON.stringify(['OBSERVED', 'ABSENT', 'NOT_VISIBLE', 'UNKNOWN']));
ok('I3 domain still 9 (5 Class A + 4 Class B)', R.EXPOSURE_REGION.length === 5 && R.domainFor('exposure_opening', 'Jacket').length === 9);
ok('I4 ALL_PARAMS still 37', R.ALL_PARAMS.length === 37);
ok('I5 exposure_opening still UNIVERSAL 10/10', ['T-Shirt', 'Shirt', 'Sweater', 'Sweatshirt', 'Jacket', 'Coat', 'Dress', 'Skirt', 'Trouser', 'Jumpsuit'].every(c => R.operationalClass('exposure_opening', c) === 'U'));

// ── non-vacuity ────────────────────────────────────────────────────────────
ok('NV1 precedence header absent from the sealed pre-correction prompt', !ORDER.test(PRE) && ORDER.test(PROMPT));
ok('NV2 S1 absent pre-correction', !S1.test(PRE));
ok('NV3 S2 + its Class-B guard absent pre-correction', !S2.test(PRE) && !S2GUARD.test(PRE));
ok('NV4 S3 absent pre-correction', !S3.test(PRE));
ok('NV5 S4 absent pre-correction', !S4.test(PRE));
ok('NV6 the pre-correction prompt already forbade the no-wearer→ABSENT slip, so the ADDITION is the ordering',
  /NEVER turn "no visible wearer \/ flat or hanger product shot \/ body relationship unreadable" into ABSENT/.test(PRE) && !DISTINCT.test(PRE));

console.log(`\n══ STATE PRECEDENCE: ${pass} passed / ${failed.length} failed ══`);
if (failed.length) { console.log('FAILED:', failed.join(' | ')); process.exitCode = 1; }
module.exports = { pass, failed };
