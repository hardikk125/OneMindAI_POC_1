import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Plus, Pin, MessageSquare, ChevronDown, ChevronRight,
  Folder, Archive, Settings, Share2, Copy, RefreshCw, ThumbsUp, 
  ThumbsDown, Paperclip, Mic, Send, Clock, Coins, BarChart3,
  Check, X, MoreHorizontal
} from 'lucide-react';

// Types
interface ConversationItem {
  id: string;
  title: string;
  engines: string[];
  messageCount: number;
  lastActivity: Date;
  isPinned: boolean;
  isArchived: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  engineResponses?: EngineResponse[];
}

interface EngineResponse {
  engine: string;
  provider: string;
  content: string;
  isStreaming: boolean;
  responseTime?: number;
  tokens?: number;
  cost?: number;
}

interface Engine {
  id: string;
  name: string;
  provider: string;
  selectedVersion: string;
  color: string;
}

interface ChatInterfaceProps {
  conversations: ConversationItem[];
  currentConversationId?: string;
  messages: Message[];
  engines: Engine[];
  selectedEngines: Record<string, boolean>;
  streamingStates: Record<string, { content: string; isStreaming: boolean }>;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onSendMessage: (message: string) => void;
  onToggleEngine: (engineId: string) => void;
  onRegenerateResponse: (engineId: string) => void;
  isRunning: boolean;
}

