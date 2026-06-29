import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const SUMMARY_PATH = process.argv[2] || "summary.json";
const OUTPUT_DIR = process.argv[3] || "benchmark-report";

const DEFAULT_METRICS = {
  requests: "n/a",
  avg: "n/a",
  min: "n/a",
  med: "n/a",
  max: "n/a",
  p90: "n/a",
  p95: "n/a",
  p99: "n/a",
  failed_rate: "n/a",
  checks_rate: "n/a",
};

function round(val) {
  if (typeof val !== "number") return val;
  return Math.round(val * 100) / 100;
}

function loadMetrics() {
  if (!existsSync(SUMMARY_PATH)) {
    console.error("summary.json not found");
    return DEFAULT_METRICS;
  }

  const raw = readFileSync(SUMMARY_PATH, "utf8");
  const data = JSON.parse(raw);
  const m = data.metrics || {};

  function val(key, sub) {
    const metric = m[key];
    if (!metric) return "n/a";
    const v = metric[sub];
    return v !== undefined && v !== null ? round(v) : "n/a";
  }

  return {
    requests: val("http_reqs", "count"),
    avg: val("http_req_duration", "avg"),
    min: val("http_req_duration", "min"),
    med: val("http_req_duration", "med"),
    max: val("http_req_duration", "max"),
    p90: val("http_req_duration", "p(90)"),
    p95: val("http_req_duration", "p(95)"),
    p99: val("http_req_duration", "p(99)"),
    failed_rate: val("http_req_failed", "rate"),
    checks_rate: val("checks", "rate"),
  };
}

function buildHtml(metrics) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const vus = process.env["K6_VUS"] || "?";
  const duration = process.env["K6_DURATION"] || "?";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Benchmark Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0d1117; color: #e6edf3; padding: 2rem;
    display: flex; flex-direction: column; align-items: center;
  }
  .container { max-width: 800px; width: 100%; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .subtitle { color: #8b949e; font-size: 0.875rem; margin-bottom: 2rem; }
  .grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem; margin-bottom: 2rem;
  }
  .card {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 1rem; text-align: center;
  }
  .card .value { font-size: 1.75rem; font-weight: 600; color: #58a6ff; }
  .card .label { font-size: 0.75rem; color: #8b949e; margin-top: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .card.fail .value { color: #f85149; }
  .card.ok .value { color: #3fb950; }
  .card.warn .value { color: #d29922; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
  th, td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #21262d; font-size: 0.875rem; }
  th { color: #8b949e; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; }
  td { font-variant-numeric: tabular-nums; }
  .note { color: #8b949e; font-size: 0.8rem; border-top: 1px solid #21262d; padding-top: 1rem; }
  @media (max-width: 600px) { .grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<div class="container">
  <h1>Benchmark Report</h1>
  <p class="subtitle">${ts} &middot; ${vus} VUs &middot; ${duration}</p>

  <div class="grid">
    <div class="card">
      <div class="value">${metrics.requests}</div>
      <div class="label">HTTP Requests</div>
    </div>
    <div class="card">
      <div class="value">${metrics.avg} ms</div>
      <div class="label">Avg Duration</div>
    </div>
    <div class="card">
      <div class="value">${metrics.p95} ms</div>
      <div class="label">P95 Duration</div>
    </div>
    <div class="card">
      <div class="value">${metrics.p99} ms</div>
      <div class="label">P99 Duration</div>
    </div>
    <div class="card ${metrics.failed_rate !== "n/a" && Number(metrics.failed_rate) > 0.01 ? "fail" : "ok"}">
      <div class="value">${metrics.failed_rate !== "n/a" ? (Number(metrics.failed_rate) * 100).toFixed(2) + "%" : "n/a"}</div>
      <div class="label">Failure Rate</div>
    </div>
    <div class="card ${metrics.checks_rate !== "n/a" && Number(metrics.checks_rate) < 0.99 ? "warn" : "ok"}">
      <div class="value">${metrics.checks_rate !== "n/a" ? (Number(metrics.checks_rate) * 100).toFixed(2) + "%" : "n/a"}</div>
      <div class="label">Checks Pass Rate</div>
    </div>
  </div>

  <h2 style="font-size:1rem;margin-bottom:0.75rem">Latency Distribution</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Minimum</td><td>${metrics.min} ms</td></tr>
    <tr><td>Median</td><td>${metrics.med} ms</td></tr>
    <tr><td>Average</td><td>${metrics.avg} ms</td></tr>
    <tr><td>P90</td><td>${metrics.p90} ms</td></tr>
    <tr><td>P95</td><td>${metrics.p95} ms</td></tr>
    <tr><td>P99</td><td>${metrics.p99} ms</td></tr>
    <tr><td>Maximum</td><td>${metrics.max} ms</td></tr>
  </table>

  <p class="note">
    POST /users measures enqueue latency and 202 acceptance, not persistence latency.
    Generated by k6 benchmark workflow.
  </p>
</div>
</body>
</html>`;
}

const metrics = loadMetrics();

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

writeFileSync(`${OUTPUT_DIR}/index.html`, buildHtml(metrics));
console.log(`Report generated: ${OUTPUT_DIR}/index.html`);
