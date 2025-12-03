# 🔍 Error Flow - Complete Explanation

## 📊 **How Errors Work in OneMindAI**

This document explains exactly how errors are detected, stored, and displayed in the UI.

---

## 🎯 **The Complete Error Journey**

### **Step 1: User Clicks "Generate" Button**

**Location:** `OneMindAI.tsx` line 968
```typescript
<button 
  onClick={runAll}  // ← Triggers the main function
  disabled={isRunning || selectedEngines.length===0 || !prompt.trim()} 
>
  {isRunning ? 'Generating…' : 'Generate'}
</button>
```

---

### **Step 2: `runAll()` Function Starts**

**Location:** `OneMindAI.tsx` line 789-889

```typescript
async function runAll() {
  // 1. Initialize
  setIsRunning(true);
  setResults([]);
  setStreamingStates({});

  // 2. Run all selected engines in parallel
  const runs = selectedEngines.map(async (e) => {
    try {
      // 3. Try to stream from provider
      for await (const chunk of streamFromProvider(e, prompt, outCap)) {
        fullContent += chunk;
        updateStreamingContent(e.id, fullContent, true);
      }

      // 4. Success! Return result with success: true
      return {
        engineId: e.id,
        success: true,
        error: null,  // ← No error
        responsePreview: fullContent,
        // ... other fields
      } as RunResult;

    } catch (error: any) {
      // 5. ERROR CAUGHT HERE! ⚠️
      return {
        engineId: e.id,
        success: false,
        error: error.message,  // ← Error message stored here!
        responsePreview: '',
        reason: 'Streaming failed',
        // ... other fields
      } as RunResult;
    }
  });

  // 6. Wait for all engines to finish
  const out = await Promise.all(runs);
  
  // 7. Store results (including errors)
  setResults(out);  // ← Results with errors saved to state
}
```

---

### **Step 3: API Call in `streamFromProvider()`**

**Location:** `OneMindAI.tsx` line 293-780

#### **Example: Gemini API Call**

```typescript
async function* streamFromProvider(e: Engine, prompt: string, outCap: number) {
  // ... setup code ...

  try {
    if (e.provider === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(e.apiKey);
      const model = genAI.getGenerativeModel({ 
        model: e.selectedVersion,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: Math.max(outCap, 4000),
        },
      });

      // THIS IS WHERE THE ERROR HAPPENS! ⚠️
      const result = await model.generateContentStream(contentParts);
      
      // If rate limit exceeded, Gemini SDK throws error:
      // Error: Rate limit exceeded for Gemini. Please wait and try again.
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    }
  } catch (error) {
    // Error bubbles up to runAll() catch block
    throw error;
  }
}
```

#### **Example: Mistral API Call with Explicit Error Handling**

```typescript
else if (e.provider === 'mistral') {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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

  // CHECK FOR HTTP ERRORS ⚠️
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API error (${response.status}): ${response.statusText}. ${errorText}`);
  }
  
  // ... streaming code ...
}
```

---

### **Step 4: Error Types and Messages**

#### **Common Errors:**

**1. Rate Limit Error (Gemini)**
```typescript
// From Gemini SDK:
throw new Error("Rate limit exceeded for Gemini. Please wait and try again.");
```

**2. Invalid API Key**
```typescript
// From OpenAI SDK:
throw new Error("Invalid API key provided.");
```

**3. Network Error**
```typescript
// From fetch:
throw new Error("Failed to fetch");
```

**4. HTTP Status Errors**
```typescript
// From Mistral:
throw new Error("Mistral API error (429): Too Many Requests. Rate limit exceeded.");
```

**5. Missing API Key**
```typescript
// From streamFromProvider:
yield "⚠️ Gemini requires an API key for live streaming. Please add your Gemini API key in the engine settings.";
```

---

### **Step 5: Error Stored in State**

**Location:** `OneMindAI.tsx` line 882

```typescript
// After all engines finish (success or error):
const out = await Promise.all(runs);
setResults(out);  // ← State updated with results

