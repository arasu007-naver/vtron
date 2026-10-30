/**
 * 관찰 envelope(Item Vision V1.3) → 37개 vision feature 트리 (/style-ex 의 "37 Features" 탭).
 *
 * 흐름도(docs/style-vision-element-extraction.html · 37개 요소의 계층 구조)와 같은 계층으로 펼친다:
 *   의복(타깃) → #1 category → 카테고리가 켜는 기본 파라미터(범용 9 · 형태 · 상체 · 하체/허리 · 카테고리 전용)
 *   → 부모 값이 켜는 조건부 파라미터(부모 아래) → 값에 붙는 보조 필드(locations · coverage · 영역 …)
 *   + 37개 밖의 형제: DM 디테일 증거 · 색상 · 연출 유형
 * 모델이 낸 키만 보인다 — 해당 없음(N/A)으로 생략된 키는 envelope 에 없으므로 트리에도 없다.
 * 서버 전용 코드를 부르지 않는다(브라우저에서 돈다).
 */

export type FeatureState = "OBSERVED" | "ABSENT" | "NOT_VISIBLE" | "UNKNOWN";

export interface FeatureNode {
  key: string;
  label: string;
  /** 파라미터 번호 #1–#37 */
  no?: number;
  state?: FeatureState;
  value?: string;
  /** 보조 설명 (근거 · 위치 · 영역 등) */
  note?: string;
  children?: FeatureNode[];
}

export interface TargetTree {
  node: FeatureNode;
  eligible: boolean;
  /** 이 의복이 낸 파라미터 수 (#1 category 포함) */
  emitted: number;
}

export interface FeatureTree {
  targets: TargetTree[];
  /** 상태가 있는 노드 수 — 상태별 */
  counts: Record<FeatureState, number>;
}

type Obj = Record<string, unknown>;

/** 엔진 producer_rules_v1 의 PN 표 (#1–#37) */
export const PARAM_NO: Record<string, number> = {
  category: 1, trouser_distinction: 2, silhouette: 3, fit: 4, length: 5, fabric_behavior: 6, waist_definition: 7,
  sleeve: 8, shoulder_connection: 9, shoulder_span: 10, shoulder_drop: 11, shoulder_structure: 12, neckline_shape: 13,
  neckline_position: 14, collar: 15, cuff_type: 16, rib_hem: 17, hood: 18, front_opening_extent: 19, closure_type: 20,
  pocket: 21, pocket_construction: 22, pocket_projection: 23, cuff_scale: 24, material: 25, surface: 26, pattern: 27,
  graphic: 28, asymmetry: 29, slit: 30, ruffle: 31, decorative_detail: 32, attachment: 33, exposure_opening: 34,
  grammar: 35, sleeve_volume: 36, collar_scale: 37,
};

/** 기본 파라미터 묶음 (흐름도 L3) — 조건부 파라미터는 부모 아래에 둔다 (L4) */
const GROUPS: { key: string; label: string; params: string[] }[] = [
  { key: "universal", label: "범용 9 — 모든 카테고리", params: ["material", "surface", "pattern", "graphic", "pocket", "decorative_detail", "attachment", "asymmetry", "exposure_opening"] },
  { key: "form", label: "형태", params: ["fit", "length", "fabric_behavior", "silhouette", "trouser_distinction"] },
  { key: "upper", label: "상체", params: ["sleeve", "shoulder_drop", "shoulder_structure", "shoulder_connection", "shoulder_span", "neckline_shape", "neckline_position", "collar", "rib_hem", "hood", "front_opening_extent"] },
  { key: "lower", label: "하체 · 허리", params: ["slit", "waist_definition"] },
  { key: "category_only", label: "카테고리 전용", params: ["grammar", "ruffle"] },
];

/** 부모 → 조건부 자식 (엔진 CONDITIONAL_TRIGGER) */
const CHILDREN: Record<string, string[]> = {
  sleeve: ["cuff_type", "sleeve_volume"],
  cuff_type: ["cuff_scale"],
  collar: ["collar_scale"],
  front_opening_extent: ["closure_type"],
  pocket: ["pocket_construction", "pocket_projection"],
};

const STATES: FeatureState[] = ["OBSERVED", "ABSENT", "NOT_VISIBLE", "UNKNOWN"];
const asState = (s: unknown): FeatureState | undefined => (STATES.includes(s as FeatureState) ? (s as FeatureState) : undefined);
const str = (v: unknown) => (v == null ? undefined : typeof v === "string" ? v : JSON.stringify(v));
const firstEvidence = (o: Obj) => (Array.isArray(o.evidence) && o.evidence.length ? String(o.evidence[0]) : undefined);

