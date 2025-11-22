# 🔍 How to See Terminal Logs - Quick Guide

## ⚠️ Important: Where Logs Appear

The logs appear in **TWO PLACES**:

### 1. **Browser Console** (Primary)
- Press `F12` or `Ctrl+Shift+I` to open DevTools
- Click on the **Console** tab
- You'll see styled logs with colors and emojis

### 2. **Terminal/Command Prompt** (Secondary)
- The terminal shows Vite server logs
- Browser console.log() statements also appear here
- Look for `[TERMINAL]` prefix

---

## 🚀 Step-by-Step Instructions

### **Step 1: Start the Server**
```bash
npm run dev
```

You should see:
```
VITE v5.2.0  ready in 356 ms
➜  Local:   http://localhost:5173/
```

### **Step 2: Open the Application**
1. Click the link: `http://localhost:5173/`
2. **OR** Open your browser and go to `http://localhost:5173/`

### **Step 3: Open Browser Console**
- **Windows/Linux:** Press `F12` or `Ctrl+Shift+I`
- **Mac:** Press `Cmd+Option+I`
- Click on the **"Console"** tab

### **Step 4: See Initial Logs**
You should immediately see:
```
================================================================================
🚀 OneMindAI Application Loading...
Version: v14 Mobile-First Preview
Platform: Formula2GX Digital Advanced Incubation Labs
✅ Terminal logging enabled
📊 Monitoring: Chunks, Libraries, API Calls
================================================================================

[TERMINAL] 🚀 APPLICATION_BOOTSTRAP: OneMindAI main.tsx loaded
[TERMINAL] ⚙️ ENVIRONMENT: { mode: 'development', dev: true, prod: false }

================================================================================
🚀 OneMindAI Application Started
ℹ️ INFO  Component: OneMindAI_v14Mobile initialized
ℹ️ INFO  Version: v14 Mobile-First Preview
ℹ️ INFO  Platform: Formula2GX Digital Advanced Incubation Labs
📦 Available Engines [...]
📦 Default Selected Engines [...]
================================================================================
```

### **Step 5: Trigger More Logs**
To see chunk processing and library logs:

1. **Type a prompt** in the text box
2. **Click "Run Live"** button
3. **Watch the console!**

You'll see:
```
================================================================================
🎯 USER CLICKED "RUN LIVE"
 STEP 1  runAll() function called
📦 Selected Engines: ["OpenAI GPT-4.1", ...]
📦 Prompt: "Your prompt here..."

[TERMINAL] FUNCTION_CALL: { functionName: 'runAll', ... }
[TERMINAL] STREAM_START: { engineName: 'OpenAI GPT-4.1' }
[TERMINAL] CHUNK_RECEIVED: { chunkNumber: 1, contentPreview: 'Based' }
[TERMINAL] CHUNK_RECEIVED: { chunkNumber: 2, contentPreview: ' on' }
... (continues for every chunk)
```

---

## 🎯 What You Should See

### **Immediately on Page Load:**
✅ Application bootstrap logs
✅ Component initialization
✅ Available engines list

### **When You Click "Run Live":**
✅ Function call logs
✅ Selected engines
✅ Prompt content
✅ File processing (if files uploaded)
✅ API call start
✅ Stream start
✅ **Every single chunk** with content preview
✅ Library triggers (marked.parse, regex)
✅ Code block extraction
✅ Markdown parsing
✅ Stream end with statistics

---

## 🐛 Troubleshooting

### **Problem: No logs at all**

**Solution 1: Check Browser Console**
- Make sure you opened DevTools (`F12`)
- Make sure you're on the **Console** tab (not Elements or Network)

**Solution 2: Clear Console**
- Click the 🚫 icon in console to clear old logs
- Refresh the page (`Ctrl+R` or `F5`)

**Solution 3: Check Console Filters**
- Make sure no filters are active
- Look for a filter box at the top of console
- Clear any text in the filter

### **Problem: Only seeing Vite logs in terminal**

**This is normal!** The detailed logs appear in the **browser console**, not the terminal.

The terminal shows:
- Vite server status
- HMR (Hot Module Replacement) updates
- Build errors

The browser console shows:
- Application logs
- Chunk processing
- Library triggers
- API calls

---

## 📊 Quick Test

1. **Open browser to** `http://localhost:5173/`
2. **Press F12** to open DevTools
3. **Look at Console tab**
4. **You should see** the startup logs immediately
5. **Type any prompt** and click "Run Live"
6. **Watch chunks stream** in real-time!

---

## 💡 Pro Tips

### **Filter Logs:**
In the browser console filter box, type:
- `TERMINAL` - See only terminal logs
- `CHUNK` - See only chunk logs
- `LIBRARY` - See only library triggers
- `STEP` - See only step-by-step process

### **Copy Logs:**
- Right-click on any log → "Copy object"
- Or select multiple logs and copy

### **Preserve Logs:**
- Check "Preserve log" in console settings
- Logs won't clear on page refresh

---

## 🎨 Expected Output Example

```
[Browser Console - Press F12 to see this]

================================================================================
🚀 OneMindAI Application Loading...
================================================================================

[TERMINAL] 🚀 APPLICATION_BOOTSTRAP: OneMindAI main.tsx loaded

================================================================================
🚀 OneMindAI Application Started
================================================================================

[User clicks "Run Live"]

================================================================================
🎯 USER CLICKED "RUN LIVE"
 STEP 1  runAll() function called
================================================================================

[TERMINAL] FUNCTION_CALL: { functionName: 'streamFromProvider', ... }
[TERMINAL] STREAM_START: { engineName: 'OpenAI GPT-4.1' }
[TERMINAL] CHUNK_RECEIVED: { chunkNumber: 1, contentPreview: 'Based', ... }
[TERMINAL] CHUNK_RECEIVED: { chunkNumber: 2, contentPreview: ' on', ... }
[TERMINAL] CHUNK_RECEIVED: { chunkNumber: 3, contentPreview: ' the', ... }
... (157 chunks total)
[TERMINAL] STREAM_END: { totalChunks: 157, totalChars: 1847, ... }
[TERMINAL] LIBRARY_TRIGGERED: { libraryName: 'marked.parse()', ... }
[TERMINAL] MARKDOWN_PARSED: { inputLength: 1613, outputLength: 3847, ... }

================================================================================
✅ ALL ENGINES COMPLETED
================================================================================
```

---

## ✅ Summary

1. **Server terminal** = Vite server logs only
2. **Browser console** = All application logs (chunks, libraries, etc.)
3. **Press F12** to see the logs
4. **Click "Run Live"** to trigger detailed logging
5. **Look for `[TERMINAL]` prefix** for terminal-style logs

**The logs are working! They're in the browser console, not the terminal window.** 🎉
