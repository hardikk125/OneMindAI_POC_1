// =============================================================================
// Chaos Testing Panel - Simulate errors, crashes, and API failures
// =============================================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  AlertTriangle,
  Server,
  Wifi,
  WifiOff,
  Clock,
  XCircle,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Shield,
  Bug,
  Flame,
  Activity,
  Database,
  Cloud,
  AlertOctagon,
  CheckCircle,
  Info,
  Settings2,
} from 'lucide-react';

// ===== Types =====
interface ChaosEvent {
  id: string;
  type: string;
  target: string;
  timestamp: Date;
  status: 'pending' | 'active' | 'completed' | 'failed';
  message: string;
}

interface ChaosConfig {
  enabled: boolean;
  apiFailureRate: number; // 0-100%
  latencyMs: number; // Added latency in ms
  networkErrors: boolean;
  randomCrashes: boolean;
  memoryPressure: boolean;
  targetProviders: string[];
}

// ===== Chaos Scenarios =====
const CHAOS_SCENARIOS = [
  {
    id: 'api-timeout',
    name: 'API Timeout',
    icon: Clock,
    description: 'Simulate slow API responses (5-30s delay)',
    category: 'network',
    severity: 'medium',
  },
  {
    id: 'api-500',
    name: 'Server Error (500)',
    icon: Server,
    description: 'Return 500 Internal Server Error from proxy',
    category: 'api',
    severity: 'high',
  },
  {
    id: 'api-429',
    name: 'Rate Limit (429)',
    icon: AlertTriangle,
    description: 'Simulate rate limiting from providers',
    category: 'api',
    severity: 'medium',
  },
  {
    id: 'api-401',
    name: 'Auth Error (401)',
    icon: Shield,
    description: 'Simulate authentication failures',
    category: 'api',
    severity: 'high',
  },
  {
    id: 'network-disconnect',
    name: 'Network Disconnect',
    icon: WifiOff,
    description: 'Simulate complete network failure',
    category: 'network',
    severity: 'critical',
  },
  {
    id: 'partial-response',
    name: 'Partial Response',
    icon: Activity,
    description: 'Stream cuts off mid-response',
    category: 'api',
    severity: 'medium',
  },
  {
    id: 'malformed-json',
    name: 'Malformed JSON',
    icon: Bug,
    description: 'Return invalid JSON from API',
    category: 'api',
    severity: 'high',
  },
  {
    id: 'memory-pressure',
    name: 'Memory Pressure',
    icon: Database,
    description: 'Simulate high memory usage',
    category: 'system',
    severity: 'medium',
  },
  {
    id: 'random-crash',
    name: 'Random Crash',
    icon: Flame,
    description: 'Trigger random component crashes',
    category: 'system',
    severity: 'critical',
  },
  {
    id: 'supabase-error',
    name: 'Database Error',
    icon: Database,
    description: 'Simulate Supabase connection failures',
    category: 'database',
    severity: 'critical',
  },
  {
    id: 'provider-down',
    name: 'Provider Outage',
    icon: Cloud,
    description: 'Simulate specific provider being down',
    category: 'api',
    severity: 'critical',
  },
  {
    id: 'cors-error',
    name: 'CORS Error',
    icon: AlertOctagon,
    description: 'Simulate CORS policy violations',
    category: 'network',
    severity: 'high',
  },
];

const PROVIDERS = ['openai', 'anthropic', 'gemini', 'deepseek', 'mistral', 'perplexity', 'groq', 'xai', 'kimi'];

