/**
 * STMX — 40-Param Vision Producer V1 · DETERMINISTIC CONTROLLER
 * ---------------------------------------------------------------------------
 * D1: the AI observes (model adapter); THIS controller governs frozen rules and
 *   NEVER invents or silently corrects a visual judgment (§7). It:
 *   - assigns Target roles (C2 identity ∧ C3 readability → eligible; Primary/Secondary
 *     equal depth; Incidental excluded from 40-param) — ADR-122/G36,
 *   - resolves applicability from F4 (U/M/C), key-omits N/A,
 *   - evaluates Conditional triggers (else N/A this instance),
 *   - places regions, preserves MULTI / Other+descriptor / multiplicity metadata,
 *   - reconciles completeness U+M+C+N=36 (Producer-36 · +sleeve_volume 2026-08-16; was 40 pre-consolidation),
 *   - runs the deterministic validator (validate ≠ correct).
 * Runtime envelope (D3) is kept separate from the canonical record; nothing here scores
 *   or consults the engine (Observation ≠ Consumption · G40).
 */
'use strict';
const R = require('./producer_rules_v1');
const { runOneCall } = require('./producer_model_adapter_v1');
const { validateRecord } = require('./producer_validator_v1');

const CONNECTION_NONSTANDARD = ['Strap', 'Strapless', 'Halter', 'One Shoulder'];
const SPAN_MEANINGFUL = ['Narrow', 'Extended'];
const BUTTON_OPENING = ['Button', 'Snap Button'];

function trimStr(s) { return typeof s === 'string' ? s.trim() : s; }

// Non-semantic normalization of a raw observation (trim only; never change meaning).
function normObs(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const o = {};
  if (raw.state != null) o.state = trimStr(raw.state);
  if (raw.value !== undefined) o.value = trimStr(raw.value);
  if (raw.region != null) o.region = trimStr(raw.region);
  if (Array.isArray(raw.evidence)) o.evidence = raw.evidence.map(trimStr);
  if (Array.isArray(raw.values)) o.values = raw.values.map(v => {
    const item = { value: trimStr(v.value), descriptor: trimStr(v.descriptor), evidence: Array.isArray(v.evidence) ? v.evidence.map(trimStr) : v.evidence };
    // EI P3 COVERAGE (D6 · CEO 2026-09-03): preserve the per-value `coverage` VERBATIM (trim only).
    // ⛔ FIREWALL — the controller NEVER infers, defaults, upgrades or downgrades a coverage. It does
    //    not read "Dominant" out of a missing locations[], does not turn a Lapel location into
    //    "Localized", and never converts coverage into DM primitives or into an EI force
    //    (Weak/Meaningful/Strong). Structure is preserved; meaning is never manufactured (§7).
    if (v.coverage !== undefined) item.coverage = trimStr(v.coverage);
    // D-4 (CA#16): preserve per-value `locations[]` VERBATIM (trim only).
    // ⛔ FIREWALL — the controller NEVER infers a location. It does not guess that
    //    "Glossy is usually a Lapel" or "Quilted on a bomber is probably the Body".
    //    If the model did not observe a component, none is written. Structure is
    //    preserved; meaning is never manufactured (§7 validate ≠ correct).
    // CEO 2026-09-05 §10 — carry the per-value finish_realization VERBATIM (trim only).
    if (v.finish_realization != null) item.finish_realization = trimStr(v.finish_realization);
    // CEO 2026-09-06 RESUME-1C — carry the per-value treated_surface_realization VERBATIM (trim only).
    // ⛔ No semantic transformation, no force mapping, no descriptor interpretation. The validator
    //    decides eligibility; the controller only preserves what the model actually observed.
    if (v.treated_surface_realization != null) item.treated_surface_realization = trimStr(v.treated_surface_realization);
    if (Array.isArray(v.locations)) item.locations = v.locations.map(L => {
      if (!L || typeof L !== 'object') return L;      // malformed → pass through for the validator to reject
      const loc = {};
      if (L.component != null) loc.component = trimStr(L.component);
      if (L.descriptor != null) loc.descriptor = trimStr(L.descriptor);
      return loc;
    });
    return item;
  });
  if (raw.descriptor != null) o.descriptor = trimStr(raw.descriptor);
  if (raw.count != null) o.count = raw.count;
  if (raw.density != null) o.density = trimStr(raw.density);
  // CEO 2026-09-05 §5 — carry the model's motif_complexity VERBATIM (trim only).
  // ⛔ FIREWALL: the controller never creates, infers or defaults it. An illegal value is passed
  //    through for the validator to reject, exactly as density and locations[] are.
  if (raw.motif_complexity != null) o.motif_complexity = trimStr(raw.motif_complexity);
  // CEO 2026-09-05 §6 / §12 — carry visual_dominance and product_context VERBATIM (trim only).
  // ⛔ FIREWALL: never created, never inferred, never defaulted. Illegal values pass through for the
  //    validator to reject, exactly as density, locations[] and pockets[] do.
  if (raw.visual_dominance != null) o.visual_dominance = trimStr(raw.visual_dominance);
  if (raw.product_context != null) o.product_context = trimStr(raw.product_context);
  // P-2 (CA#26): preserve per-pocket-instance `pockets[]` VERBATIM (trim only).
  // ⛔ FIREWALL — the controller NEVER creates an instance, never infers a location, and never
  //    infers construction/projection. It does not convert scalars into instances or instances
  //    into scalars. Malformed entries are passed through for the validator to reject, exactly
  //    as D-4 `locations[]` does: structure is preserved, meaning is never manufactured (§7).
  if (Array.isArray(raw.pockets)) o.pockets = raw.pockets.map(inst => {
    if (!inst || typeof inst !== 'object') return inst;   // malformed → validator rejects
    const it = {};
    if (inst.location != null) it.location = trimStr(inst.location);
    if (inst.construction && typeof inst.construction === 'object') it.construction = normObs(inst.construction);
    if (inst.projection && typeof inst.projection === 'object') it.projection = normObs(inst.projection);
    return it;
  });
  if (raw.byRegion && typeof raw.byRegion === 'object') { o.byRegion = {}; for (const k of Object.keys(raw.byRegion)) o.byRegion[k] = normObs(raw.byRegion[k]); }
  return o;
}

