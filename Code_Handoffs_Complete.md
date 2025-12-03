# 🔄 OneMindAI - Complete Code Handoffs & Function Call Flow

## 📋 File Interaction Map

```
OneMindAI.tsx (Main Component)
    ↓
    ├── file-utils.ts (File Processing)
    ├── streaming-client.ts (AI Streaming - NOT USED)
    ├── EnhancedMarkdownRenderer.tsx (Display)
    │   ├── chart-utils.ts (Chart Conversion)
    │   ├── ChartRenderer.tsx (Chart Display)
    │   └── MermaidChart.tsx (Diagrams)
    └── Provider SDKs (@anthropic-ai/sdk, openai, @google/generative-ai)
```

---

## 🎯 Complete Function Call Flow

### **STEP 1: User Clicks "Run Live"**

**File:** `OneMindAI.tsx`  
**Function:** `runAll()` - Line 819  
**Triggered by:** Button click event

```typescript
async function runAll() {
    if (selectedEngines.length === 0 || !prompt.trim()) return;
    setIsRunning(true);
    setResults([]);
    setStreamingStates({});
    
    // Initialize streaming states
    selectedEngines.forEach(e => {
        updateStreamingContent(e.id, '', true);
    });
}
```

**WHY:** Entry point for all AI processing. Validates input and initializes state.

**DATA PASSED:**
- `selectedEngines` - Array of selected AI models
- `prompt` - User's input text
- `uploadedFiles` - Attached files (from state)

---

### **STEP 2: Process Each Engine in Parallel**

**File:** `OneMindAI.tsx`  
**Function:** `selectedEngines.map(async (e) => {...})` - Line 830

```typescript
const runs = selectedEngines.map(async (e) => {
    const { nowIn, outCap, minSpend, maxSpend } = computePreview(e, prompt);
    const startTime = Date.now();
    let fullContent = '';
    
    for await (const chunk of streamFromProvider(e, prompt, outCap)) {
        fullContent += chunk;
        updateStreamingContent(e.id, fullContent, true);
    }
});
```

**WHY:** Parallel execution allows simultaneous API calls to multiple providers (ChatGPT, Claude, Gemini).

---

### **STEP 3: Compute Token Preview & Cost**

**File:** `OneMindAI.tsx`  
**Function:** `computePreview(e, prompt)` - Line 831

```typescript
function computePreview(e: Engine, prompt: string) {
    const nowIn = estimateTokens(prompt, e.tokenizer);
    const outCap = getOutCap(e);
    const pricing = getPrice(e);
    const minSpend = (nowIn / 1_000_000) * pricing.in;
    const maxSpend = minSpend + (outCap / 1_000_000) * pricing.out;
    return { nowIn, outCap, minSpend, maxSpend };
}
```

**WHY:** Calculate cost BEFORE API call for budget management.

**RETURNS:**
- `nowIn` - Input tokens
- `outCap` - Max output tokens
- `minSpend` - Minimum cost
- `maxSpend` - Maximum cost

---

### **🔄 HANDOFF #1: Main to Streaming**

**FROM:** `runAll()` in OneMindAI.tsx Line 840  
**TO:** `streamFromProvider()` in OneMindAI.tsx Line 299  
**DATA:** `(e: Engine, prompt: string, outCap: number)`

---

### **STEP 4: Stream from AI Provider**

**File:** `OneMindAI.tsx`  
**Function:** `streamFromProvider(e, prompt, outCap)` - Line 299

```typescript
async function* streamFromProvider(e: Engine, prompt: string, outCap: number) {
    let enhancedPrompt = prompt;
    
    // Add text files content to prompt
    const textFiles = uploadedFiles.filter(f => 
        f.name.endsWith('.txt') || f.type === 'text/plain'
    );
    
    if (textFiles.length > 0) {
        enhancedPrompt += '\n\n--- Uploaded Text Files ---\n';
        textFiles.forEach(file => {
            enhancedPrompt += `\n📝 ${file.name}:\n${file.extractedText}\n`;
        });
    }
    
    // Similar for Word docs, JSON files, PDFs, etc.
}
```

**WHY:** AsyncGenerator that yields chunks in real-time. Enhances prompt with file content.

**PARAMETERS:**
- `e: Engine` - Engine config (model, API key, provider)
- `prompt: string` - User's input
- `outCap: number` - Max output tokens

---

### **🔄 HANDOFF #2: File Processing**

**FROM:** User drag-and-drop → FileUploadZone component  
**TO:** `processFiles()` in file-utils.ts Line 26  
**TRIGGERED:** When files are dropped or selected

---

### **STEP 5: Process Uploaded Files**

**File:** `file-utils.ts`  
**Function:** `processFiles(fileList)` - Line 26

