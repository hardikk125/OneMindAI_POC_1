-- =============================================================================
-- Unit Tests for System Config and Provider Config Tables
-- =============================================================================
-- Run these tests in Supabase SQL editor to verify Phase 1 migration
-- =============================================================================

-- =============================================
-- TEST SUITE 1: SYSTEM_CONFIG TABLE STRUCTURE
-- =============================================

-- Test 1.1: Verify system_config table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config') 
        THEN '✅ PASS: system_config table exists'
        ELSE '❌ FAIL: system_config table does not exist'
    END as test_1_1;

-- Test 1.2: Verify system_config columns
SELECT 
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'system_config' 
            AND column_name IN ('key', 'value', 'category', 'description', 'is_sensitive', 'updated_by', 'updated_at')
        ) = 7
        THEN '✅ PASS: All required columns exist'
        ELSE '❌ FAIL: Missing columns in system_config'
    END as test_1_2;

-- Test 1.3: Verify primary key
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'system_config' AND constraint_type = 'PRIMARY KEY'
        )
        THEN '✅ PASS: Primary key exists on system_config'
        ELSE '❌ FAIL: Primary key missing'
    END as test_1_3;

-- =============================================
-- TEST SUITE 2: PROVIDER_CONFIG TABLE STRUCTURE
-- =============================================

-- Test 2.1: Verify provider_config table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provider_config') 
        THEN '✅ PASS: provider_config table exists'
        ELSE '❌ FAIL: provider_config table does not exist'
    END as test_2_1;

-- Test 2.2: Verify provider_config columns
SELECT 
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'provider_config' 
            AND column_name IN ('provider', 'is_enabled', 'max_output_cap', 'rate_limit_rpm', 'timeout_seconds', 'retry_count', 'updated_by', 'updated_at')
        ) = 8
        THEN '✅ PASS: All required columns exist'
        ELSE '❌ FAIL: Missing columns in provider_config'
    END as test_2_2;

-- Test 2.3: Verify primary key
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'provider_config' AND constraint_type = 'PRIMARY KEY'
        )
        THEN '✅ PASS: Primary key exists on provider_config'
        ELSE '❌ FAIL: Primary key missing'
    END as test_2_3;

-- =============================================
-- TEST SUITE 3: INDEXES
-- =============================================

-- Test 3.1: Verify system_config indexes
SELECT 
    CASE 
        WHEN (
            SELECT COUNT(*) FROM pg_indexes 
            WHERE tablename = 'system_config' 
            AND indexname LIKE 'idx_system_config%'
        ) >= 2
        THEN '✅ PASS: System config indexes exist'
        ELSE '❌ FAIL: Missing indexes on system_config'
    END as test_3_1;

-- Test 3.2: Verify provider_config indexes
SELECT 
    CASE 
        WHEN (
            SELECT COUNT(*) FROM pg_indexes 
            WHERE tablename = 'provider_config' 
            AND indexname LIKE 'idx_provider_config%'
        ) >= 1
        THEN '✅ PASS: Provider config indexes exist'
        ELSE '❌ FAIL: Missing indexes on provider_config'
    END as test_3_2;

-- =============================================
-- TEST SUITE 4: SEED DATA - SYSTEM_CONFIG
-- =============================================

-- Test 4.1: Verify prompt limits are seeded
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM system_config WHERE category = 'limits') >= 4
        THEN '✅ PASS: Prompt limits seeded (' || (SELECT COUNT(*) FROM system_config WHERE category = 'limits') || ' records)'
        ELSE '❌ FAIL: Prompt limits not seeded'
    END as test_4_1;

-- Test 4.2: Verify pricing config is seeded
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM system_config WHERE category = 'pricing') >= 3
        THEN '✅ PASS: Pricing config seeded (' || (SELECT COUNT(*) FROM system_config WHERE category = 'pricing') || ' records)'
        ELSE '❌ FAIL: Pricing config not seeded'
    END as test_4_2;

-- Test 4.3: Verify API config is seeded
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM system_config WHERE category = 'api') >= 2
        THEN '✅ PASS: API config seeded (' || (SELECT COUNT(*) FROM system_config WHERE category = 'api') || ' records)'
        ELSE '❌ FAIL: API config not seeded'
    END as test_4_3;

