/**
 * Credit Pricing Panel
 * 
 * Shows transparent pricing for all AI models, credit distribution,
 * and how $10 purchase gets dispersed across engines.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  Zap, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Calculator,
  PieChart,
  Sparkles,
  Shield,
  TrendingUp
} from 'lucide-react';
import { CREDIT_PRICING } from '../../lib/supabase/credit-service';

// =============================================================================
// TYPES
// =============================================================================

interface ModelPricing {
  provider: string;
  model: string;
  displayName: string;
  inputCredits: number;  // per 1M tokens
  outputCredits: number; // per 1M tokens
  inputUSD: number;      // actual provider cost per 1M tokens
  outputUSD: number;     // actual provider cost per 1M tokens
  tier: 'free' | 'budget' | 'standard' | 'premium';
  avgTokensPerQuery: number;
}

// =============================================================================
// PRICING DATA WITH PROFIT MARKUP
// =============================================================================

// Actual provider costs (USD per 1M tokens) - this is our cost
const PROVIDER_COSTS: Record<string, Record<string, { input: number; output: number }>> = {
  openai: {
    'gpt-4.1': { input: 2.00, output: 8.00 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4.1-mini': { input: 0.15, output: 0.60 },
  },
  anthropic: {
    'claude-3.5-sonnet': { input: 3.00, output: 15.00 },
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  },
  gemini: {
    'gemini-2.0-flash-exp': { input: 0, output: 0 },
    'gemini-2.0-flash-lite': { input: 0, output: 0 },
    'gemini-2.5-flash-lite': { input: 0, output: 0 },
  },
  deepseek: {
    'deepseek-chat': { input: 0.14, output: 0.28 },
    'deepseek-coder': { input: 0.14, output: 0.28 },
  },
  mistral: {
    'mistral-large-latest': { input: 2.00, output: 6.00 },
    'mistral-medium-2312': { input: 2.70, output: 8.10 },
    'mistral-small': { input: 1.00, output: 3.00 },
  },
  groq: {
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
    'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  },
  perplexity: {
    'sonar-pro': { input: 3.00, output: 15.00 },
    'sonar-small': { input: 0.20, output: 0.20 },
  },
};

// Profit markup percentage (SECURE - only visible in backend)
const PROFIT_MARKUP = 0.30; // 30% markup on provider costs

// Credits per USD (1 credit = $0.01)
const CREDITS_PER_USD = 100;

// $10 purchase gives this many credits
const TEN_DOLLAR_CREDITS = 1000;

// Display names for models
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gpt-4.1': 'GPT-4.1 Turbo',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4.1-mini': 'GPT-4.1 Mini',
  'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet (Oct)',
  'claude-3-haiku': 'Claude 3 Haiku',
  'claude-3-haiku-20240307': 'Claude 3 Haiku (Mar)',
  'gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
  'deepseek-chat': 'DeepSeek Chat',
  'deepseek-coder': 'DeepSeek Coder',
  'mistral-large-latest': 'Mistral Large',
  'mistral-medium-2312': 'Mistral Medium',
  'mistral-small': 'Mistral Small',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'llama-3.1-8b-instant': 'Llama 3.1 8B',
  'mixtral-8x7b-32768': 'Mixtral 8x7B',
  'sonar-pro': 'Perplexity Sonar Pro',
  'sonar-small': 'Perplexity Sonar Small',
};

// Average tokens per query (for estimation)
const AVG_TOKENS_PER_QUERY = {
  input: 500,
  output: 1000,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getTier(inputCredits: number, outputCredits: number): 'free' | 'budget' | 'standard' | 'premium' {
  const avgCredits = (inputCredits + outputCredits) / 2;
  if (avgCredits === 0) return 'free';
  if (avgCredits < 10) return 'budget';
  if (avgCredits < 50) return 'standard';
  return 'premium';
}

function getTierColor(tier: string): string {
  switch (tier) {
    case 'free': return 'text-green-500 bg-green-500/10';
    case 'budget': return 'text-blue-500 bg-blue-500/10';
    case 'standard': return 'text-purple-500 bg-purple-500/10';
    case 'premium': return 'text-amber-500 bg-amber-500/10';
    default: return 'text-gray-500 bg-gray-500/10';
  }
}

function getTierLabel(tier: string): string {
  switch (tier) {
    case 'free': return 'FREE';
    case 'budget': return 'Budget';
    case 'standard': return 'Standard';
    case 'premium': return 'Premium';
    default: return 'Unknown';
  }
}

function calculateQueriesFor10Dollars(inputCredits: number, outputCredits: number): number {
  if (inputCredits === 0 && outputCredits === 0) return Infinity;
  
  const creditsPerQuery = 
    (AVG_TOKENS_PER_QUERY.input / 1_000_000) * inputCredits +
    (AVG_TOKENS_PER_QUERY.output / 1_000_000) * outputCredits;
  
  if (creditsPerQuery === 0) return Infinity;
  return Math.floor(TEN_DOLLAR_CREDITS / creditsPerQuery);
}

// =============================================================================
// COMPONENT
// =============================================================================

interface CreditPricingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
}

export function CreditPricingPanel({ isOpen, onClose, currentBalance = 0 }: CreditPricingPanelProps) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showDistribution, setShowDistribution] = useState(false);

  // Build pricing data from CREDIT_PRICING
  const pricingData = useMemo(() => {
    const data: ModelPricing[] = [];
    
    Object.entries(CREDIT_PRICING).forEach(([provider, models]) => {
      Object.entries(models).forEach(([model, pricing]) => {
        const providerCost = PROVIDER_COSTS[provider]?.[model] || { input: 0, output: 0 };
        data.push({
          provider,
          model,
          displayName: MODEL_DISPLAY_NAMES[model] || model,
          inputCredits: pricing.input,
          outputCredits: pricing.output,
          inputUSD: providerCost.input,
          outputUSD: providerCost.output,
          tier: getTier(pricing.input, pricing.output),
          avgTokensPerQuery: AVG_TOKENS_PER_QUERY.input + AVG_TOKENS_PER_QUERY.output,
        });
      });
    });
    
    return data;
  }, []);

  // Group by provider
  const groupedByProvider = useMemo(() => {
    const groups: Record<string, ModelPricing[]> = {};
    pricingData.forEach(item => {
      if (!groups[item.provider]) groups[item.provider] = [];
      groups[item.provider].push(item);
    });
    return groups;
  }, [pricingData]);

  // Calculate $10 distribution
  const distributionData = useMemo(() => {
    return pricingData
      .filter(p => p.tier !== 'free')
      .map(p => ({
        ...p,
        queriesFor10: calculateQueriesFor10Dollars(p.inputCredits, p.outputCredits),
        creditsPerQuery: 
          (AVG_TOKENS_PER_QUERY.input / 1_000_000) * p.inputCredits +
          (AVG_TOKENS_PER_QUERY.output / 1_000_000) * p.outputCredits,
      }))
      .sort((a, b) => b.queriesFor10 - a.queriesFor10);
  }, [pricingData]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="w-6 h-6" />
                  Credit Pricing & Distribution
                </h2>
                <p className="text-purple-100 mt-1">
                  Transparent pricing for all AI models
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-purple-200">Your Balance</div>
                <div className="text-2xl font-bold">{currentBalance.toLocaleString()} credits</div>
                <div className="text-sm text-purple-200">≈ ${(currentBalance / CREDITS_PER_USD).toFixed(2)}</div>
              </div>
            </div>

            {/* Tab buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowDistribution(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !showDistribution 
                    ? 'bg-white text-purple-600' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Calculator className="w-4 h-4 inline mr-2" />
                Pricing Table
              </button>
              <button
                onClick={() => setShowDistribution(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showDistribution 
                    ? 'bg-white text-purple-600' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <PieChart className="w-4 h-4 inline mr-2" />
                $10 Distribution
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {!showDistribution ? (
              /* Pricing Table View */
              <div className="space-y-4">
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTierColor('free')}`}>FREE</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">No cost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTierColor('budget')}`}>Budget</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">&lt;10 credits/1M tokens</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTierColor('standard')}`}>Standard</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">10-50 credits/1M tokens</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTierColor('premium')}`}>Premium</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">&gt;50 credits/1M tokens</span>
                  </div>
                </div>

                {/* Provider sections */}
                {Object.entries(groupedByProvider).map(([provider, models]) => (
                  <div key={provider} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedProvider(expandedProvider === provider ? null : provider)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold capitalize">{provider}</span>
                        <span className="text-sm text-gray-500">({models.length} models)</span>
                      </div>
                      {expandedProvider === provider ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedProvider === provider && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-3">
                            {models.map((model) => (
                              <div
                                key={model.model}
                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700"
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTierColor(model.tier)}`}>
                                    {getTierLabel(model.tier)}
                                  </span>
                                  <span className="font-medium">{model.displayName}</span>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                  <div className="text-right">
                                    <div className="text-gray-500">Input</div>
                                    <div className="font-semibold">
                                      {model.inputCredits === 0 ? 'FREE' : `${model.inputCredits} cr/1M`}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-gray-500">Output</div>
                                    <div className="font-semibold">
                                      {model.outputCredits === 0 ? 'FREE' : `${model.outputCredits} cr/1M`}
                                    </div>
                                  </div>
                                  <div className="text-right min-w-[100px]">
                                    <div className="text-gray-500">Queries/$10</div>
                                    <div className="font-semibold text-green-600">
                                      {calculateQueriesFor10Dollars(model.inputCredits, model.outputCredits) === Infinity
                                        ? '∞ (Free)'
                                        : `~${calculateQueriesFor10Dollars(model.inputCredits, model.outputCredits).toLocaleString()}`
                                      }
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {/* How it works */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    How Credit Pricing Works
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-blue-700 dark:text-blue-400">
                    <li>• <strong>1 credit = $0.01 USD</strong> - Simple conversion</li>
                    <li>• Credits are deducted <strong>after</strong> successful API response</li>
                    <li>• Pricing is based on <strong>tokens used</strong> (input + output)</li>
                    <li>• Free tier models (Gemini) have <strong>no credit cost</strong></li>
                    <li>• Average query: ~500 input tokens, ~1000 output tokens</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* $10 Distribution View */
              <div className="space-y-6">
                <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <DollarSign className="w-12 h-12 mx-auto text-green-600 mb-2" />
                  <h3 className="text-2xl font-bold text-green-800 dark:text-green-300">
                    $10 = 1,000 Credits
                  </h3>
                  <p className="text-green-600 dark:text-green-400 mt-1">
                    Here's how many queries you can make with each model
                  </p>
                </div>

                {/* Distribution chart */}
                <div className="grid gap-3">
                  {distributionData.slice(0, 10).map((item, index) => {
                    const maxQueries = distributionData[0]?.queriesFor10 || 1;
                    const percentage = Math.min((item.queriesFor10 / maxQueries) * 100, 100);
                    
                    return (
                      <div key={item.model} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                            <span className="font-medium">{item.displayName}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getTierColor(item.tier)}`}>
                              {item.provider}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-lg text-green-600">
                              {item.queriesFor10.toLocaleString()}
                            </span>
                            <span className="text-sm text-gray-500 ml-1">queries</span>
                          </div>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ~{item.creditsPerQuery.toFixed(3)} credits per query
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Free tier note */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Free Tier Models
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                    Gemini models are completely <strong>FREE</strong> - unlimited queries at no credit cost!
                  </p>
                </div>

                {/* Security note */}
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Secure & Transparent
                  </h4>
                  <ul className="text-sm text-purple-700 dark:text-purple-400 mt-2 space-y-1">
                    <li>• All transactions are logged and auditable</li>
                    <li>• Credits only deducted after successful API response</li>
                    <li>• No hidden fees - what you see is what you pay</li>
                    <li>• Refunds available for failed requests</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Prices may vary based on provider updates
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CreditPricingPanel;
