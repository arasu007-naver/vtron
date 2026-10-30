'use strict';
/**
 * RC5 — LOCAL FAILURE ISOLATION (CEO 2026-10-16, EX-04 Defect Correction order §5, approved principle:
 * "A local field-level representation or contract error must not automatically destroy unrelated valid Full-Look evidence").
 *
 * extractIsolated() wraps the UNCHANGED orchestrator (extractor.extract). The normal path is untouched: when extract() succeeds the
 * result is returned as is and the isolation log is empty. Only when extract() throws does this module act:
 *   1. classify the thrown error;
 *   2. LOCATE the exact offending element by re-running the SAME existing module check on single elements (registry · G-1 colour ·
 *      relations · exposure) or from the fact being read when the error was raised (pool / envelope / pocket checks);
 *   3. apply the NARROWEST action of the CEO hierarchy — (a) annotation / value of one element, (b) one fact / colour area / relation /
 *      supplement, (c) one component WITH every dependant (colour areas, facts, front state, relations, attachments, exposure supplements,
 *      SR governing ref, DM systems that name it — never a dangling ref, never a DM system with an invalid carrier) — and retry;
 *   4. anything unclassified, unlocatable or structural (duplicate / missing refs, a participant with no colour entry at all — the CEO
 *      §25 completeness rule) is NOT isolated: the original error is re-thrown and the look fails exactly as before.
 * Nothing is repaired toward a value: an isolated fact is simply not emitted (the pool reads UNKNOWN — never ABSENT), an isolated
 * annotation is absent, no default is created. The DM block keeps its atomic frozen-adapter validation (dm_projection.js unchanged).
 * Every action is a record { step, scope, error_class, error, location, original, action, affected_dependencies, preserved, lost }.
 */
const { extract } = require('./extractor');
const { buildRegistry } = require('./registry');
const { buildColourComposition } = require('./g1_colour');
const { buildRelations } = require('./relations');
const { mergeCanonicalExposure } = require('./exposure');
const { FixtureProvider } = require('./providers');

