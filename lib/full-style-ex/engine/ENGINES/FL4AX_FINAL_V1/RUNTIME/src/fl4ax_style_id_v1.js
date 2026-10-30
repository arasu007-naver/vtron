'use strict';
/**
 * STMX Full-Look Four-Axis — canonical Style ID resolver (Direction mapping only; no presentation metadata).
 * Order EI → TC → SR → DM; letters E/I · T/C · S/R · D/M (CEO Direction-Code contract 2026-09-28 AXIS_ORDER / SIDE_LETTERS; FL4AX order §5).
 * Pure: no I/O, no image, no GT, no scoring adjustment. Accepts the engine labels or the letters; anything else is refused (never a default letter).
 */
const AXIS_ORDER = Object.freeze(['EI', 'TC', 'SR', 'DM']);
const LETTERS = Object.freeze({ EI: Object.freeze(['E', 'I']), TC: Object.freeze(['T', 'C']), SR: Object.freeze(['S', 'R']), DM: Object.freeze(['D', 'M']) });
const LABEL_TO_LETTER = Object.freeze({ EI: { EXPRESSIVE: 'E', INTROVERT: 'I', E: 'E', I: 'I' }, TC: { TRANSFORMATIVE: 'T', CLASSIC: 'C', T: 'T', C: 'C' }, SR: { STRUCTURED: 'S', RELAXED: 'R', S: 'S', R: 'R' }, DM: { DETAIL: 'D', MINIMAL: 'M', D: 'D', M: 'M' } });
const STYLE_IDS = Object.freeze(LETTERS.EI.flatMap((e) => LETTERS.TC.flatMap((t) => LETTERS.SR.flatMap((s) => LETTERS.DM.map((d) => e + t + s + d)))));   // 16, canonical order
class StyleIdError extends Error { constructor(axis, value) { super('INVALID_DIRECTION_ENUM: ' + axis + ' = ' + JSON.stringify(value)); this.code = 'INVALID_DIRECTION_ENUM'; this.axis = axis; } }
const letterOf = (axis, v) => { const m = LABEL_TO_LETTER[axis]; if (typeof v !== 'string' || !Object.prototype.hasOwnProperty.call(m, v)) throw new StyleIdError(axis, v); return m[v]; };
/** resolveStyleId(ei, tc, sr, dm) → one of the 16 canonical Style IDs, e.g. 'ETSD'. Throws StyleIdError on any non-binary / unknown value. */
function resolveStyleId(ei, tc, sr, dm) { const code = [ei, tc, sr, dm].map((v, i) => letterOf(AXIS_ORDER[i], v)).join(''); if (!STYLE_IDS.includes(code)) throw new StyleIdError('STYLE_ID', code); return code; }
module.exports = { AXIS_ORDER, LETTERS, STYLE_IDS, resolveStyleId, letterOf, StyleIdError };
