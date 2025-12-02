import React from "react";
import { motion } from "framer-motion";
import { Clock, DollarSign, Zap, TrendingUp, Users, Brain } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={`relative group p-6 rounded-2xl border border-white/10 bg-gradient-to-br ${color} backdrop-blur-sm hover:border-white/20 transition-all duration-300`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <TrendingUp className="w-4 h-4 text-green-400 opacity-70" />
    </div>
    <div className="space-y-1">
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-neutral-400">{label}</div>
    </div>
    
    {/* Animated gradient border on hover */}
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-purple-500/20 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />
  </motion.div>
);

interface UsageBarProps {
  provider: string;
  percentage: number;
  color: string;
  delay: number;
}

const UsageBar: React.FC<UsageBarProps> = ({ provider, percentage, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="space-y-2"
  >
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-300">{provider}</span>
      <span className="text-neutral-400">{percentage}%</span>
    </div>
    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${percentage}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: delay + 0.2, ease: "easeOut" }}
        className={`h-full ${color} rounded-full`}
      />
    </div>
  </motion.div>
);

export const SavingsCard: React.FC = () => {
  const stats = [
    {
      icon: <Clock className="w-6 h-6 text-cyan-400" />,
      value: "15.2 hrs",
      label: "Time Saved Weekly",
      color: "from-cyan-500/10 to-blue-500/10",
      delay: 0.1
    },
    {
      icon: <DollarSign className="w-6 h-6 text-green-400" />,
      value: "$847",
      label: "Cost Optimized",
      color: "from-green-500/10 to-emerald-500/10",
      delay: 0.2
    },
    {
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      value: "3.4x",
      label: "Faster Workflows",
      color: "from-yellow-500/10 to-orange-500/10",
      delay: 0.3
    },
    {
      icon: <Brain className="w-6 h-6 text-purple-400" />,
      value: "9 AIs",
      label: "In One Platform",
      color: "from-purple-500/10 to-pink-500/10",
      delay: 0.4
    }
  ];

  const usageData = [
    { provider: "Claude (Anthropic)", percentage: 28, color: "bg-purple-500", delay: 0.5 },
    { provider: "GPT-4 (OpenAI)", percentage: 24, color: "bg-green-500", delay: 0.6 },
    { provider: "Gemini (Google)", percentage: 18, color: "bg-blue-500", delay: 0.7 },
    { provider: "DeepSeek", percentage: 15, color: "bg-cyan-500", delay: 0.8 },
    { provider: "Others", percentage: 15, color: "bg-neutral-500", delay: 0.9 }
  ];

  return (
    <section className="py-20 md:py-32 bg-neutral-950 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 via-neutral-950 to-neutral-950" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-xs font-medium text-cyan-400 backdrop-blur-sm mb-6">
            <Users className="w-3 h-3" />
            <span>Real Impact Metrics</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400 mb-4">
            Your Time & Money,
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Optimized & Tracked
            </span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Stop wasting hours switching between AI tools. OneMindAI consolidates everything, 
            tracks your savings, and shows you exactly where your productivity gains come from.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Usage Breakdown Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative p-8 md:p-10 rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900/80 to-neutral-950/80 backdrop-blur-xl"
        >
          {/* Card header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">AI Provider Usage</h3>
              <p className="text-sm text-neutral-400">Your most-used models this month</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="text-sm text-green-400 font-medium">↑ 34% efficiency</div>
            </div>
          </div>

          {/* Usage bars */}
          <div className="space-y-6">
            {usageData.map((data, index) => (
              <UsageBar key={index} {...data} />
            ))}
          </div>

          {/* Bottom stats */}
          <div className="grid grid-cols-3 gap-6 mt-10 pt-8 border-t border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">2,847</div>
              <div className="text-xs text-neutral-400">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">98.4%</div>
              <div className="text-xs text-neutral-400">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">1.2s</div>
              <div className="text-xs text-neutral-400">Avg Response</div>
            </div>
          </div>

          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/0 via-purple-500/10 to-cyan-500/0 -z-10 blur-2xl" />
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-neutral-400 text-sm">
            Join <span className="text-white font-semibold">10,000+</span> developers already saving time with OneMindAI
          </p>
        </motion.div>
      </div>
    </section>
  );
};
