# 🔧 DeepSeek Error Handling Implementation

## Overview

DeepSeek API integration includes comprehensive error recovery with the same auto-fix mechanisms as OpenAI, supporting all 25 error types with automatic retry logic and detailed error panels.

---

## 🎯 DeepSeek Integration Details

### **API Configuration:**
```typescript
{
  id: "deepseek",
  name: "DeepSeek",
  provider: "deepseek",
  tokenizer: "tiktoken",
  contextLimit: 128_000,
  versions: ["deepseek-chat", "deepseek-coder"],
  selectedVersion: "deepseek-chat",
  apiKey: "sk-9ee71214eb9a4faf976c3f225fd399d3"
}
```

### **Pricing:**
```typescript
deepseek: {
  "deepseek-chat": { 
    in: 0.14,  // $0.14 per 1M tokens
    out: 0.28, // $0.28 per 1M tokens
    note: "DeepSeek Chat - Ultra low cost" 
  },
  "deepseek-coder": { 
    in: 0.14, 
    out: 0.28, 
    note: "DeepSeek Coder - Code optimized" 
  }
}
```

---

## 🔄 Auto-Fix Implementation

### **Code Location:** `src/OneMindAI.tsx` (Lines 985-1080)

### **Request Wrapper:**
```typescript
const makeDeepSeekRequest = async () => {
  const response = await fetch('/api/deepseek/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${e.apiKey}`,
    },
    body: JSON.stringify({
      model: e.selectedVersion,
      messages: [{ role: 'user', content: enhancedPrompt }],
      max_tokens: Math.max(outCap, 4000),
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorText;
    } catch {
      // Use raw text if JSON parse fails
    }
    
    // Throw an object with statusCode for the retry manager to inspect
    const error: any = new Error(`DeepSeek API error: ${errorMessage}`);
    error.statusCode = response.status;
    error.status = response.status;
    error.response = response;
    throw error;
  }

  return response;
};
```

---

### **Auto-Fix Logic:**
```typescript
let response;
try {
  // Try with Rate Limit Auto-Fix
  response = await autoFixRateLimit(
    'deepseek',
    makeDeepSeekRequest,
    (status) => {
      logger.info(`[DeepSeek Auto-Recovery] ${status}`);
      updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
    }
  );
} catch (firstError: any) {
  // Fallback to Server Error Auto-Fix if applicable
  if (firstError.statusCode === 500 || firstError.statusCode === 503) {
    response = await autoFixServerError(
      'deepseek',
      makeDeepSeekRequest,
      (status) => {
        logger.info(`[DeepSeek Auto-Recovery] ${status}`);
        updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
      }
    );
  } else {
    throw firstError;
  }
}
```

---

## 📊 All 25 Errors Supported

### **Auto-Fixable Errors (8):**

| Error Code | HTTP Status | Auto-Fix Strategy | Retry Attempts |
|------------|-------------|-------------------|----------------|
| **RATE_LIMIT** | 429 | Exponential backoff | 4 (1s → 2s → 4s → 8s) |
| **INTERNAL_SERVER_ERROR** | 500 | Exponential backoff | 4 (1s → 2s → 4s → 8s) |
| **BAD_GATEWAY** | 502 | Exponential backoff | 4 (1s → 2s → 4s → 8s) |
| **ENGINE_OVERLOADED** | 503 | Exponential backoff | 4 (1s → 2s → 4s → 8s) |
| **SLOW_DOWN** | 503 | Adaptive throttling | 4 (30% rate reduction) |
| **GATEWAY_TIMEOUT** | 504 | Exponential backoff | 4 (1s → 2s → 4s → 8s) |
| **CONNECTION_ERROR** | Network | Exponential backoff | 4 (1s → 2s → 4s → 8s) |
| **TIMEOUT_ERROR** | Network | Exponential backoff | 4 (1s → 2s → 4s → 8s) |

---

### **Manual Fix Required (17):**

| Error Code | HTTP Status | Severity | User Action Required |
|------------|-------------|----------|---------------------|
| **INVALID_AUTH** | 401 | Critical | Fix authentication |
| **INCORRECT_API_KEY** | 401 | Critical | Update API key |
| **NO_ORGANIZATION** | 401 | Critical | Add organization |
| **IP_NOT_AUTHORIZED** | 401 | High | Whitelist IP |
| **INSUFFICIENT_BALANCE** | 402 | Critical | Add credits |
| **QUOTA_EXCEEDED** | 429 | High | Upgrade plan |
| **BILLING_HARD_LIMIT** | 429 | Critical | Increase limit |
| **PERMISSION_DENIED** | 403 | High | Check permissions |
| **REGION_NOT_SUPPORTED** | 403 | High | Change region |
| **ORGANIZATION_SUSPENDED** | 403 | Critical | Contact support |
| **NOT_FOUND** | 404 | Medium | Check endpoint |
| **INVALID_FORMAT** | 400 | Medium | Fix request format |
| **CONTENT_POLICY_VIOLATION** | 400 | High | Modify content |
| **TOKEN_LIMIT_EXCEEDED** | 400 | Medium | Reduce tokens |
| **INVALID_PARAMETERS** | 422 | Medium | Fix parameters |
| **INVALID_CONTENT_TYPE** | 415 | Low | Fix content type |
| **MODEL_DEPRECATED** | 410 | High | Update model |

---

## 🎨 UI Display for DeepSeek Errors

### **Auto-Fixable Error (Rate Limit):**
```
┌─────────────────────────────────────────────────────────┐
│  [DeepSeek] · deepseek-chat  [🟢 Streaming...]         │
│  ─────────────────────────────────────────────         │
│  ⏳ Rate limit retry 1/4: Waiting 1.0s...              │
│  Please wait...                                        │
└─────────────────────────────────────────────────────────┘

