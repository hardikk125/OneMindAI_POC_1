/**
 * CODE GUARDIAN SERVER
 * ===================
 * LLM-as-Judge system for code change impact analysis
 * 
 * Features:
 * - Dependency mapping (AST-based)
 * - Change detection (file watcher + git diff)
 * - LLM analysis (GPT-4/Claude)
 * - Risk scoring
 * - WebSocket notifications
 * - Supabase logging
 * 
 * Port: 4000
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

// Import modules
const DependencyMapper = require('./dependency-mapper.cjs');
const ChangeAnalyzer = require('./change-analyzer.cjs');
const LLMJudge = require('./llm-judge.cjs');
const SupabaseLogger = require('./supabase-logger.cjs');
const { costTracker } = require('./cost-tracker.cjs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.CODE_GUARDIAN_PORT || 4000;
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Middleware
app.use(cors());
app.use(express.json());

// =============================================================================
// STATE
// =============================================================================

let dependencyGraph = {};
let changeHistory = [];
let fileContentCache = {}; // Cache of file contents for diff comparison
let isAnalyzing = false;
let connectedClients = new Set();

// =============================================================================
// WEBSOCKET HANDLING
// =============================================================================

wss.on('connection', (ws) => {
  console.log('[CodeGuardian] Client connected');
  connectedClients.add(ws);
  
  // Send current state
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      dependencyCount: Object.keys(dependencyGraph).length,
      changeHistoryCount: changeHistory.length,
      isAnalyzing
    }
  }));
  
  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log('[CodeGuardian] Client disconnected');
  });
});

function broadcast(message) {
  const data = JSON.stringify(message);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// =============================================================================
// FILE WATCHER
// =============================================================================

const watcher = chokidar.watch([
  path.join(PROJECT_ROOT, 'src/**/*.{ts,tsx,js,jsx}'),
  path.join(PROJECT_ROOT, 'server/**/*.{js,cjs}'),
  path.join(PROJECT_ROOT, 'docs/**/*.md'),
], {
  ignored: [
    /node_modules/,
    /dist/,
    /\.git/,
    /coverage/,
  ],
  persistent: true,
  ignoreInitial: true,
});

watcher.on('change', async (filePath) => {
  console.log(`[CodeGuardian] File changed: ${filePath}`);
  
  if (isAnalyzing) {
    console.log('[CodeGuardian] Already analyzing, queuing...');
    return;
  }
  
  try {
    isAnalyzing = true;
    broadcast({ type: 'analyzing', data: { file: filePath } });
    
    // Analyze the change
    const result = await analyzeChange(filePath);
    
    // Store in history
    changeHistory.unshift(result);
    if (changeHistory.length > 100) changeHistory.pop();
    
    // Broadcast result
    broadcast({ type: 'analysis_complete', data: result });
    
    // Log to Supabase
    await SupabaseLogger.logChange(result);
    
  } catch (error) {
    console.error('[CodeGuardian] Analysis error:', error);
    broadcast({ type: 'error', data: { message: error.message } });
  } finally {
    isAnalyzing = false;
  }
});

// =============================================================================
// ANALYSIS PIPELINE
// =============================================================================

