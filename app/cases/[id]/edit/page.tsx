import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCase } from "@/lib/cases";
import CaseForm from "../../CaseForm";

export const dynamic = "force-dynamic";

export default async function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.DEMO_MODE === "1") redirect("/cases");

  const { id } = await params;
  const item = getCase(Number(id));
  if (!item) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">编辑案例 #{item.id}</h1>
        <Link href={`/cases/${item.id}`} className="text-sm text-zinc-500 underline underline-offset-4">
          ← 返回详情
        </Link>
      </div>
      <CaseForm mode="edit" initial={item} />
    </main>
  );
}
