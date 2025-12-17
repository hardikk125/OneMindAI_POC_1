import { useState, useEffect } from 'react';
import { codeGuardian, type ChangeAnalysis, type DependencyGraph } from './lib/client';
import { DependencyDiagram } from './components/DependencyDiagram';
import { CostTracker } from './components/CostTracker';
// WireframeViewer replaced by StepWireframe for visual button layout
import { PageAnalysisViewer } from './components/PageAnalysisViewer';
import { StepWireframe } from './components/StepWireframe';

type Tab = 'live' | 'diagram' | 'graph' | 'wireframe' | 'analysis' | 'costs' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [changes, setChanges] = useState<ChangeAnalysis[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<ChangeAnalysis | null>(null);
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [stats, setStats] = useState({ files: 0, high: 0, medium: 0, low: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Initial connection
    codeGuardian.checkHealth()
      .then(data => {
        setIsConnected(true);
        setStats(s => ({ ...s, files: data.dependencyCount }));
      })
      .catch(() => setIsConnected(false));

    // Load graph
    codeGuardian.getDependencies()
      .then(setGraph)
      .catch(() => {});

    // Load history
    codeGuardian.getHistory(50)
      .then(setChanges)
      .catch(() => {});

    // Subscribe to events
    const unsubs = [
      codeGuardian.on('connected', () => setIsConnected(true)),
      codeGuardian.on('disconnected', () => setIsConnected(false)),
      codeGuardian.on('analyzing', () => {
        setIsAnalyzing(true);
        setCurrentAnalysis(null);
      }),
      codeGuardian.on('analysis_complete', (rawData) => {
        const data = rawData as ChangeAnalysis;
        setIsAnalyzing(false);
        setCurrentAnalysis(data);
        setChanges(prev => [data, ...prev].slice(0, 100));
        setStats(s => ({
          ...s,
          high: s.high + (data.riskScore >= 7 ? 1 : 0),
          medium: s.medium + (data.riskScore >= 4 && data.riskScore < 7 ? 1 : 0),
          low: s.low + (data.riskScore < 4 ? 1 : 0),
        }));
      }),
      codeGuardian.on('graph_built', (rawData) => {
        const data = rawData as { fileCount: number };
        setStats(s => ({ ...s, files: data.fileCount }));
        codeGuardian.getDependencies().then(setGraph);
      }),
    ];

    codeGuardian.connect().catch(() => {});

    return () => unsubs.forEach(fn => fn());
  }, []);

  const getRiskColor = (score: number) => {
    if (score >= 7) return 'text-red-400';
    if (score >= 4) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getRiskBg = (score: number) => {
    if (score >= 7) return 'bg-red-500/10 border-red-500/20';
    if (score >= 4) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-emerald-500/10 border-emerald-500/20';
  };

  const filteredGraph = graph && searchQuery
    ? Object.fromEntries(
        Object.entries(graph).filter(([path]) => 
          path.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : graph;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <h1 className="text-xl font-bold">Code Guardian</h1>
                <p className="text-xs text-slate-500">LLM-Powered Impact Analysis</p>
              </div>
              <span className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-slate-400">
                <span className="font-mono">{stats.files}</span> files
              </div>
              <div className="flex items-center gap-4">
                <span className="text-red-400">🔴 {stats.high}</span>
                <span className="text-amber-400">🟡 {stats.medium}</span>
                <span className="text-emerald-400">🟢 {stats.low}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {(['live', 'diagram', 'graph', 'wireframe', 'analysis', 'costs', 'history'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {tab === 'live' && '⚡ Live'}
                {tab === 'diagram' && '🗺️ Impact Diagram'}
                {tab === 'graph' && '📊 File List'}
                {tab === 'wireframe' && '📐 UI Wireframe'}
                {tab === 'analysis' && '📋 Page Analysis'}
                {tab === 'costs' && '💰 Costs'}
                {tab === 'history' && '📜 History'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Live Tab */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Analysis */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <h2 className="font-semibold">Current Analysis</h2>
                {isAnalyzing && (
                  <span className="flex items-center gap-2 text-blue-400 text-sm">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing...
                  </span>
                )}
              </div>
              
              <div className="p-4">
                {currentAnalysis ? (
                  <div className={`p-4 rounded-lg border ${getRiskBg(currentAnalysis.riskScore)}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm text-slate-400">{currentAnalysis.file}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(currentAnalysis.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className={`text-3xl font-bold font-mono ${getRiskColor(currentAnalysis.riskScore)}`}>
                        {currentAnalysis.riskScore}/10
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 mb-4">{currentAnalysis.analysis.summary}</p>

                    {/* Diff Stats */}
                    {(currentAnalysis as any).diff && (
                      <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                        <h4 className="text-xs font-semibold text-slate-400 mb-2">Changes Made</h4>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-emerald-400">+{(currentAnalysis as any).diff.addedLines} added</span>
                          <span className="text-red-400">-{(currentAnalysis as any).diff.removedLines} removed</span>
                        </div>
                        {(currentAnalysis as any).diff.addedSample?.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-slate-500 mb-1">Added:</div>
                            <div className="font-mono text-xs text-emerald-400/80 bg-emerald-500/10 p-2 rounded max-h-20 overflow-y-auto">
                              {(currentAnalysis as any).diff.addedSample.slice(0, 3).map((line: string, i: number) => (
                                <div key={i} className="truncate">+ {line.trim()}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(currentAnalysis as any).diff.removedSample?.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-slate-500 mb-1">Removed:</div>
                            <div className="font-mono text-xs text-red-400/80 bg-red-500/10 p-2 rounded max-h-20 overflow-y-auto">
                              {(currentAnalysis as any).diff.removedSample.slice(0, 3).map((line: string, i: number) => (
                                <div key={i} className="truncate">- {line.trim()}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* LLM Provider */}
                    {currentAnalysis.analysis.llmProvider && (
                      <div className="mb-4 text-xs">
                        <span className="text-slate-500">Analyzed by: </span>
                        <span className={currentAnalysis.analysis.llmProvider === 'openai' ? 'text-emerald-400' : 'text-amber-400'}>
                          {currentAnalysis.analysis.llmProvider === 'openai' ? '🤖 GPT-4' : 
                           currentAnalysis.analysis.llmProvider === 'anthropic' ? '🧠 Claude' :
                           currentAnalysis.analysis.llmProvider === 'none (basic analysis)' ? '📊 Basic Analysis' :
                           currentAnalysis.analysis.llmProvider}
                        </span>
                      </div>
                    )}

                    {/* Issues */}
                    {currentAnalysis.analysis.potentialIssues.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-slate-400 mb-2">Issues Found</h4>
                        <div className="space-y-2">
                          {currentAnalysis.analysis.potentialIssues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span className={
                                issue.severity === 'high' ? 'text-red-400' :
                                issue.severity === 'medium' ? 'text-amber-400' : 'text-slate-400'
                              }>
                                {issue.severity === 'high' ? '⚠️' : issue.severity === 'medium' ? '⚡' : '💡'}
                              </span>
                              <div>
                                <p className="text-slate-300">{issue.description}</p>
                                {issue.suggestion && (
                                  <p className="text-xs text-slate-500 mt-1">💡 {issue.suggestion}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Affected */}
                    {currentAnalysis.affected.direct.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-slate-400 mb-2">
                          Affected Files ({currentAnalysis.affected.direct.length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {currentAnalysis.affected.direct.slice(0, 8).map((file, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                              {file.split('/').pop()}
                            </span>
                          ))}
                          {currentAnalysis.affected.direct.length > 8 && (
                            <span className="px-2 py-1 text-xs text-slate-500">
                              +{currentAnalysis.affected.direct.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {currentAnalysis.analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 mb-2">Recommendations</h4>
                        <ul className="space-y-1">
                          {currentAnalysis.analysis.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                              <span className="text-emerald-400">→</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    {isConnected ? (
                      <>
                        <p>Watching for file changes...</p>
                        <p className="text-xs mt-2">Edit a file in the codebase to see analysis</p>
                      </>
                    ) : (
                      <>
                        <p>Not connected to Code Guardian server</p>
                        <p className="text-xs mt-2">Run: npm run guardian</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Changes */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h2 className="font-semibold">Recent Changes</h2>
              </div>
              <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
                {changes.slice(0, 20).map((change) => (
                  <div
                    key={change.id}
                    className="px-4 py-3 hover:bg-slate-800/50 cursor-pointer transition-colors"
                    onClick={() => setCurrentAnalysis(change)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{change.file}</div>
                        <div className="text-xs text-slate-500 mt-1 truncate">
                          {change.analysis.summary}
                        </div>
                      </div>
                      <div className={`ml-4 font-mono font-bold ${getRiskColor(change.riskScore)}`}>
                        {change.riskScore}
                      </div>
                    </div>
                  </div>
                ))}
                {changes.length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-500 text-sm">
                    No changes recorded yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Diagram Tab */}
        {activeTab === 'diagram' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold">Impact Diagram</h2>
              <div className="text-xs text-slate-400">
                {currentAnalysis ? (
                  <span>Showing impact of: <span className="text-white">{currentAnalysis.file}</span></span>
                ) : (
                  <span>Make a change to see impact visualization</span>
                )}
              </div>
            </div>
            <div className="p-4">
              <DependencyDiagram 
                graph={graph} 
                currentAnalysis={currentAnalysis}
                onNodeClick={(nodeId) => {
                  console.log('Node clicked:', nodeId);
                }}
              />
            </div>
          </div>
        )}

        {/* Graph Tab */}
        {activeTab === 'graph' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold">File List</h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:border-slate-600"
                />
                <button
                  onClick={() => codeGuardian.buildGraph()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors"
                >
                  🔄 Rebuild
                </button>
              </div>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto">
              {filteredGraph && Object.entries(filteredGraph).map(([path, data]) => (
                <div key={path} className="px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-slate-300">{path}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {data.components?.length > 0 && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                            {data.components.length} components
                          </span>
                        )}
                        {data.hooks?.length > 0 && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {data.hooks.length} hooks
                          </span>
                        )}
                        {data.functions?.length > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                            {data.functions.length} functions
                          </span>
                        )}
                        {data.apiCalls?.length > 0 && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                            {data.apiCalls.length} API calls
                          </span>
                        )}
                        {data.supabaseTables?.length > 0 && (
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                            {data.supabaseTables.length} tables
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500 ml-4">
                      <div>{data.dependents?.length || 0} dependents</div>
                      <div>{data.dependencies?.length || 0} imports</div>
                    </div>
                  </div>
                </div>
              ))}
              {!graph && (
                <div className="px-4 py-12 text-center text-slate-500">
                  Loading dependency graph...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wireframe Tab - Visual UI Layout */}
        {activeTab === 'wireframe' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <StepWireframe />
          </div>
        )}

        {/* Page Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <PageAnalysisViewer />
          </div>
        )}

        {/* Costs Tab */}
        {activeTab === 'costs' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden p-6">
            <CostTracker />
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="font-semibold">Change History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 text-xs text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">File</th>
                    <th className="px-4 py-2 text-left">Summary</th>
                    <th className="px-4 py-2 text-center">Risk</th>
                    <th className="px-4 py-2 text-center">Issues</th>
                    <th className="px-4 py-2 text-center">Affected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {changes.map((change) => (
                    <tr
                      key={change.id}
                      className="hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => {
                        setCurrentAnalysis(change);
                        setActiveTab('live');
                      }}
                    >
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(change.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {change.file.split('/').pop()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                        {change.analysis.summary}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono font-bold ${getRiskColor(change.riskScore)}`}>
                          {change.riskScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-400">
                        {change.analysis.potentialIssues.length}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-400">
                        {change.affected.direct.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {changes.length === 0 && (
                <div className="px-4 py-12 text-center text-slate-500">
                  No changes recorded yet
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-slate-500">
          Code Guardian • Server: localhost:4000 • {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </footer>
    </div>
  );
}
