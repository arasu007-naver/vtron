/**
 * STMX SCORE NOTATION V1 — SINGLE CANONICAL AUTHORITY for 4-axis score labels.
 *
 * ★★ CEO FULL AXIS-PREFIX RESTORATION (2026-08-25).
 *
 *   Canonical form is ALWAYS the full two-letter axis prefix + the numeric position:
 *
 *       EI1 … EI9      TC1 … TC4 · TC6 … TC9      SR1 … SR9      DM1 … DM9
 *
 *   ★ DIRECTION IS THE NUMBER, NOT THE PREFIX. The numeric score states the position on the
 *     axis (low side 1–4, Neutral 5, high side 6–9). The prefix never mutates to a directional
 *     letter to express which side the score falls on.
 *
 *   ⛔ ILLEGAL as canonical write format: I4 · E7 · C4 · T7 · R4 · S6 · M3 · D7 — and every other
 *      one-letter directional label. They are LEGACY READ-COMPATIBILITY INPUT ONLY (see below).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * HISTORY — recorded honestly, not rewritten.
 *
 *   Earlier STMX material used full axis-prefix notation in prose. On 2026-08-21 this module was
 *   created as the first CODE-LEVEL notation authority and, in normalizing Neutral-5, it also
 *   codified DIRECTIONAL ONE-LETTER prefixes (I/E · C/T · R/S · M/D) as the canonical form.
 *   Later calibration work exposed that this conflicted with the CEO's intended convention.
 *   On 2026-08-25 the CEO restored full axis prefixes, and the canonical corpus + Batch 004
 *   staging were migrated losslessly (notation only · numeric scores unchanged).
 *
 *   ⛔ The one-letter convention is NOT erased from history — it is demoted to legacy input.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ⚠ TC HAS NO NEUTRAL — `TC5` REMAINS FROZEN-RETIRED.
 *
 *   `STMX_TC_FULL_SEMANTIC_LADDER_FROZEN_V1.md`: "TC5는 실제 garment GT score로 사용하지 않는다 (G8)"
 *   · "TC5 = RETIRED" · "TC5 retirement is already frozen and final."
 *   Guards: G-TC1 (재도입 금지) · G-TC14 (4축 symmetry를 이유로 복원 금지) · G-TC15.
 *
 *   ★ FULL-PREFIX RESTORATION DOES NOT REINTRODUCE TC5. G-TC14 forecloses the symmetry argument
 *     specifically, and a notation change is a weaker rationale than symmetry. TC runs
 *     TC1–TC4 → TC6–TC9 with NO 5.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const AXIS_NAMES = ['EI', 'TC', 'SR', 'DM'];

/** Axes that carry a canonical Neutral (5). TC deliberately does not. */
const HAS_NEUTRAL = { EI: true, TC: false, SR: true, DM: true };

/**
 * LEGACY directional prefixes, retained ONLY so the compatibility reader can normalize
 * historical strings. ⛔ Never used to WRITE a canonical label.
 * (Class C in the notation audit: backward-compatibility parser, deliberately retained.)
 */
const LEGACY_DIRECTIONAL = {
  EI: { low: 'I', high: 'E' },
  TC: { low: 'C', high: 'T' },
  SR: { low: 'R', high: 'S' },
  DM: { low: 'M', high: 'D' },
};

/** Every canonical label for an axis, low→high. */
function labelsFor(axis) {
  if (!AXIS_NAMES.includes(axis)) return [];
  const out = [];
  for (let n = 1; n <= 9; n++) {
    if (n === 5 && !HAS_NEUTRAL[axis]) continue;   // TC5 stays retired
    out.push(axis + n);
  }
  return out;
}

/** Is `label` canonical for `axis`? Full axis prefix only. */
function isValid(axis, label) {
  return labelsFor(axis).includes(label);
}

/** Numeric score for a canonical label. null if not canonical. */
function numericOf(axis, label) {
  if (!isValid(axis, label)) return null;
  return parseInt(String(label).slice(axis.length), 10);
}

/**
 * ★ CANONICAL FORMATTER — the only sanctioned way to WRITE a score label.
 *   formatScore('EI', 4) → 'EI4'   ·   formatScore('DM', 7) → 'DM7'
 * Throws for TC 5 rather than inventing a retired tier.
 */
