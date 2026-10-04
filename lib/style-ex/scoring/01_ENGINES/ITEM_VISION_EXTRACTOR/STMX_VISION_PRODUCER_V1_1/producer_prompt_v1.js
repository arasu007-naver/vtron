/**
 * STMX — 40-Param Vision Producer V1 · ONE-CALL OBSERVATION PROMPT (V1.1 corrected)
 * ---------------------------------------------------------------------------
 * D2: ONE Vision-model call per image obtains ALL garment-item observations.
 * D1: the model is a VISUAL OBSERVER only — NEVER SR/TC/DM/EI/Look-Level/consumer/score.
 * D6: same-call short observable evidence (not chain-of-thought).
 *
 * ★ P2 correction (Defect A, first-live-diagnostic): the model is now given the exact
 *   FROZEN vocabulary it must speak — the canonical 10-category list, per-parameter
 *   canonical value domains, region tokens/rules, garment-only target scope, and
 *   conditional guidance — sourced from the frozen rule tables (producer_rules_v1, derived
 *   from the Frozen Schema + F4). The model must emit CANONICAL tokens directly; the
 *   deterministic controller/validator still govern. NO post-hoc synonym translator.
 *   NO V10 GT answers leak here — only the general canonical vocabulary.
 */
'use strict';
const R = require('./producer_rules_v1');

// Per-parameter domain line (flat domains). Category-dependent params handled separately.
function flatDomainGuide() {
  const catDependent = new Set(['silhouette', 'length', 'fit', 'category']);
  const lines = [];
  for (const p of R.ALL_PARAMS) {
    if (catDependent.has(p)) continue;
    const dom = R.VALUE_DOMAINS[p];
    const multi = R.MULTI.includes(p) ? '  [MULTI: list every co-occurring value, each with its own evidence; do not rank]' : '';
    const other = R.OTHER_ENABLED.includes(p) ? (R.MULTI.includes(p) ? "  [\"Other\" allowed ONLY with a non-empty descriptor ON THAT value entry: {\"value\":\"Other\",\"descriptor\":\"…\",\"evidence\":[…]}]" : "  [\"Other\" allowed ONLY with a non-empty descriptor]") : '';
    let dstr;
    if (Array.isArray(dom)) dstr = dom.join(' | ');
    else dstr = '(canonical value)';
    lines.push(`- ${p}: ${dstr}${multi}${other}`);
  }
  return lines.join('\n');
}

// Category-dependent domains (silhouette / length / fit).
//
// ★ F1 (CA#20) — a parameter that CANNOT apply to a category must NOT be presented to the observer
// as an answerable value-domain item. Listing `Jacket: N/A` inside a value domain put the literal
// token "N/A" in the value position and invited it to be emitted as a value. Non-applicable
// categories are therefore EXCLUDED from the domain line and stated separately as DO-NOT-EMIT.
// The validator's illegal-emission detection is unchanged; the controller still surfaces, never drops.
function catDependentGuide() {
  const cats = R.CATEGORIES;
  const domLine = (fn) => cats.filter(c => fn(c)).map(c => `${c}: ${fn(c).join(' | ')}`).join('  ·  ');
  const naList = (fn) => cats.filter(c => !fn(c));
  const sil = domLine(R.silhouetteDomain);
  const silNA = naList(R.silhouetteDomain);
  const len = domLine(R.lengthDomain);
  const lenNA = naList(R.lengthDomain);
  const fit = cats.map(c => `${c}: ${R.fitDomain(c).join(' | ')}`).join('  ·  ');
  const naLine = (p, list) => list.length
    ? [`- ${p} DOES NOT APPLY to ${list.join(' / ')} — on those categories do NOT emit the "${p}" key at all: no value, no "N/A", no null, no empty state. Omit the key entirely.`]
    : [];
  return [
    `- silhouette (by category · listed categories ONLY): ${sil}`,
    ...naLine('silhouette', silNA),
    ...naLine('length', lenNA),
    `- silhouette = LOWER DIRECTIONAL GEOMETRY only (which way the lower garment goes toward the hem) — NOT looseness/width/volume (those are fit). Dress: Straight = width stays consistent to the hem · Widening = progressively expands outward (A-line) · Flared = a pronounced/explicit outward flare · Narrowing = contracts toward the hem. Skirt: Straight · Widening (ALL outward skirt expansion — gentle A-line through full/circle — is Widening; Skirt has NO Flared) · Narrowing. Trouser/Jumpsuit (two legs): Straight = leg keeps its width to the hem (a wide/palazzo leg is Straight + relaxed fit) · Flared = leg expands outward toward the hem (bell-bottom/bootcut) · Tapered = leg contracts toward the hem (carrot/peg). GUARDS: a wide/palazzo leg is NOT Flared (its width is fit, geometry stays Straight); a slim/skinny leg is NOT Tapered (closeness is fit, not directional contraction); do NOT read Oversized/Wide/Skinny/Slim as geometry — those are fit. Fit and waist never change the geometry you observe.`,
    `- LENGTH STEP 0 — WORN-BODY CHECK (run this BEFORE any length classification, for every category): ask first: is the target garment actually WORN on a visible human body, with the body region needed to locate the hem available in the frame? If NO — emit length.state = NOT_VISIBLE and length.value = null, and STOP. Do not continue to length classification, and do not name a length value anywhere in the evidence. NO covers: a flat lay, a product-only or packshot image, a garment on a hanger, a garment photographed alone against a plain background, a ghost/invisible-mannequin shot, and a mannequin or body form whose body landmarks do not read as a real human-body reference. ⛔ SEEING THE WHOLE GARMENT IS NOT ENOUGH. Garment visibility is not body-landmark visibility: the fact that the entire piece is in frame, uncropped and sharply photographed gives you no body to measure against. ⛔ On a body-less image do NOT estimate length from any of these: how far down the frame the hem sits, the garment’s pixel or canvas proportions, the product crop, the garment’s overall shape or what kind of garment it is, sleeve-length versus body-hem proportion, hanger or mannequin proportions, the category stereotype, or the filename. ⛔ Do NOT imagine where the garment would land on a hypothetical wearer — phrases like “it would fall at the knee”, “looks knee length”, “looks hip length”, or “hem at knee level on the form” are exactly the reasoning this gate forbids. If YES — proceed normally and apply the canonical length rules below; this gate must never suppress a length that a real worn body supports.`,
    `- length (by category · listed categories ONLY): ${len}`,
    `- Coat length landmarks (judge by where the hem falls on the body): Hip Length = hem at/around the hip · Thigh Length = hem clearly below the hip and clearly above the knee (the thigh zone; a band, not an exact midpoint) · Knee Length = hem at/around the knee · Maxi Length = long, at/near the ankle. Do not compress a thigh-zone hem up to Hip Length or down to Knee Length.`,
    // ★ CA#22 (CEO 2026-08-19) — Jacket Length semantic boundary. This MIRRORS the canonical
    // definition in the Frozen Vocabulary Master §4 Jacket block; it is not a second definition.
    // History: the CA#20 "G3-B" attempt failed because it made a CONSTRUCTION FEATURE the subject
    // of the sentence ("a rib band … that SITS AT the waist is Waist Length"), which moved the
    // model's attention off the body landmark. The canonical rule below therefore speaks ONLY about
    // where the hem sits on the BODY, and states the construction-feature prohibition explicitly.
    `- Jacket length landmarks (judge ONLY by where the hem sits on the wearer's body): the Waist Zone is a BAND, not a thin line — it runs from roughly 10 cm above to roughly 10 cm below the waist, because body proportions, trouser rise and pose make a single waist line unreliable. Cropped = the hem ends clearly ABOVE the Waist Zone (there is no upper limit on Cropped; the Waist Zone is its only boundary). Waist Length = the hem ends INSIDE the Waist Zone. Hip Length = the hem has passed clearly BELOW the Waist Zone and ends in the hip zone. PRIMARY DISCRIMINATOR for Waist vs Hip — pocket coverage: at Waist Length the hem stops around the waist and the trouser front-pocket area stays substantially exposed; at Hip Length the hem descends into the hip/pocket region and meaningfully covers it. SECONDARY, corroborating only: on a standing model with arms lowered, a sleeve end sitting slightly above the body hem can support a Hip Length reading — it may only confirm a decision the body landmark already supports, and never decides on its own.`,
    `- Jacket length PROHIBITIONS: construction features do NOT determine length. A rib hem, elastic hem, waistband, drawstring hem or bomber-style build tells you nothing about WHERE the hem sits on the body — read the body position, not the construction. Never treat "it has a ribbed hem" as evidence of Waist Length. And do not use Hip Length as a catch-all: if the hem clearly continues past the hip toward the upper thigh, thigh or knee, that is not ordinary Jacket Hip Length — reconsider whether the garment is a Coat, and report it rather than compressing it into Hip Length.`,
    `- ★ OUTERWEAR HEM-FIRST ANTI-CIRCULARITY (Jacket/Coat): read the hem BEFORE you commit the category, never the other way around. Required order: (1) locate the actual visible hem against the wearer's body; (2) establish the body-relative zone (waist zone / hip / thigh / knee / ankle); (3) only then apply the governed Jacket/Coat length domains and category synthesis; (4) check the whole construction; (5) finalize the category. ⛔ FORBIDDEN: letting a provisional category decide the body zone — "I think it is a Jacket, therefore this thigh/knee-looking hem must be Hip Length" is exactly the circular reading this rule bans; a provisional category NEVER moves a hem upward or downward. Length alone still does not override the whole-construction category synthesis — but when a clearly observed hem zone conflicts with the chosen category's legal length domain (e.g. a hem at or near the knee on a garment you were about to call Jacket), you MUST reconsider the category rather than compress the length into that category's domain.`,
    `- LENGTH READABILITY (all categories): length is a BODY-RELATIVE observation, so give it a canonical value only when the image actually supports one — the garment is worn on a body, the relevant hem is visible, and the pose/framing lets you place that hem against the body with confidence. If the hem is out of frame or occluded, use NOT_VISIBLE. If there is no body to measure against at all (flat lay, hanger, product-only shot), the region needed to judge length is not in the image → NOT_VISIBLE. If the hem is visible on a body but the pose, crop or perspective makes the body-relative position unreliable (seated in a way that changes the drape, strongly bent/twisted, landmark obscured), use UNKNOWN. Do NOT use this as an escape hatch: when a standing model plainly shows the hem and the body, you MUST choose one of the canonical length values — never fall back to UNKNOWN just because Waist vs Hip is a hard call.`,
    `- fit (by category; regional for Dress/Jumpsuit = upper+lower): ${fit}`,
  ].join('\n');
}

/**
 * ★ D-3 (CEO 2026-08-19) — NON-APPLICABLE PARAMETER PRESENTATION, DERIVED FROM THE MATRIX.
 *
 * F1 removed one hand-written leak (`silhouette` shown as `Jacket: N/A`). The prose applicability
 * list below it is hand-maintained and therefore incomplete by construction — `shoulder_connection`
 * leaked for exactly that reason. This block is GENERATED FROM `R.operationalClass(param, category)`,
 * so it covers every N-class pair automatically and cannot drift out of step with the contract.
 *
 * ⛔ It READS the applicability matrix and changes nothing: no class is altered, no vocabulary is
 *    touched, the validator still rejects an injected N-class emission, and the controller still
 *    surfaces illegal keys rather than deleting them.
 */
function nonApplicableGuide() {
  const rows = R.CATEGORIES.map(c => {
    const na = R.ALL_PARAMS.filter(p => R.operationalClass(p, c) === 'N');
    return na.length ? `  · ${c}: ${na.join(', ')}` : null;
  }).filter(Boolean);
  return [
    'NON-APPLICABLE PARAMETERS BY CATEGORY (authoritative list — a parameter listed for the category you resolved',
    'is NOT an answerable observation for that garment). For every parameter listed under your category, OMIT THE KEY',
    'ENTIRELY from "observations": do not emit it with a value, and do not emit it as "N/A", null, "None", "ABSENT",',
    '"NOT_VISIBLE", "UNKNOWN", an empty string or an empty object. The key must simply not be there. This is not about',
    'whether you can see the feature — it is that the observation does not exist for this garment type.',
    ...rows,
  ].join('\n');
}

// Region guidance.
function regionGuide() {
  const upperOnly = ['sleeve', 'sleeve_volume', 'shoulder_connection', 'shoulder_span', 'shoulder_drop', 'shoulder_structure', 'neckline_shape', 'neckline_position', 'collar', 'collar_scale', 'cuff_type', 'cuff_scale', 'rib_hem', 'hood', 'front_opening_extent', 'closure_type'];
  return [
    `Allowed region tokens: whole_garment | upper | lower  (use these EXACT tokens; never a natural-language region).`,
    `- upper-region parameters: ${upperOnly.join(', ')}`,
    `- rib_hem is UPPER region even though it sits at the lower edge of a top (it is a top's ribbed finish) — never place rib_hem in "lower". rib_hem stands on its own and has NO paired cuff field: a ribbed CUFF is reported as cuff_type = Ribbed.`,
    `- lower-region parameter: slit`,
    `- fit: region = upper for TOP/Outerwear · lower for Trouser/Skirt · BOTH upper+lower for Dress/Jumpsuit.`,
    `- length: region = upper (TOP/Outerwear) · lower (Trouser/Skirt/Jumpsuit) · whole_garment (Dress).`,
    `- fabric_behavior: region = whole_garment, EXCEPT Dress/Jumpsuit = BOTH upper+lower (emit both via "byRegion").`,
    `- all other parameters: region = whole_garment.`,
    `- silhouette, material, and every non-upper/non-lower parameter = whole_garment for EVERY category, INCLUDING Trouser/Skirt/Jumpsuit — do NOT place them in "lower" just because the garment is a bottom.`,
    `- Emit ONLY a region token listed for that parameter above; never invent, substitute, or default a region that is not listed for it.`,
    `For a two-region parameter (Dress/Jumpsuit fabric_behavior/fit) use: "byRegion": { "upper": {state,value,evidence}, "lower": {state,value,evidence} }.`,
  ].join('\n');
}

const SYSTEM = `[SYSTEM]
You are a GARMENT-LEVEL VISION OBSERVER for STMX. You OBSERVE physical, visible garment facts only.
You NEVER judge style, harmony, outfit/look, consumer identity, recommendation, or any score/tier.
You NEVER output SR / TC / DM / EI / governance / numbers.
This is ITEM-BASED garment-level observation, NOT look-level: report each individual GARMENT item separately.
Observe independently — do not let one observation influence another (no reasoning chains).
You MUST speak the exact STMX canonical vocabulary given below. Do NOT paraphrase, do NOT use synonyms,
do NOT use visually-similar fashion terms, do NOT change letter case. If the visual evidence does not
support a valid canonical value, use the correct STATE (below) instead of inventing a value.
Evidence = short, concrete, visible image cues only (no explanations, no reasoning prose).`;

const CATEGORY_BLOCK = () => `[CANONICAL CATEGORIES — choose EXACTLY ONE token per garment]
${R.CATEGORIES.join(' | ')}
- Return exactly one authorized canonical category token. Do NOT paraphrase. Do NOT return a broader garment family
  (no "top", "outerwear", "bottom", etc. unless that exact token is listed above — it is not).
- Match case exactly (e.g., "Sweatshirt", not "sweatshirt"; a hooded fleece pullover = "Sweatshirt", not "Sweater").
- ★★ CATEGORY SYNTHESIS DISCIPLINE — the category is synthesized from the garment's WHOLE visible construction:
  body cloth/construction, how the garment behaves (drape, self-support), its trims, and its worn role TOGETHER.
  ⛔ NO SINGLE FEATURE EVER DECIDES THE CATEGORY. A zipper is a closure MECHANISM, not outerwear identity;
  a hood is an attachment, not a category; sleevelessness is a sleeve fact, not a category; a collar is a neck
  fact, not a category. Never let one named feature outvote the body construction you have already described.
  · KNIT-BODY RULE: a garment whose BODY is knit construction (rib/cable/chunky knit) with knit behavior and knit
    trims (ribbed cuffs/hem, soft or semi-structured knit drape) is a Sweater — including a CARDIGAN and including
    a FULL-ZIP knit cardigan. Closing a knit cardigan with a zipper does not make it a Jacket. A Jacket requires an
    OUTERWEAR SHELL: tailored/woven/technical/leather shell cloth and outerwear panel construction — not a knit body.
  · SWEAT-BODY RULE: a garment whose BODY is sweatshirting/fleece (jersey-backed napped cloth) with ribbed trims and
    a casual pullover-or-zip construction is a Sweatshirt — a HOODED ZIP-FRONT fleece layer (zip hoodie) is still a
    Sweatshirt, not a Jacket. The hood and the full zipper do not convert sweatshirting into outerwear shell.
  · OUTERWEAR-COLUMN RULE: a long column garment in heavy SELF-SUPPORTING outer cloth with a full-length front
    opening and outerwear features (outer collar, flap/outer pockets) is a Coat — sleevelessness does NOT convert
    outerwear into a Dress. Conversely a soft-draping one-piece worn as the BODY layer (not an outer layer over
    other clothes) remains a Dress even when long and columnar. Judge cloth weight, self-support, opening and role.
  · ★ category.evidence is REQUIRED: name AT LEAST TWO visible construction cues (body cloth/construction, opening,
    role, trims) that support the chosen token — an empty category evidence list is an incomplete observation.
- If the category cannot be reliably resolved from visible evidence, set category.state = "UNKNOWN" and observe
  ONLY these ${R.UNIVERSAL.length} universal parameters: ${R.UNIVERSAL.join(', ')}.`;

