import { describe, it } from "node:test";
import assert from "node:assert";
import { applyAiSafetyGuardrails } from "../build/safety_guardrail.js";
import { pruneTypeScriptCode } from "../build/ts_pruner.js";
import { trimClipboardContent } from "../build/clipboard.js";

describe("5tra83r Studios LLC. AI Safety & Secret Redaction Guardrails", () => {
  it("redacts private keys (RSA/EC/SSH)", () => {
    const raw = `
const privateKey = \`-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3v9t9b3v9t9b3v9t9b3v9t9b3v9t9b3v9t9b3v9t9b3v9t9b
-----END RSA PRIVATE KEY-----\`;
`;
    const res = applyAiSafetyGuardrails(raw);
    assert.strictEqual(res.secretsRedacted, 1);
    assert.ok(res.redactedTypes.includes("Private Key"));
    assert.ok(!res.sanitized.includes("MIIEowIBAAKCAQEA"));
    assert.ok(res.sanitized.includes("[REDACTED_SECRET: PRIVATE_KEY]"));
  });

  it("redacts Anthropic API keys (sk-ant-...)", () => {
    const raw = `const client = new Anthropic({ apiKey: "sk-ant-api03-abcdef12345678901234567890_xyz" });`;
    const res = applyAiSafetyGuardrails(raw);
    assert.strictEqual(res.secretsRedacted, 1);
    assert.ok(res.redactedTypes.includes("Anthropic API Key"));
    assert.ok(!res.sanitized.includes("sk-ant-api03-"));
    assert.ok(res.sanitized.includes("[REDACTED_SECRET: ANTHROPIC_API_KEY]"));
  });

  it("redacts OpenAI API keys (sk-...)", () => {
    const raw = `const openai = new OpenAI({ apiKey: "sk-proj-1234567890abcdefghijklmnopqrstuvwx" });`;
    const res = applyAiSafetyGuardrails(raw);
    assert.strictEqual(res.secretsRedacted, 1);
    assert.ok(res.redactedTypes.includes("OpenAI API Key"));
    assert.ok(!res.sanitized.includes("sk-proj-1234567890"));
    assert.ok(res.sanitized.includes("[REDACTED_SECRET: OPENAI_API_KEY]"));
  });

  it("redacts Google AI / Gemini API keys (AIzaSy...)", () => {
    const raw = `const GEMINI_KEY = "AIzaSyB1234567890abcdef1234567890abcde";`;
    const res = applyAiSafetyGuardrails(raw);
    assert.strictEqual(res.secretsRedacted, 1);
    assert.ok(res.redactedTypes.includes("Google AI API Key"));
    assert.ok(!res.sanitized.includes("AIzaSyB1234567890"));
    assert.ok(res.sanitized.includes("[REDACTED_SECRET: GOOGLE_API_KEY]"));
  });

  it("redacts AWS Access Keys (AKIA...)", () => {
    const raw = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;
    const res = applyAiSafetyGuardrails(raw);
    assert.strictEqual(res.secretsRedacted, 1);
    assert.ok(res.redactedTypes.includes("AWS Access Key"));
    assert.ok(!res.sanitized.includes("AKIAIOSFODNN7EXAMPLE"));
    assert.ok(res.sanitized.includes("[REDACTED_SECRET: AWS_ACCESS_KEY]"));
  });

  it("redacts GitHub tokens (ghp_...)", () => {
    const raw = `const token = "ghp_123456789012345678901234567890123456";`;
    const res = applyAiSafetyGuardrails(raw);
    assert.strictEqual(res.secretsRedacted, 1);
    assert.ok(res.redactedTypes.includes("GitHub Token"));
    assert.ok(!res.sanitized.includes("ghp_123456789012345678901234567890123456"));
    assert.ok(res.sanitized.includes("[REDACTED_SECRET: GITHUB_TOKEN]"));
  });

  it("redacts JWT bearer tokens", () => {
    const raw = `const authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";`;
    const res = applyAiSafetyGuardrails(raw);
    assert.strictEqual(res.secretsRedacted, 1);
    assert.ok(res.redactedTypes.includes("JWT Bearer Token"));
    assert.ok(!res.sanitized.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
    assert.ok(res.sanitized.includes("[REDACTED_SECRET: JWT_TOKEN]"));
  });

  it("redacts hardcoded passwords and secrets", () => {
    const raw = `const config = { password: "SuperSecretPassword123!", api_secret: "AnotherSensitiveKey123" };`;
    const res = applyAiSafetyGuardrails(raw);
    assert.ok(res.secretsRedacted >= 2);
    assert.ok(!res.sanitized.includes("SuperSecretPassword123!"));
    assert.ok(!res.sanitized.includes("AnotherSensitiveKey123"));
  });

  it("pruneTypeScriptCode integrates safety guardrail into AST pruning", () => {
    const source = `
export class AuthService {
  private apiKey = "sk-proj-1234567890abcdefghijklmnopqrstuvwx";

  async authenticate(token: string): Promise<boolean> {
    const verified = token === this.apiKey;
    return verified;
  }
}
`;
    const result = pruneTypeScriptCode(source);
    // Method body should be stubbed out
    assert.ok(result.pruned.includes("{ /* stub */ }"));
    // API key in property initializer must be redacted
    assert.ok(!result.pruned.includes("sk-proj-1234567890abcdefghijklmnopqrstuvwx"));
    assert.ok(result.pruned.includes("[REDACTED_SECRET: OPENAI_API_KEY]"));
    assert.strictEqual(result.secretsRedacted, 1);
    assert.ok(result.redactedTypes.includes("OpenAI API Key"));
  });

  it("trimClipboardContent protects clipboard content with AI safety shield", async () => {
    const clipInput = `
export const GEMINI_API_KEY = "AIzaSyB1234567890abcdef1234567890abcde";

export function callGemini(prompt: string): string {
  const endpoint = "https://generativelanguage.googleapis.com";
  return endpoint + prompt;
}
`;
    const res = await trimClipboardContent(clipInput);
    assert.ok(!res.trimmed.includes("AIzaSyB1234567890abcdef1234567890abcde"));
    assert.ok(res.trimmed.includes("[REDACTED_SECRET: GOOGLE_API_KEY]"));
    assert.strictEqual(res.secretsRedacted, 1);
  });
});
