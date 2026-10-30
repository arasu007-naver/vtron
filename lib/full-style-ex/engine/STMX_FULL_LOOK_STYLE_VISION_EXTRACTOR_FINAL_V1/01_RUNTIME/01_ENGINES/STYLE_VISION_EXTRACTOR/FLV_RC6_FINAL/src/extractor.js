'use strict';
/**
 * Orchestrator — INTEGRATED V1: ONE observation pass projected into the packet (successor of the V1.4 orchestrator; same inputs).
 *   G1  look_frame · component_registry (+ front_state · footwear D-2 · optional subtype · attached_to) · ownership · common visibility
 *   G2  colour_composition (any participant) · appearance facts via K-2
 *   G3  garment construction via K-2 (incl. the shoulder bundle G3.SH, front G3.FR, pocket G3.PK with pockets[], conditional slit)
 *   G4  relations (layer / securing) · upper_realization (SR; shoulder from the same G3.SH reading) · canonical exposure on request
 *   A1  DM evidence assembly (dm_projection.js · Transport V2): DMP-2 from the shared pass, DMP-1 assembled, DMP-3 mapped or UNKNOWN — always delivered when admissible
 * ⛔ Not the architecture: FOR EACH COMPONENT → RUN ITEM ENGINE → AGGREGATE. No Item engine output is read anywhere.
 * ⛔ Not the architecture: a second image reading for DM, for the shoulder or for the pocket. The pool caches every fact: a second axis
 *    request is a cache hit, never a second observation.
 */
const C = require('./contracts');
const I = require('./integrated');
const { buildRegistry } = require('./registry');
const { resolveOwnership } = require('./ownership');
const { ComponentFactPool } = require('./k2_pool');
const { buildColourComposition } = require('./g1_colour');
const { buildUpperRealization } = require('./sr_realization');
const { buildRelations } = require('./relations');
const { mergeCanonicalExposure } = require('./exposure');
const { verifyAuthorities } = require('./dm_transport_v2');
const { projectDMEvidence } = require('./dm_projection');
const { routeEI, routeTC, routeSR, GateAuthority } = require('./routers');
const { validatePacket } = require('./validator');

