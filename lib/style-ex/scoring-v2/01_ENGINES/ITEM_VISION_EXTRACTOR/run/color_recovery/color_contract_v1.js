/**
 * STMX VISION — COLOR EXTRACTION CONTRACT V1 (implementation module).
 * Authority: STMX_VISION_COLOR_EXTRACTION_CONTRACT_V1.md (CEO-approved architecture).
 * Scope: SEPARATE additive Color layer ONLY. Frozen-40 / Garment Producer / EI scoring / DM / engine untouched.
 *
 * Canonical Color V1 composition source of truth = primary_color_family + additional_colors[] (0..N).
 * secondary_color_family / secondary_color_present are REMOVED from the canonical shape (CEO 2026-08-15,
 * Secondary-Deprecation order). No single-secondary concept, no G-2 selection logic. If a legacy boolean is
 * ever needed it is derived at an integration/adapter layer as (additional_colors.length > 0) — NOT here.
 *
 * NOT authorized here: EI Neutral Registry, isColorNeutral, EI/DM/engine scoring, gold/silver neutral status.
 */
'use strict';

// 19 base families + gold + silver (CEO-approved independent families) + uncertain. Mirror of EI canonical COLOR_FAMILY.
const FAMILIES = ['black','white_family','gray','navy','blue','red','pink','yellow','orange','green','purple','brown','camel','beige','khaki','mint','wine','olive','gold','silver','uncertain'];

// carrier_kind references EXISTING owning observations (Color owns the relation, not the taxonomy).
// 'generic_descriptor' is used ONLY where no canonical owner exists.
const CARRIER_KINDS = ['closure','attachment','graphic','pattern','pocket','material_component','generic_descriptor'];

// Relational-only descriptors permitted when no canonical owner exists.
// NOT a canonical garment vocabulary — warn-only (see validateColorObservation). Do not treat as an enum authority.
const GENERIC_DESCRIPTORS = ['Piping','Collar','Cuff','Waistband','Panel','Strap'];

const LIGHTNESS = ['light','normal','dark'];
// Relational contrast between an additional colour and the garment body (CEO 2026-09-05 · §6 · §7).
//   ⛔ EXACTLY THREE VALUES — the established EI contrast terms, not new vocabulary.
const CONTRAST_WITH_BODY = ['Tonal', 'Subtle', 'Distinct'];
const USAGE = ['single','subtle','accent','multi'];
const EFFECT = ['none','neon','metallic'];

// Obsolete fields that MUST NOT appear in canonical Color V1 output (rejected by the validator).
const OBSOLETE_FIELDS = ['secondary_color_family','secondary_color_present','secondary_color_family_g2_pending'];
// Rejected draft additional-color sub-fields (Color-owned extent/placement/surface duplication).
const REJECTED_AC_FIELDS = ['extent','placement','percentage','geometry','surface_ref','region'];

