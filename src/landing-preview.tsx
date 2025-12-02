import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { LandingPage } from "./landing/LandingPage";

console.log('\n' + '='.repeat(80));
console.log('%c🚀 OneMindAI Landing Page Preview', 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; font-size: 16px; font-weight: bold;');
console.log('%cVersion: Landing Page v1.0', 'color: #667eea; font-weight: bold;');
console.log('%cComponents: Hero, Features, Logo Carousel, Bento Grid', 'color: #667eea;');
console.log('='.repeat(80) + '\n');

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>
);
