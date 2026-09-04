import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased select-none">{children}</body>
    </html>
  );
}
