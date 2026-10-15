/**
 * TC 축(새로움 T ↔ 클래식 C) 규칙 판정 (style-ex).
 *
 * judge.ts 의 DEFAULT_JUDGE_PROMPT [TC — 새로움 ↔ 클래식] 절을 코드로 옮긴 결정적 규칙이다.
 * (그 절은 STMX_TC_ENGINE_V1 의 규칙을 옮긴 것이다. TC 엔진 자체는 코퍼스 anchor_id 에 묶여 새 사진에 쓸 수 없다.)
 *
 *   원형 키(category + grammar) → 세 채널 S(실루엣) · P(비율) · C(구조) + 비대칭
 *   채널 값은 TRUE / FALSE / UNRESOLVED.
 *   결정: S·P·C 중 TRUE 또는 비대칭 T 근거 → T · 비대칭 미결 → 미결 · S·P·C 모두 FALSE → C · 그 밖 → 미결
 *
 * 입력은 governEnvelope 의 target — record.category · record.observations 의 {state, value | values[]} 이며
 * state=OBSERVED 인 값만 근거다. 미결이면 letter 는 null 이고, extract.ts 가 LLM 판정으로 메운다.
 *
 * 이 파일은 서버 전용 모듈을 쓰지 않는다 — node:test 로 바로 돌린다 (lib/style-ex/tests/tc-rules.test.mjs).
 */

export type Channel = "TRUE" | "FALSE" | "UNRESOLVED";
/** 비대칭: T 근거 · 근거 아님 · 미결 */
export type AsymmetryVerdict = "T" | "NONE" | "UNRESOLVED";

export interface ChannelResult<V extends string> {
  value: V;
  /** 이 값을 정한 관찰값과 규칙 — 사람이 읽는 문자열 */
  reason: string;
}

export interface TcRuleResult {
  letter: "T" | "C" | null;
  status: "RESOLVED" | "UNRESOLVED";
  /** 엔진 TC score 는 항상 null 이라 범위만 낸다 — T → TC6–9, C → TC1–4, 미결 → null */
  range: "TC6–9" | "TC1–4" | null;
  /** 원형 키 (예: JACKET:Tailored, trouser) — 미결이면 null */
  archetype_key: string | null;
  channels: {
    S: ChannelResult<Channel>;
    P: ChannelResult<Channel>;
    C: ChannelResult<Channel>;
    asymmetry: ChannelResult<AsymmetryVerdict>;
  };
  evidence: string[];
}

type Obj = Record<string, unknown>;

interface Location {
  component: string | null;
  descriptor: string | null;
}

interface MultiValue {
  value: string;
  coverage: string | null;
  /** 없거나 빈 배열이면 null — 관계형 규칙에서 "locations 없음" 이다 */
  locations: Location[] | null;
}

const asObj = (x: unknown): Obj | null => (x && typeof x === "object" && !Array.isArray(x) ? (x as Obj) : null);
const str = (x: unknown): string | null => (typeof x === "string" ? x : null);
const distinct = (xs: string[]) => [...new Set(xs)];

/** SINGLE 파라미터 — state=OBSERVED 일 때만 값 */
function single(o: unknown): string | null {
  const ob = asObj(o);
  return ob && ob.state === "OBSERVED" ? str(ob.value) : null;
}

/** MULTI 파라미터 — state=OBSERVED 일 때만 values[] */
function multi(o: unknown): MultiValue[] {
  const ob = asObj(o);
  if (!ob || ob.state !== "OBSERVED" || !Array.isArray(ob.values)) return [];
  return ob.values.flatMap((raw) => {
    const v = asObj(raw);
    const value = str(v?.value);
    if (!v || !value) return [];
    const locs = Array.isArray(v.locations)
      ? v.locations.map((l) => ({ component: str(asObj(l)?.component), descriptor: str(asObj(l)?.descriptor) }))
      : [];
    return [{ value, coverage: str(v.coverage), locations: locs.length ? locs : null }];
  });
}

// ── 원형 키 ────────────────────────────────────────────────────────────────

