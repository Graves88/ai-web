// 纯计算模块：不依赖数据库/框架，服务端、客户端、脚本都能安全引用
export type Fixture = {
  type: string;
  model?: string;
  watt: number;
  lumen?: number;
  cct?: number;
  cri?: number;
  qty: number;
  layout?: string;
};

/**
 * 计算字段：总功率与功率密度（W/㎡）。
 * 这是本项目的第一原则的代码化——**算数交给代码，绝不交给模型**。
 */
export function calcTotals(fixtures: Fixture[], areaM2: number | null) {
  const totalW = fixtures.reduce((sum, f) => sum + (Number(f.watt) || 0) * (Number(f.qty) || 0), 0);
  const lpd = areaM2 && areaM2 > 0 ? totalW / areaM2 : null;
  return {
    total_w: Math.round(totalW * 10) / 10,
    lpd: lpd === null ? null : Math.round(lpd * 100) / 100,
  };
}
