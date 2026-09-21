# ContextCut Roadmap

## Phase 1: Local Beta & Community Validation (Current)
- [x] Implement local AST pruning engine (Python) preserving signatures, types, and docstrings.
- [x] Integrate live telemetry header injection (character and estimated token reduction).
- [x] Build standalone binary compilation pipeline via PyInstaller.
- [x] Wire up Node.js MCP server wrapper (`stdio` transport).
- [x] Publish documentation, benchmark examples (`examples/`), and multi-environment setup guides (`ENVIRONMENTS.md`).
- [ ] Complete community beta rollout with 5-10 peer testers.

## Phase 2: Autonomous Monetization & Self-Serve Infrastructure
- [ ] Implement optional license key validation wrapper (`CONTEXTCUT_LICENSE_KEY`).
- [ ] Set up Merchant of Record integration (e.g., Lemon Squeezy) for automated checkout and global tax compliance.
- [ ] Define free tier limits vs. Pro tier features (advanced custom parsing rules, larger file support).

## Phase 3: Ecosystem Expansion (Future)
- [ ] Evaluate multi-language AST pruning support (e.g., TypeScript/JavaScript, Go).
- [ ] Build aggregate telemetry reporting dashboard for individual Pro users.
- [ ] Assess enterprise/team tier demand based on organic inbound pull.
