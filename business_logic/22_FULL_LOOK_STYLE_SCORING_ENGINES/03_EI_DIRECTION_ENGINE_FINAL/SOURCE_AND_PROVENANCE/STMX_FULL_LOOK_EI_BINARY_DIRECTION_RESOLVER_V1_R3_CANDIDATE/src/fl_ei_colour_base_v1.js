'use strict';
/**
 * Colour interpretation (order §4 · §8). Reads the observed Colour V1 token as given (never re-classified, never mutated) and applies the frozen semantics:
 *   Base Character (Registry V3 `base_character`) — lightness never changes it (EI-X-D9);
 *   Contextual colour: the Registry V3 row for the garment category × product context (grammar · material · trouser distinction) names the colours that
 *   both orientations commonly wear on that garment; such a colour contributes no E. This is the ONLY use of the Registry (firewall: never a Neutral output).
 * The row selection reproduces the sealed k2 neutralOf() (SGC) line for line.
 */
const A = require('./fl_ei_authority_v1.js');
const EXPRESSIVE = new Set(A.REG.base_character.EXPRESSIVE), NON_EXPRESSIVE = new Set(A.REG.base_character.NON_EXPRESSIVE);
const GARMENT = Object.freeze(['T-Shirt', 'Shirt', 'Sweater', 'Sweatshirt', 'Jacket', 'Coat', 'Trouser', 'Skirt', 'Dress', 'Jumpsuit']);
/* colours the Registry can make Contextual in SOME row — only these depend on knowing the garment category */
const REGISTRY_COLOURS = new Set(A.REG.rows.flatMap((r) => r.neutral_colors));
function baseCharacter(token) { return EXPRESSIVE.has(token) ? 'EXPRESSIVE' : NON_EXPRESSIVE.has(token) ? 'NON_EXPRESSIVE' : 'NOT_READABLE'; }   // 'uncertain' / absent → not readable
function contextualColours(c) {
  const rows = A.REG.rows.filter((r) => r.category === c.identity); if (!rows.length) return []; const pick = (pred) => rows.find(pred);
  if (c.identity === 'Jacket') { const mat = [].concat(c.material || []); const r = (c.grammar === 'Tailored' && pick((x) => x.context === 'Tailored')) || (mat.some((m) => /Leather|Suede/.test(m)) && pick((x) => /Leather/.test(x.context))) || (mat.some((m) => /Denim/.test(m)) && pick((x) => x.context === 'Denim')) || pick((x) => /ALL OTHER/.test(x.context)); return r.neutral_colors; }
  if (c.identity === 'Trouser') { const m = { Tailored: 'Tailored', Jeans: 'Jeans', Sport: 'Sweatpants / Jogger', Leggings: 'Leggings' }[c.trouser_distinction]; const r = (m && pick((x) => x.context === m)) || pick((x) => /General Casual/.test(x.context)); return r.neutral_colors; }
  if (c.identity === 'T-Shirt') return pick((x) => /all, incl/.test(x.context)).neutral_colors;
  return rows[0].neutral_colors;
}
/** interpret one observed colour on one component → { token, base, contextual, e_capable, note } */
function interpret(token, comp) {
  const base = baseCharacter(token); if (base === 'NOT_READABLE') return { token, base, contextual: false, e_capable: false, note: 'token not a readable family (' + token + ')' };
  if (!comp || comp.identity === 'UNKNOWN') {
    /* identity unknown: the Registry row cannot be chosen. An Expressive colour that no Registry row can make Contextual is E-capable regardless of category;
       an Expressive colour that some row can neutralise (white_family · blue) stays undetermined (reported, contributes nothing). */
    if (base === 'EXPRESSIVE' && !REGISTRY_COLOURS.has(token)) return { token, base, contextual: false, e_capable: true, note: 'identity UNKNOWN; ' + token + ' is Contextual in no Registry row' };
    return { token, base, contextual: null, e_capable: false, note: 'identity UNKNOWN; Registry context undeterminable for ' + token };
  }
  const ctx = GARMENT.includes(comp.identity) ? contextualColours(comp).includes(token) : false;   /* accessories have no Registry row → Base Character only */
  return { token, base, contextual: ctx, e_capable: base === 'EXPRESSIVE' && !ctx, note: ctx ? token + ' is Contextual for ' + comp.identity + ' (Registry V3)' : null };
}
module.exports = { EXPRESSIVE, NON_EXPRESSIVE, GARMENT, REGISTRY_COLOURS, baseCharacter, contextualColours, interpret };
