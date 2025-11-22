# 🧪 Retry Button Testing Guide

## ✅ **Test Error Injection is NOW ENABLED**

I've enabled the test error injection in `src/OneMindAI.tsx` to throw a **429 Rate Limit** error.

---

## 🎯 **What Will Happen:**

### **Step-by-Step Flow:**

1. **You send a prompt** (any prompt, to OpenAI engine)
2. **System immediately throws 429 error** (before making real API call)
3. **Auto-retry starts:**
   ```
   ⏳ Rate limit retry 1/4... Waiting 1.0s
   ⏳ Rate limit retry 2/4... Waiting 2.0s
   ⏳ Rate limit retry 3/4... Waiting 4.0s
   ⏳ Rate limit retry 4/4... Waiting 8.0s
   ```
4. **All 4 retries fail** (because TEST_ERROR keeps throwing)
5. **Error panel appears** with:
   - Error code: "RATE LIMIT"
   - Explanation: "You are sending requests too quickly..."
   - **🔄 Retry Request button** ← THIS IS WHAT WE'RE TESTING!
6. **Click "Retry Request"**
7. **Auto-retry logic runs again** (another 4 attempts)
8. **Keeps failing** (because TEST_ERROR is still enabled)

---

## 📝 **Testing Steps:**

### **Test 1: See the Retry Button**

1. **Open the app** in your browser
2. **Select OpenAI engine** (make sure it's checked)
3. **Type any prompt** (e.g., "Hello")
4. **Click "Run Live"**
5. **Wait ~15 seconds** for all 4 auto-retries to fail
6. **Verify Error Panel appears** with:
   ```
   ┌──────────────────────────────────────────────────────┐
   │ 🔶 RATE LIMIT                                  [X]   │
   │ 🔄 Retrying automatically                            │
   ├──────────────────────────────────────────────────────┤
   │ 💡 What's happening:                                │
   │ You are sending requests too quickly...             │
   │                                                      │
   │ [Show more details ▼]                               │
   ├──────────────────────────────────────────────────────┤
   │ 🔄 Auto-retry exhausted                             │
   │ All automatic retry attempts failed. You can        │
   │ manually retry the request.                         │
   │                                                      │
   │ ┌────────────────────────────────────────────┐     │
   │ │  🔄  Retry Request                          │     │
   │ └────────────────────────────────────────────┘     │
   └──────────────────────────────────────────────────────┘
   ```

---

### **Test 2: Click the Retry Button**

1. **Click "Retry Request" button**
2. **Verify:**
   - Button shows spinner: `⏳ Retrying...`
   - Button is disabled (can't click again)
3. **Wait ~15 seconds** for retries to run again
4. **Error panel stays** (because TEST_ERROR is still throwing)
5. **Retry button appears again** (you can retry unlimited times)

---

### **Test 3: Verify Console Logs**

Open browser console (F12) and verify you see:

```
🔄 USER CLICKED "RETRY"
Retrying request for engine: ChatGPT - gpt-4.1
[OpenAI Auto-Recovery] ⏳ Rate limit retry 1/4... Waiting 1.0s
[OpenAI Auto-Recovery] ⏳ Rate limit retry 2/4... Waiting 2.0s
[OpenAI Auto-Recovery] ⏳ Rate limit retry 3/4... Waiting 4.0s
[OpenAI Auto-Recovery] ⏳ Rate limit retry 4/4... Waiting 8.0s
❌ Retry failed for ChatGPT - gpt-4.1: 429: Rate limit exceeded
```

---

### **Test 4: Test Success Scenario**

To test successful retry:

1. **Click Retry button**
2. **While retries are running**, quickly change the code:
   ```typescript
   const TEST_ERROR: '429' | '500' | null = null;  // ← Disable error
   ```
3. **Save the file** (app will reload)
4. **Click Retry again**
5. **This time it should succeed** and error panel closes

---

## 🔧 **Code Location:**

**File:** `src/OneMindAI.tsx`  
**Line:** ~682

```typescript
// ===== Test Error Injection (temporary) =====
// Set TEST_ERROR to '429' or '500' to simulate errors, or null to disable
const TEST_ERROR: '429' | '500' | null = '429';  // ← CURRENTLY ENABLED

if (TEST_ERROR === '429') {
  const err: any = new Error('429: Rate limit exceeded');
  err.statusCode = 429;
  err.status = 429;
  throw err;
}
```

---

## 🎨 **Expected UI Behavior:**

### **1. During Auto-Retry (First 4 Attempts):**

The streaming content area shows:
```
⏳ Rate limit retry 1/4... Waiting 1.0s

Please wait...
```

### **2. After All Retries Fail:**

Error panel appears in **bottom-right corner** with:
- Orange border (medium severity)
- 🔶 icon
- "RATE LIMIT" title
- Retry button

### **3. When Clicking Retry:**

Button changes to:
```
┌────────────────────────────────────────────┐
│  ⏳  Retrying...                            │
└────────────────────────────────────────────┘
(Disabled, spinner animating)
```

### **4. After Retry Fails Again:**

Button returns to:
```
┌────────────────────────────────────────────┐
│  🔄  Retry Request                          │
└────────────────────────────────────────────┘
(Enabled, can click again)
```

---

## 🧪 **Other Errors to Test:**

### **Test 500 Internal Server Error:**

Change line 682 to:
```typescript
const TEST_ERROR: '429' | '500' | null = '500';
```

Expected:
- Error panel shows "INTERNAL SERVER ERROR"
- Retry button appears
- Same retry behavior

### **Test Manual Error (No Retry Button):**

To test that manual errors DON'T show retry button:

1. **Use invalid API key** in settings
2. **Send request**
3. **Verify error panel shows** "INCORRECT API KEY"
4. **Verify NO retry button** (only "Action Required" section)

---

## 📊 **Checklist:**

- [ ] Error panel appears after 4 failed retries
- [ ] "RATE LIMIT" error code displayed
- [ ] Retry button visible and enabled
- [ ] Clicking retry shows spinner
- [ ] Button is disabled during retry
- [ ] Console logs show retry attempts
- [ ] Retry logic runs again (4 more attempts)
- [ ] Error panel stays if retry fails
- [ ] Can retry unlimited times
- [ ] Panel closes if retry succeeds

---

## 🔄 **To Disable Test Error:**

When done testing, change line 682 back to:

```typescript
const TEST_ERROR: '429' | '500' | null = null;  // ← DISABLED
```

This will allow normal API calls to go through.

---

## 💡 **Tips:**

1. **Watch the console** - You'll see detailed logs of retry attempts
2. **Wait for all 4 retries** - Takes about 15 seconds total (1s + 2s + 4s + 8s)
3. **Don't close error panel** - Keep it open to see the retry button
4. **Test multiple times** - Click retry button several times to see it works repeatedly

---

## 🎯 **What You're Testing:**

✅ **Retry button appears** for auto-fixable errors  
✅ **Button triggers retry logic** when clicked  
✅ **Loading state shows** during retry  
✅ **Auto-fix logic runs again** (exponential backoff)  
✅ **Panel closes on success** (if you disable TEST_ERROR)  
✅ **Panel stays on failure** (if TEST_ERROR still enabled)  
✅ **Can retry unlimited times**  

---

**Status:** 🟢 **TEST ERROR ENABLED - Ready to Test!**

Just run the app and send a prompt to OpenAI to see the retry button in action!
