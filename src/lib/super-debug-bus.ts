/**
 * Super Debug Event Bus
 * 
 * A dynamic, real-time event system for the Super Debug Panel.
 * Automatically detects and tracks:
 * - Function calls and file handoffs
 * - Library triggers
 * - Chunk streaming and merging
 * - Error flows with business/technical explanations
 * - State updates
 * - DOM injections
 * 
 * NO HARDCODING - dynamically adapts to new code and libraries
 */

// ===== Event Types =====
export type DebugEventType =
  // Pipeline & Execution
  | 'PIPELINE_START' | 'PIPELINE_STEP' | 'PIPELINE_END'
  | 'FUNCTION_ENTER' | 'FUNCTION_EXIT'
  | 'FILE_HANDOFF'
  // Streaming
  | 'CHUNK_RECEIVED' | 'CHUNK_MERGED' | 'STREAM_START' | 'STREAM_END'
  // Processing
  | 'LIBRARY_TRIGGERED' | 'TABLE_DETECTED' | 'CHART_GENERATED'
  | 'MARKDOWN_PARSE' | 'CODE_BLOCK_EXTRACTED'
  // State & DOM
  | 'STATE_UPDATE' | 'DOM_INJECT' | 'COMPONENT_RENDER'
  // Errors
  | 'ERROR_CAUGHT' | 'ERROR_FLOW_STEP' | 'AUTO_RETRY_START' | 'AUTO_RETRY_END'
  // Custom/Dynamic
  | 'CUSTOM';

// ===== Event Severity =====
export type EventSeverity = 'info' | 'success' | 'warning' | 'error' | 'debug';

// ===== Error Explanation Interface =====
export interface ErrorExplanation {
  technical: string;
  business: string;
  actionRequired: string[];
  isAutoRetryable: boolean;
  statusCode?: number;
  errorType?: string;
}

// ===== Main Debug Event Interface =====
export interface DebugEvent {
  id: string;
  type: DebugEventType;
  timestamp: number;
  severity: EventSeverity;
  
  // Source tracking (dynamic - extracted at runtime)
  source: {
    file: string;
    function: string;
    line?: number;
    component?: string;
  };
  
  // Event data
  data: {
    // Generic
    message: string;
    details?: any;
    
    // Streaming
    chunk?: string;
    chunkIndex?: number;
    totalChunks?: number;
    mergedContent?: string;
    
    // Engine/Provider
    engineId?: string;
    engineName?: string;
    provider?: string;
    
    // Library
    library?: string;
    libraryFunction?: string;
    libraryReason?: string;
    inputPreview?: string;
    outputPreview?: string;
    
    // Error (with business + technical)
    error?: any;
    errorExplanation?: ErrorExplanation;
    
    // State
    stateKey?: string;
    statePrevValue?: any;
    stateNewValue?: any;
    
    // Processing
    inputSize?: number;
    outputSize?: number;
    processingTime?: number;
    elementsDetected?: Record<string, number>;
    
    // Code context
    codeSnippet?: string;
    variables?: Record<string, any>;
  };
  
  // Pipeline tracking
  pipelineStep?: number;
  pipelineTotal?: number;
}

// ===== Dynamic Source Detector =====
function getCallerInfo(): { file: string; function: string; line?: number } {
  try {
    const stack = new Error().stack;
    if (!stack) return { file: 'unknown', function: 'unknown' };
    
    const lines = stack.split('\n');
    // Skip first 3 lines (Error, getCallerInfo, emit/emitAsync)
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip internal debug bus calls
      if (line.includes('super-debug-bus') || line.includes('debugBus')) continue;
      
      // Extract file and function from stack trace
      // Format: "at functionName (file:line:col)" or "at file:line:col"
      const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):\d+\)?/);
      if (match) {
        const funcName = match[1] || 'anonymous';
        const filePath = match[2] || 'unknown';
        const lineNum = parseInt(match[3]) || undefined;
        
        // Extract just the filename from path
        const fileName = filePath.split(/[/\\]/).pop() || filePath;
        
        return {
          file: fileName,
          function: funcName.replace(/^Object\./, '').replace(/^async /, ''),
          line: lineNum
        };
      }
    }
  } catch (e) {
    // Fallback if stack parsing fails
  }
  return { file: 'unknown', function: 'unknown' };
}