const SIMPLE_KEYS: Record<string, string> = {
  "T-Shirt": "tshirt",
  Shirt: "shirt",
  Sweater: "sweater",
  Sweatshirt: "sweatshirt",
  Trouser: "trouser",
  Skirt: "skirt",
  Dress: "dress",
  Jumpsuit: "jumpsuit",
};
const GRAMMARS = ["Tailored", "Casual", "Utility"];
const TOPS = ["tshirt", "shirt", "sweater", "sweatshirt"];
const TAILORED_KEYS = ["JACKET:Tailored", "COAT:Tailored"];
const UTILITY_KEYS = ["JACKET:Utility", "COAT:Utility"];

interface Archetype {
  key: string | null;
  /** key 가 미결일 때 S 를 판정하려고 따져 볼 후보 키 (Jacket·Coat 의 grammar 3가지) */
  candidates: string[];
  reason: string;
}

function archetypeOf(category: string | null, grammar: string | null): Archetype {
  if (!category) return { key: null, candidates: [], reason: "category 미관찰 → 원형 키 미결" };
  if (SIMPLE_KEYS[category]) {
    const key = SIMPLE_KEYS[category];
    return { key, candidates: [key], reason: `category=${category} → ${key}` };
  }
  if (category === "Jacket" || category === "Coat") {
    const family = category.toUpperCase();
    if (grammar && GRAMMARS.includes(grammar)) {
      const key = `${family}:${grammar}`;
      return { key, candidates: [key], reason: `category=${category} · grammar=${grammar} → ${key}` };
    }
    return {
      key: null,
      candidates: GRAMMARS.map((g) => `${family}:${g}`),
      reason: `category=${category} · grammar ${grammar ? `=${grammar} 도메인 밖` : "미관찰"} → 원형 키 미결`,
    };
  }
  return { key: null, candidates: [], reason: `category=${category} → 원형 키 없음` };
}

// ── S (실루엣) ─────────────────────────────────────────────────────────────

interface SContext {
  sleeveVolume: string | null;
  shoulderStructure: string | null;
  shoulderSpan: string | null;
  silhouette: string | null;
}

/** fit 값 하나를 1)–5) 규칙에 넣는다. flare = trouser·jumpsuit(하체) 플레어 규칙 적용 여부 */
function sOne(fit: string | null, key: string | null, ctx: SContext, flare: boolean): ChannelResult<Channel> {
  if (fit === "Oversized") return { value: "TRUE", reason: "fit=Oversized" };
  if (flare && ctx.silhouette === "Flared" && fit === "Slim") return { value: "TRUE", reason: "silhouette=Flared + fit=Slim" };
  if (ctx.sleeveVolume === "Voluminous") return { value: "UNRESOLVED", reason: "sleeve_volume=Voluminous → 미결" };
  if (ctx.shoulderStructure === "Extreme") return { value: "UNRESOLVED", reason: "shoulder_structure=Extreme → 미결" };
  if (ctx.shoulderStructure === "Strong" && !(key && TAILORED_KEYS.includes(key))) {
    return { value: "UNRESOLVED", reason: "shoulder_structure=Strong → 미결" };
  }
  if (ctx.shoulderSpan === "Extended") return { value: "UNRESOLVED", reason: "shoulder_span=Extended → 미결" };
  if (fit === "Voluminous") {
    return key === "skirt" || key === "dress"
      ? { value: "FALSE", reason: "fit=Voluminous" }
      : { value: "UNRESOLVED", reason: `fit=Voluminous (${key ?? "키 미결"} 도메인 밖) → 미결` };
  }
  if (fit === "Slim" || fit === "Regular" || fit === "Relaxed") return { value: "FALSE", reason: `fit=${fit}` };
  return { value: "UNRESOLVED", reason: fit ? `fit=${fit} 도메인 밖 → 미결` : "fit 미관찰 → 미결" };
}

