'use strict';
/*
 * STMX COLOUR V1 — TARGET-AWARE ACQUISITION SUCCESSOR V1 — TARGET MANIFEST (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… TARGET-AWARE COLOUR … §4 · §7). Affected Scope: this file (new).
 *
 * The explicit target manifest derived from the current Item Vision V1.3 envelope + an ALREADY RESOLVED scoring unit (the scoring unit is decided before colour):
 *   image identity (caller-computed image sha256 · envelope image_id) · scoring unit (ITEM | SUIT | REQUESTED_TARGETS, deterministic unit_id) ·
 *   per requested target: the V1.3 target_id · its OBSERVED V1.3 category · the V1.3 descriptor (identification text only) · the Suit member role (= the member's
 *   own V1.3 category) · how the target can be named to the model (category unique in the image · descriptor · ambiguous).
 * manifest_sha256 binds a packet to exactly this envelope + unit. ⛔ No target id is invented; no Suit is inferred (the unit arrives already designated);
 * ⛔ prominence is never read; ⛔ nothing is taken from GT, REF numbers or folders.
 */
const crypto = require('crypto');
const C = require('./tac_contracts');
const { loadFrozenColourV1 } = require('./tac_frozen_colour_pin');
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const catOf = (t) => { const c = t && t.record && t.record.category; return isPlain(c) && c.state === 'OBSERVED' && typeof c.value === 'string' ? c.value : null; };
const canonical = (m) => JSON.stringify({ packet_version: C.PACKET_VERSION, image: m.image, scoring_unit: m.scoring_unit, targets: m.targets });
const fail = (code, detail) => ({ ok: false, code, detail });

/**
 * @param {{ vision_envelope, image_sha256, scoring_unit: { type: 'ITEM'|'SUIT'|'REQUESTED_TARGETS', target_ids: string[] } }} p
 * @returns {{ ok:true, manifest } | { ok:false, code, detail }}
 */
function buildTargetManifest(p) {
  const env = p && p.vision_envelope;
  if (!isPlain(env) || !Array.isArray(env.targets)) return fail(C.CODE.NO_VISION_ENVELOPE, 'vision_envelope with targets[] is required');
  if (typeof p.image_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(p.image_sha256)) return fail(C.CODE.IMAGE_SHA256_REQUIRED, 'image_sha256 (64 lowercase hex, computed from the image bytes) is required');
  const u = p.scoring_unit; const ids = u && Array.isArray(u.target_ids) ? u.target_ids : null;
  if (!isPlain(u) || !Object.values(C.UNIT).includes(u.type) || !ids || !ids.length || !ids.every((i) => typeof i === 'string' && i.trim())) return fail(C.CODE.UNIT_SHAPE_INVALID, 'scoring_unit { type ITEM | SUIT | REQUESTED_TARGETS, target_ids[] } is required');
  if (new Set(ids).size !== ids.length) return fail(C.CODE.DUPLICATE_REQUESTED_TARGET, 'a target is requested twice: ' + ids.join(', '));
  if (u.type === C.UNIT.ITEM && ids.length !== 1) return fail(C.CODE.UNIT_SHAPE_INVALID, 'an ITEM unit names exactly one target');
  const byId = new Map(env.targets.map((t) => [t && t.target_id, t])); const targets = [];
  for (const id of ids) {
    const t = byId.get(id); if (!t) return fail(C.CODE.TARGET_NOT_IN_ENVELOPE, id + ' is not a target of this Vision envelope');
    if (t.eligible !== true) return fail(C.CODE.TARGET_NOT_ELIGIBLE, id + ' is not an eligible garment target of this envelope');
    const cat = catOf(t); if (!cat) return fail(C.CODE.CATEGORY_NOT_OBSERVED, id + ' has no OBSERVED V1.3 category');
    targets.push({ target_id: id, category: cat, descriptor: typeof t.descriptor === 'string' && t.descriptor.trim() ? t.descriptor : null });
  }
  if (u.type === C.UNIT.SUIT) {
    const cats = targets.map((t) => t.category).sort();
    if (ids.length !== 2 || !C.SUIT_COMPONENT_SETS.some((s) => JSON.stringify(s) === JSON.stringify(cats))) return fail(C.CODE.SUIT_COMPONENTS_INVALID, 'a SUIT unit is one Jacket + one Trouser or one Jacket + one Skirt (got ' + cats.join(' + ') + ')');
  }
  /* identification basis: the category is unique among every categorised target of the IMAGE (requested or not) · else the V1.3 descriptor · else ambiguous */
  const imageCats = env.targets.map(catOf).filter(Boolean);
  for (const t of targets) { t.identification = imageCats.filter((c) => c === t.category).length === 1 ? C.IDENTIFICATION.CATEGORY_UNIQUE : t.descriptor ? C.IDENTIFICATION.DESCRIPTOR : C.IDENTIFICATION.AMBIGUOUS; t.member_role = u.type === C.UNIT.SUIT ? t.category : null;
    /* audit only (never edits the text): frozen Colour V1 family tokens that occur as words in the descriptor — a descriptor sent as identification may anchor colour */
    t.descriptor_colour_terms = t.descriptor ? loadFrozenColourV1(p).FAMILIES.map((f) => f.replace('_family', '')).filter((w) => w !== 'uncertain' && new RegExp('\\b' + w + '\\b', 'i').test(t.descriptor)) : []; }
  const ambiguous = targets.filter((t) => t.identification === C.IDENTIFICATION.AMBIGUOUS); if (ambiguous.length) return fail(C.CODE.TARGET_IDENTIFICATION_AMBIGUOUS, ambiguous.map((t) => t.target_id).join(', ') + ': category shared with another target and no V1.3 descriptor — the model could not tell which garment is meant');
  const image = { image_sha256: p.image_sha256, image_id: typeof env.image_id === 'string' ? env.image_id : null };
  const scoring_unit = { type: u.type, unit_id: 'unit-' + sha(p.image_sha256 + '|' + u.type + '|' + ids.slice().sort().join(',')).slice(0, 20) };
  const manifest = { image, scoring_unit, targets };
  manifest.manifest_sha256 = sha(canonical(manifest));
  return { ok: true, manifest };
}

/** recompute a manifest's hash (packet integrity) */
function manifestSha256(m) { return sha(canonical(m)); }

module.exports = { buildTargetManifest, manifestSha256, catOf };
