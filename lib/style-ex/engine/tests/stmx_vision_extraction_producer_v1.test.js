/**
 * STMX Vision Extraction Producer V1 — deterministic tests (no network).
 * Covers the 12 CEO-specified cases. Mock visionFn only; contracts unchanged.
 */
'use strict';
const assert = require('assert');
const P = require('../stmx_vision_extraction_producer_v1');
const rules = require('../producer_rules_v1');

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.log('FAIL:', name, '\n   ', e.message); } }
async function ta(name, fn) { try { await fn(); pass++; } catch (e) { fail++; console.log('FAIL:', name, '\n   ', e.message); } }

// ---- helpers -------------------------------------------------------------
const COLOR_OK = {
  primary_color_family: 'black', color_lightness: 'dark', color_usage: 'single',
  multi_color: false, color_effect: 'none', additional_colors: [],
};
function color(over) { return Object.assign({}, COLOR_OK, over || {}); }
// A minimally-valid Jacket garment target (mirrors the shape governTarget consumes).
// ══ D1 FIXTURE MIGRATION (CEO Decision 2026-08-23) ══════════════════════════════════════════
// D1 makes an applicable-key omission a hard validation failure, so this fixture's partial record
// no longer satisfies the approved complete-record contract. `_complete` fills ONLY the applicable
// keys the fixture did not provide, with the governed negative state for each domain family.
//   ⛔ TEST-SIDE ONLY — production validation is untouched; no bypass, no exemption.
//   ⛔ Never overrides a value the fixture supplied, so every original assertion is preserved.
//   ⛔ No hand-written key list — derived live from UNIVERSAL ∪ MANDATORY[category].
//   ⛔ Skips keys a governed instance-level rule already makes N/A (CA#11 construction suppression,
//      or an unmet CONDITIONAL_TRIGGER), so nothing deliberately omitted is filled in.
const _CTRL_ = require('../producer_controller_v1');
const _MULTI_ = new Set(rules.MULTI);
function _governedNA_(param, category, obs) {
  for (const key of Object.keys(rules.CONSTRUCTION_SUPPRESSION || {})) {
    const spec = rules.CONSTRUCTION_SUPPRESSION[key];
    if (spec && (spec.categories || []).includes(category) && (spec.suppresses || []).includes(param)
      && _CTRL_.constructionTriggered(key, obs)) return true;
  }
  if (rules.CONDITIONAL_TRIGGER[param] && !_CTRL_.conditionalTriggered(param, obs, category)) return true;
  return false;
}
function _complete(category, provided) {
  const out = Object.assign({}, provided || {});
  const req = [...new Set([...rules.UNIVERSAL, ...(rules.MANDATORY[category] || [])])].filter(p => p !== 'category');
  for (const p of req) {
    if ((p in out) || _governedNA_(p, category, out)) continue;
    const dom = (rules.domainFor && rules.domainFor(p, category)) || rules.VALUE_DOMAINS[p];
    const f = { evidence: ['contract filler'] };
    const legal = rules.regionFor(p, category);
    if (Array.isArray(legal) && legal.length === 1) f.region = legal[0];
    out[p] = _MULTI_.has(p) ? Object.assign({ state: 'ABSENT', value: null }, f)
      : (dom && dom.includes('None')) ? Object.assign({ state: 'OBSERVED', value: 'None' }, f)
        : Object.assign({ state: 'ABSENT', value: null }, f);
  }
  // [Approval Anchor — POST-LIVE 7-FAILURE CLOSURE (CEO Order 2026-08-30) · D1-C]
  //   trigger-fired CONDITIONAL 의 침묵은 이제 계약 오류다 — fixture 완성기도 동일 권위
  //   (CONDITIONAL_TRIGGER parent 실재 집합 · pocket instance-form 제외 · controller predicate
  //   재사용)로 fired conditional 을 채운다. assertion 무변경 · 완화 0.
  try {
    const C = require('../producer_controller_v1');
    // [FINAL PRE-V5 ALIGNMENT 2026-08-31] D1-C 와 동일 기준: predicate-true 전 C (pocket scalar 제외)
    const trig = Object.keys(rules.CONDITIONAL_TRIGGER || {})
      .filter(p => !(rules.POCKET_SCALAR_MORPHOLOGY || []).includes(p));
    let changed = true;
    while (changed) {   // cuff_type 채움 → cuff_scale trigger 재평가 (연쇄 1회면 수렴)
      changed = false;
      for (const p of trig) {
        if (rules.operationalClass(p, category) !== 'C') continue;
        if (p in out) continue;
        let fired = false; try { fired = C.conditionalTriggered(p, out, category); } catch (e) {}
        if (!fired) continue;
        const dom = (rules.domainFor && rules.domainFor(p, category)) || rules.VALUE_DOMAINS[p];
        const val = dom && dom.includes('None') ? 'None' : dom && dom.includes('Regular') ? 'Regular' : (dom && dom[0]);
        out[p] = { state: 'OBSERVED', value: val, evidence: ['contract filler (triggered conditional)'] };
        changed = true;
      }
    }
  } catch (e) { /* controller 미로드 환경에서는 기존 동작 유지 */ }
  return out;
}

