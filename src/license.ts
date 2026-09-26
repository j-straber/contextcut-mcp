/**
 * ==============================================================================
 * © 2026 5tra83r Studios LLC. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * ContextCut License & Monetization Manager
 * ==============================================================================
 */

export interface LicenseStatus {
  isPro: boolean;
  tier: "Free" | "Pro";
  licenseKey?: string;
  source: "environment" | "argument" | "dev_mode" | "free_tier";
}

export const PURCHASE_URL = "https://5tra83r.lemonsqueezy.com/buy/contextcut-pro";

/**
 * Checks if the current session has valid Pro access.
 * Unlocked via:
 * 1. CONTEXTCUT_LICENSE_KEY environment variable.
 * 2. Explicit license_key parameter.
 * 3. Local development override (NODE_ENV=development or CONTEXTCUT_DEV_MODE=1).
 */
export async function getLicenseStatus(explicitKey?: string): Promise<LicenseStatus> {
  const key = explicitKey || process.env.CONTEXTCUT_LICENSE_KEY;

  if (process.env.NODE_ENV === "development" || process.env.CONTEXTCUT_DEV_MODE === "1") {
    return {
      isPro: true,
      tier: "Pro",
      licenseKey: "DEV_MODE_ACTIVE",
      source: "dev_mode",
    };
  }

  if (!key || key.trim() === "") {
    return {
      isPro: false,
      tier: "Free",
      source: "free_tier",
    };
  }

  // Basic validation: license keys are strings of at least 8 characters
  if (key.length >= 8) {
    return {
      isPro: true,
      tier: "Pro",
      licenseKey: key,
      source: explicitKey ? "argument" : "environment",
    };
  }

  return {
    isPro: false,
    tier: "Free",
    source: "free_tier",
  };
}

/**
 * Validates access to Pro features (e.g. TypeScript/JavaScript pruning).
 * Returns { allowed: true } or { allowed: false, message: string }.
 */
export async function validateProAccess(
  explicitKey?: string
): Promise<{ allowed: boolean; message?: string }> {
  const status = await getLicenseStatus(explicitKey);

  if (status.isPro) {
    return { allowed: true };
  }

  const paywallMessage = `/**
 * [ContextCut Pro Feature Notice]
 * --------------------------------------------------------------------------------
 * TypeScript & JavaScript AST pruning is a ContextCut Pro feature.
 * 
 * • Python AST pruning is 100% free and open-core for everyone forever.
 * • To unlock polyglot AST pruning (TypeScript, TSX, JavaScript, JSX):
 * 
 * 1. Get your lifetime license key: ${PURCHASE_URL}
 * 2. Add your key to your Claude Desktop or Antigravity MCP config:
 * 
 *    "mcpServers": {
 *      "contextcut": {
 *        "command": "node",
 *        "args": ["/path/to/contextcut-mcp/build/index.js"],
 *        "env": {
 *          "CONTEXTCUT_LICENSE_KEY": "YOUR-LICENSE-KEY"
 *        }
 *      }
 *    }
 * --------------------------------------------------------------------------------
 */
`;

  return {
    allowed: false,
    message: paywallMessage,
  };
}
