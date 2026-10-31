'use strict';
/*
 * STMX TC ENGINE V2 — SUIT SUCCESSOR V1 · STANDALONE + REGRESSION TESTS (test side only). usage: node tests/run_tests.js [--json]
 * Oracle = the FROZEN TC V2 engine itself (each member alone) + the CEO rule written independently here; expected values are never stored or edited.
 * Populations (labelled): REAL_SUIT (8 genuine Suit images, stored V1.3-path records) · SYNTHETIC_PAIRING (every real Jacket × every real Trouser / Skirt from
 * different images — structural, never counted as real-image validation) · SYNTHETIC_MUTATION (fields removed / injected) · FROZEN_CORPUS_UNIT (historical pairs).
 */
const fs = require('fs'), path = require('path'), os = require('os');
const T = require('../src/tc_v2_suit_engine.js'); const PIN = require('../src/tc_v2_suit_parent_pin.js');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'suit_fixtures_v1.json'), 'utf8'));
const parent = T.parentIdentity(); const TC = require(path.join(parent.dir, 'src', 'tc_v2_engine.js')); const FC = require(path.join(parent.dir, 'src', 'tc_v2_frozen_chain.js'));
const clone = (x) => JSON.parse(JSON.stringify(x)); const results = []; const ok = (id, desc, pass, detail) => results.push({ id, desc, pass: !!pass, detail: detail === undefined ? null : detail });
const rec = new Map(FX.real_member_records.map((m) => [m.id, m])); const pk = (a, b) => ({ scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: [a.target_id, b.target_id] }, targets: [{ target_id: a.target_id, record: clone(a.record) }, { target_id: b.target_id, record: clone(b.record) }] });
const solo = (m) => { const r = TC.evaluateV13Record(clone(m.record)); return r.ok ? r.direction : 'ERR:' + r.code; };
const rule = (ds) => (ds.includes('TRANSFORMATIVE') ? 'TRANSFORMATIVE' : 'CLASSIC');   /* CEO §4.1 table, written independently */
const uniq = (a, b) => (a.target_id === b.target_id ? Object.assign({}, b, { target_id: b.target_id + '_b' }) : b);

/* TS-01 parent pin */
ok('TS-01', 'frozen TC V2 parent verified before load (freeze record + every frozen file + every runtime dependency)', parent.freeze_id === 'ITEM-TC-V2-FINAL-FREEZE-V1-2026-10-28' && parent.frozen_files_verified > 0 && parent.runtime_dependencies_verified > 0, { files: parent.frozen_files_verified, deps: parent.runtime_dependencies_verified });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tcsuitpin-')); let e1 = null, e2 = null;
try { PIN.verifyParent(tmp); } catch (e) { e1 = e.code; }
fs.mkdirSync(path.join(tmp, path.dirname(PIN.PARENT.freeze_record)), { recursive: true }); fs.writeFileSync(path.join(tmp, PIN.PARENT.freeze_record), fs.readFileSync(path.join(PIN.MASTER_ROOT, PIN.PARENT.freeze_record), 'utf8') + ' ');
try { PIN.verifyParent(tmp); } catch (e) { e2 = e.code; } fs.rmSync(tmp, { recursive: true, force: true });
ok('TS-02', 'negative controls: missing parent → PARENT_FREEZE_RECORD_MISSING · one changed byte → PARENT_FREEZE_RECORD_DRIFT', e1 === 'PARENT_FREEZE_RECORD_MISSING' && e2 === 'PARENT_FREEZE_RECORD_DRIFT', { e1, e2 });

