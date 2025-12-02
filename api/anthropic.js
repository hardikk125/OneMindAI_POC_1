/**
 * Anthropic (Claude) Proxy Endpoint
 */

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model, max_tokens, temperature, stream } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(503).json({ error: 'Anthropic not configured' });
    }

    // Claude model-specific max token limits
    const selectedModel = model || 'claude-3-5-sonnet-20241022';
    const modelLimits = {
      'claude-3-haiku': 4096,
      'claude-3-haiku-20240307': 4096,
      'claude-3-5-sonnet': 8192,
      'claude-3-5-sonnet-20241022': 8192,
      'claude-3-opus': 4096,
      'claude-3-opus-20240229': 4096,
    };
    
    const maxLimit = modelLimits[selectedModel] || 4096;
    const requestedTokens = max_tokens || 4096;
    const safeMaxTokens = Math.min(requestedTokens, maxLimit);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: safeMaxTokens,
        temperature: temperature ?? 0.7,
        stream: stream ?? true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: error.error?.message || 'Anthropic error'
      });
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
};
