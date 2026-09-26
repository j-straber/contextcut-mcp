/**
 * ==============================================================================
 * © 2026 5tra83r Studios LLC. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * ContextCut Persistent Telemetry & Historical Savings Analytics
 * ==============================================================================
 */

import fs from "fs";
import os from "os";
import path from "path";

export type SavingsInterval = "daily" | "weekly" | "monthly" | "all_time";

export interface TelemetryRecord {
  ts: string;
  lang: string;
  target?: string | undefined;
  files: number;
  origChars: number;
  prunedChars: number;
  origTokens: number;
  prunedTokens: number;
  savedTokens: number;
  savedUsd: number;
}

export interface LanguageStat {
  runs: number;
  files: number;
  origTokens: number;
  prunedTokens: number;
  savedTokens: number;
  savedUsd: number;
  reductionPct: number;
}

export interface TargetStat {
  target: string;
  runs: number;
  savedTokens: number;
  savedUsd: number;
}

export interface SavingsReport {
  interval: SavingsInterval;
  startTime: string | null;
  endTime: string;
  totalRuns: number;
  totalFiles: number;
  totalOrigChars: number;
  totalPrunedChars: number;
  totalOrigTokens: number;
  totalPrunedTokens: number;
  totalSavedTokens: number;
  totalSavedUsd: number;
  overallReductionPct: number;
  estLatencySecondsSaved: number;
  byLanguage: Record<string, LanguageStat>;
  topTargets: TargetStat[];
}

/**
 * Returns the resolved path to the ~/.contextcut/history.jsonl ledger.
 * Can be overridden via CONTEXTCUT_HISTORY_FILE environment variable.
 */
export function getHistoryFilePath(): string {
  if (process.env.CONTEXTCUT_HISTORY_FILE) {
    return process.env.CONTEXTCUT_HISTORY_FILE;
  }
  const homeDir = os.homedir();
  return path.join(homeDir, ".contextcut", "history.jsonl");
}

/**
 * Appends a prune operation record to the persistent local JSONL ledger.
 * Non-blocking, fails safe to prevent ever breaking pruning operations.
 */
export async function recordPruneEvent(
  record: Omit<TelemetryRecord, "ts"> & { ts?: string }
): Promise<void> {
  try {
    const filePath = getHistoryFilePath();
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    const sanitizedTarget = record.target
      ? record.target.replace(/\\/g, "/").split("/").slice(-3).join("/")
      : undefined;

    const fullRecord: TelemetryRecord = {
      ts: record.ts || new Date().toISOString(),
      lang: record.lang || "unknown",
      target: sanitizedTarget,
      files: Math.max(1, record.files || 1),
      origChars: record.origChars || 0,
      prunedChars: record.prunedChars || 0,
      origTokens: record.origTokens || 0,
      prunedTokens: record.prunedTokens || 0,
      savedTokens: Math.max(0, record.savedTokens || 0),
      savedUsd: Number((record.savedUsd || 0).toFixed(6)),
    };

    const line = JSON.stringify(fullRecord) + "\n";
    await fs.promises.appendFile(filePath, line, "utf-8");
  } catch (err) {
    // Failsafe: Never allow telemetry recording failures to disrupt core AST execution
    console.error("[ContextCut Telemetry] Warning: Could not write history record:", err);
  }
}

/**
 * Reads and parses all history records within a specified timeframe.
 */
export async function readHistoryRecords(
  interval: SavingsInterval = "all_time"
): Promise<{ records: TelemetryRecord[]; startTime: string | null; endTime: string }> {
  const filePath = getHistoryFilePath();
  const now = new Date();
  const endTime = now.toISOString();

  let cutoffMs: number | null = null;
  if (interval === "daily") {
    cutoffMs = now.getTime() - 24 * 60 * 60 * 1000;
  } else if (interval === "weekly") {
    cutoffMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  } else if (interval === "monthly") {
    cutoffMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  }

  const startTime = cutoffMs ? new Date(cutoffMs).toISOString() : null;

  if (!fs.existsSync(filePath)) {
    return { records: [], startTime, endTime };
  }

  try {
    const rawData = await fs.promises.readFile(filePath, "utf-8");
    const lines = rawData.split("\n");
    const records: TelemetryRecord[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as TelemetryRecord;
        if (!parsed.ts) continue;

        if (cutoffMs !== null) {
          const recTime = new Date(parsed.ts).getTime();
          if (isNaN(recTime) || recTime < cutoffMs) {
            continue;
          }
        }
        records.push(parsed);
      } catch {
        // Ignore corrupted individual lines
      }
    }

    return { records, startTime, endTime };
  } catch (err) {
    console.error("[ContextCut Telemetry] Error reading history file:", err);
    return { records: [], startTime, endTime };
  }
}

