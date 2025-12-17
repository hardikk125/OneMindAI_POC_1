/**
 * Super Debug Panel
 * 
 * A comprehensive, real-time debugging sidebar that shows:
 * - Execution pipeline with live status
 * - Chunk streaming and merging visualization
 * - Library triggers with reasons
 * - File handoffs between components
 * - Error architecture with business/technical explanations
 * - State updates
 * - DOM injection tracking
 * 
 * Dynamically adapts to new code files and libraries.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { superDebugBus, DebugEvent, DebugEventType, EventSeverity, FlowNode } from '../../lib/super-debug-bus';
import './styles.css';

interface SuperDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullDebug?: () => void;
}

// ===== Section Components =====

// Execution Pipeline Section
const ExecutionPipeline: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  const pipelineEvents = events.filter(e => 
    e.type === 'PIPELINE_START' || e.type === 'PIPELINE_STEP' || e.type === 'PIPELINE_END' ||
    e.type === 'FUNCTION_ENTER' || e.type === 'FUNCTION_EXIT'
  ).slice(-10);
  
  const getStepStatus = (event: DebugEvent) => {
    if (event.type === 'PIPELINE_END' || event.type === 'FUNCTION_EXIT') return '✅';
    if (event.type === 'PIPELINE_START' || event.type === 'FUNCTION_ENTER') return '🔄';
    return '⏳';
  };
  
  return (
    <div className="debug-section">
      <h3 className="debug-section-title">
        <span>📊</span> Execution Pipeline
      </h3>
      <div className="pipeline-container">
        {pipelineEvents.length === 0 ? (
          <div className="empty-state">Waiting for execution...</div>
        ) : (
          pipelineEvents.map((event, idx) => (
            <div key={event.id} className={`pipeline-step ${event.severity}`}>
              <span className="step-icon">{getStepStatus(event)}</span>
              <div className="step-content">
                <div className="step-title">{event.source.function}()</div>
                <div className="step-meta">{event.source.file}:{event.source.line || '?'}</div>
              </div>
              <span className="step-time">{formatTime(event.timestamp)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Chunk Monitor Section
const ChunkMonitor: React.FC<{ events: DebugEvent[]; stats: any }> = ({ events, stats }) => {
  const chunkEvents = events.filter(e => e.type === 'CHUNK_RECEIVED' || e.type === 'CHUNK_MERGED').slice(-5);
  const latestMerge = events.filter(e => e.type === 'CHUNK_MERGED').slice(-1)[0];
  
  return (
    <div className="debug-section">
      <h3 className="debug-section-title">
        <span>📦</span> Chunk Streaming Monitor
      </h3>
      <div className="chunk-stats">
        <div className="stat-item">
          <span className="stat-label">Chunks</span>
          <span className="stat-value">{stats?.totalChunks || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Est. Tokens</span>
          <span className="stat-value">~{(stats?.totalTokensEstimate || 0).toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Elapsed</span>
          <span className="stat-value">{((stats?.elapsedTime || 0) / 1000).toFixed(1)}s</span>
        </div>
      </div>
      
      {(stats?.totalChunks || 0) > 0 && (
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: `${Math.min(100, ((stats?.totalChunks || 0) % 100))}%` }}
          />
        </div>
      )}
      
      {latestMerge && (
        <div className="merge-preview">
          <div className="merge-label">📝 Merge Preview:</div>
          <code className="merge-code">
            fullContent += chunk<br/>
            <span className="merge-result">"{latestMerge.data.mergedContent?.substring(0, 80)}..."</span>
          </code>
        </div>
      )}
      
      <div className="chunk-list">
        {chunkEvents.map(event => (
          <div key={event.id} className="chunk-item">
            <span className="chunk-icon">📥</span>
            <span className="chunk-text">{event.data.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Current Function Execution Section - Shows real-time code execution like inspect mode
const FunctionExecution: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  const functionEvents = events.filter(e => 
    e.type === 'FUNCTION_ENTER' || e.type === 'FUNCTION_EXIT' || 
    e.type === 'PIPELINE_START' || e.type === 'PIPELINE_STEP'
  ).slice(-8);
  const latestFunction = functionEvents.slice(-1)[0];
  const latestWithVariables = events.filter(e => e.data.variables).slice(-1)[0];
  
  // Syntax highlight code snippet
  const highlightCode = (code: string) => {
    if (!code) return null;
    return code.split('\n').map((line, idx) => {
      // Simple syntax highlighting
      let highlighted = line
        .replace(/\b(const|let|var|function|async|await|return|if|else|try|catch|throw|new|import|export|from)\b/g, '<span class="code-keyword">$1</span>')
        .replace(/\b(true|false|null|undefined)\b/g, '<span class="code-boolean">$1</span>')
        .replace(/'([^']*)'/g, '<span class="code-string">\'$1\'</span>')
        .replace(/"([^"]*)"/g, '<span class="code-string">"$1"</span>')
        .replace(/`([^`]*)`/g, '<span class="code-string">`$1`</span>')
        .replace(/\/\/(.*)$/g, '<span class="code-comment">//$1</span>')
        .replace(/(\w+)\(/g, '<span class="code-function">$1</span>(')
        .replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');
      return (
        <div key={idx} className="code-line">
          <span className="line-number">{idx + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: highlighted }} />
        </div>
      );
    });
  };
  
  return (
    <div className="debug-section function-section">
      <h3 className="debug-section-title">
        <span>🔧</span> Live Function Execution
      </h3>
      
      {functionEvents.length > 0 ? (
        <div className="function-display">
          {/* Current executing function */}
          {latestFunction && (
            <div className="current-function">
              <div className="function-header">
                <span className="function-status">{latestFunction.type === 'FUNCTION_EXIT' ? '✅' : '🔄'}</span>
                <span className="function-name">{latestFunction.source.function}()</span>
              </div>
              <div className="function-location">
                <span className="file-icon">📁</span>
                <span className="function-file">{latestFunction.source.file}</span>
                <span className="function-line">Line {latestFunction.source.line || '?'}</span>
              </div>
            </div>
          )}
          
          {/* Code snippet with syntax highlighting */}
          {latestFunction?.data?.codeSnippet && (
            <div className="code-block-container">
              <div className="code-block-header">
                <span>💻 Code Context</span>
                <span className="code-lang">{latestFunction.source.file?.split('.').pop() || 'tsx'}</span>
              </div>
              <pre className="code-snippet highlighted">
                {highlightCode(latestFunction.data.codeSnippet)}
              </pre>
            </div>
          )}
          
          {/* Variables in scope */}
          {latestWithVariables?.data?.variables && Object.keys(latestWithVariables.data.variables).length > 0 && (
            <div className="variables-section">
              <div className="variables-title">📊 Variables in Scope:</div>
              <div className="variables-grid">
                {Object.entries(latestWithVariables.data.variables).map(([key, value]) => (
                  <div key={key} className="variable-item">
                    <span className="var-name">{key}</span>
                    <span className="var-equals">=</span>
                    <span className="var-value" title={JSON.stringify(value)}>
                      {value !== undefined 
                        ? (typeof value === 'object' 
                          ? JSON.stringify(value).substring(0, 40) + (JSON.stringify(value).length > 40 ? '...' : '')
                          : String(value).substring(0, 40))
                        : 'undefined'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Call stack visualization */}
          <div className="call-stack">
            <div className="call-stack-title">📚 Recent Call Stack:</div>
            <div className="stack-items">
              {functionEvents.map((event, idx) => (
                <div key={event.id} className={`stack-item ${idx === functionEvents.length - 1 ? 'current' : ''}`}>
                  <span className="stack-icon">
                    {event.type === 'FUNCTION_ENTER' ? '→' : event.type === 'FUNCTION_EXIT' ? '←' : '•'}
                  </span>
                  <span className="stack-func">{event.source.function}()</span>
                  <span className="stack-time">{formatTime(event.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div>Waiting for function execution...</div>
          <div className="empty-hint">Run a query to see live code execution</div>
        </div>
      )}
    </div>
  );
};

// Library Triggers Section - Shows library calls with code snippets like architecture presentation
const LibraryTriggers: React.FC<{ events: DebugEvent[]; stats: any }> = ({ events, stats }) => {
  // Get ALL library events, not just last 10
  const libraryEvents = events.filter(e => e.type === 'LIBRARY_TRIGGERED');
  
  // Debug logging
  console.log('[LibraryTriggers] Total events:', events.length);
  console.log('[LibraryTriggers] Library events found:', libraryEvents.length);
  if (libraryEvents.length > 0) {
    console.log('[LibraryTriggers] Libraries:', libraryEvents.map(e => e.data.library));
  }
  
  // Convert Map to object if needed
  const libraryTriggerCounts: Record<string, number> = {};
  if (stats.libraryTriggers) {
    if (stats.libraryTriggers instanceof Map) {
      stats.libraryTriggers.forEach((count: number, lib: string) => {
        libraryTriggerCounts[lib] = count;
      });
    } else if (typeof stats.libraryTriggers === 'object') {
      Object.assign(libraryTriggerCounts, stats.libraryTriggers);
    }
  }
  
  // Get library-specific styling
  const getLibraryStyle = (lib: string) => {
    const styles: Record<string, { color: string; icon: string; bg: string }> = {
      'openai': { color: '#10a37f', icon: '🤖', bg: 'rgba(16, 163, 127, 0.1)' },
      '@anthropic-ai/sdk': { color: '#cc785c', icon: '🧠', bg: 'rgba(204, 120, 92, 0.1)' },
      '@google/generative-ai': { color: '#4285f4', icon: '💎', bg: 'rgba(66, 133, 244, 0.1)' },
      'marked': { color: '#e34c26', icon: '📝', bg: 'rgba(227, 76, 38, 0.1)' },
      'ECharts': { color: '#aa344d', icon: '📊', bg: 'rgba(170, 52, 77, 0.1)' },
      'Mermaid': { color: '#ff3670', icon: '🧜', bg: 'rgba(255, 54, 112, 0.1)' },
      'React': { color: '#61dafb', icon: '⚛️', bg: 'rgba(97, 218, 251, 0.1)' },
      'Fetch API': { color: '#f7df1e', icon: '🌐', bg: 'rgba(247, 223, 30, 0.1)' },
      'chart-utils': { color: '#8b5cf6', icon: '📈', bg: 'rgba(139, 92, 246, 0.1)' },
      'Regex': { color: '#f97316', icon: '🔍', bg: 'rgba(249, 115, 22, 0.1)' },
      'Plotly': { color: '#3f4f75', icon: '📉', bg: 'rgba(63, 79, 117, 0.1)' },
      'DOMPurify': { color: '#22c55e', icon: '🛡️', bg: 'rgba(34, 197, 94, 0.1)' },
      'highlight.js': { color: '#f472b6', icon: '🎨', bg: 'rgba(244, 114, 182, 0.1)' },
      'Prism': { color: '#a855f7', icon: '✨', bg: 'rgba(168, 85, 247, 0.1)' },
      'KaTeX': { color: '#14b8a6', icon: '∑', bg: 'rgba(20, 184, 166, 0.1)' },
    };
    return styles[lib] || { color: '#6366f1', icon: '📦', bg: 'rgba(99, 102, 241, 0.1)' };
  };
  
  // Generate code snippet for library call
  const generateCodeSnippet = (event: DebugEvent) => {
    const lib = event.data.library || 'unknown';
    const func = event.data.libraryFunction || 'call';
    const input = event.data.inputPreview || '';
    
    if (lib === 'openai' || lib.includes('openai')) {
      return `const stream = await client.chat.completions.create({
  model: "${event.data.details?.model || 'gpt-4'}",
  messages: [{ role: 'user', content: prompt }],
  stream: true
});`;
    }
    if (lib.includes('anthropic')) {
      return `const response = await anthropic.messages.create({
  model: "${event.data.details?.model || 'claude-3'}",
  messages: [{ role: 'user', content: prompt }],
  stream: true
});`;
    }
    if (lib.includes('google') || lib.includes('gemini')) {
      return `const model = genAI.getGenerativeModel({ model: "${event.data.details?.model || 'gemini-pro'}" });
const result = await model.generateContentStream(prompt);`;
    }
    if (lib === 'marked') {
      return `const html = marked.parse(markdown, {
  gfm: true,
  breaks: true
});`;
    }
    if (lib === 'ECharts') {
      return `const chart = echarts.init(container);
chart.setOption({
  // Chart configuration
  series: [{ type: 'bar', data: [...] }]
});`;
    }
    if (lib === 'Fetch API') {
      return `const response = await fetch(url, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ...' },
  body: JSON.stringify({ ... })
});`;
    }
    if (lib === 'chart-utils') {
      return `const { content, charts } = convertTablesToCharts(markdown);
// Detects tables and converts to ECharts configs`;
    }
    if (lib === 'Regex') {
      return `const regex = /\`\`\`([^\\n]*)\\n([\\s\\S]*?)\`\`\`/g;
let match;
while ((match = regex.exec(content)) !== null) {
  // Extract code blocks
}`;
    }
    if (lib === 'DOMPurify') {
      return `const cleanHtml = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'div', 'span', ...],
  ALLOWED_ATTR: ['class', 'style']
});`;
    }
    if (lib === 'highlight.js' || lib === 'Prism') {
      return `const highlighted = hljs.highlight(code, {
  language: 'javascript'
}).value;`;
    }
    if (lib === 'KaTeX') {
      return `const html = katex.renderToString(latex, {
  throwOnError: false,
  displayMode: true
});`;
    }
    if (lib === 'Plotly') {
      return `Plotly.newPlot(container, data, layout, {
  responsive: true,
  displayModeBar: false
});`;
    }
    return `${lib}.${func}(${input ? `"${input.substring(0, 30)}..."` : '...'});`;
  };
  
  return (
    <div className="debug-section library-section">
      <h3 className="debug-section-title">
        <span>📚</span> Library Triggers
      </h3>
      
      {/* Library trigger summary badges */}
      {Object.keys(libraryTriggerCounts).length > 0 && (
        <div className="library-badges">
          {Object.entries(libraryTriggerCounts).map(([lib, count]) => {
            const style = getLibraryStyle(lib);
            return (
              <span 
                key={lib} 
                className="lib-badge"
                style={{ backgroundColor: style.bg, borderColor: style.color }}
              >
                <span className="lib-badge-icon">{style.icon}</span>
                <span className="lib-badge-name">{lib}</span>
                <span className="lib-badge-count">{count}</span>
              </span>
            );
          })}
        </div>
      )}
      
      <div className="library-list">
        {libraryEvents.length === 0 && Object.keys(libraryTriggerCounts).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div>No library triggers yet</div>
            <div className="empty-hint">Libraries will appear when APIs are called</div>
          </div>
        ) : libraryEvents.length === 0 && Object.keys(libraryTriggerCounts).length > 0 ? (
          // Fallback: Show summary when events were lost but stats exist
          <div className="library-summary-fallback">
            <div className="fallback-note">📊 Library calls detected (events were truncated due to high chunk volume):</div>
            {Object.entries(libraryTriggerCounts).map(([lib, count]) => {
              const style = getLibraryStyle(lib);
              return (
                <div key={lib} className="library-item" style={{ borderLeftColor: style.color }}>
                  <div className="library-header">
                    <span className="library-icon">{style.icon}</span>
                    <span className="library-name" style={{ color: style.color }}>{lib}</span>
                    <span className="library-count">×{count}</span>
                  </div>
                  <div className="library-function-call">
                    <span className="func-name">{lib === 'marked' ? 'parse' : lib === 'ECharts' ? 'setOption' : 'call'}</span>
                    <span className="func-parens">()</span>
                  </div>
                  <div className="library-code-block">
                    <div className="code-block-header">
                      <span>💻 Code</span>
                      <span className="code-lang">TypeScript</span>
                    </div>
                    <pre className="library-code">
                      {generateCodeSnippet({ data: { library: lib, libraryFunction: 'call' } } as any)}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          libraryEvents.map(event => {
            const style = getLibraryStyle(event.data.library || '');
            return (
              <div 
                key={event.id} 
                className="library-item"
                style={{ borderLeftColor: style.color }}
              >
                <div className="library-header">
                  <span className="library-icon">{style.icon}</span>
                  <span className="library-name" style={{ color: style.color }}>{event.data.library}</span>
                  <span className="library-time">{formatTime(event.timestamp)}</span>
                </div>
                
                <div className="library-function-call">
                  <span className="func-name">{event.data.libraryFunction}</span>
                  <span className="func-parens">()</span>
                </div>
                
                <div className="library-reason">
                  <span className="reason-label">Why:</span> 
                  <span className="reason-text">{event.data.libraryReason}</span>
                </div>
                
                {/* Code snippet like architecture presentation */}
                <div className="library-code-block">
                  <div className="code-block-header">
                    <span>💻 Code</span>
                    <span className="code-lang">TypeScript</span>
                  </div>
                  <pre className="library-code">
                    {generateCodeSnippet(event)}
                  </pre>
                </div>
                
                {/* Input/Output preview */}
                {(event.data.inputPreview || event.data.outputPreview) && (
                  <div className="library-io-section">
                    {event.data.inputPreview && (
                      <div className="io-item input">
                        <span className="io-label">📥 Input:</span>
                        <code className="io-value">"{event.data.inputPreview}..."</code>
                      </div>
                    )}
                    {event.data.outputPreview && (
                      <div className="io-item output">
                        <span className="io-label">📤 Output:</span>
                        <code className="io-value">"{event.data.outputPreview}..."</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {Object.keys(libraryTriggerCounts).length > 0 && (
        <div className="library-summary">
          <div className="summary-title">📊 Total Trigger Counts:</div>
          <div className="summary-grid">
            {Object.entries(libraryTriggerCounts).map(([lib, count]) => (
              <span key={lib} className="lib-count-badge">{lib}: {count}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// File Handoffs Section
const FileHandoffs: React.FC<{ events: DebugEvent[]; stats: any }> = ({ events, stats }) => {
  const handoffEvents = events.filter(e => e.type === 'FILE_HANDOFF').slice(-8);
  
  return (
    <div className="debug-section">
      <h3 className="debug-section-title">
        <span>📁</span> File Handoffs
      </h3>
      <div className="handoff-list">
        {handoffEvents.length === 0 ? (
          <div className="empty-state">No file handoffs yet</div>
        ) : (
          handoffEvents.map(event => (
            <div key={event.id} className="handoff-item">
              <span className="handoff-from">{event.data?.details?.fromFile || 'unknown'}</span>
              <span className="handoff-arrow">→</span>
              <span className="handoff-to">{event.data?.details?.toFile || 'unknown'}</span>
              <span className="handoff-data">({event.data?.details?.dataType || 'data'})</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Error Architecture Section
const ErrorArchitecture: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  const errorEvents = events.filter(e => 
    e.type === 'ERROR_CAUGHT' || e.type === 'ERROR_FLOW_STEP' || 
    e.type === 'AUTO_RETRY_START' || e.type === 'AUTO_RETRY_END'
  );
  const latestError = events.filter(e => e.type === 'ERROR_CAUGHT').slice(-1)[0];
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="debug-section error-section">
      <h3 className="debug-section-title" onClick={() => setExpanded(!expanded)}>
        <span>🚨</span> Error Architecture 
        <span className="error-count">({errorEvents.filter(e => e.type === 'ERROR_CAUGHT').length})</span>
        <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
      </h3>
      
      {errorEvents.length === 0 ? (
        <div className="no-errors">✅ No errors</div>
      ) : (
        <div className={`error-content ${expanded ? 'expanded' : ''}`}>
          {latestError && latestError.data.errorExplanation && (
            <>
              {/* Error Flow Visualization */}
              <div className="error-flow">
                <div className="flow-step error-flow-step">
                  <span className="flow-num">1</span>
                  <div className="flow-content">
                    <div className="flow-title">API Call Failed</div>
                    <div className="flow-detail">Provider: {latestError.data.provider || 'unknown'}</div>
                  </div>
                </div>
                <div className="flow-arrow">↓</div>
                <div className="flow-step error-flow-step">
                  <span className="flow-num">2</span>
                  <div className="flow-content">
                    <div className="flow-title">Status Code Extracted</div>
                    <div className="flow-detail">Code: {latestError.data.errorExplanation.statusCode || 'N/A'}</div>
                  </div>
                </div>
                <div className="flow-arrow">↓</div>
                <div className="flow-step error-flow-step">
                  <span className="flow-num">3</span>
                  <div className="flow-content">
                    <div className="flow-title">Error Analyzed</div>
                    <div className="flow-detail">Auto-retry: {latestError.data.errorExplanation.isAutoRetryable ? '✅ Yes' : '❌ No'}</div>
                  </div>
                </div>
              </div>
              
              {/* Technical Explanation */}
              <div className="error-box technical">
                <div className="error-box-title">🔧 Technical Error</div>
                <div className="error-box-content">{latestError.data.errorExplanation.technical}</div>
              </div>
              
              {/* Business Explanation */}
              <div className="error-box business">
                <div className="error-box-title">💼 Business Impact</div>
                <div className="error-box-content">{latestError.data.errorExplanation.business}</div>
              </div>
              
              {/* Action Required */}
              <div className="error-box action">
                <div className="error-box-title">⚡ Action Required</div>
                <ol className="action-list">
                  {(latestError.data.errorExplanation.actionRequired || []).map((action: string, idx: number) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// State Updates Section
const StateUpdates: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  const stateEvents = events.filter(e => e.type === 'STATE_UPDATE').slice(-5);
  
  // Debug logging
  console.log('[StateUpdates] Total events:', events.length);
  console.log('[StateUpdates] State events found:', stateEvents.length);
  
  return (
    <div className="debug-section">
      <h3 className="debug-section-title">
        <span>🔀</span> React State Updates
      </h3>
      <div className="state-list">
        {stateEvents.length === 0 ? (
          <div className="empty-state">No state updates</div>
        ) : (
          stateEvents.map(event => (
            <div key={event.id} className="state-item">
              <span className="state-key">{event.data?.stateKey || 'unknown'}</span>
              <span className="state-arrow">←</span>
              <span className="state-value">
                {event.data?.stateNewValue !== undefined
                  ? (typeof event.data.stateNewValue === 'object' 
                    ? JSON.stringify(event.data.stateNewValue).substring(0, 40) + '...'
                    : String(event.data.stateNewValue).substring(0, 40))
                  : 'undefined'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Markdown Processing Section
const MarkdownProcessing: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  // Get ALL markdown-related events
  const markdownEvents = events.filter(e => 
    e.type === 'MARKDOWN_PARSE' || e.type === 'CODE_BLOCK_EXTRACTED' || 
    e.type === 'TABLE_DETECTED' || e.type === 'CHART_GENERATED'
  );
  
  const latestParse = events.filter(e => e.type === 'MARKDOWN_PARSE').slice(-1)[0];
  
  // Debug logging
  console.log('[MarkdownProcessing] Total events:', events.length);
  console.log('[MarkdownProcessing] Markdown events found:', markdownEvents.length);
  console.log('[MarkdownProcessing] All event types:', [...new Set(events.map(e => e.type))]);
  
  return (
    <div className="debug-section">
      <h3 className="debug-section-title">
        <span>📝</span> Markdown Processing
        {markdownEvents.length > 0 && <span className="section-count">({markdownEvents.length})</span>}
      </h3>
      {latestParse ? (
        <div className="markdown-info">
          <div className="markdown-stats">
            <span className="md-stat">📥 Input: {latestParse.data?.inputSize || 0} chars</span>
            <span className="md-stat">📤 Output: {latestParse.data?.outputSize || 0} chars</span>
            <span className="md-stat">⏱️ Time: {latestParse.data?.processingTime || 0}ms</span>
          </div>
          {latestParse.data?.elementsDetected && (
            <div className="elements-detected">
              <span className="elements-title">Elements Detected:</span>
              <div className="elements-grid">
                {Object.entries(latestParse.data.elementsDetected).map(([elem, count]) => (
                  <span key={elem} className="element-badge">
                    {elem === 'tables' ? '📊' : elem === 'codeBlocks' ? '💻' : elem === 'images' ? '🖼️' : elem === 'links' ? '🔗' : elem === 'lists' ? '📋' : elem === 'headings' ? '📌' : '📄'}
                    {elem}: {count as number}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Show code snippet */}
          <div className="markdown-code-block">
            <div className="code-block-header">
              <span>💻 marked.parse()</span>
              <span className="code-lang">TypeScript</span>
            </div>
            <pre className="library-code">{`const html = marked.parse(markdown, {
  gfm: true,
  breaks: true
});
// Input: ${latestParse.data?.inputSize || 0} chars
// Output: ${latestParse.data?.outputSize || 0} chars`}</pre>
          </div>
        </div>
      ) : (
        <div className="empty-state">No markdown processing yet</div>
      )}
      
      <div className="markdown-events">
        {markdownEvents.slice(-5).map(event => (
          <div key={event.id} className="md-event-item">
            <span className="md-event-icon">
              {event.type === 'TABLE_DETECTED' ? '📊' : 
               event.type === 'CHART_GENERATED' ? '📈' : 
               event.type === 'CODE_BLOCK_EXTRACTED' ? '💻' : 
               event.type === 'MARKDOWN_PARSE' ? '📝' : '📄'}
            </span>
            <span className="md-event-text">{event.data.message}</span>
            <span className="md-event-time">{formatTime(event.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// DOM Injection Section
const DOMInjection: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  // Get ALL DOM-related events
  const domEvents = events.filter(e => e.type === 'DOM_INJECT' || e.type === 'COMPONENT_RENDER');
  
  // Debug logging
  console.log('[DOMInjection] Total events:', events.length);
  console.log('[DOMInjection] DOM events found:', domEvents.length);
  
  return (
    <div className="debug-section">
      <h3 className="debug-section-title">
        <span>🖥️</span> DOM & Component Rendering
        {domEvents.length > 0 && <span className="section-count">({domEvents.length})</span>}
      </h3>
      <div className="dom-list">
        {domEvents.length === 0 ? (
          <div className="empty-state">No DOM updates yet</div>
        ) : (
          domEvents.slice(-10).map(event => (
            <div key={event.id} className="dom-item">
              <span className="dom-icon">{event.type === 'DOM_INJECT' ? '💉' : '🧩'}</span>
              <div className="dom-content">
                <div className="dom-title">{event.data.message}</div>
                <div className="dom-meta">
                  {event.source.file} • {formatTime(event.timestamp)}
                  {event.data.outputSize && <span className="dom-size"> • {event.data.outputSize} bytes</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ===== Execution Flow Tree - Visual tree showing complete execution flow =====
const ExecutionFlowTree: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  
  // Debug logging
  console.log('[ExecutionFlowTree] Total events received:', events.length);
  console.log('[ExecutionFlowTree] Event types:', [...new Set(events.map(e => e.type))]);
  console.log('[ExecutionFlowTree] Library events:', events.filter(e => e.type === 'LIBRARY_TRIGGERED').length);
  console.log('[ExecutionFlowTree] Pipeline events:', events.filter(e => e.type.startsWith('PIPELINE')).length);
  
  // Library icons mapping
  const libIcons: Record<string, string> = {
    'openai': '🤖',
    '@anthropic-ai/sdk': '🧠',
    '@google/generative-ai': '💎',
    'marked': '📝',
    'ECharts': '📊',
    'Mermaid': '🧜',
    'React': '⚛️',
    'Fetch API': '🌐',
    'chart-utils': '📈',
    'Regex': '🔍',
    'Plotly': '📉',
    'DOMPurify': '🛡️',
    'highlight.js': '🎨',
    'Prism': '✨',
    'KaTeX': '∑'
  };
  
  // Build the execution flow tree - showing ALL important steps including backend
  const buildFlowTree = () => {
    type FlowStep = {
      id: string;
      step: number;
      type: 'function' | 'library' | 'file' | 'state' | 'chunk' | 'error' | 'dom' | 'pipeline' | 'stream' | 'api' | 'backend' | 'mismatch' | 'supabase' | 'credit' | 'fetch';
      title: string;
      subtitle: string;
      file: string;
      line?: number;
      status: 'running' | 'completed' | 'error' | 'warning';
      timestamp: number;
      codeSnippet?: string;
      details?: any;
    };
    
    const flowSteps: FlowStep[] = [];
    
    // Helper to add step with auto-incrementing number
    const addStep = (step: Omit<FlowStep, 'step'>) => {
      flowSteps.push({ ...step, step: flowSteps.length + 1 });
    };

    // Process events to build complete flow
    events.forEach(event => {
      const eventType = event.type;
      
      // PIPELINE events
      if (eventType === 'PIPELINE_START') {
        addStep({
          id: event.id,
          type: 'pipeline',
          title: '🚀 User Clicks "Run Live"',
          subtitle: `runAll() - Engines: ${event.data.details?.selectedEngines?.join(', ') || 'N/A'}`,
          file: 'OneMindAI.tsx',
          status: 'completed',
          timestamp: event.timestamp,
          codeSnippet: `async function runAll() {\n  const selectedEngines = [${event.data.details?.selectedEngines?.map((e: string) => `"${e}"`).join(', ') || ''}];\n  // Prompt: ${event.data.details?.promptLength || 0} chars\n  // Starting parallel streaming...\n}`,
          details: event.data.details
        });
      }
      
      if (eventType === 'PIPELINE_STEP') {
        addStep({
          id: event.id,
          type: 'pipeline',
          title: '⚡ Pipeline Step',
          subtitle: event.data.message || 'Processing...',
          file: event.source.file || 'OneMindAI.tsx',
          status: 'completed',
          timestamp: event.timestamp,
          details: event.data.details
        });
      }
      
      if (eventType === 'PIPELINE_END') {
        addStep({
          id: event.id,
          type: 'pipeline',
          title: '✅ Pipeline Complete',
          subtitle: `${event.data.details?.successful || 0}/${event.data.details?.totalEngines || 0} engines succeeded`,
          file: 'OneMindAI.tsx',
          status: 'completed',
          timestamp: event.timestamp,
          details: event.data.details
        });
      }
      
      // FUNCTION events
      if (eventType === 'FUNCTION_ENTER') {
        addStep({
          id: event.id,
          type: 'function',
          title: `🔧 ${event.source.function || 'function'}()`,
          subtitle: event.data.message || 'Function called',
          file: event.source.file || 'unknown',
          line: event.source.line,
          status: 'running',
          timestamp: event.timestamp,
          codeSnippet: event.data.codeSnippet,
          details: event.data.variables
        });
      }
      
      if (eventType === 'FUNCTION_EXIT') {
        addStep({
          id: event.id,
          type: 'function',
          title: `✅ ${event.source.function || 'function'}() completed`,
          subtitle: event.data.message || 'Function returned',
          file: event.source.file || 'unknown',
          status: 'completed',
          timestamp: event.timestamp,
          details: event.data.variables
        });
      }
      
      // LIBRARY events
      if (eventType === 'LIBRARY_TRIGGERED') {
        const lib = event.data.library || 'unknown';
        addStep({
          id: event.id,
          type: 'library',
          title: `${libIcons[lib] || '📚'} ${lib}`,
          subtitle: `${event.data.libraryFunction || 'call'}() - ${event.data.libraryReason || 'triggered'}`,
          file: event.source.file || 'unknown',
          line: event.source.line,
          status: 'completed',
          timestamp: event.timestamp,
          codeSnippet: generateLibraryCode(lib, event.data.libraryFunction || '', event.data),
          details: { input: event.data.inputPreview, output: event.data.outputPreview }
        });
      }
      
      // STREAM events
      if (eventType === 'STREAM_START') {
        addStep({
          id: event.id,
          type: 'stream',
          title: '📡 Stream Started',
          subtitle: event.data.message || `Provider: ${event.data.provider || 'unknown'}`,
          file: 'OneMindAI.tsx',
          status: 'running',
          timestamp: event.timestamp,
          codeSnippet: `for await (const chunk of stream) {\n  // Receiving chunks from ${event.data.provider || 'API'}...\n  yield chunk.content;\n}`
        });
      }
      
      if (eventType === 'STREAM_END') {
        addStep({
          id: event.id,
          type: 'stream',
          title: '✅ Stream Completed',
          subtitle: event.data.message || `Provider: ${event.data.provider || 'unknown'}`,
          file: 'OneMindAI.tsx',
          status: 'completed',
          timestamp: event.timestamp
        });
      }
      
      // ===== API FLOW EVENTS (Frontend → Backend :3002 → AI Provider) =====
      
      // API Request Start - Frontend initiates call
      if (eventType === 'API_REQUEST_START') {
        const params = event.data.requestParams;
        addStep({
          id: event.id,
          type: 'api',
          title: '📤 Frontend API Request',
          subtitle: `${event.data.provider?.toUpperCase()} → ${event.data.apiEndpoint || 'proxy'}`,
          file: 'OneMindAI.tsx',
          status: 'running',
          timestamp: event.timestamp,
          codeSnippet: `// Frontend: OneMindAI.tsx
fetch('${event.data.apiEndpoint || '/api/provider'}', {
  method: 'POST',
  body: JSON.stringify({
    model: '${params?.model || 'model'}',
    max_tokens: ${params?.max_tokens || 'auto'},
    stream: ${params?.stream ?? true}
  })
})`,
          details: params
        });
      }
      
      // Backend Process - What happens at localhost:3002
      if (eventType === 'BACKEND_PROCESS') {
        const frontendParams = event.data.requestParams;
        const backendParams = event.data.backendParams;
        addStep({
          id: event.id,
          type: 'backend',
          title: '⚙️ Backend Proxy (localhost:3002)',
          subtitle: `ai-proxy.cjs → ${event.data.provider?.toUpperCase()} API`,
          file: 'ai-proxy.cjs',
          status: 'completed',
          timestamp: event.timestamp,
          codeSnippet: `// Backend: server/ai-proxy.cjs
app.post('/api/${event.data.provider}', async (req, res) => {
  const { messages, model, max_tokens } = req.body;
  
  // ⚠️ Backend applies token cap!
  const cappedTokens = Math.min(
    max_tokens,      // Frontend sent: ${frontendParams?.max_tokens || '?'}
    ${backendParams?.cappedAt || 8192}              // Backend cap: ${backendParams?.cappedAt || '?'}
  );  // Result: ${backendParams?.max_tokens || '?'}
  
  // Forward to ${event.data.provider} API
  const response = await fetch('https://api.${event.data.provider}.com/...', {
    body: JSON.stringify({
      model: '${backendParams?.model || 'model'}',
      max_tokens: cappedTokens
    })
  });
});`,
          details: { frontend: frontendParams, backend: backendParams }
        });
      }
      
      // Parameter Mismatch Warning
      if (eventType === 'PARAM_MISMATCH') {
        const mismatch = event.data.mismatch;
        addStep({
          id: event.id,
          type: 'mismatch',
          title: `⚠️ MISMATCH: ${mismatch?.field || 'parameter'}`,
          subtitle: `${mismatch?.frontendValue} → ${mismatch?.backendValue} (${mismatch?.reason || 'capped'})`,
          file: 'ai-proxy.cjs',
          status: 'warning',
          timestamp: event.timestamp,
          codeSnippet: `// ⚠️ PARAMETER MISMATCH DETECTED!
// Field: ${mismatch?.field || 'unknown'}
// Frontend Value: ${mismatch?.frontendValue}
// Backend Value:  ${mismatch?.backendValue}
// Reason: ${mismatch?.reason || 'Backend applies different limits'}

// This means the user expects ${mismatch?.frontendValue} but gets ${mismatch?.backendValue}!`,
          details: mismatch
        });
      }
      
      // Token Cap Applied
      if (eventType === 'TOKEN_CAP_APPLIED') {
        const mismatch = event.data.mismatch;
        if (mismatch) {
          addStep({
            id: event.id,
            type: 'mismatch',
            title: '🔒 Token Limit Capped',
            subtitle: `${event.data.provider}: ${mismatch.frontendValue} → ${mismatch.backendValue}`,
            file: 'ai-proxy.cjs',
            status: 'warning',
            timestamp: event.timestamp,
            codeSnippet: `// Token limit enforced by backend
// Provider: ${event.data.provider}
// Requested: ${mismatch.frontendValue} tokens
// Capped to: ${mismatch.backendValue} tokens
// Reason: ${mismatch.reason}

const max_tokens = Math.min(req.body.max_tokens, ${mismatch.backendValue});`,
            details: event.data
          });
        }
      }
      
      // ===== REAL-TIME FLOW EVENTS =====
      
      // Fetch Start - HTTP request initiated
      if (eventType === 'FETCH_START') {
        addStep({
          id: event.id,
          type: 'api',
          title: '🌐 HTTP Request Started',
          subtitle: `${event.data.httpMethod} ${event.data.apiEndpoint}`,
          file: 'OneMindAI.tsx',
          status: 'running',
          timestamp: event.timestamp,
          codeSnippet: `// Real-time: HTTP request initiated
const response = await fetch('${event.data.apiEndpoint}', {
  method: '${event.data.httpMethod}',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... })
});`,
          details: event.data.flowStep
        });
      }
      
      // Fetch Response - HTTP response received
      if (eventType === 'FETCH_RESPONSE') {
        addStep({
          id: event.id,
          type: event.data.httpStatus && event.data.httpStatus >= 400 ? 'mismatch' : 'backend',
          title: `📥 Response: ${event.data.httpStatus} (${event.data.responseTime}ms)`,
          subtitle: `${event.data.provider?.toUpperCase()} backend responded`,
          file: 'ai-proxy.cjs',
          status: event.data.httpStatus && event.data.httpStatus >= 400 ? 'error' : 'completed',
          timestamp: event.timestamp,
          codeSnippet: `// Real-time: Response received
// Status: ${event.data.httpStatus}
// Duration: ${event.data.responseTime}ms
// Provider: ${event.data.provider}`,
          details: event.data.flowStep
        });
      }
      
      // Supabase Operations
      if (eventType === 'SUPABASE_QUERY' || eventType === 'SUPABASE_INSERT' || 
          eventType === 'SUPABASE_UPDATE' || eventType === 'SUPABASE_RPC') {
        addStep({
          id: event.id,
          type: 'state',
          title: `🗄️ Supabase: ${event.data.supabaseOperation?.toUpperCase()}`,
          subtitle: `Table: ${event.data.supabaseTable}`,
          file: 'credit-service.ts',
          status: event.data.supabaseResult?.error ? 'error' : 'completed',
          timestamp: event.timestamp,
          codeSnippet: `// Supabase operation
const { data, error } = await supabase
  .from('${event.data.supabaseTable}')
  .${event.data.supabaseOperation}(...)${event.data.supabaseResult?.count ? `\n// Rows affected: ${event.data.supabaseResult.count}` : ''}`,
          details: event.data
        });
      }
      
      // Credit Operations
      if (eventType === 'CREDIT_CHECK' || eventType === 'CREDIT_DEDUCT' || eventType === 'CREDIT_UPDATE') {
        addStep({
          id: event.id,
          type: eventType === 'CREDIT_DEDUCT' ? 'mismatch' : 'state',
          title: `💳 Credit ${event.data.creditOperation}: ${event.data.creditAmount}`,
          subtitle: `Balance: ${event.data.creditBalance}`,
          file: 'credit-service.ts',
          status: 'completed',
          timestamp: event.timestamp,
          codeSnippet: event.data.codeSnippet || `// Credit operation: ${event.data.creditOperation}
// Amount: ${event.data.creditAmount}
// Balance: ${event.data.creditBalance}`,
          details: event.data
        });
      }
      
      // CHUNK events (show summary, not every chunk)
      if (eventType === 'CHUNK_MERGED' && event.data.chunkIndex && event.data.chunkIndex % 50 === 0) {
        addStep({
          id: event.id,
          type: 'chunk',
          title: `📦 Chunks Received: ${event.data.chunkIndex}`,
          subtitle: `Total: ${event.data.mergedContent?.length || 0} chars accumulated`,
          file: 'OneMindAI.tsx',
          status: 'completed',
          timestamp: event.timestamp
        });
      }
      
      // FILE HANDOFF events
      if (eventType === 'FILE_HANDOFF') {
        addStep({
          id: event.id,
          type: 'file',
          title: '📁 File Handoff',
          subtitle: `${event.data.details?.fromFile || 'source'} → ${event.data.details?.toFile || 'target'}`,
          file: event.data.details?.fromFile || 'unknown',
          status: 'completed',
          timestamp: event.timestamp,
          codeSnippet: `// Data passed: ${event.data.details?.dataType || 'content'}\n// From: ${event.data.details?.fromFile}\n// To: ${event.data.details?.toFile}`,
          details: { dataType: event.data.details?.dataType }
        });
      }
      
      // MARKDOWN events
      if (eventType === 'MARKDOWN_PARSE') {
        addStep({
          id: event.id,
          type: 'library',
          title: '📝 marked.parse()',
          subtitle: `Markdown → HTML (${event.data.inputSize || 0} → ${event.data.outputSize || 0} chars)`,
          file: 'EnhancedMarkdownRenderer.tsx',
          status: 'completed',
          timestamp: event.timestamp,
          codeSnippet: `const html = marked.parse(processedText);\n// Input: ${event.data.inputSize || 0} chars\n// Output: ${event.data.outputSize || 0} chars\n// Time: ${event.data.processingTime || 0}ms`
        });
      }
      
      // DOM events
      if (eventType === 'DOM_INJECT') {
        addStep({
          id: event.id,
          type: 'dom',
          title: '🖼️ DOM Injection',
          subtitle: `HTML injected: ${event.data.outputSize || 0} bytes`,
          file: 'EnhancedMarkdownRenderer.tsx',
          status: 'completed',
          timestamp: event.timestamp,
          codeSnippet: `<div\n  dangerouslySetInnerHTML={{ __html: processedContent }}\n  className="markdown-content"\n/>`
        });
      }
      
      // COMPONENT events
      if (eventType === 'COMPONENT_RENDER') {
        addStep({
          id: event.id,
          type: 'function',
          title: '⚛️ Component Render',
          subtitle: event.data.message || 'React component rendered',
          file: event.source.file || 'unknown',
          status: 'completed',
          timestamp: event.timestamp
        });
      }
      
      // TABLE/CHART events
      if (eventType === 'TABLE_DETECTED') {
        addStep({
          id: event.id,
          type: 'library',
          title: '📊 Table Detected',
          subtitle: `Found ${event.data.details?.tableCount || 0} chartable table(s)`,
          file: 'EnhancedMarkdownRenderer.tsx',
          status: 'completed',
          timestamp: event.timestamp
        });
      }
      
      if (eventType === 'CHART_GENERATED') {
        addStep({
          id: event.id,
          type: 'library',
          title: '📊 ECharts Rendered',
          subtitle: `Chart type: ${event.data.details?.chartType || 'unknown'}`,
          file: 'EnhancedMarkdownRenderer.tsx',
          status: 'completed',
          timestamp: event.timestamp,
          codeSnippet: `const chart = echarts.init(container);\nchart.setOption({\n  series: [{ type: '${event.data.details?.chartType || 'bar'}', data: [...] }]\n});`
        });
      }
      
      // CODE BLOCK events
      if (eventType === 'CODE_BLOCK_EXTRACTED') {
        addStep({
          id: event.id,
          type: 'function',
          title: '💻 Code Block Extracted',
          subtitle: `Language: ${event.data.details?.language || 'unknown'} (${event.data.details?.codeLength || 0} chars)`,
          file: 'EnhancedMarkdownRenderer.tsx',
          status: 'completed',
          timestamp: event.timestamp,
          codeSnippet: event.data.codeSnippet
        });
      }
      
      // STATE UPDATE events
      if (eventType === 'STATE_UPDATE') {
        addStep({
          id: event.id,
          type: 'state',
          title: '💾 State Update',
          subtitle: `${event.data.stateKey}: ${event.data.statePrevValue} → ${event.data.stateNewValue}`,
          file: event.source.file || 'unknown',
          status: 'completed',
          timestamp: event.timestamp
        });
      }
      
      // ERROR events
      if (eventType === 'ERROR_CAUGHT') {
        addStep({
          id: event.id,
          type: 'error',
          title: `🚨 Error: ${event.data.errorExplanation?.statusCode || 'Unknown'}`,
          subtitle: event.data.errorExplanation?.technical || event.data.message || 'Error occurred',
          file: event.source.file || 'unknown',
          status: 'error',
          timestamp: event.timestamp,
          details: event.data.errorExplanation
        });
      }
      
      if (eventType === 'AUTO_RETRY_START') {
        addStep({
          id: event.id,
          type: 'error',
          title: '🔄 Auto-Retry Started',
          subtitle: event.data.message || 'Retrying failed request...',
          file: event.source.file || 'unknown',
          status: 'running',
          timestamp: event.timestamp
        });
      }
      
      if (eventType === 'AUTO_RETRY_END') {
        const retrySuccess = event.data.details?.success ?? false;
        addStep({
          id: event.id,
          type: 'error',
          title: retrySuccess ? '✅ Retry Succeeded' : '❌ Retry Failed',
          subtitle: event.data.message || 'Retry completed',
          file: event.source.file || 'unknown',
          status: retrySuccess ? 'completed' : 'error',
          timestamp: event.timestamp
        });
      }
    });

    return flowSteps;
  };

  // Generate code snippet for library calls
  const generateLibraryCode = (lib: string, func: string, data: any) => {
    if (lib === 'openai' || lib.includes('openai')) {
      return `const stream = await client.chat.completions.create({\n  model: "${data.details?.model || 'gpt-4'}",\n  messages: [{ role: 'user', content: prompt }],\n  stream: true\n});`;
    }
    if (lib.includes('anthropic')) {
      return `const response = await anthropic.messages.create({\n  model: "${data.details?.model || 'claude-3'}",\n  messages: [{ role: 'user', content: prompt }],\n  stream: true\n});`;
    }
    if (lib.includes('google') || lib.includes('gemini')) {
      return `const model = genAI.getGenerativeModel({ model: "${data.details?.model || 'gemini-pro'}" });\nconst result = await model.generateContentStream(prompt);`;
    }
    if (lib === 'marked') {
      return `const html = marked.parse(markdown, {\n  gfm: true,\n  breaks: true\n});`;
    }
    if (lib === 'ECharts') {
      return `const chart = echarts.init(container);\nchart.setOption({\n  series: [{ type: 'bar', data: [...] }]\n});`;
    }
    if (lib === 'Fetch API') {
      return `const response = await fetch(url, {\n  method: 'POST',\n  headers: { 'Authorization': 'Bearer ...' },\n  body: JSON.stringify({ ... })\n});`;
    }
    if (lib === 'chart-utils') {
      return `const { content, charts } = convertTablesToCharts(markdown);\n// Detects tables and converts to ECharts configs`;
    }
    if (lib === 'Regex') {
      return `const regex = /\`\`\`([^\\n]*)\\n([\\s\\S]*?)\`\`\`/g;\nlet match;\nwhile ((match = regex.exec(content)) !== null) {\n  // Extract code blocks\n}`;
    }
    if (lib === 'DOMPurify') {
      return `const cleanHtml = DOMPurify.sanitize(html, {\n  ALLOWED_TAGS: ['p', 'div', 'span', ...],\n  ALLOWED_ATTR: ['class', 'style']\n});`;
    }
    if (lib === 'highlight.js' || lib === 'Prism') {
      return `const highlighted = hljs.highlight(code, {\n  language: '${func || 'javascript'}'\n}).value;`;
    }
    if (lib === 'KaTeX') {
      return `const html = katex.renderToString(latex, {\n  throwOnError: false,\n  displayMode: true\n});`;
    }
    if (lib === 'Plotly') {
      return `Plotly.newPlot(container, data, layout, {\n  responsive: true,\n  displayModeBar: false\n});`;
    }
    return `${lib}.${func}(...)`;
  };

  const flowSteps = buildFlowTree();

  // Get type-specific styling
  const getTypeStyle = (type: string) => {
    const styles: Record<string, { bg: string; border: string; icon: string }> = {
      'function': { bg: 'rgba(99, 102, 241, 0.1)', border: '#6366f1', icon: '🔧' },
      'library': { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', icon: '📚' },
      'file': { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', icon: '📁' },
      'state': { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', icon: '💾' },
      'chunk': { bg: 'rgba(139, 92, 246, 0.1)', border: '#8b5cf6', icon: '📦' },
      'error': { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: '🚨' },
      'dom': { bg: 'rgba(236, 72, 153, 0.1)', border: '#ec4899', icon: '🖼️' },
      'pipeline': { bg: 'rgba(251, 191, 36, 0.1)', border: '#fbbf24', icon: '🚀' },
      'stream': { bg: 'rgba(34, 211, 238, 0.1)', border: '#22d3ee', icon: '📡' },
      // API flow types
      'api': { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', icon: '📤' },
      'backend': { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', icon: '⚙️' },
      'mismatch': { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', icon: '⚠️' },
      // Real-time flow types
      'fetch': { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', icon: '🌐' },
      'supabase': { bg: 'rgba(147, 51, 234, 0.15)', border: '#9333ea', icon: '🗄️' },
      'credit': { bg: 'rgba(234, 179, 8, 0.15)', border: '#eab308', icon: '💳' }
    };
    return styles[type] || styles['function'];
  };

  // Count events for display
  const backendEventCount = flowSteps.filter(s => s.type === 'backend' || s.type === 'api' || s.type === 'mismatch' || s.type === 'fetch').length;
  const mismatchCount = flowSteps.filter(s => s.type === 'mismatch').length;
  const supabaseEventCount = flowSteps.filter(s => s.type === 'supabase' || s.type === 'state' || s.type === 'credit').length;

  return (
    <div className="debug-section flow-tree-section">
      <h3 className="debug-section-title">
        <span>🌳</span> Execution Flow Tree
        {backendEventCount > 0 && (
          <span className="backend-badge">⚙️ {backendEventCount} backend</span>
        )}
        {mismatchCount > 0 && (
          <span className="mismatch-badge">⚠️ {mismatchCount} mismatches</span>
        )}
        {supabaseEventCount > 0 && (
          <span className="supabase-badge">🗄️ {supabaseEventCount} supabase</span>
        )}
      </h3>
      <div className="flow-legend">
        <span className="legend-item"><span className="legend-dot api"></span>Frontend</span>
        <span className="legend-item"><span className="legend-dot backend"></span>Backend :3002</span>
        <span className="legend-item"><span className="legend-dot supabase"></span>Supabase</span>
        <span className="legend-item"><span className="legend-dot mismatch"></span>Mismatch</span>
        <span className="legend-item"><span className="legend-dot stream"></span>Stream</span>
      </div>
      
      {flowSteps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌳</div>
          <div>No execution flow yet</div>
          <div className="empty-hint">Run a query to see real-time: Frontend → Backend → Provider → Supabase</div>
        </div>
      ) : (
        <div className="flow-tree-container">
          {flowSteps.map((step, idx) => {
            const style = getTypeStyle(step.type);
            const isLast = idx === flowSteps.length - 1;
            
            return (
              <div key={step.id} className="flow-tree-node">
                {/* Connector line */}
                {idx > 0 && (
                  <div className="flow-tree-connector">
                    <div className="connector-line" />
                    <div className="connector-arrow">↓</div>
                  </div>
                )}
                
                {/* Node */}
                <div 
                  className={`flow-tree-item ${step.type} ${step.status}`}
                  style={{ 
                    backgroundColor: style.bg, 
                    borderLeftColor: style.border 
                  }}
                >
                  {/* Step number */}
                  <div className="flow-step-number" style={{ backgroundColor: style.border }}>
                    {step.step}
                  </div>
                  
                  {/* Content */}
                  <div className="flow-tree-content">
                    <div className="flow-tree-header">
                      <span className="flow-tree-title">{step.title}</span>
                      <span className={`flow-tree-status ${step.status}`}>
                        {step.status === 'running' ? '🔄' : 
                         step.status === 'error' ? '❌' : 
                         step.status === 'warning' ? '⚠️' : '✅'}
                      </span>
                    </div>
                    
                    <div className="flow-tree-subtitle">{step.subtitle}</div>
                    
                    <div className="flow-tree-meta">
                      <span className="flow-tree-file">📁 {step.file}{step.line ? `:${step.line}` : ''}</span>
                      <span className="flow-tree-time">{formatTime(step.timestamp)}</span>
                    </div>
                    
                    {/* Code snippet */}
                    {step.codeSnippet && (
                      <div className="flow-tree-code">
                        <pre>{step.codeSnippet}</pre>
                      </div>
                    )}
                    
                    {/* Details */}
                    {step.details && step.type === 'error' && (
                      <div className="flow-tree-error-details">
                        <div className="error-detail-row">
                          <span className="error-label">💼 Business:</span>
                          <span>{step.details.business}</span>
                        </div>
                        <div className="error-detail-row">
                          <span className="error-label">🔧 Technical:</span>
                          <span>{step.details.technical}</span>
                        </div>
                      </div>
                    )}
                    
                    {step.details && step.type === 'library' && step.details.input && (
                      <div className="flow-tree-io">
                        <div className="io-row">
                          <span className="io-label">📥 Input:</span>
                          <code>{step.details.input}...</code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Final step indicator */}
          {flowSteps.length > 0 && (
            <div className="flow-tree-end">
              <div className="flow-tree-connector">
                <div className="connector-line" />
              </div>
              <div className="flow-end-marker">
                <span>👁️</span>
                <span>User Sees Result</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ===== Live Code Flow - Complete Real-time Visualization =====
const LiveCodeFlow: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['engines']));
  const [expandedEngines, setExpandedEngines] = useState<Set<string>>(new Set());
  const [selectedTimelineStep, setSelectedTimelineStep] = useState<number | null>(null);
  
  // Get ALL relevant events grouped by type
  const messagePayloads = events.filter(e => e.type === 'MESSAGE_PAYLOAD');
  const apiPayloads = events.filter(e => e.type === 'API_PAYLOAD_SENT');
  const fetchStarts = events.filter(e => e.type === 'FETCH_START');
  const fetchResponses = events.filter(e => e.type === 'FETCH_RESPONSE');
  const streamChunks = events.filter(e => e.type === 'STREAM_CHUNK_CONTENT');
  const backendProcesses = events.filter(e => e.type === 'BACKEND_PROCESS');
  const chunkMerges = events.filter(e => e.type === 'CHUNK_MERGED');
  const markdownParses = events.filter(e => e.type === 'MARKDOWN_PARSE');
  const domInjections = events.filter(e => e.type === 'DOM_INJECT');
  const stateUpdates = events.filter(e => e.type === 'STATE_UPDATE');
  const fileHandoffs = events.filter(e => e.type === 'FILE_HANDOFF');
  const libraryTriggers = events.filter(e => e.type === 'LIBRARY_TRIGGERED');
  
  // Group events by engine/provider
  const engineFlows = new Map<string, {
    provider: string;
    payload?: DebugEvent;
    fetchStart?: DebugEvent;
    fetchResponse?: DebugEvent;
    backend?: DebugEvent;
    chunks: DebugEvent[];
    isStreaming: boolean;
  }>();
  
  // Build engine flows from all API payloads
  apiPayloads.forEach(payload => {
    const provider = payload.data.provider || 'unknown';
    if (!engineFlows.has(provider)) {
      engineFlows.set(provider, {
        provider,
        payload,
        chunks: [],
        isStreaming: false
      });
    } else {
      engineFlows.get(provider)!.payload = payload;
    }
  });
  
  // Add fetch responses to engine flows
  fetchResponses.forEach(resp => {
    const provider = resp.data.provider || 'unknown';
    if (engineFlows.has(provider)) {
      engineFlows.get(provider)!.fetchResponse = resp;
    }
  });
  
  // Add backend processes to engine flows
  backendProcesses.forEach(bp => {
    const provider = bp.data.provider || 'unknown';
    if (engineFlows.has(provider)) {
      engineFlows.get(provider)!.backend = bp;
    }
  });
  
  // Calculate streaming stats
  const totalChunks = streamChunks.length;
  const totalChars = streamChunks.reduce((acc, e) => acc + (e.data.streamChunk?.content?.length || 0), 0);
  const latestChunk = streamChunks[streamChunks.length - 1];
  const isStreaming = latestChunk && !latestChunk.data.streamChunk?.isComplete;
  
  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const toggleEngine = (provider: string) => {
    setExpandedEngines(prev => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };
  
  // Get unique function calls from file handoffs
  const functionCalls = fileHandoffs.map(e => ({
    from: e.data.flowStep?.file || e.source?.file || 'unknown',
    to: e.data.details?.targetFile || 'unknown',
    function: e.data.flowStep?.function || 'unknown',
    timestamp: e.timestamp
  }));
  
  return (
    <div className="debug-section live-code-flow-section">
      <h3 className="debug-section-title">
        <span>🔄</span> Live Code Flow
        {isStreaming && <span className="streaming-badge">🔴 STREAMING</span>}
        <span className="engine-count">{engineFlows.size} engine(s)</span>
      </h3>
      
      {/* Section 1: All Engines Called */}
      <div className="flow-section">
        <div 
          className="flow-section-header"
          onClick={() => toggleSection('engines')}
        >
          <span className="section-icon">{expandedSections.has('engines') ? '▼' : '▶'}</span>
          <span className="section-title">🚀 Engines Called ({engineFlows.size})</span>
        </div>
        {expandedSections.has('engines') && (
          <div className="flow-section-content">
            {Array.from(engineFlows.entries()).map(([provider, flow]) => (
              <div key={provider} className="engine-card">
                <div className="engine-header" onClick={() => toggleEngine(provider)}>
                  <span className="expand-icon">{expandedEngines.has(provider) ? '▼' : '▶'}</span>
                  <span className={`engine-badge engine-${provider.toLowerCase()}`}>{provider}</span>
                  {flow.fetchResponse && (
                    <span className={`status-badge status-${flow.fetchResponse.data.httpStatus}`}>
                      {flow.fetchResponse.data.httpStatus}
                    </span>
                  )}
                  {flow.fetchResponse?.data.responseTime && (
                    <span className="response-time">{flow.fetchResponse.data.responseTime}ms</span>
                  )}
                  <span className="click-hint">Click to expand</span>
                </div>
                
                {/* Always show basic info */}
                {flow.payload?.data.messagePayload && (
                  <div className="engine-payload">
                    <div className="payload-label">Request Params:</div>
                    <code className="payload-content">
                      model: {flow.payload.data.messagePayload.model}, 
                      max_tokens: {flow.payload.data.messagePayload.max_tokens},
                      stream: {String(flow.payload.data.messagePayload.stream)}
                    </code>
                  </div>
                )}
                
                {/* Expanded: Show full message payload JSON */}
                {expandedEngines.has(provider) && flow.payload?.data.messagePayload && (
                  <div className="engine-full-payload">
                    <div className="payload-label">📤 Full API Payload (JSON):</div>
                    <pre className="json-payload">
{JSON.stringify({
  messages: flow.payload.data.messagePayload.messages,
  model: flow.payload.data.messagePayload.model,
  max_tokens: flow.payload.data.messagePayload.max_tokens,
  stream: flow.payload.data.messagePayload.stream
}, null, 2)}
                    </pre>
                    
                    {/* Show each message separately */}
                    <div className="messages-breakdown">
                      <div className="payload-label">💬 Messages:</div>
                      {flow.payload.data.messagePayload.messages.map((msg, idx) => (
                        <div key={idx} className={`message-block role-${msg.role}`}>
                          <div className="message-role-header">{msg.role.toUpperCase()}</div>
                          <div className="message-content-full">{msg.content}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Show code snippet if available */}
                    {flow.payload.data.codeSnippet && (
                      <div className="code-flow-snippet">
                        <div className="payload-label">📝 Code:</div>
                        <pre className="code-snippet">{flow.payload.data.codeSnippet}</pre>
                      </div>
                    )}
                  </div>
                )}
                
                {flow.backend?.data.backendParams?.cappedAt && (
                  <div className="engine-cap">
                    ⚠️ Token cap applied: {flow.backend.data.backendParams.cappedAt}
                  </div>
                )}
              </div>
            ))}
            {engineFlows.size === 0 && (
              <div className="empty-hint">No engines called yet</div>
            )}
          </div>
        )}
      </div>
      
      {/* Section 2: Function Call Chain */}
      <div className="flow-section">
        <div 
          className="flow-section-header"
          onClick={() => toggleSection('functions')}
        >
          <span className="section-icon">{expandedSections.has('functions') ? '▼' : '▶'}</span>
          <span className="section-title">📁 File & Function Calls ({fileHandoffs.length + libraryTriggers.length})</span>
        </div>
        {expandedSections.has('functions') && (
          <div className="flow-section-content">
            <div className="function-chain">
              {/* Show file handoffs */}
              {fileHandoffs.slice(-10).map((event, idx) => (
                <div key={`fh-${idx}`} className="function-call">
                  <span className="func-file">{event.source?.file || 'unknown'}</span>
                  <span className="func-arrow">→</span>
                  <span className="func-name">{event.data.flowStep?.function || event.data.message || 'unknown'}</span>
                  <span className="func-arrow">→</span>
                  <span className="func-target">{event.data.details?.targetFile || 'next'}</span>
                </div>
              ))}
              {/* Show library triggers */}
              {libraryTriggers.slice(-5).map((event, idx) => (
                <div key={`lt-${idx}`} className="function-call library-call">
                  <span className="func-lib">📚 {event.data.library}</span>
                  <span className="func-arrow">→</span>
                  <span className="func-name">{event.data.flowStep?.function || event.data.message || 'unknown'}</span>
                </div>
              ))}
              {fileHandoffs.length === 0 && libraryTriggers.length === 0 && (
                <div className="empty-hint">No function calls tracked yet</div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Section 3: Streaming & Chunks */}
      <div className="flow-section">
        <div 
          className="flow-section-header"
          onClick={() => toggleSection('streaming')}
        >
          <span className="section-icon">{expandedSections.has('streaming') ? '▼' : '▶'}</span>
          <span className="section-title">
            📡 Streaming ({totalChunks} chunks, {totalChars} chars)
            {isStreaming && <span className="live-dot">●</span>}
          </span>
        </div>
        {expandedSections.has('streaming') && (
          <div className="flow-section-content">
            <div className="stream-info">
              <div className="stream-stats-row">
                <span className="stat-item">Chunks received: <strong>{totalChunks}</strong></span>
                <span className="stat-item">Total characters: <strong>{totalChars}</strong></span>
                <span className="stat-item">Status: <strong>{isStreaming ? '🔴 Streaming' : '✅ Complete'}</strong></span>
              </div>
              {latestChunk?.data.streamChunk?.content && (
                <div className="latest-chunk-preview">
                  <span className="chunk-label">Latest chunk content:</span>
                  <code className="chunk-text">"{latestChunk.data.streamChunk.content.substring(0, 150)}"</code>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Section 4: Frontend Processing (After Chunks) */}
      <div className="flow-section">
        <div 
          className="flow-section-header"
          onClick={() => toggleSection('frontend')}
        >
          <span className="section-icon">{expandedSections.has('frontend') ? '▼' : '▶'}</span>
          <span className="section-title">🖥️ Frontend Processing ({chunkMerges.length + markdownParses.length + domInjections.length + stateUpdates.length})</span>
        </div>
        {expandedSections.has('frontend') && (
          <div className="flow-section-content">
            <div className="processing-steps">
              {/* Chunk Merging */}
              <div className={`processing-step ${chunkMerges.length > 0 ? 'active' : 'pending'}`}>
                <span className="step-icon">🔗</span>
                <span className="step-name">Chunk Merging</span>
                <span className="step-file">OneMindAI.tsx → mergeChunks()</span>
                <span className="step-count">{chunkMerges.length} operations</span>
              </div>
              
              {/* Markdown Parsing */}
              <div className={`processing-step ${markdownParses.length > 0 ? 'active' : 'pending'}`}>
                <span className="step-icon">📝</span>
                <span className="step-name">Markdown Parsing</span>
                <span className="step-file">react-markdown → parse()</span>
                <span className="step-count">{markdownParses.length} operations</span>
              </div>
              
              {/* Code Highlighting */}
              <div className={`processing-step ${libraryTriggers.filter(e => e.data.library?.includes('highlight') || e.data.library?.includes('prism')).length > 0 ? 'active' : 'pending'}`}>
                <span className="step-icon">🎨</span>
                <span className="step-name">Code Highlighting</span>
                <span className="step-file">prism-react-renderer</span>
                <span className="step-count">{libraryTriggers.filter(e => e.data.library?.includes('highlight') || e.data.library?.includes('prism')).length} operations</span>
              </div>
              
              {/* State Updates */}
              <div className={`processing-step ${stateUpdates.length > 0 ? 'active' : 'pending'}`}>
                <span className="step-icon">⚡</span>
                <span className="step-name">React State Updates</span>
                <span className="step-file">useState → setMessages()</span>
                <span className="step-count">{stateUpdates.length} updates</span>
              </div>
              
              {/* DOM Injection */}
              <div className={`processing-step ${domInjections.length > 0 ? 'active' : 'pending'}`}>
                <span className="step-icon">🖼️</span>
                <span className="step-name">DOM Injection</span>
                <span className="step-file">ReactDOM → render()</span>
                <span className="step-count">{domInjections.length} injections</span>
              </div>
              
              {/* Chart Rendering */}
              <div className={`processing-step ${libraryTriggers.filter(e => e.data.library?.includes('echarts') || e.data.library?.includes('mermaid')).length > 0 ? 'active' : 'pending'}`}>
                <span className="step-icon">📊</span>
                <span className="step-name">Chart Rendering</span>
                <span className="step-file">echarts / mermaid</span>
                <span className="step-count">{libraryTriggers.filter(e => e.data.library?.includes('echarts') || e.data.library?.includes('mermaid')).length} charts</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Section 5: Complete Flow Timeline - Clickable Steps */}
      <div className="flow-section">
        <div 
          className="flow-section-header"
          onClick={() => toggleSection('timeline')}
        >
          <span className="section-icon">{expandedSections.has('timeline') ? '▼' : '▶'}</span>
          <span className="section-title">⏱️ Flow Timeline (Click steps for details)</span>
        </div>
        {expandedSections.has('timeline') && (
          <div className="flow-section-content">
            <div className="timeline-flow">
              <div 
                className={`timeline-step done clickable ${selectedTimelineStep === 1 ? 'selected' : ''}`}
                onClick={() => setSelectedTimelineStep(selectedTimelineStep === 1 ? null : 1)}
              >
                <span className="tl-num">1</span>
                <span className="tl-label">User Input</span>
                <span className="tl-file">OneMindAI.tsx</span>
              </div>
              <div className="timeline-arrow">→</div>
              <div 
                className={`timeline-step ${messagePayloads.length > 0 ? 'done' : 'pending'} clickable ${selectedTimelineStep === 2 ? 'selected' : ''}`}
                onClick={() => setSelectedTimelineStep(selectedTimelineStep === 2 ? null : 2)}
              >
                <span className="tl-num">2</span>
                <span className="tl-label">Build Payload</span>
                <span className="tl-file">streamFromProvider()</span>
              </div>
              <div className="timeline-arrow">→</div>
              <div 
                className={`timeline-step ${fetchStarts.length > 0 ? 'done' : 'pending'} clickable ${selectedTimelineStep === 3 ? 'selected' : ''}`}
                onClick={() => setSelectedTimelineStep(selectedTimelineStep === 3 ? null : 3)}
              >
                <span className="tl-num">3</span>
                <span className="tl-label">HTTP Fetch</span>
                <span className="tl-file">fetch()</span>
              </div>
              <div className="timeline-arrow">→</div>
              <div 
                className={`timeline-step ${backendProcesses.length > 0 ? 'done' : 'pending'} clickable ${selectedTimelineStep === 4 ? 'selected' : ''}`}
                onClick={() => setSelectedTimelineStep(selectedTimelineStep === 4 ? null : 4)}
              >
                <span className="tl-num">4</span>
                <span className="tl-label">Backend Proxy</span>
                <span className="tl-file">ai-proxy.cjs</span>
              </div>
              <div className="timeline-arrow">→</div>
              <div 
                className={`timeline-step ${fetchResponses.length > 0 ? 'done' : 'pending'} clickable ${selectedTimelineStep === 5 ? 'selected' : ''}`}
                onClick={() => setSelectedTimelineStep(selectedTimelineStep === 5 ? null : 5)}
              >
                <span className="tl-num">5</span>
                <span className="tl-label">AI Provider</span>
                <span className="tl-file">OpenAI/Claude/etc</span>
              </div>
              <div className="timeline-arrow">→</div>
              <div 
                className={`timeline-step ${totalChunks > 0 ? (isStreaming ? 'active' : 'done') : 'pending'} clickable ${selectedTimelineStep === 6 ? 'selected' : ''}`}
                onClick={() => setSelectedTimelineStep(selectedTimelineStep === 6 ? null : 6)}
              >
                <span className="tl-num">6</span>
                <span className="tl-label">Stream Chunks</span>
                <span className="tl-file">SSE Reader</span>
              </div>
              <div className="timeline-arrow">→</div>
              <div 
                className={`timeline-step ${chunkMerges.length > 0 ? 'done' : 'pending'} clickable ${selectedTimelineStep === 7 ? 'selected' : ''}`}
                onClick={() => setSelectedTimelineStep(selectedTimelineStep === 7 ? null : 7)}
              >
                <span className="tl-num">7</span>
                <span className="tl-label">Merge & Parse</span>
                <span className="tl-file">react-markdown</span>
              </div>
              <div className="timeline-arrow">→</div>
              <div 
                className={`timeline-step ${!isStreaming && totalChunks > 0 ? 'done' : 'pending'} clickable ${selectedTimelineStep === 8 ? 'selected' : ''}`}
                onClick={() => setSelectedTimelineStep(selectedTimelineStep === 8 ? null : 8)}
              >
                <span className="tl-num">8</span>
                <span className="tl-label">Render UI</span>
                <span className="tl-file">DOM</span>
              </div>
            </div>
            
            {/* Timeline Step Details Panel */}
            {selectedTimelineStep && (
              <div className="timeline-details">
                {selectedTimelineStep === 1 && (
                  <div className="step-detail">
                    <div className="step-header-with-info">
                      <h4>📝 Step 1: User Input</h4>
                      <div className="info-tooltip">
                        <span className="info-icon">ℹ️</span>
                        <div className="tooltip-content">
                          <strong>What's happening:</strong> You type a question or request into the chat box. The system receives your message and prepares to send it to the AI engines you selected.
                          <br/><br/>
                          <strong>In simple terms:</strong> This is like pressing "Send" on a text message - your question is being captured and ready to be processed.
                        </div>
                      </div>
                    </div>
                    <div className="detail-file">File: <code>src/OneMindAI.tsx</code></div>
                    <div className="detail-function">Function: <code>handleSubmit()</code></div>
                    <pre className="detail-code">{`// OneMindAI.tsx - User submits prompt
const handleSubmit = async (prompt: string) => {
  // Validate input
  if (!prompt.trim()) return;
  
  // Add user message to chat
  setMessages(prev => [...prev, { role: 'user', content: prompt }]);
  
  // Start streaming from selected engines
  for (const engine of selectedEngines) {
    streamFromProvider(engine, prompt);
  }
};`}</pre>
                  </div>
                )}
                
                {selectedTimelineStep === 2 && (
                  <div className="step-detail">
                    <div className="step-header-with-info">
                      <h4>📦 Step 2: Build Payload</h4>
                      <div className="info-tooltip">
                        <span className="info-icon">ℹ️</span>
                        <div className="tooltip-content">
                          <strong>What's happening:</strong> Your message is being packaged with additional settings like which AI model to use, how long the response should be, and whether to stream the answer back in real-time.
                          <br/><br/>
                          <strong>In simple terms:</strong> Think of this as preparing a package with your letter and instructions before mailing it - we're adding the "To:" address and special delivery instructions.
                        </div>
                      </div>
                    </div>
                    <div className="detail-file">File: <code>src/OneMindAI.tsx</code></div>
                    <div className="detail-function">Function: <code>streamFromProvider()</code></div>
                    {messagePayloads[messagePayloads.length - 1]?.data.messagePayload && (
                      <pre className="detail-code">{`// Actual payload being sent:
${JSON.stringify(messagePayloads[messagePayloads.length - 1].data.messagePayload, null, 2)}`}</pre>
                    )}
                  </div>
                )}
                
                {selectedTimelineStep === 3 && (
                  <div className="step-detail">
                    <div className="step-header-with-info">
                      <h4>🌐 Step 3: HTTP Fetch</h4>
                      <div className="info-tooltip">
                        <span className="info-icon">ℹ️</span>
                        <div className="tooltip-content">
                          <strong>What's happening:</strong> Your packaged message is being sent over the internet to our backend server using a secure connection. The server acts as a middleman between you and the AI providers.
                          <br/><br/>
                          <strong>In simple terms:</strong> This is like putting your letter in the mailbox - it's being transmitted to the post office (our server) which will forward it to the right destination.
                        </div>
                      </div>
                    </div>
                    <div className="detail-file">File: <code>src/OneMindAI.tsx</code></div>
                    <div className="detail-function">Function: <code>fetch()</code></div>
                    
                    {/* Environment Variables Used */}
                    <div className="env-section">
                      <div className="payload-label">🔐 Environment Variables (.env):</div>
                      <pre className="env-code">{`# .env file used by frontend
VITE_BACKEND_URL=http://localhost:3002
VITE_PROXY_URL=http://localhost:3002

# Resolved endpoint:
${apiPayloads[apiPayloads.length - 1]?.data.apiEndpoint || 'http://localhost:3002/api/[provider]'}`}</pre>
                    </div>
                    
                    {apiPayloads[apiPayloads.length - 1] && (
                      <>
                        <div className="detail-url">
                          <span className="http-method">POST</span>
                          <code>{apiPayloads[apiPayloads.length - 1].data.apiEndpoint}</code>
                        </div>
                        
                        {/* Show actual message content */}
                        {apiPayloads[apiPayloads.length - 1]?.data.messagePayload?.messages && (
                          <div className="actual-messages">
                            <div className="payload-label">📤 Actual Messages Being Sent:</div>
                            {apiPayloads[apiPayloads.length - 1]?.data.messagePayload?.messages.map((msg: any, idx: number) => (
                              <div key={idx} className={`message-block role-${msg.role}`}>
                                <div className="message-role-header">{msg.role.toUpperCase()}</div>
                                <div className="message-content-full">{msg.content}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="payload-label">📝 Full Request Code:</div>
                        <pre className="detail-code">{`// OneMindAI.tsx - Actual fetch call
const proxyUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
const endpoint = "${apiPayloads[apiPayloads.length - 1]?.data.apiEndpoint}";

fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [
${apiPayloads[apiPayloads.length - 1]?.data.messagePayload?.messages?.map((msg: any) => `      { role: "${msg.role}", content: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}" }`).join(',\n') || '      // No messages'}
    ],
    model: "${apiPayloads[apiPayloads.length - 1]?.data.messagePayload?.model || 'unknown'}",
    max_tokens: ${apiPayloads[apiPayloads.length - 1]?.data.messagePayload?.max_tokens || 'auto'},
    stream: true
  })
});`}</pre>
                      </>
                    )}
                  </div>
                )}
                
                {selectedTimelineStep === 4 && (
                  <div className="step-detail">
                    <div className="step-header-with-info">
                      <h4>⚙️ Step 4: Backend Proxy</h4>
                      <div className="info-tooltip">
                        <span className="info-icon">ℹ️</span>
                        <div className="tooltip-content">
                          <strong>What's happening:</strong> Our server receives your message and performs security checks. It validates your API keys, checks rate limits (to prevent abuse), and applies token limits to control costs. Then it forwards your message to the selected AI provider.
                          <br/><br/>
                          <strong>In simple terms:</strong> The post office checks the letter is valid, verifies you haven't sent too many letters today, and then forwards it to the AI company's office.
                        </div>
                      </div>
                    </div>
                    <div className="detail-file">File: <code>server/ai-proxy.cjs</code></div>
                    <div className="detail-function">Function: <code>app.post('/api/:provider')</code></div>
                    
                    {/* Backend Environment Variables */}
                    <div className="env-section">
                      <div className="payload-label">🔐 Backend Environment Variables (.env):</div>
                      <pre className="env-code">{`# server/.env - API Keys (hidden for security)
OPENAI_API_KEY=sk-***************
ANTHROPIC_API_KEY=sk-ant-***************
GOOGLE_AI_API_KEY=AI***************
DEEPSEEK_API_KEY=sk-***************

# Server Configuration
PORT=3002
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5176

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60`}</pre>
                    </div>
                    
                    {/* Backend Processing Flow */}
                    <div className="backend-flow">
                      <div className="payload-label">🔄 Backend Processing Flow:</div>
                      <div className="flow-steps-list">
                        <div className="flow-step-item">1️⃣ Receive request from frontend</div>
                        <div className="flow-step-item">2️⃣ Validate API key from .env</div>
                        <div className="flow-step-item">3️⃣ Apply rate limiting (60 req/min)</div>
                        <div className="flow-step-item">4️⃣ Apply token caps per provider</div>
                        <div className="flow-step-item">5️⃣ Forward to AI provider API</div>
                        <div className="flow-step-item">6️⃣ Stream response back to frontend</div>
                      </div>
                    </div>
                    
                    {backendProcesses[backendProcesses.length - 1] && (
                      <>
                        <div className="payload-label">📝 Backend Code:</div>
                        <pre className="detail-code">{`// server/ai-proxy.cjs
const apiKey = process.env.${backendProcesses[backendProcesses.length - 1].data.provider?.toUpperCase() || 'OPENAI'}_API_KEY;

app.post('/api/${backendProcesses[backendProcesses.length - 1].data.provider || 'provider'}', async (req, res) => {
  const { messages, model, max_tokens, stream } = req.body;
  
  // Token cap applied: ${backendProcesses[backendProcesses.length - 1].data.backendParams?.cappedAt || 'none'}
  const cappedTokens = Math.min(max_tokens, PROVIDER_LIMITS['${backendProcesses[backendProcesses.length - 1].data.provider || 'provider'}']);
  
  // Forward to AI provider
  const response = await fetch('https://api.${backendProcesses[backendProcesses.length - 1].data.provider || 'provider'}.com/v1/...', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages,
      model: '${backendProcesses[backendProcesses.length - 1].data.backendParams?.model || 'model'}',
      max_tokens: cappedTokens,
      stream: true
    })
  });
  
  // Stream SSE response back to client
  res.setHeader('Content-Type', 'text/event-stream');
  // ... pipe response
});`}</pre>
                      </>
                    )}
                  </div>
                )}
                
                {selectedTimelineStep === 5 && (
                  <div className="step-detail">
                    <div className="step-header-with-info">
                      <h4>🤖 Step 5: AI Provider Response</h4>
                      <div className="info-tooltip">
                        <span className="info-icon">ℹ️</span>
                        <div className="tooltip-content">
                          <strong>What's happening:</strong> The AI provider (OpenAI, Claude, Gemini, etc.) receives your message and starts generating an intelligent response. The response is sent back as a stream of data - like words appearing one by one instead of all at once.
                          <br/><br/>
                          <strong>In simple terms:</strong> The AI company reads your question and starts writing an answer. Instead of waiting for the complete answer, they send it back word-by-word so you see it appear in real-time.
                        </div>
                      </div>
                    </div>
                    <div className="detail-file">External API</div>
                    {fetchResponses[fetchResponses.length - 1] && (
                      <div className="detail-response">
                        <span className={`status-badge status-${fetchResponses[fetchResponses.length - 1].data.httpStatus}`}>
                          Status: {fetchResponses[fetchResponses.length - 1].data.httpStatus}
                        </span>
                        <span className="response-time">
                          Response time: {fetchResponses[fetchResponses.length - 1].data.responseTime}ms
                        </span>
                      </div>
                    )}
                    <pre className="detail-code">{`// AI Provider returns SSE stream
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" there"}}]}
data: {"choices":[{"delta":{"content":"!"}}]}
data: [DONE]`}</pre>
                  </div>
                )}
                
                {selectedTimelineStep === 6 && (
                  <div className="step-detail">
                    <div className="step-header-with-info">
                      <h4>📡 Step 6: Stream Chunks</h4>
                      <div className="info-tooltip">
                        <span className="info-icon">ℹ️</span>
                        <div className="tooltip-content">
                          <strong>What's happening:</strong> The response from the AI provider is arriving in small pieces (chunks) over the internet. Your browser is receiving these chunks in real-time and collecting them together to form the complete answer.
                          <br/><br/>
                          <strong>In simple terms:</strong> Imagine receiving a letter one sentence at a time - each sentence arrives separately, but you're collecting all of them to read the full message.
                        </div>
                      </div>
                    </div>
                    <div className="detail-file">File: <code>src/OneMindAI.tsx</code></div>
                    <div className="detail-function">Function: <code>reader.read()</code></div>
                    <div className="detail-stats">
                      <span>Total chunks: <strong>{totalChunks}</strong></span>
                      <span>Total characters: <strong>{totalChars}</strong></span>
                    </div>
                    <pre className="detail-code">{`// OneMindAI.tsx - SSE Stream Reader
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const content = JSON.parse(line.slice(6));
      yield content.choices[0].delta.content;
    }
  }
}`}</pre>
                  </div>
                )}
                
                {selectedTimelineStep === 7 && (
                  <div className="step-detail">
                    <div className="step-header-with-info">
                      <h4>🔗 Step 7: Merge & Parse</h4>
                      <div className="info-tooltip">
                        <span className="info-icon">ℹ️</span>
                        <div className="tooltip-content">
                          <strong>What's happening:</strong> All the chunks are being combined into one complete message. The system then analyzes the text to identify special formatting like code blocks, tables, and links. It applies syntax highlighting to code and prepares everything for display.
                          <br/><br/>
                          <strong>In simple terms:</strong> We're assembling all the sentence pieces into a complete letter, then formatting it nicely - making code look like code, highlighting important parts, and organizing tables properly.
                        </div>
                      </div>
                    </div>
                    <div className="detail-file">Libraries: <code>react-markdown</code>, <code>prism-react-renderer</code></div>
                    <pre className="detail-code">{`// Markdown parsing pipeline
import ReactMarkdown from 'react-markdown';
import { Prism } from 'prism-react-renderer';

// 1. Merge all chunks into full response
const fullResponse = chunks.join('');

// 2. Parse markdown to AST
// 3. Detect code blocks, tables, charts
// 4. Apply syntax highlighting
// 5. Render to React components

<ReactMarkdown
  components={{
    code: ({ node, inline, className, children }) => (
      <SyntaxHighlighter language={lang}>
        {children}
      </SyntaxHighlighter>
    )
  }}
>
  {fullResponse}
</ReactMarkdown>`}</pre>
                  </div>
                )}
                
                {selectedTimelineStep === 8 && (
                  <div className="step-detail">
                    <div className="step-header-with-info">
                      <h4>👁️ Step 8: Render UI</h4>
                      <div className="info-tooltip">
                        <span className="info-icon">ℹ️</span>
                        <div className="tooltip-content">
                          <strong>What's happening:</strong> The formatted message is being displayed on your screen. React updates the webpage to show the complete AI response in the chat window. You can now read the answer, copy it, or ask a follow-up question.
                          <br/><br/>
                          <strong>In simple terms:</strong> The letter is finally in your hands! You can read the complete answer on your screen. The entire process from your question to the AI's answer is now complete.
                        </div>
                      </div>
                    </div>
                    <div className="detail-file">File: <code>src/OneMindAI.tsx</code></div>
                    <div className="detail-function">React DOM Reconciliation</div>
                    <pre className="detail-code">{`// React renders the parsed content to DOM
// 1. Virtual DOM diff
// 2. Batch DOM updates
// 3. Paint to screen

// Final output visible to user:
<div className="message assistant">
  <ReactMarkdown>{response}</ReactMarkdown>
</div>

// Total characters rendered: ${totalChars}`}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Empty State */}
      {messagePayloads.length === 0 && engineFlows.size === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔄</div>
          <div>No API calls yet</div>
          <div className="empty-hint">Send a message to see the complete code flow</div>
        </div>
      )}
    </div>
  );
};

// ===== Real-Time Flow Tree - User Activity Visualization =====
const FlowTreeVisualization: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Categorize events by layer for real-time pipeline visualization
  const frontendEvents = events.filter(e => 
    e.type === 'USER_CLICK' || e.type === 'USER_INPUT' || e.type === 'USER_SUBMIT' ||
    e.type === 'COMPONENT_TRIGGERED' || e.type === 'HANDLER_CALLED' ||
    e.type === 'STATE_UPDATE' || e.type === 'DOM_INJECT' ||
    e.type === 'PROMPT_JOURNEY' // Include prompt journey in frontend
  );
  const middlewareEvents = events.filter(e => 
    e.type === 'MIDDLEWARE_ENTER' || e.type === 'MIDDLEWARE_EXIT' ||
    e.type === 'FETCH_START' || e.type === 'API_PAYLOAD_SENT'
  );
  const backendEvents = events.filter(e => 
    e.type === 'BACKEND_PROCESS' || e.type === 'RAILWAY_REQUEST' || e.type === 'RAILWAY_RESPONSE' ||
    e.type.startsWith('SUPABASE_')
  );
  const providerEvents = events.filter(e => 
    e.type === 'MESSAGE_PAYLOAD' || e.type === 'STREAM_CHUNK_CONTENT' ||
    e.type === 'API_RESPONSE_CONTENT' || e.type === 'FUNCTION_CALL_TRACE'
  );
  const responseEvents = events.filter(e => 
    e.type === 'FETCH_RESPONSE' || e.type === 'RESPONSE_COMPLETE' ||
    e.type === 'CHUNK_MERGED' || e.type === 'MARKDOWN_PARSE' ||
    e.type === 'RESPONSE_TRANSFORMATION' || e.type === 'TRUNCATION_DETECTED' // Include response transformation
  );
  
  // Get prompt journey and response transformation events for dedicated sections
  const promptJourneyEvents = events.filter(e => e.type === 'PROMPT_JOURNEY');
  const responseTransformEvents = events.filter(e => 
    e.type === 'RESPONSE_TRANSFORMATION' || e.type === 'TRUNCATION_DETECTED'
  );
  
  // Build flow sessions from events
  const flowSessions: Array<{
    id: string;
    trigger: string;
    timestamp: number;
    nodes: Array<{
      type: string;
      layer: 'frontend' | 'middleware' | 'backend' | 'provider' | 'response';
      label: string;
      file?: string;
      function?: string;
      timestamp: number;
      data?: any;
      direction?: 'outbound' | 'inbound';
    }>;
    duration?: number;
    isComplete: boolean;
  }> = [];
  
  // Group events into flow sessions based on USER_CLICK or USER_SUBMIT
  let currentSession: typeof flowSessions[0] | null = null;
  
  events.forEach(event => {
    if (event.type === 'USER_CLICK' || event.type === 'USER_SUBMIT') {
      if (currentSession) {
        flowSessions.push(currentSession);
      }
      currentSession = {
        id: event.id,
        trigger: event.data.userActivity?.target || event.data.message,
        timestamp: event.timestamp,
        nodes: [{
          type: 'user',
          layer: 'frontend',
          label: event.data.message,
          file: event.data.flowStep?.file,
          function: event.data.flowStep?.function,
          timestamp: event.timestamp,
          data: event.data.userActivity,
          direction: 'outbound'
        }],
        isComplete: false
      };
    } else if (currentSession) {
      const { nodeType, layer, direction } = categorizeEvent(event);
      
      if (nodeType !== 'other') {
        currentSession.nodes.push({
          type: nodeType,
          layer,
          label: event.data.message,
          file: event.data.flowStep?.file || event.source?.file,
          function: event.data.flowStep?.function || event.source?.function,
          timestamp: event.timestamp,
          data: event.data,
          direction
        });
      }
      
      if (event.type === 'RESPONSE_COMPLETE' || event.type === 'FLOW_COMPLETE' || event.type === 'DOM_INJECT') {
        currentSession.duration = event.timestamp - currentSession.timestamp;
        currentSession.isComplete = true;
        flowSessions.push(currentSession);
        currentSession = null;
      }
    }
  });
  
  if (currentSession) {
    flowSessions.push(currentSession);
  }
  
  function categorizeEvent(event: DebugEvent): { nodeType: string; layer: 'frontend' | 'middleware' | 'backend' | 'provider' | 'response'; direction: 'outbound' | 'inbound' } {
    switch (event.type) {
      case 'COMPONENT_TRIGGERED':
      case 'HANDLER_CALLED':
        return { nodeType: 'function', layer: 'frontend', direction: 'outbound' };
      case 'STATE_UPDATE':
        return { nodeType: 'state', layer: 'frontend', direction: 'inbound' };
      case 'FETCH_START':
      case 'API_PAYLOAD_SENT':
        return { nodeType: 'api', layer: 'middleware', direction: 'outbound' };
      case 'MIDDLEWARE_ENTER':
        return { nodeType: 'middleware', layer: 'middleware', direction: 'outbound' };
      case 'MIDDLEWARE_EXIT':
        return { nodeType: 'middleware', layer: 'middleware', direction: 'inbound' };
      case 'BACKEND_PROCESS':
        return { nodeType: 'backend', layer: 'backend', direction: 'outbound' };
      case 'RAILWAY_REQUEST':
        return { nodeType: 'railway', layer: 'backend', direction: 'outbound' };
      case 'RAILWAY_RESPONSE':
        return { nodeType: 'railway', layer: 'backend', direction: 'inbound' };
      case 'SUPABASE_QUERY':
      case 'SUPABASE_INSERT':
      case 'SUPABASE_UPDATE':
      case 'SUPABASE_RPC':
        return { nodeType: 'database', layer: 'backend', direction: 'outbound' };
      case 'MESSAGE_PAYLOAD':
      case 'FUNCTION_CALL_TRACE':
        return { nodeType: 'provider', layer: 'provider', direction: 'outbound' };
      case 'STREAM_CHUNK_CONTENT':
      case 'API_RESPONSE_CONTENT':
        return { nodeType: 'provider', layer: 'provider', direction: 'inbound' };
      case 'FETCH_RESPONSE':
        return { nodeType: 'response', layer: 'response', direction: 'inbound' };
      case 'RESPONSE_COMPLETE':
      case 'CHUNK_MERGED':
        return { nodeType: 'complete', layer: 'response', direction: 'inbound' };
      case 'MARKDOWN_PARSE':
      case 'DOM_INJECT':
        return { nodeType: 'render', layer: 'frontend', direction: 'inbound' };
      case 'PROMPT_JOURNEY':
        return { nodeType: 'prompt', layer: 'frontend', direction: 'outbound' };
      case 'RESPONSE_TRANSFORMATION':
      case 'TRUNCATION_DETECTED':
        return { nodeType: 'response', layer: 'response', direction: 'inbound' };
      default:
        return { nodeType: 'other', layer: 'frontend', direction: 'outbound' };
    }
  }
  
  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'user': return '👆';
      case 'function': return '⚡';
      case 'state': return '📊';
      case 'api': return '🌐';
      case 'middleware': return '🔄';
      case 'backend': return '⚙️';
      case 'railway': return '🚂';
      case 'database': return '🗄️';
      case 'provider': return '🤖';
      case 'response': return '📥';
      case 'complete': return '✅';
      case 'render': return '🎨';
      case 'prompt': return '📝';
      default: return '📍';
    }
  };
  
  const getLayerColor = (layer: string) => {
    switch (layer) {
      case 'frontend': return '#3b82f6';
      case 'middleware': return '#ec4899';
      case 'backend': return '#6366f1';
      case 'provider': return '#f59e0b';
      case 'response': return '#22c55e';
      default: return '#6b7280';
    }
  };
  
  const getDirectionArrow = (direction?: string) => {
    return direction === 'inbound' ? '←' : '→';
  };
  
  // Real-time pipeline status
  const pipelineStatus = {
    frontend: frontendEvents.length,
    middleware: middlewareEvents.length,
    backend: backendEvents.length,
    provider: providerEvents.length,
    response: responseEvents.length
  };
  
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;
  const activeLayer = latestEvent ? categorizeEvent(latestEvent).layer : null;
  
  return (
    <div className="debug-section flow-tree-section">
      {/* Real-Time Pipeline Visualization */}
      <div className="realtime-pipeline">
        <h3 className="pipeline-title">🔴 Real-Time Data Flow</h3>
        <div className="pipeline-layers">
          <div className={`pipeline-layer ${activeLayer === 'frontend' ? 'active pulse' : ''}`}>
            <div className="layer-icon">🖥️</div>
            <div className="layer-name">Frontend</div>
            <div className="layer-count">{pipelineStatus.frontend}</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className={`pipeline-layer ${activeLayer === 'middleware' ? 'active pulse' : ''}`}>
            <div className="layer-icon">🔄</div>
            <div className="layer-name">Middleware</div>
            <div className="layer-count">{pipelineStatus.middleware}</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className={`pipeline-layer ${activeLayer === 'backend' ? 'active pulse' : ''}`}>
            <div className="layer-icon">⚙️</div>
            <div className="layer-name">Backend</div>
            <div className="layer-count">{pipelineStatus.backend}</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className={`pipeline-layer ${activeLayer === 'provider' ? 'active pulse' : ''}`}>
            <div className="layer-icon">🤖</div>
            <div className="layer-name">AI Provider</div>
            <div className="layer-count">{pipelineStatus.provider}</div>
          </div>
          <div className="pipeline-arrow">←</div>
          <div className={`pipeline-layer ${activeLayer === 'response' ? 'active pulse' : ''}`}>
            <div className="layer-icon">📥</div>
            <div className="layer-name">Response</div>
            <div className="layer-count">{pipelineStatus.response}</div>
          </div>
        </div>
        {latestEvent && (
          <div className="latest-event">
            <span className="latest-label">Latest:</span>
            <span className="latest-type">{latestEvent.type}</span>
            <span className="latest-message">{latestEvent.data.message?.substring(0, 60)}...</span>
          </div>
        )}
      </div>
      
      {/* Flow Sessions */}
      <h3 className="debug-section-title" style={{ marginTop: '16px' }}>
        <span>🌳</span> Activity Flow Sessions
        <span className="section-badge">{flowSessions.length} flows</span>
      </h3>
      
      {flowSessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔄</div>
          <div>No user activity captured yet</div>
          <div className="empty-hint">Click buttons, submit forms, or send messages to see the flow</div>
        </div>
      ) : (
        <div className="flow-sessions">
          {flowSessions.slice(-10).reverse().map((session) => (
            <div key={session.id} className={`flow-session ${session.isComplete ? 'complete' : 'in-progress'}`}>
              <div 
                className="flow-session-header"
                onClick={() => toggleNode(session.id)}
              >
                <span className="expand-icon">{expandedNodes.has(session.id) ? '▼' : '▶'}</span>
                <span className={`session-status ${session.isComplete ? 'complete' : 'pending'}`}>
                  {session.isComplete ? '✅' : '⏳'}
                </span>
                <span className="session-trigger">{session.trigger?.substring(0, 50)}</span>
                <span className="session-time">{formatTime(session.timestamp)}</span>
                {session.duration && (
                  <span className="session-duration">{session.duration}ms</span>
                )}
                <span className="session-nodes">{session.nodes.length} steps</span>
              </div>
              
              {expandedNodes.has(session.id) && (
                <div className="flow-tree-container">
                  {session.nodes.map((node, nodeIdx) => (
                    <div key={nodeIdx} className={`flow-tree-node direction-${node.direction}`}>
                      <div className="flow-tree-connector">
                        {nodeIdx > 0 && <div className="connector-line" />}
                        <div 
                          className="node-dot" 
                          style={{ backgroundColor: getLayerColor(node.layer) }}
                        >
                          {getNodeIcon(node.type)}
                        </div>
                        {nodeIdx < session.nodes.length - 1 && <div className="connector-line-down" />}
                      </div>
                      <div className="flow-tree-content" style={{ borderLeftColor: getLayerColor(node.layer) }}>
                        <div className="node-header">
                          <span className="node-direction">{getDirectionArrow(node.direction)}</span>
                          <span className="node-layer" style={{ backgroundColor: getLayerColor(node.layer) }}>
                            {node.layer.toUpperCase()}
                          </span>
                          <span className="node-type-label">{node.type}</span>
                        </div>
                        <div className="node-label">{node.label}</div>
                        {node.file && (
                          <div className="node-file">
                            <code>{node.file}</code>
                            {node.function && <span className="node-function">→ {node.function}()</span>}
                          </div>
                        )}
                        {node.data && (
                          <div className="node-data">
                            {node.data.apiEndpoint && (
                              <span className="data-tag">API: {node.data.apiEndpoint}</span>
                            )}
                            {node.data.provider && (
                              <span className="data-tag">Provider: {node.data.provider}</span>
                            )}
                            {node.data.httpStatus && (
                              <span className={`data-tag status-${node.data.httpStatus >= 400 ? 'error' : 'success'}`}>
                                Status: {node.data.httpStatus}
                              </span>
                            )}
                            {node.data.responseTime && (
                              <span className="data-tag">{node.data.responseTime}ms</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Legend */}
      <div className="flow-legend">
        <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></span> Frontend</div>
        <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#ec4899' }}></span> Middleware</div>
        <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#6366f1' }}></span> Backend</div>
        <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span> AI Provider</div>
        <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#22c55e' }}></span> Response</div>
        <div className="legend-item"><span>→</span> Outbound</div>
        <div className="legend-item"><span>←</span> Inbound</div>
      </div>
      
      {/* Prompt Journey Section */}
      <PromptJourneyVisualization events={events} />
      
      {/* Response Transformation Section */}
      <ResponseTransformationVisualization events={events} />
    </div>
  );
};

// ===== Prompt Journey Visualization =====
const PromptJourneyVisualization: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  
  // Get prompt journey events
  const promptJourneyEvents = events.filter(e => e.type === 'PROMPT_JOURNEY');
  
  // Always show section with waiting state if no events
  if (promptJourneyEvents.length === 0) {
    return (
      <div className="prompt-journey-section">
        <h3 className="debug-section-title">
          <span>📝</span> Prompt Journey
          <span className="section-badge">Waiting...</span>
        </h3>
        <div style={{ padding: '16px', color: '#888', textAlign: 'center', fontSize: '12px' }}>
          Type a prompt and click Generate to see the full prompt journey
        </div>
      </div>
    );
  }
  
  const toggleStage = (id: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'user_input': return '#3b82f6';
      case 'enhanced': return '#8b5cf6';
      case 'truncated': return '#ef4444';
      case 'sent_to_api': return '#f59e0b';
      case 'received_response': return '#22c55e';
      default: return '#6b7280';
    }
  };
  
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'user_input': return '📝';
      case 'enhanced': return '📎';
      case 'truncated': return '✂️';
      case 'sent_to_api': return '📤';
      case 'received_response': return '📥';
      default: return '📍';
    }
  };
  
  return (
    <div className="prompt-journey-section">
      <h3 className="debug-section-title">
        <span>📝</span> Prompt Journey
        <span className="section-badge">{promptJourneyEvents.length} stages</span>
      </h3>
      
      <div className="journey-timeline">
        {promptJourneyEvents.map((event, idx) => {
          const journey = event.data.promptJourney;
          if (!journey) return null;
          
          const isExpanded = expandedStages.has(event.id);
          
          return (
            <div key={event.id} className="journey-stage">
              <div className="journey-connector">
                {idx > 0 && <div className="connector-line-up" />}
                <div 
                  className="stage-dot"
                  style={{ backgroundColor: getStageColor(journey.stage) }}
                >
                  {getStageIcon(journey.stage)}
                </div>
                {idx < promptJourneyEvents.length - 1 && <div className="connector-line-down" />}
              </div>
              
              <div className="journey-content">
                <div 
                  className="journey-header"
                  onClick={() => toggleStage(event.id)}
                >
                  <span className="stage-label" style={{ color: getStageColor(journey.stage) }}>
                    {journey.stageLabel}
                  </span>
                  <span className="stage-length">{journey.promptLength.toLocaleString()} chars</span>
                  {journey.truncatedAt && (
                    <span className="truncation-warning">⚠️ Truncated at {journey.truncatedAt.toLocaleString()}</span>
                  )}
                  {journey.filesAdded && journey.filesAdded.length > 0 && (
                    <span className="files-badge">+{journey.filesAdded.length} files</span>
                  )}
                  <span className="expand-toggle">{isExpanded ? '▼' : '▶'}</span>
                </div>
                
                {isExpanded && (
                  <div className="journey-details">
                    {journey.provider && (
                      <div className="detail-row">
                        <span className="detail-label">Provider:</span>
                        <span className="detail-value">{journey.provider}</span>
                      </div>
                    )}
                    {journey.engineName && (
                      <div className="detail-row">
                        <span className="detail-label">Engine:</span>
                        <span className="detail-value">{journey.engineName}</span>
                      </div>
                    )}
                    {journey.originalLength && journey.originalLength !== journey.promptLength && (
                      <div className="detail-row">
                        <span className="detail-label">Original Length:</span>
                        <span className="detail-value">{journey.originalLength.toLocaleString()} chars</span>
                      </div>
                    )}
                    {journey.truncationReason && (
                      <div className="detail-row warning">
                        <span className="detail-label">Truncation Reason:</span>
                        <span className="detail-value">{journey.truncationReason}</span>
                      </div>
                    )}
                    {journey.filesAdded && journey.filesAdded.length > 0 && (
                      <div className="detail-row">
                        <span className="detail-label">Files Added:</span>
                        <span className="detail-value">{journey.filesAdded.join(', ')}</span>
                      </div>
                    )}
                    {journey.maxTokens && (
                      <div className="detail-row">
                        <span className="detail-label">Max Tokens:</span>
                        <span className="detail-value">{journey.maxTokens.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {/* Full Prompt Text */}
                    <div className="prompt-text-container">
                      <div className="prompt-text-header">
                        <span>Full Prompt Text</span>
                        <button 
                          className="copy-btn"
                          onClick={() => navigator.clipboard.writeText(journey.fullPromptText)}
                        >
                          📋 Copy
                        </button>
                      </div>
                      <pre className="prompt-text">{journey.fullPromptText}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ===== Response Transformation Visualization =====
const ResponseTransformationVisualization: React.FC<{ events: DebugEvent[] }> = ({ events }) => {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  
  // Get response transformation events
  const responseEvents = events.filter(e => 
    e.type === 'RESPONSE_TRANSFORMATION' || e.type === 'TRUNCATION_DETECTED'
  );
  
  // Always show section with waiting state if no events
  if (responseEvents.length === 0) {
    return (
      <div className="response-transformation-section">
        <h3 className="debug-section-title">
          <span>📥</span> Response Journey
          <span className="section-badge">Waiting...</span>
        </h3>
        <div style={{ padding: '16px', color: '#888', textAlign: 'center', fontSize: '12px' }}>
          Response transformation events will appear here after AI generates a response
        </div>
      </div>
    );
  }
  
  const toggleStage = (id: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const getStageColor = (stage: string, isTruncation: boolean) => {
    if (isTruncation) return '#ef4444';
    switch (stage) {
      case 'chunk_received': return '#22d3ee';
      case 'accumulating': return '#8b5cf6';
      case 'finish_reason': return '#f59e0b';
      case 'complete': return '#22c55e';
      case 'truncated': return '#ef4444';
      default: return '#6b7280';
    }
  };
  
  const getStageIcon = (stage: string, isTruncation: boolean) => {
    if (isTruncation) return '⚠️';
    switch (stage) {
      case 'chunk_received': return '📦';
      case 'accumulating': return '📊';
      case 'finish_reason': return '🏁';
      case 'complete': return '✅';
      case 'truncated': return '⚠️';
      default: return '📍';
    }
  };
  
  return (
    <div className="response-transformation-section">
      <h3 className="debug-section-title">
        <span>📥</span> Response Transformation
        <span className="section-badge">{responseEvents.length} events</span>
      </h3>
      
      <div className="transformation-timeline">
        {responseEvents.map((event, idx) => {
          const isTruncation = event.type === 'TRUNCATION_DETECTED';
          const truncationData = event.data.truncation;
          const transformData = event.data.responseTransformation;
          
          if (isTruncation && !truncationData) return null;
          if (!isTruncation && !transformData) return null;
          
          const isExpanded = expandedStages.has(event.id);
          const stage = isTruncation ? 'truncated' : (transformData?.stage || 'unknown');
          
          return (
            <div key={event.id} className={`transformation-stage ${isTruncation ? 'truncation-warning' : ''}`}>
              <div className="transformation-connector">
                {idx > 0 && <div className="connector-line-up" />}
                <div 
                  className="stage-dot"
                  style={{ backgroundColor: getStageColor(stage, isTruncation) }}
                >
                  {getStageIcon(stage, isTruncation)}
                </div>
                {idx < responseEvents.length - 1 && <div className="connector-line-down" />}
              </div>
              
              <div className="transformation-content">
                <div 
                  className="transformation-header"
                  onClick={() => toggleStage(event.id)}
                >
                  <span className="stage-label" style={{ color: getStageColor(stage, isTruncation) }}>
                    {isTruncation ? '⚠️ TRUNCATION DETECTED' : transformData?.stageLabel}
                  </span>
                  {(truncationData?.responseLength || transformData?.responseLength) && (
                    <span className="response-length">{(truncationData?.responseLength || transformData?.responseLength || 0).toLocaleString()} chars</span>
                  )}
                  {(truncationData?.finishReason || transformData?.finishReason) && (
                    <span className={`finish-reason ${(truncationData?.finishReason || transformData?.finishReason) === 'length' ? 'warning' : ''}`}>
                      finish: {truncationData?.finishReason || transformData?.finishReason}
                    </span>
                  )}
                  {transformData?.totalChunks && (
                    <span className="chunk-count">{transformData.totalChunks} chunks</span>
                  )}
                  <span className="expand-toggle">{isExpanded ? '▼' : '▶'}</span>
                </div>
                
                {isExpanded && (
                  <div className="transformation-details">
                    {(truncationData?.provider || transformData?.provider) && (
                      <div className="detail-row">
                        <span className="detail-label">Provider:</span>
                        <span className="detail-value">{truncationData?.provider || transformData?.provider}</span>
                      </div>
                    )}
                    {(truncationData?.engineName || transformData?.engineName) && (
                      <div className="detail-row">
                        <span className="detail-label">Engine:</span>
                        <span className="detail-value">{truncationData?.engineName || transformData?.engineName}</span>
                      </div>
                    )}
                    {(truncationData?.tokensGenerated || transformData?.tokensGenerated) && (
                      <div className="detail-row">
                        <span className="detail-label">Tokens Generated:</span>
                        <span className="detail-value">{(truncationData?.tokensGenerated || transformData?.tokensGenerated || 0).toLocaleString()}</span>
                      </div>
                    )}
                    {(truncationData?.maxTokens || transformData?.maxTokens) && (
                      <div className="detail-row">
                        <span className="detail-label">Max Tokens:</span>
                        <span className="detail-value">{(truncationData?.maxTokens || transformData?.maxTokens || 0).toLocaleString()}</span>
                      </div>
                    )}
                    {(truncationData?.finishReason || transformData?.finishReason) && (
                      <div className={`detail-row ${(truncationData?.finishReason || transformData?.finishReason) === 'length' ? 'warning' : ''}`}>
                        <span className="detail-label">Finish Reason:</span>
                        <span className="detail-value">
                          {truncationData?.finishReason || transformData?.finishReason}
                          {(truncationData?.finishReason || transformData?.finishReason) === 'length' && ' ⚠️ Response was cut off!'}
                        </span>
                      </div>
                    )}
                    {truncationData?.explanation && (
                      <div className="detail-row warning">
                        <span className="detail-label">Explanation:</span>
                        <span className="detail-value">{truncationData.explanation}</span>
                      </div>
                    )}
                    
                    {/* Response Text */}
                    {transformData?.responseText && (
                      <div className="response-text-container">
                        <div className="response-text-header">
                          <span>Response Text</span>
                          <button 
                            className="copy-btn"
                            onClick={() => navigator.clipboard.writeText(transformData.responseText)}
                          >
                            📋 Copy
                          </button>
                        </div>
                        <pre className="response-text">{transformData.responseText}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ===== Helper Functions =====
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  } as any);
}

// ===== Main Component =====
export default function SuperDebugPanel({ isOpen, onClose, onOpenFullDebug }: SuperDebugPanelProps) {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [stats, setStats] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'all' | 'flow' | 'live' | 'tree' | 'errors' | 'chunks' | 'libs'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Subscribe to debug events - always sync with the bus
  useEffect(() => {
    // Sync function to get latest events from bus
    const syncEvents = () => {
      const allEvents = superDebugBus.getEvents();
      setEvents(allEvents);
      setStats(superDebugBus.getStats());
    };
    
    // Initial sync when panel opens
    if (isOpen) {
      syncEvents();
      console.log('[SuperDebugPanel] Initial sync - Events:', superDebugBus.getEvents().length);
    }
    
    // Subscribe to new events - always sync full state from bus
    const unsubscribe = superDebugBus.subscribe((event) => {
      // Always get fresh events from bus to ensure consistency
      syncEvents();
    });
    
    // Also set up an interval to periodically sync (in case events are missed)
    const syncInterval = setInterval(() => {
      if (isOpen) {
        syncEvents();
      }
    }, 1000);
    
    return () => {
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, [isOpen]);
  
  // Auto-scroll to bottom - disabled for Activity tab
  useEffect(() => {
    if (autoScroll && activeTab !== 'tree' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll, activeTab]);
  
  // Handle clear
  const handleClear = useCallback(() => {
    superDebugBus.clear();
    setEvents([]);
    setStats({});
  }, []);
  
  // Handle export
  const handleExport = useCallback(() => {
    const log = superDebugBus.exportLog();
    const blob = new Blob([log], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <div className="super-debug-panel">
        {/* Header */}
        <div className="debug-header">
          <div className="debug-title">
            <span>🔧</span> SUPER DEBUG MODE
          </div>
          <button className="debug-close" onClick={onClose}>×</button>
        </div>
        
        {/* Quick Stats Bar */}
        <div className="debug-stats-bar">
          <div className="quick-stat">
            <span className="quick-stat-value">{events.length}</span>
            <span className="quick-stat-label">Events</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">{events.filter(e => e.type === 'LIBRARY_TRIGGERED').length}</span>
            <span className="quick-stat-label">Libraries</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">{stats.totalChunks || 0}</span>
            <span className="quick-stat-label">Chunks</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">{stats.totalErrors || 0}</span>
            <span className="quick-stat-label">Errors</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">{((stats.elapsedTime || 0) / 1000).toFixed(1)}s</span>
            <span className="quick-stat-label">Elapsed</span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="debug-tabs">
          <button 
            className={`debug-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button 
            className={`debug-tab ${activeTab === 'flow' ? 'active' : ''}`}
            onClick={() => setActiveTab('flow')}
          >
            🌳 Flow
          </button>
          <button 
            className={`debug-tab ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            🔴 Live
          </button>
          <button 
            className={`debug-tab ${activeTab === 'tree' ? 'active' : ''}`}
            onClick={() => setActiveTab('tree')}
          >
            🌲 Activity
          </button>
          <button 
            className={`debug-tab ${activeTab === 'chunks' ? 'active' : ''}`}
            onClick={() => setActiveTab('chunks')}
          >
            Chunks
          </button>
          <button 
            className={`debug-tab ${activeTab === 'libs' ? 'active' : ''}`}
            onClick={() => setActiveTab('libs')}
          >
            Libraries
          </button>
          <button 
            className={`debug-tab ${activeTab === 'errors' ? 'active' : ''}`}
            onClick={() => setActiveTab('errors')}
          >
            Errors
          </button>
        </div>
        
        {/* Auto-scroll toggle - hidden for Activity tab */}
        {activeTab !== 'tree' && (
          <div className="auto-scroll-toggle">
            <input 
              type="checkbox" 
              id="autoScroll"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <label htmlFor="autoScroll">Auto-scroll to latest</label>
          </div>
        )}
        
        {/* Content */}
        <div className="debug-content" ref={scrollRef}>
          {activeTab === 'all' && (
            <>
              <ExecutionPipeline events={events} />
              <ChunkMonitor events={events} stats={stats} />
              <FunctionExecution events={events} />
              <LibraryTriggers events={events} stats={stats} />
              <FileHandoffs events={events} stats={stats} />
              <MarkdownProcessing events={events} />
              <ErrorArchitecture events={events} />
              <StateUpdates events={events} />
              <DOMInjection events={events} />
            </>
          )}
          
          {activeTab === 'flow' && (
            <ExecutionFlowTree events={events} />
          )}
          
          {activeTab === 'live' && (
            <LiveCodeFlow events={events} />
          )}
          
          {activeTab === 'tree' && (
            <FlowTreeVisualization events={events} />
          )}
          
          {activeTab === 'chunks' && (
            <ChunkMonitor events={events} stats={stats} />
          )}
          
          {activeTab === 'libs' && (
            <>
              <LibraryTriggers events={events} stats={stats} />
              <FileHandoffs events={events} stats={stats} />
            </>
          )}
          
          {activeTab === 'errors' && (
            <ErrorArchitecture events={events} />
          )}
        </div>
        
        {/* Footer */}
        <div className="debug-footer">
          <button className="debug-btn secondary" onClick={handleClear}>
            🗑️ Clear
          </button>
          <button className="debug-btn secondary" onClick={handleExport}>
            📤 Export
          </button>
          {onOpenFullDebug && (
            <button className="debug-btn primary" onClick={onOpenFullDebug}>
              📊 Full Console
            </button>
          )}
        </div>
      </div>
  );
}

export { SuperDebugPanel };