// SR-CLOSEOUT (CEO 2026-08-21) · Waist Definition LENGTH GATE.
// Canonical Length values that sit at or above the waist, i.e. the garment does not extend far
// enough below the waist for waist shaping to be evaluable. Drawn ENTIRELY from the existing
// frozen Jacket length domain ['Cropped','Waist Length','Hip Length'] — no new vocabulary.
// Coat ('Hip Length'+), Dress and Jumpsuit domains have no member at/above the waist, so the
// gate is a no-op for them; only Jacket can actually carry these values as a Conditional.
const WAIST_SHORT_LENGTHS = ['Cropped', 'Waist Length'];

// Evaluate whether a Conditional parameter's trigger is met, from the raw model observations.
// `category` is optional and used only by the waist_definition length gate.
function conditionalTriggered(param, rawObs, category) {
  const g = (k) => rawObs && rawObs[k];
  switch (param) {
    case 'pocket_construction':
    case 'pocket_projection': { const p = g('pocket'); return !!(p && p.state === 'OBSERVED' && p.value === 'Present'); }
    // closure_type is Conditional on TOP/Dress/Jumpsuit (absorbed former front_opening_type); gate = a front opening exists.
    case 'closure_type': { const e = g('front_opening_extent'); return !!(e && e.state === 'OBSERVED' && e.value && e.value !== 'None'); }
    case 'shoulder_connection': { const c = g('shoulder_connection'); return !!(c && c.state === 'OBSERVED' && CONNECTION_NONSTANDARD.includes(c.value)); }
    case 'shoulder_span': { const s = g('shoulder_span'); return !!(s && s.state === 'OBSERVED' && SPAN_MEANINGFUL.includes(s.value)); }
    // ── CUFF MIGRATION (CEO 2026-08-21) ──────────────────────────────────────────────────
    // The retired `french_cuff` gate lived here and was SELF-REFERENTIAL — it read its own field
    // (`g('french_cuff')`), i.e. "applicable if it was emitted", the same defect removed from
    // waist_definition below. Per CEO K6 it was not separately repaired; this migration removes it.
    // Both replacements use a REAL parent.
    case 'cuff_type': { const s = g('sleeve'); return !!(s && s.state === 'OBSERVED' && s.value && s.value !== 'Sleeveless'); }
    case 'cuff_scale': { const t = g('cuff_type'); return !!(t && t.state === 'OBSERVED' && t.value && t.value !== 'None'); }
    // ── COMPONENT SCALE PRODUCTION FINALIZATION (CEO 2026-08-23 · Q1/Q3) ──────────────────
    // collar_scale mirrors cuff_scale exactly, one component up: the parent is the component TYPE
    // parameter, and carrier absence (`collar = None`) key-omits the scale. Registering the gate
    // here is REQUIRED, not a special case — this switch is the applicability gate table, and an
    // unregistered Conditional falls through to `default: return true`, i.e. always-applicable,
    // which would make `collar = None` wrongly demand a scale.
    // ★ ONE gate covers collars AND lapels: Notched/Peak/Shawl are `collar` values, so there is no
    //   `lapel_scale` case here and none is to be added.
    case 'collar_scale': { const c = g('collar'); return !!(c && c.state === 'OBSERVED' && c.value && c.value !== 'None'); }
    // sleeve_volume (D-SV-1): applicable only when a sleeve body is present — sleeve OBSERVED ∧ ≠ Sleeveless; else N/A this instance.
    case 'sleeve_volume': { const s = g('sleeve'); return !!(s && s.state === 'OBSERVED' && s.value && s.value !== 'Sleeveless'); }
    // ── CA#27 · waist_definition — MODEL B (self-contained observation) ────────────────────
    // REMOVED a self-referential no-op gate. It previously read:
    //     case 'waist_definition': { const w = g('waist_definition');
    //       return !!(w && (w.state === 'OBSERVED' || w.state === 'NOT_VISIBLE' || w.state === 'UNKNOWN')); }
    // The trigger consulted the parameter ITSELF, and its condition admitted every state except
    // ABSENT — i.e. "applicable if and only if the model chose to emit it". A Vision omission
    // therefore failed the trigger and was filed as `conditional_na` (= NOT APPLICABLE), so it was
    // key-omitted, never reached `diagnostics.unreported`, and raised no validator error. The
    // omission was structurally UNOBSERVABLE. Measured over the governed corpus: 45 of 130
    // applicable-category records omitted it (34.6%), 45/45 silently conditional_na, 0 unreported.
    // Authority already said otherwise — the Schema field-def gives this parameter the state set
    // OBSERVED/NOT_VISIBLE/UNKNOWN and lists it under "OBSERVED + value". So applicability is a
    // CATEGORY GATE ONLY (Jacket/Coat/Dress/Jumpsuit, class C, unchanged): within those categories
    // it is ALWAYS an observation target, and unreadability is carried by NOT_VISIBLE / UNKNOWN.
    // Falling through to `default: return true` restores that contract, so a missing observation
    // now surfaces honestly in `unreported[]` instead of being silently reclassified.
    // ⛔ No parent parameter is introduced; the controller still never infers waist shaping.
    //
    // ── SR CLOSEOUT (CEO Decision 2026-08-21) · LENGTH GATE ADDED ─────────────────────────
    // The category gate above is PRESERVED and now carries a SECOND gate. Waist Definition
    // requires enough garment below the waist for waist shaping to be evaluable:
    //     Hip Length or longer   → MAY be applicable  (category gate still decides)
    //     Waist Length or shorter → N/A
    // A Cropped / Waist-Length Jacket must NOT emit `waist_definition = Undefined` merely
    // because no shaping is visible — the correct semantic is N/A (key-omit), because the
    // morphology needed to judge it does not exist.
    // ⛔ Hip Length is an APPLICABILITY THRESHOLD, not evidence that waist definition exists.
    // ⛔ Still no parent-parameter inference: `length` is an independent frozen observation and
    //    the controller reads it only to decide APPLICABILITY, never to infer a waist value.
    // If `length` is not OBSERVED (NOT_VISIBLE / UNKNOWN / omitted) the gate cannot establish
    // that the garment is short, so applicability is left to the category gate (unchanged
    // behaviour) and unreadability keeps flowing through NOT_VISIBLE / UNKNOWN.
    case 'waist_definition': {
      const len = g('length');
      if (len && len.state === 'OBSERVED' && WAIST_SHORT_LENGTHS.includes(trimStr(len.value))) return false;
      return true;
    }
    default: return true;
  }
}

