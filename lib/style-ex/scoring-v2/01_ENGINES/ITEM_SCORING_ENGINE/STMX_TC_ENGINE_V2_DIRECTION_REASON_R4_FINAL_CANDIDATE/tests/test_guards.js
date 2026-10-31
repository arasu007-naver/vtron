'use strict';
/* TC V2 — guards: runtime isolation (no GT / REF / corpus / network in src), no Strength / ordinal module loaded, customer whitelist, frozen binding, prohibited states,
   anti-proxy (no REF id, no category default, no numeric threshold in the resolver). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const H = require('./_harness'); const { ok } = H;
const SRC = path.join(H.PKG, 'src'); const files = fs.readdirSync(SRC).map((f) => [f, fs.readFileSync(path.join(SRC, f), 'utf8')]); const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
ok('GD-01', 'src reads no GT / corpus / rationale / REF list and opens no network or child process', files.every(([, s]) => !/CALIBRATION_CORPUS|ceo_ground_truth|score_rationale|FINAL_REPRESENTATION|REF_0\d{5}|require\(['"](https?|net|child_process)['"]\)|fetch\(/.test(code(s))));
ok('GD-02', 'resolver has no count / weight / threshold / category default / numeric branch', !/\.length\s*[<>]=?\s*[1-9]|weight|threshold|score|tier|category\s*===/.test(code(fs.readFileSync(path.join(SRC, 'tc_v2_resolver.js'), 'utf8'))));
H.E.evaluateCorpus(); const loaded = Object.keys(require.cache);
ok('GD-03', 'no Strength resolver / ordinal projector / score module is loaded by a full evaluation', !loaded.some((p) => /strength|ordinal_projector|projector_v|score_physics/i.test(p)), loaded.filter((p) => /strength|ordinal|projector/i.test(p)));
const BI = H.J(path.join(H.PKG, 'BOUND_INPUTS.json')); const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
ok('GD-04', 'every bound frozen input == its bound hash (read-only binding)', BI.inputs.every((b) => sha(path.join(H.ROOT, b.path)) === b.sha256), BI.inputs.length + ' inputs');
const R = H.E.evaluateCorpus(); const cust = R.map((r) => H.S.toCustomerOutput(r));
ok('GD-05', 'customer output = exactly { direction, reason }; direction ∈ { CLASSIC, TRANSFORMATIVE }; no digit in any customer value', cust.every((c) => JSON.stringify(Object.keys(c)) === '["direction","reason"]' && ['CLASSIC', 'TRANSFORMATIVE'].includes(c.direction) && !/\d/.test(c.reason || '')));
ok('GD-06', 'no result carries a Strength / ordinal / tier / score field anywhere', !/"(strength|ordinal|tier|score|tc_score)"\s*:/i.test(JSON.stringify(R)));
let threw = false; try { H.R.resolve({ v1_direction: 'NEUTRAL', members: [{}] }); } catch (e) { threw = true; }
ok('GD-07', 'the resolver refuses a non-frozen state (Neutral) as input instead of passing it through', threw);
const id = H.B.selfIdentity(); ok('GD-08', 'self identity computable (src aggregate) and the engine status says CANDIDATE', /^[0-9a-f]{64}$/.test(id.aggregate_sha256) && /CANDIDATE/.test(id.engine_status), id.aggregate_sha256);
H.summary('test_guards', { engine: id });
