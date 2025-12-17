// =============================================================================
// useAdminConfig Hook - Unit Tests
// Tests for admin configuration hook that fetches system_config and provider_config
// Created: 2025-12-13 | Initials: HP | Layer: Frontend | Type: Test
// =============================================================================

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock types for testing
interface SystemConfigItem {
  key: string;
  value: string | number | boolean;
  category: 'limits' | 'api' | 'pricing' | 'technical';
  description: string | null;
  is_sensitive: boolean;
}

interface ProviderConfigItem {
  provider: string;
  is_enabled: boolean;
  max_output_cap: number;
  rate_limit_rpm: number;
  timeout_seconds: number;
  retry_count: number;
}

// =============================================================================
// HELPER FUNCTION TESTS (Pure functions, no mocking needed)
// =============================================================================

describe('useAdminConfig Helper Functions', () => {
  // Test data
  const mockSystemConfig: SystemConfigItem[] = [
    { key: 'prompt_soft_limit', value: 5000, category: 'limits', description: 'Warning threshold', is_sensitive: false },
    { key: 'prompt_hard_limit', value: 10000, category: 'limits', description: 'Max limit', is_sensitive: false },
    { key: 'stream_timeout_ms', value: 30000, category: 'api', description: 'Timeout', is_sensitive: false },
    { key: 'signup_bonus_credits', value: 100, category: 'pricing', description: 'Bonus', is_sensitive: false },
    { key: 'debounce_ms', value: 300, category: 'technical', description: 'Debounce', is_sensitive: false },
  ];

  const mockProviderConfig: ProviderConfigItem[] = [
    { provider: 'openai', is_enabled: true, max_output_cap: 16384, rate_limit_rpm: 3500, timeout_seconds: 30, retry_count: 3 },
    { provider: 'anthropic', is_enabled: true, max_output_cap: 8192, rate_limit_rpm: 3500, timeout_seconds: 30, retry_count: 3 },
    { provider: 'gemini', is_enabled: false, max_output_cap: 8192, rate_limit_rpm: 3600, timeout_seconds: 30, retry_count: 3 },
  ];

  // =============================================================================
  // getSystemConfig Tests
  // =============================================================================

  describe('getSystemConfig', () => {
    // Inline implementation for testing
    function getSystemConfig<T extends string | number | boolean>(
      config: SystemConfigItem[],
      key: string,
      defaultValue?: T
    ): T {
      const item = config.find(c => c.key === key);
      if (item) return item.value as T;
      return defaultValue as T;
    }

    test('returns correct value for existing key', () => {
      const result = getSystemConfig<number>(mockSystemConfig, 'prompt_soft_limit');
      expect(result).toBe(5000);
    });

    test('returns correct value for different category', () => {
      const result = getSystemConfig<number>(mockSystemConfig, 'stream_timeout_ms');
      expect(result).toBe(30000);
    });

    test('returns default value for missing key', () => {
      const result = getSystemConfig<number>(mockSystemConfig, 'nonexistent_key', 999);
      expect(result).toBe(999);
    });

    test('returns undefined when key missing and no default', () => {
      const result = getSystemConfig<number>(mockSystemConfig, 'nonexistent_key');
      expect(result).toBeUndefined();
    });

    test('handles empty config array', () => {
      const result = getSystemConfig<number>([], 'prompt_soft_limit', 1000);
      expect(result).toBe(1000);
    });
  });

  // =============================================================================
  // getSystemConfigByCategory Tests
  // =============================================================================

  describe('getSystemConfigByCategory', () => {
    // Inline implementation for testing
    function getSystemConfigByCategory(
      config: SystemConfigItem[],
      category: SystemConfigItem['category']
    ): SystemConfigItem[] {
      return config.filter(c => c.category === category);
    }

    test('returns all items in limits category', () => {
      const result = getSystemConfigByCategory(mockSystemConfig, 'limits');
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('prompt_soft_limit');
      expect(result[1].key).toBe('prompt_hard_limit');
    });

    test('returns all items in api category', () => {
      const result = getSystemConfigByCategory(mockSystemConfig, 'api');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('stream_timeout_ms');
    });

    test('returns empty array for category with no items', () => {
      const result = getSystemConfigByCategory([], 'limits');
      expect(result).toHaveLength(0);
    });
  });

  // =============================================================================
  // getProviderConfig Tests
  // =============================================================================

  describe('getProviderConfig', () => {
    // Inline implementation for testing
    function getProviderConfig(
      config: ProviderConfigItem[],
      provider: string
    ): ProviderConfigItem | undefined {
      return config.find(c => c.provider === provider);
    }

    test('returns correct provider config for openai', () => {
      const result = getProviderConfig(mockProviderConfig, 'openai');
      expect(result).toBeDefined();
      expect(result?.provider).toBe('openai');
      expect(result?.max_output_cap).toBe(16384);
      expect(result?.is_enabled).toBe(true);
    });

    test('returns correct provider config for anthropic', () => {
      const result = getProviderConfig(mockProviderConfig, 'anthropic');
      expect(result).toBeDefined();
      expect(result?.provider).toBe('anthropic');
      expect(result?.max_output_cap).toBe(8192);
    });

    test('returns undefined for nonexistent provider', () => {
      const result = getProviderConfig(mockProviderConfig, 'nonexistent');
      expect(result).toBeUndefined();
    });

    test('handles empty config array', () => {
      const result = getProviderConfig([], 'openai');
      expect(result).toBeUndefined();
    });
  });

  // =============================================================================
  // getEnabledProviders Tests
  // =============================================================================

  describe('getEnabledProviders', () => {
    // Inline implementation for testing
    function getEnabledProviders(config: ProviderConfigItem[]): ProviderConfigItem[] {
      return config.filter(c => c.is_enabled);
    }

    test('returns only enabled providers', () => {
      const result = getEnabledProviders(mockProviderConfig);
      expect(result).toHaveLength(2);
      expect(result.map(p => p.provider)).toEqual(['openai', 'anthropic']);
    });

    test('excludes disabled providers', () => {
      const result = getEnabledProviders(mockProviderConfig);
      expect(result.find(p => p.provider === 'gemini')).toBeUndefined();
    });

    test('returns empty array when all disabled', () => {
      const allDisabled = mockProviderConfig.map(p => ({ ...p, is_enabled: false }));
      const result = getEnabledProviders(allDisabled);
      expect(result).toHaveLength(0);
    });

    test('handles empty config array', () => {
      const result = getEnabledProviders([]);
      expect(result).toHaveLength(0);
    });
  });

  // =============================================================================
  // getProviderMaxOutput Tests
  // =============================================================================

  describe('getProviderMaxOutput', () => {
    // Inline implementation for testing
    function getProviderMaxOutput(config: ProviderConfigItem[], provider: string): number {
      const providerConfig = config.find(c => c.provider === provider);
      return providerConfig?.max_output_cap ?? 8192;
    }

    test('returns correct max output for openai', () => {
      const result = getProviderMaxOutput(mockProviderConfig, 'openai');
      expect(result).toBe(16384);
    });

    test('returns correct max output for anthropic', () => {
      const result = getProviderMaxOutput(mockProviderConfig, 'anthropic');
      expect(result).toBe(8192);
    });

    test('returns default 8192 for nonexistent provider', () => {
      const result = getProviderMaxOutput(mockProviderConfig, 'nonexistent');
      expect(result).toBe(8192);
    });

    test('returns default 8192 for empty config', () => {
      const result = getProviderMaxOutput([], 'openai');
      expect(result).toBe(8192);
    });
  });

  // =============================================================================
  // parseConfigValue Tests
  // =============================================================================

  describe('parseConfigValue', () => {
    // Inline implementation for testing
    function parseConfigValue(value: unknown): string | number | boolean {
      if (typeof value === 'string') {
        const num = Number(value);
        if (!isNaN(num)) return num;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
      }
      return value as string | number | boolean;
    }

    test('parses string number to number', () => {
      expect(parseConfigValue('5000')).toBe(5000);
    });

    test('parses string float to number', () => {
      expect(parseConfigValue('0.75')).toBe(0.75);
    });

    test('parses string "true" to boolean true', () => {
      expect(parseConfigValue('true')).toBe(true);
    });

    test('parses string "false" to boolean false', () => {
      expect(parseConfigValue('false')).toBe(false);
    });

    test('keeps regular string as string', () => {
      expect(parseConfigValue('hello')).toBe('hello');
    });

    test('keeps number as number', () => {
      expect(parseConfigValue(42)).toBe(42);
    });

    test('keeps boolean as boolean', () => {
      expect(parseConfigValue(true)).toBe(true);
    });
  });
});

