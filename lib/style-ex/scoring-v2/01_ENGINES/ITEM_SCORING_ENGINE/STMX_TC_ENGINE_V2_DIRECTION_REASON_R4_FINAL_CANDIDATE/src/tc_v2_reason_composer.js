'use strict';
/**
 * STMX TC V2 — Korean Reason composer (port of the 2026-10-26 design tcReason + V2 additions). Every clause cites ONE observed value of ONE member
 * (or a governed frozen Departure finding); hypothetical domain completions are never cited.
 * V2 additions: limitation clause naming the inputs that were NOT confirmed (successor paths) · MANDATORY_FALLBACK wording ("확인된 정보 안에서는") ·
 * ZERO_EVIDENCE limitation-only text · REF_000430-type open Departure candidate cited concessively (opposing evidence).
 */
const L = require('./tc_v2_reason_lexicon'); const { okVal, josa, phrase, listKo } = L;
const CHAN = { SILHOUETTE: 'silhouette', PROPORTION: 'proportion', CONSTRUCTION: 'construction' };
const ZE_TEXT = '사진에서 핏과 기장, 구성처럼 판단에 쓸 수 있는 특징이 확인되지 않아, 제한된 정보에 따른 기본 분류로 Classic 방향으로 표시됩니다.';
/* R4: the sleeve-volume concession is cited only when the frozen SIL-MORPH evidence itself names sleeve_volume (R3 also cited a Regular sleeve volume when the morphology came
   from the shoulder — latent, not present in the 114 + 15 governed outputs; surfaced by the order §6 Strong-shoulder probe) */
const sleeveMorph = (m) => !!(m.silhouette && m.silhouette.v === 'UNRESOLVED' && /SIL-MORPH/.test(m.silhouette.rule) && /sleeve_volume/.test(String(m.silhouette.why || m.silhouette.carrier || '')) && okVal(m.observed.sleeve_volume));
const openCandidate = (m) => (sleeveMorph(m) ? 'sleeve_volume' : null);
function limitationPrefix(missing) { const f = (missing || []).map((k) => L.MISSING_LABEL[k]).filter(Boolean); if (!f.length) return ''; const lst = listKo(f); return lst + josa(lst, '은', '는') + ' 확인되지 않아 판단 근거에서 제외했고, '; }
/* R4 (CEO 2026-10-28 §8 · R3-B2): ZE_TEXT says fit / length / construction were not confirmed — true only when NO TC feature is observed. When features ARE
   observed but none could ground a channel (e.g. the product type is unknown), the zero-evidence policy Reason states the limitation without denying them. */
const ZE_OBSERVED_BODY = '확인된 특징만으로는 기본 형태 여부를 판단할 근거가 부족해, 제한된 정보에 따른 기본 분류로 Classic 방향으로 표시됩니다.';
const anyFeatureObserved = (ms) => ms.some((m) => L.FEATURE_FIELDS.some((f) => okVal(m.observed[f])));
/* R4 · R3-B2: concessive clause for a construction candidate of an unresolved-key member (category-dependent Departure, or a role not observed in any key) */
function keyDomainConcession(x, clauses) { const ms = x.members; for (const k of x.key_domain_candidates || []) { const m = ms[k.member]; if (!m) continue; const fields = String(k.carrier || '').split('+').filter((f) => f in L.TCF && okVal(m.observed[f])).slice(0, 2); if (!fields.length) continue;
    const p0 = listKo(fields.map((f) => phrase(f, m.observed[f]))); const ph = p0 + josa(p0, '이', '가') + (k.kind === 'CATEGORY_DEPENDENT' ? ' 관측되지만 아이템 유형에 따라 디자인 이탈 여부가 달라 판단 근거로 쓰지 않았고,' : ' 관측되지만 그 적용 범위가 확인되지 않아 판단 근거로 쓰지 않았고,');
    clauses.push({ role: 'opposing', kind: 'KEY_DOMAIN_CANDIDATE', member: k.member, channel: 'construction', field: fields.join('+'), value: fields.map((f) => m.observed[f]).join('+'), candidate: k.kind, phrase: ph }); return ph + ' '; } return ''; }