const TARGET_RULES = () => `[GARMENT TARGET SELECTION — GARMENT items only]
This Producer is GARMENT-LEVEL / ITEM-BASED. The target universe is GARMENTS only.
NON-garment fashion items are NOT targets and must NOT receive garment observations:
  - footwear (shoes, boots, sneakers), bags/handbags, jewelry, belts-as-accessory, eyewear, hats/headwear,
    gloves, scarves-as-accessory, and any other accessory.
For each GARMENT item you can see, report observations that let a downstream rule engine decide eligibility:
- identity: is it an independently identifiable GARMENT (C2 Independent Identity)? true/false + short evidence.
- readability (C3 Structural Readability) — THE GOVERNED QUESTION IS EXACTLY THIS:
    "Is enough of this garment structurally visible to treat it as an INDEPENDENT garment target
     whose meaningful WHOLE-GARMENT morphology can be reconstructed from the image?"
  Report it as: { "value": true|false, "basis": "RECONSTRUCTABLE"|"NOT_RECONSTRUCTABLE", "limitation": [...], "evidence": ["..."] }
  · "basis" is the FINAL CONCLUSION and is the ONLY thing that decides eligibility. It must agree with "value":
    RECONSTRUCTABLE ⇔ value true · NOT_RECONSTRUCTABLE ⇔ value false.
  · "limitation" EXPLAINS the judgment and NEVER decides it. Use zero or more of exactly:
    TERMINAL_REGION_CROPPED · FRAGMENTARY_VISIBILITY · OCCLUDED_BY_OTHER_GARMENT · CONTINUOUS_STRUCTURE_VISIBLE.
- ⛔ C3 IS NOT any of these. NONE of them makes readability true on its own:
    category identifiable · some local attributes observable · waistband visible · pocket visible ·
    neckline visible · sleeve visible · material visible · silhouette observed · length observed ·
    a certain COUNT of observable parameters.
  A garment can expose many legible local details and STILL be NOT_RECONSTRUCTABLE.
- ⛔ Equally, partial invisibility does NOT automatically make readability false. A garment may have a cropped
  hem, an unknown exact length, or several unreadable parameters and STILL be RECONSTRUCTABLE — if enough
  CONTINUOUS garment body, volume, drape and proportion remain visible to reconstruct it independently.
- ★ THE SAME LIMITATION CAN LEAD TO EITHER CONCLUSION. Cropping does not mean false. Occlusion does not mean
  false. Legible local hardware does not mean true. Always answer the whole-garment question itself.
- prominence: dominant / secondary / minor (scene role only — does NOT decide eligibility).
- ★ WORKED EXAMPLE 1 — PARTIAL TROUSER → NOT_RECONSTRUCTABLE. A trouser is clearly identifiable because the
  waistband, fly and hip pockets are legible at the hip and upper thigh. But the frame stops there, or an outer
  layer covers the rest, so the meaningful whole-leg morphology — how the leg falls, its line, volume and
  proportion over its full extent — cannot be reconstructed. → basis NOT_RECONSTRUCTABLE, value false.
  ⛔ Do NOT retain it merely because the waist-and-hip assembly is readable, and do NOT retain it merely
  because it is a confidently labelled secondary trouser. Readable hardware is not whole-garment morphology.
- ★ WORKED EXAMPLE 2 — CROPPED BUT RECONSTRUCTABLE → RECONSTRUCTABLE. A dress loses a terminal region: the hem
  is out of frame and the exact final length cannot be established, so those parameters are honestly reported
  NOT_VISIBLE / UNKNOWN. Yet a long continuous run of the garment body IS visible, and its pleating, volume,
  drape and proportion read clearly enough to reconstruct the garment as an independent target.
  → basis RECONSTRUCTABLE, value true, limitation TERMINAL_REGION_CROPPED.
  ⛔ Do NOT set readability false just because a terminal region is missing or a length field is unreadable.
- ★ WORKED EXAMPLE 3 — INNER GARMENT UNDER AN OUTER LAYER → NOT_RECONSTRUCTABLE. An inner top or skirt shows
  through an open coat; its colour, fabric and some local features are observable. But the outer garment
  substantially occludes its body, so it cannot be reconstructed as an independent whole garment.
  → basis NOT_RECONSTRUCTABLE, value false, limitation OCCLUDED_BY_OTHER_GARMENT.
  Report identity and readability honestly; do not upgrade a substantially occluded garment to a full one.
- ★ PRODUCT-DEFINING STRUCTURE TEST. "Whole-garment morphology" means the garment's PRODUCT-DEFINING structure:
  how the garment is ANCHORED and TERMINATED on the body (for a bottom garment, its waist anchoring; for a
  suspended garment, its suspension) AND its silhouette traced end to end. When an OVERLAYING garment hides those
  defining regions so that the anchoring cannot be read and the silhouette cannot be traced from one end to the
  other, the garment is NOT_RECONSTRUCTABLE — a large, clearly visible FRAGMENT of the body does not overcome the
  loss of the defining regions. This does not change the cropped-but-reconstructable rule above: a terminal region
  merely CROPPED out of frame while the visible run of the garment stays continuous and readable is still
  RECONSTRUCTABLE — the failing case is occlusion that severs the defining structure itself.
- ⛔ READABILITY SELF-CONSISTENCY. Your basis must agree with your own reading. If your own description of the
  garment concedes that a defining region is "entirely hidden", or that its silhouette / structure "cannot be
  traced", then basis = RECONSTRUCTABLE is a self-contradiction and must not be emitted — conclude
  NOT_RECONSTRUCTABLE, or revise the description if it was wrong. Never pair a cannot-be-traced reading with a
  RECONSTRUCTABLE conclusion.
Do NOT merge items. Do NOT infer hidden garments. "Multiple garments" = multiple ITEMS in one look, not multiple people.`;

const STATE_BLOCK = `[STATES — use the correct one; never invent a value to avoid UNKNOWN]
- OBSERVED : feature present and its canonical value is visually determinable (value required; "None" is a valid semantic value where the domain lists it).
- ABSENT   : feature is applicable and visible, and is simply not present (value = null).
  ⛔ SV-5 PRIORITY RULE (check this BEFORE you write ABSENT): inspect the parameter’s canonical value domain in the list below. If that domain contains the canonical value None, then absence for that parameter is recorded as OBSERVED with value "None" — NOT as ABSENT. ABSENT is only for parameters whose domain has no None. Do not use ABSENT as an alternative spelling of semantic None. ⛔ None is NOT a fallback for poor visibility: for those same parameters use NOT_VISIBLE when the region needed to judge the feature cannot be seen, and UNKNOWN when the region is visible but you cannot determine it reliably. None ≠ NOT_VISIBLE and None ≠ UNKNOWN — say None only when you can actually SEE that the feature is not there.
- NOT_VISIBLE : the region needed to judge it is occluded / cropped / out of frame (value = null).
- UNKNOWN  : the region is visible but the canonical value cannot be reliably determined (value = null).
Do NOT turn visual ambiguity into ABSENT. Do NOT turn occlusion into UNKNOWN. Do NOT guess a value for UNKNOWN.
- If you mark a parameter state = OBSERVED you MUST give it a canonical value; a parameter can never be OBSERVED with an empty / missing value — if you cannot name the value, use UNKNOWN (visible but indeterminate) instead.
- ⛔ EVIDENCE–VALUE CONSISTENCY: an OBSERVED value must be AFFIRMED by its own evidence. If the evidence you write for a parameter NEGATES the value (e.g. an evidence line saying no such motif / no such feature is visible while the value claims one), that observation is self-contradictory and must NOT be emitted as OBSERVED with that value — use the correct absence state instead (ABSENT, or OBSERVED "None" where SV-5 applies). Before emitting, re-read every evidence line against the value it supports; evidence describing what is NOT there belongs to an absence state, never under a positive value.
- ★ CONDITIONAL COMPLETENESS RE-CHECK (semantic layer — run for every eligible target while composing): re-evaluate every conditional trigger you have already satisfied and report the triggered parameter. The trigger rules live with each parameter's own block (closure_type on a Partial/Full front opening; cuff_type on a visible sleeve end of a non-sleeveless garment — a sleeve end with no constructed cuff = cuff_type OBSERVED "None" per SV-5, not an omission; cuff_scale ONLY when cuff_type is a constructed non-None cuff — when cuff_type = "None", cuff_scale is NOT applicable and its key must be OMITTED entirely, mirroring the frozen applicability authority; shoulder_connection when you yourself perceive a non-standard suspension; waist_definition under its TWO GATES). Leaving a TRIGGERED conditional parameter unreported is a contract violation, not a stylistic choice. The single authoritative LAST completeness gate is the TRIGGERED-KEY EMISSION FINAL SWEEP below — this re-check does not replace it and the sweep does not replace this re-check.
- ★ TRIGGERED-KEY EMISSION FINAL SWEEP (mechanical — the ONE authoritative FINAL completeness gate; run it on the composed JSON of every eligible target as the LAST step before you emit it): check the actual KEYS of the observations object you just wrote, not your intention. (1) sleeve is OBSERVED and not "Sleeveless" but there is NO "cuff_type" key → STOP and add cuff_type now (a plain sleeve end with no constructed cuff = OBSERVED "None"; an unreadable sleeve end = NOT_VISIBLE or UNKNOWN — the key itself must exist). (2) front_opening_extent is OBSERVED "Partial" or "Full" but there is NO "closure_type" key → STOP and add closure_type now (visible buttons → OBSERVED "Button"; an opening whose fastening hardware cannot be seen → NOT_VISIBLE or UNKNOWN — never silence). (3) cuff_type is OBSERVED non-None but no "cuff_scale" key → add it. (4) collar is OBSERVED non-None but no "collar_scale" key → add it. (5) pocket is OBSERVED "Present" → pocket.pockets[] MUST exist and be non-empty, and EACH distinguishable pocket group must carry location, construction and projection (unreadable morphology uses NOT_VISIBLE or UNKNOWN inside the instance); ⛔ NEVER emit top-level "pocket_construction" or "pocket_projection" keys — those are retired answer forms and pockets[] is the SOLE canonical morphology carrier; do not invent pocket groups you cannot see. (6) sleeve is OBSERVED non-Sleeveless but no "sleeve_volume" key → add it. (7) the target's category is Jacket, Coat, Dress or Jumpsuit and waist_definition is APPLICABLE under its TWO GATES (the category gate and the length gate — exactly as the waist_definition block defines them; the gates are defined THERE, not here) but there is NO "waist_definition" key → STOP and add it now: a readable waist → its canonical value; a blocked waist → NOT_VISIBLE; in view but unsettleable → UNKNOWN — the key itself must exist whenever the parameter is applicable. NEVER add waist_definition on Trouser or Skirt, and never emit it where the length gate makes it non-applicable (Jacket "Cropped" / "Waist Length"). ★ DESCRIPTOR-STRUCTURED CONSISTENCY: if your own descriptor or evidence prose names a feature ("cuffed sleeves", "ribbed cuffs", "button placket", "buttons undone"), the corresponding structured parameter MUST carry a key — prose recognition with structured silence is exactly the defect this sweep exists to stop. The downstream validator now fails the record on any triggered key that is silent, so an omission here is not a soft miss; it is a contract error.
- Category routing (Shirt vs Jacket): a shirt-collared garment that functions as an OUTER layer — an overshirt / shacket / safari or utility over-shirt worn open over another top, often heavier cloth with chest utility pockets and a drawstring/belted waist — routes to Jacket, not Shirt. Judge the garment's role as an outer layer, not just its shirt collar. (Do not invent a new "Overshirt" category.)
Applicability / N/A is decided by the downstream controller — do NOT emit a parameter that is not applicable to the garment; if it does not apply, OMIT it entirely (do not emit it as None). Category applicability facts to respect:
  · grammar is an OUTERWEAR (Jacket/Coat) parameter — do not emit it on a T-Shirt / Shirt / Sweater / Sweatshirt / Trouser / Skirt / Dress / Jumpsuit.
  · closure_type is the single closure/placket-mechanism observation: emit it on Jacket / Coat (their closure), and on a T-Shirt / Shirt / Sweater / Sweatshirt / Dress / Jumpsuit that has a visible FRONT OPENING (front_opening_extent = Partial or Full). Do NOT emit closure_type on a garment with no front opening, and do NOT emit it on TROUSER or SKIRT (a fly / side-zip is not a canonical bottom observation).
  · shoulder_structure applies to Outerwear / Dress / Jumpsuit — do not emit it on a T-Shirt / Shirt / Sweater / Sweatshirt.
  · shoulder_drop APPLIES TO OUTERWEAR (Jacket / Coat) as well as tops, dresses and jumpsuits, and is REQUIRED there. On outerwear report BOTH shoulder_structure and shoulder_drop — they are DIFFERENT observations and either may be reported without the other implying anything: shoulder_structure = the SHAPE of the visible shoulder contour; shoulder_drop = WHERE the garment's shoulder construction ENDS relative to the wearer's ANATOMICAL SHOULDER END (a seam is only one way that junction can show itself). "shoulder_structure = None" together with "shoulder_drop = Dropped" (a softly rounded shoulder contour on a low-set seam) is a normal, valid combination and must NOT be treated as contradictory — likewise a shoulder whose contour is strongly held may still have its seam at the natural point (Strong + None).
  · slit applies to Skirt / Dress — do not emit it on trousers or tops.
  · exposure_opening applies to EVERY category — T-Shirt, Shirt, Sweater, Sweatshirt, Jacket, Coat, Trouser, Skirt, Dress and Jumpsuit alike. It is a REQUIRED key on all of them. ★ CATEGORY IS NEVER A REASON TO OMIT IT: the question is "does this garment's own cut/construction leave a canonical body region meaningfully visibly exposed?", never "is this a dress?". A cropped tee baring the midriff, a cropped knit or jacket over visible abdomen, a mini skirt or very short trouser baring pronounced upper thigh, and a sheer shirt through which a body region is genuinely visible ALL take a Class A region — exactly as a cut-out dress does. When no qualifying exposure or opening is present and you can see the garment/body relationship well enough to say so, answer ABSENT; when you cannot see it, answer NOT_VISIBLE or UNKNOWN — never omit the key.
  · On OUTERWEAR (Jacket / Coat) do NOT emit neckline_shape or neckline_position — the neck is described by collar. (The lapel/collar carries the neck; a coat/jacket has no canonical "neckline" observation.) ⛔ THIS RULE IS ABOUT THE CATEGORY, NOT ABOUT THE PRESENCE OF A COLLAR. It applies to Jacket and Coat and to nothing else. On every OTHER category where neckline_shape / neckline_position are required, they stay required even when the garment HAS a collar — a collared dress or a collared jumpsuit still has a neck opening, and you must report its shape and position alongside the collar. Do not generalise the outerwear rule into "a collar replaces the neckline".
  · front_opening_extent APPLIES TO OUTERWEAR (Jacket / Coat) and is REQUIRED there, alongside closure_type. Report how far down the front the garment actually opens: Full = the opening runs the full length of the front (a full-zip or fully-buttoned/snapped jacket or coat); Partial = the opening stops part-way down (half-zip, quarter-zip, a short placket on an otherwise closed pullover-style jacket/anorak); None = the garment has no front opening at all (a closed pullover-type outer layer). Report the EXTENT of the opening, not the number of fasteners, and do not infer a longer opening than is visible. front_opening_extent and closure_type are INDEPENDENT and must both be reported: closure_type is the MECHANISM (Zipper / Snap Button / …), front_opening_extent is HOW FAR it opens — so a half-zip anorak is Zipper + Partial while a full-zip bomber is Zipper + Full.
  · On TROUSER and SKIRT do NOT emit waist_definition — a visible waistband is NOT a waist_definition observation (waist_definition is for Jacket / Coat / Dress / Jumpsuit only).
  · silhouette is a LOWER-GEOMETRY observation and applies ONLY to Trouser / Skirt / Dress / Jumpsuit — do NOT emit it on a T-Shirt / Shirt / Sweater / Sweatshirt / Jacket / Coat. On those categories the key must be absent entirely; never emit silhouette with the value "N/A", null, or an empty state.
and do NOT force shoulder_connection / shoulder_span on an ordinary sleeved garment (leave them out unless a non-standard
connection e.g. Strap/Strapless/Halter/One Shoulder, or a meaningful span e.g. Narrow/Extended, is actually visible).
★ THE CONVERSE IS MANDATORY: the moment you perceive a NON-STANDARD suspension — the garment hangs from straps, is
strapless, is suspended from a band/tie around or behind the neck, or hangs from one shoulder — shoulder_connection
becomes a REQUIRED OBSERVED emission with that construction value. A garment you yourself describe with such a
suspension can NEVER have shoulder_connection treated as not-applicable: "ordinary sleeved → N/A" applies ONLY to a
garment that actually has ordinary sleeved/standard shoulder construction. Perceiving the construction and then
omitting the parameter is a contract violation.
  · ruffle (None / Present) is a garment-level RUFFLE / FRILL / FLOUNCE construction — a gathered or tiered strip of
    fabric applied as a visible edge or panel treatment. It is CATEGORY-SCOPED to DRESS ONLY: emit it on a Dress, and
    do NOT emit it on any other category (T-Shirt / Shirt / Sweater / Sweatshirt / Jacket / Coat / Trouser / Skirt /
    Jumpsuit) — on those the key must be absent entirely.
    ⛔ A ruffled COLLAR is reported as collar = Ruffle, not as this parameter — this is how a ruffled blouse/shirt is
    recorded. ⛔ A ruffled SKIRT is reported as surface = Gathered. ⛔ Ordinary gathering, drape, pleating or fullness
    is NOT a ruffle — pleating is surface = Pleated, gathering is surface = Gathered.`;