function sForKey(obs: Obj, key: string | null, ctx: SContext): ChannelResult<Channel> {
  if (key !== "dress" && key !== "jumpsuit") {
    return sOne(single(obs.fit), key, ctx, key === "trouser");
  }
  // Dress·Jumpsuit: 전체 value(있으면) + byRegion upper + lower 를 하나씩. jumpsuit 플레어는 lower 에만.
  const fit = asObj(obs.fit);
  const byRegion = asObj(fit?.byRegion);
  const parts: Array<{ label: string; fit: string | null; flare: boolean }> = [];
  const whole = single(fit);
  if (whole) parts.push({ label: "전체", fit: whole, flare: false });
  parts.push({ label: "upper", fit: single(byRegion?.upper), flare: false });
  parts.push({ label: "lower", fit: single(byRegion?.lower), flare: key === "jumpsuit" });

  const results = parts.map((p) => ({ ...p, r: sOne(p.fit, key, ctx, p.flare) }));
  const line = results.map((p) => `${p.label}: ${p.r.reason}`).join(" · ");
  if (results.some((p) => p.r.value === "TRUE")) return { value: "TRUE", reason: line };
  if (results.every((p) => p.fit && p.r.value === "FALSE")) return { value: "FALSE", reason: line };
  return { value: "UNRESOLVED", reason: line };
}

function channelS(obs: Obj, arch: Archetype): ChannelResult<Channel> {
  const ctx: SContext = {
    sleeveVolume: single(obs.sleeve_volume),
    shoulderStructure: single(obs.shoulder_structure),
    shoulderSpan: single(obs.shoulder_span),
    silhouette: single(obs.silhouette),
  };
  if (arch.key || arch.candidates.length === 0) return sForKey(obs, arch.key, ctx);
  // 키 미결(Jacket·Coat grammar 미관찰)에도 S 는 판정한다 — grammar 후보마다 결과가 같을 때만 그 값.
  const results = arch.candidates.map((k) => sForKey(obs, k, ctx));
  if (results.every((r) => r.value === results[0].value)) return results[0];
  return { value: "UNRESOLVED", reason: `${results[0].reason} — grammar 미관찰이라 Tailored 여부에 따라 갈림 → 미결` };
}

// ── P (비율 · length) ──────────────────────────────────────────────────────

const P_TABLE: Array<{ keys: string[]; FALSE: string[]; TRUE: string[] }> = [
  { keys: TOPS, FALSE: ["Regular", "Long"], TRUE: ["Cropped"] },
  { keys: ["JACKET:Tailored"], FALSE: ["Hip Length"], TRUE: ["Waist Length", "Cropped"] },
  { keys: ["JACKET:Casual", "JACKET:Utility"], FALSE: ["Waist Length", "Hip Length"], TRUE: ["Cropped"] },
  {
    keys: ["COAT:Tailored", "COAT:Casual", "COAT:Utility"],
    FALSE: ["Hip Length", "Thigh Length", "Knee Length", "Maxi Length"],
    TRUE: [],
  },
  {
    keys: ["trouser", "jumpsuit"],
    FALSE: ["Short", "Knee Length", "Calf Length", "Ankle Length", "Full Length", "Extended Length"],
    TRUE: [],
  },
  { keys: ["skirt", "dress"], FALSE: ["Mini", "Midi", "Maxi Length"], TRUE: [] },
];

function channelP(obs: Obj, arch: Archetype): ChannelResult<Channel> {
  if (!arch.key) return { value: "UNRESOLVED", reason: "원형 키 미결 → 미결" };
  const length = single(obs.length);
  if (!length) return { value: "UNRESOLVED", reason: "length 미관찰 → 미결" };
  const row = P_TABLE.find((r) => r.keys.includes(arch.key!));
  if (row?.TRUE.includes(length)) return { value: "TRUE", reason: `length=${length}` };
  if (row?.FALSE.includes(length)) return { value: "FALSE", reason: `length=${length}` };
  return { value: "UNRESOLVED", reason: `length=${length} (${arch.key} 표에 없음) → 미결` };
}

// ── C (구조) ──────────────────────────────────────────────────────────────