function garmentTarget(over) {
  // NOTE: `category` is a TOP-LEVEL sibling of `observations` (governTarget reads rawTarget.category).
  const base = {
    identity: { value: true }, readability: { value: true, basis: (true) ? 'RECONSTRUCTABLE' : 'NOT_RECONSTRUCTABLE', basis: (true) ? 'RECONSTRUCTABLE' : 'NOT_RECONSTRUCTABLE', basis: (true) ? 'RECONSTRUCTABLE' : 'NOT_RECONSTRUCTABLE'}, prominence: 'dominant',
    descriptor: 'black bomber jacket',
    category: { state: 'OBSERVED', value: 'Jacket' },
    observations: {
      fit: { state: 'OBSERVED', value: 'Regular', region: 'upper', evidence: ['moderate ease'] },
      length: { state: 'OBSERVED', value: 'Hip Length', region: 'upper', evidence: ['hem at hip'] },
      fabric_behavior: { state: 'OBSERVED', value: 'Structured', region: 'whole_garment', evidence: ['holds shape'] },
      sleeve: { state: 'OBSERVED', value: 'Long', region: 'upper', evidence: ['to wrist'] },
      shoulder_structure: { state: 'OBSERVED', value: 'Mild', region: 'upper', evidence: ['light pad'] },
      collar: { state: 'OBSERVED', value: 'Stand', region: 'upper', evidence: ['rib stand collar'] },
      cuff_type: { state: 'OBSERVED', value: 'Ribbed', region: 'upper', evidence: ['ribbed knit cuff band'] },
      rib_hem: { state: 'OBSERVED', value: 'Present', region: 'upper', evidence: ['rib hem'] },
      hood: { state: 'ABSENT', value: null, region: 'upper', evidence: ['no hood'] },
      closure_type: { state: 'OBSERVED', value: 'Zipper', region: 'upper', evidence: ['front zip'] },
      grammar: { state: 'OBSERVED', value: 'Casual', region: 'whole_garment', evidence: ['bomber grammar'] },
      material: { state: 'OBSERVED', value: null, region: 'whole_garment', evidence: ['nylon shell'], values: [{ value: 'Synthetic', evidence: ['nylon shell'] }] },
      surface: { state: 'ABSENT', value: null, region: 'whole_garment', evidence: ['plain surface'] },
      pattern: { state: 'ABSENT', value: null, region: 'whole_garment', evidence: ['solid'] },
      graphic: { state: 'ABSENT', value: null, region: 'whole_garment', evidence: ['none'] },
      // CA#29: pockets[] is the sole canonical morphology carrier; the scalar form is retired.
      pocket: { state: 'OBSERVED', value: 'Present', region: 'whole_garment', evidence: ['welt pockets'],
        pockets: [{ location: 'Lower Front',
          construction: { state: 'OBSERVED', value: 'Inset', evidence: ['welt set-in opening'] },
          projection: { state: 'OBSERVED', value: 'Flat', evidence: ['sits flush'] } }] },
      // ⛔ `ruffle` removed 2026-08-23 (D3 RUFFLE-M1): ruffle is class N for Jacket, so emitting it
      //    is now NOT_APPLICABLE_EMITTED. No test in this file asserts on ruffle — these fixtures
      //    exercise colour isolation and garment validity, so the assertions are unaffected.
      decorative_detail: { state: 'ABSENT', value: null, region: 'whole_garment', evidence: ['none'] },
      attachment: { state: 'ABSENT', value: null, region: 'whole_garment', evidence: ['none'] },
      asymmetry: { state: 'OBSERVED', value: 'None', region: 'whole_garment', evidence: ['symmetric'] },
    },
    color_observation: color(),
  };
  const merged = Object.assign(base, over || {});
  // complete AFTER the override merge, so a caller-supplied observations block is completed too
  const cat = merged.category && merged.category.state === 'OBSERVED' ? merged.category.value : null;
  if (cat && rules.CATEGORIES.includes(cat) && merged.observations && typeof merged.observations === 'object') {
    merged.observations = _complete(cat, merged.observations);
  }
  return merged;
}
function mockVision(pkg) { return async () => JSON.stringify(pkg); }
async function run(pkg, opts) {
  return P.runVisionExtraction('img.jpg', Object.assign({ visionFn: mockVision(pkg), imageId: 'TEST' }, opts || {}));
}
function primary(r) { return r.envelope.targets.find(t => t.eligible && t.role === 'Primary'); }

