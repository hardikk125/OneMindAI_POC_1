import { LogoCarousel } from "../ui/logo-carousel";
import { GradientHeading } from "../ui/gradient-heading";
import {
  OpenAILogo,
  ClaudeLogo,
  GeminiLogo,
  DeepSeekLogo,
  PerplexityLogo,
  MistralLogo,
  GroqLogo,
  KimiLogo,
  SarvamLogo,
} from "./AILogos";

const aiProviders = [
  { name: "OpenAI", id: 1, img: OpenAILogo },
  { name: "Claude", id: 2, img: ClaudeLogo },
  { name: "Gemini", id: 3, img: GeminiLogo },
  { name: "DeepSeek", id: 4, img: DeepSeekLogo },
  { name: "Perplexity", id: 5, img: PerplexityLogo },
  { name: "Mistral", id: 6, img: MistralLogo },
  { name: "Groq", id: 7, img: GroqLogo },
  { name: "Kimi", id: 8, img: KimiLogo },
  { name: "Sarvam", id: 9, img: SarvamLogo },
];

export function LogoShowcase() {
  return (
    <section className="py-24 bg-neutral-950">
      <div className="mx-auto flex w-full max-w-screen-lg flex-col items-center space-y-8">
        <div className="text-center">
          <GradientHeading variant="secondary" size="sm">
            Powered by the world's best AI
          </GradientHeading>
          <GradientHeading size="xl">
            9 AI Engines. One Platform.
          </GradientHeading>
        </div>

        <LogoCarousel columnCount={3} logos={aiProviders} />
        
        <p className="text-neutral-400 text-center max-w-2xl">
          Compare ChatGPT, Claude, Gemini, DeepSeek, Perplexity, Mistral, Groq, Kimi, and Sarvam AI in real-time. 
          See which model gives you the best answer for your specific use case.
        </p>
      </div>
    </section>
  );
}
