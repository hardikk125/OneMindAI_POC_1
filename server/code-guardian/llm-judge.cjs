/**
 * LLM JUDGE
 * =========
 * Uses GPT-4 to analyze code changes semantically:
 * - Understand intent of changes
 * - Detect potential bugs
 * - Identify security issues
 * - Suggest improvements
 * - Rate risk level
 */

const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { costTracker } = require('./cost-tracker.cjs');

// Load env from project root
const envPath = path.resolve(__dirname, '../../.env');
console.log('[LLMJudge] Loading env from:', envPath);
console.log('[LLMJudge] Env file exists:', fs.existsSync(envPath));
require('dotenv').config({ path: envPath });

// =============================================================================
// CONFIGURATION
// =============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Log which keys are available
console.log('[LLMJudge] API Keys configured:', {
  openai: !!OPENAI_API_KEY,
  anthropic: !!ANTHROPIC_API_KEY,
  perplexity: !!PERPLEXITY_API_KEY,
});

// Choose which LLM to use (in order of preference - GPT-4 first)
const LLM_PROVIDER = OPENAI_API_KEY ? 'openai' : 
                     ANTHROPIC_API_KEY ? 'anthropic' : 
                     PERPLEXITY_API_KEY ? 'perplexity' : null;

console.log('[LLMJudge] Using provider:', LLM_PROVIDER || 'none (basic analysis)');

// =============================================================================
// PROMPTS
// =============================================================================

const SYSTEM_PROMPT = `You are a senior code reviewer and software architect. Your job is to analyze code changes and assess their impact on the codebase.

You will receive:
1. The changed file path
2. The new file content
3. List of dependencies (what this file imports)
4. List of affected components (what depends on this file)

Your task is to:
1. Understand what the change does
2. Identify potential bugs or issues
3. Check for security vulnerabilities
4. Assess the risk of breaking other parts of the codebase
5. Provide a risk score from 1-10

Respond in JSON format:
{
  "summary": "Brief description of what changed",
  "intent": "What the developer was trying to accomplish",
  "potentialIssues": [
    {
      "type": "bug|security|performance|style",
      "severity": "high|medium|low",
      "description": "Description of the issue",
      "line": "Line number if applicable",
      "suggestion": "How to fix it"
    }
  ],
  "breakingChanges": [
    {
      "type": "removed_export|changed_signature|removed_function",
      "name": "Name of the affected item",
      "impact": "What might break"
    }
  ],
  "affectedAreas": ["List of components/features that might be affected"],
  "recommendations": ["List of recommendations"],
  "riskScore": 1-10,
  "riskReason": "Why this risk score",
  "testsNeeded": ["List of tests that should be run"]
}`;

// =============================================================================
// LLM ANALYSIS
// =============================================================================

async function analyze({ file, content, oldContent, dependencies, affected }) {
  if (!LLM_PROVIDER) {
    console.log('[LLMJudge] No LLM API key configured, using basic analysis');
    return basicAnalysis({ file, content, oldContent, dependencies, affected });
  }
  
  const userPrompt = buildUserPrompt({ file, content, dependencies, affected });
  
  try {
    let response;
    let model = 'unknown';
    
    switch (LLM_PROVIDER) {
      case 'openai':
        model = 'gpt-4o';
        response = await callOpenAI(userPrompt);
        break;
      case 'anthropic':
        model = 'claude-3-sonnet';
        response = await callAnthropic(userPrompt);
        break;
      case 'perplexity':
        model = 'pplx-70b-online';
        response = await callPerplexity(userPrompt);
        break;
      default:
        return basicAnalysis({ file, content, dependencies, affected });
    }
    
    const analysis = parseResponse(response);
    
    // Track cost if we have token usage
    if (response.usage) {
      const inputTokens = response.usage.prompt_tokens || 0;
      const outputTokens = response.usage.completion_tokens || 0;
      costTracker.logAnalysis(file, LLM_PROVIDER, model, inputTokens, outputTokens, analysis.riskScore);
      analysis.cost = costTracker.getSummary().totalCost;
    }
    
    return analysis;
    
  } catch (error) {
    console.error('[LLMJudge] LLM analysis failed:', error.message);
    return basicAnalysis({ file, content, dependencies, affected });
  }
}

