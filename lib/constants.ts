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

export const CASE_STATUSES = ["待校对", "已确认"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_VISIBILITIES = ["private", "internal", "public"] as const;
export type CaseVisibility = (typeof CASE_VISIBILITIES)[number];

export const VISIBILITY_LABEL: Record<CaseVisibility, string> = {
  private: "私有（仅自己）",
  internal: "内部（同事可见）",
  public: "公开（可用于演示）",
};
