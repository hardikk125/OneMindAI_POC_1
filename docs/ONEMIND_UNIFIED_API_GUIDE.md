# OneMind Unified API - Complete Setup Guide

## Overview

The OneMind Unified API allows you to execute **all enabled AI engines in parallel** with a single API call. This transforms OneMindAI into a singular, powerful API endpoint.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐     ┌─────────────────┐
│   API Client    │────▶│  OneMind Backend (ai-proxy.cjs)      │────▶│   AI Providers  │
│   (Any app)     │     │  POST /api/onemind                   │     │   (Parallel)    │
└─────────────────┘     │                                      │     │                 │
                        │  ┌────────────────────────────────┐  │     │  • OpenAI       │
                        │  │  1. Fetch enabled providers    │  │     │  • Anthropic    │
                        │  │  2. Execute all in parallel    │  │     │  • Gemini       │
                        │  │  3. Aggregate responses        │  │     │  • Mistral      │
                        │  │  4. Return unified response    │  │     │  • Perplexity   │
                        │  └────────────────────────────────┘  │     │  • DeepSeek     │
                        │              │                       │     │  • Groq         │
                        │              ▼                       │     │  • xAI          │
                        │  ┌────────────────────────────────┐  │     └─────────────────┘
                        │  │  Supabase (provider_config)    │  │
                        │  │  - Enabled/disabled providers  │  │
                        │  │  - Default models per provider │  │
                        │  └────────────────────────────────┘  │
                        └──────────────────────────────────────┘
```

---

## Quick Start with ngrok

### Step 1: Install ngrok

**Windows (PowerShell as Admin):**
```powershell
choco install ngrok
```

**Or download from:** https://ngrok.com/download

### Step 2: Authenticate ngrok

1. Sign up at https://dashboard.ngrok.com/signup
2. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken
3. Run:
```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 3: Start Backend Server

```powershell
cd c:\Projects\OneMindAI
npm run dev:server
```

This starts `ai-proxy.cjs` on port **3001** (or configured port).

### Step 4: Expose with ngrok

In a new terminal:
```powershell
ngrok http 3001
```

You'll see output like:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3001
```

**Your public API URL:** `https://abc123.ngrok-free.app`

---

## API Reference

### POST /api/onemind

Execute all enabled AI engines in parallel.

**Request:**
```json
{
  "prompt": "What is artificial intelligence?",
  "max_tokens": 4096,
  "engines": ["openai", "anthropic", "gemini"],
  "timeout": 60000
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | ✅ Yes | - | The prompt to send to all engines |
| `max_tokens` | number | No | 4096 | Maximum tokens per response |
| `engines` | array | No | All enabled | Specific engines to use |
| `timeout` | number | No | 60000 | Timeout per engine (ms) |

**Response:**
```json
{
  "id": "onemind_1702834567_abc123",
  "created": 1702834567,
  "prompt": "What is artificial intelligence?...",
  "responses": [
    {
      "provider": "openai",
      "model": "gpt-4o",
      "content": "Artificial intelligence (AI) is...",
      "tokens": 500,
      "latency_ms": 1200,
      "status": "success"
    },
    {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "content": "AI refers to the simulation of...",
      "tokens": 480,
      "latency_ms": 1100,
      "status": "success"
    },
    {
      "provider": "gemini",
      "model": "gemini-2.0-flash-exp",
      "content": "Artificial intelligence is a branch...",
      "tokens": 520,
      "latency_ms": 900,
      "status": "success"
    }
  ],
  "meta": {
    "total_engines": 3,
    "successful": 3,
    "failed": 0,
    "total_latency_ms": 1200
  }
}
```

### GET /api/onemind/providers

List all available and enabled providers.

**Response:**
```json
{
  "enabled": [
    { "provider": "openai", "model": "gpt-4o" },
    { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
    { "provider": "gemini", "model": "gemini-2.0-flash-exp" }
  ],
  "available": {
    "openai": true,
    "anthropic": true,
    "gemini": true,
    "mistral": true,
    "perplexity": false,
    "deepseek": true,
    "groq": true,
    "xai": false
  },
  "total_enabled": 3
}
```

---

## Usage Examples

### cURL

```bash
# Basic request (uses all enabled engines)
curl -X POST https://YOUR_NGROK_URL/api/onemind \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing in simple terms"}'

# Specific engines only
curl -X POST https://YOUR_NGROK_URL/api/onemind \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the meaning of life?",
    "engines": ["openai", "anthropic"],
    "max_tokens": 2000
  }'

# List providers
curl https://YOUR_NGROK_URL/api/onemind/providers
```

### JavaScript/Node.js

```javascript
const response = await fetch('https://YOUR_NGROK_URL/api/onemind', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Explain machine learning',
    max_tokens: 4096
  })
});

const data = await response.json();

// Access individual responses
data.responses.forEach(r => {
  console.log(`${r.provider}: ${r.content.substring(0, 100)}...`);
});

// Check success rate
console.log(`Success: ${data.meta.successful}/${data.meta.total_engines}`);
```

### Python

```python
import requests

response = requests.post(
    'https://YOUR_NGROK_URL/api/onemind',
    json={
        'prompt': 'What is deep learning?',
        'engines': ['openai', 'anthropic', 'gemini'],
        'max_tokens': 4096
    }
)

data = response.json()

for r in data['responses']:
    if r['status'] == 'success':
        print(f"{r['provider']}: {r['content'][:100]}...")
    else:
        print(f"{r['provider']}: ERROR - {r['error']}")
```

---

## Environment Variables Required

Ensure these are set in your `.env` file:

```env
# Supabase (for provider config)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
MISTRAL_API_KEY=...
PERPLEXITY_API_KEY=pplx-...
DEEPSEEK_API_KEY=sk-...
GROQ_API_KEY=gsk_...
XAI_API_KEY=xai-...

# Server Config
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,https://your-ngrok-url.ngrok-free.app
```

---

## Admin Configuration

Enable/disable providers via Supabase `provider_config` table:

| provider | is_enabled | default_model |
|----------|------------|---------------|
| openai | true | gpt-4o |
| anthropic | true | claude-3-5-sonnet-20241022 |
| gemini | true | gemini-2.0-flash-exp |
| mistral | false | mistral-large-latest |
| perplexity | true | llama-3.1-sonar-large-128k-online |
| deepseek | true | deepseek-chat |
| groq | true | llama-3.3-70b-versatile |
| xai | false | grok-beta |

---

## Error Handling

Each provider response includes a `status` field:
- `"success"` - Response received successfully
- `"error"` - Provider failed (check `error` field for details)

Common errors:
- `"Timeout"` - Provider took too long (>60s default)
- `"Unsupported provider"` - Invalid provider name
- `"API key not configured"` - Missing environment variable

---

## Rate Limiting

- Default: 60 requests per minute per IP
- Configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` env vars

---

## Production Deployment

For production, replace ngrok with:
1. **Railway** - Your current backend host
2. **Vercel** - For serverless deployment
3. **AWS/GCP/Azure** - For enterprise scale

Update `ALLOWED_ORIGINS` to include your production frontend URL.

---

## Troubleshooting

### ngrok not connecting
```powershell
# Check if backend is running
curl http://localhost:3001/health

# Restart ngrok
ngrok http 3001
```

### Provider errors
- Check API keys in `.env`
- Verify provider is enabled in Supabase
- Check provider status pages for outages

### CORS errors
- Add your frontend URL to `ALLOWED_ORIGINS`
- Restart the backend server

---

## Support

- Backend code: `server/ai-proxy.cjs`
- Provider config: Supabase `provider_config` table
- Logs: Check terminal running `npm run dev:server`
