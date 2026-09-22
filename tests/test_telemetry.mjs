import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  recordPruneEvent,
  generateSavingsReport,
  formatSavingsReportMarkdown,
  getHistoryFilePath,
} from "../build/telemetry.js";

describe("ContextCut Persistent Telemetry & Reporting", () => {
  let tempDir;
  let tempHistoryFile;
  let originalEnv;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "contextcut-test-"));
    tempHistoryFile = path.join(tempDir, "history.jsonl");
    originalEnv = process.env.CONTEXTCUT_HISTORY_FILE;
    process.env.CONTEXTCUT_HISTORY_FILE = tempHistoryFile;
  });

  afterEach(async () => {
    if (originalEnv !== undefined) {
      process.env.CONTEXTCUT_HISTORY_FILE = originalEnv;
    } else {
      delete process.env.CONTEXTCUT_HISTORY_FILE;
    }
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it("getHistoryFilePath should respect CONTEXTCUT_HISTORY_FILE env var", () => {
    assert.strictEqual(getHistoryFilePath(), tempHistoryFile);
  });

  it("handles empty history gracefully", async () => {
    const report = await generateSavingsReport("all_time");
    assert.strictEqual(report.totalRuns, 0);
    assert.strictEqual(report.totalSavedTokens, 0);
    assert.strictEqual(report.totalSavedUsd, 0);

    const md = formatSavingsReportMarkdown(report);
    assert.match(md, /No pruning activity recorded/);
  });

  it("records events atomically and aggregates savings accurately", async () => {
    // 1. Record Python event
    await recordPruneEvent({
      lang: "python",
      target: "src/service.py",
      files: 1,
      origChars: 4000,
      prunedChars: 1000,
      origTokens: 1000,
      prunedTokens: 250,
      savedTokens: 750,
      savedUsd: 0.002,
    });

    // 2. Record TypeScript event
    await recordPruneEvent({
      lang: "typescript",
      target: "src/components/button.tsx",
      files: 1,
      origChars: 8000,
      prunedChars: 2000,
      origTokens: 2000,
      prunedTokens: 500,
      savedTokens: 1500,
      savedUsd: 0.005,
    });

    // Verify file content is valid JSONL
    const raw = await fs.promises.readFile(tempHistoryFile, "utf-8");
    const lines = raw.trim().split("\n");
    assert.strictEqual(lines.length, 2);

    const parsedFirst = JSON.parse(lines[0]);
    assert.strictEqual(parsedFirst.lang, "python");
    assert.strictEqual(parsedFirst.savedTokens, 750);

    // Aggregate report
    const report = await generateSavingsReport("all_time");
    assert.strictEqual(report.totalRuns, 2);
    assert.strictEqual(report.totalFiles, 2);
    assert.strictEqual(report.totalOrigTokens, 3000);
    assert.strictEqual(report.totalPrunedTokens, 750);
    assert.strictEqual(report.totalSavedTokens, 2250);
    assert.strictEqual(report.overallReductionPct, 75.0);
    assert.strictEqual(report.totalSavedUsd, 0.007); // 0.002 + 0.005 = 0.007

    assert.ok(report.byLanguage.python);
    assert.strictEqual(report.byLanguage.python.runs, 1);
    assert.strictEqual(report.byLanguage.python.savedTokens, 750);

    assert.ok(report.byLanguage.typescript);
    assert.strictEqual(report.byLanguage.typescript.runs, 1);
    assert.strictEqual(report.byLanguage.typescript.savedTokens, 1500);

    // Format markdown report
    const md = formatSavingsReportMarkdown(report);
    assert.match(md, /ContextCut Savings & ROI Report/);
    assert.match(md, /\$0\.0070 USD/);
    assert.match(md, /2,250 tokens/);
    assert.match(md, /Python/);
    assert.match(md, /TypeScript/i);
  });

  it("filters correctly by interval", async () => {
    const now = Date.now();
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();

    // Event 1: 1 hour ago (within daily, weekly, monthly, all_time)
    await recordPruneEvent({
      ts: oneHourAgo,
      lang: "python",
      files: 1,
      origChars: 1000,
      prunedChars: 200,
      origTokens: 250,
      prunedTokens: 50,
      savedTokens: 200,
      savedUsd: 0.0006,
    });

    // Event 2: 2 days ago (excluded by daily, included by weekly, monthly, all_time)
    await recordPruneEvent({
      ts: twoDaysAgo,
      lang: "typescript",
      files: 1,
      origChars: 2000,
      prunedChars: 400,
      origTokens: 500,
      prunedTokens: 100,
      savedTokens: 400,
      savedUsd: 0.0012,
    });

    // Event 3: 10 days ago (excluded by daily and weekly, included by monthly, all_time)
    await recordPruneEvent({
      ts: tenDaysAgo,
      lang: "javascript",
      files: 1,
      origChars: 3000,
      prunedChars: 600,
      origTokens: 750,
      prunedTokens: 150,
      savedTokens: 600,
      savedUsd: 0.0018,
    });

    // Daily report should only have 1 event
    const dailyReport = await generateSavingsReport("daily");
    assert.strictEqual(dailyReport.totalRuns, 1);
    assert.strictEqual(dailyReport.totalSavedTokens, 200);

    // Weekly report should have 2 events
    const weeklyReport = await generateSavingsReport("weekly");
    assert.strictEqual(weeklyReport.totalRuns, 2);
    assert.strictEqual(weeklyReport.totalSavedTokens, 600);

    // Monthly report should have 3 events
    const monthlyReport = await generateSavingsReport("monthly");
    assert.strictEqual(monthlyReport.totalRuns, 3);
    assert.strictEqual(monthlyReport.totalSavedTokens, 1200);

    // All time report should have 3 events
    const allTimeReport = await generateSavingsReport("all_time");
    assert.strictEqual(allTimeReport.totalRuns, 3);
    assert.strictEqual(allTimeReport.totalSavedTokens, 1200);
  });
});
