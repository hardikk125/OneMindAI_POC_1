/**
 * OneMindAI Logger
 * 
 * Styled console logging utilities with debug mode control.
 */

// =============================================================================
// DEBUG MODE STATE
// =============================================================================

let debugModeEnabled = false;

export function setDebugMode(enabled: boolean): void {
  debugModeEnabled = enabled;
}

export function isDebugMode(): boolean {
  return debugModeEnabled;
}

// =============================================================================
// LOG STYLES
// =============================================================================

const logStyles = {
  header: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 14px;',
  step: 'background: #4CAF50; color: white; padding: 6px 12px; border-radius: 3px; font-weight: bold;',
  data: 'background: #2196F3; color: white; padding: 6px 12px; border-radius: 3px;',
  warning: 'background: #FF9800; color: white; padding: 6px 12px; border-radius: 3px; font-weight: bold;',
  error: 'background: #F44336; color: white; padding: 6px 12px; border-radius: 3px; font-weight: bold;',
  success: 'background: #4CAF50; color: white; padding: 6px 12px; border-radius: 3px; font-weight: bold;',
  info: 'background: #00BCD4; color: white; padding: 6px 12px; border-radius: 3px;',
} as const;

// =============================================================================
// LOGGER FUNCTIONS
// =============================================================================

export const logger = {
  /**
   * Log a header message
   */
  header: (msg: string): void => {
    if (debugModeEnabled) {
      console.log(`%c${msg}`, logStyles.header);
    }
  },

  /**
   * Log a step in a process
   */
  step: (step: number, msg: string): void => {
    if (debugModeEnabled) {
      console.log(`%c STEP ${step} `, logStyles.step, msg);
    }
  },

  /**
   * Log data with a label
   */
  data: (label: string, data: unknown): void => {
    if (debugModeEnabled) {
      console.log(`%c ${label} `, logStyles.data);
      console.log(data);
    }
  },

  /**
   * Log a warning message
   */
  warning: (msg: string): void => {
    if (debugModeEnabled) {
      console.warn(`%c ⚠️ WARNING `, logStyles.warning, msg);
    }
  },

  /**
   * Log an error message
   */
  error: (msg: string, error?: unknown): void => {
    if (debugModeEnabled) {
      console.error(`%c ❌ ERROR `, logStyles.error, msg);
      if (error) console.error(error);
    }
  },

  /**
   * Log a success message
   */
  success: (msg: string): void => {
    if (debugModeEnabled) {
      console.log(`%c ✅ SUCCESS `, logStyles.success, msg);
    }
  },

  /**
   * Log an info message
   */
  info: (msg: string): void => {
    if (debugModeEnabled) {
      console.log(`%c ℹ️ INFO `, logStyles.info, msg);
    }
  },

  /**
   * Log a separator line
   */
  separator: (): void => {
    if (debugModeEnabled) {
      console.log('%c' + '='.repeat(80), 'color: #667eea;');
    }
  },

  /**
   * Log without style (always visible when debug mode is on)
   */
  plain: (msg: string): void => {
    if (debugModeEnabled) {
      console.log(msg);
    }
  },

  /**
   * Group related logs
   */
  group: (label: string): void => {
    if (debugModeEnabled) {
      console.group(label);
    }
  },

  /**
   * End a log group
   */
  groupEnd: (): void => {
    if (debugModeEnabled) {
      console.groupEnd();
    }
  },

  /**
   * Log a table
   */
  table: (data: unknown[]): void => {
    if (debugModeEnabled) {
      console.table(data);
    }
  },

  /**
   * Time a function
   */
  time: (label: string): void => {
    if (debugModeEnabled) {
      console.time(label);
    }
  },

  /**
   * End timing
   */
  timeEnd: (label: string): void => {
    if (debugModeEnabled) {
      console.timeEnd(label);
    }
  },
};

// =============================================================================
// TOGGLE DEBUG MODE
// =============================================================================

/**
 * Toggle debug mode and show instructions
 */
export function toggleDebugMode(): boolean {
  const newState = !debugModeEnabled;
  setDebugMode(newState);

  if (newState) {
    console.log('\n' + '='.repeat(80));
    console.log('[TERMINAL] 🐛 DEBUG MODE ENABLED - Styled logs are now visible');
    console.log('[TERMINAL] ⌨️  Press F12 or Ctrl+Shift+I to open DevTools');
    console.log('='.repeat(80) + '\n');
  } else {
    console.log('\n' + '='.repeat(80));
    console.log('[TERMINAL] 🐛 DEBUG MODE DISABLED - Styled logs are now hidden');
    console.log('='.repeat(80) + '\n');
  }

  return newState;
}

export default logger;
