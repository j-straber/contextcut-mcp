/**
 * ==============================================================================
 * © 2026 5tra83r Studios. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * ContextCut Quick Clipboard Trimmer (For ChatGPT, Gemini, & Claude Web)
 * ==============================================================================
 */

import { exec, execFile } from "child_process";
import { promisify } from "util";
import { pruneTypeScriptCode } from "./ts_pruner.js";
import { recordPruneEvent } from "./telemetry.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

/**
 * Reads text directly from the host operating system clipboard.
 */
export async function readClipboard(): Promise<string> {
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      const { stdout } = await execAsync("pbpaste");
      return stdout;
    } else if (platform === "win32") {
      const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Clipboard"');
      return stdout;
    } else {
      // Linux: Try wl-paste then xclip
      try {
        const { stdout } = await execAsync("wl-paste");
        return stdout;
      } catch {
        const { stdout } = await execAsync("xclip -selection clipboard -o");
        return stdout;
      }
    }
  } catch (error) {
    throw new Error(
      `Could not read system clipboard: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Writes text directly back to the host operating system clipboard.
 */
export async function writeClipboard(text: string): Promise<void> {
  const platform = process.platform;

  return new Promise((resolve, reject) => {
    let cmd = "pbcopy";
    let args: string[] = [];

    if (platform === "darwin") {
      cmd = "pbcopy";
    } else if (platform === "win32") {
      cmd = "powershell";
      args = ["-NoProfile", "-Command", "Set-Clipboard"];
    } else {
      // Linux
      cmd = "xclip";
      args = ["-selection", "clipboard"];
    }

    const child = execFile(cmd, args, (err) => {
      if (err) return reject(err);
      resolve();
    });

    if (child.stdin) {
      child.stdin.write(text);
      child.stdin.end();
    } else {
      reject(new Error("Failed to open stdin for clipboard process"));
    }
  });
}

/**
 * Automatically detects language and trims text down to essential stubs.
 */
export async function trimClipboardContent(rawContent: string): Promise<{
  trimmed: string;
  lang: string;
  origTokens: number;
  prunedTokens: number;
  savedTokens: number;
  reductionPct: number;
  savedUsd: number;
}> {
  const trimmedInput = rawContent.trim();
  if (!trimmedInput) {
    throw new Error("Clipboard is empty! Copy some code or text first (Cmd+C), then run this tool.");
  }

  const origChars = rawContent.length;
  const origTokens = Math.max(1, Math.floor(origChars / 4));

  // Determine language heuristic
  const isPython =
    (trimmedInput.includes("def ") || trimmedInput.includes("class ")) &&
    (trimmedInput.includes("import ") || trimmedInput.includes("self.") || trimmedInput.includes(":\n"));

  let prunedOutput = rawContent;
  let detectedLang = "generic";

  if (isPython) {
    detectedLang = "python";
    // Invoke Python pruner via CLI engine
    const pythonScript = path.resolve(__dirname, "..", "python_engine", "contextcut.py");
    if (fs.existsSync(pythonScript)) {
      try {
        const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
          const p = execFile(
            "python3",
            [pythonScript, "--code", rawContent, "--no-history"],
            { maxBuffer: 10 * 1024 * 1024 },
            (err, stdout, stderr) => {
              if (err) reject(err);
              else resolve({ stdout, stderr });
            }
          );
        });
        prunedOutput = stdout.trim();
      } catch {
        prunedOutput = rawContent;
      }
    }
  } else {
    // Default to TypeScript/JavaScript AST pruner
    detectedLang = "typescript";
    try {
      const res = pruneTypeScriptCode(rawContent);
      prunedOutput = res.pruned;
    } catch {
      prunedOutput = rawContent;
    }
  }

  const prunedChars = prunedOutput.length;
  const prunedTokens = Math.max(1, Math.floor(prunedChars / 4));
  const savedTokens = Math.max(0, origTokens - prunedTokens);
  const reductionPct = origTokens > 0 ? (savedTokens / origTokens) * 100 : 0;
  const savedUsd = (savedTokens / 1_000_000) * 3.0;

  // Record to history ledger
  await recordPruneEvent({
    lang: detectedLang,
    target: "<clipboard>",
    files: 1,
    origChars,
    prunedChars,
    origTokens,
    prunedTokens,
    savedTokens,
    savedUsd,
  });

  return {
    trimmed: prunedOutput,
    lang: detectedLang,
    origTokens,
    prunedTokens,
    savedTokens,
    reductionPct,
    savedUsd,
  };
}

/**
 * Runs the CLI Clipboard Trimmer.
 */
export async function runClipboardCli(): Promise<void> {
  console.log(`\n✂️  [ContextCut Clipboard Trimmer]`);
  console.log(`Reading text from system clipboard...`);

  const raw = await readClipboard();
  if (!raw.trim()) {
    console.log(`⚠️  Your clipboard is empty!`);
    console.log(`👉 Copy some code (Cmd+C) and run 'npx contextcut-mcp clip' again.\n`);
    return;
  }

  const result = await trimClipboardContent(raw);
  await writeClipboard(result.trimmed);

  console.log(`\n⚡ Successfully Trimmed Clipboard!`);
  console.log(`--------------------------------------------------`);
  console.log(`• Detected Language:  ${result.lang.toUpperCase()}`);
  console.log(`• Original Context:   ~${result.origTokens.toLocaleString()} tokens`);
  console.log(`• Trimmed Context:    ~${result.prunedTokens.toLocaleString()} tokens`);
  console.log(`• Reduction:          ${result.reductionPct.toFixed(1)}% savings (~${result.savedTokens.toLocaleString()} tokens saved)`);
  console.log(`• Est. Dollar Saved:  $${result.savedUsd.toFixed(4)} USD`);
  console.log(`--------------------------------------------------`);
  console.log(`✓ Trimmed content is now in your clipboard (Cmd+V).`);
  console.log(`👉 Paste directly into ChatGPT, Gemini, or Claude without burning your 5-hour limit!\n`);
}
