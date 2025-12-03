/**
 * Vite Plugin for Terminal Logging
 * Intercepts requests and logs detailed processing information
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgYellow: '\x1b[43m',
  black: '\x1b[30m',
  white: '\x1b[37m',
};

function timestamp() {
  const now = new Date();
  return `${colors.dim}[${now.toLocaleTimeString()}]${colors.reset}`;
}

function loggerPlugin() {
  let chunkCounter = {};
  
  return {
    name: 'onemind-logger',
    
    configureServer(server) {
      console.log('\n' + colors.bgMagenta + colors.white + ' 🚀 OneMindAI Development Server ' + colors.reset);
      console.log(colors.cyan + '='.repeat(80) + colors.reset);
      console.log(timestamp() + ' ' + colors.green + '✅ Vite server configured' + colors.reset);
      console.log(timestamp() + ' ' + colors.cyan + 'ℹ️  Terminal logging plugin active' + colors.reset);
      console.log(timestamp() + ' ' + colors.yellow + '📊 Monitoring: API calls, chunks, libraries' + colors.reset);
      console.log(colors.cyan + '='.repeat(80) + colors.reset + '\n');

      // Intercept middleware
      server.middlewares.use((req, res, next) => {
        const start = Date.now();
        
        // Log incoming requests
        if (req.url && !req.url.includes('/@') && !req.url.includes('.')) {
          console.log(
            timestamp() + ' ' +
            colors.bgBlue + colors.white + ' 📡 REQUEST ' + colors.reset + ' ' +
            colors.blue + req.method + colors.reset + ' ' +
            colors.dim + req.url + colors.reset
          );
        }

        // Intercept response
        const originalWrite = res.write;
        const originalEnd = res.end;
        const chunks = [];

        res.write = function(chunk, ...args) {
          if (chunk) chunks.push(Buffer.from(chunk));
          return originalWrite.apply(res, [chunk, ...args]);
        };

        res.end = function(chunk, ...args) {
          if (chunk) chunks.push(Buffer.from(chunk));
          
          const duration = Date.now() - start;
          
          // Log response details
          if (req.url && !req.url.includes('/@') && !req.url.includes('.')) {
            const body = Buffer.concat(chunks).toString('utf8');
            
            console.log(
              timestamp() + ' ' +
              colors.bgGreen + colors.black + ' ✅ RESPONSE ' + colors.reset + ' ' +
              colors.green + res.statusCode + colors.reset + ' ' +
              colors.dim + `${duration}ms | ${body.length} bytes` + colors.reset
            );
          }
          
          return originalEnd.apply(res, [chunk, ...args]);
        };

        next();
      });

      // Log HMR updates
      server.ws.on('connection', () => {
        console.log(
          timestamp() + ' ' +
          colors.bgCyan + colors.black + ' 🔌 WebSocket ' + colors.reset + ' ' +
          colors.cyan + 'Client connected' + colors.reset
        );
      });

      server.watcher.on('change', (file) => {
        if (file.includes('OneMindAI.tsx') || file.includes('EnhancedMarkdownRenderer.tsx')) {
          console.log(
            timestamp() + ' ' +
            colors.bgYellow + colors.black + ' 🔄 HMR ' + colors.reset + ' ' +
            colors.yellow + 'File changed: ' + colors.reset +
            colors.dim + file.split('/').pop() + colors.reset
          );
        }
      });
    },

    transform(code, id) {
      // Inject logging into specific files
      if (id.includes('OneMindAI.tsx')) {
        // Add terminal logging wrapper
        const injectedCode = `
// Terminal Logger Injection
if (typeof window !== 'undefined') {
  window.__terminalLog = function(type, ...args) {
    // Send to server via fetch for terminal logging
    fetch('/__terminal_log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, args, timestamp: Date.now() })
    }).catch(() => {});
  };
}

${code}
        `;
        return { code: injectedCode, map: null };
      }
      return null;
    }
  };
}

module.exports = loggerPlugin;
