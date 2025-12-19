import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature?: number;
}

export interface ClaudeResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  cost: {
    input: number;
    output: number;
    total: number;
  };
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  error?: string;
}

export class ClaudeClient {
  private client: Anthropic;
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true, // Allows frontend API calls
    });
  }

  async sendMessage(prompt: string): Promise<ClaudeResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature ?? 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('\n');

      const pricing = this.getPricing();
      const inputCost = (response.usage.input_tokens / 1_000_000) * pricing.input;
      const outputCost = (response.usage.output_tokens / 1_000_000) * pricing.output;

      return {
        content,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        cost: {
          input: inputCost,
          output: outputCost,
          total: inputCost + outputCost,
        },
        timing: {
          startTime,
          endTime,
          duration,
        },
      };
    } catch (error: any) {
      const endTime = Date.now();
      return {
        content: '',
        model: this.config.model,
        usage: { inputTokens: 0, outputTokens: 0 },
        cost: { input: 0, output: 0, total: 0 },
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  private getPricing(): { input: number; output: number } {
    const pricingMap: Record<string, { input: number; output: number }> = {
      'claude-3.5-sonnet': { input: 3, output: 15 },
      'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'claude-3-opus-20240229': { input: 15, output: 75 },
      'claude-3-sonnet-20240229': { input: 3, output: 15 },
    };

    return pricingMap[this.config.model] || { input: 3, output: 15 };
  }
}
