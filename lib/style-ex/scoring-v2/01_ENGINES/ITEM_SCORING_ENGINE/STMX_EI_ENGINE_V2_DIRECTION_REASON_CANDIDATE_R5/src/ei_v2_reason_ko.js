'use strict';
/* STMX ITEM EI V2 — CANDIDATE. Korean Reason composer + verifier. Every factual clause is tied to an observed field / pathway of the product (provenance);
   NEUTRAL is explained ONLY as Commercial recommendation eligibility (Category × Colour), never as uncertainty, midpoint, weak force or missing data.
   No GT / REF / rule id / numeric score / strength / ordinal in the text. */
const COL = { black: '블랙', navy: '네이비', olive: '올리브', beige: '베이지', brown: '브라운', green: '그린', yellow: '옐로', white_family: '화이트 계열', blue: '블루', gray: '그레이', wine: '와인', pink: '핑크', khaki: '카키', gold: '골드', silver: '실버', red: '레드', orange: '오렌지', camel: '카멜', purple: '퍼플', mint: '민트' };
const CATK = { Jacket: '재킷', Coat: '코트', Shirt: '셔츠', 'T-Shirt': '티셔츠', Sweater: '스웨터', Sweatshirt: '스웨트셔츠', Trouser: '바지', Skirt: '스커트', Dress: '드레스', Jumpsuit: '점프수트' };
const EL = { pattern: { Repeat: '반복 패턴', Linear: '줄무늬 패턴', Grid: '격자 패턴' }, graphic: { Localized: '그래픽', Dominant: '큰 그래픽' }, surface: { 'Textured Knit': '입체적인 니트 조직', Quilted: '퀼팅', Glossy: '광택 있는 표면', Lace: '레이스', 'Semi Transparent': '비치는 소재', Transparent: '비치는 소재', 'Treated Surface': '가공된 표면', Mesh: '메시 소재', Pleated: '플리츠', Reflective: '반사 소재', 'Exotic-Skin': '이그조틱 가죽 표면' },
  attachment: { 'Metal Hardware': '금속 장식', Fringe: '프린지', 'Jewelry Attachment': '주얼리 장식', Feather: '깃털 장식', Ribbon: '리본', 'Fur Trim': '퍼 트림', Belt: '벨트' }, decorative_detail: { 'Appliqué': '아플리케', 'Sequin-Beading': '시퀸·비즈 장식', Embroidery: '자수', Piping: '파이핑' }, material: { Velvet: '벨벳', Leather: '가죽', Fur: '퍼' }, pocket: { Present: '포켓 구성' }, exposure_opening: {} };