// Evaluate whether a construction-suppression condition holds (CA#11 · D1). Suppresses an otherwise-Mandatory
// parameter to N/A for THIS instance only (redundant observation) — never a category-wide change.
function constructionTriggered(key, rawObs) {
  const g = (k) => rawObs && rawObs[k];
  switch (key) {
    case 'polo_neckline': {
      const col = g('collar');
      const ext = g('front_opening_extent');
      const typ = g('closure_type'); // Closure 3→1: the placket mechanism now lives on closure_type
      const shirtCollar = !!(col && col.state === 'OBSERVED' && col.value === 'Shirt');
      const partialOpen = !!(ext && ext.state === 'OBSERVED' && ext.value === 'Partial');
      const buttonOpen = !!(typ && typ.state === 'OBSERVED' && BUTTON_OPENING.includes(typ.value));
      return shirtCollar && partialOpen && buttonOpen;
    }
    default: return false;
  }
}

// Region metadata normalization (non-semantic) — CEO Decision D-3 (2026-08-18 · Batch 001 Stage 1).
//
// When a parameter has EXACTLY ONE legal canonical region for the resolved category, that region is
// fully determined by the frozen region authority (`R.regionFor`) — there is nothing for the model to
// decide. The controller therefore SETS it: it fills an omitted region (prior behaviour) and also
// normalizes a mis-emitted one (D-3). This is metadata only.
//
// ⛔ STRICT BOUNDARY — this must NEVER touch meaning:
//   • value, values[], evidence, descriptor, state, count, density, applicability are all left untouched
//     (a shallow copy replaces the `region` key and nothing else).
//   • If a parameter has TWO OR MORE legal regions the controller MUST NOT choose one — no inference,
//     no guessing, no semantic repair. Those observations pass through unchanged and remain subject to
//     normal validator behaviour (BAD_REGION / MISSING_REGION).
//   • byRegion (Dress/Jumpsuit fabric_behavior/fit) is multi-region by construction → returned untouched.
// This is generic, derived from the legal-region authority — NOT a shoulder_structure special case.
function withRegion(param, category, o) {
  if (o && o.byRegion) return o; // regional param handled separately
  const legal = R.regionFor(param, category);
  if (!o || legal.length !== 1) return o;          // 2+ legal regions → controller never selects
  if (o.region === legal[0]) return o;             // already canonical
  return Object.assign({}, o, { region: legal[0] }); // omitted OR mis-emitted → deterministic normalization
}

