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
  // API Flow (Frontend → Backend → Provider)
  | 'API_REQUEST_START' | 'API_REQUEST_SENT' | 'API_RESPONSE_RECEIVED'
  | 'BACKEND_PROCESS' | 'PARAM_MISMATCH' | 'TOKEN_CAP_APPLIED'
  // Real-time Flow Tracking
  | 'FETCH_START' | 'FETCH_RESPONSE' | 'FETCH_ERROR'
  | 'PROXY_RECEIVED' | 'PROXY_FORWARD' | 'PROXY_RESPONSE'
  | 'PROVIDER_CALL' | 'PROVIDER_STREAM' | 'PROVIDER_COMPLETE'
  // Supabase Operations
  | 'SUPABASE_QUERY' | 'SUPABASE_INSERT' | 'SUPABASE_UPDATE' | 'SUPABASE_RPC'
  | 'CREDIT_CHECK' | 'CREDIT_DEDUCT' | 'CREDIT_UPDATE'
  // Complete Code Flow Tracking (Real-time message content)
  | 'MESSAGE_PAYLOAD' | 'STREAM_CHUNK_CONTENT' | 'RESPONSE_COMPLETE'
  | 'FUNCTION_CALL_TRACE' | 'API_PAYLOAD_SENT' | 'API_RESPONSE_CONTENT'
  // Prompt Journey Tracking (Full prompt text through all stages)
  | 'PROMPT_JOURNEY' | 'RESPONSE_TRANSFORMATION' | 'TRUNCATION_DETECTED'
  // User Activity Tracking (Real-time click-to-response flow)
  | 'USER_CLICK' | 'USER_INPUT' | 'USER_SUBMIT' | 'USER_INTERACTION'
  | 'COMPONENT_TRIGGERED' | 'HANDLER_CALLED' | 'ROUTE_CHANGE'
  | 'MIDDLEWARE_ENTER' | 'MIDDLEWARE_EXIT'
  | 'RAILWAY_REQUEST' | 'RAILWAY_RESPONSE'
  | 'FLOW_NODE' | 'FLOW_COMPLETE'
  // Custom/Dynamic
  | 'CUSTOM';

// ===== User Activity Flow Node =====
export interface FlowNode {
  id: string;
  type: 'user' | 'component' | 'function' | 'api' | 'middleware' | 'backend' | 'database' | 'provider' | 'response';
  label: string;
  file?: string;
  function?: string;
  line?: number;
  timestamp: number;
  duration?: number;
  data?: any;
  children: FlowNode[];
  parent?: string;
}

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
    
    // API Flow tracking
    apiEndpoint?: string;
    requestParams?: {
      model?: string;
      max_tokens?: number;
      stream?: boolean;
      messages?: any[];
      promptLength?: number;
    };
    backendParams?: {
      model?: string;
      max_tokens?: number;
      stream?: boolean;
      cappedAt?: number;
    };
    mismatch?: {
      field: string;
      frontendValue: any;
      backendValue: any;
      reason: string;
    };
    
    // Real-time Flow Tracking
    flowStep?: {
      step: number;
      total: number;
      phase: 'frontend' | 'backend' | 'provider' | 'supabase' | 'middleware' | 'response';
      action: string;
      file: string;
      function: string;
      line?: number;
      duration?: number;
    };
    
    // Prompt Journey Tracking
    promptJourney?: {
      stage: 'user_input' | 'enhanced' | 'truncated' | 'sent_to_api' | 'received_response';
      stageLabel: string;
      fullPromptText: string;
      promptLength: number;
      originalLength?: number;
      currentLength?: number;
      truncatedAt?: number;
      truncationReason?: string;
      provider?: string;
      engineName?: string;
      transformations?: string[];
      filesAdded?: string[];
      maxTokens?: number;
    };
    
    // Response Transformation Tracking
    responseTransformation?: {
      stage: 'chunk_received' | 'accumulating' | 'finish_reason' | 'complete' | 'truncated';
      stageLabel: string;
      responseText: string;
      responseLength: number;
      provider?: string;
      engineName?: string;
      chunkIndex?: number;
      totalChunks?: number;
      finishReason?: string;
      tokensGenerated?: number;
      maxTokens?: number;
      isTruncated?: boolean;
      truncationDetails?: string;
      processingFunction?: string;
    };
    
    // Truncation Detection
    truncation?: {
      finishReason?: string;
      tokensGenerated?: number;
      maxTokens?: number;
      provider?: string;
      engineName?: string;
      responseLength?: number;
      explanation?: string;
    };
    
    // HTTP/Fetch tracking
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    httpStatus?: number;
    httpHeaders?: Record<string, string>;
    responseTime?: number;
    
    // Supabase tracking
    supabaseTable?: string;
    supabaseOperation?: 'select' | 'insert' | 'update' | 'delete' | 'rpc';
    supabaseQuery?: string | Record<string, any>;
    supabaseResult?: { count?: number; error?: string };
    
    // Credit tracking
    creditAmount?: number;
    creditBalance?: number;
    creditOperation?: 'check' | 'deduct' | 'add';
    
    // Complete Code Flow - Message Content Tracking
    messagePayload?: {
      messages: Array<{ role: string; content: string }>;
      model?: string;
      max_tokens?: number;
      stream?: boolean;
      temperature?: number;
    };
    streamChunk?: {
      content: string;
      chunkIndex: number;
      totalLength: number;
      isComplete: boolean;
    };
    responseContent?: {
      fullText: string;
      tokenCount?: number;
      finishReason?: string;
    };
    functionTrace?: {
      name: string;
      file: string;
      line?: number;
      args?: Record<string, any>;
      phase: 'enter' | 'exit';
      duration?: number;
    };
    
    // User Activity Tracking
    userActivity?: {
      action: 'click' | 'input' | 'submit' | 'keypress' | 'scroll' | 'hover' | 'focus';
      target: string;
      targetId?: string;
      targetClass?: string;
      value?: string;
      coordinates?: { x: number; y: number };
    };
    componentInfo?: {
      name: string;
      file: string;
      props?: Record<string, any>;
      state?: Record<string, any>;
    };
    handlerInfo?: {
      name: string;
      file: string;
      line?: number;
      args?: Record<string, any>;
      returnValue?: any;
    };
    middlewareInfo?: {
      name: string;
      phase: 'enter' | 'exit';
      request?: any;
      response?: any;
      duration?: number;
    };
    railwayInfo?: {
      service: string;
      endpoint: string;
      method: string;
      status?: number;
      duration?: number;
    };
    flowTree?: {
      sessionId: string;
      rootNode: FlowNode;
      currentPath: string[];
      totalNodes: number;
      totalDuration: number;
    };
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
export class SuperDebugBus {
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
  
