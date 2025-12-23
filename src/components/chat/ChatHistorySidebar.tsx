// =============================================================================
// CHAT HISTORY SIDEBAR
// =============================================================================
// Sidebar with conversation list, search, folders, and date grouping
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, MessageSquare, X, Archive } from 'lucide-react';
import { Conversation } from '../../types/chat-history';
import { useChatHistory } from '../../hooks/useChatHistory';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conv: Conversation) => void;
  onNewChat: () => void;
  currentConversationId?: string;
}

export function ChatHistorySidebar({
  isOpen,
  onClose,
  onSelectConversation,
  onNewChat,
  currentConversationId
}: ChatHistorySidebarProps) {
  const { conversations, fetchConversations, isLoading } = useChatHistory();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: Record<string, Conversation[]> = {
      pinned: [],
      today: [],
      yesterday: [],
      lastWeek: [],
      older: []
    };

    const filtered = conversations.filter(c => 
      !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.forEach(conv => {
      if (conv.is_pinned) {
        groups.pinned.push(conv);
        return;
      }
      
      const updated = new Date(conv.updated_at);
      if (updated >= today) {
        groups.today.push(conv);
      } else if (updated >= yesterday) {
        groups.yesterday.push(conv);
      } else if (updated >= lastWeek) {
        groups.lastWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [conversations, searchQuery]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl z-50 flex flex-col border-r border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chat History</h2>
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {/* Pinned */}
              {groupedConversations.pinned.length > 0 && (
                <ConversationGroup
                  title="📌 Pinned"
                  conversations={groupedConversations.pinned}
                  currentId={currentConversationId}
                  onSelect={onSelectConversation}
                />
              )}

              {/* Today */}
              {groupedConversations.today.length > 0 && (
                <ConversationGroup
                  title="Today"
                  conversations={groupedConversations.today}
                  currentId={currentConversationId}
                  onSelect={onSelectConversation}
                />
              )}

              {/* Yesterday */}
              {groupedConversations.yesterday.length > 0 && (
                <ConversationGroup
                  title="Yesterday"
                  conversations={groupedConversations.yesterday}
                  currentId={currentConversationId}
                  onSelect={onSelectConversation}
                />
              )}

              {/* Last 7 Days */}
              {groupedConversations.lastWeek.length > 0 && (
                <ConversationGroup
                  title="Last 7 Days"
                  conversations={groupedConversations.lastWeek}
                  currentId={currentConversationId}
                  onSelect={onSelectConversation}
                />
              )}

              {/* Older */}
              {groupedConversations.older.length > 0 && (
                <ConversationGroup
                  title="Older"
                  conversations={groupedConversations.older}
                  currentId={currentConversationId}
                  onSelect={onSelectConversation}
                />
              )}

              {/* Empty state */}
              {conversations.length === 0 && !isLoading && (
                <div className="text-center py-8 px-4">
                  <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No conversations yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start a new chat to begin</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <Archive className="w-4 h-4" />
            Archived Chats
          </button>
        </div>
      </div>
    </>
  );
}

// Conversation Group Component
function ConversationGroup({
  title,
  conversations,
  currentId,
  onSelect
}: {
  title: string;
  conversations: Conversation[];
  currentId?: string;
  onSelect: (conv: Conversation) => void;
}) {
  return (
    <div className="mb-4">
      <h3 className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-1 mt-1">
        {conversations.map(conv => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === currentId}
            onClick={() => onSelect(conv)}
          />
        ))}
      </div>
    </div>
  );
}

// Single Conversation Item
function ConversationItem({
  conversation,
  isActive,
  onClick
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const engineColors: Record<string, string> = {
    openai: 'bg-emerald-500',
    anthropic: 'bg-violet-500',
    gemini: 'bg-blue-500',
    mistral: 'bg-orange-500',
    deepseek: 'bg-red-500',
    groq: 'bg-gray-500',
    perplexity: 'bg-cyan-500',
    xai: 'bg-pink-500'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
        isActive
          ? 'bg-purple-100 dark:bg-purple-900/30 border-l-2 border-purple-600 shadow-sm'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <div className="flex items-start gap-2">
        <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
          isActive ? 'text-purple-600' : 'text-slate-400'
        }`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${
            isActive 
              ? 'text-purple-900 dark:text-purple-100' 
              : 'text-slate-900 dark:text-white'
          }`}>
            {conversation.title}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {conversation.engines?.slice(0, 3).map((eng, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${engineColors[eng.provider] || 'bg-gray-400'}`}
                title={eng.engine}
              />
            ))}
            {conversation.engines && conversation.engines.length > 3 && (
              <span className="text-xs text-slate-400 ml-1">
                +{conversation.engines.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
