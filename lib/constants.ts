// 纯常量模块：不依赖 node:sqlite，客户端组件也可以安全 import
export const SPACE_TYPES = ["住宅", "办公", "教育", "商业", "工业", "景观", "道路", "医疗"] as const;
export type SpaceType = (typeof SPACE_TYPES)[number];

export const SPACE_EMOJI: Record<string, string> = {
  住宅: "🏠",
  办公: "🏢",
  教育: "🏫",
  商业: "🛍️",
  工业: "🏭",
  景观: "🌳",
  道路: "🛣️",
  医疗: "🏥",
};

/** 每个场所类型的封面渐变（D6 换成真实照片前的占位，也用于无图案例） */
export const SPACE_GRADIENT: Record<string, string> = {
  住宅: "from-rose-100 via-orange-50 to-amber-100 dark:from-rose-950 dark:via-zinc-900 dark:to-amber-950",
  办公: "from-sky-100 via-blue-50 to-indigo-100 dark:from-sky-950 dark:via-zinc-900 dark:to-indigo-950",
  教育: "from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-950 dark:via-zinc-900 dark:to-cyan-950",
  商业: "from-fuchsia-100 via-pink-50 to-rose-100 dark:from-fuchsia-950 dark:via-zinc-900 dark:to-rose-950",
  工业: "from-slate-200 via-zinc-100 to-stone-200 dark:from-slate-800 dark:via-zinc-900 dark:to-stone-800",
  景观: "from-lime-100 via-green-50 to-emerald-100 dark:from-lime-950 dark:via-zinc-900 dark:to-emerald-950",
  道路: "from-amber-100 via-yellow-50 to-orange-100 dark:from-amber-950 dark:via-zinc-900 dark:to-orange-950",
  医疗: "from-cyan-100 via-sky-50 to-blue-100 dark:from-cyan-950 dark:via-zinc-900 dark:to-blue-950",
};

export const CASE_STATUSES = ["待校对", "已确认"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_VISIBILITIES = ["private", "internal", "public"] as const;
export type CaseVisibility = (typeof CASE_VISIBILITIES)[number];

export const VISIBILITY_LABEL: Record<CaseVisibility, string> = {
  private: "私有（仅自己）",
  internal: "内部（同事可见）",
  public: "公开（可用于演示）",
};
