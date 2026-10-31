'use strict';
/* DM V2 — guards: determinism, GT / REF injection, REF-only change, input order permutation, output-contract injections, runtime isolation, bound inputs. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const H = require('./_harness'); const { ok, clone } = H; const E = H.E, S = H.S;
const rows = [].concat(H.pop75(), H.pop77(), H.pop220(), H.popLive()).filter((x) => x.block !== undefined);
const sig = (r) => (r.ok ? JSON.stringify([r.customer, r.decisive_rule_id, r.reason_clauses]) : 'T:' + r.code);
ok('GD-01', 'determinism: every input evaluated twice → identical output', rows.every((x) => sig(E.evaluate(clone(x.block))) === sig(E.evaluate(clone(x.block)))));
const dirRule = (r) => (r.ok ? r.customer.direction + ' ' + r.decisive_rule_id : 'T');
const gtInj = rows.filter((x) => x.block && Array.isArray(x.block.evidence)).map((x) => { const b = clone(x.block); b.ceo_gt = 'DM9'; b.gt_direction = x.gt_side === 'D' ? 'M' : 'D'; b.ref_id = 'REF_999999'; b.historical_score = 1; (b.evidence || []).forEach((e) => { e.ceo_gt = 'DM1'; e.gt_side = 'M'; }); return [x, E.evaluate(b)]; });
ok('GD-02', 'GT / historical-score / REF fields injected into the block (and each system) change nothing', gtInj.every(([x, r]) => dirRule(r) === dirRule(E.evaluate(clone(x.block)))), gtInj.filter(([x, r]) => dirRule(r) !== dirRule(E.evaluate(clone(x.block)))).map(([x]) => x.id));
const refOnly = rows.filter((x) => x.block && Array.isArray(x.block.evidence) && x.block.evidence.length).map((x) => { const b = clone(x.block); b.evidence.forEach((e, i) => { e.evidence_id = 'renamed-' + i; e.detail = 'renamed'; e.source_observation_refs = []; }); return [x, E.evaluate(b)]; });
ok('GD-03', 'REF-only change (evidence ids / free-text detail / source refs renamed) → same Direction + rule', refOnly.every(([x, r]) => dirRule(r) === dirRule(E.evaluate(clone(x.block)))));
const perm = rows.filter((x) => x.block && Array.isArray(x.block.evidence) && x.block.evidence.length > 1).map((x) => { const b = clone(x.block); b.evidence.reverse(); return [x, E.evaluate(b)]; });
ok('GD-04', 'input order permutation (systems reversed) → same Direction + rule; Reason still verified', perm.length > 0 && perm.every(([x, r]) => dirRule(r) === dirRule(E.evaluate(clone(x.block))) && ['VERIFIED', 'FALLBACK_VERIFIED'].includes(r.reason_status)), { permuted: perm.length });
const one = E.evaluate(clone(H.pop75()[0].block)); const c = S.toCustomerOutput(one);
ok('GD-05', 'customer output = exactly { direction, reason }', JSON.stringify(Object.keys(c)) === '["direction","reason"]' && ['D', 'M'].includes(c.direction));
const inj = [['score', { score: 7 }], ['DM tier', { tier: 'DM7' }], ['Strength', { strength: 'STRONG' }], ['ordinal', { ordinal_tier: 6 }], ['rule id', { rule: 'DM-V2-D1' }], ['policy flag', { provisional_policy: true }]].map(([k, extra]) => { const r = clone(one); Object.assign(r.customer, extra); try { S.toCustomerOutput(r); return [k, false]; } catch (e) { return [k, true]; } });
ok('GD-06', 'numeric / tier / Strength / ordinal / rule / policy fields injected into the customer output are refused', inj.every(([, x]) => x), inj);
const dinj = ['N', 'NEUTRAL', 'UNKNOWN', 'UNRESOLVED', 'NOT_SCORABLE', null, 'DM5'].map((v) => { const r = clone(one); r.customer.direction = v; try { S.toCustomerOutput(r); return false; } catch (e) { return true; } });
ok('GD-07', 'Neutral / UNKNOWN / UNRESOLVED / NOT_SCORABLE / null / numeric Direction injected → refused', dinj.every(Boolean));
let thrown = false; try { S.toCustomerOutput(E.evaluate(undefined)); } catch (e) { thrown = true; } ok('GD-08', 'a transport error cannot be serialized as a customer result', thrown);
const SRC = path.join(H.PKG, 'src'); const files = fs.readdirSync(SRC).map((f) => [f, fs.readFileSync(path.join(SRC, f), 'utf8')]);
const bad = files.filter(([, s]) => /REF_0\d{5}|ceo_gt|ceo_ground_truth|gt_side|CALIBRATION_CORPUS|\.jsonl|OVERLAY|require\(['"](https?|net|tls|child_process)['"]\)|fetch\(/.test(s));
ok('GD-09', 'runtime isolation: src reads no GT / REF / corpus / overlay and opens no network or child process', bad.length === 0, bad.map(([f]) => f));
/* first run of this check scanned comments too (the header lists the prohibited words) and counted `values.length > 1` (= a RANGE reading of one Primitive,
   not a count of systems) as a proxy; it now scans CODE only and targets counts over systems, density, weights, internal composition and family branches */
const dirs = files.filter(([f]) => f === 'dm_v2_direction_resolver.js').map(([, s]) => s)[0].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
ok('GD-10', 'anti-proxy: the resolver code has no count of systems, density, weight, internal composition or family branch', !/evidence\.length\s*[><]=?\s*\d|\)\.length\s*[><]=?\s*[1-9]|density|weight|m1_supporting_realization|internal_(chromatic|fill)|evidence_family/.test(dirs));
const BI = JSON.parse(fs.readFileSync(path.join(H.PKG, 'BOUND_INPUTS.json'), 'utf8')); const shaF = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
ok('GD-11', 'bound frozen input (dm_admission_v1.js) == bound hash; frozen DM V1 production seal verifies', BI.inputs.every((b) => shaF(path.join(H.ROOT, b.path)) === b.sha256) && H.V1.verifyFrozenBaseline().ok);
ok('GD-12', 'Z0 is the only provisional branch and is flagged physically_grounded = false', (() => { const z = E.evaluate({ evidence: [{ evidence_id: 'e', relative_size: { state: 'UNKNOWN' } }], excluded: [] }); return z.decisive_rule_id === 'DM-V2-Z0' && z.provisional_policy === true && z.physically_grounded === false && rows.slice(0, 75).every((x) => E.evaluate(clone(x.block)).provisional_policy === false); })());
H.summary('test_guards', { inputs: rows.length, permuted: perm.length, gt_injected: gtInj.length });
