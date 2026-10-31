'use strict';
/* STMX DM V2 — controlled Korean lexicon. Every phrase states ONE observed reading of ONE Primitive (or names an unread Primitive as a limitation).
   Keys are the frozen domain values (a range key = its contiguous values joined by "/" in domain order). The verifier accepts a phrase only if it is
   listed here for the exact reading recorded in the block. ⛔ No number, tier, Strength, rule ID, GT or REF term. */
const FAMILY = { graphic: '그래픽', surface_pattern: '패턴', surface_treatment: '표면 가공', decorative_construction: '장식적 봉제 구성', attached_hardware: '부착 하드웨어', attached_detail: '부착 디테일', designed_color_contrast: '배색 요소' };
const FAMILY_DEFAULT = '디자인 요소';
const SIZE = { small: ['작은', '작은 크기'], medium: ['중간 크기의'], large: ['큰'], 'small/medium': ['작은~중간 크기의', '작은~중간 크기로'], 'medium/large': ['중간~큰 크기의', '중간~큰 크기로'], 'small/medium/large': ['크기가 다양하게 관측된', '크기가 다양하게'] };
const CONTRAST = { high: ['주변과 선명하게 대비되어', '주변과 선명하게 대비되지만'], medium: ['주변과 어느 정도 구분되어', '주변과 어느 정도만 구분되고', '주변과 어느 정도 구분되지만'], low: ['주변과 비슷한 톤이라', '주변과 비슷한 톤이고'],
  'medium/high': ['주변과 중간 이상으로 뚜렷하게 구분되어', '주변과 중간 이상으로 구분되지만'], 'low/medium': ['주변과 비슷하거나 어느 정도만 구분되어', '주변과 비슷하거나 어느 정도만 구분되고'], 'low/medium/high': ['주변과의 구분 정도가 넓은 범위로 관측되고'] };
const SPATIAL = { localized: ['한 곳에 배치된'], distributed: ['여러 곳에 퍼진', '여러 곳에 반복되어 보이므로'], whole_garment: ['옷 전체에 걸친', '옷 전체에 걸쳐 보이므로'],
  'localized/distributed': ['한 곳 또는 여러 곳에 배치된'], 'distributed/whole_garment': ['여러 곳 이상에 걸친', '한 곳을 넘어 퍼져 보이므로'], 'localized/distributed/whole_garment': ['배치 범위가 넓게 관측된'] };
const LIMIT = { relative_size: '크기', contrast: '대비', spatial_position: '배치 범위' };
const TABLE = { relative_size: SIZE, contrast: CONTRAST, spatial_position: SPATIAL };
const PRIM = { relative_size: 'size', contrast: 'contrast', spatial_position: 'spatial' };
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? a : b; };
const keyOf = (reading) => (reading && reading.resolved ? reading.values.join('/') : null);
/** phrases the lexicon allows for the reading of `param` (a frozen-admission reading) */
const allowed = (param, reading) => { const k = keyOf(reading); return k && TABLE[param][k] ? TABLE[param][k] : []; };
const INTERNAL = /REF_|\bGT\b|DM[1-9]\b|DM-V2|Strength|NEUTRAL|Neutral|UNKNOWN|UNRESOLVED|NOT_SCORABLE|점수|단계|등급|티어/;
module.exports = { FAMILY, FAMILY_DEFAULT, SIZE, CONTRAST, SPATIAL, LIMIT, TABLE, PRIM, josa, keyOf, allowed, INTERNAL };
