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
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// =============================================================================
// PROVIDER CONFIG FROM DATABASE (Phase 6)
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Debug logging to verify env vars
console.log('[Supabase] SUPABASE_URL:', SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'MISSING');
console.log('[Supabase] SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? `${SUPABASE_SERVICE_KEY.substring(0, 50)}...` : 'MISSING');
console.log('[Supabase] Key length:', SUPABASE_SERVICE_KEY ? SUPABASE_SERVICE_KEY.length : 0);

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

if (supabase) {
  console.log('[Supabase] Client created successfully');
  console.log('[Supabase] Connected to:', SUPABASE_URL);
  
  // Test the connection immediately
  (async () => {
    try {
      console.log('[Supabase] Testing connection with provider_config query...');
      const { data, error } = await supabase.from('provider_config').select('provider').limit(1);
      if (error) {
        console.error('[Supabase] TEST FAILED:', error.message);
        console.error('[Supabase] Error code:', error.code);
        console.error('[Supabase] Error details:', JSON.stringify(error));
      } else {
        console.log('[Supabase] TEST SUCCESS - Found', data?.length || 0, 'provider(s)');
      }
    } catch (err) {
      console.error('[Supabase] TEST EXCEPTION:', err.message);
    }
  })();
} else {
  console.error('[Supabase] NOT CONNECTED - Missing URL or SERVICE_KEY');
}

let providerCache = null;
let modelCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// MODEL & PROVIDER WHITELIST VALIDATION
// =============================================================================

async function refreshCaches() {
  if (!supabase) {
    console.warn('[Config] Supabase not initialized, skipping cache refresh');
    return;
  }
  // Only skip refresh if cache is valid (not empty) and within TTL
  const cacheIsValid = providerCache !== null && 
                       Object.keys(providerCache).length > 0 && 
                       modelCache !== null && 
                       modelCache.length > 0;
  if (cacheIsValid && Date.now() - cacheTime < CACHE_TTL) {
    console.log('[Config] Using cached data (age:', Math.floor((Date.now() - cacheTime) / 1000), 'seconds)');
    return;
  }
  
  try {
    console.log('[Config] Refreshing caches from database...');
    const [providerResult, modelResult] = await Promise.all([
      supabase.from('provider_config').select('*'),
      supabase.from('ai_models').select('*').order('provider').order('model_id')
    ]);
    
    // Log any errors but still initialize caches
    if (providerResult.error) {
      console.error('[Config] Error fetching provider_config:', providerResult.error.message);
      providerCache = {}; // Initialize as empty object instead of null
    } else {
      providerCache = Object.fromEntries((providerResult.data || []).map(r => [r.provider, r]));
      console.log(`[Config] Loaded ${Object.keys(providerCache).length} providers from database`);
    }
    
    if (modelResult.error) {
      console.error('[Config] Error fetching ai_models:', modelResult.error.message);
      modelCache = []; // Initialize as empty array instead of null
    } else {
      modelCache = modelResult.data || [];
      console.log(`[Config] Loaded ${modelCache.length} models from database`);
      const enabledModels = modelCache.filter(m => m.is_active === true);
      console.log(`[Config] ${enabledModels.length} models are enabled:`, enabledModels.map(m => `${m.provider}/${m.model_id}`).join(', '));
    }
    
    cacheTime = Date.now();
    console.log('[Config] Cache refresh complete');
  } catch (err) {
    console.error('[Config] Failed to refresh caches:', err.message);
    // Initialize caches as empty to indicate we tried but failed
    if (providerCache === null) providerCache = {};
    if (modelCache === null) modelCache = [];
  }
}

async function isProviderEnabled(provider) {
  await refreshCaches();
  
  // API access is controlled by ai_models.is_active, NOT provider_config.is_enabled
  // provider_config.is_enabled controls main app visibility only
  // A provider is "enabled" for API if ANY of its models are active
  if (!modelCache || modelCache.length === 0) return true; // Allow if no database
  
  // Check if any model for this provider is active
  const hasActiveModel = modelCache.some(m => 
    m.provider === provider && m.is_active === true
  );
  
  // If no models found for this provider, allow it (backwards compatibility)
  const providerModels = modelCache.filter(m => m.provider === provider);
  if (providerModels.length === 0) return true;
  
  return hasActiveModel;
}

async function isModelEnabled(provider, modelId) {
  await refreshCaches();
  if (!modelCache || modelCache.length === 0) return true; // Allow if no database
  
  // Find the model in cache
  const model = modelCache.find(m => 
    m.provider === provider && m.model_id === modelId
  );
  
  // If model not found in database, allow it (backwards compatibility)
  if (!model) return true;
  
  return model.is_active === true;
}

async function validateModelAccess(provider, modelId) {
  console.log(`[Validate] Checking access for ${provider}/${modelId}`);
  
  // Check provider first
  const providerEnabled = await isProviderEnabled(provider);
  console.log(`[Validate] Provider '${provider}' enabled: ${providerEnabled}`);
  if (!providerEnabled) {
    return { allowed: false, reason: `Provider '${provider}' is disabled` };
  }
  
  // Check model
  const modelEnabled = await isModelEnabled(provider, modelId);
  console.log(`[Validate] Model '${modelId}' enabled: ${modelEnabled}`);
  if (!modelEnabled) {
    return { allowed: false, reason: `Model '${modelId}' is disabled` };
  }
  
  console.log(`[Validate] Access ALLOWED for ${provider}/${modelId}`);
  return { allowed: true };
}

async function getEnabledModelsForProvider(provider) {
  await refreshCaches();
  if (!modelCache) return []; // Return empty if no database
  
  return modelCache
    .filter(m => m.provider === provider && m.is_active === true)
    .map(m => m.model_id);
}

async function getProviderLimit(provider, field, fallback) {
  if (!supabase) return fallback;
  if (providerCache && Date.now() - cacheTime < CACHE_TTL) {
    return providerCache[provider]?.[field] ?? fallback;
  }
  try {
    const { data, error } = await supabase.from('provider_config').select('*');
    if (error) throw error;
    providerCache = Object.fromEntries(data.map(r => [r.provider, r]));
    cacheTime = Date.now();
    console.log('[Config] Provider config loaded from database');
    return providerCache[provider]?.[field] ?? fallback;
  } catch (err) {
    console.warn('[Config] Failed to fetch provider config:', err.message);
    return fallback;
  }
}

/**
 * Get temperature for a provider from database config or environment variable
 * Priority: database config > environment variable > default (0.7)
 */
async function getProviderTemperature(provider) {
  // Try database first
  const dbTemp = await getProviderLimit(provider, 'temperature', null);
  if (dbTemp !== null && dbTemp !== undefined) {
    return dbTemp;
  }
  
  // Try environment variable
  const envKey = `PROVIDER_TEMPERATURE_${provider.toUpperCase()}`;
  const envTemp = parseFloat(process.env[envKey]);
  if (!isNaN(envTemp)) {
    return envTemp;
  }
  
  // Default fallback
  return 0.7;
}

const app = express();
const PORT = process.env.PORT || process.env.AI_PROXY_PORT || 3002;

console.log('🔥 [PROXY] Starting with GEMINI STREAMING FIX v2 - Dec 4, 2025 9:30pm');

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Trust proxy for Railway/Vercel deployments (fixes X-Forwarded-For header issues)
// Set to 1 to only trust the first proxy (Railway/Vercel)
app.set('trust proxy', 1);

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

// Production domains that are always allowed
const PRODUCTION_DOMAINS = [
  'one-mind-ai-poc.vercel.app',
  'onemindai.vercel.app',
  'vercel.app',  // Allow all Vercel preview deployments
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Allow any localhost or 127.0.0.1 origin (for development)
    if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }
    
    // Allow production domains (Vercel deployments)
    if (origin) {
      const originHost = new URL(origin).hostname;
      if (PRODUCTION_DOMAINS.some(domain => originHost === domain || originHost.endsWith('.' + domain))) {
        console.log(`[CORS] Allowed production origin: ${origin}`);
        return callback(null, true);
      }
    }
    
    // Check explicit allowed origins from env
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`[CORS] Blocked origin: ${origin}`);
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
      xai: !!process.env.XAI_API_KEY,
      hubspot: !!process.env.HUBSPOT_CLIENT_ID
    }
  });
});