  // Emit API request (Frontend → Backend flow tracking)
  emitApiRequest(
    provider: string,
    endpoint: string,
    params: {
      model?: string;
      max_tokens?: number;
      stream?: boolean;
      useProxy?: boolean;
      promptLength?: number;
    }
  ): void {
    if (!this.enabled) return;
    
    this.emit('API_REQUEST_START', `API Request to ${provider}`, {
      provider,
      apiEndpoint: endpoint,
      requestParams: params,
      httpMethod: 'POST',
      flowStep: {
        step: 1,
        total: 5,
        phase: 'frontend',
        action: 'Initiating API request',
        file: 'OneMindAI.tsx',
        function: 'streamFromProvider'
      },
      codeSnippet: `// OneMindAI.tsx → streamFromProvider()
fetch('${endpoint}', {
  method: 'POST',
  body: JSON.stringify({
    model: '${params.model || 'unknown'}',
    max_tokens: ${params.max_tokens || 'auto'},
    stream: ${params.stream ?? true}
  })
})`
    }, 'info');
  }
  
  // Emit fetch start (real-time tracking)
  emitFetchStart(url: string, method: string, provider: string): void {
    if (!this.enabled) return;
    
    this.emit('FETCH_START', `Fetch started: ${method} ${url}`, {
      apiEndpoint: url,
      httpMethod: method as any,
      provider,
      flowStep: {
        step: 2,
        total: 5,
        phase: 'frontend',
        action: 'HTTP request initiated',
        file: 'OneMindAI.tsx',
        function: 'fetch'
      }
    }, 'info');
  }
  
  // Emit fetch response (real-time tracking)
  emitFetchResponse(url: string, status: number, responseTime: number, provider: string): void {
    if (!this.enabled) return;
    
    this.emit('FETCH_RESPONSE', `Response received: ${status} (${responseTime}ms)`, {
      apiEndpoint: url,
      httpStatus: status,
      responseTime,
      provider,
      flowStep: {
        step: 4,
        total: 5,
        phase: 'backend',
        action: 'Response received from backend',
        file: 'OneMindAI.tsx',
        function: 'streamFromProvider',
        duration: responseTime
      }
    }, status >= 400 ? 'error' : 'success');
  }
  