async function analyzeChange(filePath) {
  const startTime = Date.now();
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  
  console.log(`[CodeGuardian] Analyzing: ${relativePath}`);
  
  // Step 1: Get file content and old content for diff
  let content = '';
  let oldContent = fileContentCache[relativePath] || null;
  
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.log(`[CodeGuardian] File may have been deleted: ${relativePath}`);
    content = '';
  }
  
  // If no cached content, this is the first time seeing this file
  if (oldContent === null) {
    console.log(`[CodeGuardian] First time seeing file, caching: ${relativePath}`);
    oldContent = content; // Treat as no change for first observation
  }
  
  // Calculate simple diff stats
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = content ? content.split('\n') : [];
  const addedLines = newLines.filter(l => l.trim() && !oldLines.includes(l));
  const removedLines = oldLines.filter(l => l.trim() && !newLines.includes(l));
  
  console.log(`[CodeGuardian] Diff: +${addedLines.length} lines, -${removedLines.length} lines`);
  
  // Step 2: Update dependency graph for this file
  const fileDeps = DependencyMapper.parseFile(filePath, content);
  dependencyGraph[relativePath] = fileDeps;
  
  // Step 3: Find affected components
  const affected = ChangeAnalyzer.findAffectedComponents(relativePath, dependencyGraph);
  
  // Step 4: Get LLM analysis (with old content for comparison)
  const llmAnalysis = await LLMJudge.analyze({
    file: relativePath,
    content: content,
    oldContent: oldContent,
    dependencies: fileDeps,
    affected: affected,
  });
  
  // Update cache with new content
  fileContentCache[relativePath] = content;
  
  const duration = Date.now() - startTime;
  
  return {
    id: `change_${Date.now()}`,
    timestamp: new Date().toISOString(),
    file: relativePath,
    duration,
    dependencies: fileDeps,
    affected: affected,
    analysis: llmAnalysis,
    riskScore: llmAnalysis.riskScore || 0,
    diff: {
      addedLines: addedLines.length,
      removedLines: removedLines.length,
      addedSample: addedLines.slice(0, 5),
      removedSample: removedLines.slice(0, 5),
    }
  };
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'code-guardian',
    uptime: process.uptime(),
    dependencyCount: Object.keys(dependencyGraph).length,
  });
});

// Get dependency graph
app.get('/api/dependencies', (req, res) => {
  res.json(dependencyGraph);
});

// Get dependencies for a specific file
app.get('/api/dependencies/:file(*)', (req, res) => {
  const file = req.params.file;
  const deps = dependencyGraph[file];
  
  if (!deps) {
    return res.status(404).json({ error: 'File not found in dependency graph' });
  }
  
  res.json(deps);
});

// Get affected components for a file
app.get('/api/affected/:file(*)', (req, res) => {
  const file = req.params.file;
  const affected = ChangeAnalyzer.findAffectedComponents(file, dependencyGraph);
  res.json(affected);
});

