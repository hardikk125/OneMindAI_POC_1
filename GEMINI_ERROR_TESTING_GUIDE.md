# 🧪 Gemini Error Testing Guide

## ✅ Test Error Enabled!

Gemini error testing is now enabled in `OneMindAI.tsx` (line 773).

---

## 🎯 How to Test Gemini Errors in Real-Time

### **Step 1: Select Gemini Provider**
1. Open the application
2. In the engine selector, choose **Gemini**
3. Make sure Gemini is enabled and has an API key

### **Step 2: Send a Request**
1. Type any prompt (e.g., "Hello")
2. Click "Run All" or send the request
3. Watch the Gemini error handling in action!

---

## 🔧 Available Test Errors

Currently enabled: **429 - RESOURCE_EXHAUSTED (Rate Limit)**

### **To Test Different Errors:**

Edit `OneMindAI.tsx` line 773 and change `GEMINI_TEST_ERROR`:

```typescript
const GEMINI_TEST_ERROR: '429' | '500' | '503' | '504' | '400' | '403' | '404' | 'safety' | null = '429';
```

### **Available Options:**

| Error Code | Description | Auto-Fixable |
|------------|-------------|--------------|
| `'429'` | RESOURCE_EXHAUSTED - Rate limit exceeded | ✅ Yes (4 retries) |
| `'500'` | INTERNAL - Unexpected error on Google's side | ✅ Yes (4 retries) |
| `'503'` | UNAVAILABLE - Service temporarily overloaded | ✅ Yes (4 retries) |
| `'504'` | DEADLINE_EXCEEDED - Processing took too long | ✅ Yes (4 retries) |
| `'400'` | INVALID_ARGUMENT - Request body is malformed | ❌ No |
| `'403'` | PERMISSION_DENIED - API key lacks permissions | ❌ No |
| `'404'` | NOT_FOUND - Requested resource not found | ❌ No |
| `'safety'` | SAFETY_BLOCK - Content blocked by safety filters | ❌ No |
| `null` | Disable test errors (normal operation) | N/A |

---

## 📊 What You'll See

### **Auto-Fixable Errors (429, 500, 503, 504):**

```
[Gemini] · gemini-2.5-flash-lite  [🟢 Streaming...]
─────────────────────────────────────────────
⏳ Rate limit retry 1/4: Waiting 1.0s...
Please wait...
```

After all retries fail:

```
[Gemini] · gemini-2.5-flash-lite  [🔴 Error] [🔄 Retry]
─────────────────────────────────────────────
❌ Error: 429: RESOURCE_EXHAUSTED - Rate limit exceeded
```

**Error Panel (bottom-right):**
```
┌──────────────────────────────────────────────────────┐
│ 🔶 GEMINI_RESOURCE_EXHAUSTED                   [X]   │
│ Provider: Google Gemini                              │
│                                                      │
│ 💡 What's Happening:                                │
│ • Exceeded rate limit                               │
│ • Sending too many requests per minute              │
│ • Temporarily blocked - will retry automatically    │
│                                                      │
│ 🔄 Auto-Retry Timeline:                             │
│ [████████████████████] 1. Wait 1s                   │
│ [████████████████████] 2. Wait 2s                   │
│ [████████████████████] 3. Wait 4s                   │
│ [████████████████████] 4. Wait 8s                   │
│                                                      │
│ 🔧 How to Fix:                                      │
│ Technical:                                           │
│ 1. Reduce request frequency                         │
│ 2. Implement exponential backoff (done)             │
│ 3. Check rate limits                                │
│ 4. Request quota increase if needed                 │
│                                                      │
│ Business:                                            │
│ 1. Sending requests too quickly                     │
│ 2. System will retry automatically                  │
│ 3. Consider upgrading plan                          │
│                                                      │
│ 📞 Need Help?                                       │
│ Request quota increase at:                          │
│ https://ai.google.dev/gemini-api/docs/rate-limits   │
│                                                      │
│ ┌────────────────────────────────────────────┐      │
│ │  🔄  Retry Request                          │      │
│ └────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────┘
```

---

### **Manual Fix Errors (400, 403, 404, safety):**

```
[Gemini] · gemini-2.5-flash-lite  [🔴 Error]
─────────────────────────────────────────────
❌ Error: 403: PERMISSION_DENIED - API key lacks required permissions

🔧 Action Required:
1. Go to https://aistudio.google.com/app/apikey
2. Verify API key is correct
3. Check API key has required permissions
4. Update in Settings
```

