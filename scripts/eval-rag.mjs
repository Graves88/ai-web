// RAG 问答评测：20 条真实问题 × /api/ask
// 指标：答案正确率 / 引用命中率 / 拒答正确率 / 平均首字延迟
// 用法：
//   node scripts/eval-rag.mjs                          # 打本地 http://127.0.0.1:3100
//   node scripts/eval-rag.mjs --base=https://www.chaole.top
//   node scripts/eval-rag.mjs --rescore                # 只对已有结果重新打分，不重新调用模型
import fs from "node:fs";

const baseArg = process.argv.find((a) => a.startsWith("--base="));
const BASE = baseArg ? baseArg.slice(7) : "http://127.0.0.1:3100";
const RESCORE = process.argv.includes("--rescore");

const questions = JSON.parse(fs.readFileSync("evals/rag-questions.json", "utf8"));

const REFUSAL_HINTS = ["未提及", "没有找到", "未找到", "资料中未", "没有相关", "无法回答", "不包含", "没有提"];

/** 只有"第一句就是拒答"才算真拒答；允许"先答已给出的部分，再补一句其余未提及" */
function isRefusalAnswer(answer) {
  const firstSentence = (answer ?? "").split("\n")[0].split("。")[0];
  return REFUSAL_HINTS.some((h) => firstSentence.includes(h));
}

function judge(q, answer, sources) {
  const isRefusalCase = !!q.expectRefusal;
  let correct;
  if (isRefusalCase) {
    correct = isRefusalAnswer(answer) || (/没有|未提及|无法/.test(answer) && answer.length < 260);
  } else {
    const hits = (q.expectAny ?? []).filter((k) => (answer ?? "").includes(k));
    correct = hits.length > 0 && !isRefusalAnswer(answer);
  }
  let citationHit = null;
  if (!isRefusalCase && q.expectDoc) {
    const docs = sources.map((s) => s.doc ?? "");
    const docHit = docs.some((d) => d.includes(q.expectDoc));
    const pageHit = q.expectPage
      ? sources.some((s) => (s.doc ?? "").includes(q.expectDoc) && s.page === q.expectPage)
      : true;
    citationHit = docHit && pageHit;
  }
  return { correct, citationHit };
}

