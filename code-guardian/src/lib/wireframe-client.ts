/**
 * WIREFRAME CLIENT
 * =================
 * Client for wireframe data with live updates
 */

import type {
  WireframeData,
  ComponentDefinition,
  PageDefinition,
  WireframeChange,
} from './wireframe-types';
import { WireframeParser, buildWireframeData } from './wireframe-parser';

type WireframeEventHandler = (data: unknown) => void;

class WireframeClient {
  private serverUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<WireframeEventHandler>> = new Map();
  private isConnected = false;
  private wireframeData: WireframeData | null = null;
  private parser: WireframeParser;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(port: number = 4000) {
    this.serverUrl = `http://localhost:${port}`;
    this.wsUrl = `ws://localhost:${port}`;
    this.parser = new WireframeParser();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('%c📐 Wireframe Viewer connected', 'color: #8b5cf6; font-weight: bold;');
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
            console.error('[Wireframe] Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit('disconnected', {});
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect().catch(() => {});
    }, 3000);
  }

  private handleMessage(message: { type: string; data: unknown }): void {
    const { type, data } = message;
    if (type === 'file_changed' || type === 'analysis_complete') {
      this.handleFileChange(data as { file: string });
    }
    this.emit(type, data);
  }

  on(event: string, handler: WireframeEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach(handler => handler(data));
  }

  async getWireframeData(): Promise<WireframeData> {
    try {
      const response = await fetch(`${this.serverUrl}/api/wireframe`);
      if (response.ok) {
        const data = await response.json();
        this.wireframeData = data;
        return data;
      }
    } catch {
      // Build locally
    }
    return this.buildWireframeFromDependencies();
  }

  async buildWireframeFromDependencies(): Promise<WireframeData> {
    try {
      const response = await fetch(`${this.serverUrl}/api/dependencies`);
      const graph = await response.json();
      
      const components: ComponentDefinition[] = [];
      
      for (const [filePath, fileData] of Object.entries(graph)) {
        if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
          try {
            const contentResponse = await fetch(
              `${this.serverUrl}/api/file-content?path=${encodeURIComponent(filePath)}`
            );
            
            if (contentResponse.ok) {
              const { content } = await contentResponse.json();
              const component = this.parser.parseFile(content, filePath);
              if (component) {
                const depData = fileData as { components?: string[]; hooks?: string[] };
                if (depData.components) {
                  component.childComponents = [...new Set([...component.childComponents, ...depData.components])];
                }
                components.push(component);
              }
            }
          } catch {
            // Skip
          }
        }
      }

      this.wireframeData = buildWireframeData(components, 'OneMind AI', 'C:/Projects/OneMindAI');
      return this.wireframeData;
    } catch (error) {
      console.error('[Wireframe] Failed to build wireframe:', error);
      throw error;
    }
  }

  async getComponent(componentId: string): Promise<ComponentDefinition | null> {
    if (this.wireframeData?.componentIndex[componentId]) {
      return this.wireframeData.componentIndex[componentId];
    }
    try {
      const response = await fetch(`${this.serverUrl}/api/wireframe/component/${encodeURIComponent(componentId)}`);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // Not found
    }
    return null;
  }

  async getPage(pageId: string): Promise<PageDefinition | null> {
    if (this.wireframeData?.pageIndex[pageId]) {
      return this.wireframeData.pageIndex[pageId];
    }
    return null;
  }

  private async handleFileChange(data: { file: string }): Promise<void> {
    const { file } = data;
    
    if (!file.endsWith('.tsx') && !file.endsWith('.jsx')) return;
    if (!this.wireframeData) return;

    try {
      const contentResponse = await fetch(
        `${this.serverUrl}/api/file-content?path=${encodeURIComponent(file)}`
      );
      
      if (!contentResponse.ok) return;
      
      const { content } = await contentResponse.json();
      const newComponent = this.parser.parseFile(content, file);
      
      if (!newComponent) return;

      const existingIndex = this.wireframeData.components.findIndex(c => c.filePath === file);

      const change: WireframeChange = {
        type: existingIndex >= 0 ? 'modified' : 'added',
        timestamp: new Date().toISOString(),
        filePath: file,
        componentName: newComponent.name,
        changes: [],
      };

      if (existingIndex >= 0) {
        const existing = this.wireframeData.components[existingIndex];
        
        if (existing.elements.length !== newComponent.elements.length) {
          change.changes.push({
            field: 'elements',
            oldValue: existing.elements.length,
            newValue: newComponent.elements.length,
            description: `UI elements: ${existing.elements.length} -> ${newComponent.elements.length}`,
          });
        }
        
        if (existing.state.length !== newComponent.state.length) {
          change.changes.push({
            field: 'state',
            oldValue: existing.state.length,
            newValue: newComponent.state.length,
            description: `State vars: ${existing.state.length} -> ${newComponent.state.length}`,
          });
        }

        this.wireframeData.components[existingIndex] = newComponent;
        this.wireframeData.componentIndex[newComponent.id] = newComponent;
      } else {
        this.wireframeData.components.push(newComponent);
        this.wireframeData.componentIndex[newComponent.id] = newComponent;
        change.changes.push({
          field: 'component',
          newValue: newComponent.name,
          description: `New component added: ${newComponent.name}`,
        });
      }

      this.wireframeData.lastUpdated = new Date().toISOString();
      this.emit('wireframe_updated', { wireframe: this.wireframeData, change });
    } catch (error) {
      console.error('[Wireframe] Failed to handle file change:', error);
    }
  }

  getCachedData(): WireframeData | null {
    return this.wireframeData;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const wireframeClient = new WireframeClient(4000);
export default wireframeClient;
