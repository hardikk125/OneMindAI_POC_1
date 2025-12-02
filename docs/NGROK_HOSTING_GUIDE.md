# Hosting OneMindAI with ngrok

## Overview

ngrok creates a secure tunnel from your local machine to the internet, allowing you to expose your development server publicly. Perfect for testing, demos, and development.

---

## 1. Install ngrok

### Windows
```powershell
# Using Chocolatey
choco install ngrok

# Or download from https://ngrok.com/download
# Extract and add to PATH
```

### macOS
```bash
brew install ngrok
```

### Linux
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok-agent-v3-linux-amd64.zip -o ngrok.zip
unzip ngrok.zip
sudo mv ngrok /usr/local/bin
```

### Verify Installation
```bash
ngrok version
```

---

## 2. Create ngrok Account & Get Auth Token

1. Go to [ngrok.com](https://ngrok.com)
2. Sign up for free account
3. Go to Dashboard → Auth Token
4. Copy your auth token
5. Add to ngrok config:

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## 3. Start Your Development Servers

### Terminal 1: Start Backend (AI Proxy)
```powershell
cd c:\Projects\OneMindAI
npm run dev:server
```

Backend runs on: `http://localhost:3001`

### Terminal 2: Start Frontend (Vite)
```powershell
cd c:\Projects\OneMindAI
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## 4. Expose with ngrok

### Option A: Expose Frontend Only (Recommended for Testing)

```bash
ngrok http 5173
```

Output:
```
Session Status                online
Account                       your-email@example.com
Version                       3.3.0
Region                        us (United States)
Forwarding                    https://abc123.ngrok.io -> http://localhost:5173
Connections                   0/40
```

Your app is now live at: `https://abc123.ngrok.io`

### Option B: Expose Both Frontend & Backend

**Terminal 3: Expose Backend**
```bash
ngrok http 3001 --subdomain=onemindai-api
```

**Terminal 4: Expose Frontend**
```bash
ngrok http 5173 --subdomain=onemindai-app
```

URLs:
- Frontend: `https://onemindai-app.ngrok.io`
- Backend: `https://onemindai-api.ngrok.io`

---

## 5. Update Environment Variables

### For Frontend (.env)

When using ngrok, update your environment to use the ngrok URLs:

```env
# Local development
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_PROXY_URL=http://localhost:3001

# For ngrok (replace with your ngrok URL)
# VITE_PROXY_URL=https://onemindai-api.ngrok.io
```

### For Backend (server/.env)

```env
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Provider Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
# ... other keys

# CORS - Allow ngrok URL
ALLOWED_ORIGINS=http://localhost:5173,https://abc123.ngrok.io
```

---

## 6. Update OAuth Redirect URLs

When using ngrok, you need to update OAuth callback URLs in each provider.

### Supabase Dashboard
1. Go to Authentication → URL Configuration
2. Add ngrok URL to Redirect URLs:
   ```
   https://abc123.ngrok.io/auth/callback
   ```

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Credentials → OAuth 2.0 Client IDs
3. Add authorized redirect URI:
   ```
   https://abc123.ngrok.io/auth/callback
   ```

### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Edit your app
3. Add Authorization callback URL:
   ```
   https://abc123.ngrok.io/auth/callback
   ```

### Apple, Microsoft, X, LinkedIn
Repeat the same process for each provider - add the ngrok callback URL.

---

## 7. Test Your App

1. Open `https://abc123.ngrok.io` in browser
2. Test authentication (OAuth should work)
3. Test API calls
4. Check console for errors

### Common Issues

**CORS Error**
- Update `ALLOWED_ORIGINS` in backend .env
- Restart backend server

**OAuth Redirect Loop**
- Verify callback URL matches exactly in provider settings
- Clear browser cookies/localStorage

**SSL Certificate Warning**
- ngrok uses valid SSL certificates
- Safe to ignore warnings in development

---

## 8. ngrok Dashboard

Monitor your tunnel in real-time:

```bash
# Open ngrok web dashboard
# Usually at http://localhost:4040
```

Features:
- View all HTTP requests/responses
- Replay requests
- Inspect headers and body
- Monitor connection status

---

## 9. Advanced ngrok Features