function writeReport(results, base, rescored = false) {
  const answered = results.filter((r) => !r.error);
  const nonRefusal = answered.filter((r) => r.category !== "拒答");
  const refusals = answered.filter((r) => r.category === "拒答");
  const acc = answered.length ? answered.filter((r) => r.correct).length / answered.length : 0;
  const citeBase = nonRefusal.filter((r) => r.citationHit !== null);
  const citeRate = citeBase.length ? citeBase.filter((r) => r.citationHit).length / citeBase.length : 0;
  const refusalRate = refusals.length ? refusals.filter((r) => r.correct).length / refusals.length : 0;
  const avgTtft = answered.length ? Math.round(answered.reduce((s, r) => s + r.ttft, 0) / answered.length) : 0;
  const avgTotal = answered.length ? Math.round(answered.reduce((s, r) => s + r.total, 0) / answered.length) : 0;

  const summary = {
    total: questions.length,
    answered: answered.length,
    accuracy: acc,
    citationRate: citeRate,
    refusalRate,
    avgTtft,
    avgTotal,
    base,
    rescored,
    generatedAt: new Date().toISOString(),
  };

  console.log("\n=== 汇总 ===");
  console.log(`答案正确率   ${(acc * 100).toFixed(1)}%  (${answered.filter((r) => r.correct).length}/${answered.length})`);
  console.log(`引用命中率   ${(citeRate * 100).toFixed(1)}%`);
  console.log(`拒答正确率   ${(refusalRate * 100).toFixed(1)}%  (${refusals.filter((r) => r.correct).length}/${refusals.length})`);
  console.log(`平均首字     ${avgTtft}ms   平均总耗时 ${avgTotal}ms`);

  const failed = results.filter((r) => !r.correct);
  console.log(`\n失败 ${failed.length} 条：`);
  for (const f of failed) console.log(`  #${f.id} ${f.question} | ${(f.answer ?? "").slice(0, 80).replace(/\n/g, " ")}`);

  fs.mkdirSync("evals", { recursive: true });
  fs.writeFileSync("evals/rag-results.json", JSON.stringify({ summary, results }, null, 2) + "\n");
  const md = [
    "# RAG 问答评测报告",
    "",
    `- 时间：${new Date().toLocaleString("zh-CN")}`,
    `- 目标：${base}${rescored ? "（重打分，未重新调用模型）" : ""}`,
    `- 题目：${summary.total} 条（参数 / 卖点 / 状态 / 筛选 / 拒答）`,
    "",
    "| 指标 | 数值 |",
    "|---|---|",
    `| 答案正确率 | **${(acc * 100).toFixed(1)}%**（${answered.filter((r) => r.correct).length}/${answered.length}） |`,
    `| 引用命中率 | **${(citeRate * 100).toFixed(1)}%** |`,
    `| 拒答正确率 | **${(refusalRate * 100).toFixed(1)}%**（${refusals.filter((r) => r.correct).length}/${refusals.length}） |`,
    `| 平均首字延迟 | ${avgTtft}ms |`,
    `| 平均总耗时 | ${avgTotal}ms |`,
    "",
    "## 逐题结果",
    "",
    "| # | 类别 | 问题 | 正确 | 引用 | 首字 |",
    "|---|---|---|---|---|---|",
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.category} | ${r.question} | ${r.correct ? "✅" : "❌"} | ${r.citationHit === null ? "-" : r.citationHit ? "✅" : "❌"} | ${r.ttft}ms |`,
    ),
    "",
    "## 说明",
    "- 判定规则：非拒答题必须命中期望关键词，且不能是「开头就拒答」；拒答题必须明确说未提及/没有找到。",
    "- 引用命中：引用来源里出现期望文档（有页码期望时同时校验页码）。",
    "- 已知问题：#14（Ra97 吸顶灯）检索没打到在售清单表格页，属于「表格型页面召回不足」，待优化。",
  ].join("\n");
  fs.writeFileSync("evals/rag-report.md", md + "\n");
  console.log("\n写入 evals/rag-results.json 与 evals/rag-report.md");
  return summary;
}

async function ask(question) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    return { error: `HTTP ${res.status} ${t.slice(0, 120)}`, answer: "", sources: [], ttft: 0, total: Date.now() - t0 };
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "",
    answer = "",
    sources = [],
    ttft = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!ttft) ttft = Date.now() - t0;
    buf += dec.decode(value, { stream: true });
    const evs = buf.split("\n\n");
    buf = evs.pop() ?? "";
    for (const ev of evs) {
      const line = ev.split("\n").find((x) => x.startsWith("data:"));
      if (!line) continue;
      const p = line.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      try {
        const j = JSON.parse(p);
        if (j.sources) sources = j.sources;
        if (j.delta) answer += j.delta;
      } catch {}
    }
  }
  return { answer, sources, ttft, total: Date.now() - t0 };
}

if (RESCORE) {
  const prev = JSON.parse(fs.readFileSync("evals/rag-results.json", "utf8"));
  const results = prev.results.map((r) => {
    const q = questions.find((x) => x.id === r.id);
    const sources = (r.sources ?? []).map((s) => {
      const m = /^(.*) p(\d+)$/.exec(s);
      return { doc: m ? m[1] : s, page: m ? Number(m[2]) : 0 };
    });
    const { correct, citationHit } = judge(q, r.answer ?? "", sources);
    return { ...r, correct, citationHit };
  });
  writeReport(results, prev.summary?.base ?? BASE, true);
} else {
  const roundsArg = process.argv.find((a) => a.startsWith("--rounds="));
  const ROUNDS = Math.max(1, Math.min(5, Number(roundsArg ? roundsArg.slice(9) : 1) || 1));
  if (ROUNDS > 1) console.log(`评测 ${ROUNDS} 轮取多数（单轮噪声约 ±10%，多轮更可信）`);

  // 每轮都跑全量，再按题目汇总
  const perRound = [];
  for (let round = 1; round <= ROUNDS; round++) {
    const roundResults = [];
    for (const q of questions) {
      const r = await ask(q.question);
      const sources = r.sources ?? [];
      const { correct, citationHit } = judge(q, r.answer ?? "", sources);
      roundResults.push({
        id: q.id,
        category: q.category,
        question: q.question,
        correct,
        citationHit,
        ttft: r.ttft,
        total: r.total,
        answer: (r.answer ?? "").slice(0, 400),
        sources: sources.map((s) => `${s.doc}`.replace(/\.(pptx|xlsx)$/i, "") + ` p${s.page}`),
        error: r.error ?? null,
        round,
      });
    }
    const okCount = roundResults.filter((r) => r.correct).length;
    console.log(`  第 ${round}/${ROUNDS} 轮：${okCount}/${questions.length}`);
    perRound.push(roundResults);
  }

  // 合并：某题多数轮正确 → 判正确（3 轮制即 ≥2）
  const need = Math.floor(ROUNDS / 2) + 1;
  const results = questions.map((q) => {
    const tries = perRound.map((rd) => rd.find((x) => x.id === q.id)).filter(Boolean);
    const okRounds = tries.filter((t) => t.correct).length;
    const citeTries = tries.filter((t) => t.citationHit !== null);
    const citeOk = citeTries.length ? citeTries.filter((t) => t.citationHit).length : 0;
    return {
      id: q.id,
      category: q.category,
      question: q.question,
      correct: okRounds >= need,
      citationHit: citeTries.length ? citeOk >= need : null,
      rounds: ROUNDS,
      passRounds: okRounds,
      ttft: Math.round(tries.reduce((s, t) => s + t.ttft, 0) / Math.max(1, tries.length)),
      total: Math.round(tries.reduce((s, t) => s + t.total, 0) / Math.max(1, tries.length)),
      answer: (tries.find((t) => t.correct)?.answer ?? tries[0]?.answer ?? "").slice(0, 400),
      sources: (tries.find((t) => t.correct)?.sources ?? tries[0]?.sources ?? []),
      error: tries.every((t) => t.error) ? tries[0].error : null,
    };
  });
  writeReport(results, BASE);
}
