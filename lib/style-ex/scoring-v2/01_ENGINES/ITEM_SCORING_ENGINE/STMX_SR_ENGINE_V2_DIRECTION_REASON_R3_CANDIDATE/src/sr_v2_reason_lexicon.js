'use strict';
/**
 * STMX SR V2 — CONTROLLED KOREAN REASON LEXICON
 * One entry = one physical claim about one OBSERVED carrier value. Forms: [connective (…고), causal / final (…라 / …어), concessive (…지만)].
 * WORN  — the governed eligibility metadata says ADJUDICABLE_WORN: the garment–body relation is visible and may be named.
 * FLAT  — any other case (flat product photo, worn-but-insufficient, metadata missing): only the garment's own cut is named; no body wording.
 * Regular is never described as body-hugging. Limitation names describe an UNOBSERVED carrier and claim nothing about it.
 */
const BASE = {
  shoulder_structure: { Strong: ['어깨 구조가 분명하게 잡혀 있고', '어깨 구조가 분명하게 잡혀 있어', '어깨 구조가 분명하게 잡혀 있지만'], Extreme: ['어깨 구조가 매우 강하게 잡혀 있고', '어깨 구조가 매우 강하게 잡혀 있어', '어깨 구조가 매우 강하게 잡혀 있지만'], Mild: ['어깨선이 가볍게 잡혀 있고', '어깨선이 가볍게 잡혀 있어', '어깨선이 가볍게 잡혀 있지만'] },
  shoulder_drop: { Dropped: ['어깨선이 아래로 떨어지는 드롭 숄더이고', '어깨선이 아래로 떨어지는 드롭 숄더라', '어깨선이 아래로 떨어지는 드롭 숄더이지만'], None: ['어깨선이 내려가지 않고', '어깨선이 내려가지 않아', '어깨선이 내려가지 않지만'] },
  waist_definition: { Cinched: ['허리가 뚜렷하게 조여 있고', '허리가 뚜렷하게 조여 있어', '허리가 뚜렷하게 조여 있지만'], Defined: ['허리선이 드러나 있고', '허리선이 드러나 있어', '허리선이 드러나 있지만'] },
  fabric_behavior: { Structured: ['형태를 잡아 주는 탄탄한 소재이고', '형태를 잡아 주는 탄탄한 소재라', '형태를 잡아 주는 탄탄한 소재이지만'], 'Semi-Structured': ['어느 정도 형태를 유지하는 소재이고', '어느 정도 형태를 유지하는 소재라', '어느 정도 형태를 유지하는 소재이지만'], 'Semi-Fluid': ['부드럽게 떨어지는 소재이고', '부드럽게 떨어지는 소재라', '부드럽게 떨어지는 소재이지만'], Fluid: ['흐르듯 떨어지는 소재이고', '흐르듯 떨어지는 소재라', '흐르듯 떨어지는 소재이지만'] },
  silhouette: { Straight: ['곧게 떨어지는 실루엣이고', '곧게 떨어지는 실루엣이라', '곧게 떨어지는 실루엣이지만'], Widening: ['아래로 넓어지는 실루엣이고', '아래로 넓어지는 실루엣이라', '아래로 넓어지는 실루엣이지만'], Flared: ['끝이 퍼지는 플레어 실루엣이고', '끝이 퍼지는 플레어 실루엣이라', '끝이 퍼지는 플레어 실루엣이지만'], Tapered: ['아래로 갈수록 좁아지는 실루엣이고', '아래로 갈수록 좁아지는 실루엣이라', '아래로 갈수록 좁아지는 실루엣이지만'], Narrowing: ['좁아지는 실루엣이고', '좁아지는 실루엣이라', '좁아지는 실루엣이지만'] },
  material: { Padding: ['패딩 구성으로 형태가 유지되고', '패딩 구성으로 형태가 유지되어', '패딩 구성으로 형태가 유지되지만'], Leather: ['가죽 소재가 형태를 유지해 주고', '가죽 소재가 형태를 유지해 주어', '가죽 소재가 형태를 유지해 주지만'] },
  surface: { Quilted: ['퀼팅 처리로 형태가 유지되고', '퀼팅 처리로 형태가 유지되어', '퀼팅 처리로 형태가 유지되지만'],
    /* R3: openwork in drape cloth (SR-V2-P5r only; the verifier requires the drape cloth) */
    Lace: ['레이스로 구멍이 뚫린 오픈워크 구조이고', '레이스로 구멍이 뚫린 오픈워크 구조라', '레이스로 구멍이 뚫린 오픈워크 구조이지만'], Mesh: ['메시로 구멍이 뚫린 오픈워크 구조이고', '메시로 구멍이 뚫린 오픈워크 구조라', '메시로 구멍이 뚫린 오픈워크 구조이지만'] },
  /* R3: soft sleeve volume — Voluminous sleeve in drape cloth (SR-V2-P5r only; the verifier requires the drape cloth) */
  sleeve_volume: { Voluminous: ['소매가 부드럽게 부풀어 있고', '소매가 부드럽게 부풀어 있어', '소매가 부드럽게 부풀어 있지만'] },
};
/* R2: Slim establishes body-FOLLOWING (CEO 2026-09-14 §4.1), not constriction — the wording names the observed close fit only */
const FIT_WORN = { Slim: ['몸선을 따라 붙는 슬림 핏이고', '몸선을 따라 붙는 슬림 핏이라', '몸선을 따라 붙는 슬림 핏이지만'], Regular: ['몸에 과하게 붙지도 넉넉하게 남지도 않는 레귤러 핏이고', '몸에 과하게 붙지도 넉넉하게 남지도 않는 레귤러 핏이라', '몸에 과하게 붙지도 넉넉하게 남지도 않는 레귤러 핏이지만'], Relaxed: ['여유 있게 떨어지는 릴랙스드 핏이고', '여유 있게 떨어지는 릴랙스드 핏이라', '여유 있게 떨어지는 릴랙스드 핏이지만'], Oversized: ['넉넉한 오버사이즈 핏이고', '넉넉한 오버사이즈 핏이라', '넉넉한 오버사이즈 핏이지만'], Voluminous: ['볼륨 있게 퍼지는 핏이고', '볼륨 있게 퍼지는 핏이라', '볼륨 있게 퍼지는 핏이지만'] };
const FIT_FLAT = { Slim: ['슬림하게 재단된 핏이고', '슬림하게 재단된 핏이라', '슬림하게 재단된 핏이지만'], Regular: ['기본 폭으로 재단된 레귤러 핏이고', '기본 폭으로 재단된 레귤러 핏이라', '기본 폭으로 재단된 레귤러 핏이지만'], Relaxed: ['여유 있게 재단된 릴랙스드 핏이고', '여유 있게 재단된 릴랙스드 핏이라', '여유 있게 재단된 릴랙스드 핏이지만'], Oversized: ['넉넉하게 재단된 오버사이즈 핏이고', '넉넉하게 재단된 오버사이즈 핏이라', '넉넉하게 재단된 오버사이즈 핏이지만'], Voluminous: ['볼륨 있게 재단된 핏이고', '볼륨 있게 재단된 핏이라', '볼륨 있게 재단된 핏이지만'] };
const WORN = Object.assign({ fit: FIT_WORN }, BASE), FLAT = Object.assign({ fit: FIT_FLAT }, BASE);
const ENDINGS = { WORN: { STRUCTURED: ' 전체적으로 형태가 유지되는 Structured 방향으로 판단됩니다.', RELAXED: ' 전체적으로 몸에서 자연스럽게 풀리는 Relaxed 방향으로 판단됩니다.' }, FLAT: { STRUCTURED: ' 전체적으로 형태가 유지되는 Structured 방향으로 판단됩니다.', RELAXED: ' 전체적으로 형태가 자연스럽게 풀리는 Relaxed 방향으로 판단됩니다.' } };
const LIMITATION_NAMES = { fit: '핏', fabric_behavior: '소재감', shoulder_drop: '어깨선', silhouette: '실루엣' };
/** the only Reason allowed with no physical decisive clause: the zero-evidence policy statement (rule SR-V2-Z0). It names ONLY carriers that are
 *  actually unobserved, may acknowledge an observed non-directional cloth reading, and states that the Direction is a limited-information classification. */