### Custom Subdomain (Paid Feature)
```bash
ngrok http 5173 --subdomain=my-custom-app
# URL: https://my-custom-app.ngrok.io
```

### Custom Domain (Paid Feature)
```bash
ngrok http 5173 --domain=myapp.com
```

### Rate Limiting
```bash
ngrok http 5173 --rate-limit=10
# Max 10 requests per second
```

### IP Whitelisting
```bash
ngrok http 5173 --allow-user-agent="Mozilla/*"
```

### Basic Auth
```bash
ngrok http 5173 --auth="user:password"
```

---

## 10. Automated Setup Script

### Windows PowerShell Script

Create `start-ngrok.ps1`:

```powershell
# Start all services with ngrok

# Kill existing processes
taskkill /F /IM node.exe 2>$null

# Start backend
Write-Host "Starting backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "cd c:\Projects\OneMindAI; npm run dev:server"
Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "cd c:\Projects\OneMindAI; npm run dev"
Start-Sleep -Seconds 3

# Start ngrok
Write-Host "Starting ngrok tunnel..." -ForegroundColor Green
ngrok http 5173

# Display info
Write-Host "`nYour app is live at the ngrok URL above!" -ForegroundColor Cyan
Write-Host "ngrok Dashboard: http://localhost:4040" -ForegroundColor Cyan
```

Run it:
```powershell
.\start-ngrok.ps1
```

### Bash Script (macOS/Linux)

Create `start-ngrok.sh`:

```bash
#!/bin/bash

# Kill existing processes
pkill -f "npm run dev"
pkill -f "npm run dev:server"

# Start backend
echo "Starting backend..."
npm run dev:server &
sleep 3

# Start frontend
echo "Starting frontend..."
npm run dev &
sleep 3

# Start ngrok
echo "Starting ngrok tunnel..."
ngrok http 5173

echo "Your app is live at the ngrok URL above!"
echo "ngrok Dashboard: http://localhost:4040"
```

Make executable and run:
```bash
chmod +x start-ngrok.sh
./start-ngrok.sh
```

---

## 11. Production Considerations

### ngrok is NOT for Production
- Tunnels are temporary and can disconnect
- URLs change when you restart
- Rate limited on free tier
- Not suitable for high traffic

### For Production, Use:
- **Vercel** (Frontend)
- **Railway/Render** (Backend)
- **AWS/Google Cloud** (Scalable)
- **Heroku** (Simple deployment)

---

## 12. Troubleshooting

### "ngrok not found"
```bash
# Add to PATH or use full path
/usr/local/bin/ngrok http 5173
```

### "Tunnel already in use"
```bash
# Kill existing ngrok processes
pkill ngrok
# Or restart ngrok with different port
```

### "Connection refused"
```bash
# Make sure your local server is running
# Check port is correct (5173 for frontend, 3001 for backend)
```

### "Invalid auth token"
```bash
# Re-authenticate
ngrok config add-authtoken YOUR_NEW_TOKEN
```

### "Too many connections"
```bash
# Free tier has limits
# Upgrade to paid plan or restart tunnel
```

---

## 13. Sharing Your App

### Share ngrok URL
```
https://abc123.ngrok.io
```

### Share with Specific People
```bash
# Use basic auth
ngrok http 5173 --auth="user:password"
```

### Generate QR Code
```bash
# Use ngrok dashboard to generate QR code
# http://localhost:4040
```

---

## 14. Monitoring & Logs

### View ngrok Logs
```bash
# In ngrok terminal, press 'l' for logs
# Or view in dashboard: http://localhost:4040
```

### Monitor API Calls
```bash
# Backend logs
npm run dev:server

# Frontend console
# Open browser DevTools → Console
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Install ngrok | `choco install ngrok` (Windows) |
| Authenticate | `ngrok config add-authtoken TOKEN` |
| Expose frontend | `ngrok http 5173` |
| Expose backend | `ngrok http 3001` |
| View dashboard | `http://localhost:4040` |
| Stop ngrok | `Ctrl+C` |
| Custom subdomain | `ngrok http 5173 --subdomain=myapp` |
| With auth | `ngrok http 5173 --auth="user:pass"` |

---

## Support

- ngrok Docs: https://ngrok.com/docs
- ngrok Community: https://ngrok.com/community
- Check ngrok Status: https://status.ngrok.com
