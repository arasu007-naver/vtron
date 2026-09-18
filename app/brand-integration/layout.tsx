import type { Metadata } from "next";
import "../api-playground/playground.css";

export const metadata: Metadata = {
  title: "브랜드 내재화 — VTON",
  description:
    "브랜드 → 최상위 카테고리 → 최하위 카테고리 → 상품 계층을 네이버 카탈로그에서 확정해 우리 DB 에 넣는 화면.",
};

export default function BrandIntegrationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="pg-app select-text h-full">{children}</div>;
}
