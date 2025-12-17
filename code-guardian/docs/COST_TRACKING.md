# 💰 Code Guardian - Cost Tracking

## Overview

Code Guardian tracks all LLM API costs in real-time. Every analysis logs:
- **Tokens used** (input + output)
- **Cost per analysis**
- **Running total cost**
- **Provider & model used**
- **Risk score**

---

## Pricing (as of Dec 2024)

### OpenAI Models

| Model | Input | Output | Cost/1M Tokens |
|-------|-------|--------|----------------|
| **GPT-4o** | $0.005 | $0.015 | $20/M |
| GPT-4 | $0.03 | $0.06 | $90/M |
| GPT-4 Turbo | $0.01 | $0.03 | $40/M |
| GPT-3.5 Turbo | $0.0005 | $0.0015 | $2/M |

### Anthropic Models

| Model | Input | Output | Cost/1M Tokens |
|-------|-------|--------|----------------|
| **Claude 3 Opus** | $0.015 | $0.075 | $90/M |
| Claude 3 Sonnet | $0.003 | $0.015 | $18/M |
| Claude 3 Haiku | $0.00025 | $0.00125 | $1.5/M |

### Perplexity Models

| Model | Cost | Notes |
|-------|------|-------|
| pplx-7b-online | $0.00007/1K | Cheapest |
| pplx-70b-online | $0.0007/1K | Balanced |

---

## Cost Calculation

### Formula

```
Cost = (Input Tokens × Input Price + Output Tokens × Output Price) / 1,000,000
```

### Example: GPT-4o Analysis

**Scenario:**
- Input: 600 tokens (typical prompt)
- Output: 905 tokens (typical response)
- Total: 1,505 tokens

**Calculation:**
```
Input Cost  = (600 × $0.005) / 1,000,000 = $0.000003
Output Cost = (905 × $0.015) / 1,000,000 = $0.000013575
Total Cost  = $0.000016575 ≈ $0.0000166
```

**Per 100 Analyses:**
```
$0.0000166 × 100 = $0.00166 (less than 1/10 of a cent)
```

---

## Dashboard Metrics

### Summary Cards

| Metric | Description |
|--------|-------------|
| **Total Cost** | Cumulative cost of all analyses |
| **Avg Cost/Analysis** | Average cost per file analyzed |
| **Total Tokens** | Sum of all input + output tokens |
| **Risk Distribution** | Count by risk level (high/medium/low) |

### By Provider

Shows breakdown by LLM provider:
- Number of analyses
- Total cost
- Total tokens used
- Average cost per analysis

### By Model

Shows breakdown by specific model:
- Number of analyses
- Total cost
- Total tokens used
- Average cost per analysis

### Recent Analyses

Last 10 analyses with:
- File name
- Model used
- Tokens consumed
- Cost
- Risk score

---

## API Endpoints

### Get Cost Summary
```bash
GET /api/costs
```

**Response:**
```json
{
  "totalAnalyses": 42,
  "totalCost": 0.000698,
  "totalTokens": {
    "input": 25200,
    "output": 38010,
    "total": 63210
  },
  "averageCostPerAnalysis": 0.0000166,
  "averageTokensPerAnalysis": 1505,
  "byProvider": [...],
  "byModel": [...],
  "byRisk": {
    "high": 5,
    "medium": 12,
    "low": 25
  },
  "recentAnalyses": [...]
}
```

### Get Cost Estimate
```bash
GET /api/costs/estimate?provider=openai&model=gpt-4o&count=100
```

**Response:**
```json
{
  "costPerAnalysis": 0.0000166,
  "costFor": 100,
  "totalEstimate": 0.00166,
  "costPerDay": 0.00166,
  "costPerMonth": 0.0498
}
```

### Reset Costs (Admin)
```bash
POST /api/costs/reset
```

---

## Cost Tracking Features

### Real-Time Logging

Every analysis automatically logs:
```javascript
{
  timestamp: "2024-12-08T21:15:30.000Z",
  file: "src/admin/index.ts",
  provider: "openai",
  model: "gpt-4o",
  tokens: {
    input: 600,
    output: 905,
    total: 1505
  },
  cost: 0.0000166,
  riskScore: 3
}
```

### Cost Breakdown

Each analysis shows:
- **Input tokens** - Prompt size
- **Output tokens** - Response size
- **Input cost** - Input token cost
- **Output cost** - Output token cost
- **Total cost** - Sum of input + output

### Provider Comparison

Track costs by provider to:
- Compare LLM costs
- Identify most expensive models
- Optimize provider selection

---

## Cost Optimization Tips

### 1. Use Cheaper Models
```
GPT-3.5 Turbo: $2/M tokens
GPT-4o: $20/M tokens
Claude 3 Haiku: $1.5/M tokens ✅ Cheapest
```

### 2. Reduce Token Usage
- Truncate large files (max 8,000 chars)
- Use concise prompts
- Limit context window

### 3. Batch Analyses
- Analyze multiple files together
- Reduce overhead per analysis

### 4. Monitor Costs
- Check dashboard regularly
- Set cost alerts
- Review by provider/model

---

## Monthly Cost Estimates

### Assuming 100 Analyses/Day

| Model | Cost/Analysis | Daily | Monthly |
|-------|---------------|-------|---------|
| GPT-4o | $0.0000166 | $0.00166 | $0.0498 |
| GPT-3.5 | $0.0000002 | $0.00002 | $0.0006 |
| Claude 3 Haiku | $0.0000015 | $0.00015 | $0.0045 |

### Assuming 1,000 Analyses/Day

| Model | Cost/Analysis | Daily | Monthly |
|-------|---------------|-------|---------|
| GPT-4o | $0.0000166 | $0.0166 | $0.498 |
| GPT-3.5 | $0.0000002 | $0.0002 | $0.006 |
| Claude 3 Haiku | $0.0000015 | $0.0015 | $0.045 |

---

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `server/code-guardian/cost-tracker.cjs` | Cost calculation & logging |
| `code-guardian/src/components/CostTracker.tsx` | Dashboard UI |
| `server/code-guardian/index.cjs` | API endpoints |
| `server/code-guardian/llm-judge.cjs` | Integration with LLM calls |

### Cost Tracker Class

```javascript
const { costTracker } = require('./cost-tracker.cjs');

// Log an analysis
costTracker.logAnalysis(
  'src/file.ts',      // file
  'openai',           // provider
  'gpt-4o',           // model
  600,                // inputTokens
  905,                // outputTokens
  3                   // riskScore
);

// Get summary
const summary = costTracker.getSummary();

// Get estimate
const estimate = costTracker.estimateCost('openai', 'gpt-4o', 100);

// Reset
costTracker.reset();
```

---

## Dashboard Usage

### View Costs
1. Open Code Guardian dashboard
2. Click **"💰 Costs"** tab
3. See real-time cost metrics

### Monitor by Provider
- Scroll to "By Provider" section
- Compare costs across providers
- Identify most expensive provider

### Monitor by Model
- Scroll to "By Model" section
- Compare costs across models
- Identify most expensive model

### View Recent Analyses
- Scroll to "Recent Analyses" section
- See last 10 analyses
- Click to view details

### Auto-Refresh
- Toggle "Auto-refresh every 10s"
- Or click "Refresh Now" manually

---

## Notes

- Costs are calculated in **real-time** as analyses complete
- All costs are **cumulative** for the current session
- Use `/api/costs/reset` to clear history (admin only)
- Costs are **not persisted** to database (use Supabase logger for persistence)
- Pricing based on **official provider rates** (Dec 2024)
