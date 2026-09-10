import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "VTON Studio — Virtual Try-On Platform",
  description: "배경 + 실사 캐릭터 + 다중 가먼트(Garments)를 결합한 AI 가상 피팅 스튜디오",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap"
        />
      </head>
      {/*
        전역 내비게이션 + 본문. 뷰포트 높이를 NavBar 와 본문이 나눠 갖는다.
        그래서 각 페이지 루트는 `h-screen` 이 아니라 `h-full` 을 쓴다 — 100vh 를
        그대로 쓰면 NavBar 높이만큼 넘쳐 바깥 스크롤바가 생긴다.
        `/login` 에서는 NavBar 가 null 이라 본문이 전체 높이를 차지한다.
      */}
      <body className="antialiased select-none">
        <div className="h-screen flex flex-col">
          <NavBar />
          <div className="flex-1 min-h-0 overflow-auto vt-scroll">{children}</div>
        </div>
      </body>
    </html>
  );
}