const elName = (e) => (e.source_parameter === 'additional_color' ? (COL[e.source_value] || e.source_value) + ' 배색' : e.source_parameter === 'exposure_opening' ? String(e.source_value).replace(/ \/ /g, '·') + ' 노출' : (EL[e.source_parameter] || {})[e.source_value] || null);
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? a : b; };
const listKo = (w) => (w.length === 1 ? w[0] : w.slice(0, -1).join(', ') + josa(w[w.length - 2], '과', '와') + ' ' + w[w.length - 1]);
const QUAL = (p) => p.resolution_status === 'RESOLVED' && ['MEANINGFUL', 'STRONG'].includes(p.force);
const LABEL = { E: 'Expressive', I: 'Introvert', NEUTRAL: 'Neutral' }; const DIRS = ['E', 'I', 'NEUTRAL'];
const INTERNAL = /REF_|\bGT\b|EI[1-9]\b|I_BASE|E_BASE|CONTEXTUAL|CROSSOVER|MEANINGFUL|STRONG|WEAK|Strength|점수|단계|\d/;
const UNCERT = /몰라|모르|애매|부족|비슷|약해서|중간|치우치지 않|기울지 않|판단할 수 없|확실하지/; const FORCEWORD = /강한|뚜렷한|두드러진|강하게/;
const UNK_LABEL = { pattern: '패턴', graphic: '그래픽', surface: '표면', material: '소재', exposure_opening: '노출' };
/* view = { direction, underlying_basis, eligible, neutral_basis, families[], intrinsic[], categories[] | null, pair, pathways, evidence, unknown_fields[], cond } */
function compose(v) { const cl = []; const ev = new Map((v.evidence || []).map((e) => [e.evidence_id, e])); const pws = v.pathways || [];
  const pick = (f) => { const out = []; const seen = new Set(); for (const p of pws.filter(f)) { const e = ev.get(p.head_evidence); if (e && elName(e) && !seen.has(elName(e))) { seen.add(elName(e)); out.push(e); } } return out; };
  const expr = pick(QUAL), weak = pick((p) => p.resolution_status === 'RESOLVED' && p.force === 'WEAK'), unq = pick((p) => p.resolution_status === 'UNRESOLVED');
  const el = (e, kind) => { cl.push({ kind, field: e.source_parameter, value: e.source_value }); return elName(e); };
  const fams = v.families || []; const colT = (kind) => { for (const f of fams) cl.push({ kind, field: 'colour', value: f }); return fams.map((f) => COL[f] || f).join('·'); };
  const catT = v.categories && v.categories.length ? (v.pair ? v.categories.map((c) => CATK[c] || c).join('·') + ' 세트' : CATK[v.categories[0]] || v.categories[0]) : null;
  const lim = [].concat(fams.length ? [] : ['색상'], v.categories ? [] : ['아이템 유형']); const limT = lim.length ? listKo(lim) + josa(listKo(lim), '은', '는') + ' 확인되지 않아 판단 근거에서 제외했고, ' : '';
  const unk = (v.unknown_fields || []).map((f) => UNK_LABEL[f]).filter(Boolean); const unkT = unk.length ? listKo(unk) + josa(listKo(unk), '은', '는') + ' 확인되지 않아 판단에서 제외했고, ' : '';
  const unqT = unq.length ? (() => { const u = el(unq[0], 'UNQUALIFIED_EXCLUDED'); return u + josa(u, '은', '는') + ' 표현 정도가 확인되지 않아 판단 근거에서 제외했고, '; })() : '';
  const d = v.direction; let text = null;
  if (d === 'NEUTRAL' && v.eligible) { const c = colT('ELIGIBLE_COLOUR'); cl.push({ kind: 'COMMERCIAL_ELIGIBILITY', field: 'overlay', value: v.neutral_basis });
    const basis = /DENIM/.test(v.neutral_basis || '') ? '데님 ' + (catT || '아이템') + '의 기본 색 조합이라' : catT ? catT + '에서 두루 쓰이는 기본 색 조합이라' : '어떤 아이템 유형으로 보더라도 두루 쓰이는 기본 색이라';
    text = unkT + c + josa(c, '은', '는') + ' ' + basis + ' Expressive와 Introvert 고객 모두에게 추천할 수 있는 상품으로 지정되어 Neutral 방향으로 분류됩니다.'; }
  else if (d === 'E') { const es = expr.slice(0, 2).map((e) => el(e, 'EXPRESSIVE_ELEMENT')); const eb = fams.length && (v.intrinsic || []).every((b) => b === 'E_BASE') ? colT('E_COLOUR') : null;
    if (es.length) text = limT + (eb ? eb + ' 색상 자체도 눈에 띄는 표현 색이고 ' : fams.length ? colT('BASE_COLOUR') + ' 바탕에 ' : '') + listKo(es) + josa(es[es.length - 1], '이', '가') + ' 더해져 시각적 표현이 드러나는 Expressive 방향으로 판단됩니다.';
    else if (eb) text = limT + unqT + eb + ' 색상 자체가 눈에 띄는 표현 색이라 시각적 표현이 드러나는 Expressive 방향으로 판단됩니다.'; }
  else if (d === 'I') {
    if (/OPERATIONAL_DEFAULT/.test(v.underlying_basis || '')) { cl.push({ kind: 'OPERATIONAL_DEFAULT', field: null, value: v.underlying_basis }); text = limT + unqT + (/ZERO_EVIDENCE/.test(v.underlying_basis) ? '판단에 쓸 수 있는 표현 근거가 확인되지 않아' : '확인된 근거만으로는 시각적 표현이 드러난다고 보기 어려워') + ', 제한된 정보에 따른 기본 분류로 Introvert 방향으로 표시됩니다.'; }
    else if (fams.length && (v.intrinsic || []).every((b) => b === 'I_BASE')) { const c = colT('I_COLOUR'); let mid = '';
      if (weak.length) { const w = el(weak[0], 'WEAK_ELEMENT'); mid = w + josa(w, '이', '가') + ' 은은하게 들어간 정도라 '; }
      text = limT + unkT + unqT + c + ' 바탕에 ' + mid + '시각적 표현이 절제된 Introvert 방향으로 판단됩니다.'; } }
  return text ? { text, clauses: cl } : { text: null, clauses: [] }; }
