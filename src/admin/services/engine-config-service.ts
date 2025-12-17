// =============================================================================
// Engine Configuration Service
// =============================================================================

import { EngineConfig, Engine, ModelHealthStatus, DEFAULT_ENGINE_CONFIG } from '../types/engine-config';

const STORAGE_KEY = 'onemindai-engine-config';

export class EngineConfigService {
  // Load configuration from localStorage - ALWAYS use DEFAULT_ENGINE_CONFIG for engines
  static loadConfig(): EngineConfig {
    // Always return the full DEFAULT_ENGINE_CONFIG with all 9 engines
    // This ensures new engines are always available
    console.log(`[EngineConfigService] Loading config with ${DEFAULT_ENGINE_CONFIG.engines.length} engines`);
    return DEFAULT_ENGINE_CONFIG;
  }
  
  // Clear old cached config to force refresh
  static clearCache(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[EngineConfigService] Cache cleared');
  }

  // Save configuration to localStorage
  static saveConfig(config: EngineConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving engine config:', error);
    }
  }

  // Add new engine
  static addEngine(config: EngineConfig, engine: Engine): EngineConfig {
    const newConfig = {
      ...config,
      engines: [...config.engines, engine],
    };
    this.saveConfig(newConfig);
    return newConfig;
  }

  // Remove engine
  static removeEngine(config: EngineConfig, engineId: string): EngineConfig {
    const newConfig = {
      ...config,
      engines: config.engines.filter(e => e.id !== engineId),
      disabledEngines: config.disabledEngines.filter(id => id !== engineId),
    };
    // Remove model health data for removed engine
    const { [engineId]: removed, ...remainingHealth } = config.modelHealth;
    newConfig.modelHealth = remainingHealth;
    
    this.saveConfig(newConfig);
    return newConfig;
  }

  // Update engine
  static updateEngine(config: EngineConfig, engineId: string, updates: Partial<Engine>): EngineConfig {
    const newConfig = {
      ...config,
      engines: config.engines.map(e => 
        e.id === engineId ? { ...e, ...updates } : e
      ),
    };
    this.saveConfig(newConfig);
    return newConfig;
  }

  // Enable/disable engine
  static toggleEngine(config: EngineConfig, engineId: string): EngineConfig {
    const newConfig = {
      ...config,
      engines: config.engines.map(e => 
        e.id === engineId ? { ...e, isEnabled: !e.isEnabled } : e
      ),
      disabledEngines: config.disabledEngines.includes(engineId)
        ? config.disabledEngines.filter(id => id !== engineId)
        : [...config.disabledEngines, engineId],
    };
    this.saveConfig(newConfig);
    return newConfig;
  }

  // Add model to engine
  static addModelToEngine(config: EngineConfig, engineId: string, modelId: string): EngineConfig {
    const newConfig = {
      ...config,
      engines: config.engines.map(e => 
        e.id === engineId 
          ? { ...e, versions: [...new Set([...e.versions, modelId])] }
          : e
      ),
    };
    this.saveConfig(newConfig);
    return newConfig;
  }

  // Remove model from engine
  static removeModelFromEngine(config: EngineConfig, engineId: string, modelId: string): EngineConfig {
    const newConfig = {
      ...config,
      engines: config.engines.map(e => 
        e.id === engineId 
          ? { 
              ...e, 
              versions: e.versions.filter(v => v !== modelId),
              selectedVersion: e.selectedVersion === modelId ? e.versions[0] : e.selectedVersion
            }
          : e
      ),
    };
    this.saveConfig(newConfig);
    return newConfig;
  }

  // Reorder models in engine
  static reorderModels(config: EngineConfig, engineId: string, newOrder: string[]): EngineConfig {
    const newConfig = {
      ...config,
      engines: config.engines.map(e => 
        e.id === engineId 
          ? { ...e, versions: newOrder }
          : e
      ),
    };
    this.saveConfig(newConfig);
    return newConfig;
  }

  // Update model health status
  static updateModelHealth(config: EngineConfig, engineId: string, modelId: string, health: ModelHealthStatus): EngineConfig {
    const newConfig = {
      ...config,
      modelHealth: {
        ...config.modelHealth,
        [engineId]: {
          ...config.modelHealth[engineId],
          [modelId]: health,
        },
      },
    };
    this.saveConfig(newConfig);
    return newConfig;
  }

  // Test model health using backend proxy
  static async testModelHealth(engine: Engine, modelId: string): Promise<ModelHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Use the backend proxy endpoint (same as main app)
      const proxyUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_PROXY_URL || 'http://localhost:3002';
      const providerEndpoint = `${proxyUrl}/api/${engine.provider === 'anthropic' ? 'anthropic' : engine.provider}`;
      
      console.log(`[Health Check] Testing ${engine.name} - ${modelId}`);
      
      // Make a minimal test request
      const response = await fetch(providerEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hi' }],
          model: modelId,
          max_tokens: 1, // Minimal tokens to reduce cost
          stream: false, // Non-streaming for health check
        }),
        signal: AbortSignal.timeout(10000),
      });

      const responseTime = Date.now() - startTime;
      const responseData = await response.json().catch(() => ({}));

      let healthStatus: ModelHealthStatus;

      if (response.ok) {
        // Success - model is working
        console.log(`[Health Check] ✅ ${engine.name} - ${modelId}: OK (${responseTime}ms)`);
        healthStatus = {
          isWorking: true,
          lastChecked: Date.now(),
          responseTime,
        };
      } else {
        // API returned error
        const errorMessage = responseData.error || responseData.message || `HTTP ${response.status}`;
        console.error(`[Health Check] ❌ ${engine.name} - ${modelId}: ${errorMessage}`);
        
        healthStatus = {
          isWorking: false,
          lastChecked: Date.now(),
          responseTime,
          error: errorMessage,
        };
      }

      // Save to database for history
      try {
        const { getSupabase } = await import('../../lib/supabase/client');
        const supabase = getSupabase();
        
        // First, find the ai_models record to get the UUID
        const { data: modelRecord, error: modelError } = await supabase
          .from('ai_models')
          .select('id')
          .eq('model_id', modelId)
          .single();
        
        if (modelError || !modelRecord) {
          console.warn(`[Health Check] Model ${modelId} not found in ai_models table, skipping history save`);
          return healthStatus;
        }
        
        // Save health check with the UUID
        const { error: insertError } = await supabase.from('model_health_logs').insert({
          model_id: modelRecord.id, // Use UUID from ai_models
          is_working: healthStatus.isWorking,
          response_time: responseTime,
          error_message: healthStatus.error || null,
          error_code: response.ok ? null : String(response.status),
          checked_at: new Date().toISOString(),
        });
        
        if (insertError) {
          console.error('[Health Check] Failed to insert:', insertError);
        } else {
          console.log(`[Health Check] 💾 Saved to database: ${modelId}`);
        }
      } catch (dbError) {
        console.error('[Health Check] Failed to save to database:', dbError);
      }

      return healthStatus;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      console.error(`[Health Check] ❌ ${engine.name} - ${modelId}: ${errorMessage}`);
      
      const healthStatus = {
        isWorking: false,
        lastChecked: Date.now(),
        responseTime,
        error: errorMessage,
      };

      // Save error to database
      try {
        const { getSupabase } = await import('../../lib/supabase/client');
        const supabase = getSupabase();
        
        await supabase.from('model_health_logs').insert({
          model_id: modelId,
          is_working: false,
          response_time: responseTime,
          error_message: errorMessage,
          error_code: 'NETWORK_ERROR',
          checked_at: new Date().toISOString(),
        });
      } catch (dbError) {
        console.error('[Health Check] Failed to save error to database:', dbError);
      }

      return healthStatus;
    }
  }

  // Test all models for an engine
  static async testAllModels(config: EngineConfig, engineId: string): Promise<EngineConfig> {
    const engine = config.engines.find(e => e.id === engineId);
    if (!engine) return config;

    let newConfig = { ...config };
    
    // Test each model
    for (const modelId of engine.versions) {
      const health = await this.testModelHealth(engine, modelId);
      newConfig = this.updateModelHealth(newConfig, engineId, modelId, health);
    }

    // Update engine overall working status
    const modelHealth = newConfig.modelHealth[engineId] || {};
    const allModelsWorking = Object.values(modelHealth).every(h => h.isWorking);
    
    newConfig = this.updateEngine(newConfig, engineId, {
      isWorking: allModelsWorking,
      lastChecked: Date.now(),
    });

    return newConfig;
  }

  // Reset to default configuration
  static resetToDefault(): EngineConfig {
    this.saveConfig(DEFAULT_ENGINE_CONFIG);
    return DEFAULT_ENGINE_CONFIG;
  }
}
