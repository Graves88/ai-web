"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCaseButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    // 内部工具用原生 confirm 足够；公网 demo 模式下服务端也会拦（403）
    if (!window.confirm(`确定删除「${title}」吗？此操作不可恢复。`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `删除失败（HTTP ${res.status}）`);
        return;
      }
      router.push("/cases");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={() => void onClick()}
        disabled={busy}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        {busy ? "删除中…" : "删除案例"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
