// Streaming AI Client for Real-time Responses

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature?: number;
  provider: "anthropic" | "openai" | "gemini" | "mistral";
}

export class StreamingAIClient {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async *streamMessage(prompt: string): AsyncGenerator<string, void, unknown> {
    try {
      switch (this.config.provider) {
        case "anthropic":
          yield* this.streamAnthropicMessage(prompt);
          break;
        case "openai":
          yield* this.streamOpenAIMessage(prompt);
          break;
        case "gemini":
          yield* this.streamGeminiMessage(prompt);
          break;
        case "mistral":
          yield* this.streamMistralMessage(prompt);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error: any) {
      throw new Error(`Streaming error: ${error.message}`);
    }
  }

  private async *streamAnthropicMessage(prompt: string): AsyncGenerator<string> {
    const client = new Anthropic({
      apiKey: this.config.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const stream = await client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature || 0.7,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  private async *streamOpenAIMessage(prompt: string): AsyncGenerator<string> {
    const client = new OpenAI({
      apiKey: this.config.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const stream = await client.chat.completions.create({
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature || 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  private async *streamGeminiMessage(prompt: string): AsyncGenerator<string> {
    const genAI = new GoogleGenerativeAI(this.config.apiKey);
    const model = genAI.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature || 0.7,
        maxOutputTokens: this.config.maxTokens,
      },
    });

    const result = await model.generateContentStream(prompt);
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  private async *streamMistralMessage(prompt: string): AsyncGenerator<string> {
    // Mistral streaming via fetch
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
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
