/**
 * WIREFRAME VIEWER COMPONENT
 * ===========================
 * Interactive UI wireframe visualization with page-by-page and component views
 */

import { useState, useEffect } from 'react';
import type {
  WireframeData,
  ComponentDefinition,
  PageDefinition,
  UIElement,
  ClickHandler,
  WireframeChange,
} from '../lib/wireframe-types';
import { wireframeClient } from '../lib/wireframe-client';

// =============================================================================
// TYPES
// =============================================================================

type ViewMode = 'pages' | 'components' | 'tree';

interface SelectedItem {
  type: 'page' | 'component' | 'element';
  id: string;
  data: PageDefinition | ComponentDefinition | UIElement;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function WireframeViewer() {
  const [wireframe, setWireframe] = useState<WireframeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('pages');
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentChanges, setRecentChanges] = useState<WireframeChange[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Load wireframe data
  useEffect(() => {
    loadWireframe();

    // Subscribe to live updates
    const unsubs = [
      wireframeClient.on('connected', () => setIsConnected(true)),
      wireframeClient.on('disconnected', () => setIsConnected(false)),
      wireframeClient.on('wireframe_updated', (data) => {
        const { wireframe: newWireframe, change } = data as { 
          wireframe: WireframeData; 
          change: WireframeChange 
        };
        setWireframe(newWireframe);
        setRecentChanges(prev => [change, ...prev].slice(0, 10));
      }),
    ];

    wireframeClient.connect().catch(() => {});

    return () => unsubs.forEach(fn => fn());
  }, []);

  const loadWireframe = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await wireframeClient.getWireframeData();
      setWireframe(data);
    } catch (err) {
      setError('Failed to load wireframe data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter components based on search
  const filteredComponents = wireframe?.components.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.filePath.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredPages = wireframe?.pages.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.route.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Loading wireframe data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <span className="text-4xl mb-4 block">⚠️</span>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadWireframe}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>📐</span>
            UI Wireframe
          </h2>
          <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex bg-slate-800 rounded-lg p-1">
          {(['pages', 'components', 'tree'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${
                viewMode === mode
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 px-3 py-2 pl-9 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-violet-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        </div>
      </div>

      {/* Stats Bar */}
      {wireframe && (
        <div className="flex gap-6 px-4 py-3 bg-slate-900/50 border-b border-slate-800 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Pages:</span>
            <span className="text-violet-400 font-medium">{wireframe.stats.totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Components:</span>
            <span className="text-blue-400 font-medium">{wireframe.stats.totalComponents}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">UI Elements:</span>
            <span className="text-emerald-400 font-medium">{wireframe.stats.totalElements}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Click Handlers:</span>
            <span className="text-amber-400 font-medium">{wireframe.stats.totalClickHandlers}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">State Vars:</span>
            <span className="text-pink-400 font-medium">{wireframe.stats.totalStateVariables}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - List */}
        <div className="w-80 border-r border-slate-800 overflow-y-auto">
          {viewMode === 'pages' && (
            <PagesList
              pages={filteredPages}
              selectedId={selectedItem?.type === 'page' ? selectedItem.id : null}
              onSelect={(page) => setSelectedItem({ type: 'page', id: page.id, data: page })}
            />
          )}
          {viewMode === 'components' && (
            <ComponentsList
              components={filteredComponents}
              selectedId={selectedItem?.type === 'component' ? selectedItem.id : null}
              onSelect={(comp) => setSelectedItem({ type: 'component', id: comp.id, data: comp })}
            />
          )}
          {viewMode === 'tree' && wireframe && (
            <ComponentTree
              components={wireframe.components}
              onSelect={(comp) => setSelectedItem({ type: 'component', id: comp.id, data: comp })}
            />
          )}
        </div>

        {/* Center Panel - Wireframe View */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedItem ? (
            selectedItem.type === 'page' ? (
              <PageWireframe
                page={selectedItem.data as PageDefinition}
                components={wireframe?.components || []}
                onComponentClick={(comp) => setSelectedItem({ type: 'component', id: comp.id, data: comp })}
              />
            ) : selectedItem.type === 'component' ? (
              <ComponentWireframe
                component={selectedItem.data as ComponentDefinition}
                onElementClick={(el) => setSelectedItem({ type: 'element', id: el.id, data: el })}
              />
            ) : (
              <ElementDetail element={selectedItem.data as UIElement} />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <span className="text-6xl mb-4 block opacity-50">📐</span>
                <p>Select a page or component to view its wireframe</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Details & Changes */}
        <div className="w-80 border-l border-slate-800 overflow-y-auto">
          {/* Recent Changes */}
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>🔄</span> Recent Changes
            </h3>
            {recentChanges.length > 0 ? (
              <div className="space-y-2">
                {recentChanges.map((change, i) => (
                  <div key={i} className="text-xs p-2 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        change.type === 'added' ? 'bg-emerald-500/20 text-emerald-400' :
                        change.type === 'modified' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {change.type.toUpperCase()}
                      </span>
                      <span className="text-slate-300">{change.componentName}</span>
                    </div>
                    {change.changes.map((c, j) => (
                      <p key={j} className="text-slate-500">{c.description}</p>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600">No recent changes</p>
            )}
          </div>

          {/* Selected Item Details */}
          {selectedItem && (
            <div className="p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <span>📋</span> Details
              </h3>
              <ItemDetails item={selectedItem} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function PagesList({ 
  pages, 
  selectedId, 
  onSelect 
}: { 
  pages: PageDefinition[]; 
  selectedId: string | null;
  onSelect: (page: PageDefinition) => void;
}) {
  return (
    <div className="p-2">
      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-2">
        Pages ({pages.length})
      </h3>
      <div className="space-y-1">
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => onSelect(page)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              selectedId === page.id
                ? 'bg-violet-600/20 border border-violet-500/30'
                : 'hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>📄</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{page.name}</p>
                <p className="text-xs text-slate-500 truncate">{page.route}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ComponentsList({ 
  components, 
  selectedId, 
  onSelect 
}: { 
  components: ComponentDefinition[]; 
  selectedId: string | null;
  onSelect: (comp: ComponentDefinition) => void;
}) {
  const grouped = components.reduce((acc, comp) => {
    if (!acc[comp.type]) acc[comp.type] = [];
    acc[comp.type].push(comp);
    return acc;
  }, {} as Record<string, ComponentDefinition[]>);

  const typeIcons: Record<string, string> = {
    page: '📄',
    component: '🧩',
    layout: '📐',
    modal: '💬',
    form: '📝',
    widget: '🔧',
  };

  return (
    <div className="p-2">
      {Object.entries(grouped).map(([type, comps]) => (
        <div key={type} className="mb-4">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-2 flex items-center gap-2">
            <span>{typeIcons[type] || '📦'}</span>
            {type}s ({comps.length})
          </h3>
          <div className="space-y-1">
            {comps.map(comp => (
              <button
                key={comp.id}
                onClick={() => onSelect(comp)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedId === comp.id
                    ? 'bg-violet-600/20 border border-violet-500/30'
                    : 'hover:bg-slate-800'
                }`}
              >
                <p className="font-medium truncate">{comp.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {comp.elements.length} elements · {comp.state.length} state
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ComponentTree({ 
  components, 
  onSelect 
}: { 
  components: ComponentDefinition[];
  onSelect: (comp: ComponentDefinition) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build tree structure
  const rootComponents = components.filter(c => c.type === 'page' || c.type === 'layout');

  const renderNode = (comp: ComponentDefinition, depth: number = 0) => {
    const hasChildren = comp.childComponents.length > 0;
    const isExpanded = expanded.has(comp.id);

    return (
      <div key={comp.id} style={{ marginLeft: depth * 16 }}>
        <button
          onClick={() => {
            if (hasChildren) toggleExpand(comp.id);
            onSelect(comp);
          }}
          className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 flex items-center gap-2 text-sm"
        >
          {hasChildren && (
            <span className="text-slate-500 w-4">{isExpanded ? '▼' : '▶'}</span>
          )}
          {!hasChildren && <span className="w-4" />}
          <span>{comp.name}</span>
          <span className="text-xs text-slate-600">({comp.elements.length})</span>
        </button>
        {isExpanded && comp.childComponents.map(childName => {
          const child = components.find(c => c.name === childName);
          if (child) return renderNode(child, depth + 1);
          return (
            <div key={childName} style={{ marginLeft: (depth + 1) * 16 }} className="px-2 py-1 text-sm text-slate-500">
              <span className="w-4 inline-block" />
              {childName} (external)
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-2">
      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-2">
        Component Tree
      </h3>
      {rootComponents.map(comp => renderNode(comp))}
    </div>
  );
}

function PageWireframe({ 
  page, 
  components,
  onComponentClick 
}: { 
  page: PageDefinition;
  components: ComponentDefinition[];
  onComponentClick: (comp: ComponentDefinition) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📄</span>
        <div>
          <h2 className="text-xl font-bold">{page.name}</h2>
          <p className="text-slate-500">{page.route}</p>
        </div>
      </div>

      {/* Page Wireframe Box */}
      <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 min-h-[400px]">
        <div className="text-xs text-slate-500 mb-4">Page Layout</div>
        
        {/* Components in page */}
        <div className="space-y-3">
          {page.components.map((ref, i) => {
            const comp = components.find(c => c.name === ref.name);
            return (
              <button
                key={i}
                onClick={() => comp && onComponentClick(comp)}
                className="w-full p-3 border border-slate-700 rounded-lg hover:border-violet-500 hover:bg-violet-500/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span>🧩</span>
                  <span className="font-medium">{ref.name}</span>
                  {comp && (
                    <span className="text-xs text-slate-500">
                      ({comp.elements.length} elements)
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Links */}
        {page.links.length > 0 && (
          <div className="mt-6">
            <div className="text-xs text-slate-500 mb-2">Navigation Links</div>
            <div className="flex flex-wrap gap-2">
              {page.links.map((link, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400"
                >
                  {link.label || link.to} → {link.to}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ComponentWireframe({ 
  component, 
  onElementClick 
}: { 
  component: ComponentDefinition;
  onElementClick: (el: UIElement) => void;
}) {
  const elementIcons: Record<string, string> = {
    button: '🔘',
    input: '📝',
    link: '🔗',
    form: '📋',
    modal: '💬',
    dropdown: '📂',
    tab: '📑',
    card: '🃏',
    list: '📃',
    table: '📊',
    icon: '🎨',
    text: '📄',
    image: '🖼️',
    container: '📦',
    custom: '⚙️',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🧩</span>
        <div>
          <h2 className="text-xl font-bold">{component.name}</h2>
          <p className="text-slate-500 text-sm">{component.filePath}</p>
        </div>
      </div>

      {/* Component Wireframe Box */}
      <div className="border-2 border-dashed border-slate-700 rounded-xl p-4">
        <div className="text-xs text-slate-500 mb-4">Component Structure</div>
        
        {/* State Variables */}
        {component.state.length > 0 && (
          <div className="mb-4 p-3 bg-pink-500/5 border border-pink-500/20 rounded-lg">
            <div className="text-xs text-pink-400 mb-2 font-medium">State Variables</div>
            <div className="flex flex-wrap gap-2">
              {component.state.map((s, i) => (
                <span key={i} className="px-2 py-1 bg-pink-500/10 rounded text-xs">
                  {s.name}: {s.type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* UI Elements Grid */}
        <div className="grid grid-cols-2 gap-3">
          {component.elements.map((el, i) => (
            <button
              key={i}
              onClick={() => onElementClick(el)}
              className={`p-3 border rounded-lg text-left transition-all hover:scale-[1.02] ${
                el.onClick || el.onSubmit || el.onChange
                  ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{elementIcons[el.type] || '📦'}</span>
                <span className="font-medium text-sm">{el.type}</span>
                {(el.onClick || el.onSubmit || el.onChange) && (
                  <span className="text-amber-400 text-xs">⚡ clickable</span>
                )}
              </div>
              {el.label && (
                <p className="text-xs text-slate-400 truncate">{el.label}</p>
              )}
              {el.onClick && (
                <p className="text-xs text-amber-400/70 mt-1">
                  → {el.onClick.name}()
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Child Components */}
        {component.childComponents.length > 0 && (
          <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <div className="text-xs text-blue-400 mb-2 font-medium">Child Components</div>
            <div className="flex flex-wrap gap-2">
              {component.childComponents.map((name, i) => (
                <span key={i} className="px-2 py-1 bg-blue-500/10 rounded text-xs">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ElementDetail({ element }: { element: UIElement }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🔘</span>
        <div>
          <h2 className="text-xl font-bold capitalize">{element.type}</h2>
          <p className="text-slate-500">Line {element.line}</p>
        </div>
      </div>

      {/* Element Details */}
      <div className="border border-slate-700 rounded-xl p-4 space-y-4">
        {element.label && (
          <div>
            <div className="text-xs text-slate-500 mb-1">Label</div>
            <p className="font-medium">{element.label}</p>
          </div>
        )}

        {/* Click Handler */}
        {element.onClick && (
          <ClickHandlerDetail handler={element.onClick} label="onClick" />
        )}
        {element.onSubmit && (
          <ClickHandlerDetail handler={element.onSubmit} label="onSubmit" />
        )}
        {element.onChange && (
          <ClickHandlerDetail handler={element.onChange} label="onChange" />
        )}

        {/* Props */}
        {Object.keys(element.props).length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-2">Props</div>
            <div className="bg-slate-800 rounded-lg p-3 text-xs font-mono overflow-x-auto">
              {Object.entries(element.props).map(([key, value]) => (
                <div key={key}>
                  <span className="text-violet-400">{key}</span>
                  <span className="text-slate-500">=</span>
                  <span className="text-emerald-400">{JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClickHandlerDetail({ handler, label }: { handler: ClickHandler; label: string }) {
  const actionColors: Record<string, string> = {
    state_update: 'text-pink-400 bg-pink-500/10',
    api_call: 'text-blue-400 bg-blue-500/10',
    navigation: 'text-emerald-400 bg-emerald-500/10',
    modal_open: 'text-violet-400 bg-violet-500/10',
    modal_close: 'text-slate-400 bg-slate-500/10',
    form_submit: 'text-amber-400 bg-amber-500/10',
    validation: 'text-cyan-400 bg-cyan-500/10',
    unknown: 'text-slate-400 bg-slate-500/10',
  };

  return (
    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-400">⚡</span>
        <span className="text-xs font-medium text-amber-400">{label}</span>
        <span className="text-xs text-slate-500">→ {handler.name}()</span>
      </div>
      
      <div className="space-y-1">
        {handler.actions.map((action, i) => (
          <div
            key={i}
            className={`text-xs px-2 py-1 rounded ${actionColors[action.type] || actionColors.unknown}`}
          >
            <span className="font-medium capitalize">{action.type.replace('_', ' ')}</span>
            {action.target && <span className="opacity-70"> → {action.target}</span>}
            <p className="opacity-70">{action.description}</p>
          </div>
        ))}
      </div>

      {handler.code && (
        <div className="mt-2 p-2 bg-slate-800 rounded text-xs font-mono text-slate-400 overflow-x-auto">
          {handler.code}
        </div>
      )}
    </div>
  );
}

function ItemDetails({ item }: { item: SelectedItem }) {
  if (item.type === 'page') {
    const page = item.data as PageDefinition;
    return (
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-slate-500">Route:</span>
          <span className="ml-2 text-violet-400">{page.route}</span>
        </div>
        <div>
          <span className="text-slate-500">Components:</span>
          <span className="ml-2">{page.components.length}</span>
        </div>
        <div>
          <span className="text-slate-500">Links:</span>
          <span className="ml-2">{page.links.length}</span>
        </div>
      </div>
    );
  }

  if (item.type === 'component') {
    const comp = item.data as ComponentDefinition;
    return (
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-slate-500">Type:</span>
          <span className="ml-2 capitalize">{comp.type}</span>
        </div>
        <div>
          <span className="text-slate-500">Elements:</span>
          <span className="ml-2">{comp.elements.length}</span>
        </div>
        <div>
          <span className="text-slate-500">State:</span>
          <span className="ml-2">{comp.state.length}</span>
        </div>
        <div>
          <span className="text-slate-500">Hooks:</span>
          <span className="ml-2">{comp.hooks.length}</span>
        </div>
        <div>
          <span className="text-slate-500">Children:</span>
          <span className="ml-2">{comp.childComponents.length}</span>
        </div>
        <div>
          <span className="text-slate-500">Line:</span>
          <span className="ml-2">{comp.line}</span>
        </div>
      </div>
    );
  }

  const el = item.data as UIElement;
  return (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-slate-500">Type:</span>
        <span className="ml-2 capitalize">{el.type}</span>
      </div>
      <div>
        <span className="text-slate-500">Line:</span>
        <span className="ml-2">{el.line}</span>
      </div>
      <div>
        <span className="text-slate-500">Clickable:</span>
        <span className="ml-2">{el.onClick || el.onSubmit ? 'Yes' : 'No'}</span>
      </div>
    </div>
  );
}

export default WireframeViewer;
