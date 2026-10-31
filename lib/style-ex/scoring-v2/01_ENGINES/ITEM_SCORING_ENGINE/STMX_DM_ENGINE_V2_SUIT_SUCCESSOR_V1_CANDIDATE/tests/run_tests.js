'use strict';
/*
 * STMX DM ENGINE V2 — SUIT SUCCESSOR V1 · STANDALONE + REGRESSION TESTS (test side only). usage: node tests/run_tests.js [--json]
 * Oracle = the FROZEN DM V2 engine on each member block alone + the CEO either-member rule written independently here; expected values are never stored.
 * ⚠ No stored Suit record carries a DM block: every Direction-bearing case below is SYNTHETIC (structural blocks) or SYNTHETIC_GRAFT (a real stored V1.3 DM block of
 *   another garment placed on a real Suit member record). Real-image DM Suit validation = NOT_DEMONSTRATED (SD-12 proves the real records are rejected, not scored).
 */
const fs = require('fs'), path = require('path'), os = require('os');
const D = require('../src/dm_v2_suit_engine.js'); const PIN = require('../src/dm_v2_suit_parent_pin.js');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'suit_fixtures_v1.json'), 'utf8'));
const parent = D.parentIdentity(); const DM = require(path.join(parent.dir, 'src', 'dm_v2_engine.js'));
const clone = (x) => JSON.parse(JSON.stringify(x)); const results = []; const ok = (id, desc, pass, detail) => results.push({ id, desc, pass: !!pass, detail: detail === undefined ? null : detail });
const rec = new Map(FX.real_member_records.map((m) => [m.id, m])); const SYN = FX.dm_synthetic_blocks;
const pk = (a, b) => ({ scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: [a.target_id, b.target_id] }, targets: [{ target_id: a.target_id, record: clone(a.record) }, { target_id: b.target_id, record: clone(b.record) }] });
const withBlock = (m, block) => { const c = clone(m); if (block === undefined) delete c.record.dm_designed_detail_evidence; else c.record.dm_designed_detail_evidence = clone(block); return c; };
const frozen = (block) => { const r = DM.evaluate(clone(block)); return r.ok ? r.customer.direction : 'T:' + r.code; };
const rule = (ds) => (ds.includes('D') ? 'D' : 'M');   /* CEO §6.1 table, written independently */
const suit = (ref) => { const s = FX.real_suits.find((x) => x.ref === ref); const ms = s.member_ids.map((id) => rec.get(ref + '#' + id)); return { j: ms.find((m) => m.category === 'Jacket'), b: ms.find((m) => m.category !== 'Jacket') }; };
const P = suit('REF_000816'), K = suit('REF_000810');   /* Jacket + Trouser · Jacket + Skirt */

ok('SD-01', 'frozen DM V2 parent verified before load (freeze record + every frozen file + every bound runtime dependency)', parent.freeze_id === 'ITEM-DM-V2-FINAL-FREEZE-V1-2026-10-28' && parent.frozen_files_verified > 0 && parent.runtime_dependencies_verified > 0, { files: parent.frozen_files_verified, deps: parent.runtime_dependencies_verified });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dmsuitpin-')); let e1 = null, e2 = null;
try { PIN.verifyParent(tmp); } catch (e) { e1 = e.code; }
fs.mkdirSync(path.join(tmp, path.dirname(PIN.PARENT.freeze_record)), { recursive: true }); fs.writeFileSync(path.join(tmp, PIN.PARENT.freeze_record), fs.readFileSync(path.join(PIN.MASTER_ROOT, PIN.PARENT.freeze_record), 'utf8') + ' ');
try { PIN.verifyParent(tmp); } catch (e) { e2 = e.code; } fs.rmSync(tmp, { recursive: true, force: true });
ok('SD-02', 'negative controls: missing parent → PARENT_FREEZE_RECORD_MISSING · one changed byte → PARENT_FREEZE_RECORD_DRIFT', e1 === 'PARENT_FREEZE_RECORD_MISSING' && e2 === 'PARENT_FREEZE_RECORD_DRIFT', { e1, e2 });
ok('SD-03', 'SYNTHETIC block oracle: the frozen DM V2 gives D for D_DEFINITE / D_MODERATE_BEYOND and M for every M_* block (incl. buttons / sheen recorded in excluded)', frozen(SYN.D_DEFINITE.block) === 'D' && frozen(SYN.D_MODERATE_BEYOND.block) === 'D' && Object.keys(SYN).filter((k) => k.startsWith('M_')).every((k) => frozen(SYN[k].block) === 'M'), Object.fromEntries(Object.entries(SYN).map(([k, v]) => [k, frozen(v.block)])));

