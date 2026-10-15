/**
 * TC 규칙 판정 (lib/style-ex/tc-rules.ts) — judge.ts DEFAULT_JUDGE_PROMPT [TC — 새로움 ↔ 클래식] 절의 규칙 행마다 하나씩.
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test lib/style-ex/tests/tc-rules.test.mjs
 *
 * Node 22.18+ 는 .ts 의 타입을 지우고 바로 읽는다. 외부 호출 없음.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateTc, judgeTcRules } from "../tc-rules.ts";

// ── 관찰값 만들기 ──────────────────────────────────────────────────────────
const o = (value) => ({ state: "OBSERVED", value, evidence: ["fx"] });
const nv = () => ({ state: "NOT_VISIBLE", value: null, evidence: ["fx"] });
const absent = () => ({ state: "ABSENT", value: null, values: [], evidence: ["fx"] });
/** MULTI — 값은 문자열 또는 { value, locations: [[component, descriptor?]], coverage } */
const m = (...vs) => ({
  state: "OBSERVED",
  value: null,
  values: vs.map((v) =>
    typeof v === "string"
      ? { value: v, evidence: ["fx"] }
      : {
          value: v.value,
          evidence: ["fx"],
          ...(v.coverage && { coverage: v.coverage }),
          ...(v.locations && { locations: v.locations.map(([component, descriptor]) => ({ component, descriptor })) }),
        }
  ),
});
const pocketOf = (instances, extra = {}) => ({
  state: "OBSERVED",
  value: "Present",
  evidence: ["fx"],
  ...extra,
  pockets: instances.map(([location, construction, projection]) => ({
    location,
    construction: o(construction),
    projection: o(projection),
  })),
});

/** 세 채널이 모두 FALSE 인 기본 관찰값 — 카테고리마다 */
const BASE = {
  "T-Shirt": { fit: o("Regular"), length: o("Regular"), collar: o("None"), front_opening_extent: o("None") },
  Shirt: { fit: o("Regular"), length: o("Regular") },
  Sweater: { fit: o("Regular"), length: o("Regular") },
  Sweatshirt: { fit: o("Regular"), length: o("Regular") },
  Jacket: {
    grammar: o("Tailored"),
    fit: o("Slim"),
    length: o("Hip Length"),
    sleeve: o("Long"),
    collar: o("Notched"),
    closure_type: o("Single Breasted Button"),
    front_opening_extent: o("Full"),
  },
  Coat: {
    grammar: o("Tailored"),
    fit: o("Regular"),
    length: o("Knee Length"),
    sleeve: o("Long"),
    collar: o("Peak"),
    closure_type: o("Double Breasted Button"),
    front_opening_extent: o("Full"),
  },
  Trouser: { fit: o("Regular"), length: o("Full Length"), silhouette: o("Straight") },
  Skirt: { fit: o("Regular"), length: o("Midi"), silhouette: o("Straight") },
  Dress: {
    fit: { state: "OBSERVED", value: null, byRegion: { upper: o("Slim"), lower: o("Regular") } },
    length: o("Midi"),
  },
  Jumpsuit: {
    fit: { state: "OBSERVED", value: null, byRegion: { upper: o("Regular"), lower: o("Regular") } },
    length: o("Full Length"),
    silhouette: o("Straight"),
  },
};
const tc = (category, over = {}) => evaluateTc(category, { asymmetry: o("None"), ...BASE[category], ...over });
const ch = (r) => [r.channels.S.value, r.channels.P.value, r.channels.C.value, r.channels.asymmetry.value];

// ── 기본: 세 채널 FALSE → C ────────────────────────────────────────────────
test("기본 관찰값은 카테고리마다 S·P·C 모두 FALSE → C (TC1–4)", () => {
  for (const cat of Object.keys(BASE)) {
    const r = tc(cat);
    assert.deepEqual(ch(r), ["FALSE", "FALSE", "FALSE", "NONE"], cat);
    assert.equal(r.letter, "C", cat);
    assert.equal(r.status, "RESOLVED");
    assert.equal(r.range, "TC1–4");
  }
});

