# 🚨 OneMind AI - Top 15 Historical Errors (MUST NEVER REPEAT)

> **Purpose:** Document critical, high, and medium errors that have been fixed and MUST NEVER regress.
> 
> **Rule:** Before ANY code change, verify against this list using `/error-regression` workflow.

---

## 🔴 CRITICAL ERRORS (Top 5) - Production Impacting

### ERR-CRIT-001: Silent API Failures

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-18  
**Severity:** 🔴 CRITICAL  
**Affected Area:** All API calls across application

#### What Happened
API failures were not caught, leading to:
- Silent failures with no user feedback
- Uncaught promise rejections crashing the app
- Users thinking the app was frozen
- No error logging for debugging

#### Root Cause
1. Inconsistent try/catch usage around async API calls
2. Missing error boundaries around API-dependent components
3. No centralized error handling
4. Retry logic not implemented

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
// src/lib/api-error-handler.ts
export async function safeApiCall<T>(endpoint: string, options?: RequestInit) {
  try {
    const result = await withRetry(async () => {
      const response = await fetch(endpoint, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
    return { data: result, success: true };
  } catch (error) {
    const apiError = handleApiError(error, { endpoint, method, retryCount });
    logApiError(apiError);
    return { error: apiError, success: false };
  }
}
```

#### Regression Test
`src/__tests__/regression/api-error-handling.test.ts`

#### Constraint Added
```
// 🔒 CONSTRAINT: All async API calls MUST:
1. Be wrapped in try/catch
2. Show user-friendly error message on failure
3. Log error with timestamp and context
4. Implement 3-retry with exponential backoff
5. Never expose raw stack traces to users
```

#### Reviewed By
✅ Human approved - 2024-11-19

---

### ERR-CRIT-002: Rate Limit Crashes

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-17  
**Severity:** 🔴 CRITICAL  
**Affected Area:** OpenAI API integration

#### What Happened
When hitting rate limits (429), the app would:
- Crash completely
- Lose user's conversation
- Not retry automatically
- Show cryptic error messages

#### Root Cause
No exponential backoff retry logic for rate limits

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
// src/lib/error-recovery-engine.ts
async function handleRateLimit(error: any, attempt: number) {
  const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, 8s
  await sleep(delay);
  return { shouldRetry: true, delay };
}
```

#### Regression Test
Manual test: Set `TEST_ERROR = '429'` in OneMindAI.tsx

#### Constraint Added
```
// 🔒 CONSTRAINT: Rate limit errors (429) MUST:
1. Auto-retry with exponential backoff (1s → 2s → 4s → 8s)
2. Show progress to user ("Retry 1/4...")
3. Never crash the app
4. Preserve conversation state during retries
```

#### Reviewed By
✅ Human approved - 2024-11-18

---

### ERR-CRIT-003: Streaming Response Corruption

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-16  
**Severity:** 🔴 CRITICAL  
**Affected Area:** SSE streaming for all LLM providers

#### What Happened
Streaming responses would:
- Show garbled text with control characters
- Display raw JSON chunks
- Break markdown formatting mid-stream
- Lose formatting on reconnection

#### Root Cause
1. Not parsing SSE data: prefix correctly
2. Accumulating raw chunks without cleaning
3. Not handling incomplete JSON fragments

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
// src/lib/streaming-parser.ts
function parseSSEChunk(chunk: string): string {
  // Remove "data: " prefix
  if (chunk.startsWith('data: ')) {
    chunk = chunk.slice(6);
  }
  // Handle [DONE] signal
  if (chunk.trim() === '[DONE]') return '';
  // Parse JSON safely
  try {
    const json = JSON.parse(chunk);
    return json.choices[0]?.delta?.content || '';
  } catch {
    return ''; // Ignore malformed chunks
  }
}
```

#### Regression Test
Test with all providers: OpenAI, DeepSeek, Claude, Gemini

#### Constraint Added
```
// 🔒 CONSTRAINT: SSE streaming MUST:
1. Strip "data: " prefix before parsing
2. Handle [DONE] signal gracefully
3. Ignore malformed JSON chunks (don't crash)
4. Preserve markdown formatting during stream
5. Test with ALL LLM providers before deployment
```

#### Reviewed By
✅ Human approved - 2024-11-17

---

### ERR-CRIT-004: Credit Deduction Race Condition

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-15  
**Severity:** 🔴 CRITICAL  
**Affected Area:** Credit system (Supabase RPC)

#### What Happened
Users were:
- Charged multiple times for single request
- Losing credits on failed requests
- Getting negative balances
- Experiencing double-deduction bugs

#### Root Cause
1. Deducting credits BEFORE API call completes
2. No database transaction atomicity
3. Race condition in concurrent requests

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
// src/lib/supabase/credit-service.ts
export async function deductCredits(userId: string, amount: number) {
  // CRITICAL: Only deduct AFTER successful API response
  const { data, error } = await supabase.rpc('deduct_credits_atomic', {
    p_user_id: userId,
    p_amount: amount,
    p_provider: provider,
    p_model: model
  });
  
  if (error) throw new Error('Credit deduction failed');
  return data;
}
```

#### Regression Test
`src/__tests__/regression/credit-race-condition.test.ts`

#### Constraint Added
```
// 🔒 CONSTRAINT: Credit deduction MUST:
1. Happen ONLY after successful API response
2. Use atomic database transactions (RPC)
3. Never deduct on API failure
4. Log all transactions with timestamp
5. Handle concurrent requests safely
```

#### Reviewed By
✅ Human approved - 2024-11-16

---

### ERR-CRIT-005: Token Limit Silent Truncation

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-14  
**Severity:** 🔴 CRITICAL  
**Affected Area:** Context window management

#### What Happened
When context exceeded token limits:
- Messages silently truncated without warning
- Users lost conversation history
- No indication of truncation
- Responses became incoherent

#### Root Cause
No validation or warning before sending oversized context

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
// src/lib/token-counter.ts
export function validateContextSize(messages: Message[], model: string) {
  const limit = MODEL_TOKEN_LIMITS[model];
  const current = countTokens(messages);
  
  if (current > limit * 0.9) {
    return {
      valid: false,
      current,
      limit,
      message: `Context too large (${current}/${limit} tokens). Please start a new conversation.`
    };
  }
  return { valid: true };
}
```

#### Regression Test
Test with long conversations exceeding 4K, 8K, 16K, 32K limits

#### Constraint Added
```
// 🔒 CONSTRAINT: Token limits MUST:
1. Validate BEFORE sending to API
2. Warn user at 90% of limit
3. Block at 100% of limit with clear message
4. Show current/max tokens in UI
5. Suggest starting new conversation
```

#### Reviewed By
✅ Human approved - 2024-11-15

---

## 🟡 HIGH SEVERITY ERRORS (Top 5) - User Experience Breaking

### ERR-HIGH-001: Markdown Rendering Breaks

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-13  
**Severity:** 🟡 HIGH  
**Affected Area:** Message rendering (react-markdown)

#### What Happened
- Code blocks not rendering
- Tables showing as raw markdown
- Lists not formatting
- Links not clickable

#### Root Cause
Missing markdown plugins and improper configuration

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeRaw]}
  components={{
    code: CodeBlock,
    table: TableComponent,
    // ... other components
  }}
>
```

#### Constraint Added
```
// 🔒 CONSTRAINT: Markdown rendering MUST:
1. Include remarkGfm for tables/strikethrough
2. Include rehypeRaw for HTML support
3. Have custom components for code/tables
4. Test with all markdown features before deploy
```

#### Reviewed By
✅ Human approved - 2024-11-14

---

### ERR-HIGH-002: Chart Rendering Failures

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-12  
**Severity:** 🟡 HIGH  
**Affected Area:** ECharts integration

#### What Happened
- Charts not displaying
- "Cannot read property 'getContext'" errors
- Charts disappearing on re-render
- Memory leaks from undisposed charts

#### Root Cause
1. Not waiting for DOM element
2. Not disposing charts on unmount
3. Re-initializing on every render

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
useEffect(() => {
  if (!chartRef.current) return;
  
  const chart = echarts.init(chartRef.current);
  chart.setOption(option);
  
  return () => {
    chart.dispose(); // CRITICAL: Prevent memory leaks
  };
}, [option]);
```

#### Constraint Added
```
// 🔒 CONSTRAINT: Chart rendering MUST:
1. Wait for DOM element before init
2. Dispose chart on unmount
3. Use useEffect with proper dependencies
4. Handle window resize
```

#### Reviewed By
✅ Human approved - 2024-11-13

---

### ERR-HIGH-003: File Upload Size Limit

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-11  
**Severity:** 🟡 HIGH  
**Affected Area:** File upload (images, documents)

#### What Happened
- Large files (>10MB) crashed the app
- No size validation before upload
- Memory exhaustion on large files
- No progress indicator

#### Root Cause
No client-side validation of file size

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`);
  }
}
```

#### Constraint Added
```
// 🔒 CONSTRAINT: File uploads MUST:
1. Validate size before upload (max 10MB)
2. Show file size in UI
3. Display progress bar
4. Handle cancellation
```

#### Reviewed By
✅ Human approved - 2024-11-12

---

### ERR-HIGH-004: Copy Button Not Working

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-10  
**Severity:** 🟡 HIGH  
**Affected Area:** Copy to clipboard functionality

#### What Happened
- Copy buttons did nothing
- No feedback when copying
- Clipboard API not supported in HTTP
- Rich text not copying formatting

#### Root Cause
1. Using deprecated document.execCommand
2. Not checking clipboard API support
3. No fallback for HTTP (non-HTTPS)

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
async function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for HTTP
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  showToast('Copied!');
}
```

#### Constraint Added
```
// 🔒 CONSTRAINT: Copy functionality MUST:
1. Use navigator.clipboard if available
2. Fallback to execCommand for HTTP
3. Show success feedback
4. Handle errors gracefully
```

#### Reviewed By
✅ Human approved - 2024-11-11

---

### ERR-HIGH-005: Retry Button State Desync

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-09  
**Severity:** 🟡 HIGH  
**Affected Area:** Error recovery retry button

#### What Happened
- Retry button stayed disabled after error
- Multiple clicks sent duplicate requests
- Loading state not clearing
- Button showing wrong state

#### Root Cause
State not resetting after retry completion

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
const [isRetrying, setIsRetrying] = useState(false);

async function handleRetry() {
  if (isRetrying) return; // Prevent duplicate
  
  setIsRetrying(true);
  try {
    await retryRequest();
  } finally {
    setIsRetrying(false); // ALWAYS reset
  }
}
```

#### Constraint Added
```
// 🔒 CONSTRAINT: Retry buttons MUST:
1. Disable during retry (prevent duplicates)
2. Always reset state in finally block
3. Show loading indicator
4. Handle both success and failure
```

#### Reviewed By
✅ Human approved - 2024-11-10

---

## 🟢 MEDIUM SEVERITY ERRORS (Top 5) - UX Degradation

### ERR-MED-001: Scroll Position Lost on Re-render

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-08  
**Severity:** 🟢 MEDIUM  
**Affected Area:** Message list scrolling

#### What Happened
Scroll jumped to top when new message arrived

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
useEffect(() => {
  if (shouldAutoScroll) {
    scrollToBottom();
  }
}, [messages]);
```

#### Constraint Added
```
// 🔒 CONSTRAINT: Scroll behavior MUST:
1. Auto-scroll only if user at bottom
2. Preserve position if user scrolled up
3. Smooth scroll for new messages
```

#### Reviewed By
✅ Human approved - 2024-11-09

---

### ERR-MED-002: Dark Mode Flash on Load

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-07  
**Severity:** 🟢 MEDIUM  
**Affected Area:** Theme switching

#### What Happened
White flash before dark mode applied

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
// Add to index.html <head>
<script>
  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.add(theme);
</script>
```

#### Constraint Added
```
// 🔒 CONSTRAINT: Theme MUST:
1. Load from localStorage before render
2. Apply class to <html> immediately
3. No flash of unstyled content
```

#### Reviewed By
✅ Human approved - 2024-11-08

---

### ERR-MED-003: Export Button Missing Data

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-06  
**Severity:** 🟢 MEDIUM  
**Affected Area:** Conversation export

#### What Happened
Exported files missing timestamps and metadata

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
function exportConversation(messages: Message[]) {
  const data = {
    timestamp: new Date().toISOString(),
    model: currentModel,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    }))
  };
  downloadJSON(data, `conversation-${Date.now()}.json`);
}
```

#### Constraint Added
```
// 🔒 CONSTRAINT: Exports MUST include:
1. Timestamp
2. Model used
3. All message metadata
4. Proper filename with date
```

#### Reviewed By
✅ Human approved - 2024-11-07

---

### ERR-MED-004: Model Selector Not Updating

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-05  
**Severity:** 🟢 MEDIUM  
**Affected Area:** Model selection dropdown

#### What Happened
Selected model not reflecting in UI

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

function handleModelChange(model: string) {
  setSelectedModel(model);
  localStorage.setItem('selectedModel', model);
}
```

#### Constraint Added
```
// 🔒 CONSTRAINT: Model selection MUST:
1. Update state immediately
2. Persist to localStorage
3. Reflect in UI instantly
4. Apply to next request
```

#### Reviewed By
✅ Human approved - 2024-11-06

---

### ERR-MED-005: Toast Notifications Stacking

**Status:** 🟢 Fixed  
**Date Discovered:** 2024-11-04  
**Severity:** 🟢 MEDIUM  
**Affected Area:** Toast notification system

#### What Happened
Multiple toasts overlapping and not dismissing

#### Fix Applied
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
const [toasts, setToasts] = useState<Toast[]>([]);

function showToast(message: string) {
  const id = Date.now();
  setToasts(prev => [...prev, { id, message }]);
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, 3000);
}
```

#### Constraint Added
```
// 🔒 CONSTRAINT: Toasts MUST:
1. Auto-dismiss after 3 seconds
2. Stack vertically without overlap
3. Have unique IDs
4. Be dismissible manually
```

#### Reviewed By
✅ Human approved - 2024-11-05

---

## 📊 Error Statistics

| Severity | Count | Fixed | Regression Risk |
|----------|-------|-------|-----------------|
| 🔴 Critical | 5 | 5 | HIGH if regressed |
| 🟡 High | 5 | 5 | MEDIUM if regressed |
| 🟢 Medium | 5 | 5 | LOW if regressed |
| **Total** | **15** | **15** | **ZERO TOLERANCE** |

---

## 🔒 Protection Markers

All fixed code contains this marker:
```typescript
// 🔒 DO NOT MODIFY WITHOUT UPDATING ERROR_REGISTRY.md
```

**If you see this marker:**
1. STOP immediately
2. Check `docs/ERROR_REGISTRY.md`
3. Run `/error-regression` workflow
4. Get explicit approval before proceeding

---

## ✅ Verification Checklist

Before ANY deployment, verify:

- [ ] All 15 errors still have protection markers
- [ ] All regression tests still passing
- [ ] No defensive code removed
- [ ] No "cleaner" refactors that weaken safety
- [ ] All constraints still enforced
- [ ] Error registry updated if new error found

---

**Last Updated:** 2024-12-09  
**Next Review:** Before every major release  
**Owner:** Development Team  
**Enforcement:** `/error-regression` workflow (NON-NEGOTIABLE)
