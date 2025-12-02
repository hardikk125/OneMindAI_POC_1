#!/usr/bin/env node
/**
 * 🐒 CHAOS MONKEY CLI
 * Command-line interface for running chaos tests
 * 
 * Usage:
 *   node cli.js --all                    Run all test suites
 *   node cli.js --suite api              Run specific suite
 *   node cli.js --suite security --json  Output as JSON
 *   node cli.js --target http://...      Specify target URL
 */

import chalk from 'chalk';
import ora from 'ora';

const API_BASE = process.env.CHAOS_API || 'http://localhost:4000';

// Parse arguments
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all'),
  suite: args.includes('--suite') ? args[args.indexOf('--suite') + 1] : null,
  target: args.includes('--target') ? args[args.indexOf('--target') + 1] : 'http://localhost:5173',
  json: args.includes('--json'),
  help: args.includes('--help') || args.includes('-h')
};

// Help text
if (options.help) {
  console.log(`
${chalk.bold.magenta('🐒 Chaos Monkey CLI')}

${chalk.bold('Usage:')}
  node cli.js [options]

${chalk.bold('Options:')}
  --all              Run all test suites
  --suite <name>     Run specific suite (api, security, load, ui, providers, exports)
  --target <url>     Target URL (default: http://localhost:5173)
  --json             Output results as JSON
  --help, -h         Show this help message

${chalk.bold('Examples:')}
  node cli.js --all
  node cli.js --suite api
  node cli.js --suite security --target https://onemindai.vercel.app
  node cli.js --all --json > results.json

${chalk.bold('Available Suites:')}
  api        - API endpoint chaos tests
  security   - Security vulnerability tests
  load       - Load and stress tests
  ui         - UI chaos tests (requires Puppeteer)
  providers  - AI provider specific tests
  exports    - Export functionality tests
`);
  process.exit(0);
}

// Banner
function printBanner() {
  console.log(chalk.magenta(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🐒 CHAOS MONKEY - OneMindAI Testing Suite                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`));
}

// Run tests
async function runTests() {
  if (!options.json) {
    printBanner();
    console.log(chalk.cyan(`Target: ${options.target}`));
    console.log('');
  }

  const spinner = options.json ? null : ora('Connecting to Chaos Monkey server...').start();

  try {
    // Check server is running
    const healthCheck = await fetch(`${API_BASE}/api/config`).catch(() => null);
    if (!healthCheck) {
      if (spinner) spinner.fail('Chaos Monkey server not running');
      console.log(chalk.yellow('\nStart the server first:'));
      console.log(chalk.gray('  cd chaos-monkey && npm start'));
      process.exit(1);
    }

    if (spinner) spinner.succeed('Connected to server');

    let results;
    
    if (options.all) {
      // Run all suites
      if (spinner) spinner.start('Running all test suites...');
      
      const response = await fetch(`${API_BASE}/api/run-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: options.target })
      });
      
      results = await response.json();
      
    } else if (options.suite) {
      // Run specific suite
      if (spinner) spinner.start(`Running ${options.suite} suite...`);
      
      const response = await fetch(`${API_BASE}/api/run/${options.suite}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: options.target })
      });
      
      const data = await response.json();
      results = {
        stats: {
          total: data.results.length,
          passed: data.results.filter(r => r.passed).length,
          failed: data.results.filter(r => !r.passed && !r.skipped).length,
          skipped: data.results.filter(r => r.skipped).length
        },
        results: { [options.suite]: data.results }
      };
      
    } else {
      if (spinner) spinner.fail('No suite specified');
      console.log(chalk.yellow('Use --all or --suite <name>'));
      process.exit(1);
    }

    if (spinner) spinner.succeed('Tests completed');

    // Output results
    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      printResults(results);
    }

    // Exit with error code if tests failed
    process.exit(results.stats.failed > 0 ? 1 : 0);

  } catch (error) {
    if (spinner) spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Print results in human-readable format
function printResults(data) {
  console.log('');
  console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('                        TEST RESULTS                           '));
  console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
  console.log('');

  // Stats
  const { stats } = data;
  console.log(chalk.bold('Summary:'));
  console.log(`  Total:   ${chalk.cyan(stats.total)}`);
  console.log(`  Passed:  ${chalk.green(stats.passed)}`);
  console.log(`  Failed:  ${chalk.red(stats.failed)}`);
  console.log(`  Skipped: ${chalk.yellow(stats.skipped)}`);
  console.log('');

  // Results by suite
  for (const [suiteName, suiteResults] of Object.entries(data.results)) {
    console.log(chalk.bold.magenta(`\n📦 ${suiteName.toUpperCase()}`));
    console.log(chalk.gray('─'.repeat(60)));

    for (const result of suiteResults) {
      const icon = result.passed ? chalk.green('✓') : 
                   result.skipped ? chalk.yellow('○') : 
                   chalk.red('✗');
      
      const severity = result.severity === 'critical' ? chalk.bgRed.white(' CRIT ') :
                       result.severity === 'high' ? chalk.bgYellow.black(' HIGH ') :
                       result.severity === 'medium' ? chalk.bgBlue.white(' MED  ') :
                       chalk.bgGray.white(' LOW  ');

      console.log(`  ${icon} ${severity} ${result.name}`);
      
      if (result.note && !result.passed) {
        console.log(chalk.gray(`      └─ ${result.note}`));
      }
      if (result.error) {
        console.log(chalk.red(`      └─ Error: ${result.error}`));
      }
    }
  }

  // Failed tests summary
  const allResults = Object.values(data.results).flat();
  const failed = allResults.filter(r => !r.passed && !r.skipped);
  
  if (failed.length > 0) {
    console.log('');
    console.log(chalk.bold.red('═══════════════════════════════════════════════════════════════'));
    console.log(chalk.bold.red('                      FAILED TESTS                             '));
    console.log(chalk.bold.red('═══════════════════════════════════════════════════════════════'));
    
    for (const test of failed) {
      console.log('');
      console.log(chalk.red(`  ❌ ${test.name}`));
      console.log(chalk.gray(`     ID: ${test.id}`));
      console.log(chalk.gray(`     Severity: ${test.severity}`));
      if (test.expected) console.log(chalk.gray(`     Expected: ${test.expected}`));
      if (test.actual !== undefined) console.log(chalk.gray(`     Actual: ${test.actual}`));
      if (test.note) console.log(chalk.yellow(`     Note: ${test.note}`));
      if (test.error) console.log(chalk.red(`     Error: ${test.error}`));
    }
  }

  // Final verdict
  console.log('');
  console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
  
  if (stats.failed === 0) {
    console.log(chalk.bold.green('  ✅ ALL TESTS PASSED - Ready for deployment!'));
  } else {
    console.log(chalk.bold.red(`  ❌ ${stats.failed} TESTS FAILED - Fix issues before deployment!`));
  }
  
  console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
  console.log('');
}

// Run
runTests();
