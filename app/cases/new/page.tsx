import Link from "next/link";
import CaseForm from "../CaseForm";

export default function NewCasePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">新建案例</h1>
        <Link href="/cases" className="text-sm text-zinc-500 underline underline-offset-4">
          ← 返回列表
        </Link>
      </div>
      <CaseForm />
    </main>
  );
}
