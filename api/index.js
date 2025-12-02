/**
 * Vercel Serverless API - Main Entry Point
 * 
 * This handles all /api/* requests on Vercel
 */

const express = require('express');
const cors = require('cors');

const app = express();

// CORS - Allow your frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://one-mind-ai-poc.vercel.app',
  process.env.ALLOWED_ORIGINS?.split(',') || []
].flat().filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GOOGLE_AI_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
    }
  });
});

// =============================================================================
// OPENAI
// =============================================================================

app.post('/api/openai', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(503).json({ error: 'OpenAI not configured' });
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
      return res.status(response.status).json({ error: error.error?.message || 'OpenAI error' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[OpenAI Error]', error);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

// =============================================================================
// ANTHROPIC (Claude)
// =============================================================================

app.post('/api/anthropic', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(503).json({ error: 'Anthropic not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        messages,
        max_tokens: max_tokens || 8000,
        temperature: temperature ?? 0.7,
        stream: stream ?? true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: error.error?.message || 'Anthropic error' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Anthropic Error]', error);
    res.status(500).json({ error: 'Anthropic request failed' });
  }
});

// =============================================================================
// DEEPSEEK
// =============================================================================

app.post('/api/deepseek', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      return res.status(503).json({ error: 'DeepSeek not configured' });
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
      return res.status(response.status).json({ error: error.error?.message || 'DeepSeek error' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[DeepSeek Error]', error);
    res.status(500).json({ error: 'DeepSeek request failed' });
  }
});

// =============================================================================
// MISTRAL
// =============================================================================

app.post('/api/mistral', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;
    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
      return res.status(503).json({ error: 'Mistral not configured' });
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
      return res.status(response.status).json({ error: error.error?.message || 'Mistral error' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Mistral Error]', error);
    res.status(500).json({ error: 'Mistral request failed' });
  }
});

// =============================================================================
// GEMINI
// =============================================================================

app.post('/api/gemini', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      return res.status(503).json({ error: 'Gemini not configured' });
    }

    // Convert messages to Gemini format
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const modelName = model || 'gemini-2.0-flash-exp';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${stream ? 'streamGenerateContent' : 'generateContent'}?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: max_tokens || 8000,
          temperature: temperature ?? 0.7
        }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: error.error?.message || 'Gemini error' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Gemini Error]', error);
    res.status(500).json({ error: 'Gemini request failed' });
  }
});

// =============================================================================
// GROQ
// =============================================================================

app.post('/api/groq', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return res.status(503).json({ error: 'Groq not configured' });
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
      return res.status(response.status).json({ error: error.error?.message || 'Groq error' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Groq Error]', error);
    res.status(500).json({ error: 'Groq request failed' });
  }
});

// Export for Vercel
module.exports = app;
