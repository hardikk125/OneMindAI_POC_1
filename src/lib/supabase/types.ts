/**
 * Supabase Database Types
 * 
 * TypeScript types for the database schema.
 * These match the SQL migrations in supabase/migrations/
 */

// =============================================================================
// DATABASE SCHEMA TYPES
// =============================================================================

export interface Database {
  public: {
    Tables: {
      // User profiles (extends Supabase auth.users)
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          is_active: boolean;
          role: 'user' | 'admin' | 'premium';
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          role?: 'user' | 'admin' | 'premium';
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
          is_active?: boolean;
          role?: 'user' | 'admin' | 'premium';
        };
      };

      // Credit balances
      credits: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          lifetime_earned: number;
          lifetime_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
          updated_at?: string;
        };
      };

      // Credit transactions (audit log)
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'signup';
          description: string;
          provider: string | null;
          model: string | null;
          tokens_used: number | null;
          created_at: string;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'signup';
          description: string;
          provider?: string | null;
          model?: string | null;
          tokens_used?: number | null;
          created_at?: string;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          amount?: number;
          type?: 'purchase' | 'usage' | 'refund' | 'bonus' | 'signup';
          description?: string;
          metadata?: Record<string, unknown> | null;
        };
      };

      // API usage tracking
      api_usage: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          cost_credits: number;
          created_at: string;
          request_id: string | null;
          success: boolean;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          cost_credits: number;
          created_at?: string;
          request_id?: string | null;
          success?: boolean;
          error_message?: string | null;
        };
        Update: {
          success?: boolean;
          error_message?: string | null;
        };
      };

      // User settings
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          theme: 'light' | 'dark' | 'system';
          default_model: string | null;
          auto_save: boolean;
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: 'light' | 'dark' | 'system';
          default_model?: string | null;
          auto_save?: boolean;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          theme?: 'light' | 'dark' | 'system';
          default_model?: string | null;
          auto_save?: boolean;
          notifications_enabled?: boolean;
          updated_at?: string;
        };
      };

      // Conversation history
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
          is_archived: boolean;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
          is_archived?: boolean;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          title?: string;
          updated_at?: string;
          is_archived?: boolean;
          metadata?: Record<string, unknown> | null;
        };
      };

      // Messages within conversations
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          provider: string | null;
          model: string | null;
          tokens: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          provider?: string | null;
          model?: string | null;
          tokens?: number | null;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
    };

    Views: Record<string, never>;
    
    Functions: {
      // Deduct credits atomically
      deduct_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_description: string;
          p_provider?: string;
          p_model?: string;
          p_tokens?: number;
        };
        Returns: boolean;
      };
      
      // Add credits atomically
      add_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_type: 'purchase' | 'refund' | 'bonus' | 'signup';
          p_description: string;
        };
        Returns: boolean;
      };
      
      // Get user's credit balance
      get_credit_balance: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
    };

    Enums: {
      user_role: 'user' | 'admin' | 'premium';
      transaction_type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'signup';
      theme_type: 'light' | 'dark' | 'system';
      message_role: 'user' | 'assistant' | 'system';
    };
  };
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];

// Convenience types
export type Profile = Tables<'profiles'>;
export type Credits = Tables<'credits'>;
export type CreditTransaction = Tables<'credit_transactions'>;
export type ApiUsage = Tables<'api_usage'>;
export type UserSettings = Tables<'user_settings'>;
export type Conversation = Tables<'conversations'>;
export type Message = Tables<'messages'>;

// Auth user with profile
export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  credits: Credits | null;
}
