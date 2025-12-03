# ngrok Quick Start - 5 Minutes

## TL;DR - Get Your App Live in 5 Steps

### Step 1: Install ngrok
```powershell
choco install ngrok
```

### Step 2: Authenticate
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
# Get token from: https://dashboard.ngrok.com/auth
```

### Step 3: Start Your App
```powershell
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev
```

### Step 4: Expose with ngrok
```bash
# Terminal 3: Expose frontend
ngrok http 5173
```

### Step 5: Share Your URL
```
Your app is live at: https://abc123.ngrok.io
```

---

## Using the Quick Start Script

### Windows PowerShell
```powershell
# Make sure backend and frontend are running first!

# Expose frontend
.\scripts\start-ngrok.ps1

# Expose backend
.\scripts\start-ngrok.ps1 -Backend

# With custom subdomain (paid feature)
.\scripts\start-ngrok.ps1 -Subdomain my-app
```

---

## Common Commands

```bash
# Expose frontend (port 5173)
ngrok http 5173

# Expose backend (port 3001)
ngrok http 3001

# With custom subdomain
ngrok http 5173 --subdomain=my-app

# With basic auth
ngrok http 5173 --auth="user:password"

# View dashboard
# Open: http://localhost:4040
```

---

## Update OAuth Callbacks

When you get your ngrok URL (e.g., `https://abc123.ngrok.io`), add it to:

1. **Supabase Dashboard**
   - Authentication → URL Configuration
   - Add: `https://abc123.ngrok.io/auth/callback`

2. **Google OAuth**
   - Google Cloud Console → Credentials
   - Add: `https://abc123.ngrok.io/auth/callback`

3. **GitHub OAuth**
   - GitHub Settings → Developer settings → OAuth Apps
   - Add: `https://abc123.ngrok.io/auth/callback`

4. **Apple, Microsoft, X, LinkedIn**
   - Same process for each provider

---

## Environment Variables

Update `.env` to use ngrok URL:

```env
# Replace with your ngrok URL
VITE_PROXY_URL=https://abc123.ngrok.io
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "ngrok not found" | Install: `choco install ngrok` |
| "Port already in use" | Kill: `taskkill /F /IM node.exe` |
| "Connection refused" | Start backend/frontend first |
| "OAuth redirect loop" | Update callback URL in provider |
| "CORS error" | Update `ALLOWED_ORIGINS` in backend .env |

---

## Important Notes

⚠️ **ngrok is for development only**
- URLs change when you restart
- Not suitable for production
- Free tier has rate limits

✅ **For production, use:**
- Vercel (Frontend)
- Railway/Render (Backend)
- AWS/Google Cloud (Scalable)

---

## Next Steps

- Read full guide: `docs/NGROK_HOSTING_GUIDE.md`
- Setup production: `docs/PRODUCTION_AUTH_SETUP.md`
- Deploy to Vercel: Check Vercel docs