const clone = (x) => JSON.parse(JSON.stringify(x));
const codeOf = (m) => String(m).split(/[\s:(]/)[0];
const fails = (fn) => { try { fn(); return null; } catch (e) { return e; } };
const participants = (c) => (c.objects || []).filter((o) => o.participates === true);
const refIn = (msg) => { const m = String(msg).match(/\b(c\d+)\b/); return m ? m[1] : null; };

// (a) registry annotation / value actions — the object stays a participant
const REGISTRY_ACTIONS = {
  ITEM_RECORD_FOR_NON_GARMENT: ['item_record_ref'],
  FOOTWEAR_FIELD_ON_NON_FOOTWEAR: ['product_family', 'product_subtype'],
  FOOTWEAR_USES_PRODUCT_FIELDS_NOT_SUBTYPE: ['subtype'],
  FOOTWEAR_PRODUCT_FAMILY_ILLEGAL: ['product_family', 'product_subtype'],          // the subtype depends on the family
  FOOTWEAR_SUBTYPE_WITHOUT_FAMILY: ['product_subtype'],
  FOOTWEAR_PRODUCT_SUBTYPE_ILLEGAL: ['product_subtype'],
  SUBTYPE_ON_UNIDENTIFIED_OBJECT: ['subtype'],
  OBJECT_SUBTYPE_ILLEGAL: ['subtype'],
  PRODUCT_CONTEXT_ON_NON_GARMENT: ['product_context'],
  PRODUCT_CONTEXT_OUTSIDE_ITEM_DOMAIN: ['product_context'],
  REGISTRY_ATTACHED_TO_ILLEGAL: ['attached_to'],
  REGISTRY_GARMENT_CANNOT_BE_ATTACHED_OBJECT: ['attached_to'],
  REGISTRY_ATTACHED_TO_NOT_A_PARTICIPANT: ['attached_to'],
  REGISTRY_ATTACHED_TO_ACCESSORY_NOT_A_COMPONENT: ['attached_to'],
};
const STRUCTURAL = new Set(['REGISTRY_REF_MISSING', 'REGISTRY_DUPLICATE_REF', 'FRAME_STATE_ILLEGAL', 'FRAME_TOKEN_ILLEGAL', 'EXTRACT_PROVIDER_REQUIRED', 'DM_TRANSPORT_V2_AUTHORITY_HASH_MISMATCH']);
const FACT_LEVEL = /^(ENVELOPE_|POCKET_INSTANCE_)|: value outside domain: |: not an envelope$/;

function locateObject(c, code, msg) {
  const parts = participants(c); const direct = refIn(msg);
  if (direct && parts.some((o) => o.ref === direct)) return direct;
  for (const o of parts) {                                                       // single-object re-check with the SAME registry code (host checks need the host: attachment codes use the message ref)
    const solo = clone(o); if (!/ATTACHED/.test(code)) delete solo.attached_to;
    const e = fails(() => buildRegistry([solo], {})); if (e && codeOf(e.message) === code) return o.ref;
  }
  return null;
}
function locateFrontState(c) { for (const [ref, fs] of Object.entries(c.front_state || {})) { const o = participants(c).find((x) => x.ref === ref); if (!o) continue; const solo = clone(o); delete solo.attached_to; if (fails(() => buildRegistry([solo], { [ref]: fs }))) return ref; } return null; }
function locateColourArea(c) {
  const reg = buildRegistry(c.objects, c.front_state);
  for (let i = 0; i < (c.colour_areas || []).length; i++) if (fails(() => buildColourComposition([c.colour_areas[i]], reg, { state: 'UNKNOWN' }))) return i;   // frame state UNKNOWN = per-area checks only (completeness is look-level)
  return null;
}
function locateRelations(c, code) {
  const reg = buildRegistry(c.objects, c.front_state); const isLayer = /^R1_/.test(code); const key = isLayer ? 'layer_relations' : 'securing_relations'; const list = c[key] || [];
  const test = (subset) => fails(() => buildRelations(new FixtureProvider({ ...c, layer_relations: isLayer ? subset : c.layer_relations || [], securing_relations: isLayer ? [] : subset }), reg));
  const accepted = [];
  for (let i = 0; i < list.length; i++) {
    if (!test(accepted.map((k) => list[k]).concat([list[i]]))) { accepted.push(i); continue; }
    if (test([list[i]])) return { key, indices: [i], kind: 'single' };                   // invalid on its own
    for (const j of accepted) if (test([list[j], list[i]])) return { key, indices: [j, i], kind: JSON.stringify(list[j]) === JSON.stringify(list[i]) ? 'identical_pair' : 'conflicting_pair' };
  }
  return null;
}
function locateSupplement(c) { const reg = buildRegistry(c.objects, c.front_state); for (let i = 0; i < (c.exposure_supplement || []).length; i++) if (fails(() => mergeCanonicalExposure({ itemSources: [], supplements: [c.exposure_supplement[i]], registry: reg }))) return i; return null; }

/** (c) one component with every dependant. Returns { affected, lost }. */
function isolateComponent(c, ref) {
  const affected = []; const lost = [];
  const o = (c.objects || []).find((x) => x.ref === ref); lost.push('component ' + ref + ' (' + (o && o.identity) + ')');
  c.objects = (c.objects || []).filter((x) => x.ref !== ref);
  const ca = (c.colour_areas || []).filter((a) => a.carrier === ref); if (ca.length) { affected.push(ca.length + ' colour area(s)'); lost.push('colour of ' + ref); } c.colour_areas = (c.colour_areas || []).filter((a) => a.carrier !== ref);
  if (c.facts && c.facts[ref]) { affected.push(Object.keys(c.facts[ref]).length + ' fact(s)'); lost.push('facts of ' + ref); delete c.facts[ref]; }
  if (c.front_state && c.front_state[ref]) { affected.push('front_state'); delete c.front_state[ref]; }
  for (const k of ['layer_relations', 'securing_relations']) { const before = (c[k] || []).length; c[k] = (c[k] || []).filter((r) => ![r.over, r.under, r.securing, r.affected].includes(ref)); if (before !== c[k].length) { affected.push((before - c[k].length) + ' ' + k); lost.push(k + ' naming ' + ref); } }
  for (const x of c.objects) if (x.attached_to === ref) { delete x.attached_to; affected.push(x.ref + '.attached_to'); }
  const sup = (c.exposure_supplement || []).filter((s) => JSON.stringify(s).includes('"' + ref + '"')); if (sup.length) { affected.push(sup.length + ' exposure supplement(s)'); lost.push('exposure supplements naming ' + ref); c.exposure_supplement = (c.exposure_supplement || []).filter((s) => !sup.includes(s)); }
  if (c.upper && c.upper.governing_ref === ref) { delete c.upper.governing_ref; affected.push('upper.governing_ref'); }
  if (c.dm && Array.isArray(c.dm.look_detail_systems)) { const keep = c.dm.look_detail_systems.filter((s) => !(s.carrier_refs || []).includes(ref)); const n = c.dm.look_detail_systems.length - keep.length; if (n) { affected.push(n + ' DM system(s) whose carrier became invalid'); lost.push(n + ' DM system(s) carried by ' + ref); c.dm.look_detail_systems = keep; } }
  return { affected, lost };
}

/** Plan ONE action for the error, or null (= not isolable: rethrow). Mutates `c` only through the returned apply(). */
function plan(err, c, ctx) {
  const msg = err.message; const code = codeOf(msg);
  if (STRUCTURAL.has(code)) return null;
  if (REGISTRY_ACTIONS[code]) { const ref = locateObject(c, code, msg); if (!ref) return null; const o = c.objects.find((x) => x.ref === ref); const fields = REGISTRY_ACTIONS[code].filter((k) => o[k] !== undefined); if (!fields.length) return null;
    return { scope: 'ANNOTATION', location: 'objects[' + ref + '].' + fields.join('+'), ref, original: Object.fromEntries(fields.map((k) => [k, o[k]])), apply: () => { for (const k of fields) delete o[k]; }, action: 'annotation removed; ' + ref + ' stays a participant with its identity', affected: fields.includes('product_family') ? ['product_subtype depends on product_family'] : [], preserved: 'component ' + ref + ' and all its other evidence', lost: fields.join(', ') + ' of ' + ref }; }
  if (code === 'IDENTITY_OUTSIDE_CANDIDATE_VOCABULARY') { const ref = locateObject(c, code, msg); if (!ref) return null; const o = c.objects.find((x) => x.ref === ref);
    return { scope: 'VALUE', location: 'objects[' + ref + '].identity', ref, original: { identity: o.identity }, apply: () => { o.identity = 'UNKNOWN'; }, action: 'identity value outside the vocabulary → identity UNKNOWN (a state, never a value; Prompt V2 §3)', affected: ['category-dependent facts of ' + ref + ' are not requested (K-2 applicability)'], preserved: 'component ' + ref + ' as a participant', lost: 'identity value ' + o.identity }; }
  if (/^FRONT_STATE_ILLEGAL/.test(code)) { const ref = locateFrontState(c); if (!ref) return null; const fs = c.front_state[ref];
    return { scope: 'ANNOTATION', location: 'front_state[' + ref + ']', ref, original: fs, apply: () => { delete c.front_state[ref]; }, action: 'front state removed (not emitted)', affected: [], preserved: 'component ' + ref, lost: 'front state of ' + ref }; }
  if (/^G1_/.test(code) && code !== 'G1_COMPONENT_WITHOUT_COLOUR_OPPORTUNITY') { const i = locateColourArea(c); if (i === null) return null; const a = c.colour_areas[i];
    return { scope: 'ELEMENT', location: 'colour_areas[' + i + ']', ref: a.carrier, original: a, apply: () => { c.colour_areas.splice(i, 1); ctx.colourIsolated.add(a.carrier); }, action: 'one colour area removed (its own check fails)', affected: [], preserved: 'every other colour area of ' + a.carrier + ' and of the look', lost: 'this colour area of ' + a.carrier }; }
  if (code === 'G1_COMPONENT_WITHOUT_COLOUR_OPPORTUNITY') {               // only a carrier whose emitted colour was isolated HERE gets an honest UNKNOWN entry; a carrier the model never coloured stays a CEO §25 failure
    const missing = (msg.split(': ')[1] || '').split(',').map((s) => s.trim()).filter(Boolean); const fix = missing.filter((r) => ctx.colourIsolated.has(r)); if (!fix.length || fix.length !== missing.length) return null;
    return { scope: 'CONSEQUENCE', location: 'colour_areas (+ ' + fix.join(',') + ')', ref: fix[0], original: null, apply: () => { for (const r of fix) c.colour_areas.push({ carrier: r, state: 'UNKNOWN' }); }, action: 'the emitted colour of ' + fix.join(',') + ' was isolated → colour state UNKNOWN (no value)', affected: [], preserved: 'the component(s) as participants', lost: 'none beyond the isolated area(s)' }; }
  if (/^R[12]_/.test(code)) { const loc = locateRelations(c, code); if (!loc) return null; const list = c[loc.key]; const orig = loc.indices.map((i) => list[i]);
    const drop = loc.kind === 'identical_pair' ? [loc.indices[1]] : loc.indices;
    return { scope: 'ELEMENT', location: loc.key + '[' + loc.indices.join(',') + ']', ref: refIn(JSON.stringify(orig)), original: orig, apply: () => { c[loc.key] = list.filter((_, i) => !drop.includes(i)); }, action: loc.kind === 'identical_pair' ? 'identical duplicate removed (one record kept — lossless)' : loc.kind === 'conflicting_pair' ? 'both conflicting relations removed (neither is chosen)' : 'invalid relation removed', affected: [], preserved: 'every other relation', lost: loc.kind === 'identical_pair' ? 'none (duplicate)' : JSON.stringify(drop.map((i) => list[i])) }; }
  if (/^SR_/.test(code)) { if (!c.upper) return null; if (code === 'SR_GOVERNING_REF_NOT_IN_REGISTRY') return { scope: 'ANNOTATION', location: 'upper.governing_ref', ref: c.upper.governing_ref, original: { governing_ref: c.upper.governing_ref }, apply: () => { delete c.upper.governing_ref; }, action: 'governing ref that is not a participant removed', affected: ['upper realization is no longer tied to a component (lineage not claimed)'], preserved: 'relation / shoulder / shape readings', lost: 'governing ref' };
    const k = msg.split(': ')[1]; if (!k || !(k in c.upper)) return null; return { scope: 'ANNOTATION', location: 'upper.' + k, ref: null, original: { [k]: c.upper[k] }, apply: () => { delete c.upper[k]; }, action: 'unexpected key removed', affected: [], preserved: 'the rest of the upper realization', lost: k }; }
  if (/^EXPOSURE_/.test(code)) { const i = locateSupplement(c); if (i === null) return null; const s = c.exposure_supplement[i];
    return { scope: 'ELEMENT', location: 'exposure_supplement[' + i + ']', ref: refIn(JSON.stringify(s)), original: s, apply: () => { c.exposure_supplement.splice(i, 1); }, action: 'one exposure supplement removed', affected: [], preserved: 'every other exposure event', lost: 'this supplement' }; }
  if (ctx.fact && (ctx.factActive || FACT_LEVEL.test(msg))) { const { ref, fact } = ctx.fact; if (!c.facts || !c.facts[ref] || !(fact in c.facts[ref])) return null; const v = c.facts[ref][fact];
    return { scope: 'FACT', location: 'facts[' + ref + '].' + fact, ref, original: v, apply: () => { delete c.facts[ref][fact]; }, action: 'one fact not emitted → the pool reads UNKNOWN (never ABSENT)', affected: fact === 'pocket' ? ['pocket instances (nested)'] : [], preserved: 'every other fact of ' + ref + ' and of the look', lost: ref + '.' + fact }; }
  return null;
}

/**
 * @param {object} caseObj      the converted (transport) case — never mutated
 * @param {function} [makeProvider]  case → provider (default FixtureProvider)
 * @returns {{ packet, validation, isolation: object[], case: object }}
 */
function extractIsolated({ caseObj, makeProvider, requestedAxes, gateAuthority, maxSteps }) {
  const mk = makeProvider || ((c) => new FixtureProvider(c));
  const c = clone(caseObj); const records = []; const ctx = { colourIsolated: new Set(), fact: null, factActive: false }; const seen = new Map(); const limit = maxSteps || 64;
  for (let step = 1; step <= limit + 1; step++) {
    const provider = mk(c); const orig = provider.componentFact.bind(provider);
    provider.componentFact = (ref, fact) => { ctx.fact = { ref, fact }; ctx.factActive = true; try { return orig(ref, fact); } finally { ctx.factActive = false; } };
    for (const r of records) (provider.notes = provider.notes || []).push({ note: 'RC5_LOCAL_ISOLATION', scope: r.scope, error_class: r.error_class, location: r.location, action: r.action, lost: r.lost });   // no numeric field, no scoring-like key in the packet (validator)
    let res; ctx.fact = null; ctx.factActive = false;
    try { res = extract({ provider, requestedAxes, gateAuthority }); }
    catch (err) {
      if (step > limit) { err.isolation = records; throw err; }
      let p = plan(err, c, ctx); const code = codeOf(err.message);
      const sig = code + '|' + (p ? p.location : '');
      if (p && seen.has(sig)) p = null;                                                   // the same action twice = no progress → escalate
      if (!p) {                                                                            // (c) component tier — only when a component is identifiable and the error is not structural
        const ref = !STRUCTURAL.has(code) && code !== 'G1_COMPONENT_WITHOUT_COLOUR_OPPORTUNITY' ? (refIn(err.message) || (ctx.factActive && ctx.fact && ctx.fact.ref) || null) : null;
        if (!ref || !participants(c).some((o) => o.ref === ref) || seen.has('COMPONENT|' + ref)) { err.isolation = records; throw err; }
        const { affected, lost } = isolateComponent(c, ref); seen.set('COMPONENT|' + ref, true);
        records.push({ step, scope: 'COMPONENT', error_class: code, error: err.message, location: 'objects[' + ref + ']', original: null, action: 'component isolated with its dependants (no narrower element could be located)', affected_dependencies: affected, preserved: 'every other component and its evidence', lost: lost.join('; ') });
        continue;
      }
      seen.set(sig, true); p.apply();
      records.push({ step, scope: p.scope, error_class: code, error: err.message, location: p.location, original: p.original, action: p.action, affected_dependencies: p.affected, preserved: p.preserved, lost: p.lost });
      continue;
    }
    return { ...res, isolation: records, case: c };
  }
  throw new Error('ISOLATION_STEP_LIMIT');
}

module.exports = { extractIsolated, plan, isolateComponent };