  // Emit Supabase operation
  emitSupabaseOp(
    operation: 'select' | 'insert' | 'update' | 'delete' | 'rpc',
    table: string,
    query?: string | Record<string, any>,
    result?: { count?: number; error?: string }
  ): void {
    if (!this.enabled) return;
    
    const eventType = operation === 'select' ? 'SUPABASE_QUERY' :
                      operation === 'insert' ? 'SUPABASE_INSERT' :
                      operation === 'update' ? 'SUPABASE_UPDATE' : 'SUPABASE_RPC';
    
    this.emit(eventType, `Supabase ${operation}: ${table}`, {
      supabaseTable: table,
      supabaseOperation: operation,
      supabaseQuery: query,
      supabaseResult: result,
      flowStep: {
        step: 5,
        total: 5,
        phase: 'supabase',
        action: `${operation.toUpperCase()} on ${table}`,
        file: 'credit-service.ts',
        function: operation === 'rpc' ? 'rpc' : `from('${table}').${operation}()`
      }
    }, result?.error ? 'error' : 'success');
  }
  
  // Emit credit operation
  emitCreditOp(
    operation: 'check' | 'deduct' | 'add',
    amount: number,
    balance: number,
    provider?: string,
    model?: string
  ): void {
    if (!this.enabled) return;
    
    const eventType = operation === 'check' ? 'CREDIT_CHECK' :
                      operation === 'deduct' ? 'CREDIT_DEDUCT' : 'CREDIT_UPDATE';
    
    this.emit(eventType, `Credit ${operation}: ${amount} credits`, {
      creditAmount: amount,
      creditBalance: balance,
      creditOperation: operation,
      provider,
      flowStep: {
        step: 5,
        total: 5,
        phase: 'supabase',
        action: `${operation} ${amount} credits`,
        file: 'credit-service.ts',
        function: operation === 'check' ? 'getCreditBalance' : 
                  operation === 'deduct' ? 'deductCredits' : 'addCredits'
      },
      codeSnippet: operation === 'deduct' ? 
        `// credit-service.ts
await deductCredits(userId, ${amount}, '${provider}', '${model}');
// Balance: ${balance} → ${balance - amount}` : undefined
    }, 'info');
  }
  
  // Emit backend processing info
  emitBackendProcess(
    provider: string,
    frontendParams: { max_tokens?: number; model?: string },
    backendParams: { max_tokens?: number; model?: string; cappedAt?: number }
  ): void {
    if (!this.enabled) return;
    
    // Check for mismatches
    const mismatches: Array<{ field: string; frontend: any; backend: any; reason: string }> = [];
    
    if (frontendParams.max_tokens && backendParams.cappedAt && frontendParams.max_tokens > backendParams.cappedAt) {
      mismatches.push({
        field: 'max_tokens',
        frontend: frontendParams.max_tokens,
        backend: backendParams.cappedAt,
        reason: `Backend caps at ${backendParams.cappedAt} (provider limit)`
      });
    }
    
    this.emit('BACKEND_PROCESS', `Backend processing for ${provider}`, {
      provider,
      requestParams: frontendParams,
      backendParams,
      flowStep: {
        step: 3,
        total: 5,
        phase: 'backend',
        action: 'Processing request at proxy',
        file: 'ai-proxy.cjs',
        function: `app.post('/api/${provider}')`
      },
      codeSnippet: `// ai-proxy.cjs - ${provider} handler
const { messages, model, max_tokens } = req.body;

// Apply provider limits
const cappedTokens = Math.min(max_tokens, ${backendParams.cappedAt || 'PROVIDER_LIMIT'});

// Forward to ${provider} API
fetch('https://api.${provider}.com/...', {
  body: JSON.stringify({
    model: '${backendParams.model || 'model'}',
    max_tokens: cappedTokens  // ${backendParams.cappedAt ? `Capped from ${frontendParams.max_tokens} to ${backendParams.cappedAt}` : 'No cap'}
  })
})`
    }, mismatches.length > 0 ? 'warning' : 'info');
    
    // Emit individual mismatch events
    mismatches.forEach(m => {
      this.emit('PARAM_MISMATCH', `⚠️ ${m.field} mismatch: ${m.frontend} → ${m.backend}`, {
        mismatch: {
          field: m.field,
          frontendValue: m.frontend,
          backendValue: m.backend,
          reason: m.reason
        },
        provider
      }, 'warning');
    });
  }
  
  // Emit token cap applied
  emitTokenCap(provider: string, requested: number, capped: number, limit: number): void {
    if (!this.enabled) return;
    
    this.emit('TOKEN_CAP_APPLIED', `Token limit applied: ${requested} → ${capped}`, {
      provider,
      requestParams: { max_tokens: requested },
      backendParams: { max_tokens: capped, cappedAt: limit },
      mismatch: requested > capped ? {
        field: 'max_tokens',
        frontendValue: requested,
        backendValue: capped,
        reason: `${provider} max output limit is ${limit}`
      } : undefined
    }, requested > capped ? 'warning' : 'info');
  }
  
