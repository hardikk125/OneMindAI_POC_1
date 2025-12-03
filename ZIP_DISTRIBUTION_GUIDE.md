# 📦 ZIP Distribution Guide - For Your Boss

## Quick Summary

Your boss can run the app on their PC in **3 simple steps**:

1. **Extract ZIP file**
2. **Run setup command** (`npm install`)
3. **Start the app** (`npm run dev`)

---

## 🚀 Step-by-Step Instructions

### **Step 1: Extract the ZIP File**

1. Right-click the ZIP file
2. Select "Extract All..." (Windows) or "Extract" (Mac)
3. Choose a location (e.g., Desktop or Documents)
4. Wait for extraction to complete

**Result**: A folder named `OneMindAI` or `Test_version` will be created

---

### **Step 2: Install Dependencies (One-time setup)**

#### **On Windows:**

1. Open **Command Prompt** or **PowerShell**
   - Press `Win + R`
   - Type `cmd` or `powershell`
   - Press Enter

2. Navigate to the project folder:
   ```powershell
   cd C:\Users\YourName\Desktop\OneMindAI
   ```
   *(Replace path with where you extracted the ZIP)*

3. Run installation:
   ```powershell
   npm install
   ```

4. Wait for completion (2-5 minutes)

#### **On Mac:**

1. Open **Terminal**
   - Press `Cmd + Space`
   - Type `terminal`
   - Press Enter

2. Navigate to the project folder:
   ```bash
   cd ~/Desktop/OneMindAI
   ```

3. Run installation:
   ```bash
   npm install
   ```

4. Wait for completion (2-5 minutes)

#### **On Linux:**

```bash
cd ~/OneMindAI
npm install
```

---

### **Step 3: Start the Application**

In the same terminal/command prompt, run:

```bash
npm run dev
```

**Expected output:**
```
VITE v5.4.11  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

---

### **Step 4: Open in Browser**

1. Open your web browser (Chrome, Firefox, Safari, Edge)
2. Go to: `http://localhost:5173/`
3. You should see the OneMindAI interface

---

## ⚙️ Configuration (Optional)

### **Add API Keys** (To use real AI models)

1. Open the extracted folder
2. Navigate to: `src/OneMindAI.tsx`
3. Find the `DEFAULT_API_KEYS` section (around line 54)
4. Replace placeholder keys with actual API keys:

```typescript
const DEFAULT_API_KEYS: Record<string, string> = {
  "claude": "sk-ant-YOUR_ACTUAL_KEY_HERE",
  "chatgpt": "sk-YOUR_ACTUAL_KEY_HERE",
  "gemini": "YOUR_ACTUAL_KEY_HERE",
  // ... other keys
};
```

**Where to get API keys:**
- **Claude**: https://console.anthropic.com/
- **ChatGPT**: https://platform.openai.com/api-keys
- **Gemini**: https://makersuite.google.com/app/apikey
- **DeepSeek**: https://platform.deepseek.com/
- **Others**: See SETUP_GUIDE.md

---

## 🛑 Stopping the Application

To stop the app:

1. Go to the terminal/command prompt
2. Press `Ctrl + C`
3. Type `Y` and press Enter if prompted

---

## 🔄 Running Again (After stopping)

Just run this command again:

```bash
npm run dev
```

No need to run `npm install` again!

---

## ⚠️ Prerequisites (Must Install First)

### **Check if Node.js is installed:**

Open terminal/command prompt and run:

```bash
node --version
```

**If you see a version number (v18.0.0 or higher), you're good!**

**If you get "command not found":**

1. Download Node.js: https://nodejs.org/
2. Choose **LTS version** (Long Term Support)
3. Run the installer
4. Restart your terminal/command prompt
5. Verify with `node --version`

---

## 🐛 Troubleshooting

### **Problem: "npm: command not found"**
- **Solution**: Node.js not installed. Download from https://nodejs.org/

### **Problem: "Port 5173 already in use"**
- **Solution**: Another app is using that port. Either:
  - Close the other app
  - Or use a different port: `npm run dev -- --port 3000`

### **Problem: "npm install" fails**
- **Solution**:
  ```bash
  npm cache clean --force
  npm install
  ```

### **Problem: Page shows blank or errors**
- **Solution**:
  1. Check browser console (F12 → Console tab)
  2. Refresh page (Ctrl+R or Cmd+R)
  3. Clear browser cache (Ctrl+Shift+Delete)

### **Problem: Can't find the terminal/command prompt**
- **Windows**: Press `Win + R`, type `cmd`, press Enter
- **Mac**: Press `Cmd + Space`, type `terminal`, press Enter
- **Linux**: Ctrl+Alt+T

---

## 📋 Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start app | `npm run dev` |
| Stop app | `Ctrl + C` |
| Build for production | `npm run build` |
| Check Node version | `node --version` |
| Check npm version | `npm --version` |

---

## 🎯 What Your Boss Will See

1. **OneMindAI Interface** - Clean, modern UI
2. **AI Model Cards** - Claude, ChatGPT, Gemini, DeepSeek, etc.
3. **Prompt Input Box** - Type questions here
4. **Generate Button** - Click to get responses
5. **Live/Mock Toggle** - Switch between real and mock mode
6. **Pricing Display** - Shows cost per model
7. **Response Area** - Shows AI responses in real-time

---

## 🔐 Important Notes

1. **API Keys**: If not configured, the app will work in "Mock" mode (simulated responses)
2. **Internet**: Required for real API calls
3. **Browser**: Use latest Chrome, Firefox, Safari, or Edge
4. **Port 5173**: Make sure this port is not blocked by firewall

---

## 📞 Support Checklist

If something doesn't work:

- [ ] Node.js v18+ is installed (`node --version`)
- [ ] npm v9+ is installed (`npm --version`)
- [ ] ZIP file extracted completely
- [ ] Terminal/command prompt opened in correct folder
- [ ] `npm install` completed without errors
- [ ] `npm run dev` shows "ready in XXX ms"
- [ ] Browser opened to `http://localhost:5173/`
- [ ] Browser not blocking the page
- [ ] Firewall not blocking port 5173

---

## 🎉 Success!

Once everything is set up:

1. The app will automatically open in the browser
2. You'll see the greeting: "Hey, Mac — ready to dive in? Ask me anything!"
3. All features are ready to use
4. Type a prompt and click Generate
5. Watch responses stream in real-time

---

## 📁 What's in the ZIP?

```
OneMindAI/
├── src/                    # Source code
├── public/                 # Static files
├── package.json            # Dependencies list
├── vite.config.ts          # Build configuration
├── tsconfig.json           # TypeScript config
├── index.html              # Main HTML file
├── SETUP_GUIDE.md          # Detailed setup guide
├── ZIP_DISTRIBUTION_GUIDE.md  # This file
└── ... other files
```

---

## 🚀 TL;DR (Too Long; Didn't Read)

```bash
# 1. Extract ZIP
# 2. Open terminal in extracted folder
# 3. Run these commands:

npm install
npm run dev

# 4. Open browser to: http://localhost:5173/
# Done! 🎉
```

---

**Last Updated**: December 2024
**Version**: 1.0.0
