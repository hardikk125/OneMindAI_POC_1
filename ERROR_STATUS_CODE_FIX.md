# Status Code Extraction Fix

## Problem
Status codes were showing as "N/A" in the error panel, especially for Anthropic/Claude errors.

## Root Cause
The Anthropic SDK error object structure doesn't always have `status` or `statusCode` at the top level. The status code might be:
- In `error.status`
- In `error.statusCode`
- In `error.error.status`
- In `error.response.status`
- Or only present in the error message string

## Solution Applied

### 1. Enhanced Status Code Extraction (`OneMindAI.tsx` line ~1860)
```typescript
let extractedStatusCode = 
  error.status || 
  error.statusCode || 
  error.status_code || 
  error.error?.status ||
  error.error?.status_code ||
  error.response?.status ||
  error.response?.statusCode ||
  (typeof error.code === 'number' ? error.code : undefined);

// Fallback: Parse from error message
if (!extractedStatusCode && error.message) {
  const statusMatch = error.message.match(/\b(40[0-9]|50[0-9]|429)\b/);
  if (statusMatch) {
    extractedStatusCode = parseInt(statusMatch[1]);
  }
}
```

### 2. Added Comprehensive Logging
Added detailed console logs to debug the error structure:
- `error.status`
- `error.statusCode`
- `error.status_code`
- `error.error`
- `error.response`
- Extracted status code

## How to Test

1. **Test with Invalid API Key** (Should show 401):
   - Go to Settings
   - Enter an invalid Claude API key
   - Try to send a message
   - Check error panel - should show "Status Code: 401"

2. **Check Console Logs**:
   - Open browser console (F12)
   - Look for logs starting with `[streamFromProvider]`
   - Verify status code extraction is working

3. **Check Raw Error Section**:
   - Click "Show Raw Error" in error panel
   - Should display:
     ```json
     {
       "statusCode": 401,
       "provider": "anthropic",
       "engine": "Claude",
       "rawMessage": "...",
       "cleanedMessage": "..."
     }
     ```

## Expected Results

- ✅ Status code displays correctly (401, 429, 500, etc.)
- ✅ No more "N/A" for status codes
- ✅ Raw error JSON includes actual status code
- ✅ Works for all providers (OpenAI, Claude, Gemini, etc.)

## Next Steps

If status codes are still showing as "N/A":
1. Check browser console for the detailed error logs
2. Share the console output to identify the exact error structure
3. We can add more extraction paths based on the actual error object