// Engine color mapping
const ENGINE_COLORS: Record<string, string> = {
  openai: '#10B981',
  anthropic: '#8B5CF6',
  gemini: '#3B82F6',
  deepseek: '#F59E0B',
  mistral: '#EF4444',
  perplexity: '#06B6D4',
  xai: '#6366F1',
  groq: '#EC4899',
};

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Group conversations by date
function groupConversations(conversations: ConversationItem[]) {
  const pinned: ConversationItem[] = [];
  const today: ConversationItem[] = [];
  const yesterday: ConversationItem[] = [];
  const lastWeek: ConversationItem[] = [];
  const older: ConversationItem[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

  conversations.forEach(conv => {
    if (conv.isArchived) return;
    if (conv.isPinned) {
      pinned.push(conv);
      return;
    }
    const convDate = new Date(conv.lastActivity);
    if (convDate >= todayStart) today.push(conv);
    else if (convDate >= yesterdayStart) yesterday.push(conv);
    else if (convDate >= weekStart) lastWeek.push(conv);
    else older.push(conv);
  });

  return { pinned, today, yesterday, lastWeek, older };
}

export function ChatInterface({
  conversations,
  currentConversationId,
  messages,
  engines,
  selectedEngines,
  streamingStates,
  onSelectConversation,
  onNewChat,
  onSendMessage,
  onToggleEngine,
  onRegenerateResponse,
  isRunning,
}: ChatInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [activeEngineTab, setActiveEngineTab] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingStates]);

  // Set first active engine tab
  useEffect(() => {
    const activeEngines = engines.filter(e => selectedEngines[e.id]);
    if (activeEngines.length > 0 && !activeEngineTab) {
      setActiveEngineTab(activeEngines[0].id);
    }
  }, [engines, selectedEngines, activeEngineTab]);

  const grouped = groupConversations(conversations);
  const filteredConversations = searchQuery
    ? conversations.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) && !c.isArchived
      )
    : null;

  const handleSend = () => {
    if (promptValue.trim() && !isRunning) {
      onSendMessage(promptValue.trim());
      setPromptValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeEngines = engines.filter(e => selectedEngines[e.id]);

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-700">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:opacity-90 transition font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredConversations ? (
            // Search Results
            <div className="space-y-1">
              {filteredConversations.map(conv => (
                <ConversationCard
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === currentConversationId}
                  onClick={() => onSelectConversation(conv.id)}
                />
              ))}
              {filteredConversations.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No results found</p>
              )}
            </div>
          ) : (
            // Grouped Conversations
            <>
              {grouped.pinned.length > 0 && (
                <ConversationGroup title="📌 Pinned" conversations={grouped.pinned} currentId={currentConversationId} onSelect={onSelectConversation} />
              )}
              {grouped.today.length > 0 && (
                <ConversationGroup title="Today" conversations={grouped.today} currentId={currentConversationId} onSelect={onSelectConversation} />
              )}
              {grouped.yesterday.length > 0 && (
                <ConversationGroup title="Yesterday" conversations={grouped.yesterday} currentId={currentConversationId} onSelect={onSelectConversation} />
              )}
              {grouped.lastWeek.length > 0 && (
                <ConversationGroup title="Last 7 Days" conversations={grouped.lastWeek} currentId={currentConversationId} onSelect={onSelectConversation} />
              )}
              {grouped.older.length > 0 && (
                <ConversationGroup title="Older" conversations={grouped.older} currentId={currentConversationId} onSelect={onSelectConversation} />
              )}
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
            <Archive className="w-4 h-4" />
            Archived Chats
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3">
            {/* Toggle Sidebar */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <MessageSquare className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {currentConversationId 
                  ? conversations.find(c => c.id === currentConversationId)?.title || 'Chat'
                  : 'New Conversation'}
              </h2>
              <p className="text-xs text-slate-500">
                {activeEngines.map(e => e.name).join(', ')} • {messages.length} messages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition" title="Settings">
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition" title="Share">
              <Share2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Start a new conversation
              </h3>
              <p className="text-slate-500 max-w-md">
                Ask a question and get responses from multiple AI engines. Compare and select the best parts.
              </p>
            </div>
          ) : (
            messages.map((message, idx) => (
              <div key={message.id} className="space-y-3">
                {/* User Message */}
                {message.role === 'user' && (
                  <div className="flex justify-end">
                    <div className="max-w-2xl bg-purple-600 text-white rounded-2xl rounded-br-md px-4 py-3">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs text-purple-200 mt-1 text-right">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Response with Engine Tabs */}
                {message.role === 'assistant' && message.engineResponses && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Engine Tabs */}
                    <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-x-auto">
                      {message.engineResponses.map(resp => {
                        const engine = engines.find(e => e.selectedVersion === resp.engine);
                        const color = ENGINE_COLORS[resp.provider] || '#6B7280';
                        const isActive = activeEngineTab === engine?.id;
                        return (
                          <button
                            key={resp.engine}
                            onClick={() => engine && setActiveEngineTab(engine.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                              isActive 
                                ? 'bg-white dark:bg-slate-800 shadow-sm' 
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: color }}
                            />
                            {engine?.name || resp.engine}
                            {resp.isStreaming && (
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Response Content */}
                    <div className="p-4">
                      {message.engineResponses.map(resp => {
                        const engine = engines.find(e => e.selectedVersion === resp.engine);
                        if (engine?.id !== activeEngineTab) return null;
                        return (
                          <div key={resp.engine}>
                            <div className="prose dark:prose-invert max-w-none">
                              <p className="whitespace-pre-wrap">{resp.content}</p>
                              {resp.isStreaming && (
                                <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />
                              )}
                            </div>
                            {/* Response Meta */}
                            {!resp.isStreaming && (
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  {resp.responseTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {(resp.responseTime / 1000).toFixed(1)}s
                                    </span>
                                  )}
                                  {resp.tokens && (
                                    <span className="flex items-center gap-1">
                                      <BarChart3 className="w-3 h-3" />
                                      {resp.tokens} tokens
                                    </span>
                                  )}
                                  {resp.cost && (
                                    <span className="flex items-center gap-1">
                                      <Coins className="w-3 h-3" />
                                      ${resp.cost.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Good response">
                                    <ThumbsUp className="w-4 h-4 text-slate-500" />
                                  </button>
                                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Bad response">
                                    <ThumbsDown className="w-4 h-4 text-slate-500" />
                                  </button>
                                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Copy">
                                    <Copy className="w-4 h-4 text-slate-500" />
                                  </button>
                                  <button 
                                    onClick={() => engine && onRegenerateResponse(engine.id)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" 
                                    title="Regenerate"
                                  >
                                    <RefreshCw className="w-4 h-4 text-slate-500" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          {/* Engine Selection */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Engines:</span>
            {engines.slice(0, 8).map(engine => {
              const isSelected = selectedEngines[engine.id];
              const color = ENGINE_COLORS[engine.provider] || '#6B7280';
              return (
                <button
                  key={engine.id}
                  onClick={() => onToggleEngine(engine.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition border ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400'
                  }`}
                >
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  {engine.name}
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>

          {/* Input Box */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question..."
                rows={1}
                className="w-full px-4 py-3 pr-24 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition" title="Attach file">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                </button>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition" title="Voice input">
                  <Mic className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={!promptValue.trim() || isRunning}
              className={`p-3 rounded-xl transition ${
                promptValue.trim() && !isRunning
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Conversation Card Component
function ConversationCard({ 
  conversation, 
  isActive, 
  onClick 
}: { 
  conversation: ConversationItem; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-lg transition group ${
        isActive 
          ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700' 
          : 'hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      <div className="flex items-start gap-2">
        <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-purple-900 dark:text-purple-100' : 'text-slate-900 dark:text-white'}`}>
            {conversation.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {/* Engine dots */}
            <div className="flex items-center gap-0.5">
              {conversation.engines.slice(0, 3).map((engine, i) => (
                <span 
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ENGINE_COLORS[engine] || '#6B7280' }}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">
              {formatRelativeTime(conversation.lastActivity)} • {conversation.messageCount} msg
            </span>
          </div>
        </div>
        {conversation.isPinned && (
          <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />
        )}
      </div>
    </button>
  );
}

// Conversation Group Component
function ConversationGroup({
  title,
  conversations,
  currentId,
  onSelect,
}: {
  title: string;
  conversations: ConversationItem[];
  currentId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
        {title}
      </h3>
      <div className="space-y-1">
        {conversations.map(conv => (
          <ConversationCard
            key={conv.id}
            conversation={conv}
            isActive={conv.id === currentId}
            onClick={() => onSelect(conv.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default ChatInterface;
