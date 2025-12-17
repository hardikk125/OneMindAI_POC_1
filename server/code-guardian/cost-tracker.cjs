/**
 * COST TRACKER
 * ============
 * Tracks LLM API costs for Code Guardian
 * Supports OpenAI, Anthropic, and other providers
 */

// =============================================================================
// PRICING (as of Dec 2024)
// =============================================================================

const PRICING = {
  openai: {
    'gpt-4o': {
      input: 0.005,      // $0.005 per 1K input tokens
      output: 0.015,     // $0.015 per 1K output tokens
    },
    'gpt-4': {
      input: 0.03,       // $0.03 per 1K input tokens
      output: 0.06,      // $0.06 per 1K output tokens
    },
    'gpt-4-turbo': {
      input: 0.01,       // $0.01 per 1K input tokens
      output: 0.03,      // $0.03 per 1K output tokens
    },
    'gpt-3.5-turbo': {
      input: 0.0005,     // $0.0005 per 1K input tokens
      output: 0.0015,    // $0.0015 per 1K output tokens
    },
  },
  anthropic: {
    'claude-3-opus': {
      input: 0.015,      // $0.015 per 1K input tokens
      output: 0.075,     // $0.075 per 1K output tokens
    },
    'claude-3-sonnet': {
      input: 0.003,      // $0.003 per 1K input tokens
      output: 0.015,     // $0.015 per 1K output tokens
    },
    'claude-3-haiku': {
      input: 0.00025,    // $0.00025 per 1K input tokens
      output: 0.00125,   // $0.00125 per 1K output tokens
    },
  },
  perplexity: {
    'pplx-7b-online': {
      input: 0.00007,    // $0.00007 per 1K tokens
      output: 0.00007,
    },
    'pplx-70b-online': {
      input: 0.0007,     // $0.0007 per 1K tokens
      output: 0.0007,
    },
  },
};

// =============================================================================
// COST CALCULATOR
// =============================================================================

class CostTracker {
  constructor() {
    this.analyses = [];
    this.totalCost = 0;
    this.totalTokens = { input: 0, output: 0 };
  }

  /**
   * Calculate cost for an LLM analysis
   */
  calculateCost(provider, model, inputTokens, outputTokens) {
    const providerPricing = PRICING[provider];
    if (!providerPricing) {
      console.warn(`[CostTracker] Unknown provider: ${provider}`);
      return { cost: 0, breakdown: {} };
    }

    const modelPricing = providerPricing[model] || Object.values(providerPricing)[0];
    if (!modelPricing) {
      console.warn(`[CostTracker] Unknown model: ${model}`);
      return { cost: 0, breakdown: {} };
    }

    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    return {
      cost: totalCost,
      breakdown: {
        inputTokens,
        outputTokens,
        inputCost: parseFloat(inputCost.toFixed(6)),
        outputCost: parseFloat(outputCost.toFixed(6)),
        totalCost: parseFloat(totalCost.toFixed(6)),
      },
    };
  }

  /**
   * Log an analysis with cost
   */
  logAnalysis(file, provider, model, inputTokens, outputTokens, riskScore) {
    const { cost, breakdown } = this.calculateCost(provider, model, inputTokens, outputTokens);

    const record = {
      timestamp: new Date().toISOString(),
      file,
      provider,
      model,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      cost: parseFloat(cost.toFixed(6)),
      breakdown,
      riskScore,
    };

    this.analyses.push(record);
    this.totalCost += cost;
    this.totalTokens.input += inputTokens;
    this.totalTokens.output += outputTokens;

    console.log(`[CostTracker] Analysis: ${file}`);
    console.log(`  Provider: ${provider} (${model})`);
    console.log(`  Tokens: ${inputTokens} input + ${outputTokens} output = ${inputTokens + outputTokens} total`);
    console.log(`  Cost: $${cost.toFixed(6)}`);
    console.log(`  Running total: $${this.totalCost.toFixed(6)}`);

    return record;
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const byProvider = {};
    const byModel = {};
    const byRisk = { high: 0, medium: 0, low: 0 };

    this.analyses.forEach(record => {
      // By provider
      if (!byProvider[record.provider]) {
        byProvider[record.provider] = { count: 0, cost: 0, tokens: 0 };
      }
      byProvider[record.provider].count++;
      byProvider[record.provider].cost += record.cost;
      byProvider[record.provider].tokens += record.tokens.total;

      // By model
      if (!byModel[record.model]) {
        byModel[record.model] = { count: 0, cost: 0, tokens: 0 };
      }
      byModel[record.model].count++;
      byModel[record.model].cost += record.cost;
      byModel[record.model].tokens += record.tokens.total;

      // By risk
      if (record.riskScore >= 7) byRisk.high++;
      else if (record.riskScore >= 4) byRisk.medium++;
      else byRisk.low++;
    });

    return {
      totalAnalyses: this.analyses.length,
      totalCost: parseFloat(this.totalCost.toFixed(6)),
      totalTokens: {
        input: this.totalTokens.input,
        output: this.totalTokens.output,
        total: this.totalTokens.input + this.totalTokens.output,
      },
      averageCostPerAnalysis: this.analyses.length > 0 
        ? parseFloat((this.totalCost / this.analyses.length).toFixed(6))
        : 0,
      averageTokensPerAnalysis: this.analyses.length > 0
        ? Math.round((this.totalTokens.input + this.totalTokens.output) / this.analyses.length)
        : 0,
      byProvider: Object.entries(byProvider).map(([name, data]) => ({
        name,
        count: data.count,
        cost: parseFloat(data.cost.toFixed(6)),
        tokens: data.tokens,
        avgCost: parseFloat((data.cost / data.count).toFixed(6)),
      })),
      byModel: Object.entries(byModel).map(([name, data]) => ({
        name,
        count: data.count,
        cost: parseFloat(data.cost.toFixed(6)),
        tokens: data.tokens,
        avgCost: parseFloat((data.cost / data.count).toFixed(6)),
      })),
      byRisk,
      recentAnalyses: this.analyses.slice(-10).reverse(),
    };
  }

  /**
   * Get cost estimate for a given number of analyses
   */
  estimateCost(provider, model, count = 100) {
    const avgTokens = this.analyses.length > 0
      ? (this.totalTokens.input + this.totalTokens.output) / this.analyses.length
      : 1000; // Default estimate

    const avgInputTokens = this.analyses.length > 0
      ? this.totalTokens.input / this.analyses.length
      : 600;

    const avgOutputTokens = avgTokens - avgInputTokens;

    const { cost } = this.calculateCost(provider, model, avgInputTokens, avgOutputTokens);
    return {
      costPerAnalysis: parseFloat(cost.toFixed(6)),
      costFor: count,
      totalEstimate: parseFloat((cost * count).toFixed(2)),
      costPerDay: parseFloat((cost * 100).toFixed(2)), // Assuming 100 analyses per day
      costPerMonth: parseFloat((cost * 100 * 30).toFixed(2)),
    };
  }

  /**
   * Export data for dashboard
   */
  export() {
    return {
      summary: this.getSummary(),
      allAnalyses: this.analyses,
    };
  }

  /**
   * Reset tracker
   */
  reset() {
    this.analyses = [];
    this.totalCost = 0;
    this.totalTokens = { input: 0, output: 0 };
    console.log('[CostTracker] Reset');
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

const costTracker = new CostTracker();

module.exports = {
  costTracker,
  CostTracker,
  PRICING,
};
