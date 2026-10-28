/**
 * 전역 링크.
 *   NAV_LINKS    — 채팅 도우미(`ChatAgent`)와 채팅 API(`/api/agent`)가 쓰는 전체 페이지 목록 · 레이블
 *   NAVBAR_LINKS — 상단 `NavBar` 에 보이는 것만 (NAV_LINKS 에서 고르고 레이블 · 활성 경로를 덧씌운다)
 * 인덱스(/)는 Full-Look Style ID 추출 페이지이고, 로고가 그리로 간다. VTON 스튜디오는 /studio 다.
 */

import {
  Database,
  FileText,
  Film,
  LayoutDashboard,
  Link2,
  ScanSearch,
  ScanEye,
  Layers,
  PackageSearch,
  ShoppingBag,
  Shirt,
  TerminalSquare,
  UserCheck,
  Users,
  Building2,
  KeySquare,
  PlayCircle,
} from "lucide-react";

export const NAV_LINKS = [
  {
    href: "/studio",
    label: "스튜디오",
    icon: LayoutDashboard,
    title: "배경 + 캐릭터 + 가먼트 조합 가상 피팅",
  },
  {
    href: "/tryon",
    label: "FASHN Try-On",
    icon: Shirt,
    title: "FASHN 단일 가먼트 try-on 데모",
  },
  {
    href: "/mov",
    label: "Portrait Studio",
    icon: Film,
    title: "배경 애니메이션 + 캐릭터 등장 영상",
  },
  {
    href: "/style-ex",
    label: "Style ID",
    icon: ScanSearch,
    title: "이미지 속 의복을 Vision 모델로 관찰해 37개 파라미터를 추출",
  },
  {
    href: "/full-style-id-extraction",
    label: "Full-Look Style ID",
    icon: Layers,
    title: "착장 전체 이미지를 Full-Look Vision Extractor 로 관찰하고 Full-Look Scoring Engine(EI · TC · SR)으로 스타일 아이디를 판정",
  },
  {
    href: "/product-style",
    label: "상품 Style ID",
    icon: ScanEye,
    title: "상품 사진으로 추출해 저장한 Style ID(product_style)를 12개씩 쪽으로 넘겨 본다",
  },
  {
    href: "/product-details",
    label: "상품 상세",
    icon: PackageSearch,
    title: "161개 브랜드의 상품을 네이버 카탈로그에서 고르면 그 브랜드 공식 사이트(brands.api)에서 같은 상품을 찾아 보여 준다",
  },
  {
    href: "/api-playground",
    label: "API 플레이그라운드",
    icon: TerminalSquare,
    title: "네이버 커머스 등 REST API 호출 테스트",
  },
  {
    href: "/products-2-link",
    label: "상품링크",
    icon: Link2,
    title: "Loox 목록에서 게시물을 고르고 옷 브랜드 × 분류의 카탈로그 상품을 붙인다",
  },
  {
    href: "/products",
    label: "상품",
    icon: ShoppingBag,
    title: "stmx-web 상품 마스터를 브랜드 · 카테고리 · 제품명 · 품번으로 찾아보고 고친다",
  },
  {
    href: "/brand-integration",
    label: "브랜드 내재화",
    icon: Database,
    title: "브랜드 → 최상위 카테고리 → 최하위 카테고리 → 상품 계층을 우리 DB 에 넣는다",
  },
  {
    href: "/contracts",
    label: "계약/신청",
    icon: FileText,
    title: "STMX↔크리에이터 · STMX↔브랜드 · 크리에이터↔브랜드 직접 연결 신청서",
  },
  {
    href: "/creator-req",
    label: "Creator 요청",
    icon: UserCheck,
    title: "Creator 역할 신청(user_biz_request) 및 선호 브랜드 목록 조회",
  },
  {
    href: "/admin/creators",
    label: "크리에이터",
    icon: Users,
    title: "크리에이터 계약 신청 관리 (STMX↔크리에이터 · 직접 연결)",
  },
  {
    href: "/admin/brands",
    label: "브랜드 관리",
    icon: Building2,
    title: "브랜드 ShopMy 제휴 메타 · 수수료율 · 스타일 코드 관리",
  },
  {
    href: "/admin/api-mng",
    label: "API 키 관리",
    icon: KeySquare,
    title: "사업자등록증으로 외부 업체를 확인하고 STMX API 키를 발급 · 재발급 · 폐기한다",
  },
  {
    href: "/api-demo",
    label: "API 데모",
    icon: PlayCircle,
    title: "발급한 API 키로 외부 API(Style ID)를 직접 불러 보고 axios 예제 코드를 본다",
  },
] as const;

export type NavHref = (typeof NAV_LINKS)[number]["href"];

type NavLink = (typeof NAV_LINKS)[number];

/** 상단 NavBar 에 둘 링크 — 순서대로. label 을 주면 NavBar 에서만 그 이름을 쓰고, match 의 경로에서도 켜진다. */
const NAVBAR: { href: NavHref; label?: string; match?: string[] }[] = [
  { href: "/style-ex", label: "Item Style ID" },
  { href: "/product-style" },
  { href: "/contracts" },
  // 크리에이터 계약 관리(/admin/creators)는 Creator 요청에 합쳤다 — 두 페이지 위의 CreatorTabs 로 오간다
  { href: "/creator-req", match: ["/admin/creators"] },
  { href: "/admin/brands" },
  { href: "/admin/api-mng" },
];

export interface NavBarLink {
  href: NavHref;
  label: string;
  icon: NavLink["icon"];
  title: string;
  /** 이 링크를 켜는 경로들 (href 포함) */
  match: string[];
}

export const NAVBAR_LINKS: NavBarLink[] = NAVBAR.map(({ href, label, match }) => {
  const link = NAV_LINKS.find((l) => l.href === href)!;
  return { ...link, label: label ?? link.label, match: [href, ...(match ?? [])] };
});
