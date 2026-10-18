import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Web App · Day 1",
  description: "180 天 AI 转型计划 · 项目一",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
