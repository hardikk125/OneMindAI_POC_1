/**
 * Server Monitor & Auto-Restart
 * 
 * Monitors all servers and automatically restarts them if they crash.
 * Provides health checks and automatic recovery.
 */

const { spawn } = require('child_process');
const http = require('http');

// Server configurations
const SERVERS = [
  {
    name: 'Vite Frontend',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: process.cwd(),
    port: 5173,
    color: '\x1b[36m', // Cyan
  },
  {
    name: 'Balance API',
    command: 'npm',
    args: ['run', 'server'],
    cwd: process.cwd(),
    port: 3001,
    color: '\x1b[33m', // Yellow
  },
  {
    name: 'AI Proxy',
    command: 'npm',
    args: ['run', 'proxy'],
    cwd: process.cwd(),
    port: 3002,
    color: '\x1b[35m', // Magenta
  },
];

const RESET = '\x1b[0m';
const processes = new Map();
const restartCounts = new Map();
const MAX_RESTARTS = 5;
const RESTART_WINDOW = 60000; // 1 minute

/**
 * Log with timestamp and color
 */
function log(message, color = '') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] ${message}${RESET}`);
}

/**
 * Check if a port is listening
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Start a server
 */
function startServer(config) {
  const { name, command, args, cwd, port, color } = config;
  
  log(`Starting ${name}...`, color);
  
  const proc = spawn(command, args, {
    cwd,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  
  processes.set(name, proc);
  
  // Handle stdout
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      log(`[${name}] ${line}`, color);
    });
  });
  
  // Handle stderr
  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      log(`[${name}] ERROR: ${line}`, '\x1b[31m'); // Red
    });
  });
  
  // Handle exit
  proc.on('exit', (code, signal) => {
    processes.delete(name);
    
    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      log(`${name} stopped gracefully`, color);
      return;
    }
    
    log(`${name} crashed with code ${code}`, '\x1b[31m');
    
    // Check restart count
    const now = Date.now();
    const restarts = restartCounts.get(name) || [];
    const recentRestarts = restarts.filter(t => now - t < RESTART_WINDOW);
    
    if (recentRestarts.length >= MAX_RESTARTS) {
      log(`${name} has crashed ${MAX_RESTARTS} times in ${RESTART_WINDOW/1000}s. Not restarting.`, '\x1b[31m');
      log(`Please check the logs and fix the issue manually.`, '\x1b[31m');
      return;
    }
    
    // Record restart
    recentRestarts.push(now);
    restartCounts.set(name, recentRestarts);
    
    // Restart after delay
    log(`Restarting ${name} in 3 seconds...`, '\x1b[33m');
    setTimeout(() => {
      startServer(config);
    }, 3000);
  });
  
  // Handle errors
  proc.on('error', (error) => {
    log(`${name} error: ${error.message}`, '\x1b[31m');
  });
}

/**
 * Health check loop
 */
async function healthCheck() {
  for (const config of SERVERS) {
    const { name, port, color } = config;
    const isHealthy = await checkPort(port);
    
    if (!isHealthy && processes.has(name)) {
      log(`${name} is not responding on port ${port}`, '\x1b[31m');
    }
  }
}

/**
 * Stop all servers
 */
function stopAll() {
  log('Stopping all servers...', '\x1b[33m');
  
  for (const [name, proc] of processes.entries()) {
    log(`Stopping ${name}...`, '\x1b[33m');
    proc.kill('SIGTERM');
  }
  
  setTimeout(() => {
    for (const [name, proc] of processes.entries()) {
      if (!proc.killed) {
        log(`Force killing ${name}...`, '\x1b[31m');
        proc.kill('SIGKILL');
      }
    }
    process.exit(0);
  }, 5000);
}

/**
 * Main
 */
function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   🛡️  OneMindAI Server Monitor                            ║');
  console.log('║   Auto-restart on crash | Health monitoring               ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Start all servers
  SERVERS.forEach(startServer);
  
  // Health check every 30 seconds
  setInterval(healthCheck, 30000);
  
  // Graceful shutdown
  process.on('SIGTERM', stopAll);
  process.on('SIGINT', stopAll);
  
  log('All servers started. Press Ctrl+C to stop.', '\x1b[32m');
}

main();