```typescript
export async function processFiles(fileList: File[]): Promise<UploadedFile[]> {
    return Promise.all(
        fileList.map(async (file) => {
            let content = '';
            let extractedText = '';
            
            // Handle text files (.txt)
            if (file.name.endsWith('.txt') || file.type === 'text/plain') {
                const text = await file.text();
                extractedText = text;
                content = await fileToBase64(file);
            }
            
            // Handle Word documents
            else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                const result = await mammoth.extractRawText({ 
                    arrayBuffer: await file.arrayBuffer() 
                });
                extractedText = result.value;
                content = await fileToBase64(file);
            }
            
            // Handle JSON files
            else if (file.name.endsWith('.json')) {
                const text = await file.text();
                const jsonData = JSON.parse(text);
                extractedText = `JSON Content:\n\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\``;
                content = await fileToBase64(file);
            }
            
            return { name, size, type, content, extractedText };
        })
    );
}
```

**WHY:** Extract text from files so AI can analyze content.

**RETURNS:** Array of `UploadedFile` objects:
- `name` - File name
- `size` - File size
- `type` - MIME type
- `content` - Base64 encoded
- `extractedText` - Plain text extracted

---

### **STEP 6: Make Provider-Specific API Call**

**File:** `OneMindAI.tsx`  
**Provider Branch:** OpenAI Example - Line 441-500

```typescript
if (e.provider === 'openai') {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({
        apiKey: e.apiKey,
        dangerouslyAllowBrowser: true,
    });

    const stream = await client.chat.completions.create({
        model: e.selectedVersion,
        messages: [{ role: 'user', content: enhancedPrompt }],
        max_tokens: Math.max(outCap, 4000),
        temperature: 0.7,
        stream: true,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
            yield content;  // ← Send chunk back to runAll()
        }
    }
}
```

**WHY:** Each provider has different API format. This handles OpenAI streaming.

**YIELDS:** Text chunks: `"Hello"`, `" world"`, `"!"`

**OTHER PROVIDERS:**
- **Claude:** Line 370-439 (Anthropic SDK)
- **Gemini:** Line 502-556 (Google SDK)
- **Mistral:** Line 557-624 (Fetch API + Vite Proxy)
- **Perplexity:** Line 625-681 (Fetch API + Vite Proxy)

---

### **STEP 7: Update Streaming State**

**File:** `OneMindAI.tsx`  
**Function:** `updateStreamingContent(engineId, content, isStreaming)` - Line 277

```typescript
function updateStreamingContent(engineId: string, content: string, isStreaming: boolean) {
    setStreamingStates(prev => ({
        ...prev,
        [engineId]: { content, isStreaming }
    }));
}
```

**WHY:** Update React state to trigger re-render and show chunks in real-time.

**STATE UPDATE:**
```typescript
streamingStates = {
    "openai": {
        content: "Hello world! How can I help...",
        isStreaming: true
    },
    "claude": {
        content: "I'd be happy to assist...",
        isStreaming: true
    }
}
```

---

### **STEP 8: React Re-renders UI**

**File:** `OneMindAI.tsx`  
**Render Logic:** Line 2660-2675

```typescript
{selectedEngines.map((e, index) => {
    const r = results.find(rr => rr.engineId === e.id);
    const streamingState = streamingStates[e.id];
    const content = streamingState?.content || r?.responsePreview || "(No response)";
    
    return (
        <div key={e.id}>
            <h4>{e.name}</h4>
            <EnhancedMarkdownRenderer content={content} />
        </div>
    );
})}
```

**WHY:** React automatically re-renders when `streamingStates` changes.

---

### **🔄 HANDOFF #3: Rendering**

**FROM:** OneMindAI.tsx Line 2675  
**TO:** `EnhancedMarkdownRenderer` component  
**DATA:** `content` (raw markdown string)

---

### **STEP 9: Render Markdown Content**

**File:** `EnhancedMarkdownRenderer.tsx`  
**Component:** `EnhancedMarkdownRenderer({ content })` - Line 19

```typescript
export default function EnhancedMarkdownRenderer({ content, isStreaming = false }) {
    const [processedContent, setProcessedContent] = useState('');
    const [codeBlocks, setCodeBlocks] = useState([]);
    
    useEffect(() => {
        if (!content) return;
        
        // Extract code blocks
        const codeBlockRegex = /```([^\n]*)\n([\s\S]*?)```/g;
        let match;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            const language = match[1].trim();
            const code = match[2].trim();
            extractedCodeBlocks.push({ code, language, id });
        }
        
        // Process with marked
        const html = marked.parse(content);
        setProcessedContent(html);
    }, [content]);
}
```

**WHY:** Convert markdown to HTML and extract code blocks for special rendering.

---

### **STEP 10: marked.parse() - Markdown to HTML**

**File:** `EnhancedMarkdownRenderer.tsx`  
**Library:** `marked.parse()` - Line 126

```typescript
const html = marked.parse(processedText);
```

**TRANSFORMATION:**

**INPUT (Markdown):**
```markdown
| Feature | React | Vue |
|---------|-------|-----|
| Syntax  | JSX   | Template |