const COLOR_PROMPT = `You are extracting ONLY the COLOR observations of the single most prominent garment in this image.
Return ONLY a JSON object. Observe visible color facts; do NOT score, classify a personality axis, or judge design intent.
This is NOT a pattern/graphic/surface/material/DM extractor — emit none of those.

Fields (use EXACT tokens; never invent values). Do NOT emit any secondary_color_family or secondary_color_present field — the full additional_colors array is the sole record of additional colors:
- primary_color_family: one of [black, white_family, gray, navy, blue, red, pink, yellow, orange, green, purple, brown, camel, beige, khaki, mint, wine, olive, gold, silver, uncertain] = the dominant/base garment color family.
    gold / silver are independent Color Families (NOT yellow+metallic / gray+metallic). A metallic-gold garment = primary_color_family "gold" + color_effect "metallic"; metallic-silver = "silver" + "metallic".
    ★ WARM-DARK HUE DISCRIMINATION (brown / olive / wine / camel are FOUR INDEPENDENT families — judge the UNDERTONE, not the darkness):
      · brown = warm NEUTRAL earth tone — coffee / chocolate / espresso / chestnut. No green cast, no red-purple cast.
      · olive = a GREEN-leaning drab — the cloth must carry a visible green/yellow-drab undertone (military/olive-drab). A dark warm brown with NO green cast is brown, not olive. Do not call a coffee/chocolate cloth olive merely because it is muted or dark.
      · wine  = the actual burgundy / bordeaux / oxblood / maroon family. Use wine ONLY when the garment genuinely READS as one of these wine-family colours — sufficient visible evidence, not a mere tint. ⛔ A red or warm component alone does NOT make a cloth wine: reddish dark brown is still brown, dark chocolate is still brown, and "some red present" is never by itself wine. Darkness decides nothing in either direction — a true burgundy stays wine when dark, and a dark brown stays brown when deep.
      · camel = the LIGHT golden-tan end of the warm range — camel / light tan. Light golden tan is camel, not a "light brown"; do not merge camel into brown or brown into camel.
      TEST for every warm/dark garment: name the undertone first (green → olive · red-purple → wine · light golden-tan → camel · none of these → brown), then emit the family. Lighting must not change the family: a shadowed camel stays camel, a highlighted wine stays wine.
      ★ UNDERTONE DOMINANCE (run this check EXPLICITLY on every deep warm cloth before emitting):
      · wine vs brown — the question is NOT "is any red present?" but "does the whole cloth read as a wine-family colour (burgundy/bordeaux/oxblood/maroon)?". If the honest reading is a brown with a reddish warmth, answer brown; if the honest reading is a burgundy/oxblood, answer wine. Do not let a single undertone cue override the overall family reading in either direction.
      · olive vs brown — olive is ONLY ever answered from an intrinsic GREEN cast in the cloth itself. Warm/amber scene lighting (stage light, golden interiors, sunset light) pushes EVERYTHING toward orange and can make you *remember* a khaki/military garment as olive — but if the visible cloth shows a yellow-orange cast with NO green component, the family is brown (or camel when light golden-tan), not olive. Never carry "olive" over from garment TYPE associations (military/utility/leather trench); the pixels you see must contain the green-drab cast. Conversely a true olive with an intrinsic green cast stays olive — do not force it to brown.
      · brown/olive BOTH-CANDIDATE RULE (fail toward the neutral reading): when a warm dark cloth leaves brown and olive both in play, olive may be chosen ONLY on positive, nameable green-cast evidence in the visible cloth itself — and that green cast must be stated in the evidence text. Dark, earthy, muted, drab, khaki-like or yellow-brown qualities are shared by both families and NEVER promote the reading to olive on their own; with no positive green cast named, the answer is brown. ⛔ MATERIAL AND CATEGORY DECIDE NOTHING IN EITHER DIRECTION: "brown leather", "leather coat", or any material/category identity is never colour evidence — the family is read from the visible cloth colour alone (and this rule must never be used to pull a genuinely green-cast olive cloth down to brown).
- color_lightness: "light" | "normal" | "dark" = perceptual LIGHT<->DARK value ONLY. NOT saturation, vividness, chroma, sheen, or reflectivity. Use null if not observable.
- color_usage: "single" | "subtle" | "accent" | "multi"
    single = one garment color; no visually distinct secondary color.
    subtle = a secondary color exists but is minor and low-separation (e.g. tonal thin piping).
    accent = a secondary color is limited in extent but visually DISTINCT (e.g. a clear contrast collar/cuff/pocket).
    multi = substantial multicolor composition, color-blocking, co-equal colors, or all-over multicolor.
    Judge by visible composition; no numeric/pixel/percentage thresholds.
- multi_color: true | false. TRUE only when multiple colors MATERIALLY PARTICIPATE in the visible garment color composition.
    A small contrasting button/zipper/logo/piping color does NOT by itself make multi_color true.
- color_effect: "none" | "neon" | "metallic" = chromatic appearance ONLY (a neon/fluorescent color, or a metallic COLOR family such as gold/silver metal sheen-as-color). It is NOT surface sheen — do NOT report a satin/reflective FINISH here.
- additional_colors: an array (0..N) of every INTENTIONAL DESIGNED color beyond the primary, each as:
    { "color_family": "<one of the families above or uncertain>",
      "carrier_kind": "closure | attachment | graphic | pattern | pocket | material_component | generic_descriptor",
      "carrier_ref": "<the element carrying the color>" }
    Carrier reference rules (minimum necessary only — no size/percentage/coordinates/geometry/placement/extent):
      - Button / Snap Button / Zipper / Zipper Tape  -> carrier_kind "closure",           carrier_ref "Button"|"Snap Button"|"Zipper"|"Hook Closure"
      - Metal Hardware / Belt hardware               -> carrier_kind "attachment",         carrier_ref "Metal Hardware"|"Belt"
      - Logo / Print / Text / Lettering              -> carrier_kind "graphic",            carrier_ref "Localized"|"Dominant"
      - Stripe / Pattern color                       -> carrier_kind "pattern",            carrier_ref "Linear"|"Grid"|"Repeat"
      - Pocket                                       -> carrier_kind "pocket",             carrier_ref "Present"
      - A distinct material/component region         -> carrier_kind "material_component", carrier_ref "Knit"|"Padding"|"Denim"|... (the material)
      - Only when NO owner above fits                -> carrier_kind "generic_descriptor", carrier_ref "Piping"|"Collar"|"Cuff"|"Waistband"|"Panel"|"Strap"
      "contrast_with_body": "Tonal" | "Subtle" | "Distinct"  (REQUIRED when the colour is readable)
      = how strongly this colour SEPARATES from the garment body colour, judged against the body it sits on.
        "Tonal"    = reads as the same tonal family as the body; you notice it only on close inspection
                     (a camel belt on a camel coat; an ivory panel on a white body).
        "Subtle"   = visibly a different colour but low separation (a camel belt on a mid-brown coat).
        "Distinct" = clearly and immediately separated (a white stripe on a navy body; a red belt on black).
      ⛔ This is a RELATION to the body, not a property of the colour. The same camel reads Tonal on a
         camel body and Distinct on a black body — report what THIS pairing looks like.
      ⛔ Family difference alone is NOT contrast: same-family suppression already guarantees the families
         differ, so "they are different families" tells us nothing. Judge the visual separation.
      ⛔ Never a number, a percentage or a ratio. Omit the field only when the colour is not reliably readable.
    DETECT small designed colors too (Small != Ignore): buttons, zippers/zipper tape, metal/belt hardware, logos/graphics/text, pattern colors, pocket colors, material-component colors, piping/collar/cuff/waistband/panel/strap when relevant.
    Inspect Buttons and Closures (front placket, cuffs, front opening) even when their color is CLOSE IN TONE to the garment body — a low-contrast but intentional button/closure color (e.g. dark-brown buttons on a beige knit) still counts as an additional color. This does NOT relax suppression: thread, stitching, buttonholes, seams, shadows, folds, incidental specks, and photographic variation are NEVER additional colors.
    For a MINOR multicolor logo/graphic, do NOT enumerate every internal tiny color — emit ONE entry (carrier_kind "graphic"). If the logo/graphic has a clearly nameable dominant Color Family, emit that family; use color_family "uncertain" ONLY when the visible color is genuinely not reliably nameable (a true multicolor with no dominant family). carrier_ref "Localized" vs "Dominant" describes how much of the GARMENT the graphic itself covers (a chest-sized logo = "Localized"; an all-over/large front print = "Dominant") — it is NOT the proportion of colors inside the logo, so a chest-sized logo stays "Localized" even if one color dominates within it. For a MAJOR garment-level color composition (e.g. a two-color stripe/panel), preserve the meaningful participating families.
    SUPPRESS (do NOT emit an additional color) when a color difference is caused only by: lighting, shadow, folds, photography, minor same-family tonal variation, washed/faded treatment, metallic reflection, or a same-family region that only differs by SURFACE (matte vs satin/glossy). A gold surface reflecting locally silver/gray, or a silver surface reflecting gray/white, is NOT an additional color.
    ★ SAME-FAMILY SUPPRESSION: an additional_colors entry must name a color_family DIFFERENT from primary_color_family. A component (button, closure, hardware, pocket, panel) whose color falls in the SAME family as the primary adds no color information — it is same-family tonal variation and must be SUPPRESSED, not emitted as an additional color. (The low-contrast-button rule above is about CROSS-family components that are merely close in tone — e.g. dark-brown buttons on a beige body; it never licenses a same-family duplicate such as a white button on a white body.)
    Washed/faded areas keep the base Color Family; do NOT create a color from treatment (surface owns "Treated Surface"). Same-family different-surface (e.g. matte body vs satin lapel) is a Surface fact, NOT an additional color.
    Actual gold/silver-COLORED hardware IS a component color: emit it with carrier_kind "attachment".
    ★ COMPONENT & HARDWARE COLOUR FINAL SWEEP (run as the LAST step before emitting additional_colors — check the IMAGE again, not your memory of it):
      (a) STRUCTURAL COMPONENTS — look specifically at any belt / waist tie / sash / strap / contrast collar / cuff / waistband / panel that the garment carries: does its colour read as a DIFFERENT family from the primary? A lighter golden-tan (camel) belt on a brown or olive body, a contrasting collar, a cream panel on a navy body — these are designed colours and MUST each be emitted with their carrier ("Belt" → carrier_kind "attachment"). Do not absorb a visibly lighter/darker DIFFERENT-family component into the body colour because it is made of the same material — same MATERIAL is not same COLOUR.
      (b) HARDWARE ZONES — inspect the fastening zones once more: waistband button and rivets on trousers/jeans, front placket buttons, zip pulls and zip tape, snap studs. Small size and low contrast do NOT suppress these (Small != Ignore, above). When metal hardware is visible and its metal colour is discernible (silver/gold), emit it (Button family per the carrier table — e.g. a visible silver waistband button on dark denim = {"color_family":"silver","carrier_kind":"closure","carrier_ref":"Button"}).
      (b2) DESIGNED-HARDWARE CHECKLIST — treat every visible designed hardware zone as a mandatory inspection stop: buttons (waistband, placket, cuff), zipper pulls/sliders, snaps/studs, buckles/D-rings, and any other visible designed hardware. For EACH such zone exactly one of three outcomes applies: (A) the hardware is visible AND its colour is visually readable AND cross-family distinct → emit it as an additional color through its existing carrier; (B) the hardware is visible but its colour is NOT reliably readable → emit nothing for it and NEVER guess silver/gold/gunmetal; (C) the hardware colour is same-family / not meaningfully distinct → the existing same-family suppression applies. Recognizing the hardware's STRUCTURE (a button, a zip) while never asking its COLOUR is exactly the miss this checklist exists to stop — structure recognition without a colour check is an incomplete observation.
      (c) ⛔ NO HARDWARE INFERENCE — this sweep reports only what is VISIBLE: never assume a button is silver because jeans usually have metal buttons, and never add hardware colour for closures that are genuinely hidden/occluded. If the hardware is visible but its colour genuinely cannot be named, it is not an additional colour entry.
- evidence: { "primary": "...", "lightness": "...", "usage": "...", "effect": "..." } — concise visible cues only; no reasoning/scoring.
- color_notes: a short free-text string for genuinely-visible COLOR facts the fields above cannot hold (gradient/ombre, muted/vivid chromatic appearance, washed/faded chroma, iridescent, unusual color transition), OR null. Do NOT put pattern, graphic, material, hardware, pocket, construction, fit, or silhouette here. Do not force notes.

Return JSON ONLY, exactly:
{"primary_color_family":"...","color_lightness":"...","color_usage":"...","multi_color":true,"color_effect":"...","additional_colors":[{"color_family":"...","carrier_kind":"...","carrier_ref":"...","contrast_with_body":"..."}],"evidence":{"primary":"...","lightness":"...","usage":"...","effect":"..."},"color_notes":null}`;

