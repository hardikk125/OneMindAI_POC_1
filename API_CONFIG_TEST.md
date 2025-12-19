# API Config Whitelist Testing Guide

## Prerequisites
1. Run the migration: `008_api_config_extension.sql` in Supabase
2. Ensure backend is running on `http://localhost:3002`
3. Have curl or Postman installed

## Test Scenarios

### 1. Test Provider Whitelist Enforcement

**Setup:**
- Go to Admin Panel → API Configuration
- Disable a provider (e.g., "openai")
- Note the provider name

**Test Request:**
```bash
curl -X POST http://localhost:3002/api/onemind \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello world",
    "max_tokens": 100,
    "engines": ["openai"]
  }'
```

**Expected Response (403):**
```json
{
  "error": "All requested providers/models are disabled",
  "blocked": [
    {
      "provider": "openai",
      "model": null,
      "reason": "Provider 'openai' is disabled"
    }
  ]
}
```

---

### 2. Test Model Whitelist Enforcement

**Setup:**
- Go to Admin Panel → API Configuration → Model Whitelist
- Find a specific model (e.g., "gpt-4o" from OpenAI)
- Disable it (toggle off)

**Test Request:**
```bash
curl -X POST http://localhost:3002/api/onemind \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello world",
    "max_tokens": 100,
    "engines": [
      {
        "provider": "openai",
        "model": "gpt-4o"
      }
    ]
  }'
```

**Expected Response (403):**
```json
{
  "error": "All requested providers/models are disabled",
  "blocked": [
    {
      "provider": "openai",
      "model": "gpt-4o",
      "reason": "Model 'gpt-4o' is disabled"
    }
  ]
}
```

---

### 3. Test Allowed Model (Should Work)

**Setup:**
- Ensure at least one model is enabled in the admin panel
- Note the provider and model name

**Test Request:**
```bash
curl -X POST http://localhost:3002/api/onemind \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello world",
    "max_tokens": 100,
    "engines": [
      {
        "provider": "openai",
        "model": "gpt-4o-mini"
      }
    ]
  }'
```

**Expected Response (200):**
```json
{
  "responses": [
    {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "content": "...",
      "status": "success",
      "latency_ms": 1234
    }
  ],
  "total_latency_ms": 1234
}
```

---

### 4. Test Streaming Endpoint

**Setup:**
- Disable a model in admin panel
- Note the provider and model

**Test Request:**
```bash
curl -X POST http://localhost:3002/api/onemind/stream \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello world",
    "max_tokens": 100,
    "provider": "mistral",
    "model": "mistral-large-latest"
  }'
```

**Expected Response (if disabled):**
```
data: {"error":"Model 'mistral-large-latest' is disabled","blocked":true}
```

---

## Debugging

### Check Database Cache
The backend caches config for 5 minutes. To force refresh:
1. Restart the backend server
2. Or wait 5 minutes for cache to expire

### View Backend Logs
Look for these log messages:
```
[Config] Provider and model config loaded from database
[OneMind] Blocked providers/models: [...]
[OneMind Stream] Blocked: Model 'xxx' is disabled
```

### Verify Database Data
Run in Supabase SQL Editor:
```sql
-- Check provider status
SELECT provider, is_enabled FROM provider_config;

-- Check model status
SELECT provider, model_id, display_name, is_active FROM ai_models ORDER BY provider;
```

---

## Quick Test Script

Save as `test-api-config.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3002"

echo "=== Testing API Config Whitelist ==="
echo ""

# Test 1: Disabled provider
echo "Test 1: Request with disabled provider (openai)"
curl -s -X POST $BASE_URL/api/onemind \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","max_tokens":100,"engines":["openai"]}' | jq .

echo ""
echo "---"
echo ""

# Test 2: Disabled model
echo "Test 2: Request with disabled model (gpt-4o)"
curl -s -X POST $BASE_URL/api/onemind \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","max_tokens":100,"engines":[{"provider":"openai","model":"gpt-4o"}]}' | jq .

echo ""
echo "---"
echo ""

# Test 3: Enabled model (should work)
echo "Test 3: Request with enabled model (gpt-4o-mini)"
curl -s -X POST $BASE_URL/api/onemind \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","max_tokens":100,"engines":[{"provider":"openai","model":"gpt-4o-mini"}]}' | jq .
```

Run with:
```bash
chmod +x test-api-config.sh
./test-api-config.sh
```

---

## Testing Checklist

- [ ] Provider disabled → 403 error
- [ ] Model disabled → 403 error  
- [ ] Provider enabled, model enabled → 200 success
- [ ] Streaming with disabled model → Error in SSE stream
- [ ] Cache refreshes after 5 minutes
- [ ] Admin panel updates reflect in API within 5 minutes