/** MULTI 값 하나 · pockets[] 항목 하나의 보조 필드 → 설명 */
function auxNote(item: Obj) {
  const parts: string[] = [];
  if (item.coverage) parts.push(`coverage ${item.coverage}`);
  if (Array.isArray(item.locations) && item.locations.length) {
    parts.push(`locations ${(item.locations as Obj[]).map((l) => [l.component, l.descriptor].filter(Boolean).join(" ")).join(", ")}`);
  }
  if (item.finish_realization) parts.push(`finish ${item.finish_realization}`);
  if (item.treated_surface_realization) parts.push(`treated ${item.treated_surface_realization}`);
  if (item.descriptor) parts.push(String(item.descriptor));
  return parts.join(" · ") || undefined;
}

/** 관찰 하나 → 노드 (MULTI 값 · 영역 · 포켓 항목 · 조건부 자식을 아래에) */
function paramNode(key: string, o: Obj, obs: Obj): FeatureNode {
  const kids: FeatureNode[] = [];
  if (Array.isArray(o.values)) {
    (o.values as Obj[]).forEach((v, i) =>
      kids.push({ key: `${key}.v${i}`, label: str(v.value) ?? "?", state: "OBSERVED", note: auxNote(v) ?? firstEvidence(v) })
    );
  }
  if (o.byRegion && typeof o.byRegion === "object") {
    for (const [region, r] of Object.entries(o.byRegion as Record<string, Obj>)) {
      kids.push({ key: `${key}.${region}`, label: region, state: asState(r?.state), value: str(r?.value), note: firstEvidence(r ?? {}) });
    }
  }
  if (Array.isArray(o.pockets)) {
    (o.pockets as Obj[]).forEach((p, i) => {
      const cell = (c: unknown) => c as Obj | undefined;
      kids.push({
        key: `${key}.p${i}`,
        label: `pocket ${i + 1}${p.location ? ` — ${str(p.location)}` : ""}`,
        children: [
          { key: `${key}.p${i}.c`, label: "construction", no: 22, state: asState(cell(p.construction)?.state), value: str(cell(p.construction)?.value) },
          { key: `${key}.p${i}.j`, label: "projection", no: 23, state: asState(cell(p.projection)?.state), value: str(cell(p.projection)?.value) },
        ],
      });
    });
  }
  for (const child of CHILDREN[key] ?? []) {
    if (obs[child]) kids.push(paramNode(child, obs[child] as Obj, obs));
  }
  const extras: string[] = [];
  if (o.visual_dominance) extras.push(`visual_dominance ${o.visual_dominance}`);
  if (o.motif_complexity) extras.push(`motif_complexity ${o.motif_complexity}`);
  if (o.coverage) extras.push(`coverage ${o.coverage}`);
  if (o.count != null) extras.push(`count ${o.count}`);
  if (o.density) extras.push(`density ${o.density}`);
  if (o.region && o.region !== "whole_garment") extras.push(`region ${o.region}`);
  return {
    key,
    label: key,
    no: PARAM_NO[key],
    state: asState(o.state),
    value: Array.isArray(o.values) ? `${(o.values as unknown[]).length}개 값` : str(o.value),
    note: [extras.join(" · "), firstEvidence(o)].filter(Boolean).join(" — ") || undefined,
    children: kids.length ? kids : undefined,
  };
}

