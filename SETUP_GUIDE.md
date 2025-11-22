# 🚀 OneMindAI - Complete Setup Guide

## 📋 Prerequisites

### **Required Software**

1. **Node.js** (v18.0.0 or higher)
   - Download: https://nodejs.org/
   - Verify installation: `node --version`
   - Should show: v18.x.x or higher

2. **npm** (v9.0.0 or higher) - Comes with Node.js
   - Verify installation: `npm --version`
   - Should show: 9.x.x or higher

3. **Git** (Optional, for version control)
   - Download: https://git-scm.com/
   - Verify installation: `git --version`

### **System Requirements**
- **OS**: Windows 10/11, macOS 10.15+, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: 500MB free space
- **Browser**: Chrome, Firefox, Safari, or Edge (latest version)

---

## 📦 Installation Steps

### **Step 1: Extract the Project**
1. Extract the ZIP file to your desired location
2. Open terminal/command prompt
3. Navigate to the project folder:
   ```bash
   cd path/to/Test_version
   ```

### **Step 2: Install Dependencies**
Run the following command to install all required packages:

```bash
npm install
```

This will install all dependencies listed in `package.json`:
- **React** (v18.3.1) - UI framework
- **TypeScript** (v5.6.2) - Type safety
- **Vite** (v5.4.11) - Build tool
- **TailwindCSS** (v3.4.15) - Styling
- **Anthropic SDK** (v0.32.1) - Claude API
- **OpenAI SDK** (v4.73.0) - ChatGPT API
- **Google Generative AI** (v0.21.0) - Gemini API
- And more...

**Installation time**: 2-5 minutes depending on internet speed

### **Step 3: Configure API Keys**
1. Open `src/OneMindAI.tsx`
2. Find the `DEFAULT_API_KEYS` section (around line 54)
3. Replace placeholder API keys with your actual keys:

```typescript
const DEFAULT_API_KEYS: Record<string, string> = {
  "claude": "YOUR_CLAUDE_API_KEY",
  "kimi": "YOUR_KIMI_API_KEY",
  "deepseek": "YOUR_DEEPSEEK_API_KEY",
  "perplexity": "YOUR_PERPLEXITY_API_KEY",
  "gemini": "YOUR_GEMINI_API_KEY",
  "mistral": "YOUR_MISTRAL_API_KEY",
  "groq": "YOUR_GROQ_API_KEY",
  "sarvam": "YOUR_SARVAM_API_KEY",
  "chatgpt": "YOUR_OPENAI_API_KEY"
};
```

**Where to get API keys:**
- **Claude**: https://console.anthropic.com/
- **ChatGPT**: https://platform.openai.com/api-keys
- **Gemini**: https://makersuite.google.com/app/apikey
- **DeepSeek**: https://platform.deepseek.com/
- **Mistral**: https://console.mistral.ai/
- **Perplexity**: https://www.perplexity.ai/settings/api
- **KIMI**: https://platform.moonshot.cn/
- **Groq**: https://console.groq.com/

### **Step 4: Start Development Server**
Run the development server:

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

### **Step 5: Open in Browser**
1. Open your browser
2. Go to: http://localhost:5173/
3. You should see the OneMindAI interface

---

## 🏗️ Build for Production

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

To preview the production build:

```bash
npm run preview
```

---

## 📚 All Dependencies

### **Core Dependencies**
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@anthropic-ai/sdk": "^0.32.1",
  "openai": "^4.73.0",
  "@google/generative-ai": "^0.21.0"
}
```

### **Development Dependencies**
```json
{
  "@vitejs/plugin-react": "^4.3.3",
  "typescript": "~5.6.2",
  "vite": "^5.4.11",
  "tailwindcss": "^3.4.15",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.49",
  "@types/react": "^18.3.12",
  "@types/react-dom": "^18.3.1",
  "eslint": "^9.13.0"
}
```

---

## 🔧 Troubleshooting

### **Issue: `npm install` fails**
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### **Issue: Port 5173 already in use**
**Solution:**
```bash
# Kill the process on port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5173 | xargs kill -9

# Or use a different port:
npm run dev -- --port 3000
```

### **Issue: TypeScript errors**
**Solution:**
```bash
# Check TypeScript version
npx tsc --version

