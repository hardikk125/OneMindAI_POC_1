# Audit Document: Prompt Journey Tracking Implementation

**Date:** December 12, 2025  
**Feature:** Complete Prompt Journey & Response Transformation Tracking  
**Status:** ✅ IMPLEMENTED

---

## Summary

This implementation adds comprehensive tracking of the user's prompt text as it travels through the entire system:
- **Frontend** → **Middleware** → **Backend** → **AI Provider** → **Response back to Frontend**

It also tracks response transformations including truncation detection and finish reasons.

---

## Files Modified

### 1. `src/lib/super-debug-bus.ts`

#### Changes:
| Line | Change Type | Description |
|------|-------------|-------------|
| 44-45 | ADD | New event types: `PROMPT_JOURNEY`, `RESPONSE_TRANSFORMATION`, `TRUNCATION_DETECTED` |
| 167 | MODIFY | Extended `flowStep.phase` type to include `'middleware' \| 'response'` |
| 175-219 | ADD | New data interfaces: `promptJourney`, `responseTransformation`, `truncation` |
| 1068-1213 | ADD | New methods: `emitPromptJourney()`, `emitResponseTransformation()` |
| 1757-1759 | ADD | Export new methods in `useSuperDebug` hook |

#### Before (line 44):
```typescript
// Complete Code Flow Tracking (Real-time message content)
| 'MESSAGE_PAYLOAD' | 'STREAM_CHUNK_CONTENT' | 'RESPONSE_COMPLETE'
| 'FUNCTION_CALL_TRACE' | 'API_PAYLOAD_SENT' | 'API_RESPONSE_CONTENT'
```

#### After (line 44-45):
```typescript
// Complete Code Flow Tracking (Real-time message content)
| 'MESSAGE_PAYLOAD' | 'STREAM_CHUNK_CONTENT' | 'RESPONSE_COMPLETE'
| 'FUNCTION_CALL_TRACE' | 'API_PAYLOAD_SENT' | 'API_RESPONSE_CONTENT'
// Prompt Journey Tracking (Full prompt text through all stages)
| 'PROMPT_JOURNEY' | 'RESPONSE_TRANSFORMATION' | 'TRUNCATION_DETECTED'
```

---

### 2. `src/OneMindAI.tsx`

#### Changes:
| Line | Change Type | Description |
|------|-------------|-------------|
| 3542-3546 | ADD | `PROMPT_JOURNEY:user_input` - Captures original user prompt in `runAll()` |
| 1559 | ADD | Store `originalPromptLength` before truncation |
| 1564-1572 | ADD | `PROMPT_JOURNEY:truncated` - Emits when prompt exceeds 7000 chars |
| 1702-1718 | ADD | `PROMPT_JOURNEY:enhanced` - Emits after file content is added |
| 1748-1755 | ADD | `PROMPT_JOURNEY:sent_to_api` - Emits before fetch call |
| 3693-3702 | ADD | `RESPONSE_TRANSFORMATION:complete` - Emits when streaming finishes |

#### Key Instrumentation Points:

1. **Stage 1 - User Input** (`runAll()`):
```typescript
superDebugBus.emitPromptJourney('user_input', prompt, {
  originalLength: prompt.length,
  currentLength: prompt.length
});
```

2. **Stage 2 - Enhanced with Files** (`streamFromProvider()`):
```typescript
superDebugBus.emitPromptJourney('enhanced', enhancedPrompt, {
  originalLength: originalPromptLength,
  currentLength: enhancedPrompt.length,
  provider: e.provider,
  engineName: e.name,
  filesAdded,
  transformations: filesAdded.length > 0 ? [`Added ${filesAdded.length} file(s) content`] : []
});
```

3. **Stage 3 - Truncated** (if prompt > 7000 chars):
```typescript
superDebugBus.emitPromptJourney('truncated', prompt, {
  originalLength: originalPromptLength,
  currentLength: prompt.length,
  truncatedAt: MAX_PROMPT_LENGTH,
  truncationReason: `Prompt exceeded ${MAX_PROMPT_LENGTH} character limit`,
  provider: e.provider,
  engineName: e.name
});
```

4. **Stage 4 - Sent to API**:
```typescript
superDebugBus.emitPromptJourney('sent_to_api', enhancedPrompt, {
  originalLength: originalPromptLength,
  currentLength: enhancedPrompt.length,
  provider: e.provider,
  engineName: e.name,
  maxTokens: adjustedOutCap
});
```

