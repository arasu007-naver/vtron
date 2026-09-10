/**
 * 네이버 커머스 카테고리 목록(`GET /v1/categories`)을 계층 트리로 세우고
 * 패션 계열만 걸러낸다.
 *
 * 응답은 계층 정보를 중첩 구조가 아니라 `wholeCategoryName` 한 줄에 담아 준다.
 *
 *   { "wholeCategoryName": "패션의류>여성의류>니트>풀오버",
 *     "id": "50021299", "name": "풀오버", "last": true }
 *
 * 그래서 트리는 `>` 로 쪼개 만든다. `last=true` 로 부르면 리프만 오므로 중간
 * 노드에는 id 가 없다(`id: null`). 전체 단계를 받아오면 중간 노드에도 id 가 붙는다.
 *
 * 실측(2026-09): 리프 5,002개 · 최대 4단계 · 최상위 11개.
 */

export interface NaverCategory {
  id: string;
  name: string;
  wholeCategoryName: string;
  last?: boolean;
}

export interface CategoryNode {
  /** 루트부터의 전체 경로 — 트리에서 유일하다. */
  path: string;
  name: string;
  /** 이 경로에 대응하는 카테고리 id. 응답에 없던 중간 노드는 null. */
  id: string | null;
  depth: number;
  children: CategoryNode[];
  /** 이 노드 아래 리프 수(자기 자신이 리프면 1) */
  leafCount: number;
}

/** 패션 최상위 — 기본 필터 */
export const FASHION_ROOTS = ["패션의류", "패션잡화"];

/**
 * 다른 최상위 아래 있지만 패션으로 볼 만한 하위 트리.
 * 스포츠/레저는 장비가 대부분이라 통째로 넣지 않고 액세서리만 집는다.
 */
export const FASHION_EXTRA_PREFIXES = [
  "출산/육아>신생아의류",
  "출산/육아>유아동의류",
  "출산/육아>유아동언더웨어/잠옷",
  "출산/육아>유아동잡화",
  "출산/육아>유아동 주얼리",
  "출산/육아>임부복",
  "스포츠/레저>스포츠액세서리",
];

export type CategoryScope = "fashion" | "fashion-plus" | "all";

export const SCOPE_LABEL: Record<CategoryScope, string> = {
  fashion: "패션",
  "fashion-plus": "패션 + 유아·스포츠",
  all: "전체",
};

export const SCOPE_HINT: Record<CategoryScope, string> = {
  fashion: "패션의류 · 패션잡화",
  "fashion-plus": "+ 유아동 의류·잡화, 임부복, 스포츠액세서리",
  all: "필터 없이 응답 전체",
};

const SEPARATOR = ">";

/** 카테고리 목록 응답인지 — 파일을 올렸을 때 구조 뷰와 갈라내는 기준. */
export function isCategoryList(value: unknown): value is NaverCategory[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as NaverCategory).wholeCategoryName === "string"
    )
  );
}

const rootOf = (item: NaverCategory) =>
  item.wholeCategoryName.split(SEPARATOR)[0]?.trim() ?? "";

export function filterByScope(
  items: NaverCategory[],
  scope: CategoryScope
): NaverCategory[] {
  if (scope === "all") return items;

  return items.filter((item) => {
    if (FASHION_ROOTS.includes(rootOf(item))) return true;
    if (scope !== "fashion-plus") return false;
    return FASHION_EXTRA_PREFIXES.some(
      (prefix) =>
        item.wholeCategoryName === prefix ||
        item.wholeCategoryName.startsWith(`${prefix}${SEPARATOR}`)
    );
  });
}

/**
 * `wholeCategoryName` 들을 트리로 세운다.
 * 형제 순서는 응답에 나온 순서를 지킨다 — 네이버가 정렬해 둔 순서에 의미가 있다.
 */
export function buildTree(items: NaverCategory[]): CategoryNode[] {
  const roots: CategoryNode[] = [];
  const byPath = new Map<string, CategoryNode>();

  for (const item of items) {
    const parts = item.wholeCategoryName
      .split(SEPARATOR)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) continue;

    let path = "";
    let siblings = roots;

    parts.forEach((name, index) => {
      path = index === 0 ? name : `${path}${SEPARATOR}${name}`;
      let node = byPath.get(path);
      if (!node) {
        node = { path, name, id: null, depth: index, children: [], leafCount: 0 };
        byPath.set(path, node);
        siblings.push(node);
      }
      // 마지막 조각이 이 항목 자신이다 — 그 노드에만 id 를 심는다.
      if (index === parts.length - 1) node.id = item.id ?? null;
      siblings = node.children;
    });
  }

  countLeaves(roots);
  return roots;
}

function countLeaves(nodes: CategoryNode[]): number {
  let total = 0;
  for (const node of nodes) {
    node.leafCount =
      node.children.length === 0 ? 1 : countLeaves(node.children);
    total += node.leafCount;
  }
  return total;
}

/**
 * 검색 — 이름이나 경로가 걸리는 노드를 남기고 조상은 유지한다.
 * 걸린 노드의 자식은 통째로 남겨, 상위 카테고리를 검색했을 때 그 아래가 다 보이게 한다.
 */
export function filterTree(nodes: CategoryNode[], query: string): CategoryNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const visit = (node: CategoryNode): CategoryNode | null => {
    if (
      node.name.toLowerCase().includes(q) ||
      node.path.toLowerCase().includes(q) ||
      (node.id ?? "").includes(q)
    ) {
      return node;
    }
    const children = node.children
      .map(visit)
      .filter((child): child is CategoryNode => child !== null);
    if (children.length === 0) return null;
    // 걸러낸 조상은 사본이므로 건수도 남은 자식 기준으로 다시 센다.
    // 안 그러면 "니트" 를 찾았는데 패션의류에 88개라고 붙는다.
    return {
      ...node,
      children,
      leafCount: children.reduce((sum, child) => sum + child.leafCount, 0),
    };
  };

  return nodes.map(visit).filter((node): node is CategoryNode => node !== null);
}

export const countNodes = (nodes: CategoryNode[]): number =>
  nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0);

export const countLeafNodes = (nodes: CategoryNode[]): number =>
  nodes.reduce(
    (sum, node) =>
      sum + (node.children.length === 0 ? 1 : countLeafNodes(node.children)),
    0
  );
