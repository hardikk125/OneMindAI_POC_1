/**
 * Balance API Server
 * 
 * Simple Express server to read/write the CSV balance database
 * This ensures data persists on disk, not in browser localStorage
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to CSV database
const CSV_PATH = path.join(__dirname, '..', 'src', 'data', 'api-balances.csv');

// CSV Headers (added tokens_in, tokens_out for tracking)
const CSV_HEADERS = 'provider,engine,initial_balance,current_balance,total_spent,tokens_in,tokens_out,last_updated,currency,notes';

/**
 * Parse CSV content to array of objects
 */
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Handle quoted fields (for notes with commas)
    const parts = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    
    if (parts.length >= 7) {
      records.push({
        provider: parts[0],
        engine: parts[1],
        initial_balance: parseFloat(parts[2]) || 0,
        current_balance: parseFloat(parts[3]) || 0,
        total_spent: parseFloat(parts[4]) || 0,
        tokens_in: parseInt(parts[5]) || 0,
        tokens_out: parseInt(parts[6]) || 0,
        last_updated: parts[7] || new Date().toISOString(),
        currency: parts[8] || 'USD',
        notes: parts[9] || ''
      });
    }
  }
  
  return records;
}

/**
 * Convert records array to CSV string
 */
function toCSV(records) {
  const lines = [CSV_HEADERS];
  
  for (const r of records) {
    const notes = (r.notes || '').includes(',') ? `"${r.notes}"` : (r.notes || '');
    lines.push(`${r.provider},${r.engine},${r.initial_balance.toFixed(2)},${r.current_balance.toFixed(2)},${r.total_spent.toFixed(4)},${r.tokens_in || 0},${r.tokens_out || 0},${r.last_updated},${r.currency},${notes}`);
  }
  
  return lines.join('\n');
}

/**
 * Ensure CSV file exists with default data
 */
function ensureCSVExists() {
  if (!fs.existsSync(CSV_PATH)) {
    const defaultData = `${CSV_HEADERS}
openai,gpt-4.1,0.00,0.00,0.0000,${new Date().toISOString()},USD,Enter your balance
anthropic,claude-3.5-sonnet,0.00,0.00,0.0000,${new Date().toISOString()},USD,Enter your balance
gemini,gemini-2.0-flash-exp,0.00,0.00,0.0000,${new Date().toISOString()},USD,Free tier
deepseek,deepseek-chat,0.00,0.00,0.0000,${new Date().toISOString()},USD,Enter your balance
mistral,mistral-large-latest,0.00,0.00,0.0000,${new Date().toISOString()},USD,Enter your balance
groq,llama-3.3-70b-versatile,0.00,0.00,0.0000,${new Date().toISOString()},USD,Free tier
perplexity,sonar-pro,0.00,0.00,0.0000,${new Date().toISOString()},USD,Enter your balance
kimi,moonshot-v1-128k,0.00,0.00,0.0000,${new Date().toISOString()},USD,Enter your balance
xai,grok-beta,0.00,0.00,0.0000,${new Date().toISOString()},USD,Enter your balance`;
    
    fs.writeFileSync(CSV_PATH, defaultData, 'utf8');
    console.log('Created default CSV database at:', CSV_PATH);
  }
}

// ===== API Routes =====

/**
 * GET /api/balances - Get all balances
 */
