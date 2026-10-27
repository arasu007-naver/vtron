'use strict';
/**
 * Valid Expressive Evidence (order §9). Every pathway reads only the packet; each item in the result names the packet field it came from.
 *   F  colour field     Expressive-base garment field, not Contextual for that garment (EI-DEC-2 colour-first · T-E-ANY)
 *   AF accessory field  Expressive colour forming the field of a worn accessory (scarf / wrap / headwear …; accessories have no Registry row)
 *   PT colour point     Expressive · Distinct against the look · carrier known and not Contextual · not closure / pocket · not metal hardware (EI-DEC-1)
 *   PG pattern          SVP-121 observed and ≥ 1 pattern-carried colour Distinct against the base (EI-DEC-2; Tonal / Subtle never qualifies)
 *   GR graphic          SVP-122 = Dominant and ≥ 1 graphic-carried colour Distinct (Localized never qualifies)
 *   EX exposure         Class A region · attribution item_intrinsic (garment-intrinsic) or realized_state (styling-created) · ≥ 1 carrier (EI-DEC-3)
 * Pattern / graphic-carried colours are absorbed into PG / GR and never counted as points (no double counting). Surface force is not provable from the
 * frozen transport (P3 realization facts absent; token names never fix force) → surface never qualifies alone; it is reported.
 * Nothing here counts, weighs or averages: the resolver needs only "at least one".
 *
 * V1_R1 corrections (CEO case adjudications 2026-10-25; each removes one over-admission found in V1, none reads a look id, GT or image):
 *   ACC-1  an accessory colour point in white_family or camel without a metallic effect does not by itself clearly stand out (M178 tan suede shoes ·
 *          M210 standard white pocket square · DE-2 "a difference alone is not qualifying"); fields and garment points are unchanged
 *   ACC-2  an eyewear frame or a watch case is functional metal, like the V1 metal-hardware exclusion (M178 sunglasses frame)
 *   EX-1   a Chest / Décolletage event carried only by Shirts, realized_state, with no other realized_state Class A event on the same shirt = the ordinary
 *          collar / neckline opening of shirt wear (F065 · F258); a shirt opened beyond the collar stays styling-created (EI-DEC-3)
 *   EX-2   an Upper Thigh event carried only by Trousers (shorts) = ordinary leg visibility (F258)
 * Every excluded item stays in not_qualifying with its rule id, so the trace shows what was observed and why it is not a basis.
 *
 * V1_R2 corrections (CEO pocket-square clarification 2026-10-25; order §3 – §7). R1's ACC-1 / ACC-2 were vetoes by colour family / part name; R2 keeps the
 * same ids but judges the styling role from facts already in the packet, so a white / camel accent or a metal ornament can still qualify:
 *   ACC-1  (R2) a white_family / camel non-metallic point on a FUNCTIONAL accessory (footwear · hosiery · bag · belt · eyewear · headwear · gloves · watch) is an
 *          ordinary colour difference unless the packet shows a styling role: an ornamental accessory (jewellery other than a watch · brooch · scarf / pocket
 *          square), a designed accent part (attachment other than hardware · embroidery · trim · piping · sequin-beading) or an observed decorative detail /
 *          ornament attachment on that component (SVP-125 · SVP-126)
 *   ACC-2  (R2) functional metal (Metal Hardware · Buckle · eyewear Frame · watch Case) is not an accent by presence; it qualifies when the same component carries an
 *          observed SVP-126 Jewelry Attachment (designed metal ornamentation)
 *   PS-1   a pocket square that completes a conventional formal setup — a Tailored Jacket and a Trouser in the same field colour, a bow tie, and the square in the
 *          shirt's observed colour family — is not an independent qualifying point (contribution ≠ qualifying point); a square counts as an accent only when an
 *          observed fact shows it is not such a completion; if the context is not observed its role is NOT ESTABLISHED and it is not counted (nothing assumed,
 *          a missing fact never creates E); every other component is still assessed normally
 *
 * V1_R3 corrections (order STMX FULL-LOOK EI V1_R3 §4 – §9; same rule ids, rules re-grounded; nothing reads a look id, GT or image):
 *   Evidence set   the frozen Phase 2 Surface / Material / Decorative canonical (CEO 2026-08-01), read through the frozen Vision release's own value → class map
 *                  (PHASE2_CLASS below = COVERAGE_EVIDENCE_MAP of producer_rules_v1.js, pinned by hash; the suite checks the transcription). Only the
 *                  D02 – D04 ornament classes (applied embellishment · 3D attached objects · fringe) support a point: D01 Metal Hardware is not evidence by
 *                  presence (D01 excludes a functional zipper / button / small buckle) and the S-class surfaces stay unprovable in force (frozen V1 rule above).
 *                  Standalone Embroidery (Phase 2 D5 REJECTED) and Piping are not evidence.
 *   PS-1   (R3) the CEO's conventional formal completion, read from three observed facts about the square itself and its setup: (a) the square shows NO
 *          expressive effect of its own (no metallic effect · no Distinct pattern colour · no Dominant graphic · no D02 – D04 ornament) · (b) it adds no colour
 *          of its own (its colour family is an observed shirt colour) · (c) the bow tie of the formal setup is registered. All three observed → the square is
 *          not an independent qualifying point. Any of them observed otherwise → completion not established and the square is judged ONLY by the governed
 *          point rule (Expressive colour · Distinct · known carrier); PS-1 qualifies nothing. A needed fact not observed → role undetermined → not counted
 *          (no conventional finding and no expressive finding is recorded; a missing fact never creates E). The R2 matched-suit fact is removed (no outfit-
 *          type classifier). Size, fold, prominence and intent are not in the packet and are not used.
 *   ACC-1  (R3) a white_family / camel non-metallic point on any accessory (no category is qualified or excluded by itself; pocket squares follow PS-1) is
 *          an ordinary colour difference unless the colour is carried by an observed ornament: the point sits on a D02 – D04 part, or (whole-item colour)
 *          the same component carries an observed D02 – D04 value. Colour on a functional / non-ornament part does not take over component evidence.
 *   ACC-2  (R3) functional metal (Metal Hardware · Buckle · eyewear Frame · watch Case) qualifies only when the same component carries an observed D02
 *          Applied Embellishment (Jewelry Attachment · Sequin-Beading · Appliqué); no DM Detail status is read.
 */