-- Test 4.4: Verify technical constants are seeded
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM system_config WHERE category = 'technical') >= 12
        THEN '✅ PASS: Technical constants seeded (' || (SELECT COUNT(*) FROM system_config WHERE category = 'technical') || ' records)'
        ELSE '❌ FAIL: Technical constants not seeded'
    END as test_4_4;

-- Test 4.5: Verify specific critical values
SELECT 
    CASE 
        WHEN (SELECT value FROM system_config WHERE key = 'prompt_soft_limit') = '5000'::jsonb
        THEN '✅ PASS: prompt_soft_limit = 5000'
        ELSE '❌ FAIL: prompt_soft_limit incorrect'
    END as test_4_5;

-- Test 4.6: Verify tokens_per_million constant
SELECT 
    CASE 
        WHEN (SELECT value FROM system_config WHERE key = 'tokens_per_million') = '1000000'::jsonb
        THEN '✅ PASS: tokens_per_million = 1000000'
        ELSE '❌ FAIL: tokens_per_million incorrect'
    END as test_4_6;

-- Test 4.7: Verify token estimation multipliers
SELECT 
    CASE 
        WHEN (
            SELECT COUNT(*) FROM system_config 
            WHERE key IN ('tiktoken_chars_per_token', 'sentencepiece_chars_per_token', 'bytebpe_chars_per_token')
        ) = 3
        THEN '✅ PASS: Token estimation multipliers seeded'
        ELSE '❌ FAIL: Token estimation multipliers missing'
    END as test_4_7;

-- =============================================
-- TEST SUITE 5: SEED DATA - PROVIDER_CONFIG
-- =============================================

-- Test 5.1: Verify all providers are seeded
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM provider_config) = 9
        THEN '✅ PASS: All 9 providers seeded'
        ELSE '❌ FAIL: Expected 9 providers, found ' || (SELECT COUNT(*) FROM provider_config)
    END as test_5_1;

-- Test 5.2: Verify OpenAI provider config
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM provider_config 
            WHERE provider = 'openai' 
            AND is_enabled = true 
            AND rate_limit_rpm = 3500
        )
        THEN '✅ PASS: OpenAI provider configured correctly'
        ELSE '❌ FAIL: OpenAI provider config incorrect'
    END as test_5_2;

-- Test 5.3: Verify Anthropic provider config
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM provider_config 
            WHERE provider = 'anthropic' 
            AND is_enabled = true 
            AND rate_limit_rpm = 3500
        )
        THEN '✅ PASS: Anthropic provider configured correctly'
        ELSE '❌ FAIL: Anthropic provider config incorrect'
    END as test_5_3;

-- Test 5.4: Verify Gemini provider config
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM provider_config 
            WHERE provider = 'gemini' 
            AND is_enabled = true 
            AND max_output_cap = 8192
        )
        THEN '✅ PASS: Gemini provider configured correctly'
        ELSE '❌ FAIL: Gemini provider config incorrect'
    END as test_5_4;

-- Test 5.5: Verify all providers have timeout_seconds
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM provider_config WHERE timeout_seconds IS NOT NULL) = 9
        THEN '✅ PASS: All providers have timeout configured'
        ELSE '❌ FAIL: Some providers missing timeout'
    END as test_5_5;

-- Test 5.6: Verify all providers have retry_count
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM provider_config WHERE retry_count IS NOT NULL) = 9
        THEN '✅ PASS: All providers have retry_count configured'
        ELSE '❌ FAIL: Some providers missing retry_count'
    END as test_5_6;

-- =============================================
-- TEST SUITE 6: HELPER FUNCTIONS
-- =============================================

-- Test 6.1: Verify get_system_config function exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'get_system_config'
        )
        THEN '✅ PASS: get_system_config function exists'
        ELSE '❌ FAIL: get_system_config function missing'
    END as test_6_1;

-- Test 6.2: Verify get_system_config_by_category function exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'get_system_config_by_category'
        )
        THEN '✅ PASS: get_system_config_by_category function exists'
        ELSE '❌ FAIL: get_system_config_by_category function missing'
    END as test_6_2;

