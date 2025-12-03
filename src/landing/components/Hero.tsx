import React from "react";
import { BackgroundBeams } from "../ui/background-beams";
import { motion } from "framer-motion";
import { ArrowRight, Github, Sparkles } from "lucide-react";
import { Button } from "../ui/button";

export const Hero = () => {
  return (
    <div className="min-h-screen w-full bg-neutral-950 relative flex flex-col items-center justify-center antialiased overflow-hidden">
      {/* Background Beams - Behind everything */}
      <BackgroundBeams className="absolute inset-0 z-0" />
      
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-neutral-950/40 z-[1]" />
      
      <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10 w-full py-20 md:py-32">
        <div className="flex flex-col items-center text-center">
          
          {/* Pill Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-neutral-300 backdrop-blur-sm mb-8 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>OneMindAI V10.0 is available</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400 mb-6 tracking-tight"
          >
            Orchestrate the World's <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">Best AI Models.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-10 leading-relaxed"
          >
            Stop switching tabs. Run ChatGPT, Claude, Gemini, and DeepSeek in a single, unified workflow. Compare cost, speed, and quality instantly.
          </motion.p>

          {/* Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-4 mb-16"
          >
            <Button 
              size="lg"
              className="px-8 py-3.5 bg-white text-neutral-950 font-bold hover:bg-neutral-200 transition-colors group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center gap-2">
                Start Story Mode
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            
            <Button 
              variant="outline"
              size="lg"
              className="px-8 py-3.5 border-neutral-800 text-white hover:bg-neutral-900"
              asChild
            >
              <a href="https://github.com/hardikk125/OneMindAI_POC_1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </Button>
          </motion.div>

          {/* 3D Tilt Card Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.8, type: "spring" }}
            className="relative w-full max-w-5xl mx-auto"
            style={{ perspective: "1000px" }}
          >
            <div className="relative rounded-xl border border-white/10 bg-neutral-900/50 backdrop-blur-xl shadow-2xl shadow-cyan-500/10 overflow-hidden group">
              {/* Mockup Header */}
              <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20" />
                </div>
                <div className="flex-1 text-center text-xs text-neutral-500 font-mono">onemind-ai-v10.tsx</div>
              </div>
              
              {/* Mockup Content (Simplified UI Representation) */}
              <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-[300px] md:h-[500px] overflow-hidden relative">
                {/* Sidebar */}
                <div className="hidden md:block md:col-span-3 space-y-4">
                  <div className="h-8 w-3/4 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
                  <div className="space-y-2 mt-8">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-12 w-full bg-white/5 rounded border border-white/5 flex items-center px-3 gap-3">
                        <div className="w-6 h-6 rounded bg-white/10" />
                        <div className="h-3 w-20 bg-white/10 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Main Area */}
                <div className="col-span-1 md:col-span-9 space-y-6">
                  <div className="h-32 w-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl border border-white/5 p-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/[0.02]" />
                    <div className="h-6 w-40 bg-white/10 rounded mb-2 relative z-10" />
                    <div className="h-4 w-64 bg-white/5 rounded relative z-10" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-40 bg-neutral-800/50 rounded-xl border border-white/5 p-4">
                       <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center text-green-400 text-xs">GPT</div>
                          <div className="h-3 w-20 bg-white/10 rounded" />
                       </div>
                       <div className="space-y-2">
                          <div className="h-2 w-full bg-white/5 rounded" />
                          <div className="h-2 w-3/4 bg-white/5 rounded" />
                          <div className="h-2 w-5/6 bg-white/5 rounded" />
                       </div>
                    </div>
                    <div className="h-40 bg-neutral-800/50 rounded-xl border border-white/5 p-4">
                       <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs">CLA</div>
                          <div className="h-3 w-20 bg-white/10 rounded" />
                       </div>
                       <div className="space-y-2">
                          <div className="h-2 w-full bg-white/5 rounded" />
                          <div className="h-2 w-3/4 bg-white/5 rounded" />
                          <div className="h-2 w-5/6 bg-white/5 rounded" />
                       </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Gradient Overlay on Bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-950 to-transparent z-20" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