(After all retries fail)

┌─────────────────────────────────────────────────────────┐
│  [DeepSeek] · deepseek-chat  [🔴 Error] [🔄 Retry]    │
│  ─────────────────────────────────────────────         │
│  ❌ Error: 429: Rate limit exceeded                    │
└─────────────────────────────────────────────────────────┘

+ Error Panel (bottom-right) with retry button
```

---

### **Manual Fix Error (Invalid API Key):**
```
┌─────────────────────────────────────────────────────────┐
│  [DeepSeek] · deepseek-chat  [🔴 Error]                │
│  ─────────────────────────────────────────────         │
│  ❌ Error: 401: Incorrect API key                      │
│                                                         │
│  🔧 Action Required:                                   │
│  1. Go to Settings                                     │
│  2. Update DeepSeek API key                            │
│  3. Verify no extra spaces                             │
└─────────────────────────────────────────────────────────┘

+ Error Panel (bottom-right) with fix instructions
```

---

## 🔍 Error Detection Priority

Same as OpenAI, DeepSeek errors are detected in this order:

1. **SDK error.type** (if using SDK)
2. **HTTP statusCode** (from response)
3. **Message patterns** (error message text)
4. **Fallback** (UNKNOWN_ERROR)

```typescript
function detectErrorCode(error: any): string {
  // 1. Check SDK error type first
  if (error.type) {
    if (error.type === 'invalid_request_error') return 'INVALID_FORMAT';
    if (error.type === 'authentication_error') return 'INVALID_AUTH';
    // ... etc
  }
  
  // 2. Check HTTP status code
  const statusCode = error.statusCode || error.status;
  if (statusCode === 429) return 'RATE_LIMIT';
  if (statusCode === 401) return 'INCORRECT_API_KEY';
  // ... etc
  
  // 3. Check message patterns
  const message = error.message?.toLowerCase() || '';
  if (message.includes('rate limit')) return 'RATE_LIMIT';
  if (message.includes('invalid api key')) return 'INCORRECT_API_KEY';
  // ... etc
  
  // 4. Fallback
  return 'UNKNOWN_ERROR';
}
```

---

## 📝 Console Logging

### **Auto-Recovery Logs:**
```
[DeepSeek Auto-Recovery] ⏳ Rate limit retry 1/4: Waiting 1.0s...
[DeepSeek Auto-Recovery] ⏳ Rate limit retry 2/4: Waiting 2.0s...
[DeepSeek Auto-Recovery] ⏳ Rate limit retry 3/4: Waiting 4.0s...
[DeepSeek Auto-Recovery] ⏳ Rate limit retry 4/4: Waiting 8.0s...
```

### **Error Logs:**
```
❌ Retry failed for DeepSeek: 429: Rate limit exceeded
```

### **Success Logs:**
```
✅ Retry successful for DeepSeek in 2.5s
```

---

## 🎯 Retry Button Feature

### **Inline Retry Button:**
Appears next to error badge in DeepSeek engine card:
```
[DeepSeek] · deepseek-chat  [🔴 Error] [🔄 Retry]
```

### **Panel Retry Button:**
Appears in error recovery panel (bottom-right):
```
┌──────────────────────────────────────────────────────┐
│ 🔶 RATE LIMIT                                  [X]   │
│ Provider: DeepSeek                                   │
│ ┌────────────────────────────────────────────┐      │
│ │  🔄  Retry Request                          │      │
│ └────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────┘
```

### **Retry Logic:**
Both buttons trigger the same `handleRetry()` function which:
1. Clears error states
2. Removes error result from results array
3. Calls `streamFromProvider()` again
4. Goes through auto-fix logic (4 retry attempts)
5. Shows retry messages in UI
6. Restores error states if retry fails
7. Retry button appears again

---

## 🧪 Testing DeepSeek Errors

### **Test Rate Limit (429):**
```typescript
// In makeDeepSeekRequest function, add:
const TEST_ERROR = '429';
if (TEST_ERROR === '429') {
  const err: any = new Error('429: Rate limit exceeded');
  err.statusCode = 429;
  err.status = 429;
  throw err;
}
```

### **Test Invalid API Key (401):**
```typescript
// Use invalid API key:
apiKey: "sk-invalid-key-12345"
```

### **Test Server Error (500):**
```typescript
const TEST_ERROR = '500';
if (TEST_ERROR === '500') {
  const err: any = new Error('500: Internal server error');
  err.statusCode = 500;
  err.status = 500;
  throw err;
}
```

---

## 📊 DeepSeek-Specific Features

### **1. Ultra Low Cost:**
- Input: $0.14 per 1M tokens
- Output: $0.28 per 1M tokens
- ~10x cheaper than GPT-4

### **2. Two Models:**
- **deepseek-chat**: General conversation
- **deepseek-coder**: Code-optimized

### **3. Large Context:**
- 128K token context window
- Same as GPT-4

### **4. Streaming Support:**
- Full streaming implementation
- Real-time token display
- Auto-scroll

### **5. Error Recovery:**
- Same 25 errors as OpenAI
- Same auto-fix logic
- Same retry mechanisms

---

## 🔄 Comparison: DeepSeek vs OpenAI Error Handling

| Feature | DeepSeek | OpenAI | Status |
|---------|----------|--------|--------|
| **Total Errors Covered** | 25 | 25 | ✅ Same |
| **Auto-Fixable Errors** | 8 | 8 | ✅ Same |
| **Manual Fix Errors** | 17 | 17 | ✅ Same |
| **Retry Attempts** | 4 | 4 | ✅ Same |
| **Exponential Backoff** | 1s→2s→4s→8s | 1s→2s→4s→8s | ✅ Same |
| **Retry Button** | ✅ Yes | ✅ Yes | ✅ Same |
| **Error Panel** | ✅ Yes | ✅ Yes | ✅ Same |
| **Console Logging** | ✅ Yes | ✅ Yes | ✅ Same |
| **UI Messages** | ✅ Yes | ✅ Yes | ✅ Same |

---

## ✅ Summary

| Aspect | Implementation |
|--------|----------------|
| **Error Coverage** | ✅ All 25 errors |
| **Auto-Fix Logic** | ✅ Rate limit + Server error |
| **Retry Mechanism** | ✅ 4 attempts with exponential backoff |
| **UI Display** | ✅ Error badges + Retry buttons + Panels |
| **Console Logging** | ✅ Detailed recovery logs |
| **Streaming Support** | ✅ Full streaming with retry messages |
| **Cost Tracking** | ✅ Token counting + Cost estimation |

---

**Status:** ✅ **DeepSeek has identical error handling to OpenAI!**

All 25 errors are supported with the same auto-fix logic, retry mechanisms, and UI features.
