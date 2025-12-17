/**
 * CODE GUARDIAN CLIENT
 * ====================
 * Client for connecting to the Code Guardian server
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ChangeAnalysis {
  id: string;
  timestamp: string;
  file: string;
  duration: number;
  dependencies: {
    imports: Array<{ type: string; name?: string; source: string }>;
    exports: Array<{ type: string; name: string }>;
    functions: string[];
    components: string[];
    hooks: string[];
    apiCalls: Array<{ type: string; url: string }>;
    supabaseTables: string[];
  };
  affected: {
    direct: string[];
    indirect: string[];
    components: Array<{ file: string; name: string }>;
    hooks: Array<{ file: string; name: string }>;
    apis: Array<{ file: string; url: string }>;
    tables: Array<{ file: string; table: string }>;
  };
  analysis: {
    summary: string;
    intent: string;
    potentialIssues: Array<{
      type: 'bug' | 'security' | 'performance' | 'style';
      severity: 'high' | 'medium' | 'low';
      description: string;
      line?: string;
      suggestion: string;
    }>;
    breakingChanges: Array<{
      type: string;
      name: string;
      impact: string;
    }>;
    affectedAreas: string[];
    recommendations: string[];
    riskScore: number;
    riskReason: string;
    testsNeeded: string[];
    llmProvider: string;
  };
  riskScore: number;
}

export interface FileDependency {
  path: string;
  imports: Array<{ type: string; name?: string; source: string }>;
  exports: Array<{ type: string; name: string }>;
  functions: string[];
  components: string[];
  hooks: string[];
  apiCalls: Array<{ type: string; url: string }>;
  supabaseTables: string[];
  dependencies: string[];
  dependents: string[];
}

export interface DependencyGraph {
  [file: string]: FileDependency;
}

export interface RiskSummary {
  total: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  recentHighRisk: ChangeAnalysis[];
}

type MessageHandler = (data: unknown) => void;

// =============================================================================
// CLIENT CLASS
// =============================================================================

class CodeGuardianClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private isConnected = false;
  private serverUrl: string;
  private wsUrl: string;

  constructor(port: number = 4000) {
    this.serverUrl = `http://localhost:${port}`;
    this.wsUrl = `ws://localhost:${port}`;
  }

  // ===========================================================================
  // WEBSOCKET CONNECTION
  // ===========================================================================

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('%c🛡️ Code Guardian connected', 'color: #10b981; font-weight: bold;');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[CodeGuardian] Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('%c🛡️ Code Guardian disconnected', 'color: #f59e0b;');
          this.isConnected = false;
          this.emit('disconnected', {});
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[CodeGuardian] WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[CodeGuardian] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[CodeGuardian] Reconnecting in ${this.reconnectDelay / 1000}s (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(() => {
        // Will retry via onclose handler
      });
    }, this.reconnectDelay);
  }

  private handleMessage(message: { type: string; data: unknown }): void {
    const { type, data } = message;
    this.emit(type, data);
  }

  // ===========================================================================
  // EVENT HANDLING
  // ===========================================================================

  on(event: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // ===========================================================================
  // API METHODS
  // ===========================================================================

  async getDependencies(): Promise<DependencyGraph> {
    const response = await fetch(`${this.serverUrl}/api/dependencies`);
    return response.json();
  }

  async getDependenciesForFile(file: string): Promise<FileDependency> {
    const response = await fetch(`${this.serverUrl}/api/dependencies/${encodeURIComponent(file)}`);
    return response.json();
  }

  async getAffectedComponents(file: string): Promise<ChangeAnalysis['affected']> {
    const response = await fetch(`${this.serverUrl}/api/affected/${encodeURIComponent(file)}`);
    return response.json();
  }

  async analyzeFile(file: string): Promise<ChangeAnalysis> {
    const response = await fetch(`${this.serverUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file }),
    });
    return response.json();
  }

  async buildGraph(): Promise<{ success: boolean; fileCount: number; duration: number }> {
    const response = await fetch(`${this.serverUrl}/api/build-graph`, {
      method: 'POST',
    });
    return response.json();
  }

  async getHistory(limit: number = 20): Promise<ChangeAnalysis[]> {
    const response = await fetch(`${this.serverUrl}/api/history?limit=${limit}`);
    return response.json();
  }

  async getRiskSummary(): Promise<RiskSummary> {
    const response = await fetch(`${this.serverUrl}/api/risk-summary`);
    return response.json();
  }

  async validateEndpoints(): Promise<unknown> {
    const response = await fetch(`${this.serverUrl}/api/validate-endpoints`, {
      method: 'POST',
    });
    return response.json();
  }

  async checkHealth(): Promise<{ status: string; dependencyCount: number }> {
    const response = await fetch(`${this.serverUrl}/health`);
    return response.json();
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const codeGuardian = new CodeGuardianClient(4000);

export default codeGuardian;