// ── 원형 키 ────────────────────────────────────────────────────────────────
test("원형 키: category + grammar", () => {
  assert.equal(tc("T-Shirt").archetype_key, "tshirt");
  assert.equal(tc("Jacket", { grammar: o("Casual") }).archetype_key, "JACKET:Casual");
  assert.equal(tc("Coat", { grammar: o("Utility") }).archetype_key, "COAT:Utility");
});

test("원형 키: Jacket·Coat grammar 미관찰 → P·C 미결, S 는 판정", () => {
  const r = tc("Jacket", { grammar: nv() });
  assert.equal(r.archetype_key, null);
  assert.deepEqual(ch(r), ["FALSE", "UNRESOLVED", "UNRESOLVED", "NONE"]);
  assert.equal(r.letter, null);
  assert.equal(r.status, "UNRESOLVED");
  // S 가 TRUE 면 키가 미결이어도 T
  assert.equal(tc("Coat", { grammar: nv(), fit: o("Oversized") }).letter, "T");
});

test("원형 키 미결 + shoulder_structure=Strong → Tailored 여부에 따라 S 가 갈려 미결", () => {
  assert.equal(tc("Jacket", { grammar: nv(), shoulder_structure: o("Strong") }).channels.S.value, "UNRESOLVED");
});

test("원형 키: category 미관찰 → 미결", () => {
  const r = evaluateTc(null, { fit: o("Regular"), asymmetry: o("None") });
  assert.equal(r.archetype_key, null);
  assert.equal(r.letter, null);
});

// ── S (실루엣) ─────────────────────────────────────────────────────────────
test("S 1) fit=Oversized → TRUE → T", () => {
  const r = tc("Shirt", { fit: o("Oversized") });
  assert.equal(r.channels.S.value, "TRUE");
  assert.equal(r.letter, "T");
  assert.equal(r.range, "TC6–9");
});

test("S 2) trouser·jumpsuit: silhouette=Flared + fit=Slim → TRUE", () => {
  assert.equal(tc("Trouser", { silhouette: o("Flared"), fit: o("Slim") }).channels.S.value, "TRUE");
  assert.equal(tc("Trouser", { silhouette: o("Flared"), fit: o("Regular") }).channels.S.value, "FALSE");
  // dress Flared · skirt Widening 은 해당 없음
  assert.equal(
    tc("Dress", { silhouette: o("Flared"), fit: { state: "OBSERVED", byRegion: { upper: o("Slim"), lower: o("Slim") } } })
      .channels.S.value,
    "FALSE"
  );
  assert.equal(tc("Skirt", { silhouette: o("Widening"), fit: o("Slim") }).channels.S.value, "FALSE");
});

test("S 3) sleeve_volume=Voluminous · shoulder_structure=Extreme·Strong · shoulder_span=Extended → 미결", () => {
  assert.equal(tc("Shirt", { sleeve_volume: o("Voluminous") }).channels.S.value, "UNRESOLVED");
  assert.equal(tc("Shirt", { shoulder_span: o("Extended") }).channels.S.value, "UNRESOLVED");
  assert.equal(tc("Jacket", { grammar: o("Casual"), length: o("Hip Length"), shoulder_structure: o("Strong") }).channels.S.value, "UNRESOLVED");
  assert.equal(tc("Jacket", { shoulder_structure: o("Extreme") }).channels.S.value, "UNRESOLVED");
  // fit=Oversized 가 먼저 맞으면 TRUE
  assert.equal(tc("Shirt", { fit: o("Oversized"), sleeve_volume: o("Voluminous") }).channels.S.value, "TRUE");
});

test("S 3) JACKET:Tailored · COAT:Tailored 의 Strong 은 없는 것으로 본다", () => {
  assert.equal(tc("Jacket", { shoulder_structure: o("Strong") }).channels.S.value, "FALSE");
  assert.equal(tc("Coat", { shoulder_structure: o("Strong") }).channels.S.value, "FALSE");
});

