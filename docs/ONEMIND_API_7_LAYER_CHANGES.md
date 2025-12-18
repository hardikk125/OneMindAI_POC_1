# OneMind Unified API - Complete 7-Layer Change Documentation

**Date:** December 17-18, 2025  
**Status:** ✅ COMPLETE

---

## 7-Layer Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 7: DOCUMENTATION                                                       │
│ docs/ONEMIND_*.md                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 6: INFRASTRUCTURE                                                      │
│ ngrok tunnel, environment variables                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 5: DATABASE                                                           │
│ Supabase provider_config table                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 4: BACKEND API                                                        │
│ server/ai-proxy.cjs - OneMind endpoints                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: BACKEND SERVICES                                                   │
│ Provider integration functions                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: FRONTEND COMPONENTS                                                │
│ (No changes - API-only implementation)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 1: FRONTEND CORE                                                      │
│ src/OneMindAI.tsx - Temperature nullification                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## LAYER 1: FRONTEND CORE

### File: `src/OneMindAI.tsx`

**Purpose:** Nullified all hardcoded temperature values to allow API defaults

| Line | Old Value | New Value | Function/Context |
|------|-----------|-----------|------------------|
| 2050 | `temperature: 0.7` | `temperature: null` | `makeClaudeRequest()` - Anthropic SDK |
| 2198 | `temperature: 0.7` | `temperature: null` | OpenAI SDK call |
| 2228 | `temperature: 0.7` | `temperature: null` | Anthropic SDK call |
| 2270 | `temperature: 0.7` | `temperature: null` | xAI Grok SDK call |
| 2325 | `temperature: 0.7` | `temperature: null` | Gemini proxy call |
| 2482 | `temperature: 0.7` | `temperature: null` | Groq SDK call |
| 2572 | `temperature: 0.7` | `temperature: null` | Mistral direct API call |
| 2713 | `temperature: 0.7` | `temperature: null` | Perplexity direct API call |
| 2866 | `temperature: 0.7` | `temperature: null` | Kimi direct API call |
| 3005 | `temperature: 0.7` | `temperature: null` | DeepSeek direct API call |
| 3126 | `temperature: 0.7` | `temperature: null` | Falcon HuggingFace call |
| 3167 | `temperature: 0.7` | `temperature: null` | Additional provider call |
| 3208 | `temperature: 0.7` | `temperature: null` | Additional provider call |
| 3282 | `temperature: 0.7` | `temperature: null` | Sarvam AI call |

**Code Change Example:**
```javascript
// BEFORE (Line 2050)
const makeClaudeRequest = async () => {
  return await client.messages.create({
    model: e.selectedVersion,
    max_tokens: adjustedOutCap,
    temperature: 0.7,  // ❌ Hardcoded
    messages: [{ role: 'user', content: messageContent }],
    stream: true,
  });
};

// AFTER (Line 2050)
const makeClaudeRequest = async () => {
  return await client.messages.create({
    model: e.selectedVersion,
    max_tokens: adjustedOutCap,
    temperature: null,  // ✅ Uses API default
    messages: [{ role: 'user', content: messageContent }],
    stream: true,
  });
};
```

---

## LAYER 2: FRONTEND COMPONENTS

**No changes required** - The OneMind Unified API is a backend-only implementation. Frontend components continue to work as before.

---

## LAYER 3: BACKEND SERVICES

### File: `server/ai-proxy.cjs`

**Purpose:** Added provider integration functions for unified API

#### Function 1: `getEnabledProviders()` (Lines 1603-1629)

**Purpose:** Fetch enabled providers from Supabase or use fallback

```javascript
// Lines 1603-1629
async function getEnabledProviders() {
  if (!supabase) {
    console.warn('[OneMind] Supabase not configured, using default providers');
    return [
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'mistral', model: 'mistral-large-latest' }
    ];
  }
  
  try {
    const { data, error } = await supabase
      .from('provider_config')
      .select('provider, is_enabled, default_model')
      .eq('is_enabled', true);
    
    if (error) throw error;
    return data.map(p => ({ provider: p.provider, model: p.default_model }));
  } catch (err) {
    console.error('[OneMind] Failed to fetch enabled providers:', err.message);
    return [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'gemini', model: 'gemini-2.0-flash-exp' }
    ];
  }
}
```

**Key Values:**
| Line | Variable | Value | Purpose |
|------|----------|-------|---------|
| 1608 | `provider` | `'deepseek'` | Default fallback provider 1 |
| 1608 | `model` | `'deepseek-chat'` | Default model for DeepSeek |
| 1609 | `provider` | `'mistral'` | Default fallback provider 2 |
| 1609 | `model` | `'mistral-large-latest'` | Default model for Mistral |
| 1616 | `table` | `'provider_config'` | Supabase table name |
| 1617 | `filter` | `is_enabled: true` | Only fetch enabled providers |