// =============================================================================
// ADMIN API CONFIG ENDPOINTS
// =============================================================================

// Test provider connection - sends a minimal request to verify API key works
app.post('/api/admin/test-provider/:provider', async (req, res) => {
  const { provider } = req.params;
  const startTime = Date.now();
  
  console.log(`[Admin] Testing provider connection: ${provider}`);
  
  try {
    let success = false;
    let error = null;
    
    // Get API key from environment or database
    const apiKeys = {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      gemini: process.env.GOOGLE_AI_API_KEY,
      mistral: process.env.MISTRAL_API_KEY,
      perplexity: process.env.PERPLEXITY_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      groq: process.env.GROQ_API_KEY,
      xai: process.env.XAI_API_KEY,
      kimi: process.env.KIMI_API_KEY,
    };
    
    const apiKey = apiKeys[provider];
    
    if (!apiKey) {
      return res.json({ 
        success: false, 
        error: `No API key configured for ${provider}`,
        latency_ms: Date.now() - startTime
      });
    }
    
    // Provider-specific test endpoints
    const testEndpoints = {
      openai: {
        url: 'https://api.openai.com/v1/models',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      },
      anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: { 
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      },
      gemini: {
        url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        headers: {}
      },
      mistral: {
        url: 'https://api.mistral.ai/v1/models',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      },
      perplexity: {
        url: 'https://api.perplexity.ai/chat/completions',
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      },
      deepseek: {
        url: 'https://api.deepseek.com/v1/models',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      },
      groq: {
        url: 'https://api.groq.com/openai/v1/models',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      },
      xai: {
        url: 'https://api.x.ai/v1/models',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      },
      kimi: {
        url: 'https://api.moonshot.cn/v1/models',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }
    };
    
    const testConfig = testEndpoints[provider];
    
    if (!testConfig) {
      return res.json({ 
        success: false, 
        error: `Unknown provider: ${provider}`,
        latency_ms: Date.now() - startTime
      });
    }
    
    const response = await fetch(testConfig.url, {
      method: testConfig.method || 'GET',
      headers: testConfig.headers,
      body: testConfig.body,
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (response.ok || response.status === 200 || response.status === 201) {
      success = true;
    } else {
      const errorData = await response.text();
      error = `HTTP ${response.status}: ${errorData.substring(0, 200)}`;
    }
    
    const latency_ms = Date.now() - startTime;
    console.log(`[Admin] Provider ${provider} test: ${success ? 'SUCCESS' : 'FAILED'} (${latency_ms}ms)`);
    
    res.json({ success, error, latency_ms });
    
  } catch (err) {
    const latency_ms = Date.now() - startTime;
    console.error(`[Admin] Provider ${provider} test error:`, err.message);
    res.json({ 
      success: false, 
      error: err.message,
      latency_ms
    });
  }
});

// Get provider config from database (for backend use)
app.get('/api/admin/config', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }
    
    const [providerResult, systemResult] = await Promise.all([
      supabase.from('provider_config').select('*').order('priority'),
      supabase.from('system_config').select('*').eq('category', 'api')
    ]);
    
    if (providerResult.error) throw providerResult.error;
    if (systemResult.error) throw systemResult.error;
    
    // Don't expose API keys in response
    const safeProviders = (providerResult.data || []).map(p => ({
      ...p,
      api_key_encrypted: undefined,
      has_api_key: !!p.api_key_encrypted
    }));
    
    res.json({
      providers: safeProviders,
      settings: systemResult.data || []
    });
    
  } catch (err) {
    console.error('[Admin] Config fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// HUBSPOT CRM INTEGRATION (OAuth Flow)
// =============================================================================

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

// In-memory token storage (per user) - In production, use database (Supabase)
// Key: oderId, Value: { access_token, refresh_token, expires_at, portal_id }
const hubspotTokenStore = new Map();

// Helper: Get user ID from request (simplified - use real auth in production)
function getHubSpotUserId(req) {
  // For now, use a query param or header. In production, use session/JWT
  return req.query.userId || req.headers['x-user-id'] || 'default-user';
}

// Helper: Save tokens for a user
function saveHubSpotTokens(userId, tokenData) {
  const expiresAt = new Date(Date.now() + (tokenData.expires_in - 60) * 1000); // 60s buffer
  hubspotTokenStore.set(userId, {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    portal_id: tokenData.hub_id || tokenData.portal_id
  });
  console.log(`[HubSpot] Tokens saved for user: ${userId}`);
}

// Helper: Get tokens for a user
function getHubSpotTokens(userId) {
  return hubspotTokenStore.get(userId);
}

// Helper: Delete tokens for a user
function deleteHubSpotTokens(userId) {
  hubspotTokenStore.delete(userId);
  console.log(`[HubSpot] Tokens deleted for user: ${userId}`);
}

// Helper: Refresh token if expired
async function refreshHubSpotTokenIfNeeded(userId) {
  const tokens = getHubSpotTokens(userId);
  if (!tokens) return null;

  // Check if token is still valid (with 60s buffer)
  if (new Date() < new Date(tokens.expires_at)) {
    return tokens;
  }

  console.log(`[HubSpot] Token expired for user ${userId}, refreshing...`);

  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
      refresh_token: tokens.refresh_token
    });

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      console.error('[HubSpot] Token refresh failed');
      deleteHubSpotTokens(userId);
      return null;
    }

    const data = await response.json();
    saveHubSpotTokens(userId, {
      ...data,
      portal_id: tokens.portal_id
    });

    return getHubSpotTokens(userId);
  } catch (error) {
    console.error('[HubSpot] Token refresh error:', error.message);
    return null;
  }
}

// Helper: Get valid access token for API calls (OAuth only - no fallback)
async function getValidHubSpotToken(userId) {
  // Only use OAuth tokens - each user must connect their own account
  const tokens = await refreshHubSpotTokenIfNeeded(userId);
  if (tokens) return tokens.access_token;

  // No fallback - user must connect via OAuth
  return null;
}

// =============================================================================
// HUBSPOT OAUTH ROUTES
// =============================================================================

// Start OAuth flow - redirects user to HubSpot login
app.get('/api/hubspot/auth/start', (req, res) => {
  const userId = getHubSpotUserId(req);
  
  if (!process.env.HUBSPOT_CLIENT_ID) {
    return res.status(500).send('HubSpot OAuth not configured');
  }

  // Create state parameter (includes userId for callback)
  const state = Buffer.from(JSON.stringify({ 
    userId, 
    timestamp: Date.now() 
  })).toString('base64');

  const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
  authUrl.searchParams.set('client_id', process.env.HUBSPOT_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3002/api/hubspot/callback');
  authUrl.searchParams.set('scope', process.env.HUBSPOT_SCOPES || 'crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read');
  authUrl.searchParams.set('state', state);

  console.log(`[HubSpot] Starting OAuth for user: ${userId}`);
  res.redirect(authUrl.toString());
});

// OAuth callback - exchanges code for tokens
app.get('/api/hubspot/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    // Decode state to get userId
    let userId = 'default-user';
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
      } catch (e) {
        console.warn('[HubSpot] Could not decode state:', e.message);
      }
    }

    // Exchange code for tokens
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
      redirect_uri: process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3002/api/hubspot/callback',
      code
    });

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[HubSpot] Token exchange failed:', error);
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Connection Failed</h2>
            <p>${error.message || 'Failed to connect to HubSpot'}</p>
            <p><a href="javascript:window.close()">Close this window</a></p>
          </body>
        </html>
      `);
    }

    const tokenData = await response.json();
    saveHubSpotTokens(userId, tokenData);
    
    console.log('[HubSpot] OAuth successful! Token saved for user:', userId);

    // Send success page that closes the popup
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>HubSpot Connected</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #ff7a59 0%, #ff957a 100%);
              min-height: 100vh;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .card {
              background: white;
              padding: 48px;
              border-radius: 16px;
              text-align: center;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 400px;
            }
            .emoji { font-size: 64px; margin-bottom: 16px; }
            h2 { color: #ff7a59; margin: 0 0 8px 0; }
            p { color: #666; margin: 0 0 24px 0; }
            .closing { color: #999; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="emoji">🎉</div>
            <h2>Connected to HubSpot!</h2>
            <p>Your HubSpot CRM is now connected.</p>
            <p class="closing">This window will close automatically...</p>
          </div>
          <script>
            // Close popup after short delay
            setTimeout(function() {
              window.close();
            }, 1500);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('[HubSpot] Callback error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Error</h2>
          <p>${error.message}</p>
          <p><a href="javascript:window.close()">Close this window</a></p>
        </body>
      </html>
    `);
  }
});

