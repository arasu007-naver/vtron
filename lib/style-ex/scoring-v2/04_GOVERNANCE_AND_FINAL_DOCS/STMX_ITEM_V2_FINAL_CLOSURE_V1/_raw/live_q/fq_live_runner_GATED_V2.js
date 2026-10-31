'use strict';
/* ⚠ NETWORK_CAPABLE_GATED — FQ launcher successor (CEO order 2026-10-29 "ITEM V2 FINAL CLOSURE" §2 Correction A · §7). Successor of the Order O/P runner
   04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_FINAL_REAL_IMAGE_E2E_VALIDATION_V1/_raw/live/fe_live_runner_GATED.js (preserved unchanged — never run again).
   Changes vs the predecessor, and ONLY these:
     1. max_tokens per request kind is READ from STMX_ITEM_VISION_V1_3_INVOCATION_CONFIG_FQ_V2.json (Vision V1.3 16384 · colour 8192 unchanged) and passed into
        makeAnthropicVisionFn({ model, maxTokens }) — two transports (Vision / colour); the fetch guard refuses any request whose max_tokens differs from its kind.
     2. scope = the FQ plan only (REF_000010 · Vision 1 + colour 1) · caps 2 accepted / 3 attempts (1 reserve after a non-billed transport failure) / ceiling ≤ USD 2.00.
     3. anchor = THIS package's AUTHORIZATION/FQ_APPROVAL_ANCHOR.json + Guard 08 heading "## G53 — TEMPORARY EXCEPTION FQ-REF010" (the expired Order P FE-E2E
        anchor can never satisfy it) · ledger in this folder.
     4. a Vision failure stops the run (one image in scope — no colour call follows a failed Vision; the predecessor's two-consecutive-failure rule is moot).
   Everything else is the predecessor verbatim: PRODUCTION / SEALED modules UNMODIFIED (run/anthropic_vision_fn.js · STMX_VISION_PRODUCER_V1_3 runProducer
   maxTechnicalRetries 0 · sealed target-aware colour successor ONE_CALL · sealed R4 offline) · the pre-registered protocol fe_protocol.js of the FE package (pinned) ·
   request validation (url · headers · model · body shape · image sha256 · V1.3 built prompt / successor colour build · frozen colour body · no REF / GT token) ·
   pre-call ceiling · raw responses stored verbatim. THE GATE RUNS FIRST and refuses (exit 3) before any credential is read.
   usage: node fq_live_runner_GATED_V2.js live | dry-run
   dry-run: no anchor, no credential, no network (fetch = local stub: VISION → the stored COMPLETE Order P V1.3 raw response of ANOTHER image (REF_000840),
   COLOUR → schema-valid synthetic colours); output → live_q/dry_run/. Dry-run content is NOT evidence about REF_000010 — it proves wiring, max_tokens, guard,
   ledger and scoring only. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = 'C:/work/STMX/STMX project/master files/STMX EI TC SR DM master/'; const VX = ROOT + '01_ENGINES/ITEM_VISION_EXTRACTOR/', V13 = VX + 'STMX_VISION_PRODUCER_V1_3/';
const CS = VX + 'STMX_COLOUR_TARGET_AWARE_V1_CANDIDATE/', R4E = ROOT + '01_ENGINES/ITEM_SCORING_ENGINE/STMX_CLEAN_ENGINE/04_CLEAN_ENGINE_CODE/src/item_v2_r4/item_v2_r4_entry.js';
const PKG = path.resolve(__dirname, '..', '..'); const FE = ROOT + '04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_FINAL_REAL_IMAGE_E2E_VALIDATION_V1/';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex'); const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const MODE = process.argv[2]; const DRY = MODE === 'dry-run'; if (!['live', 'dry-run'].includes(MODE)) { console.log('usage: live | dry-run'); process.exit(2); }
const OUT = DRY ? path.join(__dirname, 'dry_run') : __dirname; const RAW = path.join(OUT, 'raw_responses'); const PROC = path.join(OUT, 'processed');
const ANCHOR_P = path.join(PKG, 'AUTHORIZATION', 'FQ_APPROVAL_ANCHOR.json'); const PLAN_P = path.join(PKG, 'AUTHORIZATION', 'PREREGISTERED_PLAN_FQ.json'); const LEDGER_P = path.join(OUT, 'attempt_ledger.json');
const CFG_P = path.join(__dirname, 'STMX_ITEM_VISION_V1_3_INVOCATION_CONFIG_FQ_V2.json'); const PROTOCOL_P = FE + '_raw/fe_protocol.js';
const MODEL = 'claude-opus-4-8', URL = 'https://api.anthropic.com/v1/messages', ATTEMPTS_MAX = 3, ACCEPTED_MAX = 2, CEILING_MAX = 2, RESERVES_MAX = 1, IMG_MAX = 4784;
const FORBIDDEN = /REF_\d{6}|\bGT\b|ground truth|ceo_ground_truth|\bEI\d\b|\bTC\d\b|\bSR\d\b|\bDM\d\b/;
const refuse = (code, detail) => { console.log('LIVE_NOT_EXECUTED ·', code, detail ? '· ' + detail : ''); process.exit(3); };
function gate() {
  if (!fs.existsSync(PLAN_P)) refuse('NO_PREREGISTERED_PLAN'); const PLAN = J(PLAN_P); const planSha = sha(fs.readFileSync(PLAN_P));
  if (!fs.existsSync(CFG_P) || sha(fs.readFileSync(CFG_P)) !== PLAN.invocation_config.sha256) refuse('INVOCATION_CONFIG_DRIFT'); const CFG = J(CFG_P);
  if (CFG.model !== MODEL || CFG.vision_v1_3_max_tokens !== PLAN.max_tokens.VISION || CFG.colour_successor_max_tokens !== PLAN.max_tokens.COLOUR) refuse('INVOCATION_CONFIG_NOT_THE_PLAN');
  if (sha(fs.readFileSync(VX + 'run/anthropic_vision_fn.js')) !== PLAN.transport.sha256) refuse('TRANSPORT_DRIFT');
  for (const m of PLAN.vision_modules) if (sha(fs.readFileSync(V13 + m.file)) !== m.sha256) refuse('VISION_DRIFT', m.file);
  const built = require(V13 + 'producer_prompt_v1.js').buildPrompt(); if (sha(built) !== PLAN.vision_built_prompt_sha256) refuse('VISION_PROMPT_DRIFT');
  const seal = J(CS + 'CODE_IDENTITY_SEAL_COLOUR_TARGET_AWARE_V1_CANDIDATE.json'); if (seal.DIRECTORY_AGGREGATE_SHA256 !== PLAN.colour_successor.seal) refuse('COLOUR_SUCCESSOR_DRIFT');
  const r4seal = J(path.dirname(R4E) + '/CODE_IDENTITY_SEAL_ITEM_V2_INTEGRATED_RUNTIME_V2_R4_CANDIDATE.json'); if (r4seal.DIRECTORY_AGGREGATE_SHA256 !== PLAN.r4_seal) refuse('R4_DRIFT');
  if (sha(fs.readFileSync(PROTOCOL_P)) !== PLAN.protocol_sha256) refuse('PROTOCOL_DRIFT');
  for (const i of PLAN.images) if (sha(fs.readFileSync(ROOT + i.path)) !== i.sha256) refuse('IMAGE_DRIFT', i.ref);
  let A = { cost_ceiling_usd: CEILING_MAX, attempts_max: ATTEMPTS_MAX, model: MODEL };
  if (!DRY) {
    if (!fs.existsSync(ANCHOR_P)) refuse('NO_APPROVAL_ANCHOR'); A = J(ANCHOR_P);
    if (A.exception_id !== 'FQ-REF010') refuse('ANCHOR_NOT_THIS_EXCEPTION', A.exception_id);
    if (A.status !== 'ACTIVE') refuse('ANCHOR_NOT_ACTIVE', A.status); if (!A.ceo_statement_verbatim || !A.decision_date) refuse('ANCHOR_INCOMPLETE');
    if (!A.expiry_utc || Date.now() > Date.parse(A.expiry_utc)) refuse('ANCHOR_EXPIRED_OR_UNBOUNDED');
    if (!A.recorded_in || !A.recorded_in.verified_present) refuse('ANCHOR_NOT_RECORDED_IN_GOVERNANCE');
    const guardTxt = fs.readFileSync(ROOT + '00_STMX_CHATGPT_PROJECT_CONTEXT/08_STMX_ARCHITECTURE_GUARD.md', 'utf8'); if (!guardTxt.includes('## G53 — TEMPORARY EXCEPTION FQ-REF010')) refuse('ANCHOR_RECORD_MISSING'); if (guardTxt.includes('### G53 — FQ-REF010 EXPIRED')) refuse('ANCHOR_EXPIRED_IN_GUARD');
    if (A.model !== MODEL || JSON.stringify(A.max_tokens) !== JSON.stringify(PLAN.max_tokens)) refuse('MODEL_NOT_APPROVED', A.model); if (A.plan_sha256 !== planSha) refuse('PLAN_NOT_THE_APPROVED_PLAN');
    if (typeof A.cost_ceiling_usd !== 'number' || !(A.cost_ceiling_usd > 0) || A.cost_ceiling_usd > CEILING_MAX) refuse('CEILING_NOT_APPROVED'); if (A.attempts_max !== ATTEMPTS_MAX || A.calls_max_accepted !== ACCEPTED_MAX) refuse('CALL_CAP_NOT_APPROVED');
  }
  const ledger = fs.existsSync(LEDGER_P) ? J(LEDGER_P) : { attempts: [], spent_usd: 0, run_state: 'NOT_STARTED', results: [] };
  if (ledger.attempts.length >= ATTEMPTS_MAX) refuse('EXPIRED_CALL_CAP'); if (/^STOPPED|COMPLETE/.test(ledger.run_state)) refuse('RUN_ALREADY_ENDED', ledger.run_state);
  return { PLAN, planSha, A, ledger, built, CFG };
}
const { PLAN, planSha, A, ledger, built, CFG } = gate();
/* ───── gate passed ───── */
if (!DRY) { if (process.env.ANTHROPIC_BASE_URL) refuse('GATEWAY_FORBIDDEN'); if (!process.env.ANTHROPIC_API_KEY) refuse('CREDENTIAL_ABSENT_IN_RUNNER_ENV'); }
fs.mkdirSync(RAW, { recursive: true }); fs.mkdirSync(PROC, { recursive: true }); const save = () => fs.writeFileSync(LEDGER_P, JSON.stringify(ledger, null, 1));
const { makeAnthropicVisionFn } = require(VX + 'run/anthropic_vision_fn.js'); const CTRL = require(V13 + 'producer_controller_v1.js'); const TAC = require(CS + 'index.js'); const COL = TAC.loadFrozenColourV1(); const BODY = TAC.frozenParts(COL).body;
const R4 = require(R4E).createItemV2R4Runtime(); const P = require(PROTOCOL_P);
const MAXT = { VISION: CFG.vision_v1_3_max_tokens, COLOUR: CFG.colour_successor_max_tokens };
const accepted = () => ledger.attempts.filter((a) => a.usage && Number.isFinite(a.usage.input_tokens));
let INPUT_BOUND = accepted().length ? Math.max(...accepted().map((a) => a.usage.input_tokens)) + IMG_MAX : PLAN.cost_rule.initial_input_bound_tokens;
const worstOf = (kind) => INPUT_BOUND / 1e6 * PLAN.cost_rule.price_in_per_mtok + MAXT[kind] / 1e6 * PLAN.cost_rule.price_out_per_mtok; const costOf = (u) => u.input_tokens / 1e6 * PLAN.cost_rule.price_in_per_mtok + u.output_tokens / 1e6 * PLAN.cost_rule.price_out_per_mtok;
let current = null; let STOP = null; const realFetch = DRY ? null : globalThis.fetch;
const STUB_VISION = FE + '_raw/live/raw_responses/slot07_VISION_REF_000840.json';
const stub = (kind, prompt) => { let text; if (kind === 'VISION') return new Response(fs.readFileSync(STUB_VISION), { status: 200, headers: { 'content-type': 'application/json' } });
  const rid = (prompt.match(/"request_id":"(tac-[0-9a-f]+)"/) || [])[1]; const ids = [...prompt.matchAll(/^- target_id "([^"]+)"/gm)].map((m) => m[1]);
  text = JSON.stringify({ request_id: rid, targets: ids.map((id, k) => ({ target_id: id, colour_visible: true, color_observation: { primary_color_family: ['gray', 'navy', 'beige'][k % 3], color_lightness: 'normal', color_usage: 'single', multi_color: false, color_effect: 'none', additional_colors: [], evidence: { primary: 'DRY-RUN SYNTHETIC' }, color_notes: null } })) });
  return new Response(JSON.stringify({ id: 'dry', type: 'message', role: 'assistant', model: MODEL, content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: { input_tokens: 9000, output_tokens: 900, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }), { status: 200, headers: { 'content-type': 'application/json' } }); };
globalThis.fetch = async function fqGuard(url, init) {
  const fail = (m) => { const e = new Error('FQ_GUARD_REFUSED: ' + m); e.__guard = true; if (current) current.guard_refusal = m; throw e; };
  if (!current) fail('no active slot'); if (current.dispatched && !current.reserve_allowed) fail('second dispatch in one slot');
  if (String(url) !== URL || !init || init.method !== 'POST') fail('endpoint not approved');
  const h = init.headers || {}; if (h['anthropic-version'] !== '2023-06-01' || !h['x-api-key'] || Object.keys(h).sort().join(',') !== 'anthropic-version,content-type,x-api-key') fail('headers not approved');
  let body; try { body = JSON.parse(init.body); } catch (e) { fail('body not JSON'); }
  if (Object.keys(body).sort().join(',') !== 'max_tokens,messages,model' || body.model !== MODEL || body.max_tokens !== MAXT[current.kind]) fail('model / max_tokens / body keys not approved');
  const m = body.messages; if (!Array.isArray(m) || m.length !== 1 || m[0].role !== 'user' || !Array.isArray(m[0].content) || m[0].content.length !== 2) fail('message shape');
  const [im, tx] = m[0].content; if (im.type !== 'image' || im.source.type !== 'base64' || im.source.media_type !== current.media_type || sha(Buffer.from(im.source.data, 'base64')) !== current.sha256) fail('image bytes are not the slot image');
  if (tx.type !== 'text') fail('text block'); const ps = sha(tx.text);
  if (current.kind === 'VISION' && ps !== PLAN.vision_built_prompt_sha256) fail('prompt is not the approved V1.3 prompt');
  if (current.kind === 'COLOUR' && (ps !== current.expected_prompt_sha256 || !tx.text.includes(BODY) || FORBIDDEN.test(tx.text))) fail('colour prompt is not the successor build for this manifest / frozen body missing / forbidden token');
  if (ledger.attempts.length >= ATTEMPTS_MAX) fail('3-attempt cap'); if (accepted().length >= ACCEPTED_MAX) fail('2 accepted-call cap'); const worst = worstOf(current.kind); if (ledger.spent_usd + worst > A.cost_ceiling_usd) { STOP = 'STOPPED_CEILING_PRE_CALL'; fail('ceiling'); }
  const att = { slot: current.slot, kind: current.kind, test: current.test, ref: current.ref, image_sha256: current.sha256, prompt_sha256: ps, request_body_sha256: sha(init.body), request_started: new Date().toISOString(), model_requested: body.model, max_tokens: body.max_tokens, worst_case_usd_pre_call: +worst.toFixed(4), spent_before_usd: ledger.spent_usd, reserve: !!current.dispatched };
  ledger.attempts.push(att); current.dispatched = true; current.reserve_allowed = false; current.att = att; save();
  const t0 = Date.now(); let res = null, text = null, err = null;
  try { res = DRY ? stub(current.kind, tx.text) : await realFetch(url, init); text = await res.text(); } catch (e) { err = String(e && e.message).slice(0, 200); }
  att.latency_ms = Date.now() - t0; att.http_status = res ? res.status : null;
  const rawFile = path.join(RAW, 'slot' + String(current.slot).padStart(2, '0') + '_' + current.kind + '_' + current.ref + (att.reserve ? '_reserve' : '') + (res && res.ok ? '.json' : '.error.txt')); fs.writeFileSync(rawFile, res ? text : 'NO_RESPONSE ' + err); att.raw_file = path.basename(rawFile); att.raw_sha256 = sha(fs.readFileSync(rawFile));
  if (!res) { att.http_outcome = 'NO_RESPONSE_NOT_BILLED'; current.reserve_allowed = ledger.attempts.filter((a) => a.reserve).length < RESERVES_MAX; save(); throw new Error('network failure: ' + err); }
  if (!res.ok) { att.http_outcome = 'HTTP_FAILURE'; att.cost_usd_booked_worst_case = +worst.toFixed(4); ledger.spent_usd = +(ledger.spent_usd + worst).toFixed(4); save(); return new Response(text, { status: res.status }); }
  let j; try { j = JSON.parse(text); } catch (e) { att.http_outcome = 'BODY_NOT_JSON'; ledger.spent_usd = +(ledger.spent_usd + worst).toFixed(4); STOP = 'STOPPED_COST_NOT_ESTABLISHED'; save(); return new Response(text, { status: res.status }); }
  att.model_returned = j.model; att.usage = j.usage; att.stop_reason = j.stop_reason; const u = j.usage || {};
  if (!Number.isFinite(u.input_tokens) || !Number.isFinite(u.output_tokens) || u.cache_creation_input_tokens > 0 || u.cache_read_input_tokens > 0) { att.http_outcome = 'COST_NOT_ESTABLISHED'; ledger.spent_usd = +(ledger.spent_usd + worst).toFixed(4); STOP = 'STOPPED_COST_NOT_ESTABLISHED'; save(); return new Response(text, { status: res.status }); }
  att.cost_usd = +costOf(u).toFixed(4); ledger.spent_usd = +(ledger.spent_usd + att.cost_usd).toFixed(4); INPUT_BOUND = Math.max(INPUT_BOUND === PLAN.cost_rule.initial_input_bound_tokens ? 0 : INPUT_BOUND, u.input_tokens + IMG_MAX);
  if (j.model !== MODEL) { att.http_outcome = 'MODEL_MISMATCH'; STOP = 'STOPPED_MODEL_MISMATCH'; } else att.http_outcome = 'OK';
  save(); return new Response(text, { status: res.status, headers: { 'content-type': 'application/json' } });
};
const tcfg = (maxTokens) => (DRY ? { model: MODEL, maxTokens, apiKey: 'DRY-RUN-NO-KEY', baseUrl: 'https://api.anthropic.com' } : { model: MODEL, maxTokens });
const visionFn = makeAnthropicVisionFn(tcfg(MAXT.VISION)); const colourFn = makeAnthropicVisionFn(tcfg(MAXT.COLOUR));
const withReserve = async (fn) => { let out, thrown = null; for (let k = 0; k < 2; k++) { thrown = null; try { out = await fn(); } catch (e) { thrown = String(e && e.message).slice(0, 300); } if (!(current && current.reserve_allowed)) break; } return { out, thrown }; };
(async () => {
  ledger.run_state = 'RUNNING_' + MODE.toUpperCase(); ledger.anchor_sha256 = DRY ? null : sha(fs.readFileSync(ANCHOR_P)); ledger.plan_sha256 = planSha; ledger.invocation_config_sha256 = sha(fs.readFileSync(CFG_P)); ledger.started = new Date().toISOString(); save();
  for (const t of P.TESTS.filter((x) => PLAN.tests.includes(x.test))) {
    if (STOP) break; if (ledger.results.some((r) => r.test === t.test)) continue; const img = PLAN.images.find((i) => i.ref === t.ref); const imgPath = ROOT + img.path; const rec = { test: t.test, ref: t.ref, image_sha256: img.sha256 };
    /* STEP B — Vision V1.3 (max_tokens from the invocation config) */
    if (ledger.spent_usd + worstOf('VISION') > A.cost_ceiling_usd) { STOP = 'STOPPED_CEILING_PRE_CALL'; break; }
    current = { slot: PLAN.slots.find((s) => s.ref === t.ref && s.kind === 'VISION').slot, kind: 'VISION', test: t.test, ref: t.ref, sha256: img.sha256, media_type: img.media_type, dispatched: false };
    const vr = await withReserve(() => CTRL.runProducer(imgPath, { visionFn, model: MODEL, maxTechnicalRetries: 0, timeoutMs: 900000, imageId: 'FQ-' + t.test }));
    fs.writeFileSync(path.join(PROC, 'test' + t.test + '_' + t.ref + '_vision_producer_output.json'), JSON.stringify({ runProducer_returned: vr.out, thrown: vr.thrown }, null, 1));
    const vatt = current.att; rec.vision = { attempt: vatt ? vatt.http_outcome : 'NOT_DISPATCHED', stop_reason: vatt ? vatt.stop_reason || null : null, guard_refusal: current.guard_refusal || null, ok: !!(vr.out && vr.out.ok), error: vr.out && !vr.out.ok ? vr.out.error : vr.thrown };
    if (!vatt) { STOP = STOP || 'STOPPED_NOT_DISPATCHED'; ledger.results.push(rec); save(); break; }
    if (!rec.vision.ok) { rec.outcome = 'VISION_FAILED'; ledger.results.push(rec); STOP = 'STOPPED_VISION_FAILED'; save(); current = null; break; }
    const env = vr.out.envelope; rec.vision.targets = env.targets.map((x) => ({ target_id: x.target_id, eligible: x.eligible, category: P.catOf(x), role: x.role, prominence: x.prominence || null }));
    /* STEP A — declared unit → live ids */
    const maps = t.units.map((u) => ({ u, m: P.mapUnit(env, u) }));
    rec.units = maps.map((x) => ({ unit: x.u.id, type: x.u.type, categories: x.u.categories, mapping: x.m }));
    const unitIds = maps.filter((x) => x.m.ok).flatMap((x) => x.m.target_ids); if (!unitIds.length) { rec.outcome = 'UNIT_MAPPING_FAILED'; ledger.results.push(rec); save(); current = null; continue; }
    /* STEP C — target-aware colour (one call, colour max_tokens unchanged) */
    const scope = P.colourScope(env, t, unitIds); const scopeUnit = P.scopeUnitType(maps, scope);
    const mf = TAC.buildTargetManifest({ vision_envelope: env, image_sha256: img.sha256, scoring_unit: { type: scopeUnit, target_ids: scope } }); rec.colour = { scope, scope_unit: scopeUnit, manifest_ok: mf.ok, manifest_error: mf.ok ? null : mf.code + ' ' + mf.detail };
    let packet = null;
    if (mf.ok) { if (ledger.spent_usd + worstOf('COLOUR') > A.cost_ceiling_usd) { STOP = 'STOPPED_CEILING_PRE_CALL'; ledger.results.push(rec); save(); break; }
      const rq = TAC.buildRequests(mf.manifest, 'ONE_CALL', COL)[0]; current = { slot: PLAN.slots.find((s) => s.ref === t.ref && s.kind === 'COLOUR').slot, kind: 'COLOUR', test: t.test, ref: t.ref, sha256: img.sha256, media_type: img.media_type, expected_prompt_sha256: rq.prompt_sha256, dispatched: false };
      const cr = await withReserve(() => TAC.acquireTargetAwareColour({ manifest: mf.manifest, image: imgPath, mode: 'ONE_CALL', transport: colourFn, model: MODEL }));
      packet = cr.out || null; rec.colour.attempt = current.att ? current.att.http_outcome : 'NOT_DISPATCHED'; rec.colour.guard_refusal = current.guard_refusal || null; rec.colour.thrown = cr.thrown;
      if (packet) { fs.writeFileSync(path.join(PROC, 'test' + t.test + '_' + t.ref + '_colour_packet.json'), JSON.stringify(packet, null, 1)); rec.colour.observations = packet.observations.map((o) => ({ target_id: o.target_id, category: o.category, status: o.status, primary: o.color_observation ? o.color_observation.primary_color_family : null, reject_code: o.reject_code })); rec.colour.packet_valid = TAC.verifyPacket(packet).ok; } }
    /* STEP D / E — offline R4 scoring of the declared unit (+ extra items) */
    const score = (u, ids) => { const input = { vision_envelope: env, image_sha256: img.sha256, user_selection: P.selectionOf(u, ids) }; if (packet) input.target_colour_packet = packet; const r = R4.scoreItemV2R4(input); return { input_summary: { unit: u.id, type: u.type, ids }, result: r }; };
    rec.scored = maps.filter((x) => x.m.ok).map((x) => { const s = score(x.u, x.m.target_ids); return { unit: x.u.id, type: x.u.type, target_ids: x.m.target_ids, result_status: s.result.result_status, customer_output: s.result.customer_output, colour_association: s.result.internal && s.result.internal.colour_association, evaluation: DRY ? null : P.evaluate(x.u, s.result) }; });
    rec.extra_items = (t.extra_items || []).map((c) => { const m = P.mapUnit(env, { categories: [c] }); if (!m.ok) return { category: c, mapping: m }; const s = score({ id: 'X-' + c, type: 'ITEM' }, m.target_ids); return { category: c, target_id: m.target_ids[0], result_status: s.result.result_status, customer_output: s.result.customer_output, colour_association: s.result.internal && s.result.internal.colour_association }; });
    rec.outcome = rec.scored.every((s) => s.result_status === 'COMPLETE') ? 'SCORED' : 'SCORED_WITH_ISSUES'; ledger.results.push(rec); save(); current = null;
    console.log('test', t.test, t.ref, rec.outcome, 'vision', rec.vision.attempt, rec.vision.stop_reason, 'colour', rec.colour.attempt, 'spent', ledger.spent_usd);
  }
  ledger.run_state = STOP || (DRY ? 'DRY_RUN_COMPLETE' : 'LIVE_COMPLETE'); ledger.ended = new Date().toISOString(); save();
  console.log('RUN_STATE', ledger.run_state, '· attempts', ledger.attempts.length, '· spent USD', ledger.spent_usd);
})().catch((e) => { ledger.run_state = 'STOPPED_ERROR: ' + e.message; save(); console.log('ERROR', e.message); process.exit(1); });