function zeroEvidenceText(names, fabricClauseText) {
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? a : b; };
  const lst = names.join('과 ');
  return (fabricClauseText ? fabricClauseText + ' ' : '') + '사진에서 ' + lst + josa(names[names.length - 1], '은', '는') + ' 확인되지 않아' + (fabricClauseText ? ', 소재만으로는 형태 방향을 정할 수 없습니다.' : ' 형태 방향을 관측 근거로 설명할 수 없습니다.') + ' 확인되지 않은 특징을 근거로 삼지 않고, 제한된 정보에 따른 기본 분류로 Structured 방향으로 표시됩니다.';
}
const REGION_LABEL = (rg, cat) => (rg === 'upper' ? '상체 부분은' : cat === 'Dress' ? '스커트 부분은' : '하의 부분은');
const SR_FIELDS = Object.keys(WORN);
/** words that would state a worn-body relation — forbidden on FLAT output */
const BODY_WORDS = /몸에|몸선/;
/** internal / scoring vocabulary that must never reach the customer text */
const INTERNAL_TERMS = /REF_|\bGT\b|SR[1-9]\b|\bSR5\b|N[1-4]\b|R4b|STRONG|WEAK|REGULAR\b|MEANINGFUL|Strength|점수|단계|신뢰도/;
module.exports = { WORN, FLAT, ENDINGS, LIMITATION_NAMES, zeroEvidenceText, REGION_LABEL, SR_FIELDS, BODY_WORDS, INTERNAL_TERMS };