function buildUserPrompt({ file, content, dependencies, affected }) {
  // Truncate content if too long
  const maxContentLength = 8000;
  const truncatedContent = content.length > maxContentLength 
    ? content.substring(0, maxContentLength) + '\n\n... [truncated]'
    : content;
  
  return `Analyze this code change:

FILE: ${file}

CONTENT:
\`\`\`
${truncatedContent}
\`\`\`

DEPENDENCIES (what this file imports):
${JSON.stringify(dependencies.imports || [], null, 2)}

AFFECTED COMPONENTS (what depends on this file):
- Direct dependents: ${affected.direct?.length || 0} files
- Components: ${affected.components?.map(c => c.name).join(', ') || 'none'}
- Hooks: ${affected.hooks?.map(h => h.name).join(', ') || 'none'}
- API calls: ${affected.apis?.map(a => a.url).join(', ') || 'none'}
- Database tables: ${affected.tables?.map(t => t.table).join(', ') || 'none'}

Please analyze this change and provide your assessment in JSON format.`;
}

// =============================================================================
// LLM PROVIDERS
// =============================================================================

async function callOpenAI(userPrompt) {
  console.log('[LLMJudge] Calling GPT-4...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o', // Use GPT-4o for best analysis
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[LLMJudge] OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log('[LLMJudge] GPT-4 response received, tokens used:', data.usage?.total_tokens);
  return data.choices[0].message.content;
}

async function callAnthropic(userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307', // Use Haiku for cost efficiency
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
}

async function callPerplexity(userPrompt) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

function parseResponse(response) {
  try {
    // Try to extract JSON from the response
    let json = response;
    
    // If response contains markdown code blocks, extract JSON
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      json = jsonMatch[1];
    }
    
    const parsed = JSON.parse(json);
    
    // Ensure required fields exist
    return {
      summary: parsed.summary || 'No summary provided',
      intent: parsed.intent || 'Unknown intent',
      potentialIssues: parsed.potentialIssues || [],
      breakingChanges: parsed.breakingChanges || [],
      affectedAreas: parsed.affectedAreas || [],
      recommendations: parsed.recommendations || [],
      riskScore: Math.min(Math.max(parsed.riskScore || 1, 1), 10),
      riskReason: parsed.riskReason || 'No reason provided',
      testsNeeded: parsed.testsNeeded || [],
      llmProvider: LLM_PROVIDER,
    };
    
  } catch (error) {
    console.error('[LLMJudge] Failed to parse LLM response:', error.message);
    return {
      summary: 'Failed to parse LLM response',
      intent: 'Unknown',
      potentialIssues: [],
      breakingChanges: [],
      affectedAreas: [],
      recommendations: [],
      riskScore: 5,
      riskReason: 'Could not analyze - defaulting to medium risk',
      testsNeeded: [],
      llmProvider: LLM_PROVIDER,
      parseError: error.message,
      rawResponse: response.substring(0, 500),
    };
  }
}

// =============================================================================
// BASIC ANALYSIS (No LLM)
// =============================================================================