test("S 4) fit=Slim·Regular·Relaxed (+ skirt·dress 의 Voluminous) → FALSE, shoulder None·Mild 는 영향 없음", () => {
  for (const fit of ["Slim", "Regular", "Relaxed"]) {
    assert.equal(tc("Sweater", { fit: o(fit), shoulder_structure: o("Mild") }).channels.S.value, "FALSE", fit);
  }
  assert.equal(tc("Skirt", { fit: o("Voluminous") }).channels.S.value, "FALSE");
});

test("S 5) fit 미관찰 · 도메인 밖(skirt·dress 밖의 Voluminous) → 미결", () => {
  assert.equal(tc("Sweater", { fit: nv() }).channels.S.value, "UNRESOLVED");
  assert.equal(tc("Trouser", { fit: o("Voluminous") }).channels.S.value, "UNRESOLVED");
  assert.equal(tc("Sweater", { fit: nv() }).letter, null);
});

test("S Dress·Jumpsuit: 부위별 — TRUE 하나 → TRUE · 모두 FALSE → FALSE · 부위 누락 → 미결", () => {
  const fit = (upper, lower, whole) => ({
    state: "OBSERVED",
    value: whole ?? null,
    byRegion: { ...(upper && { upper: o(upper) }), ...(lower && { lower: o(lower) }) },
  });
  assert.equal(tc("Dress", { fit: fit("Slim", "Oversized") }).channels.S.value, "TRUE");
  assert.equal(tc("Dress", { fit: fit("Slim", "Voluminous") }).channels.S.value, "FALSE");
  assert.equal(tc("Dress", { fit: fit("Slim", null) }).channels.S.value, "UNRESOLVED");
  assert.equal(tc("Dress", { fit: fit("Slim", "Regular", "Oversized") }).channels.S.value, "TRUE");
  // jumpsuit Voluminous 는 도메인 밖
  assert.equal(tc("Jumpsuit", { fit: fit("Regular", "Voluminous") }).channels.S.value, "UNRESOLVED");
  // jumpsuit 플레어는 lower fit 에만
  assert.equal(tc("Jumpsuit", { silhouette: o("Flared"), fit: fit("Regular", "Slim") }).channels.S.value, "TRUE");
  assert.equal(tc("Jumpsuit", { silhouette: o("Flared"), fit: fit("Slim", "Regular") }).channels.S.value, "FALSE");
});

// ── P (length 표) ─────────────────────────────────────────────────────────
test("P 표: 키별 FALSE · TRUE 값", () => {
  const P = (cat, length, over = {}) => tc(cat, { length: o(length), ...over }).channels.P.value;
  for (const cat of ["T-Shirt", "Shirt", "Sweater", "Sweatshirt"]) {
    assert.equal(P(cat, "Regular"), "FALSE");
    assert.equal(P(cat, "Long"), "FALSE");
    assert.equal(P(cat, "Cropped"), "TRUE");
  }
  assert.equal(P("Jacket", "Hip Length"), "FALSE");
  assert.equal(P("Jacket", "Waist Length"), "TRUE");
  assert.equal(P("Jacket", "Cropped"), "TRUE");
  for (const g of ["Casual", "Utility"]) {
    assert.equal(P("Jacket", "Waist Length", { grammar: o(g) }), "FALSE");
    assert.equal(P("Jacket", "Hip Length", { grammar: o(g) }), "FALSE");
    assert.equal(P("Jacket", "Cropped", { grammar: o(g) }), "TRUE");
  }
  for (const len of ["Hip Length", "Thigh Length", "Knee Length", "Maxi Length"]) assert.equal(P("Coat", len), "FALSE");
  for (const len of ["Short", "Knee Length", "Calf Length", "Ankle Length", "Full Length", "Extended Length"]) {
    assert.equal(P("Trouser", len), "FALSE");
    assert.equal(P("Jumpsuit", len), "FALSE");
  }
  for (const len of ["Mini", "Midi", "Maxi Length"]) {
    assert.equal(P("Skirt", len), "FALSE");
    assert.equal(P("Dress", len), "FALSE");
  }
});