// ---- 1. single garment + simple color -----------------------------------
ta('1 · single garment + simple color', async () => {
  const r = await run({ targets: [garmentTarget()] });
  assert.ok(r.ok, 'extraction ok');
  const p = primary(r);
  assert.ok(p.record && p.record.observations, 'garment record present');
  assert.ok(p.color_observation, 'color observation present');
  assert.strictEqual(p.color_observation.primary_color_family, 'black');
  assert.strictEqual(r.garment_contract_valid, true);
  assert.strictEqual(r.color_contract_valid, true);
});

// ---- 2. single garment + multiple designed colors ------------------------
ta('2 · multiple designed colors', async () => {
  const c = color({ multi_color: true, color_usage: 'multi', additional_colors: [
    { color_family: 'white_family', carrier_kind: 'pattern', carrier_ref: 'Linear' },
    { color_family: 'red', carrier_kind: 'pattern', carrier_ref: 'Linear' }] });
  const r = await run({ targets: [garmentTarget({ color_observation: c })] });
  assert.ok(r.ok);
  assert.strictEqual(primary(r).color_observation.additional_colors.length, 2);
  assert.strictEqual(r.color_contract_valid, true);
});

// ---- 3. additional color carried by graphic ------------------------------
ta('3 · additional color carried by graphic', async () => {
  const c = color({ multi_color: true, color_usage: 'accent', additional_colors: [
    { color_family: 'white_family', carrier_kind: 'graphic', carrier_ref: 'Localized' }] });
  const r = await run({ targets: [garmentTarget({ color_observation: c })] });
  const ac = primary(r).color_observation.additional_colors[0];
  assert.strictEqual(ac.carrier_kind, 'graphic');
  assert.strictEqual(r.color_contract_valid, true);
});

// ---- 4. additional color carried by closure/button ----------------------
ta('4 · additional color carried by closure', async () => {
  const c = color({ multi_color: true, color_usage: 'subtle', additional_colors: [
    { color_family: 'gold', carrier_kind: 'closure', carrier_ref: 'Button' }] });
  const r = await run({ targets: [garmentTarget({ color_observation: c })] });
  const ac = primary(r).color_observation.additional_colors[0];
  assert.strictEqual(ac.carrier_kind, 'closure');
  assert.strictEqual(ac.color_family, 'gold');
  assert.strictEqual(r.color_contract_valid, true);
});

// ---- 5. additional color carried by attachment/hardware -----------------
ta('5 · additional color carried by attachment/hardware', async () => {
  const c = color({ multi_color: true, color_usage: 'subtle', additional_colors: [
    { color_family: 'silver', carrier_kind: 'attachment', carrier_ref: 'Metal Hardware' }] });
  const r = await run({ targets: [garmentTarget({ color_observation: c })] });
  assert.strictEqual(primary(r).color_observation.additional_colors[0].carrier_kind, 'attachment');
  assert.strictEqual(r.color_contract_valid, true);
});

// ---- 6. same-family surface variation invents no additional color -------
ta('6 · same-family surface variation → no additional color', async () => {
  // sheen/fold/tonal variation must stay single-color; contract accepts empty additional_colors
  const c = color({ color_usage: 'single', multi_color: false, additional_colors: [] });
  const r = await run({ targets: [garmentTarget({ color_observation: c })] });
  const p = primary(r);
  assert.strictEqual(p.color_observation.additional_colors.length, 0);
  assert.strictEqual(p.color_observation.multi_color, false);
  assert.strictEqual(r.color_contract_valid, true);
});

