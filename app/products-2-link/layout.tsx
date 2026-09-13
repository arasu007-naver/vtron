import type { Metadata } from "next";
import "../api-playground/playground.css";

export const metadata: Metadata = {
  title: "상품링크 — VTON",
  description:
    "stmx-web Loox 목록에서 게시물을 고르고, 옷 브랜드 × 분류의 네이버 카탈로그 상품을 찾아 붙이는 화면.",
};

export default function ProductsToLinkLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="pg-app select-text h-full">{children}</div>;
}
