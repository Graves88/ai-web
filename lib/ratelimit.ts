/**
 * 轻量限流（内存版）
 * 目的：防止公网问答被脚本刷 token，不是严格的安全措施。
 * 注意：Vercel serverless 每个实例内存独立，所以实际额度会按实例放大；
 *      真要严格限制需要 Redis / Upstash（后续需要再加）。
 */
const WINDOW_MS = 60 * 60 * 1000; // 1 小时
const PER_IP_LIMIT = Number(process.env.ASK_RATE_PER_IP ?? 10); // 每 IP 每小时次数
const DAILY_LIMIT = Number(process.env.ASK_RATE_DAILY ?? 300); // 全站每日总次数

type Bucket = { count: number; resetAt: number };

const globalForRate = globalThis as unknown as {
  __askRate?: { ips: Map<string, Bucket>; day: string; dayCount: number };
  __askCounters?: Map<string, { day: string; count: number }>;
};

function store() {
  if (!globalForRate.__askRate) {
    globalForRate.__askRate = { ips: new Map(), day: "", dayCount: 0 };
  }
  return globalForRate.__askRate;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type RateResult = { ok: true } | { ok: false; reason: string; retryAfterSec: number };

export function checkRate(ip: string): RateResult {
  const s = store();
  const now = Date.now();

  // 每日总量（按进程计数，演示用途）
  const day = today();
  if (s.day !== day) {
    s.day = day;
    s.dayCount = 0;
    s.ips.clear();
  }
  if (s.dayCount >= DAILY_LIMIT) {
    return { ok: false, reason: "今日问答额度已用完，请明天再试", retryAfterSec: 3600 };
  }

  const bucket = s.ips.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    s.ips.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    s.dayCount++;
    return { ok: true };
  }
  if (bucket.count >= PER_IP_LIMIT) {
    return {
      ok: false,
      reason: `每小时的问答次数已用完（${PER_IP_LIMIT} 次/小时）`,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count++;
  s.dayCount++;
  return { ok: true };
}

export const rateInfo = { perIp: PER_IP_LIMIT, daily: DAILY_LIMIT };
