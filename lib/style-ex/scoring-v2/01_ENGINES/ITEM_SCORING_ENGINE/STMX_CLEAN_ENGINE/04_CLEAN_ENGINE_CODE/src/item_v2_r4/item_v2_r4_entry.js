'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R4 ENTRY (internal governed entry surface · not a public API) · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — TARGET-AWARE COLOUR EXTRACTION SUCCESSOR, SUIT MEMBER COLOUR ASSOCIATION, INTEGRATED RUNTIME R4 … §9).
 * Reason: score AFTER target association — the scoring unit is resolved first (the sealed R3 selection gate, unchanged), then only that unit's OWN target-aware
 * colour reaches the sealed R3 (and through it the frozen EI V2). Affected Scope: src/item_v2_r4/ (new); src/item_v2_r3/ and its chain unchanged and pin-verified.
 *
 *   request = the R3 request (vision_envelope · user_selection · merchandise_metadata · image_reference) + image_sha256 + target_colour_packet   (raw colour_observations refused)
 *   resolve unit (R1 validate → R1 select → R3 §8 policy — the sealed modules) ─ invalid / UNRESOLVED → the sealed R3 result verbatim (selection request; colour waits)
 *     └ ITEM target | SUIT members → packet checks (verifyPacket · image sha256 + image_id · manifest == this envelope's) ─ fail → INPUT_CONTRACT_NONCONFORMING
 *                                   → own OBSERVED colour per unit target (by target_id) → sealed R3 scores {request + those colours} → result verbatim + colour trace
 * planColourAcquisition(request) — the manifest + ONE_CALL / PER_TARGET call plans for the resolved unit (no call is made).
 * ⛔ No axis rule · no Direction changed · no fifth scorer · no colour borrowed, merged, averaged or copied between members · no Style ID / code / number / Strength.
 */
const { verifyPredecessors } = require('./item_v2_r4_predecessor_pin');
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

function createItemV2R4Runtime(opts) {
  const pin = verifyPredecessors(opts);   // throws PredecessorPinError — fail closed before any predecessor / successor module is loaded
  const C = require('./item_v2_r4_contracts'); const R3C = C.R3C, R1 = R3C.R1;
  const { validateInputR1 } = require('../item_v2_r1/item_v2_r1_input_contract');
  const { selectProductR1 } = require('../item_v2_r1/item_v2_r1_product_selector');
  const { selectionPolicy } = require('../item_v2_r3/item_v2_r3_input_gates');
  const { composeResult } = require('../item_v2/item_v2_result_composer');
  const { createItemV2R3Runtime } = require('../item_v2_r3/item_v2_r3_entry');
  const { checkPacket, attachOwnColour } = require('./item_v2_r4_colour_binding');
  const TAC = require(pin.colour_successor.entryAbs);
  const o = opts || {}; const r3 = createItemV2R3Runtime({ r2Dir: o.r2Dir, r1Dir: o.r1Dir, predecessorDir: o.predecessorDir, root: o.root });
  const runtime = { id: C.RUNTIME_ID, status: C.RUNTIME_STATUS, predecessor: { r3: { id: R3C.RUNTIME_ID, directory_aggregate_sha256: pin.r3.directory_aggregate }, colour_successor: { id: TAC.C.SUCCESSOR_ID, directory_aggregate_sha256: pin.colour_successor.directory_aggregate }, verified: pin.verified } };
  const stamp = (r) => Object.assign(r, { runtime });   /* the R3 runtime identity is carried in runtime.predecessor (same convention as R3 over R2) */
  const split = (input) => { const rest = Object.assign({}, input); const image_sha256 = rest.image_sha256, packet = rest.target_colour_packet; delete rest.image_sha256; delete rest.target_colour_packet; return { rest, image_sha256, packet }; };
  const issue = (code, detail, input, status) => { const r = composeResult({ inputIssue: { issue: code, detail }, imageReference: input && input.image_reference }); if (status) r.result_status = status; r.internal.scoring_route = R3C.R2C.SCORING_ROUTE.NOT_EXECUTED; return stamp(r); };
  function resolveUnit(rest) {
    const v = validateInputR1(rest); if (!v.ok) return { state: 'INVALID' };
    const s0 = selectProductR1(v.input, v.productTitle); if (!s0.ok) return { state: 'INVALID' };
    const sel = selectionPolicy(s0, v.input).sel; if (sel.status === R1.SELECTION_STATUS.UNRESOLVED) return { state: 'UNRESOLVED' };
    return { state: 'RESOLVED', type: sel.unit, target_ids: sel.unit === 'SUIT' ? sel.members.slice() : [sel.target] };
  }

  function scoreItemV2R4(input) {
    if (!isPlain(input)) return stamp(r3.scoreItemV2R3(input));   /* malformed: identical to R3 */
    const { rest, image_sha256, packet } = split(input);
    if (rest.colour_observations !== undefined) return issue(C.INPUT_ISSUE.COLOUR_PROVENANCE_REQUIRED, 'R4 accepts colour only as a target-aware colour packet (target_colour_packet + image_sha256); caller-keyed colour_observations carry no ownership provenance', rest);
    const unit = resolveUnit(rest);
    if (unit.state !== 'RESOLVED') { const r = stamp(r3.scoreItemV2R3(rest)); r.internal.colour_association = { scoring_unit: null, state: unit.state, packet: packet === undefined ? 'ABSENT' : 'NOT_USED — colour is associated only after the scoring unit is resolved (resumeWithSelection)' }; return r; }
    let bound = attachOwnColour(null, unit.target_ids); let packetInfo = null;
    if (packet !== undefined) {
      if (typeof image_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(image_sha256)) return issue(C.INPUT_ISSUE.IMAGE_IDENTITY_REQUIRED, 'a colour packet needs the request image_sha256 (64 lowercase hex of the image bytes)', rest);
      const chk = checkPacket(TAC, packet, image_sha256, rest.vision_envelope); if (!chk.ok) return issue(chk.issue, chk.detail, rest, R3C.RESULT_STATUS.INPUT_CONTRACT_NONCONFORMING);
      bound = attachOwnColour(packet, unit.target_ids); packetInfo = { packet_sha256: packet.packet_sha256, manifest_sha256: packet.manifest.manifest_sha256, packet_unit: packet.manifest.scoring_unit, source: packet.acquisition && packet.acquisition.source, successor: packet.successor };
    }
    const req = clone(rest); if (Object.keys(bound.colour_observations).length) req.colour_observations = bound.colour_observations;
    const r = stamp(r3.scoreItemV2R3(req));
    let plan = null; if (bound.per_target.some((t) => t.state === C.COLOUR_STATE.NOT_ACQUIRED) && typeof image_sha256 === 'string') { const m = TAC.buildTargetManifest({ vision_envelope: rest.vision_envelope, image_sha256, scoring_unit: { type: unit.type, target_ids: unit.target_ids } }); plan = m.ok ? { manifest_sha256: m.manifest.manifest_sha256, scoring_unit: m.manifest.scoring_unit, targets: m.manifest.targets.map((t) => t.target_id) } : { error: m.code }; }
    r.internal.colour_association = { scoring_unit: { type: unit.type, target_ids: unit.target_ids }, packet: packetInfo, per_target: bound.per_target, unused_packet_observations: bound.unused, acquisition_needed_for_unit: plan };
    return r;
  }
  function resumeWithSelection(previousInput, productIdentity) { const next = clone(previousInput) || {}; next.user_selection = { product_identity: clone(productIdentity) }; return scoreItemV2R4(next); }
  function planColourAcquisition(input) {
    if (!isPlain(input)) return { ok: false, state: 'INVALID' };
    const { rest, image_sha256 } = split(input); if (rest.colour_observations !== undefined) return { ok: false, state: C.INPUT_ISSUE.COLOUR_PROVENANCE_REQUIRED };
    const unit = resolveUnit(rest); if (unit.state !== 'RESOLVED') return { ok: false, state: unit.state };
    const m = TAC.buildTargetManifest({ vision_envelope: rest.vision_envelope, image_sha256, scoring_unit: { type: unit.type, target_ids: unit.target_ids } }); if (!m.ok) return { ok: false, state: m.code, detail: m.detail };
    return { ok: true, scoring_unit: unit, manifest: m.manifest, plans: { ONE_CALL: TAC.planAcquisition(m.manifest, TAC.C.MODE.ONE_CALL), PER_TARGET: TAC.planAcquisition(m.manifest, TAC.C.MODE.PER_TARGET) } };
  }
  return Object.freeze({ id: C.RUNTIME_ID, predecessor: runtime.predecessor, scoreItemV2R4, resumeWithSelection, planColourAcquisition, colourSuccessor: TAC });
}

let defaultRuntime = null;
const rt = () => { if (!defaultRuntime) defaultRuntime = createItemV2R4Runtime(); return defaultRuntime; };
function scoreItemV2R4(input) { return rt().scoreItemV2R4(input); }
function resumeWithSelection(previousInput, productIdentity) { return rt().resumeWithSelection(previousInput, productIdentity); }
function planColourAcquisition(input) { return rt().planColourAcquisition(input); }

module.exports = { createItemV2R4Runtime, scoreItemV2R4, resumeWithSelection, planColourAcquisition };
