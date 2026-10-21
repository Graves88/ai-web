"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CASE_STATUSES,
  CASE_VISIBILITIES,
  SPACE_TYPES,
  VISIBILITY_LABEL,
  type CaseStatus,
  type CaseVisibility,
  type SpaceType,
} from "@/lib/constants";

type FixtureRow = {
  type: string;
  model: string;
  watt: string;
  lumen: string;
  cct: string;
  cri: string;
  qty: string;
  layout: string;
};

/** 编辑模式传入的初值结构（与 CaseItem 结构兼容，只取表单需要的字段） */
export type CaseFormInitial = {
  id: number;
  title: string;
  space_type: string;
  year: number | null;
  region: string | null;
  area_m2: number | null;
  floor_height_m: number | null;
  target_lux: number | null;
  fixtures: Array<{
    type: string;
    model?: string;
    watt: number;
    lumen?: number;
    cct?: number;
    cri?: number;
    qty: number;
    layout?: string;
  }>;
  budget_range: string | null;
  design_points: string[];
  highlights: string[];
  reuse_points: string[];
  raw_text: string | null;
  status: string;
  visibility: string;
  tags: string[];
};

const emptyFixture = (): FixtureRow => ({
  type: "LED筒灯",
  model: "",
  watt: "",
  lumen: "",
  cct: "",
  cri: "",
  qty: "",
  layout: "",
});

type FormState = {
  title: string;
  space_type: SpaceType;
  year: string;
  region: string;
  area_m2: string;
  floor_height_m: string;
  target_lux: string;
  budget_range: string;
  tags: string;
  design_points: string;
  highlights: string;
  reuse_points: string;
  raw_text: string;
  status: CaseStatus;
  visibility: CaseVisibility;
};

const initialForm: FormState = {
  title: "",
  space_type: "住宅",
  year: String(new Date().getFullYear()),
  region: "",
  area_m2: "",
  floor_height_m: "",
  target_lux: "",
  budget_range: "",
  tags: "",
  design_points: "",
  highlights: "",
  reuse_points: "",
  raw_text: "",
  status: "待校对",
  visibility: "private",
};

function str(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}