function parseJson(text) {
  let t = String(text || '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fence) t = fence[1].trim();
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

/**
 * Validate a canonical Color Contract V1 observation. Flags/rejects malformed STRUCTURE and obsolete fields;
 * never repairs or infers Vision visual values. Returns { contract_errors[], inconsistencies[], warnings[] }.
 */
function validateColorObservation(o) {
  const errs = [], incon = [], warn = [];
  const inEnum = (v, arr, allowNull) => (v == null ? !!allowNull : arr.includes(v));
  if (o == null || typeof o !== 'object') return { contract_errors: ['NO_OUTPUT'], inconsistencies: [], warnings: [] };

  if (!inEnum(o.primary_color_family, FAMILIES, false)) errs.push('primary_color_family');
  // ── RELATIONAL CONTRAST (CEO 2026-09-05 · §6 · §7) — validated, never repaired or defaulted.
  //   Omission stays legal (migration-safe); an ILLEGAL value is rejected.
  if (Array.isArray(o.additional_colors)) o.additional_colors.forEach((a, i) => {
    if (a && typeof a === 'object' && a.contrast_with_body !== undefined
      && !CONTRAST_WITH_BODY.includes(String(a.contrast_with_body).trim()))
      errs.push('additional_colors[' + i + '].contrast_with_body');
  });
  if (!inEnum(o.color_lightness, LIGHTNESS, true)) errs.push('color_lightness');
  if (!inEnum(o.color_usage, USAGE, true)) errs.push('color_usage');
  if (typeof o.multi_color !== 'boolean') errs.push('multi_color');
  if (!inEnum(o.color_effect, EFFECT, true)) errs.push('color_effect');

  // Obsolete Secondary scalars must NOT appear in canonical Color V1 (V1-G contract violation).
  OBSOLETE_FIELDS.forEach(k => { if (k in o) errs.push(k + ':obsolete-field'); });

  // additional_colors[] well-formedness (0..N; each = family + carrier_kind + carrier_ref). Required field.
  const ac = o.additional_colors;
  if (ac === undefined) errs.push('additional_colors:missing');
  else if (!Array.isArray(ac)) errs.push('additional_colors:not-array');
  else ac.forEach((e2, i) => {
    if (e2 == null || typeof e2 !== 'object') { errs.push('additional_colors[' + i + ']:not-object'); return; }
    if (!FAMILIES.includes(e2.color_family)) errs.push('additional_colors[' + i + '].color_family');
    if (!CARRIER_KINDS.includes(e2.carrier_kind)) errs.push('additional_colors[' + i + '].carrier_kind');
    if (typeof e2.carrier_ref !== 'string' || e2.carrier_ref.length === 0) errs.push('additional_colors[' + i + '].carrier_ref');
    else if (e2.carrier_kind === 'generic_descriptor' && !GENERIC_DESCRIPTORS.includes(e2.carrier_ref)) warn.push('additional_colors[' + i + '].carrier_ref:non-standard-descriptor(' + e2.carrier_ref + ')');
    REJECTED_AC_FIELDS.forEach(k => { if (k in e2) errs.push('additional_colors[' + i + '].' + k + ':rejected-field'); });
  });

  // Logical consistency FLAG (never repair). NOTE: the old "single => not secondary" coupling is REMOVED:
  // a small designed additional color may coexist with color_usage=single AND multi_color=false.
  if (o.multi_color === true && o.color_usage != null && o.color_usage !== 'multi') incon.push('multi_color-but-usage-not-multi');
  return { contract_errors: errs, inconsistencies: incon, warnings: warn };
}

module.exports = { CONTRAST_WITH_BODY,
  FAMILIES, CARRIER_KINDS, GENERIC_DESCRIPTORS, LIGHTNESS, USAGE, EFFECT, OBSOLETE_FIELDS, REJECTED_AC_FIELDS,
  COLOR_PROMPT, parseJson, validateColorObservation,
};
