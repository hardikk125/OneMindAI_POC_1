# 🐒 Chaos Monkey Testing Suite

An independent, comprehensive testing system for OneMindAI that systematically tries to break your platform before users do.

## Features

- **🔌 API Chaos Tests** - Invalid inputs, oversized payloads, malformed JSON
- **🔒 Security Tests** - SQL injection, XSS, path traversal, CORS validation
- **⚡ Load Tests** - Concurrent requests, rate limiting, sustained load
- **🎭 UI Tests** - Rapid clicking, extreme inputs, memory leaks (Puppeteer)
- **🤖 Provider Tests** - Timeout handling, fallbacks, multi-provider chaos
- **📄 Export Tests** - Large content, special characters, concurrent exports
- **📊 Real-time Dashboard** - WebSocket-powered live results
- **🔄 Dynamic Analysis** - Auto-detects code changes and adapts tests
- **📋 CLI Support** - Run tests from command line, CI/CD integration

## Quick Start

### 1. Install Dependencies

```bash
cd chaos-monkey
npm install
```

### 2. Start the Chaos Monkey Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Server runs on `http://localhost:4000`

### 3. Open the Dashboard

Navigate to `http://localhost:4000` in your browser.

### 4. Start Your OneMindAI App

In a separate terminal:
```bash
cd ..
npm run dev
```

### 5. Run Tests

- Click "Run All Tests" in the dashboard, or
- Use the CLI: `npm run test:all`

## CLI Usage

```bash
# Run all test suites
npm run test:all

# Run specific suite
npm run test:api
npm run test:security
npm run test:load

# Custom target
node cli.js --suite api --target https://onemindai.vercel.app

# JSON output (for CI/CD)
node cli.js --all --json > results.json

# Generate HTML report
npm run report
```

## Test Suites

### API Chaos (15 tests)
| Test | Severity | Description |
|------|----------|-------------|
| api-001 | Critical | Invalid API key handling |
| api-002 | High | Missing request body |
| api-003 | Medium | Empty prompt handling |
| api-004 | High | Malformed JSON |
| api-005 | High | Oversized payload (1MB) |
| api-006 | Critical | Oversized payload (10MB) |
| api-007 | Medium | Invalid provider name |
| api-008 | Medium | Special characters in prompt |
| api-009 | Medium | Unicode/emoji handling |
| api-010 | Medium | Null values in request |
| api-011 | Medium | Array instead of string |
| api-012 | Low | Negative token limit |
| api-013 | Medium | Extremely large token limit |
| api-014 | Low | HTTP method validation |
| api-015 | Low | Content-Type validation |

### Security Chaos (10 tests)
| Test | Severity | Description |
|------|----------|-------------|
| sec-001 | Critical | SQL injection attempts |
| sec-002 | Critical | XSS injection attempts |
| sec-003 | Critical | Path traversal attacks |
| sec-004 | Critical | Command injection |
| sec-005 | High | CORS headers validation |
| sec-006 | Critical | API key exposure in response |
| sec-007 | Medium | Error message info leakage |
| sec-008 | High | Header injection |
| sec-009 | High | JSON prototype pollution |
| sec-010 | High | Rate limit bypass attempts |

### Load Chaos (7 tests)
| Test | Severity | Description |
|------|----------|-------------|
| load-001 | Medium | 10 concurrent requests |
| load-002 | High | 50 concurrent requests |
| load-003 | Critical | 100 concurrent requests |
| load-004 | High | Rapid fire (20 req/sec) |
| load-005 | High | Sustained load (30 sec) |
| load-006 | High | Spike test (0 to 50) |
| load-007 | Medium | Response time under load |

### UI Chaos (6 tests) - Requires Puppeteer
| Test | Severity | Description |
|------|----------|-------------|
| ui-001 | Medium | Rapid submit button clicks |
| ui-002 | Medium | Extreme input length |
| ui-003 | Low | Browser back/forward |
| ui-004 | Medium | Console error detection |
| ui-005 | Medium | Memory usage check |
| ui-006 | Low | Responsive layout test |

### Provider Chaos (6 tests)
| Test | Severity | Description |
|------|----------|-------------|
| prov-001 | High | OpenAI timeout handling |
| prov-002 | High | Claude timeout handling |
| prov-003 | High | Gemini timeout handling |
| prov-004 | High | Provider fallback on failure |
| prov-005 | Medium | Streaming interruption |
| prov-006 | Medium | Multi-provider concurrent |

### Export Chaos (4 tests)
| Test | Severity | Description |
|------|----------|-------------|
| exp-001 | Medium | PDF export with large content |
| exp-002 | Medium | Word export special chars |
| exp-003 | Low | Malformed markdown export |
| exp-004 | Medium | Concurrent export requests |

## Configuration

Environment variables:
```bash
CHAOS_PORT=4000              # Server port
LOCAL_TARGET=http://localhost:5173   # Local app URL
PROD_TARGET=https://onemindai.vercel.app  # Production URL
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Chaos Monkey Tests

on: [push, pull_request]

jobs:
  chaos-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd chaos-monkey && npm install
      
      - name: Start app
        run: npm run dev &
        
      - name: Wait for app
        run: sleep 10
        
      - name: Start Chaos Monkey
        run: cd chaos-monkey && npm start &
        
      - name: Wait for server
        run: sleep 5
        
      - name: Run tests
        run: cd chaos-monkey && node cli.js --all --json > results.json
        
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: chaos-monkey-results
          path: chaos-monkey/results.json
```

## Adding Custom Tests

Add new tests to `server.js` in the appropriate suite:

```javascript
{
  id: 'custom-001',
  name: 'My Custom Test',
  severity: 'high', // critical, high, medium, low
  run: async (target, browser) => {
    // Your test logic here
    const response = await fetch(`${target}/api/endpoint`);
    
    return {
      passed: response.status === 200,
      expected: 200,
      actual: response.status,
      note: 'Optional note about the result'
    };
  }
}
```

## Architecture

```
chaos-monkey/
├── server.js           # Main server with all test suites
├── cli.js              # Command-line interface
├── generate-report.js  # HTML report generator
├── package.json        # Dependencies
├── dashboard/
│   └── index.html      # Web dashboard
└── reports/            # Generated reports
```

## WebSocket Events

The server broadcasts real-time events:

| Event | Description |
|-------|-------------|
| `connected` | Client connected |
| `test-start` | Test starting |
| `test-complete` | Test finished with result |
| `suite-start` | Suite starting |
| `suite-complete` | Suite finished |
| `run-start` | Full run starting |
| `run-complete` | Full run finished |
| `codebase-changed` | Source file changed |

## Tips

1. **Run locally first** - Test against localhost before production
2. **Check critical tests** - Focus on critical severity failures
3. **Monitor memory** - Watch for memory leaks during load tests
4. **Review security** - Never skip security tests before deployment
5. **Export reports** - Keep records of test runs for compliance

## Troubleshooting

### Server won't start
- Check if port 4000 is available
- Ensure all dependencies are installed

### UI tests skipped
- Install Puppeteer: `npm install puppeteer`
- On Linux, install Chrome dependencies

### Tests timing out
- Increase `testTimeout` in server.js
- Check if target app is running

### WebSocket disconnects
- Check firewall settings
- Ensure stable network connection

---

Made with 🐒 for OneMindAI by Formula2GX Digital Advanced Incubation Labs