# Reinstall TypeScript
npm install -D typescript@~5.6.2
```

### **Issue: API calls failing**
**Solution:**
1. Check API keys are correct
2. Verify API key has credits/quota
3. Check internet connection
4. Enable "Live" mode (not "Mock" mode)
5. Check browser console for detailed errors

### **Issue: Styling not working**
**Solution:**
```bash
# Rebuild Tailwind
npm run build

# Or restart dev server
npm run dev
```

---

## 🌐 Browser Compatibility

**Supported Browsers:**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Not Supported:**
- ❌ Internet Explorer
- ❌ Opera Mini

---

## 📁 Project Structure

```
Test_version/
├── src/
│   ├── OneMindAI.tsx          # Main application component
│   ├── main.tsx               # Entry point
│   ├── App.tsx                # Root component
│   ├── index.css              # Global styles
│   └── lib/
│       └── file-utils.ts      # File handling utilities
├── public/                    # Static assets
├── node_modules/              # Dependencies (created after npm install)
├── dist/                      # Production build (created after npm run build)
├── package.json               # Project dependencies
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # TailwindCSS configuration
├── postcss.config.js          # PostCSS configuration
├── index.html                 # HTML template
└── SETUP_GUIDE.md            # This file
```

---

## 🎯 Features

### **Implemented Features:**
- ✅ Multi-engine AI comparison (Claude, ChatGPT, Gemini, DeepSeek, etc.)
- ✅ Live/Mock mode toggle
- ✅ Real-time streaming responses
- ✅ Cost tracking and budget management
- ✅ Token estimation and pricing
- ✅ Image upload support (paste or drag-drop)
- ✅ Copy all responses functionality
- ✅ Responsive mobile design
- ✅ Custom engine support
- ✅ API key management
- ✅ Greeting message: "Hey, Mac — ready to dive in? Ask me anything!"

### **Pricing Models:**
All models show real pricing (minimum $0.01):
- **Claude Haiku**: $0.25 input / $1.25 output per 1M tokens
- **ChatGPT**: $10.00 input / $30.00 output per 1M tokens
- **Gemini Flash**: $0.075 input / $0.30 output per 1M tokens
- **DeepSeek**: $0.14 input / $0.28 output per 1M tokens
- **Mistral**: $8.00 input / $24.00 output per 1M tokens
- **Perplexity**: $10.00 input / $20.00 output per 1M tokens
- **KIMI**: $8.00 input / $16.00 output per 1M tokens

---

## 🔐 Security Notes

### **Important:**
1. **Never commit API keys** to version control
2. **Use environment variables** in production
3. **Implement backend proxy** for production deployments
4. **Enable CORS properly** on your backend
5. **Rotate API keys** regularly

### **Production Deployment:**
For production, move API keys to a backend server:
1. Create a backend API endpoint
2. Store keys in environment variables
3. Proxy all AI API calls through your backend
4. Never expose keys in frontend code

---

## 📞 Support

### **Common Commands:**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Check TypeScript
npx tsc --noEmit
```

### **Need Help?**
1. Check the troubleshooting section above
2. Review browser console for errors
3. Check API provider status pages
4. Verify all prerequisites are installed

---

## ✅ Quick Start Checklist

- [ ] Node.js v18+ installed
- [ ] npm v9+ installed
- [ ] Project extracted
- [ ] Navigated to project folder in terminal
- [ ] Ran `npm install`
- [ ] Updated API keys in `src/OneMindAI.tsx`
- [ ] Ran `npm run dev`
- [ ] Opened http://localhost:5173/ in browser
- [ ] Tested with a prompt
- [ ] Verified all features work

---

## 🎉 You're Ready!

Once all steps are complete, you should see:
- OneMindAI interface loaded
- Greeting message: "Hey, Mac — ready to dive in? Ask me anything!"
- All engine cards showing pricing (minimum $0.01)
- Generate button on the right under prompt box
- Live/Mock toggle buttons
- Copy All Responses button

**Enjoy using OneMindAI!** 🚀

---

## 📝 Version Info

- **Project**: OneMindAI
- **Version**: 1.0.0
- **Build Tool**: Vite 5.4.11
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.6.2
- **Styling**: TailwindCSS 3.4.15
- **Node**: v18.0.0+ required

---

**Last Updated**: November 11, 2025