// ===== Library Detection =====
const KNOWN_LIBRARIES = new Map<RegExp, string>([
  [/marked/i, 'marked'],
  [/echarts/i, 'ECharts'],
  [/mermaid/i, 'Mermaid'],
  [/plotly/i, 'Plotly'],
  [/anthropic/i, '@anthropic-ai/sdk'],
  [/openai/i, 'openai'],
  [/google.*generative/i, '@google/generative-ai'],
  [/mammoth/i, 'mammoth'],
  [/react/i, 'React'],
  [/axios/i, 'axios'],
  [/fetch/i, 'Fetch API'],
]);

function detectLibrary(functionName: string, code?: string): string | undefined {
  const searchText = `${functionName} ${code || ''}`.toLowerCase();
  for (const [pattern, name] of KNOWN_LIBRARIES) {
    if (pattern.test(searchText)) return name;
  }
  return undefined;
}

// ===== Error Explanation Generator =====
function generateErrorExplanation(error: any, provider?: string): ErrorExplanation {
  const statusCode = error?.statusCode || error?.status || error?.status_code || 
                     error?.error?.status || error?.response?.status;
  const errorMessage = error?.message || error?.error?.message || String(error);
  const errorType = error?.type || error?.error?.type || '';
  
  // Dynamic error analysis
  let technical = errorMessage;
  let business = '';
  let actionRequired: string[] = [];
  let isAutoRetryable = false;
  
  // Status code based analysis
  if (statusCode === 401 || errorMessage.toLowerCase().includes('unauthorized') || 
      errorMessage.toLowerCase().includes('invalid api key') ||
      errorMessage.toLowerCase().includes('authentication')) {
    technical = `Authentication failed (${statusCode}): ${errorMessage}`;
    business = 'Your API key is invalid, expired, or was not provided. The AI service cannot verify your identity.';
    actionRequired = [
      'Go to Settings and check your API key',
      `Get a new API key from the ${provider || 'provider'} dashboard`,
      'Ensure the key is correctly copied without extra spaces',
      'Verify the key has not been revoked or expired'
    ];
    isAutoRetryable = false;
  } else if (statusCode === 403 || errorMessage.toLowerCase().includes('forbidden') ||
             errorMessage.toLowerCase().includes('permission denied')) {
    technical = `Permission denied (${statusCode}): ${errorMessage}`;
    business = 'Your API key does not have permission to access this resource or model.';
    actionRequired = [
      'Check if your API plan includes access to this model',
      'Verify API key permissions in the provider console',
      'Contact provider support if permissions should be granted'
    ];
    isAutoRetryable = false;
  } else if (statusCode === 404 || errorMessage.toLowerCase().includes('not found')) {
    technical = `Resource not found (${statusCode}): ${errorMessage}`;
    business = 'The AI model or resource you requested does not exist or is not available.';
    actionRequired = [
      'Check if the model name is spelled correctly',
      'Verify the model is available in your region',
      'The model may have been deprecated or renamed'
    ];
    isAutoRetryable = false;
  } else if (statusCode === 429 || errorMessage.toLowerCase().includes('rate limit') ||
             errorMessage.toLowerCase().includes('too many requests')) {
    technical = `Rate limit exceeded (${statusCode}): ${errorMessage}`;
    business = 'You are sending requests too quickly. The system will automatically retry with delays.';
    actionRequired = [
      'Wait for automatic retry to complete',
      'Consider upgrading your API plan for higher limits',
      'Reduce the frequency of requests'
    ];
    isAutoRetryable = true;
  } else if (statusCode === 500 || errorMessage.toLowerCase().includes('internal server error')) {
    technical = `Server error (${statusCode}): ${errorMessage}`;
    business = 'The AI provider is experiencing internal issues. This is usually temporary.';
    actionRequired = [
      'Wait for automatic retry',
      'Check provider status page',
      'Try again in a few minutes'
    ];
    isAutoRetryable = true;
  } else if (statusCode === 503 || errorMessage.toLowerCase().includes('service unavailable') ||
             errorMessage.toLowerCase().includes('overloaded')) {
    technical = `Service unavailable (${statusCode}): ${errorMessage}`;
    business = 'The AI service is temporarily overloaded or under maintenance.';
    actionRequired = [
      'Wait for automatic retry',
      'Try during off-peak hours',
      'Check provider status page for maintenance'
    ];
    isAutoRetryable = true;
  } else if (statusCode === 400 || errorMessage.toLowerCase().includes('bad request') ||
             errorMessage.toLowerCase().includes('invalid')) {
    technical = `Bad request (${statusCode}): ${errorMessage}`;
    business = 'The request contains invalid parameters or formatting issues.';
    actionRequired = [
      'Check the request parameters',
      'Verify input format matches API requirements',
      'Review the API documentation'
    ];
    isAutoRetryable = false;
  } else if (errorMessage.toLowerCase().includes('network') || 
             errorMessage.toLowerCase().includes('connection') ||
             errorMessage.toLowerCase().includes('timeout')) {
    technical = `Network error: ${errorMessage}`;
    business = 'Unable to connect to the AI service. Check your internet connection.';
    actionRequired = [
      'Check your internet connection',
      'Verify firewall/proxy settings',
      'Try again in a moment'
    ];
    isAutoRetryable = true;
  } else {
    technical = `Error: ${errorMessage}`;
    business = 'An unexpected error occurred while processing your request.';
    actionRequired = [
      'Check the error details for more information',
      'Try again or contact support if the issue persists'
    ];
    isAutoRetryable = false;
  }
  
  return {
    technical,
    business,
    actionRequired,
    isAutoRetryable,
    statusCode,
    errorType
  };
}

