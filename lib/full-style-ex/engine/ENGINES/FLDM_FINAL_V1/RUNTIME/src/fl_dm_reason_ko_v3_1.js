'use strict';
/**
 * STMX Full-Look DM Direction — V3.1 CANDIDATE — Korean Reason composer ([V3.1] + the DM31-D4 phrase). Names only observed systems (carrier + frozen family name); never a look id, GT, number,
 * score or unobserved fact. Unobserved parts are stated as not used, never as evidence.
 */
const FAMILY = { A: '프린트·패턴 같은 표면 디테일', B: '케이블·레이스 같은 구성 표면 디테일', C: '단추·지퍼·금속 장식 같은 부품 디테일', D: '스티치·파이핑 같은 마감 디테일', E: '자수·비즈 같은 장식 디테일', F: '러플·보우 같은 입체 장식', G: '액세서리에 들어간 디테일', I: '포켓 같은 기능 구성의 디자인 디테일', J: '소재·표면 분할 디테일' };
const H_FORM = { accent: '스타일링 색 포인트', composition: '스타일링 색 조합' };
const CARRIER = { 'T-Shirt': '티셔츠', Shirt: '셔츠', Sweater: '스웨터', Sweatshirt: '스웨트셔츠', Jacket: '재킷', Coat: '코트', Trouser: '바지', Skirt: '스커트', Dress: '드레스', Jumpsuit: '점프수트', bag: '가방', footwear: '신발', belt: '벨트', jewellery: '주얼리', scarf: '스카프', eyewear: '안경', headwear: '모자', hosiery: '양말·스타킹', tie: '넥타이', gloves: '장갑', UNKNOWN: '구성품' };
const ROLE_KO = { FIELD: '착장 전체에 드러나는 규모로', STYLING_COMPOSITION: '착장 안에서 뚜렷이 구분되는 요소로', GARMENT_INTEGRATED_CLEAR_POINT: '옷 자체에 들어간 뚜렷한 포인트로', SURFACE_ARTICULATION_FIELD: '색 대비가 낮아도 옷 표면의 입체적인 짜임으로 드러나는 디자인으로' };
const who = (e) => [...new Set(e.carriers.map((c) => CARRIER[c] || '구성품'))].join('·');
const fam = (e) => (e.family === 'H' ? H_FORM[e.relational_form] || '스타일링 색 관계 디테일' : FAMILY[e.family]);   // every phrase ends in a final consonant → particle 이
function reasonD(contributing) {
  const p = contributing.slice(0, 2).map((e) => who(e) + '의 ' + fam(e) + '이 ' + ROLE_KO[e.roles[0]]); return p.join(' 작동하고, ') + ' 작동해 Detail 방향입니다.';
}
function reasonM(limited, visLimited) {
  const tail = visLimited ? ' 보이지 않는 부분은 근거로 쓰지 않았습니다.' : '';
  if (!limited.length) return '착장에서 확인되는 디자인 디테일이 없어 Minimal 방향입니다.' + tail;
  return limited.slice(0, 2).map((e) => who(e) + '의 ' + fam(e)).join(', ') + ' 정도가 보이지만 작거나 국소적이어서 착장 전체를 이끌 만큼 드러나지 않아 Minimal 방향입니다.' + tail;
}
module.exports = { reasonD, reasonM, FAMILY, H_FORM, CARRIER };