// ══ D2 · PRODUCER CONTRACT-INTEGRITY PREVENTION (CEO Decision 2026-08-23) ════════════════════
// Layer 1 of the two-layer D2 design: the Producer is steered to emit contract-valid output.
// The Validator remains the independent hard enforcement authority (Layer 2) and still rejects
// invalid output if this prevention fails. ⛔ §4.6 FIREWALL: nothing here licenses controller
// repair — invalid Producer output must remain visible to the Validator.
// The six families are exactly the Batch 003 recurrence families named in §4.1–§4.5 (+ D1's mirror).
// Rendered LAST in buildPrompt() so it is the final instruction the model reads before answering.
const CONTRACT_SELF_CHECK = `[⛔ CONTRACT SELF-CHECK — run this over your JSON BEFORE you return it]
Every one of the following was produced by real extractions and rejected by the validator. Re-read your own output and
fix any that apply. These are hard contract violations, not style preferences:
  1. NOT-APPLICABLE KEY EMITTED — a parameter that does not apply to this category must be OMITTED ENTIRELY. The key must
     not exist. ⛔ Do NOT emit it as ABSENT, "None", NOT_VISIBLE or UNKNOWN "just to be safe". (Real failures:
     closure_type on a Trouser · shoulder_span on a Jacket · shoulder_structure on a Sweatshirt.)
  2. APPLICABLE KEY OMITTED — the mirror error, and the more common one. If a parameter DOES apply to this category you
     must emit it, even when the feature is plainly not there. Silence is not an observation. (Real failures: rib_hem,
     hood, front_opening_extent, neckline_shape, neckline_position, decorative_detail and attachment simply missing.)
     Choose the correct negative state instead: semantic "None" where the domain lists None, otherwise ABSENT.
  3. SEMANTIC None REQUIRED — if the parameter's domain contains "None", visible absence is OBSERVED + value "None".
     ⛔ Never ABSENT. (Real failures: pocket · ruffle · rib_hem emitted as ABSENT.)
  4. SEMANTIC None ILLEGAL — if the domain does NOT contain "None", never write "None" as a value. Use ABSENT.
     (Real failures: pattern · graphic emitted with "None".)
  5. OBSERVED WITHOUT A VALUE — state OBSERVED always carries its canonical value. (Real failure: pattern OBSERVED with
     no value, three separate times.)
  6. MULTI OBSERVED WITHOUT values[] — an OBSERVED MULTI parameter must carry values[]; the scalar "value" is not a
     carrier. (Real failures: surface · decorative_detail · attachment OBSERVED with an empty values[].)
  7. DESCRIPTOR NECESSITY NOT ACTUALLY DECIDED — every target carries "descriptor_need", and it is a judgment you made,
     not a default. ⛔ "NOT_NEEDED" because the garment looked plain, or because nothing stood out, is WRONG — quiet
     garments carry their identity in proportion, drape and how the parts meet, none of which the fields hold. If you
     cannot certify that the fields + colour fully reconstruct it, the answer is REQUIRED. ⛔ "UNDETERMINED" is not
     available to you. REQUIRED requires non-empty "reconstruction_gaps" AND non-empty "descriptor"; NOT_NEEDED requires
     both empty.
  8. DESCRIPTOR MERELY RESTATES THE FIELDS — a descriptor that repeats fit / sleeve / material / length adds nothing and
     closes no gap. Every clause must carry what the enumerated fields cannot. Delete clauses that do not.
  9. DESCRIPTOR ASSERTS WHAT YOU DID NOT SEE. Check the clause against three questions:
     · IDENTITY — am I claiming, as fact, who made it or where it came from? ⛔ brand, designer, authenticity,
       provenance, collection, SKU. "Chanel jacket" is fabricated. Also ⛔ hidden construction, fibre content, cost,
       occasion, quality, taste or the wearer's intent stated as fact.
     · ANALOGY — if I named a widely recognised construction reference, did I mark it as resemblance
       ("Chanel-like", "-style", "resembles") AND does it actually close a gap? A famous name used as decoration
       is not an observation.
     · INFERENCE — is it necessary (fact alone will not close the gap), explicitly marked ("may", "appears",
       "possibly", "seems"), gap-relevant, non-contradictory, non-evaluative and non-scoring? If any answer is no,
       drop the clause. ⛔ Never upgrade an inference into a fact.
     This is about what you observed, NOT which words you used — visible morphology is legitimate content.
 10. CROSS-TARGET RELATION WRITTEN INTO A TARGET — a relationship between targets belongs ONLY in top-level
     "cross_target_visual_relations", named once, with 2 or more distinct target_ids. ⛔ Never inside a target
     descriptor, never duplicated into both, never with a single target, and it never declares a suit or a pair.
 11. DESCRIPTOR LENGTH CHASED A NUMBER — you stop when the Reconstruction Gap is closed, not at a word count. There is
     no minimum and no maximum. ⛔ Padding to look thorough and trimming a necessary observation are both wrong.
⛔ Emitting a structurally invalid observation is worse than emitting UNKNOWN honestly. Nothing downstream will repair
your output — an invalid record is rejected, not corrected.`;

// D-4 Location Contract (CA#16) — optional per-value component binding on eligible MULTI values.
// EI P3 COVERAGE (D6) — CEO 2026-09-03. Canonical→production restoration of an ALREADY-APPROVED
// vocabulary (EI P3 Canonical §6, approved 2026-08-01). Deliberately its OWN section, not part of
// locationGuide(): coverage and location are different questions and the location contract stays
// byte-identical.
function coverageGuide() {
  const R2 = require('./producer_rules_v1');
  return [
    `OPTIONAL, and only on the values listed below — a value entry may carry "coverage", meaning HOW MUCH OF THE GARMENT that value covers.`,
    ``,
    `⛔ COVERAGE IS NOT FOR EVERY VALUE. It belongs only to a distinct surface / material / decorative treatment, and ONLY these values take it:`,
    ...Object.entries(R2.COVERAGE_EVIDENCE_MAP).map(([p, m]) => `    ${p}: ${Object.keys(m).join(' · ')}`),
    `  Every OTHER value takes NO coverage. An ordinary material identity (Cotton, Wool, Leather, Suede, Denim, Knit, Synthetic, Silk, Velvet, Padding), a functional attachment (Belt, Epaulette, Storm Flap), plain Embroidery, Piping and Gathered are NOT treatments whose extent is reported — writing a coverage on any of them is a contract error.`,
    `Exactly three values, nothing else: ${R2.COVERAGE.join(' · ')}`,
    `  Localized = the value appears on a limited part of the garment (a lapel facing, a cuff, one panel, one trim run).`,
    `  Partial   = it appears over a substantial part, but is NOT the garment's dominant character (a yoke plus sleeves; the skirt portion of a dress).`,
    `  Dominant  = it IS the garment's character over most or all of it (a fully sequinned dress, an all-over quilted shell, satin sheen across every panel).`,
    ``,
    `⛔ COVERAGE IS NOT LOCATION. "locations" says WHICH COMPONENT carries the value; "coverage" says HOW MUCH of the garment it covers. Neither one implies the other, and a value may carry both — a glossy lapel facing is locations [{"component":"Lapel"}] AND coverage "Localized". Never read a coverage off a component, and never read a component off a coverage.`,
    `⛔ REPORT ONLY WHAT YOU SEE. Judge the visible extent of that value on the garment in THIS image. No percentage, no number, no estimate for a part of the garment that is out of frame. If you cannot judge the extent, omit "coverage".`,
    `⛔ COVERAGE IS NOT AN IMPORTANCE JUDGEMENT. It never says whether a feature is expressive, striking, fashionable, strong or weak. Never output Weak / Meaningful / Strong, never output I / Neutral / E, and never output Small / Medium / Large / Minor / Major / Full / Global — those are not canonical coverage values.`,
    `⛔ ONLY ON A VALUE YOU OBSERVED. Coverage belongs to an observed value. Never attach it to an ABSENT / NOT_VISIBLE / UNKNOWN observation, and never invent one to fill the field.`,
    `⛔ PER VALUE. Each value entry carries its own coverage and two values may differ — a quilted body with a fur-trimmed collar is Quilted coverage "Dominant" AND Fur Trim coverage "Localized". Never copy one value's coverage onto another, and never emit one coverage for the garment as a whole.`,
    ``,
    `Examples:`,
    `  surface Glossy            -> {"value":"Glossy","coverage":"Localized","locations":[{"component":"Lapel"}]}`,
    `  surface Quilted           -> {"value":"Quilted","coverage":"Dominant"}`,
    `  attachment Metal Hardware -> {"value":"Metal Hardware","coverage":"Partial"}`,
    `  material Fur              -> {"value":"Fur","coverage":"Localized","locations":[{"component":"Collar"}]}`,
    `  ⛔ WRONG — material Wool   -> {"value":"Wool","coverage":"Dominant"}   a plain cloth identity is not a treatment; emit {"value":"Wool"} with NO coverage.`,
    ``,
    `⛔ NOT on graphic (its own Localized/Dominant value already states its coverage — do not restate it), NOT on pattern (a pattern is all-over by definition), NOT on exposure_opening.`,
  ].join('\n');
}

function locationGuide() {
  const R2 = require('./producer_rules_v1');
  return [
    `OPTIONAL. On ${R2.LOCATION_ELIGIBLE.join(' / ')} ONLY, a value entry may carry "locations" saying WHICH GARMENT COMPONENT visibly carries that value.`,
    `Do NOT emit locations on exposure_opening (its values already say where they are).`,
    ``,
    `Canonical components (use these EXACT tokens, nothing else):`,
    `  ${R2.LOCATION_COMPONENTS.join(' · ')}`,
    `Component meanings that are easy to confuse:`,
    `  Body       = the main body of a top / sweater / sweatshirt / jacket / coat.`,
    `  Bodice     = the upper-body section of a DRESS or JUMPSUIT (a dress/jumpsuit has a Bodice, never a "Body").`,
    `  Skirt Body = the skirt portion — of a SKIRT, or the lower skirt of a DRESS. (Never output "Skirt" as a component.)`,
    `  Leg        = the leg portion of a TROUSER or JUMPSUIT. Do NOT output Thigh / Knee / Calf / Ankle.`,
    `  Hem        = the garment's lower finished edge (including a trouser or skirt bottom).`,
    `  Cuff       = use ONLY where an actual cuff construction exists — a plain trouser bottom is Hem, not Cuff.`,
    `  Shoulder   = a feature sitting on the shoulder area. This is location ONLY — it never changes shoulder_structure / shoulder_drop / shoulder_span / shoulder_connection.`,
    ``,
    `Optional refinement "descriptor" — exactly two tokens, nothing else:`,
    `  "Panel" = an assembly piece. NEVER on its own — it ALWAYS needs a component, e.g. {"component":"Sleeve","descriptor":"Panel"}.`,
    `  "Edge"  = a boundary/trim run. May be used WITH a component ({"component":"Collar","descriptor":"Edge"}) or ALONE ({"descriptor":"Edge"}) when the feature follows the garment's general outer edge.`,
    ``,
    `Examples across categories:`,
    `  Jacket   surface Glossy      -> [{"component":"Lapel"}]`,
    `  Jacket   material Cotton     -> [{"component":"Collar"}]        (corduroy collar on a synthetic shell)`,
    `  Dress    surface Lace        -> [{"component":"Bodice"}]`,
    `  Dress    material Silk       -> [{"component":"Skirt Body"}]`,
    `  Trouser  material Leather    -> [{"component":"Waistband"}]`,
    `  Trouser  surface Lace        -> [{"component":"Hem"}]           (lace at the trouser bottom = Hem, not Cuff)`,
    `  Jumpsuit material Cotton     -> [{"component":"Bodice"}] and material Denim -> [{"component":"Leg"}]`,
    `  Skirt    surface Pleated     -> [{"component":"Skirt Body"}]`,
    `  MULTI-COMPONENT: material Knit on both body and hood -> ONE value entry with [{"component":"Body"},{"component":"Hood"}]`,
    `  decorative_detail Embroidery -> [{"component":"Pocket"}]  ·  Sequin-Beading -> [{"component":"Strap"}]`,
    `  decorative_detail Piping     -> [{"descriptor":"Edge"}]   ·  or [{"component":"Collar","descriptor":"Edge"}]`,
    `  A trim run that follows the garment outline -> [{"descriptor":"Edge"}]`,
    ``,
    `RULES:`,
    `- Do NOT invent localization. If you cannot actually see which component carries the value, omit "locations" entirely.`,
    `- OMIT "locations" when the value applies across the garment generally — there is no "Whole Garment" component, and omission already means garment-wide.`,
    `- Do NOT use coordinate-style words as components or descriptors: no Front / Back / Left / Right / Upper / Lower / Side / Center, and no Front Panel / Upper Sleeve / Lower Leg / Left Shoulder.`,
    `- Do NOT repeat a canonical value to express several components. ONE value entry carries multiple "locations" instead.`,
    `- locations are about WHERE the value sits. Never use them for how large, how dominant, how contrasting, or how important a feature is.`,
    `- "locations" is separate from "region": region stays whole_garment/upper/lower and is unaffected.`,
  ].join('\n');
}

const POCKET_BLOCK = `[POCKET — observe independently; no inference]
Observe pocket (None/Present), and only if Present and readable: pocket_construction (Inset=set-in/welt/jetted, Applied=patch)
and pocket_projection (Flat=flush | Projected=stands away, not an independent 3-D volume | Volumetric=independent 3-D volume: gusset/bellows/box/pouch/cargo).
A visible flap does NOT imply Applied, Projected, or Volumetric. An Applied (patch) pocket is NOT automatically Projected or Volumetric.
Conversely, a pocket with its own gusseted/bellows 3-D body (e.g., a cargo pocket) is Volumetric, not merely Projected — do not under-read a true 3-D pocket body as Projected.
Multiplicity is metadata: "count" (discrete repetition) / "density" (sparse|moderate|dense, distributed) — never a separate parameter.
POCKET MORPHOLOGY STATE — when pocket = Present you must answer construction and projection for every pocket entry you report. Never leave one out silently. (These are answered INSIDE each "pockets" entry — see POCKET INSTANCES below.)
  · morphology readable -> state OBSERVED with a canonical value. Do NOT omit it, and do NOT downgrade a reading you can actually make.
  · the evidence you need is BLOCKED FROM VIEW -> state NOT_VISIBLE, value null. That means: a hand, arm or object covers the pocket; the opening or pocket body is occluded; the pocket is outside the crop; or the specific region you would have to look at (the opening edge, the seam, the side depth) simply is not in the picture.
  · the region IS in view but the value cannot be settled from it -> state UNKNOWN, value null. That means: you can see the pocket area yet cannot tell set-in from patch, or cannot tell how far the body stands off because no side depth is legible.
  · These two are judged PER PARAMETER: construction can be NOT_VISIBLE while projection is UNKNOWN, or either can be OBSERVED while the other is not.
  · UNKNOWN is NOT for hard calls. If the morphology is legible, a canonical value is required — choosing UNKNOWN to avoid committing is a contract violation, exactly as inventing a value would be.
  · When pocket is NOT Present, do not report pocket morphology at all — that is a different situation (not applicable), not an uncertain one.

POCKET INSTANCES — "pockets" is the ONLY way to report pocket morphology
Every pocket you report lives in a "pockets" array inside the pocket observation, and each entry
keeps its own location + construction + projection together so the pairing is never lost:
  "pocket": {
    "state": "OBSERVED", "value": "Present", "region": "whole_garment", "evidence": ["..."],
    "pockets": [
      { "location": "Chest",
        "construction": { "state": "OBSERVED", "value": "Applied", "evidence": ["..."] },
        "projection":   { "state": "OBSERVED", "value": "Flat",    "evidence": ["..."] } },
      { "location": "Lower Front",
        "construction": { "state": "OBSERVED", "value": "Applied",     "evidence": ["..."] },
        "projection":   { "state": "OBSERVED", "value": "Volumetric",  "evidence": ["..."] } }
    ]
  }
ALWAYS emit "pockets" when pocket = Present — for one pocket, for a homogeneous set, and for
groups that differ. Report one entry per distinguishable pocket group; a single pocket or one
continuous pouch is ONE entry. Decide groups from what you can SEE, never from the garment's name.
"Cargo", "utility" or "tactical" is not a reason to add entries; visibly distinct groups are.
LOCATION — exactly these four tokens, nothing else:
  Chest       = upper front, chest-level pocket group
  Lower Front = lower-front pocket group; for a TROUSER this also covers the front-hip pockets
  Sleeve      = a pocket on the sleeve / arm
  Leg         = a pocket on a trouser or jumpsuit leg
  Never output Side, Back, Left, Right, Hip, Thigh, a free-text position, or any coordinate.
RULES:
  · Left/right symmetry is NOT an instance distinction. If the left and right pockets of a group share
    a morphology, they are ONE entry. Never split a single pocket (such as one pouch spanning the
    front) into two entries.
  · "pockets" is not a count. Do not add entries to represent how many pockets exist, and do not treat
    the number of entries as the garment's pocket count — occlusion means you often cannot see them all.
  · Each entry's construction and projection use the SAME four states and the SAME rules as the scalars
    above: readable -> OBSERVED + canonical value; blocked from view -> NOT_VISIBLE, value null; visible
    but unsettleable -> UNKNOWN, value null. Judge them per parameter, per instance.
  · NEVER invent an entry. Only report a pocket group you can actually see. If you can see that pockets
    exist but cannot separate them into distinct groups, report ONE entry covering what you can see —
    do not omit the array, and do not manufacture groups you cannot distinguish.
  · Do NOT emit pocket_construction or pocket_projection at the top level — those keys are retired as
    an answer form. The entries carry that information.

POCKET MORPHOLOGY IS MANDATORY WHEN pocket = Present — ONE RULE
  IF pocket = Present  ->  emit a non-empty "pockets" array. Always. There is no alternative form.
"pockets" is NOT a multi-pocket-only structure. Use it for EVERY case:
  · a single pocket, or one continuous pouch across the front  -> ONE entry
  · several pockets that all share the same morphology         -> ONE entry for the group
  · groups that differ in morphology or location               -> one entry per group
  · pockets you can see but whose morphology you cannot read   -> still ONE entry (see below)
Each entry pairs a location with its two morphology observations:
  { "location": "<Chest|Lower Front|Sleeve|Leg>",
    "construction": { "state": "...", "value": ..., "evidence": ["..."] },
    "projection":   { "state": "...", "value": ..., "evidence": ["..."] } }
  · NEVER omit "pockets" when pocket = Present. An entry you are unsure about is still required.
  · If you cannot read a morphology, keep the entry and answer with a state: blocked from view ->
    NOT_VISIBLE with value null; visible but not settleable -> UNKNOWN with value null. These are
    valid ANSWERS. Silence is not a readability answer, and it is not a way to avoid committing.
  · construction and projection are judged independently — one may be OBSERVED while the other is
    NOT_VISIBLE or UNKNOWN.
  · Do NOT emit pocket_construction or pocket_projection at the top level. Those keys are retired as
    an answer form; the entries carry that information.
  · Left/right symmetry is not a distinction: one pouch, or a symmetric pair sharing a morphology, is
    ONE entry. Never split a single pocket into two entries.
  · The number of entries is not a pocket count — report the groups you can actually see.`;

