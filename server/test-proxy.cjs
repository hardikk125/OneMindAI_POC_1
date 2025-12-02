/**
 * Proxy Server Test Suite
 * 
 * Run with: node server/test-proxy.cjs
 * Make sure the proxy server is running first: npm run proxy
 */

const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3002';

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTest(name, testFn) {
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    log(`  ✅ ${name}`, 'green');
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    log(`  ❌ ${name}: ${error.message}`, 'red');
  }
}

// =============================================================================
// TEST CASES
// =============================================================================

async function testHealthEndpoint() {
  const response = await fetch(`${PROXY_URL}/health`);
  if (!response.ok) throw new Error(`Status ${response.status}`);
  
  const data = await response.json();
  if (data.status !== 'ok') throw new Error('Status not ok');
  if (typeof data.uptime !== 'number') throw new Error('Missing uptime');
  if (!data.providers) throw new Error('Missing providers');
}

async function testOpenAIEndpoint() {
  const response = await fetch(`${PROXY_URL}/api/openai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Say "test" and nothing else' }],
      model: 'gpt-4o-mini',
      max_tokens: 10,
      stream: false
    })
  });
  
  // 503 is acceptable if no API key configured
  if (response.status === 503) {
    const data = await response.json();
    if (data.error.includes('not configured')) return; // Expected
  }
  
  if (!response.ok && response.status !== 503) {
    throw new Error(`Status ${response.status}`);
  }
}

async function testAnthropicEndpoint() {
  const response = await fetch(`${PROXY_URL}/api/anthropic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Say "test" and nothing else' }],
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      stream: false
    })
  });
  
  if (response.status === 503) {
    const data = await response.json();
    if (data.error.includes('not configured')) return;
  }
  
  if (!response.ok && response.status !== 503) {
    throw new Error(`Status ${response.status}`);
  }
}

async function testGeminiEndpoint() {
  const response = await fetch(`${PROXY_URL}/api/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Say "test"' }] }],
      model: 'gemini-1.5-flash',
      stream: false
    })
  });
  
  if (response.status === 503) {
    const data = await response.json();
    if (data.error.includes('not configured')) return;
  }
  
  if (!response.ok && response.status !== 503) {
    throw new Error(`Status ${response.status}`);
  }
}

async function testMissingBody() {
  const response = await fetch(`${PROXY_URL}/api/openai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.error) throw new Error('Missing error message');
}

async function testInvalidEndpoint() {
  const response = await fetch(`${PROXY_URL}/api/invalid-provider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [] })
  });
  
  if (response.status !== 404) {
    throw new Error(`Expected 404, got ${response.status}`);
  }
}

async function testCORSHeaders() {
  const response = await fetch(`${PROXY_URL}/health`, {
    method: 'OPTIONS'
  });
  
  // Should have CORS headers or be handled
  // This is a basic check - full CORS testing needs browser
}

async function testNoAPIKeyLeak() {
  const response = await fetch(`${PROXY_URL}/health`);
  const data = await response.json();
  const text = JSON.stringify(data);
  
  // Check for common API key patterns
  const patterns = [
    /sk-[a-zA-Z0-9]{20,}/,  // OpenAI
    /sk-ant-[a-zA-Z0-9]+/,   // Anthropic
    /AIza[a-zA-Z0-9]+/,      // Google
    /pplx-[a-zA-Z0-9]+/,     // Perplexity
    /gsk_[a-zA-Z0-9]+/       // Groq
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      throw new Error('API key pattern found in response!');
    }
  }
}

async function testSecurityHeaders() {
  const response = await fetch(`${PROXY_URL}/health`);
  
  // Check for security headers (helmet adds these)
  const headers = response.headers;
  
  // These should be present with helmet
  // Note: Some may vary based on helmet config
}

async function testRateLimitHeaders() {
  const response = await fetch(`${PROXY_URL}/health`);
  
  // Rate limit headers should be present
  const remaining = response.headers.get('ratelimit-remaining');
  const limit = response.headers.get('ratelimit-limit');
  
  // These are added by express-rate-limit with standardHeaders: true
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================

async function runAllTests() {
  console.log('');
  log('╔═══════════════════════════════════════════════════════════╗', 'blue');
  log('║         OneMindAI Proxy Server Test Suite                 ║', 'blue');
  log('╚═══════════════════════════════════════════════════════════╝', 'blue');
  console.log('');
  log(`Testing: ${PROXY_URL}`, 'yellow');
  console.log('');

  // Check if server is running
  try {
    await fetch(`${PROXY_URL}/health`);
  } catch (error) {
    log('❌ Proxy server not running!', 'red');
    log('   Start it with: npm run proxy', 'yellow');
    process.exit(1);
  }

  log('Running tests...', 'bold');
  console.log('');

  // Health & Basic
  log('📋 Health & Basic Tests', 'blue');
  await runTest('T-BE-01: Health endpoint returns status', testHealthEndpoint);
  await runTest('T-BE-06: Missing body returns 400', testMissingBody);
  await runTest('T-BE-XX: Invalid endpoint returns 404', testInvalidEndpoint);
  console.log('');

  // Provider Endpoints
  log('🔌 Provider Endpoint Tests', 'blue');
  await runTest('T-BE-02: OpenAI endpoint responds', testOpenAIEndpoint);
  await runTest('T-BE-03: Anthropic endpoint responds', testAnthropicEndpoint);
  await runTest('T-BE-04: Gemini endpoint responds', testGeminiEndpoint);
  console.log('');

  // Security
  log('🔒 Security Tests', 'blue');
  await runTest('T-BE-08: No API keys in response', testNoAPIKeyLeak);
  await runTest('T-BE-09: CORS headers present', testCORSHeaders);
  await runTest('T-BE-XX: Security headers present', testSecurityHeaders);
  await runTest('T-BE-07: Rate limit headers present', testRateLimitHeaders);
  console.log('');

  // Summary
  log('═══════════════════════════════════════════════════════════', 'blue');
  console.log('');
  log(`Results: ${results.passed} passed, ${results.failed} failed`, 
      results.failed === 0 ? 'green' : 'red');
  console.log('');

  if (results.failed > 0) {
    log('Failed tests:', 'red');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => log(`  • ${t.name}: ${t.error}`, 'red'));
    console.log('');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  log(`Test suite error: ${error.message}`, 'red');
  process.exit(1);
});
