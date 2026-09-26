# 5tra83r Studios LLC. — AI Safety, Security & Responsible Use Policy
*Operational Safety Guardrails, Ethical AI Charter, and Data Protection Standards for ContextCut and Studio Products.*

---

## 🏛️ Corporate Ownership & Commitment
**ContextCut** is a proprietary software product designed, engineered, and owned exclusively by **5tra83r Studios LLC.**

At 5tra83r Studios LLC., we believe AI software must be built with uncompromising safety guardrails, absolute privacy, and total transparency. As software engineering increasingly integrates large language models (LLMs) and autonomous agents, tools that interface with developer source code bear an immense responsibility to protect sensitive corporate assets, personal credentials, and system integrity.

This document outlines the mandatory AI safety guardrails, security protocols, and ethical principles governing all ContextCut software distributions across CLI, MCP, Web, and Mobile.

---

## 🛡️ Foundational AI Safety Guardrails

### 1. Active Secret & Credential Redaction Guardrail
**The Risk**: When developers explore or analyze repositories with AI assistants, hardcoded `.env` values, API keys, private keys, or session tokens in config files can inadvertently be ingested into LLM context windows, exposing private infrastructure to third-party model providers.

**The ContextCut Guardrail**:
* ContextCut includes an automated **AI Safety Shield** that scans all context prior to delivery.
* High-entropy tokens, including:
  * OpenAI API keys (`sk-...`)
  * Anthropic API keys (`sk-ant-...`)
  * Google AI / Gemini keys (`AIzaSy...`)
  * AWS Access Keys (`AKIA...`)
  * GitHub Personal Access Tokens (`ghp_...`, `github_pat_...`)
  * Private Keys (RSA, OpenSSH, EC)
  * JSON Web Tokens (JWT)
  * Hardcoded password assignments
* Detected secrets are automatically masked in memory (`[REDACTED_SECRET: API_KEY]`) before they can ever reach the LLM or agent.
* Redaction counts are transparently logged in the telemetry header so developers know their credentials were protected.

---

### 2. Zero-Exfiltration & Local-First Processing
**The Risk**: Many developer tools surreptitiously upload code, prompts, or AST metadata to cloud servers for "model training" or server-side analysis, risking proprietary trade secret leaks.

**The ContextCut Guardrail**:
* **100% Local Execution**: All AST parsing, boundary calculation, and pruning take place strictly in-memory on the user’s local workstation or device.
* **Zero Remote Telemetry**: ContextCut transmits **zero lines of code, zero file contents, and zero prompts** to 5tra83r Studios LLC. or any third party.
* **Local Ledger Only**: Telemetry tracking (`~/.contextcut/history.jsonl`) stores only anonymous character counts, token metrics, and timestamps in an auditable plaintext JSON Lines file on the user's computer.

---

### 3. Structural Fidelity & AST Determinism
**The Risk**: AI models frequently hallucinate types, invent non-existent method signatures, or mutate function arguments when attempting to summarize code verbally.

**The ContextCut Guardrail**:
* ContextCut does not use generative AI to summarize code. It uses **deterministic Abstract Syntax Tree (AST) boundary transformation** (`@babel/parser` for TypeScript/JavaScript and Python's native `ast` compiler).
* 100% of function signatures, argument types, return annotations, docstrings, decorators, dataclass fields, and class hierarchies are preserved exactly as written by the engineer.
* Only internal execution bodies are safely stubbed with `pass` or `{ /* stub */ }`. This guarantees the LLM receives syntactically valid, hallucination-free architectural representations.

---

### 4. Anti-Obfuscation & Anti-Malware Safeguards
**The Risk**: Bad actors could theoretically attempt to use context pruners to obscure malicious payloads, conceal security vulnerabilities from AI audit bots, or circumvent LLM safety guidelines.

**The ContextCut Guardrail**:
* ContextCut is strictly licensed for legitimate software architecture analysis, performance optimization, and developer productivity.
* The software must not be used to:
  * Strip, hide, or obfuscate malware, ransomware, backdoors, or malicious exploit chains.
  * Intentionally bypass, defeat, or manipulate safety and alignment filters of third-party LLMs (e.g. Anthropic Claude, OpenAI ChatGPT, Google Gemini).
  * Circumvent intellectual property boundaries or reverse-engineer DRM-protected software without authorization.

---

### 5. Non-Destructive Operation & Human Agency
**The Risk**: AI tools that silently alter or overwrite disk files can cause irreversible data loss or break production builds.

**The ContextCut Guardrail**:
* ContextCut is **read-only and non-destructive**. Pruning operations output lean context to stdout, clipboard, or MCP stdio memory channels.
* Original source files on disk are **never modified, truncated, or deleted** during a context pruning operation.
* Human developers always retain complete oversight and control over their repository state.

---

## 🔒 Security Vulnerability Reporting

5tra83r Studios LLC. takes software security seriously. If you identify a potential security vulnerability, credential scanner bypass, or privacy leak in any ContextCut component, please report it immediately in accordance with our Responsible Disclosure Policy:

* **Security Contact**: `security@5tra83rstudios.com`
* **Response SLA**: Initial acknowledgment within 24 hours; status updates provided every 48 hours until resolved.
* **Coordination**: We ask that you refrain from public disclosure until an official patch has been published.

---

*© 2026 5tra83r Studios LLC. All rights reserved. PROPRIETARY AND CONFIDENTIAL.*
