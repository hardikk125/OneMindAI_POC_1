// =============================================================================
// GLOBAL CHANGE TRACKER
// Comprehensive tracking system for ALL code changes across the application
// =============================================================================

interface ChangeRecord {
  id: string;
  timestamp: Date;
  file: string;
  function?: string;
  component?: string;
  description: string;
  changeType: 'state' | 'props' | 'api' | 'database' | 'config' | 'ui' | 'error' | 'mount' | 'unmount';
  affectedAreas: string[];
  previousValue?: unknown;
  newValue?: unknown;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

interface DependencyMap {
  [key: string]: string[];
}

interface ComponentRegistry {
  [componentName: string]: {
    file: string;
    mountedAt?: Date;
    renderCount: number;
    lastProps?: Record<string, unknown>;
    stateChanges: number;
  };
}

// =============================================================================
// STORAGE
// =============================================================================

const changeHistory: ChangeRecord[] = [];
const MAX_HISTORY = 500;
const componentRegistry: ComponentRegistry = {};
const stateSnapshots: Map<string, unknown> = new Map();

// Comprehensive dependency map
const DEPENDENCY_MAP: DependencyMap = {
  // Hooks
  'useUIConfig': ['OneMindAI.tsx', 'AdminPanel.tsx', 'navigation-menu.tsx'],
  'useAuth': ['OneMindAI.tsx', 'AuthModal.tsx', 'UserMenu.tsx'],
  'useCompanies': ['CompanyBanner.tsx', 'OneMindAI.tsx'],
  
  // State
  'rolePrompts': ['OneMindAI.tsx', 'PromptPreview.tsx', 'FocusAreas.tsx'],
  'userRoles': ['OneMindAI.tsx', 'RoleSelector.tsx'],
  'modeOptions': ['OneMindAI.tsx', 'ModeToggle.tsx'],
  'selectedCompany': ['OneMindAI.tsx', 'CompanyBanner.tsx', 'FileUploadZone.tsx'],
  'selectedRole': ['OneMindAI.tsx', 'FocusAreas.tsx', 'PromptPreview.tsx'],
  'storyStep': ['OneMindAI.tsx'],
  'prompt': ['OneMindAI.tsx', 'PromptEditor.tsx'],
  'results': ['OneMindAI.tsx', 'ResultsPanel.tsx'],
  
  // Components
  'ROLE_FOCUS_AREAS': ['OneMindAI.tsx', 'navigation-menu.tsx'],
  'CompanyBanner': ['OneMindAI.tsx'],
  'FileUploadZone': ['OneMindAI.tsx'],
  'HubSpotModal': ['FileUploadZone.tsx'],
  'HubSpotSendButton': ['OneMindAI.tsx'],
  
  // Backend/API
  'supabase/client': ['useUIConfig.ts', 'credit-service.ts', 'auth.tsx'],
  'ai-proxy.cjs': ['OneMindAI.tsx', 'HubSpotModal.tsx', 'HubSpotSendButton.tsx'],
  '/api/hubspot': ['HubSpotModal.tsx', 'HubSpotSendButton.tsx'],
  '/api/openai': ['OneMindAI.tsx'],
  '/api/perplexity': ['FileUploadZone.tsx'],
  
  // Config
  '.env': ['ai-proxy.cjs', 'supabase/client.ts'],
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Track a change and log its effects
 */
export function trackChange(
  file: string,
  description: string,
  options?: {
    function?: string;
    component?: string;
    changeType?: ChangeRecord['changeType'];
    previousValue?: unknown;
    newValue?: unknown;
    metadata?: Record<string, unknown>;
    silent?: boolean;
  }
): ChangeRecord {
  const record: ChangeRecord = {
    id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    file,
    function: options?.function,
    component: options?.component,
    description,
    changeType: options?.changeType || 'state',
    affectedAreas: findAffectedAreas(file, options?.function),
    previousValue: options?.previousValue,
    newValue: options?.newValue,
    stackTrace: new Error().stack,
    metadata: options?.metadata,
  };

  // Add to history
  changeHistory.unshift(record);
  if (changeHistory.length > MAX_HISTORY) {
    changeHistory.pop();
  }

  // Log to console unless silent
  if (!options?.silent) {
    logChange(record);
  }

  return record;
}

/**
 * Find what areas might be affected by a change
 */
function findAffectedAreas(file: string, functionName?: string): string[] {
  const affected: Set<string> = new Set();

  // Check direct dependencies
  const key = functionName || file.split('/').pop()?.replace('.tsx', '').replace('.ts', '') || file;
  
  if (DEPENDENCY_MAP[key]) {
    DEPENDENCY_MAP[key].forEach(dep => affected.add(dep));
  }

  // Check if any dependency map key is in the file name
  Object.entries(DEPENDENCY_MAP).forEach(([source, deps]) => {
    if (file.includes(source) || (functionName && source === functionName)) {
      deps.forEach(dep => affected.add(dep));
    }
  });

  return Array.from(affected);
}

/**
 * Log change to console with formatting
 */
function logChange(record: ChangeRecord): void {
  const style = 'background: #1e40af; color: white; padding: 2px 6px; border-radius: 3px;';
  const warnStyle = 'background: #f59e0b; color: black; padding: 2px 6px; border-radius: 3px;';

  console.group(`%c📝 CHANGE TRACKED`, style);
  console.log(`📁 File: ${record.file}`);
  if (record.function) {
    console.log(`🔧 Function: ${record.function}`);
  }
  console.log(`📋 Description: ${record.description}`);
  console.log(`⏰ Time: ${record.timestamp.toLocaleTimeString()}`);

  if (record.affectedAreas.length > 0) {
    console.log(`%c⚠️ AFFECTED AREAS:`, warnStyle);
    record.affectedAreas.forEach(area => {
      console.log(`   → ${area}`);
    });
  }

  if (record.previousValue !== undefined) {
    console.log(`📤 Previous:`, record.previousValue);
  }
  if (record.newValue !== undefined) {
    console.log(`📥 New:`, record.newValue);
  }

  console.groupEnd();
}

// =============================================================================
// REACT HOOK FOR TRACKING STATE CHANGES
// =============================================================================

/**
 * Wrapper for useState that tracks changes
 */
export function useTrackedState<T>(
  initialValue: T,
  name: string,
  file: string
): [T, (value: T | ((prev: T) => T)) => void] {
  // This would need React import - simplified version
  let currentValue = initialValue;

  const setValue = (newValue: T | ((prev: T) => T)) => {
    const resolvedValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(currentValue)
      : newValue;

    trackChange(file, `State "${name}" changed`, {
      function: name,
      previousValue: currentValue,
      newValue: resolvedValue,
    });

    currentValue = resolvedValue;
  };

  return [currentValue, setValue];
}

// =============================================================================
// SPECIALIZED TRACKING FUNCTIONS
// =============================================================================

/**
 * Track API calls
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  options?: {
    requestBody?: unknown;
    responseStatus?: number;
    responseData?: unknown;
    error?: string;
    duration?: number;
  }
): void {
  trackChange('api', `${method} ${endpoint}`, {
    changeType: 'api',
    metadata: {
      method,
      endpoint,
      status: options?.responseStatus,
      duration: options?.duration,
      error: options?.error,
    },
    previousValue: options?.requestBody,
    newValue: options?.responseData,
  });
}

/**
 * Track component mount/unmount
 */
export function trackComponent(
  componentName: string,
  action: 'mount' | 'unmount' | 'render',
  props?: Record<string, unknown>
): void {
  if (!componentRegistry[componentName]) {
    componentRegistry[componentName] = {
      file: `${componentName}.tsx`,
      renderCount: 0,
      stateChanges: 0,
    };
  }

  const reg = componentRegistry[componentName];

  if (action === 'mount') {
    reg.mountedAt = new Date();
    reg.renderCount = 1;
    trackChange(reg.file, `Component mounted`, {
      component: componentName,
      changeType: 'mount',
      newValue: props,
    });
  } else if (action === 'unmount') {
    trackChange(reg.file, `Component unmounted after ${reg.renderCount} renders`, {
      component: componentName,
      changeType: 'unmount',
      metadata: { totalRenders: reg.renderCount, totalStateChanges: reg.stateChanges },
    });
  } else if (action === 'render') {
    reg.renderCount++;
    if (reg.renderCount > 10) {
      console.warn(`⚠️ ${componentName} has rendered ${reg.renderCount} times - possible performance issue`);
    }
  }
}

/**
 * Track state changes with component context
 */
export function trackStateChange(
  componentName: string,
  stateName: string,
  previousValue: unknown,
  newValue: unknown
): void {
  if (componentRegistry[componentName]) {
    componentRegistry[componentName].stateChanges++;
  }

  // Store snapshot for comparison
  const snapshotKey = `${componentName}.${stateName}`;
  stateSnapshots.set(snapshotKey, newValue);

  trackChange(`${componentName}.tsx`, `State "${stateName}" changed`, {
    component: componentName,
    function: `set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}`,
    changeType: 'state',
    previousValue,
    newValue,
  });
}

/**
 * Track errors
 */
export function trackError(
  file: string,
  error: Error | string,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  trackChange(file, `Error: ${errorMessage}`, {
    changeType: 'error',
    metadata: {
      ...context,
      stack: errorStack,
    },
  });

  // Also log to console with red styling
  console.error(`%c🚨 ERROR in ${file}`, 'background: #dc2626; color: white; padding: 2px 6px;', errorMessage);
}

/**
 * Track props changes
 */
export function trackPropsChange(
  componentName: string,
  propName: string,
  previousValue: unknown,
  newValue: unknown
): void {
  trackChange(`${componentName}.tsx`, `Prop "${propName}" changed`, {
    component: componentName,
    changeType: 'props',
    previousValue,
    newValue,
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get recent changes
 */
export function getRecentChanges(count: number = 10): ChangeRecord[] {
  return changeHistory.slice(0, count);
}

/**
 * Get changes for a specific file
 */
export function getChangesForFile(file: string): ChangeRecord[] {
  return changeHistory.filter(r => r.file.includes(file));
}

/**
 * Get changes by type
 */
export function getChangesByType(type: ChangeRecord['changeType']): ChangeRecord[] {
  return changeHistory.filter(r => r.changeType === type);
}

/**
 * Get component stats
 */
export function getComponentStats(): ComponentRegistry {
  return { ...componentRegistry };
}

/**
 * Get state snapshot
 */
export function getStateSnapshot(componentName: string, stateName: string): unknown {
  return stateSnapshots.get(`${componentName}.${stateName}`);
}

/**
 * Clear change history
 */
export function clearChangeHistory(): void {
  changeHistory.length = 0;
  console.log('%c🗑️ Change history cleared', 'color: gray;');
}

/**
 * Export change history as JSON
 */
export function exportChangeHistory(): string {
  return JSON.stringify(changeHistory, null, 2);
}

/**
 * Add a dependency mapping
 */
export function addDependency(source: string, dependents: string[]): void {
  if (!DEPENDENCY_MAP[source]) {
    DEPENDENCY_MAP[source] = [];
  }
  DEPENDENCY_MAP[source].push(...dependents);
}

/**
 * Generate a change report
 */
export function generateReport(): string {
  const report = {
    generatedAt: new Date().toISOString(),
    totalChanges: changeHistory.length,
    byType: {
      state: getChangesByType('state').length,
      props: getChangesByType('props').length,
      api: getChangesByType('api').length,
      database: getChangesByType('database').length,
      error: getChangesByType('error').length,
      mount: getChangesByType('mount').length,
      unmount: getChangesByType('unmount').length,
    },
    components: componentRegistry,
    recentChanges: getRecentChanges(20),
    errors: getChangesByType('error'),
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Print summary to console
 */
export function printSummary(): void {
  console.group('%c📊 CHANGE TRACKER SUMMARY', 'background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px;');
  
  console.log(`Total changes tracked: ${changeHistory.length}`);
  console.log(`State changes: ${getChangesByType('state').length}`);
  console.log(`API calls: ${getChangesByType('api').length}`);
  console.log(`Errors: ${getChangesByType('error').length}`);
  console.log(`Components tracked: ${Object.keys(componentRegistry).length}`);
  
  console.log('\n📁 Most affected files:');
  const fileCounts: Record<string, number> = {};
  changeHistory.forEach(r => {
    fileCounts[r.file] = (fileCounts[r.file] || 0) + 1;
  });
  Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([file, count]) => {
      console.log(`   ${file}: ${count} changes`);
    });

  console.groupEnd();
}

// =============================================================================
// CONSOLE COMMANDS (for debugging)
// =============================================================================

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__changeTracker = {
    // Core
    trackChange,
    trackApiCall,
    trackComponent,
    trackStateChange,
    trackError,
    trackPropsChange,
    
    // Queries
    getRecentChanges,
    getChangesForFile,
    getChangesByType,
    getComponentStats,
    getStateSnapshot,
    
    // Utilities
    clearChangeHistory,
    exportChangeHistory,
    addDependency,
    generateReport,
    printSummary,
    
    // Raw data
    history: changeHistory,
    components: componentRegistry,
    snapshots: stateSnapshots,
  };

  console.log(
    '%c🔍 Global Change Tracker loaded. Use window.__changeTracker to access.',
    'color: #10b981; font-weight: bold;'
  );
  console.log(
    '%c   Commands: printSummary(), getRecentChanges(), generateReport()',
    'color: #6b7280;'
  );
}

export default {
  // Core tracking
  trackChange,
  trackApiCall,
  trackComponent,
  trackStateChange,
  trackError,
  trackPropsChange,
  
  // Queries
  getRecentChanges,
  getChangesForFile,
  getChangesByType,
  getComponentStats,
  getStateSnapshot,
  
  // Utilities
  clearChangeHistory,
  exportChangeHistory,
  addDependency,
  generateReport,
  printSummary,
};