/** BODY 부위 = component Body·Bodice·Skirt Body·Leg·Sleeve (descriptor=Panel 제외) */
const BODY_COMPONENTS = ["Body", "Bodice", "Skirt Body", "Leg", "Sleeve"];
const TRIM_COMPONENTS = ["Collar", "Lapel", "Cuff", "Hem", "Waistband", "Pocket", "Strap"];
const isBodyLoc = (l: Location) => !!l.component && BODY_COMPONENTS.includes(l.component) && l.descriptor !== "Panel";
/** 트림 = Collar·Lapel·Cuff·Hem·Waistband·Pocket·Strap, Edge 만, 또는 Panel */
const isTrimLoc = (l: Location) =>
  (!!l.component && TRIM_COMPONENTS.includes(l.component)) || (!l.component && l.descriptor === "Edge") || l.descriptor === "Panel";
const onBody = (v: MultiValue) => !!v.locations?.some(isBodyLoc);
const locText = (v: MultiValue) =>
  v.locations ? v.locations.map((l) => [l.component, l.descriptor].filter(Boolean).join("/")).join(",") : "locations 없음";

interface Signal {
  value: Channel;
  text: string;
}

function tailoredSignals(obs: Obj, key: string): Signal[] {
  const out: Signal[] = [];
  const sleeve = single(obs.sleeve);
  if (sleeve === "Sleeveless") out.push({ value: "TRUE", text: "sleeve=Sleeveless" });

  const collar = single(obs.collar);
  if (collar && ["Notched", "Peak", "Shawl"].includes(collar)) out.push({ value: "FALSE", text: `collar=${collar}` });
  else if (collar && ["None", "Stand", "Shirt", "Sailor", "Peter Pan", "Tie", "Ruffle"].includes(collar)) {
    out.push({ value: "TRUE", text: `collar=${collar}` });
  }

  const closure = single(obs.closure_type);
  if (closure && ["Button", "Single Breasted Button", "Double Breasted Button"].includes(closure)) {
    out.push({ value: "FALSE", text: `closure_type=${closure}` });
  } else if (closure && ["Zipper", "Snap Button", "Hook Closure", "Open"].includes(closure)) {
    out.push({ value: "TRUE", text: `closure_type=${closure}` });
  }

  const opening = single(obs.front_opening_extent);
  if (opening === "Full") out.push({ value: "FALSE", text: "front_opening_extent=Full" });
  else if (opening === "Partial") out.push({ value: "TRUE", text: "front_opening_extent=Partial" });
  else if (opening === "None") {
    out.push(
      key === "JACKET:Tailored"
        ? { value: "TRUE", text: "front_opening_extent=None (JACKET)" }
        : { value: "UNRESOLVED", text: "front_opening_extent=None (COAT) → 미결" }
    );
  }
  return out;
}

function tshirtSignals(obs: Obj): Signal[] {
  const out: Signal[] = [];
  const collar = single(obs.collar);
  if (collar && ["Sailor", "Peter Pan", "Tie", "Ruffle", "Shawl", "Notched", "Peak", "Stand"].includes(collar)) {
    out.push({ value: "UNRESOLVED", text: `collar=${collar} (tshirt) → 미결` });
  }
  if (single(obs.front_opening_extent) === "Full") {
    out.push({ value: "UNRESOLVED", text: "front_opening_extent=Full (tshirt) → 미결" });
  }
  return out;
}

function materialSignals(obs: Obj): Signal[] {
  const mats = multi(obs.material).filter((v) => v.value !== "Padding");
  const body = distinct(mats.filter(onBody).map((v) => v.value));
  const unlocated = distinct(mats.filter((v) => !v.locations).map((v) => v.value));
  if (body.length >= 2) return [{ value: "TRUE", text: `material ${body.join("·")} 가 각각 BODY 부위` }];
  if (unlocated.length && distinct([...body, ...unlocated]).length >= 2) {
    return [{ value: "UNRESOLVED", text: `material BODY 후보 ${distinct([...body, ...unlocated]).join("·")} 중 locations 없음 → 미결` }];
  }
  return [];
}

function surfaceSignals(obs: Obj): Signal[] {
  return multi(obs.surface).flatMap((v): Signal[] => {
    if (v.value !== "Lace" && v.value !== "Mesh") return [];
    if (!v.locations) return [{ value: "UNRESOLVED", text: `surface=${v.value} locations 없음 → 미결` }];
    return onBody(v) ? [{ value: "TRUE", text: `surface=${v.value} @${locText(v)} (BODY)` }] : [];
  });
}