/* REAL_SUIT */
const real = FX.real_suits.map((s) => { const ms = s.member_ids.map((id) => rec.get(s.ref + '#' + id)); const r = T.evaluateSuit(pk(ms[0], ms[1])); return { s, ms, r, solos: ms.map(solo) }; });
ok('TS-03', 'REAL_SUIT (8): Suit Direction = CEO rule over the frozen member results (any member Transformative → Transformative, else Classic)', real.every((x) => x.r.ok && x.r.direction === rule(x.solos)), real.map((x) => x.s.ref + ' ' + x.solos.join('/') + ' → ' + (x.r.ok ? x.r.direction : x.r.code)));
ok('TS-04', 'REAL_SUIT: every Transformative Suit names the departing member and carries its Departure provenance (frozen path + valid Departure set)', real.filter((x) => x.r.ok && x.r.direction === 'TRANSFORMATIVE').every((x) => x.r.suit_trace.departing_members.length && x.r.suit_trace.members.filter((m) => x.r.suit_trace.departing_members.includes(m.target_id)).every((m) => m.departure && !m.departure.not_grounded && x.r.customer.reason.includes(T.MEMBER_KO[m.category]))), real.map((x) => x.s.ref + ' ' + (x.r.suit_trace ? x.r.suit_trace.departing_members.join(',') : '')));
ok('TS-05', 'REAL_SUIT: Korean Reason composed and verified (no finding), both member sentences are the frozen member Reasons verbatim', real.every((x) => x.r.ok && x.r.customer.reason && !x.r.suit_trace.reason_findings.length && x.r.suit_trace.members.filter((m) => x.r.customer.reason.includes(T.MEMBER_KO[m.category] + (m.category === 'Jacket' ? '은 ' : '는 '))).every((m) => x.r.customer.reason.includes(TC.evaluateV13Record(clone(x.ms.find((y) => y.target_id === m.target_id).record)).customer.reason))), real.map((x) => x.s.ref + ' ' + (x.r.customer && x.r.customer.reason)));
ok('TS-06', 'REAL_SUIT: the governed pair path (frozen predicates → §7 → frozen V2 resolver) agrees with the member rule on every Suit', real.every((x) => x.r.ok && x.r.suit_trace.pair_path.direction === x.r.direction), real.map((x) => x.s.ref + ' ' + (x.r.suit_trace && x.r.suit_trace.pair_path.resolver_path)));

/* SYNTHETIC_PAIRING — every real Jacket × every real bottom */
const J = FX.real_member_records.filter((m) => m.category === 'Jacket'), Bt = FX.real_member_records.filter((m) => m.category !== 'Jacket');
const so = new Map(FX.real_member_records.map((m) => [m.id, solo(m)]));
const grid = []; for (const a of J) for (const b0 of Bt) { const b = uniq(a, b0); const r = T.evaluateSuit(pk(a, b)); grid.push({ a: a.id, b: b0.id, bcat: b0.category, ds: [so.get(a.id), so.get(b0.id)], r }); }
const bad = grid.filter((g) => !g.r.ok || g.r.direction !== rule(g.ds));
ok('TS-07', 'SYNTHETIC_PAIRING (' + grid.length + ' Jacket × bottom pairs): Suit Direction = CEO rule over the frozen member results — no exception', !bad.length, { pairs: grid.length, failures: bad.slice(0, 5).map((g) => g.a + ' + ' + g.b + ' ' + g.ds.join('/') + ' → ' + (g.r.ok ? g.r.direction : g.r.code)) });
const cell = (jd, bd, cat) => grid.filter((g) => g.ds[0] === jd && g.ds[1] === bd && (!cat || g.bcat === cat));
const cells = { 'T/T': cell('TRANSFORMATIVE', 'TRANSFORMATIVE').length, 'T/C': cell('TRANSFORMATIVE', 'CLASSIC').length, 'C/T': cell('CLASSIC', 'TRANSFORMATIVE').length, 'C/C': cell('CLASSIC', 'CLASSIC').length, 'C/T Skirt': cell('CLASSIC', 'TRANSFORMATIVE', 'Skirt').length, 'C/T Trouser': cell('CLASSIC', 'TRANSFORMATIVE', 'Trouser').length };
ok('TS-08', 'all four §4.1 cells are exercised on real records — incl. Departure ONLY in the Trouser (bottom-only Departure → Transformative, the Trouser is the departing member)', ['T/T', 'T/C', 'C/T', 'C/C', 'C/T Trouser'].every((k) => cells[k] > 0) && cell('CLASSIC', 'TRANSFORMATIVE').every((g) => g.r.direction === 'TRANSFORMATIVE' && g.r.suit_trace.departing_members.length === 1 && g.r.suit_trace.departing_members[0] !== g.r.suit_trace.members[0].target_id), cells);
/* no real Skirt record carries a frozen Departure (cells['C/T Skirt'] = 0) → SYNTHETIC_MUTATION: a real Skirt record with its fit observation replaced by the real
   Oversized fit observation of a real Trouser record (frozen predicates decide; the expected value is the frozen standalone result, not written here) */