/* §6.1 table on both Suit types */
const tab = []; for (const [nm, s] of [['Jacket+Trouser', P], ['Jacket+Skirt', K]]) for (const [jb, bb] of [['D_DEFINITE', 'M_EMPTY'], ['M_SMALL', 'D_DEFINITE'], ['D_DEFINITE', 'D_MODERATE_BEYOND'], ['M_SMALL', 'M_EMPTY']]) { const r = D.evaluateSuit(pk(withBlock(s.j, SYN[jb].block), withBlock(s.b, SYN[bb].block))); tab.push({ type: nm, jacket: jb, bottom: bb, expected: rule([frozen(SYN[jb].block), frozen(SYN[bb].block)]), r }); }
ok('SD-04', 'SYNTHETIC §6.1 table on Jacket+Trouser and Jacket+Skirt: D/M → D · M/D → D · D/D → D · M/M → M', tab.every((t) => t.r.ok && t.r.customer.direction === t.expected), tab.map((t) => t.type + ' ' + t.jacket + '/' + t.bottom + ' → ' + (t.r.ok ? t.r.customer.direction : t.r.code)));
const only = [['Jacket-only', P, 'j'], ['Trouser-only', P, 'b'], ['Skirt-only', K, 'b']].map(([k, s, who]) => { const r = D.evaluateSuit(pk(withBlock(s.j, who === 'j' ? SYN.D_DEFINITE.block : SYN.M_EMPTY.block), withBlock(s.b, who === 'b' ? SYN.D_DEFINITE.block : SYN.M_EMPTY.block))); const m = who === 'j' ? s.j : s.b; return { k, r, m }; });
ok('SD-05', 'qualifying detail ONLY on the Jacket / ONLY on the Trouser / ONLY on the Skirt → Suit D, that member alone is the qualifying member and is named first in the Reason', only.every((x) => x.r.ok && x.r.customer.direction === 'D' && JSON.stringify(x.r.suit_trace.qualifying_members) === JSON.stringify([x.m.target_id]) && x.r.customer.reason.startsWith(D.MEMBER_KO[x.m.category])), only.map((x) => x.k + ': ' + (x.r.ok ? x.r.customer.reason : x.r.code)));

/* false-positive protections */
const fp = ['M_FUNCTIONAL_BUTTONS_EXCLUDED', 'M_FUNCTIONAL_BUTTON_AS_SMALL_SYSTEM', 'M_NATURAL_SHEEN_EXCLUDED', 'M_OPEN_RANGE'].map((k) => { const r = D.evaluateSuit(pk(withBlock(P.j, SYN[k].block), withBlock(P.b, SYN[k].block))); return { k, d: r.ok ? r.customer.direction : r.code }; });
ok('SD-06', 'ordinary functional buttons (excluded or small system) · natural sheen (excluded, DA-14 upstream) · open range on BOTH members → Suit M (no promotion, no new element rule)', fp.every((x) => x.d === 'M'), fp);
const acc = { target_id: 'target_8', record: { category: { state: 'OBSERVED', value: 'Bag' }, observations: {}, dm_designed_detail_evidence: SYN.D_DEFINITE.block } };
const accR = D.evaluateSuit(Object.assign(pk(withBlock(P.j, SYN.M_EMPTY.block), withBlock(P.b, SYN.M_EMPTY.block)), { targets: pk(withBlock(P.j, SYN.M_EMPTY.block), withBlock(P.b, SYN.M_EMPTY.block)).targets.concat([acc]) }));
ok('SD-07', 'a styling accessory with a Detail block cannot join the Suit (three-member packet → CONTRACT_ERROR); Suit status itself is never a Detail Point (M/M Suit stays M)', !accR.ok && accR.kind === 'CONTRACT_ERROR' && D.evaluateSuit(pk(withBlock(P.j, SYN.M_EMPTY.block), withBlock(P.b, SYN.M_EMPTY.block))).customer.direction === 'M', accR.code);