// Disconnect HubSpot
app.post('/api/hubspot/disconnect', (req, res) => {
  const userId = getHubSpotUserId(req);
  deleteHubSpotTokens(userId);
  res.json({ success: true, message: 'Disconnected from HubSpot' });
});

// Create a company in HubSpot CRM
app.post('/api/hubspot/companies/create', async (req, res) => {
  try {
    const userId = getHubSpotUserId(req);
    const token = await getValidHubSpotToken(userId);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Not connected to HubSpot',
        authUrl: '/api/hubspot/auth/start'
      });
    }

    const { name, domain, industry, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // First, check if company already exists by domain
    if (domain) {
      const searchResponse = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/companies/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'domain',
              operator: 'EQ',
              value: domain
            }]
          }],
          limit: 1
        })
      });

      const searchData = await searchResponse.json();
      
      if (searchData.results && searchData.results.length > 0) {
        // Company already exists
        return res.json({
          success: true,
          exists: true,
          message: 'Company already exists in HubSpot',
          company: searchData.results[0]
        });
      }
    }

    // Create new company - only use valid HubSpot company properties
    const companyProperties = {
      name: name
    };
    
    // Only add optional properties if they have values
    if (domain) companyProperties.domain = domain;
    if (description) companyProperties.description = description.substring(0, 65535); // HubSpot limit
    
    console.log('[HubSpot] Creating company with properties:', companyProperties);
    
    const createResponse = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/companies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: companyProperties
      })
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      console.error('[HubSpot] Create company error:', createData);
      return res.status(createResponse.status).json({
        error: createData.message || 'Failed to create company',
        category: createData.category
      });
    }

    console.log('[HubSpot] Company created:', createData.id, name);
    
    res.json({
      success: true,
      exists: false,
      message: 'Company created successfully',
      company: createData
    });

  } catch (error) {
    console.error('[HubSpot] Create company error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check HubSpot connection status
app.get('/api/hubspot/status', async (req, res) => {
  try {
    const userId = getHubSpotUserId(req);
    const token = await getValidHubSpotToken(userId);
    
    if (!token) {
      return res.json({ 
        connected: false, 
        error: 'Not connected',
        authUrl: '/api/hubspot/auth/start'
      });
    }

    const response = await fetch(`${HUBSPOT_BASE_URL}/account-info/v3/details`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({ 
        connected: true, 
        portalId: data.portalId,
        accountType: data.accountType,
        timeZone: data.timeZone,
        usingOAuth: hubspotTokenStore.has(userId)
      });
    } else {
      // Token might be invalid, clear it
      deleteHubSpotTokens(userId);
      return res.json({ connected: false, error: 'Invalid token', authUrl: '/api/hubspot/auth/start' });
    }
  } catch (error) {
    return res.json({ connected: false, error: error.message });
  }
});

// Get HubSpot contacts (OAuth-enabled)
app.get('/api/hubspot/contacts', async (req, res) => {
  try {
    const userId = getHubSpotUserId(req);
    const token = await getValidHubSpotToken(userId);
    if (!token) {
      return res.status(401).json({ error: 'Not connected to HubSpot', authUrl: '/api/hubspot/auth/start' });
    }

    const limit = req.query.limit || 20;
    const response = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts?limit=${limit}&properties=firstname,lastname,email,phone,company,jobtitle,lifecyclestage`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.message });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get HubSpot companies (OAuth-enabled)
app.get('/api/hubspot/companies', async (req, res) => {
  try {
    const userId = getHubSpotUserId(req);
    const token = await getValidHubSpotToken(userId);
    if (!token) {
      return res.status(401).json({ error: 'Not connected to HubSpot', authUrl: '/api/hubspot/auth/start' });
    }

    const limit = req.query.limit || 20;
    const response = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/companies?limit=${limit}&properties=name,domain,industry,numberofemployees,annualrevenue,city,state,country`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.message });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get HubSpot deals (OAuth-enabled)
app.get('/api/hubspot/deals', async (req, res) => {
  try {
    const userId = getHubSpotUserId(req);
    const token = await getValidHubSpotToken(userId);
    if (!token) {
      return res.status(401).json({ error: 'Not connected to HubSpot', authUrl: '/api/hubspot/auth/start' });
    }

    const limit = req.query.limit || 20;
    const response = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate,pipeline,hubspot_owner_id,createdate`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.message });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HubSpot object configurations - easily add more!
const HUBSPOT_OBJECTS = {
  contacts: {
    endpoint: '/crm/v3/objects/contacts',
    properties: 'firstname,lastname,email,phone,company,jobtitle,lifecyclestage',
    label: 'Contacts',
    icon: 'user'
  },
  companies: {
    endpoint: '/crm/v3/objects/companies',
    properties: 'name,domain,industry,numberofemployees,annualrevenue,city,state',
    label: 'Companies',
    icon: 'building'
  },
  deals: {
    endpoint: '/crm/v3/objects/deals',
    properties: 'dealname,amount,dealstage,closedate,pipeline,hs_priority',
    label: 'Deals',
    icon: 'currency',
    valueField: 'amount'
  },
  tickets: {
    endpoint: '/crm/v3/objects/tickets',
    properties: 'subject,content,hs_pipeline_stage,hs_ticket_priority,createdate,hs_ticket_category',
    label: 'Tickets',
    icon: 'ticket'
  },
  products: {
    endpoint: '/crm/v3/objects/products',
    properties: 'name,description,price,hs_sku,hs_cost_of_goods_sold',
    label: 'Products',
    icon: 'package',
    valueField: 'price'
  },
  tasks: {
    endpoint: '/crm/v3/objects/tasks',
    properties: 'hs_task_subject,hs_task_body,hs_task_status,hs_task_priority,hs_timestamp',
    label: 'Tasks',
    icon: 'checklist'
  },
  meetings: {
    endpoint: '/crm/v3/objects/meetings',
    properties: 'hs_meeting_title,hs_meeting_body,hs_meeting_start_time,hs_meeting_end_time',
    label: 'Meetings',
    icon: 'calendar'
  },
  calls: {
    endpoint: '/crm/v3/objects/calls',
    properties: 'hs_call_title,hs_call_body,hs_call_duration,hs_call_status,hs_timestamp',
    label: 'Calls',
    icon: 'phone'
  },
  emails: {
    endpoint: '/crm/v3/objects/emails',
    properties: 'hs_email_subject,hs_email_text,hs_email_status,hs_timestamp',
    label: 'Emails',
    icon: 'mail'
  },
  notes: {
    endpoint: '/crm/v3/objects/notes',
    properties: 'hs_note_body,hs_timestamp',
    label: 'Notes',
    icon: 'note'
  }
};

// Dynamic endpoint to get any HubSpot object type
app.get('/api/hubspot/objects/:objectType', async (req, res) => {
  try {
    const userId = getHubSpotUserId(req);
    const token = await getValidHubSpotToken(userId);
    const { objectType } = req.params;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Not connected',
        authUrl: '/api/hubspot/auth/start'
      });
    }

    const config = HUBSPOT_OBJECTS[objectType];
    if (!config) {
      return res.status(400).json({ 
        error: `Unknown object type: ${objectType}`,
        availableTypes: Object.keys(HUBSPOT_OBJECTS)
      });
    }

    const limit = req.query.limit || 20;
    const response = await fetch(
      `${HUBSPOT_BASE_URL}${config.endpoint}?limit=${limit}&properties=${config.properties}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.message || `Failed to fetch ${objectType}`,
        category: data.category
      });
    }

    res.json({
      objectType,
      label: config.label,
      results: data.results || [],
      total: data.total || data.results?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all HubSpot data (combined) - dynamically fetches configured objects
app.get('/api/hubspot/all', async (req, res) => {
  try {
    const userId = getHubSpotUserId(req);
    const token = await getValidHubSpotToken(userId);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Not connected',
        authUrl: '/api/hubspot/auth/start'
      });
    }

    const headers = { 'Authorization': `Bearer ${token}` };
    const limit = req.query.limit || 10;
    
    // Fetch objects specified in query, or default to contacts, companies, deals
    const requestedObjects = req.query.objects 
      ? req.query.objects.split(',') 
      : ['contacts', 'companies', 'deals'];

    // Filter to only valid object types
    const validObjects = requestedObjects.filter(obj => HUBSPOT_OBJECTS[obj]);

    // Fetch all requested objects in parallel
    const promises = validObjects.map(async (objectType) => {
      const config = HUBSPOT_OBJECTS[objectType];
      try {
        const response = await fetch(
          `${HUBSPOT_BASE_URL}${config.endpoint}?limit=${limit}&properties=${config.properties}`,
          { headers }
        );
        const data = await response.json();
        return {
          type: objectType,
          data: data.results || [],
          total: data.total || data.results?.length || 0,
          label: config.label,
          icon: config.icon,
          valueField: config.valueField
        };
      } catch (error) {
        console.error(`[HubSpot] Error fetching ${objectType}:`, error.message);
        return {
          type: objectType,
          data: [],
          total: 0,
          error: error.message
        };
      }
    });

    const results = await Promise.all(promises);

    // Build response dynamically
    const response = {
      objects: {},
      summary: {},
      metadata: {
        availableObjects: Object.keys(HUBSPOT_OBJECTS),
        requestedObjects: validObjects,
        fetchedAt: new Date().toISOString()
      }
    };

    results.forEach(result => {
      response.objects[result.type] = result.data;
      response.summary[`total${result.label}`] = result.total;
      
      // Calculate total value if valueField exists
      if (result.valueField && result.data.length > 0) {
        const totalValue = result.data.reduce((sum, item) => {
          return sum + (parseFloat(item.properties?.[result.valueField]) || 0);
        }, 0);
        response.summary[`total${result.label}Value`] = totalValue;
      }
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
        // GPT-5+ uses max_completion_tokens, older models use max_tokens
        ...(max_tokens && (model?.startsWith('gpt-5') || model?.startsWith('o1') || model?.startsWith('o3')
          ? { max_completion_tokens: Math.min(max_tokens, await getProviderLimit('openai', 'max_output_cap', 128000)) }
          : { max_tokens: Math.min(max_tokens, await getProviderLimit('openai', 'max_output_cap', 16384)) }
        )),
        // GPT-5, o1, o3 models don't support custom temperature - only default (1)
        ...(!(model?.startsWith('gpt-5') || model?.startsWith('o1') || model?.startsWith('o3')) && {
          temperature: temperature ?? null
        }),
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
      } catch (streamError) {
        console.error('[OpenAI Stream Error]', streamError.message);
        // Can't send JSON after streaming started, just end the connection
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream interrupted' });
        }
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[OpenAI Error]', error.message);
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process OpenAI request' });
    } else {
      // Headers already sent (streaming), just end the connection
      if (!res.writableEnded) {
        res.end();
      }
    }
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

    const anthropicLimit = await getProviderLimit('anthropic', 'max_output_cap', 8192);
    const requestBody = {
      model: model || 'claude-3-5-sonnet-20241022',
      messages,
      // Claude requires max_tokens - cap at provider limit
      max_tokens: Math.min(max_tokens || anthropicLimit, anthropicLimit),
      temperature: temperature ?? null,
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
      console.error('[Anthropic API Error]', response.status, error);
      return res.status(response.status).json({ 
        error: error.error?.message || `Anthropic request failed (${response.status})`,
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
      } catch (streamError) {
        console.error('[Anthropic Stream Error]', streamError.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream interrupted' });
        }
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Anthropic Error]', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process Anthropic request' });
    } else {
      if (!res.writableEnded) {
        res.end();
      }
    }
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
    const geminiLimit = await getProviderLimit('gemini', 'max_output_cap', 8192);
    const finalGenerationConfig = generationConfig || {
      temperature: null,
      // Gemini supports up to provider limit output tokens
      ...(max_tokens && { maxOutputTokens: Math.min(max_tokens, geminiLimit) })
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
      console.log('[Gemini] Starting stream for model:', modelName);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`[Gemini] Stream ended. Total chunks: ${chunkCount}`);
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
        }
        
        // Gemini returns the entire response as a JSON array
        // Parse the complete array and send each element as SSE
        try {
          // Remove whitespace and parse
          const trimmed = buffer.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const jsonArray = JSON.parse(trimmed);
            console.log(`[Gemini] Parsed ${jsonArray.length} response objects`);
            
            for (const item of jsonArray) {
              const text = item.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                chunkCount++;
                console.log(`[Gemini] Chunk ${chunkCount}: ${text.substring(0, 50)}...`);
                // Send as SSE format for consistent client parsing
                res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`);
                if (res.flush) res.flush();
              }
            }
          } else {
            console.error('[Gemini] Response is not a JSON array:', trimmed.substring(0, 200));
          }
        } catch (parseErr) {
          console.error('[Gemini] Failed to parse response:', parseErr.message);
          console.error('[Gemini] Buffer:', buffer.substring(0, 500));
        }
        
        res.write('data: [DONE]\n\n');
        console.log('[Gemini] Sent [DONE] signal');
      } catch (streamError) {
        console.error('[Gemini Stream Error]', streamError.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream interrupted' });
        }
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Gemini Error]', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process Gemini request' });
    } else {
      if (!res.writableEnded) {
        res.end();
      }
    }
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
        // Mistral supports up to provider limit output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, await getProviderLimit('mistral', 'max_output_cap', 32768)) }),
        temperature: temperature ?? null,
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
      } catch (streamError) {
        console.error('[Mistral Stream Error]', streamError.message);
        if (!res.headersSent) res.status(500).json({ error: 'Stream interrupted' });
      } finally {
        if (!res.writableEnded) res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Mistral Error]', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process Mistral request' });
    } else if (!res.writableEnded) {
      res.end();
    }
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
        // Perplexity supports up to provider limit output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, await getProviderLimit('perplexity', 'max_output_cap', 4096)) }),
        temperature: temperature ?? null,
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
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process Perplexity request' });
    } else if (!res.writableEnded) {
      res.end();
    }
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
        // DeepSeek has strict limit from provider config
        max_tokens: Math.min(max_tokens || 8192, await getProviderLimit('deepseek', 'max_output_cap', 8192)),
        temperature: temperature ?? null,
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
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process DeepSeek request' });
    } else if (!res.writableEnded) {
      res.end();
    }
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
        // Groq supports up to provider limit output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, await getProviderLimit('groq', 'max_output_cap', 8192)) }),
        temperature: temperature ?? null,
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
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process Groq request' });
    } else if (!res.writableEnded) {
      res.end();
    }
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
        // xAI Grok supports up to provider limit output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, await getProviderLimit('xai', 'max_output_cap', 16384)) }),
        temperature: temperature ?? null,
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
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process xAI request' });
    } else if (!res.writableEnded) {
      res.end();
    }
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
        // Moonshot/Kimi supports up to provider limit output tokens
        ...(max_tokens && { max_tokens: Math.min(max_tokens, await getProviderLimit('kimi', 'max_output_cap', 8192)) }),
        temperature: temperature ?? null,
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
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process Kimi request' });
    } else if (!res.writableEnded) {
      res.end();
    }
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

// =============================================================================
// ONEMIND UNIFIED API - Execute All Enabled Engines in Parallel
// =============================================================================

// Helper: Get all enabled providers from database
// API access is controlled by ai_models.is_active, NOT provider_config.is_enabled
async function getEnabledProviders() {
  if (!supabase) {
    console.warn('[OneMind] Supabase not configured, using default providers');
    return [
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'mistral', model: 'mistral-large-latest' }
    ];
  }
  
  try {
    // Get active models from ai_models table (controls API access)
    const { data: activeModels, error: modelsError } = await supabase
      .from('ai_models')
      .select('provider, model_id, is_active')
      .eq('is_active', true);
    
    if (modelsError) throw modelsError;
    
    // Get provider settings (for default_model)
    const { data: providerSettings, error: providerError } = await supabase
      .from('provider_config')
      .select('provider, default_model');
    
    if (providerError) throw providerError;
    
    // Build map of provider -> default_model
    const providerDefaults = Object.fromEntries(
      (providerSettings || []).map(p => [p.provider, p.default_model])
    );
    
    // Get unique providers that have at least one active model
    const enabledProviders = [...new Set(activeModels.map(m => m.provider))];
    
    return enabledProviders.map(provider => ({
      provider,
      model: providerDefaults[provider] || activeModels.find(m => m.provider === provider)?.model_id
    }));
  } catch (err) {
    console.error('[OneMind] Failed to fetch enabled providers:', err.message);
    return [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'gemini', model: 'gemini-2.0-flash-exp' }
    ];
  }
}

// Helper: Call individual provider
async function callProvider(provider, model, prompt, maxTokens) {
  const startTime = Date.now();
  
  try {
    let response, content;
    
    switch (provider) {
      case 'openai': {
        const OpenAI = require('openai');
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        response = await client.chat.completions.create({
          model: model || 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: null
        });
        content = response.choices[0]?.message?.content || '';
        break;
      }
      
      case 'anthropic': {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        response = await client.messages.create({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }]
        });
        content = response.content[0]?.text || '';
        break;
      }
      
      case 'gemini': {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-2.0-flash-exp' });
        response = await geminiModel.generateContent(prompt);
        content = response.response.text();
        break;
      }
      
      case 'mistral': {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 min timeout
        
        try {
          const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
              model: model || 'mistral-large-latest',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: maxTokens,
              temperature: null
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const data = await res.json();
          content = data.choices?.[0]?.message?.content || '';
        } finally {
          clearTimeout(timeoutId);
        }
        break;
      }
      
      case 'perplexity': {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
          },
          body: JSON.stringify({
            model: model || 'llama-3.1-sonar-large-128k-online',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: null
          })
        });
        const data = await res.json();
        content = data.choices?.[0]?.message?.content || '';
        break;
      }
      
      case 'deepseek': {
        console.log(`[DeepSeek] Calling API with prompt length: ${prompt.length}, max_tokens: ${maxTokens}`);
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: model || 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: await getProviderTemperature('deepseek')
          })
        });
        const data = await res.json();
        console.log(`[DeepSeek] Response status: ${res.status}, has choices: ${!!data.choices}, error: ${data.error?.message || 'none'}`);
        if (data.error) {
          console.error(`[DeepSeek] API Error:`, data.error);
          throw new Error(data.error.message || 'DeepSeek API error');
        }
        content = data.choices?.[0]?.message?.content || '';
        console.log(`[DeepSeek] Content length: ${content.length}`);
        break;
      }
      
      case 'groq': {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: model || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: null
          })
        });
        const data = await res.json();
        content = data.choices?.[0]?.message?.content || '';
        break;
      }
      
      case 'xai': {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`
          },
          body: JSON.stringify({
            model: model || 'grok-beta',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: null
          })
        });
        const data = await res.json();
        content = data.choices?.[0]?.message?.content || '';
        break;
      }
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    const latency = Date.now() - startTime;
    const tokens = Math.ceil(content.length / 4); // Rough estimate
    
    return {
      provider,
      model,
      content,
      tokens,
      latency_ms: latency,
      status: 'success'
    };
    
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      provider,
      model,
      content: null,
      error: error.message,
      latency_ms: latency,
      status: 'error'
    };
  }
}