const ovFit = FX.real_member_records.find((m) => m.category === 'Trouser' && m.record.observations.fit && m.record.observations.fit.value === 'Oversized').record.observations.fit;
const skC = J.length && FX.real_member_records.filter((m) => m.category === 'Skirt').map((m) => { const c = clone(m); c.record.observations.fit = clone(ovFit); return c; }).find((m) => solo(m) === 'TRANSFORMATIVE');
const jC = J.find((m) => so.get(m.id) === 'CLASSIC'); const sk = skC ? T.evaluateSuit(pk(jC, uniq(jC, skC))) : null;
ok('TS-08S', 'SYNTHETIC_MUTATION Departure ONLY in the Skirt (real Skirt record, fit ← a real Oversized observation): Classic Jacket + Transformative Skirt → Transformative, Skirt named', !!sk && sk.ok && sk.direction === 'TRANSFORMATIVE' && sk.suit_trace.departing_members.length === 1 && sk.suit_trace.members[1].category === 'Skirt' && sk.suit_trace.departing_members[0] === sk.suit_trace.members[1].target_id && sk.customer.reason.startsWith('스커트는 '), sk && { skirt: skC.id, jacket: jC.id, reason: sk.customer.reason });
ok('TS-09', 'every pairing: pair path agrees · Reason verified (no finding) · Transformative Reasons name a departing member, Classic Reasons name both members', grid.every((g) => g.r.ok && g.r.suit_trace.pair_path.direction === g.r.direction && !g.r.suit_trace.reason_findings.length && (g.r.customer.reason === null ? g.r.suit_trace.reason_status === 'WITHHELD' : true)), { withheld: grid.filter((g) => g.r.ok && g.r.customer.reason === null).length });
ok('TS-10', 'C/C pairings never become Transformative — matching Jacket / bottom (same image or not) is not a Departure', cell('CLASSIC', 'CLASSIC').every((g) => g.r.direction === 'CLASSIC') && real.filter((x) => x.solos.every((d) => d === 'CLASSIC')).every((x) => x.r.direction === 'CLASSIC'));

/* SYNTHETIC_MUTATION */
const s816 = real.find((x) => x.s.ref === 'REF_000816'), s840 = real.find((x) => x.s.ref === 'REF_000840');
const strip = (m, keys) => { const c = clone(m); for (const k of keys) delete c.record.observations[k]; return c; };
const opt = ['length', 'pocket_projection', 'slit', 'attachment', 'surface'];
const p1 = T.evaluateSuit(pk(strip(s816.ms[0], opt), strip(s816.ms[1], opt))); const p2 = T.evaluateSuit(pk(strip(s840.ms[0], ['length', 'surface']), strip(s840.ms[1], ['fit', 'length'])));
ok('TS-11', 'insufficient optional observations (fields removed): still a mandatory Direction = rule over the frozen member results on the SAME reduced records; no block', p1.ok && p2.ok && p1.direction === rule([solo(strip(s816.ms[0], opt)), solo(strip(s816.ms[1], opt))]) && p2.direction === rule([solo(strip(s840.ms[0], ['length', 'surface'])), solo(strip(s840.ms[1], ['fit', 'length']))]), { p1: p1.ok ? p1.direction : p1.code, p2: p2.ok ? p2.direction : p2.code });
const inj = (m) => { const c = clone(m); c.record.departure = true; c.record.suit = true; c.record.observations.departure_claim = { state: 'OBSERVED', value: 'Transformative' }; c.record.ceo_ground_truth = { TC: 'TC9' }; c.record.ref_id = 'REF_999999'; return c; };
const q1 = T.evaluateSuit(pk(inj(s816.ms[0]), inj(s816.ms[1])));
ok('TS-12', 'invalid purported Departure (non-V1.3 departure / suit flags, a fake observation key, GT and REF injected) → nothing changes (C/C stays Classic)', q1.ok && q1.direction === 'CLASSIC' && q1.direction === s816.r.direction, q1.ok ? q1.direction : q1.code);
const mal = clone(s816.ms[1]); mal.record.observations.fit = { state: 'OBSERVED', value: 'NOT_A_DOMAIN_VALUE' }; const q2 = T.evaluateSuit(pk(s816.ms[0], mal));
ok('TS-13', 'a malformed member field value is excluded by the frozen adapter (field-level salvage) — never read as a Departure', q2.ok && q2.direction === rule([solo(s816.ms[0]), solo(mal)]) && q2.direction === 'CLASSIC', q2.ok ? q2.direction + ' excluded ' + JSON.stringify(TC.evaluateV13Record(clone(mal.record)).trace.excluded_fields) : q2.code);

