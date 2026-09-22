# ContextCut MCP Server (v1.3.0 - Polyglot & ROI Analytics)

[![Website](https://img.shields.io/badge/Website-5tra83rStudios.com-purple.svg)](https://5tra83rstudios.com)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compliant-brightgreen.svg)](https://modelcontextprotocol.io)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![Node](https://img.shields.io/badge/Node-18+-green.svg)](https://nodejs.org)

**ContextCut** is a local-first, AST-based code context pruner for LLMs and AI coding agents (Claude Desktop, Cursor, Antigravity, Roo Code) via the **Model Context Protocol (MCP)**.

It parses Python and TypeScript/JavaScript files and directories, stripping out internal function and method bodies down to stubs while retaining 100% of signatures, interfaces, type hints, dataclasses, and docstrings.

---

## 📸 Verified Live in Claude Desktop

| TypeScript AST Pruning (48.1% Token Reduction) | Python Architecture Analysis (55.2% Token Reduction) |
| :---: | :---: |
| <img src="assets/demo_typescript.png" width="450" alt="Claude Pruning TypeScript" /> | <img src="assets/demo_python.png" width="450" alt="Claude Pruning Python" /> |

---

## ⚡ What it Does

```python
# Before ContextCut (~350 tokens of internal loops, regex, and logging):
def process_data(uri: str) -> dict:
    """Loads and normalizes schema."""
    if not uri:
        raise ValueError("Invalid")
    # ... 40 lines of heavy implementation logic ...
    return result

# After ContextCut (~35 tokens, 90% reduction):
def process_data(uri: str) -> dict:
    """Loads and normalizes schema."""
    pass
```

### Real-Time Telemetry Header
Every pruned output automatically injects an instant token and cost savings summary:

```python
"""
[ContextCut Telemetry]
----------------------------------------
Files Pruned:   3
Original Size:  14,250 chars (~3,562 tokens)
Pruned Size:    3,810 chars (~952 tokens)
Token Savings:  73.3% reduction (~2,610 tokens saved)
Est. Cost Saved: $0.0078 per prompt (@ $3.00/1M tokens)
----------------------------------------
"""
```

---

## 📊 Persistent ROI Analytics & Reporting (New in v1.3.0)

ContextCut automatically records cumulative token and dollar savings to a private, local append-only ledger at `~/.contextcut/history.jsonl`. 

* **100% Local & Private**: Only anonymous token counts and timestamps are logged. No source code or prompts ever leave your machine.
* **Quantifiable ROI**: Generate aggregated cost-benefit reports on any interval (daily, weekly, monthly, or all-time).

### Terminal CLI Report:
```bash
# View all-time savings report
node build/index.js report

# View weekly report
node build/index.js report --interval=weekly

# Raw JSON output for custom dashboards
node build/index.js report --interval=monthly --json
```

### 📈 Visual Interactive Dashboard (Web UI & CLI):
Launch an interactive visual dashboard in your browser to visualize savings over time, track top pruned files, and export executive PDF reports:

<p align="center">
  <img src="assets/dashboard_preview.png" width="780" alt="ContextCut Executive ROI & Token Dashboard" />
</p>

```bash
# Launch offline visual dashboard in your default browser:
node build/index.js dashboard
# Or when installed via npm:
npx contextcut-mcp dashboard
```

* **Live Dynamic Sync**: Automatically refreshes live as your AI coding agents prune files in real-time.
* **Executive PDF Export**: One-click print-ready formatted report for leadership and CFO reviews.
* **100% Client-Side Web Viewer**: Drag-and-drop your `~/.contextcut/history.jsonl` anytime at 👉 **[5tra83rstudios.com/viewer](https://5tra83rstudios.com/viewer/)** (zero telemetry leaves your machine).

---

## 🚀 Quick Start

### ⚡ 1. 1-Click Automated Machine Setup (Zero JSON Editing)
Connect ContextCut to all your installed AI desktop apps in 2 seconds:

```bash
# Automatically finds Claude Desktop, Cursor, Antigravity, and Windsurf:
npx contextcut-mcp install
```

### ✂️ 2. Clipboard Quick-Trimmer (For Web ChatGPT & Gemini)
Using ChatGPT or Gemini in your web browser? Prevent the dreaded **5-hour usage limit lockout**:

```bash
# 1. Copy bloated code or functions to clipboard (Cmd+C)
# 2. Run the quick-trimmer:
npx contextcut-mcp clip
# 3. Paste trimmed interfaces directly into ChatGPT / Gemini (Cmd+V)!
```
> Or trim code 100% online directly in your browser: 👉 **[5tra83rstudios.com/viewer/#trimmer](https://5tra83rstudios.com/viewer/#trimmer)**

---

### 3. Enable Agent Autopilot Mode (Recommended)
Never forget to use ContextCut again. Run this 1-click command inside any project directory:

```bash
node /ABSOLUTE/PATH/TO/contextcut-mcp/build/index.js init
# Or when installed via npm:
npx contextcut-mcp init
```

This automatically writes the Autopilot rule to your `.cursorrules` and `CLAUDE.md`:
```markdown
# ContextCut Agent Autopilot Rule
# -----------------------------------------------------------------------------
# When exploring, surveying, or analyzing code architecture, class definitions,
# or public API interfaces, ALWAYS invoke the `prune_code_context` MCP tool first
# to eliminate token bloat. Only inspect raw, unpruned function bodies if you are
# explicitly modifying the internal implementation of that specific function.
# -----------------------------------------------------------------------------
```
Your agents in Cursor, Claude Desktop, and Antigravity will now automatically route code through ContextCut before analyzing architecture, slashing token consumption on autopilot!

---

## 🛠 Available Tools, Prompts & Resources

### Tool: `prune_code_context`
* `target_path`: Path to a source file or directory (Python, TypeScript, or JavaScript).
* `code_content`: Optional raw code string to prune directly in-memory.
* `language`: Optional language hint (`"python"`, `"typescript"`, or `"javascript"`).
* `glob_pattern`: Optional filter for directory scans (default: `*.py` or `*.ts`).
* `depth`:
  * `"interfaces_only"` (default): Preserves docstrings, signatures, and types.
  * `"minimal"`: Strips docstrings for maximum token compression.

### Tool: `get_savings_report`
Generates an aggregated cost-benefit ROI report over a specified interval.
* `interval`: `"daily"`, `"weekly"`, `"monthly"`, or `"all_time"` (default: `"all_time"`).
* `format`: `"markdown"` (default) or `"json"`.

### Tool: `check_license`
Validates license tier status (Free Core vs Pro Polyglot).

### Prompt: `analyze_architecture`
Guides your AI agent to inspect a repository's high-level architecture using pruned interface stubs without getting lost in implementation noise.

### Resource: `contextcut://pruned/{filepath}`
Exposes on-demand pruned stubs as native MCP readable resources.


---

## 🧪 Testing

Run the automated test suite:
```bash
npm test
# Or: python3 -m unittest discover -s tests
```

---

## 💼 Business & Monetization
See [MONETIZATION.md](MONETIZATION.md) for the complete Go-To-Market roadmap, Lemon Squeezy payment integration, and community registry launch guide.

---

## 📄 License
© 2026 5tra83r Studios. All rights reserved.
