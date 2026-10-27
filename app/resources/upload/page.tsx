import Link from "next/link";
import { redirect } from "next/navigation";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  if (process.env.DEMO_MODE === "1") redirect("/resources");

  return (
    <main className="min-h-dvh">
      <div className="sticky top-0 z-20 border-b border-black/[0.04] bg-[var(--background-soft)] backdrop-blur-xl dark:border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-[17px] font-semibold tracking-tight">上传资料</h1>
          <Link
            href="/resources"
            className="inline-flex min-h-9 items-center rounded-full bg-black/[0.05] px-3.5 text-[13px] font-medium dark:bg-white/[0.08]"
          >
            ← 返回
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4">
        <div className="card-surface p-4">
          <UploadForm />
        </div>
      </div>
    </main>
  );
}
