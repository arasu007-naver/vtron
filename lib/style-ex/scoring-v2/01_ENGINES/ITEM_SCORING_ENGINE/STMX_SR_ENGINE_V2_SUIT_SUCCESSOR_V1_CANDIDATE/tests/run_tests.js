'use strict';
/*
 * STMX SR ENGINE V2 — SUIT SUCCESSOR V1 · STANDALONE + REGRESSION TESTS (test side only). usage: node tests/run_tests.js [--json]
 * Oracle = the FROZEN SR V2 engine on the Jacket record alone + the CEO Upper Priority rule written independently here; expected values are never stored.
 * Populations (labelled): REAL_SUIT (8 genuine Suit images) · SYNTHETIC_PAIRING (every real Jacket × every real Trouser / Skirt from different images) ·
 * SYNTHETIC_MUTATION (fields removed / injected). ⛔ No GT is read here (the historical GT comparison for REF_000840 / 841 lives in the package ledger).
 */
const fs = require('fs'), path = require('path'), os = require('os');
const S = require('../src/sr_v2_suit_engine.js'); const PIN = require('../src/sr_v2_suit_parent_pin.js');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'suit_fixtures_v1.json'), 'utf8'));
const parent = S.parentIdentity(); const SR = require(path.join(parent.dir, 'src', 'sr_v2_engine.js'));
const clone = (x) => JSON.parse(JSON.stringify(x)); const results = []; const ok = (id, desc, pass, detail) => results.push({ id, desc, pass: !!pass, detail: detail === undefined ? null : detail });
const rec = new Map(FX.real_member_records.map((m) => [m.id, m])); const pk = (a, b) => ({ scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: [a.target_id, b.target_id] }, targets: [{ target_id: a.target_id, record: clone(a.record) }, { target_id: b.target_id, record: clone(b.record) }] });
const solo = (m) => { try { return SR.evaluate(clone(m.record)); } catch (e) { return { error: e.code || e.name }; } };
const dir = (m) => { const r = solo(m); return r.error ? 'ERR:' + r.error : r.customer.direction; };
const uniq = (a, b) => (a.target_id === b.target_id ? Object.assign({}, b, { target_id: b.target_id + '_b' }) : b);
const obsOf = (m) => Object.fromEntries(Object.entries(m.record.observations).filter(([, v]) => v && v.state === 'OBSERVED').map(([k, v]) => [k, v.value]));

ok('SS-01', 'frozen SR V2 parent verified before load (freeze record + every frozen file + every bound runtime dependency)', parent.freeze_id === 'ITEM-SR-V2-FINAL-FREEZE-V1-2026-10-27' && parent.frozen_files_verified > 0 && parent.runtime_dependencies_verified > 0, { files: parent.frozen_files_verified, deps: parent.runtime_dependencies_verified });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'srsuitpin-')); let e1 = null, e2 = null;
try { PIN.verifyParent(tmp); } catch (e) { e1 = e.code; }
fs.mkdirSync(path.join(tmp, path.dirname(PIN.PARENT.freeze_record)), { recursive: true }); fs.writeFileSync(path.join(tmp, PIN.PARENT.freeze_record), fs.readFileSync(path.join(PIN.MASTER_ROOT, PIN.PARENT.freeze_record), 'utf8') + ' ');
try { PIN.verifyParent(tmp); } catch (e) { e2 = e.code; } fs.rmSync(tmp, { recursive: true, force: true });
ok('SS-02', 'negative controls: missing parent → PARENT_FREEZE_RECORD_MISSING · one changed byte → PARENT_FREEZE_RECORD_DRIFT', e1 === 'PARENT_FREEZE_RECORD_MISSING' && e2 === 'PARENT_FREEZE_RECORD_DRIFT', { e1, e2 });