function num(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function lines(v: string): string[] {
  return v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs text-zinc-500">{children}</label>;
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";

export default function CaseForm({
  mode = "create",
  initial,
}: {
  mode?: "create" | "edit";
  initial?: CaseFormInitial;
}) {
  const router = useRouter();
  const isEdit = mode === "edit" && !!initial;

  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          title: initial.title,
          space_type: initial.space_type as SpaceType,
          year: str(initial.year),
          region: initial.region ?? "",
          area_m2: str(initial.area_m2),
          floor_height_m: str(initial.floor_height_m),
          target_lux: str(initial.target_lux),
          budget_range: initial.budget_range ?? "",
          tags: initial.tags.join(", "),
          design_points: initial.design_points.join("\n"),
          highlights: initial.highlights.join("\n"),
          reuse_points: initial.reuse_points.join("\n"),
          raw_text: initial.raw_text ?? "",
          status: initial.status as CaseStatus,
          visibility: initial.visibility as CaseVisibility,
        }
      : initialForm,
  );

  const [fixtures, setFixtures] = useState<FixtureRow[]>(() =>
    initial && initial.fixtures.length > 0
      ? initial.fixtures.map((f) => ({
          type: f.type,
          model: f.model ?? "",
          watt: str(f.watt),
          lumen: str(f.lumen),
          cct: str(f.cct),
          cri: str(f.cri),
          qty: str(f.qty),
          layout: f.layout ?? "",
        }))
      : [emptyFixture()],
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateFixture(i: number, key: keyof FixtureRow, value: string) {
    setFixtures((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  const totals = useMemo(() => {
    const valid = fixtures.filter((f) => num(f.watt) !== undefined && num(f.qty) !== undefined);
    const totalW = valid.reduce((s, f) => s + (num(f.watt) ?? 0) * (num(f.qty) ?? 0), 0);
    const area = num(form.area_m2);
    const lpd = area && area > 0 ? totalW / area : null;
    return {
      count: valid.reduce((s, f) => s + (num(f.qty) ?? 0), 0),
      totalW: Math.round(totalW * 10) / 10,
      lpd: lpd === null ? null : Math.round(lpd * 100) / 100,
    };
  }, [fixtures, form.area_m2]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIssues([]);
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        space_type: form.space_type,
        year: num(form.year),
        region: form.region.trim() || null,
        area_m2: num(form.area_m2),
        floor_height_m: num(form.floor_height_m),
        target_lux: num(form.target_lux),
        budget_range: form.budget_range.trim() || null,
        design_points: lines(form.design_points),
        highlights: lines(form.highlights),
        reuse_points: lines(form.reuse_points),
        raw_text: form.raw_text.trim() || null,
        status: form.status,
        visibility: form.visibility,
        tags: form.tags
          .split(/[,，\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        fixtures: fixtures
          .filter((f) => f.type.trim() && num(f.qty))
          .map((f) => ({
            type: f.type.trim(),
            model: f.model.trim() || undefined,
            watt: num(f.watt) ?? 0,
            lumen: num(f.lumen),
            cct: num(f.cct),
            cri: num(f.cri),
            qty: num(f.qty) ?? 0,
            layout: f.layout.trim() || undefined,
          })),
      };

      const url = isEdit ? `/api/cases/${initial!.id}` : "/api/cases";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `提交失败（HTTP ${res.status}）`);
        setIssues(Array.isArray(data.issues) ? data.issues : []);
        return;
      }
      router.push(`/cases/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold">基本信息</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>标题 *</Label>
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="某住宅小区公共区域智能照明" />
          </div>
          <div>
            <Label>场所类型 *</Label>
            <select className={inputCls} value={form.space_type} onChange={(e) => set("space_type", e.target.value as SpaceType)}>
              {SPACE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>年份</Label>
            <input className={inputCls} value={form.year} onChange={(e) => set("year", e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label>地区（城市级即可）</Label>
            <input className={inputCls} value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="桂林" />
          </div>
          <div>
            <Label>面积（㎡）</Label>
            <input className={inputCls} value={form.area_m2} onChange={(e) => set("area_m2", e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <Label>层高（m）</Label>
            <input className={inputCls} value={form.floor_height_m} onChange={(e) => set("floor_height_m", e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <Label>目标照度（lx）</Label>
            <input className={inputCls} value={form.target_lux} onChange={(e) => set("target_lux", e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label>预算区间（不要填精确金额）</Label>
            <input className={inputCls} value={form.budget_range} onChange={(e) => set("budget_range", e.target.value)} placeholder="5-8 万" />
          </div>
          <div>
            <Label>标签（逗号分隔）</Label>
            <input className={inputCls} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="智能控制, 公区" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">灯具清单</h2>
          <button type="button" onClick={() => setFixtures((r) => [...r, emptyFixture()])} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            ＋ 加一行
          </button>
        </div>
        <div className="space-y-3">
          {fixtures.map((f, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>类型 *</Label>
                <input className={inputCls} value={f.type} onChange={(e) => updateFixture(i, "type", e.target.value)} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>型号</Label>
                <input className={inputCls} value={f.model} onChange={(e) => updateFixture(i, "model", e.target.value)} />
              </div>
              <div>
                <Label>功率 W *</Label>
                <input className={inputCls} value={f.watt} onChange={(e) => updateFixture(i, "watt", e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <Label>数量 *</Label>
                <input className={inputCls} value={f.qty} onChange={(e) => updateFixture(i, "qty", e.target.value)} inputMode="numeric" />
              </div>
              <div>
                <Label>光通量 lm</Label>
                <input className={inputCls} value={f.lumen} onChange={(e) => updateFixture(i, "lumen", e.target.value)} inputMode="numeric" />
              </div>
              <div>
                <Label>色温 K</Label>
                <input className={inputCls} value={f.cct} onChange={(e) => updateFixture(i, "cct", e.target.value)} inputMode="numeric" />
              </div>
              <div>
                <Label>显色指数 Ra</Label>
                <input className={inputCls} value={f.cri} onChange={(e) => updateFixture(i, "cri", e.target.value)} inputMode="numeric" />
              </div>
              <div className="col-span-2 sm:col-span-2">
                <Label>布置说明</Label>
                <input className={inputCls} value={f.layout} onChange={(e) => updateFixture(i, "layout", e.target.value)} placeholder="吊顶均布，间距 1.2m" />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setFixtures((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-500 hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          <span>灯具合计：<b>{totals.count}</b> 套</span>
          <span>总功率：<b>{totals.totalW}</b> W</span>
          <span>功率密度 LPD：<b>{totals.lpd ?? "—"}</b> W/㎡</span>
          <span className="text-zinc-400">（前端实时预览，最终以服务端计算为准）</span>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold">要点与原始资料</h2>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label>设计要点（一行一条）</Label>
            <textarea className={inputCls} rows={3} value={form.design_points} onChange={(e) => set("design_points", e.target.value)} />
          </div>
          <div>
            <Label>项目亮点（一行一条）</Label>
            <textarea className={inputCls} rows={2} value={form.highlights} onChange={(e) => set("highlights", e.target.value)} />
          </div>
          <div>
            <Label>可复用点（一行一条）</Label>
            <textarea className={inputCls} rows={2} value={form.reuse_points} onChange={(e) => set("reuse_points", e.target.value)} />
          </div>
          <div>
            <Label>原始资料（务必脱敏：无客户名、无精确报价）</Label>
            <textarea className={inputCls} rows={3} value={form.raw_text} onChange={(e) => set("raw_text", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>状态</Label>
              <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value as CaseStatus)}>
                {CASE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>可见性</Label>
              <select className={inputCls} value={form.visibility} onChange={(e) => set("visibility", e.target.value as CaseVisibility)}>
                {CASE_VISIBILITIES.map((v) => (
                  <option key={v} value={v}>
                    {VISIBILITY_LABEL[v]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <p>{error}</p>
          {issues.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {issues.map((i) => (
                <li key={i.path + i.message}>
                  {i.path}：{i.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting} className="rounded-lg bg-zinc-900 px-5 py-2 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-black">
          {submitting ? "保存中…" : isEdit ? "保存修改" : "保存案例"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
          取消
        </button>
        {isEdit && <span className="text-xs text-zinc-400">正在编辑 #{initial!.id}</span>}
      </div>
    </form>
  );
}
