# 🖥️ Terminal Logging Setup Guide

## Overview
This guide explains how to enable detailed terminal logging in OneMindAI to see chunk processing, library triggers, and API calls directly in your development server terminal.

---

## 📦 What Was Added

### **1. Terminal Logger Library** (`src/lib/terminal-logger.ts`)
A comprehensive logging utility that sends detailed logs to the terminal console.

### **2. Integration Points**
Terminal logging has been integrated into:
- ✅ Application startup
- ✅ User actions (button clicks)
- ✅ Function calls (`runAll()`, `streamFromProvider()`)
- ✅ File processing (TXT, JSON, Word, PDF)
- ✅ API calls (OpenAI, Claude, Gemini, etc.)
- ✅ **Chunk-by-chunk streaming** with content preview
- ✅ **Library triggers** (marked.parse(), regex, ChartRenderer)
- ✅ Markdown parsing
- ✅ Code block extraction
- ✅ Chart rendering
- ✅ State updates
- ✅ Performance metrics

---

## 🚀 How to See Terminal Logs

### **Step 1: Start Development Server**
```bash
npm run dev
```

### **Step 2: Open Your Terminal**
Keep your terminal window visible alongside your browser.

### **Step 3: Use the Application**
When you:
1. Click "Run Live"
2. Upload files
3. Receive streaming responses

You'll see **detailed logs in your terminal** like:

```
[TERMINAL] APP_START: {
  version: 'v14 Mobile-First Preview',
  platform: 'Formula2GX Digital Advanced Incubation Labs',
  timestamp: '2025-11-15T10:45:23.456Z'
}

[TERMINAL] FUNCTION_CALL: {
  functionName: 'streamFromProvider',
  params: {
    engineName: 'OpenAI GPT-4.1',
    provider: 'openai',
    promptLength: 1456,
    maxOutputTokens: 4000
  }
}

[TERMINAL] FILE_PROCESSED: {
  fileName: 'sales_data.json',
  fileType: 'application/json',
  size: 5324,
  extractedLength: 234,
  compressionRatio: '0.04'
}

[TERMINAL] STREAM_START: {
  engineName: 'OpenAI GPT-4.1',
  timestamp: 1700045123456
}

[TERMINAL] API_CALL_START: {
  provider: 'OpenAI',
  model: 'gpt-4.1',
  params: {
    maxTokens: 4000,
    temperature: 0.7,
    stream: true
  }
}

[TERMINAL] CHUNK_RECEIVED: {
  engineName: 'OpenAI GPT-4.1',
  chunkNumber: 1,
  contentLength: 5,
  contentPreview: 'Based',
  metadata: {
    totalCharsReceived: 5,
    avgChunkSize: '5.00'
  }
}

[TERMINAL] CHUNK_RECEIVED: {
  engineName: 'OpenAI GPT-4.1',
  chunkNumber: 2,
  contentLength: 3,
  contentPreview: ' on',
  metadata: {
    totalCharsReceived: 8,
    avgChunkSize: '4.00'
  }
}

... (continues for every chunk)

[TERMINAL] CHUNK_RECEIVED: {
  engineName: 'OpenAI GPT-4.1',
  chunkNumber: 157,
  contentLength: 4,
  contentPreview: 'ment',
  metadata: {
    totalCharsReceived: 1847,
    avgChunkSize: '11.76'
  }
}

[TERMINAL] STREAM_END: {
  engineName: 'OpenAI GPT-4.1',
  totalChunks: 157,
  totalChars: 1847,
  duration: 2340,
  avgChunkSize: '11.76',
  chunksPerSecond: '67.09'
}

[TERMINAL] API_CALL_END: {
  provider: 'OpenAI',
  duration: 2340,
  totalChunks: 157,
  totalChars: 1847,
  avgChunkSize: '11.76'
}

[TERMINAL] LIBRARY_TRIGGERED: {
  libraryName: 'Regex',
  action: 'Code Block Extraction',
  inputPreview: 'Based on the sales data provided, here\'s the analysis:\n\n## Revenue by Product Category\n\n| Catego...',
  outputPreview: null
}

[TERMINAL] CODE_BLOCK_EXTRACTED: {
  language: 'python',
  codeLength: 234,
  blockId: 'code-1700045125789-x7k9m2p4q'
}

[TERMINAL] LIBRARY_TRIGGERED: {
  libraryName: 'marked.parse()',
  action: 'Markdown to HTML conversion',
  inputPreview: '| Category    | Revenue  | Percentage |\n|-------------|----------|------------|\n| Electronics | $45,000  ...',
  outputPreview: 'HTML output'
}

[TERMINAL] MARKDOWN_PARSED: {
  inputLength: 1613,
  outputLength: 3847,
  features: ['tables', 'bold', 'italic', 'links', 'lists'],
  ratio: '2.38'
}
```