app.get('/api/balances', (req, res) => {
  try {
    ensureCSVExists();
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const records = parseCSV(content);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error reading balances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/balances/:provider - Update a specific provider's balance
 */
app.put('/api/balances/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const { current_balance, engine, notes } = req.body;
    
    ensureCSVExists();
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    let records = parseCSV(content);
    
    const index = records.findIndex(r => 
      r.provider === provider && 
      (engine ? r.engine === engine : true)
    );
    
    if (index >= 0) {
      const old = records[index];
      records[index] = {
        ...old,
        current_balance: parseFloat(current_balance) || old.current_balance,
        initial_balance: old.initial_balance === 0 ? parseFloat(current_balance) || 0 : old.initial_balance,
        total_spent: old.initial_balance > 0 ? old.initial_balance - (parseFloat(current_balance) || 0) : old.total_spent,
        last_updated: new Date().toISOString(),
        notes: notes !== undefined ? notes : old.notes
      };
    } else {
      // Add new provider
      records.push({
        provider,
        engine: engine || 'default',
        initial_balance: parseFloat(current_balance) || 0,
        current_balance: parseFloat(current_balance) || 0,
        total_spent: 0,
        last_updated: new Date().toISOString(),
        currency: 'USD',
        notes: notes || 'Added manually'
      });
    }
    
    fs.writeFileSync(CSV_PATH, toCSV(records), 'utf8');
    res.json({ success: true, data: records[index >= 0 ? index : records.length - 1] });
  } catch (error) {
    console.error('Error updating balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/balances/deduct - Deduct cost from a provider's balance
 * Also tracks tokens_in and tokens_out
 */
app.post('/api/balances/deduct', (req, res) => {
  try {
    const { provider, engine, cost, tokens_in, tokens_out } = req.body;
    
    console.log(`[DEDUCT] Provider: ${provider}, Cost: $${cost}, Tokens In: ${tokens_in}, Tokens Out: ${tokens_out}`);
    
    ensureCSVExists();
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    let records = parseCSV(content);
    
    const index = records.findIndex(r => 
      r.provider === provider && 
      (engine ? r.engine === engine : true)
    );
    
    if (index >= 0) {
      // Deduct from current balance
      records[index].current_balance = Math.max(0, records[index].current_balance - cost);
      // Add to total spent
      records[index].total_spent += cost;
      // Track tokens
      records[index].tokens_in = (records[index].tokens_in || 0) + (tokens_in || 0);
      records[index].tokens_out = (records[index].tokens_out || 0) + (tokens_out || 0);
      records[index].last_updated = new Date().toISOString();
      
      console.log(`[DEDUCT] New balance for ${provider}: $${records[index].current_balance.toFixed(4)}`);
      
      fs.writeFileSync(CSV_PATH, toCSV(records), 'utf8');
      res.json({ success: true, data: records[index] });
    } else {
      // Create new record if provider doesn't exist
      const newRecord = {
        provider,
        engine: engine || 'default',
        initial_balance: 0,
        current_balance: 0,
        total_spent: cost,
        tokens_in: tokens_in || 0,
        tokens_out: tokens_out || 0,
        last_updated: new Date().toISOString(),
        currency: 'USD',
        notes: 'Auto-created from usage'
      };
      records.push(newRecord);
      fs.writeFileSync(CSV_PATH, toCSV(records), 'utf8');
      res.json({ success: true, data: newRecord });
    }
  } catch (error) {
    console.error('Error deducting balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/balances/reset/:provider - Reset a provider's balance to initial
 */
app.post('/api/balances/reset/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const { engine } = req.body;
    
    ensureCSVExists();
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    let records = parseCSV(content);
    
    const index = records.findIndex(r => 
      r.provider === provider && 
      (engine ? r.engine === engine : true)
    );
    
    if (index >= 0) {
      records[index].current_balance = records[index].initial_balance;
      records[index].total_spent = 0;
      records[index].last_updated = new Date().toISOString();
      
      fs.writeFileSync(CSV_PATH, toCSV(records), 'utf8');
      res.json({ success: true, data: records[index] });
    } else {
      res.status(404).json({ success: false, error: 'Provider not found' });
    }
  } catch (error) {
    console.error('Error resetting balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/balances/export - Export as CSV download
 */
app.get('/api/balances/export', (req, res) => {
  try {
    ensureCSVExists();
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=api-balances-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(content);
  } catch (error) {
    console.error('Error exporting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/balances/import - Import CSV data
 */
app.post('/api/balances/import', (req, res) => {
  try {
    const { csvContent } = req.body;
    const records = parseCSV(csvContent);
    
    if (records.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid CSV format' });
    }
    
    fs.writeFileSync(CSV_PATH, toCSV(records), 'utf8');
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error importing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================================================
// PROCESS ERROR HANDLERS - PREVENT CRASHES
// =============================================================================

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n⚠️  UNCAUGHT EXCEPTION - Balance API continuing...');
  console.error('[UNCAUGHT EXCEPTION]', error.message);
  console.error('Stack:', error.stack);
  // Don't exit - keep server running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n⚠️  UNHANDLED REJECTION - Balance API continuing...');
  console.error('[UNHANDLED REJECTION]', reason);
  // Don't exit - keep server running
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received - Balance API shutting down gracefully');
  process.exit(0);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received - Balance API shutting down gracefully');
  process.exit(0);
});

// =============================================================================
// START SERVER
// =============================================================================

const server = app.listen(PORT, () => {
  console.log(`\n🏦 Balance API Server running on http://localhost:${PORT}`);
  console.log(`📁 CSV Database: ${CSV_PATH}`);
  console.log(`🛡️  Crash Protection: ENABLED`);
  ensureCSVExists();
});

// Handle server errors
server.on('error', (error) => {
  console.error('\n❌ Balance API Server Error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free the port or use a different one.`);
    process.exit(1);
  }
});
