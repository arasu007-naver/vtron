'use strict';
/* R4 (CEO 2026-10-28 · R3-B1 §4.2 "개별 Observation Field 손상을 전체 제품 입력의 무효 상태로 자동 승격하지 않는다"): TR-01 / TR-03 / TR-08 updated — a corrupted
   field VALUE is excluded field by field (traced) and the remaining evidence decides; only an unreadable product envelope is a CONTRACT_ERROR. The R3 / R2 headers below
   are the historical intent (R3 expectation: a corrupted value ⇒ whole-record CONTRACT_ERROR — reversed by this CEO order). */
/* R3 (CEO 2026-10-28 §5): TR-02 / TR-04 / TR-08 updated — absence of a field (incl. a V1.3 UNIVERSAL key, or the whole observation content) is partial / zero
   evidence of a VALID product → mandatory C / T, never a CONTRACT_ERROR; only corrupted VALUES stay CONTRACT_ERROR. The R2 header below is the historical intent.
   TC V2 R2 — transport / contract defect ≠ zero evidence (live-audit order §11.1 C). A V1.3 record whose TC observations are malformed, or that lacks a V1.3 UNIVERSAL
   parameter (applicable to every garment — non-observation is a STATE, never a missing key), was not delivered intact: it must be a CONTRACT_ERROR, never a
   ZERO_EVIDENCE / EVIDENCE_BOUNDED product result. Negative controls: genuine zero evidence (every state UNKNOWN) and lawful conditional omissions stay product
   results; the 15 stored live V1.3 records are byte-identical in Direction · path · Reason to the predecessor candidate. */
const path = require('path');
const H = require('./_harness'); const { ok, clone } = H; const E = H.E;
const PRED = require(path.join(H.PKG, '..', 'STMX_TC_ENGINE_V2_DIRECTION_REASON_CANDIDATE', 'src', 'tc_v2_engine.js'));   /* predecessor (protected) — read-only comparison */
const LIVE = H.liveRecords(); const base = LIVE.find((l) => l.id.startsWith('call05')).record; const shirt = LIVE.find((l) => l.id.startsWith('call04')).record;
const rec = (obs, from) => ({ category: clone((from || base).category), observations: obs });
const isErr = (r) => r && r.ok === false && r.kind === 'CONTRACT_ERROR' && r.direction === undefined && !r.customer;
const allMal = {}; for (const k of Object.keys(base.observations)) allMal[k] = String(base.observations[k].value || 'x');
const r1 = E.evaluateV13Record(rec(allMal));
ok('TR-01', 'R4: every observation value corrupted inside a valid envelope → each field excluded (traced) → no usable evidence → ZERO_EVIDENCE · CLASSIC (TC-ZE), never a fabricated observation', r1.ok === true && r1.direction === 'CLASSIC' && r1.trace.path === 'ZERO_EVIDENCE' && Object.keys(base.observations).filter((k) => H.B.ALLOWLIST.parameter_whitelist.includes(k) || H.AD.OBSERVED_FIELDS.includes(k)).every((k) => r1.trace.excluded_fields.includes(k))   /* every field TC reads is excluded; fields TC never reads are not read at all */, { ok: r1.ok, code: r1.code, path: r1.trace && r1.trace.path, excluded: r1.trace && r1.trace.excluded_fields });
const r2 = E.evaluateV13Record(rec({}));
ok('TR-02', 'R3: empty observation object of a valid product → valid zero evidence: ZERO_EVIDENCE · CLASSIC (TC-ZE), never a CONTRACT_ERROR', r2.ok === true && r2.direction === 'CLASSIC' && r2.trace.path === 'ZERO_EVIDENCE', { ok: r2.ok, code: r2.code, path: r2.trace && r2.trace.path });
const two = clone(base.observations); two.fit = 'Regular'; two.length = 42; const r3 = E.evaluateV13Record(rec(two));
ok('TR-03', 'R4: two TC observation values corrupted → exactly those two excluded (traced), mandatory C / T from the remaining evidence', r3.ok === true && ['CLASSIC', 'TRANSFORMATIVE'].includes(r3.direction) && r3.trace.excluded_fields.slice().sort().join() === 'fit,length', { ok: r3.ok, code: r3.code, path: r3.trace && r3.trace.path, excluded: r3.trace && r3.trace.excluded_fields });
const dropU = clone(base.observations); delete dropU.surface; const r4 = E.evaluateV13Record(rec(dropU));
ok('TR-04', 'R3: one V1.3 UNIVERSAL key absent → valid partial evidence → mandatory C / T with the gap recorded (absence is never corruption)', r4.ok === true && ['CLASSIC', 'TRANSFORMATIVE'].includes(r4.direction) && r4.adapter.gaps.some((g) => g.field === 'surface' && g.gap === 'NOT_EMITTED_BY_V1_3_RECORD'), { ok: r4.ok, code: r4.code, path: r4.trace && r4.trace.path });
const unk = {}; for (const k of Object.keys(base.observations)) unk[k] = { state: 'UNKNOWN', value: null }; const r5 = E.evaluateV13Record(rec(unk));
ok('TR-05', 'negative control — genuine zero admissible evidence (every state UNKNOWN) stays a product result: ZERO_EVIDENCE · CLASSIC · limitation-only Reason', r5.ok === true && r5.direction === 'CLASSIC' && r5.trace.path === 'ZERO_EVIDENCE' && r5.reason_status !== 'WITHHELD', { ok: r5.ok, direction: r5.direction, path: r5.trace && r5.trace.path });
const cond = clone(shirt.observations); for (const k of ['collar_scale', 'cuff_scale', 'silhouette', 'shoulder_structure']) delete cond[k]; const r6 = E.evaluateV13Record(rec(cond, shirt)); const r6p = PRED.evaluateV13Record(rec(cond, shirt));
ok('TR-06', 'negative control — lawful conditional omissions (collar_scale · cuff_scale · silhouette · shoulder_structure) stay a product result, identical to the predecessor', r6.ok === true && r6.direction === r6p.direction && r6.trace.path === r6p.trace.path && r6.customer.reason === r6p.customer.reason, { r2: r6.ok && r6.direction + ' ' + r6.trace.path, pred: r6p.direction + ' ' + r6p.trace.path });
const same = LIVE.map((l) => { const a = E.evaluateV13Record(l.record), b = PRED.evaluateV13Record(l.record); return { id: l.id, same: a.ok && b.ok && a.direction === b.direction && a.trace.path === b.trace.path && a.customer.reason === b.customer.reason && a.reason_status === b.reason_status }; });
ok('TR-07', 'all 15 stored live V1.3 records: Direction · path · Reason identical to the predecessor candidate (the correction changes no valid input)', same.length === 15 && same.every((x) => x.same), same.filter((x) => !x.same));
const badShapes = [E.evaluateV13Record(rec('fit=Regular')), E.evaluateV13Record(rec([])), E.evaluateV13Record('{"category":'), E.evaluateV13Record(null)];   /* R4: r1 / r3 are valid products now — the defects are envelope defects */   /* R3: r2 / r4 are valid products now */ ok('TR-08', 'a transport / contract defect never carries a Direction, a customer Reason, a score or a path', badShapes.every((r) => r.direction === undefined && !r.customer && !r.trace && !('score' in r)), badShapes.map((r) => Object.keys(r).join(',')));
H.summary('test_transport', { cases: { TR01: r1, TR02: r2, TR03: r3, TR04: r4 }, live_identical: same });