const DISCIPLINE_BLOCK = `[OBSERVATION DISCIPLINE — do NOT over-read; ordinary appearance is not a feature]
Report a feature ONLY when its specific structure is actually visible. Ordinary fabric appearance is NOT a feature.
- surface (Pleated/Gathered/Quilted/Textured Knit/Lace/Mesh/Treated Surface/Reflective/Glossy/Semi Transparent/Transparent/Exotic-Skin) = a distinct constructed, applied, or optical surface treatment (MULTI: list every co-occurring value). Emit a surface value ONLY when such a treatment is clearly visible. Ordinary woven grain, visible weave, melange/heather yarn, brushed or fleece nap, sheen, or lighting variation are NOT surface values. "Textured Knit" keeps its canonical meaning — a genuinely distinct raised/structured knit texture — and does NOT apply to ordinary knit jersey or ordinary woven cloth. Ordinary FINE rib (as on a jersey or basic ribbed knit top) is NOT Textured Knit; reserve Textured Knit for a PRONOUNCED structural knit texture (chunky/bold rib, cable, waffle, popcorn, aran). Judge Textured Knit from the garment BODY: a ribbed finish at the cuffs, hem, collar or placket alone does NOT make the body a Textured Knit — a smooth/plain knit body with ribbed trims is surface ABSENT. Emit Textured Knit only when the garment BODY itself carries the pronounced raised/repeated knit structure. If no distinct surface treatment is present, use ABSENT.
- SURFACE UNCERTAINTY: if a surface phenomenon is clearly VISIBLE but you cannot determine WHICH canonical treatment produced it (e.g. a raised/patterned surface that could be embroidery, jacquard weave, print or another technique, and the image does not settle it), emit surface with state UNKNOWN and no value. Do NOT pick the nearest-looking canonical value to avoid saying "I don't know", and do NOT invent, blend, approximate, compound or paraphrase a token that is not in the list above — writing something like "Textured Surface" is a contract violation. UNKNOWN (visible but indeterminate) is the correct, expected answer in that situation; ABSENT is wrong there because the phenomenon IS visible. This changes nothing about the existing values: Textured Knit, Treated Surface, Quilted, Lace, Mesh, Reflective, Glossy, Semi Transparent, Transparent and Pleated/Gathered each keep their exact canonical meaning and must still be emitted whenever they ARE determinable.
- surface Exotic-Skin = a PRONOUNCED exotic-skin-like surface appearance — a clearly visible crocodile / alligator / python / snake / lizard / ostrich-quill or comparable exotic-hide scale, quill or plate structure covering the surface. Judge the APPEARANCE only: real, faux and embossed synthetic all count equally, and you must NOT try to decide which it is. ⛔ Do NOT emit Exotic-Skin from the material alone — ordinary Leather, Suede, pebbled or grained hide, plain vinyl and ordinary woven cloth are NOT Exotic-Skin. ⛔ Do NOT emit it for an animal PRINT or GRAPHIC that merely depicts a skin (leopard spots, zebra stripes, a snake-print pattern flat on the cloth) — that is a pattern/graphic observation, not a surface structure; Exotic-Skin needs the raised/scaled/quilled surface relief itself to be visible. ⛔ Do NOT emit it from the product name, category or any text you cannot see on the garment. Faint, ambiguous or barely-discernible grain is NOT Exotic-Skin — if you can see a surface phenomenon but cannot tell whether it is a genuine exotic-skin structure, use the SURFACE UNCERTAINTY rule (state UNKNOWN, no value).
- surface Glossy / Semi Transparent / Transparent = OPTICAL surface properties (observe them, never infer from the material or surface type): Glossy = a visibly high-luster / shiny finish (patent, glossy leather, glossy vinyl, wet-look) — distinct from Reflective (a stronger light-returning/mirror-like behavior); do NOT infer Glossy from Satin / Leather / Vinyl / coated cloth — emit it only when a meaningful gloss is actually visible (Satin ≠ automatically Glossy). Semi Transparent = the fabric is visibly transmissive but not fully clear-through (e.g. chiffon, light voile). Transparent = clearly transmissive / see-through (e.g. clear PVC). Mesh is NOT automatically Transparent and Lace is NOT automatically Semi Transparent — judge the actual optical transmission you can see; a dense/lined mesh or backed lace may transmit nothing.
- surface finish_realization ("Baseline" | "Enhanced" | "Pronounced") = when you emit a surface finish value such as Glossy, ALSO report whether the finish is the ORDINARY one for this material and category or something deliberately added. "Baseline" = the sheen this material normally has anyway (an ordinary puffer or technical shell reflects light; ordinary leather has some sheen) — nothing was added. "Enhanced" = a deliberately treated or aesthetically pronounced finish clearly beyond that baseline. "Pronounced" = an extreme, dominant high-gloss realization. Ask yourself: would this material normally look like this? If yes it is Baseline. Omit the field if you cannot tell. ⛔ Never infer it from the material or the category — a leather coat is not automatically Enhanced and a puffer is not automatically Baseline. ⛔ Never a number.
- surface treated_surface_realization ("Baseline" | "Distressed") = ONLY when you emit the surface value "Treated Surface", ALSO report which realization is VISIBLE on the garment surface itself. "Baseline" = the surface is treated in the ordinary way — washed, faded, whiskered, conventionally abraded, worn finishing — and the fabric is continuous and undamaged. "Distressed" = the fabric ITSELF is visibly and deliberately distressed — intentional fraying, distress patches or damaged treatment zones, shredding, tearing, deliberate surface disruption. Ask yourself: is this just a wash, or has the cloth itself been deliberately damaged? ⛔ Judge ONLY from what is visible on the garment. ⛔ Never infer it from the material, the denim category, the garment category, the product name, any description, or what you expect the score to be — washed denim is NOT automatically Distressed. ⛔ This is NOT how much area is affected — that is coverage. ⛔ This is NOT how expressive or important it looks — you are reporting what is there, never judging it. ⛔ Patches SEWN ONTO the garment (fabric patches, embroidered patches, appliqué) are NOT distress — those belong to decorative_detail. ⛔ Hanging strands or fringe are NOT distress — those belong to attachment. ⛔ Emit it ONLY on the Treated Surface value: never on Glossy, Reflective or any other surface value. Omit the field if you cannot tell from the image — omission is the correct answer, never a guess.
- pattern visual_dominance ("Subordinate" | "Dominant") = when you emit a pattern, ALSO report whether the all-over pattern DOMINATES the garment's visual impression or is present but subordinate to it. ⛔ This is NOT location and NOT extent: a pattern is all-over by admission, so "where" and "how much of the garment" are meaningless. A localized motif is a GRAPHIC, not a pattern. Omit if you cannot tell.
- category product_context ("General" | "Activewear-Performance") = the product context of the garment WITHIN its structural category. "Activewear-Performance" = an athletic / performance product — compression or technical knit, sports-bra or performance-top construction, leggings-type bottoms, athletic presentation. "General" = an ordinary garment of that category. ⛔ This NEVER changes the structural category: an activewear top is still its structural category, and there is no "Leggings Top" category. ⛔ Report it from construction and presentation, never from colour.
- pattern motif_complexity ("Simple" | "Compound") = when you emit a pattern, ALSO report how structurally complex the motif is. "Simple" = ONE repeating element or one geometric system (a plain stripe, a plain dot, a plain check). "Compound" = TWO OR MORE distinct motif elements, or one motif superimposed on another system (a stripe crossed by a second differently-scaled stripe; a floral laid over a check). Report what you can SEE in the repeat unit. Omit the field if the motif structure is not readable. ⛔ Do NOT derive it from the pattern token — Linear is not automatically Simple and Repeat is not automatically Compound. ⛔ Never a number.
- pattern (Linear/Grid/Repeat) = a deliberate repeating colour/print motif. Emit a pattern value ONLY when a distinct repeating motif is visible. Ordinary fabric weave, twill lines, yarn structure, faint tonal variation, or fabric grain are NOT a pattern. A visually solid garment → ABSENT (do not read weave as Grid).
- QUILTING GEOMETRY IS SURFACE EVIDENCE, NOT PATTERN EVIDENCE (evidence-ownership firewall): Linear or Grid geometry created SOLELY by quilting — quilt stitches, quilt channels, quilted baffles, quilted panel divisions, diamond quilting, square/grid quilting, horizontal or vertical quilting — is consumed by surface = Quilted and must NOT also be emitted as pattern = Linear or pattern = Grid. Never report the same quilting geometry as both a surface treatment and a pattern. TEST: "Would this Linear/Grid pattern still exist if the quilting stitch/channel geometry were removed?" If NO, the evidence is quilting-owned → emit surface = Quilted and pattern = ABSENT. If YES, an INDEPENDENT textile pattern is present and pattern MUST still be emitted: a plaid/check cloth that is also quilted is legitimately surface = Quilted + pattern = Grid, and a printed stripe cloth that is also quilted is legitimately surface = Quilted + pattern = Linear. This firewall removes NEITHER Linear NOR Grid from the pattern vocabulary and does NOT forbid the Quilted + pattern combination itself — it only prevents the SAME physical evidence from being counted twice.
- graphic (Localized/Dominant) = a distinct PLACED graphic element (logo, slogan, printed image) applied to a region. An all-over repeating motif (paisley, floral, check, stripe, dot) is a PATTERN, not a graphic → graphic ABSENT. Never report the same all-over motif as both a pattern and a graphic.
- asymmetry (None/Present) = a deliberate LEFT–RIGHT IMBALANCE in the garment's OWN CONSTRUCTION: the garment's two sides are not mirror images of each other. Compare the garment's left half against its right half and read what the garment is CUT AND SEWN to do. Present = a construction line that is genuinely uneven side to side — an uneven, stepped, angled or high-low HEM; a waist or hem line that sits at a visibly different height or angle on one side; a diagonal, wrap or one-sided closure edge that goes BEYOND the garment's conventional closure overlap (see the exclusion below); one-shoulder or single-strap construction; a panel, drape, gather, tie or ruffle that exists on one side with no counterpart on the other. None = the two sides mirror each other.
  ⛔ CONVENTIONAL CLOSURE OVERLAP IS NOT ASYMMETRY. A double-breasted, wrap-style or crossover TAILORED FRONT in which one front panel conventionally crosses or overlaps the other — including a one-sided row of buttons and a closure edge that is therefore off-centre — is the garment's STANDARD closure geometry, not a left–right design imbalance: report asymmetry = "None" for a garment whose only side-to-side difference is that conventional overlap. Ask instead whether the DESIGN deviates beyond the closure convention — an uneven or high-low hem, a one-shoulder bodice, a one-sided cascading panel or drape remain asymmetry = "Present" exactly as defined above, including on a garment that ALSO has a wrap/double-breasted front.
  ⛔ ONE-SIDED SLIT ALONE IS NOT ASYMMETRY (C-2). A slit is inherently a LOCALIZED construction that normally occurs on one side; sitting on one side does not by itself make the garment an asymmetric DESIGN. A garment whose only one-sided feature is an ordinary slit is asymmetry = "None", and the slit is reported by the slit parameter where it belongs. ⛔ This is the ONLY categorical exclusion, and it does NOT generalise. A wrap or diagonal closure that actually produces a visible asymmetric design IS asymmetry, and so is any other genuinely asymmetric construction — a localized detail is not disqualified merely for being localized. ⛔ Nor does a slit SUPPRESS asymmetry that comes from somewhere else: if the garment carries an independent asymmetric design (a one-shoulder bodice, an uneven hem, an asymmetric wrap or panel), report asymmetry = "Present" even though a slit is also present. Ask only: setting the slit aside, is this garment's own construction genuinely uneven side to side?
  ⛔ READ EVERY GARMENT'S OWN HEM AND WAIST LINE. asymmetry is a UNIVERSAL observation, not a lower-garment question: an uneven hem or an unbalanced waistline is asymmetry on a top, shirt, sweater or outer layer exactly as it is on a skirt or dress. Check the garment's own lower edge before answering None — a garment whose body reads symmetric at the shoulders and chest may still be Present because its hem or waistline is deliberately uneven. Do not settle asymmetry from the upper body alone.
  ⛔ POSE IS NEVER ASYMMETRY: a raised arm, a turned or tilted stance, a hand in a pocket, cloth pushed or bunched to one side by movement, or a randomly falling fold does not make the garment asymmetric. If the imbalance would disappear when the garment hung straight, it is pose, not construction.
  ⛔ THE MIRROR TEST IS NOT SATISFIED BY THE DOMINANT STRUCTURE ALONE. A garment whose main body, panels or tiers clearly mirror side to side can still be Present because of ONE element that exists on a single side. Before you answer None, sweep the whole garment for a single-sided feature and say what you checked: a panel, tail, flap, sash, tie, drape, knot, wrap edge, slit, split, strap, fastening or trim that has no counterpart on the other side. If you find one, the answer is Present even though everything else mirrors. "The tiers/panels/seams mirror" is not by itself an answer — it describes the structure you compared, not the sweep you performed.
  ⛔ ORDINARY DIRECTIONAL DETAIL IS NOT ASYMMETRY: a single chest pocket, a placket that laps one way, a side zip, a single vent or a brand label are conventional construction and remain None. The distinction is DESIGN INTENT MADE VISIBLE: a conventional fastening or pocket that happens to sit on one side is None, while a piece of the garment's own outer shape — a hanging panel, an uneven edge, a one-sided drape or tie — is Present.
  ⛔ SEMANTIC None: the asymmetry domain CONTAINS "None", so a garment you have actually compared and found symmetric MUST be OBSERVED with value "None" — never ABSENT. Use NOT_VISIBLE when one side is cropped or occluded so the halves cannot be compared, and UNKNOWN when both sides are in frame but pose or drape prevents a reliable reading.
- collar (None/Shirt/Stand/Sailor/Peter Pan/Tie/Ruffle/Shawl/Notched/Peak) describes an actual COLLAR structure at the neckline. A bare neckline with no collar band or structure (crew, scoop, open V-neck) → collar = None. Do NOT convert an open neckline into Stand or any collar without a visible standing/structured collar.
- Stand requires an INDEPENDENT collar piece — a distinct band constructed as its own collar. A neck finish that exists only as part of another component is NOT a Stand collar and the garment is collar = None: the top edge of a HOOD opening (a hood casing/facing rising at the neck), a zip-guard / chin-guard flap at the top of a front zip, and the plain finishing band of a pullover neckline are all neck FINISHES, not collars. Where a hood is present, emit Stand only if a distinct collar band is visible that is separate from the hood opening itself; if the standing material at the neck is simply where the hood begins, that is collar = None. Conversely a genuine standing band (e.g. a ribbed or self-fabric band that stands up on its own, with or without a hood elsewhere on the garment) IS Stand — do not downgrade a real collar to None merely because the garment also has a hood.
- For a tailored lapel, the PRIMARY discriminator is the notch at the collar↔lapel seam. Notched = a visible cut notch/step where the collar meets the lapel (the common suit/blazer lapel); the lower lapel edge does NOT rise into a point. Peak = NO notch — the lower lapel edge extends UP into a sharp point overlapping above the collar seam. A wide lapel, or one whose edge merely slants upward, is NOT by itself Peak — only a genuine pointed, notch-less peak is Peak. If a notch/step is visible → Notched. If the seam geometry cannot be read reliably, use UNKNOWN; do not guess the flashier label.
- waist_definition (Undefined/Defined/Cinched): ★ JUDGE THE OBSERVABLE RESULTING WAIST MORPHOLOGY, NOT THE MECHANISM THAT PRODUCES IT. The question is never "was the garment pattern originally cut with this waist shape?" — it is "what does the waist visibly DO in this image?". The shaping may come from intrinsic tailoring/pattern construction OR from an applied mechanism (belt, tie, drawstring, elastic, gathering, or any other visibly effective waist-control construction). Intrinsic and applied mechanisms are judged by the SAME standard. Defined = the waist is visibly SHAPED — the silhouette clearly narrows in at the waist and widens toward the hip (via cut/seaming), OR a belt/tie sits at a natural waist and establishes it, WITHOUT the marked inward suppression required for Cinched. Do NOT default to Undefined just because there is no belt: a visible waist-nipping silhouette IS Defined. Undefined = no visible waist shaping (a straight/column silhouette) — a close or bodycon fit that does NOT visibly narrow the waist is Undefined even when Slim; never infer Defined from Slim/bodycon fit alone. The CONVERSE also holds: do NOT convert a defined or tailored waist into a Slim fit — waist shaping is already recorded here by waist_definition, and fit records the garment's overall ease and volume, judged independently. A garment can be Defined at the waist and Regular in fit; only call the fit Slim when the garment as a whole is visibly close to the body. Cinched = the waist shows clear inward SUPPRESSION — visible constriction, circumference reduction, or gathering/compression that materially shapes the garment at the waist (drawstring pull, strong nip, ruching, or a belt/tie pulling the body visibly inward). ⛔ MECHANISM PRESENCE IS NEVER SUFFICIENT: a belt ALONE does NOT make it Cinched — a belt at a defined waist without marked inward constriction is Defined. The same holds for a tie, drawstring or elastic that is merely PRESENT. A belt hanging loosely, a decorative belt, or a belt worn while the garment body stays essentially unsuppressed is Defined, not Cinched. Conversely a belt that visibly pulls the garment inward and reduces the waist circumference IS Cinched — read the morphology, do not merely detect the accessory. If the belt is visible but the resulting waist morphology cannot be read, do not infer Cinched. ⛔ SILHOUETTE FIREWALL: Cinched does NOT imply a fit-and-flare or any other silhouette, and a belted garment is NOT automatically a silhouette change — a Straight/Regular garment can be Cinched at the waist. silhouette and waist_definition are separate observations. ⛔ FIT FIREWALL: Cinched does NOT imply Fitted — a Relaxed or Regular overall fit can carry a Cinched waist.
  WAIST DEFINITION STATE — waist_definition applies only after TWO applicability gates (SR FROZEN 2026-08-21):
  GATE 1 — CATEGORY: Jacket, Coat, Dress, Jumpsuit only.
  GATE 2 — LENGTH: the garment must extend below the waist. On Jacket: length "Cropped" or "Waist Length" → waist_definition is NOT APPLICABLE — DO NOT emit the key at all; length "Hip Length" → evaluate waist_definition. Coat / Dress / Jumpsuit remain eligible across their governed length domains (their lengths extend below the waist).
  · Length decides APPLICABILITY ONLY — ⛔ NEVER derive the waist VALUE from length ("Hip Length → Defined" is forbidden; a Hip-Length garment can be Undefined, Defined or Cinched).
  · When length itself is NOT_VISIBLE or UNKNOWN you cannot prove the garment is short — the category gate alone keeps waist_definition applicable, and waist_definition itself answers with the appropriate observation state (do NOT silently drop it because length is unreadable).
  · When applicable you must answer it with a state. Never leave an applicable waist_definition out silently.
  · the waist reads -> state OBSERVED with a canonical value. Straight/column with no shaping IS a reading: answer OBSERVED + Undefined. Do NOT omit it just because the answer is "no waist shaping".
  · the waist region is BLOCKED FROM VIEW -> state NOT_VISIBLE, value null. That means: the waist is outside the crop, or an outer layer, bag, arm or other object covers it, so the garment's own waistline cannot be seen at all.
  · the region IS in view but the garment's shaping cannot be settled -> state UNKNOWN, value null. That means: you can see the waist area yet cannot tell whether the garment itself is shaped there — e.g. the garment hangs open, is bunched by the pose, or is worn over/under another layer that masks its own contour.
  · Undefined is NOT the same as unreadable. Undefined is a POSITIVE observation that the garment has no waist shaping. If you cannot see or cannot settle it, use NOT_VISIBLE or UNKNOWN — never fall back to Undefined.
  · UNKNOWN is NOT for hard calls. If the waist is legible, a canonical value is required — choosing UNKNOWN to avoid committing is a contract violation, exactly as inventing a value would be.
  · Judge the GARMENT, not the body: a wearer whose own waist curves inward does NOT make the garment Defined. Do not infer the value from the garment's type (blazer/coat/dress) either.
  · On TROUSER and SKIRT this parameter does not apply at all — that is a different situation (not applicable), not an uncertain one.
- fit (Slim/Regular/Relaxed/Oversized) is a BODY-RELATIVE ease judgment based on the garment's overall three-dimensional silhouette (its shape/ease relative to the body). Fit readability is EVIDENCE-BASED, not image-type-based: fit CAN be OBSERVED whenever the garment's overall silhouette, volume and ease are clearly assessable — whether worn on a body OR shown unworn / product / on a form / laid out, as long as the piece still holds a readable 3-D shape (e.g. a structured coat, jacket, or dress photographed off-body). Set fit to UNKNOWN ONLY when the evidence is genuinely insufficient — the garment is pressed completely flat so volume/ease cannot be reliably judged, or pose / crop / occlusion hides the relevant silhouette — and NOT_VISIBLE if the fit region is cropped out of frame. Two guards, both required: do NOT infer fit from garment width alone in a flat image; and do NOT force UNKNOWN merely because no person is wearing the garment. When the shape is assessable, report the ACTUAL magnitude on the full canonical scale — do not default to the middle value; a visibly close-fitting garment is Slim (not Regular); use the exact canonical distinctions; do not compress magnitude.  [Run-3 magnitude + evidence-based readability]
- ⛔ FIT CONFOUND FIREWALL — fit reads the EASE OF THE GARMENT BODY AGAINST THE WEARER'S BODY, and nothing else may decide it. Ask one question: how much room is there between the garment body and the body inside it, and how far does the garment body stand away from it? BULK IS NOT EASE. None of the following is, on its own, evidence for Slim, Relaxed or Oversized: fabric thickness, weight or loft · padding, down fill, insulation or quilting · a stiff or self-supporting cloth · sleeve volume, or a puff/balloon/enlarged sleeve · a widening, flared or voluminous LOWER geometry · a large collar, lapel or cuff · a generally heavy or bulky overall impression. Every one of those is already carried by its own parameter — cloth thickness and self-support are fabric_behavior, sleeve volume is sleeve_volume, lower geometry is silhouette, component size is collar_scale / cuff_scale — and the SAME evidence may never be spent twice by also reading it as fit.
  · A padded, quilted, down-filled or heavy garment is NOT Oversized merely because the filling gives it bulk. Look past the thickness to the ease of the garment BODY: if that ease is ordinary the fit is Regular, and if the body still follows the wearer closely the fit is Slim — thick cloth does not forbid a Slim reading.
  · The converse is equally required: when the garment BODY genuinely stands well away from the torso and the body-relative ease is itself clearly enlarged, the fit IS Oversized — with or without padding. Padding neither creates nor prevents an Oversized reading; only ease does.
  · EXPANDED SHOULDER SPAN BELONGS TO FIT, NOT TO THE SHOULDER-END JUDGEMENT. When the garment body is widened so that the shoulder line reaches out beyond the wearer's own shoulders, that enlargement is part of the garment's proportion and IS legitimate fit evidence. ⛔ Do NOT convert it into shoulder_drop: shoulder_drop asks WHETHER THE NORMAL SHOULDER ENDPOINT IS PRESERVED OR LOST, so a wide garment that still forms a clear shoulder endpoint is shoulder_drop = None however far the frame extends. Read endpoint preservation for shoulder_drop and the body's ease for fit; a lowered-LOOKING junction produced by an enlarged frame is not by itself a dropped shoulder.
  · Report the actual body relationship in BOTH directions and do not compress toward Regular.
- ⛔ HOW TO READ FIT — SWEEP THE WHOLE GARMENT, THEN ANSWER ONCE. fit is a WHOLE-GARMENT reading, so it may never be settled from whichever single area first catches the eye. Before you answer, walk the garment's own load-bearing regions in order and note the ease at each:
  (1) the SHOULDER/UPPER span — how far the garment body reaches out past the wearer's own shoulders;
  (2) the CHEST / TORSO — how much room sits between cloth and body;
  (3) the WAIST and through to the HEM — whether the body stays close, hangs straight, or keeps standing away;
  and for a lower garment: the WAIST/HIP seat first, then down through the leg or skirt body.
  Then answer with the reading that describes THE GARMENT BODY AS A WHOLE. State in your evidence which regions you actually looked at.
  · ⛔ ONE REGION MAY NOT DECIDE THE WHOLE. "Roomy through the chest" or "close at the waist" is one observation from one place — it is not yet a fit answer. A garment that is ordinary at the torso but reaches well beyond the wearer's shoulders and stays wide to the hem is NOT ordinary: the enlargement is body-wide and the reading rises accordingly. Sweep first, decide second.
  · ⛔ LOCAL FEATURES ARE NOT THE GARMENT BODY. A wide or full sleeve, a flared or widening hem, a gathered panel, or one deep component tells you about that part only. Never spend it as fit evidence — sleeve fullness is sleeve_volume and lower flare is silhouette. Conversely, do not let one close-fitting area override a body that is enlarged everywhere else.
  · ⛔ "ORDINARY EASE" IS NOT AN ANSWER ON ITS OWN. If you write that the garment has ordinary ease you must say ordinary AGAINST WHAT — which regions you compared and what you saw there. An unanchored "ordinary/normal/moderate" reading is how a garment gets defaulted to Regular, and defaulting is a contract violation exactly as inventing a value would be.
  · ⛔ THE THREE BOUNDARIES — decide each by what you can see, in this order. Naming a value without being able to say which boundary you crossed is a default, not an observation.
    (a) Slim ↔ Regular — WHOSE OUTLINE ARE YOU LOOKING AT? Slim = the garment's outline substantially REPRODUCES the wearer's own outline; the body's shape is legible through the garment and the cloth follows it with little independent room. Regular = the garment carries visible room of its own; its outline is the garment's, not the body's, and the body's shape is no longer traced by it. A garment described as "following the torso", "close", or "conforming" has already answered Slim — do not then write Regular.
    (b) Regular ↔ Relaxed — DOES THE BODY STAND AWAY? Regular = ordinary room, cloth still hanging near the body. Relaxed = the garment body visibly stands away from the torso and hangs with generous room of its own, while still being built to this wearer's proportions.
    (c) Relaxed ↔ Oversized — ★ THE DECIDING TEST IS FRAME, NOT ROOM. Relaxed = generous ease INSIDE the wearer's own frame. Oversized = the garment's CONSTRUCTED FRAME IS ITSELF LARGER THAN THE WEARER'S — read it from where the garment is built, not from how much cloth there is: the shoulder line is drafted out past the wearer's shoulder points, the armhole/sleeve junction sits low on the upper arm, and the body is cut wider than its ease requires, so the garment reads as a larger garment placed on this body. When the frame exceeds the wearer, the answer is Oversized even if the ease elsewhere looks merely generous.
      ⛔ Width produced by LOFT is not an enlarged frame. Padding, down, quilting or heavy cloth can push a garment's outline past the wearer's shoulders while the garment underneath is still drafted to their frame — that is Relaxed (or less), never Oversized. Ask whether the garment was BUILT larger or merely FILLED thicker.
  · ⛔ DISCOUNTING BULK IS NOT THE SAME AS CONCLUDING ORDINARY. When you look past padding, loft, quilting or heavy cloth, finish the job: ask how much room remains between the garment body and the wearer once the thickness is set aside. If the body still stands clearly away after that, the answer is Relaxed or Oversized — subtracting the bulk must not collapse the reading to Regular by default. The same discipline applies in reverse: a thick garment whose body still follows the wearer closely is Slim.
- shoulder_structure (None/Mild/Strong/Extreme) = the VISIBLE OUTER SHOULDER CONTOUR — the shape the shoulder silhouette actually makes in the image. Judge the visible result, never the hidden cause. ⛔ NEVER infer or cite shoulder pads, padding, interfacing, internal reinforcement, tailoring or sewing construction, or any architectural build you cannot see. If it cannot be seen in the image, it cannot be evidence. Read exactly three things: (1) the direction and shape of the shoulder LINE ITSELF, (2) how clearly an endpoint is formed on that line, (3) how the contour turns from that endpoint into the sleeve. ⛔ SLEEVE-ORIGINATED SHAPE IS NOT A SHOULDER ENDPOINT: a gathered or puff sleeve cap, sleeve-cap fullness, sleeve volume, or any local bulge produced by gathering may change the silhouette near the shoulder, but a bulge created by the SLEEVE is never by itself a shoulder-structure endpoint. Judge the shoulder LINE, not the sleeve head sitting on it. Only an endpoint that reads independently on the shoulder line itself counts. Work through ALL FOUR STEPS in order — do NOT stop at Strong: STEP 4 must be evaluated whenever STEP 3 is YES. STEP 1 - does the shoulder line run ROUND and CONTINUOUS into the sleeve, with no readable endpoint or break on the line itself? -> None. A rounded, continuous contour is None even on a boxy, stiff, heavy, voluminous or utility garment. STEP 2 - otherwise, is there a readable endpoint or break on the shoulder line itself, while the shoulder is neither held in a sustained straight line nor substantially extended outward? -> Mild. A MODEST but clearly readable shoulder-line endpoint is ENOUGH for Mild - Mild does not require a strong or sharp break. The None-to-Mild boundary is ROUND CONTINUITY -> READABLE SHOULDER-LINE ENDPOINT. STEP 3 - otherwise, is the shoulder line held straight or near-horizontal across a span, OR does the shoulder reach substantially OUTWARD beyond the natural shoulder position, with a clear endpoint after which the sleeve turns distinctly downward? -> at least Strong. ⛔ Angle alone must NEVER decide Mild vs Strong. There is no degree threshold to measure and none to report: a shoulder line that slopes somewhat downward is still Strong when the outward extension is substantial. Now go to STEP 4. STEP 4 - Extreme is NOT a bigger Strong. The difference is a QUALITATIVE change of morphology at the endpoint, not magnitude. Does the shoulder endpoint/tip ITSELF visibly rise, turn upward, or form an unmistakable upturned/elevated shoulder tip, after which the sleeve contour clearly turns downward? -> Extreme. If the endpoint does not itself turn upward -> stay Strong. ⛔ VERY WIDE STRONG IS NOT EXTREME. ⛔ LARGE EXTENSION IS NOT EXTREME. A very wide shoulder, an oversized fit, a very long outward extension, a very straight shoulder, a strong horizontal line, or large shoulder volume are NOT Extreme on their own. Say Extreme only when you can point to the tip itself rising or turning upward. ⛔ Do NOT turn this into a fixed anatomical or numeric rule - the tip need not reach the neckline, the neck point, or any degree threshold; such cues may support your reading but never define it. ⛔ None of the following may raise or lower the reading on its own: garment fit, oversized fit, shoulder width by itself, sleeve_volume, a puff or gathered sleeve cap, quilting or fabric thickness, fabric stiffness, shoulder_drop, or any inferred padding or construction. If one of them changes the shoulder LINE itself in a way you can see, judge that visible line - never the cause behind it, and never a bulge that belongs to the sleeve. Report the actual magnitude; do not compress. fit and shoulder_structure are INDEPENDENT — never infer one from the other (a Slim garment is not therefore Strong-shouldered, and vice-versa).
- shoulder_drop (None/Dropped) = WHERE THE GARMENT'S SHOULDER CONSTRUCTION ENDS, RELATIVE TO THE WEARER'S ANATOMICAL SHOULDER END. The whole judgement is one comparison: you locate the wearer's own shoulder end, then you locate where the garment stops being a shoulder and starts being a sleeve, and you ask which is further out. ⛔ This is NOT "is there a seam and is the seam outboard" — a seam is only one of the ways the junction can show itself.
  ★ THE DECIDING QUESTION IS ENDPOINT PRESERVATION, NOT JUNCTION POSITION. Read it in this order and do not skip to the answer:
  STEP 1 — Locate the WEARER'S ANATOMICAL SHOULDER END: the point where their own shoulder stops and the upper arm begins. Read it from the visible BODY. ⛔ Do not use a garment seam as the anatomical reference — the seam is what you are about to judge.
  STEP 2 — ★ CHECK ENDPOINT PRESERVATION FIRST. Ask: does the garment form a CLEAR STRUCTURAL ENDPOINT corresponding to that normal shoulder end — a readable boundary that says "the shoulder ends HERE" before the sleeve takes over? If YES → None, unless clearly contradictory morphology shows this is not actually the shoulder endpoint. ⛔ THIS CHECK COMES BEFORE ANY QUESTION ABOUT WHERE THE SLEEVE JUNCTION SITS.
  STEP 3 — Only if NO clear normal shoulder endpoint is preserved, ask: does the shoulder construction continue past the normal shoulder end toward the UPPER ARM before transitioning into the sleeve? If YES → Dropped.
  STEP 4 — Sleeve-junction position is SUPPORTING EVIDENCE ONLY, never the primary discriminator. ⛔ "The junction is outboard, therefore Dropped" is PROHIBITED reasoning unless you have first evaluated endpoint preservation and found the endpoint LOST.
  STEP 5 — Only now consider other supporting morphology. It may never replace STEPS 1–3.
  · ★ THE TWO CASES YOU MUST TELL APART:
    CASE A — EXTENDED FRAME, ENDPOINT PRESERVED: the garment's shoulder frame reaches outward beyond the wearer's own shoulders, so the sleeve necessarily begins further out — BUT a clear shoulder endpoint is still visible. The outward placement is produced by the ENLARGED FRAME, not by loss of the shoulder. → None.
    CASE B — DROPPED CONSTRUCTION: no distinct normal shoulder endpoint is formed; the shoulder line flows continuously past the anatomical shoulder end and the transition into the sleeve happens on the upper arm. → Dropped.
  · ⛔ SEAM PRESENCE IS NOT THE CRITERION IN EITHER DIRECTION. A Dropped construction may still carry a seam, and a garment with no visible seam may still be None. But a CLEARLY PRESERVED normal shoulder endpoint is positive evidence FOR None — do not discount it because the junction sits further out.
  · ⛔ WIDTH / FIT FIREWALL — NONE OF THESE MAY DECIDE shoulder_drop ON ITS OWN: Oversized fit · a wide or extended shoulder span · garment width · shoulder-frame expansion · garment volume · padding · the absence of padding · a structured or relaxed overall look · sleeve volume · fabric stiffness or softness · the fit tier. Every one of them can EXPLAIN why a sleeve junction appears displaced outward — none of them IS shoulder drop. Read the endpoint.
  · ★ THE LEGAL COMBINATIONS FOLLOW FROM THAT. Oversized ≠ Dropped · Wide Shoulder Span ≠ Dropped · Outboard sleeve junction alone ≠ Dropped · No Shoulder Pad ≠ Dropped · Dropped ≠ Oversized. A garment may legitimately be Oversized with shoulder_drop = None (its frame is large, yet its shoulder still forms a clear endpoint), and a Regular or Relaxed garment may legitimately be Dropped (its shoulder endpoint is lost onto the upper arm even though the body is not enlarged). Report whichever the construction actually shows.
  · ⛔ shoulder_span is a DIFFERENT question — how wide/extended the shoulder FRAME appears; shoulder_drop asks whether the normal shoulder ENDPOINT is preserved or lost. Neither is derived from the other, and Extended span + None, Extended span + Dropped, and Regular span + Dropped are all legal when the morphology supports them.
  · ⛔ shoulder_structure is a DIFFERENT question — the SHAPE of the visible shoulder contour. Never infer either observation from the other: shoulder_structure = None together with shoulder_drop = Dropped is a normal, valid pair, and so is a strongly held contour whose junction sits at the natural shoulder (Strong + None).
  · Say in your evidence WHERE you placed the anatomical shoulder end and WHERE the junction fell relative to it. "Seam sits outboard" is not sufficient evidence on its own — outboard of what, judged against which point?
- sleeve_volume (Regular/Voluminous) = the VISIBLE VOLUME of the sleeve BODY, relative to an ordinary sleeve for that garment. SEPARATE from sleeve length. Ask ONE question: is the sleeve within an ordinary sleeve-volume envelope, or has the sleeve volume been INTENTIONALLY ENLARGED so that the enlarged volume is itself a visible design feature? Regular = an ordinary sleeve-volume envelope. Do NOT split narrow vs standard vs modestly relaxed — they are all Regular, and Regular does NOT mean a narrow sleeve. ⛔ Thickness is NOT volume: a sleeve that is bulky because of fabric weight, quilting, padding, down or insulation is still Regular unless the sleeve's own envelope was deliberately enlarged as a design choice. An ordinary puffer or down sleeve is Regular. Voluminous = the sleeve body/envelope is intentionally enlarged beyond an ordinary sleeve and that enlargement reads as a deliberate design feature — e.g. a puff sleeve, a balloon sleeve, a deliberately expanded or rounded sleeve body. ⛔ NEVER apply these shortcuts: puffer -> Voluminous, down -> Voluminous, quilted -> Voluminous, thick fabric -> Voluminous, oversized garment fit -> Voluminous. Read the SLEEVE's own morphology, not the garment's padding, material, surface or overall fit. ⛔ Do NOT grade intensity — there is no 'how big' question and no mild/extreme distinction. The judgement is binary: Regular or Voluminous. Output ONLY Regular / Voluminous — NEVER a sleeve-style name (do not output Puff/Balloon/Bishop/Leg-of-mutton; those are only examples of morphology, never values). BOUNDARIES: sleeve_volume ≠ sleeve length (that is the sleeve parameter) ≠ garment fit (overall ease/volume of the garment) ≠ shoulder_structure (the visible shoulder contour) ≠ fabric_behavior (how the cloth hangs). Judge the sleeve body only.
- cuff_type (None/Standard/French/Ribbed) = WHICH SLEEVE-END STRUCTURE the garment has. TYPE ONLY — never size. Applicable only when the garment HAS sleeves (sleeve OBSERVED and not Sleeveless); on a sleeveless garment do NOT emit cuff_type at all (key omission). None = the sleeve simply ends, with NO distinct cuff structure: a plain hem, a raw or rolled edge, or an elasticated gather with no constructed band. Standard = an ordinary constructed cuff band at the sleeve end — a distinct piece of fabric forming a cuff, typically fastened with one or more buttons. THIS IS THE DEFAULT FOR AN ORDINARY SHIRT CUFF. ⛔ Do NOT output tailoring nomenclature — there is no Barrel, Turn-back, Convertible, Gauntlet or Band value; every ordinary cuff band is Standard. French = a DOUBLED-BACK cuff: the fabric is folded back on itself to double depth and fastened through both layers (cufflinks or a link closure). Ribbed = an elasticated RIBBED knit band, as on a sweatshirt, hoodie or bomber. ⛔ SEMANTIC NONE: the cuff_type domain CONTAINS "None", so a visible sleeve end with no cuff structure MUST be reported as OBSERVED with value "None" — never ABSENT. If the sleeve end is cropped out of frame or fully occluded use NOT_VISIBLE. If the sleeve end is in frame but the construction cannot be settled (rolled up, bunched, hand in pocket, motion blur) use UNKNOWN. BOUNDARIES: cuff_type ≠ cuff_scale (how large) ≠ sleeve (length) ≠ sleeve_volume (the sleeve body's volume) ≠ rib_hem (the ribbed finish at the garment's lower edge, a separate parameter that has no paired cuff field).
- cuff_scale (Reduced/Regular/Enlarged) = HOW LARGE THE CUFF IS, measured INSIDE THIS IMAGE. Applicable only when cuff_type is OBSERVED and is NOT "None"; if cuff_type is "None", NOT_VISIBLE or UNKNOWN, do NOT emit cuff_scale at all (key omission). ★ ONCE IT APPLIES AND YOU CAN SEE THE CUFF YOU MUST CHOOSE ONE OF THE THREE VALUES — silence is not an option, and "Regular" is a real, active answer meaning an ordinary cuff depth, NOT a fallback for avoiding the decision. HOW TO MEASURE — use a reference that is inside this image: (a) PRIMARY — the cuff's DEPTH along the arm against the SLEEVE WIDTH at the cuff; these sit right next to each other, so this reference survives cropping and works on worn, flat, hanger and product images alike. (b) FALLBACK on worn images — cuff depth against the visible FOREARM / lower-sleeve segment. Reduced = a shallow band covering only a small part of that reference. Regular = an ordinary cuff depth. Enlarged = the band is deep, occupying a large fraction of the sleeve width at the wrist and/or extending well up the lower forearm. ⛔ POSE WARNING: an UNFASTENED, open or hanging cuff falls away from the wrist and LOOKS deeper than it is. Judge the CONSTRUCTED BAND itself, not how far an open cuff flares. If the cuff is open and you cannot judge the band reliably, use UNKNOWN — do NOT force Enlarged. ⛔ SLEEVE LENGTH IS NEVER CUFF SCALE: a long or extra-long sleeve does not make the cuff Enlarged, and total sleeve length may never be cited as cuff-scale evidence. ⛔ A bulky, padded or voluminous sleeve does not make the cuff Enlarged — judge the cuff band only. ⛔ SEMANTIC NONE: the cuff_scale domain has NO "None" value; never output "None" here. Absence of a readable cuff is expressed by the key being omitted (no cuff) or by NOT_VISIBLE / UNKNOWN (unreadable). ⛔ TYPE AND SCALE ARE INDEPENDENT: never infer cuff_scale from cuff_type or cuff_type from cuff_scale. Standard+Regular, Standard+Enlarged, French+Regular, French+Enlarged, Ribbed+Regular and Ribbed+Enlarged are all legitimate combinations. ⛔ EVIDENCE MUST BE IMAGE-INTERNAL: say what you measured against, e.g. "cuff depth occupies a large fraction of sleeve width at the wrist" or "band extends well up the lower forearm". NEVER write "large for a shirt", "oversized fashion cuff", "unusual", "exaggerated" or "conventional" — you do not know what is normal for a garment type, only what you can see in this image.
- collar_scale (Reduced/Regular/Enlarged) = HOW LARGE THE COLLAR OR LAPEL IS, measured INSIDE THIS IMAGE. Applicable only when collar is OBSERVED and is NOT "None"; if collar is "None", NOT_VISIBLE or UNKNOWN, do NOT emit collar_scale at all (key omission). ★ THIS ONE FIELD CARRIES BOTH COLLARS AND LAPELS. A lapel is not a separate parameter — Notched, Peak and Shawl are collar values, so a jacket lapel's size is reported here, in collar_scale. ★ ONCE IT APPLIES AND YOU CAN SEE THE COLLAR YOU MUST CHOOSE ONE OF THE THREE VALUES — silence is not an option, and "Regular" is a real, active answer meaning an ordinary collar size, NOT a fallback for avoiding the decision. HOW TO MEASURE — use a reference that is inside this image, and say which one you used: (a) for a SHIRT-TYPE collar (Shirt/Stand/Sailor/Peter Pan/Tie/Ruffle) — the collar's reach against the neckline and upper chest, e.g. how far the collar points descend toward or past the placket buttons, or how much of the neck-to-chin span a stand covers. (b) for a LAPEL-TYPE collar (Notched/Peak/Shawl) — the lapel's lateral breadth against the CHEST PANEL it sits on. Reduced = the collar or lapel is notably small against that reference. Regular = an ordinary size. Enlarged = the collar or lapel is broad or long against that reference, occupying a large share of it. ⛔ NO NUMERIC RULE: never use a percentage, ratio, fraction-threshold, pixel or centimetre measure to decide this, and never cite one as evidence. Describe what you see relative to the garment's own parts. ⛔ SHAPE IS NEVER SCALE: Notched, Peak and Shawl are shapes. A Peak lapel is NOT automatically Enlarged, and a Notched lapel is NOT automatically Regular. ⛔ CONSTRUCTION IS NEVER SCALE: double-breasted and single-breasted garments both carry the full range of collar sizes. ⛔ VERTICAL REACH ALONE IS NOT ENLARGED: a lapel with a low roll or a long line is not Enlarged unless its actual breadth is large against the chest panel. ⛔ TYPE AND SCALE ARE INDEPENDENT: never infer collar_scale from collar, or collar from collar_scale. ⛔ SEMANTIC NONE: the collar_scale domain has NO "None" value; never output "None" here. Absence of a collar is expressed by the key being omitted; an unreadable collar by NOT_VISIBLE (cropped, or hidden by hair, scarf or an outer layer) or UNKNOWN (in frame but popped, flipped, crushed or turned so the size cannot be judged). ⛔ EVIDENCE MUST BE IMAGE-INTERNAL: say what you measured against, e.g. "collar points descend well past the first placket button" or "lapel breadth covers a large share of the chest panel". NEVER write "large for a jacket", "oversized collar", "unusual", "exaggerated" or "conventional". ⛔ GARMENT CATEGORY IS NEVER SCALE NORMALIZATION: there is no "normal collar size for a coat / for a shirt / for a jacket" — the garment's category must never serve as the baseline, and the ONLY reference is this image's own neckline / upper chest (shirt-type) or its own chest panel (lapel-type). ⛔ ENLARGED NEEDS THE WHOLE COMPONENT'S SHARE: one long collar point, an oversized garment, a wide fit, or the garment's category never makes Enlarged on its own — choose Enlarged only when the collar/lapel AS A WHOLE actually occupies a large share of its own image-internal reference.
- ⛔ COMPONENT SCALE IS NEVER GARMENT FIT — this rule is general and applies to every component scale field (collar_scale, cuff_scale) and to fit alike. A component's size describes THAT COMPONENT against its own immediate surroundings. The garment's fit describes the GARMENT BODY against the wearer's body. These are separate observations answering separate questions, and neither may be used as evidence for the other. An enlarged collar, an enlarged lapel or an enlarged cuff does NOT by itself make the garment Oversized — a garment with an exaggerated collar may be Slim, Regular, Relaxed or Oversized, and you must judge the body independently. Conversely an Oversized garment does NOT make its collar, lapel or cuff Enlarged — judge each component on its own. ⛔ Never cite a component's size as fit evidence, and never cite the garment's fit as component-scale evidence.
- fabric_behavior (Structured/Semi-Structured/Semi-Fluid/Fluid) = how the CLOTH ITSELF behaves across the WHOLE GARMENT: how much of the garment's three-dimensional shape the material is producing on its own. Structured = the cloth has enough body to CREATE and HOLD the garment's volume — the silhouette stands away from the body because the material itself supports it. Semi-Structured = the garment keeps some shape but the cloth is not what is producing it; it holds a soft shape and yields readily. Semi-Fluid = the cloth mostly follows the body with soft movement. Fluid = the cloth drapes and falls with no self-supporting body.
- fabric_behavior BOUNDARIES (both directions matter): (a) VISIBLE FOLDING DOES NOT BY ITSELF MEAN Semi-Structured — a heavy, substantial cloth can fall into large soft folds while still creating and retaining the garment's volume; judge whether the folds COLLAPSE the silhouette or whether the shape survives them. (b) LOCALIZED RIGIDITY DOES NOT MAKE THE WHOLE GARMENT Structured — padding, quilting, insulated panels or a stiff component in one area is a localized construction fact, not a whole-garment cloth behaviour; if the garment's overall body is soft and only parts are padded, that is Semi-Structured. fabric_behavior is a single whole-garment reading, so do not let one rigid component or one soft component decide it alone. It is also SEPARATE from fit (ease/volume), from sleeve_volume, and from shoulder_structure (the visible shoulder contour) — never read one from another. (c) INTEGRATE THE WHOLE GARMENT: judge fabric_behavior from at minimum the BODY, the SLEEVES and the visible lower/other panels TOGETHER — their fold/yield behaviour and the garment's overall self-support. A strong, squared or padded SHOULDER is shoulder_structure territory, and projecting it onto the whole garment is exactly the localized-rigidity error above: when the body and sleeves visibly yield, crease and fold while some zones retain shape, the whole-garment answer is Semi-Structured — shoulder_structure = Strong together with fabric_behavior = Semi-Structured is a normal, valid pair, and the two must never be aligned to each other. (d) ⛔ MATERIAL IDENTITY IS NEVER fabric_behavior: Leather, Denim, Wool or any other material class never makes a garment Structured by itself — leather with a visibly yielding, creasing body is NOT Structured; judge the cloth's visible behaviour in THIS image, never what the material "should" do. Structured still requires the garment's overall cloth to actually create and hold its volume.
- material (Cotton/Wool/Leather/Suede/Knit/Denim/Synthetic/Silk/Velvet/Fur/Padding/Other) = the material CLASS you can actually SEE, not an inferred fibre composition. Do NOT convert visual resemblance into a confident exact composition — a smooth technical-looking shell is Synthetic, not "Nylon" or "Polyester" reasoned into Cotton or Silk; a matte tailoring cloth is not automatically Wool. When the appearance is consistent with several classes and the image does not settle it, prefer the broader class that IS visible (e.g. Synthetic) or "Other", or use state UNKNOWN — never assert an exact fibre the image cannot establish. Where different areas of the garment are visibly different materials, report each as its own value and use "locations" to say where each one is (that material BLOCKING is itself a meaningful observation); do not collapse a visibly two-material garment into one value.
- trouser_distinction (Tailored/Casual/Sport/Jeans/Leggings) = WHICH TROUSER PRODUCT CLASS the garment is, read from its CONSTRUCTION ASSEMBLY — the waistband, the front closure, the HIP pocket treatment and the leg build. ★ THIS IS A PRODUCT-CLASS OBSERVATION — never a material observation, never a pocket-morphology observation, never a fit or styling impression, never a product name. Every one of the five values requires POSITIVE visible construction evidence, and your evidence string must name the construction you actually saw.
- trouser_distinction VALUES: Tailored = dress-trouser / suiting assembly — a constructed tailored waistband, a clean flat or pleated front, on-seam or welt pockets, typically a pressed centre crease. · Jeans = THE JEANS CONSTRUCTION LINEAGE — a denim-type bottomweight cloth built on the jeans waist-and-hip assembly: a constructed NON-elastic waistband with belt loops, a FLY front (typically a metal shank button or a zip fly), and shaped, curved or slanted HIP pockets — very often with a small coin/watch pocket, and commonly with contrast topstitching and/or rivets. · Sport = athletic / activewear assembly — an elasticated or drawcord PULL-ON waistband with no fly, together with athletic build such as a ribbed or elasticated cuffed hem, side taping or technical panelling. · Leggings = a skin-close stretch knit pull-on trouser with no fly and no constructed waistband; the leg follows the body continuously. · Casual = an ordinary everyday trouser built on NONE of the above assemblies — chino, corduroy, cargo / utility / workwear, or a soft pull-on trouser. ★ Casual is a REAL, POSITIVE answer, NOT a fallback: name the casual construction you can see (e.g. "elastic pull-on waistband, no fly", "flat-front cotton chino with slant side pockets").
- trouser_distinction ★ JEANS IS A PRODUCT CLASS, NOT A POCKET COUNT. The classic FIVE-POCKET layout (curved hip pockets + coin pocket + patch back pockets) is the MOST COMMON FORM and the single strongest piece of evidence — but it is NOT REQUIRED. ⛔ ADDED UTILITY CONSTRUCTION DOES NOT CANCEL JEANS: cargo / bellows leg pockets, carpenter hammer loops and rule pockets, and patch pockets are ADDITIVE VARIANTS. A CARGO JEAN and a CARPENTER JEAN remain Jeans whenever the jeans waist-and-hip assembly is present. Record the cargo/bellows construction in the POCKET observations instead — pocket = Present, with that pocket's own construction and projection judged from what you can actually see there — NEVER by changing this value. ⛔ NEVER reason "it has cargo pockets, therefore Casual".
- trouser_distinction ⛔ WHICH DENIM TROUSERS ARE NOT JEANS — a denim trouser built on a DIFFERENT assembly. Denim cut as a dress trouser (pleated or clean tailored front, welt or on-seam pockets, no jeans waist-and-hip assembly) is Tailored. Denim with an elasticated or drawcord PULL-ON waist and no fly is Casual, or Sport when the build is athletic. ⛔ Conversely a NON-denim cargo / utility trouser in cotton twill is Casual, not Jeans — cargo pockets alone are not the jeans lineage.
- trouser_distinction ⛔ MATERIAL FIREWALL — BOTH DIRECTIONS. material = Denim does NOT by itself make a trouser Jeans, and this value is NOT a claim about the cloth. Denim-type bottomweight cloth is the ordinary signal for Jeans, but it is EVIDENCE, never the decision — read the ASSEMBLY. Conversely, a five-pocket layout on a plainly non-denim cloth (corduroy, coloured cotton twill) is ordinarily a five-pocket CASUAL trouser rather than Jeans, unless the full jeans assembly AND a denim-type bottomweight are both visibly present. material carries the cloth separately; the two observations are INDEPENDENT and both are still reported.
- trouser_distinction ⛔ WIDTH / FIT / WASH / LENGTH / RISE ARE NEVER THIS VALUE: wide-leg, baggy, oversized, slim, cropped, low-rise, faded, washed or distressed decide nothing here in either direction — any of the five distinctions can be wide, slim or washed. ⛔ Do NOT read it from the garment's overall vibe or from what the rest of the outfit looks like.
- trouser_distinction ★ READABILITY GATE — Casual may NEVER absorb an unreadable trouser. If the trouser is out of frame or fully occluded, use NOT_VISIBLE. If part of the trouser is visible but the waistband, front closure and hip-pocket treatment cannot be read — for example only the lower legs show below a long outer layer — use UNKNOWN. ⛔ "no visible jeans detailing" / "no 5-pocket detailing readable" is NOT evidence for Casual; that is exactly the UNKNOWN case. Casual demands positive visible casual construction in the same way Jeans demands a visible jeans assembly. ⛔ "Leggings" is a trouser distinction, not a garment category — the category stays Trouser.
- trouser_distinction ★ DECISION ORDER — apply in this order and stop at the first match: (1) skin-close stretch knit pull-on, no fly, no constructed waistband → Leggings. (2) elasticated or drawcord pull-on waist with athletic build → Sport. (3) the JEANS waist-and-hip assembly on denim-type cloth → Jeans, WHATEVER additional utility pockets are present. (4) dress-trouser / suiting assembly → Tailored. (5) positive ordinary casual construction → Casual. (6) the assembly cannot be read → UNKNOWN.
- closure_type (Button / Single Breasted Button / Double Breasted Button / Snap Button / Zipper / Hook Closure / Open) is the SINGLE closure/placket-mechanism observation. Report the VISIBLE closure only. A round button-like face is Button — do NOT infer a hidden Snap Button, Zipper, or Hook Closure from a button-like face; use Snap Button / Zipper / Hook Closure ONLY when that mechanism is actually visible. On OUTERWEAR that buttons, use Single Breasted Button (one column / centre overlap) or Double Breasted Button (two parallel button columns / wide overlap) by the visible breasting; use plain Button for a simple top/dress placket that is not a breasted outerwear closure. Open = a front opening with no visible fastening. Report the mechanism, not the number of buttons.
- hood = IS A HOOD BUILT INTO THE GARMENT? This parameter is unlike every other one in the contract: its value domain holds exactly ONE value, "Present". There is no "None" and no "Absent" value to choose, so the two legal answers are carried by the STATE, not by a value. A hood you can see → state OBSERVED with value "Present". A garment of an applicable category that plainly has NO hood → state ABSENT with a null value; this is a required, positive observation and must be emitted, never left out. ⛔ SEMANTIC None IS ILLEGAL HERE: the domain contains no "None", so never write value "None" — that is the opposite side of the rule from cuff_type. ⛔ OBSERVED ALWAYS CARRIES ITS VALUE: state OBSERVED with a null or missing value is invalid; the only value OBSERVED can take is "Present". Use NOT_VISIBLE when the neck and upper back are cropped or occluded so a hood could not be seen either way, and UNKNOWN when they are in frame but a hood cannot be settled (hair, a scarf, an outer layer, a raised collar). ⛔ APPLICABILITY IS DECIDED BY THE CATEGORY, NOT BY THE GARMENT: on a category where hood is not applicable the key must be omitted ENTIRELY — do not emit it as ABSENT "just to be safe", and equally do not emit it as OBSERVED / "Present" because you can see a hood. Consult the NOT-APPLICABLE and REQUIRED-KEY lists for the category you resolved; they are authoritative. BOUNDARIES: hood ≠ collar. The top edge of a hood opening rising at the neck is a hood, not a Stand collar (see the collar rule); a garment may legitimately carry both a hood and a real collar.
- decorative_detail (Embroidery / Sequin-Beading / Appliqué / Piping) = an APPLIED decorative construction (MULTI: list each present). Piping = a narrow applied cord or folded strip running ALONG a seam or edge (collar, lapel, pocket, cuff, front edge, side seam) — report Piping when such a distinct applied trim line is actually visible. Piping is the FEATURE; use "locations" to say where it runs (e.g. {"descriptor":"Edge"}), and report its colour separately in color_observation as an additional color carried by "Piping" — never encode a colour inside decorative_detail. Do NOT report Piping for: a plain topstitch or seam line (stitching is not an applied trim), a contrast BAND or panel (that is a material/colour difference), a rib trim at the hem or a ribbed cuff (those are rib_hem and cuff_type = Ribbed), or a fur/feather/ribbon trim (those are attachment values). Do NOT infer size, prominence or how eye-catching any decorative detail is.
- exposure_opening = a TWO-CLASS MULTI observation on EVERY garment category (T-Shirt · Shirt · Sweater · Sweatshirt · Jacket · Coat · Trouser · Skirt · Dress · Jumpsuit). List every applicable value from EITHER class, each with its own evidence. No location text, no size/magnitude. If neither class applies, use ABSENT.
- exposure_opening ★ CATEGORY IS NOT A GATE. Ask ONLY: "does this garment's intrinsic design leave a canonical body region meaningfully visibly exposed?" A cropped T-Shirt / Sweater / Jacket with a genuine visible skin gap at the abdomen takes Midriff / Waist. A mini skirt or a very short trouser with pronounced visible upper-thigh exposure takes Upper Thigh. A designed opening on a top, an outer layer or a bottom takes its Class B value. ⛔ The old "Dress / Jumpsuit only" restriction is SUPERSEDED (CEO 2026-09-03) and must not be applied.
- exposure_opening ★ STATE DISCIPLINE (the key is REQUIRED on every category — omission is a contract error). OBSERVED = qualifying Class A and/or Class B evidence is visibly established. ABSENT = you can see the garment and the relevant body relationship well enough to judge, and nothing qualifies. NOT_VISIBLE = the region or the garment/body relationship is cropped or occluded, so it cannot be seen either way. UNKNOWN = the region is in frame but the reading cannot be settled. ⛔ NEVER turn "no visible wearer / flat or hanger product shot / body relationship unreadable" into ABSENT — that is NOT_VISIBLE. A missing body reference is not evidence of no exposure. ★ RESOLVE THE STATE IN THIS FIXED ORDER — the FIRST rule that applies decides, and later rules are not consulted. (S1) If ANY Class A region or Class B opening is positively established in this image, answer OBSERVED and list only the values actually established. This holds even with no wearer: a visible Side Cutout on a flat product shot is OBSERVED + Side Cutout, even though Class A body exposure cannot be read there. (S2) Otherwise, if there is no wearer / no body relationship, or the Class A body reading cannot be meaningfully assessed, answer NOT_VISIBLE. ⛔ Seeing that the garment carries no designed opening does NOT entitle you to answer ABSENT: Class B absence can NEVER convert an unreadable Class A into confirmed absence. A flat or hanger blazer with no cutout is NOT_VISIBLE — not ABSENT. (S3) Otherwise, when the garment/body relationship IS readable and nothing qualifies, answer ABSENT. ABSENT is a positive finding of absence and requires a readable body relationship. (S4) When the relevant area is in frame but the reading cannot be settled, answer UNKNOWN. NOT_VISIBLE, UNKNOWN and ABSENT are three different answers and must never be substituted for one another.
- exposure_opening CLASS A — BODY EXPOSURE REGION (Shoulder / Chest / Décolletage / Midriff / Waist / Back / Upper Thigh) answers ONE question: WHICH BODY REGION IS MEANINGFULLY EXPOSED? Shoulder = PRONOUNCED shoulder / upper-torso exposure — the garment's neckline / shoulder / upper-torso construction deliberately leaves that area WIDELY bared, so that the baring itself reads as a clear visual statement. QUALIFIES: off-shoulder · strapless · bandeau · one-shoulder · a wide or open shoulder neckline · a shoulder cutout · an upper-torso opening · any comparable structural wide baring — and only when that baring is actually visible in the frame. ⛔ DOES NOT QUALIFY: the ordinary shoulder and arm visibility of a conventional sleeveless top, tank top, camisole, or spaghetti-strap / ordinary narrow-strap garment. That is simply how a sleeveless garment looks, not exposure — SLEEVELESS IDENTITY IS NOT EXPOSURE EVIDENCE. Straps resting on the shoulders with the surrounding shoulder line bared in the ordinary way emits NOTHING here, no matter how thin the straps are. Chest / Décolletage = meaningful visible exposure of the upper chest / décolletage. Midriff / Waist = meaningful visible exposure of the abdomen / midriff / waist, INCLUDING side-waist exposure (there is no separate Side Torso or Hip region). Back = meaningful visible exposure of the back. Upper Thigh = meaningful, PRONOUNCED exposure of the upper-thigh region — deliberately NARROWER than "leg": ordinary visible leg is NOT exposure.
- exposure_opening CLASS B — DESIGNED OPENING (Open Back / Front Cutout / Side Cutout / Shoulder Cutout) answers a DIFFERENT question: WHAT DESIGNED OPENING CONSTRUCTION EXISTS? Open Back = a designed opening across the back; Front Cutout = a deliberate opening in the front torso; Side Cutout = a deliberate opening at the side torso (including side waist / hip); Shoulder Cutout = an opening cut into an otherwise-covered shoulder.
- ★ REGION ≠ MECHANISM. "Back" is an exposed body region; "Open Back" is a garment construction. They are different observations and may legitimately co-occur — emitting both is NOT duplication. Typical valid outputs: [Shoulder] · [Shoulder, Chest / Décolletage] · [Back, Open Back] · [Midriff / Waist, Side Cutout] · [Shoulder, Shoulder Cutout] · [Upper Thigh].
- ★ BODY EXPOSURE FIREWALL — construction or category ALONE never creates a REGION value; only ACTUAL VISIBLE MEANINGFUL EXPOSURE does. Sleeveless ≠ automatic Shoulder. A strap ≠ automatic Shoulder. Off-shoulder ≠ Shoulder unless meaningful exposure is actually visible. Strapless ≠ blindly derived Shoulder or Chest / Décolletage without visual confirmation. Crop ≠ automatic Midriff / Waist (a crop top over a high waistband showing no skin gap emits nothing). Shorts ≠ automatic Upper Thigh. Mini ≠ automatic Upper Thigh. A slit ≠ automatic Upper Thigh — a modest slit exposes no upper thigh. ⛔ EXPOSURE IS GARMENT-INTRINSIC — STYLING STATE IS NEVER EXPOSURE. Report a Class A region ONLY when the exposure is produced by the garment's own cut, construction or designed material behaviour. Do NOT count body visibility caused only by how the garment is being WORN or ARRANGED in this shot: unbuttoning, unzipping, wearing a shirt/jacket/coat open, rolling a sleeve or hem, tying or knotting, tucking or lifting, a strap slipped off, the garment displaced or pushed aside, transient movement, or a pose. A button-down shirt whose chest is visible only because the buttons are undone is NOT Chest / Décolletage; an open jacket revealing the torso is NOT an exposure region; a shirt knotted at the waist baring the midriff is NOT Midriff / Waist. Ask: "if this garment were fastened and worn as constructed, and hung straight, would this body region still be bared?" If NO, emit nothing for it. ⛔ Transparent / Semi Transparent ≠ automatic body-region exposure: a sheer garment over an opaque lining, underlayer or inner garment that prevents meaningful body visibility keeps its surface value and emits NO Class A region. Conversely: WHEN the image visibly shows meaningful exposure of one of the five canonical regions, that REGION value MUST be emitted. ★ SURFACE AND EXPOSURE ARE INDEPENDENT AND MAY CO-OCCUR: when a body region IS genuinely visible through a sheer material, report BOTH surface = Semi Transparent / Transparent AND the Class A region actually seen — they answer different questions (what the material does · which body region is visible), and reporting both is not duplication.
- ★ Class B never auto-derives Class A by name. "Side Cutout" does not by itself prove Midriff / Waist, and "Front Cutout" requires reading which region is actually bared; "Shoulder Cutout" strongly suggests Shoulder but the region must still be visibly exposed. Body exposure is a DIRECT VISUAL OBSERVATION.
- ★ exposure_opening does NOT replace construction observations. shoulder_connection, sleeve, neckline_shape/neckline_position, length, slit and surface remain independent and must still be reported. A strapless gown is BOTH shoulder_connection = Strapless (construction) AND, when visibly bared, exposure_opening = [Shoulder, Chest / Décolletage] (exposed regions).
- attachment "Belt" = a belt worn at the WAIST. A strap, tab, or buckle at a cuff/sleeve is NOT a waist Belt, and a tab/strap at the shoulder is Epaulette — do not label a sleeve/cuff strap as Belt. (If a visible attachment matches no canonical attachment token, use "Other" with a short descriptor rather than forcing Belt.)
- neckline_shape / neckline_position describe the ACTUAL garment neck opening — not a thin decorative strap or bar crossing an exposed area. Judge neckline_position by how high or low the real neckline sits (a deep opening is Low even if a decorative strap crosses it).
- neckline_shape is read from the actual fabric OPENING EDGE, NOT from straps, a decorative centre dip/knot, or the visual triangle that shoulder straps create around the chest. A straight or near-horizontal top edge (e.g. a straight-across strapless/bandeau or a squared-off strappy bodice) is Straight, not V — reserve V for an actual V-shaped fabric edge that angles down to a point. Do not upgrade a straight/curved edge to V because straps or a centre detail form a V above it.
- Round vs Scoop (both rounded openings): Round = a relatively shallow rounded neckline that stays comparatively close to the neck / base of the neck. Scoop = a distinctly deeper AND broader rounded / U-shaped opening that descends materially farther down onto the upper chest. Shape and position are SEPARATE observations — do NOT convert a merely low-sitting Round into Scoop from position alone; judge the visible opening geometry (a Scoop is both deeper and wider, not just lower).
- ★★ PARAMETER OWNERSHIP FIREWALL — CONSTRUCTION vs OPENING GEOMETRY. These are two different questions and two different parameters. Answer BOTH; never let one replace the other.
  · shoulder_connection answers: HOW is the garment connected / supported across the shoulder and neck area? Its canonical values are Standard, Strap, Strapless, Halter, One Shoulder.
    ⛔ Halter, Strap, Strapless and One Shoulder are CONSTRUCTION values and belong ONLY to shoulder_connection. They are NOT neckline shapes and must NEVER be written into neckline_shape.
    A garment whose fabric or a band/tie/chain passes AROUND or BEHIND the neck to suspend the bodice — leaving the shoulders unsupported — is shoulder_connection = Halter. Report it there.
  · neckline_shape answers: WHAT is the geometric shape of the neck OPENING EDGE? Its canonical values are Round, V, Square, Straight, Scoop, Mock, Turtleneck, Funnel — nothing else.
  · ★ Construction does NOT determine opening geometry, and does NOT excuse you from reporting it. A Halter garment still has a neckline shape of its own, and it can be any of the canonical shapes — judge it from the visible fabric opening edge alone. If the opening edge cannot be reliably read, use UNKNOWN; do NOT infer a shape from the fact that the garment is a halter.
  · ⛔ CONVERGENCE IS NOT AN OPENING. A neckline shape describes the edge of an actual neck OPENING — where fabric ends and skin/underlayer shows through the opening. Fabric that CONVERGES toward a knot, point or band at the throat, seam directions, drape lines, or panel edges meeting at the neck are CONSTRUCTION geometry, not an opening edge: when the front is closed up to the neck/knot there is NO V opening to report, however V-angled the converging fabric looks. A "V" requires an actual open neckline edge tracing a V of exposed skin or underlayer. If no true opening-edge geometry is visually established, the answer is UNKNOWN — never a shape read off converging cloth.
  · ⛔ A PARTIAL SEGMENT IS NOT A CONTOUR. Where suspension construction converges at the neck (halter ties, a knot, one-shoulder or asymmetric straps), the fabric edge visible BETWEEN the convergence points is only a SEGMENT of the opening — the ties/straps interrupt and reshape the edge exactly where the opening's true geometry would be decided. Do NOT name a neckline shape (Straight, V, Round, …) from such an inter-tie/inter-strap segment: the segment being "roughly straight" does not establish that the OPENING is Straight. Report a shape only when the COMPLETE opening contour is visible and uninterrupted (e.g. a true strapless/bandeau top edge running clear across with no convergence interrupting it, or a fully visible V/Round edge); otherwise the answer is UNKNOWN. This is an evidence rule, not a construction rule — a halter garment whose full opening contour IS clearly visible still gets its real OBSERVED shape.
  · ⛔ THE KNOT-PLUS-CONVERGENCE COMBINATION IS NOT V: a knot/tie sitting below the throat PLUS two fabric edges converging downward toward it is precisely the convergence case above, and that pair of cues alone NEVER establishes a V opening — without a complete, uninterrupted visible opening contour the answer is UNKNOWN. This is an evidence rule, not a construction rule: a genuine halter garment may still show a true V or Round opening when the complete edge is visible — judge only the visible opening edge, never the suspension construction.
  · ★ Construction also does NOT replace or suppress exposure_opening. shoulder_connection = Halter and exposure_opening = Shoulder may both be true at once when the shoulders are genuinely visibly bared — but Halter construction ALONE never creates an exposure entry; actual visible meaningful exposure is still required.
  · ⛔ EXPOSURE MUST BE SEEN IN THE FRAME. An exposure_opening value may name ONLY a body region whose exposure is actually visible in THIS image. A region the camera does not show can NEVER be an exposure value: in a front-facing image the back is not visible, so "Back" cannot be emitted — regardless of what the garment TYPE conventionally bares. Garment construction, garment type, or what the rear of such a garment "usually" looks like must never be used to infer an unseen exposure region. Evidence for every exposure value must describe what is visibly bared in the frame, not what the construction implies.
  · ⛔ EXPOSURE IS NEVER DERIVED FROM neckline_shape: no neckline shape creates an exposure region by itself — a V neckline does not by itself put Chest / Décolletage into exposure_opening, and an UNKNOWN neckline does not suppress a region that is visibly bared. Each exposure value needs its own directly visible skin evidence, independent of whatever neckline_shape was answered.
  · WORKED EXAMPLE — a dress whose fabric converges at the throat and wraps behind the neck, with bare shoulders and a rounded fabric edge across the upper chest:
    shoulder_connection = Halter (construction) · neckline_shape = Round (opening edge geometry) · exposure_opening includes Shoulder (actually bared). Three independent observations, all reported.
When the region is visible but the canonical value cannot be reliably determined, use UNKNOWN rather than guessing a value — preserve uncertainty; do not manufacture certainty.`;

