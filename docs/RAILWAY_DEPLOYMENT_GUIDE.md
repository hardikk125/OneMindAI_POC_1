# 🚂 Railway Deployment Guide - OneMindAI

Complete guide to deploy both frontend and backend on Railway with zero manual intervention after setup.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Deploy Backend](#deploy-backend)
4. [Deploy Frontend](#deploy-frontend)
5. [Connect to Supabase](#connect-to-supabase)
6. [Configure Environment Variables](#configure-environment-variables)
7. [Custom Domain (Optional)](#custom-domain-optional)
8. [What's Automatic](#whats-automatic)
9. [Monitoring & Logs](#monitoring--logs)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RAILWAY PROJECT                          │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │  Frontend Service   │    │  Backend Service    │        │
│  │  (React App)        │    │  (Node.js API)      │        │
│  │                     │    │                     │        │
│  │  Port: 3000         │    │  Port: 3002         │        │
│  │  Build: npm build   │    │  Start: node        │        │
│  │  Serve: serve -s    │    │  ai-proxy.cjs       │        │
│  └──────────┬──────────┘    └──────────┬──────────┘        │
│             │                          │                    │
│             │    Internal Network      │                    │
│             └──────────┬───────────────┘                    │
│                        │                                    │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Supabase (FREE)    │
              │  - Auth             │
              │  - Database         │
              │  - Credits          │
              └─────────────────────┘
```

---

## ✅ Prerequisites

1. **GitHub Account** - Your code must be on GitHub
2. **Railway Account** - Sign up at [railway.app](https://railway.app)
3. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
4. **API Keys** - OpenAI, Anthropic, etc.

---

## 🔧 Deploy Backend

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `OneMindAI_POC_1` repository
5. Railway will auto-detect Node.js

### Step 2: Configure Backend Service

1. Click on the service
2. Go to **Settings** tab
3. Set **Root Directory**: `server`
4. Set **Start Command**: `node ai-proxy.cjs`

### Step 3: Add Environment Variables

Go to **Variables** tab and add:

```env
# Server Config
AI_PROXY_PORT=3002
NODE_ENV=production

# CORS - Will update after frontend deploys
ALLOWED_ORIGINS=https://your-frontend.up.railway.app

# AI Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
MISTRAL_API_KEY=...
DEEPSEEK_API_KEY=sk-...
GROQ_API_KEY=gsk_...
PERPLEXITY_API_KEY=pplx-...
XAI_API_KEY=xai-...

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

### Step 4: Generate Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. You'll get: `https://onemindai-api-production.up.railway.app`

---

## 🎨 Deploy Frontend

### Step 1: Create New Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose the same repository
4. This creates a second service

### Step 2: Configure Frontend Service

1. Click on the new service
2. Go to **Settings** tab
3. Set **Root Directory**: `.` (root)
4. Set **Build Command**: `npm run build`
5. Set **Start Command**: `npx serve -s dist -l 3000`

### Step 3: Add Frontend Environment Variables

```env
# Supabase (Public keys only)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Backend API URL (from Step 4 above)
VITE_PROXY_URL=https://onemindai-api-production.up.railway.app
```

### Step 4: Generate Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. You'll get: `https://onemindai-production.up.railway.app`

### Step 5: Update Backend CORS

Go back to backend service and update:

```env
ALLOWED_ORIGINS=https://onemindai-production.up.railway.app
```

---

## 🔗 Connect to Supabase

### Step 1: Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJ...`
   - **service_role key**: `eyJ...` (for backend only)

### Step 2: Configure OAuth Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://onemindai-production.up.railway.app/auth/callback
   ```

### Step 3: Update OAuth Providers

For each OAuth provider (Google, GitHub, etc.), add the Railway URL to their callback settings.

---

## ⚙️ Configure Environment Variables

### Backend Variables (Complete List)

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_PROXY_PORT` | Yes | Server port (3002) |
| `NODE_ENV` | Yes | `production` |
| `ALLOWED_ORIGINS` | Yes | Frontend URL |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | Claude API key |
| `GOOGLE_AI_API_KEY` | No | Gemini API key |
| `MISTRAL_API_KEY` | No | Mistral API key |
| `DEEPSEEK_API_KEY` | No | DeepSeek API key |
| `GROQ_API_KEY` | No | Groq API key |
| `PERPLEXITY_API_KEY` | No | Perplexity API key |
| `XAI_API_KEY` | No | xAI Grok API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service key |

### Frontend Variables (Complete List)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `VITE_PROXY_URL` | Yes | Backend API URL |

---

## 🌐 Custom Domain (Optional)

### Step 1: Add Domain in Railway

1. Go to service **Settings** → **Networking**
2. Click **"+ Custom Domain"**
3. Enter your domain: `app.yourdomain.com`

### Step 2: Configure DNS

Add these records at your domain registrar (GoDaddy, Namecheap, etc.):

```
Type: CNAME
Name: app
Value: onemindai-production.up.railway.app
TTL: 3600
```

### Step 3: Wait for SSL

Railway automatically provisions SSL certificate (takes 5-10 minutes).

---

## 🤖 What's Automatic

### After Initial Setup, These Are 100% Automatic:

| Feature | How It Works |
|---------|--------------|
| **Deployments** | Push to GitHub → Auto deploys in ~2 min |
| **SSL Certificates** | Auto-renewed before expiry |
| **Server Restarts** | Auto-restart on crash (max 10 retries) |
| **Health Checks** | Railway monitors `/health` endpoint |
| **Logs** | Auto-collected, viewable in dashboard |
| **Scaling** | Auto-scales based on traffic |
| **Database Backups** | Supabase auto-backups daily |

### Deployment Flow:

```
1. You push code to GitHub
        │
        ▼
2. GitHub webhook triggers Railway
        │
        ▼
3. Railway pulls latest code
        │
        ▼
4. Railway runs build command
        │
        ▼
5. Railway deploys new version
        │
        ▼
6. Old version stays running until new is ready
        │
        ▼
7. Traffic switches to new version (zero downtime)
        │
        ▼
8. Old version terminates
```

---

## 📊 Monitoring & Logs

### View Logs

1. Go to your Railway project
2. Click on a service
3. Go to **"Deployments"** tab
4. Click **"View Logs"**

### Health Check

Your backend has a health endpoint:

```bash
curl https://onemindai-api-production.up.railway.app/health
```

Response:
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2024-12-02T08:00:00Z",
  "providers": {
    "openai": true,
    "anthropic": true,
    "gemini": true
  }
}
```

### Metrics Dashboard

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request count
- Error rate

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Fails
```
Error: npm run build failed
```
**Solution**: Check build logs, usually missing dependency or TypeScript error.

#### 2. CORS Error
```
Access blocked by CORS policy
```
**Solution**: Update `ALLOWED_ORIGINS` in backend to include frontend URL.

#### 3. API Key Not Working
```
Error: Invalid API key
```
**Solution**: Check environment variables are set correctly (no quotes, no spaces).

#### 4. Frontend Can't Connect to Backend
```
Network Error / Failed to fetch
```
**Solution**: 
1. Check `VITE_PROXY_URL` is correct
2. Check backend is running (health endpoint)
3. Check CORS configuration

#### 5. OAuth Redirect Fails
```
Error: redirect_uri_mismatch
```
**Solution**: Add Railway URL to OAuth provider's allowed redirect URIs.

---

## 💰 Cost Estimation

### Railway Pricing (as of 2024)

| Resource | Free Tier | Hobby ($5/mo) | Pro ($20/mo) |
|----------|-----------|---------------|--------------|
| RAM | 512MB | 8GB | 32GB |
| CPU | Shared | Shared | Dedicated |
| Bandwidth | 100GB | Unlimited | Unlimited |
| Build Minutes | 500/mo | Unlimited | Unlimited |

### Estimated Monthly Cost for 100 Users

| Usage Level | Plan | Cost |
|-------------|------|------|
| Light (10 req/user/day) | Hobby | $5-10 |
| Medium (50 req/user/day) | Hobby | $10-15 |
| Heavy (100+ req/user/day) | Pro | $20-30 |

---

## 🚀 Quick Deploy Checklist

- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Deploy backend service
- [ ] Add backend environment variables
- [ ] Generate backend domain
- [ ] Deploy frontend service
- [ ] Add frontend environment variables
- [ ] Generate frontend domain
- [ ] Update backend CORS with frontend URL
- [ ] Configure Supabase redirect URLs
- [ ] Update OAuth providers with new URLs
- [ ] Test health endpoint
- [ ] Test login flow
- [ ] Test AI query
- [ ] Test PDF/Word export

---

## 📞 Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Supabase Docs**: https://supabase.com/docs

---

## 🎉 You're Done!

After completing this guide:

1. **Your app is live** at `https://onemindai-production.up.railway.app`
2. **Auto-deploys** on every GitHub push
3. **Zero maintenance** required
4. **SSL included** automatically
5. **Scales automatically** with traffic

Just push code and Railway handles everything else! 🚀
