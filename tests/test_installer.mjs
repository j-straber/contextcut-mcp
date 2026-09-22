import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getAvailableTargets,
  installToTarget,
} from "../build/installer.js";
import { trimClipboardContent } from "../build/clipboard.js";

describe("ContextCut 1-Click Installer & Clipboard Trimmer", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "contextcut-install-test-"));
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it("getAvailableTargets returns standard targets", () => {
    const targets = getAvailableTargets();
    assert.ok(targets.length >= 3);
    const ids = targets.map((t) => t.id);
    assert.ok(ids.includes("claude-desktop"));
    assert.ok(ids.includes("cursor"));
    assert.ok(ids.includes("antigravity"));
  });

  it("installToTarget injects contextcut safely into mock config", () => {
    const configFile = path.join(tempDir, "claude_desktop_config.json");
    fs.writeFileSync(
      configFile,
      JSON.stringify({
        mcpServers: {
          existingServer: { command: "node", args: ["test.js"] },
        },
      }),
      "utf-8"
    );

    const mockTarget = {
      id: "mock-claude",
      name: "Mock Claude Desktop",
      configPath: configFile,
      parentDir: tempDir,
      isInstalled: true,
      isConfigured: false,
    };

    const res = installToTarget(mockTarget, { force: true });
    assert.strictEqual(res.success, true);

    const updated = JSON.parse(fs.readFileSync(configFile, "utf-8"));
    assert.ok(updated.mcpServers.existingServer, "Preserved existing server");
    assert.ok(updated.mcpServers.contextcut, "Added contextcut server");
    assert.ok(updated.mcpServers.contextcut.command, "Has command");
  });

  it("installToTarget respects dryRun flag", () => {
    const configFile = path.join(tempDir, "empty_config.json");
    fs.writeFileSync(configFile, JSON.stringify({}), "utf-8");

    const mockTarget = {
      id: "mock-target",
      name: "Mock Target",
      configPath: configFile,
      parentDir: tempDir,
      isInstalled: true,
      isConfigured: false,
    };

    const res = installToTarget(mockTarget, { dryRun: true });
    assert.strictEqual(res.success, true);
    assert.ok(res.message.includes("[DRY RUN]"));

    const content = JSON.parse(fs.readFileSync(configFile, "utf-8"));
    assert.strictEqual(content.mcpServers, undefined, "Did not modify file in dry-run");
  });

  it("trimClipboardContent prunes sample TypeScript code and returns savings metrics", async () => {
    const bloatedTs = `
      export class OrderService {
        constructor(private db: Database) {}

        async processOrder(orderId: string): Promise<OrderResult> {
          const raw = await this.db.find(orderId);
          if (!raw) {
            throw new Error("Order not found");
          }
          let total = 0;
          for (const item of raw.items) {
            total += item.price * item.quantity;
          }
          return { orderId, total, status: "completed" };
        }
      }
    `;

    const result = await trimClipboardContent(bloatedTs);
    assert.strictEqual(result.lang, "typescript");
    assert.ok(result.reductionPct > 30, "Reduced token size by at least 30%");
    assert.ok(result.savedTokens > 0, "Saved tokens");
    assert.ok(result.trimmed.includes("{ /* stub */ }"), "Replaced method body with stub");
  });
});
