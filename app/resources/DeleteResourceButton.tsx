"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteResourceButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onDelete() {
    if (!confirm(`确定删除「${title}」？文件会一起删掉。`)) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/resources/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `删除失败（${res.status}）`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="inline-flex min-h-9 items-center rounded-full border border-black/[0.08] px-3 text-[12.5px] text-[var(--muted)] disabled:opacity-50 dark:border-white/[0.12]"
      >
        {busy ? "删除中…" : "删除"}
      </button>
      {err && <span className="text-[11px] text-red-600 dark:text-red-400">{err}</span>}
    </span>
  );
}