// ══ MULTI-GARMENT · EXTRACTION DEPTH — THE SINGLE AUTHORITY (MG-D2 · MG-G6) ══════════════════
// ★ ONE derivation, here. Validator, append tool, Review Book and workbook all READ this; none of
//   them recomputes it, and Vision is never asked to invent a second classification that could
//   disagree with role/readability (order §9).
//
//   NONE    — no Producer extraction exists (ineligible target: identity ∧ ¬readability).
//   PARTIAL — an applicable MANDATORY parameter could not be read (NOT_VISIBLE / UNKNOWN):
//             the garment's own category-defining morphology is materially occluded.
//   FULL    — every applicable MANDATORY parameter was readable. Individual UNIVERSAL or
//             CONDITIONAL parameters may still honestly be NOT_VISIBLE — MG-D2 explicitly allows
//             that inside FULL.
//
// ⛔ NO second applicability authority is created (order §5). "Material morphology" is not a new
//    hand-written registry — it is the EXISTING operational class: MANDATORY is, by the frozen
//    applicability authority, precisely the set that defines a garment for its category.
// ⛔ No numeric threshold, no percentage, no pixel rule.
// ⛔ Relationship membership (e.g. Suit) is NOT an input here (MG-G10).
const HIDDEN_STATES = ['NOT_VISIBLE', 'UNKNOWN'];
function hiddenMandatoryOf(record) {
  const cat = record && record.category && record.category.value;
  if (!cat || !R.CATEGORIES.includes(cat)) return [];
  const obs = record.observations || {};
  return Object.keys(obs).filter(p =>
    R.ALL_PARAMS.includes(p)
    && R.operationalClass(p, cat) === 'M'
    && obs[p] && HIDDEN_STATES.includes(obs[p].state));
}
function extractionDepthOf(record) {
  if (!record || !record.observations) return 'NONE';
  return hiddenMandatoryOf(record).length ? 'PARTIAL' : 'FULL';
}

// ══ STAGE 0 · C3 STRUCTURAL READABILITY — GOVERNED CONCLUSION AXIS (DESIGN 1) ════════════════
//
// ★ CEO Decision 2026-08-29 (DESIGN 1 승인). C3 의 governed 의미:
//
//     "Is enough of this garment structurally visible to treat it as an independent garment
//      target whose meaningful whole-garment morphology can be reconstructed from the image?"
//
//   C3 는 다음과 **동치가 아니다**: category 식별 가능 · 일부 국소 속성 관측 · waistband 가시 ·
//   pocket 가시 · neckline 가시 · sleeve 가시 · material 가시 · `silhouette` OBSERVED ·
//   `length` OBSERVED · 특정 개수의 파라미터 관측.
//
// ── 이 블록이 대체한 것 (REVERT · CEO Decision 2026-08-29) ────────────────────────────────
//   ⛔ `geometryUnreadable()` (silhouette+length 교차검증) 은 **제거되었다**. CEO calibration
//      집합에서 올바른 개입 0건 · 잘못된 개입 1건이었다 — 종단 geometry 가 판독 불가인 채로
//      CEO 가 ELIGIBLE 로 확정한 의복을 반대로 강등했다. "종단 geometry 판독 불가 ⇒ whole
//      garment 판독 불가" 추론은 CEO 가 명시적으로 기각했다. ⛔ 어떤 이름으로도 재도입하지 않는다.
//      (사례 provenance 는 STAGE0_CEO_ADJUDICATION.json 및 설계 검토 문서에 있다.)
//
// ── 두 축 분리 (§4 · §5 · §6) ────────────────────────────────────────────────────────────
//   축 1 · BASIS      = 최종 결론. **이것만이 C3 를 결정한다.** 단일 추상 수준
//                       (whole-garment independent reconstructability) 의 2값.
//   축 2 · LIMITATION = 설명/감사용 원인. **단독으로 적격성을 결정하지 않는다.**
//
// ── FIREWALL (§7) ────────────────────────────────────────────────────────────────────────
//   같은 원인이 같은 C3 결과를 뜻하지 않는다 — CEO calibration 에서 동일한 종단 crop 이 한 쪽은
//   RECONSTRUCTABLE, 다른 쪽은 NOT_RECONSTRUCTABLE 로 확정되었다. 따라서 LIMITATION 은 결코
//   결론을 도출하지 않는다.
//   역방향도 동일 — 국소 필드가 OBSERVED 라는 사실이 자동으로 true 를 뜻하지 않는다.
//
// ⛔ 퍼센트 · 픽셀 · 임계값 · confidence · morphology 비율 · OBSERVED 개수 규칙 없음.
// ⛔ 카테고리 하드코딩 없음 · REF 예외 없음 · 병렬 eligibility authority 없음.
// ⛔ 이 값들은 Stage 0 target 메타데이터이며 **garment semantic parameter 가 아니다**
//    (Producer 는 37 그대로 · Descriptor 가 factor 38 이 아닌 것과 동일한 근거).
const READABILITY_BASIS = {
  RECONSTRUCTABLE: 'RECONSTRUCTABLE',
  NOT_RECONSTRUCTABLE: 'NOT_RECONSTRUCTABLE',
};
const READABILITY_BASIS_VALUES = Object.keys(READABILITY_BASIS);
// 축 2 — 설명 전용 최소 어휘. 확장 가능하며 어느 값도 결론을 결정하지 않는다.
const READABILITY_LIMITATIONS = [
  'TERMINAL_REGION_CROPPED',      // 종단부(hem·최종 길이 등)가 프레임 밖
  'FRAGMENTARY_VISIBILITY',       // 의복이 조각으로만 보임
  'OCCLUDED_BY_OTHER_GARMENT',    // 다른 의복에 의해 실질적으로 가려짐
  'CONTINUOUS_STRUCTURE_VISIBLE', // 연속된 구조가 충분히 보임
];
/** BASIS ↔ value 의 단일 정합 규칙. 결론 축만 사용한다. */
function basisImpliesReadable(basis) {
  return basis === READABILITY_BASIS.RECONSTRUCTABLE;
}
/**
 * ★ 감사 가능성(§4) — C3 판단 근거를 envelope target 에 **보존**한다.
 *   이전 계약에서는 boolean 조차 저장되지 않아 어떤 C3 판정도 사후 검증할 수 없었다.
 *   legacy target(present=false)에는 키를 만들지 않는다 — 기존 "필드 부재" 규약 그대로.
 */
