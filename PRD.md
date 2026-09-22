# Product Requirements Document (PRD): ContextCut

## 1. Executive Summary & Vision
- **Product Name:** ContextCut
- **Tagline:** Precise AST-Based Context Pruning for AI Coding Agents & LLMs.

### Problem Statement
Current AI coding assistants index entire codebases indiscriminately, flooding LLM context windows with noise. This leads to high token costs (60-80% wasted), slow response latency, and frequent model hallucinations. As codebases grow, the "needle in a haystack" problem intensifies, causing AI agents to lose track of core logic amidst boilerplate and irrelevant implementation details.

### Product Vision
Provide a lightweight, local CLI/middleware engine that parses Abstract Syntax Trees (ASTs) and dependency graphs to pass only the exact relevant code, types, and interface signatures required for a coding task. By shifting from "file-based context" to "logic-based context," ContextCut empowers developers to use smaller, faster models with higher accuracy.

---

## 2. Target Persona & User Journeys

### Personas
- **Primary Persona:** Software Engineers & Lead Developers using AI assistants (Cursor, Claude Dev, Roo Code, GitHub Copilot). They value speed, accuracy, and minimizing distraction.
- **Secondary Persona:** Engineering Managers & CTOs seeking to reduce LLM API overhead costs across team deployments while maintaining high developer velocity.

### Key User Journey
1. **Initiation:** A developer initiates a complex prompt (e.g., "Refactor the authentication middleware to support OAuth2") in their IDE or CLI agent.
2. **Interception:** ContextCut intercepts the request or scans the workspace context, mapping out the imports, AST type definitions, and call chains associated with the relevant files.
3. **Pruning:** The engine automatically trims the context size down to ~3-10% of the original tokens by replacing deep implementation details of peripheral modules with their interface definitions.
4. **Optimization:** The optimized payload is sent to the LLM.
5. **Delivery:** The LLM delivers a faster, highly accurate response at a fraction of the token cost.

---

## 3. Core Functional Requirements

| ID | Requirement Name | Description |
| :--- | :--- | :--- |
| **FR-1** | AST & Dependency Parser | Parse TS/JS, Python, Go, and Rust files into local ASTs to identify structural relationships, direct dependencies, and symbol usage. |
| **FR-2** | Dynamic Token Pruning | Prune full function implementations in non-target files into interface/type signatures while retaining 100% type safety for the LLM. |
| **FR-3** | MCP Server Integration | Provide an MCP (Model Context Protocol) server interface enabling direct plugin integration with Cursor, Roo Code, and Claude Desktop. |
| **FR-4** | Telemetry Dashboard | Provide real-time CLI analytics showing tokens saved, estimated cost savings ($), and context reduction percentage per request. |
| **FR-5** | Configurable Depth | Allow users to define "Context Depth" (e.g., Level 1: Interfaces only; Level 2: Interfaces + shallow bodies; Level 3: Full context). |

---

## 4. Non-Functional Requirements

| ID | Category | Specification |
| :--- | :--- | :--- |
| **NFR-1** | Latency | AST parsing and context extraction overhead must take less than 150ms for repositories up to 100k lines of code (LOC). |
| **NFR-2** | Security & Privacy | 100% local execution. Code structure analysis occurs completely on the developer's machine; no proprietary code is uploaded to ContextCut servers. |
| **NFR-3** | Reliability | Fallback mode to standard context gathering if AST parsing fails or encounters unparseable syntax errors. |
| **NFR-4** | Portability | Distributed with zero external dependencies to ensure seamless installation across macOS, Linux, and Windows. |

---

## 5. Success Metrics & Key Performance Indicators (KPIs)
- **Token Reduction Rate:** Average context size reduction of $\ge$ 70% compared to standard file-level inclusion.
- **Cost Reduction:** Average LLM API bill reduction of $\ge$ 60% per active user per month.
- **Accuracy Improvement:** $\ge$ 20% improvement in first-pass code generation success rate (measured by reduced hallucination of non-existent methods).
- **Developer Latency (TTFT):** Time-to-First-Token response latency decreased by at least 40% due to smaller input prompts.

---

## 6. Release Phases & Roadmap

### Phase 1: MVP (Completed - v1.0.0)
- [x] Core CLI tool release.
- [x] Support for Python AST pruning (multi-file, directory, depth controls).
- [x] Real-time CLI telemetry with token and dollar savings.

### Phase 2: Integration & Multi-Language (Completed - v1.2.0)
- [x] Native MCP Server support with stdio transport and auto-fallback execution.
- [x] Language expansion: Support for TypeScript/JavaScript AST pruning (@babel/parser).
- [x] Paywall license gating for Pro Polyglot capabilities.

### Phase 3: Persistent ROI Ledger & Visual Dashboard (Completed - v1.3.0)
- [x] Persistent local-first append-only ledger (`~/.contextcut/history.jsonl`).
- [x] Terminal interval reporting (`node build/index.js report --interval=weekly`).
- [x] 1-Click Autopilot Mode (`npx contextcut-mcp init`) for Cursor and Claude Desktop.
- [x] Interactive Executive ROI Dashboard CLI server (`npx contextcut-mcp dashboard`) with live auto-sync.
- [x] Client-side privacy-first Web Viewer (`5tra83rstudios.com/viewer`) with drag-and-drop JSONL analysis.
- [x] Executive PDF export for leadership and stakeholder reviews.

### Phase 4: Enterprise & Team Sync (Upcoming - v1.4.0)
- [ ] Enterprise team dashboard with aggregated multi-seat API cost savings analytics.
- [ ] Shared team rulesets for context exclusion (e.g., centralized `.contextcutignore`).
- [ ] Language expansion: Go and Rust AST pruners.