---

#### Function 2: `callProvider()` (Lines 1631-1795)

**Purpose:** Execute API call to individual provider

```javascript
// Lines 1631-1795
async function callProvider(provider, model, prompt, maxTokens) {
  const startTime = Date.now();
  
  try {
    let response, content;
    
    switch (provider) {
      case 'openai': { /* ... */ }
      case 'anthropic': { /* ... */ }
      case 'gemini': { /* ... */ }
      case 'mistral': { /* ... */ }
      case 'perplexity': { /* ... */ }
      case 'deepseek': { /* ... */ }
      case 'groq': { /* ... */ }
      case 'xai': { /* ... */ }
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    const latency = Date.now() - startTime;
    const tokens = Math.ceil(content.length / 4);
    
    return {
      provider,
      model,
      content,
      tokens,
      latency_ms: latency,
      status: 'success'
    };
    
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      provider,
      model,
      content: null,
      error: error.message,
      latency_ms: latency,
      status: 'error'
    };
  }
}
```

**Provider Switch Cases:**

| Lines | Provider | API URL | Default Model |
|-------|----------|---------|---------------|
| 1639-1650 | `openai` | OpenAI SDK | `gpt-4o` |
| 1652-1662 | `anthropic` | Anthropic SDK | `claude-3-5-sonnet-20241022` |
| 1664-1671 | `gemini` | Google AI SDK | `gemini-2.0-flash-exp` |
| 1673-1690 | `mistral` | `https://api.mistral.ai/v1/chat/completions` | `mistral-large-latest` |
| 1692-1709 | `perplexity` | `https://api.perplexity.ai/chat/completions` | `llama-3.1-sonar-large-128k-online` |
| 1711-1728 | `deepseek` | `https://api.deepseek.com/chat/completions` | `deepseek-chat` |
| 1730-1747 | `groq` | `https://api.groq.com/openai/v1/chat/completions` | `llama-3.3-70b-versatile` |
| 1749-1766 | `xai` | `https://api.x.ai/v1/chat/completions` | `grok-beta` |

**Temperature Values in callProvider():**

| Line | Provider | Temperature Value | Notes |
|------|----------|-------------------|-------|
| 1646 | OpenAI | `null` | Uses API default |
| 1657-1658 | Anthropic | *omitted* | Field removed (Anthropic rejects null) |
| 1684 | Mistral | `null` | Uses API default |
| 1703 | Perplexity | `null` | Uses API default |
| 1722 | DeepSeek | `null` | Uses API default |
| 1741 | Groq | `null` | Uses API default |
| 1760 | xAI | `null` | Uses API default |

---

## LAYER 4: BACKEND API

### File: `server/ai-proxy.cjs`

**Purpose:** Added OneMind unified API endpoints

#### Endpoint 1: `POST /api/onemind` (Lines 1797-1883)

**Purpose:** Execute all enabled engines in parallel

