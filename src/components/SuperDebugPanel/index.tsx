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
import { superDebugBus, DebugEvent, DebugEventType, EventSeverity } from '../../lib/super-debug-bus';
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
  
  // Build the execution flow tree - showing ALL important steps
  const buildFlowTree = () => {
    type FlowStep = {
      id: string;
      step: number;
      type: 'function' | 'library' | 'file' | 'state' | 'chunk' | 'error' | 'dom' | 'pipeline' | 'stream';
      title: string;
      subtitle: string;
      file: string;
      line?: number;
      status: 'running' | 'completed' | 'error';
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
      'stream': { bg: 'rgba(34, 211, 238, 0.1)', border: '#22d3ee', icon: '📡' }
    };
    return styles[type] || styles['function'];
  };

  return (
    <div className="debug-section flow-tree-section">
      <h3 className="debug-section-title">
        <span>🌳</span> Execution Flow Tree
      </h3>
      
      {flowSteps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌳</div>
          <div>No execution flow yet</div>
          <div className="empty-hint">Click "Run Live" to see the complete execution tree</div>
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
                        {step.status === 'running' ? '🔄' : step.status === 'error' ? '❌' : '✅'}
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
  const [activeTab, setActiveTab] = useState<'all' | 'flow' | 'errors' | 'chunks' | 'libs'>('all');
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
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);
  
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
        
        {/* Auto-scroll toggle */}
        <div className="auto-scroll-toggle">
          <input 
            type="checkbox" 
            id="autoScroll"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          <label htmlFor="autoScroll">Auto-scroll to latest</label>
        </div>
        
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
