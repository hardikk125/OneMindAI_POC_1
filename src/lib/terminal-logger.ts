/**
 * Terminal Logger for OneMindAI
 * Sends detailed logs to terminal/server console
 */

interface LogPayload {
  type: string;
  timestamp: number;
  data: any;
}

class TerminalLogger {
  private enabled: boolean = true;
  private logBuffer: LogPayload[] = [];

  constructor() {
    // Check if running in development
    this.enabled = typeof import.meta !== 'undefined' && 
                   (import.meta as any).env?.DEV !== false;
  }

  private async send(type: string, data: any) {
    if (!this.enabled) return;

    const payload: LogPayload = {
      type,
      timestamp: Date.now(),
      data
    };

    // Buffer logs
    this.logBuffer.push(payload);

    // Also log to browser console with terminal prefix
    console.log(`[TERMINAL] ${type}:`, data);

    // In a real implementation, you could send to a logging endpoint
    // For now, we'll use console.log which Vite will show in terminal
  }

  // Application lifecycle
  appStart() {
    this.send('APP_START', {
      version: 'v14 Mobile-First Preview',
      platform: 'Formula2GX Digital Advanced Incubation Labs',
      timestamp: new Date().toISOString()
    });
  }

  // User actions
  userAction(action: string, details: any) {
    this.send('USER_ACTION', { action, details });
  }

  // Function calls
  functionCall(functionName: string, params: any) {
    this.send('FUNCTION_CALL', { functionName, params });
  }

  // Chunk processing
  chunkReceived(engineName: string, chunkNumber: number, content: string, metadata?: any) {
    this.send('CHUNK_RECEIVED', {
      engineName,
      chunkNumber,
      contentLength: content.length,
      contentPreview: content.substring(0, 100),
      metadata
    });
  }

  // Library triggers
  libraryTriggered(libraryName: string, action: string, input?: any, output?: any) {
    this.send('LIBRARY_TRIGGERED', {
      libraryName,
      action,
      inputPreview: input ? JSON.stringify(input).substring(0, 100) : null,
      outputPreview: output ? JSON.stringify(output).substring(0, 100) : null
    });
  }

  // Markdown processing
  markdownParsed(inputLength: number, outputLength: number, features: string[]) {
    this.send('MARKDOWN_PARSED', {
      inputLength,
      outputLength,
      features,
      ratio: (outputLength / inputLength).toFixed(2)
    });
  }

  // Code block extraction
  codeBlockExtracted(language: string, codeLength: number, blockId: string) {
    this.send('CODE_BLOCK_EXTRACTED', {
      language,
      codeLength,
      blockId
    });
  }

  // Chart rendering
  chartRendered(chartType: string, dataPoints: number, library: string) {
    this.send('CHART_RENDERED', {
      chartType,
      dataPoints,
      library
    });
  }

  // API calls
  apiCallStart(provider: string, model: string, params: any) {
    this.send('API_CALL_START', {
      provider,
      model,
      params: {
        maxTokens: params.maxTokens,
        temperature: params.temperature,
        stream: params.stream
      }
    });
  }

  apiCallEnd(provider: string, duration: number, totalChunks: number, totalChars: number) {
    this.send('API_CALL_END', {
      provider,
      duration,
      totalChunks,
      totalChars,
      avgChunkSize: (totalChars / totalChunks).toFixed(2)
    });
  }

  // File processing
  fileProcessed(fileName: string, fileType: string, size: number, extractedLength: number) {
    this.send('FILE_PROCESSED', {
      fileName,
      fileType,
      size,
      extractedLength,
      compressionRatio: (extractedLength / size).toFixed(2)
    });
  }

  // State updates
  stateUpdate(stateName: string, value: any) {
    this.send('STATE_UPDATE', {
      stateName,
      valueType: typeof value,
      valuePreview: JSON.stringify(value).substring(0, 100)
    });
  }

  // Token calculations
  tokenCalculation(engineName: string, inputTokens: number, outputTokens: number, cost: number) {
    this.send('TOKEN_CALCULATION', {
      engineName,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: cost.toFixed(4)
    });
  }

  // Errors
  error(context: string, error: Error) {
    this.send('ERROR', {
      context,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    });
  }

  // Performance metrics
  performance(metric: string, value: number, unit: string = 'ms') {
    this.send('PERFORMANCE', {
      metric,
      value,
      unit
    });
  }

  // Streaming events
  streamStart(engineName: string) {
    this.send('STREAM_START', { engineName, timestamp: Date.now() });
  }

  streamEnd(engineName: string, totalChunks: number, totalChars: number, duration: number) {
    this.send('STREAM_END', {
      engineName,
      totalChunks,
      totalChars,
      duration,
      avgChunkSize: (totalChars / totalChunks).toFixed(2),
      chunksPerSecond: (totalChunks / (duration / 1000)).toFixed(2)
    });
  }

  // React component lifecycle
  componentMount(componentName: string) {
    this.send('COMPONENT_MOUNT', { componentName });
  }

  componentUnmount(componentName: string) {
    this.send('COMPONENT_UNMOUNT', { componentName });
  }

  // Render tracking
  renderStart(componentName: string, props?: any) {
    this.send('RENDER_START', {
      componentName,
      propsKeys: props ? Object.keys(props) : []
    });
  }

  renderEnd(componentName: string, duration: number) {
    this.send('RENDER_END', { componentName, duration });
  }

  // Get buffered logs
  getBuffer() {
    return this.logBuffer;
  }

  // Clear buffer
  clearBuffer() {
    this.logBuffer = [];
  }
}

// Export singleton instance
export const terminalLogger = new TerminalLogger();

// Also export for window access
if (typeof window !== 'undefined') {
  (window as any).__terminalLogger = terminalLogger;
}
