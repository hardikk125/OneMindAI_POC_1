/**
 * AI Proxy Server
 * 
 * Secure backend proxy for all AI provider API calls.
 * Hides API keys from frontend, implements rate limiting and security headers.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || process.env.AI_PROXY_PORT || 3002;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Allow streaming responses
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5176',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5176'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));

// Rate limiting: 60 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 60,
  message: { 
    error: 'Too many requests. Please slow down.',
    retryAfter: 60 
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

// Request logging (no sensitive data)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GOOGLE_AI_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
      perplexity: !!process.env.PERPLEXITY_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      xai: !!process.env.XAI_API_KEY
    }
  });
});

// =============================================================================
// OPENAI ROUTE
// =============================================================================

app.post('/api/openai', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    // Validate request first
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Then check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'OpenAI service not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages,
        // OpenAI GPT-4o supports up to 16384 output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, 16384) }),
        temperature: temperature ?? 0.7,
        stream: stream ?? true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'OpenAI request failed',
        code: error.error?.code
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.flushHeaders(); // Send headers immediately
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          // Flush if available (works with compression middleware)
          if (res.flush) res.flush();
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[OpenAI Error]', error.message);
    res.status(500).json({ error: 'Failed to process OpenAI request' });
  }
});

// =============================================================================
// ANTHROPIC (CLAUDE) ROUTE
// =============================================================================

app.post('/api/anthropic', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Anthropic service not configured' });
  }

  try {
    const { messages, model, max_tokens, temperature, stream, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const requestBody = {
      model: model || 'claude-3-5-sonnet-20241022',
      messages,
      // Claude requires max_tokens - use provider's max if not specified
      max_tokens: max_tokens || 200000,
      temperature: temperature ?? 0.7,
      stream: stream ?? true
    };

    if (system) {
      requestBody.system = system;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'Anthropic request failed',
        code: error.error?.type
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          if (res.flush) res.flush();
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Anthropic Error]', error.message);
    res.status(500).json({ error: 'Failed to process Anthropic request' });
  }
});

// =============================================================================
// GEMINI ROUTE
// =============================================================================

app.post('/api/gemini', async (req, res) => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini service not configured' });
  }

  try {
    const { messages, contents, model, generationConfig, stream, max_tokens } = req.body;

    // Convert OpenAI-style messages to Gemini-style contents if needed
    let geminiContents = contents;
    if (!geminiContents && messages && Array.isArray(messages)) {
      geminiContents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
    }

    if (!geminiContents || !Array.isArray(geminiContents)) {
      return res.status(400).json({ error: 'Contents or messages array required' });
    }

    const modelName = model || 'gemini-1.5-pro';
    const endpoint = stream 
      ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    // Build generationConfig with provider limit
    const finalGenerationConfig = generationConfig || {
      temperature: 0.7,
      // Gemini supports up to 8192 output tokens
      ...(max_tokens && { maxOutputTokens: Math.min(max_tokens, 8192) })
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: finalGenerationConfig
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'Gemini request failed',
        code: error.error?.code
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          if (res.flush) res.flush();
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Gemini Error]', error.message);
    res.status(500).json({ error: 'Failed to process Gemini request' });
  }
});

// =============================================================================
// MISTRAL ROUTE
// =============================================================================

app.post('/api/mistral', async (req, res) => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Mistral service not configured' });
  }

  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'mistral-large-latest',
        messages,
        // Mistral supports up to 32768 output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, 32768) }),
        temperature: temperature ?? 0.7,
        stream: stream ?? true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'Mistral request failed',
        code: error.error?.code
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          if (res.flush) res.flush();
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Mistral Error]', error.message);
    res.status(500).json({ error: 'Failed to process Mistral request' });
  }
});

// =============================================================================
// PERPLEXITY ROUTE
// =============================================================================

app.post('/api/perplexity', async (req, res) => {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Perplexity service not configured' });
  }

  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'sonar-pro',
        messages,
        // Perplexity supports up to 4096 output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, 4096) }),
        temperature: temperature ?? 0.7,
        stream: stream ?? true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'Perplexity request failed',
        code: error.error?.code
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          if (res.flush) res.flush();
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Perplexity Error]', error.message);
    res.status(500).json({ error: 'Failed to process Perplexity request' });
  }
});

// =============================================================================
// DEEPSEEK ROUTE
// =============================================================================

app.post('/api/deepseek', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'DeepSeek service not configured' });
  }

  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages,
        // DeepSeek has strict limit of 8192 max_tokens
        max_tokens: Math.min(max_tokens || 8192, 8192),
        temperature: temperature ?? 0.7,
        stream: stream ?? true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'DeepSeek request failed',
        code: error.error?.code
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          if (res.flush) res.flush();
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[DeepSeek Error]', error.message);
    res.status(500).json({ error: 'Failed to process DeepSeek request' });
  }
});

// =============================================================================
// GROQ ROUTE
// =============================================================================

app.post('/api/groq', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Groq service not configured' });
  }

  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages,
        // Groq supports up to 8192 output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, 8192) }),
        temperature: temperature ?? 0.7,
        stream: stream ?? true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'Groq request failed',
        code: error.error?.code
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          if (res.flush) res.flush();
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Groq Error]', error.message);
    res.status(500).json({ error: 'Failed to process Groq request' });
  }
});

// =============================================================================
// XAI (GROK) ROUTE
// =============================================================================

app.post('/api/xai', async (req, res) => {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'xAI service not configured' });
  }

  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'grok-beta',
        messages,
        // xAI Grok supports up to 16384 output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, 16384) }),
        temperature: temperature ?? 0.7,
        stream: stream ?? true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'xAI request failed',
        code: error.error?.code
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          if (res.flush) res.flush();
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[xAI Error]', error.message);
    res.status(500).json({ error: 'Failed to process xAI request' });
  }
});

// =============================================================================
// KIMI (MOONSHOT) ROUTE
// =============================================================================

app.post('/api/kimi', async (req, res) => {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Kimi service not configured' });
  }

  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'moonshot-v1-128k',
        messages,
        // Moonshot/Kimi supports up to 8192 output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, 8192) }),
        temperature: temperature ?? 0.7,
        stream: stream ?? true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: error.error?.message || 'Kimi request failed',
        code: error.error?.code
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          if (res.flush) res.flush();
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Kimi Error]', error.message);
    res.status(500).json({ error: 'Failed to process Kimi request' });
  }
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  
  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  
  // Generic error - never expose internals
  res.status(err.status || 500).json({ 
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   🚀 OneMindAI Proxy Server                               ║');
  console.log(`║   📡 Running on port ${PORT}                               ║`);
  console.log('║                                                           ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║   Endpoints:                                              ║');
  console.log('║   • GET  /health        - Server status                   ║');
  console.log('║   • POST /api/openai    - OpenAI proxy                    ║');
  console.log('║   • POST /api/anthropic - Claude proxy                    ║');
  console.log('║   • POST /api/gemini    - Gemini proxy                    ║');
  console.log('║   • POST /api/mistral   - Mistral proxy                   ║');
  console.log('║   • POST /api/perplexity- Perplexity proxy                ║');
  console.log('║   • POST /api/deepseek  - DeepSeek proxy                  ║');
  console.log('║   • POST /api/groq      - Groq proxy                      ║');
  console.log('║   • POST /api/xai       - xAI/Grok proxy                  ║');
  console.log('║   • POST /api/kimi      - Kimi/Moonshot proxy             ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
