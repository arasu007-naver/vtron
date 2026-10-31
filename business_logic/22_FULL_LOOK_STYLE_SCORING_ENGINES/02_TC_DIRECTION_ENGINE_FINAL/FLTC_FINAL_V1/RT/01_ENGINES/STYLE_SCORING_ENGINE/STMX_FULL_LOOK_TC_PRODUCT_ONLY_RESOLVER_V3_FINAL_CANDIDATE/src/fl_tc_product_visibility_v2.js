'use strict';
/**
 * Full-Look PRODUCT-VISIBILITY check (V2) — replaces the V1 styling stage (fl_tc_styling_departure_v1.js).
 * Kept from V1 (now TC-PV, authority IX-1 (b)): the look-frame clause. A Classic decision needs the participating garment set to be in view;
 *   look_frame_state ≠ OBSERVED, or a frame limit crop / lower_body_cropped / occlusion / image_failure / not_a_worn_look, can hide a garment or its
 *   product facts, so it withholds CLASSIC. It never cancels a confirmed product departure. feet_not_visible alone does not block (footwear is outside
 *   the product gate).
 * Removed from direction (CEO_APPROVED_FULL_LOOK_TC_PRODUCT_ONLY_2026_10_23): the V1 layer-relation clause of TC-S1, TC-S2 (realized shoulder
 *   exposure on a coat / jacket) and TC-S3 (skirt / dress over trousers, dress over shirt). Their observations are returned as `wearing_context`,
 *   marked non-decisive; the resolver never reads that block.
 * Product facts hidden by another garment are handled in the product stage (IX-1 b exclusion, unchanged); this module adds no product rule.
 */
const FRAME_BLOCK = /crop|occlusion|image_failure|not_a_worn_look/;   // same expression as the V1 TC-S1 frame clause
function evaluateVisibility(L) {
  const findings = []; const limits = L.cv.look_frame_limits || [];
  if (L.cv.look_frame_state !== 'OBSERVED') findings.push({ rule: 'TC-PV', cause: 'VISION_LIMITATION', reason: 'NO_OBSERVABLE_WORN_LOOK', basis: 'look_frame_state ' + L.cv.look_frame_state + ' — the participating garment set is not established' });
  const fl = limits.filter((x) => FRAME_BLOCK.test(x)); if (fl.length) findings.push({ rule: 'TC-PV', cause: 'VISION_LIMITATION', reason: 'FRAME_LIMIT', basis: 'look_frame_limits ' + fl.join(' + ') + ' — a garment or its product facts may be outside the frame / hidden (IX-1 b)' });
  const layers = (L.relations && L.relations.layer_relations) || [];
  const byRef = Object.fromEntries(L.comps.map((c) => [c.ref, c]));
  const shoulder = (L.exposure.events || []).filter((e) => e.region === 'Shoulder');
  const wearing_context = { decisive: false, note: 'observational context only; no direction authority (Product-Only TC, 2026-10-23)',
    layer_relations: layers.map((x) => (byRef[x.over_ref] ? byRef[x.over_ref].identity : x.over_ref) + ' over ' + (byRef[x.under_ref] ? byRef[x.under_ref].identity : x.under_ref) + ' : ' + x.state),
    shoulder_exposure_events: shoulder.map((e) => (e.carrier_refs || []).map((r) => (byRef[r] ? byRef[r].identity : r)).join('+') + ' ' + (e.attribution && e.attribution.state === 'OBSERVED' ? e.attribution.value : 'attribution ' + (e.attribution ? e.attribution.state : 'n/a'))) };
  return { status: findings.length ? 'INSUFFICIENT' : 'SUFFICIENT', findings, wearing_context, evidence_read: ['look_frame_state=' + L.cv.look_frame_state, 'look_frame_limits=' + JSON.stringify(limits)] };
}
module.exports = { evaluateVisibility, FRAME_BLOCK };
