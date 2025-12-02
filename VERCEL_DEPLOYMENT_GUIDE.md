# 🚀 Deploy OneMindAI on Vercel (Frontend + Backend)

## **What We Just Set Up**

Your app now has:
- ✅ **Frontend** (React/Vite) → Deployed to Vercel
- ✅ **Backend** (Express API) → Deployed to Vercel as serverless functions
- ✅ **Single Vercel Project** → No need for Railway!

---

## **Step 1: Commit & Push Changes**

```bash
git add -A
git commit -m "Add Vercel backend API configuration"
git push
```

---

## **Step 2: Deploy to Vercel**

### **Option A: Using Vercel CLI (Fastest)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **Option B: Using Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Select your GitHub repo
4. Click **"Import"**
5. Vercel will auto-detect the setup
6. Click **"Deploy"**

---

## **Step 3: Add Environment Variables**

After deployment, go to **Project Settings** → **Environment Variables**

Add these:

```
# AI Provider Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
MISTRAL_API_KEY=...
DEEPSEEK_API_KEY=sk-...
GROQ_API_KEY=gsk_...
XAI_API_KEY=xai-...
KIMI_API_KEY=...

# CORS
ALLOWED_ORIGINS=https://your-app.vercel.app

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60
```

---

## **Step 4: Update Frontend Config**

Your frontend will automatically use:
- Local: `http://localhost:3002` (dev server)
- Production: `https://your-app.vercel.app/api` (Vercel)

**No changes needed!** The proxy URL is auto-detected.

---

## **Step 5: Test the Deployment**

```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health

# Should return:
{
  "status": "ok",
  "uptime": 123,
  "providers": { ... }
}
```

---

## **Your URLs**

| Component | URL |
|-----------|-----|
| **Frontend** | `https://your-app.vercel.app` |
| **API** | `https://your-app.vercel.app/api` |
| **Health Check** | `https://your-app.vercel.app/api/health` |
| **OpenAI Proxy** | `https://your-app.vercel.app/api/openai` |
| **Claude Proxy** | `https://your-app.vercel.app/api/anthropic` |
| **DeepSeek Proxy** | `https://your-app.vercel.app/api/deepseek` |
| **Mistral Proxy** | `https://your-app.vercel.app/api/mistral` |

---

## **Why This Works Better Than Railway**

| Feature | Vercel | Railway |
|---------|--------|---------|
| **Setup Time** | 2 minutes | 15+ minutes |
| **Deployment** | Auto on push | Manual config |
| **Scaling** | Automatic | Manual |
| **Cost** | Free tier included | Paid from start |
| **Serverless** | Native support | Limited |
| **API Routes** | Built-in | Requires setup |

---

## **Troubleshooting**

### **API returns 503 "Service not configured"**
- Check environment variables are set in Vercel dashboard
- Verify API keys are correct
- Restart deployment

### **CORS errors**
- Update `ALLOWED_ORIGINS` in Vercel env vars
- Include your Vercel URL

### **Timeout errors**
- Vercel free tier has 10s limit
- Pro plan has 60s limit
- Consider upgrading if needed

---

## **Next Steps**

1. ✅ Commit & push
2. ✅ Deploy to Vercel
3. ✅ Add environment variables
4. ✅ Test health endpoint
5. ✅ Update Supabase OAuth URLs (if using auth)

**Done!** Your app is now live on Vercel! 🎉
