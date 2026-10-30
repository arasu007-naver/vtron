'use strict';
/**
 * K-1 canonical component registry + participation filter (+ K-3 as-worn front state on the entry).
 *
 * Participation principle (CEO 2026-10-02, binding): a canonical Full-Look component is an apparel, footwear or
 * fashion-accessory object that participates in the primary subject's completed visible dressed / worn realization.
 * The provider reports each candidate object with its participation judgement; the registry ADMITS participants only.
 * The exclusion reason is never stored (no `worn_state` / `carried_state` field). Registry length is never evidence.
 *
 * V1.1 (accessory coverage, CEO decisions A / C / D):
 *   · identity domain = Item garment categories + the 10 approved accessory families + `other`; `UNKNOWN` is a state, never a value;
 *   · footwear carries the D-2 product family (`footwear_product_family`, OBSERVED or UNKNOWN) + conditional `footwear_product_subtype`;
 *   · other families may carry an optional `object_subtype` (D-2 rule; never required; never on `other` or UNKNOWN identity);
 *   · a separately worn object attached to a garment declares `attached_to` (host); an object attached to an ACCESSORY is that
 *     accessory's own appearance fact (attachment / carrier_part), never a component (one physical object = one record);
 *   · a non-garment never carries an Item record (no fake Item lineage).
 */
const C = require('./contracts');

function resolveIdentity(identity) {
  if (identity === undefined || identity === null) return { state: 'UNKNOWN' };
  if (typeof identity === 'object') return identity;                                // already resolved
  if (identity === 'UNKNOWN' || identity.startsWith('UNKNOWN')) return { state: 'UNKNOWN' };   // IX-8: never force-fit
  if (C.GARMENT_CATEGORIES.includes(identity) || C.NON_GARMENT_KINDS.includes(identity)) return { value: identity, state: 'OBSERVED' };
  throw new Error('IDENTITY_OUTSIDE_CANDIDATE_VOCABULARY (use `other` or `UNKNOWN`): ' + identity);
}
const isGarmentId = (id) => id.state === 'OBSERVED' && C.GARMENT_CATEGORIES.includes(id.value);
const isNonGarmentId = (id) => id.state === 'OBSERVED' && C.NON_GARMENT_KINDS.includes(id.value);

function footwearFields(o, id) {
  const out = {};
  const isFootwear = id.state === 'OBSERVED' && id.value === 'footwear';
  if (!isFootwear) {
    if (o.product_family !== undefined || o.product_subtype !== undefined) throw new Error('FOOTWEAR_FIELD_ON_NON_FOOTWEAR: ' + o.ref);
    return out;
  }
  if (o.subtype !== undefined) throw new Error('FOOTWEAR_USES_PRODUCT_FIELDS_NOT_SUBTYPE: ' + o.ref);
  const pf = o.product_family;
  if (pf === undefined || pf === 'UNKNOWN') out.footwear_product_family = { state: 'UNKNOWN' };          // family not settled from the image → the identity `footwear` stands
  else if (typeof pf === 'string' && C.FOOTWEAR_PRODUCT_FAMILIES.includes(pf) && !C.SUBTYPE_FORBIDDEN_RE.test(pf)) out.footwear_product_family = { value: pf, state: 'OBSERVED' };
  else throw new Error('FOOTWEAR_PRODUCT_FAMILY_ILLEGAL (D-2 families only; heel is not a family): ' + pf);
  const ps = o.product_subtype;
  if (ps !== undefined) {
    if (out.footwear_product_family.state !== 'OBSERVED') throw new Error('FOOTWEAR_SUBTYPE_WITHOUT_FAMILY: ' + o.ref);
    const allowed = C.FOOTWEAR_PRODUCT_SUBTYPES[out.footwear_product_family.value] || [];
    if (!allowed.includes(ps) || C.SUBTYPE_FORBIDDEN_RE.test(ps)) throw new Error('FOOTWEAR_PRODUCT_SUBTYPE_ILLEGAL: ' + ps);
    out.footwear_product_subtype = { value: ps, state: 'OBSERVED' };
  }
  return out;
}

function subtypeField(o, id) {
  if (o.subtype === undefined) return {};
  if (!isNonGarmentId(id) || id.value === 'other') throw new Error('SUBTYPE_ON_UNIDENTIFIED_OBJECT (subtype is category-dependent): ' + o.ref);
  const allowed = C.OBJECT_SUBTYPES[id.value] || [];
  if (!allowed.includes(o.subtype) || C.SUBTYPE_FORBIDDEN_RE.test(o.subtype)) throw new Error('OBJECT_SUBTYPE_ILLEGAL (' + id.value + '): ' + o.subtype);
  return { object_subtype: { value: o.subtype, state: 'OBSERVED' } };
}