/* incomplete member evidence */
const inc = [['Jacket absent · Trouser M', withBlock(P.j, undefined), withBlock(P.b, SYN.M_SMALL.block), 'M'], ['Jacket absent · Trouser D', withBlock(P.j, undefined), withBlock(P.b, SYN.D_DEFINITE.block), 'D'], ['Jacket D · Trouser absent', withBlock(P.j, SYN.D_DEFINITE.block), withBlock(P.b, undefined), 'D'], ['Jacket M · Skirt malformed', withBlock(K.j, SYN.M_SMALL.block), withBlock(K.b, SYN.MALFORMED_NOT_ARRAY.block), 'M']].map(([k, a, b, e]) => { const r = D.evaluateSuit(pk(a, b)); return { k, e, r }; });
ok('SD-08', 'incomplete member evidence: one member absent / rejected → the assessed member decides (D if it qualifies, else M); the other member is recorded unassessed and is NOT named in the Reason', inc.every((x) => x.r.ok && x.r.customer.direction === x.e && x.r.suit_trace.unassessed_members.length === 1 && !x.r.customer.reason.includes(D.MEMBER_KO[x.r.suit_trace.members.find((m) => m.target_id === x.r.suit_trace.unassessed_members[0]).category])), inc.map((x) => x.k + ' → ' + (x.r.ok ? x.r.customer.direction + ' · ' + x.r.suit_trace.limitations.join(' | ') : x.r.code)));
const none = D.evaluateSuit(pk(withBlock(P.j, undefined), withBlock(P.b, undefined)));
ok('SD-09', 'no member carries a DM block → TRANSPORT_ERROR (the frozen single-product behaviour), never a fabricated M', !none.ok && none.kind === 'TRANSPORT_ERROR' && none.code === 'SUIT_DM_EVIDENCE_ABSENT_ON_ALL_MEMBERS', none.code);
const dup = D.evaluateSuit(pk(withBlock(P.j, SYN.D_DEFINITE.block), withBlock(P.b, SYN.D_DEFINITE.block))); const single = D.evaluateSuit(pk(withBlock(P.j, SYN.D_DEFINITE.block), withBlock(P.b, SYN.M_EMPTY.block)));
ok('SD-10', 'duplicated detail evidence (the same system on both members) → D exactly as with one member; no count / weight / strength exists in the output; each member keeps its own evidence ids', dup.ok && dup.customer.direction === single.customer.direction && dup.suit_trace.members.every((m) => m.qualifying_evidence_ids.length === 1) && !/count|weight|strength|score/i.test(JSON.stringify(dup.customer)), { dup: dup.customer, single: single.customer.direction });

/* SYNTHETIC_GRAFT — real stored V1.3 DM blocks (other garments) on real Suit members */
const donors = FX.dm_donor_blocks; const gr = [];
for (const d of donors) for (const [nm, s] of [['Jacket+Trouser', P], ['Jacket+Skirt', K]]) for (const who of ['j', 'b']) { const r = D.evaluateSuit(pk(withBlock(s.j, who === 'j' ? d.block : SYN.M_EMPTY.block), withBlock(s.b, who === 'b' ? d.block : SYN.M_EMPTY.block))); gr.push({ d: d.id, nm, who, expected: rule([frozen(d.block), 'M']), r }); }
ok('SD-11', 'SYNTHETIC_GRAFT (' + gr.length + ' cases: 15 real stored V1.3 blocks × 2 Suit types × 2 members, other member M0): Suit = frozen result of the grafted block; Reasons verified', gr.every((g) => g.r.ok && g.r.customer.direction === g.expected && g.r.customer.reason && !g.r.suit_trace.reason_findings.length), { D: gr.filter((g) => g.expected === 'D').length, M: gr.filter((g) => g.expected === 'M').length });

