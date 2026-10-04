import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style ID — 스타일 아이디 추출",
  description: "이미지 속 의복을 Vision 모델로 관찰해 37개 파라미터를 추출한다.",
};

export default function StyleExLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
