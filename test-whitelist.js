#!/usr/bin/env node

/**
 * API Config Whitelist Testing Script
 * 
 * Tests model and provider whitelist enforcement
 * Run: node test-whitelist.js
 */

const BASE_URL = process.env.API_URL || 'https://onemindaipoc1-production.up.railway.app';

async function makeRequest(endpoint, body) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (err) {
    return { status: 0, error: err.message };
  }
}

async function test(name, endpoint, body, expectedStatus) {
  console.log(`\n📝 ${name}`);
  console.log(`   Endpoint: POST ${endpoint}`);
  console.log(`   Body: ${JSON.stringify(body)}`);
  
  const result = await makeRequest(endpoint, body);
  
  console.log(`   Status: ${result.status}`);
  console.log(`   Response:`, JSON.stringify(result.data || result.error, null, 2));
  
  if (result.status === expectedStatus) {
    console.log(`   ✅ PASS (expected ${expectedStatus})`);
    return true;
  } else {
    console.log(`   ❌ FAIL (expected ${expectedStatus}, got ${result.status})`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 API Config Whitelist Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;

  // Test 1: Disabled provider
  if (await test(
    'Test 1: Disabled Provider (openai)',
    '/api/onemind',
    { prompt: 'test', max_tokens: 100, engines: ['openai'] },
    403
  )) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: Disabled model
  if (await test(
    'Test 2: Disabled Model (gpt-4o)',
    '/api/onemind',
    { 
      prompt: 'test', 
      max_tokens: 100, 
      engines: [{ provider: 'openai', model: 'gpt-4o' }]
    },
    403
  )) {
    passed++;
  } else {
    failed++;
  }

  // Test 3: Enabled model (should work)
  if (await test(
    'Test 3: Enabled Model (gpt-4o-mini)',
    '/api/onemind',
    { 
      prompt: 'test', 
      max_tokens: 100, 
      engines: [{ provider: 'openai', model: 'gpt-4o-mini' }]
    },
    200
  )) {
    passed++;
  } else {
    failed++;
  }

  // Test 4: Streaming with disabled model
  if (await test(
    'Test 4: Streaming with Disabled Model',
    '/api/onemind/stream',
    { 
      prompt: 'test', 
      max_tokens: 100, 
      provider: 'mistral',
      model: 'mistral-large-latest'
    },
    200 // SSE returns 200 even with error in stream
  )) {
    passed++;
  } else {
    failed++;
  }

  // Test 5: No engines specified (use all enabled)
  if (await test(
    'Test 5: No Engines (use all enabled)',
    '/api/onemind',
    { prompt: 'test', max_tokens: 100 },
    200
  )) {
    passed++;
  } else {
    failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log('\n💡 Tips:');
  console.log('   - Disable a provider in Admin Panel → API Configuration');
  console.log('   - Disable a model in Model Whitelist section');
  console.log('   - Re-run this script to see enforcement');
  console.log('   - Cache refreshes every 5 minutes');
}

runTests().catch(console.error);