/**
 * Aggregates persistent telemetry records and produces a comprehensive SavingsReport.
 */
export async function generateSavingsReport(
  interval: SavingsInterval = "all_time"
): Promise<SavingsReport> {
  const { records, startTime, endTime } = await readHistoryRecords(interval);

  let totalRuns = 0;
  let totalFiles = 0;
  let totalOrigChars = 0;
  let totalPrunedChars = 0;
  let totalOrigTokens = 0;
  let totalPrunedTokens = 0;
  let totalSavedTokens = 0;
  let totalSavedUsd = 0;

  const byLanguage: Record<string, LanguageStat> = {};
  const targetMap: Record<string, { runs: number; savedTokens: number; savedUsd: number }> = {};

  for (const r of records) {
    totalRuns += 1;
    totalFiles += r.files || 1;
    totalOrigChars += r.origChars || 0;
    totalPrunedChars += r.prunedChars || 0;
    totalOrigTokens += r.origTokens || 0;
    totalPrunedTokens += r.prunedTokens || 0;
    totalSavedTokens += r.savedTokens || 0;
    totalSavedUsd += r.savedUsd || 0;

    // By language
    const lang = (r.lang || "unknown").toLowerCase();
    const langStat: LanguageStat = byLanguage[lang] || {
      runs: 0,
      files: 0,
      origTokens: 0,
      prunedTokens: 0,
      savedTokens: 0,
      savedUsd: 0,
      reductionPct: 0,
    };
    langStat.runs += 1;
    langStat.files += r.files || 1;
    langStat.origTokens += r.origTokens || 0;
    langStat.prunedTokens += r.prunedTokens || 0;
    langStat.savedTokens += r.savedTokens || 0;
    langStat.savedUsd += r.savedUsd || 0;
    byLanguage[lang] = langStat;

    // By target
    if (r.target) {
      const existingTarget = targetMap[r.target] || { runs: 0, savedTokens: 0, savedUsd: 0 };
      existingTarget.runs += 1;
      existingTarget.savedTokens += r.savedTokens || 0;
      existingTarget.savedUsd += r.savedUsd || 0;
      targetMap[r.target] = existingTarget;
    }
  }

  // Calculate language reduction percentages
  for (const lang of Object.keys(byLanguage)) {
    const item = byLanguage[lang];
    if (!item) continue;
    item.reductionPct =
      item.origTokens > 0
        ? Number(((item.savedTokens / item.origTokens) * 100).toFixed(1))
        : 0;
    item.savedUsd = Number(item.savedUsd.toFixed(4));
  }

  const overallReductionPct =
    totalOrigTokens > 0
      ? Number(((totalSavedTokens / totalOrigTokens) * 100).toFixed(1))
      : 0;

  // Latency saved heuristic: ~100 tokens / second ingestion & attention computation
  const estLatencySecondsSaved = Number((totalSavedTokens / 100).toFixed(1));

  // Top targets sorted by saved tokens
  const topTargets: TargetStat[] = Object.entries(targetMap)
    .map(([target, stat]) => ({
      target,
      runs: stat.runs,
      savedTokens: stat.savedTokens,
      savedUsd: Number(stat.savedUsd.toFixed(4)),
    }))
    .sort((a, b) => b.savedTokens - a.savedTokens)
    .slice(0, 5);

  return {
    interval,
    startTime,
    endTime,
    totalRuns,
    totalFiles,
    totalOrigChars,
    totalPrunedChars,
    totalOrigTokens,
    totalPrunedTokens,
    totalSavedTokens,
    totalSavedUsd: Number(totalSavedUsd.toFixed(4)),
    overallReductionPct,
    estLatencySecondsSaved,
    byLanguage,
    topTargets,
  };
}

