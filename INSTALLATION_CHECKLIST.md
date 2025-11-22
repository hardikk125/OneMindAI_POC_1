# ✅ OneMindAI Installation Checklist

## 📋 Pre-Installation Requirements

### **1. Check Node.js Installation**
```bash
node --version
```
- [ ] Shows v18.0.0 or higher
- [ ] If not installed: Download from https://nodejs.org/

### **2. Check npm Installation**
```bash
npm --version
```
- [ ] Shows v9.0.0 or higher
- [ ] Comes automatically with Node.js

### **3. System Check**
- [ ] Windows 10/11, macOS 10.15+, or Linux
- [ ] At least 4GB RAM (8GB recommended)
- [ ] 500MB free disk space
- [ ] Internet connection active

---

## 🚀 Installation Steps

### **Step 1: Extract Project**
- [ ] Extract ZIP file to desired location
- [ ] Note the folder path
- [ ] Open terminal/command prompt

### **Step 2: Navigate to Project**
```bash
cd path/to/Test_version
```
- [ ] Terminal is in the correct folder
- [ ] Can see `package.json` file

### **Step 3: Install Dependencies**
```bash
npm install
```
- [ ] Command runs without errors
- [ ] `node_modules` folder created
- [ ] Takes 2-5 minutes to complete
- [ ] See "added XXX packages" message

### **Step 4: Verify Installation**
```bash
npm list --depth=0
```
- [ ] Shows list of installed packages
- [ ] No error messages
- [ ] All dependencies installed

---

## 🔑 API Keys Setup (Optional for Testing)

### **Step 5: Configure API Keys**
Open `src/OneMindAI.tsx` and update line 54:

- [ ] Claude API key (https://console.anthropic.com/)
- [ ] OpenAI API key (https://platform.openai.com/api-keys)
- [ ] Gemini API key (https://makersuite.google.com/app/apikey)
- [ ] DeepSeek API key (https://platform.deepseek.com/)
- [ ] Mistral API key (https://console.mistral.ai/)
- [ ] Other providers (optional)

**Note**: App works in Mock mode without API keys for testing!

---

## 🎯 Start the Application

### **Step 6: Run Development Server**
```bash
npm run dev
```
- [ ] Server starts successfully
- [ ] Shows: "Local: http://localhost:5173/"
- [ ] No error messages

### **Step 7: Open in Browser**
- [ ] Open browser (Chrome, Firefox, Safari, or Edge)
- [ ] Navigate to: http://localhost:5173/
- [ ] Page loads successfully

---

## ✨ Verify Features

### **Step 8: Check UI Elements**
- [ ] Greeting message: "Hey, Mac — ready to dive in? Ask me anything!"
- [ ] Prompt text area visible
- [ ] Generate button on right side under prompt
- [ ] Live/Mock toggle buttons visible
- [ ] Engine cards showing (Claude, DeepSeek, Gemini, etc.)

### **Step 9: Check Pricing Display**
- [ ] All engine cards show pricing
- [ ] Min spend: At least $0.01 (not $0.00)
- [ ] Max spend: At least $0.01 (not $0.00)
- [ ] Price in/out values visible

### **Step 10: Test Basic Functionality**
- [ ] Can type in prompt box
- [ ] Can select/deselect engines
- [ ] Generate button enables when prompt entered
- [ ] Live/Mock toggle works
- [ ] Copy All Responses button visible

---

## 🧪 Test Run (Optional)

### **Step 11: Mock Mode Test**
- [ ] Set to "Mock" mode
- [ ] Enter a test prompt: "Hello, how are you?"
- [ ] Click Generate
- [ ] See mock responses appear
- [ ] Cost tracking updates

### **Step 12: Live Mode Test (Requires API Keys)**
- [ ] Set to "Live" mode
- [ ] Enter a test prompt
- [ ] Click Generate
- [ ] See real streaming responses
- [ ] Verify API calls work

---

## 🏗️ Production Build (Optional)

### **Step 13: Build for Production**
```bash
npm run build
```
- [ ] Build completes successfully
- [ ] `dist/` folder created
- [ ] No build errors

### **Step 14: Preview Production Build**
```bash
npm run preview
```
- [ ] Preview server starts
- [ ] App works in production mode

---

## 🔧 Troubleshooting

### **If npm install fails:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **If port 5173 is busy:**
```bash
npm run dev -- --port 3000
```
Then open: http://localhost:3000/

### **If TypeScript errors:**
```bash
npm install -D typescript@~5.6.2
```

### **If styling broken:**
```bash
npm run build
npm run dev
```

---

## 📊 Installation Summary

### **What Gets Installed:**
- React 18.3.1
- TypeScript 5.6.2
- Vite 5.4.11
- TailwindCSS 3.4.15
- Anthropic SDK 0.32.1
- OpenAI SDK 4.73.0
- Google Generative AI 0.21.0
- And 200+ other packages (dependencies)

### **Total Size:**
- Project files: ~5 MB
- node_modules: ~200-300 MB
- Total: ~300 MB

### **Installation Time:**
- npm install: 2-5 minutes
- First build: 30-60 seconds
- Total: ~5-10 minutes

---

## ✅ Final Checklist

### **Everything Working?**
- [ ] Node.js v18+ installed
- [ ] npm install completed
- [ ] npm run dev works
- [ ] App opens in browser
- [ ] UI looks correct
- [ ] All features visible
- [ ] Can enter prompts
- [ ] Mock mode works
- [ ] (Optional) Live mode works with API keys

---

## 🎉 Success!

If all checkboxes are checked, you're ready to use OneMindAI!

### **Next Steps:**
1. Add your API keys for live mode
2. Test with real prompts
3. Explore all features
4. Build for production if needed

### **Need Help?**
- See `SETUP_GUIDE.md` for detailed documentation
- See `README_FOR_BOSS.md` for quick overview
- Check browser console for errors
- Verify all prerequisites are met

---

**Installation Complete!** 🚀

**Time to complete**: ~10 minutes  
**Difficulty**: Easy  
**Support**: Full documentation included