function readabilityAudit(c3) {
  if (!c3.present) return {};
  return {
    readability: {
      value: c3.value,
      basis: c3.basis,
      limitation: c3.limitation.slice(),
      contract_error: c3.contradiction || null,
    },
  };
}
/**
 * Stage 0 readability 자기보고를 governed 결론으로 해석한다. **단일 authority.**
 *
 * @returns {{present:boolean, value:boolean|null, basis:string|null,
 *            limitation:string[], contradiction:string|null, unknownLimitations:string[]}}
 *   present=false  — legacy: 계약 이전에 추출된 target. 호출자가 기존 legacy 규약대로 처리한다.
 */
function readReadability(cand) {
  const r = cand && cand.readability;
  if (!r || typeof r !== 'object') return {
    present: false, value: null, basis: null, limitation: [], contradiction: null, unknownLimitations: [],
  };
  const value = r.value === true ? true : (r.value === false ? false : null);
  const basis = typeof r.basis === 'string' && r.basis ? r.basis : null;
  const limitation = Array.isArray(r.limitation) ? r.limitation.filter(x => typeof x === 'string') : [];
  const unknownLimitations = limitation.filter(x => READABILITY_LIMITATIONS.indexOf(x) < 0);

  let contradiction = null;
  if (value === null) contradiction = 'READABILITY_VALUE_INVALID';
  else if (basis === null) contradiction = 'READABILITY_BASIS_MISSING';
  else if (READABILITY_BASIS_VALUES.indexOf(basis) < 0) contradiction = 'READABILITY_BASIS_UNKNOWN';
  else if (basisImpliesReadable(basis) !== value) contradiction = 'READABILITY_VALUE_BASIS_CONTRADICTION';
  else if (unknownLimitations.length) contradiction = 'READABILITY_LIMITATION_UNKNOWN';

  return { present: true, value, basis, limitation, contradiction, unknownLimitations };
}
/**
 * ★ CEO 2026-08-25: this now describes EXTRACTION DEPTH, not role. A garment stays a scoring-target
 * candidate (Primary) even when a mandatory parameter is unreadable — the unreadable parameter is
 * reported honestly as NOT_VISIBLE/UNKNOWN and noted here, and it does NOT demote the garment.
 * ⛔ No numeric threshold ("X of Y readable") exists or may be introduced.
 */
function roleBasisOf(record, depth) {
  if (depth === 'NONE') return 'no Producer extraction (identity ∧ ¬readability)';
  const hidden = hiddenMandatoryOf(record);
  return hidden.length
    ? 'scoring-target candidate; extraction PARTIAL — unreadable mandatory morphology: ' + hidden.join(', ')
      + ' (readability does NOT determine scoring role)'
    : 'scoring-target candidate; all applicable MANDATORY morphology readable';
}

// ══ MULTI-GARMENT · RELATIONSHIP (MG-D4 · MG-G9 · MG-G10) ═══════════════════════════════════
// A relationship LINKS garment records by target_id. It never merges payloads, never creates a
// third "Suit garment", and never influences role (role is computed before this runs, from
// morphology accessibility alone).
//
// ⛔ SCOPE = `Suit` ONLY. No Matching Pair / Coordinated Set / Ensemble vocabulary is created here.
// ⛔ EVIDENCE LIMIT (order §14): colour is currently an IMAGE-LEVEL payload, so per-garment tone
//    matching cannot be established. Anything emitted here is therefore a CANDIDATE for CEO
//    adjudication — never a confirmed Suit — and automatic Suit detection is NOT claimed as
//    production-proven.
function multiValues(o) {
  if (!o) return [];
  if (Array.isArray(o.values)) return o.values.map(v => v && v.value).filter(Boolean);
  return o.value ? [o.value] : [];
}
function suitCandidates(targets) {
  const eligible = targets.filter(t => t.eligible && t.record);
  const out = [];
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i], b = eligible[j];
      const ca = a.record.category && a.record.category.value;
      const cb = b.record.category && b.record.category.value;
      const pair = [ca, cb].sort().join('+');
      if (pair !== 'Jacket+Trouser') continue;          // Suit shape only
      const ma = multiValues(a.record.observations.material);
      const mb = multiValues(b.record.observations.material);
      const sharedMaterial = ma.filter(x => mb.includes(x));
      out.push({
        type: 'Suit',
        status: 'CANDIDATE — requires CEO adjudication',
        members: [a.target_id, b.target_id],            // ★ references, never copies
        member_categories: [ca, cb],
        evidence: {
          matching_material: sharedMaterial,
          colour: 'NOT ESTABLISHED — Colour V1 is an image-level payload; per-garment tone matching is unavailable',
        },
        note: 'Relationship does not determine role and does not replace either garment record.',
      });
    }
  }
  return out;
}