// ════════════════════════════════════════════════════════════════════════════
// VISUAL RECONSTRUCTION DESCRIPTOR PROTOCOL V1
// Production protocol — executed by the Producer at GENERATION time, in THIS
// SAME single call. ⛔ There is NO second Vision/API call for descriptors.
// This is not a CEO review manual; the CEO reviews the OUTPUT of this protocol.
// ════════════════════════════════════════════════════════════════════════════
const DESCRIPTOR_PROTOCOL = `[TARGET DESCRIPTOR — VISUAL RECONSTRUCTION PROTOCOL]

WHAT THE DESCRIPTOR IS FOR
The structured observations above + the colour block already carry the garment's
enumerated facts. The descriptor exists for ONE reason: to carry the visual
information that the enumerated fields CANNOT carry — so that a reader who never
sees the image can still RECONSTRUCT what the garment looks like.
- The descriptor is NOT a summary of the observations. Restating "Regular fit,
  Long sleeve, Cotton" adds nothing — that is already machine-readable above.
- ⛔ INCREMENTAL INFORMATION RULE: every clause must add something the structured
  fields do not already say. If a clause could be reconstructed from the fields
  alone, delete the clause.
- ⛔ The descriptor is NOT a score, NOT an axis judgment, NOT a style verdict.
  Never write axis names (TC / SR / DM / EI), numbers-as-ratings, or evaluative
  conclusions about formality, quality, taste, price, season, occasion, or the
  wearer's intent. Those are NOT visible in the image.
- ⛔ IDENTITY FIREWALL — never assert as fact who made the garment or where it
  came from: brand, designer, maison, authenticity, provenance, collection,
  season line, SKU or model. None of that is visible in an image. "Chanel
  jacket", "Dior dress", "made in Italy" are fabricated facts, not observations.
- ✔ RECOGNISED-CONSTRUCTION ANALOGY — you MAY name a widely recognised
  construction reference as a RESEMBLANCE when doing so genuinely closes a
  Reconstruction Gap that plain description would need a paragraph to convey.
  Mark it as resemblance, every time: "Chanel-like", "Chanel-style",
  "resembles a Chanel-style tweed jacket". The marker is exactly what separates
  a legal analogy from a fabricated identity — "Chanel-like cropped tweed
  jacket" is legal; "Chanel jacket" is not.
  ⛔ Do not reach for a famous name as decoration. If the analogy does not carry
  construction information the structured fields lack, describe the
  construction instead.

FACT · APPEARANCE · INFERENCE
Every clause you write sits in exactly one of these three layers. Always use the
LOWEST-RISK layer that is sufficient:  FACT  >  APPEARANCE  >  INFERENCE.
  FACT       — directly visible and unambiguous. State it plainly.
               e.g. "buttons run to the hem", "welt pocket on the left chest"
  APPEARANCE — visible resemblance rather than verified identity. Mark it in the
               text: "-like", "-style", "resembles", "appears", "reads as",
               "looks". e.g. "overlapping double-breasted-like front"
  INFERENCE  — not directly verified, but needed to close an important
               Reconstruction Gap. ALLOWED ONLY when explicitly marked with
               "may", "appears", "possibly", "seems" or an equally explicit
               uncertainty marker. e.g. "may use a concealed fastening"

⛔ INFERENCE IS A LAST RESORT, NOT DEFAULT PROSE. Use it only when ALL hold:
   1. a real Reconstruction Gap exists;
   2. directly observed fact alone does not close it;
   3. the inference materially improves visual reconstruction;
   4. the uncertainty is explicitly marked in the text;
   5. it does not contradict the structured evidence;
   6. it asserts no brand / designer / provenance / authenticity identity;
   7. it is not aesthetic evaluation ("luxurious", "fashionable", "expensive");
   8. it is not axis pre-judgment ("very expressive", "highly traditional",
      "will score highly on EI");
   9. it is not speculation about wearer, occasion, origin, price or intent
      ("probably Chanel", "likely made in Italy", "designed for formal
      occasions", "the wearer is likely wealthy").
   Fail any one of these and the clause is PROHIBITED — drop it.
⛔ NEVER SILENTLY UPGRADE AN INFERENCE INTO A FACT. "overlapping front with no
   visible engaged fastening" is honest; "hidden-button double-breasted closure"
   claims a construction you did not verify.

This is a rule about EPISTEMIC STATUS, not about vocabulary. Descriptive
morphology words are fully legitimate when you can actually see the morphology:
"structured shoulders", "relaxed through the body", "fluid drape" are GOOD
descriptor content when visible. There is NO forbidden-word list. What is
forbidden is asserting as fact something you did not observe.

STEP 1 — RECONSTRUCTION GAP CHECK (do this BEFORE writing any descriptor text)
Ask: after the structured observations and the colour block, is important visual
information still lost, collapsed, or actively misleading? Report each gap you
find using its identifier:
  RG-1 CONSTRUCTION_RELATIONSHIP — how parts join / layer / relate; the fields
       list parts but never how they sit together.
  RG-2 PLACEMENT_COVERAGE — WHERE a feature sits and HOW MUCH it covers. The
       fields say a feature exists, not that it runs only along the left front.
  RG-3 SHAPE_MORPHOLOGY — the canonical token flattens a distinctive shape
       (e.g. a specific collar geometry collapsed into one enum token).
  RG-4 VISUAL_AMBIGUITY — you had to answer UNKNOWN, or had to choose between
       two canonical values, and the reason is itself visible information.
  RG-5 CROSS_TARGET_RELATION — the visual relationship is BETWEEN targets.
       ⛔ Do NOT solve RG-5 inside a target descriptor. See STEP 4.
  RG-6 OUT_OF_ONTOLOGY — you saw something the canonical value domains have no
       token for, or you were forced into "Other".

STEP 2 — NECESSITY DECISION ("descriptor_need")
Emit exactly one of:
  "REQUIRED"    — at least one gap above is real. You MUST then write the
                  descriptor and list the gap ids in "reconstruction_gaps".
  "NOT_NEEDED"  — you checked and the structured observations + colour block
                  genuinely reconstruct this garment. "reconstruction_gaps"
                  must be empty and "descriptor" must be omitted or "".
⛔ "NOT_NEEDED" is an ACTIVE JUDGMENT you are making, not a default and not a
   fallback. Never emit it because nothing jumped out at you, because the
   garment is plain, or because you are unsure. A garment with no decoration and
   no pattern can still be REQUIRED — quiet garments often carry their entire
   identity in proportion, drape and how the parts meet, none of which the
   enumerated fields hold. If you cannot honestly certify reconstruction is
   complete, the answer is REQUIRED, not NOT_NEEDED.
⛔ Never emit "UNDETERMINED". That state exists only for historical records that
   were extracted before this protocol; it is not available to you.

STEP 3 — WRITING THE DESCRIPTOR (only when REQUIRED)
- Write what closes the gaps you listed, and nothing else.
- Plain declarative prose. No bullet lists, no JSON, no key:value pairs, no
  markup, no line breaks.
- Length is governed by INFORMATION, never by a quota. Write only enough natural
  language to close the Reconstruction Gaps you listed, then STOP. The stopping
  criterion is "the missing visual identity is now reconstructable" — it is
  never a word count. There is NO minimum length and NO maximum length.
  ⛔ Do not pad to reach a length. ⛔ Do not compress a necessary observation to
  fit one. ⛔ Do not aim at how long previous descriptors happened to be.
  Concise still matters: no filler, no marketing prose, no re-serialising the
  structured fields, no repeating the colour block. Density, not word count.
- Every descriptor is about ITS OWN target only.

STEP 4 — CROSS-TARGET VISUAL RELATIONS (RG-5)
When the visually important fact is a relationship BETWEEN two or more targets
(the same trim motif repeats on both pieces, the same material treatment runs
across them, a deliberate colour coordination), it does NOT belong in either
target's descriptor. Emit it once at the TOP LEVEL in
"cross_target_visual_relations", naming the targets it links.
⛔ A relation needs 2 or more distinct targets. A single target never makes one.
⛔ A relation is a VISUAL OBSERVATION only. It does NOT declare a suit, a
   matching pair, a scoring unit, or any grouping decision. Those are decided
   downstream and are not yours to assert.
⛔ Never duplicate the relation text into the target descriptors as well.`;