/* REAL_SUIT */
const real = FX.real_suits.map((s) => { const ms = s.member_ids.map((id) => rec.get(s.ref + '#' + id)); const j = ms.find((m) => m.category === 'Jacket'), b = ms.find((m) => m !== j); return { s, j, b, r: S.evaluateSuit(pk(ms[0], ms[1])), jd: dir(j), bd: dir(b) }; });
ok('SS-03', 'REAL_SUIT (8): Suit Direction = the frozen SR V2 Direction of the Jacket record alone', real.every((x) => x.r.ok && x.r.direction === x.jd), real.map((x) => x.s.ref + ' J ' + x.jd + ' / B ' + x.bd + ' → ' + (x.r.ok ? x.r.direction : x.r.code)));
ok('SS-04', 'REAL_SUIT: Reason = "재킷은 " + the frozen Jacket Reason verbatim + the Upper Priority statement (+ contrast when the bottom differs); verified', real.every((x) => x.r.ok && x.r.customer.reason && x.r.customer.reason.startsWith('재킷은 ' + solo(x.j).customer.reason + ' 수트 전체의 방향은 재킷 실루엣이 결정합니다.') && (x.bd !== x.jd) === / 쪽이지만 수트 방향을 바꾸지 않습니다\.$/.test(x.r.customer.reason) && !x.r.suit_trace.reason_findings.length), real.map((x) => x.s.ref + ' ' + (x.r.customer && x.r.customer.reason)));
const r840 = real.find((x) => x.s.ref === 'REF_000840'), r841 = real.find((x) => x.s.ref === 'REF_000841');
ok('SS-05', 'REF_000840 and REF_000841: Jacket S / Trouser R (frozen) → Suit S under Upper Priority — the Trouser never overturns the Jacket', r840.jd === 'S' && r840.bd === 'R' && r840.r.direction === 'S' && r841.jd === 'S' && r841.bd === 'R' && r841.r.direction === 'S', { r840: [r840.jd, r840.bd, r840.r.direction, r840.r.suit_trace.governing_member.decisive_rule_id], r841: [r841.jd, r841.bd, r841.r.direction, r841.r.suit_trace.governing_member.decisive_rule_id], r841_bottom_observed: obsOf(r841.b) });

/* SYNTHETIC_PAIRING */
const J = FX.real_member_records.filter((m) => m.category === 'Jacket'), Bt = FX.real_member_records.filter((m) => m.category !== 'Jacket');
const jd = new Map(J.map((m) => [m.id, dir(m)])), bd = new Map(Bt.map((m) => [m.id, dir(m)]));
const grid = []; for (const a of J) for (const b0 of Bt) { const b = uniq(a, b0); grid.push({ a: a.id, b: b0.id, d: [jd.get(a.id), bd.get(b0.id)], r: S.evaluateSuit(pk(a, b)) }); }
const bad = grid.filter((g) => !g.r.ok || g.r.direction !== g.d[0]);
ok('SS-06', 'SYNTHETIC_PAIRING (' + grid.length + ' Jacket × bottom pairs): Suit Direction = Jacket Direction on every pair (no average · vote · bottom override)', !bad.length, { failures: bad.slice(0, 5).map((g) => g.a + ' + ' + g.b + ' ' + g.d.join('/') + ' → ' + (g.r.ok ? g.r.direction : g.r.code)) });
const cell = (a, b) => grid.filter((g) => g.d[0] === a && g.d[1] === b);
const cells = { 'S/S': cell('S', 'S').length, 'S/R': cell('S', 'R').length, 'R/S': cell('R', 'S').length, 'R/R': cell('R', 'R').length };
ok('SS-07', 'all four §5.2 cells exercised: S/S → S · S/R → S · R/S → R · R/R → R', Object.values(cells).every((n) => n > 0) && cell('S', 'R').every((g) => g.r.direction === 'S') && cell('R', 'S').every((g) => g.r.direction === 'R'), cells);
const perJacket = J.map((a) => new Set(grid.filter((g) => g.a === a.id).map((g) => g.r.direction)).size);
ok('SS-08', 'bottom independence: for every Jacket, all ' + Bt.length + ' bottoms give one and the same Suit Direction', perJacket.every((n) => n === 1));
ok('SS-09', 'every pairing Reason verified (no finding): Jacket leads · own label only · Upper Priority stated · contrast disclosed exactly when the bottom differs · bottom never "decides"', grid.every((g) => g.r.ok && g.r.customer.reason && !g.r.suit_trace.reason_findings.length && g.r.suit_trace.bottom_differs === (g.d[1] !== g.d[0])), { withheld: grid.filter((g) => g.r.ok && !g.r.customer.reason).length });