test("P: 표에 없는 값 · 미관찰 → 미결", () => {
  assert.equal(tc("Coat", { length: o("Cropped") }).channels.P.value, "UNRESOLVED");
  assert.equal(tc("Shirt", { length: o("Mini") }).channels.P.value, "UNRESOLVED");
  const r = tc("Jacket", { length: nv() });
  assert.equal(r.channels.P.value, "UNRESOLVED");
  assert.equal(r.letter, null); // S·C FALSE 여도 P 미결이면 미결
});

test("P TRUE → T", () => {
  assert.equal(tc("T-Shirt", { length: o("Cropped") }).letter, "T");
});

// ── C · Tailored 키 ───────────────────────────────────────────────────────
test("C Tailored: sleeve=Sleeveless → TRUE", () => {
  assert.equal(tc("Jacket", { sleeve: o("Sleeveless") }).channels.C.value, "TRUE");
  assert.equal(tc("Coat", { sleeve: o("Sleeveless") }).channels.C.value, "TRUE");
});

test("C Tailored: collar — Notched·Peak·Shawl FALSE / None·Stand·Shirt·Sailor·Peter Pan·Tie·Ruffle TRUE", () => {
  for (const c of ["Notched", "Peak", "Shawl"]) assert.equal(tc("Jacket", { collar: o(c) }).channels.C.value, "FALSE", c);
  for (const c of ["None", "Stand", "Shirt", "Sailor", "Peter Pan", "Tie", "Ruffle"]) {
    assert.equal(tc("Jacket", { collar: o(c) }).channels.C.value, "TRUE", c);
  }
});

test("C Tailored: closure_type — Button 계열 FALSE / Zipper·Snap Button·Hook Closure·Open TRUE", () => {
  for (const c of ["Button", "Single Breasted Button", "Double Breasted Button"]) {
    assert.equal(tc("Coat", { closure_type: o(c) }).channels.C.value, "FALSE", c);
  }
  for (const c of ["Zipper", "Snap Button", "Hook Closure", "Open"]) {
    assert.equal(tc("Coat", { closure_type: o(c) }).channels.C.value, "TRUE", c);
  }
});

test("C Tailored: front_opening_extent — Full FALSE / Partial TRUE / None → JACKET TRUE · COAT 미결", () => {
  assert.equal(tc("Jacket", { front_opening_extent: o("Full") }).channels.C.value, "FALSE");
  assert.equal(tc("Jacket", { front_opening_extent: o("Partial") }).channels.C.value, "TRUE");
  assert.equal(tc("Jacket", { front_opening_extent: o("None") }).channels.C.value, "TRUE");
  assert.equal(tc("Coat", { front_opening_extent: o("None") }).channels.C.value, "UNRESOLVED");
});

test("C: Tailored 아닌 키의 collar · closure_type · sleeve · front_opening_extent 는 근거 아님", () => {
  const over = { collar: o("Stand"), closure_type: o("Zipper"), sleeve: o("Sleeveless"), front_opening_extent: o("Partial") };
  assert.equal(tc("Jacket", { grammar: o("Casual"), length: o("Hip Length"), ...over }).channels.C.value, "FALSE");
  assert.equal(tc("Shirt", over).channels.C.value, "FALSE");
});

test("C tshirt: collar Sailor·Peter Pan·Tie·Ruffle·Shawl·Notched·Peak·Stand 또는 front_opening_extent=Full → 미결", () => {
  for (const c of ["Sailor", "Peter Pan", "Tie", "Ruffle", "Shawl", "Notched", "Peak", "Stand"]) {
    assert.equal(tc("T-Shirt", { collar: o(c) }).channels.C.value, "UNRESOLVED", c);
  }
  assert.equal(tc("T-Shirt", { collar: o("Shirt") }).channels.C.value, "FALSE");
  assert.equal(tc("T-Shirt", { front_opening_extent: o("Full") }).channels.C.value, "UNRESOLVED");
});

