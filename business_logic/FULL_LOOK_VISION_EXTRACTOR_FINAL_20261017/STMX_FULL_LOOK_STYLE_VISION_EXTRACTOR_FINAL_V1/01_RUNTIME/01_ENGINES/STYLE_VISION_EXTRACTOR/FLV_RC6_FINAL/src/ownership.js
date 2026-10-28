'use strict';
/**
 * One physical object = one canonical record (CEO decision C, 2026-10-07). Physical ownership / provenance only — never scoring.
 *
 * A separately worn object attached to a garment (a pinned brooch, a chain clipped to a belt loop) is a Full-Look component with
 * `attached_to = <host garment>`. The host's Item `attachment` fact may carry a token that describes THE SAME physical object
 * (`Jewelry Attachment`, `Belt`). The record must not exist twice, so:
 *   · default: the separately observed component owns the record and the host's duplicate token is removed from the host fact
 *     (`component_owns`; the suppression is traced here and in the K-2 ledger);
 *   · the host keeps its token ONLY when the provider declares that token as the garment's OWN integral element
 *     (`integral_attachments`), i.e. two genuinely distinct physical objects (`distinct_physical_objects`).
 * This is not "garment always wins" and not "component always wins": it follows the declared physical separateness.
 * Integral objects (a coat's own belt) are never components (relations.js `device_is_own`; the garment's Item facts hold them).
 * An object on an ACCESSORY is that accessory's own attachment / carrier_part fact (registry.js refuses the component).
 */
const C = require('./contracts');
const R = require('./registry');

function resolveOwnership(registry, objects) {
  const integral = {};
  for (const o of objects || []) {
    if (o.integral_attachments === undefined) continue;
    if (!Array.isArray(o.integral_attachments)) throw new Error('INTEGRAL_ATTACHMENTS_ILLEGAL: ' + o.ref);
    for (const t of o.integral_attachments) if (!C.ATTACHMENT_DOMAIN.includes(t)) throw new Error('INTEGRAL_ATTACHMENT_TOKEN_OUTSIDE_ITEM_DOMAIN: ' + t);
    integral[o.ref] = o.integral_attachments.slice();
  }
  const resolutions = []; const suppressed = {};
  for (const e of registry) {
    if (!e.attached_to) continue;
    const host = R.byRef(registry, e.attached_to);
    const token = R.isNonGarment(e) ? C.HOST_ATTACHMENT_TOKEN[e.object_identity.value] || null : null;
    const res = { physical_object_ref: e.component_ref, host_ref: host.component_ref, host_item_token: token, resolution: 'component_owns' };
    if (token && (integral[host.component_ref] || []).includes(token)) res.resolution = 'distinct_physical_objects';
    else if (token) { suppressed[host.component_ref] = suppressed[host.component_ref] || new Set(); suppressed[host.component_ref].add(token); }
    resolutions.push(res);
  }
  return { resolutions, suppressed };
}

/** Apply the host-token suppression to a stored `attachment` envelope. Returns { env, removed[] }. */
function dedupAttachment(env, tokens) {
  if (!tokens || !tokens.size || env.state !== 'OBSERVED') return { env, removed: [] };
  const vals = Array.isArray(env.value) ? env.value : [env.value];
  const removed = vals.filter((v) => tokens.has(v)); const kept = vals.filter((v) => !tokens.has(v));
  if (!removed.length) return { env, removed: [] };
  const out = { ...env };
  if (kept.length) out.value = Array.isArray(env.value) ? kept : kept[0];
  else { delete out.value; out.state = 'ABSENT'; }                                   // the only attachment was the separate object → the garment itself has none
  return { env: out, removed };
}

module.exports = { resolveOwnership, dedupAttachment };