  // ===== COMPLETE CODE FLOW TRACKING =====
  
  // Emit full message payload being sent to API
  emitMessagePayload(
    provider: string,
    messages: Array<{ role: string; content: string }>,
    params: { model?: string; max_tokens?: number; stream?: boolean; temperature?: number }
  ): void {
    if (!this.enabled) return;
    
    // Truncate long messages for display (keep first 500 chars)
    const truncatedMessages = messages.map(m => ({
      role: m.role,
      content: m.content.length > 500 ? m.content.substring(0, 500) + '...[truncated]' : m.content
    }));
    
    this.emit('MESSAGE_PAYLOAD', `📤 Sending ${messages.length} message(s) to ${provider}`, {
      provider,
      messagePayload: {
        messages: truncatedMessages,
        model: params.model,
        max_tokens: params.max_tokens,
        stream: params.stream,
        temperature: params.temperature
      },
      flowStep: {
        step: 1,
        total: 6,
        phase: 'frontend',
        action: 'Preparing API payload',
        file: 'OneMindAI.tsx',
        function: 'streamFromProvider'
      },
      codeSnippet: `// OneMindAI.tsx → API Payload
const payload = {
  messages: [
${messages.map(m => `    { role: "${m.role}", content: "${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}" }`).join(',\n')}
  ],
  model: "${params.model || 'default'}",
  max_tokens: ${params.max_tokens || 'auto'},
  stream: ${params.stream ?? true}
};`
    }, 'info');
  }
  
  // Emit stream chunk with actual content
  private chunkBuffer: string = '';
  private chunkCount: number = 0;
  
  emitStreamChunk(content: string, isComplete: boolean = false): void {
    if (!this.enabled) return;
    
    this.chunkCount++;
    this.chunkBuffer += content;
    
    // Only emit every 5 chunks or on complete to avoid flooding
    if (this.chunkCount % 5 === 0 || isComplete) {
      this.emit('STREAM_CHUNK_CONTENT', `📥 Chunk ${this.chunkCount}: +${content.length} chars`, {
        streamChunk: {
          content: content,
          chunkIndex: this.chunkCount,
          totalLength: this.chunkBuffer.length,
          isComplete
        },
        flowStep: {
          step: 5,
          total: 6,
          phase: 'frontend',
          action: isComplete ? 'Stream complete' : 'Receiving chunks',
          file: 'OneMindAI.tsx',
          function: 'streamFromProvider'
        }
      }, isComplete ? 'success' : 'info');
    }
    
    if (isComplete) {
      this.chunkBuffer = '';
      this.chunkCount = 0;
    }
  }
  
  // Emit complete response
  emitResponseComplete(fullText: string, provider: string, tokenCount?: number, finishReason?: string): void {
    if (!this.enabled) return;
    
    this.emit('RESPONSE_COMPLETE', `✅ Response complete: ${fullText.length} chars`, {
      provider,
      responseContent: {
        fullText: fullText.length > 1000 ? fullText.substring(0, 1000) + '...[truncated]' : fullText,
        tokenCount,
        finishReason
      },
      flowStep: {
        step: 6,
        total: 6,
        phase: 'frontend',
        action: 'Response rendered to UI',
        file: 'OneMindAI.tsx',
        function: 'streamFromProvider'
      }
    }, 'success');
  }
  
  // Emit function call trace
  emitFunctionTrace(
    name: string,
    file: string,
    phase: 'enter' | 'exit',
    args?: Record<string, any>,
    duration?: number
  ): void {
    if (!this.enabled) return;
    
    this.emit('FUNCTION_CALL_TRACE', `${phase === 'enter' ? '→' : '←'} ${name}()`, {
      functionTrace: {
        name,
        file,
        phase,
        args: args ? Object.fromEntries(
          Object.entries(args).map(([k, v]) => [k, typeof v === 'string' && v.length > 100 ? v.substring(0, 100) + '...' : v])
        ) : undefined,
        duration
      },
      flowStep: {
        step: phase === 'enter' ? 1 : 6,
        total: 6,
        phase: 'frontend',
        action: phase === 'enter' ? `Entering ${name}` : `Exiting ${name}`,
        file,
        function: name
      }
    }, 'debug');
  }
  