// ── C · 관계형 (locations) ─────────────────────────────────────────────────
test("C material: Padding 외 서로 다른 소재 2개 이상이 각각 BODY 부위 → TRUE", () => {
  const C = (material) => tc("Shirt", { material }).channels.C.value;
  assert.equal(C(m({ value: "Leather", locations: [["Body"]] }, { value: "Knit", locations: [["Sleeve"]] })), "TRUE");
  // 트림 부위(Collar · Cuff · Edge · Panel)는 근거 아님
  assert.equal(C(m({ value: "Wool", locations: [["Body"]] }, { value: "Leather", locations: [["Collar"]] })), "FALSE");
  assert.equal(C(m({ value: "Wool", locations: [["Body"]] }, { value: "Leather", locations: [[null, "Edge"]] })), "FALSE");
  assert.equal(C(m({ value: "Wool", locations: [["Body"]] }, { value: "Leather", locations: [["Body", "Panel"]] })), "FALSE");
  // Padding 은 세지 않는다
  assert.equal(C(m({ value: "Cotton", locations: [["Body"]] }, { value: "Padding", locations: [["Body"]] })), "FALSE");
  // 단일 소재
  assert.equal(C(m("Wool")), "FALSE");
});

test("C material: BODY 후보 2개 이상인데 locations 없는 소재 → 미결", () => {
  assert.equal(tc("Shirt", { material: m("Cotton", "Leather") }).channels.C.value, "UNRESOLVED");
  assert.equal(tc("Shirt", { material: m({ value: "Cotton", locations: [["Body"]] }, "Leather") }).channels.C.value, "UNRESOLVED");
});

test("C surface: Lace·Mesh BODY → TRUE / locations 없음 → 미결 / Transparent 는 근거 아님", () => {
  assert.equal(tc("Dress", { surface: m({ value: "Lace", locations: [["Bodice"]] }) }).channels.C.value, "TRUE");
  assert.equal(tc("Dress", { surface: m({ value: "Mesh", locations: [["Sleeve"]] }) }).channels.C.value, "TRUE");
  assert.equal(tc("Dress", { surface: m("Lace") }).channels.C.value, "UNRESOLVED");
  assert.equal(tc("Dress", { surface: m({ value: "Lace", locations: [["Hem"]] }) }).channels.C.value, "FALSE");
  assert.equal(tc("Dress", { surface: m("Transparent", "Semi Transparent") }).channels.C.value, "FALSE");
});

test("C attachment: Jewelry Attachment·Fringe·Feather·Ribbon·Fur Trim BODY + Dominant → TRUE / locations 없음 → 미결", () => {
  for (const v of ["Jewelry Attachment", "Fringe", "Feather", "Ribbon", "Fur Trim"]) {
    const C = (a) => tc("Skirt", { attachment: m(a) }).channels.C.value;
    assert.equal(C({ value: v, locations: [["Skirt Body"]], coverage: "Dominant" }), "TRUE", v);
    assert.equal(C({ value: v, locations: [["Skirt Body"]], coverage: "Partial" }), "FALSE", v);
    assert.equal(C({ value: v, locations: [["Hem"]], coverage: "Dominant" }), "FALSE", v);
    assert.equal(C(v), "UNRESOLVED", v);
  }
});

test("C attachment: Epaulette·Storm Flap 은 Utility 키 밖 → 미결", () => {
  assert.equal(tc("Jacket", { attachment: m("Epaulette") }).channels.C.value, "UNRESOLVED");
  assert.equal(tc("Coat", { grammar: o("Utility"), attachment: m("Storm Flap") }).channels.C.value, "FALSE");
});