function targetNode(t: Obj): TargetTree {
  const id = String(t.target_id ?? "?");
  const rec = (t.record as Obj | undefined) ?? {};
  const cat = (rec.category as Obj | undefined) ?? {};
  const obs = (rec.observations as Obj | undefined) ?? {};
  const eligible = t.eligible === true && Boolean(t.record);
  const tags = [
    t.prominence ? String(t.prominence) : null,
    t.product_match === true ? "product_match" : null,
    t.extraction_depth ? `depth ${t.extraction_depth}` : null,
  ].filter(Boolean);
  if (!eligible) {
    return {
      eligible: false,
      emitted: 0,
      node: { key: id, label: `${id} — 비적격`, note: str(t.reason) ?? "식별 정보만 있음 (관찰 없음)" },
    };
  }

  const children: FeatureNode[] = [];
  const readability = t.readability as Obj | undefined;
  children.push({
    key: `${id}.target`,
    label: "타깃",
    children: [
      { key: `${id}.readability`, label: "readability", value: str(readability?.basis ?? readability?.value), note: str(t.role) },
      { key: `${id}.prominence`, label: "prominence", value: str(t.prominence) },
      ...(t.product_match !== undefined ? [{ key: `${id}.pm`, label: "product_match", value: String(t.product_match === true) }] : []),
    ],
  });
  children.push({
    key: `${id}.category`,
    label: "category",
    no: 1,
    state: asState(cat.state),
    value: str(cat.value),
    note: cat.product_context ? `product_context ${cat.product_context}` : undefined,
  });

  const used = new Set<string>();
  for (const g of GROUPS) {
    const nodes = g.params.filter((p) => obs[p]).map((p) => {
      used.add(p);
      (CHILDREN[p] ?? []).forEach((c) => used.add(c));
      (CHILDREN[p] ?? []).forEach((c) => (CHILDREN[c] ?? []).forEach((cc) => used.add(cc)));
      return paramNode(p, obs[p] as Obj, obs);
    });
    if (nodes.length) children.push({ key: `${id}.${g.key}`, label: g.label, children: nodes });
  }
  // 묶음에 없는 키 · 부모 없이 나온 조건부 키 — 숨기지 않고 따로 보인다
  const rest = Object.keys(obs).filter((k) => !used.has(k));
  if (rest.length) {
    children.push({
      key: `${id}.rest`,
      label: "그 밖 (부모 없이 나온 키 등)",
      children: rest.map((k) => paramNode(k, obs[k] as Obj, obs)),
    });
  }

  // 37개 밖의 형제
  const dm = rec.dm_designed_detail_evidence as Obj | undefined;
  if (dm) {
    const ev = Array.isArray(dm.evidence) ? (dm.evidence as Obj[]) : [];
    const ex = Array.isArray(dm.excluded) ? (dm.excluded as Obj[]) : [];
    children.push({
      key: `${id}.dm`,
      label: "DM 디테일 증거 (37개 밖)",
      value: `증거 ${ev.length} · 제외 ${ex.length}`,
      children: [
        ...ev.map((e, i) => ({ key: `${id}.dm.e${i}`, label: str(e.descriptor ?? e.family ?? e.carrier_kind) ?? `evidence ${i + 1}`, note: str(e.evidence ?? e.carrier_ref) })),
        ...ex.map((e, i) => ({ key: `${id}.dm.x${i}`, label: `제외 — ${str(e.reason) ?? "?"}`, note: str(e.evidence) })),
      ],
    });
  }
  const colour = t.color_observation as Obj | null | undefined;
  if (colour) {
    const scalar = Object.entries(colour).filter(([, v]) => v != null && typeof v !== "object");
    children.push({
      key: `${id}.colour`,
      label: "색상 (37개 밖)",
      children: scalar.map(([k, v]) => ({ key: `${id}.colour.${k}`, label: k, value: String(v) })),
    });
  }
  if (t.presentation_type) {
    children.push({ key: `${id}.presentation`, label: "presentation_type (37개 밖)", value: str(t.presentation_type) });
  }

  return {
    eligible: true,
    emitted: Object.keys(obs).filter((k) => k in PARAM_NO).length + (cat.state ? 1 : 0),
    node: { key: id, label: `${id} · ${str(cat.value) ?? "category UNKNOWN"}`, note: tags.join(" · ") || undefined, children },
  };
}

/** 노드 상태 세기 (트리 전체) */
function countStates(nodes: FeatureNode[], counts: Record<FeatureState, number>) {
  for (const n of nodes) {
    if (n.state) counts[n.state]++;
    if (n.children) countStates(n.children, counts);
  }
}

export function buildFeatureTree(envelope: unknown): FeatureTree | null {
  const targets = (envelope as { targets?: unknown } | null)?.targets;
  if (!Array.isArray(targets)) return null;
  const built = (targets as Obj[]).map(targetNode);
  const counts: Record<FeatureState, number> = { OBSERVED: 0, ABSENT: 0, NOT_VISIBLE: 0, UNKNOWN: 0 };
  countStates(built.map((t) => t.node), counts);
  return { targets: built, counts };
}

/** 상태로 거른 트리 — 그 상태인 노드와, 그런 노드를 품은 조상만 남긴다 */
export function pruneByState(nodes: FeatureNode[], only: FeatureState): FeatureNode[] {
  return nodes.flatMap((n) => {
    const kids = n.children ? pruneByState(n.children, only) : [];
    if (n.state === only || kids.length) return [{ ...n, children: kids.length ? kids : undefined }];
    return [];
  });
}

/** 펼침 상태의 기본값 — 의복과 묶음까지 */
export const defaultOpen = (tree: FeatureTree) => {
  const open = new Set<string>();
  for (const t of tree.targets) {
    open.add(t.node.key);
    for (const c of t.node.children ?? []) if (c.children?.length) open.add(c.key);
  }
  return open;
};
