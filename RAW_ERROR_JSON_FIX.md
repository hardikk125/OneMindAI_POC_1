# Raw Error JSON Extraction Fix

## Problem
The "Show Raw Error" section was showing cleaned/processed messages instead of the actual raw JSON error from the API.

## Solution Applied

### 1. Extract Raw API Error Message (`OneMindAI.tsx` line ~1891)
```typescript
// Extract the truly raw error message from the API
let rawApiMessage = 'Unknown error occurred';
try {
  // Try to get the most detailed error message available
  if (error.error?.message) {
    rawApiMessage = error.error.message; // Anthropic SDK nested error
  } else if (error.message) {
    rawApiMessage = error.message; // Direct error message
  }
  
  // For some APIs, the full error details are in error.error
  if (error.error && typeof error.error === 'object') {
    // Include error type and message if available
    const errorDetails = [];
    if (error.error.type) errorDetails.push(`Type: ${error.error.type}`);
    if (error.error.message) errorDetails.push(error.error.message);
    if (errorDetails.length > 0) {
      rawApiMessage = errorDetails.join(' | ');
    }
  }
} catch (e) {
  console.error('[streamFromProvider] Error extracting raw message:', e);
}
```

### 2. Add Full Raw JSON Field
```typescript
const enhancedError = {
  message: cleanedMessage,
  rawMessage: rawApiMessage, // Real raw error from API
  rawJson: JSON.stringify(error, null, 2), // Full error JSON for debugging
  statusCode: extractedStatusCode,
  // ... other fields
};
```

### 3. Display in Error Panel (`ErrorRecoveryPanel.tsx`)

The "Show Raw Error" section now displays three parts:

1. **Status Code**: Highlighted in yellow (or gray if N/A)
2. **Raw API Error Message**: The actual error message from the API
3. **Full Raw Error JSON**: Complete error object as JSON
4. **Processed Error Summary**: Our cleaned/processed version

```tsx
{showRaw && (
  <div className="mt-3 bg-gray-900 p-3 rounded space-y-2">
    {/* Status Code */}
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Status Code:</span>
      <span className="text-sm font-mono font-bold text-yellow-400">
        {rawErrorData.statusCode}
      </span>
    </div>
    
    {/* Raw API Error Message */}
    <div>
      <p className="text-xs text-gray-500 mb-1">Raw API Error Message:</p>
      <pre className="text-sm text-red-400 font-mono">
        {rawErrorData.rawMessage}
      </pre>
    </div>
    
    {/* Full Raw Error JSON from API */}
    <div>
      <p className="text-xs text-gray-500 mb-1">Full Raw Error JSON:</p>
      <pre className="text-xs text-green-400 overflow-auto max-h-48">
        {rawErrorData.rawJson}
      </pre>
    </div>
    
    {/* Processed Error Summary */}
    <div>
      <p className="text-xs text-gray-500 mb-1">Processed Error Summary:</p>
      <pre className="text-xs text-blue-400">
        {JSON.stringify({
          statusCode: rawErrorData.statusCode,
          provider: rawErrorData.provider,
          engine: rawErrorData.engine,
          cleanedMessage: rawErrorData.message
        }, null, 2)}
      </pre>
    </div>
  </div>
)}
```

## What You'll See Now

When you click "Show Raw Error", you'll see:

### Status Code
```
Status Code: 401
```

### Raw API Error Message
```
Type: authentication_error | Invalid API Key
```

### Full Raw Error JSON
```json
{
  "status": 401,
  "error": {
    "type": "authentication_error",
    "message": "Invalid API Key"
  },
  "message": "401 Unauthorized",
  ...
}
```

### Processed Error Summary
```json
{
  "statusCode": 401,
  "provider": "anthropic",
  "engine": "Claude",
  "cleanedMessage": "🔑 Claude: Invalid or expired API key..."
}
```

## Benefits

1. ✅ **Full transparency**: See the complete raw error from the API
2. ✅ **Better debugging**: All error details preserved
3. ✅ **Status code visible**: No more "N/A" 
4. ✅ **Comparison**: See both raw and processed versions
5. ✅ **Copy to clipboard**: Includes full raw JSON for sharing with support

## Testing

1. Trigger any error (invalid API key, rate limit, etc.)
2. Click "Show Raw Error" in the error panel
3. Verify you see:
   - Status code (not "N/A")
   - Raw API error message
   - Full JSON structure from the API
   - Processed summary
