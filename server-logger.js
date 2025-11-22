/**
 * Server-Side Terminal Logger for OneMindAI
 * Shows detailed chunk processing and library triggers in terminal
 */

const chalk = require('chalk');

// ANSI color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

class ServerLogger {
  constructor() {
    this.chunkCounts = {};
    this.startTimes = {};
  }

  // Format timestamp
  timestamp() {
    const now = new Date();
    return `${colors.dim}[${now.toLocaleTimeString()}]${colors.reset}`;
  }

  // Separator line
  separator(char = '=', length = 80) {
    console.log(colors.cyan + char.repeat(length) + colors.reset);
  }

  // Header with gradient effect
  header(msg) {
    this.separator();
    console.log(
      `${colors.bright}${colors.bgMagenta}${colors.white} 🚀 ${msg} ${colors.reset}`
    );
    this.separator();
  }

  // Step indicator
  step(num, msg) {
    console.log(
      `${this.timestamp()} ${colors.bgGreen}${colors.black} STEP ${num} ${colors.reset} ${colors.green}${msg}${colors.reset}`
    );
  }

  // Info message
  info(msg) {
    console.log(
      `${this.timestamp()} ${colors.bgCyan}${colors.black} ℹ️ INFO ${colors.reset} ${colors.cyan}${msg}${colors.reset}`
    );
  }

  // Success message
  success(msg) {
    console.log(
      `${this.timestamp()} ${colors.bgGreen}${colors.black} ✅ SUCCESS ${colors.reset} ${colors.green}${msg}${colors.reset}`
    );
  }

  // Warning message
  warning(msg) {
    console.log(
      `${this.timestamp()} ${colors.bgYellow}${colors.black} ⚠️ WARNING ${colors.reset} ${colors.yellow}${msg}${colors.reset}`
    );
  }

  // Error message
  error(msg, error) {
    console.log(
      `${this.timestamp()} ${colors.bgRed}${colors.white} ❌ ERROR ${colors.reset} ${colors.red}${msg}${colors.reset}`
    );
    if (error) {
      console.error(colors.red + error.stack + colors.reset);
    }
  }

  // Data display
  data(label, data) {
    console.log(
      `${this.timestamp()} ${colors.bgBlue}${colors.white} 📦 ${label} ${colors.reset}`
    );
    console.log(colors.blue + JSON.stringify(data, null, 2) + colors.reset);
  }

  // Chunk processing
  chunk(engineName, chunkNum, content, length) {
    const preview = content.substring(0, 50).replace(/\n/g, '\\n');
    console.log(
      `${this.timestamp()} ${colors.bgMagenta}${colors.white} 📦 CHUNK #${chunkNum} ${colors.reset} ` +
      `${colors.magenta}[${engineName}]${colors.reset} ` +
      `${colors.dim}${length} chars${colors.reset} ` +
      `${colors.yellow}"${preview}${content.length > 50 ? '...' : ''}"${colors.reset}`
    );
  }

  // Library trigger
  library(libraryName, action, details) {
    console.log(
      `${this.timestamp()} ${colors.bgYellow}${colors.black} 📚 LIBRARY ${colors.reset} ` +
      `${colors.yellow}${libraryName}${colors.reset} ` +
      `${colors.bright}→${colors.reset} ` +
      `${colors.cyan}${action}${colors.reset}`
    );
    if (details) {
      console.log(colors.dim + '   ' + JSON.stringify(details) + colors.reset);
    }
  }

  // API call
  apiCall(provider, endpoint, method = 'POST') {
    console.log(
      `${this.timestamp()} ${colors.bgBlue}${colors.white} 🌐 API CALL ${colors.reset} ` +
      `${colors.blue}${method}${colors.reset} ` +
      `${colors.bright}${provider}${colors.reset} ` +
      `${colors.dim}${endpoint}${colors.reset}`
    );
  }

  // Stream start
  streamStart(engineName) {
    this.chunkCounts[engineName] = 0;
    this.startTimes[engineName] = Date.now();
    console.log(
      `${this.timestamp()} ${colors.bgGreen}${colors.white} ▶️ STREAM START ${colors.reset} ` +
      `${colors.green}${engineName}${colors.reset}`
    );
  }

  // Stream end
  streamEnd(engineName, totalChunks, totalChars) {
    const duration = ((Date.now() - this.startTimes[engineName]) / 1000).toFixed(2);
    console.log(
      `${this.timestamp()} ${colors.bgGreen}${colors.white} ⏹️ STREAM END ${colors.reset} ` +
      `${colors.green}${engineName}${colors.reset} ` +
      `${colors.dim}${totalChunks} chunks, ${totalChars} chars, ${duration}s${colors.reset}`
    );
  }

  // Markdown processing
  markdown(action, input, output) {
    console.log(
      `${this.timestamp()} ${colors.bgCyan}${colors.black} 📝 MARKDOWN ${colors.reset} ` +
      `${colors.cyan}${action}${colors.reset}`
    );
    if (input) {
      console.log(colors.dim + '   INPUT:  ' + input.substring(0, 60) + '...' + colors.reset);
    }
    if (output) {
      console.log(colors.dim + '   OUTPUT: ' + output.substring(0, 60) + '...' + colors.reset);
    }
  }

  // Chart rendering
  chart(type, dataPoints) {
    console.log(
      `${this.timestamp()} ${colors.bgMagenta}${colors.white} 📊 CHART ${colors.reset} ` +
      `${colors.magenta}${type}${colors.reset} ` +
      `${colors.dim}${dataPoints} data points${colors.reset}`
    );
  }

  // File processing
  file(fileName, fileType, size, action) {
    console.log(
      `${this.timestamp()} ${colors.bgYellow}${colors.black} 📁 FILE ${colors.reset} ` +
      `${colors.yellow}${action}${colors.reset} ` +
      `${colors.bright}${fileName}${colors.reset} ` +
      `${colors.dim}(${fileType}, ${(size / 1024).toFixed(2)} KB)${colors.reset}`
    );
  }

  // Token calculation
  tokens(engineName, inputTokens, outputTokens, cost) {
    console.log(
      `${this.timestamp()} ${colors.bgBlue}${colors.white} 🎫 TOKENS ${colors.reset} ` +
      `${colors.blue}${engineName}${colors.reset} ` +
      `${colors.dim}IN: ${inputTokens} | OUT: ${outputTokens} | COST: $${cost.toFixed(4)}${colors.reset}`
    );
  }

  // Performance metric
  performance(metric, value, unit = 'ms') {
    console.log(
      `${this.timestamp()} ${colors.bgGreen}${colors.black} ⚡ PERF ${colors.reset} ` +
      `${colors.green}${metric}${colors.reset} ` +
      `${colors.bright}${value}${unit}${colors.reset}`
    );
  }

  // Table for summary
  table(data) {
    console.table(data);
  }
}

// Export singleton instance
const logger = new ServerLogger();

// Log server startup
logger.header('OneMindAI Server Started');
logger.info('Version: v14 Mobile-First Preview');
logger.info('Platform: Formula2GX Digital Advanced Incubation Labs');
logger.info('Terminal logging enabled for detailed chunk processing');
logger.separator();

module.exports = logger;
