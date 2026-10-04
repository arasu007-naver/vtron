'use strict';
/**
 * STMX — VISION EXPOSURE CATEGORY APPLICABILITY CORRECTION V1 · TARGETED TESTS (order §22 · T01–T18)
 *
 * CEO Decision 2026-09-03: body exposure is CATEGORY-INDEPENDENT. The Dress/Jumpsuit-only
 * applicability gate on `exposure_opening` is SUPERSEDED; the parameter is UNIVERSAL.
 *
 * ⛔ EXTERNAL VISION / API CALLS = 0. Every case is a synthetic contract fixture exercised through
 *    the REAL controller + validator. No live re-extraction, no image is read.
 * ★ NON-VACUITY: the acceptance cases are paired with a SIMULATED pre-correction applicability
 *   (the exposure_opening cell forced back to its old class) and must FAIL there — so a green test
 *   proves the repair, not itself.
 */
const path = require('path');
const PV1 = path.resolve(__dirname, '..');
const R = require(path.join(PV1, 'producer_rules_v1.js'));
const C = require(path.join(PV1, 'producer_controller_v1.js'));

let pass = 0; const failed = [];
const ok = (name, cond) => { if (cond) pass++; else { failed.push(name); console.log('  FAIL:', name); } };

// ── fixture builder (same proven shape as component_scale_v1.test.js: values taken from live domains) ──
const o = (state, value, ev) => ({ state, value: value === undefined ? null : value, evidence: [ev || 'synthetic fixture'] });
const multi = (...vals) => ({ state: 'OBSERVED', values: vals.map(v => ({ value: v, evidence: ['synthetic fixture'] })) });
const absentM = ev => ({ state: 'ABSENT', values: [], evidence: [ev || 'none visible'] });
const absent = ev => ({ state: 'ABSENT', value: null, evidence: [ev || 'none visible'] });
const st = (state, ev) => ({ state, values: [], evidence: [ev || 'unreadable'] });

function mk(category, over) {
  // pick a legal value straight from the live domain so the fixture can never fight the contract
  const legal = (p, prefer) => {
    const d = R.domainFor(p, category);
    if (!Array.isArray(d) || !d.length) return null;
    return d.includes(prefer) ? prefer : d.find(v => v !== 'None') || d[0];
  };
  const base = {
    category: o('OBSERVED', category),
    trouser_distinction: o('OBSERVED', legal('trouser_distinction', 'Casual')),
    silhouette: o('OBSERVED', legal('silhouette', 'Straight')),
    fit: o('OBSERVED', legal('fit', 'Regular')), length: o('OBSERVED', legal('length', 'Regular')),
    fabric_behavior: o('OBSERVED', legal('fabric_behavior', 'Structured')),
    waist_definition: o('OBSERVED', legal('waist_definition', 'Defined')),
    sleeve: o('OBSERVED', legal('sleeve', 'Long')), shoulder_drop: o('OBSERVED', legal('shoulder_drop', 'None')),
    shoulder_structure: o('OBSERVED', legal('shoulder_structure', 'Mild')),
    neckline_shape: o('OBSERVED', 'Round'), neckline_position: o('OBSERVED', 'Regular'),
    collar: o('OBSERVED', 'Shirt'), rib_hem: o('OBSERVED', 'None'),
    hood: absent('no hood'), front_opening_extent: o('OBSERVED', 'Full'),
    closure_type: o('OBSERVED', legal('closure_type', 'Button')), grammar: o('OBSERVED', legal('grammar', 'Tailored')),
    material: multi('Cotton'), surface: absentM('plain'),
    pattern: absent('solid'), graphic: absent('none'), pocket: o('OBSERVED', 'None'),
    decorative_detail: absentM('none'), attachment: absentM('none'),
    asymmetry: o('OBSERVED', 'None'), slit: o('OBSERVED', 'None'), ruffle: o('OBSERVED', 'None'),
    exposure_opening: absentM('no exposed body region and no designed opening'),
    cuff_type: o('OBSERVED', 'Standard'), cuff_scale: o('OBSERVED', 'Regular'),
    collar_scale: o('OBSERVED', 'Regular'), sleeve_volume: o('OBSERVED', 'Regular'),
  };
  const appl = R.applicableSet(category);
  const observations = {};
  for (const [k, v] of Object.entries(base)) if (appl.has(k) || k === 'category') observations[k] = v;
  Object.assign(observations, over || {});
  for (const k of Object.keys(observations)) if (observations[k] === undefined) delete observations[k];
  return {
    descriptor: category.toLowerCase() + ' fixture', identity: { value: true, evidence: ['garment'] },
    readability: { value: true, basis: (true) ? 'RECONSTRUCTABLE' : 'NOT_RECONSTRUCTABLE', basis: (true) ? 'RECONSTRUCTABLE' : 'NOT_RECONSTRUCTABLE', basis: 'RECONSTRUCTABLE', evidence: ['clear'] }, prominence: 'dominant',
    category: { state: 'OBSERVED', value: category }, observations,
  };
}
const govern = t => C.governTarget(t);
const obsOf = g => (g.record && g.record.observations) || {};
const errs = g => ((g.validation && g.validation.errors) || []);
const naErr = g => errs(g).some(e => e.code === 'NOT_APPLICABLE_EMITTED' && e.param === 'exposure_opening');
const anyExpErr = g => errs(g).some(e => e.param === 'exposure_opening');
const valid = g => g.validation && g.validation.ok === true;
const withExp = (cat, ...vals) => govern(mk(cat, { exposure_opening: multi(...vals) }));

