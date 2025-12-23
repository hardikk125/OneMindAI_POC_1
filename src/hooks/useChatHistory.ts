// =============================================================================
// USE CHAT HISTORY HOOK
// =============================================================================
// State management for block-based conversation system
// =============================================================================

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { 
  Conversation, 
  UserMessage, 
  ResponseBlock, 
  PreferredBlock,
  ContextMode,
  ContextMessage,
  BlockWithMeta
} from '../types/chat-history';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export function useChatHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user ID from Supabase auth
  const getUserId = useCallback(async () => {
    const { data: { user } } = await supabase!.auth.getUser();
    return user?.id;
  }, []);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const userId = await getUserId();
      
      if (!userId) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`${API_BASE}/api/chat/conversations`, {
        headers: {
          'x-user-id': userId
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err: any) {
      setError(err.message);
      console.error('[useChatHistory] Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getUserId]);

  // Load a specific conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      setIsLoading(true);
      const userId = await getUserId();
      
      if (!userId) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`${API_BASE}/api/chat/conversations/${conversationId}`, {
        headers: {
          'x-user-id': userId
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }
      
      const data = await response.json();
      setCurrentConversation(data.conversation);
      setMessages(data.messages || []);
    } catch (err: any) {
      setError(err.message);
      console.error('[useChatHistory] Error loading conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getUserId]);

  // Create new conversation
  const createConversation = useCallback(async (
    title: string, 
    engines: { engine: string; provider: string }[]
  ) => {
    try {
      const userId = await getUserId();
      
      if (!userId) {
        setError('Not authenticated');
        return null;
      }

      const response = await fetch(`${API_BASE}/api/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ title, engines })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }
      
      const data = await response.json();
      setCurrentConversation(data.conversation);
      setMessages([]);
      await fetchConversations(); // Refresh list
      return data.conversation;
    } catch (err: any) {
      setError(err.message);
      console.error('[useChatHistory] Error creating conversation:', err);
      return null;
    }
  }, [getUserId, fetchConversations]);

  // Send message
  const sendMessage = useCallback(async (content: string, attachments?: any[]) => {
    if (!currentConversation) return null;
    
    try {
      const userId = await getUserId();
      
      if (!userId) {
        setError('Not authenticated');
        return null;
      }

      const response = await fetch(`${API_BASE}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          content,
          attachments
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      return data.message;
    } catch (err: any) {
      setError(err.message);
      console.error('[useChatHistory] Error sending message:', err);
      return null;
    }
  }, [currentConversation, getUserId]);

  // Store engine response
  const storeEngineResponse = useCallback(async (
    userMessageId: string,
    engine: string,
    provider: string,
    fullResponse: string,
    metadata: {
      response_time_ms: number;
      input_tokens: number;
      output_tokens: number;
      cost_usd: number;
    }
  ) => {
    if (!currentConversation) return null;
    
    try {
      const userId = await getUserId();
      
      if (!userId) {
        setError('Not authenticated');
        return null;
      }

      const response = await fetch(`${API_BASE}/api/chat/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          user_message_id: userMessageId,
          engine,
          provider,
          full_response: fullResponse,
          ...metadata
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to store response');
      }
      
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      console.error('[useChatHistory] Error storing response:', err);
      return null;
    }
  }, [currentConversation, getUserId]);

  // Select a block as preferred
  const selectBlock = useCallback(async (userMessageId: string, blockId: string) => {
    if (!currentConversation) return;
    
    try {
      const userId = await getUserId();
      
      if (!userId) {
        setError('Not authenticated');
        return;
      }

      await fetch(`${API_BASE}/api/chat/preferred`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          user_message_id: userMessageId,
          block_id: blockId
        })
      });
      
      // Refresh messages to update UI
      await loadConversation(currentConversation.id);
    } catch (err: any) {
      setError(err.message);
      console.error('[useChatHistory] Error selecting block:', err);
    }
  }, [currentConversation, loadConversation, getUserId]);

  // Deselect a block
  const deselectBlock = useCallback(async (preferredBlockId: string) => {
    try {
      const userId = await getUserId();
      
      if (!userId) {
        setError('Not authenticated');
        return;
      }

      await fetch(`${API_BASE}/api/chat/preferred/${preferredBlockId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId
        }
      });
      
      if (currentConversation) {
        await loadConversation(currentConversation.id);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('[useChatHistory] Error deselecting block:', err);
    }
  }, [currentConversation, loadConversation, getUserId]);

  // Reorder preferred blocks
  const reorderBlocks = useCallback(async (
    userMessageId: string, 
    blockOrder: { id: string; order: number }[]
  ) => {
    try {
      const userId = await getUserId();
      
      if (!userId) {
        setError('Not authenticated');
        return;
      }

      await fetch(`${API_BASE}/api/chat/preferred/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ user_message_id: userMessageId, block_order: blockOrder })
      });
    } catch (err: any) {
      setError(err.message);
      console.error('[useChatHistory] Error reordering blocks:', err);
    }
  }, [getUserId]);

  // Get context for API call
  const getContext = useCallback(async (
    newMessage: string, 
    mode: ContextMode = 'preferred'
  ): Promise<ContextMessage[]> => {
    if (!currentConversation) {
      return [{ role: 'user', content: newMessage }];
    }
    
    try {
      const userId = await getUserId();
      
      if (!userId) {
        return [{ role: 'user', content: newMessage }];
      }

      const response = await fetch(
        `${API_BASE}/api/chat/context/${currentConversation.id}?mode=${mode}&newMessage=${encodeURIComponent(newMessage)}`,
        {
          headers: {
            'x-user-id': userId
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to get context');
      }
      
      const data = await response.json();
      return data.context;
    } catch (err: any) {
      console.error('[useChatHistory] Error getting context:', err);
      return [{ role: 'user', content: newMessage }];
    }
  }, [currentConversation, getUserId]);

  // Helper: Get preferred blocks with engine metadata for UI
  const getPreferredBlocksWithMeta = useCallback((userMessage: UserMessage): BlockWithMeta[] => {
    if (!userMessage.preferred_blocks || !userMessage.engine_responses) {
      return [];
    }

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

    return userMessage.preferred_blocks
      .map(pb => {
        // Find the block
        const block = userMessage.engine_responses
          ?.flatMap(er => er.blocks || [])
          .find(b => b.id === pb.block_id);
        
        if (!block) return null;

        // Find the engine response
        const engineResponse = userMessage.engine_responses
          ?.find(er => er.blocks?.some(b => b.id === pb.block_id));
        
        if (!engineResponse) return null;

        return {
          ...block,
          engineName: engineResponse.engine,
          engineColor: engineColors[engineResponse.provider] || 'bg-gray-500',
          provider: engineResponse.provider
        };
      })
      .filter((b): b is BlockWithMeta => b !== null)
      .sort((a, b) => {
        const orderA = userMessage.preferred_blocks?.find(pb => pb.block_id === a.id)?.selection_order || 0;
        const orderB = userMessage.preferred_blocks?.find(pb => pb.block_id === b.id)?.selection_order || 0;
        return orderA - orderB;
      });
  }, []);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    
    // Actions
    fetchConversations,
    loadConversation,
    createConversation,
    sendMessage,
    storeEngineResponse,
    selectBlock,
    deselectBlock,
    reorderBlocks,
    getContext,
    getPreferredBlocksWithMeta,
    
    // Setters
    setCurrentConversation,
    setError
  };
}
