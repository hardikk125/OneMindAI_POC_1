# API Config Whitelist - Setup & Testing Guide

## Current Status

The whitelist validation code is in place, but requires:
1. **Supabase credentials** in `.env` file
2. **Database migrations** executed in Supabase
3. **Data populated** in `provider_config` and `ai_models` tables

---

## Step 1: Set Up Supabase Credentials

Create a `.env` file in the project root:

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here
```

**How to get these:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_KEY`

---

## Step 2: Run Database Migrations

In Supabase SQL Editor, execute these migrations in order:

### Migration 1: AI Models Table
Copy entire contents of `supabase/migrations/007_ai_models_config.sql` and run it.

### Migration 2: API Config Extension
Copy entire contents of `supabase/migrations/008_api_config_extension.sql` and run it.

**Expected output:** No errors, tables created/updated.

---

## Step 3: Verify Database Data

Run these queries in Supabase SQL Editor to verify data was inserted:

```sql
-- Check providers
SELECT provider, is_enabled FROM provider_config ORDER BY provider;

-- Check models
SELECT provider, model_id, display_name, is_active FROM ai_models LIMIT 20;

-- Check global settings
SELECT key, value FROM system_config WHERE category = 'api';
```

**Expected:** 
- 12 providers (openai, anthropic, gemini, etc.)
- Multiple models per provider
- Global API settings populated

---

## Step 4: Test the Whitelist

### Option A: Using Node Test Script

```bash
# Make sure backend is running
npm run dev

# In another terminal
node test-whitelist.js
```

### Option B: Manual Testing with PowerShell

```powershell
# Test 1: Disabled provider (should return 403)
$body = @{
    prompt = "test"
    max_tokens = 100
    engines = @("openai")
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3002/api/onemind" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertTo-Json
```

**Expected response if whitelist is working:**
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

## Step 5: Test via Admin Panel

1. **Login to Admin Panel** (as admin user)
2. **Navigate to:** Settings → API Configuration
3. **Model Whitelist section:**
   - See list of all models
   - Toggle a model OFF
   - Note the model name
4. **Test the API:**
   ```powershell
   $body = @{
       prompt = "test"
       max_tokens = 100
       engines = @(@{provider="openai"; model="gpt-4o"})
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3002/api/onemind" `
     -Method POST `
     -Headers @{"Content-Type"="application/json"} `
     -Body $body
   ```
5. **Verify:** Should get 403 error with "Model 'gpt-4o' is disabled"

---

## Troubleshooting

### Issue: "All requests still work even with whitelist disabled"

**Cause:** Supabase credentials not set or database empty

**Fix:**
1. Check `.env` file exists with `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Verify migrations were run in Supabase
3. Check backend logs for: `[Config] Provider and model config loaded from database`
4. Restart backend: `npm run dev`

### Issue: "Cache not refreshing"

**Cause:** Cache TTL is 5 minutes

**Fix:**
1. Restart backend to clear cache immediately
2. Or wait 5 minutes for auto-refresh

### Issue: "Validation logs not showing"

**Cause:** Backend not running or logs not visible

**Fix:**
1. Check backend is running: `npm run dev`
2. Look for `[Validate]` messages in console
3. Check for `[Config]` messages on startup

---

## How It Works

```
User Request
    ↓
/api/onemind endpoint
    ↓
validateModelAccess(provider, model)
    ↓
Check provider_config.is_enabled
    ↓
Check ai_models.is_active
    ↓
If disabled → Return 403 error
If enabled → Call provider API
```

---

## Cache Behavior

- **First request:** Loads from Supabase (slow)
- **Next 5 minutes:** Uses cache (fast)
- **After 5 minutes:** Refreshes from Supabase

To force refresh: Restart backend

---

## Testing Checklist

- [ ] `.env` file created with Supabase credentials
- [ ] Migrations 007 and 008 executed in Supabase
- [ ] Database queries show data populated
- [ ] Backend logs show `[Config] Provider and model config loaded`
- [ ] Test script runs without errors
- [ ] Disabled provider returns 403 error
- [ ] Disabled model returns 403 error
- [ ] Enabled model returns 200 success
- [ ] Admin panel shows all models and providers
- [ ] Toggling in admin panel reflects in API within 5 minutes

---

## Next Steps

1. **Set up `.env` file** with Supabase credentials
2. **Run migrations** in Supabase
3. **Restart backend** and verify logs
4. **Run test script** to confirm whitelist is working
5. **Test via admin panel** by disabling a model and verifying API blocks it