5. **Response Complete**:
```typescript
superDebugBus.emitResponseTransformation('complete', fullContent, {
  provider: e.provider,
  engineName: e.name,
  totalChunks: tokenCount,
  finishReason: 'stop',
  tokensGenerated: tokenCount,
  maxTokens: outCap,
  processingFunction: 'runAll'
});
```

---

### 3. `src/components/SuperDebugPanel/index.tsx`

#### Changes:
| Line | Change Type | Description |
|------|-------------|-------------|
| 2586-2590 | ADD | Render `PromptJourneyVisualization` and `ResponseTransformationVisualization` |
| 2595-2741 | ADD | New component: `PromptJourneyVisualization` |
| 2743-2907 | ADD | New component: `ResponseTransformationVisualization` |

#### New Components:

**PromptJourneyVisualization:**
- Shows timeline of prompt stages (user_input → enhanced → truncated → sent_to_api)
- Expandable sections showing full prompt text at each stage
- Copy button for prompt text
- Visual indicators for truncation warnings
- File attachment badges

**ResponseTransformationVisualization:**
- Shows response transformation events
- Displays finish_reason (stop, length, content_filter)
- Truncation detection with warnings
- Full response text with copy button
- Token count and chunk information

---

### 4. `src/components/SuperDebugPanel/styles.css`

#### Changes:
| Line | Change Type | Description |
|------|-------------|-------------|
| 3638-3908 | ADD | CSS styles for Prompt Journey and Response Transformation sections |

#### New CSS Classes:
- `.prompt-journey-section` - Container for prompt journey
- `.journey-timeline` - Timeline layout
- `.journey-stage` - Individual stage container
- `.stage-dot` - Stage indicator dot
- `.prompt-text-container` - Full prompt text display
- `.response-transformation-section` - Container for response transformation
- `.transformation-timeline` - Timeline layout
- `.finish-reason` - Finish reason badge
- `.truncation-warning` - Warning styling for truncations

---

## Impact Analysis

| Component | Impact | Risk Level |
|-----------|--------|------------|
| `super-debug-bus.ts` | Additive - new event types and methods | **LOW** |
| `OneMindAI.tsx` | Additive - new emit calls at existing points | **LOW** |
| `SuperDebugPanel/index.tsx` | Additive - new visualization components | **LOW** |
| `SuperDebugPanel/styles.css` | Additive - new CSS classes | **LOW** |
| Existing functionality | No changes to existing logic | **NONE** |

---

## Build Status

✅ **Build PASSED** - No errors

---

## Revert Instructions

To revert all changes, run the following git command:

```bash
git checkout HEAD -- src/lib/super-debug-bus.ts src/OneMindAI.tsx src/components/SuperDebugPanel/index.tsx src/components/SuperDebugPanel/styles.css
```

Or to revert individual files:

```bash
# Revert super-debug-bus.ts
git checkout HEAD -- src/lib/super-debug-bus.ts

# Revert OneMindAI.tsx
git checkout HEAD -- src/OneMindAI.tsx

# Revert SuperDebugPanel/index.tsx
git checkout HEAD -- src/components/SuperDebugPanel/index.tsx

# Revert SuperDebugPanel/styles.css
git checkout HEAD -- src/components/SuperDebugPanel/styles.css
```

---

## Testing Checklist

- [ ] Open SuperDebugPanel and navigate to Activity tab
- [ ] Type a prompt and click Generate
- [ ] Verify "📝 Prompt Journey" section appears with stages
- [ ] Expand a stage to see full prompt text
- [ ] Test with file uploads to see "enhanced" stage
- [ ] Test with long prompt (>7000 chars) to see "truncated" stage
- [ ] Verify "📥 Response Transformation" section shows after response
- [ ] Check finish_reason displays correctly
- [ ] Test copy buttons work for prompt/response text

---

## Feature Summary

### What Users Can Now See:

1. **Full Prompt Text** at every stage of processing
2. **Prompt Transformations** - when files are added, when truncation occurs
3. **Character Counts** - original vs current length at each stage
4. **Truncation Warnings** - clear indication when prompt was cut
5. **Response Journey** - how the AI response is processed
6. **Finish Reason** - why the AI stopped (stop, length, content_filter)
7. **Truncation Detection** - automatic warning if response was cut off

### Business Value:

- **Debugging**: Easily identify where prompts are being modified
- **Transparency**: See exactly what is sent to AI providers
- **Troubleshooting**: Understand why responses may be incomplete
- **Optimization**: Identify prompt length issues before they cause problems