console.log('\n══ VISION EXPOSURE CATEGORY APPLICABILITY — TARGETED TESTS (T01–T18) ══\n');

// ── T01–T08 · the eight previously-gated categories now accept exposure ───────
ok('T01 T-Shirt + Midriff / Waist → applicable / accepted',
  !naErr(withExp('T-Shirt', 'Midriff / Waist')) && !anyExpErr(withExp('T-Shirt', 'Midriff / Waist')) && valid(withExp('T-Shirt', 'Midriff / Waist')));
ok('T02 Sweater + Midriff / Waist → applicable / accepted',
  !naErr(withExp('Sweater', 'Midriff / Waist')) && valid(withExp('Sweater', 'Midriff / Waist')));
ok('T03 Jacket + Midriff / Waist → applicable / accepted',
  !naErr(withExp('Jacket', 'Midriff / Waist')) && valid(withExp('Jacket', 'Midriff / Waist')));
ok('T04 Shirt + Chest / Décolletage → applicable / accepted',
  !naErr(withExp('Shirt', 'Chest / Décolletage')) && valid(withExp('Shirt', 'Chest / Décolletage')));
ok('T05 Skirt + Upper Thigh → applicable / accepted',
  !naErr(withExp('Skirt', 'Upper Thigh')) && valid(withExp('Skirt', 'Upper Thigh')));
ok('T06 Trouser + Upper Thigh → applicable / accepted',
  !naErr(withExp('Trouser', 'Upper Thigh')) && valid(withExp('Trouser', 'Upper Thigh')));
ok('T07 T-Shirt + Side Cutout → Class B allowed',
  !naErr(withExp('T-Shirt', 'Side Cutout')) && valid(withExp('T-Shirt', 'Side Cutout')));
ok('T08 Jacket + Front Cutout → Class B allowed',
  !naErr(withExp('Jacket', 'Front Cutout')) && valid(withExp('Jacket', 'Front Cutout')));

// ── T09–T13 · the no-auto-inference firewall is PROMPT doctrine, asserted on the prompt text ──
// (These are extraction-time judgements. The contract layer cannot manufacture them; what it CAN
//  guarantee is that emitting nothing stays legal — asserted here — and that the prompt forbids the
//  inference by name.)
const PROMPT = require('fs').readFileSync(path.join(PV1, 'producer_prompt_v1.js'), 'utf8');
ok('T09 Crop T-Shirt with no visible skin gap → no auto Midriff (firewall stated; ABSENT legal)',
  /Crop ≠ automatic Midriff \/ Waist \(a crop top over a high waistband showing no skin gap emits nothing\)/.test(PROMPT)
  && valid(govern(mk('T-Shirt', { length: o('OBSERVED', 'Cropped') }))));
ok('T10 Mini Skirt without pronounced upper-thigh exposure → no auto Upper Thigh',
  /Mini ≠ automatic Upper Thigh/.test(PROMPT)
  && valid(govern(mk('Skirt', { length: o('OBSERVED', 'Mini') }))));
ok('T11 Slit without pronounced upper-thigh visibility → no auto Upper Thigh',
  /A slit ≠ automatic Upper Thigh — a modest slit exposes no upper thigh/.test(PROMPT)
  && valid(govern(mk('Skirt', { slit: o('OBSERVED', 'Present') }))));