function formatScore(axis, numeric) {
  if (!AXIS_NAMES.includes(axis)) throw new Error(`unknown axis '${axis}'`);
  const n = Number(numeric);
  if (!Number.isInteger(n) || n < 1 || n > 9) throw new Error(`numeric score out of range: ${numeric}`);
  if (n === 5 && !HAS_NEUTRAL[axis]) {
    throw new Error(`axis ${axis} has no canonical Neutral — TC5 is frozen-retired ` +
      `(G8 / G-TC1 / G-TC14 / G-TC15). Full-prefix restoration does NOT reintroduce it.`);
  }
  return axis + n;
}

/** True for the axis Neutral label (EI5 · SR5 · DM5). TC never has one. */
function isNeutral(axis, label) {
  return HAS_NEUTRAL[axis] && label === axis + '5';
}

/** Directional side by NUMERIC POSITION: 'low' (1–4) | 'neutral' (5) | 'high' (6–9) | null. */
function sideOf(axis, label) {
  const n = numericOf(axis, label);
  if (n === null) return null;
  if (n === 5) return 'neutral';
  return n < 5 ? 'low' : 'high';
}

// ══ LEGACY READ COMPATIBILITY (Class C) ══════════════════════════════════════════════════════
// ⛔ Accepting a legacy label is NOT permission to keep writing one. Every governed write and
//    every migrated ACTIVE record must emit the full-prefix form.

/** Is `label` a legacy one-letter directional label for `axis`? */
function isLegacyLabel(axis, label) {
  const d = LEGACY_DIRECTIONAL[axis];
  if (!d || typeof label !== 'string') return false;
  const m = /^([A-Z])([1-9])$/.exec(label);
  if (!m) return false;
  const [, letter, num] = m;
  const n = Number(num);
  if (letter === d.low) return n >= 1 && n <= 4;
  if (letter === d.high) return n >= 6 && n <= 9;
  return false;
}

/**
 * Normalize ANY accepted historical form to the canonical full-prefix label.
 *   'C4' → 'TC4'  ·  'T7' → 'TC7'  ·  'S5' → 'SR5'  ·  'EI5' → 'EI5'  ·  5 → 'EI5'
 * Returns null when the input cannot be resolved for that axis.
 * ⛔ NOTATION ONLY — the numeric value is never altered.
 */
function normalize(axis, label) {
  if (!AXIS_NAMES.includes(axis)) return null;
  if (isValid(axis, label)) return label;                       // already canonical
  if (label === 5 || label === '5') return safeNeutral(axis);   // bare 5
  if (isLegacyLabel(axis, label)) return formatScore(axis, Number(String(label).slice(1)));
  // legacy DIRECTIONAL-NEUTRAL (E5/I5/T5/C5/S5/R5/D5/M5): always illegal as a label, but the
  // numeric 5 is unambiguous, so it resolves to the axis Neutral rather than being discarded.
  const m = /^([A-Z])5$/.exec(String(label));
  if (m) {
    const d = LEGACY_DIRECTIONAL[axis];
    if (d && (m[1] === d.low || m[1] === d.high)) return safeNeutral(axis);
  }
  return null;
}
function safeNeutral(axis) {
  if (!HAS_NEUTRAL[axis]) {
    throw new Error(`axis ${axis} has no canonical Neutral label — TC5 is frozen-retired ` +
      `(G8 / G-TC1 / G-TC14 / G-TC15). A TC 5 requires CEO adjudication, not migration.`);
  }
  return axis + '5';
}

/** Back-compat alias: bare 5 → axis Neutral. Superseded by normalize(). */
function migrateNeutral(axis, label) {
  if (label !== '5' && label !== 5) return label;
  return safeNeutral(axis);
}

/** Legacy directional labels, enumerated so tests can assert canonical rejection. */
const LEGACY_LABELS = AXIS_NAMES.flatMap(a => {
  const d = LEGACY_DIRECTIONAL[a];
  return [1, 2, 3, 4].map(n => d.low + n).concat([6, 7, 8, 9].map(n => d.high + n));
});
/** Directional-Neutral labels — illegal under BOTH conventions. */
const ILLEGAL_NEUTRAL_LABELS = ['E5', 'I5', 'T5', 'C5', 'S5', 'R5', 'D5', 'M5'];

module.exports = {
  AXIS_NAMES, HAS_NEUTRAL, LEGACY_DIRECTIONAL,
  labelsFor, isValid, numericOf, formatScore, isNeutral, sideOf,
  isLegacyLabel, normalize, migrateNeutral,
  LEGACY_LABELS, ILLEGAL_NEUTRAL_LABELS,
  // ⚠ `AXES` retained for older consumers that only read axis membership.
  AXES: { EI: { neutral: 'EI5' }, TC: { neutral: null }, SR: { neutral: 'SR5' }, DM: { neutral: 'DM5' } },
};