// Example result object with error:
{
  engineId: "gemini",
  engineName: "Gemini",
  version: "gemini-2.0-flash-exp",
  success: false,
  error: "Rate limit exceeded for Gemini. Please wait and try again.",  // ← ERROR HERE
  responsePreview: "",
  tokensIn: 0,
  tokensOut: 0,
  costUSD: 0,
  durationMs: 523,
  warnings: ["Rate limit exceeded for Gemini. Please wait and try again."],
  attempts: 1,
  reason: "Streaming failed"
}
```

---

### **Step 6: Error Displayed in UI**

**Location:** `OneMindAI.tsx` line 1427-1489

```typescript
{(() => {
  const e = selectedEngines.find(x => x.id === activeTab) || selectedEngines[0];
  const r = results.find(rr => rr.engineId === e.id);  // ← Find result for this engine
  
  const hasError = r?.error;  // ← Check if error exists
  
  return (
    <div>
      {/* Error Badge on Tab */}
      {hasError && !isCurrentlyStreaming && (
        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          Error
        </span>
      )}
      
      {/* Error Message Display */}
      {hasError ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600">...</svg>
            <div>
              <div className="font-semibold text-red-900 mb-1">Error</div>
              <div className="text-red-800 text-sm">{r?.error}</div>  {/* ← ERROR SHOWN HERE */}
            </div>
          </div>
        </div>
      ) : currentContent ? (
        <EnhancedMarkdownRenderer content={currentContent} />
      ) : null}
    </div>
  );
})()}
```

---

## 🎨 **Visual Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS "GENERATE"                                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. runAll() FUNCTION STARTS                                 │
│    - Loops through selected engines                         │
│    - Calls streamFromProvider() for each                    │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. streamFromProvider() MAKES API CALL                      │
│    - Gemini: genAI.generateContentStream()                  │
│    - OpenAI: client.chat.completions.create()               │
│    - Mistral: fetch('https://api.mistral.ai/...')           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
         ┌───────────┴───────────┐
         ↓                       ↓
┌─────────────────┐    ┌─────────────────────────┐
│ SUCCESS ✅      │    │ ERROR ❌                │
│ - Streams data  │    │ - SDK throws error      │
│ - Returns result│    │ - catch block catches   │
│ - error: null   │    │ - error: "message"      │
└────────┬────────┘    └────────┬────────────────┘
         │                      │
         └──────────┬───────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RESULT STORED IN STATE                                   │
│    setResults([                                             │
│      { engineId: "gemini", error: "Rate limit...", ... },   │
│      { engineId: "openai", error: null, ... },              │
│    ])                                                       │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. UI RENDERS ERROR                                         │
│    - Checks: hasError = r?.error                            │
│    - Shows red box with error message                       │
│    - Shows red "Error" badge on tab                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 **How to Verify This is Working**

### **Test 1: Check Browser Console**

1. Open DevTools (F12)
2. Go to Console tab
3. Click "Generate"
4. Look for errors:

```javascript
// You'll see:
Error: Rate limit exceeded for Gemini. Please wait and try again.
    at streamFromProvider (OneMindAI.tsx:543)
    at runAll (OneMindAI.tsx:810)
```

### **Test 2: Check React DevTools**

1. Install React DevTools extension
2. Open Components tab
3. Find `OneMindAI_v14Mobile` component
4. Look at `results` state:

```javascript
results: [
  {
    engineId: "gemini",
    error: "Rate limit exceeded for Gemini. Please wait and try again.",
    success: false,
    // ...
  }
]
```

### **Test 3: Check Network Tab**

1. Open DevTools → Network tab
2. Click "Generate"
3. Look for failed requests:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent
Status: 429 Too Many Requests
Response: {"error": {"code": 429, "message": "Rate limit exceeded"}}
```

---

## 📝 **Error Message Examples**

### **What You See in UI:**

**Gemini Rate Limit:**
```
❌ Error
Rate limit exceeded for Gemini. Please wait and try again.
```

**Invalid API Key:**
```
❌ Error
Invalid API key provided.
```

**Network Error:**
```
❌ Error
Failed to fetch
```

**Mistral Error:**
```
❌ Error
Mistral API error (429): Too Many Requests. Rate limit exceeded.
```

---

## ✅ **Summary**

**Error Flow:**
1. ✅ User clicks Generate
2. ✅ `runAll()` calls `streamFromProvider()`
3. ✅ API call fails (rate limit, invalid key, etc.)
4. ✅ Error caught in `catch` block
5. ✅ Error stored in `RunResult.error` field
6. ✅ Result saved to `results` state
7. ✅ UI checks `r?.error`
8. ✅ Red error box displayed with message

**The error you see is the ACTUAL error from the API!** 🎯