const CB = require('./fl_ei_colour_base_v1.js');
const CLASS_A = Object.freeze(['Shoulder', 'Chest / Décolletage', 'Midriff / Waist', 'Back', 'Upper Thigh']);
const ACCESSORY_FIELD_OK = (c) => c && c.identity !== 'UNKNOWN' && !CB.GARMENT.includes(c.identity);
const ACC1_COLOURS = Object.freeze(['white_family', 'camel']);
/* [R3] frozen value → Phase 2 class map (transcribed; never a force, never a direction) */
const PHASE2_CLASS = Object.freeze({
  surface: Object.freeze({ 'Transparent': 'S08', 'Semi Transparent': 'S08', 'Mesh': 'S08', 'Reflective': 'S03', 'Glossy': 'S03', 'Textured Knit': 'S01', 'Exotic-Skin': 'S02', 'Quilted': 'S05', 'Treated Surface': 'S06/S07', 'Pleated': 'S09', 'Lace': 'S10' }),
  material: Object.freeze({ 'Fur': 'S04' }),
  decorative_detail: Object.freeze({ 'Sequin-Beading': 'S03/D02', 'Appliqué': 'D02/D03' }),
  attachment: Object.freeze({ 'Metal Hardware': 'D01', 'Jewelry Attachment': 'D02', 'Feather': 'D03', 'Ribbon': 'D03', 'Fringe': 'D04', 'Fur Trim': 'S04' }) });
