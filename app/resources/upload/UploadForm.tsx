"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_UPLOAD_MB, RESOURCE_CATEGORIES } from "@/lib/constants";

export default function UploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fileName, setFileName] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setErr("先选一个文件");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setErr(`文件超过 ${MAX_UPLOAD_MB}MB`);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/resources", { method: "POST", body: fd });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `上传失败（${res.status}）`);
      form.reset();
      setFileName("");
      router.push("/resources");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-black/20 dark:border-white/[0.12] dark:bg-zinc-900";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-[12px] font-medium">文件（≤{MAX_UPLOAD_MB}MB）</label>
        <input
          type="file"
          name="file"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="mt-1 block w-full text-[12.5px] text-[var(--muted)] file:mr-3 file:rounded-full file:border-0 file:bg-black/[0.06] file:px-3 file:py-2 file:text-[12.5px] file:text-[var(--foreground)] dark:file:bg-white/[0.1]"
        />
        {fileName && <p className="mt-1 text-[11px] text-[var(--muted)]">已选：{fileName}</p>}
      </div>

      <div>
        <label className="text-[12px] font-medium">标题（不填则用文件名）</label>
        <input name="title" placeholder="如：君悦湾智能照明方案" className={inputCls} />
      </div>

      <div>
        <label className="text-[12px] font-medium">分类</label>
        <select name="category" defaultValue="其他" className={inputCls}>
          {RESOURCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[12px] font-medium">说明（可选）</label>
        <textarea name="description" rows={3} placeholder="一句话说明这份资料是给谁用的" className={inputCls} />
      </div>

      {err && <p className="text-[12.5px] text-red-600 dark:text-red-400">{err}</p>}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--foreground)] px-4 text-[14px] font-medium text-[var(--background)] disabled:opacity-60"
      >
        {busy ? "上传中…" : "上传"}
      </button>
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
        提示：报价单这类含客户名与价格的文件只用于内部资料库，保存在仓库外的 data/resources/，
        不会进 git、也不会出现在公网演示站上。
      </p>
    </form>
  );
}