const OUTPUT_RULES = `[OUTPUT — STRICT JSON ONLY, exactly this shape; no prose outside JSON]
{
  "targets": [
    {
      "descriptor_need": "REQUIRED"|"NOT_NEEDED",                 // see [TARGET DESCRIPTOR] — active judgment, never a default
      "reconstruction_gaps": ["RG-1".."RG-6"],                    // non-empty IFF REQUIRED ; empty IFF NOT_NEEDED
      "descriptor": "<visual reconstruction text>",               // REQUIRED -> non-empty ; NOT_NEEDED -> omit or ""
      "identity": { "value": true|false, "evidence": ["..."] },
      "readability": {                                            // C3 — whole-garment reconstructability
        "value": true|false,                                      // MUST agree with basis
        "basis": "RECONSTRUCTABLE"|"NOT_RECONSTRUCTABLE",         // ★ the ONLY eligibility authority
        "limitation": ["TERMINAL_REGION_CROPPED"|"FRAGMENTARY_VISIBILITY"|"OCCLUDED_BY_OTHER_GARMENT"|"CONTINUOUS_STRUCTURE_VISIBLE"],
        "evidence": ["..."]                                       // explanatory only — never decides
      },
      "prominence": "dominant"|"secondary"|"minor",
      "category": { "state": "OBSERVED"|"UNKNOWN", "value": "<exact canonical category>"|null, "evidence": ["..."] },
      "observations": {
        "<canonical_parameter>": { ... see the two templates below — SINGLE and MULTI are DIFFERENT ... }
      }
    }
  ],
  "cross_target_visual_relations": [                              // OPTIONAL — omit when there are none (RG-5 only)
    { "relation_id": "<short id>", "target_ids": ["<id>","<id>"], // 2 or more DISTINCT targets — never one
      "kind": "REPEATED_TRIM_MOTIF"|"REPEATED_MATERIAL_TREATMENT"|"REPEATED_DECORATIVE_MOTIF"|"REPEATED_COLOUR_TREATMENT"|"OTHER_VISUAL_COORDINATION",
      "evidence": "<what is visually shared>" }                   // observation only — declares NO suit / pair / scoring unit
  ]
}

[OBSERVATION SHAPE — SINGLE vs MULTI ARE TWO DIFFERENT SHAPES. DO NOT MIX THEM.]

There are exactly FIVE MULTI parameters:
  material · surface · decorative_detail · attachment · exposure_opening
EVERY other parameter is SINGLE.

(A) SINGLE parameter — carries its value in the scalar "value":
        "<single_parameter>": {
          "state": "OBSERVED"|"ABSENT"|"NOT_VISIBLE"|"UNKNOWN",
          "value": "<EXACT canonical value or semantic 'None'>"|null,
          "region": "whole_garment"|"upper"|"lower"|null,
          "evidence": ["<short visible cue>"],
          "byRegion": { "upper": {"state":"...","value":"...","evidence":["..."]}, "lower": {"state":"...","value":"...","evidence":["..."]} }, // regional params only
          "descriptor": "<required IFF value is 'Other'>",
          "count": <integer>, "density": "sparse"|"moderate"|"dense"
        }
    SINGLE state rule:  OBSERVED -> "value" REQUIRED   ·   ABSENT/NOT_VISIBLE/UNKNOWN -> "value": null

(B) MULTI parameter — carries its values in "values"[], and the scalar "value" is ALWAYS null:
        "<multi_parameter>": {
          "state": "OBSERVED"|"ABSENT"|"NOT_VISIBLE"|"UNKNOWN",
          "value": null,
          "region": "whole_garment"|"upper"|"lower"|null,
          "evidence": ["<short parameter-level cue>"],
          "values": [ { "value":"<canonical>", "descriptor":"<required IFF this value is 'Other'>", "evidence":["..."],
                        "coverage": "Localized"|"Partial"|"Dominant",                                                // coverage OPTIONAL (see [LOCATION] > COVERAGE) — material/surface/decorative_detail/attachment ONLY
                        "locations": [ { "component":"<canonical component>", "descriptor":"Panel"|"Edge" } ] } ]   // locations OPTIONAL (see [LOCATION])
        }
    MULTI state rule:   OBSERVED -> "value": null AND "values"[] non-empty
                        ABSENT/NOT_VISIBLE/UNKNOWN -> "value": null AND "values"[] empty or omitted

[MULTI SERIALIZATION — MANDATORY]
- For MULTI parameters, the scalar "value" is ALWAYS null.
- All observed MULTI canonical values MUST be emitted in "values"[].
- ⛔ NO MULTI DOMAIN CONTAINS "None". Total absence of every value of a MULTI parameter is state = ABSENT with
  scalar "value" null and NO values[] content — NEVER state OBSERVED with the word "None" (or any other word) in
  the scalar "value" or inside "values"[]. Writing OBSERVED + "None" on a MULTI parameter is a double contract
  violation (scalar value present + observed-without-values); its correct spelling is simply ABSENT.
- Even when exactly ONE MULTI value is observed, put it in "values"[]; never move it to the scalar "value".
- Do NOT use the scalar "value" as a fallback when "values"[] contains one item.
- Do NOT omit "values"[] when a MULTI parameter's state is OBSERVED.
- CORRECT (one value observed):  "material": { "state":"OBSERVED", "value": null, "values":[ {"value":"Leather","evidence":["..."]} ] }
- CORRECT (two values observed): "material": { "state":"OBSERVED", "value": null, "values":[ {"value":"Leather","evidence":["..."]}, {"value":"Knit","evidence":["..."]} ] }
- WRONG: "material": { "state":"OBSERVED", "value":"Leather", "values":[ {"value":"Leather"} ] }   (scalar duplicated)
- WRONG: "material": { "state":"OBSERVED", "value":"Leather" }                                      (values[] omitted — the observation would be LOST)
- The scalar "value" on a MULTI parameter is NOT a primary, dominant, representative, first, or fallback value. It has no meaning at all. "values"[] is the only carrier.

- OMIT a parameter's key ONLY when the parameter does not APPLY to this category (the NOT-APPLICABLE list below is authoritative).
  ⛔ Key omission is a CONTRACT statement about APPLICABILITY — it is NOT how you report "I could not see it". If the
  parameter applies to this category but you cannot see it, you must still emit the key and say so honestly with the
  correct state: NOT_VISIBLE (occluded / cropped / out of frame) or UNKNOWN (visible but undeterminable).
  ⛔ Nothing downstream fills in an observation you left out. An omitted applicable key is a rejected record, not a
  gap that the controller repairs.
- Every value MUST be an exact canonical token from the domains below (correct spelling and case). Never paraphrase or use a near-synonym.`;