ok('T12 Sleeveless without qualifying Shoulder exposure → no auto Shoulder',
  /Sleeveless ≠ automatic Shoulder/.test(PROMPT)
  && valid(govern(mk('T-Shirt', { sleeve: o('OBSERVED', 'Sleeveless'), cuff_type: undefined, cuff_scale: undefined, sleeve_volume: undefined }))));
ok('T13 Transparent garment without meaningful body visibility → Surface only, no auto Exposure region',
  /Transparent \/ Semi Transparent ≠ automatic body-region exposure/.test(PROMPT)
  && valid(govern(mk('Shirt', { surface: multi('Transparent') }))));

// ── T14 · surface + Class A may co-observe ───────────────────────────────────
ok('T14 Transparent + actual meaningful body visibility → Surface AND Class-A region co-exist',
  (() => { const g = govern(mk('Shirt', { surface: multi('Semi Transparent'), exposure_opening: multi('Chest / Décolletage') }));
    return valid(g) && !anyExpErr(g) && !errs(g).some(e => e.param === 'surface'); })()
  && /SURFACE AND EXPOSURE ARE INDEPENDENT AND MAY CO-OCCUR/.test(PROMPT));

// ── T15 · UNKNOWN / NOT_VISIBLE must not become ABSENT ───────────────────────
ok('T15 UNKNOWN / NOT_VISIBLE preserved — not silently converted to ABSENT', (() => {
  const u = govern(mk('T-Shirt', { exposure_opening: st('UNKNOWN', 'midriff in frame but reading unsettled') }));
  const n = govern(mk('Trouser', { exposure_opening: st('NOT_VISIBLE', 'lower body cropped out of frame') }));
  return valid(u) && valid(n)
    && obsOf(u).exposure_opening.state === 'UNKNOWN'
    && obsOf(n).exposure_opening.state === 'NOT_VISIBLE';
})());
ok('T15b prompt forbids "no visible wearer ⇒ ABSENT" (a missing body reference is not evidence of no exposure)',
  /NEVER turn "no visible wearer \/ flat or hanger product shot \/ body relationship unreadable" into ABSENT/.test(PROMPT));

// ── T16 · Class B never auto-creates Class A ────────────────────────────────
ok('T16 Class B does not auto-create Class A', (() => {
  const g = withExp('T-Shirt', 'Side Cutout');
  const vals = (obsOf(g).exposure_opening.values || []).map(v => v.value);
  return valid(g) && vals.length === 1 && vals[0] === 'Side Cutout'
    && !vals.some(v => R.EXPOSURE_REGION.includes(v))
    && /Class B never auto-derives Class A by name/.test(PROMPT);
})());
ok('T16b Class-B-only record is flagged for review, not rejected (legal: an opening may bare nothing)',
  (() => { const g = withExp('Jacket', 'Front Cutout');
    return valid(g) && ((g.validation.warnings || []).some(w => w.code === 'EXPOSURE_OPENING_WITHOUT_REGION')); })());

// ── T17 · Class A + Class B co-occurrence ───────────────────────────────────
ok('T17 Class A + Class B valid co-occurrence (Midriff / Waist + Side Cutout on a top)', (() => {
  const g = withExp('Sweatshirt', 'Midriff / Waist', 'Side Cutout');
  return valid(g) && !anyExpErr(g) && (obsOf(g).exposure_opening.values || []).length === 2;
})());

// ── T18 · every one of the 10 categories: category-only rejection = 0 ───────
ok('T18 all 10 categories — category-only NOT_APPLICABLE rejection = 0', (() => {
  return R.CATEGORIES.length === 10 && R.CATEGORIES.every(c => {
    const region = c === 'Trouser' || c === 'Skirt' ? 'Upper Thigh' : 'Midriff / Waist';
    const g = withExp(c, region);
    return R.operationalClass('exposure_opening', c) === 'U' && !naErr(g) && !anyExpErr(g) && valid(g);
  });
})());

// ── STRUCTURAL INVARIANTS (order §2 / §17) ──────────────────────────────────
ok('S1 parameter count unchanged at 37 · name unchanged · no new parameter',
  R.ALL_PARAMS.length === 37 && R.ALL_PARAMS.includes('exposure_opening')
  && !R.ALL_PARAMS.includes('body_exposure') && !R.ALL_PARAMS.includes('exposure_region') && !R.ALL_PARAMS.includes('cutout_location'));
