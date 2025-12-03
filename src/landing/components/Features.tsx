import {
  Workflow,
  DollarSign,
  FileText,
  Zap,
  BarChart3,
} from "lucide-react";

import { BentoCard, BentoGrid } from "../ui/bento-grid";

const features = [
  {
    Icon: Workflow,
    name: "Story Mode",
    description: "Sequential AI workflow that builds context across multiple engines. Each response feeds into the next for comprehensive analysis.",
    href: "#",
    cta: "Learn more",
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-cyan-500/20 to-blue-500/20" />
    ),
    className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3",
  },
  {
    Icon: DollarSign,
    name: "Cost Analysis",
    description: "Real-time cost comparison across all AI models. See exactly how much each response costs before you commit.",
    href: "#",
    cta: "Learn more",
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20" />
    ),
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
  },
  {
    Icon: FileText,
    name: "File Analysis",
    description: "Upload PDFs, Excel, Word docs, and images. All AI engines analyze your files simultaneously.",
    href: "#",
    cta: "Learn more",
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20" />
    ),
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
  },
  {
    Icon: Zap,
    name: "Speed Comparison",
    description: "See which AI responds fastest. Track response times and optimize for speed or quality.",
    href: "#",
    cta: "Learn more",
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-amber-500/20" />
    ),
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2",
  },
  {
    Icon: BarChart3,
    name: "Quality Metrics",
    description: "Compare response quality, token usage, and accuracy across all models in one unified dashboard.",
    href: "#",
    cta: "Learn more",
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-rose-500/20" />
    ),
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-4",
  },
];

export function Features() {
  return (
    <section className="py-24 bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400 mb-4">
            Everything you need to orchestrate AI
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Stop switching between ChatGPT, Claude, and Gemini. Run them all in parallel and compare results instantly.
          </p>
        </div>
        <BentoGrid className="lg:grid-rows-3 max-w-6xl mx-auto">
          {features.map((feature) => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
