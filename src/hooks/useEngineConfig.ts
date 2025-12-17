// =============================================================================
// Engine Configuration Hook
// =============================================================================

import { useEffect, useState } from 'react';
// Define Engine interface locally to avoid circular imports
interface Engine {
  id: string;
  name: string;
  provider: string;
  tokenizer: string;
  contextLimit: number;
  versions: string[];
  selectedVersion: string;
  outPolicy: { mode: string };
  apiKey: string;
  endpoint?: string;
  isEnabled?: boolean;
}
import { EngineConfigService } from '../admin/services/engine-config-service';
import { EngineConfig } from '../admin/types/engine-config';

export function useEngineConfig() {
  const [engines, setEngines] = useState<Engine[]>([]);

  useEffect(() => {
    // Load and merge admin configuration with default engines
    const loadEngines = () => {
      try {
        // Get admin config
        const adminConfig = EngineConfigService.loadConfig();
        
        // Get default engines (this would be imported from OneMindAI)
        // For now, we'll create a basic structure
        const defaultEngines: Engine[] = [
          { 
            id: "openai", 
            name: "ChatGPT", 
            provider: "openai", 
            tokenizer: "tiktoken", 
            contextLimit: 128_000, 
            versions: ["gpt-5-2025-08-07", "gpt-4.1", "gpt-4o"], 
            selectedVersion: "gpt-5-2025-08-07", 
            outPolicy: { mode: "auto" }, 
            apiKey: "" 
          },
          { 
            id: "claude", 
            name: "Claude", 
            provider: "anthropic", 
            tokenizer: "sentencepiece", 
            contextLimit: 200_000, 
            versions: ["claude-3.5-sonnet", "claude-3-5-sonnet-20241022"], 
            selectedVersion: "claude-3-5-sonnet-20241022", 
            outPolicy: { mode: "auto" }, 
            apiKey: "" 
          },
        ];

        // Merge admin config with defaults
        const mergedEngines = defaultEngines.map(defaultEngine => {
          const adminEngine = adminConfig.engines.find(e => e.id === defaultEngine.id);
          if (adminEngine) {
            // Return admin-modified engine
            return {
              ...defaultEngine,
              ...adminEngine,
              // Ensure required fields are preserved
              id: defaultEngine.id,
              provider: defaultEngine.provider,
              tokenizer: defaultEngine.tokenizer,
              contextLimit: defaultEngine.contextLimit,
              outPolicy: defaultEngine.outPolicy,
            };
          }
          // Check if engine is disabled in admin config
          if (adminConfig.disabledEngines.includes(defaultEngine.id)) {
            return { ...defaultEngine, isEnabled: false };
          }
          return defaultEngine;
        });

        // Add any new engines from admin config
        const adminOnlyEngines = adminConfig.engines.filter(
          adminEngine => !defaultEngines.find(e => e.id === adminEngine.id)
        );

        setEngines([...mergedEngines, ...adminOnlyEngines]);
      } catch (error) {
        console.error('Error loading engine configuration:', error);
        // Fallback to empty array
        setEngines([]);
      }
    };

    loadEngines();
  }, []);

  return { engines };
}
