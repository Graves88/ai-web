import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "照明落地案例库",
  description: "把散落在聊天记录/PPT/Excel 里的照明案例，变成可搜索、结构化、能被 AI 解读的资产",
};

// 移动端适配：明确 viewport，避免手机上被当成 980px 宽缩放
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// 关键兜底样式：即使外部 CSS 因浏览器兼容问题整份失效，页面也不至于变成"裸 HTML"
// （Tailwind v4 依赖 @layer / color-mix / @property，旧内核浏览器可能全部丢弃）
const CRITICAL_CSS = `
@supports not (color: color-mix(in srgb, red 50%, white)) {
  :root{color-scheme:light dark}
  html,body{margin:0;padding:0}
  body{background:#f7f5f2;color:#1c1917;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;-webkit-text-size-adjust:100%}
  @media (prefers-color-scheme:dark){body{background:#0b0b0c;color:#ededed}}
  a{color:inherit;text-decoration:none}
  img,video{max-width:100%;height:auto}
  main{max-width:1024px;margin:0 auto;padding:12px 16px 32px}
  h1{font-size:19px;line-height:1.35;font-weight:600;margin:0}
  h2{font-size:14px;margin:0}
  p{margin:4px 0}
}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
        {children}
      </body>
    </html>
  );
}