// Govern one eligible target into a canonical record + diagnostics.
function governTarget(rawTarget) {
  const catObs = rawTarget.category || {};
  const catUnknown = catObs.state === 'UNKNOWN';
  const category = catUnknown ? null : trimStr(catObs.value);
  const rawObs = rawTarget.observations || {};
  const diagnostics = { unreported: [], conditional_na: [], not_applicable_count: 0, notes: [] };

  const record = {
    category: catUnknown ? { state: 'UNKNOWN', value: null } : { state: 'OBSERVED', value: category },
    observations: {},
    completeness: null,
  };

  // Determine the applicable parameter set.
  let applicable;
  if (catUnknown) {
    applicable = new Set(R.UNIVERSAL); // GROUP A(10) only
  } else if (!R.CATEGORIES.includes(category)) {
    diagnostics.notes.push(`unresolved/illegal category '${category}' — treated as UNKNOWN routing`);
    applicable = new Set(R.UNIVERSAL);
  } else {
    applicable = R.applicableSet(category);
  }

  // Construction-triggered suppression (CA#11): an otherwise-Mandatory param → governed N/A this instance
  // when a construction condition holds (e.g., Polo neck redundant under Shirt collar + partial button placket).
  const constructionNa = new Set();
  if (!catUnknown && R.CATEGORIES.includes(category)) {
    for (const key of Object.keys(R.CONSTRUCTION_SUPPRESSION)) {
      const spec = R.CONSTRUCTION_SUPPRESSION[key];
      if (spec.categories.includes(category) && constructionTriggered(key, rawObs)) {
        for (const p of spec.suppresses) constructionNa.add(p);
        diagnostics.notes.push(`construction '${key}' → N/A (redundant): ${spec.suppresses.join(', ')}`);
      }
    }
  }

  // ── P-2 · CA#26 Option C — INSTANCE-TRIGGERED SUPPRESSION ────────────────────────────────
  // When Vision emits per-pocket instances, `pockets[]` is the SOLE canonical morphology carrier,
  // so the two scalar morphology parameters become governed N/A for this instance and are
  // key-omitted. This is the SAME mechanism as CA#11 construction-triggered suppression (a
  // parameter is redundant because the information is carried elsewhere) — reusing that set and
  // its `conditional_na` diagnostics, NOT a parallel mechanism.
  // ⛔ The controller does not judge WHETHER instances were warranted; it only observes that they
  //    were emitted. It never creates, infers, or derives them.
  // ★ CA#29 (CEO 2026-08-19): `pockets[]` is now the SOLE canonical morphology carrier, so the two
  //   scalars are suppressed whenever pocket = Present — not merely when instances happen to appear.
  //   Measured basis: the scalar carrier was emitted 0 times in 35 live runs across two prompt
  //   versions (campaign 0/29 · CA#28 focused 0/18), including after an explicit mandatory
  //   instruction to use it. The path does not exist in practice, so it is retired as an ANSWER FORM.
  //   ⛔ Parameter identity is untouched — pocket_construction/pocket_projection remain PN 22/23 of
  //      the frozen 36, and historical GT holding scalar values stays readable and is never rewritten.
  //   ⛔ The controller still infers nothing: a missing `pockets[]` is passed through to the
  //      validator, never fabricated into an instance or a scalar.
  {
    const po = rawObs.pocket;
    if (po && typeof po === 'object' && po.state === 'OBSERVED' && trimStr(po.value) === 'Present') {
      for (const p of R.POCKET_SCALAR_MORPHOLOGY) constructionNa.add(p);
      diagnostics.notes.push(`pocket Present → morphology carried by pockets[] only; scalar carrier retired (CA#29): ${R.POCKET_SCALAR_MORPHOLOGY.join(', ')}`);
    }
  }

  const conditionalNa = new Set();
  for (const param of applicable) {
    const cls = catUnknown ? 'U' : R.operationalClass(param, category);
    const raw = rawObs[param];
    // Construction-triggered suppression: redundant Mandatory observation → governed N/A this instance (key-omit).
    if (!catUnknown && constructionNa.has(param)) {
      diagnostics.conditional_na.push({ param, reason: 'construction-triggered N/A (redundant observation · CA#11)' });
      continue;
    }
    // Conditional gating (only for real categories): untriggered → governed N/A this instance (key-omit).
    if (!catUnknown && cls === 'C' && !conditionalTriggered(param, rawObs, category)) {
      conditionalNa.add(param);
      diagnostics.conditional_na.push({ param, reason: (R.CONDITIONAL_TRIGGER[param] || {}).rule || 'trigger not met' });
      continue;
    }
    if (raw && typeof raw === 'object') {
      record.observations[param] = withRegion(param, category || 'T-Shirt', normObs(raw));
    } else {
      diagnostics.unreported.push(param); // applicable but model did not report — NOT fabricated
    }
  }

  // Surface model-emitted ILLEGAL params (N/A for category · forbidden · unknown-name · GROUP-B under UNKNOWN)
  // into the record so the deterministic validator flags them (F5/F6/forbidden). NOT silently dropped (§7).
  for (const key of Object.keys(rawObs)) {
    if (key in record.observations) continue;      // already governed-in
    if (conditionalNa.has(key)) continue;          // governed N/A (e.g., ordinary Standard shoulder) — legitimately omitted
    if (applicable.has(key)) continue;             // applicable but unreported handled above
    const raw = rawObs[key];
    if (raw && typeof raw === 'object') { record.observations[key] = normObs(raw); diagnostics.notes.push(`illegal-or-extra param surfaced for validation: ${key}`); }
  }

  // N (not-applicable to category) count for completeness reconciliation
  if (!catUnknown && R.CATEGORIES.includes(category)) {
    const cc = R.completenessCounts(category);
    diagnostics.not_applicable_count = cc.N;
    record.completeness = Object.assign({}, cc, {
      reported: Object.keys(record.observations).length,
      conditional_na: diagnostics.conditional_na.length,
      unreported: diagnostics.unreported.length,
      // DERIVED from the parameter registry, not a literal. History: 35 → 36 (sleeve_volume,
      // D-SV-1 CEO 2026-08-16) → 37 (collar_scale, CEO 2026-08-23 Q1). The literal previously had to
      // be hand-edited at every count change — the same silent-drift hazard removed from the
      // validator's completeness check in this order. Same authority the matrix is built from.
      reconciled: cc.total === R.ALL_PARAMS.length,
    });
  } else {
    record.completeness = { note: 'Category UNKNOWN → GROUP A(10) only; U+M+C+N reconciliation N/A', reconciled: true };
  }

  const validation = validateRecord(record);

  // ---- Derived Whole Garment Silhouette (D-OP-8/9/10 · CEO 2026-08-16) ----
  // Deterministic, non-model, NOT a raw parameter (excluded from PN / ALL_PARAMS / completeness).
  // Dress + Jumpsuit only; geometry-driven — fit/waist are provenance only and NEVER rewrite the family.
  if (!catUnknown && (category === 'Dress' || category === 'Jumpsuit')) {
    const geo = record.observations.silhouette && record.observations.silhouette.value;
    const DRESS = { Straight: 'Column', Widening: 'A-Line', Flared: 'Fit-and-Flare', Narrowing: 'Tapered' };
    const JUMP  = { Straight: 'Straight', Flared: 'Flared', Tapered: 'Tapered' };
    const map = category === 'Dress' ? DRESS : JUMP;
    const value = (geo && map[geo]) ? map[geo] : 'Indeterminate';
    record.derived = {
      whole_garment_silhouette: {
        value,
        derived: true,            // deterministic · non-model · not a raw parameter
        region: 'whole_garment',
        provenance: {
          silhouette: geo != null ? geo : null,
          fit: record.observations.fit || null,
          waist_definition: (record.observations.waist_definition && record.observations.waist_definition.value) || null,
        },
      },
    };
  }

  return { record, diagnostics, validation };
}

