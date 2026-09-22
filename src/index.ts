/**
 * ==============================================================================
 * © 2026 5tra83r Studios. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This source code and any compiled binaries are the sole property of 
 * 5tra83r Studios. Unauthorized copying, modification, distribution, or use 
 * of this file, via any medium, is strictly prohibited without express written 
 * permission from 5tra83r Studios.
 * ==============================================================================
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "http";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { pruneTypeScriptCode, pruneTypeScriptFile } from "./ts_pruner.js";
import { getLicenseStatus, validateProAccess } from "./license.js";
import {
  recordPruneEvent,
  generateSavingsReport,
  formatSavingsReportMarkdown,
  type SavingsInterval,
} from "./telemetry.js";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTEXTCUT_BIN = path.join(__dirname, "..", "bin", "contextcut");
const PYTHON_SCRIPT = path.join(__dirname, "..", "python_engine", "contextcut.py");

/**
 * Executes the Python ContextCut engine with automatic fallback:
 * 1. Checks if the compiled binary (./bin/contextcut) exists and is executable.
 * 2. If not, automatically falls back to python3 / python executing python_engine/contextcut.py.
 */
async function executePythonContextCut(args: string[]): Promise<string> {
  let executable = CONTEXTCUT_BIN;
  let finalArgs = args;

  let useBinary = false;
  try {
    if (fs.existsSync(CONTEXTCUT_BIN)) {
      fs.accessSync(CONTEXTCUT_BIN, fs.constants.X_OK);
      useBinary = true;
    }
  } catch {
    useBinary = false;
  }

  if (useBinary) {
    executable = CONTEXTCUT_BIN;
    finalArgs = args;
  } else {
    executable = process.platform === "win32" ? "python" : "python3";
    finalArgs = [PYTHON_SCRIPT, ...args];
  }

  const { stdout, stderr } = await execFileAsync(executable, finalArgs, {
    maxBuffer: 25 * 1024 * 1024, // 25MB buffer for large directories
  });

  if (stderr) {
    console.error(`ContextCut Warning: ${stderr}`);
  }

  return stdout;
}

function isTypeScriptOrJavaScript(filePath?: string, languageHint?: string): boolean {
  if (languageHint === "typescript" || languageHint === "javascript") return true;
  if (languageHint === "python") return false;
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return true;
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      if (fs.existsSync(path.join(filePath, "tsconfig.json"))) return true;
      const entries = fs.readdirSync(filePath);
      return entries.some((e) =>
        [".ts", ".tsx", ".js", ".jsx"].includes(path.extname(e).toLowerCase())
      );
    }
  } catch {}
  return false;
}

function formatTsTelemetry(origChars: number, prunedChars: number, filesCount = 1): string {
  const savedChars = Math.max(0, origChars - prunedChars);
  const origTokens = Math.max(1, Math.floor(origChars / 4));
  const prunedTokens = Math.max(1, Math.floor(prunedChars / 4));
  const savedTokens = Math.max(0, origTokens - prunedTokens);
  const pctSaved = origChars > 0 ? ((savedChars / origChars) * 100).toFixed(1) : "0.0";
  const costSaved = ((savedTokens / 1_000_000) * 3.0).toFixed(4);
  const fileLine = filesCount > 1 ? `Files Pruned:   ${filesCount}\n * ` : "";

  return `/**
 * [ContextCut Telemetry - Pro Polyglot Engine]
 * ----------------------------------------
 * ${fileLine}Original Size:  ${origChars.toLocaleString()} chars (~${origTokens.toLocaleString()} tokens)
 * Pruned Size:    ${prunedChars.toLocaleString()} chars (~${prunedTokens.toLocaleString()} tokens)
 * Token Savings:  ${pctSaved}% reduction (~${savedTokens.toLocaleString()} tokens saved)
 * Est. Cost Saved: $${costSaved} per prompt (@ $3.00/1M tokens)
 * ----------------------------------------
 */\n\n`;
}

