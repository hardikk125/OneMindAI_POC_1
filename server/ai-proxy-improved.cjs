/**
 * AI Proxy Server - SECURITY HARDENED VERSION
 * 
 * Secure backend proxy for all AI provider API calls.
 * ✅ All API keys from environment variables
 * ✅ Rate limiting per IP
 * ✅ Security headers with Helmet
 * ✅ CORS properly configured
 * ✅ No hard-coded values
 * ✅ Railway/Vercel compatible
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// =============================================================================
// CONFIGURATION - ALL FROM ENVIRONMENT VARIABLES
// =============================================================================

// Port configuration - Railway/Vercel compatible
const PORT = process.env.PORT || process.env.AI_PROXY_PORT || 3002;

// CORS origins - configurable via environment
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [
  'http://localhost:5173',
  'http://localhost:5176',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5176'
];

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 60; // 60 requests per window

// Request size limit
const REQUEST_SIZE_LIMIT = process.env.REQUEST_SIZE_LIMIT || '10mb';

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Allow streaming responses
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.warn(`[CORS] Rejected origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body parsing with configurable size limit
app.use(express.json({ limit: REQUEST_SIZE_LIMIT }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: { 
    error: 'Too many requests. Please slow down.',
    retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health check
  skip: (req) => req.path === '/health'
});

app.use('/api/', apiLimiter);

// Request logging (sanitized - no sensitive data)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const sanitizedPath = req.path.replace(/[?&](key|token|apikey)=[^&]*/gi, '');
  console.log(`[${timestamp}] ${req.method} ${sanitizedPath}`);
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
    environment: process.env.NODE_ENV || 'development',
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GOOGLE_AI_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
      perplexity: !!process.env.PERPLEXITY_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      xai: !!process.env.XAI_API_KEY,
      kimi: !!process.env.KIMI_API_KEY
    }
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Stream response from AI provider to client
 */
async function streamResponse(providerResponse, clientResponse) {
  clientResponse.setHeader('Content-Type', 'text/event-stream');
  clientResponse.setHeader('Cache-Control', 'no-cache');
  clientResponse.setHeader('Connection', 'keep-alive');
  
  const reader = providerResponse.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      clientResponse.write(decoder.decode(value, { stream: true }));
    }
  } finally {
    clientResponse.end();
  }
}

/**
 * Handle API errors consistently
 */
function handleApiError(error, providerName, res) {
  console.error(`[${providerName} Error]`, error.message);
  
  // Don't expose internal error details
  res.status(500).json({ 
    error: `Failed to process ${providerName} request`,
    provider: providerName
  });
}

// =============================================================================
// OPENAI ROUTE
// =============================================================================

app.post('/api/openai', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Check API key
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
        max_tokens: max_tokens || 8000,
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
      await streamResponse(response, res);
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    handleApiError(error, 'OpenAI', res);
  }
});

// =============================================================================
// ANTHROPIC (CLAUDE) ROUTE
// =============================================================================

app.post('/api/anthropic', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Anthropic service not configured' });
    }

    const requestBody = {
      model: model || 'claude-3-5-sonnet-20241022',
      messages,
      max_tokens: max_tokens || 8000,
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
      await streamResponse(response, res);
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    handleApiError(error, 'Anthropic', res);
  }
});

// =============================================================================
// GEMINI ROUTE
// =============================================================================

app.post('/api/gemini', async (req, res) => {
  try {
    const { contents, model, generationConfig, stream } = req.body;

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: 'Contents array required' });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Gemini service not configured' });
    }

    const modelName = model || 'gemini-1.5-pro';
    const endpoint = stream 
      ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}` 
      : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: generationConfig || {
          temperature: 0.7,
          maxOutputTokens: 4000
        }
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
      await streamResponse(response, res);
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    handleApiError(error, 'Gemini', res);
  }
});

// =============================================================================
// MISTRAL ROUTE
// =============================================================================

app.post('/api/mistral', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Mistral service not configured' });
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
        max_tokens: max_tokens || 8000,
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
      await streamResponse(response, res);
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    handleApiError(error, 'Mistral', res);
  }
});

// =============================================================================
// PERPLEXITY ROUTE
// =============================================================================

app.post('/api/perplexity', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Perplexity service not configured' });
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
        max_tokens: max_tokens || 8000,
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
      await streamResponse(response, res);
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    handleApiError(error, 'Perplexity', res);
  }
});

// =============================================================================
// DEEPSEEK ROUTE
// =============================================================================

app.post('/api/deepseek', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'DeepSeek service not configured' });
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
        max_tokens: max_tokens || 8000,
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
      await streamResponse(response, res);
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    handleApiError(error, 'DeepSeek', res);
  }
});

// =============================================================================
// GROQ ROUTE
// =============================================================================

app.post('/api/groq', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Groq service not configured' });
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
        max_tokens: max_tokens || 8000,
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
      await streamResponse(response, res);
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    handleApiError(error, 'Groq', res);
  }
});

// =============================================================================
// XAI (GROK) ROUTE
// =============================================================================

app.post('/api/xai', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'xAI service not configured' });
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
        max_tokens: max_tokens || 8000,
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
      await streamResponse(response, res);
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    handleApiError(error, 'xAI', res);
  }
});

// =============================================================================
// KIMI (MOONSHOT) ROUTE
// =============================================================================

app.post('/api/kimi', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Kimi service not configured' });
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
        max_tokens: max_tokens || 8000,
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
      await streamResponse(response, res);
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    handleApiError(error, 'Kimi', res);
  }
});

// =============================================================================
// ERROR HANDLERS
// =============================================================================

// CORS error handler
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'Origin not allowed',
      message: 'Your origin is not in the allowed CORS list'
    });
  }
  next(err);
});

// Generic error handler - never expose internals
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  console.error(err.stack);
  
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path
  });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   🚀 OneMindAI Proxy Server (Security Hardened)          ║');
  console.log(`║   📡 Port: ${PORT.toString().padEnd(47)}║`);
  console.log(`║   🌍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(39)}║`);
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
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║   Security Features:                                      ║');
  console.log(`║   • Rate Limit: ${RATE_LIMIT_MAX} req/${Math.ceil(RATE_LIMIT_WINDOW_MS/1000)}s per IP`.padEnd(60) + '║');
  console.log(`║   • CORS Origins: ${allowedOrigins.length} configured`.padEnd(60) + '║');
  console.log('║   • Helmet security headers enabled                       ║');
  console.log('║   • Request size limit: ' + REQUEST_SIZE_LIMIT.padEnd(35) + '║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;
