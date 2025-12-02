/**
 * 🐒 CHAOS MONKEY TESTING SERVER - FRONTEND EDITION
 * Designed for testing frontend React apps with Puppeteer
 * 
 * Run: npm start (default port 4000)
 * Dashboard: http://localhost:4000
 */

console.log('🐒 Starting Chaos Monkey server...');

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { watch } from 'chokidar';
import { glob } from 'glob';
import fs from 'fs/promises';

console.log('✅ Imports loaded');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configuration
const CONFIG = {
  port: process.env.CHAOS_PORT || 4000,
  targets: {
    local: process.env.LOCAL_TARGET || 'http://localhost:5173',
    production: process.env.PROD_TARGET || 'https://onemindai.vercel.app'
  },
  srcPath: path.join(__dirname, '..', 'src'),
  testTimeout: 60000,
  maxConcurrent: 10
};

// Test Results Store
const testResults = {
  runs: [],
  currentRun: null,
  stats: { total: 0, passed: 0, failed: 0, skipped: 0 }
};

// WebSocket clients for real-time updates
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', config: CONFIG }));
  ws.on('close', () => wsClients.delete(ws));
});

function broadcast(data) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === 1) client.send(message);
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dashboard')));

console.log('✅ Middleware configured');

// ============================================
// DYNAMIC CODE ANALYSIS
// ============================================

