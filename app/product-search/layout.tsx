import type { Metadata } from "next";
import "../api-playground/playground.css";

export const metadata: Metadata = {
  title: "상품 검색 v2 — VTON",
  description:
    "브랜드 · 상품명(초성 포함) · 품번을 검색 칸 하나로 찾는 /api/product-search-v2 시험 화면.",
};

export default function ProductSearchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="pg-app select-text h-full">{children}</div>;
}
