'use strict';
/**
 * ⛔ NON-CANONICAL CANDIDATE PROOF — NOT APPROVED · NOT USED BY THE EXTRACTOR, VALIDATOR, CLI OR ANY PACKET.
 * Order 2026-10-15 §15: "If a proposed fix requires a canonical output-format change or a Frozen semantic amendment, implement only a
 * compatible candidate proof or diagnostic test in an isolated non-canonical area. Do not label it approved."
 *
 * It answers one question for the CEO: what would DMP-3 be under each pending D-1 option, for a given packet?
 *   D-1A  the frozen DM token `small_detail_unresolvable` is added to the G1 SVP-001 limit list (a look-level readability statement the
 *         observer makes once). A G1 record that OFFERED the token and did not use it is then a positive record → adjudicable; a record
 *         that used it → partially_observable:{small_detail_unresolvable}. Stored EX-02 / EX-03 runs were never offered the token, so
 *         D-1A cannot resolve them offline (`requires_live_record`).
 *   D-1B  the CEO confirms that an OBSERVED SVP-001 record without limits already states that the completed look is readable, small
 *         details included (no vocabulary change). Then: no token → adjudicable; partially_observable:{small_detail_unresolvable} is
 *         unreachable in the integrated architecture.
 *   RC1   the withdrawn RC1 rule (every appearance value of every participant resolved), kept here only to show what it did.
 */
const C = require('../contracts');
const R = require('../registry');
const RC1_READABILITY_FACTS = Object.freeze(['pattern', 'graphic', 'surface', 'decorative_detail', 'attachment']);
const LAYERING = 'OCCLUDED_BY_OTHER_GARMENT';

/** the withdrawn RC1 readability rule (reproduced verbatim in behaviour; never imported by production code) */
function rc1ReadabilityEvidence({ registry, poolEntries, systems }) {
  const get = (ref, f) => poolEntries.find((e) => e.component_ref === ref && e.fact === f) || null; const unresolved = [];
  for (const e of registry) for (const f of RC1_READABILITY_FACTS) { const x = get(e.component_ref, f); const k = e.component_ref + '.' + f; if (!x) { unresolved.push(k + ':NOT_READ'); continue; } if (x.state === 'OBSERVED' || x.state === 'ABSENT') continue; const lim = x.limitation || []; if (x.state === 'NOT_VISIBLE' && R.isGarment(e) && lim.length && lim.every((l) => l === LAYERING)) continue; unresolved.push(k + ':' + x.state); }
  for (const s of systems || []) for (const p of ['size_in_look', 'contrast_in_look', 'position_in_look']) if (!s[p] || s[p].state !== 'OBSERVED') unresolved.push('system.' + p);
  return { established: unresolved.length === 0, unresolved };
}

/** DMP-3 under a hypothetical option, from the G1 record only (+ rc1 for comparison). frame.offered_small_detail_token marks a D-1A record. */
function underOption(option, frame, rc2Value, rc1Readability) {
  if (rc2Value !== null) return { value: rc2Value, basis: 'already derivable in RC2 (token class)' };
  const tokens = (frame && frame.limits) || []; const noToken = frame && frame.state === 'OBSERVED' && tokens.length === 0;
  if (!noToken) return { value: null, basis: 'not a no-token case (AVG-1 / precedence / frame) — unaffected by D-1' };
  if (option === 'D-1B') return { value: 'adjudicable', basis: 'D-1B: OBSERVED + no limit read as "readable incl. small details" (CEO interpretation, not approved)' };
  if (option === 'D-1A') return frame.offered_small_detail_token ? { value: 'adjudicable', basis: 'D-1A: token offered and not used (positive record)' } : { value: null, basis: 'D-1A: record was never offered the token — requires a live record', requires_live_record: true };
  if (option === 'RC1') return rc1Readability && rc1Readability.established ? { value: 'adjudicable', basis: 'RC1 withdrawn rule: every appearance value resolved' } : { value: null, basis: 'RC1 withdrawn rule: ' + ((rc1Readability && rc1Readability.unresolved.length) || 0) + ' peripheral value(s) unresolved → withheld' };
  throw new Error('UNKNOWN_OPTION ' + option);
}
module.exports = { NON_CANONICAL: true, APPROVED: false, rc1ReadabilityEvidence, underOption, RC1_READABILITY_FACTS };
void C;