ok('S2 9-value domain and the TWO-CLASS partition unchanged',
  R.VALUE_DOMAINS.exposure_opening.length === 9
  && JSON.stringify(R.EXPOSURE_REGION) === JSON.stringify(['Shoulder', 'Chest / Décolletage', 'Midriff / Waist', 'Back', 'Upper Thigh'])
  && JSON.stringify(R.EXPOSURE_DESIGNED_OPENING) === JSON.stringify(['Open Back', 'Front Cutout', 'Side Cutout', 'Shoulder Cutout'])
  && R.EXPOSURE_REGION.concat(R.EXPOSURE_DESIGNED_OPENING).sort().join('|') === R.VALUE_DOMAINS.exposure_opening.slice().sort().join('|'));
ok('S3 EXPOSURE_EI_MAP unchanged (E01–E05, REGION class only)',
  JSON.stringify(R.EXPOSURE_EI_MAP) === JSON.stringify({ 'Chest / Décolletage': 'E01', 'Midriff / Waist': 'E02', 'Back': 'E03', 'Upper Thigh': 'E04', 'Shoulder': 'E05' })
  && R.EXPOSURE_DESIGNED_OPENING.every(v => !(v in R.EXPOSURE_EI_MAP)));
ok('S4 completeness reconciles to 37 on every category',
  R.CATEGORIES.every(c => { const x = R.completenessCounts(c); return x.U + x.M + x.C + x.N === 37 && x.total === 37; }));
ok('S5 illegal value still rejected (validator strictness not weakened)',
  errs(withExp('T-Shirt', 'Waist Cutout')).some(e => e.code === 'VALUE_NOT_IN_DOMAIN' && e.param === 'exposure_opening'));
ok('S6 exposure_opening still MULTI and still location-INELIGIBLE',
  R.MULTI.includes('exposure_opening') && !R.isLocationEligible('exposure_opening'));
ok('S7 garment-intrinsic firewall preserved in the prompt (styling state never counts)',
  /BODY EXPOSURE FIREWALL/.test(PROMPT) && /EXPOSURE MUST BE SEEN IN THE FRAME/.test(PROMPT)
  && /EXPOSURE IS NEVER DERIVED FROM neckline_shape/.test(PROMPT));
ok('S8 required-presence — omitting the key on a previously-N category is now an error',
  (() => { const t = mk('T-Shirt'); delete t.observations.exposure_opening;
    return errs(govern(t)).some(e => e.code === 'APPLICABLE_KEY_MISSING' && e.param === 'exposure_opening'); })());

// ── ★ NON-VACUITY — the same harness against the PRE-CORRECTION applicability must FAIL ──
ok('NV non-vacuity: forcing exposure_opening back to Dress/Jumpsuit-only makes T01/T05/T06 fail again', (() => {
  const savedU = R.UNIVERSAL.slice();
  const savedD = R.MANDATORY['Dress'].slice(), savedJ = R.MANDATORY['Jumpsuit'].slice();
  try {
    const i = R.UNIVERSAL.indexOf('exposure_opening'); if (i >= 0) R.UNIVERSAL.splice(i, 1);
    R.MANDATORY['Dress'] = savedD.concat(['exposure_opening']);
    R.MANDATORY['Jumpsuit'] = savedJ.concat(['exposure_opening']);
    const preTee = withExp('T-Shirt', 'Midriff / Waist');
    const preSkirt = withExp('Skirt', 'Upper Thigh');
    const preTrouser = withExp('Trouser', 'Upper Thigh');
    const preDress = withExp('Dress', 'Midriff / Waist');
    return naErr(preTee) && naErr(preSkirt) && naErr(preTrouser) && !naErr(preDress);
  } finally {
    R.UNIVERSAL.length = 0; savedU.forEach(x => R.UNIVERSAL.push(x));
    R.MANDATORY['Dress'] = savedD; R.MANDATORY['Jumpsuit'] = savedJ;
  }
})());
ok('NV restore proof: the live authority is back to UNIVERSAL after the mutation probe',
  R.operationalClass('exposure_opening', 'T-Shirt') === 'U' && R.UNIVERSAL.length === 9
  && !R.MANDATORY['Dress'].includes('exposure_opening'));

console.log('\n  EXPOSURE CATEGORY APPLICABILITY TARGETED: ' + pass + ' passed, ' + failed.length + ' failed');
if (failed.length) { console.log('  FAILED: ' + failed.join(' | ')); process.exit(1); }
console.log('  ⛔ API 0 · offline only — live model behaviour is verified by the separate live revalidation plan.\n');
