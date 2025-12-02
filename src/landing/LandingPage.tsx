import React from "react";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { LogoShowcase } from "./components/LogoShowcase";
import { SavingsCard } from "./components/SavingsCard";
import { Button } from "./ui/button";
import { Github } from "lucide-react";

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-neutral-950/50 backdrop-blur-md border-b border-white/5">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg" />
      <span className="font-bold text-white tracking-tight">OneMindAI</span>
    </div>
    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
      <a href="#features" className="hover:text-white transition-colors">Features</a>
      <a href="#ai-engines" className="hover:text-white transition-colors">AI Engines</a>
      <a href="https://github.com/hardikk125/OneMindAI_POC_1" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Docs</a>
    </div>
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="sm" className="text-neutral-300 hover:text-white">
        Sign In
      </Button>
      <Button size="sm" className="bg-white text-neutral-950 hover:bg-neutral-200">
        Get Started
      </Button>
    </div>
  </nav>
);

const Footer = () => (
  <footer className="bg-neutral-950 border-t border-white/5 py-12">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg" />
            <span className="font-bold text-white tracking-tight">OneMindAI</span>
          </div>
          <p className="text-sm text-neutral-400">
            Orchestrate the world's best AI models in one unified platform.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-4">Product</h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
            <li><a href="#ai-engines" className="hover:text-white transition-colors">AI Engines</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-4">Resources</h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li><a href="https://github.com/hardikk125/OneMindAI_POC_1" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation</a></li>
            <li><a href="https://github.com/hardikk125/OneMindAI_POC_1" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
            <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-4">Connect</h3>
          <Button variant="outline" size="sm" asChild className="w-full">
            <a href="https://github.com/hardikk125/OneMindAI_POC_1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <Github className="w-4 h-4" />
              Star on GitHub
            </a>
          </Button>
        </div>
      </div>
      <div className="border-t border-white/5 pt-8 text-center text-sm text-neutral-400">
        <p>© 2024 OneMindAI. Built with ❤️ for AI enthusiasts.</p>
      </div>
    </div>
  </footer>
);

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-cyan-500/30">
      <Navbar />
      <main>
        <Hero />
        <div id="ai-engines">
          <LogoShowcase />
        </div>
        <SavingsCard />
        <div id="features">
          <Features />
        </div>
      </main>
      <Footer />
    </div>
  );
};