// ---- 7. multi-garment image with independent per-target colors ----------
ta('7 · multi-garment → independent per-target color', async () => {
  const jacket = garmentTarget({ descriptor: 'olive jacket', color_observation: color({ primary_color_family: 'olive', color_lightness: 'normal' }) });
  const trouser = garmentTarget({
    descriptor: 'khaki trouser', prominence: 'secondary',
    color_observation: color({ primary_color_family: 'khaki', color_lightness: 'light' }),
  });
  trouser.category = { state: 'OBSERVED', value: 'Trouser' };
  const r = await run({ targets: [jacket, trouser] });
  const el = r.envelope.targets.filter(t => t.eligible);
  assert.strictEqual(el.length, 2, 'two eligible targets');
  const fams = el.map(t => t.color_observation.primary_color_family);
  assert.deepStrictEqual(fams, ['olive', 'khaki'], 'per-target color, not image-global');
  assert.notStrictEqual(fams[0], fams[1], 'colors are NOT copied across targets');
});

// ---- 8. malformed Color does not mutate Garment -------------------------
ta('8 · malformed Color does not mutate Garment', async () => {
  const good = await run({ targets: [garmentTarget()] });
  const bad = await run({ targets: [garmentTarget({ color_observation: { primary_color_family: 'not_a_family', color_lightness: 'zzz', color_usage: 'nope', multi_color: 'yes', color_effect: 'glow' } })] });
  assert.ok(bad.ok, 'call still succeeds');
  const gp = primary(good), bp = primary(bad);
  assert.deepStrictEqual(bp.record.observations, gp.record.observations, 'garment observations identical despite bad color');
  assert.strictEqual(bp.validation.ok, gp.validation.ok, 'garment validity unaffected');
  assert.ok((bp.color_validation.contract_errors || []).length > 0, 'color errors reported');
  assert.strictEqual(bad.color_contract_valid, false, 'color invalid');
  assert.strictEqual(bad.garment_contract_valid, true, 'garment still valid — isolation holds');
});

// ---- 9. malformed Garment does not mutate Color -------------------------
ta('9 · malformed Garment does not mutate Color', async () => {
  const c = color({ primary_color_family: 'navy', color_lightness: 'dark' });
  const badG = garmentTarget({ color_observation: c });
  badG.observations = Object.assign({}, badG.observations, {
    // CA#15 D-2 made shoulder_drop applicable on Jacket, so neckline_shape now carries the N/A-over-emission
    // role here. The point of this test is the FIREWALL (a garment failure must not touch Color), not the
    // specific parameter — neckline_shape remains N for Jacket/Coat.
    neckline_shape: { state: 'OBSERVED', value: 'Round', region: 'upper', evidence: ['n/a param emitted'] },
  });
  const r = await run({ targets: [badG] });
  assert.ok(r.ok);
  const p = primary(r);
  assert.deepStrictEqual(p.color_observation, c, 'color payload untouched');
  assert.strictEqual((p.color_validation.contract_errors || []).length, 0, 'color still valid');
  assert.ok(p.validation.ok === false, 'garment validation reports the error');
  assert.strictEqual(r.color_contract_valid, true, 'color validity independent of garment failure');
});

// ---- 10. obsolete secondary_* rejected -----------------------------------
ta('10 · obsolete secondary_* rejected', async () => {
  assert.ok(P.OBSOLETE_FIELDS.includes('secondary_color_family'));
  assert.ok(P.OBSOLETE_FIELDS.includes('secondary_color_present'));
  const c = Object.assign(color(), { secondary_color_family: 'red', secondary_color_present: true });
  const r = await run({ targets: [garmentTarget({ color_observation: c })] });
  const p = primary(r);
  assert.ok((p.color_validation.contract_errors || []).length > 0, 'obsolete fields must be rejected');
  assert.strictEqual(r.color_contract_valid, false);
  // and the producer must never advertise them
  assert.ok(!/secondary_color_family/.test(P.buildVisionExtractionPrompt().replace(/Do NOT emit secondary_color_family or secondary_color_present\./g, '')),
    'prompt only mentions secondary_* in the prohibition');
});

