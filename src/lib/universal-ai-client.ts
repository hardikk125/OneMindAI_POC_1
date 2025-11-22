// Universal AI Client for Claude, OpenAI, Gemini, and Mistral

export interface AIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature?: number;
  provider: "anthropic" | "openai" | "gemini" | "mistral";
  baseUrl?: string; // For custom endpoints
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
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

export class UniversalAIClient {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async sendMessage(prompt: string): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      let response: AIResponse;

      switch (this.config.provider) {
        case "anthropic":
          response = await this.sendAnthropicMessage(prompt);
          break;
        case "openai":
          response = await this.sendOpenAIMessage(prompt);
          break;
        case "gemini":
          response = await this.sendGeminiMessage(prompt);
          break;
        case "mistral":
          response = await this.sendMistralMessage(prompt);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }

      return response;
    } catch (error: any) {
      const endTime = Date.now();
      return {
        content: '',
        model: this.config.model,
        provider: this.config.provider,
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

  private async sendAnthropicMessage(prompt: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Dynamic import to avoid bundling issues
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    
    const client = new Anthropic({
      apiKey: this.config.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature || 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('\n');

    const pricing = this.getAnthropicPricing();
    const inputCost = (response.usage.input_tokens / 1_000_000) * pricing.input;
    const outputCost = (response.usage.output_tokens / 1_000_000) * pricing.output;

    return {
      content,
      model: response.model,
      provider: 'anthropic',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      cost: {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost,
      },
      timing: { startTime, endTime, duration },
    };
  }

  private async sendOpenAIMessage(prompt: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Dynamic import of OpenAI SDK
    const { default: OpenAI } = await import('openai');
    
    const client = new OpenAI({
      apiKey: this.config.apiKey,
      dangerouslyAllowBrowser: true, // Allows frontend API calls
    });

    const response = await client.chat.completions.create({
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature || 0.7,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

    const pricing = this.getOpenAIPricing();
    const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;

    return {
      content,
      model: response.model,
      provider: 'openai',
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
      },
      cost: {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost,
      },
      timing: { startTime, endTime, duration },
    };
  }

  private async sendGeminiMessage(prompt: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Dynamic import of Google Generative AI SDK
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(this.config.apiKey);
    const model = genAI.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature || 0.7,
        maxOutputTokens: this.config.maxTokens,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    const content = response.text();
    
    // Get usage metadata
    const usage = (result as any).response?.usageMetadata || { 
      promptTokenCount: 0, 
      candidatesTokenCount: 0 
    };

    const pricing = this.getGeminiPricing();
    const inputCost = (usage.promptTokenCount / 1_000_000) * pricing.input;
    const outputCost = (usage.candidatesTokenCount / 1_000_000) * pricing.output;

    return {
      content,
      model: this.config.model,
      provider: 'gemini',
      usage: {
        inputTokens: usage.promptTokenCount,
        outputTokens: usage.candidatesTokenCount,
      },
      cost: {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost,
      },
      timing: { startTime, endTime, duration },
    };
  }

  private async sendMistralMessage(prompt: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Mistral API using fetch
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    const endTime = Date.now();
    const duration = endTime - startTime;

    const content = data.choices[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    const pricing = this.getMistralPricing();
    const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;

    return {
      content,
      model: data.model,
      provider: 'mistral',
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
      },
      cost: {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost,
      },
      timing: { startTime, endTime, duration },
    };
  }

  // Pricing methods for each provider
  private getAnthropicPricing(): { input: number; output: number } {
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

  private getOpenAIPricing(): { input: number; output: number } {
    const pricingMap: Record<string, { input: number; output: number }> = {
      'gpt-4.1': { input: 10, output: 30 },
      'gpt-4o': { input: 2.5, output: 10 },
      'gpt-4o-2024-11-20': { input: 2.5, output: 10 },
      'gpt-4o-2024-08-06': { input: 2.5, output: 10 },
      'gpt-4o-2024-05-13': { input: 5, output: 15 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4.1-mini': { input: 2, output: 6 },
      'gpt-5-preview': { input: 20, output: 60 },
      'gpt-5-mini-preview': { input: 5, output: 15 },
      'gpt-4': { input: 30, output: 60 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    };
    return pricingMap[this.config.model] || { input: 2.5, output: 10 };
  }

  private getGeminiPricing(): { input: number; output: number } {
    const pricingMap: Record<string, { input: number; output: number }> = {
      'gemini-1.5-pro': { input: 6, output: 16 },
      'gemini-1.5-flash': { input: 2, output: 5 },
      'gemini-2.5-flash': { input: 1.5, output: 4 }, // New model
      'gemini-pro': { input: 0.5, output: 1.5 },
    };
    return pricingMap[this.config.model] || { input: 6, output: 16 };
  }

  private getMistralPricing(): { input: number; output: number } {
    const pricingMap: Record<string, { input: number; output: number }> = {
      'mistral-large-latest': { input: 8, output: 24 },
      'mistral-medium-2312': { input: 4, output: 12 }, // New model
      'mistral-small': { input: 2, output: 6 },
      'mistral-medium': { input: 4, output: 12 },
      'mistral-tiny': { input: 0.5, output: 1.5 },
    };
    return pricingMap[this.config.model] || { input: 8, output: 24 };
  }
}
