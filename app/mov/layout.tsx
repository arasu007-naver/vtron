import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portrait Studio — 배경 애니메이션 + 캐릭터 등장 영상",
  description:
    "CSS/Canvas 배경 애니메이션 위에 배경이 제거된 캐릭터를 등장시켜 세로 영상(webm)을 만드는 스튜디오.",
};

export default function MovLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