/** @param x { direction, path, members:[record], upstream:{valid_departure_set, ownerless}, classic, missing_fields, category_independent, key_domain_candidates } */
function compose(x, minimal) { const clauses = []; const ms = x.members; const mi = (m) => ms.indexOf(m);
  if (x.path === 'ZERO_EVIDENCE') { if (!anyFeatureObserved(ms)) return { text: ZE_TEXT, clauses: [], form: 'ZERO_EVIDENCE_LIMITATION' };
    let pre = ''; const oc = ms.map((m) => [m, openCandidate(m)]).find(([, k]) => k); if (oc) { const [m, k] = oc; const v = m.observed[k]; const ph = '소매 볼륨이 ' + phrase(k, v).replace(/ 소매 볼륨$/, '') + ' 편으로 관측되지만'; clauses.push({ role: 'opposing', kind: 'OPEN_CANDIDATE', member: mi(m), channel: 'silhouette', field: k, value: v, phrase: ph }); pre = ph + ' '; }
    pre += keyDomainConcession(x, clauses);   /* also in the minimal form: the verifier requires the concession */
    return { text: limitationPrefix(x.missing_fields) + pre + ZE_OBSERVED_BODY, clauses, form: 'ZERO_EVIDENCE_OBSERVED_LIMITATION' + (minimal ? '_MINIMAL' : '') }; }
  const conf = (m, channel, field) => { const v = m.observed[field]; if (!okVal(v)) return null; const c = { role: 'decisive', kind: 'CONFORMITY', member: mi(m), channel, field, value: v, phrase: phrase(field, v) }; clauses.push(c); return c; };
  if (x.direction === 'CLASSIC') { const picks = [];
    if (!minimal && x.path === 'FROZEN_V1' && x.classic && x.classic.members) { for (const cm of x.classic.members) { const m = ms.find((y) => y.garment_ref === cm.garment_ref) || ms[0]; for (const ch of ['construction', 'proportion', 'silhouette']) { const tok = (cm.realization_relation && cm.realization_relation[ch] && cm.realization_relation[ch].provenance && cm.realization_relation[ch].provenance.tokens) || {}; for (const [k, v] of Object.entries(tok)) if (picks.length < 3 && m.observed[k] === v) { const c = conf(m, ch, k); if (c) picks.push(c); } } } }
    if (!picks.length) for (const m of ms) { if (m.silhouette.v === 'FALSE' && picks.length < 3) { const c = conf(m, 'silhouette', 'fit'); if (c) picks.push(c); }
      if (m.construction.v === 'FALSE') for (const k of ['collar', 'closure_type', 'sleeve']) if (picks.length < 3) { const c = conf(m, 'construction', k); if (c) picks.push(c); }
      if (m.proportion.v === 'FALSE' && picks.length < 3) { const c = conf(m, 'proportion', 'length'); if (c) picks.push(c); } }
    if (!picks.length) return { text: null, clauses: [], failure: 'NO_GROUNDABLE_CONFORMITY' };
    const lst = listKo(picks.map((c) => c.phrase)); const oc = ms.map((m) => [m, openCandidate(m)]).find(([, k]) => k); let pre = '';
    if (oc) { const [m, k] = oc; const v = m.observed[k]; const ph = '소매 볼륨이 ' + phrase(k, v).replace(/ 소매 볼륨$/, '') + ' 편으로 관측되지만'; clauses.push({ role: 'opposing', kind: 'OPEN_CANDIDATE', member: mi(m), channel: 'silhouette', field: k, value: v, phrase: ph }); pre = ph + ' '; }
    /* observed Construction Departure candidate whose role was not settled (opposing evidence, concessive) */
    const cc = ms.find((m) => m.construction && m.construction.v === 'UNRESOLVED' && /^CON-UNRES-/.test(m.construction.rule) && okVal(m.observed[m.construction.carrier]));
    if (cc && !minimal) { const k = cc.construction.carrier, v = cc.observed[k]; const p0 = phrase(k, v); const ph = p0 + josa(p0, '이', '가') + ' 관측되지만 그 적용 범위가 확인되지 않아 판단 근거로 쓰지 않았고,'; clauses.push({ role: 'opposing', kind: 'OPEN_CONSTRUCTION_CANDIDATE', member: mi(cc), channel: 'construction', field: k, value: v, phrase: ph }); pre = pre + ph + ' '; }
    pre = pre + keyDomainConcession(x, clauses);   /* R4 · also in the minimal form (required by the verifier) */
    const lim = x.path === 'FROZEN_V1' ? '' : limitationPrefix(x.missing_fields);
    const siOnly = picks.every((c) => c.channel === 'silhouette');
    let body;
    if (x.path === 'MANDATORY_FALLBACK') body = siOnly ? lst + josa(lst, '으로', '로') + ' 확인되는 실루엣은 기본 형태를 따르고 있어, 확인된 정보 안에서는 Classic 방향으로 판단됩니다.' : lst + ' 등 확인된 구성은 이 아이템 유형의 기본 형태를 따르고 있어, 확인된 정보 안에서는 Classic 방향으로 판단됩니다.';
    else body = lst + ' 등 확인되는 구성이 이 아이템 유형의 기본 형태를 그대로 따르고 있어 Classic 방향으로 판단됩니다.';
    return { text: lim + pre + body, clauses, form: x.path + (minimal ? '_MINIMAL' : '') }; }
  /* TRANSFORMATIVE */
  const up = x.upstream || { valid_departure_set: [], ownerless: false }; const deps = (up.valid_departure_set || []).slice(0, 2); const parts = [];
  if (up.ownerless) { const m = ms.find((y) => y.asymmetry && y.asymmetry.departure_exists && y.observed.asymmetry === 'Present'); if (m) { const ph = '좌우가 비대칭으로 구성되어 이 아이템 유형의 기본 형태를 벗어나'; clauses.push({ role: 'decisive', kind: 'DEPARTURE', member: mi(m), channel: 'ASYMMETRY', rule: m.asymmetry.rule, field: 'asymmetry', value: 'Present', phrase: ph }); parts.push(ph); } }
  for (const dp of deps) { const fields = String(dp.carrier || '').split('+'); const ch = CHAN[dp.channel]; const m = ms.find((y) => y[ch] && y[ch].v === 'TRUE' && y[ch].rule === dp.rule) || ms.find((y) => fields.every((f) => okVal(y.observed[f]))) || null; if (!m) continue;
    const vals = fields.map((f) => m.observed[f]);
    if (minimal || !vals.every(okVal)) { const ph = /POCKET/.test(dp.rule) ? (/FRONT-CLOSURE/.test(dp.rule) ? '앞여밈과 포켓 구성이' : '포켓 구성이') + ' 이 아이템 유형의 기본 구조를 바꾸어' : dp.channel === 'SILHOUETTE' ? '실루엣이 이 아이템 유형의 기본 형태를 벗어나' : dp.channel === 'PROPORTION' ? '길이 비율이 이 아이템 유형의 기본 비율을 벗어나' : '구성 방식이 이 아이템 유형의 기본 구조를 바꾸어';
      if (m[ch] && m[ch].v === 'TRUE' && m[ch].rule === dp.rule) { clauses.push({ role: 'decisive', kind: 'DEPARTURE_FINDING', member: mi(m), channel: dp.channel, rule: dp.rule, field: dp.carrier, value: null, phrase: ph }); parts.push(ph); } continue; }
    const c = { role: 'decisive', kind: 'DEPARTURE', member: mi(m), channel: dp.channel, rule: dp.rule, field: dp.carrier, value: vals.join('+'), phrase: null };
    const ph = /SIL-TRUE-OVERSIZED/.test(dp.rule) ? phrase('fit', vals[0]) + josa(phrase('fit', vals[0]), '이', '가') + ' 이 아이템 유형의 기본 실루엣을 크게 벗어나'
      : /^PRO-TRUE/.test(dp.rule) ? phrase('length', vals[0]) + josa(phrase('length', vals[0]), '이', '가') + ' 이 아이템 유형의 기본 비율을 벗어나'
      : /C3-BODY-ZONE-HYBRID|LAYERED-STRUCTURAL-BODY/.test(dp.rule) ? vals[0].split('+').map((v) => L.MATK[v] || v).join('·') + ' 소재를 부위별로 조합한 구성이 기본 구조를 바꾸어'
      : /ARCHETYPAL-HYBRID/.test(dp.rule) ? '상의 몸판과 하의가 결합된 하이브리드 구성이라'
      : /CON-TRUE-CONSTITUTIVE/.test(dp.rule) ? phrase(fields[0], vals[0]) + josa(phrase(fields[0], vals[0]), '이', '가') + ' 이 아이템 유형의 기본 구성 방식과 달라'
      : /SIL-TRUE-FLARE/.test(dp.rule) ? L.TCF.silhouette + '(' + vals[0] + ')' + '와 ' + phrase('fit', vals[1]) + '의 대비가 기본 실루엣을 벗어나'
      : phrase(fields[0], vals[0]) + ' 구성이 옷의 구조 자체를 바꾸고 있어';
    c.phrase = ph; clauses.push(c); parts.push(ph); }
  /* R4 · R3-B2: the category-independent frozen Departure — cite the observed carrier value(s) and the D-4 zone(s) it realises; never a hypothetical key, never a type */
  if (!parts.length && x.path === 'CATEGORY_INDEPENDENT_DEPARTURE' && x.category_independent && x.category_independent.evidence) { const ev = x.category_independent.evidence; const rule = x.category_independent.rule; const zl = listKo(ev.zone.map((z) => L.ZONE[z] || z)); const vk = ev.values.map((v) => L.GENK[v] || v).join('·');
    const ph = /C3-BODY-ZONE-HYBRID|LAYERED-STRUCTURAL-BODY/.test(rule) ? vk + ' 소재를 부위별로 조합한 구성이 기본 구조를 바꾸어' : zl + josa(zl, '을', '를') + ' 이루는 ' + vk + (/ATTACHMENT/.test(rule) ? ' 장식' : '') + ' 구성이 옷의 구조 자체를 바꾸고 있어';
    clauses.push({ role: 'decisive', kind: 'CATEGORY_INDEPENDENT_DEPARTURE', member: x.ci_member || 0, channel: 'CONSTRUCTION', rule, field: ev.field, value: ev.values.join('+'), zone: ev.zone.slice(), phrase: ph }); parts.push(ph); }
  if (!parts.length && x.path === 'DOMAIN_INVARIANT' && x.invariant_channel) { /* invariant Departure on a channel that reads no completed input: cite the channel finding only, never a completed value */
    const ph = { construction: '구성 방식이 이 아이템 유형의 기본 구조를 바꾸어', silhouette: '실루엣이 이 아이템 유형의 기본 형태를 벗어나', proportion: '길이 비율이 이 아이템 유형의 기본 비율을 벗어나' }[x.invariant_channel];
    clauses.push({ role: 'decisive', kind: 'INVARIANT_FINDING', member: x.invariant_member || 0, channel: x.invariant_channel.toUpperCase(), field: null, value: null, phrase: ph }); parts.push(ph); }
  if (!parts.length) return { text: null, clauses: [], failure: 'NO_GROUNDABLE_DEPARTURE' };
  const sel = parts.slice(0, 2); const keep = clauses.filter((c) => sel.includes(c.phrase)); clauses.splice(0, clauses.length, ...keep);
  /* R4: on a successor path the inputs that were not confirmed are named also for Transformative ("…은 확인되지 않았지만,") — the Departure holds without them */
  const tl = (() => { if (x.path === 'FROZEN_V1') return ''; const f = (x.missing_fields || []).map((k) => L.MISSING_LABEL[k]).filter(Boolean); if (!f.length) return ''; const lst = listKo(f); return lst + josa(lst, '은', '는') + ' 확인되지 않았지만, '; })();
  const text = tl + sel.map((p, i) => (i < sel.length - 1 ? p.replace(/어$/, '고').replace(/나$/, '나고').replace(/라$/, '이고') : p)).join(', ') + ' Transformative 방향으로 판단됩니다.';
  return { text, clauses, form: x.path + (minimal ? '_MINIMAL' : '') }; }
const fallback = (x) => compose(x, true);
module.exports = { sleeveMorph, compose, fallback, ZE_TEXT, ZE_OBSERVED_BODY, openCandidate, limitationPrefix, anyFeatureObserved };