const classOf = (family, v) => (PHASE2_CLASS[family] || {})[v] || null;
const isOrnamentClass = (cls) => /D0[234]/.test(cls || '');
const isD02 = (cls) => /D02/.test(cls || '');
const partClass = (part) => (part ? classOf('decorative_detail', part) || classOf('attachment', part) : null);
const isAccessory = (c) => c && c.identity !== 'UNKNOWN' && !CB.GARMENT.includes(c.identity);
const isWatch = (c) => !!c && (c.identity === 'watch' || c.subtype === 'watch');
const isSquare = (c) => !!c && c.subtype === 'pocket_square';
const isFunctionalMetal = (c, part) => !!part && (/Metal Hardware|Buckle/.test(part) || (!!c && c.identity === 'eyewear' && part === 'Frame') || (isWatch(c) && part === 'Case'));
const listOf = (cell) => (cell && cell.state === 'OBSERVED' ? [].concat(cell.value) : []);
function collect(L) {
  const byRef = Object.fromEntries(L.comps.map((c) => [c.ref, c])); const bases = [], notQualifying = [], absorbed = [], diagnostics = [], grounds = [];
  const id = (c) => (c ? c.identity + (c.subtype ? '/' + c.subtype : '') : '?');
  /* [R3] observed D02 – D04 ornament values on a component (SVP-125 decorative detail · SVP-126 attachment) */
  const ornamentsOn = (ref, pick) => [['SVP-125', 'decorative_detail'], ['SVP-126', 'attachment']].flatMap(([s, fam]) => listOf(L.cell(s + '@' + ref)).filter((v) => pick(classOf(fam, v))).map((v) => v + ' = ' + classOf(fam, v)));
  /* [R3] PS-1 facts — observed facts only; true / false / null (= not observed) */
  const fieldColours = (ref) => L.colour.field.filter((f) => (f.carrier_refs || []).includes(ref)).map((f) => f.color_family);
  const shirts = L.comps.filter((c) => c.identity === 'Shirt').map((c) => c.ref);
  const shirtColours = [...new Set(shirts.flatMap(fieldColours).concat(L.colour.points.filter((q) => q.carrier_ref && shirts.includes(q.carrier_ref.value) && !q.carrier_part).map((q) => q.color_family)))];
  const bowTie = L.comps.some((c) => c.identity === 'tie' && c.subtype === 'bow_tie') ? true : L.comps.some((c) => c.identity === 'UNKNOWN' || (c.identity === 'tie' && !c.subtype)) ? null : false;
  const ownEffect = (q, c) => {   /* (a) the square's own expressive effect: 'EFFECT' · 'NONE' · null */
    const found = [], open = []; const own = L.colour.points.filter((p) => p.carrier_ref && p.carrier_ref.value === c.ref && p.carrier_part && ['pattern', 'graphic'].includes(p.carrier_part.carrier_kind));
    if (q.color_effect === 'metallic') found.push('metallic colour effect'); else if (!q.color_effect) open.push('colour effect');
    const pat = L.cell('SVP-121@' + c.ref), gr = L.cell('SVP-122@' + c.ref);
    if (pat && pat.state === 'OBSERVED') { const pc = own.filter((p) => p.carrier_part.carrier_kind === 'pattern'); if (pc.some((p) => p.contrast_with_field === 'Distinct')) found.push('Distinct pattern colour'); else if (!pc.length) open.push('pattern colour'); } else if (!pat || pat.state !== 'ABSENT') open.push('pattern');
    if (gr && gr.state === 'OBSERVED') { if (gr.value === 'Dominant' && own.some((p) => p.carrier_part.carrier_kind === 'graphic' && p.contrast_with_field === 'Distinct')) found.push('Dominant graphic'); } else if (!gr || gr.state !== 'ABSENT') open.push('graphic');
    const orn = ornamentsOn(c.ref, isOrnamentClass); if (orn.length) found.push('ornament ' + orn.join(', '));
    for (const s of ['SVP-125', 'SVP-126']) { const x = L.cell(s + '@' + c.ref); if (!x || !['OBSERVED', 'ABSENT'].includes(x.state)) open.push(s === 'SVP-125' ? 'decorative detail' : 'attachment'); }
    return found.length ? { v: 'EFFECT', why: found.join(' · ') } : open.length ? { v: null, why: open.join(' · ') + ' not observed' } : { v: 'NONE' }; };
  const squareRole = (q, c) => { const a = ownEffect(q, c); const b = shirtColours.length ? shirtColours.includes(q.color_family) : null;
    const against = [a.v === 'EFFECT' && 'own expressive effect observed (' + a.why + ')', b === false && 'square adds a colour of its own (' + q.color_family + ' ≠ shirt ' + shirtColours.join('/') + ')', bowTie === false && 'no bow tie registered'].filter(Boolean);
    if (against.length) return { role: 'NOT_COMPLETION', why: against.join(' · ') };
    if (a.v === 'NONE' && b === true && bowTie === true) return { role: 'COMPLETION' };
    return { role: 'UNDETERMINED', why: [a.v === null && 'own effect: ' + a.why, b === null && 'shirt colour not observed', bowTie === null && 'bow tie not established (a tie subtype or a component identity is UNKNOWN)'].filter(Boolean).join(' · ') }; };
  /* F / AF — colour fields */
  for (const f of L.colour.field) for (const r of f.carrier_refs || []) {
    const c = byRef[r]; const it = CB.interpret(f.color_family, c);
    const ground = { ref: r, component: id(c), token: f.color_family, lightness: f.color_lightness, base: it.base, contextual: it.contextual };
    if (c && CB.GARMENT.includes(c.identity)) { grounds.push(ground); if (it.e_capable) bases.push({ pathway: 'F', ref: r, component: id(c), evidence: f.color_family + ' field', source: 'colour_composition.field', authority: 'EI-DEC-2 colour-first · T-E-ANY' }); else notQualifying.push({ pathway: 'F', ref: r, item: f.color_family + ' field on ' + id(c), why: it.note || (it.base === 'NON_EXPRESSIVE' ? 'Non-Expressive base' : 'not readable') }); }
    else if (ACCESSORY_FIELD_OK(c)) { if (it.e_capable) bases.push({ pathway: 'AF', ref: r, component: id(c), evidence: f.color_family + ' accessory field', source: 'colour_composition.field', authority: 'EI-DEC-1 (scarf / wrap / accessory)' }); else notQualifying.push({ pathway: 'AF', ref: r, item: f.color_family + ' field on ' + id(c), why: it.base === 'NON_EXPRESSIVE' ? 'Non-Expressive colour' : (it.note || 'not readable') }); }
    else { grounds.push(ground); if (it.e_capable) bases.push({ pathway: 'F', ref: r, component: id(c), evidence: f.color_family + ' field (identity UNKNOWN)', source: 'colour_composition.field', authority: 'EI-DEC-2 · ' + it.note }); else diagnostics.push({ kind: 'IDENTITY_UNKNOWN_FIELD', ref: r, detail: it.note || (f.color_family + ' ' + it.base) }); }
  }
  /* PT — colour points; pattern / graphic carried points are absorbed */
  for (const q of L.colour.points) {
    const r = q.carrier_ref && q.carrier_ref.value; const c = byRef[r]; const kind = q.carrier_part && q.carrier_part.carrier_kind; const part = q.carrier_part && q.carrier_part.carrier_ref;
    if (kind === 'pattern' || kind === 'graphic') { absorbed.push({ ref: r, kind, family: q.color_family, contrast: q.contrast_with_field }); continue; }
    const why = []; const it = CB.interpret(q.color_family, c);
    if (!c || c.identity === 'UNKNOWN') why.push('carrier identity UNKNOWN');
    if (q.contrast_with_field !== 'Distinct') why.push('contrast ' + (q.contrast_with_field || 'not recorded') + ' (not Distinct)');
    if (it.base !== 'EXPRESSIVE') why.push(q.color_family + ' ' + (it.base === 'NON_EXPRESSIVE' ? 'Non-Expressive' : 'not readable'));
    if (it.contextual) why.push(q.color_family + ' Contextual for ' + id(c));
    if (kind === 'closure' || kind === 'pocket') why.push('closure / pocket colour');
    const rules = []; let route = null, roleNote = null;
    if (isFunctionalMetal(c, part)) {   /* ACC-2 (R3) */
      const d02 = c ? ornamentsOn(c.ref, isD02) : [];
      if (d02.length) route = 'ACC-2 ornament route: functional metal on a component with an observed D02 Applied Embellishment (' + d02.join(', ') + ')';
      else if (/Metal Hardware|Buckle/.test(part)) why.push(c && ['belt', 'bag'].includes(c.identity) ? 'functional hardware' : 'metal hardware');
      else if (!why.length) { why.push('functional metal part (' + id(c) + ' ' + part + ') with no observed D02 embellishment — not a standalone accent'); rules.push('ACC-2'); }
    }
    if (!why.length && !route && isAccessory(c) && !isSquare(c) && ACC1_COLOURS.includes(q.color_family) && q.color_effect !== 'metallic') {   /* ACC-1 (R3) */
      const pc = partClass(part); const orn = part ? [] : ornamentsOn(c.ref, isOrnamentClass);
      if (part && isOrnamentClass(pc)) route = 'ACC-1 ornament route: colour carried by a decorative element (' + part + ' = ' + pc + ')';
      else if (!part && orn.length) route = 'ACC-1 ornament route: the component is an observed ornamented element (' + orn.join(', ') + ')';
      else { why.push(q.color_family + ' (non-metallic) colour difference on an accessory ' + (part ? 'part ' + part + ' that is not a D02 – D04 ornament' : 'with no observed D02 – D04 ornament') + ' — a difference alone is not qualifying (accessory category not used)'); rules.push('ACC-1'); }
    }
    if (!why.length && isSquare(c)) { const sr = squareRole(q, c);   /* PS-1 (R3) */
      if (sr.role === 'COMPLETION') { why.push('conventional formal-setup completion: no own expressive effect observed · no colour of its own (square in the observed shirt colour) · worn with the bow tie of the formal setup — a limited contribution, not an independent qualifying point'); rules.push('PS-1'); }
      else if (sr.role === 'UNDETERMINED') { why.push('pocket-square role undetermined (' + sr.why + ') — not counted as a qualifying point; no conventional and no expressive finding recorded'); rules.push('PS-1'); }
      else roleNote = 'PS-1: conventional completion not established (' + sr.why + ') — admitted by the governed point rule only (Expressive colour · Distinct · known carrier)'; }
    const item = q.color_family + ' point on ' + id(c) + (kind ? ' [' + kind + (part ? ': ' + part : '') + ']' : '');
    if (why.length) notQualifying.push(Object.assign({ pathway: 'PT', ref: r, item, why: why.join('; ') }, rules.length ? { rule: rules.join('+') } : {})); else bases.push(Object.assign({ pathway: 'PT', ref: r, component: id(c), evidence: item + ' · Distinct', source: 'colour_composition.points', authority: 'EI-DEC-1 · DE-2' }, route ? { qualification: route } : {}, roleNote ? { role_note: roleNote } : {}));
  }
  for (const q of L.colour.partial) diagnostics.push({ kind: 'COLOUR_PARTIAL', ref: q.carrier_ref, detail: q.color_family + ' ' + q.role + ' unresolved: ' + (q.unresolved || []).join(', ') });
  for (const u of L.colour.unreadable) diagnostics.push({ kind: 'COLOUR_UNREADABLE', ref: u.carrier_ref, detail: 'colour ' + (u.state || 'UNKNOWN') });
  /* PG / GR — pattern and graphic */
  for (const c of L.comps) {
    const pat = L.cell('SVP-121@' + c.ref), gr = L.cell('SVP-122@' + c.ref); const own = absorbed.filter((a) => a.ref === c.ref);
    if (pat && pat.state === 'OBSERVED') { const pc = own.filter((a) => a.kind === 'pattern'); const d = pc.filter((a) => a.contrast === 'Distinct');
      if (d.length) bases.push({ pathway: 'PG', ref: c.ref, component: id(c), evidence: pat.value + ' pattern · ' + d.map((a) => a.family + ' Distinct').join(', '), source: 'SVP-121 + pattern-carried points', authority: 'EI-DEC-2' });
      else notQualifying.push({ pathway: 'PG', ref: c.ref, item: pat.value + ' pattern on ' + id(c), why: pc.length ? 'pattern colours ' + pc.map((a) => a.family + ' ' + a.contrast).join(', ') + ' — subtle / tonal, not E by presence (EI-DEC-2)' : 'no pattern-carried colour recorded (contrast not transported) — presence alone is not E' }); }
    else if (pat && /UNKNOWN|NOT_VISIBLE/.test(pat.state)) diagnostics.push({ kind: 'PATTERN_NOT_OBSERVED', ref: c.ref, detail: 'SVP-121 ' + pat.state });
    if (gr && gr.state === 'OBSERVED') { const gc = own.filter((a) => a.kind === 'graphic'); const d = gc.filter((a) => a.contrast === 'Distinct');
      if (gr.value === 'Dominant' && d.length) bases.push({ pathway: 'GR', ref: c.ref, component: id(c), evidence: 'Dominant graphic · ' + d.map((a) => a.family + ' Distinct').join(', '), source: 'SVP-122 + graphic-carried points', authority: 'EI-DEC-2' });
      else notQualifying.push({ pathway: 'GR', ref: c.ref, item: gr.value + ' graphic on ' + id(c), why: gr.value !== 'Dominant' ? 'Localized graphic (small motif / logo) — not E by presence' : 'Dominant graphic without a Distinct graphic colour recorded' }); }
    const surf = L.cell('SVP-123@' + c.ref); if (surf && surf.state === 'OBSERVED') diagnostics.push({ kind: 'SURFACE_REPORTED', ref: c.ref, detail: [].concat(surf.value).join(', ') + ' — STRONG not provable from the frozen transport; not an E basis alone' });
  }
  /* EX — exposure (Class A only; Class B never) */
  const events = (L.exposure && L.exposure.events) || []; const attrOf = (e) => (e.attribution && e.attribution.state === 'OBSERVED' ? e.attribution.value : 'UNKNOWN');
  const onlyIdentity = (e, ident) => (e.carrier_refs || []).length > 0 && e.carrier_refs.every((r) => byRef[r] && byRef[r].identity === ident);
  for (const e of events) {
    const attr = attrOf(e); const carriers = (e.carrier_refs || []).map((r) => r + ':' + id(byRef[r]));
    const item = e.region + ' · ' + (carriers.join('+') || 'no carrier') + ' · ' + attr;
    if (!CLASS_A.includes(e.region)) { notQualifying.push({ pathway: 'EX', item, why: 'Class B designed opening — no EI mapping (frozen two-class architecture)' }); continue; }
    if (e.state && e.state !== 'OBSERVED') { diagnostics.push({ kind: 'EXPOSURE_NOT_OBSERVED', detail: item }); continue; }
    if (!carriers.length) { notQualifying.push({ pathway: 'EX', item, why: 'no carrier recorded — garment-intrinsic or styling-created cannot be established' }); continue; }
    if (e.region === 'Chest / Décolletage' && attr === 'realized_state' && onlyIdentity(e, 'Shirt') && !events.some((o) => o !== e && CLASS_A.includes(o.region) && attrOf(o) === 'realized_state' && (o.carrier_refs || []).some((r) => e.carrier_refs.includes(r)))) { notQualifying.push({ pathway: 'EX', item, why: 'ordinary shirt collar / neckline opening — not Expressive exposure (shirt not opened beyond the collar)', rule: 'EX-1' }); continue; }
    if (e.region === 'Upper Thigh' && onlyIdentity(e, 'Trouser')) { notQualifying.push({ pathway: 'EX', item, why: 'ordinary leg visibility of shorts — not Expressive exposure', rule: 'EX-2' }); continue; }
    if (attr === 'item_intrinsic') bases.push({ pathway: 'EX', ref: e.carrier_refs[0], component: carriers.join('+'), evidence: e.region + ' · garment-intrinsic exposure', source: 'canonical_exposure.events', authority: 'EI-DEC-3 · frozen Class A' });
    else if (attr === 'realized_state') bases.push({ pathway: 'EX', ref: e.carrier_refs[0], component: carriers.join('+'), evidence: e.region + ' · styling-created exposure', source: 'canonical_exposure.events', authority: 'EI-DEC-3 · frozen Class A' });
    else notQualifying.push({ pathway: 'EX', item, why: 'attribution UNKNOWN — cannot exclude ordinary / pose exposure (EI-DEC-3)' });
  }
  for (const h of (L.exposure && L.exposure.hidden) || []) diagnostics.push({ kind: 'EXPOSURE_HIDDEN', ref: h.carrier_ref, detail: h.item_value + ' ' + h.state });
  return { bases, not_qualifying: notQualifying, absorbed, diagnostics, grounds };
}
module.exports = { CLASS_A, ACC1_COLOURS, PHASE2_CLASS, collect };
