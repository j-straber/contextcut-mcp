/**
 * ==============================================================================
 * © 2026 5tra83r Studios. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * ContextCut Embedded Dashboard HTML Generator
 * ==============================================================================
 */

export function getDashboardHtml(preloadedRecordsJson: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ContextCut ROI Dashboard | 5tra83r Studios</title>
  <meta name="description" content="Visual cost-benefit analytics and token reduction dashboard for ContextCut. Calculate cumulative AI coding savings.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --bg-primary: #090d16;
      --bg-secondary: #0f172a;
      --bg-card: #131d36;
      --bg-card-hover: #192545;
      --border-color: rgba(255, 255, 255, 0.08);
      --border-glow: rgba(99, 102, 241, 0.3);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-purple: #8b5cf6;
      --accent-indigo: #6366f1;
      --accent-cyan: #06b6d4;
      --accent-green: #10b981;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --radius-full: 9999px;
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-sans);
      line-height: 1.6;
      min-height: 100vh;
      background-image: 
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent),
        radial-gradient(ellipse 60% 40% at 100% 50%, rgba(16, 185, 129, 0.08), transparent);
    }

    .container {
      max-width: 1180px;
      margin: 0 auto;
      padding: 0 24px;
    }

    .navbar {
      border-bottom: 1px solid var(--border-color);
      backdrop-filter: blur(12px);
      background-color: rgba(9, 13, 22, 0.85);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      font-weight: 800;
      font-size: 1.15rem;
      color: #fff;
    }

    .logo-mark {
      background: linear-gradient(135deg, var(--accent-indigo), var(--accent-purple));
      border-radius: var(--radius-sm);
      padding: 4px 8px;
      font-size: 0.9rem;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
      border-color: var(--border-color);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-indigo), var(--accent-purple));
      color: #fff;
    }

    .btn-primary:hover {
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    }

    .dashboard-header {
      padding: 36px 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 20px;
    }

    .header-titles h1 {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .header-titles p {
      color: var(--text-secondary);
      font-size: 0.95rem;
      margin-top: 4px;
    }

    .time-filter-pills {
      display: flex;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      padding: 4px;
      gap: 4px;
    }

    .filter-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      padding: 6px 14px;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-btn.active {
      background: linear-gradient(135deg, var(--accent-indigo), var(--accent-purple));
      color: #fff;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    .dropzone-bar {
      background: rgba(16, 185, 129, 0.05);
      border: 1px dashed rgba(16, 185, 129, 0.3);
      border-radius: var(--radius-md);
      padding: 12px 20px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.875rem;
      color: #a7f3d0;
      transition: all 0.2s ease;
    }

    .dropzone-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin-bottom: 28px;
    }

    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 22px;
      position: relative;
      overflow: hidden;
    }

    .kpi-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-indigo), var(--accent-cyan));
    }

    .kpi-card.green::before {
      background: linear-gradient(90deg, #10b981, #34d399);
    }

    .kpi-label {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .kpi-val {
      font-size: 2rem;
      font-weight: 800;
      font-family: var(--font-mono);
      color: #fff;
    }

    .kpi-val.green { color: #34d399; }
    .kpi-val.cyan { color: #38bdf8; }

    .kpi-sub {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 6px;
    }

    .charts-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }

    .chart-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
    }

    .chart-card h3 {
      font-size: 1.05rem;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .chart-container {
      position: relative;
      height: 250px;
      width: 100%;
    }

    .table-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
      margin-bottom: 40px;
    }

    .table-card h3 {
      font-size: 1.05rem;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .data-table th, .data-table td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .data-table th {
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .data-table code {
      font-family: var(--font-mono);
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      color: #38bdf8;
    }

    .exec-footer {
      border-top: 1px solid var(--border-color);
      padding: 30px 0 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    @media print {
      body { background: #fff !important; color: #000 !important; }
      .navbar, .dropzone-bar, .time-filter-pills, .btn { display: none !important; }
      .kpi-card, .chart-card, .table-card { border: 1px solid #ccc !important; background: #fff !important; box-shadow: none !important; }
      .kpi-val, .kpi-label, .header-titles h1 { color: #000 !important; }
    }

    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: 1fr 1fr; }
      .charts-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <header class="navbar">
    <div class="container">
      <div class="nav-inner">
        <a href="https://5tra83rstudios.com" target="_blank" class="brand-logo">
          <span class="logo-mark">⚡</span>
          <span>ContextCut Dashboard</span>
        </a>
        <div class="nav-actions">
          <button class="btn btn-secondary" onclick="window.print()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <path d="M6 14h12v8H6z"/>
            </svg>
            Export Executive PDF
          </button>
          <a href="https://5tra83rstudios.com/#pricing" target="_blank" class="btn btn-primary">Upgrade Pro — $29</a>
        </div>
      </div>
    </div>
  </header>

  <main class="container">
    <section class="dashboard-header">
      <div class="header-titles">
        <h1>Executive ROI & Token Dashboard</h1>
        <p>Live measured financial return and latency optimization powered by ContextCut.</p>
      </div>

      <div class="time-filter-pills">
        <button class="filter-btn" data-interval="daily" onclick="setTimeFilter('daily')">Past 24h</button>
        <button class="filter-btn active" data-interval="weekly" onclick="setTimeFilter('weekly')">Past 7 Days</button>
        <button class="filter-btn" data-interval="monthly" onclick="setTimeFilter('monthly')">Past 30 Days</button>
        <button class="filter-btn" data-interval="all_time" onclick="setTimeFilter('all_time')">All-Time</button>
      </div>
    </section>

    <div class="dropzone-bar">
      <div class="dropzone-left">
        <span>📁</span>
        <span id="sourceStatus">Connected to live local ledger at <code>~/.contextcut/history.jsonl</code></span>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card green">
        <div class="kpi-label">Total Cost Saved</div>
        <div class="kpi-val green" id="statCostSaved">$0.00</div>
        <div class="kpi-sub">Calculated @ $3.00/1M tokens (Claude/GPT-4o)</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Tokens Cut</div>
        <div class="kpi-val cyan" id="statTokensSaved">0</div>
        <div class="kpi-sub" id="statReductionPct">0% overall reduction</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">LLM Latency Saved</div>
        <div class="kpi-val" id="statLatencySaved">0m</div>
        <div class="kpi-sub">Reduced attention & context ingestion</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Pruning Operations</div>
        <div class="kpi-val" id="statRunsCount">0</div>
        <div class="kpi-sub" id="statFilesCount">Across 0 files</div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <h3>
          <span>Daily Token Savings Velocity</span>
          <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">Tokens saved per day</span>
        </h3>
        <div class="chart-container">
          <canvas id="timelineChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h3>
          <span>Savings by Language</span>
          <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">Token volume</span>
        </h3>
        <div class="chart-container">
          <canvas id="langChart"></canvas>
        </div>
      </div>
    </div>

    <div class="table-card">
      <h3>Top Context Optimizations</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Module / File</th>
            <th>Prune Runs</th>
            <th>Tokens Saved</th>
            <th>Est. Dollars Saved</th>
          </tr>
        </thead>
        <tbody id="topTargetsBody">
          <tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No records found for this period.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="exec-footer">
      <div>
        <strong>ContextCut Enterprise Telemetry Engine</strong> | Local Instance
      </div>
      <div>
        5tra83r Studios &copy; 2026
      </div>
    </div>
  </main>

  <script>
    let rawRecords = ${preloadedRecordsJson};

    let currentInterval = "weekly";
    let timelineChart = null;
    let langChart = null;

    function setTimeFilter(interval) {
      currentInterval = interval;
      document.querySelectorAll(".filter-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-interval") === interval);
      });
      renderDashboard();
    }

    function filterRecords() {
      const nowMs = Date.now();
      let cutoff = 0;
      if (currentInterval === "daily") cutoff = nowMs - 24 * 60 * 60 * 1000;
      else if (currentInterval === "weekly") cutoff = nowMs - 7 * 24 * 60 * 60 * 1000;
      else if (currentInterval === "monthly") cutoff = nowMs - 30 * 24 * 60 * 60 * 1000;

      return rawRecords.filter(r => {
        if (!cutoff) return true;
        const t = new Date(r.ts).getTime();
        return !isNaN(t) && t >= cutoff;
      });
    }

    function renderDashboard() {
      const filtered = filterRecords();

      let totalRuns = filtered.length;
      let totalFiles = 0;
      let totalOrigTokens = 0;
      let totalPrunedTokens = 0;
      let totalSavedTokens = 0;
      let totalSavedUsd = 0;

      const langMap = {};
      const targetMap = {};
      const dayMap = {};

      filtered.forEach(r => {
        totalFiles += (r.files || 1);
        totalOrigTokens += (r.origTokens || 0);
        totalPrunedTokens += (r.prunedTokens || 0);
        totalSavedTokens += (r.savedTokens || 0);
        totalSavedUsd += (r.savedUsd || 0);

        const l = (r.lang || "unknown").toLowerCase();
        langMap[l] = (langMap[l] || 0) + (r.savedTokens || 0);

        if (r.target) {
          if (!targetMap[r.target]) targetMap[r.target] = { runs: 0, savedTokens: 0, savedUsd: 0 };
          targetMap[r.target].runs += 1;
          targetMap[r.target].savedTokens += (r.savedTokens || 0);
          targetMap[r.target].savedUsd += (r.savedUsd || 0);
        }

        const dayKey = r.ts ? r.ts.substring(0, 10) : "today";
        dayMap[dayKey] = (dayMap[dayKey] || 0) + (r.savedTokens || 0);
      });

      const reductionPct = totalOrigTokens > 0 ? ((totalSavedTokens / totalOrigTokens) * 100).toFixed(1) : "0.0";
      const latencySeconds = totalSavedTokens / 100;
      const latencyStr = latencySeconds >= 3600 
        ? (latencySeconds / 3600).toFixed(1) + " hrs" 
        : Math.max(1, Math.round(latencySeconds / 60)) + " mins";

      document.getElementById("statCostSaved").textContent = "$" + totalSavedUsd.toFixed(4);
      document.getElementById("statTokensSaved").textContent = totalSavedTokens.toLocaleString();
      document.getElementById("statReductionPct").textContent = reductionPct + "% overall reduction";
      document.getElementById("statLatencySaved").textContent = latencyStr;
      document.getElementById("statRunsCount").textContent = totalRuns.toLocaleString();
      document.getElementById("statFilesCount").textContent = "Across " + totalFiles.toLocaleString() + " files";

      const topTargets = Object.entries(targetMap)
        .map(([target, s]) => ({ target, ...s }))
        .sort((a, b) => b.savedTokens - a.savedTokens)
        .slice(0, 6);

      const tableBody = document.getElementById("topTargetsBody");
      if (topTargets.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No records found for this period.</td></tr>';
      } else {
        tableBody.innerHTML = topTargets.map(t => 
          '<tr><td><code>' + t.target + '</code></td><td>' + t.runs + '</td><td><strong>' + t.savedTokens.toLocaleString() + '</strong> tokens</td><td style="color: #34d399; font-weight: 600;">$' + t.savedUsd.toFixed(4) + '</td></tr>'
        ).join("");
      }

      renderCharts(dayMap, langMap);
    }

    function renderCharts(dayMap, langMap) {
      const sortedDays = Object.keys(dayMap).sort();
      const dayTokens = sortedDays.map(d => dayMap[d]);

      if (timelineChart) timelineChart.destroy();
      const ctxTimeline = document.getElementById("timelineChart").getContext("2d");
      timelineChart = new Chart(ctxTimeline, {
        type: "bar",
        data: {
          labels: sortedDays.map(d => d.slice(5)),
          datasets: [{
            label: "Tokens Saved",
            data: dayTokens,
            backgroundColor: "rgba(56, 189, 248, 0.8)",
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: "#64748b" } },
            y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#64748b" } }
          }
        }
      });

      if (langChart) langChart.destroy();
      const ctxLang = document.getElementById("langChart").getContext("2d");
      const langLabels = Object.keys(langMap).map(l => l.charAt(0).toUpperCase() + l.slice(1));
      const langData = Object.values(langMap);

      langChart = new Chart(ctxLang, {
        type: "doughnut",
        data: {
          labels: langLabels,
          datasets: [{
            data: langData,
            backgroundColor: ["#38bdf8", "#8b5cf6", "#10b981", "#f59e0b"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { color: "#cbd5e1", boxWidth: 12 } }
          }
        }
      });
    }

    renderDashboard();
  </script>
</body>
</html>`;
}