  // Emit API payload sent (the actual fetch call)
  emitApiPayloadSent(
    url: string,
    method: string,
    body: any,
    provider: string
  ): void {
    if (!this.enabled) return;
    
    this.emit('API_PAYLOAD_SENT', `🌐 ${method} ${url}`, {
      apiEndpoint: url,
      httpMethod: method as any,
      provider,
      messagePayload: body.messages ? {
        messages: body.messages.map((m: any) => ({
          role: m.role,
          content: typeof m.content === 'string' && m.content.length > 200 
            ? m.content.substring(0, 200) + '...' 
            : m.content
        })),
        model: body.model,
        max_tokens: body.max_tokens,
        stream: body.stream
      } : undefined,
      flowStep: {
        step: 2,
        total: 6,
        phase: 'frontend',
        action: 'Sending HTTP request',
        file: 'OneMindAI.tsx',
        function: 'fetch'
      },
      codeSnippet: `// Actual fetch call
fetch("${url}", {
  method: "${method}",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [...],  // ${body.messages?.length || 0} message(s)
    model: "${body.model || 'default'}",
    max_tokens: ${body.max_tokens || 'auto'},
    stream: ${body.stream ?? true}
  })
});`
    }, 'info');
  }
  
  // ===== PROMPT JOURNEY TRACKING =====
  
  // Track prompt through all stages: user_input → enhanced → truncated → sent_to_api → received_response
  emitPromptJourney(
    stage: 'user_input' | 'enhanced' | 'truncated' | 'sent_to_api' | 'received_response',
    promptText: string,
    metadata: {
      originalLength?: number;
      currentLength?: number;
      truncatedAt?: number;
      truncationReason?: string;
      provider?: string;
      engineName?: string;
      transformations?: string[];
      filesAdded?: string[];
      maxTokens?: number;
    }
  ): void {
    if (!this.enabled) return;
    
    const stageLabels: Record<string, string> = {
      'user_input': '📝 User Input',
      'enhanced': '📎 Enhanced with Files',
      'truncated': '✂️ Truncated',
      'sent_to_api': '📤 Sent to API',
      'received_response': '📥 Response Received'
    };
    
    const stageIcons: Record<string, string> = {
      'user_input': '📝',
      'enhanced': '📎',
      'truncated': '✂️',
      'sent_to_api': '📤',
      'received_response': '📥'
    };
    
    // Cap display text at 10000 chars but store full length info
    const displayText = promptText.length > 10000 
      ? promptText.substring(0, 10000) + `\n\n[... ${promptText.length - 10000} more characters truncated for display ...]`
      : promptText;
    
    this.emit('PROMPT_JOURNEY', `${stageIcons[stage]} Prompt ${stage.replace('_', ' ')}: ${promptText.length} chars`, {
      promptJourney: {
        stage,
        stageLabel: stageLabels[stage],
        fullPromptText: displayText,
        promptLength: promptText.length,
        originalLength: metadata.originalLength,
        currentLength: metadata.currentLength || promptText.length,
        truncatedAt: metadata.truncatedAt,
        truncationReason: metadata.truncationReason,
        provider: metadata.provider,
        engineName: metadata.engineName,
        transformations: metadata.transformations,
        filesAdded: metadata.filesAdded,
        maxTokens: metadata.maxTokens
      },
      flowStep: {
        step: stage === 'user_input' ? 1 : stage === 'enhanced' ? 2 : stage === 'truncated' ? 3 : stage === 'sent_to_api' ? 4 : 5,
        total: 5,
        phase: stage === 'sent_to_api' ? 'middleware' : stage === 'received_response' ? 'provider' : 'frontend',
        action: stageLabels[stage],
        file: 'OneMindAI.tsx',
        function: stage === 'user_input' ? 'runAll' : 'streamFromProvider'
      }
    }, stage === 'truncated' ? 'warning' : 'info');
  }
  
