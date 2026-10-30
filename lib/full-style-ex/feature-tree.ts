/**
 * Evidence Packet → vision feature 트리 (/full-style-ex 의 "37 Features" 탭).
 *
 * 흐름도의 feature 구성도(docs/full-vision-feature-extraction.html#feature-map)와 같은 계층으로 펼친다:
 *   LOOK → ① 컴포넌트 → ② 외관 → ③ 의복 구조 → ④ 착용 관계 → ⑤ 디테일 시스템
 * 모델 출력이 아니라 동결 추출기가 만든 패킷(판정 엔진이 받는 것)을 읽는다 — 비전 1회 · 3회 모두 같다.
 * 적용되지 않아 내지 않은 사실은 패킷에 없으므로 트리에도 없다.
 */

export type FeatureState = "OBSERVED" | "ABSENT" | "NOT_VISIBLE" | "UNKNOWN";

export interface FeatureNode {
  key: string;
  label: string;
  /** SVP-xxx · DMP-x */
  id?: string;
  /** 보조 설명 (값 도메인 · 대상 등) */
  note?: string;
  state?: FeatureState;
  value?: string;
  limitation?: string[];
  axes?: string[];
  children?: FeatureNode[];
}

export interface FeatureTree {
  nodes: FeatureNode[];
  /** 상태가 있는 잎 수 — 상태별 */
  counts: Record<FeatureState, number>;
  /** 이 룩에서 값을 낸 feature 종류 (SVP · DMP id) */
  ids: string[];
}

type Obj = Record<string, unknown>;
type Cell = { value?: unknown; state?: string } | undefined;

const GARMENTS = new Set(["T-Shirt", "Shirt", "Sweater", "Sweatshirt", "Jacket", "Coat", "Trouser", "Skirt", "Dress", "Jumpsuit"]);

/** 의복 원사실 — 번호 · 그룹 · 축 */
const FACT_META: Record<string, { id: string; group: "appearance" | "form" | "shoulder" | "front" | "pocket" | "waist"; axes: string[] }> = {
  pattern: { id: "SVP-121", group: "appearance", axes: ["EI"] },
  graphic: { id: "SVP-122", group: "appearance", axes: ["EI"] },
  surface: { id: "SVP-123", group: "appearance", axes: ["EI", "TC", "SR"] },
  material: { id: "SVP-124", group: "appearance", axes: ["EI", "TC", "SR"] },
  decorative_detail: { id: "SVP-125", group: "appearance", axes: ["EI"] },
  attachment: { id: "SVP-126", group: "appearance", axes: ["EI", "TC"] },
  grammar: { id: "SVP-101", group: "form", axes: ["EI", "TC"] },
  trouser_distinction: { id: "SVP-102", group: "form", axes: ["EI", "TC"] },
  silhouette: { id: "SVP-103", group: "form", axes: ["TC"] },
  fit: { id: "SVP-104", group: "form", axes: ["TC"] },
  asymmetry: { id: "SVP-107", group: "form", axes: ["TC"] },
  length: { id: "SVP-108", group: "form", axes: ["TC"] },
  sleeve: { id: "SVP-114", group: "form", axes: ["TC"] },
  sleeve_volume: { id: "SVP-109", group: "form", axes: ["TC"] },
  collar: { id: "SVP-113", group: "form", axes: ["TC"] },
  shoulder_structure: { id: "SVP-105", group: "shoulder", axes: ["TC"] },
  shoulder_drop: { id: "SVP-106", group: "shoulder", axes: ["SR"] },
  shoulder_span: { id: "SVP-110", group: "shoulder", axes: ["TC"] },
  shoulder_connection: { id: "SVP-115", group: "shoulder", axes: ["TC"] },
  front_opening_extent: { id: "SVP-112", group: "front", axes: ["TC"] },
  closure_type: { id: "SVP-111", group: "front", axes: ["TC"] },
  pocket: { id: "SVP-116", group: "pocket", axes: ["TC"] },
  waist_definition: { id: "SVP-119", group: "waist", axes: ["TC", "SR"] },
  slit: { id: "SVP-120", group: "waist", axes: ["TC"] },
};
const FACT_ORDER = Object.keys(FACT_META);

const STRUCTURE_GROUPS: { key: "form" | "shoulder" | "front" | "pocket" | "waist"; label: string; note?: string }[] = [
  { key: "form", label: "형태" },
  { key: "shoulder", label: "어깨 영역", note: "한 번 보고 넷 — structure 와 drop 은 서로 유도 금지" },
  { key: "front", label: "앞판 영역" },
  { key: "pocket", label: "포켓 영역" },
  { key: "waist", label: "허리 · 트임" },
];