---

## 📊 Log Types & What They Show

### **1. Application Lifecycle**
```javascript
[TERMINAL] APP_START
[TERMINAL] COMPONENT_MOUNT: OneMindAI_v14Mobile
```

### **2. User Actions**
```javascript
[TERMINAL] USER_ACTION: {
  action: 'Run Live Clicked',
  details: { engines: 4, promptLength: 156 }
}
```

### **3. Function Calls**
```javascript
[TERMINAL] FUNCTION_CALL: {
  functionName: 'streamFromProvider',
  params: {...}
}
```

### **4. File Processing**
```javascript
[TERMINAL] FILE_PROCESSED: {
  fileName: 'data.json',
  fileType: 'application/json',
  size: 5324,
  extractedLength: 234
}
```

### **5. API Calls**
```javascript
[TERMINAL] API_CALL_START: {
  provider: 'OpenAI',
  model: 'gpt-4.1',
  params: { maxTokens: 4000, temperature: 0.7 }
}
```

### **6. Streaming Chunks (DETAILED)**
Every single chunk shows:
```javascript
[TERMINAL] CHUNK_RECEIVED: {
  engineName: 'OpenAI GPT-4.1',
  chunkNumber: 47,
  contentLength: 12,
  contentPreview: 'Electronics ',  // ← Actual chunk content!
  metadata: {
    totalCharsReceived: 567,
    avgChunkSize: '12.06'
  }
}
```

### **7. Library Triggers**
```javascript
[TERMINAL] LIBRARY_TRIGGERED: {
  libraryName: 'marked.parse()',
  action: 'Markdown to HTML conversion',
  inputPreview: '| Category | Revenue |...',
  outputPreview: '<table><thead>...'
}
```

### **8. Code Block Extraction**
```javascript
[TERMINAL] CODE_BLOCK_EXTRACTED: {
  language: 'python',
  codeLength: 234,
  blockId: 'code-1700045125789-x7k9m2p4q'
}
```

### **9. Markdown Processing**
```javascript
[TERMINAL] MARKDOWN_PARSED: {
  inputLength: 1613,
  outputLength: 3847,
  features: ['tables', 'bold', 'italic', 'links', 'lists'],
  ratio: '2.38'  // ← HTML is 2.38x larger than markdown
}
```

### **10. Performance Metrics**
```javascript
[TERMINAL] PERFORMANCE: {
  metric: 'Chunk Processing Time',
  value: 2.34,
  unit: 'ms'
}
```

### **11. Token Calculations**
```javascript
[TERMINAL] TOKEN_CALCULATION: {
  engineName: 'OpenAI GPT-4.1',
  inputTokens: 1320,
  outputTokens: 1847,
  totalTokens: 3167,
  cost: '0.0073'
}
```

---

## 🎯 What You Can Track

### **Complete Flow Visibility:**

1. **User clicks "Run Live"**
   - See which engines are selected
   - See prompt content
   - See uploaded files

2. **File Processing**
   - See each file being processed
   - See extracted text length
   - See compression ratios

3. **API Calls**
   - See exact parameters sent
   - See streaming start/end
   - See duration and performance