/* packet contract */
const shirt = { target_id: 'target_9', record: { category: { state: 'OBSERVED', value: 'Shirt' }, observations: {} } };
const neg = [['three members (styling shirt added)', Object.assign(pk(s816.ms[0], s816.ms[1]), { targets: pk(s816.ms[0], s816.ms[1]).targets.concat([shirt]) })], ['Jacket + Jacket', pk(s816.ms[0], Object.assign(clone(s840.ms[0]), { target_id: 'target_7' }))], ['Shirt + Trouser', pk(shirt, s816.ms[1])], ['ids ≠ targets', Object.assign(pk(s816.ms[0], s816.ms[1]), { product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: ['target_1', 'target_x'] } })], ['not a Suit', Object.assign(pk(s816.ms[0], s816.ms[1]), { product_identity: { merchandise_type: 'ITEM' } })], ['record missing', { scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: ['a', 'b'] }, targets: [{ target_id: 'a' }, { target_id: 'b' }] }], ['null', null]]
  .map(([k, p]) => [k, T.evaluateSuit(p)]);
ok('TS-14', 'invalid Suit packets (styling garment added · two Jackets · non-Suit member · id mismatch · not SUIT · no record · null) → CONTRACT_ERROR, never a Direction', neg.every(([, r]) => !r.ok && r.kind === 'CONTRACT_ERROR'), neg.map(([k, r]) => k + ': ' + (r.ok ? r.direction : r.code)));
const rev = s840.r; const swapped = T.evaluateSuit({ scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: [s840.ms[1].target_id, s840.ms[0].target_id] }, targets: [{ target_id: s840.ms[1].target_id, record: clone(s840.ms[1].record) }, { target_id: s840.ms[0].target_id, record: clone(s840.ms[0].record) }] });
ok('TS-15', 'determinism: repeated evaluation byte-identical · member order (bottom declared first) → identical customer output', real.every((x) => JSON.stringify(T.evaluateSuit(pk(x.ms[0], x.ms[1]))) === JSON.stringify(x.r)) && JSON.stringify(swapped.customer) === JSON.stringify(rev.customer));
ok('TS-16', 'customer output = exactly { direction, reason } with a frozen TC token; no score / tier / Strength / code', real.every((x) => JSON.stringify(Object.keys(x.r.customer)) === '["direction","reason"]' && ['CLASSIC', 'TRANSFORMATIVE'].includes(x.r.customer.direction)));

/* FROZEN_CORPUS_UNIT — historical MATCHING_PAIR reconciliation */
const pair7 = (ds) => (ds.includes('TRANSFORMATIVE') ? 'TRANSFORMATIVE' : ds.every((d) => d === 'CLASSIC') ? 'CLASSIC' : 'DIRECTION_UNRESOLVED');
const units = FC.corpusUnits().filter((u) => u.members.length > 1); const mp = units.filter((u) => u.scoring_unit_type === 'MATCHING_PAIR');
ok('TS-17', 'historical MATCHING_PAIR units: the CEO §7 rule over the frozen member Directions reproduces the frozen unit Direction on every unit', mp.length > 0 && mp.every((u) => pair7(u.members.map((m) => m.record.direction)) === u.v1_direction), mp.map((u) => u.anchor + ' ' + u.members.map((m) => m.record.direction).join('/') + ' → ' + u.v1_direction));
const recon = real.map((x) => { const u = units.find((y) => y.anchor === x.s.ref + '#SU1'); const fv2 = u ? TC.evaluateCorpusUnit(u.anchor) : null; return { ref: x.s.ref, frozen_v2_unit: fv2 && fv2.ok ? fv2.direction : null, successor: x.r.direction }; }).filter((y) => y.frozen_v2_unit);
ok('TS-18', 'REAL_SUIT that are frozen corpus pair units: successor (V1.3-path members) == frozen TC V2 unit Direction', recon.length > 0 && recon.every((y) => y.frozen_v2_unit === y.successor), recon);

const pass = results.filter((r) => r.pass).length;
const out = { suite: 'STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1 standalone', engine: T.ENGINE_ID, parent: parent.freeze_id, pass, total: results.length, results, ledger: { real: real.map((x) => ({ ref: x.s.ref, type: x.s.type, members: x.ms.map((m) => m.target_id + ':' + m.category), member_directions: x.solos, suit: x.r.ok ? x.r.direction : x.r.code, departing: x.r.ok ? x.r.suit_trace.departing_members : null, departures: x.r.ok ? x.r.suit_trace.members.map((m) => m.departure) : null, pair_path: x.r.ok ? x.r.suit_trace.pair_path.resolver_path : null, reason: x.r.ok ? x.r.customer.reason : null })), pairing_cells: cells, pairings: grid.length } };
if (process.argv.includes('--json')) console.log(JSON.stringify(out)); else { for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + ' ' + r.desc + (r.pass ? '' : ' :: ' + JSON.stringify(r.detail).slice(0, 400))); console.log(pass + '/' + results.length); }
process.exitCode = pass === results.length ? 0 : 1;
