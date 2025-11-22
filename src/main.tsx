import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import OneMindAI from "./OneMindAI"; // your canvas component exported as default

// Immediate startup logging
console.log('\n' + '='.repeat(80));
console.log('%c🚀 OneMindAI Application Loading...', 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; font-size: 16px; font-weight: bold;');
console.log('%cVersion: v14 Mobile-First Preview', 'color: #667eea; font-weight: bold;');
console.log('%cPlatform: Formula2GX Digital Advanced Incubation Labs', 'color: #667eea;');
console.log('%c✅ Terminal logging enabled', 'color: #4CAF50; font-weight: bold;');
console.log('%c📊 Monitoring: Chunks, Libraries, API Calls', 'color: #2196F3;');
console.log('='.repeat(80) + '\n');

// Log to terminal with [TERMINAL] prefix
console.log('[TERMINAL] 🚀 APPLICATION_BOOTSTRAP: OneMindAI main.tsx loaded');
console.log('[TERMINAL] ⚙️ ENVIRONMENT:', {
  mode: (import.meta as any).env?.MODE || 'development',
  dev: (import.meta as any).env?.DEV || true,
  prod: (import.meta as any).env?.PROD || false
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OneMindAI />
  </React.StrictMode>
);
