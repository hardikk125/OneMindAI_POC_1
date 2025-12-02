/**
 * Proxy Client
 * 
 * Frontend client that routes all AI requests through the secure backend proxy.
 * No API keys are exposed in the frontend.
 */

// Proxy server URL - configurable via environment
const PROXY_BASE_URL = import.meta.env.NEXT_PUBLIC_BACKEND_URL || import.meta.env.VITE_PROXY_URL || 'http://localhost:3002';

export interface ProxyMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface ProxyRequestOptions {
  messages: ProxyMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  system?: string; // For Claude
}

export interface ProxyResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

type Provider = 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'perplexity' | 'deepseek' | 'groq' | 'xai' | 'kimi';

/**
 * Check if the proxy server is healthy
 */
export async function checkProxyHealth(): Promise<{
  status: string;
  uptime: number;
  providers: Record<string, boolean>;
}> {
  const response = await fetch(`${PROXY_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error('Proxy server not available');
  }
  return response.json();
}

/**
 * Send a non-streaming request through the proxy
 */
export async function sendProxyRequest(
  provider: Provider,
  options: ProxyRequestOptions
): Promise<ProxyResponse> {
  const endpoint = `${PROXY_BASE_URL}/api/${provider}`;
  
  const body: Record<string, unknown> = {
    messages: options.messages,
    model: options.model,
    max_tokens: options.max_tokens || 4000,
    temperature: options.temperature ?? 0.7,
    stream: false
  };

  // Add system message for Claude
  if (provider === 'anthropic' && options.system) {
    body.system = options.system;
  }

  // Transform for Gemini format
  if (provider === 'gemini') {
    body.contents = options.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: typeof m.content === 'string' ? m.content : m.content[0]?.text || '' }]
    }));
    body.generationConfig = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.max_tokens || 4000
    };
    delete body.messages;
    delete body.max_tokens;
    delete body.temperature;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `${provider} request failed`);
  }

  return response.json();
}

/**
 * Send a streaming request through the proxy
 * Returns an async generator that yields text chunks
 */
export async function* streamProxyRequest(
  provider: Provider,
  options: ProxyRequestOptions
): AsyncGenerator<string, void, unknown> {
  const endpoint = `${PROXY_BASE_URL}/api/${provider}`;
  
  const body: Record<string, unknown> = {
    messages: options.messages,
    model: options.model,
    max_tokens: options.max_tokens || 4000,
    temperature: options.temperature ?? 0.7,
    stream: true
  };

  // Add system message for Claude
  if (provider === 'anthropic' && options.system) {
    body.system = options.system;
  }

  // Transform for Gemini format
  if (provider === 'gemini') {
    body.contents = options.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: typeof m.content === 'string' ? m.content : m.content[0]?.text || '' }]
    }));
    body.generationConfig = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.max_tokens || 4000
    };
    delete body.messages;
    delete body.max_tokens;
    delete body.temperature;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `${provider} streaming request failed`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Parse SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            // Handle different provider formats
            if (provider === 'openai' || provider === 'mistral' || provider === 'perplexity' || 
                provider === 'deepseek' || provider === 'groq' || provider === 'xai' || provider === 'kimi') {
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } else if (provider === 'anthropic') {
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                yield parsed.delta.text;
              }
            } else if (provider === 'gemini') {
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) yield text;
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Map provider name to proxy endpoint
 */
export function getProviderEndpoint(provider: string): Provider {
  const mapping: Record<string, Provider> = {
    'anthropic': 'anthropic',
    'openai': 'openai',
    'gemini': 'gemini',
    'mistral': 'mistral',
    'perplexity': 'perplexity',
    'deepseek': 'deepseek',
    'groq': 'groq',
    'xai': 'xai',
    'kimi': 'kimi'
  };
  
  return mapping[provider] || 'openai';
}

/**
 * Check if a provider is available (has API key configured on backend)
 */
export async function isProviderAvailable(provider: Provider): Promise<boolean> {
  try {
    const health = await checkProxyHealth();
    return health.providers[provider] === true;
  } catch {
    return false;
  }
}
