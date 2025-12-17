/**
 * Page Analysis Viewer Component
 * 
 * Displays page-by-page code examination documents with:
 * - Live change watching via WebSocket
 * - Step navigation
 * - Functional button tracking
 * - Hardcoded value highlighting
 * - API call visualization
 * - Process flow diagrams
 */

import React, { useState, useEffect, useCallback } from 'react';
import { HelpIcon } from './ui/help-icon';

interface AnalysisStats {
  functionalButtons: number;
  hardcodedValues: number;
  apiCalls: number;
}

interface AnalysisFile {
  id: string;
  filename: string;
  filePath: string;
  title: string;
  steps: number[];
  sections: string[];
  stats: AnalysisStats;
  size: number;
  lastModified: string;
  content: string;
}

interface PageAnalysisData {
  count: number;
  files: AnalysisFile[];
  lastUpdated: string;
}

interface ChangeNotification {
  file: string;
  isAnalysisDoc: boolean;
  isSourceFile: boolean;
  timestamp: string;
  message: string;
}

const API_BASE = 'http://localhost:4000';
const WS_URL = 'ws://localhost:4000';

export function PageAnalysisViewer() {
  const [analysisData, setAnalysisData] = useState<PageAnalysisData | null>(null);
  const [selectedFile, setSelectedFile] = useState<AnalysisFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ChangeNotification[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'content'>('cards');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch analysis data
  const fetchAnalysisData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/page-analysis`);
      if (!response.ok) throw new Error('Failed to fetch analysis data');
      const data = await response.json();
      setAnalysisData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket connection for live updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log('[PageAnalysis] WebSocket connected');
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'page_analysis_update') {
              const notification: ChangeNotification = message.data;
              setNotifications(prev => [notification, ...prev.slice(0, 9)]);
              
              // Refresh data when analysis doc changes
              if (notification.isAnalysisDoc) {
                fetchAnalysisData();
              }
            }
          } catch (err) {
            console.error('[PageAnalysis] Failed to parse message:', err);
          }
        };

        ws.onclose = () => {
          console.log('[PageAnalysis] WebSocket disconnected');
          setWsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.error('[PageAnalysis] WebSocket error:', err);
        };
      } catch (err) {
        console.error('[PageAnalysis] Failed to connect:', err);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchAnalysisData]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalysisData();
  }, [fetchAnalysisData]);

  // Filter files by search query
  const filteredFiles = analysisData?.files.filter(file => 
    file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.sections.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  // Render markdown content with syntax highlighting
  const renderMarkdown = (content: string) => {
    // Simple markdown rendering
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';

    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={index} className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm my-4">
              <code className={`language-${codeLanguage}`}>{codeContent}</code>
            </pre>
          );
          codeContent = '';
          codeLanguage = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim() || 'text';
        }
        return;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        return;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-3xl font-bold text-slate-900 mt-8 mb-4 border-b-2 border-purple-500 pb-2">
            {line.slice(2)}
          </h1>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-2xl font-semibold text-slate-800 mt-6 mb-3">
            {line.slice(3)}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-xl font-medium text-slate-700 mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
        return;
      }

      // Tables
      if (line.startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim());
        const isHeader = lines[index + 1]?.includes('---');
        elements.push(
          <div key={index} className={`grid grid-cols-${cells.length} gap-1 text-sm ${isHeader ? 'font-semibold bg-slate-100' : 'bg-white'} border-b border-slate-200`}>
            {cells.map((cell, i) => (
              <div key={i} className="px-3 py-2 truncate" dangerouslySetInnerHTML={{ 
                __html: cell.trim()
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 rounded text-purple-600">$1</code>')
              }} />
            ))}
          </div>
        );
        return;
      }

      // Skip table separator lines
      if (line.match(/^\|[\s-|]+\|$/)) return;

      // Horizontal rule
      if (line.match(/^---+$/)) {
        elements.push(<hr key={index} className="my-6 border-slate-300" />);
        return;
      }

      // Bold, code, and links
      if (line.trim()) {
        const processed = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 rounded text-purple-600 text-sm">$1</code>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>');
        
        elements.push(
          <p key={index} className="text-slate-600 my-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />
        );
      }
    });

    return elements;
  };

  if (loading && !analysisData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">Error Loading Analysis</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <button 
          onClick={fetchAnalysisData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Help Icon */}
      <HelpIcon
        title="Code Guardian - Page Analysis"
        description="Comprehensive page-by-page code examination tool. View detailed analysis documents, track functional buttons, identify hardcoded values, and visualize API calls."
        features={[
          'Page-by-page code examination documents',
          'Functional button tracking and analysis',
          'Hardcoded value detection and highlighting',
          'API call visualization and documentation',
          'Process flow diagrams',
          'Live change watching via WebSocket',
          'Card and detail view modes',
        ]}
        tips={[
          'Use Cards view for quick overview of all analysis files',
          'Switch to Detail view to read full analysis content',
          'Watch for the Live indicator to see real-time updates',
          'Click on a file to see its detailed analysis',
        ]}
        position="top-right"
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Page Analysis Viewer</h2>
          <p className="text-slate-600 mt-1">
            {analysisData?.count || 0} analysis documents • Last updated: {analysisData?.lastUpdated ? new Date(analysisData.lastUpdated).toLocaleString() : 'N/A'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            {wsConnected ? 'Live' : 'Disconnected'}
          </div>
          
          {/* View Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === 'cards' ? 'bg-white shadow text-purple-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('content')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === 'content' ? 'bg-white shadow text-purple-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Content
            </button>
          </div>
          
          {/* Refresh */}
          <button
            onClick={fetchAnalysisData}
            className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search analysis documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 pl-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-blue-800">Recent Changes</h4>
            <button 
              onClick={() => setNotifications([])}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {notifications.map((n, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${n.isAnalysisDoc ? 'bg-purple-500' : 'bg-orange-500'}`}></span>
                <span className="text-blue-700">{n.message}</span>
                <span className="text-blue-400 text-xs">{new Date(n.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'cards' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFiles.map(file => (
            <div 
              key={file.id}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-purple-300 transition cursor-pointer"
              onClick={() => {
                setSelectedFile(file);
                setViewMode('content');
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{file.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Steps: {file.steps.join(' & ')}
                  </p>
                </div>
                <div className="flex gap-1">
                  {file.steps.map(step => (
                    <span key={step} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                      Step {step}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{file.stats.functionalButtons}</div>
                  <div className="text-xs text-green-700">Buttons</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{file.stats.hardcodedValues}</div>
                  <div className="text-xs text-orange-700">Hardcoded</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{file.stats.apiCalls}</div>
                  <div className="text-xs text-blue-700">API Calls</div>
                </div>
              </div>

              {/* Sections Preview */}
              <div className="flex flex-wrap gap-1">
                {file.sections.slice(0, 4).map((section, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                    {section.length > 30 ? section.slice(0, 30) + '...' : section}
                  </span>
                ))}
                {file.sections.length > 4 && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                    +{file.sections.length - 4} more
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{(file.size / 1024).toFixed(1)} KB</span>
                <span>Updated: {new Date(file.lastModified).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Content View */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* File Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {filteredFiles.map(file => (
              <button
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                  selectedFile?.id === file.id
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Steps {file.steps.join(' & ')}
              </button>
            ))}
          </div>

          {/* Content */}
          {selectedFile ? (
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {renderMarkdown(selectedFile.content)}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Select an analysis document to view</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PageAnalysisViewer;