  // Track response transformations: chunking, finish_reason, truncation detection
  emitResponseTransformation(
    stage: 'chunk_received' | 'accumulating' | 'finish_reason' | 'complete' | 'truncated',
    responseText: string,
    metadata: {
      provider?: string;
      engineName?: string;
      chunkIndex?: number;
      totalChunks?: number;
      finishReason?: string; // 'stop' | 'length' | 'content_filter' | etc
      tokensGenerated?: number;
      maxTokens?: number;
      isTruncated?: boolean;
      truncationDetails?: string;
      processingFunction?: string;
    }
  ): void {
    if (!this.enabled) return;
    
    const stageLabels: Record<string, string> = {
      'chunk_received': '📦 Chunk Received',
      'accumulating': '📊 Accumulating Response',
      'finish_reason': '🏁 Finish Reason',
      'complete': '✅ Response Complete',
      'truncated': '⚠️ Response Truncated'
    };
    
    // Cap display text
    const displayText = responseText.length > 5000 
      ? responseText.substring(0, 5000) + `\n\n[... ${responseText.length - 5000} more characters ...]`
      : responseText;
    
    const severity: EventSeverity = stage === 'truncated' ? 'warning' : stage === 'complete' ? 'success' : 'info';
    
    this.emit('RESPONSE_TRANSFORMATION', `${stageLabels[stage]}: ${responseText.length} chars`, {
      responseTransformation: {
        stage,
        stageLabel: stageLabels[stage],
        responseText: displayText,
        responseLength: responseText.length,
        provider: metadata.provider,
        engineName: metadata.engineName,
        chunkIndex: metadata.chunkIndex,
        totalChunks: metadata.totalChunks,
        finishReason: metadata.finishReason,
        tokensGenerated: metadata.tokensGenerated,
        maxTokens: metadata.maxTokens,
        isTruncated: metadata.isTruncated,
        truncationDetails: metadata.truncationDetails,
        processingFunction: metadata.processingFunction
      },
      flowStep: {
        step: stage === 'chunk_received' ? 4 : stage === 'complete' ? 5 : 4,
        total: 5,
        phase: 'response',
        action: stageLabels[stage],
        file: 'OneMindAI.tsx',
        function: metadata.processingFunction || 'streamFromProvider'
      }
    }, severity);
    
    // Emit truncation warning if detected
    if (metadata.finishReason === 'length' || metadata.isTruncated) {
      this.emit('TRUNCATION_DETECTED', `⚠️ Response was truncated! Finish reason: ${metadata.finishReason}`, {
        truncation: {
          finishReason: metadata.finishReason,
          tokensGenerated: metadata.tokensGenerated,
          maxTokens: metadata.maxTokens,
          provider: metadata.provider,
          engineName: metadata.engineName,
          responseLength: responseText.length,
          explanation: metadata.finishReason === 'length' 
            ? `The AI response was cut off because it reached the maximum token limit (${metadata.tokensGenerated || '?'}/${metadata.maxTokens || '?'} tokens). The response may be incomplete.`
            : metadata.truncationDetails || 'Response was truncated for unknown reason'
        }
      }, 'warning');
    }
  }
  
  // ===== USER ACTIVITY TRACKING =====
  
  private currentFlowSession: string | null = null;
  private flowNodes: Map<string, FlowNode> = new Map();
  private flowStartTime: number = 0;
  