function basicAnalysis({ file, content, oldContent, dependencies, affected }) {
  const issues = [];
  const recommendations = [];
  let riskScore = 1;
  
  // Detect what changed
  const wasEmpty = !oldContent || oldContent.trim() === '';
  const isNowEmpty = !content || content.trim() === '';
  const isNew = wasEmpty && !isNowEmpty;
  const isDeleted = !wasEmpty && isNowEmpty;
  
  let changeType = 'modified';
  let changeSummary = '';
  
  if (isNew) {
    changeType = 'created';
    changeSummary = `New file created with ${content.split('\n').length} lines`;
  } else if (isDeleted) {
    changeType = 'deleted';
    changeSummary = 'File content was cleared/deleted';
    riskScore += 3;
    issues.push({
      type: 'bug',
      severity: 'high',
      description: 'File content has been completely removed',
      suggestion: 'Verify this was intentional - this may break imports',
    });
  } else if (oldContent && content) {
    // Calculate diff
    const oldLines = oldContent.split('\n');
    const newLines = content.split('\n');
    const addedLines = newLines.filter(l => !oldLines.includes(l)).length;
    const removedLines = oldLines.filter(l => !newLines.includes(l)).length;
    changeSummary = `Modified: +${addedLines} lines, -${removedLines} lines`;
  } else {
    changeSummary = `File ${file} was modified`;
  }
  
  // Check for common issues
  
  // Console.log in production code
  if (content && content.includes('console.log') && !file.includes('test') && !file.includes('debug')) {
    issues.push({
      type: 'style',
      severity: 'low',
      description: 'Console.log statements found - consider removing for production',
      suggestion: 'Use a proper logging library or remove console.log statements',
    });
    riskScore += 1;
  }
  
  // TODO comments
  const todoCount = (content.match(/TODO|FIXME|HACK|XXX/gi) || []).length;
  if (todoCount > 0) {
    issues.push({
      type: 'style',
      severity: 'low',
      description: `${todoCount} TODO/FIXME comments found`,
      suggestion: 'Address TODO comments before merging',
    });
  }
  
  // Any type usage
  if (content.includes(': any') || content.includes('<any>')) {
    issues.push({
      type: 'style',
      severity: 'medium',
      description: 'TypeScript "any" type used - reduces type safety',
      suggestion: 'Replace "any" with proper types',
    });
    riskScore += 1;
  }
  
  // Hardcoded secrets
  if (content.match(/api[_-]?key|secret|password|token/i) && content.match(/['"][a-zA-Z0-9]{20,}['"]/)) {
    issues.push({
      type: 'security',
      severity: 'high',
      description: 'Possible hardcoded secret detected',
      suggestion: 'Move secrets to environment variables',
    });
    riskScore += 3;
  }
  
  // Large file
  const lineCount = content.split('\n').length;
  if (lineCount > 500) {
    issues.push({
      type: 'style',
      severity: 'medium',
      description: `Large file (${lineCount} lines) - consider splitting`,
      suggestion: 'Break down into smaller, focused modules',
    });
    riskScore += 1;
  }
  
  // Risk based on affected components
  if (affected.direct && affected.direct.length > 5) {
    riskScore += 2;
    recommendations.push(`This file has ${affected.direct.length} direct dependents - test thoroughly`);
  }
  
  if (affected.apis && affected.apis.length > 0) {
    riskScore += 1;
    recommendations.push('API endpoints may be affected - verify API contracts');
  }
  
  if (affected.tables && affected.tables.length > 0) {
    riskScore += 2;
    recommendations.push('Database tables accessed - verify schema compatibility');
  }
  
  // Cap risk score
  riskScore = Math.min(riskScore, 10);
  
  return {
    summary: changeSummary || `Basic analysis of ${file}`,
    intent: `${changeType} - Unable to determine detailed intent without LLM`,
    changeType,
    potentialIssues: issues,
    breakingChanges: [],
    affectedAreas: [
      ...affected.components?.map(c => c.name) || [],
      ...affected.hooks?.map(h => h.name) || [],
    ],
    recommendations,
    riskScore,
    riskReason: `Based on static analysis: ${issues.length} issues found, ${affected.direct?.length || 0} direct dependents`,
    testsNeeded: affected.components?.map(c => `Test ${c.name} component`) || [],
    llmProvider: 'none (basic analysis)',
  };
}

// =============================================================================
// QUICK ANALYZE (Lightweight LLM call for change extraction)
// =============================================================================

async function quickAnalyze(prompt) {
  if (!LLM_PROVIDER) {
    throw new Error('No LLM provider configured');
  }
  
  try {
    let response;
    
    switch (LLM_PROVIDER) {
      case 'openai':
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Use mini for quick, cheap extraction
            messages: [
              { role: 'system', content: 'You are a code change analyzer. Respond with valid JSON only.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.3
          })
        });
        break;
        
      case 'anthropic':
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307', // Use haiku for quick, cheap extraction
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        break;
        
      default:
        throw new Error('Unsupported provider');
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract content based on provider
    if (LLM_PROVIDER === 'openai') {
      return data.choices?.[0]?.message?.content || '';
    } else if (LLM_PROVIDER === 'anthropic') {
      return data.content?.[0]?.text || '';
    }
    
    return '';
  } catch (error) {
    console.error('[LLMJudge] Quick analyze failed:', error.message);
    throw error;
  }
}

function isConfigured() {
  return !!LLM_PROVIDER;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  analyze,
  quickAnalyze,
  basicAnalysis,
  isConfigured,
  SYSTEM_PROMPT,
  LLM_PROVIDER,
};