const BODY_ATTACHMENTS = ["Jewelry Attachment", "Fringe", "Feather", "Ribbon", "Fur Trim"];

function attachmentSignals(obs: Obj, key: string): Signal[] {
  return multi(obs.attachment).flatMap((v): Signal[] => {
    if (BODY_ATTACHMENTS.includes(v.value)) {
      if (!v.locations) return [{ value: "UNRESOLVED", text: `attachment=${v.value} locations 없음 → 미결` }];
      return onBody(v) && v.coverage === "Dominant"
        ? [{ value: "TRUE", text: `attachment=${v.value} @${locText(v)} (BODY) + coverage=Dominant` }]
        : [];
    }
    if (v.value === "Epaulette" || v.value === "Storm Flap") {
      return UTILITY_KEYS.includes(key) ? [] : [{ value: "UNRESOLVED", text: `attachment=${v.value} (${key}, Utility 밖) → 미결` }];
    }
    if (v.value === "Other") {
      const contained = v.locations?.every((l) => l.component === "Hood" || isTrimLoc(l));
      return contained ? [] : [{ value: "UNRESOLVED", text: `attachment=Other @${locText(v)} → 미결` }];
    }
    return []; // Belt · Metal Hardware → 근거 아님
  });
}

function pocketSignals(obs: Obj, key: string): Signal[] {
  const pocket = asObj(obs.pocket);
  if (single(pocket) !== "Present" || !Array.isArray(pocket?.pockets)) return [];
  const instances = pocket.pockets.map((raw) => {
    const p = asObj(raw);
    return { location: str(p?.location), construction: single(p?.construction), projection: single(p?.projection) };
  });
  const out: Signal[] = [];
  const lowerBody = key === "trouser" || key === "jumpsuit";

  let denseTrue = false;
  const volumetric = instances.filter(
    (p) => p.projection === "Volumetric" && p.construction === "Applied" && ["Leg", "Lower Front", "Chest"].includes(p.location ?? "")
  );
  if (volumetric.length && !UTILITY_KEYS.includes(key)) {
    const where = distinct(volumetric.map((p) => p.location!)).join("·");
    if (str(pocket.density) === "dense") {
      out.push({ value: "TRUE", text: `pocket Applied·Volumetric @${where} + density=dense` });
      denseTrue = true;
    } else if (!lowerBody) {
      out.push({ value: "UNRESOLVED", text: `pocket Applied·Volumetric @${where} (${key}) → 미결` });
    }
  }

  if (lowerBody && !denseTrue && instances.some((p) => p.location === "Lower Front" && p.construction === "Applied")) {
    const hardware = multi(obs.attachment).some(
      (v) => v.value === "Metal Hardware" && !!v.locations?.some((l) => l.component === "Pocket")
    );
    out.push(
      hardware
        ? { value: "TRUE", text: "pocket Applied @Lower Front + Metal Hardware @Pocket" }
        : { value: "UNRESOLVED", text: "pocket Applied @Lower Front, Metal Hardware @Pocket 없음 → 미결" }
    );
  }
  return out;
}

function shoulderConnectionSignals(obs: Obj, key: string): Signal[] {
  const sc = single(obs.shoulder_connection);
  if (!sc) return [];
  if (key === "jumpsuit" && (sc === "Halter" || sc === "Strapless")) {
    const waist = single(obs.waist_definition);
    return waist === "Defined" || waist === "Cinched"
      ? [{ value: "TRUE", text: `shoulder_connection=${sc} + waist_definition=${waist} (jumpsuit)` }]
      : [];
  }
  if (key === "sweater" && sc === "Off Shoulder") return [{ value: "TRUE", text: "shoulder_connection=Off Shoulder (sweater)" }];
  if (key === "tshirt" && sc === "Strap") return [];
  if (TOPS.includes(key) && sc !== "Standard") return [{ value: "UNRESOLVED", text: `shoulder_connection=${sc} (${key}) → 미결` }];
  return [];
}

