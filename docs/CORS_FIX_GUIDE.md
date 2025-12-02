# CORS Error Fix Guide

## Problem
```
Access to fetch at 'http://localhost:3002/api/deepseek' from origin 'http://localhost:5176' 
has been blocked by CORS policy
```

## Root Cause
Your frontend is running on port **5176**, but the backend CORS configuration only allows **5173**.

---

## Solution

### Step 1: Update Backend CORS (Already Done ✅)
The backend (`server/ai-proxy.cjs`) now includes port 5176:

```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5176',    // ← Added
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5176'     // ← Added
];
```

### Step 2: Restart Backend Server
```powershell
# Kill existing process
taskkill /F /IM node.exe

# Start backend
npm run dev:server
```

Backend should now run on: `http://localhost:3002`

### Step 3: Verify Frontend URL
Make sure your frontend is making requests to the correct backend URL.

**Check `.env` file:**
```env
VITE_PROXY_URL=http://localhost:3002
```

### Step 4: Restart Frontend
```powershell
npm run dev
```

Frontend will run on: `http://localhost:5176` (or 5173)

---

## Alternative: Use Environment Variable

Instead of hardcoding, you can set CORS origins via environment variable:

**In `server/.env`:**
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5176,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5176
```

Then restart the backend.

---

## Verification

### Test CORS is Working
1. Open browser DevTools (F12)
2. Go to Network tab
3. Make an API call
4. Check the response headers for:
   ```
   Access-Control-Allow-Origin: http://localhost:5176
   ```

### If Still Getting Error
1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Check backend is running**: `http://localhost:3002/health`
3. **Check frontend URL**: Should match `VITE_PROXY_URL`
4. **Check console logs**: Look for CORS errors

---

## Common CORS Issues

| Issue | Solution |
|-------|----------|
| Port mismatch | Add port to `allowedOrigins` array |
| Protocol mismatch (http vs https) | Ensure both use same protocol |
| Missing credentials | Add `credentials: true` in fetch options |
| Preflight fails | Backend must handle OPTIONS requests (cors middleware does this) |
| Backend not running | Start with `npm run dev:server` |

---

## For Production

When deploying to production, update CORS origins:

```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'https://api.yourdomain.com'
];
```

Or set in `.env`:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## ngrok with CORS

If using ngrok, add the ngrok URL to allowed origins:

```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5176,https://abc123.ngrok.io
```

Then restart backend.

---

## Quick Checklist

- [ ] Backend updated with port 5176
- [ ] Backend restarted (`npm run dev:server`)
- [ ] Frontend `.env` has correct `VITE_PROXY_URL`
- [ ] Frontend restarted (`npm run dev`)
- [ ] Browser cache cleared
- [ ] No errors in browser console
- [ ] API call succeeds with correct response

---

## Still Not Working?

1. **Check backend health:**
   ```bash
   curl http://localhost:3002/health
   ```

2. **Check CORS headers:**
   ```bash
   curl -H "Origin: http://localhost:5176" http://localhost:3002/health -v
   ```

3. **Check logs:**
   - Backend console for request logs
   - Browser DevTools for network errors

4. **Verify environment:**
   - Frontend running on correct port
   - Backend running on port 3002
   - No firewall blocking ports