test("C attachment: Other 가 Hood·트림 부위 밖이거나 locations 없음 → 미결 · Belt·Metal Hardware → 근거 아님", () => {
  const C = (a) => tc("Coat", { attachment: m(a) }).channels.C.value;
  assert.equal(C("Other"), "UNRESOLVED");
  assert.equal(C({ value: "Other", locations: [["Body"]] }), "UNRESOLVED");
  assert.equal(C({ value: "Other", locations: [["Hood"]] }), "FALSE");
  assert.equal(C({ value: "Other", locations: [["Cuff"], [null, "Edge"]] }), "FALSE");
  assert.equal(C("Belt"), "FALSE");
  assert.equal(C("Metal Hardware"), "FALSE");
});

test("C pocket: Applied·Volumetric @Leg·Lower Front·Chest — Utility 근거 아님 / dense TRUE / trouser 근거 아님 / 그 밖 미결", () => {
  const cargo = [["Chest", "Applied", "Volumetric"]];
  assert.equal(tc("Jacket", { grammar: o("Utility"), pocket: pocketOf(cargo, { density: "dense" }) }).channels.C.value, "FALSE");
  assert.equal(tc("Shirt", { pocket: pocketOf(cargo, { density: "dense" }) }).channels.C.value, "TRUE");
  assert.equal(tc("Shirt", { pocket: pocketOf(cargo) }).channels.C.value, "UNRESOLVED");
  assert.equal(tc("Trouser", { pocket: pocketOf([["Leg", "Applied", "Volumetric"]]) }).channels.C.value, "FALSE");
  assert.equal(tc("Trouser", { pocket: pocketOf([["Leg", "Applied", "Volumetric"]], { density: "dense" }) }).channels.C.value, "TRUE");
  // Sleeve 위치 · Flat · Inset 은 해당 없음
  assert.equal(tc("Shirt", { pocket: pocketOf([["Sleeve", "Applied", "Volumetric"]]) }).channels.C.value, "FALSE");
  assert.equal(tc("Shirt", { pocket: pocketOf([["Chest", "Applied", "Flat"]]) }).channels.C.value, "FALSE");
  assert.equal(tc("Shirt", { pocket: pocketOf([["Chest", "Inset", "Volumetric"]]) }).channels.C.value, "FALSE");
});

test("C pocket: trouser·jumpsuit Lower Front Applied — Metal Hardware @Pocket → TRUE, 아니면 미결", () => {
  const patch = pocketOf([["Lower Front", "Applied", "Flat"]]);
  assert.equal(tc("Trouser", { pocket: patch }).channels.C.value, "UNRESOLVED");
  assert.equal(
    tc("Jumpsuit", { pocket: patch, attachment: m({ value: "Metal Hardware", locations: [["Pocket"]] }) }).channels.C.value,
    "TRUE"
  );
  assert.equal(tc("Trouser", { pocket: pocketOf([["Lower Front", "Inset", "Flat"]]) }).channels.C.value, "FALSE");
});

test("C shoulder_connection", () => {
  const sc = (cat, v, over = {}) => tc(cat, { shoulder_connection: o(v), ...over }).channels.C.value;
  assert.equal(sc("Jumpsuit", "Halter", { waist_definition: o("Defined") }), "TRUE");
  assert.equal(sc("Jumpsuit", "Strapless", { waist_definition: o("Cinched") }), "TRUE");
  assert.equal(sc("Jumpsuit", "Halter", { waist_definition: o("Undefined") }), "FALSE");
  assert.equal(sc("Sweater", "Off Shoulder"), "TRUE");
  assert.equal(sc("T-Shirt", "Strap"), "FALSE");
  for (const cat of ["T-Shirt", "Shirt", "Sweater", "Sweatshirt"]) {
    assert.equal(sc(cat, "One Shoulder"), "UNRESOLVED", cat);
    assert.equal(sc(cat, "Standard"), "FALSE", cat);
  }
  assert.equal(sc("Dress", "Halter"), "FALSE");
});

test("C: TRUE 가 미결보다 앞선다", () => {
  const r = tc("Coat", { front_opening_extent: o("None"), collar: o("Stand") });
  assert.equal(r.channels.C.value, "TRUE");
  assert.equal(r.letter, "T");
});

