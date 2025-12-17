# Environment Variables in Database vs .ENV + API Rotation Strategy

**Document Version:** 1.0  
**Created:** December 13, 2025  
**Purpose:** Explain why NOT to store env vars in database + API rotation architecture for multiple users

---

# 📋 TABLE OF CONTENTS

1. [Why NOT to Store ENV in Database](#why-not-env-db)
2. [What Should Stay in .ENV](#what-stays-env)
3. [API Rotation Architecture](#api-rotation)
4. [Multi-User API Key Management](#multi-user-keys)
5. [Implementation Guide](#implementation)

---

# 🚫 WHY NOT TO STORE ENV IN DATABASE {#why-not-env-db}

## The Core Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WHY ENV VARS MUST STAY IN .ENV                          │
│                                                                             │
│  SECURITY PRINCIPLE: "Secrets should never be in queryable storage"         │
│                                                                             │
│  If you put API keys in database:                                           │
│  1. Database breach = All API keys exposed                                  │
│  2. Database logs might capture keys                                        │
│  3. Backups contain unencrypted keys                                        │
│  4. Any code that queries database could log the key                        │
│  5. Developers might accidentally commit database dumps                      │
│                                                                             │
│  If you keep API keys in .ENV:                                              │
│  1. .ENV is never committed to git                                          │
│  2. .ENV is not backed up                                                   │
│  3. Only server process reads it (not queryable)                            │
│  4. Separate from application data                                          │
│  5. Easy to rotate without touching database                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Real-World Attack Scenarios

### Scenario 1: Database Breach

```
STORING KEYS IN DATABASE:
═════════════════════════════════════════════════════════════════════════════

Attacker gains database access
    │
    ▼
SELECT * FROM system_config WHERE key LIKE '%API_KEY%'
    │
    ▼
Gets all API keys:
  • OPENAI_API_KEY = sk-proj-abc123...
  • ANTHROPIC_API_KEY = sk-ant-xyz789...
  • GOOGLE_AI_API_KEY = AIza...
  • HUBSPOT_CLIENT_SECRET = pat-...
    │
    ▼
Attacker can:
  • Make unlimited API calls (bill YOU)
  • Access your HubSpot data
  • Impersonate your service
  • Cost: $10,000+ in fraudulent API calls


KEEPING KEYS IN .ENV:
═════════════════════════════════════════════════════════════════════════════

Attacker gains database access
    │
    ▼
SELECT * FROM system_config
    │
    ▼
Gets config data:
  • prompt_soft_limit = 5000
  • pricing = {...}
  • model_list = {...}
    │
    ▼
Attacker can:
  • See your business logic
  • See your pricing
  • But CANNOT make API calls (keys not in DB)
  • Cost: Data exposure only, not financial
```

### Scenario 2: Accidental Logging

```
STORING KEYS IN DATABASE:
═════════════════════════════════════════════════════════════════════════════

Code: const config = await db.query('SELECT * FROM system_config');
console.log('Config loaded:', config);  // ← OOPS! Logs to stdout

Logs now contain:
  Config loaded: {
    openai_api_key: 'sk-proj-abc123...',
    anthropic_api_key: 'sk-ant-xyz789...',
    ...
  }

Logs are stored in:
  • Application logs (searchable)
  • Cloud logging service (searchable)
  • Log aggregation (searchable)
  • Backups (stored)

Result: Keys exposed to anyone with log access


KEEPING KEYS IN .ENV:
═════════════════════════════════════════════════════════════════════════════

Code: const apiKey = process.env.OPENAI_API_KEY;
console.log('Using API key:', apiKey);  // ← Still bad practice!

But if you do:
  • Only the key is logged, not a full object
  • Environment variables are not queryable
  • Harder to accidentally expose all keys at once
  • Easier to rotate without touching database
```

---

# ✅ WHAT SHOULD STAY IN .ENV {#what-stays-env}

## Secrets That MUST Be in .ENV

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SECRETS THAT MUST STAY IN .ENV                          │
│                                                                             │
│  CATEGORY              │ EXAMPLES                                           │
│  ──────────────────────┼──────────────────────────────────────────────────  │
│  API Keys              │ OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.            │
│  Database Credentials  │ DATABASE_URL, SUPABASE_SERVICE_KEY                 │
│  OAuth Secrets         │ HUBSPOT_CLIENT_SECRET, GITHUB_CLIENT_SECRET        │
│  Signing Keys          │ JWT_SECRET, SESSION_SECRET                         │
│  Encryption Keys       │ ENCRYPTION_KEY, HASH_SALT                          │
│  Third-party Tokens    │ STRIPE_SECRET_KEY, SENDGRID_API_KEY                │
│  Private URLs          │ INTERNAL_API_URL (if not public)                   │
│                                                                             │
│  RULE: If it's a secret or credential, it goes in .ENV                      │
│        If it's business config, it goes in DATABASE                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Correct Separation

```
.ENV FILE (Secrets - Never committed)
═════════════════════════════════════════════════════════════════════════════

# API Keys (SECRETS)
OPENAI_API_KEY=sk-proj-abc123...
ANTHROPIC_API_KEY=sk-ant-xyz789...
GOOGLE_AI_API_KEY=AIza...

# Database (SECRETS)
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...

# OAuth (SECRETS)
HUBSPOT_CLIENT_ID=...
HUBSPOT_CLIENT_SECRET=...

# Environment-specific (NOT secrets, but per-environment)
NODE_ENV=production
AI_PROXY_PORT=3002
VITE_BACKEND_URL=https://api.onemindai.com


SUPABASE DATABASE (Business Config - Queryable)
═════════════════════════════════════════════════════════════════════════════

system_config table:
  key: 'prompt_soft_limit'
  value: 5000
  category: 'limits'

  key: 'prompt_hard_limit'
  value: 10000
  category: 'limits'

  key: 'expected_output_tokens'
  value: 1000
  category: 'pricing'

  key: 'markup_percentage'
  value: 30
  category: 'pricing'

ai_models table:
  id: 'gpt-4o'
  display_name: 'GPT-4o'
  input_price: 2.50
  output_price: 10.00
  is_active: true
```

---

# 🔄 API ROTATION ARCHITECTURE {#api-rotation}

## What is API Rotation?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     API ROTATION EXPLAINED                                  │
│                                                                             │
│  PROBLEM:                                                                   │
│  • One API key = One rate limit                                             │
│  • At 1000 users, you hit OpenAI rate limits quickly                        │
│  • OpenAI: 3,500 RPM per key (for paid accounts)                            │
│  • With 1000 users × 3 req/min = 3000 req/min (OK, but tight)               │
│                                                                             │
│  SOLUTION: API ROTATION                                                     │
│  • Use multiple API keys (round-robin)                                      │
│  • Distribute load across keys                                              │
│  • If one key hits limit, use another                                       │
│  • Increase effective rate limit: 3 keys × 3500 = 10,500 RPM                │
│                                                                             │
│  EXAMPLE:                                                                   │
│  Request 1 → Use Key 1 (OpenAI)                                             │
│  Request 2 → Use Key 2 (OpenAI)                                             │
│  Request 3 → Use Key 3 (OpenAI)                                             │
│  Request 4 → Use Key 1 (OpenAI) ← Cycle back                                │
│                                                                             │
│  BENEFIT: 3× the rate limit without paying 3× more                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Rotation Strategy for Multiple Users

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     API ROTATION ARCHITECTURE                               │
│                                                                             │
│  .ENV FILE (Multiple Keys)                                                  │
│  ═════════════════════════════════════════════════════════════════════════  │
│  OPENAI_API_KEY_1=sk-proj-abc123...                                         │
│  OPENAI_API_KEY_2=sk-proj-def456...                                         │
│  OPENAI_API_KEY_3=sk-proj-ghi789...                                         │
│  ANTHROPIC_API_KEY_1=sk-ant-abc123...                                       │
│  ANTHROPIC_API_KEY_2=sk-ant-def456...                                       │
│                                                                             │
│                                                                             │
│  ROTATION SERVICE (Backend)                                                 │
│  ═════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  API Key Pool Manager                                               │   │
│  │                                                                     │   │
│  │  OpenAI Keys:                                                       │   │
│  │  • Key 1: [sk-proj-abc123...] Status: OK, RPM: 1200/3500           │   │
│  │  • Key 2: [sk-proj-def456...] Status: OK, RPM: 1100/3500           │   │
│  │  • Key 3: [sk-proj-ghi789...] Status: OK, RPM: 800/3500            │   │
│  │                                                                     │   │
│  │  Anthropic Keys:                                                    │   │
│  │  • Key 1: [sk-ant-abc123...] Status: OK, RPM: 900/3500             │   │
│  │  • Key 2: [sk-ant-def456...] Status: RATE_LIMITED, RPM: 3500/3500  │   │
│  │                                                                     │   │
│  │  ROTATION STRATEGY:                                                 │   │
│  │  1. Round-robin: Use keys in sequence                               │   │
│  │  2. Load-aware: Use key with lowest current RPM                     │   │
│  │  3. Fallback: Skip rate-limited keys                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Request Handler                                                     │   │
│  │                                                                     │   │
│  │  User Request                                                       │   │
│  │    │                                                                │   │
│  │    ▼                                                                │   │
│  │  Get next available key (round-robin or load-aware)                 │   │
│  │    │                                                                │   │
│  │    ▼                                                                │   │
│  │  Call AI API with selected key                                      │   │
│  │    │                                                                │   │
│  │    ├─ Success → Return response, increment key usage                │   │
│  │    │                                                                │   │
│  │    └─ Rate Limited (429) → Try next key, log failure                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Redis Cache (Key Metrics)                                           │   │
│  │                                                                     │   │
│  │  ratelimit:openai:key1:minute → 1200                                │   │
│  │  ratelimit:openai:key2:minute → 1100                                │   │
│  │  ratelimit:openai:key3:minute → 800                                 │   │
│  │  ratelimit:anthropic:key1:minute → 900                              │   │
│  │  ratelimit:anthropic:key2:minute → 3500 (FULL)                      │   │
│  │                                                                     │   │
│  │  key:openai:key1:status → 'OK'                                      │   │
│  │  key:openai:key2:status → 'OK'                                      │   │
│  │  key:anthropic:key2:status → 'RATE_LIMITED'                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 👥 MULTI-USER API KEY MANAGEMENT {#multi-user-keys}

## Two Approaches for Multiple Users

### Approach 1: Shared Keys (Recommended for 1000 Users)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     APPROACH 1: SHARED KEYS (Recommended)                   │
│                                                                             │
│  ARCHITECTURE:                                                              │
│  ═════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  Company owns 3 OpenAI keys                                                 │
│  All 1000 users share these 3 keys                                          │
│                                                                             │
│  User 1 ─┐                                                                  │
│  User 2 ─┼─► Load Balancer ─► OpenAI Key 1                                  │
│  User 3 ─┤                 ─► OpenAI Key 2                                  │
│  ...     │                 ─► OpenAI Key 3                                  │
│  User 1000 ┘                                                                │
│                                                                             │
│  BENEFITS:                                                                  │
│  ✓ Simple to implement                                                      │
│  ✓ Easy to rotate keys                                                      │
│  ✓ Cost-effective (3 keys = $20/month)                                      │
│  ✓ Scales to 1000+ users                                                    │
│  ✓ No per-user tracking needed                                              │
│                                                                             │
│  DRAWBACKS:                                                                 │
│  ✗ Can't track which user used which key                                    │
│  ✗ Can't charge users differently by key                                    │
│  ✗ If one key is compromised, all users affected                            │
│                                                                             │
│  BEST FOR:                                                                  │
│  • SaaS with shared infrastructure                                          │
│  • Uniform pricing across users                                             │
│  • High-volume, low-cost service                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Approach 2: Per-User Keys (For Enterprise/Custom Pricing)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     APPROACH 2: PER-USER KEYS (Enterprise)                  │
│                                                                             │
│  ARCHITECTURE:                                                              │
│  ═════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  User 1 ─► Has own OpenAI key (sk-proj-user1...)                            │
│  User 2 ─► Has own OpenAI key (sk-proj-user2...)                            │
│  User 3 ─► Has own OpenAI key (sk-proj-user3...)                            │
│  ...                                                                        │
│  User 100 ─► Has own OpenAI key (sk-proj-user100...)                        │
│                                                                             │
│  Each user's key stored in database (encrypted):                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  user_api_keys table                                                 │   │
│  │                                                                      │   │
│  │  user_id  │ provider │ api_key (encrypted)      │ status             │   │
│  │  ────────┼──────────┼──────────────────────────┼────────────────     │   │
│  │  user1   │ openai   │ enc(sk-proj-user1...)    │ active              │   │
│  │  user1   │ anthropic│ enc(sk-ant-user1...)     │ active              │   │
│  │  user2   │ openai   │ enc(sk-proj-user2...)    │ active              │   │
│  │  user3   │ openai   │ enc(sk-proj-user3...)    │ inactive            │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  BENEFITS:                                                                  │
│  ✓ Track usage per user                                                     │
│  ✓ Charge users based on actual usage                                       │
│  ✓ User can bring their own key (BYOK)                                      │
│  ✓ Isolate users (one key compromise = one user affected)                   │
│  ✓ Per-user rate limits                                                     │
│                                                                             │
│  DRAWBACKS:                                                                 │
│  ✗ Complex to implement                                                     │
│  ✗ Encryption/decryption overhead                                           │
│  ✗ More database queries                                                    │
│  ✗ Key rotation per user is tedious                                         │
│  ✗ Expensive if users don't have keys (you provide them)                    │
│                                                                             │
│  BEST FOR:                                                                  │
│  • Enterprise customers                                                     │
│  • BYOK (Bring Your Own Key) services                                       │
│  • Usage-based billing                                                      │
│  • High-security requirements                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 🛠️ IMPLEMENTATION GUIDE {#implementation}

## Step 1: Set Up Multiple API Keys in .ENV

```bash
# .env file

# OpenAI Keys (3 keys for rotation)
OPENAI_API_KEY_1=sk-proj-abc123...
OPENAI_API_KEY_2=sk-proj-def456...
OPENAI_API_KEY_3=sk-proj-ghi789...

# Anthropic Keys (2 keys)
ANTHROPIC_API_KEY_1=sk-ant-abc123...
ANTHROPIC_API_KEY_2=sk-ant-def456...

# Gemini Keys (2 keys)
GOOGLE_AI_API_KEY_1=AIza...
GOOGLE_AI_API_KEY_2=AIza...

# Other providers (single key is fine for now)
MISTRAL_API_KEY=...
PERPLEXITY_API_KEY=...
DEEPSEEK_API_KEY=...
GROQ_API_KEY=...
XAI_API_KEY=...
KIMI_API_KEY=...
```

## Step 2: Create API Key Pool Manager

```typescript
// server/api-key-pool.ts

interface ApiKeyStatus {
  key: string;
  provider: string;
  index: number;
  status: 'OK' | 'RATE_LIMITED' | 'ERROR';
  requestsThisMinute: number;
  lastUsed: Date;
}

interface ProviderPool {
  provider: string;
  keys: ApiKeyStatus[];
  currentIndex: number;
  maxRPM: number;
}

class ApiKeyPoolManager {
  private pools: Map<string, ProviderPool> = new Map();
  private redis: RedisClient;

  constructor(redis: RedisClient) {
    this.redis = redis;
    this.initializePools();
  }

  private initializePools() {
    // OpenAI Pool
    this.pools.set('openai', {
      provider: 'openai',
      keys: [
        {
          key: process.env.OPENAI_API_KEY_1!,
          provider: 'openai',
          index: 0,
          status: 'OK',
          requestsThisMinute: 0,
          lastUsed: new Date(),
        },
        {
          key: process.env.OPENAI_API_KEY_2!,
          provider: 'openai',
          index: 1,
          status: 'OK',
          requestsThisMinute: 0,
          lastUsed: new Date(),
        },
        {
          key: process.env.OPENAI_API_KEY_3!,
          provider: 'openai',
          index: 2,
          status: 'OK',
          requestsThisMinute: 0,
          lastUsed: new Date(),
        },
      ],
      currentIndex: 0,
      maxRPM: 3500, // OpenAI limit per key
    });

    // Anthropic Pool
    this.pools.set('anthropic', {
      provider: 'anthropic',
      keys: [
        {
          key: process.env.ANTHROPIC_API_KEY_1!,
          provider: 'anthropic',
          index: 0,
          status: 'OK',
          requestsThisMinute: 0,
          lastUsed: new Date(),
        },
        {
          key: process.env.ANTHROPIC_API_KEY_2!,
          provider: 'anthropic',
          index: 1,
          status: 'OK',
          requestsThisMinute: 0,
          lastUsed: new Date(),
        },
      ],
      currentIndex: 0,
      maxRPM: 3500,
    });

    // Load metrics from Redis
    this.loadMetricsFromRedis();
  }

  /**
   * Get next available API key (round-robin)
   */
  async getNextKey(provider: string): Promise<string> {
    const pool = this.pools.get(provider);
    if (!pool) {
      throw new Error(`No pool configured for provider: ${provider}`);
    }

    // Find next OK key
    let attempts = 0;
    while (attempts < pool.keys.length) {
      const keyStatus = pool.keys[pool.currentIndex];

      // Check if key is rate limited
      if (keyStatus.status !== 'RATE_LIMITED') {
        // Update metrics
        await this.recordKeyUsage(provider, pool.currentIndex);
        
        // Move to next key for next request
        pool.currentIndex = (pool.currentIndex + 1) % pool.keys.length;
        
        return keyStatus.key;
      }

      // Skip rate-limited key
      pool.currentIndex = (pool.currentIndex + 1) % pool.keys.length;
      attempts++;
    }

    // All keys rate limited - throw error
    throw new Error(
      `All API keys for ${provider} are rate limited. ` +
      `Retry after 1 minute.`
    );
  }

  /**
   * Get key with lowest current usage (load-aware)
   */
  async getLoadAwareKey(provider: string): Promise<string> {
    const pool = this.pools.get(provider);
    if (!pool) {
      throw new Error(`No pool configured for provider: ${provider}`);
    }

    // Find key with lowest requests this minute
    let bestKey = pool.keys[0];
    let lowestRequests = bestKey.requestsThisMinute;

    for (const keyStatus of pool.keys) {
      if (
        keyStatus.status !== 'RATE_LIMITED' &&
        keyStatus.requestsThisMinute < lowestRequests
      ) {
        bestKey = keyStatus;
        lowestRequests = keyStatus.requestsThisMinute;
      }
    }

    // Record usage
    await this.recordKeyUsage(provider, bestKey.index);

    return bestKey.key;
  }

  /**
   * Record that a key was used
   */
  private async recordKeyUsage(provider: string, keyIndex: number) {
    const minute = Math.floor(Date.now() / 60000);
    const key = `ratelimit:${provider}:key${keyIndex}:${minute}`;

    await this.redis.incr(key);
    await this.redis.expire(key, 60); // Expire after 1 minute
  }

  /**
   * Mark key as rate limited
   */
  async markRateLimited(provider: string, keyIndex: number) {
    const pool = this.pools.get(provider);
    if (pool && pool.keys[keyIndex]) {
      pool.keys[keyIndex].status = 'RATE_LIMITED';
      
      // Store in Redis for persistence across server restarts
      await this.redis.setex(
        `key:${provider}:${keyIndex}:status`,
        60, // 1 minute
        'RATE_LIMITED'
      );
    }
  }

  /**
   * Mark key as OK
   */
  async markOK(provider: string, keyIndex: number) {
    const pool = this.pools.get(provider);
    if (pool && pool.keys[keyIndex]) {
      pool.keys[keyIndex].status = 'OK';
      await this.redis.del(`key:${provider}:${keyIndex}:status`);
    }
  }

  /**
   * Load metrics from Redis
   */
  private async loadMetricsFromRedis() {
    for (const [provider, pool] of this.pools) {
      for (const keyStatus of pool.keys) {
        // Load status
        const statusKey = `key:${provider}:${keyStatus.index}:status`;
        const status = await this.redis.get(statusKey);
        if (status) {
          keyStatus.status = status as any;
        }

        // Load request count
        const minute = Math.floor(Date.now() / 60000);
        const countKey = `ratelimit:${provider}:key${keyStatus.index}:${minute}`;
        const count = await this.redis.get(countKey);
        if (count) {
          keyStatus.requestsThisMinute = parseInt(count);
        }
      }
    }
  }

  /**
   * Get pool status (for monitoring)
   */
  getPoolStatus(provider: string) {
    const pool = this.pools.get(provider);
    if (!pool) return null;

    return {
      provider,
      keys: pool.keys.map((k) => ({
        index: k.index,
        status: k.status,
        requestsThisMinute: k.requestsThisMinute,
        percentUsed: (k.requestsThisMinute / pool.maxRPM) * 100,
      })),
      totalRequests: pool.keys.reduce((sum, k) => sum + k.requestsThisMinute, 0),
      capacity: pool.maxRPM * pool.keys.length,
    };
  }
}

export default ApiKeyPoolManager;
```

## Step 3: Use in AI Proxy

```typescript
// server/ai-proxy.cjs (updated)

const ApiKeyPoolManager = require('./api-key-pool');
const redis = require('./redis-client');

const keyPool = new ApiKeyPoolManager(redis);

// When calling OpenAI
async function callOpenAI(messages, model) {
  let lastError;

  // Try up to 3 times with different keys
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const apiKey = await keyPool.getLoadAwareKey('openai');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

      if (response.status === 429) {
        // Rate limited - mark key and try next
        await keyPool.markRateLimited('openai', attempt);
        lastError = new Error('Rate limited');
        continue;
      }

      if (!response.ok) {
        throw new Error(`OpenAI error: ${response.status}`);
      }

      // Success - mark key as OK
      await keyPool.markOK('openai', attempt);
      return response;

    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('All API keys exhausted');
}
```

## Step 4: Monitoring Dashboard

```typescript
// Admin endpoint to see key status

app.get('/admin/api-keys/status', async (req, res) => {
  const openaiStatus = keyPool.getPoolStatus('openai');
  const anthropicStatus = keyPool.getPoolStatus('anthropic');

  res.json({
    openai: openaiStatus,
    anthropic: anthropicStatus,
    timestamp: new Date(),
  });
});

// Response:
// {
//   "openai": {
//     "provider": "openai",
//     "keys": [
//       { "index": 0, "status": "OK", "requestsThisMinute": 1200, "percentUsed": 34 },
//       { "index": 1, "status": "OK", "requestsThisMinute": 1100, "percentUsed": 31 },
//       { "index": 2, "status": "RATE_LIMITED", "requestsThisMinute": 3500, "percentUsed": 100 }
//     ],
//     "totalRequests": 5800,
//     "capacity": 10500
//   }
// }
```

---

# 📊 COMPARISON TABLE

| Aspect | Shared Keys | Per-User Keys |
|--------|------------|---------------|
| **Setup Complexity** | Simple | Complex |
| **Cost** | Low ($20/month) | High ($100+/month) |
| **User Isolation** | No | Yes |
| **Usage Tracking** | Aggregate only | Per-user |
| **Billing** | Flat rate | Usage-based |
| **Rate Limit** | Shared (3500 × 3) | Per-user |
| **Key Rotation** | Easy | Tedious |
| **Best For** | 1000+ users | <100 users |

---

# ✅ SUMMARY

## Why NOT to Store ENV in Database

1. **Security**: Database breach = All secrets exposed
2. **Logging**: Secrets might be logged accidentally
3. **Backups**: Unencrypted secrets in backups
4. **Separation of Concerns**: Secrets ≠ Config

## What Goes Where

| Type | Location | Reason |
|------|----------|--------|
| API Keys | .ENV | Secrets, never queryable |
| Database URLs | .ENV | Secrets, per-environment |
| OAuth Secrets | .ENV | Secrets, never queryable |
| Business Config | Database | Queryable, admin-controlled |
| Pricing | Database | Business changes it |
| Token Limits | Database | Admin tunes it |

## API Rotation Strategy

**For 1000 users: Use Shared Keys + Rotation**

- 3 OpenAI keys = 10,500 RPM (vs 3,500 with 1 key)
- Round-robin or load-aware selection
- Automatic fallback if key is rate limited
- Monitor key usage in admin panel
- Cost: $20/month for 3 keys

---

*Document generated for OneMindAI project*  
*Purpose: Explain ENV security and API rotation architecture*