/* realized silhouette cases (frozen semantics observed, not re-derived) */
const byFit = (f) => J.filter((m) => obsOf(m).fit === f); const strong = J.filter((m) => obsOf(m).shoulder_structure === 'Strong');
const caseRow = (m) => { const r = solo(m); return m.id + ' fit=' + (obsOf(m).fit || '—') + ' shoulder=' + (obsOf(m).shoulder_structure || '—') + ' waist=' + (obsOf(m).waist_definition || '—') + ' fabric=' + (obsOf(m).fabric_behavior || '—') + ' → ' + r.customer.direction + ' ' + r.decisive_rule_id; };
const silh = { oversized: byFit('Oversized').map(caseRow), fitted_slim: byFit('Slim').map(caseRow), relaxed: byFit('Relaxed').map(caseRow), strong_shoulder: strong.map(caseRow) };
ok('SS-10', 'Oversized / fitted (Slim) / Relaxed / Strong-shoulder Jackets: the Suit takes exactly the frozen Jacket Direction (rule id recorded; no Suit-level re-derivation)', [].concat(byFit('Oversized'), byFit('Slim'), byFit('Relaxed'), strong).every((m) => { const b = Bt[0]; return S.evaluateSuit(pk(m, uniq(m, b))).direction === dir(m); }) && silh.oversized.length && silh.fitted_slim.length, silh);
const semi = Bt.filter((m) => obsOf(m).fabric_behavior === 'Semi-Fluid');
ok('SS-11', 'Semi-Fluid bottoms (' + semi.length + '): never change the Suit Direction (Suit = Jacket)', semi.length > 0 && semi.every((b) => J.every((a) => S.evaluateSuit(pk(a, uniq(a, b))).direction === jd.get(a.id))));

/* SYNTHETIC_MUTATION — partial evidence */
const strip = (m, keys) => { const c = clone(m); for (const k of keys) delete c.record.observations[k]; return c; };
const pj = real.map((x) => { const j2 = strip(x.j, ['shoulder_structure', 'waist_definition', 'fabric_behavior']); const r = S.evaluateSuit(pk(j2, x.b)); return { ref: x.s.ref, frozen: dir(j2), suit: r.ok ? r.direction : r.code, limitation: r.ok ? r.suit_trace.limitations : null }; });
ok('SS-12', 'partial Jacket evidence (shoulder / waist / fabric removed): the Suit = frozen SR V2 on the SAME reduced Jacket — a mandatory S / R, never UNKNOWN, nothing fabricated', pj.every((y) => ['S', 'R'].includes(y.suit) && y.suit === y.frozen), pj);
const pb = real.map((x) => { const b2 = clone(x.b); b2.record.observations = {}; const b3 = strip(x.b, ['fit', 'fabric_behavior', 'silhouette']); const r2 = S.evaluateSuit(pk(x.j, b2)), r3 = S.evaluateSuit(pk(x.j, b3)); return { ref: x.s.ref, empty_bottom: r2.ok ? r2.direction + ' ' + r2.suit_trace.limitations.join(' | ') : r2.code, reduced_bottom: r3.ok ? r3.direction : r3.code, jacket: x.jd }; });
ok('SS-13', 'partial / empty bottom evidence never changes the Suit (Suit = Jacket); a bottom the frozen engine rejects is a recorded limitation, not UNKNOWN', pb.every((y) => y.empty_bottom.startsWith(y.jacket) && y.reduced_bottom === y.jacket), pb);
const jbad = clone(r840.j); jbad.record.observations = {}; const jr = S.evaluateSuit(pk(jbad, r840.b)); const jfrozen = solo(jbad);
ok('SS-14', 'genuinely unusable Jacket evidence: Suit result = whatever the frozen engine does with that Jacket (Direction or TRANSPORT_ERROR) — never the bottom Direction', jfrozen.error ? (!jr.ok && jr.code === 'SUIT_JACKET_RECORD_REJECTED') : (jr.ok && jr.direction === jfrozen.customer.direction), { frozen: jfrozen.error || jfrozen.customer.direction, suit: jr.ok ? jr.direction : jr.code });
const inj = (m) => { const c = clone(m); c.record.suit = true; c.record.tailoring = 'Tailored'; c.record.shoulder_padding = true; c.record.ceo_ground_truth = { SR: 'SR4' }; c.record.ref_id = 'REF_999999'; c.record.observations.lapel_claim = { state: 'OBSERVED', value: 'Peak' }; return c; };
ok('SS-15', 'Suit status / tailoring / padding / lapel claims and GT / REF injected into the records → identical Suit result (no S from a label)', real.every((x) => JSON.stringify(S.evaluateSuit(pk(inj(x.j), inj(x.b))).customer) === JSON.stringify(x.r.customer)));