/**
 * runProducer — top-level: one image → one vision call → governed per-target records.
 * @param {*} image opaque image reference passed to visionFn
 * @param {object} opts { visionFn, timeoutMs?, maxTechnicalRetries?, model?, imageId? }
 * @returns {Promise<{ok:boolean, envelope|error}>}
 */
async function runProducer(image, opts) {
  const options = opts || {};
  const call = await runOneCall(image, options);
  if (!call.ok) {
    return { ok: false, error: { stage: 'model_call', code: call.code, detail: call.detail, attempts: call.attempts }, raw: call.raw };
  }
  return governEnvelope(call.pkg, {
    imageId: options.imageId, model: options.model, visionCalls: call.attempts,
  });
}

/**
 * ★★ THE SINGLE MULTI-GARMENT ENVELOPE GOVERNANCE AUTHORITY (MG-G3/G5/G8/G9/G11).
 *
 * Extracted verbatim from `runProducer` (2026-08-23 · Multi-Garment Production Routing Conformance
 * Repair) so that EVERY production entrypoint reaches the SAME frozen rule instead of
 * reimplementing it. The logic below is UNCHANGED — only its callability changed.
 *
 * ⛔ ROOT CAUSE THIS FIXES: the authoritative entrypoint
 *      runFinalExtraction -> runVisionExtraction -> governCombinedPackage(onecall_prototype_v1)
 *    built envelope targets with a PARALLEL, SUPERSEDED rule
 *      role = (cand.prominence === 'dominant') ? 'Primary' : 'Secondary-Eligible'
 *    and emitted no extraction_depth / relationships / image_validation_status. Role is
 *    MORPHOLOGY ACCESSIBILITY, never scene prominence (MG-G3) — so that path could not be correct.
 *
 * ⛔ Do NOT reimplement role/depth/relationship derivation anywhere else. Callers that need extra
 *    payload (e.g. Colour V1) must DECORATE the governed targets returned here, never re-govern them.
 *
 * @param {object} pkg  the parsed Vision package: { targets: [...candidates] }
 * @param {object} opts { imageId, model, visionCalls }
 */