// POST /api/onemind - Unified API endpoint
app.post('/api/onemind', async (req, res) => {
  const requestId = `onemind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`[OneMind] Request ${requestId} started`);
  
  try {
    const { 
      prompt, 
      max_tokens = 4096, 
      engines = null,  // Optional: specific engines to use
      timeout = 600000  // 600 second (10 minute) timeout per engine for large prompts
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    
    // Get enabled providers (from request or database)
    let providers;
    if (engines && Array.isArray(engines) && engines.length > 0) {
      // Use specified engines - validate each one against whitelist
      const requestedProviders = engines.map(e => typeof e === 'string' ? { provider: e, model: null } : e);
      
      // Filter out disabled providers/models
      const validatedProviders = [];
      const blockedProviders = [];
      
      for (const p of requestedProviders) {
        const validation = await validateModelAccess(p.provider, p.model);
        if (validation.allowed) {
          validatedProviders.push(p);
        } else {
          blockedProviders.push({ ...p, reason: validation.reason });
        }
      }
      
      if (blockedProviders.length > 0) {
        console.log(`[OneMind] Blocked providers/models:`, blockedProviders);
      }
      
      if (validatedProviders.length === 0) {
        return res.status(403).json({ 
          error: 'All requested providers/models are disabled',
          blocked: blockedProviders
        });
      }
      
      providers = validatedProviders;
    } else {
      // Get all enabled from database (already filtered by is_enabled)
      providers = await getEnabledProviders();
    }
    
    console.log(`[OneMind] Executing ${providers.length} engines in parallel:`, providers.map(p => p.provider));
    
    // Execute all providers in parallel with timeout
    const results = await Promise.allSettled(
      providers.map(p => 
        Promise.race([
          callProvider(p.provider, p.model, prompt, max_tokens),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ])
      )
    );
    
    // Process results
    const responses = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          provider: providers[index].provider,
          model: providers[index].model,
          content: null,
          error: result.reason?.message || 'Unknown error',
          latency_ms: timeout,
          status: 'error'
        };
      }
    });
    
    const successful = responses.filter(r => r.status === 'success').length;
    const failed = responses.filter(r => r.status === 'error').length;
    const totalLatency = Date.now() - startTime;
    
    console.log(`[OneMind] Request ${requestId} completed: ${successful} success, ${failed} failed, ${totalLatency}ms total`);
    
    res.json({
      id: requestId,
      created: Math.floor(Date.now() / 1000),
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      responses,
      meta: {
        total_engines: providers.length,
        successful,
        failed,
        total_latency_ms: totalLatency
      }
    });
    
  } catch (error) {
    console.error(`[OneMind] Request ${requestId} error:`, error.message);
    res.status(500).json({ 
      error: 'OneMind API error', 
      message: error.message,
      id: requestId
    });
  }
});

// GET /api/onemind/providers - List available providers and models from database
app.get('/api/onemind/providers', async (req, res) => {
  try {
    // Refresh caches to get latest from database
    await refreshCaches();
    
    // Debug logging
    console.log('[Providers API] providerCache keys:', providerCache ? Object.keys(providerCache) : 'null');
    console.log('[Providers API] modelCache length:', modelCache ? modelCache.length : 'null');
    if (modelCache && modelCache.length > 0) {
      console.log('[Providers API] First model:', JSON.stringify(modelCache[0]));
      console.log('[Providers API] Active models:', modelCache.filter(m => m.is_active === true).length);
    }
    
    // API access is controlled by ai_models.is_active, NOT provider_config.is_enabled
    // provider_config.is_enabled controls main app visibility only
    
    // First, determine which providers have at least one active model
    const providersWithActiveModels = new Set();
    if (modelCache && modelCache.length > 0) {
      for (const model of modelCache) {
        if (model.is_active) {
          providersWithActiveModels.add(model.provider);
        }
      }
    }
    console.log('[Providers API] Providers with active models:', [...providersWithActiveModels]);
    
    // Get enabled providers (those with at least one active model)
    const enabledProviders = [];
    const disabledProviders = [];
    
    if (providerCache && Object.keys(providerCache).length > 0) {
      for (const [provider, config] of Object.entries(providerCache)) {
        // Provider is enabled for API if it has at least one active model
        if (providersWithActiveModels.has(provider)) {
          enabledProviders.push({
            provider,
            default_model: config.default_model,
            max_output_cap: config.max_output_cap,
            timeout_seconds: config.timeout_seconds
          });
        } else {
          disabledProviders.push(provider);
        }
      }
    }
    
    // Get enabled models from database
    // Model is enabled if: model.is_active === true
    const enabledModels = [];
    const disabledModels = [];
    
    // Build set of enabled provider names for quick lookup
    const enabledProviderNames = new Set(enabledProviders.map(p => p.provider));
    
    // Build map of provider default models for sorting
    const providerDefaultModels = {};
    for (const p of enabledProviders) {
      if (p.default_model) {
        providerDefaultModels[p.provider] = p.default_model;
      }
    }
    
    if (modelCache && modelCache.length > 0) {
      for (const model of modelCache) {
        // Model is enabled if is_active is true (provider check already done above)
        const providerEnabled = enabledProviderNames.has(model.provider);
        
        if (model.is_active && providerEnabled) {
          // Check if this is the provider's default model
          const isDefault = providerDefaultModels[model.provider] === model.model_id;
          enabledModels.push({
            provider: model.provider,
            model_id: model.model_id,
            display_name: model.display_name || model.model_id,
            max_output_tokens: model.max_output_tokens,
            context_window: model.context_window,
            input_price_per_million: model.input_price_per_million,
            output_price_per_million: model.output_price_per_million,
            is_default: isDefault
          });
        } else {
          disabledModels.push({
            provider: model.provider,
            model_id: model.model_id,
            reason: !model.is_active ? 'model_disabled' : 'provider_disabled'
          });
        }
      }
    }
    
    // Sort enabled models: default models first, then by provider priority
    enabledModels.sort((a, b) => {
      // Default models come first
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      // Then sort by provider name
      return a.provider.localeCompare(b.provider);
    });
    
    // Check which providers have API keys configured
    const apiKeyStatus = {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GOOGLE_AI_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
      perplexity: !!process.env.PERPLEXITY_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      xai: !!process.env.XAI_API_KEY,
      kimi: !!process.env.KIMI_API_KEY
    };
    
    res.json({
      // Database connection status - true if supabase is initialized and caches have been populated
      database_connected: !!supabase && providerCache !== null && modelCache !== null,
      cache_age_seconds: Math.floor((Date.now() - cacheTime) / 1000),
      
      // Providers from database
      providers: {
        enabled: enabledProviders,
        disabled: disabledProviders,
        total_enabled: enabledProviders.length,
        total_disabled: disabledProviders.length
      },
      
      // Models from database
      models: {
        enabled: enabledModels,
        disabled_count: disabledModels.length,
        total_enabled: enabledModels.length
      },
      
      // API key status (which providers have keys configured)
      api_keys_configured: apiKeyStatus,
      
      // Summary
      summary: {
        total_providers: enabledProviders.length + disabledProviders.length,
        active_providers: enabledProviders.length,
        total_models: enabledModels.length + disabledModels.length,
        active_models: enabledModels.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// SSE STREAMING ENDPOINT - Solves timeout issues for large prompts
// =============================================================================

// Helper function to get provider API config for streaming
// Applies provider-specific token limits from database config
function getProviderStreamConfig(provider, model, prompt, maxTokens, providerConfig, attachments = []) {
  // HARD LIMITS - these are the actual API constraints that cannot be exceeded
  // These are the TRUE maximum output tokens each provider API accepts
  // Source: Official API documentation as of Dec 2024
  // ⚠️ DeepSeek API confirmed: "the valid range of max_tokens is [1, 8192]"
  const HARD_TOKEN_LIMITS = {
    openai: 128000,     // GPT-5.1 supports up to 128K output (upgraded from 16K)
    anthropic: 8192,    // Claude 3.5 supports up to 8K output
    gemini: 8192,       // Gemini 1.5 supports up to 8K output
    deepseek: 8192,     // DeepSeek API ERROR confirms: max is 8192 (NOT 65536!)
    mistral: 32768,     // Mistral Large supports up to 32K output
    groq: 8000,         // Groq max is 8000
    perplexity: 4096,   // Perplexity max is 4K
    xai: 131072,        // Grok supports up to 128K output
    kimi: 8192          // Kimi max is 8K
  };
  
  // Get the provider's max_output_cap from database
  const dbLimit = providerConfig?.max_output_cap || maxTokens;
  // Apply hard limit as final safety check
  let hardLimit = HARD_TOKEN_LIMITS[provider] || 4096;
  
  // Additional limit for OpenAI reasoning models - they often have lower max_completion_tokens
  if (provider === 'openai' && model && (model.includes('gpt-5') || model.includes('o1') || model.includes('o3'))) {
    hardLimit = Math.min(hardLimit, 64000); // Conservative limit for reasoning models
  }
  
  const limitedTokens = Math.min(maxTokens, dbLimit, hardLimit);
  
  console.log(`[Token Limit] Provider: ${provider}, Requested: ${maxTokens}, DB: ${dbLimit}, Hard: ${hardLimit}, Final: ${limitedTokens}`);
  
  // Helper function to format attachments for OpenAI/Mistral/Groq (vision models)
  const formatOpenAIAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return [];
    
    return attachments.map(att => {
      const isImage = att.type.startsWith('image/');
      const isPdf = att.type === 'application/pdf';
      
      if (isImage) {
        return {
          type: 'image_url',
          image_url: {
            url: att.content, // Already in data:image/... format from base64
            detail: 'high'
          }
        };
      } else if (isPdf || att.type.startsWith('text/')) {
        // For PDFs and text files, include as text content
        return {
          type: 'text',
          text: `[Attachment: ${att.name}]\n${att.content.substring(0, 5000)}...`
        };
      }
      return null;
    }).filter(Boolean);
  };
  
  // Helper function to format attachments for Anthropic (Claude)
  const formatAnthropicAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return [];
    
    return attachments.map(att => {
      const isImage = att.type.startsWith('image/');
      
      if (isImage) {
        // Extract base64 from data URL
        const base64Data = att.content.split(',')[1] || att.content;
        const mediaType = att.type;
        
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data
          }
        };
      } else {
        // For non-image files, include as text
        return {
          type: 'text',
          text: `[Attachment: ${att.name} (${att.type})]\n${att.content.substring(0, 5000)}...`
        };
      }
    }).filter(Boolean);
  };
  
  // Helper function to format attachments for Gemini
  const formatGeminiAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return [];
    
    return attachments.map(att => {
      const isImage = att.type.startsWith('image/');
      
      if (isImage) {
        const base64Data = att.content.split(',')[1] || att.content;
        return {
          inlineData: {
            mimeType: att.type,
            data: base64Data
          }
        };
      } else {
        return {
          text: `[Attachment: ${att.name}]\n${att.content.substring(0, 5000)}...`
        };
      }
    }).filter(Boolean);
  };
  
  const configs = {
    openai: {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: {
        model: model || 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...formatOpenAIAttachments(attachments)
          ]
        }],
        // Use max_completion_tokens for reasoning models (GPT-5, o1, o3 series)
        ...(model && (model.includes('gpt-5') || model.includes('o1') || model.includes('o3')) 
          ? { max_completion_tokens: limitedTokens }
          : { max_tokens: limitedTokens }
        ),
        stream: true,
        // Add reasoning effort for GPT-5.1 models
        ...(model && model.includes('gpt-5.1') && { reasoning_effort: 'medium' })
      }
    },
    anthropic: {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: {
        model: model || 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...formatAnthropicAttachments(attachments)
          ]
        }],
        max_tokens: limitedTokens,
        stream: true
      }
    },
    gemini: {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:streamGenerateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        contents: [{
          parts: [
            { text: prompt },
            ...formatGeminiAttachments(attachments)
          ]
        }],
        generationConfig: { maxOutputTokens: limitedTokens }
      },
      isGemini: true
    },
    mistral: {
      url: 'https://api.mistral.ai/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: {
        model: model || 'mistral-large-latest',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...formatOpenAIAttachments(attachments)
          ]
        }],
        max_tokens: limitedTokens,
        stream: true
      }
    },
    deepseek: {
      url: 'https://api.deepseek.com/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: {
        model: model || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: limitedTokens,
        stream: true
        // Note: DeepSeek doesn't support vision/attachments yet
      }
    },
    groq: {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: {
        model: model || 'llama-3.1-70b-versatile',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...formatOpenAIAttachments(attachments)
          ]
        }],
        max_tokens: Math.min(limitedTokens, 8000), // Groq has lower limits
        stream: true
      }
    },
    perplexity: {
      url: 'https://api.perplexity.ai/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: {
        model: model || 'llama-3.1-sonar-large-128k-online',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: limitedTokens,
        stream: true
        // Note: Perplexity doesn't support attachments in the same way
      }
    },
    xai: {
      url: 'https://api.x.ai/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: {
        model: model || 'grok-beta',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...formatOpenAIAttachments(attachments)
          ]
        }],
        max_tokens: maxTokens,
        stream: true
      }
    }
  };
  
  return configs[provider] || null;
}

// POST /api/onemind/stream - SSE streaming endpoint for all providers
app.post('/api/onemind/stream', async (req, res) => {
  const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`[OneMind Stream] Request ${requestId} started`);
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();
  
  try {
    const { 
      prompt, 
      max_tokens = 128000,
      model,
      provider,
      attachments = []
    } = req.body;
    
    if (!prompt) {
      res.write(`data: ${JSON.stringify({ error: 'prompt is required' })}\n\n`);
      res.end();
      return;
    }
    
    console.log(`[OneMind Stream] Request received with ${attachments.length} attachment(s)`);
    console.log(`[OneMind Stream] Frontend sent - Model: ${model}, Provider: ${provider}`);
    
    // IMPORTANT: Use the model/provider sent by frontend if provided
    let selectedProvider = provider;
    let selectedModel = model;
    
    // Helper function to detect provider from model name
    const detectProviderFromModel = (modelName) => {
      if (!modelName) return null;
      if (modelName.includes('mistral')) return 'mistral';
      if (modelName.includes('gpt') || modelName.includes('o1') || modelName.includes('o3')) return 'openai';
      if (modelName.includes('claude')) return 'anthropic';
      if (modelName.includes('gemini')) return 'gemini';
      if (modelName.includes('deepseek')) return 'deepseek';
      if (modelName.includes('llama') || modelName.includes('mixtral')) return 'groq';
      if (modelName.includes('grok')) return 'xai';
      if (modelName.includes('sonar')) return 'perplexity';
      return null;
    };
    
    // If model is provided but provider is missing, detect provider from model name
    if (selectedModel && !selectedProvider) {
      const detectedProvider = detectProviderFromModel(selectedModel);
      if (detectedProvider) {
        selectedProvider = detectedProvider;
        console.log(`[OneMind Stream] Detected provider from model name: ${selectedProvider}`);
      }
    }
    
    // If BOTH model and provider are missing, fall back to database selection
    if (!selectedProvider || !selectedModel) {
      console.log(`[OneMind Stream] No model specified by frontend, auto-selecting from database...`);
      await refreshCaches();
      if (modelCache && modelCache.length > 0) {
        // Find first ENABLED model where BOTH model is active AND provider is enabled
        let skippedCount = 0;
        const enabledModel = modelCache.find(m => {
          if (m.is_active !== true) {
            skippedCount++;
            return false;
          }
          
          // API access is controlled by ai_models.is_active only
          // provider_config.is_enabled controls main app visibility, not API access
          // Since we already checked m.is_active above, no additional provider check needed
          
          return true;
        });
        
        if (enabledModel) {
          selectedProvider = enabledModel.provider;
          selectedModel = enabledModel.model_id;
          console.log(`[OneMind Stream] Auto-selected enabled model: ${selectedProvider}/${selectedModel} (skipped ${skippedCount} models)`);
        } else {
          console.log(`[OneMind Stream] No enabled models found (checked ${modelCache.length} models, skipped ${skippedCount})`);
        }
      }
      
      // Fallback to deepseek if no enabled model found
      if (!selectedProvider) {
        selectedProvider = 'deepseek';
        selectedModel = 'deepseek-chat';
        console.log(`[OneMind Stream] Fallback to default: ${selectedProvider}/${selectedModel}`);
      }
    } else {
      console.log(`[OneMind Stream] Using frontend-specified model: ${selectedProvider}/${selectedModel}`);
    }
    
    // Validate model access against whitelist
    const validation = await validateModelAccess(selectedProvider, selectedModel);
    if (!validation.allowed) {
      console.log(`[OneMind Stream] Blocked: ${validation.reason}`);
      res.write(`data: ${JSON.stringify({ error: validation.reason, blocked: true })}\n\n`);
      res.end();
      return;
    }
    
    console.log(`[OneMind Stream] Calling ${selectedProvider}/${selectedModel} with ${prompt.length} chars, max_tokens: ${max_tokens}, attachments: ${attachments.length}`);
    
    // Get provider config from cache for token limit enforcement
    const providerConfig = providerCache?.[selectedProvider];
    
    // Get provider-specific config with token limits applied (including attachments)
    const config = getProviderStreamConfig(selectedProvider, selectedModel, prompt, max_tokens, providerConfig, attachments);
    if (!config) {
      res.write(`data: ${JSON.stringify({ error: `Unsupported provider: ${selectedProvider}` })}\n\n`);
      res.end();
      return;
    }
    
    // Log the actual token limit being used
    const actualTokenLimit = config.body.max_tokens || config.body.generationConfig?.maxOutputTokens;
    console.log(`[OneMind Stream] Token limit enforced: ${actualTokenLimit} (provider cap: ${providerConfig?.max_output_cap || 'unlimited'})`);
    
    // Call provider API with streaming enabled
    const response = await fetch(config.url, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(config.body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OneMind Stream] ${selectedProvider} API error: ${response.status}`);
      console.error(`[OneMind Stream] Request body:`, JSON.stringify(config.body, null, 2));
      console.error(`[OneMind Stream] Response:`, errorText);
      
      // Try to parse error as JSON for better details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.message || errorJson.error || errorText;
        console.error(`[OneMind Stream] Parsed error:`, errorDetails);
      } catch (e) {
        // Not JSON, use raw text
      }
      
      res.write(`data: ${JSON.stringify({ 
        error: `${selectedProvider} API error: ${response.status}`, 
        details: errorDetails,
        request: { provider: selectedProvider, model: selectedModel, max_tokens: config.body.max_tokens }
      })}\n\n`);
      res.end();
      return;
    }
    
    console.log(`[OneMind Stream] ${selectedProvider} response received, streaming chunks...`);
    
    // Stream the response chunks to the client
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let totalContent = '';
    let chunkCount = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log(`[OneMind Stream] Stream complete. Total chunks: ${chunkCount}, Content length: ${totalContent.length}`);
        res.write(`data: ${JSON.stringify({ done: true, totalLength: totalContent.length, requestId })}\n\n`);
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      
      // Parse SSE data from Mistral
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Remove 'data: ' prefix
          
          if (data === '[DONE]') {
            continue;
          }
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            const finishReason = parsed.choices?.[0]?.finish_reason;
            
            // Log finish_reason when stream ends to diagnose truncation
            if (finishReason) {
              console.log(`[OneMind Stream] Finish reason: ${finishReason}`);
              res.write(`data: ${JSON.stringify({ finishReason })}\n\n`);
            }
            
            if (content) {
              totalContent += content;
              chunkCount++;
              
              // Send chunk to client
              res.write(`data: ${JSON.stringify({ chunk: content, index: chunkCount })}\n\n`);
              
              // Log progress every 100 chunks
              if (chunkCount % 100 === 0) {
                console.log(`[OneMind Stream] Progress: ${chunkCount} chunks, ${totalContent.length} chars`);
              }
            }
          } catch (parseError) {
            // Skip unparseable chunks (sometimes Mistral sends partial data)
          }
        }
      }
    }
    
    const totalLatency = Date.now() - startTime;
    console.log(`[OneMind Stream] Request ${requestId} completed in ${totalLatency}ms`);
    
  } catch (error) {
    console.error(`[OneMind Stream] Request ${requestId} error:`, error.message);
    res.write(`data: ${JSON.stringify({ error: error.message, requestId })}\n\n`);
  } finally {
    res.end();
  }
});

