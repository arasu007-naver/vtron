'use strict';
/* DM V2 — mandatory resolution under missing / partial / range / zero evidence + negative and mutation probes (order §6, §10.3).
   Every valid block must give D or M with a verified (or fallback-verified) Reason; nothing is invented; UNKNOWN is never read as absence. */
const H = require('./_harness'); const { ok, clone } = H; const E = H.E;
const O = (v) => ({ state: 'OBSERVED', value: v }), U = { state: 'UNKNOWN', value: null }, NV = { state: 'NOT_VISIBLE', value: null }, RG = (a, b) => ({ state: 'OBSERVED', min: a, max: b });
const sys = (id, fam, s, c, sp) => { const o = { evidence_id: id, evidence_family: fam, source_observation_refs: [] }; if (s !== undefined) o.relative_size = s; if (c !== undefined) o.contrast = c; if (sp !== undefined) o.spatial_position = sp; return o; };
const blk = (...ev) => ({ evidence: ev, excluded: [] });
const C = [
  ['MT-01 all core fields UNKNOWN (one system)', blk(sys('e1', 'graphic', U, U, U)), { dir: 'M', rule: 'DM-V2-Z0', provisional: true }],
  ['MT-02 all fields NOT_VISIBLE (two systems)', blk(sys('e1', 'surface_pattern', NV, NV, NV), sys('e2', 'attached_hardware', NV, NV, NV)), { dir: 'M', rule: 'DM-V2-Z0', provisional: true }],
  ['MT-03 Primitive keys missing (system registered, nothing read)', blk(sys('e1', 'graphic')), { dir: 'M', rule: 'DM-V2-Z0', provisional: true }],
  ['MT-04 size only (large)', blk(sys('e1', 'graphic', O('large'), U, U)), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-05 contrast only (high)', blk(sys('e1', 'graphic', U, O('high'), U)), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-06 position only (whole_garment)', blk(sys('e1', 'surface_pattern', U, U, O('whole_garment'))), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-07 unread size + high contrast + distributed (deployment answers size)', blk(sys('e1', 'graphic', U, O('high'), O('distributed'))), { dir: 'D', rule: 'DM-V2-D2' }],
  ['MT-08 unread size + high contrast + localized', blk(sys('e1', 'graphic', U, O('high'), O('localized'))), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-09 large + medium contrast + unread placement', blk(sys('e1', 'graphic', O('large'), O('medium'), U)), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-10 large + unread contrast + whole_garment (contrast never assumed)', blk(sys('e1', 'surface_pattern', O('large'), U, O('whole_garment'))), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-11 range size small~medium + high + localized', blk(sys('e1', 'graphic', RG('small', 'medium'), O('high'), O('localized'))), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-12 range size medium~large + high + localized', blk(sys('e1', 'graphic', RG('medium', 'large'), O('high'), O('localized'))), { dir: 'D', rule: 'DM-V2-D1' }],
  ['MT-13 range contrast low~medium + large + whole_garment', blk(sys('e1', 'surface_pattern', O('large'), RG('low', 'medium'), O('whole_garment'))), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-14 range contrast medium~high + large + localized', blk(sys('e1', 'graphic', O('large'), RG('medium', 'high'), O('localized'))), { dir: 'D', rule: 'DM-V2-D2' }],
  ['MT-15 range placement distributed~whole + medium + medium', blk(sys('e1', 'surface_treatment', O('medium'), O('medium'), RG('distributed', 'whole_garment'))), { dir: 'D', rule: 'DM-V2-D1' }],
  ['MT-16 range placement localized~distributed + large + medium', blk(sys('e1', 'attached_hardware', O('large'), O('medium'), RG('localized', 'distributed'))), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-17 conflicting systems: tonal large + clear small', blk(sys('e1', 'surface_pattern', O('large'), O('low'), O('whole_garment')), sys('e2', 'graphic', O('small'), O('high'), O('localized'))), { dir: 'M', rule: 'DM-V2-M1' }],
  ['MT-18 weak + strong systems: one qualifying system suffices', blk(sys('e1', 'attached_hardware', O('small'), O('low'), O('localized')), sys('e2', 'graphic', O('large'), O('high'), O('localized'))), { dir: 'D', rule: 'DM-V2-D1' }],
  ['MT-19 partial: one complete non-qualifying + one all-UNKNOWN system (not zero-evidence)', blk(sys('e1', 'attached_detail', O('small'), O('medium'), O('localized')), sys('e2', 'graphic', U, U, U)), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-20 out-of-domain value is not evidence', blk(sys('e1', 'graphic', O('huge'), O('extreme'), O('everywhere'))), { dir: 'M', rule: 'DM-V2-Z0', provisional: true }],
  ['MT-21 state ABSENT is not a reading', blk(sys('e1', 'graphic', { state: 'ABSENT', value: null }, O('high'), O('localized'))), { dir: 'M', rule: 'DM-V2-M2' }],
  ['MT-22 complete empty block (observed absence)', blk(), { dir: 'M', rule: 'DM-V2-M0' }]];
const rows = C.map(([name, b, x]) => { const r = E.evaluate(clone(b)); return { name, expected: x, ok: r.ok, direction: r.ok ? r.customer.direction : null, rule: r.decisive_rule_id, provisional: r.provisional_policy, physically_grounded: r.physically_grounded, reason: r.ok ? r.customer.reason : null, reason_status: r.reason_status, findings: r.reason_validation_result && r.reason_validation_result.findings }; });
rows.forEach((r) => ok(r.name.split(' ')[0], r.name.slice(6) + ' → ' + r.expected.dir + ' (' + r.expected.rule + ')', r.ok && r.direction === r.expected.dir && r.rule === r.expected.rule && (!r.expected.provisional || r.provisional === true) && ['VERIFIED', 'FALLBACK_VERIFIED'].includes(r.reason_status), { got: r.direction + ' ' + r.rule + ' ' + r.reason_status, reason: r.reason, findings: r.findings }));
ok('MT-23', 'no mutation case returns Neutral / UNKNOWN / null; provisional only on Z0; Z0 never physically grounded', rows.every((r) => ['D', 'M'].includes(r.direction)) && rows.every((r) => r.provisional === (r.rule === 'DM-V2-Z0')) && rows.filter((r) => r.rule === 'DM-V2-Z0').every((r) => r.physically_grounded === false));
ok('MT-24', 'an UNKNOWN / NOT_VISIBLE reading is never stated as observed absence ("없", "관측되지 않은 기본 구성") outside a complete empty block', rows.filter((r) => r.rule !== 'DM-V2-M0').every((r) => !/관측되지 않은 기본 구성|디테일이 없/.test(r.reason || '')));
const tr = [undefined, null, 'graphic', [1, 2], { excluded: [] }, { evidence: 'x' }, { axis_target: 'SR', evidence: [] }].map((b) => E.evaluate(b));
ok('MT-25', 'technically invalid inputs → TRANSPORT_ERROR (no Direction field), never a product Direction', tr.every((r) => r.ok === false && r.kind === 'TRANSPORT_ERROR' && !('direction' in r)), tr.map((r) => r.code));
H.summary('test_mandatory', { cases: rows, transport: tr.map((r) => r.code) });