// ══ D2-LIVE-2 · FAMILY-A SEMANTIC-`None` EXPLICIT MEMBERSHIP (CEO Decision 2026-08-23) ═══════
// ROOT CAUSE (live evidence, 2026-08-23): the SV-5 rule above tells the model to look a parameter's
// domain up for itself. Under live extraction that inference failed on `rib_hem` twice — once by
// omitting the key entirely (B3-09, a slip dress) and once by emitting ABSENT with the evidence
// "lower hem is plain self-fabric edge, not a ribbed band" (B3-16). The model SAW the absence
// correctly and still chose the wrong state. Membership is therefore made EXPLICIT here.
//
// ⛔ SINGLE AUTHORITY. Membership is derived from `domainFor(param, category).includes('None')` —
//    the exact predicate producer_validator_v1.js uses in its own `isNoneDomain()`. There is NO
//    second Family-A list anywhere: edit VALUE_DOMAINS and this block changes with it.
// ⛔ NO parameter-specific special case. `rib_hem` is evidence of the general defect, not an
//    exception; it is never named in the rendering logic.
function familyAGuide() {
  const R2 = require('./producer_rules_v1');
  const isNoneDomain = (p, c) => { const d = R2.domainFor(p, c); return Array.isArray(d) && d.includes('None'); };
  const rows = R2.CATEGORIES.map(c => {
    const members = R2.ALL_PARAMS.filter(p => p !== 'category' && R2.applicableSet(c).has(p) && isNoneDomain(p, c));
    return '  · ' + (c + ':').padEnd(12) + (members.length ? members.join(', ') : '(none)');
  });
  return [
    'These parameters carry the canonical value `None` in their own value domain. For them, a feature you have',
    'LOOKED AT and confirmed is not there is reported as state = OBSERVED with value = "None".',
    '',
    ...rows,
    '',
    'For a parameter in the list above, when the feature is confirmed absent:',
    '  ⛔ do NOT omit the key — omission is reserved for parameters that do not APPLY to this category.',
    '  ⛔ do NOT write ABSENT — ABSENT is for a parameter whose domain has no `None` value.',
    '  ⛔ do NOT write NOT_VISIBLE — that means the region is occluded, cropped or out of frame.',
    '  ⛔ do NOT write UNKNOWN — that means the region is visible but the value cannot be determined.',
    '  ✓ write: { "state": "OBSERVED", "value": "None", "evidence": [what you looked at] }',
    '',
    'Worked example of the distinction, on one parameter with `None` in its domain:',
    '  hem is visible and is a plain self-fabric edge, not a ribbed band  → OBSERVED / "None"   ✓ confirmed absence',
    '  hem is hidden behind a bag / cropped out of frame                  → NOT_VISIBLE / null',
    '  hem is visible but too low-res to judge                            → UNKNOWN / null',
    '⛔ Confirmed absence is an OBSERVATION, not a failure to observe. Seeing that a feature is not there is a',
    'positive finding and must be recorded as the canonical `None` value, never as silence.',
  ].join('\n');
}