function channelC(obs: Obj, arch: Archetype): ChannelResult<Channel> {
  const key = arch.key;
  if (!key) return { value: "UNRESOLVED", reason: "원형 키 미결 → 미결" };
  const signals = [
    ...(TAILORED_KEYS.includes(key) ? tailoredSignals(obs, key) : []),
    ...(key === "tshirt" ? tshirtSignals(obs) : []),
    ...materialSignals(obs),
    ...surfaceSignals(obs),
    ...attachmentSignals(obs, key),
    ...pocketSignals(obs, key),
    ...shoulderConnectionSignals(obs, key),
  ];
  const list = (v: Channel) => signals.filter((s) => s.value === v).map((s) => s.text);
  if (list("TRUE").length) return { value: "TRUE", reason: list("TRUE").join(" · ") };
  if (list("UNRESOLVED").length) return { value: "UNRESOLVED", reason: list("UNRESOLVED").join(" · ") };
  const falses = list("FALSE");
  return { value: "FALSE", reason: falses.length ? `${falses.join(" · ")} → FALSE` : "C 근거 없음 → FALSE" };
}

// ── 비대칭 ────────────────────────────────────────────────────────────────

/** slit 을 말하는 낱말 */
export const SLIT_WORDS: RegExp[] = [/\bslits?\b/i, /\bslitted\b/i, /\bsplits?\b/i, /\bvents?\b/i, /슬릿/, /트임/];

/**
 * slit 외의 비대칭 출처를 말하는 낱말 (프롬프트의 hem · high-low · drape · wrap · panel · shoulder · sleeve · closure ·
 * zip · strap · pocket · collar · neckline · diagonal 와 그 변형). 관찰 evidence 는 대개 영어라 영어를 먼저 두고
 * 한국어 몇 개를 더한다.
 */
export const SOURCE_WORDS: RegExp[] = [
  /\bhem/i,
  /\bhigh[\s-]?low\b/i,
  /\bhi[\s-]?lo\b/i,
  /\bdrap/i,
  /\bwrap/i,
  /\bpanel/i,
  /shoulder/i,
  /\bsleeve/i,
  /\bclosure/i,
  /\bzip/i,
  /\bstrap/i,
  /\bpocket/i,
  /\bcollar/i,
  /\bneck/i,
  /\bdiagonal/i,
  /\bplacket/i,
  /\blapel/i,
  /\bbutton/i,
  /\bpeplum/i,
  /\bruffle/i,
  /\bflounce/i,
  /\btier/i,
  /밑단|드레이프|드레이핑|패널|어깨|소매|여밈|지퍼|스트랩|포켓|주머니|칼라|카라|넥라인|목선|사선|대각선|단추|라펠|러플/,
];

const mentions = (words: RegExp[], line: string) => words.some((w) => w.test(line));

function channelAsymmetry(obs: Obj): ChannelResult<AsymmetryVerdict> {
  const asym = single(obs.asymmetry);
  if (asym !== "Present") return { value: "NONE", reason: asym ? `asymmetry=${asym}` : "asymmetry 미관찰" };
  const slit = single(obs.slit);
  if (slit !== "Present") return { value: "T", reason: `asymmetry=Present · slit${slit ? `=${slit}` : " 미관찰"}` };

  // slit=Present: asymmetry evidence 가 slit 외 출처를 말하는가 — 자유 텍스트라 줄마다 낱말로 가른다.
  //   출처 낱말만 → slit 외 출처 · slit 낱말만 → slit · 둘 다 → 판정 못 함 · 둘 다 없음 → 무관
  const ev = asObj(obs.asymmetry)?.evidence;
  const lines = Array.isArray(ev) ? ev.filter((e): e is string => typeof e === "string" && e.trim() !== "") : [];
  if (!lines.length) return { value: "UNRESOLVED", reason: "asymmetry=Present · slit=Present · evidence 없음 → 미결" };
  const kinds = lines.map((line) => {
    const s = mentions(SLIT_WORDS, line);
    const o = mentions(SOURCE_WORDS, line);
    return { line, kind: o && !s ? "source" : s && !o ? "slit" : s && o ? "mixed" : "neither" };
  });
  const quote = (k: string) => kinds.filter((x) => x.kind === k).map((x) => `"${x.line}"`).join(", ");
  if (kinds.some((x) => x.kind === "source")) {
    return { value: "T", reason: `asymmetry=Present · slit=Present · evidence 가 slit 외 출처를 말함: ${quote("source")}` };
  }
  if (kinds.some((x) => x.kind === "mixed")) {
    return { value: "UNRESOLVED", reason: `asymmetry=Present · slit=Present · slit 과 다른 출처를 한 줄에 함께 말함: ${quote("mixed")} → 미결` };
  }
  if (kinds.some((x) => x.kind === "slit")) {
    return { value: "NONE", reason: `asymmetry=Present · slit=Present · evidence 가 slit 만 말함: ${quote("slit")}` };
  }
  return { value: "UNRESOLVED", reason: "asymmetry=Present · slit=Present · evidence 가 출처를 말하지 않음 → 미결" };
}