// =============================================================================
// 404 HANDLER
// =============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// =============================================================================
// PROCESS ERROR HANDLERS - PREVENT CRASHES
// =============================================================================

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('');
  console.error('╔═══════════════════════════════════════════════════════════╗');
  console.error('║   ⚠️  UNCAUGHT EXCEPTION - SERVER CONTINUING              ║');
  console.error('╚═══════════════════════════════════════════════════════════╝');
  console.error('[UNCAUGHT EXCEPTION]', error.message);
  console.error('Stack:', error.stack);
  console.error('Server will continue running...');
  console.error('');
  // Don't exit - keep server running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('');
  console.error('╔═══════════════════════════════════════════════════════════╗');
  console.error('║   ⚠️  UNHANDLED REJECTION - SERVER CONTINUING             ║');
  console.error('╚═══════════════════════════════════════════════════════════╝');
  console.error('[UNHANDLED REJECTION]', reason);
  console.error('Promise:', promise);
  console.error('Server will continue running...');
  console.error('');
  // Don't exit - keep server running
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   🛑 SIGTERM received - Shutting down gracefully          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  process.exit(0);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   🛑 SIGINT received - Shutting down gracefully           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  process.exit(0);
});

// ============================================================================
// FEEDBACK SYSTEM ENDPOINTS
// ============================================================================