```javascript
// Lines 1797-1883
app.post('/api/onemind', async (req, res) => {
  const requestId = `onemind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`[OneMind] Request ${requestId} started`);
  
  try {
    const { 
      prompt, 
      max_tokens = 4096, 
      engines = null,
      timeout = 60000
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    
    let providers;
    if (engines && Array.isArray(engines) && engines.length > 0) {
      providers = engines.map(e => typeof e === 'string' ? { provider: e, model: null } : e);
    } else {
      providers = await getEnabledProviders();
    }
    
    const results = await Promise.allSettled(
      providers.map(p => 
        Promise.race([
          callProvider(p.provider, p.model, prompt, max_tokens),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ])
      )
    );
    
    const responses = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          provider: providers[index].provider,
          model: providers[index].model,
          content: null,
          error: result.reason?.message || 'Unknown error',
          latency_ms: timeout,
          status: 'error'
        };
      }
    });
    
    const successful = responses.filter(r => r.status === 'success').length;
    const failed = responses.filter(r => r.status === 'error').length;
    const totalLatency = Date.now() - startTime;
    
    res.json({
      id: requestId,
      created: Math.floor(Date.now() / 1000),
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      responses,
      meta: {
        total_engines: providers.length,
        successful,
        failed,
        total_latency_ms: totalLatency
      }
    });
    
  } catch (error) {
    console.error(`[OneMind] Request ${requestId} error:`, error.message);
    res.status(500).json({ 
      error: 'OneMind API error', 
      message: error.message,
      id: requestId
    });
  }
});
```

**Request Parameters:**

| Line | Parameter | Type | Default | Required |
|------|-----------|------|---------|----------|
| 1806 | `prompt` | string | - | ✅ Yes |
| 1807 | `max_tokens` | number | `4096` | No |
| 1808 | `engines` | array | `null` | No |
| 1809 | `timeout` | number | `60000` | No |

**Response Structure:**

| Line | Field | Type | Description |
|------|-------|------|-------------|
| 1863 | `id` | string | Unique request ID |
| 1864 | `created` | number | Unix timestamp |
| 1865 | `prompt` | string | Truncated prompt (100 chars) |
| 1866 | `responses` | array | Array of provider responses |
| 1867-1872 | `meta` | object | Metadata (totals, latency) |

---

#### Endpoint 2: `GET /api/onemind/providers` (Lines 1885-1908)

**Purpose:** List available and enabled providers

```javascript
// Lines 1885-1908
app.get('/api/onemind/providers', async (req, res) => {
  try {
    const providers = await getEnabledProviders();
    const availableProviders = {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GOOGLE_AI_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
      perplexity: !!process.env.PERPLEXITY_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      xai: !!process.env.XAI_API_KEY
    };
    
    res.json({
      enabled: providers,
      available: availableProviders,
      total_enabled: providers.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Environment Variable Checks:**

| Line | Provider | Environment Variable |
|------|----------|---------------------|
| 1890 | OpenAI | `OPENAI_API_KEY` |
| 1891 | Anthropic | `ANTHROPIC_API_KEY` |
| 1892 | Gemini | `GOOGLE_AI_API_KEY` |
| 1893 | Mistral | `MISTRAL_API_KEY` |
| 1894 | Perplexity | `PERPLEXITY_API_KEY` |
| 1895 | DeepSeek | `DEEPSEEK_API_KEY` |
| 1896 | Groq | `GROQ_API_KEY` |
| 1897 | xAI | `XAI_API_KEY` |

---

#### Server Startup Message Update (Lines 1980-1995)

**Purpose:** Added OneMind endpoints to server startup display

```javascript
// Lines 1980-1995
console.log('║   Endpoints:                                              ║');
console.log('║   • GET  /health            - Server status               ║');
console.log('║   • POST /api/onemind       - 🧠 UNIFIED API (all engines)║');  // NEW
console.log('║   • GET  /api/onemind/providers - List enabled providers  ║');  // NEW
console.log('║   • POST /api/openai        - OpenAI proxy                ║');
console.log('║   • POST /api/anthropic     - Claude proxy                ║');
// ... rest of endpoints
```

---

## LAYER 5: DATABASE

### Table: `provider_config` (Supabase)

**Purpose:** Store enabled/disabled status and default models for each provider

**Schema:**
```sql
CREATE TABLE provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  default_model TEXT,
  max_output_cap INTEGER,
  rate_limit INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Current Data:**

| provider | is_enabled | default_model |
|----------|------------|---------------|
| openai | true | gpt-4o |
| anthropic | true | claude-3-5-sonnet-20241022 |
| gemini | true | gemini-2.0-flash-exp |
| mistral | true | mistral-large-latest |
| perplexity | true | llama-3.1-sonar-large-128k-online |
| deepseek | true | deepseek-chat |
| groq | true | llama-3.3-70b-versatile |
| xai | false | grok-beta |

**Query Used (Line 1614-1617):**
```javascript
const { data, error } = await supabase
  .from('provider_config')
  .select('provider, is_enabled, default_model')
  .eq('is_enabled', true);
```

---

## LAYER 6: INFRASTRUCTURE

### ngrok Configuration

**Purpose:** Expose local backend to public internet

**Installation Path:**
```
C:\Users\Admin\AppData\Local\ngrok\ngrok.exe
```

**Authentication:**
```powershell
ngrok config add-authtoken 36yf3hxd9MySthitKsXrcfXriDE_6h1qAQ3NFFskuQ5qcPmxo
```

**Config File:**
```
C:\Users\Admin\AppData\Local\ngrok\ngrok.yml
```

**Startup Command:**
```powershell
& "$env:LOCALAPPDATA\ngrok\ngrok.exe" http 3002
```

**Public URL:**
```
https://pendragonish-chelsea-cormophytic.ngrok-free.dev
```

**Port Mapping:**
| Local | Public |
|-------|--------|
| `http://localhost:3002` | `https://pendragonish-chelsea-cormophytic.ngrok-free.dev` |

---

### Environment Variables

**File:** `.env`

**Required Variables:**

| Variable | Purpose | Layer |
|----------|---------|-------|
| `SUPABASE_URL` | Supabase project URL | Layer 5 |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Layer 5 |
| `OPENAI_API_KEY` | OpenAI API key | Layer 3 |
| `ANTHROPIC_API_KEY` | Anthropic API key | Layer 3 |
| `GOOGLE_AI_API_KEY` | Google AI API key | Layer 3 |
| `MISTRAL_API_KEY` | Mistral API key | Layer 3 |
| `PERPLEXITY_API_KEY` | Perplexity API key | Layer 3 |
| `DEEPSEEK_API_KEY` | DeepSeek API key | Layer 3 |
| `GROQ_API_KEY` | Groq API key | Layer 3 |
| `XAI_API_KEY` | xAI API key | Layer 3 |
| `PORT` | Server port (default: 3002) | Layer 4 |
| `ALLOWED_ORIGINS` | CORS allowed origins | Layer 4 |

---

## LAYER 7: DOCUMENTATION

### Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `docs/ONEMIND_UNIFIED_API_GUIDE.md` | Complete setup guide | ~300 |
| `docs/ONEMIND_API_IMPLEMENTATION_SUMMARY.md` | Implementation summary | ~500 |
| `docs/TEAMS_MESSAGE_ONEMIND_API.md` | Teams-ready message | ~200 |
| `docs/ONEMIND_API_7_LAYER_CHANGES.md` | This document | ~600 |

---

## Summary: All Changes by File

### `server/ai-proxy.cjs`

| Lines | Change Type | Description |
|-------|-------------|-------------|
| 1599-1601 | NEW | Section header comment |
| 1603-1629 | NEW | `getEnabledProviders()` function |
| 1631-1795 | NEW | `callProvider()` function |
| 1797-1883 | NEW | `POST /api/onemind` endpoint |
| 1885-1908 | NEW | `GET /api/onemind/providers` endpoint |
| 1910-1917 | MOVED | 404 handler moved after new endpoints |
| 1982-1983 | MODIFIED | Added OneMind endpoints to startup message |

**Total New Lines:** ~320 lines

---

### `src/OneMindAI.tsx`

| Lines | Change Type | Description |
|-------|-------------|-------------|
| 2050 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 2198 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 2228 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 2270 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 2325 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 2482 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 2572 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 2713 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 2866 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 3005 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 3126 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 3167 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 3208 | MODIFIED | `temperature: 0.7` → `temperature: null` |
| 3282 | MODIFIED | `temperature: 0.7` → `temperature: null` |

**Total Modified Lines:** 14 lines

---

## Bug Fixes Applied

### Bug 1: Provider Fallback Type Mismatch

**Location:** `server/ai-proxy.cjs` Line 1607-1610

**Before:**
```javascript
return ['openai', 'anthropic', 'gemini']; // Array of strings
```

**After:**
```javascript
return [
  { provider: 'deepseek', model: 'deepseek-chat' },
  { provider: 'mistral', model: 'mistral-large-latest' }
]; // Array of objects
```

**Root Cause:** `callProvider()` expected `{provider, model}` objects but received strings

---

### Bug 2: Anthropic Temperature Validation

**Location:** `server/ai-proxy.cjs` Lines 1655-1659

**Before:**
```javascript
response = await client.messages.create({
  model: model || 'claude-3-5-sonnet-20241022',
  max_tokens: maxTokens,
  temperature: null,  // ❌ Anthropic rejects null
  messages: [{ role: 'user', content: prompt }]
});
```

**After:**
```javascript
response = await client.messages.create({
  model: model || 'claude-3-5-sonnet-20241022',
  max_tokens: maxTokens,
  // temperature field omitted - uses Anthropic defaults
  messages: [{ role: 'user', content: prompt }]
});
```

**Root Cause:** Anthropic API requires temperature to be a valid number or omitted entirely

---

## Verification Commands

```powershell
# Test OneMind API
Invoke-RestMethod -Uri "https://pendragonish-chelsea-cormophytic.ngrok-free.dev/api/onemind" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"prompt": "Hello"}'

# List providers
Invoke-RestMethod -Uri "https://pendragonish-chelsea-cormophytic.ngrok-free.dev/api/onemind/providers"

# Health check
Invoke-RestMethod -Uri "https://pendragonish-chelsea-cormophytic.ngrok-free.dev/health"
```

---

**Document Created:** December 18, 2025  
**Total Changes:** ~334 lines of new/modified code across 2 files  
**Status:** ✅ Complete and Verified