// ── 비대칭 ────────────────────────────────────────────────────────────────
const asym = (evidence, slit) => ({
  asymmetry: { state: "OBSERVED", value: "Present", evidence },
  ...(slit && { slit: o(slit) }),
});

test("비대칭: asymmetry=Present + slit=Present 아님 → T 근거 → T", () => {
  for (const slit of ["None", undefined]) {
    const r = tc("Skirt", asym(["fx"], slit));
    assert.equal(r.channels.asymmetry.value, "T");
    assert.equal(r.letter, "T");
  }
});

test("비대칭: slit=Present + evidence 가 slit 외 출처를 말함 → T 근거", () => {
  for (const e of ["high-low hem", "diagonal wrap front", "one-shoulder neckline", "off-centre zip closure", "draped panel on left side"]) {
    assert.equal(tc("Skirt", asym([e], "Present")).channels.asymmetry.value, "T", e);
  }
  assert.equal(tc("Skirt", asym(["single side slit", "asymmetric hemline"], "Present")).channels.asymmetry.value, "T");
});

test("비대칭: slit=Present + evidence 가 slit 만 말함 → 근거 아님 (나머지로 결정)", () => {
  const r = tc("Skirt", asym(["single slit on the left only"], "Present"));
  assert.equal(r.channels.asymmetry.value, "NONE");
  assert.equal(r.letter, "C");
});

test("비대칭: slit=Present + evidence 없음 · 둘 다 아님 · 판정 못 함 → 미결", () => {
  for (const ev of [[], ["left and right differ"], ["slit at the hem"]]) {
    const r = tc("Skirt", asym(ev, "Present"));
    assert.equal(r.channels.asymmetry.value, "UNRESOLVED", JSON.stringify(ev));
    assert.equal(r.letter, null);
  }
});

test("비대칭 미결이어도 S·P·C 중 TRUE 가 있으면 T", () => {
  assert.equal(tc("Skirt", { ...asym([], "Present"), fit: o("Oversized") }).letter, "T");
});

test("비대칭: asymmetry=None · 미관찰 → 근거 아님", () => {
  assert.equal(tc("Skirt", { asymmetry: o("None") }).channels.asymmetry.value, "NONE");
  assert.equal(tc("Skirt", { asymmetry: nv() }).channels.asymmetry.value, "NONE");
});

// ── 근거 아님 · 입력 모양 ──────────────────────────────────────────────────
test("TC 근거 아님: pattern · graphic · decorative_detail · hood · rib_hem · exposure_opening · 단일 소재", () => {
  const r = tc("Sweatshirt", {
    pattern: o("Repeat"),
    graphic: o("Dominant"),
    decorative_detail: m("Embroidery"),
    hood: o("Present"),
    rib_hem: o("Present"),
    exposure_opening: m("Midriff / Waist"),
    material: m({ value: "Cotton", locations: [["Body"]] }),
    surface: absent(),
  });
  assert.equal(r.letter, "C");
});

test("OBSERVED 가 아닌 값은 근거가 아니다", () => {
  assert.equal(tc("Shirt", { fit: { state: "UNKNOWN", value: "Oversized" } }).channels.S.value, "UNRESOLVED");
  assert.equal(tc("Shirt", { material: { state: "NOT_VISIBLE", values: [{ value: "Leather" }, { value: "Knit" }] } }).channels.C.value, "FALSE");
});

test("judgeTcRules: governEnvelope target 모양 (record.category · record.observations)", () => {
  const target = {
    target_id: "target_1",
    eligible: true,
    record: { category: o("Jacket"), observations: { ...BASE.Jacket, asymmetry: o("None") } },
  };
  const r = judgeTcRules(target);
  assert.equal(r.archetype_key, "JACKET:Tailored");
  assert.equal(r.letter, "C");
  assert.ok(r.evidence[0].startsWith("규칙 판정: C"));
});