4. **Chunk-by-Chunk Streaming**
   - **See every single chunk** as it arrives
   - See chunk number, content preview, size
   - See running averages
   - See chunks per second

5. **Library Processing**
   - See when `marked.parse()` is called
   - See regex code block extraction
   - See chart rendering triggers
   - See input/output transformations

6. **State Updates**
   - See React state changes
   - See streaming content updates

7. **Performance**
   - See processing times
   - See chunk rates
   - See total duration

---

## 🔍 Example Terminal Output

When you run a query with a JSON file, your terminal will show:

```
[10:45:23] [TERMINAL] APP_START: {...}
[10:45:23] [TERMINAL] COMPONENT_MOUNT: OneMindAI_v14Mobile

[10:45:45] [TERMINAL] USER_ACTION: { action: 'Run Live Clicked', ... }
[10:45:45] [TERMINAL] FUNCTION_CALL: { functionName: 'runAll', ... }
[10:45:45] [TERMINAL] FUNCTION_CALL: { functionName: 'streamFromProvider', ... }

[10:45:45] [TERMINAL] FILE_PROCESSED: {
  fileName: 'sales_data.json',
  fileType: 'application/json',
  size: 5324,
  extractedLength: 234
}

[10:45:46] [TERMINAL] STREAM_START: { engineName: 'OpenAI GPT-4.1' }
[10:45:46] [TERMINAL] API_CALL_START: { provider: 'OpenAI', model: 'gpt-4.1' }

[10:45:46] [TERMINAL] CHUNK_RECEIVED: { chunkNumber: 1, contentPreview: 'Based' }
[10:45:46] [TERMINAL] CHUNK_RECEIVED: { chunkNumber: 2, contentPreview: ' on' }
[10:45:46] [TERMINAL] CHUNK_RECEIVED: { chunkNumber: 3, contentPreview: ' the' }
... (157 chunks total)

[10:45:48] [TERMINAL] STREAM_END: {
  totalChunks: 157,
  totalChars: 1847,
  duration: 2340,
  chunksPerSecond: '67.09'
}

[10:45:48] [TERMINAL] LIBRARY_TRIGGERED: {
  libraryName: 'Regex',
  action: 'Code Block Extraction'
}

[10:45:48] [TERMINAL] CODE_BLOCK_EXTRACTED: {
  language: 'python',
  codeLength: 234
}

[10:45:48] [TERMINAL] LIBRARY_TRIGGERED: {
  libraryName: 'marked.parse()',
  action: 'Markdown to HTML conversion'
}

[10:45:48] [TERMINAL] MARKDOWN_PARSED: {
  inputLength: 1613,
  outputLength: 3847,
  ratio: '2.38'
}
```

---

## 💡 Benefits

1. **🐛 Debugging** - See exactly where issues occur
2. **📊 Performance** - Monitor chunk rates and processing times
3. **🔍 Transparency** - Understand the complete data flow
4. **📈 Analytics** - Track usage patterns
5. **🎓 Learning** - See how libraries process data
6. **⚡ Optimization** - Identify bottlenecks

---

## 🎨 Features

- ✅ **Real-time logging** - See logs as they happen
- ✅ **Detailed chunks** - Every chunk with content preview
- ✅ **Library tracking** - Know when each library is triggered
- ✅ **Performance metrics** - Duration, rates, averages
- ✅ **File processing** - See file extraction details
- ✅ **API transparency** - See exact API parameters
- ✅ **State tracking** - Monitor React state changes

---

## 🚀 Start Using It Now!

1. **Run your dev server:**
   ```bash
   npm run dev
   ```

2. **Keep terminal visible** alongside browser

3. **Click "Run Live"** and watch the terminal!

4. **See every chunk, every library call, every transformation!**

---

## 📝 Notes

- Logs are prefixed with `[TERMINAL]` for easy identification
- All logs also appear in browser console
- Logs include timestamps for performance tracking
- Content previews are limited to 100 characters
- Chunk logging shows **actual content** being streamed

**Your terminal is now a window into the complete OneMindAI processing pipeline!** 🎉