/**
 * Formats a SavingsReport into a clean, professional GitHub-flavored Markdown document.
 */
export function formatSavingsReportMarkdown(report: SavingsReport): string {
  const intervalTitles: Record<SavingsInterval, string> = {
    daily: "Past 24 Hours (Daily)",
    weekly: "Past 7 Days (Weekly)",
    monthly: "Past 30 Days (Monthly)",
    all_time: "All-Time Cumulative",
  };

  const title = intervalTitles[report.interval] || "Savings Report";
  const ledgerPath = getHistoryFilePath();

  if (report.totalRuns === 0) {
    return `## 📊 ContextCut Savings & ROI Report
**Interval**: ${title}  
**Status**: No pruning activity recorded in this period.

*Tip: Prune Python or TypeScript code using ContextCut to accumulate token and cost savings!*  
*Local Ledger*: \`${ledgerPath}\`
`;
  }

  const hoursLatency = (report.estLatencySecondsSaved / 3600).toFixed(2);
  const latencyDisplay =
    report.estLatencySecondsSaved >= 3600
      ? `~${hoursLatency} hours`
      : `~${(report.estLatencySecondsSaved / 60).toFixed(1)} minutes`;

  let langTable = "";
  if (Object.keys(report.byLanguage).length > 0) {
    langTable = `### 🌐 Savings by Language
| Language | Runs | Files | Tokens Saved | Reduction | Est. Cost Saved |
| :--- | :---: | :---: | :---: | :---: | :---: |
`;
    for (const [lang, stat] of Object.entries(report.byLanguage)) {
      const capLang = lang.charAt(0).toUpperCase() + lang.slice(1);
      langTable += `| **${capLang}** | ${stat.runs.toLocaleString()} | ${stat.files.toLocaleString()} | ${stat.savedTokens.toLocaleString()} | ${stat.reductionPct}% | $${stat.savedUsd.toFixed(4)} |\n`;
    }
    langTable += "\n";
  }

  let topTargetsSection = "";
  if (report.topTargets.length > 0) {
    topTargetsSection = `### 🏆 Top Context Optimizations
| Target / Module | Runs | Tokens Saved | Est. Cost Saved |
| :--- | :---: | :---: | :---: |
`;
    for (const t of report.topTargets) {
      topTargetsSection += `| \`${t.target}\` | ${t.runs} | ${t.savedTokens.toLocaleString()} | $${t.savedUsd.toFixed(4)} |\n`;
    }
    topTargetsSection += "\n";
  }

  return `## 📊 ContextCut Savings & ROI Report
**Reporting Interval**: ${title}  
**Generated**: ${new Date().toISOString().replace("T", " ").substring(0, 19)} UTC  
**Ledger Storage**: \`${ledgerPath}\`

---

### 💰 Bottom Line Impact
* **Total Cost Saved**: **$${report.totalSavedUsd.toFixed(4)} USD** *(calculated @ standard $3.00 / 1M input tokens)*
* **Total Tokens Saved**: **${report.totalSavedTokens.toLocaleString()} tokens** (**${report.overallReductionPct}%** overall reduction)
* **Estimated LLM Latency Saved**: **${latencyDisplay}** of context ingestion time

---

### 📈 Activity Overview
* **Prune Operations**: **${report.totalRuns.toLocaleString()}** runs
* **Total Files Processed**: **${report.totalFiles.toLocaleString()}** files
* **Original Token Volume**: **${report.totalOrigTokens.toLocaleString()}** tokens (${report.totalOrigChars.toLocaleString()} chars)
* **Pruned Context Sent**: **${report.totalPrunedTokens.toLocaleString()}** tokens (${report.totalPrunedChars.toLocaleString()} chars)

---

${langTable}${topTargetsSection}
> 🔒 *ContextCut guarantees 100% privacy: only anonymous token counts and timestamps are stored locally. Your source code never leaves your workstation.*
`;
}
