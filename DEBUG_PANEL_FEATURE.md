# 🐛 Debug Panel Feature

## Overview
A real-time debug panel that captures and displays client-side logs, errors, and warnings directly in the UI without needing to open browser DevTools.

---

## 🎯 Features

### **1. Toggle Button**
- Located in the header next to "Business" and "Technical" checkboxes
- Shows 🐛 Debug icon
- Displays log count when panel is open: `🐛 Debug (45)`
- Green background when active, translucent when inactive

### **2. Real-Time Log Capture**
Automatically captures:
- ✅ **[TERMINAL] logs** - All terminal-prefixed console logs
- ✅ **Errors** - console.error() calls
- ✅ **Warnings** - console.warn() calls

### **3. Log Display**
- **Color-coded by type:**
  - 🟢 Green: Regular logs
  - 🔴 Red: Errors
  - 🟡 Yellow: Warnings
- **Timestamp** for each log entry
- **Formatted output** with proper JSON formatting
- **Auto-scroll** to latest logs
- **Max height** with scrollable container

### **4. Log Management**
- **Auto-limit:** Keeps only last 100 logs (prevents memory issues)
- **Clear button:** Remove all logs
- **Close button:** Hide the panel

---

## 🚀 Usage

### **Step 1: Enable Debug Panel**
Click the **🐛 Debug** button in the header (next to Technical checkbox)

### **Step 2: Interact with the App**
- Type a prompt and click "Run Live"
- Upload files
- Any action that generates logs

### **Step 3: View Logs**
The panel will show:
```
[10:45:23 AM] LOG
[TERMINAL] FUNCTION_CALL: { functionName: 'runAll', ... }

[10:45:24 AM] LOG
[TERMINAL] STREAM_START: { engineName: 'OpenAI GPT-4.1' }

[10:45:24 AM] LOG
[TERMINAL] CHUNK_RECEIVED: { chunkNumber: 1, contentPreview: 'Based' }
```

### **Step 4: Clear Logs (Optional)**
Click **Clear Logs** button to remove all entries

### **Step 5: Close Panel**
Click **Close** button or click the 🐛 Debug button again

---

## 📊 What You'll See

### **Application Startup**
```
[10:45:00 AM] LOG
[TERMINAL] 🚀 APPLICATION_BOOTSTRAP: OneMindAI main.tsx loaded

[10:45:00 AM] LOG
[TERMINAL] ⚙️ ENVIRONMENT: { mode: 'development', dev: true, prod: false }
```

### **User Actions**
```
[10:45:23 AM] LOG
[TERMINAL] USER_ACTION: { action: 'Run Live Clicked', details: {...} }

[10:45:23 AM] LOG
[TERMINAL] FUNCTION_CALL: { functionName: 'runAll', params: {...} }
```

### **File Processing**
```
[10:45:24 AM] LOG
[TERMINAL] FILE_PROCESSED: {
  fileName: 'sales_data.json',
  fileType: 'application/json',
  size: 5324,
  extractedLength: 234
}
```

### **Streaming Chunks**
```
[10:45:25 AM] LOG
[TERMINAL] CHUNK_RECEIVED: {
  engineName: 'OpenAI GPT-4.1',
  chunkNumber: 1,
  contentLength: 5,
  contentPreview: 'Based'
}

[10:45:25 AM] LOG
[TERMINAL] CHUNK_RECEIVED: {
  engineName: 'OpenAI GPT-4.1',
  chunkNumber: 2,
  contentLength: 3,
  contentPreview: ' on'
}
```

### **Table Detection**
```
[10:45:26 AM] LOG
[TERMINAL] LIBRARY_TRIGGERED: {
  libraryName: 'Table Detection',
  action: 'Scanning for chartable tables'
}

[10:45:26 AM] LOG
[TERMINAL] ✅ Detected 2 chartable table(s)
```

### **Errors (if any)**
```
[10:45:30 AM] ERROR
Failed to fetch: Network error

[10:45:30 AM] ERROR
TypeError: Cannot read property 'length' of undefined
    at streamFromProvider (OneMindAI.tsx:456)
```

---

## 🎨 UI Design