function governEnvelope(pkg, opts) {
  const options = opts || {};
  const envelope = {
    // (A) RUNTIME TRANSPORT ENVELOPE — NOT canonical (D3)
    image_id: options.imageId || null,
    producer: {
      version: 'v1',
      vision_calls: options.visionCalls == null ? 1 : options.visionCalls,
      one_call_default: true,
      model: options.model || 'configurable',
    },
    targets: [],
  };

  const candidates = Array.isArray(pkg && pkg.targets) ? pkg.targets : [];
  let idx = 0;
  for (const cand of candidates) {
    idx++;
    const tid = `target_${idx}`;
    const identity = !!(cand.identity && cand.identity.value === true);
    const descriptor = trimStr(cand.descriptor) || null;

    // ★ C3 — DESIGN 1 (CEO 2026-08-29). 결론 축(basis)이 유일한 C3 권위다.
    //   controller 는 이미지 이해 엔진이 아니다. 형태를 재구성하려 시도하지 않는다 —
    //   governed 결론을 **집행**하고 내부 정합성만 검증한다.
    //   ⛔ OBSERVED 개수 · silhouette/length 쌍 · 카테고리 heuristic · 임계값 사용 금지.
    const c3 = readReadability(cand);
    // 정합성 위반(value↔basis 모순 · basis 누락/미지 · limitation 미지)은 **fail-closed**.
    // 신형식 target 에서 계약이 깨진 채로 적격 판정이 나가지 않는다.
    const readability = c3.present && !c3.contradiction && c3.value === true;
    const eligible = identity && readability; // C2 ∧ C3

    if (!eligible) {
      // Incidental — NO 40-param extraction; minimal runtime diagnostic only.
      // ★ MG-D1: this IS the "visible-but-not-read" state. identity=true ∧ readability=false is
      //   exactly a garment that is SEEN but carries too little independent morphology to justify
      //   extraction. No separate VISIBLE_BUT_NOT_READ enum exists or is needed (MG-G5).
      envelope.targets.push(Object.assign({
        target_id: tid, role: 'Incidental', descriptor, eligible: false,
        extraction_depth: 'NONE',
        reason: c3.contradiction
          // 계약 위반은 정직하게 기록한다 — 자기보고를 지우지 않는다.
          ? `not a Target: identity=${identity} readability=false `
            + `(C3 contract violation: ${c3.contradiction}`
            + (c3.unknownLimitations.length ? ` [${c3.unknownLimitations.join(', ')}]` : '')
            + `; reported value=${c3.value} basis=${c3.basis})`
          : `not a Target: identity=${identity} readability=${readability} (C2∧C3 unmet)`,
        // (B) canonical record intentionally absent · (C) diagnostics
      }, readabilityAudit(c3)));
      continue;
    }
    const governed = governTarget(cand);
    const depth = extractionDepthOf(governed.record);
    envelope.targets.push(Object.assign({
      target_id: tid,
      // ★★ CEO SCORING-ROLE SEMANTICS ALIGNMENT (2026-08-25) — SUPERSEDES the MG-D4/MG-G2 reading
      //    of role as MORPHOLOGY ACCESSIBILITY.
      //
      //    PRIMARY   = a garment selected as a scoring / anchor target for this image.
      //    SECONDARY = detected and observed, but NOT selected as an independent scoring target.
      //
      //    ⛔ REMOVED: `role = depth === 'PARTIAL' ? 'Secondary' : 'Primary'`. That rule demoted a
      //       garment because ONE mandatory parameter happened to be NOT_VISIBLE/UNKNOWN — it made
      //       role a parameter-completeness grade, which is NOT what role means.
      //
      //    ★ At PRODUCER time the anchor selection does not exist yet, so every eligible extracted
      //      garment is a scoring-target CANDIDATE = Primary. `Secondary` is assigned DOWNSTREAM by
      //      the single scoring authority (`scoring_units[]` — see scoring_units_v1.roleOf), for a
      //      garment that was observed but belongs to no scoring unit. ⛔ Two competing scoring
      //      authorities are not created: role never overrides scoring_units[].
      role: 'Primary',
      // readability is PRESERVED — just decoupled from role. This stays the honest signal that some
      // mandatory morphology was not readable, and consumers may still use it as such.
      extraction_depth: depth,
      role_basis: roleBasisOf(governed.record, depth),
      prominence: trimStr(cand.prominence) || null, // scene metadata — NEVER decides role
      descriptor, eligible: true,
      record: governed.record,          // (B) FROZEN CANONICAL EXTRACTION RECORD
      diagnostics: governed.diagnostics, // (C) DIAGNOSTIC / VALIDATION METADATA
      validation: governed.validation,
    }, readabilityAudit(c3)));          // ★ C3 근거 보존 — 적격 경로도 동일하게 감사 가능
  }

  // ★ MULTI-GARMENT: image-level relationships link garment records (MG-G9). Populated only with
  // CANDIDATE status; automatic Suit classification is not claimed (order §14).
  envelope.relationships = suitCandidates(envelope.targets);

  // ★ MG-G11 per-garment validation isolation: each target keeps its OWN verdict. The image-level
  // status is DERIVED and is never the authority — one invalid sibling must not erase a valid one.
  const withRecords = envelope.targets.filter(t => t.eligible && t.validation);
  const validCount = withRecords.filter(t => t.validation.ok !== false).length;
  envelope.image_validation_status = !withRecords.length ? 'NO_GARMENT_RECORDS'
    : validCount === withRecords.length ? 'ALL_GARMENTS_VALID'
      : validCount ? 'PARTIAL' : 'ALL_GARMENTS_INVALID';

  const anyInvalid = envelope.targets.some(t => t.validation && t.validation.ok === false);
  return { ok: true, envelope, contract_valid: !anyInvalid };
}

// `extractionDepthOf` / `hiddenMandatoryOf` are exported so downstream consumers READ the single
// authority instead of reimplementing it (MG-G6).
module.exports = {
  runProducer, governEnvelope, governTarget, conditionalTriggered, constructionTriggered,
  extractionDepthOf, hiddenMandatoryOf, roleBasisOf,
  // ★ STAGE 0 C3 — 단일 authority. 검증기/테스트는 이것을 READ 하며 재구현하지 않는다.
  READABILITY_BASIS, READABILITY_BASIS_VALUES, READABILITY_LIMITATIONS,
  basisImpliesReadable, readReadability,
};