// ===== Main Debug Event Bus Class =====
class SuperDebugBus {
  private listeners: Set<(event: DebugEvent) => void> = new Set();
  private events: DebugEvent[] = [];
  private maxEvents = 5000; // Increased to capture more events
  private enabled = true; // Always enabled by default to capture all events
  private pipelineCounter = 0;
  private currentPipelineTotal = 8; // Default pipeline steps
  
  // Statistics
  private stats = {
    totalChunks: 0,
    totalTokensEstimate: 0,
    totalErrors: 0,
    totalRetries: 0,
    libraryTriggers: new Map<string, number>(),
    fileHandoffs: new Map<string, number>(),
    startTime: Date.now()
  };
  
  // Enable/disable the debug bus
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      this.stats.startTime = Date.now();
      console.log('%c🔧 Super Debug Mode ENABLED', 'background: #667eea; color: white; padding: 8px; border-radius: 4px; font-weight: bold;');
    } else {
      console.log('%c🔧 Super Debug Mode DISABLED', 'background: #6b7280; color: white; padding: 8px; border-radius: 4px;');
    }
  }
  
  isEnabled() {
    return this.enabled;
  }
  
  // Generate unique event ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Main emit function
  emit(
    type: DebugEventType,
    message: string,
    data: Partial<DebugEvent['data']> = {},
    severity: EventSeverity = 'info'
  ): void {
    if (!this.enabled) {
      console.log(`[SuperDebugBus] emit(${type}) skipped - not enabled`);
      return;
    }
    
    // Log ALL event types for debugging
    console.log(`[SuperDebugBus] 📤 Event #${this.events.length + 1}: ${type} - ${message.substring(0, 50)}`);
    
    // Extra logging for important events
    if (type === 'LIBRARY_TRIGGERED') {
      console.log(`[SuperDebugBus] 📚 Library: ${data.library} - ${data.libraryFunction}`);
    }
    if (type === 'MARKDOWN_PARSE') {
      console.log(`[SuperDebugBus] 📝 Markdown parsed: ${data.inputSize} → ${data.outputSize} chars`);
    }
    if (type === 'DOM_INJECT') {
      console.log(`[SuperDebugBus] 💉 DOM injected: ${data.outputSize} bytes`);
    }
    if (type === 'COMPONENT_RENDER') {
      console.log(`[SuperDebugBus] 🧩 Component rendered: ${message}`);
    }
    
    const callerInfo = getCallerInfo();
    const detectedLibrary = detectLibrary(callerInfo.function, data.codeSnippet);
    
    const event: DebugEvent = {
      id: this.generateId(),
      type,
      timestamp: Date.now(),
      severity,
      source: {
        file: callerInfo.file,
        function: callerInfo.function,
        line: callerInfo.line
      },
      data: {
        message,
        library: detectedLibrary,
        ...data
      }
    };
    
    // Update pipeline tracking
    if (type === 'PIPELINE_START') {
      this.pipelineCounter = 0;
    } else if (type === 'PIPELINE_STEP') {
      this.pipelineCounter++;
      event.pipelineStep = this.pipelineCounter;
      event.pipelineTotal = this.currentPipelineTotal;
    }
    
    // Update statistics
    this.updateStats(event);
    
    // Store event
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Notify listeners
    this.listeners.forEach(fn => {
      try {
        fn(event);
      } catch (e) {
        console.error('Debug listener error:', e);
      }
    });
  }
  
  // Emit error with automatic explanation generation
  emitError(
    error: any,
    context: { provider?: string; engineId?: string; engineName?: string; functionName?: string } = {}
  ): void {
    if (!this.enabled) return;
    
    const explanation = generateErrorExplanation(error, context.provider);
    
    this.emit('ERROR_CAUGHT', explanation.technical, {
      error,
      errorExplanation: explanation,
      provider: context.provider,
      engineId: context.engineId,
      engineName: context.engineName
    }, 'error');
    
    // Also emit detailed error flow steps
    this.emit('ERROR_FLOW_STEP', `Status Code Extraction: ${explanation.statusCode || 'N/A'}`, {
      details: { statusCode: explanation.statusCode, errorType: explanation.errorType }
    }, 'warning');
    
    this.emit('ERROR_FLOW_STEP', `Business Impact: ${explanation.business}`, {
      details: { actionRequired: explanation.actionRequired }
    }, 'warning');
  }
  
  // Emit chunk with merge tracking - THROTTLED to prevent flooding
  emitChunk(chunk: string, engineId: string, totalContent: string): void {
    if (!this.enabled) return;
    
    this.stats.totalChunks++;
    this.stats.totalTokensEstimate += Math.ceil(chunk.length / 4); // Rough token estimate
    
    // Only emit chunk events every 50 chunks to prevent flooding
    // This keeps the important events visible while still tracking progress
    if (this.stats.totalChunks % 50 === 0 || this.stats.totalChunks <= 5) {
      this.emit('CHUNK_RECEIVED', `Chunk #${this.stats.totalChunks} received (${chunk.length} chars)`, {
        chunk: chunk.substring(0, 100),
        chunkIndex: this.stats.totalChunks,
        engineId
      }, 'debug');
      
      this.emit('CHUNK_MERGED', `Content merged: ${totalContent.length} total chars`, {
        mergedContent: totalContent.substring(totalContent.length - 200),
        engineId,
        chunkIndex: this.stats.totalChunks,
        inputSize: chunk.length,
        outputSize: totalContent.length
      }, 'debug');
    }
  }
  
  // Emit library trigger
  emitLibrary(
    library: string,
    functionName: string,
    reason: string,
    input?: string,
    output?: string
  ): void {
    if (!this.enabled) {
      console.log('[SuperDebugBus] emitLibrary skipped - not enabled');
      return;
    }
    
    console.log(`[SuperDebugBus] 📚 Library triggered: ${library}.${functionName}()`);
    
    // Update stats
    const count = this.stats.libraryTriggers.get(library) || 0;
    this.stats.libraryTriggers.set(library, count + 1);
    
    this.emit('LIBRARY_TRIGGERED', `${library}.${functionName}() triggered`, {
      library,
      libraryFunction: functionName,
      libraryReason: reason,
      inputPreview: input?.substring(0, 100),
      outputPreview: output?.substring(0, 100)
    }, 'info');
  }
  
  // Emit state update
  emitStateUpdate(stateKey: string, prevValue: any, newValue: any): void {
    if (!this.enabled) return;
    
    this.emit('STATE_UPDATE', `State updated: ${stateKey}`, {
      stateKey,
      statePrevValue: prevValue,
      stateNewValue: newValue
    }, 'debug');
  }
  
  // Emit file handoff
  emitFileHandoff(fromFile: string, toFile: string, dataType: string): void {
    if (!this.enabled) return;
    
    const key = `${fromFile} → ${toFile}`;
    const count = this.stats.fileHandoffs.get(key) || 0;
    this.stats.fileHandoffs.set(key, count + 1);
    
    this.emit('FILE_HANDOFF', `${fromFile} → ${toFile}`, {
      details: { fromFile, toFile, dataType }
    }, 'info');
  }
  
  // Subscribe to events
  subscribe(fn: (event: DebugEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  
  // Get all events
  getEvents(): DebugEvent[] {
    console.log('[SuperDebugBus] 📦 getEvents() - Returning', this.events.length, 'stored events');
    console.log('[SuperDebugBus] 📦 Event types in storage:', [...new Set(this.events.map(e => e.type))]);
    return [...this.events];
  }
  
  // Debug method to inspect stored events (for development)
  debugInspect(): void {
    console.log('='.repeat(50));
    console.log('🔍 SUPER DEBUG BUS - INTERNAL STATE');
    console.log('='.repeat(50));
    console.log('Total events stored:', this.events.length);
    console.log('Max events limit:', this.maxEvents);
    console.log('Is enabled:', this.enabled);
    console.log('');
    console.log('📊 Events by type:');
    const typeCounts: Record<string, number> = {};
    this.events.forEach(e => {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    });
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('');
    console.log('📚 Library triggers:', Object.fromEntries(this.stats.libraryTriggers));
    console.log('📁 File handoffs:', Object.fromEntries(this.stats.fileHandoffs));
    console.log('='.repeat(50));
  }
  
  // Get events by type
  getEventsByType(type: DebugEventType): DebugEvent[] {
    return this.events.filter(e => e.type === type);
  }
  
  // Get statistics
  getStats() {
    const stats = {
      ...this.stats,
      elapsedTime: Date.now() - this.stats.startTime,
      eventCount: this.events.length,
      libraryTriggers: Object.fromEntries(this.stats.libraryTriggers),
      fileHandoffs: Object.fromEntries(this.stats.fileHandoffs)
    };
    console.log('[SuperDebugBus] getStats() called - events:', this.events.length, 'libraries:', this.stats.libraryTriggers.size);
    return stats;
  }
  
  // Clear all events
  clear(): void {
    this.events = [];
    this.pipelineCounter = 0;
    this.stats = {
      totalChunks: 0,
      totalTokensEstimate: 0,
      totalErrors: 0,
      totalRetries: 0,
      libraryTriggers: new Map(),
      fileHandoffs: new Map(),
      startTime: Date.now()
    };
  }
  
  // Update statistics
  private updateStats(event: DebugEvent): void {
    if (event.type === 'ERROR_CAUGHT') {
      this.stats.totalErrors++;
    }
    if (event.type === 'AUTO_RETRY_START') {
      this.stats.totalRetries++;
    }
  }
  
  // Export log as JSON
  exportLog(): string {
    return JSON.stringify({
      events: this.events,
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

// ===== Singleton Export =====
export const superDebugBus = new SuperDebugBus();

// Log that the bus is initialized
console.log('[SuperDebugBus] 🚀 Initialized and enabled:', superDebugBus.isEnabled());

// Expose to window for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).superDebugBus = superDebugBus;
  console.log('[SuperDebugBus] 💡 TIP: Type "superDebugBus.debugInspect()" in browser console to see stored events');
}

// ===== Helper Hook for React =====
export function useSuperDebug() {
  return {
    emit: superDebugBus.emit.bind(superDebugBus),
    emitError: superDebugBus.emitError.bind(superDebugBus),
    emitChunk: superDebugBus.emitChunk.bind(superDebugBus),
    emitLibrary: superDebugBus.emitLibrary.bind(superDebugBus),
    emitStateUpdate: superDebugBus.emitStateUpdate.bind(superDebugBus),
    emitFileHandoff: superDebugBus.emitFileHandoff.bind(superDebugBus),
    subscribe: superDebugBus.subscribe.bind(superDebugBus),
    getEvents: superDebugBus.getEvents.bind(superDebugBus),
    getStats: superDebugBus.getStats.bind(superDebugBus),
    clear: superDebugBus.clear.bind(superDebugBus),
    setEnabled: superDebugBus.setEnabled.bind(superDebugBus),
    isEnabled: superDebugBus.isEnabled.bind(superDebugBus),
    exportLog: superDebugBus.exportLog.bind(superDebugBus)
  };
}

export default superDebugBus;