/* REAL_SUIT — honest real-image status */
const realR = FX.real_suits.map((s) => { const ms = s.member_ids.map((id) => rec.get(s.ref + '#' + id)); return { ref: s.ref, blocks: ms.map((m) => (m.record.dm_designed_detail_evidence === undefined ? 'ABSENT' : 'PRESENT')), r: D.evaluateSuit(pk(ms[0], ms[1])) }; });
ok('SD-12', 'REAL_SUIT (8): no stored Suit member carries a DM block → TRANSPORT_ERROR for every real Suit (real-image DM Suit validation NOT_DEMONSTRATED; nothing scored from GT)', realR.every((x) => x.blocks.every((b) => b === 'ABSENT') && !x.r.ok && x.r.code === 'SUIT_DM_EVIDENCE_ABSENT_ON_ALL_MEMBERS'), realR.map((x) => x.ref + ' ' + x.blocks.join('/')));

/* contract · determinism · injection */
const shirt = { target_id: 'target_9', record: { category: { state: 'OBSERVED', value: 'Shirt' }, observations: {} } };
const neg = [['Shirt + Trouser', pk(shirt, P.b)], ['Jacket + Jacket', pk(P.j, Object.assign(clone(K.j), { target_id: 'target_7' }))], ['not SUIT', Object.assign(pk(P.j, P.b), { product_identity: { merchandise_type: 'ITEM' } })], ['null', null]].map(([k, p]) => [k, D.evaluateSuit(p)]);
ok('SD-13', 'invalid Suit packets → CONTRACT_ERROR', neg.every(([, r]) => !r.ok && r.kind === 'CONTRACT_ERROR'), neg.map(([k, r]) => k + ': ' + (r.ok ? r.direction : r.code)));
const injB = (b) => Object.assign(clone(b), { ceo_gt: 'DM9', suit: true, ref_id: 'REF_999999' });
ok('SD-14', 'determinism + GT / REF / Suit-flag injection into the blocks → identical result · bottom declared first → identical customer output', tab.every((t) => JSON.stringify(D.evaluateSuit(pk(withBlock(t.type === 'Jacket+Trouser' ? P.j : K.j, injB(SYN[t.jacket].block)), withBlock(t.type === 'Jacket+Trouser' ? P.b : K.b, injB(SYN[t.bottom].block)))).customer) === JSON.stringify(t.r.customer)) && JSON.stringify(D.evaluateSuit({ scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: [P.b.target_id, P.j.target_id] }, targets: [{ target_id: P.b.target_id, record: withBlock(P.b, SYN.M_EMPTY.block).record }, { target_id: P.j.target_id, record: withBlock(P.j, SYN.D_DEFINITE.block).record }] }).customer) === JSON.stringify(only[0].r.customer));
ok('SD-15', 'customer output = exactly { direction, reason } with D / M; no score / tier / Strength / rule id', tab.every((t) => JSON.stringify(Object.keys(t.r.customer)) === '["direction","reason"]' && ['D', 'M'].includes(t.r.customer.direction) && !/DM-V2|[0-9]/.test(t.r.customer.reason || '')));

const pass = results.filter((r) => r.pass).length;
const out = { suite: 'STMX_DM_ENGINE_V2_SUIT_SUCCESSOR_V1 standalone', engine: D.ENGINE_ID, parent: parent.freeze_id, pass, total: results.length, results, ledger: { table: tab.map((t) => ({ type: t.type, jacket: t.jacket, bottom: t.bottom, suit: t.r.ok ? t.r.customer.direction : t.r.code, reason: t.r.ok ? t.r.customer.reason : null, label: 'SYNTHETIC' })), member_only: only.map((x) => ({ case: x.k, suit: x.r.customer.direction, reason: x.r.customer.reason })), incomplete: inc.map((x) => ({ case: x.k, suit: x.r.ok ? x.r.customer.direction : x.r.code, limitations: x.r.ok ? x.r.suit_trace.limitations : null })), false_positive_controls: fp, grafts: gr.length, real_suits: realR.map((x) => ({ ref: x.ref, blocks: x.blocks, result: x.r.ok ? x.r.customer.direction : x.r.code })) } };
if (process.argv.includes('--json')) console.log(JSON.stringify(out)); else { for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + ' ' + r.desc + (r.pass ? '' : ' :: ' + JSON.stringify(r.detail).slice(0, 600))); console.log(pass + '/' + results.length); }
process.exitCode = pass === results.length ? 0 : 1;