### **Debug Button**
- **Location:** Header, right side
- **Inactive state:** Semi-transparent white background
- **Active state:** Green background with shadow
- **Shows count:** `(45)` when panel is open

### **Debug Panel**
- **Border:** Green top border (4px)
- **Background:** White with backdrop blur
- **Log container:** Dark gray/black terminal-style
- **Max height:** 384px (24rem) with scroll
- **Font:** Monospace for code readability

### **Log Entries**
- **Timestamp:** Gray text `[10:45:23 AM]`
- **Type badge:** Color-coded uppercase (LOG/ERROR/WARN)
- **Message:** Formatted with proper indentation
- **Separator:** Gray border between entries

---

## 💡 Benefits

### **1. No DevTools Required**
- See logs directly in the app
- No need to open F12 console
- Better for demos and presentations

### **2. Real-Time Monitoring**
- Logs appear instantly
- Auto-updates as events occur
- See the complete flow

### **3. Filtered Logs**
- Only shows relevant [TERMINAL] logs
- Excludes noise from other libraries
- Focuses on app-specific events

### **4. Easy Debugging**
- Timestamps for timing analysis
- Color-coded for quick scanning
- Formatted JSON for readability

### **5. Memory Efficient**
- Auto-limits to 100 logs
- Clear button for manual cleanup
- No memory leaks

---

## 🔧 Technical Details

### **Log Capture Implementation**
```typescript
// Intercept console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// Capture and store logs
console.log = (...args: any[]) => {
  originalLog(...args);
  if (args[0]?.includes?.('[TERMINAL]')) {
    addDebugLog('log', ...args);
  }
};
```

### **State Management**
```typescript
const [showDebugPanel, setShowDebugPanel] = useState(false);
const [debugLogs, setDebugLogs] = useState<Array<{
  timestamp: number,
  type: string,
  message: string
}>>([]);
```

### **Auto-Limit Logic**
```typescript
setDebugLogs(prev => {
  const newLogs = [...prev, { timestamp, type, message }];
  return newLogs.slice(-100); // Keep only last 100
});
```

---

## 🎯 Use Cases

### **1. Development**
- Debug streaming issues
- Monitor chunk processing
- Track API calls
- Verify file uploads

### **2. Demos**
- Show internal processing
- Explain how the system works
- Display real-time events
- Impress stakeholders

### **3. Troubleshooting**
- Identify errors quickly
- See exact error messages
- Track event sequence
- Analyze timing issues

### **4. Learning**
- Understand data flow
- See library triggers
- Learn system architecture
- Study event patterns

---

## 📋 Example Workflow

### **Scenario: Testing Table-to-Chart Feature**

1. **Enable Debug Panel**
   - Click 🐛 Debug button

2. **Ask for a Table**
   - Type: "Show me Q4 sales by region in a table"
   - Click "Run Live"

3. **Watch the Logs**
   ```
   [TERMINAL] FUNCTION_CALL: streamFromProvider
   [TERMINAL] STREAM_START: OpenAI GPT-4.1
   [TERMINAL] CHUNK_RECEIVED: chunk 1
   [TERMINAL] CHUNK_RECEIVED: chunk 2
   ...
   [TERMINAL] LIBRARY_TRIGGERED: Table Detection
   [TERMINAL] ✅ Detected 1 chartable table(s)
   [TERMINAL] CHART_RENDERED: table-generated
   ```

4. **Verify Success**
   - See table rendered
   - See chart generated
   - Check logs for any errors

5. **Clear Logs**
   - Click "Clear Logs" for next test

---

## ✅ Summary

**The Debug Panel provides:**

1. ✅ **Real-time log visibility** - No DevTools needed
2. ✅ **Filtered output** - Only [TERMINAL] logs, errors, warnings
3. ✅ **Color-coded display** - Easy to scan and identify issues
4. ✅ **Timestamp tracking** - Analyze timing and sequence
5. ✅ **Memory efficient** - Auto-limits to 100 logs
6. ✅ **Easy toggle** - Show/hide with one click
7. ✅ **Clean interface** - Terminal-style dark theme

**Perfect for development, debugging, demos, and learning!** 🐛🎉
