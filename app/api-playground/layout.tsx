import type { Metadata } from "next";
import "./playground.css";

export const metadata: Metadata = {
  title: "API 플레이그라운드 — VTON",
  description:
    "네이버 쇼핑(커머스) API 를 비롯한 RESTful API 를 호출하고 응답을 확인하는 콘솔.",
};

export default function PlaygroundLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="pg-app select-text">{children}</div>;
}