/* packet contract · determinism · output */
const shirt = { target_id: 'target_9', record: { category: { state: 'OBSERVED', value: 'Shirt' }, observations: {} } };
const neg = [['three members', Object.assign(pk(r840.j, r840.b), { targets: pk(r840.j, r840.b).targets.concat([shirt]) })], ['Jacket + Jacket', pk(r840.j, Object.assign(clone(r841.j), { target_id: 'target_7' }))], ['Shirt + Trouser', pk(shirt, r840.b)], ['not SUIT', Object.assign(pk(r840.j, r840.b), { product_identity: { merchandise_type: 'ITEM' } })], ['null', null]].map(([k, p]) => [k, S.evaluateSuit(p)]);
ok('SS-16', 'invalid Suit packets → CONTRACT_ERROR (never a Direction)', neg.every(([, r]) => !r.ok && r.kind === 'CONTRACT_ERROR'), neg.map(([k, r]) => k + ': ' + (r.ok ? r.direction : r.code)));
const sw = S.evaluateSuit({ scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: [r840.b.target_id, r840.j.target_id] }, targets: [{ target_id: r840.b.target_id, record: clone(r840.b.record) }, { target_id: r840.j.target_id, record: clone(r840.j.record) }] });
ok('SS-17', 'determinism: repeated evaluation byte-identical · bottom declared first → identical customer output', real.every((x) => JSON.stringify(S.evaluateSuit(pk(x.j, x.b))) === JSON.stringify(S.evaluateSuit(pk(x.j, x.b)))) && JSON.stringify(sw.customer) === JSON.stringify(r840.r.customer));
ok('SS-18', 'customer output = exactly { direction, reason } with S / R; no score / tier / Strength / rule id', real.every((x) => JSON.stringify(Object.keys(x.r.customer)) === '["direction","reason"]' && ['S', 'R'].includes(x.r.customer.direction) && !/SR-V2|[0-9]/.test(x.r.customer.reason)));

const pass = results.filter((r) => r.pass).length;
const out = { suite: 'STMX_SR_ENGINE_V2_SUIT_SUCCESSOR_V1 standalone', engine: S.ENGINE_ID, parent: parent.freeze_id, pass, total: results.length, results, ledger: { real: real.map((x) => ({ ref: x.s.ref, type: x.s.type, jacket: { target: x.j.target_id, observed: obsOf(x.j), direction: x.jd, rule: x.r.ok ? x.r.suit_trace.governing_member.decisive_rule_id : null }, bottom: { target: x.b.target_id, category: x.b.category, observed: obsOf(x.b), direction: x.bd }, suit: x.r.ok ? x.r.direction : x.r.code, reason: x.r.ok ? x.r.customer.reason : null })), pairing_cells: cells, pairings: grid.length, silhouette_cases: silh } };
if (process.argv.includes('--json')) console.log(JSON.stringify(out)); else { for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + ' ' + r.desc + (r.pass ? '' : ' :: ' + JSON.stringify(r.detail).slice(0, 600))); console.log(pass + '/' + results.length); }
process.exitCode = pass === results.length ? 0 : 1;