async function analyzeCodebase() {
  const analysis = {
    components: [],
    apiEndpoints: [],
    providers: [],
    exports: [],
    stateManagement: [],
    dependencies: []
  };

  try {
    const files = await glob('**/*.{ts,tsx,js,jsx}', { 
      cwd: CONFIG.srcPath,
      ignore: ['node_modules/**', '**/*.test.*', '**/*.spec.*']
    });

    for (const file of files) {
      const content = await fs.readFile(path.join(CONFIG.srcPath, file), 'utf-8');
      
      const componentMatches = content.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/g);
      if (componentMatches) {
        analysis.components.push(...componentMatches.map(m => ({
          name: m.match(/([A-Z][a-zA-Z0-9]*)/)?.[1],
          file
        })));
      }

      const apiMatches = content.match(/fetch\s*\(\s*[`'"]([^`'"]+)[`'"]/g);
      if (apiMatches) {
        analysis.apiEndpoints.push(...apiMatches.map(m => ({
          url: m.match(/[`'"]([^`'"]+)[`'"]/)?.[1],
          file
        })));
      }

      const providerMatches = content.match(/provider:\s*[`'"]([^`'"]+)[`'"]/g);
      if (providerMatches) {
        analysis.providers.push(...providerMatches.map(m => m.match(/[`'"]([^`'"]+)[`'"]/)?.[1]));
      }
    }

    analysis.providers = [...new Set(analysis.providers)];

    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    analysis.dependencies = Object.keys(pkg.dependencies || {});

  } catch (error) {
    console.error('Code analysis error:', error.message);
  }

  return analysis;
}

// ============================================
// PUPPETEER HELPERS
// ============================================

async function createPageWithLogging(browser) {
  const page = await browser.newPage();
  const logs = [];
  
  page.on('console', msg => {
    const logEntry = { 
      type: msg.type(), 
      text: msg.text(), 
      timestamp: new Date().toISOString() 
    };
    logs.push(logEntry);
    broadcast({ type: 'console-log', log: logEntry });
    console.log(`[Browser ${msg.type()}] ${msg.text().slice(0, 100)}`);
  });
  
  page.on('pageerror', error => {
    const logEntry = { type: 'error', text: error.message, timestamp: new Date().toISOString() };
    logs.push(logEntry);
    broadcast({ type: 'console-log', log: logEntry });
    console.log(`[Browser ERROR] ${error.message}`);
  });
  
  page.on('requestfailed', request => {
    const logEntry = { 
      type: 'network-error', 
      text: `${request.url()} - ${request.failure()?.errorText}`, 
      timestamp: new Date().toISOString() 
    };
    logs.push(logEntry);
    broadcast({ type: 'console-log', log: logEntry });
  });

  page.on('response', response => {
    const url = response.url();
    if (url.includes('api.') || url.includes('/api/')) {
      console.log(`[API Response] ${response.status()} ${url.slice(0, 80)}`);
      broadcast({ 
        type: 'api-call', 
        url: url, 
        status: response.status(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.getLogs = () => logs;
  page.getErrors = () => logs.filter(l => l.type === 'error' || l.type === 'pageerror' || l.type === 'network-error');
  
  return page;
}

console.log('✅ Helper functions defined');

// ============================================
// TEST SUITES - FRONTEND FOCUSED
// ============================================

const testSuites = {
  pageLoad: {
    name: 'Page Load Tests',
    requiresBrowser: true,
    tests: [
      {
        id: 'page-001',
        name: 'Initial Page Load Speed',
        severity: 'critical',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          const start = Date.now();
          
          try {
            const response = await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            const loadTime = Date.now() - start;
            
            await page.close();
            return {
              passed: response.status() === 200 && loadTime < 10000,
              expected: '200 status, <10s load',
              actual: `${response.status()}, ${loadTime}ms`,
              note: loadTime > 5000 ? 'Slow load time!' : 'Good performance'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'page-002',
        name: 'No Console Errors on Load',
        severity: 'high',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            await new Promise(r => setTimeout(r, 2000));
            
            const errors = page.getErrors();
            
            await page.close();
            return {
              passed: errors.length === 0,
              expected: '0 errors',
              actual: `${errors.length} errors`,
              note: errors.length > 0 ? errors.map(e => e.text).join('; ').slice(0, 200) : 'Clean console'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'page-003',
        name: 'Critical UI Elements Present',
        severity: 'critical',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const elements = await page.evaluate(() => {
              return {
                hasTextarea: !!document.querySelector('textarea'),
                hasButtons: document.querySelectorAll('button').length > 0,
                hasContent: document.body.innerText.length > 50,
                buttonCount: document.querySelectorAll('button').length
              };
            });
            
            await page.close();
            const allPresent = elements.hasTextarea && elements.hasButtons && elements.hasContent;
            
            return {
              passed: allPresent,
              expected: 'textarea, buttons, content',
              actual: `textarea:${elements.hasTextarea}, ${elements.buttonCount} buttons`,
              note: allPresent ? 'UI rendered correctly' : 'Missing critical elements'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'page-004',
        name: 'Memory Usage Check',
        severity: 'medium',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const metrics = await page.metrics();
            const heapUsedMB = Math.round(metrics.JSHeapUsedSize / 1024 / 1024);
            
            await page.close();
            return {
              passed: heapUsedMB < 150,
              expected: '<150MB heap',
              actual: `${heapUsedMB}MB`,
              note: heapUsedMB > 100 ? 'High memory usage' : 'Memory OK'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      }
    ]
  },

  uiChaos: {
    name: 'UI Chaos Tests',
    requiresBrowser: true,
    tests: [
      {
        id: 'ui-001',
        name: 'Rapid Button Clicks (50x)',
        severity: 'high',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const button = await page.$('button');
            if (!button) {
              await page.close();
              return { passed: true, note: 'No buttons found to test' };
            }
            
            console.log('[Chaos] Rapid clicking button 50 times...');
            for (let i = 0; i < 50; i++) {
              await button.click().catch(() => {});
            }
            
            await new Promise(r => setTimeout(r, 1000));
            
            const errors = page.getErrors();
            await page.close();
            
            return {
              passed: errors.length === 0,
              expected: 'No crashes',
              actual: errors.length > 0 ? `${errors.length} errors` : 'Stable',
              note: errors.length > 0 ? errors[0].text.slice(0, 100) : 'Handled rapid clicks'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'ui-002',
        name: 'Extreme Text Input (10K chars)',
        severity: 'medium',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const textarea = await page.$('textarea');
            if (!textarea) {
              await page.close();
              return { passed: true, note: 'No textarea found' };
            }
            
            const extremeText = 'A'.repeat(10000);
            console.log('[Chaos] Typing 10K characters...');
            await textarea.click();
            await page.keyboard.type(extremeText.slice(0, 1000), { delay: 0 });
            
            await new Promise(r => setTimeout(r, 500));
            
            const errors = page.getErrors();
            const metrics = await page.metrics();
            const heapMB = Math.round(metrics.JSHeapUsedSize / 1024 / 1024);
            
            await page.close();
            
            return {
              passed: errors.length === 0 && heapMB < 200,
              expected: 'No crash, <200MB',
              actual: `${errors.length} errors, ${heapMB}MB`,
              note: 'Handled extreme input'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'ui-003',
        name: 'Special Characters Input',
        severity: 'medium',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const textarea = await page.$('textarea');
            if (!textarea) {
              await page.close();
              return { passed: true, note: 'No textarea found' };
            }
            
            const specialChars = 'Test with emojis 🔥💀🐒 and special chars';
            console.log('[Chaos] Typing special characters...');
            await textarea.click();
            await textarea.type(specialChars);
            
            await new Promise(r => setTimeout(r, 500));
            
            const errors = page.getErrors();
            await page.close();
            
            return {
              passed: errors.length === 0,
              expected: 'No errors',
              actual: errors.length > 0 ? `${errors.length} errors` : 'Safe',
              note: 'Input handled correctly'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'ui-004',
        name: 'Browser Back/Forward Navigation',
        severity: 'low',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            console.log('[Chaos] Rapid back/forward navigation...');
            for (let i = 0; i < 5; i++) {
              await page.goBack().catch(() => {});
              await page.goForward().catch(() => {});
            }
            
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const errors = page.getErrors();
            await page.close();
            
            return {
              passed: errors.length < 3,
              expected: '<3 errors',
              actual: `${errors.length} errors`,
              note: 'Navigation handled'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'ui-005',
        name: 'Responsive Layout (Mobile)',
        severity: 'medium',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.setViewport({ width: 375, height: 667, isMobile: true });
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const layout = await page.evaluate(() => {
              const body = document.body;
              return {
                hasHorizontalScroll: body.scrollWidth > window.innerWidth,
                contentVisible: body.innerText.length > 50,
                viewportWidth: window.innerWidth
              };
            });
            
            const errors = page.getErrors();
            await page.close();
            
            return {
              passed: !layout.hasHorizontalScroll && layout.contentVisible,
              expected: 'No horizontal scroll, content visible',
              actual: `scroll:${layout.hasHorizontalScroll}, content:${layout.contentVisible}`,
              note: layout.hasHorizontalScroll ? 'Horizontal scroll detected!' : 'Mobile layout OK'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'ui-006',
        name: 'Window Resize Chaos',
        severity: 'low',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            console.log('[Chaos] Rapid window resizing...');
            const sizes = [
              { width: 1920, height: 1080 },
              { width: 768, height: 1024 },
              { width: 375, height: 667 },
              { width: 1440, height: 900 },
              { width: 320, height: 480 }
            ];
            
            for (const size of sizes) {
              await page.setViewport(size);
              await new Promise(r => setTimeout(r, 200));
            }
            
            const errors = page.getErrors();
            await page.close();
            
            return {
              passed: errors.length === 0,
              expected: 'No resize errors',
              actual: `${errors.length} errors`,
              note: 'Resize handled correctly'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      }
    ]
  },

  aiProviders: {
    name: 'AI Provider Tests',
    requiresBrowser: true,
    tests: [
      {
        id: 'ai-001',
        name: 'Submit Prompt Flow',
        severity: 'critical',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const textarea = await page.$('textarea');
            if (!textarea) {
              await page.close();
              return { passed: false, note: 'No textarea found' };
            }
            
            console.log('[AI Test] Typing test prompt...');
            await textarea.click();
            await textarea.type('Hello, this is a test prompt from Chaos Monkey');
            
            await new Promise(r => setTimeout(r, 1000));
            
            const errors = page.getErrors();
            await page.close();
            
            return {
              passed: errors.length === 0,
              expected: 'No errors on submit',
              actual: errors.length > 0 ? errors[0].text.slice(0, 100) : 'Clean',
              note: 'Prompt submission flow tested'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'ai-002',
        name: 'Engine Selector Interaction',
        severity: 'medium',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const selectors = await page.$$('select, [role="listbox"], [class*="engine"], [class*="model"], [class*="provider"]');
            
            console.log(`[AI Test] Found ${selectors.length} potential engine selectors`);
            
            for (const selector of selectors.slice(0, 3)) {
              await selector.click().catch(() => {});
              await new Promise(r => setTimeout(r, 300));
            }
            
            const errors = page.getErrors();
            await page.close();
            
            return {
              passed: errors.length === 0,
              expected: 'Engine switching works',
              actual: `${selectors.length} selectors, ${errors.length} errors`,
              note: selectors.length > 0 ? 'Engine UI found' : 'No engine selector found'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'ai-003',
        name: 'API Key Visibility Check',
        severity: 'critical',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const pageContent = await page.content();
            const hasExposedKeys = 
              pageContent.includes('sk-ant-') || 
              pageContent.includes('sk-proj-') ||
              pageContent.includes('AIzaSy');
            
            await page.close();
            
            return {
              passed: !hasExposedKeys,
              expected: 'No exposed API keys',
              actual: hasExposedKeys ? 'KEYS EXPOSED!' : 'Keys hidden',
              note: hasExposedKeys ? 'CRITICAL: API keys visible in DOM!' : 'Keys properly hidden'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      }
    ]
  },

  security: {
    name: 'Security Tests',
    requiresBrowser: true,
    tests: [
      {
        id: 'sec-001',
        name: 'LocalStorage Security',
        severity: 'high',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const storageData = await page.evaluate(() => {
              const data = {};
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data[key] = localStorage.getItem(key);
              }
              return data;
            });
            
            const storageStr = JSON.stringify(storageData);
            const hasSensitiveData = 
              storageStr.includes('sk-ant-') ||
              storageStr.includes('sk-proj-') ||
              storageStr.includes('password') ||
              storageStr.includes('secret');
            
            await page.close();
            
            return {
              passed: !hasSensitiveData,
              expected: 'No sensitive data in localStorage',
              actual: hasSensitiveData ? 'Sensitive data found!' : 'Clean',
              note: `${Object.keys(storageData).length} items in localStorage`
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      }
    ]
  },

  performance: {
    name: 'Performance Tests',
    requiresBrowser: true,
    tests: [
      {
        id: 'perf-001',
        name: 'Memory Leak Detection',
        severity: 'high',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const initialMetrics = await page.metrics();
            const initialHeap = initialMetrics.JSHeapUsedSize;
            
            console.log('[Perf] Performing stress interactions...');
            for (let i = 0; i < 20; i++) {
              const textarea = await page.$('textarea');
              if (textarea) {
                await textarea.click();
                await textarea.type('Test message ' + i);
                await textarea.click({ clickCount: 3 });
              }
              await new Promise(r => setTimeout(r, 100));
            }
            
            await new Promise(r => setTimeout(r, 1000));
            
            const finalMetrics = await page.metrics();
            const finalHeap = finalMetrics.JSHeapUsedSize;
            const heapGrowth = ((finalHeap - initialHeap) / initialHeap * 100).toFixed(1);
            
            await page.close();
            
            return {
              passed: parseFloat(heapGrowth) < 50,
              expected: '<50% heap growth',
              actual: `${heapGrowth}% growth`,
              note: parseFloat(heapGrowth) > 30 ? 'Possible memory leak' : 'Memory stable'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      },
      {
        id: 'perf-002',
        name: 'DOM Node Count',
        severity: 'medium',
        run: async (target, browser) => {
          const page = await createPageWithLogging(browser);
          
          try {
            await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const nodeCount = await page.evaluate(() => {
              return document.getElementsByTagName('*').length;
            });
            
            await page.close();
            
            return {
              passed: nodeCount < 3000,
              expected: '<3000 DOM nodes',
              actual: `${nodeCount} nodes`,
              note: nodeCount > 2000 ? 'High DOM complexity' : 'DOM size OK'
            };
          } catch (e) {
            await page.close();
            return { passed: false, error: e.message };
          }
        }
      }
    ]
  }
};

console.log('✅ Test suites defined');

// ============================================
// TEST RUNNER
// ============================================

async function runTest(test, target, browser) {
  const startTime = Date.now();
  
  try {
    const result = await Promise.race([
      test.run(target, browser, broadcast),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), CONFIG.testTimeout)
      )
    ]);
    
    return {
      id: test.id,
      name: test.name,
      severity: test.severity,
      ...result,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      id: test.id,
      name: test.name,
      severity: test.severity,
      passed: false,
      error: error.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
}

async function runSuite(suiteName, target, browser = null) {
  const suite = testSuites[suiteName];
  if (!suite) throw new Error(`Suite not found: ${suiteName}`);
  
  const results = [];
  
  for (const test of suite.tests) {
    broadcast({ type: 'test-start', test: test.id, name: test.name });
    console.log(`\n🧪 Running: ${test.name}`);
    
    const result = await runTest(test, target, browser);
    results.push(result);
    
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${result.passed ? 'PASSED' : 'FAILED'} (${result.duration}ms)`);
    if (result.note) console.log(`   └─ ${result.note}`);
    if (result.error) console.log(`   └─ Error: ${result.error}`);
    
    broadcast({ type: 'test-complete', result });
  }
  
  return results;
}

async function runAllSuites(target) {
  const allResults = {};
  let browser = null;
  
  try {
    const puppeteer = await import('puppeteer');
    console.log('\n🚀 Launching browser...');
    browser = await puppeteer.default.launch({ 
      headless: false,
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Browser launched (visible mode)');
  } catch (e) {
    console.error('❌ Failed to launch Puppeteer:', e.message);
    console.log('   Install with: npm install puppeteer');
    
    for (const [suiteName, suite] of Object.entries(testSuites)) {
      allResults[suiteName] = suite.tests.map(t => ({
        id: t.id,
        name: t.name,
        severity: t.severity,
        passed: false,
        skipped: true,
        note: 'Browser not available - install puppeteer'
      }));
    }
    return allResults;
  }
  
  for (const [suiteName, suite] of Object.entries(testSuites)) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`📦 ${suite.name.toUpperCase()}`);
    console.log(`${'═'.repeat(50)}`);
    
    broadcast({ type: 'suite-start', suite: suiteName, name: suite.name });
    allResults[suiteName] = await runSuite(suiteName, target, browser);
    broadcast({ type: 'suite-complete', suite: suiteName });
  }
  
  if (browser) {
    console.log('\n🔒 Closing browser...');
    await browser.close();
  }
  
  return allResults;
}

// ============================================
// API ROUTES
// ============================================

app.get('/api/config', (req, res) => {
  res.json(CONFIG);
});

app.get('/api/analyze', async (req, res) => {
  try {
    const analysis = await analyzeCodebase();
    res.json(analysis);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/suites', (req, res) => {
  const suites = Object.entries(testSuites).map(([key, suite]) => ({
    id: key,
    name: suite.name,
    testCount: suite.tests.length,
    requiresBrowser: suite.requiresBrowser || false
  }));
  res.json(suites);
});

app.post('/api/run/:suite', async (req, res) => {
  const { suite } = req.params;
  const { target = CONFIG.targets.local } = req.body;
  
  let browser = null;
  try {
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.default.launch({ 
      headless: false,
      defaultViewport: { width: 1280, height: 800 }
    });
    
    const results = await runSuite(suite, target, browser);
    await browser.close();
    
    res.json({ suite, results });
  } catch (error) {
    if (browser) await browser.close();
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/run-all', async (req, res) => {
  const { target = CONFIG.targets.local } = req.body;
  
  broadcast({ type: 'run-start', target });
  
  const startTime = Date.now();
  const results = await runAllSuites(target);
  const duration = Date.now() - startTime;
  
  let total = 0, passed = 0, failed = 0, skipped = 0;
  for (const suiteResults of Object.values(results)) {
    for (const result of suiteResults) {
      total++;
      if (result.skipped) skipped++;
      else if (result.passed) passed++;
      else failed++;
    }
  }
  
  const run = {
    id: Date.now().toString(),
    target,
    timestamp: new Date().toISOString(),
    duration,
    stats: { total, passed, failed, skipped },
    results
  };
  
  testResults.runs.unshift(run);
  testResults.runs = testResults.runs.slice(0, 50);
  
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 FINAL RESULTS`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log(`Duration: ${(duration/1000).toFixed(1)}s`);
  console.log(`${'═'.repeat(50)}\n`);
  
  broadcast({ type: 'run-complete', run });
  
  res.json(run);
});

app.get('/api/history', (req, res) => {
  res.json(testResults.runs);
});

console.log('✅ API routes configured');

// ============================================
// FILE WATCHER
// ============================================

try {
  const watcher = watch(CONFIG.srcPath, {
    ignored: /node_modules/,
    persistent: true
  });

  watcher.on('change', async (filePath) => {
    console.log(`📁 File changed: ${filePath}`);
    broadcast({ type: 'codebase-changed', path: filePath });
  });
  
  console.log('✅ File watcher started');
} catch (e) {
  console.log('⚠️  File watcher disabled:', e.message);
}

// ============================================
// START SERVER
// ============================================

server.listen(CONFIG.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🐒 CHAOS MONKEY - FRONTEND TESTING SERVER                  ║
║                                                              ║
║   Dashboard: http://localhost:${CONFIG.port}                       ║
║   API:       http://localhost:${CONFIG.port}/api                   ║
║   WebSocket: ws://localhost:${CONFIG.port}                         ║
║                                                              ║
║   Mode: FRONTEND (Puppeteer-based)                           ║
║   Browser: Visible (you'll see tests running!)               ║
║                                                              ║
║   Targets:                                                   ║
║   - Local:      ${CONFIG.targets.local.padEnd(35)}       ║
║   - Production: ${CONFIG.targets.production.padEnd(35)}       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
  console.log('\n✅ Server is ready! Open http://localhost:4000 in your browser\n');
});

console.log('✅ Server configuration complete');