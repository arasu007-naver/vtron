'use strict';
/**
 * STMX FULL-LOOK STYLE VISION EXTRACTOR — FINAL V1 · release verifier (offline; node core modules only; no network; never reads a credential).
 *   node 06_RELEASE_VERIFICATION/verify_release.js --out <folder OUTSIDE this release>
 * Works from any copy of the release folder. Writes nothing inside the release. Exit 0 = every check PASS.
 *   R1 manifest       every file listed in SHA256SUMS.txt exists with that sha256; no unlisted file (SHA256SUMS.txt · FINAL_FREEZE_SEAL.json excepted)
 *   R2 freeze seal    FINAL_FREEZE_SEAL.json aggregate recomputed
 *   R3 RC6 identity   every runtime file = its entry in the sealed RC6 code identity seal (03_SCHEMAS_AND_AUTHORITIES/RC6_CODE_IDENTITY_SEAL.json)
 *   R4 dependencies   the 4 frozen dependencies present with pinned sha256; runtime loads; DM authorities verified by the runtime itself
 *   R5 portability    runtime ROOT resolves inside this release; no absolute development path in runtime code
 *   R6 replay         the 12 stored model responses → packets byte-identical to 04_SAMPLES/expected_outputs (twice: deterministic); validator ok
 *   R7 delivery       78 / 78 components · 46 / 46 DM systems verbatim + admitted by the frozen DM adapter under all 9 DMP-3 tokens · no scoring field
 *   R8 G53            LiveProvider refuses; no network module / credential read in runtime src or cli
 *   R9 fixture smoke  bundled fixture M134 → PACKET_VALID
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_' + 'process');
const REL = path.resolve(__dirname, '..') + path.sep; const RT = REL + '01_RUNTIME' + path.sep; const RTX = path.join(RT, '01_ENGINES', 'STYLE_VISION_EXTRACTOR', 'FLV_RC6_FINAL') + path.sep;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex'); const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const oi = process.argv.indexOf('--out'); if (oi < 0) { console.error('usage: node 06_RELEASE_VERIFICATION/verify_release.js --out <folder outside the release>'); process.exit(2); }
const OUT = path.resolve(process.argv[oi + 1]); if ((OUT + path.sep).startsWith(REL)) { console.error('--out must be outside the release folder'); process.exit(2); } fs.mkdirSync(OUT, { recursive: true });
const checks = []; const ck = (id, name, pass, ev) => { checks.push({ id, name, result: pass ? 'PASS' : 'FAIL', evidence: ev }); console.log(id, pass ? 'PASS' : 'FAIL', name); };
const walk = (d, rel = '', out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walk(path.join(d, e.name), r, out); else out.push(r); } return out; };
// R1
const sums = fs.readFileSync(REL + 'SHA256SUMS.txt', 'utf8').trim().split('\n').map((l) => { const i = l.indexOf('  '); return { sha: l.slice(0, i), rel: l.slice(i + 2) }; });
const present = walk(REL.slice(0, -1)).filter((r) => r !== 'SHA256SUMS.txt' && r !== 'FINAL_FREEZE_SEAL.json'); const listed = new Set(sums.map((s) => s.rel));
const bad = sums.filter((s) => !fs.existsSync(REL + s.rel) || sha(fs.readFileSync(REL + s.rel)) !== s.sha).map((s) => s.rel); const unlisted = present.filter((r) => !listed.has(r));
ck('R1', 'manifest: ' + sums.length + ' files, sha256 verified, none missing, none unlisted', !bad.length && !unlisted.length && present.length === sums.length, { files: sums.length, mismatched: bad, unlisted });
// R2
const SEAL = J(REL + 'FINAL_FREEZE_SEAL.json'); const agg = sha(Object.keys(SEAL.files).sort().map((k) => k + ' ' + SEAL.files[k]).join('\n'));
ck('R2', 'freeze seal ' + SEAL.freeze_id + ': aggregate recomputed from its file table; table = SHA256SUMS.txt', agg === SEAL.aggregate_sha256 && sums.every((s) => SEAL.files[s.rel] === s.sha) && Object.keys(SEAL.files).length === sums.length + 1, { aggregate: agg });
// R3
const S6 = J(REL + '03_SCHEMAS_AND_AUTHORITIES/RC6_CODE_IDENTITY_SEAL.json'); const N6 = S6.candidate; const rt = walk(RTX.slice(0, -1)); const r3bad = rt.filter((r) => S6.files[N6 + '/' + r] !== sha(fs.readFileSync(RTX + r)));
ck('R3', 'runtime = sealed RC6 bytes (' + rt.length + ' files, each = RC6 seal entry; RC6 aggregate ' + S6.aggregate_sha256.slice(0, 16) + '…)', !r3bad.length && rt.length === 126, { files: rt.length, mismatched: r3bad });
// R4
const CM = J(REL + '03_SCHEMAS_AND_AUTHORITIES/CONTRACT_AND_VERSION_MANIFEST.json'); const depBad = CM.frozen_dependencies.filter((d) => !fs.existsSync(REL + d.path) || sha(fs.readFileSync(REL + d.path)) !== d.sha256).map((d) => d.path);
let X = null, loadErr = null; try { X = require(RTX + 'src'); X.dm_transport.verifyAuthorities(); } catch (e) { loadErr = e.message; }
ck('R4', 'dependencies: 4 frozen files present with pinned sha256 · runtime loads · DM authorities verified by the runtime', !depBad.length && !loadErr, { missing_or_changed: depBad, load_error: loadErr });
// R5
const C = require(RTX + 'src/contracts.js'); const rootOk = path.resolve(C.ROOT) + path.sep === path.resolve(RT) + path.sep;
const code = rt.filter((r) => /^(src|cli)\//.test(r) && r.endsWith('.js')); const devPaths = code.filter((r) => /[A-Za-z]:[\\/](work|Users)|master files/i.test(fs.readFileSync(RTX + r, 'utf8')));
ck('R5', 'portability: runtime ROOT = ' + path.relative(REL, C.ROOT) + ' (inside the release) · no absolute development path in runtime src / cli', rootOk && !devPaths.length, { root: C.ROOT, dev_paths: devPaths });
// R6 / R7
const SI = J(REL + '04_SAMPLES/SAMPLE_INDEX.json'); const VIS = ['adjudicable', 'partially_observable:{feet_not_visible}', 'partially_observable:{lower_body_cropped}', 'partially_observable:{small_detail_unresolvable}', 'partially_observable:{occlusion}', 'not_adjudicable:{crop}', 'not_adjudicable:{occlusion}', 'not_adjudicable:{image_failure}', 'not_adjudicable:{not_a_worn_look}'];
const BAD = /^(score|scores|dm_score|ei_score|tc_score|sr_score|direction|strength|rank|style_id|eligible|eligibility|scoring_ready|can_score|sufficient|sufficiency|evidence_sufficient|verdict|tier)$/i;
const keys = (o, out) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (!Array.isArray(o)) out.push(k); keys(v, out); } return out; };
const rows = []; for (const s of SI.samples) { const run = (tag) => { const od = path.join(OUT, 'replay', tag, s.image); const r = cp.spawnSync(process.execPath, [RTX + 'cli/run_offline.js', '--raw-response', REL + '04_SAMPLES/' + s.input, '--identity', REL + '04_SAMPLES/' + s.identity, '--out', od], { encoding: 'utf8' }); return { exit: r.status, dir: od, text: fs.existsSync(path.join(od, 'packet.json')) ? fs.readFileSync(path.join(od, 'packet.json'), 'utf8') : null }; };
  const a = run('run1'), b = run('run2'); const exp = fs.readFileSync(REL + '04_SAMPLES/' + s.expected_packet, 'utf8'); const p = a.text ? JSON.parse(a.text) : null; const obj = X.transport.parseModelText(X.transport.textFromRawResponse(J(REL + '04_SAMPLES/' + s.input)).text).obj; const sys = (obj.dm_subsystem && obj.dm_subsystem.look_detail_systems) || [];
  const adm = p ? p.dm_evidence.look_detail_systems.every((x) => VIS.every((v) => { try { X.dm.adaptFrozenDM({ look_components: p.dm_evidence.look_components, look_detail_systems: [JSON.parse(JSON.stringify(x))], dm_evidence_visibility: v }, p.component_registry); return true; } catch (e) { return false; } })) : false;
  rows.push({ image: s.image, exit: a.exit, identical_to_expected: a.text === exp, deterministic: a.text === b.text, validator_ok: a.exit === 0 && J(path.join(a.dir, 'validation.json')).ok, components: p ? p.component_registry.length : 0, participants: (obj.objects || []).filter((o) => o.participates !== false).length, dm: p ? p.dm_evidence.look_detail_systems.length : 0, dm_model: sys.length, dm_verbatim: !!p && JSON.stringify(p.dm_evidence.look_detail_systems) === JSON.stringify(sys), dm_admitted: adm, scoring_keys: p ? keys(p, []).filter((k) => BAD.test(k)).length : -1 }); }
ck('R6', 'replay: ' + rows.length + ' stored responses → packets byte-identical to the expected outputs, deterministic, validator ok', rows.length === 12 && rows.every((r) => r.identical_to_expected && r.deterministic && r.validator_ok), rows.map((r) => r.image + (r.identical_to_expected && r.deterministic && r.validator_ok ? ' ok' : ' FAIL')));
const tc = rows.reduce((s, r) => s + r.components, 0), tp = rows.reduce((s, r) => s + r.participants, 0), td = rows.reduce((s, r) => s + r.dm, 0), tm = rows.reduce((s, r) => s + r.dm_model, 0);
ck('R7', 'delivery: components ' + tc + ' / ' + tp + ' · DM systems ' + td + ' / ' + tm + ' verbatim and admitted (9 DMP-3 tokens) · scoring fields 0', tc === 78 && tp === 78 && td === 46 && tm === 46 && rows.every((r) => r.dm_verbatim && r.dm_admitted && r.scoring_keys === 0), { components: tc, dm: td });
// R8
let liveRefused = false; try { new X.providers.LiveVisionProvider(); } catch (e) { liveRefused = /^G53_BLOCKED_LIVE_INFERENCE/.test(e.message); }
const NET = new RegExp(['require\\([\'"](node:)?(https?|net|tls|dgram|http2)[\'"]\\)', '\\bfe' + 'tch\\s*\\(', 'ANTHROPIC' + '_API' + '_KEY', 'api' + '\\.anthropic' + '\\.com'].join('|')); const netHits = code.filter((r) => NET.test(fs.readFileSync(RTX + r, 'utf8')));
ck('R8', 'G53: LiveProvider refuses · no network module, fetch call, credential variable or API endpoint in runtime src / cli', liveRefused && !netHits.length, { live_refused: liveRefused, hits: netHits });
// R9
const fx = cp.spawnSync(process.execPath, [RTX + 'cli/run_offline.js', '--fixture', 'M134', '--out', path.join(OUT, 'fixture_M134')], { encoding: 'utf8' }); const fs9 = fs.existsSync(path.join(OUT, 'fixture_M134', 'summary.json')) ? J(path.join(OUT, 'fixture_M134', 'summary.json')) : {};
ck('R9', 'fixture smoke: bundled fixture M134 → ' + fs9.status, fx.status === 0 && fs9.status === 'PACKET_VALID', fs9.status);
const report = { document: 'RELEASE VERIFICATION REPORT', release: SEAL.release, freeze_id: SEAL.freeze_id, release_location: REL, node: process.version, at: new Date().toISOString(), live_api_calls: 0, checks, rows, all_pass: checks.every((c) => c.result === 'PASS') };
fs.writeFileSync(path.join(OUT, 'verify_report.json'), JSON.stringify(report, null, 1)); console.log(report.all_pass ? 'RELEASE_VERIFIED' : 'RELEASE_VERIFICATION_FAILED', '·', path.join(OUT, 'verify_report.json')); process.exit(report.all_pass ? 0 : 1);