// ---- 11. all 36 garment fields still governed by original contract -------
t('11 · 37 garment params governed by the original frozen contract', () => {
  const direct = require('../producer_rules_v1');
  // 36 → 37 at COMPONENT SCALE 2026-08-23 (+collar_scale · CEO Q1 · G46 governed expansion).
  assert.strictEqual(P.rules.ALL_PARAMS.length, 37);
  assert.deepStrictEqual(P.rules.ALL_PARAMS, direct.ALL_PARAMS, 'same param list object/order');
  // applicability + domains still resolve through the frozen rules
  // CA#15 D-2 (CEO 2026-08-18): shoulder_drop is now Mandatory on Jacket/Coat (was N). Count stays 36.
  assert.strictEqual(direct.operationalClass('shoulder_drop', 'Jacket'), 'M');
  assert.strictEqual(direct.operationalClass('front_opening_extent', 'Jacket'), 'M'); // CA#15 D-1
  assert.strictEqual(direct.operationalClass('shoulder_connection', 'Jacket'), 'N');  // scope firewall
  assert.strictEqual(direct.completenessCounts('Jacket').total, 37);
});

// ---- 12. no 37th garment parameter introduced ---------------------------
t('12 · no 37th garment parameter introduced', () => {
  // MIGRATED 2026-08-23: this asserted the total count as a PROXY for "Colour V1 fields did not
  // become garment parameters". The count changed for an unrelated CEO-approved reason
  // (collar_scale = PN 37), so the proxy is no longer valid. The structural claim itself is
  // UNCHANGED and is asserted directly below — Colour stays a sibling observation.
  const colorFields = ['primary_color_family', 'color_lightness', 'color_usage', 'multi_color', 'color_effect', 'additional_colors'];
  colorFields.forEach(f => assert.ok(!rules.ALL_PARAMS.includes(f), 'color field ' + f + ' must NOT be a garment parameter'));
});

// ---- structural: color is a sibling, never inside record ----------------
ta('13 · color_observation is a SIBLING of record (never nested)', async () => {
  const r = await run({ targets: [garmentTarget()] });
  const p = primary(r);
  assert.ok(Object.prototype.hasOwnProperty.call(p, 'color_observation'), 'sibling key present');
  assert.ok(!('color_observation' in p.record), 'not inside record');
  assert.ok(!('color_observation' in p.record.observations), 'not inside record.observations');
  ['primary_color_family', 'color_lightness', 'color_usage', 'multi_color', 'color_effect', 'additional_colors']
    .forEach(f => assert.ok(!(f in p.record.observations), f + ' must not leak into garment observations'));
});

// ---- structural: one call, production identity --------------------------
ta('14 · one Vision call + production identity', async () => {
  let calls = 0;
  const r = await P.runVisionExtraction('img.jpg', {
    visionFn: async () => { calls++; return JSON.stringify({ targets: [garmentTarget()] }); }, imageId: 'X', model: 'test-model',
  });
  assert.strictEqual(calls, 1, 'exactly one Vision call');
  assert.strictEqual(r.envelope.producer.vision_calls, 1);
  assert.strictEqual(r.envelope.producer.name, 'STMX Vision Extraction Producer');
  assert.strictEqual(r.envelope.producer.architecture, 'SEQUENTIAL_ONE_CALL_V2');
  assert.strictEqual(r.envelope.producer.garment_parameter_count, 37);
  assert.ok(/Producer-37/.test(r.envelope.producer.garment_subcontract));
  assert.ok(/Color Extraction V1/.test(r.envelope.producer.color_subcontract));
});

// ---- structural: missing color reported, never fabricated ---------------
ta('15 · missing color is reported, never fabricated', async () => {
  const g = garmentTarget(); delete g.color_observation;
  const r = await run({ targets: [g] });
  const p = primary(r);
  assert.strictEqual(p.color_observation, null, 'no color invented');
  assert.ok((p.color_validation.contract_errors || []).includes('COLOR_MISSING'));
  assert.strictEqual(r.garment_contract_valid, true, 'garment unaffected');
});

// ---- technical failure handling -----------------------------------------
ta('16 · missing targets envelope = technical error (no fabrication)', async () => {
  const r = await P.runVisionExtraction('img.jpg', { visionFn: async () => JSON.stringify({ nope: 1 }), maxTechnicalRetries: 0 });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error.code, 'MISSING_TARGETS_ENVELOPE');
});

setTimeout(() => {
  console.log('\nSTMX VISION EXTRACTION PRODUCER V1 TESTS: ' + pass + ' passed, ' + fail + ' failed');
  if (fail) process.exit(1);
}, 50);
