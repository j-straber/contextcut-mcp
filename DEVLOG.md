# ContextCut Development Log & Architecture Notes

## Architectural Decisions

### 1. Local-First & Deterministic AST Pruning
- **Decision:** Use Python's built-in `ast` module to strip function/method bodies down to `pass` statements while preserving signatures, types, and docstrings.
- **Rationale:** 
  - **Zero Data Leakage:** Source code never leaves the local machine.
  - **Deterministic Output:** Same file in, same pruned result out—eliminating the risk of an LLM model summarizing away critical architectural details.
  - **Cost & Speed:** No API round-trip overhead or token cost just to reduce token bloat.

### 2. Live Telemetry Headers
- **Decision:** Automatically prepend a block comment containing original character/token estimates, pruned sizes, and exact percentage reduction directly into the file payload.
- **Rationale:** Provides developers and agents with immediate, verifiable positive reinforcement and real-time optimization metrics on every run.

### 3. Platform Independence via MCP
- **Decision:** Decouple the core engine from any specific IDE by compiling the Python engine into a standalone binary (`./bin/contextcut`) managed by a lightweight Node.js MCP server.
- **Rationale:** Ensures seamless compatibility across any MCP-compliant environment (Claude Desktop, Cursor, custom CLI/Python agent harnesses).

## Business & Monetization Strategy

### The Phased Approach
- **Initial Model:** Self-serve developer tool with an optional Pro tier gated by license keys.
- **Why:** Maximizes automation, minimizes administrative overhead (no manual invoicing, legal redlines, or custom enterprise security reviews), and leverages a Merchant of Record (like Lemon Squeezy) to handle global tax compliance out of the box.
- **Future Scale:** Keep the door open for enterprise/team inquiries organically, but prioritize passive, touchless self-serve mechanics to protect founder time.
