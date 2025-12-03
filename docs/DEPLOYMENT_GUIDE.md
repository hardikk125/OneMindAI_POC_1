# 🚀 OneMindAI Deployment Guide

## Frontend → Vercel (FREE) | Backend → Railway ($5-20/mo)

---

## 📋 Pre-Deployment Checklist

### ✅ Files Created/Updated:
- [x] `package.json` - Removed Windows-specific dependencies
- [x] `vercel.json` - Vercel configuration
- [x] `server/package.json` - Backend dependencies
- [x] `server/railway.json` - Railway configuration
- [x] `server/.env.example` - Environment template

---

## 🎨 PART 1: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Authorize Vercel to access your repos

### Step 2: Import Project
1. Click **"Add New..."** → **"Project"**
2. Select **"Import Git Repository"**
3. Find `OneMindAI_POC_1` and click **"Import"**

### Step 3: Configure Build Settings
Vercel should auto-detect these, but verify:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `.` (leave empty) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Step 4: Add Environment Variables
Click **"Environment Variables"** and add:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_PROXY_URL=https://your-backend.up.railway.app
```

⚠️ **Note**: Leave `VITE_PROXY_URL` empty for now. Add it after Railway deployment.

### Step 5: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Get your URL: `https://your-app.vercel.app`

### Step 6: Save Your Vercel URL
```
Frontend URL: https://_____________.vercel.app
```

---

## 🚂 PART 2: Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Authorize Railway

### Step 2: Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find `OneMindAI_POC_1` and select it

### Step 3: Configure Service
1. Click on the created service
2. Go to **"Settings"** tab
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `server` |
| **Build Command** | `npm install` |
| **Start Command** | `node ai-proxy.cjs` |

### Step 4: Add Environment Variables
Go to **"Variables"** tab and add ALL of these:

```env
# Server Config
AI_PROXY_PORT=3002
NODE_ENV=production

# CORS - Add your Vercel URL here!
ALLOWED_ORIGINS=https://your-app.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60

# AI Provider Keys (add all you have)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
MISTRAL_API_KEY=...
DEEPSEEK_API_KEY=sk-...
GROQ_API_KEY=gsk_...
PERPLEXITY_API_KEY=pplx-...
XAI_API_KEY=xai-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

### Step 5: Generate Domain
1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Get your URL: `https://your-backend.up.railway.app`

### Step 6: Save Your Railway URL
```
Backend URL: https://_____________.up.railway.app
```

---

## 🔗 PART 3: Connect Frontend to Backend

### Step 1: Update Vercel Environment
1. Go to Vercel Dashboard → Your Project
2. Go to **"Settings"** → **"Environment Variables"**
3. Add/Update:

```
VITE_PROXY_URL=https://your-backend.up.railway.app
```

### Step 2: Redeploy Vercel
1. Go to **"Deployments"** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**

### Step 3: Update Railway CORS
1. Go to Railway Dashboard → Your Service
2. Go to **"Variables"**
3. Update:

```
ALLOWED_ORIGINS=https://your-app.vercel.app
```

Railway will auto-redeploy.

---

## 🔐 PART 4: Update Supabase

### Step 1: Add Redirect URLs
1. Go to [supabase.com](https://supabase.com) → Your Project
2. Go to **"Authentication"** → **"URL Configuration"**
3. Add to **"Redirect URLs"**:

```
https://your-app.vercel.app/auth/callback
```

### Step 2: Update OAuth Providers
For each OAuth provider (Google, GitHub, etc.):

1. Go to the provider's developer console
2. Add the Vercel URL to allowed redirect URIs:
   ```
   https://your-app.vercel.app/auth/callback
   ```

---

## ✅ PART 5: Test Deployment

### Test 1: Backend Health Check
```bash
curl https://your-backend.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123,
  "providers": {
    "openai": true,
    "anthropic": true,
    "gemini": true
  }
}
```

### Test 2: Frontend Loads
1. Open `https://your-app.vercel.app`
2. Should see the OneMindAI interface

### Test 3: OAuth Login
1. Click "Sign In"
2. Try Google/GitHub login
3. Should redirect back and show logged in

### Test 4: AI Query
1. Log in
2. Send a test query
3. Should get AI response

### Test 5: PDF/Word Export
1. Generate a response
2. Click Export → PDF
3. Should download PDF file

---

## 🔧 Troubleshooting

### Error: CORS Policy
**Symptom**: `Access-Control-Allow-Origin` error
**Fix**: 
1. Check `ALLOWED_ORIGINS` in Railway includes your Vercel URL
2. Make sure there's no trailing slash

### Error: Build Failed on Railway
**Symptom**: `npm ci` fails
**Fix**:
1. Make sure `server/package.json` exists
2. Check Root Directory is set to `server`

### Error: OAuth Redirect Mismatch
**Symptom**: `redirect_uri_mismatch`
**Fix**:
1. Add Vercel URL to Supabase redirect URLs
2. Add to OAuth provider's allowed callbacks

### Error: API Key Invalid
**Symptom**: 401 or 403 errors
**Fix**:
1. Check environment variables in Railway
2. Make sure no extra spaces or quotes

### Error: Frontend Can't Connect to Backend
**Symptom**: Network error or timeout
**Fix**:
1. Check `VITE_PROXY_URL` is correct in Vercel
2. Check Railway service is running
3. Test health endpoint directly

---

## 📊 Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| **Vercel** | Hobby (Free) | $0 |
| **Railway** | Hobby | $5-10 |
| **Supabase** | Free | $0 |
| **Total** | | **$5-10/mo** |

---

## 🎉 Deployment Complete!

Your app is now live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.up.railway.app`
- **Database**: Supabase (already hosted)

### What's Automatic Now:
- ✅ Push to GitHub → Auto deploys to both platforms
- ✅ SSL certificates → Auto-renewed
- ✅ Server restarts → Auto on crash
- ✅ Database backups → Daily by Supabase

### Next Steps:
1. [ ] Custom domain (optional)
2. [ ] Set up monitoring
3. [ ] Configure alerts
4. [ ] Test with real users

---

## 📞 Quick Reference

### Vercel Dashboard
- URL: https://vercel.com/dashboard
- Logs: Project → Deployments → View Logs
- Env Vars: Project → Settings → Environment Variables

### Railway Dashboard
- URL: https://railway.app/dashboard
- Logs: Service → Deployments → View Logs
- Env Vars: Service → Variables

### Supabase Dashboard
- URL: https://supabase.com/dashboard
- Auth: Authentication → Users
- Database: Table Editor

---

**🚀 Your OneMindAI is now live and ready for users!**
