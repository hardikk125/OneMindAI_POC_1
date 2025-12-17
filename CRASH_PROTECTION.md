# 🛡️ Crash Protection & Auto-Recovery

This document explains the comprehensive crash protection system implemented in OneMindAI.

## Overview

The system includes multiple layers of protection to ensure servers never crash unexpectedly:

1. **Process-level error handlers** - Catch uncaught exceptions and unhandled rejections
2. **Server error handlers** - Handle HTTP server errors gracefully
3. **Auto-restart monitor** - Automatically restart crashed servers
4. **Health monitoring** - Continuous health checks on all services

## Components

### 1. AI Proxy Server (`server/ai-proxy.cjs`)

**Protection Features:**
- ✅ Uncaught exception handler
- ✅ Unhandled promise rejection handler
- ✅ SIGTERM/SIGINT graceful shutdown
- ✅ Server error handler
- ✅ Route-level error boundaries

**Error Handling:**
```javascript
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION - SERVER CONTINUING');
  // Logs error but keeps running
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION - SERVER CONTINUING');
  // Logs error but keeps running
});
```

### 2. Balance API Server (`server/balance-api.cjs`)

**Protection Features:**
- ✅ Uncaught exception handler
- ✅ Unhandled promise rejection handler
- ✅ SIGTERM/SIGINT graceful shutdown
- ✅ Server error handler
- ✅ File system error handling

### 3. Server Monitor (`server/server-monitor.cjs`)

**Auto-Restart Features:**
- ✅ Monitors all 3 servers (Vite, Balance API, AI Proxy)
- ✅ Automatically restarts crashed servers
- ✅ Rate limiting (max 5 restarts per minute)
- ✅ Health checks every 30 seconds
- ✅ Colored logs for easy debugging
- ✅ Graceful shutdown on Ctrl+C

**Restart Logic:**
```javascript
// If server crashes, wait 3 seconds and restart
// Unless it has crashed 5+ times in 60 seconds
if (recentRestarts.length >= MAX_RESTARTS) {
  log('Too many crashes - manual intervention required');
  return;
}
```

## Usage

### Standard Mode (Current)
```bash
npm run dev:all
```
- Runs all servers with concurrently
- Crash protection enabled in each server
- Manual restart required if all servers crash

### Safe Mode (Recommended for Production)
```bash
npm run dev:safe
```
- Uses server monitor for auto-restart
- Automatic recovery from crashes
- Health monitoring included
- Better logging and debugging

## What Happens on Crash?

### Without Monitor (`npm run dev:all`)
1. Error is caught by process handlers
2. Error is logged to console
3. Server continues running
4. If error is fatal, server stops but others continue

### With Monitor (`npm run dev:safe`)
1. Error is caught by process handlers
2. Error is logged to console
3. If server exits, monitor detects it
4. Monitor waits 3 seconds
5. Monitor automatically restarts the server
6. If crashes 5+ times in 60s, stops auto-restart

## Common Crash Scenarios & Solutions

### Scenario 1: Port Already in Use
**Error:** `EADDRINUSE`
**Solution:** Server will exit with clear error message. Free the port or change PORT in .env

### Scenario 2: Uncaught Exception in Route Handler
**Error:** Any unhandled error in API route
**Solution:** Error is logged, response returns 500, server continues

### Scenario 3: Unhandled Promise Rejection
**Error:** Promise rejection without .catch()
**Solution:** Error is logged, server continues

### Scenario 4: Out of Memory
**Error:** `JavaScript heap out of memory`
**Solution:** Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096`

### Scenario 5: File System Errors
**Error:** Cannot read/write CSV database
**Solution:** Error is caught, returns 500 to client, server continues

## Monitoring & Debugging

### Check Server Health
```bash
# AI Proxy
curl http://localhost:3002/health

# Balance API
curl http://localhost:3001/api/balances

# Frontend
curl http://localhost:5173
```

### View Logs
All errors are logged to console with timestamps and color coding:
- 🔵 Cyan - Vite Frontend
- 🟡 Yellow - Balance API
- 🟣 Magenta - AI Proxy
- 🔴 Red - Errors

### Force Restart
```bash
# Kill all node processes
taskkill /IM node.exe /F

# Restart with monitor
npm run dev:safe
```

## Best Practices

### Development
1. Use `npm run dev:safe` for long coding sessions
2. Monitor console for error patterns
3. Fix root causes, don't rely on auto-restart

### Production
1. Always use `npm run dev:safe` or equivalent
2. Set up external monitoring (e.g., PM2, Docker health checks)
3. Configure alerts for repeated crashes
4. Review logs regularly

### Error Handling in Code
```javascript
// ✅ Good - Errors are caught
app.post('/api/endpoint', async (req, res) => {
  try {
    const result = await someAsyncOperation();
    res.json(result);
  } catch (error) {
    console.error('Error in endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// ❌ Bad - Uncaught errors will crash
app.post('/api/endpoint', async (req, res) => {
  const result = await someAsyncOperation(); // No try/catch!
  res.json(result);
});
```

## Configuration

### Restart Limits
Edit `server/server-monitor.cjs`:
```javascript
const MAX_RESTARTS = 5;        // Max restarts per window
const RESTART_WINDOW = 60000;  // Window in milliseconds
```

### Health Check Interval
```javascript
setInterval(healthCheck, 30000); // Check every 30 seconds
```

### Restart Delay
```javascript
setTimeout(() => {
  startServer(config);
}, 3000); // Wait 3 seconds before restart
```

## Troubleshooting

### Server Won't Start
1. Check if ports are free: `netstat -ano | findstr ":3001 :3002 :5173"`
2. Kill processes: `taskkill /IM node.exe /F`
3. Check .env file exists and has correct values
4. Verify Node.js version: `node --version` (should be 18+)

### Repeated Crashes
1. Check console logs for error patterns
2. Review recent code changes
3. Check system resources (RAM, disk space)
4. Verify API keys are valid
5. Check network connectivity

### Monitor Not Working
1. Ensure Node.js is installed
2. Run directly: `node server/server-monitor.cjs`
3. Check for syntax errors in monitor script
4. Verify npm scripts in package.json

## Summary

✅ **Crash Protection Enabled**
- All servers have error handlers
- Uncaught exceptions don't crash servers
- Unhandled rejections are logged
- Graceful shutdown on termination signals

✅ **Auto-Restart Available**
- Use `npm run dev:safe` for automatic recovery
- Monitors all 3 servers
- Rate-limited restarts prevent infinite loops
- Health checks ensure services are responsive

✅ **Production Ready**
- Comprehensive error logging
- Graceful degradation
- Clear error messages
- Easy debugging with colored logs

**The servers will now stay running until you explicitly terminate them!** 🚀