const server = new Server(
  {
    name: "5tra83r-contextcut-mcp",
    version: "1.3.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// -----------------------------------------------------------------------------
// 1. MCP Tools
// -----------------------------------------------------------------------------
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "prune_code_context",
        description:
          "Reads a source file or directory (or raw string) and returns an AST-pruned version containing only signatures, types, interfaces, and docstrings. Replaces function/method bodies with stubs to drastically cut token consumption and latency. Python pruning is free; TypeScript/JavaScript pruning is a Pro feature.",
        inputSchema: {
          type: "object",
          properties: {
            target_path: {
              type: "string",
              description:
                "Path to the source file or directory to prune (absolute or relative to current workspace)",
            },
            code_content: {
              type: "string",
              description:
                "Optional raw code string to prune directly in-memory instead of reading from disk",
            },
            language: {
              type: "string",
              description:
                "Optional language hint ('python', 'typescript', or 'javascript'). Auto-detected if target_path has an extension.",
              enum: ["python", "typescript", "javascript"],
            },
            license_key: {
              type: "string",
              description:
                "Optional ContextCut Pro license key (can also be set via CONTEXTCUT_LICENSE_KEY environment variable)",
            },
            glob_pattern: {
              type: "string",
              description:
                "Glob filter for directory scans (default: '*.py' for Python, '*.ts' for TypeScript)",
            },
            depth: {
              type: "string",
              description:
                "Pruning depth: 'interfaces_only' (preserves docstrings) or 'minimal' (strips docstrings)",
              enum: ["interfaces_only", "minimal"],
            },
          },
        },
      },
      {
        name: "check_license",
        description: "Checks ContextCut license tier status (Free vs Pro).",
        inputSchema: {
          type: "object",
          properties: {
            license_key: {
              type: "string",
              description: "Optional explicit license key to validate",
            },
          },
        },
      },
      {
        name: "get_savings_report",
        description:
          "Generates an aggregated cost-benefit and token savings ROI report over a specified interval (daily, weekly, monthly, or all_time) based on persistent local history.",
        inputSchema: {
          type: "object",
          properties: {
            interval: {
              type: "string",
              description:
                "Reporting interval: 'daily' (past 24h), 'weekly' (past 7 days), 'monthly' (past 30 days), or 'all_time' (cumulative). Default: 'all_time'.",
              enum: ["daily", "weekly", "monthly", "all_time"],
            },
            format: {
              type: "string",
              description:
                "Output format: 'markdown' (default human-readable report) or 'json' (raw structured analytics).",
              enum: ["markdown", "json"],
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "check_license") {
    const key = request.params.arguments?.license_key ? String(request.params.arguments.license_key) : undefined;
    const status = await getLicenseStatus(key);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  }

  if (request.params.name === "get_savings_report") {
    const args = request.params.arguments || {};
    const interval = (args.interval as SavingsInterval) || "all_time";
    const format = args.format === "json" ? "json" : "markdown";
    const report = await generateSavingsReport(interval);

    if (format === "json") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: formatSavingsReportMarkdown(report),
        },
      ],
    };
  }

  if (request.params.name !== "prune_code_context") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments || {};
  const targetPath = args.target_path ? String(args.target_path) : undefined;
  const codeContent = args.code_content ? String(args.code_content) : undefined;
  const language = args.language ? String(args.language).toLowerCase() : undefined;
  const licenseKey = args.license_key ? String(args.license_key) : undefined;
  const globPattern = args.glob_pattern ? String(args.glob_pattern) : undefined;
  const depth = args.depth ? String(args.depth) : undefined;

  if (!targetPath && !codeContent) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Either 'target_path' or 'code_content' must be provided.",
        },
      ],
      isError: true,
    };
  }

  try {
    // 1. Check if input is TypeScript or JavaScript (Gated Pro feature)
    if (isTypeScriptOrJavaScript(targetPath, language)) {
      const proCheck = await validateProAccess(licenseKey);

      if (!proCheck.allowed) {
        return {
          content: [
            {
              type: "text",
              text: proCheck.message || "ContextCut Pro license required.",
            },
          ],
        };
      }

      // Pro access validated: execute TypeScript AST pruner
      let tsRes: { pruned: string; origChars: number; prunedChars: number } | null = null;
      let filesCount = 1;

      if (codeContent) {
        tsRes = pruneTypeScriptCode(codeContent);
      } else if (targetPath) {
        if (!fs.existsSync(targetPath)) {
          return {
            content: [{ type: "text", text: `Error: File not found: ${targetPath}` }],
            isError: true,
          };
        }
        const stat = fs.statSync(targetPath);
        if (stat.isFile()) {
          tsRes = await pruneTypeScriptFile(targetPath);
        } else if (stat.isDirectory()) {
          const matchedFiles: string[] = [];
          const scanDir = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              if (
                entry.name.startsWith(".") ||
                entry.name === "node_modules" ||
                entry.name === "build" ||
                entry.name === "dist" ||
                entry.name === "__pycache__"
              ) {
                continue;
              }
              const full = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                scanDir(full);
              } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext) && !entry.name.endsWith(".d.ts")) {
                  matchedFiles.push(full);
                }
              }
            }
          };
          scanDir(targetPath);

          if (matchedFiles.length > 0) {
            filesCount = matchedFiles.length;
            let totalOrig = 0;
            let totalPruned = 0;
            const outputParts: string[] = [];
            for (const file of matchedFiles) {
              const rel = path.relative(targetPath, file);
              const singleRes = await pruneTypeScriptFile(file);
              totalOrig += singleRes.origChars;
              totalPruned += singleRes.prunedChars;
              outputParts.push(`// ========================================\n// File: ${rel}\n// ========================================\n${singleRes.pruned}\n`);
            }
            tsRes = {
              pruned: outputParts.join("\n"),
              origChars: totalOrig,
              prunedChars: totalPruned,
            };
          }
        }
      }

      if (tsRes) {
        const header = formatTsTelemetry(tsRes.origChars, tsRes.prunedChars, filesCount);
        const origTokens = Math.max(1, Math.floor(tsRes.origChars / 4));
        const prunedTokens = Math.max(1, Math.floor(tsRes.prunedChars / 4));
        const savedTokens = Math.max(0, origTokens - prunedTokens);
        const savedUsd = (savedTokens / 1_000_000) * 3.0;
        const detectedLang =
          targetPath &&
          (targetPath.endsWith(".js") ||
            targetPath.endsWith(".jsx") ||
            targetPath.endsWith(".mjs") ||
            targetPath.endsWith(".cjs"))
            ? "javascript"
            : "typescript";

        await recordPruneEvent({
          lang: language || detectedLang,
          target: targetPath || "<raw_code>",
          files: filesCount,
          origChars: tsRes.origChars,
          prunedChars: tsRes.prunedChars,
          origTokens,
          prunedTokens,
          savedTokens,
          savedUsd,
        });

        return {
          content: [{ type: "text", text: header + tsRes.pruned }],
        };
      }
    }

    // 2. Python AST pruning (100% Free Core Engine)
    const cliArgs: string[] = ["--no-history", "--json"];
    if (targetPath) {
      cliArgs.push(targetPath);
    }
    if (codeContent) {
      cliArgs.push("--code", codeContent);
    }
    if (globPattern) {
      cliArgs.push("--glob", globPattern);
    }
    if (depth) {
      cliArgs.push("--depth", depth);
    }

    const result = await executePythonContextCut(cliArgs);
    let outputText = result;

    try {
      const parsed = JSON.parse(result);
      if (parsed && typeof parsed === "object" && typeof parsed.output === "string") {
        outputText = parsed.output;
        await recordPruneEvent({
          lang: "python",
          target: targetPath || "<raw_code>",
          files: parsed.files_count || 1,
          origChars: parsed.orig_chars || 0,
          prunedChars: parsed.pruned_chars || 0,
          origTokens: parsed.orig_tokens || 0,
          prunedTokens: parsed.pruned_tokens || 0,
          savedTokens: parsed.saved_tokens || 0,
          savedUsd: parsed.cost_saved_usd || 0,
        });
      }
    } catch {
      // Fallback if result was plain text
    }

    return {
      content: [
        {
          type: "text",
          text: outputText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ContextCut: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// -----------------------------------------------------------------------------
// 2. MCP Resources
// -----------------------------------------------------------------------------
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "contextcut://sample/pruned",
        name: "Sample Pruned Code",
        description: "Demonstration of ContextCut AST-pruned code output on a sample module",
        mimeType: "text/x-python",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  if (uri.startsWith("contextcut://pruned/")) {
    const filePath = uri.replace("contextcut://pruned/", "");
    if (isTypeScriptOrJavaScript(filePath)) {
      const res = await pruneTypeScriptFile(filePath);
      return {
        contents: [
          {
            uri,
            mimeType: "text/typescript",
            text: formatTsTelemetry(res.origChars, res.prunedChars) + res.pruned,
          },
        ],
      };
    } else {
      const prunedCode = await executePythonContextCut([filePath]);
      return {
        contents: [
          {
            uri,
            mimeType: "text/x-python",
            text: prunedCode,
          },
        ],
      };
    }
  } else if (uri === "contextcut://sample/pruned") {
    const samplePath = path.join(__dirname, "..", "examples", "sample_bloated.py");
    const prunedCode = await executePythonContextCut([samplePath]);
    return {
      contents: [
        {
          uri,
          mimeType: "text/x-python",
          text: prunedCode,
        },
      ],
    };
  }

  throw new Error(`Resource not found: ${uri}`);
});

// -----------------------------------------------------------------------------
// 3. MCP Prompts
// -----------------------------------------------------------------------------
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "analyze_architecture",
        description:
          "Analyze the high-level architecture of a source file or directory using ContextCut's AST-pruned stubs without being bogged down in function bodies.",
        arguments: [
          {
            name: "target_path",
            description: "Path to the file or directory to inspect",
            required: true,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "analyze_architecture") {
    throw new Error(`Unknown prompt: ${request.params.name}`);
  }

  const targetPath = String(request.params.arguments?.target_path || "");
  let prunedCode = "";
  if (isTypeScriptOrJavaScript(targetPath)) {
    const res = await pruneTypeScriptFile(targetPath);
    prunedCode = formatTsTelemetry(res.origChars, res.prunedChars) + res.pruned;
  } else {
    prunedCode = await executePythonContextCut([targetPath]);
  }

  return {
    description: `Architectural analysis of ${targetPath}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Here is the AST-pruned interface map for ${targetPath}:\n\n${prunedCode}\n\nPlease analyze the software architecture, class relationships, and public interface contracts. Focus on structural design without worrying about internal implementation details.`,
        },
      },
    ],
  };
});

