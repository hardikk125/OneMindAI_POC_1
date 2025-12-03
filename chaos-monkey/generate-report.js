#!/usr/bin/env node
/**
 * 🐒 CHAOS MONKEY REPORT GENERATOR
 * Generates HTML reports from test results
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.CHAOS_API || 'http://localhost:4000';

async function generateReport() {
  console.log('🐒 Generating Chaos Monkey Report...\n');

  // Fetch latest results
  let history;
  try {
    const response = await fetch(`${API_BASE}/api/history`);
    history = await response.json();
  } catch (e) {
    console.error('Failed to fetch results. Is the server running?');
    process.exit(1);
  }

  if (history.length === 0) {
    console.log('No test runs found. Run some tests first!');
    process.exit(0);
  }

  const latestRun = history[0];
  const timestamp = new Date(latestRun.timestamp).toLocaleString();

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chaos Monkey Report - ${timestamp}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            background: #1a1a2e; 
            color: #fff; 
            padding: 40px;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { 
            font-size: 2.5rem; 
            margin-bottom: 10px;
            background: linear-gradient(90deg, #667eea, #f093fb);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .meta { color: #a0aec0; margin-bottom: 30px; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
        }
        .stat-card .number {
            font-size: 3rem;
            font-weight: 700;
        }
        .stat-card .label { color: #a0aec0; }
        .stat-card.success .number { color: #48bb78; }
        .stat-card.danger .number { color: #f56565; }
        .stat-card.warning .number { color: #ed8936; }
        .suite {
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .suite-header {
            background: rgba(102,126,234,0.2);
            padding: 15px 20px;
            font-weight: 600;
            font-size: 1.1rem;
        }
        .test-list { padding: 10px; }
        .test-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px 15px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .test-item:last-child { border-bottom: none; }
        .test-item.passed { border-left: 3px solid #48bb78; }
        .test-item.failed { border-left: 3px solid #f56565; }
        .test-item.skipped { border-left: 3px solid #ed8936; }
        .test-status { font-size: 1.2rem; }
        .test-info { flex: 1; }
        .test-name { font-weight: 500; }
        .test-id { font-size: 0.8rem; color: #a0aec0; font-family: monospace; }
        .test-note { 
            font-size: 0.85rem; 
            color: #a0aec0; 
            margin-top: 5px;
            padding: 8px;
            background: rgba(0,0,0,0.2);
            border-radius: 4px;
        }
        .severity {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            text-transform: uppercase;
        }
        .severity.critical { background: #f56565; }
        .severity.high { background: #ed8936; color: #000; }
        .severity.medium { background: #4299e1; }
        .severity.low { background: #a0aec0; color: #000; }
        .duration { color: #a0aec0; font-size: 0.85rem; }
        .verdict {
            text-align: center;
            padding: 30px;
            margin-top: 40px;
            border-radius: 12px;
            font-size: 1.5rem;
            font-weight: 600;
        }
        .verdict.pass { background: rgba(72,187,120,0.2); color: #48bb78; }
        .verdict.fail { background: rgba(245,101,101,0.2); color: #f56565; }
        @media print {
            body { background: #fff; color: #000; }
            .stat-card { border: 1px solid #ddd; }
            .suite { border: 1px solid #ddd; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐒 Chaos Monkey Test Report</h1>
        <p class="meta">
            Generated: ${timestamp}<br>
            Target: ${latestRun.target}<br>
            Duration: ${(latestRun.duration / 1000).toFixed(1)}s
        </p>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="number">${latestRun.stats.total}</div>
                <div class="label">Total Tests</div>
            </div>
            <div class="stat-card success">
                <div class="number">${latestRun.stats.passed}</div>
                <div class="label">Passed</div>
            </div>
            <div class="stat-card danger">
                <div class="number">${latestRun.stats.failed}</div>
                <div class="label">Failed</div>
            </div>
            <div class="stat-card warning">
                <div class="number">${latestRun.stats.skipped}</div>
                <div class="label">Skipped</div>
            </div>
        </div>

        ${Object.entries(latestRun.results).map(([suiteName, results]) => `
            <div class="suite">
                <div class="suite-header">
                    📦 ${suiteName.toUpperCase()} 
                    (${results.filter(r => r.passed).length}/${results.length} passed)
                </div>
                <div class="test-list">
                    ${results.map(test => `
                        <div class="test-item ${test.passed ? 'passed' : test.skipped ? 'skipped' : 'failed'}">
                            <div class="test-status">${test.passed ? '✅' : test.skipped ? '⏭️' : '❌'}</div>
                            <div class="test-info">
                                <div class="test-name">${test.name}</div>
                                <div class="test-id">${test.id}</div>
                                ${test.note ? `<div class="test-note">${test.note}</div>` : ''}
                                ${test.error ? `<div class="test-note" style="color: #f56565;">${test.error}</div>` : ''}
                            </div>
                            <span class="severity ${test.severity}">${test.severity}</span>
                            <span class="duration">${test.duration || 0}ms</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}

        <div class="verdict ${latestRun.stats.failed === 0 ? 'pass' : 'fail'}">
            ${latestRun.stats.failed === 0 
                ? '✅ ALL TESTS PASSED - Ready for Production!' 
                : `❌ ${latestRun.stats.failed} TESTS FAILED - Fix Issues Before Deployment`}
        </div>
    </div>
</body>
</html>`;

  // Save report
  const reportPath = path.join(__dirname, 'reports', `report-${Date.now()}.html`);
  await fs.mkdir(path.join(__dirname, 'reports'), { recursive: true });
  await fs.writeFile(reportPath, html);

  console.log(`✅ Report generated: ${reportPath}`);
  console.log(`\nOpen in browser: file://${reportPath}`);
}

generateReport();