/**
 * @param {Array<{ref:string, identity:string|object, participates:boolean, item_record_ref?:string, product_family?:string,
 *                product_subtype?:string, subtype?:string, attached_to?:string, integral_attachments?:string[]}>} objects
 * @param {object} [frontStates]  { ref: { value, state } }   K-3, read from the look (never from Item closure_type)
 */
function buildRegistry(objects, frontStates) {
  const entries = []; const seen = new Set(); const attached = [];
  for (const o of objects || []) {
    if (o.participates !== true) continue;                                          // excluded: nothing stored, no reason stored
    if (!o.ref || typeof o.ref !== 'string') throw new Error('REGISTRY_REF_MISSING');
    if (seen.has(o.ref)) throw new Error('REGISTRY_DUPLICATE_REF: ' + o.ref);
    seen.add(o.ref);
    const id = resolveIdentity(o.identity);
    const e = { component_ref: o.ref, object_identity: id };
    if (o.item_record_ref) {
      if (!isGarmentId(id)) throw new Error('ITEM_RECORD_FOR_NON_GARMENT (no fake Item lineage): ' + o.ref);
      e.item_record_ref = o.item_record_ref;                                        // lineage only
    }
    Object.assign(e, footwearFields(o, id), subtypeField(o, id));
    if (o.product_context !== undefined) {                                             // V1.2 D-3: governed Item category.product_context as CONTEXT METADATA (garments only; never inferred, never a parameter)
      if (!isGarmentId(id)) throw new Error('PRODUCT_CONTEXT_ON_NON_GARMENT: ' + o.ref);
      if (!C.PRODUCT_CONTEXT_DOMAIN.includes(o.product_context)) throw new Error('PRODUCT_CONTEXT_OUTSIDE_ITEM_DOMAIN: ' + o.product_context);
      e.product_context = { value: o.product_context, state: 'OBSERVED' };
    }
    if (o.attached_to !== undefined) {
      if (typeof o.attached_to !== 'string' || o.attached_to === o.ref) throw new Error('REGISTRY_ATTACHED_TO_ILLEGAL: ' + o.ref);
      if (isGarmentId(id)) throw new Error('REGISTRY_GARMENT_CANNOT_BE_ATTACHED_OBJECT: ' + o.ref);
      e.attached_to = o.attached_to; attached.push(e);
    }
    const fs = frontStates && frontStates[o.ref];
    if (fs) {
      if (!C.STATES.includes(fs.state)) throw new Error('FRONT_STATE_ILLEGAL_STATE');
      if (fs.state === 'OBSERVED' && !C.FRONT_STATES.includes(fs.value)) throw new Error('FRONT_STATE_ILLEGAL_VALUE: ' + fs.value);
      e.front_state = fs.state === 'OBSERVED' ? { value: fs.value, state: 'OBSERVED' } : { state: fs.state };
    }
    entries.push(e);
  }
  for (const e of attached) {
    const host = entries.find((x) => x.component_ref === e.attached_to);
    if (!host) throw new Error('REGISTRY_ATTACHED_TO_NOT_A_PARTICIPANT: ' + e.component_ref + ' → ' + e.attached_to);
    if (isNonGarmentId(host.object_identity)) throw new Error('REGISTRY_ATTACHED_TO_ACCESSORY_NOT_A_COMPONENT (one physical object = one record: record it as the carrier accessory\'s attachment / carrier_part): ' + e.component_ref + ' → ' + e.attached_to);
  }
  return entries;
}

const byRef = (registry, ref) => registry.find((e) => e.component_ref === ref);
const has = (registry, ref) => !!byRef(registry, ref);
const isGarment = (e) => isGarmentId(e.object_identity);
const isNonGarment = (e) => isNonGarmentId(e.object_identity);
const isUnknownIdentity = (e) => e.object_identity.state !== 'OBSERVED';
const category = (e) => (isGarment(e) ? e.object_identity.value : null);
const kind = (e) => (isNonGarment(e) ? e.object_identity.value : null);

module.exports = { buildRegistry, resolveIdentity, byRef, has, isGarment, isNonGarment, isUnknownIdentity, category, kind };