const DM_FAMILY: Record<string, string> = {
  A: "표면 적용", B: "소재/구성 표면", C: "하드웨어", D: "트림/마감", E: "장식",
  F: "3D 장식 구성", G: "액세서리 디테일", H: "스타일링 관계", I: "기능 구성", J: "혼합 표면 분할",
};

const asState = (s: unknown): FeatureState | undefined =>
  s === "OBSERVED" || s === "ABSENT" || s === "NOT_VISIBLE" || s === "UNKNOWN" ? s : undefined;
const show = (v: unknown): string | undefined =>
  v == null ? undefined : Array.isArray(v) ? v.map(show).join(" · ") : typeof v === "object" ? JSON.stringify(v) : String(v);
const cell = (key: string, label: string, c: Cell, extra: Partial<FeatureNode> = {}): FeatureNode => ({
  key,
  label,
  state: asState(c?.state) ?? (c?.value != null ? "OBSERVED" : undefined),
  value: show(c?.value),
  ...extra,
});

/** 색 영역 한 줄 — family lightness effect · 역할(point 면 대비) · 부품 */
function colourLine(c: Obj, role: string): string {
  const part = c.carrier_part as Obj | undefined;
  const contrast = c.contrast_with_field ? ` ${c.contrast_with_field}` : "";
  return [
    [c.color_family, c.color_lightness, c.color_effect !== "none" ? c.color_effect : null].filter(Boolean).join(" "),
    `${role}${contrast}`,
    part ? `${part.carrier_kind}/${part.carrier_ref}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function buildFeatureTree(packet: Obj | null | undefined): FeatureTree {
  const counts: Record<FeatureState, number> = { OBSERVED: 0, ABSENT: 0, NOT_VISIBLE: 0, UNKNOWN: 0 };
  const ids = new Set<string>();
  if (!packet) return { nodes: [], counts, ids: [] };

  const registry = (packet.component_registry as Obj[] | undefined) ?? [];
  const pool = (packet.component_fact_pool as Obj[] | undefined) ?? [];
  const colour = (packet.colour_composition as Obj | undefined) ?? {};
  const relations = (packet.relations as Obj | undefined) ?? {};
  const upper = (packet.upper_realization as Obj | undefined) ?? {};
  const exposure = (packet.canonical_exposure as Obj | undefined) ?? {};
  const dm = (packet.dm_evidence as Obj | undefined) ?? {};
  const frame = (packet.look_frame as Obj | undefined) ?? {};

  const identityOf = (ref: string) => String((registry.find((c) => c.component_ref === ref)?.object_identity as Cell)?.value ?? "UNKNOWN");
  const refLabel = (ref: string) => `${ref} ${identityOf(ref)}`;
  const factsOf = (ref: string) =>
    pool.filter((f) => f.component_ref === ref).sort((a, b) => FACT_ORDER.indexOf(String(a.fact)) - FACT_ORDER.indexOf(String(b.fact)));
  const factNode = (ref: string, f: Obj): FeatureNode => {
    const name = String(f.fact);
    const meta = FACT_META[name];
    if (meta) ids.add(meta.id);
    const node = cell(`${ref}.${name}`, name, { state: String(f.state), value: f.value }, {
      id: meta?.id,
      axes: meta?.axes,
      limitation: (f.limitation as string[] | undefined) ?? undefined,
    });
    const pockets = f.pockets as Obj[] | undefined;
    if (pockets?.length) {
      ids.add("SVP-117");
      ids.add("SVP-118");
      node.children = pockets.map((p, i) => ({
        key: `${ref}.pocket.${i}`,
        label: `pockets[${i}] · ${p.location ?? "?"}`,
        children: [
          cell(`${ref}.pocket.${i}.construction`, "construction", p.construction as Cell, { id: "SVP-117" }),
          cell(`${ref}.pocket.${i}.projection`, "projection", p.projection as Cell, { id: "SVP-118" }),
        ],
      }));
    }
    return node;
  };

  // LOOK
  ids.add("SVP-001");
  const look: FeatureNode = {
    key: "look",
    label: "LOOK — 착장 프레임",
    note: "G1 · look_frame",
    children: [
      cell("look.state", "frame.state", { state: String(frame.state ?? "") }, { id: "SVP-001" }),
      { key: "look.limits", label: "frame.limits[]", value: ((frame.limits as string[] | undefined) ?? []).join(" · ") || "없음" },
    ],
  };

  // ① 컴포넌트
  const components: FeatureNode = {
    key: "components",
    label: "① 컴포넌트",
    note: `G1 · component_registry · 참여 물체 ${registry.length}`,
    axes: ["EI", "TC"],
    children: registry.map((c) => {
      const ref = String(c.component_ref);
      ids.add("SVP-002");
      const kids: FeatureNode[] = [cell(`${ref}.identity`, "identity", c.object_identity as Cell, { id: "SVP-002" })];
      for (const k of ["footwear_product_family", "footwear_product_subtype", "object_subtype"]) {
        if (c[k]) {
          ids.add("SVP-003");
          kids.push(cell(`${ref}.${k}`, k, c[k] as Cell, { id: "SVP-003" }));
        }
      }
      if (c.attached_to) kids.push({ key: `${ref}.attached_to`, label: "attached_to", value: show((c.attached_to as Cell)?.value ?? c.attached_to) });
      return { key: `comp.${ref}`, label: refLabel(ref), children: kids };
    }),
  };

  // ② 외관 — 컴포넌트마다 색 + 외관 6
  const fields = (colour.field as Obj[] | undefined) ?? [];
  const points = (colour.points as Obj[] | undefined) ?? [];
  const partial = (colour.partial as Obj[] | undefined) ?? [];
  const unreadable = (colour.unreadable as Obj[] | undefined) ?? [];
  const appearance: FeatureNode = {
    key: "appearance",
    label: "② 외관",
    note: "G2 · colour_composition · component_fact_pool",
    children: registry.map((c) => {
      const ref = String(c.component_ref);
      const colours: FeatureNode[] = [
        ...fields.filter((f) => ((f.carrier_refs as string[]) ?? []).includes(ref)).map((f, i) => ({ key: `${ref}.cf.${i}`, label: "colour", value: colourLine(f, "field"), state: "OBSERVED" as const })),
        ...points.filter((p) => (p.carrier_ref as Cell)?.value === ref).map((p, i) => ({ key: `${ref}.cp.${i}`, label: "colour", value: colourLine(p, "point"), state: "OBSERVED" as const })),
        ...partial.filter((p) => p.carrier_ref === ref).map((p, i) => ({ key: `${ref}.cpa.${i}`, label: "colour (partial)", value: `${colourLine(p, String(p.role ?? ""))} · 미결 ${((p.unresolved as string[]) ?? []).join(",")}`, state: "UNKNOWN" as const })),
        ...unreadable.filter((u) => u.carrier_ref === ref).map((u, i) => ({ key: `${ref}.cu.${i}`, label: "colour (unreadable)", state: asState(u.state) ?? "UNKNOWN" })),
      ];
      if (colours.length) {
        ids.add("SVP-005");
        ids.add("SVP-006");
      }
      return {
        key: `app.${ref}`,
        label: refLabel(ref),
        children: [
          { key: `${ref}.colours`, label: "색 영역 · 역할", id: "SVP-005 · 006", axes: ["EI"], children: colours },
          ...factsOf(ref).filter((f) => FACT_META[String(f.fact)]?.group === "appearance").map((f) => factNode(ref, f)),
        ],
      };
    }),
  };

  // ③ 의복 구조 — 의복만, 영역별
  const structure: FeatureNode = {
    key: "structure",
    label: "③ 의복 구조",
    note: "G3 · component_fact_pool · 의복만",
    children: registry
      .filter((c) => GARMENTS.has(String((c.object_identity as Cell)?.value)))
      .map((c) => {
        const ref = String(c.component_ref);
        const facts = factsOf(ref);
        const groups = STRUCTURE_GROUPS.map((g) => {
          const kids = facts.filter((f) => FACT_META[String(f.fact)]?.group === g.key).map((f) => factNode(ref, f));
          if (g.key === "front" && c.front_state) {
            ids.add("SVP-004");
            kids.push(cell(`${ref}.front_state`, "as_worn_front_state", c.front_state as Cell, { id: "SVP-004", axes: ["TC"] }));
          }
          return { key: `${ref}.${g.key}`, label: g.label, note: g.note, children: kids };
        }).filter((g) => g.children.length);
        return { key: `str.${ref}`, label: refLabel(ref), children: groups };
      }),
  };

  // ④ 착용 관계
  const governing = ((upper.source_refs as string[] | undefined) ?? []).map(refLabel).join(", ");
  const upperNode: FeatureNode = {
    key: "upper",
    label: "지배 상의",
    id: "SVP-007–009",
    axes: ["SR"],
    note: governing ? `governing = ${governing}` : "governing 없음",
    children: [
      cell("upper.relation", "relation", upper.relation as Cell, { id: "SVP-007" }),
      cell("upper.shoulder", "shoulder", upper.shoulder as Cell, { id: "SVP-008" }),
      cell("upper.shape", "shape", upper.shape_behaviour as Cell, { id: "SVP-009" }),
    ],
  };
  if (upper.relation || upper.shoulder || upper.shape_behaviour) ["SVP-007", "SVP-008", "SVP-009"].forEach((x) => ids.add(x));
  const layers = (relations.layer_relations as Obj[] | undefined) ?? [];
  const securing = (relations.securing_relations as Obj[] | undefined) ?? [];
  const events = (exposure.events as Obj[] | undefined) ?? [];
  const hidden = (exposure.hidden as Obj[] | undefined) ?? [];
  if (layers.length) ids.add("SVP-010");
  if (securing.length) ids.add("SVP-011");
  if (events.length || hidden.length) ids.add("SVP-012");
  const worn: FeatureNode = {
    key: "worn",
    label: "④ 착용 관계",
    note: "G4 · upper_realization · relations · canonical_exposure",
    children: [
      upperNode,
      {
        key: "layers",
        label: "layer_relations",
        id: "SVP-010",
        axes: ["TC"],
        note: layers.length ? undefined : "없음",
        children: layers.map((l, i) =>
          cell(`layer.${i}`, `${refLabel(String(l.over_ref))} over ${refLabel(String(l.under_ref))}`, { state: String(l.state), value: l.revealed }, { note: "revealed" })
        ),
      },
      {
        key: "securing",
        label: "securing_relations",
        id: "SVP-011",
        axes: ["SR"],
        note: securing.length ? undefined : "없음",
        children: securing.map((s, i) => ({
          key: `sec.${i}`,
          label: s.device_is_own ? `${refLabel(String(s.affected_ref))} 자기 벨트 · ${s.affected_region}` : `${refLabel(String(s.securing_ref))} → ${refLabel(String(s.affected_ref))} · ${s.affected_region}`,
          state: asState((s.visible_constriction as Cell)?.state),
          note: "visible_constriction",
        })),
      },
      {
        key: "exposure",
        label: "canonical_exposure",
        id: "SVP-012",
        axes: ["EI"],
        note: events.length || hidden.length ? undefined : "노출 없음",
        children: [
          ...events.map((e, i) => ({
            key: `exp.${i}`,
            label: String(e.region),
            state: asState(e.state) ?? "OBSERVED",
            value: [((e.carrier_refs as string[]) ?? []).map(refLabel).join(", "), show((e.attribution as Cell)?.value)].filter(Boolean).join(" · "),
          })),
          ...hidden.map((h, i) => ({ key: `exph.${i}`, label: String(h.region ?? "hidden"), state: "NOT_VISIBLE" as const, value: show(h) })),
        ],
      },
    ],
  };

  // ⑤ 디테일 시스템
  const systems = (dm.look_detail_systems as Obj[] | undefined) ?? [];
  const visibility = dm.dm_evidence_visibility as Cell;
  if (systems.length) ids.add("DMP-2");
  if (dm.look_components) ids.add("DMP-1");
  if (visibility) ids.add("DMP-3");
  const detail: FeatureNode = {
    key: "detail",
    label: "⑤ 디테일 시스템",
    note: "§9 · dm_evidence",
    axes: ["DM"],
    children: [
      {
        key: "dm.systems",
        label: `look_detail_systems (${systems.length})`,
        id: "DMP-2",
        note: systems.length ? undefined : "관찰한 시스템 없음 (디테일이 없다는 뜻은 아님)",
        children: systems.map((s, i) => ({
          key: `dm.${i}`,
          label: `${s.look_detail_family} ${DM_FAMILY[String(s.look_detail_family)] ?? ""} · ${((s.carrier_refs as string[]) ?? []).map(refLabel).join(", ")}`,
          children: [
            ...(s.relational_form ? [{ key: `dm.${i}.form`, label: "relational_form", value: String(s.relational_form), state: "OBSERVED" as const }] : []),
            cell(`dm.${i}.size`, "size_in_look", s.size_in_look as Cell),
            cell(`dm.${i}.contrast`, "contrast_in_look", s.contrast_in_look as Cell),
            cell(`dm.${i}.position`, "position_in_look", s.position_in_look as Cell),
            { key: `dm.${i}.rep`, label: "repeated_units", value: String(s.repeated_units ?? "?"), state: "OBSERVED" as const },
          ],
        })),
      },
      { key: "dm.components", label: "look_components", id: "DMP-1", note: "코드가 조립", value: ((dm.look_components as Obj[] | undefined) ?? []).map((x) => String(x.component_ref)).join(" · ") },
      cell("dm.visibility", "dm_evidence_visibility", visibility, { id: "DMP-3", note: "코드가 frame.limits 에서" }),
    ],
  };

  const nodes = [look, components, appearance, structure, worn, detail];
  const walk = (n: FeatureNode) => {
    if (n.state) counts[n.state] += 1;
    n.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return { nodes, counts, ids: [...ids].sort() };
}
