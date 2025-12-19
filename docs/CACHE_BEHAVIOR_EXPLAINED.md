# Cache Behavior & Timing Explained

## What is Cache Age?

**Cache Age** = How long the current data in memory has been stored (in seconds)

```
Cache Age = (Current Time - Last Load Time) / 1000
```

Example:
- Backend loads config at 12:00:00 PM
- You check at 12:00:30 PM
- Cache Age = 30 seconds

---

## The 5-Minute Cache TTL

**TTL = Time To Live** = How long data stays fresh before being reloaded

```javascript
const CACHE_TTL = 5 * 60 * 1000;  // 5 minutes = 300,000 milliseconds
```

### Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    CACHE LIFECYCLE                              │
│                                                                 │
│  0 min ─────────────────────── 5 min ─────────────────────── 10 min
│    │                             │                              │
│    ▼                             ▼                              ▼
│  LOAD                          EXPIRE                         LOAD
│  Fresh Data                    Stale Data                    Fresh Data
│  Cache Age: 0s                 Cache Age: 300s               Cache Age: 0s
│                                                                 │
│                                                                 │
│  ┌─ ADMIN CHANGES ─┐                                           │
│  │ Toggle model ON │                                           │
│  │ at 2:30 PM      │                                           │
│  └─────────────────┘                                           │
│         │                                                       │
│         ▼                                                       │
│    DATABASE UPDATED                                             │
│    (Supabase)                                                   │
│         │                                                       │
│         ├─ If Cache Age < 5 min: IGNORED (old cache used)      │
│         │                                                       │
│         └─ If Cache Age > 5 min: LOADED (new data fetched)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why Does It Take Time?

### Scenario 1: Admin Changes Within Cache Window (0-5 minutes)

```
2:00:00 PM - Backend loads config (Cache Age: 0s)
            ├─ Providers: openai (enabled), mistral (enabled)
            └─ Models: gpt-4o (active), gpt-4o-mini (active)

2:02:30 PM - Admin disables gpt-4o in admin panel
            ├─ Database updated: gpt-4o.is_active = false
            └─ Backend STILL using old cache (Cache Age: 150s)

2:03:00 PM - User calls /api/onemind with gpt-4o
            ├─ Backend checks cache (Cache Age: 180s)
            ├─ Cache says: gpt-4o is ACTIVE ✓
            └─ Request ALLOWED (even though disabled!)
            
            ❌ PROBLEM: User can still use disabled model!
```

### Scenario 2: Admin Changes After Cache Expires (5+ minutes)

```
2:00:00 PM - Backend loads config (Cache Age: 0s)

2:02:30 PM - Admin disables gpt-4o
            └─ Database updated

2:05:01 PM - Backend cache EXPIRES (Cache Age > 300s)
            └─ Next request triggers refreshCaches()

2:05:02 PM - User calls /api/onemind with gpt-4o
            ├─ Backend checks cache (Cache Age: 302s)
            ├─ Cache EXPIRED → refreshCaches() called
            ├─ Loads from Supabase: gpt-4o.is_active = false
            └─ Request BLOCKED ✓ (403 error)
            
            ✅ CORRECT: Disabled model is blocked!
```

---

## Code Flow

### Backend Cache Management

```javascript
// In ai-proxy.cjs

let providerCache = null;
let modelCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;  // 5 minutes

async function refreshCaches() {
  const now = Date.now();
  
  // Check if cache is still fresh
  if (cacheTime && (now - cacheTime) < CACHE_TTL) {
    console.log('[Cache] Still fresh, skipping refresh');
    return;  // Use old cache
  }
  
  // Cache expired, reload from Supabase
  console.log('[Cache] Expired, reloading from database');
  
  const { data: providers } = await supabase.from('provider_config').select('*');
  const { data: models } = await supabase.from('ai_models').select('*');
  
  providerCache = {};
  providers.forEach(p => { providerCache[p.provider] = p; });
  
  modelCache = models;
  cacheTime = Date.now();  // Reset timer
}

// Called on every API request
app.post('/api/onemind', async (req, res) => {
  await refreshCaches();  // Checks if refresh needed
  
  const validation = await validateModelAccess(provider, model);
  if (!validation.allowed) {
    return res.status(403).json({ error: validation.reason });
  }
  
  // Call AI provider...
});
```

---

## Cache Age Response

When you call `/api/onemind/providers`, the response includes:

```json
{
  "database_connected": true,
  "cache_age_seconds": 45,
  "providers": { ... },
  "models": { ... }
}
```

**What `cache_age_seconds: 45` means:**
- Data was loaded 45 seconds ago
- Still fresh (expires at 300 seconds)
- Next refresh in: 300 - 45 = 255 seconds (4 minutes 15 seconds)

---

## Timeline: Admin Change to API Enforcement

```
┌──────────────────────────────────────────────────────────────────┐
│                  COMPLETE FLOW                                   │
│                                                                  │
│  12:00:00 PM                                                     │
│  Backend starts                                                  │
│  └─ Loads config from Supabase                                  │
│     Cache Age: 0s                                               │
│                                                                  │
│  12:02:30 PM                                                     │
│  Admin toggles model OFF                                         │
│  └─ Updates Supabase: gpt-4o.is_active = false                  │
│     Cache Age: 150s (still fresh)                               │
│                                                                  │
│  12:03:00 PM                                                     │
│  User tries to use disabled model                               │
│  ├─ Backend checks cache (Age: 180s)                            │
│  ├─ Cache says: ENABLED (old data)                              │
│  └─ Request ALLOWED ❌ (bug!)                                   │
│                                                                  │
│  12:05:01 PM                                                     │
│  Cache expires (Age: 301s > 300s)                               │
│  └─ Next request triggers refresh                               │
│                                                                  │
│  12:05:02 PM                                                     │
│  User tries again                                               │
│  ├─ Backend refreshes cache from Supabase                       │
│  ├─ Loads: gpt-4o.is_active = false                             │
│  ├─ Cache Age: 0s (fresh)                                       │
│  └─ Request BLOCKED ✓ (403 error)                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Why 5 Minutes?

| Duration | Pros | Cons |
|----------|------|------|
| **1 minute** | Changes reflected quickly | More database queries, slower |
| **5 minutes** | Good balance, fewer DB calls | Delay in reflecting changes |
| **10 minutes** | Very fast, minimal DB load | Changes take too long |
| **No cache** | Always up-to-date | Database overloaded, slow |

**5 minutes is chosen because:**
- ✅ Admin changes reflected within 5 minutes (acceptable)
- ✅ Reduces database load (fewer queries)
- ✅ Improves API performance (cached data is faster)
- ✅ Prevents cache stampede (too many simultaneous DB queries)

---

## How to Force Immediate Update

If you need changes to take effect immediately (without waiting 5 minutes):

### Option 1: Restart Backend
```bash
# Stop the backend
Ctrl+C

# Start it again
npm run dev
```
This resets `cacheTime = 0`, forcing a fresh load on next request.

### Option 2: Modify Cache TTL (Development Only)

In `server/ai-proxy.cjs`, change:
```javascript
const CACHE_TTL = 5 * 60 * 1000;  // 5 minutes
```

To:
```javascript
const CACHE_TTL = 30 * 1000;  // 30 seconds (for testing)
```

⚠️ **Don't use in production** - increases database load

### Option 3: Add Manual Cache Clear Endpoint (Advanced)

```javascript
// Add this endpoint to ai-proxy.cjs
app.post('/api/admin/clear-cache', (req, res) => {
  providerCache = null;
  modelCache = null;
  cacheTime = 0;
  res.json({ message: 'Cache cleared' });
});
```

Then call:
```bash
POST https://onemindaipoc1-production.up.railway.app/api/admin/clear-cache
```

---

## Summary

| Question | Answer |
|----------|--------|
| What is cache age? | Seconds since data was loaded from database |
| Why 5 minutes? | Balance between performance and freshness |
| When do changes appear? | After cache expires (max 5 minutes) |
| How to see cache age? | Call `/api/onemind/providers` and check `cache_age_seconds` |
| How to force update? | Restart backend or wait for cache to expire |

---

## Monitoring Cache

Check cache status by calling:

```bash
curl https://onemindaipoc1-production.up.railway.app/api/onemind/providers
```

Response:
```json
{
  "database_connected": true,
  "cache_age_seconds": 127,  // ← Check this
  "providers": { ... },
  "summary": {
    "active_providers": 8,
    "active_models": 44
  }
}
```

**Interpretation:**
- `cache_age_seconds: 0-60` → Fresh data, just loaded
- `cache_age_seconds: 60-180` → Still fresh, good performance
- `cache_age_seconds: 180-300` → Getting old, will refresh soon
- `cache_age_seconds: 300+` → Expired, will refresh on next request