// -----------------------------------------------------------------------------
// 4. Server Transport Startup / CLI Report Invocation
// -----------------------------------------------------------------------------
async function run() {
  // Check for CLI report / stats invocation (e.g. npx contextcut-mcp stats --interval=weekly)
  const isReportArg = process.argv.some(
    (a) => a === "report" || a === "stats" || a === "--report" || a === "--stats"
  );

  if (isReportArg) {
    const rawInterval = process.argv.find((a) => a.startsWith("--interval="))?.split("=")[1];
    const interval = (["daily", "weekly", "monthly", "all_time"].includes(rawInterval || "")
      ? rawInterval
      : "all_time") as SavingsInterval;
    const formatJson = process.argv.includes("--json");
    const report = await generateSavingsReport(interval);

    if (formatJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatSavingsReportMarkdown(report));
    }
    process.exit(0);
  }

  // Check for CLI init / setup invocation (e.g. npx contextcut-mcp init)
  const isInitArg = process.argv.some(
    (a) => a === "init" || a === "setup" || a === "--init" || a === "--setup"
  );

  if (isInitArg) {
    const autopilotRule = `\n# ContextCut Agent Autopilot Rule
# -----------------------------------------------------------------------------
# When exploring, surveying, or analyzing code architecture, class definitions,
# or public API interfaces, ALWAYS invoke the \`prune_code_context\` MCP tool first
# to eliminate token bloat. Only inspect raw, unpruned function bodies if you are
# explicitly modifying the internal implementation of that specific function.
# -----------------------------------------------------------------------------\n`;

    const cwd = process.cwd();
    const cursorRulesPath = path.join(cwd, ".cursorrules");
    const claudeMdPath = path.join(cwd, "CLAUDE.md");

    const updatedFiles: string[] = [];

    // Append to or create .cursorrules
    try {
      const existingCursor = fs.existsSync(cursorRulesPath)
        ? fs.readFileSync(cursorRulesPath, "utf-8")
        : "";
      if (!existingCursor.includes("prune_code_context")) {
        fs.writeFileSync(
          cursorRulesPath,
          (existingCursor.trim() ? existingCursor.trim() + "\n" : "") + autopilotRule,
          "utf-8"
        );
        updatedFiles.push(".cursorrules");
      }
    } catch (e) {
      console.error("Warning: Could not write .cursorrules:", e);
    }

    // Append to or create CLAUDE.md
    try {
      const existingClaude = fs.existsSync(claudeMdPath)
        ? fs.readFileSync(claudeMdPath, "utf-8")
        : "";
      if (!existingClaude.includes("prune_code_context")) {
        fs.writeFileSync(
          claudeMdPath,
          (existingClaude.trim() ? existingClaude.trim() + "\n" : "") + autopilotRule,
          "utf-8"
        );
        updatedFiles.push("CLAUDE.md");
      }
    } catch (e) {
      console.error("Warning: Could not write CLAUDE.md:", e);
    }

    console.log(`\n⚡ [ContextCut Autopilot Mode Initialized]`);
    if (updatedFiles.length > 0) {
      console.log(`✓ Added Autopilot rule to: ${updatedFiles.join(", ")}`);
    } else {
      console.log(`✓ Autopilot rule already present in .cursorrules and CLAUDE.md`);
    }
    console.log(
      `\nYour AI coding agents (Cursor, Claude Desktop, Antigravity) will now automatically route files through ContextCut first to slash token waste by 50–80%.\n`
    );
    process.exit(0);
  }

  // Check for CLI dashboard invocation (e.g. npx contextcut-mcp dashboard)
  const isDashboardArg = process.argv.some(
    (a) => a === "dashboard" || a === "ui" || a === "viewer" || a === "--dashboard"
  );

  if (isDashboardArg) {
    const { readHistoryRecords } = await import("./telemetry.js");
    const { getDashboardHtml } = await import("./dashboard_html.js");
    const port = 3800;

    const localServer = http.createServer(async (req, res) => {
      const parsedUrl = new URL(req.url || "/", `http://localhost:${port}`);

      if (parsedUrl.pathname === "/api/history") {
        const { records: freshRecords } = await readHistoryRecords("all_time");
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        });
        res.end(JSON.stringify({ records: freshRecords }));
        return;
      }

      // Serve fresh HTML on every page load/refresh
      const { records: freshRecords } = await readHistoryRecords("all_time");
      const freshHtml = getDashboardHtml(JSON.stringify(freshRecords));
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      });
      res.end(freshHtml);
    });

    localServer.listen(port, async () => {
      const { records: initialRecords } = await readHistoryRecords("all_time");
      const url = `http://localhost:${port}`;
      console.log(`\n⚡ [ContextCut Executive Dashboard]`);
      console.log(`✓ Serving visual analytics from ~/.contextcut/history.jsonl (${initialRecords.length} events)`);
      console.log(`✓ Live dynamic reloading & auto-sync enabled`);
      console.log(`✓ Opening browser at: ${url}`);
      console.log(`\nPress Ctrl+C to stop the dashboard server.\n`);

      const openCmd =
        process.platform === "darwin"
          ? `open "${url}"`
          : process.platform === "win32"
          ? `start "${url}"`
          : `xdg-open "${url}"`;

      exec(openCmd, (err) => {
        if (err) {
          console.log(`(Please open ${url} in your browser)`);
        }
      });
    });

    return;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ContextCut Polyglot MCP Server v1.3.0 is running on stdio");
}

run().catch((err) => {
  console.error("Fatal error starting ContextCut MCP Server:", err);
  process.exit(1);
});