function verify(v, r) { const f = []; const d = v.direction; if (!DIRS.includes(d)) f.push('DIRECTION_PROHIBITED'); if (!r || !r.text) return f.concat(['NO_REASON']);
  const fams = v.families || []; const pws = v.pathways || []; const ev = v.evidence || []; const head = new Map(pws.map((p) => [p.head_evidence, p])); const cited = new Set();
  for (const c of r.clauses) {
    if (c.field === 'colour') { if (!fams.includes(c.value)) f.push('FABRICATED_COLOUR'); if (c.kind === 'E_COLOUR' && !(v.intrinsic || []).every((b) => b === 'E_BASE')) f.push('UNSUPPORTED_EXPRESSIVE_CLAIM'); if (c.kind === 'I_COLOUR' && !(d === 'I' && (v.intrinsic || []).every((b) => b === 'I_BASE'))) f.push('UNSUPPORTED_INTROVERT_CLAIM'); if (c.kind === 'ELIGIBLE_COLOUR' && d !== 'NEUTRAL') f.push('COMMERCIAL_CLAIM_ON_NON_NEUTRAL'); continue; }
    if (c.kind === 'COMMERCIAL_ELIGIBILITY') { if (!(d === 'NEUTRAL' && v.eligible && v.neutral_basis)) f.push('NEUTRAL_WITHOUT_ELIGIBILITY'); continue; }
    if (c.kind === 'OPERATIONAL_DEFAULT') { if (!(d === 'I' && /OPERATIONAL_DEFAULT/.test(v.underlying_basis || '')) || /절제된/.test(r.text)) f.push('DEFAULT_STATED_AS_OBSERVED'); continue; }
    const e = ev.find((y) => y.source_parameter === c.field && y.source_value === c.value); if (!e) { f.push('FABRICATED_ELEMENT'); continue; } const p = head.get(e.evidence_id); if (!p) { f.push('EVIDENCE_DOUBLE_COUNTING'); continue; }
    if (cited.has(p.independent_pathway_id)) f.push('EVIDENCE_DOUBLE_COUNTING'); cited.add(p.independent_pathway_id);
    if (c.kind === 'EXPRESSIVE_ELEMENT' && !(d === 'E' && QUAL(p))) f.push('UNSUPPORTED_EXPRESSIVE_CLAIM'); if (c.kind === 'WEAK_ELEMENT' && !(p.force === 'WEAK' && d !== 'E')) f.push('UNSUPPORTED_INTROVERT_CLAIM');
    if (c.kind === 'SINGLE_ELEMENT_INSUFFICIENT') f.push('UNSUPPORTED_INTROVERT_CLAIM');   /* R2: a qualified MEANINGFUL never supports an Introvert claim */ if (c.kind === 'UNQUALIFIED_EXCLUDED' && p.resolution_status !== 'UNRESOLVED') f.push('UNKNOWN_FORCE_STATED_AS_KNOWN'); }
  if (r.clauses.some((c) => c.kind === 'UNQUALIFIED_EXCLUDED') && FORCEWORD.test(r.text)) f.push('UNKNOWN_FORCE_STATED_AS_KNOWN');
  if (d === 'NEUTRAL' && !r.clauses.some((c) => c.kind === 'COMMERCIAL_ELIGIBILITY')) f.push('NEUTRAL_WITHOUT_ELIGIBILITY'); if (d === 'NEUTRAL' && UNCERT.test(r.text)) f.push('NEUTRAL_AS_UNCERTAINTY');
  if (!new RegExp(LABEL[d] + ' 방향').test(r.text) || DIRS.filter((z) => z !== d).some((z) => new RegExp(LABEL[z] + ' 방향').test(r.text))) f.push('DIRECTION_REASON_CONTRADICTION');
  if (!v.categories && Object.values(CATK).some((w) => r.text.includes(w + '에서') || r.text.includes(w + '의'))) f.push('UNKNOWN_CATEGORY_NAMED'); if (!fams.length && Object.values(COL).some((w) => r.text.includes(w + ' 바탕') || r.text.includes(w + ' 색상') || r.text.startsWith(w))) f.push('FABRICATED_COLOUR');
  if (INTERNAL.test(r.text)) f.push('INTERNAL_TERM_IN_TEXT'); if (!r.clauses.length) f.push('GENERIC_NO_PHYSICAL_CLAIM'); return f; }
module.exports = { compose, verify };
