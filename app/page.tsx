import { redirect } from "next/navigation";
import ChatDemo from "./ChatDemo";

// 演示模式（公网只读版）下，首页直接导到案例库，避免访问需要密钥的对话页
export const dynamic = "force-dynamic";

export default function Home() {
  if (process.env.DEMO_MODE === "1") redirect("/cases");
  return <ChatDemo />;
}
