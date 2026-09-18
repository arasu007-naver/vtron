import type { Metadata } from "next";
import "../api-playground/playground.css";

export const metadata: Metadata = {
  title: "상품 — VTON",
  description:
    "stmx-web 상품 마스터(products)를 브랜드 · 카테고리 · 제품명 · 품번으로 찾아보고 고치는 화면.",
};

export default function ProductsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="pg-app select-text h-full">{children}</div>;
}
