'use strict';
/**
 * STMX Full-Look Four-Axis — Korean Reason aggregation. No new interpretation:
 *   DM  → the frozen DM engine's own Korean direction_reason, verbatim.
 *   EI / TC / SR → the frozen engines emit an English evidence basis (kept verbatim in engine_records); the Korean line here only names the axis, the
 *   Direction and the frozen rule id that produced it.
 *   combined → the Style ID and the four Directions.
 */
const SUBJ = { EI: 'EI는', TC: 'TC는', SR: 'SR은', DM: 'DM은' };
function axisReason(axis, n, record) {
  if (n.kind === 'DIRECTION') return axis === 'DM' && typeof record.direction_reason === 'string' ? record.direction_reason : SUBJ[axis] + ' ' + n.label + ' 방향입니다(동결 ' + axis + ' 엔진 규칙 ' + n.rule + ').';
  if (n.kind === 'INPUT_FAILURE') return SUBJ[axis] + ' 입력 실패(' + n.code + ')로 채점되지 않았습니다. 스타일 결과가 아닙니다.';
  return SUBJ[axis] + ' 엔진 출력이 동결 계약과 맞지 않아 사용하지 않았습니다.';
}
function combined(styleId, norm) {
  if (styleId) return '이 착장의 Style ID는 ' + styleId + '입니다 — EI ' + norm.EI.label + ' · TC ' + norm.TC.label + ' · SR ' + norm.SR.label + ' · DM ' + norm.DM.label + '.';
  const bad = Object.entries(norm).filter(([, n]) => n.kind !== 'DIRECTION').map(([a, n]) => a + (n.kind === 'INPUT_FAILURE' ? ' 입력 실패' : ' 계약 위반'));
  return bad.join(' · ') + ' 때문에 네 축이 모두 채점되지 않아 Style ID를 만들지 않았습니다.';
}
module.exports = { axisReason, combined };