// GET /api/feedback/questions - Fetch feedback questions
app.get('/api/feedback/questions', async (req, res) => {
  try {
    if (!supabase) {
      console.error('[Feedback] Supabase not connected');
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { data, error } = await supabase
      .from('feedback_questions')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[Feedback] Supabase error:', error);
      throw error;
    }

    console.log('[Feedback] Questions fetched:', data?.length || 0, 'questions');
    res.json({ success: true, questions: data || [] });
  } catch (err) {
    console.error('[Feedback] Error fetching questions:', err.message);
    res.status(500).json({ error: 'Failed to fetch feedback questions', details: err.message });
  }
});

// POST /api/feedback/submit - Submit feedback
app.post('/api/feedback/submit', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { rating, reasonForRating, whatLiked, whatImprove, sessionId, aiProvider, aiModel, responseLength } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Sanitize text inputs
    const sanitizeText = (text) => {
      if (!text) return null;
      return text.substring(0, 5000).trim();
    };

    const { data, error } = await supabase
      .from('feedback_submissions')
      .insert([
        {
          user_id: userId,
          session_id: sessionId || null,
          rating,
          reason_for_rating: sanitizeText(reasonForRating),
          what_liked: sanitizeText(whatLiked),
          what_improve: sanitizeText(whatImprove),
          ai_provider: aiProvider || null,
          ai_model: aiModel || null,
          response_length: responseLength || null
        }
      ])
      .select('id');

    if (error) throw error;

    console.log(`[Feedback] Submission saved - User: ${userId}, Rating: ${rating}`);
    res.json({ success: true, feedbackId: data?.[0]?.id });
  } catch (err) {
    console.error('[Feedback] Error submitting feedback:', err.message);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /api/feedback/list - Get all feedback (admin only)
app.get('/api/feedback/list', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { ratingFilter, startDate, endDate, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('feedback_submissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ratingFilter) {
      query = query.eq('rating', parseInt(ratingFilter));
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ success: true, feedback: data || [], total: count || 0 });
  } catch (err) {
    console.error('[Feedback] Error fetching feedback list:', err.message);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// PUT /api/feedback/questions - Update feedback questions (admin only)
app.put('/api/feedback/questions', async (req, res) => {
  try {
    if (!supabase) {
      console.error('[Feedback] Supabase not connected');
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Invalid questions format' });
    }

    console.log('[Feedback] Saving', questions.length, 'questions');

    // Separate new questions (with temp IDs) from existing ones
    const newQuestions = questions.filter(q => q.id && q.id.startsWith('temp-'));
    const existingQuestions = questions.filter(q => !q.id || !q.id.startsWith('temp-'));

    // Update existing questions
    for (const q of existingQuestions) {
      const updateData = {
        question_text: q.questionText,
        question_type: q.questionType,
        is_required: q.isRequired || false,
        display_order: q.displayOrder,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('feedback_questions')
        .update(updateData)
        .eq('question_number', q.questionNumber);

      if (error) {
        console.error('[Feedback] Error updating question', q.questionNumber, ':', error);
        throw error;
      }
    }

    // Insert new questions
    if (newQuestions.length > 0) {
      const insertData = newQuestions.map((q) => ({
        question_number: q.questionNumber,
        question_text: q.questionText,
        question_type: q.questionType,
        is_required: q.isRequired || false,
        display_order: q.displayOrder
      }));

      const { error } = await supabase
        .from('feedback_questions')
        .insert(insertData);

      if (error) {
        console.error('[Feedback] Error inserting new questions:', error);
        throw error;
      }
    }

    console.log('[Feedback] Questions saved successfully - Updated:', existingQuestions.length, 'New:', newQuestions.length);
    res.json({ success: true, message: 'Feedback questions updated' });
  } catch (err) {
    console.error('[Feedback] Error updating questions:', err.message);
    res.status(500).json({ error: 'Failed to update feedback questions', details: err.message });
  }
});

// DELETE /api/feedback/:id - Delete feedback (admin only)
app.delete('/api/feedback/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Check if user is admin
    const isAdmin = req.user?.raw_user_meta_data?.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('feedback_submissions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`[Feedback] Submission deleted - ID: ${id}`);
    res.json({ success: true, message: 'Feedback deleted' });
  } catch (err) {
    console.error('[Feedback] Error deleting feedback:', err.message);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// =============================================================================
// START SERVER
// =============================================================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   🚀 OneMindAI Proxy Server                               ║');
  console.log(`║   📡 Running on port ${PORT}                               ║`);
  console.log('║   🛡️  Crash Protection: ENABLED                           ║');
  console.log('║   ⏱️  Server Timeout: 10 minutes                          ║');
  console.log('║                                                           ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║   Endpoints:                                              ║');
  console.log('║   • GET  /health            - Server status               ║');
  console.log('║   • POST /api/onemind       - 🧠 UNIFIED API (all engines)║');
  console.log('║   • POST /api/onemind/stream - 🌊 SSE Streaming endpoint  ║');
  console.log('║   • GET  /api/onemind/providers - List enabled providers  ║');
  console.log('║   • POST /api/openai        - OpenAI proxy                ║');
  console.log('║   • POST /api/anthropic     - Claude proxy                ║');
  console.log('║   • POST /api/gemini        - Gemini proxy                ║');
  console.log('║   • POST /api/mistral       - Mistral proxy               ║');
  console.log('║   • POST /api/perplexity    - Perplexity proxy            ║');
  console.log('║   • POST /api/deepseek      - DeepSeek proxy              ║');
  console.log('║   • POST /api/groq          - Groq proxy                  ║');
  console.log('║   • POST /api/xai           - xAI/Grok proxy              ║');
  console.log('║   • POST /api/kimi          - Kimi/Moonshot proxy         ║');
  console.log('║   • GET  /api/hubspot/*     - HubSpot CRM integration     ║');
  console.log('║   • POST /api/admin/test-provider - Test provider conn    ║');
  console.log('║   • GET  /api/admin/config  - Get API config from DB      ║');
  console.log('║   • GET  /api/feedback/questions - Fetch feedback Qs      ║');
  console.log('║   • POST /api/feedback/submit - Submit user feedback      ║');
  console.log('║   • GET  /api/feedback/list - Get all feedback (admin)    ║');
  console.log('║   • PUT  /api/feedback/questions - Edit Qs (admin)        ║');
  console.log('║   • DELETE /api/feedback/:id - Delete feedback (admin)    ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
});

// Configure server timeouts for Railway - prevents premature connection drops
server.setTimeout(600000);        // 10 minutes - max request duration
server.keepAliveTimeout = 610000; // 10 min + 10s - keep connection alive
server.headersTimeout = 620000;   // 10 min + 20s - headers timeout

// Handle server errors
server.on('error', (error) => {
  console.error('');
  console.error('╔═══════════════════════════════════════════════════════════╗');
  console.error('║   ❌ SERVER ERROR                                         ║');
  console.error('╚═══════════════════════════════════════════════════════════╝');
  console.error('[SERVER ERROR]', error.message);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free the port or use a different one.`);
    process.exit(1);
  } else {
    console.error('Server will attempt to continue...');
  }
  console.error('');
});

module.exports = app;