-- Test 6.3: Verify get_provider_config function exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'get_provider_config'
        )
        THEN '✅ PASS: get_provider_config function exists'
        ELSE '❌ FAIL: get_provider_config function missing'
    END as test_6_3;

-- Test 6.4: Test get_system_config function
SELECT 
    CASE 
        WHEN get_system_config('prompt_soft_limit') = '5000'::jsonb
        THEN '✅ PASS: get_system_config returns correct value'
        ELSE '❌ FAIL: get_system_config returned: ' || COALESCE(get_system_config('prompt_soft_limit')::text, 'NULL')
    END as test_6_4;

-- Test 6.5: Test get_system_config_by_category function
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM get_system_config_by_category('limits')) >= 4
        THEN '✅ PASS: get_system_config_by_category returns limits'
        ELSE '❌ FAIL: get_system_config_by_category returned wrong count'
    END as test_6_5;

-- Test 6.6: Test get_provider_config function
SELECT 
    CASE 
        WHEN (SELECT is_enabled FROM get_provider_config('openai') LIMIT 1) = true
        THEN '✅ PASS: get_provider_config returns correct provider'
        ELSE '❌ FAIL: get_provider_config returned wrong data'
    END as test_6_6;

-- =============================================
-- TEST SUITE 7: TRIGGERS
-- =============================================

-- Test 7.1: Verify triggers exist
SELECT 
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.triggers 
            WHERE trigger_name LIKE 'trigger_%_updated_at'
        ) >= 2
        THEN '✅ PASS: Update triggers exist'
        ELSE '❌ FAIL: Update triggers missing'
    END as test_7_1;

-- =============================================
-- TEST SUITE 8: ROW LEVEL SECURITY
-- =============================================

-- Test 8.1: Verify RLS is enabled on system_config
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'system_config' 
            AND rowsecurity = true
        )
        THEN '✅ PASS: RLS enabled on system_config'
        ELSE '❌ FAIL: RLS not enabled on system_config'
    END as test_8_1;

-- Test 8.2: Verify RLS is enabled on provider_config
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'provider_config' 
            AND rowsecurity = true
        )
        THEN '✅ PASS: RLS enabled on provider_config'
        ELSE '❌ FAIL: RLS not enabled on provider_config'
    END as test_8_2;

-- =============================================
-- TEST SUITE 9: DATA INTEGRITY
-- =============================================

-- Test 9.1: Verify no duplicate keys in system_config
SELECT 
    CASE 
        WHEN (SELECT COUNT(DISTINCT key) FROM system_config) = (SELECT COUNT(*) FROM system_config)
        THEN '✅ PASS: No duplicate keys in system_config'
        ELSE '❌ FAIL: Duplicate keys found in system_config'
    END as test_9_1;

-- Test 9.2: Verify no duplicate providers in provider_config
SELECT 
    CASE 
        WHEN (SELECT COUNT(DISTINCT provider) FROM provider_config) = (SELECT COUNT(*) FROM provider_config)
        THEN '✅ PASS: No duplicate providers in provider_config'
        ELSE '❌ FAIL: Duplicate providers found'
    END as test_9_2;

-- Test 9.3: Verify all system_config values are valid JSON
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM system_config WHERE value IS NULL) = 0
        THEN '✅ PASS: All system_config values are non-null'
        ELSE '❌ FAIL: Found NULL values in system_config'
    END as test_9_3;

-- =============================================
-- SUMMARY REPORT
-- =============================================

SELECT 
    '═══════════════════════════════════════════════════════════════' as separator,
    'PHASE 1 MIGRATION TEST SUMMARY' as title,
    '═══════════════════════════════════════════════════════════════' as separator_2,
    'Total system_config records: ' || (SELECT COUNT(*) FROM system_config) as system_config_count,
    'Total provider_config records: ' || (SELECT COUNT(*) FROM provider_config) as provider_config_count,
    'System config categories: ' || (SELECT STRING_AGG(DISTINCT category, ', ' ORDER BY category) FROM system_config) as categories,
    'Providers configured: ' || (SELECT STRING_AGG(provider, ', ' ORDER BY provider) FROM provider_config) as providers,
    '═══════════════════════════════════════════════════════════════' as separator_3;

-- =============================================
-- END OF TESTS
-- =============================================
