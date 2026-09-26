/**
 * ==============================================================================
 * © 2026 5tra83r Studios LLC. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * ContextCut AI Safety & Sensitive Data Redaction Guardrail
 * ==============================================================================
 */

export interface SafetyScanResult {
  sanitized: string;
  secretsRedacted: number;
  redactedTypes: string[];
}

interface SecretPattern {
  name: string;
  pattern: RegExp;
  replacement: (match: string, ...groups: string[]) => string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  // 1. Private Keys (RSA, EC, OpenSSH, etc.)
  {
    name: "Private Key",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: () => "[REDACTED_SECRET: PRIVATE_KEY]",
  },
  // 2. Anthropic API Keys (sk-ant-...)
  {
    name: "Anthropic API Key",
    pattern: /sk-ant-[a-zA-Z0-9_\-]{20,}/g,
    replacement: () => "[REDACTED_SECRET: ANTHROPIC_API_KEY]",
  },
  // 3. OpenAI API Keys (sk-...)
  {
    name: "OpenAI API Key",
    pattern: /sk-[a-zA-Z0-9_\-]{30,}/g,
    replacement: () => "[REDACTED_SECRET: OPENAI_API_KEY]",
  },
  // 4. Google AI / Gemini API Keys (AIzaSy...)
  {
    name: "Google AI API Key",
    pattern: /AIza[a-zA-Z0-9_\-]{30,40}/g,
    replacement: () => "[REDACTED_SECRET: GOOGLE_API_KEY]",
  },
  // 5. AWS Access Key IDs (AKIA...)
  {
    name: "AWS Access Key",
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    replacement: () => "[REDACTED_SECRET: AWS_ACCESS_KEY]",
  },
  // 6. GitHub Personal Access Tokens (ghp_..., github_pat_...)
  {
    name: "GitHub Token",
    pattern: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{30,})\b/g,
    replacement: () => "[REDACTED_SECRET: GITHUB_TOKEN]",
  },
  // 7. JSON Web Tokens (JWT)
  {
    name: "JWT Bearer Token",
    pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
    replacement: () => "[REDACTED_SECRET: JWT_TOKEN]",
  },
  // 8. Explicit credential assignments (password = "...", api_secret = "...")
  {
    name: "Hardcoded Credential",
    pattern: /((?:password|passwd|api_secret|client_secret|auth_token)\s*[:=]\s*["'])([^"']{6,})(["'])/gi,
    replacement: (_match, prefix, _secret, suffix) => `${prefix}[REDACTED_SECRET: CREDENTIAL]${suffix}`,
  },
];

/**
 * Scans code content, redacting sensitive credentials and API tokens
 * before they can be ingested by third-party LLMs or external agents.
 */
export function applyAiSafetyGuardrails(sourceCode: string): SafetyScanResult {
  if (!sourceCode) {
    return { sanitized: sourceCode, secretsRedacted: 0, redactedTypes: [] };
  }

  let sanitized = sourceCode;
  let totalRedacted = 0;
  const redactedTypesSet = new Set<string>();

  for (const { name, pattern, replacement } of SECRET_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches && matches.length > 0) {
      totalRedacted += matches.length;
      redactedTypesSet.add(name);
      sanitized = sanitized.replace(pattern, replacement as any);
    }
  }

  return {
    sanitized,
    secretsRedacted: totalRedacted,
    redactedTypes: Array.from(redactedTypesSet),
  };
}