**Error Panel shows:**
- 🚨 Critical severity badge
- Detailed plain English explanation
- Technical fix steps
- Business fix steps
- Google AI Studio links

---

## 🎨 Gemini-Specific Features

### **1. Provider-Specific Error Detection**
```typescript
if (error.provider === 'gemini') {
  setAnalysis(analyzeGeminiError(error.originalError || error));
}
```

### **2. Gemini Error Codes**
All errors prefixed with `GEMINI_*`:
- `GEMINI_RESOURCE_EXHAUSTED`
- `GEMINI_INTERNAL`
- `GEMINI_UNAVAILABLE`
- `GEMINI_DEADLINE_EXCEEDED` ⭐ Unique
- `GEMINI_INVALID_ARGUMENT`
- `GEMINI_FAILED_PRECONDITION` ⭐ Unique
- `GEMINI_PERMISSION_DENIED`
- `GEMINI_NOT_FOUND`
- `GEMINI_SAFETY_BLOCK` ⭐ Unique

### **3. Google AI Studio Links**
All fix instructions link to official Google resources:
- API Keys: https://aistudio.google.com/app/apikey
- API Docs: https://ai.google.dev/api
- Rate Limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Terms: https://ai.google.dev/terms

---

## 🧪 Testing Checklist

### **Auto-Fixable Errors:**
- [ ] Test 429 - Rate limit (see 4 retry attempts)
- [ ] Test 500 - Internal error (see retry with backoff)
- [ ] Test 503 - Unavailable (see retry messages)
- [ ] Test 504 - Deadline exceeded (see timeout handling) ⭐

### **Manual Fix Errors:**
- [ ] Test 400 - Invalid argument (see fix instructions)
- [ ] Test 403 - Permission denied (see API key guidance)
- [ ] Test 404 - Not found (see resource check steps)
- [ ] Test safety - Safety block (see content guidelines) ⭐

### **UI Features:**
- [ ] Error badge appears with correct severity
- [ ] Inline retry button shows for auto-fixable errors
- [ ] Error panel opens at bottom-right
- [ ] Plain English explanation is clear
- [ ] Technical steps are detailed
- [ ] Business steps are user-friendly
- [ ] Google AI Studio links work
- [ ] Retry button triggers full retry logic

---

## 🔄 Quick Test Cycle

**Test All Gemini Errors:**

1. **429 Rate Limit** (line 773: `'429'`)
   - Send request → See 4 retries → Error panel

2. **500 Internal** (line 773: `'500'`)
   - Send request → See retries → Error panel

3. **503 Unavailable** (line 773: `'503'`)
   - Send request → See retries → Error panel

4. **504 Deadline** (line 773: `'504'`) ⭐
   - Send request → See timeout handling → Error panel

5. **400 Invalid** (line 773: `'400'`)
   - Send request → Immediate error → Fix instructions

6. **403 Permission** (line 773: `'403'`)
   - Send request → Immediate error → API key guidance

7. **404 Not Found** (line 773: `'404'`)
   - Send request → Immediate error → Resource check

8. **Safety Block** (line 773: `'safety'`) ⭐
   - Send request → Immediate block → Content guidelines

---

## 🎯 Console Logs to Watch

```
[Gemini Auto-Recovery] ⏳ Rate limit retry 1/4: Waiting 1.0s...
[Gemini Auto-Recovery] ⏳ Rate limit retry 2/4: Waiting 2.0s...
[Gemini Auto-Recovery] ⏳ Rate limit retry 3/4: Waiting 4.0s...
[Gemini Auto-Recovery] ⏳ Rate limit retry 4/4: Waiting 8.0s...
[Error Recovery] Gemini error detected: GEMINI_RESOURCE_EXHAUSTED
[Error Recovery] Severity: medium | Retryable: true
```

---

## ✅ To Disable Test Errors

Set `GEMINI_TEST_ERROR` to `null`:

```typescript
const GEMINI_TEST_ERROR: '429' | '500' | '503' | '504' | '400' | '403' | '404' | 'safety' | null = null;  // ← DISABLED
```

---

## 📁 Related Files

- `OneMindAI.tsx` (line 773) - Test error injection
- `error-recovery-engine.ts` (lines 1282-1622) - Gemini error patterns
- `ErrorRecoveryPanel.tsx` (lines 21-22) - Gemini error display
- `GEMINI_ERROR_SIMULATION.html` - Interactive simulation
- `GEMINI_ERROR_ANALYSIS.md` - Error comparison

---

**Status:** ✅ **Gemini 429 error enabled for real-time testing!**

Send a request to Gemini to see the error handling in action.