**Bold text**
```

**OUTPUT (HTML):**
```html
<table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>React</th>
      <th>Vue</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Syntax</td>
      <td>JSX</td>
      <td>Template</td>
    </tr>
  </tbody>
</table>

<strong>Bold text</strong>
```

**WHY:** Browser can only render HTML, not markdown.

---

### **STEP 11: Render Code Blocks**

**File:** `EnhancedMarkdownRenderer.tsx`  
**Component:** `ChartCodeRenderer` - Line 275

```typescript
{codeBlocks.map((block) => (
    <ChartCodeRenderer code={block.code} language={block.language} />
))}
```

---

### **🔄 HANDOFF #4: Chart Rendering**

**FROM:** EnhancedMarkdownRenderer.tsx Line 275  
**TO:** `ChartCodeRenderer` component  
**DATA:** `{ code, language }`

---

### **STEP 12: Convert Python to Plotly**

**File:** `ChartRenderer.tsx`  
**Component:** `ChartRenderer({ code, language })` - Line 7

```typescript
export const ChartRenderer: React.FC<ChartRendererProps> = ({ code, language }) => {
    useEffect(() => {
        if (language !== 'python') return;
        
        if (code.includes('matplotlib') || code.includes('plt.')) {
            const plotlyData = convertMatplotlibToPlotly(code);
            if (plotlyData) {
                setChartData(plotlyData);
            }
        }
    }, [code, language]);
    
    return chartData ? <Plot data={chartData.data} layout={chartData.layout} /> : null;
}
```

**WHY:** Convert Python matplotlib code to interactive Plotly.js charts.

---

### **STEP 13: Display Final Content**

**File:** `EnhancedMarkdownRenderer.tsx`  
**DOM Injection:** Line 233-237

```typescript
<div 
    dangerouslySetInnerHTML={{ __html: processedContent }}
    className="markdown-content"
/>
```

**WHY:** Inject HTML into DOM for browser to render.

---

## 📊 Complete Handoff Summary

| # | From | To | Data | Why |
|---|------|-----|------|-----|
| 1 | User Click | `runAll()` | Button event | Start processing |
| 2 | `runAll()` | `streamFromProvider()` | Engine, prompt, outCap | Get AI response |
| 3 | User Drop | `processFiles()` | File list | Extract file content |
| 4 | `streamFromProvider()` | Provider SDK | Enhanced prompt | Make API call |
| 5 | Provider SDK | `streamFromProvider()` | Text chunks | Yield chunks |
| 6 | `streamFromProvider()` | `updateStreamingContent()` | Chunks | Update state |
| 7 | State Update | React Render | New state | Re-render UI |
| 8 | React Render | `EnhancedMarkdownRenderer` | Raw markdown | Display content |
| 9 | `EnhancedMarkdownRenderer` | `marked.parse()` | Markdown | Convert to HTML |
| 10 | `EnhancedMarkdownRenderer` | `ChartRenderer` | Python code | Render charts |
| 11 | `ChartRenderer` | `react-plotly.js` | Plotly data | Display chart |
| 12 | `marked.parse()` | DOM | HTML string | Final display |

---

## 🎯 Key Insights

### **Why AsyncGenerator?**
```typescript
async function* streamFromProvider() {
    yield chunk1;
    yield chunk2;
    yield chunk3;
}
```
- Allows real-time streaming
- Chunks arrive immediately, not after completion
- Better UX with progressive display

### **Why Separate Files?**
- **file-utils.ts** - Reusable file processing logic
- **chart-utils.ts** - Chart conversion utilities
- **EnhancedMarkdownRenderer.tsx** - Isolated rendering logic
- **Modularity** - Easy to test and maintain

### **Why No streaming-client.ts?**
- Originally intended for centralized streaming
- Currently **NOT USED** - streaming logic is in OneMindAI.tsx
- Each provider handled directly in `streamFromProvider()`

### **Why marked.parse() in Renderer?**
- Keep raw markdown in state (easier to copy/export)
- Only convert to HTML when displaying
- Allows re-processing if needed

---

## 🔧 Function Call Chain

```
User Action
  → runAll()
    → computePreview()
      → estimateTokens()
      → getPrice()
    → streamFromProvider()
      → [File Processing: processFiles()]
      → Provider SDK call (OpenAI/Claude/Gemini)
      → yield chunks
    → updateStreamingContent()
      → setStreamingStates()
        → React Re-render
          → EnhancedMarkdownRenderer
            → marked.parse()
            → ChartCodeRenderer
              → convertMatplotlibToPlotly()
              → Plot component
            → dangerouslySetInnerHTML
              → Browser DOM
                → User sees formatted content
```

---

**This is the complete journey from button click to screen display!** 🚀