// ══ PHASE 2 · P2-R1 — REQUIRED-KEY MIRROR (CEO Order: Batch 005 Phase 2, 2026-08-27) ═════════
// The prompt already renders an authoritative, machine-derived NON-APPLICABLE list per category
// (`nonApplicableGuide`). It never rendered the MIRROR: which keys the category REQUIRES. The
// D2 self-check calls that omission "family 2 … the mirror error, and the more common one", and the
// post-D2 live census proves it: of 20 six-family codes across Batch 004 + Batch 005, ELEVEN are
// APPLICABLE_KEY_MISSING — the single largest family, spanning 5 parameters and 5 categories.
// The model was told precisely what to omit and only told in prose what to emit.
//
// ⛔ SINGLE AUTHORITY. Membership is `UNIVERSAL ∪ MANDATORY[category]` minus `category` — byte-for-byte
//    the SAME expression producer_validator_v1.js uses to raise APPLICABLE_KEY_MISSING. There is NO
//    second required-key list anywhere: change the applicability authority and this block follows.
// ⛔ CONDITIONAL (class C) keys are deliberately EXCLUDED here, exactly as the validator excludes them —
//    their presence is gated by a parent trigger, so requiring them unconditionally would be wrong.
// ⛔ NO parameter-specific and NO image-specific special case. Batch 005 is the evidence that this
//    defect is real; it is never the source of an exception.
function requiredKeyGuide() {
  const R2 = require('./producer_rules_v1');
  const requiredFor = (c) => [...new Set([...R2.UNIVERSAL, ...(R2.MANDATORY[c] || [])])].filter(p => p !== 'category');
  const rows = R2.CATEGORIES.map(c => {
    const req = requiredFor(c);
    return '  · ' + (c + ':').padEnd(12) + '(' + req.length + ')  ' + req.join(', ');
  });
  return [
    'For the category you resolved, EVERY parameter listed below MUST be present as a key in "observations".',
    'This is the exact mirror of the NOT-APPLICABLE list: that one says what must not be there, this one says',
    'what must be there. A required key is required even when the feature is plainly not on the garment —',
    'absence is reported with the governed negative state, never by leaving the key out.',
    '',
    ...rows,
    '',
    'Before you answer, count the keys for your category against its number above. If a key is missing, you have',
    'not finished the observation.',
    '⛔ Leaving out a required key is NOT a way of saying "not applicable" and NOT a way of saying "I could not',
    'see it". Non-applicability is already handled by the NOT-APPLICABLE list; invisibility is NOT_VISIBLE;',
    'indeterminacy is UNKNOWN; confirmed absence is semantic "None" where the domain has it and ABSENT where it',
    'does not. Silence is none of these and is always a rejected record.',
    '⛔ Conditional parameters are NOT in this list because a parent observation gates them. Their own rules',
    'above decide whether they appear — do not add them here and do not treat their absence as a missing key.',
  ].join('\n');
}

function buildPrompt() {
  return [
    SYSTEM,
    CATEGORY_BLOCK(),
    TARGET_RULES(),
    STATE_BLOCK,
    '[SEMANTIC `None` — WHICH PARAMETERS REQUIRE IT (SV-5)]\n' + familyAGuide(), // D2-LIVE-2
    '[REGIONS]\n' + regionGuide(),
    '[LOCATION — optional per-value garment component binding]\n' + locationGuide(),
    '[COVERAGE — optional per-value garment extent]\n' + coverageGuide(),
    POCKET_BLOCK,
    DISCIPLINE_BLOCK,
    DESCRIPTOR_PROTOCOL, // Visual Reconstruction Descriptor Protocol V1 — same single call, no extra API call
    OUTPUT_RULES,
    '[CANONICAL VALUE DOMAINS — category-independent parameters]\n' + flatDomainGuide(),
    '[CANONICAL VALUE DOMAINS — category-dependent parameters]\n' + catDependentGuide(),
    '[NOT APPLICABLE — OMIT THE KEY]\n' + nonApplicableGuide(),
    '[REQUIRED KEYS — EMIT EVERY ONE (P2-R1)]\n' + requiredKeyGuide(),
    CONTRACT_SELF_CHECK, // D2 — rendered last: final gate before the model answers
  ].join('\n\n');
}

module.exports = { buildPrompt, paramGuide: flatDomainGuide, flatDomainGuide, catDependentGuide, regionGuide, locationGuide, coverageGuide, nonApplicableGuide, requiredKeyGuide, SYSTEM, DESCRIPTOR_PROTOCOL };