// Manually trigger analysis
app.post('/api/analyze', async (req, res) => {
  const { file } = req.body;
  
  if (!file) {
    return res.status(400).json({ error: 'File path required' });
  }
  
  const fullPath = path.join(PROJECT_ROOT, file);
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    const result = await analyzeChange(fullPath);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Build full dependency graph
app.post('/api/build-graph', async (req, res) => {
  try {
    broadcast({ type: 'building_graph', data: {} });
    
    const startTime = Date.now();
    dependencyGraph = await DependencyMapper.buildFullGraph(PROJECT_ROOT);
    const duration = Date.now() - startTime;
    
    broadcast({ 
      type: 'graph_built', 
      data: { 
        fileCount: Object.keys(dependencyGraph).length,
        duration 
      } 
    });
    
    res.json({ 
      success: true, 
      fileCount: Object.keys(dependencyGraph).length,
      duration 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get change history
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(changeHistory.slice(0, limit));
});

// Get risk summary
app.get('/api/risk-summary', (req, res) => {
  const highRisk = changeHistory.filter(c => c.riskScore >= 7).length;
  const mediumRisk = changeHistory.filter(c => c.riskScore >= 4 && c.riskScore < 7).length;
  const lowRisk = changeHistory.filter(c => c.riskScore < 4).length;
  
  res.json({
    total: changeHistory.length,
    highRisk,
    mediumRisk,
    lowRisk,
    recentHighRisk: changeHistory.filter(c => c.riskScore >= 7).slice(0, 5),
  });
});

// Validate API endpoints
app.post('/api/validate-endpoints', async (req, res) => {
  try {
    const results = await ChangeAnalyzer.validateApiEndpoints(PROJECT_ROOT);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cost summary
app.get('/api/costs', (req, res) => {
  const summary = costTracker.getSummary();
  res.json(summary);
});

// Get cost estimate
app.get('/api/costs/estimate', (req, res) => {
  const { provider = 'openai', model = 'gpt-4o', count = 100 } = req.query;
  const estimate = costTracker.estimateCost(provider, model, parseInt(count));
  res.json(estimate);
});

// Reset costs (admin only)
app.post('/api/costs/reset', (req, res) => {
  costTracker.reset();
  res.json({ message: 'Cost tracker reset', summary: costTracker.getSummary() });
});

// Get file content (for wireframe viewer)
app.get('/api/file-content', (req, res) => {
  const { path: filePath } = req.query;
  
  if (!filePath) {
    return res.status(400).json({ error: 'File path required' });
  }
  
  // Security: ensure path is within project
  const normalizedPath = path.normalize(filePath);
  const fullPath = normalizedPath.startsWith(PROJECT_ROOT) 
    ? normalizedPath 
    : path.join(PROJECT_ROOT, normalizedPath);
  
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    return res.status(403).json({ error: 'Access denied: path outside project' });
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ 
      path: filePath, 
      content,
      size: content.length,
      lines: content.split('\n').length
    });
  } catch (error) {
    res.status(404).json({ error: 'File not found', path: filePath });
  }
});

// =============================================================================
// LLM CHANGE ANALYSIS ENDPOINT
// =============================================================================

// Analyze a code change using LLM (optional feature)
app.post('/api/analyze-change', async (req, res) => {
  const { changeType, layer, elementLabel, file, diff, sourceSnippet } = req.body;
  
  if (!changeType || !layer || !file) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Use the LLM Judge to analyze the change
    const prompt = `Analyze this code change and provide insights:

Change Type: ${changeType}
Layer: ${layer}
Element: ${elementLabel}
File: ${file}
Diff: ${JSON.stringify(diff, null, 2)}
Source Snippet: ${sourceSnippet?.slice(0, 1000) || 'N/A'}

Provide a JSON response with:
1. necessity: "required" | "optional" | "refactor" - Is this change necessary?
2. riskAssessment: Brief risk assessment (1-2 sentences)
3. suggestedTests: Array of test suggestions
4. breakingChanges: boolean - Could this break existing functionality?`;

    const analysis = await llmJudge.analyze(prompt, 'change-analysis');
    
    // Parse LLM response
    let result;
    try {
      // Try to extract JSON from response
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        necessity: 'optional',
        riskAssessment: analysis.slice(0, 200),
        suggestedTests: [],
        breakingChanges: false
      };
    } catch {
      result = {
        necessity: 'optional',
        riskAssessment: analysis.slice(0, 200),
        suggestedTests: [],
        breakingChanges: false
      };
    }
    
    res.json(result);
  } catch (error) {
    console.error('[CodeGuardian] LLM analysis failed:', error);
    // Return a default analysis on error
    res.json({
      necessity: 'optional',
      riskAssessment: `Change to ${layer} layer in ${file}. Manual review recommended.`,
      suggestedTests: [`Test ${elementLabel} functionality`, `Verify ${layer} integration`],
      breakingChanges: changeType.includes('removed')
    });
  }
});

// =============================================================================
// LLM CODE EXTRACTION ENDPOINT (Comprehensive Multi-Layer)
// =============================================================================

// Helper: Extract changes using regex (always works, no API needed)
function regexExtraction(content) {
  if (!content) return { constants: [], functions: [], objectKeys: [], imports: 0, exports: 0, lines: 0 };
  
  const constants = (content.match(/(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*[:=]/g) || [])
    .map(m => m.match(/(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)/)?.[1])
    .filter(Boolean);
  
  const functions = (content.match(/(?:function|const)\s+([a-z][a-zA-Z0-9]*)\s*[=(]/g) || [])
    .map(m => m.match(/(?:function|const)\s+([a-z][a-zA-Z0-9]*)/)?.[1])
    .filter(Boolean);
  
  const objectKeys = (content.match(/([a-z][a-zA-Z0-9]*)\s*:\s*\{/g) || [])
    .map(m => m.match(/([a-z][a-zA-Z0-9]*)\s*:/)?.[1])
    .filter(Boolean);
  
  return {
    constants: [...new Set(constants)],
    functions: [...new Set(functions)],
    objectKeys: [...new Set(objectKeys)],
    imports: (content.match(/^import\s+/gm) || []).length,
    exports: (content.match(/^export\s+/gm) || []).length,
    lines: content.split('\n').length
  };
}

// Helper: Extract changes from git diff
function diffExtraction(diff) {
  if (!diff) return null;
  
  const added = (diff.match(/^\+(?!\+\+)/gm) || []).length;
  const removed = (diff.match(/^-(?!--)/gm) || []).length;
  
  const addedItems = (diff.match(/^\+.*(?:function|const|let|var)\s+(\w+)/gm) || [])
    .map(m => m.match(/(?:function|const|let|var)\s+(\w+)/)?.[1])
    .filter(Boolean);
  
  const removedItems = (diff.match(/^-.*(?:function|const|let|var)\s+(\w+)/gm) || [])
    .map(m => m.match(/(?:function|const|let|var)\s+(\w+)/)?.[1])
    .filter(Boolean);
  
  return {
    added,
    removed,
    addedItems: [...new Set(addedItems)],
    removedItems: [...new Set(removedItems)]
  };
}

// Helper: Generate WHY explanation based on file type and changes
function generateWhyExplanation(file, regexData, diffData) {
  const fileName = file.split('/').pop() || file;
  const reasons = [];
  
  // Detect file type and explain impact
  if (file.includes('OneMindAI.tsx') || file.includes('OneMindAI.ts')) {
    reasons.push('Main application component - changes affect entire app behavior');
    if (regexData.constants.some(c => c.includes('PRICING') || c.includes('MODEL'))) {
      reasons.push('Model/pricing configuration changed - affects cost calculations and model selection');
    }
    if (regexData.constants.some(c => c.includes('ENGINE') || c.includes('PROVIDER'))) {
      reasons.push('Engine/provider settings modified - affects which AI services are available');
    }
  }
  
  if (file.includes('credit-service') || file.includes('credit')) {
    reasons.push('Credit system modified - affects user billing and usage tracking');
    if (regexData.constants.some(c => c.includes('PRICING'))) {
      reasons.push('Pricing constants changed - directly impacts credit deduction calculations');
    }
  }
  
  if (file.includes('ai-proxy') || file.includes('proxy')) {
    reasons.push('API proxy modified - affects all AI provider communications');
    if (diffData?.addedItems?.length > 0) {
      reasons.push(`New endpoints/functions added: ${diffData.addedItems.join(', ')}`);
    }
  }
  
  if (file.includes('supabase') || file.includes('database')) {
    reasons.push('Database layer modified - affects data persistence and queries');
  }
  
  // Generic reasons based on what changed
  if (diffData?.removed > 0) {
    reasons.push(`${diffData.removed} lines removed - potential breaking changes`);
  }
  
  if (regexData.exports > 0) {
    reasons.push(`File has ${regexData.exports} exports - other files may depend on this`);
  }
  
  if (regexData.constants.length > 0) {
    reasons.push(`Modified constants: ${regexData.constants.slice(0, 3).join(', ')}${regexData.constants.length > 3 ? '...' : ''}`);
  }
  
  if (regexData.functions.length > 0) {
    reasons.push(`Contains functions: ${regexData.functions.slice(0, 3).join(', ')}${regexData.functions.length > 3 ? '...' : ''}`);
  }
  
  return reasons.length > 0 ? reasons : [`${fileName} was modified`];
}

// Helper: Determine affected areas
function getAffectedAreas(file, regexData) {
  const affected = [];
  
  if (file.includes('OneMindAI')) {
    affected.push({ area: 'UI', reason: 'Main component renders the chat interface' });
    affected.push({ area: 'Model Selection', reason: 'Contains model configuration' });
  }
  
  if (regexData.constants.some(c => c.includes('PRICING') || c.includes('CREDIT'))) {
    affected.push({ area: 'Billing', reason: 'Pricing constants affect credit calculations' });
  }
  
  if (file.includes('proxy') || file.includes('api')) {
    affected.push({ area: 'API Layer', reason: 'Proxy handles all AI provider requests' });
  }
  
  if (file.includes('supabase') || file.includes('credit')) {
    affected.push({ area: 'Database', reason: 'Affects data storage and retrieval' });
  }
  
  if (regexData.objectKeys.some(k => k.includes('openai') || k.includes('anthropic') || k.includes('gemini'))) {
    affected.push({ area: 'AI Providers', reason: 'Provider configuration changed' });
  }
  
  return affected;
}

// Main extraction endpoint
app.post('/api/extract-change-info', async (req, res) => {
  const { file, oldContent, newContent, diff } = req.body;
  
  if (!file) {
    return res.status(400).json({ error: 'File path required' });
  }
  
  const fileName = file.split('/').pop() || file;
  
  try {
    // Layer 1: Regex extraction (always works)
    const regexData = regexExtraction(newContent || '');
    
    // Layer 2: Diff extraction (if available)
    const diffData = diffExtraction(diff);
    
    // Layer 3: Generate WHY explanation
    const whyReasons = generateWhyExplanation(file, regexData, diffData);
    
    // Layer 4: Get affected areas
    const affectedAreas = getAffectedAreas(file, regexData);
    
    // Layer 5: Try LLM for intelligent summary (optional)
    let llmData = null;
    let llmUsed = false;
    
    if (LLMJudge.isConfigured()) {
      try {
        const prompt = `Analyze this code change briefly. File: ${file}
${diff ? `Diff (first 1000 chars):\n${diff.slice(0, 1000)}` : `Content (first 800 chars):\n${(newContent || '').slice(0, 800)}`}

Respond with ONLY valid JSON:
{
  "summary": "One sentence what changed",
  "whatChanged": ["specific item 1", "specific item 2"],
  "whyItMatters": "Why this change is important",
  "impact": "high|medium|low",
  "affectedFeatures": ["feature1", "feature2"]
}`;

        const result = await LLMJudge.quickAnalyze(prompt);
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          llmData = JSON.parse(jsonMatch[0]);
          llmUsed = true;
        }
      } catch (llmError) {
        console.log('[CodeGuardian] LLM skipped:', llmError.message);
      }
    }
    
    // Build comprehensive response
    const response = {
      file,
      fileName,
      
      // What changed
      summary: llmData?.summary || 
               `${fileName} modified: +${diffData?.added || 0} -${diffData?.removed || 0} lines`,
      
      whatChanged: [
        ...(llmData?.whatChanged || []),
        ...(diffData?.addedItems || []).map(i => `Added: ${i}`),
        ...(diffData?.removedItems || []).map(i => `Removed: ${i}`),
        ...(regexData.constants.slice(0, 3).map(c => `Constant: ${c}`)),
        ...(regexData.functions.slice(0, 3).map(f => `Function: ${f}`))
      ].slice(0, 8),
      
      // WHY it was affected
      whyAffected: llmData?.whyItMatters || whyReasons[0],
      whyReasons: whyReasons,
      
      // What areas are impacted
      affectedAreas: [
        ...(llmData?.affectedFeatures?.map(f => ({ area: f, reason: 'LLM detected' })) || []),
        ...affectedAreas
      ],
      
      // Impact level
      impact: llmData?.impact || 
              (diffData?.removed > 5 ? 'high' : 
               diffData?.added > 20 ? 'medium' : 
               regexData.constants.length > 0 ? 'medium' : 'low'),
      
      // Raw data for debugging
      details: {
        diff: diffData,
        regex: regexData,
        llmUsed
      },
      
      // Confidence
      confidence: {
        overall: llmUsed ? 'high' : (diffData ? 'medium' : 'low'),
        llm: llmUsed ? 'available' : 'unavailable',
        diff: diffData ? 'available' : 'unavailable',
        regex: 'available'
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('[CodeGuardian] Extraction failed:', error.message);
    res.json({
      file,
      fileName,
      summary: `${fileName} was modified`,
      whatChanged: [],
      whyAffected: 'Unable to determine - extraction failed',
      whyReasons: ['Error during analysis'],
      affectedAreas: [],
      impact: 'unknown',
      error: error.message
    });
  }
});

// Summarize multiple changes using LLM
app.post('/api/summarize-changes', async (req, res) => {
  const { changes } = req.body;
  
  if (!changes || !Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ error: 'Changes array required' });
  }
  
  try {
    // Build a detailed prompt for the LLM
    const changeDescriptions = changes.map((c, i) => {
      let desc = `${i + 1}. [${c.layer?.toUpperCase() || 'UNKNOWN'}] ${c.changeType?.replace(/_/g, ' ')} in ${c.file}\n`;
      if (c.summary) desc += `   Summary: ${c.summary}\n`;
      if (c.reason) desc += `   Reason: ${c.reason}\n`;
      if (c.impact) desc += `   Impact: ${c.impact}\n`;
      if (c.codeChanges) {
        if (c.codeChanges.apiEndpoints?.length) desc += `   API Endpoints: ${c.codeChanges.apiEndpoints.join(', ')}\n`;
        if (c.codeChanges.supabaseTables?.length) desc += `   Supabase Tables: ${c.codeChanges.supabaseTables.join(', ')}\n`;
        if (c.codeChanges.hooksAffected?.length) desc += `   Hooks: ${c.codeChanges.hooksAffected.join(', ')}\n`;
        if (c.codeChanges.stateVariables?.length) desc += `   State: ${c.codeChanges.stateVariables.join(', ')}\n`;
      }
      return desc;
    }).join('\n');
    
    const prompt = `Analyze these ${changes.length} code changes and provide a concise summary:

${changeDescriptions}

Provide a summary that includes:
1. Overall assessment of the changes
2. Key areas affected (UI, API, Database, State)
3. Potential risks or breaking changes
4. Recommended testing focus areas
5. Any patterns or concerns noticed

Keep the summary concise but informative (max 200 words).`;

    // For now, generate a structured summary without LLM
    // TODO: Integrate with actual LLM service when available
    const layerCounts = {};
    const impactCounts = { high: 0, medium: 0, low: 0 };
    const uniqueChanges = [];
    
    changes.forEach(c => {
      layerCounts[c.layer] = (layerCounts[c.layer] || 0) + 1;
      if (c.impact) impactCounts[c.impact]++;
      if (c.summary && !uniqueChanges.includes(c.summary)) {
        uniqueChanges.push(c.summary);
      }
    });
    
    const layerSummary = Object.entries(layerCounts)
      .map(([layer, count]) => `${count} ${layer}`)
      .join(', ');
    
    let summary = `📊 **Summary of ${changes.length} Recent Changes**\n\n`;
    summary += `**Layers affected:** ${layerSummary}\n\n`;
    summary += `**Impact breakdown:** ${impactCounts.high} high, ${impactCounts.medium} medium, ${impactCounts.low} low\n\n`;
    
    if (uniqueChanges.length > 0) {
      summary += `**Key changes:**\n`;
      uniqueChanges.slice(0, 5).forEach(change => {
        summary += `• ${change}\n`;
      });
    }
    
    if (impactCounts.high > 0) {
      summary += `\n⚠️ **Warning:** ${impactCounts.high} high-impact changes detected. Review carefully before deployment.`;
    }
    
    res.json({ 
      summary,
      changeCount: changes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[CodeGuardian] Summary generation failed:', error);
    
    // Generate a basic summary without LLM
    const layerCounts = {};
    const impactCounts = { high: 0, medium: 0, low: 0 };
    
    changes.forEach(c => {
      layerCounts[c.layer] = (layerCounts[c.layer] || 0) + 1;
      if (c.impact) impactCounts[c.impact]++;
    });
    
    const layerSummary = Object.entries(layerCounts)
      .map(([layer, count]) => `${count} ${layer}`)
      .join(', ');
    
    let summary = `📊 Summary of ${changes.length} Recent Changes\n\n`;
    summary += `Layers affected: ${layerSummary}\n\n`;
    summary += `Impact: ${impactCounts.high} high, ${impactCounts.medium} medium, ${impactCounts.low} low\n\n`;
    
    if (impactCounts.high > 0) {
      summary += `⚠️ Warning: ${impactCounts.high} high-impact changes detected. Review carefully.`;
    }
    
    res.json({ 
      summary,
      changeCount: changes.length,
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
});

// =============================================================================
// PAGE ANALYSIS ENDPOINTS (Live Change Watcher)
// =============================================================================

// Get all page analysis documents
app.get('/api/page-analysis', (req, res) => {
  const docsPath = path.join(PROJECT_ROOT, 'docs');
  const analysisFiles = [];
  
  try {
    const files = fs.readdirSync(docsPath);
    
    for (const file of files) {
      if (file.startsWith('PAGE_ANALYSIS_') && file.endsWith('.md')) {
        const filePath = path.join(docsPath, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Parse step numbers from filename (e.g., PAGE_ANALYSIS_STEP_0_AND_2.md)
        const stepMatch = file.match(/STEP_(\d+)_AND_(\d+)/);
        const steps = stepMatch ? [parseInt(stepMatch[1]), parseInt(stepMatch[2])] : [];
        
        // Extract title from first heading
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : file;
        
        // Extract sections
        const sections = [];
        const sectionMatches = content.matchAll(/^##\s+(.+)$/gm);
        for (const match of sectionMatches) {
          sections.push(match[1]);
        }
        
        // Count functional buttons, hardcoded values, API calls
        const buttonCount = (content.match(/\| \*\*.*?\*\* \|.*?\| YES \|/g) || []).length;
        const hardcodedCount = (content.match(/HARDCODED/gi) || []).length;
        const apiCount = (content.match(/\/api\//g) || []).length;
        
        analysisFiles.push({
          id: file.replace('.md', ''),
          filename: file,
          filePath: filePath,
          title,
          steps,
          sections,
          stats: {
            functionalButtons: buttonCount,
            hardcodedValues: hardcodedCount,
            apiCalls: apiCount,
          },
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          content,
        });
      }
    }
    
    res.json({
      count: analysisFiles.length,
      files: analysisFiles,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific page analysis document
app.get('/api/page-analysis/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(PROJECT_ROOT, 'docs', `${id}.md`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    
    res.json({
      id,
      filePath,
      content,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
    });
  } catch (error) {
    res.status(404).json({ error: 'Analysis document not found', id });
  }
});

// Watch for changes to analysis docs and tracked source files
const analysisWatcher = chokidar.watch([
  path.join(PROJECT_ROOT, 'docs/PAGE_ANALYSIS_*.md'),
  path.join(PROJECT_ROOT, 'src/OneMindAI.tsx'),
  path.join(PROJECT_ROOT, 'src/components/CompanyBanner.tsx'),
  path.join(PROJECT_ROOT, 'src/components/FileUploadZone.tsx'),
  path.join(PROJECT_ROOT, 'src/hooks/useUIConfig.ts'),
], {
  persistent: true,
  ignoreInitial: true,
});

analysisWatcher.on('change', (filePath) => {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  console.log(`[CodeGuardian] Analysis-related file changed: ${relativePath}`);
  
  // Determine what type of change this is
  const isAnalysisDoc = filePath.includes('PAGE_ANALYSIS_');
  const isSourceFile = filePath.endsWith('.tsx') || filePath.endsWith('.ts');
  
  // Broadcast to connected clients
  broadcast({
    type: 'page_analysis_update',
    data: {
      file: relativePath,
      isAnalysisDoc,
      isSourceFile,
      timestamp: new Date().toISOString(),
      message: isAnalysisDoc 
        ? `Analysis document updated: ${path.basename(filePath)}`
        : `Source file changed: ${path.basename(filePath)} - Analysis may need update`,
    }
  });
});

// Get wireframe data (aggregated component/page info)
app.get('/api/wireframe', (req, res) => {
  // Build wireframe from dependency graph
  const components = [];
  const pages = [];
  
  for (const [filePath, deps] of Object.entries(dependencyGraph)) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) continue;
    
    const name = path.basename(filePath, path.extname(filePath));
    const isPage = filePath.includes('/pages/') || filePath.includes('Page.tsx');
    
    const component = {
      id: filePath.replace(/[^a-zA-Z0-9]/g, '_') + '_' + name,
      name,
      filePath,
      type: isPage ? 'page' : 'component',
      elements: deps.components || [],
      state: [],
      hooks: deps.hooks || [],
      imports: deps.imports || [],
      childComponents: deps.components || [],
      lastModified: new Date().toISOString(),
    };
    
    components.push(component);
    
    if (isPage) {
      pages.push({
        id: component.id,
        name,
        route: '/' + name.toLowerCase().replace(/page$/i, ''),
        filePath,
        components: deps.components?.map((c, i) => ({ componentId: c, name: c, position: { order: i } })) || [],
        links: [],
        lastModified: component.lastModified,
      });
    }
  }
  
  res.json({
    projectName: 'OneMind AI',
    projectPath: PROJECT_ROOT,
    lastUpdated: new Date().toISOString(),
    pages,
    components,
    componentIndex: Object.fromEntries(components.map(c => [c.id, c])),
    pageIndex: Object.fromEntries(pages.map(p => [p.id, p])),
    stats: {
      totalPages: pages.length,
      totalComponents: components.length,
      totalElements: components.reduce((sum, c) => sum + (c.elements?.length || 0), 0),
      totalClickHandlers: 0,
      totalApiCalls: 0,
      totalStateVariables: 0,
    }
  });
});

// =============================================================================
// STARTUP
// =============================================================================

async function initialize() {
  console.log('[CodeGuardian] Initializing...');
  
  // Build initial dependency graph
  try {
    console.log('[CodeGuardian] Building dependency graph...');
    dependencyGraph = await DependencyMapper.buildFullGraph(PROJECT_ROOT);
    console.log(`[CodeGuardian] Mapped ${Object.keys(dependencyGraph).length} files`);
    
    // Cache initial file contents for diff comparison
    console.log('[CodeGuardian] Caching file contents for diff tracking...');
    for (const relativePath of Object.keys(dependencyGraph)) {
      const fullPath = path.join(PROJECT_ROOT, relativePath);
      try {
        fileContentCache[relativePath] = fs.readFileSync(fullPath, 'utf-8');
      } catch (err) {
        // File might not exist or be readable
      }
    }
    console.log(`[CodeGuardian] Cached ${Object.keys(fileContentCache).length} files`);
    
  } catch (error) {
    console.error('[CodeGuardian] Failed to build dependency graph:', error);
  }
}

server.listen(PORT, async () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           🛡️  CODE GUARDIAN SERVER                        ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  HTTP API:    http://localhost:${PORT}                       ║`);
  console.log(`║  WebSocket:   ws://localhost:${PORT}                         ║`);
  console.log('║                                                           ║');
  console.log('║  Endpoints:                                               ║');
  console.log('║    GET  /health              - Health check               ║');
  console.log('║    GET  /api/dependencies    - Full dependency graph      ║');
  console.log('║    GET  /api/affected/:file  - Affected components        ║');
  console.log('║    POST /api/analyze         - Analyze a file             ║');
  console.log('║    POST /api/build-graph     - Rebuild dependency graph   ║');
  console.log('║    GET  /api/history         - Change history             ║');
  console.log('║    GET  /api/risk-summary    - Risk summary               ║');
  console.log('║    GET  /api/wireframe       - UI wireframe data          ║');
  console.log('║    GET  /api/file-content    - Get file content           ║');
  console.log('║    GET  /api/page-analysis   - Page analysis docs          ║');
  console.log('║    WS   page-analysis-update - Live doc updates            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  await initialize();
  
  console.log('[CodeGuardian] Watching for file changes...');
});

module.exports = { app, server };
