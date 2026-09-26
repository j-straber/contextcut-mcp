/**
 * ==============================================================================
 * © 2026 5tra83r Studios LLC. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * ContextCut 1-Click Auto-Installer & Desktop Setup Engine
 * ==============================================================================
 */

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TargetApp {
  id: string;
  name: string;
  configPath: string;
  parentDir: string;
  isInstalled: boolean;
  isConfigured: boolean;
}

/**
 * Resolves standard configuration paths across macOS, Windows, and Linux.
 */
export function getAvailableTargets(): TargetApp[] {
  const home = os.homedir();
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";

  const appData = isWin
    ? process.env.APPDATA || path.join(home, "AppData", "Roaming")
    : "";

  const targets: TargetApp[] = [];

  // 1. Claude Desktop
  let claudeConfig = "";
  let claudeParent = "";
  if (isMac) {
    claudeParent = path.join(home, "Library", "Application Support", "Claude");
    claudeConfig = path.join(claudeParent, "claude_desktop_config.json");
  } else if (isWin) {
    claudeParent = path.join(appData, "Claude");
    claudeConfig = path.join(claudeParent, "claude_desktop_config.json");
  } else {
    claudeParent = path.join(home, ".config", "Claude");
    claudeConfig = path.join(claudeParent, "claude_desktop_config.json");
  }

  targets.push({
    id: "claude-desktop",
    name: "Claude Desktop",
    configPath: claudeConfig,
    parentDir: claudeParent,
    isInstalled: fs.existsSync(claudeParent) || (isMac && fs.existsSync("/Applications/Claude.app")),
    isConfigured: checkIsConfigured(claudeConfig),
  });

  // 2. Cursor Editor
  let cursorConfig = "";
  let cursorParent = "";
  if (isMac) {
    cursorParent = path.join(home, ".cursor");
    cursorConfig = path.join(cursorParent, "mcp.json");
  } else if (isWin) {
    cursorParent = path.join(appData, "Cursor");
    cursorConfig = path.join(cursorParent, "mcp.json");
  } else {
    cursorParent = path.join(home, ".cursor");
    cursorConfig = path.join(cursorParent, "mcp.json");
  }

  targets.push({
    id: "cursor",
    name: "Cursor Editor",
    configPath: cursorConfig,
    parentDir: cursorParent,
    isInstalled: fs.existsSync(cursorParent) || (isMac && fs.existsSync("/Applications/Cursor.app")),
    isConfigured: checkIsConfigured(cursorConfig),
  });

  // 3. Google Gemini / Antigravity
  const antigravityParent = path.join(home, ".gemini", "config");
  const antigravityConfig = path.join(antigravityParent, "mcp_config.json");
  targets.push({
    id: "antigravity",
    name: "Google Antigravity / Gemini CLI",
    configPath: antigravityConfig,
    parentDir: antigravityParent,
    isInstalled: fs.existsSync(path.join(home, ".gemini")),
    isConfigured: checkIsConfigured(antigravityConfig),
  });

  // 4. Windsurf Editor
  const windsurfParent = path.join(home, ".codeium", "windsurf");
  const windsurfConfig = path.join(windsurfParent, "mcp_config.json");
  targets.push({
    id: "windsurf",
    name: "Windsurf Editor",
    configPath: windsurfConfig,
    parentDir: windsurfParent,
    isInstalled: fs.existsSync(windsurfParent) || (isMac && fs.existsSync("/Applications/Windsurf.app")),
    isConfigured: checkIsConfigured(windsurfConfig),
  });

  return targets;
}

function checkIsConfigured(configPath: string): boolean {
  if (!fs.existsSync(configPath)) return false;
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const json = JSON.parse(raw);
    return Boolean(json?.mcpServers?.contextcut);
  } catch {
    return false;
  }
}

/**
 * Returns the recommended server execution command.
 */
