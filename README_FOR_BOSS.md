# 📦 OneMindAI Project - Quick Start

## 🎯 What is this?

**OneMindAI** is a multi-engine AI comparison tool that allows you to:
- Query multiple AI models simultaneously (Claude, ChatGPT, Gemini, DeepSeek, etc.)
- Compare responses side-by-side
- Track costs and budget in real-time
- Support for text and image inputs
- Live streaming responses

---

## ⚡ Quick Start (3 Steps)

### **Step 1: Install Node.js**
Download and install Node.js v18 or higher from:
👉 https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### **Step 2: Install Dependencies**
Open terminal in the project folder and run:
```bash
npm install
```
⏱️ Takes 2-5 minutes

### **Step 3: Start the App**
```bash
npm run dev
```
Then open: http://localhost:5173/

---

## 📋 What You Need

### **Required:**
- ✅ Node.js v18+ (https://nodejs.org/)
- ✅ npm v9+ (comes with Node.js)
- ✅ Internet connection
- ✅ Modern browser (Chrome, Firefox, Safari, Edge)

### **Optional:**
- API keys for AI providers (Claude, OpenAI, Gemini, etc.)
- See `SETUP_GUIDE.md` for detailed API key setup

---

## 📚 Full Documentation

For complete installation instructions, troubleshooting, and all prerequisites:
👉 **See `SETUP_GUIDE.md`**

---

## 🏗️ Project Structure

```
OneMindAI/
├── src/                    # Source code
│   ├── OneMindAI.tsx      # Main application
│   └── lib/               # Utilities
├── package.json           # Dependencies list
├── SETUP_GUIDE.md        # Complete setup guide
└── README_FOR_BOSS.md    # This file
```

---

## 🔧 All Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📊 Dependencies Overview

### **Main Libraries:**
- **React 18.3.1** - UI framework
- **TypeScript 5.6.2** - Type safety
- **Vite 5.4.11** - Build tool (fast!)
- **TailwindCSS 3.4.15** - Styling
- **Anthropic SDK** - Claude API
- **OpenAI SDK** - ChatGPT API
- **Google Generative AI** - Gemini API

**Total size after npm install**: ~200-300 MB

---

## ✨ Features Implemented

- ✅ Multi-engine AI comparison
- ✅ Real-time streaming responses
- ✅ Cost tracking & budget management ($50 default)
- ✅ Live/Mock mode toggle
- ✅ Image upload support (paste or drag-drop)
- ✅ Copy all responses button
- ✅ Responsive mobile design
- ✅ Token estimation & pricing
- ✅ Custom engine support
- ✅ Greeting: "Hey, Mac — ready to dive in? Ask me anything!"

---

## 🚀 Production Deployment

For production deployment:
1. Run `npm run build`
2. Deploy the `dist/` folder to your hosting service
3. Move API keys to backend (security best practice)
4. Configure CORS and environment variables

---

## 💡 Tips

1. **First time?** Read `SETUP_GUIDE.md` for detailed instructions
2. **API Keys**: Update them in `src/OneMindAI.tsx` (line 54)
3. **Troubleshooting**: Check the troubleshooting section in `SETUP_GUIDE.md`
4. **Port conflict?** Use `npm run dev -- --port 3000`

---

## 📞 Support

**If something doesn't work:**
1. Check Node.js version: `node --version` (need v18+)
2. Clear cache: `npm cache clean --force`
3. Reinstall: `rm -rf node_modules && npm install`
4. Check browser console for errors
5. See `SETUP_GUIDE.md` troubleshooting section

---

## ✅ Success Checklist

After setup, you should see:
- [ ] App loads at http://localhost:5173/
- [ ] Greeting message displays
- [ ] All engine cards show pricing (min $0.01)
- [ ] Generate button on right side
- [ ] Live/Mock toggle works
- [ ] Can type prompts and get responses

---

## 🎉 That's It!

**Total setup time**: 5-10 minutes

**Questions?** Check `SETUP_GUIDE.md` for comprehensive documentation.

---

**Project Version**: 1.0.0  
**Created**: November 11, 2025  
**Tech Stack**: React + TypeScript + Vite + TailwindCSS