export function ChaosTesting() {
  const [config, setConfig] = useState<ChaosConfig>({
    enabled: false,
    apiFailureRate: 0,
    latencyMs: 0,
    networkErrors: false,
    randomCrashes: false,
    memoryPressure: false,
    targetProviders: [],
  });
  
  const [activeScenarios, setActiveScenarios] = useState<string[]>([]);
  const [eventLog, setEventLog] = useState<ChaosEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Toggle chaos mode
  const toggleChaosMode = () => {
    const newEnabled = !config.enabled;
    setConfig({ ...config, enabled: newEnabled });
    
    if (newEnabled) {
      // Store chaos config in localStorage for proxy to read
      localStorage.setItem('chaos-testing-enabled', 'true');
      localStorage.setItem('chaos-testing-config', JSON.stringify(config));
      addEvent('system', 'Chaos Mode', 'active', '🔥 Chaos Mode ENABLED - Errors will be injected');
    } else {
      localStorage.removeItem('chaos-testing-enabled');
      localStorage.removeItem('chaos-testing-config');
      setActiveScenarios([]);
      addEvent('system', 'Chaos Mode', 'completed', '✅ Chaos Mode DISABLED - Normal operation resumed');
    }
  };

  // Add event to log
  const addEvent = (type: string, target: string, status: ChaosEvent['status'], message: string) => {
    const event: ChaosEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      target,
      timestamp: new Date(),
      status,
      message,
    };
    setEventLog(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
  };

  // Trigger a specific chaos scenario
  const triggerScenario = async (scenarioId: string) => {
    const scenario = CHAOS_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    setActiveScenarios(prev => [...prev, scenarioId]);
    addEvent(scenario.category, scenario.name, 'active', `Triggering: ${scenario.description}`);

    // Store active scenario for proxy/app to read
    const activeConfig = {
      ...config,
      activeScenario: scenarioId,
      triggeredAt: Date.now(),
    };
    localStorage.setItem('chaos-testing-config', JSON.stringify(activeConfig));

    // Simulate the chaos based on scenario
    switch (scenarioId) {
      case 'api-timeout':
        await simulateApiTimeout();
        break;
      case 'api-500':
        await simulateApiError(500, 'Internal Server Error');
        break;
      case 'api-429':
        await simulateApiError(429, 'Too Many Requests');
        break;
      case 'api-401':
        await simulateApiError(401, 'Unauthorized');
        break;
      case 'network-disconnect':
        await simulateNetworkDisconnect();
        break;
      case 'partial-response':
        await simulatePartialResponse();
        break;
      case 'malformed-json':
        await simulateMalformedJson();
        break;
      case 'memory-pressure':
        await simulateMemoryPressure();
        break;
      case 'random-crash':
        await simulateRandomCrash();
        break;
      case 'supabase-error':
        await simulateSupabaseError();
        break;
      case 'provider-down':
        await simulateProviderOutage();
        break;
      case 'cors-error':
        await simulateCorsError();
        break;
    }

    // Remove from active after a delay
    setTimeout(() => {
      setActiveScenarios(prev => prev.filter(id => id !== scenarioId));
      addEvent(scenario.category, scenario.name, 'completed', `Completed: ${scenario.name}`);
    }, 5000);
  };

  // ===== Chaos Simulation Functions =====
  
  const simulateApiTimeout = async () => {
    // Set a flag that the proxy will check
    localStorage.setItem('chaos-inject-timeout', 'true');
    localStorage.setItem('chaos-timeout-ms', '15000');
    addEvent('network', 'API', 'active', 'Injecting 15s timeout on next API call');
    
    // Auto-clear after 30s
    setTimeout(() => {
      localStorage.removeItem('chaos-inject-timeout');
      localStorage.removeItem('chaos-timeout-ms');
    }, 30000);
  };

  const simulateApiError = async (code: number, message: string) => {
    localStorage.setItem('chaos-inject-error', 'true');
    localStorage.setItem('chaos-error-code', code.toString());
    localStorage.setItem('chaos-error-message', message);
    addEvent('api', `HTTP ${code}`, 'active', `Next API call will return ${code}: ${message}`);
    
    setTimeout(() => {
      localStorage.removeItem('chaos-inject-error');
      localStorage.removeItem('chaos-error-code');
      localStorage.removeItem('chaos-error-message');
    }, 30000);
  };

  const simulateNetworkDisconnect = async () => {
    localStorage.setItem('chaos-network-offline', 'true');
    addEvent('network', 'Network', 'active', 'Simulating network offline state');
    
    // Dispatch offline event
    window.dispatchEvent(new Event('offline'));
    
    setTimeout(() => {
      localStorage.removeItem('chaos-network-offline');
      window.dispatchEvent(new Event('online'));
      addEvent('network', 'Network', 'completed', 'Network restored');
    }, 10000);
  };

  const simulatePartialResponse = async () => {
    localStorage.setItem('chaos-partial-response', 'true');
    localStorage.setItem('chaos-cutoff-percent', '50');
    addEvent('api', 'Stream', 'active', 'Next streaming response will cut off at 50%');
    
    setTimeout(() => {
      localStorage.removeItem('chaos-partial-response');
      localStorage.removeItem('chaos-cutoff-percent');
    }, 30000);
  };

  const simulateMalformedJson = async () => {
    localStorage.setItem('chaos-malformed-json', 'true');
    addEvent('api', 'JSON', 'active', 'Next API response will have malformed JSON');
    
    setTimeout(() => {
      localStorage.removeItem('chaos-malformed-json');
    }, 30000);
  };

  const simulateMemoryPressure = async () => {
    addEvent('system', 'Memory', 'active', 'Allocating large arrays to simulate memory pressure');
    
    // Create memory pressure (will be garbage collected)
    const arrays: number[][] = [];
    for (let i = 0; i < 100; i++) {
      arrays.push(new Array(1000000).fill(Math.random()));
    }
    
    setTimeout(() => {
      arrays.length = 0; // Clear
      addEvent('system', 'Memory', 'completed', 'Memory pressure released');
    }, 5000);
  };

  const simulateRandomCrash = async () => {
    localStorage.setItem('chaos-random-crash', 'true');
    addEvent('system', 'Crash', 'active', 'Random crash will occur on next render cycle');
    
    // This will be caught by ErrorBoundary
    setTimeout(() => {
      localStorage.removeItem('chaos-random-crash');
      throw new Error('[Chaos Testing] Simulated random crash!');
    }, 1000);
  };

  const simulateSupabaseError = async () => {
    localStorage.setItem('chaos-supabase-error', 'true');
    addEvent('database', 'Supabase', 'active', 'Next Supabase query will fail');
    
    setTimeout(() => {
      localStorage.removeItem('chaos-supabase-error');
    }, 30000);
  };

  const simulateProviderOutage = async () => {
    const provider = config.targetProviders[0] || 'openai';
    localStorage.setItem('chaos-provider-down', provider);
    addEvent('api', provider, 'active', `${provider} is now simulated as DOWN`);
    
    setTimeout(() => {
      localStorage.removeItem('chaos-provider-down');
      addEvent('api', provider, 'completed', `${provider} is back UP`);
    }, 30000);
  };

  const simulateCorsError = async () => {
    localStorage.setItem('chaos-cors-error', 'true');
    addEvent('network', 'CORS', 'active', 'Next request will fail with CORS error');
    
    setTimeout(() => {
      localStorage.removeItem('chaos-cors-error');
    }, 30000);
  };

  // Clear all chaos
  const clearAllChaos = () => {
    // Clear all chaos flags
    const chaosKeys = Object.keys(localStorage).filter(k => k.startsWith('chaos-'));
    chaosKeys.forEach(k => localStorage.removeItem(k));
    
    setConfig({
      enabled: false,
      apiFailureRate: 0,
      latencyMs: 0,
      networkErrors: false,
      randomCrashes: false,
      memoryPressure: false,
      targetProviders: [],
    });
    setActiveScenarios([]);
    addEvent('system', 'Clear', 'completed', '🧹 All chaos cleared - System reset to normal');
  };

  // Toggle provider targeting
  const toggleProvider = (provider: string) => {
    setConfig(prev => ({
      ...prev,
      targetProviders: prev.targetProviders.includes(provider)
        ? prev.targetProviders.filter(p => p !== provider)
        : [...prev.targetProviders, provider],
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      default: return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Zap className="text-yellow-400" />
            Chaos Testing
          </h1>
          <p className="text-gray-400 mt-1">
            Inject errors and failures to test app resilience
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={clearAllChaos}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            Clear All
          </button>
          <button
            onClick={toggleChaosMode}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              config.enabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {config.enabled ? (
              <>
                <Pause size={16} />
                Disable Chaos
              </>
            ) : (
              <>
                <Play size={16} />
                Enable Chaos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {config.enabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertTriangle className="text-red-400 flex-shrink-0" size={24} />
          <div>
            <h3 className="text-red-400 font-semibold">⚠️ Chaos Mode Active</h3>
            <p className="text-red-300 text-sm">
              Errors are being injected into the system. This is for testing purposes only.
            </p>
          </div>
        </motion.div>
      )}

      {/* Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chaos Scenarios */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Flame className="text-orange-400" size={20} />
            Chaos Scenarios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CHAOS_SCENARIOS.map((scenario) => {
              const Icon = scenario.icon;
              const isActive = activeScenarios.includes(scenario.id);
              
              return (
                <motion.button
                  key={scenario.id}
                  onClick={() => triggerScenario(scenario.id)}
                  disabled={!config.enabled || isActive}
                  whileHover={{ scale: config.enabled && !isActive ? 1.02 : 1 }}
                  whileTap={{ scale: config.enabled && !isActive ? 0.98 : 1 }}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    isActive
                      ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/50'
                      : config.enabled
                        ? `${getSeverityColor(scenario.severity)} hover:ring-2 hover:ring-current/30 cursor-pointer`
                        : 'bg-gray-700/50 border-gray-600 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-red-500/30' : 'bg-gray-700'}`}>
                      <Icon size={18} className={isActive ? 'text-red-400 animate-pulse' : ''} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white text-sm">{scenario.name}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                        {scenario.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityColor(scenario.severity)}`}>
                          {scenario.severity}
                        </span>
                        <span className="text-gray-500 text-xs">{scenario.category}</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Settings & Target Providers */}
        <div className="space-y-6">
          {/* Quick Settings */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings2 className="text-purple-400" size={20} />
              Quick Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  API Failure Rate: {config.apiFailureRate}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.apiFailureRate}
                  onChange={(e) => setConfig({ ...config, apiFailureRate: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  disabled={!config.enabled}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Added Latency: {config.latencyMs}ms
                </label>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="500"
                  value={config.latencyMs}
                  onChange={(e) => setConfig({ ...config, latencyMs: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  disabled={!config.enabled}
                />
              </div>
            </div>
          </div>

          {/* Target Providers */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Cloud className="text-blue-400" size={20} />
              Target Providers
            </h2>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider}
                  onClick={() => toggleProvider(provider)}
                  disabled={!config.enabled}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    config.targetProviders.includes(provider)
                      ? 'bg-purple-600 text-white'
                      : config.enabled
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {provider}
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-3">
              {config.targetProviders.length === 0
                ? 'All providers will be affected'
                : `Only ${config.targetProviders.join(', ')} will be affected`}
            </p>
          </div>
        </div>
      </div>

      {/* Event Log */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="text-green-400" size={20} />
            Event Log
          </h2>
          <button
            onClick={() => setEventLog([])}
            className="text-gray-400 hover:text-white text-sm"
          >
            Clear Log
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          <AnimatePresence>
            {eventLog.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Info size={32} className="mx-auto mb-2 opacity-50" />
                <p>No chaos events yet. Enable chaos mode and trigger scenarios.</p>
              </div>
            ) : (
              eventLog.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg text-sm"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    event.status === 'active' ? 'bg-yellow-400 animate-pulse' :
                    event.status === 'completed' ? 'bg-green-400' :
                    event.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'
                  }`} />
                  <span className="text-gray-500 text-xs font-mono">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="text-purple-400 font-medium">[{event.type}]</span>
                  <span className="text-gray-300 flex-1">{event.message}</span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Info className="text-blue-400" size={18} />
          How to Use Chaos Testing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <h4 className="text-white font-medium mb-2">1. Enable Chaos Mode</h4>
            <p>Click the "Enable Chaos" button to activate the chaos testing system.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">2. Select Scenarios</h4>
            <p>Click on any scenario card to trigger that specific failure mode.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">3. Target Providers</h4>
            <p>Optionally select specific providers to target with chaos.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">4. Monitor Events</h4>
            <p>Watch the event log to see chaos events as they occur.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
