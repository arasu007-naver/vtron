import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FASHN AI Virtual Try-On",
  description:
    "FASHN AI 가상 피팅 API 데모 — 모델 이미지와 가먼트 이미지를 업로드해 실제 착장 결과를 생성합니다.",
  keywords: [
    "FASHN AI",
    "virtual try-on",
    "가상 피팅",
    "fashion tech",
    "AI clothing",
    "next.js",
  ],
  openGraph: {
    title: "FASHN AI Virtual Try-On",
    description: "Try on clothing virtually with FASHN AI's advanced technology",
  },
};

export default function TryOnLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // 페이지가 콘텐츠 영역의 세로를 그대로 쓰려면 이 껍데기부터 높이를 넘겨줘야 한다.
    // 여기가 auto 면 아래의 h-full 이 전부 0 에 걸려 화면 아래가 텅 빈다.
    <div
      className={`fashn-app h-full min-h-0 ${geistSans.variable} ${geistMono.variable} select-text`}
    >
      {children}
    </div>
  );
}