  // Start a new user activity flow session
  startFlowSession(trigger: string): string {
    this.currentFlowSession = `flow-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.flowNodes.clear();
    this.flowStartTime = Date.now();
    
    // Create root node
    const rootNode: FlowNode = {
      id: this.currentFlowSession,
      type: 'user',
      label: trigger,
      timestamp: Date.now(),
      children: []
    };
    this.flowNodes.set(this.currentFlowSession, rootNode);
    
    return this.currentFlowSession;
  }
  
  // Add a node to the current flow
  addFlowNode(
    type: FlowNode['type'],
    label: string,
    details: { file?: string; function?: string; line?: number; data?: any; parentId?: string }
  ): string {
    if (!this.currentFlowSession) {
      this.startFlowSession('Auto-started flow');
    }
    
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const node: FlowNode = {
      id: nodeId,
      type,
      label,
      file: details.file,
      function: details.function,
      line: details.line,
      timestamp: Date.now(),
      data: details.data,
      children: [],
      parent: details.parentId || this.currentFlowSession!
    };
    
    this.flowNodes.set(nodeId, node);
    
    // Add to parent's children
    const parent = this.flowNodes.get(node.parent!);
    if (parent) {
      parent.children.push(node);
    }
    
    return nodeId;
  }
  
  // Get the current flow tree
  getFlowTree(): FlowNode | null {
    if (!this.currentFlowSession) return null;
    return this.flowNodes.get(this.currentFlowSession) || null;
  }
  
  // Emit user click event
  emitUserClick(
    target: string,
    details: { id?: string; className?: string; x?: number; y?: number; file?: string; handler?: string }
  ): void {
    if (!this.enabled) return;
    
    // Start new flow session on user click
    const sessionId = this.startFlowSession(`Click: ${target}`);
    
    this.emit('USER_CLICK', `👆 User clicked: ${target}`, {
      userActivity: {
        action: 'click',
        target,
        targetId: details.id,
        targetClass: details.className,
        coordinates: details.x !== undefined ? { x: details.x, y: details.y! } : undefined
      },
      flowStep: {
        step: 1,
        total: 10,
        phase: 'frontend',
        action: 'User interaction',
        file: details.file || 'unknown',
        function: details.handler || 'onClick'
      }
    }, 'info');
    
    // Add to flow tree
    this.addFlowNode('user', `Click: ${target}`, {
      file: details.file,
      function: details.handler,
      data: { target, id: details.id, className: details.className }
    });
  }
  
  // Emit user input event
  emitUserInput(
    target: string,
    value: string,
    details: { file?: string; handler?: string }
  ): void {
    if (!this.enabled) return;
    
    this.emit('USER_INPUT', `⌨️ User input: ${target}`, {
      userActivity: {
        action: 'input',
        target,
        value: value.length > 100 ? value.substring(0, 100) + '...' : value
      },
      flowStep: {
        step: 1,
        total: 10,
        phase: 'frontend',
        action: 'User input',
        file: details.file || 'unknown',
        function: details.handler || 'onChange'
      }
    }, 'info');
  }
  
  // Emit user submit event (form submission, send button, etc.)
  emitUserSubmit(
    action: string,
    data: any,
    details: { file: string; handler: string }
  ): void {
    if (!this.enabled) return;
    
    // Start new flow session on submit
    const sessionId = this.startFlowSession(`Submit: ${action}`);
    
    this.emit('USER_SUBMIT', `📤 User submitted: ${action}`, {
      userActivity: {
        action: 'submit',
        target: action,
        value: JSON.stringify(data).substring(0, 200)
      },
      flowStep: {
        step: 1,
        total: 10,
        phase: 'frontend',
        action: 'Form submission',
        file: details.file,
        function: details.handler
      },
      codeSnippet: `// ${details.file} → ${details.handler}()
// User submitted: ${action}
${details.handler}(${JSON.stringify(data, null, 2).substring(0, 300)})`
    }, 'info');
    
    this.addFlowNode('user', `Submit: ${action}`, {
      file: details.file,
      function: details.handler,
      data
    });
  }
  
  // Emit component triggered event
  emitComponentTriggered(
    componentName: string,
    file: string,
    props?: Record<string, any>,
    state?: Record<string, any>
  ): void {
    if (!this.enabled) return;
    
    this.emit('COMPONENT_TRIGGERED', `🧩 Component: ${componentName}`, {
      componentInfo: {
        name: componentName,
        file,
        props: props ? Object.fromEntries(
          Object.entries(props).map(([k, v]) => [k, typeof v === 'function' ? '[Function]' : v])
        ) : undefined,
        state
      },
      flowStep: {
        step: 2,
        total: 10,
        phase: 'frontend',
        action: 'Component triggered',
        file,
        function: componentName
      }
    }, 'info');
    
    this.addFlowNode('component', componentName, { file, data: { props, state } });
  }
  
  // Emit handler called event
  emitHandlerCalled(
    handlerName: string,
    file: string,
    args?: Record<string, any>,
    line?: number
  ): void {
    if (!this.enabled) return;
    
    this.emit('HANDLER_CALLED', `⚡ Handler: ${handlerName}()`, {
      handlerInfo: {
        name: handlerName,
        file,
        line,
        args: args ? Object.fromEntries(
          Object.entries(args).map(([k, v]) => {
            if (typeof v === 'function') return [k, '[Function]'];
            if (typeof v === 'string' && v.length > 100) return [k, v.substring(0, 100) + '...'];
            return [k, v];
          })
        ) : undefined
      },
      flowStep: {
        step: 3,
        total: 10,
        phase: 'frontend',
        action: 'Handler executed',
        file,
        function: handlerName,
        line
      },
      codeSnippet: `// ${file}:${line || '?'}
async function ${handlerName}(${args ? Object.keys(args).join(', ') : ''}) {
  // Handler logic...
}`
    }, 'info');
    
    this.addFlowNode('function', `${handlerName}()`, { file, function: handlerName, line, data: args });
  }

  // Wrap a handler so it automatically emits a high-fidelity handler call event.
  // This is the recommended way to capture exact TSX file + function name.
  wrapHandler<TArgs extends unknown[], TResult>(
    meta: { name: string; file: string; line?: number; component?: string },
    fn: (...args: TArgs) => TResult,
    argsToLog?: (...args: TArgs) => Record<string, any>
  ): (...args: TArgs) => TResult {
    return (...args: TArgs) => {
      try {
        if (meta.component) {
          this.emitComponentTriggered(meta.component, meta.file);
        }
        this.emitHandlerCalled(meta.name, meta.file, argsToLog ? argsToLog(...args) : undefined, meta.line);
      } catch {
        // never block UI
      }
      return fn(...args);
    };
  }
  
  // Emit middleware event
  emitMiddleware(
    name: string,
    phase: 'enter' | 'exit',
    request?: any,
    response?: any,
    duration?: number
  ): void {
    if (!this.enabled) return;
    
    this.emit(phase === 'enter' ? 'MIDDLEWARE_ENTER' : 'MIDDLEWARE_EXIT', 
      `${phase === 'enter' ? '→' : '←'} Middleware: ${name}`, {
      middlewareInfo: {
        name,
        phase,
        request: request ? JSON.stringify(request).substring(0, 200) : undefined,
        response: response ? JSON.stringify(response).substring(0, 200) : undefined,
        duration
      },
      flowStep: {
        step: phase === 'enter' ? 4 : 7,
        total: 10,
        phase: 'backend',
        action: `Middleware ${phase}`,
        file: 'middleware',
        function: name,
        duration
      }
    }, 'info');
    
    this.addFlowNode('middleware', `${name} (${phase})`, { 
      function: name, 
      data: { phase, request, response, duration } 
    });
  }
  
  // Emit Railway request/response
  emitRailway(
    service: string,
    endpoint: string,
    method: string,
    phase: 'request' | 'response',
    status?: number,
    duration?: number,
    data?: any
  ): void {
    if (!this.enabled) return;
    
    this.emit(phase === 'request' ? 'RAILWAY_REQUEST' : 'RAILWAY_RESPONSE',
      `🚂 Railway ${phase}: ${service}`, {
      railwayInfo: {
        service,
        endpoint,
        method,
        status,
        duration
      },
      flowStep: {
        step: phase === 'request' ? 5 : 6,
        total: 10,
        phase: 'backend',
        action: `Railway ${phase}`,
        file: 'railway-service',
        function: endpoint,
        duration
      },
      codeSnippet: phase === 'request' ? 
        `// Railway Request
fetch("${endpoint}", {
  method: "${method}",
  headers: { "Authorization": "Bearer ***" },
  body: ${data ? JSON.stringify(data, null, 2).substring(0, 200) : 'null'}
})` : 
        `// Railway Response
Status: ${status}
Duration: ${duration}ms
${data ? JSON.stringify(data, null, 2).substring(0, 200) : ''}`
    }, status && status >= 400 ? 'error' : 'success');
    
    this.addFlowNode('backend', `Railway: ${service}`, {
      function: endpoint,
      data: { method, status, duration }
    });
  }
  
  // Emit complete flow with tree
  emitFlowComplete(summary: string): void {
    if (!this.enabled || !this.currentFlowSession) return;
    
    const rootNode = this.flowNodes.get(this.currentFlowSession);
    if (!rootNode) return;
    
    const totalDuration = Date.now() - this.flowStartTime;
    
    this.emit('FLOW_COMPLETE', `✅ Flow complete: ${summary}`, {
      flowTree: {
        sessionId: this.currentFlowSession,
        rootNode,
        currentPath: this.buildFlowPath(rootNode),
        totalNodes: this.flowNodes.size,
        totalDuration
      }
    }, 'success');
    
    // Reset flow session
    this.currentFlowSession = null;
  }
  
  // Build flow path from root to leaves
  private buildFlowPath(node: FlowNode, path: string[] = []): string[] {
    path.push(`${node.type}:${node.label}`);
    if (node.children.length > 0) {
      // Follow first child for main path
      this.buildFlowPath(node.children[0], path);
    }
    return path;
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
    emitApiRequest: superDebugBus.emitApiRequest.bind(superDebugBus),
    emitBackendProcess: superDebugBus.emitBackendProcess.bind(superDebugBus),
    emitTokenCap: superDebugBus.emitTokenCap.bind(superDebugBus),
    // User Activity Tracking
    emitUserClick: superDebugBus.emitUserClick.bind(superDebugBus),
    emitUserInput: superDebugBus.emitUserInput.bind(superDebugBus),
    emitUserSubmit: superDebugBus.emitUserSubmit.bind(superDebugBus),
    emitComponentTriggered: superDebugBus.emitComponentTriggered.bind(superDebugBus),
    emitHandlerCalled: superDebugBus.emitHandlerCalled.bind(superDebugBus),
    wrapHandler: superDebugBus.wrapHandler.bind(superDebugBus),
    emitMiddleware: superDebugBus.emitMiddleware.bind(superDebugBus),
    emitRailway: superDebugBus.emitRailway.bind(superDebugBus),
    emitFlowComplete: superDebugBus.emitFlowComplete.bind(superDebugBus),
    // Prompt Journey Tracking
    emitPromptJourney: superDebugBus.emitPromptJourney.bind(superDebugBus),
    emitResponseTransformation: superDebugBus.emitResponseTransformation.bind(superDebugBus),
    getFlowTree: superDebugBus.getFlowTree.bind(superDebugBus),
    startFlowSession: superDebugBus.startFlowSession.bind(superDebugBus),
    addFlowNode: superDebugBus.addFlowNode.bind(superDebugBus),
    // Core methods
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