// ── 결정 ──────────────────────────────────────────────────────────────────

/** category 와 observations(37개 파라미터)로 TC 를 판정한다 */
export function evaluateTc(category: string | null, observations: Obj): TcRuleResult {
  const arch = archetypeOf(category, single(observations.grammar));
  const S = channelS(observations, arch);
  const P = channelP(observations, arch);
  const C = channelC(observations, arch);
  const asymmetry = channelAsymmetry(observations);

  const trues = (["S", "P", "C"] as const).filter((k) => ({ S, P, C })[k].value === "TRUE");
  let letter: "T" | "C" | null;
  let decision: string;
  if (trues.length || asymmetry.value === "T") {
    letter = "T";
    decision = [...trues.map((k) => `${k} TRUE`), ...(asymmetry.value === "T" ? ["비대칭 T 근거"] : [])].join(" · ");
  } else if (asymmetry.value === "UNRESOLVED") {
    letter = null;
    decision = "비대칭 미결";
  } else if (S.value === "FALSE" && P.value === "FALSE" && C.value === "FALSE") {
    letter = "C";
    decision = "S·P·C 모두 FALSE";
  } else {
    letter = null;
    decision = `${(["S", "P", "C"] as const).filter((k) => ({ S, P, C })[k].value === "UNRESOLVED").join("·")} 미결`;
  }
  const range = letter === "T" ? "TC6–9" : letter === "C" ? "TC1–4" : null;
  const asymLabel = { T: "T 근거", NONE: "근거 아님", UNRESOLVED: "미결" }[asymmetry.value];

  return {
    letter,
    status: letter ? "RESOLVED" : "UNRESOLVED",
    range,
    archetype_key: arch.key,
    channels: { S, P, C, asymmetry },
    evidence: [
      `규칙 판정: ${letter ? `${letter} (${range})` : "미결"} — ${decision}`,
      `원형 키: ${arch.reason}`,
      `S ${S.value}: ${S.reason}`,
      `P ${P.value}: ${P.reason}`,
      `C ${C.value}: ${C.reason}`,
      `비대칭 ${asymLabel}: ${asymmetry.reason}`,
    ],
  };
}

/** governEnvelope 의 target 하나 (record.category · record.observations) */
export function judgeTcRules(target: Obj): TcRuleResult {
  const record = asObj(target.record) ?? {};
  const category = single(record.category) ?? str(record.category);
  return evaluateTc(category, asObj(record.observations) ?? {});
}

/** 화면 한 줄 요약 — 예: "S FALSE · P FALSE · C FALSE · 비대칭 근거 아님" */
export function tcSummaryOf(r: TcRuleResult): string {
  const asym = { T: "T 근거", NONE: "근거 아님", UNRESOLVED: "미결" }[r.channels.asymmetry.value];
  const ch = (k: "S" | "P" | "C") => `${k} ${r.channels[k].value === "UNRESOLVED" ? "미결" : r.channels[k].value}`;
  return `${r.archetype_key ?? "원형 키 미결"} · ${ch("S")} · ${ch("P")} · ${ch("C")} · 비대칭 ${asym}`;
}