export function getRecommendedServerConfig(): { command: string; args: string[] } {
  // If running from an active local repository build, prefer node build/index.js if it exists
  const localBuildPath = path.resolve(__dirname, "index.js");
  if (fs.existsSync(localBuildPath) && !localBuildPath.includes("node_modules")) {
    return {
      command: "node",
      args: [localBuildPath],
    };
  }
  // Otherwise default to standard npx distribution
  return {
    command: "npx",
    args: ["-y", "contextcut-mcp"],
  };
}

/**
 * Safely installs or updates ContextCut in a target configuration file.
 */
export function installToTarget(
  target: TargetApp,
  options: { dryRun?: boolean; force?: boolean } = {}
): { success: boolean; message: string; modifiedPath?: string } {
  try {
    const serverConfig = getRecommendedServerConfig();

    let existingData: any = {};
    if (fs.existsSync(target.configPath)) {
      try {
        const raw = fs.readFileSync(target.configPath, "utf-8");
        existingData = JSON.parse(raw);
      } catch {
        existingData = {};
      }
    }

    if (!existingData.mcpServers) {
      existingData.mcpServers = {};
    }

    if (existingData.mcpServers.contextcut && !options.force) {
      return {
        success: true,
        message: `Already configured in ${target.name}`,
        modifiedPath: target.configPath,
      };
    }

    existingData.mcpServers.contextcut = serverConfig;

    if (!options.dryRun) {
      if (!fs.existsSync(target.parentDir)) {
        fs.mkdirSync(target.parentDir, { recursive: true });
      }

      // Backup existing file if present
      if (fs.existsSync(target.configPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = `${target.configPath}.bak-${timestamp}`;
        try {
          fs.copyFileSync(target.configPath, backupPath);
        } catch {}
      }

      fs.writeFileSync(target.configPath, JSON.stringify(existingData, null, 2) + "\n", "utf-8");
    }

    return {
      success: true,
      message: options.dryRun
        ? `[DRY RUN] Would configure ContextCut in ${target.name}`
        : `Successfully configured ContextCut in ${target.name}`,
      modifiedPath: target.configPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to configure ${target.name}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Runs the friendly 1-click CLI installer.
 */
export async function runInstallerCli(args: string[] = []): Promise<void> {
  const isDryRun = args.includes("--dry-run");
  const isForce = args.includes("--force");

  console.log(`\n⚡ =======================================================`);
  console.log(`⚡ ContextCut 1-Click Setup: Workday Battery Saver`);
  console.log(`⚡ Never get locked out of your AI models mid-day.`);
  console.log(`⚡ =======================================================\n`);

  console.log(`Scanning your computer for installed AI tools...\n`);

  const targets = getAvailableTargets();
  const detected = targets.filter((t) => t.isInstalled);

  if (detected.length === 0) {
    console.log(`ℹ No standard AI apps automatically detected in default locations.`);
    console.log(`  Targeting Claude Desktop default config path...`);
    const defaultClaude = targets.find((t) => t.id === "claude-desktop") ?? targets[0]!;
    const res = installToTarget(defaultClaude, { dryRun: isDryRun, force: isForce });
    console.log(`  ${res.success ? "✓" : "✗"} ${res.message}`);
    console.log(`\nConfig file: ${defaultClaude.configPath}\n`);
    return;
  }

  let configuredCount = 0;

  for (const target of detected) {
    const res = installToTarget(target, { dryRun: isDryRun, force: isForce });
    if (res.success) {
      console.log(`✓ [${target.name}]`);
      console.log(`  ${res.message}`);
      console.log(`  Location: ${target.configPath}\n`);
      configuredCount++;
    } else {
      console.log(`✗ [${target.name}]`);
      console.log(`  ${res.message}\n`);
    }
  }

  console.log(`🎉 Setup complete across ${configuredCount} tool(s)!`);
  console.log(`\nWhat happens now?`);
  console.log(`1. Restart your AI apps (e.g. Claude Desktop or Cursor).`);
  console.log(`2. Your AI assistant will automatically use ContextCut to trim background bloat.`);
  console.log(`3. Enjoy full-day AI usage without hitting 5-hour rate limits!\n`);
}