function extract({ provider, requestedAxes, gateAuthority }) {
  if (!provider || typeof provider.componentFact !== 'function') throw new Error('EXTRACT_PROVIDER_REQUIRED');
  const axes = (requestedAxes || ['EI', 'TC', 'SR', 'DM']).slice();
  const gate = gateAuthority || new GateAuthority();
  const need = (a) => axes.includes(a);

  // ---- G1
  const frame = provider.lookFrame();
  if (!C.STATES.includes(frame.state)) throw new Error('FRAME_STATE_ILLEGAL');
  for (const t of frame.limits || []) if (!C.FRAME_TOKENS.includes(t)) throw new Error('FRAME_TOKEN_ILLEGAL: ' + t);
  const objects = provider.objects();
  const registry = buildRegistry(objects, provider.frontStates());
  const ownership = resolveOwnership(registry, objects);
  // ---- G4 relations · G2 colour · G4 upper (shoulder from G3.SH)
  const relations = buildRelations(provider, registry);
  const colour = need('EI') ? buildColourComposition(provider.colourAreas(), registry, frame) : null;
  const upper = need('SR') ? buildUpperRealization({ provider, registry, relations }) : null;
  if (upper && upper.shoulder) upper.shoulder.observation_group = 'G3.SH';                 // INT-01: final shoulder realization comes from the same shoulder reading as the product shoulder facts

  // ---- K-2 demand (G2 appearance · G3 construction)
  const pool = new ComponentFactPool(provider, registry, ownership);
  let exposure = null; const requestLog = [];
  const requestExposure = (requester) => { if (!exposure) { exposure = mergeCanonicalExposure({ itemSources: provider.exposureItemSources(), supplements: provider.exposureSupplement(), registry }); requestLog.push({ requester, request: 'canonical_exposure', regions: exposure.events.map((e) => e.region) }); } return exposure; };
  const trace = { requested_axes: axes };
  if (need('EI')) trace.EI = routeEI({ pool, registry, colour, requestExposure, gate });
  if (need('TC')) trace.TC = routeTC({ pool, registry, gate });
  if (need('SR')) trace.SR = routeSR({ pool, registry, upper, provider });

  // ---- A1 frozen-DM assembly (no reading)
  let dm = { dm_evidence: null, dm_transport: null, dm_acquisition: null, diagnostics: [] };
  if (need('DM')) {
    verifyAuthorities();                                                                      // V1 freeze + V2 transport authorities pinned even when no block is delivered
    const dmInput = provider.dmSubsystem();
    if (dmInput) {                                                                            // RC2: no DM-side appearance request (RC1 DM-A1 readability reads withdrawn — DM is not a consumer of SVP-121…126)
      try { dm = projectDMEvidence({ dmInput, registry, frame }); }
      catch (e) {                                                                             // RC2: an inadmissible DM block is rejected as a BLOCK (frozen adapter: never repaired) — it no longer erases the EI / TC / SR evidence of the whole look
        if (!/^DM_/.test(e.message)) throw e;
        dm = { dm_evidence: null, dm_transport: null, dm_acquisition: { status: 'NOT_ACQUIRED', reason: 'DM_BLOCK_REJECTED_BY_FROZEN_ADAPTER' }, diagnostics: [{ code: 'DM_BLOCK_REJECTED', detail: e.message }] };
      }
    }
    else dm.dm_acquisition = { status: 'NOT_ACQUIRED', reason: typeof provider.dmAcquisitionReason === 'function' ? provider.dmAcquisitionReason() : 'FIXTURE_HAS_NO_DM_BLOCK' };
    trace.DM = { assembly: 'A1 — DMP-1 assembled from carrier_refs · DMP-2 from the shared pass · DMP-3 mapped from common visibility (or UNKNOWN); no DM reading; Transport V2 — delivered whenever admissible', delivered: !!dm.dm_evidence, dmp3_state: dm.dm_evidence ? dm.dm_evidence.dm_evidence_visibility.state : null };
  }

  // ---- packet
  const packet = {
    packet_contract: C.PACKET_CONTRACT, packet_version: C.PACKET_VERSION, source_mode: provider.sourceMode(), requested_axes: axes,
    look_frame: { state: frame.state, limits: (frame.limits || []).slice() },
    component_registry: registry, relations: { layer_relations: relations.layer_relations, securing_relations: relations.securing_relations },
  };
  if (ownership.resolutions.length) packet.ownership_resolution = ownership.resolutions;
  if (colour) packet.colour_composition = colour;
  if (upper) packet.upper_realization = upper;
  if (exposure) packet.canonical_exposure = exposure;
  packet.component_fact_pool = pool.entries();
  // INTEGRATED V1: common visibility = the one place per-fact readability is summarised (G1 provenance; nothing new is observed here)
  packet.common_visibility = { look_frame_state: frame.state, look_frame_limits: (frame.limits || []).slice(), facts_not_visible: packet.component_fact_pool.filter((f) => f.state === 'NOT_VISIBLE').map((f) => ({ key: f.component_ref + '.' + f.fact, limitation: f.limitation || [] })), facts_unknown: packet.component_fact_pool.filter((f) => f.state === 'UNKNOWN').map((f) => f.component_ref + '.' + f.fact), identity_unknown: registry.filter((e) => e.object_identity.state !== 'OBSERVED').map((e) => e.component_ref) };
  if (dm.dm_evidence) { packet.dm_evidence = dm.dm_evidence; packet.dm_transport = dm.dm_transport; }   // RC4: ONE DM block (Transport V2); no V1 dm_subsystem, no withheld twin
  if (dm.dm_acquisition) packet.dm_acquisition = dm.dm_acquisition;
  const groups = {}; for (const f of packet.component_fact_pool) (groups[f.observation_group] = groups[f.observation_group] || []).push(f.component_ref + '.' + f.fact);
  packet.request_trace = { axes: trace, k2_ledger: pool.ledger, exposure_requests: requestLog, layer_pairs_excluded: relations.excluded_layer_pairs, observation_groups: { G1: ['look_frame', 'component_registry', 'common_visibility'], G2: ['colour_composition', ...(groups.G2 || [])], G3: groups.G3 || [], 'G3.SH': [...(groups['G3.SH'] || []), ...(upper ? ['upper_realization.shoulder'] : [])], 'G3.FR': groups['G3.FR'] || [], 'G3.PK': groups['G3.PK'] || [], G4: ['relations', ...(upper ? ['upper_realization.relation', 'upper_realization.shape_behaviour'] : []), ...(exposure ? ['canonical_exposure'] : [])], A1: dm.dm_evidence ? ['dm_evidence'] : [] }, dm_diagnostics: dm.diagnostics, provider_notes: provider.notes || [] };
  const validation = validatePacket(packet);
  return { packet, validation };
}

module.exports = { extract };
