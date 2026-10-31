'use strict';
/**
 * STMX TC V2 — controlled Korean lexicon (port of the 2026-10-26 design composer tables, w4_analysis.js TCF / TCV / MATK / GENK). One entry = one physical
 * claim about one OBSERVED value. Field labels for the limitation clause name what was NOT confirmed — never a value.
 */
const TCF = { fit: '핏', length: '길이', sleeve: '소매', collar: '칼라', closure_type: '여밈', front_opening_extent: '앞여밈', shoulder_structure: '어깨 구조', sleeve_volume: '소매 볼륨', material: '소재 구성', surface: '표면', attachment: '부착 장식', pocket: '포켓', pocket_projection: '포켓', silhouette: '실루엣', shoulder_connection: '어깨 연결', waist_definition: '허리선', slit: '슬릿', asymmetry: '비대칭' };
const TCV = { fit: { Regular: '레귤러 핏', Slim: '슬림 핏', Relaxed: '릴랙스드 핏', Oversized: '오버사이즈 핏', Voluminous: '볼륨 핏' }, collar: { Notched: '노치드 칼라', Peak: '피크드 칼라', Shirt: '셔츠 칼라', Stand: '스탠드 칼라', Tie: '타이 칼라', Shawl: '숄 칼라', Polo: '폴로 칼라', Hood: '후드' },
  closure_type: { 'Single Breasted Button': '싱글 브레스트 단추 여밈', 'Double Breasted Button': '더블 브레스트 단추 여밈', Zipper: '지퍼 여밈', Button: '단추 여밈', 'Snap Button': '스냅 단추 여밈', Toggle: '토글 여밈', Belted: '벨트 여밈', Wrap: '랩 여밈', Drawstring: '끈 여밈', Hook: '훅 여밈' },
  sleeve: { Long: '긴소매', Short: '반소매', Sleeveless: '민소매' }, front_opening_extent: { Full: '전체가 열리는 앞여밈', Partial: '부분 앞여밈' },
  length: { 'Hip Length': '힙 길이', 'Waist Length': '허리 길이', 'Maxi Length': '맥시 길이', 'Knee Length': '무릎 길이', 'Mini Length': '미니 길이', 'Midi Length': '미디 길이', Midi: '미디 길이', Mini: '미니 길이', Maxi: '맥시 길이', 'Ankle Length': '발목 길이', Cropped: '크롭 길이', 'Thigh Length': '허벅지 길이', 'Full Length': '풀 길이', 'Mid-Thigh Length': '허벅지 중간 길이', Regular: '기본 길이', Long: '롱 길이', Short: '짧은 길이', 'Calf Length': '종아리 길이', 'Extended Length': '긴 길이' },
  shoulder_structure: { Mild: '가볍게 잡힌 어깨', Strong: '분명한 어깨 구조', Extreme: '매우 강한 어깨 구조' } };
const MATK = { Knit: '니트', Synthetic: '합성', Wool: '울', Padding: '패딩', Cotton: '코튼', Denim: '데님', Leather: '가죽', Velvet: '벨벳', Silk: '실크', Linen: '린넨', Mesh: '메시', Lace: '레이스', Nylon: '나일론', Fleece: '플리스', Fur: '퍼', Suede: '스웨이드', Tweed: '트위드', Corduroy: '코듀로이', Satin: '새틴', Chiffon: '시폰', Other: '기타' };
const GENK = Object.assign({}, MATK, { 'Semi Transparent': '시스루', Glossy: '광택', Quilted: '퀼팅', 'Textured Knit': '니트 조직', 'Treated Surface': '가공', Pleated: '플리츠', Reflective: '반사', Sheer: '시스루', 'Metal Hardware': '금속 장식', 'Jewelry Attachment': '주얼리 장식', Fringe: '프린지', Open: '오픈', Regular: '기본', Voluminous: '풍성한', Present: '' });
/** R4: Korean labels of the substantial D-4 BODY zones (frozen SUBSTANTIAL_BODY) a category-independent Departure is bound to — Reason display only, no type word */
const ZONE = { Body: '몸판', Bodice: '상체 몸판', 'Skirt Body': '하체 몸판', Leg: '다리 부분', Sleeve: '소매' };
/** R4: the displayed TC observation fields (adapter OBSERVED_FIELDS) — any observed one means the zero-evidence policy text must not deny observed features */
const FEATURE_FIELDS = ['fit', 'length', 'sleeve', 'collar', 'closure_type', 'front_opening_extent', 'shoulder_structure', 'shoulder_connection', 'sleeve_volume', 'material', 'surface', 'attachment', 'pocket_projection', 'asymmetry', 'slit'];
/** labels of inputs that were NOT confirmed (limitation clause) */
const MISSING_LABEL = { length: '기장', fit: '핏', subtype: '세부 아이템 유형' };
/** words that would name an archetype subtype (forbidden when the subtype is unresolved) */
const SUBTYPE_WORDS = ['테일러드', '캐주얼', '유틸리티', 'Tailored', 'Casual', 'Utility'];
const okVal = (v) => typeof v === 'string' && v && !/^</.test(v) && !['n/a', 'None', 'none'].includes(v);
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? a : b; };
const phrase = (field, value) => { if (TCV[field] && TCV[field][value]) return TCV[field][value]; const ps = String(value).split('+').map((v) => GENK[v]); if (ps.every((p) => p !== undefined)) return (ps.filter(Boolean).join('·') + ' ' + (TCF[field] || field)).trim(); return (TCF[field] || field) + '(' + value + ')'; };
const listKo = (w) => (w.length === 1 ? w[0] : w.slice(0, -1).join(', ') + josa(w[w.length - 2], '과', '와') + ' ' + w[w.length - 1]);
/** R4: words naming a product type — forbidden in the Reason when the type is unknown (a collar named 셔츠 칼라 is a collar, not a type) */
const TYPE_WORDS = /티셔츠|스웨트셔츠|스웨터|셔츠(?! 칼라)|재킷|자켓|코트|트라우저|바지|스커트|드레스|원피스|점프수트/;
module.exports = { TCF, TCV, MATK, GENK, ZONE, FEATURE_FIELDS, MISSING_LABEL, SUBTYPE_WORDS, TYPE_WORDS, okVal, josa, phrase, listKo };
