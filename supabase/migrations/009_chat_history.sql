-- =============================================================================
-- CHAT HISTORY WITH BLOCK-BASED SELECTION - DATABASE SCHEMA
-- Migration 009 - Block-Based Conversation System
-- =============================================================================
-- Architecture: No canonical response, user-curated blocks, preferred selection
-- =============================================================================

-- =============================================================================
-- 1. CONVERSATIONS TABLE
-- One conversation per thread (engine-agnostic)
-- Note: folder_id will be added after folders table is created
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Conversation',
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. FOLDERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366F1',
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2.1. ADD FOLDER_ID TO CONVERSATIONS (after folders table exists)
-- =============================================================================
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- =============================================================================
-- 3. USER MESSAGES TABLE
-- Store user messages normally (one per turn)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    turn_number INTEGER NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. ENGINE RESPONSES TABLE
-- Store each engine's FULL response separately (no canonical response)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.engine_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_message_id UUID NOT NULL REFERENCES public.user_messages(id) ON DELETE CASCADE,
    engine TEXT NOT NULL,
    provider TEXT NOT NULL,
    full_response TEXT NOT NULL,
    response_time_ms INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd DECIMAL(10,6),
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. RESPONSE BLOCKS TABLE
-- Split engine responses into selectable blocks
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.response_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine_response_id UUID NOT NULL REFERENCES public.engine_responses(id) ON DELETE CASCADE,
    block_index INTEGER NOT NULL,
    block_type TEXT NOT NULL CHECK (block_type IN ('paragraph', 'heading', 'bullet', 'numbered', 'code', 'table', 'quote', 'chart')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(engine_response_id, block_index)
);

-- =============================================================================
-- 6. PREFERRED BLOCKS TABLE (THE KEY TABLE)
-- User-selected blocks that form the "Preferred Selection"
-- This is the ONLY context reused for follow-ups and new engines
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.preferred_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_message_id UUID NOT NULL REFERENCES public.user_messages(id) ON DELETE CASCADE,
    block_id UUID NOT NULL REFERENCES public.response_blocks(id) ON DELETE CASCADE,
    selection_order INTEGER NOT NULL,
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_message_id, block_id)
);

-- =============================================================================
-- 7. CONVERSATION ENGINES TABLE
-- Track which engines are active in each conversation
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_engines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    engine TEXT NOT NULL,
    provider TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    UNIQUE(conversation_id, engine)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_folder ON public.conversations(folder_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_conversation ON public.user_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_turn ON public.user_messages(conversation_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_engine_responses_conversation ON public.engine_responses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_engine_responses_message ON public.engine_responses(user_message_id);
CREATE INDEX IF NOT EXISTS idx_response_blocks_response ON public.response_blocks(engine_response_id);
CREATE INDEX IF NOT EXISTS idx_preferred_blocks_conversation ON public.preferred_blocks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_preferred_blocks_message ON public.preferred_blocks(user_message_id);
CREATE INDEX IF NOT EXISTS idx_preferred_blocks_order ON public.preferred_blocks(conversation_id, user_message_id, selection_order);
CREATE INDEX IF NOT EXISTS idx_conversation_engines_conv ON public.conversation_engines(conversation_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON public.folders(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferred_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_engines ENABLE ROW LEVEL SECURITY;

-- Folders: Users own their folders
CREATE POLICY "Users own folders" ON public.folders
    FOR ALL USING (auth.uid() = user_id);

-- Conversations: Users own their conversations
CREATE POLICY "Users own conversations" ON public.conversations
    FOR ALL USING (auth.uid() = user_id);

-- User Messages: Users access messages in their conversations
CREATE POLICY "Users access own messages" ON public.user_messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE user_id = auth.uid()
        )
    );

-- Engine Responses: Users access responses in their conversations
CREATE POLICY "Users access own responses" ON public.engine_responses
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE user_id = auth.uid()
        )
    );

-- Response Blocks: Users access blocks from their engine responses
CREATE POLICY "Users access own blocks" ON public.response_blocks
    FOR ALL USING (
        engine_response_id IN (
            SELECT er.id FROM public.engine_responses er
            JOIN public.conversations c ON er.conversation_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

-- Preferred Blocks: Users access their preferred selections
CREATE POLICY "Users access own preferred" ON public.preferred_blocks
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE user_id = auth.uid()
        )
    );

-- Conversation Engines: Users access engines in their conversations
CREATE POLICY "Users access own engines" ON public.conversation_engines
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON public.folders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get conversation with full context
CREATE OR REPLACE FUNCTION public.get_conversation_context(
    p_conversation_id UUID
)
RETURNS TABLE (
    message_id UUID,
    message_content TEXT,
    turn_number INTEGER,
    preferred_blocks JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        um.id,
        um.content,
        um.turn_number,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'block_id', pb.block_id,
                    'content', rb.content,
                    'block_type', rb.block_type,
                    'metadata', rb.metadata,
                    'selection_order', pb.selection_order,
                    'engine', er.engine,
                    'provider', er.provider
                ) ORDER BY pb.selection_order
            ) FILTER (WHERE pb.id IS NOT NULL),
            '[]'::jsonb
        ) as preferred_blocks
    FROM public.user_messages um
    LEFT JOIN public.preferred_blocks pb ON pb.user_message_id = um.id
    LEFT JOIN public.response_blocks rb ON rb.id = pb.block_id
    LEFT JOIN public.engine_responses er ON er.id = rb.engine_response_id
    WHERE um.conversation_id = p_conversation_id
    GROUP BY um.id, um.content, um.turn_number
    ORDER BY um.turn_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-generate conversation title from first message
CREATE OR REPLACE FUNCTION public.auto_generate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if this is the first message (turn_number = 1) and conversation title is default
    IF NEW.turn_number = 1 THEN
        UPDATE public.conversations
        SET title = CASE
            WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 50) || '...'
            ELSE NEW.content
        END
        WHERE id = NEW.conversation_id 
        AND title = 'New Conversation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_title_conversation
    AFTER INSERT ON public.user_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_conversation_title();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================
COMMENT ON TABLE public.conversations IS 'One conversation per thread - engine-agnostic';
COMMENT ON TABLE public.user_messages IS 'User messages stored normally, one per turn';
COMMENT ON TABLE public.engine_responses IS 'Each engine full response stored separately - NO canonical response';
COMMENT ON TABLE public.response_blocks IS 'Engine responses split into selectable blocks (paragraph, code, bullet, etc.)';
COMMENT ON TABLE public.preferred_blocks IS 'User-selected blocks forming Preferred Selection - ONLY context reused';
COMMENT ON TABLE public.conversation_engines IS 'Track which engines are active in conversation';
COMMENT ON TABLE public.folders IS 'User-created folders for organizing conversations';

COMMENT ON COLUMN public.preferred_blocks.selection_order IS 'User can reorder selected blocks - this order is used for context';
COMMENT ON COLUMN public.response_blocks.block_type IS 'paragraph, heading, bullet, numbered, code, table, quote, chart';
COMMENT ON COLUMN public.response_blocks.metadata IS 'Additional data: {language: "python"} for code, {level: 2} for headings';
COMMENT ON COLUMN public.engine_responses.full_response IS 'Complete raw response from engine - blocks are parsed from this';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Architecture Notes:
-- 1. NO canonical assistant response - each engine response stored separately
-- 2. Blocks are user-selectable units of content
-- 3. Preferred Selection = blocks user chose = ONLY context for follow-ups
-- 4. Cold start supported - new engines can start without context
-- 5. RLS ensures data security - users only access their own data
-- =============================================================================