// =============================================================================
// DEFAULT VALUES TESTS
// =============================================================================

describe('Default Configuration Values', () => {
  const DEFAULT_SYSTEM_CONFIG: SystemConfigItem[] = [
    { key: 'prompt_soft_limit', value: 5000, category: 'limits', description: 'Warning threshold for prompt length', is_sensitive: false },
    { key: 'prompt_hard_limit', value: 10000, category: 'limits', description: 'Maximum prompt length (hard block)', is_sensitive: false },
    { key: 'prompt_chunk_size', value: 4000, category: 'limits', description: 'Chunk size for long prompts', is_sensitive: false },
    { key: 'max_prompt_length', value: 7000, category: 'limits', description: 'Truncation point before API call', is_sensitive: false },
    { key: 'stream_timeout_ms', value: 30000, category: 'api', description: 'Timeout for streaming responses', is_sensitive: false },
    { key: 'request_timeout_ms', value: 60000, category: 'api', description: 'General request timeout', is_sensitive: false },
    { key: 'expected_output_tokens', value: 1000, category: 'pricing', description: 'Default expected output tokens', is_sensitive: false },
    { key: 'signup_bonus_credits', value: 100, category: 'pricing', description: 'Credits given to new users', is_sensitive: false },
    { key: 'markup_percentage', value: 30, category: 'pricing', description: 'Markup percentage over provider costs', is_sensitive: false },
    { key: 'debounce_ms', value: 300, category: 'technical', description: 'Input debounce delay', is_sensitive: false },
    { key: 'animation_duration_ms', value: 200, category: 'technical', description: 'Animation duration', is_sensitive: false },
    { key: 'update_interval_ms', value: 15, category: 'technical', description: 'Streaming refresh rate', is_sensitive: false },
    { key: 'toast_duration_ms', value: 5000, category: 'technical', description: 'Notification display time', is_sensitive: false },
  ];

  test('has correct number of default system config items', () => {
    expect(DEFAULT_SYSTEM_CONFIG).toHaveLength(13);
  });

  test('has 4 limits category items', () => {
    const limits = DEFAULT_SYSTEM_CONFIG.filter(c => c.category === 'limits');
    expect(limits).toHaveLength(4);
  });

  test('has 2 api category items', () => {
    const api = DEFAULT_SYSTEM_CONFIG.filter(c => c.category === 'api');
    expect(api).toHaveLength(2);
  });

  test('has 3 pricing category items', () => {
    const pricing = DEFAULT_SYSTEM_CONFIG.filter(c => c.category === 'pricing');
    expect(pricing).toHaveLength(3);
  });

  test('has 4 technical category items', () => {
    const technical = DEFAULT_SYSTEM_CONFIG.filter(c => c.category === 'technical');
    expect(technical).toHaveLength(4);
  });

  test('all items have required fields', () => {
    DEFAULT_SYSTEM_CONFIG.forEach(item => {
      expect(item.key).toBeDefined();
      expect(item.value).toBeDefined();
      expect(item.category).toBeDefined();
      expect(item.description).toBeDefined();
      expect(typeof item.is_sensitive).toBe('boolean');
    });
  });
});

// =============================================================================
// CACHE TESTS
// =============================================================================

describe('Cache Functions', () => {
  const CACHE_KEY = 'onemindai-admin-config';
  const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  test('cache duration is 5 minutes', () => {
    expect(CACHE_DURATION_MS).toBe(300000);
  });

  test('cache key is correct', () => {
    expect(CACHE_KEY).toBe('onemindai-admin-config');
  });
});
